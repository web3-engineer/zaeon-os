/**
 * Moto — a MOTO VOADORA de corrida (hover bike). Uma moto de verdade, não um bloco: CASCO esculpido em seções (afina no
 * bico e na rabeta, tanque alto, cintura fina embaixo do banco), garfo dianteiro inclinado, balança traseira, o MOTOR
 * exposto entre as pernas, semi-guidão baixo e pedaleiras recuadas (o piloto vai DEITADO na moto, em posição de
 * corrida). SEM RODAS: dois PODS de sustentação (cápsulas com propulsores pra baixo) onde ficariam as rodas, presos
 * pelo garfo e pela balança. Três carenagens (uma por vaga, `estilo`) no mesmo esqueleto — o avatar encaixa igual em qualquer uma:
 *  - 0 RAIO (esportiva): bico afiado, tanque alto, rabeta pontuda subindo, aletas no nariz;
 *  - 1 TUBARÃO (robusta): casco largo e quadrado, tomadas de ar no nariz, barbatana dorsal, guelras de luz;
 *  - 2 GOTA (arredondada): casco em gota contínua, calotas nos aros, anéis de luz na cintura.
 * Pintura na cor da vaga (clara, metálica), detalhes escuros, frisos de luz, farol de LED e lanterna.
 * PROPULSORES com CHAMA de verdade (shader) que ESQUENTA com a velocidade (`calor`, com inércia — leva ~1,5 s pra
 * esquentar e mais pra esfriar): fria, curta e na cor da moto; esquentando, cresce e passa pelo laranja, pelo branco e
 * chega no PLASMA azulado (com os "diamantes de choque" correndo). Junto: os BOCAIS ficam incandescentes, um HALO acende
 * na saída, o miolo do motor clareia, e atrás sai um RASTRO de energia (fita no mundo) e FAÍSCAS.
 * BARREIRA DO SOM (lib/cyber/motoFisica `rompeuBarreira`: ACENDER o boost acima dos 300 km/h): no instante em que
 * rompe, um CONE DE VAPOR dá um clarão em volta da moto e uma ONDA DE CHOQUE (anel + casca) se abre no mundo, onde a moto
 * estava, e fica pra trás; enquanto o boost durar, o cone fica (a nuvem de Prandtl-Glauert: borda branca, anéis correndo
 * pra trás), mais forte quanto mais perto dos 1000 km/h.
 * SETAS âmbar nos 4 cantos: piscam do lado da curva (o engine manda qual lado está aceso).
 * Frente = +z local (o mesmo rumo do voo). Voando: INCLINA nas curvas e aponta o nariz com a subida/descida; parada,
 * flutua de leve. `assento` = onde o avatar senta (montado).
 */
import * as THREE from "three";
import { fundirEstaticos } from "./lotes";
import { ESCALA_MOTO, MOTO } from "@/lib/cyber/motos";
import { rompeuBarreira, supersonico } from "@/lib/cyber/motoFisica";

/** a BORDA brilhante (fresnel) do cone de vapor e da casca da onda de choque: `uA` = intensidade, `uAneis` = anéis
 *  correndo (o cone) */
