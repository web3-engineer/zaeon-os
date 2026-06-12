"use client";
import React from "react";

// Render leve de markdown — **negrito**, *itálico* e quebras de linha. Sem biblioteca.
// Mata os asteriscos literais que o agente cospe e deixa o texto destacado de verdade.
export default function RichText({ text, className }: { text: string; className?: string }) {
  const lines = (text || "").split("\n");
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {renderInline(line)}
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </span>
  );
}

function renderInline(line: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // **negrito** ou *itálico*
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = regex.exec(line)) !== null) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      out.push(<strong key={k++} className="font-bold">{tok.slice(2, -2)}</strong>);
    } else {
      out.push(<em key={k++}>{tok.slice(1, -1)}</em>);
    }
    last = m.index + tok.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}
