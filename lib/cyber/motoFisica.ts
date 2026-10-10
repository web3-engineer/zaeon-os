/**
 * Cyberespaço — PILOTAGEM da moto voadora (PURO). Não é mais o voo da nave (direção relativa à câmera): é moto.
 *  - W/S = acelera / freia (e dá ré devagar); solto, ela PLANA perdendo velocidade aos poucos (é hover, não pneu);
 *    no acelerador ela PROGRIDE até 560 km/h (sem teto nos 300: passa dos 500 e encosta nos 560), com CURVA DE POTÊNCIA
 *    (quase cheia embaixo, caindo perto da máxima: 1 − 0,9·u^2,2, com um piso) — o motor passa as marchas
 *    (lib/cyber/somMoto `passoCambio`);
 *  - A/D = esterça. A curva é SUTIL e depende da velocidade: devagar ela gira no próprio eixo, rápido ela abre a curva
 *    (o giro máximo cai com a velocidade — como o "MaxSteeringAngle = k / velocidade" dos arcades);
 *  - INCLINA na curva com o ângulo de moto de verdade: tan θ = v·ω / g (v = velocidade, ω = giro em rad/s);
 *  - ADERÊNCIA: a velocidade de lado some aos poucos (a traseira escorrega um pouco na curva; no boost, mais);
 *  - BOOST: tanque que esvazia em `boost.dura` s e recarga sozinho; só pega com a moto andando e no ar. É SUPERSÔNICO:
 *    acima de `BOOST_SUPER` (300 km/h), ACENDER o boost já ROMPE A BARREIRA DO SOM (o estrondo, o cone de vapor e a onda
 *    de choque: lib/cyber/somMoto, components/cyber/Moto, VelocidadeTela) e a velocidade pode DOBRAR — até 1000 km/h;
 *  - ALTURA: moto não é nave — sobe no máximo `alturaMax` m acima do CHÃO QUE ESTÁ EMBAIXO (o do mapa, o piso da Zaeon,
 *    o do lounge…), sobe devagar e DESCE mais devagar ainda; passou da borda de algo alto (o chão sumiu lá embaixo),
 *    não sobe mais e desce PLANANDO até voltar pra baixo do teto;
 *  - NA ZAEON (o PODER da moto): no céu da cidadela — até a borda das plataformas das salas — o teto sobe até o INÍCIO
 *    DA PONTA da capela (a altura das salas e da garagem), pra ir e vir voando entre a central e as plataformas;
 *  - o pouso e os sólidos são os do voo (lib/cyber/voo: `resolverVoo`).
 * Rumo (`yaw`): frente = (sen yaw, cos yaw), igual à nave e ao grupo da moto. Esquerda do piloto = (cos yaw, −sen yaw).
 */
import { VOO, chaoDoVoo, resolverVoo, type EstadoVoo, type Pilar } from "./voo";
import { ALTURA_LOUNGE, CIDADE } from "./ceu";

/** o CÉU DA ZAEON pra moto: até a borda da plataforma mais distante (+ folga), o teto é o início da ponta da capela
 *  (+ uma folga pra passar por cima do guarda-corpo das plataformas e pousar nelas) */
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export const ZONA_MOTO_ZAEON = {
  r: Math.max(...Object.values(CIDADE.salas).map((s) => Math.hypot(s.x, s.z) + s.r)) + 40,
  teto: CIDADE.pisoY + ALTURA_LOUNGE + 8,
} as const;
/** o teto da moto aqui: `chao` + alturaMax, ou — no céu da Zaeon — o início da ponta da capela, o que for MAIOR */
export function tetoDaMoto(p: { x: number; z: number }, chao: number): number {
  const naZaeon = Math.hypot(p.x - CIDADE.centro.x, p.z - CIDADE.centro.z) <= ZONA_MOTO_ZAEON.r;
  return Math.max(chao + PILOTAGEM.alturaMax, naZaeon ? ZONA_MOTO_ZAEON.teto : -Infinity);
}

