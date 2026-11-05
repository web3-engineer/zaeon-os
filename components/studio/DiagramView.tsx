"use client";

/**
 * DiagramView — o diagrama interativo (archify) dentro da resposta.
 *
 * O HTML é standalone e tem JS próprio (zoom, "seguir um caminho", lente, exportar PNG/SVG),
 * então mora num iframe SANDBOX (`allow-scripts` sem `allow-same-origin`: origem opaca, sem
 * acesso a cookie nem API do site). O HTML entra por `srcdoc` (buscado com a sessão do aluno)
 * e não por `src`: há navegadores/webviews que simplesmente não carregam iframe sandbox com URL
 * — o painel do app desktop é um deles. O /file ainda manda CSP `sandbox` pra quem abrir o link.
 * "Abrir numa aba" usa o mesmo arquivo; o botão do bloco baixa o .html (abre offline).
 */
import { useEffect, useState } from "react";
import { Maximize2, Minimize2, ExternalLink, RotateCw } from "lucide-react";

/**
 * #713: no celular, o archify deixa o diagrama largo com no mínimo 720 px e rolagem para o lado (ficava cortado), e a
 * barra de baixo (caminho, lente, busca, zoom) rolava escondida. Aqui ele cabe na largura e a barra vai para baixo dele,
 * inteira (testado no diagrama real em 375 px: o zoom continua funcionando).
 */
export const CSS_CELULAR = `<style data-zaeon-celular>@media (max-width:720px){
.diagram-container[data-wide-diagram="true"]{overflow-x:hidden!important;padding-bottom:.75rem!important}
.diagram-container[data-wide-diagram="true"]>svg{min-width:0!important;width:100%!important;height:auto!important}
.diagram-container[data-wide-diagram="true"] .overview-map,.diagram-container[data-wide-diagram="true"] .focus-chip,.diagram-container[data-wide-diagram="true"] .route-probe,.diagram-container[data-wide-diagram="true"] .semantic-lens,.diagram-container[data-wide-diagram="true"] .diagram-guide,.diagram-container[data-wide-diagram="true"] .node-finder{transform:none!important}
.diagram-container .diagram-nav{position:static!important;transform:none!important;translate:none!important;display:flex!important;flex-wrap:wrap;justify-content:center;width:max-content;max-width:100%!important;margin:.75rem auto 0;overflow:visible!important}
}</style>`;
export const comCssCelular = (html: string) => (/<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${CSS_CELULAR}</head>`) : CSS_CELULAR + html);

export default function DiagramView({ artifactId, titulo, cheio = false }: { artifactId: string; titulo?: string; /** ocupa a aba inteira (documento) */ cheio?: boolean }) {
  const [alto, setAlto] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [erro, setErro] = useState(false);
  // #640: "Tentar de novo" sem fechar e abrir o documento
  const [tentativa, setTentativa] = useState(0);
  const url = `/api/studio/${artifactId}/file`;

  useEffect(() => {
    let vivo = true;
    setHtml(null);
    setErro(false);
    fetch(url, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((t) => { if (vivo) setHtml(t); })
      .catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, [url, tentativa]);

  const altura = cheio ? "h-full" : alto ? "h-[78vh]" : "h-[440px]";
  if (erro) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 px-1 py-3 text-[12px] text-slate-500 dark:text-white/50 ${cheio ? "h-full" : ""}`}>
        <span>Não consegui abrir o diagrama agora.</span>
        <button
          type="button"
          onClick={() => setTentativa((n) => n + 1)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:border-cyan-400/60 dark:border-white/15 dark:text-white/80"
        >
          <RotateCw size={12} /> Tentar de novo
        </button>
      </div>
    );
  }
  if (html === null) {
    return <div className={`w-full ${altura} rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.04] animate-pulse`} aria-label="Carregando o diagrama" />;
  }
  return (
    <div className={`relative ${cheio ? "h-full" : ""}`}>
      <iframe
        srcDoc={comCssCelular(html)}
        title={titulo ? `Diagrama: ${titulo}` : "Diagrama interativo"}
        sandbox="allow-scripts allow-downloads allow-popups"
        referrerPolicy="no-referrer"
        className={`w-full rounded-xl border border-slate-200 dark:border-white/10 bg-[#020617] transition-[height] ${altura}`}
      />
      {/* #640: na aba inteira o título do diagrama mora no canto de cima à esquerda — os botões vão pro de baixo */}
      <div className={`absolute ${cheio ? "bottom-2 left-2" : "top-2 left-2"} flex gap-1`}>
        {!cheio && <button
          type="button"
          onClick={() => setAlto((v) => !v)}
          aria-label={alto ? "Diminuir o diagrama" : "Aumentar o diagrama"}
          title={alto ? "Diminuir" : "Aumentar"}
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-black/55 text-white/80 hover:text-white hover:bg-black/75"
        >
          {alto ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir o diagrama numa aba"
          title="Abrir em tela cheia"
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-black/55 text-white/80 hover:text-white hover:bg-black/75"
        >
          <ExternalLink size={13} />
        </a>
      </div>
    </div>
  );
}
