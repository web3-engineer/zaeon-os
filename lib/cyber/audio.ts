/**
 * Cyberespaço — regras PURAS do áudio (o three fica em components/cyber/AudioCyber.ts):
 *  - os 21 sons (arquivos) + 2 SINTETIZADOS no código (jato contínuo da mochila, baque do pouso) e COMO tocam
 *    (posicional MONO preso a um objeto × 2D estéreo/UI);
 *  - preferências do usuário (`zaeon_sfx` liga/desliga, `zaeon_volume` mestre 0..1);
 *  - modelo de distância (some longe), teto de vozes simultâneas, cadência de passos;
 *  - o leito ambiente "abaixa" enquanto a música da intro toca (cross-fade quando ela fadeia).
 */
import { SINTESE_MOTO, type NomeSomMoto } from "./somMoto";
import { SINTESE_CORRIDA, type NomeSomCorrida } from "./somCorrida";
import { SINTESE_ASAS, type NomeSomAsas } from "./asas";
import { sintetizarBatida, sintetizarRaio } from "./coracao";
import { sintetizarAmbiente } from "./ambiente";
import { sintetizarPuxaFio, sintetizarZumbidoFio } from "./somFio";
import { sintetizarAcerto, sintetizarAlerta, sintetizarDash, sintetizarDecola, sintetizarGolpe, sintetizarImpactoHeroi } from "./somMovimento";

export const PASTA_SONS = "/assets/sounds/cyber/";

export type NomeSom =
  | "space-bed" | "blackhole-hum" | "crystals" | "ship-flight" | "ship-idle"
  | "ship-takeoff" | "ship-landing" | "ship-touchdown" | "step-1" | "step-2" | "step-3" | "jump" | "land"
  | "near-ping" | "neuron-chime" | "rise" | "cyber-enter" | "study-confirm" | "chat-pop" | "join" | "leave"
  | "jetpack" | "jato-sopro" | "baque" | "droid-agua" | "droid-alien"
  | NomeSomMoto | NomeSomCorrida | NomeSomAsas | "coracao" | "raio" | "ambiente-biblioteca" | "ambiente-jardim" | "fio-zumbido" | "fio-puxa" | "dash" | "alerta" | "decola" | "impacto-heroi" | "golpe" | "acerto";

/** afinação 432 Hz: a faixa do leito (danamusic) é gravada em A=440 (medido: +0,1 cent) — tocada a 432/440 vira A=432 */
export const TAXA_432 = 432 / 440;

