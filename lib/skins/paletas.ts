/**
 * lib/skins/paletas.ts — as SKINS do laboratório: por qual paleta do Tailwind cada família de cor é trocada.
 *
 * O laboratório se pinta com três famílias: `cyan` (o destaque), `sky` e `blue` (os tons de fundo e de vidro).
 * Uma skin não desenha nada novo: só diz "onde era cyan, use rose". Degradês, vidro e sombras continuam os mesmos.
 * "original" troca cada família por ela mesma — é o visual de sempre, e o padrão de todo mundo.
 *
 * SÓ imports relativos aqui e em ./variaveis: o tailwind.config.ts carrega estes arquivos sem o alias "@/".
 */
export const SKINS_ID = ["original", "cyber", "med", "bio", "quantic", "humanities", "lounge"] as const;
export type SkinId = (typeof SKINS_ID)[number];
export const SKIN_PADRAO: SkinId = "original";

export const FAMILIAS = ["cyan", "sky", "blue"] as const;
export type Familia = (typeof FAMILIAS)[number];

export const TONS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] as const;
export type Tom = (typeof TONS)[number];

export type Paleta = "cyan" | "sky" | "blue" | "teal" | "rose" | "pink" | "emerald" | "green" | "indigo" | "amber" | "orange" | "violet" | "purple";

export type Skin = {
  /** nome próprio (não se traduz), fora o "original" que tem tradução na tela */
  nome: string;
  /** família do laboratório → paleta do Tailwind que entra no lugar */
  troca: Record<Familia, Paleta>;
  /** a cor da bolinha no seletor (o tom 500 da paleta de destaque — conferido por teste) */
  amostra: string;
};

export const SKINS: Record<SkinId, Skin> = {
  original:   { nome: "Original",      troca: { cyan: "cyan",    sky: "sky",     blue: "blue"   }, amostra: "#06b6d4" },
  cyber:      { nome: "Cyber Room",    troca: { cyan: "cyan",    sky: "cyan",    blue: "teal"   }, amostra: "#14b8a6" },
  med:        { nome: "MedLab",        troca: { cyan: "rose",    sky: "rose",    blue: "pink"   }, amostra: "#f43f5e" },
  bio:        { nome: "Bio Room",      troca: { cyan: "emerald", sky: "emerald", blue: "green"  }, amostra: "#10b981" },
  quantic:    { nome: "Quantic Room",  troca: { cyan: "blue",    sky: "blue",    blue: "indigo" }, amostra: "#3b82f6" },
  humanities: { nome: "Grand Archive", troca: { cyan: "amber",   sky: "amber",   blue: "orange" }, amostra: "#f59e0b" },
  lounge:     { nome: "Lounge",        troca: { cyan: "violet",  sky: "violet",  blue: "purple" }, amostra: "#8b5cf6" },
};

export function ehSkin(v: unknown): v is SkinId {
  return typeof v === "string" && (SKINS_ID as readonly string[]).includes(v);
}

/** qualquer coisa que venha do navegador ou da conta → uma skin que existe (lixo vira o padrão) */
export function skinValida(v: unknown): SkinId {
  return ehSkin(v) ? v : SKIN_PADRAO;
}
