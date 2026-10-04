/**
 * BaseEstudo — a estação de estudo do cyberespaço (HANDOFF §2.1): plataforma circular com anel de luz, mesa +
 * computador holográfico (tela com linhas de "texto"), cadeira, cristais emissivos flutuando e neurônios subindo.
 * Uma por pessoa, FIXA em `layout` (ver lib/cyber/bases.ts). O monitor é um mesh separado (hover + clique).
 */
import * as THREE from "three";
import type { LayoutBase } from "@/lib/cyber/bases";

export type BaseEstudoHandle = {
  group: THREE.Group;
  layout: LayoutBase;
  /** reposiciona (a ordem canônica dos membros chegou depois). */
  mover(l: LayoutBase): void;
  /** mesh clicável do monitor (raycast). */
  monitor: THREE.Mesh;
  /** `ativa` = o dono (ou alguém) está perto → luz/cristais/linhas intensificam. `hover` = ponteiro no monitor. */
  atualizar(o: { dt: number; t: number; ativa: boolean; hover: boolean; perto: boolean }): void;
  dispose(): void;
};

const CRISTAIS = [0x66e6ff, 0xb98cff, 0x9affd0, 0xffd36b];

export function criarBase(layout: LayoutBase, accent: string, starTex: THREE.Texture, low: boolean): BaseEstudoHandle {
  const office = new THREE.Group();
  office.position.set(layout.x, 0, layout.z); office.rotation.y = layout.rot;
  const acc = new THREE.Color(accent);

  const plat = new THREE.Mesh(new THREE.CircleGeometry(3.4, 56), new THREE.MeshStandardMaterial({ color: 0x101a32, roughness: 0.9, emissive: 0x0b1736, emissiveIntensity: 0.5 }));
  plat.rotation.x = -Math.PI / 2; plat.position.y = 0.03; office.add(plat);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.3, 3.5, 64), new THREE.MeshBasicMaterial({ color: acc, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; office.add(ring);

  const deskMat = new THREE.MeshStandardMaterial({ color: 0x16203c, roughness: 0.5, metalness: 0.3, emissive: 0x16264f, emissiveIntensity: 0.35 });
  const desk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 1.0), deskMat); desk.position.set(0, 0.98, -1.0); office.add(desk);
  for (const [x, z] of [[-1.05, -0.6], [1.05, -0.6], [-1.05, -1.4], [1.05, -1.4]] as const) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.98, 10), deskMat); l.position.set(x, 0.49, z); office.add(l);
  }

  const scrGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.35), new THREE.MeshBasicMaterial({ color: 0x66e6ff, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  scrGlow.position.set(0, 1.85, -1.46); office.add(scrGlow);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.2), new THREE.MeshBasicMaterial({ color: 0x0a2436, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  scr.position.set(0, 1.85, -1.44); office.add(scr);
  const scrEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(2.1, 1.2)), new THREE.LineBasicMaterial({ color: 0x66e6ff, transparent: true, opacity: 0.85 }));
  scrEdge.position.copy(scr.position); office.add(scrEdge);
  const linhas: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const w = 0.3 + Math.random() * 1.4;
    const ln = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.07), new THREE.MeshBasicMaterial({ color: 0x8fe8ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending }));
    ln.position.set(-1.0 + w / 2, 2.3 - i * 0.17, -1.43); office.add(ln); linhas.push(ln);
  }
  const luz = new THREE.PointLight(0x9fd8ff, 1.6, 11); luz.position.set(0, 2.6, -0.4); office.add(luz);

  const cristais: { m: THREE.Mesh; baseY: number; ph: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * 6.283, rad = 2.5 + Math.random() * 0.6, h = 0.35 + Math.random() * 0.8;
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.17 + Math.random() * 0.13), new THREE.MeshStandardMaterial({ color: 0x0a1626, emissive: CRISTAIS[i % CRISTAIS.length]!, emissiveIntensity: 1.3, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.92, flatShading: true }));
    c.scale.y = 1.6 + Math.random(); c.position.set(Math.cos(ang) * rad, h, Math.sin(ang) * rad); office.add(c); cristais.push({ m: c, baseY: h, ph: Math.random() * 6.28 });
  }

  // neurônios subindo (corkscrew vivo, estilo cérebro) + núcleo do feixe
  const upN = low ? 80 : 160, upPos = new Float32Array(upN * 3);
  const upData = Array.from({ length: upN }, () => ({ a: Math.random() * 6.283, r: 0.25 + Math.random() * 0.9, y: Math.random() * 15, sp: 1.3 + Math.random() * 1.9, dr: 0.5 + Math.random() * 0.7 }));
  const upGeo = new THREE.BufferGeometry(); upGeo.setAttribute("position", new THREE.BufferAttribute(upPos, 3));
  const upPts = new THREE.Points(upGeo, new THREE.PointsMaterial({ size: 0.34, map: starTex, transparent: true, opacity: 0.92, depthWrite: false, blending: THREE.AdditiveBlending, color: 0x8fe8ff }));
  upPts.frustumCulled = false; office.add(upPts);
  const beam = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: 0x9fe8ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  beam.scale.set(3.2, 3.2, 1); beam.position.y = 0.4; office.add(beam);

  // cadeira
  const chMat = new THREE.MeshStandardMaterial({ color: 0x14203a, roughness: 0.5, metalness: 0.3, emissive: 0x1b2b55, emissiveIntensity: 0.45 });
  const chair = new THREE.Group();
  const assento = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.09, 0.52), chMat); assento.position.y = 0.5; chair.add(assento);
  const encosto = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.58, 0.09), chMat); encosto.position.set(0, 0.8, 0.24); chair.add(encosto);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 12), chMat); pole.position.y = 0.25; chair.add(pole);
  const cbase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 22), chMat); cbase.position.y = 0.03; chair.add(cbase);
  chair.position.set(0, 0, -0.15); office.add(chair);

  return {
    group: office, layout, monitor: scr,
    mover(l) { this.layout = l; office.position.set(l.x, 0, l.z); office.rotation.y = l.rot; },
    atualizar({ dt, t, ativa, hover, perto }) {
      const pulso = 0.5 + 0.5 * Math.sin(t * 5);
      (scrEdge.material as THREE.LineBasicMaterial).opacity = hover ? (perto ? 0.75 + 0.25 * pulso : 0.95) : 0.85;
      (scrEdge.material as THREE.LineBasicMaterial).color.setHex(hover && perto ? 0xffffff : 0x66e6ff);
      (scrGlow.material as THREE.MeshBasicMaterial).opacity = hover ? (perto ? 0.3 + 0.12 * pulso : 0.2) : 0.13;
      luz.intensity = 1.5 + (ativa ? 1.4 : 0);
      linhas.forEach((ln, i) => { (ln.material as THREE.MeshBasicMaterial).opacity = (ativa ? 0.6 : 0.28) + 0.22 * (0.5 + 0.5 * Math.sin(t * 2 + i)); });
      cristais.forEach((c) => { c.m.position.y = c.baseY + Math.sin(t * 1.2 + c.ph) * 0.12; c.m.rotation.y += dt * 0.6; (c.m.material as THREE.MeshStandardMaterial).emissiveIntensity = (ativa ? 1.4 : 1.0) + 0.6 * (0.5 + 0.5 * Math.sin(t * 2.5 + c.ph)); });
      const pa = upGeo.attributes.position!.array as Float32Array;
      for (let i = 0; i < upN; i++) {
        const d = upData[i]!; d.y += d.sp * dt; if (d.y > 15) { d.y = 0; d.a = Math.random() * 6.283; d.r = 0.25 + Math.random() * 0.9; }
        const rr = d.r * (0.5 + d.y * 0.06), ang = d.a + d.y * d.dr * 0.35;
        pa[i * 3] = Math.cos(ang) * rr; pa[i * 3 + 1] = d.y; pa[i * 3 + 2] = Math.sin(ang) * rr;
      }
      upGeo.attributes.position!.needsUpdate = true;
      (upPts.material as THREE.PointsMaterial).size = 0.3 + 0.08 * Math.sin(t * 3);
      (beam.material as THREE.SpriteMaterial).opacity = 0.6 + 0.3 * Math.sin(t * 2.2);
    },
    dispose() {
      office.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mt = (m as { material?: THREE.Material | THREE.Material[] }).material;
        if (mt) (Array.isArray(mt) ? mt : [mt]).forEach((x) => x.dispose());
      });
      office.removeFromParent();
    },
  };
}
