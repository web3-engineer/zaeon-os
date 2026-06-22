# PDF Context Caching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut token consumption in the single-PDF chat by caching the PDF once per session (Vertex `cachedContents`) and referencing it on each turn, instead of re-sending the whole PDF every message.

**Architecture:** A new `lib/ai/contextCache.ts` exposes pure helpers + two REST callers (create cache, generate-with-cache) over Vertex, authed like `lib/voice/gemini-tts.ts`. A new `POST /api/ai/pdf/cache` mints a cache from an uploaded PDF. `/api/ai/chat` gains an optional `cacheName` that, when present, generates against the cache instead of inlining the PDF. The research-lab client creates the cache on open and uses it per turn, falling back to inline on any failure/expiry.

**Tech Stack:** Next 14 route handlers (`runtime = "nodejs"`), `@google-cloud/vertexai` (existing), `google-auth-library` (existing), Vitest, TypeScript.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-22-pdf-context-caching-design.md`.
- Verify EVERY task: `npx vitest run` (baseline **269 passing**) AND `npx tsc --noEmit -p tsconfig.json` filtered to touched files.
- `app/research-lab/page.tsx` has **exactly one pre-existing** tsc error (`onWorkType` WorkType-vs-string) — tolerated; expect count to stay 1.
- Model pinned to `GEMINI_MODEL_FLASH` from `lib/ai/model.ts` for both cache create and generate (caches are model-bound).
- Vertex auth ONLY via `vertexCredentials()` (`lib/ai/vertex-credentials.ts`) + `GoogleAuth` bearer token. Never log or commit secrets.
- Comments in Portuguese (codebase idiom). Match surrounding style.
- Back-compat: when `cacheName` is absent, `/api/ai/chat` behaves byte-for-byte as today.
- Deploy is manual by the owner (Zed → push → VPS rebuild). Do not push or open PRs unless asked.

## File Structure

- Create `lib/ai/contextCache.ts` — cache helpers (pure) + REST callers (`createPdfCache`, `generateWithCache`, `CacheMissError`). One responsibility: Vertex context-cache access.
- Create `lib/ai/contextCache.test.ts` — unit tests for the pure helpers.
- Create `app/api/ai/pdf/cache/route.ts` — `POST` route that creates a cache from a base64 PDF.
- Modify `app/api/ai/chat/route.ts` — accept `cacheName`; branch to `generateWithCache`.
- Modify `app/research-lab/page.tsx` — `pdfCache` state; create cache in `handlePlaySavedDoc`; use it in `handlePdfQuestion` with expiry fallback.

---

### Task 1: Pure cache helpers

**Files:**
- Create: `lib/ai/contextCache.ts`
- Test: `lib/ai/contextCache.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `PDF_CACHE_TTL_SECONDS: number`, `PDF_CACHE_ENABLED: boolean`, `MIN_CACHE_BASE64: number`
  - `ttlString(seconds: number): string`
  - `isCacheableEstimate(base64Length: number): boolean`
  - `parseCacheName(resp: unknown): string | null`
  - `buildCacheRequest(opts: { project: string; location: string; model: string; pdfBase64: string; ttlSeconds: number }): Record<string, unknown>`

- [ ] **Step 1: Write the failing test**

