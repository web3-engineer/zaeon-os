/**
 * lib/llm/ledger.ts — escrita do TokenLedger (contrato C5), no molde de lib/canal/usage.ts:
 * try/catch, console.warn, devolve boolean. BEST-EFFORT — NUNCA derruba turno, chat ou busca.
 * TOKEN_LEDGER="0" desliga. `userId` só entra se for ObjectId válido (senão null).
 */
import type { Usage, ClasseErroLlm } from "@/lib/llm/usage";
import { custoDoAlvoUsd } from "@/lib/ai/preco";

export type Surface = "estudos" | "pesquisa" | "canal" | "programa" | "aula" | "projetos" | "whatsapp" | "admin" | "chore" | "embedding" | "outro";
const SURFACES: readonly Surface[] = ["estudos", "pesquisa", "canal", "programa", "aula", "projetos", "whatsapp", "admin", "chore", "embedding", "outro"];
/** Normaliza o `surface` solto do app ("sala-de-estudos", null…) para a união do ledger. */
export function surfaceLedger(s: unknown): Surface {
  const v = String(s ?? "").toLowerCase();
  if ((SURFACES as readonly string[]).includes(v)) return v as Surface;
  if (v.includes("pesquisa")) return "pesquisa";
  if (v.includes("estudo")) return "estudos";
  if (v.includes("aula")) return "aula";
  if (v.includes("projeto")) return "projetos";
  return "outro";
}

export type LedgerCtx = {
  agentKey: string;                       // persona.id | mentor.slug | "sistema"
  surface: Surface;
  userId?: string | null;
  mentorSlug?: string | null;
  scopeId?: string | null;
  programId?: string | null;
  taskId?: string | null;
  phase?: string | null;                  // Phase do harness quando houver
};

export type LinhaLedger = LedgerCtx & {
  model: string;
  // deepseek/moonshot/openrouter/dashscope: os motores abertos da orquestra (lib/orquestra/provedores).
  // No Prisma é String — a união só documenta o que o app grava.
  provedor: "vertex" | "litellm" | "huggingface" | "deepseek" | "moonshot" | "openrouter" | "dashscope";
  rota: "vertex" | "gateway" | "direta";
  usage: Usage;
  ms: number;
  ok: boolean;
  erro?: ClasseErroLlm | null;
  alvo?: string | null;
  jsonValido?: boolean | null;
};

export type LedgerClient = { tokenLedger: { create(args: { data: Record<string, unknown> }): Promise<unknown> } };

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;
const oid = (v: string | null | undefined) => (v && OBJECT_ID_RE.test(v) ? v : null);

/** Kill-switch: TOKEN_LEDGER="0" desliga a escrita (o envelope continua igual). */
export const ledgerLigado = (env: Record<string, string | undefined> = process.env): boolean => env.TOKEN_LEDGER !== "0";

/** PURO: a linha do Prisma a partir do contexto + usage (custo estimado calculado aqui, uma vez). */
export function linhaParaPrisma(l: LinhaLedger) {
  return {
    userId: oid(l.userId), agentKey: l.agentKey, mentorSlug: l.mentorSlug ?? null, surface: l.surface, scopeId: l.scopeId ?? null,
    programId: oid(l.programId), taskId: oid(l.taskId), phase: l.phase ?? null,
    model: l.model, provedor: l.provedor, rota: l.rota, alvo: l.alvo ?? null,
    promptTokens: l.usage.promptTokens, completionTokens: l.usage.completionTokens, cachedTokens: l.usage.cachedTokens, totalTokens: l.usage.totalTokens,
    reportado: l.usage.reportado, jsonValido: l.jsonValido ?? null,
    estimatedCostUsd: l.ok ? custoDoAlvoUsd(l.model, l.usage, l.alvo) : 0,
    ok: l.ok, erro: l.erro ?? null, ms: Math.max(0, Math.round(l.ms)),
  };
}

let _db: LedgerClient | null = null;
async function dbPadrao(): Promise<LedgerClient> {
  if (_db) return _db;
  const { prisma } = await import("@/src/lib/prisma");
  _db = prisma as unknown as LedgerClient;
  return _db;
}

/** Grava uma linha. Nunca lança; devolve se gravou. `db` injetável (teste); default = Prisma do app. */
export async function registrarTokens(linha: LinhaLedger, db?: LedgerClient | null, env: Record<string, string | undefined> = process.env): Promise<boolean> {
  if (!ledgerLigado(env)) return false;
  if (!linha?.agentKey) return false;
  try {
    const client = db ?? (await dbPadrao());
    await client.tokenLedger.create({ data: linhaParaPrisma(linha) });
    return true;
  } catch (e) {
    console.warn("[token-ledger] registrarTokens falhou:", (e as Error)?.message);
    return false;
  }
}
