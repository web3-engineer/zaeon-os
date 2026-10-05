/**
 * AvatarLuz (Avatar3D do cyberespaço) — o "ser de luz" (HANDOFF lounge cósmico §1): CORPO HUMANO real (GLB rigado
 * com animações Idle/Walk/Run). É um ser de LUZ (aura clara em volta, viseira luminosa, neurônios) com ARMADURA de
 * uma cor (lib/cyber/cores: a sua é azul; as dos outros, outras cores — futuramente cosmético do perfil). Componente ISOLADO: trocar o asset (Ready Player Me/Mixamo self-hostado) é só trocar a URL
 * (`NEXT_PUBLIC_CYBER_AVATAR_GLB`), sem refatorar a cena. Vários avatares = `SkeletonUtils.clone` (um
 * AnimationMixer cada) — nunca `.clone()` cru.
 *
 * Convenção do modelo de referência (Soldier.glb): encara -Z em rotation 0 → o grupo gira para `facing + π`
 * (anti-moonwalk); `facing` aqui é `atan2(dx, dz)` da direção de movimento.
 */
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as skClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { COR_LUZ } from "@/lib/cyber/cores";

/** Modelo de referência de teste (three.js examples). Em produção, hospede um GLB humano próprio e aponte a env. */
export const AVATAR_GLB_REFERENCIA = "https://threejs.org/examples/models/gltf/Soldier.glb";
export const avatarGlbUrl = (): string => process.env.NEXT_PUBLIC_CYBER_AVATAR_GLB || AVATAR_GLB_REFERENCIA;

let cache: { url: string; p: Promise<GLTF> } | null = null;
/** Carrega o GLB uma vez (todos os avatares clonam dele). */
export function carregarModeloAvatar(url = avatarGlbUrl()): Promise<GLTF> {
  if (cache?.url === url) return cache.p;
  const p = new GLTFLoader().loadAsync(url);
  cache = { url, p }; p.catch(() => { if (cache?.p === p) cache = null; });
  return p;
}

export type AvatarLuzHandle = {
  group: THREE.Group;
  /** meshes do corpo (raycast do clique). */
  meshes: THREE.Object3D[];
  /** Idle/Walk/Run em crossfade + neurônios + `sentado` (0..1) = na própria base: em pé no painel holográfico,
   *  DIGITANDO (braços baixos e pra frente, mãos batendo de leve) — a interação energética com as telas; aura pulsa.
   *  `meditando` (0..1) = descanso (vista de fora, antes de entrar): flutuando de pernas cruzadas, mãos nos joelhos.
   *  `pilotando` (0..1) = sentado no assento da cabine da nave: coxas na horizontal, canelas pra baixo, mãos nos manches.
   *  `jato` (0..1) = mochila a jato acesa (voando): as chamas dos dois propulsores crescem.
   *  `ar` = no ar de mochila: PLANANDO (jatos acesos: corpo inclinado pra frente quando anda, braços abertos pra trás,
   *  pernas dobradas) ou em QUEDA LIVRE (caindo rápido: braços pra cima, joelhos dobrados); ao tocar o chão, um
   *  agachamento curto de POUSO. */
  animar(o: { andando: boolean; correndo?: boolean; sentado?: number; meditando?: number; pilotando?: number; jato?: number; ar?: { vy: number; movendo: boolean } | null; dt: number; t: number }): void;
  /** `facing` = atan2(dx, dz) do movimento (a conversão pro modelo é interna). */
  olharPara(facing: number): void;
  /** Troca a cor da armadura (cosmético / ordem canônica chegou depois). */
  recolorir(hex: string): void;
  dispose(): void;
};

/** quanto o corpo desce pra sentar no assento da cabine (quadril de pé ≈ 1 m → sentado ≈ 0,55 m) */
const SENTA_Y = 0.45;
const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const achar = (clips: THREE.AnimationClip[], re: RegExp) => clips.find((c) => re.test(c.name)) ?? clips[0];