/** como cada som toca: `pos` = PositionalAudio (mono, no mundo); `2d` = THREE.Audio (leito/UI); `taxa` = playbackRate */
/** `emendar` = segundos de crossfade da ponta no começo (vira loop sem emenda ao carregar); `filtro` = passa-baixa (Hz) */
export const SONS: Record<NomeSom, { modo: "pos" | "2d"; loop: boolean; volume: number; taxa?: number; sintetico?: boolean; ext?: "wav"; emendar?: number; filtro?: number; recortar?: boolean }> = {
  // JATO da mochila (contínuo enquanto se segura o ESPAÇO) em 2 camadas: o ronco gravado ("Rocket Engine", CC0,
  // OpenGameArt — WAV mono, loop sem emenda) + o sopro/chiado sintetizado por cima
  jetpack: { modo: "pos", loop: true, volume: 0.55, ext: "wav" },
  // a VOZ DO DROID (sem palavras — `vozDroid` no AudioCyber): água de rio correndo (RandomMind, CC0) + um tom
  // alienígena (Dr. Neptune, CC0), esculpidos em "sílabas" e jogados num delay e num reverb longos (VOZ_DROID)
  "droid-agua": { modo: "pos", loop: false, volume: 0.9, ext: "wav" },
  "droid-alien": { modo: "pos", loop: false, volume: 0.55 },
  // SINTETIZADOS (sem arquivo): gerados no navegador por sintetizarJetpack / sintetizarBaque
  "jato-sopro": { modo: "pos", loop: true, volume: 0.32, sintetico: true },
  baque: { modo: "pos", loop: false, volume: 0.95, sintetico: true },   // o corpo batendo no chão (força pela queda)
  // o MOVIMENTO TURBINADO (lib/cyber/somMovimento): o DASH, a expiração da GUARDA, a DECOLAGEM e o HERO LANDING
  dash: { modo: "pos", loop: false, volume: 0.85, sintetico: true },
  alerta: { modo: "pos", loop: false, volume: 0.45, sintetico: true },   // (a expiração pesada da guarda)
  decola: { modo: "pos", loop: false, volume: 0.8, sintetico: true },     // a ignição do jato no impulso
  "impacto-heroi": { modo: "pos", loop: false, volume: 1, sintetico: true },   // o estrondo do hero landing (queda alta)
  golpe: { modo: "pos", loop: false, volume: 0.8, sintetico: true },      // o corte de ar da espada (arena)
  acerto: { modo: "pos", loop: false, volume: 0.95, sintetico: true },    // o golpe pegando
  // MOTO por estágio (lib/cyber/somMoto, sintetizados): loops de motor (que faz a lenta)/vento/turbina + os one-shots
  "moto-motor": { modo: "pos", loop: true, volume: 0.6, ext: "wav" },   // gravação real (CREDITS.md)
  "moto-motor-alto": { modo: "pos", loop: true, volume: 0.6, ext: "wav" },   // gravação real (CREDITS.md)
  "moto-troca": { modo: "pos", loop: false, volume: 0.5, sintetico: true },
  "moto-pipoco": { modo: "pos", loop: true, volume: 0.85, ext: "wav" },   // o carburador estalando (estouros reais — CREDITS.md)
  "moto-estrondo": { modo: "pos", loop: false, volume: 1, sintetico: true },
  "moto-supersonico": { modo: "pos", loop: true, volume: 0.5, sintetico: true },
  "moto-vento": { modo: "pos", loop: true, volume: 0.35, sintetico: true },
  "moto-turbina": { modo: "pos", loop: true, volume: 0.6, sintetico: true },
  "moto-partida": { modo: "pos", loop: false, volume: 0.75, sintetico: true },
  "moto-desliga": { modo: "pos", loop: false, volume: 0.6, sintetico: true },
  "moto-boost": { modo: "pos", loop: false, volume: 0.95, ext: "wav" },   // tiro de escape + rajada (gravações reais — CREDITS.md)
  "moto-freio": { modo: "pos", loop: false, volume: 0.45, sintetico: true },
  "moto-decola": { modo: "pos", loop: false, volume: 0.55, sintetico: true },
  "moto-pouso": { modo: "pos", loop: false, volume: 0.8, sintetico: true },
  // CORRIDAS (lib/cyber/somCorrida): 2D — são do HUD, não de um lugar
  "corrida-bip": { modo: "2d", loop: false, volume: 0.55, sintetico: true },
  "corrida-largada": { modo: "2d", loop: false, volume: 0.65, sintetico: true },
  "corrida-portao": { modo: "2d", loop: false, volume: 0.45, sintetico: true },
  "corrida-boost": { modo: "2d", loop: false, volume: 0.55, sintetico: true },
  "corrida-volta": { modo: "2d", loop: false, volume: 0.6, sintetico: true },
  "corrida-fim": { modo: "2d", loop: false, volume: 0.7, sintetico: true },
  // ASAS NEGRAS do founder (lib/cyber/asas): a BATIDA é gravada ("large wings flap", CC0 — OpenGameArt/AntumDeluge, de
  // dave.des no Freesound; 1 batida recortada, macia, com passa-baixa); o vento, abrir e fechar são sintetizados
  "asa-bater": { modo: "pos", loop: false, volume: 0.42, ext: "wav", filtro: 3800 },
  "asa-vento": { modo: "pos", loop: true, volume: 0.32, sintetico: true },
  // o CORAÇÃO da Zaeon (lib/cyber/coracao, sintetizados): a batida (perto do globo) e o RAIO no topo da capela
  coracao: { modo: "pos", loop: false, volume: 0.55, sintetico: true },
  raio: { modo: "pos", loop: false, volume: 0.8, sintetico: true },
  // a MÚSICA AMBIENTE dos espaços de convivência (lib/cyber/ambiente, sintetizada): sai das caixas de som de cada sala
  "ambiente-biblioteca": { modo: "pos", loop: true, volume: 0.36, sintetico: true },
  // os FIOS DE ENERGIA (lib/cyber/somFio, sintetizados): o zumbido do cabo nos postes e o assobio de quem é puxado
  "fio-zumbido": { modo: "pos", loop: true, volume: 0.32, sintetico: true },
  "fio-puxa": { modo: "pos", loop: true, volume: 0.6, sintetico: true },
  "ambiente-jardim": { modo: "pos", loop: true, volume: 0.4, sintetico: true },
  "asa-abrir": { modo: "pos", loop: false, volume: 0.6, sintetico: true },
  "asa-fechar": { modo: "pos", loop: false, volume: 0.5, sintetico: true },
  "space-bed": { modo: "2d", loop: true, volume: 0.09, taxa: TAXA_432 },   // AMBIENTE: bem baixo, por baixo de passos/efeitos (era 0,22)
  "blackhole-hum": { modo: "pos", loop: true, volume: 0.55 },
  crystals: { modo: "pos", loop: true, volume: 0.3 },
  "ship-flight": { modo: "pos", loop: true, volume: 0.7 },
  "ship-idle": { modo: "pos", loop: true, volume: 0.35 },
  // SUBIR/DESCER: one-shot só no COMEÇO da ação (apertou) — depois fica o som normal de voo (ver gatilhosVoo). Como
  // loops ligando/desligando a cada aperto eles repetiam e atropelavam o motor.
  "ship-takeoff": { modo: "pos", loop: false, volume: 0.8 },
  "ship-landing": { modo: "pos", loop: false, volume: 0.75 },
  "ship-touchdown": { modo: "pos", loop: false, volume: 0.9 },   // no instante do POUSO: impacto grave + assentamento
  // passos SUTIS: volume baixo + passa-baixa (tira o "estalo"); no compasso do pé de verdade (criarDetectorPasso).
  // `recortar`: só a batida principal (os arquivos têm respiro antes e o step-1 tem uma 2ª batida aos ~260 ms, que
  // correndo cai em cima da pisada seguinte e soa fora do compasso) — ver recortePasso
  "step-1": { modo: "pos", loop: false, volume: 0.3, filtro: 2300, recortar: true },
  "step-2": { modo: "pos", loop: false, volume: 0.3, filtro: 2300, recortar: true },
  "step-3": { modo: "pos", loop: false, volume: 0.3, filtro: 2300, recortar: true },
  jump: { modo: "pos", loop: false, volume: 0.6 },
  land: { modo: "pos", loop: false, volume: 0.55 },
  "near-ping": { modo: "pos", loop: false, volume: 0.45 },
  "neuron-chime": { modo: "pos", loop: false, volume: 0.35 },
  rise: { modo: "pos", loop: false, volume: 0.6 },
  "cyber-enter": { modo: "2d", loop: false, volume: 0.6 },       // entrada no cyberespaço (play): startup 432 + arpejo
  "study-confirm": { modo: "2d", loop: false, volume: 0.6 },
  "chat-pop": { modo: "2d", loop: false, volume: 0.45 },
  join: { modo: "pos", loop: false, volume: 0.55 },
  leave: { modo: "pos", loop: false, volume: 0.5 },
};
export const urlDoSom = (n: NomeSom) => `${PASTA_SONS}${n}.${SONS[n].ext ?? "ogg"}`;
/** os sons que vêm de ARQUIVO (os sintetizados não) */
export const SONS_ARQUIVO = (Object.keys(SONS) as NomeSom[]).filter((n) => !SONS[n].sintetico);

