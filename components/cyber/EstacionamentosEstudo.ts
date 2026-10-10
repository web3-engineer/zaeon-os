/**
 * EstacionamentosEstudo — as PLATAFORMAS DE ESTACIONAMENTO ao lado de cada lugar de estudo (lib/cyber/estacionamentosEstudo)
 * e as MOTOS PARADAS nelas (as das IAs que estão estudando ali).
 *  - o piso é o mesmo da garagem (components/cyber/Estacionamento: vagas, pedestais, postes de recarga) em cima de uma
 *    LAJE flutuante com borda de luz; parado (sem pulsar) e estático — entra no lote do lugar (components/cyber/lotes);
 *  - as motos paradas são UMA malha instanciada por peça da moto (a moto de sempre, já fundida por material — ~10 peças):
 *    as 231 vagas custam ~10 draw calls por conjunto (Zaeon / fora), seja quantas motos estiverem paradas. Sem chama e sem
 *    pisca (parada); a pintura e os frisos na cor de cada IA (instanceColor).
 */
import * as THREE from "three";
import { CIDADE } from "@/lib/cyber/ceu";
import { estiloDaVaga, tamanhoDoLote } from "@/lib/cyber/motos";
import { AMBIENTES_COM_VAGA, ESTACIONAMENTOS, VAGAS_POR_ESTACIONAMENTO, type EstacionamentoEstudo, type VagaEstudo } from "@/lib/cyber/estacionamentosEstudo";
import { criarPisoEstacionamento } from "./Estacionamento";
import { criarMoto, loteMoto } from "./Moto";

/** um estacionamento: a laje flutuante + o piso das vagas (referencial do lote: a fila corre em x, a frente é +z) */
function criarPlataforma(l: EstacionamentoEstudo, low: boolean): THREE.Group {
  const g = new THREE.Group(), { larg, prof } = tamanhoDoLote(l), L = larg + 3, P = prof + 3, H = 1.4;
  const laje = new THREE.Mesh(new THREE.BoxGeometry(L, H, P), new THREE.MeshStandardMaterial({ color: 0x0a1424, emissive: 0x0c1c36, emissiveIntensity: 0.5, roughness: 0.6, metalness: 0.5 }));
  laje.position.y = -H / 2; g.add(laje);
  // a BORDA de luz (em cima e embaixo da laje) — dá pra ver de longe onde a plataforma está
  const borda = new THREE.LineSegments(new THREE.EdgesGeometry(laje.geometry), new THREE.LineBasicMaterial({ color: 0x7fe0ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending }));
  borda.position.copy(laje.position); g.add(borda);
  const piso = criarPisoEstacionamento({ low, parado: true, lote: l }); g.add(piso.group);
  return g;
}

/** as plataformas: `zaeon` = as das salas (no referencial da ILHA — vão dentro de `cidade.ilha` e flutuam com ela);
 *  `fora` = as das universidades (no mundo) */
export function criarPisosEstudo(o: { low: boolean; onde: "zaeon" | "fora" }): THREE.Group {
  const g = new THREE.Group(); g.name = `estacionamentos-${o.onde}`;
  for (const amb of AMBIENTES_COM_VAGA) {
    const l = ESTACIONAMENTOS[amb]; if (l.zaeon !== (o.onde === "zaeon")) continue;
    const p = criarPlataforma(l, o.low); p.name = `estacionamento-${amb}`;
    if (l.zaeon) p.position.set(l.x - CIDADE.centro.x, l.alt, l.z - CIDADE.centro.z); else p.position.set(l.x, l.y, l.z);
    p.rotation.y = l.rot; g.add(p);
  }
  return g;
}

export type MotoParada = { vaga: VagaEstudo; cor: string };
export type MotosEstacionadasHandle = {
  /** as motos paradas agora (a lista inteira — refaz as matrizes; chamar quando a varredura da frota fecha a volta) */
  definir(lista: readonly MotoParada[]): void;
  /** a boia da ilha agora (m acima do piso de referência): as da Zaeon sobem e descem com ela */
  boia(dy: number): void;
  dispose(): void;
};

