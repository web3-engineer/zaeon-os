/**
 * PistaCorrida — as PISTAS de corrida no mundo (lib/cyber/corrida/pistas): ficam SEMPRE lá (a Zaeon tem circuito), bem
 * discretas; numa corrida a pista da vez acende.
 *  - PORTÕES: anéis de energia (shader: a luz corre em volta do anel), na cor da pista; os de BOOST em âmbar com um
 *    disco de raios por dentro; a LARGADA com o pórtico quadriculado (dois pilares + a faixa);
 *  - o PRÓXIMO portão: pulsa forte e ganha um FEIXE de luz vertical (dá pra achar de longe); os já cruzados apagam;
 *  - a TRILHA: pontinhos de luz a cada 14 m embaixo do traçado (o "asfalto" do hiperespaço).
 */
import * as THREE from "three";
import { PISTAS, type Pista } from "@/lib/cyber/corrida/pistas";

export type PistasHandle = {
  group: THREE.Group;
  /** a corrida da vez (ou null): a pista acende; `proximo` = o portão a cruzar; `passados` = quantos já foram nesta volta */
  definir(o: { pista: string; proximo: number } | null): void;
  atualizar(t: number): void;
  dispose(): void;
};

const AMBAR = new THREE.Color("#ffc46b");

function materialAnel(cor: THREE.Color, uT: { value: number }): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uT, uCor: { value: cor }, uForca: { value: 0.35 } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uT, uForca; uniform vec3 uCor; varying vec2 vUv;
      void main() {
        float corre = 0.55 + 0.45 * smoothstep(0.6, 1.0, sin(vUv.x * 6.2831 * 6.0 - uT * 9.0));   // pulsos correndo em volta
        float borda = 0.6 + 0.4 * sin(vUv.y * 6.2831);
        vec3 c = mix(uCor, vec3(1.0), 0.25 * corre) * corre * borda * uForca * 1.6;
        gl_FragColor = vec4(c, 1.0);
      }`,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  });
}

function texQuadriculado(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas"); c.width = 128; c.height = 32; const x = c.getContext("2d"); if (!x) return null;
  for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? "#ffffff" : "#0b1020"; x.fillRect(i * 8, j * 8, 8, 8); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; return t;
}

type PortaoVis = { grupo: THREE.Group; mat: THREE.ShaderMaterial; base: number };
type PistaVis = { pista: Pista; grupo: THREE.Group; portoes: PortaoVis[]; trilha: THREE.Points; matTrilha: THREE.PointsMaterial };

export function criarPistas(o: { low: boolean; starTex: THREE.Texture }): PistasHandle {
  const group = new THREE.Group(); group.name = "pistas";
  const uT = { value: 0 }, quad = texQuadriculado();
  const geoAnel = new Map<number, THREE.TorusGeometry>(), anel = (r: number) => { let g = geoAnel.get(r); if (!g) { g = new THREE.TorusGeometry(r, 0.55, 8, o.low ? 40 : 72); geoAnel.set(r, g); } return g; };
  const geoPilar = new THREE.CylinderGeometry(0.9, 1.1, 1, 10), matPilar = new THREE.MeshStandardMaterial({ color: 0x1c2436, metalness: 0.7, roughness: 0.35, emissive: 0x0a1020 });
  const matFaixa = new THREE.MeshBasicMaterial({ map: quad, side: THREE.DoubleSide });
  const matDisco = new THREE.MeshBasicMaterial({ color: AMBAR, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  // o FEIXE do próximo portão (um só, muda de lugar)
  const feixe = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 160, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  feixe.visible = false; group.add(feixe);

  const pistas: PistaVis[] = PISTAS.map((p) => {
    const g = new THREE.Group(); g.name = `pista-${p.id}`; group.add(g);
    const cor = new THREE.Color(p.cor);
    const portoes = p.portoes.map((pt) => {
      const gp = new THREE.Group(); gp.position.set(pt.x, pt.y, pt.z); gp.rotation.y = pt.rumo; g.add(gp);
      const mat = materialAnel(pt.tipo === "boost" ? AMBAR : cor, uT);
      const m = new THREE.Mesh(anel(pt.r), mat); gp.add(m);   // o toro deitado no plano xy = de frente pro rumo (+z local)
      if (pt.tipo === "boost") { const d = new THREE.Mesh(new THREE.CircleGeometry(pt.r * 0.92, 32), matDisco); gp.add(d); }
      if (pt.tipo === "largada") {
        for (const s of [-1, 1]) { const pil = new THREE.Mesh(geoPilar, matPilar); pil.scale.y = pt.r + 10; pil.position.set(s * (pt.r + 2), (pt.r + 10) / 2 - pt.y, 0); gp.add(pil); }
        const faixa = new THREE.Mesh(new THREE.PlaneGeometry(pt.r * 2 + 6, 3.2), matFaixa); faixa.position.set(0, pt.r + 4, 0); gp.add(faixa);
      }
      return { grupo: gp, mat, base: pt.tipo === "largada" ? 0.55 : 0.32 };
    });
    // a TRILHA: pontinhos a cada 14 m, 3 m abaixo do traçado
    const n = Math.floor(p.comprimento / 14), pos = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) { const q = p.ponto(k * 14); pos[k * 3] = q.x; pos[k * 3 + 1] = q.y - 3; pos[k * 3 + 2] = q.z; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const matTrilha = new THREE.PointsMaterial({ size: 1.6, map: o.starTex, color: cor, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    const trilha = new THREE.Points(geo, matTrilha); trilha.frustumCulled = false; g.add(trilha);
    return { pista: p, grupo: g, portoes, trilha, matTrilha };
  });

  let ativa: { pista: string; proximo: number } | null = null;
  return {
    group,
    definir(a) { ativa = a; },
    atualizar(t) {
      uT.value = t;
      for (const v of pistas) {
        const minha = ativa?.pista === v.pista.id;
        v.matTrilha.opacity = minha ? 0.75 : ativa ? 0.12 : 0.3;
        v.portoes.forEach((p, i) => {
          const prox = minha && i === ativa!.proximo;
          const f = prox ? 1.3 + 0.5 * Math.sin(t * 8) : minha ? p.base * 1.4 : ativa ? p.base * 0.4 : p.base;
          p.mat.uniforms.uForca!.value = f; p.grupo.scale.setScalar(prox ? 1 + 0.04 * Math.sin(t * 8) : 1);
        });
      }
      const v = ativa ? pistas.find((x) => x.pista.id === ativa!.pista) : null, g = v?.pista.portoes[ativa!.proximo];
      feixe.visible = !!g;
      if (g) { feixe.position.set(g.x, g.y + 78, g.z); (feixe.material as THREE.MeshBasicMaterial).opacity = 0.14 + 0.08 * Math.sin(t * 5); }
    },
    dispose() {
      group.traverse((x) => { const m = x as THREE.Mesh; if (m.geometry && !geoAnel.has((m.geometry as THREE.TorusGeometry).parameters?.radius ?? -1)) m.geometry.dispose(); const mt = m.material as THREE.Material | undefined; mt?.dispose?.(); });
      for (const g of geoAnel.values()) g.dispose(); quad?.dispose(); group.removeFromParent();
    },
  };
}
