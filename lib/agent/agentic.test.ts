/**
 * lib/agent/agentic.test.ts — testes do MODO AGENTIC (motor de navegador human-in-the-loop).
 *
 * O motor é puro/injetado (driver + plan + approve + emit). Aqui provamos os INVARIANTES que
 * tornam esse modo honesto e seguro:
 *   - executa os passos em ordem, "por partes" (navigate→type→click→read);
 *   - CO-BROWSING: handoff devolve o controle ao humano na mesma página (waitForHuman);
 *   - o LOGIN é SEMPRE do humano: um `type` em campo de credencial vira handoff — o agente NUNCA digita o segredo;
 *   - APROVAÇÃO do admin em todo comando de escrita no modo guiado (a "janela pra conferir");
 *   - ORÇAMENTO: para em maxSteps e em maxDurationMs (o "30 minutos");
 *   - TRAVA DE DESIGN: recusa qualquer ação de furtividade/anti-detecção/CAPTCHA (vira teste, não promessa);
 *   - ADITIVO: importar este módulo não registra tool nem altera o runtime (não mexe nos outros modos).
 */
import { describe, it, expect, vi } from "vitest";
import {
  guardAction,
  normalizeAction,
  actionRisk,
  needsApproval,
  runAgentic,
  agenticEnabled,
  type AgenticAction,
  type BrowserDriver,
  type AgenticEvent,
} from "@/lib/agent/agentic";

// ───────────────────────────── fake driver que grava as chamadas ─────────────────────────────
function fakeDriver(over: Partial<BrowserDriver> = {}) {
  const calls: string[] = [];
  const driver: BrowserDriver = {
    goto: vi.fn(async (u: string) => { calls.push(`goto:${u}`); }),
    click: vi.fn(async (s: string) => { calls.push(`click:${s}`); }),
    type: vi.fn(async (s: string, t: string) => { calls.push(`type:${s}=${t}`); }),
    readText: vi.fn(async (s?: string) => { calls.push(`read:${s ?? "body"}`); return `texto de ${s ?? "body"}`; }),
    screenshot: vi.fn(async () => { calls.push("shot"); return "data"; }),
    waitForHuman: vi.fn(async (r: string) => { calls.push(`human:${r}`); }),
    close: vi.fn(async () => { calls.push("close"); }),
    ...over,
  };
  return { driver, calls };
}
const planOf = (...actions: AgenticAction[]) => async () => actions;

// ───────────────────────────── guard (trava anti-furtividade) ─────────────────────────────
describe("guardAction · recusa furtividade/anti-detecção/CAPTCHA", () => {
  it("bloqueia stealth, anti-bot, fingerprint, proxy-rotation, captcha e 'burlar/driblar'", () => {
    const bad = [
      { kind: "navigate", url: "https://x/playwright-stealth" },
      { kind: "click", target: "resolver o reCAPTCHA" },
      { kind: "type", target: "spoof de fingerprint" },
      { kind: "navigate", label: "rotacionar proxy para não ser detectado" },
      { kind: "click", reason: "driblar o anti-bot" },
    ] as AgenticAction[];
    for (const a of bad) expect(guardAction(a).ok).toBe(false);
  });
  it("libera ações normais", () => {
    expect(guardAction({ kind: "navigate", url: "https://exemplo.com" }).ok).toBe(true);
    expect(guardAction({ kind: "type", target: "barra de pesquisa", text: "campanha X" }).ok).toBe(true);
  });
});

// ───────────────────────────── login é sempre do humano ─────────────────────────────
describe("normalizeAction · credencial nunca é digitada pelo agente", () => {
  it("type em campo de senha/credencial vira handoff", () => {
    const a = normalizeAction({ kind: "type", selector: "#password", text: "segredo123" });
    expect(a.kind).toBe("handoff");
    expect(a.text).toBeUndefined();
  });
  it("secret:true força handoff mesmo sem nome revelador", () => {
    expect(normalizeAction({ kind: "type", selector: "#f", text: "x", secret: true }).kind).toBe("handoff");
  });
  it("type comum não vira handoff", () => {
    expect(normalizeAction({ kind: "type", selector: "#busca", text: "campanha X" }).kind).toBe("type");
  });
});

