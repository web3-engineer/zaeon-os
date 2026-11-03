import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ENV_CONECTORES,
  _zerarEstadoMcp,
  conectoresPedidos,
  estadoMcp,
  ligarMcp,
  mcpLigado,
  resumoMcp,
  sdkPresente,
} from "@/lib/agent/mcp-boot";
import { MCP_CATALOG, type ConnectFn, type McpClient, type McpToolInfo } from "@/lib/agent/mcp";
import { getTool } from "@/lib/agent/runtime";

/** cliente de teste: a lista de tools é o que o "servidor" anuncia. */
const clienteCom = (tools: McpToolInfo[]): McpClient => ({
  listTools: async () => tools,
  callTool: async () => ({ content: [{ type: "text", text: "ok" }] }),
  ping: async () => {},
  close: async () => {},
});
const conectaCom = (tools: McpToolInfo[]): ConnectFn => async () => clienteCom(tools);
const soLeitura = [{ name: "ler", annotations: { readOnlyHint: true } }];

beforeEach(() => _zerarEstadoMcp());

describe("mcpLigado · a flag é a própria lista", () => {
  it("sem conector pedido não há MCP", () => {
    expect(mcpLigado({})).toBe(false);
    expect(mcpLigado({ [ENV_CONECTORES]: "" })).toBe(false);
    expect(mcpLigado({ [ENV_CONECTORES]: "   " })).toBe(false);
  });
  it("com conector pedido, liga", () => {
    expect(mcpLigado({ [ENV_CONECTORES]: "fetch" })).toBe(true);
  });
});

describe("conectoresPedidos · SÓ pelo catálogo", () => {
  it("resolve os nomes do catálogo, sem ligar a maiúscula", () => {
    const { escolhidos, desconhecidos } = conectoresPedidos({ [ENV_CONECTORES]: " FETCH , git " });
    expect(escolhidos.map((c) => c.name)).toEqual(["fetch", "git"]);
    expect(desconhecidos).toEqual([]);
  });

  it("endpoint arbitrário NÃO entra — nome fora do catálogo é recusado e reportado", () => {
    // dar ao modelo uma superfície que ninguém revisou é o que isto impede
    const { escolhidos, desconhecidos } = conectoresPedidos({ [ENV_CONECTORES]: "fetch,https://evil.com/mcp,inventado" });
    expect(escolhidos.map((c) => c.name)).toEqual(["fetch"]);
    expect(desconhecidos).toEqual(["https://evil.com/mcp", "inventado"]);
  });

  it("nome repetido vale uma vez", () => {
    expect(conectoresPedidos({ [ENV_CONECTORES]: "git,git,GIT" }).escolhidos).toHaveLength(1);
  });

  it("todo nome do catálogo é resolvível (a lista e o catálogo não podem divergir)", () => {
    const todos = MCP_CATALOG.map((c) => c.name).join(",");
    expect(conectoresPedidos({ [ENV_CONECTORES]: todos }).desconhecidos).toEqual([]);
  });
});

describe("sdkPresente", () => {
  it("importou = true; estourou = false (o SDK é opcional de propósito)", async () => {
    expect(await sdkPresente(async () => ({}))).toBe(true);
    expect(await sdkPresente(async () => { throw new Error("Cannot find module"); })).toBe(false);
  });
});

