/**
 * NaveMiniBase — o que a NAVE MINI (lib/cyber/naveMini) tem igual em toda SKIN: o convés (o piso, as paredes, a janela
 * da cabine, as escotilhas, as costelas, o teto com a cúpula, o portal da popa) e o casco por fora (o casulo liso,
 * a janela com montantes, a aleta, os motores). A skin entra pelo TEMA (as cores, os materiais, a textura do piso)
 * e depois mobília o convés (components/cyber/NaveMiniTron, NaveMiniAgradavel).
 * LEVE: Lambert/Basic (o brilho vem do emissivo), sem point light; os móveis em InstancedMesh.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { NAVE_MINI, contornoDoMini, type MovelMini, type TipoMini } from "@/lib/cyber/naveMini";
import { ESCADA_ROLANTE, ESCOTILHA, alturaDaRolante } from "@/lib/cyber/minhaNave";
import { criarBuracoPortal } from "./BuracoPortal";
import { vivificar, type UniformesEnergia } from "./energiaNave";

const N = NAVE_MINI;
export type P2 = { x: number; z: number };
export type Escotilha = { p: P2; n: P2 };
/** o alto do casco por fora (onde a cúpula assenta) */
export const TOPO_MINI = 5.85;

/** as ferramentas de montar (o grupo, a fila de animação, o que descartar no fim) */
export type KitMini = ReturnType<typeof kitMini>;
export function kitMini(low: boolean, energia: UniformesEnergia | null = null) {
  const g = new THREE.Group(), anim: ((dt: number, t: number) => void)[] = [], descartar: { dispose(): void }[] = [];
  const add = <T extends THREE.Object3D>(x: T, pai: THREE.Object3D = g) => { pai.add(x); return x; };
  /** Lambert com um pouco da própria cor no emissivo (fica visível mesmo com pouca luz na cena) */
  const mat = (c: number, brilho = 0.38, extra: THREE.MeshLambertMaterialParameters = {}) => { const m = new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: brilho, ...extra }); descartar.push(m); return m; };
  /** a luz (aditivo, sem profundidade): neon, brilho, holograma */
  const luz = (c: THREE.ColorRepresentation, op: number) => { const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); if (energia) vivificar(m, energia); descartar.push(m); return m; };   // (com o fluxo de energia: o neon respira com as ondas)
  const textura = (w: number, h: number, pinta: (x: CanvasRenderingContext2D, w: number, h: number) => void) => { const c = document.createElement("canvas"); c.width = w; c.height = h; pinta(c.getContext("2d")!, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; descartar.push(t); return t; };
  const B = (w: number, h: number, d: number, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  const Cy = (r: number, h: number, x = 0, y = 0, z = 0, s = 16, rb = r) => new THREE.CylinderGeometry(r, rb, h, s).translate(x, y, z);
  const peca = (m: THREE.Material, ...gs: THREE.BufferGeometry[]): PecaMini => { const geo = mergeGeometries(gs)!; gs.forEach((x) => x.dispose()); return { geo, mat: m }; };
  return { g, anim, descartar, add, mat, luz, textura, B, Cy, peca, low, energia, seg: low ? 10 : 18, K: low ? 96 : 160, H: N.alturaCasco };
}

export type PecaMini = { geo: THREE.BufferGeometry; mat: THREE.Material; /** cada cópia com uma cor (setColorAt) */ cores?: number[] };
export type ModeloMini = { ref: [number, number]; pecas: PecaMini[] };
/** um InstancedMesh por peça de cada modelo; os `redondos` não esticam (os outros esticam pro retângulo da planta) */
export function instanciarMoveis(k: KitMini, moveis: MovelMini[], modelos: Partial<Record<TipoMini, ModeloMini>>, redondos: TipoMini[], pai: THREE.Object3D = k.g) {
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eixoY = new THREE.Vector3(0, 1, 0), cor = new THREE.Color(), porTipo = new Map<TipoMini, MovelMini[]>();
  for (const m of moveis) porTipo.set(m.tipo, [...(porTipo.get(m.tipo) ?? []), m]);
  for (const [tipo, lista] of porTipo) {
    const md = modelos[tipo]; if (!md) continue;
    for (const pc of md.pecas) {
      const im = new THREE.InstancedMesh(pc.geo, pc.mat, lista.length); k.descartar.push(pc.geo);
      lista.forEach((m, i) => {
        const rumo = m.rumo ?? 0, deLado = Math.abs(Math.sin(rumo)) > 0.7, lx = m.x1 - m.x0, lz = m.z1 - m.z0;
        q.setFromAxisAngle(eixoY, rumo);
        m4.compose(new THREE.Vector3((m.x0 + m.x1) / 2, 0, (m.z0 + m.z1) / 2), q, redondos.includes(tipo) ? new THREE.Vector3(1, 1, 1) : new THREE.Vector3((deLado ? lz : lx) / md.ref[0], 1, (deLado ? lx : lz) / md.ref[1]));
        im.setMatrixAt(i, m4); if (pc.cores) im.setColorAt(i, cor.setHex(pc.cores[i % pc.cores.length]!));
      });
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); k.add(im, pai);
    }
  }
}

