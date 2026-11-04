/**
 * EspacoAberto — o lado de FORA da sua nave (lib/cyber/minhaNave), em cima do teto:
 *  - (a descida pra dentro é a ESCADA ROLANTE da escotilha — components/cyber/NaveMiniBase);
 *  - o SOFÁ REDONDO na proa (estilo lounge), de frente pro buraco negro do horizonte — onde se começa recostado;
 *  - a DOCA DAS MOTOS na popa: o deck, as 5 motos acopladas (as garras de luz) — monta-se nelas (o engine);
 *  - as ESTRELAS em volta (o espaço da nave fica longe da nuvem de estrelas da cidade): uma nuvem perto e uma casca
 *    que acompanha a câmera, sempre aquém do alcance da vista.
 * Os buracos negros (e as pistas de luz) são os mesmos do hub (components/cyber/FiosCosmicos), montados pelo engine.
 * Referencial: o local da nave (y = 0 no piso de dentro).
 */
import * as THREE from "three";
import { DOCA_MOTOS, SOFA_TETO, TETO_MINI, VAGAS_DOCA } from "@/lib/cyber/minhaNave";
import type { SkinMini } from "@/lib/cyber/naveMini";
import { criarMoto, loteMoto, type MotoHandle } from "./Moto";

export type EspacoHandle = {
  group: THREE.Group;
  /** a moto da vaga `i` da doca aparece (acoplada) ou não (alguém saiu com ela) */
  mostrarMoto(i: number, v: boolean): void;
  atualizar(dt: number, t: number, cam?: THREE.Camera): void;
  dispose(): void;
};

