/**
 * lib/canais/fila.ts — a FILA DE APROVAÇÃO dos posts (F2 do docs/PLANO_AGENTES_MUNDO_REAL.md). PURO.
 *
 * A F2 prova o laço ponta-a-ponta — rascunho → aprovação humana → "publicado" — SEM tocar rede
 * externa (o adapter da F2 é o `log`). Este arquivo é a máquina de estados e o julgamento; quem faz
 * IO é `publicar.ts`, e quem fala com a rede são os adapters das F3–F5.
 *
 * Por que uma máquina de estados explícita, e não um par de booleans: conteúdo público é
 * irreversível. "Já saiu?" e "quem aprovou?" precisam ser perguntas com UMA resposta, inclusive
 * depois de um erro no meio do caminho. `publicando` existe justamente pra isso — é o estado que
 * um executor CLAIMA antes de chamar o adapter, pra dois ciclos simultâneos não publicarem o mesmo
 * post duas vezes (mesma ideia do lock de escrita do Octa).
 *
 * A ordem do julgamento em `avaliarPublicacao` é deliberada e está explicada lá embaixo.
 */
import {
  LIMITE_TEXTO, assinaturaDe, comAssinatura,
  type ClasseErroCanal, type Rede,
} from "@/lib/canais/tipos";
import { podeEnviar, type EstadoEnvio } from "@/lib/canais/politica";
import { motivoDoBloqueio, verificarConteudoPublico, type OpcoesPublicas } from "@/lib/canais/noPiiExterno";

// ───────────────────────────── estados ─────────────────────────────

/**
 * `rascunho`   — existe, ninguém olhou.
 * `aprovado`   — um humano liberou; é candidato a sair.
 * `publicando` — um executor claimou (trava anti-duplo-envio). Transitório.
 * `publicado`  — saiu. TERMINAL: conteúdo público não se "desaprova".
 * `recusado`   — humano barrou. TERMINAL.
 * `falhou`     — tentou e deu erro; pode voltar pra `aprovado` e tentar de novo.
 */
export const ESTADOS_POST = ["rascunho", "aprovado", "publicando", "publicado", "recusado", "falhou"] as const;
export type EstadoPost = (typeof ESTADOS_POST)[number];
export const ehEstadoPost = (v: unknown): v is EstadoPost =>
  typeof v === "string" && (ESTADOS_POST as readonly string[]).includes(v);

/** Terminal = não sai mais daqui. `publicado` porque já é mundo; `recusado` porque é decisão humana. */
const TERMINAIS: ReadonlySet<EstadoPost> = new Set<EstadoPost>(["publicado", "recusado"]);
export const estadoTerminal = (e: EstadoPost): boolean => TERMINAIS.has(e);

/** Transições legais. O que não está aqui é bug, não caso de uso. */
const TRANSICOES: Record<EstadoPost, readonly EstadoPost[]> = {
  rascunho: ["aprovado", "recusado"],
  aprovado: ["publicando", "rascunho", "recusado"], // dá pra puxar de volta antes de sair
  // `publicando → aprovado` é o caminho do erro TRANSITÓRIO (rede caiu, rate limit): o executor
  // devolve o post pra fila em vez de exigir que um humano reaprove por causa de um timeout.
  publicando: ["publicado", "falhou", "aprovado"],
  falhou: ["aprovado", "recusado"],                 // erro PERMANENTE: nova tentativa passa por gente
  publicado: [],
  recusado: [],
};
export const podeTransicionar = (de: EstadoPost, para: EstadoPost): boolean =>
  (TRANSICOES[de] as readonly string[]).includes(para);

/** Os estados que um executor pode pegar pra publicar. Só um — mas nomeado, pra query não adivinhar. */
export const ESTADOS_PUBLICAVEIS: readonly EstadoPost[] = ["aprovado"];

// ───────────────────────────── a linha do post ─────────────────────────────

/** O que a fila precisa de um `AgentPost` (a rota passa; aqui não há Prisma). */
export type LinhaPost = {
  id: string;
  agentKey: string;
  rede: string;
  /** Corpo CRU, sem assinatura. A assinatura é aplicada no envio, uma vez. */
  texto: string;
  estado: string;
  midia?: string[] | null;
  fonteUrl?: string | null;
  tentativas?: number | null;
  ultimoErro?: string | null;
};

/** Quem assina (Opção A: o agente é voz, a conta é da Zaeon). */
export type Voz = { agentKey: string; nome: string; area?: string | null };

// ───────────────────────────── dedupe ─────────────────────────────

