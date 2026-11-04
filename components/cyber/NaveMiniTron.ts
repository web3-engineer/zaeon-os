/**
 * A skin TRON da nave mini (a padrão, nov/2026 — o dono: "neon cyberpunk estético da Zaeon, estilo Tron. Nada de
 * fogueira: gadgets tecnológicos, sofás alongados, narguilés, telas e terminais"). O preto fundo com as linhas de luz:
 * o piso em grade ciano (o anel magenta em volta da roda), as paredes com trilhas de circuito, as costelas e o
 * corrimão em neon, o teto em colmeia. No meio, os dois SOFÁS LONGOS frente a frente em volta da MESA HOLOGRÁFICA e o
 * NARGUILÉ com as mangueiras de luz e a fumaça; a ESTAÇÃO DE TERMINAIS (o código correndo), o CINEMA e a tela do
 * lounge (gráficos vivos), as TORRES DE DADOS piscando, os DRONES rondando no alto.
 */
import * as THREE from "three";
import { NAVE_MINI, lugaresDaMini, moveisDaMini, type TipoMini } from "@/lib/cyber/naveMini";
import { instanciarMoveis, type KitMini, type ModeloMini, type P2, type TemaMini } from "./NaveMiniBase";
import { materialParedeViva, materialPisoVivo, materialTetoVivo } from "./energiaNave";

const N = NAVE_MINI;
/** a paleta neon da Zaeon (a do Lounge Cósmico), com o ciano do tron na frente */
const COR = {
  fundo: 0x07060f, metal: 0x15132a, metal2: 0x231f40, estofado: 0x2a2352, estofado2: 0x43357a,
  ciano: 0x45f0ff, magenta: 0xff2fb4, lavanda: 0xb98cff, brasa: 0xff7a3c, verde: 0x5fffb0,
} as const;
const hex = (c: number) => `#${c.toString(16).padStart(6, "0")}`;

