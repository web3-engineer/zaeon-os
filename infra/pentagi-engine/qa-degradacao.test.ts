/**
 * GATE DE RELEASE (Fase 5) — bateria de degradação. Tudo que o motor TEM que
 * recusar, com cripto real, num só lugar. Se qualquer caso aqui virar "allowed",
 * o pentest NÃO sobe. Mais um controle positivo, pra provar que o gate não está
 * só negando tudo.
 *
 * Cobre: escopo adulterado/chave errada/janela; kill switch (engajado/ausente/
 * não configurado); ação desconhecida; alvo fora do escopo (rede + rebinding
 * web); aprovação ausente/chave-igual/expirada/vitalícia-demais/binding/replay;
 * audit indisponível (fail-closed).
 *
 * Tetos por run e kill que mata processos filhos são Fase 5.1 (só fazem sentido
 * com procedimento de longa duração do lab).
 */
import { afterEach, describe, expect, it } from "vitest";
import { generateKeyPairSync, sign, randomBytes } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalScope, type ScopeDocument } from "../../lib/pentest/scope";
import { MemoryApprovalNonceStore } from "../../lib/pentest/controls";
import { engineAuthorizeAndRun, type EngineConfig, type ReconRunner, type SignedApproval } from "./engine";

const scopeKeys = generateKeyPairSync("ed25519");
const approvalKeys = generateKeyPairSync("ed25519");
const scopePub = scopeKeys.publicKey.export({ type: "spki", format: "pem" }).toString();
const approvalPub = approvalKeys.publicKey.export({ type: "spki", format: "pem" }).toString();
const scope: ScopeDocument = {
  versao: 1, lab: "Lab gate",
  alvos: [
    { tipo: "web", host: "127.0.0.1", portas: [3000], caminhos: ["/"], autorizacao: { por: "op", data: "2026-10-29", ref: "A1" } },
    { tipo: "web", host: "portal.lab.interno", portas: [3000], caminhos: ["/"], autorizacao: { por: "op", data: "2026-10-29", ref: "A2" } },
    { tipo: "rede", cidr: "127.0.0.0/8", portas: "1-65535", autorizacao: { por: "op", data: "2026-10-29", ref: "A1" } },
  ],
  janela: { inicio: "2026-10-01T00:00:00Z", fim: "2026-12-31T23:59:59Z" },
};
const scopeJson = JSON.stringify(scope);
const scopeSig = sign(null, Buffer.from(canonicalScope(scope)), scopeKeys.privateKey).toString("base64");
const nowDate = new Date("2026-10-29T12:00:00.000Z");
const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, ".000Z");
const EMU = "emulate.web.reflected_input";
const WEB = { tipo: "web" as const, url: "http://127.0.0.1:3000/" };
const TARGET = "http://127.0.0.1:3000/";

function signApproval(o: { action?: string; target?: string; key?: typeof approvalKeys.privateKey; issued?: Date; expires?: Date } = {}): SignedApproval {
  const issued = o.issued ?? nowDate;
  const doc = {
    versao: 1 as const, approver: "op", actionId: o.action ?? EMU, target: o.target ?? TARGET,
    nonce: randomBytes(24).toString("base64url"), issuedAt: iso(issued),
    expiresAt: iso(o.expires ?? new Date(issued.getTime() + 10 * 60_000)),
  };
  return { json: JSON.stringify(doc), signature: sign(null, Buffer.from(canonicalScope(doc)), o.key ?? approvalKeys.privateKey).toString("base64") };
}

const dirs: string[] = [];
function tmp() { const d = mkdtempSync(join(tmpdir(), "qa-")); dirs.push(d); return d; }
afterEach(() => { while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true }); });

const runner: ReconRunner = {
  dnsLookup: async () => ["127.0.0.1"], httpMetadata: async () => ({ status: 200 }),
  tcpPorts: async (_i, p) => ({ open: p }), emulate: async (id) => ({ stub: id }),
};
function cfg(over: Partial<EngineConfig> = {}): EngineConfig {
  const d = tmp();
  const killSwitchPath = join(d, "kill");
  writeFileSync(killSwitchPath, "RUN");
  return {
    scopeJson, scopeSignature: scopeSig, scopePublicKey: scopePub, approvalPublicKey: approvalPub,
    killSwitchPath, auditPath: join(d, "audit.jsonl"), now: () => nowDate,
    resolve: async () => ["127.0.0.1"], runner, ...over,
  };
}
const reasonOf = (d: Awaited<ReturnType<typeof engineAuthorizeAndRun>>) => (d as { reason?: string }).reason;

