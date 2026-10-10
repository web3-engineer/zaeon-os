import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { fundirEstaticos } from "./lotes";
import { criarMoto } from "./Moto";

const caixa = (mat: THREE.Material, x: number, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat); m.position.set(x, y, z); return m; };
const malhas = (r: THREE.Object3D) => { const out: THREE.Mesh[] = []; r.traverse((n) => { if ((n as THREE.Mesh).isMesh) out.push(n as THREE.Mesh); }); return out; };
const pos = (r: THREE.Object3D) => { const p: number[] = []; r.updateMatrixWorld(true); for (const m of malhas(r)) { const a = m.geometry.attributes.position!, v = new THREE.Vector3(); for (let i = 0; i < a.count; i++) { v.fromBufferAttribute(a, i).applyMatrix4(m.matrixWorld); p.push(+v.x.toFixed(4), +v.y.toFixed(4), +v.z.toFixed(4)); } } return p.sort((a, b) => a - b); };

describe("lotes estáticos (o StaticBatch do CS Brasil)", () => {
  it("peças paradas com o mesmo material viram UM mesh — e no mesmo lugar do mundo", () => {
    const raiz = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    for (let i = 0; i < 5; i++) raiz.add(caixa(mat, i * 2, 0.5, -1));
    raiz.position.set(10, 3, 7); raiz.rotation.y = 0.7;
    const antes = pos(raiz);
    const r = fundirEstaticos(raiz);
    expect(r).toMatchObject({ antes: 5, lotes: 1 });
    expect(malhas(raiz)).toHaveLength(1);
    expect(pos(raiz)).toEqual(antes);
  });
  it("materiais IGUAIS (objetos diferentes) também juntam; um que muda na simulação fica com a peça dele", () => {
    const raiz = new THREE.Group(), pisca = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true });
    for (let i = 0; i < 4; i++) raiz.add(caixa(new THREE.MeshBasicMaterial({ color: 0x00ff00 }), i * 2));
    raiz.add(caixa(pisca, 20), caixa(pisca, 22));
    fundirEstaticos(raiz, { passo: (_, t) => { pisca.opacity = 0.5 + 0.5 * Math.sin(t); } });
    const ms = malhas(raiz);
    expect(ms).toHaveLength(2);   // as 4 verdes num lote; as 2 que piscam (mesmo material) noutro — e seguem piscando
    expect(ms.some((m) => m.material === pisca)).toBe(true);
  });
  it("o que se mexe fica de fora; as peças paradas DENTRO de um grupo que se mexe viram lote dentro dele", () => {
    const raiz = new THREE.Group(), mat = new THREE.MeshBasicMaterial(), corpo = new THREE.Group(); raiz.add(corpo);
    const roda = caixa(mat, 5); raiz.add(roda, caixa(mat, 7));
    corpo.add(caixa(mat, 0), caixa(mat, 1), caixa(mat, 2));
    fundirEstaticos(raiz, { passo: (_, t) => { corpo.rotation.z = Math.sin(t); roda.rotation.x = t; } });
    expect(corpo.children).toHaveLength(1);   // as 3 do corpo → 1 lote, filho do corpo (continua inclinando junto)
    expect(roda.parent).toBe(raiz);            // a roda gira: intocada
    corpo.rotation.z = 0.4; raiz.updateMatrixWorld(true);
    const lote = corpo.children[0] as THREE.Mesh; lote.geometry.computeBoundingBox();
    expect(lote.geometry.boundingBox!.max.x + lote.position.x).toBeCloseTo(2.5, 5);   // no referencial do corpo
  });
  it("respeita `manter` (alvos de clique), grupos escondidos (o engine liga) e o que pisca de visibilidade", () => {
    const raiz = new THREE.Group(), mat = new THREE.MeshBasicMaterial(), dentro = new THREE.Group(); dentro.visible = false; raiz.add(dentro);
    const alvo = caixa(mat, 0), some = caixa(mat, 9); raiz.add(alvo, caixa(mat, 1), caixa(mat, 2), some);
    dentro.add(caixa(mat, 4), caixa(mat, 5));
    fundirEstaticos(raiz, { manter: [alvo], passo: (k) => { some.visible = k % 2 === 0; } });
    expect(alvo.parent).toBe(raiz);
    expect(some.parent).toBe(raiz);
    expect(dentro.children).toHaveLength(1);   // o lote do convés fica DENTRO do grupo escondido (aparece quando o engine liga)
    expect(malhas(raiz).filter((m) => m.name === "lote" && m.parent === raiz)).toHaveLength(1);
  });
  it("peças pequenas viram lote marcado como detalhe (a região esconde de longe); grandes, não", () => {
    const raiz = new THREE.Group(), mat = new THREE.MeshBasicMaterial();
    raiz.add(caixa(mat, 0), caixa(mat, 1));
    const g = new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), mat), g2 = g.clone(); g2.position.x = 5; raiz.add(g, g2);
    fundirEstaticos(raiz);
    const lotes = malhas(raiz);
    expect(lotes).toHaveLength(2);
    expect(lotes.filter((m) => m.userData.detalhe)).toHaveLength(1);
  });
  it("linhas de aresta (filhas das peças) também juntam — e aí a peça, sem filho, entra no lote", () => {
    const raiz = new THREE.Group(), mat = new THREE.MeshBasicMaterial(), lmat = new THREE.LineBasicMaterial();
    for (let i = 0; i < 3; i++) { const c = caixa(mat, i * 2); c.add(new THREE.LineSegments(new THREE.EdgesGeometry(c.geometry), lmat)); raiz.add(c); }
    fundirEstaticos(raiz);
    expect(raiz.children).toHaveLength(2);   // 1 lote de malhas + 1 lote de linhas
    expect(raiz.children.some((n) => (n as THREE.LineSegments).isLineSegments)).toBe(true);
  });
  it("TETO de draw calls: a moto (8 no mapa) cabe em 45 depois do lote (com os efeitos de calor) — eram 62", () => {
    const draws = (r: THREE.Object3D) => { let n = 0; r.traverse((o) => { const x = o as THREE.Mesh; if (x.isMesh || (o as THREE.Line).isLine || (o as THREE.Points).isPoints || (o as THREE.Sprite).isSprite) n += Array.isArray(x.material) ? x.material.length : 1; }); return n; };
    const h = criarMoto({ cor: "#66e6ff", low: false }), antes = draws(h.group);
    fundirEstaticos(h.group, { passo: (k, t) => h.atualizar({ dt: 1 / 30, t, voando: k % 2 === 0, vel: (k % 4) / 3, curva: Math.sin(t), vy: Math.cos(t) * 5, boost: k % 3 === 0 ? 1 : 0, seta: (k % 3) - 1 }), manter: h.alvos });
    expect(antes).toBeGreaterThan(55);
    expect(draws(h.group)).toBeLessThanOrEqual(45);
    for (const a of h.alvos) expect(a.parent).not.toBeNull();   // o clique (montar) continua achando a moto
  });
  it("geometria com ATRIBUTO PRÓPRIO (shader das veias) fica de fora — e diz o porquê", () => {
    const raiz = new THREE.Group(), mat = new THREE.MeshBasicMaterial();
    const veia = caixa(mat, 0); veia.geometry.setAttribute("aFluxo", new THREE.Float32BufferAttribute(new Float32Array(veia.geometry.attributes.position!.count), 1));
    raiz.add(veia, caixa(mat, 2), caixa(mat, 4));
    fundirEstaticos(raiz);
    expect(veia.parent).toBe(raiz);
    expect(veia.geometry.attributes.aFluxo).toBeDefined();
    expect(veia.userData.foraDoLote).toBe("atributo-proprio");
    expect(malhas(raiz)).toHaveLength(2);   // a veia + 1 lote com as outras 2
  });
  it("materiais com shader REMENDADO (onBeforeCompile próprio) não viram um só — o remendo pode ser diferente", () => {
    const raiz = new THREE.Group();
    const remendo = (k: number) => { const m = new THREE.MeshBasicMaterial({ color: 0xffffff }); m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace("void main() {", `void main() { float k = ${k}.0;`); }; return m; };
    const a = remendo(1), b = remendo(2);
    raiz.add(caixa(a, 0), caixa(a, 2), caixa(b, 4), caixa(b, 6));
    fundirEstaticos(raiz);
    const ms = malhas(raiz);
    expect(ms).toHaveLength(2);   // o MESMO objeto ainda junta (2 lotes), mas a e b nunca se misturam
    expect(new Set(ms.map((m) => m.material))).toEqual(new Set([a, b]));
  });
  it("CONGELA o que ficou parado (matriz local não é mais recalculada); o que se mexe, a raiz e os `manter` seguem vivos", () => {
    const raiz = new THREE.Group(), mat = new THREE.MeshBasicMaterial(), parado = new THREE.Group(), gira = new THREE.Group(), alvo = caixa(mat, 9);
    parado.add(new THREE.InstancedMesh(new THREE.BoxGeometry(), mat, 2)); gira.add(caixa(mat, 0)); raiz.add(parado, gira, alvo);
    const r = fundirEstaticos(raiz, { passo: (_, t) => { gira.rotation.y = t; }, manter: [alvo] });
    expect(r.congelados).toBeGreaterThan(0);
    expect(parado.matrixAutoUpdate).toBe(false);
    expect(parado.children[0]!.matrixAutoUpdate).toBe(false);
    expect(gira.matrixAutoUpdate).toBe(true);
    expect(alvo.matrixAutoUpdate).toBe(true);
    expect(raiz.matrixAutoUpdate).toBe(true);
    // a matriz do MUNDO continua seguindo o pai (a ilha que boia)
    raiz.position.y = 5; raiz.updateMatrixWorld();
    expect(new THREE.Vector3().setFromMatrixPosition(parado.matrixWorld).y).toBeCloseTo(5, 6);
  });
  it("congelar: false deixa tudo como estava", () => {
    const raiz = new THREE.Group(), g = new THREE.Group(); raiz.add(g); g.add(new THREE.Points());
    expect(fundirEstaticos(raiz, { congelar: false }).congelados).toBe(0);
    expect(g.matrixAutoUpdate).toBe(true);
  });
});
