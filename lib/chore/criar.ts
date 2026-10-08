/**
 * lib/chore/criar.ts — validação do ALVO por tipo + criar e disparar (rotas do canal, admin e
 * triagem da mensagem). O alvo vem de humano/admin: é DADO, então é saneado e limitado aqui.
 * O destino é montado pelo SERVIDOR (canal da rota + thread), nunca pelo cliente nem pelo modelo.
 */
import { origemDe } from "@/lib/chore/catalogo";
import { criarChore, ehTipoChore, type AlvoChore, type ChoreDb, type ChoreRow, type DestinoChore, type TipoChore } from "@/lib/chore/store";

/** Tipos que um MEMBRO do canal pode pedir (os demais são de admin/autônomos — Fatia 8). */
export const TIPOS_DO_CANAL: readonly TipoChore[] = ["resumir_link", "extrair_campos", "formatar_abnt", "traduzir_trecho", "link_rot"];

export const choresLigadas = (env: Record<string, string | undefined> = process.env): boolean => env.CHORES_QUEUE === "1";

const urlOk = (u: unknown): u is string => typeof u === "string" && u.length <= 2000 && /^https?:\/\/[^\s]+$/i.test(u.trim());
const txt = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const lista = (v: unknown, max: number, item: number) => (Array.isArray(v) ? v.map((x) => txt(x, item)).filter(Boolean).slice(0, max) : []);

/** Alvo saneado por tipo, ou { erro }. */
export function validarAlvo(tipo: TipoChore, bruto: unknown): { alvo: AlvoChore } | { erro: string } {
  const a = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;
  switch (tipo) {
    case "resumir_link": case "checar_pagina":
      return urlOk(a.url) ? { alvo: { url: a.url.trim() } } : { erro: "url http(s) obrigatória" };
    case "feed_novos": {
      const u = a.feedUrl ?? a.url;
      return urlOk(u) ? { alvo: { feedUrl: (u as string).trim() } } : { erro: "feedUrl http(s) obrigatória" };
    }
    case "extrair_campos": {
      const campos = lista(a.campos, 12, 40);
      if (!campos.length) return { erro: "campos obrigatórios" };
      if (urlOk(a.url)) return { alvo: { url: a.url.trim(), campos } };
      const texto = txt(a.texto, 8000);
      return texto ? { alvo: { texto, campos } } : { erro: "url ou texto obrigatório" };
    }
    case "classificar_anexo": {
      const texto = txt(a.texto, 8000), classes = lista(a.classes, 20, 40);
      return texto && classes.length >= 2 ? { alvo: { texto, classes } } : { erro: "texto e ≥2 classes obrigatórios" };
    }
    case "traduzir_trecho": {
      const texto = txt(a.texto, 2000);
      return texto ? { alvo: { texto, de: txt(a.de, 20) || undefined, para: txt(a.para, 20) || "pt-BR" } } : { erro: "texto obrigatório" };
    }
    case "link_rot": {
      const urls = (Array.isArray(a.urls) ? a.urls : []).filter(urlOk).map((u) => (u as string).trim()).slice(0, 20);
      return urls.length ? { alvo: { urls } } : { erro: "urls obrigatórias" };
    }
    case "formatar_abnt": {
      const r = (a.referencia && typeof a.referencia === "object" ? a.referencia : {}) as Record<string, unknown>;
      const referencia = { title: txt(r.title, 400), authors: lista(r.authors, 30, 120), year: Number(r.year) || undefined, venue: txt(r.venue, 200) || undefined, doi: txt(r.doi, 200) || undefined, url: urlOk(r.url) ? (r.url as string).trim() : undefined };
      return referencia.title || referencia.doi || referencia.url ? { alvo: { referencia } } : { erro: "referência sem título/DOI/URL" };
    }
    case "digest":
      return { alvo: {} };
  }
}

export type PedidoCriar = {
  tipo: unknown; alvo: unknown; agentKey?: string | null; canalId: string | null; parentId?: string | null;
  requesterId: string | null; rodada?: string | number; tiposPermitidos?: readonly TipoChore[];
};

/** Valida, cria (idempotente) e devolve a linha — quem chama decide disparar. */
export async function criarDoPedido(db: ChoreDb, p: PedidoCriar): Promise<{ row: ChoreRow } | { erro: string; status: number }> {
  if (!ehTipoChore(p.tipo)) return { erro: "tipo de chore desconhecido", status: 400 };
  if (p.tiposPermitidos && !p.tiposPermitidos.includes(p.tipo)) return { erro: "tipo não permitido aqui", status: 400 };
  const v = validarAlvo(p.tipo, p.alvo);
  if ("erro" in v) return { erro: v.erro, status: 400 };
  const agentKey = typeof p.agentKey === "string" && /^[a-z0-9][a-z0-9_-]{0,40}$/.test(p.agentKey) ? p.agentKey : "aura";
  const destino: DestinoChore = { canalId: p.canalId, parentId: p.parentId ?? null, modo: p.canalId ? "thread" : "silencioso" };
  const row = await criarChore(db, { tipo: p.tipo, agentKey, requesterId: p.requesterId, canalId: p.canalId, alvo: v.alvo, destino, origemConteudo: origemDe(p.tipo, v.alvo), rodada: p.rodada });
  return { row };
}

/** Linha pública (sem o texto completo do resultado — a sala vê status e trecho). */
export function choreParaWire(c: ChoreRow) {
  const t = c.resultado?.texto ?? null;
  return {
    id: c.id, tipo: c.tipo, agentKey: c.agentKey, status: c.status, motivo: c.motivo, chamadasLlm: c.chamadasLlm, ms: c.ms,
    alvo: c.resultado?.alvo ?? null, fonteUrl: c.resultado?.fonteUrl ?? null, trecho: t ? (t.length > 160 ? t.slice(0, 160) + "…" : t) : null,
    createdAt: new Date(c.createdAt).toISOString(), updatedAt: new Date(c.updatedAt).toISOString(),
  };
}
