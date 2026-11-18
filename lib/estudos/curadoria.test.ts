import { describe, expect, it } from "vitest";
import { ARQ_IMAGEM_RE, IMAGEM_RE, aplicarAjuste, aplicarAjustes, extDaAssinatura, normalizarAjuste, origemDe, urlDaImagem } from "./curadoria";
import { CATALOGO, type ItemVitrine } from "./vitrine";
import { pesquisaParaUI } from "./pesquisas";

const it3 = CATALOGO.slice(0, 3) as ItemVitrine[];
const [a, b, c] = it3;
const FOTO = urlDaImagem(`vimg_${"ab".repeat(16)}.png`);

describe("normalizarAjuste", () => {
  it("exige um itemId de card", () => {
    expect(normalizarAjuste({}).erro).toBeTruthy();
    expect(normalizarAjuste({ itemId: "../x" }).erro).toBeTruthy();
    expect(normalizarAjuste({ itemId: "skill:anki-flashcards" }).itemId).toBe("skill:anki-flashcards");
  });

  it("só leva o que veio; null desfaz o campo; tags sem repetição e com limite", () => {
    expect(normalizarAjuste({ itemId: "x", titulo: " Novo " }).data).toEqual({ titulo: "Novo" });
    expect(normalizarAjuste({ itemId: "x", titulo: null, tags: null, ordem: null, raridade: null, imagem: null }).data)
      .toEqual({ titulo: null, tags: null, ordem: null, raridade: null, imagem: null });
    expect(normalizarAjuste({ itemId: "x", tags: "ia, IA , ia, agro" }).data?.tags).toEqual(["ia", "IA", "agro"]);
    expect((normalizarAjuste({ itemId: "x", tags: Array.from({ length: 30 }, (_, i) => `t${i}`) }).data?.tags as string[]).length).toBe(12);
  });

  it("a foto só pode ser uma enviada pelo painel (nada de URL de fora nem javascript:)", () => {
    expect(normalizarAjuste({ itemId: "x", imagem: FOTO }).data?.imagem).toBe(FOTO);
    expect(normalizarAjuste({ itemId: "x", imagem: "https://evil.com/a.png" }).erro).toMatch(/foto/);
    expect(normalizarAjuste({ itemId: "x", imagem: "javascript:alert(1)" }).erro).toBeTruthy();
    expect(normalizarAjuste({ itemId: "x", imagem: "/api/estudos/vitrine/imagem/../../etc/passwd" }).erro).toBeTruthy();
  });

  it("raridade e ordem validadas", () => {
    expect(normalizarAjuste({ itemId: "x", raridade: "mitica" }).erro).toMatch(/raridade/);
    expect(normalizarAjuste({ itemId: "x", ordem: "abc" }).erro).toMatch(/ordem/);
    expect(normalizarAjuste({ itemId: "x", ordem: "3.7", oculto: 1 }).data).toEqual({ ordem: 3, oculto: true });
  });
});

describe("aplicarAjustes", () => {
  it("sobrepõe só o que o dono mexeu", () => {
    const n = aplicarAjuste(a, { itemId: a.id, titulo: "Outro", tags: ["x"], imagem: FOTO, raridade: "lendaria" });
    expect(n).toMatchObject({ titulo: "Outro", tags: ["x"], imagem: FOTO, raridade: "lendaria", subtitulo: a.subtitulo });
    expect(aplicarAjuste(a, { itemId: a.id, tags: null }).tags).toEqual(a.tags);
    expect(aplicarAjuste(a, { itemId: a.id, tags: [] }).tags).toEqual([]);
  });

  it("esconde os ocultos na vitrine (o admin vê com comOcultos)", () => {
    const aj = [{ itemId: b.id, oculto: true }];
    expect(aplicarAjustes(it3, aj).map((i) => i.id)).toEqual([a.id, c.id]);
    expect(aplicarAjustes(it3, aj, { comOcultos: true }).map((i) => i.id)).toEqual([a.id, b.id, c.id]);
  });

  it("a ordem do dono vem antes; o resto segue a ordem natural", () => {
    const aj = [{ itemId: c.id, ordem: 1 }, { itemId: b.id, ordem: 0 }];
    expect(aplicarAjustes(it3, aj).map((i) => i.id)).toEqual([b.id, c.id, a.id]);
    expect(aplicarAjustes(it3, []).map((i) => i.id)).toEqual([a.id, b.id, c.id]);
  });
});

describe("a foto: assinatura e nomes", () => {
  it("reconhece a imagem pelos primeiros bytes — SVG/HTML disfarçado não passa", () => {
    expect(extDaAssinatura(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))).toBe("png");
    expect(extDaAssinatura(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpg");
    expect(extDaAssinatura(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBe("gif");
    expect(extDaAssinatura(new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]))).toBe("webp");
    expect(extDaAssinatura(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(extDaAssinatura(new TextEncoder().encode("<html>"))).toBeNull();
  });

  it("os nomes de arquivo aceitos são só os gerados pelo upload", () => {
    expect(ARQ_IMAGEM_RE.test(`vimg_${"ab".repeat(16)}.webp`)).toBe(true);
    expect(ARQ_IMAGEM_RE.test("vimg_../../x.png")).toBe(false);
    expect(ARQ_IMAGEM_RE.test(`vimg_${"ab".repeat(16)}.svg`)).toBe(false);
    expect(IMAGEM_RE.test(FOTO)).toBe(true);
  });
});

describe("origemDe", () => {
  it("diz de onde o card vem", () => {
    const emb = new Set(CATALOGO.map((i) => i.id));
    expect(origemDe(CATALOGO.find((i) => i.id === "ps5-rev")!, emb)).toBe("catalogo");
    expect(origemDe(CATALOGO.find((i) => !!i.plugavel)!, emb)).toBe("agente");
    expect(origemDe({ ...a, id: "skill:anki" }, emb)).toBe("skill");
    expect(origemDe({ ...a, id: "do-banco" }, emb)).toBe("banco");
    const pasta = pesquisaParaUI({ slug: "s", titulo: "T", resumo: "", nicho: "", tags: [], raridade: "comum", autor: "", validadores: 0, partes: [{ tipo: "artigo", titulo: "A", conteudo: "x" }] });
    expect(origemDe(pasta, emb)).toBe("pesquisa");
  });
});