/**
 * Chave de idempotência da CRIAÇÃO (não do envio — o envio é protegido pelo claim de `publicando`).
 * Serve pro mesmo chore rodando duas vezes no dia não enfileirar o mesmo post duas vezes.
 *
 * É obrigatória de propósito: no MongoDB o índice único do Prisma não é esparso, então vários `null`
 * COLIDIRIAM entre si. Melhor exigir a chave do que descobrir isso em produção no segundo rascunho.
 */
export function chaveDedupe(p: { agentKey: string; rede: string; texto: string; dia?: string; sufixo?: string }): string {
  const corpo = p.texto.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 160);
  return [p.agentKey, p.rede, p.dia ?? "", p.sufixo ?? "", corpo].join("|");
}

// ───────────────────────────── preparo do texto ─────────────────────────────

/** O texto que REALMENTE sai: assinatura obrigatória, cortado ao limite da rede (corta o corpo). */
export function textoFinalDe(post: { texto: string; rede: string }, voz: Voz): string {
  const rede = post.rede as Rede;
  return comAssinatura(post.texto, assinaturaDe({ nome: voz.nome, area: voz.area ?? null }), rede);
}

/**
 * Cabe sem truncar? Serve pro admin AVISAR antes de aprovar, não pra barrar — truncar é legítimo
 * (é o que `comAssinatura` faz), mas o dono tem direito de saber que vai sair com "…".
 * A conta espelha a de `comAssinatura`: a assinatura é inteira e o corpo é que cede.
 */
export function cabeNaRede(post: { texto: string; rede: string }, voz: Voz): boolean {
  const limite = LIMITE_TEXTO[post.rede as Rede];
  if (!limite) return true;
  const sufixo = `\n\n${assinaturaDe({ nome: voz.nome, area: voz.area ?? null })}`;
  return post.texto.trim().length <= limite - sufixo.length;
}

// ───────────────────────────── julgamento ─────────────────────────────

export type Veredito =
  | { ok: true; textoFinal: string }
  | { ok: false; classe: ClasseErroCanal; detalhe: string };

/**
 * Pode sair AGORA? Ordem deliberada — do mais estrutural pro mais passageiro, pro motivo devolvido
 * ser sempre o mais acionável:
 *
 *   1. ESTADO DO POST  — não aprovado não é candidato. Nem olha o resto.
 *   2. CANAL (podeEnviar) — contrato → auth → pausa → teto → quiet. Se o canal não publica, discutir
 *      o conteúdo é perda de tempo.
 *   3. PII no TEXTO FINAL — por último porque depende do texto final (com assinatura) e porque é o
 *      bloqueio mais caro de resolver: exige reescrita humana. Mas é HARD-BLOCK: §5.1 do plano.
 *
 * O item 3 roda de novo no envio mesmo tendo rodado na aprovação (`motivoPiiNaAprovacao`). É de
 * propósito: entre aprovar e sair o texto pode ter sido editado, e a trava que só roda cedo é a
 * trava que um dia não roda.
 */
export function avaliarPublicacao(input: {
  post: LinhaPost;
  voz: Voz;
  canal: EstadoEnvio;
  agora: Date;
  pii?: OpcoesPublicas;
  tz?: string;
}): Veredito {
  const { post, voz, canal, agora } = input;

  if (post.estado !== "aprovado") {
    return { ok: false, classe: "desconhecido", detalhe: `post em "${post.estado}", só "aprovado" sai` };
  }
  if (post.rede !== canal.rede) {
    return { ok: false, classe: "capacidade", detalhe: `post é de ${post.rede} e o canal é ${canal.rede}` };
  }

  const v = podeEnviar(canal, "publicar", agora, input.tz);
  if (!v.ok) return { ok: false, classe: v.classe, detalhe: v.detalhe };

  const textoFinal = textoFinalDe(post, voz);
  const motivo = motivoDoBloqueio(verificarConteudoPublico(textoFinal, input.pii));
  if (motivo) return { ok: false, classe: "pii_bloqueada", detalhe: motivo };

  return { ok: true, textoFinal };
}

/**
 * A mesma trava de PII, mas pra rodar na APROVAÇÃO — pra ninguém aprovar um post que vai ser barrado
 * na hora de sair. Devolve a frase do bloqueio, ou `null` se está liberado.
 */
export function motivoPiiNaAprovacao(post: { texto: string; rede: string }, voz: Voz, pii?: OpcoesPublicas): string | null {
  return motivoDoBloqueio(verificarConteudoPublico(textoFinalDe(post, voz), pii));
}
