"use client";

/**
 * CoworkingCanal — o Escritório como CANAL (estilo Buzz): lista de mensagens + input + @mention
 * + presença. Só isso. Humanos e agentes no mesmo fio, em tempo real (Pusher); `@agente`
 * convoca o harness daquele agente, que responde com SEU nome e avatar. Sem 3D, sem
 * departamentos, sem títulos decorativos — a sala se explica pelo uso.
 *
 * Vidro Apple, claro === escuro (lib/canal/vidro.ts). Notificações fora da tela
 * (lib/canal/notificacoes.ts + useNotificacoesSO). Alvos ≥44px, input com safe-area.
 */
import ChatMarkdown from "@/components/study/ChatMarkdown";
import PusherClient from "pusher-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AgentAvatar from "@/components/agents/AgentAvatar";
import ChatZoom, { useChatFontScale } from "@/components/chat/ChatZoom";
import { fonteChat } from "@/lib/ui/chatFontScale";
import { montarTopoPessoas } from "@/lib/canal/topoPessoas";
import { podeApagar, textoConfirmarApagar, aposApagar } from "@/lib/canal/seletor";
import { ABAS, abaDoCanal, filtrarPorAba, humanosNoCanal, type Aba } from "@/lib/canal/convite";
import { ConvidarForm, type ConviteVista } from "./ConvitesEscritorio";
import SinoConvites from "./SinoConvites";
import { montarSino, contadorDoSino, type HistoricoSino, type EstadoSino, type AcaoSino } from "@/lib/canal/sino";
import PessoasTopo from "./PessoasTopo";
import BarraAgentes from "./BarraAgentes";
import MenuPessoa, { type ConversaComPessoa } from "./MenuPessoa";
import { abrirPerfil } from "@/lib/perfil/eventos";
import { podeRemover, textoConfirmarRemover } from "@/lib/canal/perfil";
import { estaAtivo, frase, normalizarEstado, aindaEscrevendo, PRAZO_AGENTE_MS, type EstadoAgente } from "@/lib/canal/estadoAgente";
import { avisarTrabalhoIA } from "@/lib/ui/monitorIA";
import { montarAliases, mencaoAberta, sugerir } from "@/lib/canal/mention";
import { prioridadeDe, deveNotificar } from "@/lib/canal/notificacoes";
import { canalChannel, presenceChannel, EV_MENSAGEM, EV_DIGITANDO, EV_AGENDA, EV_HUMANO_DIGITANDO, EV_REMOVIDO, type MensagemWire } from "@/lib/canal/wire";
import { comFotoDaLista, comFotos, juntarParcial, type AvisoMensagem } from "@/lib/canal/aviso";
import { linhasChamaveis, quemRespondeSemArroba } from "@/lib/canal/alvo";
import { avisoDeQuemParou, mostraParar } from "@/lib/canal/parar";
import { chegouAoVivo, confirmarEnviada, ehErroDeRede, ehLocal, estaEnviando, mensagemDeErro, vigiaAoVivo, PREFIXO_ENVIANDO } from "@/lib/canal/conexao";
import Carregando from "@/components/office/Carregando";
import { Square } from "lucide-react";
import { deveAvisarDigitando, podarDigitando, quemDigita, estaNoFim, vigiaReconexao, TTL_DIGITANDO_MS, type Digitando } from "@/lib/canal/presenca";
import { LinhaSistema, AvisoDigitando } from "./Presenca";
import AgendaBandeja from "./AgendaBandeja";
import { VIDRO_PAINEL, VIDRO_BOLHA, VIDRO_BOLHA_MINHA, VIDRO_INPUT, VIDRO_POPOVER, VIDRO_CHIP, TXT, TXT_2, TXT_MUDO, TOQUE } from "@/lib/canal/vidro";
import { useNotificacoesSO } from "./useNotificacoesSO";
import { enviarLote, type EstadoEnvio } from "@/lib/chat/enviarBase";
import { mensagemComAnexos, separarArquivos } from "@/lib/canal/anexos";
import { useIsMobile } from "@/lib/ui/useIsMobile";

type Canal = { id: string; titulo: string; acesso: string; ownerId: string; membros: string[]; agentes: string[]; cartolinaId: string | null; souDono: boolean; dmCom?: string | null };
type Convites = { recebidos: ConviteVista[]; enviados: ConviteVista[]; contatos: ConviteVista[]; historico: HistoricoSino[]; sino: EstadoSino };
const SEM_CONVITES: Convites = { recebidos: [], enviados: [], contatos: [], historico: [], sino: { vistoEm: null, limpoAte: null } };
const NOME_ABA: Record<Aba, string> = { privado: "Privado", turma: "Turma", aberto: "Aberto" };
type Agente = { agentKey: string; tipo: string; nome: string; emoji: string; bio: string; curso: string | null; avatarUrl: string | null; ativo: boolean };
type Pessoa = { id: string; nome: string; avatar: string | null };
type Detalhe = { canal: Canal; eu: Pessoa; mensagens: MensagemWire[]; agentes: Agente[]; pessoas: Pessoa[] };

const LS_ULTIMO = "zaeon.canal.ultimo";
const H = { "Content-Type": "application/json" };

