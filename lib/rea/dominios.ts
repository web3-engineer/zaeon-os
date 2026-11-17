/**
 * lib/rea/dominios.ts — os domínios que a pessoa declarou sob o Termo de Uso do REA (lib/rea/termo.ts).
 *
 * Declarar = gravar a PROVA (conta, domínio, finalidade, versão + hash do termo exibido, data, IP, navegador). Só vale
 * se o hash enviado pelo navegador for o do termo VIGENTE (a pessoa aceitou exatamente este texto). Revogar marca
 * `revogadoEm` — o registro nunca é apagado (a prova fica). `dominiosLiberados` é o que o Octa manda pro motor ao abrir
 * uma sessão do REA: com eles, as ferramentas web ficam liberadas naqueles domínios (e subdomínios).
 */
import { ehFinalidade, normalizarDominio, TERMO_HASH, TERMO_VERSAO, type Finalidade } from "./termo";

export type ReaDominioView = { id: string; dominio: string; finalidade: string; termoVersao: string; aceitoEm: string; vigente: boolean };

type Linha = { id: string; userId: string; email: string | null; dominio: string; finalidade: string; titular: boolean; termoVersao: string; termoHash: string; ip: string | null; userAgent: string | null; aceitoEm: Date; revogadoEm: Date | null };
export type DominiosDb = {
  reaDominio: {
    findMany(a: { where: Record<string, unknown>; orderBy?: Record<string, "asc" | "desc">; take?: number }): Promise<Linha[]>;
    create(a: { data: Omit<Linha, "id" | "aceitoEm" | "revogadoEm"> }): Promise<Linha>;
    updateMany(a: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
  };
};
const prismaDb = async (): Promise<DominiosDb> => (await import("@/src/lib/prisma")).prisma as unknown as DominiosDb;

const MAX_ATIVOS = 20;   // o motor também corta em 20
const vigente = (l: Pick<Linha, "termoHash" | "revogadoEm">) => !l.revogadoEm && l.termoHash === TERMO_HASH;
const view = (l: Linha): ReaDominioView => ({ id: l.id, dominio: l.dominio, finalidade: l.finalidade, termoVersao: l.termoVersao, aceitoEm: l.aceitoEm.toISOString(), vigente: vigente(l) });

export type PedidoDeclaracao = { dominio: unknown; finalidade: unknown; titular: unknown; aceite: { versao: unknown; hash: unknown } | undefined };
export type ResultadoDeclaracao = { ok: true; dominio: ReaDominioView } | { ok: false; erro: string };

/** a pessoa aceita o termo e declara o domínio. userId/email/ip/userAgent vêm SEMPRE do servidor (sessão, cabeçalhos). */
export async function declararDominio(
  quem: { userId: string; email?: string | null; ip?: string | null; userAgent?: string | null },
  p: PedidoDeclaracao,
  db?: DominiosDb,
): Promise<ResultadoDeclaracao> {
  if (p.titular !== true) return { ok: false, erro: "titular_obrigatorio" };
  if (!ehFinalidade(p.finalidade)) return { ok: false, erro: "finalidade_invalida" };
  // o navegador manda a versão e o hash do texto que MOSTROU: tem que ser o vigente (senão o aceite não prova nada)
  if (p.aceite?.versao !== TERMO_VERSAO || p.aceite?.hash !== TERMO_HASH) return { ok: false, erro: "termo_desatualizado" };
  let dominio: string;
  try { dominio = normalizarDominio(String(p.dominio ?? "")); } catch (e) { return { ok: false, erro: (e as Error).message }; }
  const d = db ?? (await prismaDb());
  const meus = await d.reaDominio.findMany({ where: { userId: quem.userId, revogadoEm: null } });
  const ja = meus.find((l) => l.dominio === dominio && vigente(l));
  if (ja) return { ok: true, dominio: view(ja) };
  if (meus.filter(vigente).length >= MAX_ATIVOS) return { ok: false, erro: "limite_de_dominios" };
  const l = await d.reaDominio.create({
    data: {
      userId: quem.userId, email: quem.email ?? null, dominio, finalidade: p.finalidade as Finalidade, titular: true,
      termoVersao: TERMO_VERSAO, termoHash: TERMO_HASH,
      ip: (quem.ip ?? "").slice(0, 80) || null, userAgent: (quem.userAgent ?? "").slice(0, 400) || null,
    },
  });
  return { ok: true, dominio: view(l) };
}

export async function listarDominios(userId: string, db?: DominiosDb): Promise<ReaDominioView[]> {
  const d = db ?? (await prismaDb());
  const ls = await d.reaDominio.findMany({ where: { userId, revogadoEm: null }, orderBy: { aceitoEm: "desc" }, take: 100 });
  // um por domínio: o aceite mais recente
  const vistos = new Set<string>();
  return ls.filter((l) => (vistos.has(l.dominio) ? false : (vistos.add(l.dominio), true))).map(view);
}

/** revoga TODOS os aceites ativos daquele domínio da pessoa (a prova fica, com revogadoEm) */
export async function revogarDominio(userId: string, dominio: string, db?: DominiosDb): Promise<boolean> {
  let dom: string; try { dom = normalizarDominio(dominio); } catch { return false; }
  const d = db ?? (await prismaDb());
  const r = await d.reaDominio.updateMany({ where: { userId, dominio: dom, revogadoEm: null }, data: { revogadoEm: new Date() } });
  return r.count > 0;
}

/** os domínios que liberam as ferramentas web numa sessão do REA (aceite vigente, não revogado) */
export async function dominiosLiberados(userId: string, db?: DominiosDb): Promise<string[]> {
  return (await listarDominios(userId, db)).filter((v) => v.vigente).map((v) => v.dominio).slice(0, MAX_ATIVOS);
}

/** IP do cliente atrás do Caddy (o mesmo critério do rate limit) */
export const ipDoPedido = (req: Request): string | null =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
