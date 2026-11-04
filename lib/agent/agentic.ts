/**
 * lib/agent/agentic.ts — MODO AGENTIC (aditivo). Agente de navegador de USO GERAL, human-in-the-loop.
 *
 * Um runner À PARTE: NÃO toca no motor de trajetória (trajectory.ts) nem no runtime de tools
 * (runtime.ts). Ligado por opt-in (`AGENTIC_MODE`, default OFF), como o `AURA_HARNESS` é dos outros.
 *
 * COMO FUNCIONA (igual ao resto do lib/agent): tudo INJETADO e PURO/testável —
 *   - `driver`  : o navegador (seam `BrowserDriver`; o real é Playwright HEADED, via import TARDIO);
 *   - `plan`    : o planejador (LLM em prod; nos testes, um roteiro fixo). Devolve ações "por partes";
 *   - `approve` : a janela do admin — confirma cada COMANDO de escrita no modo guiado;
 *   - `emit`    : progresso pro cockpit (mesmo vocabulário visível de passos do action bus).
 *
 * CO-BROWSING: humano e agente na MESMA página (driver headed). Um `handoff` devolve o volante ao
 * humano (`waitForHuman`) — é assim que VOCÊ faz o login: o agente NUNCA digita credencial.
 *
 * ⟦TRAVA DE DESIGN — não é promessa, é código⟧ `guardAction` recusa qualquer ação de FURTIVIDADE /
 * anti-detecção / CAPTCHA (stealth, spoof de fingerprint, rotação de proxy p/ evadir, resolver captcha,
 * "burlar/driblar o anti-bot"). O driver real não carrega plugin stealth, não falseia fingerprint e não
 * resolve captcha. Se um site bloqueia automação, ele bloqueia — a ferramenta é honesta sobre ser uma
 * ferramenta. Isso tem teste (agentic.test.ts).
 *
 * ⚠️ O Playwright não está instalado neste ambiente e não há navegador p/ smoke-test no CI. As partes
 * PURAS (guarda, normalização, risco, laço, orçamento) são 100% testadas; `connectBrowser` exige
 * `npm i playwright` + uma sessão viva (smoke-test do dono), igual ao `connectMcp` do pilar Conectores.
 */

// ───────────────────────────── tipos ─────────────────────────────
export type AgenticActionKind = "navigate" | "find" | "type" | "click" | "read" | "screenshot" | "handoff" | "done";
export type AgenticRisk = "read" | "write";
export type ExecMode = "auto" | "guiado";

export type AgenticAction = {
  kind: AgenticActionKind;
  url?: string;         // navigate
  selector?: string;    // find/type/click/read (CSS ou texto)
  target?: string;      // descrição humana do alvo ("barra de pesquisa")
  text?: string;        // type
  secret?: boolean;     // campo sensível → NUNCA digitado pelo agente (vira handoff)
  reason?: string;      // handoff: por que devolve o controle ao humano
  risk?: AgenticRisk;   // sobrepõe o default (click/type = write)
  label?: string;       // texto humano pro cockpit
};

export type GuardVerdict = { ok: true } | { ok: false; reason: string };

export type AgenticEventKind = "step" | "handoff" | "approval" | "blocked" | "done" | "error";
export type AgenticEvent = {
  kind: AgenticEventKind;
  action?: AgenticAction;
  label: string;
  status?: "running" | "done" | "error" | "waiting" | "blocked";
  detail?: string;
};

export type AgenticStop = "done" | "maxSteps" | "timeout" | "blocked" | "denied" | "error";

export type AgenticResult = {
  ok: boolean;
  stop: AgenticStop;
  executed: AgenticAction[];
  readings: string[];
  handoffs: number;
  error?: string;
};

export interface BrowserDriver {
  goto(url: string): Promise<void>;
  click(selector: string): Promise<void>;
  type(selector: string, text: string): Promise<void>;
  readText(selector?: string): Promise<string>;
  screenshot(): Promise<string>;
  /** CO-BROWSING: devolve o controle ao humano na MESMA página e espera ele terminar (ex.: login). */
  waitForHuman(reason: string): Promise<void>;
  close(): Promise<void>;
}

export type AgenticPlanner = (instruction: string, ctx: AgenticRunContext) => Promise<AgenticAction[]>;

