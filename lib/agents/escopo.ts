/**
 * lib/agents/escopo.ts — O PORTÃO DE CONHECIMENTO ESPECÍFICO (`specific_knowledge`).
 *
 * Roda a cada pergunta e responde UMA coisa: esta pergunta é do assunto desta agente?
 *
 *   passa   → é do assunto dela. Ela assume a resposta e segue o raciocínio normal.
 *   neutro  → ninguém aqui é dono disto. Ela procura, DENTRO do contexto dado, o fio que
 *             toca a especialidade dela, cita esse fio — e NÃO continua o assunto.
 *   nega    → isto é claramente de outra área. Ela diz isso e aponta quem ajuda.
 *
 * O exemplo do dono: a Zenita, perguntada sobre GTA VI, não comenta o jogo; pode citar que os GTA
 * modelam ferimento e acidente físico com certo realismo — uma deixa pro tema dela, dentro do
 * contexto, sem querer continuar a conversa sobre o jogo. Isso é `neutro`. Perguntada sobre
 * integrais, é `nega`: existe quem responda, e ela diz quem.
 *
 * POR QUE DETERMINÍSTICO, SEM CHAMADA DE MODELO: o portão roda em TODO turno. Uma chamada extra
 * aqui seria latência antes da primeira palavra em 100% das perguntas — o mesmo custo que fez o
 * `pensar` da fase `acao` virar "minimal". E porque a pergunta "isto é do meu assunto?" tem, nesta
 * casa, duas fontes de verdade que já existem: os termos por área (lib/rag/areas) e o DADO DA
 * PRÓPRIA AGENTE (pra Zenita, os 3.432 conceitos do atlas). Perguntar ao dado é melhor que
 * perguntar ao modelo se ele acha que sabe.
 *
 * ⟦GENERALISTA NÃO É GATEADA⟧ Agente sem área (Aura, Nina) passa SEMPRE. O portão existe pra
 * especialista: fechar o escopo de quem é generalista não dá personalidade, dá uma agente que
 * recusa o próprio trabalho.
 */
import { AREAS } from "@/lib/rag/areas";
import { MENTOR_SEED } from "@/lib/agent/mentors";
import { AGENTES_CHAT } from "@/lib/agents/chatAgentes";
import { CAPACIDADES } from "@/lib/agents/capacidades";

export type Escopo = "passa" | "neutro" | "nega";

export type VeredictoDeEscopo = {
  escopo: Escopo;
  /** a área que a pergunta parece ser, quando alguma se destaca */
  area: string | null;
  /** quem ajuda, quando `nega` — SEMPRE um nome do nosso registro, nunca inventado */
  responsavel: { nome: string; onde: "chat" | "escritorio" } | null;
};

const norm = (s: string) =>
  String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Pontuação de uma PERGUNTA contra os termos de uma área. Usa os mesmos termos de
 * `lib/rag/areas` (o dado), com limiar próprio: `classificarArea` foi feita pra TÍTULO + RESUMO de
 * artigo (mínimo 5 pontos, com o título valendo 3× cada acerto), e uma pergunta de oito palavras
 * quase nunca chega a 5. Reusar aquele limiar aqui faria a Zenita recusar anatomia — portanto é o
 * limiar que muda, não a lista.
 */
