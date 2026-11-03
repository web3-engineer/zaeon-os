import { describe, it, expect } from "vitest";
import { K_PADRAO, type TrechoAchado } from "@/lib/rag/busca";
import {
  K_AMPLO,
  MAX_DOCS,
  MIN_DOCS_SINTESE,
  TRECHOS_POR_DOC,
  agruparPorDocumento,
  trechosParaCitar,
  valeSintetizar,
} from "@/lib/rag/porDocumento";

const t = (documentoId: string, texto: string, score: number, over: Partial<TrechoAchado> = {}): TrechoAchado => ({
  trechoId: `${documentoId}-${texto}`,
  documentoId,
  titulo: `Doc ${documentoId}`,
  texto,
  paginaIni: 1,
  paginaFim: 1,
  score,
  similaridade: score,
  porTexto: false,
  ...over,
});

describe("agruparPorDocumento", () => {
  it("junta por documento e preserva a ordem de relevância dentro de cada um", () => {
    const g = agruparPorDocumento([t("d1", "a", 0.9), t("d2", "x", 0.8), t("d1", "b", 0.7)]);
    expect(g).toHaveLength(2);
    expect(g[0].documentoId).toBe("d1");
    expect(g[0].trechos.map((x) => x.texto)).toEqual(["a", "b"]);
    expect(g[1].documentoId).toBe("d2");
  });

  it("ordena os DOCUMENTOS pelo melhor trecho de cada um", () => {
    const g = agruparPorDocumento([t("fraco", "a", 0.3), t("forte", "b", 0.95), t("medio", "c", 0.6)]);
    expect(g.map((x) => x.documentoId)).toEqual(["forte", "medio", "fraco"]);
    expect(g[0].melhor).toBe(0.95);
  });

  it("O GANHO DA FASE: um documento dominante não apaga os outros", () => {
    // 8 trechos ótimos de um doc + 1 de cada um dos outros três: no top-8 PLANO os três desaparecem
    const plano = [
      ...Array.from({ length: 8 }, (_, i) => t("dominante", `d${i}`, 0.99 - i * 0.001)),
      t("d2", "x", 0.8), t("d3", "y", 0.79), t("d4", "z", 0.78),
    ];
    expect(plano.slice(0, 8).every((x) => x.documentoId === "dominante")).toBe(true);
    const g = agruparPorDocumento(plano);
    expect(g.map((x) => x.documentoId)).toEqual(["dominante", "d2", "d3", "d4"]);
    expect(g[0].trechos).toHaveLength(TRECHOS_POR_DOC);   // o dominante não leva tudo
  });

  it("respeita os tetos (por documento e de documentos)", () => {
    const muitos = Array.from({ length: 30 }, (_, i) => t(`d${i}`, "x", 1 - i / 100));
    expect(agruparPorDocumento(muitos)).toHaveLength(MAX_DOCS);
    expect(agruparPorDocumento([t("d1", "a", 1), t("d1", "b", 1), t("d1", "c", 1), t("d1", "d", 1)], { porDoc: 2 })[0].trechos).toHaveLength(2);
  });

  it("trecho sem documentoId é ignorado; título vazio ganha rótulo", () => {
    const g = agruparPorDocumento([t("", "a", 1), t("d1", "b", 1, { titulo: "   " })]);
    expect(g).toHaveLength(1);
    expect(g[0].titulo).toBe("documento sem título");
  });

  it("carrega a marca de base pública da área", () => {
    expect(agruparPorDocumento([t("d1", "a", 1, { publico: true })])[0].publico).toBe(true);
  });

  it("trecho que casou só por TEXTO (sem similaridade) não quebra a ordenação", () => {
    const g = agruparPorDocumento([t("d1", "a", 0.5, { similaridade: null, porTexto: true }), t("d2", "b", 0.9)]);
    expect(g.map((x) => x.documentoId)).toEqual(["d2", "d1"]);
  });

  it("entrada vazia devolve lista vazia", () => {
    expect(agruparPorDocumento([])).toEqual([]);
  });
});

describe("trechosParaCitar · a propriedade que protege as citações", () => {
  it("é o MESMO top-k que o caminho sem F4 usaria", () => {
    const largo = Array.from({ length: K_AMPLO }, (_, i) => t(`d${i % 5}`, `x${i}`, 1 - i / 100));
    const curto = trechosParaCitar(largo);
    // `blocoDaBase` numera [B1]..[Bn] por POSIÇÃO e o modelo devolve `citacoes_base: [n]`:
    // mandar a lista larga desalinharia toda citação do documento.
    expect(curto).toHaveLength(K_PADRAO);
    expect(curto).toEqual(largo.slice(0, K_PADRAO));
  });

  it("base menor que o teto sai inteira", () => {
    const tres = [t("d1", "a", 1), t("d2", "b", 1), t("d3", "c", 1)];
    expect(trechosParaCitar(tres)).toEqual(tres);
  });
});

describe("valeSintetizar", () => {
  it("só com 2+ documentos (com um, a síntese cruzada não existe)", () => {
    expect(MIN_DOCS_SINTESE).toBe(2);
    expect(valeSintetizar([])).toBe(false);
    expect(valeSintetizar([1])).toBe(false);
    expect(valeSintetizar([1, 2])).toBe(true);
  });
});