/** PRNG determinístico (mulberry32) — a síntese sai igual sempre (e dá pra testar) */
function prng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const normalizar = (x: Float32Array, pico: number) => { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); if (m > 0) for (let i = 0; i < x.length; i++) x[i] = (x[i]! / m) * pico; return x; };

/**
 * JATO da mochila (mono, loop de `seg` s): ronco grave (ruído marrom) + corpo (ruído passa-baixa ~550 Hz) + chiado fino
 * (passa-alta) com um "crepitar" de combustão (tremolo ~23 Hz). A ponta é emendada no começo (crossfade de potência
 * constante) → loop sem clique. O engine controla volume e afinação pelo empuxo (somDoJato).
 */
export function sintetizarJetpack(sr: number, seg = 3): Float32Array {
  const n = Math.round(sr * seg), x = Math.round(sr * 0.3), raw = new Float32Array(n + x), r = prng(7);
  let marrom = 0, lp1 = 0, lp2 = 0, hp = 0, wAnt = 0;
  const a1 = 1 - Math.exp((-2 * Math.PI * 550) / sr), a2 = 1 - Math.exp((-2 * Math.PI * 900) / sr);
  for (let i = 0; i < raw.length; i++) {
    const w = r() * 2 - 1, t = i / sr;
    marrom = 0.996 * marrom + 0.06 * w; lp1 += (w - lp1) * a1; lp2 += (lp1 - lp2) * a2; hp = 0.82 * (hp + w - wAnt); wAnt = w;
    const crepita = 1 + 0.22 * Math.sin(2 * Math.PI * 23 * t + 0.6 * Math.sin(2 * Math.PI * 3.1 * t));
    raw[i] = (marrom * 1.6 + lp2 * 2.2 + hp * 0.1) * crepita;
  }
  const out = raw.slice(0, n);
  for (let i = 0; i < x; i++) { const u = i / x; out[i] = raw[i]! * Math.sqrt(u) + raw[n + i]! * Math.sqrt(1 - u); }
  return normalizar(out, 0.8);
}

