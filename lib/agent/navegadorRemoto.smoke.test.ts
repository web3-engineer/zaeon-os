/**
 * SMOKE do CONTAINER do agente (F9) com o SERVIDOR REAL (`services/agente-navegador/server.mjs`)
 * e CHROMIUM REAL. Só roda com `AGENTE_SMOKE=1`:
 *
 *   AGENTE_SMOKE=1 npx vitest run lib/agent/navegadorRemoto.smoke.test.ts
 *
 * O QUE ELE PROVA, e por que vale mais que os testes de unidade: o defeito mais provável neste
 * desenho é CONTRATO — o cliente do web (`navegadorRemoto`) e o servidor do container falando
 * formas diferentes de JSON, rota ou status. Nenhum teste com `fetch` falso pega isso, porque o
 * falso concorda comigo por construção. Aqui o driver de verdade dirige o servidor de verdade.
 *
 * O QUE ELE **NÃO** PROVA, e eu não vou fingir que prova:
 *
 *  1. A IMAGEM. Não há daemon do Docker neste ambiente, então o `Dockerfile` (apt do chromium,
 *     `COPY` da guarda, `USER node`, HEALTHCHECK) só será exercido pelo primeiro deploy.
 *  2. UMA NAVEGAÇÃO BEM-SUCEDIDA pelo container. Pra isso o host de teste precisaria resolver num
 *     IP público — e `ipsAceitos` barra loopback, CORRETAMENTE. Tentei dar ao `lo` um endereço de
 *     aparência pública; não há `ip`/`ifconfig` aqui e o bind falha. O que fica provado em volta
 *     disso: a URL é aceita/recusada pela política certa, o IP é conferido de verdade (um host que
 *     resolve pra 127.0.0.1 é recusado com `ip_bloqueado`), e o `goto` com JS + interceptação já
 *     está provado com Chromium real no smoke da F8, com os MESMOS args e a MESMA guarda.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { abrirNavegadorRemoto, agenteVivo } from "@/lib/agent/navegadorRemoto";
import { caminhoDoChromium } from "@/lib/agent/navegadorServidor";
import type { BrowserDriver } from "@/lib/agent/agentic";

const LIGADO = process.env.AGENTE_SMOKE === "1";
const PORTA = 8799;
const BASE = `http://127.0.0.1:${PORTA}`;
const ALLOW = ["*.gov.br", "arxiv.org"];
const HOST_INTERNO = "interno.gov.br"; // na allowlist, mas resolve pra 127.0.0.1

const raiz = path.resolve(__dirname, "../..");
const env = { AGENTE_URL: BASE, LEITOR_ALLOW: ALLOW.join(", ") } as Record<string, string | undefined>;

const pedir = async (caminho: string, metodo = "POST", corpo?: unknown) => {
  const r = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: corpo === undefined ? undefined : { "content-type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  let j: Record<string, unknown> = {};
  try { j = (await r.json()) as Record<string, unknown>; } catch { /* vazio */ }
  return { status: r.status, json: j };
};

