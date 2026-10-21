import { describe, it, expect, beforeEach } from "vitest";
import { escolhaModeloOcta, criarChamadorOcta, nomeDoModelo, _resetPausaOcta, type ChamarGateway, type EscolhaOcta } from "./modelo";
import { rodarAgenteOcta, type MsgModelo } from "./agente";

const PROD = { GEMINI_MODEL: "gemini-3.5-flash" };
const msgs: MsgModelo[] = [{ role: "user", content: "conserta a soma" }];
const resp = (content: string) => ({ content, usage: { prompt_tokens: 10, completion_tokens: 5 } });

/** gateway falso: por modelo, uma função que responde (ou explode). Registra quem foi chamado. */
const gateway = (porModelo: Record<string, (signal?: AbortSignal) => Promise<any>>) => {
  const chamados: string[] = [];
  const g: ChamarGateway = async (modelo, _m, signal) => {
    chamados.push(modelo);
    const h = porModelo[modelo];
    if (!h) throw new Error(`modelo inesperado ${modelo}`);
    return h(signal);
  };
  return { g, chamados };
};
const ligado = (over: Partial<EscolhaOcta> = {}): EscolhaOcta => ({ ...escolhaModeloOcta({ ...PROD, OCTA_MODELO_LOCAL: "1" }), ...over });

beforeEach(() => _resetPausaOcta());

describe("octa · escolha do modelo", () => {
  it("flag desligada: nada de local, o Google 'forte' de sempre", () => {
    const e = escolhaModeloOcta(PROD);
    expect(e.local).toBeNull();
    expect(e.reserva).toBe("vertex_ai/gemini-2.5-pro");
    expect(escolhaModeloOcta({ ...PROD, GEMINI_MODEL_PRO: "gemini-x-pro" }).reserva).toBe("vertex_ai/gemini-x-pro");
  });

  it("flag ligada: qwen3-coder da Contabo, reserva = Google 3.5-flash, tetos default", () => {
    const e = escolhaModeloOcta({ ...PROD, OCTA_MODELO_LOCAL: "1" });
    expect(e).toMatchObject({ local: "zaeon-local-coder", reserva: "vertex_ai/gemini-3.5-flash", timeoutMs: 120_000, orcamentoMs: 240_000, maxPromptTok: 3000 });
  });

  it("tudo sobrescrevível por env; valor inválido volta pro default", () => {
    const e = escolhaModeloOcta({ ...PROD, OCTA_MODELO_LOCAL: "1", OCTA_MODELO_LOCAL_NOME: "zaeon-local-geral", OCTA_MODELO_RESERVA: "vertex_ai/gemini-2.5-pro", OCTA_LOCAL_TIMEOUT_MS: "5000", OCTA_LOCAL_PAUSA_MS: "abc" });
    expect(e).toMatchObject({ local: "zaeon-local-geral", reserva: "vertex_ai/gemini-2.5-pro", timeoutMs: 5000, pausaMs: 120_000 });
    expect(escolhaModeloOcta({ OCTA_MODELO_LOCAL: "0" }).local).toBeNull();
  });

  it("nome pra tela", () => {
    expect(nomeDoModelo("zaeon-local-coder")).toBe("qwen3-coder");
    expect(nomeDoModelo("vertex_ai/gemini-3.5-flash")).toBe("gemini-3.5-flash");
  });
});

