/**
 * lib/agent/navegadorServidor.ts — o `BrowserDriver` do lado SERVIDOR (F8): Chromium HEADLESS,
 * SOMENTE LEITURA, sem co-browsing. É o caller que faltava pro `agentic.ts` (#698).
 *
 * Por que não o `connectBrowser` do próprio agentic.ts: ele pede `playwright` (que não está no
 * package.json) e abre o navegador HEADED — num container sem display não há janela, e sem janela o
 * co-browsing não existe. Aqui usamos `puppeteer-core`, que JÁ é dependência, e o Chromium que a
 * imagem JÁ instala (`OCTA_CHROMIUM_PATH=/usr/bin/chromium`), pelo mesmo caminho do Octa.
 *
 * ⟦DUAS TRAVAS QUE SÃO CÓDIGO, NÃO PROMESSA⟧
 *
 * 1. `click`/`type` LANÇAM. O laço do `runAgentic` já nega escrita quando não recebe `approve`
 *    (needsApproval → sem approve → `stop: "denied"`), e a rota não passa `approve`. Mas isso é
 *    política do CALLER: outro caller poderia passar um `approve` e as escritas rodariam. Um driver
 *    que recusa escrever é invariante do DRIVER, e vale pra qualquer caller.
 *
 * 2. `waitForHuman` LANÇA. Esta é a correção de um no-op que mente: no `connectBrowser`, sem
 *    `onHandoff`, o `waitForHuman` "retoma na hora" — ou seja, o agente seguiria como se o humano
 *    tivesse feito o login, sem que ninguém tenha feito nada, e o passo seguinte rodaria
 *    DESAUTENTICADO. Aqui não há humano na página, então um plano que precise de handoff tem de
 *    FALHAR ALTO (`stop: "error"`), não prosseguir em silêncio. É a mesma objeção que derrubou o
 *    `opts.deepThink` na F7: configuração/efeito declarado que nunca acontece é pior que ausente.
 *
 * A política de rede (allowlist, IP, regras de resolução) está em `navegadorPolitica.ts`, pura e
 * testada, e reusa as funções que o `leitor-proxy` roda em produção.
 */
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import dns from "node:dns";
import type { BrowserDriver } from "@/lib/agent/agentic";
import {
  AGENTE_MAX_TEXTO,
  allowDoAgente,
  decidirPedidoDoAgente,
  ipsAceitos,
  regrasDeResolucao,
  urlPermitida,
} from "@/lib/agent/navegadorPolitica";

/** Onde procurar o binário. `OCTA_CHROMIUM_PATH` manda — é a env que a imagem já define. */
const CAMINHOS_CONHECIDOS = [
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/opt/pw-browsers/chromium", // ambiente de dev/CI deste repositório
];

export function caminhoDoChromium(env: Record<string, string | undefined> = process.env): string | null {
  const dito = env.OCTA_CHROMIUM_PATH?.trim();
  if (dito) return dito;
  for (const c of CAMINHOS_CONHECIDOS) {
    try { if (existsSync(c)) return c; } catch { /* segue */ }
  }
  return null;
}

/**
 * Ambiente do processo do Chromium: SÓ isto. Sem `env`, o puppeteer repassa o `process.env` inteiro
 * do `web` — DATABASE_URL, NEXTAUTH_SECRET, chaves Vertex/Pusher — pro processo que abre páginas de
 * terceiro. Esta é a razão pela qual um navegador dentro do container credenciado não entrega as
 * credenciais: elas não entram nele. Mesma decisão do `envChromium` do Octa.
 *
 * HOME PRÓPRIA, não a do Octa (que é exportada e daria pra reusar): dois Chromium simultâneos com a
 * mesma HOME disputam o lock do perfil default. O bug apareceria só quando uma captura do Octa e um
 * run do agente coincidissem — intermitente, o pior formato.
 */
let homeDoAgente: string | null = null;
export function envDoAgente(): Record<string, string> {
  homeDoAgente ??= mkdtempSync(join(tmpdir(), "agente-chromium-"));
  return { PATH: "/usr/local/bin:/usr/bin:/bin", HOME: homeDoAgente, LANG: "C.UTF-8", TZ: "UTC" };
}

