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
import { amostrarPose, duracaoClipe, envelopePouso, misturar, type Dir3, type Pose } from "@/lib/cyber/poses";
import { impactoDoPouso } from "@/lib/cyber/jet";
import { bracosDaDecolagem, pesoHeroi, poseAlerta, poseDash, poseEmpunhaGuarda, poseEmpunhaSolta, poseGolpe, poseHeroi, poseSprint, type PoseAcao, type PoseEspada } from "@/lib/cyber/posesCombate";
import { fasesDeContato, pisadasEntre } from "@/lib/cyber/audio";
import { clone as skClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { COR_LUZ } from "@/lib/cyber/cores";
import { FIO, MESA_DJ, PALCO } from "@/lib/cyber/ceu";
import { AURA_NO_DESENHO, TINTA, estiloDe } from "@/lib/cyber/estiloAvatar";
import { corDesenho, materialTinta, materialToon, materialToonSimples } from "./AvatarAnime";
import { esconderOssosVazios, esferaRapida } from "./matrizes";
import type { VRM } from "@pixiv/three-vrm";
import { espelharNoVrm, medirRepouso, type EspelhoVrm, type Repouso } from "./AvatarVrm";
import { criarAsas, type AsasHandle } from "./AsasAnjo";
import { ASAS_INICIO, passoAsas, type ModoAsas } from "@/lib/cyber/asas";
import type { PoseVrm } from "@/lib/cyber/posesVrm";

/** o corpo DESENHADO (estilo anime — experimento, lib/cyber/estiloAvatar)? */
const desenhado = () => typeof window !== "undefined" && estiloDe(process.env.NEXT_PUBLIC_CYBER_AVATAR_ESTILO, window.location.search) === "anime";

/** Modelo de referência de teste (three.js examples). Em produção, hospede um GLB humano próprio e aponte a env. */
export const AVATAR_GLB_REFERENCIA = "https://threejs.org/examples/models/gltf/Soldier.glb";
export const avatarGlbUrl = (): string => process.env.NEXT_PUBLIC_CYBER_AVATAR_GLB || AVATAR_GLB_REFERENCIA;

let cache: { url: string; p: Promise<GLTF> } | null = null;
/** as fases do pé de cada GLB (medir custa 2×64 passos de animação — antes era refeito pra cada pessoa que entrava) */
const fasesPorModelo = new WeakMap<GLTF, { walk: number[]; run: number[] } | null>();
/** Carrega o GLB uma vez (todos os avatares clonam dele). */
export function carregarModeloAvatar(url = avatarGlbUrl()): Promise<GLTF> {
  if (cache?.url === url) return cache.p;
  const p = new GLTFLoader().loadAsync(url);
  cache = { url, p }; p.catch(() => { if (cache?.p === p) cache = null; });
  return p;
}

/** MONTADO numa moto voadora: o grupo do avatar vai no BANCO (o quadril encaixa ali) e mãos/pés são puxados por IK
 *  pros pontos da moto (mundo): punhos do guidão e pedaleiras. E = esquerda do piloto. */
export type Montado = { w: number; maoE: THREE.Vector3; maoD: THREE.Vector3; peE: THREE.Vector3; peD: THREE.Vector3 };

export type AvatarLuzHandle = {
  group: THREE.Group;
  /** a MOCHILA a jato (a multidão na GPU grava a matriz dela por quadro — components/cyber/MultidaoGPU) */
  mochila: THREE.Object3D;
  /** meshes do corpo (raycast do clique). */
  meshes: THREE.Object3D[];
  /** Idle/Walk/Run em crossfade + neurônios + `sentado` (0..1) = na própria base: em pé no painel holográfico,
   *  DIGITANDO (braços baixos e pra frente, mãos batendo de leve) — a interação energética com as telas; aura pulsa.
   *  `meditando` (0..1) = descanso (vista de fora, antes de entrar): flutuando de pernas cruzadas, mãos nos joelhos.
   *  `pilotando` (0..1) = sentado no assento da cabine da nave: coxas na horizontal, canelas pra baixo, mãos nos manches.
   *  `jato` (0..1) = mochila a jato acesa (voando): as chamas dos dois propulsores crescem.
   *  `ar` = no ar de mochila: PLANANDO (jatos acesos: corpo inclinado pra frente quando anda, braços abertos pra trás,
   *  pernas dobradas) ou em QUEDA LIVRE (caindo rápido: braços pra cima, joelhos dobrados); ao tocar o chão, um
   *  agachamento curto de POUSO.
   *  `dj` (0..1) = na CABINE do DJ do lounge: tira o FONE do pescoço e põe na cabeça, mãos na controladora (a esquerda
   *  faz scratch, a direita mexe nos knobs e de vez em quando segura a concha pra ouvir a próxima), balançando no
   *  compasso (joelhos dobram, cabeça acena). Numa sequência de ~16 s ele também LEVANTA OS BRAÇOS pro alto, faz a
   *  POSE DE MAL (uma mão na concha, a outra apontando pra pista, queixo pra cima) e dá SOCOS NO AR no tempo.
   *  `danca` (0..1) = parado na PISTA do lounge: DANÇA (joelhos no compasso, quadril balançando e uma sequência de
   *  passos: braços alternando pro alto, as duas mãos pro alto acenando, balanço com os cotovelos e pulinho).
   *  `surf` (0..1) = sendo levado pela ESCADA DE ENERGIA: em pé numa PRANCHA DE LUZ (rastro de faíscas atrás), de lado,
   *  joelhos dobrados, braços abertos se equilibrando — e no meio da viagem dá um 360 com os braços pro alto.
   *  `puxado` (0..1) = sendo PUXADO por um FIO DE ENERGIA (lib/cyber/ceu `FIO`): pendurado na ALÇA de luz (os dois braços
   *  pro alto segurando a barra, um gancho subindo até o cabo), pernas juntas um pouco pra frente, balançando de leve.
   *  `descanso` = no LOUNGE (lib/cyber/descanso): `sentar` (0..1) SENTADO no sofá/puff (o quadril desce até a almofada
   *  em `assentoY`, coxas pra frente, encostado), `deitar` (0..1) DEITADO no sofá (de costas, ao longo dele, a cabeça no
   *  braço, um joelho dobrado); `relaxa` (0..1) = no PUFE grande, a pose BEM RELAXADA (afundado e reclinado, pernas
   *  esticadas e abertas, mãos atrás da cabeça). Sentado, os PÉS ficam no chão na frente do móvel (IK — as canelas não
   *  atravessam a frente do sofá). `tablet` (0..1) = o TABLET se materializando nas mãos (partículas → tablet aceso): com
   *  ele, os braços seguram o tablet e a cabeça olha pra tela — em pé, sentado ou deitado. */
  animar(o: { andando: boolean; correndo?: boolean; sentado?: number; meditando?: number; pilotando?: number; jato?: number; ar?: { vy: number; movendo: boolean; /** velocidade no plano (m/s) — o voo turbo deita o corpo */ vel?: number } | null; /** as poses de AÇÃO (lib/cyber/posesCombate): pesos 0..1 do sprint, do dash e do alerta (`alertaT` = s desde o dash — o fôlego); `heroi` = s desde o HERO LANDING (ou null); `decola` = a decolagem com impulso (s desde o comando e o agachamento) */ acao?: { sprint: number; dash: number; alerta: number; alertaT?: number; heroi?: number | null; decola?: { t: number; espera: number } | null; /** a ESPADA na mão: o golpe do combo agora (fase 0..1 e a janela que corta) e o peso da guarda */ espada?: { golpe: { n: 1 | 2 | 3; u: number; ativo: [number, number] } | null; guarda: number } | null } | null; montado?: Montado | null; dj?: number; danca?: number; surf?: number; puxado?: number; descanso?: { sentar: number; deitar: number; assentoY: number; relaxa?: number } | null; tablet?: number; dt: number; t: number }): void;
  /** quantas PISADAS (pé encostando no chão na animação de andar/correr) desde a última chamada — o som do passo
   *  sai no compasso do pé; `null` = avatar sem pés (sem o modelo): o engine usa a cadência fixa */
  passosNovos(): number | null;
  /** `facing` = atan2(dx, dz) do movimento (a conversão pro modelo é interna). */
  olharPara(facing: number): void;
  /** Troca a cor da armadura (cosmético / ordem canônica chegou depois). */
  recolorir(hex: string): void;
  /** liga/desliga a AURA (a 2ª malha com skinning — a qualidade adaptativa tira quando a máquina sofre) */
  aura(on: boolean): void;
  /** troca o corpo pelo de um VRM (components/cyber/AvatarVrm) — o esqueleto do GLB continua animando por baixo */
  usarVrm(vrm: VRM, o?: { /** personagem (NPC): o esqueleto escondido sai da passada de matrizes da cena (AvatarVrm) */ economico?: boolean }): void;
  /** tira o corpo VRM (ele continua escondendo o padrão — esperarCorpo): o VRM é solto por quem o carregou */
  soltarVrm(): void;
  /** esconde o corpo PADRÃO enquanto o VRM próprio carrega (sem o padrão aparecer antes); false = mostra de novo
   *  (o VRM falhou) */
  esperarCorpo(on: boolean): void;
  /** ASAS NEGRAS no lugar da mochila a jato (components/cyber/AsasAnjo) — o voo é o mesmo. `escala` < 1 encolhe
   *  (a vitrine do Perfil: abertas, elas têm ~3 m de envergadura) */
  usarAsas(o?: { escala?: number }): void;
  /** uma POSE própria no corpo VRM (lib/cyber/posesVrm — ex.: a feminina dos personagens parados); null = a do esqueleto */
  poseVrm(p: PoseVrm | null): void;
  /** corpo VRM: perto (true) roda a física do cabelo/roupa; longe pula (components/cyber/AvatarVrm `detalhe`) */
  detalheVrm(on: boolean): void;
  /** sem a mochila a jato (os PERSONAGENS com corpo VRM próprio — a Nina…): o voo deles é outro assunto */
  semMochila(): void;
  /** a ARMA na mão direita (a espada — components/cyber/EspadaEspiritual): o avatar a põe na mão a cada `animar`, com
   *  a lâmina pra onde a pose manda (null = solta) */
  empunhar(obj: THREE.Object3D | null): void;
  /** o que as asas fizeram desde a última chamada (o engine toca os sons); null = sem asas */
  eventosAsas(): { bateu: number; abriu: boolean; fechou: boolean; modo: ModoAsas } | null;
  dispose(): void;
};

/** quanto o corpo desce pra sentar no assento da cabine (quadril de pé ≈ 1 m → sentado ≈ 0,55 m) */
const SENTA_Y = 0.45;
const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const achar = (clips: THREE.AnimationClip[], re: RegExp) => clips.find((c) => re.test(c.name)) ?? clips[0];

/** `o.anime` força o estilo (a vitrine do Perfil é sempre DESENHADA, independente da flag do cyberespaço) */
export function criarAvatarLuz(armaduraHex: string, starTex: THREE.Texture, low: boolean, gltf: GLTF | null, o: { anime?: boolean } = {}): AvatarLuzHandle {
  const armadura = new THREE.Color(armaduraHex), luz = new THREE.Color(COR_LUZ), parado = reducedMotion();
  const grupo = new THREE.Group();
  const corpo = new THREE.Group(); grupo.add(corpo);   // sentar: inclina/abaixa o corpo; o grupo guarda posição/yaw
  const meshes: THREE.Object3D[] = [];
  const anime = o.anime ?? desenhado();
  const matArmadura: THREE.MeshStandardMaterial | THREE.MeshToonMaterial = anime ? materialToon(armadura, luz) : new THREE.MeshStandardMaterial({ color: armadura.clone().multiplyScalar(0.5), emissive: armadura, emissiveIntensity: 0.65, roughness: 0.4, metalness: 0.35 });
  const matTinta = anime ? materialTinta() : null;   // o contorno de tinta do desenho
  const matViseira = new THREE.MeshBasicMaterial({ color: luz });                       // a "luz" do rosto
  // AURA: casca inflada (back-face, aditiva) em volta do corpo — o que faz dele um ser de luz
  const matAura = new THREE.MeshBasicMaterial({ color: luz, transparent: true, opacity: 0.62, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide });
  matAura.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n transformed += normalize(normal) * 0.05;"); };
  let escondidos: THREE.Object3D[] | null = null, poseVrm: PoseVrm | null = null;   // o corpo padrão escondido esperando o VRM (esperarCorpo)
  let mixer: THREE.AnimationMixer | null = null, modeloMx: THREE.Object3D | null = null, repouso: Repouso | null = null, espelho: EspelhoVrm | null = null;
  let asas: AsasHandle | null = null, estAsas = ASAS_INICIO, evAsas = { bateu: 0, abriu: false, fechou: false, modo: "chao" as ModoAsas };
  const aurasMalha: THREE.Mesh[] = [];
  // braços (rig mixamo do GLB): quando sentado, apontam pra tela — sem os ossos, só a aura pulsa
  const ossos: { braco: THREE.Bone; ante: THREE.Bone; mao: THREE.Object3D; lado: 1 | -1 }[] = [];
  const pernas: { coxa: THREE.Bone; canela: THREE.Bone; pe: THREE.Object3D; dedo: THREE.Object3D | null; lado: 1 | -1 }[] = [];
  let lombar: THREE.Bone | null = null, pescoco: THREE.Object3D | null = null, cabeca: THREE.Object3D | null = null, alturaQuadril = 1.0;   // o tronco das poses capturadas
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
      const sk = m as THREE.SkinnedMesh;
      if (matTinta) {   // anime: o CONTORNO vale até no celular (sem ele não é desenho)
        matTinta.espessar(m.geometry);
        let t: THREE.Mesh;
        if (sk.isSkinnedMesh) { const c = new THREE.SkinnedMesh(m.geometry, matTinta); c.bind(sk.skeleton, sk.bindMatrix); t = c; }
        else t = new THREE.Mesh(m.geometry, matTinta);
        t.frustumCulled = false; t.raycast = () => {}; t.userData.pai = m.parent; cascas.push(t);
      }
      if (low) return;   // celular: sem a casca de aura (é uma 2ª malha com skinning por avatar); a armadura já é emissiva
      let casca: THREE.Mesh;
      if (sk.isSkinnedMesh) { const c = new THREE.SkinnedMesh(m.geometry, matAura); c.bind(sk.skeleton, sk.bindMatrix); casca = c; }
      else casca = new THREE.Mesh(m.geometry, matAura);
      casca.frustumCulled = false; casca.renderOrder = 2; cascas.push(casca); casca.userData.pai = m.parent;
    });
    for (const c of cascas) (c.userData.pai as THREE.Object3D).add(c);
    aurasMalha.push(...cascas.filter((c) => c.material === matAura));
    corpo.add(modelo); modeloMx = modelo; repouso = medirRepouso(modelo, corpo);   // a pose T (pra um corpo VRM espelhar depois)
    for (const [lado, nome] of [[1, "Left"], [-1, "Right"]] as const) {
      const braco = modelo.getObjectByName(`mixamorig${nome}Arm`) as THREE.Bone | undefined, ante = modelo.getObjectByName(`mixamorig${nome}ForeArm`) as THREE.Bone | undefined, mao = modelo.getObjectByName(`mixamorig${nome}Hand`);
      if (braco && ante && mao) ossos.push({ braco, ante, mao, lado });
      const coxa = modelo.getObjectByName(`mixamorig${nome}UpLeg`) as THREE.Bone | undefined, canela = modelo.getObjectByName(`mixamorig${nome}Leg`) as THREE.Bone | undefined, pe = modelo.getObjectByName(`mixamorig${nome}Foot`);
      if (coxa && canela && pe) pernas.push({ coxa, canela, pe, dedo: modelo.getObjectByName(`mixamorig${nome}ToeBase`) ?? null, lado });
    }
    espinha = modelo.getObjectByName("mixamorigSpine2") ?? null;
    lombar = (modelo.getObjectByName("mixamorigSpine") as THREE.Bone | undefined) ?? null; pescoco = modelo.getObjectByName("mixamorigNeck") ?? null; cabeca = modelo.getObjectByName("mixamorigHead") ?? null;
    // altura do QUADRIL em pé (na pose de repouso): montado, o corpo desce isso pra o quadril cair no banco
    const quadril = modelo.getObjectByName("mixamorigHips");
    if (quadril) { grupo.updateMatrixWorld(true); alturaQuadril = quadril.getWorldPosition(new THREE.Vector3()).y - grupo.position.y; }
    if (gltf.animations.length) {
      mixer = new THREE.AnimationMixer(modelo);
      const cl = gltf.animations;
      idle = mixer.clipAction(achar(cl, /idle/i)!); walk = mixer.clipAction(achar(cl, /walk/i)!); run = mixer.clipAction(achar(cl, /run/i) ?? walk.getClip());
      idle.play(); walk.play(); run.play(); walk.setEffectiveWeight(0); run.setEffectiveWeight(0); idle.setEffectiveWeight(1);
    }
  }

  // MOCHILA A JATO nas costas (+z do grupo: a frente do modelo é o −z) com dois propulsores apontando pra baixo
  const mochila = new THREE.Group(); mochila.position.set(0, 1.22, 0.24); corpo.add(mochila);
  const matMochila = anime ? materialToonSimples(0x2a3a66, armadura.clone().multiplyScalar(0.2)) : new THREE.MeshStandardMaterial({ color: 0x1a2440, roughness: 0.35, metalness: 0.55, emissive: armadura.clone().multiplyScalar(0.3), emissiveIntensity: 0.7 });
  const caixa = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.17), matMochila); mochila.add(caixa);
  if (anime) { const traco = new THREE.Mesh(caixa.geometry, new THREE.MeshBasicMaterial({ color: TINTA.cor, side: THREE.BackSide })); traco.scale.set(1.07, 1.05, 1.14); mochila.add(traco); }   // o contorno da mochila (caixa: casca escalada)
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
  // FONE DE OUVIDO do DJ: arco + 2 conchas com aro de luz; só aparece na cabine (sai do pescoço e sobe pra cabeça).
  //  Eixos locais: x = de uma orelha à outra, y = pra cima (o arco passa por cima da cabeça)
  const fone = new THREE.Group(); fone.visible = false; grupo.add(fone);
  const matFone = anime ? materialToonSimples(0x262d44, armadura.clone().multiplyScalar(0.35)) : new THREE.MeshStandardMaterial({ color: 0x1a1f2e, roughness: 0.3, metalness: 0.5, emissive: armadura.clone().multiplyScalar(0.5), emissiveIntensity: 0.9 });
  const matLedFone = new THREE.MeshBasicMaterial({ color: luz, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const FONE_R = 0.12;
  fone.add(new THREE.Mesh(new THREE.TorusGeometry(FONE_R, 0.014, 6, 24, Math.PI), matFone));
  for (const sx of [-1, 1]) {
    const concha = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.05, 0.055, 16), matFone); concha.rotation.z = Math.PI / 2; concha.position.set(sx * FONE_R, -0.015, 0); fone.add(concha);
    const led = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.011, 4, 20), matLedFone); led.rotation.y = Math.PI / 2; led.position.set(sx * (FONE_R + 0.029), -0.015, 0); fone.add(led);
  }
  let tDj = 0, tSurf = 0;
  const vViaja = new THREE.Vector3(), vFrenteC = new THREE.Vector3();
  // a PRANCHA DE LUZ da escada de energia (no referencial do grupo: a frente da viagem é o −z) + o rastro de faíscas
  const prancha = new THREE.Group(); prancha.visible = false; grupo.add(prancha);
  const matPrancha = new THREE.MeshStandardMaterial({ color: 0x1a2440, roughness: 0.3, metalness: 0.6, emissive: armadura.clone().multiplyScalar(0.4), emissiveIntensity: 0.9 });
  const matLuzPrancha = new THREE.MeshBasicMaterial({ color: luz, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  prancha.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 1.5), matPrancha));
  for (const z of [-0.75, 0.75]) { const ponta = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.07, 16, 1, false, 0, Math.PI), matPrancha); ponta.position.z = z; ponta.rotation.y = z < 0 ? Math.PI / 2 : -Math.PI / 2; prancha.add(ponta); }
  const fitaPrancha = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 1.9), matLuzPrancha); fitaPrancha.position.y = 0.045; prancha.add(fitaPrancha);
  const brilhoPrancha = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.4), new THREE.MeshBasicMaterial({ color: luz, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  brilhoPrancha.rotation.x = -Math.PI / 2; brilhoPrancha.position.y = -0.06; prancha.add(brilhoPrancha);
  const NR = low ? 24 : 56, rastro = Array.from({ length: NR }, () => ({ f: Math.random(), x: (Math.random() - 0.5) * 0.5, y: Math.random() * 0.25 })), rPos = new Float32Array(NR * 3);
  const rGeo = new THREE.BufferGeometry(); rGeo.setAttribute("position", new THREE.BufferAttribute(rPos, 3));
  const faiscas = new THREE.Points(rGeo, new THREE.PointsMaterial({ size: 0.14, map: starTex, color: luz.clone().lerp(armadura, 0.4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  faiscas.visible = false; faiscas.frustumCulled = false; grupo.add(faiscas);
  const faseDanca = Math.random() * 8;   // cada um dança no seu tempo (a pista não fica sincronizada que nem robô)
  /** janela suave [a, b] (s) num ciclo — sobe/desce em 0,4 s */
  const janela = (c: number, a: number, b: number) => suave((c - a) / 0.4) * (1 - suave((c - (b - 0.4)) / 0.4));
  /** do DJ até onde as mãos pousam na mesa: a borda de trás da mesa + um pouco pra dentro (cai na controladora) */
  const DJ_ALCANCE = MESA_DJ.z - MESA_DJ.prof / 2 - PALCO.cabine.z + 0.17, DJ_MAO_Y = MESA_DJ.topo + 0.07, BPM_RAD = 2.1 * Math.PI * 2;
  let jatoS = 0, wAr = 0, wQueda = 0, wMov = 0, inclinaVoo = 0, estavaNoAr = false, tAr = 0, vyAr = 0, tPouso = -1, forcaPouso = 0;
  /** o voo mais REALISTA: a velocidade suavizada, o turbo (0..1), a freada (desacelerando: o corpo ergue) e a inclinação na curva */
  let velArS = 0, turboAr = 0, freioAr = 0, bancoVoo = 0;
  const PERNA = 0.95;   // comprimento da perna do avatar (m) — escala a altura do quadril das poses capturadas
  const DUR_POUSO = duracaoClipe("Jump_Land") * 0.8;

  // o TABLET (modo estudo): corpo fino escuro, tela acesa com o laboratório, halo; materializa de PARTÍCULAS que
  //  espiralam pra mão (lib/cyber/descanso `TABLET`). Fica no grupo: a cada quadro vai pro meio das mãos, virado pro rosto
  const tablet = new THREE.Group(); tablet.visible = false; grupo.add(tablet);
  const texTela = new THREE.CanvasTexture((() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 176; const g = c.getContext("2d")!;
    const gr = g.createLinearGradient(0, 0, 0, 176); gr.addColorStop(0, "#0a1f3d"); gr.addColorStop(1, "#04101f"); g.fillStyle = gr; g.fillRect(0, 0, 256, 176);
    g.fillStyle = "#66e6ff"; g.fillRect(0, 0, 256, 22); g.fillStyle = "#04101f"; g.font = "bold 13px system-ui, sans-serif"; g.fillText("ZAEON · LABORATÓRIO", 10, 15);
    g.fillStyle = "rgba(143,232,255,.85)"; for (let i = 0; i < 7; i++) g.fillRect(12, 38 + i * 17, 70 + ((i * 47) % 90), 6);
    g.strokeStyle = "#9fe8ff"; g.lineWidth = 3; g.beginPath(); g.arc(205, 92, 30, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(205, 92, 14, 0, Math.PI * 2); g.stroke();
    return c; })());
  texTela.colorSpace = THREE.SRGBColorSpace;
  const matTabCorpo = anime ? materialToonSimples(0x1a2238, armadura.clone().multiplyScalar(0.25)) : new THREE.MeshStandardMaterial({ color: 0x141a2c, roughness: 0.3, metalness: 0.7, emissive: armadura.clone().multiplyScalar(0.25), emissiveIntensity: 0.6 });
  const matTabTela = new THREE.MeshBasicMaterial({ map: texTela, transparent: true, opacity: 0 });
  const matTabHalo = new THREE.MeshBasicMaterial({ color: luz, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  tablet.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.21, 0.014), matTabCorpo));
  const telaTab = new THREE.Mesh(new THREE.PlaneGeometry(0.272, 0.186), matTabTela); telaTab.position.z = 0.0075; tablet.add(telaTab);
  const haloTab = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.48), matTabHalo); haloTab.position.z = -0.012; tablet.add(haloTab);
  const NPT = low ? 18 : 36, ptPos = new Float32Array(NPT * 3), ptGeo = new THREE.BufferGeometry(); ptGeo.setAttribute("position", new THREE.BufferAttribute(ptPos, 3));
  const matPtTab = new THREE.PointsMaterial({ size: 0.07, map: starTex, color: luz, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const particulasTab = new THREE.Points(ptGeo, matPtTab); particulasTab.frustumCulled = false; particulasTab.visible = false; grupo.add(particulasTab);
  // a ALÇA do fio de energia: uma barra de luz nas mãos + o gancho subindo até o cabo (no grupo; posta nas mãos a cada quadro)
  const alca = new THREE.Group(); alca.visible = false; grupo.add(alca);
  const matAlca = new THREE.MeshBasicMaterial({ color: luz, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const barraAlca = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.56, 8), matAlca); barraAlca.rotation.z = Math.PI / 2; alca.add(barraAlca);
  const ganchoAlca = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 6), matAlca); alca.add(ganchoAlca);
  const brilhoAlca = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), matAlca); alca.add(brilhoAlca);
  /** a altura do cabo acima dos pés de quem está pendurado (a mesma conta de lib/cyber/ceu: alturaFio − pes) */
  const CABO_ACIMA_DOS_PES = FIO.alturaFio - FIO.pes;
  const pTab = new THREE.Vector3(), pCab = new THREE.Vector3(), pMaoE = new THREE.Vector3(), pMaoD = new THREE.Vector3(), qC2 = new THREE.Quaternion(), fC = new THREE.Vector3(), uC = new THREE.Vector3(), lC = new THREE.Vector3();
  const voltaPraFora = (x: number) => { const c1 = 1.70158, c3 = c1 + 1, u = x - 1; return 1 + c3 * u * u * u + c1 * u * u; };   // ease-out-back (o tablet "estala" no lugar)

  // neurônios: ~240 em anel (raio 0.3–0.8, y 0.2–1.8), pulsando e girando devagar
  const n = low ? 80 : 150, np = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const y = 0.2 + Math.random() * 1.6, r = 0.3 + Math.random() * 0.5, a = Math.random() * 6.28; np[i * 3] = Math.cos(a) * r; np[i * 3 + 1] = y; np[i * 3 + 2] = Math.sin(a) * r; }
  const ng = new THREE.BufferGeometry(); ng.setAttribute("position", new THREE.BufferAttribute(np, 3));
  const neu = new THREE.Points(ng, new THREE.PointsMaterial({ size: 0.12, map: starTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: luz.clone().lerp(armadura, 0.3) }));
  grupo.add(neu);

  let alvo = 0, wWalk = 0, wRun = 0, pisadas = 0, uAnt = 0, acaoAnt: THREE.AnimationAction | null = null;
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), dirAlvo = new THREE.Vector3(), qPai = new THREE.Quaternion(), qOsso = new THREE.Quaternion(), qDelta = new THREE.Quaternion();
  /** as fases (0..1) do ciclo de andar/correr em que um pé encosta — medidas UMA vez da própria animação */
  const fasesPe = gltf && fasesPorModelo.has(gltf) ? fasesPorModelo.get(gltf)! : (() => {
    if (!mixer || !walk || !run || !idle || pernas.length < 2 || !gltf) return null;
    const medir = (a: THREE.AnimationAction) => {
      for (const x of [idle!, walk!, run!]) x.setEffectiveWeight(x === a ? 1 : 0);
      const d = a.getClip().duration, N = 64, alt: number[][] = pernas.map(() => []);
      for (let i = 0; i < N; i++) { mixer!.setTime(0); a.time = (d * i) / N; mixer!.update(0); grupo.updateMatrixWorld(true); const y0 = grupo.getWorldPosition(vA).y; pernas.forEach((o, k) => alt[k]!.push(o.pe.getWorldPosition(vB).y - y0)); }
      return fasesDeContato(alt);
    };
    const r = { walk: medir(walk), run: medir(run) };
    idle.setEffectiveWeight(1); walk.setEffectiveWeight(0); run.setEffectiveWeight(0); walk.time = run.time = idle.time = 0; mixer.update(0);
    fasesPorModelo.set(gltf, r);
    return r;
  })();
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
  const frente = new THREE.Vector3(), lateral = new THREE.Vector3(), cima = new THREE.Vector3(0, 1, 0), cimaC = new THREE.Vector3(), qG = new THREE.Quaternion();
  const fChao = new THREE.Vector3(), lChao = new THREE.Vector3();   // (os eixos do CHÃO: as poses de ação plantam os pés neles)
  let arma: THREE.Object3D | null = null;
  const pMao = new THREE.Vector3(), dLam = new THREE.Vector3(), dPla = new THREE.Vector3(), xLam = new THREE.Vector3(), mLam = new THREE.Matrix4(), qLam = new THREE.Quaternion(), qGrupo = new THREE.Quaternion();
  const pN = new THREE.Vector3(), pH = new THREE.Vector3(), cimaH = new THREE.Vector3(), latH = new THREE.Vector3(), zH = new THREE.Vector3(), pF = new THREE.Vector3(), mBase = new THREE.Matrix4(), qCab = new THREE.Quaternion(), qPesc = new THREE.Quaternion(), qInv = new THREE.Quaternion(), alvoM = new THREE.Vector3(), pGr = new THREE.Vector3(), pConcha = new THREE.Vector3(), pesFixos = [new THREE.Vector3(), new THREE.Vector3()];
  const suave = (x: number) => { const u = Math.max(0, Math.min(1, x)); return u * u * (3 - 2 * u); };
  const polo = new THREE.Vector3(), pA = new THREE.Vector3(), pB = new THREE.Vector3(), pC = new THREE.Vector3(), eixo = new THREE.Vector3(), lado2 = new THREE.Vector3(), cot = new THREE.Vector3();
  /** IK de 2 ossos (ombro→cotovelo→mão / quadril→joelho→pé): leva a ponta até `alvo` (mundo), dobrando pro lado do
   *  `polo`; se não alcança, estica na direção do alvo. Usa o `apontar` (mistura com o peso `w`). */
  const ik = (raiz: THREE.Object3D, meio: THREE.Object3D, ponta: THREE.Object3D, alvo: THREE.Vector3, poloDir: THREE.Vector3, w: number) => {
    raiz.updateWorldMatrix(true, true);
    raiz.getWorldPosition(pA); meio.getWorldPosition(pB); ponta.getWorldPosition(pC);
    const l1 = pA.distanceTo(pB), l2 = pB.distanceTo(pC);
    eixo.copy(alvo).sub(pA); const dist = Math.min(Math.max(eixo.length(), 1e-3), l1 + l2 - 1e-3); eixo.normalize();
    const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    lado2.copy(poloDir).addScaledVector(eixo, -poloDir.dot(eixo)); if (lado2.lengthSq() < 1e-8) lado2.set(0, -1, 0); lado2.normalize();
    cot.copy(pA).addScaledVector(eixo, a).addScaledVector(lado2, h);   // onde o cotovelo/joelho tem que ficar
    dirAlvo.copy(cot).sub(pA).normalize(); apontar(raiz, meio, dirAlvo, w);
    meio.getWorldPosition(pB); dirAlvo.copy(alvo).sub(pB).normalize(); apontar(meio, ponta, dirAlvo, w);
  };
  if (modeloMx) esconderOssosVazios(modeloMx);
  esferaRapida(grupo);   // (senão o 1º desenho deforma todos os vértices na CPU: jogador que entra = travada)   // os ~50 ossos do esqueleto sem nada pendurado: fora da lista de desenho (matrizes)
  return {
    group: grupo, meshes, mochila,
    animar({ andando, correndo, sentado = 0, meditando = 0, pilotando = 0, jato = 0, ar = null, acao = null, montado = null, dj = 0, danca = 0, surf = 0, puxado: wP = 0, descanso = null, tablet: wTab = 0, dt, t }) {
      const k = Math.min(1, dt * 8), corre = !!correndo && andando;
      wWalk += ((andando && !corre ? 1 : 0) - wWalk) * k; wRun += ((corre ? 1 : 0) - wRun) * k;
      if (mixer && idle && walk && run) { walk.setEffectiveWeight(wWalk); run.setEffectiveWeight(wRun); idle.setEffectiveWeight(Math.max(0, 1 - wWalk - wRun)); mixer.update(dt); }
      // PISADAS: o relógio da animação dominante (andar ou correr) cruzou a fase em que um pé encosta no chão
      if (walk && run && fasesPe) {
        const acao = wRun > wWalk ? run : walk, f = acao === run ? fasesPe.run : fasesPe.walk, u = (acao.time % acao.getClip().duration) / acao.getClip().duration;
        if (acao === acaoAnt && wWalk + wRun > 0.5 && !ar && sentado < 0.1 && !pilotando) pisadas += pisadasEntre(uAnt, u, f);
        acaoAnt = acao; uAnt = u;
      }
      let d = alvo - grupo.rotation.y; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      const giroAlvo = d;   // (quanto ainda falta virar: a curva — o voo inclina pra ela)
      grupo.rotation.y += d * 0.15;
      // na base: em pé, levemente inclinado pro painel; meditando: abaixa (pernas cruzadas) e flutua devagar
      corpo.position.set(0, meditando * (-0.5 + (parado ? 0 : 0.06 * Math.sin(t * 1.1))) - SENTA_Y * pilotando - (montado ? alturaQuadril * montado.w : 0), 0); corpo.rotation.x = -0.07 * sentado + 0.08 * pilotando;
      // DESCANSO: sentado, o quadril desce até a almofada (um tiquinho pra trás, encostando); deitado, o corpo gira pra
      // trás (rosto pro céu) em volta dos pés, centrado no sofá e apoiado na almofada — a cabeça um pouco mais alta
      const wS = descanso ? descanso.sentar : 0, wD = descanso ? descanso.deitar : 0, yAss = descanso?.assentoY ?? 0.7, wR = descanso?.relaxa ?? 0;
      if (wS > 0.005 || wD > 0.005) {
        corpo.position.y -= Math.max(0, alturaQuadril - (yAss + 0.08)) * wS; corpo.position.z += (0.06 + 0.1 * wR) * wS;
        corpo.rotation.x += (Math.PI / 2 - 0.2) * wD; corpo.position.y += (yAss + 0.2) * wD; corpo.position.z -= 0.92 * wD;
      }
      if (asas) { const enc = Math.max(wS, wD); asas.group.visible = enc < 0.98; asas.group.scale.setScalar((asas.group.userData.escala ?? 1) * Math.max(0.02, 1 - enc)); }   // sentado/deitado: as asas recolhem pra dentro das costas
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
      if ((ossos.length || pernas.length) && (wS > 0.01 || wD > 0.01 || wTab > 0.01)) {
        grupo.updateWorldMatrix(true, false); grupo.getWorldQuaternion(qG);
        frente.set(0, 0, -1).applyQuaternion(qG); lateral.crossVectors(cima, frente).normalize();   // lateral·lado = pra fora
        corpo.updateWorldMatrix(true, false); corpo.getWorldQuaternion(qC2);
        fC.set(0, 0, -1).applyQuaternion(qC2); uC.set(0, 1, 0).applyQuaternion(qC2); lC.crossVectors(uC, fC).normalize();   // eixos do CORPO (deitado: fC = pro céu, uC = rumo à cabeça)
        const respira = parado ? 0 : 0.03 * Math.sin(t * 1.4);
        const wEmPe = Math.max(0, 1 - wS - wD);
        // SENTADO: coxas pra frente (na almofada), canelas pra baixo, tronco encostado
        if (wS > 0.01) {
          // PÉS NO CHÃO na frente do móvel (IK): sentado normal, logo além da frente do sofá; relaxado, bem esticados e
          // abertos — os joelhos vão pra frente/cima e as canelas ficam fora do móvel
          grupo.getWorldPosition(pGr);
          const longe = 0.66 + 0.46 * wR, abre = 0.16 + 0.16 * wR;
          for (const o of pernas) {
            alvoM.copy(pGr).addScaledVector(frente, longe).addScaledVector(lateral, abre * o.lado).addScaledVector(cima, 0.09);
            polo.copy(frente).addScaledVector(cima, 0.45 + 0.4 * wR).addScaledVector(lateral, 0.12 * o.lado);
            ik(o.coxa, o.canela, o.pe, alvoM, polo, wS);
          }
          // o tronco: sentado, encostado de leve; relaxado, RECLINADO no encosto do pufe
          if (lombar && pescoco) { dirAlvo.copy(cima).multiplyScalar(1 - 0.38 * wR).addScaledVector(frente, -0.2 - 0.62 * wR + 0.18 * wTab + respira).normalize(); apontar(lombar, pescoco, dirAlvo, wS); }
          if (pescoco && cabeca && wR > 0.01 && wTab < 0.5) { dirAlvo.copy(cima).multiplyScalar(0.85).addScaledVector(frente, 0.5).normalize(); apontar(pescoco, cabeca, dirAlvo, wS * wR); }   // reclinado, mas olhando pra frente
        }
        // DEITADO: pernas esticadas ao longo do sofá (a esquerda com o joelho dobrado), tronco reto, cabeça no braço
        if (wD > 0.01) {
          for (const o of pernas) {
            if (o.lado > 0) { dirAlvo.copy(uC).multiplyScalar(-0.55).addScaledVector(fC, 0.83).addScaledVector(lC, 0.1).normalize(); apontar(o.coxa, o.canela, dirAlvo, wD); dirAlvo.copy(uC).multiplyScalar(-0.72).addScaledVector(fC, -0.69).normalize(); apontar(o.canela, o.pe, dirAlvo, wD); }
            else { dirAlvo.copy(uC).multiplyScalar(-0.98).addScaledVector(fC, 0.1).addScaledVector(lC, -0.08).normalize(); apontar(o.coxa, o.canela, dirAlvo, wD); dirAlvo.copy(uC).multiplyScalar(-0.99).addScaledVector(fC, -0.05).normalize(); apontar(o.canela, o.pe, dirAlvo, wD); }
          }
          if (lombar && pescoco) { dirAlvo.copy(uC).addScaledVector(fC, 0.08 + respira).normalize(); apontar(lombar, pescoco, dirAlvo, wD); }
        }
        // os BRAÇOS: sem tablet, sentado = mãos nas coxas; deitado = mãos na barriga. Com o TABLET, seguram ele na frente
        // do peito (em pé/sentado) ou acima do rosto (deitado)
        const semTab = 1 - wTab;
        for (const o of ossos) {
          if (wS * semTab * (1 - wR) > 0.01) {   // sentado: mãos nas coxas
            dirAlvo.copy(cima).multiplyScalar(-0.85).addScaledVector(frente, 0.32).addScaledVector(lateral, 0.2 * o.lado).normalize(); apontar(o.braco, o.ante, dirAlvo, wS * semTab * (1 - wR));
            dirAlvo.copy(frente).multiplyScalar(0.82).addScaledVector(cima, -0.5).addScaledVector(lateral, 0.04 * o.lado).normalize(); apontar(o.ante, o.mao, dirAlvo, wS * semTab * (1 - wR));
          }
          if (wS * semTab * wR > 0.01) {   // relaxado: as MÃOS ATRÁS DA CABEÇA (cotovelos abertos pra fora)
            dirAlvo.copy(cima).multiplyScalar(0.62).addScaledVector(lateral, 0.7 * o.lado).addScaledVector(frente, -0.36).normalize(); apontar(o.braco, o.ante, dirAlvo, wS * semTab * wR);
            dirAlvo.copy(lateral).multiplyScalar(-0.82 * o.lado).addScaledVector(cima, 0.3).addScaledVector(frente, -0.5).normalize(); apontar(o.ante, o.mao, dirAlvo, wS * semTab * wR);
          }
          if (wD * semTab > 0.01) {
            dirAlvo.copy(uC).multiplyScalar(-0.85).addScaledVector(fC, 0.3).addScaledVector(lC, 0.32 * o.lado).normalize(); apontar(o.braco, o.ante, dirAlvo, wD * semTab);
            dirAlvo.copy(lC).multiplyScalar(-0.9 * o.lado).addScaledVector(fC, 0.3 + respira).addScaledVector(uC, 0.12).normalize(); apontar(o.ante, o.mao, dirAlvo, wD * semTab);
          }
          const wTabEmPe = wTab * (wEmPe + wS);
          if (wTabEmPe > 0.01) {
            dirAlvo.copy(cima).multiplyScalar(-0.9).addScaledVector(frente, 0.28).addScaledVector(lateral, 0.14 * o.lado).normalize(); apontar(o.braco, o.ante, dirAlvo, wTabEmPe);
            dirAlvo.copy(frente).multiplyScalar(0.78).addScaledVector(cima, 0.42).addScaledVector(lateral, -0.36 * o.lado).normalize(); apontar(o.ante, o.mao, dirAlvo, wTabEmPe);
          }
          if (wTab * wD > 0.01) {
            dirAlvo.copy(fC).multiplyScalar(0.78).addScaledVector(uC, -0.22).addScaledVector(lC, 0.32 * o.lado).normalize(); apontar(o.braco, o.ante, dirAlvo, wTab * wD);
            dirAlvo.copy(fC).multiplyScalar(0.55).addScaledVector(uC, 0.6).addScaledVector(lC, -0.42 * o.lado).normalize(); apontar(o.ante, o.mao, dirAlvo, wTab * wD);
          }
        }
        // a CABEÇA olha pra tela do tablet
        if (pescoco && cabeca && wTab > 0.01) {
          if (wD < 0.99) { dirAlvo.copy(cima).multiplyScalar(0.72).addScaledVector(frente, 0.6).normalize(); apontar(pescoco, cabeca, dirAlvo, wTab * (1 - wD)); }
          if (wD > 0.01) { dirAlvo.copy(uC).multiplyScalar(0.8).addScaledVector(fC, 0.55).normalize(); apontar(pescoco, cabeca, dirAlvo, wTab * wD); }
        }
      }
      // PUXADO pelo fio: pendurado na alça (os braços pro alto, pernas juntas um pouco pra frente), balançando de leve
      if (wP > 0.01) {
        corpo.rotation.x += wP * (parado ? 0 : 0.07 * Math.sin(t * 1.8));
        if (ossos.length || pernas.length) {
          grupo.updateWorldMatrix(true, false); grupo.getWorldQuaternion(qG);
          frente.set(0, 0, -1).applyQuaternion(qG); lateral.crossVectors(cima, frente).normalize();
          for (const o of ossos) {
            dirAlvo.copy(cima).addScaledVector(lateral, 0.2 * o.lado).addScaledVector(frente, 0.06).normalize(); apontar(o.braco, o.ante, dirAlvo, wP);
            dirAlvo.copy(cima).addScaledVector(lateral, -0.14 * o.lado).normalize(); apontar(o.ante, o.mao, dirAlvo, wP);
          }
          for (const o of pernas) {
            dirAlvo.copy(cima).multiplyScalar(-0.93).addScaledVector(frente, 0.32).addScaledVector(lateral, 0.03 * o.lado).normalize(); apontar(o.coxa, o.canela, dirAlvo, wP);
            dirAlvo.copy(cima).multiplyScalar(-0.96).addScaledVector(frente, -0.18).normalize(); apontar(o.canela, o.pe, dirAlvo, wP);
          }
        }
      }
      if (montado && montado.w > 0.02 && (ossos.length || pernas.length)) {
        // MONTADO: tronco inclinado pra frente (moto esportiva) e mãos/pés no lugar por IK de 2 ossos
        grupo.updateWorldMatrix(true, false); grupo.getWorldQuaternion(qG);
        frente.set(0, 0, -1).applyQuaternion(qG); lateral.crossVectors(cima, frente).normalize();
        if (lombar && pescoco) { dirAlvo.copy(frente).multiplyScalar(0.62).addScaledVector(cima, 0.78).normalize(); apontar(lombar, pescoco, dirAlvo, montado.w); }
        for (const o of pernas) {   // joelhos pra frente e um pouco pra fora (abraçando a moto)
          polo.copy(frente).addScaledVector(lateral, 0.35 * o.lado).addScaledVector(cima, 0.2);
          ik(o.coxa, o.canela, o.pe, o.lado > 0 ? montado.peE : montado.peD, polo, montado.w);
        }
        for (const o of ossos) {    // cotovelos pra fora e pra baixo
          polo.copy(lateral).multiplyScalar(0.7 * o.lado).addScaledVector(cima, -0.5).addScaledVector(frente, -0.2);
          ik(o.braco, o.ante, o.mao, o.lado > 0 ? montado.maoE : montado.maoD, polo, montado.w);
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
          apontar(o.braco, o.ante, dirAlvo, meditando * (1 - wTab));   // (com o TABLET, os braços são dele)
          dirAlvo.copy(frente).multiplyScalar(0.72).addScaledVector(cima, -0.45).addScaledVector(lateral, 0.28 * o.lado).normalize();   // antebraço: mãos nos joelhos
          apontar(o.ante, o.mao, dirAlvo, meditando * (1 - wTab));
        }
      }
      // ── VOO de mochila + POUSO com poses CAPTURADAS (Quaternius UAL, CC0): no ar = Jump_Loop; tocou o chão = Jump_Land
      //    (força pela velocidade da queda). Pernas e tronco vêm da captura; os braços ficam junto do corpo (nada de "T") ──
      const kv = Math.min(1, dt * 5);
      const caindo = !!ar && ar.vy < -3 && jato < 0.5, movendo = !!ar && ar.movendo && !caindo;
      wAr += ((ar ? 1 : 0) - wAr) * kv; wQueda += ((caindo ? 1 : 0) - wQueda) * kv; wMov += ((movendo ? 1 : 0) - wMov) * Math.min(1, dt * 3);
      if (ar) { tAr += dt; vyAr = ar.vy; } else tAr = 0;
      if (estavaNoAr && !ar) { tPouso = 0; forcaPouso = impactoDoPouso(vyAr); }   // tocou o chão
      estavaNoAr = !!ar;
      if (tPouso >= 0) { tPouso += dt * (1.5 - 0.5 * forcaPouso); if (tPouso > DUR_POUSO) tPouso = -1; }   // pousinho = mais rápido
      const wPouso = (tPouso >= 0 && !ar ? envelopePouso(tPouso / DUR_POUSO) * (0.4 + 0.6 * forcaPouso) : 0) * (acao?.heroi != null ? 1 - pesoHeroi(acao.heroi) : 1);   // (no hero landing, ele manda)
      // inclinação do voo: andando no ar deita pra frente (~43°); pairando, levemente; caindo, um pouco pra trás
      // mais REALISTA: quanto mais rápido, mais deitado (no turbo, quase na horizontal — braços e pernas colados); ao
      // DESACELERAR o corpo ergue (a "freada" dos super-heróis); na CURVA, inclina pro lado dela (como quem voa de verdade)
      const velAr = ar?.vel ?? (movendo ? 16 : 0), velAnt = velArS;
      velArS += (velAr - velArS) * Math.min(1, dt * 4);
      turboAr += ((ar ? Math.max(0, Math.min(1, (velArS - 17) / 13)) : 0) - turboAr) * Math.min(1, dt * 1.1);   // (o turbo deita o corpo AOS POUCOS — no começo, quase reto)
      const desacel = dt > 0 ? (velAnt - velArS) / dt : 0;
      freioAr += ((ar && desacel > 6 ? Math.min(1, desacel / 25) : 0) - freioAr) * Math.min(1, dt * 5);
      inclinaVoo += ((ar ? (movendo ? -0.62 - 0.38 * turboAr * turboAr : caindo ? 0.1 : -0.12) + 0.55 * freioAr : 0) - inclinaVoo) * Math.min(1, dt * 2);
      bancoVoo += ((ar && movendo ? Math.max(-0.55, Math.min(0.55, giroAlvo * 1.6)) : 0) - bancoVoo) * Math.min(1, dt * 4);
      const aVoo = inclinaVoo * wAr, QUADRIL = 1.0;
      corpo.rotation.x += aVoo; corpo.rotation.z += bancoVoo * wAr;
      corpo.position.z += -QUADRIL * Math.sin(aVoo); corpo.position.y += QUADRIL * (1 - Math.cos(aVoo));   // gira no QUADRIL
      const pAr: Pose | null = wAr > 0.02 ? amostrarPose("Jump_Loop", tAr * 0.8, true) : null;
      const pPouso: Pose | null = wPouso > 0.02 ? amostrarPose("Jump_Land", tPouso, false) : null;
      corpo.position.y += (pPouso ? pPouso.quadril * PERNA * wPouso / (0.4 + 0.6 * forcaPouso) * (0.5 + 0.5 * forcaPouso) : 0) + (parado ? 0 : 0.05 * Math.sin(t * 2.3)) * wAr * (1 - wQueda);
      if ((ossos.length || pernas.length) && (pAr || pPouso)) {
        // eixos do CORPO (já inclinado): as poses seguem a inclinação do voo
        corpo.updateWorldMatrix(true, false); corpo.getWorldQuaternion(qG);
        frente.set(0, 0, -1).applyQuaternion(qG); cimaC.set(0, 1, 0).applyQuaternion(qG); lateral.crossVectors(cimaC, frente).normalize();   // lateral = esquerda
        const aplicar = (d: Dir3, osso: THREE.Object3D | null, filho: THREE.Object3D | null, w: number) => {
          if (!osso || !filho || w <= 0.01) return;
          dirAlvo.copy(frente).multiplyScalar(d[0]).addScaledVector(cimaC, d[1]).addScaledVector(lateral, d[2]).normalize(); apontar(osso, filho, dirAlvo, w);
        };
        const lado3 = (d: Dir3, lado: number): Dir3 => [d[0], d[1], d[2] * lado];
        if (pAr) {
          const ond = parado ? 0 : 0.07 * Math.sin(t * 3 + 1);
          aplicar(misturar(pAr.tronco, [0.12, 0.99, 0], 0.4), lombar, pescoco, wAr * 0.7);
          for (const o of pernas) {
            const E = o.lado > 0, c = pAr[E ? "coxaE" : "coxaD"], k = pAr[E ? "canelaE" : "canelaD"], pe = pAr[E ? "peE" : "peD"];
            // voando pra frente: as pernas vão juntas, "arrastando" atrás do corpo (com uma batidinha alternada)
            const cMov: Dir3 = misturar([-0.12 + ond * o.lado, -0.99, 0.05 * o.lado], [-0.3 + ond * 0.4 * o.lado, -0.95, 0.03 * o.lado], turboAr), kMov: Dir3 = misturar([-0.4, -0.92, 0], [-0.22, -0.97, 0], turboAr);   // (turbo: pernas esticadas, juntas)
            aplicar(misturar(lado3(misturar(c, [c[0], c[1], c[2] * 0.45], 0.6), 1), cMov, wMov), o.coxa, o.canela, wAr);
            aplicar(misturar(k, kMov, wMov), o.canela, o.pe, wAr);
            aplicar(misturar(pe, [0.3, -0.95, 0], wMov), o.pe, o.dedo, wAr * 0.8);
          }
          for (const o of ossos) {
            const E = o.lado > 0, bC = pAr[E ? "bracoE" : "bracoD"], aC = pAr[E ? "anteE" : "anteD"];
            // pairando: braços soltos junto do corpo, antebraço um pouco à frente; voando: ao longo do corpo, pra trás;
            // caindo: abertos pra equilibrar (mas dobrados, não em "T"); 20% da captura dá a assimetria natural
            const bPaira: Dir3 = [0.15, -0.92, 0.3 * o.lado], aPaira: Dir3 = [0.6, -0.7, 0.1 * o.lado];
            const bVoa: Dir3 = misturar([-0.3, -0.93, 0.2 * o.lado], [-0.75, -0.62, 0.1 * o.lado], turboAr), aVoa: Dir3 = misturar([-0.4, -0.9, 0.1 * o.lado], [-0.95, -0.28, 0.04 * o.lado], turboAr);   // (turbo: colados pra trás)
            const bCai: Dir3 = [0.2, 0.35, 0.75 * o.lado], aCai: Dir3 = [0.45, 0.65, 0.25 * o.lado];
            const b = misturar(misturar(misturar(bPaira, bVoa, wMov), bCai, wQueda), bC, 0.2), a = misturar(misturar(misturar(aPaira, aVoa, wMov), aCai, wQueda), aC, 0.2);
            aplicar(b, o.braco, o.ante, wAr); aplicar(a, o.ante, o.mao, wAr);
          }
        }
        if (pPouso) {   // IMPACTO: agacha (joelhos, tronco pra frente, quadril desce), braços pra equilibrar — tudo da captura
          aplicar(pPouso.tronco, lombar, pescoco, wPouso * 0.8);
          for (const o of pernas) { const E = o.lado > 0; aplicar(pPouso[E ? "coxaE" : "coxaD"], o.coxa, o.canela, wPouso); aplicar(pPouso[E ? "canelaE" : "canelaD"], o.canela, o.pe, wPouso); aplicar(pPouso[E ? "peE" : "peD"], o.pe, o.dedo, wPouso); }
          for (const o of ossos) { const E = o.lado > 0; aplicar(pPouso[E ? "bracoE" : "bracoD"], o.braco, o.ante, wPouso); aplicar(pPouso[E ? "anteE" : "anteD"], o.ante, o.mao, wPouso); }
        }
      }
      // ── AÇÃO (hack and slash — lib/cyber/posesCombate): o SPRINT (corrida ninja), a investida do DASH e a guarda de
      //    ALERTA depois dele. O corpo inclina/agacha girando no quadril; a guarda só planta as pernas parada (andando,
      //    as pernas são da caminhada e os braços seguem em guarda) ──
      const wDa = acao ? acao.dash : 0, wSp = acao && !ar ? acao.sprint * (1 - wDa) : 0, wAl = acao && !ar ? acao.alerta * (1 - wDa) : 0;
      if ((wSp > 0.01 || wDa > 0.01 || wAl > 0.01) && (ossos.length || pernas.length)) {
        const pernasLivres = Math.max(0, 1 - wWalk - wRun);
        // [pose, peso, peso das pernas]: o dash planta as pernas sempre; a guarda, só parada; o sprint deixa as da corrida
        const poses: [PoseAcao, number, number][] = [];
        if (wSp > 0.01) poses.push([poseSprint(t), wSp, 0]);
        if (wDa > 0.01 && !ar) poses.push([poseDash(), wDa, wDa]);
        if (wAl > 0.01) poses.push([poseAlerta(t, acao?.alertaT ?? 1), wAl, wAl * pernasLivres]);
        let inc = 0, des = 0; for (const [p, w] of poses) { inc += p.inclina * w; des += p.desce * w; }
        corpo.rotation.x += inc; corpo.position.z += -QUADRIL * Math.sin(inc); corpo.position.y += QUADRIL * (1 - Math.cos(inc)) - des;
        corpo.updateWorldMatrix(true, false); corpo.getWorldQuaternion(qG);
        frente.set(0, 0, -1).applyQuaternion(qG); cimaC.set(0, 1, 0).applyQuaternion(qG); lateral.crossVectors(cimaC, frente).normalize();   // lateral = esquerda
        const ap = (v: Dir3, osso: THREE.Object3D | null, filho: THREE.Object3D | null, w: number) => {
          if (!osso || !filho || w <= 0.01) return;
          dirAlvo.copy(frente).multiplyScalar(v[0]).addScaledVector(cimaC, v[1]).addScaledVector(lateral, v[2]).normalize(); apontar(osso, filho, dirAlvo, w);
        };
        // as PERNAS no referencial do CHÃO (o corpo inclinado não leva os pés junto: eles ficam plantados)
        grupo.updateWorldMatrix(true, false); grupo.getWorldQuaternion(qC2);
        const fC = fChao.set(0, 0, -1).applyQuaternion(qC2), lC = lChao.crossVectors(cima, fC).normalize();
        const apChao = (v: Dir3, osso: THREE.Object3D | null, filho: THREE.Object3D | null, w: number) => {
          if (!osso || !filho || w <= 0.01) return;
          dirAlvo.copy(fC).multiplyScalar(v[0]).addScaledVector(cima, v[1]).addScaledVector(lC, v[2]).normalize(); apontar(osso, filho, dirAlvo, w);
        };
        for (const [p, w, wp] of poses) {
          ap(p.tronco, lombar, pescoco, w); ap(p.cabeca, pescoco, cabeca, w * 0.7);
          for (const o of ossos) { ap(p.braco(o.lado), o.braco, o.ante, w); ap(p.ante(o.lado), o.ante, o.mao, w); }
          if (wp > 0.01 && p.coxa && p.canela && p.pe) for (const o of pernas) { apChao(p.coxa(o.lado), o.coxa, o.canela, wp); apChao(p.canela(o.lado), o.canela, o.pe, wp); apChao(p.pe(o.lado), o.pe, o.dedo, wp * 0.8); }
        }
      }
      // ── HERO LANDING (queda alta) e a DECOLAGEM com impulso (agacha → lança: o Jump_Start capturado nas pernas e no
      //    tronco, os braços vão pra trás e sobem no impulso) — por cima de tudo ──
      const wHe = acao?.heroi != null ? pesoHeroi(acao.heroi) : 0, dec = acao?.decola ?? null;
      const bDec = dec ? bracosDaDecolagem(dec.t, dec.espera) : null, wDec = bDec ? bDec.w * (1 - wHe) : 0;
      if ((wHe > 0.01 || wDec > 0.01) && (ossos.length || pernas.length)) {
        const pDec = wDec > 0.01 ? amostrarPose("Jump_Start", Math.max(0, dec!.t - dec!.espera) * 1.15, false) : null;
        let inc = 0, des = 0;
        if (wHe > 0.01) { const h = poseHeroi(); inc += h.inclina * wHe; des += h.desce * wHe; }
        if (pDec) des -= pDec.quadril * PERNA * 0.9 * wDec * (dec!.t < dec!.espera ? 1 : 0.5);
        corpo.rotation.x += inc; corpo.position.z += -QUADRIL * Math.sin(inc); corpo.position.y += QUADRIL * (1 - Math.cos(inc)) - des;
        corpo.updateWorldMatrix(true, false); corpo.getWorldQuaternion(qG);
        frente.set(0, 0, -1).applyQuaternion(qG); cimaC.set(0, 1, 0).applyQuaternion(qG); lateral.crossVectors(cimaC, frente).normalize();
        grupo.updateWorldMatrix(true, false); grupo.getWorldQuaternion(qC2);
        const fC = fChao.set(0, 0, -1).applyQuaternion(qC2), lC = lChao.crossVectors(cima, fC).normalize();
        const ap = (v: Dir3, osso: THREE.Object3D | null, filho: THREE.Object3D | null, w: number, chao = false) => {
          if (!osso || !filho || w <= 0.01) return;
          if (chao) dirAlvo.copy(fC).multiplyScalar(v[0]).addScaledVector(cima, v[1]).addScaledVector(lC, v[2]).normalize();
          else dirAlvo.copy(frente).multiplyScalar(v[0]).addScaledVector(cimaC, v[1]).addScaledVector(lateral, v[2]).normalize();
          apontar(osso, filho, dirAlvo, w);
        };
        if (pDec) {
          ap(pDec.tronco, lombar, pescoco, wDec * 0.8);
          for (const o of pernas) { const E = o.lado > 0; ap(pDec[E ? "coxaE" : "coxaD"], o.coxa, o.canela, wDec); ap(pDec[E ? "canelaE" : "canelaD"], o.canela, o.pe, wDec); ap(pDec[E ? "peE" : "peD"], o.pe, o.dedo, wDec * 0.8); }
          for (const o of ossos) { ap(bDec!.braco(o.lado), o.braco, o.ante, wDec); ap(bDec!.ante(o.lado), o.ante, o.mao, wDec); }
        }
        if (wHe > 0.01) {
          const h = poseHeroi();
          ap(h.tronco, lombar, pescoco, wHe); ap(h.cabeca, pescoco, cabeca, wHe * 0.8);
          for (const o of ossos) { ap(h.braco(o.lado), o.braco, o.ante, wHe); ap(h.ante(o.lado), o.ante, o.mao, wHe); }
          for (const o of pernas) { ap(h.coxa!(o.lado), o.coxa, o.canela, wHe, true); ap(h.canela!(o.lado), o.canela, o.pe, wHe, true); ap(h.pe!(o.lado), o.pe, o.dedo, wHe * 0.8, true); }
        }
      }
      // ── a ESPADA na mão (lib/cyber/posesCombate): o GOLPE do combo manda no corpo todo (tronco torcendo, o braço que
      //    corta, o outro equilibrando, as pernas no golpe pesado); fora do golpe, só o braço direito empunha — solta
      //    andando, apontada à frente na guarda. A arma vai na mão direita, a lâmina pra onde a pose manda ──
      const esp = acao?.espada ?? null;
      if (esp && (ossos.length || pernas.length) && pilotando < 0.05 && !montado) {
        const g = esp.golpe, pe: (PoseEspada & { duasMaos?: number }) | null = g ? poseGolpe(g.n, g.u, g.ativo) : null, wDuas = pe?.duasMaos ?? 0;
        const so = poseEmpunhaSolta(), gu = poseEmpunhaGuarda(), wg = Math.max(0, Math.min(1, esp.guarda));
        const bD = pe ? pe.bracoD : misturar(so.bracoD, gu.bracoD, wg), aD = pe ? pe.anteD : misturar(so.anteD, gu.anteD, wg);
        const lam = pe ? pe.lamina : misturar(so.lamina, gu.lamina, wg), pla = pe ? pe.plano : misturar(so.plano, gu.plano, wg);
        if (pe) { corpo.rotation.x += pe.inclina; corpo.position.z += -QUADRIL * Math.sin(pe.inclina); corpo.position.y += QUADRIL * (1 - Math.cos(pe.inclina)) - pe.desce; }
        corpo.updateWorldMatrix(true, false); corpo.getWorldQuaternion(qG);
        frente.set(0, 0, -1).applyQuaternion(qG); cimaC.set(0, 1, 0).applyQuaternion(qG); lateral.crossVectors(cimaC, frente).normalize();
        grupo.updateWorldMatrix(true, false); grupo.getWorldQuaternion(qC2);
        const fC = fChao.set(0, 0, -1).applyQuaternion(qC2), lC = lChao.crossVectors(cima, fC).normalize();
        const ap = (v: Dir3, osso: THREE.Object3D | null, filho: THREE.Object3D | null, w: number, chao = false) => {
          if (!osso || !filho || w <= 0.01) return;
          if (chao) dirAlvo.copy(fC).multiplyScalar(v[0]).addScaledVector(cima, v[1]).addScaledVector(lC, v[2]).normalize();
          else dirAlvo.copy(frente).multiplyScalar(v[0]).addScaledVector(cimaC, v[1]).addScaledVector(lateral, v[2]).normalize();
          apontar(osso, filho, dirAlvo, w);
        };
        if (pe) {
          ap(pe.tronco, lombar, pescoco, 0.9);
          if (wDuas < 0.99) for (const o of ossos) if (o.lado > 0) { ap(pe.bracoE, o.braco, o.ante, 1 - wDuas); ap(pe.anteE, o.ante, o.mao, 1 - wDuas); }
          if (pe.pernas) for (const o of pernas) { ap(pe.pernas.coxa(o.lado), o.coxa, o.canela, 1, true); ap(pe.pernas.canela(o.lado), o.canela, o.pe, 1, true); ap(pe.pernas.pe(o.lado), o.pe, o.dedo, 0.8, true); }
        }
        const dir = ossos.find((o) => o.lado < 0);
        if (dir) { ap(bD, dir.braco, dir.ante, 1); ap(aD, dir.ante, dir.mao, 1); }
        // a arma na mão: a origem dela (o cabo) na mão direita; +y = a lâmina; ±z = a face (perpendicular ao fio)
        if (arma && dir) {
          grupo.updateMatrixWorld(true); dir.mao.getWorldPosition(pMao);
          dLam.copy(frente).multiplyScalar(lam[0]).addScaledVector(cimaC, lam[1]).addScaledVector(lateral, lam[2]).normalize();
          dPla.copy(frente).multiplyScalar(pla[0]).addScaledVector(cimaC, pla[1]).addScaledVector(lateral, pla[2]);
          dPla.addScaledVector(dLam, -dPla.dot(dLam)); if (dPla.lengthSq() < 1e-6) dPla.set(0, 1, 0).addScaledVector(dLam, -dLam.y); dPla.normalize();
          xLam.crossVectors(dLam, dPla).normalize();
          mLam.makeBasis(xLam, dLam, dPla); qLam.setFromRotationMatrix(mLam);
          grupo.getWorldQuaternion(qGrupo);
          arma.quaternion.copy(qGrupo.invert().multiply(qLam));
          arma.position.copy(grupo.worldToLocal(pMao.clone()));
          // A DUAS MÃOS: a esquerda vai no CABO, logo abaixo da direita (IK — o cotovelo pra baixo e pra fora)
          const esq = ossos.find((o) => o.lado > 0);
          if (esq && wDuas > 0.01) {
            alvoM.copy(pMao).addScaledVector(dLam, -0.2 * arma.scale.y);
            polo.copy(lateral).multiplyScalar(0.6).addScaledVector(cimaC, -0.8);
            ik(esq.braco, esq.ante, esq.mao, alvoM, polo, wDuas);
          }
        }
      }
      // ── DJ na cabine: fone (pescoço → cabeça), mãos na controladora por IK, balanço no compasso ──
      tDj = dj > 0.02 ? tDj + dt : 0;
      fone.visible = dj > 0.02 && !!cabeca && !!pescoco;
      if (fone.visible && cabeca && pescoco) {
        grupo.updateWorldMatrix(true, false); grupo.getWorldQuaternion(qG);
        frente.set(0, 0, -1).applyQuaternion(qG); lateral.crossVectors(cima, frente).normalize();   // lateral·lado = o lado da mão
        const mov = parado ? 0 : 1, fase = t * BPM_RAD, batida = 0.5 + 0.5 * Math.sin(fase);
        // balanço: o corpo desce no tempo (os pés ficam plantados: os joelhos dobram), gira de leve pros lados
        corpo.updateWorldMatrix(true, true);
        pernas.forEach((o, i) => o.pe.getWorldPosition(pesFixos[i]!));
        corpo.rotation.z = 0;
        const cAlto = tDj > 1.3 ? (tDj - 1.3) % 16 : -1, pula = mov * janela(cAlto, 5.5, 8.3);   // nos braços pro alto, o balanço aumenta
        corpo.position.y -= dj * mov * (0.045 + 0.06 * pula) * batida; corpo.rotation.y = dj * mov * 0.06 * Math.sin(fase * 0.5);
        corpo.updateWorldMatrix(false, true);
        pernas.forEach((o, i) => { polo.copy(frente).addScaledVector(lateral, 0.15 * o.lado); ik(o.coxa, o.canela, o.pe, pesFixos[i]!, polo, dj); });
        // tronco debruçado na mesa
        if (lombar) { dirAlvo.copy(cima).multiplyScalar(0.95).addScaledVector(frente, 0.3 + 0.04 * batida * mov).normalize(); apontar(lombar, pescoco, dirAlvo, dj); }
        // cabeça: olha a mesa e ACENA no compasso; no "cue" inclina pro lado da concha
        const ciclo = (t % 8) / 8, cue = tDj > 1.3 ? suave((ciclo - 0.68) / 0.05) * (1 - suave((ciclo - 0.9) / 0.05)) * mov : 0;
        // a COREOGRAFIA (depois de pôr o fone): mixa → braços pro alto → mixa → pose de mal → soco no ar → mixa
        const c16 = tDj > 1.3 ? (tDj - 1.3) % 16 : -1, wAlto = mov * janela(c16, 5.5, 8.3), wMal = mov * janela(c16, 10.6, 13.4), wSoco = mov * janela(c16, 13.4, 15.2);
        const cabeceio = (0.5 + 0.5 * Math.sin(fase + 0.6)) ** 2;   // aceno "batendo cabeça": desce rápido no tempo
        dirAlvo.copy(cima).addScaledVector(frente, (0.28 + 0.36 * mov * cabeceio) * (1 - wAlto - wMal) - 0.25 * wAlto - 0.12 * wMal).addScaledVector(lateral, 0.25 * cue + 0.3 * wMal).normalize();
        apontar(pescoco, cabeca, dirAlvo, dj);
        // o fone: base no osso da cabeça (cima = pescoço→cabeça) — pondo: sobe do pescoço girando pra cima
        pescoco.getWorldPosition(pN); cabeca.getWorldPosition(pH); cimaH.copy(pH).sub(pN).normalize();
        latH.crossVectors(cimaH, frente).normalize(); zH.crossVectors(latH, cimaH).normalize();
        mBase.makeBasis(latH, cimaH, zH); qCab.setFromRotationMatrix(mBase);
        qPesc.setFromAxisAngle(latH, 1.45).multiply(qCab);   // no pescoço: o arco deitado pra trás (fone "pendurado")
        const pOn = suave((tDj - 0.15) / 0.85);
        pF.copy(pN).addScaledVector(cimaH, -0.02).addScaledVector(zH, -0.02).lerp(alvoM.copy(pH).addScaledVector(cimaH, 0.085).addScaledVector(zH, -0.005), pOn);
        fone.quaternion.copy(qInv.copy(qG).invert().multiply(qPesc.slerp(qCab, pOn)));
        fone.position.copy(grupo.worldToLocal(alvoM.copy(pF)));
        fone.scale.setScalar(Math.min(1, dj * 2));
        // mãos: pondo o fone → nas conchas (levam o fone pra cabeça); depois → na mesa (scratch / knobs / cue)
        const wFone = tDj < 1.25 ? 1 - suave((tDj - 0.95) / 0.3) : 0;
        grupo.getWorldPosition(pGr);   // (o `ik` usa pA/pB/pC por dentro)
        for (const o of ossos) {
          const esq = o.lado > 0;
          alvoM.copy(pGr).addScaledVector(frente, DJ_ALCANCE).addScaledVector(cima, DJ_MAO_Y).addScaledVector(lateral, (esq ? 0.34 : 0.24) * o.lado);
          if (esq) alvoM.addScaledVector(frente, 0.06 * mov * Math.sin(fase * 2)).addScaledVector(lateral, 0.03 * mov * Math.sin(fase * 2 + 1));   // scratch no disco
          else alvoM.addScaledVector(lateral, 0.035 * mov * Math.sin(t * 2.7)).addScaledVector(frente, 0.03 * mov * Math.cos(t * 2.7)).addScaledVector(cima, 0.03 * mov * Math.max(0, Math.sin(t * 1.3)));   // knobs/faders
          pConcha.copy(pF).addScaledVector(latH, (FONE_R + 0.03) * o.lado).addScaledVector(cimaH, -0.02);
          alvoM.lerp(pConcha, Math.max(wFone, esq ? 0 : cue));
          polo.copy(lateral).multiplyScalar(0.7 * o.lado).addScaledVector(cima, -0.6).addScaledVector(frente, -0.15);
          ik(o.braco, o.ante, o.mao, alvoM, polo, dj);
          // BRAÇOS PRO ALTO (em V, mãos abrindo e fechando no tempo)
          if (wAlto > 0.01) {
            dirAlvo.copy(cima).multiplyScalar(0.9).addScaledVector(lateral, 0.38 * o.lado).addScaledVector(frente, 0.12).normalize(); apontar(o.braco, o.ante, dirAlvo, wAlto * dj);
            dirAlvo.copy(cima).addScaledVector(lateral, (0.15 + 0.12 * Math.sin(fase + (esq ? 0 : Math.PI))) * o.lado).normalize(); apontar(o.ante, o.mao, dirAlvo, wAlto * dj);
          }
          // POSE DE MAL: a esquerda segura a concha do fone (vem do `cue` dela), a direita APONTA pra pista
          if (wMal > 0.01) {
            if (esq) { pConcha.copy(pF).addScaledVector(latH, (FONE_R + 0.03) * o.lado); polo.copy(lateral).multiplyScalar(0.8 * o.lado).addScaledVector(cima, -0.3); ik(o.braco, o.ante, o.mao, pConcha, polo, wMal * dj); }
            else { dirAlvo.copy(frente).multiplyScalar(0.95).addScaledVector(cima, 0.28).addScaledVector(lateral, -0.12).normalize(); apontar(o.braco, o.ante, dirAlvo, wMal * dj); apontar(o.ante, o.mao, dirAlvo, wMal * dj); }
          }
          // SOCO NO AR: a direita sobe e desce no tempo, a esquerda segue na mesa
          if (wSoco > 0.01 && !esq) {
            dirAlvo.copy(cima).multiplyScalar(0.85).addScaledVector(frente, 0.35).addScaledVector(lateral, -0.2).normalize(); apontar(o.braco, o.ante, dirAlvo, wSoco * dj);
            dirAlvo.copy(cima).multiplyScalar(0.4 + 0.6 * batida).addScaledVector(frente, 0.9 * (1 - batida)).normalize(); apontar(o.ante, o.mao, dirAlvo, wSoco * dj);
          }
        }
        // corpo: nos braços pro alto pula mais; na pose de mal, joga o peso pra trás e vira um pouco de lado
        corpo.rotation.y += dj * 0.22 * wMal;
        if (lombar && (wAlto > 0.01 || wMal > 0.01)) { dirAlvo.copy(cima).addScaledVector(frente, -0.12 * wMal - 0.05 * wAlto).normalize(); apontar(lombar, pescoco, dirAlvo, Math.max(wAlto, wMal) * dj); }
      } else if (surf > 0.02 && (ossos.length || pernas.length)) {
        // ── SURFANDO na escada de energia: de lado na prancha, joelhos dobrados, braços se equilibrando; um 360 no meio ──
        tSurf += dt;
        grupo.updateWorldMatrix(true, false); grupo.getWorldQuaternion(qG);
        const mov = parado ? 0 : 1, ciclo = tSurf % 6.5, giro = mov * Math.PI * 2 * suave((ciclo - 2.6) / 1.2), festa = mov * janela(ciclo, 2.5, 4.1);
        const bob = mov * (0.05 * Math.sin(t * 3.1) + 0.03 * Math.sin(t * 5.3));
        // o eixo da viagem (girado pela manobra) e a frente do corpo (de lado pra ela)
        const viaja = vViaja.set(0, 0, -1).applyQuaternion(qG).applyAxisAngle(cima, giro), frenteC = vFrenteC.copy(viaja).applyAxisAngle(cima, Math.PI / 2);   // (vA/vB são do `apontar`)
        prancha.visible = true; prancha.scale.setScalar(Math.min(1, surf * 1.5)); prancha.position.set(0, 0.28 + bob, 0); prancha.rotation.y = giro;
        corpo.rotation.y = surf * (Math.PI / 2 + giro); corpo.position.y += surf * (0.28 - 0.2 + bob);
        corpo.updateWorldMatrix(true, true);
        grupo.getWorldPosition(pGr);
        pernas.forEach((o) => {   // o pé de trás é o esquerdo (de lado, a esquerda do corpo fica pra trás da viagem)
          alvoM.copy(pGr).addScaledVector(cima, 0.33 + bob).addScaledVector(viaja, (o.lado > 0 ? -0.4 : 0.4));
          polo.copy(frenteC).addScaledVector(viaja, 0.2 * -o.lado); ik(o.coxa, o.canela, o.pe, alvoM, polo, surf);
        });
        if (lombar && pescoco) { dirAlvo.copy(cima).addScaledVector(frenteC, 0.18).addScaledVector(viaja, 0.06 * Math.sin(t * 2.2) * mov).normalize(); apontar(lombar, pescoco, dirAlvo, surf); }
        if (pescoco && cabeca) { dirAlvo.copy(cima).addScaledVector(viaja, 0.45).addScaledVector(frenteC, 0.1).normalize(); apontar(pescoco, cabeca, dirAlvo, surf); }
        for (const o of ossos) {
          const praFrente = o.lado > 0 ? -1 : 1, onda = mov * 0.15 * Math.sin(t * 2.6 + (o.lado > 0 ? 0 : 1.7));
          // equilíbrio: um braço aberto pra frente da viagem, o outro pra trás, subindo e descendo devagar
          dirAlvo.copy(viaja).multiplyScalar(0.85 * praFrente).addScaledVector(cima, 0.15 + onda).addScaledVector(frenteC, 0.15).normalize(); apontar(o.braco, o.ante, dirAlvo, surf * (1 - festa));
          dirAlvo.copy(viaja).multiplyScalar(0.8 * praFrente).addScaledVector(cima, 0.3 + onda).normalize(); apontar(o.ante, o.mao, dirAlvo, surf * (1 - festa));
          // a manobra: braços pro alto ("uhul!")
          dirAlvo.copy(cima).addScaledVector(viaja, 0.3 * praFrente).normalize(); apontar(o.braco, o.ante, dirAlvo, surf * festa); apontar(o.ante, o.mao, dirAlvo, surf * festa);
        }
        // o rastro: faíscas saindo de trás da prancha
        faiscas.visible = true;
        rastro.forEach((r, i) => { r.f = (r.f + dt * (1.2 + (i % 5) * 0.15)) % 1; rPos[i * 3] = r.x * (1 + r.f); rPos[i * 3 + 1] = 0.25 + r.y + r.f * 0.5 + bob; rPos[i * 3 + 2] = 0.8 + r.f * 3.2; });
        rGeo.attributes.position!.needsUpdate = true; (faiscas.material as THREE.PointsMaterial).opacity = 0.9 * surf;
      } else if (danca > 0.02 && (ossos.length || pernas.length)) {
        // ── DANÇANDO na pista: joelhos no compasso (pés plantados), quadril balançando e uma sequência de passos ──
        grupo.updateWorldMatrix(true, false); grupo.getWorldQuaternion(qG);
        frente.set(0, 0, -1).applyQuaternion(qG); lateral.crossVectors(cima, frente).normalize();
        const mov = parado ? 0.25 : 1, tt = t + faseDanca, fase = tt * BPM_RAD, batida = 0.5 + 0.5 * Math.sin(fase), meio = Math.sin(fase * 0.5);
        const c16 = tt % 16, wPump = janela(c16, 0, 4.2), wAcena = janela(c16, 3.8, 8.2), wBalanco = janela(c16, 7.8, 12.2), wPulo = Math.max(janela(c16, 11.8, 16.4), janela(c16 + 16, 11.8, 16.4));
        corpo.updateWorldMatrix(true, true);
        pernas.forEach((o, i) => o.pe.getWorldPosition(pesFixos[i]!));
        corpo.position.y -= danca * mov * (0.06 + 0.07 * wPulo) * batida;
        corpo.position.x += danca * mov * 0.05 * meio * (1 - wPulo); corpo.rotation.y = danca * mov * (0.18 * meio * (wBalanco + 0.4) );
        corpo.rotation.z = danca * mov * 0.05 * meio;
        corpo.updateWorldMatrix(false, true);
        pernas.forEach((o, i) => { polo.copy(frente).addScaledVector(lateral, 0.2 * o.lado); ik(o.coxa, o.canela, o.pe, pesFixos[i]!, polo, danca); });
        if (lombar && pescoco) { dirAlvo.copy(cima).addScaledVector(lateral, 0.08 * meio * mov).addScaledVector(frente, 0.06 * batida * mov).normalize(); apontar(lombar, pescoco, dirAlvo, danca); }
        if (pescoco && cabeca) { dirAlvo.copy(cima).addScaledVector(frente, 0.2 * mov * (0.5 + 0.5 * Math.sin(fase + 0.6)) ** 2).addScaledVector(lateral, 0.1 * meio * mov).normalize(); apontar(pescoco, cabeca, dirAlvo, danca); }
        for (const o of ossos) {
          const lado = o.lado, alterna = 0.5 + 0.5 * Math.sin(fase + (lado > 0 ? 0 : Math.PI));
          // 1) PUMP: um braço sobe no tempo, depois o outro
          dirAlvo.copy(cima).multiplyScalar(-0.6 + 1.5 * alterna).addScaledVector(lateral, 0.3 * lado).addScaledVector(frente, 0.25).normalize(); apontar(o.braco, o.ante, dirAlvo, danca * wPump * mov);
          dirAlvo.copy(cima).multiplyScalar(0.3 + 0.7 * alterna).addScaledVector(frente, 0.6 * (1 - alterna)).normalize(); apontar(o.ante, o.mao, dirAlvo, danca * wPump * mov);
          // 2) AS DUAS MÃOS PRO ALTO, acenando de um lado pro outro
          dirAlvo.copy(cima).multiplyScalar(0.92).addScaledVector(lateral, 0.3 * lado + 0.25 * meio).normalize(); apontar(o.braco, o.ante, dirAlvo, danca * wAcena * mov);
          dirAlvo.copy(cima).addScaledVector(lateral, 0.35 * meio).normalize(); apontar(o.ante, o.mao, dirAlvo, danca * wAcena * mov);
          // 3) BALANÇO: cotovelos dobrados na frente do corpo, indo de um lado pro outro com o quadril
          dirAlvo.copy(cima).multiplyScalar(-0.75).addScaledVector(lateral, 0.25 * lado).addScaledVector(frente, 0.35).normalize(); apontar(o.braco, o.ante, dirAlvo, danca * wBalanco * mov);
          dirAlvo.copy(frente).multiplyScalar(0.8).addScaledVector(cima, 0.45 + 0.2 * batida).addScaledVector(lateral, 0.5 * meio - 0.1 * lado).normalize(); apontar(o.ante, o.mao, dirAlvo, danca * wBalanco * mov);
          // 4) PULINHO: braços soltos balançando pra frente e pra trás no tempo
          dirAlvo.copy(cima).multiplyScalar(-0.9).addScaledVector(frente, 0.45 * Math.sin(fase + (lado > 0 ? 0 : Math.PI))).addScaledVector(lateral, 0.15 * lado).normalize(); apontar(o.braco, o.ante, dirAlvo, danca * wPulo * mov);
          dirAlvo.copy(cima).multiplyScalar(-0.5).addScaledVector(frente, 0.7).normalize(); apontar(o.ante, o.mao, dirAlvo, danca * wPulo * mov);
        }
      } else { corpo.rotation.y = 0; corpo.rotation.z = 0; }
      if (surf <= 0.02) { prancha.visible = false; faiscas.visible = false; tSurf = 0; }
      // mochila presa às costas: segue o osso do tronco (em espaço do corpo), 0,22 m atrás
      if (espinha) { corpo.updateWorldMatrix(true, false); espinha.updateWorldMatrix(true, false); espinha.getWorldPosition(vA); corpo.worldToLocal(vA); mochila.position.set(vA.x, vA.y - 0.08, vA.z + 0.22); asas?.group.position.set(vA.x, vA.y + 0.04, vA.z + 0.13); }
      // ASAS (no lugar da mochila): subindo batem; planando ondulam; no chão recolhem (lib/cyber/asas)
      if (asas) {
        const empuxo = ar && (jato >= 0.95 || ar.vy > 1.5) ? 1 : jato;   // (remotos: a subida vem pelo vy)
        const s = passoAsas(estAsas, { noAr: !!ar, empuxo, vy: ar?.vy ?? 0, movendo: !!ar?.movendo }, dt);
        estAsas = s.e; evAsas.bateu += +s.bateu; evAsas.abriu ||= s.abriu; evAsas.fechou ||= s.fechou; evAsas.modo = s.modo;
        asas.atualizar(s, t);
      }
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
      matAura.opacity = (0.62 + Math.max(sentado, meditando, dj) * 0.25 * (0.5 + 0.5 * Math.sin(dj > Math.max(sentado, meditando) ? t * BPM_RAD : t * (meditando > sentado ? 0.9 : 2)))) * (anime ? AURA_NO_DESENHO : 1);
      (neu.material as THREE.PointsMaterial).size = 0.1 + 0.05 * Math.sin(t * 2 + grupo.position.x);
      neu.rotation.y += dt * 0.5;
      // a ALÇA: a barra no meio das mãos e o gancho subindo até o cabo
      alca.visible = wP > 0.05;
      if (alca.visible) {
        grupo.updateMatrixWorld(true);
        if (ossos.length >= 2) { ossos[0]!.mao.getWorldPosition(pMaoE); ossos[1]!.mao.getWorldPosition(pMaoD); alca.position.copy(grupo.worldToLocal(pTab.copy(pMaoE).add(pMaoD).multiplyScalar(0.5))); }
        else alca.position.set(0, 2.2, 0);
        const sobe = Math.max(0.05, CABO_ACIMA_DOS_PES - alca.position.y); ganchoAlca.scale.y = sobe; ganchoAlca.position.y = sobe / 2; brilhoAlca.position.y = sobe;
        matAlca.opacity = 0.95 * Math.min(1, wP * 1.5);
      }
      // o TABLET: no meio das mãos, um pouco rumo ao rosto, com a tela virada pra cabeça; materializando: as partículas
      // espiralam até ele, o halo acende e a tela liga
      tablet.visible = wTab > 0.01; particulasTab.visible = wTab > 0.01 && wTab < 0.985;
      if (tablet.visible) {
        grupo.updateMatrixWorld(true);
        if (ossos.length >= 2 && cabeca) {
          ossos[0]!.mao.getWorldPosition(pMaoE); ossos[1]!.mao.getWorldPosition(pMaoD); cabeca.getWorldPosition(pCab);
          pTab.copy(pMaoE).add(pMaoD).multiplyScalar(0.5); pTab.addScaledVector(vA.copy(pCab).sub(pTab), 0.14);
          tablet.position.copy(grupo.worldToLocal(pTab.clone())); tablet.lookAt(pCab);
        } else { tablet.position.set(0, 1.15, -0.38); tablet.rotation.set(-0.7, Math.PI, 0); }
        const e = voltaPraFora(Math.min(1, wTab)); tablet.scale.setScalar(Math.max(0.001, e));
        matTabTela.opacity = Math.max(0, Math.min(1, (wTab - 0.55) / 0.4)) * (wTab < 0.98 && !parado ? 0.75 + 0.25 * Math.sin(t * 40) : 1);
        matTabHalo.opacity = 0.55 * Math.sin(Math.PI * Math.min(1, wTab)) + 0.12 * wTab;
        if (particulasTab.visible) {
          const pl = tablet.position, abre = 1 - wTab;
          for (let i = 0; i < NPT; i++) { const a = i * 2.39996 + t * 5, r = 0.06 + abre * (0.45 + 0.25 * ((i * 7) % 5) / 5), y = (((i * 13) % 11) / 11 - 0.5) * abre * 0.9; ptPos[i * 3] = pl.x + Math.cos(a) * r; ptPos[i * 3 + 1] = pl.y + y; ptPos[i * 3 + 2] = pl.z + Math.sin(a) * r; }
          ptGeo.attributes.position!.needsUpdate = true; matPtTab.opacity = 0.9 * Math.min(1, abre * 3);
        }
      }
      espelho?.atualizar(dt, t);   // corpo VRM: copia a pose final (depois de todas as poses acima)
    },
    passosNovos() { if (!pernas.length) return null; const n = pisadas; pisadas = 0; return n; },
    olharPara(f) { alvo = f + Math.PI; },
    aura(on) {
      if (escondidos) { for (const c of aurasMalha) { const i = escondidos.indexOf(c); if (on && i < 0) escondidos.push(c); else if (!on && i >= 0) escondidos.splice(i, 1); } return; }   // esperando o VRM: só anota
      for (const c of aurasMalha) c.visible = on && !espelho;
    },
    usarAsas(op) {
      if (asas) return;
      asas = criarAsas(); asas.group.scale.setScalar(op?.escala ?? 1); asas.group.userData.escala = op?.escala ?? 1; corpo.add(asas.group); mochila.visible = false;
    },
    semMochila() { mochila.visible = false; },
    poseVrm(p) { poseVrm = p; espelho?.pose(p); },
    detalheVrm(on) { espelho?.detalhe(on); },
    empunhar(obj) { if (arma && arma !== obj) arma.removeFromParent(); arma = obj; if (obj) grupo.add(obj); },
    eventosAsas() {
      if (!asas) return null;
      const e = { ...evAsas }; evAsas.bateu = 0; evAsas.abriu = false; evAsas.fechou = false;
      return e;
    },
    esperarCorpo(on) {
      if (espelho || !modeloMx || on === !!escondidos) return;
      if (on) { escondidos = []; modeloMx.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.visible) { o.visible = false; escondidos!.push(o); } }); }
      else { for (const o of escondidos!) o.visible = true; escondidos = null; }   // volta só o que estava à mostra (a aura pode estar desligada)
    },
    usarVrm(vrm, op) {
      if (!modeloMx || !repouso || espelho) return;
      // o soldado (e as cascas dele: aura, tinta) somem — o esqueleto continua animando, e continua no clique
      modeloMx.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) o.visible = false; });
      espelho = espelharNoVrm(vrm, modeloMx, corpo, repouso, { economico: op?.economico }); espelho.pose(poseVrm);
      esconderOssosVazios(vrm.scene); esconderOssosVazios(modeloMx); esferaRapida(vrm.scene);   // ossos sem nada pra desenhar fora da lista (matrizes)
    },
    soltarVrm() { espelho?.dispose(); espelho = null; },
    recolorir(hex) {
      armadura.set(hex);
      if (anime) { corDesenho(armadura, matArmadura.color); matArmadura.emissive.copy(armadura).multiplyScalar(0.22); matMochila.emissive.copy(armadura).multiplyScalar(0.2); matFone.emissive.copy(armadura).multiplyScalar(0.35); }
      else { matArmadura.color.copy(armadura).multiplyScalar(0.5); matArmadura.emissive.copy(armadura); matMochila.emissive.copy(armadura).multiplyScalar(0.3); matFone.emissive.copy(armadura).multiplyScalar(0.5); }
      (neu.material as THREE.PointsMaterial).color.copy(luz).lerp(armadura, 0.3);
    },
    dispose() {
      mixer?.stopAllAction(); matArmadura.dispose(); matViseira.dispose(); matAura.dispose(); matTinta?.dispose(); espelho?.dispose(); asas?.dispose(); ng.dispose(); (neu.material as THREE.Material).dispose();
      mochila.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); const mt = (m as { material?: THREE.Material }).material; if (mt && mt !== matArmadura) mt.dispose(); }); texJato.dispose();
      fone.traverse((o) => { (o as THREE.Mesh).geometry?.dispose(); }); matFone.dispose(); matLedFone.dispose();
      prancha.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); if (m.material && m.material !== matPrancha && m.material !== matLuzPrancha) (m.material as THREE.Material).dispose(); }); matPrancha.dispose(); matLuzPrancha.dispose();
      rGeo.dispose(); (faiscas.material as THREE.Material).dispose();
      alca.traverse((o) => { (o as THREE.Mesh).geometry?.dispose(); }); matAlca.dispose();
      tablet.traverse((o) => { (o as THREE.Mesh).geometry?.dispose(); }); matTabCorpo.dispose(); matTabTela.dispose(); matTabHalo.dispose(); texTela.dispose(); ptGeo.dispose(); matPtTab.dispose();
      grupo.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.geometry && !gltf) m.geometry.dispose(); });
      grupo.removeFromParent();
    },
  };
}
