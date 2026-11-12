"use client";
import PastasEmpilhadas, { CORPO_DA_PASTA, type Pasta } from "@/components/chat/PastasEmpilhadas";
import RostoDaAba from "@/components/agents/avatar/RostoDaAba";
import { useCallback, useState, useEffect } from "react";
import type { WindowEntry } from "@/lib/useWindowStore";
import RichText from "@/components/research/RichText";
import { useCursorPos } from "@/lib/useCursorPos";
import { useSavedCitations } from "@/lib/useSavedCitations";
import type { LibraryFile } from "@/lib/useLibraryFiles";
import WindowSwitcher from "./WindowSwitcher";
import ResearchChat from "@/components/research/ResearchChat";
import { useConversasSlot } from "@/components/chat/ConversasSlot";
import DocumentoArtefato from "@/components/studio/DocumentoArtefato";
import { EVT_ABRIR_DOC, ROTULO_DOC, type DocArtefato } from "@/lib/chat/documentos";
import DocumentDesktop from "./DocumentDesktop";
import PdfViewer from "./PdfViewer";
import type { SavedCitation } from "@/lib/useSavedCitations";
import type { WorkType } from "@/lib/abntTemplate";

interface ResearchShellProps {
  /**
   * Rendered inside the left panel when the "research" window is active.
   * Typically: the A4 writing area from page.tsx.
   */
  researchWindowContent: React.ReactNode;
  /**
   * Rendered inside the left panel when any document window is active.
   * Typically: the Aura PDF chat interface from page.tsx.
   */
  documentWindowContent: React.ReactNode;
  /** Called when the user clicks Play on a document icon. */
  onPlayFile: (file: LibraryFile) => void;
  processingFileId: string | null;
  /** Two-stage progress for the play flow: "pdf" → "ai" → null (done). */
  processingStage?: "pdf" | "ai" | null;
  /** Triggers the hidden file input in page.tsx for PDF uploads via ＋ dock button. */
  onAdd?: () => void;
  /** Research sessions list for the 📁 folder panel. */
  sessions: { id: string; title: string; updatedAt?: string }[];
  onOpenSession: (id: string) => void;
  /** "Minhas coisas": criar um trabalho novo e excluir um trabalho salvo. */
  onNewWork?: () => void;
  onDeleteWork?: (id: string) => void;
  /** publicar um trabalho na vitrine (pasta de pesquisa) e o status de cada um — passa direto pro DocumentDesktop */
  onPublishWork?: (id: string) => void;
  publicacoes?: Record<string, { status: string; motivo?: string | null }>;
  /** Tipo de trabalho atual + setter — o pill "Minha pesquisa" reage a isto.
   *  `WorkType` e nao `string`: o `string` deixava esta prop aceitar qualquer coisa, e era
   *  por isso que o tsc reclamava ao receber o `switchWorkType` da página, que é estrito.
   *  Existem TRÊS WorkType no projeto (abntTemplate, quality/types e plans) — este caminho
   *  usa o do abntTemplate ('Artigo' | 'Relatório' | 'TCC'), que é o que o WindowSwitcher
   *  de fato emite. Os três deviam virar um só, mas isso é outra faxina. */
  workType?: WorkType | null;
  onWorkType?: (t: WorkType) => void;
  /** Arrastar um doc sobre outro → relacionar as pesquisas. */
  onRelate?: (sourceId: string, targetId: string) => void;
  /** Ler a pesquisa (texto do editor) em voz — botão play/stop na aba da pesquisa. */
  onReadResearch?: () => void;
  isReadingResearch?: boolean;
  /** Window store (subido pro page.tsx) — abas de play E de merge. */
  windows: WindowEntry[];
  activeId: string;
  onSelectWindow: (id: string) => void;
  addWindow: (entry: WindowEntry) => void;
  removeWindow: (id: string) => void;
  /** Resumos de relação por aba (merge): id da janela → conteúdo. */
  relSummaries?: Record<string, { title: string; text: string; loading?: boolean }>;
  /** Arrastar um doc PRA folha → ver o PDF real. Recebe o id do arquivo. */
  onViewDoc?: (fileId: string) => void;
  /** Arquivos abertos como visualizador de PDF: id da janela (pdf-…) → arquivo. */
  pdfDocs?: Record<string, LibraryFile>;
  /** Salvar uma citação gerada pela seleção no PDF. */
  onCite?: (c: SavedCitation) => void;
  /** Nível do engine de citação: "vercel" (rápido) ou "gemini" (robusto). */
  citeMode?: "vercel" | "gemini";
  /** Espelhar o layout (canhoto): documentos à esquerda, folha à direita. */
  flipped?: boolean;
  /** TCC cross-sala aberto na folha → o chat lapida ESTE documento (como sugestões). */
  tccWorkId?: string | null;
  /** Sala unificada: o chat é a interação principal → nasce aberto (a pill ⟁ alterna pro trabalho). */
  defaultChatOpen?: boolean;
  /** O chat está em cena (sala + sub-aba visíveis) — liga o autofoco do composer. */
  chatActive?: boolean;
  /** Sala unificada: qual visão mostrar — "chat", "folha" ou "abas" (a SALA DE PESQUISA: UMA barra de abas
   *  com as conversas, a pesquisa ("Minha pesquisa") e o leitor de PDF; a aba ativa ocupa a sala inteira). */
  unifiedView?: "chat" | "folha" | "abas";
  /** PDFs do computador soltos na folha/leitor ou na barra de documentos → vão pra biblioteca. */
  onDropFiles?: (files: File[]) => void;
  /** Sala unificada: algo pediu a folha (tocar/abrir um documento) estando no chat. */
  onNeedSheet?: () => void;
}

