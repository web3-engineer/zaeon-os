/**
 * Cliente do TCC cross-sala — fetch das rotas /api/tcc* + tipos que a UI usa. Sem Prisma (os
 * tipos vêm por `import type`, que some no build). Usado pela aba TCC da Sala de Estudos, pela
 * barra de sugestões e pelo chat da Sala de Pesquisa.
 */
import type { RevisaoView, TccView } from "@/lib/tcc/store";

export type { RevisaoView, TccView };
export type TccDoc = Omit<TccView, "updatedAt"> & { updatedAt: string };
export type Revisao = Omit<RevisaoView, "createdAt"> & { createdAt: string };

/** Flag do cliente (build): sem ela a UI do TCC nem aparece. O CHAT ÚNICO também liga (é o editor dos trabalhos). */
export const TCC_CROSS_ON = process.env.NEXT_PUBLIC_TCC_CROSS === "1" || process.env.NEXT_PUBLIC_CHAT_UNICO === "1";

export type TrabalhoResumo = { id: string; titulo: string; status: string; tipo: string };

export type PapelConvite = "editor" | "leitor";
/** `escopo: "conversa"` é o aviso do servidor de que o papel vale para TODOS os trabalhos da conversa. */
export type Convite = { url: string; token: string; papel: PapelConvite; escopo: "conversa" };

/** Evento que avisa as telas abertas que o TCC mudou (aceite, sugestão nova, edição). */
export const EVT_TCC_MUDOU = "zaeon:tcc:mudou";
export const avisarTccMudou = (workId: string) => {
  try { window.dispatchEvent(new CustomEvent(EVT_TCC_MUDOU, { detail: { workId } })); } catch { /* SSR */ }
};

async function json<T>(r: Response): Promise<T> {
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error((d as any)?.error || `HTTP ${r.status}`), { status: r.status, body: d });
  return d as T;
}
const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const tccApi = {
  doEscopo: (scopeId: string) =>
    fetch(`/api/tcc?scopeId=${encodeURIComponent(scopeId)}`).then((r) => json<{ tcc: { id: string; titulo: string; status: string } | null }>(r)),
  /** chat único: todos os trabalhos da conversa, na ordem em que nasceram */
  daConversa: (scopeId: string) =>
    fetch(`/api/tcc?scopeId=${encodeURIComponent(scopeId)}&todos=1`).then((r) => json<{ trabalhos: TrabalhoResumo[] }>(r)),
  criar: (topic: string, scopeId?: string | null) => post("/api/tcc", { topic, scopeId }).then((r) => json<{ workId: string; status: string }>(r)),
  ler: (id: string) => fetch(`/api/tcc/${id}`).then((r) => json<{ tcc: TccDoc; sugestoes: Revisao[] }>(r)),
  editar: (id: string, body: { secaoId?: string; op: string; corpo?: string; titulo?: string; aposId?: string; origem?: string }) =>
    post(`/api/tcc/${id}/edit`, body).then((r) => json<{ tcc: TccDoc }>(r)),
  /** renomeia o trabalho inteiro (o título da folha) */
  renomear: (id: string, titulo: string) => post(`/api/tcc/${id}/edit`, { tituloDoc: titulo }).then((r) => json<{ tcc: TccDoc }>(r)),
  decidir: (id: string, revId: string, aceitar: boolean) =>
    post(`/api/tcc/${id}/suggestion/${revId}`, { aceitar }).then((r) => json<{ tcc: TccDoc; revisao: Revisao }>(r)),
  historico: (id: string) => fetch(`/api/tcc/${id}/history`).then((r) => json<{ revisoes: Revisao[] }>(r)),
  desfazer: (id: string, revId: string) => post(`/api/tcc/${id}/history`, { revId }).then((r) => json<{ tcc: TccDoc }>(r)),
  revisar: (id: string, pedido: string, secaoId?: string) =>
    post(`/api/tcc/${id}/revisar`, { pedido, secaoId }).then((r) => json<{ texto: string; sugestoes: Revisao[]; descartadas: number }>(r)),
  /**
   * Link de convite da CONVERSA a que este trabalho pertence (só o dono). O `escopo` volta do
   * servidor de propósito: a UI mostra o que o link concede em vez de supor — ver o cabeçalho de
   * lib/tcc/compartilhar.ts.
   */
  compartilhar: (id: string, papel: PapelConvite = "editor") =>
    post(`/api/tcc/${id}/share`, { papel }).then((r) => json<Convite>(r)),
  /** Revoga TODOS os links já enviados. Quem já entrou continua membro (tirar é outra ação). */
  revogarConvites: (id: string) =>
    fetch(`/api/tcc/${id}/share`, { method: "DELETE" }).then((r) => json<{ ok: true }>(r)),
};

export const ROTULO_ORIGEM: Record<string, string> = { estudos: "Sala de Estudos", pesquisa: "Sala de Pesquisa", aluno: "Você" };
export const ROTULO_OP: Record<string, string> = {
  substituir: "reescreveu", inserir: "criou", anexar: "acrescentou", remover: "removeu", restaurar: "restaurou",
};
