"use client";

import TelaCarregando from "./TelaCarregando";
import TabletLab from "./TabletLab";
import PainelAdminCyber from "./admin/PainelAdminCyber";
import InventarioPainel from "./InventarioPainel";
import type { Carregando } from "@/lib/cyber/carregamento";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LAB_ENTRADA, MSG_ENTRAR_ESTUDO, ehMsgEntrarEstudo } from "@/lib/ui/loungeHub";
import { detectarPerfil, precisaGirar, qualidadeDe } from "@/lib/cyber/dispositivo";
import { PREF_SFX, PREF_VOLUME, lerPrefs } from "@/lib/cyber/audio";
import { tocarUI } from "./AudioCyber";
import { MAX_TEXTO_RECADO, type MensagemChat, type Presenca, type RecadoQG } from "@/lib/lounge3d/tipos";
import { landmarksOn, type POI } from "@/lib/cyber/landmarks";
import { CyberEngine, type EstadoGuia, type PessoaCyber } from "./engine";
import { NOS, type IdNo } from "@/lib/cyber/buracos";
import { CHAVE_ONBOARDING, deveNascerNoTubo, tutorialLigado } from "@/lib/cyber/onboarding";
import TunelBuracoNegro, { type ModoTunel } from "./TunelBuracoNegro";
import RespostaZaeon from "./RespostaZaeon";
import type { PedidoZaeon, PerfilZaeon, PerguntaZaeon, TurnoZaeon } from "@/lib/cyber/conversaZaeon";
import { criarVoz, type VozHandle } from "./Voz";
import { transporteRealtime, vozLigada } from "@/lib/lounge3d/realtime";
import { ehTeclaFalar } from "@/lib/cyber/voz";
import { teclaDoRadio } from "@/lib/cyber/habilidades";
import type { CanalVoz } from "@/components/lounge/salaColyseus";
import Joystick from "./Joystick";
import ControlesVoo from "./ControlesVoo";
import PainelCorrida from "./PainelCorrida";
import type { EventoCorrida } from "@/lib/cyber/corrida/corrida";
import TocaDiscos, { type ApiMusica } from "./TocaDiscos";
import type { SomLounge } from "@/lib/lounge3d/musica";

export type CenaCyberProps = {
  /** "janela": prévia na landing (começa no menu, sem rede). "tela": cyberespaço inteiro (já em play, com a sala). */
  modo: "janela" | "tela";
  eu: PessoaCyber;
  membros: PessoaCyber[];
  remotos?: { current: Map<string, Presenca> };
  enviarPos?: (p: { x: number; z: number; facing: number; moving: boolean; sit: boolean }) => void;
  chat?: MensagemChat[];
  enviarChat?: (texto: string) => Promise<void> | void;
  /** só o dono da sala tem o token → só ele convida. */
  tokenConvite?: string | null;
  online?: number;
  /** aviso de rede ("tempo real indisponível", "sala cheia"…). */
  aviso?: string | null;
  onSessaoIniciada?: () => void;
  /** NUNCA entrou no cyberespaço (vem do SERVIDOR: User.cyberNasceuEm) → nasce num tubo de ensaio; sem isto (prévia,
   *  modo solo) vale o localStorage. `marcarNascimento` avisa o servidor que nasceu. */
  novoNoCyber?: boolean;
  marcarNascimento?: () => void;
  /** o que a pessoa contou pra Zaeon na capela (o servidor guarda em User.cyberPerfil — a memória dos agentes) */
  salvarPerfil?: (p: PerfilZaeon) => void;
  /** um turno GERATIVO da conversa com a Zaeon (o servidor: app/api/lounge3d/[id]/zaeon); sem isto, o roteiro local */
  conversarZaeon?: (p: PedidoZaeon) => Promise<TurnoZaeon>;
  /** a VOZ da Zaeon (o servidor: app/api/lounge3d/[id]/zaeon/voz) → WAV em base64 ou null; sem isto, ela fala só no balão */
  vozZaeon?: (texto: string) => Promise<string | null>;
  /** dono da Zaeon (vem do SERVIDOR) — só pinta os botões; quem decide é `pedirAcesso` */
  souFundador?: boolean;
  /** AÇÃO PRIVILEGIADA: pede ao servidor (POST /api/lounge3d/[id]/acesso): o topo da Recepção, a nave, o buraco negro do DJ */
  pedirAcesso?: (alvo: "topo" | "ceu" | "nave" | "dj") => Promise<{ ok: boolean; erro?: string }>;
  /** o recado ATUAL do dono pro mural da Recepção (holograma ao lado da mesa; a TV do lounge mostra o último enviado) */
  recadoQG?: RecadoQG | null;
  /** o DONO manda (texto) ou apaga (null) o recado — o servidor confere a sessão */
  enviarRecado?: (texto: string | null) => Promise<{ ok: boolean; erro?: string }>;
  /** o TOCA-DISCOS do lounge da Zaeon: a playlist/estado da sala, a diferença de relógio (servidor − cliente) e as
   *  ações do dono (subir/controlar/tirar) + a URL de cada música */
  somLounge?: SomLounge | null;
  offsetMusica?: number;
  musica?: (ApiMusica & { urlDe(arq: string): string }) | null;
  /** a NAVE-QG: onde ela está estacionada (da sala) e como o dono guarda onde a estacionou */
  naveQG?: { x: number; y: number; z: number; yaw: number } | null;
  salvarNave?: (pose: { x: number; y: number; z: number; yaw: number }) => void;
  /** VOZ (push-to-talk, NEXT_PUBLIC_VOZ=on + colyseus): o signaling da room e quem está online (userIds) */
  canalVoz?: CanalVoz | null;
  onlineIds?: string[];
};