export function temaTron(k: KitMini) {
  const { mat, luz, textura, descartar } = k, R = N.roda;
  const metal = mat(COR.metal, 0.5), metal2 = mat(COR.metal2, 0.45);
  const comMapa = (tx: THREE.Texture, brilho: number, extra: THREE.MeshLambertMaterialParameters = {}) => { const m = new THREE.MeshLambertMaterial({ map: tx, emissive: 0xffffff, emissiveMap: tx, emissiveIntensity: brilho, ...extra }); descartar.push(m); return m; };
  // o PISO: preto, a grade fina de 1 m, a grade forte de 4 m (com brilho), o anel magenta da roda e o caminho da chegada
  const W = 1024, Hh = 2048, px = (mx: number) => ((mx + N.a) / (2 * N.a)) * W, pz = (mz: number) => ((N.b + mz) / (2 * N.b)) * Hh, sx = W / (2 * N.a);
  const piso = textura(W, Hh, (x) => {
    x.fillStyle = "#05040b"; x.fillRect(0, 0, W, Hh);
    const linhaV = (mx: number) => { x.beginPath(); x.moveTo(px(mx), 0); x.lineTo(px(mx), Hh); x.stroke(); }, linhaH = (mz: number) => { x.beginPath(); x.moveTo(0, pz(mz)); x.lineTo(W, pz(mz)); x.stroke(); };
    x.strokeStyle = "rgba(69,240,255,.11)"; x.lineWidth = 1; for (let m = -N.a; m <= N.a; m += 1) linhaV(m); for (let m = -N.b; m <= N.b; m += 1) linhaH(m);
    x.shadowColor = hex(COR.ciano); x.shadowBlur = 10; x.strokeStyle = "rgba(69,240,255,.55)"; x.lineWidth = 2.2; for (let m = -8; m <= 8; m += 4) linhaV(m); for (let m = -16; m <= 16; m += 4) linhaH(m);
    // a roda: o anel magenta e o de dentro em ciano
    x.shadowColor = hex(COR.magenta); x.strokeStyle = "rgba(255,47,180,.85)"; x.lineWidth = 4; x.beginPath(); x.ellipse(px(R.x), pz(R.z), 4.3 * sx, 4.3 * (Hh / (2 * N.b)), 0, 0, Math.PI * 2); x.stroke();
    x.shadowColor = hex(COR.ciano); x.strokeStyle = "rgba(69,240,255,.8)"; x.lineWidth = 3; x.beginPath(); x.ellipse(px(R.x), pz(R.z), 1.25 * sx, 1.25 * (Hh / (2 * N.b)), 0, 0, Math.PI * 2); x.stroke();
    // o caminho da chegada até a roda (dois trilhos) e as trilhas de circuito saindo pros cantos
    x.strokeStyle = "rgba(69,240,255,.7)"; x.lineWidth = 2.5; for (const d of [-0.9, 0.9]) { x.beginPath(); x.moveTo(px(d), pz(N.chegada.z + 1.4)); x.lineTo(px(d), pz(R.z - 4.3)); x.stroke(); }
    x.strokeStyle = "rgba(185,140,255,.5)"; x.lineWidth = 2;
    for (const [a, b, c] of [[[-4.3, 1.5], [-6.5, 1.5], [-6.5, -2.6]], [[4.3, 1.5], [6.2, 1.5], [6.2, -4]], [[0, 5.8], [0, 9.5], [-1.5, 11]], [[-3, -2], [-5.5, -4.5], [-7.4, -4.5]]] as const) {
      x.beginPath(); x.moveTo(px(a[0]), pz(a[1])); x.lineTo(px(b[0]), pz(b[1])); x.lineTo(px(c[0]), pz(c[1])); x.stroke();
      x.fillStyle = "rgba(185,140,255,.9)"; x.beginPath(); x.arc(px(c[0]), pz(c[1]), 5, 0, Math.PI * 2); x.fill(); }
    x.shadowBlur = 0;
  });
  // as PAREDES: o painel escuro com as trilhas de circuito (sobe do rodapé, dobra em 90°, termina num nó) — 4 m por ladrilho
  const paredeTex = textura(512, 512, (x, w, h) => {
    const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#120e26"); gr.addColorStop(1, "#0a0816"); x.fillStyle = gr; x.fillRect(0, 0, w, h);
    x.strokeStyle = "rgba(185,140,255,.12)"; x.lineWidth = 2; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo((i * w) / 4, 0); x.lineTo((i * w) / 4, h); x.stroke(); }   // (as juntas dos painéis, 1 m)
    x.lineCap = "round";
    for (let i = 0; i < 9; i++) { const x0 = 20 + ((i * 113) % (w - 40)), yTopo = h * (0.25 + ((i * 37) % 40) / 100), dx = ((i % 2) * 2 - 1) * (30 + ((i * 29) % 50)), cor = i % 3 === 0 ? "255,47,180" : "69,240,255";
      x.strokeStyle = `rgba(${cor},.5)`; x.shadowColor = `rgb(${cor})`; x.shadowBlur = 6; x.lineWidth = 2.5;
      x.beginPath(); x.moveTo(x0, h); x.lineTo(x0, yTopo + 30); x.lineTo(x0 + dx, yTopo); x.lineTo(x0 + dx, yTopo - 20); x.stroke();
      x.fillStyle = `rgba(${cor},.9)`; x.beginPath(); x.arc(x0 + dx, yTopo - 24, 4, 0, Math.PI * 2); x.fill(); }
    x.shadowBlur = 0; x.fillStyle = "rgba(69,240,255,.35)"; x.fillRect(0, h * 0.72, w, 2);   // (a linha corrida na altura do corrimão)
  });
  paredeTex.wrapS = THREE.RepeatWrapping;
  const parede = comMapa(paredeTex, 0.95, { side: THREE.DoubleSide });
  // o TETO: a colmeia fina lavanda no preto
  const tetoTex = textura(1024, 2048, (x, w, h) => { x.fillStyle = "#07060f"; x.fillRect(0, 0, w, h); x.strokeStyle = "rgba(185,140,255,.22)"; x.lineWidth = 1.5;
    const r = 26, dx = r * Math.sqrt(3); for (let row = 0, y = 0; y < h + r; row++, y += r * 1.5) for (let cx = (row % 2) * (dx / 2); cx < w + dx; cx += dx) { x.beginPath(); for (let j = 0; j <= 6; j++) { const a = (j / 6) * Math.PI * 2 + Math.PI / 6; j ? x.lineTo(cx + Math.cos(a) * r, y + Math.sin(a) * r) : x.moveTo(cx + Math.cos(a) * r, y + Math.sin(a) * r); } x.stroke(); } });
  const vidro = new THREE.MeshLambertMaterial({ color: 0x7fe8ff, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide, emissive: 0x1a6a80, emissiveIntensity: 0.3 }); descartar.push(vidro);
  const tema: TemaMini = {
    piso, pisoBrilho: 1.0, chegada: [COR.ciano, COR.magenta],
    parede, vidro, lambri: null, corrimao: luz(COR.ciano, 0.85),
    parapeito: COR.ciano, rodape: COR.ciano, sanca: COR.magenta,
    espaco: ["#1a0f3a", "#0a0820", "#040310", "rgba(255,47,180,.35)", "rgba(69,240,255,.3)"],
    moldura: metal2, brilhoEscotilha: COR.ciano,
    costela: metal2, costelaLuz: COR.ciano,
    tetoPlaca: comMapa(tetoTex, 1.0, { side: THREE.DoubleSide }), viga: metal, vigaLuz: COR.magenta,
    bordaCupula: metal2, anelCupula: COR.ciano, nervura: luz(COR.ciano, 0.8), poco: metal, cupulaVidro: 0x8fd8ff,
    luzinhas: COR.ciano, rota: [COR.ciano, COR.magenta, COR.lavanda], portal: COR.lavanda,
    casco: {
      base0: [0.03, 0.025, 0.07], base1: [0.13, 0.1, 0.24], faixa: [0, 0, 0], faixaK: 0,
      iri: [[1, 0.18, 0.7], [0.27, 0.94, 1], [0.72, 0.55, 1]], iriK: 0.75, dentro: [0.04, 0.03, 0.08], grade: [0.27, 0.94, 1], gradeK: 0.9,
      vidro: 0x45f0ff, vidroEmis: 0x1a6a80, montante: COR.metal2, moldura: COR.ciano, aleta: COR.magenta, escotilha: COR.ciano, aro: COR.metal2,
      linhas: [[-1.6, 0.85, COR.ciano, 0.85], [-0.6, 0.997, COR.magenta, 0.7], [5.2, 0.955, COR.ciano, 0.85], [5.6, 0.845, COR.lavanda, 0.6]],
      motorAro: COR.ciano, brilho: ["rgba(255,255,255,1)", "rgba(69,240,255,.85)", "rgba(255,47,180,.25)"], rastro: ["rgba(69,240,255,.85)", "rgba(185,140,255,.35)", "rgba(255,47,180,0)"], halo: ["rgba(69,240,255,.35)", "rgba(255,47,180,.14)"],
    },
  };
  return { tema, metal, metal2 };
}