export default function ResearchShell({
  researchWindowContent,
  documentWindowContent,
  onPlayFile,
  processingFileId,
  processingStage,
  onAdd,
  sessions,
  onOpenSession,
  onNewWork,
  onDeleteWork,
  onPublishWork,
  publicacoes,
  workType,
  onWorkType,
  onRelate,
  onReadResearch,
  isReadingResearch,
  windows,
  activeId,
  onSelectWindow,
  addWindow,
  removeWindow,
  relSummaries,
  onViewDoc,
  pdfDocs,
  onCite,
  citeMode,
  flipped,
  tccWorkId,
  defaultChatOpen = false,
  chatActive = true,
  unifiedView,
  onNeedSheet,
  onDropFiles,
}: ResearchShellProps) {
  const { containerRef, posRef } = useCursorPos();
  const { citations } = useSavedCitations();
  const [openPopover, setOpenPopover] = useState<"citations" | "quiz" | null>(null);
  const [showFolder, setShowFolder] = useState(false);
  const [fileDragOver, setFileDragOver] = useState(false);
  const [chatOpen, setChatOpen] = useState(defaultChatOpen);   // chat científico ↔ trabalho
  // Sala unificada: a visão vem da sub-aba (chat × folha). Fora dela, a pill ⟁ Chat alterna.
  // Sala com ABAS: `vista` = o que ocupa a sala — "chat" (a conversa ativa) ou o id de uma janela (a pesquisa /
  // um PDF no leitor). Dois eixos que não se misturam: CONVERSAS na coluna da ESQUERDA (o chat as põe lá por
  // portal, na `lateral`) e DOCUMENTOS nas abas do TOPO. Trocar de conversa não troca o documento, e vice-versa.
  const abas = unifiedView === "abas";
  const [vista, setVista] = useState<string>("chat");
  // a Aura está respondendo na conversa (ResearchChat) → o friso da pasta "Conversa" varre
  const [chatGerando, setChatGerando] = useState(false);
  const [lateral, setLateral] = useState<HTMLDivElement | null>(null);
  // O traçador de percurso (bolinha do cérebro) mora no TOPO da sala, sem nome — o chat desenha aqui por portal.
  const [slotTopo, setSlotTopo] = useState<HTMLDivElement | null>(null);
  // 🧭 DIAGRAMAS: a gaveta dos diagramas gerados (as abas de artefato "diagram") — é onde eles ficam guardados.
  const [diagramasAberto, setDiagramasAberto] = useState(false);
  // Com a sidebar principal do app (components/chat/ConversasSlot), as conversas vão pra lá — sem 2ª coluna.
  const slotSidebar = useConversasSlot("pesquisa");
  const [maisAberto, setMaisAberto] = useState(false);
  const chatVisible = abas ? vista === "chat" : unifiedView ? unifiedView === "chat" : chatOpen;
  const verJanela = useCallback((id: string) => { onSelectWindow(id); setVista(id); }, [onSelectWindow]);
  const [docsCollapsed, setDocsCollapsed] = useState(false);  // retrair a barra de documentos

  // Diagrama/aula pedidos no chat abrem como DOCUMENTO numa aba do topo (lib/chat/documentos).
  useEffect(() => {
    if (!abas) return;
    const on = (e: Event) => {
      const d = (e as CustomEvent<DocArtefato>).detail;
      if (!d || d.sala !== "pesquisa") return;
      const id = `art-${d.artifactId}`;
      const r = ROTULO_DOC[d.studioKind] ?? { emoji: "⟁", nome: "Documento" };
      addWindow({ id, label: (d.titulo || r.nome).slice(0, 28), emoji: r.emoji, type: "artefato", artefato: { studioKind: d.studioKind, artifactId: d.artifactId, titulo: d.titulo, data: d.data } });
      if (d.focar) verJanela(id);
    };
    window.addEventListener(EVT_ABRIR_DOC, on);
    return () => window.removeEventListener(EVT_ABRIR_DOC, on);
  }, [abas, addWindow, verJanela]);

  // Gerou um trabalho pelo chat (zaeon:research:newdoc) → fecha o chat e mostra o documento.
  useEffect(() => {
    // Idem ao abrir um trabalho/pesquisa salva na folha (zaeon:research:showdoc, do page.tsx).
    const onNewDoc = () => { setChatOpen(false); setVista("research"); };
    window.addEventListener("zaeon:research:newdoc", onNewDoc);
    window.addEventListener("zaeon:research:showdoc", onNewDoc);
    return () => {
      window.removeEventListener("zaeon:research:newdoc", onNewDoc);
      window.removeEventListener("zaeon:research:showdoc", onNewDoc);
    };
  }, []);
  // Mobile (<640px): empilha em coluna única (conversa em cima, documentos abaixo).
  const [vw, setVw] = useState(0);
  useEffect(() => {
    const f = () => setVw(window.innerWidth);
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  const mobile = vw > 0 && vw < 640;

  // Unificada: tocar/abrir um documento estando no chat leva pra folha (onde o documento aparece).
  const needSheet = unifiedView === "chat" ? onNeedSheet : undefined;
  // Abas: arrastar um documento da biblioteca pro leitor abre a aba do PDF (a page cria a janela `pdf-<id>`).
  const viewDoc = useCallback((id: string) => { needSheet?.(); onViewDoc?.(id); if (abas) setVista(`pdf-${id}`); }, [needSheet, onViewDoc, abas]);

  const handlePlayFile = useCallback(
    (file: LibraryFile) => {
      if (abas) { setVista("chat"); onPlayFile(file); return; }   // ▶ = conversar sobre o PDF (no chat), sem abrir janela
      needSheet?.();
      addWindow({
        id: file.id,
        label: file.title.slice(0, 22),
        emoji: "📄",
        type: "document",
      });
      onSelectWindow(file.id);
      onPlayFile(file);
    },
    [addWindow, onSelectWindow, onPlayFile, needSheet, abas],
  );

  return (
    <div
      style={{
        display: mobile ? "flex" : "grid",
        flexDirection: mobile ? "column" : undefined,
        gridTemplateColumns: mobile
          ? undefined
          : (flipped
                ? `${docsCollapsed ? "48px" : "15rem"} 1fr`
                : `1fr ${docsCollapsed ? "48px" : "15rem"}`),
        gap: mobile ? 10 : 14,
        height: mobile ? "auto" : "100%",
        minHeight: mobile ? "78vh" : unifiedView ? 0 : 600,
        maxHeight: "none",
        borderRadius: 22,
        background: "rgba(22,22,34,0.55)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(40px) saturate(180%)",
        WebkitBackdropFilter: "blur(40px) saturate(180%)",
        boxShadow:
          "0 40px 100px -30px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.10)",
        padding: mobile ? 10 : 14,
        overflow: mobile ? "visible" : "hidden",
      }}
    >
      {/* ──────── LEFT PANEL (70%) ──────── */}
      <div
        className="relative flex flex-row min-h-0 overflow-hidden rounded-[18px] transition-all"
        style={{
          order: flipped ? 2 : 0,
          minHeight: mobile ? "60vh" : undefined,
          flex: mobile ? "1 1 auto" : undefined,
          background: "rgba(255,255,255,0.045)",
          border: fileDragOver ? "1px solid rgba(34,197,94,0.75)" : "1px solid rgba(255,255,255,0.10)",
          boxShadow: fileDragOver
            ? "inset 0 0 0 2px rgba(34,197,94,0.45), inset 0 1px 0 rgba(255,255,255,0.12)"
            : "inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
        // Arrastar um documento PRA folha → abre o PDF real (não confundir com citação: mime diferente).
        onDragOver={(e) => {
          const doc = onViewDoc && e.dataTransfer.types.includes("text/zaeon-file");
          const doPc = onDropFiles && e.dataTransfer.types.includes("Files") && !(abas && chatVisible);   // PDF do computador (no chat, quem recebe é o próprio chat)
          if (doc || doPc) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            setFileDragOver(true);
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setFileDragOver(false);
        }}
        onDrop={(e) => {
          const id = e.dataTransfer.getData("text/zaeon-file");
          if (id && onViewDoc) {
            e.preventDefault();
            viewDoc(id);
          } else if (onDropFiles && e.dataTransfer.files?.length && !(abas && chatVisible)) {
            e.preventDefault();
            const pdfs = Array.from(e.dataTransfer.files).filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
            if (pdfs.length) onDropFiles(pdfs);
          }
          setFileDragOver(false);
        }}
      >
        {/* Confirmação verde ao arrastar um doc PRA folha — "soltar para ver" */}
        {fileDragOver && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none" style={{ background: "rgba(16,185,129,0.10)", backdropFilter: "blur(2px)" }}>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: "rgba(6,78,59,0.92)", border: "1px solid rgba(34,197,94,0.7)", boxShadow: "0 10px 30px -10px rgba(34,197,94,0.8)" }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[14px] leading-none" style={{ background: "rgba(34,197,94,0.95)" }}>+</span>
              <span className="text-[11px] font-black uppercase tracking-wide text-emerald-100">{abas && chatVisible ? "Soltar para a IA ler" : "Soltar para ver o documento"}</span>
            </div>
          </div>
        )}

        {/* ESQUERDA = CONVERSAS: a barra lateral do chat chega aqui por portal (fica à mostra com um documento aberto). */}
        {abas && slotSidebar === undefined && <div ref={setLateral} className="shrink-0 h-full min-h-0 flex text-slate-900 dark:text-white" />}
        <div className="relative flex-1 min-w-0 min-h-0 flex flex-col">
        {/* TOPO = DOCUMENTOS: a conversa em cena, a pesquisa ("Minha pesquisa") e os PDFs abertos no leitor, e o ＋
            (nova pesquisa). A aba ativa ocupa a sala; a conversa mostrada é a que está acesa na barra da esquerda. */}
        {abas && (() => {
          const diagramas = windows.filter((w) => w.type === "artefato" && (w as any).artefato?.studioKind === "diagram");
          const pastas: Pasta[] = [
            {
              id: "chat", rotulo: "Conversa", titulo: "A conversa",
              icone: <RostoDaAba agentId="aura" nome="Aura" ativa={vista === "chat"} size={18}><span className="text-[11px] leading-none">⟁</span></RostoDaAba>,
            },
            ...windows.filter((w) => w.type !== "document").map((w): Pasta => {
              const rotulo = w.id === "research" ? (workType ? `Meu ${workType}` : "Minha pesquisa") : w.label;
              return {
                id: w.id, rotulo,
                icone: w.id === "research" && onReadResearch ? (
                  <span
                    role="button"
                    aria-label={isReadingResearch ? "Parar leitura" : "Ouvir a pesquisa"}
                    title={isReadingResearch ? "Parar a leitura" : "Ouvir a pesquisa em voz"}
                    onClick={(e) => { e.stopPropagation(); onReadResearch(); }}
                    className="text-[10px]"
                  >{isReadingResearch ? "⏹" : "▶"}</span>
                ) : w.emoji,
                onFechar: w.id !== "research" ? () => { removeWindow(w.id); if (vista === w.id) setVista("chat"); } : undefined,
              };
            }),
          ];
          return (
            // TOPO = PASTAS: a conversa na frente e os documentos dela (a pesquisa, os PDFs no leitor, diagramas, aulas)
            // empilhados atrás — puxar uma aba traz a pasta pra frente (components/chat/PastasEmpilhadas).
            <PastasEmpilhadas
              pastas={pastas}
              ativa={vista}
              gerando={chatGerando ? "chat" : null}
              onAbrir={(id) => (id === "chat" ? setVista("chat") : verJanela(id))}
              // o traçador de percurso: só o sinal da bolinha (gira quando um percurso está pronto pra ser criado)
              antes={<div ref={setSlotTopo} className="shrink-0 flex items-center self-center empty:hidden" />}
              depois={<>
                {/* 🧭 os DIAGRAMAS gerados ficam guardados aqui */}
                <button
                  type="button"
                  onClick={() => setDiagramasAberto((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={diagramasAberto}
                  aria-label={`Diagramas (${diagramas.length})`}
                  title={diagramas.length ? `Diagramas gerados (${diagramas.length})` : "Diagramas — os que a IA gerar ficam aqui"}
                  className={`relative inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${diagramasAberto ? "bg-black dark:bg-white text-white dark:text-black border-transparent" : "text-slate-700 dark:text-white/70 border-slate-200 dark:border-white/10 hover:border-cyan-400/50"}`}
                >
                  <span className="text-[13px] leading-none" aria-hidden>🧭</span>
                  {diagramas.length > 0 && <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-cyan-500 text-[9px] font-black text-black grid place-items-center">{diagramas.length}</span>}
                </button>
                <button
                  onClick={() => setMaisAberto((v) => !v)}
                  title="Novo documento"
                  aria-label="Novo documento"
                  aria-expanded={maisAberto}
                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-dashed border-slate-300 dark:border-white/15 text-slate-600 dark:text-white/60 hover:border-cyan-400/60 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors"
                >
                  <span className="text-[13px] leading-none">＋</span>
                  <span className="text-[11px] font-bold">Nova</span>
                </button>
              </>}
            />
          );
        })()}
        {abas && maisAberto && (
          <div className="absolute z-[70] top-12 left-3 flex flex-col gap-1 p-1.5 rounded-2xl min-w-[200px]" style={{ background: "rgba(14,16,28,0.96)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 20px 50px -20px rgba(0,0,0,0.9)" }} onMouseLeave={() => setMaisAberto(false)}>
            {onNewWork && (
              <button
                onClick={() => { setMaisAberto(false); onNewWork(); verJanela("research"); }}
                className="text-left px-3 py-2 rounded-xl text-[12px] font-bold text-white/85 hover:bg-white/10"
              >📝 Nova pesquisa</button>
            )}
            <p className="px-3 pt-1 pb-1.5 text-[10px] text-white/40 leading-snug">Pra ler um PDF no leitor, arraste o documento da biblioteca pra cá. Conversa nova: na barra da esquerda.</p>
          </div>
        )}

        {/* Chat da sala unificada: as conversas (temas) vivem dentro do próprio chat — sem 2ª pill. */}
        {unifiedView !== "chat" && !abas && <WindowSwitcher
          windows={windows}
          activeId={activeId}
          // Selecionar uma janela OU um tipo (TCC/Artigo/Relatório) leva pro trabalho:
          // fecha o chat pra mostrar o documento.
          onSelect={(id) => { setChatOpen(false); onSelectWindow(id); }}
          onClose={removeWindow}
          workType={workType}
          // Sem onWorkType (sala unificada) → sem seletor de tipo: a IA infere pela intenção.
          onWorkType={onWorkType ? (t) => { setChatOpen(false); onWorkType(t); } : undefined}
          onReadResearch={onReadResearch}
          isReadingResearch={isReadingResearch}
          chatOpen={chatVisible}
          onToggleChat={unifiedView ? undefined : () => setChatOpen((v) => !v)}
        />}

        {/* 🧭 a gaveta dos diagramas (fora da barra, que recorta por causa do overflow) */}
        {abas && diagramasAberto && (() => {
          const diagramas = windows.filter((w) => w.type === "artefato" && (w as any).artefato?.studioKind === "diagram");
          return (
            <div role="menu" className="absolute z-[70] top-12 left-3 flex flex-col gap-1 p-1.5 rounded-2xl min-w-[220px]" style={{ background: "rgba(14,16,28,0.96)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 20px 50px -20px rgba(0,0,0,0.9)" }} onMouseLeave={() => setDiagramasAberto(false)}>
              <span className="px-2 pt-1 pb-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-white/45">Diagramas</span>
              {diagramas.length === 0 && <span className="px-2 pb-1.5 text-[11px] text-white/55">Nenhum diagrama ainda — peça um na conversa e ele fica guardado aqui.</span>}
              {diagramas.map((w) => (
                <button key={w.id} type="button" role="menuitem" onClick={() => { verJanela(w.id); setDiagramasAberto(false); }} className={`flex items-center gap-2 px-2 py-1.5 rounded-xl text-left text-[12px] ${vista === w.id ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5"}`}>
                  <span aria-hidden>🧭</span><span className="truncate">{w.label}</span>
                </button>
              ))}
            </div>
          );
        })()}
        {/* Sheet area — all windows mounted, inactive ones hidden via display:none */}
        <div ref={containerRef} className={`flex-1 relative min-h-0 overflow-hidden ${abas ? CORPO_DA_PASTA : ""}`}>
          {/* Chat (Escritor/Revisor) sobrepõe o trabalho quando ligado na pill — alterna responsivo. */}
          {/* Sala unificada: o chat fica MONTADO (só escondido) ao ir pra folha — uma resposta em curso
              não é derrubada, o rascunho não some e o composer não precisa remontar. Fora da sala
              unificada mantém o comportamento antigo (monta/desmonta pela pill). */}
          {(chatVisible || unifiedView) && (
            <div className="absolute inset-0 z-[55]" style={unifiedView && !chatVisible ? { display: "none" } : undefined} aria-hidden={unifiedView ? !chatVisible : undefined}>
              <ResearchChat
                workType={workType}
                tccWorkId={tccWorkId}
                active={chatActive && chatVisible}
                comAbas={!!unifiedView}
                lateral={abas ? lateral : undefined}
                slotTopo={abas ? slotTopo : undefined}
                emCena={chatVisible}
                onAtivar={abas ? () => setVista("chat") : undefined}
                onGerando={abas ? setChatGerando : undefined}
              />
            </div>
          )}
          {/* Research window (always mounted) */}
          <div
            className="h-full overflow-y-auto"
            style={{ display: activeId === "research" && !chatVisible ? undefined : "none" }}
          >
            {researchWindowContent}
          </div>

          {/* PDF viewer windows — o documento real, selecionável (arrastado pra folha) */}
          {windows
            .filter((w) => w.type === "pdfview")
            .map((w) => (
              <div
                key={w.id}
                className="h-full"
                style={{ display: activeId === w.id && !chatVisible ? undefined : "none" }}
              >
                {pdfDocs?.[w.id] && (
                  <PdfViewer
                    file={pdfDocs[w.id]}
                    mode={citeMode ?? "vercel"}
                    onCite={(c) => onCite?.(c)}
                  />
                )}
              </div>
            ))}

          {/* Artefatos-documento (diagrama interativo, aula) — a aba ocupa a sala inteira */}
          {windows
            .filter((w) => w.type === "artefato" && w.artefato)
            .map((w) => (
              <div key={w.id} className="h-full" style={{ display: activeId === w.id && !chatVisible ? undefined : "none" }}>
                <DocumentoArtefato doc={w.artefato!} />
              </div>
            ))}

          {/* Document windows — one per open doc, each hidden when not active */}
          {windows
            .filter((w) => w.type === "document")
            .map((w) => (
              <div
                key={w.id}
                className="h-full overflow-y-auto"
                style={{ display: activeId === w.id && !chatVisible ? undefined : "none" }}
              >
                {relSummaries?.[w.id] ? (
                  <div className="h-full overflow-y-auto custom-scrollbar p-7 bg-white dark:bg-[#0f172a]">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-500 mb-3">🔗 {relSummaries[w.id].title}</p>
                    {relSummaries[w.id].loading ? (
                      <div className="mt-1">
                        <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(120,120,150,0.18)" }}>
                          <div className="h-full rounded-full animate-pulse" style={{ width: "55%", background: "linear-gradient(90deg,#8b5cf6,#22d3ee)" }} />
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-white/40 mt-2 italic">Relacionando os dois trabalhos…</p>
                      </div>
                    ) : (
                      <div className="text-[14px] leading-relaxed text-slate-800 dark:text-white/90"><RichText text={relSummaries[w.id].text} reveal /></div>
                    )}
                  </div>
                ) : (
                  documentWindowContent
                )}
              </div>
            ))}

        </div>
        </div>

      </div>

      {/* ──────── RIGHT PANEL — barra de documentos, RETRÁTIL (como a biblioteca da Sala de Estudos) ──────── */}
      <div
        className={mobile ? "" : "relative h-full min-h-0 overflow-hidden"}
        style={
          mobile
            ? { maxHeight: "40vh", minHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column" }
            : { order: flipped ? 1 : 2 }
        }
      >
        {!mobile && docsCollapsed ? (
          /* Trilho recolhido — clique pra mostrar os documentos */
          <button
            onClick={() => setDocsCollapsed(false)}
            title="Mostrar documentos"
            className="h-full w-full flex flex-col items-center justify-center gap-2 rounded-[18px] text-white/45 hover:text-cyan-300 transition-colors"
            style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.10)" }}
          >
            <span className="text-[13px]">📄</span>
            <span className="text-[9px] font-black uppercase tracking-[0.16em] [writing-mode:vertical-rl] rotate-180">Documentos</span>
          </button>
        ) : (
          <>
            <div className={mobile ? "" : "h-full min-h-0 [&>*]:h-full"}>
              <DocumentDesktop
                processingFileId={processingFileId}
                processingStage={processingStage}
                onPlayFile={handlePlayFile}
                onAdd={onAdd}
                openPopover={openPopover}
                onTogglePopover={setOpenPopover}
                citationCount={citations.length}
                showFolder={showFolder}
                onToggleFolder={() => setShowFolder((v) => !v)}
                sessions={sessions}
                onOpenSession={onOpenSession}
                onNewWork={onNewWork}
                onDeleteWork={onDeleteWork}
                onPublishWork={onPublishWork}
                publicacoes={publicacoes}
                onRelate={onRelate}
                onView={(f) => viewDoc(f.id)}
                onDropFiles={onDropFiles}
                flipped={flipped}
              />
            </div>
            {!mobile && (
              <button
                onClick={() => setDocsCollapsed(true)}
                title="Recolher documentos"
                className="absolute top-2 right-2 z-20 w-6 h-6 rounded-lg flex items-center justify-center text-white/40 hover:text-white/85 hover:bg-white/10 transition-colors"
              >
                <span className="text-[13px] leading-none">⟩</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
