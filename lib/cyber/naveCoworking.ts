/**
 * Cyberespaço — a NAVE COWORKING (PURO, sem three): onde cada pessoa começa no cyberespaço (nov/2026, o dono: "o
 * usuário fica a bordo de uma nave espacial… todo o ambiente adaptado pra ser um espaço de co-working"). O visual
 * vem do Lounge Cósmico: piso violeta-escuro, neon lavanda, magenta e ciano, a mandala e o olho holográfico.
 *
 * Um convés só, comprido (a proa é +z), dentro de um casco SUPERELIPSE (`noCasco`):
 *  - na proa, o MIRANTE (a janela panorâmica pro espaço, o olho holográfico flutuando, puffs virados pra fora);
 *  - no meio, a AVENIDA (o corredor largo) com o ÁTRIO DE CHEGADA (onde se nasce: o anel aceso);
 *  - a bombordo (−x): o COWORKING aberto (ilhas de 4 mesas), a SALA ÓRION (reuniões, vidro) e as CABINES DE FOCO;
 *  - a estibordo (+x): o CHILL-OUT (tapete mandala, sofá em arco, puffs, plantas que brilham), a SALA LYRA (reuniões,
 *    mesa redonda com holograma) e o CAFÉ ÓRBITA (balcão, banquetas, mesinhas);
 *  - na popa, o PORTAL (o buraco negro pra Cidade Zaeon).
 *
 * Coordenadas LOCAIS em metros: +z = proa, x = estibordo; y = altura acima do piso do convés. Os móveis são
 * retângulos (a colisão — lib/cyber/universidade `empurrarDosRetangulos`); o desenho (components/cyber/NaveCoworking)
 * lê o `tipo` e o `rumo` (pra onde a frente do móvel aponta, em rad, 0 = +z).
 */
import { paredesDoRetangulo, type Parede } from "./universidade";

export const NAVE_COWORK = {
  /** semi-eixos do casco (x, z) e o expoente da superelipse (2 = elipse; 4 = mais "caixa" com cantos redondos) */
  a: 19, b: 38, n: 4,
  /** a altura das paredes do casco e do teto (o convés é alto: dá pra voar baixinho de mochila lá dentro) */
  alturaCasco: 6.5,
  /** a altura das divisórias internas (as salas de vidro) */
  pe: 3.2,
  /** onde se nasce (o anel do átrio) e pra onde se olha */
  chegada: { x: 0, z: 14, rumo: Math.PI },
  /** o buraco negro da popa (sai pra Cidade Zaeon) */
  portal: { x: 0, z: -31, r: 2.6 },
} as const;
const N = NAVE_COWORK;

/** o ponto está dentro do casco (com uma folga `margem` da parede, m)? */
export function noCasco(x: number, z: number, margem = 0): boolean {
  const a = N.a - margem, b = N.b - margem;
  return Math.abs(x / a) ** N.n + Math.abs(z / b) ** N.n <= 1;
}
/** o contorno do casco (o piso, as paredes, o teto), sentido anti-horário, `k` pontos */
export function contornoDoCasco(k = 96, margem = 0): { x: number; z: number }[] {
  const a = N.a - margem, b = N.b - margem, e = 2 / N.n, sg = (v: number) => Math.sign(v) * Math.abs(v) ** e;
  return Array.from({ length: k }, (_, i) => { const t = (i / k) * Math.PI * 2; return { x: a * sg(Math.cos(t)), z: b * sg(Math.sin(t)) }; });
}