Create `lib/ai/contextCache.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  ttlString,
  isCacheableEstimate,
  parseCacheName,
  buildCacheRequest,
  MIN_CACHE_BASE64,
} from "./contextCache";

describe("ttlString", () => {
  it("formats seconds as a Vertex ttl string", () => {
    expect(ttlString(2700)).toBe("2700s");
  });
  it("never goes below 1s", () => {
    expect(ttlString(0)).toBe("1s");
    expect(ttlString(0.4)).toBe("1s");
  });
});

describe("isCacheableEstimate", () => {
  it("is false for tiny PDFs (below the byte floor)", () => {
    expect(isCacheableEstimate(MIN_CACHE_BASE64 - 1)).toBe(false);
  });
  it("is true at/above the floor", () => {
    expect(isCacheableEstimate(MIN_CACHE_BASE64)).toBe(true);
    expect(isCacheableEstimate(MIN_CACHE_BASE64 * 3)).toBe(true);
  });
});

describe("parseCacheName", () => {
  it("extracts the cache resource name", () => {
    expect(parseCacheName({ name: "projects/p/locations/l/cachedContents/9" }))
      .toBe("projects/p/locations/l/cachedContents/9");
  });
  it("returns null when absent", () => {
    expect(parseCacheName({})).toBe(null);
    expect(parseCacheName(null)).toBe(null);
    expect(parseCacheName("x")).toBe(null);
  });
});

describe("buildCacheRequest", () => {
  it("builds the cachedContents body with the PDF inline and a ttl", () => {
    const body: any = buildCacheRequest({
      project: "proj", location: "us-central1", model: "gemini-2.5-flash",
      pdfBase64: "QUJD", ttlSeconds: 2700,
    });
    expect(body.model).toBe(
      "projects/proj/locations/us-central1/publishers/google/models/gemini-2.5-flash",
    );
    expect(body.contents[0].parts[0].inlineData.mimeType).toBe("application/pdf");
    expect(body.contents[0].parts[0].inlineData.data).toBe("QUJD");
    expect(body.ttl).toBe("2700s");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/ai/contextCache.test.ts`
Expected: FAIL — "Failed to load url ./contextCache" (module missing).

- [ ] **Step 3: Write the pure helpers**

Create `lib/ai/contextCache.ts`:

```ts
/**
 * Context caching do PDF no Vertex (cachedContents) — paga o PDF UMA vez por sessão
 * e referencia o cache nos turnos seguintes (tokens cacheados = 10% do custo).
 * Resolve o gasto do chat de PDF, que reenviava o PDF inteiro a cada pergunta.
 *
 * Auth reusa lib/ai/vertex-credentials.ts (mesmo service account do resto da IA),
 * via REST (mesmo padrão de lib/voice/gemini-tts.ts) — sem risco de versão de SDK.
 * Helpers puros (sem rede) ficam testáveis; os callers REST são verificados por tsc.
 */
export const PDF_CACHE_TTL_SECONDS = Number(process.env.PDF_CACHE_TTL_SECONDS) || 2700;
export const PDF_CACHE_ENABLED = (process.env.PDF_CACHE_ENABLED ?? "on") !== "off";
// Piso de tamanho: o cache do Vertex exige ~2048 tokens (~8 páginas). Abaixo disso não
// dá pra cachear → inline (que é barato p/ PDF pequeno). ~40k chars base64 ≈ 30KB.
export const MIN_CACHE_BASE64 = 40_000;

/** Erro tipado: cache inexistente/expirado → o caller recria e tenta de novo. */
export class CacheMissError extends Error {}

/** Segundos → string de ttl do Vertex ("2700s"); nunca abaixo de 1s. */
export function ttlString(seconds: number): string {
  return `${Math.max(1, Math.round(seconds))}s`;
}

/** Vale a pena cachear este PDF? (feature ligada E acima do piso de tamanho.) */
export function isCacheableEstimate(base64Length: number): boolean {
  return PDF_CACHE_ENABLED && base64Length >= MIN_CACHE_BASE64;
}

/** Extrai o resource name do cache da resposta do Vertex. */
export function parseCacheName(resp: unknown): string | null {
  if (resp && typeof resp === "object" && typeof (resp as { name?: unknown }).name === "string") {
    return (resp as { name: string }).name;
  }
  return null;
}

/** Corpo do POST cachedContents — cacheia SÓ o PDF (persona/contexto vão por turno). */
export function buildCacheRequest(opts: {
  project: string;
  location: string;
  model: string;
  pdfBase64: string;
  ttlSeconds: number;
}): Record<string, unknown> {
  return {
    model: `projects/${opts.project}/locations/${opts.location}/publishers/google/models/${opts.model}`,
    contents: [
      { role: "user", parts: [{ inlineData: { mimeType: "application/pdf", data: opts.pdfBase64 } }] },
    ],
    ttl: ttlString(opts.ttlSeconds),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/ai/contextCache.test.ts`
