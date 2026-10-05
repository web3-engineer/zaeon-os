/**
 * Landmark — builder three.js dos PONTOS DE INTERESSE do cyberespaço (registro em lib/cyber/landmarks.ts).
 * Preset "zaeon" = porte 1:1 de docs/prototypes/zaeon-landmark.html (visão de Enoque): ilha de cristal invertida
 * flutuando com brilho frio por baixo, piso frio, 16 muralhas de granizo, casa de cristal (6 pilares + cúpula
 * estelar), querubins orbitando, 18 línguas de fogo + anel de brasa (cintilar LENTO, sem estrobo), plataforma do
 * topo com o computador e o avatar do dono (núcleo + aura + coroa) e o feixe de neurônios subindo.
 *
 * ANDÁVEL (lib/cyber/nav): escala do registro, PORTÃO nas muralhas alinhado à ESCADARIA de cristal que desce até a
 * praça. Por ser andável, a estrutura não gira (portão e escada precisam ficar alinhados) e a flutuação é sutil —
 * querubins, feixe e coroa continuam se mexendo.
 *
 * Disciplina (igual BaseEstudo/CenaCosmica): blocos repetidos instanciados, `low` reduz partículas/segmentos e
 * troca o vidro com transmission por transparente simples, `prefers-reduced-motion` deixa o fogo quase estático,
 * `dispose()` libera tudo (geometrias, materiais, texturas, rótulo do overlay).
 */
import * as THREE from "three";
import { marcoNav, type POI } from "@/lib/cyber/landmarks";
import { muralhaTemBloco } from "@/lib/cyber/nav";
import { glowTex } from "./CenaCosmica";

export type LandmarkHandle = {
  poi: POI;
  group: THREE.Group;
  /** rótulo 2D (overlay) — o engine posiciona por projeção e esconde fora do interactR */
  rotulo: HTMLDivElement;
  /** malhas sólidas pra raycast do clique (sprites/pontos ficam de fora) */
  alvos: THREE.Object3D[];
  /** plataforma do topo (onde pousa a base do dono), se o preset tiver */
  topo: THREE.Group | null;
  /** tela do computador do topo (hover/clique do dono) */
  monitorTopo: THREE.Mesh | null;
  /** os degraus (clique do chão na escada = ir até o pé e subir) */
  escada: THREE.Object3D | null;
  /** o dono real está no topo → esconde a "estátua" do dono */
  donoPresente(sim: boolean): void;
  atualizar(dt: number, t: number): void;
  dispose(): void;
};

const COLD = 0xbfe8ff, ICE = 0x9fd0ff, FIRE = [0xffe3b0, 0xffb45a, 0xff7a2c];
const ROTULO_CSS = "position:absolute;transform:translate(-50%,-100%);font:800 13px system-ui,sans-serif;letter-spacing:.06em;padding:4px 12px;border-radius:999px;color:#bfe8ff;background:rgba(8,14,34,.7);border:1px solid rgba(150,220,255,.45);box-shadow:0 0 18px rgba(90,200,255,.35);white-space:nowrap;pointer-events:none;display:none;";

const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function criarLandmark(poi: POI, opts: { low: boolean; starTex: THREE.Texture }): LandmarkHandle {
  const rotulo = document.createElement("div");
  rotulo.style.cssText = ROTULO_CSS; rotulo.textContent = poi.nome;
  return poi.preset === "zaeon" ? zaeon(poi, opts, rotulo) : poi.preset === "heliporto" ? heliporto(poi, opts, rotulo) : generico(poi, opts, rotulo);
}

/** Libera geometrias/materiais de uma árvore + as texturas próprias do builder (`extras`); compartilhadas ficam. */
export function liberar(raiz: THREE.Object3D, extras: THREE.Texture[] = []) {
  const mats = new Set<THREE.Material>(), geos = new Set<THREE.BufferGeometry>();
  raiz.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) geos.add(m.geometry);
    const mt = (m as { material?: THREE.Material | THREE.Material[] }).material;
    if (mt) (Array.isArray(mt) ? mt : [mt]).forEach((x) => mats.add(x));
  });
  geos.forEach((g) => g.dispose());
  mats.forEach((m) => m.dispose());   // texturas: só as que o builder CRIOU (extras); starTex é da cena
  extras.forEach((t) => t.dispose());
  raiz.removeFromParent();
}

