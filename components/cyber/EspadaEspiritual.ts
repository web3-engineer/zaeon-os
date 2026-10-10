/**
 * EspadaEspiritual — a ESPADA ESPIRITUAL (nível 7), o 1º item de ataque do inventário (lib/cyber/inventario). Feita em
 * código a partir da arte de referência do dono: lâmina longa ESCURA de metal com a LINHA CENTRAL verde-água acesa (nas
 * duas faces), RUNAS brilhando perto da guarda, a GUARDA em asa com espinhos curvos e uma gema no meio, o cabo escuro
 * com anéis, o POMO em ponta — e os TENDÕES DE ENERGIA (fios finos e tortos em volta da lâmina, cintilando, com pulsos
 * correndo por eles).
 * Espiritual: ela se MATERIALIZA de energia (da guarda até a ponta, com um clarão) e se desfaz do mesmo jeito (`revela`).
 * Referencial: a origem é o ponto do CABO onde a mão segura; a lâmina aponta pra +y; a face larga olha pra ±z.
 */
import * as THREE from "three";

export type EspadaHandle = {
  group: THREE.Group;
  /** `revela` 0..1: quanto da espada já se materializou (0 = sumida); `t` = o relógio */
  atualizar(t: number, revela: number): void;
  dispose(): void;
};

const VERDE = new THREE.Color(0x35ffd0), VERDE_FUNDO = new THREE.Color(0x0b7a62);
const LAMINA = { comp: 1.05, larg: 0.078, ponta: 0.11, esp: 0.014 } as const;
const GUARDA_Y = 0.13;   // onde a guarda fica (acima da mão)

