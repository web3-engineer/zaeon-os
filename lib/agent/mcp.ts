/**
 * lib/agent/mcp.ts — PILAR CONECTORES (PASSO 7). Cliente MCP + mapeamento p/ ToolDef.
 *
 * A10 · o handshake (initialize/notifications/initialized/transport) vive SÓ em `connectMcp`,
 * via `@modelcontextprotocol/sdk` (import TARDIO). O resto do código só vê `{listTools, callTool,
 * ping, close}` — quando a spec RC 2026-07-28 mudar o handshake, muda-se 1 função.
 *
 * DOIS CANAIS DE ERRO (não misturar):
 *   (1) resultado com `isError:true` = falha de EXECUÇÃO da tool → `ToolResult{ok:false}` (segue A1;
 *       o modelo reage/contorna).
 *   (2) erro de transporte / JSON-RPC = SAÚDE do conector → `status` + `messageForError` (nunca vira
 *       observação do modelo).
 *
 * ⚠️ O SDK não está instalado neste ambiente e não há servidor MCP p/ smoke-test aqui. As partes
 * PURAS (risco, mapeamento de schema, canais de erro, catálogo, máquina de estados) são testadas;
 * `connectMcp` exige `npm i @modelcontextprotocol/sdk` + um servidor vivo (smoke-test do dono).
 */
import type { FunctionDeclaration } from "@google-cloud/vertexai";
import type { Plan } from "@/lib/plans";
import { registerTool, type ToolDef, type ToolResult, type ToolRisk } from "@/lib/agent/runtime";
import { messageForError, classifyError } from "@/lib/agent/errors";

// ───────────────────────────── tipos ─────────────────────────────
export type McpTransportKind = "http" | "stdio";
export type ConnectorAuthType = "none" | "bearer" | "header";

export type ConnectorConfig = {
  id?: string;
  name: string;                 // slug único do conector (namespaceia as tools)
  transport: McpTransportKind;
  endpoint: string;             // URL (http) OU linha de comando (stdio)
  authType?: ConnectorAuthType;
  authRef?: string;             // NOME da env var com o segredo — NUNCA o segredo (fica fora do Mongo)
  minPlan?: Plan;
};

/** desconectado→verificando→(conectado|precisa_autorizar|erro); degradado = tool sumiu vs cache. */
export type ConnectorStatus = "desconectado" | "verificando" | "conectado" | "precisa_autorizar" | "erro" | "degradado";

export type McpToolInfo = { name: string; description?: string; inputSchema?: any; annotations?: any };
export type ConnectorHealth = {
  status: ConnectorStatus; tools?: McpToolInfo[]; error?: string; checkedAt: string;
  /** F5: quantas tools entraram no registry e quais foram recusadas pela política de risco. */
  admitidas?: number; recusadas?: string[];
  /**
   * F5 · o motivo CRU, pro log de ops e pro smoke-test. O `error` acima passa por `messageForError`
   * e vira frase de aluno ("Tô sem conexão com o núcleo…") — ótimo numa tela, inútil num boot log,
   * onde o dono precisa ler `ECONNREFUSED`. Os dois existem porque têm leitores diferentes.
   */
  motivo?: string;
};

/**
 * ───────── F5 · A POLÍTICA DE RISCO DO MCP NO CHAT: SÓ LEITURA ─────────
 *
 * Por que isto é obrigatório, e não zelo: o `permit()` (lib/agent/runtime) só exige aprovação para
 * `write` quando `execMode === "guiado"`, e o chat roda em `"auto"` (lib/agent/runChatTurn). Então
 * uma tool MCP de escrita entraria no registry e RODARIA sem aprovação, escolhida pelo modelo a
 * partir de uma CONVERSA — que é exatamente o caminho de injeção indireta descrito no advisory do
 * DeepSeek Harness (discussions/3051, ver docs/PLANO_HARNESS_AGENTICO.md §5.1). Com `filesystem` ou
 * `git` no catálogo, isso é escrita no container.
 *
 * LIMITE CONHECIDO, e conservador de propósito: `riskFromAnnotations` devolve `write` quando o
 * servidor não manda hint, então um servidor SEM annotations não contribui tool nenhuma. É melhor
 * que o contrário — e o boot loga o que foi recusado, pra o dono ver em vez de adivinhar.
 *
 * A confiança de verdade está no CATÁLOGO: quem escolhe o servidor é o dono, e um servidor stdio roda
 * como subprocesso do container. Servidor malicioso é problema antes das annotations; a allowlist do
 * catálogo é a fronteira, e esta política é a contenção do que o modelo pode pedir.
 */
