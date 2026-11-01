/**
 * #663: as conversas guardadas no navegador são de UMA conta. Antes as chaves eram únicas por
 * aparelho: quem saía da conta (ou entrava com outra) continuava vendo as conversas de quem usou antes.
 * Agora cada conta (e quem está sem login) tem a sua área, e o chat só lê a área de quem está logado.
 *
 * Isso esconde, não apaga: as conversas continuam gravadas naquele navegador até o servidor guardá-las.
 */
import { useMemo } from "react";
import { useSession } from "next-auth/react";
import type { Armazem } from "@/lib/chat/threads";

export const CONTA_ANONIMA = "anon";

/** O que no navegador pertence a uma conta: as conversas (também as do celular e do Octa), o rascunho e o modo pesquisa de cada conversa. */
const PREFIXOS_DA_CONTA = ["zaeon.cowork.thread", "zaeon.research.thread", "zaeon.research.draft.v1", "zaeon.chat.modoPesquisa.v1", "zaeon.m.conversa", "zaeon.m.chat.", "zaeon.octa.",
  // #666: a biblioteca (os bytes dos PDFs ficam no IndexedDB, e só se chega neles por esta lista), citações, trabalhos, lixeira,
  // os documentos do editor e o que a tela de aulas guarda
  "zaeon.libraryFiles", "zaeon.savedCitations", "zaeon.researchWorks", "zaeon.trash", "zaeon_research_docs", "zaeon_research_draft",
  "zaeon_schedule_data", "zaeon_plugged_day", "zaeon_gadget_on", "zaeon_liquid_chat", "zaeon_stored_pdfs", "zaeon_user_modules"];

/** Resumo do e-mail: a chave identifica a conta sem deixar o e-mail escrito no navegador. */
function resumo(texto: string, semente: number): string {
  let h = semente;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

export function contaDaSessao(email: string | null | undefined): string {
  const limpo = (email ?? "").trim().toLowerCase();
  return limpo ? `c${resumo(limpo, 2166136261)}${resumo(limpo, 40389)}` : CONTA_ANONIMA;
}

export const chaveDaConta = (conta: string, chave: string) => `zaeon.conta.${conta}.${chave}`;

type Aparelho = Armazem & Pick<Storage, "key" | "length">;

/**
 * As conversas de antes desta separação não têm dono marcado: a primeira conta que entrar no navegador as
 * recebe. Sem login nada é movido, senão quem não entrou na conta veria as conversas. Tira a chave antiga antes
 * de gravar a nova para caber mesmo com o navegador quase cheio; se falhar, devolve e tenta na próxima vez.
 */
export function migrarConversasAntigas(a: Aparelho, conta: string): void {
  if (conta === CONTA_ANONIMA) return;
  const antigas: string[] = [];
  for (let i = 0; i < a.length; i++) {
    const k = a.key(i);
    if (k && PREFIXOS_DA_CONTA.some((p) => k.startsWith(p))) antigas.push(k);
  }
  for (const k of antigas) {
    const nova = chaveDaConta(conta, k);
    const valor = a.getItem(k);
    if (valor == null || a.getItem(nova) != null) continue;
    a.removeItem(k);
    try { a.setItem(nova, valor); } catch { a.setItem(k, valor); return; }
  }
}

export function armazemDaConta(a: Armazem, conta: string): Armazem {
  return {
    getItem: (k) => a.getItem(chaveDaConta(conta, k)),
    setItem: (k, v) => a.setItem(chaveDaConta(conta, k), v),
    removeItem: (k) => a.removeItem(chaveDaConta(conta, k)),
  };
}

/** Fora do SessionProvider (só nos testes de componente, o site inteiro está dentro dele) o useSession lança: vale como sem login. */
function sessaoOuAnonima(): Pick<ReturnType<typeof useSession>, "data" | "status"> {
  try { return useSession(); } catch { return { data: null, status: "unauthenticated" }; }
}

/** A área da conta logada. `null` enquanto a sessão carrega: nessa hora não se sabe de quem mostrar. */
export function useArmazemDaConta(): { conta: string; armazem: Armazem } | null {
  const { data, status } = sessaoOuAnonima();
  const carregando = status === "loading";
  const conta = contaDaSessao(data?.user?.email);
  return useMemo(() => {
    if (carregando) return null;
    try { migrarConversasAntigas(localStorage, conta); } catch { /* sem acesso ao navegador: nada a mover */ }
    // `localStorage` só é lido em cada chamada: quem chama já trata o navegador que não deixa guardar
    const aparelho: Armazem = {
      getItem: (k) => localStorage.getItem(k),
      setItem: (k, v) => localStorage.setItem(k, v),
      removeItem: (k) => localStorage.removeItem(k),
    };
    return { conta, armazem: armazemDaConta(aparelho, conta) };
  }, [carregando, conta]);
}
