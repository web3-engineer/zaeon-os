/**
 * lib/llm/reservaHf.ts — a RESERVA do chat pelo Hugging Face (Inference Providers). PURO + env.
 *
 * Quando o Vertex recusa (429), estoura o tempo, cai (5xx) ou volta vazio, o envelope (lib/llm/envelope)
 * manda o MESMO pedido pro router do HF com `openai/gpt-oss-120b` na Cerebras e, se ela falhar, na Groq —
 * os dois servem esse modelo a centenas/milhares de tokens por segundo. O aluno recebe a resposta em vez do erro.
 *
 * Decisão do dono (2026-10-22): a pergunta do aluno pode sair pra esses provedores SÓ quando o Google falha.
 * Por isso a reserva nunca é o caminho principal, e o ledger grava alvo "huggingface" (pago, preço do provedor).
 *
 * Env:
 *   HF_TOKEN            token fine-grained com "Make calls to Inference Providers" (sem ele, desligada)
 *   HF_RESERVA="0"      desliga sem deploy (recriar o web)
 *   HF_RESERVA_MODELOS  lista em ordem, separada por vírgula (default: gpt-oss-120b na Cerebras, depois na Groq)
 *   HF_RESERVA_TIMEOUT_MS  teto por tentativa (default 45 s)
 */
import type { ClasseErroLlm } from "@/lib/llm/usage";

type Env = Record<string, string | undefined>;

/** Base do router (o envelope acrescenta /v1/chat/completions). */
export const HF_ROUTER_URL = "https://router.huggingface.co";
export const HF_RESERVA_PADRAO = ["openai/gpt-oss-120b:cerebras", "openai/gpt-oss-120b:groq"] as const;
export const HF_RESERVA_TIMEOUT_PADRAO_MS = 45_000;

const DESLIGADO = /^(0|off|false|nao|não|no)$/i;

export function reservaHfLigada(env: Env = process.env): boolean {
  if (!env.HF_TOKEN?.trim()) return false;
  const f = env.HF_RESERVA?.trim();
  return !(f && DESLIGADO.test(f));
}

export function modelosReservaHf(env: Env = process.env): string[] {
  const lista = (env.HF_RESERVA_MODELOS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return lista.length ? lista : [...HF_RESERVA_PADRAO];
}

export function timeoutReservaHf(env: Env = process.env): number {
  const n = Number(env.HF_RESERVA_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : HF_RESERVA_TIMEOUT_PADRAO_MS;
}

/**
 * O erro do Vertex justifica a reserva? Tudo que impede o aluno de receber resposta, MENOS o teto de
 * orçamento declarado (lei 5: indisponibilidade declarada não se contorna gastando em outro lugar).
 */
export const erroPedeReserva = (classe: ClasseErroLlm): boolean => classe !== "teto" && classe !== "pool_esgotado";

/** "openai/gpt-oss-120b:cerebras" → "openai/gpt-oss-120b" (o que vai pro ledger e pra tabela de preço). */
export const modeloSemProvedor = (m: string): string => m.replace(/:[a-z0-9-]+$/i, "");

/**
 * O HF é o caminho PRINCIPAL dos DISPAROS? (decisão do dono, 2026-10-30.)
 *
 * Escopo estreito de propósito: vale só pras mensagens que a ZAEON COMPÕE e manda (agenda, revisão,
 * lembretes, check-ins). A pergunta do aluno no chat NÃO muda — lá o HF segue sendo reserva, como
 * decidido em 22/10. São dois caminhos e duas decisões.
 *
 * Mecanicamente não precisa de rota nova: o envelope já aceita `deps.pularVertex`, que faz a reserva
 * ir primeiro e deixa o Vertex como queda. Então "HF primário" aqui é a MESMA chamada, com a ordem
 * invertida — e, se o HF falhar, o aluno continua recebendo pelo Vertex.
 *
 * Depende de `HF_TOKEN` (sem token, `reservaHfLigada` é falso e não há HF nenhum pra ser primário).
 */
export function disparosHfPrimario(env: Env = process.env): boolean {
  if (!reservaHfLigada(env)) return false;
  const f = env.DISPAROS_HF?.trim();
  return !!f && !DESLIGADO.test(f);
}

/**
 * Manda o HISTÓRICO de conversa do aluno pro provedor de terceiro?
 *
 * A pseudonimização (`lib/whatsapp/zaeon/semNome`) tira o NOME, que é de graça — não custa
 * qualidade nenhuma. O histórico é outra conversa: ele é o que faz a mensagem da Zaeon ser boa, e
 * cortá-lo piora o produto de verdade. Então o default MANTÉM (é o que o dono pediu ao escolher HF
 * primário) e a chave existe pra apertar sem deploy, se você decidir que a troca não vale.
 */
export function historicoParaTerceiro(env: Env = process.env): boolean {
  const f = env.DISPAROS_HF_SEM_HISTORICO?.trim();
  return !(f && !DESLIGADO.test(f)); // a chave LIGADA corta o histórico
}
