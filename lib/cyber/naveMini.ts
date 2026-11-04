/**
 * Cyberespaço — a NAVE MINI (PURO, sem three): a versão pequena da nave coworking (nov/2026, o dono: "uma versão em
 * miniatura, pra apenas 5 pessoas, um ar mais aconchegante, cores suaves e leves, apenas um lounge um pouco mais
 * diferenciado — todos convivem juntos, mas ainda com ar de nave, espaçosa").
 *
 * Um convés só, sem divisórias: um LOUNGE aberto dentro de um casco superelipse mais redondo (a proa é +z):
 *  - na proa, a CABINE: o painel de navegação em arco, as duas poltronas de piloto e a janela panorâmica;
 *  - no meio, a RODA (os 5 lugares), debaixo da CÚPULA de vidro no teto;
 *  - a estibordo (+x), pra popa, a COPA (o balcão); o resto muda com a SKIN (o dono escolhe):
 *    · TRON (a padrão, nov/2026: "neon cyberpunk estético da Zaeon, estilo Tron, nada de fogueira — gadgets, sofás
 *      alongados, narguilés, telas e terminais"): sofás longos frente a frente em volta da mesa holográfica, o
 *      narguilé, a estação de terminais, o cinema, o lounge do narguilé, as torres de dados;
 *    · AGRADÁVEL (a 1ª versão, clara e quente): o sofá em arco em volta da lareira, o canto de leitura, a rede, o banco
 *      da janela;
 *  - na popa, a CHEGADA (o anel no piso) e o PORTAL (o buraco negro pra Cidade Zaeon).
 *
 * Coordenadas LOCAIS em metros: +z = proa, x = estibordo; y = altura acima do piso. Os móveis são retângulos (a colisão
 * — lib/cyber/universidade `empurrarDosRetangulos`); o desenho (components/cyber/NaveMini) lê o `tipo` e o `rumo`
 * (pra onde a frente do móvel aponta, em rad, 0 = +z).
 */
export const NAVE_MINI = {
  /** semi-eixos do casco (x, z) e o expoente da superelipse (mais redondo que a nave grande: um casulo) */
  a: 10, b: 17, n: 2.6,
  /** a altura das paredes e do teto */
  alturaCasco: 4.8,
  /** onde se nasce (o anel da popa) e pra onde se olha: a roda e, depois dela, a janela da cabine */
  chegada: { x: 0, z: -5.4, rumo: 0 },   // (longe o bastante do portal da popa: a câmera atrás do personagem não entra no buraco negro)
  /** o buraco negro da popa (sai pra Cidade Zaeon) */
  portal: { x: 0, z: -13.6, r: 1.7 },
  /** o centro da roda (a lareira), o raio do sofá e a abertura dele (rad, de cada lado do eixo da popa) */
  roda: { x: 0, z: 1.5, r: 3.6, abertura: 0.72 },
  /** a cúpula de vidro no teto, em cima da roda (semi-eixos x, z) */
  cupula: { a: 4.4, b: 5.6, alt: 2.2 },
  /** a janela panorâmica da cabine começa aqui (z) */
  janela: 7.5,
} as const;
const N = NAVE_MINI;

/** o ponto está dentro do casco (com uma folga `margem` da parede, m)? */
export function noCascoMini(x: number, z: number, margem = 0): boolean {
  const a = N.a - margem, b = N.b - margem;
  return Math.abs(x / a) ** N.n + Math.abs(z / b) ** N.n <= 1;
}
/** o contorno do casco, sentido anti-horário, `k` pontos */
export function contornoDoMini(k = 96, margem = 0): { x: number; z: number }[] {
  const a = N.a - margem, b = N.b - margem, e = 2 / N.n, sg = (v: number) => Math.sign(v) * Math.abs(v) ** e;
  return Array.from({ length: k }, (_, i) => { const t = (i / k) * Math.PI * 2; return { x: a * sg(Math.cos(t)), z: b * sg(Math.sin(t)) }; });
}

/** as SKINS da nave (o dono escolhe): a TRON (neon cyberpunk da Zaeon, a padrão) e a AGRADÁVEL (clara e quente) */
export type SkinMini = "tron" | "agradavel";
export const SKINS_MINI: readonly SkinMini[] = ["tron", "agradavel"];
export const SKIN_MINI_PADRAO: SkinMini = "tron";
export const NOME_SKIN_MINI: Record<SkinMini, string> = { tron: "Neon (Tron)", agradavel: "Agradável" };
export const ehSkinMini = (s: unknown): s is SkinMini => typeof s === "string" && (SKINS_MINI as readonly string[]).includes(s);

