import { describe, it, expect, vi } from "vitest";
import { existsSync } from "node:fs";
import {
  RecusaDeRede,
  abrirNavegadorDoAgente,
  argsDoAgente,
  caminhoDoChromium,
  driverSobre,
  envDoAgente,
  opcoesDeLancamentoDoAgente,
  type Lookup,
  type PaginaMinima,
} from "@/lib/agent/navegadorServidor";

const allow = ["arxiv.org", "*.gov.br"];
const publico: Lookup = async () => [{ address: "93.184.216.34" }];

function pagina(over: Partial<PaginaMinima> = {}) {
  const vistos: string[] = [];
  const p: PaginaMinima = {
    goto: async (url: string) => { vistos.push(url); return null; },
    evaluate: async () => "texto da página",
    screenshot: async () => "AAAA",
    ...over,
  };
  return { p, vistos };
}

const drv = (p: PaginaMinima, lookup: Lookup = publico, lista = allow) =>
  driverSobre(p, { allow: lista, lookup, fechar: async () => {} });

// ───────────────────────── as duas travas de desenho ─────────────────────────

describe("TRAVA 1 — somente leitura: o DRIVER recusa escrita, não só o laço", () => {
  it("click e type lançam", async () => {
    const { p } = pagina();
    const d = drv(p);
    await expect(d.click("button")).rejects.toThrow(/somente_leitura:click/);
    await expect(d.type("input", "oi")).rejects.toThrow(/somente_leitura:type/);
  });

  it("a recusa é do driver — vale mesmo pra um caller que PASSE approve", async () => {
    // O `runAgentic` nega escrita quando falta `approve` (stop: "denied"). Isso é política do
    // caller: outro caller poderia passar um approve que sempre diz sim. O teste fixa que, nesse
    // caso, quem recusa é o driver — invariante que viaja com ele.
    const { runAgentic } = await import("@/lib/agent/agentic");
    const { p } = pagina();
    const r = await runAgentic("qualquer", {
      driver: drv(p),
      plan: async () => [{ kind: "click", selector: "button" }],
      approve: async () => true, // aprova TUDO, de propósito
    }, { execMode: "guiado" });
    expect(r.ok).toBe(false);
    expect(r.stop).toBe("error");
    expect(r.error).toMatch(/somente_leitura:click/);
  });
});

describe("TRAVA 2 — sem humano: waitForHuman LANÇA em vez de retomar na hora", () => {
  it("lança, com o motivo", async () => {
    const { p } = pagina();
    await expect(drv(p).waitForHuman("faça o login")).rejects.toThrow(/sem_humano:faça o login/);
  });

  it("um plano com handoff FALHA ALTO — não segue desautenticado", async () => {
    // Era o no-op que mentia: no connectBrowser, sem `onHandoff`, o handoff "retoma na hora" e o
    // passo seguinte rodaria como se alguém tivesse feito o login. Aqui o run morre em "error".
    const { runAgentic } = await import("@/lib/agent/agentic");
    const { p, vistos } = pagina();
    const r = await runAgentic("x", {
      driver: drv(p),
      plan: async () => [
        { kind: "handoff", reason: "entre na sua conta" },
        { kind: "navigate", url: "https://arxiv.org/depois" },
      ],
    });
    expect(r.stop).toBe("error");
    expect(r.error).toMatch(/sem_humano/);
    expect(vistos).toEqual([]); // o passo DEPOIS do handoff não rodou
  });
});

// ───────────────────────── goto: as camadas de rede ─────────────────────────