export const RISCO_MAXIMO_CHAT: ToolRisk = "read";

const ORDEM_RISCO: Record<ToolRisk, number> = { read: 0, write: 1, destructive: 2 };

/** Separa as tools do servidor entre o que entra no registry e o que é recusado pela política. */
export function toolsAdmitidas(
  tools: readonly McpToolInfo[],
  riscoMaximo: ToolRisk = RISCO_MAXIMO_CHAT,
): { admitidas: McpToolInfo[]; recusadas: string[] } {
  const teto = ORDEM_RISCO[riscoMaximo];
  const admitidas: McpToolInfo[] = [];
  const recusadas: string[] = [];
  for (const t of tools) {
    const risco = riskFromAnnotations(t.annotations);
    if (ORDEM_RISCO[risco] <= teto) admitidas.push(t);
    else recusadas.push(`${t.name} (${risco})`);
  }
  return { admitidas, recusadas };
}

export interface McpClient {
  listTools(): Promise<McpToolInfo[]>;
  callTool(name: string, args: any): Promise<any>;
  ping(): Promise<void>;
  close(): Promise<void>;
}

// ───────────────────────────── helpers puros (testáveis) ─────────────────────────────

/**
 * Annotations do MCP são HINTS NÃO CONFIÁVEIS → default CONSERVADOR: sem hint = `write`
 * (cai no REQUIRE_APPROVAL do permit no modo guiado). destrutivo > write > read.
 */
export function riskFromAnnotations(ann?: { readOnlyHint?: boolean; destructiveHint?: boolean } | null): ToolRisk {
  if (ann?.destructiveHint) return "destructive";
  if (ann?.readOnlyHint) return "read";
  return "write";
}

const GEMINI_TYPE: Record<string, string> = {
  object: "OBJECT", string: "STRING", number: "NUMBER", integer: "INTEGER", boolean: "BOOLEAN", array: "ARRAY",
};
function mapType(t: unknown): string {
  const k = Array.isArray(t) ? String(t[0]) : String(t ?? "string");
  return GEMINI_TYPE[k.toLowerCase()] ?? "STRING";
}

/** JSON Schema (MCP inputSchema) → parameters do FunctionDeclaration (o que o Gemini enxerga). */
export function jsonSchemaToGemini(schema: any): FunctionDeclaration["parameters"] {
  if (!schema || typeof schema !== "object") return { type: "OBJECT" as any, properties: {} };
  const props: Record<string, any> = {};
  for (const [key, v] of Object.entries<any>(schema.properties ?? {})) {
    props[key] = { type: mapType(v?.type) as any, description: typeof v?.description === "string" ? v.description : undefined };
  }
  return { type: "OBJECT" as any, properties: props, required: Array.isArray(schema.required) ? schema.required : [] };
}

function extractMcpText(res: any): string {
  const content = res?.content;
  if (!Array.isArray(content)) return typeof res?.text === "string" ? res.text : "";
  return content.filter((c: any) => c?.type === "text" && typeof c.text === "string").map((c: any) => c.text).join("\n").trim();
}

/**
 * CANAL 1 (execução): mapeia o resultado de `callTool` → ToolResult. `isError:true` = falha da tool
 * (ok:false, vira observação p/ o modelo, A1); senão o conteúdo textual vira um `finding`.
 */
