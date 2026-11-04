/**
 * Banco do TCC cross-sala. Mesma regra da cartolina (lib/cartolina/store.ts): toda leitura/
 * escrita POR ID exige o `userId` e passa por `papelDe` — não existe função aqui que devolva um
 * TCC só pelo id, então uma rota nova não consegue esquecer o filtro e abrir um IDOR.
 * "Sem acesso" e "não existe" são indistinguíveis de fora (null → 404).
 *
 * MEMBROS: o TCC nasce de uma conversa da Sala de Estudos (`scopeId`), que tem uma cartolina —
 * e a cartolina já tem papéis (CartolinaMembro). Quem é editor/leitor daquela conversa é
 * editor/leitor do TCC dela. Um modelo de membros só pro TCC divergiria do da cartolina.
 */
import { prisma } from "@/src/lib/prisma";
import { papelDe, podeEscrever, type Papel } from "@/lib/cartolina/access";
import {
  aplicarOps as aplicarNoDoc, novasSecoes, opDeDesfazer, readSecoes, secoesDeMarkdown, diffSecoes,
  secoesParaMarkdown, chaveTitulo, rebasearOps, type Efeito, type OpSecao, type Origem, type Secao,
} from "@/lib/tcc/secoes";

/** Liga as rotas/ponte do TCC. O CHAT ÚNICO (CHAT_UNICO=1) também liga: lá o modo pesquisa escreve os
 *  trabalhos (vários por conversa) no editor ao lado da conversa — é o mesmo motor de seções. */
export const tccCrossOn = () => process.env.TCC_CROSS === "1" || process.env.CHAT_UNICO === "1";

export type TccStatus = "gerando" | "pronto" | "erro";
export type FonteVerificada = { abnt: string; titulo?: string; url?: string; doi?: string };

export type TccView = {
  id: string; titulo: string; workType: string | null; scopeId: string | null;
  secoes: Secao[]; content: string; rev: number; status: TccStatus; papel: Papel; updatedAt: Date;
};

export type RevisaoView = {
  id: string; secaoId: string; titulo: string | null; op: string; origem: string;
  antes: string | null; depois: string; status: string; fontes: FonteVerificada[];
  nota: string | null; autorId: string; createdAt: Date;
};

const isObjectId = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);
const statusDe = (v: unknown): TccStatus => (v === "gerando" || v === "erro" ? v : "pronto");

function view(row: any, papel: Papel): TccView {
  const secoes = readSecoes(row.secoes);
  return {
    id: row.id, titulo: (row.title && String(row.title).trim()) || "TCC", workType: row.workType ?? null,
    scopeId: row.scopeId ?? null, secoes, content: row.content ?? secoesParaMarkdown(secoes),
    rev: row.rev ?? 0, status: statusDe(row.tccStatus), papel, updatedAt: row.updatedAt,
  };
}

function lerFontes(json: unknown): FonteVerificada[] {
  if (!Array.isArray(json)) return [];
  return json
    .filter((f: any) => f && typeof f.abnt === "string" && f.abnt.trim())
    .slice(0, 12)
    .map((f: any) => ({
      abnt: String(f.abnt).slice(0, 600),
      ...(typeof f.titulo === "string" ? { titulo: f.titulo.slice(0, 300) } : {}),
      ...(typeof f.url === "string" ? { url: f.url.slice(0, 500) } : {}),
      ...(typeof f.doi === "string" ? { doi: f.doi.slice(0, 200) } : {}),
    }));
}

export function revisaoView(r: any): RevisaoView {
  return {
    id: r.id, secaoId: r.secaoId, titulo: r.titulo ?? null, op: r.op, origem: r.origem,
    antes: r.antes ?? null, depois: r.depois ?? "", status: r.status, fontes: lerFontes(r.fontes),
    nota: r.nota ?? null, autorId: r.autorId, createdAt: r.createdAt,
  };
}

/** Papel do usuário num work: dono pelo userId; senão o papel dele na cartolina da mesma conversa. */
async function papelNoWork(row: { userId: string; scopeId?: string | null }, userId: string): Promise<Papel | null> {
  if (row.userId === userId) return papelDe(row.userId, userId);
  if (!row.scopeId) return null;
  const board = await prisma.cartolina.findFirst({
    where: { ownerId: row.userId, surface: "estudos", scopeId: row.scopeId },
    select: { id: true },
  });
  if (!board) return null;
  const m = await prisma.cartolinaMembro.findUnique({
    where: { cartolinaId_userId: { cartolinaId: board.id, userId } },
    select: { papel: true },
  });
  return papelDe(row.userId, userId, m?.papel ?? null);
}