export type CantoMini = "cabine" | "roda" | "leitura" | "janela" | "copa" | "popa" | "terminais" | "cinema";
export type TipoMini =
  // as duas skins
  | "painel" | "poltronaPiloto" | "balcao" | "banqueta" | "mesaBaixa" | "puff"
  // a agradável
  | "sofaArco" | "lareira" | "estante" | "pufao" | "luminaria" | "rede" | "banco" | "planta"
  // a tron
  | "sofaLongo" | "mesaHolo" | "narguile" | "terminal" | "telao" | "torre";
export type MovelMini = { tipo: TipoMini; canto: CantoMini; x0: number; x1: number; z0: number; z1: number; alt: number; /** pra onde a frente aponta (rad, 0 = +z) */ rumo?: number; /** atravessável */ solido?: boolean };
export type LugarMini = { x: number; z: number; rumo: number };

const ret = (tipo: TipoMini, canto: CantoMini, cx: number, cz: number, lx: number, lz: number, alt: number, rumo = 0, solido = true): MovelMini =>
  ({ tipo, canto, x0: cx - lx / 2, x1: cx + lx / 2, z0: cz - lz / 2, z1: cz + lz / 2, alt, rumo, solido });

/** o que as duas skins têm igual: a cabine e a copa */
function comuns(m: MovelMini[]) {
  m.push(ret("painel", "cabine", 0, 14.1, 6, 0.8, 1.0, Math.PI));
  for (const sx of [-1, 1]) m.push(ret("poltronaPiloto", "cabine", sx * 1.5, 12.3, 0.9, 0.9, 1.2, 0));
  m.push(ret("balcao", "copa", 7.6, -5.6, 0.9, 4.4, 1.05, -Math.PI / 2));
  for (const z of [-7.2, -5.6, -4.0]) m.push(ret("banqueta", "copa", 6.6, z, 0.5, 0.5, 0.75, Math.PI / 2, false));
  m.push(ret("mesaBaixa", "copa", 4.6, -9.6, 1.2, 1.2, 0.42));
  for (const sx of [-1, 1]) m.push(ret("puff", "copa", 4.6 + sx * 1.15, -9.6, 0.8, 0.8, 0.42));
}

// ── a skin AGRADÁVEL: a roda de sofá em arco em volta da lareira, o canto de leitura, o banco da janela ──
/** os ângulos do arco do sofá (o ponto do ângulo a = (cos a, sin a) × r em volta da roda): aberto pra popa (−z) */
export const ARCO_SOFA = { a0: -Math.PI / 2 + N.roda.abertura, a1: Math.PI * 1.5 - N.roda.abertura } as const;
function moveisAgradavel(): MovelMini[] {
  const m: MovelMini[] = []; comuns(m);
  for (const sx of [-1, 1]) m.push(ret("planta", "cabine", sx * 5.2, 11.4, 1.0, 1.0, 1.8));
  { const { a0, a1 } = ARCO_SOFA, n = 9, R = N.roda.r;
    for (let k = 0; k < n; k++) { const a = a0 + ((a1 - a0) * k) / (n - 1); m.push(ret("sofaArco", "roda", N.roda.x + Math.cos(a) * R, N.roda.z + Math.sin(a) * R, 1.2, 1.2, 0.8, Math.atan2(-Math.cos(a), -Math.sin(a)))); }
    m.push(ret("lareira", "roda", N.roda.x, N.roda.z, 1.6, 1.6, 0.45)); }
  m.push(ret("estante", "leitura", -8.6, -2.2, 0.5, 3.6, 2.2, Math.PI / 2));
  for (const [x, z] of [[-6.7, -0.6], [-6.4, -3.6], [-7.6, 1.8]] as const) m.push(ret("pufao", "leitura", x, z, 1.2, 1.2, 0.6));
  m.push(ret("luminaria", "leitura", -8.4, 0.25, 0.5, 0.5, 1.9));
  m.push(ret("rede", "leitura", -7.1, 6.6, 1.0, 3.2, 1.4));
  for (const z of [4.6, 7.4]) m.push(ret("banco", "janela", 7.6, z, 0.9, 2.0, 0.5, Math.PI / 2));
  m.push(ret("planta", "janela", 8.3, 1.6, 1.0, 1.0, 1.8));
  m.push(ret("planta", "popa", -8.0, -6.6, 1.0, 1.0, 1.8));
  return m;
}
const lugaresAgradavel = (): LugarMini[] => Array.from({ length: 5 }, (_, k) => {
  const { a0, a1 } = ARCO_SOFA, a = a0 + 0.42 + ((a1 - a0 - 0.84) * k) / 4, r = N.roda.r - 0.08;
  return { x: N.roda.x + Math.cos(a) * r, z: N.roda.z + Math.sin(a) * r, rumo: Math.atan2(-Math.cos(a), -Math.sin(a)) };
});

