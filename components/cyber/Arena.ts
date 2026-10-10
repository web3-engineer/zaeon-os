/**
 * Arena — a ARENA PvP na antiga praça (lib/cyber/arena): o anel de combate no chão (a borda acesa em vermelho-energia,
 * círculos e o emblema no centro), os PILARES de energia na borda, a placa "ARENA PvP" em holograma e os BONECOS DE
 * TREINO (hologramas que apanham: piscam, recuam e mostram a vida; o SPARRING ataca quem chega perto — acende vermelho
 * `SPARRING.aviso` s antes do golpe: dá pra desviar no dash). Quem decide se o golpe pegou é o engine (lib/cyber/combate).
 */
import * as THREE from "three";
import { ARENA, BONECOS, PILARES_ARENA, SPARRING, type Boneco } from "@/lib/cyber/arena";
import { VIDA_MAX } from "@/lib/cyber/combate";
import { PORTAL_PRACA } from "@/lib/cyber/praca";

export type BonecoVivo = Boneco & { vida: number; vivo: boolean; pos: THREE.Vector3; grupo: THREE.Group };
export type ArenaHandle = {
  group: THREE.Group;
  bonecos: BonecoVivo[];
  /** um golpe no boneco: dano, e de onde veio (recua pro outro lado) */
  acertar(id: string, dano: number, de: { x: number; z: number }, t: number): void;
  /** a cada quadro; `alvo` = o jogador (o sparring mira nele). Devolve se o SPARRING golpeou agora (de onde, pra onde) */
  atualizar(dt: number, t: number, alvo: { x: number; z: number } | null): { golpe: { x: number; z: number; rumo: number } | null; avisando: boolean };
  dispose(): void;
};

const COR = new THREE.Color(0x35ffd0), VERMELHO = new THREE.Color(0xff3b4e);