Expected: PASS (10 assertions across 4 suites).

- [ ] **Step 5: Commit**

```bash
git add lib/ai/contextCache.ts lib/ai/contextCache.test.ts
git commit -m "feat(ai): pure helpers for Vertex PDF context caching

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: REST cache callers

**Files:**
- Modify: `lib/ai/contextCache.ts` (append the two callers + imports)

**Interfaces:**
- Consumes: `buildCacheRequest`, `parseCacheName`, `ttlString`, `PDF_CACHE_TTL_SECONDS`, `CacheMissError` (Task 1); `vertexCredentials` (`lib/ai/vertex-credentials.ts`); `GEMINI_MODEL_FLASH` (`lib/ai/model.ts`); `GoogleAuth` (`google-auth-library`).
- Produces:
  - `createPdfCache(opts: { pdfBase64: string; ttlSeconds?: number; model?: string; timeoutMs?: number }): Promise<{ name: string; expireTime: string } | null>`
  - `generateWithCache(opts: { cacheName: string; systemText: string; prompt: string; history?: { role: string; parts: { text: string }[] }[]; model?: string; timeoutMs?: number }): Promise<string>` — throws `CacheMissError` on cache 4xx.

> No unit test: these are network integration functions. Verification is `tsc` (they transpile and types resolve) + the manual deploy check. This is consistent with how the other AI routes in this repo are verified.

- [ ] **Step 1: Add imports at the top of `lib/ai/contextCache.ts`**

Insert directly under the file's opening doc comment (before `export const PDF_CACHE_TTL_SECONDS`):

```ts
import { GoogleAuth } from "google-auth-library";
import { vertexCredentials } from "./vertex-credentials";
import { GEMINI_MODEL_FLASH } from "./model";

const SCOPES = ["https://www.googleapis.com/auth/cloud-platform"];

async function vertexAccessToken(client_email: string, private_key: string): Promise<string | null> {
  const auth = new GoogleAuth({ credentials: { client_email, private_key }, scopes: SCOPES });
  return (await auth.getAccessToken()) || null;
}
```

- [ ] **Step 2: Append the two callers at the end of `lib/ai/contextCache.ts`**

```ts
/**
 * Cria um cache do PDF no Vertex (TTL em segundos). Devolve {name, expireTime} ou null
 * em QUALQUER falha (PDF pequeno demais p/ cachear, erro, timeout) — o caller faz inline.
 * Nunca lança.
 */
export async function createPdfCache(opts: {
  pdfBase64: string;
  ttlSeconds?: number;
  model?: string;
  timeoutMs?: number;
}): Promise<{ name: string; expireTime: string } | null> {
  try {
    const { project, client_email, private_key, location } = vertexCredentials();
    const model = opts.model || GEMINI_MODEL_FLASH;
    const token = await vertexAccessToken(client_email, private_key);
    if (!token) return null;
    const url =
      `https://${location}-aiplatform.googleapis.com/v1/projects/${project}` +
      `/locations/${location}/cachedContents`;
    const body = buildCacheRequest({
      project, location, model,
      pdfBase64: opts.pdfBase64,
      ttlSeconds: opts.ttlSeconds ?? PDF_CACHE_TTL_SECONDS,
    });
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const name = parseCacheName(data);
    if (!name) return null;
    return { name, expireTime: typeof data.expireTime === "string" ? data.expireTime : "" };
  } catch {
    return null;
  }
}

