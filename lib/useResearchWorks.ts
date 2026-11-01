"use client";
import { useCallback, useEffect, useState } from "react";
import { useArmazemDaConta } from "@/lib/chat/contaNoNavegador";
import type { Armazem } from "@/lib/chat/threads";

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

// #666: a lista é da conta logada; enquanto a sessão carrega (`null`) não há o que mostrar
function read(a: Armazem | null): ResearchWork[] {
  if (!a) return [];
  try { return JSON.parse(a.getItem(KEY) || "[]"); } catch { return []; }
}
function write(a: Armazem | null, list: ResearchWork[]) {
  if (!a) return;
  a.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

const VAZIA: ResearchWork[] = [];

export function useResearchWorks() {
  const a = useArmazemDaConta()?.armazem ?? null;
  // a lista anda junto com a conta dona dela: na troca de conta, nenhum render devolve a lista da anterior
  const [estado, setEstado] = useState<{ a: Armazem | null; lista: ResearchWork[] }>({ a, lista: VAZIA });
  const works = estado.a === a ? estado.lista : VAZIA;
  useEffect(() => {
    const sync = () => setEstado({ a, lista: read(a) });
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
  }, [a]);
  const save = useCallback((w: ResearchWork) => { write(a, upsertWork(read(a), w)); }, [a]);
  const remove = useCallback((id: string) => { write(a, read(a).filter((x) => x.id !== id)); }, [a]);
  return { works, save, remove };
}