type RGB = [number, number, number];
/** o TEMA da skin: o que muda no convés e no casco */
export type TemaMini = {
  piso: THREE.Texture; pisoBrilho: number;
  /** o anel da chegada e o disco dentro dele */
  chegada: [number, number];
  parede: THREE.Material; vidro: THREE.Material; lambri: THREE.Material | null; corrimao: THREE.Material;
  /** os frisos de luz: o do parapeito da janela, o rodapé e a sanca no alto */
  parapeito: number; rodape: number; sanca: number;
  /** o espaço visto pelas escotilhas: o fundo (3 paradas do degradê) e as duas nebulosas */
  espaco: [string, string, string, string, string];
  moldura: THREE.Material; brilhoEscotilha: number;
  costela: THREE.Material; costelaLuz: number | null;
  tetoPlaca: THREE.Material; viga: THREE.Material; vigaLuz: number | null;
  bordaCupula: THREE.Material; anelCupula: number; nervura: THREE.Material; poco: THREE.Material; cupulaVidro: number;
  luzinhas: number;
  /** o holograma da rota em cima do painel: o anel, o planeta, a lua */
  rota: [number, number, number];
  portal: number;
  casco: {
    base0: RGB; base1: RGB; faixa: RGB; faixaK: number; iri: [RGB, RGB, RGB]; iriK: number; dentro: RGB;
    /** as linhas de luz no casco (estilo tron): a cor e a força (0 = sem) */
    grade: RGB; gradeK: number;
    vidro: number; vidroEmis: number; montante: number; moldura: number; aleta: number; escotilha: number; aro: number;
    linhas: [y: number, s: number, cor: number, op: number][];
    motorAro: number; brilho: [string, string, string]; rastro: [string, string, string]; halo: [string, string];
  };
};