export default function CenaCyber(p: CenaCyberProps) {
  const router = useRouter();
  const tela = p.modo === "tela";
  const cont = useRef<HTMLDivElement>(null), overlay = useRef<HTMLDivElement>(null);
  const monLabel = useRef<HTMLDivElement>(null);
  const engine = useRef<CyberEngine | null>(null);
  const [pronto, setPronto] = useState(false), [perto, setPerto] = useState(false), [menu, setMenu] = useState(!tela);
  // a TELA DE LOADING (modo tela): fica até o engine resolver (mundo + sons + shaders + 1º quadro) e sai com fade
  const [carga, setCarga] = useState<Carregando | null>(null), [loading, setLoading] = useState<"on" | "saindo" | "off">("on");
  const [falandoCom, setFalandoCom] = useState<string | null>(null), [abrindo, setAbrindo] = useState(false), [copiado, setCopiado] = useState(false);
  const [rota, setRota] = useState<"heliporto" | "zaeon" | null>(null);
  // o MODO ESTUDO no tablet (TabletLab) e o DESCANSO no lounge (J): o que o engine avisa
  const [tabletAberto, setTabletAberto] = useState(false);
  // o INVENTÁRIO (tecla I — lib/cyber/inventario): a arma equipada vai pra mão
  const [inventarioAberto, setInventarioAberto] = useState(false);
  const lerInventario = useCallback(() => engine.current?.inventario() ?? null, []);
  const equiparItem = useCallback((id: Parameters<CyberEngine["equipar"]>[0]) => engine.current?.equipar(id) ?? null, []);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const a = document.activeElement; if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || (a as HTMLElement).isContentEditable)) return;
      if (e.key.toLowerCase() === "i" && !e.repeat && !inventarioAberto) { e.preventDefault(); if (document.pointerLockElement) document.exitPointerLock(); setInventarioAberto(true); }
    };
    window.addEventListener("keydown", tecla); return () => window.removeEventListener("keydown", tecla);
  }, [inventarioAberto]);
  const [descanso, setDescanso] = useState<{ pertoDeLugar: boolean; noLounge: boolean; modo: "sentado" | "deitado" | null; podeDeitar: boolean }>({ pertoDeLugar: false, noLounge: false, modo: null, podeDeitar: false });
  /** o TÚNEL de um buraco negro aberto (escolhendo o destino / atravessando o par do dono) */
  const [tunel, setTunel] = useState<ModoTunel | null>(null);
  /** o tutorial do Droid (o passo atual) e as falas dele no chat (SÓ locais: o Droid é de cada um, nada vai pela rede) */
  const [guia, setGuia] = useState<EstadoGuia | null>(null), [falasDroid, setFalasDroid] = useState<MensagemChat[]>([]);
  /** a pergunta da Zaeon esperando resposta (o painel) */
  const [pergunta, setPergunta] = useState<(PerguntaZaeon & { n: number; total: number }) | null>(null);
  /** EXPULSO pelo Droid (desrespeitou a Zaeon): a tela vermelha e a saída */
  const [expulso, setExpulso] = useState(false);
  /** na INSTÂNCIA do tutorial (a Zaeon só dela, até o 1º portal): o chat da sala e quem está online ficam escondidos */
  const [instancia, setInstancia] = useState(false);
  /** a resposta pra Zaeon (do painel ou do chat): vai pra ela — e aparece no MEU chat (não vai pra sala) */
  const responderZaeon = (r: string) => {
    if (!engine.current?.responderZaeon(r)) return;
    setFalasDroid((xs) => [...xs.slice(-20), { id: `eu-${Date.now()}`, userId: cb.current.eu.id, name: cb.current.eu.name, color: cb.current.eu.color, texto: r, ts: Date.now() }]);
  };
  /** NASCE no tubo de ensaio? Quem nunca entrou no cyberespaço (o servidor diz; sem sala, o localStorage) ou forçado com
   *  ?nascer=1 ou com o MODO TUTORIAL ligado nas Configurações — decidido 1× (ao entrar) */
  const nascer = useMemo(() => {
    if (!tela || typeof window === "undefined") return false;
    let visto = false;
    if (p.novoNoCyber !== undefined) visto = !p.novoNoCyber;
    else try { visto = localStorage.getItem(CHAVE_ONBOARDING) === "1"; } catch { /* storage bloqueado */ }
    const forcar = new URLSearchParams(location.search).get("nascer") === "1" || tutorialLigado((k) => localStorage.getItem(k));
    return deveNascerNoTubo({ visto, forcar, fundador: !!p.souFundador });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [voo, setVoo] = useState<{ y: number } | null>(null);
  /** a AÇÃO de contexto (o que o F faz agora) — o chip "F · Estudar" etc.; no celular, tocar no chip faz a ação */
  const [acao, setAcao] = useState<{ rotulo: string } | null>(null);
  const [qg, setQg] = useState({ noCeu: false, navePerto: false, pilotando: false, pousado: true, moto: false, motoPerto: false }), [aviso2, setAviso2] = useState<string | null>(null);
  // o MODO ADMIN (só super admin): o contador bots × usuários e os controles por área da frota
  const contagemAdmin = useCallback(() => engine.current?.contagemAdmin() ?? null, []);
  const frotaAplicada = useCallback(() => engine.current?.recarregarFrota(), []);
  const [evCorrida, setEvCorrida] = useState<(EventoCorrida & { pista: string }) | null>(null);
  const avisar = useCallback((m: string) => { setAviso2(m); setTimeout(() => setAviso2((x) => (x === m ? null : x)), 3500); }, []);
  /** ação privilegiada: pergunta ao SERVIDOR antes (cb sempre fresco via ref) */
  const pedir = useCallback(async (alvo: "topo" | "ceu" | "nave" | "dj", ok: () => void) => {
    const fn = cb.current.pedirAcesso;
    if (!cb.current.souFundador || !fn) { avisar(alvo === "dj" ? "Só o dono atravessa este buraco negro." : alvo === "nave" ? "Só o dono pilota a nave." : "Só o dono sobe ao topo."); return; }
    try { const r = await fn(alvo); if (r.ok) ok(); else avisar(r.erro ?? "Não autorizado."); } catch { avisar("Sem conexão."); }
  }, [avisar]);
  const [poiAberto, setPoiAberto] = useState<POI | null>(null), [noTopo, setNoTopo] = useState(false), [subindo, setSubindo] = useState(false), [erroTopo, setErroTopo] = useState<string | null>(null);
  const [correndo, setCorrendo] = useState(false), [txt, setTxt] = useState(""), [falha, setFalha] = useState(false);
  // som: liga/desliga (`zaeon_sfx`) + volume mestre (`zaeon_volume`), lidos/gravados no localStorage
  const [som, setSom] = useState(() => (typeof window === "undefined" ? { ligado: true, volume: 0.8 } : lerPrefs((k) => { try { return localStorage.getItem(k); } catch { return null; } })));
  const [painelSom, setPainelSom] = useState(false);
  // RECADO pro QG: a caixa abre ao clicar na TV do lounge da Zaeon (só o dono)
  // VOZ: segurar G (ou o botão no celular) = falar
  const voz = useRef<VozHandle | null>(null), [falandoEu, setFalandoEu] = useState(false);
  const comVoz = tela && vozLigada() && !!p.canalVoz && !instancia;   // no tutorial (a Zaeon só dele) não fala nem ouve ninguém
  const [somAberto, setSomAberto] = useState(false);
  const [recadoAberto, setRecadoAberto] = useState(false), [recadoTxt, setRecadoTxt] = useState(""), [recadoEnviando, setRecadoEnviando] = useState(false);
  const mudarSom = (n: { ligado: boolean; volume: number }) => {
    setSom(n);
    try { localStorage.setItem(PREF_SFX, n.ligado ? "1" : "0"); localStorage.setItem(PREF_VOLUME, String(n.volume)); } catch { /* storage bloqueado */ }
    engine.current?.aplicarPrefsSom();
  };
  const touch = useMemo(() => typeof window !== "undefined" && (matchMedia("(pointer:coarse)").matches || "ontouchstart" in window), []);
  // ONDE está rodando (celular × desktop, aparelho fraco) → capas de efeito só onde precisa (lib/cyber/dispositivo)
  const perfil = useMemo(() => typeof window === "undefined" ? { movel: false, leve: false, fraco: false } : detectarPerfil({
    coarse: matchMedia("(pointer: coarse)").matches, toques: navigator.maxTouchPoints || 0, ua: navigator.userAgent, largura: innerWidth, altura: innerHeight,
    memoriaGB: (navigator as Navigator & { deviceMemory?: number }).deviceMemory, nucleos: navigator.hardwareConcurrency || undefined,
  }), []);
  const qualidade = useMemo(() => qualidadeDe(perfil), [perfil]);
  const low = qualidade.leve;
  // celular: o cyberespaço é NA HORIZONTAL — em pé, pede pra girar e pausa a cena
  const [girar, setGirar] = useState(false);
  useEffect(() => {
    if (!tela) return;
    const ver = () => setGirar(precisaGirar(perfil, innerWidth, innerHeight));
    ver(); window.addEventListener("resize", ver); window.addEventListener("orientationchange", ver);
    return () => { window.removeEventListener("resize", ver); window.removeEventListener("orientationchange", ver); };
  }, [tela, perfil]);
  useEffect(() => { engine.current?.pausar(girar); }, [girar, pronto]);
  /** Android: tela cheia + trava na horizontal (precisa de gesto do usuário); no iPhone só girar resolve */
  const telaCheiaHorizontal = useCallback(async () => {
    try { await document.documentElement.requestFullscreen?.({ navigationUI: "hide" }); } catch { /* sem tela cheia */ }
    try { await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape"); } catch { /* sem trava (iOS) */ }
  }, []);

  // callbacks sempre frescos sem recriar a engine
  const cb = useRef(p); cb.current = p;
  // contrato: a intenção sai como postMessage({type:"zaeon:enter-study"}) (mesma origem) → router.push("/research-lab?tab=pesquisa")
  const entrarEstudo = useCallback(() => { window.postMessage({ type: MSG_ENTRAR_ESTUDO }, window.location.origin); }, []);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (!ehMsgEntrarEstudo(e.data, e.origin, window.location.origin)) return;
      // O cyberespaço é pesado (WebGL + GLB): ao ir estudar ele é DESMONTADO já — nada de ficar vivo no background.
      tocarUI("study-confirm");   // som de UI fora da cena (ela some já já)
      engine.current?.dispose(); engine.current = null;
      setAbrindo(true);
      router.push(LAB_ENTRADA);   // primeira tela do laboratório = aba de Pesquisa
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [router]);

  useEffect(() => {
    if (!cont.current || !overlay.current) return;
    let cancelado = false, e: CyberEngine | null = null;
    CyberEngine.criar({
      container: cont.current, overlay: overlay.current, els: { menu: null, hold: null, monLabel: monLabel.current },
      eu: cb.current.eu, membros: cb.current.membros, menu: !tela, low, qualidade, teclasSempre: tela,
      remotos: cb.current.remotos, enviarPos: (x) => cb.current.enviarPos?.(x),
      onPerto: setPerto, onFalarCom: setFalandoCom, onEntrarEstudo: entrarEstudo,
      onTablet: (on) => { setTabletAberto(on); if (on) { engine.current?.soltarMouse(); tocarUI("study-confirm"); } }, onDescanso: setDescanso,
      onSessao: () => { setMenu(false); cb.current.onSessaoIniciada?.(); }, onPronto: () => setPronto(true), onCarregando: setCarga,
      landmarks: landmarksOn(), onLandmark: (poi) => { setErroTopo(null); setPoiAberto(poi); }, onTopo: (v) => { setNoTopo(v); if (v) setPoiAberto(null); },
      // os BURACOS NEGROS: o da rede abre o túnel com os destinos (aberto a todos); o par do dono pede acesso antes
      onTunel: (t) => { engine.current?.soltarMouse(); setTunel({ tipo: "escolher", origem: t.origem, nomeOrigem: NOS[t.origem].nome, destinos: t.destinos }); },
      onBuracoDono: (para) => { void pedir("dj", () => setTunel({ tipo: "dono", para })); },
      onAviso: avisar,
      nascer, onGuia: (g) => { setGuia(g); if (!g) { cb.current.marcarNascimento?.(); try { localStorage.setItem(CHAVE_ONBOARDING, "1"); } catch { /* storage bloqueado */ } } },   // o tutorial acabou (ou foi pulado): da próxima vez nasce na base
      onInstancia: setInstancia,
      conversarZaeon: cb.current.conversarZaeon ? (pd) => cb.current.conversarZaeon!(pd) : undefined,
      vozZaeon: cb.current.vozZaeon ? (t) => cb.current.vozZaeon!(t) : undefined,
      onExpulso: () => {
        setExpulso(true); setPergunta(null); setGuia(null); engine.current?.soltarMouse();
        setTimeout(() => { engine.current?.dispose(); engine.current = null; router.push("/"); }, 3200);
      },
      onPergunta: setPergunta, onPerfil: (perfil) => cb.current.salvarPerfil?.(perfil),
      onFalaAgente: (f) => setFalasDroid((xs) => [...xs.slice(-20), { id: `agente-${Date.now()}-${xs.length}`, userId: `agente:${f.id}`, name: f.nome, color: f.cor, texto: f.texto, ts: Date.now() }]),
      onEmbarcar: () => { void pedir("nave", () => engine.current?.embarcar()); },
      onEstadoQG: setQg, onAcao: setAcao, onCorrida: setEvCorrida,
      onVoo: setVoo,
      onRota: setRota,
      remotosSuaves: transporteRealtime() === "colyseus",
      onNaveParada: (pose) => cb.current.salvarNave?.(pose),
      onAbrirSom: () => { if (!cb.current.souFundador || !cb.current.musica) { avisar("Só o dono da Zaeon mexe no toca-discos."); return; } setSomAberto(true); },
      urlMusica: cb.current.musica ? (arq: string) => cb.current.musica!.urlDe(arq) : undefined,
      onAbrirRecado: () => { if (!cb.current.souFundador || !cb.current.enviarRecado) { avisar("Só o dono da Zaeon escreve no mural."); return; } setRecadoTxt(""); setRecadoAberto(true); },
    }).then((eng) => { if (cancelado) { eng.dispose(); return; } e = eng; engine.current = eng; eng.exporDepuracao(); eng.setPessoas(cb.current.membros); setLoading("saindo"); setTimeout(() => setLoading("off"), 550); })
      .catch(() => { if (!cancelado) setFalha(true); });
    return () => { cancelado = true; e?.dispose(); engine.current = null; };
    // a engine é criada uma vez por montagem; mudanças vão por métodos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { engine.current?.setPessoas(p.membros); }, [p.membros]);
  // VOZ: a malha WebRTC vive enquanto houver o canal (Colyseus); o áudio de quem fala sai pelo avatar dele
  useEffect(() => {
    if (!comVoz || !p.canalVoz) return;
    const v = criarVoz({ euId: p.eu.id, canal: p.canalVoz, aoAudio: (id, s) => engine.current?.vozDe(id, s), aoErro: avisar });
    voz.current = v;
    return () => { v.dispose(); voz.current = null; setFalandoEu(false); };
  }, [comVoz, p.canalVoz, p.eu.id, avisar]);
  useEffect(() => { voz.current?.pares(p.onlineIds ?? []); }, [p.onlineIds, comVoz]);
  const falar = useCallback((on: boolean) => { if (!voz.current) return; setFalandoEu(on); void voz.current.segurar(on); }, []);
  useEffect(() => {
    if (!comVoz) return;
    const digitando = () => { const a = document.activeElement; return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || (a as HTMLElement).isContentEditable); };
    const tecla = teclaDoRadio(!!p.souFundador);   // G — ou V, se o G é uma habilidade sua (lib/cyber/habilidades)
    const baixo = (e: KeyboardEvent) => { if (ehTeclaFalar(e, digitando(), tecla)) { e.preventDefault(); falar(true); } };
    const cima = (e: KeyboardEvent) => { if (e.key.toLowerCase() === tecla) falar(false); };
    const solta = () => falar(false);
    window.addEventListener("keydown", baixo); window.addEventListener("keyup", cima); window.addEventListener("blur", solta);
    return () => { window.removeEventListener("keydown", baixo); window.removeEventListener("keyup", cima); window.removeEventListener("blur", solta); };
  }, [comVoz, falar, p.souFundador]);
  // OLHAR LIVRE (mouse travado): abriu um painel → solta o mouse pra clicar nele; Enter (fora de um campo) → solta e
  // foca o chat (dá pra falar sem precisar do Esc antes)
  const chatRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { if (poiAberto || recadoAberto || somAberto) engine.current?.soltarMouse(); }, [poiAberto, recadoAberto, somAberto]);
  // a nave-QG estacionada (da sala): vale enquanto o dono não mexe nela nesta sessão
  useEffect(() => { engine.current?.setNaveQG(p.naveQG ?? null); }, [p.naveQG, pronto]);
  // o toca-discos: o estado da sala vai pro player (a música sai das caixas do lounge, sincronizada)
  useEffect(() => { engine.current?.setSomLounge(p.somLounge ?? null, p.offsetMusica ?? 0); }, [p.somLounge, p.offsetMusica, pronto]);
  useEffect(() => {
    const enter = (e: KeyboardEvent) => {
      const a = document.activeElement, campo = !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || (a as HTMLElement).isContentEditable);
      if (e.key !== "Enter" || campo || !chatRef.current || !document.pointerLockElement) return;
      e.preventDefault(); engine.current?.soltarMouse(); chatRef.current.focus();
    };
    window.addEventListener("keydown", enter); return () => window.removeEventListener("keydown", enter);
  }, []);
  // o recado atual: holograma no QG + a TV do lounge (e um "ping" quando chega um novo)
  useEffect(() => { engine.current?.setRecado(p.recadoQG ?? null); }, [p.recadoQG, pronto]);

  // chat da sala → balões sobre os avatares
  const vistas = useRef(0);
  useEffect(() => {
    const c = p.chat ?? [];
    if (c.length < vistas.current) vistas.current = 0;
    for (let i = vistas.current; i < c.length; i++) engine.current?.falar(c[i]!.userId, c[i]!.texto);
    vistas.current = c.length;
  }, [p.chat]);

  if (falha) return <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#03030a] px-6 text-center text-sm text-white/70">Não deu para iniciar o cyberespaço 3D neste aparelho.<button onClick={entrarEstudo} className="min-h-[44px] rounded-full bg-cyan-400 px-5 font-semibold text-slate-950">Ir para a Sala de Estudos</button></div>;

  // com a Zaeon esperando resposta, o chat RESPONDE A ELA (não vai pra sala)
  const enviar = () => { const t = txt.trim(); if (!t) return; if (pergunta) responderZaeon(t); else void p.enviarChat?.(t); setTxt(""); };
  const mandarRecado = async (texto: string | null) => {
    const fn = p.enviarRecado; if (!fn || recadoEnviando) return;
    if (texto !== null && !texto.trim()) return;
    setRecadoEnviando(true);
    try { const r = await fn(texto === null ? null : texto.trim()); if (r.ok) { setRecadoAberto(false); avisar(texto === null ? "Recado apagado do mural." : "Recado no mural da Recepção ✦"); tocarUI("chat-pop"); } else avisar(r.erro ?? "Não deu pra enviar."); }
    catch { avisar("Sem conexão."); }
    finally { setRecadoEnviando(false); }
  };
  const convidar = async () => {
    if (!p.tokenConvite) return;
    const url = `${location.origin}/lounge-cosmico?sala=${p.tokenConvite}`;
    try { await navigator.clipboard.writeText(url); } catch { window.prompt("Copie o link de convite:", url); }
    setCopiado(true); setTimeout(() => setCopiado(false), 2200);
  };

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-[#03030a] text-[#e7ecff]">
      <div ref={cont} className="absolute inset-0" />
      <div ref={overlay} className="pointer-events-none absolute inset-0 overflow-hidden" />
      {/* o laboratório no TABLET, por cima da cena (o cyberespaço segue vivo atrás) */}
      <TabletLab aberto={tabletAberto} onFechar={() => { engine.current?.fecharTablet(); setTabletAberto(false); }} />
      <InventarioPainel aberto={inventarioAberto} onFechar={() => setInventarioAberto(false)} ler={lerInventario} equipar={equiparItem} />

      {/* rótulo do monitor (hover) */}
      <div ref={monLabel} className="pointer-events-none absolute z-[22] hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-gradient-to-b from-cyan-100 to-sky-400 px-3 py-1.5 text-[12.5px] font-bold text-slate-950 shadow-[0_0_18px_rgba(90,200,255,.7)] data-[longe=true]:border data-[longe=true]:border-sky-300/35 data-[longe=true]:bg-slate-900/80 data-[longe=true]:from-transparent data-[longe=true]:to-transparent data-[longe=true]:text-sky-100 data-[longe=true]:shadow-none" />

      {/* janela da landing = só a VISTA do cyberespaço: sem menu, sem frases, sem tutorial */}

      {/* HUD de jogo (fora do menu) */}
      {!menu && (
        <>
          {/* interface limpa: sem dicas/tutorial na tela */}
          {tela && (
            <button type="button" onClick={() => router.push("/")} className="absolute left-3 top-3 z-20 min-h-[44px] rounded-full border border-white/20 bg-black/50 px-4 text-xs font-medium text-white backdrop-blur focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400">← Sair</button>
          )}
          {tela && (
            <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
              <PainelAdminCyber contagem={contagemAdmin} aplicada={frotaAplicada} />
              <div className="relative">
                <button type="button" aria-label={som.ligado ? "Som (ligado)" : "Som (desligado)"} aria-expanded={painelSom} onClick={() => setPainelSom((v) => !v)} className="flex h-[44px] w-[44px] items-center justify-center rounded-full border border-white/15 bg-black/50 text-base text-white/85 backdrop-blur">{som.ligado && som.volume > 0 ? "🔊" : "🔇"}</button>
                {painelSom && (
                  <div className="absolute right-0 top-[52px] z-30 w-[200px] rounded-2xl border border-white/15 bg-[#070c22]/90 p-3 text-xs text-white/85 backdrop-blur">
                    <label className="flex items-center justify-between gap-2"><span>Som</span><input type="checkbox" checked={som.ligado} onChange={(e) => mudarSom({ ...som, ligado: e.target.checked })} /></label>
                    <label className="mt-2 block">Volume<input type="range" min={0} max={1} step={0.05} value={som.volume} onChange={(e) => mudarSom({ ...som, volume: Number(e.target.value) })} className="mt-1 w-full" aria-label="Volume" /></label>
                  </div>
                )}
              </div>
              {typeof p.online === "number" && !instancia && <span className="rounded-full border border-white/15 bg-black/50 px-3 py-2 text-xs text-white/80">{p.online}/5 online</span>}
              {p.tokenConvite && <button type="button" onClick={convidar} className="min-h-[44px] rounded-full border border-cyan-300/40 bg-cyan-400/15 px-4 text-xs font-semibold text-cyan-100 backdrop-blur focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400">{copiado ? "Link copiado ✓" : "Convidar"}</button>}
            </div>
          )}
          {/* LOUNGE: sentar/deitar (J) e o modo estudo no TABLET (T) — o laboratório abre por cima e o avatar fica aqui */}
          {tela && descanso.noLounge && !tabletAberto && (
            <div className="absolute left-1/2 z-[21] flex -translate-x-1/2 items-center gap-2" style={{ bottom: touch ? 168 : 28 }}>
              {(descanso.pertoDeLugar || descanso.modo) && (
                <button type="button" onClick={() => engine.current?.alternarDescanso()} className="min-h-[40px] rounded-full border border-violet-300/35 bg-[#0a081e]/75 px-4 text-xs font-semibold text-violet-100 backdrop-blur focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
                  {!touch && <kbd className="mr-1.5 rounded border border-white/25 px-1.5 text-[10px]">J</kbd>}{descanso.modo === null ? "Sentar" : descanso.modo === "sentado" && descanso.podeDeitar ? "Deitar / levantar" : "Levantar"}
                </button>
              )}
              <button type="button" onClick={() => engine.current?.alternarTablet()} className="min-h-[40px] rounded-full bg-gradient-to-b from-cyan-200 to-sky-400 px-4 text-xs font-extrabold text-slate-950 shadow-[0_0_20px_rgba(90,200,255,.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                {!touch && <kbd className="mr-1.5 rounded border border-slate-900/30 px-1.5 text-[10px]">T</kbd>}📱 Estudar no tablet
              </button>
            </div>
          )}
          {p.aviso && <p role="status" className="absolute left-1/2 top-[120px] z-20 -translate-x-1/2 rounded-full bg-amber-300/90 px-3 py-1 text-xs font-medium text-slate-900">{p.aviso}</p>}

          {perto && menu && (   // na vista (landing/menu); fora dele o "Estudar" é a ação de contexto (F)
            <button type="button" onClick={entrarEstudo} className="absolute left-1/2 z-[21] min-h-[44px] -translate-x-1/2 animate-pulse rounded-full bg-gradient-to-b from-cyan-200 to-sky-400 px-6 text-sm font-extrabold text-slate-950 shadow-[0_0_26px_rgba(90,200,255,.75)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" style={{ bottom: touch ? 168 : tela ? 150 : 28 }}>✦ Estudar</button>
          )}

          {tela && !(touch && (qg.pilotando || qg.moto)) && (   // celular pilotando: o chat sai da frente dos atalhos/controles
            <div className="absolute z-20 w-[min(68vw,300px)] rounded-2xl border border-violet-300/25 bg-[#0a081e]/70 p-2.5 backdrop-blur" style={touch ? { left: 10, top: 64 } : { left: 16, bottom: 16 }}>
              <div className="h-4 px-1 text-[10.5px] text-cyan-200">{falandoCom ? `💬 falando com ${falandoCom}` : ""}</div>
              <div className="mb-1.5 flex max-h-[96px] flex-col gap-0.5 overflow-y-auto px-1 text-[12.5px] text-violet-100" aria-live="polite">
                {[...(instancia ? [] : p.chat ?? []), ...falasDroid].sort((a, b) => a.ts - b.ts).slice(-8).map((m) => <div key={m.id}><b style={{ color: m.color }}>{m.name}{m.userId.startsWith("agente:") ? " ✦" : ""}:</b> {m.texto}</div>)}
              </div>
              <input ref={chatRef} value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") enviar(); }} maxLength={400} placeholder={pergunta ? "Responder à Zaeon…  (Enter)" : "Falar…  (Enter)"} aria-label="Falar na sala" className="w-full rounded-xl border border-violet-300/30 bg-[#0a081e]/70 px-3 py-2 text-[13px] text-white outline-none focus:border-cyan-300" />
            </div>
          )}

          {touch && (
            <>
              <Joystick onMove={(x, y) => engine.current?.setJoystick(x, y)} />
              {qg.pilotando || qg.moto ? null : (<>
              <button type="button" aria-label="Correr" aria-pressed={correndo} onPointerDown={(e) => { e.stopPropagation(); setCorrendo(engine.current?.alternarCorrer() ?? false); }} className={`absolute z-[25] flex h-[62px] w-[62px] touch-none items-center justify-center rounded-full border border-sky-300/45 text-[12px] font-extrabold backdrop-blur ${correndo ? "bg-gradient-to-b from-cyan-200 to-sky-400 text-slate-950" : "bg-sky-950/55 text-sky-50"}`} style={{ right: "max(94px, calc(env(safe-area-inset-right) + 72px))", bottom: "max(30px, env(safe-area-inset-bottom))" }}>CORRER</button>
              <button type="button" aria-label="Atacar" onPointerDown={(e) => { e.stopPropagation(); engine.current?.atacar(); }} className="absolute z-[25] flex h-[58px] w-[58px] touch-none items-center justify-center rounded-full border border-emerald-200/50 bg-emerald-950/50 text-[10px] font-extrabold text-emerald-50 backdrop-blur active:bg-emerald-300 active:text-slate-950" style={{ right: "max(22px, env(safe-area-inset-right))", bottom: "max(104px, calc(env(safe-area-inset-bottom) + 74px))" }}>ATACAR</button>
              <button type="button" aria-label="Inventário" onPointerDown={(e) => { e.stopPropagation(); setInventarioAberto(true); }} className="absolute z-[25] flex h-[46px] w-[46px] touch-none items-center justify-center rounded-full border border-white/20 bg-black/45 text-[18px] backdrop-blur" style={{ right: "max(24px, env(safe-area-inset-right))", bottom: "max(176px, calc(env(safe-area-inset-bottom) + 146px))" }}>🎒</button>
              <button type="button" aria-label="Dash" onPointerDown={(e) => { e.stopPropagation(); engine.current?.darDash(); }} className="absolute z-[25] flex h-[54px] w-[54px] touch-none items-center justify-center rounded-full border border-amber-200/50 bg-amber-950/45 text-[11px] font-extrabold text-amber-50 backdrop-blur active:bg-amber-300 active:text-slate-950" style={{ right: "max(98px, calc(env(safe-area-inset-right) + 76px))", bottom: "max(104px, calc(env(safe-area-inset-bottom) + 74px))" }}>DASH</button>
              <button type="button" aria-label="Voar (segurar)" onPointerDown={(e) => { e.stopPropagation(); try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* sem captura */ } engine.current?.comandoJet(true); }} onPointerUp={() => engine.current?.comandoJet(false)} onPointerCancel={() => engine.current?.comandoJet(false)} onLostPointerCapture={() => engine.current?.comandoJet(false)} onContextMenu={(e) => e.preventDefault()} className="absolute z-[25] flex h-[62px] w-[62px] touch-none items-center justify-center rounded-full border border-sky-300/45 bg-sky-950/55 text-[12px] font-extrabold text-sky-50 backdrop-blur" style={{ right: "max(22px, env(safe-area-inset-right))", bottom: "max(30px, env(safe-area-inset-bottom))" }}>VOAR</button>
              </>)}
            </>
          )}
        </>
      )}

      {/* entrando nos estudos: SÓ uma barra de loading, nenhum texto */}
      {/* painel do marco (proximidade + clique): nome, org, link; "Subir ao topo" só pro dono e validado no SERVIDOR */}
      {poiAberto && !menu && (
        <div role="dialog" aria-label={poiAberto.nome} className="absolute left-1/2 top-[110px] z-30 w-[min(92vw,340px)] -translate-x-1/2 rounded-2xl border border-sky-300/35 bg-[#070c22]/90 p-4 text-sm shadow-[0_0_40px_-10px_rgba(90,200,255,.6)] backdrop-blur">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1"><p className="text-base font-extrabold tracking-wide text-sky-100">{poiAberto.nome}</p><p className="mt-0.5 text-white/70">{poiAberto.org}</p></div>
            <button type="button" aria-label="Fechar" onClick={() => setPoiAberto(null)} className="min-h-[36px] min-w-[36px] rounded-full border border-white/15 text-white/70 hover:text-white">×</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {poiAberto.link && <button type="button" onClick={() => router.push(poiAberto.link!)} className="min-h-[40px] rounded-full border border-sky-300/40 bg-sky-400/15 px-4 font-semibold text-sky-100">Abrir</button>}
            {poiAberto.acesso === "dono" && p.souFundador && p.pedirAcesso && (
              <button type="button" disabled={subindo} onClick={async () => {
                setSubindo(true); setErroTopo(null);
                try { const r = await p.pedirAcesso!("topo"); if (r.ok) engine.current?.subir(); else setErroTopo(r.erro ?? "Não foi possível subir."); }
                catch { setErroTopo("Sem conexão."); } finally { setSubindo(false); }
              }} className="min-h-[40px] rounded-full bg-gradient-to-b from-cyan-200 to-sky-400 px-4 font-extrabold text-slate-950 disabled:opacity-60">{subindo ? "Subindo…" : "Subir ao topo"}</button>
            )}
          </div>
          {erroTopo && <p role="alert" className="mt-2 text-rose-300">{erroTopo}</p>}
        </div>
      )}
      {/* AÇÃO de contexto: sem mouse no cyberespaço — F faz (estudar, montar na moto, embarcar, descer, falar, recado…);
          no celular, tocar no chip. Embarcar continua validado no servidor (onEmbarcar → pedir). */}
      {!menu && acao && (
        <button type="button" onClick={() => engine.current?.executarAcao()} className="absolute left-1/2 z-[22] flex min-h-[44px] -translate-x-1/2 items-center gap-2 rounded-full bg-gradient-to-b from-cyan-200 to-sky-400 py-1.5 pl-1.5 pr-5 text-sm font-extrabold text-slate-950 shadow-[0_0_26px_rgba(90,200,255,.6)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" style={{ bottom: touch ? 168 : tela ? 150 : 28 }}>
          {!touch && <kbd className="flex h-8 min-w-8 items-center justify-center rounded-full bg-slate-950/85 px-2 font-mono text-[13px] text-cyan-100">F</kbd>}
          <span className={touch ? "pl-3.5" : ""}>{acao.rotulo}</span>
        </button>
      )}
      {!menu && (qg.pilotando || qg.moto) && <ControlesVoo engine={engine} touch={touch} pousado={qg.pousado} moto={qg.moto} />}
      {!menu && <PainelCorrida engine={engine} moto={qg.moto} evento={evCorrida} />}
      {/* MOTO VOADORA: o altímetro (montar/descer é a ação de contexto, F) */}
      {!menu && qg.moto && voo && !qg.pousado && (
        <p className="absolute left-1/2 top-[110px] z-30 -translate-x-1/2 rounded-full bg-[#070c22]/70 px-3 py-1 text-center text-xs font-bold tabular-nums text-sky-100 backdrop-blur">↕ {voo.y} m</p>
      )}
      {!menu && qg.pilotando && (
        <div className="absolute left-1/2 top-[110px] z-30 flex -translate-x-1/2 flex-col items-center gap-2">
          {voo && !qg.pousado && <p className="rounded-full bg-[#070c22]/70 px-3 py-1 text-center text-xs font-bold tabular-nums text-sky-100 backdrop-blur">↕ {voo.y} m</p>}
          {/* atalhos (só no começo do voo, com a nave pousada): a nave voa sozinha, à vista de todos; qualquer botão de movimento cancela */}
          {rota ? (
            <button type="button" onClick={() => engine.current?.pararRota()} className="min-h-[40px] rounded-full border border-amber-200/45 bg-[#1a0f08]/85 px-4 text-xs font-semibold text-amber-100 backdrop-blur">■ Parar</button>
          ) : qg.pousado && (
            <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Atalhos de voo">
              {([["heliporto", "Heliporto"], ["zaeon", "Zaeon"]] as const).map(([d, rot]) => (
                <button key={d} type="button" onClick={() => engine.current?.irPara(d)} className="min-h-[40px] rounded-full border border-sky-300/40 bg-[#070c22]/85 px-4 text-xs font-semibold text-sky-100 backdrop-blur">{rot}</button>
              ))}
            </div>
          )}
        </div>
      )}
      {/* o TUTORIAL do Droid: ele fala nos balões (e no chat); aqui só o passo e o "Pular" */}
      {!menu && guia && guia.id !== "nascer" && (
        <div className="absolute left-1/2 top-3 z-[26] flex -translate-x-1/2 items-center gap-2 rounded-full border bg-[#0d0a1c]/80 py-1 pl-3 pr-1 text-[11.5px] text-amber-50/85 backdrop-blur" style={{ borderColor: `${guia.cor}66` }}>
          <span style={{ color: guia.cor }} className="font-bold">✦ {guia.agente}</span>
          <span className="tabular-nums text-amber-50/60">{guia.passo}/{guia.total - 1} · {guia.titulo}</span>
          <button type="button" onClick={() => engine.current?.guiaPular()} className="min-h-[28px] rounded-full border border-white/15 px-3 text-amber-50/75 hover:text-white">Pular</button>
        </div>
      )}
      {!menu && pergunta && <RespostaZaeon pergunta={pergunta} touch={touch} onResponder={responderZaeon} />}
      {expulso && (
        <div role="alert" className="absolute inset-0 z-[70] flex flex-col items-center justify-center gap-3 bg-[#2a0404]/85 px-8 text-center text-red-50 backdrop-blur-sm">
          <p className="text-2xl font-extrabold tracking-wide">Você foi expulso do cyberespaço.</p>
          <p className="max-w-[420px] text-sm text-red-100/75">O Droid não tolera desrespeito. Você foi desconectado e vai voltar pro início. Volte quando estiver pronto pra conversar com educação.</p>
        </div>
      )}
      {tunel && (
        <TunelBuracoNegro modo={tunel} onCoberto={(c) => engine.current?.pausar(c)}
          onEscolher={(id) => { if (tunel.tipo === "escolher") engine.current?.viajarPeloTunel(id as IdNo | null); else engine.current?.atravessarBuracoDono(tunel.para); }}
          onFim={() => setTunel(null)} />
      )}
      {somAberto && p.musica && <TocaDiscos som={p.somLounge ?? null} offsetMs={p.offsetMusica ?? 0} api={p.musica} onFechar={() => setSomAberto(false)} />}
      {recadoAberto && (
        <div role="dialog" aria-modal="true" aria-label="Recado pro mural da Recepção" className="absolute inset-0 z-50 flex items-center justify-center bg-[#03030a]/60 px-4" onClick={() => setRecadoAberto(false)}>
          <div className="w-full max-w-[420px] rounded-2xl border border-cyan-300/30 bg-[#070c22]/95 p-4 text-sky-100 shadow-[0_0_40px_rgba(102,230,255,.15)]" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold text-cyan-200">Recado pro mural da Recepção</p>
            <p className="mt-1 text-xs text-sky-100/60">Aparece num holograma ao lado da mesa da Zaeon, na Recepção (e na TV do lounge). Fica lá até você mandar outro ou apagar.</p>
            <textarea autoFocus value={recadoTxt} onChange={(e) => setRecadoTxt(e.target.value)} maxLength={MAX_TEXTO_RECADO} rows={4} placeholder="Escreva o recado…" aria-label="Texto do recado"
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void mandarRecado(recadoTxt); if (e.key === "Escape") setRecadoAberto(false); }}
              className="mt-3 w-full resize-none rounded-xl border border-cyan-300/30 bg-[#0a081e]/80 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300" />
            <div className="mt-1 text-right text-[11px] text-sky-100/50">{recadoTxt.length}/{MAX_TEXTO_RECADO}</div>
            {p.recadoQG && <p className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-sky-100/70"><span className="text-sky-100/50">No mural agora: </span>{p.recadoQG.texto}</p>}
            <div className="mt-3 flex items-center justify-between gap-2">
              {p.recadoQG ? <button type="button" disabled={recadoEnviando} onClick={() => void mandarRecado(null)} className="min-h-[40px] rounded-full px-3 text-xs text-rose-200/80 hover:text-rose-200">Apagar o atual</button> : <span />}
              <div className="flex gap-2">
                <button type="button" onClick={() => setRecadoAberto(false)} className="min-h-[40px] rounded-full border border-white/15 px-4 text-xs text-sky-100/80">Fechar</button>
                <button type="button" disabled={recadoEnviando || !recadoTxt.trim()} onClick={() => void mandarRecado(recadoTxt)} className="min-h-[40px] rounded-full bg-gradient-to-b from-cyan-200 to-sky-400 px-5 text-xs font-extrabold text-slate-950 disabled:opacity-50">{recadoEnviando ? "Enviando…" : "Enviar"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {comVoz && falandoEu && <p role="status" className="pointer-events-none absolute left-1/2 top-[120px] z-40 -translate-x-1/2 rounded-full border border-emerald-300/40 bg-[#062018]/85 px-4 py-1.5 text-xs font-semibold text-emerald-200">🎙 Falando…</p>}
      {comVoz && touch && !menu && (
        <button type="button" aria-label="Segurar pra falar" onPointerDown={(e) => { e.preventDefault(); falar(true); }} onPointerUp={() => falar(false)} onPointerLeave={() => falar(false)} onPointerCancel={() => falar(false)}
          className={`absolute bottom-[150px] right-4 z-30 min-h-[52px] select-none rounded-full border px-4 text-sm font-semibold backdrop-blur ${falandoEu ? "border-emerald-300 bg-emerald-400/30 text-emerald-50" : "border-white/20 bg-[#070c22]/80 text-sky-100"}`}>🎤 {falandoEu ? "Falando…" : "Segurar pra falar"}</button>
      )}
      {aviso2 && <p role="status" className="absolute left-1/2 top-[164px] z-40 -translate-x-1/2 rounded-full bg-[#1a0f08]/90 px-4 py-2 text-xs text-amber-100">{aviso2}</p>}
      {/* celular em pé: o cyberespaço roda na horizontal (a cena fica pausada até girar) */}
      {girar && (
        <div role="dialog" aria-label="Gire o celular" className="absolute inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-[#03030a]/95 px-8 text-center text-sky-100">
          <svg aria-hidden="true" width="84" height="84" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-300">
            <rect x="7" y="2.5" width="10" height="17" rx="2" /><path d="M19.5 14.5a7.5 7.5 0 0 1-6 6.9" /><path d="m13.5 21.4 1.6-1.9-2.2-.9" />
          </svg>
          <p className="text-base font-bold">Gire o celular</p>
          <p className="max-w-[260px] text-sm text-sky-100/70">O cyberespaço roda na horizontal.</p>
          <button type="button" onClick={() => void telaCheiaHorizontal()} className="min-h-[44px] rounded-full bg-gradient-to-b from-cyan-200 to-sky-400 px-5 text-sm font-extrabold text-slate-950">Tela cheia na horizontal</button>
        </div>
      )}

      {noTopo && !menu && (
        <button type="button" onClick={() => engine.current?.descer()} className="absolute left-1/2 top-[110px] z-30 min-h-[44px] -translate-x-1/2 rounded-full border border-sky-300/40 bg-[#070c22]/85 px-5 text-sm font-semibold text-sky-100 backdrop-blur">↓ Descer da Zaeon</button>
      )}

      {abrindo && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#03030a]">
          <div role="progressbar" aria-label="Carregando" className="h-1.5 w-[220px] overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/3 animate-[cyber-entrando_1.2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-cyan-200 to-sky-400" />
          </div>
          <style>{`@keyframes cyber-entrando{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
        </div>
      )}
      {tela && loading !== "off" && !falha && <TelaCarregando carga={carga} saindo={loading === "saindo"} />}
      {!tela && !pronto && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-[#03030a]">
          <div className="h-1.5 w-[220px] overflow-hidden rounded-full bg-white/10"><div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-cyan-200 to-sky-400" /></div>
        </div>
      )}
    </div>
  );
}
