/**
 * Frota de IAs — o CORPO no instante (PURO, determinístico): dado o plano do dia de uma IA e o minuto, onde ela está e o
 * que o corpo faz. Cada bloco = VIAGEM até o lugar (no começo do bloco) + a ATIVIDADE lá:
 *  - viagem DENTRO da Zaeon (central e salas): de MOCHILA A JATO (um arco por cima das coisas — sem lotar os fios dos
 *    jogadores); sem mochila (flag), a pé na central e de moto pras salas;
 *  - entre os LUGARES DE ESTUDO (salas da Zaeon e universidades): de MOTO, de vaga em vaga — cada lugar tem um
 *    ESTACIONAMENTO (lib/cyber/estacionamentosEstudo): chega de moto, a moto FICA na vaga (`vagaMoto`) e ela vai de
 *    mochila até o lugar; na saída, volta de mochila pra vaga e sai de moto (lotou: como antes);
 *  - viagem pra FORA (universidades, praça, Solana): de MOTO, voando alto. Saindo da Zaeon, a IA vai de mochila até a
 *    GARAGEM e PEGA a moto lá (`pontoDaGaragem`: cada uma na sua vaga de decolagem); voltando, POUSA na garagem e segue
 *    de mochila — ninguém mais sobe de moto de dentro de uma sala. Fora da Zaeon (de um lugar visitado pra outro) a
 *    moto se materializa/desfaz (components/cyber/FrotaIA);
 *  - parada num lugar visitado: num ponto do CHÃO da plataforma (`spotsDe`), cada IA no seu — nada de bolo de gente
 *    num ponto só; no passeio a pé, cada uma no seu canto em volta do mirante;
 *  - ESTUDO: senta no lugar (sofá, pufe — a pose relaxada —, puff, ou no chão de perna cruzada; às vezes deita no sofá)
 *    e estuda no TABLET;
 *  - MOTO (o passeio): VOANDO quase o tempo todo — uma cadeia de pontos no céu (em volta da Zaeon, circulando os campi
 *    flutuantes, entre eles), pousando às vezes num campus por 1–2 min (`roteiroMoto`); na CORRIDA, o grupo dá voltas
 *    juntos num circuito e depois para junto num lugar;
 *  - ANDAR: a TURMA vai a pé aos PONTOS DE INTERESSE da Zaeon — os telões dos mirantes (problemas → soluções) e o
 *    salão da capela — e FICA lá (3–8 min em cada), cada um no seu lugar perto dos amigos, virado pro que está vendo
 *    (`roteiroAndar`; ninguém vagando de um lado pro outro — pedido do dono, out/2026);
 *  - FESTA: dança na pista do lounge (só se estiver rolando som — senão já foi embora).
 * Fora dos blocos: offline (não aparece). Coordenadas do MUNDO; `zaeon` = está na ilha/salas (o engine soma a boia).
 */
import { ALTURA_LOUNGE, CIDADE, colisoresDaCidade, daSala, mundo } from "../ceu";
import { comprimento, pontoNaRota, rotaAPe } from "../caminhos";
import { NOS } from "../buracos";
import { PLATAFORMAS } from "../plataformas";
import { ESTACAO, MEIO_TELOES, MIRANTES, noMirante } from "../terra";
import { acasoDe, entre, inteiro, embaralhar } from "./aleatorio";
import type { FlagsFrota } from "./agenda";
import type { BlocoPlano } from "./plano";
import { spotsDe, type Spot } from "./lugares";
import type { VagaEstudo } from "../estacionamentosEstudo";

type P3 = { x: number; y: number; z: number };
export type PoseIA = "andando" | "parado" | "mochila" | "moto" | "sentado" | "deitado" | "relaxa" | "chao" | "danca";
export type EstadoIA = {
  visivel: boolean; x: number; y: number; z: number; rumo: number; zaeon: boolean;
  pose: PoseIA;
  /** peso de sentar (0..1: abaixando/levantando), o tablet (0..1: materializando) e a altura do assento */
  sentar: number; tablet: number; assentoY: number;
  /** a moto (quando está nela) */
  moto: { vel: number; curva: number } | null;
  /** a MOTO DELA parada num estacionamento agora (chegou e está no lugar, ou ainda indo buscar) — o render desenha */
  vagaMoto: VagaEstudo | null;
  /** índice do bloco e o tipo de atividade (pra conversa e debug) */
  bloco: number; atividade: BlocoPlano["atividade"] | null; ambiente: string | null; evento: string | null;
};
export const OFFLINE: EstadoIA = { visivel: false, x: 0, y: 0, z: 0, rumo: 0, zaeon: false, pose: "parado", sentar: 0, tablet: 0, assentoY: 0.7, moto: null, vagaMoto: null, bloco: -1, atividade: null, ambiente: null, evento: null };

/** as velocidades (m/s) e os tempos (s) */
export const MOV = { pe: 1.5, mochila: 13, moto: 42, decola: 3.5, pousa: 3.5, sobeMoto: 5, cruzeiroAcima: 28, senta: 0.8, tabletIn: 0.9, corridaVolta: 110, corridaMax: 8 * 60, rodaZaeonMax: 120 } as const;

