/**
 * BLUEPRINT PRÁTICO — o servidor: a LOJA (um `Cartolina` por estudo, surface `blueprint`, scopeId = thread id da
 * conversa, `cards` = o DocBlueprint) e o TURNO (lib/agent/runChatTurn chama depois do gatekeeper, fire-and-forget).
 *
 * O ciclo (spec §3): a conversa vira estudo VÁLIDO (o gatekeeper do Cérebro — lib/map/gatekeeper) → nasce UM blueprint
 * ligado a ela (idempotente) → a cada turno seguinte a Zaeon RECOMPÕE o mesmo blueprint (no máximo 1× a cada 2 min),
 * preservando a entrega provada (lib/blueprint/compor). Escrita com o `rev` otimista, como o board de Meus Estudos.
 */
import { papelDe, podeEscrever, type Papel } from "@/lib/cartolina/access";
import { fasesAprovadas } from "./fases";
import { COMPOR_SYSTEM, PECAS_SYSTEM, lerPecas, lerPlano, mesclarComposicao, promptComposicao, promptPecas } from "./compor";
import { buscarRepos } from "./github";
import { documentosDaResposta, juntarDocumentos } from "@/lib/videodoc/documentos";
import { MAX_BASE, SURFACE_BLUEPRINT, blueprintOn, docVazio, sanitizarDoc, type Area, type DocBlueprint, type Documento, type Fase } from "./tipos";

export const INTERVALO_RECOMPOR_MS = 120_000;
const SURFACE_CONVERSA = "estudos";
const OID = /^[a-f0-9]{24}$/i;

type Linha = { id: string; ownerId: string; surface: string; scopeId: string | null; titulo: string; cards: unknown; rev: number; createdAt: Date; updatedAt: Date };
type Onde = { id?: string; ownerId?: string; surface?: string; scopeId?: string };
type Ordem = { createdAt?: "asc" | "desc"; updatedAt?: "asc" | "desc"; id?: "asc" | "desc" };
/** o mais ANTIGO primeiro, com o id desempatando o mesmo milissegundo (todo mundo concorda sobre quem vence) */
const MAIS_ANTIGO: Ordem[] = [{ createdAt: "asc" }, { id: "asc" }];
/** o pedaço do Prisma que a loja usa (injetável nos testes) */
export type BlueprintDb = {
  cartolina: {
    findFirst(a: { where: Onde; orderBy?: Ordem | Ordem[] }): Promise<Linha | null>;
    findUnique(a: { where: { id: string } }): Promise<Linha | null>;
    findMany(a: { where: Onde; orderBy?: Ordem | Ordem[]; take?: number }): Promise<Linha[]>;
    create(a: { data: { ownerId: string; surface: string; scopeId: string; titulo: string; cards: never } }): Promise<Linha>;
    updateMany(a: { where: { id: string; rev: number }; data: { cards: never; titulo: string; rev: number; surface?: string; conviteSalt?: null } }): Promise<{ count: number }>;
    deleteMany(a: { where: { id: string } }): Promise<{ count: number }>;
  };
  cartolinaMembro: {
    findUnique(a: { where: { cartolinaId_userId: { cartolinaId: string; userId: string } }; select: { papel: true } }): Promise<{ papel: string } | null>;
    count(a: { where: { cartolinaId: string } }): Promise<number>;
    deleteMany(a: { where: { cartolinaId: string } }): Promise<{ count: number }>;
  };
  cartolinaComentario: { deleteMany(a: { where: { cartolinaId: string } }): Promise<{ count: number }> };
  conversation: { findFirst(a: { where: { userId: string; surface: string; scopeId: string }; select: { estudavel: true } }): Promise<{ estudavel: boolean } | null> };
};
const prismaDb = async (): Promise<BlueprintDb> => (await import("@/src/lib/prisma")).prisma as unknown as BlueprintDb;

