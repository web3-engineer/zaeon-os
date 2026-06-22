# Design — Context caching for single-PDF chat

**Date:** 2026-06-22
**Status:** Approved (design); pending spec review → implementation plan
**Scope:** Single-PDF "talk with the document" chat in `app/research-lab`.
**Out of scope (future):** 2-PDF "cruzar" comparison; library-wide RAG (Approach B).

## Problem

The single-PDF chat re-sends the **entire PDF** to Gemini on **every turn**:

- Client `handlePdfQuestion` (`app/research-lab/page.tsx`) sends `fileData: activeFileContext` (base64 PDF) with each question.
- Route `app/api/ai/chat/route.ts` pushes `{ inlineData: { data: fileData, mimeType: "application/pdf" } }` into `parts` on every request.

Gemini bills a PDF at **258 tokens/page as images**, identical whether sent inline or via the Files API. A 20-page paper ≈ 5,160 tokens **re-charged per message**; a 10-question chat pays for the PDF ~10×. On the Google GenAI credit, that burn is the bottleneck for the "talk with PDFs" feature.

References:
- PDF = 258 tokens/page, inline == Files API for tokens: https://ai.google.dev/gemini-api/docs/document-processing
- Context caching: ~90% discount on cached tokens (10% billing), TTL 30–60 min for interactive: https://ai.google.dev/gemini-api/docs/caching
- Vertex context caching, minimum **2,048 input tokens** (≈ 8 PDF pages) on 2.5 Flash/Pro: https://cloud.google.com/blog/products/ai-machine-learning/vertex-ai-context-caching

## Goal

Pay for the PDF's tokens roughly **once per session** instead of every turn, with **no fidelity loss** (the model still receives the full PDF, so figures/tables/layout remain available). Steady-state token reduction of ~80% on a typical multi-turn chat, growing with conversation length.

## Approach

**Explicit Vertex context caching (`cachedContents`).** When the user opens a PDF, create a cache holding the PDF once (TTL 45 min). Each chat turn references the cache by name and sends only the new prompt + history — no PDF bytes. Cached tokens bill at 10%.

Chosen over RAG (Approach B) because it is the smallest change, keeps full-document fidelity, and fits the credit economics. RAG remains a later option for large/library-wide chat.

## Architecture

Three pieces, mirroring the existing `lib/voice/gemini-tts.ts` REST pattern (Vertex auth via `vertex-credentials` + a `google-auth-library` bearer token).

### 1. `lib/ai/contextCache.ts` (new)

Pure, testable helpers + thin REST callers. No SDK version risk (raw REST, like `gemini-tts.ts`).

**Pure (TDD):**
- `ttlString(seconds: number): string` — `2700` → `"2700s"`.
- `buildCacheRequest({ model, pdfBase64, systemInstruction, ttlSeconds })` — returns the JSON body for `cachedContents` create (model path, `contents:[{role:"user",parts:[{inlineData:{mimeType:"application/pdf",data}}]}]`, `systemInstruction`, `ttl`).
- `parseCacheName(resp: unknown): string | null` — extracts `name` (e.g. `projects/.../cachedContents/123`).
- `isCacheableEstimate(base64Length: number): boolean` — heuristic gate: only attempt caching when the PDF is plausibly ≥ ~8 pages / ≥ 2,048 tokens. Threshold derived from base64 length (documented constant); below it, skip caching and inline.

**Side-effecting (verified via tsc + manual):**
- `createPdfCache({ pdfBase64, systemInstruction, model, ttlSeconds }): Promise<{ name: string; expireTime: string } | null>` — mints a token, POSTs to `…/cachedContents`, returns the parsed cache handle, or `null` on any failure (too small, error, timeout). Never throws to the caller.
- `generateWithCache({ cacheName, model, contents, history, systemContext }): Promise<string>` — POSTs `:generateContent` with `cachedContent: <name>` plus the new turn; returns the text. Throws a typed `CacheMissError` when the cache is missing/expired (HTTP 4xx referencing the cache) so the caller can recreate.