// ── a skin TRON: dois sofás longos frente a frente em volta da mesa holográfica (o narguilé entre eles), a estação de
//    terminais e o cinema a bombordo, o lounge do narguilé e a tela a estibordo, as torres de dados ──
/** os dois sofás longos do centro (x do meio do sofá, comprimento) */
export const SOFAS_TRON = { x: 2.7, comp: 5.2, fundo: 1.1 } as const;
function moveisTron(): MovelMini[] {
  const m: MovelMini[] = []; comuns(m);
  for (const sx of [-1, 1]) m.push(ret("torre", "cabine", sx * 5.2, 11.4, 0.8, 0.8, 2.6));
  // o CENTRO: a mesa holográfica, os dois sofás longos (de frente um pro outro) e o narguilé na ponta da proa
  m.push(ret("mesaHolo", "roda", N.roda.x, N.roda.z, 1.8, 1.8, 0.5));
  for (const sx of [-1, 1]) m.push(ret("sofaLongo", "roda", N.roda.x + sx * SOFAS_TRON.x, N.roda.z, SOFAS_TRON.fundo, SOFAS_TRON.comp, 0.9, sx < 0 ? Math.PI / 2 : -Math.PI / 2));
  m.push(ret("narguile", "roda", N.roda.x + 1.4, N.roda.z + 3.2, 0.6, 0.6, 1.1));   // (do lado: a outra metade da ponta é o ELEVADOR da cúpula)
  // a ESTAÇÃO DE TERMINAIS (bombordo, pra popa): três consoles de pé virados pro meio
  for (const z of [-4.6, -2.6, -0.6]) m.push(ret("terminal", "terminais", -8.2, z, 0.8, 1.4, 1.5, Math.PI / 2));
  // o CINEMA (bombordo, na frente): a tela grande no casco e o sofá longo de frente pra ela
  m.push(ret("telao", "cinema", -8.0, 6.2, 0.4, 3.2, 2.6, Math.PI / 2));
  m.push(ret("sofaLongo", "cinema", -5.2, 6.2, 1.0, 3.4, 0.9, -Math.PI / 2));
  // o LOUNGE DO NARGUILÉ (estibordo, na frente): o sofá longo no casco e o narguilé na frente dele; a tela do lado
  m.push(ret("sofaLongo", "janela", 7.5, 5.8, 1.0, 4.4, 0.9, -Math.PI / 2));
  m.push(ret("narguile", "janela", 5.6, 5.8, 0.6, 0.6, 1.1));
  m.push(ret("telao", "janela", 8.4, -0.8, 0.4, 3.0, 2.6, -Math.PI / 2));
  m.push(ret("torre", "popa", -8.0, -6.6, 0.8, 0.8, 2.6));
  return m;
}
const lugaresTron = (): LugarMini[] => {
  const { x, comp } = SOFAS_TRON, sx = x - 0.08;
  return [
    ...[-comp / 3, 0, comp / 3].map((dz) => ({ x: N.roda.x - sx, z: N.roda.z + dz, rumo: Math.PI / 2 })),
    ...[-comp / 6, comp / 6].map((dz) => ({ x: N.roda.x + sx, z: N.roda.z + dz, rumo: -Math.PI / 2 })),
  ];
};

const cache = new Map<SkinMini, MovelMini[]>();
/** todos os móveis da nave mini, na skin */
export function moveisDaMini(skin: SkinMini = SKIN_MINI_PADRAO): MovelMini[] {
  let m = cache.get(skin); if (!m) { m = skin === "tron" ? moveisTron() : moveisAgradavel(); cache.set(skin, m); }
  return m;
}
/** os 5 lugares do meio (onde se senta: o meio do assento) e pra onde cada um olha */
export const lugaresDaMini = (skin: SkinMini = SKIN_MINI_PADRAO): readonly LugarMini[] => (skin === "tron" ? lugaresTron() : lugaresAgradavel());

/** o ELEVADOR DE LUZ debaixo da cúpula (onde se sobe pro teto de fora — lib/cyber/minhaNave): um anel no piso, livre
 *  dos móveis de cada skin */
export const ELEVADOR_MINI: Record<SkinMini, { x: number; z: number; r: number }> = {
  tron: { x: N.roda.x - 1.4, z: N.roda.z + 3.5, r: 0.7 },
  agradavel: { x: N.roda.x - 1.6, z: N.roda.z - 1.1, r: 0.6 },
};