export function mcpResultToToolResult(res: any, toolName: string, connector: string): ToolResult {
  const used = `mcp:${connector}:${toolName}`;
  const text = extractMcpText(res);
  if (res?.isError) {
    return { ok: false, error: text || "erro na execução da tool MCP", code: "tool_error", provenance: { toolsUsed: [used] } };
  }
  return {
    ok: true,
    findings: text ? [{ claim: text.slice(0, 2000), confidence: "média" }] : [],
    provenance: { toolsUsed: [used], at: new Date().toISOString() },
  };
}

/** CANAL 2 (saúde): erro de transporte/JSON-RPC → status do conector. 401/WWW-Authenticate = auth. */
export function classifyConnectorError(msg: string): ConnectorStatus {
  return /401|403|unauthor|forbidden|www-authenticate|invalid.token|precisa.autoriz/i.test(msg) ? "precisa_autorizar" : "erro";
}

/** Uma tool do MCP vira um ToolDef `runtime:"mcp"` — passa pelo mesmo `permit()` das demais. */
export function mcpToolToToolDef(tool: McpToolInfo, connector: ConnectorConfig, callTool: (name: string, args: any) => Promise<any>): ToolDef {
  return {
    name: `mcp:${connector.name}:${tool.name}`,
    runtime: "mcp",
    risk: riskFromAnnotations(tool.annotations),
    minPlan: connector.minPlan ?? "free",
    schema: { name: tool.name, description: tool.description ?? "", parameters: jsonSchemaToGemini(tool.inputSchema) } as FunctionDeclaration,
    async run(args) {
      try {
        return mcpResultToToolResult(await callTool(tool.name, args ?? {}), tool.name, connector.name);
      } catch (e: any) {
        const msg = String(e?.message ?? e);
        return { ok: false, error: msg, code: classifyError(msg), provenance: { toolsUsed: [`mcp:${connector.name}:${tool.name}`] } };
      }
    },
  };
}

// ───────────────────────────── o handshake (A10 — só aqui) ─────────────────────────────
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, r) => setTimeout(() => r(new Error(`mcp timeout (${ms}ms)`)), ms))]);
}

/** Headers de auth a partir do authRef (NOME da env var) — o segredo nunca sai do env/cofre. */
function authHeaders(config: ConnectorConfig): Record<string, string> {
  if (!config.authRef || config.authType === "none" || !config.authType) return {};
  const secret = process.env[config.authRef];
  if (!secret) return {};
  return config.authType === "bearer" ? { Authorization: `Bearer ${secret}` } : { [config.authRef]: secret };
}

/** Abre o cliente MCP (import TARDIO do SDK). Faz initialize + notifications/initialized. */
export async function connectMcp(config: ConnectorConfig, timeoutMs = 10_000): Promise<McpClient> {
  // specifiers tipados como `string` (não-literal) → tsc não tenta resolver o SDK ausente
  // (o dono instala `@modelcontextprotocol/sdk`); os testes injetam `connect`, nunca chegam aqui.
  const clientMod: string = "@modelcontextprotocol/sdk/client/index.js";
  const { Client } = await import(clientMod);
  let transport: any;
  if (config.transport === "http") {
    const httpMod: string = "@modelcontextprotocol/sdk/client/streamableHttp.js";
    const { StreamableHTTPClientTransport } = await import(httpMod);
    transport = new StreamableHTTPClientTransport(new URL(config.endpoint), { requestInit: { headers: authHeaders(config) } });
  } else {
    const stdioMod: string = "@modelcontextprotocol/sdk/client/stdio.js";
    const { StdioClientTransport } = await import(stdioMod);
    const [command, ...args] = config.endpoint.split(/\s+/).filter(Boolean);
    transport = new StdioClientTransport({ command, args });
  }
  const client = new Client({ name: "zaeon-aura", version: "1.0.0" }, { capabilities: {} });
  await withTimeout(client.connect(transport), timeoutMs);
  return {
    listTools: async () => ((await client.listTools())?.tools ?? []) as McpToolInfo[],
    callTool: async (name, args) => client.callTool({ name, arguments: args ?? {} }),
    ping: async () => { await client.ping(); },
    close: async () => { await client.close().catch(() => {}); },
  };
}

