/**
 * lib/trechos/server.ts — a skill de trechos com as peças REAIS da casa: envelope (Flash, ledger), a busca híbrida da
 * base (`baseParaTurno`, consulta larga) e a leitura do documento inteiro (`trechosDoDocumento`, permissão no WHERE).
 * Só servidor. Flag `TRECHOS_EM_PAPEL` (padrão desligado).
 */
import type { LedgerCtx } from "@/lib/llm/ledger";
import { acharTrechos, type Opcoes, type Resultado } from "@/lib/trechos/achar";

export function trechosEmPapelLigado(env: Record<string, string | undefined> = process.env): boolean {
  const v = String(env.TRECHOS_EM_PAPEL ?? "").trim().toLowerCase();
  return v === "1" || v === "on" || v === "true";
}

export async function acharTrechosDaPessoa(
  e: { userId: string; pergunta: string; areas?: string[]; ledger?: Partial<LedgerCtx>; anexos?: import("@/lib/trechos/achar").AnexoParaTrechos[] },
  o: Opcoes = {},
): Promise<Resultado> {
  const [{ gerar }, { GEMINI_MODEL_FLASH }, { baseParaTurno, escopoDaPessoa }, { K_AMPLO }, { ragPg }, { trechosDoDocumento }] = await Promise.all([
    import("@/lib/llm/envelope"), import("@/lib/ai/model"), import("@/lib/rag/turno"), import("@/lib/rag/porDocumento"),
    import("@/lib/rag/pg"), import("@/lib/rag/store"),
  ]);
  const escopo = escopoDaPessoa(e.userId, e.areas ?? []);
  return acharTrechos(e.pergunta, {
    llm: async (p) => (await gerar({
      system: p.system, user: p.user, json: true, temperature: p.fase === "juiz" ? 0.1 : 0.3,
      model: process.env.TRECHOS_MODELO?.trim() || GEMINI_MODEL_FLASH, pensar: "low",
      timeoutMs: p.fase === "juiz" ? 20_000 : 8_000,
      ctx: { agentKey: "zaeon", surface: "estudos", ...e.ledger, userId: e.userId, phase: `trechos-${p.fase}` },
    })).texto,
    buscar: async (consulta) => {
      const b = await baseParaTurno({ userId: e.userId, pergunta: consulta, areas: e.areas, k: K_AMPLO });
      return b.status === "ok" ? b.trechos : [];
    },
    lerDocumento: async (documentoId) => trechosDoDocumento(ragPg(), documentoId, await escopo),
    ...(e.anexos?.length ? { anexos: e.anexos } : {}),
  }, o);
}
