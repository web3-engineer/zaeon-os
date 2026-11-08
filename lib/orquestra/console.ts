/**
 * lib/orquestra/console.ts — o lado servidor do console Zaeon Hermes (docs/HERMES_ZAEON.md).
 *
 * Tudo que o app de Mac mostra sai daqui: os motores com o que TÊM (modelos, rotas, preço, ferramentas,
 * datasets, prompt) e o que FAZEM (métricas e tarefas, da trilha + TokenLedger por taskId), a arena e o
 * export das trajetórias pro Hugging Face. As rotas em app/api/admin/orquestra/* só autenticam e chamam.
 */
import { timingSafeEqual } from "node:crypto";
import { precoDe } from "@/lib/ai/preco";
import { GEMINI_MODEL_FLASH, GEMINI_MODEL_PRO } from "@/lib/ai/model";
import type { IntentId, StructuredAnswer, WorkKind } from "@/lib/agent/contracts";
import { listTools } from "@/lib/agent/runtime";
import { FORA_DO_MENU } from "@/lib/agent/acao";
import { MODELOS, PROVEDORES, type ModeloId } from "@/lib/orquestra/provedores";
import { MOTORES_NATIVOS, orquestradorMisto, todosOsMotores, trabalhadoresMistos } from "@/lib/orquestra/motores";
import { modoOrquestra } from "@/lib/orquestra/roteador";
import { sistemaDoOrquestrador, sistemaDoPesquisador } from "@/lib/orquestra/prompts";
import { catalogoDeDatasets, contarPorArea, type DatasetPainel } from "@/lib/orquestra/datasets";
import { novoIdDeTarefa, type Motor, type Tarefa } from "@/lib/orquestra/contrato";
import { motoresEmVoo } from "@/lib/orquestra/orquestrador";

type Env = Record<string, string | undefined>;

// ───────────────────────────── autenticação ─────────────────────────────
export const MIN_TOKEN = 32;

/** PURA: o Bearer bate com ORQUESTRA_CONSOLE_TOKEN (≥ 32 caracteres), em tempo constante */
export function tokenValido(cabecalho: string | null | undefined, env: Env = process.env): boolean {
  const esperado = env.ORQUESTRA_CONSOLE_TOKEN?.trim();
  if (!esperado || esperado.length < MIN_TOKEN) return false;
  const m = /^Bearer\s+(.+)$/i.exec(String(cabecalho ?? "").trim());
  if (!m) return false;
  const a = Buffer.from(m[1].trim()), b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** token OU sessão de super-admin. `sessao` injetável (teste) */
export async function autorizar(req: Request, env: Env = process.env, sessao?: () => Promise<{ email?: string | null; role?: string | null } | null>): Promise<boolean> {
  if (tokenValido(req.headers.get("authorization"), env)) return true;
  try {
    const s = sessao
      ? await sessao()
      : await (async () => {
        const [{ getServerSession }, { authOptions }] = await Promise.all([import("next-auth"), import("@/src/lib/auth")]);
        const ss: any = await getServerSession(authOptions);
        return ss?.user ? { email: ss.user.email, role: ss.user.role } : null;
      })();
    if (!s) return false;
    const { isSuperAdmin } = await import("@/lib/auth/roles");
    return isSuperAdmin(s);
  } catch {
    return false;
  }
}

// ───────────────────────────── tarefas (linha do banco → contrato) ─────────────────────────────
export type LinhaTarefa = {
  id: string; criadaEm: Date; atualizadaEm: Date; status: string; origem: string; motor: string; nomeMotor: string;
  formato: string; intent: string; plano: string; objetivo: string; decisao?: unknown; eventos?: unknown;
  evidencias?: unknown; texto?: string | null; relatorio?: any; erro?: string | null;
};

export type ResumoTarefa = {
  id: string; criadaEm: string; atualizadaEm: string; status: string; origem: string; motor: string; nomeMotor: string;
  formato: string; intent: string; plano: string; objetivo: string;
  ms: number | null; custoUsd: number | null; subagentes: number | null; evidencias: number | null; citadas: number | null;
  invalidas: number | null; cobertura: number | null; aprovado: boolean | null; degradado: boolean | null;
};

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function resumoDe(l: LinhaTarefa): ResumoTarefa {
  const r = (l.relatorio && typeof l.relatorio === "object" ? l.relatorio : {}) as any;
  return {
    id: l.id, criadaEm: new Date(l.criadaEm).toISOString(), atualizadaEm: new Date(l.atualizadaEm).toISOString(),
    status: l.status, origem: l.origem, motor: l.motor, nomeMotor: l.nomeMotor, formato: l.formato,
    intent: l.intent, plano: l.plano, objetivo: l.objetivo.slice(0, 160),
    ms: num(r.ms), custoUsd: num(r.uso?.custoUsd), subagentes: num(r.subagentes), evidencias: num(r.evidencias),
    citadas: num(r.citadas), invalidas: num(r.invalidas), cobertura: num(r.cobertura),
    aprovado: typeof r.aprovado === "boolean" ? r.aprovado : null, degradado: typeof r.degradado === "boolean" ? r.degradado : null,
  };
}

export type Metricas = {
  tarefas: number; concluidas: number; fallbacks: number; degradadas: number; msP50: number; msP90: number;
  custoMedioUsd: number; custoTotalUsd: number; citacoesInventadas: number; coberturaMedia: number; subagentesMedia: number;
};

const pct = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };
const media = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 1e4) / 1e4 : 0);

