/**
 * Chat → cartolina: a resposta estruturada da Aura (harness) vira cards. É o irmão do
 * `cardsFromAura` (que parte de um JSON pensado pra cartolina); aqui o ponto de partida é o
 * `StructuredAnswer` que o chat JÁ produz — nenhuma chamada de modelo a mais.
 *
 * PURO. Ids DETERMINÍSTICOS pelo conteúdo: o mesmo conceito citado em dois turnos é o MESMO
 * card (ganha mais um msgId) em vez de um clone — a cartolina é memória, não histórico.
 */
import type { StructuredAnswer } from "@/lib/agent/contracts";
import type { CartolinaCard } from "@/lib/caderno/cartolina";

export const MAX_CARDS_POR_TURNO = 8;
const COL_W = 330, GAP_X = 40, GAP_Y = 40, COLS = 3, X0 = 120, ALTURA_LINHA = 240;

/** Hash curto estável (djb2) — só pra id; não é segurança. */
function h(s: string): string {
  let x = 5381;
  for (let i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) | 0;
  return (x >>> 0).toString(36);
}
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const corta = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

type Rascunho = Omit<CartolinaCard, "x" | "y" | "w" | "rot">;

/** Cards que a resposta gera, SEM posição (a posição depende do que já está no board). */
export function rascunhosFromStructured(a: StructuredAnswer, msgId?: string): Rascunho[] {
  const out: Rascunho[] = [];
  const com = (r: Rascunho): Rascunho => (msgId ? { ...r, msgIds: [msgId] } : r);

  for (const c of a.conceitos ?? []) {
    const t = (c ?? "").trim();
    if (t) out.push(com({ id: `k_${h(norm(t))}`, tipo: "nota", titulo: corta(t, 80) }));
  }
  for (const e of a.evidencia ?? []) {
    const claim = (e?.claim ?? "").trim();
    if (!claim) continue;
    const fonte = (e.source as any)?.title ?? (e.source as any)?.name;
    out.push(com({ id: `e_${h(norm(claim))}`, tipo: "nota", titulo: "Evidência", corpo: corta(claim, 400), ...(fonte ? { legenda: corta(String(fonte), 120) } : {}) }));
  }
  for (const p of a.proximos_passos ?? []) {
    const t = (p ?? "").trim();
    if (t) out.push(com({ id: `p_${h(norm(t))}`, tipo: "pergunta", titulo: "Próximo passo", corpo: corta(t, 300) }));
  }
  for (const s of a.work?.sections ?? []) {
    const t = (s?.title ?? "").trim();
    if (t) out.push(com({ id: `w_${h(norm(t))}`, tipo: "nota", titulo: corta(t, 80), corpo: corta((s.body ?? "").trim(), 400) || undefined }));
  }
  for (const art of a.artifacts ?? []) {
    const kind = String((art as any)?.studioKind ?? "");
    const topic = String((art as any)?.topic ?? (art as any)?.title ?? kind).trim();
    if (!kind) continue;
    out.push(com({ id: `a_${h(kind + "|" + norm(topic))}`, tipo: kind === "video" ? "video" : "prancha", titulo: corta(topic, 80), legenda: kind }));
  }
  // dedupe dentro do turno (o modelo repete) + teto: a cartolina não vira despejo de texto
  const vistos = new Set<string>();
  return out.filter((r) => (vistos.has(r.id) ? false : (vistos.add(r.id), true))).slice(0, MAX_CARDS_POR_TURNO);
}

/**
 * Funde os rascunhos num board existente. Card que já existe: só acumula o msgId (não mexe em
 * posição, que o aluno pode ter arrumado). Card novo: nasce na próxima linha livre ABAIXO do
 * conteúdo atual, na grade, sem sobrepor.
 */
export function fundirNoBoard(atual: CartolinaCard[], rasc: Rascunho[]): CartolinaCard[] {
  const porId = new Map(atual.map((c) => [c.id, c]));
  const out = [...atual];
  const baseY = atual.length ? Math.max(...atual.map((c) => c.y)) + ALTURA_LINHA + GAP_Y : 60;
  let n = 0;
  for (const r of rasc) {
    const ja = porId.get(r.id);
    if (ja) {
      const ids = [...new Set([...(ja.msgIds ?? []), ...(r.msgIds ?? [])])].slice(-20);
      const i = out.findIndex((c) => c.id === r.id);
      out[i] = { ...ja, ...(ids.length ? { msgIds: ids } : {}) };
      continue;
    }
    const col = n % COLS, row = Math.floor(n / COLS);
    out.push({ ...r, x: X0 + col * (COL_W + GAP_X), y: baseY + row * (ALTURA_LINHA + GAP_Y), w: COL_W, rot: (((atual.length + n) * 37) % 40) / 10 - 2 });
    n++;
  }
  return out;
}

export function cardsFromStructured(a: StructuredAnswer, existentes: CartolinaCard[] = [], msgId?: string): CartolinaCard[] {
  return fundirNoBoard(existentes, rascunhosFromStructured(a, msgId));
}

/**
 * A "bússola": o que a cartolina diz ao agente. Curta de propósito (vai pro prompt a cada
 * turno): títulos por tipo + o que está em aberto (perguntas/exercícios). Vazia = "".
 */
export function bussola(cards: CartolinaCard[], maxChars = 1200): string {
  if (!cards.length) return "";
  const t = (c: CartolinaCard) => (c.titulo || c.corpo || "").replace(/\s+/g, " ").trim().slice(0, 70);
  const lista = (tipo: CartolinaCard["tipo"]) => cards.filter((c) => c.tipo === tipo).map(t).filter(Boolean);
  const partes: string[] = [];
  const notas = lista("nota"); if (notas.length) partes.push(`Já estudado (cartolina): ${notas.join("; ")}`);
  const abertos = [...lista("pergunta"), ...lista("exercicio")]; if (abertos.length) partes.push(`Em aberto / a estudar: ${abertos.join("; ")}`);
  const outros = [...lista("prancha"), ...lista("video")]; if (outros.length) partes.push(`Material criado: ${outros.join("; ")}`);
  const txt = "=== CARTOLINA DO ALUNO (memória do que já foi estudado nesta conversa) ===\n" + partes.join("\n") +
    "\nUse isto pra não repetir o que ele já viu e pra conduzir ao que falta.";
  return txt.length > maxChars ? txt.slice(0, maxChars - 1) + "…" : txt;
}
