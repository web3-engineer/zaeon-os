/**
 * BLUEPRINT REA — o servidor: a LOJA (um `Cartolina` por conversa, surface `rea`, scopeId = thread id, `cards` = o
 * DocReaBlueprint) e o TURNO (lib/agent/runChatTurn chama no turno de engenharia reversa, fire-and-forget). Espelha
 * lib/blueprint/server, mas enxuto: sem fases/críticos/figura — é um documento de reconstrução.
 */
import { papelDe, podeEscrever, type Papel } from "@/lib/cartolina/access";
import { COMPOR_SYSTEM, lerPlano, mesclarComposicao, promptComposicao, type Conversa } from "./compor";
import { SURFACE_REA, docVazio, reaBlueprintOn, sanitizarDoc, type DocReaBlueprint, type ResumoRea } from "./tipos";

export const INTERVALO_RECOMPOR_MS = 120_000;
const OID = /^[a-f0-9]{24}$/i;

type Linha = { id: string; ownerId: string; surface: string; scopeId: string | null; titulo: string; cards: unknown; rev: number; createdAt: Date; updatedAt: Date };
type Onde = { id?: string; ownerId?: string; surface?: string; scopeId?: string };
type Ordem = { createdAt?: "asc" | "desc"; updatedAt?: "asc" | "desc"; id?: "asc" | "desc" };
const MAIS_ANTIGO: Ordem[] = [{ createdAt: "asc" }, { id: "asc" }];

export type ReaDb = {
  cartolina: {
    findFirst(a: { where: Onde; orderBy?: Ordem | Ordem[] }): Promise<Linha | null>;
    findUnique(a: { where: { id: string } }): Promise<Linha | null>;
    findMany(a: { where: Onde; orderBy?: Ordem | Ordem[]; take?: number }): Promise<Linha[]>;
    create(a: { data: { ownerId: string; surface: string; scopeId: string; titulo: string; cards: never } }): Promise<Linha>;
    updateMany(a: { where: { id: string; rev: number }; data: { cards: never; titulo: string; rev: number } }): Promise<{ count: number }>;
    deleteMany(a: { where: { id: string } }): Promise<{ count: number }>;
  };
  cartolinaMembro: { findUnique(a: { where: { cartolinaId_userId: { cartolinaId: string; userId: string } }; select: { papel: true } }): Promise<{ papel: string } | null> };
};
const prismaDb = async (): Promise<ReaDb> => (await import("@/src/lib/prisma")).prisma as unknown as ReaDb;

export type ReaView = { id: string; scopeId: string | null; doc: DocReaBlueprint; rev: number; papel: Papel; updatedAt: Date };

export const docDaLinha = (l: Pick<Linha, "cards" | "titulo" | "createdAt">): DocReaBlueprint => sanitizarDoc(l.cards) ?? docVazio(l.titulo, l.createdAt.getTime());
export const resumoDe = (l: Linha): ResumoRea => { const d = docDaLinha(l); return { id: l.id, titulo: d.titulo, alvo: d.alvo, achados: d.achados.length, incertezas: d.incertezas.length, updatedAt: l.updatedAt.toISOString() }; };

export async function listarRea(userId: string, db?: ReaDb): Promise<ResumoRea[]> {
  const d = db ?? (await prismaDb());
  return (await d.cartolina.findMany({ where: { ownerId: userId, surface: SURFACE_REA }, orderBy: { updatedAt: "desc" }, take: 40 })).map(resumoDe);
}

export async function reaDoUsuario(id: string, userId: string, db?: ReaDb): Promise<ReaView | null> {
  if (!OID.test(id)) return null;
  const d = db ?? (await prismaDb());
  const row = await d.cartolina.findUnique({ where: { id } });
  if (!row || row.surface !== SURFACE_REA) return null;
  const membro = row.ownerId === userId ? null : await d.cartolinaMembro.findUnique({ where: { cartolinaId_userId: { cartolinaId: id, userId } }, select: { papel: true } });
  const papel = papelDe(row.ownerId, userId, membro?.papel ?? null);
  return papel ? { id: row.id, scopeId: row.scopeId, doc: docDaLinha(row), rev: row.rev, papel, updatedAt: row.updatedAt } : null;
}

export type ResultadoGravar = { ok: true; view: ReaView } | { ok: false; motivo: "not_found" | "forbidden" | "conflict" };
export async function gravarDoc(id: string, userId: string, mudar: (d: DocReaBlueprint) => DocReaBlueprint, db?: ReaDb): Promise<ResultadoGravar> {
  const d = db ?? (await prismaDb());
  for (let i = 0; i < 5; i++) {
    const atual = await reaDoUsuario(id, userId, d);
    if (!atual) return { ok: false, motivo: "not_found" };
    if (!podeEscrever(atual.papel)) return { ok: false, motivo: "forbidden" };
    const doc = sanitizarDoc(mudar(atual.doc)) ?? atual.doc;
    const r = await d.cartolina.updateMany({ where: { id, rev: atual.rev }, data: { cards: doc as never, titulo: doc.titulo, rev: atual.rev + 1 } });
    if (r.count === 1) return { ok: true, view: { ...atual, doc, rev: atual.rev + 1, updatedAt: new Date() } };
  }
  return { ok: false, motivo: "conflict" };
}