/** os móveis, a mesa holográfica, os narguilés (mangueiras + fumaça), as telas e os terminais vivos, os drones */
export function mobiliarTron(k: KitMini, teto: THREE.Group, m0: { metal: THREE.Material; metal2: THREE.Material }, cv: { contorno: P2[]; naJanela(p: P2): boolean; fita(pts: P2[], y0: number, y1: number, filtro: (p: P2) => boolean, m: THREE.Material, pai?: THREE.Object3D): THREE.Mesh }) {
  const { add, mat, luz, textura, anim, descartar, B, Cy, peca, seg } = k, R = N.roda, { metal, metal2 } = m0;
  const estofado = mat(COR.estofado, 0.45), estofado2 = mat(COR.estofado2, 0.45), vidroPreto = mat(0x0b0a18, 0.6, { transparent: true, opacity: 0.85 });
  const ciano = luz(COR.ciano, 0.9), magenta = luz(COR.magenta, 0.85);
  const moveis = moveisDaMini("tron");

  // ── o FLUXO DE ENERGIA (components/cyber/energiaNave): o piso, as paredes e o teto vivos, por cima do que já existe ──
  if (k.energia) {
    const pm = materialPisoVivo(k.energia), wm = materialParedeViva(k.energia), tm = materialTetoVivo(k.energia); descartar.push(pm, wm, tm);
    const forma = new THREE.Shape(cv.contorno.map((p) => new THREE.Vector2(p.x * 0.995, -p.z * 0.995)));
    const gp = new THREE.ShapeGeometry(forma, 48); descartar.push(gp); const piso = add(new THREE.Mesh(gp, pm)); piso.rotation.x = -Math.PI / 2; piso.position.y = 0.006; piso.renderOrder = 1;
    cv.fita(cv.contorno.map((p) => ({ x: p.x * 0.985, z: p.z * 0.985 })), 0.02, k.H - 0.02, (p) => !cv.naJanela(p), wm).renderOrder = 1;
    const st = new THREE.Shape(cv.contorno.map((p) => new THREE.Vector2(p.x * 0.99, -p.z * 0.99))), furo = new THREE.Path(); furo.absellipse(R.x, -R.z, N.cupula.a + 0.4, N.cupula.b + 0.4, 0, Math.PI * 2, true, 0); st.holes.push(furo);
    const gt = new THREE.ShapeGeometry(st, 48); descartar.push(gt); const tv = add(new THREE.Mesh(gt, tm), teto); tv.rotation.x = -Math.PI / 2; tv.position.y = k.H - 0.015;
  }

  // ── as TEXTURAS VIVAS: o código dos terminais (corre), os LEDs das torres (piscam), o painel da cabine ──
  const codigo = textura(256, 512, (x, w, h) => { x.fillStyle = "#050812"; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) { const y = 8 + i * 11, ind = ((i * 7) % 5) * 12, cor = i % 7 === 0 ? COR.magenta : i % 5 === 0 ? COR.verde : COR.ciano; x.fillStyle = hex(cor); x.globalAlpha = 0.55 + ((i * 13) % 4) / 10;
      let cx = 10 + ind; for (let j = 0; j < 1 + ((i * 3) % 4); j++) { const l = 14 + ((i * 31 + j * 17) % 60); x.fillRect(cx, y, l, 5); cx += l + 8; } }
    x.globalAlpha = 1; });
  codigo.wrapT = THREE.RepeatWrapping;
  const telaCodigo = new THREE.MeshBasicMaterial({ map: codigo }); descartar.push(telaCodigo);
  const leds = textura(64, 256, (x, w, h) => { x.fillStyle = "#05040b"; x.fillRect(0, 0, w, h);
    for (let r = 0; r < 32; r++) for (let c = 0; c < 4; c++) { const on = (r * 7 + c * 13) % 5 < 2; x.fillStyle = on ? hex([COR.ciano, COR.magenta, COR.verde, COR.ciano][(r + c) % 4]!) : "#141228"; x.fillRect(8 + c * 13, 4 + r * 8, 8, 3); } });
  leds.wrapT = THREE.RepeatWrapping;
  const ledMat = new THREE.MeshBasicMaterial({ map: leds }); descartar.push(ledMat);
  const navTex = textura(1024, 160, (x, w, h) => { x.fillStyle = "#050812"; x.fillRect(0, 0, w, h); x.strokeStyle = hex(COR.ciano); x.globalAlpha = 0.8; x.lineWidth = 2;
    for (let j = 0; j < 5; j++) { x.beginPath(); x.arc(w * (0.1 + j * 0.2), h / 2, 26 + (j % 2) * 14, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.moveTo(w * (0.1 + j * 0.2) - 40, h / 2); x.lineTo(w * (0.1 + j * 0.2) + 40, h / 2); x.stroke(); }
    x.fillStyle = hex(COR.magenta); for (let j = 0; j < 40; j++) x.fillRect((j * 97) % w, (j * 53) % h, 3, 3); x.globalAlpha = 1; });
  const navMat = new THREE.MeshBasicMaterial({ map: navTex }); descartar.push(navMat);
  anim.push((dt) => { codigo.offset.y -= dt * 0.06; leds.offset.y += dt * 0.35; });

  // ── os MODELOS (de frente pra +z, centrados no retângulo de referência) ──
  const MODELOS: Partial<Record<TipoMini, ModeloMini>> = {
    painel: { ref: [6, 0.8], pecas: [
      peca(metal, B(6, 0.75, 0.7, 0, 0.375, 0)), peca(vidroPreto, B(6.1, 0.05, 0.85, 0, 0.78, 0.05)), peca(navMat, new THREE.PlaneGeometry(5.6, 0.62).rotateX(-0.9).translate(0, 0.95, -0.1)),
      peca(ciano, B(6.1, 0.02, 0.02, 0, 0.81, 0.47), B(5.8, 0.02, 0.02, 0, 0.08, 0.36)), peca(magenta, ...[-2.2, -1.1, 1.1, 2.2].map((x) => Cy(0.05, 0.02, x, 0.82, 0.25, 10))) ] },
    poltronaPiloto: { ref: [0.9, 0.9], pecas: [
      peca(estofado, B(0.8, 0.14, 0.75, 0, 0.5, 0), B(0.8, 1.05, 0.14, 0, 1.02, -0.36)), peca(metal2, B(0.12, 0.3, 0.7, -0.42, 0.68, 0), B(0.12, 0.3, 0.7, 0.42, 0.68, 0), Cy(0.05, 0.44, 0, 0.22, 0, 8), Cy(0.32, 0.04, 0, 0.02, 0, 16)),
      peca(ciano, B(0.02, 1.0, 0.02, -0.41, 1.02, -0.28), B(0.02, 1.0, 0.02, 0.41, 1.02, -0.28), B(0.8, 0.02, 0.02, 0, 1.55, -0.28)), peca(luz(COR.magenta, 0.6), new THREE.TorusGeometry(0.34, 0.015, 4, 32).rotateX(Math.PI / 2).translate(0, 0.03, 0)) ] },
    sofaLongo: { ref: [5.2, 1.1], pecas: [
      peca(metal, B(5.2, 0.28, 1.0, 0, 0.14, 0), B(0.22, 0.34, 1.0, -2.49, 0.45, 0), B(0.22, 0.34, 1.0, 2.49, 0.45, 0)),
      peca(estofado, B(4.76, 0.16, 0.82, 0, 0.36, 0.06), B(5.2, 0.62, 0.22, 0, 0.71, -0.42)),
      peca(estofado2, ...[-1.6, 0, 1.6].map((x) => B(1.4, 0.38, 0.14, x, 0.68, -0.27).rotateX(-0.12))),
      peca(ciano, B(5.2, 0.03, 0.03, 0, 0.04, 0.51), B(4.76, 0.02, 0.02, 0, 0.45, 0.48)), peca(magenta, B(5.2, 0.03, 0.03, 0, 1.03, -0.42), B(0.03, 0.03, 1.0, -2.6, 0.62, 0), B(0.03, 0.03, 1.0, 2.6, 0.62, 0)) ] },
    mesaHolo: { ref: [1.8, 1.8], pecas: [ peca(metal, Cy(0.72, 0.42, 0, 0.21, 0, 40, 0.86)), peca(vidroPreto, Cy(0.9, 0.05, 0, 0.45, 0, 48)), peca(ciano, new THREE.TorusGeometry(0.9, 0.02, 6, 64).rotateX(Math.PI / 2).translate(0, 0.47, 0), new THREE.TorusGeometry(0.86, 0.015, 6, 64).rotateX(Math.PI / 2).translate(0, 0.05, 0)), peca(luz(COR.ciano, 0.5), new THREE.CircleGeometry(0.42, 40).rotateX(-Math.PI / 2).translate(0, 0.48, 0)) ] },
    narguile: { ref: [0.6, 0.6], pecas: [
      peca(mat(COR.magenta, 0.55, { transparent: true, opacity: 0.6 }), new THREE.LatheGeometry([[0.02, 0], [0.2, 0.04], [0.25, 0.16], [0.22, 0.3], [0.1, 0.4], [0.05, 0.44]].map(([x, y]) => new THREE.Vector2(x!, y!)), seg)),
      peca(metal2, Cy(0.03, 0.56, 0, 0.7, 0, 8), Cy(0.17, 0.02, 0, 0.98, 0, 20), Cy(0.07, 0.1, 0, 1.04, 0, 12, 0.05)),
      peca(ciano, ...[0.55, 0.8].map((y) => new THREE.TorusGeometry(0.045, 0.012, 4, 16).rotateX(Math.PI / 2).translate(0, y, 0)), new THREE.TorusGeometry(0.17, 0.008, 4, 24).rotateX(Math.PI / 2).translate(0, 0.99, 0)) ] },
    terminal: { ref: [1.4, 0.8], pecas: [
      peca(metal, B(0.5, 0.95, 0.4, 0, 0.47, -0.1), B(1.3, 0.85, 0.06, 0, 1.62, -0.3)), peca(metal2, B(1.4, 0.06, 0.6, 0, 1.0, 0.05).rotateX(0.22)),
      peca(telaCodigo, new THREE.PlaneGeometry(1.2, 0.74).translate(0, 1.62, -0.265)), peca(luz(COR.ciano, 0.75), B(1.1, 0.012, 0.3, 0, 1.05, 0.08).rotateX(0.22)),
      peca(ciano, B(1.32, 0.02, 0.02, 0, 2.06, -0.27), B(1.32, 0.02, 0.02, 0, 1.19, -0.27)), peca(luz(COR.magenta, 0.25), new THREE.PlaneGeometry(0.4, 0.6).rotateY(0.6).translate(-0.82, 1.65, -0.15), new THREE.PlaneGeometry(0.4, 0.6).rotateY(-0.6).translate(0.82, 1.65, -0.15)) ] },
    telao: { ref: [3.2, 0.4], pecas: [ peca(metal, B(0.08, 0.7, 0.08, -1.2, 0.35, 0), B(0.08, 0.7, 0.08, 1.2, 0.35, 0), B(3.2, 1.9, 0.1, 0, 1.65, 0)), peca(ciano, B(3.24, 0.03, 0.03, 0, 2.61, 0.06), B(3.24, 0.03, 0.03, 0, 0.69, 0.06), B(0.03, 1.95, 0.03, -1.62, 1.65, 0.06), B(0.03, 1.95, 0.03, 1.62, 1.65, 0.06)) ] },
    torre: { ref: [0.8, 0.8], pecas: [ peca(metal, B(0.7, 2.5, 0.7, 0, 1.25, 0)), peca(ledMat, ...[0, 1, 2, 3].map((j) => new THREE.PlaneGeometry(0.5, 2.1).translate(0, 1.3, 0.352).rotateY((j * Math.PI) / 2))), peca(ciano, B(0.74, 0.03, 0.74, 0, 2.52, 0), B(0.74, 0.03, 0.74, 0, 0.03, 0)) ] },
    balcao: { ref: [4.4, 0.9], pecas: [ peca(metal, B(4.4, 1.0, 0.9, 0, 0.5, 0)), peca(vidroPreto, B(4.5, 0.05, 1.0, 0, 1.03, 0)), peca(ciano, B(4.5, 0.02, 0.02, 0, 1.06, 0.5)), peca(magenta, B(4.3, 0.03, 0.03, 0, 0.1, 0.46)),
      peca(luz(COR.ciano, 0.7), ...[-1.4, -0.9].map((x) => Cy(0.05, 0.14, x, 1.13, 0.1, 10))), peca(luz(COR.magenta, 0.7), ...[0.3, 1.5].map((x) => Cy(0.05, 0.14, x, 1.13, 0.05, 10)), Cy(0.09, 0.28, 1.0, 1.2, -0.2, 12)) ] },
    banqueta: { ref: [0.5, 0.5], pecas: [ peca(estofado2, Cy(0.22, 0.08, 0, 0.74, 0, 14)), peca(metal2, Cy(0.03, 0.7, 0, 0.36, 0, 8), Cy(0.2, 0.03, 0, 0.015, 0, 12)), peca(ciano, new THREE.TorusGeometry(0.22, 0.012, 4, 24).rotateX(Math.PI / 2).translate(0, 0.78, 0)) ] },
    mesaBaixa: { ref: [1.2, 1.2], pecas: [ peca(vidroPreto, Cy(0.6, 0.05, 0, 0.4, 0, 32)), peca(metal2, Cy(0.1, 0.38, 0, 0.19, 0, 10, 0.18)), peca(magenta, new THREE.TorusGeometry(0.6, 0.015, 4, 40).rotateX(Math.PI / 2).translate(0, 0.42, 0)) ] },
    puff: { ref: [0.8, 0.8], pecas: [ peca(estofado2, B(0.66, 0.42, 0.66, 0, 0.21, 0)), peca(ciano, B(0.68, 0.02, 0.02, 0, 0.42, 0.33), B(0.68, 0.02, 0.02, 0, 0.42, -0.33), B(0.02, 0.02, 0.68, 0.33, 0.42, 0), B(0.02, 0.02, 0.68, -0.33, 0.42, 0)) ] },
  };
  instanciarMoveis(k, moveis, MODELOS, ["poltronaPiloto", "mesaHolo", "narguile", "banqueta", "mesaBaixa", "puff"]);

  // ── as TELAS: um painel vivo (o pulso, o equalizador, o radar varrendo) redesenhado ~8×/s, nas duas telonas ──
  { const cv = document.createElement("canvas"); cv.width = 512; cv.height = 288; const x = cv.getContext("2d")!, tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; descartar.push(tx);
    const desenha = (t: number) => { const w = 512, h = 288;
      x.fillStyle = "#05040e"; x.fillRect(0, 0, w, h);
      x.strokeStyle = "rgba(69,240,255,.12)"; x.lineWidth = 1; for (let i = 0; i <= 16; i++) { x.beginPath(); x.moveTo((i * w) / 16, 0); x.lineTo((i * w) / 16, h); x.stroke(); } for (let i = 0; i <= 9; i++) { x.beginPath(); x.moveTo(0, (i * h) / 9); x.lineTo(w, (i * h) / 9); x.stroke(); }
      x.lineWidth = 3; x.shadowBlur = 8; x.strokeStyle = hex(COR.ciano); x.shadowColor = hex(COR.ciano); x.beginPath();
      for (let i = 0; i <= 80; i++) { const u = i / 80, y = 90 + Math.sin(u * 14 + t * 3) * 22 * Math.sin(u * 3 + t * 0.7) + Math.sin(u * 40 - t * 6) * 5; i ? x.lineTo(20 + u * 300, y) : x.moveTo(20, y); } x.stroke();
      x.shadowColor = hex(COR.magenta); for (let i = 0; i < 14; i++) { const v = 0.25 + 0.7 * Math.abs(Math.sin(t * (1.4 + i * 0.23) + i)); x.fillStyle = i % 3 ? hex(COR.magenta) : hex(COR.lavanda); x.fillRect(24 + i * 21, h - 20 - v * 110, 14, v * 110); }
      const cx = 420, cy = 140, r = 70; x.shadowColor = hex(COR.ciano); x.strokeStyle = "rgba(69,240,255,.6)"; x.lineWidth = 2; for (const rr of [r, r * 0.66, r * 0.33]) { x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI * 2); x.stroke(); }
      const a = t * 1.6; x.strokeStyle = hex(COR.ciano); x.lineWidth = 3; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); x.stroke();
      x.fillStyle = hex(COR.magenta); for (let i = 0; i < 5; i++) { const b = i * 1.3 + 0.4, d = r * (0.3 + ((i * 37) % 60) / 100), vis = ((a - b) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) < 1.5; if (vis) { x.beginPath(); x.arc(cx + Math.cos(b) * d, cy + Math.sin(b) * d, 4, 0, Math.PI * 2); x.fill(); } }
      x.shadowBlur = 0; tx.needsUpdate = true; };
    desenha(0);
    const tm = new THREE.MeshBasicMaterial({ map: tx }); descartar.push(tm);
    for (const m of moveis.filter((q) => q.tipo === "telao")) { const tg = add(new THREE.Group()); tg.position.set((m.x0 + m.x1) / 2, 0, (m.z0 + m.z1) / 2); tg.rotation.y = m.rumo ?? 0;
      const L = Math.max(m.x1 - m.x0, m.z1 - m.z0); add(new THREE.Mesh(new THREE.PlaneGeometry(L - 0.2, 1.72).translate(0, 1.65, 0.056), tm), tg); }
    let acc = 0; anim.push((dt, t) => { acc += dt; if (acc > (k.low ? 0.25 : 0.12)) { acc = 0; desenha(t); } }); }

  // ── a MESA HOLOGRÁFICA: o cone de luz, o icosaedro de arame girando, os dois anéis de giroscópio e os cubos de dados ──
  { const hg = add(new THREE.Group()); hg.position.set(R.x, 0.48, R.z);
    const cone = add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.95, 1.9, 32, 1, true).translate(0, 0.95, 0), luz(COR.ciano, 0.07)), hg);
    const arame = (g: THREE.BufferGeometry, c: number) => { const m = new THREE.MeshBasicMaterial({ color: c, wireframe: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }); descartar.push(m); return add(new THREE.Mesh(g, m), hg); };
    const nucleo = arame(new THREE.IcosahedronGeometry(0.42, 1), COR.lavanda); nucleo.position.y = 1.25;
    const dentro = arame(new THREE.OctahedronGeometry(0.18, 0), COR.magenta); dentro.position.y = 1.25;
    const aneis = [COR.ciano, COR.magenta].map((c, j) => { const a = add(new THREE.Mesh(new THREE.TorusGeometry(0.66 + j * 0.12, 0.012, 4, 64), luz(c, 0.85)), hg); a.position.y = 1.25; return a; });
    const cubos = Array.from({ length: 6 }, (_, j) => { const c = arame(new THREE.BoxGeometry(0.09, 0.09, 0.09), j % 2 ? COR.ciano : COR.verde); c.userData.j = j; return c; });
    const varre = add(new THREE.Mesh(new THREE.RingGeometry(0.5, 0.56, 48), luz(COR.ciano, 0.5)), hg); varre.rotation.x = -Math.PI / 2;
    anim.push((dt, t) => {
      nucleo.rotation.y += dt * 0.5; nucleo.rotation.x = Math.sin(t * 0.4) * 0.4; dentro.rotation.y -= dt * 1.4; dentro.rotation.z += dt * 0.7;
      aneis[0]!.rotation.set(Math.PI / 2 + Math.sin(t * 0.7) * 0.5, t * 0.6, 0); aneis[1]!.rotation.set(Math.PI / 2 + Math.cos(t * 0.5) * 0.7, -t * 0.4, t * 0.3);
      for (const c of cubos) { const j = c.userData.j as number, a = t * 0.8 + (j / 6) * Math.PI * 2; c.position.set(Math.cos(a) * 0.95, 1.25 + Math.sin(t * 1.3 + j) * 0.25, Math.sin(a) * 0.95); c.rotation.set(t + j, t * 1.2, 0); }
      const u = (t * 0.4) % 1; varre.position.y = 0.05 + u * 1.9; varre.scale.setScalar(1.7 - u * 0.9); (varre.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - u);
      (cone.material as THREE.MeshBasicMaterial).opacity = 0.06 + 0.03 * Math.sin(t * 2.2);
    }); }
  // o anel magenta da roda pulsando no piso (por cima da grade)
  { const a = add(new THREE.Mesh(new THREE.RingGeometry(4.22, 4.38, 96), luz(COR.magenta, 0.5))); a.rotation.x = -Math.PI / 2; a.position.set(R.x, 0.02, R.z);
    anim.push((_, t) => { (a.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.25 * (0.5 + 0.5 * Math.sin(t * 1.8)); }); }

  // ── os NARGUILÉS: a brasa que respira, as MANGUEIRAS de luz até os lugares mais perto e a FUMAÇA subindo ──
  { const lugares = lugaresDaMini("tron"), fumacaTex = textura(128, 128, (x, w) => { const gr = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, "rgba(240,232,255,.8)"); gr.addColorStop(0.5, "rgba(200,170,255,.3)"); gr.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = gr; x.fillRect(0, 0, w, w); });
    const brasaMat = luz(COR.brasa, 0.9), fumacas: { s: THREE.Sprite; m: THREE.SpriteMaterial; x: number; z: number; y0: number; fase: number }[] = [];
    for (const n of moveis.filter((q) => q.tipo === "narguile")) {
      const cx = (n.x0 + n.x1) / 2, cz = (n.z0 + n.z1) / 2;
      add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), brasaMat)).position.set(cx, 1.1, cz);
      // as mangueiras: até os dois assentos mais perto (do meio) ou até o sofá do lounge, caindo no chão no caminho
      const alvos = n.canto === "roda" ? [...lugares].sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz)).slice(0, 2).map((l) => ({ x: l.x + Math.sin(l.rumo) * 0.25, z: l.z + Math.cos(l.rumo) * 0.25 }))
        : [{ x: n.x1 + 1.2, z: cz - 0.8 }, { x: n.x1 + 1.2, z: cz + 0.8 }];
      alvos.forEach((a, j) => {
        const ini = new THREE.Vector3(cx + (j ? 0.04 : -0.04), 0.7, cz), fim = new THREE.Vector3(a.x, 0.72, a.z), meio = ini.clone().lerp(fim, 0.5); meio.y = 0.12;
        const curva = new THREE.CatmullRomCurve3([ini, ini.clone().lerp(meio, 0.5).setY(0.3), meio, meio.clone().lerp(fim, 0.6).setY(0.35), fim]);
        add(new THREE.Mesh(new THREE.TubeGeometry(curva, 40, 0.018, 5, false), metal2)); add(new THREE.Mesh(new THREE.TubeGeometry(curva, 40, 0.024, 5, false), luz(j ? COR.magenta : COR.ciano, 0.45)));
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.18, 8), luz(COR.ciano, 0.8))).position.copy(fim);
        // a fumaça que sai da ponta da mangueira (quem está fumando)
        for (let i = 0; i < 3; i++) { const m = new THREE.SpriteMaterial({ map: fumacaTex, transparent: true, depthWrite: false, opacity: 0 }); descartar.push(m); const s = add(new THREE.Sprite(m)); fumacas.push({ s, m, x: fim.x, z: fim.z, y0: 1.2, fase: (i / 3 + j * 0.37) % 1 }); }
      });
      for (let i = 0; i < (k.low ? 3 : 6); i++) { const m = new THREE.SpriteMaterial({ map: fumacaTex, transparent: true, depthWrite: false, opacity: 0 }); descartar.push(m); const s = add(new THREE.Sprite(m)); fumacas.push({ s, m, x: cx, z: cz, y0: 1.15, fase: i / 6 }); }
    }
    anim.push((_, t) => {
      brasaMat.opacity = 0.6 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2.3)) ** 2;
      for (const f of fumacas) { const u = (t * 0.12 + f.fase) % 1; f.s.position.set(f.x + Math.sin(t * 0.7 + f.fase * 9) * 0.25 * u, f.y0 + u * 2.2, f.z + Math.cos(t * 0.5 + f.fase * 7) * 0.25 * u); f.s.scale.setScalar(0.25 + u * 1.3); f.m.opacity = 0.75 * Math.sin(Math.PI * u) ** 1.2; }
    }); }

  // ── os DRONES rondando no alto (o corpo, o anel ciano e a luz de navegação piscando) ──
  { const corpo = new THREE.SphereGeometry(0.16, 12, 8).scale(1, 0.45, 1), anel = new THREE.TorusGeometry(0.24, 0.015, 4, 24).rotateX(Math.PI / 2); descartar.push(corpo, anel);
    const pisca = luz(COR.magenta, 0.9), drones = [{ cx: 0, cz: 1.5, r: 5.6, y: 3.7, v: 0.22 }, { cx: -5.5, cz: -2, r: 2.2, y: 3.3, v: -0.35 }, { cx: 5.6, cz: -5.5, r: 2.4, y: 3.5, v: 0.3 }].map((d) => {
      const dg = add(new THREE.Group(), teto); add(new THREE.Mesh(corpo, metal2), dg); add(new THREE.Mesh(anel, ciano), dg); add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), pisca), dg).position.y = -0.08;
      add(new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.2, 16, 1, true).translate(0, -0.65, 0), luz(COR.ciano, 0.05)), dg); return { dg, ...d }; });
    anim.push((_, t) => { pisca.opacity = Math.sin(t * 6) > 0.6 ? 1 : 0.15; for (const d of drones) { const a = t * d.v; d.dg.position.set(d.cx + Math.cos(a) * d.r, d.y + Math.sin(t * 1.3 + d.r) * 0.15, d.cz + Math.sin(a) * d.r); d.dg.rotation.y = -a; } }); }
}
