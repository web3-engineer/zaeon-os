/**
 * BLUEPRINT PRÁTICO — o documento de um estudo (PURO, client-safe). Pedido do dono (out/2026): a Sala de Estudos é
 * onde a conversa do chat TOMA FORMA PRÁTICA — percurso, fontes, repositórios do tema, demo, produto, próximos passos,
 * e CRÍTICOS vermelhos que travam cada fase até haver ENTREGA REAL provada. Spec:
 * docs/superpowers/specs/2026-10-22-blueprint-pratico-design.md.
 *
 * Um documento por estudo, guardado em `Cartolina.cards` (surface `blueprint`, `scopeId` = o thread id da conversa).
 * Tudo que entra (do modelo, do cliente, do banco) passa por `sanitizarDoc` — o corrompido é podado, nunca lança.
 */
import { urlSegura } from "@/lib/estudos/board";

export const SURFACE_BLUEPRINT = "blueprint" as const;
/** o servidor: cria/recompõe o blueprint a cada turno estudável e abre as rotas /api/blueprint */
export const blueprintOn = (): boolean => process.env.BLUEPRINT_PRATICO === "1";
/** a UI: a aba "Sala de Estudos" mostra o blueprint (valor de BUILD) */
export const blueprintUiOn = (): boolean => process.env.NEXT_PUBLIC_BLUEPRINT_PRATICO === "1";

export type Fase = 1 | 2 | 3 | 4;
export const FASES: readonly Fase[] = [1, 2, 3, 4];
export const NOME_FASE: Record<Fase, string> = { 1: "Fundamento", 2: "Prova de conceito", 3: "Produto", 4: "Final" };
export type Area = "tecnologia" | "ciencia" | "saude" | "engenharia" | "negocios" | "humanas" | "outra";
export const AREAS: readonly Area[] = ["tecnologia", "ciencia", "saude", "engenharia", "negocios", "humanas", "outra"];

export type FonteBp = { titulo: string; url?: string; ano?: number };
export type Passo = { id: string; titulo: string; corpo?: string; fase: Fase; fontes: FonteBp[] };
/** uma peça da FIGURA (a máquina cujo funcionamento É o tema — padrão do anatomy) */
export type Peca = { id: string; nome: string; sub?: string; fase: Fase; /** a FORMA real da peça na máquina (lib/blueprint/maquina) */ forma?: string };
export type TipoProva = "repo" | "link" | "demo";
export const TIPOS_PROVA: readonly TipoProva[] = ["repo", "link", "demo"];
/** a prova conferida pelo SERVIDOR (o cliente nunca grava isto) */
export type Entrega = { url: string; em: number; detalhe: string };
/** um CRÍTICO (a "incógnita" do rea): o que fazer, a prova exigida, o que trava; só fecha com prova conferida */
export type Critico = {
  id: string; fase: Fase; titulo: string; prova: string; tipoProva: TipoProva;
  pecaId?: string; passoId?: string; abertoEm: number; status: "aberto" | "provado"; entrega?: Entrega;
};
export type Repo = { nome: string; url: string; descricao?: string; estrelas?: number; meu?: boolean };
export type Participante = { id: string; nome: string; papel: "mentor" | "agente" | "dev" | "voce"; emoji?: string };
export const PAPEIS_PARTICIPANTE: readonly Participante["papel"][] = ["mentor", "agente", "dev", "voce"];
/** a rubrica do dono (0..100 cada) */
export type Rubrica = { rigor: number; originalidade: number; usabilidade: number; viabilidade: number; impacto: number };
export const DIMENSOES: readonly (keyof Rubrica)[] = ["rigor", "originalidade", "usabilidade", "viabilidade", "impacto"];
export type Avaliacao = { fase: Fase; em: number; nota: Rubrica; parecer: string; aprovada: boolean };
export type Nota = { id: string; titulo?: string; corpo?: string; autor?: string };
/** um DOCUMENTO citado na conversa ou da pessoa (lib/videodoc/documentos). Os `base` (até 3, a Zaeon marca) ganham VÍDEO */
export type TipoDocumento = "artigo" | "livro" | "base" | "trabalho";
export const TIPOS_DOCUMENTO: readonly TipoDocumento[] = ["artigo", "livro", "base", "trabalho"];
export type Documento = { id: string; titulo: string; tipo: TipoDocumento; url?: string; ref?: string; base: boolean; videoId?: string };

