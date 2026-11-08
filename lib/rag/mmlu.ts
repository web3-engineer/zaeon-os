/**
 * lib/rag/mmlu.ts — o MMLU em PORTUGUÊS como base de questões por área.
 *
 * FONTE: `FreedomIntelligence/MMLU_Portuguese` no Hugging Face — licença **MIT**, lida do `cardData`
 * da API em 2026-11-08. É a tradução do MMLU (Hendrycks et al., 2021) para português: 57 matérias,
 * dois splits (`dev` com 5 questões por matéria, `test` com o resto), em CSV **sem cabeçalho** e com
 * 6 colunas — enunciado, A, B, C, D e a letra certa.
 *
 * POR QUE 20 QUESTÕES POR DOCUMENTO: uma questão sozinha é um documento de 300 caracteres, e o RAG
 * devolve DOCUMENTO. Mil documentos minúsculos entopem a busca e a citação ao aluno vira "uma
 * questão", sem contexto de matéria. Em lotes de 20 o documento tem corpo, a citação diz de que
 * matéria é, e o trecho recuperado traz questões vizinhas do mesmo assunto. É o mesmo desenho da
 * fonte `medicina` neste repositório, que já agrupa 20 pares pergunta/resposta.
 *
 * O MAPA de matéria → área é explícito e conservador: matéria que não é claramente de uma das nossas
 * áreas vai pra `geral`, nunca forçada. Forçar `professional_law` em `medicina` porque "é
 * profissional" seria encher a base da Zenita de lixo — e a base por área é o que define o que cada
 * agente sabe.
 */
import { AREA_GERAL } from "./areas";

export const MMLU_DATASET = "FreedomIntelligence/MMLU_Portuguese";
export const MMLU_SPLITS = ["dev", "test"] as const;
export const QUESTOES_POR_DOCUMENTO = 20;

/** Matéria do MMLU → { área nossa, nome em português }. A área `null` significa `geral`. */
export const MATERIAS: Readonly<Record<string, { area: string | null; nome: string }>> = {
  // medicina e saúde
  anatomy: { area: "medicina", nome: "Anatomia" },
  clinical_knowledge: { area: "medicina", nome: "Conhecimento clínico" },
  college_medicine: { area: "medicina", nome: "Medicina (superior)" },
  professional_medicine: { area: "medicina", nome: "Medicina profissional" },
  medical_genetics: { area: "medicina", nome: "Genética médica" },
  human_aging: { area: "medicina", nome: "Envelhecimento humano" },
  virology: { area: "medicina", nome: "Virologia" },
  nutrition: { area: "medicina", nome: "Nutrição" },
  // biologia
  college_biology: { area: "biologia", nome: "Biologia (superior)" },
  high_school_biology: { area: "biologia", nome: "Biologia (ensino médio)" },
  // química
  college_chemistry: { area: "quimica", nome: "Química (superior)" },
  high_school_chemistry: { area: "quimica", nome: "Química (ensino médio)" },
  // física e astronomia
  college_physics: { area: "fisica", nome: "Física (superior)" },
  high_school_physics: { area: "fisica", nome: "Física (ensino médio)" },
  conceptual_physics: { area: "fisica", nome: "Física conceitual" },
  astronomy: { area: "fisica", nome: "Astronomia" },
  // matemática e lógica formal
  abstract_algebra: { area: "matematica", nome: "Álgebra abstrata" },
  college_mathematics: { area: "matematica", nome: "Matemática (superior)" },
  elementary_mathematics: { area: "matematica", nome: "Matemática elementar" },
  high_school_mathematics: { area: "matematica", nome: "Matemática (ensino médio)" },
  high_school_statistics: { area: "matematica", nome: "Estatística (ensino médio)" },
  formal_logic: { area: "matematica", nome: "Lógica formal" },
  // computação
  college_computer_science: { area: "eng-computacao", nome: "Ciência da computação (superior)" },
  high_school_computer_science: { area: "eng-computacao", nome: "Ciência da computação (ensino médio)" },
  // segurança
  computer_security: { area: "seguranca", nome: "Segurança computacional" },
  security_studies: { area: "seguranca", nome: "Estudos de segurança" },
  // dados e IA
  machine_learning: { area: "dados-ia", nome: "Aprendizado de máquina" },
  econometrics: { area: "dados-ia", nome: "Econometria" },
  // energias
  electrical_engineering: { area: "eng-energias", nome: "Engenharia elétrica" },
  // psicologia
  high_school_psychology: { area: "psicologia", nome: "Psicologia (ensino médio)" },
  professional_psychology: { area: "psicologia", nome: "Psicologia profissional" },

  // ── Daqui pra baixo vai tudo pra `geral`, de propósito. ──
  // As três de DIREITO ficam aqui porque a área `direito` ainda não existe: o agente de leis é
  // decisão adiada do dono, e área sem mentor rouba classificação (ver seção 9.2 dos docs). Quando
  // ele existir, é só trocar `null` por "direito" nestas três e reingerir.
  international_law: { area: null, nome: "Direito internacional" },
  jurisprudence: { area: null, nome: "Jurisprudência" },
  professional_law: { area: null, nome: "Direito profissional" },
  business_ethics: { area: null, nome: "Ética empresarial" },
  global_facts: { area: null, nome: "Fatos globais" },
  high_school_european_history: { area: null, nome: "História da Europa (ensino médio)" },
  high_school_geography: { area: null, nome: "Geografia (ensino médio)" },
  high_school_government_and_politics: { area: null, nome: "Governo e política (ensino médio)" },
  high_school_macroeconomics: { area: null, nome: "Macroeconomia (ensino médio)" },
  high_school_microeconomics: { area: null, nome: "Microeconomia (ensino médio)" },
  high_school_us_history: { area: null, nome: "História dos EUA (ensino médio)" },
  high_school_world_history: { area: null, nome: "História mundial (ensino médio)" },
  human_sexuality: { area: null, nome: "Sexualidade humana" },
  logical_fallacies: { area: null, nome: "Falácias lógicas" },
  management: { area: null, nome: "Administração" },
  marketing: { area: null, nome: "Marketing" },
  miscellaneous: { area: null, nome: "Conhecimentos gerais" },
  moral_disputes: { area: null, nome: "Disputas morais" },
  moral_scenarios: { area: null, nome: "Cenários morais" },
  philosophy: { area: null, nome: "Filosofia" },
  prehistory: { area: null, nome: "Pré-história" },
  professional_accounting: { area: null, nome: "Contabilidade profissional" },
  public_relations: { area: null, nome: "Relações públicas" },
  sociology: { area: null, nome: "Sociologia" },
  us_foreign_policy: { area: null, nome: "Política externa dos EUA" },
  world_religions: { area: null, nome: "Religiões do mundo" },
};

