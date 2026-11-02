/**
 * Lado defensivo do purple-team (Fase 4). Mede DETECÇÃO: dado o que foi emulado,
 * o lado azul pegou? A telemetria vem de uma fonte que o DEFENSOR controla (log
 * de acesso, SIEM/IDS) — nunca do que o atacante diz que fez (seria circular).
 *
 * Aqui ficam regras declarativas estilo Sigma mapeadas a ATT&CK e o avaliador.
 * No sandbox a fonte é o log de acesso do alvo; no lab real é o Wazuh/Suricata/
 * Sigma (costura por env PENTEST_SIEM_URL — ver README), que entrega os mesmos
 * eventos normalizados.
 */
export type DetectionEvent = { ts?: string; method?: string; path?: string; query?: string; ua?: string; status?: number };
export type DetectionRule = { id: string; attackId: string; titulo: string; match: (e: DetectionEvent) => boolean };

/** Base da técnica (T1595.002 → T1595) para casar regra com sub-técnica. */
const base = (id: string) => id.split(".")[0];

/** Conjunto inicial de regras (o lab amplia). Cada uma mapeia a um ATT&CK ID. */
export const REGRAS_SIGMA: DetectionRule[] = [
  { id: "scanner-sensitive-paths", attackId: "T1595.002", titulo: "GET a caminhos sensíveis (assinatura de scanner)", match: (e) => /\/(\.git|\.env|server-status|phpinfo|admin|wp-admin|actuator)(\/|$|\.)/i.test(e.path ?? "") },
  { id: "input-reflection-probe", attackId: "T1190", titulo: "Parâmetro de sonda de reflexão", match: (e) => /pentest_probe=/.test(`${e.path ?? ""}?${e.query ?? ""}`) },
  { id: "scanner-user-agent", attackId: "T1595", titulo: "User-Agent de scanner conhecido", match: (e) => /scanner|nuclei|sqlmap|nikto|dirb|gobuster/i.test(e.ua ?? "") },
];

export type DetectionResult = { detected: boolean; rules: string[] };

/** A técnica emulada foi detectada? Casa pela família ATT&CK (base) contra os eventos do defensor. */
export function avaliarDeteccao(attackId: string, eventos: DetectionEvent[], regras: DetectionRule[] = REGRAS_SIGMA): DetectionResult {
  const relevantes = regras.filter((r) => base(r.attackId) === base(attackId));
  const hit = new Set<string>();
  for (const e of eventos) for (const r of relevantes) if (r.match(e)) hit.add(r.id);
  return { detected: hit.size > 0, rules: [...hit] };
}

/** Parser de um log de acesso JSONL (uma linha = um evento). Linhas inválidas são ignoradas. */
export function parseAccessLog(texto: string): DetectionEvent[] {
  const eventos: DetectionEvent[] = [];
  for (const linha of texto.split("\n")) {
    const t = linha.trim();
    if (!t) continue;
    try {
      const o = JSON.parse(t) as Record<string, unknown>;
      eventos.push({
        ts: typeof o.ts === "string" ? o.ts : undefined,
        method: typeof o.method === "string" ? o.method : undefined,
        path: typeof o.path === "string" ? o.path : undefined,
        query: typeof o.query === "string" ? o.query : undefined,
        ua: typeof o.ua === "string" ? o.ua : undefined,
        status: typeof o.status === "number" ? o.status : undefined,
      });
    } catch { /* linha não-JSON é ignorada */ }
  }
  return eventos;
}
