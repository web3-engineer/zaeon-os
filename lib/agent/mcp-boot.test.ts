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
    expect(mcpLigado({ [ENV_CONECTORES]: "biomcp" })).toBe(true);
  });

  it("O KILL-SWITCH: agora que o padrão é LIGADO, vazio não é mais alcançável — precisa de um 'não'", () => {
    // `${{ vars.MCP_CONECTORES || 'scholar' }}` cai no padrão exatamente quando a Variable está
    // vazia; sem estes valores, ligar por padrão seria ligar sem rollback.
    for (const off of ["0", "off", "OFF", "false", "nao", "não", "no", "nenhum", "none", " off "]) {
      expect(mcpLigado({ [ENV_CONECTORES]: off }), off).toBe(false);
    }
  });

  it("o kill-switch não é 'nome desconhecido' — não polui o log de boot com um falso erro de digitação", () => {
    expect(conectoresPedidos({ [ENV_CONECTORES]: "0" })).toEqual({ escolhidos: [], desconhecidos: [] });
    expect(conectoresPedidos({ [ENV_CONECTORES]: "nenhum" })).toEqual({ escolhidos: [], desconhecidos: [] });
  });

  it("'scholar' — o padrão de produção — resolve no catálogo e NÃO está indisponível", () => {
    // se alguém marcar o scholar `indisponivel` sem mexer no deploy, o padrão viraria um aviso de
    // boot e o MCP cairia calado. Este teste é o elo entre o catálogo e o default do deploy.yml.
    const { escolhidos, desconhecidos } = conectoresPedidos({ [ENV_CONECTORES]: "scholar" });
    expect(escolhidos.map((c) => c.name)).toEqual(["scholar"]);
    expect(desconhecidos).toEqual([]);
    expect(escolhidos[0].endpoint).not.toMatch(/npx/);   // dependência pinada, não download em boot
  });
});