export type AgenticDeps = {
  driver: BrowserDriver;
  plan: AgenticPlanner;
  approve?: (a: AgenticAction) => Promise<boolean>;
  emit?: (ev: AgenticEvent) => void;
  now?: () => number;
};

export type AgenticRunContext = {
  /** "guiado" (default) = admin confirma todo comando de escrita; "auto" = libera escrita sem perguntar. */
  execMode?: ExecMode;
  maxSteps?: number;      // default 25
  maxDurationMs?: number; // default 30 min — o "30 minutos" do pedido
};

// ───────────────────────────── trava de design (furtividade/CAPTCHA) ─────────────────────────────
const STEALTH =
  /stealth|undetect|anti.?bot|anti.?detect|fingerprint|spoof|evad|bypass|captcha|recaptcha|hcaptcha|puppeteer.?extra|playwright.?stealth|rotate.?prox|rotacion.?.*prox|disfarc|furtiv|driblar|burlar/i;

/** Recusa qualquer ação cujo texto revele intenção de furtividade/anti-detecção/CAPTCHA. */
export function guardAction(a: AgenticAction): GuardVerdict {
  const blob = [a.kind, a.url, a.selector, a.target, a.text, a.reason, a.label].filter(Boolean).join(" ");
  if (STEALTH.test(blob)) return { ok: false, reason: "ação de furtividade/anti-detecção/CAPTCHA recusada por design" };
  return { ok: true };
}

// ───────────────────────────── login é sempre do humano ─────────────────────────────
const SECRET_FIELD = /pass(word)?|senha|otp|2fa|mfa|c[óo]digo|token|cvv|cart[aã]o|secret|cred/i;

/** `type` em campo de credencial → handoff. O agente NUNCA carrega o segredo (nem no evento). */
export function normalizeAction(a: AgenticAction): AgenticAction {
  if (a.kind === "type" && (a.secret || SECRET_FIELD.test(`${a.selector ?? ""} ${a.target ?? ""}`))) {
    return {
      kind: "handoff",
      reason: a.reason ?? "campo sensível — o login/credencial é sempre teu: faça você nesta mesma página",
      label: a.label ?? "Aguardando você fazer o login",
    };
  }
  return a;
}

// ───────────────────────────── risco × aprovação ─────────────────────────────
export function actionRisk(a: AgenticAction): AgenticRisk {
  if (a.risk) return a.risk;
  return a.kind === "click" || a.kind === "type" ? "write" : "read";
}

/** guiado (ou sem modo) pede aprovação em escrita; auto libera; leitura nunca pede. */
export function needsApproval(a: AgenticAction, execMode?: ExecMode): boolean {
  return actionRisk(a) === "write" && execMode !== "auto";
}

// ───────────────────────────── o laço ─────────────────────────────
const noop = () => {};

