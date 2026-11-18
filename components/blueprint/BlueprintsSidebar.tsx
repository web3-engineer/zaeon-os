"use client";
/**
 * BlueprintsSidebar — os ESTUDOS da Sala de Estudos (os blueprints) na sidebar principal, com a MESMA lógica das conversas
 * (components/chat/ConversasSidebar): gavetas por dia (Hoje, Ontem, Últimos 7 dias abertas; Últimos 30 dias e Mais
 * antigas recolhidas), busca pelo nome, renomear/excluir no aberto (só o dono) e "ver mais" para os antigos.
 * O estado é da Sala (useBlueprint) — aqui só se desenha; a Sala põe isto na sidebar por portal (BlueprintsSlot).
 */
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, MoreHorizontal, Pencil, Search, Trash2 } from "lucide-react";
import type { ResumoBlueprint } from "@/lib/blueprint/server";
import { filtrarBlueprints } from "@/lib/blueprint/busca";
import { agruparPorDia, CHAVE_DO_GRUPO, GRUPOS_RECOLHIDOS, type GrupoDoDia } from "@/lib/chat/threads";

export default function BlueprintsSidebar({
  lista, erro, marcado, temMais, podeMexer, compartilhado = 0, aoAbrir, aoRecarregar, aoVerMais, aoRenomear, aoExcluir,
}: {
  /** null = ainda carregando */
  lista: readonly ResumoBlueprint[] | null;
  erro: boolean;
  /** o estudo marcado (o clicado, mesmo antes de a prancha chegar) */
  marcado: string | null | undefined;
  temMais: boolean;
  /** o marcado é da pessoa e já está na tela: renomear/excluir aparecem nele */
  podeMexer: boolean;
  /** com quantas pessoas o aberto está compartilhado (o aviso de excluir conta) */
  compartilhado?: number;
  aoAbrir: (id: string) => void;
  aoRecarregar: () => void;
  aoVerMais: () => Promise<boolean>;
  aoRenomear: (titulo: string) => Promise<boolean>;
  aoExcluir: (id: string) => void;
}) {
  const { t: traduzir, i18n } = useTranslation();
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  // #837: no toque, as ações do estudo aberto ficam no "⋯"
  const [acoesAbertas, setAcoesAbertas] = useState(false);
  const [vendoMais, setVendoMais] = useState(false), [falhaMais, setFalhaMais] = useState(false);
  const [gruposAbertos, setGruposAbertos] = useState<Partial<Record<GrupoDoDia, boolean>>>({});
  const alternarGrupo = (g: GrupoDoDia) => setGruposAbertos((s) => ({ ...s, [g]: !(s[g] ?? !GRUPOS_RECOLHIDOS.has(g)) }));
  // trocou o marcado: some o editor/confirmação do anterior
  useEffect(() => { setEditando(null); setConfirmando(null); }, [marcado]);

  const termo = busca.trim();
  const visiveis = useMemo(() => (lista ? filtrarBlueprints([...lista], termo) : []), [lista, termo]);
  const grupos = useMemo(() => agruparPorDia(visiveis, (b) => Date.parse(b.updatedAt)), [visiveis]);
  const verMais = async () => { setVendoMais(true); setFalhaMais(false); const ok = await aoVerMais(); setVendoMais(false); setFalhaMais(!ok); };

  if (lista === null) {
    return erro ? (
      <div className="px-2 py-3 text-[12px] text-slate-500 dark:text-white/50" role="alert">
        {traduzir("labSidebar.studiesError")}{" "}
        <button type="button" data-gaveta-fica onClick={aoRecarregar} className="font-semibold underline underline-offset-2 hover:text-slate-900 dark:hover:text-white">{traduzir("labSidebar.retry")}</button>
      </div>
    ) : (
      <p className="px-2 py-3 text-[12px] text-slate-500 dark:text-white/45" role="status">{traduzir("labSidebar.loading")}</p>
    );
  }

  let primeiro = true;   // o 1º item leva os alvos das dicas rápidas (lib/onboarding/dicas)
  const linha = (b: ResumoBlueprint) => {
    const atual = b.id === marcado, mexe = atual && podeMexer;
    const tour = primeiro; primeiro = false;
    if (mexe && editando === b.id) {
      return <EditorTitulo key={b.id} inicial={b.titulo} onSalvar={(v) => { setEditando(null); if (v && v !== b.titulo) void aoRenomear(v); }} onCancelar={() => setEditando(null)} />;
    }
    if (mexe && confirmando === b.id) {
      return (
        <div key={b.id} data-gaveta-fica className="flex items-center gap-1 rounded-lg px-2 py-1.5 bg-rose-500/10">
          <span className="flex-1 min-w-0 text-[12px] font-semibold leading-snug text-rose-700 dark:text-rose-200">
            {traduzir(compartilhado > 0 ? "labSidebar.confirmStudyShared" : "labSidebar.confirmStudy", { count: compartilhado })}
          </span>
          <button type="button" autoFocus onClick={() => { setConfirmando(null); aoExcluir(b.id); }} className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-600 text-white">{traduzir("labSidebar.delete")}</button>
          <button type="button" onClick={() => setConfirmando(null)} className="px-2 py-0.5 rounded-md text-[11px] font-bold text-slate-600 dark:text-white/70 hover:bg-slate-900/5 dark:hover:bg-white/10">{traduzir("labSidebar.cancel")}</button>
        </div>
      );
    }
    const estado = b.aguardandoMentor ? traduzir("labSidebar.awaitingMentor")
      : `${traduzir("labSidebar.phase", { n: b.fase })}${b.criticosAbertos ? ` · ${traduzir("labSidebar.critical", { count: b.criticosAbertos })}` : ""}`;
    return (
      <div key={b.id} className={`group/estudo relative flex flex-wrap items-center gap-1 rounded-lg pl-1 pr-1 transition-colors ${
        atual ? "bg-slate-900/[0.07] dark:bg-white/[0.10] text-slate-900 dark:text-white" : "text-slate-700 dark:text-white/75 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.05]"}`}>
        <button
          type="button"
          data-tour={tour ? "blueprint-lista" : undefined}
          onClick={() => aoAbrir(b.id)}
          onKeyDown={(e) => { if (e.key === "F2" && mexe) { e.preventDefault(); setEditando(b.id); } }}
          aria-current={atual ? "true" : undefined}
          title={`${b.titulo} · ${estado} · ${new Date(b.updatedAt).toLocaleString(i18n.resolvedLanguage, { dateStyle: "short", timeStyle: "short" })}`}
          className="flex-1 min-w-0 flex flex-col py-1.5 pl-1 text-left rounded-md outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <span className="flex items-center gap-1.5 min-w-0">
            {b.criticosAbertos > 0 && !b.aguardandoMentor && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" aria-hidden />}
            {/* #837: no toque, o nome inteiro em até 2 linhas (como nas conversas) */}
            <span className={`flex-1 min-w-0 truncate [@media(hover:none)]:whitespace-normal [@media(hover:none)]:line-clamp-2 [@media(hover:none)]:break-words text-[13px] ${atual ? "font-semibold" : "font-medium"}`}>{b.titulo}</span>
          </span>
          <Fases b={b} tour={tour} rotulo={estado} />
        </button>
        {mexe && (
          <button type="button" onClick={(e) => { e.stopPropagation(); setAcoesAbertas((v) => !v); }}
            data-gaveta-fica aria-expanded={acoesAbertas} aria-label={`${traduzir("labSidebar.actions")} · ${b.titulo}`}
            className="hidden [@media(hover:none)]:flex shrink-0 w-9 h-9 items-center justify-center rounded-md text-slate-500 dark:text-white/55">
            <MoreHorizontal size={16} />
          </button>
        )}
        {mexe && (
          <span className={`shrink-0 flex items-center ${acoesAbertas ? "[@media(hover:none)]:basis-full [@media(hover:none)]:justify-end [@media(hover:none)]:gap-2 [@media(hover:none)]:pb-1" : "[@media(hover:none)]:hidden"}`}>
            <button type="button" onClick={(e) => { e.stopPropagation(); setEditando(b.id); }} className={BTN_MINI} data-gaveta-fica aria-label={`${traduzir("labSidebar.rename")} · ${b.titulo}`} title={traduzir("labSidebar.rename")}>
              <Pencil size={12} />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); setConfirmando(b.id); }} className={`${BTN_MINI} hover:!text-rose-600 dark:hover:!text-rose-300`} data-gaveta-fica aria-label={`${traduzir("labSidebar.delete")} · ${b.titulo}`} title={traduzir("labSidebar.delete")}>
              <Trash2 size={12} />
            </button>
          </span>
        )}
      </div>
    );
  };

  return (
    <nav aria-label={traduzir("labSidebar.studiesList")} className="flex-1 w-full flex flex-col min-h-0">
      {lista.length > 4 && (
        <div className="pb-1.5">
          <label className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-900/[0.04] dark:bg-white/[0.05] text-slate-500 dark:text-white/50 focus-within:ring-2 focus-within:ring-cyan-500/60">
            <Search size={13} aria-hidden />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setBusca(""); }}
              placeholder={traduzir("labSidebar.searchStudies")}
              aria-label={traduzir("labSidebar.searchStudies")}
              maxLength={80}
              className="flex-1 min-w-0 bg-transparent text-[16px] [@media(hover:hover)_and_(pointer:fine)]:text-[12px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 outline-none"
            />
          </label>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-2 flex flex-col gap-0.5">
        {grupos.length === 0 && (
          <p className="px-2 py-3 text-[12px] text-slate-500 dark:text-white/45">{traduzir(termo ? "labSidebar.noResults" : "labSidebar.noStudies")}</p>
        )}
        {grupos.map(({ grupo, nos }) => {
          const nomeGrupo = traduzir(CHAVE_DO_GRUPO[grupo]);
          const temAtual = !!marcado && nos.some((b) => b.id === marcado);
          const aberto = !!termo || temAtual || (gruposAbertos[grupo] ?? !GRUPOS_RECOLHIDOS.has(grupo));
          return (
            <section key={grupo} aria-label={nomeGrupo} className="flex flex-col gap-0.5">
              <h3 className="m-0">
                <button
                  type="button"
                  data-gaveta-fica
                  onClick={() => alternarGrupo(grupo)}
                  aria-expanded={aberto}
                  className="w-full flex items-center gap-1 px-2 pt-2 pb-0.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-white/45 hover:text-slate-700 dark:hover:text-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500 rounded"
                >
                  <ChevronRight size={11} aria-hidden className={`transition-transform ${aberto ? "rotate-90" : ""}`} />
                  {nomeGrupo}
                </button>
              </h3>
              {aberto && nos.map(linha)}
            </section>
          );
        })}
        {temMais && (
          <button type="button" data-gaveta-fica onClick={() => void verMais()} disabled={vendoMais}
            className="mt-1 px-2 py-1.5 rounded-lg text-left text-[12px] font-semibold text-slate-600 dark:text-white/60 hover:bg-slate-900/[0.05] dark:hover:bg-white/[0.06] disabled:opacity-50">
            {traduzir(vendoMais ? "labSidebar.loading" : falhaMais ? "labSidebar.moreFailed" : "labSidebar.more")}
          </button>
        )}
      </div>
    </nav>
  );
}

