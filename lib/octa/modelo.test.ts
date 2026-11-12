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

describe("octa · escolha do modelo no fluxo landing", () => {
  it("Google primeiro (vertex_ai/<GEMINI_MODEL>), Contabo de reserva", () => {
    const e = escolhaModeloOcta({ ...PROD, OCTA_MODELO_LOCAL: "1" }, "landing");
    expect(e.local).toBe("vertex_ai/gemini-3.5-flash");
    expect(e.reserva).toBe("zaeon-local-coder");
    // o Google aguenta o prompt inteiro: sem teto de prompt; o orçamento de tempo vale pra reserva (CPU)
    expect(e.maxPromptTok).toBeGreaterThan(1_000_000);
    expect(e).toMatchObject({ orcamentoMs: 240_000, timeoutMs: 120_000, landing: true });
  });

  it("GEMINI_MODEL vale também sem a flag do local", () => {
    expect(escolhaModeloOcta(PROD, "landing").local).toBe("vertex_ai/gemini-3.5-flash");
  });

  it("flag do local desligada: a reserva não aponta pra Contabo (kill switch respeitado)", () => {
    expect(escolhaModeloOcta(PROD, "landing").reserva).toBe("vertex_ai/gemini-2.5-pro");
  });

  it("no chamador: Google responde e a Contabo nem é tocada; Google falha → Contabo", async () => {
    const e = escolhaModeloOcta({ ...PROD, OCTA_MODELO_LOCAL: "1" }, "landing");
    const ok = gateway({ "vertex_ai/gemini-3.5-flash": async () => resp("google") });
    expect((await criarChamadorOcta(ok.g, e)([{ role: "user", content: "x".repeat(50_000) }])).content).toBe("google");
    expect(ok.chamados).toEqual(["vertex_ai/gemini-3.5-flash"]);
    _resetPausaOcta();
    const falha = gateway({ "vertex_ai/gemini-3.5-flash": async () => { throw new Error("429"); }, "zaeon-local-coder": async () => resp("contabo") });
    expect((await criarChamadorOcta(falha.g, e)(msgs)).content).toBe("contabo");
  });

  it("captura de tela: o Google recebe a imagem; a reserva da Contabo (qwen3-coder, sem visão) recebe só o texto", async () => {
    const url = "data:image/jpeg;base64,/9j/QUJD";
    const comImg: MsgModelo[] = [{ role: "user", content: "faz a landing" }, { role: "user", content: [{ type: "text", text: "olhe" }, { type: "image_url", image_url: { url } }] }];
    const vistos: Record<string, MsgModelo[]> = {};
    const g: ChamarGateway = async (modelo, m) => {
      vistos[modelo] = m;
      if (modelo.startsWith("vertex_ai/")) throw new Error("429");
      return resp("contabo");
    };
    const e = escolhaModeloOcta({ ...PROD, OCTA_MODELO_LOCAL: "1" }, "landing");
    expect(e.reservaSemImagem).toBe(true);
    expect((await criarChamadorOcta(g, e)(comImg)).content).toBe("contabo");
    expect(JSON.stringify(vistos["vertex_ai/gemini-3.5-flash"])).toContain(url);
    expect(JSON.stringify(vistos["zaeon-local-coder"])).not.toContain("base64");
    expect(vistos["zaeon-local-coder"][1]).toEqual({ role: "user", content: "(captura de tela vista antes; imagem não guardada)" });
    // sem a flag do local, a reserva é o Google "forte" (lê imagem): vai inteira
    _resetPausaOcta();
    const e2 = escolhaModeloOcta(PROD, "landing");
    expect(e2.reservaSemImagem).toBe(false);
    await criarChamadorOcta(g, e2)(comImg).catch(() => undefined);
    expect(JSON.stringify(vistos["vertex_ai/gemini-2.5-pro"])).toContain(url);
  });

  it("Google caindo no landing não pausa a Contabo dos turnos normais", async () => {
    const env = { ...PROD, OCTA_MODELO_LOCAL: "1" };
    const { g, chamados } = gateway({
      "vertex_ai/gemini-3.5-flash": async () => { throw new Error("503"); },
      "zaeon-local-coder": async () => resp("contabo"),
    });
    await criarChamadorOcta(g, escolhaModeloOcta(env, "landing"))(msgs);
    const normal = criarChamadorOcta(g, escolhaModeloOcta(env));
    expect((await normal(msgs)).content).toBe("contabo");
    expect(normal.servidos[0].motivo).toBeUndefined();
    expect(chamados).toEqual(["vertex_ai/gemini-3.5-flash", "zaeon-local-coder", "zaeon-local-coder"]);
  });

  it("não gruda na reserva: Google falha num passo e volta no seguinte (fora da pausa)", async () => {
    let t = 0;
    let n = 0;
    const { g, chamados } = gateway({
      "vertex_ai/gemini-3.5-flash": async () => { if (n++ === 0) throw new Error("503"); return resp("google"); },
      "zaeon-local-coder": async () => resp("contabo"),
    });
    const c = criarChamadorOcta(g, { ...escolhaModeloOcta({ ...PROD, OCTA_MODELO_LOCAL: "1" }, "landing"), pausaMs: 10 }, () => t);
    expect((await c(msgs)).content).toBe("contabo");
    t += 20;
    expect((await c(msgs)).content).toBe("google");
    expect(chamados).toEqual(["vertex_ai/gemini-3.5-flash", "zaeon-local-coder", "vertex_ai/gemini-3.5-flash"]);
  });

  it("Google em pausa → reserva no passo, sem tocar o Google", async () => {
    let t = 0;
    const { g, chamados } = gateway({
      "vertex_ai/gemini-3.5-flash": async () => { throw new Error("503"); },
      "zaeon-local-coder": async () => resp("contabo"),
    });
    const c = criarChamadorOcta(g, escolhaModeloOcta({ ...PROD, OCTA_MODELO_LOCAL: "1" }, "landing"), () => t);
    await c(msgs); await c(msgs);
    expect(chamados).toEqual(["vertex_ai/gemini-3.5-flash", "zaeon-local-coder", "zaeon-local-coder"]);
    expect(c.servidos[1].motivo).toBe("local_em_pausa");
  });

  it("reserva lenta é abortada pelo teto por passo", async () => {
    const lento = (signal?: AbortSignal) => new Promise((_, rej) => signal?.addEventListener("abort", () => rej(signal.reason)));
    const { g } = gateway({ "vertex_ai/gemini-3.5-flash": async () => { throw new Error("503"); }, "zaeon-local-coder": lento });
    const c = criarChamadorOcta(g, { ...escolhaModeloOcta({ ...PROD, OCTA_MODELO_LOCAL: "1" }, "landing"), timeoutMs: 20 });
    await expect(c(msgs)).rejects.toMatchObject({ name: "TimeoutError" });
  });

  it("tempo da reserva gasto no turno → o passo falha com erro claro e a reserva não é chamada de novo", async () => {
    let t = 0;
    const { g, chamados } = gateway({
      "vertex_ai/gemini-3.5-flash": async () => { throw new Error("503"); },
      "zaeon-local-coder": async () => { t += 300; return resp("contabo"); },
    });
    const c = criarChamadorOcta(g, { ...escolhaModeloOcta({ ...PROD, OCTA_MODELO_LOCAL: "1" }, "landing"), orcamentoMs: 500 }, () => t);
    await c(msgs); await c(msgs);
    const erro = await c(msgs).catch((e) => e);
    expect(String(erro?.message)).toMatch(/reserva esgotada/);
    expect(String(erro?.message)).not.toMatch(/orçamento/);
    expect(chamados.filter((m) => m === "zaeon-local-coder")).toHaveLength(2);
  });
});