/** o CONVÉS: piso, paredes, janela, escotilhas, costelas, teto com a cúpula, a cabine acesa e o portal */
export function montarConves(k: KitMini, T: TemaMini, o: { teto?: boolean }) {
  const { add, mat, luz, textura, anim, descartar, K, H } = k, R = N.roda, C = N.cupula, TOPO = TOPO_MINI;
  const contorno = contornoDoMini(K);
  const forma = () => new THREE.Shape(contorno.map((p) => new THREE.Vector2(p.x, -p.z)));
  // ── o PISO (a textura da skin, a proa no alto) e o anel da chegada ──
  { const geo = new THREE.ShapeGeometry(forma(), 48), uv = geo.attributes.uv as THREE.BufferAttribute, pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + N.a) / (2 * N.a), (N.b + pos.getY(i)) / (2 * N.b));
    const pm = new THREE.MeshLambertMaterial({ map: T.piso, emissive: 0xffffff, emissiveMap: T.piso, emissiveIntensity: T.pisoBrilho }); descartar.push(geo, pm);
    add(new THREE.Mesh(geo, pm)).rotation.x = -Math.PI / 2; }
  { const c = add(new THREE.Mesh(new THREE.RingGeometry(1.1, 1.35, 64), luz(T.chegada[0], 0.7))); c.rotation.x = -Math.PI / 2; c.position.set(N.chegada.x, 0.02, N.chegada.z);
    const c2 = add(new THREE.Mesh(new THREE.CircleGeometry(1.1, 48), luz(T.chegada[1], 0.12))); c2.rotation.x = -Math.PI / 2; c2.position.set(N.chegada.x, 0.018, N.chegada.z);
    anim.push((_, t) => { (c.material as THREE.MeshBasicMaterial).opacity = 0.5 + 0.2 * Math.sin(t * 1.4); }); }

  // ── as PAREDES (com UV: u = metros de arco / 4, v = a altura / H), a JANELA da cabine e os frisos ──
  const naJanela = (p: { z: number }) => p.z > N.janela;
  const fita = (pts: P2[], y0: number, y1: number, filtro: (p: P2) => boolean, m: THREE.Material, pai: THREE.Object3D = k.g) => {
    const v: number[] = [], uv: number[] = [], idx: number[] = []; let s = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i]!, b = pts[(i + 1) % pts.length]!, L = Math.hypot(b.x - a.x, b.z - a.z); if (!filtro(a) || !filtro(b)) { s += L; continue; }
      const n = v.length / 3; v.push(a.x, y0, a.z, b.x, y0, b.z, b.x, y1, b.z, a.x, y1, a.z); uv.push(s / 4, y0 / H, (s + L) / 4, y0 / H, (s + L) / 4, y1 / H, s / 4, y1 / H); idx.push(n, n + 1, n + 2, n, n + 2, n + 3); s += L; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals(); descartar.push(geo);
    return add(new THREE.Mesh(geo, m), pai);
  };
  const enc = (s: number) => contorno.map((p) => ({ x: p.x * s, z: p.z * s }));
  fita(contorno, 0, H, (p) => !naJanela(p), T.parede);
  fita(contorno, 0, 1.0, naJanela, T.parede);   // (a cabine: só o parapeito…)
  fita(contorno, 1.0, H, naJanela, T.vidro);     // (…e o vidro inteiro até o teto)
  fita(enc(0.996), 0.95, 1.01, naJanela, luz(T.parapeito, 0.7));
  if (T.lambri) fita(enc(0.997), 0, 1.15, (p) => !naJanela(p), T.lambri);
  fita(enc(0.993), 1.12, 1.2, () => true, T.corrimao);
  fita(enc(0.995), 0.06, 0.1, () => true, luz(T.rodape, 0.6));
  fita(enc(0.99), H - 0.22, H - 0.12, (p) => !naJanela(p), luz(T.sanca, 0.65));

  // a normal pra dentro do casco no ponto (o gradiente da superelipse)
  const praDentro = (p: P2) => { const gx = Math.sign(p.x) * Math.abs(p.x / N.a) ** (N.n - 1) / N.a, gz = Math.sign(p.z) * Math.abs(p.z / N.b) ** (N.n - 1) / N.b, l = Math.hypot(gx, gz) || 1; return { x: -gx / l, z: -gz / l }; };
  // ── as ESCOTILHAS: o espaço lá fora num disco, a moldura e o brilho ──
  const [f0, f1, f2, n1, n2] = T.espaco;
  const espacoTex = textura(512, 512, (x, w) => {
    const gr = x.createRadialGradient(w * 0.4, w * 0.4, 0, w / 2, w / 2, w * 0.7); gr.addColorStop(0, f0); gr.addColorStop(0.6, f1); gr.addColorStop(1, f2); x.fillStyle = gr; x.fillRect(0, 0, w, w);
    for (let j = 0; j < 6; j++) { const cx = (j * 173) % w, cy = (j * 291) % w, r = 90 + ((j * 61) % 90), n = x.createRadialGradient(cx, cy, 0, cx, cy, r); n.addColorStop(0, j % 2 ? n1 : n2); n.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = n; x.fillRect(0, 0, w, w); }
    for (let j = 0; j < 180; j++) { x.fillStyle = `rgba(255,248,240,${0.4 + ((j * 13) % 6) / 10})`; const s = j % 11 ? 1.4 : 3; x.fillRect((j * 211) % w, (j * 97) % w, s, s); }
  });
  const escotilhas: Escotilha[] = [];
  { const vidroEsc = new THREE.MeshBasicMaterial({ map: espacoTex }); descartar.push(vidroEsc);
    const disco = new THREE.CircleGeometry(0.62, 40), moldura = new THREE.TorusGeometry(0.66, 0.08, 8, 40), anel = new THREE.RingGeometry(0.62, 0.7, 40); descartar.push(disco, moldura, anel);
    const pts = contornoDoMini(200), brilho = luz(T.brilhoEscotilha, 0.45); let ultimo = -1e9, s = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i]!, b = pts[(i + 1) % pts.length]!; s += Math.hypot(b.x - a.x, b.z - a.z);
      if (naJanela(a) || a.z < -12.5 || s - ultimo < 3.1) continue; ultimo = s; escotilhas.push({ p: a, n: praDentro(a) }); }
    for (const e of escotilhas) {
      const alvo = new THREE.Vector3(e.p.x + e.n.x, 2.4, e.p.z + e.n.z);
      const d = add(new THREE.Mesh(disco, vidroEsc)); d.position.set(e.p.x + e.n.x * 0.03, 2.4, e.p.z + e.n.z * 0.03); d.lookAt(alvo);
      const m = add(new THREE.Mesh(moldura, T.moldura)); m.position.copy(d.position); m.lookAt(alvo);
      const b = add(new THREE.Mesh(anel, brilho)); b.position.set(e.p.x + e.n.x * 0.06, 2.4, e.p.z + e.n.z * 0.06); b.lookAt(alvo);
    } }
  // ── as COSTELAS (do piso ao teto, a cada ~2,6 m), com o filete de luz na frente quando a skin tem ──
  { const pts = contornoDoMini(200), costela = new THREE.BoxGeometry(0.16, H, 0.22), filete = new THREE.BoxGeometry(0.04, H - 0.4, 0.02).translate(0, 0, 0.12);
    const im = new THREE.InstancedMesh(costela, T.costela, 48), imL = T.costelaLuz !== null ? new THREE.InstancedMesh(filete, luz(T.costelaLuz, 0.85), 48) : null;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); let n = 0, s = 0, ultimo = -1e9;
    for (let i = 0; i < pts.length && n < 48; i++) { const a = pts[i]!, b = pts[(i + 1) % pts.length]!; s += Math.hypot(b.x - a.x, b.z - a.z); if (s - ultimo < 2.6) continue; ultimo = s;
      const nn = praDentro(a); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(nn.x, nn.z)); m4.compose(new THREE.Vector3(a.x + nn.x * 0.1, H / 2, a.z + nn.z * 0.1), q, new THREE.Vector3(1, naJanela(a) ? 0 : 1, 1)); im.setMatrixAt(n, m4); imL?.setMatrixAt(n, m4); n++; }
    im.count = n; add(im); descartar.push(costela, filete); if (imL) { imL.count = n; add(imL); } }

  // ── o TETO (com o furo da cúpula em cima da roda), as vigas curvas, a CÚPULA de vidro e o poço de luz ──
  const teto = new THREE.Group(); add(teto); teto.visible = o.teto ?? true;
  { const sh = forma(), furo = new THREE.Path(); furo.absellipse(R.x, -R.z, C.a, C.b, 0, Math.PI * 2, true, 0); sh.holes.push(furo); sh.holes.push(vaoDaEscotilha());
    const geo = new THREE.ShapeGeometry(sh, 48), uv = geo.attributes.uv as THREE.BufferAttribute, pos = geo.attributes.position as THREE.BufferAttribute; descartar.push(geo);
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + N.a) / (2 * N.a), (N.b + pos.getY(i)) / (2 * N.b));
    const placa = add(new THREE.Mesh(geo, T.tetoPlaca), teto); placa.rotation.x = -Math.PI / 2; placa.position.y = H;
    for (const z of [-11, -7.5, -4, 7.5, 11]) { const xm = N.a * (1 - Math.abs(z / N.b) ** N.n) ** (1 / N.n) - 0.1;
      const curva = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-xm, H - 0.5, z), new THREE.Vector3(0, H + 0.1, z), new THREE.Vector3(xm, H - 0.5, z));
      add(new THREE.Mesh(new THREE.TubeGeometry(curva, 24, 0.09, 6, false), T.viga), teto);
      if (T.vigaLuz !== null) { const fio = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-xm, H - 0.6, z), new THREE.Vector3(0, H, z), new THREE.Vector3(xm, H - 0.6, z)); add(new THREE.Mesh(new THREE.TubeGeometry(fio, 24, 0.025, 4, false), luz(T.vigaLuz, 0.9)), teto); } }
    const borda = new THREE.Shape(); borda.absellipse(0, 0, C.a + 0.35, C.b + 0.35, 0, Math.PI * 2, false, 0); const fb = new THREE.Path(); fb.absellipse(0, 0, C.a, C.b, 0, Math.PI * 2, true, 0); borda.holes.push(fb);
    const gb = new THREE.ExtrudeGeometry(borda, { depth: 0.18, bevelEnabled: false, curveSegments: 48 }); gb.rotateX(-Math.PI / 2); gb.translate(R.x, H - 0.18, R.z); descartar.push(gb); add(new THREE.Mesh(gb, T.bordaCupula), teto);
    const anel = add(new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 4, 96), luz(T.anelCupula, 0.85)), teto); anel.scale.set(C.a - 0.05, C.b - 0.05, 1); anel.rotation.x = Math.PI / 2; anel.position.set(R.x, H - 0.2, R.z);
    const cup = new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2); cup.scale(C.a, C.alt, C.b); cup.translate(R.x, TOPO, R.z); descartar.push(cup);
    const cm = new THREE.MeshLambertMaterial({ color: T.cupulaVidro, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide, emissive: T.cupulaVidro, emissiveIntensity: 0.12 }); descartar.push(cm); add(new THREE.Mesh(cup, cm), teto);
    for (let j = 0; j < 8; j++) { const a = (j / 8) * Math.PI * 2, pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 12; i++) { const u = (i / 12) * (Math.PI / 2); pts.push(new THREE.Vector3(R.x + Math.cos(a) * Math.cos(u) * C.a, TOPO + Math.sin(u) * C.alt, R.z + Math.sin(a) * Math.cos(u) * C.b)); }
      add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.04, 5, false), T.nervura), teto); }
    const poco = new THREE.CylinderGeometry(1, 1, TOPO - H, 64, 1, true); poco.scale(C.a, 1, C.b); poco.translate(R.x, (H + TOPO) / 2, R.z); descartar.push(poco); add(new THREE.Mesh(poco, T.poco), teto); }

  // ── a CABINE: as luzinhas no caixilho da janela e o holograma da rota em cima do painel ──
  { const pts = contornoDoMini(160).filter(naJanela).sort((a, b) => a.x - b.x).map((p) => new THREE.Vector3(p.x * 0.995, H - 0.05, p.z * 0.995));
    const lamp = new THREE.SphereGeometry(0.045, 6, 4), n = k.low ? 20 : 36, im = new THREE.InstancedMesh(lamp, luz(T.luzinhas, 0.9), n), m4 = new THREE.Matrix4(); descartar.push(lamp);
    const curva = new THREE.CatmullRomCurve3(pts); for (let j = 0; j < n; j++) { const p = curva.getPoint(j / (n - 1)); p.y -= Math.sin(((j % 6) / 6) * Math.PI) * 0.22; m4.makeTranslation(p.x, p.y, p.z); im.setMatrixAt(j, m4); } add(im);
    const hg = add(new THREE.Group()); hg.position.set(0, 1.35, 14.1);
    add(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.012, 4, 48), luz(T.rota[0], 0.8)), hg).rotation.x = Math.PI / 2;
    const pm = new THREE.MeshBasicMaterial({ color: T.rota[1], wireframe: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }); descartar.push(pm);
    const planeta = add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), pm), hg), lua = add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), luz(T.rota[2], 0.9)), hg);
    anim.push((dt, t) => { planeta.rotation.y += dt * 0.5; lua.position.set(Math.cos(t * 0.8) * 0.42, 0, Math.sin(t * 0.8) * 0.42); }); }

  // ── a POPA: o portal (o buraco negro pra Cidade Zaeon) ──
  const bn = criarBuracoPortal(k.g, { x: N.portal.x, y: 0.02, z: N.portal.z, anelR: N.portal.r, h: 2.6, r: 0.8, low: k.low, cor: T.portal });
  anim.push((dt, t) => bn.atualizar(dt, t)); descartar.push(bn);

  return { teto, escotilhas, naJanela, praDentro, fita, contorno };
}

