/**
 * lib/agent/runtime.ts — PR03 do runbook (§13.1; encarna §11.2). O RUNTIME das tools.
 *
 * ToolDef / ToolResult / runTool + o middleware permit() (DENY-BY-DEFAULT). Ponto ÚNICO de
 * gating: risco × plano (minPlan) × GPU-por-demanda × execMode. `runTool` NUNCA lança — tool
 * que estoura/nega/expira vira `{ok:false,error,code}`. Registra as tools da Fase 0 como ToolDef
 * (`studio_generate`, `research_generate`, `literature_search` real via lib/scholar) + stubs
 * (`memory_search` free, `examiner`). Tipos ricos: importe de contracts.ts; NÃO reinvente.
 */
import type { FunctionDeclaration } from "@google-cloud/vertexai";
import type { AgentContext } from "@/lib/agent/context";
import type { ExecMode, Source, StudioRef, ProvenanceRecord } from "@/lib/agent/contracts";
import type { Plan } from "@/lib/plans";
import {
  studioGenerateTool,
  researchGenerateTool,
  normalizeStudioKind,
  studioLabel,
  researchWorkType,
} from "@/lib/agent/tools";

// ───────────────────────────── contratos do runtime (§11.2) ─────────────────────────────
export type ToolRuntime = "ts" | "python" | "mcp";
export type ToolRisk = "read" | "write" | "destructive";

/** Um achado de tool — com fonte sempre que possível (§8). */
export type Finding = { claim: string; source?: Source; confidence: "alta" | "média" | "baixa" };

/** Resultado normalizado de TODA tool. `code` (aditivo) alimenta a taxonomia de erro (A1/A2). */
export type ToolResult = {
  ok: boolean;
  /** book_search: os livros achados (vão inteiros pra resposta — a lista é do código, não do modelo). */
  livros?: import("@/lib/livros/busca").LivroAchado[];
  findings?: Finding[];
  artifact?: StudioRef;
  error?: string;
  code?: string;
  provenance: Partial<ProvenanceRecord>;
};

/** O contexto que o runtime enxerga: world-state + os campos de gating (plano/execMode/curso/GPU). */
export type ToolContext = AgentContext & {
  userId?: string;      // dono do turno — memory_search FILTRA por isto (nunca cruza usuários)
  /** #562: de quem é a memória que o memory_search pode ler, quando não é a do dono do turno (Escritório em grupo = o escritório). */
  memoriaDe?: string;
  plan?: Plan;
  execMode?: ExecMode;
  courseTags?: string[];
  gpuAvailable?: boolean;
  /** Modo da tarefa (Octa Code, §2 do pack). `review`/`answer` = só leitura; ausente = comportamento antigo. */
  taskMode?: TaskMode;
};

/** `review`/`answer` não podem mutar nada; `change` pode (sujeito ao resto do permit e ao file-lock do Octa). */
export type TaskMode = "review" | "answer" | "change";
export function isReadOnlyMode(mode: TaskMode | undefined): boolean {
  return mode === "review" || mode === "answer";
}

export interface ToolDef {
  name: string;
  runtime: ToolRuntime;
  risk: ToolRisk;
  minPlan: Plan;
  demandGpu?: boolean;
  schema: FunctionDeclaration; // o que o Gemini (function-calling) enxerga
  /** Teto próprio (ms); sem ele vale o default do runtime. Busca em 4–5 bases precisa de mais que 20s. */
  timeoutMs?: number;
  run(args: any, ctx: ToolContext): Promise<ToolResult>;
}

export type Gate = "ALLOW" | "DENY" | "REQUIRE_APPROVAL";
export type ApproveFn = (def: ToolDef, args: any, ctx: ToolContext) => Promise<boolean>;

// ───────────────────────────── helpers ─────────────────────────────
const PLAN_ORDER: Plan[] = ["free", "plus", "pro", "max"];
/** true se `plan` alcança `min` (free<plus<pro<max). Substitui o `planRank` citado no §9.10. */
export function planAtLeast(plan: Plan | undefined, min: Plan): boolean {
  return PLAN_ORDER.indexOf(plan ?? "free") >= PLAN_ORDER.indexOf(min);
}

