# Aula rica — Fatia 2b (flashcards + memória) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar 🃏 flashcards e 🧠 memória como blocos do canvas teach, ponta-a-ponta — jogos **não avaliáveis** (interativos, sem nota, sem feedback de correção).

**Architecture:** Persistem como `AulaQuestion` (type `flashcards`/`memory`, dados em `config`). `grade.ts` não muda (caem em `marksOutOf=0`); o render do aluno suprime a faixa de nota pra esses tipos. Memória usa um deck PURO/testável; flashcards reusa o `FlipCard` do Studio.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma+MongoDB, vitest (`@/` alias), Tailwind.

## Global Constraints

- Worktree `/Users/donmartinez/Documents/Projects.nosync/zaeon-aula-rica` (sobre 2a). Entrega via Git Trees API sobre `feat/criacao-aula-rica-2b`.
- **Nunca `git add -A`**. `npx tsc --noEmit` ao fim de cada task: **zero novos** (baseline 5). `node_modules/.bin/vitest run <arquivo>`.
- Aditivo: não quebrar tipos existentes, aulas antigas, correção/submit. `config` é Json (sem migração).
- flashcards/memória **não pontuam** e **não mostram feedback de nota**. Sem gabarito escondido (sem sanitização além de repassar cards/pairs).
- Idioma de UI: português.

---

### Task 1: `lib/aulas/memoryDeck.ts` — deck puro (TDD)

**Files:** Create `lib/aulas/memoryDeck.ts`; Test `lib/aulas/memoryDeck.test.ts`

**Interfaces:**
- Produces: `type MemoryCard = { id: string; pairId: number; text: string }`; `buildMemoryDeck(pairs: { a: string; b: string }[], seed: string): MemoryCard[]`; `isMatch(a: MemoryCard, b: MemoryCard): boolean`.
- Consumes: `shuffleSeeded` de `@/lib/aulas/fillBlanks`.

- [ ] **Step 1: Teste (falhando)** — `lib/aulas/memoryDeck.test.ts`
```ts
import { describe, it, expect } from "vitest";
import { buildMemoryDeck, isMatch } from "@/lib/aulas/memoryDeck";

describe("buildMemoryDeck", () => {
  it("gera 2 cartas por par com pairId e textos certos", () => {
    const deck = buildMemoryDeck([{ a: "gato", b: "cat" }, { a: "cão", b: "dog" }], "s");
    expect(deck).toHaveLength(4);
    expect(deck.map((c) => c.text).sort()).toEqual(["cat", "cão", "dog", "gato"]);
    expect(new Set(deck.filter((c) => c.pairId === 0).map((c) => c.text))).toEqual(new Set(["gato", "cat"]));
    expect(deck.map((c) => c.id).sort()).toEqual(["0-a", "0-b", "1-a", "1-b"]);
  });
  it("é determinístico por seed", () => {
    const p = [{ a: "1", b: "2" }, { a: "3", b: "4" }, { a: "5", b: "6" }];
    expect(buildMemoryDeck(p, "x")).toEqual(buildMemoryDeck(p, "x"));
  });
});

describe("isMatch", () => {
  it("mesmo pairId e cartas diferentes = par", () => {
    expect(isMatch({ id: "0-a", pairId: 0, text: "x" }, { id: "0-b", pairId: 0, text: "y" })).toBe(true);
    expect(isMatch({ id: "0-a", pairId: 0, text: "x" }, { id: "1-a", pairId: 1, text: "y" })).toBe(false);
    expect(isMatch({ id: "0-a", pairId: 0, text: "x" }, { id: "0-a", pairId: 0, text: "x" })).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar — falha.**

- [ ] **Step 3: Implementar `lib/aulas/memoryDeck.ts`**
```ts
/** Deck do jogo da memória (puro/testável). Cada par vira 2 cartas (mesmo pairId). */
import { shuffleSeeded } from "@/lib/aulas/fillBlanks";

export type MemoryCard = { id: string; pairId: number; text: string };

