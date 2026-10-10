/**
 * VELOCIDADE NA TELA (moto rápida / boost), em duas partes:
 *  - LINHAS DE VELOCIDADE estilo anime (riscos finos correndo das bordas pro lado de fora) + vinheta: uma camada por
 *    CIMA da cena, sem ler textura — barata, liga em QUALQUER aparelho/qualidade;
 *  - BLUR RADIAL (o borrão de quando a câmera é que corre — as bordas esticam pro centro, o meio fica nítido): a cena vai
 *    pra uma textura e um quad de tela inteira lê ela com `AMOSTRAS` toques ao longo do raio — só quando a qualidade
 *    deixa (é uma tela inteira a mais).
 *  - a ONDA DE CHOQUE (rompeu a barreira do som): um anel sai do centro e se abre até as bordas — na passada cara ele
 *    DISTORCE a cena (a refração do choque) e clareia; na barata, é um anel de luz. Mais um clarão no começo.
 * Desligado (`forca` ≈ 0 e sem onda) a cena desenha direto na tela — custo zero fora da moto.
 */
import * as THREE from "three";

const AMOSTRAS = 10;

/** as LINHAS + vinheta (GLSL compartilhado pelas duas passadas): devolve (cor das linhas, alfa das linhas, alfa da vinheta) */
const LINHAS = `
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  vec3 linhas(vec2 d, float r, float uForca, float uT, float uAspecto) {
    float ang = atan(d.y, d.x * uAspecto), fatia = floor((ang + 3.14159) * 40.0);
    float liga = step(0.76, hash(fatia + floor(uT * 8.0 + hash(fatia) * 8.0)));        // cada fatia acende de vez em quando
    float fino = smoothstep(0.42, 0.0, abs(fract((ang + 3.14159) * 40.0) - 0.5)) * liga;
    float corre = fract(r * 2.0 - uT * 4.0 + hash(fatia * 1.7));                         // o risco corre pra fora
    float linha = fino * smoothstep(0.28, 0.7, r) * smoothstep(0.0, 0.2, corre) * (1.0 - corre);
    float a = linha * 0.55 * clamp((uForca - 0.15) * 1.4, 0.0, 1.0);
    float vin = 0.28 * clamp(uForca, 0.0, 1.0) * smoothstep(0.42, 0.95, r);               // as bordas escurecem (o olhar vai pro centro)
    return vec3(a, vin, 0.0);
  }
  // a ONDA (uOnda 0..1 = o progresso; < 0 = sem onda): o raio do anel, a força dele (some no fim) e o clarão do começo
  float anelOnda(float r, float uOnda) {
    if (uOnda < 0.0) return 0.0;
    float raio = 0.05 + uOnda * 1.1, larg = 0.03 + 0.07 * uOnda;
    return exp(-pow((r - raio) / larg, 2.0)) * pow(1.0 - uOnda, 1.5);
  }
  float clarao(float uOnda) { return uOnda < 0.0 ? 0.0 : 0.55 * exp(-uOnda * 9.0); }`;

export type VelocidadeTela = {
  /** desenha o quadro: `desenhar()` = o desenho normal da cena (no alvo atual); `forca` 0..~1.2; `blur` = liga a
   *  passada cara (o blur radial) — sem ela, as linhas e a vinheta vão por cima da cena; `onda` = o progresso (0..1)
   *  da onda de choque da barreira do som (< 0 = nenhuma) */
  render(R: THREE.WebGLRenderer, forca: number, t: number, desenhar: () => void, blur: boolean, onda?: number): void;
  /** (no carregamento) compila os materiais da `cena` na versão de desenhar NA TEXTURA do blur — é outro programa por
   *  material (a saída fica linear); sem isso, o 1º blur compilava a cena inteira de novo (~0,3 s travado) */
  compilar(R: THREE.WebGLRenderer, cena: THREE.Object3D, cam: THREE.Camera): Promise<void>;
  dispose(): void;
};

