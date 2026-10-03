import { describe, it, expect, vi, beforeEach } from "vitest";

const st = vi.hoisted(() => ({ find: vi.fn(), create: vi.fn(), patch: vi.fn() }));
vi.mock("@/lib/map/store", () => ({ findOwnMapa: st.find, createMapa: st.create, patchMapa: st.patch }));

import { generateMap, classificarTopico, backboneFallback, promptBackbone, type GenJson } from "@/lib/map/generateMap";
import { nosFromStructured } from "@/lib/map/grafo";
import { classificarHeuristica } from "@/lib/map/arquetipo";

const base = { ownerId: "u", surface: "estudos" as const, scopeId: "t1", topico: "análise de solo" };
const classif = { tipoTopico: "aplicavel", objetivo: "Comprovar a correção do pH do solo", modoValidacao: "humana", criterioCompletude: "Laudo" };
const plano = { passos: [{ label: "Fundamentos do solo", tipo: "conceito" }, { label: "Coletar amostras", tipo: "passo" }, { label: "Medir pH", tipo: "experimento" }, { label: "Laudo final", tipo: "entrega" }] };
const gen = (fn: (system: string) => unknown) => vi.fn(async (system: string) => fn(system)) as unknown as GenJson;
const mapaDe = (over: any = {}) => ({ id: "m1", nos: [], arestas: [], backbone: [], tipoTopico: "exploratorio", objetivo: "", modoValidacao: "nenhuma", criterioCompletude: "", ...over });

describe("classificarTopico", () => {
  it("modelo responde → usa o modelo; modelo falha/lixo → heurística; sem modelo → heurística", async () => {
    const ok = await classificarTopico("solo", undefined, gen(() => classif));
    expect(ok).toMatchObject({ tipoTopico: "aplicavel", fonte: "modelo", objetivo: classif.objetivo });
    const lixo = await classificarTopico("solo", undefined, gen(() => ({ tipoTopico: "nada" })));
    expect(lixo.fonte).toBe("heuristica");
    const falha = await classificarTopico("solo", undefined, (vi.fn(async () => { throw new Error("404"); }) as unknown as GenJson));
    expect(falha).toEqual(classificarHeuristica("solo"));
    expect((await classificarTopico("solo", undefined, null)).fonte).toBe("heuristica");
  });
});

describe("generateMap", () => {
  beforeEach(() => Object.values(st).forEach((f) => f.mockReset()));

  it("mapa novo: classifica (passo 0) + backbone → cria com arquétipo, objetivo, modo, critério e completudes", async () => {
    st.find.mockResolvedValue(null);
    st.create.mockImplementation(async (i: any) => mapaDe(i));
    const g = gen((s) => (s.includes("classificando") ? classif : plano));
    const r = await generateMap({ ...base, genJson: g });
    expect(r).toMatchObject({ criado: true, degraded: false, classificacao: { tipoTopico: "aplicavel", fonte: "modelo" } });
    const dados = st.create.mock.calls[0][0];
    expect(dados).toMatchObject({ ownerId: "u", scopeId: "t1", tipoTopico: "aplicavel", modoValidacao: "humana", objetivo: classif.objetivo });
    expect(dados.backbone).toHaveLength(4);
    expect(dados.nos.at(-1).tipo).toBe("experimento"); // o aplicável fecha em comprovação, não no "entrega" do modelo
    expect(r.mapa.completudeConclusao).toBe(0);
    expect(g).toHaveBeenCalledTimes(2);
  });

  it("idempotente por scopeId: mapa que já tem backbone não é regerado (sem chamar o modelo)", async () => {
    st.find.mockResolvedValue(mapaDe({ backbone: ["a", "b", "c"], tipoTopico: "aplicavel", modoValidacao: "humana" }));
    const g = gen(() => classif);
    const r = await generateMap({ ...base, genJson: g });
    expect(r).toMatchObject({ criado: false, regerado: false });
    expect(g).not.toHaveBeenCalled();
    expect(st.patch).not.toHaveBeenCalled();
  });

  it("mapa que os turnos já começaram (sem backbone): funde o plano reaproveitando o conceito estudado; `force` regera", async () => {
    const estudados = nosFromStructured({ nucleo: "n", conceitos: ["Fundamentos do solo"] } as any, "m1");
    const atual = mapaDe({ nos: estudados });
    st.find.mockResolvedValue(atual);
    st.patch.mockImplementation(async (_id: string, fn: any) => { const d = fn(atual); return { ok: true, mapa: { ...atual, ...d } }; });
    const r = await generateMap({ ...base, genJson: gen((s) => (s.includes("classificando") ? classif : plano)) });
    expect(r.criado).toBe(false);
    expect(r.mapa.backbone[0]).toBe(estudados[0]!.id);            // o conceito já estudado É o 1º passo
    expect(r.mapa.nos.filter((n) => n.planejado)).toHaveLength(3); // os outros 3 são planejados
    expect(r.mapa.nos).toHaveLength(4);
    expect(r.mapa.tipoTopico).toBe("aplicavel");
    expect(r.mapa.completudeAprendizado).toBe(0.25);
    // force sobre um mapa com backbone
    st.find.mockResolvedValue(mapaDe({ backbone: ["x", "y", "z"], nos: [] }));
    st.patch.mockImplementation(async (_id: string, fn: any) => { const a = mapaDe({ backbone: ["x", "y", "z"] }); const d = fn(a); return { ok: true, mapa: { ...a, ...d } }; });
    const f = await generateMap({ ...base, force: true, genJson: gen((s) => (s.includes("classificando") ? classif : plano)) });
    expect(f.regerado).toBe(true);
    expect(f.mapa.backbone).toHaveLength(4);
  });

  it("modelo fora do ar: heurística + backbone genérico do arquétipo (degraded) — nunca sem percurso", async () => {
    st.find.mockResolvedValue(null);
    st.create.mockImplementation(async (i: any) => mapaDe(i));
    const r = await generateMap({ ...base, genJson: (vi.fn(async () => { throw new Error("404"); }) as unknown as GenJson) });
    expect(r.degraded).toBe(true);
    expect(r.classificacao.tipoTopico).toBe("aplicavel");
    expect(r.mapa.backbone.length).toBeGreaterThanOrEqual(3);
    expect(r.mapa.nos.at(-1)!.tipo).toBe("experimento");
  });

  it("backbone do modelo inválido (2 passos) → fallback, classificação do modelo mantida", async () => {
    st.find.mockResolvedValue(null);
    st.create.mockImplementation(async (i: any) => mapaDe(i));
    const r = await generateMap({ ...base, genJson: gen((s) => (s.includes("classificando") ? classif : { passos: [{ label: "a" }, { label: "b" }] })) });
    expect(r.degraded).toBe(true);
    expect(r.classificacao.fonte).toBe("modelo");
  });

  it("patch com conflito persistente lança (o worker re-tenta o job)", async () => {
    st.find.mockResolvedValue(mapaDe());
    st.patch.mockResolvedValue({ ok: false, reason: "conflict" });
    await expect(generateMap({ ...base, genJson: null })).rejects.toThrow(/conflict/);
  });

  it("prompt do backbone leva o que já foi estudado; fallback fecha no nó certo por arquétipo", () => {
    expect(promptBackbone(classificarHeuristica("solo"), "solo", ["pH", "Nitrogênio"])).toMatch(/Já estudado.*pH; Nitrogênio/);
    expect(backboneFallback("habilidade", "piano").at(-1)!.tipo).toBe("entrega");
    expect(backboneFallback("conceitual", "kant").at(-1)!.tipo).toBe("conclusao");
  });
});