/** PURA: as métricas de um motor a partir das tarefas dele */
export function metricasDe(ts: ResumoTarefa[]): Metricas {
  const ok = ts.filter((t) => t.status === "concluida");
  const ms = ok.map((t) => t.ms ?? 0);
  const custos = ts.map((t) => t.custoUsd ?? 0);
  return {
    tarefas: ts.length, concluidas: ok.length,
    fallbacks: ts.filter((t) => t.status === "fallback").length,
    degradadas: ok.filter((t) => t.degradado).length,
    msP50: pct(ms, 0.5), msP90: pct(ms, 0.9),
    custoMedioUsd: media(custos), custoTotalUsd: Math.round(custos.reduce((a, b) => a + b, 0) * 1e6) / 1e6,
    citacoesInventadas: ok.reduce((s, t) => s + (t.invalidas ?? 0), 0),
    coberturaMedia: media(ok.map((t) => t.cobertura ?? 0)),
    subagentesMedia: media(ok.map((t) => t.subagentes ?? 0)),
  };
}

// ───────────────────────────── painel ─────────────────────────────
const TAREFA_EXEMPLO: Tarefa = {
  id: "0".repeat(24), objetivo: "Escreva um artigo acadêmico sobre o uso de CRISPR para resistência à seca em culturas agrícolas.",
  intent: "criar_trabalho", kind: "artigo", historico: [], plano: "max",
};

function modelosDoMotor(m: Motor, env: Env): ModeloId[] {
  switch (m.id) {
    case "deepseek-v4-profundo": return ["deepseek-v4-pro"];
    case "tongyi-deepresearch": return ["tongyi-deepresearch"];
    case "kimi-enxame": return ["kimi-k2.6"];
    case "enxame-misto": { const o = orquestradorMisto(env); return [...new Set([...(o ? [o] : []), ...trabalhadoresMistos(env)])]; }
    default: return [];
  }
}

function modeloPainel(id: ModeloId, env: Env) {
  const spec = MODELOS[id];
  const preco = precoDe(spec.rotas[0].modelo(env));
  return {
    id, nome: spec.nome, familia: spec.familia,
    rotas: spec.rotas.map((r) => ({ provedor: r.provedor, modelo: r.modelo(env), configurado: !!PROVEDORES[r.provedor].chave(env) })),
    preco: preco.conhecido ? preco.preco : null,
  };
}

