/**
 * A CENA da avatar do painel dos documentos — roda num WEB WORKER (components/research/avatar.worker) desenhando num
 * OffscreenCanvas: o 3D não divide a thread com o chat (o dono, out/2026: "a geração 3D não pode compartilhar essa
 * thread, isso vai matar nossa performance" — medido: ~5,6 ms por quadro na thread principal). Sem DOM aqui.
 *  - QUEM: o VRM da persona (Aura · Zenita · Nina) animado pelo personagem do open-annie (vendor/open-annie — Apache-2.0)
 *    com os 63 clipes CC0 do annie-blender; um PILOTO solta gestos leves de tempos em tempos (ela nunca fica parada);
 *  - o HOLOGRAMA (o tablet do lounge na versão de luz — components/cyber/TabletLounge) flutua à frente dela lendo (um
 *    documento em análise / um arquivo jogado nela);
 *  - GERANDO a resposta: as 3 SEQUÊNCIAS (components/research/avatarSequencias — o roteiro em lib/research/
 *    sequenciaAvatar): os olhos acendem pensando; ela flutua buscando na rede de hologramas com a aranha rastejando
 *    (a câmera abre); a árvore de habilidades ou o cérebro se forma — em laço até a resposta acabar;
 *  - TROCAR de persona: o corpo anterior sai na hora, com todo o estado; um carregamento atrasado é descartado.
 */
import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import { Character } from "@/vendor/open-annie/core/character.js";
import { fetchPack } from "@/vendor/open-annie/core/motion.js";
import { tuneSprings } from "@/vendor/open-annie/core/cloth.js";
import { acabarVrm, carregarVrm, tingirVrm } from "@/components/cyber/AvatarVrm";
import { CORPOS_VRM } from "@/lib/cyber/estiloAvatar";
import { TABLET } from "@/lib/cyber/descanso";
import { COR_LUZ } from "@/lib/cyber/cores";
import { criarTabletLounge } from "@/components/cyber/TabletLounge";
import { glowTex } from "@/components/cyber/CenaCosmica";
import type { PersonaId } from "@/lib/research/zaeonEventos";
import type { DaCena } from "./avatarMensagens";
import { criarSequencias, type ResultadoSeq } from "./avatarSequencias";
import type { Sequencia } from "@/lib/research/sequenciaAvatar";
import { momentoVitrine, type FaseVitrine } from "@/lib/research/roteiroVitrine";
import { criarBlueprints, type Blueprints } from "./blueprints";

const PACOTE = "/zaeon/movimento/annie-blender/";
/** onde o HOLOGRAMA flutua (metros: x do centro do corpo; y e z a partir do peito, +z = pra frente) e quanto ela
 *  baixa a cabeça pra ele (graus) */
export const POSE = { holograma: [0, 0.02, 0.32] as const, cabecaLer: 14 };
/** o gesto e o rosto de quando cada sequência começa */
const NA_SEQUENCIA: Record<Sequencia, { clipe: string; rosto: string }> = {
  pensar: { clipe: "think", rosto: "thinking" },
  raspar: { clipe: "g_open_both", rosto: "curious" },
  energia: { clipe: "g_sweep_both", rosto: "proud" },
  arvore: { clipe: "g_offer_both", rosto: "happy" },
  cerebro: { clipe: "g_frame_both", rosto: "proud" },
  telepatia: { clipe: "think", rosto: "thinking" },
  leitura: { clipe: "g_offer_both", rosto: "curious" },
  feitico: { clipe: "g_sweep_both", rosto: "proud" },
  telecinese: { clipe: "g_offer_both", rosto: "proud" },
  portal: { clipe: "g_frame_both", rosto: "curious" },
  constelacao: { clipe: "g_offer_both", rosto: "happy" },
};
/** os gestos de quando a clicam (clipes do pacote — todos existem nele) */
const AO_CLICAR = ["wave", "laugh", "clap", "think", "bow", "excited_bounce", "point_self", "shrug", "nod"] as const;
const ROSTO_DO_GESTO: Record<string, string> = { wave: "happy", laugh: "joyful", clap: "joyful", think: "thinking", bow: "tender", excited_bounce: "playful", point_self: "proud", shrug: "amused", nod: "happy", fidget_glance: "curious", g_minishrug: "amused", g_open_both: "happy", fidget_hair: "tender" };
/** o PILOTO: um gesto leve de vez em quando (além dos idles e fidgets do próprio personagem) */
const DE_VEZ_EM_QUANDO = ["fidget_glance", "think", "g_minishrug", "fidget_hair", "g_open_both", "wave", "nod"] as const;
/** quanto tempo ela lê um arquivo jogado nela (s) */
const LER_POR = 4.5;