function materialVapor(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uA: { value: 0 }, uT: { value: 0 }, uAneis: { value: 1 } },
    vertexShader: `
      varying float vBorda; varying vec2 vUv;
      void main() {
        vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vBorda = 1.0 - abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uA, uT, uAneis; varying float vBorda; varying vec2 vUv;
      void main() {
        float aneis = mix(1.0, 0.55 + 0.45 * smoothstep(0.3, 1.0, sin(vUv.y * 38.0 + uT * 46.0)), uAneis);
        float pontas = uAneis > 0.5 ? smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.8, vUv.y) : 1.0;   // o cone some nas pontas
        float a = pow(vBorda, 2.2) * aneis * pontas * uA;
        gl_FragColor = vec4(vec3(0.82, 0.92, 1.0) * a, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}

export type MotoHandle = {
  group: THREE.Group;
  /** ponto do banco (o QUADRIL do avatar montado vai aqui) */
  assento: THREE.Object3D;
  /** onde as mãos e os pés do piloto encaixam (IK): punhos do guidão e pedaleiras — E = esquerda do piloto (+x) */
  pontos: { maoE: THREE.Object3D; maoD: THREE.Object3D; peE: THREE.Object3D; peD: THREE.Object3D };
  /** o que dá pra clicar (montar) */
  alvos: THREE.Object3D[];
  /** `vel` = velocidade em m/s (esquenta a propulsão); `inclina` (rad, a da pilotagem — lib/cyber/motoFisica) manda na
   *  rolagem; sem ela, sai do giro (`curva`, motos dos outros). `boost` (0..1) estica as chamas; `seta` = o pisca ACESO
   *  agora (−1 esquerda, 1 direita, 0 apagado) */
  atualizar(o: { dt: number; t: number; voando: boolean; vel: number; curva: number; vy?: number; inclina?: number; boost?: number; seta?: number }): void;
  dispose(): void;
};

/** junta as peças PARADAS da moto num lote por material (components/cyber/lotes): a simulação passa pelos estados
 *  (parada, voando devagar e a toda, inclinando, boost, pisca) pra achar o que se mexe; os alvos de clique ficam como
 *  estão. (Os efeitos de MUNDO — rastro, faíscas, onda de choque — nascem depois, quando a moto já está na cena.) */
export function loteMoto(h: MotoHandle): MotoHandle {
  const manter: THREE.Object3D[] = []; for (const a of h.alvos) a.traverse((n) => { manter.push(n); });
  fundirEstaticos(h.group, { passo: (k, t) => h.atualizar({ dt: 1 / 30, t, voando: k % 2 === 0, vel: (k % 4) * 40, curva: Math.sin(t), vy: Math.cos(t) * 5, boost: k % 3 === 0 ? 1 : 0, seta: (k % 3) - 1 }), manter });
  return h;
}

export const ESTILOS_MOTO = ["raio", "tubarao", "gota"] as const;

/** a TEMPERATURA da propulsão (0 fria .. 1 incandescente): a cor da moto → laranja → branco-amarelo → plasma azulado.
 *  A mesma rampa no shader (GLSL) e no JS (bocais, halo, rastro) */
const RAMPA_GLSL = `
  vec3 temperatura(float h, vec3 cor) {
    vec3 b = vec3(1.0, 0.42, 0.1), c = vec3(1.0, 0.82, 0.45), d = vec3(0.5, 0.72, 1.0);
    return h < 0.35 ? mix(cor, b, h / 0.35) : h < 0.7 ? mix(b, c, (h - 0.35) / 0.35) : mix(c, d, clamp((h - 0.7) / 0.3, 0.0, 1.0));
  }`;
const LARANJA = new THREE.Color(1, 0.42, 0.1), AMARELO = new THREE.Color(1, 0.82, 0.45), PLASMA = new THREE.Color(0.5, 0.72, 1);
function temperatura(h: number, cor: THREE.Color, out: THREE.Color): THREE.Color {
  return h < 0.35 ? out.copy(cor).lerp(LARANJA, h / 0.35) : h < 0.7 ? out.copy(LARANJA).lerp(AMARELO, (h - 0.35) / 0.35) : out.copy(AMARELO).lerp(PLASMA, Math.min(1, (h - 0.7) / 0.3));
}

type UniChama = { uT: { value: number }; uBoost: { value: number }; uCalor: { value: number } };
/** a CHAMA (aditiva, sem textura): `camada` 0 = o corpo, 1 = o miolo branco curto, 2 = a AURA larga e colorida em volta
 *  do jato principal (o volume do calor); uT/uBoost/uCalor compartilhados pela moto toda */
function materialChama(cor: THREE.Color, camada: 0 | 1 | 2, u: UniChama) {
  return new THREE.ShaderMaterial({
    uniforms: { uT: u.uT, uBoost: u.uBoost, uCalor: u.uCalor, uCor: { value: cor }, uNucleo: { value: camada } },
    vertexShader: `
      uniform float uT, uCalor; varying vec2 vUv; varying float vFrente;
      void main() {
        vUv = uv; vec3 p = position;
        // tremula: a chama "respira" de lado, mais na ponta — e mais nervosa quente
        float tremor = 1.0 + (0.1 + 0.12 * uCalor) * sin(uT * (35.0 + 30.0 * uCalor) + p.y * 13.0) * uv.y + 0.06 * sin(uT * 67.0 + p.y * 29.0);
        p.xz *= tremor;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vFrente = pow(abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz))), 1.4);   // borda some macia
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uT, uBoost, uNucleo, uCalor; uniform vec3 uCor; varying vec2 vUv; varying float vFrente;
      ${RAMPA_GLSL}
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float ruido(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        float y = vUv.y;   // 0 = bocal, 1 = ponta
        float q = clamp(uCalor + 0.3 * uBoost, 0.0, 1.0), vel = 8.0 + 16.0 * q;
        float n = ruido(vec2(vUv.x * 7.0, y * 5.0 - uT * vel)) * 0.6 + ruido(vec2(vUv.x * 15.0, y * 11.0 - uT * vel * 1.7)) * 0.4;
        float corpo = pow(1.0 - y, 1.6 - 0.6 * q) * (0.55 + 0.75 * n) * vFrente;
        // a COR é a temperatura: mais quente perto do bocal, esfriando pra ponta
        vec3 c = temperatura(clamp(q * (1.0 - 0.5 * y) + 0.12 * (1.0 - y), 0.0, 1.0), uCor);
        if (uNucleo > 1.5) { c = temperatura(q * 0.75, uCor) * 1.2; corpo = pow(1.0 - y, 2.2) * (0.6 + 0.4 * n) * pow(vFrente, 2.0) * q * 0.55; gl_FragColor = vec4(c * corpo, corpo); return; }   // a AURA
        if (uNucleo > 0.5) { c = mix(vec3(1.0), temperatura(min(1.0, q + 0.35), uCor), y); corpo *= (0.25 + 1.3 * q) * (1.0 - smoothstep(0.0, 0.55, y)); }
        // quente (e no boost): DIAMANTES DE CHOQUE (anéis brilhantes correndo pela chama)
        float choque = max(uBoost, smoothstep(0.72, 1.0, uCalor));
        corpo += choque * smoothstep(0.82, 1.0, sin(y * 26.0 - uT * 34.0)) * (1.0 - y) * 0.9 * vFrente;
        corpo *= (0.16 + 0.8 * q) * mix(1.0, 0.85, uBoost);   // esquenta = acende; aditiva e em camadas: sem o teto, satura em branco
        gl_FragColor = vec4(c * corpo, corpo);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}

/** uma SEÇÃO do casco: em `z`, meia-largura `w`, topo `yt`, fundo `yb`; `p` = expoente da superelipse (2 = elipse,
 *  maior = mais quadrada) */