describe("ligarMcp · os caminhos de saída", () => {
  it("sem a flag, não conecta nada", async () => {
    const connect = vi.fn(conectaCom(soLeitura));
    const e = await ligarMcp({}, { connect });
    expect(e).toEqual({ ligado: false, sdk: false, conectores: [] });
    expect(connect).not.toHaveBeenCalled();
    expect(resumoMcp(e)).toBe("off");
  });

  it("SEM O SDK nem tenta conectar — e diz o comando que falta", async () => {
    const e = await ligarMcp({ [ENV_CONECTORES]: "fetch,git" }, { importar: async () => { throw new Error("no module"); } });
    expect(e).toEqual({ ligado: true, sdk: false, conectores: [] });
    expect(resumoMcp(e)).toBe("sem_sdk");
  });

  it("conector no ar: as tools de leitura entram no registry", async () => {
    const e = await ligarMcp({ [ENV_CONECTORES]: "openalex-research" }, { connect: conectaCom([{ name: "buscar", annotations: { readOnlyHint: true } }]) });
    expect(e.conectores).toEqual([{ name: "openalex-research", status: "conectado", tools: 1, recusadas: 0 }]);
    expect(getTool("mcp:openalex-research:buscar")?.runtime).toBe("mcp");
    expect(resumoMcp(e)).toBe("on (1 tools)");
  });

  it("A POLÍTICA DE RISCO: tool de ESCRITA não entra no registry, e o dono VÊ quantas caíram", async () => {
    // o permit só exige aprovação pra `write` em `guiado`, e o chat roda `auto`: uma tool de escrita
    // rodaria sem aprovação, escolhida pelo modelo a partir de uma CONVERSA.
    const e = await ligarMcp({ [ENV_CONECTORES]: "filesystem" }, {
      connect: conectaCom([
        { name: "read_file", annotations: { readOnlyHint: true } },
        { name: "write_file", annotations: {} },                        // sem hint = write
        { name: "delete_file", annotations: { destructiveHint: true } },
      ]),
    });
    expect(e.conectores[0]).toMatchObject({ status: "conectado", tools: 1, recusadas: 2 });
    expect(getTool("mcp:filesystem:read_file")).toBeTruthy();
    expect(getTool("mcp:filesystem:write_file")).toBeUndefined();
    expect(getTool("mcp:filesystem:delete_file")).toBeUndefined();
  });

  it("conector fora do ar não impede os outros, e o estado diz qual caiu", async () => {
    const connect: ConnectFn = async (cfg) => {
      if (cfg.name === "git") throw new Error("ECONNREFUSED");
      return clienteCom(soLeitura);
    };
    const e = await ligarMcp({ [ENV_CONECTORES]: "git,fetch" }, { connect });
    expect(e.conectores.map((c) => [c.name, c.status])).toEqual([["git", "erro"], ["fetch", "conectado"]]);
    expect(resumoMcp(e)).toMatch(/^degraded \(1\/2/);
  });

  it("todos fora do ar = degraded (não 'on')", async () => {
    const e = await ligarMcp({ [ENV_CONECTORES]: "git" }, { connect: async () => { throw new Error("fora"); } });
    expect(resumoMcp(e)).toBe("degraded");
  });

  it("nome fora do catálogo é ignorado sem derrubar o resto", async () => {
    const e = await ligarMcp({ [ENV_CONECTORES]: "inventado,fetch" }, { connect: conectaCom(soLeitura) });
    expect(e.conectores.map((c) => c.name)).toEqual(["fetch"]);
  });

  it("o estado fica memoizado pro /api/health", async () => {
    expect(estadoMcp()).toBeNull();
    await ligarMcp({ [ENV_CONECTORES]: "fetch" }, { connect: conectaCom(soLeitura) });
    expect(estadoMcp()?.conectores).toHaveLength(1);
    expect(resumoMcp()).toBe("on (1 tools)");
  });

  it("NUNCA lança, nem com conector que explode de forma estranha", async () => {
    const e = await ligarMcp({ [ENV_CONECTORES]: "fetch" }, { connect: (() => { throw "string crua"; }) as unknown as ConnectFn });
    expect(e.ligado).toBe(true);
    expect(e.conectores[0].status).toBe("erro");
  });
});

describe("resumoMcp", () => {
  it("estado ausente é off (o health nunca conecta por conta própria)", () => {
    expect(resumoMcp(null)).toBe("off");
  });
});

describe("o log de ops leva o motivo CRU, não a frase do aluno", () => {
  it("ECONNREFUSED aparece no estado (o `error` amigável serve a uma tela, não a um boot log)", async () => {
    _zerarEstadoMcp();
    const e = await ligarMcp({ [ENV_CONECTORES]: "git" }, { connect: async () => { throw new Error("connect ECONNREFUSED 127.0.0.1:8787"); } });
    expect(e.conectores[0].erro).toContain("ECONNREFUSED");
    expect(e.conectores[0].erro).not.toMatch(/núcleo|instantes/);
  });
});
