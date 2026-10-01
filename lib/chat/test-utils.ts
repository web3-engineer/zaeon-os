/** Utilitários de teste: Response com corpo em stream, chunk a chunk (como a rede entrega). */
export function streamDe(chunks: string[], { erroNoFim = false } = {}): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(c) {
      if (i < chunks.length) c.enqueue(enc.encode(chunks[i++]));
      else if (erroNoFim) c.error(new Error("conexão caiu"));
      else c.close();
    },
  });
}
export function respostaStream(chunks: string[], o: { status?: number; headers?: Record<string, string>; erroNoFim?: boolean } = {}) {
  return new Response(streamDe(chunks, o), { status: o.status ?? 200, headers: o.headers });
}
