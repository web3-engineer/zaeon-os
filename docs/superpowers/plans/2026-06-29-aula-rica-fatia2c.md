# Aula rica — Fatia 2c (cenário ramificado) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development ou executing-plans.

**Goal:** 🌿 cenário ramificado como bloco do canvas teach, ponta-a-ponta — jogo não avaliável (navegação por escolhas). Fecha os 5 jogos.

**Tech Stack:** Next.js, React, TS, Prisma+Mongo, vitest (`@/`), Tailwind.

## Global Constraints
- Worktree sobre 2b; entrega via Git Trees API sobre `feat/criacao-aula-rica-2c`. Nunca `git add -A`. `tsc` = 5 ao fim de cada task. Aditivo. PT.

---

### Task 1: `lib/aulas/branching.ts` — navegação pura (TDD)
**Files:** Create `lib/aulas/branching.ts` + `lib/aulas/branching.test.ts`
**Produces:** `type BranchNode = { id: string; content: string; choices: { label: string; nextId: string }[] }`; `startNodeId(nodes): string|null`; `findNode(nodes, id): BranchNode|null`; `nextNodeId(nodes, currentId, choiceIdx): string|null`.

- [ ] **Step 1: Teste (falha)** — `lib/aulas/branching.test.ts`
```ts
import { describe, it, expect } from "vitest";
import { startNodeId, findNode, nextNodeId } from "@/lib/aulas/branching";

const nodes = [
  { id: "a", content: "início", choices: [{ label: "ir b", nextId: "b" }, { label: "quebrado", nextId: "zzz" }] },
  { id: "b", content: "fim", choices: [] },
];
describe("branching nav", () => {
  it("startNodeId = primeiro nó", () => { expect(startNodeId(nodes)).toBe("a"); expect(startNodeId([])).toBeNull(); });
  it("findNode acha por id", () => { expect(findNode(nodes, "b")?.content).toBe("fim"); expect(findNode(nodes, "x")).toBeNull(); });
  it("nextNodeId segue escolha válida; inválida/inexistente → null", () => {
    expect(nextNodeId(nodes, "a", 0)).toBe("b");
    expect(nextNodeId(nodes, "a", 1)).toBeNull();   // nextId "zzz" não existe
    expect(nextNodeId(nodes, "a", 9)).toBeNull();   // escolha fora do range
    expect(nextNodeId(nodes, "x", 0)).toBeNull();   // nó atual inexistente
  });
});
```
- [ ] **Step 2: Falha.** **Step 3: Implementar**
```ts
/** Navegação do cenário ramificado (puro/testável). */
export type BranchNode = { id: string; content: string; choices: { label: string; nextId: string }[] };

export function startNodeId(nodes: BranchNode[]): string | null { return nodes[0]?.id ?? null; }
export function findNode(nodes: BranchNode[], id: string): BranchNode | null { return nodes.find((n) => n.id === id) ?? null; }
export function nextNodeId(nodes: BranchNode[], currentId: string, choiceIdx: number): string | null {
  const node = findNode(nodes, currentId);
  const nid = node?.choices?.[choiceIdx]?.nextId;
  return nid && findNode(nodes, nid) ? nid : null;
}
```
- [ ] **Step 4: Passa.** **Step 5: tsc + commit** (`feat(aula): navegação pura do cenário ramificado + testes`).

---

### Task 2: `buildQuestionBlock("branching")` (TDD)
**Files:** Modify `lib/aulas/generateParse.ts`; Test `lib/aulas/generateParse.branching.test.ts`

- [ ] **Step 1: Teste (falha)**
```ts
import { describe, it, expect } from "vitest";
import { buildQuestionBlock } from "@/lib/aulas/generateParse";
describe("buildQuestionBlock branching", () => {
  it("normaliza nós e escolhas", () => {
    const raw = JSON.stringify({ config: { nodes: [
      { id: "a", content: "início", choices: [{ label: "ir", nextId: "b" }] },
      { id: "b", content: "fim", choices: [] },
    ] } });
    const b = buildQuestionBlock(raw, "branching");
    expect(b).toMatchObject({ type: "branching" });
    expect((b as any).config.nodes).toHaveLength(2);
  });
  it("0 nós → null", () => { expect(buildQuestionBlock(JSON.stringify({ config: { nodes: [] } }), "branching")).toBeNull(); });
});
```
- [ ] **Step 2: Falha.** **Step 3: Implementar** — em `generateParse.ts`, alargar `ParsedBlock.config` com `nodes?: { id: string; content: string; choices: { label: string; nextId: string }[] }[]`; e antes do `return null` final:
```ts
  if (kind === "branching") {
    const raw2 = parsed.config?.nodes ?? parsed.nodes;
    const nodes = Array.isArray(raw2) ? raw2
      .map((n: any, i: number) => ({
        id: String(n?.id ?? "").trim() || `n${i + 1}`,
        content: String(n?.content ?? "").slice(0, 600),
        choices: Array.isArray(n?.choices) ? n.choices
          .map((c: any) => ({ label: String(c?.label ?? "").slice(0, 160), nextId: String(c?.nextId ?? "").trim() }))
          .filter((c: any) => c.label.trim()) : [],
      }))
      .filter((n: any) => n.content.trim()) : [];
    if (nodes.length < 1) return null;
    return { type: "branching", text: String(parsed.title || "Cenário ramificado").slice(0, 200), marks, accepted: [], config: { nodes } };
  }
```
- [ ] **Step 4: Passa.** **Step 5: tsc + commit** (`feat(aula): geração por IA do cenário ramificado`).

