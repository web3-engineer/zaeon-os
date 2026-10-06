/**
 * InteriorNave — o CONVÉS da nave-QG, em metros (o grupo é posto pela Nave no nível do convés). LEVE: só o que é
 * computador e motor — em cima, a CABINE DE COMANDO (console curvo com telas, a cadeira do piloto = `assento`, o
 * MEU DESKTOP e um console lateral); embaixo, os cômodos vazios (paredes com friso de luz), a SALA DO MOTOR (o reator
 * pulsando + o painel dele), a escada em caracol e o túnel até a porta de trás, com a RAMPA (a inclinação acompanha
 * onde a nave está: passarela na doca, até o chão pousada, guarda-corpo no fim pairando).
 */
import * as THREE from "three";
import { CABINE, COMODOS, ESCADA, MOVEIS_CABINE, MOVEIS_NAVE, NAVE_QG, REATOR, TOTAL_ESCADA, paredesDaCabine, paredesDaNave, pontoDaEscada, type MovelNave } from "@/lib/cyber/naveQG";

export type InteriorNaveHandle = { group: THREE.Group; assento: THREE.Object3D; atualizar(dt: number, t: number, voo: number): void; rampa(queda: number, fimFechado: boolean): void };

const COR_COMODO: Record<string, number> = { hall: 0x6fb6ff, reunioes: 0x5a8cff, corredor: 0x6fb6ff, estar: 0x7fa8ff, servidores: 0x5a8cff, banheiro: 0x9fd0ff, motor: 0xff7a4a };   // tudo azulado (o motor, o laranja do reator)