/** BAQUE do pouso (mono, ~0,5 s): batida grave com o tom caindo (110 → 38 Hz) + um estalo de terra abafado no início */
export function sintetizarBaque(sr: number): Float32Array {
  const n = Math.round(sr * 0.5), out = new Float32Array(n), r = prng(13), aLp = 1 - Math.exp((-2 * Math.PI * 700) / sr);
  let fase = 0, lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, f = 38 + 72 * Math.exp(-t * 18); fase += (2 * Math.PI * f) / sr;
    const env = (1 - Math.exp(-t * 900)) * Math.exp(-t * 9);
    lp += (r() * 2 - 1 - lp) * aLp;
    out[i] = Math.sin(fase) * env + lp * Math.exp(-t * 45) * 1.4;
  }
  for (let i = 0; i < 64; i++) out[n - 1 - i]! *= i / 64;   // fim sem clique
  return normalizar(out, 0.92);
}
export const SINTESE: Partial<Record<NomeSom, (sr: number) => Float32Array>> = { "jato-sopro": sintetizarJetpack, baque: sintetizarBaque, ...SINTESE_MOTO, ...SINTESE_CORRIDA, ...SINTESE_ASAS, coracao: sintetizarBatida, raio: sintetizarRaio,
  "ambiente-biblioteca": (sr) => sintetizarAmbiente("biblioteca", sr), "ambiente-jardim": (sr) => sintetizarAmbiente("jardim", sr),
  "fio-zumbido": sintetizarZumbidoFio, "fio-puxa": sintetizarPuxaFio, dash: sintetizarDash, alerta: sintetizarAlerta, decola: sintetizarDecola, "impacto-heroi": sintetizarImpactoHeroi, golpe: sintetizarGolpe, acerto: sintetizarAcerto };

/** distância: cai com a distância e some longe (cull). A nave de quem PILOTA quase não paneia (rolloff baixo).
 *  Atenção: no modelo "inverse" do Web Audio o `max` NÃO corta (o som só vai ficando fraco, mas se ouve de longe);
 *  quem precisa SUMIR de verdade usa `modelo: "linear"` (ganho chega a 0 no `max`). */
