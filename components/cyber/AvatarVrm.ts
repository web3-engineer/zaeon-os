/**
 * AvatarVrm — um corpo ANIME de verdade (VRM: o formato dos personagens do VRoid Studio, com o sombreamento MToon
 * de anime, contorno e física de cabelo/roupa) no lugar do soldado do GLB.
 *
 * Como anima: o esqueleto mixamo do GLB CONTINUA fazendo tudo (Idle/Walk/Run + as poses do AvatarLuz: jato, moto
 * com IK, DJ, dança, prancha…), invisível. A cada quadro o VRM COPIA a pose dele (lib/cyber/vrmMapa): a rotação de
 * cada osso, medida como "quanto girou desde a pose de repouso (T)", vai pro osso humanoide normalizado do VRM — que
 * por definição tem repouso em T e eixos alinhados ao mundo. O quadril leva também o deslocamento (sentar, pousar).
 */
import { apoioDaFase, camadaFeminina, faseDaPassada, velDaAbertura } from "@/lib/cyber/marchaFeminina";
import * as THREE from "three";
import { ctx2d, novoCanvas } from "@/lib/cyber/canvas2d";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, type VRM, type VRMHumanBoneName } from "@pixiv/three-vrm";
import { MIXAMO_PRO_VRM, ORDEM_VRM, paiExistente } from "@/lib/cyber/vrmMapa";
import { contornarMateriais, trocarJsonDoGlb } from "@/lib/cyber/vrmContorno";
import { respiracao, type PoseVrm } from "@/lib/cyber/posesVrm";
import { comTentativas, ErroHttp } from "@/lib/cyber/tentarDeNovo";

/** os BYTES do VRM, baixados uma vez por URL (o founder tem 16 MB): começar cedo (`precarregarVrm`) faz o corpo
 *  próprio já estar pronto quando o avatar nasce — sem aparecer o corpo padrão antes */
const bytes = new Map<string, Promise<ArrayBuffer>>();
export function precarregarVrm(url: string): Promise<ArrayBuffer> {
  let p = bytes.get(url);
  if (!p) {
    // #819: o download cortado no meio (deploy, Wi-Fi oscilando) tenta de novo, em vez de deixar a avatar sem corpo
    p = comTentativas(() => fetch(url).then((r) => { if (!r.ok) throw new ErroHttp(r.status, url); return r.arrayBuffer(); }));
    bytes.set(url, p); p.catch(() => { if (bytes.get(url) === p) bytes.delete(url); });
  }
  return p;
}

/** carrega e prepara um VRM (uma instância por chamada — VRM não se clona com segurança), com o TRAÇO DE ANIME
 *  (lib/cyber/vrmContorno: o contorno MToon ligado/engrossado no arquivo antes da carga) */
export async function carregarVrm(url: string): Promise<VRM> {
  const loader = new GLTFLoader();
  loader.register((p) => new VRMLoaderPlugin(p));
  const dados = trocarJsonDoGlb(await precarregarVrm(url), (j) => contornarMateriais(j as never));   // (cópia: os bytes do cache ficam intactos)
  const gltf = await loader.parseAsync(dados, url.slice(0, url.lastIndexOf("/") + 1));
  const vrm = gltf.userData.vrm as VRM | undefined;
  if (!vrm) throw new Error(`não é um VRM: ${url}`);
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons(gltf.scene);
  VRMUtils.rotateVRM0(vrm);   // VRM 0.x olha pro −Z; o 1.0 pro +Z — deixa todos no padrão do 1.0
  vrm.scene.traverse((o) => { o.frustumCulled = false; });
  realcar(vrm);
  return vrm;
}

/** o MToon (o desenho do VRM) pinta com as luzes da cena — e o cyberespaço é escuro. A própria textura entra também
 *  como EMISSIVA (fraca): o personagem fica legível em qualquer canto, sem acender a cena toda */
const REALCE = 0.42;
function realcar(vrm: VRM) {
  vrm.scene.traverse((o) => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      const mt = mat as THREE.Material & { map?: THREE.Texture | null; emissive?: THREE.Color; emissiveMap?: THREE.Texture | null; isOutline?: boolean };
      if (!mt.emissive || !mt.map || mt.isOutline) continue;   // o traço (contorno) fica tinta chapada
      mt.emissiveMap = mt.map; mt.emissive.setScalar(REALCE); mt.needsUpdate = true;
    }
  });
}

