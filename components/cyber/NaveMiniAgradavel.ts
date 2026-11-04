/**
 * A skin AGRADÁVEL da nave mini (a 1ª versão, nov/2026 — fica como opção do dono): clara e quente. Piso de madeira
 * clara, paredes pérola com o lambri lilás, almofadas pêssego/lilás/menta/céu, a luz de mel das lanternas de papel e
 * da lareira no meio do sofá em arco, o canto de leitura com a rede, as plantas penduradas.
 */
import * as THREE from "three";
import { ARCO_SOFA, NAVE_MINI, moveisDaMini, type TipoMini } from "@/lib/cyber/naveMini";
import { instanciarMoveis, type KitMini, type ModeloMini, type TemaMini } from "./NaveMiniBase";

const N = NAVE_MINI;
const COR = {
  parede: 0xf1eaf2, perola: 0xf6f1f4, madeira: 0xd9b996, madeiraEsc: 0xa98466,
  pessego: 0xf6c4ae, lilas: 0xd6c6f2, menta: 0xbfe6d4, ceu: 0xbcd9f4, mel: 0xffd49a, rosa: 0xf7cbe0, folha: 0x8fcf9c,
} as const;

export function temaAgradavel(k: KitMini) {
  const { mat, textura, descartar } = k;
  const madeira = mat(COR.madeira, 0.32), perola = mat(COR.perola, 0.4), parede = mat(COR.parede, 0.42, { side: THREE.DoubleSide });
  const vidro = new THREE.MeshLambertMaterial({ color: 0xdcecff, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, emissive: 0x6080a0, emissiveIntensity: 0.15 }); descartar.push(vidro);
  // o piso: tábuas de madeira clara (uma tábua = 0,5 m)
  const piso = textura(1024, 1024, (x, w, h) => {
    x.fillStyle = "#eadccb"; x.fillRect(0, 0, w, h);
    const larg = w / 40;
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${170 + ((i * 37) % 30)},${140 + ((i * 53) % 24)},${110 + ((i * 29) % 20)},${0.08 + ((i * 7) % 5) / 60})`; x.fillRect(i * larg, 0, larg, h); }
    x.strokeStyle = "rgba(150,115,90,.28)"; x.lineWidth = 1.5;
    for (let i = 0; i <= 40; i++) { x.beginPath(); x.moveTo(i * larg, 0); x.lineTo(i * larg, h); x.stroke(); }
    for (let i = 0; i < 40; i++) for (let j = 0; j < 4; j++) { const y = (((i * 131 + j * 257) % 1000) / 1000) * h; x.beginPath(); x.moveTo(i * larg, y); x.lineTo((i + 1) * larg, y); x.stroke(); }
  });
  const tema: TemaMini = {
    piso, pisoBrilho: 0.42, chegada: [COR.lilas, COR.ceu],
    parede, vidro, lambri: mat(0xe6dbf4, 0.4, { side: THREE.DoubleSide }), corrimao: madeira,
    parapeito: COR.mel, rodape: COR.lilas, sanca: COR.mel,
    espaco: ["#3a2c66", "#1a1438", "#0c0a20", "rgba(247,196,174,.35)", "rgba(188,217,244,.3)"],
    moldura: madeira, brilhoEscotilha: COR.mel,
    costela: madeira, costelaLuz: null,
    tetoPlaca: mat(COR.parede, 0.32, { side: THREE.DoubleSide }), viga: madeira, vigaLuz: null,
    bordaCupula: madeira, anelCupula: COR.mel, nervura: madeira, poco: parede, cupulaVidro: 0xe8f2ff,
    luzinhas: COR.mel, rota: [COR.ceu, COR.pessego, COR.menta], portal: 0xc9b4ff,
    casco: {
      base0: [0.44, 0.4, 0.58], base1: [0.9, 0.86, 0.93], faixa: [1, 0.8, 0.72], faixaK: 0.8,
      iri: [[1, 0.8, 0.72], [0.84, 0.78, 1], [0.74, 0.95, 0.88]], iriK: 0.5, dentro: [0.63, 0.6, 0.62], grade: [0, 0, 0], gradeK: 0,
      vidro: 0xd8ecff, vidroEmis: 0x90b0d0, montante: COR.perola, moldura: COR.pessego, aleta: COR.pessego, escotilha: COR.mel, aro: COR.perola,
      linhas: [[-1.6, 0.845, COR.ceu, 0.55], [5.2, 0.955, COR.lilas, 0.7]],
      motorAro: COR.pessego, brilho: ["rgba(255,255,255,1)", "rgba(255,215,190,.8)", "rgba(214,198,242,.25)"], rastro: ["rgba(255,220,200,.8)", "rgba(214,198,242,.3)", "rgba(188,217,244,0)"], halo: ["rgba(255,200,180,.45)", "rgba(214,198,242,.14)"],
    },
  };
  return { tema, madeira, perola };
}

/** os móveis, a roda (sofá em arco + lareira), as lanternas de papel e as plantas penduradas */
export function mobiliarAgradavel(k: KitMini, teto: THREE.Group, m0: { madeira: THREE.Material; perola: THREE.Material }) {
  const { add, mat, luz, textura, anim, descartar, B, Cy, peca, seg, H } = k, R = N.roda, C = N.cupula, { madeira, perola } = m0;
  const madeiraEsc = mat(COR.madeiraEsc, 0.3), pessego = mat(COR.pessego, 0.34), lilas = mat(COR.lilas, 0.34), menta = mat(COR.menta, 0.34), ceu = mat(COR.ceu, 0.34), folha = mat(COR.folha, 0.28), papel = mat(COR.mel, 0.95), branco = mat(0xffffff, 0.36);
  // o TAPETE redondo da roda (anéis suaves em lilás e pêssego)
  { const tx = textura(1024, 1024, (x, w) => {
      const r = w / 2; x.translate(r, r); x.fillStyle = "#f6ece6"; x.beginPath(); x.arc(0, 0, r * 0.98, 0, Math.PI * 2); x.fill();
      for (let j = 0; j < 9; j++) { x.strokeStyle = j % 2 ? "#c8b2ee" : "#f3b9a2"; x.lineWidth = 10 - j * 0.6; x.globalAlpha = 0.55; x.beginPath(); x.arc(0, 0, r * (0.94 - j * 0.09), 0, Math.PI * 2); x.stroke(); }
      x.globalAlpha = 0.35; for (let j = 0; j < 12; j++) { const a = (j / 12) * Math.PI * 2; x.strokeStyle = "#c8b2ee"; x.lineWidth = 4; x.beginPath(); x.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.22, 0, Math.PI * 2); x.stroke(); }
      x.globalAlpha = 1; });
    const t = add(new THREE.Mesh(new THREE.CircleGeometry(R.r + 1.2, 64), mat(0xffffff, 0.45, { map: tx, transparent: true }))); t.rotation.x = -Math.PI / 2; t.position.set(R.x, 0.012, R.z); }

  // as LANTERNAS de papel em volta da cúpula (balançam devagar) e as PLANTAS penduradas perto das paredes
  { const lan: THREE.Group[] = [], n = k.low ? 6 : 9;
    for (let j = 0; j < n; j++) { const a = (j / n) * Math.PI * 2 + 0.3, x = R.x + Math.cos(a) * (C.a + 0.9), z = R.z + Math.sin(a) * (C.b + 0.6), y = H - 1.1 - (j % 3) * 0.3;
      const lg = add(new THREE.Group(), teto); lg.position.set(x, y, z);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.22 + (j % 2) * 0.06, 14, 10).scale(1, 1.25, 1), papel), lg);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, H - y, 3).translate(0, (H - y) / 2, 0), madeiraEsc), lg);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), luz(COR.mel, 0.08)), lg); lan.push(lg); }
    anim.push((_, t) => lan.forEach((l, j) => { l.rotation.z = Math.sin(t * 0.6 + j) * 0.03; l.rotation.x = Math.cos(t * 0.5 + j * 1.3) * 0.03; }));
    for (const [x, z] of [[-7.6, -6], [7.4, 1.2], [-5.2, 10.2], [5.2, 10.2], [7.6, -9.6]] as const) {
      const pg = add(new THREE.Group(), teto); pg.position.set(x, H - 1.25, z);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.25, 3).translate(0, 0.62, 0), madeiraEsc), pg);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), perola), pg);
      for (let j = 0; j < 7; j++) { const a = (j / 7) * Math.PI * 2, l = 0.7 + (j % 3) * 0.35; const r = add(new THREE.Mesh(new THREE.ConeGeometry(0.07, l, 5).translate(0, -l / 2, 0), folha), pg); r.position.set(Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22); r.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25); }
      add(new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), folha), pg).scale.set(1, 0.5, 1);
    } }

  // ── os MÓVEIS ──
  const telaTex = textura(1024, 160, (x, w, h) => { x.fillStyle = "#26304e"; x.fillRect(0, 0, w, h); x.strokeStyle = "#bcd9f4"; x.globalAlpha = 0.7; x.lineWidth = 2;
    for (let j = 0; j < 5; j++) { x.beginPath(); x.arc(w * (0.1 + j * 0.2), h / 2, 26 + (j % 2) * 14, 0, Math.PI * 2); x.stroke(); }
    x.globalAlpha = 0.9; x.fillStyle = "#f6c4ae"; for (let j = 0; j < 40; j++) x.fillRect((j * 97) % w, (j * 53) % h, 3, 3);
    x.fillStyle = "#bfe6d4"; x.fillRect(w * 0.42, h * 0.3, w * 0.16, 6); x.fillRect(w * 0.42, h * 0.55, w * 0.1, 6); x.globalAlpha = 1; });
  const tela = new THREE.MeshBasicMaterial({ map: telaTex }); descartar.push(tela);
  const PASTEL = [COR.pessego, COR.lilas, COR.menta, COR.ceu, COR.rosa];
  const MODELOS: Partial<Record<TipoMini, ModeloMini>> = {
    painel: { ref: [6, 0.8], pecas: [
      peca(perola, B(6, 0.75, 0.7, 0, 0.375, 0), B(6.1, 0.06, 0.85, 0, 0.78, 0.05)), peca(tela, new THREE.PlaneGeometry(5.6, 0.62).rotateX(-0.9).translate(0, 0.95, -0.1)),
      peca(madeira, B(6.2, 0.04, 0.06, 0, 0.8, 0.46)), peca(luz(COR.ceu, 0.7), ...[-2.2, -1.1, 1.1, 2.2].map((x) => Cy(0.05, 0.02, x, 0.82, 0.25, 10)), B(5.8, 0.02, 0.02, 0, 0.1, 0.36)) ] },
    poltronaPiloto: { ref: [0.9, 0.9], pecas: [
      peca(perola, B(0.8, 0.14, 0.75, 0, 0.5, 0), B(0.8, 1.0, 0.14, 0, 1.0, -0.36), B(0.12, 0.3, 0.7, -0.42, 0.68, 0), B(0.12, 0.3, 0.7, 0.42, 0.68, 0)),
      peca(pessego, B(0.64, 0.08, 0.6, 0, 0.6, 0.02), B(0.6, 0.66, 0.06, 0, 1.02, -0.27)), peca(madeiraEsc, Cy(0.05, 0.44, 0, 0.22, 0, 8), Cy(0.32, 0.04, 0, 0.02, 0, 16)), peca(luz(COR.menta, 0.5), new THREE.TorusGeometry(0.34, 0.015, 4, 32).rotateX(Math.PI / 2).translate(0, 0.03, 0)) ] },
    lareira: { ref: [1.6, 1.6], pecas: [ peca(perola, Cy(0.8, 0.36, 0, 0.18, 0, 36, 0.86)), peca(madeira, new THREE.TorusGeometry(0.8, 0.06, 6, 48).rotateX(Math.PI / 2).translate(0, 0.37, 0)), peca(mat(0x3a2a24, 0.2), Cy(0.62, 0.02, 0, 0.37, 0, 32)) ] },
    estante: { ref: [3.6, 0.5], pecas: [
      peca(madeira, B(3.6, 0.05, 0.45, 0, 0.02, 0), B(3.6, 0.05, 0.45, 0, 0.72, 0), B(3.6, 0.05, 0.45, 0, 1.42, 0), B(3.6, 0.05, 0.45, 0, 2.12, 0), B(0.05, 2.15, 0.45, -1.78, 1.07, 0), B(0.05, 2.15, 0.45, 1.78, 1.07, 0), B(0.05, 2.15, 0.45, 0, 1.07, 0), B(3.6, 2.15, 0.03, 0, 1.07, -0.21)),
      ...PASTEL.map((c, j0) => peca(mat(c, 0.3), ...[0, 1, 2].flatMap((pr) => Array.from({ length: 6 }, (_, j) => { const x = -1.68 + ((j * 5 + j0) % 30) * 0.115, h = 0.34 + ((j + j0 + pr) % 3) * 0.06; return B(0.09, h, 0.3, x, 0.05 + pr * 0.7 + h / 2, 0.02); })))) ] },
    pufao: { ref: [1.2, 1.2], pecas: [ { ...peca(branco, new THREE.SphereGeometry(0.62, seg, 12).scale(1, 0.62, 1).translate(0, 0.34, 0)), cores: [COR.pessego, COR.lilas, COR.menta] } ] },
    puff: { ref: [0.8, 0.8], pecas: [ { ...peca(branco, Cy(0.38, 0.42, 0, 0.21, 0, seg)), cores: [COR.ceu, COR.rosa] } ] },
    luminaria: { ref: [0.5, 0.5], pecas: [ peca(madeiraEsc, Cy(0.02, 1.6, 0, 0.8, 0, 6), Cy(0.2, 0.03, 0, 0.015, 0, 16)), peca(papel, Cy(0.16, 0.34, 0, 1.72, 0, 16, 0.26)), peca(luz(COR.mel, 0.06), Cy(0.24, 1.5, 0, 0.8, 0, 16, 0.7)) ] },
    rede: { ref: [1.0, 3.2], pecas: (() => {
      const L = 2.6, nU = 16, nV = 4, v: number[] = [], idx: number[] = [];
      for (let i = 0; i <= nU; i++) for (let j = 0; j <= nV; j++) { const u = i / nU, w = j / nV, x = (w - 0.5) * 0.95 * Math.sin(Math.PI * (0.15 + 0.7 * u)), y = 1.25 - 0.62 * Math.sin(Math.PI * u) + 0.12 * Math.abs(w - 0.5) * 2 * Math.sin(Math.PI * u); v.push(x, y, (u - 0.5) * L); }
      for (let i = 0; i < nU; i++) for (let j = 0; j < nV; j++) { const a = i * (nV + 1) + j, b = a + nV + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      const pano = new THREE.BufferGeometry(); pano.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); pano.setIndex(idx); pano.computeVertexNormals();
      return [ { geo: pano, mat: mat(COR.pessego, 0.36, { side: THREE.DoubleSide }) }, peca(madeira, Cy(0.06, 1.55, 0, 0.78, -1.55, 8), Cy(0.06, 1.55, 0, 0.78, 1.55, 8)), peca(lilas, B(0.5, 0.12, 0.35, 0, 0.72, -0.8).rotateX(0.3)) ];
    })() },
    banco: { ref: [2.0, 0.9], pecas: [ peca(madeira, B(2.0, 0.36, 0.9, 0, 0.18, 0)), peca(lilas, B(1.9, 0.14, 0.82, 0, 0.43, 0)), peca(ceu, B(0.5, 0.36, 0.14, -0.6, 0.62, -0.32).rotateX(-0.2), B(0.5, 0.36, 0.14, 0.6, 0.62, -0.32).rotateX(-0.2)) ] },
    balcao: { ref: [4.4, 0.9], pecas: [ peca(mat(0xf3dcd0, 0.38), B(4.4, 1.0, 0.9, 0, 0.5, 0)), peca(madeira, B(4.5, 0.06, 1.0, 0, 1.03, 0)), peca(luz(COR.mel, 0.6), B(4.3, 0.03, 0.03, 0, 0.12, 0.46)),
      peca(mat(COR.menta, 0.4), Cy(0.13, 0.2, -1.2, 1.16, -0.1, 14), Cy(0.05, 0.08, -1.2, 1.3, -0.1, 8)), peca(mat(COR.rosa, 0.4), ...[-0.4, -0.15, 0.1].map((x) => Cy(0.05, 0.09, x, 1.1, 0.1, 10)), Cy(0.1, 0.24, 1.3, 1.18, -0.15, 12)) ] },
    banqueta: { ref: [0.5, 0.5], pecas: [ peca(menta, Cy(0.22, 0.08, 0, 0.74, 0, 14)), peca(madeiraEsc, Cy(0.03, 0.7, 0, 0.36, 0, 8), Cy(0.2, 0.03, 0, 0.015, 0, 12)) ] },
    mesaBaixa: { ref: [1.2, 1.2], pecas: [ peca(madeira, Cy(0.6, 0.05, 0, 0.4, 0, 32)), peca(madeiraEsc, Cy(0.1, 0.38, 0, 0.19, 0, 10, 0.18)), peca(mat(COR.mel, 0.5), Cy(0.06, 0.1, 0.15, 0.48, 0.1, 10)) ] },
    planta: { ref: [1.0, 1.0], pecas: [ peca(perola, Cy(0.32, 0.55, 0, 0.27, 0, seg, 0.24)), peca(folha, ...[0, 1, 2, 3, 4, 5, 6].map((j) => new THREE.SphereGeometry(0.22 + (j % 3) * 0.05, 10, 8).scale(0.7, 1.3, 0.7).translate(Math.cos(j * 0.9) * 0.22, 0.85 + (j % 3) * 0.28, Math.sin(j * 0.9) * 0.22))) ] },
  };
  instanciarMoveis(k, moveisDaMini("agradavel"), MODELOS, ["poltronaPiloto", "lareira", "pufao", "puff", "luminaria", "banqueta", "mesaBaixa", "planta"]);

  // ── a RODA: o sofá em arco inteiro (veludo pêssego, encosto pérola), as almofadas e a LAREIRA acesa ──
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eixoY = new THREE.Vector3(0, 1, 0), cor = new THREE.Color();
  const setor = (r0: number, r1: number, h: number, a0 = ARCO_SOFA.a0, a1 = ARCO_SOFA.a1) => {
    const sh = new THREE.Shape(), n = 48; for (let j = 0; j <= n; j++) { const a = a0 + ((a1 - a0) * j) / n; j ? sh.lineTo(Math.cos(a) * r1, -Math.sin(a) * r1) : sh.moveTo(Math.cos(a) * r1, -Math.sin(a) * r1); }
    for (let j = n; j >= 0; j--) { const a = a0 + ((a1 - a0) * j) / n; sh.lineTo(Math.cos(a) * r0, -Math.sin(a) * r0); }
    const geo = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 3, curveSegments: 8 }); geo.rotateX(-Math.PI / 2); geo.translate(R.x, 0, R.z); descartar.push(geo); return geo; };
  add(new THREE.Mesh(setor(R.r - 0.5, R.r + 0.42, 0.4), pessego)); add(new THREE.Mesh(setor(R.r + 0.42, R.r + 0.72, 0.95), perola));
  add(new THREE.Mesh(setor(R.r + 0.4, R.r + 0.46, 0.04), luz(COR.mel, 0.5))).position.y = 0.92;
  add(new THREE.Mesh(setor(R.r - 0.52, R.r - 0.46, 0.03), luz(COR.lilas, 0.5))).position.y = 0.02;
  { const alm = new THREE.BoxGeometry(0.55, 0.42, 0.16); alm.translate(0, 0.21, 0); descartar.push(alm);
    const nA = 12, im = new THREE.InstancedMesh(alm, branco, nA);
    for (let j = 0; j < nA; j++) { const a = ARCO_SOFA.a0 + 0.2 + ((ARCO_SOFA.a1 - ARCO_SOFA.a0 - 0.4) * j) / (nA - 1), r = R.r + 0.25;
      q.setFromAxisAngle(eixoY, Math.atan2(-Math.cos(a), -Math.sin(a))).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.25 + (j % 3) * 0.08));
      m4.compose(new THREE.Vector3(R.x + Math.cos(a) * r, 0.48, R.z + Math.sin(a) * r), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(j, m4); im.setColorAt(j, cor.setHex(PASTEL[(j * 3) % PASTEL.length]!)); }
    add(im); }
  { const chamas: THREE.Mesh[] = [];
    for (let j = 0; j < 9; j++) { const c = add(new THREE.Mesh(new THREE.ConeGeometry(0.16 + (j % 3) * 0.05, 0.7 + (j % 2) * 0.35, 6, 1, true).translate(0, 0.35, 0), luz(j % 3 === 0 ? 0xff8a5c : j % 3 === 1 ? 0xffa86a : 0xffc97a, 0.32))); const a = (j / 9) * Math.PI * 2; c.position.set(R.x + Math.cos(a) * 0.26, 0.38, R.z + Math.sin(a) * 0.26); chamas.push(c); }
    const brasa = add(new THREE.Mesh(new THREE.CircleGeometry(0.6, 32), luz(0xff9a6a, 0.55))); brasa.rotation.x = -Math.PI / 2; brasa.position.set(R.x, 0.39, R.z);
    const calor = add(new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 10), luz(0xffb07a, 0.035))); calor.position.set(R.x, 0.9, R.z);
    const fagulhas = Array.from({ length: k.low ? 6 : 14 }, (_, j) => { const f = add(new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), luz(COR.mel, 0.9))); f.userData.k = j; return f; });
    anim.push((_, t) => {
      chamas.forEach((c, j) => { c.scale.y = 0.75 + 0.35 * Math.sin(t * 3.3 + j * 1.9) ** 2; c.scale.x = c.scale.z = 0.9 + 0.12 * Math.sin(t * 2.1 + j); c.rotation.y = t * 0.5 + j; });
      (brasa.material as THREE.MeshBasicMaterial).opacity = 0.45 + 0.12 * Math.sin(t * 2.6); (calor.material as THREE.MeshBasicMaterial).opacity = 0.03 + 0.015 * Math.sin(t * 1.7);
      for (const f of fagulhas) { const j = f.userData.k as number, u = (t * 0.35 + j / fagulhas.length) % 1; f.position.set(R.x + Math.cos(j * 2.4 + t * 0.3) * (0.15 + u * 0.35), 0.5 + u * 2.4, R.z + Math.sin(j * 2.4 + t * 0.3) * (0.15 + u * 0.35)); (f.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - u); }
    }); }
}