function zaeon(poi: POI, { low, starTex }: { low: boolean; starTex: THREE.Texture }, rotulo: HTMLDivElement): LandmarkHandle {
  const rm = reducedMotion();
  const S = poi.escala ?? 1, m = marcoNav(poi);
  const g = new THREE.Group(); g.position.set(poi.x, poi.altura, poi.z); g.scale.setScalar(S);
  const alvos: THREE.Object3D[] = [];
  const add = <T extends THREE.Object3D>(o: T, pai: THREE.Object3D = g, alvo = false) => { pai.add(o); if (alvo) alvos.push(o); return o; };

  // luzes do protótipo: fogo rasante quente + preenchimento frio (relativas ao group, que está em y=altura)
  const fireLight = add(new THREE.PointLight(0xff8a3c, 1.4, 60)); fireLight.position.set(0, 2, 0);
  const coldLight = low ? null : add(new THREE.PointLight(0x7fe9ff, 1.1, 40)); coldLight?.position.set(0, 6, 0);   // no `low`, só a quente

  // vidro SEMPRE transparente simples (sem o passe de transmissão do three, que re-renderiza a cena a cada quadro)
  const vidro = (p: THREE.MeshPhysicalMaterialParameters, fallbackOpacity: number) =>
    new THREE.MeshStandardMaterial({ color: p.color, emissive: p.emissive, emissiveIntensity: p.emissiveIntensity, roughness: p.roughness, metalness: p.metalness, transparent: true, opacity: fallbackOpacity, side: p.side ?? THREE.FrontSide });

  // --- ilha-base de cristal (octógono invertido) + brilho frio por baixo ---
  const island = add(new THREE.Mesh(new THREE.ConeGeometry(9, 7, 8, 1, false), vidro({ color: 0x0b1a30, emissive: 0x10325e, emissiveIntensity: 0.5, roughness: 0.35, metalness: 0.1, transmission: 0.25, thickness: 1, transparent: true, opacity: 0.96 }, 0.96)), g, true);
  island.position.y = -3.5; island.rotation.y = Math.PI / 8;
  const texUnder = glowTex("rgba(150,230,255,.6)", "rgba(60,120,220,.15)");
  const under = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: texUnder, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
  under.scale.set(26, 26, 1); under.position.y = -7;

  // --- piso interno (frio) ---
  const floorI = add(new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.4, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0x0a2440, emissive: COLD, emissiveIntensity: 0.6, roughness: 0.6, metalness: 0.2, transparent: true, opacity: 0.9 })), g, true);
  floorI.rotation.y = Math.PI / 8;

  // --- muralhas de granizo: 16 blocos INSTANCIADOS num anel r=6.3 (alturas alternadas) ---
  const NW = 16, wallMat = vidro({ color: 0xcfe9ff, emissive: ICE, emissiveIntensity: 0.25, roughness: 0.1, metalness: 0, transmission: 0.9, thickness: 0.8, transparent: true, opacity: 0.6, side: THREE.DoubleSide }, 0.45);
  const blocos = Array.from({ length: NW }, (_, i) => i).filter((i) => !m || muralhaTemBloco(m, i));   // PORTÃO: blocos alinhados à escada saem
  const walls = add(new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 1, 0.7), wallMat, blocos.length), g, true);
  { const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    blocos.forEach((i, k) => { const a = (i / NW) * Math.PI * 2, r = 6.3, h = 2.4 + (i % 2 ? 1 : 0.4); p.set(Math.cos(a) * r, 0.3 + h / 2, Math.sin(a) * r); q.setFromAxisAngle(up, -a); sc.set(1, h, 1); walls.setMatrixAt(k, mx.compose(p, q, sc)); });
    walls.instanceMatrix.needsUpdate = true; walls.computeBoundingSphere(); }
  // arestas vivas das muralhas
  const wallEdge = add(new THREE.Mesh(new THREE.TorusGeometry(6.3, 0.06, 6, low ? 32 : 48), new THREE.MeshBasicMaterial({ color: COLD, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending })));
  wallEdge.rotation.x = Math.PI / 2; wallEdge.position.y = 2.2;

  // --- casa de cristal: 6 pilares INSTANCIADOS + cúpula estelar ---
  const house = add(new THREE.Group()); house.position.y = 0.3;
  const NP = 6, pillars = add(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.26, 4.2, 6), vidro({ color: 0xdff0ff, emissive: ICE, emissiveIntensity: 0.35, roughness: 0.08, metalness: 0, transmission: 0.85, thickness: 0.6, transparent: true, opacity: 0.7 }, 0.6), NP), house, true);
  { const mx = new THREE.Matrix4(); for (let i = 0; i < NP; i++) { const a = (i / NP) * Math.PI * 2, r = 3.4; pillars.setMatrixAt(i, mx.makeTranslation(Math.cos(a) * r, 2.1, Math.sin(a) * r)); } pillars.instanceMatrix.needsUpdate = true; pillars.computeBoundingSphere(); }
  const dome = add(new THREE.Mesh(new THREE.SphereGeometry(3.9, low ? 16 : 24, low ? 10 : 16, 0, Math.PI * 2, 0, Math.PI / 2), vidro({ color: 0x0a1830, emissive: 0x2a4a80, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.3, transmission: 0.4, thickness: 1, transparent: true, opacity: 0.55, side: THREE.DoubleSide }, 0.5)), house, true);
  dome.position.y = 4.2;
  // "caminho das estrelas/relâmpagos" sob a cúpula (mesma fórmula do protótipo)
  { const seg: number[] = []; for (let k = 0; k < 40; k++) { const a = Math.random() * 6.283, ph = Math.random() * Math.PI / 2, r = 3.7; seg.push(Math.cos(a) * Math.cos(ph) * r, 4.2, Math.sin(a) * Math.cos(ph) * r); }
    const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(seg), 3));
    add(new THREE.Points(gg, new THREE.PointsMaterial({ size: 0.14, map: starTex, color: 0xbfe8ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })), house); }

  // --- querubins: pontos de luz orbitando devagar ---
  const CN = low ? 24 : 50, cherub = Array.from({ length: CN }, () => ({ a: Math.random() * 6.283, r: 3 + Math.random() * 3.5, y: 1.5 + Math.random() * 4, sp: 0.1 + Math.random() * 0.25 }));
  const cherubGeo = new THREE.BufferGeometry(); cherubGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(CN * 3), 3));
  const cherubPts = add(new THREE.Points(cherubGeo, new THREE.PointsMaterial({ size: 0.18, map: starTex, color: 0xeaf4ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))); cherubPts.frustumCulled = false;

  // --- línguas de fogo (sprites quentes lambendo as muralhas) — textura ÚNICA, material por chama (fase própria) ---
  const texFogo = glowTex("rgba(255,225,170,.95)", "rgba(255,120,40,.3)");
  const NF = 18, noPortao = (a: number) => { if (!m) return false; let d = a - m.nav.escada.dir; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d) < m.nav.portaoMeia + 0.15; };
  const fires = Array.from({ length: NF }, (_, i) => (i / NF) * Math.PI * 2).filter((a) => !noPortao(a)).map((a) => {
    const r = 6.7;
    const s = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: texFogo, color: FIRE[Math.round(a * 10) % 3]!, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    s.position.set(Math.cos(a) * r, 1.6, Math.sin(a) * r); s.scale.set(2.2, 3.2, 1);
    return { s, ph: Math.random() * 6.283, bx: 2.2, by: 3.2 };
  });
  void FIRE;
  const ember = add(new THREE.Mesh(new THREE.TorusGeometry(6.7, 0.12, 8, low ? 40 : 64), new THREE.MeshBasicMaterial({ color: 0xff7a2c, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending })));
  ember.rotation.x = Math.PI / 2; ember.position.y = 0.4;

  // --- plataforma do TOPO (parentada → flutua junto; o fundador pode subir/pousar a nave na cúpula) ---
  const topo = add(new THREE.Group()); topo.position.y = poi.topo?.y ?? 6.6;
  add(new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.25, low ? 20 : 32), new THREE.MeshStandardMaterial({ color: 0x10213e, emissive: 0x2b6bd0, emissiveIntensity: 0.6, roughness: 0.4, metalness: 0.3 })), topo, true);
  const platRing = add(new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.05, 8, 48), new THREE.MeshBasicMaterial({ color: 0x5fd0ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending })), topo);
  platRing.rotation.x = Math.PI / 2; platRing.position.y = 0.13;
  // (a base do dono saiu daqui: agora fica na Zaeon, a ilha no céu; a do Andrei fica no centro do salão)

  // --- feixe: neurônios subindo da casa até o topo ---
  const topoY = topo.position.y;
  // o feixe nasce ACIMA da mesa do Andrei (centro do salão) e sobe até o topo
  const BY0 = 2.2, BN = low ? 30 : 60, beam = Array.from({ length: BN }, () => ({ a: Math.random() * 6.283, r: 0.2 + Math.random() * 1.2, y: BY0 + Math.random() * (topoY - BY0), sp: 0.4 + Math.random() * 1.2, dr: Math.random() < 0.5 ? 1 : -1 }));
  const beamGeo = new THREE.BufferGeometry(); beamGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(BN * 3), 3));
  const beamPts = add(new THREE.Points(beamGeo, new THREE.PointsMaterial({ size: 0.12, map: starTex, color: 0x8fe8ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))); beamPts.frustumCulled = false;

  // --- ESCADARIA de cristal flutuante: da borda da ilha até o chão da praça (lib/cyber/nav dá a altura) ---
  const degraus: THREE.InstancedMesh | null = (() => {
    if (!m) return null;
    const { pisoY, bordaR, escada } = m.nav, N = Math.max(8, Math.ceil(pisoY / 0.5)), run = escada.comprimento / N;
    const mat = vidro({ color: 0xcfe9ff, emissive: COLD, emissiveIntensity: 0.35, roughness: 0.12, metalness: 0, transmission: 0.7, thickness: 0.5, transparent: true, opacity: 0.8 }, 0.75);
    // coordenadas de MUNDO → locais do group (escala S, centro em (poi.x, altura, poi.z), sem giro)
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, N);
    const mx = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -escada.dir), sc = new THREE.Vector3(), p = new THREE.Vector3();
    const ax = Math.cos(escada.dir), az = Math.sin(escada.dir);
    for (let i = 0; i < N; i++) {
      const along = bordaR + (i + 0.5) * run, topoDegrau = pisoY * (1 - i / N);
      p.set((along * ax) / S, (topoDegrau - 0.15 - poi.altura) / S, (along * az) / S);
      sc.set((run * 1.04) / S, 0.3 / S, escada.largura / S);
      im.setMatrixAt(i, mx.compose(p, q, sc));
    }
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
    add(im, g, true);
    // corrimãos de luz fria nas bordas
    const lin: number[] = [];
    for (const lado of [-1, 1]) {
      const lx = -az * lado * (escada.largura / 2), lz = ax * lado * (escada.largura / 2);
      lin.push((bordaR * ax + lx) / S, (pisoY + 0.6 - poi.altura) / S, (bordaR * az + lz) / S, ((bordaR + escada.comprimento) * ax + lx) / S, (0.6 - poi.altura) / S, ((bordaR + escada.comprimento) * az + lz) / S);
    }
    const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(lin), 3));
    add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: COLD, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending })));
    return im;
  })();

  // reduced-motion: fogo quase estático, flutuação mínima
  const fogoAmp = rm ? 0.12 : 1, boiaAmp = rm ? 0.15 : 1;

  return {
    poi, group: g, rotulo, alvos, topo, monitorTopo: null, escada: degraus,
    donoPresente() { /* sem estátua: a base do dono fica na Zaeon (céu) */ },
    atualizar(dt, t) {
      // flutuação lenta + giro lento
      // andável: flutuação SUTIL e sem giro global (portão e escada ficam alinhados)
      g.position.y = poi.altura + Math.sin(t * 0.5) * (m ? 0.15 : 0.4) * boiaAmp;
      if (!m) g.rotation.y += dt * 0.03 * boiaAmp;
      // fogo: cintilar LENTO e contínuo — nunca estrobo
      for (const f of fires) {
        const p = 0.72 + 0.28 * Math.sin(t * 1.8 + f.ph) * fogoAmp;
        f.s.scale.set(f.bx * (0.9 + p * 0.25), f.by * (0.8 + p * 0.4), 1);
        (f.s.material as THREE.SpriteMaterial).opacity = 0.55 + 0.3 * p;
      }
      fireLight.intensity = 1.2 + 0.3 * Math.sin(t * 1.6) * fogoAmp;
      (ember.material as THREE.MeshBasicMaterial).opacity = 0.5 + 0.15 * Math.sin(t * 1.4) * fogoAmp;
      // querubins orbitando
      { const a = cherubGeo.attributes.position!.array as Float32Array;
        cherub.forEach((c, i) => { c.a += dt * c.sp * boiaAmp; a[i * 3] = Math.cos(c.a) * c.r; a[i * 3 + 1] = c.y + Math.sin(t * 0.6 + i) * 0.15; a[i * 3 + 2] = Math.sin(c.a) * c.r; });
        cherubGeo.attributes.position!.needsUpdate = true; }
      // neurônios subindo no feixe do topo
      { const a = beamGeo.attributes.position!.array as Float32Array;
        for (let i = 0; i < BN; i++) { const d = beam[i]!; d.y += d.sp * dt; if (d.y > topoY) { d.y = BY0; d.a = Math.random() * 6.283; } const rr = d.r * (0.4 + d.y * 0.09), ang = d.a + d.y * d.dr * 0.4; a[i * 3] = Math.cos(ang) * rr; a[i * 3 + 1] = d.y; a[i * 3 + 2] = Math.sin(ang) * rr; }
        beamGeo.attributes.position!.needsUpdate = true; }
      void coldLight;
    },
    dispose() { rotulo.remove(); liberar(g, [texUnder, texFogo]); },
  };
}

