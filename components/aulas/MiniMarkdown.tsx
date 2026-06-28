/**
 * Renderizador de markdown MÍNIMO para o corpo das aulas — sem dependência nova.
 * Suporta: titulos (#/##/###), negrito, italico, codigo inline, listas (marcadores
 * e numeradas), citacoes, regras horizontais e paragrafos. Suficiente pro conteudo das aulas.
 */
import React from "react";

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  // **bold**, *italic*, `code` — varredura simples por tokens.
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={`${keyBase}-b${i}`}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={`${keyBase}-c${i}`} className="px-1 py-0.5 rounded bg-white/10 text-[0.9em] font-mono">{tok.slice(1, -1)}</code>);
    else out.push(<em key={`${keyBase}-i${i}`}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
    i++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function MiniMarkdown({ source, className = "" }: { source: string; className?: string }) {
  const lines = (source || "").replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let para: string[] = [];

  const flushPara = () => {
    if (!para.length) return;
    const text = para.join(" ");
    blocks.push(<p key={`p${blocks.length}`} className="leading-relaxed mb-3 text-white/85">{renderInline(text, `p${blocks.length}`)}</p>);
    para = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { flushPara(); i++; continue; }

    const h = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (h) {
      flushPara();
      const lvl = h[1].length;
      const cls = lvl === 1 ? "text-xl font-black mt-4 mb-2" : lvl === 2 ? "text-lg font-bold mt-4 mb-2" : "text-base font-bold mt-3 mb-1.5";
      blocks.push(<div key={`h${blocks.length}`} className={`${cls} text-white`}>{renderInline(h[2], `h${blocks.length}`)}</div>);
      i++; continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmed)) { flushPara(); blocks.push(<hr key={`hr${blocks.length}`} className="my-4 border-white/10" />); i++; continue; }

    if (/^>\s?/.test(trimmed)) {
      flushPara();
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) { quote.push(lines[i].trim().replace(/^>\s?/, "")); i++; }
      blocks.push(<blockquote key={`q${blocks.length}`} className="border-l-2 border-white/25 pl-3 my-3 text-white/70 italic">{renderInline(quote.join(" "), `q${blocks.length}`)}</blockquote>);
      continue;
    }

    if (/^([-*]|\d+\.)\s+/.test(trimmed)) {
      flushPara();
      const ordered = /^\d+\.\s+/.test(trimmed);
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^([-*]|\d+\.)\s+/.test(lines[i].trim())) {
        const it = lines[i].trim().replace(/^([-*]|\d+\.)\s+/, "");
        items.push(<li key={`li${items.length}`} className="mb-1">{renderInline(it, `li${blocks.length}-${items.length}`)}</li>);
        i++;
      }
      blocks.push(
        ordered
          ? <ol key={`ol${blocks.length}`} className="list-decimal pl-5 mb-3 text-white/85">{items}</ol>
          : <ul key={`ul${blocks.length}`} className="list-disc pl-5 mb-3 text-white/85">{items}</ul>
      );
      continue;
    }

    para.push(trimmed);
    i++;
  }
  flushPara();

  return <div className={`text-[13.5px] ${className}`}>{blocks}</div>;
}
