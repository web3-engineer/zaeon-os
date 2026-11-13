/**
 * lib/chat/modelos.ts — os modelos que o aluno pode escolher no chat, e o nome de quem respondeu DE VERDADE.
 * PURO (cliente e servidor importam): o route só aceita ids daqui — nunca um nome de modelo solto do cliente.
 *
 * Google: o harness inteiro (plano → raciocínio → resposta estruturada, botões de harness, artefatos).
 * Zaeon (local, CPU na Contabo): FORA do seletor desde 2026-10-22 — o dono testou o Qwen3 30B no chat e achou
 * lento e pesado demais pra resposta; ele foi pros artefatos em segundo plano (lib/llm/papeis "artefato").
 * O caminho enxuto (lib/agent/turnoLocal) segue no runChatTurn: volta a valer se um modelo "zaeon" entrar aqui.
 * Testado em 2026-10-22: no `global` do projeto respondem 3.5-flash, 3.5-flash-lite e 2.5-pro (3.x-pro = 404).
 */
export type ProvedorModelo = "google" | "zaeon" | "anthropic";

export type ModeloChat = {
  id: string;
  nome: string;
  /** símbolo do provedor na pílula do composer */
  simbolo: string;
  provedor: ProvedorModelo;
  /** uma linha pro menu */
  descricao: string;
  /** Google: o id do Vertex. */
  vertex?: string;
  /** Zaeon: o grupo do gateway (infra/litellm.config.yaml). */
  grupo?: string;
};

export const MODELOS_CHAT: readonly ModeloChat[] = [
  { id: "gemini-3.5-flash", nome: "Gemini 3.5 Flash", simbolo: "✦", provedor: "google", descricao: "Padrão · equilibrado", vertex: "gemini-3.5-flash" },
  { id: "gemini-3.5-flash-lite", nome: "Gemini 3.5 Flash-Lite", simbolo: "✦", provedor: "google", descricao: "Mais rápido · respostas mais simples", vertex: "gemini-3.5-flash-lite" },
  { id: "gemini-2.5-pro", nome: "Gemini 2.5 Pro", simbolo: "✦", provedor: "google", descricao: "Raciocínio mais forte · um pouco mais lento", vertex: "gemini-2.5-pro" },
  // Claude (Anthropic), roteado pelo gateway LiteLLM (grupo = model_name do litellm-config). Os créditos
  // são do dono; os nomes de grupo têm de bater com infra/zaeon-models/litellm-config.yaml. Caminho de
  // gateway (como o "zaeon" local): resposta forte e direta, sem as tools do harness (ver runChatTurn).
  { id: "claude-opus", nome: "Claude Opus", simbolo: "◆", provedor: "anthropic", descricao: "Raciocínio máximo · mais caro", grupo: "claude-opus" },
  { id: "claude-sonnet", nome: "Claude Sonnet", simbolo: "◆", provedor: "anthropic", descricao: "Forte e equilibrado", grupo: "claude-sonnet" },
];

/** Roteia pelo gateway LiteLLM (grupo) em vez do Vertex? Vale pro Zaeon local e pro Claude. */
export const viaGateway = (m: ModeloChat | null | undefined): m is ModeloChat & { grupo: string } =>
  !!m?.grupo && (m.provedor === "zaeon" || m.provedor === "anthropic");

export const MODELO_PADRAO = MODELOS_CHAT[0].id;

/** O id veio do cliente: só vale se estiver no catálogo. */
export function modeloDoId(id: unknown): ModeloChat | null {
  return typeof id === "string" ? MODELOS_CHAT.find((m) => m.id === id) ?? null : null;
}

/**
 * Nome pra tela a partir do que o SERVIDOR usou (ledger: model + alvo) — inclusive quando um fallback serviu.
 *   "gemini-3.5-flash"/vertex → "Gemini 3.5 Flash" · "zaeon-local-qwen30"/contabo → "Qwen3 30B · local"
 *   "openai/gpt-oss-120b"/huggingface → "gpt-oss-120b · reserva"
 */
export function nomeDoModeloServido(model: string | null | undefined, alvo?: string | null): string {
  const m = String(model ?? "").trim();
  const doCatalogo = MODELOS_CHAT.find((x) => x.vertex === m || x.grupo === m);
  if (doCatalogo) return doCatalogo.provedor === "zaeon" ? `${doCatalogo.nome} · local` : doCatalogo.nome;
  if (alvo === "huggingface") return `${m.replace(/^.*\//, "") || "Hugging Face"} · reserva`;
  if (alvo === "contabo" || m.startsWith("zaeon-local-")) return `${m.replace(/^zaeon-local-/, "") || "Zaeon"} · local`;
  return m || "?";
}

/** Chave do localStorage da escolha (por aparelho). */
export const CHAVE_MODELO = "zaeon.chat.modelo.v1";