export const PILOTAGEM = {
  /** velocidade máxima no acelerador e com boost (m/s): 560 km/h e 1000 km/h */
  vel: 560 / 3.6, velBoost: 1000 / 3.6, re: 9,
  /** aceleração (na saída), no boost e freio (m/s²); a curva de potência (`queda`, `expoente`, com `piso` = o mínimo
   *  perto da máxima); `plana` = quanto perde por segundo solta (fração) */
  acel: 30, acelBoost: 150, queda: 0.9, expoente: 2.2, piso: 0.12, freio: 85, plana: 0.4,
  /** giro (rad/s): parada/devagar, na velocidade de cruzeiro e no boost; `resposta` = quão rápido o guidão chega lá */
  giroBaixo: 1.7, giroAlto: 0.62, giroBoost: 0.4, resposta: 6,
  /** aderência lateral (1/s): quanto da velocidade de lado some por segundo */
  aderencia: 5, aderenciaBoost: 2.6,
  /** quanto do escorregão a curva COME de velocidade (o resto volta pra frente): baixo = curva fechada sem perder o embalo */
  esfrega: 0.22,
  /** inclinação máxima (rad, ~36°) e quão rápido ela chega */
  inclinaMax: 0.7, inclinaResposta: 6,
  /** boost: tanque cheio dura `dura` s; recarga em `recarga` s; precisa de `minimo` pra (re)começar */
  boost: { dura: 5, recarga: 7, minimo: 0.2, velMin: 6 },
  /** o "g" da inclinação: com o g de verdade (9,8) toda curva já deitava no máximo; com um g de jogo maior a moto
   *  deita POUCO devagar e MUITO rápido/no boost (cruzeiro com o guidão todo ≈ 30°, boost ≈ 36°) */
  g: 140,
  /** ALTURA: teto acima do chão de baixo (m) — moto voa BAIXO (o dono pediu: "não deve voar muito acima do chão"); subida e descida (m/s) e quão rápido chega nelas; a descida forçada
   *  (acima do teto, ex.: saiu da borda da Zaeon) vai de `planaMin` a `planaMax` m/s conforme o quanto sobra */
  alturaMax: 8, sobe: 10, desce: 6, inerciaV: 2.4, planaMin: 6, planaMax: 22,
} as const;

/** a partir de que velocidade (m/s) ACENDER o boost rompe a barreira do som: 300 km/h */
export const BOOST_SUPER = 300 / 3.6;
/** o quanto a moto está SUPERSÔNICA (0 = não; com o boost aceso acima de `BOOST_SUPER`: 0,3 na hora … 1 nos 1000 km/h) */
export const supersonico = (v: number, boost: boolean) => (boost && v >= BOOST_SUPER ? 0.3 + 0.7 * clamp((v - PILOTAGEM.vel) / (PILOTAGEM.velBoost - PILOTAGEM.vel), 0, 1) : 0);
/** rompeu a barreira do som agora? = o boost ACENDEU (estava apagado, acendeu) com a moto acima de `BOOST_SUPER` */
export const rompeuBarreira = (boostAntes: boolean, boostAgora: boolean, v: number) => !boostAntes && boostAgora && v >= BOOST_SUPER;

/** o estado da moto = o do voo + o guidão (−1..1, suavizado), a inclinação (rad; < 0 = deita pra ESQUERDA, a
 *  convenção do `rotation.z` do corpo da moto), o tanque de boost (0..1) e se o boost está aceso */
export type EstadoMoto = EstadoVoo & { guidao: number; inclina: number; tanque: number; boost: boolean };
/** acel: −1..1 (W = 1, S = −1); giro: −1..1 (D = 1 = pra DIREITA) */
export type ComandoMoto = { acel: number; giro: number; subir: boolean; descer: boolean; boost: boolean };

export const motoParada = (x: number, y: number, z: number, yaw: number): EstadoMoto => ({ x, y, z, yaw, vx: 0, vy: 0, vz: 0, guidao: 0, inclina: 0, tanque: 1, boost: false });


