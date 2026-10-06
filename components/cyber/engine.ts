/**
 * CyberEngine — a cena RPG do cyberespaço (HANDOFF lounge cósmico): três.js imperativo, isolado do React.
 * Cenário fixo (CenaCosmica) + uma BASE DE ESTUDO por pessoa (BaseEstudo, fixa e privada) + "seres de luz"
 * (AvatarLuz). Movimento WASD/joystick/clique, correr, voar de mochila a jato (ESPAÇO), câmera orbital livre (+pinça), colisão que desliza
 * na borda das bases, sentar ao parar na própria base, monitor destacável (hover) que leva à Sala de Estudos.
 * Rede = só o que o hook de sala entrega (remotos + enviarPos); aqui não há fetch/Pusher.
 */
import * as THREE from "three";
import { corDaArmadura } from "@/lib/cyber/cores";
import { BASE_COLLIDER_R, BASE_INTERACT_R, baseNoQG, basesDosMembros, localParaMundo, spawnDaBase, type LayoutBase, type NivelBase } from "@/lib/cyber/bases";
import { empurrarParaFora, type Colisor } from "@/lib/cyber/colisao";
import { decidirClique, rotuloMonitor } from "@/lib/cyber/clique";
import { POIS, bordaDoPOI, colisoresDosPOIs, marcoNav, poiPerto, type POI } from "@/lib/cyber/landmarks";
import { alturaEm, colisoresDoAlto, deEscada, resolverPasso, type MarcoNav } from "@/lib/cyber/nav";
import { limitarPitch, poseDaCamera } from "@/lib/cyber/camera";
import { ALTURA_CORPO_ILHOTA, BURACO_NEGRO, CIDADE, ILHOTAS, computadorPerto, foraDaIlha, ilhotaEm, mundo, naIlhaPrincipal, noPortalEntrada, noPortalVolta, resolverCidade, resolverCidadeLivre } from "@/lib/cyber/ceu";
import { VOO, chaoDoVoo, passoVooSub, pilaresDoMarco, type EstadoVoo, type Pilar } from "@/lib/cyber/voo";
import { JET, chaoNoAr, impactoDoPouso, passoHorizontalJet, passoVertical, resolverNoAr, somDoJato, tetoDoJet, type QGNoAr } from "@/lib/cyber/jet";
import { pularQuadro, type Qualidade } from "@/lib/cyber/dispositivo";
import { DISTANCIA, PASSOS, cadenciaPasso, eventosNave, fatorCristais, fatorLeito, gatilhoVooInicial, gatilhosVoo, intervaloNeuronio, somNaveInicial, type Dist, type EstadoGatilhoVoo, type EstadoSomNave } from "@/lib/cyber/audio";
import { musica } from "@/lib/audio/musica";
import { criarAudioCyber, type AudioCyberHandle, type LoopSom } from "./AudioCyber";
import { criarSomLounge, type SomLoungeHandle } from "./SomLounge";
import type { SomLounge } from "@/lib/lounge3d/musica";
import { pousoDoQG, rotaPara, seguirRota, type DestinoRota, type Waypoint } from "@/lib/cyber/rota";
import { criarCidade, type CidadeHandle } from "./Cidade";
import { criarHoloRecado, type HoloRecadoHandle } from "./HoloRecado";
import { HOLO_NA_BASE } from "@/lib/cyber/recado";
import type { RecadoQG } from "@/lib/lounge3d/tipos";
import { criarUniversidade, type UniversidadeHandle } from "./Universidade";
import { naUniversidade } from "@/lib/cyber/universidade";
import { PLATAFORMAS, alturaDoAndar, andarDoPouso, andarNaPlataforma, anelDoChao, decolaDaPlataforma, elevadorAqui, noAnelDoDisco, noArNaPlataforma, pilaresDasPlataformas, plataformaPerto, pousosNaPlataforma, tetoNaPlataforma, type IdPlataforma } from "@/lib/cyber/plataformas";
import { criarSolanaHouse, type SolanaHouseHandle } from "./SolanaHouse";
import { NAVE_QG, RAIO_REDOMA, acaoNaNave, alturaDoConves, alturaNoBordo, andarNaNave, RAMPA, naPontaDaRampa, naRampaLaFora, paraLocal, paraMundo, pertoDaEntrada, poseDaDoca, pousoNaNave, rampaDaNave, redomaAberta, type Bordo, type PoseNave } from "@/lib/cyber/naveQG";
import { ESCALA_NAVE, criarNave, type NaveHandle } from "./Nave";
import { criarLandmark, type LandmarkHandle } from "./Landmark";
import { criarMoto, type MotoHandle } from "./Moto";
import { MOTO, motoPerto, vagas } from "@/lib/cyber/motos";
import { interpolar, moverRelativoCamera } from "@/lib/lounge3d/sala";
import type { Presenca } from "@/lib/lounge3d/tipos";
import { criarCenaCosmica, type CenaCosmicaHandle } from "./CenaCosmica";
import { TELA_BASE, criarBase, type BaseEstudoHandle } from "./BaseEstudo";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { carregarModeloAvatar, criarAvatarLuz, type AvatarLuzHandle, type Montado } from "./AvatarLuz";

/**
 * Vêm do SERVIDOR (GET da sala), o cliente só pinta: `fundador` = dono — a base dele fica na ZAEON (a ilha no céu);
 * `qg` = Andrei Bacelar — a base dele fica no centro do salão do QG (o marco andável). Regalias são validadas na API.
 */
export type PessoaCyber = { id: string; name: string; color: string; fundador?: boolean; qg?: boolean };
export type CyberOpts = {
  container: HTMLElement;
  /** camada de tags/falas por cima do canvas (position:absolute; inset:0; pointer-events:none). */
  overlay: HTMLElement;
  els: { menu: HTMLElement | null; hold: HTMLElement | null; monLabel: HTMLElement | null };
  eu: PessoaCyber;
  /** todas as pessoas da sala, na ORDEM dos membros (define a base de cada uma). */
  membros: PessoaCyber[];
  /** começa em modo menu (personagem sentado contemplando; opção do monitor ou ESPAÇO = play). */
  menu: boolean;
  low: boolean;
  /** capas de efeito por aparelho (lib/cyber/dispositivo): pixel ratio, antialias, limite de fps */
  qualidade?: Qualidade;
  /** teclado sempre ouvido (tela cheia). Na janela da landing só com o mouse em cima (não rouba ESPAÇO/rolagem da página). */
  teclasSempre: boolean;
  remotos?: { current: Map<string, Presenca> };
  enviarPos?: (p: { x: number; z: number; facing: number; moving: boolean; sit: boolean; topo: boolean; ceu: boolean; voo?: { y: number; yaw: number }; naveParada?: { x: number; y: number; z: number; yaw: number }; jet?: number; alt?: number; moto?: { s: number; y: number; yaw: number } }) => void;
  /** pontos de interesse (marcos megalíticos) — flag NEXT_PUBLIC_CYBER_LANDMARKS */
  landmarks?: boolean;
  /** clicou num marco estando perto → painel (nome, org, link) */
  onLandmark?: (poi: POI) => void;
  /** entrou/saiu do topo da Zaeon (o React mostra o "Descer") */
  onTopo?: (noTopo: boolean) => void;
  /** tocou o PORTAL (clicou no buraco negro ou pisou no anel embaixo dele) → o React pede acesso ao servidor */
  onPortalCeu?: () => void;
  /** clicou na nave estando perto → o React pede acesso ao servidor e chama `embarcar()` */
  onEmbarcar?: () => void;
  /** estado da nave/cidade pra UI (botões Embarcar / Sair / Voltar) */
  /** a AÇÃO de contexto mudou (o que o F faz agora: "Estudar", "Montar na moto"…) ou acabou (null) */
  onAcao?: (a: { rotulo: string } | null) => void;
  onEstadoQG?: (s: { noCeu: boolean; navePerto: boolean; pilotando: boolean; pousado: boolean; moto: boolean; motoPerto: boolean }) => void;
  /** HUD de voo (pilotando): altímetro — só quando muda (≤ 10×/s) */
  onVoo?: (h: { y: number }) => void;
  /** atalho de rota em andamento (piloto automático) ou null (chegou / cancelado) */
  onRota?: (destino: DestinoRota | null) => void;
  /** o dono clicou na TV do lounge da Zaeon (perto dela) → abre a caixa do recado pro QG do Andrei */
  onAbrirRecado?: () => void;
  /** o dono ESTACIONOU a nave-QG (largou o leme): onde ela ficou parada — o React guarda na sala (todos a veem ali) */
  onNaveParada?: (pose: PoseNave) => void;
  /** o dono usou o TOCA-DISCOS do lounge (F perto dele) → abre o player de música */
  onAbrirSom?: () => void;
  /** URL de uma música da playlist do lounge (rota da sala); sem isto (modo solo/prévia) o lounge fica sem som */
  urlMusica?: (arq: string) => string;
  /** as poses remotas JÁ chegam suavizadas (netcode do Colyseus: interpolação + dead reckoning) → usa direto, sem
   *  um 2º lerp (que só somaria atraso) */
  remotosSuaves?: boolean;
  onPerto?: (perto: boolean) => void;
  onFalarCom?: (nome: string | null) => void;
  onEntrarEstudo?: () => void;
  onSessao?: (go: string) => void;
  onPronto?: () => void;
};

type Ator = { id: string; name: string; color: string; av: AvatarLuzHandle; pos: THREE.Vector3; facing: number; moving: boolean; sit: number; tag: HTMLDivElement; alt: number;
  /** remotos: no topo da Zaeon / pilotando (só valem pra quem o servidor marcou fundador) / na cidade (qualquer um) */
  topo?: boolean; ceu?: boolean; nave?: NaveHandle | null; naveYaw?: number;
  /** a nave-QG dele estacionada (ele não está pilotando): fica parada ali, à vista de todos */
  naveP?: { x: number; y: number; z: number; yaw: number } | null;
  /** remotos: voando de mochila a jato (altura no mundo) e a velocidade vertical estimada */
  jet?: number; vyJet?: number;
  /** remotos: sons da nave dele (loops idle/voo) e passos */
  somNave?: { idle: LoopSom; voo: LoopSom; g: EstadoGatilhoVoo; voava: boolean; ev: EstadoSomNave; yAnt: number | null; vy: number } | null; passoT?: number; perto?: boolean;
  /** remotos: o jato contínuo da mochila dele + a última velocidade vertical no ar (pro baque do pouso) */
  somJet?: LoopSom[] | null; vyUlt?: number;
  /** voz ao vivo (WebRTC) presa ao avatar; `falando` = segurando o push-to-talk agora */
  vozH?: { remover(): void } | null; falando?: boolean;
  /** remotos: montado numa moto voadora (vaga, altura, rumo) */
  moto?: { s: number; y: number; yaw: number } | null };
type Fala = { el: HTMLDivElement; ator: Ator; ate: number };

/** cor da mesa do QG quando o Andrei não está na sala */
const COR_QG = "#ffd36b";
/** cor dos frisos/chamas de cada moto do estacionamento */
const CORES_MOTO = ["#45d6ff", "#ff6ad5", "#ffc46b", "#9affd0"];
/** sensibilidade do olhar livre (rad por pixel do mouse) */
const SENS_OLHAR = 0.0026;
const DICA_MIRA_CSS = "position:absolute;left:50%;bottom:92px;transform:translateX(-50%);font:600 12px system-ui,sans-serif;color:#cfeaff;background:rgba(8,14,34,.62);border:1px solid rgba(150,220,255,.3);padding:5px 12px;border-radius:999px;pointer-events:none;white-space:nowrap;";
const TAG_CSS = "position:absolute;transform:translate(-50%,-100%);font:700 11px system-ui,sans-serif;padding:2px 8px;border-radius:999px;background:rgba(10,8,30,.62);border:1px solid rgba(160,140,255,.3);white-space:nowrap;pointer-events:none;";
const FALA_CSS = "position:absolute;transform:translate(-50%,-100%);max-width:200px;font:12.5px system-ui,sans-serif;color:#eee8ff;background:rgba(14,12,36,.82);border:1px solid;padding:6px 10px;border-radius:12px;pointer-events:none;overflow-wrap:anywhere;";

export class CyberEngine {
  private o: CyberOpts;
  private R: THREE.WebGLRenderer;
  private cam: THREE.PerspectiveCamera;
  private cena: CenaCosmicaHandle;
  private bases = new Map<string, BaseEstudoHandle>();
  private layouts = new Map<string, LayoutBase>();
  /** a mesa + cristais do QG do Andrei: fazem PARTE do QG (centro do salão) mesmo quando ele não está nesta sala */
  private baseQG: BaseEstudoHandle | null = null;
  private colisores: Colisor[] = [];
  private pessoas = new Map<string, PessoaCyber>();
  /** ids na ORDEM canônica dos membros (define a base de cada um). */
  private ordem: string[] = [];
  /** marcos megalíticos (Zaeon…) e o estado "no topo da Zaeon" do dono */
  private lms: LandmarkHandle[] = [];
  private noTopo = false;
  /** em qual marco andável estou no ALTO (escada/plataforma), e a altura do chão sob mim */
  private altoEm: string | null = null; private yNav = 0;
  /** clique na escada vindo do chão: primeiro o pé, depois o ponto clicado */
  private alvoDepois: THREE.Vector2 | null = null;
  /** CIDADE ZAEON (céu) + a NAVE do dono */
  private cidade: CidadeHandle | null = null;
  /** o holograma do recado do dono, ao lado da tela de trabalho da base do QG (do Andrei) */
  private holo: HoloRecadoHandle | null = null; private recadoId: string | null | undefined = undefined;
  /** a Universidade (castelo no chão, ao norte da praça) */
  private univ: UniversidadeHandle | null = null;
  /** a Solana House (Superteam Brasil) — disco flutuante com prédio de 3 andares + rooftop */
  private solana: SolanaHouseHandle | null = null;
  /** o player do toca-discos do lounge (a música sai das caixas, sincronizada pra sala toda) */
  private somLounge: SomLoungeHandle | null = null;
  /** em pé num LUGAR FLUTUANTE (universidade / Solana House) e em que andar (lib/cyber/plataformas) */
  private plat: { id: IdPlataforma; andar: number } | null = null;
  /** os anéis do elevador de luz só disparam de novo depois de sair deles */
  private aneisArmados = true;
  private nave: NaveHandle | null = null;
  /** a nave-QG: mora PAIRANDO na doca ao lado da Zaeon (ou onde o dono a estacionou — `setNaveQG`) */
  private naveEst: EstadoVoo = { ...poseDaDoca(), vx: 0, vy: 0, vz: 0 };
  /** A BORDO da nave-QG, andando no convés: a posição LOCAL (no referencial da nave — ela pode estar voando) */
  private bordo: Bordo | null = null;
  /** saí voando de mochila pela redoma aberta: o casco da própria nave não me empurra até eu passar do dorso */
  private saindoPelaRedoma = false;
  /** o dono já mexeu na nave nesta sessão (o estado salvo na sala não passa por cima) */
  private naveMexida = false;
  private pilotando = false; private pousado = true; private voY = { subir: false, descer: false }; private yawAnt = 0;
  /** direcional na tela (desktop) e "Pousar" (desce sozinho até encostar; qualquer comando manual cancela) */
  private botDir = { x: 0, z: 0 }; private autoPouso = false; private rota: { destino: DestinoRota; pontos: Waypoint[] } | null = null; private cmdVoo = { subir: false, descer: false };
  /** HUD de voo em 3D/DOM: marcador de pouso, anel da borda da ilha, indicadores dos destinos */
  private hudVoo: { marca: THREE.Mesh; borda: THREE.Mesh; chave: string; t: number } | null = null;
  private portalArmado = true;   // o anel de entrada só dispara de novo depois de sair dele
  private estadoQG = "";
  private eu!: Ator;
  private remotos = new Map<string, Ator>();
  private falas: Fala[] = [];
  private raf = 0; private vivo = true; private visivel = true;
  /** limite de quadros (celular/aparelho fraco) e pausa (celular em pé, esperando girar) */
  private fpsMax = 0; private ultimoQuadro = 0; private pausado = false;
  private clock = new THREE.Clock();
  private ray = new THREE.Raycaster();
  private rayCam = new THREE.Raycaster();
  private ro: ResizeObserver; private io: IntersectionObserver | null = null;
  private w = 1; private h = 1;
  // estado de jogo
  private menu: boolean; private holdT = 0; private espaco = false;
  private keys: Record<string, boolean> = {}; private joy = { x: 0, y: 0, on: false }; private correr = false;
  private alvo: THREE.Vector2 | null = null;
  /** mochila a jato (no lugar do pulo): `tecla` = segurando ESPAÇO/VOAR; no ar, `y` é a altura no mundo */
  private jet = { tecla: false, noAr: false, y: 0, vy: 0 };
  /** velocidade horizontal no ar (embalo do impulso da mochila) e se os jatos estão empurrando pra frente agora */
  private jetV = { x: 0, z: 0 }; private impulsoFrente = false;
  /** em pé numa ILHOTA (índice em ILHOTAS) — a altura vem da flutuação dela; passou da borda, cai */
  private ilhota: number | null = null;
  /** MOTOS VOADORAS: uma por vaga do estacionamento (lib/cyber/motos). Montado = `moto` (a vaga); a moto anda com
   *  o mesmo voo da nave (passoVooSub), com teto baixo. Descer devolve a moto pra vaga. */
  private motos: { h: MotoHandle; idle: LoopSom | null; voo: LoopSom | null; yawAnt: number; yAnt: number | null; vy: number }[] = [];
  private moto: number | null = null; private motoEst: EstadoVoo = { x: 0, y: 0, z: 0, yaw: 0, vx: 0, vy: 0, vz: 0 }; private motoPousado = true;
  /** cliquei numa moto longe: anda até ela e monta ao chegar */
  private motoAlvo: number | null = null;
  private montadoTmp = { maoE: new THREE.Vector3(), maoD: new THREE.Vector3(), peE: new THREE.Vector3(), peD: new THREE.Vector3() };
  /** em pé no dorso da nave (depois de sair dela, ou pousando nela de mochila) */
  private sobreNave = false;
  // ── ÁUDIO (components/cyber/AudioCyber): loops presos aos objetos + one-shots nos eventos ──
  private som!: AudioCyberHandle;
  private somLoops: { leito?: LoopSom; naveIdle?: LoopSom; naveVoo?: LoopSom; jet?: LoopSom[] } = {};
  /** subir/descer da MINHA nave: o som sai 1× no começo da ação (gatilhosVoo) */
  private gatilhoNave = gatilhoVooInicial();
  private somCristais = new Map<string, LoopSom>();
  private passoT = 0; private passoI = 0; private neuronioT = 9; private somNave = somNaveInicial(); private tVivo = 0; private somEntrada = false;
  private sitT = 0; private perto = false; private falandoCom: Ator | null = null;
  private hoverBase: string | null = null; private sobContainer = false;
  private camAz = 0; private camPitch = 0.16; private camDist = 9; private camT = new THREE.Vector3(0, 1.2, 0);
  private ptrs = new Map<number, { x: number; y: number }>(); private drag: { x: number; y: number; az: number; pitch: number } | null = null; private moved = false; private pinch0 = 0; private dist0 = 9;
  /** OLHAR LIVRE (tela cheia, mouse): o 1º clique trava o ponteiro (pointer lock) e daí mexer o mouse gira a câmera,
   *  sem segurar botão. Sem mira e sem clique de ação: as ações são pela tecla F (ver `acaoPerto`). Esc solta. */
  private olharLivre = false; private travando = false; private dicaMira: HTMLDivElement | null = null;
  /** a AÇÃO de contexto agora (o que o F faz) — o React mostra o chip "F · rótulo" */
  private acaoChave = "";
  private prontoDisparado = false;
  private cleanups: Array<() => void> = [];

