import { describe, it, expect, vi, beforeEach } from "vitest";
import sharp from "sharp";
import {
  HF_IMAGEM_PADRAO,
  HF_IMAGEM_MAX_BYTES,
  _limparCacheIds,
  gerarImagemHf,
  hfImagemAlvos,
  hfImagemDisponivel,
  hostPermitido,
  lerAlvo,
  lerResposta,
  montarPedido,
  providerIdDoMapeamento,
  tamanhoDaProporcao,
} from "@/lib/ai/hf-image";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString("base64");
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ENV = { HF_TOKEN: "hf_teste" };
const jsonRes = (j: unknown, status = 200) => new Response(JSON.stringify(j), { status, headers: { "content-type": "application/json" } });
const imgRes = () => new Response(Buffer.from([0x89, 0x50, 0x4e, 0x47]), { status: 200, headers: { "content-type": "image/png" } });

describe("#883 · imagem pelo Hugging Face — configuração", () => {
  it("só liga com HF_TOKEN; HF_RESERVA=0 (kill switch do HF) e HF_IMAGEM=0 desligam", () => {
    expect(hfImagemDisponivel({})).toBe(false);
    expect(hfImagemDisponivel({ HF_TOKEN: "  " })).toBe(false);
    expect(hfImagemDisponivel(ENV)).toBe(true);
    expect(hfImagemDisponivel({ ...ENV, HF_RESERVA: "0" })).toBe(false);
    expect(hfImagemDisponivel({ ...ENV, HF_IMAGEM: "off" })).toBe(false);
  });

  it("o padrão é o FLUX.1-schnell em 4 provedores, em ordem", () => {
    expect(hfImagemAlvos({}).map((a) => a.provedor)).toEqual(["together", "nebius", "fal-ai", "hf-inference"]);
    expect(hfImagemAlvos({}).every((a) => a.modelo === "black-forest-labs/FLUX.1-schnell")).toBe(true);
    expect(HF_IMAGEM_PADRAO).toHaveLength(4);
  });

  it("HF_IMAGEM_MODELOS troca a lista; provedor desconhecido fica de fora", () => {
    const alvos = hfImagemAlvos({ HF_IMAGEM_MODELOS: "Qwen/Qwen-Image:fal-ai, x/y:replicate, black-forest-labs/FLUX.1-dev:nebius" });
    expect(alvos).toEqual([
      { modelo: "Qwen/Qwen-Image", provedor: "fal-ai" },
      { modelo: "black-forest-labs/FLUX.1-dev", provedor: "nebius" },
    ]);
    expect(lerAlvo("sem-provedor")).toBeNull();
  });

  it("proporção vira tamanho em múltiplos de 64, lado maior 1024", () => {
    expect(tamanhoDaProporcao()).toEqual({ width: 1024, height: 1024 });
    expect(tamanhoDaProporcao("16:9")).toEqual({ width: 1024, height: 576 });
    expect(tamanhoDaProporcao("3:4")).toEqual({ width: 768, height: 1024 });
    expect(tamanhoDaProporcao("lixo")).toEqual({ width: 1024, height: 1024 });
  });
});

