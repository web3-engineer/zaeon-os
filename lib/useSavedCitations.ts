"use client";
import { useCallback, useEffect, useState } from "react";
import { useArmazemDaConta } from "@/lib/chat/contaNoNavegador";
import type { Armazem } from "@/lib/chat/threads";

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

// #666: a lista é da conta logada; enquanto a sessão carrega (`null`) não há o que mostrar
function read(a: Armazem | null): SavedCitation[] {
  if (!a) return [];
  try { return JSON.parse(a.getItem(KEY) || "[]"); } catch { return []; }
}
function write(a: Armazem | null, list: SavedCitation[]) {
  if (!a) return;
  a.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useSavedCitations() {
  const a = useArmazemDaConta()?.armazem ?? null;
  const [citations, setCitations] = useState<SavedCitation[]>([]);
  useEffect(() => {
    const sync = () => setCitations(read(a));
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
  }, [a]);
  const save = useCallback((c: SavedCitation) => { write(a, upsertCitation(read(a), c)); }, [a]);
  const remove = useCallback((id: string) => { write(a, read(a).filter((x) => x.id !== id)); }, [a]);
  const clear = useCallback(() => { write(a, []); }, [a]);
  return { citations, save, remove, clear };
}