/** tinge peças do VRM pelo nome do material (os do VRoid: "…_Tops_01_CLOTH", "…_Bottoms_…", "…_Shoes_…"): a cor
 *  multiplica a textura (o moletom é branco → vira a cor) e a sombra do desenho (MToon) acompanha, mais escura */
export function tingirVrm(vrm: VRM, tintas: Readonly<Record<string, string>>) {
  vrm.scene.traverse((o) => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      if ((mat as { isOutline?: boolean }).isOutline) continue;   // o traço não se tinge
      const chave = Object.keys(tintas).find((k) => mat.name.includes(`_${k}_`)); if (!chave) continue;
      const c = new THREE.Color(tintas[chave]!), mt = mat as THREE.Material & { color?: THREE.Color; shadeColorFactor?: THREE.Color };
      mt.color?.copy(c); mt.shadeColorFactor?.copy(c).multiplyScalar(0.55);
      (mt as { emissive?: THREE.Color }).emissive?.copy(c).multiplyScalar(REALCE * 2);   // o realce na cor da peça (não clareia o preto)
    }
  });
}

/** o resto do ACABAMENTO de um corpo de personagem (lib/cyber/estiloAvatar CorpoVrm), depois de tingir:
 *  - `gravidadeCabelo`: o VRoid exporta a física do cabelo SEM gravidade — mecha longa (rabo de cavalo) fica
 *    espetada no ar; com gravidade ela cai;
 *  - `recortes`: tira de uma peça os triângulos presos a certos ossos (ex.: o body de gola alta do VRoid cobre as
 *    mãos como luva — sem os triângulos das mãos, aparece a pele; sem os do pescoço, vira gola careca; sem os das pernas, não vaza pela calça);
 *  - `recolorir`: troca a cor só das partes COLORIDAS da textura de uma peça (o colete azul-claro do VRoid vira
 *    azul-marinho e a camisa branca do mesmo molde continua branca) */
const OSSOS_DAS_MAOS = /^(left|right)(Hand|Thumb|Index|Middle|Ring|Little)/, OSSOS_DO_PESCOCO = /^(neck|head|leftEye|rightEye|jaw)$/;
const OSSOS_DAS_PERNAS = /^(left|right)(UpperLeg|LowerLeg|Foot|Toes)$/;
type Acabamento = { gravidadeCabelo?: number; recortes?: readonly { peca: string; maos?: boolean; pescoco?: boolean; pernas?: boolean }[]; recolorir?: readonly { peca: string; cor: string }[] };
export function acabarVrm(vrm: VRM, corpo: Acabamento) {
  for (const r of corpo.recolorir ?? []) recolorirPeca(vrm, r.peca, r.cor);
  if (corpo.gravidadeCabelo) for (const j of vrm.springBoneManager?.joints ?? []) if (/Hair/i.test(j.bone.name)) j.settings.gravityPower = Math.max(j.settings.gravityPower, corpo.gravidadeCabelo);
  for (const r of corpo.recortes ?? []) {
    const fora = new Set<THREE.Object3D>();
    for (const [nome, b] of Object.entries(vrm.humanoid.rawHumanBones)) if (b?.node && ((r.maos && OSSOS_DAS_MAOS.test(nome)) || (r.pescoco && OSSOS_DO_PESCOCO.test(nome)) || (r.pernas && OSSOS_DAS_PERNAS.test(nome)))) fora.add(b.node);
    vrm.scene.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isSkinnedMesh || !m.geometry.index || !(Array.isArray(m.material) ? m.material : [m.material]).some((x) => x.name.includes(`_${r.peca}_`))) return;
      const g = m.geometry, si = g.attributes.skinIndex as THREE.BufferAttribute, sw = g.attributes.skinWeight as THREE.BufferAttribute, idx = g.index!;
      const dele = (v: number) => { let melhor = 0, osso = 0; for (let k = 0; k < 4; k++) { const w = sw.getComponent(v, k); if (w > melhor) { melhor = w; osso = si.getComponent(v, k); } } return fora.has(m.skeleton.bones[osso]!); };
      const fica: number[] = [];
      for (let t = 0; t < idx.count; t += 3) { const a = idx.getX(t), b = idx.getX(t + 1), c = idx.getX(t + 2); if (!dele(a) && !dele(b) && !dele(c)) fica.push(a, b, c); }
      const grupos = g.groups.map((x) => ({ ...x }));
      g.setIndex(fica); g.clearGroups(); for (const x of grupos) g.addGroup(0, fica.length, x.materialIndex);
    });
  }
}