// ───────────────────────────── risco × aprovação ─────────────────────────────
describe("actionRisk / needsApproval", () => {
  it("click e type são write; navigate/read/screenshot são read", () => {
    expect(actionRisk({ kind: "click" })).toBe("write");
    expect(actionRisk({ kind: "type" })).toBe("write");
    expect(actionRisk({ kind: "navigate" })).toBe("read");
    expect(actionRisk({ kind: "read" })).toBe("read");
    expect(actionRisk({ kind: "screenshot" })).toBe("read");
  });
  it("guiado pede aprovação em write; auto não; read nunca", () => {
    expect(needsApproval({ kind: "click" }, "guiado")).toBe(true);
    expect(needsApproval({ kind: "click" }, "auto")).toBe(false);
    expect(needsApproval({ kind: "navigate" }, "guiado")).toBe(false);
  });
});

// ───────────────────────────── o laço ─────────────────────────────
describe("runAgentic · laço por partes", () => {
  it("executa os passos em ordem (navigate→type→click→read)", async () => {
    const { driver, calls } = fakeDriver();
    const r = await runAgentic("abrir campanha", { driver, plan: planOf(
      { kind: "navigate", url: "https://exemplo.com" },
      { kind: "type", selector: "#busca", text: "campanha X" },
      { kind: "click", selector: "#campanha-x" },
      { kind: "read", selector: "#comentarios" },
      { kind: "done" },
    ) }, { execMode: "auto" });
    expect(r.ok).toBe(true);
    expect(r.stop).toBe("done");
    expect(calls).toEqual(["goto:https://exemplo.com", "type:#busca=campanha X", "click:#campanha-x", "read:#comentarios"]);
    expect(r.readings).toEqual(["texto de #comentarios"]);
  });

  it("CO-BROWSING: handoff chama waitForHuman e retoma", async () => {
    const { driver, calls } = fakeDriver();
    const r = await runAgentic("login", { driver, plan: planOf(
      { kind: "handoff", reason: "faça o login nesta página" },
      { kind: "read", selector: "#painel" },
      { kind: "done" },
    ) }, { execMode: "auto" });
    expect(r.stop).toBe("done");
    expect(r.handoffs).toBe(1);
    expect(calls[0]).toBe("human:faça o login nesta página");
    expect(driver.waitForHuman).toHaveBeenCalledOnce();
  });

  it("LOGIN: type em #password nunca chega ao driver — vira handoff", async () => {
    const { driver, calls } = fakeDriver();
    await runAgentic("entrar", { driver, plan: planOf(
      { kind: "type", selector: "#password", text: "segredo123" },
      { kind: "done" },
    ) }, { execMode: "auto" });
    expect(driver.type).not.toHaveBeenCalled();
    expect(driver.waitForHuman).toHaveBeenCalledOnce();
    expect(calls.some((c) => c.includes("segredo123"))).toBe(false);
  });

  it("APROVAÇÃO: guiado nega escrita quando o admin recusa (comando não roda)", async () => {
    const { driver } = fakeDriver();
    const approve = vi.fn(async () => false);
    const r = await runAgentic("pausar campanha", { driver, approve, plan: planOf(
      { kind: "click", selector: "#pausar" },
    ) }, { execMode: "guiado" });
    expect(r.stop).toBe("denied");
    expect(approve).toHaveBeenCalledOnce();
    expect(driver.click).not.toHaveBeenCalled();
  });

  it("APROVAÇÃO: guiado roda a escrita quando o admin confirma", async () => {
    const { driver } = fakeDriver();
    const approve = vi.fn(async () => true);
    const r = await runAgentic("pausar campanha", { driver, approve, plan: planOf(
      { kind: "click", selector: "#pausar" },
      { kind: "done" },
    ) }, { execMode: "guiado" });
    expect(r.stop).toBe("done");
    expect(approve).toHaveBeenCalledOnce();
    expect(driver.click).toHaveBeenCalledWith("#pausar");
  });

  it("guiado é o DEFAULT: sem execMode, escrita sem approve é negada", async () => {
    const { driver } = fakeDriver();
    const r = await runAgentic("x", { driver, plan: planOf({ kind: "click", selector: "#b" }) });
    expect(r.stop).toBe("denied");
    expect(driver.click).not.toHaveBeenCalled();
  });

  it("TRAVA: ação de furtividade interrompe o laço antes de executar", async () => {
    const { driver } = fakeDriver();
    const events: AgenticEvent[] = [];
    const r = await runAgentic("x", { driver, emit: (e) => events.push(e), plan: planOf(
      { kind: "navigate", url: "https://site/anti-bot-bypass" },
    ) }, { execMode: "auto" });
    expect(r.ok).toBe(false);
    expect(r.stop).toBe("blocked");
    expect(driver.goto).not.toHaveBeenCalled();
    expect(events.some((e) => e.kind === "blocked")).toBe(true);
  });

  it("ORÇAMENTO: para em maxSteps", async () => {
    const { driver } = fakeDriver();
    const r = await runAgentic("x", { driver, plan: planOf(
      { kind: "navigate", url: "a" }, { kind: "navigate", url: "b" }, { kind: "navigate", url: "c" },
    ) }, { execMode: "auto", maxSteps: 2 });
    expect(r.stop).toBe("maxSteps");
    expect(r.executed.length).toBe(2);
  });

  it("ORÇAMENTO: para em maxDurationMs (o 30 min)", async () => {
    const { driver } = fakeDriver();
    let t = 0;
    const now = () => (t += 10_000); // cada checada avança 10 s
    const r = await runAgentic("x", { driver, now, plan: planOf(
      { kind: "navigate", url: "a" }, { kind: "navigate", url: "b" }, { kind: "navigate", url: "c" },
    ) }, { execMode: "auto", maxDurationMs: 15_000 });
    expect(r.stop).toBe("timeout");
  });

  it("NUNCA lança: erro do driver vira stop:error", async () => {
    const { driver } = fakeDriver({ goto: vi.fn(async () => { throw new Error("boom"); }) });
    const r = await runAgentic("x", { driver, plan: planOf({ kind: "navigate", url: "a" }) }, { execMode: "auto" });
    expect(r.ok).toBe(false);
    expect(r.stop).toBe("error");
    expect(r.error).toContain("boom");
  });

  it("plan vazio termina em done sem tocar o driver", async () => {
    const { driver, calls } = fakeDriver();
    const r = await runAgentic("x", { driver, plan: planOf() }, { execMode: "auto" });
    expect(r.stop).toBe("done");
    expect(calls).toEqual([]);
  });
});

// ───────────────────────────── flag + aditividade ─────────────────────────────
describe("agenticEnabled · opt-in, não mexe nos outros modos", () => {
  it("default OFF; liga com 1/true/on", () => {
    expect(agenticEnabled({} as any)).toBe(false);
    expect(agenticEnabled({ AGENTIC_MODE: "1" } as any)).toBe(true);
    expect(agenticEnabled({ AGENTIC_MODE: "true" } as any)).toBe(true);
    expect(agenticEnabled({ AGENTIC_MODE: "on" } as any)).toBe(true);
    expect(agenticEnabled({ AGENTIC_MODE: "0" } as any)).toBe(false);
  });

  it("importar o módulo agentic NÃO registra nada no runtime", async () => {
    const { listTools } = await import("@/lib/agent/runtime");
    const antes = listTools().map((t) => t.name).sort();
    await import("@/lib/agent/agentic"); // já importado no topo; o registry não deve ter mudado
    const depois = listTools().map((t) => t.name).sort();
    expect(depois).toEqual(antes);
    // o modo agentic é um runner à parte — não injeta tools no deny-by-default dos outros modos
    expect(antes).not.toContain("browser_agent");
  });
});