/** o vão retangular da ESCOTILHA (pra furar o forro de dentro e o teto de fora — a forma usa y = −z) */
export function vaoDaEscotilha(): THREE.Path { const E = ESCOTILHA, f = new THREE.Path(); f.moveTo(E.x0, -E.z0); f.lineTo(E.x0, -E.z1); f.lineTo(E.x1, -E.z1); f.lineTo(E.x1, -E.z0); f.closePath(); return f; }

/** a ESCADA ROLANTE (lib/cyber/minhaNave): do piso de dentro até a escotilha no teto de fora — os degraus correndo pra
 *  cima, o corpo por baixo, as laterais de vidro com o corrimão aceso e o poço da escotilha (do forro até o teto) */
export function montarRolante(k: KitMini, o: { corpo: THREE.Material; degrau: THREE.Material; vidro: THREE.Material; cor: number; cor2: number }) {
  const { add, luz, anim, descartar } = k, E = ESCADA_ROLANTE, L = E.z1 - E.z0, Y = TOPO_MINI, ang = Math.atan2(Y, L), comp = Math.hypot(L, Y);
  const g = add(new THREE.Group()); g.position.set(E.x, 0, E.z0); g.rotation.x = -ang;   // (o eixo da rampa: do pé, pra +z, subindo)
  add(new THREE.Mesh(new THREE.BoxGeometry(E.meia * 2 + 0.2, 0.5, comp).translate(0, -0.3, comp / 2), o.corpo), g);   // (a viga por baixo)
  for (const sx of [-1, 1]) {
    add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, comp).translate(sx * (E.meia + 0.05), 0.45, comp / 2), o.vidro), g);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, comp + 0.6).translate(sx * (E.meia + 0.05), 0.93, comp / 2), luz(o.cor, 0.9)), g);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, comp).translate(sx * (E.meia - 0.02), 0.04, comp / 2), luz(o.cor2, 0.8)), g);
  }
  // os DEGRAUS correndo (instanciados): cada um sobe pela rampa e volta pro pé
  const passo = 0.42, n = Math.ceil(comp / passo), dg = new THREE.BoxGeometry(E.meia * 2 - 0.06, 0.05, passo * 0.92); descartar.push(dg);
  const im = new THREE.InstancedMesh(dg, o.degrau, n), friso = new THREE.InstancedMesh(new THREE.BoxGeometry(E.meia * 2 - 0.08, 0.012, 0.025), luz(o.cor2, 0.85), n); descartar.push(friso.geometry);
  add(im, g); add(friso, g); const m4 = new THREE.Matrix4();
  anim.push((_, t) => { const off = ((t * E.esteira) % passo + passo) % passo; for (let i = 0; i < n; i++) { const z = Math.min(comp, i * passo + off); m4.makeTranslation(0, 0.02, z); im.setMatrixAt(i, m4); m4.makeTranslation(0, 0.05, z + passo * 0.44); friso.setMatrixAt(i, m4); } im.instanceMatrix.needsUpdate = true; friso.instanceMatrix.needsUpdate = true; });
  // os pisos de chegada (o pé e o topo) e o poço da escotilha, com a moldura acesa no teto de fora
  const pe = add(new THREE.Mesh(new THREE.BoxGeometry(E.meia * 2 + 0.3, 0.04, 0.9), o.corpo)); pe.position.set(E.x, 0.02, E.z0 - 0.45);
  add(new THREE.Mesh(new THREE.BoxGeometry(E.meia * 2 + 0.3, 0.02, 0.05), luz(o.cor, 0.9))).position.set(E.x, 0.05, E.z0 - 0.9);
  const S = ESCOTILHA, w = S.x1 - S.x0, d = S.z1 - S.z0, hP = Y - k.H;
  for (const [cx, cz, lx, lz] of [[(S.x0 + S.x1) / 2, S.z0, w, 0.06], [(S.x0 + S.x1) / 2, S.z1, w, 0.06], [S.x0, (S.z0 + S.z1) / 2, 0.06, d], [S.x1, (S.z0 + S.z1) / 2, 0.06, d]] as const) {
    add(new THREE.Mesh(new THREE.BoxGeometry(lx, hP, lz).translate(cx, k.H + hP / 2, cz), o.corpo));
    add(new THREE.Mesh(new THREE.BoxGeometry(lx + 0.04, 0.05, lz + 0.04).translate(cx, Y + 0.03, cz), luz(o.cor, 0.95)));
  }
  void alturaDaRolante;
}

