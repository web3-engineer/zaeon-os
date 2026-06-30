# Aula rica — Fatia 3 (pontuação + feedback por-lacuna) — Implementation Plan

> REQUIRED SUB-SKILL: subagent-driven-development ou executing-plans.

**Goal:** Painel "Pontuação da aula" no envio (lista avaliáveis + total editável) e feedback verde/vermelho por-lacuna no cloze/dragwords. Fecha a tarefa.

## Global Constraints
Worktree sobre 2c; entrega via Git Trees API sobre `feat/criacao-aula-rica-3`. Nunca `git add -A`. `tsc`=5. Aditivo. PT.

---

### Task 1: `gradeBlanks` retorna `perBlank` (TDD)
**Files:** Modify `lib/aulas/fillBlanks.ts`, `lib/aulas/fillBlanks.test.ts`
- [ ] **Step 1: Ajustar testes** — em `fillBlanks.test.ts`, no bloco `gradeBlanks`, trocar os asserts por:
```ts
    expect(gradeBlanks(["Brasília", "Brasil"], ["brasilia", "Brasil"])).toEqual({ correct: 2, total: 2, perBlank: [true, true] });
    expect(gradeBlanks(["a", "b", "c"], ["a", "x", "c"])).toEqual({ correct: 2, total: 3, perBlank: [true, false, true] });
    expect(gradeBlanks(["a"], [null])).toEqual({ correct: 0, total: 1, perBlank: [false] });
```
- [ ] **Step 2: Rodar — falha.**
- [ ] **Step 3: Implementar** — em `fillBlanks.ts`, trocar `gradeBlanks`:
```ts
export function gradeBlanks(answers: string[], submitted: (string | null)[]): { correct: number; total: number; perBlank: boolean[] } {
  const perBlank: boolean[] = [];
  let correct = 0;
  for (let i = 0; i < answers.length; i++) {
    const s = normalize(submitted[i] ?? "");
    const ok = !!s && s === normalize(answers[i]);
    perBlank.push(ok);
    if (ok) correct++;
  }
  return { correct, total: answers.length, perBlank };
}
```
- [ ] **Step 4: Passa** (`vitest run lib/aulas/fillBlanks.test.ts lib/aulas/grade.cloze.test.ts`). **Step 5: tsc + commit** (`feat(aula): gradeBlanks expõe acerto por-lacuna`).

---

### Task 2: `grade.ts` grava `blanksCorrect` + tipos
**Files:** Modify `lib/aulas/grade.ts`, `components/aulas/types.ts`; Test `lib/aulas/grade.cloze.test.ts`
- [ ] **Step 1: Teste** — em `grade.cloze.test.ts`, adicionar:
```ts
  it("cloze grava blanksCorrect por-lacuna", () => {
    const q: GradeQuestion = { id: "c3", type: "cloze", marks: 2, config: { text: "*um* e *dois*" } };
    const r = gradeSubmission([q], [{ questionId: "c3", blanks: ["um", "x"] }], 70);
    expect((r.graded[0] as any).blanksCorrect).toEqual([true, false]);
  });
```
- [ ] **Step 2: Falha.**
- [ ] **Step 3: Implementar** — em `grade.ts`:
`GradedAnswer` += `blanksCorrect?: boolean[];`.
No `gradeSubmission`, declarar `let blanksCorrect: boolean[] | undefined;` junto de `earnedThis`; no ramo cloze/dragwords, ao calcular, capturar:
```ts
        const gb = gradeBlanks(model.answers, Array.isArray(a?.blanks) ? a!.blanks! : []);
        isCorrect = gb.correct === total;
        earnedThis = Math.round((marks * gb.correct) / total);
        blanksCorrect = gb.perBlank;
```
(substitui a linha `const { correct } = gradeBlanks(...)`). No `graded.push({...})`, adicionar `...(blanksCorrect ? { blanksCorrect } : {})`.
Em `components/aulas/types.ts`, `GradedAnswer` += `blanksCorrect?: boolean[];`.
- [ ] **Step 4: Passa.** **Step 5: tsc + commit** (`feat(aula): correção grava acerto por-lacuna (cloze/dragwords)`).

