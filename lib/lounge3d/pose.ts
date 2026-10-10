/**
 * lib/lounge3d/pose.ts — regras PURAS da difusão de pose do lounge (Pusher client events).
 *  - só reenvia quando a pose MUDOU (parado não gasta a cota de 10 msg/s do Pusher);
 *  - um heartbeat independente do requestAnimationFrame reenvia a última pose (aba em segundo plano, pacote perdido,
 *    quem acabou de entrar).
 */
export type Pose = { x: number; z: number; facing: number; moving?: boolean; sit?: boolean; topo?: boolean; ceu?: boolean; voo?: { y: number; yaw: number }; naveParada?: { x: number; y: number; z: number; yaw: number }; jet?: number; alt?: number;
  /** montado numa MOTO voadora: vaga de origem + altura + rumo (qualquer pessoa) */ moto?: { s: number; y: number; yaw: number; de?: string };
  /** a moto que ESTACIONOU (fica onde desceu) */ motoLargada?: { s: number; x: number; y: number; z: number; yaw: number };
  /** DESCANSO no lounge (lib/cyber/descanso `codificarDescanso`): 0 em pé, 1 sentado, 2 deitado, +3 com o tablet */ desc?: number;
  /** ARENA PvP (lib/cyber/combate): o golpe (seq×4 + nº do combo), a vida (0–100) e a espada na mão (1) */ atk?: number; hp?: number; arma?: number;
  /** o MOVIMENTO TURBINADO: 1 sprint, 2 dash, 3 guarda, 4 hero landing, 5 decolagem (os outros veem a pose) */ mov?: number };

/** Heartbeat: reenvia a última pose mesmo com a aba em segundo plano (setInterval segue disparando). */
export const HEARTBEAT_MS = 2000;
/** Resposta ao `client-hello` com um atraso aleatório curto, pra quem já está na sala não responder em rajada. */
export const HELLO_JITTER_MS = 300;

const EPS_POS = 0.02, EPS_ANG = 0.02;

/** A pose mudou o bastante pra valer um envio? (`null` = nunca enviei nada → muda) */
export function poseMudou(antes: Pose | null, agora: Pose): boolean {
  if (!antes) return true;
  if ((antes.desc ?? 0) !== (agora.desc ?? 0)) return true;
  if ((antes.mov ?? 0) !== (agora.mov ?? 0) || (antes.atk ?? 0) !== (agora.atk ?? 0) || (antes.hp ?? 100) !== (agora.hp ?? 100) || (antes.arma ?? 0) !== (agora.arma ?? 0)) return true;   // (o golpe sai NA HORA)
  if (!!antes.moving !== !!agora.moving || !!antes.sit !== !!agora.sit || !!antes.topo !== !!agora.topo || !!antes.ceu !== !!agora.ceu || !!antes.voo !== !!agora.voo) return true;
  if (antes.voo && agora.voo && (Math.abs(antes.voo.y - agora.voo.y) > 0.05 || Math.abs(antes.voo.yaw - agora.voo.yaw) > EPS_ANG)) return true;
  if ((antes.alt === undefined) !== (agora.alt === undefined) || (antes.alt !== undefined && agora.alt !== undefined && Math.abs(antes.alt - agora.alt) > 0.05)) return true;
  if ((antes.jet === undefined) !== (agora.jet === undefined) || (antes.jet !== undefined && agora.jet !== undefined && Math.abs(antes.jet - agora.jet) > 0.05)) return true;
  const ma = antes.moto, mb = agora.moto;
  if (!!ma !== !!mb || (ma && mb && (ma.s !== mb.s || ma.de !== mb.de || Math.abs(ma.y - mb.y) > 0.05 || Math.abs(ma.yaw - mb.yaw) > EPS_ANG))) return true;
  const la = antes.motoLargada, lb = agora.motoLargada;
  if (!!la !== !!lb || (la && lb && (la.s !== lb.s || Math.hypot(la.x - lb.x, la.y - lb.y, la.z - lb.z) > EPS_POS || Math.abs(la.yaw - lb.yaw) > EPS_ANG))) return true;
  const na = antes.naveParada, nb = agora.naveParada;
  if (!!na !== !!nb || (na && nb && (Math.hypot(na.x - nb.x, na.y - nb.y, na.z - nb.z) > EPS_POS || Math.abs(na.yaw - nb.yaw) > EPS_ANG))) return true;
  if (Math.hypot(agora.x - antes.x, agora.z - antes.z) > EPS_POS) return true;
  let d = agora.facing - antes.facing; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d) > EPS_ANG;
}
