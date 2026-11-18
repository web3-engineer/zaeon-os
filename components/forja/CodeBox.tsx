"use client";

/**
 * CodeBox — a caixa de código das lições da Forja onde a cola é BLOQUEADA: o aluno DIGITA, de verdade
 * (a "boa e velha digitação" que o dono pediu). Colar, arrastar e o atalho do meio do mouse são barrados;
 * cada tentativa vira um sinal `colou` pro guia (a Zaeon examinadora cutuca), e cada tecla vira `digitou`.
 * Quando o conteúdo bate no alvo (se houver), emite o objetivo `alcancou`.
 */
import { useRef, useState } from "react";
import type { Sinal } from "@/lib/guia/tipos";

export default function CodeBox({
  aoSinal,
  alvo,
  objetivoId = "codebox",
  placeholder = "digite aqui — colar está desligado nesta lição",
  linhas = 6,
}: {
  aoSinal?: (s: Sinal) => void;
  /** se definido, ao digitar exatamente isto emite o objetivo alcançado. */
  alvo?: string;
  objetivoId?: string;
  placeholder?: string;
  linhas?: number;
}) {
  const [texto, setTexto] = useState("");
  const [avisoCola, setAvisoCola] = useState(false);
  const alcancado = useRef(false);

  const barrarCola = (e: React.ClipboardEvent | React.DragEvent) => {
    e.preventDefault();
    setAvisoCola(true);
    aoSinal?.({ tipo: "atividade", fonte: "colou", em: Date.now() });
    setTimeout(() => setAvisoCola(false), 1600);
  };

  const aoDigitar = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setTexto(v);
    aoSinal?.({ tipo: "atividade", fonte: "digitou", em: Date.now() });
    if (alvo && !alcancado.current && v.trim() === alvo.trim()) {
      alcancado.current = true;
      aoSinal?.({ tipo: "objetivo", estado: "alcancou", id: objetivoId, em: Date.now() });
    }
  };

  return (
    <div className="mt-2">
      <div className="relative">
        <textarea
          value={texto}
          onChange={aoDigitar}
          onPaste={barrarCola}
          onDrop={barrarCola}
          onDragOver={(e) => e.preventDefault()}
          rows={linhas}
          spellCheck={false}
          placeholder={placeholder}
          aria-label="caixa de código (colar desligado)"
          className="w-full resize-y rounded-xl border border-slate-300 bg-slate-950/90 p-3 font-mono text-[13px] leading-relaxed text-emerald-200 outline-none focus:border-cyan-400 dark:border-white/10"
          style={{ tabSize: 2 }}
        />
        <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-amber-500/15 px-2 py-[2px] text-[10px] text-amber-300">⌨️ sem colar</span>
      </div>
      {avisoCola && (
        <div className="mt-1 text-[12px] text-amber-600 dark:text-amber-300" role="status">
          Colar está desligado — digita você mesmo, é assim que fixa 😄
        </div>
      )}
    </div>
  );
}