/**
 * Heliporto: disco plano no chão (andável) com anel de luz e um "H" estilizado — pouso da nave perto da praça.
 * O anel "respira" devagar (sem piscar); com prefers-reduced-motion fica parado.
 */
function heliporto(poi: POI, { low }: { low: boolean; starTex: THREE.Texture }, rotulo: HTMLDivElement): LandmarkHandle {
  const g = new THREE.Group(); g.position.set(poi.x, 0, poi.z);
  const r = poi.footprintR, seg = low ? 32 : 64, parado = reducedMotion();
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.15, 0.12, seg), new THREE.MeshStandardMaterial({ color: 0x0c1a33, emissive: 0x16305c, emissiveIntensity: 0.5, roughness: 0.7, metalness: 0.3 }));
  disco.position.y = 0.06; g.add(disco);
  const marca = new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.85 });
  for (const [w, d, x] of [[0.5, 3.4, -1], [0.5, 3.4, 1], [2.0, 0.5, 0]] as const) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), marca); b.position.set(x, 0.14, 0); g.add(b); }
  const anelMat = new THREE.MeshBasicMaterial({ color: 0x5fd0ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
  const anel = new THREE.Mesh(new THREE.TorusGeometry(r - 0.4, 0.07, 8, seg), anelMat); anel.rotation.x = Math.PI / 2; anel.position.y = 0.15; g.add(anel);
  const luzes: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, l = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), marca); l.position.set(Math.cos(a) * (r - 0.4), 0.2, Math.sin(a) * (r - 0.4)); g.add(l); luzes.push(l); }
  return {
    poi, group: g, rotulo, alvos: [disco], topo: null, monitorTopo: null, escada: null,
    donoPresente() { /* sem topo */ },
    atualizar(_dt, t) { if (!parado) anelMat.opacity = 0.45 + 0.2 * Math.sin(t * 1.2); },
    dispose() { rotulo.remove(); liberar(g); },
  };
}

