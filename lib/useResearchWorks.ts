"use client";
import { useCallback, useEffect, useState } from "react";

/**
 * Trabalhos da SALA DE PESQUISA (o documento que o usuário escreve: Artigo/Relatório/TCC).
 * Persistência client-side (localStorage), igual ao padrão de citações/biblioteca — sem
 * backend/Prisma. Cada trabalho fica salvo assim que ganha um título; o painel
 * "Minhas coisas" lista esses trabalhos (NÃO as buscas do Scholar da Sala de Estudos).
 */
export interface ResearchWork {
  id: string;
  title: string;
  workType?: string | null; // Artigo | Relatório | TCC
  content?: string;
  updatedAt: number;
}

const KEY = "zaeon.researchWorks";
const EVT = "zaeon:researchWorks";

export function upsertWork(list: ResearchWork[], w: ResearchWork): ResearchWork[] {
  return [w, ...list.filter((x) => x.id !== w.id)].sort((a, b) => b.updatedAt - a.updatedAt);
}

function read(): ResearchWork[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(list: ResearchWork[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useResearchWorks() {
  const [works, setWorks] = useState<ResearchWork[]>([]);
  useEffect(() => {
    const sync = () => setWorks(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
  }, []);
  const save = useCallback((w: ResearchWork) => { write(upsertWork(read(), w)); }, []);
  const remove = useCallback((id: string) => { write(read().filter((x) => x.id !== id)); }, []);
  return { works, save, remove };
}
