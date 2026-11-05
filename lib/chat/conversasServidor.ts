/**
 * #663: as conversas do chat no servidor. O navegador continua como cópia rápida; aqui ficam a gravação de cada
 * mensagem na conversa certa, o título, o apagar e a junção da lista do servidor com a do navegador.
 * Tudo sem travar o chat: se o servidor falhar, a conversa segue com a cópia do navegador.
 */
import { appendTranscript, hydrateTranscript, type TranscriptWire } from "@/lib/agent/transcriptClient";
import { armazemDaConta, chaveDaConta, contaDaSessao } from "@/lib/chat/contaNoNavegador";
import { ESCOPO_COWORK, ESCOPO_PESQUISA, carregarMensagens, chaveDaThread, criarThread, listarThreads, salvarThreads, type Armazem, type Escopo, type Thread } from "@/lib/chat/threads";

export type SalaConversa = "estudos" | "pesquisa";
export type ConversaServidor = { id: string; titulo: string; parentId?: string; contexto?: string; criadaEm: number; tocadaEm: number };

/** O que a conversa guarda além das mensagens: vai junto na gravação, porque é ela que cria a conversa no servidor. */
const dadosDa = (t?: Thread) => (t ? { titulo: t.titulo, parentId: t.parentId, contexto: t.contexto } : undefined);

/**
 * Grava um turno na conversa dele. A resposta fica 1 ms depois da pergunta para as duas não trocarem de ordem.
 * #705: a pergunta leva se o Modo pesquisa estava ligado — a conversa abre com ele ligado em outro navegador.
 */
export function gravarTurno(sala: SalaConversa, thread: Thread | undefined, pergunta: string, resposta: string, extra?: { modoPesquisa?: boolean }): void {
  if (!thread) return;
  const at = Date.now();
  const meta = extra?.modoPesquisa ? { meta: { modoPesquisa: true } } : {};
  appendTranscript(sala, thread.id, [{ role: "user", text: pergunta, at, ...meta }, { role: "assistant", text: resposta, at: at + 1 }], { conversa: dadosDa(thread) });
}

/** #705: o Modo pesquisa da conversa que veio do servidor — o da última pergunta */
export function modoPesquisaDoServidor(ws: readonly TranscriptWire[]): boolean {
  const ultima = [...ws].reverse().find((w) => w.role === "user");
  return (ultima?.meta as { modoPesquisa?: unknown } | undefined)?.modoPesquisa === true;
}

export type Bloco = { studioKind: string; artifactId: string; title?: string };
/**
 * #705: o diagrama/aula é gravado como uma mensagem própria logo depois da resposta. Vindo do servidor, ele volta para
 * DENTRO da resposta de antes (antes aparecia um balão só com o nome). Mensagem com bloco sem resposta antes fica sozinha.
 */