/** o ELEVADOR DE LUZ debaixo da cúpula (lib/cyber/minhaNave): o anel no piso, o feixe subindo até atravessar a cúpula
 *  e o óculo de luz lá em cima, onde se passa */
export function montarElevador(k: KitMini, e: { x: number; z: number; r: number }, cor: number) {
  const { add, luz, anim } = k, alto = TOPO_MINI + N.cupula.alt + 0.6;
  const anel = add(new THREE.Mesh(new THREE.RingGeometry(e.r - 0.1, e.r, 48), luz(cor, 0.95))); anel.rotation.x = -Math.PI / 2; anel.position.set(e.x, 0.025, e.z);
  const disco = add(new THREE.Mesh(new THREE.CircleGeometry(e.r - 0.1, 40), luz(cor, 0.18))); disco.rotation.x = -Math.PI / 2; disco.position.set(e.x, 0.02, e.z);
  const feixe = add(new THREE.Mesh(new THREE.CylinderGeometry(e.r * 0.75, e.r * 0.85, alto, 32, 1, true).translate(0, alto / 2, 0), luz(cor, 0.09))); feixe.position.set(e.x, 0, e.z);
  const aneis = [0, 1, 2].map((j) => { const a = add(new THREE.Mesh(new THREE.TorusGeometry(e.r * 0.8, 0.02, 4, 40), luz(cor, 0.7))); a.rotation.x = Math.PI / 2; a.userData.j = j; return a; });
  anim.push((_, t) => { (feixe.material as THREE.MeshBasicMaterial).opacity = 0.07 + 0.04 * Math.sin(t * 2.2); for (const a of aneis) { const u = (t * 0.35 + (a.userData.j as number) / 3) % 1; a.position.set(e.x, u * alto, e.z); (a.material as THREE.MeshBasicMaterial).opacity = 0.8 * Math.sin(Math.PI * u); } });
}