/** normaliza um erro em ToolResult (NUNCA lança). */
export function err(error: string, code?: string): ToolResult {
  return { ok: false, error, code, provenance: {} };
}

const TIMEOUT_MS: Record<ToolRuntime, number> = { ts: 20_000, python: 60_000, mcp: 30_000 };
async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, reject) => { timer=setTimeout(() => reject(new Error(`tool timeout (${ms}ms)`)), ms); }),
    ]);
  } finally { clearTimeout(timer); }
}

// ───────────────────────────── permissão (deny-by-default, §11.2) ─────────────────────────────
/**
 * Decisão determinística ANTES de rodar: risco × plano × modo da tarefa × GPU × execMode.
 * Deny-by-default: plano insuficiente = DENY; destrutivo ou GPU-por-demanda = REQUIRE_APPROVAL;
 * em `guiado`, `write` sobe pra aprovação; leitura/geração em `auto` = ALLOW.
 */
export function permit(def: ToolDef, ctx: ToolContext): Gate {
  if (!planAtLeast(ctx.plan, def.minPlan)) return "DENY";
  if (isReadOnlyMode(ctx.taskMode) && def.risk !== "read") return "DENY"; // modo leitura nunca escreve
  if (def.demandGpu && !ctx.gpuAvailable) return "REQUIRE_APPROVAL"; // T3 sob demanda
  if (def.risk === "destructive") return "REQUIRE_APPROVAL";
  if (ctx.execMode === "guiado" && def.risk === "write") return "REQUIRE_APPROVAL";
  return "ALLOW";
}

// ───────────────────────────── execução (nunca lança, §11.2) ─────────────────────────────
export async function runTool(
  def: ToolDef,
  args: any,
  ctx: ToolContext,
  opts?: { approve?: ApproveFn },
): Promise<ToolResult> {
  try {
    const gate = permit(def, ctx);
    if (gate === "DENY") return err("permissão negada", "tool_denied");
    if (gate === "REQUIRE_APPROVAL") {
      const ok = opts?.approve ? await opts.approve(def, args, ctx).catch(() => false) : false;
      if (!ok) return err("aprovação necessária", "needs_approval");
    }
    const res = await withTimeout(def.run(args, ctx), def.timeoutMs ?? TIMEOUT_MS[def.runtime] ?? 20_000);
    if (!res || typeof res.ok !== "boolean") return err("resultado inválido da tool", "bad_tool_result");
    if (!res.provenance) res.provenance = {};
    return res;
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    return err(msg, /timeout/i.test(msg) ? "tool_timeout" : "tool_error");
  }
}

// ───────────────────────────── registry ─────────────────────────────
const REGISTRY = new Map<string, ToolDef>();
export function registerTool(def: ToolDef): void { REGISTRY.set(def.name, def); }
export function getTool(name: string): ToolDef | undefined { return REGISTRY.get(name); }
export function listTools(): ToolDef[] { return [...REGISTRY.values()]; }

/** Executa por nome (o que o laço chama). Tool desconhecida = DENY silencioso (deny-by-default). */
export async function runToolByName(
  name: string,
  args: any,
  ctx: ToolContext,
  opts?: { approve?: ApproveFn },
): Promise<ToolResult> {
  const def = getTool(name);
  if (!def) return err(`tool desconhecida: ${name}`, "unknown_tool");
  return runTool(def, args, ctx, opts);
}

// ───────────────────────────── ToolDefs — Fase 0 + stubs ─────────────────────────────
const nowIso = () => new Date().toISOString();

