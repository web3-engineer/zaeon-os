import { describe, it, expect, vi } from "vitest";
import { pedirAura, lerStreamAura, interpretarFinal, visivel, temPayload } from "@/lib/chat/auraClient";
import { respostaStream, streamDe } from "@/lib/chat/test-utils";
import { serializarProgresso } from "@/lib/agent/progresso";

const P = (r: string) => serializarProgresso({ fase: "plan", rotulo: r });
const S = '@@STRUCTURED@@{"nucleo":"Luz é onda"}';

describe("lerStreamAura", () => {
  it("separa progresso de conteúdo mesmo com sentinela partida entre chunks; fase só quando muda", async () => {
    const onFase = vi.fn(); const onLimpo = vi.fn();
    const full = P("Planejando") + P("Planejando") + P("Escrevendo") + "Olá";
    const corte = full.length - 20; // parte no meio de um evento
    const limpo = await lerStreamAura(streamDe([full.slice(0, corte), full.slice(corte)]), { onFase, onLimpo });
    expect(limpo).toBe("Olá");
    expect(onFase.mock.calls.map((c) => c[0])).toEqual(["Planejando", "Escrevendo"]);
    expect(onLimpo.mock.calls.every(([l]) => !String(l).includes("@@PROGRESS"))).toBe(true);
  });
});

describe("pedirAura", () => {
  const fetchCom = (r: Response | Error) => vi.fn(async () => { if (r instanceof Error) throw r; return r; }) as any;
  it("manda agent=aura + stream e devolve o texto limpo", async () => {
    const f = fetchCom(respostaStream([P("Planejando"), S]));
    const r = await pedirAura({ prompt: "luz?", history: [] }, { fetch: f });
    expect(r).toEqual({ ok: true, limpo: S, turnId: null });
    expect(JSON.parse(f.mock.calls[0][1].body)).toMatchObject({ agent: "aura", stream: true, prompt: "luz?" });
  });
  it("http != 2xx e rede caída viram resultado, nunca exceção", async () => {
    expect(await pedirAura({ prompt: "x" }, { fetch: fetchCom(new Response("no", { status: 500 })) })).toEqual({ ok: false, motivo: "http", status: 500 });
    expect(await pedirAura({ prompt: "x" }, { fetch: fetchCom(new Error("offline")) })).toEqual({ ok: false, motivo: "rede" });
  });
  it("modo BG: avisa o turnId; stream fechou sem payload → espera o turno no worker", async () => {
    const onTurnId = vi.fn(); const onFase = vi.fn();
    const esperar = vi.fn(async (_id: string, o: any) => { o.onParcial(P("Revisando")); return { tipo: "pronto", acumulado: P("x") + S } as const; });
    const r = await pedirAura({ prompt: "x" }, { fetch: fetchCom(respostaStream([P("Planejando")], { headers: { "X-Chat-Turn-Id": "T1" } })), onTurnId, onFase, esperar: esperar as any });
    expect(onTurnId).toHaveBeenCalledWith("T1");
    expect(esperar.mock.calls[0][0]).toBe("T1");
    expect(onFase).toHaveBeenLastCalledWith("Revisando");
    expect(r).toEqual({ ok: true, limpo: S, turnId: "T1" });
  });
  it("modo BG com payload no stream: não espera à toa", async () => {
    const esperar = vi.fn();
    await pedirAura({ prompt: "x" }, { fetch: fetchCom(respostaStream([S], { headers: { "X-Chat-Turn-Id": "T1" } })), esperar: esperar as any });
    expect(esperar).not.toHaveBeenCalled();
  });
  it("stream caiu no meio: sem turno = falha de rede; COM turno = recupera do worker", async () => {
    expect(await pedirAura({ prompt: "x" }, { fetch: fetchCom(respostaStream(["meio"], { erroNoFim: true })) })).toEqual({ ok: false, motivo: "rede" });
    const esperar = vi.fn(async () => ({ tipo: "pronto", acumulado: S }) as const);
    const r = await pedirAura({ prompt: "x" }, { fetch: fetchCom(respostaStream(["meio"], { erroNoFim: true, headers: { "X-Chat-Turn-Id": "T2" } })), esperar: esperar as any });
    expect(r).toEqual({ ok: true, limpo: S, turnId: "T2" });
  });
  it("turno terminou em erro: a mensagem amigável vira o texto", async () => {
    const esperar = vi.fn(async () => ({ tipo: "erro", mensagem: "Tenta de novo." }) as const);
    const r = await pedirAura({ prompt: "x" }, { fetch: fetchCom(respostaStream([], { headers: { "X-Chat-Turn-Id": "T" } })), esperar: esperar as any });
    expect(r).toMatchObject({ ok: true, limpo: "Tenta de novo." });
  });
});

describe("interpretarFinal / visivel / temPayload", () => {
  it("estruturada, ação do Studio, texto e vazio", () => {
    expect(interpretarFinal(S)).toEqual({ tipo: "estruturada", answer: { nucleo: "Luz é onda" } });
    expect(interpretarFinal('@@STUDIO_ACTION@@{"kind":"mindmap","topic":"luz","text":"Gerando"}')).toEqual({ tipo: "acao", kind: "mindmap", topic: "luz", text: "Gerando" });
    expect(interpretarFinal('@@STUDIO_ACTION@@{"kind":"mindmap"}', "pergunta")).toMatchObject({ topic: "pergunta", text: "Gerando o artefato…" });
    expect(interpretarFinal("@@STUDIO_ACTION@@{quebrado")).toEqual({ tipo: "texto", text: "Sem resposta agora." });
    expect(interpretarFinal("oi")).toEqual({ tipo: "texto", text: "oi" });
    expect(interpretarFinal("  ")).toEqual({ tipo: "texto", text: "Sem resposta agora." });
    expect(interpretarFinal('@@STRUCTURED@@{"nucleo":"cort').tipo).toBe("texto"); // JSON cortado degrada
  });
  it("visivel corta na primeira sentinela", () => {
    expect(visivel("antes" + S)).toBe("antes");
    expect(visivel("só texto")).toBe("só texto");
  });
  it("temPayload", () => {
    expect(temPayload("")).toBe(false);
    expect(temPayload("  ")).toBe(false);
    expect(temPayload("a")).toBe(true);
    expect(temPayload(S)).toBe(true);
  });
});
