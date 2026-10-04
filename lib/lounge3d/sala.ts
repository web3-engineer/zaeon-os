/**
 * lib/lounge3d/sala.ts — os NÚCLEOS da sala 3D, PUROS e testáveis: conteúdo (notas/artefatos) com
 * sanitização e tetos, admissão (≤5), movimento relativo à câmera, interpolação dos remotos, ponte
 * chat→nota. Nada de three/DOM/rede aqui.
 */
import {
  LIMITE_SALA, MAX_ARTEFATOS, MAX_NOTAS, MAX_TEXTO_CHAT, MAX_TEXTO_NOTA,
  type ArtefatoCanvas, type ConteudoSala, type NotaCanvas, type OpsSala, type Presenca,
} from "@/lib/lounge3d/tipos";

const ID_RE = /^[\w:.-]{1,64}$/;
const COORD = 400; // metade do chão (plano 400×400 centrado)

// Controle, zero-width e separadores de linha Unicode (U+2028/2029 — num literal de regex quebram o parser).
const CONTROLE = new RegExp("[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f\\u200b-\\u200f\\u2028\\u2029]", "g");
/** Texto do usuário: sem controle/ zero-width, aparado, com teto. (A UI usa textContent — nunca innerHTML.) */
export function sanitizarTexto(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.replace(CONTROLE, "").replace(/\s{3,}/g, "  ").trim().slice(0, max);
}
export const sanitizarChat = (v: unknown) => sanitizarTexto(v, MAX_TEXTO_CHAT);

const num = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : null;

export function sanitizarNota(raw: unknown): NotaCanvas | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !ID_RE.test(r.id)) return null;
  const x = num(r.x, -COORD, COORD), z = num(r.z, -COORD, COORD);
  if (x === null || z === null) return null;
  const text = sanitizarTexto(r.text, MAX_TEXTO_NOTA);
  const n: NotaCanvas = { id: r.id, x, z, kind: r.kind === "do chat" ? "do chat" : "nota", src: sanitizarTexto(r.src, 40) || "Você", text };
  if (typeof r.autorId === "string" && /^[a-f0-9]{24}$/i.test(r.autorId)) n.autorId = r.autorId;
  if (typeof r.scopeId === "string" && ID_RE.test(r.scopeId)) n.scopeId = r.scopeId;
  return n;
}

