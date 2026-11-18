/**
 * lib/estudos/pesquisasDb.ts — o lado SERVIDOR das pesquisas da vitrine (lib/estudos/pesquisas é o puro). As rotas
 * (admin/console, usuário e pública) dividem daqui: ler as pesquisas já com a CONTA de quem publicou e criar um slug
 * que não colide.
 */
import { prisma } from "@/src/lib/prisma";
import { slugify } from "./vitrineAdmin";
import type { PesquisaRow } from "./pesquisas";

type Linha = Awaited<ReturnType<typeof prisma.pesquisaVitrine.findMany>>[number];

/** junta a conta (nome e foto — nunca o e-mail) a cada pesquisa que tem contaId */
export async function comContas<T extends Pick<Linha, "contaId">>(linhas: T[]): Promise<(T & { conta: PesquisaRow["conta"] })[]> {
  const ids = [...new Set(linhas.map((l) => l.contaId).filter((x): x is string => !!x))];
  const contas = ids.length
    ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, image: true } })
    : [];
  const porId = new Map(contas.map((c) => [c.id, c]));
  return linhas.map((l) => ({ ...l, conta: (l.contaId && porId.get(l.contaId)) || null }));
}

/** slug a partir do título; se já existir, ganha um sufixo curto */
export async function slugLivre(titulo: string): Promise<string> {
  const base = slugify(titulo);
  if (!(await prisma.pesquisaVitrine.findUnique({ where: { slug: base }, select: { id: true } }))) return base;
  return `${base}-${Date.now().toString(36).slice(-5)}`;
}

/** a conta pelo id ou pelo e-mail (o console publica em nome de alguém); null se não existir */
export async function contaPor(ref: { contaId?: unknown; contaEmail?: unknown }): Promise<{ id: string; name: string | null } | null> {
  const id = String(ref.contaId ?? "").trim();
  if (/^[a-f0-9]{24}$/i.test(id)) return prisma.user.findUnique({ where: { id }, select: { id: true, name: true } });
  const email = String(ref.contaEmail ?? "").trim().toLowerCase();
  if (email.includes("@")) return prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
  return null;
}