const PISO = CIDADE.pisoY;
const local = (p: { x: number; z: number }) => ({ x: p.x - CIDADE.centro.x, z: p.z - CIDADE.centro.z });
const naZaeon = (p: { x: number; z: number }) => Math.hypot(p.x - CIDADE.centro.x, p.z - CIDADE.centro.z) < 520;
const s3 = (x: number) => { const c = Math.max(0, Math.min(1, x)); return c * c * (3 - 2 * c); };

/** os pontos de VISITA de moto pelo mapa (fora da Zaeon) */
type Ponto = P3 & { id: string; estudo: boolean; /** (passeio a pé) pra onde olha parado aqui e quanto fica (s) */ olha?: number; fica?: number };
const VISITAS: Ponto[] = [
  ...(["univ", "ufc", "unifor", "uece", "solana"] as const).map((id) => { const P = PLATAFORMAS[id]; return { id, x: P.chegada.x, y: P.y, z: P.chegada.z, estudo: id !== "solana" }; }),
  // (a PRAÇA saiu: virou a ARENA PvP — lib/cyber/arena; IA não pousa no meio da luta)
];
/** os PONTOS DE INTERESSE do passeio a pé na Zaeon central (local da ilha): a plateia na frente de cada telão dos
 *  mirantes (PROBLEMAS e SOLUÇÕES — fora do palco, dos cards e do globo) e o SALÃO da capela (em volta do globo).
 *  `lugar(u, v)` (u, v em 0..1) dá um ponto da área e `alvo` é pra onde se olha */
type Interesse = { id: string; lugar(u: number, v: number): { x: number; z: number }; alvo: { x: number; z: number } };
const INTERESSES: Interesse[] = [
  ...MIRANTES.flatMap((m) => ([["problemas", -MEIO_TELOES], ["solucoes", MEIO_TELOES]] as const).map(([nome, dv]): Interesse => ({
    id: `telao-${nome}-${m.id}`,
    lugar: (u, v) => noMirante(m, ESTACAO.u + 12 + u * 16, ESTACAO.v + dv + (v - 0.5) * 22),   // 12–28 m na frente, na largura do telão
    alvo: noMirante(m, ESTACAO.u, ESTACAO.v + dv),
  }))),
  { id: "salao", lugar: (u, v) => { const a = v * Math.PI * 2, r = CIDADE.mesaHolo.r + 6 + u * (CIDADE.cidadela.r - CIDADE.mesaHolo.r - 14); return { x: Math.cos(a) * r, z: Math.sin(a) * r }; }, alvo: { x: 0, z: 0 } },
];
/** pontos do CÉU pro passeio de moto (passa voando, sem pousar): o anel em volta da Zaeon, a volta de cada campus, e
 *  pontos soltos entre eles; `fora` = fora da Zaeon (o passeio começa e termina num desses) */
type PontoCeu = Ponto & { fora: boolean; pousa: boolean };
const CEU: PontoCeu[] = [
  ...Array.from({ length: 10 }, (_, k) => { const a = (k / 10) * Math.PI * 2, R = 330 + (k % 3) * 25; return { id: `ceu-zaeon-${k}`, x: CIDADE.centro.x + Math.cos(a) * R, y: PISO - 40 + (k % 3) * 25, z: CIDADE.centro.z + Math.sin(a) * R, estudo: false, fora: false, pousa: false }; }),
  ...(["univ", "ufc", "unifor", "uece", "solana"] as const).flatMap((id) => { const P = PLATAFORMAS[id]; return [0, 1, 2, 3].map((k) => { const a = (k / 4) * Math.PI * 2 + 0.5, R = P.r + 45; return { id: `ceu-${id}-${k}`, x: P.centro.x + Math.cos(a) * R, y: P.y + 22, z: P.centro.z + Math.sin(a) * R, estudo: false, fora: true, pousa: false }; }); }),
  ...([[0, 320, 120], [520, 220, 160], [-520, -180, 140], [320, -380, 210], [-620, 520, 170], [880, -120, 230], [-300, -700, 260]] as const).map(([x, z, y], k) => ({ id: `ceu-meio-${k}`, x, y, z, estudo: false, fora: true, pousa: false })),
  ...VISITAS.map((v) => ({ ...v, fora: true, pousa: true })),
];
const CHEGADA: P3 = { x: NOS.zaeon.chegada.x, y: PISO, z: NOS.zaeon.chegada.z };
/** a GARAGEM: onde as IAs pegam/largam a moto — 24 vagas de decolagem num anel em volta do miolo da sala (cada IA na
 *  dela, pelo hash), no piso das salas */
const VAGAS_GARAGEM: P3[] = Array.from({ length: 24 }, (_, k) => {
  const a = (k / 24) * Math.PI * 2, r = 14 + (k % 3) * 7, w = mundo(daSala(CIDADE.salas.garagem, Math.cos(a) * r, -12 + Math.sin(a) * r * 0.8));
  return { x: w.x, y: CIDADE.pisoY + ALTURA_LOUNGE + 0.2, z: w.z };
});
export const pontoDaGaragem = (chave: string): P3 => VAGAS_GARAGEM[Math.floor(acasoDe("garagem", chave)() * VAGAS_GARAGEM.length)]!;

const NA_CHEGADA: Ponto = { id: "chegada", ...CHEGADA, estudo: false };
/** o movimento APROXIMADO (`preciso` false — o de todo mundo, a cada 0,4 s) de cada bloco, cacheado (o preciso, só pras
 *  ~18 desenhadas em detalhe, é refeito) */
