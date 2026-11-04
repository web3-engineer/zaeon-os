/**
 * O FLUXO DE ENERGIA da nave mini (skin tron, nov/2026 — o dono: "um fluxo de energia que se propague pela nave como
 * um padrão de movimento fluido e que dê mais vida às coisas"). Um CAMPO só, no espaço do mundo (local da nave), que
 * todo neon lê:
 *  - as ONDAS: frentes de luz saindo do NÚCLEO (a mesa holográfica no meio), correndo pelo piso, subindo as paredes e
 *    voltando pelo teto até a cúpula — quando uma onda passa, o neon dos móveis, o corrimão e as costelas acendem;
 *  - o FLUIDO: um ruído com distorção de domínio (fbm empenado) deslizando devagar — as correntes de energia por baixo
 *    do piso de vidro, que não param nunca e não se repetem.
 * Barato: tudo no fragment shader (sem textura nova), o mesmo relógio `uT` pra todo mundo.
 */
import * as THREE from "three";

/** o relógio e o núcleo, compartilhados por todo material vivo da nave */
export type UniformesEnergia = { uT: { value: number }; uNucleo: { value: THREE.Vector2 }; /** onde a nave está no mundo (o campo é no local dela) */ uOrigem: { value: THREE.Vector3 } };
export const uniformesEnergia = (nucleo: { x: number; z: number }): UniformesEnergia => ({ uT: { value: 0 }, uNucleo: { value: new THREE.Vector2(nucleo.x, nucleo.z) }, uOrigem: { value: new THREE.Vector3() } });

/** o campo em GLSL: `energiaOnda(p)`, `energiaFluido(p)` e `energia(p)` (0..~1.4), com p no local da nave */
export const GLSL_ENERGIA = /* glsl */ `
uniform float uT; uniform vec2 uNucleo; uniform vec3 uOrigem;
float eHash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float eRuido(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(eHash(i), eHash(i + vec2(1, 0)), f.x), mix(eHash(i + vec2(0, 1)), eHash(i + vec2(1, 1)), f.x), f.y); }
float eFbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * eRuido(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; } return s; }
/** a distância "pelo caminho" do núcleo: no piso, sobe a parede e volta pelo teto */
float eCaminho(vec3 p){ return length(p.xz - uNucleo) + max(p.y, 0.) * 1.1; }
float energiaOnda(vec3 p){ float d = eCaminho(p); return pow(.5 + .5 * sin(d * .85 - uT * 3.1), 14.) + .55 * pow(.5 + .5 * sin(d * .31 - uT * 1.25 + 1.7), 22.); }
float energiaFluido(vec3 p){ vec2 q = p.xz * .22 + vec2(p.y * .3, 0.);
  vec2 w = vec2(eFbm(q * .9 + vec2(uT * .05, -uT * .04)), eFbm(q * .9 + vec2(5.2, 1.3) - uT * .045));
  return smoothstep(.42, .82, eFbm(q + 2.2 * w + vec2(-uT * .08, uT * .06))); }
float energia(vec3 p){ return energiaOnda(p) * .8 + energiaFluido(p) * .45; }
vec3 energiaCor(vec3 p){ float h = .5 + .5 * sin(eCaminho(p) * .12 - uT * .4); return mix(vec3(.27,.94,1.), mix(vec3(.72,.55,1.), vec3(1.,.18,.7), smoothstep(.5, 1., h)), smoothstep(.0, .6, h)); }
`;

