"use client";
/**
 * useTurnoOcta — a janela do agente acompanhando UM turno do fluxo landing ao vivo:
 *   iniciar(projetoId, pedido) → POST /api/octa/turnos → polling de 1 s em GET …/eventos?depois=<último seq>.
 *   Para quando chega `fim`/`erro`, ou quando o turno está esperando o aluno (`aguardando_aprovacao`: o evento
 *   `aprovacao` pode chegar um instante antes do status virar — aí pergunta mais uma vez). aprovar(sim/não) →
 *   POST …/aprovar e retoma o polling do mesmo seq. 409 turno_ativo = acompanha o turno que já roda no projeto.
 * Sem evento novo por `semNovidadeMs` (padrão 12 min, acima do PRESO_MS do servidor): para de perguntar e marca
 * `semNoticia` — a IDE oferece "verificar de novo" (retomarPolling). Normalmente o servidor colhe o turno preso antes.
 * Nada de segredo passa por aqui: os eventos já vêm redigidos do servidor.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { EventoTurno } from "@/lib/octa/passos";

export type StatusTurno = "rodando" | "aguardando_aprovacao" | "pronto" | "erro";
export type EstadoTurno = {
  turnoId: string;
  eventos: EventoTurno[];
  status: StatusTurno;
  pendente: { tool: string; path?: string } | null;
  resposta: string | null;
  /** A última pergunta ao servidor falhou (rede/5xx); continua tentando. */
  falhaRede: boolean;
  /** Parou de perguntar: muito tempo sem evento novo. O turno pode estar vivo; retomarPolling() volta a olhar. */
  semNoticia?: boolean;
};
export type InicioTurno = { ok: true; turnoId: string; jaAtivo?: boolean } | { ok: false; status: number; erro?: string };

const MAX_FALHAS = 30; // ~1 min sem conseguir falar com o servidor → para (o aluno pode recarregar)
/** Teto do polling sem novidade: acima do PRESO_MS (10 min) do servidor, que já devolve o turno preso como erro. */
export const SEM_NOVIDADE_MS = 12 * 60_000;

