/**
 * lib/orquestra/conversa.ts — as CONVERSAS do console da orquestra (app macOS; docs/HERMES_ZAEON.md · /conversas).
 *
 * O admin fala com QUALQUER interlocutor, pelo mesmo caminho que o aluno usa:
 *  - agente da casa (Aura, Zenita, Nina, Eiffel, Octa, as outras personas e os 17 mentores) → `runChatTurn`, com a
 *    voz/persona do agente, o mentor quando é um, e a base por área dele;
 *  - motor da orquestra (DeepSeek, Qwen, Kimi, enxames…) → `orquestrarTurno` com o motor FORÇADO e plano max.
 *
 * Cada mensagem do agente é uma tarefa (OrquestraTarefa, origem "console"): a trilha guarda os passos e o TokenLedger
 * liga as chamadas pelo `taskId` (gasto marcado com surface "admin" — fora da saúde do chat dos alunos). Enquanto o
 * turno roda, os passos ficam num registro EM MEMÓRIA (`aoVivo`): o web é um processo só e o turno roda nele.
 *
 * Sem usuário: userId null (nenhuma memória de aluno é lida nem escrita).
 */
import { novoIdDeTarefa } from "@/lib/orquestra/contrato";
import type { Plan } from "@/lib/plans";

type Env = Record<string, string | undefined>;

export const MAX_MENSAGENS = 200;
export const MAX_TEXTO_MENSAGEM = 8_000;
const HISTORICO_TURNOS = 12;

export type MensagemConversa = {
  id: string;
  papel: "voce" | "agente";
  texto: string;
  em: string;
  tarefaId?: string;
  status?: "rodando" | "concluida" | "falhou";
  ms?: number;
  modelo?: string | null;
};

export type Interlocutor = {
  id: string;
  nome: string;
  tipo: "agente" | "mentor" | "motor";
  descricao: string;
  disponivel: boolean;
};

// ───────────────────────────── quem pode conversar ─────────────────────────────

/** PURA: todos os interlocutores — agentes da casa que conversam (sem os "silenciosos") e os motores da orquestra. */
export async function interlocutores(env: Env = process.env): Promise<Interlocutor[]> {
  const [{ montarElenco }, { todosOsMotores }] = await Promise.all([import("@/lib/orquestra/elenco"), import("@/lib/orquestra/motores")]);
  const casa = montarElenco({})
    .filter((a) => a.conversacional && (a.tipo === "persona" || a.tipo === "mentor"))
    .map((a): Interlocutor => ({
      id: a.id, nome: a.nome, tipo: a.tipo === "mentor" ? "mentor" : "agente",
      descricao: a.curso ? `Mentor de ${a.curso}` : a.bio || a.distincao || "", disponivel: true,
    }));
  const motores = todosOsMotores(env).map((m): Interlocutor => ({
    id: m.id, nome: m.nome, tipo: "motor", descricao: m.descricao, disponivel: m.disponivel(env),
  }));
  return [...casa, ...motores];
}

// ───────────────────────────── regras puras ─────────────────────────────

/** PURA: valida o texto de uma mensagem. Erro = string pro 400. */
export function lerTexto(b: unknown): string | { erro: string } {
  const t = typeof (b as any)?.texto === "string" ? (b as any).texto.trim() : "";
  if (!t) return { erro: "mensagem vazia" };
  if (t.length > MAX_TEXTO_MENSAGEM) return { erro: `mensagem longa demais (máximo ${MAX_TEXTO_MENSAGEM} caracteres)` };
  return t;
}

/** PURA: o título da conversa a partir da 1ª mensagem. */
export function tituloDe(texto: string): string {
  const t = texto.replace(/\s+/g, " ").trim();
  return t.length > 60 ? `${t.slice(0, 57).trimEnd()}…` : t || "Nova conversa";
}

/** PURA: o histórico que entra no turno — só mensagens concluídas, as últimas N, no formato do harness. */
export function historicoDe(msgs: MensagemConversa[]): Array<{ role: string; text: string }> {
  return msgs
    .filter((m) => m.texto && (m.papel === "voce" || m.status === "concluida"))
    .slice(-HISTORICO_TURNOS * 2)
    .map((m) => ({ role: m.papel === "voce" ? "user" : "model", text: m.texto }));
}

/** Turno "rodando" há mais que isto sem registro ao vivo = o servidor reiniciou no meio (deploy): vira falha. */
export const TURNO_PERDIDO_MS = 15 * 60_000;
export const TEXTO_TURNO_PERDIDO = "Este turno foi interrompido: o servidor reiniciou no meio da resposta. Mande de novo.";

