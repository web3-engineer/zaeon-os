import { afterEach, describe, expect, it } from "vitest";
import { generateKeyPairSync, sign, randomBytes } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalScope, type ScopeDocument } from "../../lib/pentest/scope";
import { verifyAuditFile } from "../../lib/pentest/audit";
import { MemoryApprovalNonceStore } from "../../lib/pentest/controls";
import { engineAuthorizeAndRun, type EngineConfig, type ReconRunner, type SignedApproval } from "./engine";

const scopeKeys = generateKeyPairSync("ed25519");
const approvalKeys = generateKeyPairSync("ed25519");
const scopePub = scopeKeys.publicKey.export({ type: "spki", format: "pem" }).toString();
const approvalPub = approvalKeys.publicKey.export({ type: "spki", format: "pem" }).toString();
const scope: ScopeDocument = {
  versao: 1,
  lab: "Lab sandbox local",
  alvos: [
    { tipo: "web", host: "127.0.0.1", portas: [3000], caminhos: ["/"], autorizacao: { por: "op", data: "2026-10-29", ref: "AUTH-1" } },
    { tipo: "web", host: "portal.lab.interno", portas: [3000], caminhos: ["/"], autorizacao: { por: "op", data: "2026-10-29", ref: "AUTH-2" } },
    { tipo: "rede", cidr: "127.0.0.0/8", portas: "1-65535", autorizacao: { por: "op", data: "2026-10-29", ref: "AUTH-1" } },
  ],
  janela: { inicio: "2026-10-01T00:00:00Z", fim: "2026-12-31T23:59:59Z" },
};
const scopeJson = JSON.stringify(scope);
const scopeSignature = sign(null, Buffer.from(canonicalScope(scope)), scopeKeys.privateKey).toString("base64");
const nowDate = new Date("2026-10-29T12:00:00.000Z");
const now = () => nowDate;
const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, ".000Z");

function signApproval(actionId: string, target: string, key = approvalKeys.privateKey): SignedApproval {
  const doc = {
    versao: 1 as const, approver: "aprovador-teste", actionId, target,
    nonce: randomBytes(24).toString("base64url"),
    issuedAt: iso(nowDate), expiresAt: iso(new Date(nowDate.getTime() + 10 * 60_000)),
  };
  return { json: JSON.stringify(doc), signature: sign(null, Buffer.from(canonicalScope(doc)), key).toString("base64") };
}

const dirs: string[] = [];
function tmp() { const d = mkdtempSync(join(tmpdir(), "pentagi-")); dirs.push(d); return d; }
afterEach(() => { while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true }); });

function baseConfig(opts: { kill?: "RUN" | "STOP"; resolveIps?: string[]; approvalPublicKey?: string; nonceStore?: MemoryApprovalNonceStore } = {}): EngineConfig & { auditPath: string } {
  const d = tmp();
  const killSwitchPath = join(d, "kill");
  writeFileSync(killSwitchPath, opts.kill ?? "RUN");
  const auditPath = join(d, "audit.jsonl");
  const resolveIps = opts.resolveIps ?? ["127.0.0.1"];
  const runner: ReconRunner = {
    dnsLookup: async () => resolveIps,
    httpMetadata: async () => ({ status: 200, headers: { server: "stub" }, bodyBytes: 10 }),
    tcpPorts: async (_ip, ports) => ({ scanned: ports.length, open: ports }),
    emulate: async (actionId) => ({ stub: actionId, status: 200 }),
  };
  return {
    scopeJson, scopeSignature, scopePublicKey: scopePub,
    approvalPublicKey: opts.approvalPublicKey ?? approvalPub,
    killSwitchPath, auditPath, now, resolve: async () => resolveIps, runner,
    nonceStore: opts.nonceStore,
  };
}

