import { describe, expect, it } from "vitest";
import { erroDeResposta, erroLegivel, statusLegivel } from "./BaseConhecimentoModule";

describe("BaseConhecimentoModule — erros legíveis", () => {
  it("banco_indisponivel => texto de banco fora do ar", () => {
    expect(erroLegivel("banco_indisponivel")).toBe("banco da base fora do ar — tente de novo");
  });
  it("documento em erro por banco_indisponivel aparece com o texto legível", () => {
    expect(statusLegivel({ status: "erro", erro: "banco_indisponivel", comVetor: 0, totalTrechos: 0 })).toBe("erro: banco da base fora do ar — tente de novo");
  });
  it("resposta 503 => banco fora do ar; outros status => a mensagem padrão", () => {
    expect(erroDeResposta(503, "Não consegui carregar a base.")).toBe("banco da base fora do ar — tente de novo");
    expect(erroDeResposta(500, "Não consegui carregar a base.")).toBe("Não consegui carregar a base.");
  });
});
