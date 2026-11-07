/**
 * lib/anatomia/baixar.ts — recebe um pedaço de geometria e devolve os BYTES CRUS.
 *
 * Porte de `app/model-download.ts` do human-atlas (MIT — procedência em lib/anatomia/atlas.ts),
 * com DUAS adições nossas, as duas declaradas abaixo.
 *
 * ──────────── A armadilha que o original documenta, e que é real ────────────
 * Um host estático pode servir `body-0.bin.gz` de DUAS formas: como resposta comprimida
 * (`Content-Encoding: gzip`, que o `fetch` já desfaz sozinho) ou como um ARQUIVO que por acaso
 * contém gzip (`Content-Type: application/gzip`, sem encoding — e aí o `fetch` entrega o gzip
 * intacto). Quem decidir pelo nome do arquivo erra metade das vezes: decodifica duas vezes num
 * caso e nenhuma no outro. A decisão certa é olhar os BYTES: `1f 8b` é a assinatura do gzip.
 *
 * ──────────── NOSSAS DUAS ADIÇÕES ────────────
 * 1 · O ERRO DIZ O STATUS. O original devolve "não foi possível carregar" para 404, 503 e 500
 *     igualmente. Nesta casa isso já custou caro: um 503 e um 404 pedem providências opostas
 *     (contêiner fora do ar × arquivo que nunca subiu), e sem o número a única forma de saber
 *     seria abrir o DevTools. O status entra na mensagem.
 * 2 · O TAMANHO ESPERADO É CONFERIDO ANTES de virar geometria — isto é do original e eu mantive
 *     com destaque, porque é o que impede um pedaço truncado (proxy que cortou, disco cheio no
 *     VPS) de virar malha com vértices lixo em vez de erro. `atlas.json` declara `bytes` por
 *     pedaço; se não bate, não serve.
 */

/** A assinatura do gzip. Dois bytes, e é só isso que separa um caso do outro. */
const MAGICO_GZIP = [0x1f, 0x8b] as const;

export async function decodificarPedaco(
  resposta: Response,
  bytesEsperados: number,
  comprimido: boolean,
): Promise<ArrayBuffer> {
  if (!resposta.ok) {
    throw new Error(`um arquivo da anatomia não pôde ser carregado (HTTP ${resposta.status})`);
  }
  const carga = await resposta.arrayBuffer();
  const assinatura = new Uint8Array(carga, 0, Math.min(2, carga.byteLength));
  const aindaGzip = comprimido && assinatura[0] === MAGICO_GZIP[0] && assinatura[1] === MAGICO_GZIP[1];

  const bytes = aindaGzip
    ? await new Response(
        new Blob([carga]).stream().pipeThrough(new DecompressionStream("gzip")),
      ).arrayBuffer()
    : carga;

  if (bytes.byteLength !== bytesEsperados) {
    throw new Error(
      `um arquivo da anatomia veio incompleto: ${bytes.byteLength} bytes em vez de ${bytesEsperados}`,
    );
  }
  return bytes;
}

/** O navegador sabe descomprimir? Sem isto, pede-se o `.bin` cru (4 MB em vez de 2,2). */
export const saberDescomprimir = (): boolean => typeof DecompressionStream !== "undefined";
