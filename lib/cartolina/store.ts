/**
 * Acesso ao banco da cartolina. Toda leitura/escrita POR ID exige o `userId` e passa por
 * `papelDe` — não há função aqui que devolva um board só pelo id (mesma regra do
 * chat-turn-store: um endpoint novo não consegue esquecer o filtro e abrir um IDOR).
 * "Sem acesso" e "não existe" são indistinguíveis de fora (null → 404), pra não deixar
 * ninguém sondar quais ids existem.
 */
import { prisma } from "@/src/lib/prisma";
import { applyOps, readCards, sanitizeCard, MAX_CARDS, type CartolinaOps } from "@/lib/cartolina/cards";
import { papelDe, podeEscrever, type Papel } from "@/lib/cartolina/access";
import type { CartolinaCard } from "@/lib/caderno/cartolina-tipos";

export const CARTOLINA_SURFACES = ["estudos", "lounge"] as const;
export type CartolinaSurface = (typeof CARTOLINA_SURFACES)[number];
export const isCartolinaSurface = (v: unknown): v is CartolinaSurface =>
  typeof v === "string" && (CARTOLINA_SURFACES as readonly string[]).includes(v);

export const cartolinaMemoriaOn = () => process.env.CARTOLINA_MEMORIA === "1";

export type BoardView = {
  id: string; surface: string; scopeId: string | null; titulo: string;
  cards: CartolinaCard[]; rev: number; papel: Papel; updatedAt: Date;
};

const isObjectId = (v: string) => /^[a-f0-9]{24}$/i.test(v); // id inválido faria o Prisma lançar

function view(row: any, papel: Papel): BoardView {
  return {
    id: row.id, surface: row.surface, scopeId: row.scopeId ?? null, titulo: row.titulo,
    cards: readCards(row.cards), rev: row.rev, papel, updatedAt: row.updatedAt,
  };
}

/** O board SÓ se o usuário tem algum papel nele. */
export async function getBoardForUser(id: string, userId: string): Promise<BoardView | null> {
  if (!isObjectId(id)) return null;
  const row = await prisma.cartolina.findUnique({ where: { id } });
  // o BLUEPRINT PRÁTICO (lib/blueprint) também mora em Cartolina, mas o `cards` dele é um documento, não cards: as rotas
  // genéricas da cartolina (e o coworking por cima delas) não podem lê-lo nem gravá-lo — gravariam `cards: []` por cima
  // #681: nem o blueprint excluído (a marca sem conteúdo): convite, comentário ou gravação nele não voltam
  if (!row || row.surface === "blueprint" || row.surface === "blueprint-excluido") return null;
  let papelMembro: string | null = null;
  if (row.ownerId !== userId) {
    const m = await prisma.cartolinaMembro.findUnique({
      where: { cartolinaId_userId: { cartolinaId: id, userId } },
      select: { papel: true },
    });
    papelMembro = m?.papel ?? null;
  }
  const papel = papelDe(row.ownerId, userId, papelMembro);
  return papel ? view(row, papel) : null;
}

/** O board do DONO para a conversa (surface+scopeId). Boards compartilhados chegam pelo id/convite. */
export async function findOwnBoard(ownerId: string, surface: CartolinaSurface, scopeId: string | null): Promise<BoardView | null> {
  const row = await prisma.cartolina.findFirst({
    where: { ownerId, surface, scopeId },
    orderBy: { updatedAt: "desc" },
  });
  return row ? view(row, "dono") : null;
}

export async function createBoard(input: {
  ownerId: string; surface: CartolinaSurface; scopeId: string | null; titulo: string; cards: CartolinaCard[];
}): Promise<BoardView> {
  const cards = input.cards.map(sanitizeCard).filter((c): c is CartolinaCard => c !== null).slice(0, MAX_CARDS);
  const row = await prisma.cartolina.create({
    data: {
      ownerId: input.ownerId, surface: input.surface, scopeId: input.scopeId,
      titulo: input.titulo.slice(0, 200) || "Estudo", cards: cards as any,
    },
  });
  return view(row, "dono");
}

export type PatchResult =
  | { ok: true; board: BoardView }
  | { ok: false; reason: "not_found" | "forbidden" | "conflict" };

const MAX_TENTATIVAS = 5;

/**
 * Aplica operações com controle otimista: relê, aplica, grava SÓ se `rev` ainda é o que lemos.
 * Perdeu a corrida (outro colaborador gravou no meio) → relê e reaplica a MESMA operação sobre
 * o estado novo. As operações são por-card, então reaplicar é seguro e ninguém perde edição.
 */
export async function patchBoard(id: string, userId: string, ops: CartolinaOps & { titulo?: unknown }): Promise<PatchResult> {
  for (let i = 0; i < MAX_TENTATIVAS; i++) {
    const atual = await getBoardForUser(id, userId);
    if (!atual) return { ok: false, reason: "not_found" };
    if (!podeEscrever(atual.papel)) return { ok: false, reason: "forbidden" };

    const cards = applyOps(atual.cards, ops);
    const titulo = typeof ops.titulo === "string" && ops.titulo.trim() ? ops.titulo.trim().slice(0, 200) : atual.titulo;
    const r = await prisma.cartolina.updateMany({
      where: { id, rev: atual.rev },
      data: { cards: cards as any, titulo, rev: atual.rev + 1 },
    });
    if (r.count === 1) return { ok: true, board: { ...atual, cards, titulo, rev: atual.rev + 1 } };
  }
  return { ok: false, reason: "conflict" };
}
