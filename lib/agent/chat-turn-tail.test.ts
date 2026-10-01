import { describe, it, expect, vi } from "vitest";
import { acompanharTurno } from "@/lib/agent/chat-turn-tail";
import { STRUCTURED_SENTINEL } from "@/lib/agent/chat-turn-wire";

const seq = (...ts: any[]) => { const f = vi.fn(); ts.forEach((t) => f.mockResolvedValueOnce(t)); return f; };
const base = { sleep: async () => {}, mensagemDeErro: (c: string) => `amigável(${c})` };

describe("acompanharTurno", () => {
  it("repassa só o que é NOVO do parcial e fecha com o payload do answer", async () => {
    const out: string[] = [];
    const r = await acompanharTurno({ ...base, emit: (c) => out.push(c), load: seq(
      { status: "queued", partial: "", answer: null, error: null },
      { status: "running", partial: "A", answer: null, error: null },
      { status: "running", partial: "AB", answer: null, error: null },
      { status: "done", partial: "ABC", answer: { mode: "structured", answer: { nucleo: "n" } }, error: null },
    ) });
    expect(r).toBe("done");
    expect(out).toEqual(["A", "B", "C", STRUCTURED_SENTINEL + '{"nucleo":"n"}']);
  });
  it("não repete o prefixo que o stream já mandou ('Acordando')", async () => {
    const out: string[] = [];
    await acompanharTurno({ ...base, prefixoJaEnviado: "ACORDAR|", emit: (c) => out.push(c), load: seq(
      { status: "running", partial: "ACORDAR|", answer: null, error: null },
      { status: "done", partial: "ACORDAR|fase", answer: { mode: "text", text: "oi" }, error: null },
    ) });
    expect(out).toEqual(["fase", "oi"]);
  });
  it("retentativa zerou o parcial: recomeça sem perder nem repetir", async () => {
    const out: string[] = [];
    await acompanharTurno({ ...base, emit: (c) => out.push(c), load: seq(
      { status: "running", partial: "XYZ", answer: null, error: null },
      { status: "running", partial: "", answer: null, error: null },
      { status: "done", partial: "Q", answer: { mode: "text", text: "." }, error: null },
    ) });
    expect(out).toEqual(["XYZ", "Q", "."]);
  });
  it("erro: mensagem amigável (nunca o erro cru)", async () => {
    const out: string[] = [];
    expect(await acompanharTurno({ ...base, emit: (c) => out.push(c), load: seq({ status: "error", partial: "", answer: null, error: "vertex 404 interno" }) })).toBe("error");
    expect(out).toEqual(["amigável(vertex 404 interno)"]);
  });
  it("answer corrompido no banco vira mensagem, não payload quebrado", async () => {
    const out: string[] = [];
    await acompanharTurno({ ...base, emit: (c) => out.push(c), load: seq({ status: "done", partial: "", answer: { lixo: 1 }, error: null }) });
    expect(out).toEqual(["amigável(invalid_output)"]);
  });
  it("turno sumiu (null) / cliente fechou / teto", async () => {
    expect(await acompanharTurno({ ...base, emit: () => {}, load: seq(null) })).toBe("sumiu");
    expect(await acompanharTurno({ ...base, emit: () => {}, load: vi.fn(), parar: () => true })).toBe("parado");
    let t = 0;
    expect(await acompanharTurno({ ...base, emit: () => {}, sleep: async () => { t += 500; }, agora: () => t, tetoMs: 1000, load: vi.fn().mockResolvedValue({ status: "running", partial: "", answer: null, error: null }) })).toBe("tempo_esgotado");
  });
  it("erro de leitura do banco é transitório: tenta de novo", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("blip")).mockResolvedValueOnce({ status: "done", partial: "", answer: { mode: "text", text: "ok" }, error: null });
    const out: string[] = [];
    expect(await acompanharTurno({ ...base, emit: (c) => out.push(c), load })).toBe("done");
    expect(out).toEqual(["ok"]);
  });
});
