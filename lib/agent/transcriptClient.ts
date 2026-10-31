/**
 * lib/agent/transcriptClient.ts — cliente da camada L1 (docs/MEMORY_AND_PERSISTENCE.md).
 * Helpers de fetch para os chats: gravar cada turno (fire-and-forget, nunca bloqueia o
 * envio) e hidratar a conversa ao entrar na sala. Tudo best-effort: se o DB falhar, o
 * chat segue com o localStorage (L0) como está hoje.
 */
export type TranscriptRole = "user" | "assistant";
export type TranscriptWire = { id: string; role: TranscriptRole; text: string; meta?: unknown; at: string };

type AppendMsg = { role: TranscriptRole; text: string; meta?: unknown; at?: number };

/** Grava um turno (normalmente user + assistant). Fire-and-forget: não dá throw, não espera. */
export function appendTranscript(
  surface: string,
  scopeId: string | null | undefined,
  messages: AppendMsg[],
  opts?: { agentId?: string; title?: string; conversa?: { titulo?: string; parentId?: string; contexto?: string } },
): void {
  const clean = messages.filter((m) => m && m.text && m.text.trim());
  if (!clean.length) return;
  try {
    void fetch("/api/ai/transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true, // sobrevive a navegação/troca de aba no meio do envio
      body: JSON.stringify({ surface, scopeId: scopeId ?? null, messages: clean, ...opts }),
    }).catch(() => {});
  } catch { /* ignore */ }
}

/** Carrega as últimas N mensagens da sala. Retorna [] se não logado / sem conversa / erro. */
export async function hydrateTranscript(
  surface: string,
  scopeId?: string | null,
  limit = 60,
): Promise<TranscriptWire[]> {
  try {
    const qs = new URLSearchParams({ surface, limit: String(limit) });
    if (scopeId) qs.set("scopeId", scopeId);
    const r = await fetch(`/api/ai/transcript?${qs.toString()}`);
    if (!r.ok) return [];
    const d = await r.json().catch(() => null);
    return Array.isArray(d?.messages) ? (d.messages as TranscriptWire[]) : [];
  } catch {
    return [];
  }
}