/**
 * Args do Chromium (puros e testáveis). `allow` entra nas regras de resolução — 2ª camada.
 *
 * `extrasDeTeste` existe por uma razão só, e vale dizer qual pra ninguém usá-la por outra: o
 * smoke-test com navegador real precisa de um servidor local, o Chromium PROMOVE http→https
 * (HTTPS-First) e um certificado autoassinado exige `--ignore-certificate-errors`. Desligar a
 * promoção em produção seria PIORAR a segurança pra facilitar um teste, então ela fica ligada e o
 * teste passa o extra. Não há env que ligue isto — só um caller explícito, e o único no repositório
 * é o smoke. Mesmo espírito do `lookup`/`portaUpstream` "injetáveis SÓ para teste" do leitor-proxy.
 */
export function argsDoAgente(
  allow: readonly string[],
  env: Record<string, string | undefined> = process.env,
  extrasDeTeste: readonly string[] = [],
): string[] {
  const args = [
    "--disable-gpu",
    "--disable-dev-shm-usage", // /dev/shm do container é 64 MB
    "--no-first-run", "--no-default-browser-check",
    "--disable-extensions", "--disable-component-extensions-with-background-pages",
    "--disable-background-networking", "--disable-component-update", "--disable-sync", "--disable-default-apps",
    "--disable-domain-reliability", "--disable-client-side-phishing-detection", "--metrics-recording-only",
    "--disable-features=Translate,MediaRouter,OptimizationHints,AutofillServerCommunication,InterestFeedContentSuggestions",
    "--mute-audio", "--hide-scrollbars", "--font-render-hinting=none",
    "--renderer-process-limit=1", // o limite de memória do web é apertado (compose)
    `--host-resolver-rules=${regrasDeResolucao(allow)}`,
  ];
  // NENHUM plugin stealth, NENHUM spoof de fingerprint, NENHUM solver de CAPTCHA — ver a trava de
  // design em agentic.ts (`guardAction`). Site que bloqueia automação continua bloqueando.
  if (env.OCTA_CHROMIUM_SEM_SANDBOX === "1") args.push("--no-sandbox");
  return [...args, ...extrasDeTeste];
}

export function opcoesDeLancamentoDoAgente(
  caminho: string,
  allow: readonly string[],
  env: Record<string, string | undefined> = process.env,
  extrasDeTeste: readonly string[] = [],
): Record<string, unknown> {
  return {
    executablePath: caminho,
    headless: true,
    pipe: true,
    args: argsDoAgente(allow, env, extrasDeTeste),
    env: envDoAgente(),
    defaultViewport: { width: 1280, height: 800 },
    handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false,
  };
}

type Pptr = { launch: (o: Record<string, unknown>) => Promise<any> };
function carregarPuppeteer(): Promise<Pptr> {
  // specifier não-literal + webpackIgnore: o mesmo truque do Octa, pro bundler não tentar resolver.
  const spec = "puppeteer" + "-core";
  return import(/* webpackIgnore: true */ spec).then((mod: any) => (mod.default?.launch ? mod.default : mod) as Pptr);
}

export type Lookup = (host: string) => Promise<readonly { address: string }[]>;

export type OpcoesNavegadorDoAgente = {
  allow?: readonly string[];
  timeoutMs?: number;
  /** injetável só pra teste (servidor local resolve pra 127.0.0.1, que a política barra de propósito). */
  lookup?: Lookup;
  /** injetável só pra teste. */
  caminho?: string | null;
  env?: Record<string, string | undefined>;
  /** SÓ pro smoke-test (ver `argsDoAgente`). Nenhuma env liga isto. */
  extrasDeTeste?: readonly string[];
};

export class RecusaDeRede extends Error {
  constructor(public readonly erro: string, url?: string) {
    super(`rede recusada (${erro})${url ? `: ${url}` : ""}`);
    this.name = "RecusaDeRede";
  }
}

const TIMEOUT_PADRAO_MS = 20_000;

/** O mínimo que `driverSobre` usa de uma página — pra o teste poder passar uma falsa. */
export type PaginaMinima = {
  goto(url: string, opts?: unknown): Promise<unknown>;
  evaluate(fn: unknown, arg?: unknown): Promise<unknown>;
  screenshot(opts?: unknown): Promise<unknown>;
};