/**
 * Gera contra um cache existente: manda só o histórico (texto) + o novo turno, com o
 * systemText (persona + contexto dinâmico) como prefixo. O PDF NÃO vai no request — está
 * no cache. Lança CacheMissError se o cache sumiu/expirou (p/ o caller recriar).
 */
export async function generateWithCache(opts: {
  cacheName: string;
  systemText: string;
  prompt: string;
  history?: { role: string; parts: { text: string }[] }[];
  model?: string;
  timeoutMs?: number;
}): Promise<string> {
  const { project, client_email, private_key, location } = vertexCredentials();
  const model = opts.model || GEMINI_MODEL_FLASH;
  const token = await vertexAccessToken(client_email, private_key);
  if (!token) throw new Error("cache_gen_no_token");
  const url =
    `https://${location}-aiplatform.googleapis.com/v1/projects/${project}` +
    `/locations/${location}/publishers/google/models/${model}:generateContent`;
  const contents = [
    ...(opts.history ?? []),
    { role: "user", parts: [{ text: `${opts.systemText}\n\n${opts.prompt}` }] },
  ];
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ cachedContent: opts.cacheName, contents }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 45_000),
  });
  if (res.status === 404 || res.status === 403 || res.status === 400) {
    const detail = await res.text().catch(() => "");
    if (res.status === 404 || /cache/i.test(detail)) {
      throw new CacheMissError(`cache_miss_${res.status}`);
    }
    throw new Error(`cache_gen_http_${res.status}`);
  }
  if (!res.ok) throw new Error(`cache_gen_http_${res.status}`);
  const data: any = await res.json();
  return (
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("") ?? ""
  );
}
```

- [ ] **Step 3: Verify transpile + suite still green**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "lib/ai/contextCache" || echo "(clean)"`
Expected: `(clean)`

Run: `npx vitest run`
Expected: all green (269 + the 10 from Task 1 = 279).

- [ ] **Step 4: Commit**