export function buildMemoryDeck(pairs: { a: string; b: string }[], seed: string): MemoryCard[] {
  const cards: MemoryCard[] = [];
  pairs.forEach((p, i) => {
    cards.push({ id: `${i}-a`, pairId: i, text: String(p?.a ?? "") });
    cards.push({ id: `${i}-b`, pairId: i, text: String(p?.b ?? "") });
  });
  return shuffleSeeded(cards, seed);
}

export function isMatch(a: MemoryCard, b: MemoryCard): boolean {
  return a.pairId === b.pairId && a.id !== b.id;
}
```

- [ ] **Step 4: Rodar — passa.** **Step 5: tsc + commit** (`feat(aula): deck puro do jogo da memória + testes`).

---

### Task 2: `buildQuestionBlock` — flashcards + game-memory (TDD)

**Files:** Modify `lib/aulas/generateParse.ts` (`ParsedBlock` type + `buildQuestionBlock`); Test `lib/aulas/generateParse.games.test.ts`

**Interfaces:**
- Produces: `buildQuestionBlock(raw, "flashcards")` → `{ type:"flashcards", text, marks, config:{ cards } }`; `buildQuestionBlock(raw, "game-memory")` → `{ type:"memory", text, marks, config:{ pairs } }`; null se vazio (<1 card / <2 pares).

- [ ] **Step 1: Teste (falhando)** — `lib/aulas/generateParse.games.test.ts`
```ts
import { describe, it, expect } from "vitest";
import { buildQuestionBlock } from "@/lib/aulas/generateParse";