export function criarInteriorNave(o: { low: boolean; cor: THREE.Color }): InteriorNaveHandle {
  const g = new THREE.Group(), anim: ((dt: number, t: number, voo: number) => void)[] = [];
  const add = <T extends THREE.Object3D>(x: T) => { g.add(x); return x; };
  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => { const m = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)); m.position.set(x, y, z); return m; };
  const aditivo = (c: THREE.ColorRepresentation, op: number) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const metal = new THREE.MeshStandardMaterial({ color: 0x2a3440, roughness: 0.35, metalness: 0.75, emissive: 0x0b1530, emissiveIntensity: 0.5 });
  const escuro = new THREE.MeshStandardMaterial({ color: 0x10161d, roughness: 0.5, metalness: 0.7 });
  const estofado = new THREE.MeshStandardMaterial({ color: 0x23324a, roughness: 0.8, emissive: 0x0e1626, emissiveIntensity: 0.4 });
  const couro = new THREE.MeshStandardMaterial({ color: 0x6a4a2e, roughness: 0.6, emissive: 0x24140a, emissiveIntensity: 0.35 });
  const branco = new THREE.MeshStandardMaterial({ color: 0xe8eef5, roughness: 0.25, metalness: 0.2, emissive: 0x2a3440, emissiveIntensity: 0.3 });
  const vidro = new THREE.MeshStandardMaterial({ color: 0x9fe8ff, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide });
  const tela = (cor: string, linhas = 6) => { const c = document.createElement("canvas"); c.width = 256; c.height = 160; const x = c.getContext("2d")!; const gr = x.createLinearGradient(0, 0, 256, 160); gr.addColorStop(0, "#04121c"); gr.addColorStop(1, "#0a2230"); x.fillStyle = gr; x.fillRect(0, 0, 256, 160); x.fillStyle = cor; x.fillRect(10, 10, 236, 10); x.globalAlpha = 0.75; for (let i = 0; i < linhas; i++) x.fillRect(14, 34 + i * 18, 40 + ((i * 53) % 150), 6); x.globalAlpha = 1; x.strokeStyle = cor; x.lineWidth = 3; x.strokeRect(170, 36, 70, 100); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

  // ── PISO do convés (disco) com veios de luz + o tingido de cada cômodo ──
  const piso = add(new THREE.Mesh(new THREE.CircleGeometry(NAVE_QG.interiorR + 1.2, o.low ? 40 : 72), new THREE.MeshStandardMaterial({ color: 0x1a222c, roughness: 0.55, metalness: 0.5, emissive: 0x0a1226, emissiveIntensity: 0.5 })));
  piso.rotation.x = -Math.PI / 2; piso.position.y = 0.01;
  for (const c of COMODOS) {
    const p = add(new THREE.Mesh(new THREE.PlaneGeometry(c.x1 - c.x0 - 0.4, c.z1 - c.z0 - 0.4), new THREE.MeshStandardMaterial({ color: 0x141c26, roughness: 0.4, metalness: 0.4, emissive: COR_COMODO[c.id] ?? 0x66e6ff, emissiveIntensity: 0.07 })));
    p.rotation.x = -Math.PI / 2; p.position.set((c.x0 + c.x1) / 2, 0.02, (c.z0 + c.z1) / 2);
  }
  const fitaMat = aditivo(0x6fb6ff, 0.7);
  const cor_ = COMODOS.find((c) => c.id === "corredor")!;
  const fita = add(new THREE.Mesh(new THREE.PlaneGeometry(0.18, cor_.z1 - cor_.z0), fitaMat)); fita.rotation.x = -Math.PI / 2; fita.position.set(0, 0.03, (cor_.z0 + cor_.z1) / 2);   // luz no meio do corredor
  anim.push((_, t) => { fitaMat.opacity = 0.45 + 0.25 * Math.sin(t * 1.4); });

  // ── PAREDES (as da colisão) com friso de luz no alto ──
  const frisoMat = aditivo(o.cor.clone().lerp(new THREE.Color(0x6fb6ff), 0.5), 0.8);
  for (const w of paredesDaNave()) {
    const L = Math.hypot(w.bx - w.ax, w.bz - w.az), giro = -Math.atan2(w.bz - w.az, w.bx - w.ax), cx = (w.ax + w.bx) / 2, cz = (w.az + w.bz) / 2;
    const pm = box(L + 0.25, w.alt, w.esp, metal, cx, w.alt / 2, cz); pm.rotation.y = giro;
    const f = box(L, 0.06, w.esp + 0.04, frisoMat, cx, w.alt - 0.1, cz); f.rotation.y = giro;
  }

  // ── MÓVEIS (os retângulos da colisão) com acabamento por tipo ──
  const corpoDe: Partial<Record<MovelNave["tipo"], THREE.Material>> = { console: escuro, terminal: escuro, sofa: estofado, poltrona: couro, mesinha: vidro, bar: couro, rack: escuro, vaso: branco, pia: branco, painel: escuro, mesa: couro };
  for (const m of MOVEIS_NAVE) {
    const cx = (m.x0 + m.x1) / 2, cz = (m.z0 + m.z1) / 2, lx = m.x1 - m.x0, lz = m.z1 - m.z0, mat = corpoDe[m.tipo];
    if (mat) box(lx, m.alt, lz, mat, cx, m.alt / 2, cz);
    if (m.tipo === "sofa") { if (lz > lx) box(0.25, 0.5, lz, estofado, m.x0 + 0.12, m.alt + 0.25, cz); else box(lx, 0.5, 0.25, estofado, cx, m.alt + 0.25, m.z1 - 0.12); }   // encosto do lado da parede
    if (m.tipo === "chuveiro") { box(lx, m.alt, lz, vidro, cx, m.alt / 2, cz); const ch = add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 16), branco)); ch.position.set(cx, m.alt - 0.15, cz); }
    if (m.tipo === "pia") { const esp = add(new THREE.Mesh(new THREE.PlaneGeometry(lx - 0.4, 1.1), new THREE.MeshStandardMaterial({ color: 0xcfe9ff, roughness: 0.02, metalness: 1 }))); esp.position.set(cx, 1.7, m.z0 - 0.04); }
    if (m.tipo === "vaso") box(lx, 0.9, 0.25, branco, cx, 0.9, m.z0 + 0.12);
  }
  // ── a CABINE DE COMANDO, em cima (mezanino embaixo da redoma): piso com o vão da escada, guarda-corpos de vidro,
  //    o console curvo, a cadeira do piloto (`assento`), o TERMINAL DE ESTUDOS ──
  const cab = new THREE.Group(); cab.position.y = NAVE_QG.cabine; g.add(cab);
  const cbox = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); cab.add(m); return m; };
  const C = CABINE, E = ESCADA, pisoCab = new THREE.MeshStandardMaterial({ color: 0x1c2632, roughness: 0.4, metalness: 0.6, emissive: 0x0a1430, emissiveIntensity: 0.6 });
  // o piso: uma placa com o furo redondo da escada em caracol + o guarda-corpo redondo do vão (aberto na saída do topo)
  const forma = new THREE.Shape(); forma.moveTo(C.x0, -C.z0); forma.lineTo(C.x1, -C.z0); forma.lineTo(C.x1, -C.z1); forma.lineTo(C.x0, -C.z1); forma.closePath();
  const furo = new THREE.Path(); furo.absarc(E.cx, -E.cz, E.rOut, 0, Math.PI * 2, true); forma.holes.push(furo);
  const placa = new THREE.Mesh(new THREE.ExtrudeGeometry(forma, { depth: 0.25, bevelEnabled: false, curveSegments: 32 }), pisoCab); placa.rotation.x = -Math.PI / 2; placa.position.y = -0.25; cab.add(placa);
  const aTopo = Math.atan2(-E.cz, -E.cx) + TOTAL_ESCADA, gapT = Math.PI / 2 - aTopo;
  const anelVao = new THREE.Mesh(new THREE.CylinderGeometry(E.rOut, E.rOut, 1.1, 40, 1, true, gapT + 0.5, Math.PI * 2 - 1.0), vidro); anelVao.position.set(E.cx, 0.55, E.cz); cab.add(anelVao);
  const corrimaoVao = new THREE.Mesh(new THREE.TorusGeometry(E.rOut, 0.04, 6, 40, Math.PI * 2 - 1.0), frisoMat); corrimaoVao.rotation.x = Math.PI / 2; corrimaoVao.rotation.z = aTopo + 0.5; corrimaoVao.position.set(E.cx, 1.1, E.cz); cab.add(corrimaoVao);
  for (const w of paredesDaCabine()) {   // guarda-corpos de vidro com corrimão aceso
    const L2 = Math.hypot(w.bx - w.ax, w.bz - w.az), giro = -Math.atan2(w.bz - w.az, w.bx - w.ax), cx = (w.ax + w.bx) / 2, cz = (w.az + w.bz) / 2;
    cbox(L2, w.alt, 0.06, vidro, cx, w.alt / 2, cz).rotation.y = giro; cbox(L2, 0.06, 0.1, frisoMat, cx, w.alt, cz).rotation.y = giro;
  }
  for (const mv of MOVEIS_CABINE) if (mv.tipo !== "leme") cbox(mv.x1 - mv.x0, mv.alt, mv.z1 - mv.z0, escuro, (mv.x0 + mv.x1) / 2, mv.alt / 2, (mv.z0 + mv.z1) / 2);
  const telaProa = tela("#66e6ff"), telaTerm = tela("#9affd0", 8), telaServ = tela("#b98cff");
  const proa = MOVEIS_CABINE.find((m) => m.tipo === "console")!, pcx = (proa.x0 + proa.x1) / 2;
  for (const [x, ry] of [[-2.2, 0.35], [0, 0], [2.2, -0.35]] as const) { const t = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.1), new THREE.MeshBasicMaterial({ map: telaProa })); t.position.set(pcx + x, 1.85, proa.z0 + 0.2); t.rotation.set(-0.35, Math.PI + ry, 0); cab.add(t); }
  /** uma tela sobre um console, virada pro meio da cabine (onde se fica pra usar) */
  const virarPraCabine = (t: THREE.Mesh, m: MovelNave) => { const cx = (m.x0 + m.x1) / 2, cz = (m.z0 + m.z1) / 2, d = Math.hypot(cx, cz) || 1; t.position.set(cx - (cx / d) * 0.3, m.alt + 0.6, cz - (cz / d) * 0.3); t.rotation.set(0, Math.atan2(-cx, -cz), 0); t.rotateX(-0.3); cab.add(t); };
  // o MEU DESKTOP (a estação de estudos — F abre o laboratório): mesa, monitor grande + dois laterais e a cadeira
  const term = MOVEIS_CABINE.find((m) => m.tipo === "terminal")!, tcx = (term.x0 + term.x1) / 2, tcz = (term.z0 + term.z1) / 2;
  const mesa = new THREE.Group(); mesa.position.set(tcx, 0, tcz); mesa.rotation.y = Math.atan2(-tcx, -tcz); cab.add(mesa);   // a frente da mesa (+z dela) virada pro meio da cabine
  const tTerm = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.1), new THREE.MeshBasicMaterial({ map: telaTerm })); tTerm.position.set(0, term.alt + 0.85, -0.25); mesa.add(tTerm);
  for (const sd of [-1, 1]) { const lt = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.95), new THREE.MeshBasicMaterial({ map: telaProa })); lt.position.set(sd * 1.5, term.alt + 0.8, -0.05); lt.rotation.y = -sd * 0.45; mesa.add(lt); }
  const moldura = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 0.05), escuro); moldura.position.set(0, term.alt + 0.85, -0.29); mesa.add(moldura);
  const teclado = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.3), escuro); teclado.position.set(0, term.alt + 0.02, 0.15); mesa.add(teclado);
  const cadeiraD = new THREE.Group(); cadeiraD.position.set(0, 0, 1.2); mesa.add(cadeiraD);
  for (const [w, h, d, y, z] of [[0.6, 0.12, 0.6, 0.5, 0], [0.6, 0.8, 0.1, 0.95, 0.28], [0.12, 0.45, 0.12, 0.22, 0]] as const) { const pc = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), estofado); pc.position.set(0, y, z); cadeiraD.add(pc); }
  const auraTerm = aditivo(0x9fd0ff, 0.25), aura = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), auraTerm); aura.position.set(0, term.alt + 0.85, -0.27); mesa.add(aura);
  anim.push((_, t) => { auraTerm.opacity = 0.15 + 0.12 * Math.sin(t * 2); });
  const sb = MOVEIS_CABINE.filter((m) => m.tipo === "console")[1]!, tSb = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshBasicMaterial({ map: telaServ })); virarPraCabine(tSb, sb);
  // a CADEIRA DO PILOTO (o leme): pedestal, assento, encosto alto, braços com manches — o avatar senta no `assento`
  const L = NAVE_QG.leme;
  cbox(0.5, 0.45, 0.5, escuro, L.x, 0.22, L.z);
  cbox(0.75, 0.14, 0.7, estofado, L.x, 0.5, L.z);
  const enc = cbox(0.75, 1.1, 0.14, estofado, L.x, 1.05, L.z - 0.35); enc.rotation.x = -0.15;
  for (const sd of [-1, 1]) { cbox(0.1, 0.1, 0.6, estofado, L.x + sd * 0.42, 0.75, L.z); cbox(0.06, 0.28, 0.06, escuro, L.x + sd * 0.42, 0.95, L.z + 0.25); }
  const assento = new THREE.Object3D(); assento.position.set(L.x, 0, L.z); cab.add(assento);
  // a ESCADA EM CARACOL (do hall até a cabine): coluna central, degraus girando e o corrimão de luz em espiral
  const H = NAVE_QG.cabine, nDeg = 64, larg = E.rOut - E.rIn;
  const coluna = add(new THREE.Mesh(new THREE.CylinderGeometry(E.rIn, E.rIn, H + 1.2, 16), metal)); coluna.position.set(E.cx, (H + 1.2) / 2, E.cz);
  const degraus = new THREE.InstancedMesh(new THREE.BoxGeometry(larg, 0.12, 0.62), metal, nDeg), mq = new THREE.Matrix4();
  for (let k = 0; k < nDeg; k++) {
    const esc = (TOTAL_ESCADA * (k + 0.5)) / nDeg, p2 = pontoDaEscada(esc), a = Math.atan2(-E.cz, -E.cx) + esc;
    mq.compose(new THREE.Vector3(p2.x, (H * (k + 1)) / nDeg - 0.06, p2.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a), new THREE.Vector3(1, 1, 1));
    degraus.setMatrixAt(k, mq);
  }
  degraus.instanceMatrix.needsUpdate = true; degraus.computeBoundingSphere(); add(degraus);
  const espiral = new THREE.CatmullRomCurve3(Array.from({ length: 60 }, (_, k) => { const esc = (TOTAL_ESCADA * k) / 59, p2 = pontoDaEscada(esc, E.rOut - 0.08); return new THREE.Vector3(p2.x, (H * k) / 59 + 1.0, p2.z); }));
  add(new THREE.Mesh(new THREE.TubeGeometry(espiral, 120, 0.04, 6, false), frisoMat));
  // SALA DO MOTOR: o reator (núcleo pulsando + anéis girando), canos até as paredes
  const nucleoMat = aditivo(0xff9a4a, 0.85), nucleo = add(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 2.6, 24), nucleoMat)); nucleo.position.set(REATOR.x, 1.5, REATOR.z);
  const casca = add(new THREE.Mesh(new THREE.CylinderGeometry(REATOR.r, REATOR.r, 3.1, 24, 1, true), vidro)); casca.position.set(REATOR.x, 1.55, REATOR.z);
  box(REATOR.r * 2 + 0.3, 0.35, REATOR.r * 2 + 0.3, escuro, REATOR.x, 0.17, REATOR.z);
  const aneis = [0, 1, 2].map((k) => { const a = add(new THREE.Mesh(new THREE.TorusGeometry(REATOR.r - 0.2, 0.06, 6, 40), aditivo(0xffc46b, 0.8))); a.position.set(REATOR.x, 0.7 + k * 0.85, REATOR.z); a.rotation.x = Math.PI / 2; return a; });
  for (const [dx, dz] of [[1, 0], [0, -1], [-0.7, -0.7]] as const) { const cano = add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 3, 10), metal)); cano.rotation.z = Math.PI / 2; cano.rotation.y = Math.atan2(dz, dx); cano.position.set(REATOR.x + dx * 3, 2.7, REATOR.z + dz * 3); }
  anim.push((dt, t, voo) => { nucleoMat.opacity = 0.55 + 0.3 * Math.sin(t * (2 + voo * 3)); aneis.forEach((a, k) => { a.rotation.z += dt * (0.5 + voo * 2) * (k % 2 ? -1 : 1); }); });
  // TÚNEL da porta de trás (do corredor até o casco) e a RAMPA (desce até o chão com a nave pousada)
  const zCasco = -NAVE_QG.cascoNoConves, zPorta = cor_.z0;
  box(2.8, 0.12, zPorta - zCasco, metal, 0, -0.06, (zPorta + zCasco) / 2);   // o túnel até o casco
  const portaMat = aditivo(0x6fb6ff, 0.55), porta = add(new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3), portaMat)); porta.position.set(0, 1.5, zPorta - 0.05);
  anim.push((_, t) => { portaMat.opacity = 0.3 + 0.2 * Math.sin(t * 2.2); });
  // a rampa: a inclinação acompanha onde a nave está (passarela plana na doca, até o chão pousada) — `rampa(queda)`
  const rampa = new THREE.Group(); rampa.position.set(0, 0, zCasco); g.add(rampa);
  const horiz = -NAVE_QG.saida.z + zCasco, pivo = new THREE.Group(); rampa.add(pivo);   // pivo: gira (inclinação) e estica (comprimento) a prancha e os corrimãos
  const prancha = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 1), metal); prancha.geometry.translate(0, 0, -0.5); pivo.add(prancha);
  const luzMat = aditivo(0x6fb6ff, 0.8);
  for (const sd of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 1), luzMat); l.geometry.translate(sd * 1.55, 0.09, -0.5); pivo.add(l);
    const vid = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 1), vidro); vid.geometry.translate(sd * 1.55, 0.58, -0.5); pivo.add(vid);   // o corrimão de vidro
    const cr = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 1), frisoMat); cr.geometry.translate(sd * 1.55, 1.1, -0.5); pivo.add(cr);
  }
  const fim = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 0.05), vidro); rampa.add(fim);   // o guarda-corpo do fim (pairando no ar)
  let queda = NAVE_QG.deck, fimFechado = true;
  const montarRampa = () => { const inc = Math.atan2(queda, horiz), comp = Math.hypot(queda, horiz); pivo.rotation.x = -inc; pivo.scale.z = comp; fim.position.set(0, -queda + 0.58, -horiz); fim.visible = fimFechado; };
  montarRampa();
  anim.push((_, __, voo) => { rampa.visible = voo < 0.5; rampa.scale.z = Math.max(0.01, 1 - voo * 2); });
  // luz do convés
  if (!o.low) { const luz = new THREE.PointLight(0xcfe9ff, 1.4, NAVE_QG.interiorR * 2); luz.position.set(0, 4, 0); g.add(luz); }

  return { group: g, assento, atualizar(dt, t, voo) { for (const f of anim) f(dt, t, voo); },
    rampa(q, f) { if (Math.abs(q - queda) < 0.01 && f === fimFechado) return; queda = q; fimFechado = f; montarRampa(); } };
}
