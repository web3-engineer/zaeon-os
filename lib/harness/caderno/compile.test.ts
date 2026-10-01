import { describe, it, expect, vi } from "vitest";
import { validarDesenho, compilarSvg, gerarPrancha, VB_W, VB_H, MAX_PRIMITIVAS } from "@/lib/harness/caderno/compile";

const bom = {
  legenda: "ciclo da água",
  primitivas: [
    { t: "circulo", c: [50, 40], r: 16, cor: "destaque" },
    { t: "curva", pts: [[10, 170], [160, 160], [310, 170]] },
    { t: "seta", de: [60, 60], ate: [130, 150] },
    { t: "retangulo", p: [200, 20], w: 80, h: 40, hachura: true },
    { t: "linha", de: [0, 0], ate: [10, 10], cor: "suave" },
    { t: "rotulo", p: [40, 90], texto: "evaporação" },
  ],
};

describe("validarDesenho", () => {
  it("aceita desenho bom e preserva tipos/cores/hachura", () => {
    const d = validarDesenho(bom)!;
    expect(d.primitivas.map((p) => p.t)).toEqual(["circulo", "curva", "seta", "retangulo", "linha", "rotulo"]);
    expect(d.legenda).toBe("ciclo da água");
  });
  it("descarta primitiva desconhecida e campos extras (script, href, onload, style)", () => {
    const d = validarDesenho({ primitivas: [
      ...bom.primitivas,
      { t: "script", texto: "alert(1)" },
      { t: "image", href: "https://evil" },
      { t: "circulo", c: [10, 10], r: 5, onload: "alert(1)", style: "x", href: "javascript:alert(1)" },
    ] })!;
    expect(d.primitivas.map((p) => p.t)).not.toContain("script");
    expect(JSON.stringify(d)).not.toMatch(/onload|href|style|javascript/);
  });
  it("cor só por NOME do tema: valor CSS livre é ignorado", () => {
    const d = validarDesenho({ primitivas: [{ t: "linha", de: [0, 0], ate: [5, 5], cor: "url(javascript:alert(1))" }, ...bom.primitivas] })!;
    expect(d.primitivas[0]).not.toHaveProperty("cor");
  });
  it("prende coordenadas e tamanhos ao canvas; rejeita NaN/Infinity/strings", () => {
    const d = validarDesenho({ primitivas: [
      { t: "linha", de: [-999, 99999], ate: [1e9, -5] },
      { t: "circulo", c: [10, 10], r: 9999 },
      { t: "linha", de: [NaN, 0], ate: [1, 1] },
      { t: "linha", de: ["1", 0], ate: [1, 1] },
      { t: "rotulo", p: [Infinity, 1], texto: "x" },
      { t: "curva", pts: [[1, 1], [2, 2]] },
    ] })!;
    expect(d.primitivas).toHaveLength(3);
    expect(d.primitivas[0]).toMatchObject({ de: [0, VB_H], ate: [VB_W, 0] });
    expect((d.primitivas[1] as any).r).toBe(100);
  });
  it("imprestável → null: só rótulos, poucas primitivas, lixo", () => {
    expect(validarDesenho(null)).toBeNull();
    expect(validarDesenho({ primitivas: "x" })).toBeNull();
    expect(validarDesenho({ primitivas: [{ t: "linha", de: [0, 0], ate: [1, 1] }] })).toBeNull();
    expect(validarDesenho({ primitivas: [1, 2, 3].map((i) => ({ t: "rotulo", p: [i, i], texto: "a" })) })).toBeNull();
  });
  it("teto de primitivas e de pontos por curva", () => {
    const muitas = Array.from({ length: 200 }, (_, i) => ({ t: "linha", de: [i, 0], ate: [i, 10] }));
    expect(validarDesenho({ primitivas: muitas })!.primitivas).toHaveLength(MAX_PRIMITIVAS);
    const curva = { t: "curva", pts: Array.from({ length: 50 }, (_, i) => [i, i]) };
    const d = validarDesenho({ primitivas: [curva, ...bom.primitivas] })!;
    expect((d.primitivas[0] as any).pts).toHaveLength(12);
  });
  it("rótulo: corta, tira caractere de controle, vazio some", () => {
    const d = validarDesenho({ primitivas: [...bom.primitivas, { t: "rotulo", p: [1, 1], texto: "a\u0000b" + "x".repeat(100) }, { t: "rotulo", p: [1, 1], texto: "   " }] })!;
    const rots = d.primitivas.filter((p) => p.t === "rotulo") as any[];
    expect(rots).toHaveLength(2);
    expect(rots[1].texto).toMatch(/^a b/);
    expect(rots[1].texto.length).toBeLessThanOrEqual(40);
  });
});

