/**
 * Testes da capacidade de SCAN DAST (Fase 3.1). Em duas camadas:
 *   - unidade do scanner (buildNucleiArgs/parseNucleiJsonl/nucleiScan) com exec
 *     FALSO — não toca rede nem precisa do binário nuclei; prova o confinamento
 *     (pin de IP, allowlist, sem callback externo, descarte de achado fora do
 *     alvo, só metadados no registro);
 *   - nível-motor: o scan passa pelo MESMO gate de alto impacto da emulação
 *     (recusado sem aprovação, liberado com aprovação assinada por chave
 *     distinta, exige alvo web).
 */
import { afterEach, describe, expect, it } from "vitest";
import { generateKeyPairSync, sign, randomBytes } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalScope, type ScopeDocument } from "../../lib/pentest/scope";
import { verifyAuditFile } from "../../lib/pentest/audit";
import { buildNucleiArgs, parseNucleiJsonl, nucleiScan, type ScanExec } from "./scan";
import { engineAuthorizeAndRun, type EngineConfig, type ReconRunner, type SignedApproval } from "./engine";

// ---------------------------------------------------------------- unidade
describe("scan · unidade (sem rede, exec falso)", () => {
  it("fixa o http no IP validado e manda o Host original + confinamento", () => {
    const { bin, args, pinnedHost, allowedHosts } = buildNucleiArgs({ url: "http://portal.lab.interno:3000/app", connectIp: "127.0.0.1" });
    expect(bin).toBe("nuclei");
    expect(pinnedHost).toBe("127.0.0.1");
    // alvo reescrito pro IP, Host original preservado (anti-TOCTOU)
    const ti = args.indexOf("-target");
    expect(args[ti + 1]).toBe("http://127.0.0.1:3000/app");
    expect(args).toContain("-H");
    expect(args[args.indexOf("-H") + 1]).toBe("Host: portal.lab.interno:3000");
    // confinamento: fuzzing on, callback externo OFF, update OFF, saída parseável
    expect(args).toEqual(expect.arrayContaining(["-dast", "-no-interactsh", "-disable-update-check", "-jsonl"]));
    expect([...allowedHosts].sort()).toEqual(["127.0.0.1", "portal.lab.interno"]);
  });

  it("sem IP (https com host DNS) mantém a URL original e não pina", () => {
    const { args, pinnedHost, allowedHosts } = buildNucleiArgs({ url: "https://portal.lab.interno/" });
    expect(pinnedHost).toBe("portal.lab.interno");
    expect(args[args.indexOf("-target") + 1]).toBe("https://portal.lab.interno/");
    expect(args).not.toContain("-H");
    expect([...allowedHosts]).toEqual(["portal.lab.interno"]);
  });

  it("parseia JSONL em achados: só metadados, nunca o corpo/evidência", () => {
    const linha = JSON.stringify({
      "template-id": "reflected-xss", info: { name: "Reflected XSS", severity: "high", tags: ["xss", "dast"] },
      type: "http", host: "127.0.0.1:3000", "matched-at": "http://127.0.0.1:3000/app?q=1", ip: "127.0.0.1",
      request: "GET /app?q=<script>", response: "<html>DADO SECRETO</html>", "extracted-results": ["token=abc"],
    });
    const { findings, dropped } = parseNucleiJsonl(`${linha}\nlixo-nao-json\n`, { url: "http://127.0.0.1:3000/", connectIp: "127.0.0.1" }, new Set(["127.0.0.1"]));
    expect(dropped).toBe(0);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ templateId: "reflected-xss", name: "Reflected XSS", severity: "high", matchedAt: "http://127.0.0.1:3000/app?q=1" });
    // o corpo/requisição/evidência NÃO vazam pro registro
    const str = JSON.stringify(findings[0]);
    expect(str).not.toContain("DADO SECRETO");
    expect(str).not.toContain("token=abc");
    expect(findings[0]).not.toHaveProperty("response");
    expect(findings[0]).not.toHaveProperty("request");
  });

  it("descarta achado cujo IP/host caia FORA do alvo validado", () => {
    const foraIp = JSON.stringify({ "template-id": "x", info: { severity: "low" }, "matched-at": "http://127.0.0.1:3000/", ip: "8.8.8.8" });
    const foraHost = JSON.stringify({ "template-id": "y", info: { severity: "low" }, "matched-at": "http://evil.example/x" });
    const dentro = JSON.stringify({ "template-id": "z", info: { severity: "low" }, "matched-at": "http://127.0.0.1:3000/ok", ip: "127.0.0.1" });
    const { findings, dropped } = parseNucleiJsonl(`${foraIp}\n${foraHost}\n${dentro}\n`, { url: "http://127.0.0.1:3000/", connectIp: "127.0.0.1" }, new Set(["127.0.0.1"]));
    expect(dropped).toBe(2);
    expect(findings.map((f) => f.templateId)).toEqual(["z"]);
  });

  it("nucleiScan agrega contagem por severidade e repassa timedOut do exec", async () => {
    const stdout = [
      JSON.stringify({ "template-id": "a", info: { severity: "critical" }, "matched-at": "http://127.0.0.1:3000/a", ip: "127.0.0.1" }),
      JSON.stringify({ "template-id": "b", info: { severity: "high" }, "matched-at": "http://127.0.0.1:3000/b", ip: "127.0.0.1" }),
    ].join("\n");
    const fakeExec: ScanExec = async () => ({ stdout, stderr: "", code: 0, timedOut: true });
    const r = await nucleiScan({ url: "http://127.0.0.1:3000/", connectIp: "127.0.0.1" }, { exec: fakeExec });
    expect(r).toMatchObject({ tecnica: "nuclei-dast", total: 2, timedOut: true });
    expect((r as { counts: Record<string, number> }).counts).toMatchObject({ critical: 1, high: 1 });
  });

  it("exec que não acha o binário não derruba — vira resultado vazio", async () => {
    const fakeExec: ScanExec = async () => ({ stdout: "", stderr: "nuclei: not found", code: null, timedOut: false });
    const r = await nucleiScan({ url: "http://127.0.0.1:3000/", connectIp: "127.0.0.1" }, { exec: fakeExec });
    expect(r).toMatchObject({ tecnica: "nuclei-dast", total: 0 });
  });
});

