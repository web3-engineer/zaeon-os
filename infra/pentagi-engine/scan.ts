/**
 * Capacidade de SCAN de app web (Fase 3.1) — scanner DAST de verdade (Nuclei),
 * não sonda benigna. É de ALTO IMPACTO: manda payload (XSS/SQLi/injeção), então
 * só roda com APROVAÇÃO assinada, exatamente como a emulação (ver engine.ts).
 *
 * Confinamento (o scanner faz as próprias conexões, então o pin do motor não
 * basta sozinho):
 *   1. UMA URL do escopo por vez — nunca crawler que siga link pra outro host;
 *   2. para http, a conexão é fixada no IP já validado (URL reescrita pro IP +
 *      header Host original), igual ao pinnedFetch do recon (anti-TOCTOU);
 *   3. callbacks externos (interactsh/OOB) DESLIGADOS — o scan não pode virar
 *      canal de exfiltração pra fora;
 *   4. allowlist de classes de template (as da classe OWASP de app), tetos de
 *      taxa/concorrência/tempo, e kill do processo-filho no timeout;
 *   5. achado cujo host/IP caia FORA do alvo validado é descartado (defesa em
 *      profundidade); o registro guarda só metadados do achado — NUNCA o corpo
 *      da resposta.
 *
 * A garantia dura de egress (o SO só deixa falar com o IP do escopo) é a amarra
 * do HOST do lab — mesma história do host isolado; ver README. https com host
 * DNS cai no original (pin de SNI é o mesmo débito do recon, Fase 2.1).
 *
 * "Funciona de verdade" precisa do binário `nuclei` + templates no host do lab
 * (env PENTEST_NUCLEI_BIN). Aqui o exec é injetável para o teste não tocar rede.
 */
import { spawn } from "node:child_process";
import type { ReconResult } from "./recon";

export type ScanContext = { url: string; connectIp?: string };

export type ScanEntry = {
  actionId: string;
  attackId: string; // formato ATT&CK (T####[.###])
  titulo: string;
  tipoAlvo: "web";
  run: (ctx: ScanContext) => Promise<ReconResult>;
};

/** Resultado de uma execução do scanner externo. */
export type ScanExecResult = { stdout: string; stderr: string; code: number | null; timedOut: boolean };
/** Executor injetável (default = spawn do nuclei); o teste substitui pra não tocar rede. */
export type ScanExec = (file: string, args: string[], opts: { timeoutMs: number }) => Promise<ScanExecResult>;

export type ScanOptions = {
  exec?: ScanExec;
  bin?: string;
  tags?: string[];
  rateLimit?: number;
  concurrency?: number;
  requestTimeoutSec?: number;
  timeoutMs?: number;
  maxStdoutBytes?: number;
};

/** Allowlist de classes de template: a classe OWASP de APP (payload), não CVE de serviço/rede (próxima capacidade). */
export const SCAN_TAGS = ["xss", "sqli", "injection", "lfi", "rce", "ssrf", "ssti", "xxe", "redirect", "exposure", "misconfiguration", "default-login"];

const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_MAX_STDOUT = 8 * 1024 * 1024;

/** Default: spawn do nuclei num grupo de processo próprio, pra matar a árvore no timeout. */
const defaultExec: ScanExec = (file, args, opts) =>
  new Promise<ScanExecResult>((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let child;
    try {
      child = spawn(file, args, { stdio: ["ignore", "pipe", "pipe"], detached: true });
    } catch (e) {
      return resolve({ stdout: "", stderr: String((e as Error)?.message ?? e).slice(0, 400), code: null, timedOut: false });
    }
    const matar = () => { try { process.kill(-child!.pid!, "SIGKILL"); } catch { try { child!.kill("SIGKILL"); } catch { /* já morto */ } } };
    const killer = setTimeout(() => { timedOut = true; matar(); }, opts.timeoutMs);
    child.stdout?.on("data", (c: Buffer) => { stdout += c.toString(); if (stdout.length > DEFAULT_MAX_STDOUT) { timedOut = true; matar(); } });
    child.stderr?.on("data", (c: Buffer) => { if (stderr.length < 4000) stderr += c.toString().slice(0, 4000); });
    child.on("error", (e) => { clearTimeout(killer); resolve({ stdout, stderr: stderr || String(e?.message ?? e).slice(0, 400), code: null, timedOut }); });
    child.on("close", (code) => { clearTimeout(killer); resolve({ stdout, stderr, code, timedOut }); });
  });

export type ScanArgs = { bin: string; args: string[]; pinnedHost: string; allowedHosts: Set<string> };

