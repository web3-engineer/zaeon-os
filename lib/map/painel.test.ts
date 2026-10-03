import { describe, it, expect, vi } from "vitest";
import { canalCerebro, mapaIdDeCanal, avisarTurno, avisarGerado } from "@/lib/map/realtime";
import { cerebroJobId, processCerebroJob, CEREBRO_JOB_OPTIONS } from "@/lib/map/queue";
import { estadoDaBolinha, ROTULO } from "@/lib/map/bolinha";

const trig = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock("@/lib/collab/realtime", () => ({ triggerSafe: trig.fn }));

describe("realtime do cérebro", () => {
  const id = "0123456789abcdef01234567";
  it("canal privado por mapa; parse rejeita lixo", () => {
    expect(canalCerebro(id)).toBe(`private-cerebro-${id}`);
    expect(mapaIdDeCanal(`private-cerebro-${id}`)).toBe(id);
    expect(mapaIdDeCanal("private-cerebro-zzz")).toBeNull();
    expect(mapaIdDeCanal(`presence-canal-${id}`)).toBeNull();
    expect(mapaIdDeCanal("")).toBeNull();
  });
  it("avisa só com mapaId válido", async () => {
    trig.fn.mockReset();
    await avisarTurno({ mapaId: "nope", novos: [], tocados: [] });
    expect(trig.fn).not.toHaveBeenCalled();
    await avisarTurno({ mapaId: id, novos: ["k_1"], tocados: [] });
    expect(trig.fn).toHaveBeenCalledWith(`private-cerebro-${id}`, "turno", expect.objectContaining({ novos: ["k_1"] }));
    await avisarGerado({ mapaId: id, backbone: ["a"], tipoTopico: "aplicavel", degraded: false });
    expect(trig.fn).toHaveBeenLastCalledWith(`private-cerebro-${id}`, "gerado", expect.objectContaining({ backbone: ["a"] }));
  });
});

describe("fila do cérebro", () => {
  it("jobId determinístico por conversa (duplo clique = 1 job); attempts=2", () => {
    expect(cerebroJobId("u1", "t a/b")).toBe("u1:t_a_b");
    expect(cerebroJobId("u1", "t1")).toBe(cerebroJobId("u1", "t1"));
    expect(CEREBRO_JOB_OPTIONS.attempts).toBe(2);
  });
  it("processCerebroJob: gera → liga a conversa → avisa; falha ao ligar não derruba", async () => {
    const generateMap = vi.fn(async (_i: any) => ({ mapa: { id: "m1", backbone: ["a", "b", "c"], tipoTopico: "conceitual" }, degraded: false }));
    const ligar = vi.fn(async () => { throw new Error("db"); });
    const avisar = vi.fn(async () => {});
    const r = await processCerebroJob({ userId: "u", surface: "estudos", scopeId: "t1", topico: "kant" }, { generateMap, ligarConversa: ligar, avisarGerado: avisar });
    expect(r).toEqual({ mapaId: "m1", degraded: false });
    expect(generateMap.mock.calls[0]![0]).toMatchObject({ ownerId: "u", scopeId: "t1", topico: "kant" });
    expect(avisar).toHaveBeenCalledWith(expect.objectContaining({ mapaId: "m1", backbone: ["a", "b", "c"] }));
  });
  it("generateMap lança → o job lança (o BullMQ retenta)", async () => {
    await expect(processCerebroJob({ userId: "u", surface: "estudos", scopeId: "t1", topico: "x" }, { generateMap: vi.fn(async () => { throw new Error("conflict"); }), ligarConversa: vi.fn(), avisarGerado: vi.fn() })).rejects.toThrow(/conflict/);
  });
});

describe("estados da bolinha (sempre mostra algo)", () => {
  it("oculta → sugerida → gerando → ativa; mapa sem percurso = vazia", () => {
    expect(estadoDaBolinha({ estudavel: false, mapaId: null, temMapa: false, backbone: 0 })).toBe("oculta");
    expect(estadoDaBolinha({ estudavel: true, mapaId: null, temMapa: false, backbone: 0 })).toBe("sugerida");
    expect(estadoDaBolinha({ estudavel: true, mapaId: null, temMapa: false, backbone: 0, gerando: true })).toBe("gerando");
    expect(estadoDaBolinha({ estudavel: false, mapaId: null, temMapa: true, backbone: 0 })).toBe("vazia");
    expect(estadoDaBolinha({ estudavel: false, mapaId: "m", temMapa: true, backbone: 4 })).toBe("ativa");
    expect(ROTULO.oculta).toBe("");
  });
});
