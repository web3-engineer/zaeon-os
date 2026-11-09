/**
 * lib/orquestra/trilha.ts — a TRILHA de cada tarefa da orquestra, para o console (docs/HERMES_ZAEON.md).
 *
 * Grava no início ("rodando", para o quadro mostrar ao vivo) e no fim (concluída / fallback / falhou),
 * com a decisão do roteador, os eventos com tempo relativo, as evidências [E#], o texto final e as
 * métricas. BEST-EFFORT, como o TokenLedger: falha de banco loga e segue — nunca derruba o turno.
 * `ORQ_TRILHA=0` desliga.
 */
import type { Decisao } from "@/lib/orquestra/roteador";
import type { Evidencia } from "@/lib/orquestra/contrato";

export const MAX_EVENTOS = 400;
export const MAX_EVIDENCIAS = 300;
export const MAX_TEXTO = 100_000;

export type StatusTarefa = "rodando" | "concluida" | "fallback" | "falhou";
export type EventoTrilha = { t: number; fase: string; rotulo: string; agente?: string };

type DbTrilha = {
  orquestraTarefa: {
    create(a: { data: Record<string, unknown> }): Promise<unknown>;
    update(a: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
  };
};

export type Inicio = {
  id: string; origem: "chat" | "arena" | "console"; motor: string; nomeMotor: string; formato: string;
  intent: string; plano: string; objetivo: string; userId: string | null; decisao: Decisao;
};
export type Fim = {
  status: Exclude<StatusTarefa, "rodando">;
  evidencias?: Evidencia[];
  texto?: string;
  relatorio?: Record<string, unknown>;
  erro?: string;
};

export interface Trilha {
  iniciar(i: Inicio): void;
  evento(fase: string, rotulo: string, agente?: string): void;
  concluir(f: Fim): Promise<void>;
  eventos(): EventoTrilha[];
}

const OID = /^[a-f0-9]{24}$/i;

export function criarTrilha(o: { db?: DbTrilha; env?: Record<string, string | undefined>; agora?: () => number } = {}): Trilha {
  const env = o.env ?? process.env;
  const agora = o.agora ?? Date.now;
  const ligada = env.ORQ_TRILHA !== "0";
  const eventos: EventoTrilha[] = [];
  let t0 = agora();
  let id: string | null = null;
  let criado: Promise<unknown> = Promise.resolve();
  const db = async (): Promise<DbTrilha> => o.db ?? ((await import("@/src/lib/prisma")).prisma as unknown as DbTrilha);
  const avisar = (onde: string) => (e: unknown) => console.warn(`[orquestra/trilha] ${onde} falhou:`, String((e as Error)?.message ?? e).slice(0, 160));

  return {
    iniciar(i) {
      t0 = agora();
      id = i.id;
      if (!ligada) return;
      criado = db().then((d) => d.orquestraTarefa.create({
        data: {
          id: i.id, status: "rodando", origem: i.origem, motor: i.motor, nomeMotor: i.nomeMotor, formato: i.formato,
          intent: i.intent, plano: i.plano, objetivo: i.objetivo.slice(0, 4_000),
          userId: i.userId && OID.test(i.userId) ? i.userId : null, decisao: i.decisao as unknown as Record<string, unknown>,
        },
      })).catch(avisar("criar"));
    },
    evento(fase, rotulo, agente) {
      if (eventos.length >= MAX_EVENTOS) return;
      eventos.push({ t: Math.max(0, agora() - t0), fase, rotulo: rotulo.slice(0, 300), ...(agente ? { agente } : {}) });
    },
    async concluir(f) {
      if (!ligada || !id) return;
      const alvo = id;
      await criado;
      await db().then((d) => d.orquestraTarefa.update({
        where: { id: alvo },
        data: {
          status: f.status,
          eventos: eventos as unknown as Record<string, unknown>[],
          evidencias: (f.evidencias ?? []).slice(0, MAX_EVIDENCIAS).map((e) => ({ ...e, claim: e.claim.slice(0, 1_500) })) as unknown as Record<string, unknown>[],
          texto: f.texto ? f.texto.slice(0, MAX_TEXTO) : null,
          relatorio: (f.relatorio ?? null) as any,
          erro: f.erro ? f.erro.slice(0, 2_000) : null,
        },
      })).catch(avisar("concluir"));
    },
    eventos: () => [...eventos],
  };
}
