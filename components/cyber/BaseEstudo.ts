/**
 * BaseEstudo — a estação de estudo do cyberespaço, no idioma "alienígena": um TRONO pro computador sobre a plataforma
 * circular — estrado em degraus, espaldar alto (com uma joia de cristal no topo) atrás da TELA principal lá no alto
 * (inclinada pra quem está na frente) e duas asas laterais com MONITORES VERTICAIS virados pra dentro. As telas têm
 * cara de tecnologia: moldura fina, cantoneiras de luz, barra de status e medidores. À frente, um painel de controle
 * holográfico na altura das mãos — sem cadeira: o dono fica em pé, DIGITANDO. Quando o dono está na base (`energia`), fluxos
 * de luz saem do painel (as mãos) e sobem até as três telas — a "interação energética". Cristais flutuando e
 * neurônios subindo continuam. Uma por pessoa, FIXA em `layout` (ver lib/cyber/bases.ts). O monitor clicável é a
 * tela principal. Local: +z aponta pra fora (praça); o trono fica no −z, de frente pro ponto do dono (0, −0.15).
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
  /**
   * `ativa` = o dono (ou alguém) está perto → luz/cristais/linhas intensificam. `hover` = ponteiro no monitor.
   * `energia` (0..1) = o dono na base (digitando no painel) → o fluxo de energia mãos → telas.
   */
  atualizar(o: { dt: number; t: number; ativa: boolean; hover: boolean; perto: boolean; energia?: number }): void;
  dispose(): void;
};

/** a TELA (local): centro alto, de frente pro dono — o engine usa pra rótulos/menu */
export const TELA_BASE = { y: 2.75, z: -1.75, w: 2.4, h: 1.35 } as const;
/** monitores verticais das asas laterais */
const TELA_LATERAL = { w: 0.78, h: 1.35 } as const;
/** o painel de controle (local), na altura das mãos de quem está em pé na base, digitando */
const ANEL_CTRL = { y: 1.05, z: -0.72 } as const;

