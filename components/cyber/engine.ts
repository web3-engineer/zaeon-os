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
import { POIS, bordaDoPOI, colisoresDosPOIs, marcoNav, naPracaPOI, poiPerto, type POI } from "@/lib/cyber/landmarks";
import { alturaEm, colisoresDoAlto, deEscada, resolverPasso, type MarcoNav } from "@/lib/cyber/nav";
import { limitarPitch, poseDaCamera } from "@/lib/cyber/camera";
import { ALTURA_CORPO_ILHOTA, BURACO_NEGRO, CAMPO_DJ, CIDADE, alturaNaCidade, foraDaTorreDJ, naCabineDJ, naPistaDeDanca, naTorreDJ, pontoDaCabineDJ, rumoDaPista, rumoDoDJ, bocaDeEscada, bocaDoElevador, salaEm, ESCADAS, FIO, alturaDoFio, naEscadaLocal, type NomeSala, naEscadaDoLounge, posDaViagem, TORRE_DJ, VIAGEM_ESCADA, ALTURA_LOUNGE, PALCO as PALCO_LOUNGE, naSala, ILHOTAS, foraDaIlha, pisoDeVoo, pisoNoAr, ilhotaEm, mundo, naIlhaPrincipal, resolverCidade, resolverCidadeLivre, solidosDaCidade } from "@/lib/cyber/ceu";
import { VOO, chaoDoVoo, passoVooSub, pilaresDoMarco, type EstadoVoo, type Pilar } from "@/lib/cyber/voo";
import { JET, impactoDoPouso, passoHorizontalJet, passoVertical, resolverNoAr, somDoJato, tetoDoJet, type QGNoAr } from "@/lib/cyber/jet";
import { proximoQuadro, type Qualidade } from "@/lib/cyber/dispositivo";
import { QualidadeAdaptativa } from "@/lib/cyber/qualidadeAdaptativa";
import { DISTANCIA, PASSOS, duracaoVozDroid, cadenciaPasso, eventosNave, fatorCristais, fatorLeito, gatilhoVooInicial, gatilhosVoo, intervaloNeuronio, somNaveInicial, type Dist, type EstadoGatilhoVoo, type EstadoSomNave } from "@/lib/cyber/audio";
import { musica } from "@/lib/audio/musica";
import { criarAudioCyber, preCarregarSons, type AudioCyberHandle, type FalaHolograma, type LoopSom } from "./AudioCyber";
import { ESPERA_VOZ, criarCacheVoz, duracaoComAtraso, falasFixasZaeon, tempoDaFala, textoDaVoz, REPERGUNTA_NOME, type CacheVoz } from "@/lib/cyber/vozZaeon";
import { criarSomLounge, type SomLoungeHandle } from "./SomLounge";
import type { SomLounge } from "@/lib/lounge3d/musica";
import { rotaPara, seguirRota, type DestinoRota, type Waypoint } from "@/lib/cyber/rota";
import { criarCidade, type CidadeHandle } from "./Cidade";
import { criarHoloRecado, type HoloRecadoHandle } from "./HoloRecado";
import { HOLO_NA_BASE } from "@/lib/cyber/recado";
import type { RecadoQG } from "@/lib/lounge3d/tipos";
import { criarUniversidade, type UniversidadeHandle } from "./Universidade";
import { naUniversidade, UNIVERSIDADE } from "@/lib/cyber/universidade";
import { CAMPI, IDS_CAMPI, type IdCampus } from "@/lib/cyber/campi";
import { criarCampus, type CampusHandle } from "./Campus";
import { PLATAFORMAS, alturaDoAndar, andarDoPouso, andarNaPlataforma, decolaDaPlataforma, elevadorAqui, noArNaPlataforma, pilaresDasPlataformas, plataformaPerto, pousosNaPlataforma, tetoNaPlataforma, type IdPlataforma } from "@/lib/cyber/plataformas";
import { PRACA, QUEDA_VAZIO, naPraca } from "@/lib/cyber/praca";
import { CHEGADA_NAVE, NOS, bocaDJMundo, chegadaDJMundo, destinosDe, naBocaDJ, naBocaNave, noDoAnel, type IdNo } from "@/lib/cyber/buracos";
import { DROID } from "@/lib/cyber/agentes";
import { NASCIMENTO, RITMO_FALA, ROTEIRO, TUBOS, cumpriu, tuboDe } from "@/lib/cyber/onboarding";
import { criarDroid, type DroidHandle } from "./Droid";
import { criarHoloZaeon, type HoloZaeonHandle } from "./HoloZaeon";
import { ABERTURA, FALA_EXPULSAO, PERGUNTAS, fallbackZaeon, fechamento, limparResposta, nomeDe, perguntaDoRoteiro, faltando, reacaoFixa, situacaoDe, type FalaConversa, type PedidoZaeon, type PerfilZaeon, type PerguntaZaeon, type TurnoZaeon } from "@/lib/cyber/conversaZaeon";
import { moderar } from "@/lib/cyber/moderacao";
import { criarPraca, type PracaHandle } from "./Praca";
import { criarBercario, type BercarioHandle } from "./Bercario";
import { criarSolanaHouse, type SolanaHouseHandle } from "./SolanaHouse";
import { DECK_ANTIGO, GIRO_PLANTA, noCorredorDaRampa, NAVE_QG, RAIO_REDOMA, acaoNaNave, alturaDoConves, alturaNoBordo, andarNaNave, RAMPA, naPontaDaRampa, naRampaLaFora, paraLocal, paraMundo, pertoDaEntrada, poseDaDoca, pousoNaNave, rampaDaNave, redomaAberta, type Bordo, type PoseNave } from "@/lib/cyber/naveQG";
import { ESCALA_NAVE, ESCALA_NAVE_V, criarNave, type NaveHandle } from "./Nave";
import { criarLandmark, type LandmarkHandle } from "./Landmark";
import { atualizarCamuflagem, camuflarGrupo, pararCamuflagem } from "./camuflagem";
import { criarMoto, loteMoto, type MotoHandle } from "./Moto";
import { criarVelocidadeTela, type VelocidadeTela } from "./VelocidadeTela";
import { DASH, VOO_TURBO, iniciarDash, passoDash, podeDash, sensacaoAPe, tremorDoImpacto, velocidadeAPe, type EstadoDash } from "@/lib/cyber/movimento";
import { criarEfeitosMovimento, type EfeitosMovimentoHandle } from "./EfeitosMovimento";
import { DECOLAGEM, HEROI, pesoAlerta } from "@/lib/cyber/posesCombate";
import { ITENS, chaveInventario, equipar as equiparNoInv, inventarioInicial, itensPermitidos, sanitizarInventario, type IdItem, type Inventario } from "@/lib/cyber/inventario";
import { CAIDO, COMBO, HIT_STOP, PROTECAO_RENASCER, VIDA_MAX, acabou as golpeAcabou, acerta, codificarGolpe, cortouEntre, danoDoGolpe, decodificarGolpe, proximoGolpe, type EstadoAtaque, type Golpe } from "@/lib/cyber/combate";
import { BONECOS, PILARES_ARENA, SPARRING, naArena, pontoDeRenascer } from "@/lib/cyber/arena";
import { criarArena, type ArenaHandle } from "./Arena";
import { criarEspadaEspiritual, type EspadaHandle } from "./EspadaEspiritual";
/** a Espada Espiritual na mão: uma MONTANTE enorme (~3 m) — o peso dela define o golpe (o dono, out/2026) */
const ESCALA_ESPADA = 2.2;
import { ALTURA_LANCAMENTO, FABRICA, LOTES, MOTO, PLATAFORMA_MOTO, baseDoRobo, lookDaVaga, esvaziou, fabricaNova, largadasValidas, motoParaMontar, moverRobo, passoFabrica, progressoDaVaga, vagas, type AlvoMoto, type Fabrica, type Lote, type MotoLargada, type MotoMontada } from "@/lib/cyber/motos";
import { criarRoboMotos, type RoboMotosHandle } from "./RoboMotos";
import { criarPistas, type PistasHandle } from "./PistaCorrida";
import { pistaPorId, type Pista } from "@/lib/cyber/corrida/pistas";
import { CONTAGEM, novaCorrida, passoCorrida, tempoDeCorrida, type Corrida, type EventoCorrida, type FaseCorrida } from "@/lib/cyber/corrida/corrida";
import { PILOTAGEM, motoParada, passoMotoSub, rompeuBarreira, sensacaoDeVelocidade, supersonico, type ComandoMoto, type EstadoMoto } from "@/lib/cyber/motoFisica";
import { LOOPS_MOTO, cambioNeutro, eventosDaMoto, mixDaMoto, passoCambio, setaAcesa, somMotoParada, type Cambio, type EstadoSomMoto } from "@/lib/cyber/somMoto";
import { interpolar, moverRelativoCamera } from "@/lib/lounge3d/sala";
import type { Presenca } from "@/lib/lounge3d/tipos";
import { criarCenaCosmica, type CenaCosmicaHandle } from "./CenaCosmica";
import { atualizarRegiao, criarRegiao, soltarRegiao, type RegiaoCena } from "./regioesCena";
import { fundirEstaticos } from "./lotes";
import { esferaRapida, matrizDoAvatar, matrizesDaCena, matrizSeMudou } from "./matrizes";
import { umaPassadaNosTransparentes } from "./umaPassada";
import { criarPoolGemeos, type PoolGemeos } from "./poolGemeos";
import { criarOclusaoDePisos } from "./oclusaoPisos";
import type { Regiao } from "@/lib/cyber/regioes";
import { TELA_BASE, criarBase, type BaseEstudoHandle } from "./BaseEstudo";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { carregarModeloAvatar, criarAvatarLuz, type AvatarLuzHandle, type Montado } from "./AvatarLuz";
import { CORPO_DO_FUNDADOR, usaCorpoDoFundador } from "@/lib/cyber/estiloAvatar";
import { carregando, type Carregando, type IdEtapa } from "@/lib/cyber/carregamento";
import { gerarVeias, ouveOCoracao } from "@/lib/cyber/coracao";
import { criarFrotaIA, type FrotaHandle } from "./FrotaIA";
import { criarPisosEstudo } from "./EstacionamentosEstudo";
import { AREAS, areaDe, type AreaId } from "@/lib/cyber/frota/areas";
import { sanitizarConfig } from "@/lib/cyber/frota/config";
import { colisoresDeCorpos } from "@/lib/cyber/colisaoAtores";
import { SENTAR, TABLET, codificarDescanso, lugarEm, decodificarDescanso, lugarPerto, poseNoLugar, proximoModo, type Lugar, type ModoDescanso } from "@/lib/cyber/descanso";
import { URL_TERRA } from "./DistritoTerra";
import { carregarVrm, precarregarVrm, tingirVrm } from "./AvatarVrm";
import { criarPersonagemVivo, type PersonagemVivoHandle } from "./PersonagemVivo";
import { PERFIS_VIDA } from "@/lib/cyber/vidaPersonagem";
import { CORPOS_VRM } from "@/lib/cyber/estiloAvatar";
import { variacaoBatida, ventoDasAsas } from "@/lib/cyber/asas";
import { FALAS_DROID, HABILIDADES, habilidadeDaTecla, prontaPraUsar, sortear, type IdHabilidade } from "@/lib/cyber/habilidades";

/**
 * Vêm do SERVIDOR (GET da sala), o cliente só pinta: `fundador` = dono — a base dele fica na ZAEON (a ilha no céu).
 * Regalias são validadas na API.
 */
export type PessoaCyber = { id: string; name: string; color: string; fundador?: boolean };
/** o TÚNEL de um buraco negro: de onde se entrou e pra onde dá pra ir */
export type TunelAberto = { origem: IdNo; destinos: { id: IdNo; nome: string; desc: string }[] };
/** o TOUR da anfitriã (lib/cyber/onboarding): o passo atual — o React mostra a fala */
export type EstadoGuia = { passo: number; total: number; id: string; titulo: string; agente: string; cor: string };
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
  enviarPos?: (p: { x: number; z: number; facing: number; moving: boolean; sit: boolean; topo: boolean; ceu: boolean; desc?: number; voo?: { y: number; yaw: number }; naveParada?: { x: number; y: number; z: number; yaw: number }; jet?: number; alt?: number; moto?: MotoMontada; motoLargada?: MotoLargada; atk?: number; hp?: number; arma?: number; mov?: number }) => void;
  /** pontos de interesse (marcos megalíticos) — flag NEXT_PUBLIC_CYBER_LANDMARKS */
  landmarks?: boolean;
  /** clicou num marco estando perto → painel (nome, org, link) */
  onLandmark?: (poi: POI) => void;
  /** entrou/saiu do topo da Zaeon (o React mostra o "Descer") */
  onTopo?: (noTopo: boolean) => void;
  /** entrou num BURACO NEGRO da rede (lib/cyber/buracos): o React abre o túnel com os destinos e chama `viajarPeloTunel` */
  onTunel?: (t: TunelAberto) => void;
  /** pisou numa boca do PAR do dono (nave ↔ cabine do DJ): o React pede acesso ao servidor e chama `atravessarBuracoDono` */
  onBuracoDono?: (para: "dj" | "nave") => void;
  /** um aviso curto pra pessoa (caiu no vazio, buraco negro só do dono…) */
  onAviso?: (msg: string) => void;
  /** NASCE num tubo de ensaio do berçário e faz o tour da anfitriã (o React decide: 1ª vez no hiperespaço novo) */
  nascer?: boolean;
  /** o passo do tour mudou (null = acabou/pulou) */
  onGuia?: (g: EstadoGuia | null) => void;
  /** a Zaeon (holograma na capela) fez uma PERGUNTA: o React mostra o painel de resposta (null = fechou) */
  onPergunta?: (p: (PerguntaZaeon & { n: number; total: number }) | null) => void;
  /** a conversa com a Zaeon acabou: o perfil (o React salva no servidor — User.cyberPerfil) */
  onPerfil?: (p: PerfilZaeon) => void;
  /** um turno GERATIVO da conversa com a Zaeon (o React chama o servidor: app/api/lounge3d/[id]/zaeon); sem isto, o
   *  roteiro local (lib/cyber/conversaZaeon `fallbackZaeon`) */
  conversarZaeon?: (p: PedidoZaeon) => Promise<TurnoZaeon>;
  /** a VOZ da Zaeon (o React chama o servidor: app/api/lounge3d/[id]/zaeon/voz) → o WAV em base64, ou null; sem isto, ela
   *  fala só no balão (a boca mexe sorteada) */
  vozZaeon?: (texto: string) => Promise<string | null>;
  /** entrou/saiu da INSTÂNCIA do tutorial (o React esconde o chat da sala e quem está online enquanto ela é só da pessoa) */
  onInstancia?: (on: boolean) => void;
  /** a pessoa desrespeitou a Zaeon: o Droid EXPULSOU ela do cyberespaço (o React tira ela daqui) */
  onExpulso?: () => void;
  /** um AGENTE falou (o Droid, no tutorial): o balão sai em cima dele e o React põe a fala no chat (só local) */
  onFalaAgente?: (f: { id: string; nome: string; cor: string; texto: string }) => void;
  /** clicou na nave estando perto → o React pede acesso ao servidor e chama `embarcar()` */
  onEmbarcar?: () => void;
  /** estado da nave/cidade pra UI (botões Embarcar / Sair / Voltar) */
  /** a AÇÃO de contexto mudou (o que o F faz agora: "Estudar", "Montar na moto"…) ou acabou (null) */
  onAcao?: (a: { rotulo: string } | null) => void;
  onEstadoQG?: (s: { noCeu: boolean; navePerto: boolean; pilotando: boolean; pousado: boolean; moto: boolean; motoPerto: boolean }) => void;
  /** CORRIDA: cada evento (contagem, largada, portão, volta, fim) — e null quando a corrida acaba/é abandonada */
  onCorrida?: (e: (EventoCorrida & { pista: string }) | null) => void;
  /** HUD de voo (pilotando): altímetro — só quando muda (≤ 10×/s) */
  onVoo?: (h: { y: number }) => void;
  /** atalho de rota em andamento (piloto automático) ou null (chegou / cancelado) */
  onRota?: (destino: DestinoRota | null) => void;
  /** o dono clicou na TV do lounge da Zaeon (perto dela) → abre a caixa do recado pro mural da Recepção */
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
  /** o MODO ESTUDO no TABLET (lib/cyber/descanso): o tablet terminou de materializar (abre o laboratório por cima) ou
   *  sumiu — o React abre/fecha a janela; `engine.fecharTablet()` guarda o tablet */
  onTablet?: (aberto: boolean) => void;
  /** perto de um sofá/puff do lounge (mostra a dica "J sentar") / dentro do lounge (o botão do tablet) */
  onDescanso?: (d: { pertoDeLugar: boolean; noLounge: boolean; modo: ModoDescanso | null; podeDeitar: boolean }) => void;
  onSessao?: (go: string) => void;
  onPronto?: () => void;
  /** o carregamento: em que etapa está e quanto da barra já foi (lib/cyber/carregamento) */
  onCarregando?: (c: Carregando) => void;
};

type Ator = { id: string; name: string; color: string; av: AvatarLuzHandle; /** o corpo VRM já pedido (o do founder) */ vrm?: boolean; pos: THREE.Vector3; facing: number; moving: boolean; sit: number; tag: HTMLDivElement; alt: number;
  /** na cabine do DJ do lounge (0..1, suavizado): fone na cabeça, mãos na controladora */
  dj?: number;
  /** parado na pista do lounge (0..1, suavizado): dançando */
  danca?: number;
  /** sendo levado pelo ELEVADOR DE LUZ da torre do DJ (0..1, suavizado): surfando na prancha de luz */
  surf?: number;
  /** sendo PUXADO por um FIO DE ENERGIA até uma sala (0..1, suavizado): pendurado na alça; e o assobio dele (remotos) */
  puxa?: number; somFio?: LoopSom | null;
  /** ARENA PvP (remotos): o último golpe que chegou (a presença), o golpe animando agora, a espada na mão (e quanto dela
   *  está materializada) e a vida */
  atkUlt?: number; golpe?: { g: Golpe; ini: number } | null; espada?: EspadaHandle | null; revela?: number; hp?: number;
  /** o MOVIMENTO TURBINADO dele (a presença `mov`): o estado, desde quando, e os pesos suavizados do sprint/dash/guarda */
  mov?: number; tMov?: number; wSpR?: number; wDaR?: number; wAlR?: number;
  /** DESCANSO no lounge (0..1, suavizados): sentado no sofá/puff, deitado no sofá, o tablet na mão; a altura do assento */
  sofa?: number; deita?: number; tab?: number; assentoY?: number; relaxa?: number;
  /** remotos: a pose de descanso que chegou pela rede (lib/cyber/descanso `codificarDescanso`) */
  desc?: number;
  /** remotos: tempo acumulado desde a última animação (de longe/fora da tela anima menos vezes por segundo) */
  acum?: number;
  /** remotos: no topo da Zaeon / pilotando (só valem pra quem o servidor marcou fundador) / na cidade (qualquer um) */
  topo?: boolean; ceu?: boolean; nave?: NaveHandle | null; naveYaw?: number;
  /** a nave-QG dele estacionada (ele não está pilotando): fica parada ali, à vista de todos */
  naveP?: { x: number; y: number; z: number; yaw: number } | null;
  /** remotos: voando de mochila a jato (altura no mundo) e a velocidade vertical estimada */
  jet?: number; vyJet?: number;
  /** remotos: sons da nave dele (loops idle/voo) e passos */
  somNave?: { idle: LoopSom; voo: LoopSom; g: EstadoGatilhoVoo; voava: boolean; ev: EstadoSomNave; yAnt: number | null; vy: number } | null; passoT?: number; perto?: boolean;
  /** remotos: o jato contínuo da mochila dele + a última velocidade vertical no ar (pro baque do pouso) */
  somJet?: LoopSom[] | null; vyUlt?: number; /** o vento nas asas (quem tem asas: o founder) */ somAsas?: LoopSom | null;
  /** voz ao vivo (WebRTC) presa ao avatar; `falando` = segurando o push-to-talk agora */
  vozH?: { remover(): void } | null; falando?: boolean;
  /** remotos: montado numa moto voadora (vaga, altura, rumo) */
  moto?: MotoMontada | null;
  /** remotos: a moto que ele ESTACIONOU (fica lá até ele montar noutra ou sair) */
  motoLargada?: MotoLargada | null };
/** um balão de fala preso a quem fala (uma pessoa ou o Droid: só a posição e a altura importam) */
type Fala = { el: HTMLDivElement; ator: { pos: THREE.Vector3; alt: number }; ate: number };

/** cor da mesa da Recepção (a da anfitriã) */
const COR_QG = "#ffd36b";
/** a cor da Zaeon (o holograma, o balão e o nome no chat) */
const COR_ZAEON = "#7fe8ff";
/** a moto de um piloto (montada ou estacionada): o modelo animado, o look (a vaga: cor + carenagem, pro pool), a vaga de origem,
 *  os loops do motor e o estágio do som no quadro anterior, e o rumo/altura anteriores (curva e subida) */
type InstMoto = { h: MotoHandle; g: THREE.Group; /** o de fora: o pool liga/desliga ESTE (o corte por distância mexe no `g`) */ casca: THREE.Group; look: string; s: number; loops: Record<(typeof LOOPS_MOTO)[number], LoopSom> | null; som: EstadoSomMoto; cambio: Cambio; /** dos outros: a velocidade MEDIDA (m/s) pelo quanto andou */ pAnt: THREE.Vector3 | null; velMedida: number; yawAnt: number; yAnt: number | null; vy: number };
/** sensibilidade do olhar livre (rad por pixel do mouse) */
const SENS_OLHAR = 0.0026;
/** o que não pode virar lote (components/cyber/lotes): os alvos de clique/câmera e TUDO dentro deles (o raycast é recursivo) */
/** lotes da nave: simula a redoma abrindo, alguém a bordo, a rampa, o convés por dentro e o voo (o engine devolve o
 *  estado certo no quadro seguinte: chama aBordo/abrirCabine/rampa/verDentro todo quadro) */
const loteNave = (h: NaveHandle) => {
  fundirEstaticos(h.group, { passo: (k, t) => { h.abrirCabine(k % 2 === 0); h.aBordo(k % 3 === 0); h.rampa((k % 4) / 3, k % 2 === 0); h.verDentro(k % 5 < 2); h.atualizar({ dt: 1 / 30, t, voando: k % 4 < 2, vel: (k % 3) / 2, curva: Math.sin(t), fechada: k % 2 === 1 }); }, manter: comDescendentes([...h.alvos, h.assento]) });
  h.abrirCabine(false); h.aBordo(false); h.verDentro(false);
  for (let i = 0; i < 6; i++) h.atualizar({ dt: 1, t: 0, voando: false, vel: 0, curva: 0 });   // volta ao repouso (pernas, raios, redoma)
};
const comDescendentes = (objs: (THREE.Object3D | null | undefined)[]) => { const out: THREE.Object3D[] = []; for (const o of objs) o?.traverse((n) => { out.push(n); }); return out; };

/** as áreas das 3 grandes regiões (a caixa automática pegaria o anel do elevador / o portal lá no chão) */
const cil = (c: { x: number; z: number }, r: number, y: number, abaixo: number, acima: number) => () => ({ x: c.x, z: c.z, r, y0: y - abaixo, y1: y + acima });
const AREA_ZAEON = cil(CIDADE.centro, Math.max(CIDADE.bordaR + 90, -CIDADE.salas.lounge.x + CIDADE.salas.lounge.r + 10), CIDADE.pisoY, CIDADE.ilhaAltura + CIDADE.agulha.altura + 10, 220);   // + ilhotas, a escada e o lounge
const AREA_UNILAB = cil(UNIVERSIDADE.centro, UNIVERSIDADE.discoR, UNIVERSIDADE.y, 100, 80);
const AREA_SOLANA = cil(PLATAFORMAS.solana.centro, PLATAFORMAS.solana.r + 10, PLATAFORMAS.solana.y, 40, 40);
const DICA_MIRA_CSS = "position:absolute;left:50%;bottom:92px;transform:translateX(-50%);font:600 12px system-ui,sans-serif;color:#cfeaff;background:rgba(8,14,34,.62);border:1px solid rgba(150,220,255,.3);padding:5px 12px;border-radius:999px;pointer-events:none;white-space:nowrap;";
const TAG_CSS = "position:absolute;left:0;top:0;transform:translate(-50%,-100%);font:700 11px system-ui,sans-serif;padding:2px 8px;border-radius:999px;background:rgba(10,8,30,.62);border:1px solid rgba(160,140,255,.3);white-space:nowrap;pointer-events:none;";
const FALA_CSS = "position:absolute;left:0;top:0;transform:translate(-50%,-100%);max-width:200px;font:12.5px system-ui,sans-serif;color:#eee8ff;background:rgba(14,12,36,.82);border:1px solid;padding:6px 10px;border-radius:12px;pointer-events:none;overflow-wrap:anywhere;";

/** o que o HUD da corrida mostra (lido a cada quadro: `engine.corridaHud`) */
export type HudCorrida = {
  pista: string; nome: string; fase: FaseCorrida; contagem: number; tempo: number; volta: number; voltas: number;
  portao: number; nPortoes: number; tempos: number[]; total: number | null;
  /** o próximo portão: a direção em relação à câmera (rad, 0 = em frente, + = à direita) e a distância (m) */
  seta: number; dist: number;
};
/** a MELHOR corrida de cada pista (neste aparelho): as parciais (pro delta) e o total */
const CHAVE_MELHOR = (pista: string) => `zaeon_corrida_melhor_${pista}`;
function lerMelhor(pista: string): { parciais: number[]; total: number } | null { try { const j = JSON.parse(localStorage.getItem(CHAVE_MELHOR(pista)) ?? "null"); return j && Array.isArray(j.parciais) && typeof j.total === "number" ? j : null; } catch { return null; } }
function gravarMelhor(pista: string, m: { parciais: number[]; total: number }) { try { localStorage.setItem(CHAVE_MELHOR(pista), JSON.stringify(m)); } catch { /* sem armazenamento */ } }

export class CyberEngine {
  private o: CyberOpts;
  private R: THREE.WebGLRenderer;
  private cam: THREE.PerspectiveCamera;
  private cena: CenaCosmicaHandle;
  private bases = new Map<string, BaseEstudoHandle>();
  private layouts = new Map<string, LayoutBase>();
  /** a mesa + cristais da RECEPÇÃO (centro do salão): a mesa da Zaeon, a anfitriã */
  private baseQG: BaseEstudoHandle | null = null;
  /** a ILHA da praça (as bases, o heliporto) — o hiperespaço não tem chão */
  private praca: PracaHandle | null = null;
  /** o berçário dos tubos de ensaio (ao lado da Recepção) */
  private bercario: BercarioHandle | null = null;
  /** o DROID (lib/cyber/agentes): o agente de onboarding — o corpo (um ofanim), onde está, o rótulo e a âncora do balão.
   *  É SÓ deste cliente (cada pessoa tem o seu; nada vai pela rede) */
  private droid: { h: DroidHandle; pos: THREE.Vector3; alt: number; tag: HTMLDivElement; fala: { pos: THREE.Vector3; alt: number } } | null = null;
  /** os PERSONAGENS que vivem na cidadela (a Nina…): corpo VRM + a agenda do relógio (lib/cyber/vidaPersonagem) */
  private personagens: { h: PersonagemVivoHandle; tag: HTMLDivElement }[] = [];
  /** a FROTA DE IAs (components/cyber/FrotaIA — lib/cyber/frota): centenas de "jogadores" vivendo pelo relógio */
  private frota: FrotaHandle | null = null;
  /** NASCENDO no tubo (s desde o começo) — sem andar até o vidro abrir */
  private nascendo: { t: number; tubo: number } | null = null;
  /** o TUTORIAL do Droid: o passo, quantas falas dele já saíram, o relógio da fala, se já está ESPERANDO a pessoa cumprir
   *  (`ativo`) e o que ela fez desde então (`andou`, `motoAndou`, `tunel`, a altura do chão de onde voou) */
  private guia: { passo: number; fala: number; falaT: number; ativo: boolean; andou: number; motoAndou: number; portal: boolean; pisoY: number; prev: { x: number; z: number } } | null = null;
  /** o farol do alvo do tour (uma coluna de luz) */
  private farol: THREE.Mesh | null = null;
  /** o rosto da Zaeon em holograma (sai do globo da capela no tutorial) e a CONVERSA com ela (as perguntas) */
  private holoZaeon: HoloZaeonHandle | null = null;
  /** a CONVERSA: a etapa, o relógio, as perguntas fixas (`i`), o perfil, as falas, a parte gerativa (`ia`: a pergunta
   *  pendente, as trocas e as fugas de assunto seguidas) e um número de série (resposta atrasada de outra conversa não vale) */
  private conversa: { etapa: "abrindo" | "perguntando" | "esperando" | "pensando" | "reagindo" | "fechando" | "feita" | "brava"; t: number; linha: number; i: number; perfil: PerfilZaeon; historico: FalaConversa[]; ia: boolean; proxima: { fala: string; opcoes: string[] } | null; turno: number; foraSeguidas: number; serie: number } | null = null;
  private serieConversa = 0;
  /** EXPULSANDO (abuso): o relógio da cena — o Droid vem pra frente, fala e a pessoa é tirada daqui */
  private expulsando: { t: number; falou: boolean } | null = null;
  private falaZaeon = { pos: new THREE.Vector3(), alt: 0 };
  /** a VOZ dela (lib/cyber/vozZaeon): o cache das sínteses (WAV), os já decodificados, a fala ESPERANDO o áudio (o balão
   *  só sai quando a voz começa — ou sem voz, passado o prazo), a voz tocando e quanto a última fala durou */
  private vozCache: CacheVoz<ArrayBuffer> | null = null;
  private vozDecod = new Map<string, Promise<AudioBuffer | null>>();
  private vozPreaquecida = false;
  private falaZ: { texto: string; ultima: boolean; espera: number; limite: number; buf: AudioBuffer | null | undefined; depois?: () => void } | null = null;
  /** a fala que está no balão agora (uma voz que chega ATRASADA só toca se ainda for ela) */
  private falaAtual: NonNullable<CyberEngine["falaZ"]> | null = null;
  private vozZ: FalaHolograma | null = null;
  private durFalaZ = 0;
  /** dentro do TÚNEL de um buraco negro (escolhendo o destino): parado até o React responder */
  private tunel: TunelAberto | null = null;
  /** a boca do par do dono só dispara de novo depois de sair dela; o aviso de "só o dono" sai 1× por entrada */
  private bocaDonoArmada = true;
  private colisores: Colisor[] = [];
  private pessoas = new Map<string, PessoaCyber>();
  /** ids na ORDEM canônica dos membros (define a base de cada um). */
  private ordem: string[] = [];
  /** marcos megalíticos (Zaeon…) e o estado "no topo da Zaeon" do dono */
  private lms: LandmarkHandle[] = [];
  /** REGIÕES por distância (components/cyber/regioesCena): de longe some o detalhe e a animação para */
  private regioes = new Map<THREE.Object3D, RegiaoCena>();
  /** a viagem na ESCADA DE ENERGIA do lounge (lib/cyber/ceu `bocaDaEscada`): sobe ou desce sozinha, surfando */
  private viagem: { tipo: "escada" | "elevador"; sentido: "sobe" | "desce"; t: number; sala?: NomeSala } | null = null;
  /** QUALIDADE ADAPTATIVA (lib/cyber/qualidadeAdaptativa): o pixel ratio do perfil é o teto; a escada multiplica */
  private qa!: QualidadeAdaptativa; private prBase = 1; private ultimoDesenho = 0;
  private frustum = new THREE.Frustum(); private mProj = new THREE.Matrix4(); private esfAtor = new THREE.Sphere();
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
  /** os OUTROS CAMPI flutuantes (UFC, Unifor, UECE — lib/cyber/campi) */
  private campi: { id: IdCampus; h: CampusHandle; area: () => Regiao }[] = [];
  /** a Solana House (Superteam Brasil) — disco flutuante com prédio de 3 andares + rooftop */
  private solana: SolanaHouseHandle | null = null;
  /** o player do toca-discos do lounge (a música sai das caixas, sincronizada pra sala toda) */
  private somLounge: SomLoungeHandle | null = null;
  /** em pé num LUGAR FLUTUANTE (universidade / Solana House) e em que andar (lib/cyber/plataformas) */
  private plat: { id: IdPlataforma; andar: number } | null = null;
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
  private portalArmado = true;   // o anel de um buraco negro só dispara de novo depois de sair dele
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
  private ro!: ResizeObserver; private io: IntersectionObserver | null = null;
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
  /** MOTOS VOADORAS (lib/cyber/motos): as das VAGAS são decoração ESTÁTICA (um lote por moto: barata) e sempre
   *  prontas — quem monta LEVA a moto e o ROBÔ de cada estacionamento fabrica outra na vaga (`fabricas`). A moto de cada
   *  piloto é uma INSTÂNCIA animada (`instMotos`, chave "<dono>:r" montada / "<dono>:p" estacionada; dono "eu" = eu),
   *  criada sob demanda e reaproveitada por look (`poolMotos`). `loops`/`som` = o som por estágio (lib/cyber/somMoto). */
  /** `g` = a posição na vaga (o corte por distância mexe nele); `moto` = a moto em si (some/se forma com o robô) */
  private vagaMotos: { g: THREE.Group; moto: THREE.Object3D; alvos: THREE.Object3D[] }[] = [];
  /** `efeitoEm` = a vaga onde está a luz da fabricação (fica lá até o clarão acabar) */
  private fabricas: { lote: Lote; f: Fabrica; robo: RoboMotosHandle; pos: { x: number; y: number; z: number }; rumo: number; efeitoEm: number | null }[] = [];
  private instMotos = new Map<string, InstMoto>();
  private poolMotos = new Map<string, InstMoto[]>();
  /** remotos: o que cada um montava no quadro anterior ("vaga|de") — montou de uma VAGA → ela esvaziou */
  private motoVista = new Map<string, string>();
  /** montado: a vaga de ORIGEM da moto (o look) e `motoDe` = de quem era a estacionada que peguei (eu mesmo, inclusive) */
  private motoDe: string | undefined = undefined;
  private moto: number | null = null; private motoEst: EstadoMoto = motoParada(0, 0, 0, 0); private motoPousado = true;
  /** cliquei numa moto longe: anda até ela e monta ao chegar */
  private motoAlvo: AlvoMoto | null = null;
  /** a moto que EU estacionei: fica onde desci (não volta pra vaga) — os outros veem pela minha presença */
  private motoLargada: MotoLargada | null = null;
  /** botão ⚡ da moto apertado; a câmera volta pra trás da moto a partir de `camSegueEm` (mexeu o mouse = espera) */
  private boostBotao = false; private camSegueEm = 0; private acelMoto = 0;
  /** a sensação de velocidade na tela (suavizada): FOV, blur radial, linhas de velocidade, tremida do boost */
  private velTela = 0; private fovBase = 0; private fxVel: VelocidadeTela | null = null; /** a onda de choque da barreira do som na MINHA moto: s desde que rompeu (< 0 = nenhuma) */ private ondaT = -1;
  /** as PISTAS de corrida no mundo e a corrida em andamento (minha) */
  private pistas: PistasHandle | null = null; private corrida: { c: Corrida; pista: Pista; melhor: { parciais: number[]; total: number } | null } | null = null;
  /** o MOVIMENTO TURBINADO (lib/cyber/movimento): há quanto tempo segura correr andando (o sprint), o dash, a velocidade
   *  no plano (a sensação de velocidade), o tremor dos impactos e os efeitos (rastro do dash, onda de choque) */
  private tCorrendo = 0; private velAPe = 4; private dash: EstadoDash = null; private dashUlt: { x: number; z: number; esperado: number } | null = null;
  private velPlano = 0; private posAnt: { x: number; z: number } | null = null; private tremor = 0; private fantasmaT = 0; private agora = 0; private dashAtivo = false; private tAnt = 0;
  /** as poses de AÇÃO (lib/cyber/posesCombate): o peso do sprint e do dash, e quando o último dash acabou (a guarda) */
  private wSprint = 0; private wDash = 0; private tFimDash = -Infinity;
  /** a DECOLAGEM com impulso (agacha → lança, com o embalo do chão), a altura máxima do voo e o HERO LANDING (queda alta) */
  private decola: { t0: number; espera: number; momento: { x: number; z: number } } | null = null; private tDecolou = -Infinity; private esperaDecolou = 0;
  private altMaxVoo = -Infinity; private tHeroi = -Infinity;
  /** o COMBATE da arena (lib/cyber/combate, lib/cyber/arena): o inventário (a arma equipada), a espada na mão (e quanto
   *  dela está materializada), o golpe do combo agora, a vida, caído/protegido, o empurrão e o HUD (vida, números) */
  private inv: Inventario = inventarioInicial(); private espada: EspadaHandle | null = null; private revela = 0;
  private ataque: EstadoAtaque | null = null; private filaAtaque = false; private seqAtaque = 0; private tAtacou = -Infinity; private acertados = new Set<string>();
  private vida = VIDA_MAX; private caidoAte = -Infinity; private protegidoAte = -Infinity; private empurrao = { x: 0, z: 0 }; private wGuardaArena = 0;
  private vRastroB = new THREE.Vector3(); private vRastroP = new THREE.Vector3();
  /** o HIT-STOP (até quando a ação fica congelada — o peso do golpe que pegou) e o golpe pesado que já esmagou o chão */
  private pausaAte = -Infinity; private esmagou = -1; private raiosExtra = 0;
  private arena: ArenaHandle | null = null;
  /** golpes de OUTROS jogadores que podem me pegar: confere no meio da janela que corta (quem apanha decide — sabe se estava no dash) */
  private golpesChegando: { de: Ator; g: Golpe; quando: number; x: number; z: number; rumo: number }[] = []; private hudCombate: HTMLDivElement | null = null; private numeros: { el: HTMLDivElement; p: THREE.Vector3; t0: number }[] = [];
  private fxMov: EfeitosMovimentoHandle | null = null;
  /** a capela, a laje do lounge e a torre do DJ: sólidos pra quem VOA (moto/nave) — fixos, calculados uma vez (a torre
   *  é um campo de força pra quem não é o dono: só ele pousa na cabine) */
  private readonly solidosCidade: Pilar[];
  private montadoTmp = { maoE: new THREE.Vector3(), maoD: new THREE.Vector3(), peE: new THREE.Vector3(), peD: new THREE.Vector3() };
  /** em pé no dorso da nave (depois de sair dela, ou pousando nela de mochila) */
  private sobreNave = false;
  // ── ÁUDIO (components/cyber/AudioCyber): loops presos aos objetos + one-shots nos eventos ──
  private som!: AudioCyberHandle;
  private somLoops: { leito?: LoopSom; naveIdle?: LoopSom; naveVoo?: LoopSom; jet?: LoopSom[]; fio?: LoopSom } = {};
  /** quando avisei por último que o fio está cheio (s, relógio da cena) */
  private avisoFioCheio = -99;
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