function recolorirPeca(vrm: VRM, peca: string, hex: string) {
  const alvo = new THREE.Color(hex).convertLinearToSRGB(), feitas = new Map<THREE.Texture, THREE.Texture>();
  vrm.scene.traverse((o) => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      const mt = mat as THREE.Material & { map?: THREE.Texture | null; emissiveMap?: THREE.Texture | null; isOutline?: boolean };
      if (mt.isOutline || !mt.name.includes(`_${peca}_`) || !mt.map?.image) continue;
      let nova = feitas.get(mt.map);
      if (!nova) {
        const img = mt.map.image as CanvasImageSource & { width: number; height: number };
        const cv = novoCanvas(img.width, img.height);
        const ctx = ctx2d(cv); ctx.drawImage(img, 0, 0);
        const px = ctx.getImageData(0, 0, cv.width, cv.height), d = px.data;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i]! / 255, g = d[i + 1]! / 255, b = d[i + 2]! / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
          if (mx - mn < 0.1) continue;   // branco/cinza (a camisa) fica como está
          const k = Math.min(1.25, mx / 0.82);   // o claro/escuro do tricô vira o claro/escuro da cor nova
          d[i] = Math.min(255, alvo.r * k * 255); d[i + 1] = Math.min(255, alvo.g * k * 255); d[i + 2] = Math.min(255, alvo.b * k * 255);
        }
        ctx.putImageData(px, 0, 0);
        nova = new THREE.CanvasTexture(cv); nova.flipY = mt.map.flipY; nova.colorSpace = mt.map.colorSpace;
        nova.wrapS = mt.map.wrapS; nova.wrapT = mt.map.wrapT; nova.needsUpdate = true; feitas.set(mt.map, nova);
      }
      if (mt.emissiveMap === mt.map) mt.emissiveMap = nova;
      mt.map = nova; mt.needsUpdate = true;
    }
  });
}

export type EspelhoVrm = {
  atualizar(dt: number, t: number): void;
  /** uma POSE própria (lib/cyber/posesVrm) por cima da cópia do esqueleto — entra/sai suave; null = só a cópia */
  pose(p: PoseVrm | null): void;
  /** perto (true, o padrão) roda tudo; longe pula a física do cabelo, o olhar e os materiais (components/cyber/PersonagemVivo) */
  detalhe(on: boolean): void;
  /** o JEITO de andar: "feminina" = a camada da marcha feminina (lib/cyber/marchaFeminina) por cima do andar/correr */
  estilo(e: "feminina" | null): void;
  /** a marcha vale agora? (a pé no chão — sentado, voando, de moto, não) */
  marcha(on: boolean): void;
  /** as MÃOS presas num objeto (o rifle — lib/cyber/rifle): depois da cópia, os braços DO VRM vão por IK até os pulsos
   *  pedidos (mundo) e as mãos giram pros dedos/indicador pedidos — a cópia só passa rotações, e o braço do VRM tem
   *  outro comprimento: sem isso a mão parava ~10 cm fora da arma. null = solta */
  maos(m: MaosVrm | null): void;
  /** SÓ O ROSTO (o traje — components/cyber/CorpoAstronauta): esconde corpo e roupa (o rosto e o cabelo ficam) e leva o VRM inteiro
   *  pra que o meio dos OLHOS fique na `ancora` (dentro do capacete). Devolve a distância entre os olhos (m, mundo) — o
   *  traje ajusta o tamanho do capacete por ela. `escala` encolhe o VRM (só o rosto aparece: a cabeça de anime é maior
   *  que a de um capacete de verdade). null = o corpo inteiro de volta */
  rosto(ancora: THREE.Object3D | null, escala?: number): number;
  /** leva o rosto pra âncora de novo (a âncora mexeu depois do `atualizar` deste quadro — o astronauta que copia o VRM) */
  realinharRosto(): void;
  dispose(): void;
};
/** um pulso (mundo), pra onde os dedos apontam, o lado do indicador e pra onde o cotovelo dobra */
export type MaoVrm = { pulso: THREE.Vector3; dedos: THREE.Vector3; indicador: THREE.Vector3; polo: THREE.Vector3 };
export type MaosVrm = { esq: MaoVrm; dir: MaoVrm; peso: number };
/** a pose de REPOUSO (T) do esqueleto mixamo, no referencial do `corpo` — medida ao criar o avatar, antes de qualquer
 *  animação (o VRM pode chegar depois, com o esqueleto já andando) */
