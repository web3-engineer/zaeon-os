/**
 * FrotaIA — a FROTA DE IAs vivendo no cyberespaço (lib/cyber/frota): centenas de "jogadores" que estudam no tablet,
 * andam de moto, voam de mochila, vão pra festa e conversam com os amigos. Ninguém disso passa pela rede: cada IA é uma
 * função do relógio (o plano do dia — o mesmo em todo cliente). Aqui só o DESENHO:
 *  - TODO MUNDO num raio de ~240 m aparece SEMPRE, como uma SILHUETA de luz na cor da IA (um InstancedMesh só — centenas
 *    numa draw call; sentada, deitada, de moto conforme o estado). Nada aparece/some com a câmera ou andando: só o
 *    nível de detalhe muda;
 *  - a cada ~0,4 s, as mais PERTO DO MEU PERSONAGEM (não da câmera — girar a câmera não troca ninguém) ganham o corpo
 *    COMPLETO de um POOL (o avatar anime, o nome em cima da cabeça, a moto quando está nela), com HISTERESE: quem já tem
 *    corpo só perde se sair bem do alcance ou se alguém MUITO mais perto precisar da vaga;
 *  - a moto de um corpo completo se MATERIALIZA (cresce) ao montar e se desfaz ao descer (fora da Zaeon a IA invoca a
 *    moto; na Zaeon ela pega/larga na garagem — lib/cyber/frota/corpo);
 *  - todo quadro, o corpo segue o estado exato (lib/cyber/frota/corpo, com o A*) e DESVIA de quem está no caminho;
 *  - os BALÕES das conversas: "..." pra quem está em cloak; o texto das outras vem do servidor na 1ª vez que alguém vê
 *    (/api/cyber/frota/conversa — o mesmo pra todos);
 *  - um usuário puxou assunto perto de uma IA: ela responde (/api/cyber/frota/responder) — seca e depois corta.
 */
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { criarAvatarLuz, type AvatarLuzHandle, type Montado } from "./AvatarLuz";
import { criarMoto, loteMoto, type MotoHandle } from "./Moto";
import { matrizDoAvatar } from "./matrizes";
import { criarMultidao, type MultidaoHandle } from "./MultidaoGPU";
import { gerarFrota, type AgenteIA } from "@/lib/cyber/frota/frota";
import { planejarDia, type PlanoDia } from "@/lib/cyber/frota/plano";
import { diaDe, fullNoDia, minutoDoDia } from "@/lib/cyber/frota/agenda";
import { estadoDaIA, type EstadoIA } from "@/lib/cyber/frota/corpo";
import { criarMotosEstacionadas, type MotoParada } from "./EstacionamentosEstudo";
import { estiloDoId } from "@/lib/cyber/motos";
/** pinta a moto (do corpo reaproveitado) na cor da IA: a pintura clara e os frisos de luz */
function pintarMoto(g: THREE.Object3D, hex: string) {
  const cor = new THREE.Color(hex), clara = cor.clone().lerp(new THREE.Color(0xffffff), 0.3);
  g.traverse((n) => {
    const m = (n as THREE.Mesh).material as THREE.Material | undefined; if (!m || Array.isArray(m)) return;
    const st = m as THREE.MeshStandardMaterial, b = m as THREE.MeshBasicMaterial;
    if (st.userData.pintura) { st.color.copy(clara); st.emissive.copy(cor).multiplyScalar(0.14); }
    else if (b.userData.friso) b.color.copy(cor);
  });
}
import { areaDe, contagemVazia, type AreaId } from "@/lib/cyber/frota/areas";
import { episodiosDoDia, type Episodio } from "@/lib/cyber/frota/conversas";
import type { ConfigSalva } from "@/lib/cyber/frota/config";
import type { PedidoFrota, RespostaFrota } from "./frota.worker";
import { desviar, empurrao, type P2 } from "@/lib/cyber/colisaoAtores";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type FrotaHandle = {
  configurar(c: ConfigSalva, agoraServidor: number): void;
  /** (modo admin) quantas IAs online agora e em cada área do mapa — refeito a cada volta da varredura */
  contagem(): { online: number; porArea: Record<AreaId, number>; versao: number | null };
  atualizar(dt: number, t: number, ctx: CtxFrota): void;
  /** os corpos das IAs desenhadas (pro meu avatar colidir) — mundo, com a altura dos pés */
  corpos(): (P2 & { y: number })[];
  /** eu falei no chat: a IA mais perto (até 6 m) responde */
  ouvir(texto: string, eu: P2 & { y: number }): void;
  /** quantas estão online agora (pro HUD, se quiser) */
  online(): number;
  mostrar(on: boolean): void;
  dispose(): void;
};
/** `eu` = o MEU personagem (mundo, y dos pés): quem ganha corpo completo é escolhido pela distância até ele */
export type CtxFrota = { cam: THREE.Vector3; eu: { x: number; y: number; z: number }; camera: THREE.Camera; largura: number; altura: number; ilhaY: number; pisoY: number; musica: boolean; obstaculos: P2[] };

