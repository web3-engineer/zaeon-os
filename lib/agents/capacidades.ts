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
export const TOOLS_POR_HABILIDADE: Readonly<Record<MentorSkill, readonly string[]>> = {
  literature: ["literature_search", "book_search"],
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
export const HABILIDADES_DISTINTIVAS: readonly MentorSkill[] = ["literature", "code", "molecule", "anatomia"];

export type CapacidadeDoAgente = {
  /** a persona em lib/ai/personas.ts (a voz) */
  persona: string;
  /** o que ela sabe fazer ALÉM da base */
  habilidades: readonly MentorSkill[];
  /** a base por área do RAG (lib/rag/areas) que o turno dela consulta; null = só a geral */
  area: string | null;
  /** uma linha sobre o que a distingue — é o que o seletor mostra */
  distincao: string;
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
  },
  zenita: {
    persona: "zenita",
    habilidades: ["anatomia", "literature"],
    area: "medicina",
    distincao: "Medicina: o atlas de anatomia 3D e a base de saúde (a agenda é do Davi).",
  },
  nina: {
    persona: "nina",
    habilidades: [],
    area: null,
    distincao: "Caderno: resumo, plano de estudo e revisão — sem busca externa.",
  },
  octa: {
    persona: "aura", // o Octa abre a IDE, não o chat (chatAgentes: tela "ide"); a voz do chat não é dele
    habilidades: ["code"],
    area: null,
    distincao: "Código, na IDE dele — não no chat.",
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
