"use client";
import { useCallback, useEffect, useState } from "react";

export interface SavedCitation {
  id: string;            // doi or paper id
  abnt: string;          // formatted ABNT reference (vai pra seção Referências)
  quote?: string;        // citação inline (frase + chamada) — colada onde o cursor está
  title: string;
  authors: string[];
  year?: number;
  venue?: string;
  doi?: string;
  url?: string;
  pdfUrl?: string;
  savedAt: number;
  // ─── estabilidade das citações ───
  used?: boolean;        // já foi colada no trabalho? (＋ vira ✓ no painel)
  incomplete?: boolean;  // rascunho: faltam metadados pra montar a referência
  sourceText?: string;   // trecho cru selecionado (pra recitar ao Aplicar/Completar)
  page?: number;         // página do PDF onde o trecho foi pego
  suggestion?: string;   // recado da Aura sobre recorte cortado
  suggestedText?: string;// recorte sugerido (botão Aplicar recita com ele)
  have?: Record<string, any>; // metadados parciais (pra pré-preencher o modal manual)
}

const KEY = "zaeon.savedCitations";
const EVT = "zaeon:savedCitations";

// Pure: upsert by id, newest first. Exported for tests.
export function upsertCitation(list: SavedCitation[], c: SavedCitation): SavedCitation[] {
  return [c, ...list.filter((x) => x.id !== c.id)];
}

function read(): SavedCitation[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(list: SavedCitation[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useSavedCitations() {
  const [citations, setCitations] = useState<SavedCitation[]>([]);
  useEffect(() => {
    const sync = () => setCitations(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
  }, []);
  const save = useCallback((c: SavedCitation) => { write(upsertCitation(read(), c)); }, []);
  const remove = useCallback((id: string) => { write(read().filter((x) => x.id !== id)); }, []);
  const clear = useCallback(() => { write([]); }, []);
  return { citations, save, remove, clear };
}