// ------------------------------------------------------------ nível-motor
const scopeKeys = generateKeyPairSync("ed25519");
const approvalKeys = generateKeyPairSync("ed25519");
const scopePub = scopeKeys.publicKey.export({ type: "spki", format: "pem" }).toString();
const approvalPub = approvalKeys.publicKey.export({ type: "spki", format: "pem" }).toString();
const scope: ScopeDocument = {
  versao: 1, lab: "Lab scan",
  alvos: [
    { tipo: "web", host: "127.0.0.1", portas: [3000], caminhos: ["/"], autorizacao: { por: "op", data: "2026-10-29", ref: "A1" } },
    { tipo: "web", host: "portal.lab.interno", portas: [3000], caminhos: ["/"], autorizacao: { por: "op", data: "2026-10-29", ref: "A2" } },
    { tipo: "rede", cidr: "127.0.0.0/8", portas: "1-65535", autorizacao: { por: "op", data: "2026-10-29", ref: "A1" } },
  ],
  janela: { inicio: "2026-10-01T00:00:00Z", fim: "2026-12-31T23:59:59Z" },
};
const scopeJson = JSON.stringify(scope);
const scopeSignature = sign(null, Buffer.from(canonicalScope(scope)), scopeKeys.privateKey).toString("base64");
const nowDate = new Date("2026-10-29T12:00:00.000Z");
const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, ".000Z");
const SCAN = "scan.web.app";
const URL_ALVO = "http://127.0.0.1:3000/";