/** O TCC SÓ se o usuário tem papel nele — e só se o work é mesmo um TCC cross-sala (tem seções). */
export async function getTccForUser(id: string, userId: string): Promise<TccView | null> {
  if (!isObjectId(id) || !userId) return null;
  const row = await prisma.researchWork.findUnique({ where: { id } });
  if (!row || !Array.isArray(row.secoes)) return null;
  const papel = await papelNoWork(row, userId);
  return papel ? view(row, papel) : null;
}

/** O TCC do DONO para aquela conversa (TCCs compartilhados chegam pelo id). */
export async function findTccDoEscopo(userId: string, scopeId: string): Promise<TccView | null> {
  const row = await prisma.researchWork.findFirst({
    where: { userId, scopeId },
    orderBy: { updatedAt: "desc" },
  });
  return row && Array.isArray(row.secoes) ? view(row, "dono") : null;
}

/**
 * TODOS os trabalhos do dono naquela conversa (o chat único escreve vários: "um artigo sobre X",
 * "agora outro sobre Y"), do mais recente pro mais antigo. Só os que têm seções (motor do TCC).
 */
export async function listarTrabalhosDoEscopo(userId: string, scopeId: string, limite = 12): Promise<TccView[]> {
  const rows = await prisma.researchWork.findMany({
    where: { userId, scopeId },
    orderBy: { createdAt: "desc" }, // a ordem em que nasceram na conversa (editar o antigo não o promove)
    take: limite,
  });
  return rows.filter((r: any) => Array.isArray(r.secoes)).map((r: any) => view(r, "dono"));
}

/** Grava as linhas de histórico de uma aplicação (best-effort em lote). */
async function gravarRevisoes(workId: string, autorId: string, origem: Origem, efeitos: Efeito[], extra?: { op?: string; nota?: string }) {
  if (!efeitos.length) return;
  await prisma.tccRevisao.createMany({
    data: efeitos.map((e) => ({
      workId, autorId, origem, secaoId: e.secaoId, titulo: e.titulo,
      op: extra?.op ?? e.op, antes: e.antes, depois: e.depois, status: "aplicada",
      ...(extra?.nota ? { nota: extra.nota } : {}),
    })),
  });
}

export async function criarTcc(input: {
  userId: string; scopeId: string | null; titulo: string; secoes: { titulo: string; corpo?: string }[];
  origem: Origem; status?: TccStatus;
  /** "TCC" (padrão) | "Artigo" | "Relatório" — o tipo que o editor mostra e o export ABNT recebe. */
  workType?: string;
}): Promise<TccView> {
  const secoes = novasSecoes(input.secoes);
  const row = await prisma.researchWork.create({
    data: {
      userId: input.userId, scopeId: input.scopeId, title: input.titulo.slice(0, 200) || "TCC",
      workType: input.workType || "TCC", secoes: secoes as any, content: secoesParaMarkdown(secoes),
      tccStatus: input.status ?? "pronto",
    },
  });
  // Seções que nasceram com texto entram no histórico (a origem fica registrada desde o 1º dia).
  await gravarRevisoes(row.id, input.userId, input.origem,
    secoes.filter((s) => s.corpo.trim()).map((s) => ({ op: "inserir", secaoId: s.id, titulo: s.titulo, antes: null, depois: s.corpo })),
  ).catch(() => {});
  return view(row, "dono");
}

export type EditResult =
  | { ok: true; tcc: TccView; efeitos: Efeito[] }
  | { ok: false; reason: "not_found" | "forbidden" | "conflict" | "invalid"; detalhe?: string };

const MAX_TENTATIVAS = 5;

/**
 * Aplica operações com controle otimista (igual ao patchBoard da cartolina): relê, aplica, grava
 * SÓ se `rev` ainda é o que lemos; perdeu a corrida → relê e reaplica sobre o estado novo. As
 * operações são por seção, então duas salas em seções diferentes nunca se apagam; na MESMA
 * seção vale a última (e a anterior fica no histórico).
 */