export async function garantirRea(userId: string, scopeId: string, titulo: string, db?: ReaDb): Promise<string> {
  const d = db ?? (await prismaDb());
  const onde = { ownerId: userId, surface: SURFACE_REA, scopeId };
  const ja = await d.cartolina.findFirst({ where: onde, orderBy: MAIS_ANTIGO });
  if (ja) return ja.id;
  const novo = await d.cartolina.create({ data: { ...onde, titulo: titulo.slice(0, 200) || "Engenharia reversa", cards: docVazio(titulo, Date.now()) as never } });
  const primeiro = await d.cartolina.findFirst({ where: onde, orderBy: MAIS_ANTIGO });
  if (primeiro && primeiro.id !== novo.id) { await d.cartolina.deleteMany({ where: { id: novo.id } }); return primeiro.id; }
  return novo.id;
}

type GenJson = <T>(system: string, user: string) => Promise<T>;
/**
 * O compositor usa o MODELO DA SUPERFÍCIE (o que o aluno escolheu no chat): se for um modelo de
 * gateway (Claude/Zaeon local — `grupoGateway` setado), redige por ele; senão, o Gemini de sempre.
 * O REA não tem modelo próprio — ele herda octa/aura/zaeon. Melhor-esforço: tropeço cai no Gemini.
 */
const genPadrao = (userId: string, scopeId: string, grupoGateway?: string | null): GenJson => async <T,>(system: string, user: string) => {
  if (grupoGateway) {
    const { gatewayJson, gatewayJsonConfigurado } = await import("@/lib/octa/gatewayJson");
    if (gatewayJsonConfigurado()) {
      try { return await gatewayJson<T>(system, user, { model: grupoGateway, temperature: 0.3, timeoutMs: 60_000 }); }
      catch (e) { console.warn(`[rea-blueprint] ${grupoGateway} na redação falhou, caindo no Gemini:`, (e as Error)?.message?.slice(0, 120)); }
    }
  }
  const [{ geminiJson }, { GEMINI_MODEL_FLASH }] = await Promise.all([import("@/lib/scholar/gemini"), import("@/lib/ai/model")]);
  return geminiJson<T>(system, user, { temperature: 0.3, model: GEMINI_MODEL_FLASH, timeoutMs: 60_000, ctx: { agentKey: "zaeon", surface: "estudos", userId, scopeId, phase: "rea-blueprint" } });
};

export type EntradaTurnoRea = {
  userId: string | null; scopeId: string | null;
  titulo: string; prompt: string; answerTexto: string; history: { role: string; text: string }[];
  /** evidência REAL do motor do REA, se um artefato foi analisado neste estudo (vira OBSERVAÇÃO no blueprint) */
  evidencia?: string; ferramentas?: string[];
  /** o `grupo` do modelo escolhido no chat (Claude/Zaeon via gateway); ausente = Gemini. O REA herda a superfície. */
  grupoGateway?: string | null;
  agora?: number; forcar?: boolean; db?: ReaDb; gen?: GenJson;
};

/** cria (idempotente) o blueprint REA da conversa — chamado na hora, pra o chat já ter o id/título. */
export async function iniciarRea(userId: string, scopeId: string, titulo: string, db?: ReaDb): Promise<string> {
  return garantirRea(userId, scopeId, titulo, db);
}

/** compõe/recompõe o blueprint REA do turno (fire-and-forget; throttle de 2 min como o blueprint prático) */
export async function reaBlueprintDoTurno(i: EntradaTurnoRea): Promise<"off" | "sem-escopo" | "aguardando" | "composto" | "falhou"> {
  if (!reaBlueprintOn()) return "off";
  if (!i.userId || !i.scopeId) return "sem-escopo";
  const { userId, scopeId } = i, agora = i.agora ?? Date.now();
  try {
    const db = i.db ?? (await prismaDb());
    const id = await garantirRea(userId, scopeId, i.titulo || "Engenharia reversa", db);
    const linha = await db.cartolina.findUnique({ where: { id } });
    if (!linha) return "falhou";
    const doc = docDaLinha(linha);
    if (!i.forcar && doc.turnos > 0 && agora - doc.compostoEm < INTERVALO_RECOMPOR_MS) return "aguardando";
    const conversa: Conversa = [...i.history.slice(-10), { role: "user", text: i.prompt }, { role: "assistant", text: i.answerTexto }].filter((m) => m.text?.trim());
    const gen = i.gen ?? genPadrao(userId, scopeId, i.grupoGateway);
    const plano = lerPlano(await gen<unknown>(COMPOR_SYSTEM, promptComposicao({ doc, conversa, evidencia: i.evidencia })));
    if (!plano) return "falhou";
    const r = await gravarDoc(id, userId, (atual) => mesclarComposicao(atual, plano, agora, i.ferramentas), db);
    return r.ok ? "composto" : "falhou";
  } catch (e: unknown) {
    console.warn("[rea-blueprint] turno falhou:", e instanceof Error ? e.message : e);
    return "falhou";
  }
}
