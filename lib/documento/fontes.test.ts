import { describe, it, expect } from "vitest";
import {
  FALTA_COMPLETAR, MAX_FONTES,
  blocoDeFontes, fonteDeDocumento, fonteDePagina, fonteDePaper, fontesCitadas, fontesDoTurno, juntarFontes,
} from "@/lib/documento/fontes";

describe("fonteDePaper · a única origem com autor e ano", () => {
  it("vira ABNT completa e citação autor-data", () => {
    const f = fonteDePaper({ title: "Fotossíntese em plantas C4", authors: "Maria Silva, João Souza", year: 2020, doi: "10.1/x" })!;
    expect(f.citacao).toBe("(SILVA, 2020)");
    expect(f.abnt).toContain("MARIA SILVA, JOÃO SOUZA.");
    expect(f.abnt).toContain("2020.");
    expect(f.abnt).toContain("DOI: 10.1/x");
    expect(f.abnt).not.toContain(FALTA_COMPLETAR);   // tem tudo: nada a completar
    expect(f.origem).toBe("literatura");
  });

  it("sem ano ou sem autor, a referência sai MARCADA — nunca inventada", () => {
    const semAno = fonteDePaper({ title: "T", authors: "Ana Lima" })!;
    expect(semAno.citacao).toBe("(LIMA, [s.d.])");
    expect(semAno.abnt).toContain(FALTA_COMPLETAR);
    const semAutor = fonteDePaper({ title: "Um título qualquer", year: 2021 })!;
    expect(semAutor.citacao).toBe("(Um título qualquer)");
    expect(semAutor.abnt).toContain(FALTA_COMPLETAR);
  });

  it("sem título não vira fonte (não dá pra citar o que não tem nome)", () => {
    expect(fonteDePaper({ year: 2020 })).toBeNull();
    expect(fonteDePaper({ title: "   " })).toBeNull();
  });
});

describe("fonteDeDocumento / fonteDePagina · o que o aluno trouxe e o que foi lido", () => {
  it("documento da base cita com página e entra MARCADO pra completar", () => {
    const f = fonteDeDocumento({ titulo: "Apostila de Bioquímica", paginas: "12", extrato: "o ciclo de Calvin…" })!;
    expect(f.citacao).toBe("(Apostila de Bioquímica, p. 12)");
    expect(f.abnt).toContain(FALTA_COMPLETAR);
    expect(f.extrato).toContain("Calvin");
    expect(f.origem).toBe("base");
  });

  it("anexo é a MESMA mecânica, com origem própria (muda o rótulo no prompt)", () => {
    expect(fonteDeDocumento({ titulo: "meu.pdf" }, "anexo")!.origem).toBe("anexo");
  });

  it("página da web leva URL e data de acesso", () => {
    const f = fonteDePagina({ titulo: "Nota técnica", url: "https://x.gov.br/a" }, new Date(2026, 1, 9))!;
    expect(f.abnt).toContain("Disponível em: https://x.gov.br/a");
    expect(f.abnt).toContain("Acesso em: 9 fev. 2026");
    expect(f.url).toBe("https://x.gov.br/a");
  });

  it("página sem URL não existe como fonte", () => {
    expect(fonteDePagina({ titulo: "sem link" })).toBeNull();
  });
});

describe("juntarFontes", () => {
  it("tira repetida e respeita o teto", () => {
    const a = fonteDePaper({ title: "A", authors: "Ana Lima", year: 2020 });
    const igual = fonteDePaper({ title: "A", authors: "Ana Lima", year: 2020 });
    expect(juntarFontes([a], [igual])).toHaveLength(1);
    const muitas = Array.from({ length: 30 }, (_, i) => fonteDePaper({ title: `T${i}`, authors: `A${i} Z${i}`, year: 2000 + i }));
    expect(juntarFontes(muitas)).toHaveLength(MAX_FONTES);
  });

  it("nulo no meio não quebra (os construtores devolvem null de propósito)", () => {
    expect(juntarFontes([null, fonteDePaper({ title: "T", authors: "Ana Lima", year: 2020 }), null])).toHaveLength(1);
  });
});

