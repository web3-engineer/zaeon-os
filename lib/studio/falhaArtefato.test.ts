/** #745 · o que o aluno lê quando um artefato pedido não sai. */
import { describe, it, expect } from "vitest";
import { mensagemDeFalha, semRepetir } from "./falhaArtefato";

describe("#745 · mensagemDeFalha", () => {
  it("o erro técnico do validador (em inglês e repetido) vira uma frase simples; o técnico fica separado", () => {
    const motivo = 'Diagrama reprovado no validador: Node "esofago" exceeds the horizontal bounds of the viewBox — reduce node.width or increase meta.viewBox[0]. | Node "esofago" exceeds the horizontal bounds of the viewBox — reduce node.width or increase meta.viewBox[0].';
    const r = mensagemDeFalha("diagram", motivo);
    expect(r.texto).toBe("Não consegui desenhar esse diagrama agora. Pode tentar de novo.");
    expect(r.texto).not.toMatch(/viewBox|Node|exceeds/);
    expect(r.tecnico).toBe('Diagrama reprovado no validador: Node "esofago" exceeds the horizontal bounds of the viewBox — reduce node.width or increase meta.viewBox[0].');
  });

  it("motivo que já é para gente continua aparecendo (ex.: limite do plano)", () => {
    const r = mensagemDeFalha("video", "Seu plano não inclui vídeo explicativo");
    expect(r.texto).toBe("Não consegui gerar esse vídeo: Seu plano não inclui vídeo explicativo.");
    expect(r.tecnico).toBeNull();
  });

  it("sem motivo, ou com erro de rede, a frase padrão do tipo", () => {
    expect(mensagemDeFalha("image").texto).toBe("Não consegui desenhar essa imagem agora. Pode tentar de novo.");
    expect(mensagemDeFalha("podcast", "fetch failed").texto).toBe("Não consegui gerar esse podcast agora. Pode tentar de novo.");
    expect(mensagemDeFalha("qualquer", "TypeError: x is undefined").texto).toBe("Não consegui gerar esse material agora. Pode tentar de novo.");
    // acesso, limite e credencial também são técnicos
    for (const m of ["Unauthorized", "rate_limited", "invalid credentials", "missing api key"]) expect(mensagemDeFalha("diagram", m).tecnico).toBe(m);
  });

  it("semRepetir junta os diagnósticos iguais", () => {
    expect(semRepetir("A | A | B")).toBe("A | B");
  });
});