function textura(texto: string, w = 512, h = 128, cor = "#7dffe2"): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d")!; g.font = "900 78px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = cor; g.shadowBlur = 24; g.fillStyle = cor; g.fillText(texto, w / 2, h / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function criarArena(o: { low: boolean }): ArenaHandle {
  const g = new THREE.Group(); g.name = "arena-pvp"; g.position.set(ARENA.x, ARENA.y, ARENA.z);
  const geos: THREE.BufferGeometry[] = [], mats: THREE.Material[] = [], texs: THREE.Texture[] = [];
  const add = <T extends THREE.Object3D>(x: T) => { g.add(x); return x; };
  const aditivo = (cor: THREE.ColorRepresentation, op: number) => { const m = new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); mats.push(m); return m; };
  // ── o CHÃO: a borda de combate acesa + círculos + o emblema (anéis finos no piso) ──
  const anel = (r: number, larg: number, mat: THREE.Material) => { const ge = new THREE.RingGeometry(r - larg / 2, r + larg / 2, o.low ? 72 : 144); ge.rotateX(-Math.PI / 2); geos.push(ge); const m = add(new THREE.Mesh(ge, mat)); m.position.y = 0.04; return m; };
  const borda = aditivo(VERMELHO, 0.75), linhas = aditivo(COR, 0.28);
  anel(ARENA.r, 0.45, borda); anel(ARENA.r - 1.2, 0.08, linhas); anel(26, 0.1, linhas); anel(12, 0.14, linhas); anel(3.2, 0.3, aditivo(COR, 0.5));
  { const pts: number[] = []; for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; pts.push(Math.cos(a) * 3.6, 0.05, Math.sin(a) * 3.6, Math.cos(a) * (ARENA.r - 1.4), 0.05, Math.sin(a) * (ARENA.r - 1.4)); }
    const ge = new THREE.BufferGeometry(); ge.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)); geos.push(ge);
    const ml = new THREE.LineBasicMaterial({ color: COR, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending }); mats.push(ml); add(new THREE.LineSegments(ge, ml)); }
  // a PAREDE de energia baixa na borda (cilindro aberto, some pra cima)
  { const ge = new THREE.CylinderGeometry(ARENA.r, ARENA.r, 2.2, o.low ? 72 : 144, 1, true); geos.push(ge);
    const m = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uCor: { value: VERMELHO } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform float uT; uniform vec3 uCor; varying vec2 vUv; void main() { float a = (1.0 - vUv.y) * (0.18 + 0.1 * sin(vUv.x * 120.0 - uT * 3.0)); gl_FragColor = vec4(uCor, a); }" });
    mats.push(m); const parede = add(new THREE.Mesh(ge, m)); parede.position.y = 1.1; parede.userData.parede = m; g.userData.parede = m; }
  // ── PILARES de energia ──
  const metal = new THREE.MeshStandardMaterial({ color: 0x10171a, roughness: 0.35, metalness: 0.85, emissive: 0x081a16, emissiveIntensity: 0.5 }); mats.push(metal);
  const geoP = new THREE.CylinderGeometry(0.7, 1, 6, o.low ? 6 : 8); geos.push(geoP);
  const geoC = new THREE.OctahedronGeometry(0.75); geos.push(geoC);
  const matC = new THREE.MeshBasicMaterial({ color: 0xbffff0 }); mats.push(matC);
  const geoFeixe = new THREE.CylinderGeometry(0.06, 0.06, 6, 6, 1, true); geos.push(geoFeixe);
  const matFeixe = aditivo(COR, 0.55);
  const cristais: THREE.Mesh[] = [];
  for (const p of PILARES_ARENA) {
    const x = p.x - ARENA.x, z = p.z - ARENA.z;
    const pil = add(new THREE.Mesh(geoP, metal)); pil.position.set(x, 3, z);
    const c = add(new THREE.Mesh(geoC, matC)); c.position.set(x, 7, z); c.scale.y = 1.6; cristais.push(c);
    const f = add(new THREE.Mesh(geoFeixe, matFeixe)); f.position.set(x * 0.99, 3, z * 0.99);
  }
  // ── a PLACA "ARENA PvP" em holograma, do lado do buraco negro (quem chega vê) ──
  { const tex = textura("ARENA PvP"); texs.push(tex);
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); mats.push(m);
    const ge = new THREE.PlaneGeometry(14, 3.5); geos.push(ge);
    const placa = add(new THREE.Mesh(ge, m)), a = Math.atan2(PORTAL_PRACA.z, PORTAL_PRACA.x) + 0.55, r = ARENA.r - 6;
    placa.position.set(Math.cos(a) * r, 6.5, Math.sin(a) * r); placa.lookAt(0, 6.5, 0); }

  // ── os BONECOS DE TREINO (hologramas) ──
  const geoCorpo = new THREE.CapsuleGeometry(0.42, 1.1, 4, 10); geoCorpo.translate(0, 1.0, 0); geos.push(geoCorpo);
  const geoCab = new THREE.SphereGeometry(0.28, 12, 10); geoCab.translate(0, 2.05, 0); geos.push(geoCab);
  const geoBase = new THREE.CylinderGeometry(0.75, 0.85, 0.12, 20); geoBase.translate(0, 0.06, 0); geos.push(geoBase);
  const geoBraco = new THREE.BoxGeometry(0.14, 0.14, 1.6); geoBraco.translate(0, 0, 0.8); geos.push(geoBraco);
  const geoVida = new THREE.PlaneGeometry(1.1, 0.1); geoVida.translate(0.55, 0, 0); geos.push(geoVida);
  const bonecos: (BonecoVivo & { mat: THREE.MeshBasicMaterial; recuo: THREE.Vector2; flash: number; caiuEm: number; vidaBarra: THREE.Mesh; braco: THREE.Mesh | null; fase: "parado" | "aviso" | "recarga"; tFase: number; rumoAtual: number })[] = [];
  for (const b of BONECOS) {
    const grupo = new THREE.Group(); grupo.position.set(b.x - ARENA.x, 0, b.z - ARENA.z); grupo.rotation.y = b.rumo; g.add(grupo);
    const mat = new THREE.MeshBasicMaterial({ color: b.sparring ? 0xff7a3c : 0x5fffe0, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }); mats.push(mat);
    grupo.add(new THREE.Mesh(geoCorpo, mat), new THREE.Mesh(geoCab, mat), new THREE.Mesh(geoBase, metal));
    const matV = new THREE.MeshBasicMaterial({ color: 0x35ffd0, depthTest: false, transparent: true }); mats.push(matV);
    const fundo = new THREE.Mesh(geoVida, new THREE.MeshBasicMaterial({ color: 0x0b1a17, transparent: true, opacity: 0.7, depthTest: false })); mats.push(fundo.material as THREE.Material);
    const barra = new THREE.Mesh(geoVida, matV); barra.renderOrder = 10; fundo.renderOrder = 9;
    fundo.position.set(-0.55, 2.6, 0); barra.position.set(-0.55, 2.6, 0.001); grupo.add(fundo, barra);
    let braco: THREE.Mesh | null = null;
    if (b.sparring) { braco = new THREE.Mesh(geoBraco, mat); braco.position.set(0.45, 1.35, 0); braco.rotation.y = -1.2; grupo.add(braco); }
    bonecos.push({ ...b, vida: VIDA_MAX, vivo: true, pos: new THREE.Vector3(b.x, 0, b.z), grupo, mat, recuo: new THREE.Vector2(), flash: 0, caiuEm: -1, vidaBarra: barra, braco, fase: "parado", tFase: 0, rumoAtual: b.rumo });
  }
  const camQ = new THREE.Quaternion();
  return {
    group: g, bonecos,
    acertar(id, dano, de, t) {
      const b = bonecos.find((x) => x.id === id); if (!b || !b.vivo) return;
      b.vida = Math.max(0, b.vida - dano); b.flash = 1;
      const dx = b.x - de.x, dz = b.z - de.z, d = Math.hypot(dx, dz) || 1; b.recuo.set((dx / d) * 0.35, (dz / d) * 0.35);
      if (b.vida <= 0) { b.vivo = false; b.caiuEm = t; }
    },
    atualizar(dt, t, alvo) {
      const parede = g.userData.parede as THREE.ShaderMaterial; parede.uniforms.uT!.value = t;
      for (const c of cristais) c.rotation.y = t * 0.8;
      let golpe: { x: number; z: number; rumo: number } | null = null, avisando = false;
      for (const b of bonecos) {
        // caído: some e volta inteiro depois de 2,5 s
        if (!b.vivo && t - b.caiuEm > 2.5) { b.vivo = true; b.vida = VIDA_MAX; }
        const caido = !b.vivo, k = caido ? Math.max(0.05, 1 - (t - b.caiuEm) * 2) : 1;
        b.grupo.scale.setScalar(k);
        b.recuo.multiplyScalar(Math.exp(-dt * 8)); b.flash = Math.max(0, b.flash - dt * 5);
        b.grupo.position.set(b.x - ARENA.x + b.recuo.x, 0, b.z - ARENA.z + b.recuo.y);
        b.grupo.rotation.z = b.recuo.length() * 0.6;
        const base = b.sparring ? new THREE.Color(0xff7a3c) : new THREE.Color(0x5fffe0);
        b.mat.color.copy(base).lerp(new THREE.Color(0xffffff), b.flash);
        b.vidaBarra.scale.x = Math.max(0.001, b.vida / VIDA_MAX);
        (b.vidaBarra.material as THREE.MeshBasicMaterial).color.setHex(b.vida > 50 ? 0x35ffd0 : b.vida > 25 ? 0xffc46b : 0xff3b4e);
        // as barras de vida olham pra câmera (o grupo gira: compensa)
        b.vidaBarra.parent!.getWorldQuaternion(camQ);
        // SPARRING: mira em quem chega perto, ACENDE vermelho (o aviso) e golpeia; depois recarrega
        if (b.sparring && b.vivo && b.braco) {
          const perto = alvo && Math.hypot(alvo.x - b.x, alvo.z - b.z) < SPARRING.alcance + 1.5;
          if (alvo && perto) { const r = Math.atan2(alvo.x - b.x, alvo.z - b.z); let d = r - b.rumoAtual; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; b.rumoAtual += d * Math.min(1, dt * 6); }
          b.grupo.rotation.y = b.rumoAtual;
          b.tFase += dt;
          if (b.fase === "parado" && perto && b.tFase > 0.4) { b.fase = "aviso"; b.tFase = 0; }
          if (b.fase === "aviso") {
            avisando = true;
            b.mat.color.copy(VERMELHO).lerp(new THREE.Color(0xffffff), 0.4 * Math.abs(Math.sin(t * 30)));
            b.braco.rotation.y = -1.2 - 1.0 * Math.min(1, b.tFase / SPARRING.aviso);   // puxa o braço pra trás
            if (b.tFase >= SPARRING.aviso) { b.fase = "recarga"; b.tFase = 0; golpe = { x: b.x, z: b.z, rumo: b.rumoAtual }; }
          } else if (b.fase === "recarga") {
            b.braco.rotation.y = -2.2 + Math.min(1, b.tFase / 0.12) * 3.0 - Math.max(0, b.tFase - 0.25) * 2;   // o golpe varre pra frente e volta
            if (b.tFase >= SPARRING.intervalo) { b.fase = "parado"; b.tFase = 0; b.braco.rotation.y = -1.2; }
          }
        }
      }
      return { golpe, avisando };
    },
    dispose() { for (const x of geos) x.dispose(); for (const m of mats) m.dispose(); for (const x of texs) x.dispose(); g.removeFromParent(); },
  };
}
