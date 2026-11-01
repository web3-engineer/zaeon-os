/**
 * infra/pentagi-engine — o MOTOR isolado do pentest.
 *
 * É a autoridade de escopo: NÃO confia no app. Para cada ação ele repete toda a
 * verificação da lib (assinatura/janela/escopo), RE-RESOLVE o DNS ele mesmo e
 * revalida o IP, consulta o kill switch, e audita (encadeado por hash).
 *
 * Fase 2: recon read-only, de baixo impacto, autônomo.
 * Fase 3: emulação ATT&CK (conjunto FECHADO de sondas de detecção benignas) de
 *   ALTO IMPACTO — liberada só com APROVAÇÃO ASSINADA (chave distinta da do
 *   escopo, ligada a ação+alvo, ≤15 min, anti-replay). O app nunca executa
 *   ferramenta; fala HTTP com este motor.
 */
import { appendAudit } from "../../lib/pentest/audit";
import { checkKillSwitch, classifyAction, isDistinctPublicKey, MemoryApprovalNonceStore, verifyApproval, type ApprovalNonceStore } from "../../lib/pentest/controls";
import { matchTarget, parseAndVerifyScope, type ScopeCandidate, type VerifiedScope } from "../../lib/pentest/scope";
import { createHash, type KeyObject } from "node:crypto";
import { isIP } from "node:net";
import { dnsLookup, httpMetadata, tcpPorts, type ReconResult } from "./recon";
import { attackIdDe, EMULACAO, type EmuContext } from "./attack";
import { SCAN, type ScanContext } from "./scan";

/** Ações de recon da Fase 2 (baixo impacto, sem aprovação). */
export const PHASE2_RECON = new Set(["recon.dns.lookup", "recon.http.metadata", "recon.tcp.ports"]);

export type EngineTarget =
  | { tipo: "web"; url: string }
  | { tipo: "rede"; ip: string; portas: number[] };
export type SignedApproval = { json: string; signature: string };
export type EngineRequest = { actionId: string; operator?: string; target: EngineTarget; approval?: SignedApproval };

type PublicKeyInput = string | Buffer | KeyObject;
export type ReconRunner = {
  dnsLookup: (host: string) => Promise<string[]>;
  httpMetadata: (url: string, connectIp?: string) => Promise<ReconResult>;
  tcpPorts: (ip: string, ports: number[]) => Promise<ReconResult>;
  emulate: (actionId: string, ctx: EmuContext) => Promise<ReconResult>;
  scan: (actionId: string, ctx: ScanContext) => Promise<ReconResult>;
};
const defaultRunner: ReconRunner = {
  dnsLookup,
  httpMetadata: (url, connectIp) => httpMetadata(url, connectIp),
  tcpPorts,
  emulate: (actionId, ctx) => EMULACAO[actionId].run(ctx),
  scan: (actionId, ctx) => SCAN[actionId].run(ctx),
};

export type EngineConfig = {
  scopeJson: string;
  scopeSignature: string;
  scopePublicKey: PublicKeyInput;
  approvalPublicKey?: PublicKeyInput; // chave que valida aprovações de alto impacto (distinta da do escopo)
  killSwitchPath: string;
  auditPath: string;
  now?: () => Date;
  resolve?: (host: string) => Promise<string[]>;
  runner?: ReconRunner;
  nonceStore?: ApprovalNonceStore;
};

export type EngineDecision =
  | { ok: true; actionId: string; attackId?: string; target: string; impacto: "baixo_impacto" | "alto_impacto"; result: ReconResult; auditHash: string; approver?: string }
  | { ok: false; actionId: string; target: string; reason: string; auditHash?: string };

const processNonceStore = new MemoryApprovalNonceStore();

function hostFromWeb(url: string): string | null {
  try { const u = new URL(url); return u.hostname.startsWith("[") ? u.hostname.slice(1, -1) : u.hostname; } catch { return null; }
}
function safeTarget(t: EngineTarget): string {
  if (t.tipo === "web") { try { const u = new URL(t.url); return `${u.origin}${u.pathname}`; } catch { return "web:invalid"; } }
  return `${t.ip}:${(t.portas ?? []).slice(0, 8).join(",")}`;
}