  private gltf: GLTF | null;

  /** Carrega o GLB humano (uma vez) e cria a engine. Se o modelo não carregar, os avatares ficam só com a luz/neurônios. */
  static async criar(opts: CyberOpts): Promise<CyberEngine> {
    const gltf = await carregarModeloAvatar().catch((e) => { console.warn("[cyber] avatar GLB não carregou:", e); return null; });
    return new CyberEngine(opts, gltf);
  }

  private constructor(opts: CyberOpts, gltf: GLTF | null) {
    this.o = opts; this.menu = opts.menu; this.gltf = gltf;
    const { container, low } = opts;
    this.w = Math.max(1, container.clientWidth); this.h = Math.max(1, container.clientHeight);
    const q = opts.qualidade;
    this.R = new THREE.WebGLRenderer({ antialias: q ? q.antialias : !low, powerPreference: "high-performance" });
    this.R.setPixelRatio(Math.min(q ? q.pixelRatioMax : low ? 1.25 : 1.5, window.devicePixelRatio || 1));   // tela retina a 2× custava ~78% mais pixels
    this.R.setSize(this.w, this.h, false);
    this.fpsMax = q?.fpsMax ?? 0;
    this.R.autoClear = false; this.R.outputColorSpace = THREE.SRGBColorSpace;
    const cv = this.R.domElement; cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:" + (opts.menu ? "pan-y" : "none");
    container.appendChild(cv);
    this.cam = new THREE.PerspectiveCamera(45, this.w / this.h, 0.1, 900);
    this.cena = criarCenaCosmica(low, this.w / this.h);
    if (opts.landmarks) for (const poi of POIS) {
      const lm = criarLandmark(poi, { low, starTex: this.cena.starTex });
      this.cena.scene.add(lm.group); this.lms.push(lm);   // sem rótulo na tela (interface limpa); o nome sai no painel do clique
    }
    if (opts.landmarks) {
      this.cidade = criarCidade({ low, starTex: this.cena.starTex });
      this.cena.scene.add(this.cidade.group);
      if (baseNoQG()) { this.holo = criarHoloRecado(); this.cena.scene.add(this.holo.group); }
      this.univ = criarUniversidade({ low, starTex: this.cena.starTex }); this.cena.scene.add(this.univ.group);
      this.solana = criarSolanaHouse({ low, starTex: this.cena.starTex }); this.cena.scene.add(this.solana.group);
      this.nave = criarNave({ low, cor: "#2f7bff" }); this.cena.scene.add(this.nave.group);
      vagas().forEach((v, i) => {
        const h = criarMoto({ cor: CORES_MOTO[i % CORES_MOTO.length]!, low }); h.group.position.set(v.x, 0, v.z); h.group.rotation.y = v.yaw;
        this.cena.scene.add(h.group); this.motos.push({ h, idle: null, voo: null, yawAnt: v.yaw, yAnt: null, vy: 0 });
      });
      const marca = new THREE.Mesh(new THREE.RingGeometry(1.7, 2.2, 40), new THREE.MeshBasicMaterial({ color: 0x7fe0ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      marca.rotation.x = -Math.PI / 2; marca.visible = false; this.cena.scene.add(marca);
      const borda = new THREE.Mesh(new THREE.TorusGeometry(CIDADE.bordaR, 0.14, 6, low ? 64 : 128), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
      borda.rotation.x = Math.PI / 2; borda.position.set(CIDADE.centro.x, CIDADE.pisoY, CIDADE.centro.z); borda.visible = false; this.cena.scene.add(borda);
      this.hudVoo = { marca, borda, chave: "", t: 0 };
    }

    this.som = criarAudioCyber({ camera: this.cam, cena: this.cena.scene, low });
    if (this.cidade?.caixasLounge.length && opts.urlMusica) this.somLounge = criarSomLounge({ audio: this.som, caixas: this.cidade.caixasLounge, urlDe: opts.urlMusica });
    this.setPessoas([...opts.membros]);
    this.montarSom();
    this.ligarEntradas();
    this.ro = new ResizeObserver(() => this.redimensionar()); this.ro.observe(container);
    if (typeof IntersectionObserver !== "undefined") { this.io = new IntersectionObserver((e) => { this.visivel = !!e[0]?.isIntersecting; }); this.io.observe(container); }
    this.clock.start();
    this.raf = requestAnimationFrame((t) => this.loop(t));
    if (process.env.NODE_ENV !== "production") (window as unknown as { __cyber?: CyberEngine }).__cyber = this;   // depuração em dev
  }
  /** estado pra depuração/testes em dev */
  get debug() { return { x: this.eu.pos.x, z: this.eu.pos.z, alt: this.eu.alt, altoEm: this.altoEm, noTopo: this.noTopo, pilotando: this.pilotando, pousado: this.pousado, nave: { ...this.naveEst }, moto: this.moto, motoEst: { ...this.motoEst }, motoPousado: this.motoPousado }; }

  /** Reconstrói bases/atores quando a lista de membros muda (alguém entrou na sala). */
  setPessoas(lista: PessoaCyber[]) {
    const ids = lista.map((p) => p.id);
    if (!ids.includes(this.o.eu.id)) { lista = [...lista, this.o.eu]; ids.push(this.o.eu.id); }
    for (const p of lista) this.pessoas.set(p.id, p);
    this.ordem = ids;
    // bases especiais (só com os marcos na cena): o dono na ZAEON (céu), o Andrei no centro do salão do QG
    const especiais = { ceu: this.cidade ? ids.filter((id) => this.ehFundador(id)) : [], qg: this.zaeon() ? ids.find((id) => this.pessoas.get(id)?.qg && !this.ehFundador(id)) ?? null : null };
    this.layouts = basesDosMembros(ids, undefined, especiais);
    for (const [id, lay] of this.layouts) {
      const existente = this.bases.get(id);
      if (existente) { if (existente.layout.x !== lay.x || existente.layout.z !== lay.z || existente.layout.nivel !== lay.nivel) existente.mover(lay); continue; }
      const b = criarBase(lay, this.corDe(id), this.cena.starTex, this.o.low);
      b.group.position.y = this.yDoNivel(lay.nivel);
      this.cena.scene.add(b.group); this.bases.set(id, b);
      if (this.som && (!this.o.low || id === this.o.eu.id)) this.somCristais.set(id, this.som.loop("crystals", b.group, { dist: DISTANCIA.cristais }));
    }
    // o QG sempre tem a mesa e os cristais no centro do salão; se o Andrei está na sala, é a base dele (acima)
    const lqg = this.zaeon() && ![...this.layouts.values()].some((l) => l.nivel === "qg") ? baseNoQG() : null;
    if (lqg && !this.baseQG) { this.baseQG = criarBase(lqg, COR_QG, this.cena.starTex, this.o.low); this.baseQG.group.position.y = this.yDoNivel("qg"); this.cena.scene.add(this.baseQG.group); }
    if (!lqg && this.baseQG) { this.baseQG.dispose(); this.baseQG = null; }
    for (const a of [this.eu, ...this.remotos.values()]) { if (!a) continue; const c = this.corDe(a.id); if (c !== a.color) { a.color = c; a.av.recolorir(c); a.tag.style.color = c; } }
    // colisão: bases do anel + marcos (a MESMA lista; empurrarParaFora faz o deslizar)
    this.colisores = [...this.layouts.values()].filter((l) => !l.nivel).map((l) => ({ x: l.x, z: l.z, r: BASE_COLLIDER_R }))
      .concat(colisoresDosPOIs(this.lms.map((l) => l.poi).filter((poi) => !poi.nav)));   // marcos andáveis: lib/cyber/nav
    if (!this.eu) {
      const lay = this.layouts.get(this.o.eu.id), sp = spawnDaBase(lay);
      this.eu = this.novoAtor(this.o.eu, sp.x, sp.z);
      if (lay?.nivel) this.entrarNivel(lay.nivel);   // nasce lá em cima, na frente da própria base (Zaeon ou QG)
      if (this.menu) { const s = this.assento(); this.eu.pos.set(s.x, 0, s.z); this.eu.facing = this.rotAssento(); this.eu.sit = 1; this.sitT = 1; }
      else this.eu.facing = lay?.nivel ? this.rotAssento() + Math.PI : Math.atan2(-sp.x, -sp.z);
      this.camT.set(this.eu.pos.x, 1.2 + this.yDoNivel(lay?.nivel), this.eu.pos.z);
      if (!this.menu) this.spawnNaNave();   // o dono nasce a bordo, na cabine de comando
    }
  }

  /** Armadura: a minha é azul; a dos outros vem da ordem canônica dos membros (lib/cyber/cores). */
  private corDe(id: string) { return corDaArmadura(this.ordem, id, this.o.eu.id); }

  private novoAtor(p: PessoaCyber, x: number, z: number): Ator {
    const cor = this.corDe(p.id);
    const av = criarAvatarLuz(cor, this.cena.starTex, this.o.low, this.gltf);
    av.group.position.set(x, 0, z); this.cena.scene.add(av.group);
    const tag = document.createElement("div"); tag.style.cssText = TAG_CSS + "color:" + cor + ";"; tag.textContent = p.id === this.o.eu.id ? "" : p.name; this.o.overlay.appendChild(tag);   // o próprio avatar não leva rótulo
    return { id: p.id, name: p.name, color: cor, av, pos: new THREE.Vector3(x, 0, z), facing: 0, moving: false, sit: 0, tag, alt: 0 };
  }
  private removerAtor(a: Ator) { a.vozH?.remover(); a.vozH = null; this.soltarSomNave(a); this.soltarSomJet(a); a.nave?.dispose(); a.nave = null; a.av.dispose(); a.tag.remove(); this.falas = this.falas.filter((f) => { if (f.ator === a) { f.el.remove(); return false; } return true; }); }

  // ───────────── API pública (React → engine) ─────────────
  iniciar(go = "viajar") {
    if (!this.menu) return; this.menu = false; this.holdT = 0;
    this.o.els.menu && (this.o.els.menu.style.display = "none"); if (this.o.els.hold) this.o.els.hold.style.width = "0%";
    this.som.ativar();   // o whoosh de entrada sai em atualizarSom, quando o buffer chegar
    this.R.domElement.style.touchAction = "none";
    this.spawnNaNave();   // saiu da vista/menu: o dono já começa a bordo, na cabine
    this.o.onSessao?.(go);
  }
  setJoystick(x: number, y: number) { this.joy.x = x; this.joy.y = y; this.joy.on = Math.hypot(x, y) > 0.15; }
  /** pausa a cena (ex.: celular em pé esperando girar) — não renderiza nem simula */
  pausar(on: boolean) { this.pausado = on; if (!on) this.clock.getDelta(); }
  alternarCorrer(): boolean { this.correr = !this.correr; return this.correr; }
  /** ESPAÇO / botão VOAR (segurar): decola e sobe; soltar cai planando até pousar */
  comandoJet(on: boolean) {
    this.jet.tecla = on;
    if (!on || this.jet.noAr || this.menu || this.pilotando || this.moto !== null || this.noTopo) return;
    if (this.bordo) {   // a bordo: da CABINE (redoma aberta) sai-se voando por cima; da RAMPA, lá fora, pula-se; dentro de casa não
      const pelaRedoma = redomaAberta(this.bordo, this.pilotando);
      if (!pelaRedoma && !naRampaLaFora(this.bordo)) return;
      this.eu.alt = (this.poseNave() ? alturaDoConves(this.poseNave()!) : this.eu.alt) + alturaNoBordo(this.bordo, this.quedaRampa());
      this.bordo = null; this.saindoPelaRedoma = pelaRedoma;
    }
    if (this.sobreNave) { this.sobreNave = false; this.jet = { tecla: true, noAr: true, y: this.eu.alt, vy: 0 }; this.sitT = 0; this.alvo = null; this.alvoDepois = null; this.som.tocar("jump", this.eu.av.group.position, { dist: DISTANCIA.eu }); return; }
    // decola do chão, do piso do salão do QG ou da Zaeon (céu) — da escada não
    if (this.altoEm && !this.noCeu) { const z = this.zaeon(), mn = z ? marcoNav(z.poi) : null; if (!mn || this.yNav < mn.nav.pisoY - 0.01) return; this.altoEm = null; this.yNav = 0; }
    if (this.plat && !decolaDaPlataforma(this.plat.id, this.plat.andar, this.eu.pos)) return;   // dentro de casa (Solana House) não
    this.jet = { tecla: true, noAr: true, y: this.eu.alt, vy: 0 }; this.sitT = 0; this.alvo = null; this.alvoDepois = null; this.jetV = { x: 0, z: 0 }; this.ilhota = null; this.plat = null; this.bordo = null;
    this.som.tocar("jump", this.eu.av.group.position, { dist: DISTANCIA.eu });
  }
  /** o QG pra quem voa: marco andável + alto das muralhas (acompanha a flutuação) */
  private qgNoAr(): QGNoAr | null { const z = this.zaeon(), mn = z ? marcoNav(z.poi) : null; return z && mn ? { ...mn, topoMuralhas: this.pilaresZaeon(z)[0]!.topo } : null; }
  /** um quadro no ar: subir/cair, colisão por altura e pouso (chão, escada/salão do QG ou piso da Zaeon) */
  /** saiu do chão sem querer (borda da Zaeon / de uma ilhota): começa a cair DAQUI (queda normal da mochila) */
  private cairDaqui(embalo = { x: 0, z: 0 }) {
    this.jet = { tecla: false, noAr: true, y: this.eu.alt, vy: 0 }; this.jetV = { ...embalo };   // sai andando pra frente, não despenca rente à parede
    this.altoEm = null; this.ilhota = null; this.plat = null; this.bordo = null; this.sitT = 0; this.alvo = null; this.alvoDepois = null;
  }
  /** os corpos das ilhotas como sólidos de voo (do topo — com a flutuação — até o cone afinar) */
  private pilaresDasIlhotas(): Pilar[] {
    if (!this.cidade) return [];
    return ILHOTAS.map((il, k) => { const w = mundo(il), topo = this.cidade!.alturaIlhota(k); return { x: w.x, z: w.z, r: il.r, topo, base: topo - il.r * ALTURA_CORPO_ILHOTA }; });
  }
  private passoNoAr(eu: Ator, prev: { x: number; z: number }, dt: number) {
    const yAnt = this.jet.y;
    // pousa no DORSO da nave parada (vindo de cima)
    const naveParadaAqui = !!this.nave && !this.pilotando && this.nave.group.visible, topo = naveParadaAqui ? this.topoNave() : -Infinity;
    const dNave = Math.hypot(eu.pos.x - this.naveEst.x, eu.pos.z - this.naveEst.z);
    const sobreODorso = naveParadaAqui && dNave < CyberEngine.TOPO_NAVE_R && !(dNave < RAIO_REDOMA && this.redomaChamando());   // o vão da redoma aberta não é piso
    if (this.noCeu) {
      const base = this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY;
      const v = passoVertical(this.jet.y, this.jet.vy, this.jet.tecla, dt, base + tetoDoJet(null), this.impulsoFrente);
      const baixo = v.y - base < JET.alturaBases ? this.colisoresDoNivel("ceu") : [], naves = v.y < topo - 0.2 ? this.colisoresDeNaves(CIDADE.pisoY) : [];
      const q = empurrarParaFora(resolverCidadeLivre(eu.pos), [...baixo, ...naves]);
      eu.pos.x = q.x; eu.pos.z = q.z; this.jet.y = v.y; this.jet.vy = v.vy;
      if (!naIlhaPrincipal(q)) { this.altoEm = null; return; }   // voou pra fora da ilha: céu livre (cai)
      if (sobreODorso && yAnt >= topo - 0.05 && v.y <= topo && v.vy <= 0) { this.jet.noAr = false; this.sobreNave = true; this.somPouso(v.vy); return; }
      if (v.y <= base && v.vy <= 0) { this.jet.noAr = false; this.yNav = CIDADE.pisoY; this.somPouso(v.vy); }
      return;
    }
    // perto de um LUGAR FLUTUANTE (universidade / Solana House): teto, paredes e pouso relativos ao disco dele
    const pid = plataformaPerto(eu.pos, this.jet.y);
    if (pid) {
      const P = PLATAFORMAS[pid], base = P.y, tetoP = base + tetoNaPlataforma(pid);
      const v = passoVertical(this.jet.y, this.jet.vy, this.jet.tecla, dt, yAnt > tetoP ? Math.max(tetoP, yAnt) : tetoP, this.impulsoFrente);
      const q = noArNaPlataforma(pid, eu.pos, v.y - base, yAnt - base);
      eu.pos.x = q.x; eu.pos.z = q.z; this.jet.y = v.y; this.jet.vy = v.vy;
      if (v.vy <= 0) for (const yRel of pousosNaPlataforma(pid, q)) {   // do mais alto pro mais baixo: o 1º cruzado é onde pousa
        const yF = base + yRel;
        if (yAnt >= yF - 0.05 && v.y <= yF) { this.plat = { id: pid, andar: andarDoPouso(pid, yRel) }; this.jet.noAr = false; this.somPouso(v.vy); return; }
      }
      return;
    }
    const qg = this.qgNoAr(), z = this.zaeon();
    // teto da mochila: perto do chão é pouco acima do QG; quem vem CAINDO do céu não é puxado pra baixo de uma vez
    // (o teto vira a altura atual: segurar o espaço PAIRA, não sobe)
    const tetoBase = tetoDoJet(qg), teto0 = yAnt > tetoBase ? Math.max(tetoBase, yAnt) : tetoBase;
    const pnPerto = this.pilotando ? null : this.poseNave(), pertoDaNave = !!pnPerto && Math.hypot(eu.pos.x - pnPerto.x, eu.pos.z - pnPerto.z) < NAVE_QG.raio + 20;
    const teto = this.saindoPelaRedoma || pertoDaNave ? Math.max(teto0, (pnPerto ? pnPerto.y + 2.2 * ESCALA_NAVE : this.topoNave()) + 12) : teto0;   // perto da nave (ou saindo pela redoma): dá pra subir acima do dorso — e voltar pra ela
    const v = passoVertical(this.jet.y, this.jet.vy, this.jet.tecla, dt, teto, this.impulsoFrente);
    if (this.cidade && v.y > 40) {   // lá em cima: a ilha da Zaeon e as ilhotas são pousos (e corpos sólidos)
      const topoIlha = this.cidade.ilha.position.y;
      if (naIlhaPrincipal(eu.pos) && yAnt >= topoIlha - 0.05 && v.y <= topoIlha && v.vy <= 0) {
        this.altoEm = "ceu"; this.yNav = CIDADE.pisoY; this.jet.noAr = false; this.somPouso(v.vy); return;
      }
      for (let k = 0; k < ILHOTAS.length; k++) {
        const t = this.cidade.alturaIlhota(k);
        if (ilhotaEm(eu.pos) === k && yAnt >= t - 0.05 && v.y <= t && v.vy <= 0) { this.ilhota = k; this.jet.noAr = false; this.somPouso(v.vy); return; }
      }
      // corpos sólidos: a ilha (por baixo / de lado) e as ilhotas (de lado / por baixo)
      const f = foraDaIlha({ x: eu.pos.x, y: v.y, z: eu.pos.z }); eu.pos.x = f.x; eu.pos.z = f.z; if (f.y !== v.y) { v.y = f.y; v.vy = Math.min(0, v.vy); }
      for (const p of this.pilaresDasIlhotas()) {
        const dx = eu.pos.x - p.x, dz = eu.pos.z - p.z, d = Math.hypot(dx, dz);
        if (d >= p.r || v.y >= p.topo || v.y <= p.base!) continue;
        if (yAnt <= p.base! + 0.3) { v.y = p.base!; v.vy = Math.min(0, v.vy); continue; }   // bateu a cabeça por baixo
        const k = d > 1e-4 ? p.r / d : 1; eu.pos.x = p.x + (d > 1e-4 ? dx * k : p.r); eu.pos.z = p.z + (d > 1e-4 ? dz * k : 0);
      }
    }
    const q: { x: number; z: number } = resolverNoAr(prev, eu.pos, v.y, yAnt, qg, v.y < topo - 0.2 ? [...this.colisores, ...this.colisoresDeNaves(this.naveEst.y)] : this.colisores);
    eu.pos.x = q.x; eu.pos.z = q.z; this.jet.y = v.y; this.jet.vy = v.vy;
    if (pnPerto && v.vy <= 0) {   // de mochila na nave: pelo vão da REDOMA (aberta) cai-se na cabine; na RAMPA, pousa-se nela
      const base = alturaDoConves(pnPerto), b = pousoNaNave(paraLocal(pnPerto, q), yAnt - base, v.y - base, this.redomaChamando(), rampaDaNave(pnPerto).queda);
      if (b) { this.bordo = b; this.jet.noAr = false; this.saindoPelaRedoma = false; this.jetV = { x: 0, z: 0 }; const w = paraMundo(pnPerto, b); eu.pos.x = w.x; eu.pos.z = w.z; this.somPouso(v.vy); return; }
    }
    if (sobreODorso && yAnt >= topo - 0.05 && v.y <= topo && v.vy <= 0) { this.jet.noAr = false; this.sobreNave = true; this.somPouso(v.vy); return; }
    const chao = chaoNoAr(q, qg), chaoVisto = chao > 0 && z ? chao + this.boia(z) : chao;
    if (v.y <= chaoVisto && v.vy <= 0) {
      this.jet.noAr = false; this.somPouso(v.vy);
      if (chao > 0.01 && z) { this.altoEm = z.poi.id; this.yNav = chao; } else { this.altoEm = null; this.yNav = 0; }
    }
  }
  /** Balão de fala sobre a pessoa (chat da sala). */
  falar(userId: string, texto: string) {
    const a = userId === this.o.eu.id ? this.eu : this.remotos.get(userId); if (!a) return;
    if (userId !== this.o.eu.id) this.som.tocar("chat-pop");
    this.falas = this.falas.filter((f) => { if (f.ator === a) { f.el.remove(); return false; } return true; });
    const el = document.createElement("div"); el.style.cssText = FALA_CSS + "border-color:" + a.color + ";"; el.textContent = texto.slice(0, 140);
    this.o.overlay.appendChild(el); this.falas.push({ el, ator: a, ate: performance.now() + 4200 });
  }
  get minhaBase(): LayoutBase | undefined { return this.layouts.get(this.o.eu.id); }
  /** altura do piso de um nível de base: chão, Zaeon (ilha no céu, flutuando) ou salão do QG (flutuando) */
  private yDoNivel(n?: NivelBase): number {
    if (n === "ceu") return this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY;
    if (n === "qg") { const z = this.zaeon(), mn = z ? marcoNav(z.poi) : null; return mn ? mn.nav.pisoY + this.boia(z) : 0; }
    return 0;
  }
  /** põe o meu avatar num nível fora do chão (sem pedir nada ao servidor: a base é minha — os outros só desenham
   *  alguém no céu se o SERVIDOR o marcou fundador) */
  private entrarNivel(n: NivelBase) {
    if (n === "ceu") { this.altoEm = "ceu"; this.yNav = CIDADE.pisoY; this.portalArmado = false; return; }
    const z = this.zaeon(), mn = z ? marcoNav(z.poi) : null;
    if (z && mn) { this.altoEm = z.poi.id; this.yNav = mn.nav.pisoY; }
  }
  /** em que nível alguém está (pra base "acender" só com a pessoa no mesmo piso) */
  private nivelDe(id: string): NivelBase | "chao" | "topo" {
    if (id === this.o.eu.id) return this.noCeu ? "ceu" : this.noTopo ? "topo" : this.altoEm ? "qg" : "chao";
    const a = this.remotos.get(id); if (!a) return "chao";
    return a.ceu ? "ceu" : a.topo ? "topo" : a.alt > 2 ? "qg" : "chao";
  }
  /** colisores das bases de um nível fora do chão */
  private colisoresDoNivel(n: NivelBase) {
    const ls = [...this.layouts.values()].filter((l) => l.nivel === n);
    if (n === "qg" && this.baseQG) ls.push(this.baseQG.layout);
    return ls.map((l) => ({ x: l.x, z: l.z, r: BASE_COLLIDER_R }));
  }

  /** Subir ao topo da Zaeon. Só chamar DEPOIS do OK do servidor (POST /api/lounge3d/[id]/topo valida o fundador). */
  subir(): boolean {
    const z = this.zaeon(); if (!z || !this.ehFundador(this.o.eu.id) || this.menu) return false;
    const p = localParaMundo(this.eixoTopo()!, 0, 1.3 * this.escalaZaeon());
    this.noTopo = true; this.altoEm = null; this.alvo = null; this.alvoDepois = null; this.sitT = 0; this.jet.noAr = false; this.sobreNave = false; this.ilhota = null; this.plat = null; this.bordo = null;
    this.eu.pos.set(p.x, 0, p.z); this.o.onTopo?.(true); this.som.tocar("rise", this.eu.av.group.position, { dist: DISTANCIA.perto }); return true;
  }
  /** Descer do topo: pousa no salão do QG (dentro das muralhas, perto do portão); sem chão andável, na borda. */
  descer() {
    const z = this.zaeon(); if (!z || !this.noTopo) return;
    const mn = marcoNav(z.poi);
    this.noTopo = false; this.alvo = null; this.alvoDepois = null; this.sitT = 0;
    if (mn) { const q = deEscada(mn, mn.nav.muralhaR - 2.5, 0); this.eu.pos.set(q.x, 0, q.z); this.altoEm = z.poi.id; this.yNav = mn.nav.pisoY; }
    else { const b = bordaDoPOI(z.poi, { x: 0, z: 0 }); this.eu.pos.set(b.x, 0, b.z); }
    this.o.onTopo?.(false);
  }

  // ───────────── Cidade Zaeon (céu) e nave — chamar só DEPOIS do OK do servidor (ação privilegiada) ─────────────
  get noCeu() { return this.altoEm === "ceu"; }
  /** atravessa o portal: aparece na cidade, perto do portal de volta */
  entrarNoCeu() {
    if (!this.cidade || this.menu) return;
    const c = mundo(CIDADE.chegada);
    this.pilotando = false; this.noTopo = false; this.alvo = null; this.alvoDepois = null; this.sitT = 0; this.jet.noAr = false; this.sobreNave = false; this.ilhota = null; this.plat = null; this.bordo = null;
    this.eu.pos.set(c.x, 0, c.z); this.eu.facing = Math.atan2(-CIDADE.chegada.x, -CIDADE.chegada.z);
    this.altoEm = "ceu"; this.yNav = CIDADE.pisoY; this.portalArmado = false;
    this.camT.set(c.x, CIDADE.pisoY + 1.2, c.z);   // sem "voar" a câmera: corte seco (o React faz o fade)
    this.som.tocar("rise", new THREE.Vector3(c.x, CIDADE.pisoY + 1, c.z), { dist: DISTANCIA.perto });   // subiu pra Zaeon
  }
  /** portal de volta: reaparece na praça */
  voltarDaCidade() {
    const lay = this.layouts.get(this.o.eu.id), sp = lay && !lay.nivel ? spawnDaBase(lay) : { x: 0, z: 4 };   // base lá em cima → praça
    this.pilotando = false; this.altoEm = null; this.yNav = 0; this.noTopo = false; this.alvo = null; this.alvoDepois = null;
    this.jet.noAr = false; this.ilhota = null; this.plat = null; this.bordo = null; this.sobreNave = false;   // teleporte: acabou qualquer queda/ilhota
    this.eu.pos.set(sp.x, 0, sp.z); this.camT.set(sp.x, 1.2, sp.z); this.portalArmado = true;
  }
  /** embarca na nave (precisa estar perto dela) */
  embarcar() {
    // assume o LEME (só a bordo, na ponte; o React já validou no servidor que é o dono)
    if (!this.nave || this.pilotando || this.moto !== null || !this.bordo || acaoNaNave(this.bordo, true) !== "pilotar" || !this.ehFundador(this.o.eu.id)) return;
    this.pilotando = true; this.bordo = null; this.autoPouso = false; this.alvo = null; this.alvoDepois = null; this.sitT = 0; this.naveMexida = true;
    this.naveEst = { ...this.naveEst, vx: 0, vy: 0, vz: 0 };
    this.pousado = this.naveEst.y - chaoDoVoo(this.naveEst, this.solidosDeVoo()) < 0.35;
    this.eu.tag.style.display = "none";
  }
  /** LARGA O LEME: a nave para onde está (pousada ou PAIRANDO no ar — é estacionária) e eu fico de pé na ponte */
  desembarcar() {
    if (!this.pilotando) return;
    this.pararRota(); this.autoPouso = false; this.voY.subir = this.voY.descer = false;
    const n = this.naveEst; this.naveEst = { ...n, vx: 0, vy: 0, vz: 0 };
    this.pilotando = false; this.bordo = { ...NAVE_QG.emPe, nivel: 1 };   // de pé na cabine: a redoma abre
    this.eu.facing = n.yaw; this.eu.av.group.visible = true;
    if (this.ehFundador(this.o.eu.id)) this.o.onNaveParada?.({ x: n.x, y: n.y, z: n.z, yaw: n.yaw });
  }
  /** SPAWN do dono: dentro da nave-QG, de pé na CABINE DE COMANDO (redoma aberta), olhando pra proa — onde quer que
   *  ela esteja estacionada (a posição é no referencial da nave). Os outros nascem como antes. */
  private spawnNaNave(): boolean {
    if (!this.nave || !this.ehFundador(this.o.eu.id)) return false;
    const p = this.poseNave(); if (!p) return false;
    this.altoEm = null; this.yNav = 0; this.noTopo = false; this.ilhota = null; this.plat = null; this.sobreNave = false;
    this.jet.noAr = false; this.sitT = 0; this.eu.sit = 0; this.alvo = null; this.alvoDepois = null;
    this.bordo = { ...NAVE_QG.emPe, nivel: 1 };
    const w = paraMundo(p, this.bordo); this.eu.pos.set(w.x, 0, w.z); this.eu.facing = p.yaw;
    this.camAz = p.yaw + Math.PI;   // a câmera atrás de mim, olhando pra proa
    this.camT.set(w.x, alturaDoConves(p) + NAVE_QG.cabine + 1.2, w.z);
    return true;
  }
  /** a nave-QG que está À VISTA (a minha cópia, ou a do dono quando ele está online com ela) e a pose dela */
  private poseNave(): (PoseNave & { h: NaveHandle }) | null {
    if (!this.ehFundador(this.o.eu.id)) for (const a of this.remotos.values()) if (a.nave) return a.naveP ? { ...a.naveP, h: a.nave } : { x: a.pos.x, y: a.alt, z: a.pos.z, yaw: a.naveYaw ?? 0, h: a.nave };
    return this.nave ? { x: this.naveEst.x, y: this.naveEst.y, z: this.naveEst.z, yaw: this.naveEst.yaw, h: this.nave } : null;
  }
  /** ENTRA na nave (perto da porta de trás, lá fora — a pé ou de mochila): aparece no corredor, olhando pra proa */
  entrarNaNave() {
    const p = this.poseNave(); if (!p || this.pilotando || this.moto !== null) return;
    this.altoEm = null; this.yNav = 0; this.noTopo = false; this.ilhota = null; this.plat = null; this.sobreNave = false; this.jet.noAr = false; this.jetV = { x: 0, z: 0 };
    this.sitT = 0; this.alvo = null; this.alvoDepois = null;
    this.bordo = { x: 0, z: NAVE_QG.portaDentro.z + 1.4, nivel: 0 };
    const w = paraMundo(p, this.bordo); this.eu.pos.set(w.x, 0, w.z); this.eu.facing = p.yaw;
    this.som.tocar("near-ping", this.eu.av.group.position, { dist: DISTANCIA.eu });
  }
  /** quanto a rampa desce agora (onde a nave está) */
  private quedaRampa(): number { const p = this.poseNave(); return p ? rampaDaNave(p).queda : NAVE_QG.deck; }
  /** a porta dá em chão firme: a nave pousada no chão ou na doca (a saída na ilha da Zaeon, na altura do piso) */
  private saidaSegura(): boolean {
    const p = this.poseNave(); if (!p) return false;
    if (p.y < 1.5) return true;
    return naIlhaPrincipal(paraMundo(p, NAVE_QG.saida)) && Math.abs(alturaDoConves(p) - CIDADE.pisoY) < 1.5;
  }
  /** SAI pela porta de trás: aparece no fim da rampa, na altura do convés — pousada, desce pro chão; PAIRANDO, cai
   *  (e dá pra voar de mochila): a nave é estacionária, dá pra sair dela no ar */
  sairDaNave() {
    const p = this.poseNave(); if (!p || !this.bordo) return;
    const w = paraMundo(p, NAVE_QG.saida); this.bordo = null;
    this.eu.pos.set(w.x, 0, w.z); this.eu.facing = p.yaw + Math.PI; this.eu.alt = alturaDoConves(p);
    this.cairDaqui();
  }
  /** onde a nave-QG ficou estacionada (vem da sala): vale enquanto o dono não mexe nela nesta sessão */
  setNaveQG(pose: PoseNave | null) {
    if (!pose || this.pilotando || this.naveMexida) return;
    this.naveEst = { ...this.naveEst, ...pose, vx: 0, vy: 0, vz: 0 };
  }
  /** botões de movimento na tela: SUBIR/DESCER (segurar) */
  comandoVoo(c: { subir?: boolean; descer?: boolean }) { if (c.subir !== undefined) this.voY.subir = c.subir; if (c.descer !== undefined) this.voY.descer = c.descer; if (c.subir || c.descer) this.autoPouso = false; }
  /** botões de movimento na tela: direcional (x = direita, z = trás; relativo à câmera, como WASD) */
  direcaoVoo(x: number, z: number) { this.botDir.x = x; this.botDir.z = z; if (x || z) this.autoPouso = false; }
  /** atalho: a nave voa sozinha (com as mesmas entradas dos botões) até pousar no destino; qualquer botão cancela */
  irPara(destino: DestinoRota): boolean {
    if (!this.pilotando) return false;
    const z = this.zaeon(), mn = z ? marcoNav(z.poi) : null, corpo = z ? this.pilaresZaeon(z)[0] : undefined;
    const pontos = rotaPara(destino, this.naveEst, mn && corpo ? pousoDoQG({ x: mn.x, z: mn.z, dir: mn.nav.escada.dir, muralhaR: mn.nav.muralhaR }, corpo.topo) : undefined);
    if (!pontos.length) return false;
    this.rota = { destino, pontos }; this.autoPouso = false; this.o.onRota?.(destino); return true;
  }
  pararRota() { if (this.rota) { this.rota = null; this.o.onRota?.(null); } }
  /** "Pousar": desce sozinho até encostar no chão embaixo (mapa, cidade ou topo da Zaeon) */
  pousar() { if ((this.pilotando && !this.pousado) || (this.moto !== null && !this.motoPousado)) this.autoPouso = true; }
  /** as vagas com alguém montado AGORA (eu e os remotos) → quem */
  private vagasOcupadas(): Map<number, Ator> {
    const m = new Map<number, Ator>();
    if (this.moto !== null) m.set(this.moto, this.eu);
    for (const a of this.remotos.values()) if (a.moto && !m.has(a.moto.s)) m.set(a.moto.s, a);
    return m;
  }
  /** a vaga livre ao alcance (pra montar) — só no chão do mapa, a pé */
  private motoAoAlcance(): number { return this.podeMontar() ? motoPerto(this.eu.pos, new Set(this.vagasOcupadas().keys()), this.noCeu) : -1; }
  /** a pé, no chão do mapa ou no piso da Zaeon (os dois estacionamentos) */
  private podeMontar() { return !this.menu && !this.pilotando && this.moto === null && !this.jet.noAr && (!this.altoEm || this.noCeu) && !this.noTopo && !this.sobreNave && this.ilhota === null && this.plat === null && this.bordo === null && this.motos.length > 0; }
  /** MONTA na moto da vaga `s` (qualquer pessoa; tem que estar perto e a vaga livre) */
  montar(s = this.motoAoAlcance()): boolean {
    const v = vagas()[s];
    if (!v || !this.podeMontar() || v.ceu !== this.noCeu || this.vagasOcupadas().has(s) || Math.hypot(this.eu.pos.x - v.x, this.eu.pos.z - v.z) > MOTO.alcance) return false;
    this.motoAlvo = null; this.moto = s; this.motoEst = { x: v.x, y: this.yDaVaga(v), z: v.z, yaw: v.yaw, vx: 0, vy: 0, vz: 0 };
    this.altoEm = null; this.yNav = 0;   // montado, o nível é o da moto this.motoPousado = true; this.autoPouso = false;
    this.sitT = 0; this.alvo = null; this.alvoDepois = null; this.falandoCom = null; this.jetV = { x: 0, z: 0 };
    this.som.tocar("ship-touchdown", this.motos[s]!.h.group.position, { dist: DISTANCIA.eu, volume: 0.35, taxa: 1.5 });
    return true;
  }
  /** a altura de uma vaga: chão, ou o piso da Zaeon (que flutua) */
  private yDaVaga(v: { ceu: boolean }) { return v.ceu ? (this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY) : 0; }
  /** DESCE da moto (pousada): fica ao lado dela; a moto volta pra vaga. No piso da Zaeon → anda na ilha; pousada noutro
   *  alto (telhado/muralha) → cai dali */
  desmontar() {
    if (this.moto === null || !this.motoPousado) return;
    const m = this.motoEst, lx = Math.cos(m.yaw), lz = -Math.sin(m.yaw);   // a esquerda de quem pilota
    this.moto = null; this.autoPouso = false; this.voY.subir = false; this.voY.descer = false;
    this.eu.pos.set(m.x + lx * 1.6, 0, m.z + lz * 1.6); this.eu.facing = m.yaw;
    if (Math.abs(m.y - CIDADE.pisoY) < 1 && naIlhaPrincipal(this.eu.pos)) { this.altoEm = "ceu"; this.yNav = CIDADE.pisoY; this.portalArmado = false; }
    else if (m.y > 0.5) { this.eu.alt = m.y; this.cairDaqui(); }
  }
  /** o dono manda onde a nave dele está estacionada (presença `naveParada`) — sem hangar, sempre que não está pilotando */
  private naveForaDoHangar() { return !!this.nave && this.ehFundador(this.o.eu.id); }   // sem hangar: a nave do dono está sempre "parada em algum lugar"
  /** (pra quem NÃO é o dono) o dono está online com a nave → a minha cópia some (só existe uma nave) */
  private naveDoDonoFora() { if (this.ehFundador(this.o.eu.id)) return false; for (const a of this.remotos.values()) if (a.nave) return true; return false; }
  // ───────────── áudio ─────────────
  /** loops fixos do mundo + destrave. O gesto (o "Iniciar" da landing, ou o 1º clique/toque/tecla) só DESTRAVA: o som do
   *  cyberespaço só liga ao ENTRAR de fato na cena 3D (fora do menu) — na landing/menu, nada do cyberespaço toca. */
  private montarSom() {
    const s = this.som;
    this.somLoops.leito = s.loop("space-bed", null);
    const bn = new THREE.Object3D(); bn.position.set(BURACO_NEGRO.x, BURACO_NEGRO.y, BURACO_NEGRO.z); this.cena.scene.add(bn);
    s.volumeLoop(s.loop("blackhole-hum", bn, { dist: DISTANCIA.grande }), 1);
    this.somLoops.jet = this.loopsDoJato(this.eu.av.group, DISTANCIA.eu);   // contínuo enquanto se segura o ESPAÇO
    if (this.nave) { this.somLoops.naveIdle = s.loop("ship-idle", this.nave.group, { dist: DISTANCIA.grande }); this.somLoops.naveVoo = s.loop("ship-flight", this.nave.group, { dist: DISTANCIA.naveLocal }); }
    const destravar = () => { musica().destravar(); if (!this.menu) s.ativar(); };
    if (musica().destravado && !this.menu) s.ativar();
    // na fase de CAPTURA: o canvas/HUD param a propagação dos cliques, mas o gesto tem que destravar o áudio mesmo assim
    for (const ev of ["pointerdown", "keydown", "touchstart"] as const) { window.addEventListener(ev, destravar, { once: true, passive: true, capture: true }); this.cleanups.push(() => window.removeEventListener(ev, destravar, { capture: true })); }
  }
  /** um passo sutil (alterna os 3 arquivos; volume e afinação variam um pouco — nada de passo "carimbado") */
  private tocarPasso(a: Ator, dist: Dist = DISTANCIA.eu) {
    this.passoI = (this.passoI + 1 + Math.floor(Math.random() * 2)) % PASSOS.length;
    this.som.tocar(PASSOS[this.passoI]!, a.av.group.position, { dist, volume: 0.8 + Math.random() * 0.3, taxa: 0.93 + Math.random() * 0.12 });
  }
  /** pousou (mochila): o pouso + o BAQUE do corpo no chão, mais forte (e mais grave) quanto mais rápido caía */
  private somPouso(vy: number) {
    this.jetV = { x: 0, z: 0 }; this.impulsoFrente = false;   // pousou: acabou o embalo
    const f = impactoDoPouso(vy), em = this.eu.av.group.position;
    this.som.tocar("land", em, { dist: DISTANCIA.eu, volume: 0.6 + 0.4 * f });
    this.som.tocar("baque", em, { dist: DISTANCIA.eu, volume: 0.3 + 0.7 * f, taxa: 1.12 - 0.3 * f });
  }
  private soltarSomJet(a: Ator) { if (a.somJet) { for (const l of a.somJet) this.som.soltarLoop(l); a.somJet = null; } }
  /** o jato da mochila em 2 camadas (ronco gravado + sopro sintetizado) presas a um objeto */
  private loopsDoJato(obj: THREE.Object3D, dist: Dist): LoopSom[] { return [this.som.loop("jetpack", obj, { dist }), this.som.loop("jato-sopro", obj, { dist })]; }
  /** volume/afinação do jato pelo empuxo; o sopro sobe mais que o ronco quando se segura (ataque rápido, solta suave) */
  private ajustarJato(ls: LoopSom[], noAr: boolean, segurando: boolean, vy: number) {
    const sj = somDoJato(noAr, segurando, vy), vel = sj.volume > 0.5 ? 14 : 4;
    ls.forEach((l, i) => { this.som.volumeLoop(l, i === 0 ? sj.volume : sj.volume * (segurando ? 1 : 0.5), vel); this.som.taxaLoop(l, i === 0 ? sj.taxa : sj.taxa * 1.05); });
  }
  private soltarSomNave(a: Ator) { if (!a.somNave) return; this.som.soltarLoop(a.somNave.idle); this.som.soltarLoop(a.somNave.voo); a.somNave = null; }
  /** por quadro: leito (cross-fade com a música da intro), nave (idle/voo/decolagem/pouso), cristais, neurônios, colegas */
  private atualizarSom(dt: number) {
    const s = this.som; this.tVivo += dt;
    // a entrada no cyberespaço (tela cheia, sem menu): o whoosh toca assim que o som estiver pronto
    if (!this.somEntrada && !this.menu && s.temSom("cyber-enter")) { this.somEntrada = true; s.tocar("cyber-enter"); }
    // o leito do espaço abaixa quando a música do toca-discos está tocando e eu estou no lounge (não briga com ela)
    const td = this.somLounge?.tocando && this.noCeu && this.cidade?.tocaDiscos ? this.cidade.tocaDiscos.getWorldPosition(this.tmp) : null;
    const naMusica = !!td && Math.hypot(this.eu.pos.x - td.x, this.eu.pos.z - td.z) < 22;
    if (this.somLoops.leito) s.volumeLoop(this.somLoops.leito, fatorLeito(musica().estado) * (naMusica ? 0.25 : 1));
    // cristais: só com o MEU avatar perto da base (no mesmo piso) — o ouvinte é a câmera, que fica longe do avatar
    for (const [id, l] of this.somCristais) {
      const b = this.layouts.get(id), mesmoPiso = b && (b.nivel ?? "chao") === this.nivelDe(this.o.eu.id);
      s.volumeLoop(l, mesmoPiso ? fatorCristais(Math.hypot(this.eu.pos.x - b.x, this.eu.pos.z - b.z)) : 0);
    }
    // a MINHA mochila: jato contínuo (ataque rápido ao apertar, solta suave), mais agudo subindo
    if (this.somLoops.jet) this.ajustarJato(this.somLoops.jet, this.jet.noAr, this.jet.tecla || this.impulsoFrente, this.jet.tecla ? this.jet.vy : 3);
    // a MINHA nave: idle parada, voo em movimento; decolagem/pouso nas transições; pilotando quase não paneia
    if (this.nave && this.somLoops.naveIdle && this.somLoops.naveVoo) {
      const voando = this.pilotando && !this.pousado, vel = Math.hypot(this.naveEst.vx, this.naveEst.vz) / VOO.vel;
      s.volumeLoop(this.somLoops.naveVoo, voando ? 0.35 + 0.65 * Math.min(1, vel) : 0);
      s.volumeLoop(this.somLoops.naveIdle, voando || !this.nave.group.visible ? 0 : 1);
      s.distanciaLoop(this.somLoops.naveIdle, this.pilotando ? DISTANCIA.naveLocal : DISTANCIA.grande);
      // SUBIR/DESCER: o som sai UMA vez, no começo da ação (apertou), preso à nave; depois fica só o som de voo
      const g = gatilhosVoo(this.gatilhoNave, { subindo: this.pilotando && this.cmdVoo.subir && this.naveEst.y < VOO.yMax - 0.3, descendo: this.pilotando && !this.pousado && this.cmdVoo.descer }, dt);
      this.gatilhoNave = g.e;
      if (g.sobe) s.tocar("ship-takeoff", null, { dist: DISTANCIA.naveLocal, seguir: this.nave.group });
      if (g.desce) s.tocar("ship-landing", null, { dist: DISTANCIA.naveLocal, seguir: this.nave.group });
      // tocar o chão = impacto (1×)
      const n = this.naveEst, ev = eventosNave(this.somNave, { pousado: this.pousado, vy: n.vy, altura: n.y - chaoDoVoo(n, this.pilotando ? this.solidosDeVoo() : []) }, dt);
      this.somNave = ev.e;
      if (this.pilotando) {
        const em = this.nave.group.position, d = { dist: DISTANCIA.naveLocal };
        if (ev.pousou) s.tocar("ship-touchdown", em, d);
      }
    }
    // neurônios subindo da minha base: um brilho de vez em quando (se estou por perto)
    this.neuronioT -= dt;
    if (this.neuronioT <= 0) {
      this.neuronioT = intervaloNeuronio(Math.random());
      const l = this.minhaBase; if (l && this.distBase(this.o.eu.id, this.eu.pos) < 25) this.som.tocar("neuron-chime", new THREE.Vector3(l.x, this.yDoNivel(l.nivel) + 2.5, l.z), { dist: DISTANCIA.perto });
    }
    // colegas: passos (perto), e um ping quando fico perto de alguém (dá pra conversar)
    for (const a of this.remotos.values()) {
      const d = a.pos.distanceTo(this.eu.pos);
      const pisadas = a.av.passosNovos();
      if (a.moving && a.jet === undefined && !a.nave && !a.moto && d < 15) {
        if (pisadas !== null) for (let k = 0; k < pisadas; k++) this.tocarPasso(a, DISTANCIA.perto);
        else { a.passoT = (a.passoT ?? 0) + dt; if (a.passoT >= cadenciaPasso(false)) { a.passoT = 0; this.tocarPasso(a, DISTANCIA.perto); } }
      }
      // mochila do colega: jato posicional (vem do lado certo); ao pousar, o baque dele
      if (a.jet !== undefined) {
        if (!a.somJet) a.somJet = this.loopsDoJato(a.av.group, DISTANCIA.padrao);
        const vy = a.vyJet ?? 0; this.ajustarJato(a.somJet, true, vy > -3, vy); a.vyUlt = vy;
      } else if (a.somJet) {
        const f = impactoDoPouso(a.vyUlt ?? 0); s.tocar("baque", a.av.group.position, { dist: DISTANCIA.perto, volume: 0.3 + 0.7 * f, taxa: 1.12 - 0.3 * f });
        this.soltarSomJet(a);
      }
      const pertoAgora = d < 3;
      if (pertoAgora && !a.perto) s.tocar("near-ping", a.av.group.position, { dist: DISTANCIA.perto });
      a.perto = pertoAgora;
    }
    s.atualizar(dt);
  }
  private vozPendente = new Map<string, MediaStream>();
  /** a VOZ de alguém (WebRTC) chegou → sai pelo avatar dele (posicional); null = acabou. Se o avatar ainda não
   *  existe (a voz chegou antes da 1ª pose), espera ele aparecer. */
  vozDe(userId: string, stream: MediaStream | null) {
    const a = this.remotos.get(userId);
    if (!a) { if (stream) this.vozPendente.set(userId, stream); else this.vozPendente.delete(userId); return; }
    a.vozH?.remover(); a.vozH = null;
    if (stream) a.vozH = this.som.voz(a.av.group, stream);   // sem gesto ainda: a voz espera na fila do AudioCyber
  }
  /** o recado ATUAL do dono pro QG: holograma ao lado da tela do Andrei + a TV do lounge; recado NOVO (depois de
   *  carregar) acende o holograma e toca um ping lá */
  setRecado(r: RecadoQG | null) {
    const novo = this.recadoId !== undefined && !!r && r.id !== this.recadoId;
    this.recadoId = r?.id ?? null;
    this.holo?.mostrar(r, novo);
    this.cidade?.mostrarRecadoNaTV(r?.texto ?? null);
    if (novo && this.holo) this.som.tocar("neuron-chime", this.holo.group.position.clone().setY(this.holo.group.position.y + 2.2), { dist: DISTANCIA.padrao });
  }
  /** a playlist/estado do toca-discos do lounge (da sala) + a diferença de relógio servidor − cliente (ms) */
  setSomLounge(som: SomLounge | null, offsetMs = 0) { this.somLounge?.aplicar(som, offsetMs); }
  /** releitura das preferências de som (o React chama ao mudar liga/desliga ou volume) */
  aplicarPrefsSom() { this.som.aplicarPrefs(); }

  /** cada moto: na vaga (parada, flutuando), comigo (o meu voo) ou com um remoto (a pose dele). Devolve quem monta qual. */
  private atualizarMotos(dt: number, t: number): Map<number, Ator> {
    const ocup = this.vagasOcupadas(), vs = vagas();
    this.motos.forEach((m, i) => {
      const quem = ocup.get(i), g = m.h.group;
      let voando = false, vel = 0;
      if (quem === this.eu) { const e = this.motoEst; g.position.set(e.x, e.y, e.z); g.rotation.y = e.yaw; voando = !this.motoPousado; vel = Math.hypot(e.vx, e.vz) / VOO.vel; }
      else if (quem?.moto) { g.position.set(quem.pos.x, quem.alt, quem.pos.z); g.rotation.y = quem.moto.yaw; voando = quem.alt > 0.5 || quem.moving; vel = quem.moving ? 1 : 0; }
      else { const v = vs[i]!; g.position.set(v.x, this.yDaVaga(v), v.z); g.rotation.y = v.yaw; }
      let d = g.rotation.y - m.yawAnt; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; m.yawAnt = g.rotation.y;
      const y = g.position.y; m.vy = m.yAnt === null || dt <= 0 ? 0 : m.vy + ((y - m.yAnt) / dt - m.vy) * Math.min(1, dt * 4); m.yAnt = y;
      m.h.atualizar({ dt, t, voando, vel, curva: d / Math.max(dt, 1e-3), vy: m.vy });
      // som: o motor (mais agudo que o da nave) só em quem está montado; o meu quase não paneia
      if (quem && !m.idle) { m.idle = this.som.loop("ship-idle", g, { dist: quem === this.eu ? DISTANCIA.naveLocal : DISTANCIA.padrao }); m.voo = this.som.loop("ship-flight", g, { dist: quem === this.eu ? DISTANCIA.naveLocal : DISTANCIA.padrao }); this.som.taxaLoop(m.idle, 1.7); this.som.taxaLoop(m.voo, 1.45); }
      if (!quem && m.idle) { this.som.soltarLoop(m.idle); if (m.voo) this.som.soltarLoop(m.voo); m.idle = null; m.voo = null; }
      if (m.idle && m.voo) { this.som.volumeLoop(m.idle, voando ? 0 : 0.45); this.som.volumeLoop(m.voo, voando ? (0.3 + 0.5 * Math.min(1, vel)) : 0); }
    });
    return ocup;
  }
  /** encaixa um avatar na moto `s`: quadril no banco, mãos nos punhos, pés nas pedaleiras (IK do AvatarLuz) */
  private naMoto(av: AvatarLuzHandle, s: number): Montado | null {
    const m = this.motos[s]; if (!m) return null;
    m.h.group.updateWorldMatrix(true, true);
    m.h.assento.getWorldPosition(av.group.position); av.olharPara(m.h.group.rotation.y);
    const v = this.montadoTmp, p = m.h.pontos;
    p.maoE.getWorldPosition(v.maoE); p.maoD.getWorldPosition(v.maoD); p.peE.getWorldPosition(v.peE); p.peD.getWorldPosition(v.peD);
    return { w: 1, ...v };
  }
  /** as motos PARADAS na vaga são sólidas pra quem anda (círculo do tamanho do corpo) */
  private colisoresDeMotos(ceu = false): Colisor[] {
    if (!this.motos.length) return [];
    const ocup = this.vagasOcupadas();
    return vagas().flatMap((v, i) => ocup.has(i) || v.ceu !== ceu ? [] : [{ x: v.x, z: v.z, r: 1.1 }]);
  }
  /** altura do dorso da nave (onde se fica em pé) e o raio andável lá em cima */
  private topoNave(): number { return this.naveEst.y + 2.2 * ESCALA_NAVE; }
  private static readonly TOPO_NAVE_R = 2.2 * ESCALA_NAVE;
  /** o quanto a câmera se afasta (roda do mouse / pinça) — a nave-QG tem 68 m */
  private static readonly CAM_MAX = 70;
  /** colisores das naves PARADAS (o disco inteiro) pra quem anda/voa baixo no mesmo nível — não se atravessa a nave */
  private colisoresDeNaves(alt: number): Colisor[] {
    const R = 3.75 * ESCALA_NAVE, out: Colisor[] = [];
    if (this.saindoPelaRedoma) return [];   // saindo pela redoma: o próprio casco não empurra
    { const p = this.poseNave(); if (p && this.redomaChamando() && Math.hypot(this.eu.pos.x - p.x, this.eu.pos.z - p.z) < RAIO_REDOMA) return []; }   // entrando pelo vão da redoma
    const noCorpo = (y: number) => alt > y - 1 && alt < y + 2.2 * ESCALA_NAVE;   // o casco vai do chão até o dorso
    if (this.nave && !this.pilotando && this.nave.group.visible && noCorpo(this.naveEst.y)) out.push({ x: this.naveEst.x, z: this.naveEst.z, r: R });
    for (const a of this.remotos.values()) if (a.nave && a.naveP && noCorpo(a.naveP.y)) out.push({ x: a.naveP.x, z: a.naveP.z, r: R });
    return out;
  }
  /** põe um avatar SENTADO no assento do piloto, na cabine da nave */
  private noAssento(av: AvatarLuzHandle, nave: NaveHandle) {
    nave.group.updateWorldMatrix(true, true); nave.assento.getWorldPosition(this.tmp);
    av.group.position.copy(this.tmp);
  }
  /** lá fora, perto da porta de trás da nave-QG (dá pra entrar) */
  /** voltando pra nave de mochila (no ar ou em pé no dorso, perto da redoma e acima do convés): a redoma ABRE pra mim */
  private redomaChamando(): boolean {
    if (this.pilotando || this.bordo || !(this.jet.noAr || this.sobreNave)) return false;
    const p = this.poseNave(); return !!p && Math.hypot(this.eu.pos.x - p.x, this.eu.pos.z - p.z) < RAIO_REDOMA + 14 && this.eu.alt > alturaDoConves(p) + 2;
  }
  private navePerto() { const p = this.poseNave(); return !!p && !this.bordo && !this.pilotando && pertoDaEntrada(p, this.eu.pos, this.eu.alt); }
  /** sólidos de voo da Zaeon: corpo (até o alto das muralhas) e cúpula (topo do dono), acompanhando a flutuação */
  private pilaresZaeon(z: LandmarkHandle): Pilar[] { const mn = marcoNav(z.poi); return mn ? pilaresDoMarco({ x: mn.x, z: mn.z, chaoR: mn.nav.chaoR, altura: z.poi.altura + this.boia(z), escala: z.poi.escala ?? 1, cupula: !!z.topo }) : []; }
  /** sólidos pra nave: os marcos andáveis como cilindros (quem vem de cima pousa no topo) */
  private solidosDeVoo(): Pilar[] { return [...this.marcosNav().flatMap(({ lm }) => this.pilaresZaeon(lm)), ...(this.univ ? pilaresDasPlataformas() : []), ...this.pilaresDasIlhotas(), ...this.pilaresDaNaveQG()]; }
  /** a nave-QG parada é sólida pra quem voa (moto, a nave dos outros): pousa-se no dorso dela */
  private pilaresDaNaveQG(): Pilar[] { if (this.pilotando) return []; const p = this.poseNave(); return p ? [{ x: p.x, z: p.z, r: NAVE_QG.raio, topo: p.y + 2.2 * ESCALA_NAVE, base: p.y + 0.5 }] : []; }

  // ───────────── marcos / dono ─────────────
  /** o marco com topo de acesso "dono" (Zaeon) */
  private zaeon(): LandmarkHandle | undefined { return this.lms.find((l) => l.poi.acesso === "dono" && l.topo); }
  /** fundador = marcado pelo SERVIDOR (e só faz sentido se a Zaeon está na cena) */
  private ehFundador(id: string) { return !!this.pessoas.get(id)?.fundador && !!this.zaeon(); }
  /** pose do eixo do topo (centro + giro atual do marco) e a altura do topo no mundo */
  private eixoTopo(): LayoutBase | null { const z = this.zaeon(); return z ? { x: z.poi.x, z: z.poi.z, rot: z.group.rotation.y } : null; }
  private escalaZaeon() { return this.zaeon()?.poi.escala ?? 1; }
  private alturaTopo() { const z = this.zaeon(); return z && z.topo ? z.topo.getWorldPosition(this.tmp).y + 0.13 * this.escalaZaeon() : 0; }
  private tmp = new THREE.Vector3();
  /** quanto o marco está "boiando" agora (somado a quem está na plataforma) */
  private boia(lm: LandmarkHandle | undefined) { return lm ? lm.group.position.y - lm.poi.altura : 0; }
  private marcosNav(): { lm: LandmarkHandle; mn: MarcoNav }[] { return this.lms.flatMap((lm) => { const mn = marcoNav(lm.poi); return mn ? [{ lm, mn }] : []; }); }
  /** altura do chão em (x,z) considerando os marcos andáveis (sem estado — remotos) */
  private alturaChao(p: { x: number; z: number }) {
    let y = 0;
    for (const { lm, mn } of this.marcosNav()) { const h = alturaEm(mn, p); if (h > y) y = h + (h >= mn.nav.pisoY - 1e-6 ? this.boia(lm) : 0); }
    return y;
  }

  // ───────────── geometria da minha base (ou do topo, se sou o dono lá em cima) ─────────────
  private assento() {
    if (this.noTopo) { const e = this.eixoTopo(); return e ? localParaMundo(e, 0, 0.4 * this.escalaZaeon()) : { x: 0, z: 0 }; }
    const b = this.minhaBase; return b ? localParaMundo(b, 0, -0.15) : { x: 0, z: 0 };
  }
  private rotAssento() {
    if (this.noTopo) { const e = this.eixoTopo(); return e ? e.rot + Math.PI : 0; }
    const b = this.minhaBase; return b ? b.rot + Math.PI : 0;
  }
  private distBase(id: string, p: { x: number; z: number }) {
    const l = this.layouts.get(id); if (!l || this.nivelDe(id) !== (l.nivel ?? "chao")) return Infinity;   // só no mesmo piso
    return Math.hypot(p.x - l.x, p.z - l.z);
  }

  /** Passo no chão/escada/plataforma: marcos andáveis (lib/cyber/nav) + colisores do chão (bases, outros marcos). */
  private resolverChao(eu: Ator, prev: { x: number; z: number }) {
    const navs = this.marcosNav();
    if (this.altoEm) {
      const cur = navs.find((n) => n.lm.poi.id === this.altoEm);
      if (cur) {
        const r = resolverPasso(cur.mn, true, prev, eu.pos);
        const q = r.alto ? empurrarParaFora(r, this.colisoresDoNivel("qg")) : r;   // a base do Andrei no centro do salão
        eu.pos.x = q.x; eu.pos.z = q.z; this.yNav = r.y;
        if (!r.alto) { this.altoEm = null; this.yNav = 0; }
        return;
      }
      this.altoEm = null;
    }
    let q = { x: eu.pos.x, z: eu.pos.z };
    for (const { lm, mn } of navs) {
      const r = resolverPasso(mn, false, prev, q);
      if (r.alto) { this.altoEm = lm.poi.id; this.yNav = r.y; eu.pos.x = r.x; eu.pos.z = r.z; return; }
      q = r;
    }
    q = empurrarParaFora(q, [...this.colisores, ...this.colisoresDeNaves(0), ...this.colisoresDeMotos()]);
    eu.pos.x = q.x; eu.pos.z = q.z; this.yNav = 0;
  }

  // ───────────── entradas ─────────────
  private digitando() { const a = document.activeElement; return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || (a as HTMLElement).isContentEditable); }
  private ligarEntradas() {
    const on = <K extends keyof WindowEventMap>(t: K, f: (e: WindowEventMap[K]) => void) => { window.addEventListener(t, f as EventListener); this.cleanups.push(() => window.removeEventListener(t, f as EventListener)); };
    const cv = this.R.domElement;
    const onC = <K extends keyof HTMLElementEventMap>(t: K, f: (e: HTMLElementEventMap[K]) => void, opt?: AddEventListenerOptions) => { cv.addEventListener(t, f as EventListener, opt); this.cleanups.push(() => cv.removeEventListener(t, f as EventListener)); };
    on("keydown", (e) => {
      if (this.digitando() || (!this.o.teclasSempre && !this.sobContainer)) return; const k = e.key.toLowerCase();
      if (k === "shift") { this.keys.shift = true; return; }
      if (k === " " || k === "spacebar") { if (this.pilotando || this.moto !== null) { this.voY.subir = true; e.preventDefault(); return; } if (!this.menu) { this.comandoJet(true); e.preventDefault(); } return; }
      if (k === "f" && !this.menu) { if (!e.repeat) this.executarAcao(); e.preventDefault(); return; }   // F = a ação de contexto (estudar, montar, embarcar, descer…)
      if ((k === "e" || k === "q") && (this.pilotando || this.moto !== null)) { this.voY[k === "e" ? "subir" : "descer"] = true; this.autoPouso = false; e.preventDefault(); return; }
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) { this.keys[k] = true; e.preventDefault(); }
    });
    on("keyup", (e) => { const k = e.key.toLowerCase(); if (k === "shift") { this.keys.shift = false; return; } if (k === " " || k === "spacebar") { this.espaco = false; this.voY.subir = false; this.comandoJet(false); return; } if (k === "e") this.voY.subir = false; if (k === "q") this.voY.descer = false; this.keys[k] = false; });
    // olhar livre: trava/solta o ponteiro
    const aoTravar = () => {
      this.olharLivre = document.pointerLockElement === cv; this.drag = null; this.ptrs.clear();
      if (this.olharLivre && this.dicaMira) { this.dicaMira.remove(); this.dicaMira = null; }   // a dica só até a 1ª vez
      if (this.olharLivre) { this.hoverBase = null; cv.style.cursor = ""; }
    };
    document.addEventListener("pointerlockchange", aoTravar); this.cleanups.push(() => document.removeEventListener("pointerlockchange", aoTravar));
    if (this.podeOlharLivre(true)) {
      const dica = document.createElement("div"); dica.style.cssText = DICA_MIRA_CSS; dica.textContent = "Clique na cena: o mouse passa a mover a câmera · Esc solta"; this.o.overlay.appendChild(dica); this.dicaMira = dica;
      this.cleanups.push(() => { dica.remove(); if (document.pointerLockElement === cv) document.exitPointerLock(); });
    }
    onC("pointerdown", (e) => {
      if (this.olharLivre) return;   // mouse travado: clicar não faz nada (as ações são no F)
      if (e.pointerType === "mouse" && e.button === 0 && this.podeOlharLivre()) {   // 1º clique: trava o mouse (não é um clique de ação)
        this.travando = true;
        try { const pr = cv.requestPointerLock() as unknown as Promise<void> | undefined; pr?.catch?.(() => { this.travando = false; }); } catch { this.travando = false; }
        return;
      }
      this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.ptrs.size === 2) { const [a, b] = [...this.ptrs.values()]; this.pinch0 = Math.hypot(a!.x - b!.x, a!.y - b!.y); this.dist0 = this.camDist; }
      this.drag = { x: e.clientX, y: e.clientY, az: this.camAz, pitch: this.camPitch }; this.moved = false;
    });
    on("pointermove", (e) => {
      if (this.olharLivre) {   // mexer o mouse = girar a câmera (direita gira pra direita; pra baixo olha pra baixo)
        this.camAz -= e.movementX * SENS_OLHAR; this.camPitch = limitarPitch(this.camPitch + e.movementY * SENS_OLHAR * 0.85);
        return;
      }
      if (this.ptrs.has(e.pointerId)) this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.ptrs.size === 2 && this.pinch0) { const [a, b] = [...this.ptrs.values()]; this.camDist = Math.min(CyberEngine.CAM_MAX, Math.max(6, (this.dist0 * this.pinch0) / Math.max(20, Math.hypot(a!.x - b!.x, a!.y - b!.y)))); this.moved = true; return; }
      if (!this.drag) { if (e.target === cv) this.passarMouse(e.clientX, e.clientY); return; }
      const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) this.moved = true;
      this.camAz = this.drag.az - dx * 0.006; this.camPitch = limitarPitch(this.drag.pitch + dy * 0.005);   // arrastar pra baixo até o chão → olhar pro céu
    });
    on("pointerup", (e) => {
      if (this.travando) { this.travando = false; return; }
      if (this.olharLivre) return;
      const era = this.ptrs.size; this.ptrs.delete(e.pointerId); if (this.ptrs.size < 2) this.pinch0 = 0;
      if (this.drag && !this.moved && era === 1) this.clicar(e.clientX, e.clientY);
      if (!this.ptrs.size) this.drag = null;
    });
    on("pointercancel", (e) => { this.ptrs.delete(e.pointerId); if (!this.ptrs.size) { this.drag = null; this.pinch0 = 0; } });
    onC("pointerenter", () => { this.sobContainer = true; });
    onC("pointerleave", () => { this.sobContainer = false; this.hoverBase = null; cv.style.cursor = ""; });
    onC("wheel", (e) => { if (this.menu) return; /* menu: a página continua rolando */ e.preventDefault(); this.camDist = Math.min(CyberEngine.CAM_MAX, Math.max(6, this.camDist * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });
  }

  /** olhar livre só na tela cheia (fora do menu/landing), com mouse de verdade (no celular é arrastar/joystick) */
  private podeOlharLivre(ignorarMenu = false) {
    return (ignorarMenu || !this.menu) && this.o.teclasSempre && typeof document !== "undefined" && "exitPointerLock" in document && !!window.matchMedia?.("(pointer: fine)").matches;
  }
  /** a AÇÃO de contexto (tecla F / chip na tela), pela prioridade: sair do veículo pousado → estudar → montar na moto →
   *  embarcar na nave (dono) → recado na TV do lounge (dono) → falar com quem está do lado → abrir o marco perto */
  private acaoPerto(): { id: string; rotulo: string; fazer: () => void } | null {
    if (this.menu) return null;
    if (this.pilotando) return { id: `leme-${this.pousado}`, rotulo: this.pousado ? "Largar o leme" : "Estacionar aqui (largar o leme)", fazer: () => this.desembarcar() };
    if (this.bordo) {   // A BORDO: o leme (dono), o terminal de estudos, a porta
      const a = acaoNaNave(this.bordo, this.ehFundador(this.o.eu.id));
      if (a === "pilotar") return { id: "pilotar", rotulo: "Pilotar a nave", fazer: () => this.o.onEmbarcar?.() };
      if (a === "estudar") return { id: "estudar-nave", rotulo: "Estudar (meu desktop)", fazer: () => this.o.onEntrarEstudo?.() };
      if (a === "sair" && this.saidaSegura()) return { id: "sair-nave", rotulo: "Sair da nave", fazer: () => this.sairDaNave() };   // pairando no ar: desce-se pela rampa (e pula-se de mochila)
      return null;
    }
    if (this.moto !== null) return this.motoPousado ? { id: "descer-moto", rotulo: "Descer da moto", fazer: () => this.desmontar() } : null;
    if (this.jet.noAr) return null;
    const el = this.plat ? elevadorAqui(this.plat.id, this.plat.andar, this.eu.pos) : null;
    if (el && this.plat) { const pl = this.plat; return { id: `elevador-${pl.andar}`, rotulo: el.rotulo, fazer: () => { pl.andar = el.proximo; this.som.tocar("near-ping", this.eu.av.group.position, { dist: DISTANCIA.eu }); } }; }
    const estudar = { id: "estudar", rotulo: "Estudar", fazer: () => this.o.onEntrarEstudo?.() };
    if (this.perto || this.noTopo || (this.noCeu && computadorPerto(this.eu.pos, 3.2) >= 0)) return estudar;
    const m = this.motoAoAlcance(); if (m >= 0) return { id: `moto-${m}`, rotulo: "Montar na moto", fazer: () => { this.montar(m); } };
    if (this.nave && this.navePerto()) return { id: "entrar-nave", rotulo: "Entrar na nave", fazer: () => this.entrarNaNave() };
    if (this.noCeu && this.cidade?.tocaDiscos && this.ehFundador(this.o.eu.id)) {
      const td = this.cidade.tocaDiscos.getWorldPosition(this.tmp);
      if (Math.hypot(this.eu.pos.x - td.x, this.eu.pos.z - td.z) < 2.6) return { id: "som", rotulo: "Toca-discos", fazer: () => this.o.onAbrirSom?.() };
    }
    if (this.noCeu && this.cidade?.tvLounge && this.ehFundador(this.o.eu.id)) {
      const tv = this.cidade.tvLounge.getWorldPosition(this.tmp);
      if (Math.hypot(this.eu.pos.x - tv.x, this.eu.pos.z - tv.z) < 7) return { id: "recado", rotulo: "Escrever recado pro QG", fazer: () => this.o.onAbrirRecado?.() };
    }
    let colega: Ator | null = null, dc = 3.0;
    for (const a of this.remotos.values()) { const d = Math.hypot(a.pos.x - this.eu.pos.x, a.pos.z - this.eu.pos.z); if (d < dc && Math.abs(a.alt - this.eu.alt) < 2) { dc = d; colega = a; } }
    if (colega) { const c = colega; return { id: `falar-${c.id}`, rotulo: `Falar com ${c.name}`, fazer: () => { this.falandoCom = c; this.alvo = null; this.o.onFalarCom?.(c.name); c.av.olharPara(Math.atan2(this.eu.pos.x - c.pos.x, this.eu.pos.z - c.pos.z)); } }; }
    if (!this.altoEm && !this.noTopo) {
      const poi = poiPerto(this.eu.pos, this.lms.map((l) => l.poi).filter((x) => !!x.link || x.acesso === "dono"));
      if (poi) return { id: `marco-${poi.id}`, rotulo: poi.nome, fazer: () => { this.alvo = null; this.o.onLandmark?.(poi); } };
    }
    return null;
  }
  /** F (ou o chip na tela): faz a ação de contexto de agora */
  executarAcao() { const a = this.acaoPerto(); if (a) a.fazer(); }

  /** solta o mouse (o React chama ao abrir um painel ou focar o chat) */
  soltarMouse() { if (this.olharLivre && typeof document !== "undefined") document.exitPointerLock(); }

  private ndc(cx: number, cy: number) { const r = this.R.domElement.getBoundingClientRect(); return new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); }
  /** qual monitor (de qual base) está sob o ponteiro, se houver */
  private monitorSob(cx: number, cy: number): string | null {
    if (this.menu) return null;
    this.ray.setFromCamera(this.ndc(cx, cy), this.cam);
    let melhor: { id: string; d: number } | null = null;
    for (const [id, b] of this.bases) { const h = this.ray.intersectObject(b.monitor, false)[0]; if (h && (!melhor || h.distance < melhor.d)) melhor = { id, d: h.distance }; }
    return melhor?.id ?? null;
  }
  private passarMouse(cx: number, cy: number) {
    this.hoverBase = this.monitorSob(cx, cy);
    const meu = this.hoverBase === this.o.eu.id;
    this.R.domElement.style.cursor = meu && this.perto ? "pointer" : "";
  }