/**
 * O driver propriamente dito, sobre uma página já aberta. PURO em relação ao Chromium: as duas
 * travas de desenho (somente leitura, sem humano) e a checagem de URL/IP do `goto` ficam todas aqui,
 * e por isso têm teste SEM navegador — era o contrário quando elas viviam dentro do `abrir...`.
 */
export function driverSobre(
  page: PaginaMinima,
  p: { allow: readonly string[]; lookup: Lookup; fechar: () => Promise<void> },
): BrowserDriver {
  const recusarEscrita = (o: string): never => {
    throw new RecusaDeRede(`somente_leitura:${o}`);
  };
  return {
    goto: async (url: string) => {
      // 1ª camada: a URL pedida pelo plano. Mesma função que o leitor-proxy roda em produção.
      const v = urlPermitida(url, p.allow as string[]);
      if (!v.ok) throw new RecusaDeRede(v.erro, url);
      // IP conferido ANTES de o Chromium abrir. Não fecha o rebinding (ele resolve de novo), mas
      // pega o caso comum — nome que já aponta pra dentro. Ver a nota em navegadorPolitica.ts.
      let ips: readonly { address: string }[];
      try { ips = await p.lookup(v.url.hostname); } catch { throw new RecusaDeRede("dns_falhou", url); }
      const ok = ipsAceitos(ips.map((x) => x.address));
      if (!ok.ok) throw new RecusaDeRede(ok.erro, url);
      await page.goto(v.url.toString(), { waitUntil: "domcontentloaded" });
    },
    click: async () => recusarEscrita("click"),
    type: async () => recusarEscrita("type"),
    readText: async (sel?: string) => {
      const texto = await page.evaluate((s: string | null) => {
        const el = s ? document.querySelector(s) : document.body;
        return el ? (el as HTMLElement).innerText ?? el.textContent ?? "" : "";
      }, sel ?? null);
      return String(texto ?? "").slice(0, AGENTE_MAX_TEXTO);
    },
    screenshot: async () => {
      const b = await page.screenshot({ type: "jpeg", quality: 60, encoding: "base64" });
      return String(b ?? "");
    },
    waitForHuman: async (reason: string) => {
      // NÃO é no-op: sem humano na página, prosseguir rodaria o próximo passo desautenticado.
      throw new RecusaDeRede(`sem_humano:${reason || "handoff"}`);
    },
    close: p.fechar,
  };
}

/**
 * Abre o navegador do agente. Devolve um `BrowserDriver` somente-leitura.
 * Quem chamar é responsável por `close()` — a rota faz isso num `finally`.
 */
export async function abrirNavegadorDoAgente(opts: OpcoesNavegadorDoAgente = {}): Promise<BrowserDriver> {
  const env = opts.env ?? process.env;
  const allow = opts.allow ?? allowDoAgente(env);
  if (!allow.length) throw new RecusaDeRede("allowlist_vazia");
  const caminho = opts.caminho !== undefined ? opts.caminho : caminhoDoChromium(env);
  if (!caminho) throw new RecusaDeRede("chromium_ausente");

  const timeoutMs = opts.timeoutMs ?? TIMEOUT_PADRAO_MS;
  const lookup: Lookup = opts.lookup ?? ((host) => dns.promises.lookup(host, { all: true, verbatim: true }));

  const pptr = await carregarPuppeteer();
  const browser = await pptr.launch(opcoesDeLancamentoDoAgente(caminho, allow, env, opts.extrasDeTeste ?? []));

  let page: any;
  try {
    page = (await browser.pages())[0] ?? (await browser.newPage());
    page.setDefaultNavigationTimeout(timeoutMs);
    page.setDefaultTimeout(timeoutMs);

    // 3ª camada: CADA pedido — navegação, redirect, subrecurso — passa pela mesma política.
    await page.setRequestInterception(true);
    page.on("request", (req: any) => {
      const v = decidirPedidoDoAgente(
        { url: req.url(), metodo: req.method(), tipo: req.resourceType() },
        allow,
      );
      if (v.ok) req.continue().catch(() => {});
      else req.abort("blockedbyclient").catch(() => {});
    });
  } catch (e) {
    await browser.close().catch(() => {});
    throw e;
  }

  return driverSobre(page as PaginaMinima, {
    allow,
    lookup,
    fechar: async () => { await browser.close().catch(() => {}); },
  });
}
