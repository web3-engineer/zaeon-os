/**
 * lib/skilltree/assess.ts — o mentor SOBE a maestria quando o aluno demonstra domínio.
 *
 * Depois de um turno com nó em foco, um juiz Flash (JSON, barato, best-effort) pontua 0..1 quanto a
 * MENSAGEM DO ALUNO demonstra domínio do nó (explicar, resolver, prever — não só perguntar). O
 * score vira um delta pequeno: 2 boas demonstrações ≈ nó dominado. Nunca bloqueia a resposta.
 */
import { GEMINI_MODEL_FLASH } from "@/lib/ai/model";
import type { GenJson } from "./generate";
import type { SkillNode } from "./types";
import { masteryUpdate, type MasteryUpdateResult } from "./progress";

export type Assessment = { score: number; note?: string };

const SYSTEM =
  "Você é o examinador silencioso de uma árvore de habilidades. Dado um NÓ (habilidade) e a MENSAGEM do aluno, " +
  "avalie quanto a mensagem DEMONSTRA domínio do nó: explicação correta com as próprias palavras, resolução de um problema, " +
  "previsão certa, uso adequado dos conceitos. Perguntas, pedidos de ajuda ou frases vagas = 0. Erros conceituais = baixo. " +
  "Responda SOMENTE JSON: {\"score\": 0..1, \"note\": \"1 frase\"}.";

/** Só vale a pena julgar uma TENTATIVA (≥ 6 palavras). Perguntas curtas não são avaliadas. */
export function isAttempt(message: string): boolean {
  return String(message ?? "").trim().split(/\s+/).filter(Boolean).length >= 6;
}

/** Score → delta de maestria (puro). <0.4 nada; 0.4–0.7 pequeno; ≥0.7 metade do caminho. */
export function deltaFromScore(score: number): number {
  const s = Number.isFinite(score) ? Math.min(1, Math.max(0, score)) : 0;
  if (s < 0.4) return 0;
  if (s < 0.7) return 0.25;
  return 0.5;
}

export function sanitizeAssessment(raw: unknown): Assessment {
  const score = Number((raw as any)?.score);
  return { score: Number.isFinite(score) ? Math.min(1, Math.max(0, score)) : 0, note: typeof (raw as any)?.note === "string" ? (raw as any).note.slice(0, 200) : undefined };
}

/** Papel "mini" (qwen3 4B na Contabo; Google Flash se ela falhar/estiver ocupada/LOCAL_MINI=0) — juiz silencioso, ninguém espera. */
const defaultGenJson: GenJson = async (system, user, opts) => {
  const { gerarPapelJson } = await import("@/lib/llm/papeis");
  const { valor } = await gerarPapelJson<any>("mini", { system, user, temperature: opts?.temperature, timeoutMs: opts?.timeoutMs, ctx: { agentKey: "aura", surface: "estudos", phase: "assess" } });
  return valor;
};

export async function assessMastery(args: { node: SkillNode; topicLabel: string; message: string }, genJson: GenJson = defaultGenJson): Promise<Assessment> {
  const user =
    `Tópico: ${args.topicLabel}\nNÓ: "${args.node.title}" (${args.node.branch}, nível ${args.node.level}) — ${args.node.summary}\n\n` +
    `MENSAGEM DO ALUNO:\n${String(args.message ?? "").slice(0, 2000)}`;
  const raw = await genJson<unknown>(SYSTEM, user, { temperature: 0.1, model: GEMINI_MODEL_FLASH, timeoutMs: 12_000 });
  return sanitizeAssessment(raw);
}

/** Julga a mensagem e, se demonstrou, sobe a maestria. Best-effort: devolve null em qualquer falha. */
export async function assessAndUpdate(args: { userId: string; topicSlug: string; nodeId: string; message: string; genJson?: GenJson }): Promise<MasteryUpdateResult | null> {
  try {
    if (!isAttempt(args.message)) return null;
    const { loadTreeNodes } = await import("./generate");
    const { topicLabel, nodes } = await loadTreeNodes(args.topicSlug);
    const node = nodes.find((n) => n.id === args.nodeId);
    if (!node) return null;
    const a = await assessMastery({ node, topicLabel, message: args.message }, args.genJson);
    const delta = deltaFromScore(a.score);
    if (delta <= 0) return null;
    return await masteryUpdate(args.userId, args.topicSlug, args.nodeId, delta);
  } catch {
    return null;
  }
}