const VERT = `varying vec3 vN; varying vec3 vV; varying float vY; varying vec2 vUv; varying vec2 vXZ;
void main(){ vec4 w = modelMatrix * vec4(position,1.); vY = position.y; vXZ = position.xz; vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`;
/** o casco: o degradê da quilha ao dorso, a faixa na cintura, a borda iridescente e as linhas de luz (a tron) */
const FRAG = `uniform float uT; uniform vec3 uB0, uB1, uFx, uI0, uI1, uI2, uDn, uGr; uniform float uFxK, uIK, uGrK, uEnK; varying vec3 vN; varying vec3 vV; varying float vY; varying vec2 vXZ;
void main(){
  float k = smoothstep(-3.2, 6.2, vY);
  vec3 base = mix(uB0, uB1, k);
  base = mix(base, uFx, (smoothstep(-1.1,-.7,vY) - smoothstep(.1,.5,vY)) * uFxK);
  float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 2.2);
  vec3 iri = mix(mix(uI0, uI1, .5 + .5 * sin(vY * .5 + uT * .2 + vN.x * 2.)), uI2, .5 + .5 * sin(vN.z * 3. - uT * .15));
  float gr = (pow(abs(sin(vY * 2.4)), 90.) + pow(abs(sin(vY * 2.4 + 1.2)), 140.) * .5) * pow(1. - abs(vN.y), 2.);   // (só nas laterais: no teto e na quilha não)
  float passa = exp(-pow(fract(vY * .08 - uT * .12) - .5, 2.) * 300.) * .4;
  float onda = pow(.5 + .5 * sin(length(vXZ - vec2(0., 1.5)) * .85 + abs(vY) * 1.1 - uT * 3.1), 14.);   // (o fluxo de energia de dentro, correndo pro casco)
  vec3 fora = base * (.62 + .3 * max(vN.y, 0.) + .08 * vN.x) + iri * f * uIK + uGr * (gr + passa * gr * 3.) * uGrK * (1. + uEnK * (onda * 2.4 - .45));
  gl_FragColor = vec4(gl_FrontFacing ? fora : uDn, 1.);
}`;

