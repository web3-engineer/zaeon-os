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

/** a conexão PAROU de mandar bytes (sem cair de vez): o navegador não rejeita, a promessa ficaria pendurada pra sempre */
export class ErroParado extends Error {
  constructor(url: string, ms: number) { super(`nada chegou em ${Math.round(ms / 1000)} s: ${url}`); }
}

/**
 * Baixa os bytes inteiros, com um prazo de SILÊNCIO (`paradoMs`, padrão 30 s): o relógio volta a zero a cada pedaço que
 * chega — um Wi-Fi lento que segue mandando nunca é cortado, só a conexão que parou. Parado → `ErroParado` (vale
 * repetir); HTTP de erro → `ErroHttp`.
 */
export async function baixarBytes(
  url: string,
  o: { paradoMs?: number; fetchImpl?: typeof fetch } = {},
): Promise<ArrayBuffer> {
  const paradoMs = o.paradoMs ?? 30_000;
  const buscar = o.fetchImpl ?? fetch;
  const ctl = new AbortController();
  let relogio: ReturnType<typeof setTimeout> | undefined;
  let leitor: ReadableStreamDefaultReader<Uint8Array> | undefined;
  // o prazo REJEITA por conta própria (não depende do fetch obedecer o abort): cada espera corre contra ele
  let romper: (e: Error) => void = () => {};
  const parada = new Promise<never>((_, nao) => { romper = nao; });
  parada.catch(() => {});
  const armar = () => {
    clearTimeout(relogio);
    relogio = setTimeout(() => {
      romper(new ErroParado(url, paradoMs));
      ctl.abort(); void leitor?.cancel().catch(() => {});   // (e solta a conexão)
    }, paradoMs);
  };
  try {
    armar();
    const r = await Promise.race([buscar(url, { signal: ctl.signal }), parada]);
    if (!r.ok) throw new ErroHttp(r.status, url);
    if (!r.body) return await Promise.race([r.arrayBuffer(), parada]);
    leitor = r.body.getReader();
    const partes: Uint8Array[] = [];
    let n = 0;
    for (;;) {
      const { done, value } = await Promise.race([leitor.read(), parada]);
      if (done) break;
      armar();
      partes.push(value); n += value.byteLength;
    }
    const tudo = new Uint8Array(n);
    let pos = 0;
    for (const p of partes) { tudo.set(p, pos); pos += p.byteLength; }
    return tudo.buffer;
  } finally {
    clearTimeout(relogio);
  }
}
