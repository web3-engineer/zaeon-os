import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const m = vi.hoisted(() => ({ gerar: vi.fn(), hfLigado: false, hfGerar: vi.fn(), googleLigado: true }));
vi.mock("@/lib/ai/hf-image", () => ({
  hfImagemDisponivel: () => m.hfLigado,
  gerarImagemHf: m.hfGerar,
}));
vi.mock("@/lib/ai/vertex-credentials", () => ({
  vertexCredentials: () => ({ project: "p", client_email: "e", private_key: "k", location: "us-central1" }),
}));
vi.mock("google-auth-library", () => ({
  GoogleAuth: class { getAccessToken = async () => "tok"; },
}));
vi.mock("@/lib/ai/gemini-image", () => ({
  gerarImagemGemini: m.gerar,
  geminiImageDisponivel: () => m.googleLigado,
  geminiImageModelo: () => "gemini-2.5-flash-image",
}));

import { generateImage, generateImageResult, imageRoute, imagenAvailable } from "@/lib/studio/imagen";

describe("generateImageResult", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    m.gerar.mockReset();
    m.hfGerar.mockReset();
    m.hfLigado = false;
    m.googleLigado = true;
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sem IMAGEN_MODEL → Gemini image (não chama o :predict)", async () => {
    vi.stubEnv("IMAGEN_MODEL", "");
    m.gerar.mockResolvedValue({ data: "AAAA", mimeType: "image/png" });
    expect(imageRoute()).toEqual({ provider: "gemini", model: "gemini-2.5-flash-image" });
    const r = await generateImageResult("  um coração  ", { aspectRatio: "16:9" }, 45_000);
    expect(r).toEqual({ image: { data: "AAAA", mimeType: "image/png" } });
    expect(m.gerar).toHaveBeenCalledWith("um coração", expect.objectContaining({ model: "gemini-2.5-flash-image", aspectRatio: "16:9", timeoutMs: 45_000 }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("IMAGEN_MODEL=gemini-* → Gemini com esse id", async () => {
    vi.stubEnv("IMAGEN_MODEL", "gemini-3-pro-image-preview");
    m.gerar.mockResolvedValue({ data: "B", mimeType: "image/png" });
    await generateImageResult("x");
    expect(m.gerar).toHaveBeenCalledWith("x", expect.objectContaining({ model: "gemini-3-pro-image-preview" }));
  });

  it("IMAGEN_MODEL=imagen-* responde → usa o Imagen", async () => {
    vi.stubEnv("IMAGEN_MODEL", "imagen-4.0-generate-001");
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ predictions: [{ bytesBase64Encoded: "IMG" }] }), { status: 200 }));
    expect(await generateImageResult("x")).toEqual({ image: { data: "IMG", mimeType: "image/png" } });
    expect(fetchMock.mock.calls[0][0]).toContain("/models/imagen-4.0-generate-001:predict");
    expect(m.gerar).not.toHaveBeenCalled();
  });

  it("IMAGEN_MODEL=imagen-* com 404 → cai pro Gemini image padrão", async () => {
    vi.stubEnv("IMAGEN_MODEL", "imagen-4.0-generate-001");
    fetchMock.mockResolvedValue(new Response("not found", { status: 404 }));
    m.gerar.mockResolvedValue({ data: "G", mimeType: "image/png" });
    expect(await generateImageResult("x")).toEqual({ image: { data: "G", mimeType: "image/png" } });
    expect(m.gerar).toHaveBeenCalledWith("x", expect.objectContaining({ model: "gemini-2.5-flash-image" }));
  });

  it("falha do Gemini → { error } com o motivo; generateImage → null", async () => {
    vi.stubEnv("IMAGEN_MODEL", "");
    m.gerar.mockRejectedValue(new Error("Vertex 429: Resource exhausted [global]"));
    expect(await generateImageResult("x")).toEqual({ error: "Vertex 429: Resource exhausted [global]" });
    expect(await generateImage("x")).toBeNull();
  });

  it("prompt vazio não chama nada", async () => {
    expect(await generateImageResult("   ")).toEqual({ error: "prompt vazio" });
    expect(m.gerar).not.toHaveBeenCalled();
  });
});

describe("#883 · o Hugging Face na frente do Google", () => {
  beforeEach(() => {
    m.gerar.mockReset();
    m.hfGerar.mockReset();
    m.hfLigado = true;
    m.googleLigado = true;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("com HF ligado, a imagem vem do HF e o Google nem é chamado", async () => {
    m.hfGerar.mockResolvedValue({ data: "HF", mimeType: "image/png" });
    expect(await generateImageResult("  um vulcão  ", { aspectRatio: "16:9" }, 45_000)).toEqual({ image: { data: "HF", mimeType: "image/png" } });
    expect(m.hfGerar).toHaveBeenCalledWith("um vulcão", { aspectRatio: "16:9", timeoutMs: 45_000 });
    expect(m.gerar).not.toHaveBeenCalled();
  });

  it("HF falhou e há credencial Google → tenta a reserva; as duas falhas viram um motivo só", async () => {
    m.hfGerar.mockRejectedValue(new Error("Hugging Face não gerou a imagem (together 402)"));
    m.gerar.mockRejectedValue(new Error("Vertex 403: requires billing"));
    expect(await generateImageResult("x")).toEqual({ error: "Hugging Face não gerou a imagem (together 402) | reserva Google: Vertex 403: requires billing" });
    m.gerar.mockResolvedValue({ data: "G", mimeType: "image/png" });
    expect(await generateImageResult("x")).toEqual({ image: { data: "G", mimeType: "image/png" } });
  });

  it("HF falhou e não há Google → devolve o motivo do HF, sem tentar o Google", async () => {
    m.googleLigado = false;
    m.hfGerar.mockRejectedValue(new Error("Hugging Face não gerou a imagem (fal-ai: demorou demais)"));
    expect(await generateImageResult("x")).toEqual({ error: "Hugging Face não gerou a imagem (fal-ai: demorou demais)" });
    expect(m.gerar).not.toHaveBeenCalled();
  });

  it("disponível com qualquer um dos dois; sem nenhum, o motivo não fala só de Google", async () => {
    m.googleLigado = false;
    expect(imagenAvailable()).toBe(true);
    m.hfLigado = false;
    expect(imagenAvailable()).toBe(false);
    expect(await generateImageResult("x")).toEqual({ error: "geração de imagem indisponível (sem HF_TOKEN e sem credencial Google)" });
  });
});
