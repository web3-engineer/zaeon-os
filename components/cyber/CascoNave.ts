/**
 * CascoNave — o lado de FORA da nave coworking (nov/2026, o dono: "sem nome, nada de coisas feiosas — algo mais
 * aesthetic, de 2 andares"). Um IATE ESPACIAL liso que envolve o convés (lib/cyber/naveCoworking) sem mexer nele:
 *  - o 1º ANDAR é o casco grande, em volta do coworking: a quilha arredondada embaixo, a FITA DE VIDRO aceso correndo
 *    pelos lados (rosa → lavanda → ciano) e o MIRANTE aberto na proa (a janela de dentro olha pro espaço por ali);
 *  - em cima dele, o TERRAÇO (o teto do 1º andar com o friso de luz) e o 2º ANDAR, mais curto e recuado pra popa, com
 *    a fita de vidro dele dando a volta inteira;
 *  - na popa, dois MOTORES em cápsula com o brilho suave e o rastro; duas aletas finas varridas pra trás.
 * O casco é um shader só (gradiente perolado de baixo pra cima + a borda iridescente pelo ângulo de visão), sem luz de
 * cena. Mesmo referencial do convés (+z = proa, y = 0 no piso).
 */
import * as THREE from "three";
import { ANDAR2, ESCADA_CW, NAVE_COWORK, area, contornoDoCasco } from "@/lib/cyber/naveCoworking";

export type CascoHandle = { group: THREE.Group; atualizar(dt: number, t: number): void; dispose(): void };

const N = NAVE_COWORK;
/** um anel do casco: a superelipse do convés escalada (`s`) na altura `y` */
type Anel = { y: number; s: number };
/** o 1º andar (o convés do coworking): a quilha, a cintura, a fita de vidro e o ombro */
const ANDAR1: Anel[] = [{ y: -4.6, s: 0.42 }, { y: -3.3, s: 0.78 }, { y: -1.6, s: 0.97 }, { y: -0.2, s: 1.045 }, { y: 1.3, s: 1.05 }, { y: 4.7, s: 1.05 }, { y: 7.0, s: 1.04 }, { y: 7.7, s: 1.0 }];
const FITA1 = [4, 5] as const;   // (entre esses anéis, a fita de vidro)
/** o 2º andar: uma superelipse menor, recuada pra popa, em cima do terraço */
const DECK2 = ANDAR2;
const ANDAR_2: Anel[] = [{ y: 7.7, s: 1.0 }, { y: 8.0, s: 1.03 }, { y: 11.4, s: 1.03 }, { y: 12.2, s: 0.93 }, { y: 12.8, s: 0.66 }];
const FITA2 = [1, 2] as const;

const VERT = `varying vec3 vN; varying vec3 vV; varying float vY; varying vec2 vUv;
void main(){ vec4 w = modelMatrix * vec4(position,1.); vY = position.y; vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`;
/** o casco perolado: gradiente da quilha (violeta fundo) ao dorso (pérola lilás) + a borda iridescente */
const FRAG_CASCO = `uniform float uT; varying vec3 vN; varying vec3 vV; varying float vY;
void main(){
  float k = smoothstep(-5., 13., vY);
  vec3 base = mix(vec3(.07,.04,.16), vec3(.66,.6,.88), k);
  float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 2.4);
  vec3 iri = mix(vec3(1.,.42,.82), vec3(.35,.92,1.), .5 + .5 * sin(vY * .35 + uT * .25 + vN.x * 2.));
  float topo = smoothstep(.55, 1., vN.y) * .05;
  vec3 fora = base * (.55 + .45 * max(vN.y, 0.)) + iri * f * .9 + topo;
  vec3 dentro = mix(vec3(.05,.03,.11), vec3(.14,.09,.26), smoothstep(7., 13., vY)) + iri * f * .12;   // (visto de dentro: o forro escuro do lounge)
  gl_FragColor = vec4(gl_FrontFacing ? fora : dentro, 1.);
}`;
/** a fita de vidro aceso: o degradê correndo pelo casco, os montantes finos e um brilho que passa devagar */
const FRAG_FITA = `uniform float uT; varying vec2 vUv;
void main(){
  float u = vUv.x, v = vUv.y;
  vec3 a = vec3(1.,.45,.85), b = vec3(.72,.55,1.), c = vec3(.4,.92,1.);
  float s = fract(u * .012 + uT * .01);
  vec3 cor = s < .5 ? mix(a, b, s * 2.) : mix(b, c, (s - .5) * 2.);
  float borda = smoothstep(0., .08, v) * smoothstep(1., .92, v);
  float montante = smoothstep(.0, .04, abs(fract(u / 3.2) - .5) * 2. - .02) ;
  float passa = .25 * exp(-pow(fract(u * .01 - uT * .05) - .5, 2.) * 400.);
  gl_FragColor = vec4(cor * (.55 + .45 * v) * borda * (.82 + .18 * montante) + passa, 1.);
}`;
/** o VIDRO do lounge de cima: transparente no meio (a vista 360°), o degradê só nas bordas e nos montantes */
const FRAG_VIDRO = `uniform float uT; varying vec2 vUv;
void main(){
  float u = vUv.x, v = vUv.y;
  vec3 cor = mix(vec3(1.,.45,.85), vec3(.4,.92,1.), .5 + .5 * sin(u * .08 + uT * .2));
  float borda = 1. - smoothstep(0., .12, v) * smoothstep(1., .88, v);
  float montante = 1. - smoothstep(.0, .025, abs(fract(u / 4.) - .5) * 2. - .01);
  float a = clamp(.12 + borda * .8 + montante * .5, 0., .95);
  gl_FragColor = vec4(cor * (.6 + .4 * borda), a);
}`;

