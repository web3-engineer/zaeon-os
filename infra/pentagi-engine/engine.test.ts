import { afterEach, describe, expect, it } from "vitest";
import { generateKeyPairSync, sign } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalScope, type ScopeDocument } from "../../lib/pentest/scope";
import { verifyAuditFile } from "../../lib/pentest/audit";
import { engineAuthorizeAndRun, type EngineConfig, type ReconRunner } from "./engine";

const keys = generateKeyPairSync("ed25519");
const pub = keys.publicKey.export({ type: "spki", format: "pem" }).toString();
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
const scopeSignature = sign(null, Buffer.from(canonicalScope(scope)), keys.privateKey).toString("base64");
const now = () => new Date("2026-10-29T12:00:00.000Z");

const dirs: string[] = [];
function tmp() { const d = mkdtempSync(join(tmpdir(), "pentagi-")); dirs.push(d); return d; }
afterEach(() => { while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true }); });

function baseConfig(kill: "RUN" | "STOP" = "RUN", resolveIps = ["127.0.0.1"]): EngineConfig & { auditPath: string; runner: ReconRunner } {
  const d = tmp();
  const killSwitchPath = join(d, "kill");
  writeFileSync(killSwitchPath, kill);
  const auditPath = join(d, "audit.jsonl");
  const runner: ReconRunner = {
    dnsLookup: async () => resolveIps,
    httpMetadata: async () => ({ status: 200, headers: { server: "stub" }, bodyBytes: 10 }),
    tcpPorts: async (_ip, ports) => ({ scanned: ports.length, open: ports }),
  };
  return { scopeJson, scopeSignature, scopePublicKey: pub, killSwitchPath, auditPath, now, resolve: async () => resolveIps, runner };
}

describe("pentagi-engine · autoridade de escopo (recon-only)", () => {
  it("permite recon web dentro do escopo e grava audit", async () => {
    const cfg = baseConfig();
    const d = await engineAuthorizeAndRun(cfg, { actionId: "recon.http.metadata", target: { tipo: "web", url: "http://127.0.0.1:3000/" } });
    expect(d.ok).toBe(true);
    const audit = await verifyAuditFile(cfg.auditPath);
    expect(audit).toMatchObject({ valid: true, entries: 1 });
  });

  it("recusa ação de alto impacto no próprio motor", async () => {
    const cfg = baseConfig();
    const d = await engineAuthorizeAndRun(cfg, { actionId: "exploit.web.sqli", target: { tipo: "web", url: "http://127.0.0.1:3000/" } });
    expect(d).toMatchObject({ ok: false, reason: "ACAO_FORA_DA_FASE2" });
  });

  it("barra rebinding: IP resolvido fora do escopo é recusado mesmo com host no escopo", async () => {
    const cfg = baseConfig("RUN", ["203.0.113.9"]);
    const d = await engineAuthorizeAndRun(cfg, { actionId: "recon.http.metadata", target: { tipo: "web", url: "http://portal.lab.interno:3000/" } });
    expect(d.ok).toBe(false);
    expect((d as { reason: string }).reason).toMatch(/TARGET_DENIED/);
  });

  it("fail-closed com kill switch engajado", async () => {
    const cfg = baseConfig("STOP");
    const d = await engineAuthorizeAndRun(cfg, { actionId: "recon.dns.lookup", target: { tipo: "web", url: "http://127.0.0.1:3000/" } });
    expect(d).toMatchObject({ ok: false, reason: "KILL_SWITCH_ENGAGED" });
  });

  it("recusa fora da janela", async () => {
    const cfg = { ...baseConfig(), now: () => new Date("2027-01-01T00:00:00Z") };
    const d = await engineAuthorizeAndRun(cfg, { actionId: "recon.dns.lookup", target: { tipo: "web", url: "http://127.0.0.1:3000/" } });
    expect(d).toMatchObject({ ok: false, reason: "SCOPE_INVALID" });
  });

  it("tcp.ports só varre portas dentro do escopo", async () => {
    const cfg = baseConfig();
    const d = await engineAuthorizeAndRun(cfg, { actionId: "recon.tcp.ports", target: { tipo: "rede", ip: "127.0.0.1", portas: [3000, 8080] } });
    expect(d.ok).toBe(true);
    expect((d as unknown as { result: { open: number[] } }).result.open.sort()).toEqual([3000, 8080]);
  });

  it("recusa alvo de rede fora do escopo", async () => {
    const cfg = baseConfig();
    const d = await engineAuthorizeAndRun(cfg, { actionId: "recon.tcp.ports", target: { tipo: "rede", ip: "10.0.0.1", portas: [3000] } });
    expect(d).toMatchObject({ ok: false });
    expect((d as { reason: string }).reason).toMatch(/TARGET_DENIED/);
  });
});
