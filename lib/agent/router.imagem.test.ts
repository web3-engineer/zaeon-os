/** #756 · "faça uma imagem da mitocôndria" virava diagrama: o modelo do roteador lia como explicação. */
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ gemini: vi.fn() }));
vi.mock("@/lib/scholar/gemini", () => ({ geminiJson: h.gemini }));

import { classify, classifyHeuristic, pedeImagem } from "./router";
import { pickStudioKind } from "./aura-harness";
const ctx: any = { activeTab: "sala-de-estudos" };

beforeEach(() => { delete process.env.ROTEADOR_KNN; h.gemini.mockReset(); h.gemini.mockResolvedValue({ intent: "explicar_conceito" }); });

describe("#756 · pedido de imagem vira imagem", () => {
  it("reconhece os pedidos do ar e variações", () => {
    for (const p of ["faça uma imagem da mitocôndria", "crie uma ilustração da mitocôndria", "gere uma figura do ciclo da água", "desenhe uma imagem de um neurônio", "me dá uma ilustração da célula vegetal", "Faz uma imagem do coração."]) {
      expect(pedeImagem(p), p).toBe(true);
    }
  });
  it("não confunde com explicação, gráfico ou aula", () => {
    for (const p of ["o que é figura de linguagem?", "explique a imagem corporal na adolescência", "faça um gráfico da população do Brasil por região", "faz o gráfico de f(x) = x^2 - 4", "desenhe o triângulo 3-4-5", "me dá uma aula sobre mitocôndria"]) {
      expect(pedeImagem(p), p).toBe(false);
    }
  });
  it("a regra manda mais que o palpite do modelo (que dizia explicar_conceito)", async () => {
    const r = await classify("faça uma imagem da mitocôndria", ctx);
    expect(h.gemini).toHaveBeenCalled();
    expect(r.intent).toBe("gerar_artefato");
    expect((await classify("crie uma ilustração da mitocôndria", ctx)).intent).toBe("gerar_artefato");
  });
  it("sem o modelo (heurística) também, e o artefato escolhido é imagem", () => {
    expect(classifyHeuristic("crie uma ilustração da mitocôndria", ctx).intent).toBe("gerar_artefato");
    expect(pickStudioKind("crie uma ilustração da mitocôndria")).toBe("image");
    expect(pickStudioKind("faça uma imagem da mitocôndria")).toBe("image");
  });
  it("o modelo do roteador aprende que imagem é artefato", async () => {
    await classify("o que é mitose?", ctx);
    expect(String(h.gemini.mock.calls[0][0])).toMatch(/IMAGEM\/ilustração\/figura/);
  });
});
