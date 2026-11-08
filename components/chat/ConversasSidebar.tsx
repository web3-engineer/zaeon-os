"use client";

/**
 * ConversasSidebar — as conversas de UMA sala numa lista vertical à ESQUERDA, como no
 * ChatGPT/Claude. Substitui a antiga fila horizontal de abas (ThreadTabs) — muda o layout, não a rede:
 * o estado continua em lib/chat/threads e quem cria/troca/fecha é o chat da sala.
 *
 * - "+ Nova conversa" no topo; ativa destacada; renomear/excluir/sub-tema no hover; busca.
 * - Sub-conversas (sub-temas do mesmo nicho): um nível, recolhíveis sob a mãe (`parentId`).
 * - Recolhe num trilho fino (lembrado por sala, no aparelho). Tela estreita nasce recolhida.
 *
 * Esquerda = CONVERSAS (o fio do diálogo). Documentos (TCC, pesquisa, PDFs) ficam no topo —
 * trocar de conversa aqui nunca troca o documento aberto lá.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight, CornerDownRight, GitBranchPlus, PanelLeftClose, PanelLeftOpen, Pencil, Plus, Search, SquarePen, Trash2,
} from "lucide-react";
import { arvoreDeThreads, gruposDoDia, quandoCriada, type Thread } from "@/lib/chat/threads";

const chaveRecolhida = (sala: string) => `zaeon.chat.sidebar.${sala}.recolhida`;

export default function ConversasSidebar({
  sala, threads, ativa, ocupada, aoTrocar, aoCriar, aoFechar, aoRenomear, aoCriarSub, className = "", embutida = false, rotuloNova = "Nova conversa",
}: {
  /** "estudos" | "pesquisa" — cada sala lembra se a barra está recolhida. */
  sala: string;
  threads: readonly Thread[];
  /** null = nenhuma acesa (a sala está mostrando um documento, não a conversa). */
  ativa: string | null;
  /** id da conversa que está respondendo agora — ganha o ponto pulsando. */
  ocupada?: string | null;
  aoTrocar: (id: string) => void;
  aoCriar: () => void;
  aoFechar: (id: string) => void;
  aoRenomear: (id: string, titulo: string) => void;
  /** Sub-tema sob esta conversa. Sem isto, sem o botão. */
  aoCriarSub?: (paiId: string) => void;
  className?: string;
  /**
   * Dentro da SIDEBAR PRINCIPAL do app (components/chat/ConversasSlot): ocupa a largura dela, sem
   * coluna/borda própria e sem recolher — quem recolhe é a sidebar.
   */
  embutida?: boolean;
  /** "Nova conversa" (Estudos) · "Nova pesquisa" (Pesquisa) */
  rotuloNova?: string;
}) {
  const [recolhida, setRecolhida] = useState(false);
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(chaveRecolhida(sala));
      if (salvo !== null) { setRecolhida(salvo === "1"); return; }
    } catch { /* ignore */ }
    setRecolhida(typeof window !== "undefined" && window.matchMedia?.("(max-width: 767px)").matches);
  }, [sala]);
  const alternar = () => {
    setRecolhida((v) => {
      try { localStorage.setItem(chaveRecolhida(sala), v ? "0" : "1"); } catch { /* ignore */ }
      return !v;
    });
  };

  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  // Mães abertas no acordeão. A mãe da conversa ativa abre sozinha (senão a ativa some).
  const [abertas, setAbertas] = useState<Record<string, boolean>>({});
  const arvore = useMemo(() => arvoreDeThreads(threads), [threads]);
  useEffect(() => {
    const mae = threads.find((t) => t.id === ativa)?.parentId;
    if (mae) setAbertas((a) => (a[mae] ? a : { ...a, [mae]: true }));
  }, [ativa, threads]);

  const termo = busca.trim().toLowerCase();
  const nos = useMemo(() => {
    if (!termo) return arvore;
    const casa = (t: Thread) => t.titulo.toLowerCase().includes(termo);
    return arvore
      .map((n) => ({ thread: n.thread, filhas: casa(n.thread) ? n.filhas : n.filhas.filter(casa) }))
      .filter((n) => casa(n.thread) || n.filhas.length);
  }, [arvore, termo]);

  if (recolhida && !embutida) {
    return (
      <nav aria-label="Conversas" className={`shrink-0 w-11 flex flex-col items-center gap-1 py-2 border-r border-slate-200 dark:border-white/10 ${className}`}>
        <button type="button" onClick={alternar} className={BTN_ICONE} aria-label="Mostrar conversas" title="Mostrar conversas">
          <PanelLeftOpen size={16} />
        </button>
        <button type="button" onClick={aoCriar} className={BTN_ICONE} aria-label="Nova conversa" title="Nova conversa">
          <SquarePen size={16} />
        </button>
      </nav>
    );
  }

  const linha = (t: Thread, filha: boolean, temFilhas = false) => {
    const atual = t.id === ativa;
    if (editando === t.id) {
      return (
        <EditorTitulo
          key={t.id}
          inicial={t.titulo}
          recuo={filha}
          onSalvar={(v) => { setEditando(null); if (v && v !== t.titulo) aoRenomear(t.id, v); }}
          onCancelar={() => setEditando(null)}
        />
      );
    }
    if (confirmando === t.id) {
      const nFilhas = filha ? 0 : threads.filter((x) => x.parentId === t.id).length;
      return (
        <div key={t.id} data-gaveta-fica className={`flex items-center gap-1 rounded-lg px-2 py-1.5 bg-rose-500/10 ${filha ? "ml-5" : ""}`}>
          <span className="flex-1 min-w-0 text-[12px] font-semibold text-rose-700 dark:text-rose-200 truncate">
            Excluir{nFilhas ? ` (+${nFilhas} sub-tema${nFilhas > 1 ? "s" : ""})` : ""}?
          </span>
          <button type="button" autoFocus onClick={() => { setConfirmando(null); aoFechar(t.id); }} className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-600 text-white">Excluir</button>
          <button type="button" onClick={() => setConfirmando(null)} className="px-2 py-0.5 rounded-md text-[11px] font-bold text-slate-600 dark:text-white/70 hover:bg-slate-900/5 dark:hover:bg-white/10">Não</button>
        </div>
      );
    }
    return (
      <div
        key={t.id}
        className={`group/conv relative flex items-center gap-1 rounded-lg pr-1 transition-colors ${
          filha ? "ml-3 pl-1" : "pl-1"
        } ${
          atual
            ? "bg-slate-900/[0.07] dark:bg-white/[0.10] text-slate-900 dark:text-white"
            : "text-slate-700 dark:text-white/75 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.05]"
        }`}
      >
        {filha ? (
          <CornerDownRight size={12} className="shrink-0 text-slate-400 dark:text-white/35" aria-hidden />
        ) : temFilhas ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setAbertas((a) => ({ ...a, [t.id]: !a[t.id] })); }}
            data-gaveta-fica aria-label={abertas[t.id] ? "Recolher sub-temas" : "Mostrar sub-temas"}
            aria-expanded={!!abertas[t.id]}
            className="shrink-0 w-4 h-4 flex items-center justify-center rounded text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
          >
            <ChevronRight size={12} className={`transition-transform ${abertas[t.id] ? "rotate-90" : ""}`} />
          </button>
        ) : (
          <span className="shrink-0 w-4" aria-hidden />
        )}
        <button
          type="button"
          onClick={() => aoTrocar(t.id)}
          onKeyDown={(e) => { if (e.key === "F2") { e.preventDefault(); setEditando(t.id); } }}
          aria-current={atual ? "true" : undefined}
          // #733: a data saiu do lado do nome (ela roubava o espaço); fica no título do grupo e, exata, ao passar o mouse
          title={`${t.titulo} · ${quandoCriada(t.criadaEm)}`}
          className="flex-1 min-w-0 flex items-center gap-1.5 py-1.5 text-left rounded-md outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          {ocupada === t.id && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" aria-label="respondendo" />}
          <span className={`flex-1 min-w-0 truncate text-[13px] ${atual ? "font-semibold" : "font-medium"}`}>{t.titulo}</span>
        </button>
        {/* Ações no hover (e com foco de teclado); na ativa ficam sempre à mão.
            #733: escondidas, NÃO ocupam espaço (antes ficavam invisíveis, mas tomavam uns 70 px do nome) */}
        <span className={`shrink-0 items-center ${atual ? "flex" : "hidden group-hover/conv:flex group-focus-within/conv:flex"} [@media(hover:none)]:flex`}>
          {!filha && aoCriarSub && (
            <button type="button" onClick={(e) => { e.stopPropagation(); aoCriarSub(t.id); setAbertas((a) => ({ ...a, [t.id]: true })); }} className={BTN_MINI} aria-label={`Novo sub-tema em ${t.titulo}`} title="Novo sub-tema">
              <GitBranchPlus size={12} />
            </button>
          )}
          <button type="button" onClick={(e) => { e.stopPropagation(); setEditando(t.id); }} className={BTN_MINI} data-gaveta-fica aria-label={`Renomear ${t.titulo}`} title="Renomear">
            <Pencil size={12} />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); setConfirmando(t.id); }} className={`${BTN_MINI} hover:!text-rose-600 dark:hover:!text-rose-300`} data-gaveta-fica aria-label={`Excluir ${t.titulo}`} title="Excluir">
            <Trash2 size={12} />
          </button>
        </span>
      </div>
    );
  };

  return (
    <nav aria-label="Conversas" className={`${embutida ? "flex-1 w-full" : "shrink-0 w-[248px] max-w-[70vw] border-r border-slate-200 dark:border-white/10"} flex flex-col min-h-0 ${className}`}>
      {!embutida && (
        <div className="flex items-center gap-1 px-2.5 pt-2.5 pb-1">
          <span className="flex-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-white/50">Conversas</span>
          <button type="button" onClick={alternar} className={BTN_ICONE} data-gaveta-fica aria-label="Recolher conversas" title="Recolher conversas">
            <PanelLeftClose size={15} />
          </button>
        </div>
      )}
      <div className={`${embutida ? "px-0" : "px-2"} pb-1.5`}>
        <button
          type="button"
          onClick={aoCriar}
          title={rotuloNova}
          aria-label={rotuloNova}
          className={`w-full flex items-center gap-2 rounded-lg font-semibold transition-colors ${embutida
            ? "px-2 py-1.5 text-[12px] text-slate-700 dark:text-white/75 hover:bg-slate-900/[0.05] dark:hover:bg-white/[0.06]"
            : "px-2.5 py-2 text-[13px] text-slate-800 dark:text-white/90 border border-slate-200 dark:border-white/10 hover:border-cyan-400/60 hover:text-cyan-700 dark:hover:text-cyan-200"}`}
        >
          {embutida ? <><Plus size={14} /> Nova</> : <><SquarePen size={14} /> {rotuloNova}</>}
        </button>
      </div>
      {threads.length > 4 && (
        <div className="px-2 pb-1.5">
          <label className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-900/[0.04] dark:bg-white/[0.05] text-slate-500 dark:text-white/50 focus-within:ring-2 focus-within:ring-cyan-500/60">
            <Search size={13} aria-hidden />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setBusca(""); }}
              placeholder="Buscar conversas"
              aria-label="Buscar conversas"
              className="flex-1 min-w-0 bg-transparent text-[12px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 outline-none"
            />
          </label>
        </div>
      )}
      <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar ${embutida ? "px-0" : "px-2"} pb-2 flex flex-col gap-0.5`}>
        {nos.length === 0 && (
          <p className="px-2 py-3 text-[12px] text-slate-500 dark:text-white/45">{termo ? "Nada com esse nome." : "Nenhuma conversa ainda."}</p>
        )}
        {/* #733: separada por dia (Hoje, Ontem, Últimos 7 dias…), a mais nova em cima */}
        {gruposDoDia(nos).map(({ grupo, nos: doGrupo }) => (
          <section key={grupo} aria-label={grupo} className="flex flex-col gap-0.5">
            <h3 className="px-2 pt-2 pb-0.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-white/45">{grupo}</h3>
            {doGrupo.map(({ thread, filhas }) => (
              <div key={thread.id} className="flex flex-col gap-0.5">
                {linha(thread, false, filhas.length > 0)}
                {filhas.length > 0 && (abertas[thread.id] || !!termo) && filhas.map((f) => linha(f, true))}
              </div>
            ))}
          </section>
        ))}
      </div>
    </nav>
  );
}

const BTN_ICONE =
  "w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 dark:text-white/55 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500";
// #713: em tela de toque, 44 px (o tamanho do dedo); com mouse, como antes
const BTN_MINI =
  "w-6 h-6 [@media(hover:none)]:w-11 [@media(hover:none)]:h-11 rounded-md flex items-center justify-center text-slate-500 dark:text-white/55 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/[0.06] dark:hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500";

function EditorTitulo({ inicial, recuo, onSalvar, onCancelar }: {
  inicial: string;
  recuo: boolean;
  onSalvar: (v: string) => void;
  onCancelar: () => void;
}) {
  const [v, setV] = useState(inicial);
  const ref = useRef<HTMLInputElement>(null);
  const feito = useRef(false);
  useEffect(() => { ref.current?.select(); }, []);
  const salvar = () => { if (feito.current) return; feito.current = true; onSalvar(v.trim()); };
  return (
    <input
      ref={ref}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); salvar(); }
        else if (e.key === "Escape") { e.preventDefault(); feito.current = true; onCancelar(); }
      }}
      onBlur={salvar}
      aria-label="Novo nome da conversa"
      maxLength={80}
      className={`rounded-lg px-2 py-1.5 text-[13px] font-medium bg-white dark:bg-white/10 text-slate-900 dark:text-white border border-cyan-400/60 outline-none ${recuo ? "ml-5" : ""}`}
    />
  );
}
