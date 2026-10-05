/**
 * Cidade — a ZAEON, a ilha no céu (a base do dono), acima do buraco negro. Mesmo idioma da Zaeon do chão (cristal, gelo,
 * granizo, fogo contido, querubins, contraste frio×quente), maior e mais rica, no conceito das cidades flutuantes:
 *  - ilha monumental de cristal (montanha INVERTIDA: larga em cima, ápice embaixo) com estalactites e quedas de luz;
 *  - ilhotas flutuantes em volta, com aglomerados de cristal;
 *  - muralhas de granizo + 4 torres com pontas luminosas; línguas de fogo na borda (cintilar lento, sem estrobo);
 *  - CIDADELA (cúpula estelar) = BIBLIOTECA: anel de estantes com livros de luz e monitores verticais (clicar = estudar)
 *    rodeando a sala, + mesa com um globo de luz no centro;
 *  - hangar da nave; portal de volta (mini disco de acreção); farol no topo;
 *  - no CHÃO, embaixo do buraco negro: o anel de entrada (o portal).
 * Layout em lib/cyber/ceu.ts (o mesmo que a colisão usa). `low` reduz partículas/segmentos/ilhotas;
 * `prefers-reduced-motion` deixa fogo/vórtices quase parados. dispose() completo.
 */
import * as THREE from "three";
import { CIDADE, bibliotecaLocais } from "@/lib/cyber/ceu";
import { glowTex } from "./CenaCosmica";
import { liberar } from "./Landmark";

export type CidadeHandle = {
  group: THREE.Group;
  /** sub-grupo da ilha (em y = pisoY) — o engine soma a flutuação dele a quem está lá em cima */
  ilha: THREE.Group;
  rotulo: HTMLDivElement;
  /** superfícies sólidas (raycast do clique/câmera) */
  alvos: THREE.Object3D[];
  /** telas dos MONITORES da biblioteca (InstancedMesh; instanceId = índice em computadoresLocais) — clicar = estudar */
  computadores: THREE.InstancedMesh;
  /** alvos do portal de entrada (anel no chão) */
  portalChao: THREE.Object3D;
  atualizar(dt: number, t: number): void;
  dispose(): void;
};

const COLD = 0xbfe8ff, ICE = 0x9fd0ff, FIRE = [0xffe3b0, 0xffb45a, 0xff7a2c];
const ROTULO_CSS = "position:absolute;transform:translate(-50%,-100%);font:800 13px system-ui,sans-serif;letter-spacing:.08em;padding:4px 12px;border-radius:999px;color:#ffe9c2;background:rgba(18,10,8,.65);border:1px solid rgba(255,190,120,.5);box-shadow:0 0 18px rgba(255,160,80,.35);white-space:nowrap;pointer-events:none;display:none;";

