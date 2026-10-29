/**
 * Ações de recon READ-ONLY do motor (Fase 2). Nativas em Node — sem nmap, sem
 * nuclei, sem enviar payload. São as únicas coisas que tocam a rede nesta fase,
 * e só rodam DEPOIS que o motor autorizou o alvo (ver engine.ts). Nenhuma delas
 * muda estado no alvo: resolução de DNS, um GET de metadados, e um probe TCP de
 * conexão (abre/fecha, não manda dados).
 */
import { lookup } from "node:dns/promises";
import { Socket } from "node:net";

export type ReconResult = Record<string, unknown>;

/** Resolve o host e devolve os IPs (o motor usa isto internamente para revalidar o alvo). */
export async function dnsLookup(host: string): Promise<string[]> {
  const records = await lookup(host, { all: true });
  return records.map((r) => r.address);
}

/**
 * GET de metadados: status + um subconjunto seguro de headers + tamanho do corpo.
 * Nunca segue redirect, timeout curto. Se `connectIp` for dado e o alvo for http,
 * a conexão é FIXADA nesse IP (reescreve o host para o IP já validado e manda o
 * Host original no header) — fecha a janela de TOCTOU entre validar e conectar.
 * Para https com host DNS o pin de SNI fica para a Fase 2.1 (ver README).
 */
export async function httpMetadata(url: string, connectIp?: string, timeoutMs = 8000): Promise<ReconResult> {
  const safeHeaders = ["server", "content-type", "x-powered-by", "x-frame-options", "content-security-policy", "strict-transport-security", "set-cookie", "location", "x-aspnet-version", "via"];
  const target = new URL(url);
  const reqHeaders: Record<string, string> = {};
  let fetchUrl = url;
  if (connectIp && target.protocol === "http:" && target.hostname !== connectIp) {
    reqHeaders["host"] = target.host; // preserva o Host original
    target.hostname = connectIp;
    fetchUrl = target.toString();
  }
  const res = await fetch(fetchUrl, { method: "GET", redirect: "manual", headers: reqHeaders, signal: AbortSignal.timeout(timeoutMs) });
  const headers: Record<string, string> = {};
  for (const h of safeHeaders) { const v = res.headers.get(h); if (v) headers[h] = v.slice(0, 300); }
  let bodyBytes = 0;
  try { bodyBytes = (await res.arrayBuffer()).byteLength; } catch { /* corpo indisponível não é erro de recon */ }
  return { status: res.status, statusText: res.statusText, headers, bodyBytes };
}

const DEFAULT_PORTS = [21, 22, 25, 53, 80, 110, 143, 443, 445, 587, 993, 995, 1433, 3000, 3306, 3389, 5432, 6379, 8000, 8080, 8443, 9200, 27017];

/** Probe TCP de conexão: tenta abrir cada porta e fecha na hora. Read-only, não envia bytes. Portas limitadas e timeout curto. */
export async function tcpPorts(ip: string, ports: number[] = DEFAULT_PORTS, timeoutMs = 1200): Promise<ReconResult> {
  const alvo = [...new Set(ports)].filter((p) => Number.isInteger(p) && p >= 1 && p <= 65535).slice(0, 64);
  const probe = (port: number): Promise<"open" | "closed"> => new Promise((resolve) => {
    const socket = new Socket();
    let done = false;
    const finish = (state: "open" | "closed") => { if (done) return; done = true; socket.destroy(); resolve(state); };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish("open"));
    socket.once("timeout", () => finish("closed"));
    socket.once("error", () => finish("closed"));
    socket.connect(port, ip);
  });
  const results = await Promise.all(alvo.map(async (p) => [p, await probe(p)] as const));
  return { scanned: alvo.length, open: results.filter(([, s]) => s === "open").map(([p]) => p) };
}
