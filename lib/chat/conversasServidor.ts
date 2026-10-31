/**
 * #663: as conversas do chat no servidor. O navegador continua como cópia rápida; aqui ficam a gravação de cada
 * mensagem na conversa certa, o título, o apagar e a junção da lista do servidor com a do navegador.
 * Tudo sem travar o chat: se o servidor falhar, a conversa segue com a cópia do navegador.
 */
import { appendTranscript, hydrateTranscript, type TranscriptWire } from "@/lib/agent/transcriptClient";
import { salvarThreads, type Armazem, type Escopo, type Thread } from "@/lib/chat/threads";

export type SalaConversa = "estudos" | "pesquisa";
export type ConversaServidor = { id: string; titulo: string; parentId?: string; contexto?: string; criadaEm: number; tocadaEm: number };

/** O que a conversa guarda além das mensagens: vai junto na gravação, porque é ela que cria a conversa no servidor. */
const dadosDa = (t?: Thread) => (t ? { titulo: t.titulo, parentId: t.parentId, contexto: t.contexto } : undefined);

/** Grava um turno na conversa dele. A resposta fica 1 ms depois da pergunta para as duas não trocarem de ordem. */
export function gravarTurno(sala: SalaConversa, thread: Thread | undefined, pergunta: string, resposta: string): void {
  if (!thread) return;
  const at = Date.now();
  appendTranscript(sala, thread.id, [{ role: "user", text: pergunta, at }, { role: "assistant", text: resposta, at: at + 1 }], { conversa: dadosDa(thread) });
}

/** Diagrama e aula moram no servidor: a mensagem guarda só o número deles, para continuarem abrindo. */
export function gravarArtefato(sala: SalaConversa, thread: Thread | undefined, bloco: { studioKind: string; artifactId: string; title?: string }): void {
  if (!thread) return;
  appendTranscript(sala, thread.id, [{ role: "assistant", text: bloco.title || bloco.studioKind, at: Date.now(), meta: { bloco } }], { conversa: dadosDa(thread) });
}

/** O bloco de diagrama/aula guardado na mensagem, ou nada. */
export function blocoDaMensagem(w: TranscriptWire): { studioKind: string; artifactId: string; title?: string } | null {
  const b = (w.meta as { bloco?: { studioKind?: unknown; artifactId?: unknown; title?: unknown } } | undefined)?.bloco;
  if (!b || typeof b.studioKind !== "string" || typeof b.artifactId !== "string") return null;
  return { studioKind: b.studioKind, artifactId: b.artifactId, title: typeof b.title === "string" ? b.title : undefined };
}

export function renomearNoServidor(sala: SalaConversa, thread: Thread | undefined): void {
  if (!thread) return;
  void fetch("/api/ai/conversas", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ surface: sala, scopeId: thread.id, ...dadosDa(thread) }) }).catch(() => {});
}

/** Editar/regenerar: as mensagens cortadas na tela também saem do servidor, para não voltarem. */
export function cortarNoServidor(sala: SalaConversa, id: string, desde: number | undefined): void {
  if (!desde) return;
  const qs = new URLSearchParams({ surface: sala, scopeId: id, desde: String(desde) });
  void fetch(`/api/ai/conversas?${qs}`, { method: "DELETE", keepalive: true }).catch(() => {});
}

const chaveApagadas = (e: Escopo) => `${e.prefixo}apagadas.v1`;
function lerApagadas(a: Armazem, e: Escopo): string[] {
  try { const v = JSON.parse(a.getItem(chaveApagadas(e)) || "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; }
}
function gravarApagadas(a: Armazem, e: Escopo, ids: string[]): void {
  try { ids.length ? a.setItem(chaveApagadas(e), JSON.stringify(ids)) : a.removeItem(chaveApagadas(e)); } catch { /* ignore */ }
}

async function pedirApagar(sala: SalaConversa, id: string): Promise<boolean> {
  const qs = new URLSearchParams({ surface: sala, scopeId: id });
  const r = await fetch(`/api/ai/conversas?${qs}`, { method: "DELETE", keepalive: true }).catch(() => null);
  // sem login não há o que apagar no servidor: a conversa só existia no navegador
  return !!r && (r.ok || r.status === 401);
}

/** Apaga no servidor. Sem conexão, o pedido fica na fila, e a conversa não volta enquanto ele não for atendido. */
export async function apagarNoServidor(sala: SalaConversa, id: string, a: Armazem, e: Escopo): Promise<void> {
  gravarApagadas(a, e, [...new Set([...lerApagadas(a, e), id])]);
  if (await pedirApagar(sala, id)) gravarApagadas(a, e, lerApagadas(a, e).filter((x) => x !== id));
}

/** Junta as listas: o que só o servidor tem entra no fim, e o título mais recente vale. A fila de apagadas nunca volta. */
export function juntarConversas(locais: readonly Thread[], servidor: readonly ConversaServidor[], apagadas: readonly string[]): Thread[] {
  const fora = new Set(apagadas);
  const porId = new Map(servidor.map((c) => [c.id, c]));
  const juntas = locais.filter((t) => !fora.has(t.id)).map((t) => {
    const c = porId.get(t.id);
    return c && c.tocadaEm > t.tocadaEm ? { ...t, titulo: c.titulo, tocadaEm: c.tocadaEm } : t;
  });
  const jaTem = new Set(juntas.map((t) => t.id));
  for (const c of servidor) {
    if (jaTem.has(c.id) || fora.has(c.id)) continue;
    juntas.push({ id: c.id, titulo: c.titulo, criadaEm: c.criadaEm, tocadaEm: c.tocadaEm, ...(c.parentId ? { parentId: c.parentId } : {}), ...(c.contexto ? { contexto: c.contexto } : {}) });
  }
  return juntas;
}

/**
 * Atende os pedidos de apagar que ficaram na fila e traz a lista do servidor. `null` = sem login ou sem conexão: fica
 * a lista do navegador. `atuais` é lida só depois da resposta, porque a pessoa pode ter criado uma conversa no meio.
 */
export async function sincronizarConversas(sala: SalaConversa, a: Armazem, e: Escopo, atuais: () => readonly Thread[]): Promise<Thread[] | null> {
  for (const id of lerApagadas(a, e)) {
    if (await pedirApagar(sala, id)) gravarApagadas(a, e, lerApagadas(a, e).filter((x) => x !== id));
  }
  const r = await fetch(`/api/ai/conversas?surface=${sala}`, { cache: "no-store" }).catch(() => null);
  if (!r?.ok) return null;
  const d = await r.json().catch(() => null);
  if (!Array.isArray(d?.conversas)) return null;
  const lista = juntarConversas(atuais(), d.conversas, lerApagadas(a, e));
  salvarThreads(a, lista, e);
  return lista;
}

export const mensagensDoServidor = (sala: SalaConversa, id: string): Promise<TranscriptWire[]> => hydrateTranscript(sala, id);
