import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  deps: null as any, onStepOpts: null as any, traj: vi.fn(), resolve: vi.fn(),
  markRunning: vi.fn(), saveDone: vi.fn(), saveError: vi.fn(),
  wake: vi.fn(), write: vi.fn(), bussola: vi.fn(), fixar: vi.fn(),
  tccCtx: vi.fn(), tccTurno: vi.fn(), uso: vi.fn(), base: vi.fn(),
}));
vi.mock("@/lib/agent/aura-harness", () => ({
  buildHarnessDeps: (ctx: any, opts: any) => { h.onStepOpts = opts; h.deps = { ctx }; return h.deps; },
  resolveHarnessOutput: h.resolve,
}));
vi.mock("@/lib/agent/trajectory", () => ({ runTrajectoryTraced: h.traj }));
vi.mock("@/lib/agent/memory-provider", () => ({ wakeUpContext: h.wake, writeTurnMemory: h.write }));
vi.mock("@/lib/agent/chat-turn-store", () => ({ markRunning: h.markRunning, saveDone: h.saveDone, saveError: h.saveError }));
vi.mock("@/lib/map/memoria-turno", () => ({ bussolaParaTurno: h.bussola, fixarTurno: h.fixar }));
vi.mock("@/lib/tcc/turno", () => ({ tccContextoParaTurno: h.tccCtx, tccDoTurno: h.tccTurno }));
vi.mock("@/lib/rag/turno", () => ({ baseParaTurno: h.base }));
vi.mock("@/lib/canal/usage", () => ({ registrarUso: h.uso }));
vi.mock("@/src/lib/prisma", () => ({ prisma: {} }));

import { runChatTurn } from "@/lib/agent/runChatTurn";
import { PROGRESS_SENTINEL } from "@/lib/agent/progresso";

const answer = { nucleo: "resposta" };
const out = { mode: "structured", answer };
const params = (x: any = {}) => ({ prompt: "o que é luz?", surface: "sala-de-estudos", userId: "u1", history: [{ role: "user", text: "oi" }], systemContext: "SYS", agentContext: { cartolinaScopeId: "t1" }, ...x });

beforeEach(() => {
  Object.values(h).forEach((f: any) => f?.mockReset?.());
  h.wake.mockResolvedValue("MEM"); h.bussola.mockResolvedValue("BUSSOLA");
  h.base.mockResolvedValue({ status: "ok", trechos: [] });
  h.tccCtx.mockResolvedValue(""); h.tccTurno.mockResolvedValue(null); h.uso.mockResolvedValue(true);
  for (const f of [h.markRunning, h.saveDone, h.saveError]) f.mockResolvedValue(undefined); // como o store real
  // a trajetória "narra" duas fases pelo onStep e devolve a resposta
  h.traj.mockImplementation(async () => {
    h.onStepOpts.onStep({ kind: "say", label: "Planejando", detail: "plan" });
    h.onStepOpts.onStep({ kind: "tool", label: "ignorado" });
    h.onStepOpts.onStep({ kind: "say", label: "Escrevendo", detail: "draft" });
    return { answer, state: { intent: "explicar_conceito" } };
  });
  h.resolve.mockReturnValue(out);
});

