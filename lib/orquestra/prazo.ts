/**
 * lib/orquestra/prazo.ts — PRAZO DE RELÓGIO com cancelamento de verdade.
 *
 * O defeito que isto conserta (docs/ORQUESTRA.md §diagnóstico): o resto da casa mede tempo com
 * `Promise.race` (lib/scholar/gemini.ts `withTimeout`, lib/agent/runtime.ts). A corrida desiste de
 * ESPERAR, mas a chamada perdedora continua rodando — e cobrando — enquanto o fallback já roda.
 * E o orçamento do turno era estimado (`charge()` soma ms de uma tabela), nunca o relógio.
 *
 * Aqui o prazo é UM AbortSignal que desce por toda a árvore da tarefa: orquestrador → subagente →
 * chamada de modelo → espera de retry. Um filho nunca vive além do pai (`ate` é o mínimo dos dois),
 * e quando o pai cai (prazo, aluno fechou a aba, deploy), todos os filhos caem juntos.
 */

export class PrazoEsgotado extends Error {
  readonly code = "prazo";
  constructor(rotulo = "tarefa") {
    super(`prazo esgotado (${rotulo})`);
    this.name = "PrazoEsgotado";
  }
}

export type Prazo = {
  readonly signal: AbortSignal;
  /** instante (epoch ms) em que o prazo vence */
  readonly ate: number;
  restante(): number;
  expirou(): boolean;
  /** um prazo FILHO de no máximo `ms`, que nunca passa do pai e cai junto com ele */
  filho(ms: number, rotulo?: string): Prazo;
  /** solta o timer e o vínculo com o pai (chamar ao terminar o trabalho do filho) */
  liberar(): void;
};

type Relogio = () => number;

/** `pai` pode ser outro Prazo ou um AbortSignal solto (ex.: `req.signal` do Next). */
export function criarPrazo(ms: number, pai?: Prazo | AbortSignal | null, rotulo = "tarefa", agora: Relogio = Date.now): Prazo {
  const ctrl = new AbortController();
  const paiSignal = !pai ? null : "signal" in pai ? pai.signal : pai;
  const paiAte = pai && "ate" in pai ? pai.ate : Infinity;
  const ate = Math.min(agora() + Math.max(0, ms), paiAte);

  const abortar = (motivo: unknown) => { if (!ctrl.signal.aborted) ctrl.abort(motivo); };
  const timer = setTimeout(() => abortar(new PrazoEsgotado(rotulo)), Math.max(0, ate - agora()));
  (timer as unknown as { unref?: () => void }).unref?.();

  const aoAbortarPai = () => abortar(paiSignal?.reason ?? new PrazoEsgotado(rotulo));
  if (paiSignal) {
    if (paiSignal.aborted) aoAbortarPai();
    else paiSignal.addEventListener("abort", aoAbortarPai, { once: true });
  }

  const p: Prazo = {
    signal: ctrl.signal,
    ate,
    restante: () => Math.max(0, ate - agora()),
    expirou: () => ctrl.signal.aborted || agora() >= ate,
    filho: (msFilho, rotuloFilho) => criarPrazo(msFilho, p, rotuloFilho ?? rotulo, agora),
    liberar: () => {
      clearTimeout(timer);
      paiSignal?.removeEventListener("abort", aoAbortarPai);
    },
  };
  return p;
}

/** Espera `ms` — mas acorda com erro se o prazo cair antes. Sem isto um backoff dormiria além do prazo. */
export function esperar(ms: number, prazo: Prazo): Promise<void> {
  return new Promise((resolve, reject) => {
    if (prazo.signal.aborted) return reject(prazo.signal.reason ?? new PrazoEsgotado());
    const t = setTimeout(() => { prazo.signal.removeEventListener("abort", onAbort); resolve(); }, Math.max(0, ms));
    (t as unknown as { unref?: () => void }).unref?.();
    const onAbort = () => { clearTimeout(t); reject(prazo.signal.reason ?? new PrazoEsgotado()); };
    prazo.signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Para promessas que NÃO aceitam signal (as tools do registry): desiste de esperar no prazo.
 * Não é cancelamento — é o máximo que dá sem mexer na tool —, mas pelo menos o laço não fica
 * pendurado, e o `.catch` da perdedora evita unhandledRejection.
 */
export function correrContraPrazo<T>(p: Promise<T>, prazo: Prazo): Promise<T> {
  p.catch(() => {});
  if (prazo.signal.aborted) return Promise.reject(prazo.signal.reason ?? new PrazoEsgotado());
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(prazo.signal.reason ?? new PrazoEsgotado());
    prazo.signal.addEventListener("abort", onAbort, { once: true });
    p.then(
      (v) => { prazo.signal.removeEventListener("abort", onAbort); resolve(v); },
      (e) => { prazo.signal.removeEventListener("abort", onAbort); reject(e); },
    );
  });
}

export const ehPrazo = (e: unknown): boolean =>
  e instanceof PrazoEsgotado || (e as { code?: string })?.code === "prazo" || (e as { name?: string })?.name === "AbortError";