export function criarMotosEstacionadas(o: { cena: THREE.Object3D; low: boolean }): MotosEstacionadasHandle {
  // os MOLDES: a moto de sempre nas 3 carenagens (Raio, Tubarão, Gota — por igual, alternando pela vaga), branca (a cor
  // vem por instância), parada, fundida por material
  type Peca = { geo: THREE.BufferGeometry; mat: THREE.Material; rel: THREE.Matrix4; cor: "pintura" | "brilho" | null };
  const moldes = [0, 1, 2].map((estilo) => {
    const molde = loteMoto(criarMoto({ cor: "#ffffff", low: o.low, estilo }));
    molde.atualizar({ dt: 1, t: 0, voando: false, vel: 0, curva: 0, seta: 0 });
    molde.group.updateMatrixWorld(true);
    const pecas: Peca[] = [];
    molde.group.traverse((n) => {
      const m = n as THREE.Mesh; if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh) return;   // (as chamas são instanciadas: parada, fora)
      let vis = true; for (let k: THREE.Object3D | null = m; k; k = k.parent) if (!k.visible) vis = false;
      const mat = m.material as THREE.Material; if (!vis || Array.isArray(m.material) || (mat as THREE.ShaderMaterial).isShaderMaterial) return;
      const st = mat as THREE.MeshStandardMaterial, bas = mat as THREE.MeshBasicMaterial;
      // a PINTURA (clara, metálica: a cor da IA clareada) e os FRISOS de luz (a cor pura); o resto (escuro, cromado, vidro, banco) fica igual
      const cor = st.userData.pintura ? "pintura" : bas.userData.friso ? "brilho" : null;   // (marcados no components/cyber/Moto)
      let usa = mat;
      if (cor === "pintura") { const c = st.clone(); c.emissive.setScalar(0); usa = c; }   // (o brilho branco do molde clarearia todas)
      pecas.push({ geo: m.geometry, mat: usa, rel: m.matrixWorld.clone(), cor });
    });
    return { molde, pecas };
  });

  const MAX = VAGAS_POR_ESTACIONAMENTO * AMBIENTES_COM_VAGA.length;
  /** um conjunto (Zaeon / fora) com as malhas instanciadas das 3 carenagens */
  const conjunto = (nome: string) => {
    const g = new THREE.Group(); g.name = nome; o.cena.add(g);
    const porEstilo = moldes.map(({ pecas }) => pecas.map((p) => {
      const im = new THREE.InstancedMesh(p.geo, p.mat, MAX); im.count = 0; im.frustumCulled = false;
      if (p.cor) im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
      g.add(im); return { im, p };
    }));
    return { g, porEstilo };
  };
  const zaeon = conjunto("motos-paradas-zaeon"), fora = conjunto("motos-paradas-fora");
  const mV = new THREE.Matrix4(), mI = new THREE.Matrix4(), q = new THREE.Quaternion(), eixo = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), um = new THREE.Vector3(1, 1, 1);
  const cor = new THREE.Color(), clara = new THREE.Color(), branco = new THREE.Color(0xffffff);

  return {
    definir(lista) {
      const n = [zaeon, fora].map(() => [0, 0, 0]);
      for (const { vaga, cor: c } of lista) {
        const qual = vaga.zaeon ? 0 : 1, s = qual ? fora : zaeon, est = estiloDaVaga(vaga.i), i = n[qual]![est]!++;
        if (i >= MAX) continue;
        mV.compose(pos.set(vaga.x, vaga.y, vaga.z), q.setFromAxisAngle(eixo, vaga.rumo), um);
        cor.set(c); clara.copy(cor).lerp(branco, 0.3);
        for (const { im, p } of s.porEstilo[est]!) {
          im.setMatrixAt(i, mI.multiplyMatrices(mV, p.rel));
          if (p.cor) im.setColorAt(i, p.cor === "pintura" ? clara : cor);
        }
      }
      [zaeon, fora].forEach((s, qual) => s.porEstilo.forEach((malhas, est) => { for (const { im } of malhas) {
        im.count = Math.min(n[qual]![est]!, MAX); im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      } }));
    },
    boia(dy) { if (Math.abs(zaeon.g.position.y - dy) > 0.01) { zaeon.g.position.y = dy; zaeon.g.updateMatrixWorld(true); } },
    dispose() {
      for (const s of [zaeon, fora]) { for (const malhas of s.porEstilo) for (const { im } of malhas) im.dispose(); s.g.removeFromParent(); }
      for (const { molde, pecas } of moldes) { for (const p of pecas) if (p.cor === "pintura") p.mat.dispose(); molde.dispose(); }
    },
  };
}
