import { describe, it, expect } from "vitest";
import {
  AREAS_DO_ARXIV, CATEGORIAS, ESPERA_MS, MIN_RESUMO, POR_PAGINA,
  artigosDoAtom, consultaDaArea, documentoDoArtigo, totalDoAtom, urlDaBusca,
} from "./arxiv";
import { SLUGS_AREA } from "./areas";

/** Um Atom como o arXiv devolve de verdade, com as entidades e a quebra de linha que ele usa. */
const atom = (...entradas: string[]) => `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">
  <opensearch:totalResults xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">319539</opensearch:totalResults>
  ${entradas.join("\n")}
</feed>`;

const entrada = (id: string, titulo: string, resumo: string, cats: string[] = ["hep-th"]) => `<entry>
    <id>http://arxiv.org/abs/${id}v2</id>
    <title>${titulo}</title>
    <summary>${resumo}</summary>
    ${cats.map((c) => `<category term="${c}" scheme="http://arxiv.org/schemas/atom"/>`).join("")}
  </entry>`;

const longo = (semente: string, n = MIN_RESUMO + 100) => {
  let t = "";
  while (t.length < n) t += `${semente} `;
  return t.slice(0, n);
};

describe("arXiv como base por área", () => {
  it("toda área do mapa EXISTE — área inventada é documento invisível", () => {
    for (const area of Object.keys(CATEGORIAS)) expect(SLUGS_AREA, area).toContain(area);
    expect(AREAS_DO_ARXIV).toEqual([...Object.keys(CATEGORIAS)].sort());
    for (const [area, cats] of Object.entries(CATEGORIAS)) expect(cats.length, area).toBeGreaterThan(0);
  });

  it("física inclui os arquivos de PRIMEIRO nível, não só `physics.*`", () => {
    // astro-ph, cond-mat, gr-qc, hep-* e quant-ph são irmãos de `physics` no arXiv, não filhos.
    // Mapear só `physics*` deixaria de fora a maior parte da física — e física é a nossa área
    // mais fraca (471 documentos próprios), que é justamente o que esta fonte vem resolver.
    for (const c of ["astro-ph", "cond-mat", "quant-ph", "hep-th"]) {
      expect(CATEGORIAS.fisica, c).toContain(c);
    }
    expect(consultaDaArea("fisica")).toContain("cat:astro-ph*");
    expect(consultaDaArea("fisica").split("+OR+").length).toBe(CATEGORIAS.fisica!.length);
  });

  it("NÃO mapeia os campos que o arXiv não tem — forçar vizinho enche a base do agente errado", () => {
    for (const fora of ["enfermagem", "farmacia", "veterinaria", "agronomia", "psicologia", "eng-civil"]) {
      expect(Object.keys(CATEGORIAS), `${fora} não deveria estar mapeado`).not.toContain(fora);
    }
  });

  it("o Atom real vira artigos, com o id sem a versão", () => {
    const xml = atom(entrada("2501.01234", "Vapor Pressure in a Paramagnetic Solid", longo("quantum vapor pressure"), ["cond-mat.stat-mech", "quant-ph"]));
    const [a] = artigosDoAtom(xml);
    expect(a).toBeTruthy();
    expect(a!.id, "o `v2` do fim não pode entrar na chave, senão a mesma obra duplica").toBe("2501.01234");
    expect(a!.titulo).toBe("Vapor Pressure in a Paramagnetic Solid");
    expect(a!.categorias).toEqual(["cond-mat.stat-mech", "quant-ph"]);
    expect(totalDoAtom(xml)).toBe(319539);
  });

  it("desfaz as entidades e junta o título quebrado em linhas (o arXiv quebra)", () => {
    const xml = atom(entrada("2502.00001", "Spin &lt;1/2&gt; chains\n  and the &amp; operator", longo("spin chains")));
    const [a] = artigosDoAtom(xml);
    expect(a!.titulo).toBe("Spin <1/2> chains and the & operator");
  });

  it("entrada torta no meio não derruba as outras", () => {
    const xml = atom(
      entrada("2501.00001", "Bom", longo("physics")),
      "<entry><id>http://arxiv.org/abs/2501.00002</id><title>Sem resumo</title></entry>",
      "<entry>lixo total</entry>",
      entrada("2501.00003", "Outro bom", longo("physics")),
    );
    const as = artigosDoAtom(xml);
    expect(as.map((a) => a.id)).toEqual(["2501.00001", "2501.00003"]);
    expect(() => artigosDoAtom("não é xml")).not.toThrow();
    expect(artigosDoAtom("")).toEqual([]);
    expect(totalDoAtom("")).toBe(0);
  });

  it("o documento diz que SÓ o resumo entrou, e que o texto completo não é CC0", () => {
    const [a] = artigosDoAtom(atom(entrada("2503.12345", "Título", longo("abstract text"), ["math.AG"])));
    const d = documentoDoArtigo(a!, "matematica")!;
    expect(d.chave).toBe("arxiv-2503.12345");
    expect(d.area).toBe("matematica");
    expect(d.texto).toContain("CC0 1.0");
    // esta frase é a fronteira legal da fonte: resumo sim, texto completo não
    expect(d.texto).toContain("o texto completo do artigo tem a licença");
    expect(d.texto).toContain("NÃO está incluído aqui");
    expect(d.texto).toContain("https://arxiv.org/abs/2503.12345");
    expect(d.texto).toContain("math.AG");
  });

  it("resumo curto não entra — errata e nota de retratação são curtas", () => {
    const [a] = artigosDoAtom(atom(entrada("2504.00001", "Erratum", "Erratum to our previous paper.")));
    expect(documentoDoArtigo(a!, "fisica")).toBeNull();
    expect(MIN_RESUMO).toBe(400);
  });

  it("a URL da busca é a real, paginada e ordenada por data", () => {
    const u = urlDaBusca("matematica", 400, 200);
    expect(u).toContain("https://export.arxiv.org/api/query?search_query=cat:math*");
    expect(u).toContain("&start=400&max_results=200");
    expect(u).toContain("sortBy=submittedDate");
    // os Termos de Uso do arXiv pedem 3 s entre chamadas
    expect(ESPERA_MS).toBeGreaterThanOrEqual(3000);
    expect(POR_PAGINA).toBeLessThanOrEqual(2000);
  });
});
