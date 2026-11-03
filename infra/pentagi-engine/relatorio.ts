/**
 * Relatório purple (Fase 4): para cada técnica EMULADA (do audit do motor),
 * cruza com a DETECÇÃO (telemetria do defensor) e diz detectado × passou.
 * Funções puras — recebem o que foi executado e os eventos, devolvem o relatório.
 */
import { avaliarDeteccao, type DetectionEvent, type DetectionRule, REGRAS_SIGMA } from "./deteccao";

export type TecnicaExecutada = { actionId: string; attackId?: string; decision: string; target: string };
export type LinhaPurple = { attackId: string; actionId: string; target: string; executada: boolean; detectada: boolean; regras: string[] };
export type RelatorioPurple = {
  linhas: LinhaPurple[];
  cobertura: { tecnicas: number; detectadas: number; passaram: number; percentual: number };
};

/** Só as ações permitidas (executadas de fato) e com ATT&CK ID entram no relatório. */
export function montarRelatorio(executadas: TecnicaExecutada[], eventos: DetectionEvent[], regras: DetectionRule[] = REGRAS_SIGMA): RelatorioPurple {
  const comAtaque = executadas.filter((t) => t.decision === "allowed" && t.attackId);
  const linhas: LinhaPurple[] = comAtaque.map((t) => {
    const det = avaliarDeteccao(t.attackId!, eventos, regras);
    return { attackId: t.attackId!, actionId: t.actionId, target: t.target, executada: true, detectada: det.detected, regras: det.rules };
  });
  const detectadas = linhas.filter((l) => l.detectada).length;
  return {
    linhas,
    cobertura: { tecnicas: linhas.length, detectadas, passaram: linhas.length - detectadas, percentual: linhas.length ? Math.round((detectadas / linhas.length) * 100) : 0 },
  };
}

/** Renderiza o relatório como markdown com as duas colunas (detectada? → regra). */
export function relatorioMarkdown(rel: RelatorioPurple): string {
  const linhas = rel.linhas.map((l) => `| ${l.attackId} | ${l.actionId} | ${l.target} | ${l.detectada ? "✅ detectada" : "⚠️ passou"} | ${l.regras.join(", ") || "—"} |`);
  return [
    `# Relatório purple — detecção × passou`,
    ``,
    `Cobertura: **${rel.cobertura.detectadas}/${rel.cobertura.tecnicas}** técnicas detectadas (${rel.cobertura.percentual}%); ${rel.cobertura.passaram} passaram sem detecção.`,
    ``,
    `| ATT&CK | ação | alvo | detecção | regra |`,
    `| --- | --- | --- | --- | --- |`,
    ...linhas,
    ``,
    `> "passou" = emulação executada no range sem a regra correspondente disparar — é um buraco de detecção para o lado azul fechar, não um comprometimento.`,
  ].join("\n");
}