export default function CoworkingCanal({ agenteInicial = null }: { agenteInicial?: string | null }) {
  const [canais, setCanais] = useState<Canal[]>([]);
  const [ativoId, setAtivoId] = useState<string | null>(null);
  const [det, setDet] = useState<Detalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  // #657: internet ruim — a busca FALHOU (não é demora), o navegador está offline, a conexão ao vivo caiu
  const [falhaCarga, setFalhaCarga] = useState(false);
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && navigator.onLine === false);
  const [reconectando, setReconectando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [naoLidas, setNaoLidas] = useState<Record<string, number>>({});
  const [online, setOnline] = useState<Pessoa[]>([]);
  const [digitando, setDigitando] = useState<string[]>([]);
  // o que cada agente está fazendo (pesquisando, investigando…) e quem está "em descanso" (lib/canal/estadoAgente)
  const [estadoAgente, setEstadoAgente] = useState<Record<string, EstadoAgente>>({});
  // #468: até quando vale o último aviso de cada agente — sem aviso novo no prazo, o "está redigindo…" some sozinho
  const agenteAte = useRef<Record<string, number>>({});
  // #645: quem eu parei com o ■ — o "escrevendo" atrasado dele não volta (até o turno acabar ou eu chamar de novo)
  const parados = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!digitando.length) return;
    const t = setInterval(() => {
      setDigitando((prev) => { const vivos = aindaEscrevendo(prev, agenteAte.current, Date.now()); return vivos.length === prev.length ? prev : vivos; });
    }, 5000);
    return () => clearInterval(t);
  }, [digitando.length]);
  const [texto, setTexto] = useState("");
  const celular = useIsMobile();
  const [enviando, setEnviando] = useState(false);
  // 📎 ANEXOS (como no chat): o PDF sobe pra "Minha base" e a mensagem leva "📎 nome.pdf" — o agente lê pela base.
  const [anexos, setAnexos] = useState<{ chave: string; nome: string; estado: EstadoEnvio }[]>([]);
  const [arrastandoArquivo, setArrastandoArquivo] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const subindo = anexos.some((a) => a.estado === "na_fila" || a.estado === "enviando");
  const anexar = useCallback(async (lista: File[]) => {
    const { pdfs, recusados } = separarArquivos(lista);
    if (recusados.length) setErro(`Por aqui vai PDF: ${recusados.map((f) => f.name).join(", ")} ficou de fora.`);
    if (!pdfs.length) return;
    const base = Date.now();
    const novos = pdfs.map((f, i) => ({ chave: `${base}-${i}-${f.name}`, nome: f.name, estado: "na_fila" as EstadoEnvio }));
    setAnexos((xs) => [...xs, ...novos]);
    const r = await enviarLote(pdfs, {
      aoMudar: (i, estado) => setAnexos((xs) => xs.map((a) => (a.chave === novos[i].chave ? { ...a, estado } : a))),
    });
    if (r === "nao_logado") {
      setAnexos((xs) => xs.filter((a) => !novos.some((n) => n.chave === a.chave)));
      setErro("Entre na sua conta para anexar arquivos.");
    } else if (r.some((x) => x?.status === "erro")) {
      setErro("Um dos arquivos não subiu (grande demais ou a base está fora do ar). Os outros seguem.");
    }
    inputRef.current?.focus();
  }, []);
  const [menu, setMenu] = useState<"canais" | "convidar" | "sino" | `pessoa:${string}` | null>(null); // #425: "pessoa:<id>" = menu da foto
  // #396 (D): abas do seletor (dividem o espaço, não misturam) + convites da aba Privado
  const [aba, setAba] = useState<Aba>("turma");
  const [convites, setConvites] = useState<Convites>(SEM_CONVITES);
  const [respondendo, setRespondendo] = useState<string | null>(null);
  // #423: sino — a lista que ele mostra e a bolinha. #425: o "visto" e o "Limpar" ficam no BANCO (CanalSino),
  // não no navegador: vêm junto com os convites e valem em qualquer aparelho.
  const [limpandoSino, setLimpandoSino] = useState(false);
  const itensSino = useMemo(() => montarSino(convites), [convites]);
  const contadorSino = contadorDoSino(convites, convites.sino.vistoEm);
  const gravarSino = useCallback(async (acao: AcaoSino) => {
    const r = await fetch("/api/canal/sino", { method: "POST", headers: H, body: JSON.stringify({ acao }) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null; // #440: lê sempre (com erro também), o pedido não fica aberto
    if (!r?.ok) return null;
    return (j?.sino as EstadoSino | undefined) ?? null;
  }, []);
  const alternarSino = () => {
    const abrir = menu !== "sino";
    setMenu(abrir ? "sino" : null);
    if (!abrir) return;
    // abriu o sino = viu as respostas; a bolinha passa a contar só os pendentes e o que chegar depois.
    // Na tela já apaga na hora; o banco guarda pra próxima vez (e pros outros aparelhos).
    setConvites((c) => ({ ...c, sino: { ...c.sino, vistoEm: Date.now() } }));
    void gravarSino("visto").then(() => carregarConvites());
  };
  // #425: clicar num convite aceito no sino abre a conversa (e fecha o sino). Se a conversa ainda não está na
  // lista (ex.: a pessoa aceitou agora), recarrega a lista antes; sem acesso, o carregarDetalhe já trata.
  const abrirConversa = async (id: string) => {
    setMenu(null);
    let c = canaisRef.current.find((x) => x.id === id);
    if (!c) {
      const r = await fetch("/api/canal", { cache: "no-store" }).catch(() => null);
      const lista: Canal[] = r?.ok ? ((await r.json().catch(() => null))?.canais ?? []) : [];
      if (lista.length) setCanais(lista);
      c = lista.find((x) => x.id === id);
    }
    if (c) setAba(abaDoCanal(c));
    setAtivoId(id);
  };
  const limparSino = async () => {
    setLimpandoSino(true);
    try {
      const sino = await gravarSino("limpar");
      if (!sino) { setErro("Não deu pra limpar as notificações."); return; }
      // some com o que já foi respondido; os pendentes continuam (recebidos/enviados)
      setConvites((c) => ({ ...c, historico: [], sino }));
      void carregarConvites();
    } finally { setLimpandoSino(false); }
  };
  const [novoTitulo, setNovoTitulo] = useState("");
  const [apagando, setApagando] = useState<string | null>(null);
  const [agendaAberta, setAgendaAberta] = useState(false);
  const [agendaVersao, setAgendaVersao] = useState(0);
  const [sugIdx, setSugIdx] = useState(0);
  // A− / A+ do texto das mensagens: a MESMA escolha do chat das salas de estudo e pesquisa (por aparelho).
  const zoom = useChatFontScale();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLDivElement>(null); // #427: a lista de mensagens (pra descer até o balão de quem digita)
  const ativoRef = useRef<string | null>(null);
  const meuIdRef = useRef<string | null>(null);
  const meusAgentes = useRef<Set<string>>(new Set());
  const meusAliases = useRef<string[]>([]);
  // #468: enquanto uma agente que EU chamei escreve, o monitor do tablet sabe (o metaverso mostra "IA trabalhando")
  const trabalhoNoTablet = useRef<Set<string>>(new Set());
  useEffect(() => {
    const agora = new Set(digitando.filter((k) => meusAgentes.current.has(k)).map((k) => `escritorio:${ativoId}:${k}`));
    for (const c of trabalhoNoTablet.current) if (!agora.has(c)) avisarTrabalhoIA(c, false);
    for (const c of agora) if (!trabalhoNoTablet.current.has(c)) avisarTrabalhoIA(c, true);
    trabalhoNoTablet.current = agora;
  }, [digitando, ativoId]);
  useEffect(() => () => { for (const c of trabalhoNoTablet.current) avisarTrabalhoIA(c, false); }, []);
  const canaisRef = useRef<Canal[]>([]);
  const { visivel, pedirPermissao, badgeTitulo, notificar } = useNotificacoesSO();
  const visivelRef = useRef(true);
  useEffect(() => { visivelRef.current = visivel; }, [visivel]);
  useEffect(() => { ativoRef.current = ativoId; }, [ativoId]);
  useEffect(() => { canaisRef.current = canais; }, [canais]);

  // ─── #423: "fulano está digitando" (pessoas) — recebe, some sozinho no prazo, e avisa enquanto eu escrevo ───
  const [pessoasDigitando, setPessoasDigitando] = useState<Digitando>({});
  const ultimoAvisoDigitando = useRef<number | null>(null);
  useEffect(() => {
    if (!Object.keys(pessoasDigitando).length) return;
    const t = setInterval(() => setPessoasDigitando((p) => podarDigitando(p, Date.now())), 1000);
    return () => clearInterval(t);
  }, [pessoasDigitando]);
  /** Avisa os outros no máximo a cada poucos segundos (lib/canal/presenca), nunca a cada tecla. Falhar não atrapalha. */
  const avisarDigitando = (valor: string) => {
    const id = ativoRef.current, agora = Date.now();
    if (!id || !deveAvisarDigitando(ultimoAvisoDigitando.current, agora, valor)) return;
    ultimoAvisoDigitando.current = agora;
    // #440: lê (e descarta) a resposta — um pedido nunca lido ficava "aberto" e o tablet do metaverso achava que era IA
    void fetch(`/api/canal/${id}/digitando`, { method: "POST" }).then((r) => r.body?.cancel()).catch(() => undefined);
  };

  // #645: o último canal aberto já começa a carregar JUNTO com a lista (antes: lista → depois o canal, um atrás do outro)
  const adiantado = useRef<{ id: string; resp: Promise<Response | null> } | null>(null);

  // ─── canais: carrega; sem nenhum, cria o primeiro (a sala nunca abre vazia) ───
  // #657: uma função (não só o efeito de abertura) — o "Tentar de novo" e a internet voltando refazem SÓ isto
  const carregarLista = useCallback(async () => {
    setFalhaCarga(false);
    setCarregando(true);
    {
      try {
        let ultimo: string | null = null;
        try { ultimo = localStorage.getItem(LS_ULTIMO); } catch { /* ignore */ }
        if (ultimo) adiantado.current = { id: ultimo, resp: fetch(`/api/canal/${ultimo}`, { cache: "no-store" }).catch(() => null) };
        const r = await fetch("/api/canal", { cache: "no-store" });
        if (r.status === 404) { setErro("off"); return; }
        if (!r.ok) throw new Error(String(r.status));
        let lista: Canal[] = (await r.json())?.canais ?? [];
        if (!lista.length) {
          const c = await fetch("/api/canal", { method: "POST", headers: H, body: JSON.stringify({ titulo: "Meu escritório", acesso: "turma", agentes: ["aura"], primeiro: true }) });
          if (c.ok) lista = [(await c.json()).canal];
        }
        setCanais(lista);
        let ult: string | null = null;
        try { ult = localStorage.getItem(LS_ULTIMO); } catch { /* ignore */ }
        setAtivoId(lista.find((c) => c.id === ult)?.id ?? lista[0]?.id ?? null);
      } catch (e) {
        // #657: sem internet / caiu no meio → "Não deu pra abrir" na hora (antes: "Abrindo…" esperando à toa)
        if (ehErroDeRede(e)) setFalhaCarga(true); else setErro(String((e as Error)?.message ?? e));
      } finally {
        setCarregando(false);
      }
    }
  }, []);
  useEffect(() => { void carregarLista(); }, [carregarLista]);

  // ─── detalhe do canal ativo (+ marca lido) ───
  const carregarDetalhe = useCallback(async (id: string) => {
    // #645: o que já começou a carregar junto com a lista (só uma vez; depois, busca normal)
    const pre = adiantado.current?.id === id ? await adiantado.current.resp : null;
    adiantado.current = null;
    let r = pre;
    if (!r) {
      try { r = await fetch(`/api/canal/${id}`, { cache: "no-store" }); } catch (e) {
        if (ehErroDeRede(e)) { setFalhaCarga(true); return; }   // #657: avisa na hora (e volta sozinho com a internet)
        throw e;
      }
    }
    if (!r.ok) {
      // sem acesso a ESTE canal (o dono mudou o acesso, tirou a pessoa…): some da lista e abre o próximo — a tela
      // nunca trava num canal fechado (o seletor, os convites e os outros canais continuam ao alcance)
      if (r.status === 403 || r.status === 404) {
        const resto = canaisRef.current.filter((c) => c.id !== id);
        setCanais(resto);
        try { if (localStorage.getItem(LS_ULTIMO) === id) localStorage.removeItem(LS_ULTIMO); } catch { /* ignore */ }
        if (resto.length) setAtivoId(resto[0]!.id); else setErro("403");
      }
      return;
    }
    const d: Detalhe = await r.json();
    meuIdRef.current = d.eu.id;
    const nome = d.eu.nome || "";
    meusAliases.current = [nome, nome.split(/\s+/)[0] ?? ""].filter(Boolean);
    // #645: a foto inteira de cada pessoa veio uma vez só (em `pessoas`) — completa as mensagens com ela
    setDet({ ...d, mensagens: comFotos(d, d.eu) });
    setFalhaCarga(false);
    setDigitando([]);
    setEstadoAgente({});
    setPessoasDigitando({});
    setNaoLidas((n) => ({ ...n, [id]: 0 }));
    try { localStorage.setItem(LS_ULTIMO, id); } catch { /* ignore */ }
  }, []);
  useEffect(() => { if (ativoId) void carregarDetalhe(ativoId); }, [ativoId, carregarDetalhe]);

  // #645: um aviso (alguém entrou, "Téo saiu…", resposta longa demais pro tempo real) → busca SÓ o que chegou depois da
  // última mensagem da tela, não as 60 de novo. Sem nada na tela ainda, carrega tudo.
  const detRef = useRef<Detalhe | null>(null);
  detRef.current = det;
  const atualizarDesde = useCallback(async (id: string) => {
    const atual = detRef.current;
    const ult = atual?.canal.id === id ? [...atual.mensagens].reverse().find((m) => !ehLocal(m.id)) : undefined;
    if (!ult) return carregarDetalhe(id);
    const r = await fetch(`/api/canal/${id}?desde=${encodeURIComponent(ult.createdAt)}`, { cache: "no-store" }).catch(() => null);
    if (!r?.ok) return carregarDetalhe(id);
    const novo: Detalhe = await r.json();
    setDet((d) => (d && d.canal.id === id ? { ...d, canal: novo.canal, agentes: novo.agentes, ...juntarParcial(d, novo) } : d));
  }, [carregarDetalhe]);

  // ─── #657: tentar de novo SÓ o Escritório (não recarrega a página) e voltar sozinho quando a internet voltar ───
  const tentarDeNovo = useCallback(() => {
    setFalhaCarga(false);
    if (!canaisRef.current.length) void carregarLista();
    else if (ativoRef.current) void carregarDetalhe(ativoRef.current).catch(() => setFalhaCarga(true));
  }, [carregarLista, carregarDetalhe]);
  useEffect(() => {
    const voltou = () => { setOffline(false); if (!detRef.current) tentarDeNovo(); };
    const caiu = () => setOffline(true);
    window.addEventListener("online", voltou);
    window.addEventListener("offline", caiu);
    return () => { window.removeEventListener("online", voltou); window.removeEventListener("offline", caiu); };
  }, [tentarDeNovo]);

  // ─── badge no título da aba ───
  const totalNaoLidas = useMemo(() => Object.values(naoLidas).reduce((a, b) => a + b, 0), [naoLidas]);
  useEffect(() => { badgeTitulo(totalNaoLidas); }, [totalNaoLidas, badgeTitulo]);
  useEffect(() => { if (visivel && ativoId) setNaoLidas((n) => (n[ativoId] ? { ...n, [ativoId]: 0 } : n)); }, [visivel, ativoId]);

  // ─── realtime: um Pusher; assina TODOS os meus canais (não-lidas) + presença do ativo ───
  const pusherRef = useRef<PusherClient | null>(null);
  /**
   * Um escritório saiu da minha lista (apaguei, ou #551: o dono me tirou): para de ouvir, some da lista e, se era
   * o aberto, abre o próximo — sem nenhum, cria o primeiro (antes, quem era removido ficava em "Abrindo o canal…").
   */
  const tirarDaTela = useCallback(async (id: string) => {
    try { pusherRef.current?.unsubscribe(canalChannel(id)); pusherRef.current?.unsubscribe(presenceChannel(id)); } catch { /* ignore */ }
    const depois = aposApagar(canaisRef.current, id, ativoRef.current);
    canaisRef.current = depois.restantes;
    setCanais(depois.restantes);
    setNaoLidas((n) => { const resto = { ...n }; delete resto[id]; return resto; });
    try { if (localStorage.getItem(LS_ULTIMO) === id) localStorage.removeItem(LS_ULTIMO); } catch { /* ignore */ }
    if (depois.proximoAtivo) {
      if (depois.eraAtivo) setAtivoId(depois.proximoAtivo);
      return;
    }
    const n = await fetch("/api/canal", { method: "POST", headers: H, body: JSON.stringify({ titulo: "Meu escritório", acesso: "turma", agentes: ["aura"], primeiro: true }) });
    if (n.ok) {
      const novo: Canal = (await n.json()).canal;
      setCanais([novo]);
      setAtivoId(novo.id);
    }
  }, []);
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY, cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster || !canais.length) return;
    let p = pusherRef.current;
    if (!p) {
      p = new PusherClient(key, { cluster, channelAuthorization: { endpoint: "/api/canal/pusher-auth", transport: "ajax" } });
      // #560: a conexão caiu e voltou → relê a conversa aberta (o que chegou enquanto estava fora não vem pelo Pusher)
      const voltou = vigiaReconexao();
      const caiu = vigiaAoVivo();   // #657: "Reconectando…" enquanto a conexão ao vivo está fora
      p.connection.bind("state_change", (s: { current: string }) => {
        setReconectando(caiu(s?.current));
        // #657: ao voltar, só o que chegou enquanto estava fora (não as 60 mensagens de novo)
        if (voltou(s?.current) && ativoRef.current) void atualizarDesde(ativoRef.current);
      });
    }
    pusherRef.current = p;
    const nomes = p.allChannels().map((c) => c.name);
    for (const c of canais) {
      const nome = canalChannel(c.id);
      if (nomes.includes(nome)) continue;
      const ch = p.subscribe(nome);
      ch.bind(EV_MENSAGEM, (m: AvisoMensagem) => {
        aoChegar(m, c.id);
        // #425: "fulano entrou" no canal aberto → recarrega o canal (a foto nova aparece na barra, sem F5)
        if (m.autorTipo === "sistema" && c.id === ativoRef.current) void atualizarDesde(c.id);
      });
      // #468: o dono me tirou deste escritório → paro de ouvir e ele some da minha lista (sem esperar o F5)
      ch.bind(EV_REMOVIDO, (d: { userId?: string }) => {
        if (!d?.userId || d.userId !== meuIdRef.current) return;
        void tirarDaTela(c.id).catch((e) => setErro(mensagemDeErro(e, "não deu pra atualizar a lista")));
      });
      // alguém marcou/apagou horário na agenda deste canal → a bandeja (se aberta) recarrega
      ch.bind(EV_AGENDA, () => { if (c.id === ativoRef.current) setAgendaVersao((v) => v + 1); });
      ch.bind(EV_DIGITANDO, (d: { agentKey: string; estado: string; parou?: boolean }) => {
        if (c.id !== ativoRef.current) return;
        // estado em palavras (pesquisando, investigando, em descanso…); valor desconhecido = "digitando"
        const est = normalizarEstado(d.estado);
        if (!avisoDeQuemParou(parados.current, d.agentKey, estaAtivo(est), d.parou === true)) return;   // #645: o ■ vale com 1 clique
        setEstadoAgente((m) => ({ ...m, [d.agentKey]: est }));
        if (estaAtivo(est)) agenteAte.current[d.agentKey] = Date.now() + PRAZO_AGENTE_MS;
        setDigitando((prev) => (estaAtivo(est) ? [...new Set([...prev, d.agentKey])] : prev.filter((k) => k !== d.agentKey)));
      });
      // #423: uma PESSOA está digitando neste canal (o meu próprio aviso não aparece pra mim)
      ch.bind(EV_HUMANO_DIGITANDO, (d: { userId: string; nome: string }) => {
        if (c.id !== ativoRef.current || !d?.userId || d.userId === meuIdRef.current) return;
        setPessoasDigitando((prev) => ({ ...prev, [d.userId]: { nome: d.nome || "Alguém", ate: Date.now() + TTL_DIGITANDO_MS } }));
      });
    }
    return () => { /* mantém assinaturas enquanto o componente vive; desconecta no unmount abaixo */ };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canais]);
  useEffect(() => () => { try { pusherRef.current?.disconnect(); } catch { /* ignore */ } pusherRef.current = null; }, []);

  useEffect(() => {
    const p = pusherRef.current;
    if (!p || !ativoId) return;
    const nome = presenceChannel(ativoId);
    const ch: any = p.subscribe(nome);
    const sync = () => {
      const lista: Pessoa[] = [];
      // #468: a presença leva só o nome (a foto inteira passava do limite e a pessoa sumia do "online"); a foto vem da lista de pessoas
      ch.members?.each((m: any) => lista.push({ id: String(m.id), nome: m.info?.nome ?? "Alguém", avatar: null }));
      setOnline(lista);
    };
    ch.bind("pusher:subscription_succeeded", sync);
    ch.bind("pusher:member_added", sync);
    ch.bind("pusher:member_removed", sync);
    if (ch.subscribed) sync();
    return () => { try { p.unsubscribe(nome); } catch { /* ignore */ } setOnline([]); };
  }, [ativoId, canais.length]);

  const aoChegar = useCallback((m: AvisoMensagem, canalId: string) => {
    const aberto = canalId === ativoRef.current;
    if (aberto) {
      // #438: aviso leve (mensagem grande demais pro tempo real) → busca a conversa; senão entra na lista, com a
      // foto da lista de pessoas quando o aviso veio sem ela (foto guardada inteira não vai pelo Pusher)
      if (m.cortada) void atualizarDesde(canalId);
      // #657: a minha que chegou ao vivo antes da resposta do envio substitui a "enviando…" igual
      else setDet((d) => (d ? { ...d, mensagens: chegouAoVivo(d.mensagens, comFotoDaLista(m, d.pessoas), meuIdRef.current) } : d));
      if (m.autorTipo === "agente") setDigitando((prev) => prev.filter((k) => k !== m.autorId));
      // a mensagem da pessoa chegou: ela parou de "digitar"
      if (m.autorTipo === "humano") setPessoasDigitando((prev) => { if (!(m.autorId in prev)) return prev; const n = { ...prev }; delete n[m.autorId]; return n; });
    }
    const prioridade = prioridadeDe(m, { meuId: meuIdRef.current, meusAgentes: [...meusAgentes.current], meusAliases: meusAliases.current });
    if (!deveNotificar({ prioridade, abaVisivel: visivelRef.current, canalAberto: aberto })) return;
    if (!aberto || !visivelRef.current) setNaoLidas((n) => ({ ...n, [canalId]: (n[canalId] ?? 0) + 1 }));
    const canal = canaisRef.current.find((c) => c.id === canalId);
    notificar({
      canalId, prioridade,
      titulo: m.autorNome || (m.autorTipo === "agente" ? m.autorId : "Alguém"),
      corpo: (() => { const t = m.cortada ? "Mensagem nova" : m.texto; return canal && !aberto ? `${canal.titulo} · ${t}` : t; })(),
      onClick: () => { setAtivoId(canalId); try { window.dispatchEvent(new CustomEvent("zaeon:set-tab", { detail: "escritorio" })); } catch { /* ignore */ } },
    });
  }, [notificar, atualizarDesde]);

  // ─── autoscroll ───
  useEffect(() => { fimRef.current?.scrollIntoView({ block: "end" }); }, [det?.mensagens.length, digitando.length]);
  // #427: uma PESSOA começou a digitar → o balão entra embaixo da última mensagem; desce até ele se você já
  // está no fim da conversa (quem subiu pra ler mensagens antigas não é puxado)
  const qtosDigitando = Object.keys(pessoasDigitando).length;
  useEffect(() => {
    const el = listaRef.current;
    if (el && qtosDigitando > 0 && estaNoFim(el)) el.scrollTop = el.scrollHeight;
  }, [qtosDigitando]);

  // ─── "falar com agente": prefixa @agente e foca (NUNCA redireciona) ───
  const prefixarAgente = useCallback((key: string) => {
    setTexto((t) => (t.includes(`@${key}`) ? t : `@${key} ${t}`.replace(/\s+$/, " ")));
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);
  useEffect(() => {
    let k = agenteInicial;
    try { k = k || new URLSearchParams(window.location.search).get("agente"); } catch { /* ignore */ }
    if (k) prefixarAgente(k);
    const h = (e: Event) => { const slug = (e as CustomEvent<{ slug?: string }>).detail?.slug; if (slug) prefixarAgente(slug); };
    window.addEventListener("zaeon:escritorio:agente", h);
    return () => window.removeEventListener("zaeon:escritorio:agente", h);
  }, [agenteInicial, prefixarAgente]);

  // ─── @mention autocomplete ───
  const agentes = det?.agentes ?? [];
  const aliases = useMemo(() => montarAliases(agentes.map((a) => ({ agentKey: a.agentKey, nome: a.nome }))), [agentes]);
  const [caret, setCaret] = useState(0);
  const aberta = useMemo(() => mencaoAberta(texto, caret), [texto, caret]);
  const sugestoes = useMemo(() => (aberta ? sugerir(aberta.prefixo, agentes) : []), [aberta, agentes]);
  useEffect(() => { setSugIdx(0); }, [aberta?.prefixo]);
  const completar = useCallback((a: Agente) => {
    if (!aberta) return;
    const antes = texto.slice(0, aberta.inicio), depois = texto.slice(caret);
    const novo = `${antes}@${a.agentKey} ${depois.replace(/^\s+/, "")}`;
    setTexto(novo);
    const pos = antes.length + a.agentKey.length + 2;
    setTimeout(() => { const el = inputRef.current; if (el) { el.focus(); el.setSelectionRange(pos, pos); setCaret(pos); } }, 0);
  }, [aberta, texto, caret]);

  // ─── enviar ───
  // `textoFixo` (#635, "Chamar de volta"): manda essa frase sem mexer no que a pessoa está escrevendo
  const enviar = useCallback(async (textoFixo?: string) => {
    const guardados = anexos.filter((a) => a.estado === "guardado").map((a) => a.nome);
    const t = textoFixo ?? mensagemComAnexos(texto, guardados);
    if (!t || !ativoId || enviando || subindo) return;
    setEnviando(true);
    // #657: a mensagem entra NA HORA, meio apagada, "enviando…" (antes nada aparecia até o servidor responder); deu
    // errado → sai da conversa e o texto volta pra caixa
    const eu = detRef.current?.eu;
    const temp: MensagemWire = {
      id: `${PREFIXO_ENVIANDO}${Date.now()}`, canalId: ativoId, autorTipo: "humano", autorId: meuIdRef.current ?? "", texto: t, mencoes: [],
      createdAt: new Date().toISOString(), autorNome: eu?.nome ?? "", autorAvatar: eu?.avatar ?? null,
    };
    const rascunho = texto;
    setDet((d) => (d ? { ...d, mensagens: [...d.mensagens, temp] } : d));
    if (textoFixo === undefined) setTexto("");
    const desfazer = () => {
      setDet((d) => (d ? { ...d, mensagens: d.mensagens.filter((x) => x.id !== temp.id) } : d));
      if (textoFixo === undefined) setTexto((atual) => atual || rascunho);
    };
    try {
      void pedirPermissao(); // 1ª vez: gesto do usuário → pode pedir
      const r = await fetch(`/api/canal/${ativoId}/mensagem`, { method: "POST", headers: H, body: JSON.stringify({ texto: t }) });
      if (!r.ok) { const j = await r.json().catch(() => ({})); desfazer(); setErro(j?.error || `Falhou (${r.status})`); return; }
      const j = await r.json();
      const m: MensagemWire = j.mensagem;
      // Quem vai responder = os `turnos` do servidor: as @menções OU, sem @, o último agente do canal.
      const alvos: string[] = Array.isArray(j.turnos) ? j.turnos.map((t: { agentKey: string }) => t.agentKey) : (m.mencoes ?? []);
      for (const k of alvos) { meusAgentes.current.add(k); parados.current.delete(k); }
      if (alvos.length) {
        for (const k of alvos) agenteAte.current[k] = Date.now() + PRAZO_AGENTE_MS;
        setDigitando((prev) => [...new Set([...prev, ...alvos])]);
        // um "em descanso" antigo não pode aparecer como o balão de "escrevendo" do novo turno
        setEstadoAgente((m) => ({ ...m, ...Object.fromEntries(alvos.map((k) => [k, "digitando" as EstadoAgente])) }));
      }
      setDet((d) => (d ? { ...d, mensagens: confirmarEnviada(d.mensagens, temp.id, m) } : d));
      if (textoFixo === undefined) setAnexos([]);
      ultimoAvisoDigitando.current = null; // a próxima mensagem volta a avisar na primeira tecla
      setErro(null);
      // agentes na barra: os chamados entram, a dispensada sai (#440 — o servidor manda a lista final)
      const naBarra: string[] | null = Array.isArray(j.agentesNoCanal) ? j.agentesNoCanal : null;
      const ajustar = (c: Canal): Canal => ({ ...c, agentes: naBarra ?? [...new Set([...c.agentes, ...alvos])] });
      if (naBarra || alvos.length) {
        setCanais((cs) => cs.map((c) => (c.id === ativoId ? ajustar(c) : c)));
        setDet((d) => (d && d.canal.id === ativoId ? { ...d, canal: ajustar(d.canal) } : d));
      }
    } catch (e) {
      desfazer();
      setErro(mensagemDeErro(e, "sua mensagem não foi enviada"));   // #657: não o "NetworkError…" cru
    } finally {
      setEnviando(false);
      inputRef.current?.focus();
    }
  }, [texto, anexos, subindo, ativoId, enviando, pedirPermissao]);

  // ─── #635: "■ Parar" — a resposta de quem está escrevendo não entra no canal (se forem várias, para todas) ───
  const parar = useCallback(async () => {
    if (!ativoId || !digitando.length) return;
    const quem = [...digitando];
    for (const k of quem) { delete agenteAte.current[k]; parados.current.add(k); }
    setDigitando([]);
    const r = await fetch(`/api/canal/${ativoId}/parar`, { method: "POST", headers: H, body: JSON.stringify({ agentes: quem }) }).catch(() => null);
    if (!r?.ok) setErro("Não deu pra parar a resposta agora.");
  }, [ativoId, digitando]);

  const aoTeclar = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (aberta && sugestoes.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSugIdx((i) => (i + 1) % sugestoes.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSugIdx((i) => (i - 1 + sugestoes.length) % sugestoes.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); completar(sugestoes[sugIdx] ?? sugestoes[0]!); return; }
      if (e.key === "Escape") { e.preventDefault(); setCaret(0); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void enviar(); }
  };

  // ─── convites (#396, item D) ───
  const carregarConvites = useCallback(async () => {
    try {
      const r = await fetch("/api/canal/convites", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      setConvites({ recebidos: j.recebidos ?? [], enviados: j.enviados ?? [], contatos: j.contatos ?? [], historico: j.historico ?? [], sino: j.sino ?? SEM_CONVITES.sino });
    } catch { /* sem convites não trava o escritório */ }
  }, []);
  useEffect(() => { if (canais.length) void carregarConvites(); }, [canais.length, carregarConvites]);
  // a aba acompanha o canal aberto (ex.: aceitou um convite → vai pro Privado)
  useEffect(() => {
    const c = canaisRef.current.find((x) => x.id === ativoId);
    if (c) setAba(abaDoCanal(c));
  }, [ativoId]);

  // #425: o + do DONO convida pra conversa aberta (a pessoa entra nela no aceite); pra quem não é dono, é o
  // convite de contato de antes (aceitar cria a conversa de vocês dois).
  const conversaDoConvite = det?.canal.souDono ? det.canal : null;
  const enviarConvite = useCallback(async (para: string): Promise<{ ok: boolean; msg: string }> => {
    try {
      const corpo = conversaDoConvite ? { para, canalId: conversaDoConvite.id } : { para };
      const r = await fetch("/api/canal/convites", { method: "POST", headers: H, body: JSON.stringify(corpo) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 201) {
        void carregarConvites();
        const nome = j?.convite?.pessoa?.nome || para;
        return { ok: true, msg: conversaDoConvite ? `Convite enviado: ${nome} entra aqui quando aceitar.` : `Convite enviado para ${nome}.` };
      }
      if (r.ok && j?.jaContatos) return { ok: true, msg: "Vocês já são contatos — a conversa está na aba Privado." };
      return { ok: false, msg: j?.error || `Não deu pra convidar (${r.status}).` };
    } catch (e) {
      return { ok: false, msg: mensagemDeErro(e, "o convite não foi enviado") };
    }
  }, [carregarConvites, conversaDoConvite]);

  const responderConvite = useCallback(async (id: string, acao: "aceitar" | "recusar") => {
    setRespondendo(id);
    try {
      const r = await fetch(`/api/canal/convites/${id}`, { method: "POST", headers: H, body: JSON.stringify({ acao }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErro(j?.error || `Não deu pra responder (${r.status})`); return; }
      if (acao === "aceitar" && j?.canal?.id) {
        const novo: Canal = j.canal;
        setCanais((cs) => (cs.some((c) => c.id === novo.id) ? cs : [novo, ...cs]));
        setAba("privado");
        setAtivoId(novo.id);
        setMenu(null);
      }
      setErro(null);
      void carregarConvites();
    } finally {
      setRespondendo(null);
    }
  }, [carregarConvites]);

  // ─── ações do canal ───
  const criarCanal = async () => {
    const titulo = novoTitulo.trim();
    if (!titulo) return;
    // o canal novo nasce na aba em que você está (privado = só seu; turma; aberto)
    const r = await fetch("/api/canal", { method: "POST", headers: H, body: JSON.stringify({ titulo, acesso: aba, agentes: ["aura"] }) });
    if (!r.ok) return;
    const c: Canal = (await r.json()).canal;
    setCanais((cs) => [c, ...cs]);
    setNovoTitulo(""); setMenu(null); setAtivoId(c.id);
  };
  // Apaga um escritório (só o dono; a rota DELETE já existe). Pede confirmação, atualiza a lista e abre
  // outro canal; se não sobrar nenhum, recria o primeiro (a sala nunca fica vazia). Regras em lib/canal/seletor.
  const apagarCanal = async (c: Canal) => {
    if (!podeApagar(c) || apagando) return;
    if (!window.confirm(textoConfirmarApagar(c.titulo))) return;
    setApagando(c.id);
    try {
      const r = await fetch(`/api/canal/${c.id}`, { method: "DELETE" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErro(j?.error || `Não deu pra apagar (${r.status})`);
        return;
      }
      setErro(null);
      setMenu(null);
      await tirarDaTela(c.id);
    } catch (e) {
      setErro(mensagemDeErro(e, "não deu pra apagar"));
    } finally {
      setApagando(null);
    }
  };
  const patch = async (body: Record<string, unknown>) => {
    if (!ativoId) return;
    const r = await fetch(`/api/canal/${ativoId}`, { method: "PATCH", headers: H, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErro(j?.error || `Falhou (${r.status})`); return; }
    const c: Canal = j.canal;
    setCanais((cs) => cs.map((x) => (x.id === c.id ? c : x)));
    setDet((d) => (d ? { ...d, canal: c } : d));
    setErro(null);
  };
  const abrirCartolina = () => {
    const id = det?.canal.cartolinaId;
    if (!id) return;
    // Seam: avisa quem renderiza a cartolina (LoungeCartolina na aba "lounge", PR #152) e leva pra lá.
    try {
      window.dispatchEvent(new CustomEvent("zaeon:cartolina:abrir", { detail: { id, canalId: ativoId } }));
      window.dispatchEvent(new CustomEvent("zaeon:set-tab", { detail: "lounge" }));
    } catch { /* ignore */ }
  };

  // ─── render ───
  if (erro === "off") return <Vazio texto="O escritório coworking ainda não está ligado neste ambiente." />;
  // #645: demorou → avisa que pode ser a conexão e, mais um pouco, "Tentar de novo"
  // #657: falhou → avisa na hora; sem internet → diz isso e abre sozinho quando voltar; "Tentar de novo" refaz só o Escritório
  if (carregando) return <Carregando texto="Abrindo o escritório…" onTentar={tentarDeNovo} falhou={falhaCarga} offline={offline} />;
  if ((!ativoId || !det) && erro === "403") return <Vazio texto="Você não tem acesso a este canal." />;
  if (!ativoId || !det) return <Carregando texto="Abrindo o canal…" onTentar={tentarDeNovo} falhou={falhaCarga} offline={offline} />;

  const canal = det.canal;
  const meuId = det.eu.id;
  // Perfis no topo: dono + membros + você, e quem estiver online mesmo sem ser membro (canal aberto).
  // na conversa privada o "outro lado" (dmCom) também aparece no topo
  const topo = montarTopoPessoas({ pessoas: det.pessoas, online, donoId: canal.ownerId, meuId, membros: canal.dmCom ? [...canal.membros, canal.dmCom] : canal.membros });
  const daAba = filtrarPorAba(canais, aba);
  // contatos (convite aceito) que ainda não estão neste canal → dá pra pôr com um toque no ⚙︎
  // #425/#427: menu da foto — Ver perfil (abre a página de perfil dela) · Conversar/Convidar · Remover
  const pessoaAberta = menu?.startsWith("pessoa:") ? menu.slice("pessoa:".length) : null;
  const verPerfil = (uid: string) => { setMenu(null); abrirPerfil(uid); };
  const convidarPraConversar = async (uid: string): Promise<{ ok: boolean; msg: string }> => {
    try {
      const r = await fetch("/api/canal/convites", { method: "POST", headers: H, body: JSON.stringify({ paraId: uid }) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 201) { void carregarConvites(); return { ok: true, msg: "Convite enviado. Ela aceita pelo sino." }; }
      if (r.ok && j?.dmCanalId) { void abrirConversa(j.dmCanalId); return { ok: true, msg: "Vocês já são contatos." }; }
      return { ok: false, msg: j?.error || `Não deu pra convidar (${r.status}).` };
    } catch (e) { return { ok: false, msg: mensagemDeErro(e, "o convite não foi enviado") }; }
  };
  const removerPessoa = async (p: { id: string; nome: string }) => {
    if (!window.confirm(textoConfirmarRemover(p.nome))) return;
    setMenu(null);
    await patch({ removerMembro: p.id });
  };
  const conversaCom = (uid: string) => convites.contatos.find((c) => c.pessoa.id === uid)?.dmCanalId ?? null;
  // A dica "Zenita responde": quem responde se EU mandar sem @ agora — a mesma regra do servidor (#466): numa
  // conversa com outras pessoas, a agente só responde quem estava falando com ela (lib/canal/alvo.ts).
  const quemResponde = quemRespondeSemArroba(det.mensagens.filter((m) => !ehLocal(m.id)), agentes.map((a) => a.agentKey), meuId, humanosNoCanal(canal));
  const agenteAtivo = agentes.find((a) => a.agentKey === quemResponde) ?? null;
  // #635: as linhas "saiu da conversa" que ganham "Chamar de volta" — só a ÚLTIMA saída de cada agente que ainda está fora
  const chamavel = linhasChamaveis(det.mensagens, agentes.map((a) => a.agentKey));
  // #635: alguém está escrevendo e a caixa está vazia → o ↑ vira "■ Parar"
  const podeParar = mostraParar(digitando.length, texto, anexos.some((a) => a.estado === "guardado"));

  return (
    <div className="w-full h-full min-h-0 flex flex-col p-2 sm:p-4" style={zoom.style}>
      <div data-tour="escritorio-canal" className={`relative flex-1 min-h-0 flex flex-col rounded-[28px] overflow-hidden ${VIDRO_PAINEL}`}>
        {/* #657: a conexão ao vivo caiu (ou a internet): as mensagens novas não chegam até voltar */}
        {(reconectando || offline) && (
          <div role="status" aria-live="polite" className="pointer-events-none absolute left-1/2 top-14 z-40 -translate-x-1/2 flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-50/95 px-3 py-1 text-[11.5px] font-semibold text-amber-800 shadow-sm dark:bg-amber-900/70 dark:text-amber-100">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full border-2 border-current border-t-transparent animate-spin motion-reduce:animate-none" />
            {offline ? "Sem internet — as mensagens chegam quando voltar" : "Reconectando…"}
          </div>
        )}
        {/* agenda semanal do canal: bandeja por cima da conversa (#396) */}
        <AgendaBandeja canalId={ativoId} aberta={agendaAberta} onFechar={() => setAgendaAberta(false)} versao={agendaVersao} />
        {/* barra: agenda · canal · presença · cartolina · config */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/50 dark:border-white/[0.08]">
          {/* à esquerda do seletor: abre a agenda da semana */}
          <button type="button" onClick={() => { setAgendaAberta((v) => !v); setMenu(null); }} aria-label="Agenda da semana" aria-expanded={agendaAberta}
            title="Agenda da semana" className={`${TOQUE} rounded-2xl text-[15px] ${VIDRO_CHIP} ${TXT}`}>🗓</button>
          <div className="relative">
            <button type="button" onClick={() => { const abrir = menu !== "canais"; setMenu(abrir ? "canais" : null); if (abrir) void carregarConvites(); }} className={`${TOQUE} px-3 rounded-2xl text-[13px] font-bold ${TXT} ${VIDRO_CHIP} flex items-center gap-2`} aria-haspopup="listbox" aria-expanded={menu === "canais"}>
              <span className="max-w-[40vw] sm:max-w-[260px] truncate">{canal.titulo}</span>
              <span aria-hidden className={`text-[10px] ${TXT_MUDO}`}>▾</span>
              {totalNaoLidas - (naoLidas[ativoId] ?? 0) > 0 && <Badge n={totalNaoLidas - (naoLidas[ativoId] ?? 0)} />}
            </button>
            {menu === "canais" && (
              <div className={`absolute left-0 top-full mt-1.5 z-30 w-[min(92vw,340px)] p-1.5 rounded-2xl ${VIDRO_POPOVER}`}>
                {/* as três abas dividem o mesmo espaço; cada uma mostra só os canais dela */}
                <div className="flex gap-1 p-1" role="tablist" aria-label="Tipo de escritório">
                  {ABAS.map((a) => (
                    <button key={a} type="button" role="tab" aria-selected={aba === a} onClick={() => setAba(a)}
                      className={`flex-1 min-h-[36px] rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 ${aba === a ? `bg-blue-500/20 dark:bg-blue-400/20 ${TXT}` : `${VIDRO_CHIP} ${TXT_2}`}`}>
                      {NOME_ABA[a]}
                    </button>
                  ))}
                </div>
                <div role="listbox" aria-label={`Escritórios · ${NOME_ABA[aba]}`}>
                {daAba.length === 0 && (
                  <p className={`px-3 py-2 text-[12px] ${TXT_MUDO}`}>
                    {aba === "privado" ? "Nenhuma conversa privada ainda. Use o + ao lado do seletor pra convidar alguém." : `Nenhum escritório de ${NOME_ABA[aba].toLowerCase()} ainda.`}
                  </p>
                )}
                {daAba.map((c) => (
                  <div key={c.id} className="flex items-center gap-1">
                    <button type="button" role="option" aria-selected={c.id === ativoId} onClick={() => { setAtivoId(c.id); setMenu(null); }}
                      className={`flex-1 min-w-0 ${TOQUE} flex items-center justify-between gap-2 px-3 rounded-xl text-left text-[13px] ${c.id === ativoId ? `bg-blue-500/15 dark:bg-blue-400/15 ${TXT}` : `${TXT_2} hover:bg-slate-500/10 dark:hover:bg-white/10`}`}>
                      <span className="truncate font-medium">{c.titulo}</span>
                      {naoLidas[c.id] ? <Badge n={naoLidas[c.id]!} /> : null}
                    </button>
                    {/* só o dono apaga (a rota também recusa não-dono); pede confirmação antes */}
                    {podeApagar(c) && (
                      <button type="button" onClick={() => void apagarCanal(c)} disabled={apagando === c.id}
                        aria-label={`Apagar o escritório ${c.titulo}`} title="Apagar este escritório"
                        className={`${TOQUE} w-10 shrink-0 rounded-xl text-[14px] ${TXT_MUDO} hover:text-rose-500 dark:hover:text-rose-300 hover:bg-rose-500/10 disabled:opacity-40`}>🗑</button>
                    )}
                  </div>
                ))}
                </div>
                {/* #423: os convites saíram daqui e foram pro sino */}
                <div className="mt-1 flex gap-1.5 p-1">
                  <input value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void criarCanal(); }} placeholder={`novo escritório (${NOME_ABA[aba].toLowerCase()})`} aria-label="Nome do novo canal"
                    className={`flex-1 min-h-[40px] px-3 rounded-xl text-[13px] bg-white/70 dark:bg-white/[0.06] border border-white/60 dark:border-white/10 ${TXT} placeholder:text-slate-400 dark:placeholder:text-white/35 outline-none focus:border-blue-400/70`} />
                  <button type="button" onClick={() => void criarCanal()} className={`min-h-[40px] px-3 rounded-xl text-[12px] font-bold ${VIDRO_CHIP} ${TXT}`}>+</button>
                </div>
              </div>
            )}
          </div>

          {/* #423: sino de notificações (por enquanto só convites, com o status de cada um), entre o seletor e o + */}
          <SinoConvites itens={itensSino} contador={contadorSino} aberto={menu === "sino"} onAlternar={alternarSino}
            ocupado={respondendo} onResponder={(id, acao) => void responderConvite(id, acao)}
            onAbrir={(id) => void abrirConversa(id)} onLimpar={() => void limparSino()} limpando={limpandoSino} />

          {/* #423: "+" (convidar) à ESQUERDA, depois do sino; abre NA HORIZONTAL, ao lado do botão.
              O convite cai no sino da pessoa. */}
          <div className="flex items-center gap-1.5 min-w-[44px]">
            <button type="button" onClick={() => setMenu(menu === "convidar" ? null : "convidar")} aria-label="Convidar pessoa" aria-expanded={menu === "convidar"}
              title={conversaDoConvite ? "Chamar alguém pra esta conversa" : "Convidar pessoa"} className={`${TOQUE} shrink-0 rounded-full text-[18px] font-bold leading-none ${VIDRO_CHIP} ${TXT}`}>+</button>
            {menu === "convidar" && <ConvidarForm onEnviar={enviarConvite} variante="linha" onFechar={() => setMenu(null)} paraConversa={conversaDoConvite?.titulo ?? null} />}
          </div>

          <div data-tour="escritorio-pessoas" className="ml-auto shrink-0 flex items-center gap-1.5">
            {/* pessoas do canal (dono, membros e você), com espaço entre as fotos (#423). Os agentes ficam embaixo. */}
            <PessoasTopo visiveis={topo.visiveis} extras={topo.extras} onlineIds={topo.onlineIds} total={topo.total}
              aberta={pessoaAberta} onAlternar={(id) => setMenu(pessoaAberta === id ? null : `pessoa:${id}`)}
              menuDe={(p) => {
                const dm = p.id !== meuId ? conversaCom(p.id) : null;
                // você mesma: sem conversa; já são contatos: Conversar (se não estão nela agora); senão: Convidar
                const conversa: ConversaComPessoa = p.id === meuId ? null
                  : dm ? (dm !== canal.id ? { tipo: "abrir", onClick: () => { setMenu(null); void abrirConversa(dm); } } : null)
                  : { tipo: "convidar", onClick: () => convidarPraConversar(p.id) };
                return (
                  <MenuPessoa key={p.id} pessoa={p} onVerPerfil={() => verPerfil(p.id)} conversa={conversa}
                    podeRemover={podeRemover({ meuId, donoId: canal.ownerId, alvoId: p.id, conversaDeDois: !!canal.dmCom, membros: canal.membros })}
                    onRemover={() => void removerPessoa(p)} />
                );
              }} />
            {online.length > 0 && <span className={`text-[11px] ${TXT_MUDO}`} title="online agora">{online.length} on</span>}
            {canal.cartolinaId && (
              <button type="button" onClick={abrirCartolina} className={`${TOQUE} px-3 rounded-2xl text-[12px] font-bold ${VIDRO_CHIP} ${TXT}`} title="Abrir a cartolina da sala">▦ cartolina</button>
            )}
            {/* #425: a engrenagem saiu — o tipo do escritório é escolhido no seletor ao criar, e o "remover" foi pro menu da foto */}
            {/* zoom das letras, no canto superior direito (igual ao chat das salas) */}
            {/* celular: a linha não cabe — o A−/A+ (o menos usado) sai; o texto já vem no tamanho do celular */}
            <span className="hidden sm:contents"><ChatZoom escala={zoom.escala} menor={zoom.menor} maior={zoom.maior} /></span>
          </div>
        </div>

        {/* mensagens */}
        <div ref={listaRef} data-testid="lista-mensagens" className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3 sm:px-5 py-4 flex flex-col gap-3" onClick={() => setMenu(null)}>
          {det.mensagens.map((m) => (m.autorTipo === "sistema"
            ? <LinhaSistema key={m.id} texto={m.texto} hora={hora(m.createdAt)} // #423: "fulano entrou no escritório"
                // #635: "Téo saiu da conversa" (e ele ainda está fora) → "Chamar de volta", sem precisar digitar o @
                acao={chamavel.has(m.id) ? { rotulo: "Chamar de volta", onClick: () => void enviar(`@${m.autorId} pode voltar`) } : undefined} />
            : <Bolha key={m.id} m={m} minha={m.autorTipo === "humano" && m.autorId === meuId} aliases={aliases} />))}
          {digitando.map((k) => {
            const a = agentes.find((x) => x.agentKey === k);
            return (
              <div key={`dig-${k}`} className="flex items-end gap-2">
                <AgentAvatar src={a?.avatarUrl} nome={a?.nome ?? k} size={30} emoji={a?.emoji} agentId={k} estado="falando" />
                <div className={`px-3.5 py-2.5 rounded-2xl rounded-bl-md ${VIDRO_BOLHA} ${TXT_MUDO} text-[13px]`}>
                  <span className="font-semibold">{a?.nome ?? k}</span> {frase(estadoAgente[k] ?? "digitando") || "está escrevendo"}<span className="animate-pulse">…</span>
                </div>
              </div>
            );
          })}
          {/* #425: as PESSOAS digitando, em balão igual ao dos agentes (foto + três pontinhos, sem texto) */}
          <AvisoDigitando pessoas={quemDigita(pessoasDigitando, det.pessoas)} />
          <div ref={fimRef} />
        </div>

        {/* input (fixo, safe-area) */}
        <div
          className={`relative px-2 sm:px-3 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] ${VIDRO_INPUT} ${arrastandoArquivo ? "ring-2 ring-blue-400/60 dark:ring-cyan-300/50" : ""}`}
          onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setArrastandoArquivo(true); } }}
          onDragLeave={() => setArrastandoArquivo(false)}
          onDrop={(e) => { if (!e.dataTransfer.files?.length) return; e.preventDefault(); setArrastandoArquivo(false); void anexar([...e.dataTransfer.files]); }}
        >
          {aberta && sugestoes.length > 0 && (
            <div role="listbox" className={`absolute left-3 bottom-full mb-1.5 z-30 w-[min(92vw,300px)] p-1.5 rounded-2xl ${VIDRO_POPOVER}`}>
              {sugestoes.map((a, i) => (
                <button key={a.agentKey} type="button" role="option" aria-selected={i === sugIdx} onMouseDown={(e) => { e.preventDefault(); completar(a); }}
                  className={`w-full ${TOQUE} flex items-center gap-2.5 px-3 rounded-xl text-left ${i === sugIdx ? `bg-blue-500/15 dark:bg-blue-400/15 ${TXT}` : `${TXT_2} hover:bg-slate-500/10 dark:hover:bg-white/10`}`}>
                  <AgentAvatar src={a.avatarUrl} nome={a.nome} size={26} emoji={a.emoji} agentId={a.agentKey} vivo={false} />
                  <span className="flex flex-col min-w-0"><span className="text-[13px] font-semibold truncate">{a.nome}</span><span className={`text-[11px] truncate ${TXT_MUDO}`}>@{a.agentKey}{a.curso ? ` · ${a.curso}` : ""}</span></span>
                </button>
              ))}
            </div>
          )}
          {/* agentes convocáveis: presentes no canal + os meus contratados (toque = @) — #443: componente próprio */}
          <div data-tour="escritorio-agentes"><BarraAgentes agentes={agentes} naConversa={canal.agentes} digitando={digitando} estado={estadoAgente} onChamar={prefixarAgente} /></div>
          {anexos.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-2" aria-label="Arquivos anexados">
              {anexos.map((a) => (
                <span key={a.chave} className={`inline-flex items-center gap-1.5 pl-2.5 pr-1 h-7 rounded-full text-[12px] ${VIDRO_CHIP} ${a.estado === "erro" ? "text-rose-600 dark:text-rose-300" : TXT_2}`}>
                  <span aria-hidden>{a.estado === "guardado" ? "📎" : a.estado === "erro" ? "⚠️" : "⏳"}</span>
                  <span className="max-w-[180px] truncate" title={a.nome}>{a.nome}</span>
                  <span className={`text-[10.5px] ${TXT_MUDO}`}>{a.estado === "guardado" ? "pronto" : a.estado === "erro" ? "falhou" : "subindo…"}</span>
                  <button type="button" aria-label={`Tirar ${a.nome}`} onClick={() => setAnexos((xs) => xs.filter((x) => x.chave !== a.chave))}
                    className="grid place-items-center w-5 h-5 rounded-full hover:bg-slate-500/15">×</button>
                </span>
              ))}
            </div>
          )}
          <div data-tour="escritorio-composer" className="flex items-end gap-2">
            <input ref={arquivoRef} type="file" accept="application/pdf,.pdf" multiple className="hidden"
              onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ""; if (f.length) void anexar(f); }} />
            <button type="button" onClick={() => arquivoRef.current?.click()} aria-label="Anexar arquivo (PDF)" title="Anexar PDF — o agente lê e responde sobre ele"
              className={`${TOQUE} shrink-0 rounded-2xl text-[18px] ${TXT_2} hover:bg-slate-500/10 dark:hover:bg-white/10`}>
              📎
            </button>
            <textarea
              ref={inputRef}
              value={texto}
              rows={1}
              onChange={(e) => { setTexto(e.target.value); setCaret(e.target.selectionStart ?? e.target.value.length); avisarDigitando(e.target.value); }}
              onKeyUp={(e) => setCaret((e.target as HTMLTextAreaElement).selectionStart ?? 0)}
              onClick={(e) => setCaret((e.target as HTMLTextAreaElement).selectionStart ?? 0)}
              onKeyDown={aoTeclar}
              // celular: o placeholder curto cabe numa linha (o longo quebrava e a caixa nascia com 2 linhas)
              placeholder={celular ? (agenteAtivo ? `Mensagem pra ${agenteAtivo.nome}` : "Mensagem") : agenteAtivo ? `Mensagem · ${agenteAtivo.nome} responde · @ troca de agente` : "Mensagem · @agente convoca"}
              aria-label="Mensagem"
              className={`flex-1 min-h-[44px] max-h-[140px] px-4 py-3 rounded-2xl resize-none text-[16px] sm:text-[14px] leading-5 bg-white/70 dark:bg-white/[0.06] border border-white/70 dark:border-white/10 ${TXT} placeholder:text-slate-400 dark:placeholder:text-white/35 outline-none focus:border-blue-400/70 dark:focus:border-cyan-300/50`}
              style={{ height: Math.min(140, 24 + 20 * Math.max(1, texto.split("\n").length)) }}
            />
            {podeParar ? (
              <button type="button" onClick={() => void parar()} aria-label="Parar a resposta" title="Parar a resposta"
                className={`${TOQUE} rounded-2xl grid place-items-center text-white transition-all hover:scale-[1.03] active:scale-95 shadow-[0_8px_24px_-8px_rgba(225,29,72,0.6)]`}
                style={{ background: "linear-gradient(135deg,#e11d48,#f43f5e)" }}>
                <Square size={14} className="fill-current" />
              </button>
            ) : (
              <button type="button" onClick={() => void enviar()} disabled={(!texto.trim() && !anexos.some((a) => a.estado === "guardado")) || enviando || subindo} aria-label="Enviar"
                className={`${TOQUE} rounded-2xl text-[15px] font-black transition-all disabled:opacity-40 bg-blue-600 text-white dark:bg-cyan-400 dark:text-slate-900 shadow-[0_8px_24px_-8px_rgba(37,99,235,0.6)] dark:shadow-[0_8px_24px_-8px_rgba(34,211,238,0.5)] hover:scale-[1.03] active:scale-95`}>
                ↑
              </button>
            )}
          </div>
          {erro && erro !== "403" && <p role="alert" className="mt-1.5 px-1 text-[11.5px] text-rose-600 dark:text-rose-300">{erro}</p>}
        </div>
      </div>
    </div>
  );
}

