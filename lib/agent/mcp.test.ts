import { describe, it, expect, vi } from "vitest";
import {
  riskFromAnnotations,
  jsonSchemaToGemini,
  mcpResultToToolResult,
  classifyConnectorError,
  mcpToolToToolDef,
  testConnection,
  registerMcpConnector,
  reconcileStatus,
  MCP_CATALOG,
  type ConnectorConfig,
  type McpClient,
  type ConnectFn,
  toolsAdmitidas,
  RISCO_MAXIMO_CHAT,
} from "./mcp";
import { getTool, runTool, permit, type ToolContext } from "./runtime";

const cfg: ConnectorConfig = { name: "conn", transport: "http", endpoint: "https://x/mcp" };
const okClient: McpClient = {
  listTools: async () => [{ name: "search", annotations: { readOnlyHint: true } }],
  callTool: async () => ({ content: [{ type: "text", text: "resultado" }] }),
  ping: async () => {},
  close: async () => {},
};
const connectOk: ConnectFn = async () => okClient;

describe("mcp · helpers puros", () => {
  it("riskFromAnnotations: default CONSERVADOR (sem hint = write)", () => {
    expect(riskFromAnnotations(undefined)).toBe("write");
    expect(riskFromAnnotations({ readOnlyHint: true })).toBe("read");
    expect(riskFromAnnotations({ destructiveHint: true })).toBe("destructive");
  });

  it("jsonSchemaToGemini mapeia tipos + required", () => {
    const p: any = jsonSchemaToGemini({ type: "object", properties: { q: { type: "string", description: "d" }, n: { type: "integer" } }, required: ["q"] });
    expect(p.type).toBe("OBJECT");
    expect(p.properties.q.type).toBe("STRING");
    expect(p.properties.n.type).toBe("INTEGER");
    expect(p.required).toEqual(["q"]);
  });

  it("mcpResultToToolResult · CANAL 1: isError → ok:false (tool_error); conteúdo → finding", () => {
    const err = mcpResultToToolResult({ isError: true, content: [{ type: "text", text: "boom" }] }, "t", "c");
    expect(err.ok).toBe(false);
    expect(err.code).toBe("tool_error");
    const ok = mcpResultToToolResult({ content: [{ type: "text", text: "hello" }] }, "t", "c");
    expect(ok.ok).toBe(true);
    expect(ok.findings?.[0].claim).toBe("hello");
  });

  it("classifyConnectorError · CANAL 2: 401 → precisa_autorizar; resto → erro", () => {
    expect(classifyConnectorError("HTTP 401 WWW-Authenticate")).toBe("precisa_autorizar");
    expect(classifyConnectorError("ECONNREFUSED")).toBe("erro");
  });

  it("reconcileStatus: tool sumiu vs cache → degradado", () => {
    expect(reconcileStatus([{ name: "a" }], ["a", "b"])).toBe("degradado");
    expect(reconcileStatus([{ name: "a" }, { name: "b" }], ["a", "b"])).toBe("conectado");
  });
});

describe("mcp · mcpToolToToolDef (passa pelo permit)", () => {
  it("mapeia tool → ToolDef runtime:mcp; run executa via callTool", async () => {
    const callTool = vi.fn(async () => ({ content: [{ type: "text", text: "hello" }] }));
    const def = mcpToolToToolDef(
      { name: "t", annotations: { readOnlyHint: true }, inputSchema: { type: "object", properties: { q: { type: "string" } }, required: ["q"] } },
      cfg,
      callTool,
    );
    expect(def.name).toBe("mcp:conn:t");
    expect(def.runtime).toBe("mcp");
    expect(def.risk).toBe("read");
    // permit: read + auto → ALLOW; write MCP sem hint em guiado → REQUIRE_APPROVAL
    expect(permit(def, { plan: "free", execMode: "auto" } as ToolContext)).toBe("ALLOW");
    const writeDef = mcpToolToToolDef({ name: "w" }, cfg, callTool);
    expect(permit(writeDef, { plan: "free", execMode: "guiado" } as ToolContext)).toBe("REQUIRE_APPROVAL");
    const r = await def.run({ q: "x" }, {} as ToolContext);
    expect(r.ok).toBe(true);
    expect(r.findings?.[0].claim).toBe("hello");
  });

  it("run com callTool que estoura → ok:false (não lança)", async () => {
    const def = mcpToolToToolDef({ name: "t" }, cfg, async () => { throw new Error("boom"); });
    const r = await def.run({}, {} as ToolContext);
    expect(r.ok).toBe(false);
  });
});

