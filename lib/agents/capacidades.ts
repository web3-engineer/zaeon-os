/**
 * lib/agents/capacidades.ts — A ESTRUTURA do chat: quem são as agentes, o que TODAS têm, e o que
 * distingue uma da outra. PURO (nenhum import de rede, banco ou three.js): dá pra testar e dá pra
 * ler como mapa.
 *
 * ─────────────────────────── COMO O CHAT FUNCIONA HOJE (medido, não suposto) ───────────────────────────
 *
 * 1. O seletor da sidebar (`app/research-lab/page.tsx`) guarda a escolha em
 *    localStorage("zaeon.lab.agente") e a usa pro ROSTO e pro evento `zaeon:agente`. Nada mais.
 * 2. `lib/chat/auraClient.ts` montava o corpo com `agent: "aura"` FIXO.
 * 3. `app/api/ai/chat/route.ts` lê `agent` e cai em `DEFAULT_AGENT_ID` quando não vem.
 * 4. Resultado: a escolha nunca chegava ao servidor — todo turno era a Aura. É isso que o dono via
 *    como "o seletor não troca de agente": ele trocava o rosto, não a conversa.
 * 5. PIOR que isso, e o motivo de este arquivo existir: o harness está gateado em
 *    `agentKey === "aura"` (três vezes: anexo, anexo-no-harness e o turno). Mandar `agent:"zenita"`
 *    sem mais nada não consertaria — DESLIGARIA o harness e a Zenita perderia laço, tools, base
 *    RAG, memória, anexo, a rede da F0 e a regra de tabela. Trocaria um agente mudo por um burro.
 *
 * ─────────────────────────── A REGRA QUE O DONO PEDIU ───────────────────────────
 *
 *   "precisamos de agentes que tenham todas as capacidades de harness em um mesmo nível
 *    — mas com habilidades diferentes."
 *
 * Então são DOIS conjuntos, e eles não se misturam:
 *
 *   BASE (todas, no mesmo nível): o laço do harness e as tools que ele sempre teve —
 *     memória, busca na web, Leitor, anexo, examinador, artefato do Studio. Quem perde uma
 *     destas não é "outra habilidade": é uma agente pior.
 *
 *   HABILIDADE (o que distingue): `literature`, `code`, `molecule`, `anatomia`.
 *     É o único eixo em que elas diferem. `memory` e `studio` aparecem em MentorSkill por
 *     história, mas os 13 mentores do `MENTOR_SEED` declaram as duas — ou seja, já são base.
 *     Mantê-las na lista de habilidades seria fingir distinção onde não há.
 *
 * `molecule` NÃO é tool: é um `studioKind` (lib/studio/molecule.ts, via `studio_generate`). Está
 * aqui como habilidade porque é o que o aluno vê como diferença, mas o portão dela mora no catálogo
 * do Studio, não no registro de tools — e por isso o mapa abaixo a declara sem tool. Declarar uma
 * tool que não existe é justamente a mentira que `RUNTIME_SKILLS` foi criada pra impedir.
 */
import type { AgenteChatId } from "@/lib/agents/chatAgentes";
import type { MentorSkill } from "@/lib/agent/mentors";

/**
 * As tools do harness que TODA agente do chat tem. São as que `lib/agent/runtime.ts` registra sem
 * condição (`runtime.ts:416` e `:453`) mais as duas condicionais que dependem de CONFIGURAÇÃO do
 * servidor, não da agente: `abrir_url` (Leitor ligado) e `baixar_para_base`. Se o servidor não as
 * tem, ninguém as tem — e isso é verdade igual pra todas, que é o que "mesmo nível" quer dizer.
 */
export const TOOLS_BASE: readonly string[] = [
  "memory_search",
  "web_search",
  "abrir_url",
  "baixar_para_base",
  "listar_anexos",
  "ler_anexo",
  "examiner",
  "studio_generate",
  "research_generate",
];

/**
 * Habilidade → as tools que ELA abre, além da base. Lista vazia = a habilidade existe mas não se
 * expressa em tool (ver `molecule` no cabeçalho).
 */
