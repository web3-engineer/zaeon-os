import { describe, expect, it } from "vitest";
import colors from "tailwindcss/colors";
import { TEMAS_ID } from "@/lib/rooms/temas";
import { FAMILIAS, SKINS, SKINS_ID, SKIN_PADRAO, TONS, ehSkin, skinValida } from "./paletas";
import { FUNDOS_ORIGINAIS, coresDoTailwind, cssBaseDasSkins, hexParaRgb, variaveisDaSkin } from "./variaveis";

const pal = colors as unknown as Record<string, Record<string, string>>;

describe("skins do laboratório", () => {
  it("há o original e uma skin por sala", () => {
    expect([...SKINS_ID].sort()).toEqual(["original", ...TEMAS_ID].sort());
    expect(SKIN_PADRAO).toBe("original");
  });

  it("toda skin troca as três famílias por paletas que o Tailwind tem, com os 11 tons", () => {
    for (const id of SKINS_ID) for (const fam of FAMILIAS) {
      const p = pal[SKINS[id].troca[fam]];
      expect(p, `${id}.${fam}`).toBeTruthy();
      for (const tom of TONS) expect(p![tom], `${id}.${fam}.${tom}`).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("o ORIGINAL vale exatamente o Tailwind de hoje (nenhum pixel muda)", () => {
    const v = variaveisDaSkin("original");
    for (const fam of FAMILIAS) for (const tom of TONS) {
      expect(v[`--sk-${fam}-${tom}`]).toBe(hexParaRgb(pal[fam]![tom]!).join(" "));
    }
    expect(v["--sk-cyan-500"]).toBe("6 182 212");
    expect(v["--sk-fundo"]).toBe(FUNDOS_ORIGINAIS.fundo.join(" "));
    expect(v["--sk-vidro"]).toBe("22 22 34");
    expect(v["--sk-popover"]).toBe("11 16 32");
    expect(v["--sk-gaveta"]).toBe("14 14 24");
  });

  it("cada skin de sala muda o destaque e tinge os fundos escuros, sem clareá-los demais", () => {
    const original = variaveisDaSkin("original");
    for (const id of SKINS_ID) {
      if (id === "original") continue;
      const v = variaveisDaSkin(id);
      expect(Object.keys(v).sort()).toEqual(Object.keys(original).sort());
      expect(v["--sk-sky-100"], id).not.toBe(original["--sk-sky-100"]);
      expect(v["--sk-blue-500"], id).not.toBe(original["--sk-blue-500"]);
      // o DESTAQUE (cyan) muda em toda skin, fora a Cyber, que é ciano de propósito (ela muda o sky e o blue)
      if (id === "cyber") expect(v["--sk-cyan-500"]).toBe(original["--sk-cyan-500"]);
      else for (const tom of TONS) expect(v[`--sk-cyan-${tom}`], `${id} cyan-${tom}`).not.toBe(original[`--sk-cyan-${tom}`]);
      // e o valor é o da paleta que a skin declarou
      for (const fam of FAMILIAS) expect(v[`--sk-${fam}-500`], `${id}.${fam}`).toBe(hexParaRgb(pal[SKINS[id].troca[fam]]!["500"]!).join(" "));
      expect(v["--sk-fundo"], id).not.toBe(original["--sk-fundo"]);
      for (const n of v["--sk-fundo"]!.split(" ").map(Number)) expect(n, `${id} fundo`).toBeLessThan(60);
      for (const valor of Object.values(v)) expect(valor).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
    }
  });

  it("a bolinha do seletor é o tom 500 da paleta (cyber usa a do azul, pra não ser igual ao original)", () => {
    for (const id of SKINS_ID) {
      const fam = id === "cyber" ? "blue" : "cyan";
      expect(SKINS[id].amostra.toLowerCase(), id).toBe(pal[SKINS[id].troca[fam]]!["500"]!.toLowerCase());
    }
    expect(new Set(SKINS_ID.map((id) => SKINS[id].amostra)).size).toBe(SKINS_ID.length);
  });

  it("o CSS base tem :root e um bloco por skin; o Tailwind lê as variáveis com alfa", () => {
    const css = cssBaseDasSkins();
    expect(Object.keys(css)).toEqual([":root", ...SKINS_ID.filter((s) => s !== "original").map((s) => `[data-skin="${s}"]`)]);
    // cada bloco carrega os valores DAQUELA skin (não os do original repetidos)
    expect(css[":root"]).toEqual(variaveisDaSkin("original"));
    for (const id of SKINS_ID) if (id !== "original") {
      expect(css[`[data-skin="${id}"]`], id).toEqual(variaveisDaSkin(id));
      expect(css[`[data-skin="${id}"]`], id).not.toEqual(css[":root"]);
    }
    const cores = coresDoTailwind() as Record<string, Record<string, string> & string>;
    expect(cores.cyan!["500"]).toBe("rgb(var(--sk-cyan-500) / <alpha-value>)");
    expect(cores.skfundo).toBe("rgb(var(--sk-fundo) / <alpha-value>)");
    expect(Object.keys(cores).sort()).toEqual(["blue", "cyan", "skfundo", "skgaveta", "skpopover", "skvidro", "sky"]);
  });

  it("lixo vira o padrão", () => {
    expect(ehSkin("med")).toBe(true);
    expect(ehSkin("barbie")).toBe(false);
    for (const lixo of [null, undefined, 3, "", "MED", {}, "barbie"]) expect(skinValida(lixo)).toBe("original");
    expect(skinValida("lounge")).toBe("lounge");
  });
});
