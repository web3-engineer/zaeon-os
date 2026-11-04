/**
 * CascoCyberpunk — o lado de FORA da nave coworking (nov/2026, o dono: "precisamos dar uma forma a ela… uma estética
 * cyberpunk"). Envolve o convés (lib/cyber/naveCoworking) sem mexer nele:
 *  - o CASCO é um sólido facetado de metal escuro, "loftado" em anéis da superelipse (quilha estreita embaixo, a
 *    cintura no convés, o ombro e o dorso em cima); a proa avança em cunha e faz uma VISEIRA por cima do mirante, que
 *    fica aberto (a janela panorâmica de dentro olha pro espaço por esse vão);
 *  - as arestas das facetas viram LINHAS DE NEON (ciano), as fileiras de janelas acesas e as faixas magenta correm
 *    pelos lados;
 *  - na popa, os MOTORES (duas naceles octogonais + o bocal central) com o jato pulsando; em cima, a TORRE com o
 *    letreiro vertical ZAEON e as antenas piscando; nos flancos, os PAINÉIS holográficos (o anúncio com glitch);
 *    luzes de navegação (bombordo vermelho, estibordo verde) e o brilho de flutuação embaixo.
 * Mesmo referencial do convés (+z = proa, y = 0 no piso). LEVE: Lambert com flatShading + aditivos, sem luz de cena.
 */
import * as THREE from "three";
import { NAVE_COWORK, area, contornoDoCasco } from "@/lib/cyber/naveCoworking";

export type CascoHandle = { group: THREE.Group; atualizar(dt: number, t: number): void; dispose(): void };

const N = NAVE_COWORK;
const COR = { metal: 0x2a2c40, metalClaro: 0x3a3d56, ciano: 0x45f0ff, magenta: 0xff2fb4, lavanda: 0xb98cff, ambar: 0xffb43a } as const;

/** a PLANTA do casco (x, z): um polígono ANGULOSO em volta do convés (a superelipse) — a proa em cunha, os chanfros
 *  da popa. Sentido anti-horário, começando no flanco de estibordo. `PROA` = o índice da ponta. */
const PLANTA: readonly { x: number; z: number }[] = [
  { x: 21.5, z: -22 }, { x: 21, z: 28 }, { x: 9, z: 46 }, { x: 0, z: 53 }, { x: -9, z: 46 }, { x: -21, z: 28 },
  { x: -21.5, z: -22 }, { x: -17, z: -39 }, { x: -9, z: -43 }, { x: 9, z: -43 }, { x: 17, z: -39 },
];
const PROA = 3;
/** um anel do casco: a planta escalada (`s`), na altura `y`; a PONTA da proa avança mais `ponta` m */
type Anel = { y: number; s: number; ponta: number };
const ANEIS: Anel[] = [
  { y: -7, s: 0.34, ponta: 10 },     // a quilha
  { y: -3.6, s: 0.84, ponta: 12 },   // o casco de baixo: a proa vira um ARÍETE
  { y: -0.2, s: 1, ponta: 0 },       // a cintura (logo abaixo do piso)
  { y: 7.0, s: 1, ponta: -2 },       // o ombro (em cima das paredes) — a VISEIRA por cima do mirante
  { y: 9.6, s: 0.8, ponta: -8 },     // o dorso
  { y: 10.4, s: 0.56, ponta: -14 },  // o teto do casco
];