export function criarVelocidadeTela(o: { amostrasMsaa: number }): VelocidadeTela {
  let rt: THREE.WebGLRenderTarget | null = null;
  const tam = new THREE.Vector2();
  const vert = "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
  const uniforms = () => ({ tCena: { value: null as THREE.Texture | null }, uForca: { value: 0 }, uT: { value: 0 }, uAspecto: { value: 1 }, uOnda: { value: -1 } });
  // passada CARA: cena (textura) + blur radial + linhas + vinheta
  const matBlur = new THREE.ShaderMaterial({
    uniforms: uniforms(), vertexShader: vert,
    fragmentShader: `
      uniform sampler2D tCena; uniform float uForca, uT, uAspecto, uOnda; varying vec2 vUv;
      ${LINHAS}
      void main() {
        vec2 d = vUv - 0.5; float r = length(d * vec2(uAspecto, 1.0));
        float onda = anelOnda(r, uOnda);
        d *= 1.0 - 0.09 * onda;                                   // a refração do choque: o anel puxa a cena pra dentro
        float k = uForca * 0.09 * smoothstep(0.12, 0.75, r);   // o meio nítido; nas bordas estica até ~9% da tela
        vec4 c = vec4(0.0);
        for (int i = 0; i < ${AMOSTRAS}; i++) c += texture2D(tCena, 0.5 + d * (1.0 - k * float(i) / ${AMOSTRAS - 1}.0));
        c /= ${AMOSTRAS}.0;
        vec3 l = linhas(d, r, uForca, uT, uAspecto);
        c.rgb = c.rgb * (1.0 - l.y) + vec3(0.8, 0.94, 1.0) * l.x;
        c.rgb += vec3(0.85, 0.93, 1.0) * (onda * 0.35 + clarao(uOnda));
        gl_FragColor = vec4(c.rgb, 1.0);
        #include <colorspace_fragment>
      }`,
    depthTest: false, depthWrite: false,
  });
  // passada BARATA: só as linhas e a vinheta, misturadas por cima (alfa normal: as linhas clareiam, a vinheta escurece)
  const matLinhas = new THREE.ShaderMaterial({
    uniforms: uniforms(), vertexShader: vert,
    fragmentShader: `
      uniform float uForca, uT, uAspecto, uOnda; varying vec2 vUv;
      ${LINHAS}
      void main() {
        vec2 d = vUv - 0.5; float r = length(d * vec2(uAspecto, 1.0));
        vec3 l = linhas(d, r, uForca, uT, uAspecto);
        float luz = l.x + anelOnda(r, uOnda) * 0.5 + clarao(uOnda);   // sem a cena em textura: a onda vira um anel de luz
        float a = clamp(luz + l.y, 0.0, 1.0);
        gl_FragColor = vec4(vec3(0.8, 0.94, 1.0) * (luz / max(a, 1e-4)), a);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), matBlur); quad.frustumCulled = false;
  const cenaQuad = new THREE.Scene(); cenaQuad.add(quad);
  const camQuad = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const preparar = (m: THREE.ShaderMaterial, forca: number, t: number, onda: number) => { m.uniforms.uForca!.value = forca; m.uniforms.uT!.value = t; m.uniforms.uAspecto!.value = tam.x / Math.max(1, tam.y); m.uniforms.uOnda!.value = onda; quad.material = m; };
  const alvo = (R: THREE.WebGLRenderer) => {
    R.getDrawingBufferSize(tam);
    if (!rt || rt.width !== tam.x || rt.height !== tam.y) {
      rt?.dispose();
      // HalfFloat: a cena fica LINEAR na textura (a conversão pra sRGB é no quad) — com 8 bits o escuro faria degraus
      rt = new THREE.WebGLRenderTarget(tam.x, tam.y, { type: THREE.HalfFloatType, samples: o.amostrasMsaa, depthBuffer: true });
    }
    return rt;
  };
  return {
    async compilar(R, cena, cam) {
      const ant = R.getRenderTarget(); R.setRenderTarget(alvo(R));
      try { await R.compileAsync(cena, cam); } catch { /* sem compilação paralela: compila no 1º blur */ } finally { R.setRenderTarget(ant); }
    },
    render(R, forca, t, desenhar, blur, onda = -1) {
      if (forca < 0.03 && !(onda >= 0 && onda < 1)) { desenhar(); return; }
      R.getDrawingBufferSize(tam);
      if (!blur) { desenhar(); preparar(matLinhas, forca, t, onda); R.render(cenaQuad, camQuad); return; }
      const alvoBlur = alvo(R), ant = R.getRenderTarget();
      R.setRenderTarget(alvoBlur); desenhar(); R.setRenderTarget(ant);
      matBlur.uniforms.tCena!.value = alvoBlur.texture; preparar(matBlur, forca, t, onda);
      R.render(cenaQuad, camQuad);
    },
    dispose() { rt?.dispose(); matBlur.dispose(); matLinhas.dispose(); quad.geometry.dispose(); },
  };
}