const memoMov = new Map<string, Movimento>();
function movimentoCache(agente: string, blocos: readonly BlocoPlano[], i: number, flags: FlagsFrota, preciso: boolean): Movimento {
  if (preciso) return movimento(agente, blocos, i, flags, true);
  const b = blocos[i]!, k = `${agente}|${i}|${b.ini}|${b.fim}|${flags.mochila ? 1 : 0}`; let m = memoMov.get(k);
  if (!m) { m = movimento(agente, blocos, i, flags, false); memoMov.set(k, m); if (memoMov.size > 8000) memoMov.delete(memoMov.keys().next().value!); }
  return m;
}
/** onde a IA está ao TERMINAR um bloco (a próxima viagem sai daqui) — no passeio (moto/a pé), o fim do roteiro já
 *  CORTADO pro tempo do bloco (`movimento`), então bate exatamente com onde ela está */
function fimDoBloco(agente: string, blocos: readonly BlocoPlano[], i: number, flags: FlagsFrota): Ponto {
  const b = blocos[i]!;
  if (b.spot) { const p = b.deitado && b.spot.deita ? b.spot.deita : b.spot; return { id: b.spot.id, x: p.x, y: b.spot.y, z: p.z, estudo: true }; }
  if (b.atividade !== "moto" && b.atividade !== "andar") return NA_CHEGADA;
  return movimentoCache(agente, blocos, i, flags, false).fim;
}
/** de onde a IA sai pro bloco `i` (o fim do anterior, se encosta; senão a chegada) */
function antDoBloco(agente: string, blocos: readonly BlocoPlano[], i: number, flags: FlagsFrota): Ponto {
  return i > 0 && blocos[i - 1]!.fim >= blocos[i]!.ini - 1 ? fimDoBloco(agente, blocos, i - 1, flags) : NA_CHEGADA;
}

// ── os ROTEIROS (determinísticos por agente+bloco, cacheados) ──────────────────────────────────────────────────────
type Parada = { p: Ponto; fica: number; pousa: boolean };   // (fica em s)
const cacheRoteiros = new Map<string, unknown>();
function lembrar<T>(k: string, f: () => T): T { let v = cacheRoteiros.get(k) as T | undefined; if (v === undefined) { v = f(); cacheRoteiros.set(k, v); if (cacheRoteiros.size > 6000) cacheRoteiros.delete(cacheRoteiros.keys().next().value!); } return v; }
const dist3 = (a: P3, b: P3) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
/** o PASSEIO DE MOTO: voando de ponto em ponto do céu (o próximo a 250–1400 m do atual), pousando às vezes num campus
 *  (35 % dos que dá, 40–120 s); começa e termina FORA da Zaeon; enche ~85 % do bloco (o resto é a ida/volta) */
export function roteiroMoto(b: BlocoPlano, a: string, iBloco: number): Parada[] {
  const chave = b.evento ? `moto|${b.evento}` : `moto|${a}|${iBloco}|${b.ini}`;
  return lembrar(chave, () => {
    const r = acasoDe("moto", b.evento ?? a, b.evento ? 0 : iBloco), alvo = (b.fim - b.ini) * 60 * 0.85;
    const fora = CEU.filter((q) => q.fora && !q.pousa);
    let atual: PontoCeu = fora[Math.floor(r() * fora.length)]!, tempo = 90;
    const lista: Parada[] = [{ p: atual, fica: 0, pousa: false }];
    while (tempo < alvo && lista.length < 90) {
      const cand = CEU.filter((q) => q.id !== atual.id && dist3(q, atual) > 250 && dist3(q, atual) < 1400);
      const prox = (cand.length ? cand : CEU)[Math.floor(r() * (cand.length || CEU.length))]!;
      const pousa = prox.pousa && r() < 0.35, fica = pousa ? entre(r, 40, 120) : 0;
      tempo += trechoMoto(atual, prox, lista.at(-1)!.pousa, pousa).dur + fica;
      lista.push({ p: prox, fica, pousa }); atual = prox;
    }
    if (!atual.fora) { const f = fora.reduce((m, q) => (dist3(q, atual) < dist3(m, atual) ? q : m)); lista.push({ p: f, fica: 0, pousa: false }); }
    return lista;
  });
}
/** um trecho do passeio de moto: no céu (os dois pontos no ar) RETO na velocidade; saindo/chegando no chão, sobe/desce */
function trechoMoto(de: P3, para: P3, deChao: boolean, paraChao: boolean): Viagem {
  if (deChao || paraChao) return deMoto(de, para);
  const d = dist3(de, para), rumo = Math.atan2(para.x - de.x, para.z - de.z), dur = Math.max(0.1, d / MOV.moto);
  return { modo: "moto", dur, em: (u) => ({ x: de.x + (para.x - de.x) * u, y: de.y + (para.y - de.y) * u, z: de.z + (para.z - de.z) * u, rumo, modo: "moto" }) };
}
/** um ROTEIRO tocado no tempo que sobra do bloco: os trechos (com as paradas) num ritmo ajustado pra TERMINAR
 *  exatamente no fim (`escala` = tempo do roteiro ÷ tempo disponível, limitado a 0,6–1,4) — assim a próxima atividade
 *  sai de onde a IA está de verdade (sem salto) e não sobra tempo parado */