/**
 * O conector do SolidCraft (lib/cad/mcp) e as 21 tools que ele expõe — MEDIDAS, não supostas: subi
 * `solidcraft-cli mcp --headless` 0.40.0-rc.3, fiz o handshake e li o `tools/list`. Todas as 21 vêm
 * anotadas (`readOnlyHint`/`destructiveHint`), então `riskFromAnnotations` as classifica certo.
 *
 * O nome no NOSSO registro é `mcp:<conector>:<tool>` (lib/agent/mcp.ts:141 e :161) — não `execute`.
 */
export const CONECTOR_CAD = "solidcraft";
export const TOOLS_DO_SOLIDCRAFT: readonly string[] = [
  "list_commands", "describe_command", "execute", "batch", "inspect_design", "measure",
  "body_topology", "set_parameter", "check_parameters", "screenshot", "compare_picture",
  "export", "pending", "crash_reports", "skill_reference", "running", "new_design", "open", "save",
];
const cad = (t: string) => `mcp:${CONECTOR_CAD}:${t}`;

export const TOOLS_POR_HABILIDADE: Readonly<Record<MentorSkill, readonly string[]>> = {
  literature: ["literature_search", "book_search"],
  /**
   * `cad`: as tools do SolidCraft que o Eiffel usa. `crash_reports` fica FORA de propósito — ela lê
   * relatórios de crash da máquina, que não é assunto de aluno e não é trabalho de engenharia.
   * `skill_reference` entra primeiro na lista porque é por onde o agente começa: o servidor manda no
   * `initialize` que o agente leia as skills antes de modelar.
   */
  cad: [
    cad("skill_reference"), cad("list_commands"), cad("describe_command"),
    cad("new_design"), cad("open"), cad("execute"), cad("batch"), cad("set_parameter"),
    cad("inspect_design"), cad("measure"), cad("body_topology"), cad("check_parameters"),
    cad("screenshot"), cad("compare_picture"), cad("export"), cad("save"),
    cad("pending"), cad("running"),
  ],
  anatomia: ["buscar_anatomia", "inspecionar_anatomia"],
  /**
   * O Octa tem onze tools (`octa_ler`, `octa_escrever`, `octa_publicar`, …), e TODAS moram na IDE
   * dele (`lib/octa/agente.ts`, tela "ide" em chatAgentes) — o turno do chat nunca as vê. Listá-las
   * aqui seria declarar o que este portão não tem como testar, então a lista é vazia de propósito.
   */
  code: [],
  molecule: [],
  // base, não habilidade — ficam aqui vazias de propósito pro mapa cobrir MentorSkill inteiro
  memory: [],
  studio: [],
};

/** As quatro que DISTINGUEM uma agente da outra (o resto é base). */
export const HABILIDADES_DISTINTIVAS: readonly MentorSkill[] = ["literature", "code", "molecule", "anatomia", "cad"];

/**
 * O PROTOCOLO DE RACIOCÍNIO DO CARGO — o que `reflections`/`ensemble` deveriam ter sido.
 *
 * Eles nasceram em `INTENTS` (lib/agent/contracts), copiados do AI-Scientist, e nunca foram lidos
 * por ninguém. MEDI o motivo, e ele é estrutural, não esquecimento: no AI-Scientist o revisor é um
 * MODELO, então faz sentido amostrá-lo N vezes e agregar. O NOSSO crítico é CÓDIGO
 * (`lib/agent/examiner.ts` não tem uma chamada de modelo; o cabeçalho do harness diz que
 * "plan/reason/draft são as ÚNICAS chamadas de geração"). Um ensemble de função pura devolve N
 * vereditos idênticos. Eles estavam no lugar onde não podiam funcionar.
 *
 * Então eles mudam de lugar E de dono: saem da TAREFA e vêm pro CARGO, onde o dono quer a diferença.
 *
 *   `ensemble`  → N rascunhos independentes, e quem escolhe é o nosso crítico determinístico.
 *                 Aqui o crítico ser código deixa de ser limitação e passa a ser vantagem: é um
 *                 juiz grátis, consistente e sem variância própria. Ideia do Medprompt
 *                 (microsoft/promptbase, MIT): em medicina, uma amostra só é arriscada.
 *   `reflexoes` → quantas vezes este cargo REVISA contra a própria crítica. Não é laço novo: é o
 *                 `maxRevisions` do laço que já existe e em que já confiamos (trajectory.ts). Criar
 *                 um laço interno de autocrítica ao lado dele seria duplicar reflexão — o defeito de
 *                 importar um desenho sem olhar o que a casa já tem.
 *
 * CONTAGEM EXPLÍCITA, ao contrário do AI-Scientist: lá `num_reflections=1` significa NENHUMA
 * (`for j in range(num_reflections - 1)`), o que é uma armadilha. Aqui 0 é zero.
 *
 * O TETO É DO MODO, não do cargo — e mora em `lib/agent/trajectory.ts`, ao lado do `BUDGET` e do
 * `COST` de onde ele foi derivado. Teto longe do orçamento que o justifica vira número que o ledger
 * desfaz, que é a mentira que o comentário da F6 recusou escrever. Aqui fica só o PEDIDO do cargo.
 */