/** um passo da moto (dt pequeno; use `passoMotoSub` no loop) */
export function passoMoto(s: EstadoMoto, c: ComandoMoto, dt: number, solidos: Pilar[] = [], teto: number = VOO.yMax): { s: EstadoMoto; pousado: boolean; chaoY: number } {
  const P = PILOTAGEM, acel = clamp(c.acel, -1, 1), giroCmd = clamp(c.giro, -1, 1);
  // rente ao chão a moto não anda (tem que decolar, igual à nave) — mas o guidão gira ela no lugar pra mirar
  const chao = chaoDoVoo(s, solidos), rente = s.y - chao < VOO.decolar, tetoAqui = tetoDaMoto(s, chao);
  const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw), lx = Math.cos(s.yaw), lz = -Math.sin(s.yaw);
  let frente = s.vx * fx + s.vz * fz, lado = s.vx * lx + s.vz * lz;
  // BOOST: só com a moto andando pra frente, no ar e com tanque; esvazia aceso, recarrega apagado
  const boost = !rente && c.boost && acel >= 0 && frente > P.boost.velMin && (s.boost ? s.tanque > 0 : s.tanque >= P.boost.minimo);
  const tanque = clamp(s.tanque + (boost ? -dt / P.boost.dura : dt / P.boost.recarga), 0, 1);
  // GUIDÃO: chega no comando aos poucos (nada de virar seco)
  const guidao = s.guidao + (giroCmd - s.guidao) * Math.min(1, dt * P.resposta);
  const v01 = clamp(Math.abs(frente) / P.vel, 0, 1);
  const taxa = (boost ? P.giroBoost : P.giroBaixo + (P.giroAlto - P.giroBaixo) * v01) * (rente ? 0.6 : 1);
  const omega = -guidao * taxa;   // D (giro > 0) vira pra direita = rumo DIMINUI
  const yaw = s.yaw + omega * dt;
  // ACELERADOR: W leva à velocidade (de cruzeiro ou de boost); S freia e, parada, dá ré devagar; solta = plana
  const max = boost ? P.velBoost : P.vel;
  if (rente) frente *= Math.exp(-dt * 6);
  else if (acel > 0) {
    // curva de potência: quase cheia embaixo, caindo perto da máxima (com um piso, pra chegar nela)
    const pot = Math.max(P.piso, 1 - P.queda * (Math.max(0, frente) / max) ** P.expoente);
    if (frente < max * acel) frente = Math.min(max * acel, frente + (boost ? P.acelBoost : P.acel) * acel * pot * dt);
    else frente += (max * acel - frente) * Math.min(1, dt * 1.2);   // acima (o boost acabou): volta pro cruzeiro suave
  } else if (acel < 0) {
    frente = frente > 0 ? Math.max(0, frente + P.freio * acel * dt) : Math.max(-P.re, frente + P.acel * acel * 0.5 * dt);
  } else frente *= Math.exp(-dt * P.plana);
  if (rente) lado *= Math.exp(-dt * 6);
  // o MOMENTO fica (a velocidade no mundo não gira junto com o guidão): no rumo novo, parte dela vira velocidade de
  // LADO — é o escorregão. A ADERÊNCIA come esse lado aos poucos e devolve a maior parte pra frente (curvar não
  // derruba a velocidade toda, como um pneu que segura)
  const wx = fx * frente + lx * lado, wz = fz * frente + lz * lado;
  const nfx = Math.sin(yaw), nfz = Math.cos(yaw), nlx = Math.cos(yaw), nlz = -Math.sin(yaw);
  let frente2 = wx * nfx + wz * nfz, lado2 = wx * nlx + wz * nlz;
  // a velocidade NÃO cresce na curva: o que sai do lado volta pra frente só até a velocidade que já tinha, menos um
  // tico de atrito (o "esfregão" da curva)
  const veloc = Math.hypot(frente2, lado2), sobra = lado2 * Math.exp(-dt * (boost ? P.aderenciaBoost : P.aderencia));
  const esfrega = 1 - P.esfrega * Math.abs(lado2 - sobra) / Math.max(1, veloc);
  frente2 = Math.sign(frente2 || 1) * Math.sqrt(Math.max(0, veloc * veloc - sobra * sobra)) * esfrega; lado2 = sobra;
  const vx = nfx * frente2 + nlx * lado2, vz = nfz * frente2 + nlz * lado2;
  // vertical: sobe devagar, desce mais devagar ainda; no teto (alturaMax acima do chão de baixo) não sobe mais;
  // acima dele (o chão "sumiu": passou da borda da Zaeon, do lounge) desce planando
  let ty = (c.subir ? P.sobe : 0) - (c.descer ? P.desce : 0);
  if (ty > 0 && s.y >= tetoAqui - 0.5) ty = 0;
  const acima = s.y - tetoAqui;
  if (acima > 1) ty = Math.min(ty, -Math.min(P.planaMax, P.planaMin + acima * 0.05));
  let vy = s.vy + (ty - s.vy) * Math.min(1, dt * P.inerciaV);
  if (vy > 0 && s.y + vy * dt > tetoAqui) vy = Math.max(0, (tetoAqui - s.y) / dt) * 0.5;   // encosta no teto macio
  // INCLINAÇÃO de moto: tan θ = v·ω / g (g de jogo — ver PILOTAGEM.g) (deita pro lado de DENTRO da curva); no chão, reta
  const alvo = rente ? 0 : clamp(-Math.atan((frente2 * omega) / P.g), -P.inclinaMax, P.inclinaMax);
  const inclina = s.inclina + (alvo - s.inclina) * Math.min(1, dt * P.inclinaResposta);
  const r = resolverVoo(s.y, { x: s.x + vx * dt, y: s.y + vy * dt, z: s.z + vz * dt, yaw, vx, vy, vz }, solidos, teto);
  return { s: { ...r.s, guidao, inclina, tanque, boost }, pousado: r.pousado, chaoY: r.chaoY };
}

