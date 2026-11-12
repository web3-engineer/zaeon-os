/**
 * lib/estudos/curadoria.ts — a CURADORIA da vitrine (PURO). Pedido do dono (nov/2026): no painel do admin, TODOS os
 * cards da vitrine — os do catálogo embutido, os agentes da orquestra, as skills do disco, os cadastrados no banco e
 * as pesquisas — com as tags, o ícone (uma FOTO que ele sobe), os textos, a raridade e a ordem editáveis, e a opção
 * de esconder um card.
 *
 * Como metade desses cards nasce no CÓDIGO ou no DISCO (não dá pra editar pelo navegador), a curadoria é uma CAMADA
 * DE AJUSTES por cima: um `Ajuste` por id de card (modelo VitrineAjuste) que sobrepõe só os campos que o dono mexeu.
 * O card original nunca é apagado — "restaurar o original" é só apagar o ajuste.
 */
import type { ItemVitrine } from "./vitrine";
import type { Raridade } from "./blueprint";

export type Ajuste = {
  itemId: string;
  titulo?: string | null;
  subtitulo?: string | null;
  /** null/undefined = mantém as tags do card; [] = sem tags */
  tags?: string[] | null;
  /** a FOTO do card (no lugar do emoji do tema) — /api/estudos/vitrine/imagem/<arquivo> */
  imagem?: string | null;
  raridade?: Raridade | null;
  /** posição na vitrine (menor vem antes); null = a ordem natural */
  ordem?: number | null;
  /** escondido da vitrine pública (o admin continua vendo) */
  oculto?: boolean;
};

export const LIMITES_AJUSTE = { titulo: 80, subtitulo: 220, tags: 12, tag: 32, itemId: 120 } as const;
const RARIDADES: Raridade[] = ["comum", "rara", "epica", "lendaria"];

/** só as fotos que a própria Zaeon serve (nada de URL externa: a foto mora no disco da Zaeon) */
export const IMAGEM_RE = /^\/api\/estudos\/vitrine\/imagem\/vimg_[a-f0-9]{16,40}\.(png|jpe?g|webp|gif|avif)$/;
/** o nome do arquivo de uma foto (o que fica no disco, sob .studio) */
export const ARQ_IMAGEM_RE = /^vimg_[a-f0-9]{16,40}\.(png|jpe?g|webp|gif|avif)$/;
/** tipos de imagem aceitos no upload (SVG fica de fora: pode carregar script) */
export const EXT_IMAGEM: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };
export const MIME_IMAGEM: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", avif: "image/avif" };
export const MAX_BYTES_IMAGEM = 4 * 1024 * 1024;
export const urlDaImagem = (arq: string) => `/api/estudos/vitrine/imagem/${arq}`;

/** confere a assinatura do arquivo (os primeiros bytes) — não confia só no tipo que o navegador diz */
export function extDaAssinatura(b: Uint8Array): string | null {
  const s = (i: number, ...v: number[]) => v.every((x, j) => b[i + j] === x);
  if (s(0, 0x89, 0x50, 0x4e, 0x47)) return "png";
  if (s(0, 0xff, 0xd8, 0xff)) return "jpg";
  if (s(0, 0x47, 0x49, 0x46, 0x38)) return "gif";
  if (s(0, 0x52, 0x49, 0x46, 0x46) && s(8, 0x57, 0x45, 0x42, 0x50)) return "webp";
  if (s(4, 0x66, 0x74, 0x79, 0x70) && (s(8, 0x61, 0x76, 0x69, 0x66) || s(8, 0x61, 0x76, 0x69, 0x73))) return "avif";
  return null;
}

const txt = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const listaTags = (v: unknown): string[] =>
  [...new Set((Array.isArray(v) ? v : String(v ?? "").split(/[\n,;]+/)).map((s) => String(s).trim().slice(0, LIMITES_AJUSTE.tag)).filter(Boolean))].slice(0, LIMITES_AJUSTE.tags);

/**
 * valida o corpo de um ajuste. Cada campo é opcional; mandar `null` num campo DESFAZ aquele ajuste (volta ao original).
 * Devolve só o que veio, pronto pro Prisma.
 */