describe("GATE DE RELEASE · degradação (tudo isto TEM que recusar)", () => {
  it("controle positivo: recon válido é permitido", async () => {
    const d = await engineAuthorizeAndRun(cfg(), { actionId: "recon.dns.lookup", target: WEB });
    expect(d.ok).toBe(true);
  });

  it("escopo com assinatura adulterada", async () => {
    const bad = Buffer.from(scopeSig, "base64"); bad[10] ^= 0xff;
    const d = await engineAuthorizeAndRun(cfg({ scopeSignature: bad.toString("base64") }), { actionId: "recon.dns.lookup", target: WEB });
    expect(reasonOf(d)).toBe("SCOPE_INVALID");
  });

  it("escopo assinado por chave errada", async () => {
    const outra = generateKeyPairSync("ed25519");
    const sig = sign(null, Buffer.from(canonicalScope(scope)), outra.privateKey).toString("base64");
    const d = await engineAuthorizeAndRun(cfg({ scopeSignature: sig }), { actionId: "recon.dns.lookup", target: WEB });
    expect(reasonOf(d)).toBe("SCOPE_INVALID");
  });

  it("fora da janela (antes e depois)", async () => {
    for (const t of ["2026-09-30T00:00:00Z", "2027-02-01T00:00:00Z"]) {
      const d = await engineAuthorizeAndRun(cfg({ now: () => new Date(t) }), { actionId: "recon.dns.lookup", target: WEB });
      expect(reasonOf(d)).toBe("SCOPE_INVALID");
    }
  });

  it("kill switch engajado / ausente / não configurado", async () => {
    const engaged = tmp(); writeFileSync(join(engaged, "k"), "STOP");
    expect(reasonOf(await engineAuthorizeAndRun(cfg({ killSwitchPath: join(engaged, "k") }), { actionId: "recon.dns.lookup", target: WEB }))).toBe("KILL_SWITCH_ENGAGED");
    expect(reasonOf(await engineAuthorizeAndRun(cfg({ killSwitchPath: join(tmp(), "nao-existe") }), { actionId: "recon.dns.lookup", target: WEB }))).toBe("KILL_SWITCH_UNAVAILABLE");
    expect(reasonOf(await engineAuthorizeAndRun(cfg({ killSwitchPath: "" }), { actionId: "recon.dns.lookup", target: WEB }))).toBe("KILL_SWITCH_UNCONFIGURED");
  });

  it("ação desconhecida", async () => {
    expect(reasonOf(await engineAuthorizeAndRun(cfg(), { actionId: "exploit.qualquer", target: WEB }))).toBe("ACAO_DESCONHECIDA");
  });

  it("alvo de rede fora do escopo e rebinding web", async () => {
    expect(reasonOf(await engineAuthorizeAndRun(cfg(), { actionId: "recon.tcp.ports", target: { tipo: "rede", ip: "8.8.8.8", portas: [53] } }))).toMatch(/TARGET_DENIED/);
    const reb = cfg({ resolve: async () => ["203.0.113.9"] });
    expect(reasonOf(await engineAuthorizeAndRun(reb, { actionId: "recon.http.metadata", target: { tipo: "web", url: "http://portal.lab.interno:3000/" } }))).toMatch(/TARGET_DENIED/);
  });

  it("emulação: aprovação ausente", async () => {
    expect(reasonOf(await engineAuthorizeAndRun(cfg(), { actionId: EMU, target: WEB }))).toBe("HIGH_IMPACT_APPROVAL_REQUIRED");
  });

  it("emulação: chave de aprovação == chave do escopo", async () => {
    const d = await engineAuthorizeAndRun(cfg({ approvalPublicKey: scopePub }), { actionId: EMU, target: WEB, approval: signApproval({ key: scopeKeys.privateKey }) });
    expect(reasonOf(d)).toBe("APPROVAL_KEY_NOT_DISTINCT");
  });

  it("emulação: aprovação expirada", async () => {
    const d = await engineAuthorizeAndRun(cfg(), { actionId: EMU, target: WEB, approval: signApproval({ issued: new Date(nowDate.getTime() - 20 * 60_000), expires: new Date(nowDate.getTime() - 60_000) }) });
    expect(reasonOf(d)).toBe("APPROVAL_EXPIRED");
  });

  it("emulação: aprovação com vida > 15 min", async () => {
    const d = await engineAuthorizeAndRun(cfg(), { actionId: EMU, target: WEB, approval: signApproval({ expires: new Date(nowDate.getTime() + 30 * 60_000) }) });
    expect(reasonOf(d)).toBe("APPROVAL_LIFETIME_INVALID");
  });

  it("emulação: aprovação ligada a outro alvo/ação", async () => {
    expect(reasonOf(await engineAuthorizeAndRun(cfg(), { actionId: EMU, target: WEB, approval: signApproval({ target: "http://outro/" }) }))).toBe("APPROVAL_BINDING_MISMATCH");
    expect(reasonOf(await engineAuthorizeAndRun(cfg(), { actionId: EMU, target: WEB, approval: signApproval({ action: "emulate.web.suspicious_request" }) }))).toBe("APPROVAL_BINDING_MISMATCH");
  });

  it("emulação: replay da mesma aprovação", async () => {
    const nonceStore = new MemoryApprovalNonceStore();
    const approval = signApproval();
    expect((await engineAuthorizeAndRun(cfg({ nonceStore }), { actionId: EMU, target: WEB, approval })).ok).toBe(true);
    expect(reasonOf(await engineAuthorizeAndRun(cfg({ nonceStore }), { actionId: EMU, target: WEB, approval }))).toBe("APPROVAL_REPLAYED");
  });

  it("audit indisponível = fail-closed (nenhuma ação sem audit)", async () => {
    const d = tmp();
    const arquivo = join(d, "ocupado"); writeFileSync(arquivo, "x");
    const auditPath = join(arquivo, "sub", "audit.jsonl"); // dirname é um arquivo → mkdir falha
    const dec = await engineAuthorizeAndRun(cfg({ auditPath }), { actionId: "recon.dns.lookup", target: { tipo: "rede", ip: "127.0.0.1", portas: [3000] } });
    expect(dec).toMatchObject({ ok: false, reason: "AUDIT_UNAVAILABLE" });
  });
});
