"use client";
// PRÉVIA LOCAL (não commitar): Sala de Pesquisa em ABAS
import { useState } from "react";
import ResearchShell from "@/app/research-lab/ResearchShell";
import { useLibraryFiles, type LibraryFile } from "@/lib/useLibraryFiles";
import type { WindowEntry } from "@/lib/useWindowStore";
import { EVT_ANEXAR, pdfDaBiblioteca } from "@/components/chat/useAnexoChat";

export default function Previa() {
  const { files } = useLibraryFiles();
  const [wins, setWins] = useState<WindowEntry[]>([{ id: "research", label: "Minha pesquisa", emoji: "📝", type: "research" }]);
  const [ativa, setAtiva] = useState("research");
  const [docs, setDocs] = useState<Record<string, LibraryFile>>({});
  const ver = (id: string) => { const f = files.find((x) => x.id === id); if (!f) return; const w = `pdf-${id}`; setDocs((d) => ({ ...d, [w]: f })); setWins((x) => (x.some((y) => y.id === w) ? x : [...x, { id: w, label: f.title.slice(0, 18), emoji: "📄", type: "pdfview" }])); setAtiva(w); };
  (globalThis as any).__ver = ver;
  return (
    <div style={{ position: "fixed", inset: 0, padding: 24, background: "#05060c" }}>
      <ResearchShell
        researchWindowContent={<div className="p-8 text-white/80">Minha Pesquisa (folha)</div>}
        documentWindowContent={<div />}
        onPlayFile={async (f) => { const dataUrl = await pdfDaBiblioteca(f); window.dispatchEvent(new CustomEvent(EVT_ANEXAR, { detail: { sala: "pesquisa", id: f.id, nome: f.title, dataUrl } })); }}
        sessions={[]} windows={wins} activeId={ativa} onSelectWindow={setAtiva}
        addWindow={(w) => setWins((x) => [...x, w])} removeWindow={(id) => setWins((x) => x.filter((w) => w.id !== id))}
        unifiedView="abas" chatActive pdfDocs={docs} onViewDoc={ver} onAdd={() => {}} processingFileId={null} onOpenSession={() => {}} onNewWork={() => {}}
      />
    </div>
  );
}