---

### Task 3: Server plumbing
**Files:** `app/api/aulas/route.ts`, `app/api/aulas/[id]/route.ts`, `components/aulas/AulaQuestionsPanel.tsx`, `components/aulas/types.ts`
- [ ] **Step 1: QT** — em `route.ts`: `const QT = new Set(["choice","input","open","voice","roulette","cloze","dragwords","flashcards","memory","branching"]);`
- [ ] **Step 2: blank + AuthQ.config** — em `AulaQuestionsPanel.tsx`, em `blank()` antes do `return base`: `if (kind === "branching") { base.type = "branching"; base.config = { nodes: [{ id: "n1", content: "", choices: [] }] }; }` e alargar `AuthQ.config` com `nodes?: { id: string; content: string; choices: { label: string; nextId: string }[] }[]`.
- [ ] **Step 3: stripConfig repassa nodes** — em `[id]/route.ts`, após o branch cards/pairs: `if (Array.isArray(config.nodes)) return { nodes: config.nodes };`
- [ ] **Step 4: types** — `Question.type` += `"branching"`; `config` += `nodes?: { id: string; content: string; choices: { label: string; nextId: string }[] }[]`.
- [ ] **Step 5: tsc + commit** (`feat(aula): persistência/sanitização/tipos do cenário ramificado`).

---