/** `compartilhado`: quantas pessoas além do dono têm acesso (só o dono recebe; os outros veem 0) */
export type BlueprintView = { id: string; scopeId: string | null; doc: DocBlueprint; rev: number; papel: Papel; updatedAt: Date; compartilhado: number };

/**
 * #681: o blueprint excluído vira só uma marca: sem conteúdo, fora da lista e sem ninguém com acesso. Ela existe para a
 * conversa de onde ele nasceu não criar outro no turno seguinte (a conversa continua).
 */
export const SURFACE_EXCLUIDO = "blueprint-excluido";
export type ResumoBlueprint = { id: string; titulo: string; area: Area; fase: Fase; aguardandoMentor: boolean; criticosAbertos: number; fasesAprovadas: number; updatedAt: string };

/** o documento de uma linha (o corrompido volta como um blueprint vazio com o título da linha — nunca lança) */
export const docDaLinha = (l: Pick<Linha, "cards" | "titulo" | "createdAt">): DocBlueprint => sanitizarDoc(l.cards) ?? docVazio(l.titulo, l.createdAt.getTime());

export function resumoDe(l: Linha): ResumoBlueprint {
  const d = docDaLinha(l);
  return { id: l.id, titulo: d.titulo, area: d.area, fase: d.fase, aguardandoMentor: d.aguardandoMentor, criticosAbertos: d.criticos.filter((c) => c.status === "aberto" && c.fase === d.fase).length, fasesAprovadas: fasesAprovadas(d), updatedAt: l.updatedAt.toISOString() };
}

export async function listarBlueprints(userId: string, db?: BlueprintDb): Promise<ResumoBlueprint[]> {
  const d = db ?? (await prismaDb());
  const rows = await d.cartolina.findMany({ where: { ownerId: userId, surface: SURFACE_BLUEPRINT }, orderBy: { updatedAt: "desc" }, take: 40 });
  return rows.map(resumoDe);
}

/** o blueprint SÓ se o usuário tem papel nele */
export async function blueprintDoUsuario(id: string, userId: string, db?: BlueprintDb): Promise<BlueprintView | null> {
  if (!OID.test(id)) return null;
  const d = db ?? (await prismaDb());
  const row = await d.cartolina.findUnique({ where: { id } });
  if (!row || row.surface !== SURFACE_BLUEPRINT) return null;
  const membro = row.ownerId === userId ? null : await d.cartolinaMembro.findUnique({ where: { cartolinaId_userId: { cartolinaId: id, userId } }, select: { papel: true } });
  const papel = papelDe(row.ownerId, userId, membro?.papel ?? null);
  if (!papel) return null;
  const compartilhado = papel === "dono" ? await d.cartolinaMembro.count({ where: { cartolinaId: id } }) : 0;
  return { id: row.id, scopeId: row.scopeId, doc: docDaLinha(row), rev: row.rev, papel, updatedAt: row.updatedAt, compartilhado };
}

/**
 * #681: exclui o blueprint, só o dono. O conteúdo, os comentários e o acesso de quem foi convidado saem; fica a marca
 * (sem conteúdo) que impede a conversa de recriá-lo. Escrita com o `rev`, como as outras: se alguém gravou no meio, tenta de novo.
 */
export async function excluirBlueprint(id: string, userId: string, db?: BlueprintDb): Promise<{ ok: true } | { ok: false; motivo: "not_found" | "forbidden" | "conflict" }> {
  const d = db ?? (await prismaDb());
  for (let i = 0; i < 5; i++) {
    const atual = await blueprintDoUsuario(id, userId, d);
    if (!atual) return { ok: false, motivo: "not_found" };
    if (atual.papel !== "dono") return { ok: false, motivo: "forbidden" };
    const r = await d.cartolina.updateMany({ where: { id, rev: atual.rev }, data: { surface: SURFACE_EXCLUIDO, cards: {} as never, titulo: "", conviteSalt: null, rev: atual.rev + 1 } });
    if (r.count !== 1) continue;
    await d.cartolinaMembro.deleteMany({ where: { cartolinaId: id } });
    await d.cartolinaComentario.deleteMany({ where: { cartolinaId: id } });
    return { ok: true };
  }
  return { ok: false, motivo: "conflict" };
}