```bash
git add lib/ai/contextCache.ts
git commit -m "feat(ai): Vertex createPdfCache + generateWithCache (REST)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: `POST /api/ai/pdf/cache` route

**Files:**
- Create: `app/api/ai/pdf/cache/route.ts`

**Interfaces:**
- Consumes: `createPdfCache`, `isCacheableEstimate` (Tasks 1-2); `getServerSession`/`authOptions`; `prisma`; `guard`.
- Produces: HTTP `POST` accepting `{ fileData: string; title?: string }`, returning `{ cacheName: string; expireTime: string }` or `{ cacheName: null }`.

- [ ] **Step 1: Create the route**

Create `app/api/ai/pdf/cache/route.ts`:

```ts
/**
 * /api/ai/pdf/cache — cria um cache do PDF no Vertex (token-saving p/ o chat de PDF).
 * Chamado quando o documento abre. Devolve { cacheName, expireTime } ou { cacheName: null }
 * (PDF pequeno demais p/ cachear ou falha → o cliente faz inline, sem quebrar a tela).
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { guard } from "@/src/lib/ratelimit";
import { createPdfCache, isCacheableEstimate } from "@/lib/ai/contextCache";

export const runtime = "nodejs";
export const maxDuration = 60;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const rl = await guard(req, "ai-pdf-cache", "ai-heavy");
  if (!rl.ok) return rl.response;

  const body = await req.json().catch(() => ({} as any));
  const fileData = typeof body.fileData === "string" ? body.fileData : "";
  if (!fileData || !isCacheableEstimate(fileData.length)) {
    return json({ cacheName: null }, 200); // pequeno/desligado → cliente faz inline
  }

  const cache = await createPdfCache({ pdfBase64: fileData });
  if (!cache) return json({ cacheName: null }, 200);
  return json({ cacheName: cache.name, expireTime: cache.expireTime }, 200);
}
```

- [ ] **Step 2: Verify transpile + suite**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "app/api/ai/pdf/cache/route" || echo "(clean)"`
Expected: `(clean)`

Run: `npx vitest run`
Expected: all green (279).

- [ ] **Step 3: Commit**

```bash
git add app/api/ai/pdf/cache/route.ts
git commit -m "feat(ai): POST /api/ai/pdf/cache — mint a Vertex PDF cache

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: `cacheName` branch in `/api/ai/chat`

**Files:**
- Modify: `app/api/ai/chat/route.ts`

**Interfaces:**
- Consumes: `generateWithCache`, `CacheMissError` (Task 2); existing `GEMINI_MODEL_FLASH`, `finalSystemInstruction`, `chatHistory`, `prompt`.
- Produces: `/api/ai/chat` accepts an optional `cacheName: string`. With it → `{ text }` from the cache, or `{ cacheExpired: true }` on miss. Without it → unchanged.

- [ ] **Step 1: Import the cache caller**

At the top of `app/api/ai/chat/route.ts`, add to the imports (next to the other `@/lib/ai` imports):

```ts
import { generateWithCache, CacheMissError } from "@/lib/ai/contextCache";
```

- [ ] **Step 2: Destructure `cacheName` from the request body**

Find:

```ts
const { prompt, agent, systemContext, fileData, userData, voiceMode, history, agentContext } = await req.json();
```

Replace with:

```ts
const { prompt, agent, systemContext, fileData, userData, voiceMode, history, agentContext, cacheName } = await req.json();
```

- [ ] **Step 3: Add the cache branch right before `startChat`**

Find:

```ts
        const chat = generativeModel.startChat({
            systemInstruction: { role: 'system', parts: [{ text: finalSystemInstruction }] },
            history: chatHistory, // 🔥 memória entre turnos (antes era ignorada → IA "esquecia" tudo)
        });
```

Insert IMMEDIATELY BEFORE it:

```ts
        // CHAT VIA CACHE: o PDF está num cachedContent do Vertex → mandamos só o
        // systemInstruction + histórico + pergunta (sem reenviar o PDF). ~90% menos
        // tokens por turno. Cache expirou → { cacheExpired: true } e o cliente recria.
        if (typeof cacheName === "string" && cacheName) {
            try {
                const text = await generateWithCache({
                    cacheName,
                    systemText: finalSystemInstruction,
                    prompt,
                    history: chatHistory,
                });
                return NextResponse.json({ text });
            } catch (e: any) {
                if (e instanceof CacheMissError) {
                    return NextResponse.json({ cacheExpired: true });
                }
                return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
            }
        }

```

- [ ] **Step 4: Verify transpile + suite**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "app/api/ai/chat/route" || echo "(clean)"`
Expected: `(clean)`

Run: `npx vitest run`
Expected: all green (279).

- [ ] **Step 5: Commit**

```bash
git add app/api/ai/chat/route.ts
git commit -m "feat(ai): /api/ai/chat uses a PDF cache when cacheName is provided

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Wire the research-lab client to the cache

**Files:**
- Modify: `app/research-lab/page.tsx`

**Interfaces:**
- Consumes: `POST /api/ai/pdf/cache` (Task 3); `cacheName` + `{ cacheExpired }` on `/api/ai/chat` (Task 4).
- Produces: client-side cache lifecycle — create on open, use per turn, recreate-or-inline on expiry.

- [ ] **Step 1: Add `pdfCache` state**

Find:

```ts
  const [internalDoc, setInternalDoc] = useState<{ title: string; content: string } | null>(null);
```

Insert immediately AFTER it:

```ts
  // Cache do PDF no Vertex (token-saving): o chat usa o cacheName em vez de reenviar o PDF.
  const [pdfCache, setPdfCache] = useState<{ name: string; expireTime: string } | null>(null);
```

- [ ] **Step 2: Create the cache in `handlePlaySavedDoc` (heavy path) and use it for the opening summary**

In `handlePlaySavedDoc`, find:

```ts
      setActiveFileContext(base64Data);
      setProcessingStage("ai");
      setDocTitle(file.title);
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Analise o documento "${file.title}" e gere um resumo.`,
          agent: "aura",
          fileData: base64Data,
          systemContext: buildSystemContext(),
        }),
      });
```

Replace with:

```ts
      setActiveFileContext(base64Data);
      setProcessingStage("ai");
      setDocTitle(file.title);
      // Cacheia o PDF uma vez (Vertex) → os turnos seguintes usam o cacheName (sem reenviar
      // o PDF). Falhou/pequeno demais → cache null e seguimos inline (base64Data).
      let cache: { name: string; expireTime: string } | null = null;
      try {
        const cr = await fetch("/api/ai/pdf/cache", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileData: base64Data, title: file.title }),
        });
        const cd = await cr.json().catch(() => null);
        if (cd?.cacheName) cache = { name: cd.cacheName, expireTime: cd.expireTime || "" };
      } catch {
        /* sem cache → inline */
      }
      setPdfCache(cache);
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Analise o documento "${file.title}" e gere um resumo.`,
          agent: "aura",
          ...(cache ? { cacheName: cache.name } : { fileData: base64Data }),
          systemContext: buildSystemContext(),
        }),
      });
```

