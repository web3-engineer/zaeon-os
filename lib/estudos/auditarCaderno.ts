/**
 * lib/estudos/auditarCaderno.ts — o PORTÃO OBJETIVO do verificador: um caderno de campo só entra se tem páginas
 * suficientes, fontes reais, vídeos com id válido e mobilização completa. PURO (sem rede) — a conferência de que a
 * fonte EXISTE é do especialista pesquisador; aqui travamos o que dá pra medir no próprio objeto.
 */
import type { CadernoEstudo, BlocoEstudo } from "./cadernosEstudo";

const ID_YOUTUBE = /^[A-Za-z0-9_-]{11}$/;
const PLACEHOLDER = /^(xxx|todo|placeholder|exemplo|id|video)/i;

/** devolve a lista de problemas (vazia = aprovado). `alvo` = mínimo de páginas do caderno. */
export function auditarCaderno(c: CadernoEstudo, alvo: number): string[] {
  const p: string[] = [];
  const paginas = c.paginas ?? [];
  if (paginas.length < alvo) p.push(`poucas_paginas:${paginas.length}/${alvo}`);
  const blocos: BlocoEstudo[] = paginas.flatMap((pg) => [...(pg.blocos ?? [])]);

  for (const pg of paginas) if (!pg.blocos?.length) p.push(`pagina_vazia:${pg.id}`);

  // fontes: ao menos um bloco de fontes com item real (título + url http)
  const fontes = blocos.filter((b): b is Extract<BlocoEstudo, { tipo: "fontes" }> => b.tipo === "fontes");
  const itensFonte = fontes.flatMap((f) => f.itens ?? []);
  if (!itensFonte.some((i) => i?.titulo?.trim() && /^https?:\/\//.test(i?.url ?? ""))) p.push("sem_fontes");

  // vídeos: id de YouTube de 11 chars, não-placeholder
  for (const b of blocos) if (b.tipo === "video") {
    const id = (b.youtube ?? "").trim();
    if (!ID_YOUTUBE.test(id) || PLACEHOLDER.test(id)) p.push(`video_invalido:${id.slice(0, 16)}`);
  }

  // mobilização: papel e entrega preenchidos
  for (const b of blocos) if (b.tipo === "mobilizacao") {
    if (!b.papel?.trim() || !b.entregaEsperada?.trim()) p.push("mobilizacao_incompleta");
  }

  // lição: índice correto dentro das alternativas
  for (const b of blocos) if (b.tipo === "licao") {
    if (!b.alternativas?.length || b.correta < 0 || b.correta >= b.alternativas.length) p.push("licao_invalida");
  }
  return p;
}

/** resumo curto pro loop do agente */
export const cadernoOk = (c: CadernoEstudo, alvo: number): boolean => auditarCaderno(c, alvo).length === 0;