  private clicar(cx: number, cy: number) {
    if (this.pilotando || this.moto !== null) return;   // em voo, arrastar gira a câmera; clique não faz nada
    this.motoAlvo = null;
    const sob = this.monitorSob(cx, cy);
    this.ray.setFromCamera(this.ndc(cx, cy), this.cam);
    // uma MOTO parada: perto = monta; longe = anda até a vaga
    if (this.motos.length && (!this.altoEm || this.noCeu) && !this.noTopo) {
      const ocup = this.vagasOcupadas();
      const vs = vagas(), i = this.motos.findIndex((m, k) => !ocup.has(k) && vs[k]!.ceu === this.noCeu && this.ray.intersectObjects(m.h.alvos, true).length > 0);
      if (i >= 0) {
        if (!this.montar(i)) { const v = vagas()[i]!, lx = Math.cos(v.yaw), lz = -Math.sin(v.yaw); this.alvo = new THREE.Vector2(v.x + lx * 1.4, v.z + lz * 1.4); this.alvoDepois = null; this.falandoCom = null; this.motoAlvo = i; }
        return;
      }
    }
    // a NAVE (perto da porta) → entrar
    if (this.nave && this.ray.intersectObjects(this.nave.alvos, true).length && this.navePerto()) { this.entrarNaNave(); return; }
    // na CIDADE: computador perto = Sala de Estudos; senão anda no piso
    if (this.cidade && this.noCeu) {
      if (sob === this.o.eu.id && this.perto) { this.o.onEntrarEstudo?.(); return; }   // a minha base, na Zaeon
      // a TV do LOUNGE: o dono escreve o recado pro QG do Andrei (perto dela)
      if (this.cidade.tvLounge && this.ray.intersectObject(this.cidade.tvLounge, false).length) {
        const tv = this.cidade.tvLounge.getWorldPosition(new THREE.Vector3());
        if (Math.hypot(this.eu.pos.x - tv.x, this.eu.pos.z - tv.z) < 14) { this.o.onAbrirRecado?.(); return; }
      }
      const hc = this.ray.intersectObject(this.cidade.computadores, false)[0];
      if (hc && computadorPerto(this.eu.pos, 3.2) >= 0) { this.o.onEntrarEstudo?.(); return; }
      const h = this.ray.intersectObjects(this.cidade.alvos, true)[0];
      if (h) { const q = resolverCidade({ x: h.point.x, z: h.point.z }); this.alvo = new THREE.Vector2(q.x, q.z); this.alvoDepois = null; }
      return;
    }
    // o BURACO NEGRO é o portal (ou o anel embaixo dele)
    if (this.cidade && (this.ray.intersectObjects(this.cena.buracoNegro, true).length || this.ray.intersectObject(this.cidade.portalChao, false).length)) { this.o.onPortalCeu?.(); return; }
    let colega: Ator | null = null;
    for (const a of this.remotos.values()) if (this.eu.pos.distanceTo(a.pos) < 3.0 && this.ray.intersectObjects(a.av.meshes, true).length) { colega = a; break; }
    // no topo: o chão é a plataforma (só anda nela); o monitor do topo continua valendo
    if (this.noTopo) {
      if (sob === this.o.eu.id) { this.o.onEntrarEstudo?.(); return; }
      const z = this.zaeon(); const hit = z?.topo ? this.ray.intersectObject(z.topo, true)[0] : undefined;
      if (hit && z) { const e = this.eixoTopo()!; const dx = hit.point.x - e.x, dz = hit.point.z - e.z, d = Math.hypot(dx, dz), lim = 2.0 * this.escalaZaeon(), k = d > lim ? lim / d : 1; this.alvo = new THREE.Vector2(e.x + dx * k, e.z + dz * k); }
      return;
    }
    let marco: LandmarkHandle | null = null, hitMarco: THREE.Intersection | null = null;
    for (const lm of this.lms) { const h = this.ray.intersectObjects(lm.alvos, true)[0]; if (h) { marco = lm; hitMarco = h; break; } }
    // no ALTO (escada/plataforma): clicar na estrutura = andar até o ponto (a navegação segura muralhas/borda)
    if (this.altoEm) {
      if (sob === this.o.eu.id && this.perto) { this.o.onEntrarEstudo?.(); return; }
      if (hitMarco) { this.alvo = new THREE.Vector2(hitMarco.point.x, hitMarco.point.z); this.alvoDepois = null; this.falandoCom = null; }
      return;
    }
    // do chão, clicar nos DEGRAUS: primeiro o pé da escada, depois sobe até onde clicou
    if (marco && hitMarco && marco.escada && hitMarco.object === marco.escada) {
      const mn = marcoNav(marco.poi)!; const pe = deEscada(mn, mn.nav.bordaR + mn.nav.escada.comprimento * 0.98, 0);
      this.alvo = new THREE.Vector2(pe.x, pe.z); this.alvoDepois = new THREE.Vector2(hitMarco.point.x, hitMarco.point.z); this.falandoCom = null; return;
    }
    const acao = decidirClique({ noMonitor: sob !== null, baseMinha: sob === this.o.eu.id, pertoDaBase: this.perto, noColega: !!colega, colegaPerto: !!colega, noLandmark: !!marco, landmarkPerto: !!marco && poiPerto(this.eu.pos, [marco.poi])?.id === marco.poi.id });
    if (acao === "monitor") { this.o.onEntrarEstudo?.(); return; }
    if (acao === "landmark" && marco) { this.alvo = null; this.o.onLandmark?.(marco.poi); return; }
    if (acao === "aproximar-landmark" && marco) { const b = bordaDoPOI(marco.poi, this.eu.pos); this.alvo = new THREE.Vector2(b.x, b.z); return; }
    if (acao === "aproximar") {   // clique no meu monitor de longe: vai até a frente da base
      const l = this.minhaBase!; const dx = this.eu.pos.x - l.x, dz = this.eu.pos.z - l.z, d = Math.hypot(dx, dz) || 1;
      const r = BASE_COLLIDER_R + 0.9; this.alvo = new THREE.Vector2(l.x + (dx / d) * r, l.z + (dz / d) * r); this.falandoCom = null; return;
    }
    if (acao === "colega" && colega) {
      this.falandoCom = colega; this.alvo = null; this.o.onFalarCom?.(colega.name);
      colega.av.olharPara(Math.atan2(this.eu.pos.x - colega.pos.x, this.eu.pos.z - colega.pos.z)); return;
    }
    const h = this.ray.intersectObject(this.cena.floor)[0];
    if (h) { const p = empurrarParaFora({ x: h.point.x, z: h.point.z }, this.colisores); this.alvo = new THREE.Vector2(p.x, p.z); this.alvoDepois = null; this.falandoCom = null; this.o.onFalarCom?.(null); }
  }

