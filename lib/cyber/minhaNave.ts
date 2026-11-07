/**
 * Cyberespaço — a SUA NAVE e o ESPAÇO ABERTO em volta dela (PURO). Nov/2026, o dono: "jogadores normais têm a sua nave
 * e o seu ambiente de coworking; sai-se da nave pela parte de cima, pro espaço aberto, onde ficam os buracos negros
 * (a Cidade Zaeon fica fechada, por enquanto, só pros admins)".
 *
 *  - A NAVE MINI (lib/cyber/naveMini) de cada pessoa fica no MESMO ponto do mundo: cada uma é um nível SÓ DELA
 *    ("minha-nave" — os outros não aparecem lá dentro; os convites vêm depois).
 *  - O ELEVADOR DE LUZ debaixo da cúpula sobe, atravessa a cúpula e pousa a pessoa no TETO de fora: o nível "espaco"
 *    (aberto, de todos). Dali, VOANDO (a mochila — o dono: "sem plataformas pra ir a algum lugar, devemos voar"), até os
 *    BURACOS NEGROS soltos no espaço: o LOUNGE (o Templo Cósmico) e a CIDADE DOS ANJOS (a Cidade Zaeon — fechada pra
 *    quem não é admin: não puxa, e quem chega perto é avisado e devolvido). Na mesma escala dos do hub. O anel de DESCIDA no teto volta pra dentro.
 *  - Caiu do teto: a mochila; caiu longe demais, volta pra dentro da nave.
 *
 * Coordenadas LOCAIS da nave: as da planta (+z = proa, y = 0 no piso de dentro). A nave não gira.
 */
import type { P2 } from "./colisao";
import { CIDADE } from "./ceu";
import { ELEVADOR_MINI, NAVE_MINI, moveisDaMini, noCascoMini, type SkinMini } from "./naveMini";
import { empurrarDosRetangulos } from "./universidade";
import { FIO, montarPistaLivre, type FioCosmico } from "./fiosCosmicos";

const N = NAVE_MINI;
/** onde a sua nave fica no mundo (o piso de dentro): longe de tudo, acima da altura da cidade */
export const MINHA_NAVE = { x: CIDADE.centro.x, y: CIDADE.pisoY + 380, z: CIDADE.centro.z + 4300 } as const;
/** o teto de fora (o alto do casco, onde a cúpula assenta) e o tamanho dele (a superelipse × `s`) */
export const TETO_MINI = { y: 5.85, s: 0.7 } as const;
/** o ESPAÇO ABERTO: o raio (m) em volta da nave até onde se voa, e até onde se cai antes de voltar pra dentro */
export const ESPACO = { r: 140, cai: 70, sobe: 90, /** até onde se voa (m da nave): os buracos negros ficam a ~8,8 km */ voo: 11000, /** e até onde se cai/sobe em voo, longe da nave */ caiLonge: 1500, sobeLonge: 900 } as const;

export const paraLocalMini = (p: P2): P2 => ({ x: p.x - MINHA_NAVE.x, z: p.z - MINHA_NAVE.z });
export const paraMundoMini = (l: P2): P2 => ({ x: l.x + MINHA_NAVE.x, z: l.z + MINHA_NAVE.z });

export type NivelMinhaNave = "minha-nave" | "espaco";
/** o nível de um ponto do mundo: dentro do casco (abaixo do teto) = a nave; em volta = o espaço aberto; senão, null */
export function nivelDaMinhaNave(p: P2, y: number): NivelMinhaNave | null {
  const l = paraLocalMini(p), yr = y - MINHA_NAVE.y;
  if (Math.hypot(l.x, l.z) > ESPACO.r + 30 || yr < -ESPACO.cai - 30 || yr > ESPACO.sobe + 30) return null;
  return noCascoMini(l.x, l.z, -0.6) && yr > -4 && yr < TETO_MINI.y - 0.25 ? "minha-nave" : "espaco";
}

