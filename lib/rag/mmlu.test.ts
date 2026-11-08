import { describe, it, expect } from "vitest";
import {
  MATERIAS, MMLU_DATASET, QUESTOES_POR_DOCUMENTO,
  areaDaMateria, documentosDaMateria, linhasDoCsv, nomeDaMateria, questaoMmlu, urlDoCsv,
} from "./mmlu";
import { AREA_GERAL, SLUGS_AREA } from "./areas";

const linha = (q: string, a: string, b: string, c: string, d: string, g: string) => [q, a, b, c, d, g];

describe("MMLU em português como base de questões", () => {
  it("toda área do mapa EXISTE em lib/rag/areas — área inventada = documento invisível", () => {
    for (const [materia, m] of Object.entries(MATERIAS)) {
      if (m.area === null) continue;
      expect(SLUGS_AREA, `${materia} aponta pra área que não existe`).toContain(m.area);
    }
    // e o nome em português nunca fica vazio: ele vai pro título do documento
    for (const [materia, m] of Object.entries(MATERIAS)) {
      expect(m.nome.length, materia).toBeGreaterThan(2);
      expect(m.nome, materia).not.toBe(materia);
    }
  });

  it("as 57 matérias do dataset estão todas mapeadas, nenhuma a mais", () => {
    // lista real lida da API do Hugging Face em 2026-11-08 (split test, 57 CSVs)
    const reais = [
      "abstract_algebra", "anatomy", "astronomy", "business_ethics", "clinical_knowledge",
      "college_biology", "college_chemistry", "college_computer_science", "college_mathematics",
      "college_medicine", "college_physics", "computer_security", "conceptual_physics",
      "econometrics", "electrical_engineering", "elementary_mathematics", "formal_logic",
      "global_facts", "high_school_biology", "high_school_chemistry", "high_school_computer_science",
      "high_school_european_history", "high_school_geography", "high_school_government_and_politics",
      "high_school_macroeconomics", "high_school_mathematics", "high_school_microeconomics",
      "high_school_physics", "high_school_psychology", "high_school_statistics",
      "high_school_us_history", "high_school_world_history", "human_aging", "human_sexuality",
      "international_law", "jurisprudence", "logical_fallacies", "machine_learning", "management",
      "marketing", "medical_genetics", "miscellaneous", "moral_disputes", "moral_scenarios",
      "nutrition", "philosophy", "prehistory", "professional_accounting", "professional_law",
      "professional_medicine", "professional_psychology", "public_relations", "security_studies",
      "sociology", "us_foreign_policy", "virology", "world_religions",
    ];
    expect(reais).toHaveLength(57);
    expect(Object.keys(MATERIAS).sort()).toEqual([...reais].sort());
  });

  it("matéria não mapeada cai em `geral`, não é forçada numa área", () => {
    expect(areaDaMateria("materia_que_nao_existe")).toBe(AREA_GERAL);
    // as três de direito ficam em `geral` porque a área `direito` ainda não tem mentor
    for (const m of ["international_law", "jurisprudence", "professional_law"]) {
      expect(areaDaMateria(m), m).toBe(AREA_GERAL);
      expect(nomeDaMateria(m), m).toMatch(/Direito|Jurisprud/);
    }
    expect(areaDaMateria("anatomy")).toBe("medicina");
    expect(areaDaMateria("machine_learning")).toBe("dados-ia");
    expect(areaDaMateria("computer_security")).toBe("seguranca");
  });

  it("a questão sai com o gabarito ESCRITO, não só a letra", () => {
    const q = questaoMmlu(linha(
      "Luz branca incide normalmente em uma poça de água. Qual comprimento de onda?",
      "500 nm", "550 nm", "600 nm", "650 nm", "C",
    ));
    expect(q).toContain("**Luz branca incide");
    expect(q).toContain("A) 500 nm");
    expect(q).toContain("D) 650 nm");
    // "Gabarito: C" sozinho não ensina nada se o trecho recuperado cortar as alternativas
    expect(q).toContain("Gabarito: C) 600 nm");
  });

  it("linha torta devolve null e não lança — são 14 mil linhas", () => {
    for (const ruim of [
      [], ["só o enunciado"], linha("q", "a", "b", "c", "d", "Z"),
      linha("", "a", "b", "c", "d", "A"), linha("q", "a", "", "c", "d", "A"),
      null, undefined, "texto", 42,
    ] as never[]) {
      expect(() => questaoMmlu(ruim)).not.toThrow();
      expect(questaoMmlu(ruim)).toBeNull();
    }
    // gabarito em minúscula é aceito: é dado de terceiro, não vale perder a questão por isso
    expect(questaoMmlu(linha("q", "a", "b", "c", "d", "b"))).toContain("Gabarito: B) b");
  });

  it("agrupa em lotes de 20, numera as partes e mantém a sobra", () => {
    const qs = Array.from({ length: 45 }, (_, i) => `questão ${i}`);
    const docs = documentosDaMateria("anatomy", qs);
    expect(docs).toHaveLength(3);
    expect(docs.map((d) => d.chave)).toEqual(["mmlu-pt-anatomy-1", "mmlu-pt-anatomy-2", "mmlu-pt-anatomy-3"]);
    expect(docs[0]!.area).toBe("medicina");
    expect(docs[0]!.titulo).toBe("Anatomia — questões de prova (MMLU pt) — parte 1");
    // o último lote tem 5 e NÃO é descartado: jogar fora perderia até 19 questões
    expect(docs[2]!.texto).toContain("questão 44");
    expect(docs[2]!.texto).not.toContain("questão 39\n");
    expect(QUESTOES_POR_DOCUMENTO).toBe(20);
  });

  it("todo documento carrega a licença MIT e a matéria de origem", () => {
    const [doc] = documentosDaMateria("machine_learning", ["q1"]);
    expect(doc!.texto).toContain("licença MIT");
    expect(doc!.texto).toContain(MMLU_DATASET);
    expect(doc!.texto).toContain("Hendrycks");
    expect(doc!.texto).toContain("`machine_learning`");
  });

  it("vazio não gera documento (não se ingere matéria que não baixou)", () => {
    expect(documentosDaMateria("anatomy", [])).toEqual([]);
  });

  it("o CSV do MMLU tem vírgula, aspas e QUEBRA DE LINHA no campo — split() perderia questão", () => {
    const csv = [
      '"Qual, entre as opções, é a correta?",a,b,c,d,A',
      '"Ele disse ""olá"" e saiu",um,dois,tres,quatro,B',
      '"Resolva:\nx + 1 = 2\ny = 3",r1,r2,r3,r4,C',
      "sem aspas nenhuma,a,b,c,d,D",
      "",
    ].join("\n");
    const l = linhasDoCsv(csv);
    expect(l, "4 questões: a linha vazia do fim não conta").toHaveLength(4);
    expect(l[0]![0]).toBe("Qual, entre as opções, é a correta?");   // vírgula preservada
    expect(l[0]).toHaveLength(6);
    expect(l[1]![0]).toBe('Ele disse "olá" e saiu');                 // "" → uma aspa
    expect(l[2]![0]).toBe("Resolva:\nx + 1 = 2\ny = 3");             // quebra DENTRO do campo
    expect(l[2]).toHaveLength(6);
    expect(l[3]![5]).toBe("D");
    // e o caminho completo: a linha com vírgula vira questão sem se partir
    expect(questaoMmlu(l[0]!)).toContain("Qual, entre as opções");
  });

  it("CRLF e arquivo sem quebra no fim não comem a última questão", () => {
    const l = linhasDoCsv("q1,a,b,c,d,A\r\nq2,a,b,c,d,B");
    expect(l).toHaveLength(2);
    expect(l[1]![0]).toBe("q2");
    expect(l[0]![5]).toBe("A");
  });

  it("as URLs dos CSVs são as reais do dataset", () => {
    expect(urlDoCsv("test", "college_physics")).toBe(
      "https://huggingface.co/datasets/FreedomIntelligence/MMLU_Portuguese/resolve/main/mmlu_Portuguese/test/college_physics_test.csv",
    );
    expect(urlDoCsv("dev", "anatomy")).toContain("/dev/anatomy_dev.csv");
  });
});