describe("buildQuestionBlock games", () => {
  it("flashcards: normaliza os cards", () => {
    const b = buildQuestionBlock(JSON.stringify({ config: { cards: [{ front: "Brasil", back: "Brasília" }] } }), "flashcards");
    expect(b).toMatchObject({ type: "flashcards", config: { cards: [{ front: "Brasil", back: "Brasília" }] } });
  });
  it("flashcards sem cards → null", () => {
    expect(buildQuestionBlock(JSON.stringify({ config: { cards: [] } }), "flashcards")).toBeNull();
  });
  it("memória: normaliza os pares (mín. 2)", () => {
    const b = buildQuestionBlock(JSON.stringify({ config: { pairs: [{ a: "gato", b: "cat" }, { a: "cão", b: "dog" }] } }), "game-memory");
    expect(b).toMatchObject({ type: "memory", config: { pairs: [{ a: "gato", b: "cat" }, { a: "cão", b: "dog" }] } });
  });
  it("memória com 1 par → null", () => {
    expect(buildQuestionBlock(JSON.stringify({ config: { pairs: [{ a: "x", b: "y" }] } }), "game-memory")).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar — falha** (retornam null hoje).

- [ ] **Step 3: Implementar** — em `lib/aulas/generateParse.ts`:
No type `ParsedBlock`, alargar `config` p/ incluir cards/pairs:
```ts
  config?: { pool?: { text: string; type: "choice" | "input"; options?: QuizOption[]; accepted: string[] }[]; rounds?: number; text?: string; sentence?: string; words?: string[]; cards?: { front: string; back: string }[]; pairs?: { a: string; b: string }[] };
```
Em `buildQuestionBlock`, ANTES do `return null` final, adicionar:
```ts
  if (kind === "flashcards") {
    const raw2 = parsed.config?.cards ?? parsed.cards;
    const cards = Array.isArray(raw2) ? raw2
      .map((c: any) => ({ front: String(c?.front ?? "").slice(0, 300), back: String(c?.back ?? "").slice(0, 300) }))
      .filter((c: any) => c.front.trim() || c.back.trim()) : [];
    if (cards.length < 1) return null;
    return { type: "flashcards", text: String(parsed.title || "Cards de revisão").slice(0, 200), marks, accepted: [], config: { cards } };
  }
  if (kind === "game-memory") {
    const raw2 = parsed.config?.pairs ?? parsed.pairs;
    const pairs = Array.isArray(raw2) ? raw2
      .map((p: any) => ({ a: String(p?.a ?? "").slice(0, 120), b: String(p?.b ?? "").slice(0, 120) }))
      .filter((p: any) => p.a.trim() && p.b.trim()) : [];
    if (pairs.length < 2) return null;
    return { type: "memory", text: String(parsed.title || "Jogo da memória").slice(0, 200), marks, accepted: [], config: { pairs } };
  }
```

- [ ] **Step 4: Rodar — passa.** **Step 5: tsc + commit** (`feat(aula): geração por IA de flashcards/memória`).

---

### Task 3: Server plumbing — persistir, sanitizar, blank, tipos

**Files:** Modify `app/api/aulas/route.ts`, `app/api/aulas/[id]/route.ts`, `components/aulas/AulaQuestionsPanel.tsx`, `components/aulas/types.ts`

- [ ] **Step 1: POST aceita os tipos** — em `app/api/aulas/route.ts`, no `QT`:
```ts
    const QT = new Set(["choice", "input", "open", "voice", "roulette", "cloze", "dragwords", "flashcards", "memory"]);
```

- [ ] **Step 2: `blank()` p/ os kinds** — em `components/aulas/AulaQuestionsPanel.tsx`, em `blank(kind)`, antes do `return base`:
```ts
  if (kind === "flashcards") { base.type = "flashcards"; base.config = { cards: [{ front: "", back: "" }] }; }
  if (kind === "game-memory") { base.type = "memory"; base.config = { pairs: [{ a: "", b: "" }, { a: "", b: "" }] }; }
```
E alargar `AuthQ.config`:
```ts
  config?: { pool?: AuthPoolQ[]; rounds?: number; text?: string; sentence?: string; words?: string[]; cards?: { front: string; back: string }[]; pairs?: { a: string; b: string }[] };
```

- [ ] **Step 3: `stripConfig` repassa cards/pairs** — em `app/api/aulas/[id]/route.ts`, no `stripConfig`, logo após o branch fill (que retorna parts/bank), antes do branch da roleta:
```ts
  if (Array.isArray(config.cards)) return { cards: config.cards.map((c: any) => ({ front: String(c?.front ?? ""), back: String(c?.back ?? "") })) };
  if (Array.isArray(config.pairs)) return { pairs: config.pairs.map((p: any) => ({ a: String(p?.a ?? ""), b: String(p?.b ?? "") })) };
```
(flashcards/memória não têm gabarito escondido — repassa direto.)

- [ ] **Step 4: tipos do aluno** — em `components/aulas/types.ts`, no `Question`:
```ts
  type: "choice" | "input" | "open" | "voice" | "roulette" | "cloze" | "dragwords" | "flashcards" | "memory";
```
e no `config` (dentro do objeto já existente), adicionar:
```ts
    cards?: { front: string; back: string }[];
    pairs?: { a: string; b: string }[];
```

- [ ] **Step 5: tsc + commit** (`feat(aula): persistência/sanitização/tipos de flashcards e memória`). `npx tsc --noEmit` = 5.

---

### Task 4: Reuso do FlipCard + editores

**Files:** Modify `components/studio/StudioArtifactViews.tsx` (exportar `FlipCard`); Modify `components/aulas/QuestionEditor.tsx`

- [ ] **Step 1: Exportar FlipCard** — em `components/studio/StudioArtifactViews.tsx`, trocar `function FlipCard(` por `export function FlipCard(`.

- [ ] **Step 2: Editores** — em `components/aulas/QuestionEditor.tsx`, após o bloco `q.type === "dragwords"`, adicionar:
```tsx
      {q.type === "flashcards" && (
        <div className="flex flex-col gap-1.5">
          {(q.config?.cards || []).map((c, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input value={c.front} onChange={(e) => onSet({ config: { ...(q.config || {}), cards: (q.config?.cards || []).map((x, j) => j === i ? { ...x, front: e.target.value } : x) } })}
                placeholder="Frente" className="flex-1 rounded-md bg-white/5 border border-white/10 px-2 py-1 text-[12.5px] text-white focus:outline-none focus:border-cyan-400/50" />
              <input value={c.back} onChange={(e) => onSet({ config: { ...(q.config || {}), cards: (q.config?.cards || []).map((x, j) => j === i ? { ...x, back: e.target.value } : x) } })}
                placeholder="Verso" className="flex-1 rounded-md bg-white/5 border border-white/10 px-2 py-1 text-[12.5px] text-white focus:outline-none focus:border-cyan-400/50" />
              {(q.config?.cards || []).length > 1 && <button onClick={() => onSet({ config: { ...(q.config || {}), cards: (q.config?.cards || []).filter((_, j) => j !== i) } })} className="text-white/30 hover:text-rose-400"><Trash2 size={12} /></button>}
            </div>
          ))}
          <button onClick={() => onSet({ config: { ...(q.config || {}), cards: [...(q.config?.cards || []), { front: "", back: "" }] } })} className="self-start text-[11px] text-cyan-300/80 hover:text-cyan-200 inline-flex items-center gap-1"><Plus size={11} /> card</button>
        </div>
      )}
      {q.type === "memory" && (
        <div className="flex flex-col gap-1.5">
          {(q.config?.pairs || []).map((p, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input value={p.a} onChange={(e) => onSet({ config: { ...(q.config || {}), pairs: (q.config?.pairs || []).map((x, j) => j === i ? { ...x, a: e.target.value } : x) } })}
                placeholder="Termo" className="flex-1 rounded-md bg-white/5 border border-white/10 px-2 py-1 text-[12.5px] text-white focus:outline-none focus:border-cyan-400/50" />
              <span className="text-white/30 text-[12px]">↔</span>
              <input value={p.b} onChange={(e) => onSet({ config: { ...(q.config || {}), pairs: (q.config?.pairs || []).map((x, j) => j === i ? { ...x, b: e.target.value } : x) } })}
                placeholder="Par" className="flex-1 rounded-md bg-white/5 border border-white/10 px-2 py-1 text-[12.5px] text-white focus:outline-none focus:border-cyan-400/50" />
              {(q.config?.pairs || []).length > 2 && <button onClick={() => onSet({ config: { ...(q.config || {}), pairs: (q.config?.pairs || []).filter((_, j) => j !== i) } })} className="text-white/30 hover:text-rose-400"><Trash2 size={12} /></button>}
            </div>
          ))}
          <button onClick={() => onSet({ config: { ...(q.config || {}), pairs: [...(q.config?.pairs || []), { a: "", b: "" }] } })} className="self-start text-[11px] text-cyan-300/80 hover:text-cyan-200 inline-flex items-center gap-1"><Plus size={11} /> par</button>
        </div>
      )}
```
(`Trash2`/`Plus` já importados no QuestionEditor.)

- [ ] **Step 3: tsc + commit** (`feat(aula): exporta FlipCard + editores de flashcards/memória`).

---

### Task 5: Render do aluno — FlashcardsPlay + MemoryGame + suprimir nota

**Files:** Modify `components/aulas/StudentAulasModule.tsx`

- [ ] **Step 1: imports** — no topo: `import { FlipCard } from "@/components/studio/StudioArtifactViews"; import { buildMemoryDeck, isMatch } from "@/lib/aulas/memoryDeck";` e garantir `useMemo` no import do react (`import { useCallback, useEffect, useMemo, useRef, useState } from "react";`).

- [ ] **Step 2: dispatch** — em `QuestionView`, após o ramo cloze/dragwords (`FillBlanksView`), adicionar:
```tsx
      {q.type === "flashcards" && <FlashcardsPlay q={q} />}
      {q.type === "memory" && <MemoryGame q={q} />}
```

- [ ] **Step 3: suprimir nota** — trocar a abertura do bloco de feedback `{graded && (` por:
```tsx
      {graded && q.type !== "flashcards" && q.type !== "memory" && (
```

- [ ] **Step 4: componentes** — perto de `FillBlanksView`, adicionar:
```tsx
function FlashcardsPlay({ q }: { q: Question }) {
  const cards = q.config?.cards || [];
  if (!cards.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {cards.map((c, i) => <FlipCard key={i} front={c.front} back={c.back} />)}
    </div>
  );
}

function MemoryGame({ q }: { q: Question }) {
  const pairs = q.config?.pairs || [];
  const deck = useMemo(() => buildMemoryDeck(pairs, q.id || "seed"), [pairs, q.id]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const onFlip = (idx: number) => {
    if (flipped.includes(idx) || matched.has(deck[idx].id) || flipped.length === 2) return;
    const next = [...flipped, idx];
    setFlipped(next);
    if (next.length === 2) {
      const a = deck[next[0]], b = deck[next[1]];
      if (isMatch(a, b)) { setMatched((m) => new Set([...m, a.id, b.id])); setTimeout(() => setFlipped([]), 450); }
      else setTimeout(() => setFlipped([]), 900);
    }
  };
  const done = deck.length > 0 && matched.size === deck.length;
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {deck.map((c, i) => {
          const show = flipped.includes(i) || matched.has(c.id);
          return (
            <button key={c.id} type="button" onClick={() => onFlip(i)}
              className={`aspect-[4/3] rounded-lg border text-[12px] px-1 flex items-center justify-center text-center transition-colors ${matched.has(c.id) ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-100" : show ? "border-cyan-400/50 bg-cyan-500/10 text-white" : "border-white/10 bg-white/[0.04] text-transparent hover:border-cyan-400/30"}`}>
              {show ? c.text : "?"}
            </button>
          );
        })}
      </div>
      {done && <p className="text-[12px] font-bold text-emerald-300">Memória completa! 🎉</p>}
    </div>
  );
}
```

- [ ] **Step 5: tsc + commit** (`feat(aula): aluno joga flashcards e memória (sem nota)`).

---

### Task 6: ready:true + testes de registro + verificação final

**Files:** Modify `lib/aulas/blockTypes.ts`, `lib/aulas/studioAulas.test.ts`, `lib/aulas/aulaSlash.test.ts`

- [ ] **Step 1: ready** — em `lib/aulas/blockTypes.ts`, nas entradas `flashcards` e `game-memory`, trocar `ready: false` por `ready: true`.

- [ ] **Step 2: atualizar testes de registro** — agora 8 ready, 1 scaffold (só `branching`):
Em `lib/aulas/studioAulas.test.ts`:
```ts
  it("has the ready types (perguntas + cloze/dragwords + flashcards/memória)", () => {
    expect(READY_BLOCKS.map((b) => b.kind).sort()).toEqual(["flashcards", "game-memory", "q-choice", "q-cloze", "q-dragwords", "q-roulette", "q-voice", "q-written"]);
  });
  it("só o cenário ramificado segue scaffold", () => {
    expect(AULA_BLOCKS.filter((b) => !b.ready).map((b) => b.kind)).toEqual(["branching"]);
  });
