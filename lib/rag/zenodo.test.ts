import { describe, it, expect } from "vitest";
import {
  ESPERA_MS, MAX_RESUMO, MIN_RESUMO, PAGINAS_POR_FRASE, PAGINA_MAXIMA, TAMANHO_PAGINA,
  documentoDoZenodo, ehDescarte, frasesDaArea, licencaPermiteUsoComercial, urlDaBusca,
} from "./zenodo";
import { AREAS, SLUGS_AREA, classificarArea } from "./areas";

const resumo = (semente: string, n = MIN_RESUMO + 200) => {
  let t = "";
  while (t.length < n) t += `${semente} `;
  return t.slice(0, n);
};
const reg = (meta: Record<string, unknown> = {}, topo: Record<string, unknown> = {}) => ({
  id: 5650177,
  doi: "10.5281/zenodo.5650177",
  metadata: {
    title: "Análise estrutural de vigas de concreto armado",
    description: `<p>A <i>viga</i> de concreto armado resiste à flexão; a armadura e o pilar da estrutura seguem a NBR. ${resumo("Dimensionamento de laje e fundação com momento fletor.")}</p>`,
    publication_date: "2021-11-04",
    license: { id: "cc-by-4.0" },
    resource_type: { title: "Report" },
    ...meta,
  },
  ...topo,
});