describe("blocoDeFontes · o que o modelo lê", () => {
  const fontes = juntarFontes([
    fonteDePaper({ title: "Paper", authors: "Ana Lima", year: 2020 }),
    fonteDeDocumento({ titulo: "Apostila", paginas: "3", extrato: "trecho" }),
  ]);

  it("manda a citação PRONTA (é o que torna o rastreio possível)", () => {
    const b = blocoDeFontes(fontes);
    expect(b).toContain("CITE ASSIM: (LIMA, 2020)");
    expect(b).toContain("CITE ASSIM: (Apostila, p. 3)");
    expect(b).toContain("DIZ: trecho");
    expect(b).toContain("não invente outra");
  });

  it("diz o que cada fonte É — artigo e documento do aluno não valem o mesmo", () => {
    const b = blocoDeFontes(fontes);
    expect(b).toContain("artigo");
    expect(b).toContain("documento da base do aluno");
  });

  it("sem fonte, bloco vazio — e aí o ⟨sem fonte⟩ do escritor é a resposta certa", () => {
    expect(blocoDeFontes([])).toBe("");
  });
});

describe("fontesDoTurno · o 1:1 entre o chat e o documento (D3)", () => {
  // os DOIS lados chamam esta função — o harness antes de redigir, pra pedir a citação pronta, e
  // `trabalhoDoTurno` depois, pra achar o que foi citado. Se as strings divergirem, a bibliografia
  // não enche. Este teste é o contrato dessa ida e volta.
  const papers = [{ title: "Membranas", authors: "Ana Lima", year: 2020 }];
  const base = [{ titulo: "Apostila", paginas: "7" }];

  it("a MESMA entrada dá a MESMA citação nos dois momentos", () => {
    const antes = fontesDoTurno(papers, base);
    const depois = fontesDoTurno(papers, base);
    expect(antes.map((f) => f.citacao)).toEqual(depois.map((f) => f.citacao));
    expect(antes.map((f) => f.citacao)).toEqual(["(Apostila, p. 7)", "(LIMA, 2020)"]);
  });

  it("ida e volta: o texto escrito com a citação pedida vira bibliografia", () => {
    const fontes = fontesDoTurno(papers, base);
    const escrito = `A bicamada é seletiva (LIMA, 2020), como mostra o material da disciplina (Apostila, p. 7).`;
    expect(fontesCitadas(escrito, fontes).map((f) => f.titulo)).toEqual(["Apostila", "Membranas"]);
  });

  it("a base do ALUNO vem primeiro — é a bibliografia que ele escolheu", () => {
    expect(fontesDoTurno(papers, base)[0]!.origem).toBe("base");
  });

  it("turno sem fonte nenhuma devolve lista vazia (e aí nada é citado nem referenciado)", () => {
    expect(fontesDoTurno()).toEqual([]);
    expect(fontesDoTurno([], [])).toEqual([]);
  });
});

describe("fontesCitadas · o elo entre escrever (D1) e referenciar (D2)", () => {
  const fontes = juntarFontes([
    fonteDePaper({ title: "Paper A", authors: "Ana Lima", year: 2020, url: "https://a" }),
    fonteDePaper({ title: "Paper B", authors: "Bia Rocha", year: 2021 }),
    fonteDeDocumento({ titulo: "Apostila", paginas: "3" }),
  ]);

  it("devolve SÓ o que o texto citou de verdade", () => {
    const texto = "A fotossíntese ocorre nos cloroplastos (LIMA, 2020). Outro ponto (Apostila, p. 3) confirma.";
    const citadas = fontesCitadas(texto, fontes);
    expect(citadas.map((f) => f.titulo)).toEqual(["Paper A", "Apostila"]);
    // e já sai no formato que `referenciasNovas`/`sugerirNoTcc` consomem
    // no ABNT de artigo a CAIXA ALTA é da autoria, não do título
    expect(citadas[0]).toMatchObject({ abnt: expect.stringContaining("ANA LIMA."), url: "https://a" });
    expect(citadas[0].abnt).toContain("Paper A.");
  });

  it("texto que não cita ninguém não inventa referência na bibliografia", () => {
    expect(fontesCitadas("Um parágrafo sem nenhuma citação.", fontes)).toEqual([]);
    expect(fontesCitadas("", fontes)).toEqual([]);
  });

  it("citação PARECIDA não conta — o casamento é pela string exata", () => {
    // é isto que evita bibliografia inflada por "(Lima 2020)" escrito à mão pelo modelo
    expect(fontesCitadas("algo (Lima, 2020) aqui", fontes)).toEqual([]);
    expect(fontesCitadas("algo (LIMA, 2021) aqui", fontes)).toEqual([]);
  });
});