  /** Cria a engine e MONTA o mundo em etapas (lib/cyber/carregamento), avisando a tela de loading — só resolve com
   *  TUDO pronto: corpos, mundo, sons decodificados, imagens, shaders compilados e o primeiro quadro desenhado.
   *  Se o modelo humano não carregar, os avatares ficam só com a luz/neurônios. */
  static async criar(opts: CyberOpts): Promise<CyberEngine> {
    const p = (c: Carregando) => opts.onCarregando?.(c);
    THREE.Cache.enabled = true;   // texturas/arquivos baixados no loading são reaproveitados depois (sem baixar de novo)
    p(carregando("corpo", 0));
    const gltf = await carregarModeloAvatar().catch((e) => { console.warn("[cyber] avatar GLB não carregou:", e); return null; });
    const eng = new CyberEngine(opts, gltf);
    try { await eng.montarMundo(p); }
    catch (e) { eng.dispose(); throw e; }
    return eng;
  }

  private constructor(opts: CyberOpts, gltf: GLTF | null) {
    this.o = opts; this.menu = opts.menu; this.gltf = gltf;
    this.solidosCidade = solidosDaCidade(!!opts.eu.fundador);
    const { container, low } = opts;
    this.w = Math.max(1, container.clientWidth); this.h = Math.max(1, container.clientHeight);
    const q = opts.qualidade;
    this.R = new THREE.WebGLRenderer({ antialias: q ? q.antialias : !low, powerPreference: "high-performance" });
    this.prBase = Math.min(q ? q.pixelRatioMax : low ? 1.25 : 1.5, window.devicePixelRatio || 1);   // tela retina a 2× custava ~78% mais pixels
    this.R.setPixelRatio(this.prBase);
    this.R.setSize(this.w, this.h, false);
    this.fpsMax = q?.fpsMax ?? 0;
    this.qa = new QualidadeAdaptativa(this.fpsMax);
    this.R.autoClear = false; this.R.outputColorSpace = THREE.SRGBColorSpace;
    const cv = this.R.domElement; cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:" + (opts.menu ? "pan-y" : "none");
    container.appendChild(cv);
    this.cam = new THREE.PerspectiveCamera(45, this.w / this.h, 0.15, 3600);   // mapa de raio 1500 (os campi na borda: de um lado se vê o outro)
    this.cena = criarCenaCosmica(low, this.w / this.h);
  }