/** PURA: a mensagem está rodando DE VERDADE (não é um turno perdido num reinício)? */
export function rodandoDeVerdade(m: MensagemConversa, agora = Date.now(), vivo = (id: string) => progressoAoVivo(id) != null): boolean {
  if (m.papel !== "agente" || m.status !== "rodando") return false;
  if (m.tarefaId && vivo(m.tarefaId)) return true;
  return agora - new Date(m.em).getTime() < TURNO_PERDIDO_MS;
}

/** PURA: a conversa tem um turno rodando? (um de cada vez por conversa) */
export const temTurnoRodando = (msgs: MensagemConversa[], agora = Date.now(), vivo?: (id: string) => boolean) =>
  msgs.some((m) => rodandoDeVerdade(m, agora, vivo));

/** PURA: lê `mensagens` do banco (Json) sem confiar no formato. */
export function mensagensDe(json: unknown): MensagemConversa[] {
  if (!Array.isArray(json)) return [];
  return json.filter((m) => m && typeof m === "object" && typeof (m as any).id === "string" && typeof (m as any).texto === "string") as MensagemConversa[];
}

/** PURA: extrai os eventos `@@PROGRESS@@{json}\n` de um pedaço do stream do harness. */
export function eventosDoPedaco(pedaco: string): Array<{ fase: string; rotulo: string }> {
  const out: Array<{ fase: string; rotulo: string }> = [];
  for (const m of String(pedaco).matchAll(/@@PROGRESS@@(\{[^\n]*\})\n?/g)) {
    try {
      const j = JSON.parse(m[1]);
      if (typeof j?.rotulo === "string") out.push({ fase: String(j.fase ?? ""), rotulo: j.rotulo });
    } catch { /* evento torto: ignora */ }
  }
  return out;
}

// ───────────────────────────── ao vivo (memória do processo) ─────────────────────────────

export type AoVivo = { inicio: number; eventos: Array<{ t: number; fase: string; rotulo: string }>; previa: string; modelo: string | null };
const aoVivo = new Map<string, AoVivo>();
const MAX_EVENTOS_VIVO = 300;

export const progressoAoVivo = (tarefaId: string): AoVivo | null => aoVivo.get(tarefaId) ?? null;

function registrar(tarefaId: string, ev: { fase: string; rotulo: string }) {
  const v = aoVivo.get(tarefaId);
  if (!v) return;
  if (ev.fase === "previa") { v.previa = (v.previa + ev.rotulo).slice(-8_000); return; }
  if (ev.fase === "modelo") { v.modelo = ev.rotulo; return; }
  if (v.eventos.length < MAX_EVENTOS_VIVO) v.eventos.push({ t: Date.now() - v.inicio, fase: ev.fase, rotulo: ev.rotulo.slice(0, 300) });
}

// ───────────────────────────── o turno ─────────────────────────────

export type ResultadoTurno = { status: "concluida" | "falhou"; texto: string; ms: number; modelo: string | null };

/**
 * Roda UM turno do console e devolve o texto. Quem chama grava na conversa. Nunca lança: erro vira `falhou`
 * com a mensagem amigável do harness.
 */
export async function rodarTurno(p: {
  tarefaId: string; agente: string; texto: string; historico: Array<{ role: string; text: string }>; env?: Env;
}): Promise<ResultadoTurno> {
  const env = p.env ?? process.env;
  const t0 = Date.now();
  aoVivo.set(p.tarefaId, { inicio: t0, eventos: [], previa: "", modelo: null });
  const narrar = (pedaco: string) => { for (const ev of eventosDoPedaco(pedaco)) registrar(p.tarefaId, ev); };
  try {
    const { todosOsMotores } = await import("@/lib/orquestra/motores");
    const motor = todosOsMotores(env).find((m) => m.id === p.agente);
    const texto = motor ? await turnoDeMotor(p, motor.id, narrar, env) : await turnoDaCasa(p, narrar);
    return { status: "concluida", texto, ms: Date.now() - t0, modelo: aoVivo.get(p.tarefaId)?.modelo ?? null };
  } catch (e) {
    const { messageForError, classifyError } = await import("@/lib/agent/errors");
    const msg = String((e as Error)?.message ?? e);
    console.warn(`[orquestra/console] turno ${p.agente} falhou:`, msg.slice(0, 200));
    return { status: "falhou", texto: messageForError(classifyError(msg)), ms: Date.now() - t0, modelo: null };
  } finally {
    // o registro some um pouco depois do fim: o app ainda lê os últimos passos no próximo refresh
    setTimeout(() => aoVivo.delete(p.tarefaId), 60_000).unref?.();
  }
}