// ── DENTRO: o piso, a colisão, o elevador, o teto ──
/** traz pra dentro do casco (com folga) um ponto que escapou — na reta até o meio */
function dentroDoCasco(p: P2, m: number): P2 {
  if (noCascoMini(p.x, p.z, m)) return p;
  let lo = 0, hi = 1; for (let k = 0; k < 18; k++) { const s = (lo + hi) / 2; if (noCascoMini(p.x * s, p.z * s, m)) lo = s; else hi = s; }
  return { x: p.x * lo, z: p.z * lo };
}
/** empurra o ponto (local) pra fora do que é sólido lá dentro (o casco, os móveis da skin) */
export const resolverNaMini = (l: P2, skin: SkinMini, raio = 0.4): P2 => empurrarDosRetangulos(dentroDoCasco(l, 0.2 + raio), moveisDaMini(skin), raio);
/** pisou no anel do elevador? */
export const noElevadorMini = (l: P2, skin: SkinMini) => { const e = ELEVADOR_MINI[skin]; return Math.hypot(l.x - e.x, l.z - e.z) < e.r; };
/** está debaixo da cúpula (ali o teto é a cúpula, bem mais alto)? */
export const naCupula = (l: P2, folga = 0) => ((l.x - N.roda.x) / (N.cupula.a - folga)) ** 2 + ((l.z - N.roda.z) / (N.cupula.b - folga)) ** 2 <= 1;
/** o teto (y local) em cima do ponto: o do convés, ou o alto da cúpula */
export const tetoNaMini = (l: P2, comEscotilha = false) => (naCupula(l, 0.4) ? TETO_MINI.y + N.cupula.alt * 0.75 : comEscotilha && naEscotilha(l) ? TETO_MINI.y + 3 : N.alturaCasco);   // (`comEscotilha`: a câmera sobe pelo vão da escada)

// ── FORA: o teto (o único chão aqui fora) e os BURACOS NEGROS na MESMA ESCALA dos do hub (o dono, nov/2026: "mantenha a
//    distância dos buracos negros, os meteoros — não descarte nosso trabalho"): os mesmos ~8,8 km, o mesmo horizonte, a
//    mesma pista de luz, o mesmo campo de meteoros e o mesmo magnetismo (lib/cyber/fiosCosmicos, lib/cyber/detritos) —
//    vai-se VOANDO; no ponto doce, a tragada leva. Um leva ao LOUNGE; o outro à CIDADE DOS ANJOS (o hub — só admin) ──
export type IdBuracoEspaco = "lounge" | "anjos";
export type BuracoEspaco = { id: IdBuracoEspaco; nome: string; /** a direção (local da nave, no plano) e a cor */ dir: P2; cor: number; soAdmin?: boolean };
export const BURACOS_ESPACO: readonly BuracoEspaco[] = [
  { id: "lounge", nome: "Lounge", dir: { x: 0, z: 1 }, cor: 0xff2fb4 },   // (na frente da proa: o horizonte da janela da cabine e do sofá do teto)
  { id: "anjos", nome: "Cidade dos Anjos", dir: { x: -0.94, z: -0.34 }, cor: 0xb98cff, soAdmin: true },
];
/** o buraco negro está aberto pra esta pessoa? (a Cidade dos Anjos: só admin, por enquanto) */
export const buracoAberto = (b: BuracoEspaco, admin: boolean) => !b.soAdmin || admin;
/** a nave no referencial LOCAL da ilha (o das pistas cósmicas: relativo ao centro da Zaeon, y acima do piso da central) */
export const NAVE_NA_ILHA = { x: MINHA_NAVE.x - CIDADE.centro.x, y: MINHA_NAVE.y - CIDADE.pisoY, z: MINHA_NAVE.z - CIDADE.centro.z } as const;
let cachePistas: { b: BuracoEspaco; f: FioCosmico }[] | null = null;
/** as PISTAS do espaço aberto (uma por buraco negro): da borda do teto, rumo ao buraco negro, a `FIO.alcance` m */
export function pistasDoEspaco(): { b: BuracoEspaco; f: FioCosmico }[] {
  return (cachePistas ??= BURACOS_ESPACO.map((b) => {
    const n = NAVE_NA_ILHA, L = Math.hypot(b.dir.x, b.dir.z) || 1, d = { x: b.dir.x / L, z: b.dir.z / L }, ini = { x: n.x + d.x * 7.5, y: n.y + TETO_MINI.y + 0.3, z: n.z + d.z * 7.5 };
    const bn = { x: n.x + d.x * FIO.alcance, y: FIO.bnY, z: n.z + d.z * FIO.alcance };
    return { b, f: montarPistaLivre(`espaco:${b.id}`, ini, bn, FIO.bnR, b.id === "lounge" ? "lounge" : "jardim", b.id === "anjos") };
  }));
}
/** onde a ZONA dos buracos negros do espaço começa a valer: a tantos metros da nave (como os 100 m depois da cidadela) */
export const ZONA_DEPOIS_DA_NAVE = 90;
/** onde se pousa no teto ao subir pelo elevador (na frente da cúpula, de frente pra proa) e o anel de DESCIDA */
export const CHEGADA_TETO = { x: 2.8, z: N.roda.z + N.cupula.b + 0.8, rumo: 0 } as const;   // (do lado da cúpula, livre do sofá)
export const DESCIDA_TETO = { x: -2.4, z: N.roda.z - N.cupula.b - 1.0, r: 0.9 } as const;
/** o SOFÁ REDONDO do teto, estilo lounge (o dono, nov/2026: "tire essa cadeira e coloque um sofá — pode ser pequeno mas
 *  tem que comportar o corpo deitado, circular, no estilo lounge"): na proa, de frente pro buraco negro do horizonte. O
 *  assento é um disco; o ENCOSTO, um arco baixo só na borda de trás (`encosto` = a abertura dele, rad, de cada lado do eixo
 *  de trás) — o corpo recostado deita nele sem a cabeça passar por dentro */
