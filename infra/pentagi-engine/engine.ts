/**
 * infra/pentagi-engine — o MOTOR isolado do pentest (Fase 2, recon-only).
 *
 * É a autoridade de escopo: NÃO confia no app. Para cada ação ele repete toda a
 * verificação da lib (assinatura/janela/escopo), classifica o impacto, consulta
 * o kill switch, RE-RESOLVE o DNS ele mesmo e revalida o IP, e só então roda uma
 * ação de recon read-only — gravando o audit confiável (encadeado por hash).
 *
 * Nesta fase só existe recon de baixo impacto. Qualquer coisa de alto impacto é
 * recusada aqui mesmo (sem caminho de aprovação na Fase 2), em cima da trava de
 * escopo. O app nunca executa ferramenta; ele fala HTTP com este motor.
 */
import { appendAudit } from "../../lib/pentest/audit";
import { checkKillSwitch, classifyAction } from "../../lib/pentest/controls";
import { matchTarget, parseAndVerifyScope, type ScopeCandidate, type VerifiedScope } from "../../lib/pentest/scope";
import { createHash, type KeyObject } from "node:crypto";
import { isIP } from "node:net";
import { dnsLookup, httpMetadata, tcpPorts, type ReconResult } from "./recon";

/** Só estas ações existem na Fase 2. Defesa em profundidade além do classifyAction. */
export const PHASE2_RECON = new Set(["recon.dns.lookup", "recon.http.metadata", "recon.tcp.ports"]);

export type EngineTarget =
  | { tipo: "web"; url: string }
  | { tipo: "rede"; ip: string; portas: number[] };
export type EngineRequest = { actionId: string; operator?: string; target: EngineTarget };

export type ReconRunner = {
  dnsLookup: (host: string) => Promise<string[]>;
  httpMetadata: (url: string, connectIp?: string) => Promise<ReconResult>;
  tcpPorts: (ip: string, ports: number[]) => Promise<ReconResult>;
};
const defaultRunner: ReconRunner = {
  dnsLookup,
  httpMetadata: (url, connectIp) => httpMetadata(url, connectIp),
  tcpPorts,
};

export type EngineConfig = {
  scopeJson: string;
  scopeSignature: string;
  scopePublicKey: string | Buffer | KeyObject;
  killSwitchPath: string;
  auditPath: string;
  now?: () => Date;
  resolve?: (host: string) => Promise<string[]>; // o motor resolve o DNS por conta própria
  runner?: ReconRunner;
};

export type EngineDecision =
  | { ok: true; actionId: string; target: string; result: ReconResult; auditHash: string }
  | { ok: false; actionId: string; target: string; reason: string; auditHash?: string };

function hostFromWeb(url: string): string | null {
  try { const u = new URL(url); return u.hostname.startsWith("[") ? u.hostname.slice(1, -1) : u.hostname; } catch { return null; }
}
function safeTarget(t: EngineTarget): string {
  if (t.tipo === "web") { try { const u = new URL(t.url); return `${u.origin}${u.pathname}`; } catch { return "web:invalid"; } }
  return `${t.ip}:${(t.portas ?? []).slice(0, 8).join(",")}`;
}

/**
 * Autoriza e executa UMA ação. Toda recusa também é auditada. O motor resolve o
 * DNS e revalida o IP; nunca aceita IP vindo do cliente para alvo web.
 */
export async function engineAuthorizeAndRun(config: EngineConfig, req: EngineRequest): Promise<EngineDecision> {
  const now = (config.now ?? (() => new Date()))();
  const operator = typeof req.operator === "string" && req.operator.trim() ? req.operator.trim().slice(0, 160) : "engine";
  const target = safeTarget(req.target);
  const actionId = typeof req.actionId === "string" ? req.actionId : "";
  const runner = config.runner ?? defaultRunner;
  const resolve = config.resolve ?? dnsLookup;

  const audit = async (decision: "allowed" | "denied", reason: string, evidence?: ReconResult): Promise<string | null> => {
    try {
      return await appendAudit(config.auditPath, {
        timestamp: now.toISOString().replace(/\.\d{3}Z$/, ".000Z"),
        operator, target, actionId: /^[A-Za-z0-9_.:-]{1,160}$/.test(actionId) ? actionId : "acao-invalida",
        decision, reason: reason.slice(0, 500),
        ...(evidence ? { evidenceHash: createHash("sha256").update(JSON.stringify(evidence)).digest("hex") } : {}),
      });
    } catch { return null; }
  };
  const deny = async (reason: string): Promise<EngineDecision> => {
    const auditHash = await audit("denied", reason);
    return { ok: false, actionId, target, reason, ...(auditHash ? { auditHash } : {}) };
  };

  // 1. ação conhecida e de baixo impacto (Fase 2 não habilita alto impacto)
  if (!PHASE2_RECON.has(actionId)) return deny("ACAO_FORA_DA_FASE2");
  if (classifyAction(actionId) !== "baixo_impacto") return deny("ALTO_IMPACTO_NAO_HABILITADO");

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
    // cada porta é validada individualmente contra o escopo; só as autorizadas entram
    scanPorts = pedidas.filter((p) => matchTarget(scope, { tipo: "rede", ip, porta: p }).allowed);
    if (scanPorts.length === 0) return deny("TARGET_DENIED:NETWORK_OUTSIDE_SCOPE");
    candidate = { tipo: "rede", ip, porta: scanPorts[0] };
    connectIp = ip;
  }

  // 5. executar a ação de recon (read-only) e auditar com hash da evidência
  let result: ReconResult;
  try {
    if (actionId === "recon.dns.lookup") {
      const host = req.target.tipo === "web" ? hostFromWeb(req.target.url)! : req.target.ip;
      result = { host, ips: isIP(host) ? [host] : await resolve(host) };
    } else if (actionId === "recon.http.metadata") {
      if (req.target.tipo !== "web") return deny("ACAO_EXIGE_ALVO_WEB");
      result = await runner.httpMetadata(req.target.url, connectIp);
    } else { // recon.tcp.ports
      if (req.target.tipo !== "rede") return deny("ACAO_EXIGE_ALVO_REDE");
      result = await runner.tcpPorts(connectIp!, scanPorts);
    }
  } catch (e) {
    return deny(`RECON_FALHOU:${String((e as Error)?.message ?? e).slice(0, 120)}`);
  }

  const auditHash = await audit("allowed", "RECON_OK", result);
  if (!auditHash) return { ok: false, actionId, target, reason: "AUDIT_UNAVAILABLE" };
  return { ok: true, actionId, target, result, auditHash };
}
