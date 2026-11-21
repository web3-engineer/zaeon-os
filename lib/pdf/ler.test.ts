import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { estruturaDoPdf, lerPdf, paragrafosDasLinhas } from "@/lib/pdf/ler";

const fixture = (n: string) => new Uint8Array(readFileSync(join(__dirname, "../../tests/fixtures/pdf", n)));
const semLoader = async () => null;

describe("skill de leitura de PDF — com o pdf.js DE VERDADE (sem pdf-loader)", () => {
  it("PDF de texto: reserva pdf.js lê 2 parágrafos por página, com a página certa e a frase plantada inteira", async () => {
    const r = await lerPdf(fixture("texto-3-paginas.pdf"), { loader: semLoader });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.leitor).toBe("pdfjs");
    expect(r.paginas).toBe(3);
    expect(r.paragraphs).toHaveLength(6);
    expect(r.paragraphs.map((p) => p.page)).toEqual([1, 1, 2, 2, 3, 3]);
    const p22 = r.paragraphs.find((p) => p.text.includes("plantada numero 22"))!;
    expect(p22.page).toBe(2);
    // as duas linhas do parágrafo ficam juntas (não um parágrafo por linha, nem a página inteira num só)
    expect(p22.text).toMatch(/fica aqui para o teste\. Uma segunda linha continua/);
    expect(r.tentativas).toEqual(["pdf-loader:indisponivel", "pdfjs:ok"]);
  });

  it("PDF escaneado (só imagem): motivo 'escaneado', nunca documento vazio fingindo sucesso", async () => {
    const r = await lerPdf(fixture("escaneado.pdf"), { loader: semLoader });
    expect(r).toMatchObject({ ok: false, motivo: "escaneado" });
  });

  it("bytes que não são PDF: leitura_falhou", async () => {
    const r = await lerPdf(new TextEncoder().encode("isto não é um pdf"), { loader: semLoader });
    expect(r).toMatchObject({ ok: false, motivo: "leitura_falhou" });
  });

  it("pdf-loader de pé: ele vence e a reserva nem roda", async () => {
    const pdfjs = vi.fn();
    const loader = vi.fn(async () => ({ paragraphs: [{ idx: 0, page: 1, text: "texto vindo do pdf-loader ".repeat(5) }], markdown: "# t" }));
    const r = await lerPdf(fixture("texto-3-paginas.pdf"), { loader, pdfjs });
    expect(r).toMatchObject({ ok: true, leitor: "pdf-loader", paginas: 1 });
    expect(pdfjs).not.toHaveBeenCalled();
  });

  it("pdf-loader respondeu SEM texto (falha dele): a reserva lê", async () => {
    const r = await lerPdf(fixture("texto-3-paginas.pdf"), { loader: async () => ({ paragraphs: [] }) });
    expect(r).toMatchObject({ ok: true, leitor: "pdfjs" });
    if (r.ok) expect(r.tentativas[0]).toBe("pdf-loader:sem_texto");
  });

  it("adaptador da ingestão: escaneado vira estrutura vazia (→ 'sem_texto'); falha vira null (→ 'leitura_falhou')", async () => {
    expect(await estruturaDoPdf(fixture("escaneado.pdf"), { loader: semLoader })).toEqual({ paragraphs: [], blocks: [], markdown: "" });
    expect(await estruturaDoPdf(new Uint8Array([1, 2, 3]), { loader: semLoader })).toBeNull();
    const ok = await estruturaDoPdf(fixture("texto-3-paginas.pdf"), { loader: semLoader });
    expect(ok?.blocks?.[0]).toMatchObject({ type: "paragraph", page: 1 });
  });
});

describe("parágrafos a partir das linhas (puro)", () => {
  it("quebra no espaço vertical grande; junta linhas próximas; desfaz hifenização", () => {
    const ps = paragrafosDasLinhas(4, [
      { texto: "Primeira linha que ter-", y: 700, altura: 11 },
      { texto: "mina na seguinte.", y: 687, altura: 11 },
      { texto: "Outro parágrafo.", y: 640, altura: 11 },
    ]);
    expect(ps.map((p) => p.text)).toEqual(["Primeira linha que termina na seguinte.", "Outro parágrafo."]);
    expect(ps.every((p) => p.page === 4)).toBe(true);
  });
});
