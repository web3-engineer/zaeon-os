/**
 * lib/llm/reservaHf.ts — a RESERVA do chat pelo Hugging Face (Inference Providers). PURO + env.
 *
 * Quando o Vertex recusa (429), estoura o tempo, cai (5xx) ou volta vazio, o envelope (lib/llm/envelope)
 * manda o MESMO pedido pro router do HF com `openai/gpt-oss-120b` na Cerebras e, se ela falhar, na Groq —
 * os dois servem esse modelo a centenas/milhares de tokens por segundo. O aluno recebe a resposta em vez do erro.
 *
 * Decisão do dono (2026-10-22): a pergunta do aluno pode sair pra esses provedores SÓ quando o Google falha.
 * Por isso a reserva nunca é o caminho principal, e o ledger grava alvo "huggingface" (pago, preço do provedor).
 * (2026-11-21: com LLM_PRIMARIO=hf o dono inverte isso — ver `hfPrimario` abaixo e docs/HF_PRIMARIO.md.)
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

// ───────────────────────────── HF PRIMÁRIO (LLM_PRIMARIO=hf) ─────────────────────────────
/**
 * Decisão do dono (2026-11-21): o Hugging Face vira o provedor PRINCIPAL de texto e o Google vira a queda.
 * Inverte a ordem da decisão de 22/10 (lá o HF só entrava quando o Google falhava) — por isso atrás de flag:
 *
 *   LLM_PRIMARIO=hf          liga (vale pra TODO texto que passa pelo envelope: chat da Aura, geminiJson/geminiText,
 *                            documento). Sem a env, ou com "google"/"vertex", tudo segue como antes, byte a byte.
 *                            Voltar = tirar a env e recriar o web/worker — sem deploy de código.
 *   HF_PRIMARIO_MODELOS      tier rápido (no lugar do GEMINI_MODEL), em ordem. Default: gpt-oss-120b Cerebras → Groq.
 *   HF_PRIMARIO_MODELOS_PRO  tier forte (no lugar do GEMINI_MODEL_PRO). Default: o mesmo gpt-oss, pensando mais.
 *
 * Não muda: pool grátis e Contabo (nunca passam pelo HF), imagem, embeddings do RAG, voz, PDF/imagem multimodal
 * e as rotas que ainda chamam o SDK do Vertex direto — essas seguem no Google (inventário no PR).
 * Precisa de HF_TOKEN; `HF_RESERVA=0` desliga o HF inteiro (primário e reserva) — é o kill switch único.
 */
export function hfPrimario(env: Env = process.env): boolean {
  if (!reservaHfLigada(env)) return false;
  return /^(hf|huggingface|hugging-face)$/i.test(env.LLM_PRIMARIO?.trim() ?? "");
}

/** O recibo do /api/health: quem vai na frente e se o HF está de reserva. Sem token nem nome de modelo. */
export function llmNaFrente(env: Env = process.env): { primario: "huggingface" | "google"; reservaHf: boolean } {
  const hf = hfPrimario(env);
  return { primario: hf ? "huggingface" : "google", reservaHf: !hf && reservaHfLigada(env) };
}

/** Testado ao vivo no router (2026-11-21, conta do dono): JSON mode ok, 131k de contexto, ~1500 tok/s na Cerebras. */
export const HF_PRIMARIO_PADRAO = ["openai/gpt-oss-120b:cerebras", "openai/gpt-oss-120b:groq"] as const;
export const HF_PRIMARIO_PRO_PADRAO = ["openai/gpt-oss-120b:cerebras", "openai/gpt-oss-120b:groq"] as const;

export type TierHf = "flash" | "pro";

/** O id do Gemini pedido é o tier forte? (= GEMINI_MODEL_PRO, ou qualquer "*-pro") */
export function tierDoModelo(modelo: string, env: Env = process.env): TierHf {
  const m = String(modelo ?? "").trim();
  const pro = env.GEMINI_MODEL_PRO?.trim() || "gemini-2.5-pro";
  return m === pro || /-pro(?:-|$)/i.test(m) ? "pro" : "flash";
}

const lista = (v: string | undefined) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export function modelosHfPrimario(tier: TierHf, env: Env = process.env): string[] {
  if (tier === "pro") { const l = lista(env.HF_PRIMARIO_MODELOS_PRO); return l.length ? l : [...HF_PRIMARIO_PRO_PADRAO]; }
  const l = lista(env.HF_PRIMARIO_MODELOS);
  return l.length ? l : [...HF_PRIMARIO_PADRAO];
}

/**
 * O "pensar" da fase (lib/llm/pensar) → `reasoning_effort` do gpt-oss (low | medium | high; não existe "minimal").
 * Sem nível pedido: low no tier rápido (como a reserva sempre fez) e medium no forte.
 */
export function esforcoHf(nivel: "minimal" | "low" | "medium" | "high" | undefined, tier: TierHf): "low" | "medium" | "high" {
  if (nivel === "medium" || nivel === "high") return nivel;
  if (nivel === "minimal" || nivel === "low") return "low";
  return tier === "pro" ? "medium" : "low";
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