export const areaDaMateria = (materia: string): string => MATERIAS[materia]?.area ?? AREA_GERAL;
export const nomeDaMateria = (materia: string): string => MATERIAS[materia]?.nome ?? materia;

export const urlDoCsv = (split: string, materia: string) =>
  `https://huggingface.co/datasets/${MMLU_DATASET}/resolve/main/mmlu_Portuguese/${split}/${materia}_${split}.csv`;

/**
 * CSV → linhas de campos. Escrito à mão de propósito: o enunciado do MMLU tem vírgula, aspas e
 * QUEBRA DE LINHA dentro do campo (equação em várias linhas), então `split(",")` e `split("\n")`
 * perdem ou partem questão. Regra do RFC 4180: aspas protegem o campo e `""` é uma aspa literal.
 */
export function linhasDoCsv(texto: string): string[][] {
  const fora: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let dentroDeAspas = false;
  const t = String(texto ?? "").replace(/\r\n?/g, "\n");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (dentroDeAspas) {
      if (c === '"') {
        if (t[i + 1] === '"') { campo += '"'; i++; } else dentroDeAspas = false;
      } else campo += c;
      continue;
    }
    if (c === '"') { dentroDeAspas = true; continue; }
    if (c === ",") { linha.push(campo); campo = ""; continue; }
    if (c === "\n") { linha.push(campo); fora.push(linha); linha = []; campo = ""; continue; }
    campo += c;
  }
  // última linha sem \n no fim do arquivo
  if (campo !== "" || linha.length) { linha.push(campo); fora.push(linha); }
  return fora.filter((l) => l.some((x) => x.trim() !== ""));
}

const LETRAS = ["A", "B", "C", "D"] as const;

/**
 * Uma linha do CSV → o texto da questão com gabarito, ou null se a linha estiver torta.
 * Nunca lança: são 14 mil linhas e uma torta não pode derrubar a carga.
 *
 * O gabarito sai escrito por extenso (`Gabarito: C) 600 nm`) e não só como letra: o trecho
 * recuperado pelo RAG pode cortar as alternativas, e "Gabarito: C" sem o texto da C não ensina nada.
 */
export function questaoMmlu(linha: readonly unknown[]): string | null {
  if (!Array.isArray(linha) || linha.length < 6) return null;
  const enunciado = String(linha[0] ?? "").trim();
  const alts = LETRAS.map((_, i) => String(linha[i + 1] ?? "").trim());
  const letra = String(linha[5] ?? "").trim().toUpperCase();
  const i = LETRAS.indexOf(letra as (typeof LETRAS)[number]);
  if (!enunciado || i < 0 || alts.some((a) => !a)) return null;
  const opcoes = alts.map((a, j) => `${LETRAS[j]}) ${a}`).join("\n");
  return `**${enunciado}**\n${opcoes}\nGabarito: ${letra}) ${alts[i]}`;
}

export type DocumentoMmlu = { chave: string; titulo: string; texto: string; area: string };

/**
 * As questões de UMA matéria → documentos de `QUESTOES_POR_DOCUMENTO` questões.
 * O último documento sai menor; descartá-lo perderia até 19 questões sem motivo.
 */
export function documentosDaMateria(materia: string, questoes: readonly string[]): DocumentoMmlu[] {
  const nome = nomeDaMateria(materia);
  const area = areaDaMateria(materia);
  const fonte = `Fonte: ${MMLU_DATASET} (Hugging Face) — licença MIT. `
    + "Tradução para português do MMLU (Hendrycks et al., 2021), matéria "
    + `\`${materia}\`.`;
  const fora: DocumentoMmlu[] = [];
  for (let i = 0; i < questoes.length; i += QUESTOES_POR_DOCUMENTO) {
    const lote = questoes.slice(i, i + QUESTOES_POR_DOCUMENTO);
    const parte = Math.floor(i / QUESTOES_POR_DOCUMENTO) + 1;
    fora.push({
      chave: `mmlu-pt-${materia}-${parte}`,
      titulo: `${nome} — questões de prova (MMLU pt) — parte ${parte}`,
      texto: `# ${nome} — questões de prova\n\n${lote.join("\n\n")}\n\n${fonte}`,
      area,
    });
  }
  return fora;
}