/** as runas (canvas): traços de glifo verde-água sobre transparente */
function texturaRunas(): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = 64; c.height = 256;
  const g = c.getContext("2d")!;
  g.strokeStyle = "#7dffe2"; g.lineWidth = 3; g.shadowColor = "#35ffd0"; g.shadowBlur = 8; g.lineCap = "round";
  // um "I" ornamentado em cima + glifos empilhados (a arte tem um emblema logo abaixo da guarda)
  g.beginPath(); g.moveTo(32, 6); g.lineTo(32, 248); g.stroke();
  g.beginPath(); g.moveTo(14, 20); g.lineTo(32, 44); g.lineTo(50, 20); g.stroke();
  for (let i = 0; i < 6; i++) {
    const y = 64 + i * 30, w = 10 + (i % 3) * 5;
    g.beginPath(); g.moveTo(32 - w, y); g.lineTo(32, y + 10); g.lineTo(32 + w, y); g.stroke();
    if (i % 2) { g.beginPath(); g.arc(32, y + 18, 4, 0, Math.PI * 2); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** um tendão de energia: um caminho torto que sobe enrolando a lâmina (semente → forma) */
function caminhoTendao(semente: number): THREE.CatmullRomCurve3 {
  let a = (semente * 7919) % 233280; const r = () => ((a = (a * 9301 + 49297) % 233280) / 233280);   // (LCG clássico)
  const pts: THREE.Vector3[] = [], y0 = GUARDA_Y + 0.04 + r() * 0.62, y1 = y0 + 0.22 + r() * 0.3, n = 12, giro = (r() - 0.5) * 9;
  for (let i = 0; i <= n; i++) {
    const u = i / n, ang = giro * u + r() * 0.9, raio = LAMINA.larg * (0.6 + r() * 0.85);
    pts.push(new THREE.Vector3(Math.cos(ang) * raio, y0 + (y1 - y0) * u + (r() - 0.5) * 0.03, Math.sin(ang) * raio * 0.55));
  }
  return new THREE.CatmullRomCurve3(pts);
}

export function criarEspadaEspiritual(o: { low: boolean }): EspadaHandle {
  const g = new THREE.Group(); g.name = "espada-espiritual";
  const corpo = new THREE.Group(); g.add(corpo);   // (a parte que se materializa)
  const uni = { uT: { value: 0 }, uRevela: { value: 1 } };
  const metal = new THREE.MeshStandardMaterial({ color: 0x0d1513, roughness: 0.32, metalness: 0.9, emissive: VERDE_FUNDO, emissiveIntensity: 0.04 });
  const metalCabo = new THREE.MeshStandardMaterial({ color: 0x141a1c, roughness: 0.6, metalness: 0.5 });
  // o RECORTE da materialização: o que está acima de `revela` (na altura da espada) não aparece; a borda brilha
  const recorte = (m: THREE.Material) => {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uRevela = uni.uRevela;
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying float vYEsp;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvYEsp = position.y;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vYEsp; uniform float uRevela;")
        .replace("#include <dithering_fragment>", `#include <dithering_fragment>
          float lim = mix(-0.35, ${(GUARDA_Y + LAMINA.comp + LAMINA.ponta + 0.15).toFixed(3)}, uRevela);
          if (vYEsp > lim) discard;
          gl_FragColor.rgb += vec3(0.21, 1.0, 0.82) * smoothstep(lim - 0.06, lim, vYEsp) * 2.0;`);
    };
    m.customProgramCacheKey = () => "espada-recorte";
  };
  recorte(metal); recorte(metalCabo);

  // ── LÂMINA: o contorno (larga perto da guarda, afinando, ponta) extrudado fino, com bisel ──
  const s = new THREE.Shape(), L = LAMINA, y0 = GUARDA_Y;
  s.moveTo(-L.larg / 2, y0); s.lineTo(-L.larg * 0.42, y0 + L.comp * 0.55); s.lineTo(-L.larg * 0.36, y0 + L.comp); s.lineTo(0, y0 + L.comp + L.ponta);
  s.lineTo(L.larg * 0.36, y0 + L.comp); s.lineTo(L.larg * 0.42, y0 + L.comp * 0.55); s.lineTo(L.larg / 2, y0); s.lineTo(-L.larg / 2, y0);
  const geoL = new THREE.ExtrudeGeometry(s, { depth: L.esp, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.006, bevelSegments: 1, curveSegments: 4 });
  geoL.translate(0, 0, -L.esp / 2);
  corpo.add(new THREE.Mesh(geoL, metal));
  // a LINHA CENTRAL acesa (frente e verso) + o halo dela
  const matLinha = new THREE.MeshBasicMaterial({ color: VERDE, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  recorte(matLinha);
  const geoLinha = new THREE.PlaneGeometry(0.007, L.comp + L.ponta * 0.6); geoLinha.translate(0, y0 + (L.comp + L.ponta * 0.6) / 2, 0);
  for (const z of [1, -1]) { const m = new THREE.Mesh(geoLinha, matLinha); m.position.z = z * (L.esp / 2 + 0.0075); if (z < 0) m.rotation.y = Math.PI; corpo.add(m); }
  const matHalo = new THREE.MeshBasicMaterial({ color: VERDE, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  recorte(matHalo);
  const geoHalo = new THREE.PlaneGeometry(0.022, L.comp + L.ponta * 0.5); geoHalo.translate(0, y0 + (L.comp + L.ponta * 0.5) / 2, 0);
  for (const z of [1, -1]) { const m = new THREE.Mesh(geoHalo, matHalo); m.position.z = z * (L.esp / 2 + 0.008); corpo.add(m); }
  // as RUNAS logo abaixo da guarda (as duas faces)
  const texR = texturaRunas(), matRunas = new THREE.MeshBasicMaterial({ map: texR, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  recorte(matRunas);
  const geoR = new THREE.PlaneGeometry(0.06, 0.24); geoR.translate(0, y0 + 0.14, 0);
  for (const z of [1, -1]) { const m = new THREE.Mesh(geoR, matRunas); m.position.z = z * (L.esp / 2 + 0.0085); if (z < 0) m.rotation.y = Math.PI; corpo.add(m); }

  // ── GUARDA em asa: barra que abre pros lados e termina em ESPINHOS curvos pra baixo; a gema acesa no meio ──
  const gs = new THREE.Shape();
  gs.moveTo(0, 0.035); gs.quadraticCurveTo(0.08, 0.05, 0.15, 0.02); gs.lineTo(0.2, -0.03); gs.quadraticCurveTo(0.13, 0.0, 0.07, -0.02); gs.lineTo(0, -0.05);
  gs.lineTo(-0.07, -0.02); gs.quadraticCurveTo(-0.13, 0.0, -0.2, -0.03); gs.lineTo(-0.15, 0.02); gs.quadraticCurveTo(-0.08, 0.05, 0, 0.035);
  const geoG = new THREE.ExtrudeGeometry(gs, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.005, bevelSegments: 1, curveSegments: 6 });
  geoG.translate(0, y0 - 0.01, -0.015);
  corpo.add(new THREE.Mesh(geoG, metal));
  const matGema = new THREE.MeshBasicMaterial({ color: 0xbffff0 }); recorte(matGema);
  const gema = new THREE.Mesh(new THREE.OctahedronGeometry(0.018), matGema); gema.scale.set(0.8, 1.4, 0.5); gema.position.set(0, y0 + 0.01, 0.022); corpo.add(gema);

  // ── CABO com anéis + POMO em ponta ──
  const cabo = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.24, o.low ? 8 : 12), metalCabo); cabo.position.y = 0; corpo.add(cabo);
  for (const y of [-0.08, 0, 0.08]) { const anel = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 6, o.low ? 10 : 16), metal); anel.rotation.x = Math.PI / 2; anel.position.y = y; corpo.add(anel); }
  const pomo = new THREE.Mesh(new THREE.SphereGeometry(0.026, o.low ? 8 : 12, 8), metal); pomo.position.y = -0.135; corpo.add(pomo);
  const espinho = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 4), metal); espinho.rotation.x = Math.PI; espinho.position.y = -0.19; corpo.add(espinho);

  // ── os TENDÕES DE ENERGIA: fios finos que cintilam, com pulsos correndo (shader aditivo) ──
  const matTendao = new THREE.ShaderMaterial({
    uniforms: { uT: uni.uT, uRevela: uni.uRevela, uCor: { value: VERDE } },
    vertexShader: "varying vec2 vUv; varying float vY; void main() { vUv = uv; vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform float uT, uRevela; uniform vec3 uCor; varying vec2 vUv; varying float vY;
      float h(float n) { return fract(sin(n) * 43758.5453); }
      void main() {
        float lim = mix(-0.35, ${(GUARDA_Y + LAMINA.comp + LAMINA.ponta).toFixed(3)}, uRevela); if (vY > lim) discard;
        float pulso = smoothstep(0.85, 1.0, fract(vUv.x * 1.6 - uT * 1.3));
        float cint = 0.45 + 0.55 * step(0.35, h(floor(uT * 14.0) + floor(vUv.x * 6.0)));
        float a = (0.55 + 1.1 * pulso) * cint * smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
        gl_FragColor = vec4(uCor * (1.0 + pulso), a);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const NT = o.low ? 6 : 12;
  for (let k = 0; k < NT; k++) corpo.add(new THREE.Mesh(new THREE.TubeGeometry(caminhoTendao(k + 1), 48, 0.0065, 5, false), matTendao));

  // o CLARÃO da materialização (um brilho na borda que sobe) — um sprite que acompanha `revela`
  const texBrilho = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d")!, gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(200,255,240,1)"); gr.addColorStop(0.4, "rgba(53,255,208,.5)"); gr.addColorStop(1, "rgba(53,255,208,0)"); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(x as unknown as HTMLCanvasElement); })();
  const clarao = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrilho, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  clarao.scale.setScalar(0.25); g.add(clarao);

  for (const m of [g]) m.traverse((n) => { (n as THREE.Mesh).frustumCulled = false; n.castShadow = false; });
  let revelaAnt = -1;
  return {
    group: g,
    atualizar(t, revela) {
      uni.uT.value = t; uni.uRevela.value = revela;
      g.visible = revela > 0.001;
      // o clarão: forte enquanto materializa/desfaz (a borda subindo), some quando está inteira
      const mudando = Math.abs(revela - revelaAnt) > 1e-4 || (revela > 0.001 && revela < 0.999);
      const yBorda = -0.35 + (GUARDA_Y + L.comp + L.ponta + 0.37) * revela;
      clarao.position.set(0, yBorda, 0); clarao.material.opacity = mudando ? 0.9 : 0; clarao.visible = mudando && g.visible;
      // a linha central e o halo respiram de leve
      matHalo.opacity = 0.1 + 0.05 * Math.sin(t * 3.1); matLinha.opacity = 0.85 + 0.15 * Math.sin(t * 5.3);
      revelaAnt = revela;
    },
    dispose() {
      g.traverse((n) => { const m = n as THREE.Mesh; m.geometry?.dispose(); });
      for (const m of [metal, metalCabo, matLinha, matHalo, matRunas, matGema, matTendao, clarao.material]) m.dispose();
      texR.dispose(); texBrilho.dispose(); g.removeFromParent();
    },
  };
}
