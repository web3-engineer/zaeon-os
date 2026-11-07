/**
 * O decodificador dos pedaços de geometria, contra GZIP DE VERDADE (CompressionStream do Node),
 * não contra uma simulação.
 *
 * O caso que justifica o arquivo inteiro é o TERCEIRO: o `fetch` já desfez o `Content-Encoding` e
 * entregou bytes crus, mas nós pedimos a URL `.gz`. Quem decidir descomprimir pelo NOME do arquivo
 * descomprime duas vezes e estoura; quem decidir não descomprimir nunca entrega malha. Os dois
 * caminhos falham só em produção, e só em alguns hosts. A decisão tem de sair dos BYTES.
 */
import { describe, expect, it } from "vitest";
import { decodificarPedaco } from "@/lib/anatomia/baixar";

/**
 * Bytes que parecem geometria: 64 floats. As fronteiras deste arquivo falam em `ArrayBuffer` e não
 * em `Uint8Array` de propósito — é o que `Blob` e `Response` aceitam sem conversão, e o que a
 * própria função recebe do `fetch`.
 */
const CRU: ArrayBuffer = new Float32Array(64).map((_, i) => i * 1.5).buffer;

const comprimir = (a: ArrayBuffer): Promise<ArrayBuffer> =>
  new Response(new Blob([a]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer();

const resposta = (a: ArrayBuffer, status = 200) => new Response(a, { status });
const vistaDe = (a: ArrayBuffer) => new Uint8Array(a);

describe("decodificarPedaco", () => {
  it("1 · bytes crus com o tamanho declarado passam intactos", async () => {
    const r = await decodificarPedaco(resposta(CRU), CRU.byteLength, false);
    expect(vistaDe(r)).toEqual(vistaDe(CRU));
  });

  it("2 · host serviu o .gz como ARQUIVO (assinatura 1f8b presente) → descomprime", async () => {
    const gz = await comprimir(CRU);
    const vgz = vistaDe(gz);
    expect([vgz[0], vgz[1]], "o fixture tem de ser gzip de verdade").toEqual([0x1f, 0x8b]);
    expect(gz.byteLength).not.toBe(CRU.byteLength);
    const r = await decodificarPedaco(resposta(gz), CRU.byteLength, true);
    expect(vistaDe(r)).toEqual(vistaDe(CRU));
  });

  it("3 · o fetch JÁ desfez o Content-Encoding → NÃO descomprime de novo", async () => {
    // pedimos a URL .gz (comprimido=true) mas a carga já veio crua. Decidir pelo nome estouraria.
    const r = await decodificarPedaco(resposta(CRU), CRU.byteLength, true);
    expect(vistaDe(r)).toEqual(vistaDe(CRU));
  });

  it("4 · carga truncada é ERRO, e o erro diz os dois números", async () => {
    await expect(decodificarPedaco(resposta(CRU.slice(0, 100)), CRU.byteLength, false))
      .rejects.toThrow(/incompleto: 100 bytes em vez de 256/);
  });

  it("5 · o status HTTP entra na mensagem — 404 e 503 pedem providências opostas", async () => {
    await expect(decodificarPedaco(resposta(CRU, 404), CRU.byteLength, true)).rejects.toThrow(/HTTP 404/);
    await expect(decodificarPedaco(resposta(CRU, 503), CRU.byteLength, true)).rejects.toThrow(/HTTP 503/);
  });

  it("6 · carga que por azar começa com 1f8b mas foi pedida CRUA não é descomprimida", async () => {
    const armadilha: ArrayBuffer = new Uint8Array([0x1f, 0x8b, 9, 9, 9, 9, 9, 9]).buffer;
    const r = await decodificarPedaco(resposta(armadilha), armadilha.byteLength, false);
    expect(vistaDe(r)).toEqual(vistaDe(armadilha));
  });

  it("7 · gzip corrompido rejeita em vez de devolver bytes lixo", async () => {
    const gz = await comprimir(CRU);
    const v = vistaDe(gz);
    v[Math.floor(v.byteLength / 2)] ^= 0xff;
    await expect(decodificarPedaco(resposta(gz), CRU.byteLength, true)).rejects.toThrow();
  });
});