export function normalizarAjuste(b: any): { itemId?: string; data?: Record<string, unknown>; erro?: string } {
  const itemId = txt(b?.itemId, LIMITES_AJUSTE.itemId);
  if (!/^[a-z0-9][a-z0-9_.:-]*$/i.test(itemId)) return { erro: "itemId inválido." };
  const data: Record<string, unknown> = {};
  if (b?.titulo !== undefined) data.titulo = b.titulo === null ? null : txt(b.titulo, LIMITES_AJUSTE.titulo) || null;
  if (b?.subtitulo !== undefined) data.subtitulo = b.subtitulo === null ? null : txt(b.subtitulo, LIMITES_AJUSTE.subtitulo) || null;
  if (b?.tags !== undefined) data.tags = b.tags === null ? null : listaTags(b.tags);
  if (b?.imagem !== undefined) {
    if (b.imagem === null || b.imagem === "") data.imagem = null;
    else if (IMAGEM_RE.test(String(b.imagem))) data.imagem = String(b.imagem);
    else return { erro: "imagem: use uma foto enviada pelo painel." };
  }
  if (b?.raridade !== undefined) {
    if (b.raridade === null || b.raridade === "") data.raridade = null;
    else if (RARIDADES.includes(b.raridade)) data.raridade = b.raridade;
    else return { erro: "raridade inválida." };
  }
  if (b?.ordem !== undefined) {
    if (b.ordem === null || b.ordem === "") data.ordem = null;
    else { const n = Number(b.ordem); if (!Number.isFinite(n)) return { erro: "ordem: um número." }; data.ordem = Math.trunc(n); }
  }
  if (b?.oculto !== undefined) data.oculto = !!b.oculto;
  return { itemId, data };
}

/** um card com o ajuste dele aplicado (só os campos que o dono mexeu) */
export function aplicarAjuste(it: ItemVitrine, a: Ajuste | undefined): ItemVitrine {
  if (!a) return it;
  return {
    ...it,
    ...(a.titulo ? { titulo: a.titulo } : {}),
    ...(a.subtitulo ? { subtitulo: a.subtitulo } : {}),
    ...(Array.isArray(a.tags) ? { tags: a.tags } : {}),
    ...(a.imagem ? { imagem: a.imagem } : {}),
    ...(a.raridade && RARIDADES.includes(a.raridade) ? { raridade: a.raridade } : {}),
  };
}

/**
 * os cards da vitrine com a curadoria: cada um com o seu ajuste, os OCULTOS fora (a não ser no admin, com
 * `comOcultos`), e a ORDEM do dono — quem tem ordem vem antes (do menor pro maior); o resto segue na ordem natural.
 */
export function aplicarAjustes(itens: readonly ItemVitrine[], ajustes: readonly Ajuste[], { comOcultos = false }: { comOcultos?: boolean } = {}): ItemVitrine[] {
  const por = new Map(ajustes.map((a) => [a.itemId, a]));
  const vis = itens
    .map((it, i) => ({ it: aplicarAjuste(it, por.get(it.id)), a: por.get(it.id), i }))
    .filter((x) => comOcultos || !x.a?.oculto);
  const temOrdem = (x: (typeof vis)[number]) => typeof x.a?.ordem === "number";
  return vis
    .sort((x, y) => (temOrdem(x) && temOrdem(y) ? x.a!.ordem! - y.a!.ordem! || x.i - y.i : temOrdem(x) ? -1 : temOrdem(y) ? 1 : x.i - y.i))
    .map((x) => x.it);
}

/** de onde o card vem — o painel mostra, pra o dono saber o que é editável na fonte e o que só pela curadoria */
export type Origem = "catalogo" | "agente" | "skill" | "banco" | "pesquisa";
export const NOME_ORIGEM: Record<Origem, string> = { catalogo: "catálogo", agente: "agente", skill: "skill (disco)", banco: "cadastrado", pesquisa: "pesquisa" };
export function origemDe(it: ItemVitrine, idsEmbutidos: ReadonlySet<string>): Origem {
  if (it.pasta) return "pesquisa";
  if (idsEmbutidos.has(it.id)) return it.plugavel ? "agente" : "catalogo";
  if (it.id.startsWith("skill:")) return "skill";
  return "banco";
}