describe("octa · chamador com reserva", () => {
  it("flag desligada: só o Google, nunca toca o local", async () => {
    const { g, chamados } = gateway({ "vertex_ai/gemini-2.5-pro": async () => resp("ok") });
    const c = criarChamadorOcta(g, escolhaModeloOcta(PROD));
    await c(msgs);
    expect(chamados).toEqual(["vertex_ai/gemini-2.5-pro"]);
    expect(c.servidos[0].motivo).toBeUndefined();
  });

  it("local responde → Google nem é chamado", async () => {
    const { g, chamados } = gateway({ "zaeon-local-coder": async () => ({ ...resp("feito"), modeloId: "contabo-coder" }) });
    const c = criarChamadorOcta(g, ligado());
    expect((await c(msgs)).content).toBe("feito");
    expect(chamados).toEqual(["zaeon-local-coder"]);
    expect(c.servidos).toMatchObject([{ modelo: "zaeon-local-coder", modeloId: "contabo-coder" }]);
  });

  it("local com erro → Google, e o resto do turno fica no Google", async () => {
    const { g, chamados } = gateway({
      "zaeon-local-coder": async () => { throw new Error("gateway 500"); },
      "vertex_ai/gemini-3.5-flash": async () => resp("reserva"),
    });
    const c = criarChamadorOcta(g, ligado());
    expect((await c(msgs)).content).toBe("reserva");
    await c(msgs);
    expect(chamados).toEqual(["zaeon-local-coder", "vertex_ai/gemini-3.5-flash", "vertex_ai/gemini-3.5-flash"]);
    expect(c.servidos[0].motivo).toMatch(/erro: gateway 500/);
  });

  it("local lento → timeout de verdade (AbortSignal) e cai no Google", async () => {
    const lento = (signal?: AbortSignal) => new Promise((_, rej) => signal?.addEventListener("abort", () => rej(signal.reason)));
    const { g } = gateway({ "zaeon-local-coder": lento, "vertex_ai/gemini-3.5-flash": async () => resp("reserva") });
    const c = criarChamadorOcta(g, ligado({ timeoutMs: 20 }));
    expect((await c(msgs)).content).toBe("reserva");
    expect(c.servidos[0].motivo).toBe("timeout");
  });

  it("resposta vazia do local → Google", async () => {
    const { g } = gateway({ "zaeon-local-coder": async () => resp("  "), "vertex_ai/gemini-3.5-flash": async () => resp("reserva") });
    const c = criarChamadorOcta(g, ligado());
    expect((await c(msgs)).content).toBe("reserva");
    expect(c.servidos[0].motivo).toBe("resposta_vazia");
  });

  it("tool_call sem texto NÃO é vazia (fica no local)", async () => {
    const { g, chamados } = gateway({ "zaeon-local-coder": async () => ({ content: "", tool_calls: [{ id: "1", type: "function", function: { name: "octa_listar", arguments: "{}" } }] }) });
    await criarChamadorOcta(g, ligado())(msgs);
    expect(chamados).toEqual(["zaeon-local-coder"]);
  });

  it("prompt maior que o contexto do local → direto pro Google", async () => {
    const { g, chamados } = gateway({ "vertex_ai/gemini-3.5-flash": async () => resp("reserva") });
    const c = criarChamadorOcta(g, ligado({ maxPromptTok: 10 }));
    await c([{ role: "user", content: "x".repeat(200) }]);
    expect(chamados).toEqual(["vertex_ai/gemini-3.5-flash"]);
    expect(c.servidos[0].motivo).toBe("prompt_grande");
  });

  it("orçamento de tempo do turno no local estourado → o resto vai pro Google", async () => {
    let t = 0;
    const { g, chamados } = gateway({
      "zaeon-local-coder": async () => { t += 300; return resp("passo"); },
      "vertex_ai/gemini-3.5-flash": async () => resp("reserva"),
    });
    const c = criarChamadorOcta(g, ligado({ orcamentoMs: 500 }), () => t);
    await c(msgs); await c(msgs); await c(msgs);
    expect(chamados).toEqual(["zaeon-local-coder", "zaeon-local-coder", "vertex_ai/gemini-3.5-flash"]);
    expect(c.servidos[2].motivo).toBe("orcamento_local");
  });

  it("falha do local pausa ele pros PRÓXIMOS turnos (Contabo fora não custa um timeout por turno)", async () => {
    let t = 1000;
    const { g, chamados } = gateway({
      "zaeon-local-coder": async () => { throw new Error("ECONNREFUSED"); },
      "vertex_ai/gemini-3.5-flash": async () => resp("reserva"),
    });
    const e = ligado({ pausaMs: 60_000 });
    await criarChamadorOcta(g, e, () => t)(msgs);
    const c2 = criarChamadorOcta(g, e, () => t);
    await c2(msgs);
    expect(c2.servidos[0].motivo).toBe("local_em_pausa");
    t += 61_000;
    await criarChamadorOcta(g, e, () => t)(msgs);
    expect(chamados.filter((m) => m === "zaeon-local-coder")).toHaveLength(2);
  });

  it("orçamento da virtual key estourado não vira reserva (é recusa)", async () => {
    const { g, chamados } = gateway({ "zaeon-local-coder": async () => { throw new Error("orçamento da sessão esgotado"); } });
    await expect(criarChamadorOcta(g, ligado())(msgs)).rejects.toThrow(/orçamento/);
    expect(chamados).toEqual(["zaeon-local-coder"]);
  });

  it("no laço do agente: local lê, cai no meio, Google termina com o histórico do local", async () => {
    let n = 0;
    const vistoPeloGoogle: MsgModelo[][] = [];
    const g: ChamarGateway = async (modelo, m) => {
      if (modelo === "zaeon-local-coder") {
        if (n++ === 0) return { content: null, tool_calls: [{ id: "q1", type: "function", function: { name: "octa_ler", arguments: JSON.stringify({ path: "src/soma.ts" }) } }] };
        throw new Error("gateway 502");
      }
      vistoPeloGoogle.push(m);
      return resp("O bug está em src/soma.ts:1.");
    };
    const c = criarChamadorOcta(g, ligado());
    const r = await rodarAgenteOcta({ historico: [], pedido: "revisa", workspace: { "src/soma.ts": "export const soma = (a, b) => a - b;" }, modo: "review", liberados: [] }, c, { sessionId: "m1" });
    expect(r.resposta).toMatch(/soma\.ts:1/);
    expect(c.servidos.map((s) => s.modelo)).toEqual(["zaeon-local-coder", "vertex_ai/gemini-3.5-flash"]);
    expect(vistoPeloGoogle[0].some((m) => m.role === "tool")).toBe(true);
  });
});