/**
 * AVISO de mudança para quem está com o documento aberto — a colaboração em tempo real.
 *
 * É um EMPURRÃO, não um payload: vai só `{ workId, rev }`, e quem recebe RELÊ pela rota
 * autenticada. Mandar o texto no evento seria mais rápido e estaria errado por dois motivos. O
 * canal do Pusher NÃO passa por `papelNoWork`, então o conteúdo do trabalho vazaria para quem
 * assinasse `tcc-<id>` — e com isto o canal não entrega nada a quem não poderia ler de qualquer
 * forma. E payload empurrado pode divergir do documento real, que é a mesma razão pela qual o
 * modelo nunca digita o número do gráfico: o desenho vem de quem tem o dado.
 *
 * Best-effort de ponta a ponta: sem env de Pusher nada acontece, e o poll do painel (6 s) continua
 * como rede. Falha aqui nunca derruba a escrita — o documento JÁ está salvo quando isto roda.
 *
 * Import tardio de propósito: `lib/collab/realtime` carrega o pacote `pusher` (Node) no topo, e
 * este módulo é importado por testes puros que não têm o que fazer com ele.
 */
async function avisarMudanca(workId: string, rev: number): Promise<void> {
  try {
    const { triggerSafe } = await import("@/lib/collab/realtime");
    await triggerSafe(`tcc-${workId}`, "doc-update", { workId, rev, ts: Date.now() });
  } catch { /* o aviso é opcional; a escrita já aconteceu */ }
}

export async function aplicarNoTcc(
  id: string, userId: string, ops: OpSecao[] | ((t: TccView) => OpSecao[]), origem: Origem,
  extra?: { op?: string; nota?: string; status?: TccStatus; titulo?: string; semHistorico?: (e: Efeito, i: number) => boolean },
): Promise<EditResult> {
  for (let i = 0; i < MAX_TENTATIVAS; i++) {
    const atual = await getTccForUser(id, userId);
    if (!atual) return { ok: false, reason: "not_found" };
    if (!podeEscrever(atual.papel)) return { ok: false, reason: "forbidden" };
    const lista = typeof ops === "function" ? ops(atual) : ops;
    const r = aplicarNoDoc(atual.secoes, lista);
    if (!r.ok) return { ok: false, reason: "invalid", detalhe: r.erro };
    const titulo = extra?.titulo?.trim() ? extra.titulo.trim().slice(0, 200) : atual.titulo;
    if (!r.efeitos.length && !extra?.status && titulo === atual.titulo) return { ok: true, tcc: atual, efeitos: [] };
    const content = secoesParaMarkdown(r.secoes);
    const w = await prisma.researchWork.updateMany({
      where: { id, rev: atual.rev },
      data: { secoes: r.secoes as any, content, rev: atual.rev + 1, title: titulo, ...(extra?.status ? { tccStatus: extra.status } : {}) },
    });
    if (w.count === 1) {
      const registrar = extra?.semHistorico ? r.efeitos.filter((e, i) => !extra.semHistorico!(e, i)) : r.efeitos;
      await gravarRevisoes(id, userId, origem, registrar, extra).catch((e) => console.warn("[tcc] histórico falhou:", e?.message ?? e));
      await avisarMudanca(id, atual.rev + 1);
      return {
        ok: true,
        tcc: { ...atual, secoes: r.secoes, content, titulo, rev: atual.rev + 1, status: extra?.status ?? atual.status },
        efeitos: r.efeitos,
      };
    }
  }
  return { ok: false, reason: "conflict" };
}

/** Só muda o status (gerando → pronto/erro) sem tocar nas seções. */
export async function marcarStatus(id: string, userId: string, status: TccStatus): Promise<void> {
  await prisma.researchWork.updateMany({ where: { id, userId }, data: { tccStatus: status } });
}

/**
 * SUGESTÕES (Sala de Pesquisa): nada muda no documento — cada operação vira uma `TccRevisao`
 * "sugerida", com o `depois` já calculado (o aluno vê exatamente o que vai virar) e as fontes.
 */