export const SOFA_TETO = { x: 0, z: 9.25, r: 1.15, rumo: 0, assento: 0.5, encostoR: 0.95, encostoAlt: 0.95, encosto: 1.95 } as const;
/** a DOCA DAS MOTOS no teto, na popa (o dono: "uma plataforma com 5 motos acoplada no topo"): o deck e as 5 vagas */
export const DOCA_MOTOS = { x0: -3.7, x1: 3.7, z0: -10.0, z1: -6.5 } as const;   // (à esquerda dela, a escotilha da escada rolante)
export const VAGAS_DOCA: readonly { x: number; z: number; rumo: number }[] = [-3.0, -1.5, 0, 1.5, 3.0].map((x) => ({ x, z: -8.3, rumo: 0 }));
/** os sólidos do teto (as motos acopladas), como retângulos — o sofá redondo é um círculo (resolverNoTeto) */
const SOLIDOS_TETO = [
  ...VAGAS_DOCA.map((v) => ({ x0: v.x - 0.4, x1: v.x + 0.4, z0: v.z - 1.1, z1: v.z + 1.1, alt: 1.2 })),
];
/** onde se RECOSTA no sofá (o quadril, de frente pro buraco negro — as costas no encosto de trás, as pernas esticadas
 *  pro meio) e onde se fica de pé ao levantar (do lado dele). `CADEIRA_LOGIN` = o lugar do login (o único) */
export const CADEIRA_LOGIN = 0;
export const assentoDaCadeira = (_i = 0) => ({ x: SOFA_TETO.x, z: SOFA_TETO.z - 0.4, rumo: SOFA_TETO.rumo });
export const levantaDaCadeira = (_i = 0) => ({ x: SOFA_TETO.x + SOFA_TETO.r + 0.6, z: SOFA_TETO.z });
/** o sofá ao alcance (pra recostar): 0, ou −1 */
export const cadeiraPerto = (l: P2, alcance = 0.7) => (Math.hypot(l.x - SOFA_TETO.x, l.z - SOFA_TETO.z) < SOFA_TETO.r + alcance ? 0 : -1);
/** a vaga da doca ao alcance de quem está no teto (pra montar), ou −1 */
export const vagaDaDocaPerto = (l: P2, alcance = 1.6) => VAGAS_DOCA.findIndex((v) => Math.hypot(l.x - v.x, l.z - v.z) < alcance);
/** onde o personagem fica na CUTSCENE do login: na cabine, entre as poltronas, olhando o buraco negro pela janela */
export const POSE_CUTSCENE = { x: 0, z: 12.7, rumo: 0 } as const;