export function criarCidade(opts: { low: boolean; starTex: THREE.Texture }): CidadeHandle {
  const { low, starTex } = opts;
  const rm = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const raiz = new THREE.Group();
  const ilha = new THREE.Group(); ilha.position.set(CIDADE.centro.x, CIDADE.pisoY, CIDADE.centro.z); raiz.add(ilha);
  const alvos: THREE.Object3D[] = [];
  const add = <T extends THREE.Object3D>(o: T, pai: THREE.Object3D = ilha, alvo = false) => { pai.add(o); if (alvo) alvos.push(o); return o; };
  // vidro SEMPRE transparente simples: o `transmission` do MeshPhysicalMaterial obriga o three a renderizar a cena
  // inteira de novo num alvo extra a cada quadro — era o maior custo de FPS da cena
  const vidro = (p: THREE.MeshPhysicalMaterialParameters, op: number) =>
    new THREE.MeshStandardMaterial({ color: p.color, emissive: p.emissive, emissiveIntensity: p.emissiveIntensity, roughness: p.roughness, metalness: p.metalness, transparent: true, opacity: op, side: p.side ?? THREE.FrontSide });
  const texturas: THREE.Texture[] = [];
  const glow = (a: string, b: string) => { const t = glowTex(a, b); texturas.push(t); return t; };
  const R = CIDADE.bordaR, H = CIDADE.ilhaAltura;

  // luzes: preenchimento frio no interior + fogo rasante quente
  const fria = add(new THREE.PointLight(0x7fe9ff, 2.2, 120)); fria.position.set(0, 18, 0);
  const quente = low ? null : add(new THREE.PointLight(0xff8a3c, 1.6, 110)); quente?.position.set(0, 6, 0);   // no `low`, só a fria

  // ── ilha monumental (montanha invertida) + camada de rocha + estalactites ──
  const rocha = vidro({ color: 0x0b1a30, emissive: 0x10325e, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.1, transmission: 0.2, thickness: 2, transparent: true, opacity: 0.97 }, 0.97);
  const cone = add(new THREE.Mesh(new THREE.ConeGeometry(R, H, low ? 10 : 14, 1, false), rocha), ilha, true);
  cone.rotation.x = Math.PI; cone.position.y = -H / 2 - 0.65;   // o topo do cone fica sob o piso (sem z-fighting)
  const cone2 = add(new THREE.Mesh(new THREE.ConeGeometry(R * 0.72, H * 0.7, low ? 8 : 12, 1, false), rocha), ilha, true);
  cone2.rotation.x = Math.PI; cone2.position.set(R * 0.18, -H * 0.42, -R * 0.12); cone2.rotation.y = 0.7;
  const NE = low ? 28 : 60, estal = add(new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 6), vidro({ color: 0xcfe9ff, emissive: ICE, emissiveIntensity: 0.4, roughness: 0.1, metalness: 0, transmission: 0.8, thickness: 0.5, transparent: true, opacity: 0.75 }, 0.7), NE));
  { const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI), s = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i < NE; i++) { const a = Math.random() * 6.283, r = 4 + Math.random() * (R - 8), yS = -H * (1 - r / R); const len = 3 + Math.random() * 9, w = 0.5 + Math.random() * 1.4; p.set(Math.cos(a) * r, yS - len / 2 + 0.5, Math.sin(a) * r); s.set(w, len, w); estal.setMatrixAt(i, m.compose(p, q, s)); }
    estal.instanceMatrix.needsUpdate = true; estal.computeBoundingSphere(); }
  const sob = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: glow("rgba(150,230,255,.55)", "rgba(60,120,220,.12)"), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
  sob.scale.set(130, 130, 1); sob.position.y = -H - 4;

  // ── quedas de luz escorrendo pelas bordas ──
  const NQ = low ? 4 : 6, PQ = low ? 16 : 24;
  const quedas = Array.from({ length: NQ * PQ }, (_, i) => ({ a: (Math.floor(i / PQ) / NQ) * Math.PI * 2 + 0.2, y: -Math.random() * 70, sp: 6 + Math.random() * 8, j: (Math.random() - 0.5) * 1.2 }));
  const qGeo = new THREE.BufferGeometry(); qGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(quedas.length * 3), 3));
  const qPts = add(new THREE.Points(qGeo, new THREE.PointsMaterial({ size: 0.5, map: starTex, color: 0x9fe8ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }))); qPts.frustumCulled = false;

  // ── piso: disco frio + anéis concêntricos + raios (a "rosa dos ventos" da cidade) ──
  add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.6, low ? 32 : 64), new THREE.MeshStandardMaterial({ color: 0x0a2440, emissive: COLD, emissiveIntensity: 0.35, roughness: 0.55, metalness: 0.25 })), ilha, true).position.y = -0.3;
  for (const r of [12, 20, 28, 34]) { const anel = add(new THREE.Mesh(new THREE.RingGeometry(r - 0.08, r + 0.08, 96), new THREE.MeshBasicMaterial({ color: COLD, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }))); anel.rotation.x = -Math.PI / 2; anel.position.y = 0.02; }
  { const lin: number[] = []; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; lin.push(Math.cos(a) * 16, 0.03, Math.sin(a) * 16, Math.cos(a) * 34, 0.03, Math.sin(a) * 34); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(lin), 3)); add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: COLD, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending }))); }

  // ── muralhas de granizo (instanciadas) + 4 torres ──
  const NW = low ? 32 : 44, mur = add(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), vidro({ color: 0xcfe9ff, emissive: ICE, emissiveIntensity: 0.25, roughness: 0.1, metalness: 0, transmission: 0.9, thickness: 0.8, transparent: true, opacity: 0.6, side: THREE.DoubleSide }, 0.45), NW), ilha, true);
  { const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < NW; i++) { const a = (i / NW) * Math.PI * 2, h = 3.5 + (i % 3) * 1.4; p.set(Math.cos(a) * CIDADE.muralhaR, h / 2, Math.sin(a) * CIDADE.muralhaR); q.setFromAxisAngle(up, -a); s.set(3.2, h, 1.1); mur.setMatrixAt(i, m.compose(p, q, s)); }
    mur.instanceMatrix.needsUpdate = true; mur.computeBoundingSphere(); }
  const torreMat = vidro({ color: 0xdff0ff, emissive: ICE, emissiveIntensity: 0.4, roughness: 0.08, metalness: 0, transmission: 0.85, thickness: 0.8, transparent: true, opacity: 0.75 }, 0.7);
  const pontas: THREE.Mesh[] = [];
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k / 4) * Math.PI * 2, x = Math.cos(a) * CIDADE.muralhaR, z = Math.sin(a) * CIDADE.muralhaR;
    const torre = add(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.1, 16, 8), torreMat), ilha, true); torre.position.set(x, 8, z);
    const ponta = add(new THREE.Mesh(new THREE.OctahedronGeometry(1.4), new THREE.MeshStandardMaterial({ color: 0x0a1626, emissive: 0x9fe8ff, emissiveIntensity: 1.6, roughness: 0.2, flatShading: true })));
    ponta.scale.y = 1.8; ponta.position.set(x, 18, z); pontas.push(ponta);
  }

  // ── línguas de fogo na borda + anel de brasa (sem estrobo) ──
  const texFogo = glow("rgba(255,225,170,.95)", "rgba(255,120,40,.3)");
  const NF = low ? 16 : 24, fogos = Array.from({ length: NF }, (_, i) => {
    const a = (i / NF) * Math.PI * 2, s = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: texFogo, color: FIRE[i % 3]!, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    s.position.set(Math.cos(a) * (R - 0.8), 2.4, Math.sin(a) * (R - 0.8)); s.scale.set(3.4, 5, 1); return { s, ph: Math.random() * 6.283 };
  });
  const brasa = add(new THREE.Mesh(new THREE.TorusGeometry(R - 0.8, 0.2, 8, low ? 64 : 120), new THREE.MeshBasicMaterial({ color: 0xff7a2c, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending })));
  brasa.rotation.x = Math.PI / 2; brasa.position.y = 0.4;

  // ── CIDADELA = SALA DE COMPUTADORES: pilares + cúpula estelar + relâmpagos + farol ──
  const { cidadela } = CIDADE;
  const pil = add(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.55, 0.7, 12, 8), torreMat, cidadela.pilares), ilha, true);
  { const m = new THREE.Matrix4(); for (let i = 0; i < cidadela.pilares; i++) { const a = (i / cidadela.pilares) * Math.PI * 2; pil.setMatrixAt(i, m.makeTranslation(Math.cos(a) * cidadela.r, 6, Math.sin(a) * cidadela.r)); } pil.instanceMatrix.needsUpdate = true; pil.computeBoundingSphere(); }
  const cupula = add(new THREE.Mesh(new THREE.SphereGeometry(cidadela.r + 1, low ? 20 : 36, low ? 12 : 20, 0, Math.PI * 2, 0, Math.PI / 2), vidro({ color: 0x0a1830, emissive: 0x2a4a80, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.3, transmission: 0.4, thickness: 1, transparent: true, opacity: 0.45, side: THREE.DoubleSide }, 0.4)));
  cupula.position.y = 11;
  { const N = low ? 40 : 80, pv = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const a = Math.random() * 6.283, ph = Math.random() * Math.PI / 2, r = cidadela.r + 0.6; pv[i * 3] = Math.cos(a) * Math.cos(ph) * r; pv[i * 3 + 1] = 11 + Math.sin(ph) * r; pv[i * 3 + 2] = Math.sin(a) * Math.cos(ph) * r; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pv, 3)); add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.3, map: starTex, color: 0xbfe8ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))); }
  { const lin: number[] = []; for (let k = 0; k < 14; k++) { let a = Math.random() * 6.283, ph = 0.2; let px = Math.cos(a) * Math.cos(ph) * cidadela.r, py = 11 + Math.sin(ph) * cidadela.r, pz = Math.sin(a) * Math.cos(ph) * cidadela.r;
      for (let s = 0; s < 5; s++) { a += (Math.random() - 0.5) * 0.5; ph = Math.min(1.4, ph + 0.25); const nx = Math.cos(a) * Math.cos(ph) * cidadela.r, ny = 11 + Math.sin(ph) * cidadela.r, nz = Math.sin(a) * Math.cos(ph) * cidadela.r; lin.push(px, py, pz, nx, ny, nz); px = nx; py = ny; pz = nz; } }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(lin), 3)); add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending }))); }
  const farolMat = new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const feixe = add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 2.2, 60, 16, 1, true), farolMat)); feixe.position.y = 26 + 30;
  const farol = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: glow("rgba(220,250,255,1)", "rgba(120,200,255,.4)"), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))); farol.scale.set(9, 9, 1); farol.position.y = 27;

  // BIBLIOTECA rodeando a sala: estantes com livros de luz e, intercalados, MONITORES verticais (clicáveis = estudar)
  const mods = bibliotecaLocais(), estantes = mods.filter((m) => m.tipo === "estante"), monitores = mods.filter((m) => m.tipo === "monitor");
  const { largura } = CIDADE.biblioteca, ALT = 3.4;
  const matMovel = new THREE.MeshStandardMaterial({ color: 0x16203c, roughness: 0.45, metalness: 0.35, emissive: 0x16264f, emissiveIntensity: 0.45 });
  const mx = new THREE.Matrix4(), mq = new THREE.Quaternion(), ms = new THREE.Vector3(1, 1, 1), mp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  /** ponto local (lx, ly, lz) de um módulo → posição na ilha */
  const noModulo = (m: { x: number; z: number; rot: number }, lx: number, ly: number, lz: number) => { const c = Math.cos(m.rot), si = Math.sin(m.rot); return mp.set(m.x + lx * c + lz * si, ly, m.z - lx * si + lz * c); };
  // estantes: fundo + laterais + prateleiras (instanciados)
  const fundo = add(new THREE.InstancedMesh(new THREE.BoxGeometry(largura, ALT, 0.12), matMovel, estantes.length), ilha, true);
  const lado = add(new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, ALT, 0.55), matMovel, estantes.length * 2), ilha, true);
  const PRAT = [0.15, 0.95, 1.75, 2.55, 3.35];
  const prat = add(new THREE.InstancedMesh(new THREE.BoxGeometry(largura - 0.1, 0.06, 0.5), matMovel, estantes.length * PRAT.length), ilha, true);
  const LPP = low ? 8 : 13;   // livros por prateleira
  const livros = add(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), estantes.length * (PRAT.length - 1) * LPP));
  const CORES_LIVRO = [0x66e6ff, 0xb98cff, 0x9affd0, 0xffd36b, 0x7fb4ff, 0xff9ad5].map((h) => new THREE.Color(h).multiplyScalar(0.75));
  { let iL = 0;
    estantes.forEach((m, i) => {
      mq.setFromAxisAngle(up, m.rot);
      fundo.setMatrixAt(i, mx.compose(noModulo(m, 0, ALT / 2, -0.22), mq, ms));
      lado.setMatrixAt(i * 2, mx.compose(noModulo(m, -largura / 2, ALT / 2, 0), mq, ms)); lado.setMatrixAt(i * 2 + 1, mx.compose(noModulo(m, largura / 2, ALT / 2, 0), mq, ms));
      PRAT.forEach((y, k) => prat.setMatrixAt(i * PRAT.length + k, mx.compose(noModulo(m, 0, y, 0), mq, ms)));
      for (let k = 0; k < PRAT.length - 1; k++) {
        let x = -largura / 2 + 0.18;
        for (let j = 0; j < LPP; j++) {
          const w = 0.12 + Math.random() * 0.1, h = 0.48 + Math.random() * 0.22, inclina = j === LPP - 1 ? 0.25 : 0;
          const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), inclina).premultiply(mq);
          livros.setMatrixAt(iL, mx.compose(noModulo(m, x + w / 2, PRAT[k]! + 0.03 + h / 2, 0.02), q2, new THREE.Vector3(w, h, 0.34)));
          livros.setColorAt(iL, CORES_LIVRO[(i * 7 + k * 3 + j) % CORES_LIVRO.length]!); iL++;
          x += w + 0.015; if (x > largura / 2 - 0.3) break;
        }
      }
    });
    livros.count = iL;
    for (const im of [fundo, lado, prat, livros]) { im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); }
    if (livros.instanceColor) livros.instanceColor.needsUpdate = true; }
  // monitores verticais: moldura + tela com "página" de luz (a tela é o mesh clicável)
  const pagina = (() => { const c = document.createElement("canvas"); c.width = 128; c.height = 256; const g = c.getContext("2d")!;
    g.fillStyle = "#06223a"; g.fillRect(0, 0, 128, 256); g.fillStyle = "#66e6ff"; g.fillRect(10, 12, 108, 8);
    g.fillStyle = "rgba(143,232,255,.75)"; for (let i = 0; i < 16; i++) g.fillRect(12, 34 + i * 13, 50 + ((i * 37) % 54), 5);
    g.strokeStyle = "#9fe8ff"; g.lineWidth = 3; g.strokeRect(2, 2, 124, 252);
    const t = new THREE.CanvasTexture(c); texturas.push(t); return t; })();
  const molduraMon = add(new THREE.InstancedMesh(new THREE.BoxGeometry(1.95, 3.1, 0.22), matMovel, monitores.length), ilha, true);
  const telas = add(new THREE.InstancedMesh(new THREE.PlaneGeometry(1.65, 2.75), new THREE.MeshBasicMaterial({ map: pagina, transparent: true, opacity: 0.92, side: THREE.DoubleSide }), monitores.length), ilha, true);
  const brilhoMon = add(new THREE.InstancedMesh(new THREE.PlaneGeometry(2.3, 3.4), new THREE.MeshBasicMaterial({ color: 0x66e6ff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), monitores.length));
  monitores.forEach((m, i) => {
    mq.setFromAxisAngle(up, m.rot);
    molduraMon.setMatrixAt(i, mx.compose(noModulo(m, 0, 1.75, -0.1), mq, ms));
    telas.setMatrixAt(i, mx.compose(noModulo(m, 0, 1.75, 0.02), mq, ms));
    brilhoMon.setMatrixAt(i, mx.compose(noModulo(m, 0, 1.75, -0.13), mq, ms));
  });
  for (const im of [molduraMon, telas, brilhoMon]) { im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); }
  add(new THREE.Mesh(new THREE.CylinderGeometry(CIDADE.mesaHolo.r, CIDADE.mesaHolo.r * 1.1, 1, 24), new THREE.MeshStandardMaterial({ color: 0x10213e, emissive: 0x2b6bd0, emissiveIntensity: 0.6, roughness: 0.4, metalness: 0.3 })), ilha, true).position.y = 0.5;
  const NG = low ? 160 : 280, gp = new Float32Array(NG * 3);
  for (let i = 0; i < NG; i++) { const u = Math.random() * 2 - 1, th = Math.random() * 6.283, r = 1.6, s = Math.sqrt(1 - u * u); gp[i * 3] = s * Math.cos(th) * r; gp[i * 3 + 1] = 3 + u * r; gp[i * 3 + 2] = s * Math.sin(th) * r; }
  const gGeo = new THREE.BufferGeometry(); gGeo.setAttribute("position", new THREE.BufferAttribute(gp, 3));
  const globo = add(new THREE.Points(gGeo, new THREE.PointsMaterial({ size: 0.09, map: starTex, color: 0x8fe8ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));

  // ── hangar da nave ──
  const hg = CIDADE.hangar;
  add(new THREE.Mesh(new THREE.CylinderGeometry(hg.r, hg.r + 0.3, 0.3, 40), new THREE.MeshStandardMaterial({ color: 0x10213e, emissive: 0x2b6bd0, emissiveIntensity: 0.45, roughness: 0.4, metalness: 0.4 })), ilha, true).position.set(hg.x, 0.15, hg.z);
  const hgAnel = add(new THREE.Mesh(new THREE.RingGeometry(hg.r - 0.4, hg.r - 0.2, 64), new THREE.MeshBasicMaterial({ color: 0x5fd0ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })));
  hgAnel.rotation.x = -Math.PI / 2; hgAnel.position.set(hg.x, 0.32, hg.z);

  // ── portal de volta (mini disco de acreção, gira devagar) ──
  const pv = CIDADE.portalVolta;
  const portal = add(new THREE.Group()); portal.position.set(pv.x, 0, pv.z);
  add(new THREE.Mesh(new THREE.CylinderGeometry(pv.r + 0.6, pv.r + 0.8, 0.25, 32), new THREE.MeshStandardMaterial({ color: 0x14203a, emissive: 0x1b2b55, emissiveIntensity: 0.5 })), portal, true);
  const aro = add(new THREE.Mesh(new THREE.TorusGeometry(pv.r, 0.18, 10, 64), new THREE.MeshBasicMaterial({ color: 0xffb45a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })), portal);
  aro.position.y = pv.r + 0.3;
  const vort = add(new THREE.Mesh(new THREE.CircleGeometry(pv.r - 0.1, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.85, side: THREE.DoubleSide })), portal);
  vort.position.y = pv.r + 0.3;
  const discoP = add(new THREE.Mesh(new THREE.RingGeometry(pv.r, pv.r + 1.2, 64), new THREE.MeshBasicMaterial({ color: 0xff7a2c, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })), portal);
  discoP.position.y = pv.r + 0.3; discoP.rotation.x = 0.35;

  // ── querubins orbitando a cidadela ──
  const CN = low ? 40 : 90, cher = Array.from({ length: CN }, () => ({ a: Math.random() * 6.283, r: 16 + Math.random() * 16, y: 3 + Math.random() * 14, sp: 0.05 + Math.random() * 0.15 }));
  const cGeo = new THREE.BufferGeometry(); cGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(CN * 3), 3));
  const cPts = add(new THREE.Points(cGeo, new THREE.PointsMaterial({ size: 0.3, map: starTex, color: 0xeaf4ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))); cPts.frustumCulled = false;

  // ── ilhotas flutuantes em volta (montanhas invertidas + cristais), cada uma com sua flutuação ──
  const ilhotas: { g: THREE.Group; y0: number; ph: number }[] = [];
  const NI = low ? 4 : 7;
  const cristalMat = new THREE.MeshStandardMaterial({ color: 0x0a1626, emissive: 0x66e6ff, emissiveIntensity: 1.1, roughness: 0.2, flatShading: true, transparent: true, opacity: 0.9 });
  for (let k = 0; k < NI; k++) {
    const a = (k / NI) * Math.PI * 2 + 0.4, dist = 58 + (k % 3) * 9, rr = 5 + (k % 4) * 2, y0 = CIDADE.pisoY + ((k % 3) - 1) * 12;
    const g = new THREE.Group(); g.position.set(CIDADE.centro.x + Math.cos(a) * dist, y0, CIDADE.centro.z + Math.sin(a) * dist); raiz.add(g);
    const c = new THREE.Mesh(new THREE.ConeGeometry(rr, rr * 1.9, 8), rocha); c.rotation.x = Math.PI; c.position.y = -rr * 0.95; g.add(c);
    const topo = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x0a2440, emissive: COLD, emissiveIntensity: 0.3 })); g.add(topo);
    for (let j = 0; j < 5; j++) { const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.4 + Math.random() * 0.6), cristalMat); cr.scale.y = 2 + Math.random() * 1.5; const aa = Math.random() * 6.283, d = Math.random() * rr * 0.7; cr.position.set(Math.cos(aa) * d, 1 + Math.random(), Math.sin(aa) * d); g.add(cr); }
    ilhotas.push({ g, y0, ph: Math.random() * 6.283 });
  }

  // ── PORTAL DE ENTRADA no chão, embaixo do buraco negro ──
  const pe = CIDADE.portalEntrada;
  const portalChao = new THREE.Group(); portalChao.position.set(pe.x, 0.05, pe.z); raiz.add(portalChao);
  const peAnel = new THREE.Mesh(new THREE.RingGeometry(pe.r - 0.6, pe.r, 96), new THREE.MeshBasicMaterial({ color: 0xffb45a, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
  peAnel.rotation.x = -Math.PI / 2; portalChao.add(peAnel);
  const peDisco = new THREE.Mesh(new THREE.CircleGeometry(pe.r - 0.6, 64), new THREE.MeshBasicMaterial({ color: 0x05030a, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  peDisco.rotation.x = -Math.PI / 2; peDisco.position.y = 0.01; portalChao.add(peDisco); alvos.push(peDisco);
  const NS = low ? 50 : 90, sw = Array.from({ length: NS }, () => ({ a: Math.random() * 6.283, r: Math.random() * (pe.r - 0.8), y: Math.random() * 12 }));
  const swGeo = new THREE.BufferGeometry(); swGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(NS * 3), 3));
  const swPts = new THREE.Points(swGeo, new THREE.PointsMaterial({ size: 0.35, map: starTex, color: 0xffd9a8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); swPts.frustumCulled = false; portalChao.add(swPts);

  const rotulo = document.createElement("div"); rotulo.style.cssText = ROTULO_CSS; rotulo.textContent = "Zaeon";
  const fogoAmp = rm ? 0.12 : 1, vel = rm ? 0.2 : 1;

  return {
    group: raiz, ilha, rotulo, alvos, computadores: telas, portalChao: peDisco,
    atualizar(dt, t) {
      ilha.position.y = CIDADE.pisoY + Math.sin(t * 0.3) * 0.25 * vel;
      for (const f of fogos) { const p = 0.72 + 0.28 * Math.sin(t * 1.8 + f.ph) * fogoAmp; f.s.scale.set(3.4 * (0.9 + p * 0.25), 5 * (0.8 + p * 0.4), 1); (f.s.material as THREE.SpriteMaterial).opacity = 0.5 + 0.3 * p; }
      if (quente) quente.intensity = 1.4 + 0.3 * Math.sin(t * 1.6) * fogoAmp;
      (brasa.material as THREE.MeshBasicMaterial).opacity = 0.5 + 0.15 * Math.sin(t * 1.4) * fogoAmp;
      pontas.forEach((p, i) => { (p.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.3 + 0.4 * Math.sin(t * 1.2 + i); p.rotation.y += dt * 0.4 * vel; });
      farol.material.opacity = 0.75 + 0.2 * Math.sin(t * 1.1);
      globo.rotation.y += dt * 0.25 * vel;
      aro.rotation.z += dt * 0.3 * vel; discoP.rotation.z += dt * 0.5 * vel;
      // quedas de luz
      { const a = qGeo.attributes.position!.array as Float32Array;
        quedas.forEach((q, i) => { q.y -= q.sp * dt * vel; if (q.y < -70) q.y = 0; const r = R - 0.5 + Math.min(4, -q.y * 0.05); a[i * 3] = Math.cos(q.a) * r + q.j; a[i * 3 + 1] = q.y; a[i * 3 + 2] = Math.sin(q.a) * r; });
        qGeo.attributes.position!.needsUpdate = true; }
      // querubins
      { const a = cGeo.attributes.position!.array as Float32Array;
        cher.forEach((c, i) => { c.a += dt * c.sp * vel; a[i * 3] = Math.cos(c.a) * c.r; a[i * 3 + 1] = c.y + Math.sin(t * 0.5 + i) * 0.3; a[i * 3 + 2] = Math.sin(c.a) * c.r; });
        cGeo.attributes.position!.needsUpdate = true; }
      // vórtice do portal de entrada (sobe em espiral, devagar)
      { const a = swGeo.attributes.position!.array as Float32Array;
        sw.forEach((s, i) => { s.y += dt * 1.6 * vel; s.a += dt * 0.6 * vel; if (s.y > 14) { s.y = 0; s.r = Math.random() * (pe.r - 0.8); } const r = s.r * (1 - s.y / 18); a[i * 3] = Math.cos(s.a) * r; a[i * 3 + 1] = s.y; a[i * 3 + 2] = Math.sin(s.a) * r; });
        swGeo.attributes.position!.needsUpdate = true; }
      ilhotas.forEach((il, i) => { il.g.position.y = il.y0 + Math.sin(t * 0.25 + il.ph) * 1.2 * vel; il.g.rotation.y += dt * 0.01 * (i % 2 ? 1 : -1) * vel; });
    },
    dispose() { rotulo.remove(); liberar(raiz, texturas); },
  };
}
