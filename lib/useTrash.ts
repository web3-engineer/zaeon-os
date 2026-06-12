"use client";
import { useCallback, useEffect, useState } from "react";
import type { LibraryFile } from "./useLibraryFiles";

// Lixeira da sala de pesquisa. Mesmo padrão do useLibraryFiles: localStorage + evento de sync.
const KEY = "zaeon.trash";
const EVT = "zaeon:trash";

export interface TrashItem extends LibraryFile {
  deletedAt: number;
}

function read(): TrashItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(list: TrashItem[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useTrash() {
  const [items, setItems] = useState<TrashItem[]>([]);
  useEffect(() => {
    const sync = () => setItems(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
  }, []);

  /** Manda um arquivo pra lixeira (mais novo primeiro, sem duplicar). */
  const trash = useCallback((f: LibraryFile) => {
    write([{ ...f, deletedAt: Date.now() }, ...read().filter((x) => x.id !== f.id)]);
  }, []);

  /** Tira da lixeira e devolve o item (o caller decide salvar de volta na biblioteca). */
  const restore = useCallback((id: string): TrashItem | null => {
    const list = read();
    const item = list.find((x) => x.id === id) || null;
    if (item) write(list.filter((x) => x.id !== id));
    return item;
  }, []);

  /** Apaga de vez (sai da lixeira sem voltar). */
  const purge = useCallback((id: string) => { write(read().filter((x) => x.id !== id)); }, []);
  const clear = useCallback(() => write([]), []);

  return { items, trash, restore, purge, clear };
}
