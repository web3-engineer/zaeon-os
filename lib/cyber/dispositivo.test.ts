import { describe, expect, it } from "vitest";
import { detectarPerfil, precisaGirar, pularQuadro, qualidadeDe } from "./dispositivo";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";

describe("onde o cyberespaço está rodando", () => {
  it("celular: toque, user-agent móvel ou toque + tela pequena", () => {
    expect(detectarPerfil({ coarse: true, toques: 5, ua: IPHONE, largura: 390, altura: 844 }).movel).toBe(true);
    expect(detectarPerfil({ coarse: false, toques: 0, ua: ANDROID, largura: 915, altura: 412 }).movel).toBe(true);
    expect(detectarPerfil({ coarse: false, toques: 5, ua: MAC, largura: 700, altura: 500 }).movel).toBe(true);   // iPad "desktop" pequeno
  });
  it("desktop bom: nem celular, nem leve", () => {
    expect(detectarPerfil({ coarse: false, toques: 0, ua: MAC, largura: 1440, altura: 900, memoriaGB: 8, nucleos: 10 })).toEqual({ movel: false, leve: false, fraco: false });
  });
  it("desktop fraco (pouca memória/núcleos) ou janela minúscula fica leve", () => {
    expect(detectarPerfil({ coarse: false, toques: 0, ua: MAC, largura: 1440, altura: 900, memoriaGB: 2 })).toMatchObject({ movel: false, leve: true, fraco: true });
    expect(detectarPerfil({ coarse: false, toques: 0, ua: MAC, largura: 480, altura: 900 }).leve).toBe(true);
  });
});

describe("qualidade por perfil", () => {
  it("desktop: cheia; celular: pixel ratio 1, sem antialias, 45 fps; aparelho fraco: 30 fps", () => {
    expect(qualidadeDe({ movel: false, leve: false, fraco: false })).toEqual({ leve: false, pixelRatioMax: 1.5, antialias: true, fpsMax: 0 });
    expect(qualidadeDe({ movel: true, leve: true, fraco: false })).toEqual({ leve: true, pixelRatioMax: 1, antialias: false, fpsMax: 45 });
    expect(qualidadeDe({ movel: true, leve: true, fraco: true }).fpsMax).toBe(30);
  });
  it("celular em pé pede pra girar; na horizontal (ou desktop) não", () => {
    const cel = { movel: true, leve: true, fraco: false };
    expect(precisaGirar(cel, 390, 844)).toBe(true);
    expect(precisaGirar(cel, 844, 390)).toBe(false);
    expect(precisaGirar({ movel: false, leve: false, fraco: false }, 600, 900)).toBe(false);
  });
  it("limite de fps pula os quadros cedo demais", () => {
    expect(pularQuadro(30, 1000, 990)).toBe(true);
    expect(pularQuadro(30, 1000, 960)).toBe(false);
    expect(pularQuadro(0, 1000, 999)).toBe(false);
  });
});