```
Em `lib/aulas/aulaSlash.test.ts`, trocar os `toHaveLength(6)` por `toHaveLength(8)` e o `.sort()` esperado por:
```ts
    expect(AULA_SLASH_OPTIONS.map((o) => o.key).sort()).toEqual(["flashcards", "game-memory", "q-choice", "q-cloze", "q-dragwords", "q-roulette", "q-voice", "q-written"]);
```
(o teste "filtra" tem `filterAulaSlash("")` → ajustar p/ `toHaveLength(8)`.)

- [ ] **Step 3: Verificação final**
- `npx tsc --noEmit` → 5.
- `node_modules/.bin/vitest run` → tudo verde.
- Smoke: inserir 🃏/🧠 pelo "/" e dock; editar; gerar por IA; como aluno virar os flashcards e jogar a memória (parear até completar); enviar a aula — flashcards/memória **não** mostram nota nem mudam a %.

- [ ] **Step 4: Commit** (`feat(aula): habilita flashcards e memória (ready) — fatia 2b completa`).

---

## Self-Review (cobertura do spec)

- §4 deck puro (buildMemoryDeck/isMatch) → Task 1 ✓
- §4 dados flashcards/memória + geração → Task 2 ✓
- §5 sem mudança em grade; suprimir feedback → Task 5 Step 3 ✓
- §6 stripConfig repassa cards/pairs → Task 3 Step 3 ✓
- §7 unidades 1-10 → Tasks 1-6 ✓
- §9 testes (deck, buildQuestionBlock, registro) → Tasks 1,2,6 ✓

**Diferido:** cenário ramificado (2c); painel de pontuação + feedback por-lacuna (fatia 3).