- [ ] **Step 3: Clear `pdfCache` when leaving the PDF context**

In `handlePlaySavedDoc`, find:

```ts
    setInternalDoc(null); // sai do modo "documento gerado" ao abrir um arquivo da biblioteca
```

Replace with:

```ts
    setInternalDoc(null); // sai do modo "documento gerado" ao abrir um arquivo da biblioteca
    setPdfCache(null); // cache do PDF anterior não vale mais
```

In the lite branch of `handlePlaySavedDoc`, find:

```ts
        setActiveFileContext(null);
        setLiteContext(d.context || null);
```

Replace with:

```ts
        setActiveFileContext(null);
        setPdfCache(null);
        setLiteContext(d.context || null);
```

In the `!res.ok` fallback of `handlePlaySavedDoc`, find:

```ts
          setActiveFileContext(null);
          setLiteContext(d.context || null);
```

Replace with:

```ts
          setActiveFileContext(null);
          setPdfCache(null);
          setLiteContext(d.context || null);
```

In the "Conversar" button handler, find:

```ts
                            setActiveFileContext(null);
                            setLiteContext(null);
                            setInternalDoc({ title: docTitle, content: docContent });
```

Replace with:

```ts
                            setActiveFileContext(null);
                            setLiteContext(null);
                            setPdfCache(null);
                            setInternalDoc({ title: docTitle, content: docContent });
```

- [ ] **Step 4: Use the cache in `handlePdfQuestion`, with one transparent recreate on expiry**

In `handlePdfQuestion`, find the external-paper fetch block:

```ts
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: currentPrompt,
          // modo leve (sem PDF) → Groq, sem Vertex/sem 502; modo pesado → Aura/Gemini multimodal
          agent: liteContext && !activeFileContext ? "groq_bypassed" : "aura",
          ...(activeFileContext ? { fileData: activeFileContext } : {}),
          history: historyForGemini,
          systemContext:
            buildSystemContext() +
            (liteContext && !activeFileContext
              ? `\n\n[DOCUMENTO (metadados do artigo)]:\n${liteContext}`
              : ""),
        }),
      });
      const data = await response.json();
      if (data.text)
        setPdfChatHistory((prev) => [...prev, { role: "ai", text: data.text }]);
```

Replace with:

```ts
      // PDF cacheado → manda o cacheName (sem reenviar o PDF). Cache expirou
      // ({ cacheExpired }) → recria UMA vez a partir do base64 e tenta de novo; se não
      // der, cai pro inline daquele turno.
      const chatBody = (extra: Record<string, unknown>) => ({
        prompt: currentPrompt,
        agent: liteContext && !activeFileContext ? "groq_bypassed" : "aura",
        history: historyForGemini,
        systemContext:
          buildSystemContext() +
          (liteContext && !activeFileContext
            ? `\n\n[DOCUMENTO (metadados do artigo)]:\n${liteContext}`
            : ""),
        ...extra,
      });
      const post = (extra: Record<string, unknown>) =>
        fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chatBody(extra)),
        }).then((r) => r.json());

      let data: any;
      if (pdfCache) {
        data = await post({ cacheName: pdfCache.name });
        if (data?.cacheExpired) {
          let recreated: { name: string; expireTime: string } | null = null;
          if (activeFileContext) {
            try {
              const cr = await fetch("/api/ai/pdf/cache", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileData: activeFileContext }),
              });
              const cd = await cr.json().catch(() => null);
              if (cd?.cacheName) recreated = { name: cd.cacheName, expireTime: cd.expireTime || "" };
            } catch {
              /* segue pro inline */
            }
          }
          setPdfCache(recreated);
          data = recreated
            ? await post({ cacheName: recreated.name })
            : await post(activeFileContext ? { fileData: activeFileContext } : {});
        }
      } else {
        data = await post(activeFileContext ? { fileData: activeFileContext } : {});
      }
      if (data?.text)
        setPdfChatHistory((prev) => [...prev, { role: "ai", text: data.text }]);
```

- [ ] **Step 5: Verify transpile + suite**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -cE "app/research-lab/page.tsx"`
Expected: `1` (only the pre-existing `onWorkType` error).

Run: `npx vitest run`
Expected: all green (279).

- [ ] **Step 6: Commit**

```bash
git add app/research-lab/page.tsx
git commit -m "feat(research-lab): PDF chat uses the Vertex cache, inline fallback on expiry

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage:**
- `lib/ai/contextCache.ts` (helpers + REST callers) → Tasks 1-2. ✓
- `POST /api/ai/pdf/cache` → Task 3. ✓
- `/api/ai/chat` optional `cacheName` + `cacheExpired` → Task 4. ✓
- Client `pdfCache` state, create on open, use per turn, recreate-or-inline on expiry, keep `activeFileContext` as fallback → Task 5. ✓
- Resilience table (small/failure → inline; expiry → recreate; absent → unchanged) → Tasks 2-5. ✓
- Model pinned to `GEMINI_MODEL_FLASH`; TTL/enabled envs → Tasks 1-2. ✓
- System-instruction strategy: cache holds PDF only; persona + dynamic context passed per turn as `systemText` prefix → Tasks 2 & 4. (Refinement of the spec's "bake persona" line, forced by Vertex's rule that `cachedContent` requests can't override `system_instruction`; same design intent — the expensive PDF is what gets cached.) ✓

**2. Placeholder scan:** No TBD/TODO; every code step shows complete code; commands have expected output. ✓

**3. Type consistency:** `createPdfCache`/`generateWithCache` signatures in Task 2 match their uses in Tasks 3-4. `pdfCache: { name; expireTime }` shape consistent across Task 5. `{ cacheName }` request field and `{ cacheExpired }`/`{ text }` responses consistent between Tasks 3-5. ✓

---

## Post-merge follow-ups (from final whole-branch review)

- **`systemInstruction` placement:** `generateWithCache` sends `systemText` (persona + context) as a leading **user** text part. Moving it to a top-level `systemInstruction` field on the `generateContent` body would improve instruction-following fidelity (persona treated as system, not user). Vertex *may* allow `systemInstruction` alongside `cachedContent` when the cache itself defines none (ours doesn't) — **verify against the live Vertex API before changing**; if rejected, leave as-is. Not merge-blocking (current behavior is functional).
- **Proactive cache refresh:** the client stores `pdfCache.expireTime` but only recreates reactively (on a server `cacheExpired`). Optionally recreate just before expiry, or drop the unused field.