export type ConnectFn = (config: ConnectorConfig, timeoutMs?: number) => Promise<McpClient>;

/**
 * "Testar conexão": round-trip REAL (initialize→initialized→tools/list→ping). `connect` é injetável
 * p/ teste. Só o CANAL 2 (saúde) aqui — nunca vira observação do modelo.
 */
export async function testConnection(config: ConnectorConfig, opts?: { connect?: ConnectFn; timeoutMs?: number }): Promise<ConnectorHealth> {
  const checkedAt = new Date().toISOString();
  const connect = opts?.connect ?? connectMcp;
  let client: McpClient | null = null;
  try {
    client = await connect(config, opts?.timeoutMs);
    const tools = await client.listTools();
    await client.ping();
    return { status: "conectado", tools, checkedAt };
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const status = classifyConnectorError(msg);
    return { status, error: messageForError(status === "precisa_autorizar" ? "needs_approval" : msg), motivo: msg.slice(0, 200), checkedAt };
  } finally {
    if (client) await client.close().catch(() => {});
  }
}

/**
 * Conecta e REGISTRA as tools do conector no runtime (cada uma passa pelo permit()). Cada
 * ToolDef abre o cliente por-chamada (stateless; degradação-safe). Devolve a saúde + tools.
 */
export async function registerMcpConnector(
  config: ConnectorConfig,
  opts?: { connect?: ConnectFn; riscoMaximo?: ToolRisk },
): Promise<ConnectorHealth> {
  const connect = opts?.connect ?? connectMcp;
  const health = await testConnection(config, { connect });
  if (health.status !== "conectado" || !health.tools) return health;
  const perCall = async (name: string, args: any) => {
    const client = await connect(config);
    try { return await client.callTool(name, args); } finally { await client.close().catch(() => {}); }
  };
  // A POLÍTICA DE RISCO É APLICADA AQUI, no registro: tool recusada não existe pro permit, não
  // existe pro cardápio da F0 e não existe pro menu da F2 — não é "negada depois", é ausente.
  const { admitidas, recusadas } = toolsAdmitidas(health.tools, opts?.riscoMaximo);
  for (const tool of admitidas) registerTool(mcpToolToToolDef(tool, config, perCall));
  return { ...health, admitidas: admitidas.length, recusadas };
}

/** Compara as tools atuais com o cache → `degradado` se alguma sumiu. */
export function reconcileStatus(current: McpToolInfo[], cached: string[]): ConnectorStatus {
  const now = new Set(current.map((t) => t.name));
  const missing = cached.filter((n) => !now.has(n));
  return missing.length ? "degradado" : "conectado";
}

// ───────────────────────────── catálogo (corrigido pela pesquisa §10.5) ─────────────────────────────
export type CatalogEntry = ConnectorConfig & {
  label: string; note?: string; experimental?: boolean;
  /** o endpoint não existe / não roda nesta imagem — `conectoresPedidos` recusa (ver o catálogo). */
  indisponivel?: boolean;
};