export function ferramentasDoPainel(env: Env): Array<{ nome: string; descricao: string; risco: string }> {
  const daCasa = listTools()
    .filter((d) => d.risk === "read" && !FORA_DO_MENU.includes(d.name) && d.name !== "examiner")
    .map((d) => ({ nome: d.name, descricao: String(d.schema?.description ?? "").slice(0, 300), risco: d.risk }));
  return env.RAG_PG_URL?.trim()
    ? [...daCasa, { nome: "base_conhecimento", descricao: "Base da Zaeon: turma, pessoal e bases por área (SciELO, Wikipédia, medicina, ENEM).", risco: "read" }]
    : daCasa;
}

export async function montarPainel(deps: {
  env?: Env;
  tarefas: () => Promise<LinhaTarefa[]>;
  contagem?: () => ReturnType<typeof contarPorArea>;
}) {
  const env = deps.env ?? process.env;
  const [linhas, contagem] = await Promise.all([deps.tarefas().catch(() => [] as LinhaTarefa[]), (deps.contagem ?? contarPorArea)()]);
  const resumos = linhas.map(resumoDe);
  const datasets: DatasetPainel[] = catalogoDeDatasets(contagem, env);
  const ferramentas = ferramentasDoPainel(env);
  const idsDatasets = datasets.filter((d) => d.tipo.startsWith("rag-")).map((d) => d.id);
  const nomesFerramentas = ferramentas.map((f) => f.nome);

  const aura = {
    id: "aura", nome: "Aura", origem: "zaeon", formato: "unico",
    descricao: "O harness da Zaeon: classify → plano → coleta (JSON no prompt) → rascunho em stream → crítica. Responde tudo que a orquestra não assume.",
    disponivel: true,
    modelos: [...new Set([GEMINI_MODEL_FLASH, GEMINI_MODEL_PRO])].map((m) => ({
      id: m, nome: m, familia: "google", rotas: [{ provedor: "vertex", modelo: m, configurado: true }],
      preco: precoDe(m).conhecido ? precoDe(m).preco : null,
    })),
    ferramentas: nomesFerramentas.filter((n) => n !== "base_conhecimento"),
    // a Aura recebe a base pelo PROMPT (runChatTurn → baseConhecimento), não pela tool
    datasets: idsDatasets,
    prompt: "(o harness monta o prompt por fase — ver lib/agent/aura-harness.ts)",
  };
  const motores = [aura, ...todosOsMotores(env).map((m) => ({
    id: m.id, nome: m.nome, origem: m.origem, formato: m.formato, descricao: m.descricao, disponivel: m.disponivel(env),
    modelos: modelosDoMotor(m, env).map((id) => modeloPainel(id, env)),
    ferramentas: m.id.startsWith("http:") ? ["literature_search"] : [...nomesFerramentas, ...(m.formato === "enxame" ? ["delegar"] : [])],
    datasets: nomesFerramentas.includes("base_conhecimento") ? idsDatasets : [],
    prompt: m.formato === "enxame"
      ? sistemaDoOrquestrador(TAREFA_EXEMPLO, m.nome, Number(env.ORQ_SUBAGENTES_MAX) || 12)
      : sistemaDoPesquisador(TAREFA_EXEMPLO, `o agente de pesquisa ${m.nome}`),
  }))].map((m) => ({ ...m, metricas: metricasDe(resumos.filter((t) => t.motor === m.id)) }));

  const verif = env.ORQ_VERIFICADOR === "0" ? "off" : env.ORQ_VERIFICADOR === "1" ? "todos" : "max";
  return {
    geradoEm: new Date().toISOString(),
    modo: modoOrquestra(env),
    emVoo: motoresEmVoo(),
    config: {
      planoMinimo: env.ORQ_PLANO_MINIMO?.trim() || "pro",
      subagentesPro: Number(env.ORQ_SUBAGENTES_PRO) || 4, subagentesMax: Number(env.ORQ_SUBAGENTES_MAX) || 12,
      maxSimultaneas: Number(env.ORQ_MAX_SIMULTANEAS) || 2,
      prazoProfundoMs: Number(env.ORQ_PRAZO_PROFUNDO_MS) || 240_000, prazoEnxameMs: Number(env.ORQ_PRAZO_ENXAME_MS) || 480_000,
      sorteio: env.ORQ_SORTEIO === "1", verificador: verif, motorForcado: env.ORQ_MOTOR?.trim() || null,
    },
    motores,
    datasets,
    ferramentas,
    tarefas: resumos.slice(0, 50),
  };
}