type Secao = { z: number; w: number; yt: number; yb: number; p?: number };
/** o CASCO: as seções interpoladas (Catmull-Rom) ao longo de z e costuradas num tubo fechado nas pontas */
function casco(secoes: Secao[], low: boolean): THREE.BufferGeometry {
  const n = low ? 12 : 22, m = low ? 22 : 48, campos = ["w", "yt", "yb", "p"] as const;
  const cr = (a: number, b: number, c: number, d: number, t: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  const amostra = (u: number): Required<Secao> => {   // u 0..1 ao longo das seções (por índice)
    const f = u * (secoes.length - 1), i = Math.min(secoes.length - 2, Math.floor(f)), t = f - i;
    const S = (k: number) => secoes[Math.max(0, Math.min(secoes.length - 1, k))]!;
    const r = { z: S(i).z + (S(i + 1).z - S(i).z) * t } as Required<Secao>;
    for (const c of campos) r[c] = cr(S(i - 1)[c] ?? 2, S(i)[c] ?? 2, S(i + 1)[c] ?? 2, S(i + 2)[c] ?? 2, t);
    r.w = Math.max(0.004, r.w); return r;
  };
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let a = 0; a <= m; a++) {
    const s = amostra(a / m), yc = (s.yt + s.yb) / 2, h = Math.max(0.004, (s.yt - s.yb) / 2), e = 2 / s.p;
    for (let k = 0; k <= n; k++) {
      const f = (k / n) * Math.PI * 2, c = Math.cos(f), sn = Math.sin(f);
      pos.push(s.w * Math.sign(c) * Math.abs(c) ** e, yc + h * Math.sign(sn) * Math.abs(sn) ** e, s.z); uv.push(k / n, a / m);
    }
  }
  for (let a = 0; a < m; a++) for (let k = 0; k < n; k++) { const i0 = a * (n + 1) + k, i1 = i0 + n + 1; idx.push(i0, i1, i0 + 1, i0 + 1, i1, i1 + 1); }
  // tampas: um leque em cada ponta (as pontas já são finas — a tampa quase não aparece)
  for (const [a, sentido] of [[0, 1], [m, -1]] as const) {
    const s = amostra(a / m), c = pos.length / 3; pos.push(0, (s.yt + s.yb) / 2, s.z); uv.push(0.5, a / m);
    for (let k = 0; k < n; k++) { const i0 = a * (n + 1) + k; if (sentido > 0) idx.push(c, i0 + 1, i0); else idx.push(c, i0, i0 + 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals(); return g;
}

/** o HALO (mancha radial) da saída dos propulsores e das faíscas (um só pra todas as motos) */
let texHalo: THREE.CanvasTexture | null = null;
function haloDeCalor(): THREE.CanvasTexture | null {
  if (texHalo || typeof document === "undefined") return texHalo;
  const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"); if (!x) return null;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, "rgba(255,255,255,0.55)"); g.addColorStop(0.6, "rgba(255,255,255,0.12)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  texHalo = new THREE.CanvasTexture(c); texHalo.colorSpace = THREE.SRGBColorSpace; return texHalo;
}

/** as SEÇÕES de cada carenagem (z = frente; o banco fica por cima de z −0,1..−0,9, com o topo do casco ali ≤ 1,04) */
const CASCOS: Record<(typeof ESTILOS_MOTO)[number], Secao[]> = {
  // FINO (a perna do piloto passa por fora) e ABERTO embaixo no meio (o fundo sobe entre z 0,7 e −0,6: o MOTOR fica à mostra)
  raio: [
    { z: 1.82, w: 0.012, yt: 0.99, yb: 0.95, p: 2.2 }, { z: 1.58, w: 0.1, yt: 1.06, yb: 0.88, p: 2.2 }, { z: 1.2, w: 0.16, yt: 1.14, yb: 0.86, p: 2.4 },
    { z: 0.72, w: 0.19, yt: 1.22, yb: 0.96, p: 2.4 }, { z: 0.3, w: 0.19, yt: 1.24, yb: 1.03, p: 2.4 }, { z: -0.05, w: 0.14, yt: 1.08, yb: 0.99, p: 2.4 },
    { z: -0.55, w: 0.12, yt: 1.02, yb: 0.97, p: 2.4 }, { z: -1.02, w: 0.13, yt: 1.2, yb: 1.0, p: 2.4 }, { z: -1.45, w: 0.09, yt: 1.3, yb: 1.11, p: 2.4 },
    { z: -1.74, w: 0.018, yt: 1.31, yb: 1.25, p: 2.2 },
  ],
  tubarao: [
    { z: 1.74, w: 0.05, yt: 1.0, yb: 0.87, p: 3 }, { z: 1.55, w: 0.17, yt: 1.1, yb: 0.82, p: 3.2 }, { z: 1.1, w: 0.22, yt: 1.17, yb: 0.84, p: 3.4 },
    { z: 0.6, w: 0.23, yt: 1.23, yb: 0.95, p: 3.4 }, { z: 0.2, w: 0.22, yt: 1.23, yb: 1.03, p: 3.4 }, { z: -0.08, w: 0.16, yt: 1.08, yb: 0.99, p: 3 },
    { z: -0.55, w: 0.14, yt: 1.02, yb: 0.96, p: 3 }, { z: -1.05, w: 0.17, yt: 1.16, yb: 0.97, p: 3.2 }, { z: -1.5, w: 0.13, yt: 1.2, yb: 1.0, p: 3 },
    { z: -1.7, w: 0.045, yt: 1.17, yb: 1.05, p: 2.6 },
  ],
  gota: [
    { z: 1.74, w: 0.018, yt: 0.97, yb: 0.93 }, { z: 1.5, w: 0.14, yt: 1.08, yb: 0.83 }, { z: 1.0, w: 0.21, yt: 1.19, yb: 0.84 },
    { z: 0.45, w: 0.22, yt: 1.24, yb: 0.95 }, { z: 0.05, w: 0.18, yt: 1.12, yb: 1.0 }, { z: -0.5, w: 0.15, yt: 1.03, yb: 0.98 },
    { z: -1.0, w: 0.17, yt: 1.12, yb: 0.95 }, { z: -1.45, w: 0.12, yt: 1.14, yb: 0.99 }, { z: -1.7, w: 0.018, yt: 1.08, yb: 1.04 },
  ],
};
/** o RABO (onde sai o propulsor principal) de cada carenagem */
const RABO = { raio: { y: 1.26, z: -1.66 }, tubarao: { y: 1.1, z: -1.64 }, gota: { y: 1.05, z: -1.62 } } as const;
/** os PODS de sustentação (onde ficariam as rodas): centro (z, y) e o tamanho (meia-largura, meia-altura, comprimento) */
const PODS = [{ z: 1.1, y: 0.52, w: 0.13, h: 0.12, c: 0.36 }, { z: -1.08, y: 0.55, w: 0.16, h: 0.13, c: 0.42 }] as const;
/** quanto tempo a propulsão leva pra esquentar e esfriar (1/s) e a velocidade (m/s) em que fica fria / no máximo */
const CALOR = { sobe: 0.7, desce: 0.35, frio: 15, quente: 140, boost: 0.25 } as const;

export function criarMoto(o: { cor: string; low: boolean; estilo?: number }): MotoHandle {
  const g = new THREE.Group(), corpo = new THREE.Group(); g.add(corpo);
  corpo.scale.setScalar(ESCALA_MOTO);   // proporção de moto de verdade pro avatar (~2 m): tudo (inclusive as âncoras) escala junto
  const estilo = ESTILOS_MOTO[(((o.estilo ?? 0) % 3) + 3) % 3]!;
  const acento = new THREE.Color(o.cor), seg = o.low ? 8 : 16;
  // PINTURA na cor da vaga (clara e metálica), detalhes escuros, cromado, frisos de luz, vidro, banco
  const pintura = new THREE.MeshStandardMaterial({ color: acento.clone().lerp(new THREE.Color(0xffffff), 0.3), roughness: 0.24, metalness: 0.6, emissive: acento, emissiveIntensity: 0.14 });
  const escuro = new THREE.MeshStandardMaterial({ color: 0x1c2436, roughness: 0.38, metalness: 0.7, emissive: 0x0a1020, emissiveIntensity: 0.6 });
  const cromado = new THREE.MeshStandardMaterial({ color: 0x9aa4ba, roughness: 0.16, metalness: 0.95, emissive: 0x141a28, emissiveIntensity: 0.4 });
  const brilho = new THREE.MeshBasicMaterial({ color: acento, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending });
  pintura.userData.pintura = true; brilho.userData.friso = true;   // (marcados: quem reaproveita a moto — a frota, as paradas instanciadas — repinta na cor de cada um)
  const vidro = new THREE.MeshStandardMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.1, emissive: 0x2a6bd0, emissiveIntensity: 0.4, side: THREE.DoubleSide });
  const couro = new THREE.MeshStandardMaterial({ color: 0x10131c, roughness: 0.85, metalness: 0.1 });
  const farol = new THREE.MeshBasicMaterial({ color: 0xeaf6ff }), lanterna = new THREE.MeshBasicMaterial({ color: 0xff2a3a });
  const peca = <T extends THREE.Object3D>(m: T, x: number, y: number, z: number, pai: THREE.Object3D = corpo) => { m.position.set(x, y, z); pai.add(m); return m; };
  const alvos: THREE.Object3D[] = [];

  /** um PERFIL lateral (pontos [z, y], curva suave) extrudado na largura (x), centrado em `x` */
  const perfil = (pts: [number, number][], largura: number, mat: THREE.Material, x = 0, chanfro = 0.05) => {
    const s = new THREE.Shape(); s.moveTo(pts[0]![0], pts[0]![1]); s.splineThru(pts.slice(1).map(([a, b]) => new THREE.Vector2(a, b))); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.005, largura - 2 * chanfro), bevelEnabled: chanfro > 0, bevelThickness: chanfro, bevelSize: chanfro, bevelSegments: o.low ? 1 : 3, curveSegments: o.low ? 10 : 20 });
    geo.translate(0, 0, -(largura - 2 * chanfro) / 2); geo.rotateY(-Math.PI / 2);   // shape x → +z (frente), extrusão → x
    return peca(new THREE.Mesh(geo, mat), x, 0, 0);
  };
  /** uma BARRA (cilindro) de `a` até `b` */
  const barra = (a: [number, number, number], b: [number, number, number], r: number, mat: THREE.Material) => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), mat);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return peca(m, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  };
  /** um FRISO de luz (tubo fino) passando pelos pontos */
  const friso = (pts: [number, number, number][], r = 0.011) => peca(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), o.low ? 16 : 40, r, 4), brilho), 0, 0, 0);
  /** a meia-largura do casco em z (pra encostar peças na lateral) */
  const secoes = CASCOS[estilo];
  const larguraEm = (z: number) => { for (let i = 0; i < secoes.length - 1; i++) { const a = secoes[i]!, b = secoes[i + 1]!; if (z <= a.z && z >= b.z) return a.w + ((b.w - a.w) * (a.z - z)) / (a.z - b.z); } return 0.1; };

  // ───────────── CASCO ─────────────
  alvos.push(peca(new THREE.Mesh(casco(secoes, o.low), pintura), 0, 0, 0));
  // frisos de luz correndo pela lateral, do bico à rabeta
  for (const s of [-1, 1]) {
    const pts: [number, number, number][] = [1.5, 1.0, 0.5, 0.1, -0.4, -0.9, -1.35].map((z) => { const i = secoes.findIndex((q) => q.z < z), a = secoes[Math.max(0, i - 1)]!, b = secoes[Math.max(0, i)]!, u = (a.z - z) / (a.z - b.z || 1), yb = a.yb + (b.yb - a.yb) * u, yt = a.yt + (b.yt - a.yt) * u; return [s * (larguraEm(z) * 0.93 + 0.004), yb + (yt - yb) * 0.42, z]; });
    friso(pts);
  }
  // FAROL de LED (dois rasgos no bico) e a LANTERNA na rabeta
  const bico = secoes[1]!;
  for (const s of [-1, 1]) { const f = peca(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.022, 0.14), farol), s * bico.w * 0.55, (bico.yt + bico.yb) / 2 + 0.01, bico.z - 0.02); f.rotation.y = s * 0.35; }
  const rabo = RABO[estilo];
  peca(new THREE.Mesh(new THREE.BoxGeometry(larguraEm(rabo.z + 0.12) * 1.7, 0.03, 0.04), lanterna), 0, rabo.y + 0.06, rabo.z + 0.1);

  if (estilo === "raio") {
    perfil([[1.16, 1.12], [0.82, 1.42], [0.62, 1.43], [0.8, 1.2]], 0.3, vidro, 0, 0.01);   // bolha alta
    for (const s of [-1, 1]) {   // ALETAS no nariz (asinhas de corrida)
      const a = perfil([[1.45, 0.92], [1.05, 0.95], [0.95, 0.86], [1.3, 0.86]], 0.02, escuro, s * (larguraEm(1.2) + 0.06), 0.005); a.rotation.z = s * -0.25;
    }
  } else if (estilo === "tubarao") {
    perfil([[1.08, 1.17], [0.86, 1.33], [0.7, 1.34], [0.86, 1.18]], 0.42, vidro, 0, 0.01);   // para-brisa baixo e largo
    perfil([[-0.85, 1.12], [-1.25, 1.5], [-1.48, 1.47], [-1.3, 1.14]], 0.05, pintura, 0, 0.015);   // barbatana dorsal
    for (const s of [-1, 1]) {
      const tomada = peca(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.3, seg, 1, true), escuro), s * 0.17, 0.92, 1.45); tomada.rotation.x = Math.PI / 2;
      peca(new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.014, 6, seg * 2), brilho), s * 0.17, 0.92, 1.6);
      for (let k = 0; k < 3; k++) peca(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.035, 0.13), brilho), s * (larguraEm(0.9 - k * 0.15) + 0.003), 1.0, 0.9 - k * 0.15).rotation.x = -0.5;   // guelras de luz
    }
  } else {
    perfil([[1.06, 1.15], [0.88, 1.32], [0.74, 1.32], [0.86, 1.16]], 0.32, vidro, 0, 0.01);
    for (const [z, y, w, h] of [[-0.25, 0.965, 0.245, 0.11], [-1.25, 1.03, 0.19, 0.09]] as const) {   // anéis de luz na cintura e no rabo
      const anel = peca(new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 4, seg * 3), brilho), 0, y, z); anel.scale.set(w, h, 1);
    }
  }
  // BANCO (o mesmo nas três: o quadril encaixa igual) + o pedestal do semi-guidão e o painel
  perfil([[0.02, 1.04], [-0.12, 1.11], [-0.66, 1.1], [-0.9, 1.19], [-1.0, 1.11], [-0.74, 1.0], [0.0, 0.98]], 0.3, couro, 0, 0.04);
  peca(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.12), escuro), 0, 1.16, 0.7);
  const painel = peca(new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.06), brilho), 0, 1.2, 0.62); painel.rotation.x = -1.0;

  // ───────────── PODS de sustentação (sem rodas) + garfo, balança, quadro ─────────────
  for (const [k, d] of PODS.entries()) {
    const pod = peca(new THREE.Mesh(casco([
      { z: d.z + d.c, w: 0.015, yt: d.y + 0.015, yb: d.y - 0.015 }, { z: d.z + d.c * 0.6, w: d.w * 0.85, yt: d.y + d.h * 0.85, yb: d.y - d.h * 0.8 },
      { z: d.z, w: d.w, yt: d.y + d.h, yb: d.y - d.h }, { z: d.z - d.c * 0.6, w: d.w * 0.8, yt: d.y + d.h * 0.8, yb: d.y - d.h * 0.85 },
      { z: d.z - d.c, w: 0.02, yt: d.y + 0.02, yb: d.y - 0.02 },
    ], o.low), k === 0 ? pintura : escuro), 0, 0, 0); alvos.push(pod);
    const cinta = peca(new THREE.Mesh(new THREE.TorusGeometry(1, 0.014, 4, seg * 3), brilho), 0, d.y, d.z); cinta.scale.set(d.w + 0.004, d.h + 0.004, 1);   // a cinta de luz
  }
  for (const s of [-1, 1]) {
    barra([s * 0.12, 1.12, 0.7], [s * 0.1, PODS[0].y + 0.06, PODS[0].z - 0.05], 0.032, cromado);   // GARFO inclinado até o pod da frente
    barra([s * 0.13, 0.66, 0.0], [s * 0.12, PODS[1].y + 0.04, PODS[1].z + 0.12], 0.04, escuro);    // BALANÇA (do motor até o pod de trás)
    barra([s * 0.09, 1.08, 0.66], [s * 0.1, 0.72, 0.36], 0.03, escuro);        // QUADRO: da caixa de direção até o motor
  }
  // o MOTOR EXPOSTO (sem carenagem embaixo): o cárter com o miolo de energia aceso, dois CILINDROS em V com aletas e os
  // ESCAPAMENTOS cromados descendo por baixo do banco até a rabeta
  const ym = 0.66, zm = 0.22;
  const nucleoMotor = new THREE.MeshBasicMaterial({ color: acento.clone() });   // o miolo: clareia com o calor
  const carter = peca(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.26, seg * 2), escuro), 0, ym, zm); carter.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) { const tampa = peca(new THREE.Mesh(new THREE.CircleGeometry(0.115, seg * 2), nucleoMotor), s * 0.132, ym, zm); tampa.rotation.y = s * Math.PI / 2; }   // o miolo aceso dos dois lados
  for (const [ang, comp] of [[0.5, 0.34], [-0.45, 0.32]] as const) {   // V: um pra frente, um pra trás
    const cil = new THREE.Group(); cil.position.set(0, ym, zm); cil.rotation.x = ang; corpo.add(cil);
    const bloco = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, comp, seg), cromado); bloco.position.y = comp / 2 + 0.08; cil.add(bloco);
    for (let k = 0; k < 5; k++) { const aleta = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.014, seg), escuro); aleta.position.y = 0.14 + k * 0.05; cil.add(aleta); }
    const cabeca = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.06, 0.14), escuro); cabeca.position.y = comp + 0.1; cil.add(cabeca);
    const vela = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), nucleoMotor); vela.position.y = comp + 0.14; cil.add(vela);
  }
  const yR = rabo.y - 0.12, zR = rabo.z - 0.06;
  for (const s of [-1, 1]) peca(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(s * 0.05, ym + 0.36, zm + 0.2), new THREE.Vector3(s * 0.13, ym + 0.05, zm + 0.28), new THREE.Vector3(s * 0.17, ym - 0.08, zm - 0.1),
    new THREE.Vector3(s * 0.17, ym - 0.02, -0.6), new THREE.Vector3(s * 0.19, yR - 0.05, -1.25), new THREE.Vector3(s * 0.2, yR, zR + 0.08),
  ]), o.low ? 20 : 48, 0.026, 6), cromado), 0, 0, 0);

  // semi-guidão (baixo, de corrida): as duas barras saindo do pedestal + os punhos; pedaleiras recuadas
  for (const s of [-1, 1]) {
    barra([s * 0.1, 1.15, 0.68], [s * 0.33, 1.13, 0.62], 0.022, cromado);
    const p = peca(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 8), couro), s * 0.38, 1.13, 0.61); p.rotation.z = Math.PI / 2;
    peca(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.16), escuro), s * 0.3, 0.64, -0.22);
  }

  // ───────────── PROPULSORES com CHAMA ─────────────
  const u: UniChama = { uT: { value: 0 }, uBoost: { value: 0 }, uCalor: { value: 0 } };
  const bocalQuente = new THREE.MeshStandardMaterial({ color: 0x9aa4ba, roughness: 0.2, metalness: 0.9, emissive: 0x000000, emissiveIntensity: 1 });   // os bocais principais: incandescem
  const chamaMat = materialChama(acento, 0, u), nucleoMat = materialChama(acento, 1, u), auraMat = materialChama(acento, 2, u);
  const garganta = new THREE.MeshBasicMaterial({ color: acento.clone().lerp(new THREE.Color(0xffffff), 0.5) });
  type Prop = { chama: THREE.Group; tam: number; tipo: "principal" | "sustenta" | "manobra"; lado: number };
  const props: Prop[] = [];
  /** um propulsor em (x,y,z), apontando pra `dir` ("tras" = −z, "baixo" = −y, "lado" = ±x pra fora) */
  const propulsor = (x: number, y: number, z: number, r: number, dir: "tras" | "baixo" | "lado", tam: number) => {
    const g2 = new THREE.Group(); g2.position.set(x, y, z); corpo.add(g2);
    // o +y local do grupo aponta pra saída
    if (dir === "tras") g2.rotation.x = -Math.PI / 2; else if (dir === "baixo") g2.rotation.x = Math.PI; else g2.rotation.z = x > 0 ? -Math.PI / 2 : Math.PI / 2;
    const bocal = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.78, r, r * 1.5, seg, 1, true), dir === "tras" ? bocalQuente : cromado); bocal.position.y = r * 0.25; g2.add(bocal);
    const aro = new THREE.Mesh(new THREE.TorusGeometry(r * 0.94, r * 0.13, 6, seg + 4), escuro); aro.rotation.x = Math.PI / 2; aro.position.y = r * 1.0; g2.add(aro);
    const fundo = new THREE.Mesh(new THREE.CircleGeometry(r * 0.76, seg), garganta); fundo.rotation.x = -Math.PI / 2; fundo.position.y = r * 0.55; g2.add(fundo);
    // a chama: cone com a BASE no bocal e a ponta pra fora (comprimento 1 → escala `tam × força`)
    const chama = new THREE.Group(); chama.position.y = r * 0.95; g2.add(chama);
    const fora = new THREE.Mesh(new THREE.ConeGeometry(r * 0.95, 1, seg, 1, true), chamaMat); fora.position.y = 0.5; chama.add(fora);
    const nucleo = new THREE.Mesh(new THREE.ConeGeometry(r * 0.5, 0.55, seg, 1, true), nucleoMat); nucleo.position.y = 0.275; chama.add(nucleo);
    if (dir === "tras" && tam > 1.2) { const aura = new THREE.Mesh(new THREE.ConeGeometry(r * 2.4, 0.8, seg, 1, true), auraMat); aura.position.y = 0.4; chama.add(aura); }   // só no principal
    props.push({ chama, tam, tipo: dir === "tras" ? "principal" : dir === "baixo" ? "sustenta" : "manobra", lado: Math.sign(x) });
  };
  // TRASEIRA: a nacele presa ao rabo, o PRINCIPAL no meio e dois menores dos lados (embaixo da rabeta)
  const nacele = peca(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.34, seg), escuro), 0, rabo.y - 0.04, rabo.z - 0.02); nacele.rotation.x = Math.PI / 2; nacele.scale.set(1.4, 1, 1);
  peca(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.012, 4, seg * 2), brilho), 0, rabo.y - 0.04, rabo.z + 0.12).scale.set(1.4, 1, 1);
  propulsor(0, rabo.y - 0.04, rabo.z - 0.2, 0.12, "tras", 1.5);
  for (const s of [-1, 1]) propulsor(s * 0.2, yR, zR, 0.07, "tras", 1.1);
  // de SUSTENTAÇÃO: dois embaixo de cada pod (lado a lado — as chamas não entram no lote: cada uma custa 2 draw calls)
  for (const d of PODS) for (const x of [-0.065, 0.065]) propulsor(x, d.y - d.h + 0.03, d.z, 0.055, "baixo", 0.5);
  // o HALO de calor na saída do principal (acende e cresce com o calor) e o ponto de onde saem o rastro e as faíscas
  const tH = haloDeCalor();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tH, color: acento.clone(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.userData.semLote = true; peca(halo, 0, rabo.y - 0.04, rabo.z - 0.3);
  const saida = new THREE.Object3D(); peca(saida, 0, rabo.y - 0.04, rabo.z - 0.32);
  for (const s of [-1, 1]) {   // de MANOBRA nas laterais do nariz: acendem na curva, do lado de fora
    const zM = 1.36, xM = larguraEm(zM) + 0.01;
    peca(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.14), escuro), s * (xM - 0.01), 0.95, zM);
    propulsor(s * (xM + 0.02), 0.95, zM, 0.035, "lado", 0.4);
  }

  // ───────────── SETAS (pisca) ─────────────
  // lente âmbar apagada (fica) + a luz acesa e o halo (ligam no pisca) — frente e trás, dos dois lados
  const lente = new THREE.MeshStandardMaterial({ color: 0x3a2610, roughness: 0.25, metalness: 0.4, emissive: 0x1a0d00, emissiveIntensity: 1 });
  const luz = new THREE.MeshBasicMaterial({ color: 0xffb22e });
  const haloSeta = new THREE.MeshBasicMaterial({ color: 0xff9a1a, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
  // o aceso de cada LADO num grupo só (frente + trás piscam juntos): liga/desliga o grupo — e o lote junta as peças dele
  const setas: Record<number, THREE.Group> = { 1: new THREE.Group(), [-1]: new THREE.Group() };   // −1 = esquerda do piloto = +x
  for (const gS of Object.values(setas)) { gS.visible = false; corpo.add(gS); }
  for (const s of [-1, 1]) for (const [z, y] of [[1.28, 1.04], [-1.4, rabo.y - 0.02]] as const) {
    const x = s * (larguraEm(z) + 0.01), gS = setas[s > 0 ? -1 : 1]!;
    peca(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.1), lente), x, y, z);   // embutida (só a pontinha aparece)
    peca(new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.034, 0.105), luz), x, y, z, gS);
    peca(new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), haloSeta), x + s * 0.02, y, z, gS);
  }

  // ───────────── BARREIRA DO SOM: o cone de vapor (envolve moto e piloto, ponta no bico) ─────────────
  const vaporMat = materialVapor();
  const vapor = new THREE.Mesh(new THREE.ConeGeometry(1.35, 3.6, o.low ? 16 : 32, 1, true), vaporMat);
  vapor.rotation.x = Math.PI / 2; vapor.position.set(0, 1.05, 0.15); vapor.visible = false; vapor.userData.semLote = true; corpo.add(vapor);

  // ancoragem do PILOTO (frente da moto = +z; a esquerda de quem pilota = +x): quadril no banco, mãos nos punhos,
  // pés nas pedaleiras — o avatar encaixa nesses pontos por IK (AvatarLuz `montado`)
  const ancora = (x: number, y: number, z: number) => { const a = new THREE.Object3D(); a.position.set(x, y, z); corpo.add(a); return a; };
  const assento = ancora(0, MOTO.banco / ESCALA_MOTO, -0.36);   // (dentro do corpo já escalado)
  // posição de CORRIDA: mãos baixas e à frente (semi-guidão), pés recuados (pedaleiras atrás do reator)
  const pontos = { maoE: ancora(0.38, 1.14, 0.6), maoD: ancora(-0.38, 1.14, 0.6), peE: ancora(0.3, 0.68, -0.22), peD: ancora(-0.3, 0.68, -0.22) };

  // ───────────── RASTRO de energia + FAÍSCAS (no MUNDO: ficam pra trás enquanto a moto anda) ─────────────
  const N = o.low ? 16 : 36, NF = o.low ? 12 : 28, RASTRO_SEG = 0.3, RASTRO_M = 8;   // o rastro dura ~0,3 s (por TEMPO, não por quadro) e no máximo 8 m
  type Onda = { g: THREE.Group; anel: THREE.Mesh; casca: THREE.Mesh; t: number };
  let mundo: { grupo: THREE.Group; fita: THREE.Mesh; pf: THREE.Points; pontos: { p: THREE.Vector3; t: number }[]; faiscas: { p: THREE.Vector3; v: THREE.Vector3; vida: number; max: number }[]; onda: Onda } | null = null;
  const criarMundo = (raiz: THREE.Object3D) => {
    const grupo = new THREE.Group(); grupo.userData.semLote = true; raiz.add(grupo);
    // a fita: duas tiras cruzadas (em pé e deitada) — 4 vértices por ponto, cor (já com o "alfa") por vértice
    const gF = new THREE.BufferGeometry(), idx: number[] = [];
    gF.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 4 * 3), 3)); gF.setAttribute("color", new THREE.BufferAttribute(new Float32Array(N * 4 * 3), 3));
    for (let i = 0; i < N - 1; i++) for (const f of [0, 2]) { const a = i * 4 + f, b = a + 1, c = a + 4, d = b + 4; idx.push(a, c, b, b, c, d); }
    gF.setIndex(idx);
    const fita = new THREE.Mesh(gF, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    fita.frustumCulled = false; grupo.add(fita);
    const gP = new THREE.BufferGeometry();
    gP.setAttribute("position", new THREE.BufferAttribute(new Float32Array(NF * 3), 3)); gP.setAttribute("color", new THREE.BufferAttribute(new Float32Array(NF * 3), 3));
    const pf = new THREE.Points(gP, new THREE.PointsMaterial({ size: 0.22, map: tH, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
    pf.frustumCulled = false; grupo.add(pf);
    // a ONDA DE CHOQUE: um anel fino de frente pro rumo + uma casca (fresnel) que se abrem onde a moto rompeu a barreira
    const og = new THREE.Group(); og.visible = false; grupo.add(og);
    const anel = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, o.low ? 48 : 96), new THREE.MeshBasicMaterial({ color: 0xdff0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const cascaMat = materialVapor(); cascaMat.uniforms.uAneis!.value = 0;
    const casca = new THREE.Mesh(new THREE.SphereGeometry(1, o.low ? 16 : 32, o.low ? 12 : 20), cascaMat);
    og.add(anel, casca); anel.frustumCulled = casca.frustumCulled = false;
    return { grupo, fita, pf, onda: { g: og, anel, casca, t: -1 }, pontos: [] as { p: THREE.Vector3; t: number }[], faiscas: Array.from({ length: NF }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), vida: 0, max: 1 })) };
  };
  const vS = new THREE.Vector3(), vUp = new THREE.Vector3(), vLado = new THREE.Vector3(), vFr = new THREE.Vector3(), corT = new THREE.Color(), q4 = new THREE.Quaternion();
  let calor = 0, faiscaAcum = 0, faiscaProx = 0, boostAnt = false, flash = 0, supSuave = 0;

  let rola = 0, nariz2 = 0, boostSuave = 0;
  return {
    group: g, assento, pontos, alvos,
    atualizar({ dt, t, voando, vel, curva, vy = 0, inclina, boost = 0, seta = 0 }) {
      const k = Math.min(1, dt * 4), v30 = Math.min(1.8, vel / 30);
      if (inclina !== undefined) rola = inclina;   // a pilotagem já suaviza
      else rola += (Math.max(-0.5, Math.min(0.5, -curva * 0.55)) * (voando ? 1 : 0) - rola) * k;
      nariz2 += ((voando ? Math.max(-0.25, Math.min(0.25, -vy * 0.02)) - v30 * 0.05 : 0) - nariz2) * k;
      corpo.rotation.set(nariz2, 0, rola);
      corpo.position.y = ESCALA_MOTO * (voando ? Math.sin(t * 3.1) * 0.03 : 0.05 + Math.sin(t * 1.7) * 0.04);   // parada: flutua de leve
      boostSuave += (boost - boostSuave) * Math.min(1, dt * 6);
      // o CALOR: segue a velocidade com inércia (esquenta mais rápido do que esfria)
      const alvoCalor = voando ? Math.min(1, Math.max(0, (vel - CALOR.frio) / (CALOR.quente - CALOR.frio))) + CALOR.boost * boostSuave : 0;
      calor += (alvoCalor - calor) * Math.min(1, dt * (alvoCalor > calor ? CALOR.sobe : CALOR.desce) * 2.2);
      const q = Math.min(1, calor);
      u.uT.value = t; u.uBoost.value = boostSuave; u.uCalor.value = q;
      // chamas: principais crescem com o CALOR (e MUITO no boost); as de sustentação, com o voo; as de manobra, na curva
      props.forEach((p, i) => {
        const forca = p.tipo === "principal" ? (voando ? 0.3 + 1.7 * q + 0.7 * boostSuave : 0.06)
          : p.tipo === "sustenta" ? (voando ? 0.6 + 0.35 * Math.min(1, Math.abs(vy) / 8) + 0.2 * q : 0.14)
          : (voando ? 0.1 + 0.9 * Math.max(0, -curva * p.lado) : 0.03);
        const tremor = 0.9 + 0.1 * Math.sin(t * 31 + i * 1.7) + 0.05 * Math.sin(t * 57 + i), largo = p.tipo === "principal" ? 0.7 + 0.4 * q + 0.2 * boostSuave : 1;
        p.chama.scale.set(largo, Math.max(0.02, p.tam * forca * tremor), largo);
      });
      setas[-1]!.visible = seta === -1; setas[1]!.visible = seta === 1;
      // o resto que acende com o calor: bocais incandescentes, halo da saída, miolo do motor, emissores dos pods
      temperatura(q, acento, corT); bocalQuente.emissive.copy(corT).multiplyScalar(q * q * 1.4);
      halo.material.color.copy(corT); halo.material.opacity = voando ? 0.05 + 0.7 * q * q : 0; halo.scale.setScalar(0.2 + 1.6 * q + 0.5 * boostSuave);
      nucleoMotor.color.copy(acento).lerp(corT.set(1, 1, 1), q * 0.7);

      // BARREIRA DO SOM: o cone de vapor acima dela; ao romper, clarão no cone + a onda de choque no mundo
      const aceso = boost > 0.5, rompeu = voando && rompeuBarreira(boostAnt, aceso, vel); boostAnt = aceso;
      supSuave += ((voando ? supersonico(vel, aceso) : 0) - supSuave) * Math.min(1, dt * 5);
      if (rompeu) flash = 1; else flash = Math.max(0, flash - dt * 2.2);
      const aVapor = supSuave > 0.001 ? 0.25 + 0.45 * supSuave : 0;
      vapor.visible = aVapor + flash > 0.01;
      if (vapor.visible) { vaporMat.uniforms.uA!.value = aVapor + flash * 1.6; vaporMat.uniforms.uT!.value = t; vapor.scale.set(1 + 0.25 * flash, 1 + 0.1 * supSuave, 1 + 0.25 * flash); }

      // RASTRO + FAÍSCAS: só com calor (parada, nem cria)
      if (!mundo && q < 0.12) return;
      let raiz: THREE.Object3D = g, vis = true; for (let p: THREE.Object3D | null = g; p; p = p.parent) { if (!p.visible) vis = false; raiz = p; }
      if (raiz === g) return;   // ainda fora da cena
      mundo ??= criarMundo(raiz);
      if (mundo.grupo.parent !== raiz) raiz.add(mundo.grupo);
      mundo.grupo.visible = vis;
      g.updateWorldMatrix(true, true); saida.getWorldPosition(vS); corpo.getWorldQuaternion(q4);
      vUp.set(0, 1, 0).applyQuaternion(q4); vLado.set(1, 0, 0).applyQuaternion(q4); vFr.set(0, 0, 1).applyQuaternion(q4);
      const pts = mundo.pontos;
      if (pts.length && pts[0]!.p.distanceTo(vS) > 40) pts.length = 0;   // teletransporte (pool, montou noutra moto): recomeça
      const novo = pts.length >= N ? pts.pop()! : { p: new THREE.Vector3(), t: 0 }; novo.p.copy(vS); novo.t = t; pts.unshift(novo);
      // só os últimos ~0,3 s e no máximo `RASTRO_M` de comprimento: a câmera da moto fica ~11 m atrás — mais longo, a fita
      // passava por baixo dela e virava uma faixa enorme na tela
      while (pts.length > 2 && (t - pts[pts.length - 1]!.t > RASTRO_SEG || pts[pts.length - 1]!.p.distanceTo(vS) > RASTRO_M)) pts.pop();
      const pos = mundo.fita.geometry.attributes.position as THREE.BufferAttribute, cor = mundo.fita.geometry.attributes.color as THREE.BufferAttribute;
      const larg = (0.025 + 0.1 * q + 0.06 * boostSuave) * (voando ? 1 : 0), ult = pts.length - 1;
      for (let i = 0; i < N; i++) {
        const p = pts[Math.min(i, ult)]!.p, f = ult > 0 ? 1 - Math.min(i, ult) / ult : 0, w = larg * (0.3 + 0.7 * f), luz = q * q * f * f * 0.55;
        temperatura(Math.min(1, q * (0.5 + 0.6 * f)), acento, corT).multiplyScalar(luz);
        pos.setXYZ(i * 4, p.x + vUp.x * w, p.y + vUp.y * w, p.z + vUp.z * w); pos.setXYZ(i * 4 + 1, p.x - vUp.x * w, p.y - vUp.y * w, p.z - vUp.z * w);
        pos.setXYZ(i * 4 + 2, p.x + vLado.x * w, p.y + vLado.y * w, p.z + vLado.z * w); pos.setXYZ(i * 4 + 3, p.x - vLado.x * w, p.y - vLado.y * w, p.z - vLado.z * w);
        for (let j = 0; j < 4; j++) cor.setXYZ(i * 4 + j, corT.r, corT.g, corT.b);
      }
      pos.needsUpdate = true; cor.needsUpdate = true;
      // faíscas: saem do bocal pra trás, espalhando, e apagam (mais e mais rápidas quanto mais quente)
      faiscaAcum += voando && q > 0.3 ? dt * (10 + 60 * q + 40 * boostSuave) : 0;
      while (faiscaAcum >= 1) {
        faiscaAcum -= 1; const fz = mundo.faiscas[faiscaProx]!; faiscaProx = (faiscaProx + 1) % NF;
        const r1 = Math.sin(t * 913 + faiscaProx * 7.1), r2 = Math.sin(t * 517 + faiscaProx * 3.3);
        fz.p.copy(vS); fz.max = fz.vida = 0.25 + 0.3 * Math.abs(r1);
        fz.v.copy(vFr).multiplyScalar(-(4 + 10 * q)).addScaledVector(vLado, r1 * 2.5).addScaledVector(vUp, r2 * 2.5);
      }
      const pp = mundo.pf.geometry.attributes.position as THREE.BufferAttribute, pc = mundo.pf.geometry.attributes.color as THREE.BufferAttribute;
      for (let i = 0; i < NF; i++) {
        const fz = mundo.faiscas[i]!; if (fz.vida > 0) { fz.vida -= dt; fz.p.addScaledVector(fz.v, dt); fz.v.multiplyScalar(1 - dt * 2); }
        const a = Math.max(0, fz.vida / fz.max); temperatura(Math.min(1, q + 0.2 * a), acento, corT).multiplyScalar(a);
        pp.setXYZ(i, fz.p.x, fz.p.y, fz.p.z); pc.setXYZ(i, corT.r, corT.g, corT.b);
      }
      pp.needsUpdate = true; pc.needsUpdate = true;
      // a ONDA DE CHOQUE: nasce onde a moto rompeu, de frente pro rumo; abre ~45 m em 1 s e apaga — e fica pra trás
      const on = mundo.onda;
      if (rompeu) { on.t = 0; on.g.position.copy(vS); on.g.quaternion.copy(q4); on.g.visible = true; }
      if (on.t >= 0) {
        on.t += dt; const u = on.t / 1.0, e = 1 - (1 - Math.min(1, u)) ** 3;
        on.anel.scale.setScalar(2 + 45 * e); (on.anel.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - u) ** 1.5;
        on.casca.scale.setScalar(1.5 + 30 * e); (on.casca.material as THREE.ShaderMaterial).uniforms.uA!.value = 1.4 * (1 - u) ** 2;
        if (u >= 1) { on.t = -1; on.g.visible = false; }
      }
    },
    dispose() {
      g.traverse((x) => { if ((x as THREE.Sprite).isSprite) { (x as THREE.Sprite).material.dispose(); return; }   // (a geometria do sprite é a compartilhada do three)
        const m = x as THREE.Mesh; m.geometry?.dispose(); const mt = m.material as THREE.Material | undefined; mt?.dispose?.(); });   // (a textura do halo é compartilhada: fica)
      if (mundo) { mundo.grupo.traverse((x) => { const m = x as THREE.Mesh; m.geometry?.dispose(); (m.material as THREE.Material | undefined)?.dispose?.(); }); mundo.grupo.removeFromParent(); mundo = null; }
      g.removeFromParent();
    },
  };
}