export function useTurnoOcta(opts: { intervaloMs?: number; semNovidadeMs?: number; onParou?: (t: EstadoTurno) => void } = {}) {
  const intervalo = opts.intervaloMs ?? 1000;
  const semNovidadeMs = opts.semNovidadeMs ?? SEM_NOVIDADE_MS;
  const ultimaNovidade = useRef(0);
  const [turno, setTurno] = useState<EstadoTurno | null>(null);
  const atual = useRef<EstadoTurno | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geracao = useRef(0); // cada acompanhar/parar invalida o laço anterior
  const onParou = useRef(opts.onParou);
  onParou.current = opts.onParou;

  const definir = (t: EstadoTurno | null) => { atual.current = t; setTurno(t); };

  const parar = useCallback(() => {
    geracao.current++;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const laco = useCallback((g: number, falhas = 0) => {
    const passo = async () => {
      const t = atual.current;
      if (!t || g !== geracao.current) return;
      const depois = t.eventos.length ? t.eventos[t.eventos.length - 1].seq : 0;
      let j: any = null;
      let http = 0;
      try {
        const r = await fetch(`/api/octa/turnos/${encodeURIComponent(t.turnoId)}/eventos?depois=${depois}`);
        http = r.status;
        j = r.ok ? await r.json() : null;
      } catch { /* rede */ }
      if (g !== geracao.current) return;
      if (!j) {
        // 404/401 = o turno não é (mais) visível pra este aluno: não adianta insistir
        if (http === 404 || http === 401 || falhas + 1 >= MAX_FALHAS) {
          const fim: EstadoTurno = { ...t, status: "erro", falhaRede: true };
          definir(fim);
          parar();
          onParou.current?.(fim);
          return;
        }
        definir({ ...t, falhaRede: true });
        timer.current = setTimeout(() => laco(g, falhas + 1)(), intervalo);
        return;
      }
      const novos: EventoTurno[] = Array.isArray(j.eventos) ? j.eventos.filter((e: EventoTurno) => e.seq > depois) : [];
      const status: StatusTurno = j.status ?? t.status;
      const prox: EstadoTurno = {
        ...t,
        eventos: [...t.eventos, ...novos],
        status,
        // sem novidade e ainda "rodando": mantém o cartão que o evento de aprovação já abriu
        pendente: j.pendente ?? (status === "rodando" && !novos.length ? t.pendente : null),
        resposta: j.resposta ?? t.resposta,
        falhaRede: false,
      };
      const ultimo = novos[novos.length - 1];
      // o evento de aprovação (novo) mostra o cartão já, mesmo antes do status virar
      if (!prox.pendente && status === "rodando" && ultimo?.tipo === "aprovacao") {
        prox.pendente = { tool: String(ultimo.dados.tool ?? ""), ...(typeof ultimo.dados.path === "string" ? { path: ultimo.dados.path } : {}) };
      }
      if (novos.length || status !== t.status) ultimaNovidade.current = Date.now();
      const acabou = novos.some((e) => e.tipo === "fim" || e.tipo === "erro") || prox.status === "pronto" || prox.status === "erro" || prox.status === "aguardando_aprovacao";
      if (acabou) { definir(prox); parar(); onParou.current?.(prox); return; }
      if (Date.now() - ultimaNovidade.current >= semNovidadeMs) { definir({ ...prox, semNoticia: true }); parar(); return; }
      definir(prox);
      timer.current = setTimeout(() => laco(g, 0)(), intervalo);
    };
    return passo;
  }, [intervalo, semNovidadeMs, parar]);

  /** Passa a acompanhar um turno (novo, retomado do cache ou o que já estava ativo no projeto). */
  const acompanhar = useCallback((turnoId: string, base?: Partial<EstadoTurno>) => {
    parar();
    definir({ turnoId, eventos: [], status: "rodando", pendente: null, resposta: null, falhaRede: false, ...base, semNoticia: false });
    ultimaNovidade.current = Date.now();
    const g = geracao.current;
    timer.current = setTimeout(() => laco(g)(), 0);
  }, [laco, parar]);

  const iniciar = useCallback(async (projetoId: string, pedido: string): Promise<InicioTurno> => {
    let r: Response;
    try {
      r = await fetch("/api/octa/turnos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projetoId, pedido }) });
    } catch { return { ok: false, status: 0 }; }
    const j: any = await r.json().catch(() => ({}));
    if (r.status === 409 && typeof j?.turnoId === "string") { acompanhar(j.turnoId); return { ok: true, turnoId: j.turnoId, jaAtivo: true }; }
    if (!r.ok || typeof j?.turnoId !== "string") return { ok: false, status: r.status, ...(j?.error ? { erro: String(j.error) } : {}) };
    acompanhar(j.turnoId);
    return { ok: true, turnoId: j.turnoId };
  }, [acompanhar]);

  const aprovar = useCallback(async (aprovado: boolean): Promise<boolean> => {
    const t = atual.current;
    if (!t) return false;
    let ok = false;
    try {
      const r = await fetch(`/api/octa/turnos/${encodeURIComponent(t.turnoId)}/aprovar`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aprovado }),
      });
      ok = r.ok;
    } catch { /* rede */ }
    // 409 (já decidido / ainda não parou) também volta a acompanhar: o servidor diz o estado real
    acompanhar(t.turnoId, { eventos: t.eventos, resposta: t.resposta, status: "rodando", pendente: null });
    return ok;
  }, [acompanhar]);

  /** Volta a perguntar pelo turno que parou por falta de notícia (do último seq que já tem). */
  const retomarPolling = useCallback(() => {
    const t = atual.current;
    if (t) acompanhar(t.turnoId, { eventos: t.eventos, status: t.status, pendente: t.pendente, resposta: t.resposta });
  }, [acompanhar]);

  const limpar = useCallback(() => { parar(); definir(null); }, [parar]);

  useEffect(() => parar, [parar]);

  return { turno, iniciar, acompanhar, aprovar, retomarPolling, parar, limpar };
}