/** Agente da casa: o MESMO `runChatTurn` do aluno, com a voz/persona do agente (ou o mentor) e a base dele. */
async function turnoDaCasa(p: { tarefaId: string; agente: string; texto: string; historico: Array<{ role: string; text: string }> }, narrar: (s: string) => void): Promise<string> {
  const [{ runChatTurn }, { AGENTES_CHAT }, { capacidadeDe }, { buildPersona }, { mentorBySlug }, { renderStructuredAnswer }, { criarTrilha }] = await Promise.all([
    import("@/lib/agent/runChatTurn"), import("@/lib/agents/chatAgentes"), import("@/lib/agents/capacidades"), import("@/lib/ai/personas"),
    import("@/lib/agent/mentors"), import("@/lib/agent/aura-harness"), import("@/lib/orquestra/trilha"),
  ]);
  const chat = AGENTES_CHAT.find((a) => a.id === p.agente && !a.id.startsWith("orq-"));
  const mentorSeed = mentorBySlug(p.agente);
  let agente = "aura";
  let systemContext: string | undefined;
  let mentor: { slug: string; wing: any } | null = null;
  let nome = p.agente;
  if (chat) {
    agente = chat.id;
    nome = chat.nome;
    if (chat.id !== "aura") systemContext = buildPersona(capacidadeDe(chat.id as any).persona);
  } else if (mentorSeed) {
    const { resolveMentor } = await import("@/lib/agent/mentors-server");
    const m = await resolveMentor(p.agente, null).catch(() => null);
    if (m) { mentor = { slug: m.slug, wing: m.wing }; systemContext = m.context; nome = m.name; }
  } else {
    // as outras personas (Zaeon, Caio, Téo, Davi, Scholar, Examiner): a Aura com a voz delas, como o chat faz
    systemContext = buildPersona(p.agente);
    nome = (await import("@/lib/ai/personas")).personaName(p.agente);
  }
  const trilha = criarTrilha();
  trilha.iniciar({
    id: p.tarefaId, origem: "console", motor: p.agente, nomeMotor: nome, formato: "unico", intent: "conversa", plano: "max",
    objetivo: p.texto, userId: null, decisao: { motor: p.agente, formato: "unico", motivo: "console", maxSubagentes: 0, prazoMs: 0, verificadorGlobal: false },
  });
  const t0 = Date.now();
  try {
    const out = await runChatTurn(null, {
      prompt: p.texto, surface: "admin", userId: null, history: p.historico, agente: agente as any,
      ...(systemContext ? { systemContext } : {}), ...(mentor ? { mentor } : {}), tarefaId: p.tarefaId,
    }, (pedaco) => {
      narrar(pedaco);
      for (const ev of eventosDoPedaco(pedaco)) if (ev.fase !== "previa") trilha.evento(ev.fase || "harness", ev.rotulo, nome);
    });
    const texto = out.mode === "structured" ? renderStructuredAnswer(out.answer) : out.text;
    await trilha.concluir({ status: "concluida", texto, relatorio: { ms: Date.now() - t0 } });
    return texto;
  } catch (e) {
    await trilha.concluir({ status: "falhou", erro: String((e as Error)?.message ?? e), relatorio: { ms: Date.now() - t0 } });
    throw e;
  }
}

/** Motor da orquestra: forçado (sem portão de plano), em segundo plano, com o histórico da conversa. */
async function turnoDeMotor(p: { tarefaId: string; texto: string; historico: Array<{ role: string; text: string }> }, motor: string, narrar: (s: string) => void, env: Env): Promise<string> {
  const [{ buildHarnessDeps, renderStructuredAnswer }, { orquestrarTurno }, { areasDoTurno }] = await Promise.all([
    import("@/lib/agent/aura-harness"), import("@/lib/orquestra/orquestrador"), import("@/lib/rag/areas"),
  ]);
  await import("@/lib/agent/runtime");
  const hctx: any = { plan: "max", execMode: "auto", activeTab: "sala-de-estudos" };
  const ledger = { agentKey: motor, surface: "admin" as const, taskId: p.tarefaId };
  const deps = buildHarnessDeps(hctx, { ledger: ledger as any });
  const r = await orquestrarTurno({
    objetivo: p.texto, hctx, deps, userId: null, emSegundoPlano: true, trabalhoGeradoNoCliente: false,
    history: p.historico, ledger: ledger as any, narrar, plano: "max" as Plan, origem: "console", tarefaId: p.tarefaId,
    areas: areasDoTurno(null), env: { ...env, ORQUESTRA: "on", ORQ_MOTOR: motor },
  });
  return renderStructuredAnswer(r.answer);
}