Model is pinned to `GEMINI_MODEL` (`lib/ai/model.ts`) for both create and generate — caches are model-bound.

### 2. `POST /api/ai/pdf/cache` (new route)

- Auth (`getServerSession` + user lookup), rate-limit (`guard(req, "ai-pdf-cache", "ai-heavy")`).
- Body: `{ fileData: string (base64 PDF), title?: string }`.
- If `isCacheableEstimate(fileData.length)` → `createPdfCache(...)`; respond `{ cacheName, expireTime }`.
- Otherwise (small PDF or failure) → respond `{ cacheName: null }` (the client inlines as today).
- Never 5xx on cache failure — returns `{ cacheName: null }` so the client degrades cleanly.

### 3. `app/api/ai/chat/route.ts` (modified)

- Accept an optional `cacheName` field on the request body.
- When `cacheName` is present: call `generateWithCache(...)` (system instruction = persona, dynamic `systemContext` as a prompt prefix), **do not** push `inlineData`. On `CacheMissError`, return a typed `{ cacheExpired: true }` response so the client can recreate.
- When `cacheName` is absent: behavior is byte-for-byte unchanged (full back-compat for all other callers of this route).

## Client data flow (`app/research-lab/page.tsx`)

New state: `pdfCache: { name: string; expireTime: string } | null`.

- `handlePlaySavedDoc` (heavy path): after obtaining the PDF base64, `POST /api/ai/pdf/cache`.
  - `cacheName` returned → set `pdfCache`, **keep** `activeFileContext` (the base64 stays only as the inline fallback for cache-expiry; chat turns use the cache, not the bytes), run the opening summary through the cache.
  - `cacheName: null` → keep today's inline `activeFileContext` flow.
- `handlePdfQuestion`:
  - `pdfCache` set → send `{ prompt, agent, cacheName: pdfCache.name, history, systemContext }`.
  - response `{ cacheExpired: true }` → call `/api/ai/pdf/cache` once more to recreate, retry the turn; if recreation fails, fall back to inline (`fileData`) for that turn.
  - `pdfCache` null → inline as today.
- Switching/closing the document clears `pdfCache`. Server-side caches are left to expire by TTL (no explicit delete in v1 — YAGNI).

## Error handling / resilience

Follows the project's established fallback style (e.g. Gemini-TTS → Piper):

| Condition | Behavior |
|---|---|
| PDF < ~8 pages / not cacheable | `cacheName: null` → inline (cheap anyway), no UX change |
| Cache create fails (error/timeout) | `cacheName: null` → inline |
| Cache expired mid-session | one transparent recreate + retry; then inline |
| `cacheName` absent | route unchanged (full back-compat) |

## Token math (illustrative)

20-page paper, 10-turn chat:
- Today: ~10 × 5,160 = **~51,600** PDF input tokens.
- Cached: 5,160 (create) + 9 × ~516 (cached @ 10%) ≈ **~9,800** → **~80% reduction**, improving with longer chats. (Plus a small cache-storage fee for 45 min, far below the re-billing it replaces.)

## Testing

- **TDD** the pure helpers in `lib/ai/contextCache.ts`: `ttlString`, `buildCacheRequest`, `parseCacheName`, `isCacheableEstimate`.
- Routes (`pdf/cache`, `chat` change) verified via `tsc --noEmit` on touched files + the full `vitest` suite staying green (baseline 269).
- No fidelity regression to assert in tests (model still receives the full PDF via cache); validated by the owner's manual deploy check on the VPS.

## Rollout / flags

- Pure-additive: absent `cacheName`, everything behaves as today.
- Optional env `PDF_CACHE_TTL_SECONDS` (default 2700) and `PDF_CACHE_ENABLED` (default on) to disable quickly if needed.
- Deploy is manual by the owner (Zed → push → VPS rebuild); secrets stay in `.env`/VPS.