// ───────────────────────────── detalhe ─────────────────────────────
export type LinhaLedgerDb = { at: Date; model: string; provedor: string; phase: string | null; promptTokens: number; completionTokens: number; ms: number; ok: boolean; erro: string | null; estimatedCostUsd: number };

export function detalheDe(l: LinhaTarefa, ledger: LinhaLedgerDb[]) {
  const r = (l.relatorio && typeof l.relatorio === "object" ? l.relatorio : {}) as any;
  return {
    tarefa: {
      ...resumoDe(l),
      decisao: l.decisao ?? null,
      eventos: Array.isArray(l.eventos) ? l.eventos : [],
      evidencias: Array.isArray(l.evidencias) ? l.evidencias : [],
      texto: l.texto ?? null,
      motivo: typeof r.motivo === "string" ? r.motivo : null,
      erro: l.erro ?? null,
      uso: r.uso ?? { promptTokens: 0, completionTokens: 0, chamadas: 0, custoUsd: 0 },
      ledger: ledger.map((x) => ({
        at: new Date(x.at).toISOString(), model: x.model, provedor: x.provedor, phase: x.phase, promptTokens: x.promptTokens,
        completionTokens: x.completionTokens, ms: x.ms, ok: x.ok, erro: x.erro, custoUsd: x.estimatedCostUsd,
      })),
    },
  };
}

// ───────────────────────────── arena ─────────────────────────────
const INTENTS_ARENA: readonly IntentId[] = ["criar_trabalho", "pesquisar_fontes", "revisar", "explicar_conceito"];
const KINDS: readonly WorkKind[] = ["estudo", "pesquisa", "artigo", "tcc", "relatorio", "aula"];
export const MAX_MOTORES_ARENA = 4;

export type PedidoArena = { objetivo: string; intent: IntentId; kind?: WorkKind; motores: string[] };

/** PURA: valida o corpo da arena. Erro = string pro 400 */
export function lerPedidoArena(b: any, motoresValidos: string[]): PedidoArena | string {
  const objetivo = typeof b?.objetivo === "string" ? b.objetivo.trim() : "";
  if (objetivo.length < 10) return "objetivo curto demais (mínimo 10 caracteres)";
  if (objetivo.length > 4_000) return "objetivo longo demais (máximo 4000 caracteres)";
  const intent = INTENTS_ARENA.includes(b?.intent) ? (b.intent as IntentId) : null;
  if (!intent) return `intent inválida (use ${INTENTS_ARENA.join(", ")})`;
  const kind = KINDS.includes(b?.kind) ? (b.kind as WorkKind) : undefined;
  const motores = Array.isArray(b?.motores) ? [...new Set(b.motores.map(String))] as string[] : [];
  if (!motores.length) return "escolha ao menos um motor";
  if (motores.length > MAX_MOTORES_ARENA) return `no máximo ${MAX_MOTORES_ARENA} motores por rodada`;
  const desconhecido = motores.find((m) => m !== "aura" && !motoresValidos.includes(m));
  if (desconhecido) return `motor desconhecido ou sem chave: ${desconhecido}`;
  return { objetivo, intent, kind, motores };
}

const textoDe = (a: StructuredAnswer): string =>
  [a.nucleo, a.desenvolvimento ?? "", ...(a.work?.sections ?? []).map((s) => `## ${s.title}\n${s.body}`)].filter(Boolean).join("\n\n");

/**
 * Dispara a arena: reserva um id por motor e roda cada um em SEGUNDO PLANO (o app acompanha pelo id).
 * A Aura entra pela mesma porta (ORQUESTRA=off), com a trilha escrita aqui, já que o harness não grava.
 */