export type Protocolo = {
  /** rascunhos independentes; 1 = o de sempre. O modo corta pra cima (ENSEMBLE_MAX_POR_MODO). */
  ensemble: number;
  /** voltas de revisão contra a própria crítica; 0 = aceita o 1º rascunho aprovado */
  reflexoes: number;
  /** uma linha: por que ESTE protocolo pra ESTE cargo (fica no código, não num doc que ninguém abre) */
  porque: string;
};

export type CapacidadeDoAgente = {
  /** a persona em lib/ai/personas.ts (a voz) */
  persona: string;
  /** o que ela sabe fazer ALÉM da base */
  habilidades: readonly MentorSkill[];
  /** a base por área do RAG (lib/rag/areas) que o turno dela consulta; null = só a geral */
  area: string | null;
  /** uma linha sobre o que a distingue — é o que o seletor mostra */
  distincao: string;
  /**
   * O VOCABULÁRIO DO CAMPO DELA, em forma de pergunta — usado pelo portão de conhecimento
   * específico (lib/agents/escopo).
   *
   * Por que não bastam os termos de `lib/rag/areas`: aquelas listas foram escritas pra classificar
   * TÍTULO + RESUMO de artigo da SciELO ("paciente", "mortalidade", "neoplasia"). Numa pergunta de
   * aluno elas quase nunca batem — "me explica o ciclo de Krebs" não casa com nenhum termo de
   * medicina. Sem esta lista, a Zenita RECUSARIA o próprio campo, que é a falha mais grave que o
   * portão pode ter. A lista de área continua valendo pra identificar a área ALHEIA; esta identifica
   * a própria.
   *
   * Vazia na generalista: quem não tem área não é gateada.
   */
  termosProprios: readonly string[];
  /** como ESTE cargo raciocina (ver Protocolo acima) */
  protocolo: Protocolo;
};

/**
 * O MAPA. Toda agente do chat está aqui, e é daqui que o turno tira identidade, habilidades e base.
 *
 * A Zenita assumiu MEDICINA (decisão do dono, 2026-11-07: "Zenita assume, Osler sai"): é ela que usa
 * o atlas (`anatomia`) e a base de área `medicina` — onde entram os datasets de saúde do Hugging Face
 * (scripts/ingerir-bases-area.ts, fonte `medicina`).
 *
 * A AGENDA SAIU DELA, e isso eu medi em vez de supor: nenhum chamador do app manda
 * `agent: "zenita"` — quem cuida de agenda é o Davi (`core_active`), pela tela de Aulas
 * (components/sub/ClassesView.tsx). A frase "USE A FERRAMENTA 'update_schedule'" na persona dela
 * prometia, desde sempre, uma ação que não acontecia: `update_schedule` não está no registro de
 * tools do harness, e o ramo em streaming do caminho legado só tratava `studio_generate` e
 * `research_generate` — um `update_schedule` ali era descartado em silêncio.
 */
