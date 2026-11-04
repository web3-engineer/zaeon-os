/**
 * CyberEngine — a cena RPG do cyberespaço (HANDOFF lounge cósmico): três.js imperativo, isolado do React.
 * Cenário fixo (CenaCosmica) + uma BASE DE ESTUDO por pessoa (BaseEstudo, fixa e privada) + "seres de luz"
 * (AvatarLuz). Movimento WASD/joystick/clique, correr, voar de mochila a jato (ESPAÇO), câmera orbital livre (+pinça), colisão que desliza
 * na borda das bases, sentar ao parar na própria base, monitor destacável (hover) que leva à Sala de Estudos.
 * Rede = só o que o hook de sala entrega (remotos + enviarPos); aqui não há fetch/Pusher.
 */
import { RotinaExaminer } from "@/lib/cyber/examiner";
import { RAIO_CAPELA, proximoTurno, sortearFrase } from "@/lib/cyber/falasCapela";
import * as THREE from "three";
import { corDaArmadura } from "@/lib/cyber/cores";
import { BASE_COLLIDER_R, BASE_INTERACT_R, baseNoQG, basesDosMembros, localParaMundo, spawnDaBase, type LayoutBase, type NivelBase } from "@/lib/cyber/bases";
import { empurrarParaFora, type Colisor } from "@/lib/cyber/colisao";
import { decidirClique, rotuloMonitor } from "@/lib/cyber/clique";
import { POIS, bordaDoPOI, colisoresDosPOIs, marcoNav, naPracaPOI, poiPerto, type POI } from "@/lib/cyber/landmarks";
import { alturaEm, colisoresDoAlto, deEscada, resolverPasso, type MarcoNav } from "@/lib/cyber/nav";
import { alternarModoCamera, distPerto, faixaDaDistancia, limitarPitch, olhoDoOmbro, poseDaCamera, seguirPerto, type ModoCamera } from "@/lib/cyber/camera";
import { PISTA, rotDaSala, espelhoDe, CAPELA_NA_ZAEON, ALTURA_CORPO_ILHOTA, BURACO_NEGRO, CAMPO_DJ, CIDADE, alturaNaCidade, foraDaTorreDJ, naCabineDJ, naPistaDeDanca, naTorreDJ, pontoDaCabineDJ, rumoDaPista, rumoDoDJ, bocaDeEscada, bocaDoElevador, bocaDaGaragem, durDaViagem, naColunaDaGaragem, salaEm, ESCADAS, FIO, alturaDoFio, naEscadaLocal, type NomeSala, naEscadaDoLounge, posDaViagem, TORRE_DJ, VIAGEM_ESCADA, ALTURA_LOUNGE, PISO_FESTA, PALCO as PALCO_LOUNGE, naSala, daSala, ILHOTAS, foraDaIlha, pisoDeVoo, pisoNoAr, ilhotaEm, mundo, naIlhaPrincipal, resolverCidade, resolverCidadeLivre, solidosDaCidade, colisoresDoAndar, dentroDoEstudo, rumoNaSala } from "@/lib/cyber/ceu";
import { DECK, TEMPLO, curvaDaEscadaria, noTemplo } from "@/lib/cyber/templo";
import { ALCANCE_DUELO, TORRE_TI, CABINES_TORRE, CABINE_TI, CUBO_CYBER, CUPULA, CYBER, ESTACOES_TI, ESTUDO, SALAO, barradoNaCupula, daCabineTI, bocaDoPoco, capsulaEm, embarcam, type PocoTC } from "@/lib/cyber/temploCosmico";
import { AGENTES_TRADING, agentePorId } from "@/lib/cyber/agentesTrading";
import { ESPERA_S, FALA_DESAFIO } from "@/lib/cyber/dueloIngles";
import { estadoDoShow, trovoesEntre } from "@/lib/cyber/showLounge";
import { criarMandala, type MandalaHandle } from "./MandalaSagrada";
import { criarTempestade, type TempestadeHandle } from "./Tempestade";
import { BALADA, TURBO_NAVE, brilhoDaBalada, corDoFlash, escuroDaBalada, luzDoFlash, fumacaDaTorre, noPerimetro, faseDaTempestade, intensidadeDaTempestade, passoDaEscadaria, raioNaBatida, revelacaoDaNave, ritualDesligado, sensacaoDaNave, suavizarRitual, type FaseRitual, type Ritual } from "@/lib/cyber/ritual";
import { VOO, chaoDoVoo, passoVooSub, pilaresDoMarco, type ComandoVoo, type EstadoVoo, type Pilar } from "@/lib/cyber/voo";
import { JET, impactoDoPouso, passoHorizontalJet, passoVertical, resolverNoAr, somDoJato, tetoDoJet, type QGNoAr } from "@/lib/cyber/jet";
import { pixelRatioDe, proximoQuadro, type Qualidade } from "@/lib/cyber/dispositivo";
import { QualidadeAdaptativa } from "@/lib/cyber/qualidadeAdaptativa";
import { DISTANCIA, PASSOS, duracaoVozDroid, cadenciaPasso, eventosNave, fatorCristais, fatorLeito, gatilhoVooInicial, gatilhosVoo, intervaloNeuronio, somNaveInicial, type Dist, type EstadoGatilhoVoo, type EstadoSomNave } from "@/lib/cyber/audio";
import { musica } from "@/lib/audio/musica";
import { criarAudioCyber, preCarregarSons, type AudioCyberHandle, type FalaHolograma, type LoopSom } from "./AudioCyber";
import { ESPERA_VOZ, criarCacheVoz, duracaoComAtraso, falasFixasZaeon, tempoDaFala, textoDaVoz, type CacheVoz } from "@/lib/cyber/vozZaeon";
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
import { PLATAFORMAS, UNIVERSIDADES_NO_MAPA, alturaDoAndar, andarDoPouso, andarNaPlataforma, decolaDaPlataforma, elevadorAqui, noArNaPlataforma, pilaresDasPlataformas, plataformaPerto, pousosNaPlataforma, tetoNaPlataforma, type IdPlataforma } from "@/lib/cyber/plataformas";
import { CHAO, PRACA, QUEDA_VAZIO, naPraca } from "@/lib/cyber/praca";
import { CHEGADA_NAVE, NOS, bocaDJMundo, chegadaDJMundo, destinosDe, ehSala, naBocaDJ, naBocaNave, noDoAnel, type IdNo } from "@/lib/cyber/buracos";
import { DROID } from "@/lib/cyber/agentes";
import { type CtxGuia, FALA_DESISTIU, ROTEIRO_ENTREGA, ROTEIRO_MOTOS, passoDaRecusa, type PassoGuia, FALA_CONCORRENCIA, FALA_IA_ENTREGOU, FALA_VOLTE_AO_TABLET, FALA_DICA_RELICARIO, FRENTE_DO_SABER_SALA, CENTRO_DA_CAPELA_LOCAL, FRENTE_DOS_TELOES_LOCAL, type IdPassoGuia, type OndeRetomar, type ProgressoTutorial, lembreteDoTablet, PASSO_DA_MISSAO, SALA_DO_SABER_LOCAL, esperaDepoisDaUltima, passoDe, tempoDeLeitura, NASCIMENTO, RITMO_FALA, ROTEIRO, TUBOS, cumpriu, tuboDe } from "@/lib/cyber/onboarding";
import { criarRelicario, type RelicarioHandle } from "./Relicario";
import { ALCANCE_RELICARIO, type EventoRelicario, eventoVivo, faseDoRelicario, relicarioLocal, relicarioMundo } from "@/lib/cyber/relicario";
import type { PesquisaSalva } from "@/lib/ui/loungeHub";
import { criarPortalViagem, type PortalViagemHandle } from "./PortalViagem";
import { FAIXA_CINEMA, misturarPose, passoPeso, planoConversa, planoTelao, poseDoPlano, seguirPose, suave, type Plano, type Pose } from "@/lib/cyber/cutscene";
import { FALA_DESTAQUE_CSS, ondeFala, type Dialogo } from "@/lib/cyber/dialogo";
import { TELOES as TELOES_TERRA, TELOES_SOLUCAO } from "@/lib/cyber/terra";
import { criarDroid, type DroidHandle } from "./Droid";
import { criarHoloZaeon, type HoloZaeonHandle } from "./HoloZaeon";
import { ABERTURA, FALA_EXPULSAO, PERGUNTAS, fallbackZaeon, fechamento, limparResposta, situacaoDe, type FalaConversa, type PedidoZaeon, type PerfilZaeon, type PerguntaZaeon, type TurnoZaeon } from "@/lib/cyber/conversaZaeon";
import { moderar } from "@/lib/cyber/moderacao";
import { criarPraca, type PracaHandle } from "./Praca";
import { criarNaveCoworking, type NaveCoworkingHandle } from "./NaveCoworking";
import { criarCascoNave, type CascoHandle } from "./CascoNave";
import { NAVES, chegadaDaNave, nivelDaNave, noPortalDaNave, pisoNaNave, regiaoDoNivel, resolverNaNave, paraLocal as paraLocalCw, paraMundo as paraMundoCw } from "@/lib/cyber/navesRegiao";
import { ANDAR2, NAVE_COWORK, noCasco } from "@/lib/cyber/naveCoworking";
import { REGIAO_PADRAO, type Regiao as RegiaoReal } from "@/lib/cyber/regiaoUsuario";
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
import { DURACAO_CLIPE, ENERGIA, ESCUDO, FEITICOS, MOV_ESCUDO, codificarLancamento, estadoDoMov, danoComEscudo, danoDaExplosao, decodificarLancamento, direcaoDaMira, escudoSegura, instanteDoDisparo, ladoDoGolpe, podeLancar, reacaoDoGolpe, recarregarEnergia, varreCorpo, duracaoLancamento, type Feitico } from "@/lib/cyber/magia";
import { criarFxMagia, type FxMagia } from "./MagiaFx";
import { criarRifleCosmico, type RifleHandle } from "./RifleCosmico";
import { CAMERA_MOTO_PERTO } from "@/lib/cyber/camera";
import { criarCarroHex, type CarroHandle } from "./CarroHex";
import { definirNivel, NIVEIS_SEPARADOS, type IdNivel } from "@/lib/cyber/nivelAtivo";
import { criarDetritos, type DetritosHandle } from "./DetritosBN";
import { criarRaiosBN, type RaiosBNHandle } from "./RaiosBN";
import { DETRITOS, baseDoTunel, empurraoDaBatida, inicioDaZona, naZona, novoAsteroide, passoAsteroide, puxaoDaZona, tamanhoDoCampo, vaiAcertar, type Asteroide } from "@/lib/cyber/detritos";
import { CAPTURA, FIO as FIO_COSMICO, comecarTragada, fiosCosmicos, naAtracao, raioDeAtracao, naCaptura, progressoCaptura, passoTragada, pertoDoBuraco, posDaTragada, progressoTragada, saidaDaSala, type Tragada } from "@/lib/cyber/fiosCosmicos";
import { nivelDoPonto, proximoNivel } from "@/lib/cyber/niveis";
import { CARROS_NA_ZAEON, LOTES_CARRO, pisoDaVaga, posseDosCarros, vagaDoLote, vagasDeCarro, type CarroDirigido, type CarroLargado, type PosseCarro, type VagaCarro } from "@/lib/cyber/carros";
import { criarPisoCarros, type PisoCarrosHandle } from "./EstacionamentoCarros";
import { LOOPS_CARRO, mixDoCarro, sonsDaCabine } from "@/lib/cyber/somCarro";
import { paletaFeminina, type Paleta } from "./CorpoAstronauta";
import { PALETAS_FEMININAS, paletaDoPersonagem, type Personagem } from "@/lib/cyber/personagem";
/** o CARRO VOADOR estacionado na praça, perto das vagas das motos (x, z, rumo) e a altura em que ele paira acima do
 *  chão; a cabine leva 1,6 s pra abrir/fechar inteira (as portas e o vidro em cascata — components/cyber/CarroHex) */
const CARRO_PAIRA = 0.45, CARRO_CABINE = 1.6;
/** os carros PARADOS só se desenham até aqui (m) e só se animam até `CARRO_ANIMA` (a frota tem 17 — lib/cyber/carros) */
const CARRO_VE = 420, CARRO_ANIMA = 140;
import { DURACAO_RIFLE, NUM_TIRO, RIFLE, animacaoDaMorte, danoDoTiro, desviar, difAng, dispersao, fracaoDoGiro, girarAte, movComRifle, naCabeca, noCorpo, passoCalor, passoInercia, podeAtirar, pontoDaMira, precisaVirar, rifleDoMov, tirosNovos } from "@/lib/cyber/rifle";
import { CAIDO, COMBO, HIT_STOP, PROTECAO_RENASCER, VIDA_MAX, acabou as golpeAcabou, acerta, codificarGolpe, cortouEntre, danoDoGolpe, decodificarGolpe, proximoGolpe, type EstadoAtaque, type Golpe } from "@/lib/cyber/combate";
import { dentroDaArena, ARENA_ATIVA, BONECOS, PILARES_ARENA, SPARRING, naArena, pontoDeRenascer } from "@/lib/cyber/arena";
import { criarArena, type ArenaHandle } from "./Arena";
import { criarEspadaEspiritual, type EspadaHandle } from "./EspadaEspiritual";
import { criarLivrosEstudos, type LivrosHandle } from "./LivrosEstudos";
import type { ItemEstudo } from "@/lib/estudos/itens";
/** a Espada Espiritual na mão: uma MONTANTE enorme (~3 m) — o peso dela define o golpe (o dono, out/2026) */
const ESCALA_ESPADA = 2.2;
/** a BALA do rifle no pipeline dos projéteis da magia (components/cyber/MagiaFx): o raio de energia azul-violeta,
 *  rápido e fino (o dano de verdade é do rifle — lib/cyber/rifle `danoDoTiro`) */
const TIRO_FX: Feitico = { ...FEITICOS.estilhaco, nome: "Tiro", vel: RIFLE.vel, raio: RIFLE.raio, alcance: RIFLE.alcance, dano: RIFLE.dano, explosao: 0, empurra: 0.05, cor: 0xe8f6ff, brilho: 0x8a6bff, bala: true };
import { ALTURA_LANCAMENTO, FABRICA, LOTES, MOTO, PLATAFORMA_MOTO, baseDoRobo, lookDaVaga, esvaziou, fabricaNova, largadasValidas, motoParaMontar, moverRobo, passoFabrica, progressoDaVaga, vagas, type AlvoMoto, type Fabrica, type Lote, type MotoLargada, type MotoMontada } from "@/lib/cyber/motos";
import { criarRoboMotos, type RoboMotosHandle } from "./RoboMotos";
import { criarPistas, type PistasHandle } from "./PistaCorrida";
import { pistaPorId, type Pista } from "@/lib/cyber/corrida/pistas";
import { CONTAGEM_CK, ESPERA_DUPLA_MS, PISTA_CK, botEm, crDe, faseCk, gridCk, lerCr, noBoxCk, novaCorridaCk, passoCk, vencedores, type BotCk, type Concorrente, type CorridaCk, type ModoCk } from "@/lib/cyber/corrida/checkpoints";
import { CONTAGEM, novaCorrida, passoCorrida, tempoDeCorrida, type Corrida, type EventoCorrida, type FaseCorrida } from "@/lib/cyber/corrida/corrida";
import { aguaCheia, efeitoNaVida, gastarDashAgua, naFonte, passoAgua, podeEsforcar, type EstadoAgua, type Fonte } from "@/lib/cyber/agua";
import { PILOTAGEM, motoParada, passoMotoSub, rompeuBarreira, sensacaoDeVelocidade, supersonico, type ComandoMoto, type EstadoMoto } from "@/lib/cyber/motoFisica";
import { LOOPS_MOTO, cambioNeutro, eventosDaMoto, mixDaMoto, passoCambio, setaAcesa, somMotoParada, type Cambio, type EstadoSomMoto } from "@/lib/cyber/somMoto";
import { interpolar, moverRelativoCamera } from "@/lib/lounge3d/sala";
import type { Presenca } from "@/lib/lounge3d/tipos";
import { criarCenaCosmica, type CenaCosmicaHandle } from "./CenaCosmica";
import { atualizarRegiao, criarRegiao, esconderRegiao, soltarRegiao, type RegiaoCena } from "./regioesCena";
import { fundirEstaticos } from "./lotes";
import { esferaRapida, matrizDoAvatar, matrizesDaCena, matrizSeMudou } from "./matrizes";
import { umaPassadaNosTransparentes } from "./umaPassada";
import { criarPoolGemeos, type PoolGemeos } from "./poolGemeos";
import { criarOclusaoDePisos } from "./oclusaoPisos";
import type { Regiao } from "@/lib/cyber/regioes";
import { TELA_BASE, criarBase, type BaseEstudoHandle } from "./BaseEstudo";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { carregarModeloAvatar, criarAvatarLuz, type AvatarLuzHandle, type Montado } from "./AvatarLuz";
import { CORPO_DO_FUNDADOR, corpoProprio, usaCorpoDoFundador } from "@/lib/cyber/estiloAvatar";
import { carregando, type Carregando, type IdEtapa } from "@/lib/cyber/carregamento";
import { gerarVeias, ouveOCoracao } from "@/lib/cyber/coracao";
import { criarFrotaIA, type FrotaHandle } from "./FrotaIA";
import { criarPisosEstudo } from "./EstacionamentosEstudo";
import { AREAS, areaDe, type AreaId } from "@/lib/cyber/frota/areas";
import { sanitizarConfig } from "@/lib/cyber/frota/config";
import { atoresEmpurram, colisoresDeCorpos } from "@/lib/cyber/colisaoAtores";
import { SENTAR, TABLET, codificarDescanso, lugarEm, decodificarDescanso, lugarPerto, poseNoLugar, proximoModo, type Lugar, type ModoDescanso } from "@/lib/cyber/descanso";
import { URL_TERRA } from "./DistritoTerra";
import { acabarVrm, carregarVrm, precarregarVrm, tingirVrm } from "./AvatarVrm";
import { vestirAcessorios } from "./AcessoriosVrm";
import { criarPersonagemVivo, type PersonagemVivoHandle } from "./PersonagemVivo";
import { PERFIS_VIDA } from "@/lib/cyber/vidaPersonagem";
import { CORPOS_VRM } from "@/lib/cyber/estiloAvatar";
import { variacaoBatida, ventoDasAsas } from "@/lib/cyber/asas";
import { FALAS_DROID, HABILIDADES, habilidadeDaTecla, prontaPraUsar, sortear, type IdHabilidade } from "@/lib/cyber/habilidades";

/**
 * Vêm do SERVIDOR (GET da sala), o cliente só pinta: `fundador` = dono — a base dele fica na ZAEON (a ilha no céu).
 * Regalias são validadas na API.
 */
export type PessoaCyber = { id: string; name: string; color: string; fundador?: boolean; /** o corpo próprio de jogador (o servidor decide — lib/lounge3d/corposDeUsuario) */ corpo?: string; /** pilota a nave-QG: o dono ou a tripulação (o servidor decide) */ nave?: boolean; /** o PERSONAGEM escolhido ao entrar (gênero + cor — lib/cyber/personagem): o corpo de astronauta dele */ personagem?: Personagem | null };
/** o TÚNEL de um buraco negro: de onde se entrou e pra onde dá pra ir */
/** um carro da frota: o corpo, o estado de voo (o mesmo da moto), a cabine e o som (os loops só existem enquanto ele
 *  está em uso — 17 carros × 5 loops parados era desperdício) */
type CarroFrota = { h: CarroHandle; vaga: VagaCarro; est: EstadoMoto; pousado: boolean; fase: "parado" | "entrando" | "fechando" | "dirigindo" | "abrindo" | "saindo"; k: number; ligado: number; potencia: number; acel: number; velAnt: number; boost: boolean; loops: Record<(typeof LOOPS_CARRO)[number], LoopSom> | null; somPerto: boolean;
  /** o índice na frota (o `c` da presença) e quem está com ele ONLINE (outra pessoa dirigindo/estacionou) — null = livre */ i: number; posse: PosseCarro | null };
/** a moto que se materializa pra travessia do buraco negro (a "vaga" de origem dela — só pro desenho) */
const MOTO_DO_BURACO = 0;
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
  enviarPos?: (p: { x: number; z: number; facing: number; moving: boolean; sit: boolean; topo: boolean; ceu: boolean; desc?: number; ck?: number; cr?: string; bordo?: { x: number; z: number; nivel: 0 | 1; esc?: number }; voo?: { y: number; yaw: number }; naveParada?: { x: number; y: number; z: number; yaw: number }; jet?: number; alt?: number; moto?: MotoMontada; motoLargada?: MotoLargada; carro?: CarroDirigido; carroLargado?: CarroLargado; atk?: number; hp?: number; arma?: number; mov?: number; mag?: number }) => void;
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
  /** um buraco negro de CAMINHO ÚNICO (o fio cósmico → a sala; a sala → o hub): sem menu, só a travessia */
  onTunelDireto?: (d: { para: IdNo; nome: string }) => void;
  /** um aviso curto pra pessoa (caiu no vazio, buraco negro só do dono…) */
  onAviso?: (msg: string) => void;
  /** NASCE num tubo de ensaio do berçário e faz o tour da anfitriã (o React decide: 1ª vez no hiperespaço novo) */
  /** ONDE o novato nasce: na PRAÇA, a plataforma de baixo (o normal desde out/2026 — de lá só se vai pra Zaeon pelo
   *  portal), ou no TUBO de ensaio com o tour do Droid (o "modo tutorial" ligado / `?nascer=1`) */
  nascerNa?: "praca" | "tubo";
  /** a REGIÃO real da pessoa (lib/cyber/regiaoUsuario): a NAVE COWORKING em que ela começa (lib/cyber/navesRegiao) */
  regiao?: RegiaoReal;
  /** o novato que nasceu na praça cruzou o portal pra Zaeon pela 1ª vez: já nasceu (não é mais novato) */
  onNasceu?: () => void;
  nascer?: boolean;
  /** o passo do tour mudou (null = acabou/pulou) */
  onGuia?: (g: EstadoGuia | null) => void;
  /** a CAIXA DE DIÁLOGO do tutorial (lib/cyber/dialogo): a fala de agora, ou null = some */
  onDialogo?: (d: Dialogo | null) => void;
  /** o tutorial abre (com a pesquisa nova em destaque) ou fecha o INVENTÁRIO */
  onInventario?: (destaque: PesquisaSalva | null) => void;
  /** o tutorial acabou de verdade (não pulado): o banner de "tutorial completo" e as salas abrem */
  onTutorialCompleto?: () => void;
  /** as MOTOS já estão liberadas pra esta pessoa (o servidor diz — User.cyberPerfil) */
  motosLiberadas?: boolean;
  /** já VENCEU o duelo de linguagem da Examiner (a porta da cúpula do Templo Cósmico abre — User.cyberPerfil) */
  examinerLiberado?: boolean;
  /** o DUELO de linguagem (lib/cyber/dueloIngles): depois da cutscene, o React abre o quiz (true) — e devolve o
   *  resultado em `resultadoDuelo` */
  onDuelo?: (abrir: boolean) => void;
  /** o RELICÁRIO DO SABER (lib/cyber/relicario): F/clique nele abre o INVENTÁRIO no modo de ENCAIXE (▶ nos itens que
   *  cabem); o React manda o item pro servidor e devolve o veredito em `entregarNoRelicario` */
  onRelicario?: (abrir: boolean) => void;
  /** o PROGRESSO do tutorial mudou (o React guarda no localStorage — recarregar a página retoma de lá) */
  onProgresso?: (p: ProgressoTutorial) => void;
  /** RETOMAR o tutorial de um progresso salvo (em vez de nascer no tubo): o passo e o lugar */
  retomar?: { passo: IdPassoGuia; onde: OndeRetomar; pesquisa?: PesquisaSalva | null } | null;
  /** o tutorial das motos acabou: o servidor grava a liberação */
  onMotosLiberadas?: () => void;
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
  /** abrir o toca-discos: `canal` = as caixas do lounge (a mesa do DJ / o PC da cabine) ou a MÚSICA DA NAVE (o outro PC) */
  onAbrirSom?: (canal: "lounge" | "nave") => void;
  /** o dono pisou na "call" do RITUAL (o buraco negro da nave): o React abre o painel do ritual (pede acesso antes) */
  onRitual?: () => void;
  /** K: o dono liga/desliga o RITUAL DA NAVE (a mandala, as nuvens e os trovões em volta dela, com a música dela) */
  onRitualNave?: (ligar: boolean) => void;
  /** URL de uma música da playlist do lounge (rota da sala); sem isto (modo solo/prévia) o lounge fica sem som */
  urlMusica?: (arq: string) => string;
  /** as poses remotas JÁ chegam suavizadas (netcode do Colyseus: interpolação + dead reckoning) → usa direto, sem
   *  um 2º lerp (que só somaria atraso) */
  remotosSuaves?: boolean;
  onPerto?: (perto: boolean) => void;
  onFalarCom?: (nome: string | null) => void;
  /** a pessoa chamou um AGENTE DE TRADING (lib/cyber/agentesTrading) pra conversar */
  onAgenteTrading?: (id: string) => void;
  /** a pessoa abriu o COFRE (o portal do monumento, no deck do topo da torre de TI — lib/cyber/cofre) */
  onCofre?: () => void;
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
  /** a música do lounge JÁ na montagem (atrás da tela de carregamento, enquanto as fotos passam): o som começa antes
   *  do mundo aparecer (sem o menu da landing; o áudio destrava se o navegador já tem o gesto da pessoa) */
  somLounge?: SomLounge | null; offsetMusica?: number;
};

type Ator = { id: string; name: string; color: string; av: AvatarLuzHandle; /** corpo FEMININO: veste a astronauta sempre (o traje é o padrão feminino) */ feminina?: boolean; /** a MAGIA dele: o último lançamento visto e o escudo erguido */ magUlt?: number; escudo?: boolean; /** o corpo VRM já pedido (o do founder) */ vrm?: boolean; pos: THREE.Vector3; facing: number; moving: boolean; sit: number; tag: HTMLDivElement; alt: number;
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
  /** o RIFLE dele (lib/cyber/rifle): a arma, na mão / mirando (suavizados), o último tiro visto (seq), a pose de ataque depois do tiro (que
   *  decai), a velocidade medida da posição (os andares com a arma) e se está morto (a animação da morte) */
  rifle?: RifleHandle | null; wRif?: number; wMiraR?: number; tiroSeq?: number; atiraR?: number; velR?: { x: number; z: number }; posAntR?: { x: number; z: number }; morto?: boolean; pitchR?: number;
  /** DESCANSO no lounge (0..1, suavizados): sentado no sofá/puff, deitado no sofá, o tablet na mão; a altura do assento */
  sofa?: number; deita?: number; tab?: number; assentoY?: number; relaxa?: number; pes?: number; poseL?: "trono";
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
  motoLargada?: MotoLargada | null;
  /** remotos: dirigindo um CARRO voador (lib/cyber/carros) e o carro que deixou estacionado fora da vaga */
  carro?: CarroDirigido | null; carroLargado?: CarroLargado | null;
  /** a CORRIDA DE CHECKPOINTS dele: o placar e a corrida ("semente:largada") — da pose */ ck?: number; cr?: string;
  /** A BORDO da nave: a posição LOCAL (suavizada) — o corpo vai em cima da nave que EU vejo */ bordo?: Bordo | null };
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
/** até onde vai o TEMPLO (lib/cyber/templo), medido do centro da ilha */
function raioDoTemplo() { const L = CIDADE.salas.lounge, t = daSala(L, TEMPLO.x, TEMPLO.z); return Math.hypot(t.x, t.z) + TEMPLO.r; }
const AREA_ZAEON = cil(CIDADE.centro, Math.max(CIDADE.bordaR + 90, -CIDADE.salas.lounge.x + CIDADE.salas.lounge.r + 10, raioDoTemplo() + 10, NIVEIS_SEPARADOS ? FIO_COSMICO.alcance + FIO_COSMICO.espiralR + 60 : 0), CIDADE.pisoY, CIDADE.ilhaAltura + 60, 220);   // (+ as pistas cósmicas até os cantos: o fluxo e as tempestades seguem animando lá longe)   // + ilhotas, a escada e o lounge
const AREA_UNILAB = cil(UNIVERSIDADE.centro, UNIVERSIDADE.discoR, UNIVERSIDADE.y, 100, 80);
const AREA_SOLANA = cil(PLATAFORMAS.solana.centro, PLATAFORMAS.solana.r + 10, PLATAFORMAS.solana.y, 40, 40);
/** as FONTES de água (lib/cyber/agua): o espelho d'água do jardim e o coração da capela (o globo das veias azuis) */
const FONTES_AGUA: Fonte[] = [
  { ...daSala(CIDADE.salas.jardim, 0, -8), r: 9, y: ALTURA_LOUNGE, nome: "Espelho d'água" },
  { x: 0, z: 0, r: 22, y: 0, nome: "Coração da capela" },
];
/** a moto travada (antes da entrega ao Droid) */
const AVISO_MOTO_TRAVADA = "As motos se liberam quando o Droid aceitar uma pesquisa sua, completa e em ABNT — leve na Sala do Saber.";
/** a CRUZ da mira (o rifle): 4 traços que abrem com a dispersão (`--abre`), o ponto do meio, o "x" do acerto e o anel
 *  do CALOR (`--calor`, laranja; vermelho piscando travado) */
const CRUZ_CSS = "position:absolute;left:50%;top:50%;width:0;height:0;pointer-events:none;z-index:7;--abre:6px;--calor:0;--acerto:0;";
const CRUZ_HTML = `<style>.zc-t{position:absolute;background:#e9f7ff;box-shadow:0 0 6px #5fd8ff;border-radius:1px}.zc-h{width:9px;height:2px;top:-1px}.zc-v{width:2px;height:9px;left:-1px}
.zc-x{position:absolute;left:-9px;top:-9px;width:18px;height:18px;opacity:var(--acerto);transition:opacity .05s}.zc-x:before,.zc-x:after{content:"";position:absolute;left:8px;top:-1px;width:2px;height:20px;background:#fff;box-shadow:0 0 6px #fff}.zc-x:before{transform:rotate(45deg)}.zc-x:after{transform:rotate(-45deg)}
[data-acerto=cabeca] .zc-x:before,[data-acerto=cabeca] .zc-x:after{background:#ffd36b;box-shadow:0 0 8px #ffb02e}
.zc-c{position:absolute;left:-17px;top:-17px;width:34px;height:34px;border-radius:50%;background:conic-gradient(rgba(255,138,58,.9) calc(var(--calor)*360deg),transparent 0);-webkit-mask:radial-gradient(circle,transparent 15px,#000 16px);mask:radial-gradient(circle,transparent 15px,#000 16px);opacity:calc(var(--calor)*1.4)}
[data-trava="1"] .zc-c{background:rgba(255,60,60,.9);animation:zcPisca .25s infinite alternate}@keyframes zcPisca{to{opacity:.25}}</style>
<div class="zc-c"></div><div class="zc-t zc-h" style="left:calc(-9px - var(--abre))"></div><div class="zc-t zc-h" style="left:var(--abre)"></div>
<div class="zc-t zc-v" style="top:calc(-9px - var(--abre))"></div><div class="zc-t zc-v" style="top:var(--abre)"></div><div class="zc-t" style="left:-1px;top:-1px;width:2px;height:2px"></div><div class="zc-x"></div>`;
const DICA_MIRA_CSS = "position:absolute;left:50%;bottom:92px;transform:translateX(-50%);font:600 12px system-ui,sans-serif;color:#cfeaff;background:rgba(8,14,34,.62);border:1px solid rgba(150,220,255,.3);padding:5px 12px;border-radius:999px;pointer-events:none;white-space:nowrap;";
/** o crachá de quem OPERA (os agentes de trading): dourado, destacado dos outros */
const TAG_TRADER = "color:#ffe2a8;background:rgba(26,16,4,.82);border:1px solid #ffc46b;box-shadow:0 0 12px -2px #ffc46b;";
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
  /** a NAVE COWORKING montada (o nível de uma região) e, a pé nela, a região + o piso (y local) onde se está */
  private naveCw: { r: RegiaoReal; g: THREE.Group; nave: NaveCoworkingHandle; casco: CascoHandle } | null = null;
  private emNaveCw: RegiaoReal | null = null; private pisoNaveCw = 0; private portalNaveArmado = true;
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
  private guia: { passo: number; fala: number; falaT: number; ativo: boolean; lembrete: "" | "concorrencia" | "entregou" | "volte"; viuConcorrencia: boolean; invT: number; saberT: number; andou: number; correu: number; turbo: number; motoAndou: number; portal: boolean; pisoY: number; prev: { x: number; z: number } } | null = null;
  /** o ROTEIRO em curso: o tutorial do novato (ROTEIRO), a ENTREGA na Sala do Saber ou o tutorial das MOTOS */
  private rot: PassoGuia[] = ROTEIRO;
  /** o tutorial já passou da 1ª conversa com a Zaeon: as falas fora de cena viram BALÕES (antes, a caixa de diálogo) */
  private balaoLiberado = false;
  /** a CUTSCENE (lib/cyber/cutscene): o plano de agora (null = a câmera normal), o peso da mistura, a pose suavizada e
   *  se a volta é a lenta (o fim do tutorial); `faixas` = as faixas de cinema (DOM) */
  private cine: { plano: Plano | null; w: number; pose: Pose | null; lenta: boolean; faixas: HTMLDivElement[] } = { plano: null, w: 0, pose: null, lenta: false, faixas: [] };
  /** a pesquisa que a pessoa salvou no tablet durante o tutorial (vira o livro do inventário) */
  private pesquisaDoTutorial: PesquisaSalva | null = null;
  /** o laboratório (no tablet) avisou que a pesquisa da 1ª missão está SALVA: o Droid interrompe — guarda o tablet */
  pesquisaSalva(p: PesquisaSalva) {
    const g = this.guia; if (!g || this.rot[g.passo]?.cond.tipo !== "pesquisa") return;
    this.pesquisaDoTutorial = p; this.fecharTablet(); this.salvarProgresso(this.rot[g.passo]!.id);
  }
  get pesquisaTutorial() { return this.pesquisaDoTutorial; }
  /** a etapa do tour do TABLET (o laboratório avisa — lib/ui/loungeHub MSG_TUTORIAL_ETAPA) */
  private etapaLab: string | null = null;
  etapaDoTablet(etapa: string) { this.etapaLab = etapa; }
  /** a pessoa fechou o inventário (no passo do inventário, o tutorial anda) */
  inventarioFechado() { const g = this.guia; if (g && this.rot[g.passo]?.cond.tipo === "inventario" && g.ativo) g.invT = Infinity; this.vitrine = false; }
  /** o INVENTÁRIO abriu (out/2026, o dono: "ao apertar I a câmera se aproxima do personagem de frente e mostra a
   *  armadura dele"): a câmera vai pra frente do personagem (ele à esquerda da tela, o painel à direita) */
  inventarioAberto(aberto: boolean, cx = 0.3) { this.vitrine = aberto; this.vitrineCx = Math.max(0.1, Math.min(0.9, cx)); }
  /** onde (0..1 da largura da tela) o personagem fica na vitrine — o meio da área livre à esquerda do painel */
  private vitrineCx = 0.3;
  /** a ARMADURA que estou vestindo, como item do inventário (a do fundador: a preta; quem tem corpo próprio: a skin) */
  armadura(): { nome: string; cor: string; raridade: "comum" | "rara" | "epica" | "lendaria"; descricao: string } {
    const proprio = corpoProprio(this.pessoaDe(this.eu.id), location.search);
    if (proprio && proprio.corpo !== CORPO_DO_FUNDADOR) return { nome: "Skin própria", cor: "#c9b6ff", raridade: "epica", descricao: "O corpo que você criou — sem armadura por cima." };
    const fund = !!proprio || !!this.o.eu.fundador || this.ehFundador(this.eu.id);
    if (fund) return { nome: "Armadura Negra", cor: "#3a3f4c", raridade: "lendaria", descricao: "A armadura preta do fundador: placas foscas, manoplas de repulsor e a mochila de voo." };
    const ps = this.personagemDe(this.eu.id), pal = ps ? paletaDoPersonagem(ps) : this.paletaDe(this.eu);
    const cor = pal.startsWith("fem:") ? `#${(PALETAS_FEMININAS.find((x) => `fem:${x.nome}` === pal)?.placa ?? 0xff7ab8).toString(16).padStart(6, "0")}` : pal.startsWith("#") ? pal : "#e8eef6";
    return { nome: "Traje Cósmico", cor, raridade: "rara", descricao: "O traje de astronauta da Zaeon, nas cores que você escolheu: placas, capacete e mochila de voo." };
  }
  /** depois do tutorial, o Droid fica ESPERANDO na Sala do Saber ("só venha falar comigo quando tiver algo de valor") —
   *  pra quem já fez o tutorial (não está nascendo agora), desde a entrada */
  private droidNoSaber = false;
  /** as MOTOS liberadas (o Droid aceitou uma entrega e o tutorial delas acabou — ou é o dono) */
  private motosLiberadas = false;
  /** o veredito da ENTREGA na Sala do Saber (null = esperando a pessoa escolher) e a trava pra não repetir a cena
   *  enquanto ela não se afastar */
  private entregaVeredito: { aceito: boolean; faltando: string[] } | "desistiu" | null = null;
  private entregaArmada = true;
  /** pode MONTAR numa moto? (liberadas, o dono, ou no meio do tutorial delas) */
  private podeMoto() { return this.motosLiberadas || this.podeNave(this.o.eu.id) || (this.rot === ROTEIRO_MOTOS && !!this.guia); }
  /** o resultado da ENTREGA (o painel do React mandou pro servidor): null = a pessoa desistiu */
  private resultadoEntrega(r: { aceito: boolean; faltando: string[] } | null) {
    const g = this.guia; if (!g || this.rot !== ROTEIRO_ENTREGA) return;
    this.entregaVeredito = r ?? "desistiu";
    if (!r) this.rot = [ROTEIRO_ENTREGA[0]!, { id: "recusa", titulo: "Até logo", cena: "droid-perto", cenaInteira: true, falas: [FALA_DESISTIU], cond: { tipo: "ouvir" }, alvo: null }];
    else if (!r.aceito) this.rot = [ROTEIRO_ENTREGA[0]!, passoDaRecusa(r.faltando)];
    // aceita de NOVO (as motos já são dela, ou é o dono): a recompensa já foi — o Droid só reconhece, sem refazer as motos
    else if (this.motosLiberadas || this.podeNave(this.o.eu.id)) this.rot = [ROTEIRO_ENTREGA[0]!, { id: "motos-fim", titulo: "Aceito", cena: "droid-perto", cenaInteira: true, falas: ["Isso sim tem valor. ✦ Aceito.", "Cada entrega de valor fica no Relicário — e conta pra você. Traga a próxima."], cond: { tipo: "ouvir" }, alvo: null }];
  }
  /** o RELICÁRIO DO SABER na Sala do Saber (components/cyber/Relicario) e a entrega em curso (o veredito só sai quando a
   *  Zaeon acaba de ler — lib/cyber/relicario `faseDoRelicario`) */
  private relicario: RelicarioHandle | null = null;
  private entregaPendente: { aceito: boolean; faltando: string[]; t: number } | null = null;
  /** tem uma leitura rodando no Relicário agora? (o React não manda outra entrega por cima) */
  relicarioOcupado() { return !!this.relicario?.ocupado(); }
  private pertoDoRelicario(): boolean {
    if (!this.relicario || !this.noCeu || this.jet.noAr || this.moto !== null) return false;
    const r = relicarioMundo(), y = (this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY) + ALTURA_LOUNGE;
    return Math.hypot(this.eu.pos.x - r.x, this.eu.pos.z - r.z) <= ALCANCE_RELICARIO && Math.abs(this.eu.alt - y) < 3;
  }
  /** F/clique no Relicário: abre o inventário no modo de encaixe (fora do tutorial e com a Zaeon livre) */
  private abrirRelicario() {
    if (!this.relicario) return;
    if (this.guia) { this.o.onAviso?.(this.rot === ROTEIRO ? "Primeiro, ouça o Droid." : "A Zaeon está lendo. Espere o veredito."); return; }
    if (this.relicario.ocupado()) { this.o.onAviso?.("A Zaeon está lendo outra entrega. Espere a leitura acabar."); return; }
    this.soltarMouse(); this.o.onRelicario?.(true);
  }
  /** a ENTREGA foi pro servidor (o React): a cena roda aqui (o item voa, a Zaeon lê) e o veredito sai no fim da leitura */
  entregarNoRelicario(r: { aceito: boolean; faltando: string[]; titulo: string }) {
    if (!this.relicario || this.guia || this.menu) return;
    this.o.onRelicario?.(false);
    if (this.relicario.ocupado()) { this.o.onAviso?.("A Zaeon está lendo outra entrega. A sua fica na fila — tente de novo quando ela acabar."); return; }
    this.relicario.tocar({ de: new THREE.Vector3(this.eu.pos.x, this.eu.alt, this.eu.pos.z), aceito: r.aceito, titulo: r.titulo, nome: this.o.eu.name, cor: this.o.eu.color });
    this.entregaVeredito = null; this.entregaPendente = { aceito: r.aceito, faltando: r.faltando, t: 0 };
    this.rot = ROTEIRO_ENTREGA; this.guia = this.novoGuia(0); this.emitirGuia();
    this.som.tocar("rise", this.eu.av.group.position, { dist: DISTANCIA.perto });
  }
  /** uma entrega de OUTRA pessoa da sala (EV_RELICARIO): a mesma cena, do ponto em que ela está */
  recebeuEventoRelicario(ev: EventoRelicario) {
    if (!this.relicario || ev.userId === this.o.eu.id || !eventoVivo(ev, Date.now()) || this.relicario.ocupado()) return;   // (uma leitura de cada vez)
    const a = this.remotos.get(ev.userId), de = a ? new THREE.Vector3(a.pos.x, a.alt, a.pos.z) : null;
    this.relicario.tocar({ de, aceito: ev.aceito, titulo: ev.titulo, nome: ev.nome, cor: ev.cor, decorrido: Math.max(0, (Date.now() - ev.agora) / 1000) });
  }
  /** o Droid espera na Sala do Saber: quem chega perto dele (motos ainda travadas) ganha a DICA do Relicário, uma vez */
  private talvezEntrega() {
    const d = this.droid; if (!d || !this.droidNoSaber || this.guia || this.menu || this.podeMoto() || d.h.fase() !== "visivel") return;
    const longe = Math.hypot(this.eu.pos.x - d.pos.x, this.eu.pos.z - d.pos.z), alto = Math.abs(this.eu.alt - d.alt);
    if (longe > 30) this.entregaArmada = true;
    if (!this.entregaArmada || longe > 9 || alto > 8) return;
    this.entregaArmada = false; this.droidFala(FALA_DICA_RELICARIO, false);
  }
  /** o "…" em cima da cabeça da Zaeon enquanto ela pensa numa resposta */
  private pensandoZ: HTMLDivElement | null = null;
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
  private falaZ: { texto: string; ultima: boolean; espera: number; limite: number; buf: AudioBuffer | null | undefined; depois?: () => void; semChat?: boolean } | null = null;
  /** a ROTINA da Examiner (o altar do lounge e a pista) e o turno das falas da Zaeon na capela */
  private rotinaExaminer = new RotinaExaminer();
  /** o Templo Cósmico: a Examiner guarda a cúpula; quem venceu o duelo passa (lib/cyber/dueloIngles) */
  private examinerLiberado = false; private cupulaFeita: boolean | null = null;
  private duelo: { fase: "cena" | "quiz"; t: number } | null = null; private dueloEspera = 0;
  private olhosVermelhos: THREE.Object3D[] = []; private falaDueloAte = 0;
  private capelaZ: { proxima: number; recentes: string[]; prox: string | null } = { proxima: 0, recentes: [], prox: null };
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
  /** a pessoa de um id — EU: o que o servidor mandou de mim (o `eu`, com o `fundador` e o `corpo`), por cima da lista da
   *  sala (que às vezes ainda não me tem: o corpo próprio não vinha e o traje pintava na cor de jogador) */
  private pessoaDe(id: string): PessoaCyber | undefined { return id === this.o.eu.id ? { ...this.pessoas.get(id), ...this.o.eu } : this.pessoas.get(id); }
  /** ids na ORDEM canônica dos membros (define a base de cada um). */
  private ordem: string[] = [];
  /** marcos megalíticos (Zaeon…) e o estado "no topo da Zaeon" do dono */
  private lms: LandmarkHandle[] = [];
  /** REGIÕES por distância (components/cyber/regioesCena): de longe some o detalhe e a animação para */
  private regioes = new Map<THREE.Object3D, RegiaoCena>();
  /** a viagem na ESCADA DE ENERGIA do lounge (lib/cyber/ceu `bocaDaEscada`): sobe ou desce sozinha, surfando */
  private viagem: { tipo: "escada" | "elevador" | "garagem"; sentido: "sobe" | "desce"; t: number; sala?: NomeSala } | null = null;
  /** QUALIDADE ADAPTATIVA (lib/cyber/qualidadeAdaptativa): o pixel ratio do perfil é o teto; a escada multiplica */
  private qa!: QualidadeAdaptativa; private prBase = 1; private nitidezFixa = false; private ultimoDesenho = 0;
  /** a NITIDEZ mudou nas configurações (lib/cyber/dispositivo): `null` = a do modo (e a adaptativa volta a mexer) */
  definirNitidez(pr: number | null) {
    const q = this.o.qualidade;
    this.nitidezFixa = pr !== null;
    this.prBase = pr ?? (q ? Math.min(q.pixelRatioMax, window.devicePixelRatio || 1) : this.prBase);
    this.aplicarQualidade(); this.R.setSize(this.w, this.h, false);
  }
  /** o alcance da câmera no degrau cheio (no leve, metade: o mapa sem os campi cabe) e o medidor de FPS (as configs) */
  private farBase = 3600; private quadrosSeg = 0; private inicioSeg = 0; private fpsAgora = 0;
  private frustum = new THREE.Frustum(); private mProj = new THREE.Matrix4(); private esfAtor = new THREE.Sphere();
  private noTopo = false;
  /** em qual marco andável estou no ALTO (escada/plataforma), e a altura do chão sob mim */
  private altoEm: string | null = null; private yNav = 0;
  /** clique na escada vindo do chão: primeiro o pé, depois o ponto clicado */
  private alvoDepois: THREE.Vector2 | null = null;
  /** CIDADE ZAEON (céu) + a NAVE do dono */
  private cidade: CidadeHandle | null = null;
  /** os ESTUDOS da pessoa como LIVROS na biblioteca (components/cyber/LivrosEstudos — lib/estudos/itens) */
  private livros: LivrosHandle | null = null;
  private async carregarLivros() {
    try {
      const r = await fetch("/api/estudos/itens", { cache: "no-store" }); if (!r.ok) return;
      const { itens } = (await r.json()) as { itens: ItemEstudo[] };
      if (!this.vivo || !this.cidade || !itens?.length) return;
      this.livros?.dispose(); this.livros = criarLivrosEstudos(itens, { low: this.o.low });
      this.livros.group.traverse((n) => { n.userData.semLote = true; }); this.cidade.grupoDoNivel("biblioteca").add(this.livros.group);
    } catch { /* sem os livros: a biblioteca segue como está */ }
  }
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
  /** a MÚSICA DA NAVE do dono (o 2º canal do toca-discos): sai da nave, posicional — criado quando a nave existe */
  private musicaNave: SomLoungeHandle | null = null; private musicaNavePendente: { som: SomLounge | null; offset: number } | null = null;
  /** o RITUAL da chegada do dono (lib/cyber/ritual): o estado da sala + o relógio (servidor − cliente) */
  private ritual: Ritual | null = null; private ritualOffset = 0; private ritualFase: FaseRitual = "off";
  /** o que se MOSTRA do ritual (0..1, suavizado — desligado no botão, some devagar): a fumaça e os trovões, e os
   *  anunciadores (a balada e a escadaria); o VERMELHO da escadaria (vai subindo com a música) */
  private ritualI = 0; private anunI = 0; private escadaV = 0;
  /** a BALADA no lounge: as batidas já vistas, o flash da batida (0..1, decaindo), a cor dele, o próximo flash sem música,
   *  o quanto a câmera está DENTRO do lounge (suavizado) e o que se desenha por cima da cena (o véu escuro e os lasers) */
  private batidasVistas = 0; private flash = 0; private flashEm = -99; private flashN = 0; private proxFlash = 0; private noLoungeCam = 0;
  private balada: { veu: THREE.Mesh; luz: THREE.Mesh; cenaVeu: THREE.Scene; camVeu: THREE.OrthographicCamera; neon: THREE.Scene; lasers: THREE.Group; feixes: THREE.Mesh[] } | null = null;
  /** o centro das NUVENS da capela do templo (mundo) — a nave do dono só aparece perto delas; `naveRevelada` = o instante
   *  (s) em que o véu de cada nave saiu (o evento, 1× por ritual) */
  private centroDasNuvens: THREE.Vector3 | null = null;
  /** o TURBO da nave (0..1, com rampa) */
  private turboNave = 0;
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
  // ── a MAGIA CÓSMICA (lib/cyber/magia): a energia, as recargas, o lançamento em curso, o escudo, os projéteis no ar
  //    (os meus e os dos outros — cada máquina simula todos; quem leva confere em si) e os efeitos (components/cyber/MagiaFx)
  private energia: number = ENERGIA.max; private energiaGastaEm = -Infinity; private recargaMagia: Record<string, number> = {};
  private conj: { f: Feitico; t0: number; tDisparo: number; tFim: number; yaw: number; pitch: number; disparou: boolean } | null = null;
  private escudoOn = false; private seqMagia = 0; private magEnviar: { v: number; ate: number } | null = null;
  private projeteis: { id: string; f: Feitico; de: string; deAtor: Ator; dir: THREE.Vector3; o: THREE.Vector3; t0: number; ant: THREE.Vector3; /** um tiro do rifle (não um feitiço) */ tiro?: boolean }[] = [];
  private lancamentosRemotos: { a: Ator; f: Feitico; quando: number; yaw: number; pitch: number }[] = [];
  private tirosRemotos: { a: Ator; quando: number; yaw: number; pitch: number }[] = [];
  private fxMagia: FxMagia | null = null;
  // ── o RIFLE CÓSMICO (lib/cyber/rifle): a arma, quanto dela está na mão (materializa), mirando (o botão direito) e o peso
  //    da mira (a câmera aproxima), o gatilho (segurado = rajada), o calor/trava, a rajada (dispersão), o coice, a
  //    velocidade com inércia, a virada no lugar ("Rifle Turn"), o ponto da mira e a cruz na tela
  private rifle: RifleHandle | null = null; private wRifle = 0; private mirando = false; private wMira = 0; private gatilho = false;
  private proxTiro = 0; private calor = 0; private travadoAte = -Infinity; private ultimoTiro = -Infinity; private rajada = 0; private coice = 0; private seqTiro = 0;
  private velRifle = { x: 0, z: 0 }; private giroRifle: { de: number; ang: number; t0: number; dur: number } | null = null; private freouEm = -Infinity; private morreu = false;
  private alvoMira = new THREE.Vector3(); private cruz: HTMLDivElement | null = null; private reacaoTiroAte = -Infinity;
  /** a câmera PERTO na moto (o V alterna perto ⇄ longe; começa perto) */
  private camMotoPerto = true;
  /** o CARRO VOADOR (components/cyber/CarroHex): a física é a mesma das motos (lib/cyber/motoFisica). As fases: parado →
   *  ENTRANDO (a cabine abre) → FECHANDO (ele já sentado; a cabine fecha e o carro liga) → DIRIGINDO → ABRINDO (pousado,
   *  pediu pra sair) → SAINDO (ele já do lado de fora; a cabine fecha) → parado. `k` = a abertura da cabine (0..1) */
  private carro: CarroFrota | null = null;
  /** os CARROS (lib/cyber/carros): a praça + os estacionamentos da Zaeon; `carro` é o da vez (o que eu uso) */
  private carros: CarroFrota[] = [];
  /** o TECIDO CÓSMICO (lib/cyber/fiosCosmicos): a prancha levando pelo fio (k 0..1, ida ou volta), a boca armada (só
   *  pega de novo depois de sair dela), a sala armada (o buraco negro de volta) e a travessia DIRETA pedida */
  /** a TRAGADA do buraco negro (o magnetismo — lib/cyber/fiosCosmicos `passoTragada`): levando a pessoa (ou o veículo dela) */
  private fio: Tragada | null = null; private fluxoArmado = true;
  private direto: { para: IdNo; pose?: { x: number; z: number; rumo: number } } | null = null;
  /** o NÍVEL em que estou (lib/cyber/nivelAtivo — só ele existe pra mim) e onde eu estava no quadro anterior (um salto
   *  grande = teleporte: o túnel, o portal do Droid) */
  private nivel: IdNivel | null = null; private posNivel = { x: 0, z: 0, alt: 0, ok: false };
  /** o carro que EU deixei estacionado fora da vaga (vai na presença: os outros o veem ali) */
  private carroLargado: CarroLargado | null = null;
  /** os PISOS dos estacionamentos de carros da Zaeon (components/cyber/EstacionamentoCarros) */
  private pisosCarros: PisoCarrosHandle[] = [];
  /** dentro do carro (sentado: fechando, dirigindo ou abrindo) */
  private noCarro() { const f = this.carro?.fase; return f === "fechando" || f === "dirigindo" || f === "abrindo"; }
  /** num veículo que a câmera persegue (moto ou carro) — e o rumo dele */
  private noVeiculo() { return this.moto !== null || this.noCarro(); }
  private rumoVeiculo() { return this.noCarro() ? this.carro!.est.yaw : this.motoEst.yaw; }
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
  /** o zumbido de máquina de cada DROID das estações da Terra (o líder voando acelera) */
  private somDroids: { em: { voando: boolean; lider: boolean }; l: LoopSom }[] = [];
  /** quando avisei por último que o fio está cheio (s, relógio da cena) */
  private avisoFioCheio = -99;
  /** subir/descer da MINHA nave: o som sai 1× no começo da ação (gatilhosVoo) */
  private gatilhoNave = gatilhoVooInicial();
  private somCristais = new Map<string, LoopSom>();
  private passoT = 0; private passoI = 0; private neuronioT = 9; private somNave = somNaveInicial(); private tVivo = 0; private somEntrada = false;
  private sitT = 0; private perto = false; private falandoCom: Ator | null = null;
  private hoverBase: string | null = null; private sobContainer = false;
  private camAz = 0; private camPitch = 0.16; private camDist = 9; private camT = new THREE.Vector3(0, 1.2, 0);
  /** o MODO da câmera (pack de realismo): a órbita padrão ou a PERTO, por cima do ombro — a tecla V alterna e volta pro
   *  modo de antes com o ajuste que a pessoa tinha nele (lib/cyber/camera) */
  private camModo: ModoCamera = "padrao"; private camGuardado: Partial<Record<ModoCamera, { dist: number; pitch: number }>> = {};
  alternarCamera() {
    if (this.noVeiculo()) { this.camMotoPerto = !this.camMotoPerto; this.o.onAviso?.(this.camMotoPerto ? "Câmera da moto: perto · V afasta" : "Câmera da moto: longe · V aproxima"); return this.camModo; }
    const r = alternarModoCamera(this.camModo, { dist: this.camDist, pitch: this.camPitch }, this.camGuardado);
    this.camModo = r.modo; this.camDist = r.dist; this.camPitch = r.pitch; this.camGuardado = r.guardado;
    this.o.onAviso?.(r.modo === "perto" ? "Câmera perto (por cima do ombro) · V volta" : "Câmera padrão · V aproxima");
    return r.modo;
  }
  get modoCamera() { return this.camModo; }
  /** a câmera perto vale agora? (a pé ou de mochila — de moto, pilotando a nave ou a bordo dela, a padrão) */
  private get camPerto() { return this.camModo === "perto" && this.moto === null && !this.pilotando; }
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
    catch (e) { console.error("[cyber] montarMundo falhou:", e); try { eng.dispose(); } catch { /* já quebrado */ } throw e; }
    return eng;
  }

  private constructor(opts: CyberOpts, gltf: GLTF | null) {
    this.o = opts; this.menu = opts.menu; this.gltf = gltf;
    this.examinerLiberado = !!opts.examinerLiberado; this.rotinaExaminer.guardia = NIVEIS_SEPARADOS;
    this.motosLiberadas = !!opts.motosLiberadas; this.droidNoSaber = !opts.nascer;   // quem já fez o tutorial: o Droid espera na Sala do Saber
    this.solidosCidade = solidosDaCidade(!!opts.eu.fundador);
    const { container, low } = opts;
    this.w = Math.max(1, container.clientWidth); this.h = Math.max(1, container.clientHeight);
    const q = opts.qualidade;
    this.R = new THREE.WebGLRenderer({ antialias: q ? q.antialias : !low, powerPreference: "high-performance" });
    this.prBase = q ? pixelRatioDe(q, window.devicePixelRatio || 1) : Math.min(low ? 1.25 : 1.5, window.devicePixelRatio || 1);   // (a nitidez escolhida nas configurações, ou o teto do modo)
    this.nitidezFixa = q?.nitidezFixa !== undefined;
    this.R.setPixelRatio(this.prBase);
    this.R.setSize(this.w, this.h, false);
    this.fpsMax = q?.fpsMax ?? 0;
    this.qa = new QualidadeAdaptativa(this.fpsMax);
    this.R.autoClear = false; this.R.outputColorSpace = THREE.SRGBColorSpace;
    const cv = this.R.domElement; cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:" + (opts.menu ? "pan-y" : "none");
    container.appendChild(cv);
    this.farBase = this.o.low ? 1800 : 3600;   // (no leve: da praça a Zaeon inteira ainda aparece — ~810 m)
    this.cam = new THREE.PerspectiveCamera(45, this.w / this.h, 0.15, this.farBase);
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
    if (!NIVEIS_SEPARADOS) this.montarPraca();   // (com os níveis separados, a praça monta quando se chega nela)
    // a ARENA PvP (a praça inteira — lib/cyber/arena): o anel de combate, os pilares, a placa e os bonecos de treino
    if (!this.o.menu && ARENA_ATIVA) { this.arena = criarArena({ low }); this.cena.scene.add(this.arena.group); }   // (desmontada: a praça é dos novatos)
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
      if (CAPELA_NA_ZAEON) { await etapa("veias"); gerarVeias({ low }); }   // (determinístico e memorizado: a cidade reaproveita; sem capela, sem coração)
      await etapa("zaeon");
      this.cidade = criarCidade({ low, starTex: this.cena.starTex,
        aoRaio: (em) => { if (this.noCentroDaCapela()) this.som?.tocar("raio", em, { dist: DISTANCIA.raio, taxa: 0.9 + Math.random() * 0.2 }); },
        aoBater: (em) => { if (this.noCentroDaCapela()) this.som?.tocar("coracao", em, { dist: DISTANCIA.coracao }); },
        // o TROVÃO de cada raio do ritual (a capela, as salas de estudo, o templo): pra QUEM ESTIVER PERTO — a pé, de moto
        // ou na nave (antes só a pé na Zaeon: o dono, que chega de nave, nunca ouvia) — e DEPOIS do clarão (~340 m/s)
        aoTrovao: (em) => this.trovejar(em) });
      camuflarGrupo(this.cidade.group);
      if (!this.o.menu) void this.carregarLivros();   // os ESTUDOS da pessoa como livros na biblioteca (não segura o carregamento)
      { const c = this.cidade;   // lotes: simula com e sem música (o palco, as caixas e a pista pulsam com o grave)
        fundirEstaticos(c.group, { passo: (k, t) => { c.somTocando(k % 3 !== 0, (k % 5) / 4); c.atualizar(1 / 30, t); }, manter: [...comDescendentes([...c.alvos, c.portalTunel, c.tvLounge]), ...[c.tocaDiscos, ...c.caixasLounge, ...c.caixasAmbiente.map((x) => x.obj)].filter((x): x is THREE.Object3D => !!x)] });   // a mesa do DJ e as bocas das caixas: só o próprio nó (é posição/som, não clique)
        c.somTocando(false); for (let i = 0; i < 6; i++) c.atualizar(1, 0); }
      this.cena.scene.add(this.cidade.group);
      {   // o RELICÁRIO DO SABER na biblioteca (fora dos lotes: ele anima e é alvo de clique)
        const rl = relicarioLocal(), h = criarRelicario({ low }); h.group.position.set(rl.x, ALTURA_LOUNGE, rl.z); h.group.rotation.y = rl.rumo;
        h.group.traverse((n) => { n.userData.semLote = true; }); this.cidade.grupoDoNivel("biblioteca").add(h.group); this.relicario = h;
      }
      this.bercario = criarBercario(this.cidade.grupoDoNivel("zaeon"), { low });   // os tubos de ensaio, ao lado da Recepção (flutuam com a ilha)
      this.holoZaeon = criarHoloZaeon(this.cidade.grupoDoNivel("zaeon"), { low });   // o rosto da Zaeon (só aparece no tutorial)
      if (baseNoQG()) { this.holo = criarHoloRecado(); this.cena.scene.add(this.holo.group); }
      if (UNIVERSIDADES_NO_MAPA) {   // (desligadas a pedido do dono — performance: só a Zaeon, as salas e a Solana House)
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
      }
      await etapa("solana");
      if (!NIVEIS_SEPARADOS) this.montarSolana();   // (com os níveis separados, a Solana monta quando se chega nela)
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
    if (this.cidade?.caixasLounge.length && opts.urlMusica) { this.somLounge = criarSomLounge({ audio: this.som, caixas: this.cidade.caixasLounge, urlDe: opts.urlMusica }); if (NIVEIS_SEPARADOS && this.nivel) this.somLounge.silenciar(this.nivel !== "lounge"); }
    this.setPessoas([...opts.membros]);
    if (this.cidade) this.criarDroid();
    if (this.cidade && this.gltf && personagensLigados()) setTimeout(() => this.criarPersonagens(), 2500);   // depois que a cena montou (o VRM é pesado)
    if (this.cidade && !this.o.menu) this.ligarFrota();
    this.montarSom();
    // sem o menu (entrou pelo site): o SOM já liga aqui, atrás da tela de carregamento — o ambiente e a música do lounge
    // começam enquanto as fotos passam (o navegador só deixa tocar se já houve um gesto; senão, no 1º toque)
    if (!this.menu) { this.som.ativar(); if (opts.somLounge) this.setSomLounge(opts.somLounge, opts.offsetMusica ?? 0); }
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
  /** a ÁGUA (lib/cyber/agua) — o recurso mais vital: o sprint e o turbo gastam, o dash custa um gole, parado volta
   *  devagar, nas FONTES rápido; hidratado a vida volta, com sede ela cai — a barra do HUD. `fonte` = onde está bebendo */
  private agua: EstadoAgua = aguaCheia(); private fonteAgora: string | null = null;
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
  alternarTablet() {
    if (this.tabletQuer || this.labAberto) { this.fecharTablet(); return; }
    // no tutorial, o tablet só abre a partir da MISSÃO (quem abre é o Droid)
    if (this.guia && this.guia.passo < passoDe(PASSO_DA_MISSAO)) { this.o.onAviso?.("Siga o Droid: o tablet abre na sua primeira missão."); return; }
    this.abrirTablet();
  }
  /** dá pra abrir o TABLET? em QUALQUER lugar, de pé (a Zaeon, a praça, os campi, a nave por dentro…) — só não voando,
   *  de moto, pilotando, numa viagem/túnel ou nascendo */
  private aPeParaTablet(): boolean { return !this.menu && !this.jet.noAr && this.moto === null && !this.pilotando && !this.viagem && !this.nascendo && !this.tunel && !this.sobreNave; }
  /** a água agora (0..1), se está seco e onde está bebendo — pro HUD */
  aguaAgora() { return { v: this.agua.v, seco: this.agua.seco, fonte: this.fonteAgora, sede: this.agua.v <= 0 }; }
  abrirTablet() {
    if (!this.aPeParaTablet()) { this.o.onAviso?.("Pare em algum lugar (de pé) pra abrir o tablet."); return; }
    if (this.tabletQuer) return;
    this.tabletQuer = true; this.alvo = null; this.alvoDepois = null; this.soltarTeclas();
    this.som.tocar("tablet-abre", this.eu.av.group.position, { dist: DISTANCIA.eu });
  }
  /** guarda o tablet (o laboratório já fechou ou vai fechar): ele se desfaz em partículas */
  fecharTablet() {
    if (this.tabletQuer || this.labAberto) this.som.tocar("tablet-fecha", this.eu.av.group.position, { dist: DISTANCIA.eu });
    this.tabletQuer = false; this.soltarTeclas();   // o que ficou "apertado" enquanto o lab tinha o foco não anda sozinho depois

    if (this.labAberto) { this.labAberto = false; this.o.onTablet?.(false); }
  }
  get tabletAberto() { return this.labAberto; }
  /** SOLTA tudo o que está "segurado" (WASD, Shift, espaço, E/Q, joystick). Bug de out/2026: apertar uma tecla enquanto o
   *  tablet surgia e soltá-la já com o foco no laboratório (o iframe) — o keyup ia pro lab, a tecla ficava presa aqui e, ao
   *  guardar o tablet, o personagem saía andando sozinho. Vale também pra janela que perde o foco (alt-tab, iframe) */
  soltarTeclas() {
    this.gatilho = false; this.mirando = false;
    this.keys = {}; this.joy = { x: 0, y: 0, on: false }; this.voY.subir = false; this.voY.descer = false;
    if (this.espaco) { this.espaco = false; this.comandoJet(false); }
  }
  /** no CENTRO da capela (no piso, em volta do globo)? — só ali se ouve o coração e o raio (lib/cyber/coracao) */
  private noCentroDaCapela(): boolean {
    if (!this.noCeu || !this.cidade || this.pilotando || this.bordo) return false;
    const c = CIDADE.centro;
    return ouveOCoracao({ x: this.eu.pos.x - c.x, z: this.eu.pos.z - c.z }) && this.eu.alt - this.cidade.ilha.position.y < 25;
  }
  /** estado pra depuração/testes em dev */
  get debug() { return { x: this.eu.pos.x, z: this.eu.pos.z, alt: this.eu.alt, altoEm: this.altoEm, noTopo: this.noTopo, pilotando: this.pilotando, pousado: this.pousado, nave: { ...this.naveEst }, moto: this.moto, motoEst: { ...this.motoEst }, motoPousado: this.motoPousado, plat: this.plat, bordo: this.bordo, noAr: this.jet.noAr, tunel: this.tunel?.origem ?? null, guia: this.guia?.passo ?? null, guiaAlvo: this.guia ? this.alvoDoPasso(this.rot[this.guia.passo]!) : null, instancia: this.instancia, bocaDJ: bocaDJMundo(), nascendo: !!this.nascendo, droid: this.droid ? { fase: this.droid.h.fase(), x: this.droid.pos.x, z: this.droid.pos.z, alt: this.droid.alt } : null, guiaAtivo: this.guia?.ativo ?? null }; }

  /** Reconstrói bases/atores quando a lista de membros muda (alguém entrou na sala). */
  setPessoas(lista: PessoaCyber[]) {
    if (lista.some((p) => usaCorpoDoFundador(p.fundador, location.search))) void precarregarVrm(CORPO_DO_FUNDADOR.url).catch(() => undefined);   // o corpo do founder já vai baixando
    for (const p of lista) { const c = corpoProprio(p, location.search); if (c && !c.asas) void precarregarVrm(c.corpo.url).catch(() => undefined); }   // e o dos jogadores com corpo próprio
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
      else this.eu.facing = lay?.nivel ? this.rotAssento() + Math.PI : Math.atan2(PRACA.x - sp.x, PRACA.z - sp.z);
      this.camT.set(this.eu.pos.x, 1.2 + this.yDoNivel(lay?.nivel), this.eu.pos.z);
      if (!this.menu && !(this.o.nascer && (this.o.retomar ? this.retomarTutorial(this.o.retomar) : this.nascerNoTubo())) && !this.spawnNaNave()) this.irParaNaveCw(this.o.regiao ?? REGIAO_PADRAO);   // quem chega nasce no tubo; o dono, a bordo da nave-QG; o resto, na NAVE COWORKING da região
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
  /** CORPO PRÓPRIO (VRM do VRoid): o do FOUNDER (CORPO_DO_FUNDADOR, com as asas) ou o de um jogador que o servidor
   *  marcou (lib/cyber/estiloAvatar CORPOS_DE_JOGADOR). Baixa sem travar; vale pra pessoa e pra quem a vê de fora */
  private vestirFundador(a: Ator) {
    const proprio = corpoProprio(this.pessoaDe(a.id), location.search);
    if (a.vrm || !this.gltf || !proprio) return;
    a.vrm = true;
    if (proprio.asas) a.av.usarAsas();   // as asas negras no lugar da mochila (já, sem esperar o corpo) — só o founder
    a.av.esperarCorpo(true);   // o corpo padrão NÃO aparece enquanto o próprio carrega
    carregarVrm(proprio.corpo.url).then((vrm) => {
      const vivo = this.vivo && (a === this.eu || this.remotos.get(a.id) === a);
      if (!vivo) return;
      tingirVrm(vrm, proprio.corpo.tintas); acabarVrm(vrm, proprio.corpo); a.av.usarVrm(vrm);
      if (proprio.corpo.pose === "feminina") { a.av.estiloVrm("feminina", { parada: true }); a.feminina = true; }   // pack de realismo: a marcha e a pose em pé femininas; e o TRAJE de astronauta é o padrão delas
      if (proprio.corpo.acessorios?.length) vestirAcessorios(vrm, proprio.corpo.acessorios);
    }).catch((e) => { console.warn("[cyber] corpo próprio (VRM) não carregou:", e); a.av.esperarCorpo(false); });
  }

  /** cria os personagens da cidadela (a Nina) — cada um com o corpo VRM dele e a agenda própria */
  /** a FROTA DE IAs: a config vem do servidor (o mesmo relógio pra todos); sem ela (offline), nada */
  private ligarFrota() {
    if (this.frota || !this.vivo) return;
    this.frota = criarFrotaIA({ cena: this.cena.scene, overlay: this.o.overlay, gltf: this.gltf, starTex: this.cena.starTex, low: this.o.low }); this.frota.alcance(this.qa.atual.alcance);
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
  /** este quadro, os outros corpos podem empurrar o meu avatar? (só andando — lib/cyber/colisaoAtores atoresEmpurram) */
  private euEmpurravel = true;
  /** os CORPOS no meu nível (jogadores, personagens, IAs): o meu avatar não entra neles — mas, PARADO, ninguém me arrasta */
  private colisoresDeAtores() {
    if (!this.euEmpurravel) return [];
    const corpos: { x: number; z: number; y: number }[] = [];
    for (const a of this.remotos.values()) if (a.av.group.visible) corpos.push({ x: a.pos.x, z: a.pos.z, y: a.alt });
    for (const p of this.personagens) if (p.h.group.visible) corpos.push({ x: p.h.pos.x, z: p.h.pos.z, y: p.h.alt });
    if (this.frota) corpos.push(...this.frota.corpos());
    return colisoresDeCorpos(corpos, this.eu.alt);
  }
  private criarPersonagens() {
    if (!this.vivo || !this.cidade || !this.gltf || this.personagens.length) return;
    // o DJ (o Scholar) na cabine da torre, de frente pra pista, com o fone e as mãos na controladora — PRIMEIRO da lista:
    // o corpo dele é o 1º da fila de VRMs (a festa não espera os 13 da cidadela carregarem)
    { const p = DJ_DO_LOUNGE, corpo = CORPOS_VRM[p.id], perfil = PERFIS_VIDA[p.id];
      if (corpo && perfil) {
        const h = criarPersonagemVivo({ ...p, corpo, perfil, starTex: this.cena.starTex, low: this.o.low, gltf: this.gltf, cena: this.cena.scene, preparar: (obj) => this.prepararVrm(obj), fixo: { pos: pontoDaCabineDJ(), y: PISO_FESTA + TORRE_DJ.topo, rumo: rumoDoDJ(), dj: true } });
        const tag = document.createElement("div"); tag.style.cssText = TAG_CSS + "color:" + p.cor + ";"; tag.textContent = `${p.nome} · DJ`; this.o.overlay.appendChild(tag);
        this.personagens.push({ h, tag });
      } }
    // a NINA e o TÉO: FIXOS nas estações do MIRANTE da torre de TI (o Templo Cósmico), mexendo nos computadores
    for (const p of PERSONAGENS_DA_TORRE) {
      const corpo = CORPOS_VRM[p.id], cab = CABINES_TORRE.find((c) => c.quem === p.id); if (!corpo || !cab) continue;
      const perfil = PERFIS_VIDA[p.id] ?? { id: p.id, semente: 0, lado: 0, vaga: { x: 0, z: 0, rumo: 0 } };   // (fixos: a agenda e a moto não entram)
      const L = CIDADE.salas.lounge, assento = daCabineTI(cab, 0, CABINE_TI.assentoZ + 0.1);
      const h = criarPersonagemVivo({ ...p, corpo, perfil, starTex: this.cena.starTex, low: this.o.low, gltf: this.gltf, cena: this.cena.scene, preparar: (obj) => this.prepararVrm(obj), fixo: { pos: mundo(daSala(L, assento.x, assento.z)), y: ALTURA_LOUNGE + cab.y, rumo: rumoNaSala(L, cab.rot), trabalha: true } });
      const tag = document.createElement("div"); tag.style.cssText = TAG_CSS + "color:" + p.cor + ";"; tag.textContent = p.nome; this.o.overlay.appendChild(tag);
      this.personagens.push({ h, tag });
    }
    // os AGENTES DE TRADING (lib/cyber/agentesTrading): FIXOS nos terminais da mesa de operações do campus, com as skins
    // comuns e o crachá DOURADO de quem opera (destacados do resto — dá pra falar com eles)
    AGENTES_TRADING.forEach((a, k) => {
      const corpo = CORPOS_VRM[a.skin], term = ESTACOES_TI[k]; if (!corpo || !term) return;
      const perfil = { id: a.id, semente: k, lado: 0, vaga: { x: 0, z: 0, rumo: 0 } };
      const L = CIDADE.salas.lounge, assento = daCabineTI(term, 0, CABINE_TI.assentoZ + 0.1);
      const h = criarPersonagemVivo({ id: a.id, nome: a.nome, cor: a.cor, corMoto: a.cor, corpo, perfil, starTex: this.cena.starTex, low: this.o.low, gltf: this.gltf!, cena: this.cena.scene, preparar: (obj) => this.prepararVrm(obj), fixo: { pos: mundo(daSala(L, assento.x, assento.z)), y: ALTURA_LOUNGE - SALAO.desce, rumo: rumoNaSala(L, term.rot), trabalha: true } });
      const tag = document.createElement("div"); tag.style.cssText = TAG_CSS + TAG_TRADER; tag.innerHTML = `<span style="color:#1a1004;background:#ffc46b;border-radius:999px;padding:0 5px;margin-right:5px;font-weight:900">◆ TRADER IA</span>${a.nome} · <span style="opacity:.8">${a.papel}</span>`; this.o.overlay.appendChild(tag);
      this.personagens.push({ h, tag });
    });
    for (const p of PERSONAGENS_DA_CIDADELA) {
      const corpo = CORPOS_VRM[p.id]; if (!corpo) continue;
      const perfil = PERFIS_VIDA[p.id]; if (!perfil) continue;
      const h = criarPersonagemVivo({ ...p, corpo, perfil, starTex: this.cena.starTex, low: this.o.low, gltf: this.gltf, cena: this.cena.scene, preparar: (obj) => this.prepararVrm(obj), ...(p.id === "examiner" ? { roteiro: () => this.rotinaExaminer.estado(), asas: true } : {}) });
      const tag = document.createElement("div"); tag.style.cssText = TAG_CSS + "color:" + p.cor + ";"; tag.textContent = p.nome; this.o.overlay.appendChild(tag);
      this.personagens.push({ h, tag });
    }
  }
  // ───────────── o DUELO DE LINGUAGEM da Examiner (o Templo Cósmico — lib/cyber/dueloIngles) ─────────────
  /** na frente do PORTAL do monumento (o cubo no deck do topo da torre de TI), a pé: a entrada do cofre */
  private pertoDoCofre(): boolean {
    if (this.nivel !== "lounge" || this.jet.noAr) return false;
    const L = CIDADE.salas.lounge, w = mundo(daSala(L, CYBER.x, CYBER.z + CUBO_CYBER.meia + 1.2));
    return Math.hypot(this.eu.pos.x - w.x, this.eu.pos.z - w.z) < 4 && Math.abs(this.eu.alt - (CIDADE.pisoY + ALTURA_LOUNGE + CYBER.h)) < 2;
  }
  /** o agente de trading ao meu alcance (a menos de 3,2 m, na mesma altura) */
  private traderPerto() {
    let melhor: { h: PersonagemVivoHandle; tag: HTMLDivElement } | null = null, dm = 3.2;
    for (const p of this.personagens) { if (!p.h.id.startsWith("trader-") || !p.h.group.visible) continue; const d = Math.hypot(p.h.pos.x - this.eu.pos.x, p.h.pos.z - this.eu.pos.z); if (d < dm && Math.abs(p.h.alt - this.eu.alt) < 2.5) { dm = d; melhor = p; } }
    return melhor;
  }
  private examiner() { return this.personagens.find((p) => p.h.id === "examiner")?.h ?? null; }
  /** a cúpula, a guardiã e o duelo — a cada quadro */
  private atualizarDuelo(dt: number) {
    if (!NIVEIS_SEPARADOS || !this.cidade) return;
    if (this.cupulaFeita !== this.examinerLiberado) { this.cidade.cupulaAberta(this.examinerLiberado); this.cupulaFeita = this.examinerLiberado; }
    if (this.falaDueloAte && performance.now() > this.falaDueloAte) { this.falaDueloAte = 0; this.o.onDialogo?.(null); }
    if (this.nivel !== "lounge") { if (this.duelo) this.cancelarDuelo(); return; }
    const L = CIDADE.salas.lounge, c = CIDADE.centro, eu = this.eu, ilhaY = this.cidade.ilha.position.y;
    // a CÚPULA: quem ainda não venceu e entrou (pela porta ou voando por cima) volta pro pé da porta
    if (!this.examinerLiberado && !this.moto && !this.noCarro() && eu.alt < ilhaY + ALTURA_LOUNGE + TEMPLO.h + CUPULA.alt) {
      const fora = barradoNaCupula(naSala(L, eu.pos.x - c.x, eu.pos.z - c.z), false);
      if (fora) { const w = mundo(daSala(L, fora.x, fora.z)); eu.pos.set(w.x, 0, w.z); eu.alt = ilhaY + alturaNaCidade(w); this.jet.noAr = false; this.jet.vy = 0; this.alvo = null; this.alvoDepois = null; }
    }
    const ex = this.examiner(); if (!ex) return;
    for (const o of this.olhosVermelhos) o.scale.setScalar((o.userData.base as number) * (0.85 + 0.3 * Math.random()));   // (o brilho tremendo)
    if (!this.duelo) {
      if (this.examinerLiberado || Date.now() < this.dueloEspera || this.guia || this.menu || this.moto || this.noCarro()) return;
      if (Math.hypot(eu.pos.x - ex.pos.x, eu.pos.z - ex.pos.z) < ALCANCE_DUELO && Math.abs(eu.alt - ex.alt) < 8) this.abrirDuelo();
      return;
    }
    this.duelo.t += dt;
    if (!this.olhosVermelhos.length) this.acenderOlhos(true);   // (o corpo dela ainda carregava quando o duelo abriu)
    if (this.duelo.fase === "cena" && this.duelo.t > 4.6) { this.duelo.fase = "quiz"; this.o.onDialogo?.(null); this.soltarMouse(); this.o.onDuelo?.(true); }
  }
  private abrirDuelo() {
    this.duelo = { fase: "cena", t: 0 }; this.alvo = null; this.alvoDepois = null; this.keys = {}; this.joy = { x: 0, y: 0, on: false }; this.jet.noAr = false;
    this.acenderOlhos(true);
    this.som.tocar("rise", this.eu.av.group.position, { dist: DISTANCIA.perto });
    this.o.onDialogo?.({ quem: "examiner", nome: "Examiner", cor: "#ff3344", texto: FALA_DESAFIO, instrucao: false, alerta: true });
    if (!this.o.onDuelo) this.resultadoDuelo(false);   // (sem o React do quiz: não trava ninguém)
  }
  /** os OLHOS vermelhos: um brilho em cada olho do VRM dela (por cima de tudo, tremendo) */
  private acenderOlhos(on: boolean) {
    for (const o of this.olhosVermelhos) { o.removeFromParent(); ((o as THREE.Sprite).material as THREE.Material).dispose(); }
    this.olhosVermelhos = [];
    if (!on) return;
    const ossos = this.examiner()?.olhos(); if (!ossos) return;
    for (const b of ossos) for (const [esc, op] of [[0.07, 1], [0.32, 0.45]] as const) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.cena.starTex, color: 0xff1a2a, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false }));
      sp.renderOrder = 30; sp.userData.base = esc * (ossos.length === 1 ? 2 : 1); sp.scale.setScalar(sp.userData.base as number); b.add(sp); this.olhosVermelhos.push(sp);
    }
  }
  /** o React devolve o veredito do duelo (depois da tela do resultado): venceu = a porta abre pra sempre; perdeu = volta
   *  pra escada e espera `ESPERA_S` */
  resultadoDuelo(passou: boolean) {
    if (!this.duelo && !passou) return;
    this.duelo = null; this.acenderOlhos(false); this.o.onDuelo?.(false);
    if (passou) {
      this.examinerLiberado = true;
      this.o.onDialogo?.({ quem: "examiner", nome: "Examiner", cor: "#ff3344", texto: "Então você fala a língua do outro lado. A porta está aberta — e o que vem acima também.", instrucao: false });
    } else {
      this.dueloEspera = Date.now() + ESPERA_S * 1000; this.descerDaPorta();
      this.o.onDialogo?.({ quem: "examiner", nome: "Examiner", cor: "#ff3344", texto: "Ainda não. Volte quando a barreira tiver caído.", instrucao: false, alerta: true });
    }
    this.falaDueloAte = performance.now() + 5200;
  }
  /** fechou o quiz no meio: não conta como derrota, mas desce um pouco (pra não abrir de novo na hora) */
  cancelarDuelo() {
    if (!this.duelo) return;
    this.duelo = null; this.acenderOlhos(false); this.o.onDuelo?.(false); this.o.onDialogo?.(null);
    this.dueloEspera = Date.now() + 8000; this.descerDaPorta();
  }
  /** põe quem perdeu no meio da escadaria-veia (descendo) */
  private descerDaPorta() {
    if (!this.cidade) return;
    const { pts } = curvaDaEscadaria(), p = pts[Math.floor(pts.length * 0.55)]!, L = CIDADE.salas.lounge, w = mundo(daSala(L, p.x, p.z));
    this.eu.pos.set(w.x, 0, w.z); this.eu.alt = this.cidade.ilha.position.y + alturaNaCidade(w); this.jet.noAr = false; this.alvo = null; this.alvoDepois = null;
    this.eu.facing = Math.atan2(daSala(L, pts[0]!.x, pts[0]!.z).x - daSala(L, p.x, p.z).x, daSala(L, pts[0]!.x, pts[0]!.z).z - daSala(L, p.x, p.z).z);
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
  /** os anéis de corrida aparecem? (lib/cyber/praca: a plataforma da praça, uma corrida, ou de moto no nível dela) */
  private anelVisivel(): boolean {
    if (this.corrida || this.ck) return true;
    const p = this.eu.pos, d = Math.hypot(p.x - PRACA.x, p.z - PRACA.z), y = this.eu.alt - PRACA.y;
    if (naPraca(p, 10) && Math.abs(y) < 25) return true;
    return this.moto !== null && d < 480 && y > -30 && y < 30;
  }
  /** tem jogador (eu ou alguém da sala) no piso do TEMPLO agora? */
  private genteNoTemplo(): boolean {
    const y = (this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY) + ALTURA_LOUNGE + TEMPLO.h, L = CIDADE.salas.lounge;
    const la = (p: { x: number; z: number }, alt: number) => Math.abs(alt - y) < 12 && noTemplo(naSala(L, p.x - CIDADE.centro.x, p.z - CIDADE.centro.z), 3);
    if (!this.instancia && la(this.eu.pos, this.eu.alt)) return true;
    for (const a of this.remotos.values()) if (la(a.pos, a.alt)) return true;
    return false;
  }
  private atualizarPersonagens(dt: number, t: number) {
    if (!this.personagens.length) return;
    // a Examiner trabalha no desktop do templo e NÃO fica na sala com quem chega: tem gente lá em cima, ela desce pro
    // lounge (e com música, às vezes, desce por conta própria — lib/cyber/examiner)
    this.rotinaExaminer.passo(dt, !!this.somLounge?.tocando, this.genteNoTemplo());
    const ilhaY = this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY, agora = Date.now() / 1000, some = this.instancia;   // no tutorial (instância só da pessoa), ninguém mais aparece
    const eu = [{ x: this.eu.pos.x, z: this.eu.pos.z }, ...[...this.remotos.values()].map((a) => ({ x: a.pos.x, z: a.pos.z }))];   // desviam de quem está no caminho
    for (const p of this.personagens) { p.h.mostrar(!some && this.noMeuNivel(p.h.pos, p.h.alt)); p.h.atualizar(dt, t, agora, ilhaY, this.cam.position, eu); }   // (noutro nível: não aparece — a agenda segue andando)
  }
  private removerAtor(a: Ator) { a.vozH?.remover(); a.vozH = null; this.soltarSomNave(a); this.soltarSomJet(a); if (a.somAsas) { this.som.soltarLoop(a.somAsas); a.somAsas = null; } if (a.somFio) { this.som.soltarLoop(a.somFio); a.somFio = null; } a.nave?.dispose(); a.nave = null; a.espada?.dispose(); a.espada = null; a.rifle?.dispose(); a.rifle = null; a.av.dispose(); a.tag.remove(); this.falas = this.falas.filter((f) => { if (f.ator === a) { f.el.remove(); return false; } return true; }); }

  // ───────────── API pública (React → engine) ─────────────
  iniciar(go = "viajar") {
    if (!this.menu) return; this.menu = false; this.holdT = 0;
    this.o.els.menu && (this.o.els.menu.style.display = "none"); if (this.o.els.hold) this.o.els.hold.style.width = "0%";
    this.som.ativar();   // o whoosh de entrada sai em atualizarSom, quando o buffer chegar
    this.R.domElement.style.touchAction = "none";
    // saiu da vista/menu: o NOVATO nasce na praça (ou no tubo, no modo tutorial); o dono, a bordo da nave
    const nasceu = this.o.nascer && (this.o.nascerNa === "tubo" ? (this.o.retomar ? this.retomarTutorial(this.o.retomar) : this.nascerNoTubo()) : this.nascerNaPraca());
    if (!nasceu && !this.spawnNaCabana() && !this.spawnPertoDoCarro() && !this.spawnNaNave()) this.irParaNaveCw(this.o.regiao ?? REGIAO_PADRAO);   // (o dono, pra testar o fluxo das pistas: nasce ao lado dos carros — pedido dele)
    this.o.onSessao?.(go);
  }
  setJoystick(x: number, y: number) { this.joy.x = x; this.joy.y = y; this.joy.on = Math.hypot(x, y) > 0.15; }
  /** pausa a cena (ex.: celular em pé esperando girar) — não renderiza nem simula */
  pausar(on: boolean) { this.pausado = on; if (!on) this.clock.getDelta(); }
  alternarCorrer(): boolean { this.correr = !this.correr; return this.correr; }
  /** DASH (C / botão DASH): um arranque curto pra onde se está indo (parado: pra frente), no chão ou no ar de mochila —
   *  o começo é intocável (lib/cyber/movimento). Não vale de moto, pilotando, sentado, no tablet, no tubo ou no túnel */
  darDash(): boolean {
    if (this.menu || this.noVeiculo() || this.pilotando || this.descanso || this.tabletQuer || this.labAberto || this.nascendo || this.tunel || this.noTopo) return false;
    const agora = performance.now() * 0.001;   // (o relógio de VERDADE no aperto — o do último quadro pode estar atrasado; a esquiva é questão de ms)
    if (!podeDash(this.dash, agora)) return false;
    const comAgua = gastarDashAgua(this.agua, this.agora); if (!comAgua) return false;   // sem água: não sai
    this.agua = comAgua;
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
    if (this.inv.equipado === "rifle-cosmico") return false;   // (o rifle atira pelo gatilho — `puxarGatilho`)
    if (!this.inv.equipado || this.menu || this.noVeiculo() || this.pilotando || this.descanso || this.tabletQuer || this.labAberto || this.nascendo || this.tunel || this.agora < this.caidoAte) return false;
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
  /** o ZUMBIDO da prancha cósmica: liga na prancha, a afinação sobe com a velocidade */
  private somPrancha: LoopSom | null = null; private naPrancha = false;
  private somDaPrancha(on: boolean, _dt: number) {
    if (!this.som) return;
    if (on && !this.somPrancha) this.somPrancha = this.som.loop("fio-zumbido", this.eu.av.group, { dist: DISTANCIA.eu, volume: 0.45 });
    if (!this.somPrancha) return;
    this.som.volumeLoop(this.somPrancha, on ? 1 : 0, on ? 6 : 3);
    this.som.taxaLoop(this.somPrancha, 0.85 + Math.min(0.5, this.velPlano / 40));
  }
  private movAgora(t: number): number {
    if (this.escudoOn) return MOV_ESCUDO;
    if (this.dashAtivo) return 2;
    if (t - this.tHeroi < 1.1) return 4;
    if (this.decola || t - this.tDecolou < this.esperaDecolou + 0.45) return 5;
    if (this.wSprint > 0.5) return 1;
    if (pesoAlerta(t - this.tFimDash) > 0.3 || this.wGuardaArena > 0.5) return 3;
    return 0;
  }
  /** a vida e o estado do combate (o HUD do React lê) */
  combate() { return { vida: this.vida, max: VIDA_MAX, caido: this.agora < this.caidoAte, naArena: !!this.eu && !this.noCeu && naArena(this.eu.pos), arma: this.inv.equipado ? ITENS[this.inv.equipado].nome : null, energia: this.energia / ENERGIA.max, escudo: this.escudoOn, calor: this.wRifle > 0.05 ? this.calor : null, travado: this.agora < this.travadoAte }; }
  private fx(): FxMagia { this.fxMagia ??= criarFxMagia(this.cena.scene, { low: this.o.low }); return this.fxMagia; }
  /** a ZONA DE DUELO (a praça — a plataforma das motos e das corridas): só ali a magia de um tira vida do outro */
  private naZonaDeDuelo(p: { x: number; z: number }, ceu: boolean) { return !ceu && dentroDaArena(p); }
  /** LANÇAR (Q / E): a animação de quem lança, o brilho na mão e, no quadro do disparo, o projétil pra onde a câmera mira */
  lancar(f: Feitico): boolean {
    if (this.menu || this.noVeiculo() || this.pilotando || this.descanso || this.tabletQuer || this.labAberto || this.nascendo || this.tunel || this.agora < this.caidoAte || this.bordo || this.carro?.fase !== undefined && this.carro.fase !== "parado") return false;
    if (this.conj || this.escudoOn) return false;
    const t = this.agora;
    if (!podeLancar(this.energia, f, this.recargaMagia[f.id] ?? 0, t)) { this.o.onAviso?.(this.energia < f.energia ? "Sem energia cósmica — espere recarregar" : `${f.nome}: recarregando`); return false; }
    this.energia -= f.energia; this.energiaGastaEm = t; this.recargaMagia[f.id] = t + f.recarga;
    // a mira: pra onde a câmera olha (o rumo) e um tiquinho da inclinação dela
    const yaw = this.camAz + Math.PI, pitch = Math.max(-0.45, Math.min(0.45, -(this.camPitch - 0.12) * 0.6));
    this.eu.facing = yaw; this.alvo = null; this.alvoDepois = null;
    const dur = DURACAO_CLIPE[f.clipe];
    this.conj = { f, t0: t, tDisparo: t + instanteDoDisparo(f, dur), tFim: t + duracaoLancamento(f, dur) * 0.82, yaw, pitch, disparou: false };
    this.eu.av.tocarClipe(f.clipe, { velocidade: f.velClipe });
    this.fx().carga("eu", f, () => this.eu.av.pontoDaMao("direita", new THREE.Vector3()), this.conj.tDisparo);
    this.magEnviar = { v: codificarLancamento(++this.seqMagia, f, yaw, pitch), ate: t + 1.2 };
    this.som.tocar("alerta", this.eu.av.group.position, { dist: DISTANCIA.eu, volume: 0.5, taxa: f.explosao ? 0.6 : 1.3 });
    return true;
  }
  /** o ESCUDO (segurar R): os braços cruzados; gasta energia enquanto segura */
  erguerEscudo(on: boolean) {
    if (on && (this.conj || this.noVeiculo() || this.pilotando || this.descanso || this.agora < this.caidoAte || this.energia < 5)) return;
    if (on === this.escudoOn) return;
    this.escudoOn = on;
    if (on) this.eu.av.tocarClipe(ESCUDO.clipe, { segurar: true }); else this.eu.av.soltarClipe();
  }
  // ───────────── o RIFLE CÓSMICO (lib/cyber/rifle) ─────────────
  /** o PERSONAGEM escolhido por alguém (gênero + cor — o servidor manda junto com a pessoa) */
  private personagemDe(id: string): Personagem | null { return this.pessoas.get(id)?.personagem ?? (id === this.o.eu.id ? this.o.eu.personagem ?? null : null); }
  /** o CORPO DE ASTRONAUTA de alguém (components/cyber/CorpoAstronauta) — o PERSONAGEM STOCK de todos os jogadores, sempre
   *  (com ou sem rifle; o corpo antigo não aparece mais): no modelo e na cor que a pessoa escolheu (lib/cyber/personagem);
   *  quem ainda não escolheu veste a astronauta se tem corpo feminino, o astronauta se não, na cor dela. A do fundador:
   *  a preta */
  private vestirTraje(a: Ator) {
    // quem tem CORPO PRÓPRIO de jogador feito no VRoid (estilo anime — a Giulia) fica com a SKIN: a armadura cobria ela.
    // O FUNDADOR veste a armadura PRETA por cima do corpo dele (out/2026, o dono: "volta a armadura preta só pra mim")
    const proprio = corpoProprio(this.pessoaDe(a.id), location.search);
    if (proprio && proprio.corpo !== CORPO_DO_FUNDADOR) { a.av.traje(false); return; }
    const ps = this.personagemDe(a.id);
    // (o FUNDADOR: pelo corpo dele ou pelo `eu` que o servidor mandou — a lista de pessoas da sala às vezes ainda não
    //  tem a gente, e o traje pintava na cor de jogador: o amarelo)
    const fund = !!proprio || (a === this.eu ? !!this.o.eu.fundador || this.ehFundador(a.id) : this.ehFundador(a.id));
    // (o MEU com o traje detalhado; o dos outros, o LEVE — menos triângulos, sem as manoplas)
    a.av.traje(true, { paleta: fund ? "preta" : ps ? paletaDoPersonagem(ps) : this.paletaDe(a), modelo: ps?.genero, leve: a !== this.eu });
  }
  /** a cor da armadura de astronauta de alguém: a cor do jogador (a do fundador é a preta) */
  private paletaDe(a: Ator): Paleta {
    const c = (a.color.startsWith("#") ? a.color : `#${a.color}`) as `#${string}`;
    return a.feminina ? paletaFeminina(c) : c;   // (a standard feminina: a cor feminina mais próxima da dela)
  }
  private rifleEquipado() { return this.inv.equipado === "rifle-cosmico"; }
  /** dá pra estar com o rifle agora? (a pé no chão, sem lançar nem escudo, sem moto/nave/sofá/tablet, vivo) */
  private podeRifle() {
    return this.rifleEquipado() && !this.menu && this.moto === null && !this.pilotando && !this.descanso && !this.tabletQuer && !this.labAberto && !this.nascendo && !this.tunel && !this.jet.noAr && !this.decola && !this.conj && !this.escudoOn && this.agora >= this.caidoAte && !this.emCena && !this.viagemNave;
  }
  /** a tecla 1: saca o rifle (equipa) ⇄ guarda */
  alternarRifle() {
    const saca = !this.rifleEquipado();
    this.equipar(saca ? "rifle-cosmico" : null);
    this.o.onAviso?.(saca ? "Rifle Cósmico na mão · botão direito mira · clique atira · 1 guarda" : "Rifle guardado");
    if (saca) this.som.tocar("rifle-saca", this.eu.av.group.position, { dist: DISTANCIA.eu });
  }
  /** o GATILHO (clique com o mouse travado / X): segurado, rajada */
  puxarGatilho(on: boolean) { this.gatilho = on && this.rifleEquipado(); }
  /** MIRAR (botão direito segurado) */
  mirar(on: boolean) { this.mirando = on && this.rifleEquipado(); }
  /** o PONTO DA MIRA: o raio do meio da tela (a câmera) — o 1º corpo, o chão, ou o alcance */
  private atualizarMira() {
    const o = this.cam.position, d = this.cam.getWorldDirection(this.vRastroB);
    const corpos = [...this.remotos.values()].filter((a) => !a.morto).map((a) => ({ id: a.id, pe: { x: a.pos.x, y: a.alt, z: a.pos.z } }));
    const m = pontoDaMira({ x: o.x, y: o.y, z: o.z }, { x: d.x, y: d.y, z: d.z }, corpos, { alcance: RIFLE.alcance, chao: this.jet.noAr ? null : this.eu.alt });
    // (o olho da câmera fica atrás do ombro: um ponto atrás de mim viraria um tiro pra trás — empurra pra frente)
    const frente = (m.p.x - this.eu.pos.x) * d.x + (m.p.z - this.eu.pos.z) * d.z;
    if (frente < 2) this.alvoMira.set(o.x + d.x * 30, o.y + d.y * 30, o.z + d.z * 30); else this.alvoMira.set(m.p.x, m.p.y, m.p.z);
  }
  /** um TIRO: a bala sai da boca do cano rumo ao ponto da mira, com a dispersão de agora; esquenta; avisa a rede */
  private atirar() {
    const t = this.agora, r = this.rifle; if (!r) return;
    this.proxTiro = t + RIFLE.cadencia; this.ultimoTiro = t; this.rajada += 1; this.coice = 1;
    this.calor = Math.min(1, this.calor + RIFLE.calorPorTiro);
    r.group.updateWorldMatrix(true, false);
    const boca = r.group.localToWorld(r.boca.clone());
    const d0 = this.alvoMira.clone().sub(boca).normalize();
    const d = desviar({ x: d0.x, y: d0.y, z: d0.z }, dispersao(this.wMira, Math.hypot(this.velRifle.x, this.velRifle.z), this.rajada - 1), Math.random(), Math.random());
    const dir = new THREE.Vector3(d.x, d.y, d.z);
    this.dispararTiro("eu", this.eu, boca, dir); r.disparar();
    this.magEnviar = { v: codificarLancamento(++this.seqTiro, { num: NUM_TIRO }, Math.atan2(d.x, d.z), Math.asin(Math.max(-1, Math.min(1, d.y)))), ate: t + 1.2 };
    this.tremor = Math.max(this.tremor, 0.025);
    if (this.calor >= 1) { this.travadoAte = t + RIFLE.trava; this.som.tocar("rifle-vapor", this.eu.av.group.position, { dist: DISTANCIA.eu }); this.o.onAviso?.("Rifle superaquecido — esfriando…"); }
  }
  /** a bala (minha ou de outro): o mesmo pipeline dos projéteis da magia, com o visual e o dano do rifle */
  private dispararTiro(de: string, deAtor: Ator, o: THREE.Vector3, dir: THREE.Vector3) {
    const f = TIRO_FX, id = this.fx().projetil(f); this.fx().moverProjetil(id, o, dir);
    this.projeteis.push({ id, f, de, deAtor, dir, o: o.clone(), t0: this.agora, ant: o.clone(), tiro: true });
    this.som.tocar("rifle-tiro", o, { dist: deAtor === this.eu ? DISTANCIA.eu : DISTANCIA.perto, volume: deAtor === this.eu ? 0.9 : 0.75, taxa: 0.94 + Math.random() * 0.12 });
  }
  /** um TIRO pegou alguém: a cabeça vale mais; a reação (com folga: não a cada bala); em mim, o dano (na zona de duelo) */
  private acertarTiro(a: Ator, pr: { deAtor: Ator }, ponto: THREE.Vector3) {
    const souEu = a === this.eu, de = { x: pr.deAtor.pos.x, z: pr.deAtor.pos.z }, pe = souEu ? this.eu.alt : a.alt;
    const cabeca = naCabeca(ponto.y, pe), dano = danoDoTiro(cabeca);
    const segura = souEu ? this.escudoOn && escudoSegura({ x: a.pos.x, z: a.pos.z, rumo: a.facing }, de) : !!a.escudo && escudoSegura({ x: a.pos.x, z: a.pos.z, rumo: a.facing }, de);
    if (pr.deAtor === this.eu) { this.numero(cabeca ? `${dano}!` : String(dano), ponto, cabeca ? "#ffd36b" : "#cfe9ff"); this.marcarAcerto(cabeca); }
    if (!segura && (souEu ? this.agora >= this.reacaoTiroAte : true) && !a.morto && !(souEu && this.agora < this.caidoAte)) {
      if (souEu) this.reacaoTiroAte = this.agora + 0.8;
      if (cabeca) a.av.tocarClipe("cambaleia", { velocidade: 1.9 }); else { const rc = reacaoDoGolpe(FEITICOS.estilhaco, ladoDoGolpe({ x: a.pos.x, z: a.pos.z, rumo: a.facing }, de)); a.av.tocarClipe(rc.clipe, { espelhar: rc.espelhar, velocidade: 1.5 }); }
    }
    if (!souEu) return;
    if (!(this.naZonaDeDuelo(this.eu.pos, this.noCeu) && this.naZonaDeDuelo(pr.deAtor.pos, !!pr.deAtor.ceu))) return;
    this.levar({ dano: danoComEscudo(dano, segura), de, empurra: segura ? 0 : cabeca ? 1.2 : 0.3 });
  }
  /** o "x" na cruz quando o MEU tiro pega (dourado na cabeça) */
  private marcarAcerto(cabeca: boolean) {
    const c = this.cruz; if (!c) return;
    c.dataset.acerto = cabeca ? "cabeca" : "corpo"; c.style.setProperty("--acerto", "1");
    window.clearTimeout(Number(c.dataset.tAcerto ?? 0)); c.dataset.tAcerto = String(window.setTimeout(() => c.style.setProperty("--acerto", "0"), 110));
  }
  /** a CRUZ da mira no meio da tela (abre com a dispersão; some sem o rifle) */
  private atualizarCruz() {
    const ver = this.wRifle > 0.6 && !this.menu;
    if (ver && !this.cruz) { const c = document.createElement("div"); c.style.cssText = CRUZ_CSS; c.innerHTML = CRUZ_HTML; this.o.overlay.appendChild(c); this.cruz = c; }
    if (!this.cruz) return;
    this.cruz.style.display = ver ? "block" : "none";
    if (!ver) return;
    const ang = dispersao(this.wMira, Math.hypot(this.velRifle.x, this.velRifle.z), this.rajada), px = Math.max(3, (Math.tan(ang) / Math.tan((this.cam.fov * Math.PI) / 360)) * (this.h / 2));
    this.cruz.style.setProperty("--abre", `${px.toFixed(1)}px`);
    this.cruz.style.setProperty("--calor", this.calor.toFixed(2));
    this.cruz.dataset.trava = this.agora < this.travadoAte ? "1" : "0";
  }
  /** o RIFLE a cada quadro: materializa/desfaz, a mira (o peso e o ponto), o gatilho, o calor, o coice, a morte */
  private passoRifle(t: number, dt: number) {
    const pode = this.podeRifle(), quer = pode ? 1 : 0;
    if (this.rifleEquipado() && !this.rifle) { this.rifle = criarRifleCosmico({ low: this.o.low }); }
    this.wRifle = Math.max(0, Math.min(1, this.wRifle + (quer ? dt / 0.35 : -dt / 0.3)));
    // a POSE DE ATAQUE (a arma no ombro): mirando, apertando o gatilho, ou uns segundos depois do último tiro; senão, DESCANSO
    const mirandoAgora = pode && (this.mirando || this.gatilho || t - this.ultimoTiro < RIFLE.posturaDepoisDoTiro);
    this.wMira += ((mirandoAgora ? 1 : 0) - this.wMira) * Math.min(1, dt * (mirandoAgora ? 10 : 3.5));
    if (this.wRifle > 0.05) this.atualizarMira();
    if (this.gatilho && pode && this.wRifle > 0.85 && this.wMira > 0.75 && podeAtirar(t, this.proxTiro, this.travadoAte)) this.atirar();   // (do descanso, a arma sobe antes do 1º tiro)
    this.calor = passoCalor(this.calor, dt, t, this.ultimoTiro); if (t >= this.travadoAte && this.travadoAte > -Infinity && this.calor <= 0.35) this.travadoAte = -Infinity;
    this.rajada = Math.max(0, this.rajada - dt * (t - this.ultimoTiro > 0.25 ? 9 : 2));
    this.coice = Math.max(0, this.coice - dt * 14);
    this.rifle?.atualizar(t, dt, { revela: this.wRifle, calor: this.calor });
    // a MORTE (com qualquer arma): caiu → a animação pelo lado do golpe, segurada; renasceu → solta
    if (this.morreu && t >= this.caidoAte) { this.morreu = false; this.eu.av.soltarClipe(); }
    this.atualizarCruz();
  }
  /** o MOVIMENTO com o rifle (no chão): a velocidade com INÉRCIA; mirando, o corpo segue a câmera e anda de lado/costas;
   *  levando, ele vira no seu ritmo pro rumo (correndo abre a curva) e, parado, a virada grande é o "Rifle Turn" */
  private moverComRifle(eu: Ator, dir: { wx: number; wz: number } | null, correndo: boolean, dt: number): boolean {
    const t = this.agora, mir = this.wMira > 0.5, yawMira = this.camAz + Math.PI, vAtual = Math.hypot(this.velRifle.x, this.velRifle.z);
    const g = this.giroRifle;
    if (g) {   // VIRANDO nos pés: o rumo segue o clipe; anda só no fim da virada
      const u = Math.min(1, (t - g.t0) / g.dur); eu.facing = g.de + g.ang * fracaoDoGiro(u);
      if (u >= 1 || mir) this.giroRifle = null;
    }
    // a velocidade pedida: mirando, o passo tático (de costas, mais devagar); levando, andar/correr (sem o sprint)
    let alvoV = { x: 0, z: 0 };
    if (dir && !(g && t - g.t0 < g.dur * 0.6)) {
      const c = noCorpo({ x: dir.wx, z: dir.wz }, mir ? yawMira : eu.facing);
      const vel = mir ? (c.frente < -0.3 ? RIFLE.velCostas : RIFLE.velMira) : correndo ? Math.min(this.velAPe, 7.5) : 4;
      alvoV = { x: dir.wx * vel, z: dir.wz * vel };
    }
    const corria = vAtual > 5.5;
    this.velRifle = passoInercia(this.velRifle, alvoV, dt, { acel: RIFLE.acel, freio: corria ? RIFLE.freioCorrida : RIFLE.freio });
    // parou de CORRER de repente (soltou tudo): a freada com a arma ("Rifle Run To Stop") — o corpo escorrega pra parar
    if (corria && !dir && t - this.freouEm > 1.5 && !mir) { this.freouEm = t; eu.av.tocarClipe("freia", { inicio: 0.45, velocidade: 1.25 }); }
    eu.pos.x += this.velRifle.x * dt; eu.pos.z += this.velRifle.z * dt;
    const v = Math.hypot(this.velRifle.x, this.velRifle.z);
    if (!this.giroRifle) {
      if (mir) eu.facing = girarAte(eu.facing, eu.facing + difAng(eu.facing, yawMira), RIFLE.giroMira * dt);
      else if (dir) {
        const rumo = Math.atan2(dir.wx, dir.wz), vira = precisaVirar(eu.facing, rumo, v);
        if (vira) { const dur = DURACAO_RIFLE.gira / RIFLE.velGiroClipe; this.giroRifle = { de: eu.facing, ang: difAng(eu.facing, rumo), t0: t, dur }; eu.av.tocarClipe("gira", { espelhar: vira > 0, velocidade: RIFLE.velGiroClipe }); }   // (o clipe vira pra direita: pra esquerda, espelhado)
        else eu.facing = girarAte(eu.facing, v > 0.3 ? Math.atan2(this.velRifle.x, this.velRifle.z) : rumo, (v > 5.5 ? RIFLE.giroCorrendo : RIFLE.giroAndando) * dt);
      }
    }
    eu.facing = Math.atan2(Math.sin(eu.facing), Math.cos(eu.facing));   // (o rumo fica em (−π, π])
    return v > 0.25;
  }
  /** um projétil sai (de quem lançou, da mão dele, na direção da mira) */
  private dispararProjetil(de: string, deAtor: Ator, f: Feitico, yaw: number, pitch: number) {
    const o = deAtor.av.pontoDaMao("direita", new THREE.Vector3()), d = direcaoDaMira(yaw, pitch), dir = new THREE.Vector3(d.x, d.y, d.z);
    o.addScaledVector(dir, 0.35);
    const id = this.fx().projetil(f); this.fx().moverProjetil(id, o, dir);
    this.projeteis.push({ id, f, de, deAtor, dir, o: o.clone(), t0: this.agora, ant: o.clone() });
    this.som.tocar(f.explosao ? "impacto-heroi" : "golpe", deAtor.av.group.position, { dist: DISTANCIA.perto, volume: f.explosao ? 0.6 : 0.8, taxa: f.explosao ? 1.4 : 1.6 });
  }
  /** acertou ALGUÉM (eu ou outro): a reação certa pro lado do golpe; em mim, o dano (o escudo segura pela frente) e o recuo */
  private acertarAtor(a: Ator, pr: { f: Feitico; deAtor: Ator }, dano: number) {
    const souEu = a === this.eu, de = { x: pr.deAtor.pos.x, z: pr.deAtor.pos.z };
    const segura = souEu ? this.escudoOn && escudoSegura({ x: a.pos.x, z: a.pos.z, rumo: a.facing }, de) : !!a.escudo && escudoSegura({ x: a.pos.x, z: a.pos.z, rumo: a.facing }, de);
    if (!segura) { const rc = reacaoDoGolpe(pr.f, ladoDoGolpe({ x: a.pos.x, z: a.pos.z, rumo: a.facing }, de)); a.av.tocarClipe(rc.clipe, { espelhar: rc.espelhar }); }
    if (!souEu) return;
    const vale = this.naZonaDeDuelo(this.eu.pos, this.noCeu) && this.naZonaDeDuelo(pr.deAtor.pos, !!pr.deAtor.ceu);
    if (!vale) return;
    if (segura && this.escudoOn) { this.energia = Math.max(0, this.energia - dano * 0.4); this.energiaGastaEm = this.agora; }
    this.levar({ dano: danoComEscudo(dano, segura), de, empurra: segura ? 0 : pr.f.empurra * 6 });
  }
  /** a MAGIA a cada quadro: a energia, o lançamento (o disparo no quadro certo), o escudo, os lançamentos dos outros e os
   *  projéteis (andam, varrem os corpos, explodem) */
  private passoMagia(t: number, dt: number) {
    if (!this.fxMagia && !this.conj && !this.projeteis.length && !this.lancamentosRemotos.length && !this.tirosRemotos.length && !this.escudoOn && this.energia >= ENERGIA.max) return;   // (nada de magia por perto: nem cria os efeitos)
    this.energia = recarregarEnergia(this.energia, dt, t, this.escudoOn ? t : this.energiaGastaEm);
    if (this.escudoOn) { this.energia = Math.max(0, this.energia - ESCUDO.gasto * dt); this.energiaGastaEm = t; if (this.energia <= 0) this.erguerEscudo(false); }
    this.fx().escudo("eu", this.escudoOn ? { pos: this.eu.av.group.position, rumo: this.eu.facing } : null);
    const c = this.conj;
    if (c) {
      if (!c.disparou && t >= c.tDisparo) { c.disparou = true; this.dispararProjetil("eu", this.eu, c.f, c.yaw, c.pitch); }
      if (t >= c.t0 + duracaoLancamento(c.f, DURACAO_CLIPE[c.f.clipe])) this.conj = null;
    }
    for (let i = this.lancamentosRemotos.length - 1; i >= 0; i--) {
      const l = this.lancamentosRemotos[i]!; if (t < l.quando) continue; this.lancamentosRemotos.splice(i, 1);
      if (this.remotos.get(l.a.id) === l.a) this.dispararProjetil(l.a.id, l.a, l.f, l.yaw, l.pitch);
    }
    // os TIROS dos outros: da boca do rifle dele (ou da mão), na direção que veio na rede
    for (let i = this.tirosRemotos.length - 1; i >= 0; i--) {
      const l = this.tirosRemotos[i]!; if (t < l.quando) continue; this.tirosRemotos.splice(i, 1);
      if (this.remotos.get(l.a.id) !== l.a) continue;
      const o = l.a.rifle?.group.visible ? (l.a.rifle.group.updateWorldMatrix(true, false), l.a.rifle.group.localToWorld(l.a.rifle.boca.clone())) : l.a.av.pontoDaMao("direita", new THREE.Vector3());
      const d = direcaoDaMira(l.yaw, l.pitch); this.dispararTiro(l.a.id, l.a, o, new THREE.Vector3(d.x, d.y, d.z)); l.a.rifle?.disparar(); l.a.atiraR = 1;
    }
    const alvos: Ator[] = [this.eu, ...this.remotos.values()], pos = new THREE.Vector3();
    for (let i = this.projeteis.length - 1; i >= 0; i--) {
      const pr = this.projeteis[i]!, dist = pr.f.vel * (t - pr.t0);
      const acabou = dist > pr.f.alcance; pos.copy(pr.o).addScaledVector(pr.dir, Math.min(dist, pr.f.alcance));
      let acertou: Ator | null = null, u = 1;
      for (const a of alvos) {
        if (a === pr.deAtor) continue;
        const pe = { x: a.pos.x, y: a === this.eu ? this.eu.alt : a.alt, z: a.pos.z }, h = varreCorpo(pr.ant, pos, pr.f.raio, pe);
        if (h !== null && h < u) { u = h; acertou = a; }
      }
      const fim = acertou || acabou || pos.y < (pr.deAtor === this.eu ? this.eu.alt : pr.deAtor.alt) - 4;
      if (!fim) { this.fx().moverProjetil(pr.id, pos, pr.dir); pr.ant.copy(pos); continue; }
      const ponto = pr.ant.clone().lerp(pos, acertou ? u : 1);
      this.fx().acabarProjetil(pr.id); this.projeteis.splice(i, 1);
      if (pr.tiro) { if (acertou || !acabou) { this.fx().impacto(pr.f, ponto); this.som.tocar("acerto", ponto, { dist: DISTANCIA.perto, volume: acertou ? 0.6 : 0.25, taxa: 1.7 }); } if (acertou) this.acertarTiro(acertou, pr, ponto); continue; }   // (a bala do rifle: sem explosão)
      this.fx().impacto(pr.f, ponto);
      this.som.tocar(pr.f.explosao ? "impacto-heroi" : "acerto", ponto, { dist: DISTANCIA.perto, volume: pr.f.explosao ? 1 : 0.7, taxa: pr.f.explosao ? 0.8 : 1.4 });
      if (acertou) this.acertarAtor(acertou, pr, pr.f.dano);
      // a EXPLOSÃO (a Nova): quem estiver perto também leva (menos), menos quem já levou em cheio
      if (pr.f.explosao) for (const a of alvos) {
        if (a === pr.deAtor || a === acertou) continue;
        const dd = Math.hypot(a.pos.x - ponto.x, (a === this.eu ? this.eu.alt : a.alt) + 1 - ponto.y, a.pos.z - ponto.z), dano = danoDaExplosao(pr.f, dd);
        if (dano > 0) this.acertarAtor(a, pr, dano);
      }
    }
    this.fxMagia?.atualizar(dt, t);
  }
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
  private combateRemoto(a: Ator, p: { atk?: number; hp?: number; arma?: number; mov?: number; mag?: number }, t: number) {
    a.hp = p.hp ?? VIDA_MAX;
    // a MAGIA dele: um lançamento novo (a mesma animação; o projétil sai da mão dele no quadro do disparo) e o escudo
    if (p.mag && p.mag !== a.magUlt) {
      const novo = a.magUlt !== undefined, d = decodificarLancamento(p.mag); a.magUlt = p.mag;
      if (novo && d && d.num === NUM_TIRO) {   // os TIROS dele: quantos desde o último (o seq), um atrás do outro na cadência
        const n = a.tiroSeq === undefined ? 1 : tirosNovos(a.tiroSeq, d.seq);
        for (let k = 0; k < n; k++) this.tirosRemotos.push({ a, quando: t + k * RIFLE.cadencia, yaw: d.yaw, pitch: d.pitch });
        a.facing = d.yaw; a.pitchR = d.pitch;
      }
      if (d && d.num === NUM_TIRO) a.tiroSeq = d.seq;
      if (novo && d?.feitico) {
        const f = d.feitico, dur = DURACAO_CLIPE[f.clipe]; a.facing = d.yaw; a.av.olharPara(d.yaw);
        a.av.tocarClipe(f.clipe, { velocidade: f.velClipe });
        this.lancamentosRemotos.push({ a, f, quando: t + instanteDoDisparo(f, dur), yaw: d.yaw, pitch: d.pitch });
        this.fx().carga(`r-${a.id}`, f, () => a.av.pontoDaMao("direita", new THREE.Vector3()), t + instanteDoDisparo(f, dur));
      }
    } else if (!p.mag && a.magUlt === undefined) a.magUlt = 0;
    const escudo = estadoDoMov(p.mov ?? 0) === MOV_ESCUDO;
    // o RIFLE dele (os bits de cima da mov): na mão / mirando — a arma materializa junto
    { const r = rifleDoMov(p.mov ?? 0), k1 = 1 / 30;
      a.wRif = Math.max(0, Math.min(1, (a.wRif ?? 0) + (r.naMao && !a.morto ? k1 / 0.35 : -k1 / 0.3)));
      a.wMiraR = (a.wMiraR ?? 0) + ((r.mirando ? 1 : 0) - (a.wMiraR ?? 0)) * Math.min(1, k1 * 10);
      if (a.wRif > 0 && !a.rifle) a.rifle = criarRifleCosmico({ low: true }); }
    // a MORTE dele: a vida chegou a 0 → a animação da morte (segurada) até renascer
    { const morto = (p.hp ?? VIDA_MAX) <= 0; if (morto !== !!a.morto) { a.morto = morto; if (morto) a.av.tocarClipe("morre", { segurar: true, velocidade: 1.5 }); else a.av.soltarClipe(); } }   // (1,5×: a queda termina antes de renascer — lib/cyber/combate CAIDO)
    if (escudo !== !!a.escudo) { a.escudo = escudo; if (escudo) a.av.tocarClipe(ESCUDO.clipe, { segurar: true }); else a.av.soltarClipe(); }
    this.fx().escudo(`r-${a.id}`, escudo ? { pos: a.av.group.position, rumo: a.facing } : null);
    // o MOVIMENTO TURBINADO dele: o estado que chegou (e desde quando) e os pesos suavizados (a pose sem tranco)
    const mov = estadoDoMov(p.mov ?? 0); if (mov !== a.mov) { a.mov = mov; a.tMov = t; }
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
    if (this.vida <= 0) { const m = animacaoDaMorte(ladoDoGolpe({ x: this.eu.pos.x, z: this.eu.pos.z, rumo: this.eu.facing }, o.de)); this.eu.av.tocarClipe(m.clipe, { espelhar: m.espelhar, segurar: true, velocidade: 1.5 }); this.morreu = true; this.gatilho = false; this.caidoAte = this.agora + CAIDO; this.ataque = null; this.som.tocar("impacto-heroi", this.eu.av.group.position, { dist: DISTANCIA.eu, volume: 0.7, taxa: 1.3 }); }
  }
  /** ESPAÇO / botão VOAR (segurar): decola e sobe; soltar cai planando até pousar */
  /** ESPAÇO / VOAR: no chão, a DECOLAGEM com impulso — agacha um instante (parado mais; andando/correndo quase nada, o
   *  embalo segue) e só então lança (`decolarJa`), com um empuxo forte pra cima e a velocidade que tinha no chão */
  comandoJet(on: boolean) {
    // um TOQUE curto no pulo (decolou e soltou logo): a BOLHA DE GRAVIDADE ZERO (out/2026, o dono: "algo divertido")
    if (!on && this.jet.tecla && this.tDecolou && this.agora - this.tDecolou < JET.zeroG.toque && !this.zeroG) this.zeroGQuer = true;
    this.jet.tecla = on;
    if (!on || this.jet.noAr || this.decola || this.menu || this.pilotando || this.noVeiculo() || this.noTopo || this.viagem || this.nascendo || this.tunel) return;
    if (this.sobreNave || this.bordo) { this.decolarJa(); return; }   // (de cima da nave / a bordo: o caminho de sempre)
    const v = this.velPlano > 1.5 ? Math.min(this.velPlano, 18) : 0;
    this.decola = { t0: this.agora, espera: v > 0 ? DECOLAGEM.esperaAndando : DECOLAGEM.esperaParado, momento: { x: Math.sin(this.eu.facing) * v, z: Math.cos(this.eu.facing) * v } };
    this.tDecolou = this.agora; this.esperaDecolou = this.decola.espera;
  }
  /** passou o agachamento: decola de verdade (as regras de onde dá pra decolar), com o IMPULSO e o embalo */
  // ───────────── a BOLHA DE GRAVIDADE ZERO e o PESO da queda ─────────────
  private zeroG: { t: number; estoura: number } | null = null; private zeroGQuer = false;
  private bolha: { m: THREE.Mesh; mat: THREE.ShaderMaterial } | null = null;
  /** quanto da gravidade vale agora (1 = a normal; na bolha, quase nada) */
  private gravidadeAgora() { return this.zeroG && this.zeroG.estoura < 0 ? JET.zeroG.g : 1; }
  /** a bolha e a queda, a cada quadro: liga a bolha no ar (o empurrãozinho pra cima), conta o tempo, ESTOURA (e a gravidade
   *  volta) e some quando pousa; a bolha é uma esfera iridescente em volta de quem flutua */
  private passoGravidade(dt: number, t: number) {
    if (this.zeroGQuer && this.jet.noAr) { this.zeroGQuer = false; this.zeroG = { t: 0, estoura: -1 }; this.jet.vy = Math.max(this.jet.vy, JET.zeroG.sobe); this.som.tocar("rise", this.eu.av.group.position, { dist: DISTANCIA.eu, volume: 0.5, taxa: 1.5 }); }
    if (!this.jet.noAr) { this.zeroGQuer = this.zeroGQuer && !!this.decola; if (this.zeroG && this.zeroG.estoura < 0) this.zeroG.estoura = 0; }
    const z = this.zeroG;
    if (z) {
      z.t += dt; if (z.estoura < 0 && (z.t >= JET.zeroG.dur || this.jet.tecla)) z.estoura = 0;   // (acabou o tempo, ou ligou o jato: estoura)
      if (z.estoura >= 0) z.estoura += dt;
      if (!this.bolha) {
        const mat = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uA: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
          vertexShader: "varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
          fragmentShader: `uniform float uT, uA; varying vec3 vN; varying vec3 vV; varying vec3 vP;
            void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.5); vec3 cor = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + vP.y * 0.35 + vP.x * 0.2 + uT * 0.25));
              float onda = 0.5 + 0.5 * sin(vP.y * 9.0 - uT * 3.0); gl_FragColor = vec4(cor * (f * 0.9 + 0.06 + 0.08 * onda) * uA, 1.0); }` });
        const m = new THREE.Mesh(new THREE.SphereGeometry(1.25, 40, 28), mat); m.frustumCulled = false; this.cena.scene.add(m); this.bolha = { m, mat };
      }
      const b = this.bolha, k = z.estoura < 0 ? Math.min(1, z.t / 0.25) : Math.max(0, 1 - z.estoura / 0.3);
      b.m.visible = k > 0.01; b.mat.uniforms.uT!.value = t; b.mat.uniforms.uA!.value = k;
      b.m.position.set(this.eu.av.group.position.x, this.eu.av.group.position.y + 1.0, this.eu.av.group.position.z);
      b.m.scale.setScalar((z.estoura < 0 ? 1 + 0.04 * Math.sin(t * 3) : 1 + z.estoura * 2.2) * (0.6 + 0.4 * Math.min(1, z.t / 0.25)));
      if (z.estoura >= 0.3) { this.zeroG = null; b.m.visible = false; }
    }
    // o PESO da queda: caindo rápido, o vento — a câmera treme (a lente abre na `sensacaoAPe`, pela velocidade)
    if (this.jet.noAr && !this.jet.tecla && this.jet.vy < -22) { const a = Math.min(0.35, (-this.jet.vy - 22) / 90); this.cam.position.x += (Math.random() - 0.5) * a; this.cam.position.y += (Math.random() - 0.5) * a; }
  }
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
  private pisoDoMarco(m: { lm: LandmarkHandle; mn: MarcoNav }) { return (m.lm.poi.base ?? CHAO) + m.mn.nav.pisoY + this.boia(m.lm); }
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
    if (this.emNaveCw) { this.passoNoArNaNave(eu, dt); return; }
    const yAnt = this.jet.y;
    // pousa no DORSO da nave parada (vindo de cima)
    const naveParadaAqui = !!this.nave && !this.pilotando && this.nave.group.visible, topo = naveParadaAqui ? this.topoNave() : -Infinity;
    const dNave = Math.hypot(eu.pos.x - this.naveEst.x, eu.pos.z - this.naveEst.z);
    const sobreODorso = naveParadaAqui && dNave < CyberEngine.TOPO_NAVE_R && !(dNave < RAIO_REDOMA && this.redomaChamando());   // o vão da redoma aberta não é piso
    if (this.noCeu) {
      const base = this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY;
      // teto e paredes baixas contados do PISO de onde se voa (no lounge, 88 m acima da central: antes caía de lá)
      const pisoAqui = base + pisoDeVoo(eu.pos, yAnt - base);
      const tetoC = pisoAqui + tetoDoJet(null), tetoAqui = yAnt > tetoC ? Math.max(tetoC, yAnt) : tetoC;   // quem chega de CIMA (saiu da nave) não é puxado pra baixo de uma vez
      const v = passoVertical(this.jet.y, this.jet.vy, this.jet.tecla, dt, tetoAqui, this.impulsoFrente, this.gravidadeAgora());
      const baixo = v.y - pisoAqui < JET.alturaBases ? this.colisoresDoNivel("ceu") : [], naves = v.y < topo - 0.2 ? this.colisoresDeNaves(CIDADE.pisoY) : [];
      let q = empurrarParaFora(resolverCidadeLivre(eu.pos), [...baixo, ...naves]);
      // a CABINE DO DJ é do dono: pra todo o resto a torre é um campo de força (não se pousa lá em cima de mochila)
      if (!this.ehFundador(this.o.eu.id) && v.y < base + PISO_FESTA + TORRE_DJ.topo + CAMPO_DJ && naTorreDJ(q, 0.6)) q = foraDaTorreDJ(q);
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
      const v = passoVertical(this.jet.y, this.jet.vy, this.jet.tecla, dt, yAnt > tetoP ? Math.max(tetoP, yAnt) : tetoP, this.impulsoFrente, this.gravidadeAgora());
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
    const tetoBase = (qg ? 0 : CHAO) + tetoDoJet(qg), teto0 = yAnt > tetoBase ? Math.max(tetoBase, yAnt) : tetoBase;
    const pnPerto = this.pilotando ? null : this.poseNave(), pertoDaNave = !!pnPerto && Math.hypot(eu.pos.x - pnPerto.x, eu.pos.z - pnPerto.z) < NAVE_QG.raio + 20;
    const teto = this.saindoPelaRedoma || pertoDaNave ? Math.max(teto0, (pnPerto ? pnPerto.y + 2.2 * ESCALA_NAVE_V : this.topoNave()) + 12) : teto0;   // perto da nave (ou saindo pela redoma): dá pra subir acima do dorso — e voltar pra ela
    const v = passoVertical(this.jet.y, this.jet.vy, this.jet.tecla, dt, teto, this.impulsoFrente, this.gravidadeAgora());
    if (this.cidade && v.y > 40) {   // lá em cima: a ilha da Zaeon e as ilhotas são pousos (e corpos sólidos)
      const topoIlha = this.cidade.ilha.position.y;
      // ENTROU no espaço aéreo da Zaeon (saindo da nave, descendo do céu livre) acima do piso dela: daqui pra frente é o
      // ramo da cidade que manda — as paredes, os móveis, o lounge, a escadaria e o templo colidem e são piso (antes, só
      // o piso central pousava: descia-se atravessando tudo)
      if (naIlhaPrincipal(eu.pos) && v.y >= topoIlha - 0.5 && !this.saindoPelaRedoma) { this.altoEm = "ceu"; this.yNav = CIDADE.pisoY; this.jet.y = v.y; this.jet.vy = v.vy; return; }
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
    const q: { x: number; z: number } = resolverNoAr(prev, eu.pos, v.y - CHAO, yAnt - CHAO, qg, v.y < topo - 0.2 ? [...this.colisores, ...this.colisoresDeNaves(this.naveEst.y)] : this.colisores);
    eu.pos.x = q.x; eu.pos.z = q.z; this.jet.y = v.y; this.jet.vy = v.vy;
    if (v.y < QUEDA_VAZIO) { this.renascer(); return; }   // caiu no VAZIO (não há chão): renasce na praça
    if (pnPerto && v.vy <= 0) {   // de mochila na nave: pelo vão da REDOMA (aberta) cai-se na cabine; na RAMPA, pousa-se nela
      const base = alturaDoConves(pnPerto), b = pousoNaNave(paraLocal(pnPerto, q), yAnt - base, v.y - base, this.redomaChamando(), rampaDaNave(pnPerto).queda);
      if (b) { this.bordo = b; this.jet.noAr = false; this.saindoPelaRedoma = false; this.jetV = { x: 0, z: 0 }; const w = paraMundo(pnPerto, b); eu.pos.x = w.x; eu.pos.z = w.z; this.somPouso(v.vy); return; }
    }
    if (sobreODorso && yAnt >= topo - 0.05 && v.y <= topo && v.vy <= 0) { this.jet.noAr = false; this.sobreNave = true; this.somPouso(v.vy); return; }
    // o chão embaixo: o piso da PRAÇA (a ilha) — fora dela é o vazio (continua caindo)
    const chao = naPraca(q) ? PRACA.y : -Infinity, chaoVisto = chao > PRACA.y && z ? chao + this.boia(z) : chao;
    if (v.y <= chaoVisto && v.vy <= 0) {
      this.jet.noAr = false; this.somPouso(v.vy);
      if (chao > PRACA.y + 0.01 && z) { this.altoEm = z.poi.id; this.yNav = chao; } else { this.altoEm = null; this.yNav = 0; }
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
    if (n === "qg") { const z = this.zaeon(), mn = z ? marcoNav(z.poi) : null; return mn && z ? (z.poi.base ?? CHAO) + mn.nav.pisoY + this.boia(z) : CHAO; }
    return CHAO;
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
    return a.ceu ? "ceu" : a.topo ? "topo" : a.alt > CHAO + 2 ? "qg" : "chao";
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
    this.viagem = null; this.tunel = null; this.fio = null; this.fluxoArmado = false;
    this.pilotando = false; this.noTopo = false; this.alvo = null; this.alvoDepois = null; this.sitT = 0; this.falandoCom = null;
    this.jet.noAr = false; this.jetV = { x: 0, z: 0 }; this.sobreNave = false; this.ilhota = null; this.bordo = null; this.motoAlvo = null; this.emNaveCw = null;
    const naZaeon = id === "zaeon" || ehSala(id);   // (as SALAS são níveis da Zaeon: o piso é o dela)
    this.plat = naZaeon || id === "praca" ? null : { id, andar: 0 };
    this.altoEm = naZaeon ? "ceu" : null; this.yNav = naZaeon ? CIDADE.pisoY : 0;
    this.eu.pos.set(p.x, 0, p.z); this.eu.facing = p.rumo; this.camAz = p.rumo + Math.PI;
    const y = id === "zaeon" ? (this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY) : ehSala(id) ? (this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY) + NOS[id].y - CIDADE.pisoY : NOS[id].y;   // (as salas: o piso da chegada — o salão do Templo Cósmico fica abaixo do lounge)
    this.eu.alt = y; this.camT.set(p.x, y + 1.2, p.z); this.portalArmado = !noDoAnel(p, y);
    if (NIVEIS_SEPARADOS) { this.mudarNivel(nivelDoPonto(p, y)); this.posNivel = { x: p.x, z: p.z, alt: y, ok: true }; }   // (chegou: já é o nível do destino)
  }
  /** vai pra NAVE COWORKING da região (nasce no anel do átrio): o ponto de partida de quem não é novato nem o dono */
  private irParaNaveCw(r: RegiaoReal) {
    this.viagem = null; this.tunel = null; this.fio = null; this.fluxoArmado = false;
    this.pilotando = false; this.noTopo = false; this.alvo = null; this.alvoDepois = null; this.sitT = 0; this.falandoCom = null;
    this.jet.noAr = false; this.jetV = { x: 0, z: 0 }; this.sobreNave = false; this.ilhota = null; this.bordo = null; this.motoAlvo = null;
    this.plat = null; this.altoEm = null; this.yNav = 0; this.emNaveCw = r; this.pisoNaveCw = 0; this.portalNaveArmado = false;
    const c = chegadaDaNave(r);
    this.eu.pos.set(c.x, 0, c.z); this.eu.facing = c.rumo; this.camAz = c.rumo + Math.PI; this.eu.alt = c.y; this.camT.set(c.x, c.y + 1.2, c.z);
    if (NIVEIS_SEPARADOS) { this.mudarNivel(nivelDaNave(r)); this.posNivel = { x: c.x, z: c.z, alt: c.y, ok: true }; } else this.montarNaveCw(r);
  }
  /** a NAVE COWORKING também é um nível: monta quando se chega e desmonta quando se sai */
  private montarNaveCw(r: RegiaoReal) {
    if (this.naveCw?.r === r) return; this.desmontarNaveCw();
    const n = NAVES[r], g = new THREE.Group(); g.position.set(n.x, n.y, n.z);
    const nave = criarNaveCoworking({ low: this.o.low, teto: true }), casco = criarCascoNave({ low: this.o.low });
    g.add(nave.group, casco.group); this.cena.scene.add(g); this.naveCw = { r, g, nave, casco };
  }
  private desmontarNaveCw() { const c = this.naveCw; if (!c) return; this.naveCw = null; c.g.removeFromParent(); c.nave.dispose(); c.casco.dispose(); }
  /** um quadro no ar (a mochila) DENTRO da nave coworking: o teto do andar, as paredes e o pouso nos pisos */
  private passoNoArNaNave(eu: Ator, dt: number) {
    const r = this.emNaveCw!, n = NAVES[r], yAnt = this.jet.y, relAnt = yAnt - n.y;
    const teto = n.y + (relAnt > ANDAR2.y - 1.2 ? ANDAR2.y + ANDAR2.teto : NAVE_COWORK.alturaCasco) - 2;
    const v = passoVertical(this.jet.y, this.jet.vy, this.jet.tecla, dt, Math.max(teto, Math.min(yAnt, teto + 1)), this.impulsoFrente, this.gravidadeAgora());
    if (v.y > teto) { v.y = teto; v.vy = Math.min(0, v.vy); }
    const l = resolverNaNave(paraLocalCw(r, eu.pos), Math.max(relAnt, v.y - n.y)), w = paraMundoCw(r, l); eu.pos.x = w.x; eu.pos.z = w.z;
    this.jet.y = v.y; this.jet.vy = v.vy;
    const piso = pisoNaNave(l, relAnt);
    if (piso !== null && v.y <= n.y + piso && v.vy <= 0) { this.jet.noAr = false; this.pisoNaveCw = piso; this.somPouso(v.vy); }
    else if (v.y < n.y - 40) this.renascer();
  }
  /** a câmera DENTRO da nave coworking: abaixo do teto do andar e dentro do casco (não atravessa a parede) */
  private cameraNaNaveCw<C extends { pos: { x: number; y: number; z: number }; olhar: { x: number; y: number; z: number } }>(c: C): C {
    const r = this.emNaveCw; if (!r) return c;
    const n = NAVES[r], em2 = this.pisoNaveCw > ANDAR2.y - 1.2, teto = n.y + (em2 ? ANDAR2.y + ANDAR2.teto : NAVE_COWORK.alturaCasco) - 0.35, chao = n.y + this.pisoNaveCw + 0.4;
    const pos = { ...c.pos, y: Math.min(teto, Math.max(chao, c.pos.y)) };
    const dentro = (p: { x: number; z: number }) => noCasco(p.x - n.x, p.z - n.z, em2 ? 0.7 : 0.4);
    if (!dentro(pos)) { let lo = 0, hi = 1; for (let k = 0; k < 14; k++) { const u = (lo + hi) / 2, q = { x: c.olhar.x + (pos.x - c.olhar.x) * u, z: c.olhar.z + (pos.z - c.olhar.z) * u }; if (dentro(q)) lo = u; else hi = u; } pos.x = c.olhar.x + (pos.x - c.olhar.x) * lo; pos.z = c.olhar.z + (pos.z - c.olhar.z) * lo; }
    return { ...c, pos };
  }
  /** o TÚNEL: o React escolheu o destino (`null` = desistiu: fica onde está, fora do túnel) */
  /** o buraco negro de CAMINHO ÚNICO: pede a travessia direta (o React mostra o túnel, sem menu) */
  private abrirDireto(para: IdNo, pose?: { x: number; z: number; rumo: number }) {
    if (this.direto || this.tunel) return;
    this.direto = { para, ...(pose ? { pose } : {}) }; this.alvo = null; this.alvoDepois = null; this.sitT = 0;
    this.keys = {}; this.joy = { x: 0, y: 0, on: false };
    // (sem o túnel nem o som — out/2026, o dono: "algo mais cósmico: um CLARÃO e o personagem saindo dele do outro lado")
    this.clarao = { t: 0, trocou: false };
  }
  // ───────────── a ATMOSFERA de ser tragado (out/2026, o dono: "mais atmosfera ao entrarmos em colisão") ─────────────
  private rastros: { linhas: THREE.LineSegments; pos: Float32Array; p: THREE.Vector3[] } | null = null; private vinheta: HTMLDivElement | null = null;
  /** os RASTROS (poeira cósmica passando por você rumo ao centro, cada vez mais rápida e comprida), o TREMOR da câmera e a
   *  VINHETA violeta fechando as bordas — tudo crescendo com a tragada; fora dela, nada */
  /** os ESTILHAÇOS que giram em volta do cubo no topo da torre de TI têm CORPO (out/2026, o dono: "não parecem ter
   *  colisão"): quem encosta (a pé, voando ou de moto) é empurrado pra fora deles, com um tranco */
  private empurrarEstilhacos() {
    if (this.nivel !== "lounge" || !this.cidade || this.bordo || this.tunel || this.menu) return;
    const eu = this.eu, cy = eu.alt + (this.moto !== null ? 0.6 : 0.9), folga = this.moto !== null ? 1.4 : 0.6;
    for (const s of this.cidade.estilhacos()) {
      const dx = eu.pos.x - s.x, dz = eu.pos.z - s.z, dy = cy - s.y, R = s.r + folga, d = Math.hypot(dx, dy, dz);
      if (d >= R) continue;
      const h = Math.hypot(dx, dz), k = R - d + 0.02;
      if (h > 1e-3) { eu.pos.x += (dx / h) * k; eu.pos.z += (dz / h) * k; } else eu.pos.x += k;
      this.tremor = Math.max(this.tremor, 0.06);
    }
  }
  private atmosferaTragada(dt: number) {
    const v = this.fio, k = v ? progressoTragada(v) : 0;
    this.travessiaBN(dt, k);
    if (!this.vinheta) { const el = document.createElement("div"); el.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:25;opacity:0;background:radial-gradient(ellipse at 50% 50%, transparent 38%, rgba(60,10,110,.55) 72%, rgba(8,0,20,.92) 100%);"; this.o.overlay.appendChild(el); this.vinheta = el; }
    const op = v ? 0.25 + 0.75 * k : 0; if (this.vinheta.style.opacity !== op.toFixed(2)) this.vinheta.style.opacity = op.toFixed(2);
    if (!v) { if (this.rastros) this.rastros.linhas.visible = false; return; }
    const N = this.o.low ? 40 : 240, eu = new THREE.Vector3(this.eu.pos.x, this.eu.alt + 1.2, this.eu.pos.z);
    if (!this.rastros) {
      const pos = new Float32Array(N * 6), g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const linhas = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xd9c8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      linhas.frustumCulled = false; this.cena.scene.add(linhas);
      this.rastros = { linhas, pos, p: Array.from({ length: N }, () => new THREE.Vector3(Infinity, 0, 0)) };
    }
    const R = this.rastros, ilhaY = this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY, b = v.f.bn, w = mundo(b), alvo = new THREE.Vector3(w.x, ilhaY + b.y, w.z);
    const vel = 60 + 520 * k, len = 1.5 + 22 * k * k, dir = new THREE.Vector3();
    R.linhas.visible = true; (R.linhas.material as THREE.LineBasicMaterial).opacity = 0.18 + 0.7 * k;
    for (let i = 0; i < R.p.length; i++) {
      const p = R.p[i]!;
      if (!Number.isFinite(p.x) || p.distanceTo(eu) > 70 || p.distanceTo(alvo) < b.r) {   // (renasce em volta de quem cai, mais pra trás)
        const a = Math.random() * Math.PI * 2, el = (Math.random() - 0.5) * 2.2, r = 6 + Math.random() * 55;
        p.set(eu.x + Math.cos(a) * Math.cos(el) * r, eu.y + Math.sin(el) * r * 0.7, eu.z + Math.sin(a) * Math.cos(el) * r);
      }
      dir.copy(alvo).sub(p).normalize(); p.addScaledVector(dir, vel * dt);
      R.pos.set([p.x, p.y, p.z, p.x - dir.x * len, p.y - dir.y * len, p.z - dir.z * len], i * 6);
    }
    R.linhas.geometry.attributes.position!.needsUpdate = true;
    // o TREMOR: a câmera chacoalha (mais forte chegando)
    const a = 0.03 + 0.42 * k * k; this.cam.position.x += (Math.random() - 0.5) * a; this.cam.position.y += (Math.random() - 0.5) * a; this.cam.position.z += (Math.random() - 0.5) * a;
  }
  // ───────────── a TRAVESSIA do buraco negro: os raios do horizonte e a tempestade ─────────────
  private somTempestade: LoopSom | null = null; private proxRaioBN = 0; private estourouBN = false; private raiosBN: RaiosBNHandle | null = null;
  /** cresce com a tragada: os RAIOS do horizonte (components/cyber/RaiosBN — cada vez mais seguidos), os trovões, a
   *  tempestade; no horizonte, os estilhaços */
  private travessiaBN(dt: number, k: number) {
    const v = this.fio, s = this.som;
    if (v) {
      // (out/2026, o dono: "o psicodélico pra quando o personagem ATRAVESSAR" — as fachadas só no fim da tragada, no
      //  horizonte; antes, a atmosfera de sempre: os rastros, a vinheta, o tremor)
      if (k < 0.05 && this.estourouBN) this.estourouBN = false;
      const ilhaY = this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY, b = v.f.bn, w = mundo(b);
      this.tmpBN.set(w.x, ilhaY + b.y, w.z); this.tmpEu.set(this.eu.pos.x, this.eu.alt + 1, this.eu.pos.z);
      // os RAIOS do horizonte (o dono, out/2026: "mais raios no horizonte de eventos") — desde a captura, cada vez mais
      if (!this.raiosBN) { this.raiosBN = criarRaiosBN({ low: this.o.low }); this.cena.scene.add(this.raiosBN.grupo); }
      const kr = naCaptura(v) ? 0.25 * progressoCaptura(v) : 0.25 + 0.75 * k;
      if (this.raiosBN.atualizar(dt, kr, this.tmpEu, this.tmpBN, b.r) && Math.random() < 0.5) s.tocar("raio", this.eu.av.group.position, { dist: DISTANCIA.eu, volume: 0.35 + 0.5 * kr });
      // os estalos e trovões cada vez mais seguidos
      this.proxRaioBN -= dt;
      if (this.proxRaioBN <= 0) { this.proxRaioBN = 0.35 + Math.random() * 1.1 * (1 - 0.7 * k); s.tocar(Math.random() < 0.65 ? "raio" : "trovao", this.eu.av.group.position, { dist: DISTANCIA.eu, volume: 0.45 + 0.55 * k }); }
      if (k > 0.93 && !this.estourouBN) { this.estourouBN = true; s.tocar("estilhacos", this.eu.av.group.position, { dist: DISTANCIA.eu }); }
      this.somTempestade ??= s.loop("tempestade-cosmica", this.eu.av.group, { dist: DISTANCIA.eu, volume: 0 });
      s.volumeLoop(this.somTempestade, 0.35 + 0.65 * k, 3);
      return;
    }
    this.raiosBN?.apagar();
    if (this.somTempestade) { s.volumeLoop(this.somTempestade, 0, 0.8); if (!this.clarao && !this.emergir) { s.soltarLoop(this.somTempestade); this.somTempestade = null; } }
  }
  private tmpBN = new THREE.Vector3(); private tmpEu = new THREE.Vector3();
  // ───────────── a APROXIMAÇÃO do buraco negro: os DETRITOS (lib/cyber/detritos) ─────────────
  private aprox: { bn: THREE.Vector3; k: number; lista: Asteroide[]; id: number } | null = null;
  private detritosVis: DetritosHandle | null = null; private wAprox = 0; private tremorBatida = -Infinity; private flashBatida: HTMLDivElement | null = null;
  /** a minha velocidade agora (mundo): a da moto, do carro ou da mochila */
  private minhaVel(): { x: number; y: number; z: number } {
    if (this.noCarro()) { const e = this.carro!.est; return { x: e.vx, y: e.vy, z: e.vz }; }
    if (this.moto !== null) return { x: this.motoEst.vx, y: this.motoEst.vy, z: this.motoEst.vz };
    return this.jet.noAr ? { x: this.jetV.x, y: this.jet.vy, z: this.jetV.z } : { x: 0, y: 0, z: 0 };
  }
  /** soma uma velocidade (o empurrão de uma batida, o magnetismo) no que eu estiver pilotando */
  private empurrarVeiculo(d: { x: number; y: number; z: number }) {
    if (this.noCarro()) { const c = this.carro!; c.est = { ...c.est, vx: c.est.vx + d.x, vy: c.est.vy + d.y, vz: c.est.vz + d.z }; return; }
    if (this.moto !== null) { this.motoEst = { ...this.motoEst, vx: this.motoEst.vx + d.x, vy: this.motoEst.vy + d.y, vz: this.motoEst.vz + d.z }; this.motoPousado = false; return; }
    if (this.jet.noAr) { this.jetV = { x: this.jetV.x + d.x, z: this.jetV.z + d.z }; this.jet.vy += d.y; return; }
    this.empurrao = { x: this.empurrao.x + d.x * 0.3, z: this.empurrao.z + d.z * 0.3 };
  }
  /** um quadro dentro da ZONA: o CAMPO DE ASTEROIDES vindo na sua direção (o que passa renasce lá na frente), o
   *  magnetismo puxando de leve; acertou = empurrão, vida, tremor; raspou = o vush */
  private passoAproximacao(f: { bn: { x: number; y: number; z: number; r: number } }, k: number, dt: number) {
    const ilhaY = this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY, w = mundo(f.bn);
    const nova = !this.aprox, a = (this.aprox ??= { bn: new THREE.Vector3(), k, lista: [], id: 0 });
    a.bn.set(w.x, ilhaY + f.bn.y, w.z); a.k = k;
    const eu = { x: this.eu.pos.x, y: this.eu.alt + 1, z: this.eu.pos.z }, vel = this.minhaVel(), bn = { x: a.bn.x, y: a.bn.y, z: a.bn.z }, b = baseDoTunel(eu, bn);
    const pu = puxaoDaZona(eu, bn, k); this.empurrarVeiculo({ x: pu.x * dt, y: pu.y * dt, z: pu.z * dt });
    // o campo: enche até o tamanho de agora (na entrada, espalhado pela profundidade toda; depois, nascendo lá no fundo)
    const quer = tamanhoDoCampo(k, this.o.low);
    // (sempre LÁ NA FRENTE — o dono: "surgem muito perto do jogador"; na entrada, espalhados só pela metade de trás do túnel)
    while (a.lista.length < quer) a.lista.push(novoAsteroide(Math.random, a.id++, eu, vel, bn, k, nova ? DETRITOS.fundo * (0.45 + 0.55 * Math.random()) : DETRITOS.fundo * (0.85 + 0.15 * Math.random())));
    const perigo = new Set<number>(); let raspou = false;
    a.lista = a.lista.filter((d) => {
      const r = passoAsteroide(d, dt, eu, b.f);
      if (r.acertou) { this.batidaDeDetrito(d, eu, bn); return false; }
      if (r.raspou) raspou = true;
      if (r.atras) return false;
      if (vaiAcertar(d, eu, vel)) perigo.add(d.id);
      return true;
    });
    if (raspou && this.agora > this.raspaoAte) { this.raspaoAte = this.agora + 0.25; this.som.tocar("dash", this.eu.av.group.position, { dist: DISTANCIA.eu, volume: 0.7 }); this.tremorBatida = Math.max(this.tremorBatida, this.agora + 0.12); }
    if (!this.detritosVis) { this.detritosVis = criarDetritos({ low: this.o.low, max: DETRITOS.n[1] }); this.cena.scene.add(this.detritosVis.grupo); }
    const vAx = Math.max(20, -(vel.x * b.f.x + vel.y * b.f.y + vel.z * b.f.z) * -1 + 60 + 60 * k);
    this.detritosVis.desenhar(a.lista, perigo, this.cam, performance.now() / 1000, eu, b.f, vAx, dt);
  }
  private raspaoAte = -Infinity;
  private batidaDeDetrito(d: Asteroide, eu: { x: number; y: number; z: number }, bn: { x: number; y: number; z: number }) {
    this.empurrarVeiculo(empurraoDaBatida(d, eu, bn));
    this.vida = Math.max(1, this.vida - DETRITOS.dano);   // (a batida machuca, não mata)
    this.tremorBatida = this.agora + 0.45;
    this.som.tocar("impacto-heroi", this.eu.av.group.position, { dist: DISTANCIA.eu, volume: 0.8 });
    this.som.tocar("estilhacos", this.eu.av.group.position, { dist: DISTANCIA.eu, volume: 0.45 });
    if (!this.flashBatida) { const el = document.createElement("div"); el.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:24;opacity:0;background:radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(255,40,60,.55) 100%);"; this.o.overlay.appendChild(el); this.flashBatida = el; }
    const fl = this.flashBatida; fl.style.transition = "none"; fl.style.opacity = "1"; requestAnimationFrame(() => { fl.style.transition = "opacity .45s ease-out"; fl.style.opacity = "0"; });
  }
  /** saiu da zona (ou chegou no ponto doce): os detritos somem */
  private fimDaAproximacao() {
    if (!this.aprox) return;
    this.aprox = null; this.detritosVis?.desenhar([], new Set(), this.cam, 0, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, 0, 0);
  }
  /** a CÂMERA da aproximação (o dono: "uma mudança de câmera que beneficie o 3D e permita identificar e desviar"): mais
   *  alta e mais atrás, olhando pro buraco negro — você no terço de baixo, os detritos vindo de frente com profundidade */
  private cameraDaAproximacao(c: ReturnType<typeof poseDaCamera>, dt: number): ReturnType<typeof poseDaCamera> {
    const a = this.aprox, ativo = !!a && !this.fio;
    this.wAprox += ((ativo ? 1 : 0) - this.wAprox) * Math.min(1, dt * 1.8);
    if (!a || this.wAprox < 0.002) return c;
    const eu = { x: this.eu.pos.x, y: this.eu.alt + 1.2, z: this.eu.pos.z };
    let dx = a.bn.x - eu.x, dy = a.bn.y - eu.y, dz = a.bn.z - eu.z; const L = Math.hypot(dx, dy, dz) || 1; dx /= L; dy /= L; dz /= L;
    const h = Math.hypot(dx, dz) || 1, lx = -dz / h, lz = dx / h;
    // (a de PERSEGUIÇÃO dos jogos de nave: logo atrás e um pouco acima, olhando lá pra frente — a profundidade do campo)
    void lx; void lz;
    const pos = { x: eu.x - dx * 9.5, y: eu.y - dy * 9.5 + 3.4, z: eu.z - dz * 9.5 };
    const olhar = { x: eu.x + dx * 60, y: eu.y + dy * 60 + 1, z: eu.z + dz * 60 };
    const k = this.wAprox * this.wAprox * (3 - 2 * this.wAprox);
    const mix = (p: { x: number; y: number; z: number }, q: { x: number; y: number; z: number }) => ({ x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k, z: p.z + (q.z - p.z) * k });
    return { ...c, pos: mix(c.pos, pos), olhar: mix(c.olhar, olhar) };
  }
  /** a CÂMERA da travessia (o dono: "uma cutscene focando no buraco negro"): sai de trás do personagem pra um plano
   *  aberto de lado — você em primeiro plano, o buraco negro e as fachadas no fundo —, e vai fechando junto com a tragada */
  private wTravessia = 0;
  private cameraDaTravessia(c: ReturnType<typeof poseDaCamera>, dt: number): ReturnType<typeof poseDaCamera> {
    const v = this.fio;
    this.wTravessia += ((v ? 1 : 0) - this.wTravessia) * Math.min(1, dt * 0.7);   // (entra devagar: a 1ª cutscene começa no embalo)
    if (!v || this.wTravessia < 0.002) return c;
    const k = progressoTragada(v), ilhaY = this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY, b = v.f.bn, w = mundo(b);
    const bn = { x: w.x, y: ilhaY + b.y, z: w.z }, eu = { x: this.eu.pos.x, y: this.eu.alt + 1.2, z: this.eu.pos.z };
    let dx = eu.x - bn.x, dy = eu.y - bn.y, dz = eu.z - bn.z; const L = Math.hypot(dx, dy, dz) || 1; dx /= L; dy /= L; dz /= L;
    // o lado (horizontal, perpendicular ao eixo) gira devagar — a câmera orbita enquanto fecha
    const giro = 0.9 + k * 0.8, lx = -dz, lz = dx, ln = Math.hypot(lx, lz) || 1;
    const sx = (lx / ln) * Math.cos(giro) - 0 * Math.sin(giro), sz = (lz / ln) * Math.cos(giro);
    // (de LADO e um pouco atrás: você de perfil no primeiro plano, o túnel e o buraco negro na frente)
    const dist = 15 - 6 * k, alto = 2.2 + 1.5 * (1 - k);
    const pos = { x: eu.x + dx * dist * 0.5 + sx * dist * 0.9, y: eu.y + alto + dy * dist * 0.3, z: eu.z + dz * dist * 0.5 + sz * dist * 0.9 };
    // (um pouco à frente de você, puxando pro buraco negro: você no quadro e ele atrás — 7× maior, ele não cabe mais)
    const puxa = Math.min(25, L * 0.012) / L;   // (no máximo 25 m rumo ao buraco negro: você não sai do quadro)
    let olhar = { x: eu.x - dx * 6 + (bn.x - eu.x) * puxa, y: eu.y - dy * 6 + 0.3 + (bn.y - eu.y) * puxa, z: eu.z - dz * 6 + (bn.z - eu.z) * puxa };
    // a 1ª CUTSCENE (a captura, a entrada na zona de eventos): o plano ABERTO — bem atrás e de lado, alto, o buraco negro
    // gigante enchendo o quadro e você pequeno na frente dele; vai fechando no plano da espiral (a 2ª) no fim da captura
    if (naCaptura(v) || v.t < CAPTURA.dur + 3) {
      const u = progressoCaptura(v), aberto = Math.max(0, Math.min(1, 1 - (v.t - CAPTURA.dur) / 3)), g = aberto * aberto * (3 - 2 * aberto);
      // (atrás de você e acima, olhando pro buraco negro: você pequeno embaixo, ele gigante na frente, o disco cortando o quadro)
      const longe = 55 - 15 * u, posA = { x: eu.x + dx * longe + sx * longe * 0.25, y: eu.y + 16 - 4 * u, z: eu.z + dz * longe + sz * longe * 0.25 };
      const olharA = { x: eu.x + (bn.x - eu.x) * 0.5, y: eu.y + (bn.y - eu.y) * 0.5, z: eu.z + (bn.z - eu.z) * 0.5 };
      pos.x += (posA.x - pos.x) * g; pos.y += (posA.y - pos.y) * g; pos.z += (posA.z - pos.z) * g;
      olhar = { x: olhar.x + (olharA.x - olhar.x) * g, y: olhar.y + (olharA.y - olhar.y) * g, z: olhar.z + (olharA.z - olhar.z) * g };
    }
    const kk = this.wTravessia * this.wTravessia * (3 - 2 * this.wTravessia);
    const mix = (a: { x: number; y: number; z: number }, b2: { x: number; y: number; z: number }) => ({ x: a.x + (b2.x - a.x) * kk, y: a.y + (b2.y - a.y) * kk, z: a.z + (b2.z - a.z) * kk });
    return { ...c, pos: mix(c.pos, pos), olhar: mix(c.olhar, olhar) };
  }
  // ───────────── a TRAVESSIA CÓSMICA: o clarão, e do outro lado o personagem SAINDO do buraco negro ─────────────
  private clarao: { t: number; trocou: boolean } | null = null; private claraoEl: HTMLDivElement | null = null;
  /** saindo do buraco negro do destino: de dentro dele (a boca, MUNDO) até o ponto de chegada, num arco */
  private emergir: { de: THREE.Vector3; para: THREE.Vector3; rumo: number; t: number; dur: number } | null = null;
  private static readonly CLARAO = { sobe: 0.32, desce: 1.25 } as const;
  private atualizarClarao(dt: number) {
    const c = this.clarao; if (!c) { if (this.claraoEl && this.claraoEl.style.opacity !== "0") this.claraoEl.style.opacity = "0"; return; }
    if (!this.claraoEl) {
      const el = document.createElement("div");
      el.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:26;opacity:0;mix-blend-mode:screen;background:radial-gradient(circle at 50% 50%, #fff 0%, #f4e9ff 18%, #b48cff 42%, #4a1e9e 72%, #0a0218 100%);";
      this.o.overlay.appendChild(el); this.claraoEl = el;
    }
    c.t += dt; const C = CyberEngine.CLARAO;
    if (!c.trocou && c.t >= C.sobe) { c.trocou = true; this.viajarDireto(); }   // (no auge do clarão, já está do outro lado)
    const op = c.t < C.sobe ? c.t / C.sobe : Math.max(0, 1 - (c.t - C.sobe) / C.desce);
    this.claraoEl.style.opacity = (op * op * (3 - 2 * op)).toFixed(3);
    if (c.t >= C.sobe + C.desce) this.clarao = null;
  }
  /** a travessia direta, com a tela COBERTA pelo túnel: chega no destino */
  viajarDireto() {
    const d = this.direto; if (!d) return;
    this.direto = null; this.fio = null;
    const comMoto = this.moto !== null && !this.noCarro();
    this.largarVeiculoNoFluxo(comMoto);   // (o carro que veio pelo fluxo fica; a MOTO atravessa com a pessoa — out/2026)
    this.irParaNo(d.para, d.pose ?? NOS[d.para].chegada);
    if (comMoto) { this.altoEm = null; this.yNav = 0; this.plat = null; this.motoPousado = false; this.autoPouso = false; }
    this.fluxoArmado = false;   // (só pega de novo depois de se afastar do buraco negro)
    // do outro lado: o personagem SAI do buraco negro do destino (o de saída da sala — perto dela — ou o da cidade, no hub)
    const ilhaY = this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY;
    const boca = ehSala(d.para) ? (() => { const b = saidaDaSala(d.para).bn, w = mundo(b); return new THREE.Vector3(w.x, ilhaY + b.y, w.z); })()
      : d.para === "zaeon" ? (() => { const w = mundo(CIDADE.portalTunel); return new THREE.Vector3(w.x, ilhaY + 9, w.z); })() : null;
    // (a cutscene de SAÍDA mais lenta — o dono, out/2026; e a distorção ainda 7 s, se desfazendo)
    if (boca) { const para = new THREE.Vector3(this.eu.pos.x, this.eu.alt, this.eu.pos.z), dur = Math.min(10, 4 + boca.distanceTo(para) / 90); this.emergir = { de: boca, para, rumo: this.eu.facing, t: 0, dur }; }
    this.distorcaoAte = this.agora + CyberEngine.DISTORCAO_NA_CHEGADA;
  }
  // ───────────── as CÁPSULAS da torre tecnológica (o Templo Cósmico — lib/cyber/temploCosmico `POCOS_TC`) ─────────────
  /** viajando numa cápsula: o poço e onde eu estou dentro dela (do centro) */
  private elevTC: { poco: PocoTC; dx: number; dz: number } | null = null;
  /** o poço em cuja cápsula ABERTA eu estou esperando (embarco quando a porta fecha) */
  private esperandoCapsula: string | null = null;
  /** a pé, dentro de uma cápsula aberta (no nível do lounge): quando a porta fecha, embarca — se couber (os de dentro, por
   *  ordem, até a capacidade: todo mundo decide igual); senão, espera a próxima */
  private conferirElevadorTC() {
    if (this.elevTC || this.nivel !== "lounge" || this.jet.noAr || this.moto !== null || this.noCarro() || this.fio || this.emergir) return;
    const L = CIDADE.salas.lounge, c = CIDADE.centro, ilhaY = this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY, q = naSala(L, this.eu.pos.x - c.x, this.eu.pos.z - c.z);
    const boca = bocaDoPoco(q, this.eu.alt - ilhaY - ALTURA_LOUNGE);
    if (!boca) { this.esperandoCapsula = null; return; }
    const p = boca.poco, st = capsulaEm(p, Date.now() / 1000);
    if (st.aberta === boca.ponta) { this.esperandoCapsula = p.id; return; }
    if (this.esperandoCapsula !== p.id || st.saiu !== boca.ponta) return;
    this.esperandoCapsula = null;   // (a porta fechou comigo dentro: embarco — se couber)
    const piso = boca.ponta === "baixo" ? p.de : p.ate, dentro = [this.o.eu.id];
    for (const [id, a] of this.remotos) { const r = naSala(L, a.pos.x - c.x, a.pos.z - c.z); if (Math.hypot(r.x - p.x, r.z - p.z) < p.r && Math.abs(a.alt - ilhaY - ALTURA_LOUNGE - piso) < 1.5) dentro.push(id); }
    if (!embarcam(p, dentro).includes(this.o.eu.id)) { this.o.onAviso?.(`Cápsula lotada (máx. ${p.cap}). Espere a próxima.`); return; }
    const d = Math.hypot(q.x - p.x, q.z - p.z), k = d > p.r - 0.6 ? (p.r - 0.6) / d : 1;
    this.elevTC = { poco: p, dx: (q.x - p.x) * k, dz: (q.z - p.z) * k }; this.alvo = null; this.alvoDepois = null;
    this.som.tocar("rise", this.eu.av.group.position, { dist: DISTANCIA.eu, volume: 0.6 });
  }
  /** a CÂMERA na cápsula (o dono: "se comportar melhor e ficar estática o máximo possível"): presa à cápsula — atrás de
   *  quem está nela, junto do vidro do lado da torre, olhando pra fora — e sobe JUNTO (sem atraso); entra e sai suave */
  private wCapsula = 0; private camCapsula: PocoTC | null = null;
  private cameraDaCapsula(c: ReturnType<typeof poseDaCamera>, dt: number): ReturnType<typeof poseDaCamera> {
    if (this.elevTC) this.camCapsula = this.elevTC.poco;
    this.wCapsula += ((this.elevTC ? 1 : 0) - this.wCapsula) * Math.min(1, dt * 2.5);
    const p = this.camCapsula; if (!p || this.wCapsula < 0.002) { if (!this.elevTC) this.camCapsula = null; return c; }
    const L = CIDADE.salas.lounge, w = mundo(daSala(L, p.x, p.z)), tw = mundo(daSala(L, TORRE_TI.x, TORRE_TI.z));
    let dx = w.x - tw.x, dz = w.z - tw.z; const n = Math.hypot(dx, dz) || 1; dx /= n; dz /= n;
    const y = this.eu.alt, k = this.wCapsula * this.wCapsula * (3 - 2 * this.wCapsula);
    const pos = { x: w.x - dx * (p.r - 0.5), y: y + 2.5, z: w.z - dz * (p.r - 0.5) }, olhar = { x: w.x + dx * 30, y: y + 0.6, z: w.z + dz * 30 };
    if (this.elevTC) { this.camAz = Math.atan2(-dx, -dz); this.camT.set(this.eu.pos.x, 1.2 + this.eu.alt, this.eu.pos.z); }   // (saindo, a câmera de sempre já está atrás, olhando pra fora)
    const mix = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k });
    return { ...c, pos: mix(c.pos, pos), olhar: mix(c.olhar, olhar) };
  }
  /** a viagem: o corpo vai junto com a cápsula (no relógio comum) até ela abrir na outra ponta */
  private passoElevadorTC(_dt: number): boolean {
    const v = this.elevTC; if (!v) return false;
    const st = capsulaEm(v.poco, Date.now() / 1000), L = CIDADE.salas.lounge, w = mundo(daSala(L, v.poco.x + v.dx, v.poco.z + v.dz)), ilhaY = this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY;
    this.eu.pos.set(w.x, 0, w.z); this.eu.alt = ilhaY + ALTURA_LOUNGE + st.h; this.alvo = null; this.alvoDepois = null;
    { const c = mundo(daSala(L, v.poco.x, v.poco.z)), tw = mundo(daSala(L, TORRE_TI.x, TORRE_TI.z)); this.eu.facing = Math.atan2(c.x - tw.x, c.z - tw.z); }   // (virado pra fora: a vista)
    if (st.aberta) this.elevTC = null;   // (chegou e abriu: a pé de novo)
    return true;
  }
  /** o arco de quem sai do buraco negro: sobe um pouco, voa e pousa no ponto de chegada (o corpo cresce saindo) */
  private passoEmergir(dt: number): boolean {
    const e = this.emergir; if (!e) return false;
    e.t += dt; const k = Math.min(1, e.t / e.dur), u = k * k * (3 - 2 * k), eu = this.eu;
    const alto = Math.max(e.de.y, e.para.y) + 18 + e.de.distanceTo(e.para) * 0.08;
    const x = e.de.x + (e.para.x - e.de.x) * u, z = e.de.z + (e.para.z - e.de.z) * u;
    const y = (1 - u) * (1 - u) * e.de.y + 2 * (1 - u) * u * alto + u * u * e.para.y;
    eu.pos.set(x, 0, z); eu.alt = y; eu.facing = Math.atan2(e.para.x - e.de.x, e.para.z - e.de.z);
    eu.av.group.scale.setScalar(this.moto !== null ? 1 : 0.25 + 0.75 * Math.min(1, k / 0.3));   // (de moto, sai inteiro: a moto não encolhe)
    this.alvo = null; this.alvoDepois = null;
    if (k >= 1) { this.emergir = null; eu.av.group.scale.setScalar(1); eu.facing = e.rumo; }
    return true;
  }
  /** voltando de uma sala (ou nascendo pra testar): aparece no HUB ao lado do ESTACIONAMENTO de carros (o leste), de
   *  frente pros carros */
  private chegadaPertoDoCarro() {
    const l = LOTES_CARRO[0]!, v = vagaDoLote(l, 0, 1.5), d = Math.hypot(v.x, v.z) || 1, k = 1 - (l.entreFilas * 0.5 + 6) / d, w = mundo({ x: v.x * k, z: v.z * k });
    return { x: w.x, z: w.z, rumo: v.rumo };
  }
  /** o dono NASCE na sua BASE (out/2026, o dono): a CABANA no topo da pirâmide do mirante da Terra — a do lado dos
   *  painéis e das supertrees (lib/cyber/landmarks `mirante-1`) —, dentro dela, olhando pra cidadela */
  private spawnNaCabana(): boolean {
    if (!NIVEIS_SEPARADOS || !this.cidade || !this.ehFundador(this.o.eu.id)) return false;
    const l = this.lms.find((x) => x.poi.id === "mirante-1"), mn = l ? marcoNav(l.poi) : null;
    if (!l || !mn) return false;
    const c = { x: CIDADE.centro.x, z: CIDADE.centro.z }, rumo = Math.atan2(c.x - l.poi.x, c.z - l.poi.z);
    this.irParaNo("zaeon", { x: l.poi.x, z: l.poi.z, rumo });
    this.altoEm = l.poi.id; this.yNav = mn.nav.pisoY; this.jet.noAr = false;
    this.eu.alt = (l.poi.base ?? CHAO) + mn.nav.pisoY + this.boia(l);
    return true;
  }
  private spawnPertoDoCarro(): boolean {
    if (!NIVEIS_SEPARADOS || !this.cidade || !this.ehFundador(this.o.eu.id)) return false;
    this.irParaNo("zaeon", this.chegadaPertoDoCarro()); return true;
  }
  /** o carro/a moto que o fluxo levou: o carro volta pra vaga dele, a moto some (a fábrica repõe) — a pessoa chega a pé */
  private largarVeiculoNoFluxo(ficaComAMoto = false) {
    const c = this.carro;
    if (c && c.fase !== "parado") { c.fase = "parado"; c.k = 0; c.ligado = 0; c.h.abrir(0); this.carro = null; this.carroLargado = null; }
    if (this.moto !== null && !ficaComAMoto) { this.moto = null; this.motoDe = undefined; this.motoLargada = null; this.autoPouso = false; }
    this.jet.noAr = false; this.jet.vy = 0;
  }
  /** o MAGNETISMO dos buracos negros (out/2026, o dono): o caminho até eles é LIVRE (de carro, de moto, de mochila); a
   *  `ATRACAO.raio` m do horizonte, ele puxa — uma espiral que fecha e acelera — e, no horizonte, a travessia DIRETA (o
   *  buraco negro de uma pista do hub → a sala dela; o de saída de uma sala → o hub) */
  private atualizarFluxo(dt: number) {
    if (!NIVEIS_SEPARADOS || this.menu || this.direto || this.tunel || this.pilotando || this.bordo || this.nascendo || !this.nivel) return;
    const ilhaY = this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY, eu = this.eu;
    if (this.fio) {
      const v = this.fio, { chegou } = passoTragada(v, dt);
      if (chegou && !v.abriu) { v.abriu = true; this.abrirDireto(v.f.saida ? "zaeon" : v.f.sala, v.f.saida ? this.chegadaPertoDoCarro() : undefined); }
      return;
    }
    const pistas = this.nivel === "zaeon" ? fiosCosmicos() : ehSala(this.nivel) ? [saidaDaSala(this.nivel)] : null;
    if (!pistas) return;
    const p = { x: eu.pos.x - CIDADE.centro.x, y: eu.alt - ilhaY, z: eu.pos.z - CIDADE.centro.z };
    // (out/2026, o dono) o CAMINHO: assim que se sai rumo a um buraco negro (passou da boca da pista), o CAMPO DE
    // ASTEROIDES — fácil no começo, cada vez pior; só no PONTO DOCE ele te puxa sozinho
    let f: (typeof pistas)[number] | null = null, z: ReturnType<typeof naZona> = null;
    if (this.nivel === "zaeon") {   // (no hub: 100 m depois da borda da cidadela, em QUALQUER direção — o buraco negro mais perto)
      if (Math.hypot(p.x, p.z) > CIDADE.bordaR + DETRITOS.depoisDaCidadela) for (const q of pistas) {
        const inicio = Math.hypot(q.bn.x, q.bn.z) - CIDADE.bordaR - DETRITOS.depoisDaCidadela, zz = naZona(p, q.bn, q.bn.r, inicio, true);
        if (zz && (!z || zz.d < z.d)) { f = q; z = zz; }
      }
    } else for (const q of pistas) { const zz = naZona(p, q.bn, q.bn.r, inicioDaZona(q.boca, q.bn)); if (zz && (!z || zz.d < z.d)) { f = q; z = zz; } }
    if (!f || !z) { this.fluxoArmado = true; this.fimDaAproximacao(); return; }
    if (!this.fluxoArmado) return;   // (acabou de chegar de um túnel ali perto: só depois de se afastar)
    if (!z.doce) { this.passoAproximacao(f, z.k, dt); return; }
    this.fimDaAproximacao();
    this.fio = comecarTragada(f, p, this.minhaVel()); this.fluxoArmado = false;   // (a CAPTURA: segue no embalo de quem vinha)
    if (this.jet.noAr) { this.jet.noAr = false; this.jet.vy = 0; }
    this.alvo = null; this.alvoDepois = null; this.sitT = 0;
    // (out/2026, o dono: no lugar do "rise" e do assobio, a TEMPESTADE CÓSMICA — o trovão de entrada; o resto, na atmosfera)
    this.som.tocar("trovao", eu.av.group.position, { dist: DISTANCIA.eu });
    // a travessia é DE MOTO (quem já liberou as motos): a pé, ela se materializa embaixo — e sai com você do outro lado
    if (this.moto === null && !this.noCarro() && this.podeMoto()) {
      this.moto = MOTO_DO_BURACO; this.motoDe = undefined; this.motoEst = motoParada(eu.pos.x, eu.alt + 0.5, eu.pos.z, eu.facing);
      this.motoPousado = false; this.autoPouso = false; this.altoEm = null; this.yNav = 0; this.plat = null; this.ilhota = null;
      this.som.tocar("moto-partida", eu.av.group.position, { dist: DISTANCIA.eu });
    }
  }
  /** onde a tragada está levando agora (MUNDO) e o rumo — a pessoa, ou o carro/a moto com ela */
  private posNoFluxo() {
    const q = posDaTragada(this.fio!), w = mundo(q), ilhaY = this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY;
    return { x: w.x, y: ilhaY + q.y, z: w.z, rumo: q.rumo };
  }
  /** a DISTORÇÃO perto de um buraco negro (out/2026, o dono: "psicodelia e distorção de imagem"): a tela ondula (um
   *  campo de ruído deslocando os pixels — filtro SVG no canvas), as cores giram e saturam; cresce chegando e no auge
   *  quando se está sendo tragado. Longe, nenhum filtro (custo zero). No modo LEVE, só as cores */
  private distorcao: { k: number; svg: SVGSVGElement | null; turb: SVGFETurbulenceElement | null; desl: SVGFEDisplacementMapElement | null } = { k: 0, svg: null, turb: null, desl: null };
  private distorcaoCosmica(t: number) {
    const D = this.distorcao, alvo = this.pertoDeBuracoNegro();
    D.k += (alvo - D.k) * 0.06;
    const cv = this.R.domElement;
    if (D.k < 0.015 || (this.o.low && !this.fio)) { if (cv.style.filter) cv.style.filter = ""; return; }   // (no LEVE, só durante a tragada — é curta: o desfoque e as cores; sem a ondulação do SVG; fora dela, nenhum filtro no canvas: o navegador recompõe a tela inteira a cada quadro)
    if (!this.o.low && !D.svg) {
      const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg"); svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.style.position = "absolute";
      const fl = document.createElementNS(ns, "filter"); fl.id = "zaeon-bn-distorce"; fl.setAttribute("x", "-5%"); fl.setAttribute("y", "-5%"); fl.setAttribute("width", "110%"); fl.setAttribute("height", "110%");
      const turb = document.createElementNS(ns, "feTurbulence"); turb.setAttribute("type", "fractalNoise"); turb.setAttribute("numOctaves", "2"); turb.setAttribute("seed", "7");
      const desl = document.createElementNS(ns, "feDisplacementMap"); desl.setAttribute("in", "SourceGraphic"); desl.setAttribute("xChannelSelector", "R"); desl.setAttribute("yChannelSelector", "G");
      fl.append(turb, desl); svg.append(fl); this.o.overlay.appendChild(svg); D.svg = svg; D.turb = turb; D.desl = desl;
    }
    const k = D.k, onda = Math.sin(t * 0.7);
    if (D.turb && D.desl) { D.turb.setAttribute("baseFrequency", `${(0.004 + 0.002 * Math.sin(t * 0.31)).toFixed(4)} ${(0.007 + 0.003 * Math.cos(t * 0.23)).toFixed(4)}`); D.desl.setAttribute("scale", (k * k * 46).toFixed(1)); }
    // (no HORIZONTE DE EVENTOS — a tragada —, o DESFOQUE: a imagem derrete quanto mais perto do núcleo — o dono, out/2026)
    const desfoque = this.fio ? (naCaptura(this.fio) ? 0.8 * progressoCaptura(this.fio) : 0.8 + 3.2 * progressoTragada(this.fio)) : 0;
    cv.style.filter = `${D.svg ? "url(#zaeon-bn-distorce) " : ""}${desfoque > 0.05 ? `blur(${desfoque.toFixed(2)}px) ` : ""}hue-rotate(${(k * 70 * onda).toFixed(1)}deg) saturate(${(1 + 1.3 * k).toFixed(2)}) contrast(${(1 + 0.18 * k).toFixed(2)})`;
  }
  /** quanto um buraco negro está PERTO agora (0..1 — a distorção da tela e a tempestade) */
  private distorcaoAte = -Infinity; private static readonly DISTORCAO_NA_CHEGADA = 7;
  private pertoDeBuracoNegro(): number {
    // (out/2026, o dono: "o distorcido depois de sairmos do buraco negro não deve ficar — o efeito é todo ao ENTRARMOS"):
    // só na tragada (a cutscene); chegando do outro lado, nada
    // (e depois de SAIR do outro lado: 7 s se desfazendo — `DISTORCAO_NA_CHEGADA` — e as cores voltam ao normal)
    if (!NIVEIS_SEPARADOS || this.menu) return 0;
    // (chegando — o fim do caminho dos asteroides — a imagem começa a ondular; na captura cresce; na espiral, o auge)
    if (this.fio) return naCaptura(this.fio) ? 0.25 + 0.25 * progressoCaptura(this.fio) : 0.5 + 0.5 * progressoTragada(this.fio);
    if (this.aprox && this.aprox.k > 0.65) return 0.25 * (this.aprox.k - 0.65) / 0.35;
    const falta = this.distorcaoAte - this.agora;
    return falta > 0 ? 0.85 * Math.min(1, falta / CyberEngine.DISTORCAO_NA_CHEGADA) : 0;
  }


  viajarPeloTunel(destino: IdNo | null) {
    if (!this.tunel) return;
    if (!destino || destino === this.tunel.origem || !NOS[destino]) { this.tunel = null; return; }
    if (destino === "zaeon" && !this.cidade) { this.tunel = null; return; }
    this.irParaNo(destino);
    if (this.guia) this.guia.portal = true;   // cruzou um portal (o tutorial pedia isso)
    if (this.novatoNaPraca && destino === "zaeon") { this.novatoNaPraca = false; this.o.onNasceu?.(); }   // o novato chegou na Zaeon pelo portal
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
  /** o novato que nasceu na PRAÇA e ainda não foi pra Zaeon (pelo portal) */
  private novatoNaPraca = false;
  /** nasce na PRAÇA (a plataforma de baixo, sem arena nem terminais): no ponto de chegada dela, perto do portal — a
   *  Zaeon fica lá em cima, e só se chega nela pelo buraco negro */
  private nascerNaPraca(): boolean {
    if (this.menu) return false;
    this.irParaNo("praca"); this.novatoNaPraca = true;
    return true;
  }
  /** nasce no TUBO DE ENSAIO do berçário (ao lado da Recepção): parado até o vidro abrir; a anfitriã vem buscar */
  private nascerNoTubo(): boolean {
    if (!this.cidade || !this.bercario || this.menu) return false;
    const i = tuboDe(this.o.eu.id), tb = TUBOS[i]!;
    this.irParaNo("zaeon", { x: tb.x, z: tb.z, rumo: tb.rumo }); this.portalArmado = true;
    this.nascendo = { t: 0, tubo: i }; this.bercario.nascer(i);
    this.instancia = true; this.o.onInstancia?.(true);
    this.camPitch = 0.12; this.camDist = 4.6;   // a câmera PERTO (dentro da ilha, por baixo da tampa do tubo): o Droid nasce de frente pra nós
    this.rot = ROTEIRO; this.guia = this.novoGuia(0); this.emitirGuia();
    return true;
  }
  /** RETOMA o tutorial de um progresso salvo (lib/cyber/onboarding `retomadaDe`): a pessoa reaparece no lugar da cena
   *  (na frente do tubo, no centro da capela, na frente dos telões ou na Sala do Saber) e o Droid segue daquele passo */
  private retomarTutorial(r: { passo: IdPassoGuia; onde: OndeRetomar; pesquisa?: PesquisaSalva | null }): boolean {
    if (!this.cidade || this.menu) return false;
    const n = passoDe(r.passo); if (n < 0) return this.nascerNoTubo();
    let p: { x: number; z: number; rumo: number };
    if (r.onde === "tubo") { const tb = TUBOS[tuboDe(this.o.eu.id)]!; p = { x: tb.x + Math.sin(tb.rumo) * 2.6, z: tb.z + Math.cos(tb.rumo) * 2.6, rumo: tb.rumo }; }
    else if (r.onde === "capela") { const c = mundo(CENTRO_DA_CAPELA_LOCAL); p = { x: c.x + 2.5, z: c.z, rumo: -Math.PI / 2 }; }
    else if (r.onde === "teloes") { const c = mundo(FRENTE_DOS_TELOES_LOCAL); p = { x: c.x, z: c.z, rumo: 0 }; }
    else { const c = mundo(daSala(CIDADE.salas.biblioteca, FRENTE_DO_SABER_SALA.x, FRENTE_DO_SABER_SALA.z)), rl = relicarioMundo(); p = { x: c.x, z: c.z, rumo: Math.atan2(rl.x - c.x, rl.z - c.z) }; }
    this.irParaNo("zaeon", p); this.portalArmado = false;
    this.instancia = true; this.o.onInstancia?.(true);
    this.balaoLiberado = n > passoDe("zaeon");   // depois da conversa com a Zaeon, as falas viram balões
    this.pesquisaDoTutorial = r.pesquisa ?? null;
    this.rot = ROTEIRO; this.guia = this.novoGuia(n); this.emitirGuia();
    if (r.passo === "zaeon" || r.passo === "capela") this.preaquecerVozZaeon();
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
  private novoGuia(passo: number) { return { passo, fala: 0, falaT: 0, ativo: false, lembrete: "" as "" | "concorrencia" | "entregou" | "volte", viuConcorrencia: false, invT: 0, saberT: -1, andou: 0, correu: 0, turbo: 0, motoAndou: 0, portal: false, pisoY: this.eu.alt, prev: { x: this.eu.pos.x, z: this.eu.pos.z } }; }
  private emitirGuia() {
    if (!this.guia) { this.o.onGuia?.(null); return; }
    const p = this.rot[this.guia.passo]!;
    // (o HUD mostra passo/total-1: no tutorial o passo 0 é o nascer; a entrega e as motos contam a partir do 1)
    const principal = this.rot === ROTEIRO;
    this.o.onGuia?.({ passo: principal ? this.guia.passo : this.guia.passo + 1, total: principal ? this.rot.length : this.rot.length + 1, id: p.id, titulo: p.titulo, agente: DROID.nome, cor: DROID.cor });
  }
  private encerrarGuia() { this.guia = null; this.emitirGuia(); this.o.onDialogo?.(null); this.sairDaInstancia(); }
  /** guarda o PROGRESSO do tutorial principal (só o ROTEIRO do novato; a entrega e as motos não retomam) */
  private salvarProgresso(passo: IdPassoGuia | "fim") {
    const pq = this.pesquisaDoTutorial; this.o.onProgresso?.({ passo, pesquisa: pq ? { titulo: pq.titulo, palavras: pq.palavras, workId: pq.workId } : null });
  }
  /** o tutorial: "Próximo" (pula o passo — dev), "Pular" (o Droid se despede no portal) e "Refazer" (chamado na Recepção) */
  guiaProximo() { if (!this.guia || this.nascendo) return; this.irProPasso(this.guia.passo + 1); }
  guiaPular() { if (this.guia) { if (this.rot === ROTEIRO) this.salvarProgresso("fim"); this.encerrarGuia(); this.droid?.h.sumir(); this.fecharConversa(); } this.sairDaInstancia(); }
  guiaRefazer() { if (!this.cidade || this.menu) return; this.rot = ROTEIRO; this.balaoLiberado = false; this.guia = this.novoGuia(1); this.emitirGuia(); }
  private irProPasso(n: number) {
    if (this.conversa?.etapa === "feita") this.conversa = null;
    // a ação foi feita: a instrução sai da tela (a caixa de diálogo e o balão do Droid)
    this.o.onDialogo?.(null); this.calarBalaoDroid();
    if (this.guia && this.rot[this.guia.passo]?.cond.tipo === "inventario") this.o.onInventario?.(null);   // o Droid fecha o inventário
    // a ENTREGA ACEITA: o Droid passa direto pro tutorial das MOTOS (a recompensa)
    if (this.rot === ROTEIRO_ENTREGA && n >= this.rot.length && this.entregaVeredito !== null && this.entregaVeredito !== "desistiu" && this.entregaVeredito.aceito) { this.rot = ROTEIRO_MOTOS; n = 0; }
    else if (n >= this.rot.length && this.rot !== ROTEIRO) {
      // o fim da ENTREGA (recusada/desistiu) ou das MOTOS: o Droid volta pra Sala do Saber (as motos, liberadas)
      const eraMotos = this.rot === ROTEIRO_MOTOS;
      this.encerrarGuia(); this.cine.lenta = true;
      if (eraMotos) { this.motosLiberadas = true; this.o.onMotosLiberadas?.(); }
      return;
    }
    if (n >= this.rot.length) {
      // CONCLUÍDO (a palavra final na frente da Sala do Saber): o Droid fica lá esperando; a câmera volta DEVAGAR
      this.salvarProgresso("fim");
      if (this.guia && this.rot[this.guia.passo]?.id === "palavra-final") { this.droidNoSaber = true; this.cine.lenta = true; this.encerrarGuia(); this.o.onTutorialCompleto?.(); return; }
      this.encerrarGuia(); this.droid?.h.sumir(); return;
    }
    this.guia = this.novoGuia(n); this.emitirGuia();
    if (this.rot === ROTEIRO) this.salvarProgresso(this.rot[n]!.id);
    if (this.rot[n]!.id === "capela") this.preaquecerVozZaeon();   // o Droid vai levar a pessoa até ela: as falas fixas já vão sendo geradas
    this.som.tocar("near-ping", this.eu.av.group.position, { dist: DISTANCIA.perto });
  }
  /** um balão de fala sobre quem fala (uma pessoa ou o Droid); `ms` = quanto fica (Infinity = até a próxima fala) */
  private balao(a: { pos: THREE.Vector3; alt: number }, texto: string, cor: string, ms = 4200, destaque = false) {
    this.falas = this.falas.filter((f) => { if (f.ator === a) { f.el.remove(); return false; } return true; });
    const el = document.createElement("div"); el.style.cssText = (destaque ? FALA_DESTAQUE_CSS + `box-shadow:0 0 22px -6px ${cor};` : FALA_CSS) + "border-color:" + cor + ";"; el.textContent = texto.slice(0, 160);
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
  private calarBalaoDroid() { const d = this.droid; if (d) this.falas = this.falas.filter((f) => { if (f.ator === d.fala) { f.el.remove(); return false; } return true; }); }
  private droidFala(texto: string, ultima: boolean) {
    const d = this.droid; if (!d) return;
    // o TUTORIAL fala como um RPG (lib/cyber/dialogo): a caixa de diálogo antes da Zaeon e em toda cena; depois, o balão
    // em destaque. A última fala (a instrução) fica até a ação ser feita
    const g = this.guia, passo = g ? this.rot[g.passo] : undefined;
    const emCena = !!passo?.cena && (!!passo.cenaInteira || !ultima);
    if (passo && ondeFala({ tutorial: true, balaoLiberado: this.balaoLiberado, emCena }) === "caixa") {
      this.calarBalaoDroid();
      const instrucao = ultima && passo.cond.tipo !== "ouvir" && passo.cond.tipo !== "tablet";
      this.o.onDialogo?.({ quem: "droid", nome: DROID.nome, cor: passo.alerta ? "#ff8a3d" : DROID.cor, texto, instrucao, teclas: instrucao ? passo.teclas : undefined, objetivo: passo.titulo, alerta: passo.alerta });
    } else this.balao(d.fala, texto, DROID.cor, ultima ? Infinity : tempoDeLeitura(texto) * 1000 + 400, !!passo);
    this.o.onFalaAgente?.({ id: DROID.id, nome: DROID.nome, cor: DROID.cor, texto });
    this.som.vozDroid(d.h.group, { dur: duracaoVozDroid(texto) });   // a "voz" dele: sem palavras, de outra dimensão
  }
  // ───────────── a CONVERSA com a Zaeon (o holograma do globo da capela — lib/cyber/conversaZaeon) ─────────────
  /** a Zaeon FALA: balão embaixo do rosto + a fala no chat (só local) + a VOZ (Leda, com eco de holograma) e a boca
   *  seguindo o volume dela. Com voz, o balão espera o áudio (até ESPERA_VOZ: fixa = já devia estar no cache; gerativa
   *  = a síntese acabou de começar — ela fica com a cara de "pensando" enquanto isso); sem voz, sai na hora e a boca
   *  mexe sorteada. `depois` roda quando o balão aparece (ex.: abrir o painel da pergunta) */
  private zaeonFala(texto: string, ultima: boolean, o: { gerativa?: boolean; depois?: () => void; semChat?: boolean } = {}) {
    if (this.falaZ) this.mostrarFalaZaeon(this.falaZ);   // (não acontece no roteiro) a anterior sai já, sem esperar
    const f = { texto, ultima, espera: 0, limite: ESPERA_VOZ.fixa as number, buf: undefined as AudioBuffer | null | undefined, depois: o.depois, semChat: o.semChat };
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
    if (this.guia && this.conversa && !this.balaoLiberado) this.o.onDialogo?.({ quem: "zaeon", nome: "Zaeon", cor: COR_ZAEON, texto: f.texto, instrucao: false });   // a 1ª conversa: na caixa de diálogo (cutscene)
    else this.balao(this.falaZaeon, f.texto, COR_ZAEON, f.ultima ? Infinity : Math.max(3600, (this.durFalaZ + 0.8) * 1000));
    if (!f.semChat) this.o.onFalaAgente?.({ id: "zaeon", nome: "Zaeon", cor: COR_ZAEON, texto: f.texto });   // (as frases da capela: só o balão e a voz)
    if (!voz) h?.falar(0.6 + f.texto.length * 0.055);   // sem áudio: a boca sorteada (a reserva)
    f.depois?.();
  }
  /** a ZAEON DA CAPELA (reforma de out/2026): pra quem está na Zaeon perto da capela, o holograma sobe do globo e ela
   *  fala, em turnos aleatórios, frases de motivação, disciplina, atenção e cuidado (lib/cyber/falasCapela) — sempre
   *  feliz e leve (sorri depois de cada fala). Só o balão e a voz (o chat não enche). A próxima frase já vai sendo
   *  sintetizada (fica no cache do servidor: as frases são fixas). Fora da conversa do tutorial */
  private atualizarZaeonCapela(t: number) {
    const h = this.holoZaeon; if (!h || this.conversa || this.instancia || this.menu) return;
    const c = CIDADE.centro, z = this.capelaZ;
    const perto = this.noCeu && !!this.cidade && Math.hypot(this.eu.pos.x - c.x, this.eu.pos.z - c.z) < RAIO_CAPELA;
    if (!perto) {
      if (h.fase() === "visivel" || h.fase() === "subindo") { h.sumir(); this.calarZaeon(); this.falas = this.falas.filter((f) => { if (f.ator === this.falaZaeon) { f.el.remove(); return false; } return true; }); }
      z.proxima = 0; return;
    }
    if (h.fase() === "oculto" || h.fase() === "descendo") { h.aparecer(); h.sorrir(2.5); }
    if (!z.prox) { z.prox = sortearFrase(Math.random(), z.recentes); this.vozCache?.preaquecer([z.prox]); }
    if (!z.proxima) { z.proxima = t + 5; return; }   // chegou agora: ela fala logo
    if (t < z.proxima) return;
    const frase = z.prox; z.prox = null; z.recentes = [...z.recentes.slice(-6), frase];
    this.zaeonFala(frase, false, { semChat: true, depois: () => this.holoZaeon?.sorrir(3) });
    z.proxima = t + proximoTurno(Math.random());
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
  /** a resposta da pessoa (o painel do React ou o chat) à ÚNICA pergunta (estuda, trabalha, empreende?): a situação é
   *  entendida aqui e a Zaeon responde com o COMPROMISSO COM O CONHECIMENTO — gerado (`conversarZaeon`) ou a reserva
   *  fixa — e fecha. Abuso óbvio já expulsa aqui, sem esperar a rede */
  responderZaeon(texto: string): boolean {
    const cv = this.conversa; if (!cv || cv.etapa !== "esperando" || cv.ia) return false;
    const r = limparResposta(texto); if (!r) return false;
    this.o.onPergunta?.(null); cv.historico.push({ quem: "eu", texto: r });
    if (moderar(r).abuso) { this.expulsar(); return true; }
    cv.perfil.situacao = situacaoDe(r) ?? r;   // texto livre que não deu pra classificar: vai como a pessoa disse (a IA entende)
    cv.ia = true;
    // a fala do compromisso: a Zaeon pensa (a cara de pensando) enquanto o servidor responde
    cv.etapa = "pensando"; cv.t = 0; this.holoZaeon?.pensar(true);
    const pedido: PedidoZaeon = { perfil: { ...cv.perfil }, historico: cv.historico.slice(-12), resposta: r, turno: cv.turno, foraSeguidas: cv.foraSeguidas }, serie = cv.serie;
    // a resposta é FIXA por situação (não gerativa — pedido do dono, out/2026: casa com o texto dos cards do tutorial e a
    // voz já vem do cache); só uma pausa curta com o "…" em cima da cabeça dela, pra soar natural
    const espera = new Promise<TurnoZaeon>((ok) => setTimeout(() => ok(fallbackZaeon(pedido)), 1400));
    void espera.then((t) => { if (this.conversa && this.conversa.serie === serie && this.conversa.etapa === "pensando") this.aplicarTurno(t); });
    return true;
  }
  /** ela pergunta (o painel de resposta abre quando o balão — e a voz — começa) */
  private perguntarDeNovo(fala: string, gerativa = false) {
    const cv = this.conversa; if (!cv) return;
    const p = { ...PERGUNTAS[0]!, fala };
    // (a etapa vira "esperando" ANTES da fala: sem voz — som desligado — a fala sai na hora e o painel abria nunca)
    cv.historico.push({ quem: "zaeon", texto: fala }); cv.etapa = "esperando";
    this.zaeonFala(fala, true, { gerativa, depois: () => { if (this.conversa === cv && cv.etapa === "esperando") { this.o.onPergunta?.({ ...p, n: 1, total: 1 }); this.soltarMouse(); } } });
  }
  /** o turno da IA (ou da reserva): abuso → expulsão; senão a fala do COMPROMISSO e ela fecha (é uma pergunta só) */
  private aplicarTurno(t: TurnoZaeon) {
    const cv = this.conversa; if (!cv) return;
    if (t.classe === "abuso") { this.expulsar(); return; }   // (a cara de "pensando" sai quando a fala dela aparece)
    cv.perfil = { ...cv.perfil, ...t.perfil }; cv.turno++;
    this.zaeonFala(t.fala || "Que bom ter você aqui ✦", false, { gerativa: true, depois: () => this.holoZaeon?.sorrir(2.6) });
    cv.historico.push({ quem: "zaeon", texto: t.fala }); cv.etapa = "fechando"; cv.linha = 0; cv.t = -1.5; this.o.onPerfil?.({ ...cv.perfil });
  }
  /** ABUSO: a Zaeon fica BRAVA; o Droid (em fúria) vem pra frente da pessoa e a expulsa do cyberespaço */
  private expulsar() {
    const cv = this.conversa; if (cv) { cv.etapa = "brava"; cv.t = 0; }
    this.o.onPergunta?.(null); this.falaZ = null; this.calarZaeon(); this.holoZaeon?.pensar(false); this.holoZaeon?.brava();
    this.falas = this.falas.filter((f) => { if (f.ator === this.falaZaeon) { f.el.remove(); return false; } return true; });
    this.droid?.h.furia(true); this.expulsando = { t: 0, falou: false };
    this.salvarProgresso("nascer");   // expulso: da próxima vez, do tubo de novo (sem retomar na capela)
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
      else if (cv.linha >= fim.length && cv.t >= dur(3.4)) { h.sumir(); cv.etapa = "feita"; if (this.guia) { this.balaoLiberado = true; this.o.onDialogo?.(null); this.camPitch = 0.16; this.camDist = 9; } }   // daqui em diante, os balões ficam nos personagens
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
    if (!g) { if (farol) farol.visible = false; this.talvezEntrega(); return; }
    const passo = this.rot[g.passo]!;
    if (passo.cond.tipo === "nascer") { if (!this.nascendo) this.irProPasso(g.passo + 1); return; }
    // a ENTREGA no Relicário: o veredito só sai quando a Zaeon ACABA DE LER (a cena roda em components/cyber/Relicario)
    if (passo.cond.tipo === "entrega" && this.entregaPendente) {
      const e = this.entregaPendente; e.t += dt;
      const f = faseDoRelicario(e.t); if (f === "veredito" || f === "fim") { this.entregaPendente = null; this.resultadoEntrega({ aceito: e.aceito, faltando: e.faltando }); }
    }
    // o que a pessoa fez desde a instrução
    const dx = eu.pos.x - g.prev.x, dz = eu.pos.z - g.prev.z; g.prev = { x: eu.pos.x, z: eu.pos.z };
    if (g.ativo) {
      const d = Math.hypot(dx, dz) < 2 && !this.viagem ? Math.hypot(dx, dz) : 0;   // (um teleporte não conta)
      if (!this.jet.noAr) { g.andou += d; if (this.tCorrendo > 0) g.correu += d; }   // correndo = Shift segurado andando
      else if (this.keys.shift || this.correr) g.turbo += d;   // no ar com Shift = o VOO TURBO (o voo longo)
      // a MISSÃO: o Droid abre o tablet (de pé; voando, espera pousar)
      if (passo.cond.tipo === "tablet" && !this.tabletQuer && this.aPeParaTablet()) this.abrirTablet();
      if (this.moto !== null) g.motoAndou += Math.hypot(this.motoEst.vx, this.motoEst.vz) * dt;
      // o PORTAL: o Droid abre um portal e leva a pessoa (com ele) até a frente da Sala do Saber
      if (passo.cond.tipo === "portal" && !this.viagemNave && !g.portal) this.portalPraSaber();
      // o INVENTÁRIO do tutorial: abre na 1ª vez (a pesquisa em destaque) e conta o tempo aberto
      if (passo.cond.tipo === "inventario" && g.invT !== Infinity) { if (g.invT === 0) this.o.onInventario?.(this.pesquisaDoTutorial); g.invT += dt; }
      // o tablet GUARDADO no meio da missão: na espera da pesquisa, o Droid ensina a CONCORRÊNCIA (a pesquisa segue
      // rodando — de olho na barra de IA); quando a IA entrega, chama de volta; noutra hora, lembra de voltar
      if (passo.cond.tipo === "pesquisa" && !this.pesquisaDoTutorial) {
        const quer = lembreteDoTablet({ fechado: !this.labAberto && !this.tabletQuer, etapaLab: this.etapaLab, viuConcorrencia: g.viuConcorrencia });
        if (quer !== g.lembrete) {
          g.lembrete = quer; this.o.onDialogo?.(null); this.calarBalaoDroid();
          if (quer === "concorrencia") { g.viuConcorrencia = true; this.droidFala(FALA_CONCORRENCIA, true); }
          else if (quer === "entregou") { this.droidFala(FALA_IA_ENTREGOU, true); this.som.tocar("near-ping", this.eu.av.group.position, { dist: DISTANCIA.eu }); }
          else if (quer === "volte") this.droidFala(FALA_VOLTE_AO_TABLET, true);
        }
      }
    } else if (!this.jet.noAr) g.pisoY = eu.alt;
    // as falas: só com o Droid já ali (saiu do portal)
    if (this.droid?.h.fase() === "visivel") {
      g.falaT += dt;
      if (g.fala < passo.falas.length && g.falaT >= (g.fala === 0 ? 0.35 : tempoDeLeitura(passo.falas[g.fala - 1]!))) { this.droidFala(passo.falas[g.fala]!, g.fala === passo.falas.length - 1); g.fala++; g.falaT = 0; }
      else if (g.fala >= passo.falas.length && !g.ativo && g.falaT >= esperaDepoisDaUltima(passo)) { g.ativo = true; g.andou = 0; g.correu = 0; g.turbo = 0; g.motoAndou = 0; g.portal = false; if (passo.cond.tipo === "conversa") this.abrirConversa(); }
    }
    if (passo.cond.tipo === "fim") {   // o fim: ele se despede e some no portal
      if (g.fala >= passo.falas.length && g.falaT >= RITMO_FALA.fimSome && this.droid) { this.droid.h.sumir(); this.falas = this.falas.filter((f) => { if (f.ator === this.droid!.fala) { f.el.remove(); return false; } return true; }); this.encerrarGuia(); }
    } else if ((g.ativo || passo.livre) && cumpriu(passo.cond, this.ctxGuia(g, passo))) this.irProPasso(g.passo + 1);
    if (farol) {
      const pa = this.guia ? this.rot[this.guia.passo] : undefined, a = pa ? this.alvoDoPasso(pa) : null;
      farol.visible = !!a && !this.nascendo && this.naZaeon;
      if (a && farol.visible) { farol.position.set(a.x, (this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY) + 28, a.z); (farol.material as THREE.MeshBasicMaterial).opacity = 0.16 + 0.08 * Math.sin(performance.now() * 0.003); }
    }
  }
  /** o alvo do passo (mundo) */
  private alvoDoPasso(p: PassoGuia): { x: number; z: number; r: number } | null { return p.alvo; }
  /** o que a pessoa fez (pra `cumpriu`) */
  private ctxGuia(g: NonNullable<CyberEngine["guia"]>, passo: PassoGuia) {
    const eu = this.eu, a = this.alvoDoPasso(passo);
    return {
      nascendo: !!this.nascendo, andou: g.andou, correu: g.correu, noAr: this.jet.noAr ? this.jet.y - g.pisoY : 0, turbo: g.turbo,
      chegou: !!a && Math.hypot(eu.pos.x - a.x, eu.pos.z - a.z) <= a.r && !this.jet.noAr,
      conversaFeita: this.conversa?.etapa === "feita", tabletAberto: this.labAberto, pesquisaSalva: !!this.pesquisaDoTutorial, inventario: g.invT, droidNoSaber: g.saberT,
      entrega: (this.entregaVeredito === null ? null : this.entregaVeredito === "desistiu" ? "desistiu" : this.entregaVeredito.aceito ? "aceita" : "recusada") as CtxGuia["entrega"],
      naMoto: this.moto !== null, motoAndou: g.motoAndou, portal: g.portal,
    };
  }
  /** o DROID: aparece num mini portal do lado da pessoa (quando o tutorial começa — e de novo depois de um teleporte);
   *  vai PLANANDO do lado dela, ou NA FRENTE quando o passo é "vem comigo até…"; olha pra ela; some no portal no fim */
  /** o SHOW do lounge (lib/cyber/showLounge): a mandala, as serpentes, os tentáculos e a névoa com os trovões seguem o
   *  PONTO DA MÚSICA (o relógio do servidor: todo mundo vê o mesmo); os trovões de cada turno de 1 min caem no quadro
   *  certo (com o som pra quem está na Zaeon). No ritual, a mandala se recolhe e fica o OLHO. */
  private showT = -1;
  /** o SHOW DA NAVE (o ritual da nave, tecla K — lib/cyber/ritual `nave`): a mandala (menor), poucas nuvens e os trovões
   *  seguindo a nave do dono, no ritmo da MÚSICA DELA (o 2º canal do toca-discos) — pra todo mundo */
  private showNave: { group: THREE.Group; mandala: MandalaHandle; nevoa: TempestadeHandle; t: number } | null = null;
  private atualizarShowNave(dt: number, t: number) {
    void dt;
    const ligado = !!this.ritual?.nave, nave = ligado ? this.naveDoDono() : null;
    if (!nave) { if (this.showNave) { this.showNave.group.visible = false; this.showNave.nevoa.definir(0, false); this.showNave.t = -1; } return; }
    if (!this.showNave) {
      const group = new THREE.Group(); group.name = "show-nave"; this.cena.scene.add(group);
      const mandala = criarMandala({ low: this.o.low, estrela: this.cena.starTex, tam: 26 }); mandala.group.position.set(0, 30, 0); mandala.group.rotation.x = -Math.PI / 2 + 0.4; group.add(mandala.group);
      const nevoa = criarTempestade({ low: this.o.low, yBase: 16, yTopo: 36, raioMax: 36, alvoPonta: new THREE.Vector3(0, 28, 0), cor: new THREE.Color(0.2, 0.12, 0.3), semAbismo: true, densidade: 0.45, nuvens: this.o.low ? 16 : 30 });
      group.add(nevoa.group); group.traverse((n) => { n.userData.semLote = true; });
      this.showNave = { group, mandala, nevoa, t: -1 };
    }
    const sn = this.showNave; sn.group.visible = true; sn.group.position.copy(nave.position); sn.mandala.group.rotation.z = t * 0.05;
    const pos = this.musicaNave?.posicao() ?? null, tocando = !!this.musicaNave?.tocandoNaSala && !!pos, tf = tocando && pos ? pos.t : 0;
    const e = estadoDoShow(tf, tocando), batida = this.musicaNave?.nivel ?? 0;
    sn.mandala.definir({ ...e, nascimento: Math.max(e.nascimento, 0.6), area: Math.min(e.area, 1.6), serpentes: 0, tentaculos: 0 }, batida, t);   // (sem música: a mandala fica, parada no nascimento; as criaturas não cabem numa nave)
    sn.nevoa.definir(1, true); sn.nevoa.atualizar(t);
    if (tocando && sn.t >= 0 && tf > sn.t) for (const tr of trovoesEntre(sn.t, tf)) { sn.nevoa.raioAgora(undefined, tr.vel); if (!this.bordo) this.som.tocar("trovao", nave.position, { dist: DISTANCIA.raio, volume: 0.45 + 0.45 * tr.forca, taxa: 0.9 + 0.35 * tr.vel }); }
    sn.t = tocando ? tf : -1;
  }
  private atualizarShowLounge(dt: number) {
    void dt;
    if (!this.cidade) return;
    const pos = this.somLounge?.posicao() ?? null, tocando = !!this.somLounge?.tocandoNaSala && !!pos, t = tocando && pos ? pos.t : 0;
    const e = estadoDoShow(t, tocando);
    this.cidade.showLounge(e, this.ritualI, Math.max(this.ritualI, this.anunI));   // (no ritual a névoa do lounge é a fumaça do TOPO dele; o OLHO fica no centro — requisito do dono)
    if (tocando && this.showT >= 0 && t > this.showT) {
      for (const tr of trovoesEntre(this.showT, t)) {
        this.cidade.raioNoLounge(tr.vel);
        { const w = new THREE.Vector3(BURACO_NEGRO.x, BURACO_NEGRO.y, BURACO_NEGRO.z); if (this.cam.position.distanceTo(w) < 900) this.som.tocar("trovao", w, { dist: DISTANCIA.raio, volume: 0.5 + 0.5 * tr.forca, taxa: 0.85 + 0.35 * tr.vel }); }
      }
    }
    this.showT = tocando ? t : -1;
  }
  /** o RITUAL do dono (lib/cyber/ritual): a FUMAÇA E OS TROVÕES se formam no topo da capela, das salas de estudo, do
   *  lounge e do templo (o instante vem do servidor: todo mundo vê a mesma formação); os ANUNCIADORES são os 2 efeitos da
   *  música — a BALADA escura no lounge (flashes neon na batida) e a ESCADARIA ficando vermelha, com mais raios e fumaça
   *  na torre do templo. Não acaba sozinho: só pelo botão, e então tudo some DEVAGAR (`suavizarRitual`) */
  private atualizarRitual(dt: number, t: number) {
    const agora = Date.now() + this.ritualOffset, r = this.ritual, fase = faseDaTempestade(r, agora);
    this.ritualFase = fase;
    this.ritualI = suavizarRitual(this.ritualI, intensidadeDaTempestade(r, agora), dt);
    const raios = this.ritualI > 0.25 && fase !== "formando";   // (desligando: os raios seguem até a fumaça rarear)
    // os ANUNCIADORES: liga em ~2 s, desliga devagar
    const querAnun = r?.droids ? 1 : 0;
    this.anunI = querAnun > this.anunI ? Math.min(1, this.anunI + dt / 2) : suavizarRitual(this.anunI, 0, dt);
    const tocando = !!this.somLounge?.tocandoNaSala, nb = this.cidade?.batidasLounge() ?? 0, bateu = nb !== this.batidasVistas; this.batidasVistas = nb;
    // a ESCADARIA: vai ficando vermelha com a música (cada batida empurra mais um pouco); a torre do templo ganha fumaça e raios
    this.escadaV = passoDaEscadaria(this.escadaV, dt, tocando && this.anunI > 0.5, bateu);
    this.cidade?.escadaria(this.escadaV * this.anunI);
    this.cidade?.tempestade(this.ritualI, raios, this.anunI * fumacaDaTorre(this.escadaV));
    if (bateu && tocando && this.anunI > 0.5 && Math.random() < raioNaBatida(this.escadaV)) this.cidade?.raioNoTemplo();
    // a BALADA: o flash na batida (sem música, de tempos em tempos), decaindo rápido
    // o ESTOURO DE LUZ: acende de vez por um instante e apaga de novo (luzDoFlash)
    if (bateu && tocando) { this.flashEm = t; this.flashN++; }
    else if (!tocando && this.anunI > 0.5 && t >= this.proxFlash) { this.flashEm = t; this.flashN++; this.proxFlash = t + BALADA.semMusica[0] + Math.random() * (BALADA.semMusica[1] - BALADA.semMusica[0]); }
    this.flash = luzDoFlash(t - this.flashEm);
    // a NAVE do dono é invisível: só aparece chegando perto das NUVENS da capela do templo
    this.revelarNaves(r && fase !== "off" ? r : null, agora);
  }
  /** um TROVÃO (o som) de um raio em `em` (mundo): quem ouve é a câmera — chega depois do clarão (~340 m/s), longe some */
  private trovejar(em: THREE.Vector3) {
    if (!this.prontoDisparado || !this.som) return;
    const d = this.cam.position.distanceTo(em); if (d > 900) return;
    const p = em.clone(); setTimeout(() => this.som?.tocar("trovao", p, { dist: DISTANCIA.raio, volume: 1, taxa: 0.78 + Math.random() * 0.32 }), Math.min(2200, (d / 340) * 1000));
  }
  /** a BALADA (os anunciadores): por cima da cena, pra quem está DENTRO do lounge — o véu escuro que a batida abre (com a
   *  cor neon do flash) e os LASERS neon varrendo a pista (esses por cima do véu: brilham no escuro) */
  private desenharBalada(t: number) {
    const L = CIDADE.salas.lounge, c = this.cam.position, ilhaY = this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY;
    const dentro = salaEm({ x: c.x - CIDADE.centro.x, z: c.z - CIDADE.centro.z }, 6) === "lounge" && c.y > ilhaY + ALTURA_LOUNGE - 3 && c.y < ilhaY + ALTURA_LOUNGE + 70 ? 1 : 0;
    this.noLoungeCam += (dentro - this.noLoungeCam) * 0.08;   // (entrando/saindo do lounge: o escuro vem e vai em ~½ s)
    const liga = this.anunI * this.noLoungeCam, escuro = escuroDaBalada(liga, this.flash);
    if (liga < 0.01) return;
    if (!this.balada) {
      const veu = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
      const luz = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
      const cenaVeu = new THREE.Scene(); cenaVeu.add(veu, luz);
      const camVeu = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const neon = new THREE.Scene(), lasers = new THREE.Group(); neon.add(lasers);
      const w = mundo(L); lasers.position.set(w.x, 0, w.z); lasers.rotation.y = rotDaSala(L); if (espelhoDe(L)) lasers.scale.x = -1;
      const geo = new THREE.CylinderGeometry(0.06, 1.6, 1, 10, 1, true); geo.translate(0, -0.5, 0);   // a ponta no alto, abrindo pra baixo
      const feixes = Array.from({ length: this.o.low ? 6 : 10 }, (_, i) => { const f = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: corDoFlash(i), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); lasers.add(f); return f; });
      this.balada = { veu, luz, cenaVeu, camVeu, neon, lasers, feixes };
    }
    const B = this.balada, cor = new THREE.Color(corDoFlash(this.flashN));
    (B.veu.material as THREE.MeshBasicMaterial).color.setRGB(0, 0, 0);
    (B.veu.material as THREE.MeshBasicMaterial).opacity = escuro;
    // as LUZES ACESAS do estouro: a cor neon da batida somada por cima da cena (clareia tudo por um instante)
    const brilho = brilhoDaBalada(liga, this.flash);
    (B.luz.material as THREE.MeshBasicMaterial).color.setRGB(0.55 + 0.45 * cor.r, 0.55 + 0.45 * cor.g, 0.55 + 0.45 * cor.b);
    (B.luz.material as THREE.MeshBasicMaterial).opacity = brilho; B.luz.visible = brilho > 0.005;
    B.lasers.position.y = ilhaY + ALTURA_LOUNGE;
    const topo = DECK.h + 26, nF = B.feixes.length;
    B.feixes.forEach((f, i) => {
      const lado = i % 2 ? 1 : -1, a = t * (0.6 + 0.15 * (i % 3)) + i * 1.7 + this.flashN * 0.9;   // (a cada batida a varredura dá um salto)
      const ox = lado * (10 + (i % 3) * 5), oz = PISTA.z - 22, alvo = new THREE.Vector3(PISTA.x + Math.sin(a) * PISTA.larg * 0.45, DECK.h, PISTA.z + Math.cos(a * 1.3) * PISTA.prof * 0.45);
      const de = new THREE.Vector3(ox, topo, oz), dir = alvo.clone().sub(de), len = dir.length(); dir.normalize();
      f.position.copy(de); f.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir); f.scale.set(1, len, 1);
      const m = f.material as THREE.MeshBasicMaterial; m.color.setHex(corDoFlash(this.flashN + i)); m.opacity = liga * (0.12 + 0.55 * this.flash) * (i < nF ? 1 : 0);
    });
    this.R.render(B.cenaVeu, B.camVeu);
    this.R.render(B.neon, this.cam);
  }
  /** a NAVE do dono (a minha ou a dele, remota) é INVISÍVEL — só o formato e os propulsores; perto das nuvens da capela
   *  do templo (no ritual) ela se revela inteira (lib/cyber/ritual `revelacaoDaNave`) */
  private revelarNaves(r: Ritual | null, agora: number) {
    // o EVENTO (o dono escolhe, no perímetro das nuvens): o vento tira o véu — o som sai 1× quando o instante chega
    const k = revelacaoDaNave(r, agora);
    if (r && r.veu > 0 && this.veuTirado !== r.veu && agora - r.veu < 4000) { this.veuTirado = r.veu; const g = this.naveDoDono(); if (g) this.som.tocar(this.som.temSom("cyber-enter") ? "cyber-enter" : "rise", g.position, { dist: DISTANCIA.grande, volume: 1 }); }
    if (this.nave) this.nave.revelar(this.ehFundador(this.o.eu.id) ? k : 1);   // (a nave de quem não é o dono — a prévia — fica inteira)
    for (const [id, a] of this.remotos) if (a.nave) a.nave.revelar(this.ehFundador(id) ? k : 1);
  }
  private veuTirado = 0;
  /** a nave do dono (a minha, se eu sou ele; senão a dele, remota) */
  private naveDoDono(): THREE.Object3D | null { if (this.nave && this.euNoComando()) return this.nave.group; for (const [id, a] of this.remotos) if (a.nave && this.podeNave(id)) return a.nave.group; return null; }
  /** a nave do dono está no PERÍMETRO das nuvens da capela (dá pra tirar o véu)? — o painel do ritual pergunta */
  naveNoPerimetro(): boolean {
    const g = this.naveDoDono(); if (!g) return false;
    if (!this.centroDasNuvens) { const L = CIDADE.salas.lounge, t = mundo(daSala(L, TEMPLO.x, TEMPLO.z)); this.centroDasNuvens = new THREE.Vector3(t.x, CIDADE.pisoY + ALTURA_LOUNGE + TEMPLO.h + 75, t.z); }
    const c = this.centroDasNuvens, ilhaY = this.cidade ? this.cidade.ilha.position.y - CIDADE.pisoY : 0;
    return noPerimetro(this.ritual, Math.hypot(g.position.x - c.x, g.position.y - (c.y + ilhaY), g.position.z - c.z));
  }
  private atualizarAgentes(dt: number, t: number) {
    const d = this.droid; if (!d) return;
    const eu = this.eu, fase = d.h.fase(), passo = this.guia ? this.rot[this.guia.passo] : undefined;
    const guiando = (!!this.guia && !this.nascendo && !this.menu && passo?.cond.tipo !== "nascer" && !passo?.livre) || !!this.expulsando;   // livre (explorando): ele some
    const comigo = this.companheiro && !guiando && !this.menu;   // o companheiro (habilidade do G)
    // a SALA DO SABER: no fim do tutorial ele voa pra lá — e depois fica lá, esperando (só pra quem acabou o tutorial)
    const sp = mundo(SALA_DO_SABER_LOCAL), ySaber = (this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY) + ALTURA_LOUNGE + 5;
    const noSaber = this.droidNoSaber && !comigo && !this.guia && !this.menu && !this.expulsando;
    const quer = guiando || comigo || noSaber;
    // pra onde ele vai: do lado da pessoa — ou, num passo "vem comigo até…", ELE VAI: voa rumo ao alvo e, se a pessoa
    // ficar pra trás, para e espera por ela (virado pra ela)
    const a = passo && this.guia ? this.alvoDoPasso(passo) : null, altAlvo = eu.alt + (this.expulsando ? 5 : 2.3);   // expulsando: no meio da tela, encarando
    const lidera = !!a && this.naZaeon && !this.tunel && !this.expulsando;   // "vem comigo até…": ele VAI até lá e espera lá
    // NA FRENTE da pessoa, no campo de visão (a câmera olha por cima do ombro): ~5 m à frente, um pouco de lado pra não
    // tapar o personagem — é ali que ele nasce do portal, de frente pros nossos olhos
    const vx0 = -Math.sin(this.camAz), vz0 = -Math.cos(this.camAz);
    const deLado = passo?.cond.tipo === "conversa" && !this.expulsando;   // com a Zaeon falando, ele sai da frente (fica do lado)
    // o COMPANHEIRO nasce na frente (de frente pros nossos olhos) e depois fica por cima do ombro direito, um pouco atrás
    const seguindo = comigo && fase === "visivel";
    const alvo = this.expulsando ? { x: eu.pos.x + vx0 * 6, z: eu.pos.z + vz0 * 6 } : deLado ? { x: eu.pos.x + vx0 * 1.5 - vz0 * 4.2, z: eu.pos.z + vz0 * 1.5 + vx0 * 4.2 } : seguindo ? { x: eu.pos.x - vx0 * 0.6 - vz0 * 1.9, z: eu.pos.z - vz0 * 0.6 + vx0 * 1.9 } : { x: eu.pos.x + vx0 * 5.2 - vz0 * 1.2, z: eu.pos.z + vz0 * 5.2 + vx0 * 1.2 };
    if (quer && fase === "oculto") { if (noSaber) { d.pos.set(sp.x, 0, sp.z); d.alt = ySaber; } else { d.pos.set(alvo.x, 0, alvo.z); d.alt = altAlvo; } d.h.aparecer(); this.som.tocar(this.som.temSom("cyber-enter") ? "cyber-enter" : "rise", d.h.group.position, { dist: DISTANCIA.perto }); this.som.tocar("rise", d.h.group.position, { dist: DISTANCIA.perto }); }
    else if (!quer && (fase === "visivel" || fase === "entrando")) d.h.sumir();
    else if (fase === "visivel" && noSaber) {
      // VOA até a Sala do Saber (rápido, a câmera vai junto) e fica pairando lá
      const vx = sp.x - d.pos.x, vz = sp.z - d.pos.z, dd = Math.hypot(vx, vz);
      if (dd > 0.5) { const k = Math.min(dd, Math.min(70, 4 + dd * 0.8) * dt); d.pos.x += (vx / dd) * k; d.pos.z += (vz / dd) * k; }
      d.alt += (ySaber + Math.sin(t * 1.4) * 0.3 - d.alt) * Math.min(1, dt * 1.5);
    }
    else if (fase === "visivel") {
      const longe = Math.hypot(d.pos.x - eu.pos.x, d.pos.z - eu.pos.z);
      if (lidera && a) {
        // ele VAI: voa direto pro alvo (um pouco mais rápido que quem anda — dá pra ver ele indo e seguir) e, chegando,
        // fica PAIRANDO lá em cima do alvo, esperando a pessoa chegar
        const vx = a.x - d.pos.x, vz = a.z - d.pos.z, dd = Math.hypot(vx, vz);
        const voando = passo?.cond.tipo === "turbo" || passo?.id === "ir-teloes" || passo?.id === "moto";   // no VOO LONGO ele voa rápido, na frente
        if (dd > 0.6) { const v = Math.min(voando ? 26 : 9, 2 + dd * 0.6), k = Math.min(dd, v * dt); d.pos.x += (vx / dd) * k; d.pos.z += (vz / dd) * k; }
        const yAlvo = (this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY) + 3.2;
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
    if (!this.ehFundador(this.o.eu.id) && this.cidade) { this.irParaNaveCw(this.o.regiao ?? REGIAO_PADRAO); this.o.onAviso?.("Você caiu no vazio — de volta à nave."); return; }
    const lay = this.layouts.get(this.o.eu.id);
    const naZaeon = lay?.nivel === "ceu" && !!this.cidade;
    if (naZaeon) this.irParaNo("zaeon");
    else { const sp = spawnDaBase(lay); this.irParaNo("praca", { ...sp, rumo: Math.atan2(PRACA.x - sp.x, PRACA.z - sp.z) }); }
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
    if (!this.nave || this.pilotando || this.moto !== null || !this.bordo || acaoNaNave(this.bordo, true) !== "pilotar" || !this.euNoComando()) return;
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
    if (this.euNoComando()) this.o.onNaveParada?.({ x: n.x, y: n.y, z: n.z, yaw: n.yaw });
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
  /** a VIAGEM pelo PORTAL até dentro da nave (tecla M — só o dono): abre um portal aqui, a pessoa é sugada; abre outro
   *  dentro da nave e ela sai dele — o mesmo efeito do portal do Droid (components/cyber/PortalViagem) */
  private viagemNave: { fase: "saindo" | "chegando"; t: number; trocou: boolean; para: "nave" | "saber" } | null = null;
  private portais: [PortalViagemHandle, PortalViagemHandle] | null = null;
  portalPraNave() {
    if (!this.podeNave(this.o.eu.id)) { this.o.onAviso?.("Só o dono convoca a nave."); return; }
    if (this.viagemNave) return;
    if (this.bordo) { this.o.onAviso?.("Você já está dentro da nave."); return; }
    if (this.pilotando || this.moto !== null || this.nascendo || this.tunel || this.tabletQuer || this.labAberto) { this.o.onAviso?.("Pare (a pé) pra abrir o portal."); return; }
    if (!this.poseNave()) { this.o.onAviso?.("A nave não está no mundo agora."); return; }
    if (!this.portais) { this.portais = [criarPortalViagem({ low: this.o.low }), criarPortalViagem({ low: this.o.low })]; for (const p of this.portais) this.cena.scene.add(p.group); }
    const rumo = Math.atan2(this.cam.position.x - this.eu.pos.x, this.cam.position.z - this.eu.pos.z);   // o portal de frente pra câmera
    this.portais[0].abrir("entra", new THREE.Vector3(this.eu.pos.x, this.eu.alt, this.eu.pos.z), rumo);
    this.viagemNave = { fase: "saindo", t: 0, trocou: false, para: "nave" }; this.alvo = null; this.alvoDepois = null; this.soltarTeclas();
    this.som.tocar(this.som.temSom("cyber-enter") ? "cyber-enter" : "rise", this.eu.av.group.position, { dist: DISTANCIA.eu });
  }
  /** o PORTAL do tutorial: o Droid leva a pessoa (e vai junto) até a FRENTE da Sala do Saber — o mesmo efeito do M */
  private portalPraSaber() {
    if (this.viagemNave || !this.cidade) return;
    if (!this.portais) { this.portais = [criarPortalViagem({ low: this.o.low }), criarPortalViagem({ low: this.o.low })]; for (const p of this.portais) this.cena.scene.add(p.group); }
    const rumo = Math.atan2(this.cam.position.x - this.eu.pos.x, this.cam.position.z - this.eu.pos.z);
    this.portais[0].abrir("entra", new THREE.Vector3(this.eu.pos.x, this.eu.alt, this.eu.pos.z), rumo);
    this.viagemNave = { fase: "saindo", t: 0, trocou: false, para: "saber" }; this.alvo = null; this.alvoDepois = null; this.soltarTeclas();
    this.som.tocar(this.som.temSom("cyber-enter") ? "cyber-enter" : "rise", this.eu.av.group.position, { dist: DISTANCIA.eu });
  }
  /** chega na frente da Sala do Saber, de frente pro Relicário; o Droid aparece do lado */
  private chegarNoSaber() {
    const c = mundo(daSala(CIDADE.salas.biblioteca, FRENTE_DO_SABER_SALA.x, FRENTE_DO_SABER_SALA.z)), rl = relicarioMundo(), rumo = Math.atan2(rl.x - c.x, rl.z - c.z);
    this.viagem = null; this.tunel = null; this.pilotando = false; this.noTopo = false; this.alvo = null; this.alvoDepois = null; this.sitT = 0;
    this.jet.noAr = false; this.jetV = { x: 0, z: 0 }; this.sobreNave = false; this.ilhota = null; this.plat = null; this.bordo = null;
    this.altoEm = "ceu"; this.yNav = CIDADE.pisoY; this.portalArmado = false;
    this.eu.pos.set(c.x, 0, c.z); this.eu.facing = rumo; this.camAz = rumo + Math.PI;
    const y = (this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY) + alturaNaCidade(c); this.eu.alt = y; this.camT.set(c.x, y + 1.2, c.z);
    const d = this.droid; if (d) { d.pos.set(c.x - Math.cos(rumo) * 2.2 + Math.sin(rumo) * 1.5, 0, c.z + Math.sin(rumo) * 2.2 + Math.cos(rumo) * 1.5); d.alt = y + 2.3; }
    if (this.guia) this.guia.portal = true;
  }
  private atualizarViagemNave(dt: number, t: number) {
    if (this.portais) for (const p of this.portais) p.atualizar(dt, t);
    const v = this.viagemNave; if (!v) return;
    v.t += dt;
    if (v.fase === "saindo") {
      if (v.t >= 0.75) this.eu.av.group.visible = false;   // sugado pelo portal
      if (v.t >= 1.05) {
        if (v.para === "saber") this.chegarNoSaber(); else this.entrarNaNave();
        if (v.para === "nave" && !this.bordo) { this.eu.av.group.visible = true; this.viagemNave = null; return; }   // (a nave sumiu no meio do caminho)
        const ilhaY = this.eu.alt, rumo = Math.atan2(this.cam.position.x - this.eu.pos.x, this.cam.position.z - this.eu.pos.z);
        this.portais![1].abrir("sai", new THREE.Vector3(this.eu.pos.x, ilhaY, this.eu.pos.z), rumo);
        this.camT.set(this.eu.pos.x, this.eu.alt + 1.2, this.eu.pos.z);   // a câmera vai junto (sem atravessar o mapa)
        this.som.tocar(this.som.temSom("cyber-enter") ? "cyber-enter" : "rise", this.eu.av.group.position, { dist: DISTANCIA.eu });
        v.fase = "chegando"; v.t = 0;
      }
    } else {
      if (v.t >= 0.6) this.eu.av.group.visible = true;   // sai do portal, dentro da nave
      if (v.t >= 1.7) this.viagemNave = null;
    }
  }
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
    if (p.y < CHAO + 1.5) return naPraca(paraMundo(p, NAVE_QG.saida));   // pousada na altura da praça: só se a rampa dá NELA (fora é o vazio)
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
    if (alvo && !this.podeMoto()) { this.o.onAviso?.(AVISO_MOTO_TRAVADA); return false; }   // (as motos se liberam com a entrega ao Droid)
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
  private yDoLote(l: Lote) { return l.ceu ? (this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY) + l.alt : CHAO + l.alt; }   // (a garagem: lá em cima, na plataforma)
  /** a altura da moto PARADA numa vaga: em cima da plataforma de lançamento (no chão, ou no piso da Zaeon, que flutua) */
  private yDaVaga(v: { ceu: boolean; alt?: number }) { return (v.ceu ? (this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY) + (v.alt ?? 0) : CHAO + (v.alt ?? 0)) + PLATAFORMA_MOTO.altura; }
  /** DESCE da moto (pousada): fica ao lado dela e a moto FICA ALI estacionada (é um veículo — é minha até eu estacionar
   *  outra ou sair); os outros veem pela minha presença. No piso da Zaeon → anda na ilha; noutro alto → cai dali */
  /** dá pra descer da moto aqui? Pousada num piso de verdade — na altura da praça, só EM CIMA dela (fora é o vazio) */
  private desceDaMotoAqui() { const m = this.motoEst; return this.moto !== null && this.motoPousado && (m.y > CHAO + 0.5 || naPraca(m)); }
  desmontar() {
    if (this.moto === null || !this.desceDaMotoAqui()) return;
    this.sairCorrida(); this.sairCorridaCk();
    const m = this.motoEst, lx = Math.cos(m.yaw), lz = -Math.sin(m.yaw);   // a esquerda de quem pilota
    this.motoLargada = { s: this.moto, x: m.x, y: m.y, z: m.z, yaw: m.yaw };
    this.soltarInst("eu:p"); this.renomearInst("eu:r", "eu:p");   // a MESMA moto fica ali (a estacionada antiga some)
    this.moto = null; this.motoDe = undefined; this.autoPouso = false; this.voY.subir = false; this.voY.descer = false;
    this.eu.pos.set(m.x + lx * 1.6, 0, m.z + lz * 1.6); this.eu.facing = m.yaw;
    // pousada em qualquer piso da Zaeon (plataforma central, escada, lounge, palco, cabine do DJ) → anda ali
    if (naIlhaPrincipal(this.eu.pos) && Math.abs(m.y - (CIDADE.pisoY + alturaNaCidade(this.eu.pos))) < 1.5) { this.altoEm = "ceu"; this.yNav = CIDADE.pisoY; this.portalArmado = false; }
    else if (m.y > CHAO + 0.5) { this.eu.alt = m.y; this.cairDaqui(); }
  }
  // ───────────── o CARRO VOADOR ─────────────
  /** o carro PARADO mais perto, a pé (o F entra) — da praça ou de um estacionamento da Zaeon */
  private carroProximo(): CarroFrota | null {
    if ((this.carro && this.carro.fase !== "parado") || this.moto !== null || this.pilotando || this.jet.noAr || this.bordo) return null;
    let melhor: CarroFrota | null = null, dm = 4.2;   // (o carro tem ~6 m: de qualquer lado dele)
    for (const c of this.carros) {
      if (c.fase !== "parado" || c.posse?.dirige || Math.abs(this.eu.alt - c.est.y) > 2) continue;   // (alguém dirigindo: não)
      const d = Math.hypot(this.eu.pos.x - c.est.x, this.eu.pos.z - c.est.z); if (d < dm) { dm = d; melhor = c; }
    }
    return melhor;
  }
  private carroPerto() { return this.carroProximo() !== null; }
  /** pousado num PISO de verdade (dá pra descer ali): a praça ou o piso da Zaeon */
  private carroPodeSair() {
    const c = this.carro!; if (!c.pousado) return false;
    const p = { x: c.est.x, z: c.est.z };
    return naPraca(p) || (naIlhaPrincipal(p) && Math.abs(c.est.y - (CIDADE.pisoY + alturaNaCidade(p))) < 1.5);
  }
  /** ENTRAR: ele vai pro lado da porta do motorista, a cabine abre (portas + vidro em cascata, com som) */
  entrarNoCarro() {
    const c = this.carroProximo(); if (!c) return;
    this.carro = c; if (this.carroLargado?.c === c.i) this.carroLargado = null;   // (o meu estacionado: estou com ele de novo)
    const ex = Math.cos(c.est.yaw), ez = -Math.sin(c.est.yaw);   // (a esquerda do carro: a porta do motorista)
    this.eu.pos.set(c.est.x + ex * 2.1, 0, c.est.z + ez * 2.1); this.eu.facing = Math.atan2(-ex, -ez);
    c.fase = "entrando"; this.alvo = null; this.alvoDepois = null; this.jetV = { x: 0, z: 0 };
  }
  /** SAIR: pousado, a cabine abre, ele desce do lado do motorista e a cabine fecha (o carro fica ali) */
  sairDoCarro() { const c = this.carro; if (!c || c.fase !== "dirigindo" || !this.carroPodeSair()) return; c.fase = "abrindo"; this.voY.subir = this.voY.descer = false; this.autoPouso = false; this.o.onAviso?.("Saindo do carro…"); this.som.tocar("carro-desliga", null, { dist: DISTANCIA.naveLocal, seguir: c.h.group }); }
  /** o avatar SENTADO no carro: o grupo no banco, as mãos no manche e os pés no assoalho (a IK do Montado) */
  private naCarro(av: AvatarLuzHandle, c: CarroFrota | null | undefined = this.carro): Montado | null {
    if (!c) return null;
    const h = c.h; h.group.updateWorldMatrix(true, true);
    h.assento.getWorldPosition(av.group.position); av.olharPara(c.est.yaw);
    const v = this.montadoTmp, p = h.pontos;
    p.maoE.getWorldPosition(v.maoE); p.maoD.getWorldPosition(v.maoD); p.peE.getWorldPosition(v.peE); p.peD.getWorldPosition(v.peD);
    return { w: 1, ...v };
  }
  /** o CARRO a cada quadro: nasce estacionado na praça; a cabine (as fases, com o som de cada porta e vidro), o motor
   *  (liga/desliga, os loops misturados pela velocidade) e o corpo dele no mundo */
  private passoCarro(t: number, dt: number) {
    if (!this.carros.length) {
      const ilhaY = this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY;
      for (const v of vagasDeCarro()) {
        const h = criarCarroHex({ low: this.o.low, cor: v.cor }); this.cena.scene.add(h.group);
        const c: CarroFrota = { h, vaga: v, est: motoParada(v.x, pisoDaVaga(v, CHAO, ilhaY), v.z, v.rumo), pousado: true, fase: "parado", k: 0, ligado: 0, potencia: 0, acel: 0, velAnt: 0, boost: false, loops: null, somPerto: false, i: this.carros.length, posse: null };
        h.group.position.set(c.est.x, c.est.y + CARRO_PAIRA, c.est.z); h.group.rotation.y = c.est.yaw; h.atualizar(t, 0, { vel: 0, ligado: false });
        this.carros.push(c);
      }
      for (const l of CARROS_NA_ZAEON ? LOTES_CARRO : []) {   // (os carros da Zaeon saíram: sem o piso do estacionamento também)
        const p = criarPisoCarros(l, { low: this.o.low }), cen = mundo(vagaDoLote(l, (l.filas - 1) / 2, (l.porFila - 1) / 2));
        p.group.position.set(cen.x, ilhaY, cen.z); p.group.rotation.y = vagaDoLote(l, 0, 0).rumo; this.cena.scene.add(p.group); this.pisosCarros.push(p);
      }
    }
    for (const p of this.pisosCarros) p.atualizar(t);
    // ONLINE (pela presença, como as motos): quem está com cada carro — outra pessoa dirigindo (o carro vai com ela) ou o
    // que alguém deixou estacionado fora da vaga; alguém pegou o MEU estacionado → paro de anunciar
    // (eu entro na MESMA conta — todo cliente decide igual quem fica com um carro disputado)
    const euId = this.o.eu.id, meuDirigindo = this.carro && this.carro.fase !== "parado" ? { c: this.carro.i, y: this.carro.est.y, yaw: this.carro.est.yaw } : null;
    const posse = posseDosCarros([{ id: euId, carro: meuDirigindo, carroLargado: this.carroLargado }, ...[...this.remotos.values()].map((a) => ({ id: a.id, carro: a.carro, carroLargado: a.carroLargado }))]);
    if (this.carroLargado) { const p = posse.get(this.carroLargado.c); if (p && p.dono !== euId && p.dirige) this.carroLargado = null; }
    const cam = this.cam.position;
    for (const c of this.carros) {
      const ativo = c === this.carro && (c.fase !== "parado" || c.ligado > 0.01);
      if (!ativo) { const p = posse.get(c.i) ?? null; this.carroDeQuem(c, p && p.dono === euId && p.dirige ? null : p, t, dt); }
      // os PARADOS longe: nem se desenham; os parados perto: só o brilho (atualizar), sem som
      const d = Math.hypot(c.est.x - cam.x, c.est.z - cam.z), deOutro = !!c.posse?.dirige;
      c.h.group.visible = ativo || ((deOutro || d < CARRO_VE) && this.noMeuNivel(c.est, c.est.y));
      if (ativo) this.passoDoCarro(c, t, dt);
      else if (!deOutro) { if (c.loops) { for (const n of LOOPS_CARRO) this.som.soltarLoop(c.loops[n]); c.loops = null; } if (c.h.group.visible && d < CARRO_ANIMA) c.h.atualizar(t, dt, { vel: 0, ligado: false }); }
    }
    if (this.carro && this.carro.fase === "parado" && this.carro.ligado <= 0.01) this.carro = null;   // (estacionou: nenhum é o da vez)
  }
  /** um carro que NÃO é o meu em uso: segue quem está com ele online (dirigindo: a pose da pessoa, motor ligado e o
   *  som; estacionado por alguém — ou por mim — fora da vaga: fica lá) ou volta pra VAGA */
  private carroDeQuem(c: CarroFrota, p: PosseCarro | null, t: number, dt: number) {
    c.posse = p;
    if (p?.dirige) {
      const a = this.remotos.get(p.dono); if (!a) return;
      const vx = dt > 0 ? (a.pos.x - c.est.x) / dt : 0, vz = dt > 0 ? (a.pos.z - c.est.z) / dt : 0, vel = Math.min(80, Math.hypot(vx, vz));
      c.est = { ...c.est, x: a.pos.x, y: p.y, z: a.pos.z, yaw: p.yaw }; c.fase = "parado"; c.k = 0;
      c.h.group.position.set(c.est.x, c.est.y + CARRO_PAIRA, c.est.z); c.h.group.rotation.y = c.est.yaw; c.h.abrir(0);
      c.ligado += (1 - c.ligado) * Math.min(1, dt * 2.5); c.h.atualizar(t, dt, { vel, ligado: true });
      // o MOTOR dele (os mesmos loops do meu, com o alcance de um carro passando)
      if (!c.loops) { const h = c.h; c.loops = Object.fromEntries(LOOPS_CARRO.map((n) => [n, this.som.loop(n, h.group, { dist: DISTANCIA.padrao })])) as Record<(typeof LOOPS_CARRO)[number], LoopSom>; }
      if (dt > 0) { c.acel += (Math.max(-1, Math.min(1, (vel - c.velAnt) / dt / 8)) - c.acel) * Math.min(1, dt * 4); c.velAnt = vel; }
      const mx = mixDoCarro({ ligado: c.ligado, vel, potencia: Math.min(1, vel / 30), acel: c.acel });
      for (const n of LOOPS_CARRO) { this.som.volumeLoop(c.loops[n], mx[n].vol); this.som.taxaLoop(c.loops[n], mx[n].taxa); }
      return;
    }
    c.ligado = 0;
    const m = p ? p.m : null;   // (o meu estacionado também vem pela posse)
    const ilhaY = this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY;
    const alvo = m ? { x: m.x, y: m.y, z: m.z, yaw: m.yaw } : { x: c.vaga.x, y: pisoDaVaga(c.vaga, CHAO, ilhaY), z: c.vaga.z, yaw: c.vaga.rumo };
    if (Math.abs(alvo.x - c.est.x) + Math.abs(alvo.z - c.est.z) + Math.abs(alvo.y - c.est.y) + Math.abs(alvo.yaw - c.est.yaw) > 0.01 || c.est.vx || c.est.vz) {
      c.est = motoParada(alvo.x, alvo.y, alvo.z, alvo.yaw); c.pousado = true;
      c.h.group.position.set(c.est.x, c.est.y + CARRO_PAIRA, c.est.z); c.h.group.rotation.y = c.est.yaw; c.h.abrir(0); c.k = 0;
    }
  }
  /** o carro EM USO a cada quadro: a cabine (as fases, com o som de cada porta e vidro), o motor (liga/desliga, os loops
   *  misturados pela velocidade) e o corpo dele no mundo */
  private passoDoCarro(c: CarroFrota, t: number, dt: number) {
    if (!c.loops) { const h = c.h; c.loops = Object.fromEntries(LOOPS_CARRO.map((n) => [n, this.som.loop(n, h.group, { dist: DISTANCIA.padrao })])) as Record<(typeof LOOPS_CARRO)[number], LoopSom>; c.somPerto = false; }
    const loops = c.loops, kAnt = c.k;
    if (c.fase === "entrando" || c.fase === "abrindo") c.k = Math.min(1, c.k + dt / CARRO_CABINE);
    if (c.fase === "fechando" || c.fase === "saindo") c.k = Math.max(0, c.k - dt / CARRO_CABINE);
    if (c.fase === "entrando" && c.k >= 1) { c.fase = "fechando"; this.sitT = 0; }   // (sentou: a cabine fecha)
    else if (c.fase === "fechando" && c.k <= 0) { c.fase = "dirigindo"; this.altoEm = null; this.yNav = 0; this.plat = null; this.ilhota = null;   // (dirigindo, o nível é o do carro — como na moto)
      c.pousado = true; this.camAz = c.est.yaw + Math.PI; this.camSegueEm = 0; this.som.tocar("carro-liga", null, { dist: DISTANCIA.naveLocal, seguir: c.h.group }); this.o.onAviso?.("Carro ligado · W acelera · Espaço sobe · Q desce · P pousa · F (pousado) sai"); }
    else if (c.fase === "abrindo" && c.k >= 1) {   // desceu: do lado do motorista
      const ex = Math.cos(c.est.yaw), ez = -Math.sin(c.est.yaw);
      this.eu.pos.set(c.est.x + ex * 2.1, 0, c.est.z + ez * 2.1); this.eu.facing = c.est.yaw; c.fase = "saindo";
      // ficou fora da vaga: os outros o veem AQUI (presença `carroLargado`); na vaga dele, nada a anunciar
      this.carroLargado = Math.hypot(c.est.x - c.vaga.x, c.est.z - c.vaga.z) > 1.5 ? { c: c.i, x: Math.round(c.est.x * 100) / 100, y: Math.round(c.est.y * 100) / 100, z: Math.round(c.est.z * 100) / 100, yaw: c.est.yaw } : null;
      // pousado no piso da Zaeon → anda na ilha (como quem desce da moto lá)
      if (naIlhaPrincipal(this.eu.pos) && Math.abs(c.est.y - (CIDADE.pisoY + alturaNaCidade(this.eu.pos))) < 1.5) { this.altoEm = "ceu"; this.yNav = CIDADE.pisoY; this.portalArmado = false; }
    } else if (c.fase === "saindo" && c.k <= 0) c.fase = "parado";
    // DENTRO dele (desde que entra até sair): o som é o do MEU veículo — alcance de quem pilota (como a minha moto), senão
    // a câmera a ~7 m atrás já cortava quase tudo; de fora, o alcance normal de um carro passando
    const dentro = c.fase !== "parado", dist = dentro ? DISTANCIA.naveLocal : DISTANCIA.padrao;
    if (dentro !== c.somPerto) { c.somPerto = dentro; for (const n of LOOPS_CARRO) this.som.distanciaLoop(loops[n], dist); }
    for (const n of sonsDaCabine(kAnt, c.k, c.h.nVidros)) this.som.tocar(n, null, { dist, seguir: c.h.group, taxa: 0.96 + Math.random() * 0.08 });
    // (a cabine abrindo/fechando: o motor DESLIGADO — só as portas e os vidros soam)
    const ligado = c.fase === "dirigindo" ? 1 : 0; c.ligado += (ligado - c.ligado) * Math.min(1, dt * 2.5);
    const vel = Math.hypot(c.est.vx, c.est.vz);
    if (dt > 0) { c.acel += (Math.max(-1, Math.min(1, (vel - c.velAnt) / dt / 8)) - c.acel) * Math.min(1, dt * 4); c.velAnt = vel; }   // (o CANTO: acelerando/desacelerando)
    const mx = mixDoCarro({ ligado: c.ligado, vel, potencia: Math.min(1, c.potencia), acel: c.acel });
    for (const n of LOOPS_CARRO) { this.som.volumeLoop(loops[n], mx[n].vol); this.som.taxaLoop(loops[n], mx[n].taxa); }
    c.h.group.position.set(c.est.x, c.est.y + CARRO_PAIRA, c.est.z); c.h.group.rotation.y = c.est.yaw;
    c.h.abrir(c.k); c.h.atualizar(t, dt, { vel, ligado: c.ligado > 0.3 });
  }
  /** o dono manda onde a nave dele está estacionada (presença `naveParada`) — sem hangar, sempre que não está pilotando */
  private naveForaDoHangar() { return !!this.nave && this.euNoComando(); }   // sem hangar: a nave do dono está sempre "parada em algum lugar"
  /** (pra quem NÃO é o dono) o dono está online com a nave → a minha cópia some (só existe uma nave) */
  private naveDoDonoFora() { return false; }   // (só o dono pilota: não há outro piloto com a nave fora)
  // ───────────── áudio ─────────────
  /** loops fixos do mundo + destrave. O gesto (o "Conectar" ao cyberespaço, ou o 1º clique/toque/tecla) só DESTRAVA: o som do
   *  cyberespaço só liga ao ENTRAR de fato na cena 3D (fora do menu) — na landing/menu, nada do cyberespaço toca. */
  private montarSom() {
    const s = this.som;
    this.somLoops.leito = s.loop("space-bed", null);
    const bn = new THREE.Object3D(); bn.position.set(BURACO_NEGRO.x, BURACO_NEGRO.y, BURACO_NEGRO.z); this.cena.scene.add(bn);
    s.volumeLoop(s.loop("blackhole-hum", bn, { dist: DISTANCIA.grande }), 1);
    this.somLoops.jet = this.loopsDoJato(this.eu.av.group, DISTANCIA.eu);   // contínuo enquanto se segura o ESPAÇO
    // o MEU assobio (o loop "fio-puxa": legado dos fios de energia — sem viagem pela escada, fica mudo)
    // (o zumbido dos postes dos fios de energia saiu com eles: as escadas agora são de pedra)
    this.somLoops.fio = s.loop("fio-puxa", this.eu.av.group, { dist: DISTANCIA.eu });
    // a MÚSICA AMBIENTE dos espaços de convivência: sai das caixas de som discretas de cada sala (lib/cyber/ambiente)
    if (!NIVEIS_SEPARADOS) for (const c of this.cidade?.caixasAmbiente ?? []) if (c.sala === "biblioteca" || c.sala === "jardim") s.volumeLoop(s.loop(`ambiente-${c.sala}`, c.obj, { dist: DISTANCIA.ambiente, volume: 0.5 }), 1);
    // os DROIDS das estações da Terra: maquinário flutuando (lib/cyber/somDroid) — o líder mais grave e mais alto
    for (const em of this.cidade?.somDroids ?? []) { const l = s.loop("droid-maquina", em.obj, { dist: DISTANCIA.droid, volume: em.lider ? 1 : 0.55 }); s.volumeLoop(l, 1); s.taxaLoop(l, em.lider ? 0.82 : 1.18); this.somDroids.push({ em, l }); }
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
    for (const d of this.somDroids) if (d.em.lider) s.taxaLoop(d.l, d.em.voando ? 1.08 : 0.82, 1.5);   // o líder voando de uma tela pra outra: o motor acelera
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
      s.taxaLoop(this.somLoops.naveVoo, 1 + 0.45 * this.turboNave, 3);   // em turbo, o motor sobe de tom
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
    // dentro de um LOUNGE ESTUDANTIL (paredes sólidas): o som de fora chega ABAFADO
    { const y0 = this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY, dentro = this.noCeu && this.nivel === "lounge" && !this.jet.noAr && dentroDoEstudo(this.eu.pos, this.eu.alt - y0);
      s.abafar(dentro ? 1 : 0); this.noAndarDeCima = dentro && this.eu.alt - y0 - ALTURA_LOUNGE > ESTUDO.h + 2; }
    // a TEMPESTADE do campus de TI: o estalo de cada raio no difusor que ele acertou (perto, alto; longe, some)
    if (this.cidade && this.nivel === "lounge") for (const r of this.cidade.raiosCampus()) { const p = new THREE.Vector3(r.x, r.y, r.z); if (p.distanceToSquared(this.eu.pos.clone().setY(this.eu.alt)) < 90 * 90) s.tocar("raio", p, { dist: { ref: 8, max: 75, rolloff: 1, modelo: "linear" }, volume: 0.22, taxa: 1.1 + Math.random() * 0.4 }); }
    s.atualizar(dt);
  }
  /** está num andar de CIMA de um lounge estudantil (os outros precisam da altura: pela posição, seria o térreo) */
  private noAndarDeCima = false;
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
  setSomLounge(som: SomLounge | null, offsetMs = 0) { this.somLoungeAgora = { som, offsetMs }; this.somLounge?.aplicar(som, offsetMs); }
  /** a música da NAVE (o PC "som da nave"): sai da própria nave do dono — a minha, pilotando ou parada, ou a dele, remota */
  setSomNave(som: SomLounge | null, offsetMs = 0) {
    this.musicaNavePendente = { som, offset: offsetMs };
    if (!this.musicaNave) { const fonte = this.fonteDaNave(); if (fonte && this.o.urlMusica) this.musicaNave = criarSomLounge({ audio: this.som, caixas: [fonte], urlDe: this.o.urlMusica }); }
    this.musicaNave?.aplicar(som, offsetMs);
  }
  /** de onde a música da nave sai: a nave do dono (a minha, se eu sou ele; senão a dele, remota) */
  private fonteDaNave(): THREE.Object3D | null {
    if (this.nave && this.euNoComando()) return this.nave.group;
    for (const [id, a] of this.remotos) if (a.nave && this.podeNave(id)) return a.nave.group;
    return null;
  }
  /** o RITUAL da chegada do dono mudou (a sala): a tempestade no templo e os anunciadores */
  setRitual(r: Ritual | null, offsetMs = 0) { this.ritual = r && !ritualDesligado(r) ? r : null; this.ritualOffset = offsetMs; }
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
    // os CARROS parados (ou com alguém entrando/saindo) perto: três círculos ao longo do comprimento de cada um
    if (!this.noCarro()) for (const c of this.carros) if (Math.abs(c.est.y - this.eu.alt) < 2.5 && Math.abs(c.est.x - this.eu.pos.x) < 12 && Math.abs(c.est.z - this.eu.pos.z) < 12) for (const d of [1.4, 0, -1.5]) out.push({ x: c.est.x + Math.sin(c.est.yaw) * d, z: c.est.z + Math.cos(c.est.yaw) * d, r: 1.05 });
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
    const ps = mn ? pilaresDoMarco({ x: mn.x, z: mn.z, chaoR: mn.nav.chaoR, altura: (b ?? CHAO) + z.poi.altura + this.boia(z), escala: z.poi.escala ?? 1, cupula: !!z.topo }) : [];
    return b === undefined ? ps : ps.map((p) => ({ ...p, base: b - 1 }));   // apoiado no piso da Zaeon: sólido só dali pra cima
  }
  /** sólidos pra nave: os marcos andáveis como cilindros (quem vem de cima pousa no topo) */
  private solidosDeVoo(): Pilar[] { return [...this.solidosCidade, ...this.marcosNav().flatMap(({ lm }) => this.pilaresZaeon(lm)), ...(this.solana ? pilaresDasPlataformas() : []), ...this.pilaresDasIlhotas(), ...this.pilaresDaNaveQG()]; }
  /** a nave-QG parada é sólida pra quem voa (moto, a nave dos outros): pousa-se no dorso dela */
  private pilaresDaNaveQG(): Pilar[] { if (this.pilotando) return []; const p = this.poseNave(); return p ? [{ x: p.x, z: p.z, r: NAVE_QG.raio, topo: p.y + 2.2 * ESCALA_NAVE_V, base: p.y + 0.5 }] : []; }

  // ───────────── marcos / dono ─────────────
  /** o marco com topo de acesso "dono" (Zaeon) */
  private zaeon(): LandmarkHandle | undefined { return this.lms.find((l) => l.poi.acesso === "dono" && l.topo); }
  /** fundador = marcado pelo SERVIDOR (e só faz sentido se a Zaeon está na cena) */
  private ehFundador(id: string) { return !!this.pessoas.get(id)?.fundador && !!this.zaeon(); }
  /** pilota a nave-QG: o dono ou a TRIPULAÇÃO (o servidor marcou `nave`) */
  /** quem pilota a nave-QG: SÓ o dono (o servidor manda `nave` — lib/lounge3d/corposDeUsuario `pilotaANave`; a tripulação acabou) */
  private podeNave(id: string) { const p = this.pessoas.get(id); return !!p?.nave && !!this.zaeon(); }
  /** EU estou no comando da nave: o dono sempre; a tripulação quando nenhum outro piloto está online com ela (só existe
   *  uma nave — com o dono online, a tripulação embarca na dele) */
  private euNoComando() { return this.podeNave(this.o.eu.id); }
  /** pose do eixo do topo (centro + giro atual do marco) e a altura do topo no mundo */
  private eixoTopo(): LayoutBase | null { const z = this.zaeon(); return z ? { x: z.poi.x, z: z.poi.z, rot: z.group.rotation.y } : null; }
  private escalaZaeon() { return this.zaeon()?.poi.escala ?? 1; }
  private alturaTopo() { const z = this.zaeon(); return z && z.topo ? z.topo.getWorldPosition(this.tmp).y + 0.13 * this.escalaZaeon() : 0; }
  private tmp = new THREE.Vector3();
  /** quanto o marco está "boiando" agora (somado a quem está na plataforma) */
  private boia(lm: LandmarkHandle | undefined) { return lm ? lm.group.position.y - (lm.poi.base ?? CHAO) - lm.poi.altura : 0; }
  private marcosNav(): { lm: LandmarkHandle; mn: MarcoNav }[] { return this.lms.flatMap((lm) => { const mn = marcoNav(lm.poi); return mn ? [{ lm, mn }] : []; }); }
  /** altura do chão em (x,z) na PRAÇA considerando os marcos andáveis dela (sem estado — remotos; quem está noutro
   *  lugar manda a altura na presença) */
  private alturaChao(p: { x: number; z: number }) {
    let y = CHAO;   // (o piso da praça — lib/cyber/praca)
    for (const { lm, mn } of this.marcosNav()) { if (!naPracaPOI(lm.poi)) continue; const h0 = alturaEm(mn, p), h = (lm.poi.base ?? CHAO) + h0; if (h > y) y = h + (h0 >= mn.nav.pisoY - 1e-6 ? this.boia(lm) : 0); }
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
      // ESTUDANDO no tablet: o jogo não ouve o teclado (o foco pode estar na moldura, não no iframe) — só o T, que guarda
      if (this.labAberto && k !== "t") return;
      if (k === "shift") { this.keys.shift = true; return; }
      if (k === " " || k === "spacebar") { if (this.pilotando || this.noVeiculo()) { this.voY.subir = true; e.preventDefault(); return; } if (!this.menu) { this.comandoJet(true); e.preventDefault(); } return; }
      if (k === "f" && !this.menu) { if (!e.repeat) this.executarAcao(); e.preventDefault(); return; }
      if (k === "j" && !this.menu) { if (!e.repeat) this.alternarDescanso(); e.preventDefault(); return; }
      if (k === "c" && !this.menu) { if (!e.repeat) this.darDash(); e.preventDefault(); return; }   // C = DASH (o arranque — desvio)
      if (k === "x" && !this.menu && !this.noCarro()) { if (!e.repeat) { if (this.rifleEquipado()) this.puxarGatilho(true); else this.atacar(); } e.preventDefault(); return; }
      if (k === RIFLE.tecla && !this.menu && !this.pilotando && !this.noVeiculo()) { if (!e.repeat) this.alternarRifle(); e.preventDefault(); return; }   // 1 = saca/guarda o RIFLE
      // MAGIA (a pé): Q = Estilhaço Estelar, E = Nova Cósmica, R (segurar) = o escudo
      if ((k === "q" || k === "e") && !this.menu && !this.pilotando && !this.noVeiculo()) { if (!e.repeat) this.lancar(k === "q" ? FEITICOS.estilhaco : FEITICOS.nova); e.preventDefault(); return; }
      if (k === ESCUDO.tecla && !this.menu && !this.pilotando && !this.noVeiculo()) { if (!e.repeat) this.erguerEscudo(true); e.preventDefault(); return; }   // X = ATACAR (o combo da espada; o clique também, com o mouse travado)   // J = sentar / deitar / levantar (lounge)
      if (k === "t" && !this.menu) { if (!e.repeat) this.alternarTablet(); e.preventDefault(); return; }
      if (k === "v" && !this.menu) { if (!e.repeat) this.alternarCamera(); e.preventDefault(); return; }   // V = a câmera PERTO (por cima do ombro) ⇄ a de antes
      if (k === "m" && !this.menu) { if (!e.repeat) this.portalPraNave(); e.preventDefault(); return; }   // M = o dono se TELEPORTA pra dentro da nave (um portal aqui, outro lá)     // T = o tablet (estudar por cima do cyberespaço)
      if (k === "k" && !this.menu && this.ehFundador(this.o.eu.id)) { if (!e.repeat) this.o.onRitualNave?.(!this.ritual?.nave); e.preventDefault(); return; }   // K = o RITUAL DA NAVE (o dono)
      // HABILIDADES (lib/cyber/habilidades): G = o Droid companheiro (founder)
      const hab = this.menu ? null : habilidadeDaTecla(k, { fundador: this.ehFundador(this.o.eu.id), digitando: false, repetida: e.repeat, modificador: e.ctrlKey || e.metaKey || e.altKey });
      if (hab) { this.usarHabilidade(hab.id); e.preventDefault(); return; }   // F = a ação de contexto (estudar, montar, embarcar, descer…)
      if (k === "p" && this.noCarro()) { this.autoPouso = true; e.preventDefault(); return; }   // P = pousar o carro (desce sozinho até o chão)
      if (k === "p" && (this.pilotando || this.moto !== null)) { this.pousar(); e.preventDefault(); return; }   // P = pousar (no desktop não há o botão)
      if ((k === "e" || k === "q") && (this.pilotando || this.noVeiculo())) { this.voY[k === "e" ? "subir" : "descer"] = true; this.autoPouso = false; e.preventDefault(); return; }
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) { this.keys[k] = true; e.preventDefault(); }
    });
    // a janela perdeu o foco (o lab do tablet, outra aba, alt-tab): o keyup não vem mais pra cá — solta tudo
    on("blur", () => this.soltarTeclas());
    { const oculto = () => { if (document.hidden) this.soltarTeclas(); }; document.addEventListener("visibilitychange", oculto); this.cleanups.push(() => document.removeEventListener("visibilitychange", oculto)); }
    on("keyup", (e) => { const k = e.key.toLowerCase(); if (k === "shift") { this.keys.shift = false; return; } if (k === " " || k === "spacebar") { this.espaco = false; this.voY.subir = false; this.comandoJet(false); return; } if (k === "e") this.voY.subir = false; if (k === "q") this.voY.descer = false; if (k === ESCUDO.tecla) this.erguerEscudo(false); if (k === "x") this.puxarGatilho(false); this.keys[k] = false; });
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
    onC("contextmenu", (e) => { if (this.rifleEquipado() && !this.menu) e.preventDefault(); });   // (o botão direito é a MIRA)
    onC("pointerdown", (e) => {
      // o RIFLE: o botão direito MIRA (segurado); com o mouse travado, o esquerdo é o GATILHO (segurado = rajada)
      if (e.pointerType === "mouse" && e.button === 2 && this.rifleEquipado() && !this.menu) { this.mirar(true); e.preventDefault(); return; }
      if (this.olharLivre) { if (e.pointerType === "mouse" && e.button === 0) { if (this.rifleEquipado()) this.puxarGatilho(true); else this.atacar(); } return; }   // mouse travado: o clique ATACA (com arma; as outras ações são no F)
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
        const sens = SENS_OLHAR * (1 - 0.4 * this.wMira);   // (mirando, com o zoom: mais fino)
        this.camSegueEm = performance.now() + 1500; this.camAz -= e.movementX * sens; this.camPitch = limitarPitch(this.camPitch + e.movementY * sens * 0.85);
        return;
      }
      if (this.ptrs.has(e.pointerId)) this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.ptrs.size === 2 && this.pinch0) { const [a, b] = [...this.ptrs.values()]; { const [mn, mx] = faixaDaDistancia(this.camModo); this.camDist = Math.min(Math.min(mx, CyberEngine.CAM_MAX), Math.max(mn, (this.dist0 * this.pinch0) / Math.max(20, Math.hypot(a!.x - b!.x, a!.y - b!.y)))); } this.moved = true; return; }
      if (!this.drag) { if (e.target === cv) this.passarMouse(e.clientX, e.clientY); return; }
      const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) this.moved = true;
      this.camSegueEm = performance.now() + 1500; this.camAz = this.drag.az - dx * 0.006; this.camPitch = limitarPitch(this.drag.pitch + dy * 0.005);   // arrastar pra baixo até o chão → olhar pro céu
    });
    on("pointerup", (e) => {
      if (e.pointerType === "mouse" && e.button === 2) this.mirar(false);
      if (e.pointerType === "mouse" && e.button === 0) this.puxarGatilho(false);
      if (this.travando) { this.travando = false; return; }
      if (this.olharLivre) return;
      const era = this.ptrs.size; this.ptrs.delete(e.pointerId); if (this.ptrs.size < 2) this.pinch0 = 0;
      if (this.drag && !this.moved && era === 1) this.clicar(e.clientX, e.clientY);
      if (!this.ptrs.size) this.drag = null;
    });
    on("pointercancel", (e) => { this.ptrs.delete(e.pointerId); if (!this.ptrs.size) { this.drag = null; this.pinch0 = 0; } });
    onC("pointerenter", () => { this.sobContainer = true; });
    onC("pointerleave", () => { this.sobContainer = false; this.hoverBase = null; cv.style.cursor = ""; });
    onC("wheel", (e) => { if (this.menu) return; /* menu: a página continua rolando */ e.preventDefault(); const [mn, mx] = faixaDaDistancia(this.camModo); this.camDist = Math.min(Math.min(mx, CyberEngine.CAM_MAX), Math.max(mn, this.camDist * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });
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
      const a = acaoNaNave(this.bordo, this.euNoComando());
      if (a === "pilotar") return { id: "pilotar", rotulo: "Pilotar a nave", fazer: () => this.o.onEmbarcar?.() };
      if (a === "estudar") return { id: "estudar-nave", rotulo: "Estudar (meu desktop)", fazer: () => this.o.onEntrarEstudo?.() };
      if (a === "somLounge") return { id: "som-lounge", rotulo: "Som do lounge (playlist)", fazer: () => this.o.onAbrirSom?.("lounge") };
      if (a === "somNave") return { id: "som-nave", rotulo: "Som da nave (playlist)", fazer: () => this.o.onAbrirSom?.("nave") };
      if (naBocaNave(this.bordo) && this.ehFundador(this.o.eu.id)) return { id: "ritual", rotulo: this.ritual?.tempestade ? "Ritual da chegada (armado)" : "Iniciar o ritual da chegada", fazer: () => this.o.onRitual?.() };
      if (a === "sair" && this.saidaSegura()) return { id: "sair-nave", rotulo: "Sair da nave", fazer: () => this.sairDaNave() };   // pairando no ar: desce-se pela rampa (e pula-se de mochila)
      return null;
    }
    if (this.carro && this.carro.fase !== "parado") return this.carro.fase === "dirigindo" && this.carroPodeSair() ? { id: "sair-carro", rotulo: "Sair do carro", fazer: () => this.sairDoCarro() } : null;
    if (this.moto !== null) return this.desceDaMotoAqui() ? { id: "descer-moto", rotulo: "Descer da moto", fazer: () => this.desmontar() } : null;
    if (this.carroPerto()) return { id: "entrar-carro", rotulo: "Entrar no carro", fazer: () => this.entrarNoCarro() };
    if (this.jet.noAr || this.nascendo || this.tunel || this.expulsando) return null;
    const el = this.plat ? elevadorAqui(this.plat.id, this.plat.andar, this.eu.pos) : null;
    if (el && this.plat) { const pl = this.plat; return { id: `elevador-${pl.andar}`, rotulo: el.rotulo, fazer: () => { pl.andar = el.proximo; this.som.tocar("near-ping", this.eu.av.group.position, { dist: DISTANCIA.eu }); } }; }
    if (this.pertoDoRelicario()) return { id: "relicario", rotulo: this.relicario?.ocupado() ? "A Zaeon está lendo…" : "Entregar no Relicário", fazer: () => this.abrirRelicario() };
    const estudar = { id: "estudar", rotulo: "Estudar", fazer: () => this.o.onEntrarEstudo?.() };
    if ((this.perto || this.noTopo) && !this.guia) return estudar;   // (no tutorial as salas ficam fechadas até o fim)
    const m = this.motoAoAlcance();
    if (m && !this.podeMoto()) return { id: "moto-travada", rotulo: "Moto travada", fazer: () => this.o.onAviso?.(AVISO_MOTO_TRAVADA) };
    if (m) return { id: m.tipo === "vaga" ? `moto-${m.s}` : `moto-${m.dono}`, rotulo: "Montar na moto", fazer: () => { this.montar(m); } };
    if (this.nave && this.navePerto()) return { id: "entrar-nave", rotulo: "Entrar na nave", fazer: () => this.entrarNaNave() };
    if (this.noCeu && this.cidade?.tocaDiscos && this.ehFundador(this.o.eu.id)) {
      const td = this.cidade.tocaDiscos.getWorldPosition(this.tmp);
      if (Math.hypot(this.eu.pos.x - td.x, this.eu.pos.z - td.z) < 2.6) return { id: "som", rotulo: "Mesa do DJ", fazer: () => this.o.onAbrirSom?.("lounge") };
    }
    if (this.noCeu && this.cidade?.tvLounge && this.ehFundador(this.o.eu.id)) {
      const tv = this.cidade.tvLounge.getWorldPosition(this.tmp);
      if (Math.hypot(this.eu.pos.x - tv.x, this.eu.pos.z - tv.z) < 7) return { id: "recado", rotulo: "Escrever recado pro QG", fazer: () => this.o.onAbrirRecado?.() };
    }
    // na RECEPÇÃO, perto da mesa (o lar do Droid): chamar ele de novo (refaz o tutorial)
    if (!this.guia && this.droid && this.altoEm && !this.noCeu) { const c = this.casaDoAgente(); if (Math.hypot(this.eu.pos.x - c.x, this.eu.pos.z - c.z) < 5 && Math.abs(this.eu.alt - c.y) < 2.5) return { id: "chamar-droid", rotulo: `Chamar o ${DROID.nome}`, fazer: () => this.guiaRefazer() }; }
    // no PORTAL do monumento, no deck do topo da torre: o COFRE (o fundo que os agentes operam)
    if (this.pertoDoCofre()) return { id: "cofre", rotulo: "Abrir o cofre", fazer: () => this.o.onCofre?.() };
    // perto de um AGENTE DE TRADING (na mesa de operações): falar com ele
    { const tr = this.traderPerto(); if (tr) { const a = agentePorId(tr.h.id)!; return { id: `trader-${a.id}`, rotulo: `Falar com ${a.nome} · ${a.papel}`, fazer: () => this.o.onAgenteTrading?.(a.id) }; } }
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
      if (sob === this.o.eu.id && this.perto && !this.guia) { this.o.onEntrarEstudo?.(); return; }   // a minha base, na Zaeon
      // a TV do LOUNGE: o dono escreve o recado pro QG do Andrei (perto dela)
      if (this.cidade.tvLounge && this.ray.intersectObject(this.cidade.tvLounge, false).length) {
        const tv = this.cidade.tvLounge.getWorldPosition(new THREE.Vector3());
        if (Math.hypot(this.eu.pos.x - tv.x, this.eu.pos.z - tv.z) < 14) { this.o.onAbrirRecado?.(); return; }
      }
      // o RELICÁRIO: perto = entregar; longe = anda até a frente dele
      if (this.relicario && this.ray.intersectObjects(this.relicario.alvos, true).length) {
        if (this.pertoDoRelicario()) { this.abrirRelicario(); return; }
        const rl = relicarioLocal(), f = mundo({ x: rl.x + Math.sin(rl.rumo) * 5.2, z: rl.z + Math.cos(rl.rumo) * 5.2 });
        this.alvo = new THREE.Vector2(f.x, f.z); this.alvoDepois = null; return;
      }
      const h = this.ray.intersectObjects(this.cidade.alvos, true)[0];
      if (h) { const q = resolverCidade({ x: h.point.x, z: h.point.z }); this.alvo = new THREE.Vector2(q.x, q.z); this.alvoDepois = null; }
      return;
    }
    let colega: Ator | null = null;
    for (const a of this.remotos.values()) if (this.eu.pos.distanceTo(a.pos) < 3.0 && this.ray.intersectObjects(a.av.meshes, true).length) { colega = a; break; }
    // no topo: o chão é a plataforma (só anda nela); o monitor do topo continua valendo
    if (this.noTopo) {
      if (sob === this.o.eu.id && !this.guia) { this.o.onEntrarEstudo?.(); return; }
      const z = this.zaeon(); const hit = z?.topo ? this.ray.intersectObject(z.topo, true)[0] : undefined;
      if (hit && z) { const e = this.eixoTopo()!; const dx = hit.point.x - e.x, dz = hit.point.z - e.z, d = Math.hypot(dx, dz), lim = 2.0 * this.escalaZaeon(), k = d > lim ? lim / d : 1; this.alvo = new THREE.Vector2(e.x + dx * k, e.z + dz * k); }
      return;
    }
    let marco: LandmarkHandle | null = null, hitMarco: THREE.Intersection | null = null;
    for (const lm of this.lms) { const h = this.ray.intersectObjects(lm.alvos, true)[0]; if (h) { marco = lm; hitMarco = h; break; } }
    // no ALTO (escada/plataforma): clicar na estrutura = andar até o ponto (a navegação segura muralhas/borda)
    if (this.altoEm) {
      if (sob === this.o.eu.id && this.perto && !this.guia) { this.o.onEntrarEstudo?.(); return; }
      if (hitMarco) { this.alvo = new THREE.Vector2(hitMarco.point.x, hitMarco.point.z); this.alvoDepois = null; this.falandoCom = null; }
      return;
    }
    // do chão, clicar nos DEGRAUS: primeiro o pé da escada, depois sobe até onde clicou
    if (marco && hitMarco && marco.escada && hitMarco.object === marco.escada) {
      const mn = marcoNav(marco.poi)!; const pe = deEscada(mn, mn.nav.bordaR + mn.nav.escada.comprimento * 0.98, 0);
      this.alvo = new THREE.Vector2(pe.x, pe.z); this.alvoDepois = new THREE.Vector2(hitMarco.point.x, hitMarco.point.z); this.falandoCom = null; return;
    }
    const acao = decidirClique({ noMonitor: sob !== null, baseMinha: sob === this.o.eu.id, pertoDaBase: this.perto, noColega: !!colega, colegaPerto: !!colega, noLandmark: !!marco, landmarkPerto: !!marco && poiPerto(this.eu.pos, [marco.poi])?.id === marco.poi.id });
    if (acao === "monitor" && !this.guia) { this.o.onEntrarEstudo?.(); return; }
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
    // de OUTRO nível: nem desenha nem anima (a Zaeon cuida dos níveis dela por dentro — components/cyber/Cidade)
    if (this.nivel && nome !== "zaeon") { const g = r.area(); if (nivelDoPonto(g, (g.y0 + g.y1) / 2) !== this.nivel) { esconderRegiao(r); return false; } }
    return atualizarRegiao(r, this.cam.position);
  }
  /** o nível de um ponto do mundo está à mostra? (sem níveis: sempre) */
  private noMeuNivel(p: { x: number; z: number }, y: number) { return !this.nivel || nivelDoPonto(p, y) === this.nivel; }
  /** a cada quadro: em que nível estou (um salto grande = teleporte) — trocou: só o novo aparece */
  private atualizarNivel() {
    if (!NIVEIS_SEPARADOS) return;
    this.quadroNivel++;
    if (this.espiando && this.quadroNivel - this.espiando.quadro > 2) { const e = this.espiando.n; this.espiando = null; this.cidade?.mostrarNivel(this.nivel); if (e !== "zaeon" && e !== this.nivel) this.desmontarSalaAqui(e); }   // (a cena acabou)
    const e = this.eu, a = this.posNivel;
    if (this.emergir || this.clarao) { a.x = e.pos.x; a.z = e.pos.z; a.alt = e.alt; a.ok = true; return; }   // (saindo do buraco negro: o nível é o do destino, fixo — o arco passa por fora da sala)
    const saltou = !a.ok || Math.hypot(e.pos.x - a.x, e.pos.z - a.z) > 25 || Math.abs(e.alt - a.alt) > 25;
    const n = proximoNivel(this.nivel, e.pos, e.alt, saltou);
    a.x = e.pos.x; a.z = e.pos.z; a.alt = e.alt; a.ok = true;
    if (n !== this.nivel) this.mudarNivel(n);
  }
  /** numa CENA do guia, mostrar outro nível (só o desenho) enquanto a cena durar — volta sozinho no quadro seguinte */
  private espiando: { n: "zaeon" | NomeSala; quadro: number } | null = null; private quadroNivel = 0;
  private espiarNivel(n: "zaeon" | NomeSala) {
    if (!this.cidade || n === this.nivel) return;
    if (n !== "zaeon" && !this.cidade.salaMontada(n)) this.montarSalaAqui(n);   // (a cena mostra uma sala que não está carregada: monta enquanto durar)
    this.cidade.grupoDoNivel(n).visible = true; this.espiando = { n, quadro: this.quadroNivel };
  }
  private mudarNivel(n: IdNivel) {
    const antes = this.nivel;
    this.nivel = n; definirNivel(n);
    this.cidade?.mostrarNivel(n);
    // CARREGA UM NÍVEL DE CADA VEZ: a sala de onde saí é DESMONTADA (libera a memória) e a sala onde cheguei é MONTADA
    // (a troca acontece com a tela coberta pelo túnel)
    if (NIVEIS_SEPARADOS && this.cidade) {
      if (antes && antes !== n && ehSala(antes)) this.desmontarSalaAqui(antes);
      if (ehSala(n)) this.montarSalaAqui(n);
    }
    if (NIVEIS_SEPARADOS) {
      if (n === "praca") this.montarPraca(); else if (antes === "praca") this.desmontarPraca();
      if (n === "solana") this.montarSolana(); else if (antes === "solana") this.desmontarSolana();
      const rn = regiaoDoNivel(n); if (rn) this.montarNaveCw(rn); else if (regiaoDoNivel(antes)) this.desmontarNaveCw();
    }
    if (!regiaoDoNivel(n)) this.emNaveCw = null;
    this.somLounge?.silenciar(n !== "lounge");   // (a música do lounge é DO lounge: fora dele, não existe)
  }
  /** a PRAÇA e a SOLANA também são níveis: montam quando se chega e desmontam quando se sai */
  private montarPraca() {
    if (this.praca) return;
    const pr = criarPraca({ low: this.o.low, starTex: this.cena.starTex }); camuflarGrupo(pr.group);
    fundirEstaticos(pr.group, { passo: (_, t) => pr.atualizar(1 / 30, t), manter: [pr.piso] });
    this.cena.scene.add(pr.group); this.praca = pr;
  }
  private desmontarPraca() { const pr = this.praca; if (!pr) return; this.praca = null; this.soltarRegiaoDe(pr.group); pr.group.removeFromParent(); pr.dispose(); }
  private montarSolana() {
    if (this.solana) return;
    const so = criarSolanaHouse({ low: this.o.low, starTex: this.cena.starTex }); camuflarGrupo(so.group); this.cena.scene.add(so.group);
    fundirEstaticos(so.group, { passo: (_, t) => so.atualizar(1 / 30, t) }); this.solana = so;
  }
  private desmontarSolana() { const so = this.solana; if (!so) return; this.solana = null; this.soltarRegiaoDe(so.group); so.group.removeFromParent(); so.dispose(); }
  private soltarRegiaoDe(raiz: THREE.Object3D) { const r = this.regioes.get(raiz); if (r) { soltarRegiao(r); this.regioes.delete(raiz); } }
  /** a última música do lounge que o React mandou (quem monta o lounge depois já toca do ponto certo) */
  private somLoungeAgora: { som: SomLounge | null; offsetMs: number } | null = null;
  private loopsAmbiente = new Map<NomeSala, LoopSom[]>();
  /** MONTA uma sala (o nível dela) e o que é do engine nela: o visual de holograma, os lotes estáticos, a música do lounge
   *  e a música ambiente das salas de convivência */
  private montarSalaAqui(n: NomeSala) {
    const c = this.cidade!; if (c.salaMontada(n)) return;
    c.montarSala(n);
    const g = c.grupoDoNivel(n); camuflarGrupo(g);
    fundirEstaticos(g, { passo: (k, t) => { c.somTocando(k % 3 !== 0, (k % 5) / 4); c.atualizar(1 / 30, t); }, manter: [...comDescendentes([...c.alvos, c.tvLounge]), ...[c.tocaDiscos, ...c.caixasLounge, ...c.caixasAmbiente.map((x) => x.obj)].flatMap((o) => (o ? comDescendentes([o]) : []))] });
    c.somTocando(false);
    if (n === "lounge" && this.som && this.o.urlMusica && c.caixasLounge.length && !this.somLounge) {
      this.somLounge = criarSomLounge({ audio: this.som, caixas: c.caixasLounge, urlDe: this.o.urlMusica });
      if (this.somLoungeAgora) this.somLounge.aplicar(this.somLoungeAgora.som, this.somLoungeAgora.offsetMs);
    }
    if (this.som && (n === "biblioteca" || n === "jardim")) {
      const ls = c.caixasAmbiente.filter((x) => x.sala === n).map((x) => { const l = this.som.loop(`ambiente-${n}`, x.obj, { dist: DISTANCIA.ambiente, volume: 0.5 }); this.som.volumeLoop(l, 1); return l; });
      this.loopsAmbiente.set(n, ls);
    }
    if (this.som && n === "lounge") {   // os LOUNGES ESTUDANTIS do Templo Cósmico: o som calmo de estudo (o da Sala do Saber)
      const ls = c.caixasEstudo.map((obj) => { const l = this.som.loop("ambiente-biblioteca", obj, { dist: DISTANCIA.ambiente, volume: 0.4, dentro: true }); this.som.volumeLoop(l, 1); return l; });   // (`dentro`: o abafado de quem está lá não pega ele)
      this.loopsAmbiente.set(n, ls);
    }
  }
  /** DESMONTA uma sala (a pessoa saiu dela): o que é do engine nela sai junto */
  private desmontarSalaAqui(n: NomeSala) {
    const c = this.cidade!; if (!c.salaMontada(n)) return;
    if (n === "lounge" && this.somLounge) { this.somLounge.dispose(); this.somLounge = null; }
    for (const l of this.loopsAmbiente.get(n) ?? []) this.som.soltarLoop(l); this.loopsAmbiente.delete(n);
    c.desmontarSala(n);
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
    this.R.setPixelRatio(this.prBase * (this.nitidezFixa ? 1 : d.dpr));   // (nitidez escolhida pela pessoa: a resolução não cai)
    for (const a of [this.eu, ...this.remotos.values()]) a?.av.aura(d.aura);
    // o ALCANCE: a câmera e as IAs da frota encurtam ANTES da resolução cair (lib/cyber/qualidadeAdaptativa)
    this.cam.far = Math.max(1000, this.farBase * d.alcance); this.cam.updateProjectionMatrix();
    this.cidade?.vistaCosmica(this.cam.far);   // (os buracos negros das pistas cósmicas ficam aquém do alcance — senão somem do horizonte)
    this.frota?.alcance(d.alcance);
  }
  /** o que o contador das configs mostra: quadros por segundo de verdade e o degrau da qualidade adaptativa */
  estatisticas() { return { fps: this.fpsAgora, degrau: this.qa.atual.nome, leve: this.o.low }; }
  private soltar(raiz: THREE.Object3D) { const r = this.regioes.get(raiz); if (r) { soltarRegiao(r); this.regioes.delete(raiz); } }

  /** o PLANO da cutscene agora (lib/cyber/cutscene) — ou null (a câmera normal). Tutorial: a 1ª conversa com a Zaeon
   *  (enquadra o rosto dela por trás de quem ouve), a apresentação e a missão do Droid (ele em destaque) e os telões
   *  PROBLEMA → SOLUÇÃO (um telão por fala). Fora da cena inteira, a câmera solta na INSTRUÇÃO (a última fala) */
  private planoDaCena(): Plano | null {
    if (this.duelo) {   // o DUELO: a câmera colada no rosto da Examiner (os olhos acendendo)
      const ex = this.examiner();
      if (ex) return planoConversa({ x: ex.pos.x, y: ex.alt + 1.48, z: ex.pos.z }, { x: this.eu.pos.x, y: this.eu.alt + 1.6, z: this.eu.pos.z }, { lado: 0.28, pitch: 0.02, recuo: this.duelo.fase === "cena" ? Math.max(0.7, 2.6 - this.duelo.t * 0.5) : 0.7 });
    }
    const g = this.guia; if (!g || this.menu || this.expulsando) return null;
    const ilhaY = this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY;
    const eu = { x: this.eu.pos.x, y: this.eu.alt + 1.6, z: this.eu.pos.z };
    const cv = this.conversa, h = this.holoZaeon;
    if (cv && h && cv.etapa !== "feita" && cv.etapa !== "brava" && h.fase() !== "oculto") {
      const a = h.ancora(), c = CIDADE.centro;
      return planoConversa({ x: c.x, y: ilhaY + a.y - 4.5, z: c.z }, eu, { lado: 0.32, pitch: -0.04, recuo: 8 });
    }
    const p = this.rot[g.passo]!; if (!p.cena || (g.fala === 0 && p.falas.length > 0)) return null;
    if (!p.cenaInteira && g.fala >= p.falas.length) return null;   // a instrução: a câmera volta pra quem vai agir
    if (p.cena === "capela") {   // do ALTO, sobre o coração da capela (o globo): "pouse ali"
      const c = mundo(CENTRO_DA_CAPELA_LOCAL);
      return { foco: { x: c.x, y: ilhaY + 3, z: c.z }, az: Math.atan2(eu.x - c.x, eu.z - c.z) + 0.2, pitch: 0.58, dist: 38 };
    }
    if (p.cena === "relicario") {   // o RELICÁRIO inteiro, com o holograma da Zaeon em cima, do lado de quem olha
      const r = relicarioMundo();
      return { foco: { x: r.x, y: ilhaY + ALTURA_LOUNGE + 5.6, z: r.z }, az: Math.atan2(eu.x - r.x, eu.z - r.z) + 0.3, pitch: 0.14, dist: 17 };
    }
    if (p.cena === "droid" || p.cena === "droid-perto") {   // "perto" = o ZOOM da entrega
      const d = this.droid; if (!d || d.h.fase() !== "visivel") return null;
      return p.cena === "droid" ? planoConversa({ x: d.pos.x, y: d.alt + 0.5, z: d.pos.z }, eu, { lado: 0.6, pitch: 0.12, recuo: 4 })
        : planoConversa({ x: d.pos.x, y: d.alt + 0.3, z: d.pos.z }, eu, { lado: 0.4, pitch: 0.05, recuo: 0.6 });
    }
    if (p.cena === "motos") {   // a GARAGEM: as motos estacionadas, de cima, do lado da cidade
      this.espiarNivel("garagem");   // (níveis separados: a garagem não existe daqui — na cena, ela aparece)
      const lote = LOTES.find((l) => l.id === "garagem")!, c = CIDADE.centro;
      return { foco: { x: lote.x, y: ilhaY + ALTURA_LOUNGE + 1, z: lote.z }, az: Math.atan2(c.x - lote.x, c.z - lote.z) + 0.25, pitch: 0.38, dist: 34 };
    }
    // os TELÕES: a 1ª fala no dos problemas, a 2ª no das soluções, a 3ª os dois (de longe)
    const k = g.fala - 1, tp = TELOES_TERRA[0]!, ts = TELOES_SOLUCAO[0]!;
    const t = k === 0 ? tp : k === 1 ? ts : { ...tp, x: (tp.x + ts.x) / 2, z: (tp.z + ts.z) / 2, larg: tp.larg * 2.6 };
    const w = mundo({ x: t.x, z: t.z });
    return planoTelao({ x: w.x, z: w.z, y: ilhaY + t.y, rot: t.rot, larg: t.larg });
  }
  /** mistura a câmera normal com a da cena (o peso sobe/desce suave) e põe as faixas de cinema */
  private aplicarCena(normal: Pose, dt: number): Pose {
    const cn = this.cine, plano = this.planoDaCena(); cn.plano = plano;
    if (plano) { const alvo = poseDoPlano(plano); cn.pose = cn.pose && cn.w > 0 ? seguirPose(cn.pose, alvo, dt, 2.2) : alvo; }
    cn.w = passoPeso(cn.w, !!plano, dt, cn.lenta);
    if (!cn.faixas.length) for (const lado of ["top", "bottom"] as const) {
      const f = document.createElement("div");
      f.style.cssText = `position:absolute;left:0;right:0;${lado}:0;height:0;background:#000;pointer-events:none;z-index:24;`;
      this.o.overlay.appendChild(f); cn.faixas.push(f);
    }
    const hFaixa = `${(FAIXA_CINEMA * 100 * suave(cn.w)).toFixed(2)}vh`;
    for (const f of cn.faixas) if (f.style.height !== hFaixa) f.style.height = hFaixa;
    if (cn.w <= 0 || !cn.pose) { cn.pose = null; cn.lenta = false; return normal; }
    return misturarPose(normal, cn.pose, cn.w);
  }
  /** em cena, quem joga não anda (a câmera está noutro lugar) */
  private get emCena() { return !!this.cine.plano; }

  private vitrine = false;
  private atualizarCamera(dt = 1 / 60) {
    const l = this.minhaBase;
    // a VITRINE do inventário: a câmera de FRENTE pro personagem, perto, um pouco de lado (ele fica à esquerda — o
    // painel ocupa a direita); suave na ida
    if (this.vitrine && !this.menu) {
      const f = this.eu.facing, y = this.eu.alt, fx = Math.sin(f), fz = Math.cos(f), rx = Math.cos(f), rz = -Math.sin(f), k = 1 - Math.exp(-dt * 5);
      // a câmera na frente dele (um pouco de lado) e o OLHAR girado o ângulo certo pra ele cair em `vitrineCx` da tela
      const D = 4.9, px = this.eu.pos.x + fx * D - rx * 0.7, pz = this.eu.pos.z + fz * D - rz * 0.7;   // (de corpo inteiro)
      const tanH = Math.tan(THREE.MathUtils.degToRad(this.cam.fov) / 2) * this.cam.aspect, giro = Math.atan((0.5 - this.vitrineCx) * 2 * tanH);
      const ang = Math.atan2(this.eu.pos.x - px, this.eu.pos.z - pz) - giro;   // (girar o olhar desse lado joga ele pra esquerda da tela)
      this.cam.position.lerp(this.vCamA.set(px, y + 1.3, pz), k);
      this.camT.lerp(this.vCamA.set(px + Math.sin(ang) * D, y + 0.92, pz + Math.cos(ang) * D), k); this.cam.lookAt(this.camT);
      return;
    }
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
    if (this.camPerto || this.wMira > 0.01) { const q = seguirPerto(this.camT, { x: this.eu.pos.x, y: 1.2 + this.eu.alt, z: this.eu.pos.z }, dt); this.camT.set(q.x, q.y, q.z); }   // PERTO: segue por tempo e com atraso limitado (voo/turbo/dash não deixam o personagem fugir)
    else this.camT.lerp(this.vCamA.set(this.eu.pos.x, 1.2 + this.eu.alt, this.eu.pos.z), this.noVeiculo() ? 1 - Math.exp(-dt * 12) : 0.12);
    const cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch);
    // MOTO: câmera de perseguição — volta sozinha pra TRÁS da moto (com atraso: a curva aparece na tela), a não ser
    // que a pessoa tenha mexido o mouse/arrastado há pouco; afasta um pouco com a velocidade
    if (this.noVeiculo() && performance.now() > this.camSegueEm) {
      let d = this.rumoVeiculo() + Math.PI - this.camAz; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.camAz += d * (1 - Math.exp(-dt * 2.6));
    }
    let dist = this.pilotando ? Math.max(this.camDist, 75) : this.noVeiculo() && this.camMotoPerto ? CAMERA_MOTO_PERTO.dist + (this.noCarro() ? 1.6 : 0) + CAMERA_MOTO_PERTO.porVel * this.velTela : this.noVeiculo() ? Math.max(this.camDist, 9) + 2.2 * this.velTela : this.camPerto ? distPerto(this.camDist, this.velTela) : this.camDist + 1.6 * this.velTela;   // (a pé/mochila rápido: a câmera recua um pouco)
    if (this.wMira > 0.001) dist += (RIFLE.distMira - dist) * this.wMira;   // MIRANDO com o rifle: por cima do ombro, bem perto
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
    // PERTO: o olho na altura dos ombros e deslocado pro lado direito (o personagem fica à esquerda, o caminho livre)
    let olhoCam = this.camPerto ? olhoDoOmbro({ x: this.camT.x, y: this.camT.y - 1.2, z: this.camT.z }, this.camAz) : { x: this.camT.x, y: this.camT.y + (this.noVeiculo() && this.camMotoPerto ? CAMERA_MOTO_PERTO.olho : 0.8), z: this.camT.z };   // (na moto PERTO: o olho mais baixo, junto do piloto)
    if (this.wMira > 0.001) {   // MIRANDO: o olho por cima do ombro direito (mais pro lado que o modo perto: a arma à mostra)
      const om = { x: this.camT.x + Math.cos(this.camAz) * RIFLE.ombroMira, y: this.camT.y - 1.2 + RIFLE.alturaMira, z: this.camT.z - Math.sin(this.camAz) * RIFLE.ombroMira }, k = this.wMira;
      olhoCam = { x: olhoCam.x + (om.x - olhoCam.x) * k, y: olhoCam.y + (om.y - olhoCam.y) * k, z: olhoCam.z + (om.z - olhoCam.z) * k };
    }
    let c = poseDaCamera({ olho: olhoCam, az: this.camAz, pitch: this.camPitch, dist, chaoY: this.eu.alt });
    c = this.cameraNaNaveCw(c);   // dentro da NAVE COWORKING: abaixo do teto e dentro do casco
    c = this.cameraDaCapsula(c, dt);   // numa CÁPSULA da torre: a vista de dentro, parada em relação a ela
    c = this.cameraDaAproximacao(c, dt);   // chegando num buraco negro: a câmera alta, de trás, pra ver os detritos vindo
    c = this.cameraDaTravessia(c, dt);   // sendo tragado: o plano de cinema com o buraco negro
    c = this.aplicarCena(c, dt);   // a CUTSCENE do tutorial (se houver) leva a câmera pra outro enquadramento
    this.cam.position.set(c.pos.x, c.pos.y, c.pos.z);
    this.cam.lookAt(c.olhar.x, c.olhar.y, c.olhar.z);
    if (this.agora < this.tremorBatida) { const a = 0.9 * (this.tremorBatida - this.agora) / 0.45; this.cam.position.x += (Math.random() - 0.5) * a; this.cam.position.y += (Math.random() - 0.5) * a; this.cam.position.z += (Math.random() - 0.5) * a; }   // (a batida de um detrito)
    // SENSAÇÃO DE VELOCIDADE (moto): o FOV abre com a velocidade (+12°, ~+14° no boost) e, no boost, a câmera treme de leve
    // a pé / mochila: a velocidade de verdade no plano (sprint, dash, voo turbo — lib/cyber/movimento); teleporte não conta
    if (this.posAnt) { const v = Math.hypot(this.eu.pos.x - this.posAnt.x, this.eu.pos.z - this.posAnt.z) / Math.max(dt, 1e-3); this.velPlano += ((v > 80 ? 0 : v) - this.velPlano) * Math.min(1, dt * 10); }
    this.posAnt = { x: this.eu.pos.x, z: this.eu.pos.z };
    const queda = this.jet.noAr && this.jet.vy < -10 ? Math.min(1.15, (-this.jet.vy - 10) / 40) : 0;   // (a QUEDA LIVRE: a lente abre com a velocidade de cair)
    const aPe = this.moto === null && !this.pilotando && !this.menu ? Math.max(sensacaoAPe(this.velPlano, this.jet.noAr), queda) : 0;
    const naveTurbo = this.pilotando && !this.pousado ? sensacaoDaNave(Math.hypot(this.naveEst.vx, this.naveEst.vz), this.turboNave) : 0;
    const alvoVel = Math.max(this.moto !== null && !this.motoPousado ? sensacaoDeVelocidade(this.motoEst) : 0, aPe, naveTurbo);
    this.velTela += (alvoVel - this.velTela) * (1 - Math.exp(-dt * (alvoVel > this.velTela ? 3 : 1.8)));
    if (!this.fovBase) this.fovBase = this.cam.fov;
    let fov = this.fovBase + 12 * Math.min(1.15, this.velTela) + 16 * this.wAprox;   // (na aproximação do buraco negro, a lente abre: ver o campo de asteroides chegando)
    if (this.wMira > 0.001) fov += (RIFLE.fovMira - fov) * this.wMira;   // (mirando: o zoom)
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

  // ───────────── a CORRIDA DE CHECKPOINTS (lib/cyber/corrida/checkpoints): sem estatística — pegar o próximo anel ─────────────
  private ck: { c: CorridaCk; pista: Pista; bots: { b: BotCk; g: THREE.Group; moto: MotoHandle; ck: number }[]; resultado: { lista: Concorrente[]; vencedores: Concorrente[] } | null; contou: number } | null = null;
  /** larga uma corrida de checkpoints (de moto): SOLO (`semente`/`inicio` novos) ou EM DUPLA (quem chama: vaga 0, largada
   *  daqui a ESPERA_DUPLA_MS; quem entra: a semente e a largada do convite, vaga 1). A moto vai pro grid e fica presa até a largada */
  entrarNaCorridaCk(modo: ModoCk, convite?: { semente: number; inicio: number }): boolean {
    if (this.moto === null) { this.o.onAviso?.("Venha de moto pro box de largada pra correr."); return false; }
    const pista = pistaPorId(PISTA_CK); if (!pista) return false;
    this.sairCorrida(); this.sairCorridaCk();
    const semente = convite?.semente ?? Math.floor(Math.random() * 2 ** 30), inicio = convite?.inicio ?? Date.now() + (modo === "dupla" ? ESPERA_DUPLA_MS : CONTAGEM_CK * 1000);
    const c = novaCorridaCk(modo, semente, inicio, convite ? 1 : 0), g = gridCk(pista, c.vaga);
    this.motoEst = { ...motoParada(g.x, g.y, g.z, g.rumo), tanque: 1 }; this.motoPousado = false; this.autoPouso = false;
    this.voY.subir = this.voY.descer = false; this.camAz = g.rumo + Math.PI; this.camSegueEm = 0;
    const bots = c.bots.map((b) => {
      const moto = loteMoto(criarMoto({ cor: b.cor, low: this.o.low })), grupo = new THREE.Group(); grupo.add(moto.group);
      // o piloto: um boneco de luz na cor do bot (leve — não é um avatar)
      const mat = new THREE.MeshStandardMaterial({ color: b.cor, emissive: b.cor, emissiveIntensity: 0.6, roughness: 0.5 });
      const corpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.7, 4, 8), mat); corpo.position.set(0, 1.35, -0.15); corpo.rotation.x = 0.5;
      const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), mat); cabeca.position.set(0, 1.95, 0.12);
      grupo.add(corpo, cabeca); this.cena.scene.add(grupo);
      return { b, g: grupo, moto, ck: 0 };
    });
    this.ck = { c, pista, bots, resultado: null, contou: -1 };
    this.pistas?.definir({ pista: pista.id, proximo: c.proximo });
    return true;
  }
  /** sai da corrida (ou fecha o resultado) */
  sairCorridaCk() {
    const k = this.ck; if (!k) return; this.ck = null;
    for (const x of k.bots) { x.moto.dispose(); x.g.traverse((n) => { const m = n as THREE.Mesh; if (m.isMesh && m.geometry) { m.geometry.dispose(); (m.material as THREE.Material).dispose?.(); } }); x.g.removeFromParent(); }
    this.pistas?.definir(this.corrida ? { pista: this.corrida.pista.id, proximo: this.corrida.c.proximo } : null);
  }
  private passoDaCorridaCk(de: { x: number; y: number; z: number }) {
    const k = this.ck!, agora = Date.now(), f = faseCk(k.c, agora);
    if (f.fase === "contagem") { const g = gridCk(k.pista, k.c.vaga); this.motoEst = { ...this.motoEst, x: g.x, y: g.y, z: g.z, vx: 0, vy: 0, vz: 0, yaw: g.rumo }; if (f.contagem <= 3 && f.contagem !== k.contou) { k.contou = f.contagem; this.som?.tocar("corrida-bip"); } return; }
    if (k.contou !== 0 && f.fase === "correndo") { k.contou = 0; this.som?.tocar("corrida-largada"); }
    if (f.fase === "fim") { if (!k.resultado) this.fecharCorridaCk(); return; }
    const antes = k.c.proximo, r = passoCk(k.c, k.pista, de, { x: this.motoEst.x, y: this.motoEst.y, z: this.motoEst.z }, agora);
    if (!r.pegou) return;
    k.c = r.c; this.som?.tocar("corrida-portao"); this.pistas?.definir({ pista: k.pista.id, proximo: k.c.proximo });
    if (k.pista.portoes[antes]!.tipo === "boost") this.motoEst = { ...this.motoEst, tanque: 1 };   // o anel âmbar enche o boost
  }
  /** acabou o tempo: quem pegou mais checkpoints ganha (a dupla: o placar dela vem da pose) */
  private fecharCorridaCk() {
    const k = this.ck!, agora = Date.now(), cr = crDe(k.c);
    const lista: Concorrente[] = [{ id: this.o.eu.id, nome: "Você", cor: this.corDe(this.o.eu.id), ck: k.c.meus, eu: true }, ...k.bots.map((x) => ({ id: x.b.id, nome: x.b.nome, cor: x.b.cor, ck: botEm(x.b, k.pista, k.c, agora).ck }))];
    if (k.c.modo === "dupla") for (const a of this.remotos.values()) if (a.cr === cr) lista.push({ id: a.id, nome: a.name, cor: a.color, ck: a.ck ?? 0 });
    lista.sort((a, b) => b.ck - a.ck);
    k.resultado = { lista, vencedores: vencedores(lista) };
    this.som?.tocar("corrida-fim");
  }
  /** os bots andando pela pista (pelo relógio) */
  private atualizarBotsCk(t: number) {
    const k = this.ck!, agora = Date.now();
    for (const x of k.bots) {
      const p = botEm(x.b, k.pista, k.c, agora), f = faseCk(k.c, agora).fase;
      x.g.position.set(p.x, p.y, p.z); x.g.rotation.y = p.rumo; x.ck = p.ck;
      x.moto.atualizar({ dt: 1 / 60, t, voando: true, vel: f === "correndo" ? x.b.vel : 0, curva: 0 });
    }
  }
  /** o que a tela da corrida de checkpoints mostra (null fora dela) */
  get corridaCkHud(): { modo: ModoCk; fase: "contagem" | "correndo" | "fim"; contagem: number; resta: number; meus: number; seta: number; dist: number; resultado: { lista: Concorrente[]; vencedores: Concorrente[] } | null } | null {
    const k = this.ck; if (!k) return null;
    const f = faseCk(k.c, Date.now()), g = k.pista.portoes[k.c.proximo]!, m = this.motoEst;
    this.cam.getWorldDirection(this.vCorrida);
    const frente = Math.atan2(this.vCorrida.x, this.vCorrida.z), alvo = Math.atan2(g.x - m.x, g.z - m.z);
    let seta = frente - alvo; while (seta > Math.PI) seta -= 2 * Math.PI; while (seta < -Math.PI) seta += 2 * Math.PI;
    return { modo: k.c.modo, fase: f.fase, contagem: f.contagem, resta: f.resta, meus: k.c.meus, seta, dist: Math.hypot(g.x - m.x, g.z - m.z), resultado: k.resultado };
  }
  /** o BOX DE LARGADA: estou nele (de moto, fora de corrida)? quem mais está (pra dupla) e os convites de dupla abertos */
  get boxCk(): { parceiros: { id: string; nome: string }[]; convites: { id: string; nome: string; semente: number; inicio: number }[] } | null {
    if (this.moto === null || this.ck || this.corrida || !noBoxCk({ x: this.motoEst.x, y: this.motoEst.y, z: this.motoEst.z })) return null;
    const agora = Date.now(), parceiros: { id: string; nome: string }[] = [], convites: { id: string; nome: string; semente: number; inicio: number }[] = [];
    for (const a of this.remotos.values()) {
      if (a.moto && noBoxCk({ x: a.pos.x, y: a.alt, z: a.pos.z })) parceiros.push({ id: a.id, nome: a.name });
      const cv = lerCr(a.cr); if (cv && cv.inicio - agora > 1500 && cv.inicio - agora < ESPERA_DUPLA_MS + 5000) convites.push({ id: a.id, nome: a.name, ...cv });   // (dá tempo de chegar no grid)
    }
    return { parceiros, convites };
  }
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
    if (!this.menu) { this.atualizarNivel(); this.atualizarFluxo(dt); this.atualizarDuelo(dt); this.conferirElevadorTC(); this.cidade?.capsulaDentro(this.nivel === "lounge" ? this.elevTC?.poco.id ?? this.esperandoCapsula : null); }
    this.atualizarClarao(dt);
    this.distorcaoCosmica(t);   // (os NÍVEIS separados: só o meu existe — lib/cyber/niveis; e o FLUXO das pistas cósmicas)

    // MENU: segurar ESPAÇO p/ viajar; personagem fica sentado contemplando
    if (this.menu) {
      if (this.espaco) { this.holdT += dt; if (this.o.els.hold) this.o.els.hold.style.width = Math.min(100, (this.holdT / 1.2) * 100) + "%"; if (this.holdT >= 1.2) this.iniciar("viajar"); }
      else if (this.holdT > 0) { this.holdT = Math.max(0, this.holdT - dt * 2); if (this.o.els.hold) this.o.els.hold.style.width = (this.holdT / 1.2) * 100 + "%"; }
      const s = this.assento(); eu.pos.set(s.x, 0, s.z); eu.facing = this.rotAssento(); this.sitT = 1; eu.moving = false;
    } else if (this.noCarro()) {
      // CARRO: a mesma física das motos (lib/cyber/motoFisica) — só DIRIGINDO; fechando/abrindo a cabine ele fica parado
      const cr = this.carro!;
      if (this.fio) { const q = this.posNoFluxo(); cr.est = { ...cr.est, x: q.x, y: q.y - CARRO_PAIRA, z: q.z, yaw: q.rumo, vx: 0, vy: 0, vz: 0 }; cr.pousado = false; cr.potencia = 1; }   // (o FLUXO leva o carro com a pessoa dentro)
      else if (cr.fase === "dirigindo") {
        const c = this.comandoDeMoto(); cr.potencia = Math.max(0, c.acel) + (c.boost ? 0.5 : 0);
        if (c.boost && !cr.boost) this.som.tocar("carro-turbo", null, { dist: DISTANCIA.naveLocal, seguir: cr.h.group });   // (o NITRO: o baque + o sopro abrindo + o assobio)
        cr.boost = c.boost;
        const r = passoMotoSub(cr.est, c, dtReal, this.solidosDeVoo(), MOTO.teto); cr.est = r.s; cr.pousado = r.pousado; if (r.pousado) this.autoPouso = false;
      } else { cr.potencia = 0; cr.est = { ...cr.est, vx: 0, vy: 0, vz: 0 }; }
      eu.pos.set(cr.est.x, 0, cr.est.z); eu.facing = cr.est.yaw; eu.moving = Math.hypot(cr.est.vx, cr.est.vz) > 1; this.sitT = 0;
    } else if (this.moto !== null) {
      // MOTO: pilotagem de moto (lib/cyber/motoFisica) — W/S acelera/freia, A/D esterça, Shift/⚡ boost
      const c = this.comandoDeMoto(); this.acelMoto = c.acel;
      const deCorrida = { x: this.motoEst.x, y: this.motoEst.y, z: this.motoEst.z };
      if (this.corrida?.c.fase === "contagem" || (this.ck && faseCk(this.ck.c, Date.now()).fase === "contagem")) { c.acel = 0; c.boost = false; c.subir = c.descer = false; }   // no grid: o motor ronca, a moto não sai
      const boostAntes = this.motoEst.boost;
      const r = this.emergir && this.passoEmergir(dt) ? { s: { ...this.motoEst, x: eu.pos.x, y: eu.alt, z: eu.pos.z, yaw: eu.facing, vx: 0, vy: 0, vz: 0 }, pousado: false }   // (SAINDO do buraco negro, montado: o arco leva a moto)
        : this.fio ? (() => { const q = this.posNoFluxo(); return { s: { ...this.motoEst, x: q.x, y: q.y, z: q.z, yaw: q.rumo, vx: 0, vy: 0, vz: 0 }, pousado: false }; })()   // (o FLUXO leva a moto com a pessoa)
        : passoMotoSub(this.motoEst, c, dtReal, this.solidosDeVoo(), MOTO.teto, !!this.aprox);   // (no caminho de um buraco negro: o espaço sobe e desce livre)
      if (!r.pousado && rompeuBarreira(boostAntes, r.s.boost, Math.hypot(r.s.vx, r.s.vz))) this.ondaT = 0;   // acendeu o boost rápido: quebrou a barreira do som
      this.motoEst = r.s; this.motoPousado = r.pousado; if (r.pousado) this.autoPouso = false;
      if (this.corrida) this.passoDaCorrida(deCorrida, dtReal);
      if (this.ck) this.passoDaCorridaCk(deCorrida);
      eu.pos.set(r.s.x, 0, r.s.z); eu.facing = r.s.yaw; eu.moving = Math.hypot(r.s.vx, r.s.vz) > 1; this.sitT = 0;   // "andando" = a moto em movimento (o netcode extrapola)
    } else if (this.pilotando) {
      // VOO: WASD/joystick/direcional relativo à câmera; Espaço/E/SUBIR sobe; Shift/Q/DESCER desce; pousa ao encostar
      let ix = 0, iz = 0;
      if (this.keys.w || this.keys.arrowup) iz -= 1; if (this.keys.s || this.keys.arrowdown) iz += 1;
      if (this.keys.a || this.keys.arrowleft) ix -= 1; if (this.keys.d || this.keys.arrowright) ix += 1;
      if (this.joy.on) { ix += this.joy.x; iz += this.joy.y; }
      ix += this.botDir.x; iz += this.botDir.z;
      const subir = this.voY.subir, descerManual = this.voY.descer;
      this.cmdVoo.subir = subir; this.cmdVoo.descer = descerManual;
      if (ix || iz || subir || descerManual) { this.autoPouso = false; this.pararRota(); }
      // o TURBO (Shift / ⚡, como correr a pé): a nave cruza o mapa a 2,6× — com rampa, e só com a direção apertada
      const querTurbo = (!!this.keys.shift || this.boostBotao) && (ix !== 0 || iz !== 0) && !this.pousado;
      this.turboNave += ((querTurbo ? 1 : 0) - this.turboNave) * Math.min(1, dtReal / TURBO_NAVE.rampa);
      const dir = moverRelativoCamera(ix, iz, this.camAz);
      let cmd: ComandoVoo = { wx: dir?.wx ?? 0, wz: dir?.wz ?? 0, subir, descer: descerManual || this.autoPouso, turbo: this.turboNave };
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
      if (this.nascendo || this.tunel || this.emCena || this.viagemNave || (this.carro && this.carro.fase !== "parado")) { ix = 0; iz = 0; this.alvo = null; this.alvoDepois = null; }
      if ((this.conj && this.agora < this.conj.tFim) || this.escudoOn) { ix = 0; iz = 0; this.alvo = null; this.alvoDepois = null; }   // lançando / no escudo: plantado   // dentro do tubo / do túnel / numa cutscene: parado
      const correndo = (this.keys.shift || this.correr) && podeEsforcar(this.agua);   // (seco: anda)
      let andando = false;
      if (this.bordo) { const pn = this.poseNave(); if (pn) { const w = paraMundo(pn, this.bordo); eu.pos.x = w.x; eu.pos.z = w.z; } }   // a nave pode ter andado (o dono pilotando)
      if (this.tabletQuer || this.labAberto) { ix = 0; iz = 0; this.alvo = null; this.alvoDepois = null; }   // estudando no tablet: o avatar fica onde está
      this.euEmpurravel = atoresEmpurram({ andando: !!(ix || iz || this.alvo), tablet: this.tabletQuer || this.labAberto, descansando: !!this.descanso });
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
      // a ÁGUA: correndo e no turbo gasta; parado volta devagar; numa FONTE enche rápido. A vida segue a água
      { const ilhaY = this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY, c = CIDADE.centro;
        const f = this.naZaeon || this.plat === null ? naFonte(FONTES_AGUA, { x: eu.pos.x - c.x, z: eu.pos.z - c.z }, eu.alt - ilhaY) : null;
        this.fonteAgora = f?.nome ?? null;
        const turbando = this.jet.noAr && (this.keys.shift || this.correr) && podeEsforcar(this.agua) && Math.hypot(this.jetV.x, this.jetV.z) > 1;
        this.agua = passoAgua(this.agua, { correndo: !!correndo && !!dir && !this.jet.noAr, turbo: turbando, naFonte: !!f }, dt, this.agora);
        if (this.agora >= this.caidoAte && !this.nascendo) this.vida = Math.max(this.agua.v <= 0 ? 5 : 0, Math.min(VIDA_MAX, this.vida + efeitoNaVida(this.agua) * dt)); }   // (a sede não mata: a vida para em 5)
      const vel = (this.noTopo ? 2 : this.velAPe) * (this.ataque && !golpeAcabou(this.ataque, this.agora) ? 0.25 : 1);   // no topo: passos curtos; golpeando: quase parado
      const turbo = (this.keys.shift || this.correr) && this.jet.noAr && podeEsforcar(this.agua) ? VOO_TURBO : 1;   // no ar, correr = VOO TURBO (2× os jatos) — gasta água
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
      else if (this.wRifle > 0.4 && this.podeRifle() && !this.noTopo && !this.bordo) {   // COM O RIFLE: inércia, viradas, mira (lib/cyber/rifle)
        this.jetV = { x: 0, z: 0 }; this.impulsoFrente = false; this.alvo = null; this.alvoDepois = null;
        if (dir) { this.motoAlvo = null; this.falandoCom = null; }
        andando = this.moverComRifle(eu, dir, !!correndo, dt);
      }
      else if (dir) { this.velRifle = { x: dir.wx * vel, z: dir.wz * vel }; this.giroRifle = null; this.jetV = { x: 0, z: 0 }; this.impulsoFrente = false; this.motoAlvo = null; eu.pos.x += dir.wx * dt * vel; eu.pos.z += dir.wz * dt * vel; this.alvo = null; this.alvoDepois = null; andando = true; eu.facing = Math.atan2(dir.wx, dir.wz); this.falandoCom = null; }
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
      const sprintando = andando && !this.jet.noAr && this.velAPe > 11.5 && this.wRifle < 0.4;   // (com o rifle não tem sprint)
      this.wSprint += ((sprintando ? 1 : 0) - this.wSprint) * Math.min(1, dt * 7);
      this.wDash += ((this.dashAtivo ? 1 : 0) - this.wDash) * Math.min(1, dt * (this.dashAtivo ? 30 : 9));
      if (sprintando && !this.dashAtivo) { this.fantasmaT -= dt; if (this.fantasmaT <= 0) { this.fantasmaT = 0.045; this.fxMov?.vento(eu.av.group.position, { x: Math.sin(eu.facing), z: Math.cos(eu.facing) }, this.corDe(euId), 2); } }   // (sprint: só os riscos de vento)
      if (this.jet.noAr || sprintando) this.tFimDash = -Infinity;
      this.passoCombate(eu, t, dt, andando);
      this.passoMagia(t, dt);
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
      else if (this.emergir && this.passoEmergir(dt)) { andando = false; }   // (saindo do buraco negro do outro lado)
      else if (this.elevTC && this.passoElevadorTC(dt)) { andando = false; }   // (numa CÁPSULA da torre do Templo Cósmico)   // (saindo do buraco negro do outro lado)
      else if (this.fio) {
        // o FLUXO leva: a prancha de luz pela pista (as teclas não mexem) até o buraco negro do fim
        const q = this.posNoFluxo(); eu.pos.x = q.x; eu.pos.z = q.z; eu.facing = q.rumo; andando = false; this.alvo = null; this.alvoDepois = null;
      }
      else if (this.noCeu && this.viagem) {
        // a ESCADA DE ENERGIA leva: a posição segue o fluxo (as teclas não mexem), sem passo nem pulo
        const v = this.viagem; v.t += dt; const k = Math.min(1, v.t / durDaViagem(v.tipo)), q = posDaViagem(v.tipo, v.sentido, k, v.sala);
        eu.pos.x = q.p.x; eu.pos.z = q.p.z; eu.facing = q.rumo; andando = false; this.alvo = null; this.alvoDepois = null;
        if (k >= 1) { this.viagem = null; this.som.tocar("near-ping", eu.av.group.position, { dist: DISTANCIA.perto }); }
      }
      else if (this.noCeu) {
        // a RECEPÇÃO e os MIRANTES ficam no piso da Zaeon: do pé da escada sobe-se pro salão; a ilha (o cone) é sólida
        for (const rc of this.marcosDaZaeon()) { const r = resolverPasso(rc.mn, false, prev, eu.pos); eu.pos.x = r.x; eu.pos.z = r.z; if (r.alto) { this.altoEm = rc.lm.poi.id; this.yNav = r.y; break; } }
        // sem parede invisível na borda: passou do piso da ilha → cai
        const q = this.noCeu ? empurrarParaFora(resolverCidadeLivre(eu.pos), [...this.colisoresDoNivel("ceu"), ...colisoresDoAndar(eu.pos, eu.alt - (this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY)), ...this.colisoresDeNaves(CIDADE.pisoY), ...this.colisoresDeMotos(), ...this.colisoresDosTubos(), ...this.colisoresDeAtores()]) : { x: eu.pos.x, z: eu.pos.z }; eu.pos.x = q.x; eu.pos.z = q.z; if (this.noCeu) this.yNav = CIDADE.pisoY;
        if (!this.noCeu) { /* subiu pro pé da escada da Recepção: o resto é dela (resolverChao) */ }
        else if (!naIlhaPrincipal(q)) this.cairDaqui({ x: (q.x - prev.x) / Math.max(dt, 1e-3), z: (q.z - prev.z) / Math.max(dt, 1e-3) });
        // pisou na boca da escada de energia: ela te leva (pra cima, da central; pra baixo, do lounge)
        // (ou no anel do ELEVADOR DE LUZ da torre do DJ: só desce, da cabine até o palco)
        else {
          // (ou no anel do elevador da GARAGEM do lounge: sobe da plataforma das motos pro pátio, e desce)
          const bg = bocaDaGaragem(q), be = bg ? null : bocaDoElevador(q), bs = be || bg ? null : bocaDeEscada(q);
          let boca = bg ?? be ?? bs?.sentido ?? null;
          if (bs && boca && this.noFio(bs.sala) >= FIO.max) {   // o FIO já está puxando o máximo de gente: espera
            boca = null;
            if (t - this.avisoFioCheio > 4) { this.avisoFioCheio = t; this.o.onAviso?.(`Este fio de energia já está puxando ${FIO.max} pessoas — espere um instante.`); }
          }
          if (boca && !this.jet.noAr) { this.viagem = { tipo: bg ? "garagem" : be ? "elevador" : "escada", sentido: boca, t: 0, sala: bs?.sala }; this.alvo = null; this.alvoDepois = null; this.som.tocar("rise", eu.av.group.position, { dist: DISTANCIA.perto }); }
        }
      }
      else if (this.emNaveCw && !this.jet.noAr) {   // a pé na NAVE COWORKING: os dois andares, a escada, as paredes, os móveis; o portal da popa → a Zaeon
        const r = this.emNaveCw, n = NAVES[r], yRel = eu.alt - n.y, l = resolverNaNave(paraLocalCw(r, eu.pos), yRel), w = empurrarParaFora(paraMundoCw(r, l), this.colisoresDeAtores());
        eu.pos.x = w.x; eu.pos.z = w.z;
        const lw = paraLocalCw(r, w), piso = pisoNaNave(lw, yRel);
        if (piso === null) this.cairDaqui({ x: (eu.pos.x - prev.x) / Math.max(dt, 1e-3), z: (eu.pos.z - prev.z) / Math.max(dt, 1e-3) });
        else if (piso < yRel - 0.6) { this.cairDaqui(); }   // (degrau grande pra baixo — o vão da escada: cai)
        else this.pisoNaveCw = piso;
        if (noPortalDaNave(lw, yRel)) { if (this.portalNaveArmado) { this.portalNaveArmado = false; this.abrirDireto("zaeon"); } } else this.portalNaveArmado = true;
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
      if (d) { eu.assentoY = d.lugar.alturaAssento; eu.relaxa = d.lugar.relaxa ? 1 : 0; eu.pes = d.lugar.pes; eu.poseL = d.lugar.pose; }
      if (this.tabletQuer && !this.aPeParaTablet()) this.fecharTablet();
      this.tabletW = this.tabletQuer ? Math.min(1, this.tabletW + dt / TABLET.materializa) : Math.max(0, this.tabletW - dt / TABLET.some);
      eu.tab = this.tabletW;
      if (this.tabletQuer && !this.labAberto && this.tabletW >= 1) { this.labAberto = true; this.soltarTeclas(); this.o.onTablet?.(true); }
      // a dica da J / o botão do tablet: só avisa o React quando muda
      const noLounge = this.noCeu && salaEm({ x: eu.pos.x - CIDADE.centro.x, z: eu.pos.z - CIDADE.centro.z }) !== null && eu.alt > (this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY) + ALTURA_LOUNGE - 1;   // em qualquer uma das salas
      const pertoDeLugar = noLounge && (!!this.descanso || lugarPerto(eu.pos, this.outrosNaZaeon()) !== null);
      const podeDeitar = !!d?.lugar.deita, chave = `${noLounge}|${pertoDeLugar}|${m}|${podeDeitar}`;
      if (chave !== this.ultDescanso) { this.ultDescanso = chave; this.o.onDescanso?.({ pertoDeLugar, noLounge, modo: m, podeDeitar }); } }
    // DJ: parado na cabine do lounge (a pé) → é puxado pro lugar atrás da mesa e olha pra pista; o avatar põe o fone
    const souDJ = this.noCeu && !this.menu && !eu.moving && !this.jet.noAr && this.moto === null && !this.pilotando && !this.sobreNave && !this.bordo && naCabineDJ(eu.pos);
    eu.dj = (eu.dj ?? 0) + ((souDJ ? 1 : 0) - (eu.dj ?? 0)) * Math.min(1, dt * 4);
    if (souDJ) { const c = pontoDaCabineDJ(), k = Math.min(1, dt * 4); eu.pos.x += (c.x - eu.pos.x) * k; eu.pos.z += (c.z - eu.pos.z) * k; eu.facing = rumoDoDJ(); }
    // a PRANCHA CÓSMICA (out/2026, o dono: "uma nova forma de sprint — não mais correndo, numa prancha estilo hoverboard"):
    // no SPRINT, a pé no chão, sobe na prancha de luz (a mesma do fluxo cósmico) e desliza
    const naPrancha = this.wSprint > 0.5 && !this.jet.noAr && this.moto === null && !this.noCarro() && !this.pilotando && !this.menu;
    eu.surf = (eu.surf ?? 0) + ((this.viagem?.tipo === "elevador" || this.viagem?.tipo === "garagem" || naPrancha ? 1 : 0) - (eu.surf ?? 0)) * Math.min(1, dt * (naPrancha ? 8 : 5));
    this.somDaPrancha(naPrancha, dt); this.naPrancha = naPrancha && !this.fio && !this.viagem;
    eu.puxa = (eu.puxa ?? 0) + ((this.viagem?.tipo === "escada" ? 1 : 0) - (eu.puxa ?? 0)) * Math.min(1, dt * 5);
    // DANÇA: parado na PISTA do lounge → dança virado pro palco
    const danco = this.noCeu && !this.menu && !eu.moving && !this.jet.noAr && this.moto === null && !this.pilotando && !souDJ && naPistaDeDanca(eu.pos);
    eu.danca = (eu.danca ?? 0) + ((danco ? 1 : 0) - (eu.danca ?? 0)) * Math.min(1, dt * 3);
    if (danco) eu.facing = rumoDaPista();
    const lmAlto = this.altoEm ? this.lms.find((l) => l.poi.id === this.altoEm) : undefined;
    const pnAlt = this.bordo ? this.poseNave() : null;
    eu.alt = pnAlt && this.bordo ? alturaDoConves(pnAlt) + alturaNoBordo(this.bordo, rampaDaNave(pnAlt).queda)
      : this.emergir ? eu.alt   // (saindo do buraco negro: o arco manda — passoEmergir)
      : this.elevTC ? eu.alt   // (a cápsula da torre manda — passoElevadorTC)
      : this.noCarro() ? this.carro!.est.y + CARRO_PAIRA
      : this.moto !== null ? this.motoEst.y
      : this.pilotando ? this.naveEst.y
      : this.jet.noAr ? this.jet.y
      : this.sobreNave ? this.topoNave()
      : this.emNaveCw ? NAVES[this.emNaveCw].y + this.pisoNaveCw
      : this.plat ? PLATAFORMAS[this.plat.id].y + alturaDoAndar(this.plat.id, this.plat.andar)
      : this.ilhota !== null && this.cidade ? this.cidade.alturaIlhota(this.ilhota)
        : this.fio && !this.noCarro() && this.moto === null ? this.posNoFluxo().y + 0.35   // na prancha, em cima do fio
      : this.noCeu && this.viagem ? (this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY) + posDaViagem(this.viagem.tipo, this.viagem.sentido, Math.min(1, this.viagem.t / durDaViagem(this.viagem.tipo)), this.viagem.sala).y   // sendo levado: a altura do caminho
      : this.noCeu ? (() => { const y0 = this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY; return y0 + alturaNaCidade(eu.pos, eu.alt - y0); })()   // + o PALCO do lounge (escada = rampa); nos ANDARES (os lounges estudantis), o piso de quem está ali
      : this.noTopo ? this.alturaTopo() : (lmAlto?.poi.base ?? CHAO) + this.yNav + (lmAlto && marcoNav(lmAlto.poi) && this.yNav >= marcoNav(lmAlto.poi)!.nav.pisoY - 1e-6 ? this.boia(lmAlto) : 0);
    if (this.nascendo) eu.alt += 0.35;   // em pé no pedestal do tubo

    // BURACOS NEGROS: pisou no anel de um nó da rede → o TÚNEL (escolhe o destino); a pé, fora de veículo, no piso
    if (!this.menu && !this.pilotando && this.moto === null && !this.jet.noAr && !this.sobreNave && !this.bordo && !this.noTopo && !this.nascendo && !this.tunel && (!this.plat || this.plat.andar === 0)) {
      const no = noDoAnel(eu.pos, eu.alt);
      if (no && this.portalArmado) this.abrirTunel(no);
      else if (!no) this.portalArmado = true;
    }
    // o PAR DO DONO: a boca na cabine do DJ (lá em cima da torre) leva pra nave; a da nave (sala de reuniões) virou a
    // "call" do RITUAL (F — lib/cyber/ritual): o dono chega de nave, anunciado
    if (!this.menu && !this.pilotando && this.moto === null && !this.jet.noAr && !this.tunel && !this.bordo) {
      const naBoca = this.noCeu && naBocaDJ(eu.pos) && eu.alt > (this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY) + PISO_FESTA + TORRE_DJ.topo - 0.5;
      if (naBoca && this.bocaDonoArmada) {
        this.bocaDonoArmada = false;
        if (this.ehFundador(this.o.eu.id)) this.o.onBuracoDono?.("nave");
        else this.o.onAviso?.("Só o dono atravessa este buraco negro.");
      } else if (!naBoca) this.bocaDonoArmada = true;
    }

    // estar perto da própria base = estado de estudo (luz/cristais/botão)
    const perto = this.distBase(euId, eu.pos) < BASE_INTERACT_R;
    if (perto !== this.perto) { this.perto = perto; this.o.onPerto?.(perto); if (perto) this.som.tocar("near-ping", eu.av.group.position, { dist: DISTANCIA.perto }); }

    // rede: eu → difusão; remotos → atores
    const desc = codificarDescanso(this.descanso && this.descanso.fase !== "indo" && this.descanso.fase !== "levantando" ? this.descanso.modo : null, this.tabletW > 0.5);
    if (!this.menu && !this.instancia) this.o.enviarPos?.({ x: eu.pos.x, z: eu.pos.z, facing: eu.facing, moving: eu.moving, sit: this.sitT > 0.5, topo: this.noTopo, ceu: this.naZaeon, ...(desc ? { desc } : {}), ...(this.jet.noAr ? { jet: Math.round(this.jet.y * 100) / 100 } : {}), ...(this.sobreNave || this.ilhota !== null || this.plat || this.bordo || this.viagem || this.nascendo || (this.altoEm && !this.noCeu) || this.elevTC || this.noAndarDeCima || this.emNaveCw ? { alt: Math.round(eu.alt * 100) / 100 } : {}), ...(this.moto !== null ? { moto: { s: this.moto, y: Math.round(this.motoEst.y * 100) / 100, yaw: this.motoEst.yaw, ...(this.motoDe ? { de: this.motoDe } : {}) } } : {}), ...(this.motoLargada ? { motoLargada: this.motoLargada } : {}), ...(this.carro && this.carro.fase !== "parado" ? { carro: { c: this.carro.i, y: Math.round(this.carro.est.y * 100) / 100, yaw: this.carro.est.yaw } } : {}), ...(this.carroLargado ? { carroLargado: this.carroLargado } : {}), ...(movComRifle(this.movAgora(t), this.rifleEquipado() || this.wRifle > 0.5, this.wRifle > 0.5 && this.wMira > 0.5) ? { mov: movComRifle(this.movAgora(t), this.rifleEquipado() || this.wRifle > 0.5, this.wRifle > 0.5 && this.wMira > 0.5) } : {}), ...(this.bordo && !this.pilotando ? { bordo: { x: this.bordo.x, z: this.bordo.z, nivel: this.bordo.nivel, ...(this.bordo.esc !== undefined ? { esc: this.bordo.esc } : {}) } } : {}), ...(this.ck ? { ck: this.ck.c.meus, ...(this.ck.c.modo === "dupla" ? { cr: crDe(this.ck.c) } : {}) } : {}), ...(this.ataque ? { atk: codificarGolpe(this.ataque.seq, this.ataque.golpe.n) } : {}), ...(this.magEnviar && this.agora < this.magEnviar.ate ? { mag: this.magEnviar.v } : {}), ...(this.vida < VIDA_MAX ? { hp: this.vida } : {}), ...(this.revela > 0.5 ? { arma: 1 } : {}), ...(this.pilotando ? { voo: { y: this.naveEst.y, yaw: this.naveEst.yaw } } : this.naveForaDoHangar() ? { naveParada: { x: this.naveEst.x, y: this.naveEst.y, z: this.naveEst.z, yaw: this.naveEst.yaw } } : {}) });
    this.sincronizarRemotos(dt, t);
    this.atualizarNascimentoEGuia(dt);
    this.atualizarViagemNave(dt, t);   // o portal do M (o dono indo pra dentro da nave)
    this.atualizarConversa(dt);
    this.atualizarAgentes(dt, t);
    this.atualizarRitual(dt, t);
    this.atualizarZaeonCapela(t);
    if (this.holoZaeon && this.holoZaeon.fase() !== "oculto") this.holoZaeon.atualizar(dt, t, this.cam.position);

    // motos (antes dos avatares: quem está montado encaixa no banco/guidão/pedaleiras da moto já posicionada)
    const ocupadas = this.atualizarMotos(dt, t);
    this.atualizarPersonagens(dt, t);
    if (this.frota) {
      this.frota.mostrar(!this.instancia && !this.menu);
      this.frota.atualizar(dt, t, { noNivel: (p, y) => this.noMeuNivel(p, y), cam: this.cam.position, eu: { x: this.eu.pos.x, y: this.eu.alt, z: this.eu.pos.z }, camera: this.cam, largura: this.w, altura: this.h, ilhaY: this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY, pisoY: CIDADE.pisoY, musica: !!this.somLounge?.tocando,
        obstaculos: [{ x: this.eu.pos.x, z: this.eu.pos.z }, ...[...this.remotos.values()].map((a) => ({ x: a.pos.x, z: a.pos.z })), ...this.personagens.map((p) => ({ x: p.h.pos.x, z: p.h.pos.z }))] });
    }
    // avatares
    eu.av.group.position.set(eu.pos.x, eu.alt, eu.pos.z); eu.av.olharPara(eu.facing);
    // fora (vista da landing / menu): MEDITANDO em frente ao computador; na base: digitando; no ar: jatos acesos
    eu.av.recolherAsas(this.camPerto ? 0.7 : 0);   // a câmera perto: as asas recolhem em parte (abertas cobriam a tela)
    if (!this.menu) this.passoRifle(t, dt);
    if (!this.menu) this.passoCarro(t, dt);   // (fora do ramo a pé: de moto/pilotando o rifle também se desfaz)
    { const c = noCorpo(this.velRifle, eu.facing), comRifle = this.wRifle > 0.01 && !!this.rifle;
      eu.av.rifle(comRifle ? { naMao: this.wRifle, mira: this.wMira, frente: eu.moving ? c.frente : 0, lado: eu.moving ? c.lado : 0, coice: this.coice, alvo: this.alvoMira, arma: this.rifle!.group } : null);
      this.vestirTraje(eu); }   // o corpo de ASTRONAUTA (o personagem stock de todos)
    const tragadoAPe = !!this.fio && this.moto === null && !this.noCarro();   // (sem moto: voando de mochila pro buraco negro — não mais a prancha)
    eu.av.animar({ andando: eu.moving && !this.jet.noAr && this.moto === null && !this.noCarro() && (eu.surf ?? 0) < 0.5, correndo: (!!(this.keys.shift || this.correr) || this.dashAtivo) && eu.moving && this.moto === null && (eu.surf ?? 0) < 0.5 && (this.wRifle < 0.4 || Math.hypot(this.velRifle.x, this.velRifle.z) > 5), sentado: this.menu || this.pilotando ? 0 : this.sitT, meditando: this.menu && !this.pilotando ? 1 : 0, pilotando: this.pilotando ? 1 : 0, jato: this.jet.noAr ? (this.jet.tecla ? 1 : this.impulsoFrente ? 0.9 : 0.35) : tragadoAPe ? 0.9 : 0, ar: this.jet.noAr ? { vy: this.jet.vy, movendo: eu.moving, vel: Math.hypot(this.jetV.x, this.jetV.z) } : tragadoAPe ? { vy: 1, movendo: true, vel: 24 } : null, acao: this.moto === null && !this.pilotando ? { sprint: this.wSprint * (1 - Math.min(1, eu.surf ?? 0)), dash: this.wDash, alerta: Math.max(pesoAlerta(t - this.tFimDash), this.wGuardaArena), alertaT: this.wGuardaArena > pesoAlerta(t - this.tFimDash) ? 4 : t - this.tFimDash, espada: this.revela > 0.02 ? { golpe: this.ataque && !golpeAcabou(this.ataque, t) ? { n: this.ataque.golpe.n, u: (t - this.ataque.ini) / this.ataque.golpe.dur, ativo: [this.ataque.golpe.ativoIni / this.ataque.golpe.dur, this.ataque.golpe.ativoFim / this.ataque.golpe.dur] } : null, guarda: Math.max(pesoAlerta(t - this.tFimDash), this.wGuardaArena) } : null, heroi: t - this.tHeroi < 1.3 ? t - this.tHeroi : null, decola: t - this.tDecolou < this.esperaDecolou + 0.7 ? { t: t - this.tDecolou, espera: this.esperaDecolou } : null } : null, montado: this.moto !== null ? this.naMoto(eu.av, ocupadas.get(this.eu)) : this.noCarro() ? this.naCarro(eu.av) : null, dj: eu.dj ?? 0, danca: eu.danca ?? 0, surf: eu.surf ?? 0, prancha: this.naPrancha, puxado: eu.puxa ?? 0, descanso: { sentar: eu.sofa ?? 0, deitar: eu.deita ?? 0, assentoY: eu.assentoY ?? 0.7, relaxa: eu.relaxa ?? 0, pes: eu.pes, estilo: eu.poseL }, tablet: eu.tab ?? 0, dt: t < this.pausaAte ? 0 : this.moto === null && !this.jet.noAr && eu.moving && this.wRifle < 0.4 ? dt * Math.min(2, Math.max(1, this.velAPe / 7.5)) : dt, t });   // (hit-stop: a pose congela)   // (no sprint as pernas giram mais rápido)
    for (const a of this.remotos.values()) {
      const pilota = !!a.nave && !a.naveP, monta = a.moto ? ocupadas.get(a) ?? null : null;
      const ehDJ = !!a.ceu && !a.moving && a.jet === undefined && !pilota && monta === null && naCabineDJ(a.pos);   // a posição dele já vem puxada pra cabine pelo engine dele
      a.dj = (a.dj ?? 0) + ((ehDJ ? 1 : 0) - (a.dj ?? 0)) * Math.min(1, dt * 4);
      const dancando = !!a.ceu && !a.moving && a.jet === undefined && !pilota && monta === null && !ehDJ && naPistaDeDanca(a.pos);
      a.danca = (a.danca ?? 0) + ((dancando ? 1 : 0) - (a.danca ?? 0)) * Math.min(1, dt * 3);
      { const dd = decodificarDescanso(a.desc), ok = !!a.ceu && a.jet === undefined && !pilota && monta === null, kd = Math.min(1, dt * 4);   // SENTADO/DEITADO/TABLET dele (a posição já vem no lugar)
        a.sofa = (a.sofa ?? 0) + ((ok && dd.modo === "sentado" ? 1 : 0) - (a.sofa ?? 0)) * kd; a.deita = (a.deita ?? 0) + ((ok && dd.modo === "deitado" ? 1 : 0) - (a.deita ?? 0)) * kd;
        a.tab = Math.max(0, Math.min(1, (a.tab ?? 0) + (ok && dd.tablet ? dt / TABLET.materializa : -dt / TABLET.some)));
        if (dd.modo) { const lg = lugarEm(a.pos); a.assentoY = lg?.alturaAssento ?? 0.7; a.relaxa = lg?.relaxa ? 1 : 0; a.pes = lg?.pes; a.poseL = lg?.pose; } }
      // na escada só se está sendo levado; no elevador da torre, quem está no ar dentro da coluna de luz
      const qs = naSala(CIDADE.salas.lounge, a.pos.x - CIDADE.centro.x, a.pos.z - CIDADE.centro.z), naColuna = (Math.hypot(qs.x, qs.z - TORRE_DJ.elevador.sobe) < 1.6 && a.alt > CIDADE.pisoY + PISO_FESTA + PALCO_LOUNGE.h + 0.6) || naColunaDaGaragem(a.pos, a.alt - CIDADE.pisoY);
      // (+ a PRANCHA CÓSMICA: ele está no sprint — `mov` 1 — a pé no chão)
      const surfando = (!!a.ceu && a.jet === undefined && naColuna) || (a.mov === 1 && a.jet === undefined && monta === null && !pilota && !a.carro), puxado = false;   // (os fios de energia saíram: na escada de pedra se sobe andando)
      a.surf = (a.surf ?? 0) + ((surfando ? 1 : 0) - (a.surf ?? 0)) * Math.min(1, dt * 5);
      a.puxa = (a.puxa ?? 0) + ((puxado ? 1 : 0) - (a.puxa ?? 0)) * Math.min(1, dt * 5);
      a.av.group.position.set(a.pos.x, a.alt, a.pos.z); a.av.olharPara(pilota ? a.naveYaw ?? a.facing : a.facing);
      // de longe / fora da tela o avatar anima menos vezes por segundo (o mixer + IK de cada um custa); fora da tela
      // nem desenha (a malha com skinning não tem esfera confiável: frustumCulled=false) — perto continua animando
      // mesmo atrás de mim (o passo dele soa)
      const dCam = this.cam.position.distanceTo(a.av.group.position), naTela = this.frustum.intersectsSphere(this.esfAtor.set(a.av.group.position, 2.2)) || dCam < 4;
      a.av.group.visible = naTela && this.noMeuNivel(a.pos, a.alt);   // (de outro nível: não existe pra mim)
      const cada = dCam < 12 ? 0 : !naTela ? (dCam < 60 ? 0.1 : Infinity) : dCam > 120 ? 0.1 : dCam > 40 ? 0.05 : 1 / 40;   // 12–40 m: um quadro sim, um não (LOD de animação)
      a.acum = (a.acum ?? 0) + dt;
      const animou = a.acum >= cada;
      // o RIFLE dele: a velocidade medida da posição (os andares com a arma), atirando (decai) e a mira pra frente
      if (!a.rifle) this.vestirTraje(a);
      if (a.rifle) {
        const pa = a.posAntR ?? { x: a.pos.x, z: a.pos.z }, kv = Math.min(1, dt * 8), vx = (a.pos.x - pa.x) / Math.max(dt, 1e-3), vz = (a.pos.z - pa.z) / Math.max(dt, 1e-3);
        a.velR = { x: (a.velR?.x ?? 0) + (vx - (a.velR?.x ?? 0)) * kv, z: (a.velR?.z ?? 0) + (vz - (a.velR?.z ?? 0)) * kv }; a.posAntR = { x: a.pos.x, z: a.pos.z };
        a.atiraR = Math.max(0, (a.atiraR ?? 0) - dt / RIFLE.posturaDepoisDoTiro); a.pitchR = (a.pitchR ?? 0) * (1 - Math.min(1, dt * 0.5));
        const w = a.wRif ?? 0, c = noCorpo(a.velR, a.facing), d = direcaoDaMira(a.facing, a.pitchR ?? 0);
        a.rifle.atualizar(t, dt, { revela: w, calor: 0 });
        this.vestirTraje(a);
        a.av.rifle(w > 0.01 && a.jet === undefined && !a.moto && !pilota ? { naMao: w, mira: Math.max(a.wMiraR ?? 0, Math.min(1, (a.atiraR ?? 0) * 4)), frente: a.moving ? c.frente : 0, lado: a.moving ? c.lado : 0, coice: 0, alvo: this.vRastroP.set(a.pos.x + d.x * 30, a.alt + 1.45 + d.y * 30, a.pos.z + d.z * 30).clone(), arma: a.rifle.group } : null);
      }
      const noCarroDele = a.carro ? this.carros[a.carro.c] : undefined;   // (dirigindo um carro: sentado nele, as mãos no manche)
      if (animou) { a.av.animar({ montado: monta !== null ? this.naMoto(a.av, monta) : noCarroDele ? this.naCarro(a.av, noCarroDele) : null, andando: a.moving && a.jet === undefined && !pilota && monta === null && !noCarroDele && (a.surf ?? 0) < 0.5 && (a.puxa ?? 0) < 0.5, sentado: pilota || monta !== null || noCarroDele ? 0 : a.sit, pilotando: pilota ? 1 : 0, jato: a.jet !== undefined ? (a.vyJet ?? 0) > -3 ? 0.9 : 0.3 : 0, ar: a.jet !== undefined ? { vy: a.vyJet ?? 0, movendo: a.moving } : null, dj: a.dj ?? 0, danca: a.danca ?? 0, surf: a.surf ?? 0, prancha: a.mov === 1, puxado: a.puxa ?? 0, descanso: { sentar: a.sofa ?? 0, deitar: a.deita ?? 0, assentoY: a.assentoY ?? 0.7, relaxa: a.relaxa ?? 0, pes: a.pes, estilo: a.poseL }, tablet: a.tab ?? 0, acao: { sprint: (a.wSpR ?? 0) * (1 - Math.min(1, a.surf ?? 0)), dash: a.wDaR ?? 0, alerta: a.wAlR ?? 0, alertaT: t - (a.tMov ?? t), heroi: a.mov === 4 ? t - (a.tMov ?? t) : null, decola: a.mov === 5 ? { t: t - (a.tMov ?? t), espera: 0.07 } : null, espada: !a.espada || (a.revela ?? 0) <= 0.02 ? null : { golpe: a.golpe ? { n: a.golpe.g.n, u: Math.min(1, (t - a.golpe.ini) / a.golpe.g.dur), ativo: [a.golpe.g.ativoIni / a.golpe.g.dur, a.golpe.g.ativoFim / a.golpe.g.dur] } : null, guarda: a.moving ? 0 : 1 } }, dt: Math.min(0.1, a.acum), t }); a.acum = 0; }
      matrizDoAvatar(a.av.group, animou);   // o esqueleto dele só recalcula no quadro em que animou ou andou (components/cyber/matrizes)
      if (a.nave && a.naveP) { a.nave.group.position.set(a.naveP.x, a.naveP.y, a.naveP.z); a.nave.group.rotation.y = a.naveP.yaw + GIRO_PLANTA; a.nave.atualizar({ dt, t, voando: false, vel: 0, curva: 0 }); }
      else if (a.nave) { a.nave.group.position.set(a.pos.x, a.alt, a.pos.z); a.nave.group.rotation.y = (a.naveYaw ?? 0) + GIRO_PLANTA; a.nave.atualizar({ dt, t, voando: a.alt > CHAO + 0.5, vel: a.moving ? 1 : 0, curva: 0, fechada: true }); this.noAssento(a.av, a.nave); }
    }

    // cidade + a minha nave (parada onde pousou, ou comigo dentro)
    this.cidade?.jogadorEm({ x: this.eu.pos.x, y: this.eu.alt, z: this.eu.pos.z });   // (as pistas: a tempestade do buraco negro sente quem chega)
    if (this.cidade && this.regiaoPerto(this.cidade.group, "zaeon", AREA_ZAEON)) {
      // quem está na Zaeon (local da ilha): os motores de energia do Observatório da Terra reagem a eles
      const c = CIDADE.centro, pres: { x: number; z: number }[] = [];
      if (this.noCeu) pres.push({ x: this.eu.pos.x - c.x, z: this.eu.pos.z - c.z });
      for (const a of this.remotos.values()) if (a.ceu) pres.push({ x: a.pos.x - c.x, z: a.pos.z - c.z });
      this.cidade.presencas(pres);
      this.cidade.atualizar(dt, t); this.livros?.atualizar(t); this.relicario?.atualizar(dt, t, this.cam.position);
      if (this.bercario) { const v = this.tubosVisiveis(); this.bercario.group.visible = v; if (v) this.bercario.atualizar(dt, t); }
    }
    if (this.praca && this.regiaoPerto(this.praca.group, "praca")) this.praca.atualizar(dt, t);
    if (this.naveCw) { this.naveCw.nave.atualizar(dt, t); this.naveCw.casco.atualizar(dt, t); }
    if (this.somLounge) { this.somLounge.atualizar(dt); this.cidade?.somTocando(this.somLounge.tocando, this.somLounge.nivel); }
    this.atualizarShowLounge(dt); this.atualizarShowNave(dt, t);
    if (this.musicaNave) this.musicaNave.atualizar(dt); else if (this.musicaNavePendente?.som) this.setSomNave(this.musicaNavePendente.som, this.musicaNavePendente.offset);   // (a nave do dono apareceu: liga a música dela)
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
      this.nave.group.visible = this.pilotando || (!this.naveDoDonoFora() && this.noMeuNivel(this.naveEst, this.naveEst.y));
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
    // os ANÉIS das pistas só aparecem na PRAÇA (o dono, out/2026): em cima da plataforma dela, correndo, ou de moto
    // descendo pro nível dela por perto (pra achar o box de largada) — da Zaeon e do resto do mapa, não se veem
    if (this.pistas) { const ve = this.anelVisivel(); this.pistas.group.visible = ve; if (ve) this.pistas.atualizar(t); }
    if (this.corrida && this.moto === null) this.sairCorrida();
    if (this.ck && this.moto === null) this.sairCorridaCk();
    if (this.ck) this.atualizarBotsCk(t);
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
    // (a MINHA moto montada não entra no corte por nível: saindo do buraco negro, o arco passa por fora da área do nível
    //  de destino e ela sumia — eu voando sem moto, o bug do dono, out/2026)
    const minha = this.moto !== null ? this.instMotos.get("eu:r") : undefined;
    for (const m of this.instMotos.values()) { if (m === minha) { if (this.regioes.has(m.g)) this.soltarRegiaoDe(m.g); continue; } this.regiaoPerto(m.g, "moto"); }

    this.empurrarEstilhacos();
    this.atualizarCamera(dt);
    this.atmosferaTragada(dt);
    this.passoGravidade(dt, t);
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
    const desenhar = () => { this.R.clear(); this.cena.desenharFundo(this.R, this.qa.atual.nebulosa); this.R.clearDepth(); this.R.render(this.cena.scene, this.cam); this.desenharBalada(t); };
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
    this.quadrosSeg++; if (now - this.inicioSeg >= 1000) { this.fpsAgora = Math.round((this.quadrosSeg * 1000) / Math.max(1, now - this.inicioSeg)); this.quadrosSeg = 0; this.inicioSeg = now; }
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
        // regalias: o topo só pra quem o SERVIDOR marcou como fundador; a nave, o dono ou a tripulação — a Zaeon (céu) é aberta
        a.topo = p.topo === true && this.ehFundador(id);
        a.ceu = p.ceu === true;   // a Zaeon é aberta a todos (o topo e a nave continuam do dono)
        const piloto = this.podeNave(id), voando = piloto && !!p.voo, parada = piloto && !voando && p.naveParada ? p.naveParada : null;
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
        a.carro = !voando && p.carro ? p.carro : null; a.carroLargado = p.carroLargado ?? null;   // carro: qualquer pessoa
        a.ck = typeof p.ck === "number" ? p.ck : 0; a.cr = typeof p.cr === "string" ? p.cr : "";
        // a bordo: a posição LOCAL na nave, suavizada (os pacotes chegam a 15 Hz); troca de nível ou entrou agora = corte seco
        if (p.bordo) { const b = a.bordo, nb = p.bordo, k = Math.min(1, dt * 12);
          a.bordo = b && b.nivel === nb.nivel ? { x: b.x + (nb.x - b.x) * k, z: b.z + (nb.z - b.z) * k, nivel: nb.nivel, ...(nb.esc !== undefined ? { esc: (b.esc ?? nb.esc) + (nb.esc - (b.esc ?? nb.esc)) * k } : {}) } : { ...nb };
        } else a.bordo = null;
        const jetAnt = a.jet; a.jet = !voando && !a.moto && typeof p.jet === "number" ? p.jet : undefined;
        if (a.jet !== undefined && jetAnt !== undefined && dt > 0) a.vyJet = (a.vyJet ?? 0) + (((a.jet - jetAnt) / dt) - (a.vyJet ?? 0)) * Math.min(1, dt * 4); else a.vyJet = 0;
        const altAlvo = voando ? p.voo!.y : a.moto ? a.moto.y : a.carro ? a.carro.y + CARRO_PAIRA : a.jet !== undefined ? a.jet : typeof p.alt === "number" ? p.alt : a.topo ? this.alturaTopo() : a.ceu ? CIDADE.pisoY + alturaNaCidade(a.pos) : this.alturaChao(a.pos);
        a.alt += (altAlvo - a.alt) * (Math.abs(altAlvo - a.alt) > 40 ? 1 : Math.min(1, dt * 6));   // portal = corte seco
        // A BORDO da nave: em cima da nave que EU vejo (a minha, em tempo real, ou a do dono como chega aqui) — no mundo, a
        // posição dela vinha calculada sobre a nave ATRASADA da tela dela e ficava pra trás, fora da nave voando
        if (a.bordo) { const pn = this.poseNave(); if (pn) { const w = paraMundo(pn, a.bordo); a.pos.x = w.x; a.pos.z = w.z; a.alt = alturaDoConves(pn) + alturaNoBordo(a.bordo, this.quedaRampa()); } }
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
    // o "…" da ZAEON PENSANDO numa resposta: em cima da cabeça do holograma, os três pontos pulando
    { const h = this.holoZaeon, pensa = !!h && h.estaPensando() && h.fase() === "visivel" && !this.menu;
      if (pensa && !this.pensandoZ) { const el = document.createElement("div"); el.className = "zaeon-pensando"; el.setAttribute("aria-label", "A Zaeon está pensando"); el.innerHTML = "<i></i><i></i><i></i>"; this.o.overlay.appendChild(el); this.pensandoZ = el; }
      if (!pensa && this.pensandoZ) { this.pensandoZ.remove(); this.pensandoZ = null; }
      if (pensa && this.pensandoZ && h) { const ilhaY = this.cidade ? this.cidade.ilha.position.y : CIDADE.pisoY, a = h.ancora(); const p = this.proj(this.vHud.set(CIDADE.centro.x, ilhaY + a.y + 1.2, CIDADE.centro.z)); this.noHud(this.pensandoZ, p.x, Math.max(118, p.y), p.vis); } }   // (na cena, o topo da cabeça sai do quadro: o "…" fica na beirada)
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
    this.distorcao.svg?.remove(); this.R.domElement.style.filter = ""; this.vinheta?.remove(); if (this.bolha) { this.bolha.m.removeFromParent(); this.bolha.m.geometry.dispose(); this.bolha.mat.dispose(); } this.claraoEl?.remove(); if (this.rastros) { this.rastros.linhas.removeFromParent(); this.rastros.linhas.geometry.dispose(); (this.rastros.linhas.material as THREE.Material).dispose(); }
    if (this.relogioFrota) clearInterval(this.relogioFrota); this.relogioFrota = null;
    this.sairCorridaCk(); this.frota?.dispose(); this.frota = null; this.pistas?.dispose(); this.pistas = null;
    const w = window as unknown as { __cyber?: CyberEngine }; if (w.__cyber === this) delete w.__cyber;
    if (!this.vivo) return;   // idempotente (desmonta ao ir estudar e de novo no cleanup do React)
    this.vivo = false; cancelAnimationFrame(this.raf); this.ro?.disconnect(); this.io?.disconnect();
    this.cleanups.forEach((f) => f());
    for (const a of [this.eu, ...this.remotos.values()]) if (a) this.removerAtor(a);
    if (this.droid) { this.droid.h.dispose(); this.droid.tag.remove(); }
    for (const f of this.cine.faixas) f.remove(); this.cine.faixas = []; if (this.portais) for (const p of this.portais) p.dispose(); this.portais = null; this.pensandoZ?.remove(); this.pensandoZ = null;
    for (const p of this.personagens) { p.h.dispose(); p.tag.remove(); } this.personagens = [];
    this.falaZ = null; this.calarZaeon(); this.holoZaeon?.dispose();
    this.praca?.dispose(); this.desmontarNaveCw(); this.bercario?.dispose(); if (this.farol) { this.farol.geometry.dispose(); (this.farol.material as THREE.Material).dispose(); }
    this.poolBases?.dispose(); this.poolBases = null;
    for (const b of this.bases.values()) b.dispose(); this.baseQG?.dispose();
    for (const lm of this.lms) lm.dispose();
    this.somLounge?.dispose(); this.musicaNave?.dispose(); this.livros?.dispose(); this.livros = null; this.relicario?.dispose(); this.relicario = null; if (this.balada) { this.balada.veu.geometry.dispose(); (this.balada.veu.material as THREE.Material).dispose(); this.balada.luz.geometry.dispose(); (this.balada.luz.material as THREE.Material).dispose(); for (const f of this.balada.feixes) (f.material as THREE.Material).dispose(); this.balada.feixes[0]?.geometry.dispose(); this.balada = null; } if (this.showNave) { this.showNave.mandala.dispose(); this.showNave.nevoa.dispose(); this.showNave.group.removeFromParent(); } for (const c of this.carros) { if (c.loops) for (const n of LOOPS_CARRO) this.som.soltarLoop(c.loops[n]); c.h.dispose(); } this.carros = []; for (const p of this.pisosCarros) p.dispose(); this.pisosCarros = []; this.carro = null; this.som.dispose(); this.fxMagia?.dispose(); this.fxMagia = null; this.rifle?.dispose(); this.rifle = null; this.cruz?.remove(); this.cruz = null;
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

/** o DJ do lounge (out/2026): o SCHOLAR saiu da agenda da cidadela e ficou FIXO na cabine do DJ, comandando a festa
 *  (a música quem põe é o dono, da cabine da nave) */
const DJ_DO_LOUNGE = { id: "scholar", nome: "Scholar", cor: "#94a3b8", corMoto: "#64748b" } as const;
/** os personagens que vivem na cidadela (id = a chave de CORPOS_VRM e de PERFIS_VIDA — a agenda dele). Téo, Davi, Caio,
 *  Kekulé, Mendeleev e Eiffel saíram do mapa (pedido do dono, out/2026) */
const PERSONAGENS_DA_CIDADELA = [
  // reforma da capela (out/2026): só a EXAMINER anda pela cidadela — no altar do lounge e, com música, na pista
  // (lib/cyber/examiner). A Zaeon virou o holograma da capela; os outros saíram do mapa
  { id: "examiner", nome: "Examiner", cor: "#f87171", corMoto: "#dc2626" },
] as const;
/** quem trabalha no MIRANTE da torre de TI (o Templo Cósmico — lib/cyber/temploCosmico `CABINES_TORRE`, `quem`) */
const PERSONAGENS_DA_TORRE = [
  { id: "nina", nome: "Nina", cor: "#f472b6", corMoto: "#db2777" },
  { id: "teo", nome: "Téo", cor: "#60a5fa", corMoto: "#2563eb" },
] as const;
/** ligados por padrão; `?personagens=0` (ou NEXT_PUBLIC_CYBER_PERSONAGENS=0) desliga */
function personagensLigados(): boolean {
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("personagens") === "0") return false;
  return process.env.NEXT_PUBLIC_CYBER_PERSONAGENS !== "0";
}