/** Monta o argv do nuclei com o alvo fixado no IP validado + confinamento. */
export function buildNucleiArgs(ctx: ScanContext, opts: ScanOptions = {}): ScanArgs {
  const bin = opts.bin ?? process.env.PENTEST_NUCLEI_BIN ?? "nuclei";
  const u = new URL(ctx.url);
  const originalHost = u.host; // host[:porta]
  const allowedHosts = new Set<string>([u.hostname]);
  let targetUrl = ctx.url;
  let pinnedHost = u.hostname;
  const header: string[] = [];
  if (ctx.connectIp && u.protocol === "http:" && u.hostname !== ctx.connectIp) {
    const pinned = new URL(ctx.url);
    pinned.hostname = ctx.connectIp;
    targetUrl = pinned.toString();
    pinnedHost = ctx.connectIp;
    header.push("-H", `Host: ${originalHost}`);
  }
  if (ctx.connectIp) allowedHosts.add(ctx.connectIp);
  const tags = (opts.tags ?? SCAN_TAGS).join(",");
  const args = [
    "-target", targetUrl,
    ...header,
    "-dast",                    // modo fuzzing: é o que realmente testa injeção/XSS (classe OWASP)
    "-tags", tags,
    "-jsonl",                   // saída JSON por linha, parseável
    "-silent", "-nc",           // sem banner, sem cor
    "-disable-update-check",
    "-no-interactsh",           // SEM callback externo (confinamento)
    "-rate-limit", String(opts.rateLimit ?? 50),
    "-c", String(opts.concurrency ?? 10),
    "-timeout", String(opts.requestTimeoutSec ?? 10),
    "-retries", "0",
  ];
  return { bin, args, pinnedHost, allowedHosts };
}

export type ScanFinding = { templateId: string; name?: string; severity: string; tags?: string[]; type?: string; matchedAt?: string };

const SEVERIDADES = ["info", "low", "medium", "high", "critical"] as const;

function hostDe(valor: unknown): string | null {
  if (typeof valor !== "string" || !valor) return null;
  try { return new URL(valor).hostname.replace(/^\[|\]$/g, ""); } catch { return valor.split(/[:/]/)[0] || null; }
}

/**
 * Parseia o JSONL do nuclei em achados — SÓ metadados (template-id, nome,
 * severidade, matched-at). Nunca request/response/extracted-results (podem ter
 * corpo/dado). Descarta achado cujo host/IP caia fora do alvo validado.
 */
export function parseNucleiJsonl(stdout: string, ctx: ScanContext, allowedHosts: Set<string>): { findings: ScanFinding[]; dropped: number } {
  const findings: ScanFinding[] = [];
  let dropped = 0;
  for (const linha of stdout.split("\n")) {
    const t = linha.trim();
    if (!t || t[0] !== "{") continue;
    let o: Record<string, unknown>;
    try { o = JSON.parse(t) as Record<string, unknown>; } catch { continue; }
    const info = (o["info"] && typeof o["info"] === "object" ? o["info"] : {}) as Record<string, unknown>;
    const matchedAt = typeof o["matched-at"] === "string" ? (o["matched-at"] as string) : undefined;
    // confinamento: o achado tem que estar no alvo validado
    const ip = typeof o["ip"] === "string" ? (o["ip"] as string) : null;
    if (ctx.connectIp && ip && ip !== ctx.connectIp) { dropped++; continue; }
    const achadoHost = hostDe(matchedAt) ?? (typeof o["host"] === "string" ? hostDe(o["host"] as string) : null);
    if (achadoHost && !allowedHosts.has(achadoHost)) { dropped++; continue; }
    const templateId = typeof o["template-id"] === "string" ? (o["template-id"] as string) : "desconhecido";
    const severityRaw = typeof info["severity"] === "string" ? (info["severity"] as string).toLowerCase() : "info";
    findings.push({
      templateId,
      ...(typeof info["name"] === "string" ? { name: (info["name"] as string).slice(0, 200) } : {}),
      severity: (SEVERIDADES as readonly string[]).includes(severityRaw) ? severityRaw : "info",
      ...(Array.isArray(info["tags"]) ? { tags: (info["tags"] as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 20) } : {}),
      ...(typeof o["type"] === "string" ? { type: (o["type"] as string).slice(0, 40) } : {}),
      ...(matchedAt ? { matchedAt: matchedAt.slice(0, 400) } : {}),
    });
    if (findings.length >= 1000) break; // teto defensivo
  }
  return { findings, dropped };
}

function contar(findings: ScanFinding[]): Record<string, number> {
  const counts: Record<string, number> = { info: 0, low: 0, medium: 0, high: 0, critical: 0 };
  for (const f of findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  return counts;
}

/** Roda o scanner DAST contra UMA URL do escopo, já validada e pinada pelo motor. */
export async function nucleiScan(ctx: ScanContext, opts: ScanOptions = {}): Promise<ReconResult> {
  const { bin, args, pinnedHost, allowedHosts } = buildNucleiArgs(ctx, opts);
  const exec = opts.exec ?? defaultExec;
  const timeoutMs = opts.timeoutMs ?? Number(process.env.PENTEST_SCAN_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  const { stdout, code, timedOut } = await exec(bin, args, { timeoutMs });
  const { findings, dropped } = parseNucleiJsonl(stdout, ctx, allowedHosts);
  return {
    tecnica: "nuclei-dast",
    exitCode: code,
    timedOut,
    pinnedHost,
    tags: opts.tags ?? SCAN_TAGS,
    total: findings.length,
    counts: contar(findings),
    findings,
    ...(dropped ? { foraDoAlvoDescartados: dropped } : {}),
  };
}

/** Catálogo FECHADO de scans habilitados — mesma forma da emulação, mesmo gate de alto impacto. */
export const SCAN: Record<string, ScanEntry> = {
  "scan.web.app": {
    actionId: "scan.web.app",
    attackId: "T1190", // Exploit Public-Facing Application (manda payload da classe OWASP)
    tipoAlvo: "web",
    titulo: "Scan DAST de app web (classe OWASP: injeção/XSS/exposição) via Nuclei",
    run: (ctx) => nucleiScan(ctx),
  },
};