describe("goto — allowlist e IP antes de abrir", () => {
  it("abre o que está na lista", async () => {
    const { p, vistos } = pagina();
    await drv(p).goto("https://arxiv.org/abs/1");
    expect(vistos).toEqual(["https://arxiv.org/abs/1"]);
  });

  it("fora da lista nem chega na página", async () => {
    const { p, vistos } = pagina();
    await expect(drv(p).goto("https://evil.example/")).rejects.toThrow(/dominio_fora_da_lista/);
    expect(vistos).toEqual([]);
  });

  it("IP interno recusa ANTES do goto, mesmo com o domínio na lista", async () => {
    // O caso que a checagem de IP existe pra pegar: domínio liberado cujo DNS aponta pra dentro.
    const { p, vistos } = pagina();
    const interno: Lookup = async () => [{ address: "169.254.169.254" }];
    await expect(drv(p, interno).goto("https://arxiv.org/x")).rejects.toThrow(/ip_bloqueado/);
    expect(vistos).toEqual([]);
  });

  it("DNS que falha é recusa, não passe livre", async () => {
    const { p } = pagina();
    const quebrado: Lookup = async () => { throw new Error("ENOTFOUND"); };
    await expect(drv(p, quebrado).goto("https://arxiv.org/x")).rejects.toThrow(/dns_falhou/);
  });

  it("o hash sai da URL (o leitor-proxy faz igual)", async () => {
    const { p, vistos } = pagina();
    await drv(p).goto("https://arxiv.org/a#secao");
    expect(vistos[0]).toBe("https://arxiv.org/a");
  });

  it("lista vazia nega tudo", async () => {
    const { p } = pagina();
    await expect(drv(p, publico, []).goto("https://arxiv.org/x")).rejects.toThrow(/dominio_fora_da_lista/);
  });
});

describe("readText / screenshot", () => {
  it("corta o texto no teto (o cockpit não precisa de mais, e o plano não cabe)", async () => {
    const enorme = "x".repeat(50_000);
    const { p } = pagina({ evaluate: async () => enorme });
    const t = await drv(p).readText();
    expect(t.length).toBe(20_000);
  });

  it("texto vazio/ausente não vira 'undefined' em string", async () => {
    const { p } = pagina({ evaluate: async () => null });
    expect(await drv(p).readText("#nada")).toBe("");
  });

  it("screenshot devolve string", async () => {
    const { p } = pagina();
    expect(await drv(p).screenshot()).toBe("AAAA");
  });
});

// ───────────────────────── lançamento ─────────────────────────

describe("argsDoAgente", () => {
  it("leva as regras de resolução da allowlist (2ª camada)", () => {
    const a = argsDoAgente(allow, {} as Record<string, string | undefined>);
    const regra = a.find((x) => x.startsWith("--host-resolver-rules="));
    expect(regra).toContain("MAP * ~NOTFOUND");
    expect(regra).toContain("EXCLUDE arxiv.org");
    expect(regra).toContain("EXCLUDE gov.br");
    expect(regra).toContain("EXCLUDE *.gov.br");
  });

  it("--no-sandbox SÓ com a env da imagem", () => {
    expect(argsDoAgente(allow, {} as Record<string, string | undefined>)).not.toContain("--no-sandbox");
    expect(argsDoAgente(allow, { OCTA_CHROMIUM_SEM_SANDBOX: "1" } as Record<string, string | undefined>)).toContain("--no-sandbox");
  });

  it("NENHUM arg de furtividade/anti-detecção (trava de design do agentic.ts)", () => {
    const blob = argsDoAgente(allow, { OCTA_CHROMIUM_SEM_SANDBOX: "1" } as Record<string, string | undefined>).join(" ");
    expect(blob).not.toMatch(/stealth|fingerprint|spoof|proxy-server|user-agent/i);
  });

  it("o caminho de PRODUÇÃO não passa extra nenhum — e nenhuma env os liga", () => {
    // A costura `extrasDeTeste` existe pro smoke (certificado autoassinado). Se ela vazasse pro
    // default, `--ignore-certificate-errors` iria pra produção — TLS sem verificação no processo
    // que abre páginas de terceiro. O default tem de ser vazio, e nenhuma env deve mudá-lo.
    const prod = argsDoAgente(allow, { OCTA_CHROMIUM_SEM_SANDBOX: "1", AGENTE_SMOKE: "1" } as Record<string, string | undefined>);
    expect(prod.join(" ")).not.toContain("--ignore-certificate-errors");
    expect(argsDoAgente(allow, {} as Record<string, string | undefined>, ["--x"])).toContain("--x"); // só explícito entra
  });
});