export type Dist = { ref: number; max: number; rolloff: number; modelo?: "inverse" | "linear" };
export const DISTANCIA: Record<"padrao" | "perto" | "eu" | "cristais" | "voz" | "grande" | "naveLocal" | "musica" | "holograma" | "coracao" | "raio" | "ambiente" | "fio", Dist> = {
  padrao: { ref: 6, max: 60, rolloff: 1.2 },
  perto: { ref: 2.5, max: 22, rolloff: 1.4 },       // passos/pulo dos COLEGAS (coisas pequenas)
  eu: { ref: 12, max: 60, rolloff: 1 },             // os MEUS passos/pulo: a câmera (o ouvinte) fica ~8–10 m atrás do avatar
  cristais: { ref: 4, max: 26, rolloff: 1, modelo: "linear" },   // só perto: some de verdade longe
  voz: { ref: 3, max: 28, rolloff: 1, modelo: "linear" },        // VOZ por proximidade: cheia de perto, some aos ~28 m
  grande: { ref: 14, max: 160, rolloff: 1 },        // buraco negro, nave dos outros
  naveLocal: { ref: 40, max: 400, rolloff: 0.25 },  // a nave em que EU estou: não vira de lado ao girar a câmera
  musica: { ref: 18, max: 110, rolloff: 1, modelo: "linear" },   // as TORRES DE SOM do clube (lounge): cheio na sala toda, ecoa pela ilha e some longe
  holograma: { ref: 14, max: 120, rolloff: 0.7 },  // a VOZ DA ZAEON saindo do rosto de ~13 m: cheia em volta do globo (a pessoa fica a ~9 m), ainda se ouve da borda da capela
  coracao: { ref: 10, max: 70, rolloff: 1, modelo: "linear" },     // a batida do coração: sentida no pátio da capela, some longe
  raio: { ref: 60, max: 900, rolloff: 0.6 },
  ambiente: { ref: 12, max: 58, rolloff: 1, modelo: "linear" },
  fio: { ref: 4, max: 32, rolloff: 1, modelo: "linear" },          // o zumbido do fio e o assobio de quem vai nele: só perto   // a música das salas: cheia na sala toda (4 caixas), some fora dela                         // o raio no topo da capela: ouve-se da cidade toda (e de longe)
};

/** cristais da base: só se ouvem com o AVATAR perto dela (cheio até 4 m, some aos 12 m) — o ouvinte é a câmera */
export const CRISTAIS_PERTO = { cheio: 4, some: 12 };
export function fatorCristais(d: number): number {
  const k = (CRISTAIS_PERTO.some - d) / (CRISTAIS_PERTO.some - CRISTAIS_PERTO.cheio);
  const u = Math.max(0, Math.min(1, k)); return u * u * (3 - 2 * u);
}

export const PREF_SFX = "zaeon_sfx", PREF_VOLUME = "zaeon_volume";
/** preferências: som ligado por padrão ("0" desliga); volume mestre 0..1 (padrão 0,8) */
export function lerPrefs(get: (k: string) => string | null): { ligado: boolean; volume: number } {
  let ligado = true, volume = 0.8;
  try { ligado = get(PREF_SFX) !== "0"; const v = Number.parseFloat(get(PREF_VOLUME) ?? ""); if (Number.isFinite(v)) volume = Math.max(0, Math.min(1, v)); } catch { /* storage bloqueado */ }
  return { ligado, volume };
}

/** fade-in (s) dos loops ao entrar na cena 3D — o som do cyberespaço nunca entra seco */
export const FADE_ENTRADA = 1.6;

/** quando a nave "começa a descer": vy abaixo disso (m/s), a mais de `alturaMin` do chão; no máx. 1× a cada `intervalo` s */
export const NAVE_DESCIDA = { vy: -8, alturaMin: 3, intervalo: 2.5 };
export type EstadoSomNave = { pousado: boolean; descendo: boolean; esfria: number };
export const somNaveInicial = (pousado = true): EstadoSomNave => ({ pousado, descendo: false, esfria: 0 });
/**
 * Os eventos de som da nave, por quadro: `decolou` (saiu do solo → ship-takeoff), `desceu` (começou a DESCER → ship-landing,
 * o motor baixando) e `pousou` (tocou o chão, UMA vez → ship-touchdown). A descida tem histerese (só "sai" de descendo
 * quando a queda cai pra menos da metade) e um intervalo mínimo, pra não repetir ao ajustar a altura.
 */
export function eventosNave(e: EstadoSomNave, agora: { pousado: boolean; vy: number; altura: number }, dt: number) {
  const decolou = e.pousado && !agora.pousado, pousou = !e.pousado && agora.pousado;
  const descendo = !agora.pousado && (e.descendo ? agora.vy < NAVE_DESCIDA.vy / 2 : agora.vy < NAVE_DESCIDA.vy && agora.altura > NAVE_DESCIDA.alturaMin);
  let esfria = Math.max(0, e.esfria - dt);
  const desceu = descendo && !e.descendo && esfria <= 0;
  if (desceu) esfria = NAVE_DESCIDA.intervalo;
  return { e: { pousado: agora.pousado, descendo, esfria }, decolou, desceu, pousou };
}