/** studio_generate — client-orchestrated: normaliza o pedido num StudioRef (o cliente executa). */
export const studioGenerateDef: ToolDef = {
  name: "studio_generate",
  runtime: "ts",
  risk: "write",
  minPlan: "free",
  schema: studioGenerateTool,
  async run(args, ctx) {
    const kind = normalizeStudioKind(String(args?.kind ?? ""));
    const topic = String(args?.topic ?? ctx.currentGoal ?? "").trim();
    return {
      ok: true,
      artifact: { studioKind: kind, title: topic ? `${studioLabel(kind)}: ${topic}` : studioLabel(kind) },
      provenance: { toolsUsed: ["studio_generate"], at: nowIso() },
    };
  },
};

/** research_generate — idem, para o TRABALHO da Sala de Pesquisa. */
export const researchGenerateDef: ToolDef = {
  name: "research_generate",
  runtime: "ts",
  risk: "write",
  minPlan: "free",
  schema: researchGenerateTool,
  async run(args, ctx) {
    const kind = String(args?.kind ?? "artigo").trim().toLowerCase();
    const topic = String(args?.topic ?? ctx.currentGoal ?? "").trim();
    if (!topic) return err("tema do trabalho ausente", "missing_topic");
    return {
      ok: true,
      artifact: { studioKind: `research:${kind}`, title: `${researchWorkType(kind)}: ${topic}` },
      provenance: { toolsUsed: ["research_generate"], at: nowIso() },
    };
  },
};

const stubSchema = (name: string, description: string, withQuery = true): FunctionDeclaration => ({
  name,
  description,
  parameters: {
    type: "OBJECT" as any,
    properties: withQuery ? { query: { type: "STRING" as any, description: "o que buscar/recuperar" } } : {},
    required: withQuery ? ["query"] : [],
  },
});

/** memory_search — STUB até o PR-M3 (PASSO 5). Memória = free (NUNCA gateia por plano). */
export const memorySearchDef: ToolDef = {
  name: "memory_search",
  runtime: "ts",
  risk: "read",
  minPlan: "free",
  schema: stubSchema("memory_search", "Busca na memória de longo prazo do usuário (recall semântico verbatim)."),
  async run(args, ctx) {
    const memUnavailable: ToolResult = { ok: false, error: "memória de longo prazo indisponível", code: "memory_unavailable", provenance: {} };
    // #562: no Escritório, a memória do turno pode não ser a de quem mandou (em grupo é a do próprio escritório)
    const userId = ctx.memoriaDe ?? ctx.userId;
    const query = String(args?.query ?? "").trim();
    if (!userId || !query) return memUnavailable; // sem dono/consulta → degrada (nunca cruza usuários)
    try {
      const { getMemory, isMemoryConfigured } = await import("@/lib/agent/memory-provider");
      if (!isMemoryConfigured()) return memUnavailable; // L3 não ligado → degrada limpo
      const hits = await getMemory().search(query, { userId }, 8); // recall SEM LLM, filtrado por userId
      const findings: Finding[] = hits.map((h) => ({
        claim: h.text,
        source: (h.meta as any)?.source,
        confidence: "média",
      }));
      return { ok: true, findings, provenance: { toolsUsed: ["memory_search"], at: nowIso() } };
    } catch {
      return memUnavailable;
    }
  },
};

/**
 * literature_search — busca REAL de literatura acadêmica. Antes era um stub ("skill_offline") e a
 * Aura respondia "a busca não pôde ser utilizada"; a busca já existia e é gratuita:
 * lib/scholar/retrieve.ts agrega OpenAlex, Crossref, arXiv, PubMed (sem API key) + Semantic Scholar
 * (key opcional) — é a mesma da Sala de Pesquisa (/api/ai/scholar). Roda em TS no Node; nada de Python.
 * Cada paper vira um Finding com fonte (título/url/autores/ano) pro harness citar.
 */
