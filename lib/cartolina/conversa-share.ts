/**
 * lib/cartolina/conversa-share.ts — convidar alguém para A CONVERSA, pela própria conversa.
 *
 * ───────────────────────── por que este módulo existe ─────────────────────────
 *
 * A D6 pôs o botão "Convidar" dentro do PAINEL DO DOCUMENTO, e o convite que ele gera concede papel
 * na CONVERSA inteira. O resultado ficou incoerente, e só apareceu quando o dono foi procurar:
 * conversa sem documento aberto **não tinha porta nenhuma**, e quem procurava "compartilhar" na
 * conversa não achava — estava escondido dentro de um documento.
 *
 * Aqui é a mesma concessão, pela porta certa: a conversa. O trilho é o mesmo de sempre
 * (`gerarLink` + `CartolinaMembro` + `papelDe`), e por isso um convite feito por aqui e um feito
 * pelo documento são a MESMA coisa — não há dois sistemas de permissão.
 *
 * 🔴 O CUIDADO QUE ESTE MÓDULO TEM E O DO DOCUMENTO NÃO PRECISAVA TER: lá a autorização vinha do
 * próprio trabalho (`podeAdministrar` sobre o papel no documento). Aqui só existe o `scopeId`, e
 * procurar o board por `{ ownerId: eu, scopeId }` seria um buraco: quem é MEMBRO da conversa de
 * outra pessoa não acharia o board dela e acabaria CRIANDO um segundo board, do mesmo escopo, sob
 * o próprio id — virando "dono" de uma conversa que não é sua. Por isso a busca é por `scopeId`
 * primeiro, e board de outro dono é recusa, não criação.
 */
import { prisma } from "@/src/lib/prisma";
import { gerarLink, revogarLinks } from "@/lib/cartolina/cowork-store";
import type { PapelConvidavel } from "@/lib/cartolina/access";

/**
 * A surface do board da conversa. É a MESMA que `papelNoWork` (lib/tcc/store) consulta — e não
 * tem nada a ver com `SURFACE_ESTUDOS` de lib/estudos/board, que vale "meus-estudos" e é outro
 * recurso. Trocar uma pela outra gera convite que nunca concede nada.
 */
export const SURFACE_CONVERSA = "estudos" as const;

export type MotivoConvite = "not_found" | "forbidden" | "sem_conversa";
export type FalhaConvite = { ok: false; reason: MotivoConvite };
export type ConviteConversa = {
  ok: true; url: string; token: string; papel: PapelConvidavel; boardId: string; escopo: "conversa";
};

/** O board daquela conversa, de QUALQUER dono. `null` = a conversa ainda não tem board. */
export async function acharBoardDaConversa(scopeId: string): Promise<{ id: string; ownerId: string } | null> {
  return prisma.cartolina.findFirst({
    where: { surface: SURFACE_CONVERSA, scopeId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, ownerId: true },
  });
}

/**
 * O board da conversa, criando se faltar. SÓ chame depois de concluir que `ownerId` é o dono da
 * conversa — criar aqui é abrir a porta da própria casa.
 *
 * Criar é obrigatório e não é zelo: `papelNoWork` resolve o papel do convidado ATRAVÉS do board.
 * Sem board o convite nasceria morto — link válido, pessoa entrando, e "sem acesso" na cara dela.
 * Conversa sem board é o caso comum (ele só nasce em `memoria-turno`, com `CARTOLINA_MEMORIA=1`).
 */
export async function boardDaConversa(ownerId: string, scopeId: string): Promise<string> {
  const achado = await acharBoardDaConversa(scopeId);
  if (achado) return achado.id;
  const novo = await prisma.cartolina.create({
    data: { ownerId, surface: SURFACE_CONVERSA, scopeId, titulo: "Estudo", cards: [] as never },
  });
  return novo.id;
}

const url = (boardId: string, token: string) => `/estudo/${boardId}?convite=${encodeURIComponent(token)}`;

/** Gera o link de convite DA CONVERSA. Só o dono — convidar nunca foi de editor. */
export async function linkDaConversa(
  scopeId: string, userId: string, papel: PapelConvidavel,
): Promise<ConviteConversa | FalhaConvite> {
  if (!scopeId || !userId) return { ok: false, reason: "sem_conversa" };
  const achado = await acharBoardDaConversa(scopeId);
  // conversa de outra pessoa: não é "crie o seu board", é não.
  if (achado && achado.ownerId !== userId) return { ok: false, reason: "forbidden" };
  const boardId = achado?.id ?? (await boardDaConversa(userId, scopeId));
  const r = await gerarLink(boardId, userId, papel);
  if (!r.ok) return { ok: false, reason: r.reason === "forbidden" ? "forbidden" : "not_found" };
  return { ok: true, url: url(boardId, r.token), token: r.token, papel, boardId, escopo: "conversa" };
}

/**
 * Revoga TODOS os links daquela conversa. Quem já entrou CONTINUA membro — tirar alguém é
 * `DELETE /api/cartolina/:id/membros`, e são coisas diferentes: uma fecha a porta, a outra tira
 * quem está dentro.
 */
export async function revogarDaConversa(scopeId: string, userId: string): Promise<{ ok: true } | FalhaConvite> {
  if (!scopeId || !userId) return { ok: false, reason: "sem_conversa" };
  const achado = await acharBoardDaConversa(scopeId);
  if (!achado) return { ok: true };                                   // sem board não há link emitido
  if (achado.ownerId !== userId) return { ok: false, reason: "forbidden" };
  const r = await revogarLinks(achado.id, userId);
  return r.ok ? { ok: true } : { ok: false, reason: r.reason === "forbidden" ? "forbidden" : "not_found" };
}
