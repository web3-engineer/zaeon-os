import { describe, it, expect } from "vitest";
import { saudeDoChat, type LinhaSaude } from "@/lib/orquestra/saude";

const l = (o: Partial<LinhaSaude>): LinhaSaude => ({ at: "2026-11-08T06:10:00Z", phase: "draft", provedor: "vertex", alvo: "vertex", ok: true, erro: null, ms: 1000, model: "gemini-3.5-flash", taskId: "t1", ...o });

describe("saúde do chat (verificar as correções no console)", () => {
  it("conta turnos, falhas, reserva (troca de família) e modelo aposentado", () => {
    const s = saudeDoChat([
      l({ taskId: "t1", phase: "route", ms: 900 }),
      l({ taskId: "t1", ms: 4_000 }),
      l({ taskId: "t2", ok: false, erro: "rate_limit", ms: 0 }),
      l({ taskId: "t2", provedor: "huggingface", alvo: "huggingface", model: "openai/gpt-oss-120b", ms: 6_000 }),
      l({ taskId: "t3", phase: "plan", ok: false, erro: "modelo_inexistente", model: "gemini-2.5-pro", ms: 0 }),
      l({ taskId: "t3", phase: "plan", ms: 2_000, at: "2026-11-08T07:05:00Z" }),
    ], 24, new Date("2026-11-08T08:00:00Z"));
    expect(s).toMatchObject({ chamadas: 6, turnos: 3, falhas: 2, turnosComReserva: 1, turnosComModeloAposentado: 1 });
    expect(s.taxaReserva).toBeCloseTo(1 / 3, 3);
    expect(s.erros).toEqual([{ classe: "rate_limit", n: 1 }, { classe: "modelo_inexistente", n: 1 }]);
    const draft = s.porFase.find((f) => f.fase === "draft")!;
    expect(draft).toMatchObject({ chamadas: 3, falhas: 1, msP50: 6_000 });
    expect(s.porAlvo[0]).toMatchObject({ alvo: "vertex", chamadas: 5 });
    expect(s.modelos.find((m) => m.model === "gemini-2.5-pro")).toMatchObject({ falhas: 1, taxaFalha: 1 });
    expect(s.serie.map((h) => h.hora)).toEqual(["2026-11-08T06:00:00Z", "2026-11-08T07:00:00Z"]);
  });
  it("sem linhas: tudo zero, sem divisão por zero", () => {
    expect(saudeDoChat([], 24)).toMatchObject({ chamadas: 0, turnos: 0, taxaFalha: 0, taxaReserva: 0, porFase: [] });
  });
});