// ───────────────────────────── banco ─────────────────────────────

const OID = /^[a-f0-9]{24}$/;
export const idValido = (id: string) => OID.test(id);

/**
 * Acrescenta a mensagem do aluno + a do agente "rodando", dispara o turno em segundo plano e, no fim, grava a
 * resposta. Devolve a conversa como ficou (com o turno rodando) — o app acompanha por GET.
 */
export async function enviarMensagem(conversaId: string, texto: string, deps: {
  rodar?: typeof rodarTurno; agora?: () => Date; env?: Env;
} = {}): Promise<{ ok: true; tarefaId: string } | { ok: false; status: number; erro: string }> {
  const { prisma } = await import("@/src/lib/prisma");
  const agora = deps.agora ?? (() => new Date());
  const c = await prisma.consoleConversa.findUnique({ where: { id: conversaId } });
  if (!c) return { ok: false, status: 404, erro: "conversa_nao_encontrada" };
  const msgs = mensagensDe(c.mensagens);
  if (temTurnoRodando(msgs)) return { ok: false, status: 409, erro: "turno_em_andamento" };
  if (msgs.length + 2 > MAX_MENSAGENS) return { ok: false, status: 409, erro: "conversa_cheia" };
  const historico = historicoDe(msgs);
  const tarefaId = novoIdDeTarefa();
  const em = agora().toISOString();
  const novas: MensagemConversa[] = [
    ...msgs,
    { id: novoIdDeTarefa(), papel: "voce", texto, em },
    { id: novoIdDeTarefa(), papel: "agente", texto: "", em, tarefaId, status: "rodando" },
  ];
  await prisma.consoleConversa.update({
    where: { id: conversaId },
    data: { mensagens: novas as any, ...(msgs.length === 0 ? { titulo: tituloDe(texto) } : {}) },
  });
  const rodar = deps.rodar ?? rodarTurno;
  void rodar({ tarefaId, agente: c.agente, texto, historico, env: deps.env })
    .then((r) => fecharMensagem(conversaId, tarefaId, r))
    .catch((e) => fecharMensagem(conversaId, tarefaId, { status: "falhou", texto: String((e as Error)?.message ?? e), ms: 0, modelo: null }));
  return { ok: true, tarefaId };
}

/** Grava a resposta na mensagem do agente que aponta pra tarefa. */
export async function fecharMensagem(conversaId: string, tarefaId: string, r: ResultadoTurno): Promise<void> {
  try {
    const { prisma } = await import("@/src/lib/prisma");
    const c = await prisma.consoleConversa.findUnique({ where: { id: conversaId } });
    if (!c) return;
    const msgs = mensagensDe(c.mensagens).map((m) =>
      m.tarefaId === tarefaId ? { ...m, texto: r.texto, status: r.status, ms: r.ms, modelo: r.modelo } : m);
    await prisma.consoleConversa.update({ where: { id: conversaId }, data: { mensagens: msgs as any } });
  } catch (e) {
    console.error("[orquestra/console] gravar resposta falhou:", String((e as Error)?.message ?? e).slice(0, 200));
  }
}

/** A conversa para o app: mensagens + o progresso ao vivo do turno que está rodando. */
export function conversaParaApp(c: { id: string; criadaEm: Date; atualizadaEm: Date; titulo: string; agente: string; mensagens: unknown }) {
  const mensagens = mensagensDe(c.mensagens).map((m) => {
    if (m.status !== "rodando" || !m.tarefaId) return m;
    if (!rodandoDeVerdade(m)) return { ...m, status: "falhou" as const, texto: TEXTO_TURNO_PERDIDO };
    const v = progressoAoVivo(m.tarefaId);
    return { ...m, aoVivo: v ? { eventos: v.eventos, previa: v.previa, modelo: v.modelo, ms: Date.now() - v.inicio } : null };
  });
  return {
    id: c.id, titulo: c.titulo, agente: c.agente,
    criadaEm: new Date(c.criadaEm).toISOString(), atualizadaEm: new Date(c.atualizadaEm).toISOString(), mensagens,
  };
}
