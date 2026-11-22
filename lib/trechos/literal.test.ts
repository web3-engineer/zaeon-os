import { describe, it, expect } from "vitest";
import { contemTermo, contexto, extrairAncoras, fraseComMaisTermos, localizarLiteral, paragrafos, termosDaPergunta } from "@/lib/trechos/literal";

const DOC = `Capítulo 2 › Fotossíntese

A fotossíntese ocorre nos cloroplastos, onde a clorofila absorve a luz.
Na fase clara, a água é quebrada e o oxigênio é liberado — é o chamado "fotólise da água".
Já na fase escura (ciclo de Calvin), o CO2 é fixado em glicose.`;

describe("localizar a citação no documento (a prova)", () => {
  it("exata: devolve a substring ORIGINAL do documento", () => {
    const r = localizarLiteral(DOC, "a clorofila absorve a luz")!;
    expect(DOC.slice(r.ini, r.fim)).toBe("a clorofila absorve a luz");
  });
  it("tolera quebra de linha, aspas/travessão tipográficos, caixa e acento — e devolve o texto do documento", () => {
    const r = localizarLiteral(DOC, 'oxigenio e liberado - e o chamado “fotolise da agua”')!;
    expect(DOC.slice(r.ini, r.fim)).toBe('oxigênio é liberado — é o chamado "fotólise da água"');
  });
  it("paráfrase não passa", () => {
    expect(localizarLiteral(DOC, "a planta usa luz para fazer açúcar nos cloroplastos")).toBeNull();
  });
  it("meio elidido com reticências: ancora começo e fim, com tamanho parecido", () => {
    const r = localizarLiteral(DOC, "Na fase clara, a água é quebrada … é o chamado")!;
    expect(DOC.slice(r.ini, r.fim)).toContain("Na fase clara");
    expect(DOC.slice(r.ini, r.fim)).toContain("é o chamado");
  });
  it("citação curta demais é recusada (casaria em qualquer lugar)", () => {
    expect(localizarLiteral(DOC, "a luz")).toBeNull();
  });
});

describe("contexto da folha", () => {
  it("corta em palavra e marca com reticências", () => {
    const r = localizarLiteral(DOC, "o CO2 é fixado em glicose")!;
    const c = contexto(DOC, r.ini, r.fim, 30);
    expect(c.antes.startsWith("…")).toBe(true);
    expect(c.antes.endsWith(" ")).toBe(true);
    expect(c.depois).toBe(".");
  });
});

describe("termos e varredura", () => {
  it("termo casa no começo de palavra, sem acento", () => {
    expect(contemTermo(DOC, "fotossint")).toBe(true);
    expect(contemTermo(DOC, "ciclo de calvin")).toBe(true);
    expect(contemTermo("contato", "ato")).toBe(false);
  });
  it("termos da pergunta tiram palavra de pedido", () => {
    expect(termosDaPergunta("Ache na minha apostila todos os trechos sobre fotossíntese e clorofila")).toEqual(["fotossintese", "clorofila"]);
  });
  it("frase de reserva: a com mais termos", () => {
    expect(fraseComMaisTermos(DOC, ["clorofila", "cloroplastos"])).toContain("clorofila absorve a luz");
  });
});

describe("parágrafos e âncoras", () => {
  it("não parte cerca de código nem bloco de fórmula", () => {
    const md = "a\n\n```js\nx\n\ny\n```\n\n$$\nE=mc^2\n\n$$\n\nb";
    expect(paragrafos(md)).toHaveLength(4);
  });
  it("marcador sozinho ancora no parágrafo anterior, sem deixar buraco no texto", () => {
    const r = extrairAncoras("Primeiro.\n\n[[T2]]\n\nSegundo com [[t1]] no meio.\n[[T9]]\nlinha", new Set(["T1", "T2"]));
    expect(r.texto).toBe("Primeiro.\n\nSegundo com no meio.\nlinha");
    expect(Object.fromEntries(r.ancoras)).toEqual({ T2: 0, T1: 1 });
    expect(paragrafos(r.texto)).toHaveLength(2); // a linha que era só marcador não partiu o parágrafo
  });
  it("cada id vale uma vez", () => {
    const r = extrairAncoras("A [[T1]]\n\nB [[T1]]", new Set(["T1"]));
    expect(r.ancoras.get("T1")).toBe(0);
    expect(r.texto).toBe("A\n\nB");
  });
});