/** Autoriza e executa UMA ação. Toda recusa também é auditada. */
export async function engineAuthorizeAndRun(config: EngineConfig, req: EngineRequest): Promise<EngineDecision> {
  const now = (config.now ?? (() => new Date()))();
  const operator = typeof req.operator === "string" && req.operator.trim() ? req.operator.trim().slice(0, 160) : "engine";
  const target = safeTarget(req.target);
  const actionId = typeof req.actionId === "string" ? req.actionId : "";
  const runner = config.runner ?? defaultRunner;
  const resolve = config.resolve ?? dnsLookup;
  const attackId = attackIdDe(actionId) ?? SCAN[actionId]?.attackId;

  const audit = async (decision: "allowed" | "denied", reason: string, evidence?: ReconResult): Promise<string | null> => {
    try {
      return await appendAudit(config.auditPath, {
        timestamp: now.toISOString().replace(/\.\d{3}Z$/, ".000Z"),
        operator, target, actionId: /^[A-Za-z0-9_.:-]{1,160}$/.test(actionId) ? actionId : "acao-invalida",
        ...(attackId ? { attackId } : {}),
        decision, reason: reason.slice(0, 500),
        ...(evidence ? { evidenceHash: createHash("sha256").update(JSON.stringify(evidence)).digest("hex") } : {}),
      });
    } catch { return null; }
  };
  const deny = async (reason: string): Promise<EngineDecision> => {
    const auditHash = await audit("denied", reason);
    return { ok: false, actionId, target, reason, ...(auditHash ? { auditHash } : {}) };
  };

  // 1. ação conhecida? recon (baixo impacto), ou procedimento de alto impacto (emulação/scan)?
  const ehRecon = PHASE2_RECON.has(actionId);
  const emu = EMULACAO[actionId];
  const scanEntry = SCAN[actionId];
  const proc = emu ?? scanEntry; // procedimentos de alto impacto habilitados no catálogo
  if (!ehRecon && !proc) return deny("ACAO_DESCONHECIDA");
  const impacto = proc || classifyAction(actionId) !== "baixo_impacto" ? "alto_impacto" : "baixo_impacto";

  // 2. kill switch (inacessível/engajado = fail-closed)
  const kill = await checkKillSwitch(config.killSwitchPath);
  if (!kill.allowed) return deny(kill.reason);

  // 3. escopo assinado válido, com o relógio do MOTOR
  let scope: VerifiedScope;
  try { scope = parseAndVerifyScope(config.scopeJson, config.scopeSignature, config.scopePublicKey, now); }
  catch { return deny("SCOPE_INVALID"); }

  // 4. re-resolver + revalidar o alvo contra o escopo
  let candidate: ScopeCandidate;
  let connectIp: string | undefined;
  let scanPorts: number[] = [];
  if (req.target.tipo === "web") {
    const host = hostFromWeb(req.target.url);
    if (!host) return deny("WEB_URL_INVALID");
    let resolvedIps: string[];
    try { resolvedIps = isIP(host) ? [host] : await resolve(host); } catch { return deny("DNS_RESOLVE_FAILED"); }
    candidate = { tipo: "web", url: req.target.url, resolvedIps };
    connectIp = resolvedIps[0];
    const decision = matchTarget(scope, candidate);
    if (!decision.allowed) return deny(`TARGET_DENIED:${decision.reason}`);
  } else {
    const ip = req.target.ip;
    const pedidas = Array.isArray(req.target.portas) ? req.target.portas : [];
    scanPorts = pedidas.filter((p) => matchTarget(scope, { tipo: "rede", ip, porta: p }).allowed);
    if (scanPorts.length === 0) return deny("TARGET_DENIED:NETWORK_OUTSIDE_SCOPE");
    candidate = { tipo: "rede", ip, porta: scanPorts[0] };
    connectIp = ip;
  }

  // 5. ALTO IMPACTO exige aprovação assinada por chave DISTINTA, ligada a ação+alvo
  let approver: string | undefined;
  if (impacto === "alto_impacto") {
    if (!proc) return deny("ALTO_IMPACTO_SEM_PROCEDIMENTO"); // só procedimento do catálogo (emulação/scan) é alto impacto habilitado
    if (proc.tipoAlvo === "web" && req.target.tipo !== "web") return deny("ACAO_EXIGE_ALVO_WEB");
    if (!config.approvalPublicKey) return deny("APPROVAL_PUBKEY_MISSING");
    if (!req.approval) return deny("HIGH_IMPACT_APPROVAL_REQUIRED");
    if (!isDistinctPublicKey(config.scopePublicKey, config.approvalPublicKey)) return deny("APPROVAL_KEY_NOT_DISTINCT");
    const checked = await verifyApproval({
      json: req.approval.json, signature: req.approval.signature, publicKey: config.approvalPublicKey,
      actionId, target, now, nonceStore: config.nonceStore ?? processNonceStore,
    });
    if (!checked.allowed) return deny(checked.reason);
    approver = checked.approver;
  }

  // 6. executar a ação e auditar com hash da evidência
  let result: ReconResult;
  try {
    if (actionId === "recon.dns.lookup") {
      const host = req.target.tipo === "web" ? hostFromWeb(req.target.url)! : req.target.ip;
      result = { host, ips: isIP(host) ? [host] : await resolve(host) };
    } else if (actionId === "recon.http.metadata") {
      if (req.target.tipo !== "web") return deny("ACAO_EXIGE_ALVO_WEB");
      result = await runner.httpMetadata(req.target.url, connectIp);
    } else if (actionId === "recon.tcp.ports") {
      if (req.target.tipo !== "rede") return deny("ACAO_EXIGE_ALVO_REDE");
      result = await runner.tcpPorts(connectIp!, scanPorts);
    } else if (emu) { // emulação (alto impacto, já aprovada)
      if (req.target.tipo !== "web") return deny("ACAO_EXIGE_ALVO_WEB");
      result = await runner.emulate(actionId, { url: req.target.url, connectIp });
    } else { // scan DAST (alto impacto, já aprovado)
      if (req.target.tipo !== "web") return deny("ACAO_EXIGE_ALVO_WEB");
      result = await runner.scan(actionId, { url: req.target.url, connectIp });
    }
  } catch (e) {
    return deny(`EXECUCAO_FALHOU:${String((e as Error)?.message ?? e).slice(0, 120)}`);
  }

  const auditHash = await audit("allowed", approver ? `OK_APROVADO_POR:${approver}` : "OK", result);
  if (!auditHash) return { ok: false, actionId, target, reason: "AUDIT_UNAVAILABLE" };
  return { ok: true, actionId, target, impacto, result, auditHash, ...(attackId ? { attackId } : {}), ...(approver ? { approver } : {}) };
}
