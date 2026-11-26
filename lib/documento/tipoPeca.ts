/**
 * O rótulo da PEÇA JURÍDICA (tipo do trabalho no editor e no topo do chat), num arquivo SÓ dele: o editor (cliente)
 * precisa do nome, e lib/documento/pecaJuridica carrega a escrita pelo envelope (servidor) — importar de lá puxava o
 * SDK do Google pro navegador e quebrava o build. PURO.
 */
export const TIPO_TRABALHO_PECA = "Peça jurídica";
