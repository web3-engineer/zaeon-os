/** #764 · o título da imagem é o ASSUNTO, não o pedido inteiro */
import { describe, it, expect } from "vitest";
import { assuntoDaImagem } from "./tituloImagem";

describe("assuntoDaImagem", () => {
  it.each([
    ["faça uma imagem de um vulcão em erupção", "vulcão em erupção"],
    ["imagem: faça uma imagem da mitocôndria", "mitocôndria"],
    ["faça uma ilustração colorida do coração humano por dentro, com as partes nas cores dos livros de anatomia", "coração humano por dentro"],
    ["crie uma ilustração da mitocôndria", "mitocôndria"],
    ["me dá uma foto de um tucano, por favor", "tucano"],
    // #816: o verbo de desenhar já diz que é imagem
    ["desenhe a anatomia do coração humano", "anatomia do coração humano"],
    ["por favor, desenhe para mim um tucano", "tucano"],
    ["ilustre o ciclo da água", "ciclo da água"],
    ["faça a lista de capitais", "faça a lista de capitais"],
    ["sistema solar", "sistema solar"],
  ])("%s → %s", (pedido, assunto) => expect(assuntoDaImagem(pedido)).toBe(assunto));

  it("nunca fica vazio e tem teto", () => {
    expect(assuntoDaImagem("faça uma imagem")).toBe("faça uma imagem");
    expect(assuntoDaImagem("x".repeat(100)).length).toBeLessThanOrEqual(60);
  });
});