describe("#883 · imagem pelo Hugging Face — pedido e resposta de cada provedor", () => {
  const alvo = (provedor: "together" | "nebius" | "fal-ai" | "hf-inference") => ({ modelo: "black-forest-labs/FLUX.1-schnell", provedor });
  const tam = { width: 1024, height: 576 };

  it("together e nebius: /v1/images/generations com o id do provedor e base64", () => {
    const t = montarPedido(alvo("together"), "black-forest-labs/FLUX.1-schnell-Free", "um vulcão", tam);
    expect(t.url).toBe("https://router.huggingface.co/together/v1/images/generations");
    expect(t.body).toMatchObject({ model: "black-forest-labs/FLUX.1-schnell-Free", prompt: "um vulcão", response_format: "base64", width: 1024, height: 576 });
    const n = montarPedido(alvo("nebius"), "black-forest-labs/flux-schnell", "um vulcão", tam);
    expect(n.url).toBe("https://router.huggingface.co/nebius/v1/images/generations");
    expect(n.body).toMatchObject({ model: "black-forest-labs/flux-schnell", response_format: "b64_json" });
  });

  it("fal-ai: rota com o id do provedor, sync_mode e image_size", () => {
    const f = montarPedido(alvo("fal-ai"), "fal-ai/flux/schnell", "x", tam);
    expect(f.url).toBe("https://router.huggingface.co/fal-ai/fal-ai/flux/schnell");
    expect(f.body).toMatchObject({ prompt: "x", sync_mode: true, image_size: tam });
  });

  it("hf-inference: rota do modelo do HF e `inputs`", () => {
    const h = montarPedido(alvo("hf-inference"), "ignorado", "x", tam);
    expect(h.url).toBe("https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell");
    expect(h.body).toEqual({ inputs: "x", parameters: tam });
  });

  it("mapeamento do HF nos dois formatos (objeto e lista)", () => {
    expect(providerIdDoMapeamento({ inferenceProviderMapping: { together: { providerId: "a/b-Free", task: "text-to-image" } } }, "together")).toBe("a/b-Free");
    expect(providerIdDoMapeamento({ inferenceProviderMapping: [{ provider: "nebius", providerId: "a/flux", task: "text-to-image" }] }, "nebius")).toBe("a/flux");
    expect(providerIdDoMapeamento({ inferenceProviderMapping: [{ provider: "nebius", providerId: "a/flux", task: "text-generation" }] }, "nebius")).toBeNull();
    expect(providerIdDoMapeamento(null, "nebius")).toBeNull();
  });

  it("lê bytes de imagem, b64_json, data URL e link para baixar", async () => {
    expect(await lerResposta(imgRes())).toEqual({ data: PNG, mimeType: "image/png" });
    expect(await lerResposta(jsonRes({ data: [{ b64_json: "QUJD" }] }))).toEqual({ data: "QUJD", mimeType: "image/png" });
    expect(await lerResposta(jsonRes({ images: [{ url: `data:image/png;base64,${PNG_BYTES.toString("base64")}` }] }))).toEqual({ data: PNG_BYTES.toString("base64"), mimeType: "image/png" });
    const baixar = vi.fn().mockResolvedValue(new Response(PNG_BYTES, { headers: { "content-type": "image/png" } }));
    expect(await lerResposta(jsonRes({ images: [{ url: "https://v3.fal.media/files/img.png" }] }), baixar)).toEqual({ data: PNG_BYTES.toString("base64"), mimeType: "image/png" });
    expect(baixar).toHaveBeenCalledWith("https://v3.fal.media/files/img.png", expect.objectContaining({ redirect: "error" }));
    expect(await lerResposta(jsonRes({ images: [{ url: "http://inseguro/x.png" }] }))).toBeNull();
    expect(await lerResposta(jsonRes({ nada: true }))).toBeNull();
  });
});

describe("#883 · revisão do PR #884 — download seguro e formato", () => {
  it("só baixa de host de provedor, por https, sem porta nem usuário (sem SSRF)", async () => {
    expect(hostPermitido("https://v3.fal.media/files/a.png")).toBe(true);
    expect(hostPermitido("https://fal.media/a.png")).toBe(true);
    expect(hostPermitido("https://169.254.169.254/latest/meta-data")).toBe(false);
    expect(hostPermitido("https://localhost/a.png")).toBe(false);
    expect(hostPermitido("https://fal.media.atacante.com/a.png")).toBe(false);
    expect(hostPermitido("https://user:x@fal.media/a.png")).toBe(false);
    expect(hostPermitido("https://fal.media:8443/a.png")).toBe(false);
    expect(hostPermitido("http://fal.media/a.png")).toBe(false);
    const baixar = vi.fn();
    expect(await lerResposta(jsonRes({ images: [{ url: "https://10.0.0.1/interno" }] }), baixar)).toBeNull();
    expect(baixar).not.toHaveBeenCalled();
  });

  it("imagem acima do teto é recusada sem ir para o base64", async () => {
    const grande = new Response(new Uint8Array(16), { headers: { "content-type": "image/png", "content-length": String(HF_IMAGEM_MAX_BYTES + 1) } });
    expect(await lerResposta(grande)).toBeNull();
    const enorme = "A".repeat(Math.ceil((HF_IMAGEM_MAX_BYTES * 4) / 3) + 8);
    expect(await lerResposta(jsonRes({ data: [{ b64_json: enorme }] }))).toBeNull();
  });

  it("JPEG/WebP viram PNG (a rota e o vídeo gravam .png); lixo que não é imagem vira null", async () => {
    const webp = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#f00" } }).webp().toBuffer();
    const r = await lerResposta(new Response(webp, { headers: { "content-type": "image/webp" } }));
    expect(r?.mimeType).toBe("image/png");
    expect(Buffer.from(r!.data, "base64").subarray(1, 4).toString()).toBe("PNG");
    expect(await lerResposta(new Response(Buffer.from([1, 2, 3]), { headers: { "content-type": "image/jpeg" } }))).toBeNull();
  });
});

