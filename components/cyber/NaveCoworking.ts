/**
 * NaveCoworking — o convés da NAVE COWORKING (planta pura em lib/cyber/naveCoworking), em metros, com o idioma visual
 * do Lounge Cósmico: piso violeta-escuro com veios de neon lavanda, frisos magenta/ciano, a MANDALA no tapete do
 * chill-out e no átrio, o OLHO HOLOGRÁFICO do lounge (components/cyber/OlhoHolografico) flutuando no mirante.
 * LEVE: materiais Lambert/Basic (sem point light — o brilho vem do emissivo e do aditivo) e os móveis em
 * InstancedMesh (um lote por peça de cada tipo). `teto: false` tira o teto (a prévia de cima).
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ANDAR2, AREAS, CABINES, CHILL, ESCADA_CW, LADO_CABINE, NAVE_COWORK, area, contornoDoCasco, contornoDoLounge, moveisDaNave, moveisDoAndar2, paredesDaNave, pontoDaEscada, type MovelCW, type TipoMovel } from "@/lib/cyber/naveCoworking";
import { criarBuracoPortal } from "./BuracoPortal";
import { criarOlho } from "./OlhoHolografico";

export type NaveCoworkingHandle = { group: THREE.Group; atualizar(dt: number, t: number): void; mostrarTeto(v: boolean): void; /** o 2º andar (o lounge e o terraço) — a prévia de cima do 1º esconde */ mostrarAndar2(v: boolean): void; dispose(): void };

const N = NAVE_COWORK;
/** a paleta do Lounge Cósmico */
const COR = { piso: 0x120a24, pisoClaro: 0x1c1236, lavanda: 0xb98cff, magenta: 0xff5fd2, ciano: 0x66e6ff, ouro: 0xffc46b, casco: 0x1a1430 } as const;