export const LITERATURE_MAX = 10;
export function papersToFindings(papers: Array<{ title: string; authors?: string[]; year?: number; url?: string; doi?: string; abstract?: string; sources?: string[]; citationCount?: number }>, max = LITERATURE_MAX): Finding[] {
  return papers.slice(0, max).map((p) => {
    const url = p.url || (p.doi ? `https://doi.org/${p.doi}` : undefined);
    const resumo = (p.abstract || "").replace(/\s+/g, " ").trim().slice(0, 240);
    const n = p.sources?.length ?? 1;
    return {
      claim: `${p.title}${p.year ? ` (${p.year})` : ""}${resumo ? ` — ${resumo}${resumo.length >= 240 ? "…" : ""}` : ""}`,
      source: { title: p.title, ...(url ? { url } : {}), ...(p.authors?.length ? { authors: p.authors.slice(0, 4).join(", ") } : {}), ...(p.year ? { year: p.year } : {}) },
      // corroborado por ≥2 bases ou muito citado = alta; 1 base = média
      confidence: n >= 2 || (p.citationCount ?? 0) >= 50 ? "alta" : "média",
    };
  });
}

/** prazo por fonte acadêmica no chat (env LITERATURA_PRAZO_FONTE_MS) — openalex/arxiv/crossref/pubmed: 0,15–0,96 s em prod */
const PRAZO_FONTE_CHAT_MS = Number(process.env.LITERATURA_PRAZO_FONTE_MS || 2500);

export const literatureSearchDef: ToolDef = {
  name: "literature_search",
  runtime: "ts",
  risk: "read",
  minPlan: "free",
  timeoutMs: 45_000,
  schema: {
    name: "literature_search",
    description: "Busca literatura acadêmica real (OpenAlex, Crossref, arXiv, PubMed, Semantic Scholar) e devolve papers com título, ano, autores e link para citar.",
    parameters: {
      type: "OBJECT" as any,
      properties: {
        query: { type: "STRING" as any, description: "tema/pergunta de pesquisa (de preferência em inglês, como aparece nos papers)" },
        domain: { type: "STRING" as any, description: "área (cs, med, bio, phys, eng…) — escolhe as bases prioritárias" },
      },
      required: ["query"],
    },
  },
  async run(args) {
    const query = String(args?.query ?? "").trim();
    if (!query) return { ok: false, error: "consulta vazia", code: "bad_args", provenance: {} };
    const domain = typeof args?.domain === "string" ? args.domain : undefined;
    try {
      const { retrievePapers } = await import("@/lib/scholar/retrieve");
      // prazo curto por fonte: no chat a resposta não espera fonte lenta (as boas respondem em < 1 s, medido em prod)
      const r = await retrievePapers(query, { domain, minResults: 6, prazoFonteMs: PRAZO_FONTE_CHAT_MS });
      if (!r.papers.length) {
        // Bases acadêmicas vazias NÃO é beco: tenta a internet (se houver provedor). Os achados vêm como
        // fonte web — o draft deve dizer (1 linha) que não são fontes acadêmicas indexadas.
        const w = await buscarNaWeb(query);
        if (w.ok) return w;
        return { ok: false, error: "nenhum paper encontrado para a consulta", code: "no_results", provenance: { toolsUsed: ["literature_search"], at: nowIso() } };
      }
      const findings = papersToFindings(r.papers);
      return {
        ok: true, findings,
        provenance: { toolsUsed: ["literature_search"], at: nowIso(), sources: findings.map((f) => f.source!).filter(Boolean) },
      };
    } catch (e: any) {
      return { ok: false, error: `busca de literatura falhou: ${e?.message ?? e}`, code: "skill_error", provenance: {} };
    }
  },
};

/** Busca web → ToolResult (Findings com fonte web). Usada pelo `web_search` e como fallback do `literature_search`. */
async function buscarNaWeb(query: string): Promise<ToolResult> {
  const { webSearch } = await import("@/lib/search/web");
  const w = await webSearch(query);
  if (!w.ok) return { ok: false, error: w.error, code: w.code, provenance: { toolsUsed: ["web_search"], at: nowIso() } };
  const findings: Finding[] = w.results.map((r) => ({ claim: `${r.title}${r.snippet ? ` — ${r.snippet}` : ""}`, source: { title: r.title, url: r.url }, confidence: "baixa" as const }));
  return { ok: true, findings, provenance: { toolsUsed: ["web_search"], at: nowIso(), sources: findings.map((f) => f.source!) } };
}