/**
 * ⚠️ AUDITADO DUAS VEZES, e a segunda corrigiu a primeira.
 *
 * **1ª passada (2026-11-03, `npm view`)** — quatro das sete entradas não existiam no npm. Ficaram
 * aqui marcadas com `indisponivel`, em vez de apagadas: a razão de cada uma vale mais que a linha.
 *
 *   • `@oksure/openalex-research-mcp` → **E404** no npm (e era descrita como "1º smoke LOCAL").
 *   • `@modelcontextprotocol/server-fetch` → **não existe** nesse nome. O servidor oficial de fetch
 *     é PYTHON (`mcp-server-fetch`). E, pra nós, é redundante: a F1 já abre página pelo Leitor, que
 *     tem allowlist e confere IP — melhor que um fetch sem política.
 *   • `@modelcontextprotocol/server-git` → **não existe** nesse nome (o oficial é python). É a que
 *     resolveria "clonar um repo", então é a ausência que mais dói — ver a nota no plano.
 *   • `paper-search` → python, e a imagem do web é `node:20-bookworm-slim`, **sem python**.
 *
 * **2ª passada (handshake REAL, SDK 1.32.2 numa sandbox)** — `npm view` prova que o pacote existe,
 * não que o servidor sobe nem que a política de risco deixa alguma tool entrar. Rodando
 * initialize + tools/list de verdade, o veredito da 1ª passada mudou em dois pontos:
 *
 *   • `filesystem` **não sobe como estava configurado aqui**: o endpoint não passava diretório, e o
 *     servidor exige um por argumento ou pelo protocolo de roots (que o nosso `Client` não anuncia).
 *     Ele morre no handshake — `MCP error -32000: Connection closed`. Só um handshake acharia isso,
 *     e é defeito DESTA linha, não do servidor. Marcado `indisponivel` em vez de corrigido porque,
 *     corrigido, ele leria o disco do CONTAINER — que não é a base do aluno e é superfície de risco
 *     sem ganho. Apontar para um diretório útil é decisão de produto, não conserto de catálogo.
 *   • `biomcp` e `scholar` **entregam muito mais do que eu disse**: 40 de 43 e 9 de 10 tools
 *     ADMITIDAS pela política só-leitura. Eu havia escrito no plano que "não entregam capacidade
 *     nenhuma" — estava errado, e o scholar cai exatamente no trilho de fontes/ABNT da série D.
 *
 * A política de risco foi conferida contra servidores reais e se comportou como desenhada: recusou
 * `write_file`, `edit_file`, `move_file`, `create_directory`, `biomcp_configure`, `pdb`, `geo_get` e
 * `ingest_paper_fulltext`, e admitiu só o que tinha `readOnlyHint`.
 *
 * NÃO VERIFICADO: se as chamadas devolvem DADO. Os dois servidores responderam `fetch failed` na
 * sandbox porque o egresso dela recusa `scholar.google.com`, `clinicaltrials.gov` e
 * `api.semanticscholar.org`. Handshake e listagem estão provados; a busca em si, não.
 *
 * `indisponivel` não é cosmético: `conectoresPedidos` (lib/agent/mcp-boot) recusa essas entradas,
 * então pedir uma delas vira um aviso claro no boot em vez de 10 s de handshake condenado.
 */
export const MCP_CATALOG: CatalogEntry[] = [
  { name: "biomcp", label: "BioMCP (med/bio)", transport: "stdio", endpoint: "npx -y biomcp", note: "salas med/bio · npm 1.6.0 ✓ · handshake OK, 40/43 tools admitidas (só-leitura)" },
  { name: "filesystem", label: "Filesystem (oficial)", transport: "stdio", endpoint: "npx -y @modelcontextprotocol/server-filesystem", note: "sobe e morre sem diretório nos args; e leria o disco do container, não a base do aluno", indisponivel: true },
  { name: "scholar", label: "Scholar (experimental)", transport: "stdio", endpoint: "npx -y scholar-mcp", note: "npm 1.2.0 ✓ · handshake OK, 9/10 tools admitidas — busca no Scholar, lista de referências e validação de citação", experimental: true },
  { name: "openalex-research", label: "OpenAlex Research", transport: "stdio", endpoint: "npx -y @oksure/openalex-research-mcp", note: "pacote E404 no npm (2026-11-03)", indisponivel: true },
  { name: "paper-search", label: "Paper Search", transport: "stdio", endpoint: "python -m paper_search_mcp.server", note: "python — a imagem do web não tem", indisponivel: true },
  { name: "fetch", label: "Fetch (oficial)", transport: "stdio", endpoint: "npx -y @modelcontextprotocol/server-fetch", note: "não existe nesse nome (o oficial é python); e o Leitor já faz isso com allowlist", indisponivel: true },
  { name: "git", label: "Git (oficial)", transport: "stdio", endpoint: "npx -y @modelcontextprotocol/server-git", note: "não existe nesse nome (o oficial é python)", indisponivel: true },
  // NÃO incluir synthetic-sciences/openscience — não é servidor MCP (pesquisa §10.5).
];