/** o mesmo passo, independente de FPS: subpassos de no máximo `VOO.subpasso` E de no máximo `PASSO_M` metros (a 1000
 *  km/h a moto anda 4,6 m num subpasso de 1/60 s — atravessaria parede) */
const PASSO_M = 1.2;
export function passoMotoSub(s: EstadoMoto, c: ComandoMoto, dt: number, solidos: Pilar[] = [], teto: number = VOO.yMax): { s: EstadoMoto; pousado: boolean; chaoY: number } {
  const total = Math.min(VOO.dtMax, Math.max(0, dt)), v = Math.hypot(s.vx, s.vz) + 20;
  const n = Math.max(1, Math.ceil(total / VOO.subpasso - 1e-9), Math.ceil((total * v) / PASSO_M)), h = total / n;
  let r = { s, pousado: false, chaoY: 0 };
  for (let i = 0; i < n; i++) r = passoMoto(r.s, c, h, solidos, teto);
  return r;
}

/** a partir de que velocidade (m/s) a TELA sente: 150 km/h */
export const VEL_SENTE = 150 / 3.6;
/** o quanto de "velocidade" a TELA deve sentir (0..1, e passa de 1 no boost): FOV, blur radial e linhas de velocidade.
 *  ZERO abaixo de 150 km/h; a partir daí já entra com as linhas (0,2) e cresce até 300 km/h; o boost soma */
export function sensacaoDeVelocidade(s: EstadoMoto): number {
  const v = Math.hypot(s.vx, s.vz);
  if (v < VEL_SENTE) return 0;
  return 0.2 + 0.65 * clamp((v - VEL_SENTE) / (PILOTAGEM.vel - VEL_SENTE), 0, 1) + supersonico(v, s.boost) * 0.3 + (s.boost ? 0.1 : 0);
}