export async function runAgentic(
  instruction: string,
  deps: AgenticDeps,
  ctx: AgenticRunContext = {},
): Promise<AgenticResult> {
  const emit = deps.emit ?? noop;
  const now = deps.now ?? Date.now;
  const execMode: ExecMode = ctx.execMode ?? "guiado";
  const maxSteps = ctx.maxSteps ?? 25;
  const maxDurationMs = ctx.maxDurationMs ?? 30 * 60_000;

  const executed: AgenticAction[] = [];
  const readings: string[] = [];
  let handoffs = 0;
  const result = (stop: AgenticStop, ok: boolean, error?: string): AgenticResult =>
    ({ ok, stop, executed, readings, handoffs, ...(error ? { error } : {}) });

  let actions: AgenticAction[];
  try {
    actions = await deps.plan(instruction, { execMode, maxSteps, maxDurationMs });
  } catch (e: any) {
    emit({ kind: "error", label: "falha ao planejar", status: "error" });
    return result("error", false, String(e?.message ?? e));
  }
  if (!Array.isArray(actions)) actions = [];

  const start = now();
  let steps = 0;

  for (const raw of actions) {
    if (now() - start >= maxDurationMs) { emit({ kind: "done", label: "tempo esgotado (30 min)", status: "done" }); return result("timeout", true); }
    if (steps >= maxSteps) { emit({ kind: "done", label: "limite de passos", status: "done" }); return result("maxSteps", true); }

    const a = normalizeAction(raw);

    const g = guardAction(a);
    if (!g.ok) { emit({ kind: "blocked", action: a, label: g.reason, status: "blocked" }); return result("blocked", false, g.reason); }

    steps++;

    try {
      if (a.kind === "done") { emit({ kind: "done", label: a.label ?? "pronto", status: "done" }); return result("done", true); }

      if (a.kind === "handoff") {
        emit({ kind: "handoff", action: a, label: a.label ?? a.reason ?? "sua vez", status: "waiting" });
        await deps.driver.waitForHuman(a.reason ?? "");
        handoffs++;
        emit({ kind: "handoff", action: a, label: "controle retomado", status: "done" });
        continue;
      }

      if (needsApproval(a, execMode)) {
        emit({ kind: "approval", action: a, label: a.label ?? `confirmar: ${a.kind}`, status: "waiting" });
        const ok = deps.approve ? await deps.approve(a).catch(() => false) : false;
        if (!ok) { emit({ kind: "blocked", action: a, label: "comando não aprovado pelo admin", status: "blocked" }); return result("denied", false); }
      }

      switch (a.kind) {
        case "navigate": await deps.driver.goto(a.url ?? ""); break;
        case "find":     await deps.driver.readText(a.selector ?? a.target); break;
        case "type":     await deps.driver.type(a.selector ?? a.target ?? "", a.text ?? ""); break;
        case "click":    await deps.driver.click(a.selector ?? a.target ?? ""); break;
        case "read":     readings.push(await deps.driver.readText(a.selector ?? a.target)); break;
        case "screenshot": await deps.driver.screenshot(); break;
      }
      executed.push(a);
      emit({ kind: "step", action: a, label: a.label ?? a.kind, status: "done" });
    } catch (e: any) {
      emit({ kind: "error", action: a, label: "erro ao executar o passo", status: "error" });
      return result("error", false, String(e?.message ?? e));
    }
  }

  emit({ kind: "done", label: "pronto", status: "done" });
  return result("done", true);
}

// ───────────────────────────── flag (opt-in, não mexe nos outros modos) ─────────────────────────────
const truthy = (v: unknown) => ["1", "true", "on"].includes(String(v ?? "").toLowerCase());

/** O modo agentic está ligado? OFF por padrão; `AGENTIC_MODE=1|true|on` liga. */
export function agenticEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return truthy(env.AGENTIC_MODE);
}

// ───────────────────────────── driver real (Playwright HEADED, import TARDIO) ─────────────────────────────
export type ConnectBrowserOpts = {
  headless?: boolean;        // default false → HEADED (co-browsing: você vê e interage)
  userDataDir?: string;      // perfil persistente (a sessão de login sobrevive)
  /** Resolve quando VOCÊ terminar o handoff no cockpit (login etc.). Sem ele, retoma na hora. */
  onHandoff?: (reason: string) => Promise<void>;
};

/**
 * Abre o navegador real (import TARDIO do Playwright — o build passa sem o pacote; o dono instala).
 * HEADED e com contexto PERSISTENTE: humano e agente na mesma janela, login sobrevive entre runs.
 * NENHUM plugin stealth, NENHUM spoof de fingerprint, NENHUM solver de CAPTCHA — de propósito.
 */
export async function connectBrowser(opts: ConnectBrowserOpts = {}): Promise<BrowserDriver> {
  const mod: string = "playwright"; // specifier não-literal → tsc não resolve o pacote ausente
  const { chromium } = await import(mod);
  const context = await chromium.launchPersistentContext(opts.userDataDir ?? ".agentic-profile", {
    headless: opts.headless ?? false,
    viewport: null,
  });
  const page = context.pages()[0] ?? (await context.newPage());
  return {
    goto: async (url: string) => { await page.goto(url, { waitUntil: "domcontentloaded" }); },
    click: async (sel: string) => { await page.click(sel); },
    type: async (sel: string, text: string) => { await page.fill(sel, text); },
    readText: async (sel?: string) => (sel ? page.innerText(sel) : page.innerText("body")),
    screenshot: async () => (await page.screenshot()).toString("base64"),
    waitForHuman: async (reason: string) => { if (opts.onHandoff) await opts.onHandoff(reason); },
    close: async () => { await context.close().catch(() => {}); },
  };
}