export type IdArea = "mirante" | "avenida" | "cowork" | "orion" | "foco" | "chill" | "lyra" | "cafe" | "portal" | "lounge2" | "terraco";
export type Area = { id: IdArea; nome: string; /** o neon da área (piso, frisos, placa) */ cor: number; x0: number; x1: number; z0: number; z1: number };
/** as áreas (retângulos; as da proa e da popa são cortadas pelo casco no desenho) */
export const AREAS: Area[] = [
  { id: "mirante", nome: "Mirante", cor: 0x66e6ff, x0: -15, x1: 15, z0: 22, z1: 37 },
  { id: "avenida", nome: "Átrio", cor: 0xb98cff, x0: -3, x1: 3, z0: -26, z1: 22 },
  { id: "cowork", nome: "Coworking Nebulosa", cor: 0x8fb4ff, x0: -17, x1: -3, z0: 4, z1: 22 },
  { id: "orion", nome: "Sala Órion", cor: 0x5fd8ff, x0: -17, x1: -6, z0: -10, z1: 4 },
  { id: "foco", nome: "Cabines de foco", cor: 0x9affd0, x0: -17, x1: -6, z0: -26, z1: -10 },
  { id: "chill", nome: "Chill-out", cor: 0xff6fd8, x0: 3, x1: 17, z0: 4, z1: 22 },
  { id: "lyra", nome: "Sala Lyra", cor: 0xc69bff, x0: 6, x1: 17, z0: -10, z1: 4 },
  { id: "cafe", nome: "Café Órbita", cor: 0xffc46b, x0: 6, x1: 17, z0: -26, z1: -10 },
  { id: "portal", nome: "Portal · Cidade Zaeon", cor: 0xb98cff, x0: -10, x1: 10, z0: -37, z1: -26 },
];
export const area = (id: IdArea) => AREAS.find((x) => x.id === id)!;

export type TipoMovel =
  | "mesa" | "cadeira" | "mesaReuniao" | "mesaRedonda" | "telao" | "cabine" | "sofaArco" | "puff" | "planta"
  | "balcao" | "banqueta" | "mesinha" | "maquinaCafe" | "poltrona" | "totem" | "floreira"
  | "espreguicadeira" | "mesaBaixa" | "fogueira" | "telescopio";
export type MovelCW = { tipo: TipoMovel; area: IdArea; x0: number; x1: number; z0: number; z1: number; alt: number; /** pra onde a frente aponta (rad, 0 = +z) */ rumo?: number; /** atravessável (tapete, a cadeira afastada) */ solido?: boolean };

const ret = (tipo: TipoMovel, ar: IdArea, cx: number, cz: number, lx: number, lz: number, alt: number, rumo = 0, solido = true): MovelCW =>
  ({ tipo, area: ar, x0: cx - lx / 2, x1: cx + lx / 2, z0: cz - lz / 2, z1: cz + lz / 2, alt, rumo, solido });

