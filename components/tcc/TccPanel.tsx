"use client";

/**
 * O EDITOR do trabalho (TCC, artigo, relatório) — com cara de processador de texto (Word): barra de título,
 * faixa de abas (Página inicial · Sugestões · Histórico), barra de formatação (estilo do parágrafo, negrito,
 * itálico, listas, alinhamento, inserir citação/tabela/quadro, nova seção), régua com as margens, a FOLHA A4
 * com sombra no meio da mesa cinza e a barra de status embaixo. A folha segue o ABNT (NBR 14724): margens
 * 3/2 cm, Times 12, entrelinha 1,5, recuo 1,25 cm, justificado, seções numeradas — o mesmo desenho da prévia
 * (components/research/AbntPreview) e do motor de exportação (abnt-service).
 *
 * Abre POR CIMA da conversa (no chat único, ocupa a sala como uma pasta do topo). O aluno vê o trabalho
 * crescendo ao vivo (poll), clica numa seção pra editar ali mesmo na folha, aceita/rejeita sugestões e volta
 * qualquer seção no histórico. O texto continua sendo o markdown que o motor entende — a barra só escreve nele.
 *
 * Poll: 2,5 s enquanto a geração em background está rodando; 6 s depois. Para quando a aba do navegador está escondida.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  X, Loader2, History, Download, FlaskConical, RotateCcw, Bold, Italic, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Quote, Table2, LayoutGrid, Plus, FileText, Check,
  UserPlus, Copy, Link2Off,
} from "lucide-react";
import TccSugestoes from "@/components/tcc/TccSugestoes";
import { Bloco, Inline, cqw, PT } from "@/components/research/AbntPreview";
import { parseAbntMarkers } from "@/lib/abntTemplate";
import { BLOCOS, insertBlock } from "@/lib/abntBlocks";
import {
  ESTILOS, alternarEnfase, alternarLista, aplicarEstilo, estiloNoCursor, montarPagina, palavrasDaPagina,
  type Edicao, type EstiloParagrafo, type SecaoPagina,
} from "@/lib/tcc/pagina";
import { EVT_TCC_MUDOU, ROTULO_OP, ROTULO_ORIGEM, avisarTccMudou, tccApi, type Convite, type PapelConvite, type Revisao, type TccDoc } from "@/lib/tcc/client";
import { chatUnicoOn } from "@/lib/chat/chatUnico";
import { conteudoSemLatex } from "@/lib/tcc/latexTexto";
import { useIsMobile } from "@/lib/ui/useIsMobile";
import ExportarTrabalho, { type OpcoesExport } from "@/components/tcc/ExportarTrabalho";

type Aba = "doc" | "sugestoes" | "historico";
const CHAT_UNICO = chatUnicoOn();

export default function TccPanel({ workId, onFechar, onTitulo }: {
  workId: string; onFechar: () => void;
  /** chat único: o título/tipo/status lido do banco (a pasta do trabalho no topo do chat se atualiza) */
  onTitulo?: (t: { titulo: string; tipo: string; status: string }) => void;
}) {
  const { data: session } = useSession();
  const [tcc, setTcc] = useState<TccDoc | null>(null);
  const [sugestoes, setSugestoes] = useState<Revisao[]>([]);
  const [historico, setHistorico] = useState<Revisao[] | null>(null);
  const [aba, setAba] = useState<Aba>("doc");
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<{ id: string; corpo: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [mudou, setMudou] = useState<Set<string>>(new Set()); // seções que mudaram no último poll (realce)
  const [estilo, setEstilo] = useState<EstiloParagrafo>("normal");
  const [convite, setConvite] = useState<Convite | null>(null);   // link gerado (null = painel fechado)
  const [convidando, setConvidando] = useState(false);
  const corposRef = useRef<Map<string, string>>(new Map());
  const onTituloRef = useRef(onTitulo);
  onTituloRef.current = onTitulo;
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const celular = useIsMobile();

  const podeEscrever = tcc?.papel === "dono" || tcc?.papel === "editor";
  const tipo = tcc?.workType || "TCC";

  const carregar = useCallback(async () => {
    try {
      const d = await tccApi.ler(workId);
      // "crescendo ao vivo": realça o que mudou desde a última leitura (não na 1ª carga)
      const antes = corposRef.current;
      const novas = new Set<string>();
      if (antes.size) for (const s of d.tcc.secoes) if (antes.get(s.id) !== s.corpo) novas.add(s.id);
      corposRef.current = new Map(d.tcc.secoes.map((s) => [s.id, s.corpo]));
      if (novas.size) setMudou(novas);
      setTcc(d.tcc); setSugestoes(d.sugestoes); setErro(null);
      onTituloRef.current?.({ titulo: d.tcc.titulo, tipo: d.tcc.workType || "TCC", status: d.tcc.status });
    } catch (e: any) {
      setErro(e?.status === 404 ? "Este trabalho não existe ou você não tem acesso." : "Não consegui carregar o trabalho.");
    }
  }, [workId]);

  const carregarHistorico = useCallback(async () => {
    try { setHistorico((await tccApi.historico(workId)).revisoes); } catch { setHistorico([]); }
  }, [workId]);

  useEffect(() => { corposRef.current = new Map(); void carregar(); }, [carregar]);

  // Poll (rápido enquanto gera, lento depois) + recarrega quando outra tela avisa que mudou.
  const gerando = tcc?.status === "gerando";
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) void carregar(); }, gerando ? 2500 : 6000);
    const onMudou = (e: any) => { if (e?.detail?.workId === workId) void carregar(); };
    window.addEventListener(EVT_TCC_MUDOU, onMudou);
    return () => { clearInterval(t); window.removeEventListener(EVT_TCC_MUDOU, onMudou); };
  }, [carregar, gerando, workId]);

  /**
   * TEMPO REAL (colaboração): o servidor empurra `doc-update` no canal `tcc-<workId>` a cada
   * escrita, e aqui a gente só RELÊ — o evento não traz texto (ver `avisarMudanca` em
   * lib/tcc/store.ts). O poll acima CONTINUA: sem env de Pusher, ou se o socket cair, a tela segue
   * atualizando em 6 s em vez de congelar. Import dinâmico pra o `pusher-js` não entrar no bundle
   * de quem nunca abre um trabalho.
   */
  useEffect(() => {
    const chave = process.env.NEXT_PUBLIC_PUSHER_KEY, cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!chave || !cluster) return;
    let desligar: (() => void) | null = null;
    let vivo = true;
    void (async () => {
      try {
        const { default: PusherClient } = await import("pusher-js");
        if (!vivo) return;
        const pusher = new PusherClient(chave, { cluster });
        const canal = `tcc-${workId}`;
        pusher.subscribe(canal).bind("doc-update", () => { void carregar(); });
        desligar = () => { pusher.unsubscribe(canal); pusher.disconnect(); };
      } catch { /* sem tempo real; o poll cobre */ }
    })();
    return () => { vivo = false; desligar?.(); };
  }, [workId, carregar]);

  useEffect(() => { if (aba === "historico") void carregarHistorico(); }, [aba, carregarHistorico]);
  useEffect(() => { if (!mudou.size) return; const t = setTimeout(() => setMudou(new Set()), 2500); return () => clearTimeout(t); }, [mudou]);

  /**
   * Gera o link de convite. `papel` padrão EDITOR: o pedido era colaborar de verdade ("o
   * colaborador pode interagir e alterar o documento"), e quem só quer mostrar escolhe leitor.
   */
  const convidar = async (papel: PapelConvite = "editor") => {
    setConvidando(true); setErro(null);
    try {
      setConvite(await tccApi.compartilhar(workId, papel));
    } catch (e: any) {
      setErro(e?.status === 403 ? "Só quem é dono do trabalho pode convidar." : e?.body?.error || "Não consegui gerar o convite.");
      setConvite(null);
    } finally { setConvidando(false); }
  };

  const revogarConvites = async () => {
    setConvidando(true);
    try { await tccApi.revogarConvites(workId); setConvite(null); setErro("Links revogados. Quem já entrou continua na conversa."); }
    catch { setErro("Não consegui revogar os links."); }
    finally { setConvidando(false); }
  };

  const falhaAoSalvar = (e: any) => setErro(e?.status === 409 ? "Outra tela salvou ao mesmo tempo — tente de novo." : e?.status === 403 ? "Você só pode ler este trabalho." : "Não deu pra salvar.");
  /** Salva a seção em edição (texto e, se veio, o título). true = salvou (ou nada a salvar). */
  const salvarSecao = async (): Promise<boolean> => {
    if (!editando) return true;
    const atual = tcc?.secoes.find((x) => x.id === editando.id);
    if (atual && atual.corpo === editando.corpo) { setEditando(null); return true; } // nada mudou: só fecha
    setSalvando(true);
    try {
      const r = await tccApi.editar(workId, { secaoId: editando.id, op: "substituir", corpo: editando.corpo, origem: "aluno" });
      corposRef.current = new Map(r.tcc.secoes.map((s) => [s.id, s.corpo]));
      setTcc(r.tcc); setEditando(null); avisarTccMudou(workId);
      return true;
    } catch (e: any) { falhaAoSalvar(e); return false; } finally { setSalvando(false); }
  };
  /** Clicar noutra seção com uma aberta: salva a aberta e abre a nova (como no Word, sem botão no meio). */
  const abrirSecao = async (id: string, corpo: string) => {
    if (editando?.id === id) return;
    if (editando && !(await salvarSecao())) return;
    setEditando({ id, corpo }); setEstilo("normal");
  };
  /** Renomear uma seção (o título na folha): mesma seção, mesmo id — vai como substituir com o corpo de agora. */
  const renomearSecao = async (id: string, titulo: string) => {
    const s0 = tcc?.secoes.find((x) => x.id === id);
    const t = titulo.replace(/\s+/g, " ").trim();
    if (!s0 || !t || t === s0.titulo) return;
    const corpo = editando?.id === id ? editando.corpo : s0.corpo;
    try {
      const r = await tccApi.editar(workId, { secaoId: id, op: "substituir", titulo: t, corpo, origem: "aluno" });
      corposRef.current = new Map(r.tcc.secoes.map((s) => [s.id, s.corpo]));
      setTcc(r.tcc); avisarTccMudou(workId);
    } catch (e: any) { falhaAoSalvar(e); }
  };
  /** Renomear o trabalho (o título da folha). */
  const renomearTrabalho = async (titulo: string) => {
    const t = titulo.replace(/\s+/g, " ").trim();
    if (!tcc || !t || t === tcc.titulo) return;
    try {
      const r = await tccApi.renomear(workId, t);
      setTcc(r.tcc); avisarTccMudou(workId);
      onTituloRef.current?.({ titulo: r.tcc.titulo, tipo: r.tcc.workType || "TCC", status: r.tcc.status });
    } catch (e: any) { falhaAoSalvar(e); }
  };

  const novaSecao = async () => {
    if (!tcc || !podeEscrever) return;
    const titulo = window.prompt("Título da nova seção (ex.: REFERENCIAL TEÓRICO)")?.trim();
    if (!titulo) return;
    // antes das REFERÊNCIAS (pós-textual fica no fim), senão depois da última
    const refs = tcc.secoes.findIndex((s) => /^refer/i.test(s.titulo.normalize("NFD").replace(/[̀-ͯ]/g, "")));
    const apos = refs > 0 ? tcc.secoes[refs - 1].id : refs === 0 ? undefined : tcc.secoes.at(-1)?.id;
    try {
      const r = await tccApi.editar(workId, { op: "inserir", titulo: titulo.toUpperCase(), corpo: "", ...(apos ? { aposId: apos } : {}), origem: "aluno" });
      setTcc(r.tcc); avisarTccMudou(workId);
      const nova = r.tcc.secoes.find((s) => !tcc.secoes.some((x) => x.id === s.id));
      if (nova) setEditando({ id: nova.id, corpo: "" });
    } catch { setErro("Não deu pra criar a seção."); }
  };

  const desfazer = async (rev: Revisao) => {
    try {
      const r = await tccApi.desfazer(workId, rev.id);
      setTcc(r.tcc); avisarTccMudou(workId); void carregarHistorico();
    } catch { setErro("Não deu pra restaurar essa versão."); }
  };

  const [exportAberto, setExportAberto] = useState(false);
  const [erroExport, setErroExport] = useState<string | null>(null);
  /** Exporta na NORMA escolhida no modal (ABNT, Vancouver, APA) — mesmo pipe de sempre (/api/documents/abnt-export). */
  const exportar = async (o: OpcoesExport) => {
    if (!tcc) return;
    setExportando(true); setErroExport(null);
    try {
      // fórmulas/reações em texto legível (o motor escreve texto; LaTeX cru sairia no Word): lib/tcc/latexTexto
      const conteudo = conteudoSemLatex(tcc.content);
      const r = await fetch("/api/documents/abnt-export", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: tcc.titulo, content: conteudo, workType: tipo, citations: [], style: o.estilo, format: o.formato,
          author: o.author || session?.user?.name || "Autor", institution: o.institution, course: o.course || (session?.user as any)?.course || "",
          advisor: o.advisor || undefined, city: o.city, year: o.year || String(new Date().getFullYear()),
          parsedSections: parseAbntMarkers(conteudo) ?? undefined, researchWorkId: tcc.id,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErroExport(r.status === 503 ? "O serviço de formatação está fora do ar agora — tente em instantes." : d?.error || "Não consegui exportar.");
        return;
      }
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url; a.download = `${tcc.titulo.replace(/\s+/g, "_").replace(/[^\w-]/g, "") || tipo}_${o.estilo.toUpperCase()}.${o.formato}`; a.click();
      URL.revokeObjectURL(url);
      setExportAberto(false);
    } catch { setErroExport("Não consegui exportar."); } finally { setExportando(false); }
  };

  // ── a barra: cada botão reescreve o texto da seção em edição e devolve a seleção ──
  const aplicar = (f: (e: Edicao) => Edicao) => {
    const el = areaRef.current;
    if (!editando || !el) return;
    const r = f({ value: editando.corpo, start: el.selectionStart, end: el.selectionEnd });
    setEditando({ ...editando, corpo: r.value });
    setEstilo(estiloNoCursor(r.value, r.start));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(r.start, r.end); });
  };
  const inserir = (b: keyof typeof BLOCOS) => aplicar((e) => {
    const r = insertBlock(e.value, e.end, BLOCOS[b].block, BLOCOS[b].select);
    return { value: r.value, start: r.start, end: r.end };
  });
  const lerEstilo = () => { const el = areaRef.current; if (el && editando) setEstilo(estiloNoCursor(editando.corpo, el.selectionStart)); };

  const pagina = useMemo(() => (tcc ? montarPagina(tcc.secoes) : []), [tcc]);
  const pendentesPorSecao = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sugestoes) m.set(s.secaoId, (m.get(s.secaoId) ?? 0) + 1);
    return m;
  }, [sugestoes]);
  const historicoPorSecao = useMemo(() => {
    const m = new Map<string, Revisao[]>();
    for (const r of historico ?? []) m.set(r.secaoId, [...(m.get(r.secaoId) ?? []), r]);
    return [...m.entries()];
  }, [historico]);

  const semEdicao = !editando;
  const dicaSemEdicao = "Clique numa seção da folha para escrever nela";

  return (
    <aside
      aria-label={`${tipo} desta conversa`}
      className="relative h-full w-full flex flex-col bg-[#e9ebee] dark:bg-[#15171c] text-slate-900 dark:text-white border-l border-slate-300 dark:border-white/10"
    >
      {/* ── FAIXA DE ABAS (uma linha só, sem a barra azul): o TIPO do trabalho, as abas, Exportar e fechar ── */}
      <nav className="shrink-0 flex items-center gap-1 px-2 h-10 overflow-x-auto no-scrollbar bg-[#f3f3f3] dark:bg-[#1b1d22] border-b border-slate-300 dark:border-white/10">
        <span className="shrink-0 mr-1.5 inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-bold bg-[#2b579a]/10 text-[#2b579a] dark:bg-white/10 dark:text-white/85" title={gerando ? "A Aura está escrevendo este trabalho" : tipo}>
          {gerando ? <Loader2 size={11} className="animate-spin" aria-label="escrevendo" /> : <FileText size={11} aria-hidden />}{tipo}
        </span>
        <div role="tablist" className="flex shrink-0 items-center gap-0.5">
          {([["doc", "Página inicial"], ["sugestoes", "Sugestões"], ["historico", "Histórico"]] as [Aba, string][]).map(([id, rotulo]) => (
            <button key={id} type="button" role="tab" aria-selected={aba === id} onClick={() => setAba(id)}
              className={`h-8 px-2 sm:px-3 shrink-0 whitespace-nowrap text-[12px] border-b-2 transition-colors ${aba === id ? "border-[#2b579a] text-[#2b579a] dark:border-white dark:text-white font-semibold" : "border-transparent text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"}`}>
              {rotulo}{id === "sugestoes" && sugestoes.length ? <span className="ml-1.5 px-1.5 rounded-full text-[10px] bg-amber-400 text-black">{sugestoes.length}</span> : null}
            </button>
          ))}
        </div>
        <span className="flex-1" />
        {tcc?.papel === "dono" && (
          <button type="button" onClick={() => (convite ? setConvite(null) : void convidar())} disabled={convidando}
            title="Convidar alguém para co-criar" aria-label="Convidar colaborador"
            className="shrink-0 h-8 px-3 rounded-md inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-700 dark:text-white/80 border border-slate-300 dark:border-white/15 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40">
            {convidando ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}<span className="hidden sm:inline">Convidar</span>
          </button>
        )}
        <button type="button" onClick={() => setExportAberto(true)} disabled={!tcc || exportando} title="Exportar (ABNT, Vancouver ou APA · Word ou PDF)" aria-label="Exportar trabalho"
          className="shrink-0 h-8 px-3 rounded-md inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-[#2b579a] hover:bg-[#244a85] disabled:opacity-40">
          {exportando ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}<span className="hidden sm:inline">Exportar</span>
        </button>
        {!CHAT_UNICO && (
          <Link href={`/research-lab?work=${workId}`} title="Lapidar com rigor na Sala de Pesquisa" aria-label="Abrir na Sala de Pesquisa"
            className="shrink-0 h-8 w-8 rounded-md inline-flex items-center justify-center text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10">
            <FlaskConical size={16} />
          </Link>
        )}
        <button type="button" onClick={onFechar} aria-label="Fechar o trabalho e voltar à conversa" title="Fechar"
          className="shrink-0 h-8 w-8 rounded-md inline-flex items-center justify-center text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10">
          <X size={18} />
        </button>
      </nav>
      {tcc?.status === "erro" && <p className="shrink-0 px-4 py-1.5 text-[12px] text-amber-800 bg-amber-50 dark:text-amber-200 dark:bg-amber-500/10">A geração parou no meio — peça no chat pra continuar.</p>}

      {/* ── BARRA DE FORMATAÇÃO (Página inicial) ── */}
      {aba === "doc" && (
        <div role="toolbar" aria-label="Formatação" className="shrink-0 flex items-center gap-1 px-3 py-1.5 overflow-x-auto no-scrollbar bg-[#f8f9fa] dark:bg-[#23262d] border-b border-slate-300 dark:border-white/10">
          <label className="sr-only" htmlFor={`estilo-${workId}`}>Estilo do parágrafo</label>
          <select
            id={`estilo-${workId}`} value={estilo} disabled={semEdicao} title={semEdicao ? dicaSemEdicao : ESTILOS.find((e) => e.id === estilo)?.dica}
            onChange={(e) => { const v = e.target.value as EstiloParagrafo; setEstilo(v); aplicar((x) => aplicarEstilo(x, v)); }}
            className="h-8 w-[150px] shrink-0 rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#1b1d22] px-2 text-[12px] disabled:opacity-50"
          >
            {ESTILOS.map((e) => <option key={e.id} value={e.id}>{e.rotulo}</option>)}
          </select>
          <span className="shrink-0 h-8 px-2 grid place-items-center rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#1b1d22] text-[12px] text-slate-600 dark:text-white/70" title="Fonte do corpo (ABNT): Times New Roman 12">Times New Roman · 12</span>
          <Sep />
          <Btn rotulo="Negrito" atalho="⌘B" disabled={semEdicao} onClick={() => aplicar((e) => alternarEnfase(e, "**"))}><Bold size={15} /></Btn>
          <Btn rotulo="Itálico (termos estrangeiros, títulos de obras)" atalho="⌘I" disabled={semEdicao} onClick={() => aplicar((e) => alternarEnfase(e, "*"))}><Italic size={15} /></Btn>
          <Sep />
          <Btn rotulo="Lista com marcadores (vira alíneas a), b), c) no ABNT)" disabled={semEdicao} onClick={() => aplicar((e) => alternarLista(e, "marcadores"))}><List size={15} /></Btn>
          <Btn rotulo="Lista numerada" disabled={semEdicao} onClick={() => aplicar((e) => alternarLista(e, "numerada"))}><ListOrdered size={15} /></Btn>
          <Sep />
          {/* ABNT: o corpo do texto é SEMPRE justificado — os outros alinhamentos ficam à mostra, mas travados */}
          <Btn rotulo="Alinhar à esquerda — no ABNT o corpo é justificado" disabled onClick={() => {}}><AlignLeft size={15} /></Btn>
          <Btn rotulo="Centralizar — títulos pré/pós-textuais já saem centralizados" disabled onClick={() => {}}><AlignCenter size={15} /></Btn>
          <Btn rotulo="Alinhar à direita — no ABNT o corpo é justificado" disabled onClick={() => {}}><AlignRight size={15} /></Btn>
          <Btn rotulo="Justificado (padrão ABNT NBR 14724)" ativo onClick={() => {}}><AlignJustify size={15} /></Btn>
          <Sep />
          <Btn rotulo="Citação longa (recuo 4 cm, fonte 10)" disabled={semEdicao} onClick={() => inserir("citacaoLonga")}><Quote size={15} /></Btn>
          <Btn rotulo="Tabela (padrão IBGE)" disabled={semEdicao} onClick={() => inserir("tabela")}><Table2 size={15} /></Btn>
          <Btn rotulo="Quadro" disabled={semEdicao} onClick={() => inserir("quadro")}><LayoutGrid size={15} /></Btn>
          <Sep />
          <button type="button" onClick={novaSecao} disabled={!podeEscrever} title="Nova seção (entra antes das referências)"
            className="shrink-0 h-8 px-2.5 rounded inline-flex items-center gap-1 text-[12px] font-semibold text-slate-700 dark:text-white/80 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40">
            <Plus size={14} /> Seção
          </button>
        </div>
      )}

      {erro && <p role="alert" className="shrink-0 px-4 py-2 text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10">{erro}</p>}

      {/* ── A MESA: régua + folha A4 (Página inicial) ou os painéis de revisão ── */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {!tcc && !erro && <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>}

        {tcc && aba === "doc" && (
          <div className="mx-auto w-full max-w-[816px] px-1.5 sm:px-6 py-2 sm:py-4 [container-type:inline-size]">
            {!celular && <Regua />}
            <article
              aria-label="Folha do trabalho"
              className="bg-white text-black shadow-[0_1px_3px_rgba(0,0,0,0.18),0_8px_28px_-10px_rgba(0,0,0,0.35)]"
              style={{
                // CELULAR = "modo celular" do Word: a A4 encolhida à largura do telefone deixava a letra com ~6px. Lá a
                // unidade da folha vira px (letra ~15px), a margem vira 16px e o texto reflui; o .docx sai igual.
                ...(celular ? { ["--abnt-u" as string]: "7.5px" } : { minHeight: "141.4cqw" }), // A4: 29,7 / 21
                padding: celular ? "20px 16px 28px" : `${cqw(3)} ${cqw(2)} ${cqw(2)} ${cqw(3)}`,
                fontFamily: '"Times New Roman", Times, serif',
                fontSize: cqw(12 * PT),
                lineHeight: 1.5,
              }}
            >
              <TituloEditavel
                valor={tcc.titulo} podeEditar={!!podeEscrever} rotulo="Título do trabalho"
                estilo={{ textAlign: "center", fontWeight: 700, textTransform: "uppercase", margin: `0 0 ${cqw(1)}` }}
                onSalvar={renomearTrabalho}
              />
              {tcc.papel === "leitor" && <p className="font-sans text-[11px] text-slate-500 mb-2">Você está lendo este trabalho (sem edição).</p>}
              {pagina.map((s) => (
                <SecaoNaFolha
                  key={s.id}
                  s={s}
                  realce={mudou.has(s.id)}
                  gerando={gerando}
                  pendentes={pendentesPorSecao.get(s.id) ?? 0}
                  onVerSugestoes={() => setAba("sugestoes")}
                  podeEscrever={!!podeEscrever}
                  editando={editando?.id === s.id ? editando.corpo : null}
                  onEditar={() => void abrirSecao(s.id, s.corpo)}
                  onRenomear={(t) => void renomearSecao(s.id, t)}
                  onMudar={(corpo) => setEditando({ id: s.id, corpo })}
                  onSalvar={salvarSecao}
                  onCancelar={() => setEditando(null)}
                  salvando={salvando}
                  areaRef={areaRef}
                  onCursor={lerEstilo}
                  onAtalho={(m) => aplicar((e) => alternarEnfase(e, m))}
                />
              ))}
            </article>
          </div>
        )}

        {tcc && aba === "sugestoes" && (
          <div className="mx-auto max-w-[760px] px-4 py-4">
            <TccSugestoes workId={workId} sugestoes={sugestoes} podeDecidir={!!podeEscrever} onDecidida={() => void carregar()} />
          </div>
        )}

        {tcc && aba === "historico" && (
          <div className="mx-auto max-w-[760px] px-4 py-4">
            {historico === null ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400" /></div>
              : !historicoPorSecao.length ? <p className="py-6 text-center text-sm text-slate-500 dark:text-white/50">Nada no histórico ainda.</p>
              : (
                <div className="flex flex-col gap-5">
                  {historicoPorSecao.map(([secaoId, revs]) => (
                    <section key={secaoId}>
                      <h3 className="text-[13px] font-semibold tracking-wide text-slate-700 dark:text-white/80 inline-flex items-center gap-1.5">
                        <History size={14} aria-hidden /> {revs[0].titulo ?? secaoId}
                      </h3>
                      <ol className="mt-2 flex flex-col gap-2 border-l border-slate-300 dark:border-white/10 pl-3">
                        {revs.map((r) => (
                          <li key={r.id} className="text-[13px]">
                            <div className="flex flex-wrap items-center gap-x-2 text-slate-600 dark:text-white/60">
                              <strong className="text-slate-800 dark:text-white/85">{ROTULO_ORIGEM[r.origem] ?? r.origem}</strong>
                              <span>{ROTULO_OP[r.op] ?? r.op}</span>
                              {r.status !== "aplicada" && <span className="px-1.5 rounded-full bg-slate-500/10">{r.status}</span>}
                              <time dateTime={r.createdAt}>{new Date(r.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</time>
                            </div>
                            <p className="mt-0.5 text-slate-500 dark:text-white/45 line-clamp-2 whitespace-pre-wrap">{r.depois || "(seção removida)"}</p>
                            {podeEscrever && r.status === "aplicada" && (
                              <button type="button" onClick={() => desfazer(r)}
                                className="mt-1 min-h-[36px] px-2.5 rounded-full text-[12px] inline-flex items-center gap-1 border border-slate-300 dark:border-white/15 text-slate-600 dark:text-white/70 hover:text-cyan-700 dark:hover:text-cyan-300">
                                <RotateCcw size={12} /> Voltar para antes desta mudança
                              </button>
                            )}
                          </li>
                        ))}
                      </ol>
                    </section>
                  ))}
                </div>
              )}
          </div>
        )}
      </div>

      {/* ── BARRA DE STATUS ── */}
      <footer className="shrink-0 flex items-center gap-3 px-3 h-7 text-[11px] bg-[#f3f3f3] dark:bg-[#1b1d22] text-slate-600 dark:text-white/55 border-t border-slate-300 dark:border-white/10">
        <span className="whitespace-nowrap">{tcc ? `${tcc.secoes.length} seções` : "—"}</span>
        <span className="whitespace-nowrap">{tcc ? `${palavrasDaPagina(tcc.secoes)} palavras` : ""}</span>
        <span className="hidden sm:inline">Português (Brasil)</span>
        <span className="ml-auto truncate hidden sm:inline">A4 · ABNT NBR 14724 · margens 3/2 cm · entrelinha 1,5</span>
      </footer>
      <ExportarTrabalho
        aberto={exportAberto} autorPadrao={session?.user?.name || ""} exportando={exportando} erro={erroExport}
        onFechar={() => { if (!exportando) setExportAberto(false); }} onExportar={(o) => void exportar(o)}
      />
      {convite && (
        <ConvitePainel
          convite={convite} ocupado={convidando} onPapel={(pp) => void convidar(pp)}
          onRevogar={() => void revogarConvites()} onFechar={() => setConvite(null)}
        />
      )}
    </aside>
  );
}

function Sep() { return <span aria-hidden className="shrink-0 mx-0.5 h-5 w-px bg-slate-300 dark:bg-white/15" />; }

function Btn({ rotulo, atalho, ativo, disabled, onClick, children }: { rotulo: string; atalho?: string; ativo?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button" aria-label={rotulo} title={atalho ? `${rotulo} (${atalho})` : rotulo} aria-pressed={ativo || undefined}
      disabled={disabled} onMouseDown={(e) => e.preventDefault() /* não tira o foco (nem a seleção) do texto */} onClick={onClick}
      className={`shrink-0 h-8 w-8 grid place-items-center rounded transition-colors disabled:opacity-35 disabled:cursor-not-allowed
        ${ativo ? "bg-[#c7dbf5] text-[#1d4a87] dark:bg-[#2b579a]/50 dark:text-white" : "text-slate-700 dark:text-white/80 hover:bg-slate-200 dark:hover:bg-white/10"}`}
    >{children}</button>
  );
}

/** A régua: 21 cm com marcas a cada 1 cm (meio cm menor) e as margens ABNT (3 cm à esquerda, 2 cm à direita) sombreadas. */
function Regua() {
  return (
    <div aria-hidden className="relative h-5 mb-2 bg-white text-[8px] text-slate-500 border border-slate-300 select-none" style={{ fontFamily: "system-ui" }}>
      <span className="absolute inset-y-0 left-0 bg-slate-200" style={{ width: cqw(3) }} />
      <span className="absolute inset-y-0 right-0 bg-slate-200" style={{ width: cqw(2) }} />
      {Array.from({ length: 41 }, (_, i) => i / 2).map((cm) => (
        <span key={cm} className="absolute bottom-0 w-px bg-slate-400" style={{ left: cqw(cm), height: Number.isInteger(cm) ? 6 : 3 }} />
      ))}
      {Array.from({ length: 19 }, (_, i) => i + 1).map((cm) => (
        <span key={cm} className="absolute top-0 -translate-x-1/2 leading-[11px]" style={{ left: cqw(cm) }}>{Math.abs(cm - 3) || ""}</span>
      ))}
      {/* recuo de primeira linha (1,25 cm depois da margem) e as margens, como os marcadores do Word */}
      <span className="absolute top-0 -translate-x-1/2 w-0 h-0 border-x-[4px] border-x-transparent border-t-[5px] border-t-[#2b579a]" style={{ left: cqw(4.25) }} title="Recuo de primeira linha: 1,25 cm" />
      <span className="absolute bottom-0 -translate-x-1/2 w-0 h-0 border-x-[4px] border-x-transparent border-b-[5px] border-b-[#2b579a]" style={{ left: cqw(3) }} />
      <span className="absolute bottom-0 -translate-x-1/2 w-0 h-0 border-x-[4px] border-x-transparent border-b-[5px] border-b-[#2b579a]" style={{ left: cqw(19) }} />
    </div>
  );
}

/** Uma seção na folha: título ABNT + o corpo como o motor desenha; clicar edita ali mesmo (texto em Times, sem sair da folha). */
function SecaoNaFolha({ s, realce, gerando, pendentes, onVerSugestoes, podeEscrever, editando, onEditar, onRenomear, onMudar, onSalvar, onCancelar, salvando, areaRef, onCursor, onAtalho }: {
  s: SecaoPagina; realce: boolean; gerando: boolean; pendentes: number; onVerSugestoes: () => void;
  podeEscrever: boolean; editando: string | null; onEditar: () => void; onRenomear: (titulo: string) => void; onMudar: (corpo: string) => void;
  onSalvar: () => void; onCancelar: () => void; salvando: boolean;
  areaRef: React.MutableRefObject<HTMLTextAreaElement | null>; onCursor: () => void; onAtalho: (m: "**" | "*") => void;
}) {
  const titulo = { fontSize: "inherit", textTransform: "uppercase" as const, margin: `${cqw(12 * PT)} 0`, fontWeight: 700 };
  const vazia = !s.corpo.trim();
  // o textarea cresce com o texto (sem barra própria: a folha é que rola)
  const crescer = (el: HTMLTextAreaElement | null) => { if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight + 2}px`; } };
  useEffect(() => { crescer(areaRef.current); }, [editando, areaRef]);

  return (
    <section className={`relative rounded-[2px] transition-colors duration-700 ${realce ? "bg-sky-100" : ""}`}>
      <h2 style={{ ...titulo, textAlign: s.centralizada ? "center" : "left" }} className="flex items-center gap-2" >
        <span className="flex-1 flex items-baseline gap-[0.5em]" style={{ justifyContent: s.centralizada ? "center" : "flex-start" }}>
          {s.numero && <span>{s.numero}</span>}
          <TituloEditavel valor={s.titulo} podeEditar={podeEscrever} rotulo={`Título da seção ${s.titulo}`} estilo={{ textTransform: "uppercase" }} onSalvar={onRenomear} />
        </span>
        {pendentes > 0 && (
          <button type="button" onClick={onVerSugestoes} className="font-sans normal-case text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
            {pendentes} sugestão{pendentes > 1 ? "ões" : ""}
          </button>
        )}
      </h2>
      {editando !== null ? (
        <div className="relative">
          <textarea
            ref={(el) => { areaRef.current = el; crescer(el); }}
            autoFocus
            value={editando}
            aria-label={`Texto de ${s.titulo}`}
            onChange={(e) => { onMudar(e.target.value); crescer(e.currentTarget); }}
            onSelect={onCursor} onKeyUp={onCursor} onClick={onCursor}
            onKeyDown={(e) => {
              if (e.key === "Escape") { e.preventDefault(); onCancelar(); }
              if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); onSalvar(); }
              if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") { e.preventDefault(); onAtalho("**"); }
              if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") { e.preventDefault(); onAtalho("*"); }
            }}
            className="block w-full resize-none bg-[#fbfdff] outline outline-1 outline-[#2b579a]/40 focus:outline-2 focus:outline-[#2b579a]/60 p-1"
            style={{ font: "inherit", lineHeight: 1.5, textAlign: "justify", minHeight: cqw(4) }}
          />
          <div className="mt-1 flex items-center justify-end gap-1.5 font-sans">
            <span className="mr-auto text-[10.5px] text-slate-500">Esc cancela · ⌘S salva · **negrito** *itálico* · “aspas” = citação longa</span>
            <button type="button" onClick={onCancelar} className="h-7 px-3 rounded text-[12px] text-slate-600 hover:bg-slate-100">Cancelar</button>
            <button type="button" onClick={onSalvar} disabled={salvando} className="h-7 px-3 rounded text-[12px] font-semibold bg-[#2b579a] text-white hover:bg-[#244a85] disabled:opacity-50 inline-flex items-center gap-1">
              {salvando ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Salvar
            </button>
          </div>
        </div>
      ) : (
        <div
          role={podeEscrever ? "button" : undefined}
          tabIndex={podeEscrever ? 0 : undefined}
          aria-label={podeEscrever ? `Editar ${s.titulo}` : undefined}
          onClick={podeEscrever ? onEditar : undefined}
          onKeyDown={podeEscrever ? (e) => { if (e.key === "Enter") { e.preventDefault(); onEditar(); } } : undefined}
          className={podeEscrever ? "cursor-text rounded-[2px] hover:bg-slate-50 hover:outline hover:outline-1 hover:outline-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2b579a]/50" : ""}
        >
          {vazia ? (
            <p className="font-sans text-[12px] italic text-slate-400 py-1" style={{ textIndent: cqw(1.25) }}>
              {gerando ? "escrevendo…" : podeEscrever ? "Seção vazia — clique para escrever, ou peça no chat (\"escreva esta seção\")." : "Seção vazia."}
            </p>
          ) : s.referencias ? (
            s.blocos.map((b, j) => <p key={j} style={{ textAlign: "left", lineHeight: 1.15, margin: `0 0 ${cqw(12 * PT)}` }}><Inline texto={b.texto} /></p>)
          ) : (
            <>
              {s.blocos.map((b, j) => <Bloco key={j} texto={b.texto} n={b.n} />)}
              {s.subs.map((sub, j) => (
                <div key={j}>
                  <h3 style={{ fontSize: "inherit", textTransform: "uppercase", margin: `${cqw(12 * PT)} 0`, fontWeight: 400 }}>{sub.numero ? `${sub.numero} ` : ""}{sub.titulo}</h3>
                  {sub.blocos.map((b, k) => <Bloco key={k} texto={b.texto} n={b.n} />)}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * Um título da folha que se edita ali mesmo (como no Word): clique → vira campo com a mesma letra; Enter ou
 * clicar fora salva, Esc desiste. Sem permissão de escrita, é só texto.
 */
function TituloEditavel({ valor, podeEditar, rotulo, estilo, onSalvar }: {
  valor: string; podeEditar: boolean; rotulo: string; estilo?: React.CSSProperties; onSalvar: (t: string) => void;
}) {
  const [editando, setEditando] = useState<string | null>(null);
  const salvar = () => { if (editando !== null) { const t = editando.trim(); setEditando(null); if (t && t !== valor) onSalvar(t); } };
  if (!podeEditar) return <span style={estilo}>{valor}</span>;
  if (editando !== null) {
    return (
      <input
        autoFocus value={editando} aria-label={rotulo}
        onChange={(e) => setEditando(e.target.value)}
        onBlur={salvar}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); salvar(); } if (e.key === "Escape") { e.preventDefault(); setEditando(null); } }}
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 w-full bg-[#fbfdff] outline outline-2 outline-[#2b579a]/50 px-1"
        style={{ ...estilo, font: "inherit", fontWeight: "inherit", textAlign: (estilo?.textAlign as any) ?? "inherit", display: "block" }}
      />
    );
  }
  return (
    <span
      role="button" tabIndex={0} title="Clique para editar o título" aria-label={`${rotulo} — clique para editar`}
      onClick={(e) => { e.stopPropagation(); setEditando(valor); }}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setEditando(valor); } }}
      className="cursor-text rounded-[2px] hover:bg-slate-50 hover:outline hover:outline-1 hover:outline-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2b579a]/50"
      style={{ ...estilo, display: estilo?.textAlign ? "block" : undefined }}
    >{valor}</span>
  );
}

/**
 * O painel do CONVITE.
 *
 * 🔴 O texto do escopo não é enfeite: o link concede papel na CONVERSA, e portanto em TODOS os
 * trabalhos dela, inclusive os que nascerem depois (ver lib/tcc/compartilhar.ts). Quem clica em
 * "Convidar" dentro de um documento naturalmente lê "convidar para este documento" — e deixar essa
 * leitura passar seria o botão concedendo mais do que diz. Por isso a frase vem do campo `escopo`
 * que o SERVIDOR devolve, não de uma string solta aqui.
 *
 * Exportado SÓ para o teste: essa frase é a garantia de honestidade do recurso, então ela tem um
 * teste próprio em vez de depender de alguém reler o JSX.
 */
export function ConvitePainel({ convite, ocupado, onPapel, onRevogar, onFechar }: {
  convite: Convite; ocupado: boolean;
  onPapel: (p: PapelConvite) => void; onRevogar: () => void; onFechar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);
  // o servidor devolve caminho relativo; o que a pessoa envia tem de ser o endereço inteiro
  const url = typeof window === "undefined" ? convite.url : `${window.location.origin}${convite.url}`;
  const copiar = async () => {
    try { await navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }
    catch { /* sem clipboard: o campo fica selecionável */ }
  };
  return (
    <div role="dialog" aria-modal="true" aria-label="Convidar colaborador"
      className="absolute inset-0 z-30 grid place-items-center bg-black/40 p-4" onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[520px] rounded-xl bg-white dark:bg-[#23262d] shadow-2xl border border-slate-200 dark:border-white/10 p-4">
        <div className="flex items-center gap-2 mb-1">
          <UserPlus size={16} className="text-[#2b579a]" aria-hidden />
          <h2 className="font-sans text-[14px] font-semibold text-slate-800 dark:text-white">Convidar para co-criar</h2>
          <span className="flex-1" />
          <button type="button" onClick={onFechar} aria-label="Fechar" className="h-7 w-7 rounded grid place-items-center text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X size={16} /></button>
        </div>

        <p className="font-sans text-[12px] leading-snug text-slate-600 dark:text-white/70 mb-3">
          Quem abrir este link entra como <strong>{convite.papel === "editor" ? "editor" : "leitor"}</strong>
          {convite.escopo === "conversa" ? " desta conversa — e isso vale para TODOS os trabalhos dela, inclusive os próximos." : "."}
          {convite.papel === "editor" ? " Editor altera o documento junto com você, em tempo real." : " Leitor só acompanha, sem editar."}
        </p>

        <label className="sr-only" htmlFor="convite-url">Link do convite</label>
        <div className="flex items-center gap-2 mb-3">
          <input id="convite-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 h-9 rounded-md border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#1b1d22] px-2 font-mono text-[11px] text-slate-700 dark:text-white/80" />
          <button type="button" onClick={() => void copiar()}
            className="shrink-0 h-9 px-3 rounded-md inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-[#2b579a] hover:bg-[#244a85]">
            {copiado ? <Check size={14} /> : <Copy size={14} />}{copiado ? "Copiado" : "Copiar"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-sans text-[11px] text-slate-500 dark:text-white/50">Gerar como:</span>
          {(["editor", "leitor"] as const).map((pp) => (
            <button key={pp} type="button" disabled={ocupado} onClick={() => onPapel(pp)}
              aria-pressed={convite.papel === pp}
              className={`h-7 px-2.5 rounded-md font-sans text-[11px] font-semibold border disabled:opacity-40 ${
                convite.papel === pp
                  ? "bg-[#2b579a] text-white border-[#2b579a]"
                  : "text-slate-600 dark:text-white/70 border-slate-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10"}`}>
              {pp === "editor" ? "Editor" : "Leitor"}
            </button>
          ))}
          <span className="flex-1" />
          <button type="button" disabled={ocupado} onClick={onRevogar}
            title="Invalida todos os links já enviados. Quem já entrou continua na conversa."
            className="h-7 px-2.5 rounded-md inline-flex items-center gap-1.5 font-sans text-[11px] font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-40">
            <Link2Off size={13} aria-hidden /> Revogar links
          </button>
        </div>
      </div>
    </div>
  );
}
