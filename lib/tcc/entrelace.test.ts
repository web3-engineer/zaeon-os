/**
 * O teste da COSTURA do cross-sala (mesmo espírito do lib/agent/progresso-fio.test.ts): o laço
 * REAL do harness → a ponte REAL do turno → o store REAL (Prisma em memória). Sem HTTP, sem
 * modelo. Prova a jornada inteira: "crie um TCC" na Sala de Estudos cria o work amarrado à
 * conversa; o turno seguinte edita por seção; a Sala de Pesquisa sugere; o aluno aceita; desfaz.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({ works: new Map<string, any>(), revs: new Map<string, any>(), seq: 0 }));
const oid = () => (++db.seq).toString(16).padStart(24, "0");
const ok = (row: any, where: any) => Object.entries(where ?? {}).every(([k, v]) => row[k] === v);
vi.mock("@/src/lib/prisma", () => ({
  prisma: {
    researchWork: {
      findUnique: async ({ where }: any) => structuredClone(db.works.get(where.id) ?? null),
      findFirst: async ({ where }: any) => structuredClone([...db.works.values()].find((w) => ok(w, where)) ?? null),
      create: async ({ data }: any) => { const r = { id: oid(), rev: 0, updatedAt: new Date(), ...data }; db.works.set(r.id, r); return structuredClone(r); },
      updateMany: async ({ where, data }: any) => {
        const ws = [...db.works.values()].filter((w) => ok(w, where)); ws.forEach((w) => Object.assign(w, data)); return { count: ws.length };
      },
    },
    tccRevisao: {
      createMany: async ({ data }: any) => { for (const d of data) { const id = oid(); db.revs.set(id, { id, createdAt: new Date(db.seq), status: "aplicada", ...d }); } return { count: data.length }; },
      create: async ({ data }: any) => { const id = oid(); const r = { id, createdAt: new Date(db.seq), ...data }; db.revs.set(id, r); return structuredClone(r); },
      findMany: async ({ where }: any) => structuredClone([...db.revs.values()].filter((r) => ok(r, where)).sort((a, b) => b.createdAt - a.createdAt)),
      findFirst: async ({ where }: any) => structuredClone([...db.revs.values()].find((r) => ok(r, where)) ?? null),
      updateMany: async ({ where, data }: any) => { const rs = [...db.revs.values()].filter((r) => ok(r, where)); rs.forEach((r) => Object.assign(r, data)); return { count: rs.length }; },
      update: async ({ where, data }: any) => Object.assign(db.revs.get(where.id), data),
    },
    cartolina: { findFirst: async () => null },
    cartolinaMembro: { findUnique: async () => null },
  },
}));
vi.mock("@/lib/agent/transcript", () => ({ resolveUserId: async () => null }));
vi.mock("@/src/lib/ratelimit", () => ({ guard: async () => ({ ok: true }) }));

import { runTrajectoryTraced, type HarnessDeps } from "@/lib/agent/trajectory";
import type { ExaminerVerdict, StructuredAnswer } from "@/lib/agent/contracts";
import { tccContextoParaTurno, tccDoTurno } from "@/lib/tcc/turno";
import { decidirSugestao, desfazerRevisao, getTccForUser, historicoDoTcc, sugerirNoTcc } from "@/lib/tcc/store";
import { lapidarComRigor } from "@/lib/tcc/rigor";

const U = "a".repeat(24);
const aprovado: ExaminerVerdict = { soundness: 8, contribution: 7, score: 9, decision: "aprovado", rubric: {}, evidenceLevel: 3, integrity: [], issues: [] };

/** deps do harness com o roteador e o rascunho que quisermos — o resto é o laço de verdade. */
const deps = (intent: "criar_trabalho" | "explicar_conceito", resposta: StructuredAnswer, kind?: "tcc" | "artigo"): HarnessDeps => ({
  classify: async () => ({ intent, mode: intent === "criar_trabalho" ? "research" : "elaborated", academicMode: "flexible", kind }),
  plan: async () => [],
  runTool: async () => ({ ok: true, findings: [], provenance: {} }),
  reason: async () => "",
  draft: async () => resposta,
  critique: async () => aprovado,
  emit: () => {},
  persistMemory: async () => {},
});

async function turno(prompt: string, intent: "criar_trabalho" | "explicar_conceito", resposta: StructuredAnswer, kind?: "tcc" | "artigo") {
  const k = kind ?? (intent === "criar_trabalho" ? "tcc" : undefined);
  const { answer, state } = await runTrajectoryTraced(prompt, { activeTab: "sala-de-estudos" }, deps(intent, resposta, k));
  return tccDoTurno({ userId: U, scopeId: "aba-7", surface: undefined, intent: state.intent, kind: state.kind, prompt, answer, gerar: () => {} });
}

