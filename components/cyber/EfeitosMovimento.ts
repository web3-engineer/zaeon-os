/**
 * EfeitosMovimento — o que se VÊ do movimento turbinado (lib/cyber/movimento): os RISCOS DE VENTO (varetas finas de
 * luz que saem do corpo e ficam pra trás — sprint e dash), o ECO leve da silhueta no dash e a ONDA DE CHOQUE do impacto (um anel de luz que se abre no chão
 * no pouso forte e no dash que bate) e os RAIOS ROXOS que saem da espada nos golpes. Pool fixo (16 ecos, 40 riscos, 4 ondas), aditivo, sem sombra — custo ~zero parado.
 */
import * as THREE from "three";

export type EfeitosMovimentoHandle = {
  /** um fantasma do corpo em `p` (os pés), virado pra `rumo`, na `cor` */
  fantasma(p: THREE.Vector3, rumo: number, cor: THREE.ColorRepresentation, forca?: number): void;
  /** RISCOS DE VENTO (estilo anime): `n` riscos finos saindo do corpo em `p` (os pés) e ficando pra trás na direção
   *  oposta a `dir` (unitária, no plano) — a velocidade sem esconder o corpo */
  vento(p: THREE.Vector3, dir: { x: number; z: number }, cor: THREE.ColorRepresentation, n: number, comp?: number): void;
  /** o RASTRO DA LÂMINA no golpe: a faixa de luz entre o cabo (`base`) e a ponta, nos últimos ~0,12 s — `ativo` = está
   *  cortando agora (chame todo quadro: parado, o rastro só envelhece e some) */
  rastroLamina(base: THREE.Vector3, ponta: THREE.Vector3, ativo: boolean, dt: number): void;
  /** RAIOS ROXOS saindo da lâmina (entre `base` e `ponta`): `quantos` raios novos agora (cada um pisca ~0,08 s e some);
   *  chame todo quadro (com 0, eles só envelhecem). `chao` = um raio grande descendo da ponta até o chão (o golpe pesado) */
  raios(base: THREE.Vector3, ponta: THREE.Vector3, quantos: number, dt: number, chao?: THREE.Vector3): void;
  /** uma onda de choque no chão em `p`, força 0..1 */
  onda(p: THREE.Vector3, forca: number): void;
  atualizar(dt: number): void;
  dispose(): void;
};

const VIDA_FANTASMA = 0.32, VIDA_ONDA = 0.55;