type Trecho = { v: Viagem; fica: number; ate: Ponto; parada: () => { x: number; z: number; rumo: number } & { y: number } };
/** corta os trechos pra caber em `disponivel` (s): para no 1º que passa de 90 % dele (o `percorrer` ajusta o ritmo) */
function cortar(trechos: Trecho[], disponivel: number): Trecho[] {
  let soma = 0; for (let m = 0; m < trechos.length; m++) { soma += trechos[m]!.v.dur + trechos[m]!.fica; if (soma >= disponivel * 0.9) return trechos.slice(0, m + 1); }
  return trechos;
}
function percorrer(trechos: Trecho[], k: number, disponivel: number): { em: "trecho"; p: P3 & { rumo: number; modo?: ModoViagem }; v: Viagem } | { em: "parada"; q: P3 & { rumo: number } } {
  const total = trechos.reduce((a, t) => a + t.v.dur + t.fica, 0), escala = Math.max(0.6, Math.min(1.4, total / Math.max(1, disponivel)));
  let r = Math.min(total - 1e-6, Math.max(0, k * escala));
  for (const t of trechos) {
    if (r < t.v.dur) return { em: "trecho", p: t.v.em(t.v.dur > 0 ? r / t.v.dur : 1), v: t.v };
    r -= t.v.dur;
    if (r < t.fica) return { em: "parada", q: t.parada() };
    r -= t.fica;
  }
  const ult = trechos.at(-1)!; return { em: "trecho", p: ult.v.em(1), v: ult.v };
}
/** os trechos do passeio de moto a partir de `de` (no ar, ou no chão se `deChao`): voo entre os pontos e as pousadas
 *  (de pé ao lado de onde pousou); `todos` = começa do 1º ponto do roteiro (depois da corrida) em vez do 2º */
function trechosDoCeu(rot: Parada[], de: P3, deChao: boolean, agente: string, i: number, todos = false): Trecho[] {
  const out: Trecho[] = []; let a = de, aChao = deChao;
  for (let j = todos ? 0 : 1; j < rot.length; j++) {
    const par = rot[j]!, v = trechoMoto(a, par.p, aChao, par.pousa);
    out.push({ v, fica: par.fica, ate: par.p, parada: () => { const c = cantoEmVolta(par.p, agente, i * 100 + j); return { x: c.x, y: par.p.y, z: c.z, rumo: c.rumo }; } });
    a = par.p; aChao = par.pousa;
  }
  return out;
}
/** o PASSEIO A PÉ: a TURMA (os amigos, `b.turma`) sorteia a mesma sequência de PONTOS DE INTERESSE — os dois telões de um
 *  mirante (problemas → soluções, a ordem de leitura) e/ou o salão da capela — e cada um fica no SEU lugar perto do
 *  ponto de encontro da turma (2–5 m), virado pro telão/globo, 3–8 min em cada. Quem passeia no mesmo pedaço da tarde
 *  que um amigo acaba no mesmo lugar que ele */
export function roteiroAndar(b: BlocoPlano, a: string, iBloco: number): Ponto[] {
  return lembrar(`andar|${a}|${iBloco}|${b.ini}`, () => {
    const turma = b.turma ?? a, rt = acasoDe("interesse", turma, Math.floor(b.ini / 40));   // (a turma, nesse pedaço do dia)
    const m = Math.floor(rt() * MIRANTES.length), tel = (n: string) => INTERESSES.find((q) => q.id === `telao-${n}-${m}`)!, salao = INTERESSES.at(-1)!;
    const seq = rt() < 0.4 ? [salao, tel("problemas"), tel("solucoes")] : rt() < 0.6 ? [tel("problemas"), tel("solucoes"), salao] : [tel("problemas"), tel("solucoes")];
    const ra = acasoDe("lugar-interesse", a, iBloco);
    const solidos = colisoresDaCidade(), livre = (w: { x: number; z: number }) => solidos.every((c) => Math.hypot(w.x - c.x, w.z - c.z) > c.r + 0.5);
    return seq.map((q, k) => {
      const enc = q.lugar(rt(), rt());
      let l = enc, w = mundo(l);
      for (let t = 0; t < 12; t++) {   // o lugar de cada um em volta do encontro (2–5 m), fora de tudo que é sólido
        const ang = ra() * Math.PI * 2, d = entre(ra, 2, 5 + t * 0.5); l = { x: enc.x + Math.cos(ang) * d, z: enc.z + Math.sin(ang) * d }; w = mundo(l);
        if (livre(w)) break;
      }
      return { id: `${q.id}#${k}`, x: w.x, y: PISO, z: w.z, estudo: false, olha: Math.atan2(q.alvo.x - l.x, q.alvo.z - l.z), fica: entre(rt, 180, 480) };
    });
  });
}
/** o CIRCUITO da corrida: um anel em volta da Zaeon por fora (raio 330 m, 40 m acima do piso), com uma ondulação */
export function noCircuito(evento: string, s: number): P3 & { rumo: number } {
  const r = acasoDe("circuito", evento), R = 330 + entre(r, -20, 30), fase = r() * Math.PI * 2, L = 2 * Math.PI * R;
  const a = fase + (s / L) * Math.PI * 2, c = CIDADE.centro;
  return { x: c.x + Math.cos(a) * R, y: PISO + 40 + Math.sin(a * 3) * 6, z: c.z + Math.sin(a) * R, rumo: Math.atan2(-Math.sin(a), Math.cos(a)) };
}