describe("conectoresPedidos · SÓ pelo catálogo", () => {
  it("resolve os nomes do catálogo, sem ligar a maiúscula", () => {
    const { escolhidos, desconhecidos } = conectoresPedidos({ [ENV_CONECTORES]: " BIOMCP , scholar " });
    expect(escolhidos.map((c) => c.name)).toEqual(["biomcp", "scholar"]);
    expect(desconhecidos).toEqual([]);
  });

  it("endpoint arbitrário NÃO entra — nome fora do catálogo é recusado e reportado", () => {
    // dar ao modelo uma superfície que ninguém revisou é o que isto impede
    const { escolhidos, desconhecidos } = conectoresPedidos({ [ENV_CONECTORES]: "biomcp,https://evil.com/mcp,inventado" });
    expect(escolhidos.map((c) => c.name)).toEqual(["biomcp"]);
    expect(desconhecidos).toEqual(["https://evil.com/mcp", "inventado"]);
  });

  it("nome repetido vale uma vez", () => {
    expect(conectoresPedidos({ [ENV_CONECTORES]: "scholar,scholar,SCHOLAR" }).escolhidos).toHaveLength(1);
  });

  it("todo nome DISPONÍVEL do catálogo é resolvível; os indisponíveis são recusados COM motivo", () => {
    const todos = MCP_CATALOG.map((c) => c.name).join(",");
    const { escolhidos, desconhecidos } = conectoresPedidos({ [ENV_CONECTORES]: todos });
    const disponiveis = MCP_CATALOG.filter((c) => !c.indisponivel).map((c) => c.name);
    expect(escolhidos.map((c) => c.name).sort()).toEqual([...disponiveis].sort());
    // auditado em 2026-11-03: 4 endpoints não existem no npm ou precisam de python (ver o catálogo)
    expect(desconhecidos).toHaveLength(MCP_CATALOG.length - disponiveis.length);
    for (const d of desconhecidos) expect(d, d).toMatch(/\(.+\)/);   // o motivo vai junto
  });

  it("DURANTE o boot o resumo é 'ligando', não 'off' (o recibo do deploy não pode mentir)", async () => {
    // o instrumentation chama sem `await`; nesta janela `estado` é nulo e um "off" seria falso
    let solta: (() => void) | undefined;
    const presa = new Promise<void>((r) => { solta = r; });
    const p = ligarMcp({ [ENV_CONECTORES]: "biomcp" }, {
      connect: async (...a: Parameters<ConnectFn>) => { await presa; return conectaCom(soLeitura)(...a); },
    });
    await Promise.resolve();
    expect(resumoMcp()).toBe("ligando");
    solta!();
    await p;
    expect(resumoMcp()).toBe("on (1 tools)");
  });

  it("boot que estoura ainda assim sai de 'ligando' (senão o health travava na janela)", async () => {
    await ligarMcp({ [ENV_CONECTORES]: "biomcp" }, { connect: async () => { throw new Error("fora"); } });
    expect(resumoMcp()).toBe("degraded");
  });

  it("pedir um endpoint INDISPONÍVEL não gasta handshake — ele nem entra na lista", async () => {
    // sem isto, `fetch`/`git` (pacotes que não existem no npm) custariam 10 s de boot cada
    const connect = vi.fn(conectaCom(soLeitura));
    const e = await ligarMcp({ [ENV_CONECTORES]: "fetch,git,openalex-research" }, { connect });
    expect(connect).not.toHaveBeenCalled();
    expect(e.conectores).toEqual([]);
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
    const e = await ligarMcp({ [ENV_CONECTORES]: "biomcp,scholar" }, { importar: async () => { throw new Error("no module"); } });
    expect(e).toEqual({ ligado: true, sdk: false, conectores: [] });
    expect(resumoMcp(e)).toBe("sem_sdk");
  });

  it("conector no ar: as tools de leitura entram no registry", async () => {
    const e = await ligarMcp({ [ENV_CONECTORES]: "scholar" }, { connect: conectaCom([{ name: "buscar", annotations: { readOnlyHint: true } }]) });
    expect(e.conectores).toEqual([{ name: "scholar", status: "conectado", tools: 1, recusadas: 0 }]);
    expect(getTool("mcp:scholar:buscar")?.runtime).toBe("mcp");
    expect(resumoMcp(e)).toBe("on (1 tools)");
  });

  it("A POLÍTICA DE RISCO: tool de ESCRITA não entra no registry, e o dono VÊ quantas caíram", async () => {
    // o permit só exige aprovação pra `write` em `guiado`, e o chat roda `auto`: uma tool de escrita
    // rodaria sem aprovação, escolhida pelo modelo a partir de uma CONVERSA.
    const e = await ligarMcp({ [ENV_CONECTORES]: "biomcp" }, {
      connect: conectaCom([
        { name: "read_file", annotations: { readOnlyHint: true } },
        { name: "write_file", annotations: {} },                        // sem hint = write
        { name: "delete_file", annotations: { destructiveHint: true } },
      ]),
    });
    expect(e.conectores[0]).toMatchObject({ status: "conectado", tools: 1, recusadas: 2 });
    expect(getTool("mcp:biomcp:read_file")).toBeTruthy();
    expect(getTool("mcp:biomcp:write_file")).toBeUndefined();
    expect(getTool("mcp:biomcp:delete_file")).toBeUndefined();
  });

  it("CONECTADO COM ZERO TOOL não é 'on' — o recibo não pode afirmar capacidade que não existe", async () => {
    // acontece de verdade: servidor sem annotations cai todo em `write` e a política recusa tudo.
    // O handshake deu certo, o chat ganhou nada — e o recibo do deploy tem de dizer isso.
    const e = await ligarMcp({ [ENV_CONECTORES]: "biomcp" }, {
      connect: conectaCom([{ name: "faz_algo", annotations: {} }]),
    });
    expect(e.conectores[0]).toMatchObject({ status: "conectado", tools: 0, recusadas: 1 });
    expect(resumoMcp(e)).toBe("degraded (1/1, 0 tools)");
  });

  it("conector fora do ar não impede os outros, e o estado diz qual caiu", async () => {
    const connect: ConnectFn = async (cfg) => {
      if (cfg.name === "scholar") throw new Error("ECONNREFUSED");
      return clienteCom(soLeitura);
    };
    const e = await ligarMcp({ [ENV_CONECTORES]: "scholar,biomcp" }, { connect });
    expect(e.conectores.map((c) => [c.name, c.status])).toEqual([["scholar", "erro"], ["biomcp", "conectado"]]);
    expect(resumoMcp(e)).toMatch(/^degraded \(1\/2/);
  });

  it("todos fora do ar = degraded (não 'on')", async () => {
    const e = await ligarMcp({ [ENV_CONECTORES]: "biomcp" }, { connect: async () => { throw new Error("fora"); } });
    expect(resumoMcp(e)).toBe("degraded");
  });

  it("nome fora do catálogo é ignorado sem derrubar o resto", async () => {
    const e = await ligarMcp({ [ENV_CONECTORES]: "inventado,biomcp" }, { connect: conectaCom(soLeitura) });
    expect(e.conectores.map((c) => c.name)).toEqual(["biomcp"]);
  });

  it("o estado fica memoizado pro /api/health", async () => {
    expect(estadoMcp()).toBeNull();
    await ligarMcp({ [ENV_CONECTORES]: "biomcp" }, { connect: conectaCom(soLeitura) });
    expect(estadoMcp()?.conectores).toHaveLength(1);
    expect(resumoMcp()).toBe("on (1 tools)");
  });

  it("NUNCA lança, nem com conector que explode de forma estranha", async () => {
    const e = await ligarMcp({ [ENV_CONECTORES]: "biomcp" }, { connect: (() => { throw "string crua"; }) as unknown as ConnectFn });
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
    const e = await ligarMcp({ [ENV_CONECTORES]: "biomcp" }, { connect: async () => { throw new Error("connect ECONNREFUSED 127.0.0.1:8787"); } });
    expect(e.conectores[0].erro).toContain("ECONNREFUSED");
    expect(e.conectores[0].erro).not.toMatch(/núcleo|instantes/);
  });
});
