/**
 * lib/chat/conversasNav.ts — a sidebar principal pedindo coisas ao chat de uma sala.
 *
 * Na sidebar cada sala é um nó com as SUAS conversas embaixo (Sala de Estudos → nova conversa +
 * conversas; Sala de Pesquisa → nova pesquisa + conversas). Clicar numa conversa da OUTRA sala
 * troca de sala e abre aquela conversa — mas o chat dela pode nem estar montado ainda. Então o
 * pedido vai pelos dois caminhos: evento (chat montado reage na hora) e um bilhete no
 * localStorage (chat que monta depois lê e apaga).
 */
export type SalaChat = "estudos" | "pesquisa";
export type PedidoConversa = { sala: SalaChat; id?: string; nova?: boolean };

export const EVT_PEDIDO_CONVERSA = "zaeon:conversa:pedido";
/** A Sala de Estudos volta a mostrar a CONVERSA (sai de "Meus Estudos"/"Estudos") — StudyRoomContent escuta. */
export const EVT_ESTUDOS_CHAT = "zaeon:estudos:chat";
const chave = (sala: SalaChat) => `zaeon.conversa.pedido.${sala}`;

export function pedirConversa(p: PedidoConversa): void {
  try { localStorage.setItem(chave(p.sala), JSON.stringify(p)); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent<PedidoConversa>(EVT_PEDIDO_CONVERSA, { detail: p }));
}

/** O chat atendeu (ou leu ao montar): apaga o bilhete pra não reabrir no próximo carregamento. */
export function consumirPedido(sala: SalaChat): PedidoConversa | null {
  try {
    const v = localStorage.getItem(chave(sala));
    if (!v) return null;
    localStorage.removeItem(chave(sala));
    const p = JSON.parse(v);
    return p && p.sala === sala ? p : null;
  } catch { return null; }
}

/**
 * As sub-abas da Sala de Estudos moram na SIDEBAR (sob "Sala de Estudos": as conversas, "Meus Estudos" e, por último,
 * "Estudos") — não há mais pills no topo. A sala ANUNCIA a aba dela (a sidebar destaca) e a sidebar PEDE uma aba
 * (evento pra sala montada + bilhete pra sala que ainda vai montar). `meus-estudos` = a conversa.
 */
export type AbaEstudos = "meus-estudos" | "feed" | "community";
/** o que a sala ANUNCIA: uma das abas da sidebar, ou `outra` (Literatura, um curso…) — #824: sem isso, sair da vitrine
 *  pra Literatura deixava o laboratório achando que a vitrine seguia aberta */
export type AbaEstudosAnunciada = AbaEstudos | "outra";
export const EVT_ESTUDOS_ABA = "zaeon:estudos:aba";
export const EVT_ESTUDOS_IR = "zaeon:estudos:ir";
const CHAVE_ABA = "zaeon.estudos.aba.pedido";
let abaAtual: AbaEstudosAnunciada = "meus-estudos";

/** A sala diz em que aba está (e a sidebar, que monta antes ou depois, lê com `abaEstudosAtual`). */
export function anunciarAbaEstudos(aba: AbaEstudosAnunciada): void {
  abaAtual = aba;
  window.dispatchEvent(new CustomEvent<AbaEstudosAnunciada>(EVT_ESTUDOS_ABA, { detail: aba }));
}
export const abaEstudosAtual = (): AbaEstudosAnunciada => abaAtual;

export function irPraAbaEstudos(aba: AbaEstudos): void {
  try { localStorage.setItem(CHAVE_ABA, aba); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent<AbaEstudos>(EVT_ESTUDOS_IR, { detail: aba }));
}

/** A sala atendeu o pedido (ou o leu ao montar): apaga o bilhete. */
export function consumirAbaEstudos(): AbaEstudos | null {
  try {
    const v = localStorage.getItem(CHAVE_ABA);
    if (!v) return null;
    localStorage.removeItem(CHAVE_ABA);
    return v === "meus-estudos" || v === "feed" || v === "community" ? v : null;
  } catch { return null; }
}
