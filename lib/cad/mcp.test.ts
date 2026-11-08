/**
 * lib/cad/mcp.test.ts — a política do SolidCraft, provada sem o binário.
 *
 * Dois perigos, dois testes:
 *  · T2 · A DECISÃO DE SEGURANÇA: `execute`/`batch` (destructive no servidor) entram como `write` SÓ
 *    neste conector, passam o `permit` em modo `auto`, e a exceção NÃO contamina outro conector.
 *    Inclui a injeção de defeito: sem a reclassificação, as mesmas tools são recusadas.
 *  · T4b · O CONFINAMENTO POR CONVERSA: `confinarEmCad` força `/app/cad/<escopo>` e recusa, por
 *    NEGAÇÃO, `..`, caminho absoluto fora da raiz e caminho de OUTRA conversa.
 *
 * Nada aqui sobe o `solidcraft-cli`: `connect` é injetado. O handshake real, as 21 tools e o sandbox
 * do próprio SolidCraft (T3/T4) dependem do binário na imagem — ver docs/HANDOFF_EIFFEL_CAD.md §10.2.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  registerMcpConnector,
  reclassificadorDeMapa,
  type CatalogEntry,
  type ConnectFn,
  type McpClient,
  type McpToolInfo,
} from "@/lib/agent/mcp";
import { getTool, permit, type ToolContext } from "@/lib/agent/runtime";
import {
  CAMINHO_BIN_SOLIDCRAFT,
  CAMINHO_WASM_CAD,
  CONECTOR_CAD,
  RAIZ_CAD,
  RECLASSIFICACAO_SOLIDCRAFT,
  SOLIDCRAFT_ENTRY,
  VERSAO_SOLIDCRAFT,
  confinarEmCad,
  escopoDeContexto,
  reciboCad,
} from "@/lib/cad/mcp";
import { join as joinPath } from "node:path";
import { CONECTOR_CAD as CONECTOR_CAD_CAPACIDADES, TOOLS_POR_HABILIDADE } from "@/lib/agents/capacidades";

// Um servidor falso com as anotações que MEDI no SolidCraft real: measure só-leitura, execute/batch
// destrutivas, e duas tools SEM anotação (o limite conhecido: viram `write` por omissão).
const TOOLS_FALSAS: McpToolInfo[] = [
  { name: "measure", annotations: { readOnlyHint: true } },
  { name: "inspect_design", annotations: { readOnlyHint: true } },
  { name: "execute", annotations: { destructiveHint: true } },
  { name: "batch", annotations: { destructiveHint: true } },
  { name: "new_design", annotations: {} },          // sem hint → write
  { name: "mystery", annotations: undefined },        // sem annotations → write (limite conhecido)
  { name: "crash_reports", annotations: { destructiveHint: true } },
];

const connectFalso: ConnectFn = async (): Promise<McpClient> => ({
  listTools: async () => TOOLS_FALSAS,
  callTool: async () => ({ content: [{ type: "text", text: "ok" }] }),
  ping: async () => {},
  close: async () => {},
});

const CTX_AUTO = { execMode: "auto" } as ToolContext;

// cada teste usa um nome de conector próprio pra não colidir no registry global entre casos
function entradaCom(name: string, extra?: Partial<CatalogEntry>): CatalogEntry {
  return { name, label: name, transport: "stdio", endpoint: "x", ...extra };
}

describe("T2 · a política de risco do conector SolidCraft", () => {
  it("execute/batch entram como write; crash_reports (destructive) é recusada e nomeada", async () => {
    const h = await registerMcpConnector(SOLIDCRAFT_ENTRY, {
      connect: connectFalso,
      riscoMaximo: SOLIDCRAFT_ENTRY.riscoMaximo,
      reclassificar: reclassificadorDeMapa(SOLIDCRAFT_ENTRY.reclassificar!),
    });
    expect(h.status).toBe("conectado");

    // admitidas: measure, inspect_design (read) + execute, batch (reclassificadas) + new_design, mystery (write)
    const execute = getTool(`mcp:${CONECTOR_CAD}:execute`);
    const batch = getTool(`mcp:${CONECTOR_CAD}:batch`);
    expect(execute, "execute tem de entrar — é o que deixa o Eiffel modelar").toBeTruthy();
    expect(batch).toBeTruthy();
    expect(execute!.risk, "o ToolDef nasce write, não destructive — senão o permit a barra").toBe("write");
    expect(batch!.risk).toBe("write");

    // o SEGUNDO portão: write em auto é ALLOW; destructive seria REQUIRE_APPROVAL
    expect(permit(execute!, CTX_AUTO)).toBe("ALLOW");
    expect(permit(batch!, CTX_AUTO)).toBe("ALLOW");

    // crash_reports continua destructive (não está no mapa) e, com teto write, é RECUSADA e nomeada
    expect(getTool(`mcp:${CONECTOR_CAD}:crash_reports`)).toBeUndefined();
    expect(h.recusadas).toContain("crash_reports (destructive)");
    // e nenhuma das que modelam aparece como recusada
    expect(h.recusadas!.some((r) => /^execute|^batch/.test(r))).toBe(false);
  });

  it("limite conhecido: servidor sem annotations vira write — e com teto write, ENTRA", async () => {
    const h = await registerMcpConnector(SOLIDCRAFT_ENTRY, {
      connect: connectFalso,
      riscoMaximo: "write",
      reclassificar: reclassificadorDeMapa(RECLASSIFICACAO_SOLIDCRAFT),
    });
    // `mystery` não tem annotations → write por omissão → admitida sob o teto write
    expect(getTool(`mcp:${CONECTOR_CAD}:mystery`)).toBeTruthy();
    expect(h.recusadas!.some((r) => /^mystery/.test(r))).toBe(false);
  });

  it("INJEÇÃO DE DEFEITO: sem a reclassificação, execute/batch são recusadas — a exceção é load-bearing", async () => {
    // mesmo conector, teto write, mas SEM o mapa de reclassificação: execute/batch seguem destructive
    const h = await registerMcpConnector(entradaCom("cad-sem-reclass"), {
      connect: connectFalso,
      riscoMaximo: "write",
    });
    expect(getTool("mcp:cad-sem-reclass:execute")).toBeUndefined();
    expect(getTool("mcp:cad-sem-reclass:batch")).toBeUndefined();
    expect(h.recusadas).toEqual(
      expect.arrayContaining(["execute (destructive)", "batch (destructive)"]),
    );
  });

  it("NÃO-CONTAMINAÇÃO: outro conector, sem a política, mantém execute/batch destructive e recusadas", async () => {
    // mesmíssimas tools falsas; a diferença é só NÃO passar riscoMaximo/reclassificar (defaults do chat)
    const h = await registerMcpConnector(entradaCom("outro-conector"), { connect: connectFalso });
    // teto default `read`: tudo que não é read é recusado — a exceção do SolidCraft não vazou
    expect(getTool("mcp:outro-conector:execute")).toBeUndefined();
    expect(getTool("mcp:outro-conector:batch")).toBeUndefined();
    expect(getTool("mcp:outro-conector:new_design")).toBeUndefined();
    // só as de leitura entram
    expect(getTool("mcp:outro-conector:measure")).toBeTruthy();
    expect(h.recusadas).toEqual(
      expect.arrayContaining(["execute (destructive)", "batch (destructive)", "new_design (write)"]),
    );
  });

  it("o slug e as tools reclassificadas batem com lib/agents/capacidades (um só vocabulário)", () => {
    expect(SOLIDCRAFT_ENTRY.name).toBe(CONECTOR_CAD);
    expect(CONECTOR_CAD).toBe(CONECTOR_CAD_CAPACIDADES);
    // execute/batch reclassificadas existem no mapa de capacidades, com o nome namespaceado real
    const nomesCad = new Set(TOOLS_POR_HABILIDADE.cad);
    for (const t of Object.keys(RECLASSIFICACAO_SOLIDCRAFT)) {
      expect(nomesCad.has(`mcp:${CONECTOR_CAD}:${t}`), `${t} reclassificada mas ausente da habilidade cad`).toBe(true);
    }
  });
});

describe("T4b · confinamento por conversa (confinarEmCad)", () => {
  const escopo = "estudo-42";
  const base = `${RAIZ_CAD}/${escopo}`;

  it("relativo vira filho do escopo", () => {
    expect(confinarEmCad(escopo, "x.step")).toBe(`${base}/x.step`);
    expect(confinarEmCad(escopo, "sub/dir/x.step")).toBe(`${base}/sub/dir/x.step`);
  });

  it("absoluto DENTRO do escopo passa", () => {
    expect(confinarEmCad(escopo, `${base}/ok.step`)).toBe(`${base}/ok.step`);
    // a própria pasta do escopo é válida
    expect(confinarEmCad(escopo, base)).toBe(base);
  });

  it("`..` que sobe demais é RECUSADO (resolvido antes de comparar)", () => {
    expect(() => confinarEmCad(escopo, "../fora.step")).toThrow(/confinamento/);
    expect(() => confinarEmCad(escopo, "a/../../fora.step")).toThrow(/confinamento/);
  });

  it("absoluto fora da raiz é RECUSADO", () => {
    expect(() => confinarEmCad(escopo, "/etc/passwd")).toThrow(/confinamento/);
    expect(() => confinarEmCad(escopo, "/app/cad")).toThrow(/confinamento/); // a raiz, não o escopo
  });

  it("caminho de OUTRA conversa é RECUSADO — é o isolamento entre conversas", () => {
    expect(() => confinarEmCad(escopo, `${RAIZ_CAD}/outro-estudo/x.step`)).toThrow(/confinamento/);
    // o truque do prefixo: `estudo-42x` NÃO é `estudo-42`
    expect(() => confinarEmCad(escopo, `${RAIZ_CAD}/estudo-42maligno/x.step`)).toThrow(/confinamento/);
  });

  it("o PRÓPRIO escopo não escapa: barras e `..` no nome caem", () => {
    expect(confinarEmCad("a/b/../c", "x")).toBe(`${RAIZ_CAD}/abc/x`);
    // escopo vazio após sanitizar → `anon`, nunca a raiz crua
    expect(confinarEmCad("///", "x")).toBe(`${RAIZ_CAD}/anon/x`);
  });
});

describe("escopoDeContexto · a chave de isolamento", () => {
  it("prefere o estudo, cai pro dono do turno, e tem piso `anon`", () => {
    expect(escopoDeContexto({ currentStudyId: "s1", userId: "u1" } as ToolContext)).toBe("s1");
    expect(escopoDeContexto({ currentResearchId: "r1", userId: "u1" } as ToolContext)).toBe("r1");
    expect(escopoDeContexto({ userId: "u1" } as ToolContext)).toBe("u1");
    expect(escopoDeContexto({} as ToolContext)).toBe("anon");
  });

  it("sanitiza a chave (ela vira nome de pasta)", () => {
    expect(escopoDeContexto({ currentStudyId: "../../etc" } as ToolContext)).toBe("etc");
  });
});

describe("T8 · o recibo do /api/health (reciboCad)", () => {
  const CWD = "/app";
  const wasmPath = joinPath(CWD, CAMINHO_WASM_CAD);
  // um `existe` que só diz sim pros caminhos listados — é o disco, controlado
  const existeSo = (presentes: string[]) => (c: string) => presentes.includes(c);

  it("binário presente, bundle ausente (o estado de hoje): cli on, wasm off, versao pinada", () => {
    const r = reciboCad(existeSo([CAMINHO_BIN_SOLIDCRAFT]), CWD);
    expect(r).toEqual({ cli: "on", wasm: "off", versao: VERSAO_SOLIDCRAFT });
  });

  it("os dois presentes: cli on, wasm on", () => {
    const r = reciboCad(existeSo([CAMINHO_BIN_SOLIDCRAFT, wasmPath]), CWD);
    expect(r).toEqual({ cli: "on", wasm: "on", versao: VERSAO_SOLIDCRAFT });
  });

  it("nada presente: cli off, wasm off, e SEM versao (não há binário pra versionar)", () => {
    const r = reciboCad(existeSo([]), CWD);
    expect(r).toEqual({ cli: "off", wasm: "off" });
    expect(r.versao).toBeUndefined();
  });

  it("LÊ O DISCO, não é constante: virar o estado do disco vira o recibo", () => {
    const vazio = reciboCad(existeSo([]), CWD);
    const cheio = reciboCad(existeSo([CAMINHO_BIN_SOLIDCRAFT, wasmPath]), CWD);
    expect(vazio.cli).not.toBe(cheio.cli);
    expect(vazio.wasm).not.toBe(cheio.wasm);
  });
});

afterEach(() => {
  // o registry é global; limpa as tools que estes testes plantaram pra não vazar entre arquivos
  for (const c of [CONECTOR_CAD, "cad-sem-reclass", "outro-conector"]) {
    for (const t of TOOLS_FALSAS) {
      const reg = (globalThis as any).__zaeonToolRegistry as Map<string, unknown> | undefined;
      reg?.delete(`mcp:${c}:${t.name}`);
    }
  }
});
