/**
 * lib/cyber/tentarDeNovo.ts — #819 · baixar de novo quando a rede CORTA no meio. PURO (o `esperar` é injetável).
 *
 * Visto no ar em 15/11: o corpo da avatar (12–13 MB) chegou pela metade — "Content-Length header of network response
 * exceeds response Body" (o servidor reiniciou num deploy; acontece também num Wi-Fi que oscila ou no celular trocando
 * de antena) — e a avatar desistia de vez, sem aparecer até a pessoa recarregar a página.
 *
 * Tenta de novo só o que pode dar certo na segunda vez: erro de REDE (o fetch/leitura lança) e erro 5xx/408/429 do
 * servidor. 404 e afins falham na hora — o arquivo não vai aparecer esperando.
 */
export class ErroHttp extends Error {
  constructor(readonly status: number, url: string) { super(`HTTP ${status}: ${url}`); }
}

/** vale tentar de novo? (rede caiu, servidor ocupado/reiniciando) */
export function vale(e: unknown): boolean {
  if (e instanceof ErroHttp) return e.status >= 500 || e.status === 408 || e.status === 429;
  return !(e instanceof DOMException && e.name === "AbortError");   // (cancelado de propósito não se repete)
}

export async function comTentativas<T>(
  fazer: () => Promise<T>,
  o: { tentativas?: number; esperasMs?: readonly number[]; esperar?: (ms: number) => Promise<void> } = {},
): Promise<T> {
  const tentativas = o.tentativas ?? 3;
  const esperas = o.esperasMs ?? [1500, 4000];
  const esperar = o.esperar ?? ((ms) => new Promise<void>((ok) => setTimeout(ok, ms)));
  for (let i = 1; ; i++) {
    try {
      return await fazer();
    } catch (e) {
      if (i >= tentativas || !vale(e)) throw e;
      await esperar(esperas[Math.min(i - 1, esperas.length - 1)] ?? 2000);
    }
  }
}