### Task 4: Editor + render do aluno
**Files:** `components/aulas/QuestionEditor.tsx`, `components/aulas/StudentAulasModule.tsx`
- [ ] **Step 1: Editor** — em `QuestionEditor.tsx`, após o bloco `memory`, adicionar (gera id de nó com `const nid = () => "n" + Math.random().toString(36).slice(2, 7);` definido no topo do componente, ou inline):
```tsx
      {q.type === "branching" && (
        <div className="flex flex-col gap-2">
          {(q.config?.nodes || []).map((n, ni) => (
            <div key={n.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-2 flex flex-col gap-1.5">
              <div className="flex items-center gap-2"><span className="text-[10px] font-black text-white/40">{n.id}{ni === 0 ? " (início)" : ""}</span>
                {(q.config?.nodes || []).length > 1 && <button onClick={() => onSet({ config: { ...(q.config || {}), nodes: (q.config?.nodes || []).filter((_, j) => j !== ni) } })} className="ml-auto text-white/30 hover:text-rose-400"><Trash2 size={12} /></button>}
              </div>
              <textarea value={n.content} onChange={(e) => onSet({ config: { ...(q.config || {}), nodes: (q.config?.nodes || []).map((x, j) => j === ni ? { ...x, content: e.target.value } : x) } })} rows={2}
                placeholder="Texto do nó…" className="w-full rounded-md bg-white/5 border border-white/10 px-2 py-1 text-[12.5px] text-white resize-none focus:outline-none focus:border-cyan-400/50" />
              {n.choices.map((c, ci) => (
                <div key={ci} className="flex items-center gap-1.5 pl-2">
                  <input value={c.label} onChange={(e) => onSet({ config: { ...(q.config || {}), nodes: (q.config?.nodes || []).map((x, j) => j === ni ? { ...x, choices: x.choices.map((y, k) => k === ci ? { ...y, label: e.target.value } : y) } : x) } })}
                    placeholder="Escolha" className="flex-1 rounded-md bg-white/5 border border-white/10 px-2 py-1 text-[12px] text-white focus:outline-none focus:border-cyan-400/50" />
                  <span className="text-white/30 text-[11px]">→</span>
                  <select value={c.nextId} onChange={(e) => onSet({ config: { ...(q.config || {}), nodes: (q.config?.nodes || []).map((x, j) => j === ni ? { ...x, choices: x.choices.map((y, k) => k === ci ? { ...y, nextId: e.target.value } : y) } : x) } })}
                    className="rounded-md bg-white/5 border border-white/10 px-1.5 py-1 text-[12px] text-white focus:outline-none">
                    <option value="">(fim)</option>
                    {(q.config?.nodes || []).map((d) => <option key={d.id} value={d.id}>{d.id}</option>)}
                  </select>
                  <button onClick={() => onSet({ config: { ...(q.config || {}), nodes: (q.config?.nodes || []).map((x, j) => j === ni ? { ...x, choices: x.choices.filter((_, k) => k !== ci) } : x) } })} className="text-white/30 hover:text-rose-400"><Trash2 size={11} /></button>
                </div>
              ))}
              <button onClick={() => onSet({ config: { ...(q.config || {}), nodes: (q.config?.nodes || []).map((x, j) => j === ni ? { ...x, choices: [...x.choices, { label: "", nextId: "" }] } : x) } })} className="self-start text-[11px] text-cyan-300/80 hover:text-cyan-200 pl-2">+ escolha</button>
            </div>
          ))}
          <button onClick={() => { const id = "n" + Math.random().toString(36).slice(2, 7); onSet({ config: { ...(q.config || {}), nodes: [...(q.config?.nodes || []), { id, content: "", choices: [] }] } }); }} className="self-start text-[11px] text-cyan-300/80 hover:text-cyan-200 inline-flex items-center gap-1"><Plus size={11} /> nó</button>
        </div>
      )}
```
- [ ] **Step 2: Render do aluno** — em `StudentAulasModule.tsx`: importar `import { startNodeId, findNode, nextNodeId } from "@/lib/aulas/branching";`; no dispatch após `memory`: `{q.type === "branching" && <BranchingPlay q={q} />}`; incluir `branching` na supressão da nota (`q.type !== "branching"`); e adicionar o componente:
```tsx
function BranchingPlay({ q }: { q: Question }) {
  const nodes = q.config?.nodes || [];
  const [cur, setCur] = useState<string | null>(startNodeId(nodes));
  const node = cur ? findNode(nodes, cur) : null;
  if (!node) return <p className="text-[12px] text-white/40 italic">Cenário vazio.</p>;
  const open = node.choices.filter((c) => findNode(nodes, c.nextId));
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-white/85 leading-relaxed whitespace-pre-wrap">{node.content}</p>
      {open.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {node.choices.map((c, i) => findNode(nodes, c.nextId) ? (
            <button key={i} type="button" onClick={() => setCur(nextNodeId(nodes, node.id, i))}
              className="text-left rounded-lg border border-cyan-400/30 bg-cyan-500/5 hover:bg-cyan-500/15 px-3 py-2 text-[12.5px] text-white transition-colors">{c.label || "(continuar)"}</button>
          ) : null)}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-emerald-300">Fim do cenário 🌿</span>
          <button type="button" onClick={() => setCur(startNodeId(nodes))} className="text-[11px] text-cyan-300/80 hover:text-cyan-200 underline">recomeçar</button>
        </div>
      )}
    </div>
  );
}
```
- [ ] **Step 3: tsc + commit** (`feat(aula): editor + navegação do aluno do cenário ramificado`).

---

### Task 5: ready + testes + verificação final
**Files:** `lib/aulas/blockTypes.ts`, `lib/aulas/studioAulas.test.ts`, `lib/aulas/aulaSlash.test.ts`
- [ ] **Step 1: ready** — em `blockTypes.ts`, na entrada `branching`, `ready: false` → `ready: true`.
- [ ] **Step 2: testes de registro** — agora **9 ready, 0 scaffold**:
`studioAulas.test.ts`:
```ts
  it("todos os 9 tipos estão ready", () => {
    expect(READY_BLOCKS.map((b) => b.kind).sort()).toEqual(["branching", "flashcards", "game-memory", "q-choice", "q-cloze", "q-dragwords", "q-roulette", "q-voice", "q-written"]);
  });
  it("não há mais scaffold", () => {
    expect(AULA_BLOCKS.filter((b) => !b.ready)).toEqual([]);
  });
```
`aulaSlash.test.ts`: `toHaveLength(8)` → `toHaveLength(9)` (2 lugares) e o array esperado += `"branching"` (sort: branching primeiro).
- [ ] **Step 3: Verificação** — `tsc` = 5; `vitest run` verde; smoke: inserir 🌿, montar nós, gerar IA, navegar como aluno, recomeçar, sem nota.
- [ ] **Step 4: Commit** (`feat(aula): habilita cenário ramificado (ready) — 5 jogos completos`).

## Self-Review
- §5 nav pura → T1 ✓ · §7.2 IA → T2 ✓ · §7.3-6 server → T3 ✓ · §7.7-8 editor/render → T4 ✓ · §7.9 ready+testes → T5 ✓ · §6 suprime nota → T4 ✓
