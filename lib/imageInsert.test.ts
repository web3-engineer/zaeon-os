import { describe, it, expect } from "vitest";
import { insertImageMarker, sanitizeFigureTitle } from "./imageInsert";

const URI = "data:image/png;base64,AAAA";

describe("sanitizeFigureTitle", () => {
  it("remove a extensão do arquivo", () => {
    expect(sanitizeFigureTitle("grafico.png")).toBe("grafico");
  });
  it("troca hífen/underscore por espaço e normaliza", () => {
    expect(sanitizeFigureTitle("mapa_do-brasil.JPG")).toBe("mapa do brasil");
  });
  it("cai para 'Figura' quando vazio", () => {
    expect(sanitizeFigureTitle("")).toBe("Figura");
    expect(sanitizeFigureTitle(".png")).toBe("Figura");
  });
});

describe("insertImageMarker", () => {
  it("monta o marcador no formato da engine com fonte default 'própria'", () => {
    expect(insertImageMarker("", 0, { title: "Mapa", dataUri: URI })).toBe(
      `![Mapa|própria](${URI})`,
    );
  });

  it("usa a fonte informada", () => {
    expect(
      insertImageMarker("", 0, { title: "Mapa", fonte: "IBGE (2020)", dataUri: URI }),
    ).toBe(`![Mapa|IBGE (2020)](${URI})`);
  });

  it("insere como bloco isolado no fim do texto", () => {
    expect(insertImageMarker("Texto.", 6, { title: "Fig", dataUri: URI })).toBe(
      `Texto.\n\n![Fig|própria](${URI})`,
    );
  });

  it("insere como bloco isolado no meio do texto", () => {
    expect(insertImageMarker("AB", 1, { title: "Fig", dataUri: URI })).toBe(
      `A\n\n![Fig|própria](${URI})\n\nB`,
    );
  });

  it("não duplica linhas em branco quando já há separação", () => {
    expect(insertImageMarker("Texto.\n\n", 8, { title: "Fig", dataUri: URI })).toBe(
      `Texto.\n\n![Fig|própria](${URI})`,
    );
  });

  it("retorna o doc intacto sem dataUri", () => {
    expect(insertImageMarker("Texto.", 6, { title: "Fig", dataUri: "" })).toBe("Texto.");
  });

  it("limita o cursor ao tamanho do doc", () => {
    expect(insertImageMarker("AB", 999, { title: "F", dataUri: URI })).toBe(
      `AB\n\n![F|própria](${URI})`,
    );
  });
});