// ── as VIAGENS ─────────────────────────────────────────────────────────────────────────────────────────────────────
export type ModoViagem = "mochila" | "moto" | "pe";
type Viagem = { modo: ModoViagem; dur: number; em(u: number): P3 & { rumo: number; modo?: ModoViagem }; rota?: { x: number; z: number }[];
  /** (com estacionamento, em s da viagem) até quando a moto ainda está PARADA na vaga de onde sai; desde quando já está
   *  parada na vaga de chegada */
  saida?: number; chegada?: number };
const rotasPe = new Map<string, { x: number; z: number }[]>();
/** um trecho de MOCHILA: o arco — sobe, voa reto, desce */
function deMochila(de: P3, para: P3): Viagem {
  const dist = Math.hypot(para.x - de.x, para.z - de.z), rumo = Math.atan2(para.x - de.x, para.z - de.z);
  const alto = 8 + 0.12 * dist + Math.max(0, para.y - de.y) * 0.15, dur = MOV.decola + MOV.pousa + dist / MOV.mochila;
  return { modo: "mochila", dur, em: (u) => ({ x: de.x + (para.x - de.x) * s3(u), z: de.z + (para.z - de.z) * s3(u), y: de.y + (para.y - de.y) * u + alto * Math.sin(Math.PI * u), rumo, modo: "mochila" }) };
}
/** um trecho de MOTO: sobe até o cruzeiro, vai reto, desce no destino */
function deMoto(de: P3, para: P3): Viagem {
  const dist = Math.hypot(para.x - de.x, para.z - de.z), rumo = Math.atan2(para.x - de.x, para.z - de.z);
  // subir/descer leva o tempo da ALTURA (no máximo ~20 m/s na vertical; no mínimo `sobeMoto`) — do céu da Zaeon até
  // um campus são ~300 m de descida
  const cruz = Math.max(de.y, para.y) + MOV.cruzeiroAcima, voo = dist / MOV.moto;
  const sobe = Math.max(MOV.sobeMoto, (cruz - de.y) / 20), desce = Math.max(MOV.sobeMoto, (cruz - para.y) / 20), dur = sobe + voo + desce;
  return { modo: "moto", dur, em: (u) => {
    const t = u * dur;
    if (t < sobe) { const k = s3(t / sobe); return { x: de.x, y: de.y + (cruz - de.y) * k, z: de.z, rumo, modo: "moto" }; }
    if (t < sobe + voo) { const k = (t - sobe) / voo; return { x: de.x + (para.x - de.x) * k, y: cruz, z: de.z + (para.z - de.z) * k, rumo, modo: "moto" }; }
    const k = s3((t - sobe - voo) / desce); return { x: para.x, y: cruz + (para.y - cruz) * k, z: para.z, rumo, modo: "moto" };
  } };
}
/** dois trechos seguidos (o modo de cada ponto vem no `em`) */
function emSeguida(a: Viagem, b: Viagem): Viagem {
  const dur = a.dur + b.dur;
  return { modo: a.modo, dur, em: (u) => { const t = u * dur; return t < a.dur ? a.em(a.dur > 0 ? t / a.dur : 1) : b.em(b.dur > 0 ? (t - a.dur) / b.dur : 1); } };
}
/** a viagem de A até B: mochila (dentro da Zaeon), moto (fora dela — saindo/chegando PELA GARAGEM) ou a pé (sem
 *  mochila, na central) */
export function viagem(de: P3, para: P3, flags: FlagsFrota, chave: string, preciso = true): Viagem {
  const dist = Math.hypot(para.x - de.x, para.z - de.z), dentroDe = naZaeon(de), dentroPara = naZaeon(para), dentro = dentroDe && dentroPara;
  if (dist < 0.5 && Math.abs(para.y - de.y) < 0.5) return { modo: "pe", dur: 0, em: () => ({ ...para, rumo: 0 }) };
  if (dentro && flags.mochila) return deMochila(de, para);
  if (dentro && Math.abs(para.y - de.y) < 1 && Math.abs(de.y - PISO) < 1) {   // a pé, na central (A* — só pra quem está à vista)
    let r = rotasPe.get(chave);
    if (!r && !preciso) r = [de, para];   // (de longe basta a reta — o A* só pra quem está à vista)
    if (!r) { const lr = rotaAPe(local(de), local(para)); r = (lr ?? [local(de), local(para)]).map((q) => mundo(q)); rotasPe.set(chave, r); if (rotasPe.size > 2000) rotasPe.delete(rotasPe.keys().next().value!); }
    // o TEMPO é o da reta × 1,35 (igual de perto e de longe — o A* só desenha o caminho), senão as duas contas
    // desencontravam e a IA "pulava" na troca de detalhe
    const L = comprimento(r), dur = (Math.hypot(para.x - de.x, para.z - de.z) * 1.35) / MOV.pe;
    return { modo: "pe", dur, rota: r, em: (u) => { const q = pontoNaRota(r!, L * u); return { x: q.x, y: de.y, z: q.z, rumo: q.rumo, modo: "pe" }; } };
  }
  if (dentro) return deMochila(de, para);   // (sem mochila mas mudando de andar: ainda assim pelo ar — nada de moto saindo de sala)
  // cruzando a borda da Zaeon: a moto é pega/largada na GARAGEM
  const g = pontoDaGaragem(chave);
  if (dentroDe) return emSeguida(deMochila(de, g), deMoto(g, para));
  if (dentroPara) return emSeguida(deMoto(de, g), deMochila(g, para));
  return deMoto(de, para);
}