export function criarAvatarLuz(armaduraHex: string, starTex: THREE.Texture, low: boolean, gltf: GLTF | null): AvatarLuzHandle {
  const armadura = new THREE.Color(armaduraHex), luz = new THREE.Color(COR_LUZ), parado = reducedMotion();
  const grupo = new THREE.Group();
  const corpo = new THREE.Group(); grupo.add(corpo);   // sentar: inclina/abaixa o corpo; o grupo guarda posição/yaw
  const meshes: THREE.Object3D[] = [];
  const matArmadura = new THREE.MeshStandardMaterial({ color: armadura.clone().multiplyScalar(0.5), emissive: armadura, emissiveIntensity: 0.65, roughness: 0.4, metalness: 0.35 });
  const matViseira = new THREE.MeshBasicMaterial({ color: luz });                       // a "luz" do rosto
  // AURA: casca inflada (back-face, aditiva) em volta do corpo — o que faz dele um ser de luz
  const matAura = new THREE.MeshBasicMaterial({ color: luz, transparent: true, opacity: 0.62, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide });
  matAura.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n transformed += normalize(normal) * 0.05;"); };
  let mixer: THREE.AnimationMixer | null = null;
  // braços (rig mixamo do GLB): quando sentado, apontam pra tela — sem os ossos, só a aura pulsa
  const ossos: { braco: THREE.Bone; ante: THREE.Bone; mao: THREE.Object3D; lado: 1 | -1 }[] = [];
  const pernas: { coxa: THREE.Bone; canela: THREE.Bone; pe: THREE.Object3D; lado: 1 | -1 }[] = [];
  let espinha: THREE.Object3D | null = null;   // a mochila acompanha o tronco (anda, senta, medita)
  let idle: THREE.AnimationAction | null = null, walk: THREE.AnimationAction | null = null, run: THREE.AnimationAction | null = null;

  if (gltf) {
    const modelo = skClone(gltf.scene);
    modelo.scale.setScalar(1.15);
    const cascas: THREE.Mesh[] = [];
    modelo.traverse((o) => {
      const m = o as THREE.Mesh; if (!m.isMesh) return;
      m.frustumCulled = false;
      if (/visor/i.test(m.name)) { m.material = matViseira; return; }   // viseira = luz; o resto = armadura
      m.material = matArmadura; meshes.push(m);
      if (low) return;   // celular: sem a casca de aura (é uma 2ª malha com skinning por avatar); a armadura já é emissiva
      const sk = m as THREE.SkinnedMesh;
      let casca: THREE.Mesh;
      if (sk.isSkinnedMesh) { const c = new THREE.SkinnedMesh(m.geometry, matAura); c.bind(sk.skeleton, sk.bindMatrix); casca = c; }
      else casca = new THREE.Mesh(m.geometry, matAura);
      casca.frustumCulled = false; casca.renderOrder = 2; cascas.push(casca); casca.userData.pai = m.parent;
    });
    for (const c of cascas) (c.userData.pai as THREE.Object3D).add(c);
    corpo.add(modelo);
    for (const [lado, nome] of [[1, "Left"], [-1, "Right"]] as const) {
      const braco = modelo.getObjectByName(`mixamorig${nome}Arm`) as THREE.Bone | undefined, ante = modelo.getObjectByName(`mixamorig${nome}ForeArm`) as THREE.Bone | undefined, mao = modelo.getObjectByName(`mixamorig${nome}Hand`);
      if (braco && ante && mao) ossos.push({ braco, ante, mao, lado });
      const coxa = modelo.getObjectByName(`mixamorig${nome}UpLeg`) as THREE.Bone | undefined, canela = modelo.getObjectByName(`mixamorig${nome}Leg`) as THREE.Bone | undefined, pe = modelo.getObjectByName(`mixamorig${nome}Foot`);
      if (coxa && canela && pe) pernas.push({ coxa, canela, pe, lado });
    }
    espinha = modelo.getObjectByName("mixamorigSpine2") ?? null;
    if (gltf.animations.length) {
      mixer = new THREE.AnimationMixer(modelo);
      const cl = gltf.animations;
      idle = mixer.clipAction(achar(cl, /idle/i)!); walk = mixer.clipAction(achar(cl, /walk/i)!); run = mixer.clipAction(achar(cl, /run/i) ?? walk.getClip());
      idle.play(); walk.play(); run.play(); walk.setEffectiveWeight(0); run.setEffectiveWeight(0); idle.setEffectiveWeight(1);
    }
  }

  // MOCHILA A JATO nas costas (+z do grupo: a frente do modelo é o −z) com dois propulsores apontando pra baixo
  const mochila = new THREE.Group(); mochila.position.set(0, 1.22, 0.24); corpo.add(mochila);
  const matMochila = new THREE.MeshStandardMaterial({ color: 0x1a2440, roughness: 0.35, metalness: 0.55, emissive: armadura.clone().multiplyScalar(0.3), emissiveIntensity: 0.7 });
  const caixa = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.17), matMochila); mochila.add(caixa);
  const frisoMochila = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.01), new THREE.MeshBasicMaterial({ color: luz })); frisoMochila.position.z = 0.09; mochila.add(frisoMochila);
  const texJato = new THREE.CanvasTexture((() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d")!; const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(150,230,255,.8)"); gr.addColorStop(1, "rgba(60,140,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c; })());
  const jatos: { chama: THREE.Mesh; brilho: THREE.Sprite }[] = [];
  const BOCAL_Y = -0.29;
  for (const lado of [-1, 1]) {
    // bocais pequenos, logo abaixo da mochila
    const bocal = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.09, 12), matMochila); bocal.position.set(lado * 0.12, BOCAL_Y, 0.02); mochila.add(bocal);
    const chama = new THREE.Mesh(new THREE.ConeGeometry(0.042, 1, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    chama.rotation.x = Math.PI; chama.position.set(lado * 0.12, BOCAL_Y - 0.05, 0.02); chama.visible = false; mochila.add(chama);
    const brilho = new THREE.Sprite(new THREE.SpriteMaterial({ map: texJato, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); brilho.position.set(lado * 0.12, BOCAL_Y - 0.06, 0.02); brilho.visible = false; mochila.add(brilho);
    jatos.push({ chama, brilho });
  }
  let jatoS = 0, wPlana = 0, wQueda = 0, pouso = 0, inclinaVoo = 0, estavaNoAr = false;

  // neurônios: ~240 em anel (raio 0.3–0.8, y 0.2–1.8), pulsando e girando devagar
  const n = low ? 80 : 150, np = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const y = 0.2 + Math.random() * 1.6, r = 0.3 + Math.random() * 0.5, a = Math.random() * 6.28; np[i * 3] = Math.cos(a) * r; np[i * 3 + 1] = y; np[i * 3 + 2] = Math.sin(a) * r; }
  const ng = new THREE.BufferGeometry(); ng.setAttribute("position", new THREE.BufferAttribute(np, 3));
  const neu = new THREE.Points(ng, new THREE.PointsMaterial({ size: 0.12, map: starTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: luz.clone().lerp(armadura, 0.3) }));
  grupo.add(neu);

  let alvo = 0, wWalk = 0, wRun = 0;
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), dirAlvo = new THREE.Vector3(), qPai = new THREE.Quaternion(), qOsso = new THREE.Quaternion(), qDelta = new THREE.Quaternion();
  /** gira `osso` (em espaço de mundo) pra que o segmento osso→filho aponte pra `dir`, misturando com o pose da animação */
  const apontar = (osso: THREE.Object3D, filho: THREE.Object3D, dir: THREE.Vector3, w: number) => {
    osso.updateWorldMatrix(true, false); filho.updateWorldMatrix(false, false);
    osso.getWorldPosition(vA); filho.getWorldPosition(vB);
    const atual = vB.sub(vA).normalize();
    qDelta.setFromUnitVectors(atual, dir);
    osso.getWorldQuaternion(qOsso); osso.parent!.getWorldQuaternion(qPai);
    const alvoLocal = qPai.invert().multiply(qDelta.multiply(qOsso));
    osso.quaternion.slerp(alvoLocal, w);
    osso.updateWorldMatrix(false, true);
  };
  const frente = new THREE.Vector3(), lateral = new THREE.Vector3(), cima = new THREE.Vector3(0, 1, 0), qG = new THREE.Quaternion();
  return {
    group: grupo, meshes,
    animar({ andando, correndo, sentado = 0, meditando = 0, pilotando = 0, jato = 0, ar = null, dt, t }) {
      const k = Math.min(1, dt * 8), corre = !!correndo && andando;
      wWalk += ((andando && !corre ? 1 : 0) - wWalk) * k; wRun += ((corre ? 1 : 0) - wRun) * k;
      if (mixer && idle && walk && run) { walk.setEffectiveWeight(wWalk); run.setEffectiveWeight(wRun); idle.setEffectiveWeight(Math.max(0, 1 - wWalk - wRun)); mixer.update(dt); }
      let d = alvo - grupo.rotation.y; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      grupo.rotation.y += d * 0.15;
      // na base: em pé, levemente inclinado pro painel; meditando: abaixa (pernas cruzadas) e flutua devagar
      corpo.position.set(0, meditando * (-0.5 + (parado ? 0 : 0.06 * Math.sin(t * 1.1))) - SENTA_Y * pilotando, 0); corpo.rotation.x = -0.07 * sentado + 0.08 * pilotando;
      if ((ossos.length || pernas.length) && pilotando > 0.02) {
        grupo.updateWorldMatrix(true, false); grupo.getWorldQuaternion(qG);
        frente.set(0, 0, -1).applyQuaternion(qG); lateral.crossVectors(cima, frente).normalize();
        for (const o of pernas) {
          dirAlvo.copy(frente).multiplyScalar(1).addScaledVector(cima, -0.06).addScaledVector(lateral, 0.1 * o.lado).normalize(); apontar(o.coxa, o.canela, dirAlvo, pilotando);   // coxa: pra frente
          dirAlvo.copy(cima).multiplyScalar(-1).addScaledVector(frente, 0.2).normalize(); apontar(o.canela, o.pe, dirAlvo, pilotando);   // canela: pra baixo
        }
        for (const o of ossos) {
          dirAlvo.copy(cima).multiplyScalar(-0.8).addScaledVector(frente, 0.5).addScaledVector(lateral, 0.15 * o.lado).normalize(); apontar(o.braco, o.ante, dirAlvo, pilotando);
          dirAlvo.copy(frente).multiplyScalar(0.92).addScaledVector(cima, -0.15).addScaledVector(lateral, 0.05 * o.lado).normalize(); apontar(o.ante, o.mao, dirAlvo, pilotando);   // mãos nos manches
        }
      }
      if ((ossos.length || pernas.length) && meditando > 0.02) {
        grupo.updateWorldMatrix(true, false); grupo.getWorldQuaternion(qG);
        frente.set(0, 0, -1).applyQuaternion(qG); lateral.crossVectors(cima, frente).normalize();   // lateral·lado = pra fora
        for (const o of pernas) {
          dirAlvo.copy(frente).multiplyScalar(0.8).addScaledVector(lateral, 0.55 * o.lado).addScaledVector(cima, -0.08).normalize();   // coxa: pra frente e pra fora
          apontar(o.coxa, o.canela, dirAlvo, meditando);
          dirAlvo.copy(lateral).multiplyScalar(-0.92 * o.lado).addScaledVector(frente, 0.3).addScaledVector(cima, -0.1).normalize();   // canela: cruza pro centro
          apontar(o.canela, o.pe, dirAlvo, meditando);
        }
        for (const o of ossos) {
          dirAlvo.copy(cima).multiplyScalar(-0.85).addScaledVector(lateral, 0.32 * o.lado).addScaledVector(frente, 0.25).normalize();   // braço: solto, um pouco aberto
          apontar(o.braco, o.ante, dirAlvo, meditando);
          dirAlvo.copy(frente).multiplyScalar(0.72).addScaledVector(cima, -0.45).addScaledVector(lateral, 0.28 * o.lado).normalize();   // antebraço: mãos nos joelhos
          apontar(o.ante, o.mao, dirAlvo, meditando);
        }
      }
      // ── VOO de mochila: planando / queda livre / pouso (misturados com o idle) ──
      const kv = Math.min(1, dt * 5);
      const caindo = !!ar && ar.vy < -3 && jato < 0.5;
      wPlana += ((ar && !caindo ? 1 : 0) - wPlana) * kv; wQueda += ((caindo ? 1 : 0) - wQueda) * kv;
      if (estavaNoAr && !ar) pouso = 1;   // tocou o chão
      estavaNoAr = !!ar; pouso = Math.max(0, pouso - dt / 0.45);
      const imp = pouso * pouso * (3 - 2 * pouso);   // suaviza o agachamento
      // inclinação do voo: andando no ar deita pra frente (~43°, pose de quem voa); pairando, levemente; caindo, pra trás
      inclinaVoo += ((ar ? (ar.movendo && !caindo ? -0.75 : caindo ? 0.12 : -0.15) : 0) - inclinaVoo) * Math.min(1, dt * 3);
      const aVoo = inclinaVoo * Math.max(wPlana, wQueda), QUADRIL = 1.0;
      corpo.rotation.x += aVoo - 0.22 * imp;
      // gira em torno do QUADRIL (não dos pés): compensa o deslocamento do pivô
      corpo.position.z += -QUADRIL * Math.sin(aVoo); corpo.position.y += QUADRIL * (1 - Math.cos(aVoo));
      corpo.position.y += -0.32 * imp + (parado ? 0 : 0.05 * Math.sin(t * 2.3)) * wPlana;
      if ((ossos.length || pernas.length) && (wPlana > 0.02 || wQueda > 0.02 || imp > 0.02)) {
        grupo.updateWorldMatrix(true, false); grupo.getWorldQuaternion(qG);
        frente.set(0, 0, -1).applyQuaternion(qG); lateral.crossVectors(cima, frente).normalize();
        const ondula = parado ? 0 : 0.05 * Math.sin(t * 2.3);
        for (const o of ossos) {
          if (wPlana > 0.02) {   // planando: braços abertos, pra trás ao longo do corpo (mais pra trás quanto mais deitado)
            const tras = -0.35 + 0.6 * Math.min(0, inclinaVoo);
            dirAlvo.copy(cima).multiplyScalar(-0.7 + ondula).addScaledVector(lateral, 0.5 * o.lado).addScaledVector(frente, tras).normalize(); apontar(o.braco, o.ante, dirAlvo, wPlana);
            dirAlvo.copy(cima).multiplyScalar(-0.5).addScaledVector(lateral, 0.55 * o.lado).addScaledVector(frente, tras - 0.05).normalize(); apontar(o.ante, o.mao, dirAlvo, wPlana);
          }
          if (wQueda > 0.02) {   // queda livre: braços pra cima e abertos
            dirAlvo.copy(cima).multiplyScalar(0.65).addScaledVector(lateral, 0.7 * o.lado).normalize(); apontar(o.braco, o.ante, dirAlvo, wQueda);
            dirAlvo.copy(cima).multiplyScalar(0.85).addScaledVector(lateral, 0.35 * o.lado).addScaledVector(frente, 0.1).normalize(); apontar(o.ante, o.mao, dirAlvo, wQueda);
          }
          if (imp > 0.02) {   // pouso: braços um pouco à frente pra equilibrar
            dirAlvo.copy(cima).multiplyScalar(-0.6).addScaledVector(frente, 0.55).addScaledVector(lateral, 0.35 * o.lado).normalize(); apontar(o.braco, o.ante, dirAlvo, imp);
          }
        }
        for (const o of pernas) {
          if (wPlana > 0.02) {   // planando: pernas juntas, arrastando pra trás do corpo inclinado; joelhos levemente dobrados
            const deita = Math.min(0, inclinaVoo);   // 0 pairando … −0,75 voando pra frente
            dirAlvo.copy(cima).multiplyScalar(-0.95 - 0.2 * deita).addScaledVector(frente, 0.1 + 0.85 * deita).addScaledVector(lateral, 0.04 * o.lado).normalize(); apontar(o.coxa, o.canela, dirAlvo, wPlana);
            dirAlvo.copy(cima).multiplyScalar(-0.8 - 0.1 * deita).addScaledVector(frente, -0.5 + 0.6 * deita).normalize(); apontar(o.canela, o.pe, dirAlvo, wPlana);
          }
          if (wQueda > 0.02) {   // queda: joelhos pra frente, prontos pra pousar
            dirAlvo.copy(cima).multiplyScalar(-0.75).addScaledVector(frente, 0.55).addScaledVector(lateral, 0.12 * o.lado).normalize(); apontar(o.coxa, o.canela, dirAlvo, wQueda);
            dirAlvo.copy(cima).multiplyScalar(-0.9).addScaledVector(frente, -0.35).normalize(); apontar(o.canela, o.pe, dirAlvo, wQueda);
          }
          if (imp > 0.02) {   // pouso: agacha (coxas pra frente, canelas verticais)
            dirAlvo.copy(cima).multiplyScalar(-0.5).addScaledVector(frente, 0.85).addScaledVector(lateral, 0.15 * o.lado).normalize(); apontar(o.coxa, o.canela, dirAlvo, imp);
            dirAlvo.copy(cima).multiplyScalar(-0.95).addScaledVector(frente, -0.25).normalize(); apontar(o.canela, o.pe, dirAlvo, imp);
          }
        }
      }
      // mochila presa às costas: segue o osso do tronco (em espaço do corpo), 0,22 m atrás
      if (espinha) { corpo.updateWorldMatrix(true, false); espinha.updateWorldMatrix(true, false); espinha.getWorldPosition(vA); corpo.worldToLocal(vA); mochila.position.set(vA.x, vA.y - 0.08, vA.z + 0.22); }
      // propulsores: chama + brilho crescem com o jato (suave; sem piscar)
      jatoS += (jato - jatoS) * Math.min(1, dt * 6);
      for (const j of jatos) {
        const on = jatoS > 0.02, tremor = parado ? 1 : 0.9 + 0.1 * Math.sin(t * 9 + j.chama.position.x * 20);
        j.chama.visible = j.brilho.visible = on;
        if (on) { const h = (0.12 + 0.26 * jatoS) * tremor; j.chama.scale.set(1, h, 1); j.chama.position.y = BOCAL_Y - 0.045 - h / 2; j.brilho.scale.setScalar(0.12 + 0.18 * jatoS); (j.brilho.material as THREE.SpriteMaterial).opacity = 0.45 + 0.4 * jatoS; }
      }
      // interação energética (na base): DIGITANDO no painel — braços baixos e pra frente, mãos batendo alternado
      if (ossos.length && sentado > 0.02) {
        grupo.updateWorldMatrix(true, false); grupo.getWorldQuaternion(qG);
        frente.set(0, 0, -1).applyQuaternion(qG);   // o grupo gira f+π (olharPara): a frente do modelo é o −z do grupo
        lateral.crossVectors(cima, frente).normalize();
        for (const o of ossos) {
          const tecla = parado ? 0 : 0.07 * Math.sin(t * 7 + (o.lado > 0 ? 0 : Math.PI)) + 0.03 * Math.sin(t * 11.3 + o.lado);
          // braço: desce rente ao corpo, um pouco à frente
          dirAlvo.copy(frente).multiplyScalar(0.55).addScaledVector(cima, -0.8).addScaledVector(lateral, 0.12 * o.lado).normalize();
          apontar(o.braco, o.ante, dirAlvo, sentado);
          // antebraço: pra frente, mãos sobre o painel
          dirAlvo.copy(frente).multiplyScalar(0.95).addScaledVector(cima, -0.34 + tecla).addScaledVector(lateral, -0.1 * o.lado).normalize();
          apontar(o.ante, o.mao, dirAlvo, sentado);
        }
      }
      matAura.opacity = 0.62 + Math.max(sentado, meditando) * 0.25 * (0.5 + 0.5 * Math.sin(t * (meditando > sentado ? 0.9 : 2)));
      (neu.material as THREE.PointsMaterial).size = 0.1 + 0.05 * Math.sin(t * 2 + grupo.position.x);
      neu.rotation.y += dt * 0.5;
    },
    olharPara(f) { alvo = f + Math.PI; },
    recolorir(hex) { armadura.set(hex); matArmadura.color.copy(armadura).multiplyScalar(0.5); matArmadura.emissive.copy(armadura); matMochila.emissive.copy(armadura).multiplyScalar(0.3); (neu.material as THREE.PointsMaterial).color.copy(luz).lerp(armadura, 0.3); },
    dispose() {
      mixer?.stopAllAction(); matArmadura.dispose(); matViseira.dispose(); matAura.dispose(); ng.dispose(); (neu.material as THREE.Material).dispose();
      mochila.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); const mt = (m as { material?: THREE.Material }).material; if (mt && mt !== matArmadura) mt.dispose(); }); texJato.dispose();
      grupo.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.geometry && !gltf) m.geometry.dispose(); });
      grupo.removeFromParent();
    },
  };
}