export type ResultadoGravar = { ok: true; view: BlueprintView } | { ok: false; motivo: "not_found" | "forbidden" | "conflict" };
/** muda o documento com controle otimista (relê e reaplica se alguém gravou no meio); o resultado passa pelo saneamento */
export async function gravarDoc(id: string, userId: string, mudar: (d: DocBlueprint) => DocBlueprint, db?: BlueprintDb): Promise<ResultadoGravar> {
  const d = db ?? (await prismaDb());
  for (let i = 0; i < 5; i++) {
    const atual = await blueprintDoUsuario(id, userId, d);
    if (!atual) return { ok: false, motivo: "not_found" };
    if (!podeEscrever(atual.papel)) return { ok: false, motivo: "forbidden" };
    const doc = sanitizarDoc(mudar(atual.doc)) ?? atual.doc;
    const r = await d.cartolina.updateMany({ where: { id, rev: atual.rev }, data: { cards: doc as never, titulo: doc.titulo, rev: atual.rev + 1 } });
    if (r.count === 1) return { ok: true, view: { ...atual, doc, rev: atual.rev + 1, updatedAt: new Date() } };
  }
  return { ok: false, motivo: "conflict" };
}

/** o blueprint da conversa — cria na 1ª vez. Dois turnos ao mesmo tempo: o mais ANTIGO vence e o outro se apaga (e o
 *  que escapar de uma corrida apertada é limpo no turno seguinte por `limparDuplicatas`) */
export async function garantirBlueprint(userId: string, scopeId: string, titulo: string, db?: BlueprintDb): Promise<string> {
  const d = db ?? (await prismaDb());
  const onde = { ownerId: userId, surface: SURFACE_BLUEPRINT, scopeId };
  const ja = await d.cartolina.findFirst({ where: onde, orderBy: MAIS_ANTIGO });
  if (ja) return ja.id;
  const novo = await d.cartolina.create({ data: { ...onde, titulo: titulo.slice(0, 200) || "Estudo", cards: docVazio(titulo, Date.now()) as never } });
  const primeiro = await d.cartolina.findFirst({ where: onde, orderBy: MAIS_ANTIGO });
  if (primeiro && primeiro.id !== novo.id) { await d.cartolina.deleteMany({ where: { id: novo.id } }); return primeiro.id; }
  return novo.id;
}

/** duplicatas da mesma conversa (corrida rara na criação): fica o mais antigo, os outros saem. Devolve o que ficou */
export async function limparDuplicatas(userId: string, scopeId: string, db: BlueprintDb): Promise<Linha | null> {
  const todas = await db.cartolina.findMany({ where: { ownerId: userId, surface: SURFACE_BLUEPRINT, scopeId }, orderBy: MAIS_ANTIGO, take: 10 });
  for (const extra of todas.slice(1)) await db.cartolina.deleteMany({ where: { id: extra.id } });
  return todas[0] ?? null;
}