/** a viagem com ESTACIONAMENTO: sai da vaga do lugar anterior (vai de mochila até ela) e/ou chega na vaga do destino
 *  (de lá, de mochila até o lugar). Sem moto parada dos dois lados: a viagem de sempre. Sem vaga de um lado: na Zaeon
 *  central a moto é pega/largada na GARAGEM; fora, ela se materializa/desfaz (components/cyber/FrotaIA) */
export function viagemComVaga(de: P3, vagaDe: VagaEstudo | null, para: P3, vagaPara: VagaEstudo | null, flags: FlagsFrota, chave: string, preciso = true): Viagem {
  if (!vagaDe && !vagaPara) return viagem(de, para, flags, chave, preciso);
  if (vagaDe && vagaPara && vagaDe.ambiente === vagaPara.ambiente) return viagem(de, para, flags, chave, preciso);   // (o mesmo lugar)
  const pernas: Viagem[] = [];
  let m0: P3, saida: number | undefined;
  if (vagaDe) { const a = deMochila(de, vagaDe); pernas.push(a); m0 = vagaDe; saida = a.dur; }
  else if (naZaeon(de)) { const g = pontoDaGaragem(chave); pernas.push(deMochila(de, g)); m0 = g; }
  else m0 = de;
  let m1: P3, cauda: Viagem | null = null;
  if (vagaPara) { m1 = vagaPara; cauda = deMochila(vagaPara, para); }
  else if (naZaeon(para)) { const g = pontoDaGaragem(chave); m1 = g; cauda = deMochila(g, para); }
  else m1 = para;
  pernas.push(deMoto(m0, m1)); if (cauda) pernas.push(cauda);
  const v = pernas.reduce(emSeguida);
  return { ...v, saida, chegada: vagaPara && cauda ? v.dur - cauda.dur : undefined };
}
/** a vaga onde a moto ficou no bloco ANTERIOR (se ele encosta neste) */
const vagaAnterior = (blocos: readonly BlocoPlano[], i: number) => (i > 0 && blocos[i - 1]!.fim >= blocos[i]!.ini - 1 ? blocos[i - 1]!.vaga ?? null : null);
/** qual moto parada é dela no instante `u` (s) de uma viagem `v` com estacionamento */
const motoParadaNa = (v: Viagem, u: number, vagaDe: VagaEstudo | null, vagaPara: VagaEstudo | null): VagaEstudo | null =>
  vagaDe && v.saida !== undefined && u < v.saida ? vagaDe : vagaPara && v.chegada !== undefined && u >= v.chegada ? vagaPara : null;

