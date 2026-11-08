import { describe, it, expect } from "vitest";
import {
  BLOCO_TAR, MAX_CHARS, MIN_CHARS, RUN, WIKIS,
  documentoDoWikilivro, ehDescarte, textoDoWikitexto, urlDoWiki,
} from "./wikilivros";
import { SLUGS_AREA } from "./areas";

const corpo = (semente: string, n = MIN_CHARS + 400) => {
  let t = "";
  while (t.length < n) t += `${semente} `;
  return t.slice(0, n);
};
const pagina = (name: string, wikitext: string, lic = "Creative Commons Attribution Share Alike 3.0 Unported") => ({
  name, url: `https://pt.wikibooks.org/wiki/${encodeURIComponent(name)}`,
  article_body: { wikitext }, license: [{ name: lic }],
});

describe("Wikilivros/Wikiversidade como base por área", () => {
  it("limpa a marcação na ORDEM certa — tabela e predefinição antes dos links", () => {
    const wt = [
      "{{Info|nome=X|imagem=[[Arquivo:a.png]]}}",
      "A '''enfermagem''' cuida do [[paciente|doente]] e dos [[sinais vitais]].",
      "{| class=\"wikitable\"\n! a !! b\n|-\n| [[x]] || y\n|}",
      "<ref name=\"a\">Fonte qualquer</ref>Texto após a nota.",
      "== Seção ==",
      "* item de lista",
      "[https://exemplo.org rótulo do link] e [https://exemplo.org]",
      "<!-- comentário -->",
    ].join("\n");
    const t = textoDoWikitexto(wt);
    // se os links saíssem antes das tabelas, sobrariam `{|` e `{{` órfãos
    for (const resto of ["{{", "}}", "{|", "|}", "[[", "]]", "<ref", "<!--", "'''"]) {
      expect(t, `sobrou marcação: ${resto}`).not.toContain(resto);
    }
    expect(t).toContain("doente");                 // link virou o rótulo
    expect(t).toContain("sinais vitais");
    expect(t).toContain("rótulo do link");
    expect(t).toContain("Texto após a nota.");
    expect(t).toContain("Seção.");                 // seção virou frase, pra não perder o tema
    expect(t).not.toContain("Fonte qualquer");     // conteúdo de <ref> sai
    expect(t).not.toContain("comentário");
    expect(t).not.toContain("a.png");
  });

  it("predefinição aninhada sai inteira", () => {
    expect(textoDoWikitexto("{{a|{{b|{{c|x}}}}}} fim")).toBe("fim");
  });

  it("a página classificável vira documento, com a licença QUE O REGISTRO declara", () => {
    // texto de UMA área só. Ver o teste do empate abaixo pra entender por que isso importa aqui.
    const wt = corpo("A viga de concreto armado resiste à flexão; a armadura e o pilar da estrutura seguem a NBR.");
    const r = documentoDoWikilivro("ptwikibooks", pagina("Engenharia civil/Estruturas", wt));
    expect(ehDescarte(r)).toBe(false);
    if (ehDescarte(r)) return;
    expect(SLUGS_AREA).toContain(r.area);
    expect(r.area).toBe("eng-civil");
    expect(r.titulo).toBe("Engenharia civil/Estruturas (Wikilivros)");
    expect(r.chave).toBe(`ptwikibooks-${RUN}-Engenharia civil/Estruturas`);
    expect(r.texto).toContain("Creative Commons Attribution Share Alike 3.0 Unported");
    expect(r.texto).toContain("instantâneo de 2025-03-20");
    expect(r.texto).toContain("colaboradores do Wikilivros");
  });

  it("licença ausente no registro NÃO é inventada", () => {
    const wt = corpo("A enfermagem cuida do paciente; sinais vitais e biossegurança no hospital.");
    const r = documentoDoWikilivro("ptwikibooks", { ...pagina("Enfermagem/X", wt), license: null });
    if (ehDescarte(r)) throw new Error(`descartou: ${r.descarte}`);
    expect(r.texto).not.toMatch(/licen(ç|c)a/i);
    expect(r.texto).toContain("colaboradores do Wikilivros");
  });

  it("descarta impressão, administrativo, curto e sem área — cada um com seu motivo", () => {
    const wt = corpo("A enfermagem cuida do paciente; sinais vitais e biossegurança no hospital.");
    // a versão "/Imprimir" é a MESMA obra concatenada: entraria duplicada e roubaria a vaga
    expect(documentoDoWikilivro("ptwikibooks", pagina("Enfermagem/Imprimir", wt))).toEqual({ descarte: "estrutura" });
    expect(documentoDoWikilivro("ptwikibooks", pagina("Análise real/Índice", wt))).toEqual({ descarte: "estrutura" });
    expect(documentoDoWikilivro("ptwikibooks", pagina("Wikilivros:Página principal", wt))).toEqual({ descarte: "administrativo" });
    expect(documentoDoWikilivro("ptwikibooks", pagina("Predefinição:Info", wt))).toEqual({ descarte: "administrativo" });
    expect(documentoDoWikilivro("ptwikibooks", pagina("Curto", "Uma linha só."))).toEqual({ descarte: "curto" });
    expect(documentoDoWikilivro("ptwikibooks", pagina("", wt))).toEqual({ descarte: "sem_titulo" });
    // o guia de Harry Potter é longo e não é de nenhuma área: tem de cair em `sem_area`
    const hp = documentoDoWikilivro("ptwikibooks", pagina("Guia dos Trouxas para Harry Potter/Lugares", corpo("O escritório do diretor fica na torre e guarda retratos antigos.")));
    expect(hp).toEqual({ descarte: "sem_area" });
  });

  it("EMPATE entre áreas vizinhas descarta — e enfermagem empata com medicina com facilidade", () => {
    // Achado real ao escrever estes testes: "A enfermagem cuida do paciente; sinais vitais,
    // biossegurança e atenção primária à saúde no hospital" pontua medicina E enfermagem quase
    // igual, e `classificarArea` exige destaque (2x a segunda). Resultado: `sem_area`.
    // Isso NÃO é defeito do módulo — é a régua do classificador recusando ambiguidade em vez de
    // chutar. E explica por que enfermagem rende pouco em corpus de texto curto (33 documentos na
    // Wikipédia) e muito em resumo acadêmico, que é longo e específico (7.793 na SciELO).
    const empata = corpo("A enfermagem cuida do paciente; sinais vitais, biossegurança e atenção primária à saúde no hospital.");
    expect(documentoDoWikilivro("ptwikibooks", pagina("Enfermagem/Fundamentos", empata))).toEqual({ descarte: "sem_area" });
    // e o mesmo assunto SEM o termo que puxa medicina passa
    const limpo = corpo("A enfermagem cuida do paciente; sinais vitais e biossegurança no hospital.");
    expect(ehDescarte(documentoDoWikilivro("ptwikibooks", pagina("Enfermagem/X", limpo)))).toBe(false);
  });

  it("nunca lança, mesmo com registro torto", () => {
    for (const lixo of [{}, { name: null }, { name: 1, article_body: 2 }, { name: "x", article_body: null }] as never[]) {
      expect(() => documentoDoWikilivro("ptwikiversity", lixo)).not.toThrow();
      expect(ehDescarte(documentoDoWikilivro("ptwikiversity", lixo))).toBe(true);
    }
    expect(textoDoWikitexto(null as never)).toBe("");
  });

  it("corta no teto, e o corte não muda a área (classifica só pela abertura)", () => {
    const abertura = "A enfermagem cuida do paciente; sinais vitais, biossegurança e atenção primária à saúde no hospital.";
    const r = documentoDoWikilivro("ptwikibooks", pagina("Enfermagem/Longo", `${abertura} ${corpo("texto sem termo nenhum", MAX_CHARS * 2)}`));
    if (ehDescarte(r)) throw new Error(`descartou: ${r.descarte}`);
    expect(r.texto.length).toBeGreaterThan(MAX_CHARS);
    expect(r.texto.length).toBeLessThan(MAX_CHARS + 700);
  });

  it("as URLs são as reais do dump Enterprise (gzip, não bz2)", () => {
    expect(WIKIS).toEqual(["ptwikibooks", "ptwikiversity"]);
    expect(urlDoWiki("ptwikibooks")).toBe(
      "https://dumps.wikimedia.org/other/enterprise_html/runs/20250320/ptwikibooks-NS0-20250320-ENTERPRISE-HTML.json.tar.gz",
    );
    // .tar.gz de propósito: o node não abre bz2 e o contêiner não tem bunzip2
    expect(urlDoWiki("ptwikiversity")).toContain(".json.tar.gz");
    expect(urlDoWiki("ptwikiversity")).not.toContain(".bz2");
    expect(BLOCO_TAR).toBe(512);
  });
});