export type DocBlueprint = {
  v: 1; titulo: string; resumo: string; area: Area;
  produto?: { titulo: string; corpo?: string };
  demo?: { titulo: string; corpo?: string; url?: string };
  /** a fase ATUAL (as anteriores estão aprovadas) */
  fase: Fase; aguardandoMentor: boolean;
  passos: Passo[]; pecas: Peca[]; ligacoes: [string, string][]; criticos: Critico[];
  /** a máquina do tema (padrão anatomy): o OBJETO em uma frase (o que é e o que se move) e o ARRANJO das peças */
  objeto?: string; arranjo?: string;
  repos: Repo[]; termosRepo: string[]; participantes: Participante[]; proximos: string[];
  /** buscas no YouTube pra estudar o tema e a fase atual (o card "estude no YouTube" — a Zaeon sugere, a pessoa abre) */
  buscasYoutube: string[];
  avaliacoes: Avaliacao[]; notas: Nota[];
  /** os documentos do estudo (coletados das respostas da Aura) — os `base` viram vídeo com a Zaeon holograma */
  documentos: Documento[];
  /** os módulos que a pessoa ARRASTOU (ficam onde foram soltos até "reorganizar") */
  fixos: Record<string, { x: number; y: number }>;
  compostoEm: number; turnos: number;
  /** #681: a pessoa deu o nome: a Zaeon não troca mais quando refaz o blueprint */
  tituloFixo?: boolean;
};

/** MAX_CRITICOS = os ABERTOS (até 3 por fase); os PROVADOS nunca são cortados por eles (entrega real não some) */
export const MAX_DOCUMENTOS = 20, MAX_BASE = 3;
export const MAX_PASSOS = 10, MAX_PECAS = 7, MAX_CRITICOS = 12, MAX_PROVADOS = 60, MAX_ABERTOS_POR_FASE = 3, MAX_REPOS = 6, MAX_PROXIMOS = 6, MAX_NOTAS = 30;
const MAX_TITULO = 200, MAX_CORPO = 1200, MAX_FONTES = 6, MAX_PARTICIPANTES = 8, MAX_AVALIACOES = 12, MAX_FIXOS = 80;
const ID_RE = /^[\w:.-]{1,64}$/;

const str = (v: unknown, max: number): string | undefined => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const num = (v: unknown, min: number, max: number): number | undefined => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined);
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export const idOk = (v: unknown): v is string => typeof v === "string" && ID_RE.test(v);
export const faseDe = (v: unknown): Fase => (v === 1 || v === 2 || v === 3 || v === 4 ? v : 1);
/** lista sem ids repetidos (o primeiro vence) */
function unicos<T extends { id: string }>(xs: T[]): T[] { const v = new Set<string>(); return xs.filter((x) => (v.has(x.id) ? false : (v.add(x.id), true))); }

export function docVazio(titulo: string, agora: number): DocBlueprint {
  void agora;
  return {
    v: 1, titulo: titulo.trim().slice(0, MAX_TITULO) || "Estudo", resumo: "", area: "outra", fase: 1, aguardandoMentor: false,
    passos: [], pecas: [], ligacoes: [], criticos: [], repos: [], termosRepo: [], participantes: [], proximos: [], buscasYoutube: [],
    avaliacoes: [], notas: [], documentos: [], fixos: {}, compostoEm: 0, turnos: 0,
  };
}

