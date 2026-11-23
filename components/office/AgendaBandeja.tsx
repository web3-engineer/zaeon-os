"use client";

/**
 * AgendaBandeja — a agenda semanal do escritório (#396), numa bandeja retrátil por cima do canal.
 *
 * Colunas = dias (segunda → domingo), linhas = horas (1 quadrado = 1h). Todo mundo do canal vê. Repete toda semana.
 * Regras (puras, testadas) em lib/canal/agenda.ts; dados em /api/canal/[id]/agenda.
 *
 * #850 (Escritório no celular):
 * - marcar: ARRASTAR do início ao fim (no toque, segurar e arrastar) — ou os dois toques de antes;
 * - os pedaços da mesma pessoa aparecem como UMA faixa (uma foto); tocar logo embaixo/acima do seu horário ESTICA;
 * - tocar no SEU horário abre a janelinha: Começa / Termina (de 15 em 15 min) · Salvar · Apagar;
 * - apagar não pergunta: aparece "Horário apagado · Desfazer";
 * - o que já passou NESTA semana fica apagado e avisa que vale a partir da próxima (nada é bloqueado: é uma rotina);
 * - hoje e agora destacados; cores sem repetir; tocar num quadrado ocupado mostra quem está nele;
 * - no celular, um dia por vez (com setas) e quadrados de 44 px.
 *
 * #861 (PR 1 — o bloco):
 * - cada horário é UMA barra, do começo ao fim (desenhada por cima dos quadrados, que continuam sendo o lugar de
 *   tocar e arrastar); quem se cruza fica lado a lado (lib/canal/agenda `blocosDoDia`);
 * - a foto (a do perfil da pessoa) entra conforme o tamanho do bloco (`modoDoBloco`): cartão, linha, estreito, mini, curto;
 * - linhas mais altas (56 px por hora no computador, 64 no celular);
 * - dias que já passaram com fundo sólido (antes ficavam meio transparentes);
 * - marcar/apagar sem travar e sem ampulheta: a mudança aparece na hora (brilho + spinner só no bloco); se der
 *   erro, volta como estava e o aviso oferece "Tentar de novo".
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AgentAvatar from "@/components/agents/AgentAvatar";
import {
  ALTURA_HORA, DIAS_ORDEM, DIA_CURTO, DIA_LONGO, HORAS, MIN_INICIO, OPCOES_MIN, acontecendoAgora, blocosDoDia, coresDoCanal, faixas,
  filtrarFaixas, jaPassou, minutosDo, modoDoBloco, naCelula, pessoasNoBloco, posNaSemana, proximaVez, proximoClique, textoData, textoHora,
  type Ancora, type Bloco, type BlocoNoDia, type Dia, type Faixa, type FiltroAgenda,
} from "@/lib/canal/agenda";
import { useIsMobile, QUERY_CELULAR } from "@/lib/ui/useIsMobile";
import { tr } from "@/lib/ui/avisos";
import { VIDRO_POPOVER_SOLIDO, VIDRO_CHIP, TXT, TXT_2, TXT_MUDO, TOQUE } from "@/lib/canal/vidro";

type Pessoa = { id: string; nome: string; avatar: string | null };
type BlocoComId = Bloco & { id: string };
type Salvar = { dia: Dia; inicio?: number; fim?: number; de?: number; ate?: number; substitui?: string[] };
type Arrasto = { dia: Dia; de: number; ate: number; ativo: boolean };
type Aviso = { texto: string; desfazer?: Salvar; erro?: boolean; tentar?: () => void };
/** #861: o id da barra que está sendo salva (ainda não tem id do servidor). */
export const ID_PENDENTE = "pendente";

/** #861: os minutos que um pedido de salvar vai ocupar (os quadrados antigos valem a hora cheia). */
const minutosDoPedido = (b: Salvar) =>
  b.de !== undefined && b.ate !== undefined ? { de: b.de, ate: b.ate } : { de: (b.inicio ?? 0) * 60, ate: ((b.fim ?? 0) + 1) * 60 };

/** Quanto tempo segurar o dedo pra começar a arrastar (antes disso, o dedo rola a agenda). */
const SEGURAR_MS = 320;
/** #858: salvar/apagar com rede travada não pode deixar a agenda presa em "salvando" pra sempre. */
export const PRAZO_MS = 15_000;
const MSG_PRAZO = "A conexão demorou demais. Confira a internet e tente de novo.";
async function comPrazo(url: string, init: RequestInit): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), PRAZO_MS);
  try { return await fetch(url, { ...init, signal: ctl.signal }); } finally { clearTimeout(t); }
}

