/**
 * Validação + merge de cards — PURO. Tudo que vem do cliente passa por `sanitizeCard`
 * antes de tocar o banco: o board é compartilhado, então um card malformado de um
 * colaborador não pode quebrar a tela do outro (nem inflar o documento).
 */
import { TIPOS, type CartolinaCard } from "@/lib/caderno/cartolina-tipos";
import { validarDesenho } from "@/lib/harness/caderno/compile";

export const MAX_CARDS = 200;
const MAX_TEXTO = 4000;
const MAX_TITULO = 200;
const MAX_ID = 64;
const ID_RE = /^[\w:.-]+$/;

const str = (v: unknown, max: number): string | undefined =>
  typeof v === "string" && v.trim() ? v.slice(0, max) : undefined;

const num = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined;

/** null = card inválido (descartado). Coordenadas ficam num intervalo sensato do canvas. */
export function sanitizeCard(raw: unknown): CartolinaCard | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  const id = typeof c.id === "string" && c.id.length <= MAX_ID && ID_RE.test(c.id) ? c.id : null;
  if (!id) return null;
  if (typeof c.tipo !== "string" || !(TIPOS as string[]).includes(c.tipo)) return null;
  const x = num(c.x, -20000, 20000);
  const y = num(c.y, -20000, 20000);
  const w = num(c.w, 120, 1200);
  if (x === undefined || y === undefined || w === undefined) return null;

  const card: CartolinaCard = { id, tipo: c.tipo as CartolinaCard["tipo"], x, y, w };
  const titulo = str(c.titulo, MAX_TITULO);
  const corpo = str(c.corpo, MAX_TEXTO);
  const resposta = str(c.resposta, MAX_TEXTO);
  const legenda = str(c.legenda, MAX_TITULO * 2);
  const rot = num(c.rot, -15, 15);
  if (titulo) card.titulo = titulo;
  if (corpo) card.corpo = corpo;
  if (resposta) card.resposta = resposta;
  if (legenda) card.legenda = legenda;
  if (rot !== undefined) card.rot = rot;
  // msgIds (memória por região): ids curtos das mensagens que geraram o card
  if (Array.isArray(c.msgIds)) {
    const ids = c.msgIds.filter((m): m is string => typeof m === "string" && m.length <= MAX_ID && ID_RE.test(m)).slice(0, 20);
    if (ids.length) card.msgIds = ids;
  }
  // Desenho é RE-VALIDADO a cada escrita (vem do cliente): primitiva forjada morre aqui.
  if (card.tipo === "prancha" && c.desenho) {
    const d = validarDesenho(c.desenho);
    if (d) card.desenho = d;
  }
  if (typeof c.imagemId === "string" && /^[a-f0-9]{24}$/i.test(c.imagemId)) card.imagemId = c.imagemId;
  return card;
}

/** Lê o Json do banco como lista de cards — o que estiver corrompido some em vez de lançar. */
export function readCards(json: unknown): CartolinaCard[] {
  if (!Array.isArray(json)) return [];
  return json.map(sanitizeCard).filter((c): c is CartolinaCard => c !== null);
}

export type CartolinaOps = { upsert?: unknown[]; remove?: unknown[] };

/**
 * Aplica operações sobre o estado ATUAL (relido do banco, não o que o cliente viu).
 * É isso que deixa duas pessoas editarem cards diferentes sem uma apagar a outra:
 * só os ids tocados mudam. Mesmo id nos dois lados → vale o último a gravar (card
 * inteiro, nunca campo a campo — meio-card de um e meio de outro seria incoerente).
 * Ordem do array é preservada (cards novos vão pro fim).
 */
export function applyOps(atual: CartolinaCard[], ops: CartolinaOps): CartolinaCard[] {
  const remover = new Set((ops.remove ?? []).filter((i): i is string => typeof i === "string"));
  const upserts = new Map<string, CartolinaCard>();
  for (const raw of ops.upsert ?? []) {
    const c = sanitizeCard(raw);
    if (c) upserts.set(c.id, c);
  }
  const vistos = new Set<string>();
  const out: CartolinaCard[] = [];
  for (const c of atual) {
    if (remover.has(c.id)) continue;
    out.push(upserts.get(c.id) ?? c);
    vistos.add(c.id);
  }
  for (const [id, c] of upserts) {
    if (!vistos.has(id) && !remover.has(id)) out.push(c);
  }
  return out.slice(0, MAX_CARDS);
}

/**
 * Polling do coworking: chegou o estado do servidor. Vale o REMOTO, exceto os cards que este
 * cliente ainda está mexendo (arrastando ou com gravação pendente) — esses ficam com o valor
 * local, senão o card "pularia de volta" na mão de quem está arrastando a cada poll.
 * Card local pendente que o remoto ainda não tem (acabou de nascer aqui) também fica.
 */
export function mesclarRemoto(local: CartolinaCard[], remoto: CartolinaCard[], pendentes: ReadonlySet<string>): CartolinaCard[] {
  if (!pendentes.size) return remoto;
  const loc = new Map(local.map((c) => [c.id, c]));
  const out = remoto.map((c) => (pendentes.has(c.id) && loc.has(c.id) ? loc.get(c.id)! : c));
  const noRemoto = new Set(remoto.map((c) => c.id));
  for (const c of local) if (pendentes.has(c.id) && !noRemoto.has(c.id)) out.push(c);
  return out;
}
