"use client";
import { useCallback, useEffect, useState } from "react";

// Pastas da biblioteca (aba "pesquisa" → Minhas coisas / Documentos). Mesmo padrão do
// useLibraryFiles: localStorage + evento de sync. A associação arquivo→pasta vive no
// próprio LibraryFile (campo folderId), não aqui.
export interface LibraryFolder {
  id: string;
  name: string;
  createdAt: number;
}

const KEY = "zaeon.libraryFolders";
const EVT = "zaeon:libraryFolders";

function newId(): string {
  try {
    const c = (globalThis as any).crypto;
    if (c?.randomUUID) return "fold-" + c.randomUUID();
  } catch { /* */ }
  return "fold-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Pure: cria uma pasta (ignora nome vazio), mais nova primeiro. Exported for tests.
export function addFolder(list: LibraryFolder[], name: string): LibraryFolder[] {
  const n = name.trim();
  if (!n) return list;
  return [{ id: newId(), name: n, createdAt: Date.now() }, ...list];
}

// Pure: renomeia (ignora vazio). Exported for tests.
export function renameFolder(list: LibraryFolder[], id: string, name: string): LibraryFolder[] {
  const n = name.trim();
  if (!n) return list;
  return list.map((f) => (f.id === id ? { ...f, name: n } : f));
}

function read(): LibraryFolder[] {
  if (typeof window === "undefined") return [];
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) ? list.filter((f) => f && typeof f.id === "string" && typeof f.name === "string") : [];
  } catch { return []; }
}
function write(list: LibraryFolder[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useFolders() {
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  useEffect(() => {
    const sync = () => setFolders(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
  }, []);
  // Cria e devolve a pasta criada (pra abrir/usar na hora). null se nome vazio.
  const create = useCallback((name: string): LibraryFolder | null => {
    if (!name.trim()) return null;
    const next = addFolder(read(), name);
    write(next);
    return next[0] ?? null;
  }, []);
  const rename = useCallback((id: string, name: string) => { write(renameFolder(read(), id, name)); }, []);
  const remove = useCallback((id: string) => { write(read().filter((f) => f.id !== id)); }, []);
  return { folders, create, rename, remove };
}