type Modo = "ler";
/** quem a cena carrega: as personas do chat ou a ZAEON (a vitrine do hero da landing) */
export type IdCorpoAvatar = PersonaId | "zaeon";
export type CenaAvatar = {
  persona: (id: IdCorpoAvatar) => void;
  /** o cursor no canvas (−1..1; null = fora) — a VITRINE olha pra ele descansando */
  olhar: (x: number | null, y: number | null) => void;
  /** a voz dela tocando na página: o volume (0..1) abre a boca; `falando` liga a camada de fala do personagem */
  fala: (v: number, falando: boolean) => void;
  sinais: (lendo: boolean, escrevendo: boolean) => void;
  reagir: () => void;
  /** #764: com `nome`, aquele clipe (ex. "fidget_hair", a mão na cabeça — a pose do microfone); sem, um ao acaso */
  gesto: (nome?: string) => void;
  tamanho: (largura: number, altura: number) => void;
  visivel: (v: boolean) => void;
  diag: () => DaCena;
  /** (dev) pula o roteiro da geração */
  saltar: (t: number) => void;
  destruir: () => void;
};

/** o laço de quadros: no worker, o requestAnimationFrame dele (Chrome/Firefox/Safari 16.4+); senão, um timer */
const pedirQuadro: (f: () => void) => number = typeof requestAnimationFrame === "function" ? (f) => requestAnimationFrame(f) : (f) => setTimeout(f, 16) as unknown as number;
const cancelarQuadro = (id: number) => (typeof cancelAnimationFrame === "function" ? cancelAnimationFrame(id) : clearTimeout(id));

/** `vitrine` = o HERO da landing (lib/research/roteiroVitrine): em vez de esperar o chat, ela roda sozinha o laço pensa →
 *  pesquisa → gera o BLUEPRINT de um entregável → alimenta a árvore → descansa (olhando o cursor); `quadro` = a altura
 *  (m) do enquadramento fechado, a partir do topo da cabeça (o painel usa 0,92 — da cintura pra cima) */