describe("pentagi-engine · Fase 2 (recon-only)", () => {
  it("permite recon web dentro do escopo e grava audit", async () => {
    const cfg = baseConfig();
    const d = await engineAuthorizeAndRun(cfg, { actionId: "recon.http.metadata", target: { tipo: "web", url: "http://127.0.0.1:3000/" } });
    expect(d).toMatchObject({ ok: true, impacto: "baixo_impacto", attackId: "T1594" });
    expect(await verifyAuditFile(cfg.auditPath)).toMatchObject({ valid: true, entries: 1 });
  });

  it("recusa ação desconhecida", async () => {
    const d = await engineAuthorizeAndRun(baseConfig(), { actionId: "exploit.web.sqli", target: { tipo: "web", url: "http://127.0.0.1:3000/" } });
    expect(d).toMatchObject({ ok: false, reason: "ACAO_DESCONHECIDA" });
  });

  it("barra rebinding: IP resolvido fora do escopo é recusado mesmo com host no escopo", async () => {
    const d = await engineAuthorizeAndRun(baseConfig({ resolveIps: ["203.0.113.9"] }), { actionId: "recon.http.metadata", target: { tipo: "web", url: "http://portal.lab.interno:3000/" } });
    expect(d.ok).toBe(false);
    expect((d as { reason: string }).reason).toMatch(/TARGET_DENIED/);
  });

  it("fail-closed com kill switch engajado", async () => {
    const d = await engineAuthorizeAndRun(baseConfig({ kill: "STOP" }), { actionId: "recon.dns.lookup", target: { tipo: "web", url: "http://127.0.0.1:3000/" } });
    expect(d).toMatchObject({ ok: false, reason: "KILL_SWITCH_ENGAGED" });
  });

  it("recusa fora da janela", async () => {
    const cfg = { ...baseConfig(), now: () => new Date("2027-01-01T00:00:00Z") };
    const d = await engineAuthorizeAndRun(cfg, { actionId: "recon.dns.lookup", target: { tipo: "web", url: "http://127.0.0.1:3000/" } });
    expect(d).toMatchObject({ ok: false, reason: "SCOPE_INVALID" });
  });

  it("tcp.ports só varre portas dentro do escopo", async () => {
    const d = await engineAuthorizeAndRun(baseConfig(), { actionId: "recon.tcp.ports", target: { tipo: "rede", ip: "127.0.0.1", portas: [3000, 8080] } });
    expect(d.ok).toBe(true);
    expect((d as unknown as { result: { open: number[] } }).result.open.sort()).toEqual([3000, 8080]);
  });

  it("recusa alvo de rede fora do escopo", async () => {
    const d = await engineAuthorizeAndRun(baseConfig(), { actionId: "recon.tcp.ports", target: { tipo: "rede", ip: "10.0.0.1", portas: [3000] } });
    expect((d as { reason: string }).reason).toMatch(/TARGET_DENIED/);
  });
});

describe("pentagi-engine · Fase 3 (emulação, alto impacto sob aprovação)", () => {
  const url = "http://127.0.0.1:3000/";
  const target = "http://127.0.0.1:3000/";
  const emu = "emulate.web.reflected_input";

  it("recusa emulação SEM aprovação", async () => {
    const d = await engineAuthorizeAndRun(baseConfig(), { actionId: emu, target: { tipo: "web", url } });
    expect(d).toMatchObject({ ok: false, reason: "HIGH_IMPACT_APPROVAL_REQUIRED" });
  });

  it("permite emulação COM aprovação válida e registra ATT&CK + aprovador", async () => {
    const cfg = baseConfig();
    const d = await engineAuthorizeAndRun(cfg, { actionId: emu, target: { tipo: "web", url }, approval: signApproval(emu, target) });
    expect(d).toMatchObject({ ok: true, impacto: "alto_impacto", attackId: "T1190", approver: "aprovador-teste" });
    const audit = await verifyAuditFile(cfg.auditPath);
    expect(audit).toMatchObject({ valid: true, entries: 1 });
  });

  it("recusa aprovação assinada pela MESMA chave do escopo", async () => {
    const cfg = baseConfig({ approvalPublicKey: scopePub });
    const d = await engineAuthorizeAndRun(cfg, { actionId: emu, target: { tipo: "web", url }, approval: signApproval(emu, target, scopeKeys.privateKey) });
    expect(d).toMatchObject({ ok: false, reason: "APPROVAL_KEY_NOT_DISTINCT" });
  });

  it("recusa aprovação ligada a OUTRO alvo", async () => {
    const d = await engineAuthorizeAndRun(baseConfig(), { actionId: emu, target: { tipo: "web", url }, approval: signApproval(emu, "http://outro.alvo/") });
    expect(d).toMatchObject({ ok: false, reason: "APPROVAL_BINDING_MISMATCH" });
  });

  it("recusa replay da MESMA aprovação (nonce)", async () => {
    const nonceStore = new MemoryApprovalNonceStore();
    const approval = signApproval(emu, target);
    const first = await engineAuthorizeAndRun(baseConfig({ nonceStore }), { actionId: emu, target: { tipo: "web", url }, approval });
    const second = await engineAuthorizeAndRun(baseConfig({ nonceStore }), { actionId: emu, target: { tipo: "web", url }, approval });
    expect(first.ok).toBe(true);
    expect(second).toMatchObject({ ok: false, reason: "APPROVAL_REPLAYED" });
  });
});
