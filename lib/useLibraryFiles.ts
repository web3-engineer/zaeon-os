"use client";
import { useCallback, useEffect, useState } from "react";

// Arquivos salvos na biblioteca (aba "pesquisa"). Só arquivos (pdfUrl).
// Espelha o padrão do useSavedCitations: localStorage + evento de sync.
export interface LibraryFile {
  id: string;            // doi or paper id
  title: string;
  pdfUrl: string;        // o arquivo em si (só salvamos quando há pdfUrl)
  source?: string;       // fonte/base (ex.: "arXiv", "OpenAlex")
  venue?: string;
  doi?: string;
  url?: string;
  authors?: string[];
  year?: number;
  savedAt: number;
}

const KEY = "zaeon.libraryFiles";
const EVT = "zaeon:libraryFiles";

// Pure: upsert by id, newest first. Exported for tests.
export function upsertLibraryFile(list: LibraryFile[], f: LibraryFile): LibraryFile[] {
  return [f, ...list.filter((x) => x.id !== f.id)];
}

function read(): LibraryFile[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(list: LibraryFile[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useLibraryFiles() {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  useEffect(() => {
    const sync = () => setFiles(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
  }, []);
  const save = useCallback((f: LibraryFile) => { write(upsertLibraryFile(read(), f)); }, []);
  const remove = useCallback((id: string) => { write(read().filter((x) => x.id !== id)); }, []);
  const clear = useCallback(() => { write([]); }, []);
  return { files, save, remove, clear };
}
