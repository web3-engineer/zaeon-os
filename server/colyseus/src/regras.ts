/**
 * Regras PURAS da sala do Colyseus (espelham o que o app já faz no POST /pos — lib/lounge3d/sala.ts):
 *  - a pose que chega do cliente é saneada (só números finitos, com teto; lixo → ignorada);
 *  - REGALIAS (topo do QG, nave voando/parada) só valem pra quem o TOKEN diz que é fundador — a ZAEON (céu) é aberta;
 *  - a voz (signaling WebRTC) só vai pra alguém que está NA MESMA sala, com teto de tamanho.
 */
export const MAX_JOGADORES = 5;
/** o mapa inteiro (VOO.raioMapa 1500 + folga — os campi UFC/Unifor/UECE ficam na borda) e a altura máxima (VOO.yMax 720 + dorso da nave/mochila) — espelha MAPA
 *  de lib/lounge3d/sala. A Zaeon mega fica em z −560 (até −812) com piso a 450 m: com 600/400 quem estava lá
 *  aparecia pros outros puxado pro lado e as motos/nave 50 m ABAIXO do piso. */
const COORD = 1540, ALT = 800;
/** a mochila pode estar CAINDO no vazio (o hiperespaço não tem chão): até um pouco abaixo de onde se renasce — espelha lib/cyber/praca QUEDA_VAZIO */
const QUEDA = -80;

const num = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : null;

export type Pose = {
  x: number; z: number; facing: number; moving: boolean; sit: boolean;
  topo: boolean; ceu: boolean;
  /** pilotando: altura + rumo (só fundador) */ voo: { y: number; yaw: number } | null;
  /** nave pousada fora do hangar (só fundador) */ naveParada: { x: number; y: number; z: number; yaw: number } | null;
  /** mochila a jato: altura no mundo (qualquer um) */ jet: number | null;
  /** em pé num lugar alto (dorso da nave, ilhota) */ alt: number | null;
  /** montado numa moto voadora (qualquer pessoa): vaga 0..7, altura com teto, rumo */ moto: { s: number; y: number; yaw: number; de?: string } | null;
  /** a moto que ESTACIONOU (fica onde desceu): vaga, posição no mapa, rumo */ motoLargada: { s: number; x: number; y: number; z: number; yaw: number } | null;
  /** DESCANSO no lounge: 0 em pé, 1 sentado, 2 deitado, +3 com o tablet (espelha lib/cyber/descanso) */ desc: number;
  /** ARENA PvP (espelha lib/cyber/combate): o golpe (seq×4 + nº; 0 = nenhum), a vida (0–100), a espada na mão */ atk: number; hp: number; arma: boolean;
  /** o MOVIMENTO TURBINADO (espelha lib/cyber/movimento): 0 nada, 1 sprint, 2 dash, 3 guarda, 4 hero landing, 5 decolagem */ mov: number;
};
const VAGAS_MOTO = 32, TETO_MOTO = ALT;   // chão (4) + Zaeon (12) + 4 mirantes da Zaeon (16) — espelha TOTAL_VAGAS de lib/cyber/motos

/** saneia a pose do cliente; `fundador` vem do TOKEN (servidor), nunca do cliente */
export function sanitizarPose(raw: unknown, fundador: boolean): Pose | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const x = num(r.x, -COORD, COORD), z = num(r.z, -COORD, COORD), facing = num(r.facing, -10, 10);
  if (x === null || z === null || facing === null) return null;
  let voo: Pose["voo"] = null, naveParada: Pose["naveParada"] = null;
  if (fundador && r.voo && typeof r.voo === "object") {
    const v = r.voo as Record<string, unknown>, y = num(v.y, 0, ALT), yaw = num(v.yaw, -10, 10);
    if (y !== null && yaw !== null) voo = { y, yaw };
  }
  if (fundador && r.naveParada && typeof r.naveParada === "object") {
    const v = r.naveParada as Record<string, unknown>;
    const nx = num(v.x, -COORD, COORD), ny = num(v.y, 0, ALT), nz = num(v.z, -COORD, COORD), yaw = num(v.yaw, -10, 10);
    if (nx !== null && ny !== null && nz !== null && yaw !== null) naveParada = { x: nx, y: ny, z: nz, yaw };
  }
  return {
    x, z, facing, moving: r.moving === true, sit: r.sit === true,
    topo: fundador && r.topo === true, ceu: r.ceu === true,
    voo, naveParada, jet: num(r.jet, QUEDA, ALT), alt: num(r.alt, 0, ALT), moto: motoDe(r.moto), motoLargada: motoLargadaDe(r.motoLargada),
    desc: typeof r.desc === "number" && Number.isInteger(r.desc) && r.desc >= 0 && r.desc <= 5 ? r.desc : 0,
    atk: typeof r.atk === "number" && Number.isInteger(r.atk) && r.atk >= 0 && r.atk <= 400000 ? r.atk : 0,
    hp: typeof r.hp === "number" && Number.isInteger(r.hp) && r.hp >= 0 && r.hp <= 100 ? r.hp : 100,
    arma: r.arma === 1,
    mov: typeof r.mov === "number" && Number.isInteger(r.mov) && r.mov >= 0 && r.mov <= 5 ? r.mov : 0,
  };
}
function motoDe(v: unknown): Pose["moto"] {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>, y = num(o.y, 0, TETO_MOTO), yaw = num(o.yaw, -10, 10);
  if (typeof o.s !== "number" || !Number.isInteger(o.s) || o.s < 0 || o.s >= VAGAS_MOTO || y === null || yaw === null) return null;
  return { s: o.s, y, yaw, ...(typeof o.de === "string" && /^[a-f0-9]{24}$/i.test(o.de) ? { de: o.de } : {}) };   // de quem era a estacionada que pegou
}

function motoLargadaDe(v: unknown): Pose["motoLargada"] {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>, x = num(o.x, -COORD, COORD), y = num(o.y, 0, ALT), z = num(o.z, -COORD, COORD), yaw = num(o.yaw, -10, 10);
  if (typeof o.s !== "number" || !Number.isInteger(o.s) || o.s < 0 || o.s >= VAGAS_MOTO || x === null || y === null || z === null || yaw === null) return null;
  return { s: o.s, x, y, z, yaw };
}

/** mensagem de signaling WebRTC (offer/answer/ICE) — só repassa se o destino estiver na sala e couber no teto */
export function sanitizarRtc(raw: unknown, presentes: Set<string>): { to: string; data: unknown } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.to !== "string" || !presentes.has(r.to)) return null;
  let tam = 0;
  try { tam = JSON.stringify(r.data ?? null).length; } catch { return null; }
  if (tam > 16_000) return null;   // SDP com folga; nada de usar o relay como transporte de dados
  return { to: r.to, data: r.data ?? null };
}