/** o ESTADO de uma IA no minuto `min` (do dia). `musica` = está rolando som no lounge agora */
export function estadoDaIA(agente: string, blocos: readonly BlocoPlano[], min: number, flags: FlagsFrota, musica: boolean, preciso = true): EstadoIA {
  const i = blocos.findIndex((b) => min >= b.ini && min < b.fim);
  if (i < 0) return OFFLINE;
  const b = blocos[i]!, t = (min - b.ini) * 60, durBloco = (b.fim - b.ini) * 60;
  if (b.atividade === "festa" && !musica) return OFFLINE;   // a festa só acontece com som
  const ant = antDoBloco(agente, blocos, i, flags), vAnt = vagaAnterior(blocos, i), vAqui = b.vaga ?? null;
  const base = { visivel: true, bloco: i, atividade: b.atividade, ambiente: b.ambiente ?? null, evento: b.evento ?? null, sentar: 0, tablet: 0, assentoY: 0.7, moto: null, vagaMoto: null };
  const comViagem = (destino: P3, ini: number): { fim: number; estado?: EstadoIA } => {
    const v = viagemComVaga(ant, vAnt, destino, vAqui, flags, `${agente}|${i}|${destino.x.toFixed(1)}`, preciso), d = Math.min(v.dur, durBloco * 0.6);
    if (t - ini >= d) return { fim: ini + d };
    const u = d > 0 ? (t - ini) / d : 1, p = v.em(u), modo = p.modo ?? v.modo;
    return { fim: ini + d, estado: { ...base, x: p.x, y: p.y, z: p.z, rumo: p.rumo, zaeon: naZaeon(p), pose: poseDoModo(modo), moto: modo === "moto" ? { vel: MOV.moto, curva: 0 } : null, vagaMoto: motoParadaNa(v, u * v.dur, vAnt, vAqui) } };
  };
  // ESTUDO e FESTA: viaja, senta (ou dança) e fica
  if (b.spot) {
    const s: Spot = b.spot, alvo = b.deitado && s.deita ? s.deita : s, destino = { x: alvo.x, y: s.y, z: alvo.z };
    const v = comViagem(destino, 0); if (v.estado) return v.estado;
    const kf = t - v.fim, fimSentar = durBloco - kf;   // (levanta no fim, junto com a próxima viagem)
    const sentar = Math.min(s3(kf / MOV.senta), s3(fimSentar / MOV.senta));
    if (b.atividade === "festa") return { ...base, x: s.x, y: s.y, z: s.z, rumo: s.rumo, zaeon: s.zaeon, pose: "danca", vagaMoto: vAqui };
    const pose: PoseIA = b.deitado ? "deitado" : s.tipo === "pufe" ? "relaxa" : s.tipo === "piso" ? "chao" : "sentado";
    return { ...base, vagaMoto: vAqui, x: alvo.x, y: s.y, z: alvo.z, rumo: alvo.rumo, zaeon: s.zaeon, pose, sentar, tablet: s3((kf - MOV.senta) / MOV.tabletIn) * s3(fimSentar / MOV.tabletIn), assentoY: s.tipo === "sofa" ? 0.78 : s.tipo === "pufe" ? 0.74 : s.tipo === "puff" ? 0.7 : 0 };
  }
  // CORRIDA / MOTO / ANDAR: a ida + (a corrida) + o roteiro já cortado pro tempo do bloco (`movimento`)
  if (b.atividade === "moto" || b.atividade === "andar") {
    const mv = movimentoCache(agente, blocos, i, flags, preciso);
    const estadoDe = (p: P3 & { rumo: number; modo?: ModoViagem }, modo: ModoViagem): EstadoIA => ({ ...base, x: p.x, y: p.y, z: p.z, rumo: p.rumo, zaeon: naZaeon(p), pose: poseDoModo(modo), moto: modo === "moto" ? { vel: MOV.moto, curva: 0.15 } : null });
    if (t < mv.idaDur) { const u = t / mv.idaDur, p = mv.ida.em(u); return { ...estadoDe(p, p.modo ?? mv.ida.modo), vagaMoto: motoParadaNa(mv.ida, u * mv.ida.dur, vAnt, null) }; }
    let k = t - mv.idaDur;
    if (mv.corrida) {   // dá voltas com a turma (cada um no seu ritmo e na sua faixa)
      const c = mv.corrida;
      if (k < c.dur) { const sAt = (k / MOV.corridaVolta) * 2 * Math.PI * 330 * c.ritmo, p = noCircuito(b.evento!, sAt); return { ...base, x: p.x + Math.cos(p.rumo) * c.faixa, y: p.y, z: p.z - Math.sin(p.rumo) * c.faixa, rumo: p.rumo, zaeon: true, pose: "moto", moto: { vel: MOV.moto * c.ritmo, curva: 0.3 } }; }
      k -= c.dur;
    }
    if (!mv.trechos.length) { const f = mv.fim; return b.atividade === "moto" ? { ...base, x: f.x, y: f.y, z: f.z, rumo: 0, zaeon: naZaeon(f), pose: "moto", moto: { vel: 0, curva: 0 } } : { ...base, x: f.x, y: f.y, z: f.z, rumo: 0, zaeon: true, pose: "parado" }; }
    const r = percorrer(mv.trechos, k, mv.disponivel);
    if (r.em === "parada") return { ...base, x: r.q.x, y: r.q.y, z: r.q.z, rumo: r.q.rumo, zaeon: naZaeon(r.q), pose: "parado" };   // (moto: de pé ao lado de onde pousou)
    const e = estadoDe(r.p, r.p.modo ?? r.v.modo);
    if (mv.corrida) { e.x += Math.cos(r.p.rumo) * mv.corrida.faixa * 2.5; e.z -= Math.sin(r.p.rumo) * mv.corrida.faixa * 2.5; }   // depois da corrida: em BANDO, cada um na sua faixa
    return e;
  }
  // (um bloco sem lugar — o plano não achou assento): não aparece, em vez de ficar parado na chegada com outros
  return OFFLINE;
}
const poseDoModo = (m: ModoViagem): PoseIA => (m === "moto" ? "moto" : m === "mochila" ? "mochila" : "andando");
/** o MOVIMENTO de um bloco de moto/andar: a IDA (até o 1º ponto do roteiro — da Zaeon, pela garagem; comprimida em
 *  até 60 % do bloco), a CORRIDA (se for), e os trechos do roteiro CORTADOS pra caber no resto (`disponivel`) — o fim
 *  do último trecho é o fim do bloco */
