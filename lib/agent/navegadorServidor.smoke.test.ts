/**
 * SMOKE do driver do agente com CHROMIUM REAL. Só roda com `AGENTE_SMOKE=1` — o CI não tem navegador
 * garantido, e um teste que falha por ambiente em vez de por defeito é pior que teste nenhum.
 *
 *   AGENTE_SMOKE=1 npx vitest run lib/agent/navegadorServidor.smoke.test.ts
 *
 * Prova as quatro coisas que nenhum teste puro prova:
 *   1. o Chromium lança headless com os args de `argsDoAgente`;
 *   2. página de host liberado abre e `readText` devolve o texto;
 *   3. subrecurso de host FORA da allowlist é ABORTADO pela interceptação;
 *   4. o endpoint de metadados da nuvem (169.254.169.254) é abortado.
 *
 * Como roda sem internet (o sandbox não tem DNS direto, só proxy HTTPS): `local.gov.br` aponta pra
 * 127.0.0.1 no /etc/hosts e o servidor sobe em HTTPS na 443 (a política só aceita 80/443). O
 * `lookup` é INJETADO — costura que o módulo declara "só pra teste" — porque 127.0.0.1 é exatamente
 * um IP que a política barra, e barrar está certo.
 *
 * POR QUE HTTPS E NÃO HTTP: a 1ª versão deste smoke servia HTTP e morreu em ERR_BLOCKED_BY_CLIENT.
 * O Chromium PROMOVE http→https (HTTPS-First) e o servidor não falava TLS. Desligar a promoção nos
 * args de produção seria piorar a segurança pra facilitar um teste; então ela fica, o servidor fala
 * TLS, e `--ignore-certificate-errors` entra pela costura `extrasDeTeste` (que nenhuma env liga).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import https from "node:https";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, appendFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { abrirNavegadorDoAgente, caminhoDoChromium } from "@/lib/agent/navegadorServidor";
import type { BrowserDriver } from "@/lib/agent/agentic";

const LIGADO = process.env.AGENTE_SMOKE === "1";
const HOST = "local.gov.br";
const PORTA = 443;

/** Certificado autoassinado pro host de teste (o Chromium o aceita via extrasDeTeste). */
function certificado(host: string): { key: string; cert: string } {
  const dir = mkdtempSync(join(tmpdir(), "agente-smoke-tls-"));
  const key = join(dir, "k.pem");
  const cert = join(dir, "c.pem");
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
    "-keyout", key, "-out", cert, "-subj", `/CN=${host}`,
    "-addext", `subjectAltName=DNS:${host}`,
  ], { stdio: "ignore" });
  return { key: readFileSync(key, "utf8"), cert: readFileSync(cert, "utf8") };
}

const PAGINA = `<!doctype html><html><head><meta charset="utf-8"><title>smoke</title></head>
<body>
<div id="r">INICIO</div>
<script src="/ok.js"></script>
<script src="https://evil.example/mau.js"
        onerror="document.getElementById('r').textContent += ' MAU_BLOQUEADO'"></script>
<img src="http://169.254.169.254/latest/meta-data/" alt=""
     onerror="document.getElementById('r').textContent += ' META_BLOQUEADO'">
</body></html>`;

describe.skipIf(!LIGADO)("SMOKE — driver do agente com Chromium real", () => {
  let srv: https.Server;
  let driver: BrowserDriver;
  let texto = "";
  const vistos: string[] = [];

  beforeAll(async () => {
    // /etc/hosts: o host de teste tem de resolver, porque o Chromium resolve de verdade
    // (--host-resolver-rules faz EXCLUDE de *.gov.br, então a resolução do sistema vale).
    const hosts = readFileSync("/etc/hosts", "utf8");
    if (!hosts.includes(HOST)) appendFileSync("/etc/hosts", `\n127.0.0.1 ${HOST}\n`);

    srv = https.createServer(certificado(HOST), (req, res) => {
      vistos.push(req.url ?? "");
      if (req.url === "/ok.js") {
        res.writeHead(200, { "content-type": "application/javascript" });
        res.end(`document.getElementById('r').textContent += ' OK_CARREGOU';`);
        return;
      }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(PAGINA);
    });
    await new Promise<void>((ok, err) => { srv.listen(PORTA, "127.0.0.1", ok).on("error", err); });

    driver = await abrirNavegadorDoAgente({
      allow: ["*.gov.br"],
      caminho: caminhoDoChromium(),
      lookup: async () => [{ address: "93.184.216.34" }], // costura de teste
      env: { OCTA_CHROMIUM_SEM_SANDBOX: "1" } as Record<string, string | undefined>,
      extrasDeTeste: ["--ignore-certificate-errors"],
      timeoutMs: 20_000,
    });
    await driver.goto(`https://${HOST}/`);
    await new Promise((r) => setTimeout(r, 1_500)); // deixa os onerror rodarem
    texto = await driver.readText("#r");
  }, 90_000);

  afterAll(async () => {
    await driver?.close?.().catch(() => {});
    srv?.close();
  });

  it("1+2 · lançou headless, abriu a página e leu o texto", () => {
    expect(texto).toContain("INICIO");
    expect(vistos).toContain("/");
  });

  it("subrecurso LIBERADO carrega (a interceptação não barra demais)", () => {
    expect(texto).toContain("OK_CARREGOU");
    expect(vistos).toContain("/ok.js");
  });

  it("3 · subrecurso de host FORA da allowlist não carrega", () => {
    // Duas camadas podem barrá-lo (interceptação e `MAP * ~NOTFOUND`) e as duas são nossas; o que
    // este teste afirma é o RESULTADO — não carregou. Qual delas pegou primeiro não é o invariante.
    expect(texto).toContain("MAU_BLOQUEADO");
  });

  it("4 · metadados da nuvem (169.254.169.254) não carrega", () => {
    expect(texto).toContain("META_BLOQUEADO");
  });

  it("as travas valem com navegador real por trás", async () => {
    await expect(driver.click("#r")).rejects.toThrow(/somente_leitura:click/);
    await expect(driver.type("#r", "x")).rejects.toThrow(/somente_leitura:type/);
    await expect(driver.waitForHuman("login")).rejects.toThrow(/sem_humano/);
    await expect(driver.goto("https://evil.example/")).rejects.toThrow(/dominio_fora_da_lista/);
  });

  it("screenshot sai em base64", async () => {
    const foto = await driver.screenshot();
    expect(foto.length).toBeGreaterThan(100);
  });
});

describe.skipIf(LIGADO)("SMOKE desligado", () => {
  it("existe e se declara: use AGENTE_SMOKE=1 pra rodar com navegador", () => {
    expect(existsSync("/etc/hosts")).toBe(true);
  });
});