let moveisCache: MovelCW[] | null = null;
/** todos os móveis do convés (gerados pela planta) */
export function moveisDaNave(): MovelCW[] {
  if (moveisCache) return moveisCache;
  const m: MovelCW[] = [];
  // COWORKING: 6 ilhas de 4 mesas (2 × 2, frente a frente) com as cadeiras
  for (const cx of [-13.4, -7.6]) for (const cz of [7.6, 12.6, 17.6]) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      m.push(ret("mesa", "cowork", cx + sx * 0.8, cz + sz * 0.42, 1.56, 0.8, 0.75, sz > 0 ? Math.PI : 0));
      m.push(ret("cadeira", "cowork", cx + sx * 0.8, cz + sz * 1.3, 0.55, 0.55, 0.9, sz > 0 ? Math.PI : 0, false));
    }
  }
  // SALA ÓRION: a mesa comprida, 8 cadeiras e o telão na parede do casco
  { const c = { x: -11.8, z: -3 };
    m.push(ret("mesaReuniao", "orion", c.x, c.z, 2.2, 5.6, 0.76));
    for (const dz of [-2.1, -0.7, 0.7, 2.1]) for (const sx of [-1, 1]) m.push(ret("cadeira", "orion", c.x + sx * 1.55, c.z + dz, 0.55, 0.55, 0.9, sx > 0 ? -Math.PI / 2 : Math.PI / 2, false));
    m.push(ret("telao", "orion", -16.3, c.z, 0.2, 4.4, 2.6, Math.PI / 2)); }
  // SALA LYRA: a mesa redonda (o holograma no meio) com 8 cadeiras em volta
  { const c = { x: 11.6, z: -3 }, R = 2.25;
    m.push(ret("mesaRedonda", "lyra", c.x, c.z, 3.0, 3.0, 0.76));
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; m.push(ret("cadeira", "lyra", c.x + Math.sin(a) * R, c.z + Math.cos(a) * R, 0.55, 0.55, 0.9, a + Math.PI, false)); }
    m.push(ret("telao", "lyra", 16.3, c.z, 0.2, 4.4, 2.6, -Math.PI / 2)); }
  // CABINES DE FOCO: 4 cápsulas de vidro (a porta pra avenida) com mesinha e cadeira
  for (const [cx, cz] of CABINES) {
    m.push(ret("mesa", "foco", cx - 0.55, cz, 0.7, 1.3, 0.75, -Math.PI / 2));
    m.push(ret("cadeira", "foco", cx + 0.25, cz, 0.55, 0.55, 0.9, -Math.PI / 2, false));
  }
  // CHILL-OUT: o sofá em arco (aberto pra avenida), os puffs no tapete, as plantas que brilham, poltronas no casco
  { const c = CHILL, R = 4.6, n = 9;
    for (let k = 0; k < n; k++) { const a = -Math.PI * 0.8 + (k / (n - 1)) * Math.PI * 1.6; m.push(ret("sofaArco", "chill", c.x + Math.cos(a) * R, c.z + Math.sin(a) * R, 1.3, 1.3, 0.8, Math.atan2(-Math.cos(a), -Math.sin(a)))); }
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + 0.3; m.push(ret("puff", "chill", c.x + Math.cos(a) * 2.1, c.z + Math.sin(a) * 2.1, 0.9, 0.9, 0.45)); }
    for (const [px, pz] of [[15.6, 5.2], [15.6, 20.8], [4.2, 20.8]] as const) m.push(ret("planta", "chill", px, pz, 1.2, 1.2, 2.6));
    m.push(ret("poltrona", "chill", 15.4, 13, 1.1, 1.1, 0.9, -Math.PI / 2)); }
  // CAFÉ ÓRBITA: o balcão no casco, a máquina, as banquetas e 3 mesinhas com 2 banquetas cada
  { m.push(ret("balcao", "cafe", 15.2, -18, 1.1, 10, 1.1, -Math.PI / 2));
    m.push(ret("maquinaCafe", "cafe", 16.2, -14.5, 0.7, 1.2, 1.7, -Math.PI / 2));
    for (const z of [-21.6, -19.8, -18, -16.2, -14.4]) m.push(ret("banqueta", "cafe", 13.9, z, 0.5, 0.5, 0.75, Math.PI / 2, false));
    for (const [x, z] of [[9.2, -13.6], [9.2, -18.2], [9.2, -22.8]] as const) {
      m.push(ret("mesinha", "cafe", x, z, 1.0, 1.0, 1.05));
      for (const sx of [-1, 1]) m.push(ret("banqueta", "cafe", x + sx * 0.95, z, 0.5, 0.5, 0.75, sx > 0 ? -Math.PI / 2 : Math.PI / 2, false));
    } }
  // MIRANTE: puffs grandes de frente pra janela, o totem de boas-vindas no átrio
  for (const x of [-9.6, -6.4, -3.2, 3.2, 6.4, 9.6]) m.push(ret("puff", "mirante", x, 28.5 - Math.abs(x) * 0.12, 1.4, 1.4, 0.5));
  m.push(ret("totem", "avenida", 0, 19.5, 1.2, 0.5, 2.4, Math.PI));
  // a AVENIDA: floreiras baixas dividindo dos lados (sem fechar)
  for (const z of [-19, -5, 8]) for (const sx of [-1, 1]) m.push(ret("floreira", "avenida", sx * 2.75, z, 0.5, 3, 0.7));
  moveisCache = m;
  return m;
}
/** o centro das cabines de foco */
export const CABINES: readonly (readonly [number, number])[] = [[-14.2, -13.4], [-9.2, -13.4], [-14.2, -21.6], [-9.2, -21.6]];
/** o centro do chill-out (o tapete mandala) */
export const CHILL = { x: 10.4, z: 13 } as const;
/** o lado das cabines de foco (quadradas, de vidro) */
export const LADO_CABINE = 2.8;

