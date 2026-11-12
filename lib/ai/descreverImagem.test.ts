import { describe, it, expect } from "vitest";
import { descreverImagem, visaoDisponivel, MIMES_IMAGEM, PERGUNTA_PADRAO, type GenMultimodal } from "@/lib/ai/descreverImagem";

const img = { dataB64: "AAAA", mime: "image/png" };
const genOk: GenMultimodal = async () => "uma placa escrita PARE";

describe("descreverImagem · validação (falha fechado, nunca chama o modelo à toa)", () => {
  it("mime não-imagem, vazio, grande demais", async () => {
    expect(await descreverImagem({ dataB64: "x", mime: "application/pdf" }, undefined, genOk)).toMatchObject({ ok: false, erro: "mime_nao_imagem" });
    expect(await descreverImagem({ dataB64: "", mime: "image/png" }, undefined, genOk)).toMatchObject({ ok: false, erro: "imagem_vazia" });
    expect(await descreverImagem({ dataB64: "a".repeat(18_000_001), mime: "image/png" }, undefined, genOk)).toMatchObject({ ok: false, erro: "imagem_grande_demais" });
  });
  it("todos os mimes de imagem declarados são aceitos", async () => {
    for (const mime of MIMES_IMAGEM) expect((await descreverImagem({ dataB64: "AAAA", mime }, "x", genOk)).ok).toBe(true);
  });
});

describe("descreverImagem · chamada", () => {
  it("devolve o texto do gen", async () => {
    expect(await descreverImagem(img, "que diz a placa?", genOk)).toEqual({ ok: true, texto: "uma placa escrita PARE" });
  });
  it("sem pergunta usa a padrão (o gen recebe PERGUNTA_PADRAO no part de texto)", async () => {
    let visto = "";
    await descreverImagem(img, undefined, async (_s, parts) => { visto = (parts[1] as { text: string }).text; return "ok"; });
    expect(visto).toBe(PERGUNTA_PADRAO);
  });
  it("manda inlineData com o mime certo + o texto como parts", async () => {
    let parts: unknown[] = [];
    await descreverImagem(img, "oi", async (_s, p) => { parts = p; return "x"; });
    expect(parts[0]).toEqual({ inlineData: { data: "AAAA", mimeType: "image/png" } });
    expect(parts[1]).toEqual({ text: "oi" });
  });
  it("gen vazio → sem_resposta; gen que lança → visao_falhou (NUNCA propaga exceção)", async () => {
    expect(await descreverImagem(img, "x", async () => "")).toMatchObject({ ok: false, erro: "sem_resposta" });
    expect(await descreverImagem(img, "x", async () => { throw new Error("502"); })).toMatchObject({ ok: false, erro: expect.stringContaining("visao_falhou") });
  });
});

describe("visaoDisponivel", () => {
  it("true com GOOGLE_CREDENTIALS ou as três vars discretas; false sem credencial", () => {
    expect(visaoDisponivel({ GOOGLE_CREDENTIALS: "{}" })).toBe(true);
    expect(visaoDisponivel({ GOOGLE_PROJECT_ID: "p", GOOGLE_CLIENT_EMAIL: "e", GOOGLE_PRIVATE_KEY: "k" })).toBe(true);
    expect(visaoDisponivel({ GOOGLE_PROJECT_ID: "p" })).toBe(false);
    expect(visaoDisponivel({})).toBe(false);
  });
});
