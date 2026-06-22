import { describe, it, expect } from "vitest";
import { buildImagenBody, parseImagenResponse } from "@/lib/studio/imagen-request";

describe("buildImagenBody", () => {
  it("monta instances + parameters com defaults (1 imagem, 1:1)", () => {
    expect(buildImagenBody("um coração")).toEqual({
      instances: [{ prompt: "um coração" }],
      parameters: { sampleCount: 1, aspectRatio: "1:1" },
    });
  });
  it("respeita count e aspectRatio, com count entre 1 e 4", () => {
    expect(buildImagenBody("x", { count: 9, aspectRatio: "16:9" }).parameters).toEqual({ sampleCount: 4, aspectRatio: "16:9" });
    expect(buildImagenBody("x", { count: 0 }).parameters.sampleCount).toBe(1);
  });
});

describe("parseImagenResponse", () => {
  it("extrai bytesBase64Encoded + mime", () => {
    expect(parseImagenResponse({ predictions: [{ bytesBase64Encoded: "AAAA", mimeType: "image/png" }] })).toEqual({
      data: "AAAA",
      mimeType: "image/png",
    });
  });
  it("aceita snake_case e mime default", () => {
    const out = parseImagenResponse({ predictions: [{ bytes_base64_encoded: "BBBB" }] });
    expect(out?.data).toBe("BBBB");
    expect(out?.mimeType).toBe("image/png");
  });
  it("null sem predições", () => {
    expect(parseImagenResponse({ predictions: [] })).toBeNull();
    expect(parseImagenResponse({})).toBeNull();
    expect(parseImagenResponse(null)).toBeNull();
  });
});
