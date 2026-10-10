/**
 * Cyberespaço — MOTOS VOADORAS (PURO). ESTACIONAMENTOS: um na ilha da praça (1 fila de 4) e os 2 da GARAGEM — a ala
 * dos veículos, a plataforma própria ligada à Zaeon por um fio de energia (2 filas de 7 cada = 28) —, 32 vagas, com as
 * vagas bem espaçadas. Na plataforma central da Zaeon NÃO há mais motos. As motos são pra QUALQUER pessoa (a nave é do dono).
 *
 * O modelo:
 *  - VAGA: sempre tem uma moto PRONTA (a do estacionamento). Quem monta nela LEVA a moto: a vaga fica vazia e o ROBÔ
 *    do estacionamento (a "fábrica") voa até ela e FABRICA uma nova (fila de vagas vazias, uma de cada vez);
 *  - a moto de quem LEVOU é dele: pilotando (`moto` na presença) ou ESTACIONADA onde desceu (`motoLargada`) — fica lá
 *    até ele estacionar outra ou sair da sala;
 *  - qualquer um monta numa moto estacionada de outra pessoa: aí a presença diz `de` (de quem ela era) e o dono solta
 *    a posse ao ver — quem vê os dois não desenha a moto em dobro;
 *  - `s` (a vaga de origem) só serve pro LOOK (cor e carenagem) e pra saber qual vaga esvaziou.
 * Sem estado no servidor: cada cliente deduz quais vagas esvaziaram pelas presenças e roda o robô dele.
 */
import { ALTURA_LOUNGE, CIDADE, daSala, mundo, rotDaSala } from "./ceu";
import { VOO } from "./voo";

/** um estacionamento: centro, rumo (a frente das vagas aponta pro centro — a praça no chão, o centro da ilha na
 *  Zaeon), `filas` × `porFila` vagas, `espacamento` entre vagas de uma fila e `entreFilas` entre as filas (m) */
/** `alt` = quanto o piso do lote fica acima do piso da Zaeon (a garagem fica na altura das salas) */
export type Lote = { id: "chao" | "garagem" | "estudo"; x: number; z: number; rot: number; ceu: boolean; alt: number; filas: number; porFila: number; espacamento: number; entreFilas: number };
const lote = (id: Lote["id"], x: number, z: number, cx: number, cz: number, ceu: boolean, filas: number, porFila: number): Lote =>
  ({ id, x, z, rot: Math.atan2(cx - x, cz - z), ceu, alt: 0, filas, porFila, espacamento: 4.6, entreFilas: 8 });
/** os 2 lotes da GARAGEM no referencial da SALA (+z = a porta, rumo à Zaeon): um atrás do outro, virados pra porta */
export const LOTES_GARAGEM_SALA = [{ x: 0, z: -24 }, { x: 0, z: 0 }] as const;
const garagem = (q: { x: number; z: number }): Lote => {
  const s = CIDADE.salas.garagem, w = mundo(daSala(s, q.x, q.z));
  return { id: "garagem", x: w.x, z: w.z, rot: rotDaSala(s), ceu: true, alt: ALTURA_LOUNGE + 0.16, filas: 2, porFila: 7, espacamento: 4.6, entreFilas: 8 };
};
export const LOTES: Lote[] = [
  lote("chao", -34, 16, 0, 0, false, 1, 4),   // na ilha da PRAÇA (lib/cyber/praca): cabe dentro da borda
  ...LOTES_GARAGEM_SALA.map(garagem),         // a GARAGEM da Zaeon (todas as motos de lá)
];
/** largura (ao longo das filas) e profundidade (m) do piso de um lote, e o raio que ele ocupa */
export const tamanhoDoLote = (l: Lote) => { const larg = l.porFila * l.espacamento + 3, prof = (l.filas - 1) * l.entreFilas + 7.2; return { larg, prof, r: Math.hypot(larg, prof) / 2 }; };
export const TOTAL_VAGAS = LOTES.reduce((n, l) => n + l.filas * l.porFila, 0);

/** a moto é modelada em ~1:1 e escalada no render pra proporção do avatar (~2 m) */
export const ESCALA_MOTO = 1.25;

