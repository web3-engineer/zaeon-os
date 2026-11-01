"use client";
import { useCallback, useEffect, useState } from "react";
import { useArmazemDaConta } from "@/lib/chat/contaNoNavegador";
import type { Armazem } from "@/lib/chat/threads";
import type { LibraryFile } from "./useLibraryFiles";

// Lixeira da sala de pesquisa. Mesmo padrão do useLibraryFiles: localStorage + evento de sync.
const KEY = "zaeon.trash";
const EVT = "zaeon:trash";

export interface TrashItem extends LibraryFile {
  deletedAt: number;
}

// #666: a lista é da conta logada; enquanto a sessão carrega (`null`) não há o que mostrar
function read(a: Armazem | null): TrashItem[] {
  if (!a) return [];
  try { return JSON.parse(a.getItem(KEY) || "[]"); } catch { return []; }
}
function write(a: Armazem | null, list: TrashItem[]) {
  if (!a) return;
  a.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

const VAZIA: TrashItem[] = [];

export function useTrash() {
  const a = useArmazemDaConta()?.armazem ?? null;
  // a lista anda junto com a conta dona dela: na troca de conta, nenhum render devolve a lista da anterior
  const [estado, setEstado] = useState<{ a: Armazem | null; lista: TrashItem[] }>({ a, lista: VAZIA });
  const items = estado.a === a ? estado.lista : VAZIA;
  useEffect(() => {
    const sync = () => setEstado({ a, lista: read(a) });
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
  }, [a]);

  /** Manda um arquivo pra lixeira (mais novo primeiro, sem duplicar). */
  const trash = useCallback((f: LibraryFile) => {
    write(a, [{ ...f, deletedAt: Date.now() }, ...read(a).filter((x) => x.id !== f.id)]);
  }, [a]);

  /** Tira da lixeira e devolve o item (o caller decide salvar de volta na biblioteca). */
  const restore = useCallback((id: string): TrashItem | null => {
    const list = read(a);
    const item = list.find((x) => x.id === id) || null;
    if (item) write(a, list.filter((x) => x.id !== id));
    return item;
  }, [a]);

  /** Apaga de vez (sai da lixeira sem voltar). */
  const purge = useCallback((id: string) => { write(a, read(a).filter((x) => x.id !== id)); }, [a]);
  const clear = useCallback(() => write(a, []), [a]);

  return { items, trash, restore, purge, clear };
}