export function sanitizarArtefato(raw: unknown): ArtefatoCanvas | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !ID_RE.test(r.id)) return null;
  if (r.type !== "molecula" && r.type !== "imagem") return null;
  const x = num(r.x, -COORD, COORD), z = num(r.z, -COORD, COORD);
  if (x === null || z === null) return null;
  const a: ArtefatoCanvas = { id: r.id, type: r.type, x, z };
  if (r.data && typeof r.data === "object") {
    const d = r.data as Record<string, unknown>;
    const data: ArtefatoCanvas["data"] = {};
    if (typeof d.titulo === "string") data.titulo = sanitizarTexto(d.titulo, 120);
    if (typeof d.preset === "string") data.preset = sanitizarTexto(d.preset, 40);
    // só URL http(s) (nada de javascript:/data: num <img>)
    if (typeof d.url === "string" && /^https?:\/\/[^\s"'<>]{1,500}$/.test(d.url)) data.url = d.url;
    a.data = data;
  }
  if (typeof r.autorId === "string" && /^[a-f0-9]{24}$/i.test(r.autorId)) a.autorId = r.autorId;
  return a;
}

/** Lê o `content` (string JSON) do CollabDoc; lixo → sala vazia. */
export function lerConteudo(json: unknown): ConteudoSala {
  let o: any = json;
  if (typeof json === "string") { try { o = JSON.parse(json); } catch { o = null; } }
  const notes = Array.isArray(o?.notes) ? o.notes.map(sanitizarNota).filter((n: NotaCanvas | null): n is NotaCanvas => !!n).slice(0, MAX_NOTAS) : [];
  const artifacts = Array.isArray(o?.artifacts) ? o.artifacts.map(sanitizarArtefato).filter((a: ArtefatoCanvas | null): a is ArtefatoCanvas => !!a).slice(0, MAX_ARTEFATOS) : [];
  return { notes, artifacts };
}

/**
 * Aplica operações por item (upsert/remove) sobre o estado ATUAL — duas pessoas editando notas
 * diferentes não se atropelam (last-write só vale no MESMO id). Tetos respeitados.
 */
export function aplicarOps(atual: ConteudoSala, ops: OpsSala): ConteudoSala {
  const remN = new Set((ops.removeNotes ?? []).filter((i): i is string => typeof i === "string"));
  const remA = new Set((ops.removeArtifacts ?? []).filter((i): i is string => typeof i === "string"));
  const upN = new Map<string, NotaCanvas>(); for (const r of ops.upsertNotes ?? []) { const n = sanitizarNota(r); if (n) upN.set(n.id, n); }
  const upA = new Map<string, ArtefatoCanvas>(); for (const r of ops.upsertArtifacts ?? []) { const a = sanitizarArtefato(r); if (a) upA.set(a.id, a); }
  const notes: NotaCanvas[] = [];
  for (const n of atual.notes) { if (remN.has(n.id)) continue; notes.push(upN.get(n.id) ?? n); upN.delete(n.id); }
  for (const n of upN.values()) if (!remN.has(n.id)) notes.push(n);
  const artifacts: ArtefatoCanvas[] = [];
  for (const a of atual.artifacts) { if (remA.has(a.id)) continue; artifacts.push(upA.get(a.id) ?? a); upA.delete(a.id); }
  for (const a of upA.values()) if (!remA.has(a.id)) artifacts.push(a);
  return { notes: notes.slice(-MAX_NOTAS), artifacts: artifacts.slice(-MAX_ARTEFATOS) };
}

/** Admissão: quem já está dentro sempre entra (reconexão); o 6º novo é recusado. */
export function admitir(ocupantes: string[], userId: string, limite = LIMITE_SALA): { ok: true } | { ok: false; motivo: "cheia" } {
  if (ocupantes.includes(userId)) return { ok: true };
  return ocupantes.length < limite ? { ok: true } : { ok: false, motivo: "cheia" };
}

/** Input WASD relativo ao azimute da câmera → vetor unitário no plano (a fórmula do protótipo). */
export function moverRelativoCamera(ix: number, iz: number, camAz: number): { wx: number; wz: number } | null {
  if (!ix && !iz) return null;
  const s = Math.sin(camAz), c = Math.cos(camAz);
  const wx = ix * c + iz * s, wz = -ix * s + iz * c;
  const m = Math.hypot(wx, wz) || 1;
  return { wx: wx / m, wz: wz / m };
}

/** Avatar remoto: aproxima suave do alvo (lerp exponencial por frame) + rotação pelo menor arco. */
export function interpolar(cur: { x: number; z: number; facing: number }, alvo: { x: number; z: number; facing: number }, dt: number, k = 10): { x: number; z: number; facing: number; moving: boolean } {
  const a = 1 - Math.exp(-k * dt);
  const x = cur.x + (alvo.x - cur.x) * a, z = cur.z + (alvo.z - cur.z) * a;
  let d = alvo.facing - cur.facing; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
  const facing = cur.facing + d * Math.min(1, a * 1.5);
  return { x, z, facing, moving: Math.hypot(alvo.x - cur.x, alvo.z - cur.z) > 0.02 };
}

/** Presença vinda da rede: só o que é número/strings curtas; lixo → null. */
export function sanitizarPresenca(raw: unknown): Presenca | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.userId !== "string" || !/^[a-f0-9]{24}$/i.test(r.userId)) return null;
  const x = num(r.x, -COORD, COORD), z = num(r.z, -COORD, COORD), facing = num(r.facing, -10, 10);
  if (x === null || z === null || facing === null) return null;
  return { userId: r.userId, name: sanitizarTexto(r.name, 40) || "Alguém", color: typeof r.color === "string" && /^#[0-9a-f]{6}$/i.test(r.color) ? r.color : "#4aa3ff", x, z, facing, moving: r.moving === true, sit: r.sit === true, ts: typeof r.ts === "number" ? r.ts : Date.now() };
}

/** Ponte chat → nota: um "ponto importante" da Sala de Pesquisa vira nota SUGERIDA perto do avatar. */
export type PontoDoChat = { id: string; scopeId: string; texto: string; ts: number; titulo?: string };
export function notaDoPonto(p: PontoDoChat, pos: { x: number; z: number }, autorId?: string): NotaCanvas {
  const text = sanitizarTexto(p.titulo ? `${p.titulo}\n${p.texto}` : p.texto, MAX_TEXTO_NOTA);
  const n: NotaCanvas = { id: `c_${p.id}`.slice(0, 64), x: pos.x + 0.7, z: pos.z - 0.5, kind: "do chat", src: "Aura", text, scopeId: p.scopeId };
  if (autorId) n.autorId = autorId;
  return n;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