/** as 4 fases numa barrinha fina (verde = aprovada, vermelha = a atual, dourada = com o mentor) */
function Fases({ b, tour, rotulo }: { b: ResumoBlueprint; tour: boolean; rotulo: string }) {
  return (
    <span data-tour={tour ? "blueprint-fases" : undefined} role="img" aria-label={rotulo} className="mt-1 flex gap-[3px] pr-1">
      {[1, 2, 3, 4].map((f) => {
        const ok = f < b.fase || (f === 4 && b.aguardandoMentor), at = f === b.fase && !b.aguardandoMentor;
        return <i key={f} className={`h-[3px] flex-1 rounded-sm ${ok ? (f === 4 ? "bg-amber-400" : "bg-emerald-500") : at ? "bg-rose-500" : "bg-slate-900/10 dark:bg-white/15"}`} />;
      })}
    </span>
  );
}

// #713: em tela de toque, 44 px (o tamanho do dedo); com mouse, compacto — igual às conversas
const BTN_MINI =
  "w-6 h-6 [@media(hover:none)]:w-11 [@media(hover:none)]:h-11 rounded-md flex items-center justify-center text-slate-500 dark:text-white/55 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/[0.06] dark:hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500";

function EditorTitulo({ inicial, onSalvar, onCancelar }: { inicial: string; onSalvar: (v: string) => void; onCancelar: () => void }) {
  const [v, setV] = useState(inicial);
  const ref = useRef<HTMLInputElement>(null);
  const { t: traduzir } = useTranslation();
  const feito = useRef(false);
  useEffect(() => { ref.current?.select(); }, []);
  const salvar = () => { if (feito.current) return; feito.current = true; onSalvar(v.trim()); };
  return (
    <input
      ref={ref}
      data-gaveta-fica
      value={v}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); salvar(); }
        else if (e.key === "Escape") { e.preventDefault(); feito.current = true; onCancelar(); }
      }}
      onBlur={salvar}
      aria-label={traduzir("labSidebar.newStudyName")}
      maxLength={200}
      className="rounded-lg px-2 py-1.5 text-[13px] font-medium bg-white dark:bg-white/10 text-slate-900 dark:text-white border border-cyan-400/60 outline-none"
    />
  );
}