/**
 * Os sons de SUBIR e DESCER da nave tocam UMA vez, no começo da ação (a borda: não subia → sobe), nunca em loop.
 * `esfria`: intervalo mínimo (s) entre dois disparos do mesmo som — apertar/soltar rápido (ajuste de altura) não
 * reinicia o som em cima dele mesmo.
 */
export const GATILHO_VOO = { esfria: 1.4 };
export type EstadoGatilhoVoo = { subindo: boolean; descendo: boolean; esfriaSobe: number; esfriaDesce: number };
export const gatilhoVooInicial = (): EstadoGatilhoVoo => ({ subindo: false, descendo: false, esfriaSobe: 0, esfriaDesce: 0 });
export function gatilhosVoo(e: EstadoGatilhoVoo, agora: { subindo: boolean; descendo: boolean }, dt: number) {
  let esfriaSobe = Math.max(0, e.esfriaSobe - dt), esfriaDesce = Math.max(0, e.esfriaDesce - dt);
  const sobe = agora.subindo && !e.subindo && esfriaSobe <= 0, desce = agora.descendo && !e.descendo && esfriaDesce <= 0;
  if (sobe) esfriaSobe = GATILHO_VOO.esfria;
  if (desce) esfriaDesce = GATILHO_VOO.esfria;
  return { e: { subindo: agora.subindo, descendo: agora.descendo, esfriaSobe, esfriaDesce }, sobe, desce };
}

/** teto de vozes simultâneas de one-shots (os loops são fixos e contados à parte) */
export function criarLimiteVozes(max = 12) {
  let ativas = 0;
  return { get ativas() { return ativas; }, pegar() { if (ativas >= max) return false; ativas++; return true; }, soltar() { ativas = Math.max(0, ativas - 1); } };
}

/** loop SEM EMENDA a partir de um som que não foi feito pra repetir: a ponta (`x` amostras) entra em crossfade de
 *  potência constante no começo — o resultado tem `n − x` amostras e o fim casa com o início */
export function emendarLoop(d: Float32Array, x: number): Float32Array {
  const n = d.length; x = Math.max(1, Math.min(Math.floor(n / 3), Math.floor(x)));
  const out = d.slice(0, n - x);
  for (let i = 0; i < x; i++) { const u = i / x; out[i] = d[i]! * Math.sqrt(u) + d[n - x + i]! * Math.sqrt(1 - u); }
  return out;
}

/**
 * PASSO no compasso da animação. `fasesDeContato`: dadas as alturas de cada pé amostradas ao longo de UM ciclo da
 * animação (andar ou correr), as fases (0..1) em que cada pé ENCOSTA no chão (mínimo local perto do mínimo do ciclo).
 * `pisadasEntre`: quantas dessas fases o relógio da animação cruzou entre dois quadros (com a volta do ciclo) — assim o
 * passo soa exatamente quando o pé encosta, em QUALQUER fps (no celular a 20 fps também).
 */
export function fasesDeContato(alturasPorPe: number[][], folga = 0.03): number[] {
  const fases: number[] = [];
  for (const h of alturasPorPe) {
    // o pé "plantado" = perto do mínimo; a PISADA é o instante em que ele chega lá (o começo de cada apoio, com a volta)
    const n = h.length, min = Math.min(...h), apoio = h.map((v) => v < min + folga);
    if (apoio.every(Boolean)) continue;
    for (let i = 0; i < n; i++) if (apoio[i] && !apoio[(i - 1 + n) % n]) fases.push(i / n);
  }
  return fases.sort((x, y) => x - y);
}
export function pisadasEntre(uAnt: number, u: number, fases: number[]): number {
  const dentro = (f: number, a: number, b: number) => f > a && f <= b;
  let n = 0;
  for (const f of fases) n += u >= uAnt ? (dentro(f, uAnt, u) ? 1 : 0) : (dentro(f, uAnt, 1) || dentro(f, -1e-9, u) ? 1 : 0);
  return n;
}

