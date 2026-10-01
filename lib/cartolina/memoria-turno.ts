/**
 * Ponte chat ⇄ cartolina para UM turno do harness. O route (e o runChatTurn, na fila) só
 * chama estas duas funções — toda a regra mora aqui, atrás de CARTOLINA_MEMORIA.
 *
 * Ambas são BEST-EFFORT: a cartolina é memória, nunca pode derrubar nem atrasar a resposta.
 * Não usam LLM (só mapeiam a resposta que já existe), então rodam no mesmo processo; o
 * trabalho pesado (a resposta em si) é o que vai pro worker.
 */
import { cartolinaMemoriaOn, createBoard, findOwnBoard, patchBoard } from "@/lib/cartolina/store";
import { bussola, rascunhosFromStructured, fundirNoBoard } from "@/lib/cartolina/fromStructured";
import { sanitizeScopeId } from "@/lib/cartolina/route-auth";
import type { StructuredAnswer } from "@/lib/agent/contracts";

/** Texto da bússola pra injetar no systemContext ("" se desligado/sem board/sem conversa). */
export async function bussolaParaTurno(userId: string | null, scopeId: unknown): Promise<string> {
  const scope = sanitizeScopeId(scopeId);
  if (!cartolinaMemoriaOn() || !userId || !scope) return "";
  try {
    const board = await findOwnBoard(userId, "estudos", scope);
    return board ? bussola(board.cards) : "";
  } catch { return ""; }
}

/** Fixa os cards do turno no board da conversa (cria o board no 1º turno que gera algo). */
export async function fixarTurno(input: { userId: string | null; scopeId: unknown; prompt: string; answer: StructuredAnswer; msgId?: unknown }): Promise<void> {
  const scope = sanitizeScopeId(input.scopeId);
  if (!cartolinaMemoriaOn() || !input.userId || !scope) return;
  try {
    const msgId = sanitizeScopeId(input.msgId) ?? undefined;
    const rasc = rascunhosFromStructured(input.answer, msgId);
    if (!rasc.length) return;
    const board = await findOwnBoard(input.userId, "estudos", scope);
    if (!board) {
      await createBoard({ ownerId: input.userId, surface: "estudos", scopeId: scope, titulo: input.prompt.slice(0, 80) || "Estudo", cards: fundirNoBoard([], rasc) });
      return;
    }
    // patchBoard reaplica sobre o estado ATUAL: não atropela o que o aluno mexeu na cartolina.
    // (fundir sobre o `board` lido já dá o upsert certo; o rev cuida da corrida.)
    const novos = fundirNoBoard(board.cards, rasc);
    const antes = new Map(board.cards.map((c) => [c.id, JSON.stringify(c)]));
    await patchBoard(board.id, input.userId, { upsert: novos.filter((c) => antes.get(c.id) !== JSON.stringify(c)) });
  } catch (e: any) {
    console.warn("[cartolina] fixarTurno falhou:", e?.message ?? e); // memória é opcional
  }
}
