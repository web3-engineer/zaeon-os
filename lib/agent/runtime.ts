/**
 * lib/agent/runtime.ts — PR03 do runbook (§13.1; encarna §11.2). O RUNTIME das tools.
 *
 * ToolDef / ToolResult / runTool + o middleware permit() (DENY-BY-DEFAULT). Ponto ÚNICO de
 * gating: risco × plano (minPlan) × GPU-por-demanda × execMode. `runTool` NUNCA lança — tool
 * que estoura/nega/expira vira `{ok:false,error,code}`. Registra as tools da Fase 0 como ToolDef
 * (`studio_generate`, `research_generate`, `literature_search` real via lib/scholar) + stub
 * (`memory_search` free). Tipos ricos: importe de contracts.ts; NÃO reinvente.
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
// `toolsWeb` importa SÓ TIPOS daqui de volta (apagados na compilação), então não há ciclo.
import { abrirUrlDef, baixarParaBaseDef } from "@/lib/agent/toolsWeb";
import { TOOLS_BASICAS } from "@/lib/agent/toolsBasicas";
import { descreverImagemDef, visaoNoHarnessLigado } from "@/lib/agent/toolsVisao";
import { visaoDisponivel } from "@/lib/ai/descreverImagem";
import { lerAnexoDef, listarAnexosDef } from "@/lib/agent/toolsAnexo";

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
  /**
   * AS TOOLS QUE A AGENTE DESTE TURNO PODE USAR (lib/agents/capacidades: base + habilidades).
   *
   * Por que um CONJUNTO DE NOMES e não a lista de habilidades: o runtime não precisa conhecer o
   * vocabulário de agentes pra negar uma tool, e não conhecê-lo é o que o mantém testável sem
   * importar meio app. Quem traduz habilidade → nomes é `toolsPermitidas`, do lado de lá.
   *
   * AUSENTE = SEM PORTÃO (o comportamento de antes, byte a byte). Isto é deliberado: `ToolContext` é
   * o mesmo do Octa, do canal, do MCP e do rea-eval, e um portão que negasse por omissão derrubaria
   * todos eles. O turno do chat SEMPRE manda o conjunto — então pro chat é portão de verdade, e foi
   * pra isso que ele nasceu: `enabledSkills` era um RÓTULO, lido só por lib/office/mapa.ts e pelas
   * rotas de mentores, sem efeito nenhum sobre que tool o modelo recebia.
   */
  toolsDoAgente?: ReadonlySet<string>;
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
  /**
   * F3 · A tool existe NESTE TURNO? Diferente de registro condicional, que é CONFIGURAÇÃO decidida
   * no boot (`abrir_url` depende do Leitor): `ler_anexo` depende de haver anexo nesta conversa, o
   * que muda a cada turno. Ausente = sempre disponível. O `permit()` consulta, e com isso o cardápio
   * da F0 e o menu da F2 param de anunciar capacidade que este turno não tem.
   */
  disponivelNoTurno?(ctx: ToolContext): boolean;
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
  // F3: indisponível NESTE turno é DENY (a tool existe, mas não há o que ela leria)
  if (def.disponivelNoTurno && !def.disponivelNoTurno(ctx)) return "DENY";
  // A agente deste turno tem esta habilidade? Antes do plano: habilidade que ela não tem não é
  // "upgrade", é outra agente. Conjunto ausente = sem portão (ver ToolContext.toolsDoAgente).
  if (ctx.toolsDoAgente && !ctx.toolsDoAgente.has(def.name)) return "DENY";
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
/**
 * NO globalThis, não numa variável do módulo — e isto é correção de um defeito real, não estilo.
 *
 * O registry é estado DO PROCESSO. Com `const REGISTRY = new Map()`, ele é estado do MÓDULO, e o
 * webpack do Next dá ao `instrumentation` o seu próprio exemplar deste arquivo (é o mesmo motivo que
 * `lib/agent/memory-provider.ts` já documenta desde o L3). Consequência: **uma tool registrada no
 * boot ficava invisível para a rota do chat.**
 *
 * As tools do Leitor nunca sofreram disso, e foi por acidente: `registrarAbrirUrl()` roda no
 * CARREGAMENTO do módulo, então cada cópia registra a sua e todas parecem certas. A única tool que
 * entra pelo boot é a do MCP (`registerMcpConnector`) — e era justamente a que não chegava.
 */
const g = globalThis as unknown as { __zaeonToolRegistry?: Map<string, ToolDef> };
const REGISTRY: Map<string, ToolDef> = (g.__zaeonToolRegistry ??= new Map<string, ToolDef>());
export function registerTool(def: ToolDef): void { REGISTRY.set(def.name, def); }
export function getTool(name: string): ToolDef | undefined { return REGISTRY.get(name); }
export function listTools(): ToolDef[] { return [...REGISTRY.values()]; }