const CRISTAIS = [0x66e6ff, 0xb98cff, 0x9affd0, 0xffd36b];
const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function criarBase(layout: LayoutBase, accent: string, starTex: THREE.Texture, low: boolean): BaseEstudoHandle {
  const office = new THREE.Group();
  office.position.set(layout.x, 0, layout.z); office.rotation.y = layout.rot;
  const acc = new THREE.Color(accent), parado = reducedMotion();
  const seg = low ? 24 : 40;

  // plataforma + anel de luz na cor da pessoa
  const plat = new THREE.Mesh(new THREE.CircleGeometry(3.4, 56), new THREE.MeshStandardMaterial({ color: 0x101a32, roughness: 0.9, emissive: 0x0b1736, emissiveIntensity: 0.5 }));
  plat.rotation.x = -Math.PI / 2; plat.position.y = 0.03; office.add(plat);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.3, 3.5, 64), new THREE.MeshBasicMaterial({ color: acc, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; office.add(ring);

  // ── estrutura "alienígena": metal escuro com veios de luz na cor da pessoa ──
  const casco = new THREE.MeshStandardMaterial({ color: 0x1a2440, roughness: 0.35, metalness: 0.5, emissive: acc.clone().multiplyScalar(0.25), emissiveIntensity: 0.6 });
  const veio = new THREE.MeshBasicMaterial({ color: acc.clone().lerp(new THREE.Color(0xffffff), 0.35), transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });

  const veioLinha = new THREE.LineBasicMaterial({ color: acc.clone().lerp(new THREE.Color(0xffffff), 0.35), transparent: true, opacity: 0.8 });
  /** arestas de luz numa peça (veios do metal) */
  const arestas = <T extends THREE.Mesh>(m: T): T => { const l = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 25), veioLinha); m.add(l); return m; };
  const peca = (geo: THREE.BufferGeometry, x: number, y: number, z: number, pai: THREE.Object3D = office) => { const m = arestas(new THREE.Mesh(geo, casco)); m.position.set(x, y, z); pai.add(m); return m; };

  // ── TRONO do computador: estrado em degraus, espaldar alto atrás da tela principal (com uma joia de cristal no
  //    topo), braços que seguram a tela e duas ASAS laterais com monitores VERTICAIS virados pra dentro ──
  peca(new THREE.BoxGeometry(3.8, 0.22, 1.5), 0, 0.11, -1.95);
  peca(new THREE.BoxGeometry(3.0, 0.22, 1.1), 0, 0.33, -2.1);
  { const f = new THREE.Shape(); f.moveTo(-1.55, 0); f.lineTo(1.55, 0); f.lineTo(1.55, 3.0); f.lineTo(1.0, 3.75); f.lineTo(-1.0, 3.75); f.lineTo(-1.55, 3.0); f.closePath();
    peca(new THREE.ExtrudeGeometry(f, { depth: 0.22, bevelEnabled: false }), 0, 0.44, -2.5); }
  for (const lado of [-1, 1]) peca(new THREE.BoxGeometry(0.16, 2.5, 0.22), lado * 1.36, 1.7, -1.86);   // braços da tela
  const joia = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshStandardMaterial({ color: 0x0a1626, emissive: acc, emissiveIntensity: 1.1, roughness: 0.2, flatShading: true }));
  joia.scale.y = 1.6; joia.position.set(0, 4.05, -2.3); office.add(joia);

  // painel de controle holográfico (onde as mãos "tocam"): placa inclinada com teclas de luz
  const painelMat = new THREE.MeshBasicMaterial({ color: acc, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const painel = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.42), painelMat); painel.position.set(0, ANEL_CTRL.y, ANEL_CTRL.z); painel.rotation.x = -1.2; office.add(painel);
  painel.add(new THREE.LineSegments(new THREE.EdgesGeometry(painel.geometry), veioLinha));
  { const k: number[] = []; for (let i = 1; i < 6; i++) k.push(-0.45 + i * 0.15, -0.2, 0.002, -0.45 + i * 0.15, 0.2, 0.002); k.push(-0.45, 0, 0.002, 0.45, 0, 0.002);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(k), 3)); painel.add(new THREE.LineSegments(g, veioLinha)); }

  /** uma tela "tecnológica": vidro escuro + brilho + aresta + cantoneiras de luz + barra de status + linhas de texto */
  const telas: { glow: THREE.MeshBasicMaterial; edge: THREE.LineBasicMaterial; linhas: THREE.MeshBasicMaterial[]; barras: THREE.Mesh[] }[] = [];
  const criarTela = (pai: THREE.Object3D, w: number, h: number, nLinhas: number, nBarras: number): THREE.Mesh => {
    const glow = new THREE.MeshBasicMaterial({ color: 0x66e6ff, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const g = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.2, h + 0.18), glow); g.position.z = -0.02; pai.add(g);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0x0a2436, transparent: true, opacity: 0.62, side: THREE.DoubleSide })); pai.add(scr);
    const edge = new THREE.LineBasicMaterial({ color: 0x66e6ff, transparent: true, opacity: 0.85 }); pai.add(new THREE.LineSegments(new THREE.EdgesGeometry(scr.geometry), edge));
    // moldura fina (bezel) atrás + cantoneiras em L (HUD) na frente
    const bezel = arestas(new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.05), casco)); bezel.position.z = -0.05; pai.add(bezel);
    const L = Math.min(w, h) * 0.18, cx = w / 2 + 0.05, cy = h / 2 + 0.05, c: number[] = [];
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) c.push(sx * cx, sy * cy, 0.01, sx * (cx - L), sy * cy, 0.01, sx * cx, sy * cy, 0.01, sx * cx, sy * (cy - L), 0.01);
    const cg = new THREE.BufferGeometry(); cg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(c), 3)); pai.add(new THREE.LineSegments(cg, veioLinha));
    // barra de status no topo, com três luzes
    const status = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, 0.05), new THREE.MeshBasicMaterial({ color: acc, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending })); status.position.set(0, h / 2 - 0.08, 0.01); pai.add(status);
    for (let i = 0; i < 3; i++) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.022, 10), new THREE.MeshBasicMaterial({ color: [0x9affd0, 0xffd36b, 0x66e6ff][i]! })); d.position.set(w / 2 - 0.08 - i * 0.07, h / 2 - 0.15, 0.012); pai.add(d); }
    const linhas: THREE.MeshBasicMaterial[] = [];
    for (let i = 0; i < nLinhas; i++) {
      const lw = (0.25 + Math.random() * 0.6) * w;
      const m = new THREE.MeshBasicMaterial({ color: 0x8fe8ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
      const ln = new THREE.Mesh(new THREE.PlaneGeometry(lw, 0.055), m); ln.position.set(-w / 2 + 0.1 + lw / 2, h / 2 - 0.28 - i * 0.15, 0.01); pai.add(ln); linhas.push(m);
    }
    // medidores (barras verticais) no canto de baixo
    const barras: THREE.Mesh[] = [];
    for (let i = 0; i < nBarras; i++) {
      const bm = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.3), new THREE.MeshBasicMaterial({ color: acc.clone().lerp(new THREE.Color(0xffffff), 0.3), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending }));
      bm.geometry.translate(0, 0.15, 0); bm.position.set(w / 2 - 0.12 - i * 0.09, -h / 2 + 0.08, 0.01); pai.add(bm); barras.push(bm);
    }
    telas.push({ glow, edge, linhas, barras });
    return scr;
  };

  // TELA principal no alto, inclinada pra baixo (de frente pra quem está sentado)
  const tela = new THREE.Group(); tela.position.set(0, TELA_BASE.y, TELA_BASE.z); tela.rotation.x = 0.18; office.add(tela);
  const scr = criarTela(tela, TELA_BASE.w, TELA_BASE.h, 6, 5);
  // asas laterais com monitores VERTICAIS, viradas pra dentro
  const lateraisPos: THREE.Vector3[] = [];
  for (const lado of [-1, 1]) {
    const asa = new THREE.Group(); asa.position.set(lado * 1.95, 0, -1.35); asa.rotation.y = -lado * 0.6; office.add(asa);
    peca(new THREE.BoxGeometry(1.0, 2.9, 0.16), 0, 1.89, -0.02, asa);
    const mon = new THREE.Group(); mon.position.set(0, 2.35, 0.1); asa.add(mon);
    criarTela(mon, TELA_LATERAL.w, TELA_LATERAL.h, 5, 3);
    asa.updateMatrixWorld(true); lateraisPos.push(mon.getWorldPosition(new THREE.Vector3()).sub(office.getWorldPosition(new THREE.Vector3())).applyQuaternion(office.quaternion.clone().invert()));
  }
  // luz pontual por base pesa no shader de TODA a cena (uma por pessoa): no `low` (celular) fica só o emissivo
  const luz = low ? null : new THREE.PointLight(0x9fd8ff, 1.6, 11); if (luz) { luz.position.set(0, 3.1, -0.6); office.add(luz); }

  // ── fluxo de ENERGIA: do painel (mãos) até as três telas, em curvas; só com o dono sentado ──
  const origem = new THREE.Vector3(0, ANEL_CTRL.y, ANEL_CTRL.z);
  const curvas = [new THREE.Vector3(0, TELA_BASE.y - 0.1, TELA_BASE.z + 0.15), ...lateraisPos].map((fim) =>
    new THREE.QuadraticBezierCurve3(origem.clone(), new THREE.Vector3(fim.x * 0.4, ANEL_CTRL.y + 1.4, (ANEL_CTRL.z + fim.z) / 2), fim));
  const fN = low ? 30 : 60, fPos = new Float32Array(fN * 3);
  const fFase = Array.from({ length: fN }, (_, i) => ({ c: i % 2 === 0 ? 0 : 1 + ((i >> 1) % 2), u: Math.random(), j: Math.random() * 6.283, r: 0.03 + Math.random() * 0.08 }));
  const fGeo = new THREE.BufferGeometry(); fGeo.setAttribute("position", new THREE.BufferAttribute(fPos, 3));
  const fMat = new THREE.PointsMaterial({ size: 0.15, map: starTex, color: acc.clone().lerp(new THREE.Color(0xffffff), 0.5), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const fluxo = new THREE.Points(fGeo, fMat); fluxo.frustumCulled = false; office.add(fluxo);
  const fioMat = new THREE.MeshBasicMaterial({ color: acc, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const fios = curvas.map((c) => { const m = new THREE.Mesh(new THREE.TubeGeometry(c, 20, 0.01, 5, false), fioMat); office.add(m); return m; });
  const tmp = new THREE.Vector3();

  const cristais: { m: THREE.Mesh; baseY: number; ph: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * 6.283, rad = 2.6 + Math.random() * 0.5, h = 0.35 + Math.random() * 0.8;
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.17 + Math.random() * 0.13), new THREE.MeshStandardMaterial({ color: 0x0a1626, emissive: CRISTAIS[i % CRISTAIS.length]!, emissiveIntensity: 1.3, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.92, flatShading: true }));
    c.scale.y = 1.6 + Math.random(); c.position.set(Math.cos(ang) * rad, h, Math.sin(ang) * rad); office.add(c); cristais.push({ m: c, baseY: h, ph: Math.random() * 6.28 });
  }

  // neurônios subindo (corkscrew vivo, estilo cérebro) + núcleo do feixe
  const upN = low ? 50 : 90, upPos = new Float32Array(upN * 3);
  const upData = Array.from({ length: upN }, () => ({ a: Math.random() * 6.283, r: 0.25 + Math.random() * 0.9, y: Math.random() * 15, sp: 1.3 + Math.random() * 1.9, dr: 0.5 + Math.random() * 0.7 }));
  const upGeo = new THREE.BufferGeometry(); upGeo.setAttribute("position", new THREE.BufferAttribute(upPos, 3));
  const upPts = new THREE.Points(upGeo, new THREE.PointsMaterial({ size: 0.34, map: starTex, transparent: true, opacity: 0.92, depthWrite: false, blending: THREE.AdditiveBlending, color: 0x8fe8ff }));
  upPts.frustumCulled = false; office.add(upPts);
  const beam = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: 0x9fe8ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  beam.scale.set(3.2, 3.2, 1); beam.position.y = 0.4; office.add(beam);

  let e = 0;   // energia suavizada
  return {
    group: office, layout, monitor: scr,
    mover(l) { this.layout = l; office.position.set(l.x, office.position.y, l.z); office.rotation.y = l.rot; },
    atualizar({ dt, t, ativa, hover, perto, energia = 0 }) {
      e += (energia - e) * Math.min(1, dt * 2.5);
      const pulso = 0.5 + 0.5 * Math.sin(t * 2.2);
      telas.forEach((tl, k) => {
        const principal = k === 0, foco = principal && hover;
        tl.edge.opacity = foco ? (perto ? 0.75 + 0.25 * pulso : 0.95) : 0.85;
        tl.edge.color.setHex(foco && perto ? 0xffffff : 0x66e6ff);
        tl.glow.opacity = foco ? (perto ? 0.3 + 0.12 * pulso : 0.2) : 0.13 + 0.25 * e;
        tl.linhas.forEach((m, i) => { m.opacity = (ativa ? 0.6 : 0.28) + 0.22 * (0.5 + 0.5 * Math.sin(t * (2 + 2 * e) + i + k)); });
        tl.barras.forEach((b, i) => { b.scale.y = 0.25 + (0.35 + 0.65 * e) * (0.5 + 0.5 * Math.sin(t * (1.3 + i * 0.37) + k * 1.7 + i)); });
      });
      if (luz) luz.intensity = 1.5 + (ativa ? 1.4 : 0) + 1.2 * e;
      cristais.forEach((c) => { c.m.position.y = c.baseY + Math.sin(t * 1.2 + c.ph) * 0.12; c.m.rotation.y += dt * 0.6; (c.m.material as THREE.MeshStandardMaterial).emissiveIntensity = (ativa ? 1.4 : 1.0) + 0.6 * (0.5 + 0.5 * Math.sin(t * 2.5 + c.ph)); });
      (joia.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.9 + 0.6 * e + 0.2 * pulso; joia.rotation.y += dt * (0.3 + 0.9 * e);
      veio.opacity = 0.6 + 0.3 * e; veioLinha.opacity = 0.65 + 0.3 * e;
      painelMat.opacity = 0.1 + 0.3 * e;
      // fluxo: partículas sobem pelas curvas painel → telas, espiralando de leve
      fMat.opacity = 0.9 * e; fioMat.opacity = 0.3 * e * (0.7 + 0.3 * pulso);
      fluxo.visible = e > 0.01; for (const f of fios) f.visible = fluxo.visible;
      if (fluxo.visible) {
        for (let i = 0; i < fN; i++) {
          const f = fFase[i]!; if (!parado) f.u = (f.u + dt * 0.45) % 1;
          curvas[f.c]!.getPoint(f.u, tmp); const a = f.j + t * 3 + f.u * 6;
          fPos[i * 3] = tmp.x + Math.cos(a) * f.r; fPos[i * 3 + 1] = tmp.y + Math.sin(a) * f.r * 0.6; fPos[i * 3 + 2] = tmp.z;
        }
        fGeo.attributes.position!.needsUpdate = true;
      }
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
