import { describe, it, expect, vi } from "vitest";
import { iniciarPesquisa, acompanharSessao, lerNdjsonScholar, progressoDaSessao } from "@/lib/scholar/scholarClient";
import { respostaStream, streamDe } from "@/lib/chat/test-utils";

const j = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const sem = { sleep: async () => {} };

describe("iniciarPesquisa", () => {
  const com = (r: Response) => vi.fn(async () => r) as any;
  it("401 / erro HTTP / 202 bg / json sem id / stream NDJSON", async () => {
    expect(await iniciarPesquisa({ prompt: "x", fetch: com(new Response("no", { status: 401 })) })).toEqual({ tipo: "unauthorized" });
    expect(await iniciarPesquisa({ prompt: "x", fetch: com(new Response("x", { status: 500 })) })).toEqual({ tipo: "http", status: 500 });
    expect(await iniciarPesquisa({ prompt: "x", fetch: com(j({ sessionId: "S1" }, 202)) })).toEqual({ tipo: "bg", sessionId: "S1" });
    expect(await iniciarPesquisa({ prompt: "x", fetch: com(j({})) })).toEqual({ tipo: "invalido" });
    expect((await iniciarPesquisa({ prompt: "x", fetch: com(respostaStream(["{}\n"])) })).tipo).toBe("stream");
  });
});

describe("acompanharSessao", () => {
  const sess = (status: string, events: any[] = [], extra: any = {}) => j({ session: { status, thread: { events, ...extra } } });
  it("progresso só quando o nº de eventos muda; done devolve a sessão", async () => {
    const onProgresso = vi.fn();
    const f = vi.fn()
      .mockResolvedValueOnce(sess("queued"))
      .mockResolvedValueOnce(sess("running", [{ type: "phase", phase: "planning", message: "Planejando" }]))
      .mockResolvedValueOnce(sess("running", [{ type: "phase", phase: "planning", message: "Planejando" }]))
      .mockResolvedValueOnce(sess("done", [{ type: "phase", phase: "planning" }, { type: "answer" }], { answer: "R" }));
    const r = await acompanharSessao("S1", { ...sem, fetch: f as any, onProgresso });
    expect(r.tipo).toBe("done");
    expect(onProgresso).toHaveBeenCalledTimes(3); // 0, 1, 2 eventos
    expect(onProgresso.mock.calls[1][0].phases).toEqual([{ phase: "planning", message: "Planejando" }]);
  });
  it("erro da sessão: usa thread.error, ou o padrão de quem chamou", async () => {
    expect(await acompanharSessao("S", { ...sem, fetch: vi.fn().mockResolvedValue(sess("error", [], { error: "pubmed fora" })) as any })).toEqual({ tipo: "erro", mensagem: "pubmed fora" });
    expect(await acompanharSessao("S", { ...sem, erroPadrao: "interrompida", fetch: vi.fn().mockResolvedValue(sess("error")) as any })).toEqual({ tipo: "erro", mensagem: "interrompida" });
  });
  it("dorme ANTES de ler; 1º atraso e intervalo configuráveis", async () => {
    const sleep = vi.fn(async (_ms: number) => {});
    const f = vi.fn().mockResolvedValueOnce(sess("running")).mockResolvedValueOnce(sess("done"));
    await acompanharSessao("S", { sleep, fetch: f as any, primeiroAtrasoMs: 2000, intervaloMs: 3000 });
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([2000, 3000]);
  });
  it("teto conta a partir de `desde`; rede oscilando não para; abort/cancelado param", async () => {
    let t = 0;
    const r = await acompanharSessao("S", { sleep: async () => { t += 1000; }, agora: () => t, desde: 0, tetoMs: 2500, fetch: vi.fn().mockRejectedValue(new Error("blip")) as any });
    expect(r).toEqual({ tipo: "tempo_esgotado" });
    const ab = Object.assign(new Error("x"), { name: "AbortError" });
    expect(await acompanharSessao("S", { ...sem, fetch: vi.fn().mockRejectedValue(ab) as any })).toEqual({ tipo: "cancelado" });
    expect(await acompanharSessao("S", { ...sem, cancelado: () => true, fetch: vi.fn() as any })).toEqual({ tipo: "cancelado" });
  });
});

describe("lerNdjsonScholar / progressoDaSessao", () => {
  it("linhas partidas entre chunks, linha final sem \\n e lixo ignorado", async () => {
    const evs: any[] = [];
    await lerNdjsonScholar(streamDe(['{"type":"phase","ph', 'ase":"a"}\nlixo\n\n{"type":"done"}']), (e) => evs.push(e));
    expect(evs).toEqual([{ type: "phase", phase: "a" }, { type: "done" }]);
  });
  it("sessão sem thread não quebra", () => {
    expect(progressoDaSessao(null)).toEqual({ phases: [], answer: undefined, nEventos: 0 });
  });
});
