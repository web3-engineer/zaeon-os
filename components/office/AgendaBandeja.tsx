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
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AgentAvatar from "@/components/agents/AgentAvatar";
import {
  DIAS_ORDEM, DIA_CURTO, DIA_LONGO, HORAS, OPCOES_MIN, coresDoCanal, faixas, jaPassou, minutosDo, naCelula, posNaSemana,
  proximaVez, proximoClique, textoData, textoHora,
  type Ancora, type Bloco, type Dia, type Faixa,
} from "@/lib/canal/agenda";
import { useIsMobile, QUERY_CELULAR } from "@/lib/ui/useIsMobile";
import { VIDRO_POPOVER_SOLIDO, VIDRO_CHIP, TXT, TXT_2, TXT_MUDO, TOQUE } from "@/lib/canal/vidro";

type Pessoa = { id: string; nome: string; avatar: string | null };
type BlocoComId = Bloco & { id: string };
type Salvar = { dia: Dia; inicio?: number; fim?: number; de?: number; ate?: number; substitui?: string[] };
type Arrasto = { dia: Dia; de: number; ate: number; ativo: boolean };

/** Quanto tempo segurar o dedo pra começar a arrastar (antes disso, o dedo rola a agenda). */
const SEGURAR_MS = 320;

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
  const [aviso, setAviso] = useState<{ texto: string; desfazer?: Salvar } | null>(null);
  const [arrasto, setArrasto] = useState<Arrasto | null>(null);
  const avisoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gradeRef = useRef<HTMLDivElement>(null);
  const rolouPraAgora = useRef(false);

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
      setErro(null);
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
  }, [canalId]);
  // A carga e o cancelamento dela moram no MESMO efeito: ao trocar de canal, fechar ou chegar versão nova,
  // o cleanup invalida a carga anterior (e solta o "carregando" dela) e só então a nova começa.
  useEffect(() => {
    if (!aberta) return;
    void carregar();
    return () => { cargaAtual.current++; abortar.current?.abort(); setCarregando(false); };
  }, [aberta, carregar, versao]);
  useEffect(() => { setAncora(null); setEditando(null); rolouPraAgora.current = false; }, [aberta]);

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
    const linha = gradeRef.current?.querySelector<HTMLElement>(`[data-hora-rotulo="${Math.max(HORAS[0]!, agora.getHours() - 1)}"]`);
    if (linha && typeof linha.scrollIntoView === "function") { linha.scrollIntoView({ block: "start" }); rolouPraAgora.current = true; }
  }, [aberta, carregando, agora]);

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
      if (editando) setEditando(null);
      else if (ancora) setAncora(null);
      else onFechar();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberta, ancora, editando, onFechar]);

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
  useEffect(() => () => { if (avisoTimer.current) clearTimeout(avisoTimer.current); }, []);

  /** "toda segunda, 7h–10h · a próxima é seg, 24/11" */
  const quando = useCallback((dia: Dia, de: number, ate: number) =>
    `toda ${DIA_LONGO[dia]}, ${textoHora(de)}–${textoHora(ate)} · a próxima é ${textoData(proximaVez(dia, de, new Date()))}`, []);

  const salvar = useCallback(async (b: Salvar, texto = "Marcado") => {
    setSalvando(true);
    try {
      const r = await fetch(`/api/canal/${canalId}/agenda`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
      const j = await r.json().catch(() => ({}));
      if (canalId !== canalNaTela.current) return;   // já estou em outro canal: nada daqui vale pra ele
      if (!r.ok) { setErro(j?.error || `Não deu pra salvar (${r.status})`); return; }
      setErro(null);
      const m = j?.bloco ? minutosDo(j.bloco) : minutosDo({ inicio: b.inicio ?? 0, fim: b.fim ?? 0, de: b.de, ate: b.ate });
      avisar(`${texto}: ${quando((j?.bloco?.dia ?? b.dia) as Dia, m.de, m.ate)}`);
      await carregar();
    } finally {
      setSalvando(false);
    }
  }, [canalId, carregar, avisar, quando]);

  /** #850: apaga a faixa inteira (todos os pedaços), sem perguntar — o aviso traz o "Desfazer". */
  const apagar = useCallback(async (f: Faixa) => {
    setEditando(null);
    setSalvando(true);
    try {
      const q = f.ids.map((id) => `bloco=${encodeURIComponent(id)}`).join("&");
      const r = await fetch(`/api/canal/${canalId}/agenda?${q}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (canalId !== canalNaTela.current) return;
      if (!r.ok) { setErro(j?.error || `Não deu pra apagar (${r.status})`); return; }
      avisar("Horário apagado", { dia: f.dia, de: f.de, ate: f.ate });
      await carregar();
    } finally {
      setSalvando(false);
    }
  }, [canalId, carregar, avisar]);

  const fs = useMemo(() => faixas(blocos), [blocos]);
  const minhas = useMemo(() => (eu ? fs.filter((f) => f.userId === eu) : []), [fs, eu]);
  // cores sem repetir no canal: eu primeiro, depois na ordem em que as pessoas aparecem
  const cores = useMemo(() => coresDoCanal([...(eu ? [eu] : []), ...fs.map((f) => f.userId)]), [fs, eu]);
  const corDe = (id: string) => cores.get(id) ?? "#3b82f6";
  const nomeDe = (id: string) => gente.get(id)?.nome ?? "Alguém";

  const clicar = (dia: Dia, hora: number) => {
    if (salvando) return;
    const aqui = naCelula(fs, dia, hora);
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
      if (aqui.length) avisar(`${DIA_CURTO[dia]} ${hora}h: ${aqui.map((o) => `${nomeDe(o.faixa.userId)} (${textoHora(o.faixa.de)}–${textoHora(o.faixa.ate)})`).join(", ")}`);
      else if (jaPassou(dia, hora, agora)) avisar(`Já passou nesta semana — vale a partir da próxima (${textoData(proximaVez(dia, hora * 60, agora))})`);
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
    if (salvando || carregando || (e.pointerType === "mouse" && e.button !== 0)) return;
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
      setArrasto((a) => {
        if (a?.ativo) return { ...a, ate: c.hora };
        if (p.tipo === "mouse" && c.hora !== p.hora) return { dia: p.dia, de: p.hora, ate: c.hora, ativo: true };
        return a;
      });
    };
    const soltar = () => {
      const p = pressao.current;
      pressao.current = null;
      if (p?.timer) clearTimeout(p.timer);
      setArrasto((a) => {
        if (a?.ativo) {
          ignorarClique.current = true;
          setTimeout(() => { ignorarClique.current = false; }, 0);
          setAncora(null);
          if (a.de !== a.ate) void salvar({ dia: a.dia, inicio: Math.min(a.de, a.ate), fim: Math.max(a.de, a.ate) });
        }
        return null;
      });
    };
    const cancelar = () => { const p = pressao.current; if (p?.timer) clearTimeout(p.timer); pressao.current = null; setArrasto(null); };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", cancelar);
    return () => { window.removeEventListener("pointermove", mover); window.removeEventListener("pointerup", soltar); window.removeEventListener("pointercancel", cancelar); };
  }, [salvar]);
  // arrastando com o dedo, o dedo não rola a agenda (listener não-passivo: o React registra touchmove como passivo)
  useEffect(() => {
    const el = gradeRef.current;
    if (!el || !arrasto?.ativo) return;
    const prender = (e: TouchEvent) => e.preventDefault();
    el.addEventListener("touchmove", prender, { passive: false });
    return () => el.removeEventListener("touchmove", prender);
  }, [arrasto?.ativo]);
  const naSelecao = (dia: Dia, hora: number) =>
    !!arrasto?.ativo && arrasto.dia === dia && hora >= Math.min(arrasto.de, arrasto.ate) && hora <= Math.max(arrasto.de, arrasto.ate);

  const pessoasNaAgenda = useMemo(() => [...new Set(blocos.map((b) => b.userId))].map((id) => gente.get(id) ?? { id, nome: "Alguém", avatar: null }), [blocos, gente]);

  if (!aberta) return null;

  const hoje = agora.getDay() as Dia;
  const minAgora = agora.getHours() * 60 + agora.getMinutes();
  const dias = celular ? [diaCel] : DIAS_ORDEM;
  const alturaLinha = celular ? "h-11" : "h-8";
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
        {ancora
          ? `Agora toque no horário FINAL na coluna de ${DIA_CURTO[ancora.dia]} (ou Esc pra cancelar).`
          : celular
            ? "Toque no horário inicial e depois no final (ou segure e arraste). Toque no seu horário para mudar ou apagar."
            : "Toque no horário inicial e depois no final (ou arraste). Clique no seu horário para mudar ou apagar."}
      </p>
      {erro && <p role="alert" className="px-4 pt-1 text-[12px] text-rose-600 dark:text-rose-300">{erro}</p>}

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
        <div className={`grid ${celular ? "" : "min-w-[560px]"}`} style={{ gridTemplateColumns: `44px repeat(${dias.length}, minmax(0,1fr))` }}>
          <div />
          {dias.map((d) => (
            <div key={`h-${d}`} className={`pb-1 text-center text-[12px] font-bold rounded-t-md ${celular ? "sr-only" : ""}
              ${d === hoje ? "bg-blue-500/10 text-blue-700 dark:bg-cyan-400/10 dark:text-cyan-300" : ancora?.dia === d ? "text-blue-600 dark:text-cyan-300" : TXT_2}`}>
              {DIA_CURTO[d]}{d === hoje ? " · hoje" : ""}
            </div>
          ))}
          {HORAS.map((h) => (
            <Linha key={h} hora={h} altura={alturaLinha}>
              {dias.map((d) => {
                const occ = naCelula(fs, d, h);
                const ehAncora = ancora?.dia === d && ancora.hora === h;
                const passou = jaPassou(d, h, agora);
                const ehAgora = d === hoje && h === agora.getHours();
                const rotulo = occ.length ? `${DIA_CURTO[d]} ${h}h: ${occ.map((o) => nomeDe(o.faixa.userId)).join(", ")}` : `${DIA_CURTO[d]} ${h}h: livre`;
                const comFoto = occ.filter((o) => o.inicial);
                return (
                  <button key={`${d}-${h}`} type="button" data-dia={d} data-hora={h}
                    onPointerDown={(e) => comecarPressao(e, d, h)}
                    onClick={() => { if (!ignorarClique.current) clicar(d, h); }}
                    onContextMenu={(e) => { if (arrasto?.ativo || pressao.current) e.preventDefault(); }}
                    disabled={salvando || carregando}
                    title={passou ? `${rotulo} · já passou nesta semana` : rotulo} aria-label={rotulo}
                    className={`relative ${alturaLinha} m-[1px] rounded-md overflow-hidden flex border transition-colors disabled:cursor-wait select-none [-webkit-touch-callout:none]
                      ${ehAncora || naSelecao(d, h) ? "border-blue-500 ring-2 ring-blue-400/70 dark:border-cyan-300 dark:ring-cyan-300/60" : "border-slate-300/50 dark:border-white/[0.1] hover:border-blue-400/60"}
                      ${d === hoje ? "bg-blue-500/[0.06] dark:bg-cyan-400/[0.05]" : "bg-white/40 dark:bg-white/[0.02]"}
                      ${passou ? "opacity-45" : ""}`}>
                    {occ.map((o) => (
                      <span key={`${o.faixa.userId}-${o.faixa.de}`} className="relative flex-1 h-full">
                        <span className="absolute inset-x-0" style={{
                          top: `${o.topo}%`, height: `${o.altura}%`,
                          background: `${corDe(o.faixa.userId)}${o.faixa.userId === eu ? "7a" : "5c"}`,
                          borderLeft: `3px solid ${corDe(o.faixa.userId)}`,
                        }} />
                      </span>
                    ))}
                    {/* fotos do começo das faixas: no máximo 2; com mais gente, "+N" */}
                    {comFoto.length > 0 && (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        {comFoto.slice(0, 2).map((o, i) => (
                          <span key={o.faixa.userId} className={`rounded-full ${i ? "-ml-2" : ""}`} style={{ boxShadow: `0 0 0 2px ${corDe(o.faixa.userId)}` }}>
                            <AgentAvatar src={gente.get(o.faixa.userId)?.avatar ?? null} nome={nomeDe(o.faixa.userId)} size={celular ? 28 : 24} />
                          </span>
                        ))}
                        {comFoto.length > 2 && <span className="ml-1 rounded-full bg-slate-900/75 px-1.5 text-[11px] font-bold text-white">+{comFoto.length - 2}</span>}
                      </span>
                    )}
                    {/* a linha de AGORA */}
                    {ehAgora && <span aria-hidden className="pointer-events-none absolute inset-x-0 h-[2px] bg-rose-500" style={{ top: `${((minAgora % 60) / 60) * 100}%` }} />}
                  </button>
                );
              })}
            </Linha>
          ))}
        </div>
      </div>

      {pessoasNaAgenda.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 py-2.5 border-t border-white/50 dark:border-white/[0.08]">
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
        <div role="status" className="absolute inset-x-3 bottom-3 z-20 flex items-center gap-2 rounded-2xl bg-slate-900/95 px-3 py-2 text-[12.5px] text-white shadow-xl">
          <span className="min-w-0 flex-1">{aviso.texto}</span>
          {aviso.desfazer && (
            <button type="button" onClick={() => { const d = aviso.desfazer!; setAviso(null); void salvar(d, "Voltou"); }}
              className="shrink-0 min-h-[40px] rounded-xl px-3 font-bold text-cyan-300 hover:bg-white/10">Desfazer</button>
          )}
        </div>
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

/** Uma linha da grade: a hora à esquerda e os quadrados dos dias. */
function Linha({ hora, altura, children }: { hora: number; altura: string; children: React.ReactNode }) {
  return (
    <>
      <div data-hora-rotulo={hora} className={`${altura} m-[1px] pr-1.5 flex items-center justify-end text-[11px] tabular-nums ${TXT_MUDO}`}>{hora}h</div>
      {children}
    </>
  );
}
