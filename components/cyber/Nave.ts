/**
 * Nave — o veículo do dono (fica no hangar da Zaeon): um DISCO VOADOR alienígena grande e imponente. Casco escuro
 * metálico com veios de luz e uma crista (oval limpo, sem espinhos), RAIOS correndo pelos anéis de energia, uma CABINE rebaixada no dorso (assento de
 * piloto, console com telas, manches) sob uma redoma baixa e larga — o PILOTO é o avatar real de quem pilota, sentado
 * no `assento` (o engine o põe lá), o anel de luzes da borda girando (o "eixo
 * giratório") e um halo externo tracejado girando ao contrário, três PROPULSORES na barriga, pernas de pouso que
 * recolhem em voo. Voando: núcleo e veios acendem, rastro de plasma atrás (cresce com a velocidade) e, pairando,
 * chamas e jato dos propulsores. A redoma de vidro só aparece com alguém pilotando. Tudo em ondas LENTAS, sem estrobo; `prefers-reduced-motion` aquieta.
 * A origem do group é o ponto de apoio no chão; física do voo em lib/cyber/voo.ts.
 */
import * as THREE from "three";
import { glowTex } from "./CenaCosmica";
import { liberar } from "./Landmark";

export type NaveHandle = {
  group: THREE.Group;
  /** malhas pro clique (embarcar) */
  alvos: THREE.Object3D[];
  /** onde o piloto fica (dentro da cúpula) — o engine posiciona o avatar aqui enquanto pilota */
  assento: THREE.Object3D;
  /** `voando`: recolhe as pernas e acende tudo; `vel` (0..1) = rastro e giro; `curva` inclina */
  /** `fechada` = alguém pilotando: a redoma de vidro aparece (sem piloto, a cabine fica aberta) */
  atualizar(o: { dt: number; t: number; voando: boolean; vel: number; curva: number; fechada?: boolean }): void;
  dispose(): void;
};

/** escala do disco (o modelo é ~7,5 m de diâmetro em 1×) */
export const ESCALA_NAVE = 2.1;
/** fundo do poço da cabine (local, antes da escala) */
const POCO_Y = 0.3;
const ALIEN = new THREE.Color(0x8bffcf);   // verde-ciano "alienígena" das luzes
const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const escuroCab = () => new THREE.MeshStandardMaterial({ color: 0x10161d, roughness: 0.5, metalness: 0.7 });