type Movimento = { ida: Viagem; idaDur: number; corrida: { dur: number; ritmo: number; faixa: number } | null; trechos: Trecho[]; disponivel: number; fim: Ponto };
function movimento(agente: string, blocos: readonly BlocoPlano[], i: number, flags: FlagsFrota, preciso: boolean): Movimento {
  const b = blocos[i]!, durBloco = (b.fim - b.ini) * 60, ant = antDoBloco(agente, blocos, i, flags);
  if (b.atividade === "moto") {
    const rot = roteiroMoto(b, agente, i);
    if (b.evento?.startsWith("corrida")) {
      const r = acasoDe("piloto", agente, b.evento), ritmo = entre(r, 0.94, 1.06), faixa = entre(r, -4, 4);
      const ida = viagemComVaga(ant, vagaAnterior(blocos, i), noCircuito(b.evento, 0), null, flags, `${agente}|${i}|corrida`, preciso), idaDur = Math.min(ida.dur, durBloco * 0.6);
      const dur = Math.min(MOV.corridaMax, (durBloco - idaDur) * 0.5), fimC = noCircuito(b.evento, (dur / MOV.corridaVolta) * 2 * Math.PI * 330 * ritmo);
      const disponivel = durBloco - idaDur - dur, trechos = cortar(trechosDoCeu(rot, fimC, false, agente, i, true), disponivel);
      return { ida, idaDur, corrida: { dur, ritmo, faixa }, trechos, disponivel, fim: trechos.at(-1)?.ate ?? { id: "corrida", ...fimC, estudo: false } };
    }
    const ida = viagemComVaga(ant, vagaAnterior(blocos, i), rot[0]!.p, null, { ...flags, mochila: false }, `${agente}|${i}|m0`, preciso), idaDur = Math.min(ida.dur, durBloco * 0.6);
    const disponivel = durBloco - idaDur, trechos = cortar(trechosDoCeu(rot, rot[0]!.p, false, agente, i), disponivel);
    return { ida, idaDur, corrida: null, trechos, disponivel, fim: trechos.at(-1)?.ate ?? rot[0]!.p };
  }
  const rot = roteiroAndar(b, agente, i);
  const ida = viagemComVaga(ant, vagaAnterior(blocos, i), rot[0]!, null, flags, `${agente}|${i}|a0`, preciso), idaDur = Math.min(ida.dur, durBloco * 0.6);
  const todos: Trecho[] = [];
  for (let j = 1; j < rot.length; j++) {
    const de = rot[j - 1]!, p = rot[j]!, reta = Math.hypot(p.x - de.x, p.z - de.z), dur = (reta * 1.35) / MOV.pe, chave = `${agente}|${i}|a${j}`;
    const v: Viagem = { modo: "pe", dur, em: (u) => {
      let rota = rotasPe.get(chave);
      if (!rota && preciso) { const lr = rotaAPe(local(de), local(p)); rota = (lr ?? [local(de), local(p)]).map((q) => mundo(q)); rotasPe.set(chave, rota); if (rotasPe.size > 2000) rotasPe.delete(rotasPe.keys().next().value!); }
      rota ??= [de, p];
      const L = comprimento(rota), q = pontoNaRota(rota, L * u); return { x: q.x, y: PISO, z: q.z, rumo: q.rumo, modo: "pe" };
    } };
    // a parada: no ponto, virada pro que está vendo (o telão, o globo) — o próximo trecho sai dali
    todos.push({ v, fica: p.fica ?? 30, ate: p, parada: () => ({ x: p.x, y: p.y, z: p.z, rumo: p.olha ?? 0 }) });
  }
  // a CHEGADA conta como a 1ª parada (fica no 1º ponto antes de ir pro 2º): um trecho parado no lugar
  const p0 = rot[0]!, chegada: Trecho = { v: { modo: "pe", dur: 0, em: () => ({ x: p0.x, y: p0.y, z: p0.z, rumo: p0.olha ?? 0, modo: "pe" }) }, fica: p0.fica ?? 30, ate: p0, parada: () => ({ x: p0.x, y: p0.y, z: p0.z, rumo: p0.olha ?? 0 }) };
  const disponivel = durBloco - idaDur, trechos = cortar([chegada, ...todos], disponivel);
  return { ida, idaDur, corrida: null, trechos, disponivel, fim: trechos.at(-1)?.ate ?? p0 };
}
/** um canto em volta de um ponto do passeio (2–9 m, cada IA no seu, virada pro ponto) — ninguém empilhado */
function cantoEmVolta(p: P3, agente: string, chave: number): { x: number; z: number; rumo: number } {
  const r = acasoDe("canto", agente, chave), a = r() * Math.PI * 2, d = entre(r, 2, 9);
  return { x: p.x + Math.cos(a) * d, z: p.z + Math.sin(a) * d, rumo: Math.atan2(-Math.cos(a), -Math.sin(a)) };
}
/** parado num lugar visitado: num ponto do CHÃO da plataforma (`spotsDe` — no disco, fora de prédios e mesas), cada IA no
 *  dela pelo hash (são ~160 por plataforma: o bolo de gente num ponto só acabou); na praça, num canto de até 16 m */
function paradoPerto(base: Omit<EstadoIA, "x" | "y" | "z" | "rumo" | "zaeon" | "pose">, p: P3, agente: string, chave: number, _k: number): EstadoIA {
  const id = (p as Partial<Ponto>).id, r = acasoDe("perto", agente, chave);
  const chao = id && id in PLATAFORMAS && id !== "solana" ? spotsDe(id as Parameters<typeof spotsDe>[0]) : null;
  // (AO LADO do ponto, não em cima: os pontos de chão também são de quem está ESTUDANDO ali)
  if (chao?.length) { const s = chao[Math.floor(r() * chao.length)]!, a = r() * Math.PI * 2, d = entre(r, 1, 1.6); return { ...base, x: s.x + Math.cos(a) * d, y: s.y, z: s.z + Math.sin(a) * d, rumo: s.rumo, zaeon: false, pose: "parado" }; }
  const a = r() * Math.PI * 2, d = entre(r, 3, 16);
  return { ...base, x: p.x + Math.cos(a) * d, y: p.y, z: p.z + Math.sin(a) * d, rumo: a + Math.PI, zaeon: naZaeon(p), pose: "parado" };
}