beforeEach(() => { db.works.clear(); db.revs.clear(); db.seq = 0; process.env.TCC_CROSS = "1"; delete process.env.CARTOLINA_MEMORIA; });

describe("jornada do TCC cross-sala", () => {
  it("Estudos cria → Estudos edita por seção → Pesquisa sugere com fonte → aluno aceita → desfaz", async () => {
    // 1) "crie um TCC sobre X" na Sala de Estudos: o work nasce amarrado à conversa
    const t1 = await turno("crie um TCC sobre energia solar em escolas", "criar_trabalho", {
      nucleo: "Comecei seu TCC.",
      work: { kind: "tcc", sections: [{ title: "INTRODUÇÃO", body: "A energia solar…" }, { title: "METODOLOGIA", body: "Estudo de caso." }] },
    });
    expect(t1).toMatchObject({ criado: true, titulo: "Energia solar em escolas" });
    const row = db.works.get(t1!.workId);
    expect(row).toMatchObject({ userId: U, scopeId: "aba-7", workType: "TCC" });
    expect(row.secoes.map((s: any) => s.titulo)).toEqual(["INTRODUÇÃO", "METODOLOGIA"]);

    // 2) a Aura passa a SABER do TCC nos turnos seguintes
    expect(await tccContextoParaTurno(U, "aba-7")).toContain("Energia solar em escolas");

    // 3) turno seguinte devolve só a seção que muda → edição POR SEÇÃO (a intro não é tocada)
    const t2 = await turno("melhora a metodologia do meu tcc", "explicar_conceito", {
      nucleo: "Detalhei a metodologia.",
      work: { kind: "tcc", sections: [{ title: "Metodologia", body: "Estudo de caso em 3 escolas, com entrevistas." }] },
    });
    expect(t2).toMatchObject({ criado: false, alteradas: 1, workId: t1!.workId });
    let doc = (await getTccForUser(t1!.workId, U))!;
    expect(doc.secoes.map((s) => s.corpo)).toEqual(["A energia solar…", "Estudo de caso em 3 escolas, com entrevistas."]);

    // 4) Sala de Pesquisa: rigor → SUGESTÃO com fonte verificada; o documento NÃO muda
    const r = await lapidarComRigor({ titulo: doc.titulo, secoes: doc.secoes, pedido: "fundamente a introdução" }, {
      retrieve: async () => [{ id: "p", title: "Solar PV in schools", authors: ["Ana Costa"], year: 2022, openAccess: true, sources: ["openalex"] }],
      gen: async () => ({ resumo: "Fundamentei.", edicoes: [{ secaoId: "introducao", op: "anexar", corpo: "Escolas reduzem custos com PV.", fontes: [1], nota: "dado com fonte" }] }),
    });
    const s = await sugerirNoTcc(doc.id, U, r.sugestoes);
    if (!s.ok) throw new Error();
    expect(s.revisoes[0]).toMatchObject({ status: "sugerida", origem: "pesquisa" });
    expect((await getTccForUser(doc.id, U))!.secoes[0].corpo).toBe("A energia solar…");

    // 5) aceitar: aplica, cita no texto (ABNT autor-data) e leva a referência pra REFERÊNCIAS
    const d = await decidirSugestao(doc.id, s.revisoes[0].id, U, true);
    if (!d.ok) throw new Error(d.reason);
    doc = (await getTccForUser(doc.id, U))!;
    expect(doc.secoes[0].corpo).toBe("A energia solar…\n\nEscolas reduzem custos com PV. (COSTA, 2022).");
    expect(doc.secoes.at(-1)).toMatchObject({ titulo: "REFERÊNCIAS" });
    expect(doc.secoes.at(-1)!.corpo).toContain("COSTA, Ana. Solar PV in schools. 2022.");
    expect(doc.content).toContain("# REFERÊNCIAS");

    // 6) desfazer a sugestão aceita: a introdução volta ao que era
    const u = await desfazerRevisao(doc.id, s.revisoes[0].id, U);
    expect(u.ok && u.tcc.secoes[0].corpo).toBe("A energia solar…");
    const origens = (await historicoDoTcc(doc.id, U))!.map((h) => h.origem);
    expect(new Set(origens)).toEqual(new Set(["estudos", "pesquisa", "aluno"]));
  });

  it("pedir um ARTIGO na Sala de Estudos não cria TCC; conversa sem TCC não ganha bússola", async () => {
    const r = await turno("escreva um artigo sobre ética", "criar_trabalho", { nucleo: "ok", work: { kind: "artigo", sections: [{ title: "A", body: "b" }] } }, "artigo");
    expect(r).toBeNull();
    expect(db.works.size).toBe(0);
    expect(await tccContextoParaTurno(U, "aba-7")).toBe("");
  });
});
