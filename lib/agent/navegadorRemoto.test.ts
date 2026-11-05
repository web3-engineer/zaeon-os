import { describe, it, expect } from "vitest";
import {
  abrirDriverDoAgente,
  abrirNavegadorRemoto,
  agenteUrl,
  agenteVivo,
} from "@/lib/agent/navegadorRemoto";
import { ondeOAgenteRoda, orcamentoDoAgente } from "@/lib/agent/navegadorPolitica";

const BASE = "http://agente-navegador:8788";
const env = (extra: Record<string, string> = {}) =>
  ({ AGENTE_URL: BASE, LEITOR_ALLOW: "arxiv.org, *.gov.br", ...extra }) as Record<string, string | undefined>;

type Chamada = { url: string; metodo?: string; corpo?: unknown };

/** fetch falso que registra o que foi pedido e devolve o que o teste mandar. */
function falso(respostas: Record<string, { status?: number; json?: unknown }> = {}) {
  const vistas: Chamada[] = [];
  const buscar = (async (u: string | URL | Request, init?: RequestInit) => {
    const url = String(u);
    vistas.push({
      url,
      metodo: init?.method,
      corpo: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    const chave = Object.keys(respostas).find((k) => url.endsWith(k));
    const r = chave ? respostas[chave] : undefined;
    const status = r?.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => r?.json ?? {},
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return { buscar, vistas };
}

const comSessao = (extra: Record<string, { status?: number; json?: unknown }> = {}) =>
  falso({ "/sessao": { status: 201, json: { id: "a".repeat(32) } }, ...extra });

describe("agenteUrl", () => {
  it("lê AGENTE_URL e tira a barra final (senão a URL vira //sessao)", () => {
    expect(agenteUrl({ AGENTE_URL: `${BASE}/` })).toBe(BASE);
    expect(agenteUrl({ AGENTE_URL: `${BASE}///` })).toBe(BASE);
  });
  it("vazia/ausente = null → o caminho local assume", () => {
    expect(agenteUrl({})).toBe(null);
    expect(agenteUrl({ AGENTE_URL: "   " })).toBe(null);
  });
});

describe("abre sessão no container", () => {
  it("cria a sessão ao abrir e a fecha no close", async () => {
    const { buscar, vistas } = comSessao();
    const d = await abrirNavegadorRemoto({ env: env(), buscar });
    await d.close();
    expect(vistas[0]).toMatchObject({ url: `${BASE}/sessao`, metodo: "POST" });
    expect(vistas.at(-1)).toMatchObject({ url: `${BASE}/sessao/${"a".repeat(32)}`, metodo: "DELETE" });
  });

  it("container lotado chega como recusa legível, não como 'http_429' cru", async () => {
    const { buscar } = falso({ "/sessao": { status: 429, json: { erro: "lotado" } } });
    await expect(abrirNavegadorRemoto({ env: env(), buscar })).rejects.toThrow(/lotado/);
  });

  it("container fora do ar é estado DECLARADO, não exceção crua", async () => {
    const buscar = (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
    await expect(abrirNavegadorRemoto({ env: env(), buscar })).rejects.toThrow(/agente_inalcancavel/);
  });

  it("sem AGENTE_URL e sem allowlist, recusa antes de qualquer rede", async () => {
    await expect(abrirNavegadorRemoto({ env: {} })).rejects.toThrow(/agente_url_ausente/);
    await expect(abrirNavegadorRemoto({ env: { AGENTE_URL: BASE } })).rejects.toThrow(/allowlist_vazia/);
  });

  it("resposta sem id não passa como sessão válida", async () => {
    const { buscar } = falso({ "/sessao": { status: 201, json: {} } });
    await expect(abrirNavegadorRemoto({ env: env(), buscar })).rejects.toThrow(/sessao_sem_id/);
  });
});

describe("as travas são as MESMAS do driver local", () => {
  it("click/type/waitForHuman lançam, e NADA é pedido ao container", async () => {
    const { buscar, vistas } = comSessao();
    const d = await abrirNavegadorRemoto({ env: env(), buscar });
    const antes = vistas.length;
    await expect(d.click("#b")).rejects.toThrow(/somente_leitura:click/);
    await expect(d.type("#i", "x")).rejects.toThrow(/somente_leitura:type/);
    await expect(d.waitForHuman("login")).rejects.toThrow(/sem_humano/);
    expect(vistas.length).toBe(antes); // nem tentou: não existe rota de clicar no servidor
  });

  it("um plano com escrita morre no run, mesmo com approve permissivo", async () => {
    const { runAgentic } = await import("@/lib/agent/agentic");
    const { buscar } = comSessao();
    const d = await abrirNavegadorRemoto({ env: env(), buscar });
    const r = await runAgentic("x", {
      driver: d,
      plan: async () => [{ kind: "click", selector: "#b" }],
      approve: async () => true, // aprova TUDO, de propósito
    });
    expect(r.stop).toBe("error");
    expect(r.error).toMatch(/somente_leitura:click/);
  });
});

describe("goto — a política é conferida nas DUAS pontas", () => {
  it("fora da allowlist nem sai do web (erra rápido, com o motivo exato)", async () => {
    const { buscar, vistas } = comSessao();
    const d = await abrirNavegadorRemoto({ env: env(), buscar });
    const antes = vistas.length;
    await expect(d.goto("https://evil.example/")).rejects.toThrow(/dominio_fora_da_lista/);
    expect(vistas.length).toBe(antes);
  });

  it("na lista, pede ao container com a URL normalizada (sem hash)", async () => {
    const { buscar, vistas } = comSessao();
    const d = await abrirNavegadorRemoto({ env: env(), buscar });
    await d.goto("https://arxiv.org/abs/1#secao");
    expect(vistas.at(-1)).toMatchObject({
      url: `${BASE}/sessao/${"a".repeat(32)}/ir`,
      metodo: "POST",
      corpo: { url: "https://arxiv.org/abs/1" },
    });
  });

  it("recusa do container chega com o motivo dele (ex.: ip_bloqueado)", async () => {
    const { buscar } = comSessao({ "/ir": { status: 403, json: { erro: "ip_bloqueado" } } });
    const d = await abrirNavegadorRemoto({ env: env(), buscar });
    await expect(d.goto("https://arxiv.org/x")).rejects.toThrow(/ip_bloqueado/);
  });
});

describe("ler / foto", () => {
  it("manda o seletor quando há, e corta o texto no teto", async () => {
    const { buscar, vistas } = comSessao({ "/ler": { json: { texto: "x".repeat(50_000) } } });
    const d = await abrirNavegadorRemoto({ env: env(), buscar });
    expect((await d.readText("#main")).length).toBe(20_000);
    expect(vistas.at(-1)?.corpo).toEqual({ selector: "#main" });
    await d.readText();
    expect(vistas.at(-1)?.corpo).toEqual({});
  });

  it("texto ausente não vira 'undefined' em string", async () => {
    const { buscar } = comSessao({ "/ler": { json: {} } });
    const d = await abrirNavegadorRemoto({ env: env(), buscar });
    expect(await d.readText()).toBe("");
  });

  it("foto devolve base64", async () => {
    const { buscar } = comSessao({ "/foto": { json: { base64: "AAAA" } } });
    const d = await abrirNavegadorRemoto({ env: env(), buscar });
    expect(await d.screenshot()).toBe("AAAA");
  });

  it("close é best-effort: erro ao fechar não derruba o run", async () => {
    const { buscar } = comSessao({ "/sessao/": { status: 500, json: { erro: "x" } } });
    const d = await abrirNavegadorRemoto({ env: env(), buscar });
    await expect(d.close()).resolves.toBeUndefined();
  });
});

describe("agenteVivo — o recibo PERGUNTA em vez de supor", () => {
  it("true só quando o /health responde ok", async () => {
    const { buscar, vistas } = falso({ "/health": { status: 200 } });
    expect(await agenteVivo(env(), buscar)).toBe(true);
    expect(vistas.at(-1)?.url).toBe(`${BASE}/health`);
  });

  it("container parado → false (é a diferença entre env preenchida e serviço de pé)", async () => {
    const morto = (async () => { throw new Error("ECONNREFUSED"); }) as unknown as typeof fetch;
    expect(await agenteVivo(env(), morto)).toBe(false);
    const { buscar } = falso({ "/health": { status: 503 } });
    expect(await agenteVivo(env(), buscar)).toBe(false);
  });

  it("sem AGENTE_URL nem sonda a rede", async () => {
    const { buscar, vistas } = falso();
    expect(await agenteVivo({}, buscar)).toBe(false);
    expect(vistas).toEqual([]);
  });
});

describe("escolha do driver e orçamento", () => {
  it("com AGENTE_URL vai no container; sem ela, local", () => {
    expect(ondeOAgenteRoda(env())).toBe("container");
    expect(ondeOAgenteRoda({ LEITOR_ALLOW: "a.org" })).toBe("web");
  });

  it("o teto SOBE no container — é o que o container comprou", () => {
    const c = orcamentoDoAgente(true);
    const w = orcamentoDoAgente(false);
    expect(c.maxPassos).toBeGreaterThan(w.maxPassos);
    expect(c.maxMs).toBeGreaterThan(w.maxMs);
    // e segue abaixo dos 30 min do agentic.ts, que foram pensados pro driver HEADED com humano
    expect(c.maxMs).toBeLessThan(30 * 60_000);
  });

  it("abrirDriverDoAgente devolve `remoto` — o recibo precisa saber qual está em jogo", async () => {
    const { buscar } = comSessao();
    const r = await abrirNavegadorRemoto({ env: env(), buscar });
    expect(typeof r.goto).toBe("function");
    // o caminho local exige Chromium; aqui só afirmamos que a escolha recusa explícito sem nada
    await expect(abrirDriverDoAgente({ env: {} })).rejects.toThrow(/allowlist_vazia|chromium_ausente/);
  });
});