export function sanitizarFonte(v: unknown): FonteBp | null {
  const o = obj(v); const titulo = str(o?.titulo, 300); if (!o || !titulo) return null;
  const f: FonteBp = { titulo }; const url = urlSegura(o.url), ano = num(o.ano, 1500, 2100);
  if (url) f.url = url; if (ano !== undefined) f.ano = Math.round(ano);
  return f;
}
export function sanitizarPasso(v: unknown): Passo | null {
  const o = obj(v); const titulo = str(o?.titulo, MAX_TITULO); if (!o || !idOk(o.id) || !titulo) return null;
  const p: Passo = { id: o.id, titulo, fase: faseDe(o.fase), fontes: arr(o.fontes).map(sanitizarFonte).filter((f): f is FonteBp => !!f).slice(0, MAX_FONTES) };
  const corpo = str(o.corpo, MAX_CORPO); if (corpo) p.corpo = corpo;
  return p;
}
export function sanitizarPeca(v: unknown): Peca | null {
  const o = obj(v); const nome = str(o?.nome, 60); if (!o || !idOk(o.id) || !nome) return null;
  const p: Peca = { id: o.id, nome, fase: faseDe(o.fase) }; const sub = str(o.sub, 120); if (sub) p.sub = sub;
  const forma = str(o.forma, 20); if (forma && /^[a-z]+$/.test(forma)) p.forma = forma;
  return p;
}
function sanitizarEntrega(v: unknown): Entrega | undefined {
  const o = obj(v); const url = urlSegura(o?.url), em = num(o?.em, 0, 9e15), detalhe = str(o?.detalhe, 200);
  return url && em !== undefined ? { url, em: Math.round(em), detalhe: detalhe ?? "" } : undefined;
}
export function sanitizarCritico(v: unknown): Critico | null {
  const o = obj(v); const titulo = str(o?.titulo, MAX_TITULO), prova = str(o?.prova, 400);
  if (!o || !idOk(o.id) || !titulo || !prova) return null;
  const tipoProva = (TIPOS_PROVA as readonly unknown[]).includes(o.tipoProva) ? (o.tipoProva as TipoProva) : "link";
  const entrega = sanitizarEntrega(o.entrega);
  const c: Critico = { id: o.id, fase: faseDe(o.fase), titulo, prova, tipoProva, abertoEm: Math.round(num(o.abertoEm, 0, 9e15) ?? 0), status: o.status === "provado" && entrega ? "provado" : "aberto" };
  if (c.status === "provado") c.entrega = entrega;
  if (idOk(o.pecaId)) c.pecaId = o.pecaId; if (idOk(o.passoId)) c.passoId = o.passoId;
  return c;
}
export function sanitizarRepo(v: unknown): Repo | null {
  const o = obj(v); const nome = str(o?.nome, 140), url = urlSegura(o?.url); if (!o || !nome || !url) return null;
  const r: Repo = { nome, url }; const d = str(o.descricao, 240), e = num(o.estrelas, 0, 1e9);
  if (d) r.descricao = d; if (e !== undefined) r.estrelas = Math.round(e); if (o.meu === true) r.meu = true;
  return r;
}
export function sanitizarParticipante(v: unknown): Participante | null {
  const o = obj(v); const nome = str(o?.nome, 80); if (!o || !idOk(o.id) || !nome) return null;
  const papel = (PAPEIS_PARTICIPANTE as readonly unknown[]).includes(o.papel) ? (o.papel as Participante["papel"]) : "agente";
  const p: Participante = { id: o.id, nome, papel }; const emoji = str(o.emoji, 8); if (emoji) p.emoji = emoji;
  return p;
}
export function sanitizarRubrica(v: unknown): Rubrica | null {
  const o = obj(v); if (!o) return null;
  const r = {} as Rubrica;
  for (const k of DIMENSOES) { const n = num(o[k], -1e9, 1e9); if (n === undefined) return null; r[k] = Math.round(Math.min(100, Math.max(0, n))); }
  return r;
}
function sanitizarAvaliacao(v: unknown): Avaliacao | null {
  const o = obj(v); const nota = sanitizarRubrica(o?.nota), parecer = str(o?.parecer, 1200), em = num(o?.em, 0, 9e15);
  return o && nota && parecer && em !== undefined ? { fase: faseDe(o.fase), em: Math.round(em), nota, parecer, aprovada: o.aprovada === true } : null;
}
export function sanitizarNota(v: unknown): Nota | null {
  const o = obj(v); if (!o || !idOk(o.id)) return null;
  const n: Nota = { id: o.id }; const t = str(o.titulo, MAX_TITULO), c = str(o.corpo, MAX_CORPO);
  if (t) n.titulo = t; if (c) n.corpo = c; if (idOk(o.autor)) n.autor = o.autor;
  return n.titulo || n.corpo ? n : null;
}
const OID = /^[a-f0-9]{24}$/i;
export function sanitizarDocumento(v: unknown): Documento | null {
  const o = obj(v); const titulo = str(o?.titulo, 300);
  if (!o || !idOk(o.id) || !titulo || !(TIPOS_DOCUMENTO as readonly unknown[]).includes(o.tipo)) return null;
  const d: Documento = { id: o.id, titulo, tipo: o.tipo as TipoDocumento, base: o.base === true };
  const url = urlSegura(o.url), ref = str(o.ref, 200);
  if (url) d.url = url; if (ref) d.ref = ref;
  if (typeof o.videoId === "string" && OID.test(o.videoId)) d.videoId = o.videoId;
  return d;
}
const sanitizarTextos = (v: unknown, n: number, max: number) => arr(v).map((x) => str(x, max)).filter((x): x is string => !!x).slice(0, n);