---

### Task 3: Feedback por-lacuna no aluno
**Files:** Modify `components/aulas/StudentAulasModule.tsx`
- [ ] **Step 1: widen graded em QuestionView** — onde `QuestionView` declara `graded?: { isCorrect: boolean; marksOutOf: number }`, trocar por `graded?: { isCorrect: boolean; marksOutOf: number; blanksCorrect?: boolean[] }`.
- [ ] **Step 2: passar graded ao FillBlanksView** — trocar `<FillBlanksView q={q} state={state} onChange={onChange} locked={locked} />` por `<FillBlanksView q={q} state={state} onChange={onChange} locked={locked} graded={graded} />`.
- [ ] **Step 3: FillBlanksView usa correct** — na assinatura de `FillBlanksView`, adicionar `graded` e passar ao WordDrag:
```tsx
function FillBlanksView({ q, state, onChange, locked, graded }: { q: Question; state: AnswerState; onChange: (p: AnswerState) => void; locked: boolean; graded?: { blanksCorrect?: boolean[] } }) {
```
e no `<WordDrag ... />` adicionar `correct={graded?.blanksCorrect}`.
- [ ] **Step 4: tsc + commit** (`feat(aula): aluno vê verde/vermelho por lacuna`).

---

### Task 4: Painel "Pontuação da aula" no envio
**Files:** Modify `components/study/MeusEstudosFeed.tsx`
- [ ] **Step 1: import** — adicionar `import { EVALUABLE_KINDS, aulaBlock } from "@/lib/aulas/blockTypes";` (se `aulaBlock` ainda não importado).
- [ ] **Step 2: seção no modal** — no modal de envio (onde está `<AulaQuestionsPanel ... />`), ANTES dele, inserir:
```tsx
              {(() => {
                const evalBlocks = feed.filter((it) => it.type === "aula-question" && EVALUABLE_KINDS.has(it.payload?.kind));
                if (!evalBlocks.length) return null;
                const total = evalBlocks.reduce((s, it) => s + (Number(it.payload?.marks) || 0), 0);
                return (
                  <div className="mb-3 rounded-2xl border border-white/12 bg-[#0a0f1c]/60 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-black uppercase tracking-[0.14em] text-white/60">Pontuação da aula</span>
                      <span className="ml-auto text-[11px] font-black text-cyan-300 bg-cyan-500/10 rounded-full px-2.5 py-0.5">{total} pt{total !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {evalBlocks.map((it) => (
                        <div key={it.id} className="flex items-center gap-2 text-[12.5px] text-white/80">
                          <span className="truncate">{aulaBlock(it.payload?.kind)?.emoji} {aulaBlock(it.payload?.kind)?.label} — <span className="text-white/50">{(it.payload?.text || "").slice(0, 40) || "sem enunciado"}</span></span>
                          <input type="number" min={0} max={20} value={Number(it.payload?.marks) || 0}
                            onChange={(e) => { const m = Math.max(0, Math.min(20, parseInt(e.target.value) || 0)); setItems((prev) => prev.map((x) => x.id === it.id ? { ...x, payload: { ...x.payload, marks: m } } : x)); persist(it.id); }}
                            className="ml-auto w-14 rounded-md bg-white/5 border border-white/10 px-1.5 py-0.5 text-[12px] text-white text-center focus:outline-none focus:border-cyan-400/50" />
                          <span className="text-[10px] text-white/40">pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
```
> Lê os blocos de pergunta avaliáveis do canvas; editar os pontos atualiza o bloco (setItems + persist). Jogos não avaliáveis não entram.
- [ ] **Step 3: tsc + commit** (`feat(aula): painel Pontuação da aula no envio (total + edição)`).

---

### Verificação final
- `tsc`=5; `vitest run` verde; smoke: pontos+total no envio (editar reflete); aluno vê verde/vermelho por lacuna.

## Self-Review
- §3a painel pontos → T4 ✓ · §3b perBlank→grade→aluno → T1,T2,T3 ✓ · §4 unidades 1-5 → T1-T4 ✓