export type GenJson = <T>(system: string, user: string) => Promise<T>;
export type EntradaTurno = {
  userId: string | null; scopeId: string | null;
  sinal: { estudavel: boolean; tituloSugerido: string } | null;
  prompt: string; answerTexto: string; history: { role: string; text: string }[];
  /** a resposta estruturada do turno (as fontes, a base, os livros, o trabalho → os DOCUMENTOS do estudo) */
  answer?: Parameters<typeof documentosDaResposta>[0];
  agora?: number; forcar?: boolean;
  db?: BlueprintDb; gen?: GenJson; repos?: typeof buscarRepos; passosBase?: (tema: string) => Promise<string[]>;
  /** o vídeo de um documento-base (lib/videodoc/server.garantirVideo) — injetável nos testes */
  videos?: GarantirVideo;
  estadosVideos?: (ids: string[]) => Promise<Record<string, string>>;
};
type GarantirVideo = (i: { userId: string; documento: Documento; blueprintId: string }) => Promise<{ videoId: string } | { motivo: string }>;
/** o estado de cada vídeo (pra soltar o lugar dos que falharam) — injetável nos testes */
type EstadosVideos = (ids: string[]) => Promise<Record<string, string>>;
const estadosReais: EstadosVideos = async (ids) => {
  if (!ids.length) return {};
  const [{ prisma }, { estadoVisivel }] = await Promise.all([import("@/src/lib/prisma"), import("@/lib/videodoc/server")]);
  const arts = await prisma.studioArtifact.findMany({ where: { id: { in: ids } }, select: { id: true, status: true, createdAt: true, updatedAt: true } });
  return Object.fromEntries(ids.map((id) => { const a = arts.find((x) => x.id === id); return [id, a ? estadoVisivel(a) : "error"]; }));
};

/** cada documento-BASE ganha o seu vídeo com a Zaeon holograma (flag VIDEO_DOC), no máximo MAX_BASE com vídeo por estudo */
export async function videosDosDocumentosBase(id: string, userId: string, doc: DocBlueprint, db: BlueprintDb, garantir?: GarantirVideo, estados?: EstadosVideos): Promise<number> {
  const vs = await import("@/lib/videodoc/server");
  if (!garantir && !vs.videoDocOn()) return 0;
  const g = garantir ?? vs.garantirVideo;
  // vídeo que FALHOU (sem texto, erro, interrompido) não segura um dos 3 lugares do estudo: o documento solta o vídeo
  // (e só continua base se a Zaeon o escolher de novo)
  const st = await (estados ?? estadosReais)(doc.documentos.filter((d) => d.videoId).map((d) => d.videoId!)).catch(() => ({} as Record<string, string>));
  const falhos = new Set(doc.documentos.filter((d) => d.videoId && st[d.videoId] === "error").map((d) => d.id));
  const comVideo = doc.documentos.filter((d) => d.videoId && !falhos.has(d.id)).length;
  const faltam = doc.documentos.filter((d) => d.base && !falhos.has(d.id) && !d.videoId).slice(0, Math.max(0, MAX_BASE - comVideo));
  const ids: Record<string, string> = {};
  for (const d of faltam) { const r = await g({ userId, documento: d, blueprintId: id }); if ("videoId" in r) ids[d.id] = r.videoId; }
  if (!Object.keys(ids).length && !falhos.size) return 0;
  await gravarDoc(id, userId, (atual) => ({ ...atual, documentos: atual.documentos.map((d) => {
    if (falhos.has(d.id)) { const { videoId: _v, ...sem } = d; void _v; return { ...sem, base: false }; }
    return ids[d.id] && !d.videoId ? { ...d, videoId: ids[d.id] } : d;
  }) }), db);
  return Object.keys(ids).length;
}

const genPadrao = (userId: string, scopeId: string): GenJson => async <T,>(system: string, user: string) => {
  const [{ geminiJson }, { GEMINI_MODEL_FLASH }] = await Promise.all([import("@/lib/scholar/gemini"), import("@/lib/ai/model")]);
  return geminiJson<T>(system, user, { temperature: 0.3, model: GEMINI_MODEL_FLASH, timeoutMs: 60_000, ctx: { agentKey: "zaeon", surface: "estudos", userId, scopeId, phase: "blueprint" } });
};
const passosPadrao = async (tema: string): Promise<string[]> => (await (await import("@/lib/estudos/harness-server")).gerarPassos(tema)).map((p) => p.label);