const noTeto = (l: P2, folga = 0.3) => Math.abs(l.x / (N.a * TETO_MINI.s - folga)) ** N.n + Math.abs(l.z / (N.b * TETO_MINI.s - folga)) ** N.n <= 1;
/** tem chão aqui fora? (só o teto da nave — o resto é o vazio: voa-se) */
export const chaoNoEspaco = (l: P2) => noTeto(l);
export const naDescida = (l: P2) => Math.hypot(l.x - DESCIDA_TETO.x, l.z - DESCIDA_TETO.z) < DESCIDA_TETO.r;

/**
 * Este quadro é um POUSO no convés da nave (vindo de cima, descendo)?
 *
 * Está aqui, e não dentro do engine, porque a RESPOSTA precisa ser dada ANTES do empurrão que torna o casco sólido
 * por fora — e foi exatamente a ordem errada que quebrava o pulo de quem nasce na própria nave: o empurrão movia a
 * posição para fora do convés, e a pergunta "tem piso aqui?", feita depois, respondia não. A pessoa ficava em queda
 * eterna (medido: `noAr` ainda verdadeiro 9 s depois, a −17 m/s, com a câmera dentro do casco).
 *
 * `yAnt` é a altura do quadro ANTERIOR: é ela que distingue quem desce no convés de quem sobe por baixo dele.
 * A folga de 0,3 m existe porque um quadro lento pode passar do convés inteiro de uma vez.
 */
export function pousaNoConves(o: { yAnt: number; y: number; vy: number; l: P2; naveY: number }): boolean {
  return chaoNoEspaco(o.l) && o.yAnt >= o.naveY + TETO_MINI.y - 0.3 && o.y <= o.naveY + TETO_MINI.y && o.vy <= 0;
}
/** empurra pra fora do que é sólido no teto: a cúpula, o sofá redondo e as motos acopladas */
export function resolverNoTeto(l: P2, raio = 0.4): P2 {
  let p = l;
  if (noTeto(p, 0)) {
    const dx = p.x - N.roda.x, dz = p.z - N.roda.z, A = N.cupula.a + raio, Bz = N.cupula.b + raio, k = (dx / A) ** 2 + (dz / Bz) ** 2;
    if (k < 1) { const s = 1 / Math.sqrt(k || 1e-6); p = { x: N.roda.x + dx * s, z: N.roda.z + dz * s }; }
    p = empurrarDosRetangulos(p, SOLIDOS_TETO, raio);
    { const dx = p.x - SOFA_TETO.x, dz = p.z - SOFA_TETO.z, d = Math.hypot(dx, dz), R = SOFA_TETO.r + raio; if (d < R) p = d > 1e-6 ? { x: SOFA_TETO.x + (dx / d) * R, z: SOFA_TETO.z + (dz / d) * R } : { x: SOFA_TETO.x + R, z: SOFA_TETO.z }; }
  }
  return p;
}
// ── a ESCADA ROLANTE (o dono, nov/2026: "a escada não pode ser automática — tem que ser uma rolante que você sobe
//    movimentando o personagem"): do piso de dentro (a bombordo, pra popa) até a ESCOTILHA no teto de fora. Anda-se nela
//    pra subir ou descer; os degraus só AJUDAM, devagar, pra cima. Corrimãos dos lados (não se cai pelo lado) ──
export const ESCADA_ROLANTE = { x: -4.55, meia: 0.55, z0: -10.9, z1: -2.5, /** a esteira (m/s, pra cima) */ esteira: 0.6 } as const;
const ER = ESCADA_ROLANTE;
/** a altura da rampa (y local) no ponto `z` do eixo dela (0 embaixo → o teto em cima) */
export const alturaDaRolante = (z: number) => TETO_MINI.y * Math.max(0, Math.min(1, (z - ER.z0) / (ER.z1 - ER.z0)));
/** o ponto está na faixa da escada (entre os corrimãos, do pé ao topo)? */
export const naFaixaDaRolante = (l: P2, folga = 0) => Math.abs(l.x - ER.x) <= ER.meia + folga && l.z >= ER.z0 - folga && l.z <= ER.z1 + folga;
/** a ESCOTILHA no teto (o vão por onde a escada passa): de onde a rampa já está mais alta que a cabeça até o topo */
export const ESCOTILHA = { x0: ER.x - ER.meia - 0.15, x1: ER.x + ER.meia + 0.15, z0: ER.z0 + ((N.alturaCasco - 2.0) / TETO_MINI.y) * (ER.z1 - ER.z0), z1: ER.z1 } as const;
export const naEscotilha = (l: P2) => l.x >= ESCOTILHA.x0 && l.x <= ESCOTILHA.x1 && l.z >= ESCOTILHA.z0 && l.z <= ESCOTILHA.z1;
/** quem está NA escada (`naEscada`): fica entre os corrimãos e sobe/desce pela rampa; sai pelo pé (dentro) ou pelo topo
 *  (o teto). Quem NÃO está nela: lá dentro, o corpo da escada é sólido (só se entra pelo pé, onde o degrau é baixo); no
 *  teto, a escotilha é sólida (só se entra pelo topo). Devolve o ponto, a altura e se está na escada */