/** acende um material de NEON (MeshBasic aditivo, com ou sem InstancedMesh) com o campo: o brilho respira com as ondas */
export function vivificar(m: THREE.MeshBasicMaterial, u: UniformesEnergia, base = 0.55, ganho = 1.25) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = u.uT; sh.uniforms.uNucleo = u.uNucleo; sh.uniforms.uOrigem = u.uOrigem;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vPosE; uniform vec3 uOrigem;")
      .replace("#include <project_vertex>", "#include <project_vertex>\n{ vec4 pe = vec4(transformed, 1.);\n#ifdef USE_INSTANCING\n pe = instanceMatrix * pe;\n#endif\n vPosE = (modelMatrix * pe).xyz - uOrigem; }");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\nvarying vec3 vPosE;\n${GLSL_ENERGIA}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n{ float e = energia(vPosE); diffuseColor.rgb = diffuseColor.rgb * (${base.toFixed(3)} + ${ganho.toFixed(3)} * e) + energiaCor(vPosE) * energiaOnda(vPosE) * .35; }`);
  };
  m.customProgramCacheKey = () => `energia-${base}-${ganho}`;
  m.needsUpdate = true;
}

const VERT = /* glsl */ `uniform vec3 uOrigem; varying vec3 vPos; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vPos = w.xyz - uOrigem; gl_Position = projectionMatrix * viewMatrix * w; }`;
/** o PISO vivo: as correntes do fluido por baixo do vidro + as ondas correndo pelas linhas da grade (1 m e 4 m) */
const FRAG_PISO = /* glsl */ `${GLSL_ENERGIA}
varying vec3 vPos;
float eLinha(float v, float passo, float w){ float f = abs(fract(v / passo + .5) - .5) * passo; return 1. - smoothstep(0., w, f); }
void main(){
  vec3 p = vec3(vPos.x, 0., vPos.z);
  float grade = max(eLinha(p.x, 1., .03), eLinha(p.z, 1., .03)) * .45 + max(eLinha(p.x, 4., .06), eLinha(p.z, 4., .06));
  float onda = energiaOnda(p), fluido = energiaFluido(p);
  vec3 cor = energiaCor(p);
  vec3 c = cor * (grade * (onda * 2.4 + fluido * .7) + fluido * .32 + onda * .12);
  gl_FragColor = vec4(c, 1.);
}`;
/** as PAREDES vivas: a energia subindo em veias (o fluido esticado na vertical) e os pacotes correndo nas faixas */
const FRAG_PAREDE = /* glsl */ `${GLSL_ENERGIA}
varying vec3 vPos; varying vec2 vUv;
void main(){
  float onda = energiaOnda(vPos), fluido = energiaFluido(vPos * vec3(1., .35, 1.));
  float faixas = smoothstep(.012, 0., abs(vUv.y - .25)) + smoothstep(.012, 0., abs(vUv.y - .72)) + smoothstep(.02, 0., abs(vUv.y - .96));
  float pacote = pow(.5 + .5 * sin(vUv.x * 9. - uT * 4.), 30.);
  vec3 c = energiaCor(vPos) * (faixas * (.3 + onda * 1.8 + pacote * 1.1) + fluido * .22 * (1. - vUv.y) + onda * .12);
  gl_FragColor = vec4(c, 1.);
}`;
/** o TETO vivo: raios convergindo pra cúpula, a energia correndo pra dentro (ao contrário do piso) */
const FRAG_TETO = /* glsl */ `${GLSL_ENERGIA}
varying vec3 vPos;
void main(){
  vec2 d = vPos.xz - uNucleo; float r = length(d), a = atan(d.y, d.x);
  float raios = pow(abs(sin(a * 9.)), 40.) * smoothstep(4., 6., r);
  float volta = pow(.5 + .5 * sin(r * .9 + uT * 2.6), 16.);
  vec3 c = energiaCor(vPos) * (raios * (.2 + volta * 1.8) + energiaFluido(vPos) * .14);
  gl_FragColor = vec4(c, 1.);
}`;

const aditivoShader = (frag: string, u: UniformesEnergia) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms: { uT: u.uT, uNucleo: u.uNucleo, uOrigem: u.uOrigem }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
export const materialPisoVivo = (u: UniformesEnergia) => aditivoShader(FRAG_PISO, u);
export const materialParedeViva = (u: UniformesEnergia) => aditivoShader(FRAG_PAREDE, u);
export const materialTetoVivo = (u: UniformesEnergia) => aditivoShader(FRAG_TETO, u);