export type Repouso = { q: Map<THREE.Object3D, THREE.Quaternion>; quadril: THREE.Vector3 };
export function medirRepouso(modelo: THREE.Object3D, corpo: THREE.Object3D): Repouso {
  corpo.updateWorldMatrix(true, false); modelo.updateMatrixWorld(true);
  const inv = corpo.matrixWorld.clone().invert(), m = new THREE.Matrix4(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const q = new Map<THREE.Object3D, THREE.Quaternion>(), quadril = new THREE.Vector3();
  for (const mx of Object.keys(MIXAMO_PRO_VRM)) {
    const o = modelo.getObjectByName(`mixamorig${mx}`); if (!o) continue;
    const r = new THREE.Quaternion(); m.multiplyMatrices(inv, o.matrixWorld).decompose(mx === "Hips" ? quadril : p, r, s); q.set(o, r);
  }
  return { q, quadril };
}

/** liga o VRM ao esqueleto mixamo `modelo` (já dentro do `corpo` do avatar, na pose de repouso). O VRM entra no
 *  `corpo` virado pro −Z (a frente do modelo) e na escala em que o quadril fica na mesma altura do quadril do GLB
 *  (o mundo foi medido com ele: assento, moto, cabine) */
export function espelharNoVrm(vrm: VRM, modelo: THREE.Object3D, corpo: THREE.Object3D, repouso: Repouso, o: { economico?: boolean } = {}): EspelhoVrm {
  const H = vrm.humanoid;
  // MATRIZES (components/cyber/matrizes): a passada da cena NÃO refaz (1) o rig NORMALIZADO do three-vrm — o
  // `humanoid.update` só usa as rotações locais dele (o quadril pede a própria posição na hora) — e, no modo `economico`
  // (os personagens: sem fone/tablet/asas presos no esqueleto e posicionados ANTES de animar), (2) o esqueleto mixamo
  // escondido, que o espelho já recalcula toda vez que anima. ~40% dos nós de um personagem VRM.
  const rigN = H.normalizedHumanBonesRoot, semPassada = () => {};
  rigN.updateMatrixWorld = semPassada;
  rigN.visible = false;   // nada pra desenhar lá: a montagem da lista de desenho nem entra (components/cyber/matrizes)
  const atualizarModelo = THREE.Object3D.prototype.updateMatrixWorld.bind(modelo);
  if (o.economico) modelo.updateMatrixWorld = semPassada;
  const no = (b: string) => H.getNormalizedBoneNode(b as VRMHumanBoneName);
  const existe = (b: string) => !!no(b);
  const osso = (n: string) => modelo.getObjectByName(`mixamorig${n}`) ?? null;

  // a pose de repouso do mixamo (medida na criação) e a do VRM, no referencial do `corpo`
  corpo.updateWorldMatrix(true, false); atualizarModelo(true);
  const corpoInv = new THREE.Matrix4(), m = new THREE.Matrix4(), tp = new THREE.Vector3(), tq = new THREE.Quaternion(), ts = new THREE.Vector3();
  const relativa = (o: THREE.Object3D, q: THREE.Quaternion, p?: THREE.Vector3) => { m.multiplyMatrices(corpoInv, o.matrixWorld).decompose(p ?? tp, q, ts); };
  corpoInv.copy(corpo.matrixWorld).invert();
  const fontes: { vrm: string; mx: THREE.Object3D; restoInv: THREE.Quaternion }[] = [];
  for (const [mx, v] of Object.entries(MIXAMO_PRO_VRM)) {
    const o = osso(mx), r = o && repouso.q.get(o); if (!o || !r || !existe(v)) continue;
    fontes.push({ vrm: v, mx: o, restoInv: r.clone().invert() });
  }
  const porVrm = new Map(fontes.map((f) => [f.vrm, f] as const));
  const quadrilMx = osso("Hips"), quadrilRepouso = repouso.quadril.clone();

  // o VRM no corpo: de frente pro −Z (gira π) e na escala do quadril
  vrm.scene.rotation.set(0, Math.PI, 0); vrm.scene.position.set(0, 0, 0); vrm.scene.scale.setScalar(1);
  corpo.add(vrm.scene); vrm.scene.updateMatrixWorld(true);
  const quadrilVrm = no("hips"), alturaVrm = quadrilVrm ? quadrilVrm.getWorldPosition(new THREE.Vector3()).applyMatrix4(corpoInv).y : 1;
  const escala = quadrilMx && alturaVrm > 0.1 ? quadrilRepouso.y / alturaVrm : 1;
  vrm.scene.scale.setScalar(escala);
  const hipsRepouso = quadrilVrm ? quadrilVrm.position.clone() : new THREE.Vector3();
  // de "girou no corpo" pra "girou no VRM" (o VRM está virado π em Y dentro do corpo): Δ' = R⁻¹ Δ R
  const R = new THREE.Quaternion().setFromEuler(vrm.scene.rotation), Rinv = R.clone().invert();

  const delta = new Map<string, THREE.Quaternion>(), ident = new THREE.Quaternion(), d = new THREE.Vector3();
  for (const b of ORDEM_VRM) if (existe(b)) delta.set(b, new THREE.Quaternion());
  let piscaT = 2 + Math.random() * 3, piscando = 0;
  let pose: PoseVrm | null = null, pesoPose = 0, detalhe = true, voltouDetalhe = false;
  const qPose = new THREE.Quaternion(), ePose = new THREE.Euler();
  let estilo: "feminina" | null = null, marchaOn = false, velMarcha = 0, faseAnt = 0, dFase = 0, ritmo = 0, apoio = 0;
  const baixo = new THREE.Vector3(), qCoxa = new THREE.Quaternion();
  // as MÃOS na arma: os ossos de VERDADE do VRM (os que a malha usa), na cena — a IK mexe neles depois do humanoid.update
  let maos: MaosVrm | null = null;
  const cru = (b: string) => H.getRawBoneNode(b as VRMHumanBoneName);
  const bracos = (["left", "right"] as const).map((l) => ({ l, a: cru(`${l}UpperArm`), b: cru(`${l}LowerArm`), m: cru(`${l}Hand`), medio: cru(`${l}MiddleProximal`), ind: cru(`${l}IndexProximal`), min: cru(`${l}LittleProximal`) }));
  const pA = new THREE.Vector3(), pB = new THREE.Vector3(), pC = new THREE.Vector3(), eixo = new THREE.Vector3(), lado = new THREE.Vector3(), cot = new THREE.Vector3(), dir = new THREE.Vector3(), atual = new THREE.Vector3();
  const qD = new THREE.Quaternion(), qO = new THREE.Quaternion(), qP = new THREE.Quaternion(), qRoda = new THREE.Quaternion();
  /** gira `osso` (mundo) pra que o segmento até `filho` aponte pra `para` (peso w) */
  const apontarOsso = (osso: THREE.Object3D, filho: THREE.Object3D, para: THREE.Vector3, w: number) => {
    osso.updateWorldMatrix(true, false); filho.updateWorldMatrix(false, false);
    atual.setFromMatrixPosition(filho.matrixWorld).sub(pC.setFromMatrixPosition(osso.matrixWorld)).normalize();
    qD.setFromUnitVectors(atual, para); osso.getWorldQuaternion(qO); osso.parent!.getWorldQuaternion(qP);
    osso.quaternion.slerp(qP.invert().multiply(qD.multiply(qO)), w); osso.updateWorldMatrix(false, true);
  };
  /** gira `osso` (mundo) em torno do eixo `ax` por `ang` (peso w) */
  const girarOsso = (osso: THREE.Object3D, q: THREE.Quaternion, w: number) => {
    osso.getWorldQuaternion(qO); osso.parent!.getWorldQuaternion(qP);
    osso.quaternion.slerp(qP.invert().multiply(qD.copy(q).multiply(qO)), w); osso.updateWorldMatrix(false, true);
  };
  const prenderMaos = (m: MaosVrm) => {
    for (const br of bracos) {
      const alvo = br.l === "left" ? m.esq : m.dir; if (!br.a || !br.b || !br.m) continue;
      // o braço: 2 ossos até o pulso, dobrando pro polo
      br.a.updateWorldMatrix(true, true);
      pA.setFromMatrixPosition(br.a.matrixWorld); pB.setFromMatrixPosition(br.b.matrixWorld); pC.setFromMatrixPosition(br.m.matrixWorld);
      const l1 = pA.distanceTo(pB), l2 = pB.distanceTo(pC);
      eixo.copy(alvo.pulso).sub(pA); const dist = Math.min(Math.max(eixo.length(), 1e-3), l1 + l2 - 1e-3); eixo.normalize();
      const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
      lado.copy(alvo.polo).addScaledVector(eixo, -alvo.polo.dot(eixo)); if (lado.lengthSq() < 1e-8) lado.set(0, -1, 0); lado.normalize();
      cot.copy(pA).addScaledVector(eixo, a).addScaledVector(lado, h);
      apontarOsso(br.a, br.b, dir.copy(cot).sub(pA).normalize(), m.peso);
      pB.setFromMatrixPosition(br.b.matrixWorld); apontarOsso(br.b, br.m, dir.copy(alvo.pulso).sub(pB).normalize(), m.peso);
      // a mão: os dedos (pulso → falange do meio) pra onde pede; depois gira no próprio eixo até o indicador ficar do lado pedido
      if (br.medio && br.ind && br.min) {
        br.m.updateWorldMatrix(true, true);
        atual.setFromMatrixPosition(br.medio.matrixWorld).sub(pC.setFromMatrixPosition(br.m.matrixWorld)).normalize();
        girarOsso(br.m, qRoda.setFromUnitVectors(atual, dir.copy(alvo.dedos).normalize()), m.peso);
        br.m.updateWorldMatrix(false, true);
        const f = atual.setFromMatrixPosition(br.medio.matrixWorld).sub(pC.setFromMatrixPosition(br.m.matrixWorld)).normalize();
        const at = lado.setFromMatrixPosition(br.ind.matrixWorld).sub(pA.setFromMatrixPosition(br.min.matrixWorld)); at.addScaledVector(f, -at.dot(f)).normalize();
        const qr = cot.copy(alvo.indicador).addScaledVector(f, -alvo.indicador.dot(f)).normalize();
        const ang = Math.atan2(eixo.crossVectors(at, qr).dot(f), at.dot(qr));
        girarOsso(br.m, qRoda.setFromAxisAngle(f, ang), m.peso);
      }
    }
  };
  // SÓ O ROSTO (traje): os materiais do rosto e do cabelo (os do VRoid: _Face…, _Eye…, _Hair…) ficam; o resto some
  let ancoraRosto: THREE.Object3D | null = null;
  const olhoE = cru("leftEye"), olhoD = cru("rightEye"), cab = cru("head");
  const ehDoRosto = (n: string) => /_(Face|Eye)[A-Za-z]*_|_Hair[A-Za-z]*_/.test(n);   // (o rosto e o CABELO — quem é dentro do capacete)
  const escondidosRosto: THREE.Material[] = [];
  /** o PESCOÇO dentro do capacete: o corpo do VRM some (só o rosto e o cabelo ficam) e o pescoço é dele — um cilindro na
   *  pele do rosto, do osso do pescoço até a cabeça */
  let pescocoRosto: THREE.Mesh | null = null;
  const mPesc = new THREE.Matrix4();
  const criarPescoco = () => {
    const H = vrm.humanoid, ossoP = H?.getRawBoneNode("neck"), ossoC = H?.getRawBoneNode("head");
    if (!ossoP || !ossoC) return null;
    let pele: THREE.Material | null = null;
    vrm.scene.traverse((x) => { const m = x as THREE.Mesh; if (!pele && m.isMesh) for (const mt of Array.isArray(m.material) ? m.material : [m.material]) if (/_Face_00_SKIN|Face.*SKIN/.test(mt.name) && !/Outline/.test(mt.name)) { pele = mt; break; } });
    if (!pele) return null;
    // (desce além do osso do pescoço, até a gola do traje: do queixo pra baixo é o que aparece pela viseira)
    const L = ossoC.position.length(), alt = L * 2.6, g = new THREE.CylinderGeometry(0.036, 0.046, alt, 14);
    const pesc = new THREE.Mesh(g, pele); pesc.name = "pescocoRosto"; pesc.frustumCulled = false;
    const dir = ossoC.position.clone().normalize();
    pesc.userData.osso = ossoP; pesc.userData.local = new THREE.Matrix4().compose(dir.clone().multiplyScalar(L * 0.6 - alt / 2), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir), new THREE.Vector3(1, 1, 1));
    pesc.matrixAutoUpdate = false; vrm.scene.add(pesc); return pesc;
  };
  const pO = new THREE.Vector3(), pAlvo = new THREE.Vector3();
  const meioDosOlhos = (out: THREE.Vector3) => {
    if (olhoE && olhoD) { olhoE.updateWorldMatrix(true, false); olhoD.updateWorldMatrix(true, false); return out.setFromMatrixPosition(olhoE.matrixWorld).add(pO.setFromMatrixPosition(olhoD.matrixWorld)).multiplyScalar(0.5); }
    if (cab) { cab.updateWorldMatrix(true, false); return out.setFromMatrixPosition(cab.matrixWorld); }
    return out.set(0, 0, 0);
  };
  const levarRosto = () => {
    if (!ancoraRosto) return;
    ancoraRosto.updateWorldMatrix(true, false);
    pAlvo.setFromMatrixPosition(ancoraRosto.matrixWorld).applyMatrix4(corpoInv); meioDosOlhos(pO).applyMatrix4(corpoInv);
    vrm.scene.position.add(pAlvo.sub(pO));   // (o VRM está no corpo: a diferença no referencial dele)
    // o pescoço segue o osso do pescoço (os ossos do VRM ficam invisíveis — preso neles, não desenhava)
    if (pescocoRosto && pescocoRosto.userData.osso) {
      vrm.scene.updateMatrixWorld(true);
      pescocoRosto.matrix.copy(mPesc.copy(vrm.scene.matrixWorld).invert()).multiply((pescocoRosto.userData.osso as THREE.Object3D).matrixWorld).multiply(pescocoRosto.userData.local as THREE.Matrix4);
    }
  };
  /** quanto a coxa vai pra FRENTE (o VRM olha pro +Z; Δ no referencial dele) */
  const frenteDaCoxa = (b: string) => { const q = delta.get(b); if (!q) return 0; qCoxa.copy(q); return baixo.set(0, -1, 0).applyQuaternion(qCoxa).z; };

  return {
    atualizar(dt, t) {
      corpo.updateWorldMatrix(true, false); corpoInv.copy(corpo.matrixWorld).invert(); atualizarModelo(true);
      for (const b of ORDEM_VRM) {
        const n = no(b), q = delta.get(b); if (!n || !q) continue;
        const pai = paiExistente(b, existe), qPai = pai ? delta.get(pai)! : ident;
        const f = porVrm.get(b);
        if (f) { relativa(f.mx, q); q.multiply(f.restoInv); q.premultiply(Rinv).multiply(R); }   // Δ = Q_agora · Q_repouso⁻¹, no referencial do VRM
        else q.copy(qPai);                                                                          // osso sem fonte: acompanha o pai
        n.quaternion.copy(qPai).invert().multiply(q);                                               // local = Δ_pai⁻¹ · Δ
      }
      // o quadril também DESLOCA (sentar, agachar no pouso, montar na moto)
      if (quadrilMx && quadrilVrm) {
        relativa(quadrilMx, tq, d); d.sub(quadrilRepouso).applyQuaternion(Rinv).divideScalar(escala);
        quadrilVrm.position.copy(hipsRepouso).add(d);
      }
      // a MARCHA FEMININA (pack de realismo): a fase sai de qual coxa está à frente; a camada soma por cima da cópia
      if (estilo === "feminina") {
        const { fase, abertura } = faseDaPassada(frenteDaCoxa("leftUpperLeg"), frenteDaCoxa("rightUpperLeg"));
        velMarcha += ((marchaOn ? velDaAbertura(abertura) : 0) - velMarcha) * Math.min(1, dt * 6);
        // o APOIO (sobre qual perna está o peso): sai de como a fase muda — a perna que vai pra trás é a que pisa
        if (dt > 0) { const df = (fase - faseAnt) / dt; dFase += (df - dFase) * Math.min(1, dt * 12); ritmo += (Math.abs(dFase) - ritmo) * Math.min(1, dt * 2); }
        faseAnt = fase; apoio += (apoioDaFase(dFase, ritmo) - apoio) * Math.min(1, dt * 10);
        if (velMarcha > 0.01) {
          const cam = camadaFeminina(fase, velMarcha, apoio);
          for (const [b, e] of Object.entries(cam.ossos)) {
            const n = no(b); if (!n) continue;
            ePose.set(e[0], e[1], e[2]); qPose.setFromEuler(ePose); n.quaternion.multiply(qPose);
          }
          if (quadrilVrm) quadrilVrm.position.x += cam.desloc / escala;   // o quadril vai pro lado do apoio (o +X do VRM = a esquerda dela)
        }
      }
      // a POSE própria (personagens): sobrepõe a cópia osso a osso, com a respiração no peito
      pesoPose += ((pose ? 1 : 0) - pesoPose) * Math.min(1, dt * 4);
      if (pose && pesoPose > 0.001) {
        const resp = respiracao(pose, t);
        for (const [b, e] of Object.entries(pose.ossos)) {
          const n = no(b); if (!n) continue;
          ePose.set(e[0] + (b === "chest" ? resp : 0), e[1], e[2]); qPose.setFromEuler(ePose);
          n.quaternion.slerp(qPose, pesoPose);
        }
      }
      // piscar de vez em quando (a expressão "blink" do VRM)
      const ex = vrm.expressionManager;
      if (ex) {
        piscaT -= dt; if (piscaT <= 0) { piscando = 0.14; piscaT = 2.2 + Math.random() * 3.5; }
        if (piscando > 0) { piscando -= dt; ex.setValue("blink", Math.sin(Math.max(0, piscando / 0.14) * Math.PI)); } else ex.setValue("blink", 0);
      }
      // o vrm.update por partes: o esqueleto (normalizado → ossos reais) e as expressões SEMPRE; o olhar, as restrições,
      // a FÍSICA do cabelo/roupa (spring bones — o mais caro) e os materiais MToon só com DETALHE (perto): de longe o
      // cabelo parado e o uniforme do material não mudam nada que se veja
      vrm.humanoid.update(); vrm.expressionManager?.update();
      levarRosto();
      if (maos && maos.peso > 0.01) prenderMaos(maos);
      if (detalhe) {
        vrm.lookAt?.update(dt); vrm.nodeConstraintManager?.update();
        if (voltouDetalhe) { vrm.springBoneManager?.reset(); voltouDetalhe = false; }   // (recomeça do repouso, sem o salto do rabo parado)
        vrm.springBoneManager?.update(dt);
        for (const m of vrm.materials ?? []) (m as { update?: (d: number) => void }).update?.(dt);
      }
    },
    pose(p) { pose = p; },
    estilo(e) { estilo = e; },
    marcha(on) { marchaOn = on; },
    maos(m) { maos = m; },
    realinharRosto() { levarRosto(); },
    rosto(a, k = 1) {
      vrm.scene.scale.setScalar(escala * (a ? k : 1));
      if (a && !ancoraRosto) vrm.scene.traverse((x) => {
        const m = x as THREE.Mesh; if (!m.isMesh) return;
        for (const mt of Array.isArray(m.material) ? m.material : [m.material]) if (mt.visible && !ehDoRosto(mt.name)) { mt.visible = false; escondidosRosto.push(mt); }
      });
      if (!a && ancoraRosto) { for (const mt of escondidosRosto) mt.visible = true; escondidosRosto.length = 0; vrm.scene.position.set(0, 0, 0); }
      if (a && !pescocoRosto) pescocoRosto = criarPescoco();
      if (pescocoRosto) pescocoRosto.visible = !!a;
      ancoraRosto = a;
      if (!olhoE || !olhoD) return 0;
      olhoE.updateWorldMatrix(true, false); olhoD.updateWorldMatrix(true, false);
      return pO.setFromMatrixPosition(olhoE.matrixWorld).distanceTo(pAlvo.setFromMatrixPosition(olhoD.matrixWorld));
    },
    detalhe(on) { if (on && !detalhe) voltouDetalhe = true; detalhe = on; },
    dispose() {
      vrm.scene.removeFromParent();
      if (modelo.updateMatrixWorld === semPassada) delete (modelo as { updateMatrixWorld?: unknown }).updateMatrixWorld;   // volta ao do protótipo
    },
  };
}