function Badge({ n }: { n: number }) {
  return <span className="ml-1 inline-grid place-items-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black bg-blue-600 text-white dark:bg-cyan-400 dark:text-slate-900">{n > 99 ? "99+" : n}</span>;
}

function Vazio({ texto }: { texto: string }) {
  return <div className={`w-full h-full grid place-items-center text-[13px] ${TXT_MUDO}`}>{texto}</div>;
}

const hora = (iso: string) => { try { return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };

/** o texto do agente antes do markdown: negrito VAZIO ("****") some e o negrito-itálico (***x***) vira negrito — nada de
 *  asteriscos soltos na conversa */
export const limparMarkdownDoAgente = (t: string) => t.replace(/\*{3}([^*\n]+?)\*{3}/g, "**$1**").replace(/\*{4,}/g, "");

/** Bolha: humano e agente com o MESMO vidro; identidade = avatar + nome. @mentions em destaque. */
function Bolha({ m, minha, aliases }: { m: MensagemWire; minha: boolean; aliases: Map<string, string> }) {
  const partes = useMemo(() => m.texto.split(/(@[\p{L}\p{N}_-]+)/u), [m.texto]);
  const nome = m.autorNome || (m.autorTipo === "agente" ? m.autorId : "Alguém");
  return (
    <div className={`flex items-end gap-2 ${minha ? "flex-row-reverse" : ""}`}>
      {!minha && <AgentAvatar src={m.autorAvatar} nome={nome} size={30} />}
      <div className={`max-w-[85%] sm:max-w-[70%] flex flex-col ${minha ? "items-end" : "items-start"} ${estaEnviando(m.id) ? "opacity-60" : ""}`}>
        {!minha && (
          <span className={`px-1 mb-0.5 text-[11px] font-semibold ${m.autorTipo === "agente" ? "text-cyan-700 dark:text-cyan-300" : TXT_MUDO}`}>
            {nome}{m.autorTipo === "agente" ? ` · @${m.autorId}` : ""}
          </span>
        )}
        <div className={`px-3.5 py-2.5 rounded-2xl ${minha ? `rounded-br-md ${VIDRO_BOLHA_MINHA}` : `rounded-bl-md ${VIDRO_BOLHA}`} ${TXT} leading-relaxed break-words ${m.autorTipo === "agente" ? "" : "whitespace-pre-wrap"}`} style={{ fontSize: fonteChat(14) }}>
          {/* o AGENTE responde em markdown (o mesmo do chat): sem isso o **negrito** aparecia como "****" */}
          {m.autorTipo === "agente" ? <ChatMarkdown text={limparMarkdownDoAgente(m.texto)} /> : partes.map((p, i) => {
            const alvo = p.startsWith("@") ? aliases.get(p.slice(1).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()) : null;
            return alvo ? <span key={i} className="font-bold text-blue-700 dark:text-cyan-300">{p}</span> : <span key={i}>{p}</span>;
          })}
        </div>
        <span className={`px-1 mt-0.5 text-[10px] ${TXT_MUDO}`}>{estaEnviando(m.id) ? "enviando…" : hora(m.createdAt)}</span>
      </div>
    </div>
  );
}