let paredesCache: Parede[] | null = null;
/** as divisórias internas (de vidro): as duas salas de reuniões (a porta pra avenida) e as cabines de foco */
export function paredesDaNave(): Parede[] {
  if (paredesCache) return paredesCache;
  const o = area("orion"), l = area("lyra"), esp = 0.12, alt = N.pe, h = LADO_CABINE / 2;
  paredesCache = [
    ...paredesDoRetangulo(o.x0, o.x1, o.z0, o.z1, esp, alt, { l: [{ c: -3, w: 2.4 }] }),
    ...paredesDoRetangulo(l.x0, l.x1, l.z0, l.z1, esp, alt, { o: [{ c: -3, w: 2.4 }] }),
    ...CABINES.flatMap(([cx, cz]) => paredesDoRetangulo(cx - h, cx + h, cz - h, cz + h, esp, alt, { l: [{ c: cz, w: 1.1 }] })),
  ];
  return paredesCache;
}

/** a área do ponto (a avenida se não estiver em nenhuma das outras) */
export function areaDoPonto(x: number, z: number): IdArea | null {
  if (!noCasco(x, z)) return null;
  for (const ar of AREAS) if (ar.id !== "avenida" && x >= ar.x0 && x <= ar.x1 && z >= ar.z0 && z <= ar.z1) return ar.id;
  return "avenida";
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// o 2º ANDAR (nov/2026, o dono: "lounge e terraço"): em cima do convés, o casco de cima (uma superelipse menor, recuada
// pra popa) é o LOUNGE com vista 360° (a fita de vidro dá a volta inteira) e, em volta dele, o TERRAÇO aberto no teto
// do 1º andar (o guarda-corpo de vidro na borda). Sobe-se pela ESCADA EM CARACOL que sai da avenida, no meio da nave,
// e chega no meio do lounge, de frente pra PORTA do terraço (na proa do casco de cima).

/** o piso do 2º andar (o teto do 1º, por fora), o casco de cima (semi-eixos + o centro recuado) e a altura do teto */
export const ANDAR2 = { y: 7.7, a: 12.5, b: 22, z: -9, teto: 4.5, /** a porta do lounge pro terraço (na proa do casco de cima) */ porta: { meia: 2.2 } } as const;
/** a escada em caracol: o centro (na avenida), os raios e o giro total (entra pela popa, sai virada pra proa) */
export const ESCADA_CW = { cx: 0, cz: -10, rIn: 0.32, rOut: 2.3, giro: Math.PI * 3, a0: Math.PI } as const;
/** o ponto da escada no ângulo `esc` (0 = o pé, `giro` = o topo) e a altura dele (0 → ANDAR2.y) */
export function pontoDaEscada(esc: number, r = (ESCADA_CW.rIn + ESCADA_CW.rOut) / 2): { x: number; z: number; y: number } {
  const E = ESCADA_CW, a = E.a0 + esc;
  return { x: E.cx + Math.sin(a) * r, z: E.cz + Math.cos(a) * r, y: (esc / E.giro) * ANDAR2.y };
}
/** o ponto está dentro do LOUNGE (o casco de cima, com folga `margem`)? */
export function noLounge2(x: number, z: number, margem = 0): boolean {
  const a = ANDAR2.a - margem, b = ANDAR2.b - margem;
  return Math.abs(x / a) ** N.n + Math.abs((z - ANDAR2.z) / b) ** N.n <= 1;
}
/** o ponto está no TERRAÇO (no teto do 1º andar, fora do lounge, com folga `margem` da borda)? */
export const noTerraco = (x: number, z: number, margem = 0.6) => noCasco(x, z, margem) && !noLounge2(x, z, -0.3);
/** o contorno do lounge (o casco de cima) */
export const contornoDoLounge = (k = 96, s = 1) => contornoDoCasco(k).map((p) => ({ x: (p.x / N.a) * ANDAR2.a * s, z: (p.z / N.b) * ANDAR2.b * s + ANDAR2.z }));

let moveis2Cache: MovelCW[] | null = null;
/** os móveis do 2º andar (o lounge e o terraço), no piso dele (y = ANDAR2.y) */
export function moveisDoAndar2(): MovelCW[] {
  if (moveis2Cache) return moveis2Cache;
  const m: MovelCW[] = [];
  // LOUNGE: duas ilhas de sofá em arco de frente pra proa (a vista), com a mesa baixa no meio
  for (const cx of [-6.2, 6.2]) { const cz = 3.4, R = 2.5, n = 6;
    for (let k = 0; k < n; k++) { const a = Math.PI * 0.25 + (k / (n - 1)) * Math.PI * 1.5; m.push(ret("sofaArco", "lounge2", cx + Math.sin(a) * R, cz + Math.cos(a) * R, 1.1, 1.1, 0.8, a + Math.PI)); }
    m.push(ret("mesaBaixa", "lounge2", cx, cz, 1.4, 1.4, 0.42)); }
  // as espreguiçadeiras viradas pra fita de vidro dos lados
  for (const sx of [-1, 1]) for (const z of [-4.5, -12.5]) m.push(ret("espreguicadeira", "lounge2", sx * 10.3, z, 2.0, 0.9, 0.5, sx * Math.PI / 2));
  // o BAR no fundo (balcão de frente pra proa) com as banquetas
  m.push(ret("balcao", "lounge2", 0, -24, 9, 1.0, 1.1, 0));
  for (const x of [-3.6, -1.8, 0, 1.8, 3.6]) m.push(ret("banqueta", "lounge2", x, -22.8, 0.5, 0.5, 0.75, Math.PI, false));
  for (const [x, z] of [[-9.6, 6.5], [9.6, 6.5], [-8.6, -20], [8.6, -20]] as const) m.push(ret("planta", "lounge2", x, z, 1.2, 1.2, 2.4));
  m.push(ret("telescopio", "lounge2", -4.4, 10.2, 0.9, 0.9, 1.6, 0));
  // TERRAÇO: a fogueira holográfica com os puffs em roda, espreguiçadeiras de frente pra proa e nos flancos
  m.push(ret("fogueira", "terraco", 0, 24, 2.2, 2.2, 0.5));
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + Math.PI / 6; m.push(ret("puff", "terraco", Math.sin(a) * 3.4, 24 + Math.cos(a) * 3.4, 0.9, 0.9, 0.45)); }
  for (const x of [-9, -6, 6, 9]) m.push(ret("espreguicadeira", "terraco", x, 31, 0.9, 2.0, 0.5, 0));
  for (const sx of [-1, 1]) for (const z of [-14, -4, 6]) m.push(ret("espreguicadeira", "terraco", sx * 15.6, z, 2.0, 0.9, 0.5, sx * Math.PI / 2));
  for (const [x, z] of [[-12.5, 17], [12.5, 17], [-7.5, 35.5], [7.5, 35.5]] as const) m.push(ret("planta", "terraco", x, z, 1.2, 1.2, 2.0));
  moveis2Cache = m;
  return m;
}