  /** MONTA o mundo em etapas, cedendo a vez pro navegador entre elas (a barra anda, a aba não congela). Para se a
   *  engine for descartada no meio (saiu da página durante o loading). */
  private async montarMundo(p: (c: Carregando) => void) {
    const opts = this.o, { container, low } = opts;
    const etapa = async (id: IdEtapa, dentro = 0, detalhe?: string) => {
      p(carregando(id, dentro, detalhe));
      await new Promise<void>((r) => { let ok = false; const fim = () => { if (!ok) { ok = true; r(); } }; requestAnimationFrame(() => setTimeout(fim, 0)); setTimeout(fim, 80); });
      if (!this.vivo) throw new Error("cyber: carregamento interrompido");
    };
    // os SONS começam a ser preparados JÁ (baixam/decodificam em paralelo com a montagem; a etapa "sons" espera)
    let sonsFeitos = 0, sonsTotal = 1;
    const sons = preCarregarSons((f, t) => { sonsFeitos = f; sonsTotal = t; });
    // o corpo do FOUNDER (VRM, ~16 MB) também já começa a baixar — fica no cache pro vestirFundador
    if (opts.eu.fundador) void new THREE.FileLoader().setResponseType("arraybuffer").loadAsync(CORPO_DO_FUNDADOR.url).catch(() => null);
    await etapa("hiperespaco", 1);
    await etapa("praca");
    // a ILHA da praça (sempre: sem chão, as bases precisam de onde ficar)
    { const pr = criarPraca({ low, starTex: this.cena.starTex }); camuflarGrupo(pr.group);
      fundirEstaticos(pr.group, { passo: (_, t) => pr.atualizar(1 / 30, t), manter: [pr.piso] });
      this.cena.scene.add(pr.group); this.praca = pr; }
    // a ARENA PvP (a praça inteira — lib/cyber/arena): o anel de combate, os pilares, a placa e os bonecos de treino
    if (!this.o.menu) { this.arena = criarArena({ low }); this.cena.scene.add(this.arena.group); }
    if (opts.landmarks) await etapa("mirantes");
    if (opts.landmarks) for (const poi of POIS) {
      const lm = criarLandmark(poi, { low, starTex: this.cena.starTex });
      camuflarGrupo(lm.group);   // holograma: sem PBR nem luzes (components/cyber/camuflagem)
      fundirEstaticos(lm.group, { passo: (k, t) => { lm.donoPresente(k % 2 === 0); lm.atualizar(1 / 30, t); }, manter: comDescendentes([...lm.alvos, lm.topo, lm.monitorTopo, lm.escada]) });
      this.cena.scene.add(lm.group); this.lms.push(lm);   // sem rótulo na tela (interface limpa); o nome sai no painel do clique
    }
    if (opts.landmarks) {
      await etapa("terra");
      await new THREE.TextureLoader().loadAsync(URL_TERRA).catch(() => null);   // (no cache: os telões e os globos usam essa)
      await etapa("veias");
      gerarVeias({ low });   // (determinístico e memorizado: a cidade reaproveita)
      await etapa("zaeon");
      this.cidade = criarCidade({ low, starTex: this.cena.starTex,
        aoRaio: (em) => { if (this.noCentroDaCapela()) this.som?.tocar("raio", em, { dist: DISTANCIA.raio, taxa: 0.9 + Math.random() * 0.2 }); },
        aoBater: (em) => { if (this.noCentroDaCapela()) this.som?.tocar("coracao", em, { dist: DISTANCIA.coracao }); } });
      camuflarGrupo(this.cidade.group);
      { const c = this.cidade;   // lotes: simula com e sem música (o palco, as caixas e a pista pulsam com o grave)
        fundirEstaticos(c.group, { passo: (k, t) => { c.somTocando(k % 3 !== 0, (k % 5) / 4); c.atualizar(1 / 30, t); }, manter: [...comDescendentes([...c.alvos, c.portalTunel, c.tvLounge]), ...[c.tocaDiscos, ...c.caixasLounge, ...c.caixasAmbiente.map((x) => x.obj)].filter((x): x is THREE.Object3D => !!x)] });   // a mesa do DJ e as bocas das caixas: só o próprio nó (é posição/som, não clique)
        c.somTocando(false); for (let i = 0; i < 6; i++) c.atualizar(1, 0); }
      this.cena.scene.add(this.cidade.group);
      this.bercario = criarBercario(this.cidade.ilha, { low });   // os tubos de ensaio, ao lado da Recepção (flutuam com a ilha)
      this.holoZaeon = criarHoloZaeon(this.cidade.ilha, { low });   // o rosto da Zaeon (só aparece no tutorial)
      if (baseNoQG()) { this.holo = criarHoloRecado(); this.cena.scene.add(this.holo.group); }
      await etapa("univ");
      this.univ = criarUniversidade({ low, starTex: this.cena.starTex }); camuflarGrupo(this.univ.group); this.cena.scene.add(this.univ.group);
      { const u = this.univ; fundirEstaticos(u.group, { passo: (_, t) => u.atualizar(1 / 30, t), manter: comDescendentes(u.alvosCamera) }); }
      for (const [k, id] of IDS_CAMPI.entries()) {   // os outros campi: prédios instanciados (o lote só junta a fundação/placas)
        await etapa("campi", k / IDS_CAMPI.length, CAMPI[id].sigla);
        const C = CAMPI[id], h = criarCampus(id, { low }); this.cena.scene.add(h.group);
        fundirEstaticos(h.group, { passo: (_, t) => h.atualizar(1 / 30, t), manter: comDescendentes(h.alvosCamera) });
        this.campi.push({ id, h, area: cil(C.centro, C.r, C.y, Math.min(220, C.r * 0.6) + 20, 110) });
      }
      { // os ESTACIONAMENTOS das universidades (colados no disco, do lado da Zaeon) — os da Zaeon vêm com a cidade
        const pf = criarPisosEstudo({ low, onde: "fora" }); this.cena.scene.add(pf); fundirEstaticos(pf); this.pisosEstudo = pf; }
      await etapa("solana");
      this.solana = criarSolanaHouse({ low, starTex: this.cena.starTex }); camuflarGrupo(this.solana.group); this.cena.scene.add(this.solana.group);
      { const so = this.solana; fundirEstaticos(so.group, { passo: (_, t) => so.atualizar(1 / 30, t) }); }
      pararCamuflagem(typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
      await etapa("nave");
      this.nave = criarNave({ low, cor: "#2f7bff" }); loteNave(this.nave); this.cena.scene.add(this.nave.group);
      // as motos das VAGAS: paradas pra sempre → um lote estático cada (o robô repõe; quem monta leva uma instância)
      const vs = vagas();
      for (const [i, v] of vs.entries()) {
        if (i % 6 === 0) await etapa("motos", i / vs.length, `${i}/${vs.length}`);
        const h = criarMoto({ ...lookDaVaga(i), low });
        for (let k = 0; k < 6; k++) h.atualizar({ dt: 1, t: 0, voando: false, vel: 0, curva: 0 });
        fundirEstaticos(h.group, { manter: comDescendentes(h.alvos) });
        const g = new THREE.Group(); g.add(h.group); g.position.set(v.x, this.yDaVaga(v), v.z); g.rotation.y = v.yaw;
        this.cena.scene.add(g); this.vagaMotos.push({ g, moto: h.group, alvos: h.alvos });
      }
      // as PISTAS de corrida (rasantes, por baixo dos campi e da Zaeon) — sempre no mundo, discretas
      this.pistas = criarPistas({ low, starTex: this.cena.starTex }); this.cena.scene.add(this.pistas.group);
      // o ROBÔ de cada estacionamento, pousado na plataforma dele
      for (const l of LOTES) {
        const robo = criarRoboMotos({ low }), b = baseDoRobo(l), y = this.yDoLote(l) + 1.6;
        robo.group.position.set(b.x, y, b.z); this.cena.scene.add(robo.group, robo.efeito);
        this.fabricas.push({ lote: l, f: fabricaNova(), robo, pos: { x: b.x, y, z: b.z }, rumo: l.rot, efeitoEm: null });
      }
      const marca = new THREE.Mesh(new THREE.RingGeometry(1.7, 2.2, 40), new THREE.MeshBasicMaterial({ color: 0x7fe0ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      marca.rotation.x = -Math.PI / 2; marca.visible = false; this.cena.scene.add(marca);
      const borda = new THREE.Mesh(new THREE.TorusGeometry(CIDADE.bordaR, 0.14, 6, low ? 64 : 128), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
      borda.rotation.x = Math.PI / 2; borda.position.set(CIDADE.centro.x, CIDADE.pisoY, CIDADE.centro.z); borda.visible = false; this.cena.scene.add(borda);
      this.hudVoo = { marca, borda, chave: "", t: 0 };
      // o FAROL do tour: uma coluna de luz no alvo do passo (some fora do tour)
      const farol = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, 60, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffcf6e, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      farol.visible = false; this.cena.scene.add(farol); this.farol = farol;
    }

    // os SONS: espera a preparação terminar (a barra mostra quantos já foram)
    for (;;) { const ok = await Promise.race([sons.then(() => true), new Promise<false>((r) => setTimeout(() => r(false), 120))]); await etapa("sons", sonsFeitos / Math.max(1, sonsTotal), `${sonsFeitos}/${sonsTotal}`); if (ok) break; }
    await etapa("pessoas");
    this.som = criarAudioCyber({ camera: this.cam, cena: this.cena.scene, low });
    const sint = opts.vozZaeon;
    if (sint) this.vozCache = criarCacheVoz(async (t) => { const b64 = await sint(t); return b64 ? base64ParaBuffer(b64) : null; });
    if (this.cidade?.caixasLounge.length && opts.urlMusica) this.somLounge = criarSomLounge({ audio: this.som, caixas: this.cidade.caixasLounge, urlDe: opts.urlMusica });
    this.setPessoas([...opts.membros]);
    if (this.cidade) this.criarDroid();
    if (this.cidade && this.gltf && personagensLigados()) setTimeout(() => this.criarPersonagens(), 2500);   // depois que a cena montou (o VRM é pesado)
    if (this.cidade && !this.o.menu) this.ligarFrota();
    this.montarSom();
    this.ligarEntradas();
    this.ro = new ResizeObserver(() => this.redimensionar()); this.ro.observe(container);
    if (typeof IntersectionObserver !== "undefined") { this.io = new IntersectionObserver((e) => { this.visivel = !!e[0]?.isIntersecting; }); this.io.observe(container); }
    // a LUZ: compila todos os shaders agora (senão cada material novo trava a tela na 1ª vez que aparece)
    await etapa("shaders");
    this.criarLuzesBase();   // (ANTES de compilar: o nº de luzes muda o programa de todo material)
    this.fxMov ??= criarEfeitosMovimento(this.cena.scene);   // (o rastro do dash e a onda de choque: compilam junto — na hora, a 1ª vez travava ~0,6 s)
    // inclusive o que está ESCONDIDO agora (o detalhe das regiões longe, o interior da nave…): o three só compila o que é
    // visível, e o resto compilava no 1º quadro em que aparecesse — a travada ao chegar num lugar. Nada é desenhado aqui.
    { const escondidos: THREE.Object3D[] = []; this.cena.scene.traverse((o) => { if (!o.visible) { escondidos.push(o); o.visible = true; } });
      try { await this.R.compileAsync(this.cena.scene, this.cam); } catch { /* sem a extensão de compilação paralela: compila no 1º quadro */ }
      // e a versão de desenhar NA TEXTURA do blur de velocidade (moto, sprint, dash, voo turbo — components/cyber/VelocidadeTela)
      if (!this.o.menu && !this.o.low) { this.fxVel ??= criarVelocidadeTela({ amostrasMsaa: this.R.getContext().getContextAttributes()?.antialias ? 4 : 0 }); await this.fxVel.compilar(this.R, this.cena.scene, this.cam); }
      this.subirParaGpu(this.cena.scene);   // geometrias e texturas já na GPU (atrás da tela de carregamento)
      for (const o of escondidos) o.visible = false; }
    // a VELOCIDADE NA TELA (linhas + blur radial — moto, sprint, dash, voo turbo): monta e desenha 1× aqui, com e sem o
    // blur (o alvo de render e os 2 shaders); na hora, o 1º arranque travava ~1 s
    if (!this.o.menu) { this.fxVel ??= criarVelocidadeTela({ amostrasMsaa: this.R.getContext().getContextAttributes()?.antialias ? 4 : 0 });
      for (const blur of this.o.low ? [false] : [false, true]) this.fxVel.render(this.R, 0.5, 0, () => this.R.render(this.cena.scene, this.cam), blur); }
    // o que nasce DEPOIS (a frota, a multidão, os personagens VRM): a versão do blur deles compila em segundo plano
    // (paralelo, sem travar) uns segundos depois de entrar — senão o 1º sprint/dash/boost compilava ~20 shaders de uma vez
    if (!this.o.menu && !this.o.low) for (const ms of [9000, 26000]) setTimeout(() => { if (this.vivo && this.velTela < 0.03) void this.fxVel?.compilar(this.R, this.cena.scene, this.cam); }, ms);
    await etapa("quadro");
    this.clock.start();
    const primeiro = new Promise<void>((r) => { this.aoPrimeiroQuadro = r; });
    this.raf = requestAnimationFrame((t) => this.loop(t));
    if (!document.hidden) await Promise.race([primeiro, new Promise((r) => setTimeout(r, 4000))]);   // (aba oculta não desenha: não espera)
    p(carregando("quadro", 1));
  }
  /** depuração em dev: `window.__cyber` = o motor VIVO (quem monta chama — no modo estrito o React monta 2 e o cancelado terminava por último) */
  exporDepuracao() {
    const pedido = typeof location !== "undefined" && new URLSearchParams(location.search).has("depurar");   // (em produção, só com ?depurar: as medidas de desempenho)
    if ((process.env.NODE_ENV !== "production" || pedido) && this.vivo) (window as unknown as { __cyber?: CyberEngine }).__cyber = this;
  }
  private aoPrimeiroQuadro: (() => void) | null = null;
  private passadaEm = -Infinity;
  /** as LUZES das bases: um conjunto FIXO (o nº de luzes da cena não muda quando alguém entra — mudar recompila todos os
   *  materiais) que vai pras bases mais perto da câmera (components/cyber/BaseEstudo `luz`) */
  private luzesBase: THREE.PointLight[] = [];
  /** as bases desenhadas juntas (components/cyber/poolGemeos) */
  private poolBases: PoolGemeos | null = null;
  /** os pisos que escondem (components/cyber/oclusaoPisos) */
  private oclusao: ReturnType<typeof criarOclusaoDePisos> | null = null;
  /** os estacionamentos das universidades (components/cyber/EstacionamentosEstudo) */
  private pisosEstudo: THREE.Group | null = null;
  private criarLuzesBase() { if (!this.o.low && !this.luzesBase.length) for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0x9fd8ff, 0, 11); this.cena.scene.add(l); this.luzesBase.push(l); } }
  /** SOBE pra GPU tudo que está no galho (geometria, texturas; e calcula as esferas das geometrias): um desenho de 1
   *  pixel com o recorte desligado. Senão isso cai no 1º quadro em que o objeto aparece (a travada ao chegar num lugar) */
  private subirParaGpu(raiz: THREE.Object3D) {
    const recorte: THREE.Object3D[] = [];
    raiz.traverse((o) => { const g = (o as THREE.Mesh).geometry; if (g && !g.boundingSphere) g.computeBoundingSphere(); if (o.frustumCulled) { recorte.push(o); o.frustumCulled = false; } });
    const sc = this.R.getScissorTest(), vp = new THREE.Vector4(); this.R.getScissor(vp);
    this.R.setScissorTest(true); this.R.setScissor(0, 0, 1, 1);
    try { this.R.render(this.cena.scene, this.cam); } finally { this.R.setScissor(vp); this.R.setScissorTest(sc); for (const o of recorte) o.frustumCulled = true; }
  }
  private acenderBases() {
    if (this.o.low) return;
    this.criarLuzesBase();
    const todas = [...this.bases.values(), ...(this.baseQG ? [this.baseQG] : [])].filter((b) => b.group.visible)
      .map((b) => { const l = b.luz(new THREE.Vector3()); return { ...l, d: l.pos.distanceToSquared(this.cam.position) }; })
      .sort((a, b) => a.d - b.d);
    this.luzesBase.forEach((l, i) => { const b = todas[i]; if (b && b.d < 140 * 140) { l.position.copy(b.pos); l.intensity = b.forca; } else l.intensity = 0; });
  }
  // ───────────── DESCANSO no lounge (J) + MODO ESTUDO no TABLET (T) — lib/cyber/descanso ─────────────
  /** sentado/deitado: o lugar, o assento e o modo; a FASE — indo (andando até a frente do assento), sentando (vira e
   *  abaixa), parado (sentado/deitado), levantando (sobe e dá o passo pra frente) — e há quanto tempo está nela */
  private descanso: { lugar: Lugar; assento: number; modo: ModoDescanso; fase: "indo" | "sentando" | "parado" | "levantando"; t: number } | null = null;
  /** o tablet: quer ele na mão? quanto já materializou (0..1); o laboratório já está aberto por cima? */
  private tabletQuer = false; private tabletW = 0; private labAberto = false;
  private ultDescanso = "";
  /** onde estão as OUTRAS pessoas na Zaeon (pra não sentar no colo de ninguém) */
  private outrosNaZaeon(): { x: number; z: number }[] { return [...this.remotos.values()].filter((a) => a.ceu).map((a) => ({ x: a.pos.x, z: a.pos.z })); }
  /** quantas OUTRAS pessoas o fio de energia da sala `sala` está puxando agora (quem está no corredor dele, fora das
   *  bocas — o corredor não é piso: quem está lá está pendurado no fio) */
  private noFio(sala: NomeSala): number {
    const e = ESCADAS[sala]; let n = 0;
    for (const a of this.remotos.values()) {
      if (!a.ceu) continue;
      const q = naEscadaLocal({ x: a.pos.x - CIDADE.centro.x, z: a.pos.z - CIDADE.centro.z }, e);
      if (Math.abs(q.lat) <= e.meia + 0.5 && q.u > 1 && q.u < e.len - 1) n++;
    }
    return n;
  }
  /** dá pra sentar/usar o tablet agora? (a pé, parado no piso da Zaeon, fora de veículo/viagem/tutorial) */
  private aPeLivre(): boolean { return !this.menu && this.noCeu && !this.jet.noAr && this.moto === null && !this.pilotando && !this.bordo && !this.viagem && !this.nascendo && !this.tunel && !this.sobreNave; }
  /** a tecla J: em pé → sentado → deitado (sofá) → em pé */
  alternarDescanso() {
    if (!this.aPeLivre()) return;
    const outros = this.outrosNaZaeon();
    const d = this.descanso;
    if (d) {
      if (d.fase === "indo") { this.descanso = null; this.alvo = null; return; }   // desistiu no caminho
      if (d.fase !== "parado") return;   // sentando/levantando: deixa terminar
      const prox = proximoModo(d.modo, d.lugar, outros);
      if (prox) { d.modo = prox; this.som.tocar("near-ping", this.eu.av.group.position, { dist: DISTANCIA.perto }); } else this.levantar();
      return;
    }
    const lp = lugarPerto(this.eu.pos, outros);
    if (!lp) { this.o.onAviso?.("Chegue perto de um sofá ou pufe e aperte J pra sentar."); return; }
    // ANDA até a frente do assento (o caminho respeita as colisões), depois vira e senta
    const fr = lp.lugar.frentes[lp.assento]!;
    this.descanso = { ...lp, modo: "sentado", fase: "indo", t: 0 }; this.alvo = new THREE.Vector2(fr.x, fr.z); this.alvoDepois = null; this.falandoCom = null;
  }
  /** levanta: sobe do assento e dá o passo pra frente (fase "levantando"); termina de pé na frente dele */
  private levantar() {
    const d = this.descanso; if (!d) return;
    if (d.fase === "indo") { this.descanso = null; return; }
    if (d.fase !== "levantando") { d.fase = "levantando"; d.t = 0; }
  }
  /** a tecla T / o botão: o TABLET se materializa nas mãos e o laboratório abre por cima; de novo, guarda */
  alternarTablet() { if (this.tabletQuer || this.labAberto) this.fecharTablet(); else this.abrirTablet(); }
  abrirTablet() {
    if (!this.aPeLivre()) { this.o.onAviso?.("Pare em algum lugar (a pé) pra abrir o tablet."); return; }
    if (this.tabletQuer) return;
    this.tabletQuer = true; this.alvo = null; this.alvoDepois = null; for (const k of Object.keys(this.keys)) this.keys[k] = false;
    this.som.tocar("rise", this.eu.av.group.position, { dist: DISTANCIA.eu });
  }
  /** guarda o tablet (o laboratório já fechou ou vai fechar): ele se desfaz em partículas */
  fecharTablet() {
    this.tabletQuer = false;
    if (this.labAberto) { this.labAberto = false; this.o.onTablet?.(false); }
  }
  get tabletAberto() { return this.labAberto; }
  /** no CENTRO da capela (no piso, em volta do globo)? — só ali se ouve o coração e o raio (lib/cyber/coracao) */
  private noCentroDaCapela(): boolean {
    if (!this.noCeu || !this.cidade || this.pilotando || this.bordo) return false;
    const c = CIDADE.centro;
    return ouveOCoracao({ x: this.eu.pos.x - c.x, z: this.eu.pos.z - c.z }) && this.eu.alt - this.cidade.ilha.position.y < 25;
  }
  /** estado pra depuração/testes em dev */
  get debug() { return { x: this.eu.pos.x, z: this.eu.pos.z, alt: this.eu.alt, altoEm: this.altoEm, noTopo: this.noTopo, pilotando: this.pilotando, pousado: this.pousado, nave: { ...this.naveEst }, moto: this.moto, motoEst: { ...this.motoEst }, motoPousado: this.motoPousado, plat: this.plat, bordo: this.bordo, noAr: this.jet.noAr, tunel: this.tunel?.origem ?? null, guia: this.guia?.passo ?? null, guiaAlvo: this.guia ? this.alvoDoPasso(ROTEIRO[this.guia.passo]!) : null, instancia: this.instancia, bocaDJ: bocaDJMundo(), nascendo: !!this.nascendo, droid: this.droid ? { fase: this.droid.h.fase(), x: this.droid.pos.x, z: this.droid.pos.z, alt: this.droid.alt } : null, guiaAtivo: this.guia?.ativo ?? null }; }

  /** Reconstrói bases/atores quando a lista de membros muda (alguém entrou na sala). */
  setPessoas(lista: PessoaCyber[]) {
    if (lista.some((p) => usaCorpoDoFundador(p.fundador, location.search))) void precarregarVrm(CORPO_DO_FUNDADOR.url).catch(() => undefined);   // o corpo do founder já vai baixando
    const ids = lista.map((p) => p.id);
    if (!ids.includes(this.o.eu.id)) { lista = [...lista, this.o.eu]; ids.push(this.o.eu.id); }
    for (const p of lista) this.pessoas.set(p.id, p);
    this.ordem = ids;
    for (const a of [this.eu, ...(this.remotos?.values() ?? [])]) if (a) this.vestirFundador(a);   // o "founder" pode chegar depois do ator
    // bases especiais (só com os marcos na cena): o dono na ZAEON (céu)
    this.layouts = basesDosMembros(ids, undefined, { ceu: this.cidade ? ids.filter((id) => this.ehFundador(id)) : [], todosNaZaeon: !!this.cidade });   // (a praça é a ARENA PvP: com a cidade, todo mundo mora na Zaeon)
    if (this.eu && !this.menu) this.carregarInventario();   // (o "fundador" pode chegar depois: a espada é só dele)
    for (const [id, lay] of this.layouts) {
      const existente = this.bases.get(id);
      if (existente) { if (existente.layout.x !== lay.x || existente.layout.z !== lay.z || existente.layout.nivel !== lay.nivel) existente.mover(lay); continue; }
      const b = criarBase(lay, this.corDe(id), this.cena.starTex, this.o.low); this.loteBase(b);
      b.group.position.y = this.yDoNivel(lay.nivel);
      this.cena.scene.add(b.group); this.bases.set(id, b);
      if (this.som && (!this.o.low || id === this.o.eu.id)) this.somCristais.set(id, this.som.loop("crystals", b.group, { dist: DISTANCIA.cristais }));
    }
    // a Recepção sempre tem a mesa e os cristais no centro do salão: a mesa da anfitriã
    const lqg = this.zaeon() ? baseNoQG() : null;
    if (lqg && !this.baseQG) { this.baseQG = criarBase(lqg, COR_QG, this.cena.starTex, this.o.low); this.loteBase(this.baseQG); this.baseQG.group.position.y = this.yDoNivel("qg"); this.cena.scene.add(this.baseQG.group); }
    if (!lqg && this.baseQG) { this.poolBases?.remover(this.baseQG.group); this.soltar(this.baseQG.group); this.baseQG.dispose(); this.baseQG = null; }
    for (const a of [this.eu, ...this.remotos.values()]) { if (!a) continue; const c = this.corDe(a.id); if (c !== a.color) { a.color = c; a.av.recolorir(c); a.tag.style.color = c; } }
    // colisão: bases do anel + marcos (a MESMA lista; empurrarParaFora faz o deslizar)
    this.colisores = [...this.layouts.values()].filter((l) => !l.nivel).map((l) => ({ x: l.x, z: l.z, r: BASE_COLLIDER_R }))
      .concat(colisoresDosPOIs(this.lms.map((l) => l.poi).filter((poi) => !poi.nav)))   // marcos andáveis: lib/cyber/nav
      .concat(this.arena ? [...BONECOS.map((b) => ({ x: b.x, z: b.z, r: 0.6 })), ...PILARES_ARENA] : []);   // a ARENA: bonecos e pilares são sólidos
    if (!this.eu) {
      const lay = this.layouts.get(this.o.eu.id), sp = spawnDaBase(lay);
      this.eu = this.novoAtor(this.o.eu, sp.x, sp.z);
      if (lay?.nivel) this.entrarNivel(lay.nivel);   // nasce lá em cima, na frente da própria base (Zaeon)
      if (this.menu) { const s = this.assento(); this.eu.pos.set(s.x, 0, s.z); this.eu.facing = this.rotAssento(); this.eu.sit = 1; this.sitT = 1; }
      else this.eu.facing = lay?.nivel ? this.rotAssento() + Math.PI : Math.atan2(-sp.x, -sp.z);
      this.camT.set(this.eu.pos.x, 1.2 + this.yDoNivel(lay?.nivel), this.eu.pos.z);
      if (!this.menu && !(this.o.nascer && this.nascerNoTubo())) this.spawnNaNave();   // quem chega nasce no tubo; o dono, a bordo da nave
      if (!this.menu) this.carregarInventario();   // a arma equipada (lib/cyber/inventario) já vai pra mão
    }
  }

  /** Armadura: a cor REAL de cada um (lib/cyber/cores) — a mesma que ele vê em si e que os outros veem nele */
  private corDe(id: string) { return corDaArmadura(id); }

  private novoAtor(p: PessoaCyber, x: number, z: number): Ator {
    const cor = this.corDe(p.id);
    const av = criarAvatarLuz(cor, this.cena.starTex, this.o.low, this.gltf); av.aura(this.qa.atual.aura);
    av.group.position.set(x, 0, z); this.cena.scene.add(av.group);
    const tag = document.createElement("div"); tag.style.cssText = TAG_CSS + "color:" + cor + ";"; tag.textContent = p.id === this.o.eu.id ? "" : p.name; this.o.overlay.appendChild(tag);   // o próprio avatar não leva rótulo
    const a: Ator = { id: p.id, name: p.name, color: cor, av, pos: new THREE.Vector3(x, 0, z), facing: 0, moving: false, sit: 0, tag, alt: 0 };
    this.vestirFundador(a);
    return a;
  }
  /** o FOUNDER tem corpo próprio (VRM do VRoid — lib/cyber/estiloAvatar CORPO_DO_FUNDADOR): baixa sem travar; até
   *  chegar, ele aparece com o corpo padrão. Vale pro próprio founder e pra quem o vê de fora */
  private vestirFundador(a: Ator) {
    if (a.vrm || !this.gltf || !usaCorpoDoFundador(this.pessoas.get(a.id)?.fundador, location.search)) return;
    a.vrm = true;
    a.av.usarAsas();   // as asas negras no lugar da mochila (já, sem esperar o corpo)
    a.av.esperarCorpo(true);   // o corpo padrão NÃO aparece enquanto o próprio carrega (o VRM já vem pré-carregado)
    carregarVrm(CORPO_DO_FUNDADOR.url).then((vrm) => {
      const vivo = this.vivo && (a === this.eu || this.remotos.get(a.id) === a);
      if (!vivo) return;
      tingirVrm(vrm, CORPO_DO_FUNDADOR.tintas); a.av.usarVrm(vrm);
    }).catch((e) => { console.warn("[cyber] corpo do founder (VRM) não carregou:", e); a.av.esperarCorpo(false); });
  }
  /** cria os personagens da cidadela (a Nina) — cada um com o corpo VRM dele e a agenda própria */
  /** a FROTA DE IAs: a config vem do servidor (o mesmo relógio pra todos); sem ela (offline), nada */
  private ligarFrota() {
    if (this.frota || !this.vivo) return;
    this.frota = criarFrotaIA({ cena: this.cena.scene, overlay: this.o.overlay, gltf: this.gltf, starTex: this.cena.starTex, low: this.o.low });
    this.recarregarFrota();
    // a config muda pelo painel admin: confere a cada minuto (só replaneja se a VERSÃO mudou)
    this.relogioFrota = setInterval(() => this.recarregarFrota(), 60_000);
  }
  private relogioFrota: ReturnType<typeof setInterval> | null = null;
  /** busca a config da frota no servidor e aplica se for nova (o painel admin chama logo depois de gravar) */
  recarregarFrota() {
    void fetch("/api/cyber/frota", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (!j?.config || !this.frota) return;
      const c = sanitizarConfig(j.config); if (c.versao === this.frota.contagem().versao) return;
      this.frota.configurar(c, typeof j.agora === "number" ? j.agora : Date.now());
    }).catch(() => undefined);
  }
  /** (modo admin) bots × usuários REAIS: no total e em cada área do mapa (lib/cyber/frota/areas). Os usuários são eu +
   *  quem a rede da sala me mostra */
  contagemAdmin(): { bots: number; usuarios: number; areas: Record<AreaId, { bots: number; usuarios: number }> } {
    const f = this.frota?.contagem(), areas = Object.fromEntries(AREAS.map((a) => [a.id, { bots: f?.porArea[a.id] ?? 0, usuarios: 0 }])) as Record<AreaId, { bots: number; usuarios: number }>;
    let usuarios = 1; areas[areaDe(this.eu.pos, this.jet.noAr || !!this.moto || this.pilotando)].usuarios++;
    for (const p of this.o.remotos?.current.values() ?? []) { usuarios++; areas[areaDe(p, !!(p.jet || p.voo))].usuarios++; }
    return { bots: f?.online ?? 0, usuarios, areas };
  }
  /** os CORPOS no meu nível (jogadores, personagens, IAs): o meu avatar não entra neles */
  private colisoresDeAtores() {
    const corpos: { x: number; z: number; y: number }[] = [];
    for (const a of this.remotos.values()) if (a.av.group.visible) corpos.push({ x: a.pos.x, z: a.pos.z, y: a.alt });
    for (const p of this.personagens) if (p.h.group.visible) corpos.push({ x: p.h.pos.x, z: p.h.pos.z, y: p.h.alt });
    if (this.frota) corpos.push(...this.frota.corpos());
    return colisoresDeCorpos(corpos, this.eu.alt);
  }
  private criarPersonagens() {
    if (!this.vivo || !this.cidade || !this.gltf || this.personagens.length) return;
    for (const p of PERSONAGENS_DA_CIDADELA) {
      const corpo = CORPOS_VRM[p.id]; if (!corpo) continue;
      const perfil = PERFIS_VIDA[p.id]; if (!perfil) continue;
      const h = criarPersonagemVivo({ ...p, corpo, perfil, starTex: this.cena.starTex, low: this.o.low, gltf: this.gltf, cena: this.cena.scene, preparar: (obj) => this.prepararVrm(obj) });
      const tag = document.createElement("div"); tag.style.cssText = TAG_CSS + "color:" + p.cor + ";"; tag.textContent = p.nome; this.o.overlay.appendChild(tag);
      this.personagens.push({ h, tag });
    }
  }
  /** prepara um corpo VRM ANTES de entrar na cena: os shaders compilam em paralelo (sem travar o quadro) e as texturas
   *  sobem uma por quadro (a de 2048² sozinha levava dezenas de ms) — senão tudo isso caía no 1º quadro em que ele aparece */
  private async prepararVrm(obj: THREE.Object3D) {
    esferaRapida(obj);
    try { await this.R.compileAsync(obj, this.cam, this.cena.scene); } catch { /* sem compilação paralela: compila ao aparecer */ }
    const texs = new Set<THREE.Texture>();
    obj.traverse((n) => { const ms = (n as THREE.Mesh).material; for (const m of Array.isArray(ms) ? ms : ms ? [ms] : []) { for (const v of Object.values(m)) if ((v as THREE.Texture)?.isTexture) texs.add(v as THREE.Texture);
      for (const u of Object.values((m as THREE.ShaderMaterial).uniforms ?? {})) if ((u?.value as THREE.Texture)?.isTexture) texs.add(u.value as THREE.Texture); } });   // (o MToon guarda nos uniforms)
    for (const t of texs) { if (!this.vivo) return; this.R.initTexture(t); await new Promise((r) => requestAnimationFrame(r)); }
    // a geometria também: entra na cena só pelo desenho de 1 pixel (os personagens longe ficam escondidos e só subiriam
    // na chegada)
    if (!this.vivo) return;
    this.cena.scene.add(obj); try { this.subirParaGpu(obj); } finally { obj.removeFromParent(); }
  }
  private atualizarPersonagens(dt: number, t: number) {
    if (!this.personagens.length) return;
    const ilhaY = this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY, agora = Date.now() / 1000, some = this.instancia;   // no tutorial (instância só da pessoa), ninguém mais aparece
    const eu = [{ x: this.eu.pos.x, z: this.eu.pos.z }, ...[...this.remotos.values()].map((a) => ({ x: a.pos.x, z: a.pos.z }))];   // desviam de quem está no caminho
    for (const p of this.personagens) { p.h.mostrar(!some); p.h.atualizar(dt, t, agora, ilhaY, this.cam.position, eu); }
  }
  private removerAtor(a: Ator) { a.vozH?.remover(); a.vozH = null; this.soltarSomNave(a); this.soltarSomJet(a); if (a.somAsas) { this.som.soltarLoop(a.somAsas); a.somAsas = null; } if (a.somFio) { this.som.soltarLoop(a.somFio); a.somFio = null; } a.nave?.dispose(); a.nave = null; a.espada?.dispose(); a.espada = null; a.av.dispose(); a.tag.remove(); this.falas = this.falas.filter((f) => { if (f.ator === a) { f.el.remove(); return false; } return true; }); }

  // ───────────── API pública (React → engine) ─────────────
  iniciar(go = "viajar") {
    if (!this.menu) return; this.menu = false; this.holdT = 0;
    this.o.els.menu && (this.o.els.menu.style.display = "none"); if (this.o.els.hold) this.o.els.hold.style.width = "0%";
    this.som.ativar();   // o whoosh de entrada sai em atualizarSom, quando o buffer chegar
    this.R.domElement.style.touchAction = "none";
    if (!(this.o.nascer && this.nascerNoTubo())) this.spawnNaNave();   // saiu da vista/menu: quem chega nasce no tubo; o dono, a bordo
    this.o.onSessao?.(go);
  }
  setJoystick(x: number, y: number) { this.joy.x = x; this.joy.y = y; this.joy.on = Math.hypot(x, y) > 0.15; }
  /** pausa a cena (ex.: celular em pé esperando girar) — não renderiza nem simula */
  pausar(on: boolean) { this.pausado = on; if (!on) this.clock.getDelta(); }
  alternarCorrer(): boolean { this.correr = !this.correr; return this.correr; }
  /** DASH (C / botão DASH): um arranque curto pra onde se está indo (parado: pra frente), no chão ou no ar de mochila —
   *  o começo é intocável (lib/cyber/movimento). Não vale de moto, pilotando, sentado, no tablet, no tubo ou no túnel */
  darDash(): boolean {
    if (this.menu || this.moto !== null || this.pilotando || this.descanso || this.tabletQuer || this.labAberto || this.nascendo || this.tunel || this.noTopo) return false;
    const agora = performance.now() * 0.001;   // (o relógio de VERDADE no aperto — o do último quadro pode estar atrasado; a esquiva é questão de ms)
    if (!podeDash(this.dash, agora)) return false;
    let ix = 0, iz = 0;
    if (this.keys.w || this.keys.arrowup) iz -= 1; if (this.keys.s || this.keys.arrowdown) iz += 1;
    if (this.keys.a || this.keys.arrowleft) ix -= 1; if (this.keys.d || this.keys.arrowright) ix += 1;
    if (this.joy.on) { ix += this.joy.x; iz += this.joy.y; }
    const d = moverRelativoCamera(ix, iz, this.camAz);
    this.dash = iniciarDash(agora, d ? { x: d.wx, z: d.wz } : null, this.eu.facing); this.dashUlt = null;
    this.alvo = null; this.alvoDepois = null; this.velTela = Math.max(this.velTela, 0.85);   // o "soco" no FOV e as linhas na hora
    this.som.tocar("dash", this.eu.av.group.position, { dist: DISTANCIA.eu, volume: 1, taxa: 0.95 + Math.random() * 0.12 });   // (o swoosh sintetizado — lib/cyber/somMovimento)
    return true;
  }
  /** (combate) está desviando agora? — o começo do dash */
  intocavel(): boolean { return this.intocavelEm(Math.max(this.agora, performance.now() * 0.001)); }
  /** estava intocável no instante `t`? (o golpe é conferido no instante em que a lâmina CORTOU, não no quadro em que se
   *  confere — com fps baixo são décimos de segundo de diferença) */
  private intocavelEm(t: number): boolean { return !!this.dash && t - this.dash.ini >= -0.03 && t - this.dash.ini < DASH.intocavel; }
  /** o INVENTÁRIO (lib/cyber/inventario): o que está nos espaços e o que está equipado — salvo no navegador por pessoa */
  inventario(): Inventario { return this.inv; }
  carregarInventario() {
    const fund = this.ehFundador(this.o.eu.id);   // (a espada e os golpes são só do personagem do dono)
    try { const raw = localStorage.getItem(chaveInventario(this.o.eu.id)); this.inv = itensPermitidos(raw ? sanitizarInventario(JSON.parse(raw)) : inventarioInicial(fund), fund); } catch { this.inv = inventarioInicial(fund); }
    this.aplicarArma();
  }
  equipar(id: IdItem | null): Inventario {
    this.inv = itensPermitidos(equiparNoInv(this.inv, id), this.ehFundador(this.o.eu.id));
    try { localStorage.setItem(chaveInventario(this.o.eu.id), JSON.stringify(this.inv)); } catch { /* sem armazenamento: vale só nesta sessão */ }
    this.aplicarArma(); return this.inv;
  }
  /** a arma equipada vai pra mão (a espada se cria uma vez); sem arma, a mão fica livre */
  private aplicarArma() {
    if (this.inv.equipado === "espada-espiritual") { if (!this.espada) { this.espada = criarEspadaEspiritual({ low: this.o.low }); this.espada.group.scale.setScalar(ESCALA_ESPADA); } this.eu?.av.empunhar(this.espada.group); }   // (uma MONTANTE enorme, ~3 m)
    else { this.eu?.av.empunhar(null); this.revela = 0; this.espada?.atualizar(this.agora, 0); }
  }
  /** ATACAR (X / clique com o mouse travado / botão ATACAR): o próximo golpe do COMBO (lib/cyber/combate); no meio de
   *  um golpe fica na fila e encadeia. Vira pra onde a câmera olha. Sem arma, de moto, pilotando, sentado ou caído: nada */
  atacar(): boolean {
    if (!this.inv.equipado || this.menu || this.moto !== null || this.pilotando || this.descanso || this.tabletQuer || this.labAberto || this.nascendo || this.tunel || this.agora < this.caidoAte) return false;
    if (this.ataque && !golpeAcabou(this.ataque, this.agora)) { this.filaAtaque = true; return true; }
    this.comecarGolpe(); return true;
  }
  private comecarGolpe() {
    const g = proximoGolpe(this.ataque, this.agora);
    this.ataque = { golpe: g, ini: this.agora, seq: ++this.seqAtaque }; this.filaAtaque = false; this.tAtacou = this.agora; this.acertados.clear();
    const f = moverRelativoCamera(0, -1, this.camAz); if (f && this.olharLivre) this.eu.facing = Math.atan2(f.wx, f.wz);   // (mouse travado: golpeia pra onde olha)
    this.alvo = null; this.alvoDepois = null;
    this.som.tocar("golpe", this.eu.av.group.position, { dist: DISTANCIA.eu, volume: 1, taxa: g.n === 3 ? 0.66 : g.n === 2 ? 0.78 : 0.83 + Math.random() * 0.05 });   // (grave: a lâmina pesada a duas mãos)
  }
  /** o MOVIMENTO TURBINADO agora, pros outros verem (a presença `mov`): 2 dash, 4 hero landing, 5 decolagem, 1 sprint,
   *  3 guarda — nessa prioridade; 0 = nada */
  private movAgora(t: number): number {
    if (this.dashAtivo) return 2;
    if (t - this.tHeroi < 1.1) return 4;
    if (this.decola || t - this.tDecolou < this.esperaDecolou + 0.45) return 5;
    if (this.wSprint > 0.5) return 1;
    if (pesoAlerta(t - this.tFimDash) > 0.3 || this.wGuardaArena > 0.5) return 3;
    return 0;
  }
  /** a vida e o estado do combate (o HUD do React lê) */
  combate() { return { vida: this.vida, max: VIDA_MAX, caido: this.agora < this.caidoAte, naArena: !!this.eu && !this.noCeu && naArena(this.eu.pos), arma: this.inv.equipado ? ITENS[this.inv.equipado].nome : null }; }
  /** o COMBATE a cada quadro: o golpe (avança, corta os bonecos na janela, encadeia a fila), o empurrão, o sparring,
   *  caído → renasce, e a espada (materializa na arena, golpeando e na guarda; se desfaz fora de combate) */
  private passoCombate(eu: Ator, t: number, dt: number, andando: boolean) {
    this.conferirGolpesChegando(t);
    const a = this.ataque, arma = this.inv.equipado;
    if (a && t < this.pausaAte) a.ini += Math.min(dt, this.pausaAte - (t - dt));   // HIT-STOP: o golpe fica parado no tempo enquanto dura
    if (a && arma) {
      const u = t - a.ini, g = a.golpe;
      if (u < g.ativoFim) { const k = g.avanco / g.ativoFim; eu.pos.x += Math.sin(eu.facing) * k * dt; eu.pos.z += Math.cos(eu.facing) * k * dt; }   // o corpo AVANÇA no golpe
      if (cortouEntre(a, this.tAnt || t, t) && this.arena) for (const b of this.arena.bonecos) {
        if (!b.vivo || this.acertados.has(b.id) || !acerta({ x: eu.pos.x, z: eu.pos.z, rumo: eu.facing }, b, arma, g)) continue;
        // o HIT-STOP: no 1º acerto do golpe a ação congela um instante (e a linha do tempo do golpe espera junto)
        if (!this.acertados.size) { this.pausaAte = t + HIT_STOP[g.n]; this.raiosExtra += g.n === 3 ? 10 : 6; }   // (hit-stop + a rajada de raios no acerto)
        this.acertados.add(b.id); const dano = danoDoGolpe(arma, g);
        this.arena.acertar(b.id, dano, eu.pos, t); this.numero(String(dano), b.pos.clone().setY(2.6), g.n === 3 ? "#ffd36b" : "#ffffff");
        this.som.tocar("acerto", b.pos, { dist: DISTANCIA.eu, volume: g.n === 3 ? 1 : 0.8, taxa: g.n === 3 ? 0.8 : 1 }); this.tremor = Math.max(this.tremor, g.n === 3 ? 0.22 : 0.1);
      }
      // o PESADO esmaga o CHÃO no fim do corte: onda de choque na frente, tranco e estrondo (pegando ou não)
      if (g.n === 3 && this.esmagou !== a.seq && t - a.ini >= g.ativoFim) {
        this.esmagou = a.seq;
        const pt = eu.av.group.position.clone(); pt.x += Math.sin(eu.facing) * 3.1; pt.z += Math.cos(eu.facing) * 3.1;   // (onde a ponta da montante bate)
        this.fxMov?.onda(pt, 0.85); this.tremor = Math.max(this.tremor, 0.3);
        this.som.tocar("impacto-heroi", pt, { dist: DISTANCIA.eu, volume: 0.85, taxa: 0.9 });
      }
      if (golpeAcabou(a, t)) { if (this.filaAtaque) this.comecarGolpe(); }
    }
    // o empurrão (de quem bateu) desliza e para
    if (Math.abs(this.empurrao.x) + Math.abs(this.empurrao.z) > 0.01) { eu.pos.x += this.empurrao.x * dt; eu.pos.z += this.empurrao.z * dt; const k = Math.exp(-dt * 6); this.empurrao.x *= k; this.empurrao.z *= k; }
    // o SPARRING (boneco que ataca): o golpe pega se eu estiver na frente dele, no alcance — e não no dash
    const naAr = !this.noCeu && naArena(eu.pos) && !this.jet.noAr;
    if (this.arena) {
      const r = this.arena.atualizar(dt, t, naAr && t >= this.caidoAte ? eu.pos : null);
      if (r.golpe && naAr) {
        const dx = eu.pos.x - r.golpe.x, dz = eu.pos.z - r.golpe.z, d = Math.hypot(dx, dz);
        let dif = Math.atan2(dx, dz) - r.golpe.rumo; while (dif > Math.PI) dif -= 2 * Math.PI; while (dif < -Math.PI) dif += 2 * Math.PI;
        if (d < SPARRING.alcance + 0.45 && Math.abs(dif) < 1.1) this.levar({ dano: SPARRING.dano, de: r.golpe, empurra: SPARRING.empurra });
      }
    }
    // caído: renasce na borda da arena com a vida cheia (e protegido um tempo)
    if (this.caidoAte > -Infinity && t >= this.caidoAte) {
      const p = pontoDeRenascer(null); eu.pos.set(p.x, 0, p.z); eu.facing = p.rumo; this.vida = VIDA_MAX; this.caidoAte = -Infinity; this.protegidoAte = t + PROTECAO_RENASCER; this.empurrao = { x: 0, z: 0 };
    }
    // a GUARDA de combate na arena: parado, com a arma, o corpo fica em guarda (a mesma pose de depois do dash)
    this.wGuardaArena += ((naAr && arma && !andando && !this.ataque ? 1 : 0) - this.wGuardaArena) * Math.min(1, dt * 5);
    // a ESPADA: materializa na arena, golpeando e em guarda; se desfaz uns segundos depois de sair do combate
    if (this.espada) {
      const quer = !!arma && (naAr || t - this.tAtacou < 3 || pesoAlerta(t - this.tFimDash) > 0.05);
      this.revela += ((quer ? 1 : 0) - this.revela > 0 ? Math.min(1 - this.revela, dt / 0.35) : -Math.min(this.revela, dt / 0.5));
      this.espada.atualizar(t, this.revela);
    }
    if (this.ataque && golpeAcabou(this.ataque, t) && t - this.ataque.ini > this.ataque.golpe.dur + 1.2) this.ataque = null;   // (o combo esquece)
    // o RASTRO da lâmina (do cabo à ponta) enquanto corta (um tico antes e depois da janela)
    if (this.espada && this.fxMov) {
      const at = this.ataque, ativo = !!at && this.revela > 0.5 && t - at.ini >= at.golpe.ativoIni - 0.04 && t - at.ini <= at.golpe.ativoFim + 0.03;
      this.espada.group.updateWorldMatrix(true, false);
      this.fxMov.rastroLamina(this.espada.group.localToWorld(this.vRastroB.set(0, 1.0, 0)), this.espada.group.localToWorld(this.vRastroP.set(0, 1.3, 0)), ativo, dt);   // (só o terço de fora da lâmina: com a montante enorme, mais seria uma parede)
      // os RAIOS ROXOS saindo da lâmina enquanto o golpe dura (mais no corte; rajada no acerto; o pesado desce no chão)
      const golpeando = !!at && !golpeAcabou(at, t) && this.revela > 0.5, u = at ? t - at.ini : 0;
      const quantos = !golpeando ? 0 : ativo ? 3 : u > at!.golpe.ativoIni * 0.4 ? 1 : 0;
      const chao = golpeando && at!.golpe.n === 3 && u >= at!.golpe.ativoFim - 0.02 && u <= at!.golpe.ativoFim + 0.12 ? this.vRastroP.clone().setY(this.eu.av.group.position.y) : undefined;
      this.fxMov.raios(this.espada.group.localToWorld(this.vRastroB.set(0, 0.2, 0)), this.espada.group.localToWorld(this.vRastroP.set(0, 1.28, 0)), quantos + this.raiosExtra, dt, chao);
      this.raiosExtra = 0;
    }
  }
  /** o HUD do combate: a barra de vida (na arena ou ferido) e os números que sobem */
  private atualizarHudCombate() {
    const t = this.agora;
    for (let i = this.numeros.length - 1; i >= 0; i--) {
      const n = this.numeros[i]!, u = (t - n.t0) / 0.9;
      if (u >= 1) { n.el.remove(); this.numeros.splice(i, 1); continue; }
      const s = this.proj(this.vHud.set(n.p.x, n.p.y + u * 1.2, n.p.z));
      n.el.style.display = s.vis ? "block" : "none"; n.el.style.left = s.x + "px"; n.el.style.top = s.y + "px"; n.el.style.opacity = String(1 - u * u);
    }
    const c = this.combate(), mostrar = !this.menu && (c.naArena || c.vida < c.max);
    if (!this.hudCombate && mostrar) {
      const el = document.createElement("div");
      el.style.cssText = "position:absolute;left:50%;bottom:22px;transform:translateX(-50%);width:min(360px,70vw);pointer-events:none;z-index:7;font:800 11px system-ui,sans-serif;color:#d9fff6;letter-spacing:.12em;text-align:center;";
      el.innerHTML = '<div data-r="rot" style="margin-bottom:5px;text-shadow:0 0 8px #000"></div><div style="height:10px;border-radius:999px;background:rgba(5,14,12,.75);border:1px solid rgba(125,255,226,.35);overflow:hidden"><div data-r="barra" style="height:100%;width:100%;background:linear-gradient(90deg,#1fd6a8,#7dffe2);transition:width .15s"></div></div>';
      this.o.overlay.appendChild(el); this.hudCombate = el;
    }
    if (this.hudCombate) {
      this.hudCombate.style.display = mostrar ? "block" : "none";
      if (mostrar) {
        const barra = this.hudCombate.querySelector('[data-r="barra"]') as HTMLDivElement, rot = this.hudCombate.querySelector('[data-r="rot"]') as HTMLDivElement;
        const f = c.vida / c.max; barra.style.width = `${Math.round(f * 100)}%`; barra.style.background = f > 0.5 ? "linear-gradient(90deg,#1fd6a8,#7dffe2)" : f > 0.25 ? "linear-gradient(90deg,#d9932c,#ffd36b)" : "linear-gradient(90deg,#c21f35,#ff5a6a)";
        rot.textContent = c.caido ? "CAÍDO — RENASCENDO…" : `${c.naArena ? "ARENA PvP · " : ""}VIDA ${c.vida}/${c.max}${c.arma ? ` · ${c.arma.toUpperCase()}` : ""}`;
      }
    }
  }
  /** ARENA PvP — um jogador remoto: o GOLPE novo (a presença trouxe outro `atk`) anima nele e, se nós dois estamos na
   *  arena, entra na fila pra conferir se me pega; a espada dele aparece/some com `arma`; a vida dele vai no rótulo */
  private combateRemoto(a: Ator, p: { atk?: number; hp?: number; arma?: number; mov?: number }, t: number) {
    a.hp = p.hp ?? VIDA_MAX;
    // o MOVIMENTO TURBINADO dele: o estado que chegou (e desde quando) e os pesos suavizados (a pose sem tranco)
    const mov = p.mov ?? 0; if (mov !== a.mov) { a.mov = mov; a.tMov = t; }
    const k = Math.min(1, (1 / 30) * 8);
    a.wSpR = (a.wSpR ?? 0) + ((mov === 1 ? 1 : 0) - (a.wSpR ?? 0)) * k;
    a.wDaR = (a.wDaR ?? 0) + ((mov === 2 ? 1 : 0) - (a.wDaR ?? 0)) * Math.min(1, k * 2);
    a.wAlR = (a.wAlR ?? 0) + ((mov === 3 ? 1 : 0) - (a.wAlR ?? 0)) * k;
    if (p.atk && p.atk !== a.atkUlt) {
      const novo = a.atkUlt !== undefined, { n } = decodificarGolpe(p.atk); a.atkUlt = p.atk;
      if (novo && n >= 1 && n <= 3) {
        const g = COMBO[n - 1]!; a.golpe = { g, ini: t };
        this.som.tocar("golpe", a.av.group.position, { dist: DISTANCIA.perto, volume: 0.8, taxa: n === 3 ? 0.82 : 1 });
        if (!this.noCeu && naArena(this.eu.pos) && !a.ceu && naArena(a.pos)) this.golpesChegando.push({ de: a, g, quando: t + (g.ativoIni + g.ativoFim) / 2, x: a.pos.x, z: a.pos.z, rumo: a.facing });
      }
    } else if (!p.atk) a.atkUlt = 0;
    if (a.golpe && t - a.golpe.ini > a.golpe.g.dur) a.golpe = null;
    // a espada dele: materializa/desfaz junto com a dele
    const quer = p.arma === 1;
    if (quer && !a.espada) { a.espada = criarEspadaEspiritual({ low: true }); a.espada.group.scale.setScalar(ESCALA_ESPADA); a.av.empunhar(a.espada.group); a.revela = 0; }
    if (a.espada) { a.revela = Math.max(0, Math.min(1, (a.revela ?? 0) + (quer ? 1 : -1) * (1 / 30) / (quer ? 0.35 : 0.5))); a.espada.atualizar(t, a.revela); }
  }
  /** confere os golpes dos outros que chegaram na hora do corte (a posição dele naquele instante) */
  private conferirGolpesChegando(t: number) {
    for (let i = this.golpesChegando.length - 1; i >= 0; i--) {
      const h = this.golpesChegando[i]!; if (t < h.quando) continue;
      this.golpesChegando.splice(i, 1);
      const de = { x: h.de.pos.x, z: h.de.pos.z, rumo: h.de.facing };   // (onde ele está agora — o golpe avança junto)
      if (!this.noCeu && naArena(this.eu.pos) && acerta(de, this.eu.pos, "espada-espiritual", h.g)) this.levar({ dano: danoDoGolpe("espada-espiritual", h.g), de, empurra: h.g.empurra, em: h.quando });
    }
  }
  /** um NÚMERO (dano, "DESVIOU!") que sobe e some em cima de `p` */
  private numero(texto: string, p: THREE.Vector3, cor: string) {
    const el = document.createElement("div"); el.textContent = texto;
    el.style.cssText = `position:absolute;pointer-events:none;font:900 ${texto.length > 4 ? 15 : 20}px system-ui,sans-serif;color:${cor};text-shadow:0 0 10px ${cor},0 2px 3px #000;transform:translate(-50%,-50%);white-space:nowrap;z-index:6;`;
    this.o.overlay.appendChild(el); this.numeros.push({ el, p: p.clone(), t0: this.agora });
  }
  /** levei um golpe (do sparring ou de alguém): desviando no dash não pega; senão perde vida, é empurrado, a tela pisca */
  private levar(o: { dano: number; de: { x: number; z: number }; empurra: number; em?: number }) {
    if (this.agora < this.caidoAte) return;
    const desviando = o.em !== undefined ? this.intocavelEm(o.em) : this.intocavel(), protegido = this.agora < this.protegidoAte, cab = this.eu.av.group.position.clone().setY(this.eu.av.group.position.y + 2.2);
    if (desviando || protegido) { if (desviando) { this.numero("DESVIOU!", cab, "#7dffe2"); this.som.tocar("alerta", this.eu.av.group.position, { dist: DISTANCIA.eu, volume: 0.6, taxa: 1.15 }); } return; }
    this.vida = Math.max(0, this.vida - o.dano);
    const dx = this.eu.pos.x - o.de.x, dz = this.eu.pos.z - o.de.z, d = Math.hypot(dx, dz) || 1;
    this.empurrao = { x: (dx / d) * o.empurra, z: (dz / d) * o.empurra };
    this.numero(`-${o.dano}`, cab, "#ff5a6a"); this.tremor = Math.max(this.tremor, 0.18);
    this.som.tocar("acerto", this.eu.av.group.position, { dist: DISTANCIA.eu, volume: 1, taxa: 0.85 });
    if (this.hudCombate) { this.hudCombate.dataset.dano = String(this.agora); }
    if (this.vida <= 0) { this.caidoAte = this.agora + CAIDO; this.ataque = null; this.som.tocar("impacto-heroi", this.eu.av.group.position, { dist: DISTANCIA.eu, volume: 0.7, taxa: 1.3 }); }
  }
  /** ESPAÇO / botão VOAR (segurar): decola e sobe; soltar cai planando até pousar */
  /** ESPAÇO / VOAR: no chão, a DECOLAGEM com impulso — agacha um instante (parado mais; andando/correndo quase nada, o
   *  embalo segue) e só então lança (`decolarJa`), com um empuxo forte pra cima e a velocidade que tinha no chão */
  comandoJet(on: boolean) {
    this.jet.tecla = on;
    if (!on || this.jet.noAr || this.decola || this.menu || this.pilotando || this.moto !== null || this.noTopo || this.viagem || this.nascendo || this.tunel) return;
    if (this.sobreNave || this.bordo) { this.decolarJa(); return; }   // (de cima da nave / a bordo: o caminho de sempre)
    const v = this.velPlano > 1.5 ? Math.min(this.velPlano, 18) : 0;
    this.decola = { t0: this.agora, espera: v > 0 ? DECOLAGEM.esperaAndando : DECOLAGEM.esperaParado, momento: { x: Math.sin(this.eu.facing) * v, z: Math.cos(this.eu.facing) * v } };
    this.tDecolou = this.agora; this.esperaDecolou = this.decola.espera;
  }
  /** passou o agachamento: decola de verdade (as regras de onde dá pra decolar), com o IMPULSO e o embalo */
  private lancarDecolagem() {
    const d = this.decola; if (!d || this.agora - d.t0 < d.espera) return;
    this.decola = null;
    const tecla = this.jet.tecla; this.decolarJa();
    if (!this.jet.noAr) return;
    this.jet.tecla = tecla; this.jet.vy = DECOLAGEM.impulso; this.jetV = { ...d.momento }; this.altMaxVoo = this.jet.y;
    this.fxMov?.onda(this.eu.av.group.position, 0.3);   // a poeira do impulso (sem tranco)
    this.som.tocar("decola", this.eu.av.group.position, { dist: DISTANCIA.eu, volume: 1, taxa: 0.95 + Math.random() * 0.1 });
  }
  private decolarJa() {
    if (this.jet.noAr || this.menu || this.pilotando || this.moto !== null || this.noTopo || this.viagem || this.nascendo || this.tunel) return;
    if (this.bordo) {   // a bordo: da CABINE (redoma aberta) sai-se voando por cima; da RAMPA, lá fora, pula-se; dentro de casa não
      const pelaRedoma = redomaAberta(this.bordo, this.pilotando);
      if (!pelaRedoma && !naRampaLaFora(this.bordo)) return;
      this.eu.alt = (this.poseNave() ? alturaDoConves(this.poseNave()!) : this.eu.alt) + alturaNoBordo(this.bordo, this.quedaRampa());
      this.bordo = null; this.saindoPelaRedoma = pelaRedoma;
    }
    if (this.sobreNave) { this.sobreNave = false; this.jet = { tecla: true, noAr: true, y: this.eu.alt, vy: 0 }; this.sitT = 0; this.alvo = null; this.alvoDepois = null; this.som.tocar("decola", this.eu.av.group.position, { dist: DISTANCIA.eu }); return; }
    // decola da praça, do piso do salão da Recepção ou da Zaeon (céu) — da escada não. Do salão da Recepção (que fica
    // no piso da Zaeon) o voo é o da Zaeon
    if (this.altoEm && !this.noCeu) { const z = this.lms.find((l) => l.poi.id === this.altoEm) ?? this.zaeon(), mn = z ? marcoNav(z.poi) : null; if (!mn || this.yNav < mn.nav.pisoY - 0.01) return; this.altoEm = z && z.poi.base !== undefined ? "ceu" : null; this.yNav = this.altoEm ? CIDADE.pisoY : 0; }
    if (this.plat && !decolaDaPlataforma(this.plat.id, this.plat.andar, this.eu.pos)) return;   // dentro de casa (Solana House) não
    this.jet = { tecla: true, noAr: true, y: this.eu.alt, vy: 0 }; this.sitT = 0; this.alvo = null; this.alvoDepois = null; this.jetV = { x: 0, z: 0 }; this.ilhota = null; this.plat = null; this.bordo = null;
  }
  /** um marco andável apoiado na PRAÇA pra quem voa (marco + alto das muralhas, com a flutuação) — hoje nenhum: a
   *  Recepção fica no piso da Zaeon (o voo de lá é o da Zaeon, com o pouso no salão em `passoNoAr`) */
  private qgNoAr(): QGNoAr | null { const z = this.zaeon(), mn = z && naPracaPOI(z.poi) ? marcoNav(z.poi) : null; return z && mn ? { ...mn, topoMuralhas: this.pilaresZaeon(z)[0]!.topo } : null; }
  /** a RECEPÇÃO (o marco andável no piso da Zaeon) */
  private recepcao(): { lm: LandmarkHandle; mn: MarcoNav } | null { const z = this.zaeon(), mn = z && z.poi.base !== undefined ? marcoNav(z.poi) : null; return z && mn ? { lm: z, mn } : null; }
  /** TODOS os marcos andáveis no piso da Zaeon: a Recepção e os 3 Mirantes da Terra (as pirâmides das quinas) */
  private marcosDaZaeon(): { lm: LandmarkHandle; mn: MarcoNav }[] { return this.marcosNav().filter(({ lm }) => lm.poi.base !== undefined); }
  /** a altura (mundo) do piso do salão de um marco da Zaeon, com a flutuação */
  private pisoDoMarco(m: { lm: LandmarkHandle; mn: MarcoNav }) { return (m.lm.poi.base ?? 0) + m.mn.nav.pisoY + this.boia(m.lm); }
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
      // teto e paredes baixas contados do PISO de onde se voa (no lounge, 88 m acima da central: antes caía de lá)
      const pisoAqui = base + pisoDeVoo(eu.pos, yAnt - base);
      const v = passoVertical(this.jet.y, this.jet.vy, this.jet.tecla, dt, pisoAqui + tetoDoJet(null), this.impulsoFrente);
      const baixo = v.y - pisoAqui < JET.alturaBases ? this.colisoresDoNivel("ceu") : [], naves = v.y < topo - 0.2 ? this.colisoresDeNaves(CIDADE.pisoY) : [];
      let q = empurrarParaFora(resolverCidadeLivre(eu.pos), [...baixo, ...naves]);
      // a CABINE DO DJ é do dono: pra todo o resto a torre é um campo de força (não se pousa lá em cima de mochila)
      if (!this.ehFundador(this.o.eu.id) && v.y < base + ALTURA_LOUNGE + TORRE_DJ.topo + CAMPO_DJ && naTorreDJ(q, 0.6)) q = foraDaTorreDJ(q);
      // a RECEPÇÃO e os MIRANTES: pousa no salão (vindo de cima); por baixo do salão a ilha da pirâmide é sólida
      for (const rc of this.marcosDaZaeon()) {
        const pisoM = this.pisoDoMarco(rc), dx = q.x - rc.mn.x, dz = q.z - rc.mn.z, d = Math.hypot(dx, dz);
        if (d <= rc.mn.nav.bordaR - 0.3 && yAnt >= pisoM - 0.05 && v.y <= pisoM && v.vy <= 0) {
          eu.pos.x = q.x; eu.pos.z = q.z; this.jet.y = pisoM; this.jet.noAr = false; this.altoEm = rc.lm.poi.id; this.yNav = rc.mn.nav.pisoY; this.somPouso(v.vy); return;
        }
        if (v.y < pisoM - 0.3 && d < rc.mn.nav.chaoR && v.y > base - 1) { const k = d > 1e-4 ? rc.mn.nav.chaoR / d : 1; q = { x: rc.mn.x + (d > 1e-4 ? dx * k : rc.mn.nav.chaoR), z: rc.mn.z + (d > 1e-4 ? dz * k : 0) }; }
      }
      eu.pos.x = q.x; eu.pos.z = q.z; this.jet.y = v.y; this.jet.vy = v.vy;
      const piso = pisoNoAr(q, v.y - base);   // a escada e o lounge só são piso pra quem vem de CIMA deles
      if (piso === null) { this.altoEm = null; return; }   // voou pra fora da Zaeon: céu livre (cai)
      if (sobreODorso && yAnt >= topo - 0.05 && v.y <= topo && v.vy <= 0) { this.jet.noAr = false; this.sobreNave = true; this.somPouso(v.vy); return; }
      const chao = base + piso;
      if (v.y <= chao && v.vy <= 0) { this.jet.y = chao; this.jet.noAr = false; this.yNav = CIDADE.pisoY; this.somPouso(v.vy); }
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
    const teto = this.saindoPelaRedoma || pertoDaNave ? Math.max(teto0, (pnPerto ? pnPerto.y + 2.2 * ESCALA_NAVE_V : this.topoNave()) + 12) : teto0;   // perto da nave (ou saindo pela redoma): dá pra subir acima do dorso — e voltar pra ela
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
    if (v.y < QUEDA_VAZIO) { this.renascer(); return; }   // caiu no VAZIO (não há chão): renasce na praça
    if (pnPerto && v.vy <= 0) {   // de mochila na nave: pelo vão da REDOMA (aberta) cai-se na cabine; na RAMPA, pousa-se nela
      const base = alturaDoConves(pnPerto), b = pousoNaNave(paraLocal(pnPerto, q), yAnt - base, v.y - base, this.redomaChamando(), rampaDaNave(pnPerto).queda);
      if (b) { this.bordo = b; this.jet.noAr = false; this.saindoPelaRedoma = false; this.jetV = { x: 0, z: 0 }; const w = paraMundo(pnPerto, b); eu.pos.x = w.x; eu.pos.z = w.z; this.somPouso(v.vy); return; }
    }
    if (sobreODorso && yAnt >= topo - 0.05 && v.y <= topo && v.vy <= 0) { this.jet.noAr = false; this.sobreNave = true; this.somPouso(v.vy); return; }
    // o chão embaixo: o piso da PRAÇA (a ilha) — fora dela é o vazio (continua caindo)
    const chao = naPraca(q) ? PRACA.y : -Infinity, chaoVisto = chao > 0 && z ? chao + this.boia(z) : chao;
    if (v.y <= chaoVisto && v.vy <= 0) {
      this.jet.noAr = false; this.somPouso(v.vy);
      if (chao > 0.01 && z) { this.altoEm = z.poi.id; this.yNav = chao; } else { this.altoEm = null; this.yNav = 0; }
    }
  }
  /** Balão de fala sobre a pessoa (chat da sala). */
  falar(userId: string, texto: string) {
    const a = userId === this.o.eu.id ? this.eu : this.remotos.get(userId); if (!a) return;
    if (userId === this.o.eu.id) this.frota?.ouvir(texto, { x: this.eu.pos.x, z: this.eu.pos.z, y: this.eu.alt });   // puxou assunto perto de uma IA
    if (userId !== this.o.eu.id) this.som.tocar("chat-pop");
    this.falas = this.falas.filter((f) => { if (f.ator === a) { f.el.remove(); return false; } return true; });
    const el = document.createElement("div"); el.style.cssText = FALA_CSS + "border-color:" + a.color + ";"; el.textContent = texto.slice(0, 140);
    this.o.overlay.appendChild(el); this.falas.push({ el, ator: a, ate: performance.now() + 4200 });
  }
  get minhaBase(): LayoutBase | undefined { return this.layouts.get(this.o.eu.id); }
  /** altura do piso de um nível de base: chão, Zaeon (ilha no céu, flutuando) ou salão do QG (flutuando) */
  private yDoNivel(n?: NivelBase): number {
    if (n === "ceu") return this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY;
    if (n === "qg") { const z = this.zaeon(), mn = z ? marcoNav(z.poi) : null; return mn && z ? (z.poi.base ?? 0) + mn.nav.pisoY + this.boia(z) : 0; }
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

  // ───────────── Cidade Zaeon (céu), a REDE DE BURACOS NEGROS e a nave ─────────────
  get noCeu() { return this.altoEm === "ceu"; }
  /** em pé na Zaeon: no piso dela ou no salão/escada da Recepção (que fica no piso dela) */
  private get naZaeon() { return this.noCeu || (!!this.altoEm && this.marcosDaZaeon().some((m) => m.lm.poi.id === this.altoEm)); }
  /** teleporte (corte seco — o React faz o túnel/fade): aparece no ponto `p` (mundo) do nó `id`, a pé, sem nada */
  private irParaNo(id: IdNo, p: { x: number; z: number; rumo: number } = NOS[id].chegada) {
    this.viagem = null; this.tunel = null;
    this.pilotando = false; this.noTopo = false; this.alvo = null; this.alvoDepois = null; this.sitT = 0; this.falandoCom = null;
    this.jet.noAr = false; this.jetV = { x: 0, z: 0 }; this.sobreNave = false; this.ilhota = null; this.bordo = null; this.motoAlvo = null;
    this.plat = id === "zaeon" || id === "praca" ? null : { id, andar: 0 };
    this.altoEm = id === "zaeon" ? "ceu" : null; this.yNav = id === "zaeon" ? CIDADE.pisoY : 0;
    this.eu.pos.set(p.x, 0, p.z); this.eu.facing = p.rumo; this.camAz = p.rumo + Math.PI;
    const y = id === "zaeon" ? (this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY) : NOS[id].y;
    this.eu.alt = y; this.camT.set(p.x, y + 1.2, p.z); this.portalArmado = !noDoAnel(p, y);
    this.som.tocar("rise", new THREE.Vector3(p.x, y + 1, p.z), { dist: DISTANCIA.perto });
  }
  /** o TÚNEL: o React escolheu o destino (`null` = desistiu: fica onde está, fora do túnel) */
  viajarPeloTunel(destino: IdNo | null) {
    if (!this.tunel) return;
    if (!destino || destino === this.tunel.origem || !NOS[destino]) { this.tunel = null; return; }
    if (destino === "zaeon" && !this.cidade) { this.tunel = null; return; }
    this.irParaNo(destino);
    if (this.guia) this.guia.portal = true;   // cruzou um portal (o tutorial pedia isso)
    this.sairDaInstancia();   // e daqui em diante o mundo é COMPARTILHADO (as pessoas reais)
  }
  /** a INSTÂNCIA do tutorial: do nascimento no tubo até cruzar o 1º portal, a Zaeon é SÓ do novato — ele não vê
   *  ninguém e ninguém vê ele (não envia a posição; quem nunca mandou posição não aparece nem na base dele). Daí em
   *  diante, o mundo com as pessoas reais */
  private instancia = false;
  private static readonly NINGUEM = new Map<string, Presenca>();
  private sairDaInstancia() { if (!this.instancia) return; this.instancia = false; this.o.onInstancia?.(false); }
  // ───────────── NASCIMENTO no tubo + o TOUR da anfitriã + os AGENTES (lib/cyber/onboarding, lib/cyber/agentes) ─────────────
  /** saindo do tubo depois de nascer (o vidro dele não empurra até sair) */
  private saindoDoTubo: number | null = null;
  /** nasce no TUBO DE ENSAIO do berçário (ao lado da Recepção): parado até o vidro abrir; a anfitriã vem buscar */
  private nascerNoTubo(): boolean {
    if (!this.cidade || !this.bercario || this.menu) return false;
    const i = tuboDe(this.o.eu.id), tb = TUBOS[i]!;
    this.irParaNo("zaeon", { x: tb.x, z: tb.z, rumo: tb.rumo }); this.portalArmado = true;
    this.nascendo = { t: 0, tubo: i }; this.bercario.nascer(i);
    this.instancia = true; this.o.onInstancia?.(true);
    this.camPitch = 0.12; this.camDist = 4.6;   // a câmera PERTO (dentro da ilha, por baixo da tampa do tubo): o Droid nasce de frente pra nós
    this.guia = this.novoGuia(0); this.emitirGuia();
    return true;
  }
  /** o corpo do DROID (escondido até o tutorial começar: aparece num mini portal) */
  private criarDroid() {
    const h = criarDroid({ low: this.o.low }); this.cena.scene.add(h.group);
    const tag = document.createElement("div"); tag.style.cssText = TAG_CSS + "color:" + DROID.cor + ";display:none;"; tag.textContent = `${DROID.nome} ✦`; this.o.overlay.appendChild(tag);
    const pos = new THREE.Vector3(); this.droid = { h, pos, alt: 0, tag, fala: { pos, alt: 0 } };
  }
  /** a mesa da Recepção (o lar do Droid): lá, F chama ele de novo */
  private casaDoAgente(): { x: number; z: number; y: number; rumo: number } {
    const lay = baseNoQG(); if (!lay) { const d = DROID.lar; return { x: d.x, z: d.z, y: CIDADE.pisoY, rumo: 0 }; }
    const s = localParaMundo(lay, 0, -0.15); return { ...s, y: this.yDoNivel("qg"), rumo: lay.rot + Math.PI };
  }
  /** a CÁPSULA de nascimento só existe no TUTORIAL do novato (nascer → até o 1º portal), e só a DELE (o anel de
   *  cápsulas na muralha não aparece): no jogo normal ninguém nasce numa cápsula, então ela nem aparece (nem colide) */
  private tubosVisiveis() { return this.instancia || !!this.nascendo || this.saindoDoTubo !== null; }
  private colisoresDosTubos(): Colisor[] {
    if (!this.bercario || !this.tubosVisiveis()) return [];
    const p = this.eu.pos, out: Colisor[] = [];
    const i = tuboDe(this.o.eu.id), tb = TUBOS[i]!;   // só a cápsula dele (sólida, menos enquanto nasce/sai dela)
    if (i !== this.saindoDoTubo && i !== this.nascendo?.tubo && Math.abs(tb.x - p.x) < 6 && Math.abs(tb.z - p.z) < 6) out.push({ x: tb.x, z: tb.z, r: 1.4 });
    return out;
  }
  private novoGuia(passo: number) { return { passo, fala: 0, falaT: 0, ativo: false, andou: 0, motoAndou: 0, portal: false, pisoY: this.eu.alt, prev: { x: this.eu.pos.x, z: this.eu.pos.z } }; }
  private emitirGuia() {
    if (!this.guia) { this.o.onGuia?.(null); return; }
    const p = ROTEIRO[this.guia.passo]!;
    this.o.onGuia?.({ passo: this.guia.passo, total: ROTEIRO.length, id: p.id, titulo: p.titulo, agente: DROID.nome, cor: DROID.cor });
  }
  private encerrarGuia() { this.guia = null; this.emitirGuia(); this.sairDaInstancia(); }
  /** o tutorial: "Próximo" (pula o passo — dev), "Pular" (o Droid se despede no portal) e "Refazer" (chamado na Recepção) */
  guiaProximo() { if (!this.guia || this.nascendo) return; this.irProPasso(this.guia.passo + 1); }
  guiaPular() { if (this.guia) { this.encerrarGuia(); this.droid?.h.sumir(); this.fecharConversa(); } this.sairDaInstancia(); }
  guiaRefazer() { if (!this.cidade || this.menu) return; this.guia = this.novoGuia(1); this.emitirGuia(); }
  private irProPasso(n: number) {
    if (this.conversa?.etapa === "feita") this.conversa = null;
    if (n >= ROTEIRO.length) { this.encerrarGuia(); this.droid?.h.sumir(); return; }
    this.guia = this.novoGuia(n); this.emitirGuia();
    if (ROTEIRO[n]!.id === "capela") this.preaquecerVozZaeon();   // o Droid vai levar a pessoa até ela: as falas fixas já vão sendo geradas
    this.som.tocar("near-ping", this.eu.av.group.position, { dist: DISTANCIA.perto });
  }
  /** um balão de fala sobre quem fala (uma pessoa ou o Droid); `ms` = quanto fica (Infinity = até a próxima fala) */
  private balao(a: { pos: THREE.Vector3; alt: number }, texto: string, cor: string, ms = 4200) {
    this.falas = this.falas.filter((f) => { if (f.ator === a) { f.el.remove(); return false; } return true; });
    const el = document.createElement("div"); el.style.cssText = FALA_CSS + "border-color:" + cor + ";"; el.textContent = texto.slice(0, 160);
    this.o.overlay.appendChild(el); this.falas.push({ el, ator: a, ate: performance.now() + ms });
  }
  /** o Droid FALA: balão em cima dele + a fala no chat (só local) */
  /** o DROID COMPANHEIRO (habilidade do G): fora do tutorial, ele sai do portal e passa a seguir a pessoa; G de novo, volta */
  private companheiro = false;
  private usoHabilidade = new Map<IdHabilidade, number>();
  /** usa uma habilidade (lib/cyber/habilidades) — recarga e efeito */
  usarHabilidade(id: IdHabilidade): boolean {
    const agora = performance.now() / 1000, h = HABILIDADES.find((x) => x.id === id);
    if (!h || !prontaPraUsar(h, this.usoHabilidade.get(id), agora)) return false;
    if (id === "droid-companheiro") {
      if (!this.droid) return false;
      if (this.guia || this.expulsando || this.conversa) { this.o.onAviso?.("O Droid está ocupado te guiando agora."); return false; }
      this.companheiro = !this.companheiro;
      this.usoHabilidade.set(id, agora);
      // a fala: chegando, quando ele já saiu do portal; indo, já (o balão some junto)
      if (this.companheiro) this.falaCompanheiroEm = agora + 1.3;
      else { this.droidFala(sortear(FALAS_DROID.vai, Math.random()), false); this.falaCompanheiroEm = 0; }
    }
    return true;
  }
  private falaCompanheiroEm = 0;
  private droidFala(texto: string, ultima: boolean) {
    const d = this.droid; if (!d) return;
    this.balao(d.fala, texto, DROID.cor, ultima ? Infinity : RITMO_FALA.entre * 1000 + 400);
    this.o.onFalaAgente?.({ id: DROID.id, nome: DROID.nome, cor: DROID.cor, texto });
    this.som.vozDroid(d.h.group, { dur: duracaoVozDroid(texto) });   // a "voz" dele: sem palavras, de outra dimensão
  }
  // ───────────── a CONVERSA com a Zaeon (o holograma do globo da capela — lib/cyber/conversaZaeon) ─────────────
  /** a Zaeon FALA: balão embaixo do rosto + a fala no chat (só local) + a VOZ (Leda, com eco de holograma) e a boca
   *  seguindo o volume dela. Com voz, o balão espera o áudio (até ESPERA_VOZ: fixa = já devia estar no cache; gerativa
   *  = a síntese acabou de começar — ela fica com a cara de "pensando" enquanto isso); sem voz, sai na hora e a boca
   *  mexe sorteada. `depois` roda quando o balão aparece (ex.: abrir o painel da pergunta) */
  private zaeonFala(texto: string, ultima: boolean, o: { gerativa?: boolean; depois?: () => void } = {}) {
    if (this.falaZ) this.mostrarFalaZaeon(this.falaZ);   // (não acontece no roteiro) a anterior sai já, sem esperar
    const f = { texto, ultima, espera: 0, limite: ESPERA_VOZ.fixa as number, buf: undefined as AudioBuffer | null | undefined, depois: o.depois };
    if (!this.vozCache || !this.som.ligado || !this.holoZaeon) { f.buf = null; this.mostrarFalaZaeon(f); return; }
    // texto que ainda não foi sintetizado (o nome da pessoa, a resposta da IA…): espera mais, com a cara de "pensando"
    if (o.gerativa || !this.vozCache.tem(texto)) { f.limite = ESPERA_VOZ.gerativa; if (!this.vozCache.tem(texto)) this.holoZaeon.pensar(true); }
    this.falaZ = f;
    void this.bufferDaVoz(texto).then((b) => {
      if (this.falaZ === f) f.buf = b;
      else if (b && this.falaAtual === f && !f.buf) this.vozAtrasada(f, b);   // passou do prazo e o balão saiu mudo: a voz entra agora
    });
  }
  /** a voz chegou DEPOIS do prazo, mas ela ainda está nessa fala: toca agora, e a fala (o balão e o relógio da
   *  conversa) se estende pra caber o áudio inteiro */
  private vozAtrasada(f: NonNullable<CyberEngine["falaZ"]>, b: AudioBuffer) {
    const h = this.holoZaeon, cv = this.conversa;
    if (!h || !cv || cv.etapa === "brava" || cv.etapa === "feita" || cv.etapa === "pensando" || this.vozZ) return;   // (pensando: a pessoa já respondeu — a pergunta não fala mais)
    const voz = this.som.falaHolograma(b, h.rosto); if (!voz) return;
    f.buf = b; this.vozZ = voz; this.durFalaZ = duracaoComAtraso(cv.t, voz.duracao);
    const ate = performance.now() + (voz.duracao + 0.8) * 1000;
    for (const x of this.falas) if (x.ator === this.falaZaeon && x.ate !== Infinity) x.ate = Math.max(x.ate, ate);
  }
  private mostrarFalaZaeon(f: NonNullable<CyberEngine["falaZ"]>) {
    if (this.falaZ === f) this.falaZ = null;
    this.calarZaeon(); this.falaAtual = f;
    const h = this.holoZaeon; h?.pensar(false);
    const voz = f.buf && h ? this.som.falaHolograma(f.buf, h.rosto) : null;
    this.vozZ = voz; this.durFalaZ = voz ? voz.duracao : 0;
    this.balao(this.falaZaeon, f.texto, COR_ZAEON, f.ultima ? Infinity : Math.max(3600, (this.durFalaZ + 0.8) * 1000));
    this.o.onFalaAgente?.({ id: "zaeon", nome: "Zaeon", cor: COR_ZAEON, texto: f.texto });
    if (!voz) h?.falar(0.6 + f.texto.length * 0.055);   // sem áudio: a boca sorteada (a reserva)
    f.depois?.();
  }
  /** para a voz dela (e a boca volta ao normal) */
  private calarZaeon() { this.vozZ?.parar(); this.vozZ = null; this.falaAtual = null; this.holoZaeon?.boca(null); }
  /** o áudio de uma fala: sintetizado (cache por texto) e decodificado (uma vez por texto) */
  private bufferDaVoz(texto: string): Promise<AudioBuffer | null> {
    const k = textoDaVoz(texto), c = this.vozCache; if (!c || !k) return Promise.resolve(null);
    let p = this.vozDecod.get(k);
    if (!p) {
      p = c.pegar(k).then((ab) => (ab ? this.som.decodificar(ab) : null)).catch(() => null);
      this.vozDecod.set(k, p); const pp = p; void pp.then((b) => { if (!b && this.vozDecod.get(k) === pp) this.vozDecod.delete(k); });
    }
    return p;
  }
  /** as falas FIXAS começam a ser sintetizadas antes da conversa (uma vez) */
  private preaquecerVozZaeon() {
    if (!this.vozCache || this.vozPreaquecida) return;
    this.vozPreaquecida = true; this.vozCache.preaquecer(falasFixasZaeon());
  }
  /** começa a conversa: o rosto sobe do globo; a câmera vira pro globo, de baixo, olhando pra cima */
  private abrirConversa() {
    if (!this.holoZaeon || this.conversa) return;
    this.preaquecerVozZaeon();
    this.conversa = { etapa: "abrindo", t: 0, linha: 0, i: 0, perfil: {}, historico: [], ia: false, proxima: null, turno: 0, foraSeguidas: 0, serie: ++this.serieConversa };
    this.holoZaeon.aparecer(); this.som.tocar("rise", this.eu.av.group.position, { dist: DISTANCIA.perto });
    const d = this.droid; if (d) this.falas = this.falas.filter((f) => { if (f.ator === d.fala) { f.el.remove(); return false; } return true; });   // o Droid se cala: a vez é dela
    const c = CIDADE.centro; this.camAz = Math.atan2(this.eu.pos.x - c.x, this.eu.pos.z - c.z); this.camPitch = -0.36; this.camDist = 9; this.camSegueEm = 0;
  }
  private fecharConversa() {
    if (this.conversa && this.conversa.etapa === "esperando") this.o.onPergunta?.(null);
    this.conversa = null; this.holoZaeon?.sumir(); this.falaZ = null; this.calarZaeon();
    this.falas = this.falas.filter((f) => { if (f.ator === this.falaZaeon) { f.el.remove(); return false; } return true; });
  }
  /** a resposta da pessoa (o painel do React ou o chat): as 2 perguntas FIXAS (nome, situação) são resolvidas aqui; o
   *  resto vai pra IA (`conversarZaeon`) — ou pro roteiro local. Abuso óbvio já expulsa aqui, sem esperar a rede */
  responderZaeon(texto: string): boolean {
    const cv = this.conversa; if (!cv || cv.etapa !== "esperando") return false;
    const r = limparResposta(texto); if (!r) return false;
    this.o.onPergunta?.(null); cv.historico.push({ quem: "eu", texto: r });
    if (moderar(r).abuso) { this.expulsar(); return true; }
    if (!cv.ia) {
      const p = PERGUNTAS[cv.i]!;
      if (p.id === "nome") {
        const n = nomeDe(r); if (!n) { this.perguntarDeNovo(REPERGUNTA_NOME); return true; }
        cv.perfil.nome = n;
        void this.bufferDaVoz(fechamento(cv.perfil)[0]!);   // o "Obrigada, <nome>!" do fim já vai sendo gerado (só toca minutos depois)
        this.zaeonFala(reacaoFixa("nome", r, cv.perfil), false, { gerativa: true, depois: () => this.holoZaeon?.sorrir(2.4) }); cv.historico.push({ quem: "zaeon", texto: reacaoFixa("nome", r, cv.perfil) });
      } else {
        cv.perfil.situacao = situacaoDe(r) ?? r;   // texto livre que não deu pra classificar: vai como a pessoa disse (a IA entende)
        const re = reacaoFixa("situacao", r, cv.perfil); this.zaeonFala(re, false, { depois: () => this.holoZaeon?.sorrir(2.4) }); cv.historico.push({ quem: "zaeon", texto: re });
        const q = perguntaDoRoteiro(faltando(cv.perfil)[0] ?? "objetivo", cv.perfil); cv.ia = true; cv.proxima = q;
      }
      cv.etapa = "reagindo"; cv.t = 0; return true;
    }
    // a parte GERATIVA: a Zaeon pensa (a cara de pensando) enquanto o servidor responde
    cv.etapa = "pensando"; cv.t = 0; this.holoZaeon?.pensar(true);
    const pedido: PedidoZaeon = { perfil: { ...cv.perfil }, historico: cv.historico.slice(-12), resposta: r, turno: cv.turno, foraSeguidas: cv.foraSeguidas }, serie = cv.serie;
    const local = () => fallbackZaeon(pedido);
    const espera = this.o.conversarZaeon ? Promise.race([this.o.conversarZaeon(pedido), new Promise<TurnoZaeon>((ok) => setTimeout(() => ok(local()), 12000))]).catch(local) : Promise.resolve(local());
    void espera.then((t) => { if (this.conversa && this.conversa.serie === serie && this.conversa.etapa === "pensando") this.aplicarTurno(t); });
    return true;
  }
  /** ela pergunta (o painel de resposta abre quando o balão — e a voz — começa) */
  private perguntarDeNovo(fala: string, gerativa = false) {
    const cv = this.conversa; if (!cv) return;
    const p = cv.ia ? { id: "ia", fala, tipo: "texto" as const, outro: true, opcoes: cv.proxima?.opcoes ?? [] } : { ...PERGUNTAS[cv.i]!, fala };
    const n = Math.min(cv.i + 1 + cv.turno, 6);
    this.zaeonFala(fala, true, { gerativa, depois: () => { if (this.conversa === cv && cv.etapa === "esperando") { this.o.onPergunta?.({ ...p, n, total: 6 }); this.soltarMouse(); } } });
    cv.historico.push({ quem: "zaeon", texto: fala }); cv.etapa = "esperando";
  }
  /** o turno da IA (ou da reserva): abuso → expulsão; fora do assunto → ela pergunta de novo; ok → reage e segue/fecha */
  private aplicarTurno(t: TurnoZaeon) {
    const cv = this.conversa; if (!cv) return;
    if (t.classe === "abuso") { this.expulsar(); return; }   // (a cara de "pensando" sai quando a fala dela aparece)
    cv.perfil = { ...cv.perfil, ...t.perfil };
    if (t.classe === "fora") cv.foraSeguidas++; else { cv.foraSeguidas = 0; cv.turno++; }
    if (t.concluido) { this.zaeonFala(t.fala || "Perfeito!", false, { gerativa: true, depois: () => this.holoZaeon?.sorrir(2.6) }); cv.historico.push({ quem: "zaeon", texto: t.fala }); cv.etapa = "fechando"; cv.linha = 0; cv.t = -1.5; this.o.onPerfil?.({ ...cv.perfil }); return; }
    cv.proxima = { fala: t.fala, opcoes: t.opcoes };
    this.perguntarDeNovo(t.fala, true);
  }
  /** ABUSO: a Zaeon fica BRAVA; o Droid (em fúria) vem pra frente da pessoa e a expulsa do cyberespaço */
  private expulsar() {
    const cv = this.conversa; if (cv) { cv.etapa = "brava"; cv.t = 0; }
    this.o.onPergunta?.(null); this.falaZ = null; this.calarZaeon(); this.holoZaeon?.pensar(false); this.holoZaeon?.brava();
    this.falas = this.falas.filter((f) => { if (f.ator === this.falaZaeon) { f.el.remove(); return false; } return true; });
    this.droid?.h.furia(true); this.expulsando = { t: 0, falou: false };
    this.guia = null;   // acabou o tutorial (sem avisar o "fim": não conta como visto — da próxima vez nasce no tubo de novo)
    this.som.tocar("baque", this.eu.av.group.position, { dist: DISTANCIA.perto, volume: 1, taxa: 0.6 });
  }
  private atualizarConversa(dt: number) {
    if (this.expulsando) {
      const x = this.expulsando; x.t += dt;
      if (!x.falou && x.t >= 1.6) { x.falou = true; const d = this.droid; if (d) { this.balao(d.fala, FALA_EXPULSAO, "#ff5a4a", Infinity); this.o.onFalaAgente?.({ id: DROID.id, nome: DROID.nome, cor: "#ff5a4a", texto: FALA_EXPULSAO }); this.som.vozDroid(d.h.group, { dur: duracaoVozDroid(FALA_EXPULSAO), furia: true }); } }
      if (x.t >= 7) { this.expulsando = null; this.o.onExpulso?.(); }
    }
    const cv = this.conversa, h = this.holoZaeon; if (!cv || !h) return;
    if (h.fase() === "oculto" && cv.etapa !== "feita") { this.conversa = null; return; }
    const a = h.ancora(), ilhaY = this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY;
    this.falaZaeon.pos.set(CIDADE.centro.x, 0, CIDADE.centro.z); this.falaZaeon.alt = ilhaY + a.y - 2.4;
    // a VOZ: a fala esperando o áudio sai quando ele chega (ou no prazo, muda); a boca segue o volume
    const fz = this.falaZ; if (fz) { fz.espera += dt; if (fz.buf !== undefined || fz.espera >= fz.limite) this.mostrarFalaZaeon(fz); }
    const vz = this.vozZ; if (vz) { if (vz.acabou()) { this.vozZ = null; h.boca(null); } else h.boca(vz.nivel()); }
    if (this.falaZ) return;   // o relógio da conversa só anda depois que a fala aparece
    cv.t += dt;
    const dur = (fixo: number) => tempoDaFala(fixo, this.durFalaZ);   // a fala ocupa o tempo do roteiro ou o do áudio (+ respiro)
    if (cv.etapa === "abrindo") {
      if (h.fase() !== "visivel") return;
      if (cv.linha < ABERTURA.length && cv.t >= (cv.linha === 0 ? 0.3 : dur(3.4))) { this.zaeonFala(ABERTURA[cv.linha]!, false); cv.historico.push({ quem: "zaeon", texto: ABERTURA[cv.linha]! }); cv.linha++; cv.t = 0; }
      else if (cv.linha >= ABERTURA.length && cv.t >= dur(3.2)) { cv.etapa = "perguntando"; cv.t = 0; }
    } else if (cv.etapa === "perguntando") {
      const p = PERGUNTAS[cv.i]!; this.perguntarDeNovo(p.fala);
    } else if (cv.etapa === "reagindo" && cv.t >= dur(2.6)) {
      if (!cv.ia) { cv.i++; cv.etapa = "perguntando"; cv.t = 0; }
      else this.perguntarDeNovo(cv.proxima!.fala);
    } else if (cv.etapa === "fechando") {
      const fim = fechamento(cv.perfil);
      if (cv.linha < fim.length && cv.t >= dur(3.4)) { this.zaeonFala(fim[cv.linha]!, false); cv.linha++; cv.t = 0; }
      else if (cv.linha >= fim.length && cv.t >= dur(3.4)) { h.sumir(); cv.etapa = "feita"; }
    }
  }

  /** por quadro: o vidro do tubo e a saída dele; o TUTORIAL: as falas do Droid (uma depois da outra), a espera pela
   *  pessoa cumprir (lib/cyber/onboarding `cumpriu`) e o farol do alvo */
  private atualizarNascimentoEGuia(dt: number) {
    const eu = this.eu;
    if (this.nascendo) {
      this.nascendo.t += dt;
      if (this.nascendo.t >= NASCIMENTO.sai) {
        const tb = TUBOS[this.nascendo.tubo]!; this.saindoDoTubo = this.nascendo.tubo; this.nascendo = null;
        this.alvo = new THREE.Vector2(tb.x + Math.sin(tb.rumo) * 2.6, tb.z + Math.cos(tb.rumo) * 2.6); this.alvoDepois = null;   // sai andando do tubo
      }
    }
    if (this.saindoDoTubo !== null) { const tb = TUBOS[this.saindoDoTubo]!; if (Math.hypot(eu.pos.x - tb.x, eu.pos.z - tb.z) > 2.2) this.saindoDoTubo = null; }
    const farol = this.farol, g = this.guia;
    if (!g) { if (farol) farol.visible = false; return; }
    const passo = ROTEIRO[g.passo]!;
    if (passo.cond.tipo === "nascer") { if (!this.nascendo) this.irProPasso(g.passo + 1); return; }
    // o que a pessoa fez desde a instrução
    const dx = eu.pos.x - g.prev.x, dz = eu.pos.z - g.prev.z; g.prev = { x: eu.pos.x, z: eu.pos.z };
    if (g.ativo) {
      if (this.moto !== null) g.motoAndou += Math.hypot(this.motoEst.vx, this.motoEst.vz) * dt;
      else if (!this.jet.noAr && !this.viagem && Math.hypot(dx, dz) < 2) g.andou += Math.hypot(dx, dz);   // (um teleporte não conta)
    } else if (!this.jet.noAr) g.pisoY = eu.alt;
    // as falas: só com o Droid já ali (saiu do portal)
    if (this.droid?.h.fase() === "visivel") {
      g.falaT += dt;
      if (g.fala < passo.falas.length && g.falaT >= (g.fala === 0 ? 0.35 : RITMO_FALA.entre)) { this.droidFala(passo.falas[g.fala]!, g.fala === passo.falas.length - 1); g.fala++; g.falaT = 0; }
      else if (g.fala >= passo.falas.length && !g.ativo && g.falaT >= RITMO_FALA.antesDeConferir) { g.ativo = true; g.andou = 0; g.motoAndou = 0; g.portal = false; if (passo.cond.tipo === "conversa") this.abrirConversa(); }
    }
    if (passo.cond.tipo === "fim") {   // o fim: ele se despede e some no portal
      if (g.fala >= passo.falas.length && g.falaT >= RITMO_FALA.fimSome && this.droid) { this.droid.h.sumir(); this.falas = this.falas.filter((f) => { if (f.ator === this.droid!.fala) { f.el.remove(); return false; } return true; }); this.encerrarGuia(); }
    } else if ((g.ativo || passo.livre) && cumpriu(passo.cond, this.ctxGuia(g, passo))) this.irProPasso(g.passo + 1);
    if (farol) {
      const pa = this.guia ? ROTEIRO[this.guia.passo] : undefined, a = pa ? this.alvoDoPasso(pa) : null;
      farol.visible = !!a && !this.nascendo && (this.naZaeon || pa?.id === "base");
      if (a && farol.visible) { farol.position.set(a.x, (pa?.id === "base" ? this.eu.alt : this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY) + 28, a.z); (farol.material as THREE.MeshBasicMaterial).opacity = 0.16 + 0.08 * Math.sin(performance.now() * 0.003); }
    }
  }
  /** o alvo do passo (mundo): o do roteiro — ou, no passo da máquina de estudos, a frente da PRÓPRIA base */
  private alvoDoPasso(p: (typeof ROTEIRO)[number]): { x: number; z: number; r: number } | null {
    if (p.id !== "base") return p.alvo;
    const b = this.minhaBase; if (!b) return null;
    const f = localParaMundo(b, 0, 2.4); return { ...f, r: BASE_INTERACT_R };
  }
  /** o que a pessoa fez (pra `cumpriu`) */
  private ctxGuia(g: NonNullable<CyberEngine["guia"]>, passo: (typeof ROTEIRO)[number]) {
    const eu = this.eu, a = this.alvoDoPasso(passo);
    return {
      nascendo: !!this.nascendo, andou: g.andou, noAr: this.jet.noAr ? this.jet.y - g.pisoY : 0,
      chegou: !!a && Math.hypot(eu.pos.x - a.x, eu.pos.z - a.z) <= a.r && !this.jet.noAr,
      conversaFeita: this.conversa?.etapa === "feita", naMoto: this.moto !== null, motoAndou: g.motoAndou, cruzouPortal: g.portal,
      naPraca: !this.altoEm && !this.plat && !this.bordo && !this.jet.noAr && this.moto === null && naPraca(eu.pos),
      pertoDaBase: this.perto,
    };
  }
  /** o DROID: aparece num mini portal do lado da pessoa (quando o tutorial começa — e de novo depois de um teleporte);
   *  vai PLANANDO do lado dela, ou NA FRENTE quando o passo é "vem comigo até…"; olha pra ela; some no portal no fim */
  private atualizarAgentes(dt: number, t: number) {
    const d = this.droid; if (!d) return;
    const eu = this.eu, fase = d.h.fase(), passo = this.guia ? ROTEIRO[this.guia.passo] : undefined;
    const guiando = (!!this.guia && !this.nascendo && !this.menu && passo?.cond.tipo !== "nascer" && !passo?.livre) || !!this.expulsando;   // livre (explorando): ele some
    const comigo = this.companheiro && !guiando && !this.menu;   // o companheiro (habilidade do G)
    const quer = guiando || comigo;
    // pra onde ele vai: do lado da pessoa — ou, num passo "vem comigo até…", ELE VAI: voa rumo ao alvo e, se a pessoa
    // ficar pra trás, para e espera por ela (virado pra ela)
    const a = passo && this.guia ? this.alvoDoPasso(passo) : null, altAlvo = eu.alt + (this.expulsando ? 5 : 2.3);   // expulsando: no meio da tela, encarando
    const lidera = !!a && (this.naZaeon || passo?.id === "base") && !this.tunel && !this.expulsando;   // "vem comigo até…": ele VAI até lá e espera lá
    // NA FRENTE da pessoa, no campo de visão (a câmera olha por cima do ombro): ~5 m à frente, um pouco de lado pra não
    // tapar o personagem — é ali que ele nasce do portal, de frente pros nossos olhos
    const vx0 = -Math.sin(this.camAz), vz0 = -Math.cos(this.camAz);
    const deLado = passo?.cond.tipo === "conversa" && !this.expulsando;   // com a Zaeon falando, ele sai da frente (fica do lado)
    // o COMPANHEIRO nasce na frente (de frente pros nossos olhos) e depois fica por cima do ombro direito, um pouco atrás
    const seguindo = comigo && fase === "visivel";
    const alvo = this.expulsando ? { x: eu.pos.x + vx0 * 6, z: eu.pos.z + vz0 * 6 } : deLado ? { x: eu.pos.x + vx0 * 1.5 - vz0 * 4.2, z: eu.pos.z + vz0 * 1.5 + vx0 * 4.2 } : seguindo ? { x: eu.pos.x - vx0 * 0.6 - vz0 * 1.9, z: eu.pos.z - vz0 * 0.6 + vx0 * 1.9 } : { x: eu.pos.x + vx0 * 5.2 - vz0 * 1.2, z: eu.pos.z + vz0 * 5.2 + vx0 * 1.2 };
    if (quer && fase === "oculto") { d.pos.set(alvo.x, 0, alvo.z); d.alt = altAlvo; d.h.aparecer(); this.som.tocar(this.som.temSom("cyber-enter") ? "cyber-enter" : "rise", d.h.group.position, { dist: DISTANCIA.perto }); this.som.tocar("rise", d.h.group.position, { dist: DISTANCIA.perto }); }
    else if (!quer && (fase === "visivel" || fase === "entrando")) d.h.sumir();
    else if (fase === "visivel") {
      const longe = Math.hypot(d.pos.x - eu.pos.x, d.pos.z - eu.pos.z);
      if (lidera && a) {
        // ele VAI: voa direto pro alvo (um pouco mais rápido que quem anda — dá pra ver ele indo e seguir) e, chegando,
        // fica PAIRANDO lá em cima do alvo, esperando a pessoa chegar
        const vx = a.x - d.pos.x, vz = a.z - d.pos.z, dd = Math.hypot(vx, vz);
        if (dd > 0.6) { const v = Math.min(9, 2 + dd * 0.6), k = Math.min(dd, v * dt); d.pos.x += (vx / dd) * k; d.pos.z += (vz / dd) * k; }
        const yAlvo = (passo?.id === "base" ? eu.alt : this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY) + 3.2;
        d.alt += (yAlvo - d.alt) * Math.min(1, dt * 2);
      } else if (longe > 60 || Math.abs(altAlvo - d.alt) > 30) d.h.sumir();   // ficou pra trás (teleporte, túnel, queda): some e reaparece do lado
      else {
        const dx = alvo.x - d.pos.x, dz = alvo.z - d.pos.z, dist = Math.hypot(dx, dz);
        const v = Math.min(80, 1.2 + dist * 2.4), k = Math.min(dist, v * dt); if (dist > 1e-3) { d.pos.x += (dx / dist) * k; d.pos.z += (dz / dist) * k; }
        d.alt += (altAlvo - d.alt) * Math.min(1, dt * 3);
      }
    }
    if (comigo && this.falaCompanheiroEm && fase === "visivel" && performance.now() / 1000 >= this.falaCompanheiroEm) { this.falaCompanheiroEm = 0; this.droidFala(sortear(FALAS_DROID.chega, Math.random()), false); }
    if (fase === "oculto" && !d.h.group.visible) { d.tag.style.display = "none"; return; }
    d.h.group.position.set(d.pos.x, d.alt, d.pos.z);
    d.fala.alt = d.alt - 1.0;
    d.h.atualizar(dt, t, Math.atan2(eu.pos.x - d.pos.x, eu.pos.z - d.pos.z));
  }


  /** caiu no VAZIO: renasce na praça, na frente da própria base (o fundador, na Zaeon) */
  private renascer() {
    const lay = this.layouts.get(this.o.eu.id);
    const naZaeon = lay?.nivel === "ceu" && !!this.cidade;
    if (naZaeon) this.irParaNo("zaeon");
    else { const sp = spawnDaBase(lay); this.irParaNo("praca", { ...sp, rumo: Math.atan2(-sp.x, -sp.z) }); }
    this.o.onAviso?.(`Você caiu no vazio — de volta ${naZaeon ? "à Zaeon" : "à praça"}.`);
  }
  /** o PAR do dono (o React já validou no servidor): da nave → cabine do DJ; da cabine → a bordo da nave */
  atravessarBuracoDono(para: "dj" | "nave") {
    if (!this.ehFundador(this.o.eu.id) || this.menu) return;
    this.viagem = null; this.tunel = null; this.pilotando = false; this.noTopo = false; this.alvo = null; this.alvoDepois = null; this.sitT = 0;
    this.jet.noAr = false; this.jetV = { x: 0, z: 0 }; this.sobreNave = false; this.ilhota = null; this.plat = null; this.bocaDonoArmada = false;
    if (para === "dj") {
      const c = chegadaDJMundo();
      this.bordo = null; this.altoEm = "ceu"; this.yNav = CIDADE.pisoY;
      this.eu.pos.set(c.x, 0, c.z); this.eu.facing = rumoDoDJ(); this.camAz = rumoDoDJ() + Math.PI;
      const y = (this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY) + alturaNaCidade(c); this.eu.alt = y; this.camT.set(c.x, y + 1.2, c.z);
    } else {
      const p = this.poseNave(); if (!p) return;
      this.altoEm = null; this.yNav = 0; this.bordo = { ...CHEGADA_NAVE, nivel: 0 };
      const w = paraMundo(p, this.bordo); this.eu.pos.set(w.x, 0, w.z); this.eu.facing = p.yaw; this.camAz = p.yaw + Math.PI;
      this.eu.alt = alturaDoConves(p); this.camT.set(w.x, this.eu.alt + 1.2, w.z);
    }
    this.som.tocar("rise", this.eu.av.group.position, { dist: DISTANCIA.perto });
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
    if (p.y < 1.5) return naPraca(paraMundo(p, NAVE_QG.saida));   // pousada na altura da praça: só se a rampa dá NELA (fora é o vazio)
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
    // pose salva numa DOCA ANTIGA (a Zaeon já foi a 230 e a 290 m; a nave já teve o convés a 7 m): ignora → doca nova
    for (const d of [NAVE_QG.deck, DECK_ANTIGO]) for (const h of [230, 290]) if (Math.abs(pose.y + d - h) < 1.5) return;
    // atracada na Zaeon de hoje mas com o convés da nave antiga (maior): acerta a altura pro convés novo
    if (Math.abs(pose.y + DECK_ANTIGO - CIDADE.pisoY) < 1.5) pose = { ...pose, y: CIDADE.pisoY - NAVE_QG.deck };
    // na doca (de qualquer jeito que tenha sido salva): a doca de hoje — de frente pra Zaeon, a rampa na borda
    { const d = poseDaDoca(); if (Math.hypot(pose.x - d.x, pose.z - d.z) < 20 && Math.abs(pose.y - d.y) < 10) pose = d; }
    this.naveEst = { ...this.naveEst, ...pose, vx: 0, vy: 0, vz: 0 };
  }
  /** botões de movimento na tela: SUBIR/DESCER (segurar) */
  comandoVoo(c: { subir?: boolean; descer?: boolean }) { if (c.subir !== undefined) this.voY.subir = c.subir; if (c.descer !== undefined) this.voY.descer = c.descer; if (c.subir || c.descer) this.autoPouso = false; }
  /** botões de movimento na tela: direcional (x = direita, z = trás; relativo à câmera, como WASD) */
  direcaoVoo(x: number, z: number) { this.botDir.x = x; this.botDir.z = z; if (x || z) this.autoPouso = false; }
  /** atalho: a nave voa sozinha (com as mesmas entradas dos botões) até pousar no destino; qualquer botão cancela */
  irPara(destino: DestinoRota): boolean {
    if (!this.pilotando) return false;
    const pontos = rotaPara(destino, this.naveEst);
    if (!pontos.length) return false;
    this.rota = { destino, pontos }; this.autoPouso = false; this.o.onRota?.(destino); return true;
  }
  pararRota() { if (this.rota) { this.rota = null; this.o.onRota?.(null); } }
  /** "Pousar": desce sozinho até encostar no chão embaixo (mapa, cidade ou topo da Zaeon) */
  pousar() { if ((this.pilotando && !this.pousado) || (this.moto !== null && !this.motoPousado)) this.autoPouso = true; }
  /** as motos estacionadas que valem (as minhas e as dos outros; some a que alguém pegou) */
  private largadasAgora() {
    const euId = this.o.eu.id;
    return largadasValidas([{ id: euId, moto: this.moto !== null ? { s: this.moto, y: 0, yaw: 0, de: this.motoDe } : null, motoLargada: this.motoLargada }, ...[...this.remotos.values()].map((a) => ({ id: a.id, moto: a.moto, motoLargada: a.motoLargada }))]);
  }
  /** a vaga `i` tem moto pronta (o robô não está fabricando nela)? */
  private vagaPronta(i: number) { const v = vagas()[i]; return !!v && progressoDaVaga(this.fabricas[v.lote]!.f, i) >= 1; }
  /** o que dá pra montar perto (vaga pronta ou estacionada), no mesmo nível dos meus pés — a pé */
  private motoAoAlcance(): AlvoMoto | null { return this.podeMontar() ? motoParaMontar(this.eu.pos, this.eu.alt, (i) => this.vagaPronta(i), (v) => this.yDaVaga(v), this.largadasAgora()) : null; }
  /** a pé, no chão do mapa, no piso da Zaeon, numa PLATAFORMA flutuante (universidades, Solana, campi) ou numa ILHOTA
   *  — onde a moto pode ter sido estacionada (a altura/alcance de `motoParaMontar` garante que é a do MEU nível). Antes,
   *  plataforma e ilhota ficavam de fora: descia-se da moto ali e não dava mais pra montar de novo */
  private podeMontar() { return !this.menu && !this.pilotando && this.moto === null && !this.jet.noAr && (!this.altoEm || this.noCeu) && !this.noTopo && !this.sobreNave && this.bordo === null && this.vagaMotos.length > 0; }
  /** ninguém (eu, os outros, motos estacionadas) em cima da vaga `s` — o robô espera liberar pra fabricar */
  private vagaLivre(s: number) {
    const v = vagas()[s]; if (!v) return false;
    const y = this.yDaVaga(v), perto = (p: { x: number; z: number }, alt: number) => Math.hypot(p.x - v.x, p.z - v.z) < 2.6 && Math.abs(alt - y) < 4;
    if (perto(this.moto !== null ? this.motoEst : this.eu.pos, this.moto !== null ? this.motoEst.y : this.eu.alt)) return false;
    for (const a of this.remotos.values()) if (perto(a.pos, a.alt)) return false;
    return !this.largadasAgora().some(({ m }) => perto(m, m.y));
  }
  /** a VAGA `s` esvaziou (alguém levou a moto): o robô do lote dela vem fabricar outra */
  private tomarVaga(s: number) { const v = vagas()[s]; if (v && this.vagaPronta(s)) esvaziou(this.fabricas[v.lote]!.f, s); }
  /** MONTA: numa VAGA (leva a moto — o robô repõe) ou numa ESTACIONADA (a minha ou a de outra pessoa: `de` avisa o dono) */
  montar(alvo: AlvoMoto | null = this.motoAoAlcance()): boolean {
    if (!alvo || !this.podeMontar()) return false;
    let p: { x: number; y: number; z: number; yaw: number } | null = null;
    let lancar = false;
    if (alvo.tipo === "vaga") { const v = vagas()[alvo.s]; if (v && this.vagaPronta(alvo.s)) { p = { x: v.x, y: this.yDaVaga(v), z: v.z, yaw: v.yaw }; lancar = true; } }
    else p = this.largadasAgora().find((l) => l.dono === alvo.dono)?.m ?? null;
    if (!p || Math.abs(p.y - this.eu.alt) > 2.5 || Math.hypot(this.eu.pos.x - p.x, this.eu.pos.z - p.z) > MOTO.alcance) return false;
    if (alvo.tipo === "vaga") { this.tomarVaga(alvo.s); this.motoDe = undefined; }
    else { this.motoDe = alvo.dono; if (alvo.dono === this.o.eu.id) { this.motoLargada = null; this.renomearInst("eu:p", "eu:r"); } }   // a minha estacionada: a mesma moto (sem trocar)
    // da VAGA: a moto já sai da plataforma PAIRANDO na altura de lançamento (acima do "rente ao chão": anda na hora)
    const y0 = lancar ? p.y - PLATAFORMA_MOTO.altura + ALTURA_LANCAMENTO : p.y;
    this.motoAlvo = null; this.moto = alvo.s; this.motoEst = motoParada(p.x, y0, p.z, p.yaw); this.camAz = p.yaw + Math.PI; this.camSegueEm = 0;
    this.altoEm = null; this.yNav = 0; this.plat = null; this.ilhota = null;   // montado, o nível é o da moto (saiu da plataforma/ilhota)
    this.motoPousado = !lancar; this.autoPouso = false;
    this.sitT = 0; this.alvo = null; this.alvoDepois = null; this.falandoCom = null; this.jetV = { x: 0, z: 0 };
    return true;
  }
  /** a altura de um lote (o da Zaeon flutua com a ilha) */
  private yDoLote(l: Lote) { return l.ceu ? (this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY) + l.alt : 0; }   // (a garagem: lá em cima, na plataforma)
  /** a altura da moto PARADA numa vaga: em cima da plataforma de lançamento (no chão, ou no piso da Zaeon, que flutua) */
  private yDaVaga(v: { ceu: boolean; alt?: number }) { return (v.ceu ? (this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY) + (v.alt ?? 0) : 0) + PLATAFORMA_MOTO.altura; }
  /** DESCE da moto (pousada): fica ao lado dela e a moto FICA ALI estacionada (é um veículo — é minha até eu estacionar
   *  outra ou sair); os outros veem pela minha presença. No piso da Zaeon → anda na ilha; noutro alto → cai dali */
  /** dá pra descer da moto aqui? Pousada num piso de verdade — na altura da praça, só EM CIMA dela (fora é o vazio) */
  private desceDaMotoAqui() { const m = this.motoEst; return this.moto !== null && this.motoPousado && (m.y > 0.5 || naPraca(m)); }
  desmontar() {
    if (this.moto === null || !this.desceDaMotoAqui()) return;
    this.sairCorrida();
    const m = this.motoEst, lx = Math.cos(m.yaw), lz = -Math.sin(m.yaw);   // a esquerda de quem pilota
    this.motoLargada = { s: this.moto, x: m.x, y: m.y, z: m.z, yaw: m.yaw };
    this.soltarInst("eu:p"); this.renomearInst("eu:r", "eu:p");   // a MESMA moto fica ali (a estacionada antiga some)
    this.moto = null; this.motoDe = undefined; this.autoPouso = false; this.voY.subir = false; this.voY.descer = false;
    this.eu.pos.set(m.x + lx * 1.6, 0, m.z + lz * 1.6); this.eu.facing = m.yaw;
    // pousada em qualquer piso da Zaeon (plataforma central, escada, lounge, palco, cabine do DJ) → anda ali
    if (naIlhaPrincipal(this.eu.pos) && Math.abs(m.y - (CIDADE.pisoY + alturaNaCidade(this.eu.pos))) < 1.5) { this.altoEm = "ceu"; this.yNav = CIDADE.pisoY; this.portalArmado = false; }
    else if (m.y > 0.5) { this.eu.alt = m.y; this.cairDaqui(); }
  }
  /** o dono manda onde a nave dele está estacionada (presença `naveParada`) — sem hangar, sempre que não está pilotando */
  private naveForaDoHangar() { return !!this.nave && this.ehFundador(this.o.eu.id); }   // sem hangar: a nave do dono está sempre "parada em algum lugar"
  /** (pra quem NÃO é o dono) o dono está online com a nave → a minha cópia some (só existe uma nave) */
  private naveDoDonoFora() { if (this.ehFundador(this.o.eu.id)) return false; for (const a of this.remotos.values()) if (a.nave) return true; return false; }
  // ───────────── áudio ─────────────
  /** loops fixos do mundo + destrave. O gesto (o "Conectar" ao cyberespaço, ou o 1º clique/toque/tecla) só DESTRAVA: o som do
   *  cyberespaço só liga ao ENTRAR de fato na cena 3D (fora do menu) — na landing/menu, nada do cyberespaço toca. */
  private montarSom() {
    const s = this.som;
    this.somLoops.leito = s.loop("space-bed", null);
    const bn = new THREE.Object3D(); bn.position.set(BURACO_NEGRO.x, BURACO_NEGRO.y, BURACO_NEGRO.z); this.cena.scene.add(bn);
    s.volumeLoop(s.loop("blackhole-hum", bn, { dist: DISTANCIA.grande }), 1);
    this.somLoops.jet = this.loopsDoJato(this.eu.av.group, DISTANCIA.eu);   // contínuo enquanto se segura o ESPAÇO
    // os FIOS DE ENERGIA: o zumbido nos postes das duas pontas de cada fio (presos à ilha, que flutua) e o MEU assobio
    if (this.cidade) for (const e of Object.values(ESCADAS)) for (const u of [0, e.len]) {
      const o = new THREE.Object3D(); o.position.set(e.dir.x * (e.ini + u), alturaDoFio(e, u), e.dir.z * (e.ini + u)); this.cidade.ilha.add(o);
      s.volumeLoop(s.loop("fio-zumbido", o, { dist: DISTANCIA.fio }), 1);
    }
    this.somLoops.fio = s.loop("fio-puxa", this.eu.av.group, { dist: DISTANCIA.eu });
    // a MÚSICA AMBIENTE dos espaços de convivência: sai das caixas de som discretas de cada sala (lib/cyber/ambiente)
    for (const c of this.cidade?.caixasAmbiente ?? []) if (c.sala === "biblioteca" || c.sala === "jardim") s.volumeLoop(s.loop(`ambiente-${c.sala}`, c.obj, { dist: DISTANCIA.ambiente, volume: 0.5 }), 1);
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
    // HERO LANDING: só caindo de ALTO (≥ HEROI.alturaMin acima do chão) — a pose, a onda de choque, o tranco e o estrondo
    const queda = this.altMaxVoo - this.jet.y; this.altMaxVoo = -Infinity;
    if (queda >= HEROI.alturaMin) { this.tHeroi = this.agora; this.impacto(Math.min(1, 0.6 + queda / 40), false); this.som.tocar("impacto-heroi", em, { dist: DISTANCIA.eu, volume: 1 }); }
  }
  /** um IMPACTO (pouso forte, dash batendo): a onda de choque no chão + o tremor da câmera (lib/cyber/movimento) */
  private impacto(f: number, som = true) {
    const em = this.eu.av.group.position;
    this.fxMov ??= criarEfeitosMovimento(this.cena.scene); this.fxMov.onda(em, f);
    this.tremor = Math.max(this.tremor, tremorDoImpacto(f));
    if (som) this.som.tocar("baque", em, { dist: DISTANCIA.eu, volume: 0.5 + 0.5 * f, taxa: 0.9 });
  }
  /** os sons das ASAS de alguém: a batida a cada descida (presa ao corpo, afinação variando), abrir ao decolar,
   *  fechar ao pousar, e o vento contínuo planando (lib/cyber/asas) */
  private somDasAsas(a: Ator, ev: NonNullable<ReturnType<AvatarLuzHandle["eventosAsas"]>>, dist: Dist, vel: number) {
    const s = this.som;
    for (let k = 0; k < Math.min(2, ev.bateu); k++) s.tocar("asa-bater", null, { dist, seguir: a.av.group, ...variacaoBatida(ev.modo, Math.random(), Math.random()) });
    if (ev.abriu) s.tocar("asa-abrir", null, { dist, seguir: a.av.group });
    if (ev.fechou) s.tocar("asa-fechar", a.av.group.position, { dist });
    if (!a.somAsas) a.somAsas = s.loop("asa-vento", a.av.group, { dist });
    s.volumeLoop(a.somAsas, ventoDasAsas(ev.modo, vel));
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
    if (this.somLoops.fio) {   // sendo puxado: o assobio sobe de tom com a velocidade (sai devagar, corre no meio, chega devagar)
      const v = this.viagem, k = v?.tipo === "escada" ? Math.min(1, v.t / VIAGEM_ESCADA.dur) : 0;
      s.volumeLoop(this.somLoops.fio, v?.tipo === "escada" ? 0.5 + 0.5 * 4 * k * (1 - k) : 0, 4); s.taxaLoop(this.somLoops.fio, 0.85 + 0.5 * 4 * k * (1 - k));
    }
    // cristais: só com o MEU avatar perto da base (no mesmo piso) — o ouvinte é a câmera, que fica longe do avatar
    for (const [id, l] of this.somCristais) {
      const b = this.layouts.get(id), mesmoPiso = b && (b.nivel ?? "chao") === this.nivelDe(this.o.eu.id);
      s.volumeLoop(l, mesmoPiso ? fatorCristais(Math.hypot(this.eu.pos.x - b.x, this.eu.pos.z - b.z)) : 0);
    }
    // a MINHA mochila: jato contínuo (ataque rápido ao apertar, solta suave), mais agudo subindo
    // (o founder tem ASAS no lugar da mochila: em vez do jato, a batida e o vento)
    const asasEu = this.eu.av.eventosAsas();
    if (asasEu) { this.somDasAsas(this.eu, asasEu, DISTANCIA.eu, this.eu.moving ? 8 : 0); if (this.somLoops.jet) for (const l of this.somLoops.jet) s.volumeLoop(l, 0); }
    else if (this.somLoops.jet) this.ajustarJato(this.somLoops.jet, this.jet.noAr, this.jet.tecla || this.impulsoFrente, this.jet.tecla ? this.jet.vy : 3);
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
      // mochila do colega: jato posicional (vem do lado certo); ao pousar, o baque dele. Com ASAS: batida + vento
      if ((a.puxa ?? 0) > 0.3 && d < 40) { if (!a.somFio) a.somFio = s.loop("fio-puxa", a.av.group, { dist: DISTANCIA.fio }); s.volumeLoop(a.somFio, 1, 4); }   // o colega sendo puxado
      else if (a.somFio) s.volumeLoop(a.somFio, 0, 4);
      const asasA = a.av.eventosAsas();
      if (asasA && d < 60) this.somDasAsas(a, asasA, DISTANCIA.padrao, a.moving ? 8 : 0);
      else if (asasA) { if (a.somAsas) s.volumeLoop(a.somAsas, 0); }
      else if (a.jet !== undefined) {
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

  /** uma INSTÂNCIA animada (a moto de um piloto) do look da vaga `s`: do pool, ou nova */
  private pegarInst(s: number): InstMoto {
    const look = String(s), livre = this.poolMotos.get(look)?.pop();   // o look é da vaga (cor + carenagem)
    if (livre) { livre.s = s; livre.casca.visible = true; livre.som = somMotoParada; livre.yAnt = null; return livre; }
    const h = loteMoto(criarMoto({ ...lookDaVaga(s), low: this.o.low }));
    const casca = new THREE.Group(); casca.add(h.group); this.cena.scene.add(casca);
    return { h, g: h.group, casca, look, s, loops: null, som: somMotoParada, cambio: cambioNeutro(), pAnt: null, velMedida: 0, yawAnt: 0, yAnt: null, vy: 0 };
  }
  /** devolve a instância da chave pro pool (som desligado, escondida) */
  private soltarInst(chave: string) {
    const m = this.instMotos.get(chave); if (!m) return;
    this.instMotos.delete(chave);
    if (m.loops) { for (const l of Object.values(m.loops)) this.som.soltarLoop(l); m.loops = null; }
    if (m.som.montada) this.som.tocar("moto-desliga", m.g.position, { dist: DISTANCIA.padrao });
    m.casca.visible = false; const p = this.poolMotos.get(m.look) ?? []; p.push(m); this.poolMotos.set(m.look, p);
  }
  private renomearInst(de: string, para: string) { const m = this.instMotos.get(de); if (!m) return; this.instMotos.delete(de); this.instMotos.set(para, m); }

  /** as MOTOS a cada quadro: quem pegou moto de uma vaga (ela esvazia), os ROBÔS fabricando, as motos das vagas (se
   *  formando), e as INSTÂNCIAS (a minha e as dos outros: montadas e estacionadas). Devolve quem monta qual. */
  private atualizarMotos(dt: number, t: number): Map<Ator, MotoHandle> {
    const euId = this.o.eu.id;
    // 1) alguém (remoto) montou de uma VAGA → ela esvaziou (montar numa estacionada traz `de`)
    for (const a of this.remotos.values()) {
      const k = a.moto ? `${a.moto.s}|${a.moto.de ?? ""}` : "", antes = this.motoVista.get(a.id) ?? "";
      if (k && k !== antes && !a.moto!.de) this.tomarVaga(a.moto!.s);
      this.motoVista.set(a.id, k);
    }
    for (const id of this.motoVista.keys()) if (!this.remotos.has(id)) this.motoVista.delete(id);
    // alguém pegou a moto que eu tinha estacionado: ela é dele agora
    if (this.motoLargada && [...this.remotos.values()].some((a) => a.moto?.de === euId)) { this.motoLargada = null; this.soltarInst("eu:p"); }
    // 2) os ROBÔS: voam até a próxima vaga vazia, fabricam, voltam pra base
    const vs = vagas();
    for (const fb of this.fabricas) {
      const tr = fb.f.tarefa, base = baseDoRobo(fb.lote), yl = this.yDoLote(fb.lote);
      const alvo = tr ? { x: vs[tr.s]!.x, y: this.yDaVaga(vs[tr.s]!) + FABRICA.altura, z: vs[tr.s]!.z } : { x: base.x, y: yl + 1.6, z: base.z };
      const ant = fb.pos; fb.pos = moverRobo(fb.pos, alvo, dt);
      const dx = fb.pos.x - ant.x, dz = fb.pos.z - ant.z; if (Math.hypot(dx, dz) > 0.02) fb.rumo = Math.atan2(dx, dz);
      const chegou = Math.hypot(fb.pos.x - alvo.x, fb.pos.y - alvo.y, fb.pos.z - alvo.z) < 0.25;
      // o robô só sai depois que quem levou a moto FOI EMBORA (a vaga livre por FABRICA.espera s) e só fabrica com ela livre
      const pronta = passoFabrica(fb.f, dt, !!tr && chegou, (s) => this.vagaLivre(s));
      fb.robo.group.position.set(fb.pos.x, fb.pos.y, fb.pos.z);
      // a luz da fabricação fica na vaga em que ele trabalha; pronta → clarão (a luz acaba ali mesmo)
      if (fb.f.tarefa?.fase === "fabrica") fb.efeitoEm = fb.f.tarefa.s;
      if (pronta !== null) fb.robo.clarao();
      if (fb.efeitoEm !== null) { const v = vs[fb.efeitoEm]!; fb.robo.efeito.position.set(v.x, this.yDaVaga(v), v.z); }
      const fab = fb.f.tarefa?.fase === "fabrica" ? progressoDaVaga(fb.f, fb.f.tarefa.s) : null;
      if (this.regiaoPerto(fb.robo.group, "robo-motos")) fb.robo.atualizar({ dt, t, progresso: fab, rumo: fab !== null ? vs[fb.f.tarefa!.s]!.yaw : fb.rumo });
    }
    // 3) as motos das VAGAS: na vaga (a Zaeon flutua); vazia some; sendo fabricada vai SE FORMANDO de baixo pra cima
    this.vagaMotos.forEach((m, i) => {
      const v = vs[i]!, k = progressoDaVaga(this.fabricas[v.lote]!.f, i);
      m.moto.visible = k > 0.001; m.g.position.set(v.x, this.yDaVaga(v), v.z);
      const e = k >= 1 ? 1 : 0.02 + 0.98 * (1 - Math.pow(1 - k, 3)); m.moto.scale.set(1, e, 1);
      matrizSeMudou(m.g, matrizSeMudou(m.moto));   // parada na vaga: nem recalcula nem percorre o galho (components/cyber/matrizes)
    });
    // 4) as INSTÂNCIAS que devem existir agora (montadas e estacionadas)
    type Quer = { s: number; quem: Ator | null; pose?: { x: number; y: number; z: number; yaw: number } };
    const quer = new Map<string, Quer>();
    if (this.moto !== null) quer.set("eu:r", { s: this.moto, quem: this.eu });
    for (const a of this.remotos.values()) if (a.moto) quer.set(`${a.id}:r`, { s: a.moto.s, quem: a });
    for (const { dono, m } of this.largadasAgora()) quer.set(`${dono === euId ? "eu" : dono}:p`, { s: m.s, quem: null, pose: m });
    // a mesma moto troca de papel (montada ↔ estacionada) sem sumir: reaproveita a do outro papel, mesma vaga de origem
    for (const [k, q] of quer) {
      if (this.instMotos.has(k) && this.instMotos.get(k)!.s === q.s) continue;
      const irma = k.endsWith(":r") ? k.slice(0, -2) + ":p" : k.slice(0, -2) + ":r", im = this.instMotos.get(irma);
      if (im && im.s === q.s && !quer.has(irma)) { this.soltarInst(k); this.renomearInst(irma, k); }
      else if (this.instMotos.has(k)) this.soltarInst(k);
    }
    for (const k of [...this.instMotos.keys()]) if (!quer.has(k)) this.soltarInst(k);
    const montadas = new Map<Ator, MotoHandle>();
    for (const [k, q] of quer) {
      let m = this.instMotos.get(k); if (!m) { m = this.pegarInst(q.s); this.instMotos.set(k, m); }
      const quem = q.quem, g = m.g;
      let voando = false, vel = 0, inclina: number | undefined, boost = 0, guidao = 0;
      if (quem === this.eu) { const e = this.motoEst; g.position.set(e.x, e.y, e.z); g.rotation.y = e.yaw; voando = !this.motoPousado; vel = Math.hypot(e.vx, e.vz); inclina = e.inclina; boost = e.boost ? 1 : 0; guidao = e.guidao; }
      else if (quem?.moto) { g.position.set(quem.pos.x, quem.alt, quem.pos.z); g.rotation.y = quem.moto.yaw; voando = quem.moving || quem.alt > chaoDoVoo({ x: quem.pos.x, y: quem.alt, z: quem.pos.z }, this.solidosCidade) + 0.5;
        // a velocidade dos outros: MEDIDA pelo quanto a moto andou (suave) — esquenta a propulsão e afina o motor deles
        const d = m.pAnt && dt > 0 ? Math.hypot(g.position.x - m.pAnt.x, g.position.z - m.pAnt.z) / dt : 0;
        m.velMedida = d > 140 ? m.velMedida : m.velMedida + (d - m.velMedida) * Math.min(1, dt * 3); vel = quem.moving ? Math.max(8, m.velMedida) : m.velMedida * 0.5; }   // (pousada na Zaeon, a 450 m, não é "voando")
      else if (q.pose) { g.position.set(q.pose.x, q.pose.y, q.pose.z); g.rotation.y = q.pose.yaw; }
      (m.pAnt ??= new THREE.Vector3()).copy(g.position);
      if (quem) montadas.set(quem, m.h);
      let d = g.rotation.y - m.yawAnt; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; m.yawAnt = g.rotation.y;
      const y = g.position.y; m.vy = m.yAnt === null || dt <= 0 ? 0 : m.vy + ((y - m.yAnt) / dt - m.vy) * Math.min(1, dt * 4); m.yAnt = y;
      const curva = d / Math.max(dt, 1e-3);
      if (quem && quem !== this.eu) guidao = Math.max(-1, Math.min(1, -curva * 2.5));   // dos outros: o guidão sai do giro (direita = rumo diminui)
      const seta = quem && voando ? setaAcesa(guidao, t) : 0;
      m.h.atualizar({ dt, t, voando, vel, curva, vy: m.vy, inclina, boost, seta });
      // SOM por estágio (lib/cyber/somMoto): loops do motor (que faz a lenta)/vento/turbina + one-shots (partida, decola, boost,
      // freio, pouso, desliga — o pisca é só luz). A minha moto quase não paneia
      const minha = quem === this.eu, dist = minha ? DISTANCIA.naveLocal : DISTANCIA.padrao;
      const base = { voando, vel: vel / PILOTAGEM.vel, acel: minha ? this.acelMoto : quem?.moving ? 0.6 : 0, boost: boost > 0 };
      m.cambio = quem ? passoCambio(m.cambio, base, dt) : cambioNeutro();   // as marchas (a rotação sobe e cai na troca)
      const est: EstadoSomMoto = quem ? { montada: true, ...base, seta, rpm: m.cambio.rpm, marcha: m.cambio.marcha, corte: m.cambio.corte } : somMotoParada;
      for (const ev of eventosDaMoto(m.som, est)) this.som.tocar(ev, g.position, { dist, seguir: g });
      m.som = est;
      if (quem && !m.loops) m.loops = Object.fromEntries(LOOPS_MOTO.map((n) => [n, this.som.loop(n, g, { dist })])) as Record<(typeof LOOPS_MOTO)[number], LoopSom>;
      if (!quem && m.loops) { for (const l of Object.values(m.loops)) this.som.soltarLoop(l); m.loops = null; }
      if (m.loops) { const mix = mixDaMoto(est); for (const n of LOOPS_MOTO) { this.som.volumeLoop(m.loops[n], mix[n].vol, n === "moto-turbina" ? 6 : n === "moto-pipoco" ? 12 : undefined); this.som.taxaLoop(m.loops[n], mix[n].taxa, n.startsWith("moto-motor") ? 16 : undefined); } }
    }
    return montadas;
  }
  /** encaixa um avatar na moto: quadril no banco, mãos nos punhos, pés nas pedaleiras (IK do AvatarLuz) */
  private naMoto(av: AvatarLuzHandle, h: MotoHandle | undefined): Montado | null {
    if (!h) return null;
    h.group.updateWorldMatrix(true, true);
    h.assento.getWorldPosition(av.group.position); av.olharPara(h.group.rotation.y);
    const v = this.montadoTmp, p = h.pontos;
    p.maoE.getWorldPosition(v.maoE); p.maoD.getWorldPosition(v.maoD); p.peE.getWorldPosition(v.peE); p.peD.getWorldPosition(v.peD);
    return { w: 1, ...v };
  }
  /** as motos PARADAS na vaga são sólidas pra quem anda (círculo do tamanho do corpo) */
  private colisoresDeMotos(): Colisor[] {
    const out: Colisor[] = [], vs = vagas();
    vs.forEach((v, i) => { if (Math.abs(this.yDaVaga(v) - this.eu.alt) < 2.5) out.push({ x: v.x, z: v.z, r: PLATAFORMA_MOTO.r }); });   // a plataforma (com ou sem moto)
    for (const { m } of this.largadasAgora()) if (Math.abs(m.y - this.eu.alt) < 2.5) out.push({ x: m.x, z: m.z, r: 1.1 });   // as paradas no MEU nível
    return out;
  }
  /** altura do dorso da nave (onde se fica em pé) e o raio andável lá em cima */
  private topoNave(): number { return this.naveEst.y + 2.2 * ESCALA_NAVE_V; }
  private static readonly TOPO_NAVE_R = 2.2 * ESCALA_NAVE;
  /** o quanto a câmera se afasta (roda do mouse / pinça) — a nave-QG tem 68 m */
  private static readonly CAM_MAX = 70;
  /** colisores das naves PARADAS (o disco inteiro) pra quem anda/voa baixo no mesmo nível — não se atravessa a nave */
  private colisoresDeNaves(alt: number): Colisor[] {
    const R = 3.75 * ESCALA_NAVE, out: Colisor[] = [];
    if (this.saindoPelaRedoma) return [];   // saindo pela redoma: o próprio casco não empurra
    { const p = this.poseNave(); if (p && this.redomaChamando() && Math.hypot(this.eu.pos.x - p.x, this.eu.pos.z - p.z) < RAIO_REDOMA) return []; }   // entrando pelo vão da redoma
    const noCorpo = (y: number) => alt > y - 1 && alt < y + 2.2 * ESCALA_NAVE_V;   // o casco vai do chão até o dorso
    // o CORREDOR DA RAMPA (atrás da nave) fica aberto: o fim da rampa fica DENTRO do raio do casco — com o círculo
    // inteiro, ninguém chegava andando nela (pousada no chão, a nave ficava sem entrada)
    const naRampaDe = (p: PoseNave) => noCorredorDaRampa(p, this.eu.pos);
    if (this.nave && !this.pilotando && this.nave.group.visible && noCorpo(this.naveEst.y) && !naRampaDe(this.naveEst)) out.push({ x: this.naveEst.x, z: this.naveEst.z, r: R });
    for (const a of this.remotos.values()) if (a.nave && a.naveP && noCorpo(a.naveP.y) && !naRampaDe(a.naveP)) out.push({ x: a.naveP.x, z: a.naveP.z, r: R });
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
  private pilaresZaeon(z: LandmarkHandle): Pilar[] {
    const mn = marcoNav(z.poi), b = z.poi.base;
    const ps = mn ? pilaresDoMarco({ x: mn.x, z: mn.z, chaoR: mn.nav.chaoR, altura: (b ?? 0) + z.poi.altura + this.boia(z), escala: z.poi.escala ?? 1, cupula: !!z.topo }) : [];
    return b === undefined ? ps : ps.map((p) => ({ ...p, base: b - 1 }));   // apoiado no piso da Zaeon: sólido só dali pra cima
  }
  /** sólidos pra nave: os marcos andáveis como cilindros (quem vem de cima pousa no topo) */
  private solidosDeVoo(): Pilar[] { return [...this.solidosCidade, ...this.marcosNav().flatMap(({ lm }) => this.pilaresZaeon(lm)), ...(this.univ ? pilaresDasPlataformas() : []), ...this.pilaresDasIlhotas(), ...this.pilaresDaNaveQG()]; }
  /** a nave-QG parada é sólida pra quem voa (moto, a nave dos outros): pousa-se no dorso dela */
  private pilaresDaNaveQG(): Pilar[] { if (this.pilotando) return []; const p = this.poseNave(); return p ? [{ x: p.x, z: p.z, r: NAVE_QG.raio, topo: p.y + 2.2 * ESCALA_NAVE_V, base: p.y + 0.5 }] : []; }

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
  private boia(lm: LandmarkHandle | undefined) { return lm ? lm.group.position.y - (lm.poi.base ?? 0) - lm.poi.altura : 0; }
  private marcosNav(): { lm: LandmarkHandle; mn: MarcoNav }[] { return this.lms.flatMap((lm) => { const mn = marcoNav(lm.poi); return mn ? [{ lm, mn }] : []; }); }
  /** altura do chão em (x,z) na PRAÇA considerando os marcos andáveis dela (sem estado — remotos; quem está noutro
   *  lugar manda a altura na presença) */
  private alturaChao(p: { x: number; z: number }) {
    let y = 0;
    for (const { lm, mn } of this.marcosNav()) { if (!naPracaPOI(lm.poi)) continue; const h = alturaEm(mn, p); if (h > y) y = h + (h >= mn.nav.pisoY - 1e-6 ? this.boia(lm) : 0); }
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

  /** Passo na PRAÇA ou num marco andável (escada/plataforma — lib/cyber/nav) + os colisores (bases, outros marcos).
   *  A praça é uma ILHA: passou da borda, cai no vazio. Do pé da escada da Recepção volta-se pro piso da Zaeon. */
  private resolverChao(eu: Ator, prev: { x: number; z: number }, dt: number) {
    const navs = this.marcosNav();
    if (this.altoEm) {
      const cur = navs.find((n) => n.lm.poi.id === this.altoEm);
      if (cur) {
        const r = resolverPasso(cur.mn, true, prev, eu.pos);
        const q = r.alto ? empurrarParaFora(r, this.colisoresDoNivel("qg")) : r;   // a mesa da anfitriã no centro do salão
        eu.pos.x = q.x; eu.pos.z = q.z; this.yNav = r.y;
        if (!r.alto) { const naZaeon = cur.lm.poi.base !== undefined; this.altoEm = naZaeon ? "ceu" : null; this.yNav = naZaeon ? CIDADE.pisoY : 0; }
        return;
      }
      this.altoEm = null;
    }
    let q = { x: eu.pos.x, z: eu.pos.z };
    for (const { lm, mn } of navs) {
      if (!naPracaPOI(lm.poi)) continue;
      const r = resolverPasso(mn, false, prev, q);
      if (r.alto) { this.altoEm = lm.poi.id; this.yNav = r.y; eu.pos.x = r.x; eu.pos.z = r.z; return; }
      q = r;
    }
    q = empurrarParaFora(q, [...this.colisores, ...this.colisoresDeNaves(0), ...this.colisoresDeMotos(), ...this.colisoresDeAtores()]);
    eu.pos.x = q.x; eu.pos.z = q.z; this.yNav = 0;
    if (!this.jet.noAr && !naPraca(q)) this.cairDaqui({ x: (q.x - prev.x) / Math.max(dt, 1e-3), z: (q.z - prev.z) / Math.max(dt, 1e-3) });   // a borda da praça: o vazio (no ar a queda já é do passoNoAr)
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
      if (k === "f" && !this.menu) { if (!e.repeat) this.executarAcao(); e.preventDefault(); return; }
      if (k === "j" && !this.menu) { if (!e.repeat) this.alternarDescanso(); e.preventDefault(); return; }
      if (k === "c" && !this.menu) { if (!e.repeat) this.darDash(); e.preventDefault(); return; }   // C = DASH (o arranque — desvio)
      if (k === "x" && !this.menu) { if (!e.repeat) this.atacar(); e.preventDefault(); return; }   // X = ATACAR (o combo da espada; o clique também, com o mouse travado)   // J = sentar / deitar / levantar (lounge)
      if (k === "t" && !this.menu) { if (!e.repeat) this.alternarTablet(); e.preventDefault(); return; }     // T = o tablet (estudar por cima do cyberespaço)
      // HABILIDADES (lib/cyber/habilidades): G = o Droid companheiro (founder)
      const hab = this.menu ? null : habilidadeDaTecla(k, { fundador: this.ehFundador(this.o.eu.id), digitando: false, repetida: e.repeat, modificador: e.ctrlKey || e.metaKey || e.altKey });
      if (hab) { this.usarHabilidade(hab.id); e.preventDefault(); return; }   // F = a ação de contexto (estudar, montar, embarcar, descer…)
      if (k === "p" && (this.pilotando || this.moto !== null)) { this.pousar(); e.preventDefault(); return; }   // P = pousar (no desktop não há o botão)
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
      if (this.olharLivre) { if (e.pointerType === "mouse" && e.button === 0) this.atacar(); return; }   // mouse travado: o clique ATACA (com arma; as outras ações são no F)
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
        this.camSegueEm = performance.now() + 1500; this.camAz -= e.movementX * SENS_OLHAR; this.camPitch = limitarPitch(this.camPitch + e.movementY * SENS_OLHAR * 0.85);
        return;
      }
      if (this.ptrs.has(e.pointerId)) this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.ptrs.size === 2 && this.pinch0) { const [a, b] = [...this.ptrs.values()]; this.camDist = Math.min(CyberEngine.CAM_MAX, Math.max(6, (this.dist0 * this.pinch0) / Math.max(20, Math.hypot(a!.x - b!.x, a!.y - b!.y)))); this.moved = true; return; }
      if (!this.drag) { if (e.target === cv) this.passarMouse(e.clientX, e.clientY); return; }
      const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) this.moved = true;
      this.camSegueEm = performance.now() + 1500; this.camAz = this.drag.az - dx * 0.006; this.camPitch = limitarPitch(this.drag.pitch + dy * 0.005);   // arrastar pra baixo até o chão → olhar pro céu
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
    if (this.moto !== null) return this.desceDaMotoAqui() ? { id: "descer-moto", rotulo: "Descer da moto", fazer: () => this.desmontar() } : null;
    if (this.jet.noAr || this.nascendo || this.tunel || this.expulsando) return null;
    const el = this.plat ? elevadorAqui(this.plat.id, this.plat.andar, this.eu.pos) : null;
    if (el && this.plat) { const pl = this.plat; return { id: `elevador-${pl.andar}`, rotulo: el.rotulo, fazer: () => { pl.andar = el.proximo; this.som.tocar("near-ping", this.eu.av.group.position, { dist: DISTANCIA.eu }); } }; }
    const estudar = { id: "estudar", rotulo: "Estudar", fazer: () => this.o.onEntrarEstudo?.() };
    if (this.perto || this.noTopo) return estudar;
    const m = this.motoAoAlcance(); if (m) return { id: m.tipo === "vaga" ? `moto-${m.s}` : `moto-${m.dono}`, rotulo: "Montar na moto", fazer: () => { this.montar(m); } };
    if (this.nave && this.navePerto()) return { id: "entrar-nave", rotulo: "Entrar na nave", fazer: () => this.entrarNaNave() };
    if (this.noCeu && this.cidade?.tocaDiscos && this.ehFundador(this.o.eu.id)) {
      const td = this.cidade.tocaDiscos.getWorldPosition(this.tmp);
      if (Math.hypot(this.eu.pos.x - td.x, this.eu.pos.z - td.z) < 2.6) return { id: "som", rotulo: "Mesa do DJ", fazer: () => this.o.onAbrirSom?.() };
    }
    if (this.noCeu && this.cidade?.tvLounge && this.ehFundador(this.o.eu.id)) {
      const tv = this.cidade.tvLounge.getWorldPosition(this.tmp);
      if (Math.hypot(this.eu.pos.x - tv.x, this.eu.pos.z - tv.z) < 7) return { id: "recado", rotulo: "Escrever recado pro QG", fazer: () => this.o.onAbrirRecado?.() };
    }
    // na RECEPÇÃO, perto da mesa (o lar do Droid): chamar ele de novo (refaz o tutorial)
    if (!this.guia && this.droid && this.altoEm && !this.noCeu) { const c = this.casaDoAgente(); if (Math.hypot(this.eu.pos.x - c.x, this.eu.pos.z - c.z) < 5 && Math.abs(this.eu.alt - c.y) < 2.5) return { id: "chamar-droid", rotulo: `Chamar o ${DROID.nome}`, fazer: () => this.guiaRefazer() }; }
    let colega: Ator | null = null, dc = 3.0;
    for (const a of this.remotos.values()) { const d = Math.hypot(a.pos.x - this.eu.pos.x, a.pos.z - this.eu.pos.z); if (d < dc && Math.abs(a.alt - this.eu.alt) < 2) { dc = d; colega = a; } }
    if (colega) { const c = colega; return { id: `falar-${c.id}`, rotulo: `Falar com ${c.name}`, fazer: () => { this.falandoCom = c; this.alvo = null; this.o.onFalarCom?.(c.name); c.av.olharPara(Math.atan2(this.eu.pos.x - c.pos.x, this.eu.pos.z - c.pos.z)); } }; }
    // perto de um BURACO NEGRO da rede: F também entra (além de pisar no anel)
    { const no = this.noPerto(); if (no) return { id: `tunel-${no}`, rotulo: "Entrar no buraco negro", fazer: () => this.abrirTunel(no) }; }
    if ((!this.altoEm || this.noCeu) && !this.noTopo) {
      const poi = poiPerto(this.eu.pos, this.lms.map((l) => l.poi).filter((x) => !!x.link || x.acesso === "dono"));
      if (poi) return { id: `marco-${poi.id}`, rotulo: poi.nome, fazer: () => { this.alvo = null; this.o.onLandmark?.(poi); } };
    }
    return null;
  }
  /** F (ou o chip na tela): faz a ação de contexto de agora */
  executarAcao() { const a = this.acaoPerto(); if (a) a.fazer(); }
  /** o nó da rede de buracos negros perto (a até 2,5 m da borda do anel, no piso dele), ou null */
  private noPerto(): IdNo | null {
    if (this.menu || this.jet.noAr || this.moto !== null || this.pilotando || this.bordo || this.noTopo) return null;
    for (const id of Object.keys(NOS) as IdNo[]) {
      const n = NOS[id]; if (Math.abs(this.eu.alt - n.y) > 3) continue;
      if (Math.hypot(this.eu.pos.x - n.anel.x, this.eu.pos.z - n.anel.z) < n.anel.r + 2.5) return id;
    }
    return null;
  }
  /** entra no TÚNEL do buraco negro `origem`: fica parado e o React mostra os destinos (`viajarPeloTunel`) */
  private abrirTunel(origem: IdNo) {
    if (this.tunel) return;
    this.tunel = { origem, destinos: destinosDe(origem).filter((d) => d.id !== "zaeon" || !!this.cidade) };
    this.portalArmado = false; this.alvo = null; this.alvoDepois = null; this.sitT = 0;
    this.keys = {}; this.joy = { x: 0, y: 0, on: false };   // as teclas seguradas não continuam andando lá dentro
    this.som.tocar("rise", this.eu.av.group.position, { dist: DISTANCIA.perto });
    this.o.onTunel?.(this.tunel);
  }

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
    if (this.pilotando || this.moto !== null || this.nascendo || this.tunel) return;   // em voo, arrastar gira a câmera; clique não faz nada
    this.motoAlvo = null;
    const sob = this.monitorSob(cx, cy);
    this.ray.setFromCamera(this.ndc(cx, cy), this.cam);
    // uma MOTO parada: perto = monta; longe = anda até a vaga
    if (this.vagaMotos.length && (!this.altoEm || this.noCeu) && !this.noTopo) {
      // as candidatas: as motos prontas das vagas e as estacionadas, no MEU nível
      const cands: { alvo: AlvoMoto; alvos: THREE.Object3D[]; p: { x: number; y: number; z: number; yaw: number } }[] = [];
      vagas().forEach((v, i) => { if (this.vagaPronta(i)) cands.push({ alvo: { tipo: "vaga", s: i }, alvos: this.vagaMotos[i]!.alvos, p: { x: v.x, y: this.yDaVaga(v), z: v.z, yaw: v.yaw } }); });
      for (const { dono, m } of this.largadasAgora()) { const im = this.instMotos.get(`${dono === this.o.eu.id ? "eu" : dono}:p`); if (im) cands.push({ alvo: { tipo: "largada", dono, s: m.s }, alvos: im.h.alvos, p: m }); }
      const c = cands.find((x) => Math.abs(x.p.y - this.eu.alt) < 2.5 && this.ray.intersectObjects(x.alvos, true).length > 0);
      if (c) {
        if (!this.montar(c.alvo)) { const lx = Math.cos(c.p.yaw), lz = -Math.sin(c.p.yaw); this.alvo = new THREE.Vector2(c.p.x + lx * 1.4, c.p.z + lz * 1.4); this.alvoDepois = null; this.falandoCom = null; this.motoAlvo = c.alvo; }
        return;
      }
    }
    // a NAVE (perto da porta) → entrar
    if (this.nave && this.ray.intersectObjects(this.nave.alvos, true).length && this.navePerto()) { this.entrarNaNave(); return; }
    // na CIDADE: a minha base = Sala de Estudos; senão anda no piso
    if (this.cidade && this.noCeu) {
      if (sob === this.o.eu.id && this.perto) { this.o.onEntrarEstudo?.(); return; }   // a minha base, na Zaeon
      // a TV do LOUNGE: o dono escreve o recado pro QG do Andrei (perto dela)
      if (this.cidade.tvLounge && this.ray.intersectObject(this.cidade.tvLounge, false).length) {
        const tv = this.cidade.tvLounge.getWorldPosition(new THREE.Vector3());
        if (Math.hypot(this.eu.pos.x - tv.x, this.eu.pos.z - tv.z) < 14) { this.o.onAbrirRecado?.(); return; }
      }
      const h = this.ray.intersectObjects(this.cidade.alvos, true)[0];
      if (h) { const q = resolverCidade({ x: h.point.x, z: h.point.z }); this.alvo = new THREE.Vector2(q.x, q.z); this.alvoDepois = null; }
      return;
    }
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
    const h = this.praca ? this.ray.intersectObject(this.praca.piso)[0] : undefined;   // o piso da praça (fora dela é o vazio)
    if (h) { const p = empurrarParaFora({ x: h.point.x, z: h.point.z }, this.colisores); this.alvo = new THREE.Vector2(p.x, p.z); this.alvoDepois = null; this.falandoCom = null; this.o.onFalarCom?.(null); }
  }

  private redimensionar() {
    const c = this.o.container; this.w = Math.max(1, c.clientWidth); this.h = Math.max(1, c.clientHeight);
    this.R.setSize(this.w, this.h, false); this.cam.aspect = this.w / this.h; this.cam.updateProjectionMatrix();
  }

  private vProj = new THREE.Vector3(); private vHud = new THREE.Vector3(); private vCamA = new THREE.Vector3(); private vCamB = new THREE.Vector3();
  private proj(v: THREE.Vector3) { const p = this.vProj.copy(v).project(this.cam); return { x: (p.x * 0.5 + 0.5) * this.w, y: (-p.y * 0.5 + 0.5) * this.h, vis: p.z < 1 }; }
  /** põe um rótulo do HUD no ponto (x,y) da tela por TRANSFORM (só compõe: não refaz o layout) e só escreve o que mudou */
  private noHud(el: HTMLElement, x: number, y: number, vis: boolean) {
    const d = vis ? "block" : "none"; if (el.style.display !== d) el.style.display = d;
    if (vis) el.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-100%)`;
  }

  /** a região dessa raiz deve ANIMAR neste quadro? Cria a região na 1ª vez; de longe esconde o detalhe e, bem longe,
   *  a região inteira (pela posição da câmera do quadro anterior — a diferença de um quadro não se vê) */
  private regiaoPerto(raiz: THREE.Object3D, nome: string, area?: () => Regiao): boolean {
    let r = this.regioes.get(raiz);
    if (!r) { r = criarRegiao(nome, raiz, { area }); this.regioes.set(raiz, r); }
    return atualizarRegiao(r, this.cam.position);
  }
  /** lotes da base: simula perto/longe, hover e energia (a tela, os cristais e as linhas reagem) */
  private loteBase(b: BaseEstudoHandle) {
    fundirEstaticos(b.group, { passo: (k, t) => b.atualizar({ dt: 1 / 30, t, ativa: k % 2 === 0, hover: k % 3 === 0, perto: k % 4 < 2, energia: (k % 5) / 4 }), manter: comDescendentes([b.monitor]) });
    for (let k = 0; k < 6; k++) b.atualizar({ dt: 1, t: 0, ativa: false, hover: false, perto: false, energia: 0 });   // volta ao repouso
    // todas as bases desenhadas JUNTAS (components/cyber/poolGemeos): cada peça uma malha instanciada pra todas
    if (!this.poolBases) { this.poolBases = criarPoolGemeos({ max: 64, nome: "pool-bases" }); this.cena.scene.add(this.poolBases.grupo); }
    this.poolBases.registrar(b.group, [b.monitor]);
  }
  /** aplica o degrau da qualidade adaptativa: resolução (o pixel ratio do perfil × o degrau) e a aura dos avatares
   *  (a nebulosa lê o degrau direto no desenho) — nada recompila */
  private aplicarQualidade() {
    const d = this.qa.atual;
    this.R.setPixelRatio(this.prBase * d.dpr);
    for (const a of [this.eu, ...this.remotos.values()]) a?.av.aura(d.aura);
  }
  private soltar(raiz: THREE.Object3D) { const r = this.regioes.get(raiz); if (r) { soltarRegiao(r); this.regioes.delete(raiz); } }

  private atualizarCamera(dt = 1 / 60) {
    const l = this.minhaBase;
    if (this.menu && l) {
      const pm = Math.min(2.4, Math.max(1, 0.9 / this.cam.aspect));   // retrato: afasta p/ caber a base
      const rel = localParaMundo(l, -2.6 * pm, 4.8 * pm);
      const yb = this.yDoNivel(l.nivel);
      this.cam.position.lerp(this.vCamA.set(rel.x, yb + 2.5 + 0.9 * (pm - 1), rel.z), 0.06);
      this.camT.lerp(this.vCamA.set(l.x, yb + (pm > 1 ? 0.1 : 1.4), l.z), 0.06); this.cam.lookAt(this.camT);
      return;
    }
    // de moto o alvo segue por TEMPO (não por quadro): a 60 m/s, 0,12/quadro deixava a câmera ~17 m pra trás; assim
    // fica ~v/12 (≈ 5 m no boost) — a moto "puxa" um pouco à frente, que dá a sensação de arrancada
    this.camT.lerp(this.vCamA.set(this.eu.pos.x, 1.2 + this.eu.alt, this.eu.pos.z), this.moto !== null ? 1 - Math.exp(-dt * 12) : 0.12);
    const cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch);
    // MOTO: câmera de perseguição — volta sozinha pra TRÁS da moto (com atraso: a curva aparece na tela), a não ser
    // que a pessoa tenha mexido o mouse/arrastado há pouco; afasta um pouco com a velocidade
    if (this.moto !== null && performance.now() > this.camSegueEm) {
      let d = this.motoEst.yaw + Math.PI - this.camAz; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.camAz += d * (1 - Math.exp(-dt * 2.6));
    }
    let dist = this.pilotando ? Math.max(this.camDist, 75) : this.moto !== null ? Math.max(this.camDist, 9) + 2.2 * this.velTela : this.camDist + 1.6 * this.velTela;   // (a pé/mochila rápido: a câmera recua um pouco)
    // câmera em 3ª pessoa: perto de um marco (ilha flutuante, muralhas), se a estrutura fica ENTRE a câmera e o
    // personagem, a câmera se aproxima (senão a ilha cobre a tela)
    const marco = this.lms.find((l) => Math.hypot(this.eu.pos.x - l.poi.x, this.eu.pos.z - l.poi.z) < l.poi.interactR * 1.8);
    if (marco && !this.noTopo) {
      const alvoOlho = this.vCamA.set(this.camT.x, this.camT.y + 0.8, this.camT.z);
      const dir = this.vCamB.set(Math.sin(this.camAz) * cp, sp, Math.cos(this.camAz) * cp).normalize();
      this.rayCam.set(alvoOlho, dir); this.rayCam.far = dist;
      const h = this.rayCam.intersectObjects(marco.alvos, true)[0];
      if (h) dist = Math.max(2.2, h.distance - 0.6);
    }
    // num campus: um prédio entre a câmera e o personagem → a câmera se aproxima
    const campusAqui = this.plat ? this.campi.find((c) => c.id === this.plat!.id) : undefined;
    if (campusAqui) {
      const alvoOlho = this.vCamA.set(this.camT.x, this.camT.y + 0.8, this.camT.z);
      const dir = this.vCamB.set(Math.sin(this.camAz) * cp, sp, Math.cos(this.camAz) * cp).normalize();
      this.rayCam.set(alvoOlho, dir); this.rayCam.far = dist;
      const h = this.rayCam.intersectObjects(campusAqui.h.alvosCamera, false)[0];
      if (h) dist = Math.max(2.2, h.distance - 0.6);
    }
    // na universidade: muralhas, paredes, torres e telhados entre a câmera e o personagem → a câmera se aproxima
    if (this.univ && this.plat?.id === "univ" && naUniversidade(this.eu.pos)) {
      const alvoOlho = this.vCamA.set(this.camT.x, this.camT.y + 0.8, this.camT.z);
      const dir = this.vCamB.set(Math.sin(this.camAz) * cp, sp, Math.cos(this.camAz) * cp).normalize();
      this.rayCam.set(alvoOlho, dir); this.rayCam.far = dist;
      const h = this.rayCam.intersectObjects(this.univ.alvosCamera, false)[0];
      if (h) dist = Math.max(2.2, h.distance - 0.6);
    }
    // órbita livre: por cima olha pro personagem; arrastando pra baixo encosta no chão e o olhar sobe pro céu
    const c = poseDaCamera({ olho: { x: this.camT.x, y: this.camT.y + 0.8, z: this.camT.z }, az: this.camAz, pitch: this.camPitch, dist, chaoY: this.eu.alt });
    this.cam.position.set(c.pos.x, c.pos.y, c.pos.z);
    this.cam.lookAt(c.olhar.x, c.olhar.y, c.olhar.z);
    // SENSAÇÃO DE VELOCIDADE (moto): o FOV abre com a velocidade (+12°, ~+14° no boost) e, no boost, a câmera treme de leve
    // a pé / mochila: a velocidade de verdade no plano (sprint, dash, voo turbo — lib/cyber/movimento); teleporte não conta
    if (this.posAnt) { const v = Math.hypot(this.eu.pos.x - this.posAnt.x, this.eu.pos.z - this.posAnt.z) / Math.max(dt, 1e-3); this.velPlano += ((v > 80 ? 0 : v) - this.velPlano) * Math.min(1, dt * 10); }
    this.posAnt = { x: this.eu.pos.x, z: this.eu.pos.z };
    const aPe = this.moto === null && !this.pilotando && !this.menu ? sensacaoAPe(this.velPlano, this.jet.noAr) : 0;
    const alvoVel = Math.max(this.moto !== null && !this.motoPousado ? sensacaoDeVelocidade(this.motoEst) : 0, aPe);
    this.velTela += (alvoVel - this.velTela) * (1 - Math.exp(-dt * (alvoVel > this.velTela ? 3 : 1.8)));
    if (!this.fovBase) this.fovBase = this.cam.fov;
    const fov = this.fovBase + 12 * Math.min(1.15, this.velTela);
    if (Math.abs(fov - this.cam.fov) > 0.02) { this.cam.fov = fov; this.cam.updateProjectionMatrix(); }
    // tremor: no boost, mais acima da barreira do som e um SOCO na hora em que ela quebra
    if (this.ondaT >= 0) { this.ondaT += dt; if (this.ondaT > 1.2 || this.moto === null) this.ondaT = -1; }
    if (this.moto !== null && this.motoEst.boost) {
      const sup = supersonico(Math.hypot(this.motoEst.vx, this.motoEst.vz), true), soco = this.ondaT >= 0 ? 0.35 * Math.exp(-this.ondaT * 5) : 0;
      const a = 0.045 * this.velTela * (1 + sup) + soco, t = performance.now() * 0.001;
      this.cam.position.x += Math.sin(t * 47) * a; this.cam.position.y += Math.sin(t * 61 + 1) * a;
    }
    // VOO TURBO: a câmera vibra de leve com a velocidade; IMPACTO: o tranco que se desfaz em ~0,4 s
    if (this.moto === null && this.jet.noAr && this.velTela > 0.5) { const a = 0.03 * this.velTela, t = performance.now() * 0.001; this.cam.position.x += Math.sin(t * 43) * a; this.cam.position.y += Math.sin(t * 57 + 1) * a; }
    if (this.tremor > 0.002) { const t = performance.now() * 0.001, a = this.tremor; this.cam.position.x += Math.sin(t * 71) * a; this.cam.position.y += Math.sin(t * 89 + 2) * a * 1.4; this.cam.position.z += Math.sin(t * 53 + 4) * a; this.tremor *= Math.exp(-dt * 7); }
    this.fxMov?.atualizar(dt);
  }

  /** as entradas da MOTO: W/S (ou joystick pra frente/trás, ▲▼) = acelerador/freio; A/D (joystick de lado, ◀▶) = guidão;
   *  Espaço/E/SUBIR sobe; Q/DESCER desce; Shift ou ⚡ = boost. Não é relativo à câmera: W é sempre a frente da moto */
  private comandoDeMoto(): ComandoMoto {
    let acel = 0, giro = 0;
    if (this.keys.w || this.keys.arrowup) acel += 1; if (this.keys.s || this.keys.arrowdown) acel -= 1;
    if (this.keys.a || this.keys.arrowleft) giro -= 1; if (this.keys.d || this.keys.arrowright) giro += 1;
    if (this.joy.on) { acel -= this.joy.y; giro += this.joy.x; }
    acel -= this.botDir.z; giro += this.botDir.x;
    const subir = this.voY.subir, descer = this.voY.descer, boost = !!this.keys.shift || this.boostBotao;
    if (acel || subir || descer) this.autoPouso = false;
    return { acel: Math.max(-1, Math.min(1, acel)), giro: Math.max(-1, Math.min(1, giro)), subir, descer: descer || this.autoPouso, boost };
  }
  // ───────────── CORRIDAS ─────────────
  /** LARGA uma corrida (precisa estar na moto): a moto vai pro GRID da pista, tanque cheio, e começa a contagem */
  iniciarCorrida(id: string): boolean {
    const p = pistaPorId(id); if (!p || this.moto === null) return false;
    const g = p.grid;
    this.motoEst = { ...motoParada(g.x, g.y, g.z, g.rumo), tanque: 1 }; this.motoPousado = false; this.autoPouso = false;
    this.voY.subir = this.voY.descer = false; this.camAz = g.rumo + Math.PI; this.camSegueEm = 0;
    this.corrida = { c: novaCorrida(p), pista: p, melhor: lerMelhor(p.id) };
    this.pistas?.definir({ pista: p.id, proximo: 1 });
    return true;
  }
  /** abandona a corrida (ou fecha o resultado) */
  sairCorrida() { if (!this.corrida) return; this.corrida = null; this.pistas?.definir(null); this.o.onCorrida?.(null); }
  /** um quadro da corrida: a moto foi de `de` até onde está agora */
  private passoDaCorrida(de: { x: number; y: number; z: number }, dt: number) {
    const k = this.corrida!, m = this.motoEst;
    if (k.c.fase === "contagem") { const g = k.pista.grid; this.motoEst = { ...m, x: g.x, y: g.y, z: g.z, vx: 0, vy: 0, vz: 0, yaw: g.rumo }; }
    const r = passoCorrida(k.c, k.pista, de, { x: this.motoEst.x, y: this.motoEst.y, z: this.motoEst.z }, dt, k.melhor?.parciais);
    k.c = r.c; this.pistas?.definir({ pista: k.pista.id, proximo: k.c.proximo });
    for (const e of r.eventos) {
      if (e.tipo === "contagem") this.som?.tocar("corrida-bip");
      else if (e.tipo === "largou") this.som?.tocar("corrida-largada");
      else if (e.tipo === "portao") this.som?.tocar("corrida-portao");
      else if (e.tipo === "boost") { this.som?.tocar("corrida-boost"); this.motoEst = { ...this.motoEst, tanque: 1 }; }   // portão de boost: tanque cheio
      else if (e.tipo === "volta") this.som?.tocar(k.c.fase === "fim" ? "corrida-fim" : "corrida-volta");
      else if (e.tipo === "fim" && (!k.melhor || e.total < k.melhor.total)) gravarMelhor(k.pista.id, { parciais: k.c.parciais, total: e.total });
      this.o.onCorrida?.({ ...e, pista: k.pista.id });
    }
  }
  /** o HUD da corrida (null fora dela) */
  get corridaHud(): HudCorrida | null {
    const k = this.corrida; if (!k) return null;
    const c = k.c, g = k.pista.portoes[c.proximo]!, m = this.motoEst;
    this.cam.getWorldDirection(this.vCorrida);
    const frente = Math.atan2(this.vCorrida.x, this.vCorrida.z), alvo = Math.atan2(g.x - m.x, g.z - m.z);
    let seta = frente - alvo; while (seta > Math.PI) seta -= 2 * Math.PI; while (seta < -Math.PI) seta += 2 * Math.PI;
    return {
      pista: k.pista.id, nome: k.pista.nome, fase: c.fase, contagem: Math.max(0, Math.ceil(CONTAGEM - c.t)), tempo: tempoDeCorrida(c),
      volta: Math.min(c.volta + 1, k.pista.voltas), voltas: k.pista.voltas, portao: c.proximo === 0 ? k.pista.portoes.length : c.proximo, nPortoes: k.pista.portoes.length,
      tempos: c.voltas, total: c.total, seta, dist: Math.hypot(g.x - m.x, g.z - m.z),
    };
  }
  private vCorrida = new THREE.Vector3();
  /** botão ⚡ (segurar) da moto */
  boostMoto(v: boolean) { this.boostBotao = v; }
  /** o tanque de boost (0..1) e se está aceso — o HUD lê */
  get tanqueMoto() { return this.moto === null ? null : { tanque: this.motoEst.tanque, aceso: this.motoEst.boost }; }

  // ───────────── loop ─────────────
  private loop(now: number) {
    if (!this.vivo) return;
    this.raf = requestAnimationFrame((t) => this.loop(t));
    // limite de fps no COMPASSO (o relógio segue: o dt do próximo quadro cobre o pulo); na janela da landing (menu,
    // vista de fora) basta 30 fps
    const q = proximoQuadro(this.menu ? (this.fpsMax > 0 ? Math.min(this.fpsMax, 30) : 30) : this.fpsMax, now, this.ultimoQuadro);
    if (this.pausado || q.pular) return;
    this.ultimoQuadro = q.ultimo;
    const dtReal = Math.min(VOO.dtMax, this.clock.getDelta()), dt = Math.min(0.05, dtReal), t = now * 0.001;   // o voo usa o dt REAL (independente de FPS)
    if (!this.visivel || document.hidden) return;
    atualizarCamuflagem(t);   // o relógio único de todos os hologramas do mapa
    const eu = this.eu, euId = this.o.eu.id; this.tAnt = this.agora; this.agora = t;

    // MENU: segurar ESPAÇO p/ viajar; personagem fica sentado contemplando
    if (this.menu) {
      if (this.espaco) { this.holdT += dt; if (this.o.els.hold) this.o.els.hold.style.width = Math.min(100, (this.holdT / 1.2) * 100) + "%"; if (this.holdT >= 1.2) this.iniciar("viajar"); }
      else if (this.holdT > 0) { this.holdT = Math.max(0, this.holdT - dt * 2); if (this.o.els.hold) this.o.els.hold.style.width = (this.holdT / 1.2) * 100 + "%"; }
      const s = this.assento(); eu.pos.set(s.x, 0, s.z); eu.facing = this.rotAssento(); this.sitT = 1; eu.moving = false;
    } else if (this.moto !== null) {
      // MOTO: pilotagem de moto (lib/cyber/motoFisica) — W/S acelera/freia, A/D esterça, Shift/⚡ boost
      const c = this.comandoDeMoto(); this.acelMoto = c.acel;
      const deCorrida = { x: this.motoEst.x, y: this.motoEst.y, z: this.motoEst.z };
      if (this.corrida?.c.fase === "contagem") { c.acel = 0; c.boost = false; c.subir = c.descer = false; }   // no grid: o motor ronca, a moto não sai
      const boostAntes = this.motoEst.boost;
      const r = passoMotoSub(this.motoEst, c, dtReal, this.solidosDeVoo(), MOTO.teto);
      if (!r.pousado && rompeuBarreira(boostAntes, r.s.boost, Math.hypot(r.s.vx, r.s.vz))) this.ondaT = 0;   // acendeu o boost rápido: quebrou a barreira do som
      this.motoEst = r.s; this.motoPousado = r.pousado; if (r.pousado) this.autoPouso = false;
      if (this.corrida) this.passoDaCorrida(deCorrida, dtReal);
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
      if (this.nascendo || this.tunel) { ix = 0; iz = 0; this.alvo = null; this.alvoDepois = null; }   // dentro do tubo / do túnel: parado
      const correndo = this.keys.shift || this.correr;
      let andando = false;
      if (this.bordo) { const pn = this.poseNave(); if (pn) { const w = paraMundo(pn, this.bordo); eu.pos.x = w.x; eu.pos.z = w.z; } }   // a nave pode ter andado (o dono pilotando)
      if (this.tabletQuer || this.labAberto) { ix = 0; iz = 0; this.alvo = null; this.alvoDepois = null; }   // estudando no tablet: o avatar fica onde está
      { const d = this.descanso;   // DESCANSO: andou/pulou/subiu na moto → levanta; sentando/levantando, o corpo é da animação
        if (d) {
          const fr = d.lugar.frentes[d.assento]!;
          if (!this.aPeLivre()) { this.descanso = null; }
          else if (d.fase === "indo") { if (ix || iz || (this.alvo && Math.hypot(this.alvo.x - fr.x, this.alvo.y - fr.z) > 0.05)) this.descanso = null; else if (!this.alvo) { if (Math.hypot(eu.pos.x - fr.x, eu.pos.z - fr.z) < 0.5) { d.fase = "sentando"; d.t = 0; } else this.descanso = null; } }
          else { if ((ix || iz || this.alvo) && d.fase === "parado") this.levantar(); ix = 0; iz = 0; this.alvo = null; this.alvoDepois = null; }
        } }
      this.lancarDecolagem();
      if (this.jet.noAr) this.altMaxVoo = Math.max(this.altMaxVoo, this.jet.y);
      if (this.agora - this.tHeroi < HEROI.trava || this.agora < this.caidoAte) { ix = 0; iz = 0; }   // cravou no chão / caído: parado
      const prev = { x: eu.pos.x, z: eu.pos.z };
      const dir = moverRelativoCamera(ix, iz, this.camAz);
      // correr segurado ANDANDO vira SPRINT (2× a corrida) depois de ~0,7 s (lib/cyber/movimento)
      this.tCorrendo = correndo && dir && !this.jet.noAr ? this.tCorrendo + Math.min(0.25, this.agora - this.tAnt) : 0;   // (pelo relógio: com fps baixo o dt é cortado)
      this.velAPe = velocidadeAPe(!!correndo, this.tCorrendo);
      const vel = (this.noTopo ? 2 : this.velAPe) * (this.ataque && !golpeAcabou(this.ataque, this.agora) ? 0.25 : 1);   // no topo: passos curtos; golpeando: quase parado
      const turbo = (this.keys.shift || this.correr) && this.jet.noAr ? VOO_TURBO : 1;   // no ar, correr = VOO TURBO (2× os jatos)
      if (this.jet.noAr) {
        // NO AR: o IMPULSO da mochila move — W (frente) a toda, lados/trás mais devagar; soltou, segue no embalo
        const frente = iz < -0.3 && Math.abs(ix) <= Math.abs(iz) + 1e-6;
        this.impulsoFrente = !!dir && frente;
        this.jetV = passoHorizontalJet(this.jetV, dir ? { x: dir.wx * (frente ? JET.velFrente : JET.velLado) * turbo, z: dir.wz * (frente ? JET.velFrente : JET.velLado) * turbo } : null, dt);
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
      // o DASH: bateu em alguma coisa no passo anterior (andou bem menos que o pedido) → IMPACTO e acaba
      if (this.dash && this.dashUlt && !this.jet.noAr && Math.hypot(eu.pos.x - this.dashUlt.x, eu.pos.z - this.dashUlt.z) < this.dashUlt.esperado * 0.35) {
        this.impacto(0.55); this.dash = null; this.dashUlt = null;
      }
      { const p = passoDash(this.dash, this.tAnt || t, t), estava = this.dashAtivo; this.dashAtivo = !!p;
        if (estava && !p && !this.jet.noAr) { this.tFimDash = t; this.som.tocar("alerta", eu.av.group.position, { dist: DISTANCIA.eu, volume: 1, taxa: 0.96 + Math.random() * 0.08 }); }   // acabou o dash no chão: entra em GUARDA
        if (p) {
          if (this.jet.noAr) this.jetV = { x: this.dash!.dir.x * DASH.vel, z: this.dash!.dir.z * DASH.vel };   // no ar: o embalo do arranque
          else { this.dashUlt = { x: eu.pos.x, z: eu.pos.z, esperado: Math.hypot(p.x, p.z) }; eu.pos.x += p.x; eu.pos.z += p.z; }   // (de onde saiu e quanto pediu: o próximo quadro vê se andou)
          eu.facing = Math.atan2(this.dash!.dir.x, this.dash!.dir.z); andando = true;
          this.fantasmaT -= dt; if (this.fantasmaT <= 0) { this.fantasmaT = 0.03; this.fxMov ??= criarEfeitosMovimento(this.cena.scene); this.fxMov.fantasma(eu.av.group.position, eu.facing, this.corDe(euId)); this.fxMov.vento(eu.av.group.position, this.dash!.dir, this.corDe(euId), 3, 3); }
        } else this.dashUlt = null;
      }
      // o SPRINT também deixa rastro (mais fraco, mais espaçado) e a corrida ninja; voando, de moto ou parado: sem guarda
      const sprintando = andando && !this.jet.noAr && this.velAPe > 11.5;
      this.wSprint += ((sprintando ? 1 : 0) - this.wSprint) * Math.min(1, dt * 7);
      this.wDash += ((this.dashAtivo ? 1 : 0) - this.wDash) * Math.min(1, dt * (this.dashAtivo ? 30 : 9));
      if (sprintando && !this.dashAtivo) { this.fantasmaT -= dt; if (this.fantasmaT <= 0) { this.fantasmaT = 0.045; this.fxMov?.vento(eu.av.group.position, { x: Math.sin(eu.facing), z: Math.cos(eu.facing) }, this.corDe(euId), 2); } }   // (sprint: só os riscos de vento)
      if (this.jet.noAr || sprintando) this.tFimDash = -Infinity;
      this.passoCombate(eu, t, dt, andando);
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
      else if (this.descanso && this.descanso.fase !== "indo") {   // SENTANDO/SENTADO/DEITADO/LEVANTANDO: o corpo está NO móvel (sem colisão)
        const d = this.descanso, fr = d.lugar.frentes[d.assento]!, ps = poseNoLugar(d.lugar, d.modo, d.assento), ease = (u: number) => u * u * (3 - 2 * u);
        d.t += dt; andando = false; this.yNav = CIDADE.pisoY; eu.facing = d.modo === "deitado" ? ps.rumo : d.lugar.rumo;
        if (d.fase === "sentando") {   // de costas pro móvel, abaixa recuando até o assento
          const u = ease(Math.min(1, d.t / SENTAR.desce)); eu.pos.x = fr.x + (ps.x - fr.x) * u; eu.pos.z = fr.z + (ps.z - fr.z) * u;
          if (d.t >= SENTAR.desce) { d.fase = "parado"; d.t = 0; }
        } else if (d.fase === "levantando") {   // sobe e dá o passo pra frente
          const u = ease(Math.min(1, d.t / SENTAR.sobe)); eu.pos.x = ps.x + (fr.x - ps.x) * u; eu.pos.z = ps.z + (fr.z - ps.z) * u;
          if (d.t >= SENTAR.sobe) { eu.pos.x = fr.x; eu.pos.z = fr.z; this.descanso = null; }
        } else { const k = Math.min(1, dt * 5); eu.pos.x += (ps.x - eu.pos.x) * k; eu.pos.z += (ps.z - eu.pos.z) * k; }   // sentado ↔ deitado
      }
      else if (this.sitT > 0.05) { const s = this.assento(); eu.pos.x += (s.x - eu.pos.x) * Math.min(1, dt * 3); eu.pos.z += (s.z - eu.pos.z) * Math.min(1, dt * 3); eu.facing = this.rotAssento(); }
      else if (this.noTopo) { const e = this.eixoTopo()!, lim = 2.0 * this.escalaZaeon(); const dx = eu.pos.x - e.x, dz = eu.pos.z - e.z, d = Math.hypot(dx, dz); if (d > lim) { eu.pos.x = e.x + (dx / d) * lim; eu.pos.z = e.z + (dz / d) * lim; } }   // não cai da plataforma
      else if (this.noCeu && this.viagem) {
        // a ESCADA DE ENERGIA leva: a posição segue o fluxo (as teclas não mexem), sem passo nem pulo
        const v = this.viagem; v.t += dt; const k = Math.min(1, v.t / (v.tipo === "escada" ? VIAGEM_ESCADA.dur : TORRE_DJ.elevador.dur)), q = posDaViagem(v.tipo, v.sentido, k, v.sala);
        eu.pos.x = q.p.x; eu.pos.z = q.p.z; eu.facing = q.rumo; andando = false; this.alvo = null; this.alvoDepois = null;
        if (k >= 1) { this.viagem = null; this.som.tocar("near-ping", eu.av.group.position, { dist: DISTANCIA.perto }); }
      }
      else if (this.noCeu) {
        // a RECEPÇÃO e os MIRANTES ficam no piso da Zaeon: do pé da escada sobe-se pro salão; a ilha (o cone) é sólida
        for (const rc of this.marcosDaZaeon()) { const r = resolverPasso(rc.mn, false, prev, eu.pos); eu.pos.x = r.x; eu.pos.z = r.z; if (r.alto) { this.altoEm = rc.lm.poi.id; this.yNav = r.y; break; } }
        // sem parede invisível na borda: passou do piso da ilha → cai
        const q = this.noCeu ? empurrarParaFora(resolverCidadeLivre(eu.pos), [...this.colisoresDoNivel("ceu"), ...this.colisoresDeNaves(CIDADE.pisoY), ...this.colisoresDeMotos(), ...this.colisoresDosTubos(), ...this.colisoresDeAtores()]) : { x: eu.pos.x, z: eu.pos.z }; eu.pos.x = q.x; eu.pos.z = q.z; if (this.noCeu) this.yNav = CIDADE.pisoY;
        if (!this.noCeu) { /* subiu pro pé da escada da Recepção: o resto é dela (resolverChao) */ }
        else if (!naIlhaPrincipal(q)) this.cairDaqui({ x: (q.x - prev.x) / Math.max(dt, 1e-3), z: (q.z - prev.z) / Math.max(dt, 1e-3) });
        // pisou na boca da escada de energia: ela te leva (pra cima, da central; pra baixo, do lounge)
        // (ou no anel do ELEVADOR DE LUZ da torre do DJ: só desce, da cabine até o palco)
        else {
          const be = bocaDoElevador(q), bs = be ? null : bocaDeEscada(q);
          let boca = be ?? bs?.sentido ?? null;
          if (bs && boca && this.noFio(bs.sala) >= FIO.max) {   // o FIO já está puxando o máximo de gente: espera
            boca = null;
            if (t - this.avisoFioCheio > 4) { this.avisoFioCheio = t; this.o.onAviso?.(`Este fio de energia já está puxando ${FIO.max} pessoas — espere um instante.`); }
          }
          if (boca && !this.jet.noAr) { this.viagem = { tipo: be ? "elevador" : "escada", sentido: boca, t: 0, sala: bs?.sala }; this.alvo = null; this.alvoDepois = null; this.som.tocar("rise", eu.av.group.position, { dist: DISTANCIA.perto }); }
        }
      }
      else if (this.plat) {   // num LUGAR FLUTUANTE: anda com as colisões do andar; passou da borda do disco → cai
        const r0 = andarNaPlataforma(this.plat.id, this.plat.andar, eu.pos), r1 = empurrarParaFora(r0, this.colisoresDeAtores()), r = { ...r0, x: r1.x, z: r1.z }; eu.pos.x = r.x; eu.pos.z = r.z;
        if (r.fora) this.cairDaqui({ x: (eu.pos.x - prev.x) / Math.max(dt, 1e-3), z: (eu.pos.z - prev.z) / Math.max(dt, 1e-3) });
      }
      else if (this.ilhota !== null) {   // em pé numa ilhota: anda livre no topo; passou da borda dela → cai
        if (ilhotaEm(eu.pos, 0.2) !== this.ilhota) this.cairDaqui({ x: (eu.pos.x - prev.x) / Math.max(dt, 1e-3), z: (eu.pos.z - prev.z) / Math.max(dt, 1e-3) });
      }
      else this.resolverChao(eu, prev, dt);
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
    // DESCANSO + TABLET: os pesos da animação (suaves) e o laboratório abrindo quando o tablet termina de materializar
    { const kd = Math.min(1, dt * 4), d = this.descanso, m = d && d.fase !== "indo" ? d.modo : null, ease = (u: number) => u * u * (3 - 2 * u);
      // sentando/levantando: o peso SEGUE a fase (abaixa junto com o recuo); parado: suave
      const alvoSofa = !d || d.fase === "indo" ? 0 : d.fase === "sentando" ? ease(Math.min(1, d.t / SENTAR.desce)) : d.fase === "levantando" ? 1 - ease(Math.min(1, d.t / SENTAR.sobe)) : m === "sentado" ? 1 : 0;
      eu.sofa = d && (d.fase === "sentando" || d.fase === "levantando") ? alvoSofa : (eu.sofa ?? 0) + (alvoSofa - (eu.sofa ?? 0)) * kd;
      eu.deita = (eu.deita ?? 0) + ((m === "deitado" && d?.fase === "parado" ? 1 : 0) - (eu.deita ?? 0)) * kd;
      if (d) { eu.assentoY = d.lugar.alturaAssento; eu.relaxa = d.lugar.relaxa ? 1 : 0; }
      if (this.tabletQuer && !this.aPeLivre()) this.fecharTablet();
      this.tabletW = this.tabletQuer ? Math.min(1, this.tabletW + dt / TABLET.materializa) : Math.max(0, this.tabletW - dt / TABLET.some);
      eu.tab = this.tabletW;
      if (this.tabletQuer && !this.labAberto && this.tabletW >= 1) { this.labAberto = true; this.o.onTablet?.(true); }
      // a dica da J / o botão do tablet: só avisa o React quando muda
      const noLounge = this.noCeu && salaEm({ x: eu.pos.x - CIDADE.centro.x, z: eu.pos.z - CIDADE.centro.z }) !== null && eu.alt > (this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY) + ALTURA_LOUNGE - 1;   // em qualquer uma das salas
      const pertoDeLugar = noLounge && (!!this.descanso || lugarPerto(eu.pos, this.outrosNaZaeon()) !== null);
      const podeDeitar = !!d?.lugar.deita, chave = `${noLounge}|${pertoDeLugar}|${m}|${podeDeitar}`;
      if (chave !== this.ultDescanso) { this.ultDescanso = chave; this.o.onDescanso?.({ pertoDeLugar, noLounge, modo: m, podeDeitar }); } }
    // DJ: parado na cabine do lounge (a pé) → é puxado pro lugar atrás da mesa e olha pra pista; o avatar põe o fone
    const souDJ = this.noCeu && !this.menu && !eu.moving && !this.jet.noAr && this.moto === null && !this.pilotando && !this.sobreNave && !this.bordo && naCabineDJ(eu.pos);
    eu.dj = (eu.dj ?? 0) + ((souDJ ? 1 : 0) - (eu.dj ?? 0)) * Math.min(1, dt * 4);
    if (souDJ) { const c = pontoDaCabineDJ(), k = Math.min(1, dt * 4); eu.pos.x += (c.x - eu.pos.x) * k; eu.pos.z += (c.z - eu.pos.z) * k; eu.facing = rumoDoDJ(); }
    eu.surf = (eu.surf ?? 0) + ((this.viagem?.tipo === "elevador" ? 1 : 0) - (eu.surf ?? 0)) * Math.min(1, dt * 5);
    eu.puxa = (eu.puxa ?? 0) + ((this.viagem?.tipo === "escada" ? 1 : 0) - (eu.puxa ?? 0)) * Math.min(1, dt * 5);
    // DANÇA: parado na PISTA do lounge → dança virado pro palco
    const danco = this.noCeu && !this.menu && !eu.moving && !this.jet.noAr && this.moto === null && !this.pilotando && !souDJ && naPistaDeDanca(eu.pos);
    eu.danca = (eu.danca ?? 0) + ((danco ? 1 : 0) - (eu.danca ?? 0)) * Math.min(1, dt * 3);
    if (danco) eu.facing = rumoDaPista();
    const lmAlto = this.altoEm ? this.lms.find((l) => l.poi.id === this.altoEm) : undefined;
    const pnAlt = this.bordo ? this.poseNave() : null;
    eu.alt = pnAlt && this.bordo ? alturaDoConves(pnAlt) + alturaNoBordo(this.bordo, rampaDaNave(pnAlt).queda)
      : this.moto !== null ? this.motoEst.y
      : this.pilotando ? this.naveEst.y
      : this.jet.noAr ? this.jet.y
      : this.sobreNave ? this.topoNave()
      : this.plat ? PLATAFORMAS[this.plat.id].y + alturaDoAndar(this.plat.id, this.plat.andar)
      : this.ilhota !== null && this.cidade ? this.cidade.alturaIlhota(this.ilhota)
      : this.noCeu && this.viagem ? (this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY) + posDaViagem(this.viagem.tipo, this.viagem.sentido, Math.min(1, this.viagem.t / (this.viagem.tipo === "escada" ? VIAGEM_ESCADA.dur : TORRE_DJ.elevador.dur)), this.viagem.sala).y   // sendo levado: a altura do caminho
      : this.noCeu ? (this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY) + alturaNaCidade(eu.pos)   // + o PALCO do lounge (escada = rampa)
      : this.noTopo ? this.alturaTopo() : (lmAlto?.poi.base ?? 0) + this.yNav + (lmAlto && marcoNav(lmAlto.poi) && this.yNav >= marcoNav(lmAlto.poi)!.nav.pisoY - 1e-6 ? this.boia(lmAlto) : 0);
    if (this.nascendo) eu.alt += 0.35;   // em pé no pedestal do tubo

    // BURACOS NEGROS: pisou no anel de um nó da rede → o TÚNEL (escolhe o destino); a pé, fora de veículo, no piso
    if (!this.menu && !this.pilotando && this.moto === null && !this.jet.noAr && !this.sobreNave && !this.bordo && !this.noTopo && !this.nascendo && !this.tunel && (!this.plat || this.plat.andar === 0)) {
      const no = noDoAnel(eu.pos, eu.alt);
      if (no && this.portalArmado) this.abrirTunel(no);
      else if (!no) this.portalArmado = true;
    }
    // o PAR DO DONO: a boca na cabine do DJ (lá em cima da torre) e a da nave (sala de reuniões)
    if (!this.menu && !this.pilotando && this.moto === null && !this.jet.noAr && !this.tunel) {
      const naBoca = this.bordo ? naBocaNave(this.bordo) : this.noCeu && naBocaDJ(eu.pos) && eu.alt > (this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY) + ALTURA_LOUNGE + TORRE_DJ.topo - 0.5;
      if (naBoca && this.bocaDonoArmada) {
        this.bocaDonoArmada = false;
        if (this.ehFundador(this.o.eu.id)) this.o.onBuracoDono?.(this.bordo ? "dj" : "nave");
        else this.o.onAviso?.("Só o dono atravessa este buraco negro.");
      } else if (!naBoca) this.bocaDonoArmada = true;
    }

    // estar perto da própria base = estado de estudo (luz/cristais/botão)
    const perto = this.distBase(euId, eu.pos) < BASE_INTERACT_R;
    if (perto !== this.perto) { this.perto = perto; this.o.onPerto?.(perto); if (perto) this.som.tocar("near-ping", eu.av.group.position, { dist: DISTANCIA.perto }); }

    // rede: eu → difusão; remotos → atores
    const desc = codificarDescanso(this.descanso && this.descanso.fase !== "indo" && this.descanso.fase !== "levantando" ? this.descanso.modo : null, this.tabletW > 0.5);
    if (!this.menu && !this.instancia) this.o.enviarPos?.({ x: eu.pos.x, z: eu.pos.z, facing: eu.facing, moving: eu.moving, sit: this.sitT > 0.5, topo: this.noTopo, ceu: this.naZaeon, ...(desc ? { desc } : {}), ...(this.jet.noAr ? { jet: Math.round(this.jet.y * 100) / 100 } : {}), ...(this.sobreNave || this.ilhota !== null || this.plat || this.bordo || this.viagem || this.nascendo || (this.altoEm && !this.noCeu) ? { alt: Math.round(eu.alt * 100) / 100 } : {}), ...(this.moto !== null ? { moto: { s: this.moto, y: Math.round(this.motoEst.y * 100) / 100, yaw: this.motoEst.yaw, ...(this.motoDe ? { de: this.motoDe } : {}) } } : {}), ...(this.motoLargada ? { motoLargada: this.motoLargada } : {}), ...(this.movAgora(t) ? { mov: this.movAgora(t) } : {}), ...(this.ataque ? { atk: codificarGolpe(this.ataque.seq, this.ataque.golpe.n) } : {}), ...(this.vida < VIDA_MAX ? { hp: this.vida } : {}), ...(this.revela > 0.5 ? { arma: 1 } : {}), ...(this.pilotando ? { voo: { y: this.naveEst.y, yaw: this.naveEst.yaw } } : this.naveForaDoHangar() ? { naveParada: { x: this.naveEst.x, y: this.naveEst.y, z: this.naveEst.z, yaw: this.naveEst.yaw } } : {}) });
    this.sincronizarRemotos(dt, t);
    this.atualizarNascimentoEGuia(dt);
    this.atualizarConversa(dt);
    this.atualizarAgentes(dt, t);
    if (this.holoZaeon && this.holoZaeon.fase() !== "oculto") this.holoZaeon.atualizar(dt, t, this.cam.position);

    // motos (antes dos avatares: quem está montado encaixa no banco/guidão/pedaleiras da moto já posicionada)
    const ocupadas = this.atualizarMotos(dt, t);
    this.atualizarPersonagens(dt, t);
    if (this.frota) {
      this.frota.mostrar(!this.instancia && !this.menu);
      this.frota.atualizar(dt, t, { cam: this.cam.position, eu: { x: this.eu.pos.x, y: this.eu.alt, z: this.eu.pos.z }, camera: this.cam, largura: this.w, altura: this.h, ilhaY: this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY, pisoY: CIDADE.pisoY, musica: !!this.somLounge?.tocando,
        obstaculos: [{ x: this.eu.pos.x, z: this.eu.pos.z }, ...[...this.remotos.values()].map((a) => ({ x: a.pos.x, z: a.pos.z })), ...this.personagens.map((p) => ({ x: p.h.pos.x, z: p.h.pos.z }))] });
    }
    // avatares
    eu.av.group.position.set(eu.pos.x, eu.alt, eu.pos.z); eu.av.olharPara(eu.facing);
    // fora (vista da landing / menu): MEDITANDO em frente ao computador; na base: digitando; no ar: jatos acesos
    eu.av.animar({ andando: eu.moving && !this.jet.noAr && this.moto === null, correndo: (!!(this.keys.shift || this.correr) || this.dashAtivo) && eu.moving && this.moto === null, sentado: this.menu || this.pilotando ? 0 : this.sitT, meditando: this.menu && !this.pilotando ? 1 : 0, pilotando: this.pilotando ? 1 : 0, jato: this.jet.noAr ? (this.jet.tecla ? 1 : this.impulsoFrente ? 0.9 : 0.35) : 0, ar: this.jet.noAr ? { vy: this.jet.vy, movendo: eu.moving, vel: Math.hypot(this.jetV.x, this.jetV.z) } : null, acao: this.moto === null && !this.pilotando ? { sprint: this.wSprint, dash: this.wDash, alerta: Math.max(pesoAlerta(t - this.tFimDash), this.wGuardaArena), alertaT: this.wGuardaArena > pesoAlerta(t - this.tFimDash) ? 4 : t - this.tFimDash, espada: this.revela > 0.02 ? { golpe: this.ataque && !golpeAcabou(this.ataque, t) ? { n: this.ataque.golpe.n, u: (t - this.ataque.ini) / this.ataque.golpe.dur, ativo: [this.ataque.golpe.ativoIni / this.ataque.golpe.dur, this.ataque.golpe.ativoFim / this.ataque.golpe.dur] } : null, guarda: Math.max(pesoAlerta(t - this.tFimDash), this.wGuardaArena) } : null, heroi: t - this.tHeroi < 1.3 ? t - this.tHeroi : null, decola: t - this.tDecolou < this.esperaDecolou + 0.7 ? { t: t - this.tDecolou, espera: this.esperaDecolou } : null } : null, montado: this.moto !== null ? this.naMoto(eu.av, ocupadas.get(this.eu)) : null, dj: eu.dj ?? 0, danca: eu.danca ?? 0, surf: eu.surf ?? 0, puxado: eu.puxa ?? 0, descanso: { sentar: eu.sofa ?? 0, deitar: eu.deita ?? 0, assentoY: eu.assentoY ?? 0.7, relaxa: eu.relaxa ?? 0 }, tablet: eu.tab ?? 0, dt: t < this.pausaAte ? 0 : this.moto === null && !this.jet.noAr && eu.moving ? dt * Math.min(2, Math.max(1, this.velAPe / 7.5)) : dt, t });   // (hit-stop: a pose congela)   // (no sprint as pernas giram mais rápido)
    for (const a of this.remotos.values()) {
      const pilota = !!a.nave && !a.naveP, monta = a.moto ? ocupadas.get(a) ?? null : null;
      const ehDJ = !!a.ceu && !a.moving && a.jet === undefined && !pilota && monta === null && naCabineDJ(a.pos);   // a posição dele já vem puxada pra cabine pelo engine dele
      a.dj = (a.dj ?? 0) + ((ehDJ ? 1 : 0) - (a.dj ?? 0)) * Math.min(1, dt * 4);
      const dancando = !!a.ceu && !a.moving && a.jet === undefined && !pilota && monta === null && !ehDJ && naPistaDeDanca(a.pos);
      a.danca = (a.danca ?? 0) + ((dancando ? 1 : 0) - (a.danca ?? 0)) * Math.min(1, dt * 3);
      { const dd = decodificarDescanso(a.desc), ok = !!a.ceu && a.jet === undefined && !pilota && monta === null, kd = Math.min(1, dt * 4);   // SENTADO/DEITADO/TABLET dele (a posição já vem no lugar)
        a.sofa = (a.sofa ?? 0) + ((ok && dd.modo === "sentado" ? 1 : 0) - (a.sofa ?? 0)) * kd; a.deita = (a.deita ?? 0) + ((ok && dd.modo === "deitado" ? 1 : 0) - (a.deita ?? 0)) * kd;
        a.tab = Math.max(0, Math.min(1, (a.tab ?? 0) + (ok && dd.tablet ? dt / TABLET.materializa : -dt / TABLET.some)));
        if (dd.modo) { const lg = lugarEm(a.pos); a.assentoY = lg?.alturaAssento ?? 0.7; a.relaxa = lg?.relaxa ? 1 : 0; } }
      // na escada só se está sendo levado; no elevador da torre, quem está no ar dentro da coluna de luz
      const qs = naSala(CIDADE.salas.lounge, a.pos.x - CIDADE.centro.x, a.pos.z - CIDADE.centro.z), naColuna = Math.hypot(qs.x, qs.z - TORRE_DJ.elevador.sobe) < 1.6 && a.alt > CIDADE.pisoY + ALTURA_LOUNGE + PALCO_LOUNGE.h + 0.6;
      const surfando = !!a.ceu && a.jet === undefined && naColuna, puxado = !!a.ceu && a.jet === undefined && monta === null && naEscadaDoLounge(a.pos);
      a.surf = (a.surf ?? 0) + ((surfando ? 1 : 0) - (a.surf ?? 0)) * Math.min(1, dt * 5);
      a.puxa = (a.puxa ?? 0) + ((puxado ? 1 : 0) - (a.puxa ?? 0)) * Math.min(1, dt * 5);
      a.av.group.position.set(a.pos.x, a.alt, a.pos.z); a.av.olharPara(pilota ? a.naveYaw ?? a.facing : a.facing);
      // de longe / fora da tela o avatar anima menos vezes por segundo (o mixer + IK de cada um custa); fora da tela
      // nem desenha (a malha com skinning não tem esfera confiável: frustumCulled=false) — perto continua animando
      // mesmo atrás de mim (o passo dele soa)
      const dCam = this.cam.position.distanceTo(a.av.group.position), naTela = this.frustum.intersectsSphere(this.esfAtor.set(a.av.group.position, 2.2)) || dCam < 4;
      a.av.group.visible = naTela;
      const cada = dCam < 12 ? 0 : !naTela ? (dCam < 60 ? 0.1 : Infinity) : dCam > 120 ? 0.1 : dCam > 40 ? 0.05 : 1 / 40;   // 12–40 m: um quadro sim, um não (LOD de animação)
      a.acum = (a.acum ?? 0) + dt;
      const animou = a.acum >= cada;
      if (animou) { a.av.animar({ montado: monta !== null ? this.naMoto(a.av, monta) : null, andando: a.moving && a.jet === undefined && !pilota && monta === null && (a.surf ?? 0) < 0.5 && (a.puxa ?? 0) < 0.5, sentado: pilota || monta !== null ? 0 : a.sit, pilotando: pilota ? 1 : 0, jato: a.jet !== undefined ? (a.vyJet ?? 0) > -3 ? 0.9 : 0.3 : 0, ar: a.jet !== undefined ? { vy: a.vyJet ?? 0, movendo: a.moving } : null, dj: a.dj ?? 0, danca: a.danca ?? 0, surf: a.surf ?? 0, puxado: a.puxa ?? 0, descanso: { sentar: a.sofa ?? 0, deitar: a.deita ?? 0, assentoY: a.assentoY ?? 0.7, relaxa: a.relaxa ?? 0 }, tablet: a.tab ?? 0, acao: { sprint: a.wSpR ?? 0, dash: a.wDaR ?? 0, alerta: a.wAlR ?? 0, alertaT: t - (a.tMov ?? t), heroi: a.mov === 4 ? t - (a.tMov ?? t) : null, decola: a.mov === 5 ? { t: t - (a.tMov ?? t), espera: 0.07 } : null, espada: !a.espada || (a.revela ?? 0) <= 0.02 ? null : { golpe: a.golpe ? { n: a.golpe.g.n, u: Math.min(1, (t - a.golpe.ini) / a.golpe.g.dur), ativo: [a.golpe.g.ativoIni / a.golpe.g.dur, a.golpe.g.ativoFim / a.golpe.g.dur] } : null, guarda: a.moving ? 0 : 1 } }, dt: Math.min(0.1, a.acum), t }); a.acum = 0; }
      matrizDoAvatar(a.av.group, animou);   // o esqueleto dele só recalcula no quadro em que animou ou andou (components/cyber/matrizes)
      if (a.nave && a.naveP) { a.nave.group.position.set(a.naveP.x, a.naveP.y, a.naveP.z); a.nave.group.rotation.y = a.naveP.yaw + GIRO_PLANTA; a.nave.atualizar({ dt, t, voando: false, vel: 0, curva: 0 }); }
      else if (a.nave) { a.nave.group.position.set(a.pos.x, a.alt, a.pos.z); a.nave.group.rotation.y = (a.naveYaw ?? 0) + GIRO_PLANTA; a.nave.atualizar({ dt, t, voando: a.alt > 0.5, vel: a.moving ? 1 : 0, curva: 0, fechada: true }); this.noAssento(a.av, a.nave); }
    }

    // cidade + a minha nave (parada onde pousou, ou comigo dentro)
    if (this.cidade && this.regiaoPerto(this.cidade.group, "zaeon", AREA_ZAEON)) {
      // quem está na Zaeon (local da ilha): os motores de energia do Observatório da Terra reagem a eles
      const c = CIDADE.centro, pres: { x: number; z: number }[] = [];
      if (this.noCeu) pres.push({ x: this.eu.pos.x - c.x, z: this.eu.pos.z - c.z });
      for (const a of this.remotos.values()) if (a.ceu) pres.push({ x: a.pos.x - c.x, z: a.pos.z - c.z });
      this.cidade.presencas(pres);
      this.cidade.atualizar(dt, t);
      if (this.bercario) { const v = this.tubosVisiveis(); this.bercario.group.visible = v; if (v) this.bercario.atualizar(dt, t); }
    }
    if (this.praca && this.regiaoPerto(this.praca.group, "praca")) this.praca.atualizar(dt, t);
    if (this.somLounge) { this.somLounge.atualizar(dt); this.cidade?.somTocando(this.somLounge.tocando, this.somLounge.nivel); }
    if (this.holo) {   // o holograma acompanha a base do QG (que flutua junto com o marco)
      const lay = baseNoQG(), w = lay ? localParaMundo(lay, HOLO_NA_BASE.x, HOLO_NA_BASE.z) : null;
      if (lay && w) { this.holo.group.position.set(w.x, this.yDoNivel("qg"), w.z); this.holo.group.rotation.y = lay.rot + HOLO_NA_BASE.giro; }
      this.holo.atualizar(dt, t);
    }
    if (this.univ && this.regiaoPerto(this.univ.group, "unilab", AREA_UNILAB)) this.univ.atualizar(dt, t);
    for (const c of this.campi) if (this.regiaoPerto(c.h.group, `campus-${c.id}`, c.area)) c.h.atualizar(dt, t);
    if (this.solana && this.regiaoPerto(this.solana.group, "solana", AREA_SOLANA)) this.solana.atualizar(dt, t);
    if (this.nave) {
      const n = this.naveEst, curva = (n.yaw - this.yawAnt) / Math.max(dt, 1e-3); this.yawAnt = n.yaw;
      this.nave.group.position.set(n.x, n.y, n.z); this.nave.group.rotation.y = n.yaw + GIRO_PLANTA;   // estacionária: fica exatamente onde parou (a frente, com a rampa, no rumo)
      this.nave.group.visible = this.pilotando || !this.naveDoDonoFora();
      this.nave.atualizar({ dt, t, voando: this.pilotando && !this.pousado, vel: Math.hypot(n.vx, n.vz) / VOO.vel, curva, fechada: this.pilotando });
      if (this.pilotando) this.noAssento(eu.av, this.nave);   // o piloto aparece na cadeira, na cabine do centro
    }
    // a redoma da cabine abre (e o dorso fica translúcido na MINHA tela) enquanto eu estou a bordo
    { const pn = this.bordo ? this.poseNave() : null, abre = redomaAberta(this.bordo, this.pilotando);
      const chama = this.redomaChamando() ? this.poseNave() : null;   // voltando de mochila: abre pra eu entrar
      for (const h of [this.nave, ...[...this.remotos.values()].map((a) => a.nave)]) { if (!h) continue; const minha = !!pn && pn.h === h; h.aBordo(minha); h.abrirCabine((minha && abre) || (!!chama && chama.h === h)); }
      const pv = this.poseNave(); if (pv) { const ra = rampaDaNave(pv); pv.h.rampa(ra.queda, ra.desce === null); }   // a rampa acompanha onde a nave está
      // camuflada: o convés por dentro só é desenhado com EU a bordo — de fora (mesmo de perto) só a silhueta; a GPU agradece
      const dentro = !!pv && (!!this.bordo || this.pilotando);
      for (const h of [this.nave, ...[...this.remotos.values()].map((a) => a.nave)]) if (h) h.verDentro(dentro && !!pv && pv.h === h); }
    this.atualizarHudVoo(now);
    this.pistas?.atualizar(t);
    if (this.corrida && this.moto === null) this.sairCorrida();
    this.atualizarSom(dt);
    const navePerto = !this.pilotando && !!this.nave && this.navePerto();
    const naMoto = this.moto !== null, motoPertoAgora = !!this.motoAoAlcance(), pousado = naMoto ? this.motoPousado : this.pousado;
    const est = `${this.noCeu}|${navePerto}|${this.pilotando}|${pousado}|${naMoto}|${motoPertoAgora}`;
    const ac = this.acaoPerto(), ch = ac ? `${ac.id}|${ac.rotulo}` : "";
    if (ch !== this.acaoChave) { this.acaoChave = ch; this.o.onAcao?.(ac ? { rotulo: ac.rotulo } : null); }
    if (est !== this.estadoQG) { this.estadoQG = est; this.o.onEstadoQG?.({ noCeu: this.noCeu, navePerto, pilotando: this.pilotando, pousado, moto: naMoto, motoPerto: motoPertoAgora }); }

    // marcos: animação + a "estátua" do dono some quando o dono real está lá em cima
    const donoNoTopo = this.noTopo || [...this.remotos.values()].some((a) => a.topo);
    for (const lm of this.lms) { if (this.regiaoPerto(lm.group, lm.poi.id)) lm.atualizar(dt, t); if (lm.topo) lm.donoPresente(donoNoTopo); }

    // bases
    for (const [id, b] of this.bases) {
      const alguemPerto = id === euId ? perto : [...this.remotos.values()].some((a) => a.id === id && this.distBase(id, a.pos) < BASE_INTERACT_R);
      if (b.layout.nivel) b.group.position.y = this.yDoNivel(b.layout.nivel);
      // energia = o dono SENTADO na cabine (fluxo mãos → tela)
      const energia = id === euId ? this.sitT : (this.remotos.get(id)?.sit ?? 0);
      if (this.regiaoPerto(b.group, "base")) b.atualizar({ dt, t, ativa: alguemPerto, hover: this.hoverBase === id, perto: id === euId && perto, energia });
    }
    if (this.baseQG) { this.baseQG.group.position.y = this.yDoNivel("qg"); if (this.regiaoPerto(this.baseQG.group, "base-qg")) this.baseQG.atualizar({ dt, t, ativa: false, hover: false, perto: false }); }
    this.acenderBases();
    this.poolBases?.atualizar();
    // motos: de longe some a moto inteira (ninguém vê 2 m de moto a 1 km); a montada está sempre perto da câmera
    for (const m of this.vagaMotos) this.regiaoPerto(m.g, "moto");
    for (const m of this.instMotos.values()) this.regiaoPerto(m.g, "moto");

    this.atualizarCamera(dt);
    this.atualizarHudCombate();
    this.cena.atualizar({ dt, t, cam: this.cam, aspect: this.cam.aspect });
    this.atualizarHud(now);
    // PISOS QUE ESCONDEM (as células/portais do céu aberto): o que está em cima de uma plataforma some pra quem está
    // embaixo dela (components/cyber/oclusaoPisos) — antes das matrizes (o invisível nem recalcula)
    if (this.cidade && !this.oclusao) { this.oclusao = criarOclusaoDePisos(); for (const p of this.cidade.plataformas) this.oclusao.adicionar(p); }
    this.oclusao?.atualizar(this.cam.position);
    matrizesDaCena(this.cena.scene);   // o que está invisível no topo da cena não recalcula matrizes (components/cyber/matrizes)
    // transparentes de dupla face numa passada só (components/cyber/umaPassada) — de tempos em tempos pega os materiais novos
    if (now - this.passadaEm > 2000) { this.passadaEm = now; umaPassadaNosTransparentes(this.cena.scene); }
    const desenhar = () => { this.R.clear(); this.cena.desenharFundo(this.R, this.qa.atual.nebulosa); this.R.clearDepth(); this.R.render(this.cena.scene, this.cam); };
    // moto rápida (components/cyber/VelocidadeTela): as LINHAS de velocidade estilo anime + vinheta ligam SEMPRE (são
    // baratas); o BLUR radial só quando a qualidade deixa (fora do modo low e dos degraus baixos — é uma tela inteira a mais)
    const onda = this.ondaT >= 0 && this.ondaT < 1 ? this.ondaT : -1;
    if (this.velTela > 0.03 || onda >= 0) {
      this.fxVel ??= criarVelocidadeTela({ amostrasMsaa: this.R.getContext().getContextAttributes()?.antialias ? 4 : 0 });
      this.fxVel.render(this.R, this.velTela, t, desenhar, this.qa.atual.aura && !this.o.low, onda);
    } else desenhar();
    // o frustum deste quadro (os avatares remotos do próximo quadro usam pra saber se estão na tela)
    this.mProj.multiplyMatrices(this.cam.projectionMatrix, this.cam.matrixWorldInverse); this.frustum.setFromProjectionMatrix(this.mProj);
    // qualidade adaptativa: só mede jogando (o menu/landing roda a 30 e confundiria a medida)
    if (!this.menu && this.ultimoDesenho > 0 && this.qa.registrar(now - this.ultimoDesenho) !== null) this.aplicarQualidade();
    this.ultimoDesenho = now;
    if (!this.prontoDisparado) { this.prontoDisparado = true; this.o.onPronto?.(); this.aoPrimeiroQuadro?.(); this.aoPrimeiroQuadro = null; }
  }

  private sincronizarRemotos(dt: number, t: number) {
    // na INSTÂNCIA do tutorial ninguém aparece (a Zaeon é só do novato) — sem som de "saiu"/"chegou"
    const src = this.instancia ? CyberEngine.NINGUEM : this.o.remotos?.current;
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
        a.desc = p.desc ?? 0;
        this.combateRemoto(a, p, t);
        // "no topo" só vale pra quem o SERVIDOR marcou como fundador (client event forjado não sobe ninguém)
        // regalias (topo/nave) só pra quem o SERVIDOR marcou como fundador — a Zaeon (céu) é aberta
        const fund = !!this.pessoas.get(id)?.fundador;
        a.topo = p.topo === true && this.ehFundador(id);
        a.ceu = p.ceu === true;   // a Zaeon é aberta a todos (o topo e a nave continuam do dono)
        const voando = fund && !!p.voo, parada = fund && !voando && p.naveParada ? p.naveParada : null;
        if ((voando || parada) && !a.nave && this.cidade) {
          a.nave = criarNave({ low: this.o.low, cor: a.color }); loteNave(a.nave); this.cena.scene.add(a.nave.group);
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
        a.motoLargada = p.motoLargada ?? null;
        const jetAnt = a.jet; a.jet = !voando && !a.moto && typeof p.jet === "number" ? p.jet : undefined;
        if (a.jet !== undefined && jetAnt !== undefined && dt > 0) a.vyJet = (a.vyJet ?? 0) + (((a.jet - jetAnt) / dt) - (a.vyJet ?? 0)) * Math.min(1, dt * 4); else a.vyJet = 0;
        const altAlvo = voando ? p.voo!.y : a.moto ? a.moto.y : a.jet !== undefined ? a.jet : typeof p.alt === "number" ? p.alt : a.topo ? this.alturaTopo() : a.ceu ? CIDADE.pisoY + alturaNaCidade(a.pos) : this.alturaChao(a.pos);
        a.alt += (altAlvo - a.alt) * (Math.abs(altAlvo - a.alt) > 40 ? 1 : Math.min(1, dt * 6));   // portal = corte seco
        if (voando) a.naveYaw = p.voo!.yaw;
        void t;
      }
      // saiu da sala: o personagem some; a BASE fica (bases vivem em this.bases)
      for (const [id, a] of this.remotos) if (!src.has(id)) { if (!this.instancia) this.som.tocar("leave", a.av.group.position); this.removerAtor(a); this.remotos.delete(id); if (this.falandoCom === a) { this.falandoCom = null; this.o.onFalarCom?.(null); } }
    }
  }

  /** HUD de voo: marcador de pouso sob a nave, anel na borda da ilha e o altímetro pro React (sem marcadores na tela) */
  private atualizarHudVoo(now: number) {
    const h = this.hudVoo; if (!h) return;
    const naMoto = this.moto !== null, voando = (this.pilotando || naMoto) && !this.menu, n = naMoto ? this.motoEst : this.naveEst, boiaCidade = this.cidade ? this.cidade.ilha.position.y - CIDADE.pisoY : 0;
    const solidos = voando ? this.solidosDeVoo() : [];
    h.marca.visible = voando && !naMoto && !this.pousado;   // o marcador de pouso no chão é só da nave (na moto, o dono pediu sem)
    if (h.marca.visible) { const c = chaoDoVoo(n, solidos); h.marca.position.set(n.x, c + (c === CIDADE.pisoY ? boiaCidade : 0) + 0.1, n.z); }
    h.borda.visible = voando && !naMoto && Math.hypot(n.x - CIDADE.centro.x, n.z - CIDADE.centro.z) < CIDADE.bordaR + 60;
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
    for (const p of this.personagens) { const vis = p.h.group.visible && !this.menu; if (vis) { const s = this.proj(this.vHud.set(p.h.pos.x, p.h.alt + 2.0, p.h.pos.z)); this.noHud(p.tag, s.x, s.y, s.vis && eu.pos.distanceTo(p.h.pos) < 90); } else if (p.tag.style.display !== "none") p.tag.style.display = "none"; }
    { const d = this.droid; if (d) { const vis = d.h.group.visible && !this.menu; if (vis) { const s = this.proj(this.vHud.set(d.pos.x, d.alt + 1.25, d.pos.z)); this.noHud(d.tag, s.x, s.y, s.vis); } else if (d.tag.style.display !== "none") d.tag.style.display = "none"; } }
    for (const a of atores) {
      if (a === eu) { a.tag.style.display = "none"; continue; }   // o próprio avatar não leva nome
      const s = this.proj(this.vHud.set(a.pos.x, 2.1 + a.sit * -0.3 + a.alt, a.pos.z));
      this.noHud(a.tag, s.x, s.y, !this.menu && s.vis && a.av.group.visible);
      { const perto = eu.pos.distanceTo(a.pos) < 3.0, borda = a.falando ? "#9affd0" : perto ? "#fff" : "", txt = (a.falando ? "🎙 " : perto ? "💬 " : "") + a.name + (a.hp !== undefined && a.hp < VIDA_MAX ? ` · ♥ ${a.hp}` : "");   // (na arena, a vida dele no rótulo)
        if (a.tag.style.borderColor !== borda) a.tag.style.borderColor = borda; if (a.tag.textContent !== txt) a.tag.textContent = txt; }
    }
    for (let i = this.falas.length - 1; i >= 0; i--) {
      const f = this.falas[i]!; if (now > f.ate) { f.el.remove(); this.falas.splice(i, 1); continue; }
      const p = this.proj(this.vHud.set(f.ator.pos.x, 2.4 + f.ator.alt, f.ator.pos.z)); this.noHud(f.el, Math.min(this.w - 108, Math.max(108, p.x)), Math.max(70, p.y), p.vis);   // o balão não sai da tela
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
    if (this.relogioFrota) clearInterval(this.relogioFrota); this.relogioFrota = null;
    this.frota?.dispose(); this.frota = null; this.pistas?.dispose(); this.pistas = null;
    const w = window as unknown as { __cyber?: CyberEngine }; if (w.__cyber === this) delete w.__cyber;
    if (!this.vivo) return;   // idempotente (desmonta ao ir estudar e de novo no cleanup do React)
    this.vivo = false; cancelAnimationFrame(this.raf); this.ro?.disconnect(); this.io?.disconnect();
    this.cleanups.forEach((f) => f());
    for (const a of [this.eu, ...this.remotos.values()]) if (a) this.removerAtor(a);
    if (this.droid) { this.droid.h.dispose(); this.droid.tag.remove(); }
    for (const p of this.personagens) { p.h.dispose(); p.tag.remove(); } this.personagens = [];
    this.falaZ = null; this.calarZaeon(); this.holoZaeon?.dispose();
    this.praca?.dispose(); this.bercario?.dispose(); if (this.farol) { this.farol.geometry.dispose(); (this.farol.material as THREE.Material).dispose(); }
    this.poolBases?.dispose(); this.poolBases = null;
    for (const b of this.bases.values()) b.dispose(); this.baseQG?.dispose();
    for (const lm of this.lms) lm.dispose();
    this.somLounge?.dispose(); this.som.dispose();
    this.pisosEstudo?.traverse((n) => { const m = n as THREE.Mesh; m.geometry?.dispose(); (m.material as THREE.Material | undefined)?.dispose?.(); }); this.pisosEstudo?.removeFromParent(); this.pisosEstudo = null;
    this.cidade?.dispose(); this.holo?.dispose(); this.univ?.dispose(); for (const c of this.campi) c.h.dispose(); this.solana?.dispose(); this.nave?.dispose(); for (const m of [...this.instMotos.values(), ...[...this.poolMotos.values()].flat()]) m.h.dispose();
    for (const m of this.vagaMotos) { m.g.traverse((x) => { const k = x as THREE.Mesh; k.geometry?.dispose(); }); m.g.removeFromParent(); }
    for (const m of [...this.instMotos.values(), ...[...this.poolMotos.values()].flat()]) m.casca.removeFromParent();
    for (const f of this.fabricas) f.robo.dispose();
    if (this.hudVoo) for (const m of [this.hudVoo.marca, this.hudVoo.borda]) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
    this.fxVel?.dispose(); this.fxMov?.dispose(); this.arena?.dispose(); this.espada?.dispose(); this.hudCombate?.remove(); for (const n of this.numeros) n.el.remove(); this.cena.dispose(); this.R.dispose(); this.R.forceContextLoss(); this.R.domElement.remove();
  }
}

/** base64 → bytes (o WAV da voz) */
function base64ParaBuffer(b64: string): ArrayBuffer | null {
  try { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; } catch { return null; }
}

/** os personagens que vivem na cidadela (id = a chave de CORPOS_VRM e de PERFIS_VIDA — a agenda dele) */
const PERSONAGENS_DA_CIDADELA = [
  { id: "nina", nome: "Nina", cor: "#f472b6", corMoto: "#ff7ab8" },
  { id: "aura", nome: "Aura", cor: "#a78bfa", corMoto: "#9b7bff" },
  { id: "teo", nome: "Téo", cor: "#34d399", corMoto: "#1fbf6f" },
  { id: "examiner", nome: "Examiner", cor: "#f87171", corMoto: "#dc2626" },
  { id: "zenita", nome: "Zenita", cor: "#fcd34d", corMoto: "#f5b82e" },
  { id: "core_active", nome: "Davi", cor: "#fb923c", corMoto: "#f97316" },
  { id: "scholar", nome: "Scholar", cor: "#94a3b8", corMoto: "#64748b" },
  { id: "zaeon", nome: "Zaeon", cor: "#38bdf8", corMoto: "#0ea5e9" },
  { id: "caio", nome: "Caio", cor: "#60a5fa", corMoto: "#3b82f6" },
  { id: "enfermagem", nome: "Nightingale", cor: "#fda4af", corMoto: "#f43f5e" },
  { id: "medicina", nome: "Osler", cor: "#5eead4", corMoto: "#14b8a6" },
  { id: "farmacia", nome: "Kekulé", cor: "#99f6e4", corMoto: "#2dd4bf" },
  { id: "quimica", nome: "Mendeleev", cor: "#67e8f9", corMoto: "#06b6d4" },
  { id: "eng-civil", nome: "Eiffel", cor: "#fcd34d", corMoto: "#f59e0b" },
] as const;
/** ligados por padrão; `?personagens=0` (ou NEXT_PUBLIC_CYBER_PERSONAGENS=0) desliga */
function personagensLigados(): boolean {
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("personagens") === "0") return false;
  return process.env.NEXT_PUBLIC_CYBER_PERSONAGENS !== "0";
}
