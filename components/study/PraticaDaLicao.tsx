"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCodeRunner } from "@/app/agentic-modules/codelab/useCodeRunner";
import EditorDoCard from "./EditorDoCard";
import type { SandboxCurado } from "@/lib/forja/licaoCurada";

export default function PraticaDaLicao({ sandbox, titulo }: { sandbox: SandboxCurado; titulo: string }) {
  const { t } = useTranslation();
  const [codigo, setCodigo] = useState(sandbox.inicial);
  const [preview, setPreview] = useState<string | null>(null);
  const { run, output, isRunning, isPyodideReady, pyodideError } = useCodeRunner();
  const linguagem = sandbox.linguagem.toLowerCase();
  const suporta = linguagem === "python" || linguagem === "javascript" || linguagem === "html";
  const executar = () => {
    if (linguagem === "html") setPreview(codigo);
    if (linguagem === "python" || linguagem === "javascript") void run(`${codigo}\n\n${sandbox.teste}`, linguagem);
  };

  return (
    <section className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div>
        <h2 className="text-lg font-bold">{titulo}</h2>
        <p className="text-sm text-slate-300">{sandbox.linguagem}</p>
        {sandbox.teste && <pre className="mt-4 whitespace-pre-wrap text-xs text-slate-300">{sandbox.teste}</pre>}
      </div>
      <div className="min-w-0">
        <div className="h-[40vh] min-h-56">
          <EditorDoCard value={codigo} onChange={setCodigo} linguagem={linguagem} />
        </div>
        <button type="button" onClick={executar} disabled={!suporta || isRunning || (linguagem === "python" && !isPyodideReady)}
          className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 font-bold text-slate-950 disabled:opacity-50">
          {isRunning ? t("forja.card.rodando") : linguagem === "python" && !isPyodideReady ? t("forja.card.carregandoPython") : t("forja.card.rodarTestes")}
        </button>
        {!suporta && <p className="mt-2 text-sm">{t("forja.card.runtimeIndisponivel")}</p>}
        {linguagem === "python" && pyodideError && <p role="alert">{t("forja.card.pythonErro")} {pyodideError}</p>}
        <pre aria-live="polite" className="mt-3 whitespace-pre-wrap break-words text-sm">{output.map((linha) => linha.text).join("\n")}</pre>
        {preview !== null && <iframe title={titulo} sandbox="allow-scripts" srcDoc={preview} className="mt-3 h-60 w-full bg-white" />}
      </div>
    </section>
  );
}
