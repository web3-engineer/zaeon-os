"use client";

import React from "react";
import Formula from "@/components/chat/Formula";
import GraficoFuncao from "@/components/chat/GraficoFuncao";
import GraficoDados from "@/components/chat/GraficoDados";
import { ehGraficoDeDados } from "@/lib/chat/graficoDados";
import BlocoCodigo from "@/components/chat/BlocoCodigo";
import { segmentarBlocos, segmentarInline } from "@/lib/chat/matematica";

/**
 * Formatador leve de markdown pro chat da Aura — sem lib, seguro em streaming.
 *
 * O bug que resolve: o texto vinha sendo renderizado CRU (`whitespace-pre-wrap`),
 * então `**negrito**`, `***x***` e `### título` apareciam com os asteriscos/hashes
 * literais na tela. Aqui a gente formata inline (negrito/itálico/código) e por
 * linha (títulos e bullets), e — importante pra streaming — pares não fechados
 * (`**` ainda sem o fecho) são deixados como texto até fecharem, sem "piscar".
 *
 * Matemática (lib/chat/matematica): $…$ / \(…\) inline e $…$ / \[…\] em destaque viram KaTeX;
 * um bloco ```grafico {json} vira gráfico de função (SVG). Links [rótulo](https://…) viram link
 * (só http/https, nova aba). A matemática é separada ANTES do markdown: o `*` de "a*b" não vira itálico.
 * Bloco de código (```lang … ```, #634) também sai antes: vira a caixa do BlocoCodigo, com o de dentro cru.
 */

// ── inline: fórmula ($…$) primeiro; no resto, ***x*** / **x** / *x* / `code` / [link](https://…) ──
function inline(s: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  segmentarInline(s).forEach((p, i) => {
    if (p.tipo === "formula") out.push(<Formula key={`f${i}`} latex={p.conteudo} />);
    else out.push(<React.Fragment key={`t${i}`}>{inlineMarkdown(p.conteudo)}</React.Fragment>);
  });
  return out;
}

function inlineMarkdown(s: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    if (m[2] !== undefined) {
      out.push(<strong key={k++} className="font-semibold"><em>{m[2]}</em></strong>);
    } else if (m[3] !== undefined) {
      out.push(<strong key={k++} className="font-semibold text-slate-900 dark:text-white">{m[3]}</strong>);
    } else if (m[4] !== undefined) {
      out.push(<em key={k++}>{m[4]}</em>);
    } else if (m[5] !== undefined) {
      out.push(<code key={k++} className="rounded border border-black/10 dark:border-white/10 bg-black/[0.06] dark:bg-white/10 px-1.5 py-0.5 text-[0.9em] font-mono text-cyan-800 dark:text-cyan-200">{m[5]}</code>);
    } else if (m[6] !== undefined) {
      out.push(<a key={k++} href={m[7]} target="_blank" rel="noopener noreferrer" className="font-medium text-cyan-700 dark:text-cyan-300 underline underline-offset-2 hover:opacity-80">{m[6]}</a>);
    }
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

export default function ChatMarkdown({ text }: { text: string }) {
  // blocos de display/gráfico primeiro (podem ocupar várias linhas); o resto é markdown de linha
  const pedacos = segmentarBlocos(text);
  if (pedacos.length === 1 && pedacos[0].tipo === "texto") return <MarkdownDeLinhas text={text} />;
  return (
    <div className="[&_p]:leading-[1.65]">
      {pedacos.map((b, i) =>
        b.tipo === "formula" ? <Formula key={i} latex={b.conteudo} display />
        : b.tipo === "grafico" ? (ehGraficoDeDados(b.conteudo) ? <GraficoDados key={i} json={b.conteudo} /> : <GraficoFuncao key={i} json={b.conteudo} />)
        : b.tipo === "codigo" ? <BlocoCodigo key={i} codigo={b.conteudo} lang={b.lang} />
        : <MarkdownDeLinhas key={i} text={b.conteudo.replace(/^\n|\n$/g, "")} />,
      )}
    </div>
  );
}

function MarkdownDeLinhas({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = text.split("\n");
  let bullets: React.ReactNode[] | null = null;

  const flush = () => {
    if (bullets && bullets.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="my-1.5 ml-4 list-disc space-y-1">
          {bullets}
        </ul>,
      );
    }
    bullets = null;
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    const b = /^\s*[-•*]\s+(.*)$/.exec(line);

    if (h) {
      flush();
      const lvl = h[1].length;
      const cls = lvl === 1 ? "text-[1.15em] font-semibold mt-3 mb-1"
        : lvl === 2 ? "text-[1.08em] font-semibold mt-2.5 mb-1"
        : "text-[1em] font-semibold mt-2 mb-0.5";
      blocks.push(<div key={`h-${i}`} className={`${cls} text-slate-900 dark:text-white`}>{inline(h[2])}</div>);
    } else if (b) {
      if (!bullets) bullets = [];
      bullets.push(<li key={`li-${i}`}>{inline(b[1])}</li>);
    } else if (line.trim() === "") {
      flush();
      blocks.push(<div key={`sp-${i}`} className="h-2" />);
    } else {
      flush();
      blocks.push(<p key={`p-${i}`} className="my-0">{inline(line)}</p>);
    }
  });
  flush();

  return <div className="[&_p]:leading-[1.65]">{blocks}</div>;
}