export function pontosDaArea(pergunta: string, termos: readonly string[]): number {
  const t = norm(pergunta);
  let n = 0;
  for (const termo of termos) {
    const inteira = termo.endsWith("$");
    const cru = termo.replace(/\$$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${cru}${inteira ? "\\b" : ""}`, "g");
    n += (t.match(re) ?? []).length;
  }
  return n;
}

/** A área que a PERGUNTA sugere, ou null. Exige destaque: 2× a segunda colocada. */
export function areaDaPergunta(pergunta: string): { slug: string; pontos: number } | null {
  const placar = AREAS.map((a) => ({ slug: a.slug, pontos: pontosDaArea(pergunta, a.termos) }))
    .sort((x, y) => y.pontos - x.pontos || x.slug.localeCompare(y.slug));
  const [primeira, segunda] = placar;
  if (!primeira || primeira.pontos < 1) return null;
  // empate ou quase: ambíguo demais pra mandar alguém embora
  if (segunda && segunda.pontos > 0 && primeira.pontos < segunda.pontos * 2) return null;
  return primeira;
}

/**
 * Quem ajuda com uma área. Só nomes do REGISTRO:
 *   1. a agente do chat cuja `area` é esta (hoje: medicina → Zenita);
 *   2. senão, a Aura — é a generalista do chat, e é ela que o aluno alcança no mesmo lugar;
 *      o mentor da área (MENTOR_SEED) entra como o nome do Escritório quando existe.
 * Nunca devolve um nome que não exista: apontar pra ninguém é pior que não apontar.
 */
export function responsavelDaArea(slug: string): { nome: string; onde: "chat" | "escritorio" } | null {
  const doChat = (Object.keys(CAPACIDADES) as (keyof typeof CAPACIDADES)[])
    .find((id) => CAPACIDADES[id].area === slug);
  if (doChat) {
    const a = AGENTES_CHAT.find((x) => x.id === doChat);
    if (a) return { nome: a.nome, onde: "chat" };
  }
  const mentor = MENTOR_SEED.find((m) => m.slug === slug);
  if (mentor) return { nome: mentor.name, onde: "escritorio" };
  const aura = AGENTES_CHAT.find((x) => x.id === "aura");
  return aura ? { nome: aura.nome, onde: "chat" } : null;
}

/**
 * O PORTÃO. `reconheceDoProprio` é o dado da agente respondendo por si: pra Zenita é o atlas
 * (`buscarConceitos`), e é ele que faz "onde fica o nervo vago" passar mesmo sem nenhum termo da
 * lista de medicina bater. Injetado pra este módulo continuar puro.
 */
export function escopoDoTurno(o: {
  pergunta: string;
  areaDaAgente: string | null;
  /** o vocabulário do campo dela (capacidades.termosProprios) */
  termosProprios?: readonly string[];
  reconheceDoProprio?: (pergunta: string) => boolean;
}): VeredictoDeEscopo {
  // generalista: nunca gateada (ver o cabeçalho)
  if (!o.areaDaAgente) return { escopo: "passa", area: null, responsavel: null };

  const pergunta = String(o.pergunta ?? "");
  if (!pergunta.trim()) return { escopo: "passa", area: null, responsavel: null };

  // 1 · o dado DELA reconhece? então é dela, e nenhuma lista de termos desmente isso.
  //     Pra Zenita é o atlas: faz "onde fica o nervo vago" passar sem nenhum termo de lista bater.
  if (o.reconheceDoProprio?.(pergunta)) {
    return { escopo: "passa", area: o.areaDaAgente, responsavel: null };
  }

  // 2 · o VOCABULÁRIO DO CAMPO dela bate? Vem antes da área alheia de propósito: um falso negativo
  //     no próprio campo ("ciclo de Krebs" → recusa) é muito pior que um falso positivo numa
  //     pergunta de fronteira, porque é a agente recusando o trabalho pelo qual ela existe.
  if (o.termosProprios?.length && pontosDaArea(pergunta, o.termosProprios) > 0) {
    return { escopo: "passa", area: o.areaDaAgente, responsavel: null };
  }

  const area = areaDaPergunta(pergunta);

  // 3 · a pergunta é da área dela
  if (area?.slug === o.areaDaAgente) return { escopo: "passa", area: area.slug, responsavel: null };

  // 4 · é de OUTRA área, com dono: nega e aponta
  if (area) return { escopo: "nega", area: area.slug, responsavel: responsavelDaArea(area.slug) };

  // 5 · nenhuma área se destaca (GTA VI, futebol, receita de bolo): neutro
  return { escopo: "neutro", area: null, responsavel: null };
}

// ───────────────────────────── as DUAS diretivas novas ─────────────────────────────
// `passa` não injeta nada: o raciocínio dela segue byte a byte o de antes. As diretivas novas
// são exatamente duas — a da recusa com encaminhamento, e a do contorno de contexto.

/** `nega` — recusa com encaminhamento. `{QUEM}` e `{ONDE}` são preenchidos por `diretrizDeEscopo`. */
export const DIRETRIZ_FORA_DO_ESCOPO = `ESCOPO DESTE TURNO — FORA DO SEU ASSUNTO, E COM DONO.
A pergunta não é do seu campo, e existe quem responda melhor. Em \`nucleo\`:
1. diga em UMA frase, sem rodeio e sem se desculpar, que este assunto não é o seu;
2. aponte {QUEM} ({ONDE}) pelo nome, como quem indica um colega — não como quem transfere ligação;
3. NÃO responda a pergunta, nem "por cima", nem "resumidamente", nem depois de avisar. Uma resposta
   dada após o aviso anula o aviso e é o defeito que esta regra existe pra impedir.
Sem \`desenvolvimento\`, sem \`conceitos\`, sem \`proximos_passos\` de outro campo. Duas a três frases no
total. Mantenha a sua voz: quem indica um colega continua sendo você.`;

/** \`neutro\` — o contorno de contexto. É a diretiva que dá personalidade sem sair do papel. */
export const DIRETRIZ_ESCOPO_NEUTRO = `ESCOPO DESTE TURNO — FORA DO SEU ASSUNTO, SEM DONO.
Ninguém nesta casa é dono deste tema, e você também não. Mas antes de dizer isso, procure UMA coisa
DENTRO do que a pessoa trouxe que toque o seu campo de verdade, e cite essa coisa. Em \`nucleo\`:
1. o fio: uma observação sua, do seu campo, sobre algo que o contexto da pergunta CONTÉM mas que a
   pessoa não mencionou. Precisa ser verdade e precisa ser do seu campo — se você não achar um fio
   honesto, pule direto pro passo 2 em vez de forçar um;
2. a franqueza: diga que o assunto em si não é o seu, e que você não vai levá-lo adiante;
3. NÃO desenvolva o fio. Ele é uma deixa, não um gancho pra puxar a conversa pro seu tema. Uma
   frase, no máximo duas — se virar parágrafo, você trocou de assunto no lugar da pessoa;
4. NÃO responda a pergunta original.
Três a quatro frases no total. Nada de \`desenvolvimento\`, \`conceitos\` nem \`proximos_passos\`.
O ponto desta regra: você continua sendo quem é mesmo quando o assunto não é seu. Não é desvio nem
piada — é olhar o que veio pela sua lente, dizer o que vê, e devolver a palavra.`;

/** A diretiva do veredito. `""` quando `passa` — e isso é deliberado (ver acima). */
export function diretrizDeEscopo(v: VeredictoDeEscopo): string {
  if (v.escopo === "passa") return "";
  if (v.escopo === "neutro") return DIRETRIZ_ESCOPO_NEUTRO;
  const quem = v.responsavel?.nome ?? "outra agente da Zaeon";
  const onde = v.responsavel?.onde === "escritorio" ? "no Escritório" : "aqui no chat";
  return DIRETRIZ_FORA_DO_ESCOPO.replace("{QUEM}", quem).replace("{ONDE}", onde);
}