export function criarCascoNave(o: { low: boolean }): CascoHandle {
  const g = new THREE.Group(), anim: ((dt: number, t: number) => void)[] = [], descartar: { dispose(): void }[] = [];
  const add = <T extends THREE.Object3D>(x: T, pai: THREE.Object3D = g) => { pai.add(x); return x; };
  const uT = { value: 0 };
  const shader = (frag: string) => { const m = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms: { uT }, side: THREE.DoubleSide }); descartar.push(m); return m; };
  const casco = shader(FRAG_CASCO), fita = shader(FRAG_FITA), vidro2 = shader(FRAG_VIDRO); vidro2.transparent = true; vidro2.depthWrite = false;
  const aditivo = (c: THREE.ColorRepresentation, op: number) => { const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); descartar.push(m); return m; };
  const textura = (w: number, h: number, pinta: (x: CanvasRenderingContext2D, w: number, h: number) => void) => { const c = document.createElement("canvas"); c.width = w; c.height = h; pinta(c.getContext("2d")!, w, h); const t = new THREE.CanvasTexture(c); descartar.push(t); return t; };
  const K = o.low ? 64 : 128, zMirante = area("mirante").z0;

  /** costura os anéis num casco liso; `vao(i, p)` pula a faixa i naquele ponto (o mirante); a fita sai à parte */
  const loft = (contorno: { x: number; z: number }[], aneis: Anel[], dz: number, faixaFita: readonly [number, number], vao: (i: number, p: { x: number; z: number }) => boolean, tampa: boolean, matFita: THREE.Material = fita) => {
    const pts = aneis.map((a) => contorno.map((p) => new THREE.Vector3(p.x * a.s, a.y, p.z * a.s + dz)));
    const arco: number[] = [0]; for (let k = 1; k <= contorno.length; k++) { const a = contorno[k - 1]!, b = contorno[k % contorno.length]!; arco.push(arco[k - 1]! + Math.hypot(b.x - a.x, b.z - a.z)); }
    const corpo = { v: [] as number[], uv: [] as number[], i: [] as number[] }, vidro = { v: [] as number[], uv: [] as number[], i: [] as number[] };
    for (let i = 0; i < aneis.length - 1; i++) {
      const alvo = i === faixaFita[0] ? vidro : corpo;
      for (let k = 0; k < contorno.length; k++) {
        const k2 = (k + 1) % contorno.length; if (vao(i, contorno[k]!) && vao(i, contorno[k2]!)) continue;
        const a = pts[i]![k]!, b = pts[i]![k2]!, c = pts[i + 1]![k2]!, d = pts[i + 1]![k]!, n = alvo.v.length / 3;
        alvo.v.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z);
        alvo.uv.push(arco[k]!, 0, arco[k + 1]!, 0, arco[k + 1]!, 1, arco[k]!, 1);
        alvo.i.push(n, n + 2, n + 1, n, n + 3, n + 2);
      }
    }
    if (tampa) { const topo = pts[pts.length - 1]!, c = new THREE.Vector3(0, aneis[aneis.length - 1]!.y, dz), n0 = corpo.v.length / 3; corpo.v.push(c.x, c.y, c.z); corpo.uv.push(0, 0);
      topo.forEach((p) => { corpo.v.push(p.x, p.y, p.z); corpo.uv.push(0, 0); }); for (let k = 0; k < topo.length; k++) corpo.i.push(n0, n0 + 1 + ((k + 1) % topo.length), n0 + 1 + k); }
    { const fundo = pts[0]!, c = new THREE.Vector3(0, aneis[0]!.y, dz), n0 = corpo.v.length / 3; corpo.v.push(c.x, c.y, c.z); corpo.uv.push(0, 0);
      fundo.forEach((p) => { corpo.v.push(p.x, p.y, p.z); corpo.uv.push(0, 0); }); for (let k = 0; k < fundo.length; k++) corpo.i.push(n0, n0 + 1 + k, n0 + 1 + ((k + 1) % fundo.length)); }
    for (const [m, mat] of [[corpo, casco], [vidro, matFita]] as const) {
      if (!m.v.length) continue;
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(m.v, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(m.uv, 2)); geo.setIndex(m.i); geo.computeVertexNormals(); descartar.push(geo);
      add(new THREE.Mesh(geo, mat));
    }
    return pts;
  };

  // ── o 1º ANDAR: o casco grande (o mirante aberto na proa, da cintura ao ombro) ──
  const contorno1 = contornoDoCasco(K);
  const vaoMirante = (i: number, p: { z: number }) => i >= 3 && i <= 5 && p.z > zMirante;
  const pts1 = loft(contorno1, ANDAR1, 0, FITA1, vaoMirante, false);
  // a BORDA entre o convés e o casco, no piso e no teto (fecha o vão por dentro; o de cima é o TERRAÇO)
  for (const [y, s] of [[-0.05, 1.045], [7.7, 1.0]] as const) {
    const sh = new THREE.Shape(contornoDoCasco(96).map((p) => new THREE.Vector2(p.x * s, -p.z * s)));
    if (y < 0) sh.holes.push(new THREE.Path(contornoDoCasco(96).reverse().map((p) => new THREE.Vector2(p.x, -p.z))));
    else { const f = new THREE.Path(); f.absarc(ESCADA_CW.cx, -ESCADA_CW.cz, ESCADA_CW.rOut + 0.15, 0, Math.PI * 2, true); sh.holes.push(f); }
    const geo = new THREE.ShapeGeometry(sh, 32); geo.rotateX(-Math.PI / 2); geo.translate(0, y, 0); descartar.push(geo);
    add(new THREE.Mesh(geo, y < 0 ? casco : new THREE.MeshBasicMaterial({ color: 0x1a1030 })));
    if (y > 0) descartar.push((g.children[g.children.length - 1] as THREE.Mesh).material as THREE.Material);
  }
  // a moldura do mirante (embaixo e em cima do vão) e os frisos finos de luz: a cintura e a borda do terraço
  const linha = (pts: THREE.Vector3[], r: number, cor: number, op: number, fechada = false) => add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, fechada), Math.max(64, pts.length * 2), r, 5, fechada), aditivo(cor, op)));
  for (const i of [3, 6]) linha(pts1[i]!.filter((_, k) => contorno1[k]!.z > zMirante - 0.5).sort((a, b) => a.x - b.x), 0.09, 0xffb8f0, 0.9);
  linha(pts1[2]!.map((p) => p.clone().multiplyScalar(1.003)), 0.05, 0x8fe8ff, 0.7, true);
  linha(contornoDoCasco(K).map((p) => new THREE.Vector3(p.x, 7.75, p.z)), 0.06, 0xd8b8ff, 0.85, true);

  // ── o 2º ANDAR: a superelipse menor, recuada pra popa ──
  const contorno2 = contornoDoCasco(K).map((p) => ({ x: (p.x / N.a) * DECK2.a, z: (p.z / N.b) * DECK2.b }));
  const porta = (i: number, p: { x: number; z: number }) => i <= FITA2[0] && p.z > DECK2.b * 0.6 && Math.abs(p.x) < DECK2.porta.meia;   // (a porta do terraço, na proa do lounge)
  loft(contorno2, ANDAR_2, DECK2.z, FITA2, porta, true, vidro2);
  { const pf = add(new THREE.Mesh(new THREE.TorusGeometry(DECK2.porta.meia, 0.06, 6, 32, Math.PI), aditivo(0xffb8f0, 0.9))); pf.position.set(0, ANDAR_2[FITA2[1]]!.y - DECK2.porta.meia * 0.2, DECK2.z + DECK2.b * 1.03); pf.scale.y = 0.4; }
  linha(contorno2.filter((p) => !(p.z > DECK2.b * 0.6 && Math.abs(p.x) < DECK2.porta.meia + 0.3)).map((p) => new THREE.Vector3(p.x * 1.035, 8.0, p.z * 1.035 + DECK2.z)), 0.05, 0xffb8f0, 0.8, false);

  // ── os MOTORES em cápsula na popa (o brilho suave + o rastro) e as ALETAS finas ──
  const brilho = textura(256, 256, (c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(150,230,255,.8)"); gr.addColorStop(0.6, "rgba(185,140,255,.25)"); gr.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gr; c.fillRect(0, 0, w, w); });
  const rastroTex = textura(64, 512, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(150,230,255,.85)"); gr.addColorStop(0.3, "rgba(185,140,255,.35)"); gr.addColorStop(1, "rgba(255,110,210,0)"); c.fillStyle = gr; c.fillRect(0, 0, w, h); const lg = c.createLinearGradient(0, 0, w, 0); lg.addColorStop(0, "rgba(0,0,0,1)"); lg.addColorStop(0.5, "rgba(0,0,0,0)"); lg.addColorStop(1, "rgba(0,0,0,1)"); c.globalCompositeOperation = "destination-out"; c.fillStyle = lg; c.fillRect(0, 0, w, h); });
  const brilhoMat = new THREE.SpriteMaterial({ map: brilho, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }); descartar.push(brilhoMat);
  const rastroMat = new THREE.MeshBasicMaterial({ map: rastroTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); descartar.push(rastroMat);
  const zMotor = -N.b - 1.5;
  for (const sx of [-1, 1]) {
    const pod = add(new THREE.Mesh(new THREE.CapsuleGeometry(2.3, 9, 8, o.low ? 16 : 32).rotateX(Math.PI / 2), casco)); pod.position.set(sx * 13.5, 1.2, zMotor + 3);
    const aro = add(new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.08, 6, 48), aditivo(0x8fe8ff, 0.9))); aro.position.set(sx * 13.5, 1.2, zMotor - 3.6);
    const spr = add(new THREE.Sprite(brilhoMat)); spr.position.set(sx * 13.5, 1.2, zMotor - 4.4); spr.scale.set(6, 6, 1);
    for (const r of [0, Math.PI / 2]) { const rs = add(new THREE.Mesh(new THREE.PlaneGeometry(3.2, 22).rotateX(-Math.PI / 2).translate(0, 0, -11), rastroMat)); rs.position.set(sx * 13.5, 1.2, zMotor - 4.6); rs.rotation.z = r; }
    const pilone = add(new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 7, 1, 1, 1), casco)); pilone.position.set(sx * 11, 1.2, zMotor + 4);
    // a aleta: fina, varrida pra trás, saindo do 2º andar
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(-3, 0.3, -9, 0); sh.lineTo(-12.5, 4.6); sh.quadraticCurveTo(-8, 4.2, -5.5, 3.6); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.25, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 3, curveSegments: 12 }); geo.translate(0, 0, -0.125); geo.rotateY(-Math.PI / 2); descartar.push(geo);
    const aleta = add(new THREE.Mesh(geo, casco)); aleta.position.set(sx * 8.5, 11.2, DECK2.z - DECK2.b + 9); aleta.rotation.z = sx * -0.42;
  }
  anim.push((_, t) => { rastroMat.opacity = 0.75 + 0.15 * Math.sin(t * 6) + 0.05 * Math.sin(t * 17); });

  // ── o BRILHO de flutuação embaixo (um halo suave) ──
  { const halo = textura(256, 256, (c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, "rgba(255,110,210,.5)"); gr.addColorStop(0.5, "rgba(140,120,255,.16)"); gr.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gr; c.fillRect(0, 0, w, w); });
    const hm = new THREE.MeshBasicMaterial({ map: halo, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); descartar.push(hm);
    const h = add(new THREE.Mesh(new THREE.PlaneGeometry(36, 80), hm)); h.rotation.x = -Math.PI / 2; h.position.y = -6;
    anim.push((_, t) => { hm.opacity = 0.75 + 0.2 * Math.sin(t * 1.1); }); }

  return {
    group: g,
    atualizar(_dt, t) { uT.value = t; for (const f of anim) f(_dt, t); },
    dispose() { g.traverse((x) => { const m = x as THREE.Mesh; if (m.isMesh) m.geometry?.dispose(); }); for (const d of descartar) d.dispose(); g.removeFromParent(); },
  };
}
