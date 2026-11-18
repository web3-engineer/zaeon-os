"use client";

/**
 * EditorDoCard — o editor onde o aluno DIGITA o trecho do arquivo. Conectado ao card (um snippet por vez),
 * e NÃO aceita colar: o paste é bloqueado no DOM do editor e o comando Ctrl/Cmd+V é anulado. A harmonia é
 * esta — o aluno reconstrói o arquivo digitando, não colando. Monaco (dynamic import, padrão do OctaIDE).
 */
import { useRef } from "react";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), { ssr: false });

const MONACO_LANG: Record<string, string> = {
  python: "python", javascript: "javascript", typescript: "typescript", html: "html", css: "css", bash: "shell",
};

export default function EditorDoCard({
  value, onChange, linguagem, placeholder, somenteLeitura,
}: {
  value: string;
  onChange: (v: string) => void;
  linguagem: string;
  placeholder?: string;
  somenteLeitura?: boolean;
}) {
  const bloqueado = useRef(false);

  return (
    <div className="ea-ed">
      <MonacoEditor
        height="100%"
        language={MONACO_LANG[linguagem] ?? "plaintext"}
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v ?? "")}
        options={{
          readOnly: !!somenteLeitura,
          minimap: { enabled: false },
          fontSize: 13.5,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          padding: { top: 10, bottom: 10 },
          renderLineHighlight: "none",
          contextmenu: false, // tira o "Paste" do menu de contexto
          fontFamily: "ui-monospace, Menlo, monospace",
        }}
        onMount={(editor, monaco) => {
          // 1) bloqueia o PASTE no DOM (fase de captura), tanto o atalho quanto o menu.
          const dom = editor.getDomNode?.();
          if (dom && !bloqueado.current) {
            dom.addEventListener("paste", (e: ClipboardEvent) => { e.preventDefault(); e.stopPropagation(); }, true);
            dom.addEventListener("drop", (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); }, true);
            bloqueado.current = true;
          }
          // 2) anula o comando de colar do próprio Monaco (Ctrl/Cmd+V).
          try {
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => { /* colar desativado: digite */ });
          } catch { /* ok se a API mudar */ }
        }}
      />
      {placeholder && !value ? <div className="ea-ph">{placeholder}</div> : null}
      <style>{`
        .ea-ed{position:relative;height:100%;width:100%;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.12);background:#0b0f1a}
        .ea-ph{position:absolute;left:52px;top:12px;font-family:ui-monospace,Menlo,monospace;font-size:13px;color:rgba(170,185,230,.35);pointer-events:none}
      `}</style>
    </div>
  );
}
