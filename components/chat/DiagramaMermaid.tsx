"use client";

/**
 * DiagramaMermaid — o diagrama da skill `diagrama-mermaid` desenhado no chat. Quem desenha é o
 * Mermaid (MIT), carregado sob demanda: a biblioteca é grande e só entra na página de quem recebe
 * um diagrama.
 *
 * Aceita o objeto JSON da skill (`json`) ou o código Mermaid direto (`codigo`, do bloco ```mermaid).
 * Os dois passam por lib/chat/diagrama: só os cinco tipos que a skill ensina, sem diretiva de
 * configuração. O Mermaid roda com `securityLevel: "strict"` — rótulo é texto, clique é desligado —
 * e é dele o SVG que entra na página.
 *
 * Antes de a biblioteca carregar, e se o desenho falhar (sintaxe que o Mermaid recusa), o código do
 * diagrama fica na tela: o aluno nunca recebe um espaço em branco.
 */
import { useEffect, useId, useMemo, useState } from "react";
import { parseDiagrama, validarMermaid, type Diagrama } from "@/lib/chat/diagrama";

type MermaidMod = {
  initialize(cfg: Record<string, unknown>): void;
  render(id: string, codigo: string): Promise<{ svg: string }>;
};

let promessa: Promise<MermaidMod> | null = null;
function carregarMermaid(): Promise<MermaidMod> {
  if (!promessa) {
    promessa = import("mermaid").then((m) => {
      const mermaid = ((m as unknown as { default?: MermaidMod }).default ?? (m as unknown as MermaidMod));
      // strict: rótulos são texto (sem HTML do modelo) e `click` não faz nada
      mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral", suppressErrorRendering: true });
      return mermaid;
    });
    promessa.catch(() => { promessa = null; });   // falhou a rede: a próxima figura tenta de novo
  }
  return promessa;
}

type Lido = { ok: true; diagrama: Diagrama } | { ok: false; erro: string };

function ler(json?: string, codigo?: string): Lido {
  if (json !== undefined) return parseDiagrama(json);
  const v = validarMermaid(codigo ?? "");
  return v.ok ? { ok: true, diagrama: { titulo: "", tipo: v.tipo, mermaid: v.mermaid, leitura: "" } } : v;
}

export default function DiagramaMermaid({ json, codigo }: { json?: string; codigo?: string }) {
  const r = useMemo(() => ler(json, codigo), [json, codigo]);
  const id = `z-diagrama-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [svg, setSvg] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    if (!r.ok) return;
    let vivo = true;
    setSvg(null); setFalhou(false);
    carregarMermaid()
      .then((mermaid) => mermaid.render(id, r.diagrama.mermaid))
      .then(({ svg }) => { if (vivo) setSvg(svg); })
      .catch(() => { if (vivo) setFalhou(true); });
    return () => { vivo = false; };
  }, [r, id]);

  if (!r.ok) {
    return (
      <div data-diagrama-erro className="my-2 rounded-xl border border-amber-300/50 bg-amber-50/60 dark:bg-amber-400/[0.07] px-3 py-2 text-[12px] text-amber-800 dark:text-amber-200">
        Não consegui desenhar este diagrama ({r.erro}).
      </div>
    );
  }

  const d = r.diagrama;
  return (
    <figure data-diagrama={d.tipo} className="my-3 w-full max-w-[680px]">
      {d.titulo && <figcaption className="mb-1 text-[12px] font-semibold text-slate-700 dark:text-white/80">{d.titulo}</figcaption>}
      {svg ? (
        <div
          data-diagrama-svg
          role="img"
          aria-label={d.titulo ? `Diagrama: ${d.titulo}` : "Diagrama"}
          className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white p-3 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <pre data-diagrama-codigo className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 bg-black/[0.04] dark:bg-white/[0.05] p-3 font-mono text-[12px] leading-[1.5] text-slate-700 dark:text-white/75">{d.mermaid}</pre>
      )}
      {falhou && <p className="mt-1 text-[12px] text-amber-800 dark:text-amber-200">Não foi possível desenhar; o código do diagrama está acima.</p>}
      {d.leitura && <p className="mt-1.5 text-[12px] leading-[1.5] text-slate-600 dark:text-white/60">{d.leitura}</p>}
    </figure>
  );
}