describe("#883 · gerarImagemHf", () => {
  beforeEach(() => _limparCacheIds());

  it("usa o id do mapeamento, manda o token e devolve a imagem do primeiro provedor que responde", async () => {
    const f = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith("https://huggingface.co/api/models/")) return jsonRes({ inferenceProviderMapping: { together: { providerId: "bfl/schnell-Free", task: "text-to-image" } } });
      if (url.endsWith("/together/v1/images/generations")) {
        expect(JSON.parse(String(init?.body))).toMatchObject({ model: "bfl/schnell-Free", prompt: "um vulcão em erupção" });
        expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer hf_teste");
        return jsonRes({ data: [{ b64_json: "VVZW" }] });
      }
      throw new Error("não devia chegar aqui: " + url);
    });
    const img = await gerarImagemHf("  um vulcão em erupção ", { env: ENV, fetchImpl: f as unknown as typeof fetch, aspectRatio: "1:1" });
    expect(img).toEqual({ data: "VVZW", mimeType: "image/png" });
  });

  it("provedor recusou → tenta o próximo; o id do mapeamento fica guardado", async () => {
    const chamadas: string[] = [];
    const f = vi.fn(async (url: string) => {
      chamadas.push(url);
      if (url.includes("/api/models/")) return jsonRes({ inferenceProviderMapping: [{ provider: "together", providerId: "m/x-t" }, { provider: "nebius", providerId: "m/x-n" }] });
      if (url.includes("/together/")) return new Response("payment required", { status: 402 });
      if (url.includes("/nebius/")) return jsonRes({ data: [{ b64_json: "TkVC" }] });
      throw new Error(url);
    });
    const env = { ...ENV, HF_IMAGEM_MODELOS: "m/x:together,m/x:nebius" };
    expect(await gerarImagemHf("x", { env, fetchImpl: f as unknown as typeof fetch })).toEqual({ data: "TkVC", mimeType: "image/png" });
    expect(chamadas.filter((u) => u.includes("/api/models/"))).toHaveLength(2);
    await gerarImagemHf("y", { env, fetchImpl: f as unknown as typeof fetch });
    expect(chamadas.filter((u) => u.includes("/api/models/"))).toHaveLength(2); // cache: não pergunta de novo
  });

  it("nenhum provedor respondeu → lança com o motivo de cada um (sem o token)", async () => {
    const f = vi.fn(async (url: string) => (url.includes("/api/models/") ? jsonRes({}) : new Response("billing", { status: 403 })));
    const env = { ...ENV, HF_IMAGEM_MODELOS: "m/x:together,m/x:hf-inference" };
    await expect(gerarImagemHf("x", { env, fetchImpl: f as unknown as typeof fetch })).rejects.toThrow(/Hugging Face não gerou a imagem \(together 403: billing \| hf-inference 403: billing\)/);
    await expect(gerarImagemHf("x", { env, fetchImpl: f as unknown as typeof fetch })).rejects.not.toThrow(/hf_teste/);
  });

  it("mapeamento que falhou não fica guardado: a próxima imagem pergunta de novo", async () => {
    let n = 0;
    const f = vi.fn(async (url: string) => {
      if (url.includes("/api/models/")) { n++; return new Response("erro", { status: 500 }); }
      return jsonRes({ data: [{ b64_json: "VVZW" }] });
    });
    const env = { ...ENV, HF_IMAGEM_MODELOS: "m/x:together" };
    await gerarImagemHf("x", { env, fetchImpl: f as unknown as typeof fetch });
    await gerarImagemHf("y", { env, fetchImpl: f as unknown as typeof fetch });
    expect(n).toBe(2);
  });

  it("HF_IMAGEM_MODELOS preenchido e inválido NÃO cai no padrão pago: avisa e nem chama a rede", async () => {
    expect(hfImagemAlvos({ HF_IMAGEM_MODELOS: "x/y:replicate" })).toEqual([]);
    expect(hfImagemAlvos({ HF_IMAGEM_MODELOS: "  " })).toHaveLength(4);
    const f = vi.fn();
    await expect(gerarImagemHf("x", { env: { ...ENV, HF_IMAGEM_MODELOS: "typo" }, fetchImpl: f as unknown as typeof fetch })).rejects.toThrow(/HF_IMAGEM_MODELOS inválido/);
    expect(f).not.toHaveBeenCalled();
  });

  it("pedido que saiu e não voltou (tempo/rede) NÃO tenta outro provedor: poderia cobrar duas vezes", async () => {
    const chamados: string[] = [];
    const f = vi.fn(async (url: string) => {
      if (url.includes("/api/models/")) return jsonRes({});
      chamados.push(url);
      throw Object.assign(new Error("timeout"), { name: "TimeoutError" });
    });
    const env = { ...ENV, HF_IMAGEM_MODELOS: "m/x:together,m/x:nebius" };
    await expect(gerarImagemHf("x", { env, fetchImpl: f as unknown as typeof fetch })).rejects.toThrow(/together: demorou demais/);
    expect(chamados).toHaveLength(1);
  });

  it("sem token ou prompt vazio: nem chama a rede", async () => {
    const f = vi.fn();
    await expect(gerarImagemHf("x", { env: {}, fetchImpl: f as unknown as typeof fetch })).rejects.toThrow(/desligada/);
    await expect(gerarImagemHf("   ", { env: ENV, fetchImpl: f as unknown as typeof fetch })).rejects.toThrow(/prompt vazio/);
    expect(f).not.toHaveBeenCalled();
  });
});