export function criarCenaAvatar(canvas: OffscreenCanvas | HTMLCanvasElement, o: { largura: number; altura: number; dpr: number; persona: IdCorpoAvatar; vitrine?: boolean; quadro?: number; aoEstado: (e: "carregando" | "pronto" | "erro") => void }): CenaAvatar | null {
  let R: THREE.WebGLRenderer;
  try { R = new THREE.WebGLRenderer({ canvas: canvas as HTMLCanvasElement, antialias: true, alpha: true, powerPreference: "low-power" }); }
  catch { o.aoEstado("erro"); return null; }
  let vivo = true, raf = 0, visivel = true, c: Character | null = null, vrm: VRM | null = null, larg = o.largura, alt = o.altura;
  let dprBase = Math.min(o.dpr || 1, 1.5);
  R.setPixelRatio(dprBase); R.outputColorSpace = THREE.SRGBColorSpace; R.setClearColor(0x000000, 0);
  const cena = new THREE.Scene(), cam = new THREE.PerspectiveCamera(22, 1, 0.1, 40);
  cena.add(new THREE.HemisphereLight(0xe6f2ff, 0x241c3a, 2.1));
  const sol = new THREE.DirectionalLight(0xffffff, 2.1); sol.position.set(-1.2, 2.6, 3.5); cena.add(sol);
  const contra = new THREE.DirectionalLight(0x7fe8ff, 1.4); contra.position.set(1.5, 2, -2.5); cena.add(contra);

  let alturaTopo = 1.76;   // o topo do quadro (acima da cabeça — cada corpo tem a sua altura)
  // o enquadramento: da CINTURA pra cima, sem cortar os ombros numa caixa estreita
  // a câmera ABRE (0..1) e ORBITA (rad) quando ela busca na rede — o plano aberto, cinematográfico, com as telas
  // em volta; `subir` = quanto ela levitou (o quadro sobe junto: ela flutua sem cortar a cabeça)
  let abrir = 0, orbita = 0, subir = 0, tamanhoMudou = true;
  const enquadrar = () => {
    const w = Math.max(1, larg), h = Math.max(1, alt);
    if (tamanhoMudou) { R.setSize(w, h, false); tamanhoMudou = false; }
    cam.aspect = w / h;
    const tv = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), H = Math.max(o.quadro ?? 0.92, 0.36 / cam.aspect) * (1 + 1.05 * abrir), d = H / 2 / tv;
    // fechada: o topo do quadro acima da cabeça (da cintura pra cima); aberta: ELA no centro, com as telas em volta
    const centro = THREE.MathUtils.lerp(alturaTopo + subir - H / 2, alturaTopo + subir - 0.5, abrir), baixo = 0.1 * abrir;   // (aberta, um tiquinho de baixo pra cima)
    cam.position.set(Math.sin(orbita) * d, centro + 0.04 - baixo, Math.cos(orbita) * d); cam.lookAt(0, centro, 0); cam.updateProjectionMatrix();
  };
  enquadrar();

  // o HOLOGRAMA: o tablet do lounge na versão de luz (as mesmas partículas, o estalo e o halo)
  const estrela = glowTex("rgba(255,255,255,1)", "rgba(190,215,255,0.5)");
  const tab = criarTabletLounge({ luz: COR_LUZ, estrela, holograma: true, corpo: new THREE.MeshBasicMaterial() });
  cena.add(tab.tablet, tab.particulas);
  const seqs = criarSequencias(cena, estrela, { energiaDaCabeca: o.vitrine });
  let gerandoDesde: number | null = null;
  // ── a VITRINE (o hero): o roteiro roda sozinho desde `vitrineDesde`; o BLUEPRINT do entregável; o cursor ──
  const bps: Blueprints | null = o.vitrine ? criarBlueprints(cena, estrela) : null;
  let vitrineDesde: number | null = null, faseUlt: FaseVitrine | null = null, cicloUlt = -1, pesoGerar = 0;
  const voz = { v: 0, falando: false, era: false };
  const mouse = { x: 0, y: 0, tem: false }, alvoOlhar = new THREE.Vector3(), pCab = new THREE.Vector3(1e9, 0, 0), raio = new THREE.Vector3(), pArvore = new THREE.Vector3();
  /** pra onde a vitrine olha agora (mundo) e com que peso: descansando, o cursor; gerando, o blueprint */
  const olharVitrine = { peso: 0, yaw: 0, pitch: 0 };
  const qx = new THREE.Quaternion(), eul = new THREE.Euler(), pPeito = new THREE.Vector3();
  // o último resultado das sequências (o corpo — dentro do update do personagem — usa o do quadro anterior)
  let seqUlt: ResultadoSeq | null = null;
  // IK de DOIS OSSOS (ombro→cotovelo→punho) nos ossos normalizados: leva o punho ao alvo, o cotovelo pro lado do polo
  const POLO = new THREE.Vector3(0.35, -0.6, -0.15);
  const S = new THREE.Vector3(), E = new THREE.Vector3(), W = new THREE.Vector3(), T = new THREE.Vector3(), pol = new THREE.Vector3(), eixo = new THREE.Vector3(), dirE = new THREE.Vector3(), td = new THREE.Vector3(), aux = new THREE.Vector3();
  const qa = new THREE.Quaternion(), qw = new THREE.Quaternion(), qp = new THREE.Quaternion(), q0 = new THREE.Quaternion();
  const girarPara = (osso: THREE.Object3D, de: THREE.Vector3, para: THREE.Vector3, peso: number) => {
    qa.setFromUnitVectors(de, para);
    osso.getWorldQuaternion(qw); osso.parent!.getWorldQuaternion(qp);
    q0.copy(osso.quaternion);
    osso.quaternion.copy(qp.invert()).multiply(qa).multiply(qw);   // local = pai⁻¹ · Δ · mundo
    if (peso < 1) osso.quaternion.copy(q0.slerp(osso.quaternion, peso));
    osso.updateMatrixWorld(true);
  };
  const ik = (h: VRM["humanoid"], lado: "left" | "right", alvoW: THREE.Vector3, peso: number) => {
    const up = h.getNormalizedBoneNode(`${lado}UpperArm`), lo = h.getNormalizedBoneNode(`${lado}LowerArm`), mao = h.getNormalizedBoneNode(`${lado}Hand`);
    if (!up || !lo || !mao) return;
    up.getWorldPosition(S); lo.getWorldPosition(E); mao.getWorldPosition(W);
    const a = S.distanceTo(E), b = E.distanceTo(W);
    T.copy(alvoW).sub(S); const d = Math.min(Math.max(T.length(), 0.05), (a + b) * 0.995); T.setLength(d);
    const cosA = (a * a + d * d - b * b) / (2 * a * d), ang = Math.acos(Math.min(1, Math.max(-1, cosA)));
    pol.set(lado === "left" ? POLO.x : -POLO.x, POLO.y, POLO.z);
    td.copy(T).normalize(); eixo.crossVectors(td, pol).normalize();
    if (eixo.lengthSq() < 1e-6) eixo.set(0, 0, 1);
    dirE.copy(td).applyAxisAngle(eixo, ang);
    girarPara(up, aux.copy(E).sub(S).normalize(), dirE, peso);
    lo.getWorldPosition(E); mao.getWorldPosition(W);
    girarPara(lo, aux.copy(W).sub(E).normalize(), T.add(S).sub(E).normalize(), peso);
  };
  const D2R = Math.PI / 180;

  // o que o chat diz que ela está fazendo
  const sinais = { lendo: false, escrevendo: false };
  // ── o ESTADO de quem está no painel: TUDO que pode ficar "preso" mora aqui e é zerado na troca ──
  const st = { peso: { ler: 0 } as Record<Modo, number>, wTab: 0, lerAte: 0, proxGesto: 0, rostoEm: 0 };
  const zerar = () => { faseUlt = null; cicloUlt = -1; pesoGerar = 0; olharVitrine.peso = 0; olharVitrine.yaw = 0; olharVitrine.pitch = 0; st.peso.ler = 0; st.wTab = 0; st.lerAte = 0; st.proxGesto = performance.now() / 1000 + 6 + Math.random() * 6; st.rostoEm = 0; tab.animar(0, 0); seqs.zerar(); seqUlt = null; if (abrir || orbita || subir) { abrir = 0; orbita = 0; subir = 0; enquadrar(); } };
  let acoes: { gesto: (nome?: string) => void; reagir: () => void } | null = null;
  // #764: o gesto COM NOME (a pose do microfone) que chegou antes do corpo carregar espera e toca quando ele fica pronto
  let gestoPendente: string | null = null;

  const pacote = fetchPack(new URL(PACOTE, self.location.origin).href);
  const descartar = (v: VRM) => v.scene.traverse((ob) => { const m = ob as THREE.Mesh; if (m.isMesh) { m.geometry?.dispose(); for (const mt of Array.isArray(m.material) ? m.material : [m.material]) mt?.dispose(); } });
  const soltarCorpo = () => {
    if (c) c.overlay = undefined;
    if (vrm) { cena.remove(vrm.scene); descartar(vrm); }
    vrm = null; c = null; acoes = null; zerar();
  };
  let pedido = 0, carregado: IdCorpoAvatar | null = null, pendente: IdCorpoAvatar | null = null;
  const carregar = async (id: IdCorpoAvatar) => {
    if (id === carregado) return;
    const meu = ++pedido; carregado = id;
    soltarCorpo(); o.aoEstado("carregando");                // a anterior sai NA HORA (com o que estava fazendo)
    const corpo = CORPOS_VRM[id] ?? CORPOS_VRM.aura!;
    const [v, pack] = await Promise.all([carregarVrm(corpo.url), pacote]);
    if (!vivo || meu !== pedido) { descartar(v); return; }  // trocaram de novo no meio: este corpo não entra
    tingirVrm(v, corpo.tintas ?? {}); acabarVrm(v, corpo);
    vrm = v; cena.add(v.scene); tuneSprings(v);
    const cabeca = v.humanoid.getRawBoneNode("head"); if (cabeca) { v.scene.updateMatrixWorld(true); alturaTopo = cabeca.getWorldPosition(new THREE.Vector3()).y + 0.24; enquadrar(); }
    const ch = new Character(v, cam, 7, { pack, talk: pack }); c = ch;
    ch.overlay = (_, now, dt) => {
      // GERANDO: as mãos posam na cena (comandando as telas de mãos abertas, ou no gesto do poder) — nada de teclado
      const r = seqUlt, hu = v.humanoid;
      if (r && r.maosPeso > 0.01) {
        v.scene.updateMatrixWorld(true);
        ik(hu, "left", r.maos.esq, r.maosPeso * 0.95); ik(hu, "right", r.maos.dir, r.maosPeso * 0.95);
        const cab = hu.getNormalizedBoneNode("head"), pes = hu.getNormalizedBoneNode("neck");
        // a cabeça acompanha: lendo baixa (cabecaTilt), e VARRE as telas de leve (olhar)
        pes?.quaternion.multiply(qx.setFromEuler(eul.set(r.cabecaTilt * 0.5, r.olhar * 0.3 * r.maosPeso, 0)));
        cab?.quaternion.multiply(qx.setFromEuler(eul.set(r.cabecaTilt * 0.7, r.olhar * 0.45 * r.maosPeso, 0)));
      }
      // a VITRINE: a cabeça vira pro cursor (descansando) ou pro blueprint (gerando) — o pescoço leva um terço
      if (o.vitrine && olharVitrine.peso > 0.01) {
        const pes = hu.getNormalizedBoneNode("neck"), cab = hu.getNormalizedBoneNode("head"), p = olharVitrine.peso;
        pes?.quaternion.multiply(qx.setFromEuler(eul.set(olharVitrine.pitch * 0.35 * p, olharVitrine.yaw * 0.35 * p, 0)));
        cab?.quaternion.multiply(qx.setFromEuler(eul.set(olharVitrine.pitch * 0.65 * p, olharVitrine.yaw * 0.65 * p, 0)));
      }
      const k = 1 - Math.exp(-dt * 6);
      const quer: Modo | null = !sinais.escrevendo && (sinais.lendo || now < st.lerAte) ? "ler" : null;
      st.peso.ler += ((quer ? 1 : 0) - st.peso.ler) * k;
      if (st.peso.ler < 0.01) return;
      // a CABEÇA baixa pro holograma (lendo, os olhos varrem as linhas)
      const cab = v.humanoid.getNormalizedBoneNode("head");
      if (cab) {
        const baixa = POSE.cabecaLer * st.peso.ler, varre = Math.sin(now * 1.7) * 7 * st.peso.ler;
        cab.quaternion.multiply(qx.setFromEuler(eul.set(baixa * D2R, varre * D2R, 0)));
      }
    };
    const gesto = (g: string) => { if (g === "nod") ch.gesture("nod"); else ch.playClip(g); ch.setFace(ROSTO_DO_GESTO[g] ?? "happy", 0.85); };
    acoes = {
      gesto: (nome) => gesto(nome || AO_CLICAR[Math.floor(Math.random() * AO_CLICAR.length)]!),
      // jogaram um arquivo nela: ou LÊ (o holograma por uns segundos) ou PENSA
      reagir: () => { if (Math.random() < 0.55) { st.lerAte = performance.now() / 1000 + LER_POR; ch.setFace("curious", 0.8); } else gesto("think"); },
    };
    zerar();
    if (gestoPendente) { const g = gestoPendente; gestoPendente = null; acoes.gesto(g); }
    if (o.vitrine) vitrineDesde = performance.now() / 1000 + 1.2;   // (um respiro antes do primeiro "pensar")
    o.aoEstado("pronto"); tocar();
  };
  const trocar = (id: IdCorpoAvatar) => {
    // REGRA: nada de baixar um corpo (~12 MB) enquanto uma resposta está chegando — a anterior sai na hora e a nova
    // espera a resposta acabar (sinais → escrevendo false)
    if (sinais.escrevendo && id !== carregado) { pedido++; soltarCorpo(); carregado = null; pendente = id; o.aoEstado("carregando"); return; }
    pendente = null;
    void carregar(id).catch((e) => { console.warn("[avatar] não carregou:", e); carregado = null; if (vivo) o.aoEstado("erro"); }); };

  // o laço (com a medida do custo por quadro — o diag)
  const relogio = new THREE.Clock();
  let medQuadros = 0, medMs = 0, medDesde = performance.now();
  // REGRA: o REBAIXAMENTO automático — a média do custo por quadro passou de ORCAMENTO_MS por 2 s: um nível a menos
  const ORCAMENTO_MS = 12;
  let qualidade: 0 | 1 | 2 = 0, mediaMs = 0, acimaDesde = 0, ultimoQuadro = 0;
  const passo = () => {
    raf = 0; if (!vivo || !visivel) return;
    const t0 = performance.now();
    if (sinais.escrevendo && t0 - ultimoQuadro < 1000 / 31) { raf = pedirQuadro(passo); return; }   // 30 fps gerando
    ultimoQuadro = t0;
    const dt = Math.min(0.05, relogio.getDelta()), agora = t0 / 1000;
    if (c && vrm) {
      // a VITRINE: em que fase do roteiro ela está (e o tempo que as sequências da conversa entendem)
      const mv = o.vitrine && vitrineDesde !== null ? momentoVitrine(agora - vitrineDesde) : null;
      if (mv && (mv.fase !== faseUlt || mv.ciclo !== cicloUlt)) {
        if (mv.fase === "gerar") { c.playClip("g_offer_both"); c.setFace("proud", 0.85); st.rostoEm = agora + 3; }
        else if (mv.fase === "descansar") { c.setFace("happy", 0.7); st.proxGesto = agora + 2 + Math.random() * 2; }
        faseUlt = mv.fase; cicloUlt = mv.ciclo;
      }
      const lendoAgora = !sinais.escrevendo && (sinais.lendo || agora < st.lerAte), ocupada = sinais.escrevendo || lendoAgora || (!!mv && mv.fase !== "descansar");
      // o PILOTO: sem nada pra fazer, de tempos em tempos um gesto leve (ela nunca fica parada)
      if (agora > st.proxGesto) {
        if (!ocupada && c.current?.idle !== false) { const g = DE_VEZ_EM_QUANDO[Math.floor(Math.random() * DE_VEZ_EM_QUANDO.length)]!; if (g === "nod") c.gesture("nod"); else c.playClip(g); c.setFace(ROSTO_DO_GESTO[g] ?? "happy", 0.6); }
        st.proxGesto = agora + (o.vitrine ? 3.5 + Math.random() * 3 : 14 + Math.random() * 12);
      }
      // a VITRINE olha: descansando/pensando, o CURSOR (o raio da câmera por ele, no meio do caminho até o rosto);
      // gerando, o BLUEPRINT; pesquisando, as sequências mandam (varre as telas)
      if (mv) {
        const centroBp = bps?.centro() ?? null;
        let quer = 0;
        if (mv.fase === "gerar" && centroBp) { alvoOlhar.copy(centroBp); quer = 0.9; }
        else if ((mv.fase === "descansar" || mv.fase === "pensar" || mv.fase === "alimentar") && mouse.tem && pCab.x < 1e8) {
          raio.set(mouse.x, mouse.y, 0.5).unproject(cam).sub(cam.position).normalize();
          const meio = (cam.position.z - pCab.z) / 2;
          alvoOlhar.copy(cam.position).addScaledVector(raio, meio / Math.max(0.05, -raio.z)); quer = mv.fase === "alimentar" ? 0.4 : 1;
        }
        olharVitrine.peso += (quer - olharVitrine.peso) * (1 - Math.exp(-dt * 4));
        if (quer > 0 && pCab.x < 1e8) {
          const vx = alvoOlhar.x - pCab.x, vy = alvoOlhar.y - pCab.y, vz = Math.max(0.05, alvoOlhar.z - pCab.z);
          const yaw = THREE.MathUtils.clamp(Math.atan2(vx, vz), -0.75, 0.75), pitch = THREE.MathUtils.clamp(Math.atan2(-vy, Math.hypot(vx, vz)), -0.4, 0.5);
          const k = 1 - Math.exp(-dt * 7); olharVitrine.yaw += (yaw * 0.6 - olharVitrine.yaw) * k; olharVitrine.pitch += (pitch * 0.6 - olharVitrine.pitch) * k;
          // os OLHOS (o gaze do personagem): o resto do caminho
          c.gaze.off.set(alvoOlhar.x - cam.position.x, alvoOlhar.y - cam.position.y, 0); c.gaze.until = agora + 0.4;
        }
      }
      // a FALA (clicaram nela): a boca no volume da voz — e a camada de fala do personagem gesticula junto
      if (voz.falando || voz.era) { c.setMouth({ aa: voz.v * 0.9, oh: voz.v * 0.3, ih: voz.v * 0.2, ou: 0, ee: 0 }, voz.falando); voz.era = voz.falando; }
      c.update(agora, dt);
      // GERANDO: as 3 sequências (o gesto e o rosto de cada uma no começo dela; ela flutua; a câmera abre)
      const r = seqs.atualizar({ agora, dt, gerandoHa: mv ? mv.gerandoHa : gerandoDesde === null ? null : agora - gerandoDesde, vrm, cam }); seqUlt = r;
      if (r.nova && r.seq) { const n = NA_SEQUENCIA[r.seq]; c.playClip(n.clipe); c.setFace(n.rosto, 0.85); st.rostoEm = agora + 2.5; }
      // a câmera abre e fica em três-quartos (ela fica de pé: o ângulo é que mostra a cena)
      const subirAgora = 0;
      // (a vitrine abre um pouco a câmera gerando: o blueprint inteiro na frente do peito)
      pesoGerar += ((mv?.fase === "gerar" || (mv?.fase === "alimentar" && mv.u < 0.4) ? 1 : 0) - pesoGerar) * (1 - Math.exp(-dt * 1.6));
      const abrirAgora = Math.max(r.abrir, pesoGerar * 0.62);
      if (Math.abs(abrirAgora - abrir) > 0.001 || Math.abs(r.orbita - orbita) > 0.001 || Math.abs(subirAgora - subir) > 0.001) { abrir = abrirAgora; orbita = r.orbita; subir = subirAgora; enquadrar(); }
      // o ROSTO do modo (de vez em quando: o envelope das expressões cuida da transição)
      if (agora > st.rostoEm && ocupada) { c.setFace(r.seq ? NA_SEQUENCIA[r.seq].rosto : mv?.fase === "gerar" ? "proud" : "curious", 0.7); st.rostoEm = agora + 3; }
      // o HOLOGRAMA de LEITURA: materializa como o tablet do lounge, à frente do peito, virado pra quem vê
      st.wTab = Math.max(0, Math.min(1, st.wTab + (lendoAgora ? dt / TABLET.materializa : -dt / TABLET.some)));
      const peito = vrm.humanoid.getRawBoneNode("upperChest") ?? vrm.humanoid.getRawBoneNode("chest");
      if (st.wTab > 0.01 && peito) {
        peito.getWorldPosition(pPeito);
        tab.tablet.position.set(POSE.holograma[0], POSE.holograma[1] + Math.sin(agora * 1.3) * 0.006 + pPeito.y, POSE.holograma[2] + pPeito.z);
        tab.tablet.lookAt(cam.position);
      }
      tab.animar(st.wTab, agora);
      tab.tablet.scale.multiplyScalar(0.78);   // (um pouco menor que o do lounge: aqui a câmera está perto)
      // a VITRINE: o blueprint do entregável (na frente do peito; ao alimentar, voa pro pé da árvore)
      if (bps && mv && peito) {
        peito.getWorldPosition(pPeito); pArvore.set(0, pPeito.y - 0.22, pPeito.z + 0.3);
        bps.atualizar({ agora, dt, fase: mv.fase, u: mv.u, entregavel: mv.entregavel, peito: pPeito, arvore: pArvore, cam });
      }
      vrm.humanoid.getRawBoneNode("head")?.getWorldPosition(pCab);
    }
    R.render(cena, cam);
    const custo = performance.now() - t0;
    medQuadros++; medMs += custo;
    mediaMs += (custo - mediaMs) * 0.05;
    if (mediaMs > ORCAMENTO_MS && qualidade < 2) {
      if (!acimaDesde) acimaDesde = t0;
      else if (t0 - acimaDesde > 2000) { qualidade = (qualidade + 1) as 1 | 2; seqs.qualidade(qualidade); dprBase = 1; R.setPixelRatio(1); tamanhoMudou = true; enquadrar(); acimaDesde = 0; mediaMs = ORCAMENTO_MS * 0.7; }
    } else acimaDesde = 0;
    raf = pedirQuadro(passo);
  };
  function tocar() { if (!raf && vivo && visivel) { relogio.getDelta(); raf = pedirQuadro(passo); } }
  trocar(o.persona);
  tocar();

  return {
    persona: trocar,
    fala: (v, falando) => { voz.v = Math.max(0, Math.min(1, v)); voz.falando = falando; },
    olhar: (x, y) => { if (x === null || y === null) mouse.tem = false; else { mouse.x = x; mouse.y = y; mouse.tem = true; } },
    sinais: (lendo, escrevendo) => {
      const mudou = escrevendo !== sinais.escrevendo;
      if (escrevendo && !sinais.escrevendo) gerandoDesde = performance.now() / 1000;   // a resposta começou: o roteiro
      if (!escrevendo) gerandoDesde = null;
      sinais.lendo = lendo; sinais.escrevendo = escrevendo;
      // REGRA: gerando, a cena desenha a 30 fps e com 1 pixel por pixel (o GPU é dividido com a página)
      if (mudou) { R.setPixelRatio(escrevendo ? 1 : dprBase); tamanhoMudou = true; enquadrar(); }
      if (!escrevendo && pendente) trocar(pendente);   // a troca que esperou a resposta acabar
    },
    reagir: () => acoes?.reagir(),
    gesto: (nome) => { if (acoes) acoes.gesto(nome); else if (nome) gestoPendente = nome; },
    tamanho: (w, h) => { larg = w; alt = h; tamanhoMudou = true; enquadrar(); },
    visivel: (v) => { visivel = v; if (v) tocar(); else if (raf) { cancelarQuadro(raf); raf = 0; } },
    diag: () => {
      const s = (performance.now() - medDesde) / 1000, r: DaCena = { tipo: "diag", quadros: medQuadros, msPorQuadro: medQuadros ? +(medMs / medQuadros).toFixed(2) : 0, fps: +(medQuadros / Math.max(0.001, s)).toFixed(1), sequencias: { ...seqs.estado(), qualidade, mediaMs: +mediaMs.toFixed(2), gerandoHa: gerandoDesde === null ? null : +(performance.now() / 1000 - gerandoDesde).toFixed(1) } };
      medQuadros = 0; medMs = 0; medDesde = performance.now(); return r;
    },
    saltar: (t) => { if (o.vitrine) vitrineDesde = performance.now() / 1000 - t; else if (gerandoDesde !== null) gerandoDesde = performance.now() / 1000 - t; },
    destruir: () => {
      vivo = false; pedido++; if (raf) cancelarQuadro(raf); raf = 0;
      soltarCorpo(); seqs.dispose(); bps?.dispose(); tab.dispose(); estrela.dispose();
      R.dispose(); R.forceContextLoss();
    },
  };
}
