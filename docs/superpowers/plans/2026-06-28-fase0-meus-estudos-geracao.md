# Fase 0 — Geração do "Meus Estudos" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer a geração de estudo (1) produzir um estudo real em vez de um "estudo" só com título cacheado por 7 dias, e (2) nunca descartar em silêncio um pedido quando a aba está fora de foco ou não há espaço.

**Architecture:** Extrair o parse/validação da rota `study/agent` para um módulo puro testável (`lib/study/studyAgentParse.ts`) com `extractJson` tolerante + `isRealStudy` + retry + lançar-em-degenerado (não cacheia) + bump da chave de cache. No front, refatorar `zaeonStudy` para garantir espaço (`ensureSpaceId`) e enfileirar pedidos (`pendingTopicRef` + `flushPending`) para que nenhum evento `zaeon:study:run`/handoff se perca.

**Tech Stack:** TypeScript, Next.js 14 (App Router), React, Vertex Gemini (`lib/ai/gemini-text.ts`), Upstash Redis (`src/lib/cache.ts`), Vitest (env node, includes `lib/**/*.test.ts` e `app/**/*.test.ts`).

## Global Constraints

- Branch + PR sempre; **NUNCA** push direto no `main`. `git fetch/pull` trava nesta rede — **push/ls-remote/curl funcionam**.
- **Não usar `git add -A`** (deleções fantasma). Adicionar arquivos explicitamente.
- Verificação padrão: `npx tsc --noEmit` (tolerar **1 erro pré-existente** em `app/research-lab/page.tsx` — WorkType vs string) + `npx vitest run`.
- Não tocar em `docker-compose.beta.yml`, navbar/sidebar, nem `voice-engine` (fica `1g`).
- Testes vivem ao lado do código em `lib/**` (vitest include). Manter env `node`.
- Modelo Gemini default = `gemini-2.5-flash` via `GEMINI_MODEL_FLASH`; suporta `responseMimeType: "application/json"` no `generationConfig`.

---

### Task 1: Módulo puro de parse/validação (`lib/study/studyAgentParse.ts`)

**Files:**
- Create: `lib/study/studyAgentParse.ts`
- Test: `lib/study/studyAgentParse.test.ts`

**Interfaces:**
- Consumes: nada (módulo puro, sem imports externos).
- Produces:
  - `type StudyBlock = { kind: "heading"|"subheading"|"text"|"link"; text: string; url?: string }`
  - `type Study = { title: string; blocks: StudyBlock[] }`
  - `extractJson(raw: string): any | null`
  - `isRealStudy(blocks: StudyBlock[]): boolean`
  - `buildStudy(raw: string, command: string): Study | null` (null = saída degenerada do modelo)

- [ ] **Step 1: Write the failing test**

Create `lib/study/studyAgentParse.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { extractJson, isRealStudy, buildStudy } from "./studyAgentParse";

const BODY = "Este é um parágrafo de corpo com tamanho suficiente para contar como estudo real.";

describe("extractJson", () => {
  it("parses pure JSON", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });
  it("strips ```json fences", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it("ignores prose around the object", () => {
    expect(extractJson('Claro! Aqui está:\n{"a":1}\nEspero ter ajudado.')).toEqual({ a: 1 });
  });
  it("handles nested objects/strings with braces", () => {
    expect(extractJson('prefixo {"t":"a } b","n":{"x":2}} sufixo')).toEqual({ t: "a } b", n: { x: 2 } });
  });
  it("returns null for total garbage", () => {
    expect(extractJson("desculpe, não consigo")).toBeNull();
  });
  it("returns null for empty input", () => {
    expect(extractJson("")).toBeNull();
  });
});

describe("isRealStudy", () => {
  it("rejects fewer than 3 blocks", () => {
    expect(isRealStudy([{ kind: "heading", text: "Tema" }, { kind: "text", text: BODY }])).toBe(false);
  });
  it("rejects heading-only-ish sets without a real text body", () => {
    expect(isRealStudy([
      { kind: "heading", text: "Tema" },
      { kind: "subheading", text: "Sub" },
      { kind: "text", text: "curto" },
    ])).toBe(false);
  });
  it("accepts a study with >=3 blocks and a real text body", () => {
    expect(isRealStudy([
      { kind: "heading", text: "Tema" },
      { kind: "subheading", text: "Sub" },
      { kind: "text", text: BODY },
    ])).toBe(true);
  });
});

