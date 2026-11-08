/**
 * lib/orquestra/saude.ts — a SAÚDE DO CHAT, medida do TokenLedger (docs/HERMES_ZAEON.md · GET /saude).
 *
 * É como o console verifica se as correções de experiência funcionaram, com número de produção e não com
 * impressão: tempo por fase (p50/p90), taxa de falha, quanto foi servido pela RESERVA (o aluno recebeu outra
 * família de modelo), modelo aposentado (404), e quantos TURNOS (taskId) passaram por cada problema.
 * PURA: recebe as linhas do ledger, devolve o resumo — testável sem banco.
 */

export type LinhaSaude = {
  at: Date | string; phase: string | null; provedor: string; alvo: string | null; ok: boolean;
  erro: string | null; ms: number; model: string; taskId: string | null; surface?: string | null;
};

const pct = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };
const taxa = (a: number, b: number) => (b ? Math.round((a / b) * 10_000) / 10_000 : 0);

export function saudeDoChat(linhas: LinhaSaude[], horas: number, agora = new Date()) {
  const porFase = new Map<string, LinhaSaude[]>();
  const porAlvo = new Map<string, number>();
  const porErro = new Map<string, number>();
  const porModelo = new Map<string, { chamadas: number; falhas: number }>();
  const porHora = new Map<string, LinhaSaude[]>();
  const turnos = new Map<string, { reserva: boolean; falhaFinal: boolean; aposentado: boolean }>();

  for (const l of linhas) {
    const fase = l.phase || "sem_fase";
    (porFase.get(fase) ?? porFase.set(fase, []).get(fase)!).push(l);
    const alvo = l.alvo || l.provedor;
    porAlvo.set(alvo, (porAlvo.get(alvo) ?? 0) + 1);
    if (!l.ok && l.erro) porErro.set(l.erro, (porErro.get(l.erro) ?? 0) + 1);
    const m = porModelo.get(l.model) ?? { chamadas: 0, falhas: 0 };
    m.chamadas++; if (!l.ok) m.falhas++; porModelo.set(l.model, m);
    const hora = new Date(l.at).toISOString().slice(0, 13) + ":00:00Z";
    (porHora.get(hora) ?? porHora.set(hora, []).get(hora)!).push(l);
    if (l.taskId) {
      const t = turnos.get(l.taskId) ?? { reserva: false, falhaFinal: false, aposentado: false };
      if (l.ok && (l.provedor === "huggingface" || alvo === "huggingface")) t.reserva = true;
      if (l.erro === "modelo_inexistente") t.aposentado = true;
      turnos.set(l.taskId, t);
    }
  }
  const nTurnos = turnos.size;
  const comReserva = [...turnos.values()].filter((t) => t.reserva).length;
  const comAposentado = [...turnos.values()].filter((t) => t.aposentado).length;

  return {
    geradoEm: agora.toISOString(),
    janelaHoras: horas,
    chamadas: linhas.length,
    turnos: nTurnos,
    falhas: linhas.filter((l) => !l.ok).length,
    taxaFalha: taxa(linhas.filter((l) => !l.ok).length, linhas.length),
    turnosComReserva: comReserva,
    taxaReserva: taxa(comReserva, nTurnos),
    turnosComModeloAposentado: comAposentado,
    porFase: [...porFase.entries()].map(([fase, ls]) => {
      const oks = ls.filter((l) => l.ok).map((l) => l.ms);
      return { fase, chamadas: ls.length, falhas: ls.length - oks.length, taxaFalha: taxa(ls.length - oks.length, ls.length), msP50: pct(oks, 0.5), msP90: pct(oks, 0.9) };
    }).sort((a, b) => b.chamadas - a.chamadas),
    porAlvo: [...porAlvo.entries()].map(([alvo, n]) => ({ alvo, chamadas: n, fracao: taxa(n, linhas.length) })).sort((a, b) => b.chamadas - a.chamadas),
    erros: [...porErro.entries()].map(([classe, n]) => ({ classe, n })).sort((a, b) => b.n - a.n),
    modelos: [...porModelo.entries()].map(([model, v]) => ({ model, ...v, taxaFalha: taxa(v.falhas, v.chamadas) })).sort((a, b) => b.chamadas - a.chamadas),
    serie: [...porHora.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([hora, ls]) => {
      const oks = ls.filter((l) => l.ok).map((l) => l.ms);
      return { hora, chamadas: ls.length, falhas: ls.length - oks.length, msP50: pct(oks, 0.5) };
    }),
  };
}