export function criarEspacoAberto(o: { low: boolean; skin: SkinMini; starTex?: THREE.Texture }): EspacoHandle {
  const g = new THREE.Group(), anim: ((dt: number, t: number) => void)[] = [], descartar: { dispose(): void }[] = [], motos: MotoHandle[] = [];
  const add = <T extends THREE.Object3D>(x: T, pai: THREE.Object3D = g) => { pai.add(x); return x; };
  const luz = (c: number, op: number) => { const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); descartar.push(m); return m; };
  const mat = (c: number, brilho = 0.45) => { const m = new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: brilho }); descartar.push(m); return m; };
  const tron = o.skin === "tron", Y = TETO_MINI.y;
  const neon = tron ? 0x45f0ff : 0xffd49a, neon2 = tron ? 0xff2fb4 : 0xf6c4ae;
  const estrutura = mat(tron ? 0x15132a : 0xd9b996, tron ? 0.5 : 0.32), lona = mat(tron ? 0x2c2454 : 0xf6c4ae, 0.4), lona2 = mat(tron ? 0x43357a : 0xd6c6f2, 0.4);

  // ── o SOFÁ REDONDO (estilo lounge): a base com o anel de luz, o assento em disco, o encosto em arco só atrás e as almofadas ──
  { const S = SOFA_TETO, cg = add(new THREE.Group()); cg.position.set(S.x, Y, S.z); cg.rotation.y = S.rumo;
    const setor = (r0: number, r1: number, h: number, a0: number, a1: number) => {
      const sh = new THREE.Shape(), n = 48; for (let k = 0; k <= n; k++) { const a = a0 + ((a1 - a0) * k) / n; k ? sh.lineTo(Math.cos(a) * r1, -Math.sin(a) * r1) : sh.moveTo(Math.cos(a) * r1, -Math.sin(a) * r1); }
      for (let k = n; k >= 0; k--) { const a = a0 + ((a1 - a0) * k) / n; sh.lineTo(Math.cos(a) * r0, -Math.sin(a) * r0); }
      const geo = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 3, curveSegments: 8 }); geo.rotateX(-Math.PI / 2); return geo; };
    add(new THREE.Mesh(new THREE.CylinderGeometry(S.r, S.r * 0.94, 0.28, 48).translate(0, 0.14, 0), estrutura), cg);
    add(new THREE.Mesh(new THREE.CylinderGeometry(S.r - 0.04, S.r - 0.04, S.assento - 0.28, 48).translate(0, 0.28 + (S.assento - 0.28) / 2, 0), lona), cg);
    const atras = -Math.PI / 2;   // (o ângulo do lado de trás no plano: o ponto (cos a, sin a))
    const enc = add(new THREE.Mesh(setor(S.encostoR, S.r, S.encostoAlt - S.assento, atras - S.encosto, atras + S.encosto), lona2), cg); enc.position.y = S.assento;
    add(new THREE.Mesh(new THREE.TorusGeometry(S.r, 0.025, 6, 64).rotateX(Math.PI / 2).translate(0, 0.05, 0), luz(neon, 0.9)), cg);
    add(new THREE.Mesh(new THREE.TorusGeometry(S.r - 0.05, 0.015, 4, 64).rotateX(Math.PI / 2).translate(0, S.assento + 0.01, 0), luz(neon2, 0.6)), cg);
    const topo = add(new THREE.Mesh(setor(S.r - 0.03, S.r, 0.02, atras - S.encosto, atras + S.encosto), luz(neon, 0.85)), cg); topo.position.y = S.encostoAlt + 0.06;
    // as almofadas encostadas no arco (nas pontas dele: o meio fica livre pras costas e a cabeça de quem recosta)
    for (const da of [-1.35, 1.35]) { const a = atras + da, r = S.encostoR - 0.12, al = add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.16), da < 0 ? lona : lona2), cg); al.position.set(Math.cos(a) * r, S.assento + 0.2, Math.sin(a) * r); al.lookAt(cg.position.x * 0, S.assento + 0.2, 0); al.rotation.x -= 0.25; }
    const halo = add(new THREE.Mesh(new THREE.RingGeometry(S.r, S.r + 0.5, 64), luz(neon, 0.12)), cg); halo.rotation.x = -Math.PI / 2; halo.position.y = 0.015;
    anim.push((_, t) => { (halo.material as THREE.MeshBasicMaterial).opacity = 0.08 + 0.05 * Math.sin(t * 1.6); });
  }

  // ── a DOCA DAS MOTOS: o deck com a borda acesa, as garras de luz de cada vaga e as 5 motos acopladas ──
  { const w = DOCA_MOTOS.x1 - DOCA_MOTOS.x0, d = DOCA_MOTOS.z1 - DOCA_MOTOS.z0, cx = (DOCA_MOTOS.x0 + DOCA_MOTOS.x1) / 2, cz = (DOCA_MOTOS.z0 + DOCA_MOTOS.z1) / 2;
    add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d).translate(cx, Y + 0.05, cz), estrutura));
    for (const [x0, z0, x1, z1] of [[DOCA_MOTOS.x0, DOCA_MOTOS.z0, DOCA_MOTOS.x1, DOCA_MOTOS.z0], [DOCA_MOTOS.x0, DOCA_MOTOS.z1, DOCA_MOTOS.x1, DOCA_MOTOS.z1], [DOCA_MOTOS.x0, DOCA_MOTOS.z0, DOCA_MOTOS.x0, DOCA_MOTOS.z1], [DOCA_MOTOS.x1, DOCA_MOTOS.z0, DOCA_MOTOS.x1, DOCA_MOTOS.z1]] as const) {
      const L = Math.hypot(x1 - x0, z1 - z0); add(new THREE.Mesh(new THREE.BoxGeometry(x1 !== x0 ? L : 0.05, 0.04, z1 !== z0 ? L : 0.05).translate((x0 + x1) / 2, Y + 0.12, (z0 + z1) / 2), luz(neon, 0.9))); }
    const pulsos: THREE.Mesh[] = [];
    for (const [i, v] of VAGAS_DOCA.entries()) {
      const garra = add(new THREE.Mesh(new THREE.RingGeometry(0.55, 0.62, 32), luz(neon2, 0.7))); garra.rotation.x = -Math.PI / 2; garra.position.set(v.x, Y + 0.11, v.z); pulsos.push(garra);
      for (const dz of [-0.9, 0.9]) { const b = add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.08), estrutura)); b.position.set(v.x, Y + 0.19, v.z + dz); }
      const m = loteMoto(criarMoto({ cor: ["#45f0ff", "#ff2fb4", "#b98cff", "#5fffb0", "#ffd36b"][i]!, low: o.low, estilo: i })); m.group.position.set(v.x, Y + 0.1, v.z); m.group.rotation.y = v.rumo; add(m.group); motos.push(m);
    }
    anim.push((_, t) => pulsos.forEach((p, i) => { (p.material as THREE.MeshBasicMaterial).opacity = 0.45 + 0.3 * Math.sin(t * 2 + i); })); }

  // ── as ESTRELAS: a nuvem em volta da nave e a casca que segue a câmera (sempre dentro do alcance da vista) ──
  const pontos = (n: number, r0: number, r1: number) => { const v = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), r = r0 + (r1 - r0) * Math.cbrt(Math.random()); v.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)], i * 3); } const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(v, 3)); descartar.push(geo); return geo; };
  const pm = (size: number, atenua: boolean, op: number) => { const m = new THREE.PointsMaterial({ color: 0xffffff, size, ...(o.starTex ? { map: o.starTex } : {}), sizeAttenuation: atenua, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }); descartar.push(m); return m; };
  const nuvem = add(new THREE.Points(pontos(o.low ? 700 : 1600, 60, 1400), pm(7, true, 1)));   // (tamanho no MUNDO: as de perto maiores) nuvem.frustumCulled = false;
  const casca = new THREE.Points(pontos(o.low ? 600 : 1300, 1500, 1650), pm(3, false, 0.95));   // (tamanho na TELA: o fundo de qualquer ponto) casca.frustumCulled = false; g.add(casca);
  const camLocal = new THREE.Vector3();
  anim.push((dt) => { nuvem.rotation.y += dt * 0.004; });

  return {
    group: g,
    mostrarMoto(i, v) { const m = motos[i]; if (m) m.group.visible = v; },
    atualizar(dt, t, cam) { for (const fn of anim) fn(dt, t); if (cam) { camLocal.copy(cam.position); g.worldToLocal(camLocal); casca.position.copy(camLocal); } },
    dispose() { for (const m of motos) m.dispose(); g.traverse((x) => { if ((x as THREE.Mesh).isMesh) (x as THREE.Mesh).geometry?.dispose(); }); for (const m of descartar) m.dispose(); g.removeFromParent(); },
  };
}