export function dispararArena(p: PedidoArena, deps: { env?: Env; rodar?: (id: string, motor: string) => Promise<void> } = {}): string[] {
  const env = deps.env ?? process.env;
  const ids = p.motores.map(() => novoIdDeTarefa());
  p.motores.forEach((motor, i) => {
    const rodar = deps.rodar ?? ((id: string, m: string) => rodarNaArena(id, m, p, env));
    void rodar(ids[i], motor).catch((e) => console.warn(`[orquestra/arena] ${motor} falhou:`, String((e as Error)?.message ?? e).slice(0, 200)));
  });
  return ids;
}

async function rodarNaArena(id: string, motor: string, p: PedidoArena, env: Env): Promise<void> {
  const [{ buildHarnessDeps }, { orquestrarTurno }, { criarTrilha }, { areasDoTurno }] = await Promise.all([
    import("@/lib/agent/aura-harness"), import("@/lib/orquestra/orquestrador"), import("@/lib/orquestra/trilha"), import("@/lib/rag/areas"),
  ]);
  await import("@/lib/agent/runtime");
  const hctx: any = { plan: "free", execMode: "auto", activeTab: "sala-de-estudos" };
  const ledger = { agentKey: "arena", surface: "admin" as const };
  const classify = async () => ({ intent: p.intent, mode: "research" as const, academicMode: "enforced" as any, kind: p.kind });
  const deps = { ...buildHarnessDeps(hctx, { ledger: ledger as any }), classify };
  const base = {
    objetivo: p.objetivo, hctx, deps, userId: null, emSegundoPlano: true, trabalhoGeradoNoCliente: false,
    history: [], ledger, narrar: () => undefined, plano: "max" as const, origem: "arena" as const, tarefaId: id, areas: areasDoTurno(null),
  };
  if (motor !== "aura") {
    await orquestrarTurno({ ...base, env: { ...env, ORQUESTRA: "on", ORQ_MOTOR: motor } });
    return;
  }
  // a Aura: mesma tarefa, com a trilha escrita aqui
  const trilha = criarTrilha({ env });
  trilha.iniciar({ id, origem: "arena", motor: "aura", nomeMotor: "Aura", formato: "unico", intent: p.intent, plano: "max", objetivo: p.objetivo, userId: null, decisao: { motor: "aura", formato: "unico", motivo: "arena", maxSubagentes: 0, prazoMs: 0, verificadorGlobal: false } });
  const t0 = Date.now();
  try {
    const r = await orquestrarTurno({ ...base, env: { ...env, ORQUESTRA: "off" }, deps: { ...deps, emit: (s: any) => { if (s?.kind === "say" && s.label) trilha.evento(String(s.detail ?? "aura"), String(s.label), "Aura"); } } as any });
    const ev = r.answer.evidencia ?? [];
    await trilha.concluir({
      status: "concluida", texto: textoDe(r.answer),
      evidencias: ev.map((e, i) => ({ chave: `E${i + 1}`, claim: e.claim, source: e.source, ferramenta: "harness", agente: "Aura" })),
      relatorio: { ms: Date.now() - t0, evidencias: ev.length, citadas: ev.length, invalidas: 0, subagentes: 0, degradado: !!(r.state as any).degraded, aprovado: null, uso: { promptTokens: 0, completionTokens: 0, chamadas: 0, custoUsd: 0 } },
    });
  } catch (e) {
    await trilha.concluir({ status: "falhou", erro: String((e as Error)?.message ?? e), relatorio: { ms: Date.now() - t0 } });
  }
}

// ───────────────────────────── exportar (dataset de trajetórias) ─────────────────────────────
export const DATASET_TRAJETORIAS = "zaeon-orquestra-trajetorias";

/** PURA: a linha do dataset — SEM userId, SEM e-mail. É o que dá pra treinar/avaliar */
export function linhaDoDataset(l: LinhaTarefa): Record<string, unknown> {
  return {
    id: l.id, criadaEm: new Date(l.criadaEm).toISOString(), origem: l.origem, motor: l.motor, formato: l.formato,
    intent: l.intent, plano: l.plano, pedido: l.objetivo, decisao: l.decisao ?? null, eventos: l.eventos ?? [],
    evidencias: l.evidencias ?? [], texto: l.texto ?? "", status: l.status, metricas: l.relatorio ?? null,
  };
}