export function criarCascoCyberpunk(o: { low: boolean }): CascoHandle {
  const g = new THREE.Group(), anim: ((dt: number, t: number) => void)[] = [], descartar: { dispose(): void }[] = [];
  const add = <T extends THREE.Object3D>(x: T, pai: THREE.Object3D = g) => { pai.add(x); return x; };
  const lambert = (p: THREE.MeshLambertMaterialParameters) => { const m = new THREE.MeshLambertMaterial({ flatShading: true, ...p }); descartar.push(m); return m; };
  const aditivo = (c: THREE.ColorRepresentation, op: number) => { const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); descartar.push(m); return m; };
  const textura = (w: number, h: number, pinta: (x: CanvasRenderingContext2D, w: number, h: number) => void) => { const c = document.createElement("canvas"); c.width = w; c.height = h; pinta(c.getContext("2d")!, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; descartar.push(t); return t; };
  // as CHAPAS da blindagem: placas com rebite, umas mais escuras (fuligem), listras de perigo e os glifos
  const chapas = textura(512, 512, (x, w, h) => {
    x.fillStyle = "#2c2e44"; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { const px = (i * 131) % w, py = (i * 197) % h; x.fillStyle = i % 3 ? "rgba(10,10,24,.35)" : "rgba(90,96,140,.18)"; x.fillRect(px, py, 40 + (i % 5) * 30, 24 + (i % 4) * 20); }
    x.strokeStyle = "rgba(8,8,18,.9)"; x.lineWidth = 3; for (let k = 0; k <= w; k += 128) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, h); x.stroke(); x.beginPath(); x.moveTo(0, k); x.lineTo(w, k); x.stroke(); }
    x.fillStyle = "rgba(160,170,220,.35)"; for (let a = 8; a < w; a += 128) for (let b = 8; b < h; b += 32) x.fillRect(a, b, 3, 3);
    x.save(); x.beginPath(); x.rect(0, 452, 256, 26); x.clip(); for (let k = -30; k < 290; k += 26) { x.fillStyle = "#e8b400"; x.beginPath(); x.moveTo(k, 478); x.lineTo(k + 13, 478); x.lineTo(k + 39, 452); x.lineTo(k + 26, 452); x.fill(); } x.restore();
    x.fillStyle = "rgba(255,47,180,.55)"; x.font = "700 30px system-ui,sans-serif"; x.fillText("Z-07 宇宙", 300, 474); x.fillStyle = "rgba(69,240,255,.5)"; x.fillText("危険 · 高電圧", 270, 90);
  });
  chapas.wrapS = chapas.wrapT = THREE.RepeatWrapping; chapas.anisotropy = 4;
  const metal = lambert({ color: 0xffffff, map: chapas, emissive: 0x0a0a18, emissiveIntensity: 1 });
  const metalClaro = lambert({ color: COR.metalClaro, emissive: 0x0d0d1c, emissiveIntensity: 1 });
  /** uma polilinha reta (as arestas angulosas — o Catmull-Rom arredondaria) */
  const polilinha = (pts: THREE.Vector3[]) => { const c = new THREE.CurvePath<THREE.Vector3>(); for (let i = 0; i < pts.length - 1; i++) c.add(new THREE.LineCurve3(pts[i]!, pts[i + 1]!)); return c; };
  /** UVs planares (metros / 8) pela face dominante — o bastante pras chapas de um sólido facetado */
  const uvPlanar = (geo: THREE.BufferGeometry, esc = 8) => { const pos = geo.attributes.position as THREE.BufferAttribute, nor = geo.attributes.normal as THREE.BufferAttribute, uv: number[] = [];
    for (let i = 0; i < pos.count; i++) { const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i)), X = pos.getX(i), Y = pos.getY(i), Z = pos.getZ(i);
      if (ny > nx && ny > nz) uv.push(X / esc, Z / esc); else if (nx > nz) uv.push(Z / esc, Y / esc); else uv.push(X / esc, Y / esc); }
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); };

  // ── o CASCO: os anéis da planta angulosa costurados em faixas (cada faceta = uma placa) ──
  const K = PLANTA.length, zMirante = area("mirante").z0;
  const aneis = ANEIS.map((a) => PLANTA.map((p, k) => new THREE.Vector3(p.x * a.s, a.y, p.z * a.s + (k === PROA ? a.ponta : 0))));
  /** a faixa da cintura ao ombro, na frente, é o VÃO do mirante (a janela de dentro olha pro espaço por ali) */
  const vaoDoMirante = (i: number, k: number) => i === 2 && PLANTA[k]!.z > zMirante;
  { const v: number[] = [];
    const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => v.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    for (let i = 0; i < aneis.length - 1; i++) for (let k = 0; k < K; k++) {
      const k2 = (k + 1) % K; if (vaoDoMirante(i, k) && vaoDoMirante(i, k2)) continue;
      const a = aneis[i]![k]!, b = aneis[i]![k2]!, c = aneis[i + 1]![k2]!, d = aneis[i + 1]![k]!;
      tri(a, c, b); tri(a, d, c);
    }
    for (const [anel, cima] of [[aneis[0]!, false], [aneis[aneis.length - 1]!, true]] as const) {   // as tampas (quilha e teto)
      const c = anel.reduce((s, p) => s.clone().add(p), new THREE.Vector3()).multiplyScalar(1 / K);
      for (let k = 0; k < K; k++) { const a = anel[k]!, b = anel[(k + 1) % K]!; if (cima) tri(c, b, a); else tri(c, a, b); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); geo.computeVertexNormals(); uvPlanar(geo); descartar.push(geo);
    const cascoMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: chapas, emissive: 0x0a0a18, flatShading: true, side: THREE.DoubleSide }); descartar.push(cascoMat);
    add(new THREE.Mesh(geo, cascoMat));
    // as ARESTAS das placas em neon
    const arestas = new THREE.EdgesGeometry(geo, 12); descartar.push(arestas);
    const linhaMat = new THREE.LineBasicMaterial({ color: COR.ciano, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }); descartar.push(linhaMat);
    add(new THREE.LineSegments(arestas, linhaMat));
    anim.push((_, t) => { linhaMat.opacity = 0.55 + 0.15 * Math.sin(t * 0.9); });
  }
  // a BORDA entre o convés (a superelipse) e o casco: chapa no nível do piso e no do teto — fecha o vão por dentro
  for (const [y, cima] of [[-0.05, false], [6.95, true]] as const) {
    const sh = new THREE.Shape(PLANTA.map((p) => new THREE.Vector2(p.x, -p.z))), furo = new THREE.Path(contornoDoCasco(96).reverse().map((p) => new THREE.Vector2(p.x, -p.z))); sh.holes.push(furo);
    const geo = new THREE.ShapeGeometry(sh); geo.rotateX(-Math.PI / 2); geo.translate(0, y, 0); descartar.push(geo);
    add(new THREE.Mesh(geo, lambert({ color: cima ? 0x141526 : 0x1c1d30, emissive: 0x08081a, emissiveIntensity: 1, side: THREE.DoubleSide })));
  }
  // a MOLDURA do vão do mirante em magenta (embaixo e em cima)
  for (const i of [2, 3]) { const lista = PLANTA.map((p, k) => ({ p, k })).filter(({ p }) => p.z > zMirante - 1).map(({ k }) => aneis[i]![k]!.clone()).sort((a, b) => a.x - b.x);
    add(new THREE.Mesh(new THREE.TubeGeometry(polilinha(lista), 64, 0.14, 5, false), aditivo(COR.magenta, 0.95))); }

  // ── as FILEIRAS DE JANELAS acesas e as FAIXAS de neon pelos lados (cada aresta da planta, da cintura ao ombro) ──
  { const janelas = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.9, 0.42), aditivo(0xffffff, 0.8), 500), coresJ = [new THREE.Color(0xffe6b0), new THREE.Color(0xffe6b0), new THREE.Color(COR.magenta), new THREE.Color(COR.ciano), new THREE.Color(0xffe6b0)], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eixo = new THREE.Vector3(0, 1, 0); let n = 0;
    const faixas: THREE.Vector3[][] = [[], []];
    for (let k = 0; k < K; k++) {
      const a = PLANTA[k]!, b = PLANTA[(k + 1) % K]!; if (a.z > zMirante && b.z > zMirante) continue;
      const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz), nx = dz / L, nz = -dx / L, rumo = Math.atan2(nx, nz);
      q.setFromAxisAngle(eixo, rumo);
      for (let s = 1; s < L - 1; s += 1.6) for (const y of [1.6, 3.0, 4.4]) {
        if (((Math.round(s * 10) + y * 7 + k * 13) % 9) < 2 || n >= 500) continue;   // (umas apagadas, como prédio de noite)
        m4.compose(new THREE.Vector3(a.x + (dx / L) * s + nx * 0.06, y, a.z + (dz / L) * s + nz * 0.06), q, new THREE.Vector3(1, 1, 1)); janelas.setMatrixAt(n, m4); janelas.setColorAt(n, coresJ[(k * 7 + Math.round(s * 3) + y * 5) % coresJ.length]!); n++;
      }
      for (const [j, y] of [[0, 5.7], [1, 0.5]] as const) { const f = faixas[j]!; if (!f.length) f.push(new THREE.Vector3(a.x + nx * 0.08, y, a.z + nz * 0.08)); f.push(new THREE.Vector3(b.x + nx * 0.08, y, b.z + nz * 0.08)); }
    }
    janelas.count = n; add(janelas); descartar.push(janelas.geometry);
    faixas.forEach((f, j) => { if (f.length > 1) add(new THREE.Mesh(new THREE.TubeGeometry(polilinha(f), 220, 0.08, 4, false), aditivo(j ? COR.ciano : COR.magenta, 0.85))); }); }

  // ── a CIDADE do dorso: blocos empilhados (como prédios) com janelas, frisos de neon e os dutos ──
  { const predio = textura(256, 512, (x, w, h) => { x.fillStyle = "#1b1c2e"; x.fillRect(0, 0, w, h); for (let yy = 12; yy < h; yy += 22) for (let xx = 10; xx < w; xx += 18) { const r = ((xx * 7 + yy * 13) % 17); if (r < 6) continue; x.fillStyle = r < 9 ? "rgba(255,47,180,.75)" : r < 12 ? "rgba(69,240,255,.7)" : "rgba(255,230,176,.6)"; x.fillRect(xx, yy, 9, 9); } });
    predio.wrapS = predio.wrapT = THREE.RepeatWrapping;
    const blocoMat = lambert({ color: 0xffffff, map: predio, emissive: 0xffffff, emissiveMap: predio, emissiveIntensity: 0.9 });
    const topoMat = aditivo(COR.ciano, 0.85), topoMat2 = aditivo(COR.magenta, 0.85);
    const base = 10.4;
    for (const [w, h, d, x, z, mag] of [[16, 2.4, 24, 0, -16, 0], [7, 5, 9, -5, -24, 1], [6, 7, 6, 6, -24, 0], [5, 4, 8, -6, -6, 0], [7, 3, 7, 6, -2, 1], [4, 6, 4, -2, 2, 0]] as const) {
      const geo = new THREE.BoxGeometry(w, h, d); const uv = geo.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 6, uv.getY(i) * h / 6);
      const b = add(new THREE.Mesh(geo, blocoMat)); b.position.set(x, base + h / 2, z); descartar.push(geo);
      const tr = add(new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.12, d + 0.1), mag ? topoMat2 : topoMat)); tr.position.set(x, base + h, z);
    }
    // os DUTOS dos flancos (canos grossos com anéis acesos) e os DUTOS do dorso
    const cano = (pts: THREE.Vector3[], r: number) => { add(new THREE.Mesh(new THREE.TubeGeometry(polilinha(pts), 48, r, 8, false), metalClaro)); };
    for (const sx of [-1, 1]) { cano([new THREE.Vector3(sx * 20.8, -1.6, -30), new THREE.Vector3(sx * 21.6, -1.6, -18), new THREE.Vector3(sx * 21.3, -1.6, 22)], 0.45); cano([new THREE.Vector3(sx * 19.2, -2.6, -32), new THREE.Vector3(sx * 20, -2.6, 16)], 0.3);
      for (let z = -26; z < 20; z += 7) { const an = add(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 4, 12), aditivo(COR.ciano, 0.8))); an.position.set(sx * 21.4, -1.6, z); an.rotation.y = Math.PI / 2; } }
    for (const x of [-7, 7]) cano([new THREE.Vector3(x, base + 0.4, -34), new THREE.Vector3(x, base + 0.4, 10)], 0.35);
  }

  // ── os MOTORES na popa: duas naceles octogonais + o bocal central; o jato pulsa ──
  const zPopa = -43;
  const jatos: THREE.MeshBasicMaterial[] = [];
  const motor = (x: number, y: number, r: number, comp: number, cor: number) => {
    const m = add(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.15, comp, 8).rotateX(Math.PI / 2), metalClaro)); m.position.set(x, y, zPopa + comp * 0.15);
    for (const dz of [-comp * 0.25, comp * 0.1]) { const aro = add(new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, 0.08, 4, 8), aditivo(COR.ciano, 0.8))); aro.position.set(x, y, zPopa + comp * 0.15 + dz); aro.rotation.z = Math.PI / 8; }
    const bocal = add(new THREE.Mesh(new THREE.CircleGeometry(r * 0.9, 8), aditivo(cor, 0.95))); bocal.position.set(x, y, zPopa + comp * 0.15 - comp / 2 - 0.02); bocal.rotation.y = Math.PI;
    const jm = aditivo(cor, 0.35); jatos.push(jm);
    const jato = add(new THREE.Mesh(new THREE.ConeGeometry(r * 0.85, comp * 0.9, 12, 1, true).rotateX(-Math.PI / 2), jm)); jato.position.set(x, y, zPopa + comp * 0.15 - comp / 2 - comp * 0.45);
  };
  motor(-11, 0.5, 3.2, 16, COR.ciano); motor(11, 0.5, 3.2, 16, COR.ciano); motor(0, -1.6, 2.2, 10, COR.magenta);
  // os PILONES que ligam as naceles ao casco
  for (const sx of [-1, 1]) { const p = add(new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 9), metal)); p.position.set(sx * 8.4, 0.5, zPopa + 4); p.rotation.z = sx * -0.15; }
  anim.push((_, t) => jatos.forEach((m, k) => { m.opacity = 0.25 + 0.15 * Math.sin(t * 9 + k * 1.7) + 0.05 * Math.sin(t * 23 + k); }));

  // ── as ALETAS da popa (duas, inclinadas pra fora) ──
  for (const sx of [-1, 1]) {
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(-9, 0); sh.lineTo(-12, 7); sh.lineTo(-6.5, 7); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.5, bevelEnabled: false }); geo.translate(0, 0, -0.25); geo.rotateY(-Math.PI / 2);   // (a ponta varre pra trás) descartar.push(geo);
    const aleta = add(new THREE.Mesh(geo, metal)); aleta.position.set(sx * 9, 9, zPopa + 12); aleta.rotation.z = sx * -0.35;
    const borda = add(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 5.5), aditivo(COR.magenta, 0.9)), aleta); borda.position.set(0, 7, -9.25);
  }

  // ── a TORRE no dorso: o letreiro vertical ZAEON (dos dois lados) e as antenas com as luzes piscando ──
  { const tz = -12, torre = add(new THREE.Mesh(new THREE.BoxGeometry(5, 9, 7), metalClaro)); torre.position.set(0, 12.8 + 4.5, tz);
    const topo = add(new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.2, 8.5), metal)); topo.position.set(0, 22.4, tz);
    const letreiro = textura(256, 1024, (c, w, h) => { c.fillStyle = "#08020f"; c.fillRect(0, 0, w, h); c.textAlign = "center"; c.font = "900 170px system-ui,sans-serif"; c.shadowColor = "#ff2fb4"; c.shadowBlur = 30; c.fillStyle = "#ff5fd2"; "ZAEON".split("").forEach((l, i) => c.fillText(l, w / 2, 175 + i * 190)); });
    const lm = new THREE.MeshBasicMaterial({ map: letreiro }); descartar.push(lm);
    for (const sx of [-1, 1]) { const p = add(new THREE.Mesh(new THREE.PlaneGeometry(1.8, 7.2), lm)); p.position.set(sx * 2.52, 17.4, tz); p.rotation.y = sx * Math.PI / 2; }
    const pisca: THREE.MeshBasicMaterial[] = [];
    for (const [x, h, dz] of [[-1.8, 7, 2], [1.4, 10, -2], [0, 5, 3.5]] as const) {
      const ant = add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, h, 5), metalClaro)); ant.position.set(x, 23 + h / 2, tz + dz);
      const lm2 = aditivo(0xff3030, 0.9); pisca.push(lm2); const l = add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), lm2)); l.position.set(x, 23 + h, tz + dz);
    }
    anim.push((_, t) => pisca.forEach((m, k) => { m.opacity = (Math.sin(t * 2.4 + k * 2.1) > 0.6 ? 0.95 : 0.1); })); }

  // ── os PAINÉIS holográficos nos flancos (o anúncio com glitch) ──
  const anuncio = textura(1024, 512, (c, w, h) => {
    c.fillStyle = "rgba(10,2,24,0.55)"; c.fillRect(0, 0, w, h);
    c.strokeStyle = "#45f0ff"; c.lineWidth = 8; c.strokeRect(10, 10, w - 20, h - 20);
    c.font = "900 150px system-ui,sans-serif"; c.textAlign = "center";
    for (const [dx, cor] of [[-6, "#ff2fb4"], [6, "#45f0ff"], [0, "#ffffff"]] as const) { c.fillStyle = cor; c.fillText("ZAEON", w / 2 + dx, 210); }
    c.font = "700 64px system-ui,sans-serif"; c.fillStyle = "#ff5fd2"; c.fillText("宇宙 · 共働 · COWORK", w / 2, 330);
    c.font = "500 34px system-ui,sans-serif"; c.fillStyle = "#b98cff"; c.fillText("estude · construa · entregue", w / 2, 410);
    c.globalAlpha = 0.18; c.fillStyle = "#45f0ff"; for (let y = 0; y < h; y += 6) c.fillRect(0, y, w, 2); c.globalAlpha = 1;
  });
  const anuncioMat = new THREE.MeshBasicMaterial({ map: anuncio, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); descartar.push(anuncioMat);
  const paineis: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) { const p = add(new THREE.Mesh(new THREE.PlaneGeometry(16, 8), anuncioMat)); p.position.set(sx * 22.4, 3.6, 2); p.rotation.y = sx * Math.PI / 2; paineis.push(p); }
  anim.push((_, t) => { const glitch = Math.sin(t * 13) > 0.97; anuncioMat.opacity = glitch ? 0.4 : 0.88; paineis.forEach((p) => { p.position.y = 4.2 + (glitch ? 0.15 : 0); }); });

  // ── as LUZES DE NAVEGAÇÃO (bombordo vermelho, estibordo verde, o strobo branco) e o BRILHO de flutuação embaixo ──
  { const nav: [number, number, THREE.MeshBasicMaterial][] = [];
    for (const [x, c] of [[-21.4, 0xff3040], [21.4, 0x30ff80]] as const) { const m = aditivo(c, 0.9); nav.push([x, 0, m]); const l = add(new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), m)); l.position.set(x, 6.4, 27); }
    const strobo = aditivo(0xffffff, 0); const s = add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), strobo)); s.position.set(0, 23.2, -16);
    anim.push((_, t) => { strobo.opacity = (t % 1.6) < 0.08 ? 1 : 0; nav.forEach(([, , m], k) => { m.opacity = 0.6 + 0.35 * Math.sin(t * 1.5 + k * Math.PI); }); }); }
  { const halo = textura(256, 256, (c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, "rgba(255,47,180,0.55)"); gr.addColorStop(0.5, "rgba(120,60,255,0.18)"); gr.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gr; c.fillRect(0, 0, w, w); });
    const hm = new THREE.MeshBasicMaterial({ map: halo, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); descartar.push(hm);
    const h = add(new THREE.Mesh(new THREE.PlaneGeometry(34, 70), hm)); h.rotation.x = -Math.PI / 2; h.position.y = -7.5;
    anim.push((_, t) => { hm.opacity = 0.7 + 0.2 * Math.sin(t * 1.2); }); }

  return {
    group: g,
    atualizar(dt, t) { for (const f of anim) f(dt, t); },
    dispose() { g.traverse((x) => { const m = x as THREE.Mesh; if (m.isMesh || (x as THREE.LineSegments).isLineSegments) m.geometry?.dispose(); }); for (const d of descartar) d.dispose(); g.removeFromParent(); },
  };
}