describe("envDoAgente — o navegador NÃO recebe credencial", () => {
  it("só PATH/HOME/LANG/TZ", () => {
    // Esta é a asserção que sustenta pôr Chromium dentro do container credenciado: sem `env`, o
    // puppeteer repassa o process.env inteiro do `web` pro processo que abre páginas de terceiro.
    expect(Object.keys(envDoAgente()).sort()).toEqual(["HOME", "LANG", "PATH", "TZ"]);
  });

  it("nenhum segredo do processo atravessa", () => {
    vi.stubEnv("DATABASE_URL", "mongodb://u:p@host/db");
    vi.stubEnv("NEXTAUTH_SECRET", "segredo-do-auth");
    vi.stubEnv("PUSHER_SECRET", "segredo-do-pusher");
    const valores = Object.values(envDoAgente()).join(" ");
    for (const s of ["mongodb://", "segredo-do-auth", "segredo-do-pusher"]) {
      expect(valores).not.toContain(s);
    }
    vi.unstubAllEnvs();
  });

  it("HOME é própria, não a do Octa (dois Chromium com a mesma HOME disputam o lock do perfil)", async () => {
    const { envChromium } = await import("@/lib/octa/captura");
    expect(envDoAgente().HOME).not.toBe(envChromium().HOME);
  });
});

describe("opcoesDeLancamentoDoAgente", () => {
  it("headless SEMPRE (não há display no container) e pipe em vez de porta", () => {
    const o = opcoesDeLancamentoDoAgente("/usr/bin/chromium", allow, {} as Record<string, string | undefined>);
    expect(o.headless).toBe(true);
    expect(o.pipe).toBe(true);
    expect(o.executablePath).toBe("/usr/bin/chromium");
  });
});

describe("caminhoDoChromium", () => {
  it("OCTA_CHROMIUM_PATH manda", () => {
    expect(caminhoDoChromium({ OCTA_CHROMIUM_PATH: "/x/chromium" } as Record<string, string | undefined>)).toBe("/x/chromium");
  });
  it("env em branco = ausente: cai na sondagem, que só devolve caminho que EXISTE", () => {
    // Afirmar "devolve null" seria falso neste repositório (o container de dev tem o Chromium do
    // Playwright em /opt/pw-browsers) e verdadeiro em outro — teste que depende da máquina. O
    // invariante real é: ou null, ou um caminho que existe de fato.
    const c = caminhoDoChromium({ OCTA_CHROMIUM_PATH: "   " } as Record<string, string | undefined>);
    expect(c === null || existsSync(c)).toBe(true);
  });
});

describe("abrirNavegadorDoAgente — falha explícita antes de lançar nada", () => {
  it("allowlist vazia: recusa (não abre navegador que não pode ir a lugar nenhum)", async () => {
    await expect(abrirNavegadorDoAgente({ allow: [], env: {} as Record<string, string | undefined> }))
      .rejects.toThrow(/allowlist_vazia/);
  });

  it("sem chromium: recusa com o motivo", async () => {
    await expect(abrirNavegadorDoAgente({ allow, caminho: null, env: {} as Record<string, string | undefined> }))
      .rejects.toThrow(/chromium_ausente/);
  });

  it("a recusa é RecusaDeRede, com o campo `erro` legível pro cockpit", async () => {
    const e = await abrirNavegadorDoAgente({ allow: [], env: {} as Record<string, string | undefined> }).catch((x) => x);
    expect(e).toBeInstanceOf(RecusaDeRede);
    expect(e.erro).toBe("allowlist_vazia");
  });
});
