/** #645: o /api/health diz se os turnos do Escritório rodam na fila (worker) ou no próprio web. */
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/lib/llm/saude", () => ({ estadoGateway: async () => "on", provedorAtual: () => "litellm" }));
vi.mock("@/lib/leitor/saude", () => ({ estadoLeitor: async () => "off" }));
vi.mock("@/lib/llm/pool", () => ({ poolConfigurado: () => [] }));
import { GET } from "./route";

afterEach(() => vi.unstubAllEnvs());

describe("health · capacidades (o RECIBO de 'tudo ON' — §8 do PLANO_HARNESS_AGENTICO)", () => {
  it("sem Variable nenhuma, TODAS as flags do harness saem ligadas", async () => {
    for (const k of ["HARNESS_CAPACIDADE", "HARNESS_ACAO", "HARNESS_ANEXO", "HARNESS_SINTESE", "DOC_POR_SECAO", "HARNESS_GRAFICO"]) vi.stubEnv(k, "");
    const c = (await (await GET()).json()).capacidades;
    expect(c).toMatchObject({ cardapio: true, acao: true, anexo: true, sintese: true, docPorSecao: true, grafico: true, voltas: 2 });
    // F6 · o recibo do deploy lê DAQUI. Se só `voltas` existisse, ele diria "2 voltas" pra tudo
    // enquanto um pedido de trabalho roda 5 — e recibo que mente é pior que recibo que falta.
    expect(c.voltasPorTarefa).toMatchObject({ criar_trabalho: 5, revisar: 3, buscar_livro: 1, duvida_rapida: 0 });
  });

  it("o kill-switch aparece aqui — é por este endpoint que se confere o rollback", async () => {
    vi.stubEnv("HARNESS_CAPACIDADE", "0");
    vi.stubEnv("HARNESS_VOLTAS_ACAO", "0");
    const c = (await (await GET()).json()).capacidades;
    expect(c.cardapio).toBe(false);
    expect(c.acao).toBe(true);     // cada flag é independente: desligar uma não derruba a outra
    expect(c.voltas).toBe(0);
    // a alavanca é CEGA: setada, achata a tabela por tarefa toda no mesmo número
    expect(Object.values(c.voltasPorTarefa)).toEqual(Object.values(c.voltasPorTarefa).map(() => 0));
  });

  it("as tools do Leitor refletem o REGISTRO, não a flag (promessa precisa de lastro)", async () => {
    // neste processo de teste ninguém chamou `registrarAbrirUrl`, então elas não existem — e o
    // health diz isso em vez de prometer. É o mesmo contrato da F0, aplicado ao próprio relatório.
    const c = (await (await GET()).json()).capacidades;
    expect(c.abrirUrl).toBe(false);
    expect(c.baixarParaBase).toBe(false);
  });
});

describe("health · escritorio", () => {
  it("CANAL_QUEUE=1 com Redis → 'fila'; sem → 'inline' (e nenhum segredo sai)", async () => {
    vi.stubEnv("CANAL_QUEUE", "1"); vi.stubEnv("REDIS_URL", "redis://segredo:6379");
    const fila = await (await GET()).json();
    expect(fila.escritorio).toBe("fila");
    expect(JSON.stringify(fila)).not.toContain("segredo");
    vi.stubEnv("CANAL_QUEUE", "");
    expect((await (await GET()).json()).escritorio).toBe("inline");
  });
});