/** Preset genérico: obelisco de cristal flutuante com halo — prova que um novo POI é só uma entrada no registro. */
function generico(poi: POI, { low }: { low: boolean; starTex: THREE.Texture }, rotulo: HTMLDivElement): LandmarkHandle {
  const g = new THREE.Group(); g.position.set(poi.x, poi.altura, poi.z);
  const corpo = new THREE.Mesh(new THREE.OctahedronGeometry(Math.max(1.5, poi.footprintR * 0.6), low ? 0 : 1), new THREE.MeshStandardMaterial({ color: 0x0b1a30, emissive: 0x2a4a80, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.2, transparent: true, opacity: 0.9 }));
  corpo.scale.y = 1.8; g.add(corpo);
  const tex = glowTex("rgba(150,230,255,.5)", "rgba(60,120,220,.12)");
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.set(poi.footprintR * 3, poi.footprintR * 3, 1); halo.position.y = -poi.altura * 0.6; g.add(halo);
  return {
    poi, group: g, rotulo, alvos: [corpo], topo: null, monitorTopo: null, escada: null,
    donoPresente() { /* sem topo */ },
    atualizar(dt, t) { g.position.y = poi.altura + Math.sin(t * 0.5) * 0.3; corpo.rotation.y += dt * 0.1; },
    dispose() { rotulo.remove(); liberar(g, [tex]); },
  };
}