/** o turno do blueprint: cria (se a conversa é estudo) e recompõe (se passou o intervalo). Nunca lança. */
export async function blueprintDoTurno(i: EntradaTurno): Promise<"off" | "nao-estudo" | "aguardando" | "composto" | "falhou"> {
  if (!blueprintOn()) return "off";
  if (!i.userId || !i.scopeId) return "nao-estudo";
  const { userId, scopeId } = i, agora = i.agora ?? Date.now();
  try {
    const db = i.db ?? (await prismaDb());
    let linha = await limparDuplicatas(userId, scopeId, db);
    if (!linha) {
      // #681: a pessoa excluiu o blueprint desta conversa: não nasce outro
      if (await db.cartolina.findFirst({ where: { ownerId: userId, surface: SURFACE_EXCLUIDO, scopeId } })) return "nao-estudo";
      const conv = i.sinal?.estudavel ? null : await db.conversation.findFirst({ where: { userId, surface: SURFACE_CONVERSA, scopeId }, select: { estudavel: true } });
      if (!i.sinal?.estudavel && !conv?.estudavel) return "nao-estudo";
      const id = await garantirBlueprint(userId, scopeId, i.sinal?.tituloSugerido || "Estudo", db);
      linha = await db.cartolina.findUnique({ where: { id } });
      if (!linha) return "falhou";
    }
    const novosDocs = documentosDaResposta(i.answer);
    const doc0 = docDaLinha(linha), doc = { ...doc0, documentos: juntarDocumentos(doc0.documentos, novosDocs) };
    if (!i.forcar && agora - doc.compostoEm < INTERVALO_RECOMPOR_MS) {
      // sem recompor agora, mas os documentos do turno não se perdem
      if (doc.documentos.length !== doc0.documentos.length) await gravarDoc(linha.id, userId, (atual) => ({ ...atual, documentos: juntarDocumentos(atual.documentos, novosDocs) }), db);
      return "aguardando";
    }
    const conversa = [...i.history.slice(-10), { role: "user", text: i.prompt }, { role: "assistant", text: i.answerTexto }].filter((m) => m.text?.trim());
    const passosBase = doc.turnos === 0 ? await (i.passosBase ?? passosPadrao)(doc.titulo).catch(() => []) : undefined;
    const gen = i.gen ?? genPadrao(userId, scopeId);
    const plano = lerPlano(await gen<unknown>(COMPOR_SYSTEM, promptComposicao({ doc, conversa, passosBase })));
    if (!plano) return "falhou";
    const achados = await (i.repos ?? buscarRepos)(plano.termosRepo).catch(() => []);
    const r = await gravarDoc(linha.id, userId, (atual) => {
      const novo = mesclarComposicao({ ...atual, documentos: juntarDocumentos(atual.documentos, novosDocs) }, plano, agora);
      if (achados.length) { const meus = atual.repos.filter((x) => x.meu); novo.repos = [...meus, ...achados.filter((x) => !meus.some((m) => m.nome === x.nome))]; }
      return novo;
    }, db);
    // a FIGURA é a protagonista do estudo: composição que veio sem máquina pede só as peças (uma chamada curta)
    if (r.ok && r.view.doc.pecas.length < 3) {
      const pecas = lerPecas(await gen<unknown>(PECAS_SYSTEM, promptPecas(r.view.doc)).catch(() => null));
      if (pecas) await gravarDoc(linha.id, userId, (atual) => (atual.pecas.length < 3 ? { ...atual, ...pecas } : atual), db);
    }
    // (o vídeo automático dos documentos-base saiu da Sala — pedido do dono, 22/10: no lugar, o card "estude no YouTube".
    //  `videosDosDocumentosBase` continua aqui pro dia em que voltar; o vídeo pedido no chat segue funcionando)
    return r.ok ? "composto" : "falhou";
  } catch (e: unknown) {
    console.warn("[blueprint] turno falhou:", e instanceof Error ? e.message : e);
    return "falhou";
  }
}
