/**
 * lib/pdf/pdfjs.ts — carrega o pdf.js (build legacy, Node, sem worker) SEM o módulo nativo `canvas`.
 *
 * O DEFEITO (achado no E2E de nov/2026): o pdfjs-dist 3.x, ao carregar no Node, faz `require("canvas")` pra montar os
 * polyfills de DOMMatrix e Path2D — que só servem pra DESENHAR a página. O `canvas` não é dependência da Zaeon (nem do
 * Dockerfile), então TODA reserva pelo pdf.js quebrava com "Cannot find module 'canvas'": anexo do chat, texto completo
 * do Scholar, vídeo do documento, PDF grande no chat. Extrair TEXTO não usa nenhum dos dois: com os globais definidos
 * (stubs mínimos), o pdf.js não procura o `canvas` e a extração funciona.
 *
 * O SEGUNDO DEFEITO (E2E logado, nov/2026): dentro do bundle do Next, o "fake worker" do pdf.js faz
 * `require("./pdf.worker.js")` relativo a um arquivo que o webpack já moveu → "Setting up fake worker failed: Cannot
 * find module './pdf.worker.js'". Fora do Next (vitest) funcionava, por isso passou despercebido. O pdf.js procura
 * primeiro `globalThis.pdfjsWorker.WorkerMessageHandler`: importando o worker aqui e pondo nele, o fake worker roda no
 * mesmo processo sem procurar arquivo nenhum — dentro e fora do bundle.
 */
let carregado: Promise<any> | null = null;

export function carregarPdfjs(): Promise<any> {
  const g = globalThis as any;
  if (typeof g.DOMMatrix === "undefined") {
    g.DOMMatrix = class DOMMatrixStub {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      constructor(init?: number[]) { if (Array.isArray(init) && init.length >= 6) [this.a, this.b, this.c, this.d, this.e, this.f] = init; }
    };
  }
  if (typeof g.Path2D === "undefined") g.Path2D = class Path2DStub {};
  return (carregado ??= (async () => {
    if (!g.pdfjsWorker?.WorkerMessageHandler) {
      // @ts-ignore — o build legacy do pdfjs não traz declarações de tipo
      g.pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.js");
    }
    // @ts-ignore — idem
    return import("pdfjs-dist/legacy/build/pdf.js");
  })().catch((e) => { carregado = null; throw e; }));
}