/** escolhe a cada `ESCOLHE_A_CADA` s; corpo completo até `ALCANCE` m (mantém até `ALCANCE × FICA`); silhuetas até
 *  `ALCANCE_SILHUETA` m; um novo só toma a vaga de um que já tem corpo se estiver a menos de `TROCA` × a distância dele */
const ESCOLHE_A_CADA = 0.4, ALCANCE = 70, FICA = 1.3, ALCANCE_SILHUETA = 240, TROCA = 0.55;
const MOVE = new Set(["andando", "mochila", "moto"]);
/** quanto da varredura cabe num quadro (ms) — era 1,5: a lista de quem aparece só demora mais quadros pra se renovar (quem
 *  se move perto é refeito todo quadro de qualquer jeito) e o quadro da Zaeon cheia ganha ~0,7 ms */
const ORCAMENTO_MS = 0.8;
const TAG = "position:absolute;left:0;top:0;transform:translate(-50%,-100%);font:700 11px system-ui,sans-serif;padding:2px 8px;border-radius:999px;background:rgba(10,8,30,.62);border:1px solid rgba(160,140,255,.3);white-space:nowrap;pointer-events:none;";
const BALAO = "position:absolute;left:0;top:0;transform:translate(-50%,-100%);max-width:220px;font:500 12.5px system-ui,sans-serif;line-height:1.3;padding:6px 10px;border-radius:14px 14px 14px 4px;background:rgba(255,255,255,.94);color:#0b1020;box-shadow:0 4px 18px rgba(0,0,0,.35);pointer-events:none;display:none;";

type Corpo = { /** dt guardado dos quadros em que a animação pulou (longe: anima um quadro sim, um não) */ animDt: number; /** de quem é a moto montada (a carenagem é da IA) e as motos do corpo (uma por carenagem) */ motoDe?: string | null; motos?: (MotoHandle | null)[]; /** a moto dela estava parada numa vaga no quadro anterior */ tinhaVaga: boolean; av: AvatarLuzHandle; tag: HTMLDivElement; balao: HTMLDivElement; moto: MotoHandle | null; id: string | null; desvio: P2; yAnt: number; /** a moto: 0..1 materializada */ motoK: number; motoEm: { x: number; y: number; z: number; rumo: number } | null };

/** a fase da animação de cada IA (s): ninguém anda no mesmo passo que o vizinho */
const faseDe = (id: string) => { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0; return (Math.abs(h) % 1000) / 100; };

/** a SILHUETA (corpo + cabeça, uma geometria só) e a moto-silhueta */
function geoSilhueta(): THREE.BufferGeometry {
  // (baixo polígono: ~110 triângulos — de longe ninguém vê; eram ~320 × até 900)
  const corpo = new THREE.CapsuleGeometry(0.21, 0.78, 2, 6); corpo.translate(0, 0.62, 0);
  const cabeca = new THREE.SphereGeometry(0.16, 6, 4); cabeca.translate(0, 1.42, 0);
  const g = mergeGeometries([corpo.toNonIndexed(), cabeca.toNonIndexed()])!; corpo.dispose(); cabeca.dispose(); return g;
}