export function criarNave(opts: { cor?: string; low: boolean }): NaveHandle {
  const cor = new THREE.Color(opts.cor ?? "#2f7bff");
  const raiz = new THREE.Group();
  const corpo = new THREE.Group(); raiz.add(corpo);   // inclinação/flutuação aqui; posição/yaw na raiz
  const alvos: THREE.Object3D[] = [];
  const seg = opts.low ? 32 : 64, parado = reducedMotion();
  const aditivo = (c: THREE.ColorRepresentation, o: number) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });

  // casco: disco com barriga funda, aba fina e uma CRISTA no dorso
  const metal = new THREE.MeshStandardMaterial({ color: 0x8a98a8, roughness: 0.3, metalness: 0.45, emissive: 0x10302c, emissiveIntensity: 0.5 });
  // perfil do disco; no dorso, o POÇO da cabine (rebaixo até POCO_Y, onde fica o assento do piloto)
  const perfil = [[0, -0.62], [1.1, -0.66], [2.4, -0.46], [3.5, -0.12], [3.78, 0.0], [3.6, 0.16], [2.9, 0.34], [2.55, 0.5], [2.3, 0.46], [1.75, 0.6], [1.32, 0.62], [1.2, POCO_Y + 0.02], [0, POCO_Y]].map(([r, y]) => new THREE.Vector2(r!, y!));
  const casco = new THREE.Mesh(new THREE.LatheGeometry(perfil, seg), metal); corpo.add(casco); alvos.push(casco);
  // veios de luz no dorso (anéis finos) + friso na aba
  const veioMat = aditivo(ALIEN, 0.5);
  for (const [r, y] of [[3.05, 0.3], [2.5, 0.53], [1.95, 0.6]] as const) { const v = new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 4, seg), veioMat); v.rotation.x = Math.PI / 2; v.position.y = y; corpo.add(v); }
  const friso = new THREE.Mesh(new THREE.TorusGeometry(3.68, 0.05, 6, seg), aditivo(ALIEN, 0.75)); friso.rotation.x = Math.PI / 2; friso.position.y = 0.05; corpo.add(friso);


  // CABINE no poço (autorada em METROS: o grupo desfaz a escala da nave): assento de piloto com encosto e apoio de
  // cabeça, braços, console curvo com telas na frente e dois manches — o avatar real senta no `assento`
  const cabine = new THREE.Group(); cabine.scale.setScalar(1 / ESCALA_NAVE); cabine.position.y = POCO_Y; corpo.add(cabine);
  const estofado = new THREE.MeshStandardMaterial({ color: 0x1b2430, roughness: 0.6, metalness: 0.3, emissive: 0x0d1a1a, emissiveIntensity: 0.4 });
  const frisoCab = aditivo(ALIEN, 0.7);
  const peca = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; cabine.add(m); return m; };
  const SZ = -0.25;   // o assento fica um pouco atrás do centro (a frente da nave é +z)
  peca(new THREE.CylinderGeometry(0.16, 0.24, 0.32, 12), escuroCab(), 0, 0.16, SZ);                     // pedestal
  peca(new THREE.BoxGeometry(0.56, 0.12, 0.54), estofado, 0, 0.38, SZ);                                 // assento
  peca(new THREE.BoxGeometry(0.56, 0.8, 0.12), estofado, 0, 0.82, SZ - 0.3, -0.18);                     // encosto
  peca(new THREE.BoxGeometry(0.3, 0.22, 0.1), estofado, 0, 1.33, SZ - 0.4, -0.18);                      // apoio de cabeça
  for (const lado of [-1, 1]) { peca(new THREE.BoxGeometry(0.08, 0.08, 0.46), estofado, lado * 0.33, 0.6, SZ); peca(new THREE.BoxGeometry(0.02, 0.6, 0.02), frisoCab, lado * 0.29, 0.85, SZ - 0.36, -0.18); }
  // console curvo na frente com três telas e dois manches
  const painelCurvo = new THREE.MeshStandardMaterial({ color: 0x1b2430, roughness: 0.6, metalness: 0.3, emissive: 0x0d1a1a, emissiveIntensity: 0.4, side: THREE.DoubleSide });
  peca(new THREE.CylinderGeometry(0.95, 0.95, 0.38, 24, 1, true, -0.75, 1.5), painelCurvo, 0, 0.6, SZ - 0.15);   // painel curvo (só a parede, em arco à frente)
  const borda = peca(new THREE.TorusGeometry(0.95, 0.018, 4, 24, 1.5), frisoCab, 0, 0.79, SZ - 0.15, Math.PI / 2); borda.rotation.z = Math.PI / 2 - 0.75;   // filete de luz no topo do painel
  const telaMat = new THREE.MeshBasicMaterial({ color: 0x66e6ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  for (const [x, ry] of [[-0.42, 0.5], [0, 0], [0.42, -0.5]] as const) { const tl = peca(new THREE.PlaneGeometry(0.34, 0.22), telaMat, x, 0.92, SZ + 0.72 - Math.abs(x) * 0.35, -0.55); tl.rotation.y = ry; }
  for (const lado of [-1, 1]) { peca(new THREE.CylinderGeometry(0.02, 0.025, 0.2, 8), escuroCab(), lado * 0.22, 0.76, SZ + 0.42); peca(new THREE.SphereGeometry(0.04, 10, 8), frisoCab, lado * 0.22, 0.87, SZ + 0.42); }
  const assento = new THREE.Object3D(); assento.position.set(0, POCO_Y, SZ / ESCALA_NAVE); corpo.add(assento);
  // REDOMA baixa e larga (flat, moderna): vidro fumê com aro de luz
  const cupula = new THREE.Mesh(new THREE.SphereGeometry(1.32, seg, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x0f3a44, emissiveIntensity: 0.3, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
  cupula.scale.y = 0.42; cupula.position.y = 0.6; corpo.add(cupula); alvos.push(cupula);
  const aroCupula = new THREE.Mesh(new THREE.TorusGeometry(1.33, 0.035, 6, seg), aditivo(cor.clone().lerp(ALIEN, 0.5), 0.85)); aroCupula.rotation.x = Math.PI / 2; aroCupula.position.y = 0.61; corpo.add(aroCupula);
  const luzInterna = opts.low ? null : new THREE.PointLight(ALIEN.getHex(), 0.8, 6); if (luzInterna) { luzInterna.position.set(0, 0.95, 0); corpo.add(luzInterna); }

  // o "EIXO GIRATÓRIO": anel de luzes da borda (gira) + halo externo tracejado (gira ao contrário)
  const NL = opts.low ? 14 : 22, aro = new THREE.Group(); corpo.add(aro);
  const luzes: THREE.MeshBasicMaterial[] = [];
  for (let i = 0; i < NL; i++) {
    const a = (i / NL) * Math.PI * 2, mat = new THREE.MeshBasicMaterial({ color: ALIEN.clone().lerp(new THREE.Color(0xffffff), 0.2), transparent: true, opacity: 0.8 });
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), mat); l.position.set(Math.cos(a) * 3.55, -0.04, Math.sin(a) * 3.55); aro.add(l); luzes.push(mat);
  }
  const halo = new THREE.Group(); halo.position.y = -0.1; halo.rotation.x = 0.06; corpo.add(halo);
  const haloMat = aditivo(ALIEN, 0.35), NH = opts.low ? 12 : 18;
  for (let i = 0; i < NH; i++) { const arco = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.04, 4, 8, (Math.PI * 2) / NH * 0.6), haloMat); arco.rotation.set(Math.PI / 2, 0, (i / NH) * Math.PI * 2); halo.add(arco); }

  // barriga: núcleo + anel
  const tex = glowTex("rgba(200,255,230,1)", "rgba(90,255,190,.3)");
  const nucleo = new THREE.Mesh(new THREE.CircleGeometry(1.0, seg), aditivo(ALIEN, 0.6)); nucleo.material.side = THREE.DoubleSide;
  nucleo.rotation.x = Math.PI / 2; nucleo.position.y = -0.67; corpo.add(nucleo);
  const anelBaixo = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.07, 6, seg), aditivo(ALIEN, 0.55)); anelBaixo.rotation.x = Math.PI / 2; anelBaixo.position.y = -0.55; corpo.add(anelBaixo);
  // PROPULSORES de verdade na barriga: três bocais com núcleo incandescente, chama em dois cones (miolo quente + envelope)
  // e um jato de partículas descendo; acendem em voo (sem piscar — a chama "respira" em ondas suaves)
  const metalEscuro = new THREE.MeshStandardMaterial({ color: 0x141b22, roughness: 0.4, metalness: 0.8 });
  const PROP = [0, 1, 2].map((i) => { const a = (i / 3) * Math.PI * 2 + Math.PI / 2; return { x: Math.cos(a) * 2.05, z: Math.sin(a) * 2.05 }; });
  const PROP_Y = -0.62;
  const chamas: { miolo: THREE.Mesh; envelope: THREE.Mesh; boca: THREE.MeshBasicMaterial; brilhoP: THREE.Sprite; fase: number }[] = [];
  for (const [i, p] of PROP.entries()) {
    const bocal = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.26, 20, 1, true), metalEscuro); bocal.position.set(p.x, PROP_Y - 0.08, p.z); corpo.add(bocal);
    const aroBocal = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.035, 6, 20), metalEscuro); aroBocal.rotation.x = Math.PI / 2; aroBocal.position.set(p.x, PROP_Y - 0.21, p.z); corpo.add(aroBocal);
    const boca = new THREE.MeshBasicMaterial({ color: 0xeafff6, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    const disco = new THREE.Mesh(new THREE.CircleGeometry(0.32, 20), boca); disco.rotation.x = Math.PI / 2; disco.position.set(p.x, PROP_Y - 0.2, p.z); corpo.add(disco);
    const miolo = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1, 16, 1, true), aditivo(0xffffff, 0.85)); miolo.rotation.x = Math.PI; corpo.add(miolo);
    const envelope = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1, 20, 1, true), aditivo(ALIEN.clone().lerp(new THREE.Color(0x66ccff), 0.4), 0.5)); envelope.rotation.x = Math.PI; corpo.add(envelope);
    for (const m of [miolo, envelope]) { (m.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide; m.position.set(p.x, 0, p.z); m.visible = false; }
    const brilhoP = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); brilhoP.position.set(p.x, PROP_Y - 0.35, p.z); corpo.add(brilhoP);
    chamas.push({ miolo, envelope, boca, brilhoP, fase: i * 2.1 });
  }
  // jato de partículas descendo dos bocais
  const JN = opts.low ? 36 : 72, jPos = new Float32Array(JN * 3), jDados = Array.from({ length: JN }, (_, i) => ({ b: i % 3, u: Math.random(), a: Math.random() * 6.283, r: Math.random() }));
  const jGeo = new THREE.BufferGeometry(); jGeo.setAttribute("position", new THREE.BufferAttribute(jPos, 3));
  const jMat = new THREE.PointsMaterial({ size: 0.4, map: tex, color: 0xd8fff0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const jato = new THREE.Points(jGeo, jMat); jato.frustumCulled = false; corpo.add(jato);

  // rastro de plasma atrás (−z local; a frente é +z), cresce com a velocidade
  const RN = opts.low ? 40 : 90, rPos = new Float32Array(RN * 3), rDados = Array.from({ length: RN }, () => ({ u: Math.random(), a: Math.random() * 6.283, r: Math.random() }));
  const rGeo = new THREE.BufferGeometry(); rGeo.setAttribute("position", new THREE.BufferAttribute(rPos, 3));
  const rMat = new THREE.PointsMaterial({ size: 0.6, map: tex, color: ALIEN.clone().lerp(new THREE.Color(0xffffff), 0.35), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const rastro = new THREE.Points(rGeo, rMat); rastro.frustumCulled = false; corpo.add(rastro);

  // RAIOS: eletricidade correndo pelos anéis de energia (borda, halo e barriga) e saltando entre a borda e o halo.
  // Cada raio é uma polilinha serrilhada que DESLIZA pelo anel; o serrilhado muda continuamente (ruído suave), sem
  // piscar — a intensidade sobe e desce em ondas lentas. Uma geometria (LineSegments) por grupo de raios.
  const PR = opts.low ? 10 : 16;   // pontos por raio
  type Raio = { r: number; y: number; span: number; vel: number; fase: number; amp: number; radial?: { r2: number } };
  // cada raio = 2 fios serrilhados (linhas de 1 px no WebGL) + um BRILHO (sprites aditivos) em cada vértice → espessura/luz
  const criarRaios = (raios: Raio[], cor: THREE.Color) => {
    const FIOS = 2, pos = new Float32Array(raios.length * FIOS * (PR - 1) * 6), g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({ color: cor, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
    const l = new THREE.LineSegments(g, mat); l.frustumCulled = false; corpo.add(l);
    const bPos = new Float32Array(raios.length * PR * 3), bg = new THREE.BufferGeometry(); bg.setAttribute("position", new THREE.BufferAttribute(bPos, 3));
    const bMat = new THREE.PointsMaterial({ map: tex, color: cor, size: 0.55, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
    const b = new THREE.Points(bg, bMat); b.frustumCulled = false; corpo.add(b);
    return { raios, pos, g, mat, bPos, bg, bMat };
  };
  const nRaio = (n: number, base: Omit<Raio, "fase">) => Array.from({ length: n }, (_, i) => ({ ...base, fase: (i / n) * Math.PI * 2 + Math.random() * 0.4 }));
  const branco = new THREE.Color(0xffffff);
  const grupoRaios = [
    criarRaios(nRaio(opts.low ? 3 : 5, { r: 3.6, y: -0.04, span: 0.85, vel: 0.9, amp: 0.17 }), ALIEN.clone().lerp(branco, 0.45)),        // pela borda (anel de luzes)
    criarRaios(nRaio(opts.low ? 3 : 4, { r: 4.5, y: -0.1, span: 0.65, vel: -0.6, amp: 0.2 }), ALIEN.clone().lerp(branco, 0.25)),        // pelo halo
    criarRaios(nRaio(opts.low ? 2 : 3, { r: 1.7, y: -0.56, span: 1.2, vel: 1.4, amp: 0.12 }), ALIEN.clone().lerp(branco, 0.6)),         // anel da barriga
    criarRaios(nRaio(opts.low ? 2 : 4, { r: 3.62, y: -0.06, span: 0, vel: 0.25, amp: 0.22, radial: { r2: 4.45 } }), ALIEN.clone().lerp(branco, 0.7)),   // arcos borda ↔ halo
  ];
  /** ruído suave (soma de senos) — o serrilhado "anda" sem saltos */
  const ruido = (x: number, t: number, s: number) => Math.sin(x * 7.3 + t * 5.1 + s) * 0.55 + Math.sin(x * 17.1 - t * 8.3 + s * 2.1) * 0.3 + Math.sin(x * 31.7 + t * 12.7 + s * 3.3) * 0.15;
  const atualizarRaios = (t: number, voo: number) => {
    for (const gr of grupoRaios) {
      const onda = 0.75 + 0.25 * Math.sin(t * 1.7 + gr.raios[0]!.r);
      gr.mat.opacity = (0.35 + 0.65 * voo) * onda; gr.bMat.opacity = (0.18 + 0.4 * voo) * onda;
      let k = 0, kb = 0;
      gr.raios.forEach((rz, bi) => {
        const centro = rz.fase + (parado ? 0 : t * rz.vel);
        for (let fio = 0; fio < 2; fio++) {
          let px = 0, py = 0, pz = 0;
          for (let i = 0; i < PR; i++) {
            const u = i / (PR - 1), afina = Math.sin(Math.PI * u), sd = bi * 1.37 + rz.r + fio * 4.1, amp = rz.amp * (fio ? 0.6 : 1);
            let x: number, y: number, z: number;
            if (rz.radial) {   // arco radial: da borda até o halo, num ângulo que gira devagar
              const rr = rz.r + (rz.radial.r2 - rz.r) * u, a = centro + ruido(u, t, sd) * 0.06 * afina;
              x = Math.cos(a) * rr; z = Math.sin(a) * rr; y = rz.y + ruido(u + 0.5, t, sd + 1) * amp * afina;
            } else {           // ao longo do anel: desliza e serrilha pra dentro/fora e pra cima/baixo
              const a = centro + (u - 0.5) * rz.span, rr = rz.r + ruido(u, t, sd) * amp * afina;
              x = Math.cos(a) * rr; z = Math.sin(a) * rr; y = rz.y + ruido(u + 0.37, t, sd + 2) * amp * 0.8 * afina;
            }
            if (i > 0) { gr.pos[k++] = px; gr.pos[k++] = py; gr.pos[k++] = pz; gr.pos[k++] = x; gr.pos[k++] = y; gr.pos[k++] = z; }
            if (fio === 0) { gr.bPos[kb++] = x; gr.bPos[kb++] = y; gr.bPos[kb++] = z; }
            px = x; py = y; pz = z;
          }
        }
      });
      gr.g.attributes.position!.needsUpdate = true; gr.bg.attributes.position!.needsUpdate = true;
    }
  };

  // pernas de pouso (recolhem em voo)
  const trem = new THREE.Group(); corpo.add(trem);
  const escuro = new THREE.MeshStandardMaterial({ color: 0x1a2328, roughness: 0.5, metalness: 0.7 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2, x = Math.cos(a) * 1.9, z = Math.sin(a) * 1.9;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.75, 8), escuro); p.position.set(x, -0.62, z); p.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25); trem.add(p);
    const pe = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.06, 12), escuro); pe.position.set(x * 1.08, -0.98, z * 1.08); trem.add(pe);
  }

  raiz.scale.setScalar(ESCALA_NAVE);
  let inclina = 0, voo = 0, giro = 0;
  return {
    group: raiz, alvos, assento,
    atualizar({ dt, t, voando, vel, curva, fechada = voando }) {
      cupula.visible = aroCupula.visible = fechada;
      voo += ((voando ? 1 : 0) - voo) * Math.min(1, dt * 3);
      trem.scale.y = Math.max(0.01, 1 - voo); trem.visible = voo < 0.95;
      corpo.position.y = 1.0 + voo * (parado ? 0 : Math.sin(t * 1.1) * 0.12);   // em solo apoia nas pernas; em voo, flutua
      inclina += (Math.max(-0.3, Math.min(0.3, -curva * 0.45)) * voo - inclina) * Math.min(1, dt * 4);
      corpo.rotation.z = inclina;
      // eixo giratório: luzes da borda giram (mais rápido com velocidade) com onda de brilho LENTA; o halo gira ao contrário
      giro += dt * (parado ? 0.05 : 0.3 + 0.9 * Math.min(1, vel)) * (0.4 + 0.6 * voo);
      aro.rotation.y = giro; halo.rotation.y = -giro * 0.6;
      luzes.forEach((m, i) => { m.opacity = 0.45 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.5 - (i / luzes.length) * Math.PI * 2)) * (0.5 + 0.5 * voo); });
      haloMat.opacity = 0.12 + 0.35 * voo;
      atualizarRaios(t, voo);
      veioMat.opacity = 0.35 + 0.4 * voo * (0.75 + 0.25 * Math.sin(t * 1.3));
      (nucleo.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.55 * voo;
      // propulsores: chama cresce com o empuxo (pairar = sustentação; andar = mais forte), respirando devagar
      const empuxo = voo * (0.65 + 0.35 * Math.min(1, vel));
      for (const c of chamas) {
        const resp = parado ? 1 : 0.9 + 0.1 * Math.sin(t * 6 + c.fase) + 0.05 * Math.sin(t * 13.7 + c.fase * 2);
        const Lm = (0.5 + 1.1 * empuxo) * resp, Le = (0.9 + 2.1 * empuxo) * resp;
        c.miolo.visible = c.envelope.visible = empuxo > 0.02;
        c.miolo.scale.set(1, Lm, 1); c.miolo.position.y = PROP_Y - 0.2 - Lm / 2;
        c.envelope.scale.set(1, Le, 1); c.envelope.position.y = PROP_Y - 0.2 - Le / 2;
        (c.envelope.material as THREE.MeshBasicMaterial).opacity = 0.45 * empuxo; (c.miolo.material as THREE.MeshBasicMaterial).opacity = 0.85 * empuxo;
        c.boca.opacity = 0.25 + 0.75 * empuxo; (c.brilhoP.material as THREE.SpriteMaterial).opacity = 0.7 * empuxo; c.brilhoP.scale.setScalar(1.2 + 1.4 * empuxo);
      }
      jMat.opacity = 0.8 * empuxo; jato.visible = empuxo > 0.02;
      if (jato.visible) {
        for (let i = 0; i < JN; i++) {
          const d = jDados[i]!, b = PROP[d.b]!; if (!parado) d.u = (d.u + dt * (1.6 + empuxo)) % 1;
          const rr = 0.08 + d.r * 0.25 * (0.3 + d.u);
          jPos[i * 3] = b.x + Math.cos(d.a) * rr; jPos[i * 3 + 1] = PROP_Y - 0.3 - d.u * (1.5 + 3 * empuxo); jPos[i * 3 + 2] = b.z + Math.sin(d.a) * rr;
        }
        jGeo.attributes.position!.needsUpdate = true;
      }
      if (luzInterna) luzInterna.intensity = 0.6 + 0.8 * voo;
      // rastro de plasma: partículas escorrendo pra trás, comprimento ∝ velocidade
      const L = 2 + 6 * Math.min(1, vel);
      rMat.opacity = 0.95 * voo * Math.min(1, vel * 2.5); rastro.visible = rMat.opacity > 0.01;
      if (rastro.visible) {
        for (let i = 0; i < RN; i++) {
          const d = rDados[i]!; if (!parado) d.u = (d.u + dt * (0.6 + vel)) % 1;
          const rr = (0.25 + d.r * 0.9) * (1 - d.u * 0.7), a = d.a + t * 2;
          rPos[i * 3] = Math.cos(a) * rr; rPos[i * 3 + 1] = -0.2 + Math.sin(a) * rr * 0.35; rPos[i * 3 + 2] = -3.4 - d.u * L;
        }
        rGeo.attributes.position!.needsUpdate = true;
      }
    },
    dispose() { liberar(raiz, [tex]); },
  };
}