function signApproval(actionId: string, target: string, key = approvalKeys.privateKey): SignedApproval {
  const doc = {
    versao: 1 as const, approver: "aprovador-teste", actionId, target,
    nonce: randomBytes(24).toString("base64url"), issuedAt: iso(nowDate), expiresAt: iso(new Date(nowDate.getTime() + 10 * 60_000)),
  };
  return { json: JSON.stringify(doc), signature: sign(null, Buffer.from(canonicalScope(doc)), key).toString("base64") };
}

const dirs: string[] = [];
function tmp() { const d = mkdtempSync(join(tmpdir(), "scan-")); dirs.push(d); return d; }
afterEach(() => { while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true }); });

function cfg(over: Partial<EngineConfig> = {}): EngineConfig & { auditPath: string } {
  const d = tmp();
  const killSwitchPath = join(d, "kill");
  writeFileSync(killSwitchPath, "RUN");
  const runner: ReconRunner = {
    dnsLookup: async () => ["127.0.0.1"], httpMetadata: async () => ({ status: 200 }),
    tcpPorts: async (_i, p) => ({ open: p }), emulate: async (id) => ({ stub: id }),
    scan: async (id) => ({ tecnica: "nuclei-dast", total: 1, counts: { high: 1 }, findings: [{ templateId: id, severity: "high" }] }),
  };
  return {
    scopeJson, scopeSignature, scopePublicKey: scopePub, approvalPublicKey: approvalPub,
    killSwitchPath, auditPath: join(d, "audit.jsonl"), now: () => nowDate, resolve: async () => ["127.0.0.1"], runner, ...over,
  };
}

describe("scan · nível-motor (mesmo gate de alto impacto da emulação)", () => {
  it("recusa scan SEM aprovação", async () => {
    const d = await engineAuthorizeAndRun(cfg(), { actionId: SCAN, target: { tipo: "web", url: URL_ALVO } });
    expect(d).toMatchObject({ ok: false, reason: "HIGH_IMPACT_APPROVAL_REQUIRED" });
  });

  it("libera scan COM aprovação válida e grava ATT&CK + aprovador no audit", async () => {
    const c = cfg();
    const d = await engineAuthorizeAndRun(c, { actionId: SCAN, target: { tipo: "web", url: URL_ALVO }, approval: signApproval(SCAN, URL_ALVO) });
    expect(d).toMatchObject({ ok: true, impacto: "alto_impacto", attackId: "T1190", approver: "aprovador-teste" });
    expect((d as unknown as { result: { tecnica: string } }).result.tecnica).toBe("nuclei-dast");
    expect(await verifyAuditFile(c.auditPath)).toMatchObject({ valid: true, entries: 1 });
  });

  it("recusa aprovação assinada pela MESMA chave do escopo", async () => {
    const d = await engineAuthorizeAndRun(cfg({ approvalPublicKey: scopePub }), { actionId: SCAN, target: { tipo: "web", url: URL_ALVO }, approval: signApproval(SCAN, URL_ALVO, scopeKeys.privateKey) });
    expect(d).toMatchObject({ ok: false, reason: "APPROVAL_KEY_NOT_DISTINCT" });
  });

  it("barra rebinding: host no escopo mas IP resolvido fora", async () => {
    const d = await engineAuthorizeAndRun(cfg({ resolve: async () => ["203.0.113.9"] }), { actionId: SCAN, target: { tipo: "web", url: "http://portal.lab.interno:3000/" }, approval: signApproval(SCAN, "http://portal.lab.interno:3000/") });
    expect((d as { reason: string }).reason).toMatch(/TARGET_DENIED/);
  });

  it("exige alvo web (não roda scan em alvo de rede)", async () => {
    const d = await engineAuthorizeAndRun(cfg(), { actionId: SCAN, target: { tipo: "rede", ip: "127.0.0.1", portas: [3000] }, approval: signApproval(SCAN, "127.0.0.1:3000") });
    expect(d).toMatchObject({ ok: false, reason: "ACAO_EXIGE_ALVO_WEB" });
  });
});
