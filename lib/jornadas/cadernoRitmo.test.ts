import { describe, it, expect } from "vitest";
import { cadernoPorId, pedeCaderno, CADERNO_RITMO } from "./cadernoRitmo";

describe("cadernoPorId", () => {
  it("devolve o caderno de ritmo (default) e null pra id desconhecido", () => {
    expect(cadernoPorId("ritmo")?.id).toBe("ritmo");
    expect(cadernoPorId(null)?.id).toBe("ritmo");
    expect(cadernoPorId("")?.id).toBe("ritmo");
    expect(cadernoPorId("inexistente")).toBeNull();
  });
  it("o esqueleto curado é coerente (módulos com ABC, trilha, semana)", () => {
    expect(CADERNO_RITMO.modulos[0].partitura?.abc).toContain("K:C");
    expect(CADERNO_RITMO.trilha.some((c) => c.estado === "atual")).toBe(true);
    expect(CADERNO_RITMO.semana.dias).toHaveLength(7);
  });
});

describe("pedeCaderno — gatilho determinístico", () => {
  it("pega os pedidos de abrir o caderno de música", () => {
    for (const t of ["abrir meu caderno de ritmo", "quero o Caderno de Ritmo", "caderno de música", "aprender ritmo", "praticar solfejo"]) {
      expect(pedeCaderno(t), t).toBe(true);
    }
  });
  it("ignora conversa comum e outros cadernos", () => {
    for (const t of ["me explica a fotossíntese", "caderno de química orgânica", "qual o ritmo da aula?", ""]) {
      expect(pedeCaderno(t), t).toBe(false);
    }
  });
});
