/**
 * Catálogo ATT&CK do motor (Fase 3). CONJUNTO FECHADO — o cliente não injeta
 * payload; só pede uma entrada por ID. As ações de emulação são de ALTO IMPACTO
 * e exigem aprovação assinada (ver engine.ts).
 *
 * Princípio de segurança: estas são SONDAS DE DETECÇÃO benignas, não exploração.
 * Cada uma faz uma requisição canônica cujo propósito é gerar telemetria para o
 * lado azul medir (o ponto do purple-team). Registram só metadados (status,
 * reflexão de um marcador aleatório) — NUNCA o corpo da resposta, nunca dump de
 * dados, nunca cadeia de exploração. Ferramentas pesadas (Caldera/Metasploit/
 * sqlmap) são costura que o lab liga no host isolado dele, atrás deste mesmo
 * portão — não entram como código aqui.
 */
import { randomBytes } from "node:crypto";
import { pinnedFetch, type ReconResult } from "./recon";

export type EmuContext = { url: string; connectIp?: string };
export type EmulationEntry = {
  actionId: string;
  attackId: string; // formato ATT&CK (T####[.###])
  titulo: string;
  tipoAlvo: "web";
  run: (ctx: EmuContext) => Promise<ReconResult>;
};

/** Mapa ATT&CK das ações de recon (Fase 2), para o relatório purple. */
export const RECON_ATTACK: Record<string, string> = {
  "recon.dns.lookup": "T1590.002",   // Gather Victim Network Information: DNS
  "recon.http.metadata": "T1594",    // Search Victim-Owned Websites
  "recon.tcp.ports": "T1046",        // Network Service Discovery
};

/** Sonda de reflexão: manda um marcador ALEATÓRIO benigno e vê se volta refletido. Sem payload de ataque. */
async function reflectedInput(ctx: EmuContext): Promise<ReconResult> {
  const marker = `zpt-${randomBytes(6).toString("hex")}`;
  const u = new URL(ctx.url);
  u.searchParams.set("pentest_probe", marker);
  const res = await pinnedFetch(u.toString(), ctx.connectIp, { timeoutMs: 8000 });
  let refletido = false;
  try { refletido = (await res.text()).includes(marker); } catch { /* sem corpo não é erro */ }
  return { tecnica: "input-reflection", status: res.status, markerRefletido: refletido };
}

/** Assinatura de scanner: GET de caminhos sensíveis canônicos com UA de scanner. Só o STATUS é registrado. */
async function suspiciousRequest(ctx: EmuContext): Promise<ReconResult> {
  const paths = ["/.git/config", "/server-status", "/admin", "/phpinfo.php"];
  const u = new URL(ctx.url);
  const requests: Array<{ path: string; status: number }> = [];
  for (const p of paths) {
    u.pathname = p; u.search = "";
    try {
      const res = await pinnedFetch(u.toString(), ctx.connectIp, { headers: { "user-agent": "pentest-scanner/1.0 (lab)" }, timeoutMs: 6000 });
      requests.push({ path: p, status: res.status }); // só o status; o corpo é descartado
      try { await res.arrayBuffer(); } catch { /* descarta corpo */ }
    } catch { requests.push({ path: p, status: 0 }); }
  }
  return { tecnica: "vuln-scan-signature", requests };
}

export const EMULACAO: Record<string, EmulationEntry> = {
  "emulate.web.reflected_input": {
    actionId: "emulate.web.reflected_input", attackId: "T1190", tipoAlvo: "web",
    titulo: "Sonda de reflexão de entrada (teste de validação/XSS, detecção)", run: reflectedInput,
  },
  "emulate.web.suspicious_request": {
    actionId: "emulate.web.suspicious_request", attackId: "T1595.002", tipoAlvo: "web",
    titulo: "Assinatura de varredura de vulnerabilidade (caminhos sensíveis)", run: suspiciousRequest,
  },
};

/** ATT&CK ID de qualquer ação conhecida (recon ou emulação), para o audit/relatório. */
export function attackIdDe(actionId: string): string | undefined {
  return EMULACAO[actionId]?.attackId ?? RECON_ATTACK[actionId];
}