/**
 * O recorte de um PASSO: a janela que começa logo antes da BATIDA PRINCIPAL (a de maior pico — volta do pico até o
 * ataque dela, no máx. 40 ms) e dura `dur` s. Assim o som bate no instante em que o pé encosta (sem o respiro de
 * ~50–70 ms dos arquivos) e acaba antes de uma eventual 2ª batida — correndo (~0,3 s entre pisadas) ela soaria
 * como um passo fora do compasso. Devolve { ini, n } em amostras.
 */
export function recortePasso(d: Float32Array, sr: number, dur = 0.16): { ini: number; n: number } {
  let pico = 0, ip = 0;
  for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]!); if (v > pico) { pico = v; ip = i; } }
  const w = Math.max(1, Math.round(sr * 0.002)), lim = Math.max(0, ip - Math.round(sr * 0.04));
  const maxAbs = (a: number, b: number) => { let m = 0; for (let i = Math.max(0, a); i < b; i++) m = Math.max(m, Math.abs(d[i]!)); return m; };
  let ini = ip;
  while (ini - w >= lim && maxAbs(ini - w, ini) > pico * 0.15) ini -= w;
  ini = Math.max(0, ini - Math.round(sr * 0.004));
  return { ini, n: Math.max(1, Math.min(d.length - ini, Math.round(sr * dur))) };
}
/** aplica o recorte num canal: copia a janela, com 1 ms de entrada e uma cauda em fade (`cauda` s) pra não estalar */
export function recortarCanal(d: Float32Array, r: { ini: number; n: number }, sr: number, cauda = 0.05): Float32Array {
  const out = d.slice(r.ini, r.ini + r.n), ne = Math.min(out.length, Math.round(sr * 0.001)), nc = Math.min(out.length, Math.round(sr * cauda));
  for (let i = 0; i < ne; i++) out[i]! *= i / ne;
  for (let i = 0; i < nc; i++) out[out.length - 1 - i]! *= i / nc;
  return out;
}

/** cadência dos passos (s) e o próximo arquivo (alterna os 3) — reserva quando o avatar não tem pés (sem o modelo) */
export const cadenciaPasso = (correndo: boolean) => (correndo ? 0.3 : 0.44);
export const PASSOS: NomeSom[] = ["step-1", "step-2", "step-3"];

/** o leito ambiente abaixa enquanto a música da intro toca e sobe quando ela fadeia (cross-fade) */
export const fatorLeito = (musica: "parado" | "tocando" | "fade") => (musica === "tocando" ? 0.2 : musica === "fade" ? 0.6 : 1);

/** próximo intervalo (s) do brilho dos neurônios na base — esporádico */
export const intervaloNeuronio = (aleatorio: number) => 7 + aleatorio * 9;

/**
 * A VOZ DA ZAEON no holograma (components/cyber/AudioCyber `falaHolograma`): a fala (Gemini-TTS, voz Leda) passa por
 * um passa-alta (tira o grave "de gente" — fica um pouco "projetada"), um REVERB curto por convolução (wet/dry) e um
 * CHORUS bem leve (um atraso de ~8 ms modulado: o "brilho" trêmulo de holograma). INTELIGÍVEL PRIMEIRO: o efeito é
 * tempero — o sinal seco continua dominante e o reverb é curto, pra não embolar as palavras.
 */
export const HOLO_VOZ = {
  passaAlta: 180,     // Hz
  reverbSeg: 1.2,     // a cauda do reverb (−60 dB)
  preAtraso: 0.012,   // s: o "espaço" antes das reflexões
  molhado: 0.35,      // quanto do reverb entra (o seco fica com 1 − molhado)
  chorusMs: 8,        // o atraso base do chorus
  chorusProfMs: 1.6,  // quanto ele oscila (±)
  chorusHz: 0.55,     // a velocidade da oscilação
  chorusMix: 0.22,    // quanto do chorus entra
  volume: 1.6,
} as const;