export const CAPACIDADES: Readonly<Record<AgenteChatId, CapacidadeDoAgente>> = {
  aura: {
    persona: "aura",
    habilidades: ["literature"],
    area: null,
    distincao: "Pesquisa acadêmica: busca em bases e livros, e redige o trabalho.",
    termosProprios: [],
    protocolo: {
      ensemble: 1,
      reflexoes: 2,
      porque: "Pesquisa se corrige relendo, não reamostrando: o risco dela é afirmação sem lastro, "
        + "e isso a crítica pega e manda revisar. Reamostrar o mesmo prompt não acha fonte que falta.",
    },
  },
  zenita: {
    persona: "zenita",
    habilidades: ["anatomia", "literature"],
    area: "medicina",
    distincao: "Medicina: o atlas de anatomia 3D e a base de saúde (a agenda é do Davi).",
    protocolo: {
      ensemble: 3,
      reflexoes: 0,
      porque: "Medprompt: em fato clínico, uma amostra só é arriscada — três rascunhos e o crítico "
        + "escolhe. Zero revisão é de propósito, não economia: ela gasta em LARGURA, a Aura em "
        + "PROFUNDIDADE. O erro dela não é falta de fonte, é a variância de uma afirmação sobre o "
        + "corpo de alguém, e reler o mesmo rascunho não reduz variância.",
    },
    // anatomia, fisiologia, semiologia, farmacologia — o que um aluno de saúde PERGUNTA.
    // Radicais, não palavras inteiras: "fisiolog" cobre fisiologia/fisiológico/fisiopatologia.
    termosProprios: [
      "anatomi", "fisiolog", "fisiopatolog", "histolog", "embriolog", "patolog", "semiolog",
      "farmacolog", "farmacocinet", "farmacodinam", "posolog", "medicament", "remedi", "dose",
      "metabol", "ciclo de krebs", "glicolis", "homeostas", "hormon", "endocrin", "enzima",
      "neuro", "nervo", "cerebr", "medula", "sinapse", "neurotransmiss",
      "muscul", "osso", "ossea", "esquelet", "articula", "tendao", "ligament", "cartilag",
      "sangue", "sanguine", "hemat", "plaqueta", "hemoglobin", "coagula", "anemi",
      "coracao", "cardiac", "arteri", "veia", "venos", "pressao arterial", "circulat",
      "pulmao", "pulmonar", "respirat", "alveol", "brônqui", "bronqui",
      "estomago", "intestin", "figado", "hepat", "rim", "renal", "bexiga", "digest",
      "imun", "anticorp", "antigen", "linfocit", "inflamac", "infecc", "virus", "viral",
      "bacteri", "fung", "parasit", "antibiotic", "vacina",
      "celula", "tecido", "orgao", "sistema nervoso", "sistema digestivo", "sistema imune",
      "sintoma", "sinal clinic", "exame fisic", "anamnese", "prognostic", "etiolog",
      "gestac", "gravidez", "parto", "fetal", "neonat",
      "oncolog", "tumor", "metastas", "quimioterap", "radioterap",
    ],
  },
  nina: {
    persona: "nina",
    habilidades: [],
    area: null,
    distincao: "Caderno: resumo, plano de estudo e revisão — sem busca externa.",
    termosProprios: [],
    protocolo: {
      ensemble: 1,
      reflexoes: 0,
      porque: "O valor dela é clareza didática, não variância nem fonte. Um rascunho e o que a "
        + "intenção já pedir: gastar três amostras pra resumir um caderno é custo que o aluno não vê.",
    },
  },
  /**
   * O EIFFEL (decisão do dono, 2026-11-08): engenharia civil e estrutural, com CAD paramétrico de
   * verdade pelo SolidCraft (docs/HANDOFF_EIFFEL_CAD.md). Plugável pela loja — ele não aparece no
   * seletor até o aluno adicionar, porque CAD é ferramenta de ofício.
   *
   * `Engenharia Civil` passou a existir em constants/courses.ts no mesmo commit: antes ele era um
   * mentor servindo curso que a plataforma não oferecia.
   */
  eiffel: {
    persona: "eiffel",
    habilidades: ["cad", "literature"],
    area: "eng-civil",
    distincao: "Arquitetura e engenharia civil/estrutural: modela a peça em CAD paramétrico e entrega o STEP.",
    // vocabulário de PERGUNTA do campo dele (as listas de lib/rag/areas são de resumo de artigo)
    termosProprios: [
      "estrutur", "viga", "pilar", "laje", "fundac", "sapata", "estaca", "radier",
      "concreto", "armadur", "aco estrutural", "alvenaria", "argamassa", "cimento", "agregado",
      "flexao", "cisalhament", "torcao", "compressao", "tracao", "momento fletor", "esforco",
      "carga", "sobrecarga", "reacao de apoio", "treliça", "trelica", "portico", "balanco",
      "tensao admissivel", "deformac", "flecha", "flambagem", "fadiga",
      "nbr", "abnt nbr", "norma tecnica", "dimensionament", "memorial de calculo",
      "topografi", "terraplen", "drenagem", "pavimento", "asfalto", "geotecn", "solo",
      "hidraulic", "saneament", "esgoto", "reservatorio", "barragem", "ponte", "viaduto",
      "arquitetur", "projeto arquitetonico", "partido", "implantac", "fachada", "ambiente",
      "programa de necessidades", "circulac", "insolac", "layout", "ergonomia",
      "cad", "desenho tecnico", "planta baixa", "corte", "elevacao", "cota", "escala",
      "parametric", "extrusao", "chanfro", "filete", "esboco", "sketch", "step", "dxf",
      "momento de inercia", "centro de massa", "modulo de elasticidade", "coeficiente de seguranca",
    ],
    protocolo: {
      ensemble: 1,
      reflexoes: 2,
      porque: "Engenharia tem resposta VERIFICÁVEL: o `measure` do SolidCraft devolve volume, área e "
        + "centro de massa, e o `check_parameters` testa valores sem gravar. Então o ganho está em "
        + "revisar contra o número medido, não em reamostrar — três rascunhos de uma peça errada "
        + "continuam errados, e o crítico não sabe estática.",
    },
  },
  octa: {
    persona: "aura", // o Octa abre a IDE, não o chat (chatAgentes: tela "ide"); a voz do chat não é dele
    habilidades: ["code"],
    area: null,
    distincao: "Código, na IDE dele — não no chat.",
    termosProprios: [],
    protocolo: {
      ensemble: 1,
      reflexoes: 0,
      porque: "Não passa pelo turno do chat (tela de IDE); fica no mínimo pra não declarar "
        + "protocolo que nada executa.",
    },
  },
};

