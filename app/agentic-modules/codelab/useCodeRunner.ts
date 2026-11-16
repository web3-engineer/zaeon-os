"use client";
/**
 * useCodeRunner — Manages code execution environments
 *
 * Supports:
 *  - JavaScript/TypeScript → sandboxed iframe + postMessage
 *  - Python              → Pyodide (WASM CPython from CDN, singleton)
 *
 * Returns:
 *  { run, output, isRunning, isPyodideReady, clearOutput }
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface RunOutput {
  type:    'stdout' | 'stderr' | 'info' | 'result';
  text:    string;
  ts:      number;
}

export type Language = 'javascript' | 'typescript' | 'python' | 'html' | 'other';

// ─── Pyodide singleton ────────────────────────────────────────────────────────
let pyodidePromise: Promise<any> | null = null;

async function getPyodide(): Promise<any> {
  if (typeof window === 'undefined') return null;
  if (!pyodidePromise) {
    pyodidePromise = new Promise((resolve, reject) => {
      // Load Pyodide script from CDN
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js';
      script.async = true;
      script.onload = async () => {
        try {
          const py = await (window as any).loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.0/full/',
          });
          resolve(py);
        } catch (e) { reject(e); }
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return pyodidePromise;
}

// ─── JS sandbox template ──────────────────────────────────────────────────────
function buildSandboxHTML(code: string, lang: Language): string {
  // TypeScript → strip basic type annotations (simplistic, good enough for sandbox)
  const jsCode = lang === "typescript" ? code
    .replace(/:\s*(string|number|boolean|void|any|null|undefined|never)\b/g, '')
    .replace(/<[A-Z][^>]*>/g, '') // remove generic type params
    .replace(/^(interface|type)\s+\w+[^{]*\{[^}]*\}\s*$/gm, '') : code;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
  const _logs = [];
  const _oLog = console.log.bind(console);
  const _oErr = console.error.bind(console);
  console.log = (...args) => {
    const text = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
    window.parent.postMessage({ type: 'stdout', text }, '*');
    _oLog(...args);
  };
  console.error = (...args) => {
    const text = args.map(a => String(a)).join(' ');
    window.parent.postMessage({ type: 'stderr', text }, '*');
    _oErr(...args);
  };
  window.onerror = (msg, src, line, col, err) => {
    window.parent.postMessage({ type: 'stderr', text: \`\${msg} (line \${line})\` }, '*');
    return true;
  };
  try {
    const __result = new Function(${JSON.stringify(jsCode).replace(/</g, "\\u003c")})();
    if (__result !== undefined) {
      window.parent.postMessage({ type: 'result', text: JSON.stringify(__result, null, 2) }, '*');
    }
    window.parent.postMessage({ type: 'done' }, '*');
  } catch(e) {
    window.parent.postMessage({ type: 'stderr', text: e.message }, '*');
    window.parent.postMessage({ type: 'done' }, '*');
  }
<\/script>
</body>
</html>`;
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useCodeRunner() {
  const [output,         setOutput]         = useState<RunOutput[]>([]);
  const [isRunning,      setIsRunning]      = useState(false);
  const [isPyodideReady, setIsPyodideReady] = useState(false);
  const [pyodideError,   setPyodideError]   = useState<string | null>(null);
  const pyRef   = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // ─── Pre-load Pyodide on mount ────────────────────────────────────────────
  useEffect(() => {
    getPyodide()
      .then(py => { pyRef.current = py; setIsPyodideReady(true); })
      .catch(e  => { setPyodideError(e.message ?? 'Pyodide failed to load'); });
    return () => { iframeRef.current?.remove(); iframeRef.current = null; };
  }, []);

  const clearOutput = useCallback(() => setOutput([]), []);

  const push = useCallback((type: RunOutput['type'], text: string) => {
    setOutput(prev => [...prev, { type, text, ts: Date.now() }]);
  }, []);

  // ─── Run code ─────────────────────────────────────────────────────────────
  // Returns the collected outputs (in addition to pushing them to state) so an
  // autonomous agent loop can read stderr and decide whether to self-correct.
  // `files` (optional) are the other workspace files. For Python they are mounted
  // into Pyodide's virtual FS so a multi-file project (imports/modules) runs for
  // real — not just a single script.
  const run = useCallback(async (
    code: string,
    lang: Language,
    files?: { path: string; content: string }[],
  ): Promise<RunOutput[]> => {
    if (isRunning) return [];
    setIsRunning(true);
    setOutput([]);

    const collected: RunOutput[] = [];
    const emit = (type: RunOutput['type'], text: string) => {
      collected.push({ type, text, ts: Date.now() });
      push(type, text);
    };
    emit('info', `▶ Running ${lang}…`);

    try {
      // ── Python via Pyodide ───────────────────────────────────────────────
      if (lang === 'python') {
        if (!isPyodideReady || !pyRef.current) {
          emit('stderr', pyodideError ?? 'Python runtime not ready yet. Please wait…');
          setIsRunning(false);
          return collected;
        }
        const py = pyRef.current;
        // Mount the other workspace .py files into Pyodide's FS so imports resolve.
        if (files?.length) {
          for (const f of files) {
            if (!f.path.endsWith('.py')) continue;
            const parts = f.path.split('/');
            let cur = '';
            for (let i = 0; i < parts.length - 1; i++) { cur += (cur ? '/' : '') + parts[i]; try { py.FS.mkdir(cur); } catch { /* exists */ } }
            try { py.FS.writeFile(f.path, f.content); } catch { /* ignore */ }
          }
        }
        // Capture stdout via StringIO + ensure cwd is importable.
        py.runPython(`
import sys, io
if '' not in sys.path: sys.path.insert(0, '')
_stdout_buf = io.StringIO()
_stderr_buf = io.StringIO()
sys.stdout = _stdout_buf
sys.stderr = _stderr_buf
        `);
        try {
          py.runPython(code);
          const stdout = py.runPython('_stdout_buf.getvalue()');
          const stderr = py.runPython('_stderr_buf.getvalue()');
          if (stdout) emit('stdout', stdout);
          if (stderr) emit('stderr', stderr);
        } catch (e: any) {
          emit('stderr', String(e));
        } finally {
          py.runPython('sys.stdout = sys.__stdout__; sys.stderr = sys.__stderr__');
        }
        emit('info', '✓ Done');
        setIsRunning(false);
        return collected;
      }

      // ── HTML preview ─────────────────────────────────────────────────────
      if (lang === 'html') {
        emit('info', 'HTML preview opened in panel below ↓');
        setIsRunning(false);
        return collected;
      }

      // ── JS / TS via sandboxed iframe ─────────────────────────────────────
      if (lang === 'javascript' || lang === 'typescript') {
        const html  = buildSandboxHTML(code, lang);
        const blob  = new Blob([html], { type: 'text/html' });
        const url   = URL.createObjectURL(blob);

        // Create / reuse iframe
        let iframe = iframeRef.current;
        if (!iframe) {
          iframe = document.createElement('iframe');
          iframe.sandbox.add('allow-scripts');
          iframe.style.display = 'none';
          document.body.appendChild(iframe);
          iframeRef.current = iframe;
        }

        const cleanup = () => { URL.revokeObjectURL(url); };

        const msgPromise = new Promise<void>(resolve => {
          const handler = (ev: MessageEvent) => {
            if (ev.source !== iframe?.contentWindow) return;
            const { type, text } = ev.data ?? {};
            if (type === 'done') {
              clearTimeout(timeout);
              window.removeEventListener('message', handler);
              cleanup();
              resolve();
            } else if (type && text !== undefined) {
              emit(type as RunOutput['type'], text);
            }
          };
          window.addEventListener('message', handler);
          // Timeout safety
          const timeout = setTimeout(() => {
            window.removeEventListener('message', handler);
            cleanup();
            emit('stderr', 'Execution timed out.');
            resolve();
          }, 8000);
        });

        iframe.src = url;
        await msgPromise;
        emit('info', '✓ Done');
        setIsRunning(false);
        return collected;
      }

      // ── Other languages ───────────────────────────────────────────────────
      emit('info', `🚧 ${lang} execution is not yet supported in-browser.`);
      emit('info', 'Coming soon: Rust, Go, SQL via self-hosted Piston.');
    } catch (e: any) {
      emit('stderr', e.message ?? 'Unknown error');
    } finally {
      setIsRunning(false);
    }
    return collected;
  }, [isRunning, isPyodideReady, pyodideError, push]);

  return { run, output, isRunning, isPyodideReady, pyodideError, clearOutput, iframeRef };
}
