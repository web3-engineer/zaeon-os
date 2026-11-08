import { describe, it, expect } from "vitest";
import {
  ESPERA_MS, MAX_RESUMO, MIN_RESUMO, PAGINAS_POR_FRASE, POR_PAGINA, TETO_POR_CONSULTA,
  documentoDoDoaj, ehDescarte, frasesDaArea, limparResumo, urlDaBusca,
} from "./doaj";
import { AREAS, SLUGS_AREA, classificarArea } from "./areas";

const resumo = (semente: string, n = MIN_RESUMO + 200) => {
  let t = "";
  while (t.length < n) t += `${semente} `;
  return t.slice(0, n);
};
const reg = (over: Record<string, unknown> = {}, bib: Record<string, unknown> = {}) => ({
  id: "abc123",
  bibjson: {
    title: "Análise estrutural de vigas de concreto armado",
    abstract: resumo("A viga de concreto armado resiste à flexão; a armadura e o pilar da estrutura seguem a NBR."),
    year: "2023",
    journal: { title: "Revista de Engenharia" },
    identifier: [{ type: "pissn", id: "1234-5678" }, { type: "doi", id: "10.1000/xyz" }],
    ...bib,
  },
  ...over,
});

describe("DOAJ como base por área", () => {
  it("as frases de busca são os verbetes de `wiki` — não existe lista paralela pra divergir", () => {
    for (const a of AREAS) {
      expect(frasesDaArea(a.slug), a.slug).toEqual(a.wikipedia);
      expect(frasesDaArea(a.slug).length, a.slug).toBeGreaterThan(5);
    }
    expect(frasesDaArea("area-que-nao-existe")).toEqual([]);
    // as frases que eu medi na API estão lá de verdade
    expect(frasesDaArea("eng-civil")).toContain("Concreto armado");
    expect(frasesDaArea("enfermagem")).toContain("Enfermagem");
  });

  it("o registro vira documento, e a ÁREA vem do classificador, não da frase buscada", () => {
    // Busquei por uma frase de eng-civil, mas quem decide é `classificarArea`. Se a consulta
    // ditasse a área, um artigo de química achado por "concreto armado" entraria em eng-civil.
    const r = documentoDoDoaj(reg(), classificarArea);
    expect(ehDescarte(r)).toBe(false);
    if (ehDescarte(r)) return;
    expect(r.area).toBe("eng-civil");
    expect(SLUGS_AREA).toContain(r.area);
    expect(r.chave).toBe("doaj-abc123");
    expect(r.pontos).toBeGreaterThan(0);
  });

  it("o rodapé leva revista, ano, DOI e o link da DOAJ — e diz que o CC0 é do METADADO", () => {
    const r = documentoDoDoaj(reg(), classificarArea);
    if (ehDescarte(r)) throw new Error(r.descarte);
    expect(r.texto).toContain("Revista de Engenharia (2023)");
    expect(r.texto).toContain("DOI 10.1000/xyz");
    expect(r.texto).toContain("https://doaj.org/article/abc123");
    expect(r.texto).toContain("CC0 1.0");
    // a fronteira: o resumo é CC0, o texto completo é da revista
    expect(r.texto).toContain("o texto completo tem a licença da revista");
  });

  it("pega o DOI entre vários identificadores, e vive sem ele", () => {
    const so = documentoDoDoaj(reg({}, { identifier: [{ type: "eissn", id: "9999-0000" }] }), classificarArea);
    if (ehDescarte(so)) throw new Error(so.descarte);
    expect(so.texto).not.toContain("DOI");
    expect(so.texto).toContain("https://doaj.org/article/abc123");
    const semNada = documentoDoDoaj(reg({}, { identifier: null, journal: null, year: null }), classificarArea);
    if (ehDescarte(semNada)) throw new Error(semNada.descarte);
    expect(semNada.texto).toContain("revista de acesso aberto");
  });

  it("descarta sem título, sem id, resumo curto e sem área — com o motivo de cada", () => {
    expect(documentoDoDoaj(reg({}, { title: "   " }), classificarArea)).toEqual({ descarte: "sem_titulo" });
    // sem o id da DOAJ a chave não é estável e o documento duplicaria a cada execução
    expect(documentoDoDoaj(reg({ id: "" }), classificarArea)).toEqual({ descarte: "sem_id" });
    expect(documentoDoDoaj(reg({}, { abstract: "Resumo curto." }), classificarArea)).toEqual({ descarte: "resumo_curto" });
    expect(documentoDoDoaj(reg({}, { abstract: null }), classificarArea)).toEqual({ descarte: "resumo_curto" });
    const fora = documentoDoDoaj(reg({}, { title: "Bolo de cenoura", abstract: resumo("Receita tradicional com cobertura.") }), classificarArea);
    expect(fora).toEqual({ descarte: "sem_area" });
  });

  it("resumo em espanhol não classifica — é por isso que o filtro por idioma da REVISTA não serve", () => {
    // Medido na API: `journal.language:PT` é da revista, e os resumos vinham em espanhol e inglês,
    // com 10% classificando. O classificador recusa, que é o certo; o desperdício é de requisição.
    const es = documentoDoDoaj(reg({}, {
      title: "Atención permanente a la condición humana",
      abstract: resumo("En los tiempos sociales que vivimos en la actualidad se hace necesaria la atención permanente."),
    }), classificarArea);
    expect(es).toEqual({ descarte: "sem_area" });
  });

  it("limpa o HTML do resumo — medido em 225 resumos reais da API", () => {
    const sujo = "<p>A <i>viga</i> de concreto<br/>armado com p &lt; 0,05 &amp; carga &gt; 10 kN&nbsp;resiste.</p>";
    const limpo = limparResumo(sujo);
    expect(limpo).toBe("A viga de concreto armado com p < 0,05 & carga > 10 kN resiste.");
    for (const t of ["<p>", "<i>", "<br", "&lt;", "&gt;", "&amp;", "&nbsp;"]) {
      expect(limpo, `sobrou ${t}`).not.toContain(t);
    }
  });

  it("tag ESCAPADA sobrevive como texto — é por isso que a ordem é tag antes de entidade", () => {
    // o autor escreveu `&lt;i&gt;` pra aparecer literalmente. Decodificar primeiro viraria `<i>`,
    // que a remoção de marcação comeria — perdendo o que o autor quis dizer.
    expect(limparResumo("use a marca &lt;i&gt; para itálico")).toBe("use a marca <i> para itálico");
    expect(limparResumo("&#233;poca")).toBe("época");
    expect(limparResumo(null as never)).toBe("");
  });

  it("o HTML sai ANTES de classificar e de contar o mínimo", () => {
    // um resumo com 450 chars de marcação e 100 de texto não pode passar pelo mínimo de 400
    const soMarcacao = `<p>${"<i>x</i>".repeat(60)}</p>Texto curto de verdade.`;
    expect(documentoDoDoaj(reg({}, { abstract: soMarcacao }), classificarArea)).toEqual({ descarte: "resumo_curto" });
    // e o texto que chega ao documento é o limpo
    const r = documentoDoDoaj(reg({}, { abstract: `<p><strong>${resumo("A viga de concreto armado resiste à flexão; a armadura e o pilar da estrutura seguem a NBR.")}</strong></p>` }), classificarArea);
    if (ehDescarte(r)) throw new Error(r.descarte);
    expect(r.texto).not.toContain("<strong>");
    expect(r.area).toBe("eng-civil");
  });

  it("nunca lança com registro torto", () => {
    for (const lixo of [{}, { id: 1 }, { bibjson: null }, { bibjson: { title: 5, abstract: {} } }] as never[]) {
      expect(() => documentoDoDoaj(lixo, classificarArea)).not.toThrow();
      expect(ehDescarte(documentoDoDoaj(lixo, classificarArea))).toBe(true);
    }
  });

  it("os tetos da API são os MEDIDOS, não os desejados", () => {
    expect(POR_PAGINA, "pedir mais que 50 não traz mais").toBe(50);
    expect(TETO_POR_CONSULTA, "além de 1.000 a DOAJ devolve HTTP 400").toBe(1000);
    expect(PAGINAS_POR_FRASE * POR_PAGINA).toBeLessThanOrEqual(TETO_POR_CONSULTA);
    expect(ESPERA_MS).toBeGreaterThanOrEqual(1000);
    expect(urlDaBusca("Concreto armado", 2)).toBe(
      "https://doaj.org/api/search/articles/Concreto%20armado?pageSize=50&page=2",
    );
    expect(MAX_RESUMO).toBeGreaterThan(MIN_RESUMO);
  });
});
