/**
 * lib/tcc/compartilhar.ts — o CONVITE do trabalho: gerar o link e revogar, a partir do DOCUMENTO.
 *
 * Por que isto existe, se `POST /api/cartolina/:id/share` já gerava link: o convite mora na
 * CARTOLINA da conversa — é de lá que `papelNoWork` (lib/tcc/store) tira o papel do convidado no
 * documento —, e o painel do trabalho só conhece o `workId`. Sem esta ponte, o botão "Convidar"
 * obrigaria o cliente a descobrir o id do board: conhecimento que ele não tem e não deveria ter.
 *
 * 🔴 O QUE O CONVITE CONCEDE, e a tela TEM de dizer: papel na CONVERSA, não neste documento. Um
 * `editor` passa a editar TODOS os trabalhos daquela conversa, inclusive os que nascerem depois.
 * Foi decisão do dono (2026-11-04), e é a mesma que o cabeçalho de `lib/tcc/store.ts` já defendia:
 * "um modelo de membros só pro TCC divergiria do da cartolina". Por isso `escopo: "conversa"` volta
 * no corpo da resposta — um botão que concede mais do que diz é a mentira da F0 por outra porta, e
 * a UI não pode ter como esquecer.
 *
 * A CARTOLINA É CRIADA SE FALTAR, e isso não é zelo: `papelNoWork` resolve o papel do convidado
 * ATRAVÉS do board. Sem board, ninguém além do dono consegue papel no documento — o link nasceria
 * MORTO, levaria a pessoa até `/estudo/<id>` e ela leria "sem acesso" sem entender por quê.
 * Conversa sem cartolina é o caso comum, não a exceção: o board da conversa só nasce em
 * `lib/cartolina/memoria-turno.ts`, e só com `CARTOLINA_MEMORIA=1`.
 *
 * `surface: "estudos"` é a surface da CARTOLINA (`CARTOLINA_SURFACES`), e é a que `papelNoWork`
 * procura. Não confundir com `SURFACE_ESTUDOS` de `lib/estudos/board`, que vale "meus-estudos" e é
 * outro recurso — ligar a constante errada aqui geraria convite que nunca concede nada.
 */
import { podeAdministrar, type PapelConvidavel } from "@/lib/cartolina/access";
import { gerarLink, revogarLinks } from "@/lib/cartolina/cowork-store";
import { acharBoardDaConversa, boardDaConversa, SURFACE_CONVERSA } from "@/lib/cartolina/conversa-share";
import { getTccForUser } from "@/lib/tcc/store";

/** Reexportado: a surface é definida uma vez só, em lib/cartolina/conversa-share. */
export { SURFACE_CONVERSA };

export type MotivoConvite = "not_found" | "forbidden" | "sem_conversa";
export type Falha = { ok: false; reason: MotivoConvite };
export type Convite = {
  ok: true;
  /** o link pronto pra copiar/enviar */
  url: string;
  token: string;
  papel: PapelConvidavel;
  boardId: string;
  /** o que o convite concede — a UI mostra isto, não adivinha */
  escopo: "conversa";
};

// O resolvedor do board mora em lib/cartolina/conversa-share: as DUAS portas (documento e
// conversa) usam a mesma função, pra ninguém consertar uma e esquecer a outra — e porque é lá que
// mora a armadilha da surface ("estudos", não "meus-estudos").

/**
 * Gera o link de convite da conversa a que este trabalho pertence. SÓ O DONO (`podeAdministrar`),
 * como no resto do trilho: convidar e remover gente nunca foi de editor.
 */
export async function linkDoTrabalho(
  workId: string, userId: string, papel: PapelConvidavel,
): Promise<Convite | Falha> {
  const t = await getTccForUser(workId, userId);
  if (!t) return { ok: false, reason: "not_found" };          // não existe OU sem acesso (indistinguível de fora)
  if (!podeAdministrar(t.papel)) return { ok: false, reason: "forbidden" };
  // trabalho solto (sem conversa) não tem por onde conceder papel: o trilho é todo pela cartolina
  if (!t.scopeId) return { ok: false, reason: "sem_conversa" };
  const boardId = await boardDaConversa(userId, t.scopeId);
  const r = await gerarLink(boardId, userId, papel);
  if (!r.ok) return { ok: false, reason: r.reason === "forbidden" ? "forbidden" : "not_found" };
  return {
    ok: true,
    url: `/estudo/${boardId}?convite=${encodeURIComponent(r.token)}`,
    token: r.token, papel, boardId, escopo: "conversa",
  };
}

/**
 * Revoga TODOS os links daquela conversa (troca o sal; não há tabela de tokens). Quem já entrou
 * CONTINUA membro — tirar alguém é `DELETE /api/cartolina/:id/membros`, e são coisas diferentes:
 * uma fecha a porta, a outra tira quem está dentro.
 */
export async function revogarDoTrabalho(workId: string, userId: string): Promise<{ ok: true } | Falha> {
  const t = await getTccForUser(workId, userId);
  if (!t) return { ok: false, reason: "not_found" };
  if (!podeAdministrar(t.papel)) return { ok: false, reason: "forbidden" };
  if (!t.scopeId) return { ok: false, reason: "sem_conversa" };
  const board = await acharBoardDaConversa(t.scopeId);
  // sem board não há link emitido: revogar é no-op honesto, não erro
  if (!board) return { ok: true };
  const r = await revogarLinks(board.id, userId);
  return r.ok ? { ok: true } : { ok: false, reason: r.reason === "forbidden" ? "forbidden" : "not_found" };
}