describe("mcp · testConnection (round-trip, connect injetado)", () => {
  it("sucesso → conectado + tools", async () => {
    const h = await testConnection(cfg, { connect: connectOk });
    expect(h.status).toBe("conectado");
    expect(h.tools?.[0].name).toBe("search");
  });
  it("401/WWW-Authenticate → precisa_autorizar", async () => {
    const h = await testConnection(cfg, { connect: async () => { throw new Error("HTTP 401 Unauthorized"); } });
    expect(h.status).toBe("precisa_autorizar");
    expect(h.error).toBeTruthy();
  });
  it("servidor fora do ar → erro com mensagem (messageForError)", async () => {
    const h = await testConnection(cfg, { connect: async () => { throw new Error("ECONNREFUSED connect"); } });
    expect(h.status).toBe("erro");
    expect(h.error).toBeTruthy();
  });
});

describe("mcp · registerMcpConnector (tools entram no runtime + permit)", () => {
  it("registra as tools; rodam pela trajetória via runTool", async () => {
    const cfg2: ConnectorConfig = { name: "openalex-research", transport: "stdio", endpoint: "npx -y @oksure/openalex-research-mcp" };
    const health = await registerMcpConnector(cfg2, { connect: connectOk });
    expect(health.status).toBe("conectado");
    const def = getTool("mcp:openalex-research:search");
    expect(def).toBeTruthy();
    expect(def!.runtime).toBe("mcp");
    const res = await runTool(def!, {}, { plan: "free", execMode: "auto" } as ToolContext);
    expect(res.ok).toBe(true);
    expect(res.findings?.[0].claim).toBe("resultado");
  });
});

describe("mcp · catálogo (corrigido §10.5)", () => {
  it("tem openalex-research local (npx) e NÃO tem openscience", () => {
    const names = MCP_CATALOG.map((c) => c.name);
    expect(names).toContain("openalex-research");
    expect(MCP_CATALOG.find((c) => c.name === "openalex-research")?.endpoint).toMatch(/npx/);
    expect(names.some((n) => /openscience/i.test(n))).toBe(false);
    expect(MCP_CATALOG.find((c) => c.name === "scholar")?.experimental).toBe(true);
  });
});

describe("mcp · F5 · a política de risco (toolsAdmitidas)", () => {
  it("só LEITURA entra; sem hint (= write) e destrutivo ficam de fora, com o motivo", () => {
    const { admitidas, recusadas } = toolsAdmitidas([
      { name: "ler", annotations: { readOnlyHint: true } },
      { name: "escrever", annotations: {} },
      { name: "apagar", annotations: { destructiveHint: true } },
    ]);
    expect(admitidas.map((t) => t.name)).toEqual(["ler"]);
    expect(recusadas).toEqual(["escrever (write)", "apagar (destructive)"]);
  });

  it("servidor SEM annotations não contribui tool nenhuma — conservador de propósito", () => {
    const r = toolsAdmitidas([{ name: "a" }, { name: "b" }]);
    expect(r.admitidas).toEqual([]);
    expect(r.recusadas).toHaveLength(2);
  });

  it("o teto é parametrizável (mas o do chat é `read`)", () => {
    expect(RISCO_MAXIMO_CHAT).toBe("read");
    expect(toolsAdmitidas([{ name: "escrever", annotations: {} }], "write").admitidas).toHaveLength(1);
    expect(toolsAdmitidas([{ name: "apagar", annotations: { destructiveHint: true } }], "write").admitidas).toHaveLength(0);
  });

  it("registerMcpConnector NÃO registra o que a política recusa (ausente, não 'negado depois')", async () => {
    const cliente: McpClient = {
      listTools: async () => [{ name: "ok", annotations: { readOnlyHint: true } }, { name: "ruim", annotations: {} }],
      callTool: async () => ({ content: [] }), ping: async () => {}, close: async () => {},
    };
    const h = await registerMcpConnector({ name: "politica", transport: "http", endpoint: "https://x/mcp" }, { connect: async () => cliente });
    expect(h.admitidas).toBe(1);
    expect(h.recusadas).toEqual(["ruim (write)"]);
    expect(getTool("mcp:politica:ok")).toBeTruthy();
    expect(getTool("mcp:politica:ruim")).toBeUndefined();
  });
});
