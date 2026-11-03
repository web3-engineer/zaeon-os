"use client";
/**
 * useBlueprint — os dados da Sala de Estudos como BLUEPRINT (lib/blueprint): a lista pro seletor do topo e o blueprint
 * aberto. A Zaeon recompõe no servidor a cada turno do chat, então relemos ao voltar pra aba e a cada 20 s com a página
 * visível (o chat e a sala são abas da mesma tela). Arrastar e "reorganizar" são otimistas (PATCH em seguida).
 * #631: trocar de blueprint era lento e "mudo" — agora o clique MARCA na hora (`selecionado`, com `carregando` até a
 * prancha chegar), o que já foi aberto fica GUARDADO (voltar nele é instantâneo; a leitura do servidor atualiza por
 * trás) e uma leitura que não mudou nada (mesmo `rev`) não troca o objeto — a prancha não se redesenha à toa a cada 20 s.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { BlueprintView, ResumoBlueprint } from "@/lib/blueprint/server";
import type { Avaliacao, DocBlueprint } from "@/lib/blueprint/tipos";
import { comecarTroca, servidorRespondeu } from "./cronometro";

export type BlueprintCliente = Omit<BlueprintView, "updatedAt"> & { updatedAt: string };

/** a leitura nova muda alguma coisa? (mesmo blueprint, mesmo `rev` e mesmo papel = nada pra redesenhar) */
export const mudouBlueprint = (a: BlueprintCliente | null, b: BlueprintCliente) =>
  !a || a.id !== b.id || a.rev !== b.rev || a.updatedAt !== b.updatedAt || a.papel !== b.papel;
const RELER_MS = 20_000;

async function json<T>(url: string, init?: RequestInit): Promise<T | null> {
  try { const r = await fetch(url, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } }); return r.ok ? ((await r.json()) as T) : null; } catch { return null; }
}