/**
 * As tools que valem PARA ESTE TURNO. É esta lista — não `listTools()` — que alimenta o cardápio da
 * F0 e o menu da F2: anunciar `ler_anexo` num turno sem anexo seria prometer o que não dá pra fazer,
 * que é exatamente o que a F0 existe pra impedir.
 */
export function toolsDoTurno(ctx: ToolContext): ToolDef[] {
  return listTools().filter((d) => {
    if (d.disponivelNoTurno && !d.disponivelNoTurno(ctx)) return false;
    // o cardápio tem que bater com o portão: anunciar tool que o `permit` vai negar por habilidade
    // é a mesma mentira da F0 por outra porta (prometer o que este turno não faz).
    if (ctx.toolsDoAgente && !ctx.toolsDoAgente.has(d.name)) return false;
    return true;
  });
}

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

[studioGenerateDef, researchGenerateDef, memorySearchDef, literatureSearchDef, webSearchDef, bookSearchDef].forEach(registerTool);

/**
 * `abrir_url` (F1) é CONDICIONAL: só entra no registry quando o Leitor está configurado
 * (`LEITOR_PROXY_URL`). O motivo não é economia — é a F0.
 *
 * O cardápio de capacidades que vai no prompt é DERIVADO deste registry
 * (lib/agent/capacidades). Uma tool registrada que devolvesse "leitor_offline" em toda chamada
 * faria o cardápio anunciar "a plataforma abre endereços da web" — e a Aura voltaria a prometer
 * uma ação que não acontece, que é exatamente o que a F0 consertou, só por outro caminho.
 * Sem Leitor, a classe `abrir_pagina` continua no "NÃO executa" e a resposta oferece o caminho real.
 */
export function registrarAbrirUrl(env: Record<string, string | undefined> = process.env): boolean {
  // URL **E** allowlist. Só a URL não basta: com `LEITOR_ALLOW` vazia o Leitor nega TODO domínio,
  // então a tool existiria e falharia em 100% das chamadas — e o cardápio da F0, que é derivado do
  // registry, anunciaria "abro endereços da web". É a mentira da F0 por outra porta.
  if (!env.LEITOR_PROXY_URL?.trim() || !env.LEITOR_ALLOW?.trim()) return false;
  registerTool(abrirUrlDef);
  return true;
}
registrarAbrirUrl();

/**
 * `baixar_para_base` (F1b) precisa de DUAS coisas de pé, e por isso checa as duas: o Leitor (de onde
 * vêm os bytes) e `RAG_PG_URL` (a base onde eles param — `ragPg()` LANÇA sem ela). Faltando
 * qualquer uma, a tool não entra e o cardápio da F0 segue dizendo que a casa não baixa arquivo.
 * Metade da infra de pé anunciaria uma capacidade que falha em toda chamada.
 */
export function registrarBaixarParaBase(env: Record<string, string | undefined> = process.env): boolean {
  if (!env.LEITOR_PROXY_URL?.trim() || !env.LEITOR_ALLOW?.trim() || !env.RAG_PG_URL?.trim()) return false;
  registerTool(baixarParaBaseDef);
  return true;
}
registrarBaixarParaBase();

// Anexo (F3): registradas SEMPRE — quem decide é `disponivelNoTurno`, não o boot. Não há
// configuração pra depender: ou a conversa tem arquivo, ou não tem.
[listarAnexosDef, lerAnexoDef].forEach(registerTool);

// Básicas do dia a dia (calcular/converter/data_hora): PURAS — zero rede, zero configuração de
// servidor de que dependam, então registradas SEM condição, como as demais tools de raciocínio.
// É o kit que todo assistente sério tem e que o harness não tinha; entram em TOOLS_BASE (capacidades).
TOOLS_BASICAS.forEach(registerTool);

/**
 * `descrever_imagem` (be my eyes) é CONDICIONAL a DUAS coisas: a credencial Vertex (sem ela a visão
 * não chama) E a flag `VISAO_HARNESS`, que liga o roteamento de imagem pro harness no hot-path do
 * chat. Flag off → a imagem segue no multimodal legado e esta tool nem se registra, então o cardápio
 * não promete "eu vejo" por um caminho que não existe ainda: prod fica byte-a-byte igual ao de hoje.
 * `disponivelNoTurno` ainda decide por-turno (só há tool quando há imagem), como o anexo da F3.
 */
export function registrarDescreverImagem(env: Record<string, string | undefined> = process.env): boolean {
  if (!visaoDisponivel(env) || !visaoNoHarnessLigado(env)) return false;
  registerTool(descreverImagemDef);
  return true;
}
registrarDescreverImagem();
