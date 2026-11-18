import { describe, it, expect } from "vitest";
import { cameraAoVivoLigada, parseFrame, descreverFrame } from "@/lib/ai/camera";
import type { GenMultimodal } from "@/lib/ai/descreverImagem";

const FRAME = "data:image/jpeg;base64,AAAABBBB";
const genOk: GenMultimodal = async () => "uma pessoa segurando um copo";

describe("cameraAoVivoLigada (flag default OFF)", () => {
  it("1/true/on liga; resto (inclusive ausente) desliga", () => {
    for (const v of ["1", "true", "on", "ON"]) expect(cameraAoVivoLigada({ VISAO_CAMERA: v })).toBe(true);
    for (const v of ["0", "", "no", undefined]) expect(cameraAoVivoLigada({ VISAO_CAMERA: v })).toBe(false);
  });
});

describe("parseFrame", () => {
  it("extrai mime e base64 de um data URL de imagem", () => {
    expect(parseFrame(FRAME)).toEqual({ mime: "image/jpeg", dataB64: "AAAABBBB" });
    expect(parseFrame("data:image/png;base64,ZZZ")).toEqual({ mime: "image/png", dataB64: "ZZZ" });
  });
  it("recusa o que não é data URL base64", () => {
    for (const bad of ["", "não é url", "https://x/y.png", "data:image/png,semBase64", "data:;base64,x"]) {
      expect(parseFrame(bad), bad).toBeNull();
    }
  });
});

describe("descreverFrame", () => {
  it("frame válido → descreve (repassa a pergunta ao motor)", async () => {
    const r = await descreverFrame(FRAME, "o que estou segurando?", genOk);
    expect(r).toEqual({ ok: true, texto: "uma pessoa segurando um copo" });
  });
  it("frame inválido → frame_invalido, sem chamar o motor", async () => {
    let chamou = false;
    const r = await descreverFrame("não é frame", undefined, async () => { chamou = true; return "x"; });
    expect(r).toMatchObject({ ok: false, erro: "frame_invalido" });
    expect(chamou).toBe(false);
  });
  it("delega a validação de mime ao motor (mime não-imagem falha lá)", async () => {
    const r = await descreverFrame("data:application/pdf;base64,AAAA", undefined, genOk);
    expect(r).toMatchObject({ ok: false, erro: "mime_nao_imagem" });
  });
});