export function juntarBlocos(ws: readonly TranscriptWire[]): { w: TranscriptWire; blocos: Bloco[] }[] {
  const out: { w: TranscriptWire; blocos: Bloco[] }[] = [];
  for (const w of ws) {
    const b = blocoDaMensagem(w), ant = out[out.length - 1];
    const soOBloco = !!b && w.text.trim() === (b.title || b.studioKind);
    if (b && soOBloco && w.role === "assistant" && ant?.w.role === "assistant") { ant.blocos.push(b); continue; }
    out.push({ w, blocos: b ? [b] : [] });
  }
  return out;
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

const chaveAntigas = (e: Escopo) => `${e.prefixo}antigas.v1`;
const chaveEnviadas = (e: Escopo) => `${e.prefixo}enviadas.v1`;
const chaveConhecidas = (e: Escopo) => `${e.prefixo}conhecidas.v1`;
function lerIds(a: Armazem, k: string): string[] {
  try { const v = JSON.parse(a.getItem(k) || "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; }
}
function gravarIds(a: Armazem, k: string, ids: Iterable<string>): void {
  try { a.setItem(k, JSON.stringify([...new Set(ids)])); } catch { /* ignore */ }
}

export type MsgGuardada = { role?: string; text?: string; at?: number; studioBlock?: Bloco; blocosExtra?: Bloco[]; blocos?: Bloco[] };
type Bloco = { studioKind?: string; artifactId?: string; title?: string };

/** As mensagens guardadas no navegador, na forma do servidor. As sem horário ficam em ordem, a partir da criação da conversa. */
export function mensagensParaEnviar(guardadas: readonly MsgGuardada[], criadaEm: number, textoDe: (m: MsgGuardada) => string) {
  const saida: { role: string; text: string; at: number; meta?: unknown }[] = [];
  let ultimo = criadaEm;
  const proximo = (at?: number) => { ultimo = at && at > ultimo ? at : ultimo + 1; return ultimo; };
  for (const m of guardadas) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const blocos = [m.studioBlock, ...(m.blocos ?? []), ...(m.blocosExtra ?? [])].filter((b): b is Bloco => !!b?.artifactId && !!b.studioKind);
    const texto = (textoDe(m) || "").trim();
    if (texto) saida.push({ role: m.role, text: texto, at: proximo(m.at), ...(blocos[0] ? { meta: { bloco: { studioKind: blocos[0].studioKind, artifactId: blocos[0].artifactId, title: blocos[0].title } } } : {}) });
    for (const b of texto ? blocos.slice(1) : blocos) saida.push({ role: m.role, text: b.title || b.studioKind!, at: proximo(m.at), meta: { bloco: { studioKind: b.studioKind, artifactId: b.artifactId, title: b.title } } });
  }
  return saida;
}

/**
 * Sobe, uma vez em cada navegador, as conversas que só existiam nele. Cada uma só conta como enviada depois de o servidor
 * confirmar; se falhar, para aqui e tenta de novo na próxima abertura. Depois disso não sobe mais nada: uma conversa
 * enviada de novo voltaria, mesmo que tivesse sido apagada em outro aparelho.
 */
export async function enviarConversasAntigas(sala: SalaConversa, a: Armazem, e: Escopo, textoDe: (m: MsgGuardada) => string): Promise<void> {
  try { if (a.getItem(chaveAntigas(e))) return; } catch { return; }
  const fora = new Set(lerApagadas(a, e));
  const enviadas = new Set(lerIds(a, chaveEnviadas(e)));
  for (const t of listarThreads(a, e)) {
    if (enviadas.has(t.id) || fora.has(t.id)) continue;
    const mensagens = mensagensParaEnviar(carregarMensagens<MsgGuardada>(a, t.id, e), t.criadaEm, textoDe);
    if (mensagens.length) {
      const r = await fetch("/api/ai/conversas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ surface: sala, scopeId: t.id, ...dadosDa(t), mensagens }) }).catch(() => null);
      if (!r?.ok) return;
      gravarIds(a, chaveConhecidas(e), [...lerIds(a, chaveConhecidas(e)), t.id]);
    }
    enviadas.add(t.id);
    gravarIds(a, chaveEnviadas(e), enviadas);
  }
  try { a.setItem(chaveAntigas(e), "1"); a.removeItem(chaveEnviadas(e)); } catch { /* ignore */ }
}

/**
 * Apaga a cópia das conversas no navegador ao sair: elas voltam do servidor ao entrar. Se as antigas ainda não subiram,
 * a cópia fica, para não perder nada. `contaApagada`: não sobrou o que guardar, e nada pode subir de novo depois.
 */
export function limparCopiaDasConversas(email: string | null | undefined, contaApagada = false): void {
  try {
    const conta = contaDaSessao(email);
    const a = armazemDaConta(localStorage, conta);
    for (const e of [ESCOPO_COWORK, ESCOPO_PESQUISA]) {
      if (!contaApagada && !a.getItem(chaveAntigas(e))) continue;
      const fica = contaApagada ? [] : [chaveDaConta(conta, chaveAntigas(e)), chaveDaConta(conta, chaveApagadas(e))];
      const raiz = chaveDaConta(conta, e.prefixo.slice(0, -1));
      const sai: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(raiz) && !fica.includes(k)) sai.push(k);
      }
      for (const k of sai) localStorage.removeItem(k);
    }
  } catch { /* sem acesso ao navegador: não há o que limpar */ }
}

/**
 * Atende os pedidos de apagar que ficaram na fila, sobe as conversas antigas e traz a lista do servidor. Conversa que
 * este navegador já viu no servidor e sumiu de lá foi apagada em outro aparelho: a cópia daqui sai junto.
 * Com a lista no teto da rota, faltar nela não quer dizer que foi apagada.
 `null` = sem login ou sem conexão: fica
 * a lista do navegador. `atuais` é lida só depois da resposta, porque a pessoa pode ter criado uma conversa no meio.
 */
export async function sincronizarConversas(sala: SalaConversa, a: Armazem, e: Escopo, atuais: () => readonly Thread[], textoDe: (m: MsgGuardada) => string = (m) => m.text ?? ""): Promise<Thread[] | null> {
  for (const id of lerApagadas(a, e)) {
    if (await pedirApagar(sala, id)) gravarApagadas(a, e, lerApagadas(a, e).filter((x) => x !== id));
  }
  await enviarConversasAntigas(sala, a, e, textoDe);
  const r = await fetch(`/api/ai/conversas?surface=${sala}`, { cache: "no-store" }).catch(() => null);
  if (!r?.ok) return null;
  const d = await r.json().catch(() => null);
  if (!Array.isArray(d?.conversas)) return null;
  const noServidor = new Set<string>(d.conversas.map((c: ConversaServidor) => c.id));
  const conhecidas = lerIds(a, chaveConhecidas(e));
  const subiu = (() => { try { return !!a.getItem(chaveAntigas(e)); } catch { return false; } })();
  const sumiram = new Set(subiu && d.conversas.length < 200 ? conhecidas.filter((id) => !noServidor.has(id)) : []);
  for (const id of sumiram) try { a.removeItem(chaveDaThread(id, e)); } catch { /* ignore */ }
  gravarIds(a, chaveConhecidas(e), [...conhecidas.filter((id) => !sumiram.has(id)), ...noServidor]);
  let lista = juntarConversas(atuais().filter((t) => !sumiram.has(t.id)), d.conversas, lerApagadas(a, e));
  if (!lista.length && sumiram.size) lista = criarThread([]).threads;
  salvarThreads(a, lista, e);
  return lista;
}

export const mensagensDoServidor = (sala: SalaConversa, id: string): Promise<TranscriptWire[]> => hydrateTranscript(sala, id);