export function useBlueprint(inicialId?: string | null) {
  const [lista, setLista] = useState<ResumoBlueprint[] | null>(null);
  const [atual, setAtualCru] = useState<BlueprintCliente | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(inicialId ?? null);
  // os blueprints já abertos nesta visita (voltar num deles não espera o servidor)
  const guardados = useRef(new Map<string, BlueprintCliente>());
  const idAnterior = useRef<string | null>(null);   // só TROCAS entram no cronômetro (a recarga de 20 s não)
  // #631 (revisão): o blueprint que está NA TELA — as edições vão pra ele, não pro recém-clicado que ainda carrega
  const idNaTela = useRef<string | null>(null);
  // toda escrita no `atual` passa por aqui: guarda e só troca o objeto se mudou alguma coisa
  const setAtual = useCallback((v: BlueprintCliente | null | ((a: BlueprintCliente | null) => BlueprintCliente | null)) => {
    setAtualCru((a) => {
      const n = typeof v === "function" ? v(a) : v;
      if (n) guardados.current.set(n.id, n);
      idNaTela.current = n?.id ?? null;
      return n && !mudouBlueprint(a, n) && a ? a : n;
    });
  }, []);
  const [recompondo, setRecompondo] = useState(false);
  // #681: a lista não carregou (antes isso aparecia como "nenhum blueprint ainda")
  const [erro, setErro] = useState(false);
  const idAtual = useRef<string | null>(inicialId ?? null);
  // #681: excluídos nesta visita — uma leitura da lista que saiu antes da exclusão não os traz de volta
  const excluidos = useRef(new Set<string>());
  const ocupado = useRef<Record<string, number>>({});   // escritas em voo POR blueprint: não sobrescreve o otimista com uma leitura velha
  const emVoo = (id: string) => (ocupado.current[id] ?? 0) > 0;
  const voo = (id: string, d: number) => { ocupado.current[id] = (ocupado.current[id] ?? 0) + d; };

  const abrir = useCallback(async (id: string) => {
    idAtual.current = id;
    setSelecionado(id);   // #631: marca no clique
    const guardado = guardados.current.get(id);
    if (id !== idAnterior.current) comecarTroca(id, !!guardado);   // #631: o cronômetro (desligado por padrão)
    idAnterior.current = id;
    if (guardado && !emVoo(id)) setAtual(guardado);   // já visto: aparece na hora; o servidor confere por trás
    const r = await json<{ blueprint: BlueprintCliente }>(`/api/blueprint/${id}`);
    servidorRespondeu(id);
    if (r?.blueprint && idAtual.current === id && !emVoo(id)) setAtual(r.blueprint);
  }, [setAtual]);

  const recarregar = useCallback(async () => {
    const r = await json<{ blueprints: ResumoBlueprint[] }>("/api/blueprint");
    if (!r) { setErro(true); return; }
    setErro(false);
    const vivos = r.blueprints.filter((b) => !excluidos.current.has(b.id));
    setLista(vivos);
    const alvo = idAtual.current && vivos.some((b) => b.id === idAtual.current) ? idAtual.current : vivos[0]?.id;
    if (alvo) await abrir(alvo); else setAtual(null);
  }, [abrir]);

  useEffect(() => {
    void recarregar();
    const t = setInterval(() => { if (document.visibilityState === "visible") void recarregar(); }, RELER_MS);
    const vis = () => { if (document.visibilityState === "visible") void recarregar(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, [recarregar]);

  const patch = useCallback(async (corpo: unknown, otimista: (d: DocBlueprint) => DocBlueprint) => {
    // #631 (revisão): a prancha na tela é a que gerou a edição — com outro blueprint carregando, gravar no
    // `idAtual` mudava o blueprint ERRADO; e, se a seleção já é outra, a edição não vale
    const id = idNaTela.current; if (!id || id !== idAtual.current) return;
    setAtual((a) => (a && a.id === id ? { ...a, doc: otimista(a.doc) } : a));
    voo(id, 1);
    const r = await json<{ blueprint: BlueprintCliente }>(`/api/blueprint/${id}`, { method: "PATCH", body: JSON.stringify(corpo) });
    voo(id, -1);
    // com outra escrita ainda em voo, a resposta desta é velha pra ela: mantém o otimista
    if (r?.blueprint && idAtual.current === id && !emVoo(id)) setAtual(r.blueprint);
    return !!r?.blueprint;
  }, []);

  const fixar = useCallback((modulo: string, x: number, y: number) =>
    patch({ fixos: { set: { [modulo]: { x: Math.round(x), y: Math.round(y) } } } }, (d) => ({ ...d, fixos: { ...d.fixos, [modulo]: { x: Math.round(x), y: Math.round(y) } } })), [patch]);
  const reorganizar = useCallback(() => patch({ reorganizar: true }, (d) => ({ ...d, fixos: {} })), [patch]);

  const recompor = useCallback(async () => {
    const a = atual; if (!a || recompondo) return;
    setRecompondo(true);
    const r = await json<{ blueprint: BlueprintCliente | null }>(`/api/blueprint/${a.id}/recompor`, { method: "POST" });
    setRecompondo(false);
    if (r?.blueprint && idAtual.current === a.id) setAtual(r.blueprint);
  }, [atual, recompondo]);

  /** a PROVA de um crítico: o servidor confere; a última da fase dispara a avaliação da Zaeon. Devolve o motivo da recusa.
   *  Sem crítico (null) = "pedir a avaliação de novo" (a anterior falhou) */
  const enviarProva = useCallback(async (criticoId: string | null, url: string): Promise<{ ok: boolean; motivo?: string; avaliacao?: Avaliacao | null }> => {
    const a = atual; if (!a) return { ok: false };
    voo(a.id, 1);
    const corpo = criticoId ? { criticoId, url } : { reavaliar: true };
    const r = await json<{ ok: boolean; motivo?: string; blueprint: BlueprintCliente | null; avaliacao: Avaliacao | null }>(`/api/blueprint/${a.id}/prova`, { method: "POST", body: JSON.stringify(corpo) });
    voo(a.id, -1);
    if (!r) return { ok: false, motivo: "não deu pra enviar agora — tente de novo" };
    if (r.blueprint && idAtual.current === a.id) setAtual(r.blueprint);
    if (r.ok) void recarregar();
    return { ok: r.ok, motivo: r.motivo, avaliacao: r.avaliacao };
  }, [atual, recarregar]);

  /** #681: só o dono. Some da lista e a Sala abre o próximo (ou fica vazia). Devolve se deu certo */
  const excluir = useCallback(async (id: string): Promise<boolean> => {
    const r = await json<{ ok: boolean }>(`/api/blueprint/${id}`, { method: "DELETE" });
    if (!r?.ok) return false;
    guardados.current.delete(id);
    excluidos.current.add(id);
    const resto = (lista ?? []).filter((b) => b.id !== id);
    setLista(resto);
    if (idAtual.current === id) {
      const proximo = resto[0]?.id ?? null;
      idAtual.current = proximo; setSelecionado(proximo);
      if (proximo) void abrir(proximo); else setAtual(null);
    }
    return true;
  }, [lista, abrir, setAtual]);

  /** #681: o nome dado pela pessoa (a Zaeon não troca mais). Falhou: o nome de antes volta. Devolve se gravou */
  const renomear = useCallback(async (titulo: string): Promise<boolean> => {
    const limpo = titulo.trim().slice(0, 200), id = idNaTela.current;
    if (!limpo || !id) return false;
    const antes = atual?.id === id ? atual.doc : null;
    setLista((l) => l?.map((b) => (b.id === id ? { ...b, titulo: limpo } : b)) ?? l);
    const ok = await patch({ titulo: limpo }, (d) => ({ ...d, titulo: limpo, tituloFixo: true }));
    if (!ok && antes) {
      setLista((l) => l?.map((b) => (b.id === id ? { ...b, titulo: antes.titulo } : b)) ?? l);
      setAtual((a) => (a && a.id === id ? { ...a, doc: { ...a.doc, titulo: antes.titulo, tituloFixo: antes.tituloFixo } } : a));
    }
    return !!ok;
  }, [patch, atual, setAtual]);

  // #631: clicou e a prancha ainda é a de antes (o servidor não respondeu)
  const carregando = !!selecionado && atual?.id !== selecionado;
  return { lista, atual, selecionado, carregando, erro, abrir, recarregar, fixar, reorganizar, recompor, recompondo, enviarProva, excluir, renomear, setAtual };
}