describe("buildStudy", () => {
  it("builds a study and injects a heading when missing", () => {
    const raw = JSON.stringify({ title: "Fotossíntese", blocks: [
      { kind: "subheading", text: "Conceito" },
      { kind: "text", text: BODY },
      { kind: "text", text: BODY + " Mais um trecho." },
    ] });
    const s = buildStudy(raw, "estude fotossíntese");
    expect(s).not.toBeNull();
    expect(s!.title).toBe("Fotossíntese");
    expect(s!.blocks[0].kind).toBe("heading");
    expect(s!.blocks.length).toBeGreaterThanOrEqual(3);
  });
  it("returns null when the model output is degenerate (heading-only)", () => {
    const raw = JSON.stringify({ title: "Tema", blocks: [{ kind: "heading", text: "Tema" }] });
    expect(buildStudy(raw, "tema")).toBeNull();
  });
  it("returns null when JSON cannot be parsed", () => {
    expect(buildStudy("desculpe, não consigo montar", "tema")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/study/studyAgentParse.test.ts`
Expected: FAIL — `Cannot find module './studyAgentParse'` (or `extractJson is not a function`).

- [ ] **Step 3: Write minimal implementation**

Create `lib/study/studyAgentParse.ts`:

```ts
/**
 * Parse + validação puros do worker generativo /api/study/agent.
 *
 * Isolado da rota para ser testável em node e para endurecer a leitura do JSON do
 * Gemini (que às vezes vem com prosa em volta, fences ou vírgula sobrando). Saída
 * degenerada (vazio / só título) vira `null` — a rota trata isso como falha e NÃO
 * cacheia, evitando "estudo vazio" preso por 7 dias.
 */
export type StudyBlock = { kind: "heading" | "subheading" | "text" | "link"; text: string; url?: string };
export type Study = { title: string; blocks: StudyBlock[] };

const KINDS = ["heading", "subheading", "text", "link"] as const;

/** Lê o 1º objeto JSON balanceado de `raw` (ignora fences e prosa em volta). null se não houver. */
export function extractJson(raw: string): any | null {
  if (!raw) return null;
  const s = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  if (!s) return null;
  try { return JSON.parse(s); } catch { /* tenta o objeto balanceado abaixo */ }
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(s.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

/** Normaliza os blocos vindos do modelo (filtra vazios, limita kinds/url/tamanho). */
export function normalizeBlocks(parsed: any): StudyBlock[] {
  return (Array.isArray(parsed?.blocks) ? parsed.blocks : [])
    .filter((b: any) => b && typeof b.text === "string" && b.text.trim())
    .slice(0, 14)
    .map((b: any) => {
      const kind: StudyBlock["kind"] = KINDS.includes(b.kind) ? b.kind : "text";
      const out: StudyBlock = { kind, text: String(b.text).slice(0, 1200) };
      if (kind === "link" && typeof b.url === "string" && /^https?:\/\//i.test(b.url)) out.url = b.url;
      return out;
    });
}

/** Um "estudo de verdade": >= 3 blocos e ao menos 1 parágrafo de corpo real. */
export function isRealStudy(blocks: StudyBlock[]): boolean {
  if (!Array.isArray(blocks) || blocks.length < 3) return false;
  return blocks.some((b) => b.kind === "text" && b.text.trim().length >= 40);
}

/** raw do modelo -> estudo pronto, ou null quando a saída é degenerada/inparseável. */
export function buildStudy(raw: string, command: string): Study | null {
  const parsed = extractJson(raw);
  if (!parsed) return null;
  const title = typeof parsed.title === "string" ? parsed.title.slice(0, 120) : command.slice(0, 120);
  const blocks = normalizeBlocks(parsed);
  if (!blocks.some((b) => b.kind === "heading")) blocks.unshift({ kind: "heading", text: title });
  if (!isRealStudy(blocks)) return null;
  return { title, blocks };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/study/studyAgentParse.test.ts`
Expected: PASS (todos os `describe` verdes).

- [ ] **Step 5: Commit**

```bash
git add lib/study/studyAgentParse.ts lib/study/studyAgentParse.test.ts
git commit -m "feat(study): módulo puro de parse/validação do worker de estudo (extractJson, isRealStudy, buildStudy)"
```

---

### Task 2: Flag JSON opt-in em `geminiText`

**Files:**
- Modify: `lib/ai/gemini-text.ts:12-31`

**Interfaces:**
- Consumes: nada novo.
- Produces: `geminiText(opts)` agora aceita `json?: boolean`. Quando `true`, força `responseMimeType: "application/json"` no `generationConfig`. Sem a flag, comportamento idêntico ao atual (outras rotas não mudam).

- [ ] **Step 1: Adicionar a flag ao tipo de opts**

Em `lib/ai/gemini-text.ts`, dentro do objeto `opts` (após `timeoutMs?: number;`, antes do `}): Promise<string> {`), adicionar:

```ts
  /** Força saída em JSON puro (responseMimeType). Use em rotas que parseiam JSON. */
  json?: boolean;
```

- [ ] **Step 2: Aplicar no generationConfig**

Substituir a linha do `generationConfig` (atual `generationConfig: { temperature: opts.temperature ?? 0.5 },`) por:

```ts
    generationConfig: {
      temperature: opts.temperature ?? 0.5,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: nenhum erro novo (somente o 1 pré-existente em `app/research-lab/page.tsx`).

- [ ] **Step 4: Commit**

```bash
git add lib/ai/gemini-text.ts
git commit -m "feat(ai): geminiText aceita flag json -> responseMimeType application/json (opt-in)"
```

---

### Task 3: Religar a rota `study/agent` ao módulo + retry + não cachear degenerado + bump da chave

**Files:**
- Modify: `app/api/study/agent/route.ts` (reescrita do corpo de geração; mantém auth/rate-limit)

**Interfaces:**
- Consumes: `buildStudy` (Task 1), `geminiText({ json: true })` (Task 2), `cacheJson`/`hashKey` (existentes).
- Produces: `POST /api/study/agent` retorna `{ title, blocks }` (estudo real) ou **502** `ai_error` quando o modelo não entrega um estudo decente após 1 retry — **sem gravar cache** nesse caso.

- [ ] **Step 1: Substituir o conteúdo da rota**

Substituir todo o arquivo `app/api/study/agent/route.ts` por:

```ts
/**
 * POST /api/study/agent — o WORKER generativo da Sala de Estudos.
 *
 * Converte um comando em linguagem natural em BLOCOS estruturados (título,
 * subtítulos, parágrafos, links) que viram cards no feed "Meus Estudos".
 *
 * Robustez (Fase 0): parse tolerante + validação de "estudo de verdade"
 * (lib/study/studyAgentParse) com 1 retry. Saída degenerada LANÇA -> não entra no
 * cache (cacheJson só grava não-nulo) e a rota responde 502, em vez de cachear um
 * "estudo" só com título por 7 dias. Chave de cache versionada (studyagent2) para
 * ignorar entradas já envenenadas.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { geminiText } from "@/lib/ai/gemini-text";
import { guard } from "@/src/lib/ratelimit";
import { cacheJson, hashKey } from "@/src/lib/cache";
import { buildStudy } from "@/lib/study/studyAgentParse";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM =
  "Você é a Zaeon montando o caderno de estudos do aluno a partir de um comando. " +
  "Produza um material claro, didático e bem estruturado em português do Brasil. " +
  "Responda SOMENTE um JSON válido (sem markdown, sem crases), no formato: " +
  '{"title":"<título curto do estudo>","blocks":[{"kind":"heading|subheading|text|link","text":"...","url":"(só quando kind=link)"}]}. ' +
  "Regras: comece por 1 heading (o tema). Use subheadings pra organizar. Em 'text' escreva parágrafos " +
  "objetivos com os pontos-chave/insights (2 a 5 frases cada). Em 'link' dê recursos úteis e REAIS quando " +
  "tiver certeza (Wikipedia, docs oficiais, artigos conhecidos) — no máximo 3, com 'text' = nome e 'url' = endereço. " +
  "Entre 6 e 12 blocos no total. Não invente URLs improváveis; na dúvida, descreva o recurso num 'text'.";

const RETRY_HINT =
  "\n\nResponda SOMENTE o objeto JSON pedido — nada de texto fora do JSON. " +
  "Garanta de 6 a 12 blocos, com ao menos 3 parágrafos de corpo reais (kind=\"text\").";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await guard(req, "study-agent", "ai-light");
  if (!rl.ok) return rl.response;

  const body = await req.json().catch(() => ({} as any));
  const command = typeof body.command === "string" ? body.command.trim() : "";
  if (command.length < 2) return NextResponse.json({ error: "Comando muito curto." }, { status: 400 });

  try {
    const result = await cacheJson(hashKey("studyagent2", command.toLowerCase()), 60 * 60 * 24 * 7, async () => {
      const first = await geminiText({ temperature: 0.5, system: SYSTEM, prompt: `Comando do aluno: ${command}`, json: true });
      let study = buildStudy(first, command);
      if (!study) {
        const second = await geminiText({ temperature: 0.2, system: SYSTEM, prompt: `Comando do aluno: ${command}${RETRY_HINT}`, json: true });
        study = buildStudy(second, command);
      }
      if (!study) throw new Error("ai_degenerate"); // não cacheia; vira 502 abaixo
      return study;
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "ai_error", message: "Não consegui montar o estudo agora. Tente reformular o comando." }, { status: 502 });
  }
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: nenhum erro novo (só o 1 pré-existente em `app/research-lab/page.tsx`).

- [ ] **Step 3: Rodar a suíte (garante que nada quebrou)**

Run: `npx vitest run`
Expected: PASS — contagem ≥ baseline (≈388) incluindo os testes da Task 1.

- [ ] **Step 4: Commit**

```bash
git add app/api/study/agent/route.ts
git commit -m "fix(study/agent): parse robusto + retry + não cachear degenerado + bump da chave (studyagent2)"
```

---

### Task 4: Front — garantir espaço + fila de pedidos (`MeusEstudosFeed.tsx`)

**Files:**
- Modify: `components/study/MeusEstudosFeed.tsx`
  - Inserir `ensureSpaceId` antes de `zaeonStudy` (após `persistTitle`, ~linha 326)
  - Substituir `zaeonStudy` (linhas 329-386)
  - Inserir a fila (`pendingTopicRef`/`runningRef`/`flushPending` + effect) após `typeIntoBarAndRun` (~linha 401)
  - Substituir o listener `zaeon:study:run` (linhas 438-452)
  - Substituir o effect de handoff (linhas 241-246)

**Interfaces:**
- Consumes: estados existentes `spaceId/setSpaceId` (l.113), `spaces/setSpaces` (l.112), `items/setItems` (l.115), `zaeonBusy/setZaeonBusy` (l.150), `itemsRef` (l.172), `collabSpaceId`, `addItem`, `nextOrder`, `revealTitle`, `persistTitle`, `typeIntoBarAndRun`, `missionDone`, `takeHandoff`.
- Produces: `ensureSpaceId(): Promise<string>`, `pendingTopicRef`, `flushPending()`. Nenhuma mudança de assinatura pública do componente.

- [ ] **Step 1: Inserir `ensureSpaceId` antes de `zaeonStudy`**

Logo após o fim de `persistTitle` (linha 326, o `};`) e antes do comentário `// ── ZAEON GENERATIVA…` (linha 328), inserir:

```ts
  // Garante um espaço de estudo: usa o atual ou cria um novo. Assim um usuário sem
  // nenhum estudo (spaceId === "") ainda consegue gerar (botão/voz/chat) — antes o
  // pedido era abortado em silêncio.
  const ensureSpaceId = useCallback(async (): Promise<string> => {
    if (spaceId) return spaceId;
    try {
      const rs = await fetch("/api/study/spaces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Novo estudo" }) });
      if (rs.ok) {
        const s = await rs.json();
        setSpaces((prev) => [...prev, s]);
        setSpaceId(s.id);
        setItems([]);
        return s.id as string;
      }
    } catch { /* ignore */ }
    return "";
  }, [spaceId]);
```

- [ ] **Step 2: Substituir `zaeonStudy` (linhas 329-386)**

Substituir a função `zaeonStudy` inteira por (move o controle de busy/espaço para dentro do `try`, troca o guard `!spaceId` por `ensureSpaceId`):

```ts
  const zaeonStudy = async (override?: string) => {
    const cmd = (override ?? zaeonCmd).trim();
    if (!cmd || zaeonBusy) return;
    setZaeonBusy(true); setZaeonCmd(""); setZaeonStatus("Zaeon está pensando…"); setGenTitle(cmd); setBarOpen(false);
    try {
      // Garante um caderno mesmo se o usuário ainda não tem nenhum.
      const sid = spaceId || (await ensureSpaceId());
      if (!sid) { setZaeonStatus("Não consegui criar seu caderno agora. Tente de novo."); setTimeout(() => setZaeonStatus(""), 4000); return; }

      // Cada pedido à Zaeon = um NOVO estudo. Só escreve no atual se ele estiver VAZIO.
      let targetId = sid;
      let freshBase = false;
      const currentHasContent = itemsRef.current.some((i) => i.placement === "feed");
      if (currentHasContent && !collabSpaceId) {
        try {
          const rs = await fetch("/api/study/spaces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: cmd.slice(0, 80) }) });
          if (rs.ok) {
            const s = await rs.json();
            targetId = s.id; freshBase = true;
            setSpaces((prev) => [...prev, s]);
            setSpaceId(s.id);
            setItems([]);
          }
        } catch { /* se falhar, escreve no atual mesmo */ }
      }

      const r = await fetch("/api/study/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command: cmd, spaceId: targetId }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !Array.isArray(d.blocks) || d.blocks.length === 0) {
        setZaeonStatus("Não consegui montar agora. Tente reformular o comando.");
        setTimeout(() => setZaeonStatus(""), 4000);
        return;
      }
      const studyName = String(d.title || cmd).slice(0, 80);
      await revealTitle(studyName);
      await persistTitle(studyName, targetId);
      const base = freshBase ? 0 : nextOrder();
      setZaeonStatus("Zaeon está escrevendo no seu caderno…");
      const norm = (s: string) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
      for (let i = 0; i < d.blocks.length; i++) {
        const b = d.blocks[i];
        if (b.kind === "heading" && norm(b.text) === norm(studyName)) continue;
        const order = base + i;
        if (b.kind === "link" && b.url) {
          await addItem({ type: "link", title: String(b.text).slice(0, 80), payload: { url: b.url, text: b.text }, placement: "feed", order }, targetId);
        } else {
          const variant = b.kind === "heading" ? "h1" : b.kind === "subheading" ? "h2" : "text";
          await addItem({ type: "note", title: String(b.text).slice(0, 80), payload: { text: b.text, variant }, placement: "feed", order }, targetId);
        }
        await new Promise((res) => setTimeout(res, 420)); // efeito "escrevendo ao vivo"
      }
      setZaeonStatus("Pronto! ✨");
      setTimeout(() => setZaeonStatus(""), 2500);
    } catch {
      setZaeonStatus("Falha ao falar com a Nina.");
      setTimeout(() => setZaeonStatus(""), 4000);
    } finally { setZaeonBusy(false); setGenTitle(null); }
  };
```

- [ ] **Step 3: Inserir a fila após `typeIntoBarAndRun`**

Logo após o fim de `typeIntoBarAndRun` (a linha `};` na ~401) e antes do effect `// colar de outras abas` (~404), inserir:

```ts
  // Fila de pedidos: garante que um pedido (botão "Estudar esse tema"/voz/chat) NUNCA
  // seja descartado em silêncio — nem quando o espaço ainda não carregou, nem quando já
  // há uma geração em curso. O feed fica sempre montado (só escondido), então estes
  // listeners vivem mesmo fora da aba.
  const pendingTopicRef = useRef<string | null>(null);
  const runningRef = useRef(false);
  const flushPending = useCallback(() => {
    if (runningRef.current || zaeonBusy) return;
    const topic = pendingTopicRef.current;
    if (!topic) return;
    pendingTopicRef.current = null;
    runningRef.current = true;
    void typeIntoBarAndRun(topic)
      .then(() => { try { window.dispatchEvent(new CustomEvent("zaeon:study:done", { detail: { topic } })); } catch { /* ignore */ } })
      .catch(() => { try { window.dispatchEvent(new CustomEvent("zaeon:study:done", { detail: { topic, error: true } })); } catch { /* ignore */ } })
      .finally(() => { runningRef.current = false; flushPending(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zaeonBusy]);

  // Re-tenta a fila quando a geração em curso libera (zaeonBusy: true -> false).
  useEffect(() => { flushPending(); }, [zaeonBusy, flushPending]);
```

- [ ] **Step 4: Substituir o listener `zaeon:study:run` (linhas 438-452)**

Substituir o effect inteiro (`// "Estudar esse tema" …` + o `useEffect` do `onRun`) por:

```ts
  // "Estudar esse tema" (botão da pesquisa / Play da Base / voz): enfileira o tópico e
  // deixa a fila resolver (cria espaço se preciso, espera a geração atual terminar).
  useEffect(() => {
    const onRun = (e: any) => {
      const t = e?.detail?.topic;
      if (!t) return;
      pendingTopicRef.current = String(t);
      flushPending();
    };
    window.addEventListener("zaeon:study:run", onRun);
    return () => window.removeEventListener("zaeon:study:run", onRun);
  }, [flushPending]);
```

- [ ] **Step 5: Substituir o effect de handoff (linhas 241-246)**

Substituir:

```ts
  const handoffDoneRef = useRef(false);
  useEffect(() => {
    if (handoffDoneRef.current || !spaceId) return;
    const ho = takeHandoff(["study"]);
    if (ho?.topic) { handoffDoneRef.current = true; typeIntoBarAndRun(ho.topic).then(() => missionDone()).catch(() => missionDone("error")); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId]);
```

por (não espera mais por `spaceId` — `zaeonStudy` garante o espaço; roda uma vez no mount):

```ts
  const handoffDoneRef = useRef(false);
  useEffect(() => {
    if (handoffDoneRef.current) return;
    const ho = takeHandoff(["study"]);
    if (ho?.topic) { handoffDoneRef.current = true; typeIntoBarAndRun(ho.topic).then(() => missionDone()).catch(() => missionDone("error")); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

- [ ] **Step 6: Garantir `useCallback`/`useRef`/`useEffect` importados**

Verificar o topo do arquivo (`import ... from "react"`). Se algum de `useCallback`, `useEffect`, `useRef` não estiver importado, adicioná-lo.

Run: `grep -n "from \"react\"" components/study/MeusEstudosFeed.tsx`
Expected: a linha de import inclui `useCallback`, `useEffect`, `useRef` (todos já usados no arquivo — `useCallback` em l.283, `useRef` em l.172, `useEffect` em l.207; confirme que estão na lista).

- [ ] **Step 7: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: nenhum erro novo (só o 1 pré-existente em `app/research-lab/page.tsx`).

- [ ] **Step 8: Commit**

```bash
git add components/study/MeusEstudosFeed.tsx
git commit -m "fix(study): garante espaço (ensureSpaceId) + fila de pedidos -> nenhum estudo é descartado fora da aba"
```

---

### Task 5: Verificação final + PR

**Files:** nenhum (validação + git).

- [ ] **Step 1: Suíte completa**

Run: `npx vitest run`
Expected: PASS — total ≥ baseline (≈388) + os novos testes de `studyAgentParse`.

- [ ] **Step 2: Type-check final**

Run: `npx tsc --noEmit`
Expected: somente o 1 erro pré-existente em `app/research-lab/page.tsx`.

- [ ] **Step 3: Push da branch e abrir PR**

> Lembrete: `git push` funciona nesta rede; `git fetch/pull` não. Branch atual: `claude/elegant-lichterman-4339ee`.

```bash
git push -u origin HEAD
gh pr create --base main --title "Fase 0: consertar geração do Meus Estudos (estudo real + não descartar fora da aba)" \
  --body "Corrige a geração de estudos:
- parse de JSON do Gemini robusto (extractJson) + JSON mode opt-in
- valida 'estudo de verdade' (>=3 blocos, >=1 corpo) + 1 retry
- não cacheia saída degenerada (502 honesto) + bump da chave (studyagent2) para furar cache envenenado
- front: ensureSpaceId + fila de pedidos -> 'Estudar esse tema'/voz/chat nunca mais são descartados quando a aba está fora de foco ou não há espaço

Spec: docs/superpowers/specs/2026-06-28-fase0-meus-estudos-geracao-design.md
Plano: docs/superpowers/plans/2026-06-28-fase0-meus-estudos-geracao.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 4: Parar e pedir revisão** (regra do handoff: uma fase por PR; smoke manual da UI na beta fica com o dono).

---

## Self-Review

**Spec coverage:**
- Goal 1 (estudo real): `extractJson`/`isRealStudy`/`buildStudy` (Task 1), JSON mode (Task 2), retry + não-cachear + bump (Task 3). ✅
- Goal 2 (gerar fora da aba): `ensureSpaceId` + fila (Task 4). ✅
- Testes vitest do parse/validação (Task 1) + verificação padrão (Tasks 3/5). ✅
- Fora de escopo (Vertex creds, docker, navbar) — respeitado. ✅

**Placeholder scan:** sem TBD/TODO; todo passo tem código/coando concretos. ✅

**Type consistency:** `StudyBlock`/`Study`/`extractJson`/`isRealStudy`/`buildStudy` definidos na Task 1 e usados igual na Task 3. `ensureSpaceId`/`flushPending`/`pendingTopicRef`/`runningRef` definidos e referenciados de forma consistente na Task 4. `geminiText({ json: true })` casa com a flag adicionada na Task 2. ✅

**Nota de risco conhecida:** o caminho de handoff chama `typeIntoBarAndRun` direto (fora do `runningRef`), aceitável porque dispara uma única vez no mount via `handoffDoneRef`, antes de interação do usuário. A serialização (`runningRef`) cobre os eventos `zaeon:study:run` concorrentes.
