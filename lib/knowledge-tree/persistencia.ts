/**
 * lib/knowledge-tree/persistencia.ts — o progresso da Árvore Neuronal no CLIENTE.
 *
 * O servidor (/api/studio/forja/progresso) é a fonte da verdade. O localStorage é a reserva offline,
 * com chave por userId + cursoId; o que foi gravado sem rede fica marcado `pendente` e é empurrado
 * (op "definir") na próxima vez que o servidor responder.
 */
export const ROTA_PROGRESSO = "/api/studio/forja/progresso";
const PREFIXO = "zaeon.arvore.v1";
const CHAVE_UID = PREFIXO + ":uid";

export type EstadoLocal = { concluidas: string[]; pendente: boolean };
export type Carregado = { userId: string | null; concluidas: string[]; fonte: "servidor" | "local" };
type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

export const chaveLocal = (userId: string | null, cursoId: string): string => `${PREFIXO}:${userId || "anon"}:${cursoId}`;

function store(): Storage | null {
  try { return typeof window !== "undefined" && window.localStorage ? window.localStorage : null; } catch { return null; }
}

export function lerLocal(userId: string | null, cursoId: string): EstadoLocal | null {
  const s = store();
  if (!s) return null;
  try {
    const j = JSON.parse(s.getItem(chaveLocal(userId, cursoId)) || "null");
    if (!j || !Array.isArray(j.concluidas)) return null;
    return { concluidas: j.concluidas.filter((x: unknown) => typeof x === "string"), pendente: !!j.pendente };
  } catch { return null; }
}

export function gravarLocal(userId: string | null, cursoId: string, e: EstadoLocal): void {
  const s = store();
  if (!s) return;
  try { s.setItem(chaveLocal(userId, cursoId), JSON.stringify(e)); } catch { /* cota cheia/bloqueado: segue só na memória */ }
}

const lembrarUid = (uid: string) => { try { store()?.setItem(CHAVE_UID, uid); } catch { /* ignore */ } };
const ultimoUid = (): string | null => { try { return store()?.getItem(CHAVE_UID) ?? null; } catch { return null; } };

const H = { "content-type": "application/json" };

/** Lê do servidor; se houver algo pendente offline, sincroniza primeiro. Sem rede → localStorage. */
export async function carregarProgresso(cursoId: string, f: Fetch = fetch): Promise<Carregado> {
  try {
    const r = await f(`${ROTA_PROGRESSO}?cursoId=${encodeURIComponent(cursoId)}`, { cache: "no-store" });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const userId: string | null = typeof j.userId === "string" ? j.userId : null;
    let concluidas: string[] = Array.isArray(j.concluidas) ? j.concluidas : [];
    if (userId) lembrarUid(userId);
    const local = lerLocal(userId, cursoId);
    if (local?.pendente) {
      const s = await enviar(cursoId, { op: "definir", nos: local.concluidas }, f);
      if (s) concluidas = s;
    }
    gravarLocal(userId, cursoId, { concluidas, pendente: false });
    return { userId, concluidas, fonte: "servidor" };
  } catch {
    const uid = ultimoUid();
    return { userId: uid, concluidas: lerLocal(uid, cursoId)?.concluidas ?? [], fonte: "local" };
  }
}

async function enviar(cursoId: string, corpo: { op: string; nos?: string[] }, f: Fetch): Promise<string[] | null> {
  try {
    const r = await f(ROTA_PROGRESSO, { method: "POST", headers: H, body: JSON.stringify({ cursoId, ...corpo }) });
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j.concluidas) ? j.concluidas : null;
  } catch { return null; }
}

/**
 * Grava uma mudança: primeiro no localStorage (a tela nunca perde), depois no servidor. Se o servidor
 * falhar, o estado fica `pendente` pra próxima carga. Devolve true se o servidor confirmou.
 */
export async function salvarProgresso(
  userId: string | null, cursoId: string, concluidas: string[],
  op: { op: "concluir"; nos: string[] } | { op: "reiniciar" }, f: Fetch = fetch,
): Promise<boolean> {
  // algo anterior não chegou ao servidor: manda o conjunto inteiro, não só esta mudança
  const atrasado = lerLocal(userId, cursoId)?.pendente;
  gravarLocal(userId, cursoId, { concluidas, pendente: true });
  const ok = await enviar(cursoId, atrasado ? { op: "definir", nos: concluidas } : op, f);
  if (ok) gravarLocal(userId, cursoId, { concluidas, pendente: false });
  return !!ok;
}