  private redimensionar() {
    const c = this.o.container; this.w = Math.max(1, c.clientWidth); this.h = Math.max(1, c.clientHeight);
    this.R.setSize(this.w, this.h, false); this.cam.aspect = this.w / this.h; this.cam.updateProjectionMatrix();
  }

  private proj(v: THREE.Vector3) { const p = v.clone().project(this.cam); return { x: (p.x * 0.5 + 0.5) * this.w, y: (-p.y * 0.5 + 0.5) * this.h, vis: p.z < 1 }; }

  private atualizarCamera() {
    const l = this.minhaBase;
    if (this.menu && l) {
      const pm = Math.min(2.4, Math.max(1, 0.9 / this.cam.aspect));   // retrato: afasta p/ caber a base
      const rel = localParaMundo(l, -2.6 * pm, 4.8 * pm);
      const yb = this.yDoNivel(l.nivel);
      this.cam.position.lerp(new THREE.Vector3(rel.x, yb + 2.5 + 0.9 * (pm - 1), rel.z), 0.06);
      this.camT.lerp(new THREE.Vector3(l.x, yb + (pm > 1 ? 0.1 : 1.4), l.z), 0.06); this.cam.lookAt(this.camT);
      return;
    }
    this.camT.lerp(new THREE.Vector3(this.eu.pos.x, 1.2 + this.eu.alt, this.eu.pos.z), 0.12);
    const cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch);
    let dist = this.pilotando ? Math.max(this.camDist, 75) : this.moto !== null ? Math.max(this.camDist, 9) : this.camDist;
    // câmera em 3ª pessoa: perto de um marco (ilha flutuante, muralhas), se a estrutura fica ENTRE a câmera e o
    // personagem, a câmera se aproxima (senão a ilha cobre a tela)
    const marco = this.lms.find((l) => Math.hypot(this.eu.pos.x - l.poi.x, this.eu.pos.z - l.poi.z) < l.poi.interactR * 1.8);
    if (marco && !this.noTopo) {
      const alvoOlho = new THREE.Vector3(this.camT.x, this.camT.y + 0.8, this.camT.z);
      const dir = new THREE.Vector3(Math.sin(this.camAz) * cp, sp, Math.cos(this.camAz) * cp).normalize();
      this.rayCam.set(alvoOlho, dir); this.rayCam.far = dist;
      const h = this.rayCam.intersectObjects(marco.alvos, true)[0];
      if (h) dist = Math.max(2.2, h.distance - 0.6);
    }
    // na universidade: muralhas, paredes, torres e telhados entre a câmera e o personagem → a câmera se aproxima
    if (this.univ && this.plat?.id === "univ" && naUniversidade(this.eu.pos)) {
      const alvoOlho = new THREE.Vector3(this.camT.x, this.camT.y + 0.8, this.camT.z);
      const dir = new THREE.Vector3(Math.sin(this.camAz) * cp, sp, Math.cos(this.camAz) * cp).normalize();
      this.rayCam.set(alvoOlho, dir); this.rayCam.far = dist;
      const h = this.rayCam.intersectObjects(this.univ.alvosCamera, false)[0];
      if (h) dist = Math.max(2.2, h.distance - 0.6);
    }
    // órbita livre: por cima olha pro personagem; arrastando pra baixo encosta no chão e o olhar sobe pro céu
    const c = poseDaCamera({ olho: { x: this.camT.x, y: this.camT.y + 0.8, z: this.camT.z }, az: this.camAz, pitch: this.camPitch, dist, chaoY: this.eu.alt });
    this.cam.position.set(c.pos.x, c.pos.y, c.pos.z);
    this.cam.lookAt(c.olhar.x, c.olhar.y, c.olhar.z);
  }

  /** as entradas de voo (WASD/joystick/direcional relativo à câmera; Espaço/E/SUBIR; Shift/Q/DESCER; Pousar) → comando */
  private comandoDeVoo() {
    let ix = 0, iz = 0;
    if (this.keys.w || this.keys.arrowup) iz -= 1; if (this.keys.s || this.keys.arrowdown) iz += 1;
    if (this.keys.a || this.keys.arrowleft) ix -= 1; if (this.keys.d || this.keys.arrowright) ix += 1;
    if (this.joy.on) { ix += this.joy.x; iz += this.joy.y; }
    ix += this.botDir.x; iz += this.botDir.z;
    const subir = this.voY.subir, descer = this.voY.descer || !!this.keys.shift;
    this.cmdVoo.subir = subir; this.cmdVoo.descer = descer;
    if (ix || iz || subir || descer) this.autoPouso = false;
    const dir = moverRelativoCamera(ix, iz, this.camAz);
    return { wx: dir?.wx ?? 0, wz: dir?.wz ?? 0, subir, descer: descer || this.autoPouso };
  }

  // ───────────── loop ─────────────
  private loop(now: number) {
    if (!this.vivo) return;
    this.raf = requestAnimationFrame((t) => this.loop(t));
    if (this.pausado || pularQuadro(this.fpsMax, now, this.ultimoQuadro)) return;   // o relógio segue: o dt do próximo quadro cobre o pulo
    this.ultimoQuadro = now;
    const dtReal = Math.min(VOO.dtMax, this.clock.getDelta()), dt = Math.min(0.05, dtReal), t = now * 0.001;   // o voo usa o dt REAL (independente de FPS)
    if (!this.visivel || document.hidden) return;
    const eu = this.eu, euId = this.o.eu.id;

    // MENU: segurar ESPAÇO p/ viajar; personagem fica sentado contemplando
    if (this.menu) {
      if (this.espaco) { this.holdT += dt; if (this.o.els.hold) this.o.els.hold.style.width = Math.min(100, (this.holdT / 1.2) * 100) + "%"; if (this.holdT >= 1.2) this.iniciar("viajar"); }
      else if (this.holdT > 0) { this.holdT = Math.max(0, this.holdT - dt * 2); if (this.o.els.hold) this.o.els.hold.style.width = (this.holdT / 1.2) * 100 + "%"; }
      const s = this.assento(); eu.pos.set(s.x, 0, s.z); eu.facing = this.rotAssento(); this.sitT = 1; eu.moving = false;
    } else if (this.moto !== null) {
      // MOTO: o mesmo voo da nave (mesmas entradas), teto baixo, sem atalhos de rota
      const c = this.comandoDeVoo();
      const r = passoVooSub(this.motoEst, c, dtReal, this.solidosDeVoo(), MOTO.teto);
      this.motoEst = r.s; this.motoPousado = r.pousado; if (r.pousado) this.autoPouso = false;
      eu.pos.set(r.s.x, 0, r.s.z); eu.facing = r.s.yaw; eu.moving = Math.hypot(r.s.vx, r.s.vz) > 1; this.sitT = 0;   // "andando" = a moto em movimento (o netcode extrapola)
    } else if (this.pilotando) {
      // VOO: WASD/joystick/direcional relativo à câmera; Espaço/E/SUBIR sobe; Shift/Q/DESCER desce; pousa ao encostar
      let ix = 0, iz = 0;
      if (this.keys.w || this.keys.arrowup) iz -= 1; if (this.keys.s || this.keys.arrowdown) iz += 1;
      if (this.keys.a || this.keys.arrowleft) ix -= 1; if (this.keys.d || this.keys.arrowright) ix += 1;
      if (this.joy.on) { ix += this.joy.x; iz += this.joy.y; }
      ix += this.botDir.x; iz += this.botDir.z;
      const subir = this.voY.subir, descerManual = this.voY.descer || !!this.keys.shift;
      this.cmdVoo.subir = subir; this.cmdVoo.descer = descerManual;
      if (ix || iz || subir || descerManual) { this.autoPouso = false; this.pararRota(); }
      const dir = moverRelativoCamera(ix, iz, this.camAz);
      let cmd = { wx: dir?.wx ?? 0, wz: dir?.wz ?? 0, subir, descer: descerManual || this.autoPouso };
      if (this.rota) {   // atalho: o piloto automático aperta os mesmos botões (direção em mundo)
        const f = seguirRota(this.naveEst, this.rota.pontos, this.pousado);
        this.rota.pontos = f.rota; cmd = f.cmd;
        if (f.chegou) { if (this.rota.destino === "zaeon") this.naveEst = { ...poseDaDoca(), vx: 0, vy: 0, vz: 0 }; this.pararRota(); }   // na Zaeon, encaixa na doca (a porta na borda da ilha)
      }
      const r = passoVooSub(this.naveEst, cmd, dtReal, this.solidosDeVoo());
      this.naveEst = r.s; this.pousado = r.pousado; if (r.pousado) this.autoPouso = false;
      eu.pos.set(r.s.x, 0, r.s.z); eu.facing = r.s.yaw; eu.moving = false; this.sitT = 0;
    } else {
      let ix = 0, iz = 0;
      if (this.keys.w || this.keys.arrowup) iz -= 1; if (this.keys.s || this.keys.arrowdown) iz += 1;
      if (this.keys.a || this.keys.arrowleft) ix -= 1; if (this.keys.d || this.keys.arrowright) ix += 1;
      if (this.joy.on) { ix += this.joy.x; iz += this.joy.y; }
      const correndo = this.keys.shift || this.correr, spd = correndo ? 7.5 : 4;
      let andando = false;
      if (this.bordo) { const pn = this.poseNave(); if (pn) { const w = paraMundo(pn, this.bordo); eu.pos.x = w.x; eu.pos.z = w.z; } }   // a nave pode ter andado (o dono pilotando)
      const prev = { x: eu.pos.x, z: eu.pos.z };
      const dir = moverRelativoCamera(ix, iz, this.camAz);
      const vel = this.noTopo ? 2 : spd;   // no topo: passos curtos na plataforma
      if (this.jet.noAr) {
        // NO AR: o IMPULSO da mochila move — W (frente) a toda, lados/trás mais devagar; soltou, segue no embalo
        const frente = iz < -0.3 && Math.abs(ix) <= Math.abs(iz) + 1e-6;
        this.impulsoFrente = !!dir && frente;
        this.jetV = passoHorizontalJet(this.jetV, dir ? { x: dir.wx * (frente ? JET.velFrente : JET.velLado), z: dir.wz * (frente ? JET.velFrente : JET.velLado) } : null, dt);
        eu.pos.x += this.jetV.x * dt; eu.pos.z += this.jetV.z * dt;
        const sp = Math.hypot(this.jetV.x, this.jetV.z);
        if (sp > 0.6) { eu.facing = Math.atan2(this.jetV.x, this.jetV.z); andando = true; }
        if (dir) { this.alvo = null; this.alvoDepois = null; this.falandoCom = null; }
      }
      else if (dir) { this.jetV = { x: 0, z: 0 }; this.impulsoFrente = false; this.motoAlvo = null; eu.pos.x += dir.wx * dt * vel; eu.pos.z += dir.wz * dt * vel; this.alvo = null; this.alvoDepois = null; andando = true; eu.facing = Math.atan2(dir.wx, dir.wz); this.falandoCom = null; }
      else if (this.alvo) {
        const dx = this.alvo.x - eu.pos.x, dz = this.alvo.y - eu.pos.z, d = Math.hypot(dx, dz);
        if (d > 0.12) { eu.pos.x += (dx / d) * dt * 4; eu.pos.z += (dz / d) * dt * 4; andando = true; eu.facing = Math.atan2(dx, dz); } else { this.alvo = this.alvoDepois; this.alvoDepois = null; }
      }
      // sentar ao parar perto da PRÓPRIA base
      const querSentar = this.distBase(euId, eu.pos) < BASE_INTERACT_R && !andando && !this.alvo && !this.jet.noAr && !this.sobreNave;
      this.sitT += ((querSentar ? 1 : 0) - this.sitT) * Math.min(1, dt * 3);
      // passos (alternando 3 arquivos) só andando no chão/piso
      // no compasso do PÉ (pisada da animação); sem modelo, a cadência fixa de reserva
      const pisadas = eu.av.passosNovos();
      if (andando && !this.jet.noAr) {
        if (pisadas !== null) for (let k = 0; k < pisadas; k++) this.tocarPasso(eu);
        else { this.passoT += dt; if (this.passoT >= cadenciaPasso(!!correndo)) { this.passoT = 0; this.tocarPasso(eu); } }
      } else this.passoT = cadenciaPasso(!!correndo) * 0.6;
      if (this.jet.noAr) this.passoNoAr(eu, prev, dt);   // mochila a jato: colisão por altura + pouso
      if (this.saindoPelaRedoma && (!this.jet.noAr || this.jet.y > this.topoNave() + 1)) this.saindoPelaRedoma = false;
      else if (this.sobreNave) {
        // em pé no dorso: passou da borda → cai (gravidade da mochila, sem empuxo) até o chão/piso embaixo
        const d = Math.hypot(eu.pos.x - this.naveEst.x, eu.pos.z - this.naveEst.z);
        if (d > CyberEngine.TOPO_NAVE_R || d < RAIO_REDOMA) { this.sobreNave = false; this.jet = { tecla: false, noAr: true, y: this.topoNave(), vy: 0 }; }   // pela borda: cai fora; pelo vão da redoma (aberta): cai na cabine
      }
      else if (this.bordo) {   // A BORDO: anda no convés (paredes, móveis, reator) no referencial da nave
        const pn = this.poseNave();
        if (!pn) this.bordo = null;
        else {
          const quer = paraLocal(pn, eu.pos), q = andarNaNave(quer, this.bordo); this.bordo = q; const w = paraMundo(pn, q); eu.pos.x = w.x; eu.pos.z = w.z;   // inclusive a escada (sobe/desce de nível) e a rampa
          const ra = rampaDaNave(pn);
          if (naPontaDaRampa(q) && ra.desce && quer.z < q.z - 0.01) {   // andando pra fora no fim da rampa: desce na ILHA (doca) ou no CHÃO (pousada)
            const f = paraMundo(pn, { x: q.x, z: NAVE_QG.saida.z - 1 }); this.bordo = null; eu.pos.x = f.x; eu.pos.z = f.z;
            if (ra.desce === "ilha") { this.altoEm = "ceu"; this.yNav = CIDADE.pisoY; this.portalArmado = false; } else { this.altoEm = null; this.yNav = 0; }
          }
        }
      }
      else if (this.sitT > 0.05) { const s = this.assento(); eu.pos.x += (s.x - eu.pos.x) * Math.min(1, dt * 3); eu.pos.z += (s.z - eu.pos.z) * Math.min(1, dt * 3); eu.facing = this.rotAssento(); }
      else if (this.noTopo) { const e = this.eixoTopo()!, lim = 2.0 * this.escalaZaeon(); const dx = eu.pos.x - e.x, dz = eu.pos.z - e.z, d = Math.hypot(dx, dz); if (d > lim) { eu.pos.x = e.x + (dx / d) * lim; eu.pos.z = e.z + (dz / d) * lim; } }   // não cai da plataforma
      else if (this.noCeu) {
        // sem parede invisível na borda: passou do piso da ilha → cai
        const q = empurrarParaFora(resolverCidadeLivre(eu.pos), [...this.colisoresDoNivel("ceu"), ...this.colisoresDeNaves(CIDADE.pisoY), ...this.colisoresDeMotos(true)]); eu.pos.x = q.x; eu.pos.z = q.z; this.yNav = CIDADE.pisoY;
        if (!naIlhaPrincipal(q)) this.cairDaqui({ x: (q.x - prev.x) / Math.max(dt, 1e-3), z: (q.z - prev.z) / Math.max(dt, 1e-3) });
      }
      else if (this.plat) {   // num LUGAR FLUTUANTE: anda com as colisões do andar; passou da borda do disco → cai
        const r = andarNaPlataforma(this.plat.id, this.plat.andar, eu.pos); eu.pos.x = r.x; eu.pos.z = r.z;
        if (r.fora) this.cairDaqui({ x: (eu.pos.x - prev.x) / Math.max(dt, 1e-3), z: (eu.pos.z - prev.z) / Math.max(dt, 1e-3) });
      }
      else if (this.ilhota !== null) {   // em pé numa ilhota: anda livre no topo; passou da borda dela → cai
        if (ilhotaEm(eu.pos, 0.2) !== this.ilhota) this.cairDaqui({ x: (eu.pos.x - prev.x) / Math.max(dt, 1e-3), z: (eu.pos.z - prev.z) / Math.max(dt, 1e-3) });
      }
      else this.resolverChao(eu, prev);
      if (!this.bordo && !this.jet.noAr && !this.sobreNave && !this.noTopo && this.plat === null && this.ilhota === null && (this.noCeu || !this.altoEm)) {   // a pé na ilha (doca) ou no chão (pousada): pisou no fim da rampa → a bordo
        const pn = this.poseNave(), ra = pn ? rampaDaNave(pn) : null;
        if (pn && ra && ra.desce === (this.noCeu ? "ilha" : "chao")) {
          const l = paraLocal(pn, eu.pos), la = paraLocal(pn, prev);   // só quem anda PRA nave (quem acabou de descer não volta)
          if (Math.abs(l.x) < RAMPA.meia && Math.abs(l.z - RAMPA.z0) < 1.6 && l.z > la.z + 1e-4) { this.bordo = { x: Math.max(-0.9, Math.min(0.9, l.x)), z: RAMPA.z0 + 0.5, nivel: 0 }; this.altoEm = null; this.yNav = 0; }
        }
      }
      eu.moving = andando;
      if (this.motoAlvo !== null && !this.alvo) { const k = this.motoAlvo; this.motoAlvo = null; this.montar(k); }   // chegou na moto clicada
    }
    eu.sit = this.sitT;
    const lmAlto = this.altoEm ? this.lms.find((l) => l.poi.id === this.altoEm) : undefined;
    const pnAlt = this.bordo ? this.poseNave() : null;
    eu.alt = pnAlt && this.bordo ? alturaDoConves(pnAlt) + alturaNoBordo(this.bordo, rampaDaNave(pnAlt).queda)
      : this.moto !== null ? this.motoEst.y
      : this.pilotando ? this.naveEst.y
      : this.jet.noAr ? this.jet.y
      : this.sobreNave ? this.topoNave()
      : this.plat ? PLATAFORMAS[this.plat.id].y + alturaDoAndar(this.plat.id, this.plat.andar)
      : this.ilhota !== null && this.cidade ? this.cidade.alturaIlhota(this.ilhota)
      : this.noCeu ? (this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY)
      : this.noTopo ? this.alturaTopo() : this.yNav + (lmAlto && marcoNav(lmAlto.poi) && this.yNav >= marcoNav(lmAlto.poi)!.nav.pisoY - 1e-6 ? this.boia(lmAlto) : 0);

    // portais: anel no chão embaixo do buraco negro (entrada) e o da cidade (volta)
    if (this.cidade && !this.pilotando && this.moto === null && !this.menu) {
      if (this.noCeu) { if (noPortalVolta(eu.pos)) this.voltarDaCidade(); }
      else if (!this.altoEm && !this.noTopo && !this.jet.noAr && !this.sobreNave) {
        const dentro = noPortalEntrada(eu.pos);
        if (dentro && this.portalArmado) { this.portalArmado = false; this.o.onPortalCeu?.(); }
        if (!dentro) this.portalArmado = true;
      }
    }

    // ELEVADOR DE LUZ dos lugares flutuantes: anel no chão → sobe; anel no disco → desce (a pé, fora de veículo)
    if (this.univ && !this.menu && !this.pilotando && this.moto === null && !this.jet.noAr && !this.sobreNave) {
      const subir = !this.plat && !this.altoEm && !this.noTopo ? anelDoChao(eu.pos) : null, descer = this.plat && this.plat.andar === 0 && noAnelDoDisco(this.plat.id, eu.pos);
      if ((subir || descer) && this.aneisArmados) {
        const P = PLATAFORMAS[subir ?? this.plat!.id], alvo = subir ? P.chegada : P.volta;
        this.aneisArmados = false; this.alvo = null; this.alvoDepois = null; this.sitT = 0; this.jetV = { x: 0, z: 0 };
        this.plat = subir ? { id: P.id, andar: 0 } : null;
        eu.pos.set(alvo.x, 0, alvo.z); eu.facing = alvo.rumo; this.camT.set(alvo.x, (subir ? P.y : 0) + 1.2, alvo.z);
        this.som.tocar("rise", new THREE.Vector3(alvo.x, (subir ? P.y : 0) + 1, alvo.z), { dist: DISTANCIA.perto });
      } else if (!subir && !descer) this.aneisArmados = true;
    }

    // estar perto da própria base = estado de estudo (luz/cristais/botão)
    const perto = this.distBase(euId, eu.pos) < BASE_INTERACT_R;
    if (perto !== this.perto) { this.perto = perto; this.o.onPerto?.(perto); if (perto) this.som.tocar("near-ping", eu.av.group.position, { dist: DISTANCIA.perto }); }

    // rede: eu → difusão; remotos → atores
    if (!this.menu) this.o.enviarPos?.({ x: eu.pos.x, z: eu.pos.z, facing: eu.facing, moving: eu.moving, sit: this.sitT > 0.5, topo: this.noTopo, ceu: this.noCeu, ...(this.jet.noAr ? { jet: Math.round(this.jet.y * 100) / 100 } : {}), ...(this.sobreNave || this.ilhota !== null || this.plat || this.bordo ? { alt: Math.round(eu.alt * 100) / 100 } : {}), ...(this.moto !== null ? { moto: { s: this.moto, y: Math.round(this.motoEst.y * 100) / 100, yaw: this.motoEst.yaw } } : {}), ...(this.pilotando ? { voo: { y: this.naveEst.y, yaw: this.naveEst.yaw } } : this.naveForaDoHangar() ? { naveParada: { x: this.naveEst.x, y: this.naveEst.y, z: this.naveEst.z, yaw: this.naveEst.yaw } } : {}) });
    this.sincronizarRemotos(dt, t);

    // motos (antes dos avatares: quem está montado encaixa no banco/guidão/pedaleiras da moto já posicionada)
    const ocupadas = this.atualizarMotos(dt, t);
    // avatares
    eu.av.group.position.set(eu.pos.x, eu.alt, eu.pos.z); eu.av.olharPara(eu.facing);
    // fora (vista da landing / menu): MEDITANDO em frente ao computador; na base: digitando; no ar: jatos acesos
    eu.av.animar({ andando: eu.moving && !this.jet.noAr && this.moto === null, correndo: !!(this.keys.shift || this.correr) && eu.moving && this.moto === null, sentado: this.menu || this.pilotando ? 0 : this.sitT, meditando: this.menu && !this.pilotando ? 1 : 0, pilotando: this.pilotando ? 1 : 0, jato: this.jet.noAr ? (this.jet.tecla ? 1 : this.impulsoFrente ? 0.9 : 0.35) : 0, ar: this.jet.noAr ? { vy: this.jet.vy, movendo: eu.moving } : null, montado: this.moto !== null ? this.naMoto(eu.av, this.moto) : null, dt, t });
    for (const a of this.remotos.values()) {
      const pilota = !!a.nave && !a.naveP, monta = a.moto && ocupadas.get(a.moto.s) === a ? a.moto.s : null;
      a.av.group.position.set(a.pos.x, a.alt, a.pos.z); a.av.olharPara(pilota ? a.naveYaw ?? a.facing : a.facing); a.av.animar({ montado: monta !== null ? this.naMoto(a.av, monta) : null, andando: a.moving && a.jet === undefined && !pilota && monta === null, sentado: pilota || monta !== null ? 0 : a.sit, pilotando: pilota ? 1 : 0, jato: a.jet !== undefined ? (a.vyJet ?? 0) > -3 ? 0.9 : 0.3 : 0, ar: a.jet !== undefined ? { vy: a.vyJet ?? 0, movendo: a.moving } : null, dt, t });
      if (a.nave && a.naveP) { a.nave.group.position.set(a.naveP.x, a.naveP.y, a.naveP.z); a.nave.group.rotation.y = a.naveP.yaw; a.nave.atualizar({ dt, t, voando: false, vel: 0, curva: 0 }); }
      else if (a.nave) { a.nave.group.position.set(a.pos.x, a.alt, a.pos.z); a.nave.group.rotation.y = a.naveYaw ?? 0; a.nave.atualizar({ dt, t, voando: a.alt > 0.5, vel: a.moving ? 1 : 0, curva: 0, fechada: true }); this.noAssento(a.av, a.nave); }
    }

    // cidade + a minha nave (parada onde pousou, ou comigo dentro)
    if (this.cidade) this.cidade.atualizar(dt, t);
    if (this.somLounge) { this.somLounge.atualizar(dt); this.cidade?.somTocando(this.somLounge.tocando); }
    if (this.holo) {   // o holograma acompanha a base do QG (que flutua junto com o marco)
      const lay = baseNoQG(), w = lay ? localParaMundo(lay, HOLO_NA_BASE.x, HOLO_NA_BASE.z) : null;
      if (lay && w) { this.holo.group.position.set(w.x, this.yDoNivel("qg"), w.z); this.holo.group.rotation.y = lay.rot + HOLO_NA_BASE.giro; }
      this.holo.atualizar(dt, t);
    }
    this.univ?.atualizar(dt, t); this.solana?.atualizar(dt, t);
    if (this.nave) {
      const n = this.naveEst, curva = (n.yaw - this.yawAnt) / Math.max(dt, 1e-3); this.yawAnt = n.yaw;
      this.nave.group.position.set(n.x, n.y, n.z); this.nave.group.rotation.y = n.yaw;   // estacionária: fica exatamente onde parou
      this.nave.group.visible = this.pilotando || !this.naveDoDonoFora();
      this.nave.atualizar({ dt, t, voando: this.pilotando && !this.pousado, vel: Math.hypot(n.vx, n.vz) / VOO.vel, curva, fechada: this.pilotando });
      if (this.pilotando) this.noAssento(eu.av, this.nave);   // o piloto aparece na cadeira, na cabine do centro
    }
    // a redoma da cabine abre (e o dorso fica translúcido na MINHA tela) enquanto eu estou a bordo
    { const pn = this.bordo ? this.poseNave() : null, abre = redomaAberta(this.bordo, this.pilotando);
      const chama = this.redomaChamando() ? this.poseNave() : null;   // voltando de mochila: abre pra eu entrar
      for (const h of [this.nave, ...[...this.remotos.values()].map((a) => a.nave)]) { if (!h) continue; const minha = !!pn && pn.h === h; h.aBordo(minha); h.abrirCabine((minha && abre) || (!!chama && chama.h === h)); }
      const pv = this.poseNave(); if (pv) { const ra = rampaDaNave(pv); pv.h.rampa(ra.queda, ra.desce === null); } }   // a rampa acompanha onde a nave está
    this.atualizarHudVoo(now);
    this.atualizarSom(dt);
    const navePerto = !this.pilotando && !!this.nave && this.navePerto();
    const naMoto = this.moto !== null, motoPertoAgora = this.motoAoAlcance() >= 0, pousado = naMoto ? this.motoPousado : this.pousado;
    const est = `${this.noCeu}|${navePerto}|${this.pilotando}|${pousado}|${naMoto}|${motoPertoAgora}`;
    const ac = this.acaoPerto(), ch = ac ? `${ac.id}|${ac.rotulo}` : "";
    if (ch !== this.acaoChave) { this.acaoChave = ch; this.o.onAcao?.(ac ? { rotulo: ac.rotulo } : null); }
    if (est !== this.estadoQG) { this.estadoQG = est; this.o.onEstadoQG?.({ noCeu: this.noCeu, navePerto, pilotando: this.pilotando, pousado, moto: naMoto, motoPerto: motoPertoAgora }); }

    // marcos: animação + a "estátua" do dono some quando o dono real está lá em cima
    const donoNoTopo = this.noTopo || [...this.remotos.values()].some((a) => a.topo);
    for (const lm of this.lms) { lm.atualizar(dt, t); if (lm.topo) lm.donoPresente(donoNoTopo); }

    // bases
    for (const [id, b] of this.bases) {
      const alguemPerto = id === euId ? perto : [...this.remotos.values()].some((a) => a.id === id && this.distBase(id, a.pos) < BASE_INTERACT_R);
      if (b.layout.nivel) b.group.position.y = this.yDoNivel(b.layout.nivel);
      // energia = o dono SENTADO na cabine (fluxo mãos → tela)
      const energia = id === euId ? this.sitT : (this.remotos.get(id)?.sit ?? 0);
      b.atualizar({ dt, t, ativa: alguemPerto, hover: this.hoverBase === id, perto: id === euId && perto, energia });
    }
    if (this.baseQG) { this.baseQG.group.position.y = this.yDoNivel("qg"); this.baseQG.atualizar({ dt, t, ativa: false, hover: false, perto: false }); }

    this.atualizarCamera();
    this.cena.atualizar({ dt, t, cam: this.cam, aspect: this.cam.aspect });
    this.atualizarHud(now);
    this.R.clear(); this.R.render(this.cena.bgScene, this.cena.bgCam); this.R.clearDepth(); this.R.render(this.cena.scene, this.cam);
    if (!this.prontoDisparado) { this.prontoDisparado = true; this.o.onPronto?.(); }
  }

  private sincronizarRemotos(dt: number, t: number) {
    const src = this.o.remotos?.current;
    if (src) {
      for (const [id, p] of src) {
        if (id === this.o.eu.id) continue;
        let a = this.remotos.get(id);
        if (!a) {
          a = this.novoAtor({ id, name: p.name, color: p.color }, p.x, p.z);
          a.facing = p.facing; this.remotos.set(id, a);
          if (this.tVivo > 3) this.som.tocar("join", a.pos);   // quem já estava quando entrei não "chega"
          if (!this.pessoas.has(id)) this.setPessoas([...this.ordem.map((i) => this.pessoas.get(i)!), { id, name: p.name, color: p.color }]);
        }
        if (this.o.remotosSuaves) {
          const andou = Math.hypot(p.x - a.pos.x, p.z - a.pos.z) > 0.004;
          a.pos.x = p.x; a.pos.z = p.z; a.facing = p.facing; a.moving = andou || p.moving === true;
        } else {
          const r = interpolar({ x: a.pos.x, z: a.pos.z, facing: a.facing }, { x: p.x, z: p.z, facing: p.facing }, dt);
          a.pos.x = r.x; a.pos.z = r.z; a.facing = r.facing; a.moving = r.moving || p.moving === true;
        }
        a.falando = p.falando === true;   // voz (push-to-talk): 🎙 no rótulo
        const pendente = this.vozPendente.get(id); if (pendente) { this.vozPendente.delete(id); this.vozDe(id, pendente); }
        a.sit += ((p.sit ? 1 : 0) - a.sit) * Math.min(1, dt * 3);
        // "no topo" só vale pra quem o SERVIDOR marcou como fundador (client event forjado não sobe ninguém)
        // regalias (topo/nave) só pra quem o SERVIDOR marcou como fundador — a Zaeon (céu) é aberta
        const fund = !!this.pessoas.get(id)?.fundador;
        a.topo = p.topo === true && this.ehFundador(id);
        a.ceu = p.ceu === true;   // a Zaeon é aberta a todos (o topo e a nave continuam do dono)
        const voando = fund && !!p.voo, parada = fund && !voando && p.naveParada ? p.naveParada : null;
        if ((voando || parada) && !a.nave && this.cidade) {
          a.nave = criarNave({ low: this.o.low, cor: a.color }); this.cena.scene.add(a.nave.group);
          a.somNave = { idle: this.som.loop("ship-idle", a.nave.group, { dist: DISTANCIA.grande }), voo: this.som.loop("ship-flight", a.nave.group, { dist: DISTANCIA.grande }), g: gatilhoVooInicial(), voava: voando, ev: somNaveInicial(!voando), yAnt: null, vy: 0 };   // já chega voando: sem decolagem fantasma
        }
        if (!voando && !parada && a.nave) { this.soltarSomNave(a); a.nave.dispose(); a.nave = null; }
        if (a.nave && a.somNave) {
          // a nave do OUTRO é posicional cheia: decolagem/pouso/voo vêm do lado certo e somem com a distância
          const sn = a.somNave, y = voando ? p.voo!.y : null;
          if (y !== null && sn.yAnt !== null && dt > 0) sn.vy += ((y - sn.yAnt) / dt - sn.vy) * Math.min(1, dt * 4); else sn.vy = 0;
          sn.yAnt = y;
          const ev = eventosNave(sn.ev, { pousado: !voando, vy: sn.vy, altura: y === null ? 0 : y - chaoDoVoo({ x: p.x, y, z: p.z }) }, dt); sn.ev = ev.e;
          const em = a.nave.group.position, d = { dist: DISTANCIA.grande };
          if (ev.pousou) this.som.tocar("ship-touchdown", em, d);
          // o colega começou a subir/descer (pela velocidade vertical, com histerese): o som sai 1×, preso à nave dele
          const g = gatilhosVoo(sn.g, { subindo: voando && sn.vy > (sn.g.subindo ? 3 : 6), descendo: voando && sn.vy < (sn.g.descendo ? -3 : -6) }, dt); sn.g = g.e;
          if (g.sobe) this.som.tocar("ship-takeoff", null, { dist: DISTANCIA.grande, seguir: a.nave.group });
          if (g.desce) this.som.tocar("ship-landing", null, { dist: DISTANCIA.grande, seguir: a.nave.group });
          sn.voava = voando; this.som.volumeLoop(a.somNave.voo, voando ? 1 : 0); this.som.volumeLoop(a.somNave.idle, voando ? 0 : 1);
        }
        a.naveP = parada;
        a.moto = !voando && p.moto ? p.moto : null;   // moto: qualquer pessoa (sem regalia)
        const jetAnt = a.jet; a.jet = !voando && !a.moto && typeof p.jet === "number" ? p.jet : undefined;
        if (a.jet !== undefined && jetAnt !== undefined && dt > 0) a.vyJet = (a.vyJet ?? 0) + (((a.jet - jetAnt) / dt) - (a.vyJet ?? 0)) * Math.min(1, dt * 4); else a.vyJet = 0;
        const altAlvo = voando ? p.voo!.y : a.moto ? a.moto.y : a.jet !== undefined ? a.jet : typeof p.alt === "number" ? p.alt : a.topo ? this.alturaTopo() : a.ceu ? CIDADE.pisoY : this.alturaChao(a.pos);
        a.alt += (altAlvo - a.alt) * (Math.abs(altAlvo - a.alt) > 40 ? 1 : Math.min(1, dt * 6));   // portal = corte seco
        if (voando) a.naveYaw = p.voo!.yaw;
        void t;
      }
      // saiu da sala: o personagem some; a BASE fica (bases vivem em this.bases)
      for (const [id, a] of this.remotos) if (!src.has(id)) { this.som.tocar("leave", a.av.group.position); this.removerAtor(a); this.remotos.delete(id); if (this.falandoCom === a) { this.falandoCom = null; this.o.onFalarCom?.(null); } }
    }
  }

  /** HUD de voo: marcador de pouso sob a nave, anel na borda da ilha e o altímetro pro React (sem marcadores na tela) */
  private atualizarHudVoo(now: number) {
    const h = this.hudVoo; if (!h) return;
    const naMoto = this.moto !== null, voando = (this.pilotando || naMoto) && !this.menu, n = naMoto ? this.motoEst : this.naveEst, boiaCidade = this.cidade ? this.cidade.ilha.position.y - CIDADE.pisoY : 0;
    const solidos = voando ? this.solidosDeVoo() : [];
    h.marca.visible = voando && !(naMoto ? this.motoPousado : this.pousado);
    if (h.marca.visible) { const c = chaoDoVoo(n, solidos); h.marca.position.set(n.x, c + (c === CIDADE.pisoY ? boiaCidade : 0) + 0.1, n.z); }
    h.borda.visible = voando && !naMoto && Math.hypot(n.x - CIDADE.centro.x, n.z - CIDADE.centro.z) < 220;
    if (h.borda.visible) h.borda.position.y = CIDADE.pisoY + boiaCidade + 0.4;
    // altímetro (React), só quando muda e no máx. 10×/s
    if (!voando || now - h.t < 100) return;
    const chave = String(Math.round(n.y));
    if (chave !== h.chave) { h.chave = chave; h.t = now; this.o.onVoo?.({ y: Math.max(0, Math.round(n.y)) }); }
  }

  private atualizarHud(now: number) {
    const { eu } = this;
    if (this.dicaMira) this.dicaMira.style.display = this.menu ? "none" : "block";
    const atores = [eu, ...this.remotos.values()];
    for (const a of atores) {
      if (a === eu) { a.tag.style.display = "none"; continue; }   // o próprio avatar não leva nome
      const s = this.proj(new THREE.Vector3(a.pos.x, 2.1 + a.sit * -0.3 + a.alt, a.pos.z));
      a.tag.style.left = s.x + "px"; a.tag.style.top = s.y + "px"; a.tag.style.display = this.menu || !s.vis ? "none" : "block";
      { const perto = eu.pos.distanceTo(a.pos) < 3.0; a.tag.style.borderColor = a.falando ? "#9affd0" : perto ? "#fff" : ""; a.tag.textContent = (a.falando ? "🎙 " : perto ? "💬 " : "") + a.name; }
    }
    for (let i = this.falas.length - 1; i >= 0; i--) {
      const f = this.falas[i]!; if (now > f.ate) { f.el.remove(); this.falas.splice(i, 1); continue; }
      const p = this.proj(new THREE.Vector3(f.ator.pos.x, 2.4 + f.ator.alt, f.ator.pos.z)); f.el.style.left = p.x + "px"; f.el.style.top = p.y + "px"; f.el.style.display = p.vis ? "block" : "none";
    }
    // menu projetado no monitor (retrato: fixo, sempre tocável)
    const m = this.o.els.menu;
    if (m && this.menu) {
      if (this.cam.aspect < 0.8) { m.style.display = "flex"; m.style.left = "50%"; m.style.top = "68%"; }
      else { const l = this.minhaBase; if (l) { const mw = localParaMundo(l, 0, TELA_BASE.z); const p = this.proj(new THREE.Vector3(mw.x, TELA_BASE.y + this.yDoNivel(l.nivel), mw.z)); m.style.display = p.vis ? "flex" : "none"; if (p.vis) { m.style.left = p.x + "px"; m.style.top = p.y + "px"; } } }
    }
    // rótulo do monitor em hover
    const lab = this.o.els.monLabel;
    if (lab) {
      if (this.hoverBase && !this.menu) {
        const z = this.zaeon();
        const l = this.layouts.get(this.hoverBase)!, mw = localParaMundo(l, 0, TELA_BASE.z), mon = new THREE.Vector3(mw.x, TELA_BASE.y + TELA_BASE.h / 2 + 0.25 + this.yDoNivel(l.nivel), mw.z);
        const p = this.proj(mon);
        const meu = this.hoverBase === this.o.eu.id;
        lab.textContent = rotuloMonitor({ baseMinha: meu, pertoDaBase: this.perto, dono: this.pessoas.get(this.hoverBase)?.name ?? "alguém" });
        lab.dataset.longe = String(!(meu && this.perto));
        lab.style.left = Math.min(this.w - 110, Math.max(110, p.x)) + "px"; lab.style.top = p.y + "px"; lab.style.display = p.vis ? "block" : "none";
      } else lab.style.display = "none";
    }
  }

  dispose() {
    if (!this.vivo) return;   // idempotente (desmonta ao ir estudar e de novo no cleanup do React)
    this.vivo = false; cancelAnimationFrame(this.raf); this.ro.disconnect(); this.io?.disconnect();
    this.cleanups.forEach((f) => f());
    for (const a of [this.eu, ...this.remotos.values()]) if (a) this.removerAtor(a);
    for (const b of this.bases.values()) b.dispose(); this.baseQG?.dispose();
    for (const lm of this.lms) lm.dispose();
    this.somLounge?.dispose(); this.som.dispose();
    this.cidade?.dispose(); this.holo?.dispose(); this.univ?.dispose(); this.solana?.dispose(); this.nave?.dispose(); for (const m of this.motos) m.h.dispose();
    if (this.hudVoo) for (const m of [this.hudVoo.marca, this.hudVoo.borda]) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
    this.cena.dispose(); this.R.dispose(); this.R.forceContextLoss(); this.R.domElement.remove();
  }
}