export function criarNaveCoworking(o: { low: boolean; teto?: boolean }): NaveCoworkingHandle {
  const g = new THREE.Group(), anim: ((dt: number, t: number) => void)[] = [], descartar: { dispose(): void }[] = [];
  const add = <T extends THREE.Object3D>(x: T, pai: THREE.Object3D = g) => { pai.add(x); return x; };
  const lambert = (p: THREE.MeshLambertMaterialParameters) => { const m = new THREE.MeshLambertMaterial(p); descartar.push(m); return m; };
  const aditivo = (c: THREE.ColorRepresentation, op: number) => { const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); descartar.push(m); return m; };
  const textura = (w: number, h: number, pinta: (x: CanvasRenderingContext2D, w: number, h: number) => void) => { const c = document.createElement("canvas"); c.width = w; c.height = h; pinta(c.getContext("2d")!, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; descartar.push(t); return t; };
  const hex = (c: number) => `#${c.toString(16).padStart(6, "0")}`;

  // materiais comuns
  const metal = lambert({ color: 0x2a2440, emissive: 0x0e0a22, emissiveIntensity: 0.6 });
  const escuro = lambert({ color: 0x16122a, emissive: 0x0a0618, emissiveIntensity: 0.7 });
  const madeira = lambert({ color: 0x3a2a4a, emissive: 0x140a1e, emissiveIntensity: 0.5 });
  const tampo = lambert({ color: 0x8a7cc0, emissive: 0x1c1438, emissiveIntensity: 0.5 });
  const veludo = lambert({ color: 0x5a2a7a, emissive: 0x1e0a2e, emissiveIntensity: 0.55 });
  const estofado = lambert({ color: 0x2c2650, emissive: 0x100c26, emissiveIntensity: 0.5 });
  const vidro = lambert({ color: 0xbfa8ff, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, emissive: 0x2a1a55, emissiveIntensity: 0.4 });

  // ── o PISO: o contorno do casco, violeta-escuro, com o tingido de cada área e os veios de neon ──
  const contorno = contornoDoCasco(o.low ? 64 : 128);
  const formaCasco = new THREE.Shape(contorno.map((p) => new THREE.Vector2(p.x, -p.z)));
  const pisoTex = textura(1024, 2048, (x, w, h) => {   // o piso inteiro numa textura: base escura + grade fina lavanda + o mapa das áreas
    x.fillStyle = hex(COR.piso); x.fillRect(0, 0, w, h);
    const px = (mx: number) => ((mx + N.a) / (2 * N.a)) * w, pz = (mz: number) => ((N.b - mz) / (2 * N.b)) * h;
    for (const ar of AREAS) { x.fillStyle = hex(ar.cor); x.globalAlpha = ar.id === "avenida" ? 0.09 : 0.06; x.fillRect(px(ar.x0), pz(ar.z1), px(ar.x1) - px(ar.x0), pz(ar.z0) - pz(ar.z1)); }
    x.globalAlpha = 0.16; x.strokeStyle = hex(COR.lavanda); x.lineWidth = 1;
    for (let mx = -N.a; mx <= N.a; mx += 2) { x.beginPath(); x.moveTo(px(mx), 0); x.lineTo(px(mx), h); x.stroke(); }
    for (let mz = -N.b; mz <= N.b; mz += 2) { x.beginPath(); x.moveTo(0, pz(mz)); x.lineTo(w, pz(mz)); x.stroke(); }
    x.globalAlpha = 0.55; x.lineWidth = 3;   // a borda de cada área, em neon
    for (const ar of AREAS) if (ar.id !== "avenida") { x.strokeStyle = hex(ar.cor); x.strokeRect(px(ar.x0) + 3, pz(ar.z1) + 3, px(ar.x1) - px(ar.x0) - 6, pz(ar.z0) - pz(ar.z1) - 6); }
    x.globalAlpha = 1;
  });
  { const geo = new THREE.ShapeGeometry(formaCasco, 48), uv = geo.attributes.uv as THREE.BufferAttribute, pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + N.a) / (2 * N.a), (N.b - pos.getY(i)) / (2 * N.b));   // (a forma usa y = −z: a proa fica no alto da textura)
    const piso = add(new THREE.Mesh(geo, lambert({ map: pisoTex, emissive: 0xffffff, emissiveMap: pisoTex, emissiveIntensity: 0.55 }))); piso.rotation.x = -Math.PI / 2; descartar.push(geo); }
  // a FAIXA de luz no meio da avenida, pulsando da popa pra proa
  const faixaMat = aditivo(COR.lavanda, 0.5);
  { const av = area("avenida"), f = add(new THREE.Mesh(new THREE.PlaneGeometry(0.22, av.z1 - av.z0), faixaMat)); f.rotation.x = -Math.PI / 2; f.position.set(0, 0.02, (av.z0 + av.z1) / 2);
    for (const sx of [-1, 1]) { const b = add(new THREE.Mesh(new THREE.PlaneGeometry(0.06, av.z1 - av.z0), aditivo(COR.magenta, 0.45))); b.rotation.x = -Math.PI / 2; b.position.set(sx * 3, 0.02, (av.z0 + av.z1) / 2); } }
  anim.push((_, t) => { faixaMat.opacity = 0.35 + 0.2 * Math.sin(t * 1.3); });

  // ── o CASCO: a parede em volta (fita da superelipse), a JANELA corrida (panorâmica no mirante) e o friso de luz ──
  const fita = (y0: number, y1: number, filtro: (p: { x: number; z: number }) => boolean, mat: THREE.Material) => {
    const pts = contornoDoCasco(o.low ? 96 : 192), v: number[] = [], idx: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!, b = pts[(i + 1) % pts.length]!; if (!filtro(a) || !filtro(b)) continue;
      const k = v.length / 3; v.push(a.x, y0, a.z, b.x, y0, b.z, b.x, y1, b.z, a.x, y1, a.z); idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); geo.setIndex(idx); geo.computeVertexNormals(); descartar.push(geo);
    return add(new THREE.Mesh(geo, mat));
  };
  const cascoMat = lambert({ color: COR.casco, emissive: 0x0c0820, emissiveIntensity: 0.8, side: THREE.DoubleSide });
  const noMirante = (p: { z: number }) => p.z > area("mirante").z0;
  fita(0, N.alturaCasco, (p) => !noMirante(p), cascoMat);   // a parede cheia (com a janela corrida por cima, abaixo)
  fita(0, 0.7, noMirante, cascoMat);                          // o mirante: só o rodapé…
  fita(0.7, N.alturaCasco, noMirante, lambert({ color: 0x9fd8ff, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide, emissive: 0x0a2040, emissiveIntensity: 0.3 }));   // …e a janela panorâmica
  // a JANELA corrida dos lados: uma faixa de espaço (nebulosa violeta + estrelas) deslizando devagar — o lado de fora
  const espacoTex = textura(2048, 256, (x, w, h) => {
    x.fillStyle = "#06031a"; x.fillRect(0, 0, w, h);
    for (let k = 0; k < 26; k++) { const cx = (k / 26) * w + ((k * 97) % 60), cy = h * (0.3 + 0.4 * ((k * 37) % 10) / 10), r = 60 + ((k * 53) % 90), gr = x.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, k % 3 ? "rgba(185,140,255,.35)" : "rgba(255,95,210,.3)"); gr.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = gr; x.fillRect(cx - r, cy - r, r * 2, r * 2); }
    for (let k = 0; k < 520; k++) { x.fillStyle = `rgba(230,220,255,${0.3 + ((k * 13) % 7) / 10})`; const s = (k % 9) ? 1.2 : 2.6; x.fillRect((k * 211) % w, (k * 89) % h, s, s); }
    x.strokeStyle = "rgba(185,140,255,.9)"; x.lineWidth = 6; x.strokeRect(0, 3, w, h - 6);
  });
  espacoTex.wrapS = THREE.RepeatWrapping; espacoTex.repeat.set(6, 1);
  const janelaMat = new THREE.MeshBasicMaterial({ map: espacoTex, side: THREE.DoubleSide }); descartar.push(janelaMat);
  { const pts = contornoDoCasco(o.low ? 96 : 192, 0.08), v: number[] = [], uv: number[] = [], idx: number[] = []; let s = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i]!, b = pts[(i + 1) % pts.length]!, L = Math.hypot(b.x - a.x, b.z - a.z); if (noMirante(a) || noMirante(b) || Math.abs(a.z) > N.b - 5) { s += L; continue; }
      const k = v.length / 3, u0 = s / 40, u1 = (s + L) / 40; v.push(a.x, 1.5, a.z, b.x, 1.5, b.z, b.x, 4.2, b.z, a.x, 4.2, a.z); uv.push(u0, 0, u1, 0, u1, 1, u0, 1); idx.push(k, k + 1, k + 2, k, k + 2, k + 3); s += L; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); descartar.push(geo); add(new THREE.Mesh(geo, janelaMat)); }
  anim.push((dt) => { espacoTex.offset.x += dt * 0.004; });
  for (const y of [0.08, N.alturaCasco - 0.15]) fita(y, y + 0.06, () => true, aditivo(y < 1 ? COR.magenta : COR.lavanda, 0.75));   // frisos no rodapé e no alto
  // as COSTELAS do casco (arcos de metal subindo pro teto, a cada 6 m) — dão a cara de nave por dentro
  { const pts = contornoDoCasco(o.low ? 96 : 192), costela = new THREE.BoxGeometry(0.35, N.alturaCasco, 0.35), im = new THREE.InstancedMesh(costela, metal, 64), m4 = new THREE.Matrix4(); let n = 0;
    for (let k = 0; k < pts.length && n < 64; k += Math.round(pts.length / 40)) { const p = pts[k]!; if (noMirante(p)) continue; m4.makeTranslation(p.x * 0.985, N.alturaCasco / 2, p.z * 0.985); im.setMatrixAt(n++, m4); }
    im.count = n; add(im); descartar.push(costela); }

  // ── o TETO: a placa (some na prévia de cima) com a CLARABOIA comprida em cima da avenida ──
  const teto = new THREE.Group(); add(teto); teto.visible = o.teto ?? true;
  { const furo = new THREE.Path(); const av = area("avenida"); furo.moveTo(-2.4, -(av.z0 + 1)); furo.lineTo(2.4, -(av.z0 + 1)); furo.lineTo(2.4, -(av.z1 - 1)); furo.lineTo(-2.4, -(av.z1 - 1)); furo.closePath();
    const forma = new THREE.Shape(contornoDoCasco(o.low ? 64 : 128).map((p) => new THREE.Vector2(p.x, -p.z))); forma.holes.push(furo);
    const geo = new THREE.ShapeGeometry(forma, 48); descartar.push(geo);
    const placa = add(new THREE.Mesh(geo, lambert({ color: 0x140f26, emissive: 0x0a0618, emissiveIntensity: 0.7, side: THREE.DoubleSide })), teto); placa.rotation.x = -Math.PI / 2; placa.position.y = N.alturaCasco;
    const clara = add(new THREE.Mesh(new THREE.PlaneGeometry(4.8, av.z1 - av.z0 - 2), lambert({ color: 0x8fb4ff, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide })), teto); clara.rotation.x = -Math.PI / 2; clara.position.set(0, N.alturaCasco + 0.4, (av.z0 + av.z1) / 2);
    for (const sx of [-1, 1]) { const l = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, av.z1 - av.z0 - 2), aditivo(COR.lavanda, 0.8)), teto); l.position.set(sx * 2.45, N.alturaCasco - 0.05, (av.z0 + av.z1) / 2); } }

  // ── as DIVISÓRIAS de vidro (salas de reuniões e cabines de foco) com o friso aceso em cima e embaixo ──
  { const paredes = paredesDaNave(), corpo: THREE.BufferGeometry[] = [], friso: THREE.BufferGeometry[] = [], rodape: THREE.BufferGeometry[] = [];
    for (const w of paredes) {
      const L = Math.hypot(w.bx - w.ax, w.bz - w.az), giro = -Math.atan2(w.bz - w.az, w.bx - w.ax), cx = (w.ax + w.bx) / 2, cz = (w.az + w.bz) / 2;
      const m4 = new THREE.Matrix4().compose(new THREE.Vector3(cx, 0, cz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), giro), new THREE.Vector3(1, 1, 1));
      corpo.push(new THREE.BoxGeometry(L, w.alt, w.esp).translate(0, w.alt / 2, 0).applyMatrix4(m4));
      friso.push(new THREE.BoxGeometry(L, 0.05, w.esp + 0.04).translate(0, w.alt, 0).applyMatrix4(m4));
      rodape.push(new THREE.BoxGeometry(L, 0.03, w.esp + 0.02).translate(0, 0.02, 0).applyMatrix4(m4));
    }
    const gc = mergeGeometries(corpo)!, gf = mergeGeometries(friso)!, gr = mergeGeometries(rodape)!; corpo.concat(friso, rodape).forEach((x) => x.dispose()); descartar.push(gc, gf, gr);
    add(new THREE.Mesh(gc, vidro)); add(new THREE.Mesh(gf, aditivo(COR.lavanda, 0.85))); add(new THREE.Mesh(gr, aditivo(COR.lavanda, 0.25))); }
  // o teto das cabines de foco (um disco de luz embaixo) — cada uma é uma cápsula fechada
  for (const [cx, cz] of CABINES) {
    const t = add(new THREE.Mesh(new THREE.BoxGeometry(LADO_CABINE + 0.1, 0.12, LADO_CABINE + 0.1), escuro)); t.position.set(cx, N.pe + 0.06, cz);
    const l = add(new THREE.Mesh(new THREE.CircleGeometry(0.7, 24), aditivo(0x9affd0, 0.55))); l.rotation.x = Math.PI / 2; l.position.set(cx, N.pe - 0.01, cz);
  }

  // ── os MÓVEIS: um modelo por tipo (feito de peças por material) e um InstancedMesh por peça ──
  type Peca = { geo: THREE.BufferGeometry; mat: THREE.Material };
  const peca = (mat: THREE.Material, ...gs: THREE.BufferGeometry[]): Peca => { const geo = mergeGeometries(gs)!; gs.forEach((x) => x.dispose()); return { geo, mat }; };
  const B = (w: number, h: number, d: number, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  const C = (r: number, h: number, x = 0, y = 0, z = 0, seg = 16, rb = r) => new THREE.CylinderGeometry(r, rb, h, seg).translate(x, y, z);
  const telaMesaTex = textura(256, 160, (x, w, h) => { const gr = x.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#130a2e"); gr.addColorStop(1, "#2a0f3e"); x.fillStyle = gr; x.fillRect(0, 0, w, h); x.fillStyle = hex(COR.ciano); x.fillRect(12, 12, w - 24, 10); x.globalAlpha = 0.8; for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? hex(COR.lavanda) : hex(COR.magenta); x.fillRect(16, 36 + i * 18, 40 + ((i * 53) % 140), 6); } x.globalAlpha = 1; x.strokeStyle = hex(COR.lavanda); x.lineWidth = 3; x.strokeRect(170, 36, 70, 100); });
  const telaMesa = new THREE.MeshBasicMaterial({ map: telaMesaTex }); descartar.push(telaMesa);
  const seg = o.low ? 10 : 18;
  /** os modelos, de frente pra +z (o lado de quem usa), centrados no retângulo de referência (`ref` = largura × fundo) */
  const MODELOS: Partial<Record<TipoMovel, { ref: [number, number]; pecas: Peca[] }>> = {
    mesa: { ref: [1.56, 0.8], pecas: [
      peca(tampo, B(1.56, 0.05, 0.8, 0, 0.74, 0)), peca(metal, B(0.05, 0.72, 0.7, -0.74, 0.36, 0), B(0.05, 0.72, 0.7, 0.74, 0.36, 0), B(0.5, 0.32, 0.04, 0, 1.0, -0.28), B(0.08, 0.2, 0.08, 0, 0.84, -0.3)),
      peca(telaMesa, new THREE.PlaneGeometry(0.48, 0.29).translate(0, 1.0, -0.257)), peca(aditivo(COR.ciano, 0.7), B(1.5, 0.02, 0.02, 0, 0.71, 0.4)) ] },
    cadeira: { ref: [0.55, 0.55], pecas: [
      peca(estofado, B(0.5, 0.08, 0.5, 0, 0.48, 0), B(0.48, 0.55, 0.07, 0, 0.82, -0.23)), peca(metal, C(0.04, 0.42, 0, 0.24, 0, 8), C(0.26, 0.04, 0, 0.03, 0, 12)), peca(aditivo(COR.magenta, 0.35), new THREE.CircleGeometry(0.32, 16).rotateX(-Math.PI / 2).translate(0, 0.012, 0)) ] },
    mesaReuniao: { ref: [2.2, 5.6], pecas: [
      peca(tampo, B(2.2, 0.06, 5.6, 0, 0.76, 0), C(1.1, 0.06, 0, 0.76, 2.8, 24), C(1.1, 0.06, 0, 0.76, -2.8, 24)), peca(metal, B(0.5, 0.72, 3.6, 0, 0.36, 0)), peca(aditivo(COR.ciano, 0.8), B(2.24, 0.025, 5.64, 0, 0.73, 0)) ] },
    mesaRedonda: { ref: [3, 3], pecas: [ peca(tampo, C(1.5, 0.07, 0, 0.76, 0, 40)), peca(metal, C(0.35, 0.72, 0, 0.36, 0, 16, 0.6)), peca(aditivo(COR.lavanda, 0.85), new THREE.TorusGeometry(1.5, 0.025, 6, 48).rotateX(Math.PI / 2).translate(0, 0.73, 0)) ] },
    puff: { ref: [0.9, 0.9], pecas: [ peca(veludo, new THREE.SphereGeometry(0.45, seg, 10).scale(1, 0.55, 1).translate(0, 0.25, 0)), peca(aditivo(COR.lavanda, 0.4), new THREE.TorusGeometry(0.44, 0.02, 4, 24).rotateX(Math.PI / 2).translate(0, 0.08, 0)) ] },
    planta: { ref: [1.2, 1.2], pecas: [ peca(escuro, C(0.45, 0.7, 0, 0.35, 0, seg, 0.35)), peca(aditivo(0x5fffd0, 0.55), ...[0, 1, 2, 3, 4, 5].map((k) => new THREE.ConeGeometry(0.16, 1.6 + (k % 3) * 0.4, 6).translate(0, 0.8, 0).rotateZ(0.35 * Math.cos(k * 1.1)).rotateX(0.35 * Math.sin(k * 1.1)).translate(0, 0.7, 0))), peca(aditivo(COR.magenta, 0.8), ...[0, 1, 2, 3].map((k) => new THREE.SphereGeometry(0.09, 8, 6).translate(Math.cos(k * 1.6) * 0.4, 1.9 + (k % 2) * 0.5, Math.sin(k * 1.6) * 0.4))) ] },
    balcao: { ref: [10, 1.1], pecas: [ peca(madeira, B(10, 1.05, 1.1, 0, 0.52, 0)), peca(tampo, B(10.1, 0.06, 1.2, 0, 1.08, 0)), peca(aditivo(COR.ouro, 0.8), B(10, 0.04, 0.04, 0, 0.9, 0.56), B(10, 0.04, 0.04, 0, 0.1, 0.56)) ] },
    banqueta: { ref: [0.5, 0.5], pecas: [ peca(veludo, C(0.22, 0.08, 0, 0.74, 0, 14)), peca(metal, C(0.035, 0.7, 0, 0.36, 0, 8), C(0.2, 0.03, 0, 0.015, 0, 12)) ] },
    mesinha: { ref: [1, 1], pecas: [ peca(tampo, C(0.5, 0.05, 0, 1.05, 0, 24)), peca(metal, C(0.04, 1.0, 0, 0.5, 0, 8), C(0.3, 0.03, 0, 0.015, 0, 14)), peca(aditivo(COR.ouro, 0.6), new THREE.TorusGeometry(0.5, 0.015, 4, 32).rotateX(Math.PI / 2).translate(0, 1.03, 0)) ] },
    maquinaCafe: { ref: [1.2, 0.7], pecas: [ peca(metal, B(1.2, 0.6, 0.6, 0, 1.4, 0)), peca(aditivo(COR.ouro, 0.85), B(0.8, 0.12, 0.02, 0, 1.55, 0.31), C(0.06, 0.08, -0.3, 1.18, 0.15, 8), C(0.06, 0.08, 0.3, 1.18, 0.15, 8)) ] },
    poltrona: { ref: [1.1, 1.1], pecas: [ peca(veludo, B(1.0, 0.45, 0.9, 0, 0.22, 0.05), B(1.0, 0.7, 0.2, 0, 0.7, -0.42), B(0.16, 0.25, 0.9, -0.48, 0.55, 0.05), B(0.16, 0.25, 0.9, 0.48, 0.55, 0.05)) ] },
    espreguicadeira: { ref: [0.9, 2.0], pecas: [ peca(veludo, B(0.8, 0.22, 1.3, 0, 0.32, 0.25), B(0.8, 0.16, 0.8, 0, 0.55, -0.62).rotateX(0.5)), peca(metal, B(0.06, 0.25, 1.8, -0.38, 0.12, 0), B(0.06, 0.25, 1.8, 0.38, 0.12, 0)), peca(aditivo(COR.ciano, 0.5), B(0.84, 0.02, 1.84, 0, 0.02, 0)) ] },
    mesaBaixa: { ref: [1.4, 1.4], pecas: [ peca(tampo, C(0.7, 0.05, 0, 0.4, 0, 32)), peca(metal, C(0.3, 0.38, 0, 0.19, 0, 16, 0.5)), peca(aditivo(COR.magenta, 0.7), new THREE.TorusGeometry(0.7, 0.015, 4, 40).rotateX(Math.PI / 2).translate(0, 0.38, 0)) ] },
    telescopio: { ref: [0.9, 0.9], pecas: [ peca(metal, C(0.03, 1.2, 0.25, 0.6, 0, 6), C(0.03, 1.2, -0.25, 0.6, 0, 6), C(0.03, 1.2, 0, 0.6, -0.28, 6)), peca(tampo, C(0.12, 1.3, 0, 0, 0, 16, 0.09).rotateX(-1.0).translate(0, 1.45, 0.25)), peca(aditivo(COR.ciano, 0.8), new THREE.CircleGeometry(0.12, 16).rotateX(-1.0 - Math.PI / 2).translate(0, 1.73, 0.68)) ] },
    fogueira: { ref: [2.2, 2.2], pecas: [ peca(escuro, C(1.1, 0.35, 0, 0.17, 0, 32, 1.2)), peca(aditivo(COR.magenta, 0.85), new THREE.TorusGeometry(1.0, 0.04, 4, 48).rotateX(Math.PI / 2).translate(0, 0.36, 0)) ] },
    floreira: { ref: [0.5, 3], pecas: [ peca(escuro, B(0.5, 0.6, 3, 0, 0.3, 0)), peca(aditivo(0x5fffd0, 0.5), ...[-1.1, -0.4, 0.3, 1.0].map((z) => new THREE.ConeGeometry(0.12, 0.6, 5).translate(0, 0.9, z))) ] },
  };
  const moveis = moveisDaNave();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eixoY = new THREE.Vector3(0, 1, 0);
  const instanciar = (todos: MovelCW[], pai: THREE.Object3D) => {
  const porTipo = new Map<TipoMovel, MovelCW[]>(); for (const m of todos) porTipo.set(m.tipo, [...(porTipo.get(m.tipo) ?? []), m]);
  for (const [tipo, lista] of porTipo) {
    const md = MODELOS[tipo]; if (!md) continue;
    for (const pc of md.pecas) {
      const im = new THREE.InstancedMesh(pc.geo, pc.mat, lista.length); descartar.push(pc.geo);
      lista.forEach((m, i) => {
        const rumo = m.rumo ?? 0, deLado = Math.abs(Math.sin(rumo)) > 0.7, lx = m.x1 - m.x0, lz = m.z1 - m.z0;
        const larg = deLado ? lz : lx, fundo = deLado ? lx : lz, redondo = tipo === "cadeira" || tipo === "puff" || tipo === "banqueta" || tipo === "mesinha" || tipo === "mesaRedonda" || tipo === "planta" || tipo === "sofaArco" || tipo === "poltrona" || tipo === "mesaBaixa" || tipo === "fogueira" || tipo === "telescopio";
        q.setFromAxisAngle(eixoY, rumo);
        m4.compose(new THREE.Vector3((m.x0 + m.x1) / 2, 0, (m.z0 + m.z1) / 2), q, redondo ? new THREE.Vector3(1, 1, 1) : new THREE.Vector3(larg / md.ref[0], 1, fundo / md.ref[1]));
        im.setMatrixAt(i, m4);
      });
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); add(im, pai);
    }
  }
  };
  instanciar(moveis, g);

  // ── os TELÕES das salas de reuniões (a pauta, o gráfico) ──
  const telaoTex = (nome: string, cor: number) => textura(1024, 576, (x, w, h) => {
    const gr = x.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#0d0722"); gr.addColorStop(1, "#22093a"); x.fillStyle = gr; x.fillRect(0, 0, w, h);
    x.fillStyle = hex(cor); x.font = "800 64px system-ui,sans-serif"; x.fillText(nome.toUpperCase(), 56, 110);
    x.fillStyle = "#e2d0ff"; x.font = "500 30px system-ui,sans-serif"; ["Pauta da reunião", "1 · Sprint da semana", "2 · Blueprint do estudo", "3 · Próximos passos"].forEach((s, i) => x.fillText(s, 60, 190 + i * 52));
    x.strokeStyle = hex(cor); x.lineWidth = 5; x.beginPath(); for (let i = 0; i <= 12; i++) { const px = 560 + i * 34, py = 470 - Math.sin(i * 0.7) * 60 - i * 14; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
    x.globalAlpha = 0.6; for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? hex(COR.magenta) : hex(COR.ciano); x.fillRect(570 + i * 50, 520 - (30 + ((i * 37) % 90)), 30, 30 + ((i * 37) % 90)); } x.globalAlpha = 1;
  });
  for (const m of moveis.filter((x) => x.tipo === "telao")) {
    const ar = area(m.area), cz = (m.z0 + m.z1) / 2, cx = (m.x0 + m.x1) / 2, ry = m.rumo ?? 0;
    const tg = add(new THREE.Group()); tg.position.set(cx, 0, cz); tg.rotation.y = ry;
    add(new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.7, 0.12).translate(0, 1.85, 0), escuro), tg);
    const mt = new THREE.MeshBasicMaterial({ map: telaoTex(ar.nome, ar.cor) }); descartar.push(mt);
    add(new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.48).translate(0, 1.85, 0.07), mt), tg);
  }

  // ── os HOLOGRAMAS em cima das mesas de reunião (cone de luz + figura girando) ──
  const holo = (x: number, z: number, cor: number, alt = 1.9) => {
    const hg = add(new THREE.Group()); hg.position.set(x, 0.8, z);
    const cone = add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 1.0, alt, 24, 1, true).translate(0, alt / 2, 0), aditivo(cor, 0.12)), hg);
    const fig = add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), new THREE.MeshBasicMaterial({ color: cor, wireframe: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })), hg); fig.position.y = alt * 0.7;
    const anel = add(new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.015, 4, 48), aditivo(cor, 0.8)), hg); anel.position.y = alt * 0.7; anel.rotation.x = Math.PI / 2;
    anim.push((dt, t) => { fig.rotation.y += dt * 0.6; fig.rotation.x = Math.sin(t * 0.4) * 0.3; anel.rotation.z += dt * 0.9; (cone.material as THREE.MeshBasicMaterial).opacity = 0.09 + 0.05 * Math.sin(t * 2); });
  };
  holo(-11.8, -3, COR.ciano, 1.6); holo(11.6, -3, COR.lavanda, 2.2);

  // ── a MANDALA (o tapete do chill-out e o anel de chegada do átrio): geometria sagrada desenhada numa textura ──
  const mandalaTex = (c1: string, c2: string) => textura(1024, 1024, (x, w) => {
    const r = w / 2; x.translate(r, r); x.lineCap = "round";
    const flor = (raio: number, n: number, cor: string, lw: number) => { x.strokeStyle = cor; x.lineWidth = lw; for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; x.beginPath(); x.arc(Math.cos(a) * raio, Math.sin(a) * raio, raio, 0, Math.PI * 2); x.stroke(); } };
    x.globalAlpha = 0.9; flor(r * 0.22, 6, c1, 4); x.globalAlpha = 0.7; flor(r * 0.44, 12, c2, 3);
    x.globalAlpha = 0.85; x.strokeStyle = c1; x.lineWidth = 6; for (const k of [0.66, 0.9, 0.97]) { x.beginPath(); x.arc(0, 0, r * k, 0, Math.PI * 2); x.stroke(); }
    x.globalAlpha = 0.6; for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; x.strokeStyle = k % 2 ? c1 : c2; x.lineWidth = 3; x.beginPath(); x.moveTo(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66); x.quadraticCurveTo(Math.cos(a + 0.13) * r * 0.82, Math.sin(a + 0.13) * r * 0.82, Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); x.stroke(); }
    x.globalAlpha = 1;
  });
  const tapeteMat = new THREE.MeshBasicMaterial({ map: mandalaTex("#ff6fd8", "#b98cff"), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }); descartar.push(tapeteMat);
  const tapete = add(new THREE.Mesh(new THREE.CircleGeometry(3.6, 64), tapeteMat)); tapete.rotation.x = -Math.PI / 2; tapete.position.set(CHILL.x, 0.03, CHILL.z);
  const chegadaMat = new THREE.MeshBasicMaterial({ map: mandalaTex("#b98cff", "#66e6ff"), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }); descartar.push(chegadaMat);
  const chegada = add(new THREE.Mesh(new THREE.CircleGeometry(2.6, 64), chegadaMat)); chegada.rotation.x = -Math.PI / 2; chegada.position.set(N.chegada.x, 0.03, N.chegada.z);
  const colunaChegada = add(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 4, 32, 1, true).translate(0, 2, 0), aditivo(COR.lavanda, 0.08))); colunaChegada.position.set(N.chegada.x, 0, N.chegada.z);
  anim.push((dt, t) => { tapete.rotation.z += dt * 0.05; chegada.rotation.z -= dt * 0.12; chegadaMat.opacity = 0.7 + 0.2 * Math.sin(t * 1.6); (colunaChegada.material as THREE.MeshBasicMaterial).opacity = 0.05 + 0.04 * Math.sin(t * 1.6); });
  // o SOFÁ EM ARCO do chill-out, inteiro (a colisão são os módulos `sofaArco` da planta): assento, encosto e o friso
  /** um sofá em arco inteiro, de `a0` a `a1` (o ponto do ângulo a = (cos a, sin a) × r, em volta de cx, cz) */
  const sofaEmArco = (cx: number, cz: number, R: number, a0: number, a1: number, pai: THREE.Object3D, mat: THREE.Material = veludo) => {
    const setor = (r0: number, r1: number, h: number) => {
      const sh = new THREE.Shape(), n = 40; for (let k = 0; k <= n; k++) { const a = a0 + ((a1 - a0) * k) / n; const px = Math.cos(a) * r1, pz = Math.sin(a) * r1; k ? sh.lineTo(px, -pz) : sh.moveTo(px, -pz); }
      for (let k = n; k >= 0; k--) { const a = a0 + ((a1 - a0) * k) / n; sh.lineTo(Math.cos(a) * r0, -Math.sin(a) * r0); }
      const geo = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2, curveSegments: 8 }); geo.rotateX(-Math.PI / 2); geo.translate(cx, 0, cz); descartar.push(geo); return geo; };
    add(new THREE.Mesh(setor(R - 0.55, R + 0.4, 0.42), mat), pai); add(new THREE.Mesh(setor(R + 0.4, R + 0.7, 1.0), mat), pai);
    const fr = add(new THREE.Mesh(setor(R - 0.57, R - 0.52, 0.04), aditivo(COR.magenta, 0.7)), pai); fr.position.y = 0.02;
  };
  sofaEmArco(CHILL.x, CHILL.z, 4.6, -Math.PI * 0.8 - 0.32, Math.PI * 0.8 + 0.32, g);
  // as LANTERNAS penduradas no chill-out (bolhas de luz balançando devagar)
  { const lan: THREE.Mesh[] = [], cores = [COR.magenta, COR.lavanda, COR.ciano];
    for (let k = 0; k < (o.low ? 6 : 11); k++) { const a = k * 2.39, r = 1 + (k % 4) * 1.1, l = add(new THREE.Mesh(new THREE.SphereGeometry(0.09 + (k % 3) * 0.03, 10, 8), aditivo(cores[k % 3]!, 0.45))); l.position.set(CHILL.x + Math.cos(a) * r, 3.2 + (k % 3) * 0.6, CHILL.z + Math.sin(a) * r); lan.push(l);
      const fio = add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, N.alturaCasco - l.position.y, 3), aditivo(0xffffff, 0.2))); fio.position.set(l.position.x, (N.alturaCasco + l.position.y) / 2, l.position.z); }
    anim.push((_, t) => lan.forEach((l, k) => { l.position.y += Math.sin(t * 0.8 + k) * 0.0015; })); }

  // o CAFÉ: a prateleira acesa atrás do balcão (potes e garrafas), as luminárias pendentes e o cardápio holográfico
  { const garrafas: THREE.BufferGeometry[] = [], cores = [COR.ouro, COR.magenta, COR.ciano];
    const prat = add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.2, 9).translate(17.6, 1.1, -18), escuro)); void prat;
    for (const y of [1.25, 1.85]) { const tb = add(new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 9), aditivo(COR.ouro, 0.6))); tb.position.set(17.35, y, -18); }
    for (let k = 0; k < 3; k++) { const gs: THREE.BufferGeometry[] = []; for (let i = 0; i < 14; i++) { if (i % 3 !== k) continue; for (const y of [1.25, 1.85]) gs.push(new THREE.CylinderGeometry(0.06, 0.07, 0.3 + (i % 2) * 0.12, 8).translate(17.35, y + 0.18, -22.2 + i * 0.6)); }
      const geo = mergeGeometries(gs)!; gs.forEach((x) => x.dispose()); garrafas.push(geo); add(new THREE.Mesh(geo, aditivo(cores[k]!, 0.65))); }
    descartar.push(...garrafas);
    for (const z of [-21.5, -18, -14.5]) {
      const fio = add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 2.6, 3), metal)); fio.position.set(15.2, N.alturaCasco - 1.3, z);
      const cup = add(new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.4, 16, 1, true), lambert({ color: 0x2a1a10, emissive: 0x3a2008, emissiveIntensity: 0.8, side: THREE.DoubleSide }))); cup.position.set(15.2, N.alturaCasco - 2.75, z);
      const lz = add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), aditivo(COR.ouro, 0.95))); lz.position.set(15.2, N.alturaCasco - 2.95, z);
      const cone = add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 1.1, 2.4, 20, 1, true).translate(0, -1.2, 0), aditivo(COR.ouro, 0.05))); cone.position.set(15.2, N.alturaCasco - 2.9, z); }
    const menu = textura(1024, 512, (c, w, h) => { c.fillStyle = "#120818"; c.fillRect(0, 0, w, h); c.strokeStyle = hex(COR.ouro); c.lineWidth = 6; c.strokeRect(14, 14, w - 28, h - 28); c.fillStyle = hex(COR.ouro); c.font = "800 70px system-ui,sans-serif"; c.fillText("CAFÉ ÓRBITA", 50, 110); c.font = "500 38px system-ui,sans-serif"; c.fillStyle = "#ffe8c8"; [["Espresso de nebulosa", "✦ 2"], ["Latte lunar", "✦ 3"], ["Chá de poeira estelar", "✦ 2"], ["Bolo de buraco negro", "✦ 4"]].forEach(([n, p], i) => { c.fillText(n!, 60, 200 + i * 70); c.fillText(p!, w - 150, 200 + i * 70); }); });
    const mm = new THREE.MeshBasicMaterial({ map: menu }); descartar.push(mm);
    const mp = add(new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), mm)); mp.position.set(17.5, 3.6, -18); mp.rotation.y = -Math.PI / 2; }

  // ── as PLACAS holográficas de cada área (o nome em neon flutuando na entrada) ──
  const placa = (texto: string, cor: number, x: number, y: number, z: number, rumo: number, larg = 3.2) => {
    const tx = textura(1024, 256, (c, w, h) => { c.clearRect(0, 0, w, h); let fs = 92; c.font = `800 ${fs}px system-ui,sans-serif`; while (c.measureText(texto).width > w - 60 && fs > 40) { fs -= 4; c.font = `800 ${fs}px system-ui,sans-serif`; } c.textAlign = "center"; c.textBaseline = "middle"; c.shadowColor = hex(cor); c.shadowBlur = 28; c.fillStyle = hex(cor); c.fillText(texto, w / 2, h / 2); c.shadowBlur = 0; c.fillStyle = "#ffffff"; c.globalAlpha = 0.85; c.fillText(texto, w / 2, h / 2); });
    const mt = new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, side: THREE.DoubleSide }); descartar.push(mt);
    const p = add(new THREE.Mesh(new THREE.PlaneGeometry(larg, larg / 4), mt)); p.position.set(x, y, z); p.rotation.y = rumo; return p;
  };
  placa("COWORKING", area("cowork").cor, -3.15, 3.7, 13, Math.PI / 2, 3.6);
  placa("SALA ÓRION", area("orion").cor, -5.9, 3.6, -3, Math.PI / 2);
  placa("FOCO", area("foco").cor, -3.15, 3.7, -18, Math.PI / 2, 2.4);
  placa("CHILL-OUT", area("chill").cor, 3.15, 3.7, 13, -Math.PI / 2, 3.4);
  placa("SALA LYRA", area("lyra").cor, 5.9, 3.6, -3, -Math.PI / 2);
  placa("CAFÉ ÓRBITA", area("cafe").cor, 3.15, 3.7, -18, -Math.PI / 2, 3.6);
  placa("MIRANTE", area("mirante").cor, 0, 4.9, 22.2, Math.PI, 3.6);
  placa("PORTAL · CIDADE ZAEON", COR.lavanda, 0, 4.6, -25.8, 0, 5.2);
  // o TOTEM de boas-vindas do átrio (o texto dos dois lados)
  { const tm = moveis.find((m) => m.tipo === "totem")!, cx = (tm.x0 + tm.x1) / 2, cz = (tm.z0 + tm.z1) / 2;
    const tx = textura(512, 1024, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#1a0b36"); gr.addColorStop(1, "#08041a"); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.textAlign = "center"; c.fillStyle = hex(COR.lavanda); c.font = "800 64px system-ui,sans-serif"; c.fillText("NAVE", w / 2, 150); c.fillText("ZAEON", w / 2, 225); c.fillStyle = "#e2d0ff"; c.font = "500 34px system-ui,sans-serif"; ["coworking cósmico", "", "◀ coworking · órion · foco", "chill-out · lyra · café ▶", "", "▲ mirante", "▼ portal da cidade"].forEach((s, i) => c.fillText(s, w / 2, 340 + i * 60)); c.strokeStyle = hex(COR.magenta); c.lineWidth = 6; c.strokeRect(20, 20, w - 40, h - 40); });
    const mt = new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide }); descartar.push(mt);
    const t = add(new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.4), mt)); t.position.set(cx, 1.3, cz); t.rotation.y = tm.rumo ?? 0;
    const base = add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.4), aditivo(COR.lavanda, 0.7))); base.position.set(cx, 0.05, cz); }

  // ── o MIRANTE: o OLHO HOLOGRÁFICO do lounge flutuando na frente da janela ──
  const olho = criarOlho({ low: o.low, tam: 3.6 }); olho.group.position.set(0, 3.9, 32); olho.group.rotation.y = Math.PI; add(olho.group); descartar.push(olho);
  anim.push((_, t) => olho.atualizar(t, 0.25 + 0.25 * Math.sin(t * 2.2), 0.6));

  // ── o 2º ANDAR: o LOUNGE (vista 360°) e o TERRAÇO em volta, com a ESCADA EM CARACOL saindo da avenida ──
  const andar2 = new THREE.Group(); andar2.position.y = ANDAR2.y; add(andar2);
  { const E = ESCADA_CW, furo = () => { const f = new THREE.Path(); f.absarc(E.cx, -E.cz, E.rOut + 0.15, 0, Math.PI * 2, true); return f; };
    // o PISO do terraço (claro, com a grade fina) e o do lounge (violeta, com o mesmo veio do 1º andar) — o furo da escada
    const pisoTerraco = textura(512, 512, (x, w) => { x.fillStyle = "#2a2148"; x.fillRect(0, 0, w, w); x.strokeStyle = "rgba(226,208,255,.22)"; x.lineWidth = 2; for (let k = 0; k <= w; k += 64) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, w); x.stroke(); } x.strokeStyle = "rgba(226,208,255,.08)"; for (let k = 0; k <= w; k += 16) { x.beginPath(); x.moveTo(0, k); x.lineTo(w, k); x.stroke(); } });
    pisoTerraco.wrapS = pisoTerraco.wrapT = THREE.RepeatWrapping;
    const placa = (contorno: { x: number; z: number }[], buracos: THREE.Path[], mat: THREE.Material, y: number, rep: number) => {
      const sh = new THREE.Shape(contorno.map((p) => new THREE.Vector2(p.x, -p.z))); sh.holes.push(...buracos);
      const geo = new THREE.ShapeGeometry(sh, 32), uv = geo.attributes.uv as THREE.BufferAttribute, pos = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / rep, pos.getY(i) / rep);
      const m = add(new THREE.Mesh(geo, mat), andar2); m.rotation.x = -Math.PI / 2; m.position.y = y; descartar.push(geo); return m; };
    const lounge = contornoDoLounge(o.low ? 64 : 128);
    placa(contornoDoCasco(o.low ? 64 : 128).map((p) => ({ x: p.x * 0.995, z: p.z * 0.995 })), [new THREE.Path(lounge.slice().reverse().map((p) => new THREE.Vector2(p.x, -p.z)))], lambert({ map: pisoTerraco, emissive: 0xffffff, emissiveMap: pisoTerraco, emissiveIntensity: 0.35 }), 0.02, 8);
    placa(lounge, [furo()], lambert({ map: pisoTex, emissive: 0xffffff, emissiveMap: pisoTex, emissiveIntensity: 0.5 }), 0.02, 40);
    // o GUARDA-CORPO de vidro na borda do terraço, com o corrimão aceso
    { const pts = contornoDoCasco(o.low ? 96 : 160).map((p) => ({ x: p.x * 0.99, z: p.z * 0.99 })), v: number[] = [], idx: number[] = [];
      for (let i = 0; i < pts.length; i++) { const a = pts[i]!, b = pts[(i + 1) % pts.length]!, k = v.length / 3; v.push(a.x, 0, a.z, b.x, 0, b.z, b.x, 1.1, b.z, a.x, 1.1, a.z); idx.push(k, k + 1, k + 2, k, k + 2, k + 3); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); geo.setIndex(idx); geo.computeVertexNormals(); descartar.push(geo); add(new THREE.Mesh(geo, vidro), andar2);
      add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x, 1.1, p.z)), true), 240, 0.04, 5, true), aditivo(COR.lavanda, 0.9)), andar2); }
    // a ESCADA: coluna, degraus girando, o corrimão de luz em espiral (do piso do 1º andar até o lounge)
    const nDeg = 46, larg = E.rOut - E.rIn;
    const coluna = add(new THREE.Mesh(new THREE.CylinderGeometry(E.rIn, E.rIn, ANDAR2.y + 1.2, 16), metal)); coluna.position.set(E.cx, (ANDAR2.y + 1.2) / 2, E.cz);
    const degraus = new THREE.InstancedMesh(new THREE.BoxGeometry(larg, 0.1, 0.55), tampo, nDeg), luzDeg = new THREE.InstancedMesh(new THREE.BoxGeometry(larg, 0.02, 0.03), aditivo(COR.lavanda, 0.8), nDeg), mq = new THREE.Matrix4();
    for (let k = 0; k < nDeg; k++) { const esc = (E.giro * (k + 0.5)) / nDeg, p2 = pontoDaEscada(esc), a = E.a0 + esc, qq = new THREE.Quaternion().setFromAxisAngle(eixoY, a + Math.PI / 2), y = (ANDAR2.y * (k + 1)) / nDeg;
      mq.compose(new THREE.Vector3(p2.x, y - 0.05, p2.z), qq, new THREE.Vector3(1, 1, 1)); degraus.setMatrixAt(k, mq);
      const fr = new THREE.Vector3(0, 0, 0.27).applyQuaternion(qq); mq.compose(new THREE.Vector3(p2.x + fr.x, y - 0.03, p2.z + fr.z), qq, new THREE.Vector3(1, 1, 1)); luzDeg.setMatrixAt(k, mq); }
    for (const im of [degraus, luzDeg]) { im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); add(im); descartar.push(im.geometry); }
    const espiral = new THREE.CatmullRomCurve3(Array.from({ length: 80 }, (_, k) => { const esc = (E.giro * k) / 79, p2 = pontoDaEscada(esc, E.rOut - 0.06); return new THREE.Vector3(p2.x, p2.y + 0.95, p2.z); }));
    add(new THREE.Mesh(new THREE.TubeGeometry(espiral, 200, 0.035, 5, false), aditivo(COR.magenta, 0.85)));
    // o vão da escada lá em cima: o anel de vidro em volta (aberto pra frente, onde ela chega) e a MANDALA no piso
    const gap = 1.1, anel = add(new THREE.Mesh(new THREE.CylinderGeometry(E.rOut + 0.15, E.rOut + 0.15, 1.0, 40, 1, true, gap / 2, Math.PI * 2 - gap), vidro), andar2); anel.position.set(E.cx, 0.5, E.cz);
    const tapete2 = add(new THREE.Mesh(new THREE.RingGeometry(E.rOut + 0.3, E.rOut + 2.2, 64), new THREE.MeshBasicMaterial({ map: tapeteMat.map, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })), andar2); tapete2.rotation.x = -Math.PI / 2; tapete2.position.set(E.cx, 0.03, E.cz); descartar.push(tapete2.material as THREE.Material);
    anim.push((dt) => { tapete2.rotation.z += dt * 0.06; });
    // os MÓVEIS do lounge e do terraço, as duas ilhas de sofá em arco (de frente pra proa) e o veludo mais claro de cima
    instanciar(moveisDoAndar2(), andar2);
    const veludo2 = lambert({ color: 0x8a5aa8, emissive: 0x2a1240, emissiveIntensity: 0.5 });
    for (const cx of [-6.2, 6.2]) sofaEmArco(cx, 3.4, 2.5, -Math.PI * 1.25 - 0.3, Math.PI * 0.25 + 0.3, andar2, veludo2);   // (aberto pra proa: a vista)
    // o BAR de cima: a prateleira de luz atrás e o letreiro de neon só de forma (sem texto)
    { const prat = add(new THREE.Mesh(new THREE.BoxGeometry(9, 2.0, 0.35), escuro), andar2); prat.position.set(0, 1.0, -25.6);
      for (const y of [1.0, 1.6]) { const tb = add(new THREE.Mesh(new THREE.BoxGeometry(9, 0.03, 0.4), aditivo(COR.magenta, 0.6)), andar2); tb.position.set(0, y, -25.4); }
      const lua = add(new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 6, 48, Math.PI * 1.4), aditivo(COR.lavanda, 0.95)), andar2); lua.position.set(0, 3.0, -25.5); lua.rotation.z = 0.9; }
    // a FOGUEIRA holográfica do terraço (chamas de luz que sobem e trocam de cor)
    { const chamas: THREE.Mesh[] = [];
      for (let k = 0; k < 7; k++) { const c = add(new THREE.Mesh(new THREE.ConeGeometry(0.28 + (k % 3) * 0.08, 1.4 + (k % 2) * 0.6, 6, 1, true).translate(0, 0.7, 0), aditivo(k % 2 ? COR.magenta : COR.ciano, 0.45)), andar2); const a = (k / 7) * Math.PI * 2; c.position.set(Math.cos(a) * 0.4, 0.36, 24 + Math.sin(a) * 0.4); chamas.push(c); }
      anim.push((_, t) => chamas.forEach((c, k) => { c.scale.y = 0.7 + 0.35 * Math.sin(t * 3.1 + k * 1.7) ** 2; c.rotation.y = t * 0.6 + k; })); }
    // o VARAL DE LUZES do terraço (da proa do lounge até o guarda-corpo, em curvas)
    { const lamp = new THREE.SphereGeometry(0.07, 6, 4), pontos: THREE.Vector3[] = [], cor: THREE.Color[] = [], paleta = [COR.magenta, COR.lavanda, COR.ciano, 0xffe6b0];
      const topo = ANDAR2.teto - 0.4, frenteLounge = ANDAR2.z + ANDAR2.b;
      for (const x of [-9, 0, 9]) { const a = new THREE.Vector3(x * 0.5, topo, frenteLounge + 0.4), b = new THREE.Vector3(x * 1.1, 1.15, 36.5 - Math.abs(x) * 0.3);
        for (let k = 1; k < 18; k++) { const u = k / 18, p = a.clone().lerp(b, u); p.y -= Math.sin(u * Math.PI) * 1.2; pontos.push(p); cor.push(new THREE.Color(paleta[(k + x) % 4 < 0 ? 0 : (k + x + 20) % 4]!)); } }
      const im = new THREE.InstancedMesh(lamp, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }), pontos.length); descartar.push(lamp, im.material as THREE.Material);
      pontos.forEach((p, i) => { mq.makeTranslation(p.x, p.y, p.z); im.setMatrixAt(i, mq); im.setColorAt(i, cor[i]!); }); add(im, andar2);
      const fios: number[] = []; for (let i = 0; i < pontos.length - 1; i++) if ((i + 1) % 17 !== 0) fios.push(pontos[i]!.x, pontos[i]!.y, pontos[i]!.z, pontos[i + 1]!.x, pontos[i + 1]!.y, pontos[i + 1]!.z);
      const fg = new THREE.BufferGeometry(); fg.setAttribute("position", new THREE.Float32BufferAttribute(fios, 3)); const fm = new THREE.LineBasicMaterial({ color: 0xb98cff, transparent: true, opacity: 0.35 }); descartar.push(fg, fm); add(new THREE.LineSegments(fg, fm), andar2); }
    // as LANTERNAS do lounge (bolhas de luz no alto, pela sala toda)
    for (let k = 0; k < (o.low ? 6 : 12); k++) { const a = k * 2.39, r = 3 + (k % 4) * 2, l = add(new THREE.Mesh(new THREE.SphereGeometry(0.1 + (k % 3) * 0.03, 10, 8), aditivo([COR.magenta, COR.lavanda, COR.ciano][k % 3]!, 0.45)), andar2); l.position.set(Math.cos(a) * r * 0.8, ANDAR2.teto - 0.8 - (k % 3) * 0.35, ANDAR2.z + Math.sin(a) * r * 1.4); }
  }

  // ── o PORTAL da popa: o buraco negro que leva pra Cidade Zaeon ──
  const bn = criarBuracoPortal(g, { x: N.portal.x, y: 0.02, z: N.portal.z, anelR: N.portal.r, h: 3.2, r: 1.1, low: o.low, cor: COR.lavanda });
  anim.push((dt, t) => bn.atualizar(dt, t)); descartar.push(bn);

  return {
    group: g,
    atualizar(dt, t) { for (const f of anim) f(dt, t); },
    mostrarTeto(v) { teto.visible = v; },
    mostrarAndar2(v) { andar2.visible = v; },
    dispose() { g.traverse((x) => { if ((x as THREE.Mesh).isMesh) (x as THREE.Mesh).geometry?.dispose(); }); for (const d of descartar) d.dispose(); g.removeFromParent(); },
  };
}
