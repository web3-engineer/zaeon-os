// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { carregarProgresso, chaveLocal, gravarLocal, lerLocal, salvarProgresso } from "./persistencia";
import { concluir, definir, lerConcluidas, reiniciar, sanearIds, topicoDoCurso } from "./progressoServidor";
import { arvoreNeuronalLigada } from "./flag";
import { noArvoreDoCurso, tipoDaFolha } from "./adaptadorCurso";
import type { CursoRepo } from "@/lib/forja/tipos";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "content-type": "application/json" } });
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("localStorage (reserva offline) — chave por userId + curso", () => {
  it("a chave separa usuário e curso", () => {
    expect(chaveLocal("u1", "pomodoro")).not.toBe(chaveLocal("u2", "pomodoro"));
    expect(chaveLocal("u1", "pomodoro")).not.toBe(chaveLocal("u1", "quiz"));
    gravarLocal("u1", "c", { concluidas: ["a"], pendente: false });
    expect(lerLocal("u1", "c")?.concluidas).toEqual(["a"]);
    expect(lerLocal("u2", "c")).toBeNull();
  });
  it("lixo no storage não quebra", () => {
    localStorage.setItem(chaveLocal("u1", "c"), "{nao é json");
    expect(lerLocal("u1", "c")).toBeNull();
  });
});

describe("carregar / salvar", () => {
  it("servidor manda: lê e guarda cópia local", async () => {
    const f = vi.fn(async () => json({ userId: "u1", concluidas: ["a", "b"] }));
    const r = await carregarProgresso("c", f);
    expect(r).toEqual({ userId: "u1", concluidas: ["a", "b"], fonte: "servidor" });
    expect(lerLocal("u1", "c")).toEqual({ concluidas: ["a", "b"], pendente: false });
  });
  it("sem rede: cai pro localStorage do último usuário", async () => {
    await carregarProgresso("c", vi.fn(async () => json({ userId: "u1", concluidas: ["a"] })));
    gravarLocal("u1", "c", { concluidas: ["a", "z"], pendente: true });
    const r = await carregarProgresso("c", vi.fn(async () => { throw new Error("offline"); }));
    expect(r).toEqual({ userId: "u1", concluidas: ["a", "z"], fonte: "local" });
  });
  it("salvar com servidor fora deixa pendente; a próxima carga sincroniza com 'definir'", async () => {
    const fora = vi.fn(async () => json({}, 503));
    expect(await salvarProgresso("u1", "c", ["a"], { op: "concluir", nos: ["a"] }, fora)).toBe(false);
    expect(lerLocal("u1", "c")).toEqual({ concluidas: ["a"], pendente: true });
    const chamadas: { url: string; body?: unknown }[] = [];
    const ok = vi.fn(async (url: string, init?: RequestInit) => {
      chamadas.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      return init?.method === "POST" ? json({ userId: "u1", concluidas: ["a"] }) : json({ userId: "u1", concluidas: [] });
    });
    const r = await carregarProgresso("c", ok);
    expect(chamadas[1]!.body).toEqual({ cursoId: "c", op: "definir", nos: ["a"] });
    expect(r.concluidas).toEqual(["a"]);
    expect(lerLocal("u1", "c")?.pendente).toBe(false);
  });
  it("salvar depois de uma falha manda o conjunto inteiro", async () => {
    gravarLocal("u1", "c", { concluidas: ["a"], pendente: true });
    const f = vi.fn(async (_u: string, _i?: RequestInit) => json({ concluidas: ["a", "b"] }));
    expect(await salvarProgresso("u1", "c", ["a", "b"], { op: "concluir", nos: ["b"] }, f)).toBe(true);
    expect(JSON.parse(String(f.mock.calls[0]![1]!.body))).toEqual({ cursoId: "c", op: "definir", nos: ["a", "b"] });
  });
});