export const MOTO = {
  /** teto ABSOLUTO aceito na presença (a regra de verdade é o teto acima do chão de baixo — lib/cyber/motoFisica) */
  teto: VOO.yMax,
  /** altura do QUADRIL do piloto sentado, JÁ na escala do render (o topo do banco fica em ~1,05 × ESCALA_MOTO) */
  banco: 1.14 * 1.25,
  /** quão perto pra montar (m, no plano) */
  alcance: 3.2,
} as const;

/** a PLATAFORMA de lançamento de cada vaga: a moto parada fica em cima dela (m acima do piso do lote); ao montar, a moto
 *  já sai PAIRANDO em `ALTURA_LANCAMENTO` (acima do "rente ao chão" do voo, que trava andar de lado) — sai andando na hora */
export const PLATAFORMA_MOTO = { altura: 1.1, r: 1.7 } as const;
export const ALTURA_LANCAMENTO = 2;
/** o LOOK de cada vaga — cor e carenagem — embaralhado (não repete em sequência; 16 cores bem diferentes), o mesmo pra
 *  todo mundo (é da vaga: a moto que você leva continua com a cara dela) */
const PALETA_MOTO = ["#45d6ff", "#ff6ad5", "#ffc46b", "#9affd0", "#ff5a5a", "#a98bff", "#5aff8a", "#ff9a3c", "#3c8bff", "#f2ff5a", "#ff3c9e", "#5afff2", "#c46bff", "#ffd1a3", "#7dd3ff", "#b6ff3c"];
/** a carenagem (0 Raio, 1 Tubarão, 2 Gota) de uma vaga / de quem pilota: os três por igual */
export const estiloDaVaga = (s: number) => ((Math.floor(s) % 3) + 3) % 3;
/** a carenagem de uma pessoa/IA pelo id (estável; os três tipos por igual na frota) */
export function estiloDoId(id: string): number { let x = 2166136261; for (let i = 0; i < id.length; i++) x = Math.imul(x ^ id.charCodeAt(i), 16777619) >>> 0; return x % 3; }
export function lookDaVaga(s: number): { cor: string; estilo: number } {
  const h = (n: number) => { let x = (n + 1) * 2654435761; x = (x ^ (x >>> 13)) >>> 0; return x; };
  // a cor: uma permutação fixa das 16 (sem duas vizinhas iguais); a carenagem: os 3 tipos se ALTERNAM (Raio, Tubarão,
  // Gota) — cada estacionamento fica com os três por igual (o dono, out/2026)
  const ordem = [5, 12, 0, 9, 3, 14, 7, 1, 10, 4, 15, 8, 2, 13, 6, 11];
  void h;
  return { cor: PALETA_MOTO[ordem[s % ordem.length]!]!, estilo: estiloDaVaga(s) };
}

export type Vaga = { x: number; z: number; yaw: number; ceu: boolean; alt: number; lote: number };
/** posição (mundo) e rumo de cada vaga — filas lado a lado, viradas pro centro; a fila 0 é a da FRENTE, as outras atrás
 *  dela. Índice = lote a lote, fila a fila. Constante: calculada uma vez e congelada. */
let vagasCache: readonly Readonly<Vaga>[] | null = null;
export function vagas(): readonly Readonly<Vaga>[] {
  return (vagasCache ??= Object.freeze(calcularVagas().map((v) => Object.freeze(v))));
}
/** uma posição no referencial do lote (x ao longo da fila, z = pra frente) → mundo */
export function noLote(l: Lote, lx: number, lz: number): { x: number; z: number } {
  const c = Math.cos(l.rot), s = Math.sin(l.rot);
  return { x: l.x + lx * c + lz * s, z: l.z - lx * s + lz * c };
}
/** a posição da vaga `i` (de uma fila de `porFila`, na fila `f`) no referencial do lote */
export const vagaNoLote = (l: Lote, f: number, i: number) => ({ x: (i - (l.porFila - 1) / 2) * l.espacamento, z: ((l.filas - 1) / 2 - f) * l.entreFilas });
function calcularVagas(): Vaga[] {
  return LOTES.flatMap((l, k) => Array.from({ length: l.filas * l.porFila }, (_, j) => {
    const p = vagaNoLote(l, Math.floor(j / l.porFila), j % l.porFila), w = noLote(l, p.x, p.z);
    return { x: w.x, z: w.z, yaw: l.rot, ceu: l.ceu, alt: l.alt, lote: k };
  }));
}