/** um gerador pseudoaleatório com SEMENTE (mulberry32): a mesma semente → o mesmo ruído (testável, sem Math.random) */
export function aleatorioComSemente(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** a RESPOSTA AO IMPULSO do reverb do holograma (PURA): um pré-atraso em silêncio e depois ruído branco com
 *  decaimento EXPONENCIAL que chega a −60 dB em `seg` (o RT60), com um ataque de 4 ms (sem estalo). Pico normalizado
 *  em 1. Uma semente por canal (L ≠ R) deixa o reverb largo. */
export function respostaImpulso(sr: number, seg: number = HOLO_VOZ.reverbSeg, semente = 1, preAtraso: number = HOLO_VOZ.preAtraso): Float32Array {
  const n = Math.max(1, Math.round(sr * seg)), ini = Math.min(n - 1, Math.round(sr * preAtraso)), ataque = Math.max(1, Math.round(sr * 0.004));
  const out = new Float32Array(n), rnd = aleatorioComSemente(semente), k = Math.log(1000) / seg;   // e^(−k·seg) = 1/1000 = −60 dB
  let pico = 0;
  for (let i = ini; i < n; i++) {
    const t = (i - ini) / sr, env = Math.exp(-k * t) * Math.min(1, (i - ini) / ataque);
    const v = (rnd() * 2 - 1) * env; out[i] = v; pico = Math.max(pico, Math.abs(v));
  }
  if (pico > 0) for (let i = ini; i < n; i++) out[i]! /= pico;
  return out;
}

/**
 * A VOZ DO DROID (components/cyber/AudioCyber `vozDroid`): ele não fala palavras — é um som "espiritual", distante,
 * de outra dimensão. Água correndo (como uma cachoeira) passa por dois filtros de FORMANTE largos que só DERIVAM
 * devagar (ondas, não sílabas — o dono pediu pouca modulação), um tom alienígena desafinado por baixo, e tudo vai
 * pra um DELAY discreto e um REVERB longo, mais molhado que seco (soa de outro mundo, longe). Na
 * FÚRIA (a expulsão), mais grave.
 */
export const VOZ_DROID = {
  /** a duração do som por fala (s): cresce com o texto, entre o mínimo e o máximo */
  dur: { base: 0.9, porLetra: 0.028, min: 1.3, max: 3.6 },
  /** as ONDAS: a cada passo (lento) os formantes e o volume deslizam pra um novo alvo — `suave` = a constante de tempo
   *  do deslize (s): grande = sem "picotar" */
  silaba: { min: 0.5, max: 0.95 }, suave: 0.32,
  f1: [320, 760], f2: [1100, 2200], q: 2.2,
  /** o tom alienígena: afinação e quanto entra */
  alien: { taxa: [0.82, 1.18], ganho: 0.55 },
  delay: { seg: 0.42, retorno: 0.38, mix: 0.32, corte: 2200 },   // eco discreto (o dono pediu menos)
  reverb: { seg: 5, preAtraso: 0.08, molhado: 0.72 },
  /** a fúria (expulsão): mais grave (afinação × 0,62), formantes mais baixos, mais volume */
  furia: { taxa: 0.62, formantes: 0.7, ganho: 1.35 },
  volume: 2.2,
} as const;

/** quanto dura o som do Droid pra uma fala */
export function duracaoVozDroid(texto: string): number {
  const d = VOZ_DROID.dur;
  return Math.min(d.max, Math.max(d.min, d.base + texto.trim().length * d.porLetra));
}

/** as ONDAS da voz (puro, com semente): quando cada uma começa e pra onde vão os dois formantes e o volume. A primeira
 *  começa no 0; nenhuma passa da duração; os formantes ficam nas faixas (× `formantes` na fúria) */
export type SilabaDroid = { t: number; f1: number; f2: number; ganho: number };
export function silabasDroid(dur: number, semente: number, o: { formantes?: number } = {}): SilabaDroid[] {
  const r = aleatorioComSemente(semente), k = o.formantes ?? 1, v = VOZ_DROID, out: SilabaDroid[] = [];
  const entre = (a: readonly [number, number]) => (a[0] + (a[1] - a[0]) * r()) * k;
  for (let t = 0; t < dur; t += v.silaba.min + (v.silaba.max - v.silaba.min) * r()) out.push({ t, f1: entre(v.f1), f2: entre(v.f2), ganho: 0.7 + 0.3 * r() });
  return out;
}