export async function sugerirNoTcc(id: string, userId: string, sugestoes: (OpSecao & { fontes?: FonteVerificada[]; nota?: string })[]): Promise<{ ok: true; revisoes: RevisaoView[] } | { ok: false; reason: "not_found" | "forbidden" }> {
  const atual = await getTccForUser(id, userId);
  if (!atual) return { ok: false, reason: "not_found" };
  if (!podeEscrever(atual.papel)) return { ok: false, reason: "forbidden" };
  const revisoes: RevisaoView[] = [];
  for (const s of sugestoes) {
    const r = aplicarNoDoc(atual.secoes, [s]); // simula sobre o doc atual — só pra calcular o efeito
    if (!r.ok || !r.efeitos.length) continue;
    const e = r.efeitos[0];
    const row = await prisma.tccRevisao.create({
      data: {
        workId: id, autorId: userId, origem: "pesquisa", status: "sugerida", secaoId: e.secaoId,
        titulo: e.titulo, op: e.op, antes: e.antes, depois: e.depois,
        fontes: (s.fontes ?? []) as any, nota: s.nota?.slice(0, 600) ?? null,
      },
    });
    revisoes.push(revisaoView(row));
  }
  // sugestão não muda o documento, mas MUDA o painel (a aba "Sugestões"): quem está com o trabalho
  // aberto precisa ver a sugestão chegar sem esperar o poll.
  if (revisoes.length) await avisarMudanca(id, atual.rev);
  return { ok: true, revisoes };
}

export async function listarSugestoes(workId: string): Promise<RevisaoView[]> {
  const rows = await prisma.tccRevisao.findMany({ where: { workId, status: "sugerida" }, orderBy: { createdAt: "asc" }, take: 50 });
  return rows.map(revisaoView);
}

export async function historicoDoTcc(id: string, userId: string): Promise<RevisaoView[] | null> {
  const t = await getTccForUser(id, userId);
  if (!t) return null;
  const rows = await prisma.tccRevisao.findMany({ where: { workId: id }, orderBy: { createdAt: "desc" }, take: 200 });
  return rows.map(revisaoView);
}

/** A operação que ACEITAR uma sugestão aplica hoje (o doc pode ter andado desde a sugestão). */
export function opDeAceite(rev: RevisaoView, secoes: Secao[]): OpSecao {
  const existe = secoes.find((s) => s.id === rev.secaoId);
  if (rev.op === "inserir" || !existe) return { op: "inserir", titulo: rev.titulo || "SEÇÃO", corpo: rev.depois, ...(existe ? {} : { secaoId: rev.secaoId }) };
  if (rev.op === "remover") return { op: "remover", secaoId: rev.secaoId };
  // anexar sobre um texto que mudou desde a sugestão: anexa SÓ o trecho novo (não atropela o meio)
  if (rev.op === "anexar" && rev.antes !== null && existe.corpo !== rev.antes) {
    const base = rev.antes.trimEnd();
    const trecho = rev.depois.startsWith(base) ? rev.depois.slice(base.length).trim() : rev.depois;
    return { op: "anexar", secaoId: rev.secaoId, corpo: trecho };
  }
  return { op: "substituir", secaoId: rev.secaoId, corpo: rev.depois };
}

/** Referências ABNT que ainda NÃO estão na seção de referências (dedupe por texto normalizado). */
export function referenciasNovas(secoes: Secao[], fontes: FonteVerificada[]): { secao: Secao | null; novas: string[] } {
  const secao = secoes.find((s) => /^referencias?$|^referencias bibliograficas$/.test(chaveTitulo(s.titulo).replace(/-/g, " ").trim())) ?? null;
  const ja = new Set((secao?.corpo ?? "").split("\n").map((l) => chaveTitulo(l)).filter(Boolean));
  const novas: string[] = [];
  for (const f of fontes) {
    const k = chaveTitulo(f.abnt);
    if (k && !ja.has(k)) { ja.add(k); novas.push(f.abnt.trim()); }
  }
  return { secao, novas };
}

export type DecisaoResult =
  | { ok: true; tcc: TccView; revisao: RevisaoView }
  | { ok: false; reason: "not_found" | "forbidden" | "conflict" | "invalid" };

/**
 * Aceitar → aplica (vira "aplicada", com o `antes` REAL do momento do aceite, pra o desfazer
 * restaurar o que estava lá de verdade) e leva as fontes pra seção REFERÊNCIAS (ABNT).
 * Rejeitar → "rejeitada" (fica no histórico; o documento não muda).
 */