export function sanitizarDoc(raw: unknown): DocBlueprint | null {
  const o = obj(raw); if (!o || o.v !== 1) return null;
  const titulo = str(o.titulo, MAX_TITULO); if (!titulo) return null;
  const pecas = unicos(arr(o.pecas).map(sanitizarPeca).filter((p): p is Peca => !!p)).slice(0, MAX_PECAS);
  const idsPeca = new Set(pecas.map((p) => p.id));
  const passos = unicos(arr(o.passos).map(sanitizarPasso).filter((p): p is Passo => !!p)).slice(0, MAX_PASSOS);
  const idsPasso = new Set(passos.map((p) => p.id));
  const ligacoes = arr(o.ligacoes).filter((l): l is [string, string] => Array.isArray(l) && l.length === 2 && idsPeca.has(l[0]) && idsPeca.has(l[1]) && l[0] !== l[1]).map((l) => [l[0], l[1]] as [string, string]).slice(0, 20);
  const todos = unicos(arr(o.criticos).map(sanitizarCritico).filter((c): c is Critico => !!c));
  const criticos = [...todos.filter((c) => c.status === "provado").slice(0, MAX_PROVADOS), ...todos.filter((c) => c.status === "aberto").slice(0, MAX_CRITICOS)]
    .map((c) => ({ ...c, pecaId: c.pecaId && idsPeca.has(c.pecaId) ? c.pecaId : undefined, passoId: c.passoId && idsPasso.has(c.passoId) ? c.passoId : undefined }))
    .map((c) => { if (!c.pecaId) delete c.pecaId; if (!c.passoId) delete c.passoId; return c; });
  const fixos: DocBlueprint["fixos"] = {};
  for (const [k, v] of Object.entries(obj(o.fixos) ?? {}).slice(0, MAX_FIXOS)) {
    const p = obj(v), x = num(p?.x, -40000, 40000), y = num(p?.y, -40000, 40000);
    if (k.length <= 80 && x !== undefined && y !== undefined) fixos[k] = { x, y };
  }
  const d: DocBlueprint = {
    v: 1, titulo, resumo: str(o.resumo, MAX_CORPO) ?? "", area: (AREAS as readonly unknown[]).includes(o.area) ? (o.area as Area) : "outra",
    fase: faseDe(o.fase), aguardandoMentor: o.aguardandoMentor === true,
    passos, pecas, ligacoes, criticos,
    repos: arr(o.repos).map(sanitizarRepo).filter((r): r is Repo => !!r).slice(0, MAX_REPOS),
    termosRepo: sanitizarTextos(o.termosRepo, 4, 60),
    buscasYoutube: sanitizarTextos(o.buscasYoutube, 4, 90),
    participantes: unicos(arr(o.participantes).map(sanitizarParticipante).filter((p): p is Participante => !!p)).slice(0, MAX_PARTICIPANTES),
    proximos: sanitizarTextos(o.proximos, MAX_PROXIMOS, 240),
    avaliacoes: arr(o.avaliacoes).map(sanitizarAvaliacao).filter((a): a is Avaliacao => !!a).slice(-MAX_AVALIACOES),
    notas: unicos(arr(o.notas).map(sanitizarNota).filter((n): n is Nota => !!n)).slice(0, MAX_NOTAS),
    documentos: unicos(arr(o.documentos).map(sanitizarDocumento).filter((x): x is Documento => !!x)).slice(0, MAX_DOCUMENTOS),
    fixos, compostoEm: Math.round(num(o.compostoEm, 0, 9e15) ?? 0), turnos: Math.round(num(o.turnos, 0, 1e9) ?? 0),
  };
  const objeto = str(o.objeto, 240), arranjo = str(o.arranjo, 12);
  if (objeto) d.objeto = objeto; if (arranjo && /^[a-z]+$/.test(arranjo)) d.arranjo = arranjo;
  const produto = obj(o.produto), demo = obj(o.demo);
  const pt = str(produto?.titulo, MAX_TITULO); if (pt) d.produto = { titulo: pt, ...(str(produto?.corpo, MAX_CORPO) ? { corpo: str(produto?.corpo, MAX_CORPO) } : {}) };
  const dt = str(demo?.titulo, MAX_TITULO);
  if (dt) { d.demo = { titulo: dt }; const c = str(demo?.corpo, MAX_CORPO), u = urlSegura(demo?.url); if (c) d.demo.corpo = c; if (u) d.demo.url = u; }
  if (o.tituloFixo === true) d.tituloFixo = true;
  return d;
}