export default function AgendaBandeja({ canalId, aberta, onFechar, versao }: {
  canalId: string;
  aberta: boolean;
  onFechar: () => void;
  /** muda quando chega o evento "agenda" do canal (alguém marcou ou apagou) → recarrega. */
  versao: number;
}) {
  const [blocos, setBlocos] = useState<BlocoComId[]>([]);
  const [gente, setGente] = useState<Map<string, Pessoa>>(new Map());
  const [eu, setEu] = useState<string | null>(null);
  const [ancora, setAncora] = useState<Ancora>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // #850
  const celular = useIsMobile(QUERY_CELULAR);
  const [agora, setAgora] = useState(() => new Date());
  const [diaCel, setDiaCel] = useState<Dia>(() => new Date().getDay() as Dia);
  const [editando, setEditando] = useState<Faixa | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  // #861: o que já aparece na tela antes do servidor responder (interface otimista)
  const [pendente, setPendente] = useState<Faixa | null>(null);
  const [escondidos, setEscondidos] = useState<ReadonlySet<string>>(new Set());
  // os quadrados só ficam desligados na PRIMEIRA carga do canal (depois, recarregar não trava nada)
  const [carregouUmaVez, setCarregouUmaVez] = useState(false);
  // #861 PR 2: o filtro de cima, os meus contatos (do servidor) e a lista de quem está num horário
  const [filtro, setFiltro] = useState<FiltroAgenda>("todos");
  const [contatos, setContatos] = useState<ReadonlySet<string>>(new Set());
  const [lista, setLista] = useState<{ dia: Dia; hora: number } | null>(null);
  const [arrasto, setArrastoEstado] = useState<Arrasto | null>(null);
  // #858: o arrasto também mora numa ref — o soltar lê dela e salva FORA do updater do setState
  // (o Strict Mode repete updaters, e salvar lá dentro mandava o POST duas vezes)
  const arrastoRef = useRef<Arrasto | null>(null);
  // #861: depois do 1º toque, a hora em que o mouse está (pra mostrar "14h–17h" ANTES de confirmar)
  const [mira, setMira] = useState<{ dia: Dia; hora: number } | null>(null);
  const setArrasto = useCallback((a: Arrasto | null) => { arrastoRef.current = a; setArrastoEstado(a); }, []);
  const avisoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gradeRef = useRef<HTMLDivElement>(null);
  const rolouPraAgora = useRef(false);
  // #867: a largura da área da grade, pra saber se um bloco dividido ainda cabe foto + nome + horário
  const [larguraGrade, setLarguraGrade] = useState(0);
  useEffect(() => {
    const el = gradeRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setLarguraGrade(el.clientWidth));
    ro.observe(el);
    setLarguraGrade(el.clientWidth);
    return () => ro.disconnect();
  }, [aberta]);

  const dialogoRef = useRef<HTMLDivElement>(null);
  // Só a ÚLTIMA carga vale: o evento "agenda" do Pusher, o salvar e o trocar de canal disparam cargas em
  // sequência, e uma resposta velha chegando depois da nova sobrescrevia a agenda com dado antigo (ou de
  // outro canal). Cada carga aborta a anterior e confere o número antes de gravar.
  const cargaAtual = useRef(0);
  const abortar = useRef<AbortController | null>(null);
  // O canal que está NA TELA agora. Um salvar/apagar do canal A que termina depois de o usuário ir pro B
  // não pode recarregar (nem mostrar erro de) A por cima de B.
  const canalNaTela = useRef(canalId);
  canalNaTela.current = canalId;

  const carregar = useCallback(async () => {
    if (canalId !== canalNaTela.current) return;
    const minha = ++cargaAtual.current;
    abortar.current?.abort();
    const ctl = new AbortController();
    abortar.current = ctl;
    setCarregando(true);
    try {
      const r = await fetch(`/api/canal/${canalId}/agenda`, { cache: "no-store", signal: ctl.signal });
      const j = await r.json().catch(() => ({}));
      if (minha !== cargaAtual.current) return;
      if (!r.ok) { setErro(j?.error || `Não deu pra abrir a agenda (${r.status})`); return; }
      setBlocos(j.blocos ?? []);
      setGente(new Map((j.pessoas ?? []).map((p: Pessoa) => [p.id, p])));
      setEu(j.eu ?? null);
      setContatos(new Set<string>(Array.isArray(j.contatos) ? j.contatos : []));
      setErro(null);
      setCarregouUmaVez(true);
    } catch (e) {
      if ((e as Error)?.name === "AbortError" || minha !== cargaAtual.current) return;
      setErro(String((e as Error)?.message ?? e));
    } finally {
      if (minha === cargaAtual.current) setCarregando(false);
    }
  }, [canalId]);

  // trocou de canal: some o dado do canal anterior (declarado ANTES da carga, pra limpar e só então carregar)
  useEffect(() => {
    setAncora(null);
    setBlocos([]);
    setGente(new Map());
    setErro(null);
    setEditando(null);
    setPendente(null);
    setEscondidos(new Set());
    setCarregouUmaVez(false);
    // #858: o "Desfazer" do canal anterior recriaria o horário NESTE canal
    if (avisoTimer.current) clearTimeout(avisoTimer.current);
    setAviso(null);
  }, [canalId]);
  // A carga e o cancelamento dela moram no MESMO efeito: ao trocar de canal, fechar ou chegar versão nova,
  // o cleanup invalida a carga anterior (e solta o "carregando" dela) e só então a nova começa.
  useEffect(() => {
    if (!aberta) return;
    void carregar();
    return () => { cargaAtual.current++; abortar.current?.abort(); setCarregando(false); };
  }, [aberta, carregar, versao]);
  useEffect(() => { setAncora(null); setEditando(null); rolouPraAgora.current = false; }, [aberta]);
  useEffect(() => { if (!ancora) setMira(null); }, [ancora]);

  // #850: o relógio da agenda (hoje, a linha de agora e o que já passou) anda de minuto em minuto
  useEffect(() => {
    if (!aberta) return;
    setAgora(new Date());
    const t = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(t);
  }, [aberta]);
  // #850: ao abrir, rola até a hora de agora (as horas de baixo ficavam escondidas)
  useEffect(() => {
    if (!aberta || carregando || rolouPraAgora.current) return;
    // #858: a hora lida AGORA (o estado `agora` pode ainda ser o de quando a agenda fechou)
    const linha = gradeRef.current?.querySelector<HTMLElement>(`[data-hora-rotulo="${Math.max(HORAS[0]!, new Date().getHours() - 1)}"]`);
    if (linha && typeof linha.scrollIntoView === "function") { linha.scrollIntoView({ block: "start" }); rolouPraAgora.current = true; }
  }, [aberta, carregando]);

  // foco: ao abrir vai pra bandeja (o fundo fica inerte); ao fechar volta pra quem abriu (o 🗓).
  // A volta espera um tique: nesse instante o fundo ainda está inerte e recusaria o foco.
  useEffect(() => {
    if (!aberta) return;
    const anterior = document.activeElement as HTMLElement | null;
    dialogoRef.current?.focus();
    return () => { setTimeout(() => { if (anterior && anterior.isConnected) anterior.focus(); }, 0); };
  }, [aberta]);

  // Esc: um nível por vez (1º fecha a janelinha / cancela a seleção, 2º fecha) e não vaza pra outros ouvintes.
  // Tecla SEGURADA (repeat) não conta: senão um Esc longo cancelava a seleção e já fechava a agenda.
  useEffect(() => {
    if (!aberta) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      if (e.repeat) return;
      if (lista) setLista(null);
      else if (editando) setEditando(null);
      else if (ancora) setAncora(null);
      else onFechar();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberta, ancora, editando, lista, onFechar]);

  // Tab preso na bandeja: o resto do painel está inerte, mas a página em volta (sidebar do lab) não.
  const prenderTab = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const raiz = dialogoRef.current;
    if (!raiz) return;
    const focaveis = [...raiz.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])")];
    if (focaveis.length === 0) { e.preventDefault(); raiz.focus(); return; }
    const primeiro = focaveis[0]!, ultimo = focaveis[focaveis.length - 1]!;
    const ativo = document.activeElement;
    if (e.shiftKey && (ativo === primeiro || ativo === raiz)) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && (ativo === ultimo || !raiz.contains(ativo))) { e.preventDefault(); primeiro.focus(); }
  };

  const avisar = useCallback((texto: string, desfazer?: Salvar) => {
    if (avisoTimer.current) clearTimeout(avisoTimer.current);
    setAviso({ texto, desfazer });
    avisoTimer.current = setTimeout(() => setAviso(null), desfazer ? 6000 : 4500);
  }, []);
  /** #861: deu erro — a mudança já voltou na tela; o aviso fica mais tempo e oferece tentar de novo. */
  const avisarErro = useCallback((texto: string, tentar: () => void) => {
    if (avisoTimer.current) clearTimeout(avisoTimer.current);
    setAviso({ texto, erro: true, tentar });
    avisoTimer.current = setTimeout(() => setAviso(null), 8000);
  }, []);
  useEffect(() => () => { if (avisoTimer.current) clearTimeout(avisoTimer.current); }, []);

  /** "toda segunda, 7h–10h · a próxima é seg, 24/11" */
  const quando = useCallback((dia: Dia, de: number, ate: number) =>
    // #867: sábado e domingo são masculinos ("todo sábado"); os outros dias, femininos ("toda segunda")
    `${dia === 0 || dia === 6 ? "todo" : "toda"} ${DIA_LONGO[dia]}, ${textoHora(de)}–${textoHora(ate)} · a próxima é ${textoData(proximaVez(dia, de, new Date()))}`, []);

  const TENTAR = tr("agenda.tentarDeNovo", "Tentar de novo");

  // #861: a barra aparece na hora (pendente) e os pedaços que ela substitui somem; o servidor confirma depois.
  const salvar = useCallback(async (b: Salvar, texto = "Marcado"): Promise<void> => {
    const m = minutosDoPedido(b);
    setSalvando(true);
    if (eu) setPendente({ userId: eu, dia: b.dia, de: m.de, ate: m.ate, ids: [ID_PENDENTE] });
    if (b.substitui?.length) setEscondidos(new Set(b.substitui));
    const desfazerNaTela = () => { setPendente(null); setEscondidos(new Set()); };
    try {
      const r = await comPrazo(`/api/canal/${canalId}/agenda`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
      const j = await r.json().catch(() => ({}));
      if (canalId !== canalNaTela.current) return;   // já estou em outro canal: nada daqui vale pra ele
      if (!r.ok) {
        desfazerNaTela();
        if (r.status === 409) {   // #858: a janelinha estava velha
          setErro(j?.error || `Não deu pra salvar (${r.status})`);
          setEditando(null); await carregar();
          return;
        }
        avisarErro(j?.error || tr("agenda.naoSalvou", "Não deu pra salvar o horário."), () => void salvar(b, texto));
        return;
      }
      setErro(null);
      const mm = j?.bloco ? minutosDo(j.bloco) : m;
      avisar(`${texto}: ${quando((j?.bloco?.dia ?? b.dia) as Dia, mm.de, mm.ate)}`);
      await carregar();
      desfazerNaTela();
    } catch (e) {
      if (canalId !== canalNaTela.current) return;
      desfazerNaTela();
      avisarErro((e as Error)?.name === "AbortError" ? MSG_PRAZO : tr("agenda.naoSalvou", "Não deu pra salvar o horário."), () => void salvar(b, texto));
    } finally {
      setSalvando(false);
    }
  }, [canalId, carregar, avisar, avisarErro, quando, eu]);

  /** #850: apaga a faixa inteira (todos os pedaços), sem perguntar — o aviso traz o "Desfazer". #861: some na hora. */
  const apagar = useCallback(async (f: Faixa): Promise<void> => {
    setEditando(null);
    setSalvando(true);
    setEscondidos(new Set(f.ids));
    try {
      const q = f.ids.map((id) => `bloco=${encodeURIComponent(id)}`).join("&");
      const r = await comPrazo(`/api/canal/${canalId}/agenda?${q}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (canalId !== canalNaTela.current) return;
      if (!r.ok) {
        setEscondidos(new Set());
        avisarErro(j?.error || tr("agenda.naoApagou", "Não deu pra apagar o horário."), () => void apagar(f));
        return;
      }
      avisar("Horário apagado", { dia: f.dia, de: f.de, ate: f.ate });
      await carregar();
      setEscondidos(new Set());
    } catch (e) {
      if (canalId !== canalNaTela.current) return;
      setEscondidos(new Set());
      avisarErro((e as Error)?.name === "AbortError" ? MSG_PRAZO : tr("agenda.naoApagou", "Não deu pra apagar o horário."), () => void apagar(f));
    } finally {
      setSalvando(false);
    }
  }, [canalId, carregar, avisar, avisarErro]);

  const fs = useMemo(() => faixas(blocos.filter((b) => !escondidos.has(b.id))), [blocos, escondidos]);
  /** o que se desenha: o que veio do servidor + a barra que está sendo salva. */
  /** #861 PR 2: o que o filtro deixa ver (vale pro desenho, pros rótulos dos quadrados e pro toque). */
  const fsVisiveis = useMemo(() => filtrarFaixas(fs, filtro, eu, contatos), [fs, filtro, eu, contatos]);
  const fsNaTela = useMemo(() => (pendente ? [...fsVisiveis, pendente] : fsVisiveis), [fsVisiveis, pendente]);
  // #858: apagaram (noutra aba) o horário que a janelinha está editando → a janelinha fecha
  useEffect(() => {
    if (editando && !editando.ids.every((id) => blocos.some((b) => b.id === id))) setEditando(null);
  }, [blocos, editando]);
  const minhas = useMemo(() => (eu ? fs.filter((f) => f.userId === eu) : []), [fs, eu]);
  // cores sem repetir no canal: eu primeiro, depois na ordem em que as pessoas aparecem
  const cores = useMemo(() => coresDoCanal([...(eu ? [eu] : []), ...fs.map((f) => f.userId)]), [fs, eu]);
  const corDe = (id: string) => cores.get(id) ?? "#3b82f6";
  const nomeDe = (id: string) => gente.get(id)?.nome ?? "Alguém";

  const clicar = (dia: Dia, hora: number) => {
    if (salvando) return;
    const aqui = naCelula(fsVisiveis, dia, hora);
    if (!ancora) {
      // tocar no SEU horário = janelinha (mudar início/fim, apagar)
      const minha = aqui.find((o) => o.faixa.userId === eu);
      if (minha) { setEditando(minha.faixa); return; }
      // logo embaixo / em cima do seu horário (mesmo dia) = esticar até aqui
      const vizinha = minhas.find((f) => f.dia === dia && (f.ate === hora * 60 || f.de === (hora + 1) * 60));
      if (vizinha) {
        void salvar({ dia, de: Math.min(vizinha.de, hora * 60), ate: Math.max(vizinha.ate, (hora + 1) * 60) }, "Esticado");
        return;
      }
      // #861 PR 2: horário de outra(s) pessoa(s) = a lista de quem está, com "Marcar também"
      if (aqui.length) { setLista({ dia, hora }); return; }
      if (jaPassou(dia, hora, agora)) avisar(`Já passou nesta semana — vale a partir da próxima (${textoData(proximaVez(dia, hora * 60, agora))})`);
    }
    const r = proximoClique(ancora, { dia, hora });
    setAncora(r.ancora);
    if (r.bloco) void salvar(r.bloco);
  };

  // ── ARRASTAR (#850): mouse arrasta na hora; no toque, segurar ~0,3 s e arrastar (antes disso o dedo rola) ──
  const ignorarClique = useRef(false);
  const pressao = useRef<{ dia: Dia; hora: number; tipo: string; timer: ReturnType<typeof setTimeout> | null } | null>(null);
  const celulaEm = (x: number, y: number): { dia: Dia; hora: number } | null => {
    const el = (typeof document.elementFromPoint === "function" ? document.elementFromPoint(x, y) : null)?.closest<HTMLElement>("[data-hora]");
    if (!el) return null;
    return { dia: Number(el.dataset.dia) as Dia, hora: Number(el.dataset.hora) };
  };
  const comecarPressao = (e: React.PointerEvent, dia: Dia, hora: number) => {
    if (salvando || !carregouUmaVez || (e.pointerType === "mouse" && e.button !== 0)) return;
    const p = { dia, hora, tipo: e.pointerType, timer: null as ReturnType<typeof setTimeout> | null };
    if (e.pointerType !== "mouse") p.timer = setTimeout(() => setArrasto({ dia, de: hora, ate: hora, ativo: true }), SEGURAR_MS);
    pressao.current = p;
  };
  useEffect(() => {
    const mover = (e: PointerEvent) => {
      const p = pressao.current;
      if (!p) return;
      const c = celulaEm(e.clientX, e.clientY);
      if (!c || c.dia !== p.dia) return;
      const a = arrastoRef.current;
      if (a?.ativo) { if (a.ate !== c.hora) setArrasto({ ...a, ate: c.hora }); }
      else if (p.tipo === "mouse" && c.hora !== p.hora) setArrasto({ dia: p.dia, de: p.hora, ate: c.hora, ativo: true });
    };
    const soltar = () => {
      const p = pressao.current;
      pressao.current = null;
      if (p?.timer) clearTimeout(p.timer);
      const a = arrastoRef.current;
      setArrasto(null);
      if (!a?.ativo) return;
      ignorarClique.current = true;
      setTimeout(() => { ignorarClique.current = false; }, 0);
      setAncora(null);
      if (a.de !== a.ate) void salvar({ dia: a.dia, inicio: Math.min(a.de, a.ate), fim: Math.max(a.de, a.ate) });
    };
    const cancelar = () => { const p = pressao.current; if (p?.timer) clearTimeout(p.timer); pressao.current = null; setArrasto(null); };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", cancelar);
    return () => { window.removeEventListener("pointermove", mover); window.removeEventListener("pointerup", soltar); window.removeEventListener("pointercancel", cancelar); };
  }, [salvar, setArrasto]);
  // arrastando com o dedo, o dedo não rola a agenda (listener não-passivo: o React registra touchmove como passivo)
  useEffect(() => {
    const el = gradeRef.current;
    if (!el || !arrasto?.ativo) return;
    const prender = (e: TouchEvent) => e.preventDefault();
    el.addEventListener("touchmove", prender, { passive: false });
    return () => el.removeEventListener("touchmove", prender);
  }, [arrasto?.ativo]);
  // #861: o que vai ser marcado se a pessoa confirmar agora — arrastando, ou entre o 1º toque e onde o mouse está
  // (cada quadrado é a hora INTEIRA: tocar 14h e depois 16h marca 14h–17h; o rascunho mostra isso antes)
  const rascunho: { dia: Dia; de: number; ate: number } | null = arrasto?.ativo
    ? { dia: arrasto.dia, de: Math.min(arrasto.de, arrasto.ate), ate: Math.max(arrasto.de, arrasto.ate) }
    : ancora
      ? (() => { const h = mira?.dia === ancora.dia ? mira.hora : ancora.hora; return { dia: ancora.dia, de: Math.min(ancora.hora, h), ate: Math.max(ancora.hora, h) }; })()
      : null;
  const textoRascunho = rascunho ? `${rascunho.de}h–${rascunho.ate + 1}h` : "";
  const naSelecao = (dia: Dia, hora: number) => !!rascunho && rascunho.dia === dia && hora >= rascunho.de && hora <= rascunho.ate;

  const pessoasNaAgenda = useMemo(() => [...new Set(blocos.map((b) => b.userId))].map((id) => gente.get(id) ?? { id, nome: "Alguém", avatar: null }), [blocos, gente]);

  if (!aberta) return null;

  const hoje = agora.getDay() as Dia;
  const minAgora = agora.getHours() * 60 + agora.getMinutes();
  const dias = celular ? [diaCel] : DIAS_ORDEM;
  const ALT = celular ? ALTURA_HORA.celular : ALTURA_HORA.computador;
  const alturaGrade = HORAS.length * ALT;
  const colunasGrade = { gridTemplateColumns: `40px repeat(${dias.length}, minmax(0,1fr))` };
  // largura aproximada de UM dia na grade: tira o recuo dos lados, a coluna das horas (40) e os vãos (4 px)
  const larguraDia = larguraGrade ? (larguraGrade - (celular ? 16 : 32) - 40 - 4 * dias.length) / dias.length : 0;
  const passarDia = (passo: number) => setDiaCel((d) => DIAS_ORDEM[(posNaSemana(d) + passo + 7) % 7]!);

  return (
    <div ref={dialogoRef} tabIndex={-1} role="dialog" aria-modal="true" onKeyDown={prenderTab} aria-label="Agenda do escritório" className={`absolute inset-y-0 left-0 z-40 outline-none w-full sm:w-[min(720px,94%)] flex flex-col rounded-[28px] overflow-hidden ${VIDRO_POPOVER_SOLIDO}`}>
      <div className="flex items-start gap-2 px-4 py-2.5 border-b border-white/50 dark:border-white/[0.08]">
        {/* #850: "repete toda semana" também no celular (sem ele, marcar segunda numa quinta parecia marcar o passado) */}
        <div className="min-w-0 flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
          <span className={`text-[14px] font-bold ${TXT}`}>Agenda da semana</span>
          <span className={`text-[12px] font-semibold text-blue-700 dark:text-cyan-300`}>se repete toda semana · todos do canal veem</span>
        </div>
        <button type="button" onClick={onFechar} aria-label="Fechar a agenda" className={`ml-auto shrink-0 ${TOQUE} rounded-2xl text-[14px] ${VIDRO_CHIP} ${TXT}`}>×</button>
      </div>

      <p className={`px-4 pt-2 text-[12px] ${TXT_2}`}>
        {rascunho
          ? arrasto?.ativo
            ? `Marcando ${DIA_CURTO[rascunho.dia]} ${textoRascunho} — solte para salvar.`
            : `Marcando ${DIA_CURTO[rascunho.dia]} ${textoRascunho}. Toque na ÚLTIMA hora que você quer (ou Esc pra cancelar).`
          : celular
            ? "Toque no horário inicial e depois no final (ou segure e arraste). Toque no seu horário para mudar ou apagar."
            : "Toque no horário inicial e depois no final (ou arraste). Clique no seu horário para mudar ou apagar."}
      </p>
      {erro && <p role="alert" className="px-4 pt-1 text-[12px] text-rose-600 dark:text-rose-300">{erro}</p>}

      {/* #861 PR 2: ver todo mundo, só o meu horário, ou eu + os meus contatos */}
      <div role="group" aria-label={tr("agenda.filtro", "Mostrar na agenda")} className="flex flex-wrap gap-1.5 px-4 pt-2">
        {(["todos", "eu", "contatos"] as const).map((f) => (
          <button key={f} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)}
            className={`min-h-[36px] rounded-full border px-3 text-[12px] font-semibold transition-colors
              ${filtro === f ? "border-cyan-500/70 bg-cyan-500/15 text-cyan-800 dark:border-cyan-300/60 dark:text-cyan-100" : `border-slate-300 dark:border-white/15 ${TXT_2}`}`}>
            {f === "todos" ? tr("agenda.todos", "Todos") : f === "eu" ? tr("agenda.soEu", "Só eu") : tr("agenda.meusContatos", "Meus contatos")}
          </button>
        ))}
      </div>

      {/* #850: no celular, um dia por vez — a semana inteira não cabia (a grade de 560 px rolava de lado) */}
      {celular && (
        <div className="flex items-center justify-between gap-2 px-3 pt-2">
          <button type="button" onClick={() => passarDia(-1)} aria-label="Dia anterior" className={`${TOQUE} rounded-2xl ${VIDRO_CHIP} ${TXT}`}>‹</button>
          <span className={`text-[14px] font-bold ${diaCel === hoje ? "text-blue-700 dark:text-cyan-300" : TXT}`}>
            {DIA_LONGO[diaCel]}{diaCel === hoje ? " · hoje" : ""}
          </span>
          <button type="button" onClick={() => passarDia(1)} aria-label="Próximo dia" className={`${TOQUE} rounded-2xl ${VIDRO_CHIP} ${TXT}`}>›</button>
        </div>
      )}

      <div ref={gradeRef} className="flex-1 min-h-0 overflow-auto custom-scrollbar px-2 sm:px-4 py-3 [box-shadow:inset_0_-14px_12px_-12px_rgba(15,23,42,0.18)]">
        {/* #858: no celular não tem linha de cabeçalho — o dia já aparece no ‹ › */}
        {!celular && (
          // -top-3: o sticky conta a partir do padding (py-3) da área que rola; sem isso sobrava uma faixa de 12 px
          // acima dos dias onde as barras apareciam cortadas ao rolar
          <div className="sticky -top-3 z-[3] -mt-3 grid gap-x-1 min-w-[560px] pt-3 pb-1.5 bg-white dark:bg-[#0b1020]" style={colunasGrade}>
            <div />
            {dias.map((d) => (
              <div key={`h-${d}`} className={`py-1 text-center text-[12px] font-bold rounded-lg
                ${d === hoje ? "bg-blue-500/10 text-blue-700 dark:bg-cyan-400/10 dark:text-cyan-300" : ancora?.dia === d ? "text-blue-600 dark:text-cyan-300" : TXT_2}`}>
                {DIA_CURTO[d]}{d === hoje ? " · hoje" : ""}
              </div>
            ))}
          </div>
        )}
        <div className={`grid gap-x-1 ${celular ? "" : "min-w-[560px]"}`} style={colunasGrade}>
          {/* as horas: cada rótulo na linha de cima da sua hora */}
          <div className="relative" style={{ height: alturaGrade }}>
            {HORAS.map((h, i) => (
              // scroll-mt: ao rolar até a hora, ela fica logo abaixo do cabeçalho fixo dos dias (e não escondida atrás dele)
              <div key={h} data-hora-rotulo={h} className={`absolute right-1.5 scroll-mt-12 text-[11px] tabular-nums ${TXT_MUDO}`} style={{ top: i * ALT + 3 }}>{h}h</div>
            ))}
          </div>
          {dias.map((d) => (
            <div key={d} data-coluna-dia={d} className="relative" style={{ height: alturaGrade }}>
              {/* os quadrados: o lugar de tocar, arrastar e ler (leitor de tela) quem está em cada hora */}
              {HORAS.map((h, i) => {
                const occ = naCelula(fsVisiveis, d, h);
                const passou = jaPassou(d, h, agora);
                const rotulo = occ.length ? `${DIA_CURTO[d]} ${h}h: ${occ.map((o) => nomeDe(o.faixa.userId)).join(", ")}` : `${DIA_CURTO[d]} ${h}h: livre`;
                return (
                  <button key={`${d}-${h}`} type="button" data-dia={d} data-hora={h} data-passou={passou || undefined}
                    onPointerDown={(e) => comecarPressao(e, d, h)}
                    onPointerEnter={(e) => { if (ancora && e.pointerType !== "touch") setMira({ dia: d, hora: h }); }}
                    // teclado: o rascunho acompanha o quadrado em foco, como acompanha o mouse
                    onFocus={() => { if (ancora) setMira({ dia: d, hora: h }); }}
                    onClick={() => { if (!ignorarClique.current) clicar(d, h); }}
                    onContextMenu={(e) => { if (arrasto?.ativo || pressao.current) e.preventDefault(); }}
                    disabled={!carregouUmaVez}
                    title={passou ? `${rotulo} · já passou nesta semana` : rotulo} aria-label={rotulo}
                    style={{ top: i * ALT, height: ALT }}
                    className={`absolute inset-x-0 border-b border-x transition-colors select-none [-webkit-touch-callout:none] ${i === 0 ? "rounded-t-xl border-t" : ""} ${i === HORAS.length - 1 ? "rounded-b-xl" : ""}
                      ${naSelecao(d, h) ? "border-slate-200 dark:border-white/[0.07]" /* o contorno é o do rascunho tracejado */ :"border-slate-200 dark:border-white/[0.07] hover:bg-blue-500/[0.06] dark:hover:bg-cyan-300/[0.05]"}
                      ${passou ? "bg-slate-100 dark:bg-[#0d1322]" : d === hoje ? "bg-blue-50 dark:bg-[#0f1a2e]" : "bg-white dark:bg-[#111827]"}`} />
                );
              })}
              {/* as barras: cada horário de uma vez, do começo ao fim (não recebem o toque — ele vai pro quadrado de baixo) */}
              <div aria-hidden className="pointer-events-none absolute inset-0">
                {/* a linha de AGORA (como no Google Agenda): desce sozinha, de minuto em minuto. Vem ANTES das barras,
                    então passa por baixo delas (não risca o nome/horário; o bloco de agora já tem o contorno e o selo) */}
                {d === hoje && minAgora >= MIN_INICIO && minAgora <= MIN_INICIO + HORAS.length * 60 && (
                  <div data-agora className="absolute inset-x-0" style={{ top: ((minAgora - MIN_INICIO) / 60) * ALT }}>
                    <span className="absolute -left-1 -top-[4px] h-[10px] w-[10px] rounded-full bg-rose-500" />
                    <span className="block h-[2px] bg-rose-500" />
                  </div>
                )}
                {/* #861: o rascunho — o horário que vai ser marcado, escrito, antes de confirmar */}
                {rascunho?.dia === d && (
                  <div data-rascunho className="absolute inset-x-0.5 z-[2] rounded-xl border-2 border-dashed border-blue-500 bg-blue-500/15 dark:border-cyan-300 dark:bg-cyan-300/15"
                    style={{ top: (rascunho.de - HORAS[0]!) * ALT + 1, height: (rascunho.ate - rascunho.de + 1) * ALT - 2 }}>
                    <span className="m-1 inline-block rounded-md bg-blue-600 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white dark:bg-cyan-300 dark:text-slate-900">{textoRascunho}</span>
                  </div>
                )}
                {blocosDoDia(fsNaTela, d, ALT).map((b) => (
                  <BarraDoHorario key={`${b.faixa.userId}-${b.faixa.de}-${b.faixa.ids[0]}`} b={b} cor={corDe(b.faixa.userId)} minha={b.faixa.userId === eu}
                    nome={nomeDe(b.faixa.userId)} foto={gente.get(b.faixa.userId)?.avatar ?? null} pendente={b.faixa.ids[0] === ID_PENDENTE}
                    agora={acontecendoAgora(b.faixa, agora)} larguraDia={larguraDia} rostos={b.multidao ? pessoasNoBloco(b).map((id) => ({ id, nome: nomeDe(id), foto: gente.get(id)?.avatar ?? null, cor: corDe(id) })) : undefined} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {pessoasNaAgenda.length > 0 && (
        <div data-legenda className="flex flex-wrap gap-2 px-4 py-2.5 border-t border-white/50 dark:border-white/[0.08]">
          {pessoasNaAgenda.map((p) => (
            <span key={p.id} className={`inline-flex items-center gap-1.5 text-[12px] ${TXT_2}`}>
              <span className="w-3 h-3 rounded-full" style={{ background: corDe(p.id) }} aria-hidden />
              {p.id === eu ? `${p.nome} (você)` : p.nome}
            </span>
          ))}
        </div>
      )}

      {/* aviso de baixo: o que foi marcado (e quando começa), quem está no quadrado, o "já passou", o Desfazer */}
      {aviso && (
        <div role={aviso.erro ? "alert" : "status"} data-aviso-agenda={aviso.erro ? "erro" : "ok"}
          className={`absolute inset-x-3 bottom-3 z-20 flex items-center gap-2 rounded-2xl bg-slate-900/95 px-3 py-2 text-[13px] text-white shadow-xl border ${aviso.erro ? "border-rose-400/60" : "border-white/10"}`}>
          <span aria-hidden className={aviso.erro ? "text-rose-300" : "text-cyan-300"}>{aviso.erro ? "⚠️" : "✓"}</span>
          <span className={`min-w-0 flex-1 ${aviso.erro ? "text-rose-100" : ""}`}>{aviso.texto}</span>
          {aviso.desfazer && (
            <button type="button" onClick={() => { const d = aviso.desfazer!; setAviso(null); void salvar(d, "Voltou"); }}
              className="shrink-0 min-h-[44px] rounded-xl px-3 font-bold text-cyan-300 hover:bg-white/10">Desfazer</button>
          )}
          {aviso.tentar && (
            <button type="button" onClick={() => { const f = aviso.tentar!; setAviso(null); f(); }}
              className="shrink-0 min-h-[44px] rounded-xl px-3 font-bold text-cyan-300 hover:bg-white/10">{TENTAR}</button>
          )}
        </div>
      )}

      {/* #861 PR 2: quem está neste horário, com "Marcar também" */}
      {lista && (
        <ListaDoHorario dia={lista.dia} hora={lista.hora}
          gente={naCelula(fsVisiveis, lista.dia, lista.hora).map((o) => ({
            id: o.faixa.userId, nome: o.faixa.userId === eu ? `${nomeDe(o.faixa.userId)} (você)` : nomeDe(o.faixa.userId),
            foto: gente.get(o.faixa.userId)?.avatar ?? null, cor: corDe(o.faixa.userId), horario: `${textoHora(o.faixa.de)}–${textoHora(o.faixa.ate)}`,
            de: o.faixa.de, ate: o.faixa.ate, eu: o.faixa.userId === eu,
          }))}
          jaEstou={!!eu && naCelula(fs, lista.dia, lista.hora).some((o) => o.faixa.userId === eu)}
          onFechar={() => setLista(null)}
          onMarcar={(de, ate) => { const l = lista; setLista(null); void salvar({ dia: l.dia, de, ate }); }} />
      )}

      {/* janelinha do SEU horário: mudar início/fim (de 15 em 15) ou apagar */}
      {editando && <JanelaHorario faixa={editando} salvando={salvando}
        onFechar={() => setEditando(null)}
        onApagar={() => void apagar(editando)}
        onSalvar={(de, ate) => { const f = editando; setEditando(null); void salvar({ dia: f.dia, de, ate, substitui: f.ids }, "Atualizado"); }} />}
    </div>
  );
}

/** #850: a janelinha do bloco — "Segunda · Começa [07:30] · Termina [10:00] · Salvar · Apagar". */
function JanelaHorario({ faixa, salvando, onFechar, onApagar, onSalvar }: {
  faixa: Faixa; salvando: boolean; onFechar: () => void; onApagar: () => void; onSalvar: (de: number, ate: number) => void;
}) {
  const [de, setDe] = useState(faixa.de);
  const [ate, setAte] = useState(faixa.ate);
  const valido = de < ate;
  const campo = `mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-2 text-[16px] text-slate-900 dark:border-white/15 dark:bg-[#0b1020] dark:text-white`;
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-slate-900/30 p-4" onClick={onFechar}>
      <div role="dialog" aria-label={`Seu horário de ${DIA_LONGO[faixa.dia]}`} onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-[320px] rounded-2xl p-4 ${VIDRO_POPOVER_SOLIDO}`}>
        <p className={`text-[15px] font-bold capitalize ${TXT}`}>{DIA_LONGO[faixa.dia]}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className={`text-[12px] font-semibold ${TXT_2}`}>Começa
            <select value={de} onChange={(e) => setDe(Number(e.target.value))} className={campo}>
              {OPCOES_MIN.slice(0, -1).map((m) => <option key={m} value={m}>{fmt(m)}</option>)}
            </select>
          </label>
          <label className={`text-[12px] font-semibold ${TXT_2}`}>Termina
            <select value={ate} onChange={(e) => setAte(Number(e.target.value))} className={campo}>
              {OPCOES_MIN.slice(1).map((m) => <option key={m} value={m}>{fmt(m)}</option>)}
            </select>
          </label>
        </div>
        {!valido && <p role="alert" className="mt-2 text-[12px] text-rose-600 dark:text-rose-300">O fim precisa ser depois do começo.</p>}
        <div className="mt-4 flex gap-2">
          <button type="button" disabled={!valido || salvando} onClick={() => onSalvar(de, ate)}
            className="flex-1 min-h-[44px] rounded-xl bg-blue-600 font-bold text-white disabled:opacity-40">Salvar</button>
          <button type="button" disabled={salvando} onClick={onApagar}
            className="flex-1 min-h-[44px] rounded-xl border border-rose-400/60 font-bold text-rose-600 dark:text-rose-300 disabled:opacity-40">Apagar</button>
        </div>
        <button type="button" onClick={onFechar} className={`mt-2 w-full min-h-[40px] rounded-xl text-[13px] font-semibold ${TXT_2}`}>Cancelar</button>
      </div>
    </div>
  );
}

/** 450 → "07:30" (o formato do relógio, no seletor) */
const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** "Don Martinez" → "Don"; "andressa.silva" → "andressa" (no cartão cabe só o primeiro nome; o completo fica no title). */
const primeiroNome = (nome: string) => nome.trim().split(/[\s._]+/)[0] || nome;

/** #861: a foto do perfil, redonda (sem oval nem corte), com um anel na cor da pessoa. */
function Foto({ src, nome, cor, size }: { src: string | null; nome: string; cor: string; size: number }) {
  return (
    // self-start + w-fit: dentro de uma coluna flex, o anel esticava na largura toda e virava uma pílula
    <span className="inline-flex w-fit shrink-0 self-start rounded-full" style={{ boxShadow: `0 0 0 2px ${cor}` }}>
      <AgentAvatar src={src} nome={nome} size={size} />
    </span>
  );
}

/**
 * #861: um horário inteiro, como UMA barra (do começo ao fim), com a foto conforme o tamanho (`modoDoBloco`).
 * Fundo suave na cor da pessoa e uma linha forte na esquerda (como o Apple Calendar). Enquanto salva: brilho e
 * spinner só nela — o resto da agenda continua livre.
 */
type Rosto = { id: string; nome: string; foto: string | null; cor: string };
/** #861 PR 2: a partir de quantos rostos o resto vira "+N". */
const ROSTOS_VISIVEIS = 3;

function BarraDoHorario({ b, cor, minha, nome, foto, pendente, agora, larguraDia = 0, rostos }: {
  b: BlocoNoDia; cor: string; minha: boolean; nome: string; foto: string | null; pendente: boolean;
  /** #867: largura (px) de um dia na grade — no celular, dividido em 2, ainda cabe o nome e o horário */
  larguraDia?: number;
  /** acontecendo agora: contorno ciano e o selo "agora" */
  agora: boolean;
  /** multidão (4+ pessoas ao mesmo tempo): os rostos de quem está */
  rostos?: Rosto[];
}) {
  const horario = `${textoHora(b.faixa.de)}–${textoHora(b.faixa.ate)}`;
  const largura = 100 / b.colunas;
  const selo = agora && <span data-selo-agora className="absolute right-1 top-1 z-[1] rounded-md bg-cyan-400 px-1.5 text-[10.5px] font-bold leading-[18px] text-cyan-950">{tr("agenda.agora", "agora")}</span>;
  if (rostos) {
    // muita gente: um bloco só, em ciano, com os rostos empilhados e "N pessoas" (o número sempre escrito)
    const n = rostos.length;
    return (
      <div data-barra="multidao" data-agora-bloco={agora || undefined} title={`${n} pessoas · ${horario}`}
        className={`absolute overflow-hidden rounded-[10px] border-l-4 border-cyan-400 bg-cyan-400/20 dark:bg-cyan-400/[0.16] ${agora ? "ring-2 ring-cyan-400" : ""}`}
        style={{ top: b.topo + 1, height: Math.max(b.altura - 2, 6), left: 3, right: 3 }}>
        {selo}
        <div className="flex flex-col gap-1 p-1.5 leading-tight">
          <div className="flex">
            {rostos.slice(0, ROSTOS_VISIVEIS).map((r, i) => (
              <span key={r.id} className={i ? "-ml-2" : ""}><Foto src={r.foto} nome={r.nome} cor={r.cor} size={22} /></span>
            ))}
            {n > ROSTOS_VISIVEIS && (
              <span className="-ml-2 grid h-[22px] min-w-[22px] place-items-center rounded-full bg-cyan-700 px-1 text-[10.5px] font-bold text-white ring-2 ring-cyan-400">+{n - ROSTOS_VISIVEIS}</span>
            )}
          </div>
          {b.altura >= 52 && <div className={`truncate text-[12px] font-bold ${TXT}`}>{tr("agenda.nPessoas", "{{n}} pessoas", { n })}</div>}
          {b.altura >= 70 && <div className={`truncate text-[11px] ${TXT_2}`}>{horario}</div>}
        </div>
      </div>
    );
  }
  const modo = modoDoBloco(b.altura, b.colunas, larguraDia / b.colunas);
  return (
    <div data-barra={modo} data-pendente={pendente || undefined} data-agora-bloco={agora || undefined} title={`${nome} · ${horario}`}
      className={`absolute rounded-[10px] border-l-4 ${modo === "curto" || modo === "mini" ? "overflow-visible" : "overflow-hidden"} ${pendente ? "animate-pulse" : ""} ${agora ? "ring-2 ring-cyan-400" : ""}`}
      style={{
        top: b.topo + 1, height: Math.max(b.altura - 2, 6),
        left: `calc(${b.coluna * largura}% + 3px)`, width: `calc(${largura}% - 6px)`,
        background: `${cor}${minha ? "4d" : "38"}`, borderLeftColor: cor,
      }}>
      {modo !== "curto" && modo !== "mini" && b.altura >= 40 && selo}
      {modo === "cartao" && (
        // foto em cima e o nome embaixo, com a largura toda (na semana as colunas têm ~90 px: lado a lado cortava "Giu…")
        <div className="flex min-w-0 flex-col gap-1 p-1.5 leading-tight">
          <Foto src={foto} nome={nome} cor={cor} size={26} />
          <div className={`truncate text-[12px] font-bold ${TXT}`}>{primeiroNome(nome)}</div>
          <div className={`truncate text-[11px] ${TXT_2}`}>{horario}</div>
        </div>
      )}
      {modo === "linha" && (
        <div className={`flex gap-1.5 px-1.5 ${b.altura >= 44 ? "items-start pt-1.5" : "h-full items-center"}`}>
          <Foto src={foto} nome={nome} cor={cor} size={20} />
          {b.altura >= 44 ? (
            <div className="min-w-0 leading-tight">
              <div className={`truncate text-[12px] font-bold ${TXT}`}>{primeiroNome(nome)}</div>
              <div className={`truncate text-[11px] ${TXT_2}`}>{horario}</div>
            </div>
          ) : (
            <span className={`truncate text-[11px] font-semibold ${TXT}`}>{horario}</span>
          )}
        </div>
      )}
      {modo === "estreito" && (
        <div className="flex flex-col items-center gap-0.5 pt-1.5">
          <Foto src={foto} nome={nome} cor={cor} size={22} />
          <span className={`text-[11px] font-semibold ${TXT}`}>{textoHora(b.faixa.de)}</span>
        </div>
      )}
      {modo === "mini" && (
        <div className="grid h-full place-items-center"><Foto src={foto} nome={nome} cor={cor} size={20} /></div>
      )}
      {modo === "curto" && (
        <span className="absolute -left-3 top-1/2 -translate-y-1/2"><Foto src={foto} nome={nome} cor={cor} size={20} /></span>
      )}
      {pendente && (
        <span aria-hidden className="absolute right-1.5 top-1.5 h-3 w-3 animate-spin rounded-full border-2 border-slate-400/40 border-t-slate-700 dark:border-white/30 dark:border-t-white" />
      )}
    </div>
  );
}

/**
 * #861 PR 2: tocar num horário de outra(s) pessoa(s) mostra quem está (foto, nome e horário de cada um) e oferece
 * "Marcar também" — marcar a mesma hora pra estudar junto (como o SAP Fiori: o "+N" abre a lista inteira).
 */
function ListaDoHorario({ dia, hora, gente, jaEstou, onFechar, onMarcar }: {
  dia: Dia; hora: number; gente: (Rosto & { horario: string; de: number; ate: number; eu?: boolean })[]; jaEstou: boolean;
  onFechar: () => void;
  /** #867: marca o horário INTEIRO da pessoa (de/ate em minutos), não só a hora tocada */
  onMarcar: (de: number, ate: number) => void;
}) {
  const fechar = useRef<HTMLButtonElement>(null);
  useEffect(() => { fechar.current?.focus(); }, []);
  // #867: com UMA pessoa, o botão grande copia o horário dela; com várias, cada uma ganha o seu "Entrar"
  const outros = gente.filter((p) => !p.eu);
  const unica = outros.length === 1 ? outros[0] : null;
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-slate-900/30 p-4" onClick={onFechar}>
      <div role="dialog" aria-label={`${DIA_LONGO[dia]}, ${hora}h`} onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-[340px] rounded-2xl p-4 ${VIDRO_POPOVER_SOLIDO}`}>
        <p className={`text-[15px] font-bold ${TXT}`}><span className="capitalize">{DIA_LONGO[dia]}</span>, {hora}h · {gente.length === 1 ? tr("agenda.umaPessoa", "1 pessoa") : tr("agenda.nPessoas", "{{n}} pessoas", { n: gente.length })}</p>
        <ul className="mt-3 flex max-h-[45vh] flex-col gap-2 overflow-auto">
          {gente.map((p) => (
            <li key={p.id} className="flex items-center gap-2.5">
              <Foto src={p.foto} nome={p.nome} cor={p.cor} size={28} />
              <span className={`min-w-0 flex-1 truncate text-[14px] font-semibold ${TXT}`}>{p.nome}</span>
              <span className={`shrink-0 text-[12px] tabular-nums ${TXT_2}`}>{p.horario}</span>
              {!jaEstou && !unica && !p.eu && (
                <button type="button" onClick={() => onMarcar(p.de, p.ate)} aria-label={`${tr("agenda.entrar", "Entrar")} ${p.horario} · ${p.nome}`}
                  className="shrink-0 min-h-[44px] rounded-xl bg-blue-600 px-3 text-[13px] font-bold text-white">
                  {tr("agenda.entrar", "Entrar")}
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          {!jaEstou && unica && (
            <button type="button" onClick={() => onMarcar(unica.de, unica.ate)} className="flex-1 min-h-[44px] rounded-xl bg-blue-600 font-bold text-white">
              {tr("agenda.marcarTambem", "Marcar também")} ({unica.horario})
            </button>
          )}
          <button ref={fechar} type="button" onClick={onFechar}
            className={`flex-1 min-h-[44px] rounded-xl border border-slate-300 font-semibold dark:border-white/15 ${TXT}`}>{tr("agenda.fechar", "Fechar")}</button>
        </div>
      </div>
    </div>
  );
}