describe("compilarSvg — saída segura POR CONSTRUÇÃO", () => {
  it("só emite tags da whitelist", () => {
    const svg = compilarSvg(validarDesenho(bom)!);
    const tags = new Set([...svg.matchAll(/<([a-zA-Z]+)/g)].map((m) => m[1]));
    for (const t of tags) expect(["svg", "defs", "pattern", "line", "marker", "path", "circle", "rect", "text"]).toContain(t);
  });
  it("texto hostil no rótulo e na legenda sai escapado (sem tag, sem atributo novo)", () => {
    const d = validarDesenho({ legenda: '"><script>alert(1)</script>', primitivas: [...bom.primitivas, { t: "rotulo", p: [1, 1], texto: "<img src=x onerror=alert(1)>" }] })!;
    const svg = compilarSvg(d);
    // Nenhuma TAG nova e nenhum ATRIBUTO de evento: o texto hostil existe só escapado.
    expect(svg).not.toMatch(/<script|<img/i);
    expect(svg).not.toMatch(/\son\w+\s*=\s*"/i);
    expect(svg).toContain("&lt;img src=x onerror=alert(1)&gt;</text>");
    expect(svg).toContain('aria-label="&quot;&gt;&lt;script');
  });
  it("id da hachura é saneado (não injeta atributo)", () => {
    const svg = compilarSvg(validarDesenho(bom)!, { idHachura: 'x" onload="alert(1)' });
    expect(svg).not.toMatch(/\son\w+\s*=\s*"/i); // nenhum atributo de evento
    expect(svg).toContain('id="xonloadalert1"');    // aspas/espaços/= removidos do id
  });
  it("animar põe a classe da tinta só nos traços", () => {
    const svg = compilarSvg(validarDesenho(bom)!, { animar: true });
    expect(svg).toMatch(/<circle class="tinta"/);
    expect(svg).not.toMatch(/<text class="tinta"/);
  });
  it("hachura usa o pattern; seta usa o marcador", () => {
    const svg = compilarSvg(validarDesenho(bom)!, { idHachura: "h1" });
    expect(svg).toContain('fill="url(#h1)"');
    expect(svg).toContain('marker-end="url(#h1-ponta)"');
  });
});

describe("gerarPrancha (LLM mockado)", () => {
  it("caminho desenho", async () => {
    const r = await gerarPrancha("ciclo da água", vi.fn().mockResolvedValue({ desenhavel: true, ...bom }));
    expect(r.tipo).toBe("desenho");
  });
  it("não desenhável → imagem com o prompt do LLM", async () => {
    const r = await gerarPrancha("Mona Lisa", vi.fn().mockResolvedValue({ desenhavel: false, promptImagem: "portrait" }));
    expect(r).toEqual({ tipo: "imagem", promptImagem: "portrait" });
  });
  it("desenho ruim → imagem com prompt derivado do tema", async () => {
    const r = await gerarPrancha("célula", vi.fn().mockResolvedValue({ primitivas: [{ t: "lixo" }] }));
    expect(r.tipo).toBe("imagem");
    expect((r as any).promptImagem).toMatch(/célula/);
  });
  it("LLM caiu → erro (nunca lança); tema vazio → erro sem chamar o modelo", async () => {
    expect(await gerarPrancha("x", vi.fn().mockRejectedValue(new Error("vertex 404")))).toEqual({ tipo: "erro" });
    const gen = vi.fn();
    expect(await gerarPrancha("  ", gen)).toEqual({ tipo: "erro" });
    expect(gen).not.toHaveBeenCalled();
  });
});