/** a moto montada, na presença: vaga de ORIGEM (o look), altura, rumo e `de` = de quem era a moto estacionada que a
 *  pessoa pegou (ausente = tirou de uma vaga, ou é a dela mesma); lixo → nada */
export type MotoMontada = { s: number; y: number; yaw: number; de?: string };
const ID_RE = /^[a-f0-9]{24}$/i;
export function motoDe(v: unknown): { moto?: MotoMontada } {
  if (!v || typeof v !== "object") return {};
  const o = v as Record<string, unknown>;
  const s = typeof o.s === "number" && Number.isInteger(o.s) && o.s >= 0 && o.s < TOTAL_VAGAS ? o.s : null;
  const y = typeof o.y === "number" && Number.isFinite(o.y) ? Math.min(MOTO.teto, Math.max(0, o.y)) : null;
  const yaw = typeof o.yaw === "number" && Number.isFinite(o.yaw) ? Math.min(10, Math.max(-10, o.yaw)) : null;
  if (s === null || y === null || yaw === null) return {};
  return { moto: { s, y, yaw, ...(typeof o.de === "string" && ID_RE.test(o.de) ? { de: o.de } : {}) } };
}

/** ESTACIONADA: a moto fica ONDE a pessoa desceu. Quem estacionou anuncia na presença dele (`motoLargada`) — como a
 *  nave do dono (`naveParada`). Estacionou outra, ou saiu da sala → essa some (a vaga dela o robô já repôs). */
export type MotoLargada = { s: number; x: number; y: number; z: number; yaw: number };
const LIMITE_MAPA = VOO.raioMapa + 40;
/** a moto largada na presença: vaga inteira válida, posição dentro do mapa, altura com teto; lixo → nada */
export function motoLargadaDe(v: unknown): { motoLargada?: MotoLargada } {
  if (!v || typeof v !== "object") return {};
  const o = v as Record<string, unknown>, n = (k: string, a: number, b: number) => (typeof o[k] === "number" && Number.isFinite(o[k]) ? Math.min(b, Math.max(a, o[k] as number)) : null);
  const s = typeof o.s === "number" && Number.isInteger(o.s) && o.s >= 0 && o.s < TOTAL_VAGAS ? o.s : null;
  const x = n("x", -LIMITE_MAPA, LIMITE_MAPA), y = n("y", 0, MOTO.teto), z = n("z", -LIMITE_MAPA, LIMITE_MAPA), yaw = n("yaw", -10, 10);
  return s === null || x === null || y === null || z === null || yaw === null ? {} : { motoLargada: { s, x, y, z, yaw } };
}

/** alguém (`id`) no mundo: pilotando (`moto`) e/ou com uma estacionada (`motoLargada`) */
export type DonoDeMoto = { id: string; moto?: MotoMontada | null; motoLargada?: MotoLargada | null };
/** as motos ESTACIONADAS que valem: as de quem ninguém pegou (uma presença montada com `de` = o dono esconde a dele) */
export function largadasValidas(donos: Iterable<DonoDeMoto>): { dono: string; m: MotoLargada }[] {
  const lista = [...donos], pegas = new Set(lista.flatMap((d) => (d.moto?.de ? [d.moto.de] : [])));
  return lista.flatMap((d) => (d.motoLargada && !pegas.has(d.id) ? [{ dono: d.id, m: d.motoLargada }] : []));
}

/** o que dá pra MONTAR perto de `p` (no alcance e no MESMO nível — pés em `alt` ± 2,5 m): uma VAGA pronta ou uma moto
 *  ESTACIONADA (a mais perto ganha). `prontas` = as vagas com moto agora (as que o robô ainda fabrica, não). */