export function passoDaRolante(l: P2, naEscada: boolean, fora: boolean, raio = 0.4): { p: P2; y: number; naEscada: boolean } {
  if (naEscada) {
    const p = { x: Math.max(ER.x - ER.meia + 0.25, Math.min(ER.x + ER.meia - 0.25, l.x)), z: Math.max(ER.z0 - 0.6, Math.min(ER.z1 + 0.6, l.z)) };
    if (p.z < ER.z0 - 0.3) return { p, y: 0, naEscada: false };   // (desceu pelo pé)
    if (p.z > ER.z1 + 0.3) return { p, y: TETO_MINI.y, naEscada: false };   // (saiu no teto)
    return { p, y: alturaDaRolante(p.z), naEscada: true };
  }
  if (!fora) {   // lá dentro: entra pelo pé; o resto do corpo da escada empurra
    if (naFaixaDaRolante(l) && l.z < ER.z0 + 0.5) return { p: l, y: alturaDaRolante(l.z), naEscada: true };
    return { p: empurrarDosRetangulos(l, [{ x0: ER.x - ER.meia - 0.12, x1: ER.x + ER.meia + 0.12, z0: ER.z0 + 0.5, z1: ER.z1 + 0.2, alt: 9 }], raio), y: 0, naEscada: false };
  }
  // no teto: entra pelo topo da escotilha; o resto do vão empurra
  if (naFaixaDaRolante(l, 0.05) && l.z > ER.z1 - 0.5) return { p: l, y: alturaDaRolante(Math.min(l.z, ER.z1)), naEscada: true };
  return { p: empurrarDosRetangulos(l, [{ ...ESCOTILHA, z1: ESCOTILHA.z1 - 0.5, alt: 9 }], raio), y: TETO_MINI.y, naEscada: false };
}

// ── o ELEVADOR: o caminho da subida (do anel lá dentro, atravessando a cúpula, até o teto) e o da descida ──
/** o alto do caminho (acima da cúpula) */
export const ALTO_DO_ELEVADOR = TETO_MINI.y + N.cupula.alt + 0.9;
/** o ponto do caminho em `u` (0..1): sobe reto do anel até o alto e desce em arco até a chegada no teto (`sobe`), ou o
 *  contrário, do anel de descida até o anel do elevador lá dentro */
export function caminhoDoElevador(skin: SkinMini, sentido: "sobe" | "desce", u: number): { x: number; z: number; y: number } {
  const e = ELEVADOR_MINI[skin], fora = sentido === "sobe" ? CHEGADA_TETO : DESCIDA_TETO, uu = sentido === "sobe" ? u : 1 - u, ease = (v: number) => v * v * (3 - 2 * v);
  if (uu < 0.6) { const v = ease(uu / 0.6); return { x: e.x, z: e.z, y: v * ALTO_DO_ELEVADOR }; }
  const v = ease((uu - 0.6) / 0.4); return { x: e.x + (fora.x - e.x) * v, z: e.z + (fora.z - e.z) * v, y: ALTO_DO_ELEVADOR + (TETO_MINI.y - ALTO_DO_ELEVADOR) * v * v };
}
export const DURACAO_ELEVADOR = 3.2;