export async function decidirSugestao(workId: string, revId: string, userId: string, aceitar: boolean): Promise<DecisaoResult> {
  if (!isObjectId(revId)) return { ok: false, reason: "not_found" };
  const t = await getTccForUser(workId, userId);
  if (!t) return { ok: false, reason: "not_found" };
  if (!podeEscrever(t.papel)) return { ok: false, reason: "forbidden" };
  const row = await prisma.tccRevisao.findFirst({ where: { id: revId, workId, status: "sugerida" } });
  if (!row) return { ok: false, reason: "not_found" };
  const rev = revisaoView(row);

  if (!aceitar) {
    const upd = await prisma.tccRevisao.updateMany({ where: { id: revId, status: "sugerida" }, data: { status: "rejeitada" } });
    if (upd.count !== 1) return { ok: false, reason: "not_found" }; // outro clique já decidiu
    return { ok: true, tcc: t, revisao: { ...rev, status: "rejeitada" } };
  }

  // Reserva a sugestão ANTES de aplicar: dois cliques em "aceitar" não aplicam duas vezes.
  const reserva = await prisma.tccRevisao.updateMany({ where: { id: revId, status: "sugerida" }, data: { status: "aplicando" } });
  if (reserva.count !== 1) return { ok: false, reason: "not_found" };

  let antesReal: string | null = null;
  const r = await aplicarNoTcc(workId, userId, (atual) => {
    antesReal = atual.secoes.find((s) => s.id === rev.secaoId)?.corpo ?? null;
    const ops: OpSecao[] = [opDeAceite(rev, atual.secoes)];
    const { secao, novas } = referenciasNovas(atual.secoes, rev.fontes);
    if (novas.length) ops.push(secao ? { op: "anexar", secaoId: secao.id, corpo: novas.join("\n") } : { op: "inserir", titulo: "REFERÊNCIAS", corpo: novas.join("\n") });
    return ops;
  }, "pesquisa", {
    // A mudança principal NÃO ganha linha nova: a própria sugestão vira a linha aplicada
    // (uma linha por mudança). Só as referências levadas pra seção REFERÊNCIAS entram à parte.
    semHistorico: (e) => e.secaoId === rev.secaoId,
  });
  if (!r.ok) {
    await prisma.tccRevisao.updateMany({ where: { id: revId, status: "aplicando" }, data: { status: "sugerida" } }).catch(() => {});
    return { ok: false, reason: r.reason === "not_found" || r.reason === "forbidden" || r.reason === "conflict" ? r.reason : "invalid" };
  }
  const principal = r.efeitos.find((e) => e.secaoId === rev.secaoId);
  const depois = principal?.depois ?? rev.depois;
  await prisma.tccRevisao.update({ where: { id: revId }, data: { status: "aplicada", antes: antesReal, depois } });
  return { ok: true, tcc: r.tcc, revisao: { ...rev, status: "aplicada", antes: antesReal, depois } };
}

/** Desfazer = restaurar o `antes` de uma revisão aplicada (vira revisão nova, origem aluno). */
export async function desfazerRevisao(workId: string, revId: string, userId: string): Promise<EditResult> {
  if (!isObjectId(revId)) return { ok: false, reason: "not_found" };
  const t = await getTccForUser(workId, userId);
  if (!t) return { ok: false, reason: "not_found" };
  const row = await prisma.tccRevisao.findFirst({ where: { id: revId, workId, status: "aplicada" } });
  if (!row) return { ok: false, reason: "not_found" };
  return aplicarNoTcc(workId, userId, (atual) => {
    const op = opDeDesfazer(row, atual.secoes);
    return op ? [op] : [];
  }, "aluno", { op: "restaurar", nota: `desfez ${revId}` });
}

/**
 * O editor da Sala de Pesquisa salva o markdown INTEIRO (autosave). Num TCC cross-sala isso vira
 * operações por seção, origem "aluno": só o que mudou entra, e entra no histórico.
 *
 * Com `base` (a versão que o editor tinha quando o aluno começou a digitar) é um merge de 3 vias:
 * só as seções que o ALUNO mexeu (base → content) são aplicadas sobre o estado atual — o que a
 * Sala de Estudos escreveu noutra seção enquanto isso não é revertido pelo editor desatualizado.
 * Sem `base` (cliente antigo), compara direto com o atual (última vence no documento todo).
 */
export async function aplicarConteudoManual(workId: string, userId: string, content: string, titulo?: string, base?: string): Promise<EditResult> {
  return aplicarNoTcc(workId, userId, (atual) => {
    const novas = secoesDeMarkdown(content, atual.secoes);
    if (typeof base !== "string") return diffSecoes(atual.secoes, novas);
    return rebasearOps(diffSecoes(secoesDeMarkdown(base, atual.secoes), novas), atual.secoes);
  }, "aluno", { titulo });
}