describe("servidor (skill_progress, namespace curso:)", () => {
  const db = () => {
    const linhas: { userId: string; topicSlug: string; nodeId: string; status: string }[] = [];
    return {
      linhas,
      skillProgress: {
        findMany: vi.fn(async ({ where }: any) => linhas.filter((l) => l.userId === where.userId && l.topicSlug === where.topicSlug && l.status === where.status).map((l) => ({ nodeId: l.nodeId }))),
        upsert: vi.fn(async ({ where, create }: any) => {
          const k = where.userId_topicSlug_nodeId;
          const ex = linhas.find((l) => l.userId === k.userId && l.topicSlug === k.topicSlug && l.nodeId === k.nodeId);
          if (ex) ex.status = create.status; else linhas.push({ userId: create.userId, topicSlug: create.topicSlug, nodeId: create.nodeId, status: create.status });
        }),
        deleteMany: vi.fn(async ({ where }: any) => {
          for (let i = linhas.length - 1; i >= 0; i--) {
            const l = linhas[i]!;
            if (l.userId === where.userId && l.topicSlug === where.topicSlug && (!where.nodeId || !where.nodeId.notIn.includes(l.nodeId))) linhas.splice(i, 1);
          }
        }),
      },
    };
  };
  it("salva e relê por usuário + curso; A não vê o de B", async () => {
    const d = db();
    await concluir(d, "A", "pomodoro", ["n1", "n2"]);
    await concluir(d, "B", "pomodoro", ["n9"]);
    await concluir(d, "A", "quiz", ["q1"]);
    expect(await lerConcluidas(d, "A", "pomodoro")).toEqual(["n1", "n2"]);
    expect(await lerConcluidas(d, "B", "pomodoro")).toEqual(["n9"]);
    await reiniciar(d, "A", "pomodoro");
    expect(await lerConcluidas(d, "A", "pomodoro")).toEqual([]);
    expect(await lerConcluidas(d, "B", "pomodoro")).toEqual(["n9"]);
    expect(await lerConcluidas(d, "A", "quiz")).toEqual(["q1"]);
  });
  it("definir troca o conjunto", async () => {
    const d = db();
    await concluir(d, "A", "c", ["x", "y"]);
    await definir(d, "A", "c", ["y", "z"]);
    expect((await lerConcluidas(d, "A", "c")).sort()).toEqual(["y", "z"]);
  });
  it("namespace não colide com a skill-tree (que nunca tem ':') e status não é 'mastered'", async () => {
    expect(topicoDoCurso("pomodoro")).toBe("curso:pomodoro");
    const d = db();
    await concluir(d, "A", "c", ["x"]);
    expect(d.linhas[0]!.status).toBe("concluida");
  });
  it("sanearIds: só strings válidas, sem repetição, com teto", () => {
    expect(sanearIds(["a", "a", " b ", 3, null, "x".repeat(300), "<script>", "mod:0"])).toEqual(["a", "b", "mod:0"]);
    expect(sanearIds("a")).toEqual([]);
    expect(sanearIds(Array.from({ length: 900 }, (_, i) => "n" + i))).toHaveLength(500);
  });
});

describe("flag ARVORE_NEURONAL (runtime, ligada por padrão)", () => {
  it("padrão ligado; 0/false/off desligam", () => {
    expect(arvoreNeuronalLigada({})).toBe(true);
    expect(arvoreNeuronalLigada({ ARVORE_NEURONAL: "1" })).toBe(true);
    for (const v of ["0", "false", "OFF", " nao "]) expect(arvoreNeuronalLigada({ ARVORE_NEURONAL: v })).toBe(false);
  });
});

describe("adaptador do curso", () => {
  it("tipos e grau", () => {
    const curso = {
      repo: "o/r", modo: "curso", modulos: [], licoes: [], licencas: [],
      grafo: { nos: [{ id: "g1", tipo: "funcao", nome: "f", grau: 10 }, { id: "g2", tipo: "funcao", nome: "g", grau: 2 }], arestas: [] },
      arvore: { raiz: { id: "raiz", titulo: "Curso", resumo: "", desde: "basico", refs: [], filhos: [
        { id: "m1", titulo: "Mod", resumo: "", desde: "basico", refs: [], filhos: [
          { id: "s1", titulo: "S1", resumo: "", desde: "basico", refs: ["g1", "g2"], filhos: [] },
          { id: "s2", titulo: "S2", resumo: "", desde: "basico", refs: [], filhos: [] },
        ] },
      ] } },
    } as unknown as CursoRepo;
    const a = noArvoreDoCurso(curso, { s2: { estudo: "x", prova: [], sandbox: { linguagem: "python", inicial: "pass" } } as never }, "Título");
    expect(a.tipo).toBe("raiz");
    expect(a.titulo).toBe("Título");
    expect(a.filhos[0]!.tipo).toBe("modulo");
    expect(a.filhos[0]!.filhos[0]).toMatchObject({ id: "s1", tipo: "ideia", grau: 6 });
    expect(a.filhos[0]!.filhos[1]).toMatchObject({ id: "s2", tipo: "codigo" });
    expect(tipoDaFolha({ estudo: "", prova: [{} as never] } as never)).toBe("relacoes");
  });
});