describe.skipIf(!LIGADO)("SMOKE — container do agente (servidor + Chromium reais)", () => {
  let proc: ChildProcess;

  beforeAll(async () => {
    // host na allowlist que resolve pra loopback: é com ele que a camada de IP é exercida.
    const hosts = readFileSync("/etc/hosts", "utf8");
    if (!hosts.includes(HOST_INTERNO)) appendFileSync("/etc/hosts", `\n127.0.0.1 ${HOST_INTERNO}\n`);

    proc = spawn(process.execPath, [path.join(raiz, "services/agente-navegador/server.mjs")], {
      env: {
        ...process.env,
        PORT: String(PORTA),
        AGENTE_ALLOW: ALLOW.join(", "),
        AGENTE_CHROMIUM_PATH: caminhoDoChromium() ?? "/usr/bin/chromium",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    proc.stderr?.on("data", (b) => { if (process.env.AGENTE_SMOKE_VERBOSE) console.error(String(b)); });

    // espera o /health em vez de dormir um número mágico
    const limite = Date.now() + 20_000;
    for (;;) {
      if (await agenteVivo(env, fetch, 400)) break;
      if (Date.now() > limite) throw new Error("servidor do agente não subiu em 20 s");
      await new Promise((r) => setTimeout(r, 200));
    }
  }, 60_000);

  afterAll(() => { proc?.kill("SIGKILL"); });

  it("1 · /health responde e declara a allowlist e os tetos", async () => {
    const { status, json } = await pedir("/health", "GET");
    expect(status).toBe(200);
    expect(json).toMatchObject({ ok: true, allow: ALLOW.length, max: 2 });
    expect(json.ttlMs).toBe(120_000);
  });

  it("2 · POST /sessao lança CHROMIUM DE VERDADE e devolve id de 32 hex", async () => {
    const { status, json } = await pedir("/sessao");
    expect(status).toBe(201);
    expect(String(json.id)).toMatch(/^[0-9a-f]{32}$/);
    await pedir(`/sessao/${json.id}`, "DELETE");
    // e agora o navegador está de pé de fato
    const { json: h } = await pedir("/health", "GET");
    expect(h.navegador).toBe(true);
  }, 60_000);

  it("3 · o TETO de sessões é real: a 3ª recebe 429 lotado, e DELETE libera a vaga", async () => {
    const a = await pedir("/sessao");
    const b = await pedir("/sessao");
    expect([a.status, b.status]).toEqual([201, 201]);
    const c = await pedir("/sessao");
    expect(c).toMatchObject({ status: 429, json: { erro: "lotado" } });
    await pedir(`/sessao/${a.json.id}`, "DELETE");
    const d = await pedir("/sessao");
    expect(d.status).toBe(201);
    for (const id of [b.json.id, d.json.id]) await pedir(`/sessao/${id}`, "DELETE");
  }, 60_000);

  it("4 · a POLÍTICA é a do Leitor, aplicada pelo servidor (não só pelo cliente)", async () => {
    const { json: s } = await pedir("/sessao");
    const id = s.id;
    try {
      // fora da allowlist
      expect(await pedir(`/sessao/${id}/ir`, "POST", { url: "https://evil.example/" }))
        .toMatchObject({ status: 403, json: { erro: "dominio_fora_da_lista" } });
      // IP literal (endpoint de metadados da nuvem)
      expect(await pedir(`/sessao/${id}/ir`, "POST", { url: "http://169.254.169.254/latest/meta-data/" }))
        .toMatchObject({ status: 400, json: { erro: "ip_literal" } });
      // esquema proibido e credencial na URL
      expect((await pedir(`/sessao/${id}/ir`, "POST", { url: "file:///etc/passwd" })).json.erro)
        .toBe("esquema_proibido");
      expect((await pedir(`/sessao/${id}/ir`, "POST", { url: "https://u:p@arxiv.org/" })).json.erro)
        .toBe("credencial_na_url");
      // porta fora de 80/443
      expect((await pedir(`/sessao/${id}/ir`, "POST", { url: "https://arxiv.org:8080/" })).json.erro)
        .toBe("porta_proibida");
      // A CAMADA DE IP, de verdade: host NA allowlist cujo DNS aponta pra dentro.
      expect(await pedir(`/sessao/${id}/ir`, "POST", { url: `http://${HOST_INTERNO}/` }))
        .toMatchObject({ status: 403, json: { erro: "ip_bloqueado" } });
    } finally {
      await pedir(`/sessao/${id}`, "DELETE");
    }
  }, 60_000);

  it("5 · sessão desconhecida e rota desconhecida erram explícito (404), não 500", async () => {
    expect(await pedir(`/sessao/${"f".repeat(32)}/ler`, "POST", {}))
      .toMatchObject({ status: 404, json: { erro: "sessao_desconhecida" } });
    expect((await pedir("/nao-existe", "POST")).status).toBe(404);
    // id com forma errada não casa a rota (nem chega a consultar o registro)
    expect((await pedir("/sessao/../../etc/ler", "POST", {})).status).toBe(404);
  });

  it("6 · CONTRATO: o driver do web dirige o servidor real de ponta a ponta", async () => {
    // Esta é a asserção que nenhum teste com `fetch` falso alcança: o falso concorda comigo por
    // construção. Aqui, se o cliente e o servidor discordarem de rota, JSON ou status, isto quebra.
    let d: BrowserDriver | undefined;
    try {
      d = await abrirNavegadorRemoto({ env, allow: ALLOW });
      // ler numa sessão nova (about:blank) devolve string — prova o caminho ler, do web ao Chromium
      expect(typeof (await d.readText())).toBe("string");
      // foto vem do Chromium de verdade
      expect((await d.screenshot()).length).toBeGreaterThan(100);
      // as travas valem com o servidor real por trás
      await expect(d.click("#x")).rejects.toThrow(/somente_leitura:click/);
      await expect(d.waitForHuman("login")).rejects.toThrow(/sem_humano/);
      await expect(d.goto("https://evil.example/")).rejects.toThrow(/dominio_fora_da_lista/);
      // e a recusa do SERVIDOR chega legível ao web (não como "http_403")
      await expect(d.goto(`http://${HOST_INTERNO}/`)).rejects.toThrow(/ip_bloqueado/);
    } finally {
      await d?.close();
    }
  }, 60_000);

  it("7 · corpo gigante e JSON inválido são recusados sem derrubar o servidor", async () => {
    const r1 = await fetch(`${BASE}/sessao/${"a".repeat(32)}/ler`, {
      method: "POST", headers: { "content-type": "application/json" }, body: "{isso não é json",
    });
    expect([400, 404]).toContain(r1.status);
    // e o servidor continua vivo depois disso
    expect(await agenteVivo(env, fetch, 1_000)).toBe(true);
  });
});

describe.skipIf(LIGADO)("SMOKE do container desligado", () => {
  it("existe e se declara: use AGENTE_SMOKE=1 pra rodar com servidor e navegador reais", () => {
    expect(existsSync(path.join(raiz, "services/agente-navegador/server.mjs"))).toBe(true);
  });
});

/**
 * SMOKE do MODO ABERTO e do TOKEN, com o servidor REAL (F10). Mesma porta `AGENTE_SMOKE=1`.
 *
 * A prova do modo aberto aqui é o CÓDIGO DE ERRO, e ela é melhor do que parece: um domínio que não
 * existe passa pela política (porque tudo passa) e morre no DNS → `dns_falhou`. Em modo fechado o
 * MESMO pedido morreria antes, em `dominio_fora_da_lista`. Os dois códigos distinguem "domínio
 * recusado" de "domínio aceito, rede falhou" — então dá pra afirmar que o predicado cedeu sem
 * precisar de um site de verdade no ar.
 */
describe.skipIf(!LIGADO)("SMOKE — modo aberto + token (servidor real)", () => {
  const PORTA2 = 8798;
  const BASE2 = `http://127.0.0.1:${PORTA2}`;
  const TOKEN = "t0k3n-de-smoke";
  let proc2: ChildProcess;

  const pedir2 = async (caminho: string, metodo = "POST", corpo?: unknown, token?: string) => {
    const r = await fetch(`${BASE2}${caminho}`, {
      method: metodo,
      headers: {
        ...(corpo === undefined ? {} : { "content-type": "application/json" }),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    let j: Record<string, unknown> = {};
    try { j = (await r.json()) as Record<string, unknown>; } catch { /* vazio */ }
    return { status: r.status, json: j };
  };

  beforeAll(async () => {
    proc2 = spawn(process.execPath, [path.join(raiz, "services/agente-navegador/server.mjs")], {
      env: {
        ...process.env,
        PORT: String(PORTA2),
        AGENTE_ALLOW: "*",
        AGENTE_TOKEN: TOKEN,
        AGENTE_CHROMIUM_PATH: caminhoDoChromium() ?? "/usr/bin/chromium",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const limite = Date.now() + 20_000;
    for (;;) {
      if (await agenteVivo({ AGENTE_URL: BASE2 }, fetch, 400)) break;
      if (Date.now() > limite) throw new Error("servidor (aberto) não subiu em 20 s");
      await new Promise((r) => setTimeout(r, 200));
    }
  }, 60_000);

  afterAll(() => { proc2?.kill("SIGKILL"); });

  it("o /health declara o modo e que está autenticado — e NÃO exige token", async () => {
    // /health fora do portão de propósito: é ele que a sonda do recibo chama, e um health com
    // segredo transformaria "token errado" em "serviço morto" no recibo.
    const { status, json } = await pedir2("/health", "GET");
    expect(status).toBe(200);
    expect(json).toMatchObject({ ok: true, aberto: true, autenticado: true });
  });

  it("TOKEN: sem ele é 401; com ele abre sessão; com o errado é 401", async () => {
    expect((await pedir2("/sessao")).status).toBe(401);
    expect((await pedir2("/sessao", "POST", undefined, "errado")).status).toBe(401);
    const ok = await pedir2("/sessao", "POST", undefined, TOKEN);
    expect(ok.status).toBe(201);
    await pedir2(`/sessao/${ok.json.id}`, "DELETE", undefined, TOKEN);
  }, 60_000);

  it("MODO ABERTO: domínio arbitrário passa a política e morre no DNS, não na allowlist", async () => {
    const s = await pedir2("/sessao", "POST", undefined, TOKEN);
    try {
      const r = await pedir2(
        `/sessao/${s.json.id}/ir`, "POST",
        { url: "https://dominio-que-nao-existe-zaeon-smoke.example/" }, TOKEN,
      );
      expect(r.json.erro).toBe("dns_falhou");          // a política CEDEU
      expect(r.json.erro).not.toBe("dominio_fora_da_lista");
    } finally {
      await pedir2(`/sessao/${s.json.id}`, "DELETE", undefined, TOKEN);
    }
  }, 60_000);

  it("ABERTO NÃO abre a rede: IP literal, metadados e host interno seguem recusados", async () => {
    const s = await pedir2("/sessao", "POST", undefined, TOKEN);
    try {
      expect((await pedir2(`/sessao/${s.json.id}/ir`, "POST", { url: "http://169.254.169.254/latest/meta-data/" }, TOKEN)).json.erro)
        .toBe("ip_literal");
      expect((await pedir2(`/sessao/${s.json.id}/ir`, "POST", { url: "http://10.0.0.5/" }, TOKEN)).json.erro)
        .toBe("ip_literal");
      expect((await pedir2(`/sessao/${s.json.id}/ir`, "POST", { url: "file:///etc/passwd" }, TOKEN)).json.erro)
        .toBe("esquema_proibido");
      // host NA allowlist (tudo está) cujo DNS aponta pra loopback → barrado pelo IP, não pelo nome
      expect((await pedir2(`/sessao/${s.json.id}/ir`, "POST", { url: `http://${HOST_INTERNO}/` }, TOKEN)).json.erro)
        .toBe("ip_bloqueado");
    } finally {
      await pedir2(`/sessao/${s.json.id}`, "DELETE", undefined, TOKEN);
    }
  }, 60_000);
});