export function criarFrotaIA(o: { cena: THREE.Scene; overlay: HTMLElement; gltf: GLTF | null; starTex: THREE.Texture; low: boolean; max?: number }): FrotaHandle {
  const MAX = o.max ?? (o.low ? 8 : 18), MAX_SILHUETAS = o.low ? 300 : 900, MAX_MULTIDAO = 220, DIST_MULTIDAO = 90, DIST_MULTIDAO_PERTO = 35;
  const corpos: Corpo[] = [];
  // as SILHUETAS: um InstancedMesh pra gente e outro pras motos (cor por instância)
  // OPACA (transparente custava a ordenação e a mistura de centenas de silhuetas por quadro)
  const matSil = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x1a2140 });
  const silhuetas = new THREE.InstancedMesh(geoSilhueta(), matSil, MAX_SILHUETAS); silhuetas.count = 0; silhuetas.frustumCulled = false; o.cena.add(silhuetas);
  const geoMotoSil = new THREE.CapsuleGeometry(0.28, 1.9, 2, 6); geoMotoSil.rotateX(Math.PI / 2);
  const motosSil = new THREE.InstancedMesh(geoMotoSil, matSil, Math.round(MAX_SILHUETAS / 3)); motosSil.count = 0; motosSil.frustumCulled = false; o.cena.add(motosSil);
  silhuetas.setColorAt(0, new THREE.Color()); motosSil.setColorAt(0, new THREE.Color());
  // a MULTIDÃO animada pela placa de vídeo (components/cyber/MultidaoGPU): quem está até DIST_MULTIDAO e não tem corpo
  // completo aparece ANDANDO/SENTADO/DANÇANDO de verdade (o mesmo desenho do corpo completo) em 2 draw calls; além, a
  // silhueta. Assa as poses uma vez, depois que a cena montou (o assado roda o avatar por ~400 quadros)
  let multidao: MultidaoHandle | null = null;
  const semMultidao = typeof location !== "undefined" && new URLSearchParams(location.search).has("semMultidao");   // A/B
  const tAssar = o.gltf && !o.low && !semMultidao ? setTimeout(() => {
    try {
      const t0 = performance.now(); multidao = criarMultidao({ gltf: o.gltf!, starTex: o.starTex, max: MAX_MULTIDAO }); o.cena.add(multidao.malha);
      if (process.env.NODE_ENV !== "production") console.info(`[frota] multidão na GPU pronta em ${Math.round(performance.now() - t0)} ms`);
    }
    catch (e) { console.warn("[frota] multidão na GPU não montou — fica a silhueta:", String((e as Error)?.stack ?? e)); }
  }, 1500) : null;
  /** quem aparece (silhueta ou corpo): o estado aproximado de cada uma, refeito a cada escolha (e a cada quadro, pra quem se move) */
  let vistos: { id: string; e: EstadoIA; move: boolean }[] = [];
  let quadroPar = false, quadroSil = 0;
  let varrer: { ags: { agente: AgenteIA; blocos: PlanoDia["agentes"] extends Map<string, infer V> ? V extends { blocos: infer B } ? B : never : never }[]; i: number; lista: { id: string; e: EstadoIA; move: boolean; d: number }[]; n: number; paradas: MotoParada[]; areas: Record<AreaId, number> } | null = null;
  let porArea = contagemVazia();
  /** as MOTOS PARADAS nos estacionamentos dos lugares de estudo (as das IAs que estão estudando ali) */
  const estacionadas = criarMotosEstacionadas({ cena: o.cena, low: o.low });
  const mS = new THREE.Matrix4(), qS = new THREE.Quaternion(), pS = new THREE.Vector3(), eS = new THREE.Vector3(), cS = new THREE.Color(), eixoX = new THREE.Vector3(1, 0, 0), eixoY = new THREE.Vector3(0, 1, 0), qD = new THREE.Quaternion();
  let config: ConfigSalva | null = null, offset = 0, frota: AgenteIA[] = [], porId = new Map<string, AgenteIA>();
  let plano: PlanoDia | null = null, eps = new Map<string, Episodio[]>(), dia = -1, calculando = false;
  let escolherEm = 0, escolhidos: string[] = [], online = 0, visivel = true;
  const textos = new Map<string, (string | null)[] | "carregando">(), respostas = new Map<string, { n: number; texto: string | null; ate: number }>();
  const montado: Montado = { w: 1, maoE: new THREE.Vector3(), maoD: new THREE.Vector3(), peE: new THREE.Vector3(), peD: new THREE.Vector3() };
  const w = new THREE.Vector3(), proj = new THREE.Vector3();

  /** o plano do dia (uma vez por dia, fora do quadro) */
  // o WORKER do plano (components/cyber/frota.worker): com 2000 IAs o plano + as conversas levam ~1 s — fora da tela
  let worker: Worker | null = null, pedidoId = 0;
  try { worker = new Worker(new URL("./frota.worker.ts", import.meta.url)); } catch { worker = null; }
  let prazo: ReturnType<typeof setTimeout> | null = null;
  /** o worker falhou (não carregou, deu erro, não respondeu em 10 s): desliga ele e calcula do jeito antigo (no ocioso) */
  const semWorker = (motivo: string) => {
    if (!worker) return; console.warn("[frota] sem worker —", motivo);
    worker.terminate(); worker = null; if (prazo) clearTimeout(prazo); prazo = null;
    calculando = false; if (config) recalcular(diaDe(agoraMs()));
  };
  if (worker) {
    worker.onmessage = (ev: MessageEvent<RespostaFrota>) => {
      const r = ev.data; if (r.id !== pedidoId) return;   // (um pedido velho: a config mudou no meio)
      if (prazo) clearTimeout(prazo); prazo = null;
      if ("erro" in r) { semWorker(r.erro); return; }
      calculando = false; plano = r.plano; eps = new Map(r.eps); dia = r.dia; varrer = null;
    };
    worker.onerror = (e) => { e.preventDefault?.(); semWorker(e.message || "erro ao carregar"); };
    worker.onmessageerror = () => semWorker("mensagem ilegível");
  }
  function recalcular(d: number) {
    if (!config || calculando) return;
    calculando = true;
    if (worker) {
      worker.postMessage({ id: ++pedidoId, frota: config.frota, dia: d, flags: config.flags, full: fullNoDia(d, config.modoFullAte), areas: config.areas } satisfies PedidoFrota);
      if (prazo) clearTimeout(prazo); prazo = setTimeout(() => semWorker("não respondeu em 10 s"), 10_000);
      return;
    }
    const fazer = () => {
      try {
        const p = planejarDia(frota, d, config!.flags, fullNoDia(d, config!.modoFullAte), config!.areas), m = new Map<string, Episodio[]>();
        for (const e of episodiosDoDia(p, config!.flags)) for (const id of new Set(e.falas.map((f) => f.agente))) (m.get(id) ?? m.set(id, []).get(id)!).push(e);
        plano = p; eps = m; dia = d; varrer = null;
      } finally { calculando = false; }
    };
    const ric = (globalThis as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
    if (ric) ric(fazer, { timeout: 1500 }); else setTimeout(fazer, 0);
  }
  /** um corpo novo pro pool (o avatar é pesado: no máximo um por quadro) */
  function novoCorpo(): Corpo {
    const av = criarAvatarLuz("#7fd3ff", o.starTex, o.low, o.gltf, { anime: true }); o.cena.add(av.group); av.group.visible = false;
    const tag = document.createElement("div"); tag.style.cssText = TAG + "display:none;"; o.overlay.appendChild(tag);
    const balao = document.createElement("div"); balao.style.cssText = BALAO; o.overlay.appendChild(balao);
    return { animDt: 0, tinhaVaga: false, av, tag, balao, moto: null, id: null, desvio: { x: 0, z: 0 }, yAnt: 0, motoK: 0, motoEm: null };
  }
  const agoraMs = () => Date.now() + offset;
  /** o balão de uma IA agora: "..." (cloak ou sem texto ainda), o texto, ou nada */
  function balaoDe(id: string, minuto: number): string | null {
    const r = respostas.get(id); if (r && r.texto && Date.now() < r.ate) return r.texto;
    for (const e of eps.get(id) ?? []) {
      if (minuto < e.ini - 0.1 || minuto > e.falas.at(-1)!.em + 0.2) continue;
      for (let i = 0; i < e.falas.length; i++) {
        const f = e.falas[i]!, prox = e.falas[i + 1]?.em ?? f.em + 0.1;
        if (f.agente !== id || minuto < f.em || minuto > Math.min(prox, f.em + 0.09)) continue;
        if (f.cloak) return "...";
        const t = textos.get(e.id);
        if (!t) { textos.set(e.id, "carregando"); void fetch(`/api/cyber/frota/conversa?ep=${encodeURIComponent(e.id)}`).then((x) => (x.ok ? x.json() : null)).then((j) => { textos.set(e.id, Array.isArray(j?.falas) ? j.falas : e.falas.map(() => null)); }).catch(() => textos.set(e.id, e.falas.map(() => null))); }
        if (t === "carregando" || !t) return "...";
        return t[i] ?? null;
      }
    }
    return null;
  }

  return {
    configurar(c, agoraServidor) {
      config = c; offset = agoraServidor - Date.now();
      frota = gerarFrota(c.frota); porId = new Map(frota.map((a) => [a.id, a])); plano = null; dia = -1; escolhidos = []; varrer = null; calculando = false; pedidoId++;
      for (const k of corpos) k.id = null;
      recalcular(diaDe(agoraMs()));
    },
    atualizar(dt, t, ctx) {
      silhuetas.visible = motosSil.visible = !!config && visivel; if (multidao) multidao.malha.visible = silhuetas.visible;
      if (!config || !visivel) { estacionadas.definir([]); for (const k of corpos) { k.av.group.visible = false; k.tag.style.display = "none"; k.balao.style.display = "none"; if (k.moto) k.moto.group.visible = false; } return; }
      const ms = agoraMs(), d = diaDe(ms), minuto = minutoDoDia(ms);
      if (d !== dia) recalcular(d);
      if (!plano) return;
      // 1) quem aparece e quem ganha corpo completo (perto do MEU personagem, com histerese)
      const yDe = (e: EstadoIA) => (e.zaeon ? e.y + (ctx.ilhaY - ctx.pisoY) : e.y);
      const distEu = (e: EstadoIA) => Math.hypot(e.x - ctx.eu.x, yDe(e) - ctx.eu.y, e.z - ctx.eu.z);
      // a VARREDURA de todo mundo é FATIADA: cada quadro avança até gastar `ORCAMENTO_MS` (com 2000 IAs, de uma vez
      // eram ~13 ms — um tranco a cada 0,4 s; e ~400 ms na 1ª, com os roteiros frios); fechou a volta → escolhe
      escolherEm -= dt;
      varrer ??= { ags: [...plano.agentes.values()], i: 0, lista: [], n: 0, paradas: [], areas: contagemVazia() };
      estacionadas.boia(ctx.ilhaY - ctx.pisoY);
      { const t0 = performance.now(), v = varrer;
        while (v.i < v.ags.length && performance.now() - t0 < ORCAMENTO_MS) {
          for (const lim = Math.min(v.ags.length, v.i + 40); v.i < lim; v.i++) {
            const { agente, blocos } = v.ags[v.i]!, e = estadoDaIA(agente.id, blocos, minuto, config.flags, ctx.musica, false);
            if (!e.visivel) continue; v.n++; v.areas[areaDe(e, e.pose === "moto" || e.pose === "mochila")]++;
            if (e.vagaMoto) v.paradas.push({ vaga: e.vagaMoto, cor: porId.get(agente.id)?.cor ?? "#7fd3ff" });
            const d = distEu(e); if (d < ALCANCE_SILHUETA) v.lista.push({ id: agente.id, e, move: MOVE.has(e.pose), d });
          }
        }
      }
      if (escolherEm <= 0 && varrer.i >= varrer.ags.length) {
        escolherEm = ESCOLHE_A_CADA;
        const { lista, n, paradas, areas } = varrer; varrer = null; porArea = areas;
        estacionadas.definir(paradas);
        online = n; lista.sort((a, b) => a.d - b.d); vistos = lista.slice(0, MAX_SILHUETAS);
        const dist = new Map(lista.map((c) => [c.id, c.d]));
        // quem já tem corpo FICA enquanto estiver no alcance largo; a vaga só troca por alguém MUITO mais perto
        const ficam = corpos.filter((k) => k.id && (dist.get(k.id) ?? Infinity) < ALCANCE * FICA).map((k) => k.id!);
        const novos = lista.filter((c) => c.d < ALCANCE && !ficam.includes(c.id));
        escolhidos = [...ficam];
        for (const c of novos) {
          if (escolhidos.length < MAX) { escolhidos.push(c.id); continue; }
          let pior = -1, dPior = -1; escolhidos.forEach((id, k) => { const dd = dist.get(id)!; if (dd > dPior) { dPior = dd; pior = k; } });
          if (c.d < dPior * TROCA) escolhidos[pior] = c.id; else break;   // (a lista está em ordem: os próximos são mais longe ainda)
        }
        for (const k of corpos) if (k.id && !escolhidos.includes(k.id)) { k.id = null; k.motoK = 0; }
        let criou = false;   // (um avatar novo por rodada: criar é pesado — o pool enche aos poucos)
        for (const id of escolhidos) if (!corpos.some((k) => k.id === id)) {
          let k = corpos.find((x) => !x.id);
          if (!k && corpos.length < MAX && !criou) { k = novoCorpo(); corpos.push(k); criou = true; }
          if (!k) break;
          const a = porId.get(id)!; k.id = id; k.av.recolorir(a.cor); k.tag.textContent = a.nome; k.tag.style.color = a.cor; k.desvio = { x: 0, z: 0 }; k.motoK = 0;
        }
      }
      // 1b) as SILHUETAS: todo mundo que aparece e NÃO tem corpo completo (quem se move é refeito a cada quadro)
      {
        const comCorpo = new Set(corpos.filter((k) => k.id && k.av.group.visible).map((k) => k.id!));
        let ni = 0, nm = 0; multidao?.comecar();
        quadroSil = (quadroSil + 1) % 4;
        for (let iv = 0; iv < vistos.length; iv++) {
          const v = vistos[iv]!;
          if (comCorpo.has(v.id)) continue;
          // quem se move é refeito todo quadro PERTO (< 120 m); longe, 1 quadro a cada 4 (escalonado) — eram ~300 por quadro
          if (v.move && (iv % 4 === quadroSil || Math.hypot(v.e.x - ctx.cam.x, v.e.z - ctx.cam.z) < 120)) { const p = plano.agentes.get(v.id); if (p) v.e = estadoDaIA(v.id, p.blocos, minuto, config.flags, ctx.musica, false); }
          const e = v.e; if (!e.visivel) continue;
          const y = yDe(e), cor = cS.set(porId.get(v.id)?.cor ?? "#7fd3ff");
          // a pose da silhueta: de pé; sentada/relaxada (encolhida, no assento); no chão (mais baixa); deitada (tombada); de moto (em cima da moto)
          let sy = 1, dy = 0; qS.setFromAxisAngle(eixoY, e.rumo);
          if (e.pose === "sentado" || e.pose === "relaxa") { sy = 1 - 0.38 * e.sentar; dy = e.assentoY * 0.6 * e.sentar; }
          else if (e.pose === "chao") sy = 1 - 0.45 * e.sentar;
          else if (e.pose === "deitado") { qD.setFromAxisAngle(eixoX, -Math.PI / 2 * e.sentar); qS.multiply(qD); dy = 0.55 * e.sentar; }
          else if (e.pose === "moto") { dy = 0.85; sy = 0.75; }
          // perto: a multidão animada (a moto continua a silhueta dela, logo abaixo)
          const dC = Math.hypot(e.x - ctx.cam.x, y - ctx.cam.y, e.z - ctx.cam.z);
          if (multidao && dC < DIST_MULTIDAO && multidao.adicionar(e.x, y, e.z, e.rumo, e.pose, cor, faseDe(v.id), dC > DIST_MULTIDAO_PERTO)) { /* na multidão */ }
          else if (ni < MAX_SILHUETAS) { mS.compose(pS.set(e.x, y + dy, e.z), qS, eS.set(1, sy, 1)); silhuetas.setMatrixAt(ni, mS); silhuetas.setColorAt(ni, cor); ni++; }
          if (e.pose === "moto" && nm < motosSil.instanceMatrix.count) { qS.setFromAxisAngle(eixoY, e.rumo); mS.compose(pS.set(e.x, y + 0.75, e.z), qS, eS.set(1, 1, 1)); motosSil.setMatrixAt(nm, mS); motosSil.setColorAt(nm, cor); nm++; }
        }
        silhuetas.count = ni; motosSil.count = nm;
        if (multidao) { multidao.fechar(); multidao.atualizar(t); }
        silhuetas.instanceMatrix.needsUpdate = true; motosSil.instanceMatrix.needsUpdate = true;
        if (silhuetas.instanceColor) silhuetas.instanceColor.needsUpdate = true; if (motosSil.instanceColor) motosSil.instanceColor.needsUpdate = true;
      }
      // 2) cada corpo: o estado exato, o desvio, a pose
      const ocupados: P2[] = [];
      for (const k of corpos) {
        if (!k.id) { k.av.group.visible = false; k.tag.style.display = "none"; k.balao.style.display = "none"; if (k.moto) k.moto.group.visible = false; continue; }
        const p = plano.agentes.get(k.id)!, e: EstadoIA = estadoDaIA(k.id, p.blocos, minuto, config.flags, ctx.musica, true);
        if (!e.visivel) { k.id = null; continue; }
        const y = e.zaeon ? e.y + (ctx.ilhaY - ctx.pisoY) : e.y;
        // desvia de mim, dos outros jogadores e das outras IAs (só de pé/andando; sentada não sai do lugar)
        const livre = e.pose === "andando" || e.pose === "parado" || e.pose === "danca";
        k.desvio = desviar(k.desvio, livre ? empurrao({ x: e.x, z: e.z }, [...ctx.obstaculos, ...ocupados]) : { x: 0, z: 0 }, dt);
        const x = e.x + k.desvio.x, z = e.z + k.desvio.z; ocupados.push({ x, z });
        let m: Montado | null = null;
        // saindo da VAGA a moto não se materializa: ela já estava parada ali (components/cyber/EstacionamentosEstudo); chegando,
        // ela encolhe no pedestal enquanto a parada aparece (a lista das paradas se renova a cada volta da varredura)
        if (e.pose === "moto" && k.tinhaVaga && k.motoK === 0) k.motoK = 1;
        k.tinhaVaga = !!e.vagaMoto;
        if (e.pose === "moto") {
          if (k.motoDe !== k.id) {   // (cada IA com a carenagem dela — os 3 tipos por igual; o corpo guarda uma de cada e troca)
            const est = estiloDoId(k.id); if (k.moto) k.moto.group.visible = false;
            k.motos ??= [null, null, null]; k.moto = k.motos[est] ??= loteMoto(criarMoto({ cor: "#ffffff", low: o.low, estilo: est })); k.motoDe = k.id;
            if (!k.moto.group.parent) o.cena.add(k.moto.group);
            pintarMoto(k.moto!.group, porId.get(k.id)!.cor);
          }
          const mt = k.moto!;
          // a moto se MATERIALIZA (cresce em ~0,45 s) ao montar
          k.motoK = Math.min(1, k.motoK + dt / 0.45); const em = k.motoK * k.motoK * (3 - 2 * k.motoK); k.motoEm = { x, y, z, rumo: e.rumo };
          mt.group.visible = true; mt.group.position.set(x, y, z); mt.group.rotation.y = e.rumo; mt.group.scale.setScalar(Math.max(0.02, em));
          mt.atualizar({ dt, t, voando: true, vel: e.moto?.vel ?? 30, curva: e.moto?.curva ?? 0 }); mt.group.updateMatrixWorld(true);
          mt.assento.getWorldPosition(w); k.av.group.position.copy(w); k.av.olharPara(e.rumo);
          mt.pontos.maoE.getWorldPosition(montado.maoE); mt.pontos.maoD.getWorldPosition(montado.maoD); mt.pontos.peE.getWorldPosition(montado.peE); mt.pontos.peD.getWorldPosition(montado.peD);
          m = montado;
        } else {
          // desceu: a moto se DESFAZ (encolhe) onde ficou, em ~0,35 s
          if (k.moto && k.motoK > 0 && k.motoEm) { k.motoK = Math.max(0, k.motoK - dt / 0.35); const em = k.motoK * k.motoK * (3 - 2 * k.motoK); k.moto.group.scale.setScalar(Math.max(0.02, em)); k.moto.group.visible = k.motoK > 0; }
          else if (k.moto) k.moto.group.visible = false;
          k.av.group.position.set(x, y, z); k.av.olharPara(e.rumo);
        }
        k.av.group.visible = true;
        const vy = (y - k.yAnt) / Math.max(dt, 1e-3); k.yAnt = y;
        const deitado = e.pose === "deitado";
        // LONGE (> 25 m da câmera): a animação roda um quadro sim, um não (metade alternada a cada quadro), com o dt
        // somado — o esqueleto + IK é o mais caro do corpo, e a 60 fps a diferença não aparece; perto, todo quadro
        const pertoCam = Math.hypot(x - ctx.cam.x, y - ctx.cam.y, z - ctx.cam.z) < 12;   // (o "LOD de animação" dos jogos: perto, todo quadro; além, um sim um não)
        k.animDt += dt; quadroPar = !quadroPar;
        const animou = pertoCam || quadroPar;
        if (animou) { const dtA = k.animDt; k.animDt = 0;
        k.av.animar({
          andando: e.pose === "andando", correndo: false, montado: m,
          jato: e.pose === "mochila" ? 0.9 : 0, ar: e.pose === "mochila" ? { vy, movendo: true } : null,
          meditando: e.pose === "chao" ? e.sentar : 0, danca: e.pose === "danca" ? 1 : 0,
          descanso: { sentar: deitado || e.pose === "chao" ? 0 : e.sentar, deitar: deitado ? e.sentar : 0, assentoY: e.assentoY, relaxa: e.pose === "relaxa" ? 1 : 0 },
          tablet: e.tablet, dt: dtA, t,
        }); }
        matrizDoAvatar(k.av.group, animou);   // o esqueleto só recalcula no quadro em que animou ou andou (components/cyber/matrizes)
        // o nome e o balão em cima da cabeça
        proj.set(x, k.av.group.position.y + (deitado ? 1.2 : e.pose === "chao" ? 1.5 : 2.2), z).project(ctx.camera);
        const tela = proj.z < 1 && Math.abs(proj.x) < 1.1 && Math.abs(proj.y) < 1.1, sx = (proj.x * 0.5 + 0.5) * ctx.largura, sy = (-proj.y * 0.5 + 0.5) * ctx.altura;
        const longe = Math.hypot(x - ctx.cam.x, z - ctx.cam.z) > 55;
        k.tag.style.display = tela && !longe ? "block" : "none"; if (tela) k.tag.style.transform = `translate(${sx}px,${sy}px) translate(-50%,-100%)`;
        const fala = tela && !longe ? balaoDe(k.id, minuto) : null;
        k.balao.style.display = fala ? "block" : "none";
        if (fala) { if (k.balao.textContent !== fala) k.balao.textContent = fala; k.balao.style.transform = `translate(${sx}px,${sy - 22}px) translate(-50%,-100%)`; }
      }
    },
    corpos() {
      const out: (P2 & { y: number })[] = [];
      for (const k of corpos) if (k.id && k.av.group.visible) out.push({ x: k.av.group.position.x, z: k.av.group.position.z, y: k.av.group.position.y });
      return out;
    },
    ouvir(texto, eu) {
      if (!config?.flags.responderUsuarios || !texto.trim()) return;
      let alvo: Corpo | null = null, md = 6;
      for (const k of corpos) if (k.id && k.av.group.visible && Math.abs(k.av.group.position.y - eu.y) < 3) { const d = Math.hypot(k.av.group.position.x - eu.x, k.av.group.position.z - eu.z); if (d < md) { md = d; alvo = k; } }
      if (!alvo?.id) return;
      const id = alvo.id, a = porId.get(id)!, r = respostas.get(id) ?? { n: 0, texto: null, ate: 0 };
      r.n++; respostas.set(id, r);
      if (config.flags.cloak && a.cloak) { r.texto = "..."; r.ate = Date.now() + 2500; return; }
      void fetch("/api/cyber/frota/responder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agente: id, texto: texto.slice(0, 300), tentativa: r.n }) })
        .then((x) => (x.ok ? x.json() : null)).then((j) => { if (typeof j?.fala === "string" && j.fala) { r.texto = j.fala; r.ate = Date.now() + 4200; } }).catch(() => undefined);
    },
    online: () => online,
    contagem: () => ({ online, porArea, versao: config?.versao ?? null }),
    mostrar(on) { visivel = on; },
    dispose() {
      if (prazo) clearTimeout(prazo); worker?.terminate(); worker = null;
      for (const k of corpos) { k.av.dispose(); for (const m of k.motos ?? [k.moto]) m?.dispose(); k.tag.remove(); k.balao.remove(); } corpos.length = 0;
      for (const m of [silhuetas, motosSil]) { m.geometry.dispose(); m.removeFromParent(); m.dispose(); } matSil.dispose();
      if (tAssar) clearTimeout(tAssar); multidao?.dispose(); multidao = null; estacionadas.dispose();
    },
  };
}