export function criarEfeitosMovimento(cena: THREE.Object3D): EfeitosMovimentoHandle {
  const g = new THREE.Group(); g.name = "efeitos-movimento"; cena.add(g);
  // o fantasma: um ECO leve da silhueta (cápsula estreita, bem transparente — o corpo continua aparecendo)
  const geoF = new THREE.CapsuleGeometry(0.22, 1.15, 4, 10); geoF.translate(0, 0.85, 0);
  // o RISCO de vento: uma vareta fina de luz (1 m no eixo z; a escala estica) — vista de qualquer ângulo
  const geoV = new THREE.BoxGeometry(0.022, 0.022, 1); geoV.translate(0, 0, -0.5);
  const riscos = Array.from({ length: 40 }, () => {
    const m = new THREE.Mesh(geoV, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.visible = false; m.frustumCulled = false; g.add(m); return { m, vida: 0, dur: 0.25, comp: 2 };
  });
  let iV = 0, semente = 1;
  const acaso = () => { semente = (semente * 16807) % 2147483647; return semente / 2147483647; };
  const fantasmas = Array.from({ length: 16 }, () => {
    const m = new THREE.Mesh(geoF, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.visible = false; m.frustumCulled = false; g.add(m); return { m, vida: 0, forca: 1 };
  });
  const geoO = new THREE.RingGeometry(0.82, 1, 56); geoO.rotateX(-Math.PI / 2);
  const ondas = Array.from({ length: 4 }, () => {
    const m = new THREE.Mesh(geoO, new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.visible = false; m.frustumCulled = false; g.add(m); return { m, vida: 0, forca: 0 };
  });
  let iF = 0, iO = 0;
  // o RASTRO DA LÂMINA: uma fita (pares base/ponta) com o alfa caindo com a idade (aditiva: alfa = cor escurecida)
  const MAXR = 18, VIDA_RASTRO = 0.1, amostras: { b: THREE.Vector3; p: THREE.Vector3; idade: number }[] = [];
  const geoR = new THREE.BufferGeometry(), posR = new Float32Array(MAXR * 2 * 3), corR = new Float32Array(MAXR * 2 * 3), idxR: number[] = [];
  for (let i = 0; i < MAXR - 1; i++) { const a = i * 2; idxR.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  geoR.setIndex(idxR); geoR.setAttribute("position", new THREE.BufferAttribute(posR, 3)); geoR.setAttribute("color", new THREE.BufferAttribute(corR, 3));
  const fita = new THREE.Mesh(geoR, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  fita.frustumCulled = false; fita.visible = false; g.add(fita);
  const corFita = new THREE.Color(0x35ffd0), branco = new THREE.Color(0xd8fff6);
  // os RAIOS ROXOS: cada raio é um zigue-zague de 6 trechos; cada trecho, uma vareta fina (instanciada) — o NÚCLEO claro
  // e o HALO roxo mais grosso por fora (duas malhas instanciadas, ~2 draw calls pra todos os raios)
  const MAX_RAIOS = 26, TRECHOS = 6, geoSeg = new THREE.BoxGeometry(1, 1, 1); geoSeg.translate(0, 0, 0.5);
  const nucleo = new THREE.InstancedMesh(geoSeg, new THREE.MeshBasicMaterial({ color: 0xf0d8ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), MAX_RAIOS * TRECHOS);
  const halo = new THREE.InstancedMesh(geoSeg, new THREE.MeshBasicMaterial({ color: 0x9b3dff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }), MAX_RAIOS * TRECHOS);
  for (const m of [nucleo, halo]) { m.count = 0; m.frustumCulled = false; g.add(m); }
  const raiosVivos: { pts: THREE.Vector3[]; vida: number; dur: number; grosso: number }[] = [];
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vD = new THREE.Vector3(), lado1 = new THREE.Vector3(), lado2 = new THREE.Vector3(), mS = new THREE.Matrix4(), qS = new THREE.Quaternion(), eZ = new THREE.Vector3(0, 0, 1), escS = new THREE.Vector3();
  /** um raio de `de` até `ate`, tremido de lado (zigue-zague) */
  const novoRaio = (de: THREE.Vector3, ate: THREE.Vector3, grosso: number, dur: number) => {
    if (raiosVivos.length >= MAX_RAIOS) raiosVivos.shift();
    vD.copy(ate).sub(de); const L = vD.length(); vD.normalize();
    lado1.set(-vD.z, 0, vD.x); if (lado1.lengthSq() < 1e-4) lado1.set(1, 0, 0); lado1.normalize(); lado2.crossVectors(vD, lado1).normalize();
    const pts = [de.clone()];
    for (let k = 1; k < TRECHOS; k++) { const f = k / TRECHOS, a = (acaso() - 0.5) * L * 0.35, b = (acaso() - 0.5) * L * 0.35; pts.push(de.clone().addScaledVector(vD, L * f).addScaledVector(lado1, a).addScaledVector(lado2, b)); }
    pts.push(ate.clone());
    raiosVivos.push({ pts, vida: dur, dur, grosso });
  };
  return {
    fantasma(p, rumo, cor, forca = 1) {
      const f = fantasmas[iF++ % fantasmas.length]!;
      f.m.position.copy(p); f.m.rotation.y = rumo; (f.m.material as THREE.MeshBasicMaterial).color.set(cor); f.vida = VIDA_FANTASMA; f.forca = forca; f.m.visible = true;
    },
    vento(p, dir, cor, n, comp = 2.2) {
      const lx = -dir.z, lz = dir.x;   // o lado
      for (let k = 0; k < n; k++) {
        const r = riscos[iV++ % riscos.length]!, h = 0.25 + acaso() * 1.55, lado = (acaso() - 0.5) * 1.1;
        r.m.position.set(p.x + lx * lado - dir.x * 0.2, p.y + h, p.z + lz * lado - dir.z * 0.2);
        r.m.rotation.set(0, Math.atan2(dir.x, dir.z), 0);   // o −z local (pra onde a vareta cresce) fica pra TRÁS
        (r.m.material as THREE.MeshBasicMaterial).color.set(cor).lerp(new THREE.Color(0xffffff), 0.55);
        r.dur = 0.18 + acaso() * 0.14; r.vida = r.dur; r.comp = comp * (0.6 + acaso() * 0.8); r.m.visible = true;
      }
    },
    rastroLamina(base, ponta, ativo, dt) {
      for (const a of amostras) a.idade += dt;
      while (amostras.length && amostras[0]!.idade > VIDA_RASTRO) amostras.shift();
      if (ativo) { amostras.push({ b: base.clone(), p: ponta.clone(), idade: 0 }); if (amostras.length > MAXR) amostras.shift(); }
      const n = amostras.length; fita.visible = n >= 2;
      if (n < 2) return;
      for (let i = 0; i < n; i++) {
        const a = amostras[i]!, k = 1 - a.idade / VIDA_RASTRO, j = i * 6;
        posR.set([a.b.x, a.b.y, a.b.z, a.p.x, a.p.y, a.p.z], j);
        const cb = corFita.clone().multiplyScalar(0), cp = corFita.clone().lerp(branco, 0.35 * k).multiplyScalar(0.3 * k * k);   // (some pra dentro; o fio da ponta mais aceso)
        corR.set([cb.r, cb.g, cb.b, cp.r, cp.g, cp.b], j);
      }
      geoR.setDrawRange(0, (n - 1) * 6); geoR.attributes.position!.needsUpdate = true; geoR.attributes.color!.needsUpdate = true;
    },
    raios(base, ponta, quantos, dt, chao) {
      for (const r of raiosVivos) r.vida -= dt;
      for (let i = raiosVivos.length - 1; i >= 0; i--) if (raiosVivos[i]!.vida <= 0) raiosVivos.splice(i, 1);
      for (let k = 0; k < quantos; k++) {
        const de = vA.copy(base).lerp(ponta, 0.15 + acaso() * 0.85);   // de um ponto qualquer da lâmina…
        const L = 0.5 + acaso() * 1.4, dir = vB.set(acaso() - 0.5, acaso() - 0.35, acaso() - 0.5).normalize();   // …pra fora, num rumo qualquer
        novoRaio(de, de.clone().addScaledVector(dir, L), 1, 0.05 + acaso() * 0.06);
      }
      if (chao) for (let k = 0; k < 3; k++) novoRaio(ponta, chao.clone().add(vB.set((acaso() - 0.5) * 1.5, 0, (acaso() - 0.5) * 1.5)), 1.8, 0.12 + acaso() * 0.08);
      let i = 0;
      for (const r of raiosVivos) {
        const k = r.vida / r.dur, piscar = acaso() < 0.25 ? 0.4 : 1;   // (raio PISCA)
        for (let j = 0; j < r.pts.length - 1 && i < MAX_RAIOS * TRECHOS; j++, i++) {
          const a = r.pts[j]!, b = r.pts[j + 1]!; vD.copy(b).sub(a); const L = vD.length(); vD.normalize();
          qS.setFromUnitVectors(eZ, vD);
          mS.compose(a, qS, escS.set(0.014 * r.grosso * k * piscar, 0.014 * r.grosso * k * piscar, L)); nucleo.setMatrixAt(i, mS);
          mS.compose(a, qS, escS.set(0.07 * r.grosso * k, 0.07 * r.grosso * k, L)); halo.setMatrixAt(i, mS);
        }
      }
      nucleo.count = halo.count = i;
      if (i) { nucleo.instanceMatrix.needsUpdate = true; halo.instanceMatrix.needsUpdate = true; }
    },
    onda(p, forca) {
      const o = ondas[iO++ % ondas.length]!;
      o.m.position.set(p.x, p.y + 0.06, p.z); o.vida = VIDA_ONDA; o.forca = Math.max(0.2, Math.min(1, forca)); o.m.visible = true;
    },
    atualizar(dt) {
      for (const f of fantasmas) {
        if (!f.m.visible) continue;
        f.vida -= dt; if (f.vida <= 0) { f.m.visible = false; continue; }
        const k = f.vida / VIDA_FANTASMA; (f.m.material as THREE.MeshBasicMaterial).opacity = 0.16 * f.forca * k * k; f.m.scale.set(1 + (1 - k) * 0.25, 1, 1 + (1 - k) * 0.25);
      }
      for (const r of riscos) {
        if (!r.m.visible) continue;
        r.vida -= dt; if (r.vida <= 0) { r.m.visible = false; continue; }
        const u = 1 - r.vida / r.dur;   // nasce curto, estica e some
        r.m.scale.set(1, 1, r.comp * (0.35 + 0.65 * Math.min(1, u * 2.5))); (r.m.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - u) * Math.min(1, u * 6);
      }
      for (const o of ondas) {
        if (!o.m.visible) continue;
        o.vida -= dt; if (o.vida <= 0) { o.m.visible = false; continue; }
        const u = 1 - o.vida / VIDA_ONDA, r = 0.6 + u * (3 + 7 * o.forca);
        o.m.scale.setScalar(r); (o.m.material as THREE.MeshBasicMaterial).opacity = 0.85 * o.forca * (1 - u) * (1 - u);
      }
    },
    dispose() {
      for (const f of fantasmas) (f.m.material as THREE.Material).dispose();
      for (const r of riscos) (r.m.material as THREE.Material).dispose(); geoV.dispose();
      geoR.dispose(); (fita.material as THREE.Material).dispose();
      geoSeg.dispose(); (nucleo.material as THREE.Material).dispose(); (halo.material as THREE.Material).dispose(); nucleo.dispose(); halo.dispose();
      for (const o of ondas) (o.m.material as THREE.Material).dispose();
      geoF.dispose(); geoO.dispose(); g.removeFromParent();
    },
  };
}
