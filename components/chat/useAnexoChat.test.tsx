// @vitest-environment jsdom
/**
 * O que este arquivo trava: um .txt/.md anexado ao chat NÃO é mais descartado em silêncio (F1 de
 * docs/PLANO_HARNESS_AGENTICO.md), e texto vai SEMPRE pela base — nunca pelo chip de leitura
 * inteira, que é o caminho que desliga o harness.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

const saveFile = vi.fn();
const enviarLote = vi.fn();

vi.mock("@/lib/useLibraryFiles", () => ({ useLibraryFiles: () => ({ saveFile, files: [] }) }));
vi.mock("@/lib/pdfStore", () => ({ blobParaDataUrl: vi.fn(async () => "data:application/pdf;base64,QUFB") }));
vi.mock("@/lib/chat/enviarBase", () => ({ enviarLote: (...a: any[]) => enviarLote(...a) }));

import { useAnexoChat } from "@/components/chat/useAnexoChat";

const ok = (nomeArquivo: string) => ({ nomeArquivo, documentoId: "d", status: "novo" as const, trechos: 3, paginas: 1 });
const arquivo = (nome: string, tipo: string) => new File([new Uint8Array([65, 66, 67])], nome, { type: tipo });
const pdf = (n = "artigo.pdf") => arquivo(n, "application/pdf");
const txt = (n = "notas.txt") => arquivo(n, "text/plain");
const md = (n = "fichamento.md") => arquivo(n, "text/markdown");

const montar = (aoGuardar = vi.fn()) => {
  const r = renderHook(() => useAnexoChat("estudos", { focar: vi.fn(), perguntar: vi.fn(), aoGuardar }));
  return { ...r, aoGuardar };
};
const anexar = async (h: any, fs: File[]) => { await act(async () => { await h.result.current.anexarArquivos(fs); }); };
const esperarMicrotarefas = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

beforeEach(() => {
  saveFile.mockReset();
  enviarLote.mockReset().mockImplementation(async (fs: File[]) => fs.map((f) => ok(f.name)));
});

describe("arquivo de texto no chat", () => {
  it("um .txt vai pra BASE (chip 📚), não pelo chip de leitura inteira", async () => {
    const h = montar();
    await anexar(h, [txt()]);
    // antes desta fase: nada acontecia — nem chip, nem envio, nem aviso
    expect(h.result.current.lote).toEqual([{ id: expect.stringMatching(/^txt-/), nome: "notas" }]);
    expect(h.result.current.anexo).toBeNull();   // `fileData` DESLIGA o harness: texto nunca vai por ali
    expect(enviarLote).toHaveBeenCalledTimes(1);
    expect(enviarLote.mock.calls[0][0].map((f: File) => f.name)).toEqual(["notas.txt"]);
  });

  it(".md também, e o título perde a extensão", async () => {
    const h = montar();
    await anexar(h, [md()]);
    expect(h.result.current.lote.map((a) => a.nome)).toEqual(["fichamento"]);
  });

  it("vários arquivos de texto de uma vez — o pedido original do dono", async () => {
    const h = montar();
    await anexar(h, [txt("aula1.txt"), md("aula2.md"), txt("aula3.txt")]);
    expect(h.result.current.lote.map((a) => a.nome)).toEqual(["aula1", "aula2", "aula3"]);
    expect(enviarLote.mock.calls[0][0]).toHaveLength(3);
  });

  it("PDF + texto misturados: todos pela base, nenhum chip de leitura inteira", async () => {
    const h = montar();
    await anexar(h, [pdf("artigo.pdf"), md("notas.md")]);
    expect(h.result.current.lote.map((a) => a.nome)).toEqual(["artigo", "notas"]);
    expect(h.result.current.anexo).toBeNull();
  });

  it("SÓ PDF vai pra biblioteca — um .txt lá viraria item que não abre no leitor", async () => {
    const h = montar();
    await anexar(h, [pdf("artigo.pdf"), md("notas.md")]);
    expect(saveFile).toHaveBeenCalledTimes(1);
    expect(saveFile.mock.calls[0][0]).toMatchObject({ title: "artigo" });
  });
});

describe("o que NÃO mudou", () => {
  it("um PDF sozinho segue igual: chip de leitura inteira + base em silêncio", async () => {
    const h = montar();
    await anexar(h, [pdf()]);
    expect(h.result.current.anexo).toMatchObject({ nome: "artigo" });
    expect(h.result.current.lote).toEqual([]);
    expect(enviarLote).toHaveBeenCalledTimes(1);
  });

  it("imagem continua só anexando (Gemini Vision)", async () => {
    const h = montar();
    await anexar(h, [arquivo("foto.png", "image/png")]);
    expect(h.result.current.anexo?.id).toMatch(/^img-/);
    expect(enviarLote).not.toHaveBeenCalled();
  });

  it("formato que não lemos continua ignorado — limite conhecido, .docx NÃO entrou nesta fase", async () => {
    const h = montar();
    await anexar(h, [arquivo("tese.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")]);
    expect(h.result.current.anexo).toBeNull();
    expect(h.result.current.lote).toEqual([]);
    expect(enviarLote).not.toHaveBeenCalled();
  });
});

describe("sem sessão", () => {
  it("com PDF, cai no comportamento antigo (a IA lê o primeiro)", async () => {
    enviarLote.mockResolvedValue("nao_logado");
    const h = montar();
    await anexar(h, [pdf("a.pdf"), pdf("b.pdf")]);
    await esperarMicrotarefas();
    expect(h.result.current.lote).toEqual([]);
    expect(h.result.current.anexo).toMatchObject({ nome: "a" });
  });

  it("só com texto não há pra onde cair — então a Aura DIZ, em vez de engolir o arquivo", async () => {
    enviarLote.mockResolvedValue("nao_logado");
    const h = montar();
    await anexar(h, [txt()]);
    await esperarMicrotarefas();
    expect(h.result.current.lote).toEqual([]);
    expect(h.result.current.anexo).toBeNull();
    expect(h.aoGuardar).toHaveBeenCalledWith(expect.stringContaining("entre na sua conta"));
  });
});