export const capacidadeDe = (id: AgenteChatId): CapacidadeDoAgente => CAPACIDADES[id] ?? CAPACIDADES.aura;

/**
 * As tools que este turno pode usar: a base + as das habilidades. É esta lista que o portão do
 * runtime consulta. Sem habilidade nenhuma a agente ainda tem a base inteira — é o que impede que
 * "habilidade diferente" degenere em "agente pela metade".
 */
export function toolsPermitidas(habilidades: readonly MentorSkill[]): ReadonlySet<string> {
  const fora = new Set<string>(TOOLS_BASE);
  for (const h of habilidades) for (const t of TOOLS_POR_HABILIDADE[h] ?? []) fora.add(t);
  return fora;
}

/**
 * As habilidades DESTE turno: as da agente, mais as do mentor ativo quando há um (o mentor é a Aura
 * parametrizada — ele acrescenta, nunca tira). Ordem estável e sem repetição, pra o prompt e o teste
 * não dependerem de ordem de iteração.
 */
export function habilidadesDoTurno(o: {
  agente: AgenteChatId;
  habilidadesDoMentor?: readonly MentorSkill[] | null;
}): readonly MentorSkill[] {
  const vistas = new Set<MentorSkill>(capacidadeDe(o.agente).habilidades);
  for (const h of o.habilidadesDoMentor ?? []) vistas.add(h);
  return [...vistas].sort();
}
