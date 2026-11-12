/**
 * lib/anatomia/isolamento.ts — A REGRA: uma cena pedida mostra SÓ o que foi pedido. PURO.
 *
 * Decisão do dono (2026-11-12): "queremos que a IA seja capaz de mostrar partes isoladas quando
 * abrimos o atlas, e não carregar o corpo todo. Devemos tratar o carregamento de partes que não são
 * isoladas como um ERRO."
 *
 * Até aqui o isolamento era uma PROPRIEDADE que `dadosDoConceito` punha e que todo mundo confiava que
 * estava lá. Ninguém conferia — e havia três caminhos por onde o corpo inteiro chegava à tela:
 *   · o botão "Abrir o atlas" do cartão levava a `/anatomia` SEM a estrutura: 2.229 peças, nenhuma
 *     selecionada. Era o defeito que o dono via.
 *   · um estado com `isolate: false` passava em `cenaUtilizavel` (só olhava a seleção), e o visor
 *     desenhava a peça atrás de 402 músculos;
 *   · um conceito que É o corpo (`human body`, 1.258 peças) "isolado" continua sendo o corpo.
 *
 * Agora é uma checagem só, usada no servidor (antes de gravar o artefato), no harness (antes de o
 * artefato viajar) e no cliente (antes de o visor montar). Falhou = erro com motivo, nunca cena.
 */
import type { Atlas, EstadoCena } from "@/lib/anatomia/atlas";
import { contarVisiveis } from "@/lib/anatomia/estado";

/**
 * A partir desta fração das peças do atlas, o "conceito" é o corpo, não uma parte dele. Metade: o
 * maior pedido legítimo medido é o tronco (`trunk`, 577 de 2.234 = 26%) e os sistemas ficam todos
 * abaixo disso; `human body` tem 1.258 (56%).
 */
export const FRACAO_DE_CORPO_INTEIRO = 0.5;

export type FalhaDeIsolamento = "sem_selecao" | "nao_isolada" | "corpo_inteiro" | "selecao_alheia";

export type VereditoDeIsolamento =
  | { ok: true; visiveis: number }
  | { ok: false; code: FalhaDeIsolamento; motivo: string };

/** O conceito, sozinho, já é o corpo inteiro? */
export function ehCorpoInteiro(atlas: Pick<Atlas, "parts">, pecas: number): boolean {
  return atlas.parts.length > 0 && pecas >= atlas.parts.length * FRACAO_DE_CORPO_INTEIRO;
}

/**
 * A cena mostra só o que foi pedido? Com `esperadas` (as peças do conceito pedido), a seleção tem de
 * ser EXATAMENTE elas — nem uma a mais, nem uma a menos.
 */
export function verificarIsolamento(
  atlas: Pick<Atlas, "parts">,
  estado: Pick<EstadoCena, "selected" | "isolate" | "visible"> | null | undefined,
  esperadas?: readonly string[],
): VereditoDeIsolamento {
  const selecao = Array.isArray(estado?.selected) ? estado!.selected : [];
  if (!selecao.length) {
    return { ok: false, code: "sem_selecao", motivo: "a cena não tem peça selecionada — desenharia o corpo inteiro" };
  }
  if (estado!.isolate !== true) {
    return { ok: false, code: "nao_isolada", motivo: "a cena não está isolada — a peça ficaria escondida no meio do corpo inteiro" };
  }
  if (esperadas) {
    const quer = new Set(esperadas);
    if (quer.size !== new Set(selecao).size || selecao.some((id) => !quer.has(id))) {
      return { ok: false, code: "selecao_alheia", motivo: "a cena seleciona peças que não são as da estrutura pedida" };
    }
  }
  const visiveis = contarVisiveis(atlas.parts, estado as EstadoCena);
  if (ehCorpoInteiro(atlas, visiveis)) {
    return { ok: false, code: "corpo_inteiro", motivo: `a cena mostraria ${visiveis} das ${atlas.parts.length} peças — isso é o corpo, não uma parte dele` };
  }
  return { ok: true, visiveis };
}

/**
 * A mesma regra para o CLIENTE, que recebe o estado pronto e não tem o atlas na mão antes de montar
 * o visor: sem seleção ou sem isolamento não há cena. (O teto de corpo inteiro já foi cobrado no
 * servidor, que só grava artefato que passou em `verificarIsolamento`.)
 */
export function estadoEstaIsolado(estado: Pick<EstadoCena, "selected" | "isolate"> | null | undefined): boolean {
  return estado?.isolate === true && Array.isArray(estado.selected) && estado.selected.length > 0;
}

/** O endereço do atlas JÁ na estrutura — o botão "Abrir o atlas" nunca mais abre o corpo inteiro. */
export const PARAM_ESTRUTURA = "estrutura";
export function linkDoAtlas(idDoConceito: string | null | undefined): string | null {
  const id = String(idDoConceito ?? "").trim();
  return /^[A-Za-z]{2,5}\d{1,9}$/.test(id) ? `/anatomia?${PARAM_ESTRUTURA}=${encodeURIComponent(id)}` : null;
}