/** o CASCO por fora: o casulo liso (anéis alisados), a janela com montantes, a aleta, as escotilhas acesas, os motores */
export function montarCasco(k: KitMini, T: TemaMini, escotilhas: Escotilha[]) {
  const { add, mat, luz, textura, anim, descartar } = k, R = N.roda, C = N.cupula, TOPO = TOPO_MINI, Q = T.casco;
  const casco = new THREE.Group(); add(casco);
  const uT = { value: 0 }; anim.push((_, t) => { uT.value = t; });
  const v3 = (c: RGB) => ({ value: new THREE.Vector3(...c) });
  const cascoMat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, uniforms: { uT, uB0: v3(Q.base0), uB1: v3(Q.base1), uFx: v3(Q.faixa), uFxK: { value: Q.faixaK }, uI0: v3(Q.iri[0]), uI1: v3(Q.iri[1]), uI2: v3(Q.iri[2]), uIK: { value: Q.iriK }, uDn: v3(Q.dentro), uGr: v3(Q.grade), uGrK: { value: Q.gradeK }, uEnK: { value: k.energia ? 1 : 0 } } }); descartar.push(cascoMat);
  const vidroFora = new THREE.MeshLambertMaterial({ color: Q.vidro, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide, emissive: Q.vidroEmis, emissiveIntensity: 0.25 }); descartar.push(vidroFora);
  // os anéis-chave (a quilha, a cintura, a fita das escotilhas, o ombro), alisados numa Catmull-Rom (4 por trecho)
  const chave = [{ y: -3.0, s: 0.3 }, { y: -2.4, s: 0.62 }, { y: -1.6, s: 0.84 }, { y: -0.6, s: 0.99 }, { y: 0.6, s: 1.045 }, { y: 2.2, s: 1.066 }, { y: 3.6, s: 1.058 }, { y: 4.6, s: 1.025 }, { y: 5.2, s: 0.95 }, { y: 5.6, s: 0.84 }, { y: TOPO, s: 0.7 }];
  const aneis: { y: number; s: number }[] = [];
  for (let i = 0; i < chave.length - 1; i++) { const p0 = chave[Math.max(0, i - 1)]!.s, p1 = chave[i]!.s, p2 = chave[i + 1]!.s, p3 = chave[Math.min(chave.length - 1, i + 2)]!.s;
    for (let j = 0; j < 4; j++) { const u = j / 4, u2 = u * u, u3 = u2 * u; aneis.push({ y: chave[i]!.y + (chave[i + 1]!.y - chave[i]!.y) * u, s: 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3) }); } }
  aneis.push(chave[chave.length - 1]!);
  const cont = contornoDoMini(k.low ? 64 : 128), pts = aneis.map((a) => cont.map((p) => new THREE.Vector3(p.x * a.s, a.y, p.z * a.s)));
  const corpo = { v: [] as number[], i: [] as number[] }, janela = { v: [] as number[], i: [] as number[] };
  for (let i = 0; i < aneis.length - 1; i++) for (let j = 0; j < cont.length; j++) {
    const j2 = (j + 1) % cont.length, vidroAqui = aneis[i]!.y >= 0.6 - 1e-6 && aneis[i + 1]!.y <= 4.6 + 1e-6 && cont[j]!.z > N.janela + 1.5 && cont[j2]!.z > N.janela + 1.5, alvo = vidroAqui ? janela : corpo;
    const a = pts[i]![j]!, b = pts[i]![j2]!, c = pts[i + 1]![j2]!, d = pts[i + 1]![j]!, n = alvo.v.length / 3;
    alvo.v.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z); alvo.i.push(n, n + 2, n + 1, n, n + 3, n + 2);
  }
  { const fundo = pts[0]!, n0 = corpo.v.length / 3; corpo.v.push(0, aneis[0]!.y, 0); fundo.forEach((p) => corpo.v.push(p.x, p.y, p.z)); for (let j = 0; j < fundo.length; j++) corpo.i.push(n0, n0 + 1 + j, n0 + 1 + ((j + 1) % fundo.length)); }
  for (const [m, mt] of [[corpo, cascoMat], [janela, vidroFora]] as const) { const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(m.v, 3)); geo.setIndex(m.i); geo.computeVertexNormals(); descartar.push(geo); add(new THREE.Mesh(geo, mt), casco); }
  // o teto por fora (o ombro até a cúpula) e a borda de baixo (do piso até o casco)
  for (const [y, s, furoCupula] of [[TOPO, 0.7, true], [-0.02, 1.02, false]] as const) {
    const sh = new THREE.Shape(contornoDoMini(96).map((p) => new THREE.Vector2(p.x * s, -p.z * s)));
    if (furoCupula) { const f = new THREE.Path(); f.absellipse(R.x, -R.z, C.a, C.b, 0, Math.PI * 2, true, 0); sh.holes.push(f, vaoDaEscotilha()); } else sh.holes.push(new THREE.Path(contornoDoMini(96).reverse().map((p) => new THREE.Vector2(p.x, -p.z))));
    const geo = new THREE.ShapeGeometry(sh, 32); geo.rotateX(-Math.PI / 2); geo.translate(0, y, 0); descartar.push(geo); add(new THREE.Mesh(geo, cascoMat), casco); }
  // os montantes da janela da cabine e a moldura de luz em cima e embaixo
  { const cj = cont.filter((p) => p.z > N.janela + 1.5).sort((a, b) => a.x - b.x), mm = mat(Q.montante, 0.5), mg = new THREE.CylinderGeometry(0.06, 0.06, 4.0, 6); descartar.push(mg);
    for (let j = 0; j < cj.length; j += Math.max(1, Math.round(cj.length / 9))) { const p = cj[j]!; add(new THREE.Mesh(mg, mm), casco).position.set(p.x * 1.062, 2.6, p.z * 1.062); }
    for (const [y, s] of [[0.6, 1.047], [4.6, 1.027]] as const) add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cj.map((p) => new THREE.Vector3(p.x * s, y, p.z * s))), 64, 0.07, 6, false), luz(Q.moldura, 0.8)), casco); }
  // (a aleta do dorso saiu: no lugar dela, a DOCA DAS MOTOS — components/cyber/EspacoAberto)
  // as escotilhas acesas por fora e as linhas finas de luz
  { const disco = new THREE.CircleGeometry(0.6, 32), aro = new THREE.TorusGeometry(0.66, 0.06, 6, 32); descartar.push(disco, aro); const le = luz(Q.escotilha, 0.85), ma = mat(Q.aro, 0.5);
    for (const e of escotilhas) { const p = new THREE.Vector3(e.p.x * 1.068, 2.4, e.p.z * 1.068), fora = new THREE.Vector3(p.x - e.n.x, 2.4, p.z - e.n.z);
      const d = add(new THREE.Mesh(disco, le), casco); d.position.copy(p); d.lookAt(fora); const a = add(new THREE.Mesh(aro, ma), casco); a.position.copy(p); a.lookAt(fora); } }
  for (const [y, s, c, op] of Q.linhas) add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(contornoDoMini(96).map((p) => new THREE.Vector3(p.x * s, y, p.z * s)), true), 192, 0.04, 5, true), luz(c, op)), casco);
  // os MOTORES: duas cápsulas na popa com o brilho e o rastro curto; o halo de flutuação embaixo
  const radial = (stops: [number, string][]) => textura(256, 256, (c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); for (const [p, s] of stops) gr.addColorStop(p, s); c.fillStyle = gr; c.fillRect(0, 0, w, w); });
  const sm = new THREE.SpriteMaterial({ map: radial([[0, Q.brilho[0]], [0.25, Q.brilho[1]], [0.6, Q.brilho[2]], [1, "rgba(0,0,0,0)"]]), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }); descartar.push(sm);
  const rastro = textura(64, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, Q.rastro[0]); gr.addColorStop(0.4, Q.rastro[1]); gr.addColorStop(1, Q.rastro[2]); c.fillStyle = gr; c.fillRect(0, 0, w, h); const lg = c.createLinearGradient(0, 0, w, 0); lg.addColorStop(0, "rgba(0,0,0,1)"); lg.addColorStop(0.5, "rgba(0,0,0,0)"); lg.addColorStop(1, "rgba(0,0,0,1)"); c.globalCompositeOperation = "destination-out"; c.fillStyle = lg; c.fillRect(0, 0, w, h); });
  const rm = new THREE.MeshBasicMaterial({ map: rastro, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); descartar.push(rm);
  for (const sx of [-1, 1]) { const x = sx * 5.6, y = 0.8, z = -N.b + 1.8;
    add(new THREE.Mesh(new THREE.CapsuleGeometry(1.2, 4.2, 8, k.low ? 16 : 28).rotateX(Math.PI / 2), cascoMat), casco).position.set(x, y, z);
    add(new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.06, 6, 40), luz(Q.motorAro, 0.9)), casco).position.set(x, y, z - 3.1);
    const s = add(new THREE.Sprite(sm), casco); s.position.set(x, y, z - 3.5); s.scale.set(3.4, 3.4, 1);
    for (const r of [0, Math.PI / 2]) { const p = add(new THREE.Mesh(new THREE.PlaneGeometry(1.5, 5).rotateX(-Math.PI / 2).translate(0, 0, -2.5), rm), casco); p.position.set(x, y, z - 3.6); p.rotation.z = r; } }
  anim.push((_, t) => { rm.opacity = 0.7 + 0.15 * Math.sin(t * 5); });
  const hm = new THREE.MeshBasicMaterial({ map: radial([[0, Q.halo[0]], [0.5, Q.halo[1]], [1, "rgba(0,0,0,0)"]]), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); descartar.push(hm);
  const h = add(new THREE.Mesh(new THREE.PlaneGeometry(22, 38), hm), casco); h.rotation.x = -Math.PI / 2; h.position.y = -4;
  anim.push((_, t) => { hm.opacity = 0.75 + 0.2 * Math.sin(t * 1.1); });
  return casco;
}