describe("Zenodo como base por área", () => {
  // O Zenodo é o único lugar do RAG onde a licença é decidida POR DOCUMENTO.
  describe("o portão de licença", () => {
    it("aceita as abertas que de fato aparecem no corpus", () => {
      // medidas em 200 registros reais: 184 cc-by-4.0 e 6 cc-by-sa-4.0
      for (const l of ["cc-by-4.0", "cc-by-sa-4.0", "cc0-1.0", "cc-by-3.0", "mit", "apache-2.0", "odc-by-1.0"]) {
        expect(licencaPermiteUsoComercial(l), l).toBe(true);
      }
      expect(licencaPermiteUsoComercial("CC-BY-4.0"), "maiúscula é a mesma licença").toBe(true);
    });

    it("RECUSA não-comercial e sem-derivados, inclusive os que começam com um prefixo aceito", () => {
      // `cc-by-nc-4.0` começa com `cc-by-`: sem a trava de `-nc` ele entraria. Esse é o ponto.
      for (const l of ["cc-by-nc-4.0", "cc-by-nc-nd-4.0", "cc-by-nc-sa-4.0", "cc-by-nd-4.0"]) {
        expect(licencaPermiteUsoComercial(l), `${l} NÃO pode passar`).toBe(false);
      }
    });

    it("RECUSA por omissão: licença ausente, vazia ou desconhecida", () => {
      // allowlist, não "tudo menos X": licença nova no Zenodo fica de fora até alguém olhar
      for (const l of [null, undefined, "", "   ", "other-closed", "proprietaria", "gpl-3.0", "cc-by", 42, {}]) {
        expect(licencaPermiteUsoComercial(l as never), String(l)).toBe(false);
      }
    });
  });

  it("o registro vira documento, com a área do classificador e o HTML limpo", () => {
    const r = documentoDoZenodo(reg(), classificarArea);
    expect(ehDescarte(r)).toBe(false);
    if (ehDescarte(r)) return;
    expect(r.area).toBe("eng-civil");
    expect(SLUGS_AREA).toContain(r.area);
    expect(r.chave).toBe("zenodo-5650177");
    expect(r.texto).not.toContain("<p>");
    expect(r.texto).not.toContain("<i>");
  });

  it("o rodapé diz sob QUE licença aquele depósito entrou — é por documento, não por fonte", () => {
    const r = documentoDoZenodo(reg({ license: { id: "cc-by-sa-4.0" } }), classificarArea);
    if (ehDescarte(r)) throw new Error(r.descarte);
    expect(r.texto).toContain("Depositado sob licença cc-by-sa-4.0");
    expect(r.texto).toContain("https://zenodo.org/records/5650177");
    expect(r.texto).toContain("DOI 10.5281/zenodo.5650177");
    expect(r.texto).toContain("Fonte: Report no Zenodo (2021)");
  });

  it("a licença é conferida ANTES de tudo — não se classifica o que não pode entrar", () => {
    const nc = documentoDoZenodo(reg({ license: { id: "cc-by-nc-nd-4.0" } }), () => {
      throw new Error("não deveria classificar um registro recusado pela licença");
    });
    expect(nc).toEqual({ descarte: "licenca_recusada" });
    expect(documentoDoZenodo(reg({ license: null }), classificarArea)).toEqual({ descarte: "licenca_recusada" });
  });

  it("descarta sem id, sem título, resumo curto e sem área", () => {
    expect(documentoDoZenodo(reg({}, { id: "" }), classificarArea)).toEqual({ descarte: "sem_id" });
    expect(documentoDoZenodo(reg({ title: "<p></p>" }), classificarArea)).toEqual({ descarte: "sem_titulo" });
    expect(documentoDoZenodo(reg({ description: "<p>Curto.</p>" }), classificarArea)).toEqual({ descarte: "resumo_curto" });
    const fora = documentoDoZenodo(reg({ title: "Bolo de cenoura", description: resumo("Receita com cobertura.") }), classificarArea);
    expect(fora).toEqual({ descarte: "sem_area" });
  });

  it("nunca lança com registro torto", () => {
    for (const lixo of [{}, { id: 1 }, { id: 1, metadata: null }, { id: 1, metadata: { license: 7, title: {} } }] as never[]) {
      expect(() => documentoDoZenodo(lixo, classificarArea)).not.toThrow();
      expect(ehDescarte(documentoDoZenodo(lixo, classificarArea))).toBe(true);
    }
  });

  it("as frases são as de `wiki`, e os tetos da API são os MEDIDOS", () => {
    for (const a of AREAS) expect(frasesDaArea(a.slug), a.slug).toEqual(a.wikipedia);
    expect(TAMANHO_PAGINA, "size=50 devolve erro de validação").toBe(25);
    expect(PAGINA_MAXIMA, "a página 401 devolve erro").toBe(400);
    expect(TAMANHO_PAGINA * PAGINA_MAXIMA).toBe(10_000);
    expect(PAGINAS_POR_FRASE).toBeLessThanOrEqual(PAGINA_MAXIMA);
    expect(ESPERA_MS).toBeGreaterThanOrEqual(1000);
    expect(MAX_RESUMO).toBeGreaterThan(MIN_RESUMO);
    const u = urlDaBusca("Concreto armado", 3);
    expect(u).toContain("page=3");
    expect(u).toContain("size=25");
    expect(u).toContain(encodeURIComponent('+"Concreto armado" +language:por'));
  });
});

describe("recuo diante do 429 do Zenodo", () => {
  it("respeita o Retry-After quando ele vem, com teto", async () => {
    const { esperaDoRecuo, ESPERA_MAXIMA_MS } = await import("./zenodo");
    expect(esperaDoRecuo("2", 0)).toBe(2000);
    expect(esperaDoRecuo("5", 2)).toBe(5000);
    // cabeçalho de terceiro pode vir absurdo: um dia de espera trava o deploy
    expect(esperaDoRecuo("86400", 0)).toBe(ESPERA_MAXIMA_MS);
  });

  it("sem Retry-After, recua dobrando — e nunca passa do teto", async () => {
    const { esperaDoRecuo, ESPERA_MS, ESPERA_MAXIMA_MS } = await import("./zenodo");
    expect(esperaDoRecuo(null, 0)).toBe(ESPERA_MS);
    expect(esperaDoRecuo(null, 1)).toBe(ESPERA_MS * 2);
    expect(esperaDoRecuo(null, 2)).toBe(ESPERA_MS * 4);
    expect(esperaDoRecuo(null, 99)).toBe(ESPERA_MAXIMA_MS);
    expect(esperaDoRecuo("0", 0), "Retry-After zero não é pedido").toBe(ESPERA_MS);
  });
});