export type AlvoMoto = { tipo: "vaga"; s: number } | { tipo: "largada"; dono: string; s: number };
export function motoParaMontar(p: { x: number; z: number }, alt: number, prontas: (i: number) => boolean, yVaga: (v: Vaga) => number, largadas: readonly { dono: string; m: MotoLargada }[]): AlvoMoto | null {
  let melhor: AlvoMoto | null = null, md: number = MOTO.alcance;
  vagas().forEach((v, i) => { if (!prontas(i) || Math.abs(yVaga(v) - alt) > 2.5) return; const d = Math.hypot(p.x - v.x, p.z - v.z); if (d < md) { md = d; melhor = { tipo: "vaga", s: i }; } });
  for (const { dono, m } of largadas) { if (Math.abs(m.y - alt) > 2.5) continue; const d = Math.hypot(p.x - m.x, p.z - m.z); if (d < md) { md = d; melhor = { tipo: "largada", dono, s: m.s }; } }
  return melhor;
}

/**
 * A FÁBRICA de cada estacionamento: um robô que repõe as motos. Vaga esvaziou (alguém levou a moto) → entra na FILA,
 * mas o robô NÃO sai na hora: espera a vaga ficar LIVRE (quem levou a moto já foi embora com ela) por `espera` s
 * seguidos. Aí voa até ela (`ida` termina quando ele CHEGA — quem move é `moverRobo`), fabrica por `fabrica` s (a moto
 * vai se formando, com luz) e segue pra próxima ou volta pra base.
 */
export const FABRICA = { espera: 3, fabrica: 5, vel: 6, altura: 3.4 } as const;
export type Fabrica = { fila: { s: number; livre: number }[]; tarefa: { s: number; fase: "ida" | "fabrica"; t: number } | null };
export const fabricaNova = (): Fabrica => ({ fila: [], tarefa: null });
/** a vaga `s` esvaziou: entra na fila (uma vez), com o relógio de "livre" zerado */
export function esvaziou(f: Fabrica, s: number) { if (f.tarefa?.s !== s && !f.fila.some((x) => x.s === s)) f.fila.push({ s, livre: 0 }); }
/** um passo da fábrica. `livre(s)` = ninguém em cima da vaga agora; `chegou` = o robô está em cima da vaga da tarefa.
 *  Devolve a vaga que ficou PRONTA (ou null) */
export function passoFabrica(f: Fabrica, dt: number, chegou: boolean, livre: (s: number) => boolean = () => true): number | null {
  for (const x of f.fila) x.livre = livre(x.s) ? x.livre + dt : 0;   // o relógio só corre com a vaga livre
  if (!f.tarefa) {
    const i = f.fila.findIndex((x) => x.livre >= FABRICA.espera); if (i < 0) return null;
    f.tarefa = { s: f.fila.splice(i, 1)[0]!.s, fase: "ida", t: 0 };
  }
  const tr = f.tarefa; tr.t += dt;
  if (tr.fase === "ida") { if (chegou && livre(tr.s)) { tr.fase = "fabrica"; tr.t = 0; } return null; }
  if (tr.t >= FABRICA.fabrica) { f.tarefa = null; return tr.s; }
  return null;
}
/** quanto da moto da vaga `s` já está formada (0..1): pronta = 1; na fila / o robô indo = 0; fabricando = o progresso */
export function progressoDaVaga(f: Fabrica, s: number): number {
  if (f.tarefa?.s === s) return f.tarefa.fase === "fabrica" ? Math.min(1, f.tarefa.t / FABRICA.fabrica) : 0;
  return f.fila.some((x) => x.s === s) ? 0 : 1;
}
/** move o robô na direção do alvo (velocidade `FABRICA.vel`, freando perto) */
export function moverRobo(p: { x: number; y: number; z: number }, alvo: { x: number; y: number; z: number }, dt: number): { x: number; y: number; z: number } {
  const dx = alvo.x - p.x, dy = alvo.y - p.y, dz = alvo.z - p.z, d = Math.hypot(dx, dy, dz);
  if (d < 1e-3) return { ...alvo };
  const passo = Math.min(d, Math.max(0.6, Math.min(FABRICA.vel, d * 3)) * dt);
  return { x: p.x + (dx / d) * passo, y: p.y + (dy / d) * passo, z: p.z + (dz / d) * passo };
}
/** a base do robô de um lote (no referencial do mundo, sem a altura): ao lado da fila da frente */
export function baseDoRobo(l: Lote): { x: number; z: number } { const t = tamanhoDoLote(l); return noLote(l, t.larg / 2 + 2.5, ((l.filas - 1) / 2) * l.entreFilas); }