describe("runChatTurn", () => {
  it("emite as fases como @@PROGRESS@@ e devolve o HarnessOutput", async () => {
    const chunks: string[] = [];
    const r = await runChatTurn(null, params(), (c) => chunks.push(c));
    expect(r).toBe(out);
    const rotulos = chunks.map((c) => JSON.parse(c.slice(PROGRESS_SENTINEL.length)).rotulo);
    expect(rotulos).toEqual(["Retomando a conversa", "Planejando", "Escrevendo"]);
  });
  it("inline (turnId null): não toca o ChatTurn", async () => {
    await runChatTurn(null, params(), () => {});
    expect(h.markRunning).not.toHaveBeenCalled();
    expect(h.saveDone).not.toHaveBeenCalled();
  });
  it("com turnId: running → done, com answer e o progresso narrado", async () => {
    await runChatTurn("T1", params(), () => {});
    expect(h.markRunning).toHaveBeenCalledWith("T1");
    expect(h.saveDone.mock.calls[0][0]).toBe("T1");
    expect(h.saveDone.mock.calls[0][1]).toBe(out);
    expect(h.saveDone.mock.calls[0][2]).toContain("Escrevendo");
    expect(h.saveError).not.toHaveBeenCalled();
  });
  it("erro do harness: status=error com a mensagem crua, e relança pro chamador", async () => {
    h.traj.mockRejectedValue(new Error("vertex 404"));
    await expect(runChatTurn("T1", params(), () => {})).rejects.toThrow("vertex 404");
    expect(h.saveError).toHaveBeenCalledWith("T1", "vertex 404");
    expect(h.saveDone).not.toHaveBeenCalled();
  });
  it("contexto: systemContext + memória L3 + bússola da cartolina, nessa ordem", async () => {
    await runChatTurn(null, params(), () => {});
    expect(h.onStepOpts.systemContext).toBe("SYS\n\nMEM\n\nBUSSOLA");
    expect(h.bussola).toHaveBeenCalledWith("u1", "t1", expect.any(String)); // o prompt alimenta a recuperação de memória
    expect(h.onStepOpts.history).toEqual([{ role: "user", text: "oi" }]);
  });
  it("RAG F2: a base é consultada com o dono e o prompt, e o resultado chega em opts.baseConhecimento", async () => {
    const base = { status: "ok", trechos: [{ texto: "luz é onda" }] };
    h.base.mockResolvedValue(base);
    await runChatTurn(null, params(), () => {});
    expect(h.base).toHaveBeenCalledWith({ userId: "u1", pergunta: "o que é luz?" });
    expect(h.onStepOpts.baseConhecimento).toBe(base);
    expect(h.onStepOpts.systemContext).toBe("SYS\n\nMEM\n\nBUSSOLA"); // a base não entra no systemContext
  });
  it("RAG F2: a busca dispara ANTES de a memória L3 resolver (em paralelo, sem somar latência)", async () => {
    let soltar!: (v: string) => void;
    h.wake.mockReturnValue(new Promise<string>((r) => { soltar = r; }));
    const p = runChatTurn(null, params(), () => {});
    await vi.waitFor(() => expect(h.wake).toHaveBeenCalled());
    await vi.waitFor(() => expect(h.base).toHaveBeenCalled()); // wake ainda pendente
    soltar("MEM");
    await p;
    expect(h.onStepOpts.systemContext).toBe("SYS\n\nMEM\n\nBUSSOLA");
  });
  it("RAG F2: baseParaTurno rejeitando não derruba o turno — segue com baseConhecimento null", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      h.base.mockRejectedValue(new Error("pg fora"));
      const r = await runChatTurn(null, params(), () => {});
      expect(r).toBe(out);
      expect(h.onStepOpts.baseConhecimento).toBeNull();
      expect(erro).toHaveBeenCalledWith("[rag/chat] base do turno falhou:", "pg fora");
    } finally {
      erro.mockRestore();
    }
  });
  it("RAG F2: anônimo chama a base com userId null (o módulo responde sem_usuario)", async () => {
    h.base.mockResolvedValue({ status: "sem_usuario", trechos: [] });
    await runChatTurn(null, params({ userId: null }), () => {});
    expect(h.base).toHaveBeenCalledWith({ userId: null, pergunta: "o que é luz?" });
    expect(h.onStepOpts.baseConhecimento).toEqual({ status: "sem_usuario", trechos: [] });
  });
  it("o dono do turno vem do PARÂMETRO (o worker não tem sessão) e chega no ctx do harness", async () => {
    await runChatTurn(null, params({ userId: "u9" }), () => {});
    expect(h.deps.ctx.userId).toBe("u9");
    expect(h.wake.mock.calls[0][0].userId).toBe("u9");
  });
  it("anônimo: sem memória, sem 'Retomando', sem escrita de memória/cartolina", async () => {
    const chunks: string[] = [];
    await runChatTurn(null, params({ userId: null }), (c) => chunks.push(c));
    expect(h.wake).not.toHaveBeenCalled();
    expect(h.write).not.toHaveBeenCalled();
    expect(h.fixar).not.toHaveBeenCalled();
    expect(chunks.join("")).not.toContain("Retomando");
  });
  it("com dono: grava memória L3 e fixa os cards na cartolina (fire-and-forget)", async () => {
    await runChatTurn(null, params({ agentContext: { cartolinaScopeId: "t1", cartolinaMsgId: "m1", currentStudyId: "s1" } }), () => {});
    expect(h.write.mock.calls[0][0]).toMatchObject({ userId: "u1", scopeId: "s1", answer });
    expect(h.fixar.mock.calls[0][0]).toMatchObject({ userId: "u1", scopeId: "t1", msgId: "m1", answer });
  });
  it("TCC: contexto entra depois da bússola; turno que criou TCC troca o work pelo aviso `tcc` e a cartolina não recebe as seções", async () => {
    h.tccCtx.mockResolvedValue("TCC");
    await runChatTurn(null, params(), () => {});
    expect(h.onStepOpts.systemContext).toBe("SYS\n\nMEM\n\nBUSSOLA\n\nTCC");
    expect(h.tccCtx).toHaveBeenCalledWith("u1", "t1");

    const tcc = { workId: "w1", titulo: "TCC", criado: true, alteradas: 3 };
    const comWork = { mode: "structured", answer: { nucleo: "n", work: { kind: "tcc", sections: [] } } };
    h.resolve.mockReturnValue(comWork); h.tccTurno.mockResolvedValue(tcc);
    const r: any = await runChatTurn(null, params(), () => {});
    expect(r.answer).toEqual({ nucleo: "n", work: undefined, tcc });
    expect(h.fixar.mock.calls.at(-1)![0].answer.work).toBeUndefined();
  });
  it("uso: registra o agente (mentor ou aura) pro dono; anônimo não registra", async () => {
    await runChatTurn(null, params(), () => {});
    await runChatTurn(null, params({ mentor: { slug: "farmacia", wing: { kind: "agente", label: "x" } } }), () => {});
    await runChatTurn(null, params({ userId: null }), () => {});
    await new Promise((r) => setTimeout(r, 0));
    expect(h.uso.mock.calls.map((c) => [c[1], c[2]])).toEqual([["aura", "u1"], ["farmacia", "u1"]]);
  });
  it("canal de progresso quebrado não derruba o turno", async () => {
    const r = await runChatTurn(null, params(), () => { throw new Error("stream fechado"); });
    expect(r).toBe(out);
  });
  it("mentor: wing e slug chegam no ctx e na memória", async () => {
    const wing = { kind: "agente", label: "farmacia/u1" };
    await runChatTurn(null, params({ mentor: { slug: "farmacia", wing } }), () => {});
    expect(h.deps.ctx).toMatchObject({ mentor: "farmacia", wing: "farmacia/u1" });
    expect(h.write.mock.calls[0][0].wing).toBe(wing);
  });
});
