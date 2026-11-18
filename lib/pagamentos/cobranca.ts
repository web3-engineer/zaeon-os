/**
 * lib/pagamentos/cobranca.ts — a MATEMÁTICA da cobrança da vitrine (PURO). Decisão do dono (nov/2026):
 *  - APOIO às pesquisas  → USDC (estável; o apoiador não "perde" se o SOL oscilar);
 *  - COMPRA dos cards    → SOL;
 *  - a TAXA (da Cloak, a camada de privacidade) é paga pelo APOIADOR, mas "sem ele perceber": não é uma linha de taxa
 *    separada. A pessoa escolhe um valor, o beneficiário (pesquisa/autor) recebe esse valor CHEIO, e a taxa entra
 *    EMBUTIDA no total — um número só, com um "taxas incluídas" discreto (embutir, não esconder: esconder seria enganar).
 *
 * As taxas seguem a tabela da Cloak (docs): envio privado = parte FIXA + 0,3% do valor. A liquidação on-chain ainda é
 * "em breve" (MOEDA.ativa=false): esta lógica só monta os números; nada move dinheiro aqui.
 */

export type Finalidade = "apoio" | "compra";
export type MoedaPagto = "USDC" | "SOL";

/** a moeda de cada finalidade — a regra do dono, em um lugar só */
export const MOEDA_DE: Record<Finalidade, MoedaPagto> = { apoio: "USDC", compra: "SOL" };

/** casas decimais por moeda (USDC tem 6 on-chain, mas exibimos/arredondamos em centavos) */
export const CASAS: Record<MoedaPagto, number> = { USDC: 2, SOL: 4 };

/**
 * A taxa da Cloak por moeda: uma parte FIXA + uma fração do valor (0,3%). (docs.cloak.ag/guide/how-it-works)
 * O mínimo é o "shield mínimo" da Cloak — abaixo disso ela não aceita.
 */
export const TAXA_CLOAK: Record<MoedaPagto, { fixo: number; fracao: number; minimo: number }> = {
  USDC: { fixo: 0.45, fracao: 0.003, minimo: 1 },
  SOL: { fixo: 0.005, fracao: 0.003, minimo: 0.01 },
};

/** arredonda pra cima na menor unidade da moeda (o beneficiário nunca recebe a menos por arredondamento) */
function arredondarCima(v: number, casas: number): number {
  const f = 10 ** casas;
  return Math.ceil(v * f - 1e-9) / f;
}
function arredondar(v: number, casas: number): number {
  const f = 10 ** casas;
  return Math.round(v * f) / f;
}

export type Cobranca = {
  finalidade: Finalidade;
  moeda: MoedaPagto;
  /** o que o apoiador escolheu e o que o beneficiário recebe (cheio) */
  recebe: number;
  /** a taxa da Cloak, embutida (fixo + 0,3% sobre o que o beneficiário recebe) */
  taxa: number;
  /** o total que o apoiador paga = recebe + taxa */
  total: number;
};

/**
 * PURA: monta a cobrança a partir do valor ESCOLHIDO (= o que o beneficiário recebe). A taxa entra por cima, no total.
 * `erro` quando o valor escolhido está abaixo do mínimo da moeda (nada de cobrança inválida).
 */
export function montarCobranca(finalidade: Finalidade, valorEscolhido: number): { cobranca?: Cobranca; erro?: string } {
  const moeda = MOEDA_DE[finalidade];
  const casas = CASAS[moeda];
  const t = TAXA_CLOAK[moeda];
  const recebe = arredondar(Number(valorEscolhido) || 0, casas);
  if (!(recebe > 0)) return { erro: "Escolha um valor." };
  if (recebe < t.minimo) return { erro: `O mínimo é ${fmtMoeda(t.minimo, moeda)}.` };
  const taxa = arredondarCima(t.fixo + recebe * t.fracao, casas);
  const total = arredondar(recebe + taxa, casas);
  return { cobranca: { finalidade, moeda, recebe, taxa, total } };
}

/** "10 USDC" / "0,5 SOL" — valor com as casas da moeda, sem zeros à toa */
export function fmtMoeda(v: number, moeda: MoedaPagto): string {
  const s = Number(v).toLocaleString("pt-BR", { maximumFractionDigits: CASAS[moeda] });
  return `${s} ${moeda}`;
}

/**
 * O que a TELA mostra — o jeito "sem ele perceber": o TOTAL em destaque (um número só, taxa já dentro) e um rótulo
 * discreto de que as taxas de rede estão incluídas. NUNCA uma linha "taxa: X" ao lado do valor.
 */
export function exibicao(c: Cobranca): { total: string; nota: string; recebeDetalhe: string } {
  return {
    total: fmtMoeda(c.total, c.moeda),
    nota: "taxas de rede incluídas",
    // detalhe que fica só onde faz sentido mostrar (ex.: recibo), nunca empurrado no fluxo
    recebeDetalhe: `${fmtMoeda(c.recebe, c.moeda)} pra pesquisa · ${fmtMoeda(c.taxa, c.moeda)} de rede`,
  };
}
