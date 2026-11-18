/**
 * lib/skins/variaveis.ts — os VALORES das variáveis CSS de cada skin (`--sk-cyan-500: 6 182 212` …).
 * Usado pelo plugin do tailwind.config.ts (que declara tudo no CSS) e pelos testes. Não entra no bundle do app.
 */
import colors from "tailwindcss/colors";
import { FAMILIAS, SKINS, SKINS_ID, TONS, type SkinId } from "./paletas";

/** os fundos escuros escritos à mão no shell do laboratório, no visual original */
export const FUNDOS_ORIGINAIS = { fundo: [3, 0, 20], vidro: [22, 22, 34], popover: [11, 16, 32] } as const;
/** quanto do tom 950 da skin entra nos fundos escuros */
export const TOM_NO_FUNDO = 0.35;

type RGB = readonly [number, number, number];

export function hexParaRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const c = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}
const tripla = (c: RGB) => `${c[0]} ${c[1]} ${c[2]}`;
const misturar = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i]! + (b[i]! - a[i]!) * t)) as unknown as RGB;

const paleta = (nome: string) => (colors as unknown as Record<string, Record<string, string>>)[nome]!;

/** todas as variáveis de uma skin: 3 famílias × 11 tons + 3 fundos escuros */
export function variaveisDaSkin(id: SkinId): Record<string, string> {
  const skin = SKINS[id];
  const v: Record<string, string> = {};
  for (const fam of FAMILIAS) {
    const p = paleta(skin.troca[fam]);
    for (const tom of TONS) v[`--sk-${fam}-${tom}`] = tripla(hexParaRgb(p[tom]!));
  }
  const tinta = hexParaRgb(paleta(skin.troca.cyan)["950"]!);
  for (const [nome, base] of Object.entries(FUNDOS_ORIGINAIS)) {
    v[`--sk-${nome}`] = tripla(id === "original" ? base : misturar(base, tinta, TOM_NO_FUNDO));
  }
  return v;
}

/** o bloco de CSS base: `:root` com o original e `[data-skin="x"]` com cada skin */
export function cssBaseDasSkins(): Record<string, Record<string, string>> {
  const css: Record<string, Record<string, string>> = { ":root": variaveisDaSkin("original") };
  for (const id of SKINS_ID) if (id !== "original") css[`[data-skin="${id}"]`] = variaveisDaSkin(id);
  return css;
}

/** as cores do tema do Tailwind que passam a ler as variáveis */
export function coresDoTailwind(): Record<string, string | Record<string, string>> {
  const cores: Record<string, string | Record<string, string>> = {};
  for (const fam of FAMILIAS) {
    cores[fam] = Object.fromEntries(TONS.map((tom) => [tom, `rgb(var(--sk-${fam}-${tom}) / <alpha-value>)`]));
  }
  for (const nome of Object.keys(FUNDOS_ORIGINAIS)) cores[`sk${nome}`] = `rgb(var(--sk-${nome}) / <alpha-value>)`;
  return cores;
}