/**
 * web_search — busca na INTERNET geral (SearXNG self-hosted, ou Tavily/Brave). Pra temas que as bases
 * acadêmicas não cobrem e perguntas atuais/gerais. Sem provedor configurado → `web_unavailable` (o
 * harness contorna: responde pelo conhecimento do modelo — nunca beco).
 */
export const webSearchDef: ToolDef = {
  name: "web_search",
  runtime: "ts",
  risk: "read",
  minPlan: "free",
  timeoutMs: 20_000,
  schema: stubSchema("web_search", "Busca na internet (resultados web com título, trecho e link) — para temas fora das bases acadêmicas ou assuntos atuais/gerais."),
  async run(args) {
    const query = String(args?.query ?? "").trim();
    if (!query) return { ok: false, error: "consulta vazia", code: "bad_args", provenance: {} };
    return buscarNaWeb(query);
  },
};

/** examiner — STUB até o PR05 (o crítico ScholarEval). */
export const examinerDef: ToolDef = {
  name: "examiner",
  runtime: "ts",
  risk: "read",
  minPlan: "free",
  schema: stubSchema("examiner", "Avalia um rascunho (ScholarEval) e devolve um veredito com issues.", false),
  async run() {
    return { ok: false, error: "examiner ainda não implementado", code: "not_implemented", provenance: {} };
  },
};

// Registra a Fase 0 + stubs no boot do módulo.
/**
 * book_search — acha um LIVRO e o caminho LEGAL até ele (lib/livros/busca): OpenStax, Project Gutenberg,
 * Open Library/Internet Archive e Google Books. PDF só quando é livre de verdade; com direito autoral,
 * empréstimo digital/prévia/página. Nunca biblioteca-sombra.
 */
export const bookSearchDef: ToolDef = {
  name: "book_search",
  runtime: "ts",
  risk: "read",
  minPlan: "free",
  timeoutMs: 25_000,
  schema: {
    name: "book_search",
    description: "Procura um livro (título/autor) em acervos abertos e devolve onde ler/baixar legalmente: PDF livre, leitura online, empréstimo digital ou prévia.",
    parameters: { type: "OBJECT" as any, properties: { query: { type: "STRING" as any, description: "o pedido do usuário ou título + autor" } }, required: ["query"] },
  },
  async run(args) {
    const query = String(args?.query ?? "").trim();
    if (!query) return { ok: false, error: "consulta vazia", code: "bad_args", provenance: {} };
    try {
      const { buscarLivros, ROTULO_ACESSO } = await import("@/lib/livros/busca");
      const r = await buscarLivros(query);
      if (!r.livros.length) {
        const fora = r.falhas.length === r.consultadas.length;
        return { ok: false, error: fora ? "acervos fora do ar" : "nenhum livro encontrado", code: fora ? "network" : "no_results", provenance: { toolsUsed: ["book_search"], at: nowIso() } };
      }
      const findings = r.livros.map((l) => ({
        claim: `${l.titulo}${l.autores.length ? ` — ${l.autores.slice(0, 2).join(", ")}` : ""}${l.ano ? ` (${l.ano})` : ""}: ${ROTULO_ACESSO[l.acesso]}`,
        source: { title: l.titulo, url: l.pdfUrl ?? l.lerUrl ?? l.paginaUrl },
        confidence: "alta" as const,
      }));
      return { ok: true, findings, livros: r.livros, provenance: { toolsUsed: ["book_search"], at: nowIso(), sources: findings.map((f) => f.source) } };
    } catch (e: any) {
      return { ok: false, error: `busca de livros falhou: ${e?.message ?? e}`, code: "skill_error", provenance: {} };
    }
  },
};

[studioGenerateDef, researchGenerateDef, memorySearchDef, literatureSearchDef, webSearchDef, examinerDef, bookSearchDef].forEach(registerTool);
