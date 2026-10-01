import { describe, it, expect, vi } from "vitest";
import { esperarTurno } from "@/lib/chat/turnoRetomavel";

const resp = (status: number, turn?: any) => ({ ok: status >= 200 && status < 300, status, json: async () => ({ turn }) });
const seq = (...rs: any[]) => { const f = vi.fn(); rs.forEach((r) => (r instanceof Error ? f.mockRejectedValueOnce(r) : f.mockResolvedValueOnce(r))); return f; };
const sem = { sleep: async () => {} };

describe("esperarTurno", () => {
  it("queued → running → done: devolve parcial + wire e avisa o progresso no caminho", async () => {
    const onParcial = vi.fn();
    const r = await esperarTurno("t1", { ...sem, onParcial, fetch: seq(
      resp(200, { status: "queued", partial: "" }),
      resp(200, { status: "running", partial: "P1" }),
      resp(200, { status: "done", partial: "P1P2", wire: "@@STRUCTURED@@{}" }),
    ) });
    expect(r).toEqual({ tipo: "pronto", acumulado: "P1P2@@STRUCTURED@@{}" });
    expect(onParcial.mock.calls.map((c) => c[0])).toEqual(["", "P1"]);
  });
  it("erro do turno: mensagem amigável do servidor (ou padrão)", async () => {
    expect(await esperarTurno("t", { ...sem, fetch: seq(resp(200, { status: "error", erro: "Tenta de novo." })) })).toEqual({ tipo: "erro", mensagem: "Tenta de novo." });
    expect((await esperarTurno("t", { ...sem, fetch: seq(resp(200, { status: "error" })) }) as any).mensagem).toMatch(/Tenta de novo/);
  });
  it("404 (não existe ou não é seu) = sumiu, sem insistir", async () => {
    const f = seq(resp(404));
    expect(await esperarTurno("t", { ...sem, fetch: f })).toEqual({ tipo: "sumiu" });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("rede caindo/500 não desiste: tenta de novo com backoff até concluir", async () => {
    const sleep = vi.fn(async (_ms: number) => {});
    const r = await esperarTurno("t", { sleep, intervaloMs: 100, fetch: seq(new Error("offline"), resp(500), resp(200, { status: "done", partial: "", wire: "x" })) });
    expect(r.tipo).toBe("pronto");
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([200, 300]); // 1+falhas, até 4x
  });
  it("teto de tempo", async () => {
    let t = 0;
    const r = await esperarTurno("t", { sleep: async () => { t += 1000; }, agora: () => t, tetoMs: 2500, fetch: vi.fn().mockResolvedValue(resp(200, { status: "running", partial: "" })) });
    expect(r).toEqual({ tipo: "tempo_esgotado" });
  });
  it("cancelado (trocou de conversa/desmontou) para antes de pedir", async () => {
    const f = vi.fn();
    expect(await esperarTurno("t", { ...sem, fetch: f, cancelado: () => true })).toEqual({ tipo: "cancelado" });
    expect(f).not.toHaveBeenCalled();
  });
  it("done sem wire continua esperando (não devolve resposta vazia)", async () => {
    const r = await esperarTurno("t", { ...sem, fetch: seq(resp(200, { status: "done", partial: "", wire: null }), resp(200, { status: "done", partial: "", wire: "w" })) });
    expect(r).toEqual({ tipo: "pronto", acumulado: "w" });
  });
  it("id vai codificado na URL", async () => {
    const f = seq(resp(404));
    await esperarTurno("a/b?c", { ...sem, fetch: f });
    expect(f.mock.calls[0][0]).toBe("/api/ai/chat/turns/a%2Fb%3Fc");
  });
});
