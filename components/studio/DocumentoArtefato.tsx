"use client";
/** Um artefato-documento ocupando a aba inteira da sala (diagrama interativo, aula ou livro no leitor). */
import dynamic from "next/dynamic";
import DiagramView from "@/components/studio/DiagramView";
import AulaView from "@/components/aula-interativa/AulaView";
import CadernoView from "@/components/studio/CadernoView";
import ForjaView from "@/components/studio/ForjaView";
import DevicePanelView from "@/components/studio/DevicePanelView";
import type { DocArtefato } from "@/lib/chat/documentos";

// o leitor carrega o pdf.js — só quando um livro é aberto
const LeitorDocumento = dynamic(() => import("@/components/chat/LeitorDocumento"), { ssr: false, loading: () => <div className="h-full animate-pulse bg-slate-100 dark:bg-white/[0.03]" /> });

type Doc = Pick<DocArtefato, "studioKind" | "artifactId" | "titulo" | "data">;

export default function DocumentoArtefato({ doc }: { doc: Doc }) {
  return (
    <div className="relative h-full">
      {/* #638: a faixa da barra de cima do documento (o "Exportar" do diagrama mora DENTRO do iframe) — o cartão do
          tutorial não cobre; invisível e sem pegar clique */}
      <div data-tour="doc-topo" aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-20" />
      <Conteudo doc={doc} />
    </div>
  );
}

function Conteudo({ doc }: { doc: Doc }) {
  if (doc.studioKind === "diagram") {
    return <div className="h-full p-3"><DiagramView artifactId={doc.artifactId} titulo={doc.titulo} cheio /></div>;
  }
  if (doc.studioKind === "caderno") {
    return <CadernoView artifactId={doc.artifactId} data={doc.data} />;
  }
  if (doc.studioKind === "forja") {
    return <ForjaView artifactId={doc.artifactId} data={doc.data} />;
  }
  if (doc.studioKind === "device") {
    return <DevicePanelView artifactId={doc.artifactId} data={doc.data} />;
  }
  if (doc.studioKind === "pdf" && doc.data?.file?.pdfUrl) {
    return <div className="h-full"><LeitorDocumento file={doc.data.file} /></div>;
  }
  if (doc.studioKind === "aula") {
    return (
      <div className="h-full overflow-y-auto custom-scrollbar p-3 sm:p-5 bg-[#070d1a]">
        <div className="mx-auto w-full max-w-[min(100%,calc((100vh-18rem)*16/9))]">
          <AulaView artifactId={doc.artifactId} dados={doc.data} grande />
        </div>
      </div>
    );
  }
  return <div className="p-6 text-[13px] text-slate-500">Documento indisponível.</div>;
}
