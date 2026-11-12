/**
 * lib/solana/cotacao.ts — a cotação SOL→BRL ao vivo. Puro + um fetch injetável.
 *
 * ────────────────────────── a decisão de produto que manda aqui ──────────────────────────
 * O dono: "o preço é fixo em reais" + "precisamos de uma cotação em solana ao vivo". As duas
 * coisas juntas definem o modelo: o card guarda `precoBRL` (que não derrete), e o quanto isso dá
 * em SOL é calculado na HORA de exibir, com a cotação do momento. O inverso — guardar SOL e
 * mostrar reais — faria o "preço em reais" do curso de R$ 545 variar minuto a minuto junto com o
 * mercado, que é exatamente o que ninguém quer de um preço.
 *
 * ────────────────────────── por que CoinGecko, medido ──────────────────────────
 * Testei os três candidatos pelo proxy desta rede em 2026-11-12:
 *   · api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=brl,usd → 200, devolve
 *     {"solana":{"usd":82.74,"brl":462.03}} — SOL→BRL DIRETO, uma chamada, sem chave.
 *   · price.jup.ag → 502 (bloqueado pelo proxy).
 *   · api.binance.com → 451 (geo-restrito).
 * Então é CoinGecko, e a conversão BRL→SOL é uma divisão, não uma segunda chamada a um par USD.
 *
 * ────────────────────────── degrada sem mentir ──────────────────────────
 * Falha de rede, JSON torto, número não-finito ⇒ `null`. NUNCA um número inventado. O lado que
 * exibe (`precoDoCard`) mostra só os reais quando a cotação é `null` — o preço real nunca some, e
 * a conversão que a gente não tem também não aparece como se fosse verdade. É a mesma regra do
 * resto da casa: sem o dado, a feature se cala, não fabrica.
 *
 * ────────────────────────── cache de processo ──────────────────────────
 * A cotação não precisa ser por request: ela muda devagar perto da latência de um fetch. Um cache
 * global com TTL curto (`TTL_MS`) corta a rajada de chamadas quando a vitrine abre com N cards, e
 * dá um último valor bom para servir enquanto um refetch falha (`cotacaoEmCache`).
 */

export const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=brl,usd";

/** TTL do cache de processo. 60s: a vitrine inteira abre com uma cotação, e o mercado anda devagar. */
export const TTL_MS = 60_000;

/** Prazo do fetch. Curto: cotação é enfeite do preço, não pode segurar a vitrine. */
export const PRAZO_MS = 6_000;

export type Cotacao = {
  /** quantos reais vale 1 SOL, agora */
  solBrl: number;
  /** quantos dólares vale 1 SOL (contexto; não entra no preço) */
  solUsd: number;
  /** quando foi medida (epoch ms) */
  em: number;
  /** de onde veio: a fonte real, ou o cache servido numa falha de refetch */
  fonte: "coingecko" | "cache";
};

type FetchImpl = (url: string, init?: { signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

/** Lê os dois números do corpo do CoinGecko, validando CADA um. Qualquer coisa torta ⇒ null. */
export function lerCotacao(corpo: unknown): { solBrl: number; solUsd: number } | null {
  const sol = (corpo as { solana?: { brl?: unknown; usd?: unknown } })?.solana;
  const brl = Number(sol?.brl);
  const usd = Number(sol?.usd);
  // > 0 e finito: cotação zero ou negativa é dado corrompido, não "de graça".
  if (!Number.isFinite(brl) || brl <= 0 || !Number.isFinite(usd) || usd <= 0) return null;
  return { solBrl: brl, solUsd: usd };
}

type Cache = { __zaeonCotacaoSol?: Cotacao };
const cacheRef = () => globalThis as unknown as Cache;

/** O último valor bom, se ainda dentro do TTL. `null` fora dele (ou nunca medido). */
export function cotacaoEmCache(agora = Date.now()): Cotacao | null {
  const c = cacheRef().__zaeonCotacaoSol;
  return c && agora - c.em < TTL_MS ? c : null;
}

/** Só para teste: esquece o cache. */
export function __resetCotacaoParaTeste(): void {
  delete cacheRef().__zaeonCotacaoSol;
}

/**
 * A cotação ao vivo, com cache. NUNCA lança.
 *   1. cache fresco → devolve na hora, sem rede.
 *   2. senão busca o CoinGecko; sucesso → grava no cache e devolve `fonte: "coingecko"`.
 *   3. falha de rede, mas há um cache (mesmo vencido) → devolve ele com `fonte: "cache"`: um
 *      valor de um minuto atrás é melhor do que nenhum, e o campo `fonte` deixa isso honesto.
 *   4. falha sem cache nenhum → `null`, e o preço aparece só em reais.
 */
export async function cotarSol(
  deps: { fetchImpl?: FetchImpl; agora?: number } = {},
): Promise<Cotacao | null> {
  const agora = deps.agora ?? Date.now();
  const fresco = cotacaoEmCache(agora);
  if (fresco) return fresco;

  const fetchImpl = (deps.fetchImpl ?? (globalThis.fetch as unknown as FetchImpl));
  try {
    const r = await fetchImpl(COINGECKO_URL, { signal: AbortSignal.timeout(PRAZO_MS) });
    if (!r.ok) throw new Error(`coingecko status ${r.status}`);
    const lida = lerCotacao(await r.json());
    if (!lida) throw new Error("corpo do coingecko inválido");
    const cot: Cotacao = { ...lida, em: agora, fonte: "coingecko" };
    cacheRef().__zaeonCotacaoSol = cot;
    return cot;
  } catch {
    const velho = cacheRef().__zaeonCotacaoSol;
    return velho ? { ...velho, fonte: "cache" } : null;
  }
}

// ───────────────────────────── conversão e formatação (puras) ─────────────────────────────

/** Quantos SOL custa um preço em reais, dada uma cotação. `null`/entrada inválida ⇒ null. */
export function brlEmSol(precoBRL: number, cot: Cotacao | null): number | null {
  if (!cot || !Number.isFinite(precoBRL) || precoBRL < 0) return null;
  return precoBRL / cot.solBrl;
}

/** "R$ 545,00" — reais, sempre com os centavos. */
export function reaisTexto(precoBRL: number): string {
  return precoBRL.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "1,18 SOL" — SOL com até 4 casas, cortando zero à direita. */
export function solTexto(sol: number): string {
  return `${sol.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} SOL`;
}

export type PrecoExibido = {
  /** o que sempre aparece: "R$ 545,00", ou "Grátis" quando preço é 0 */
  reais: string;
  /** a conversão ao vivo, ou `null` quando não há cotação (e aí o card mostra só os reais) */
  sol: string | null;
  gratis: boolean;
};

/**
 * O preço pronto para o card. Fixo em reais, SOL ao vivo quando dá.
 *   · 0 reais → "Grátis", sem SOL (não há o que converter).
 *   · com cotação → reais + "≈ X SOL".
 *   · sem cotação → só os reais. O preço real nunca some; a conversão que falta não é inventada.
 */
export function precoDoCard(precoBRL: number, cot: Cotacao | null): PrecoExibido {
  if (!Number.isFinite(precoBRL) || precoBRL <= 0) {
    return { reais: "Grátis", sol: null, gratis: true };
  }
  const sol = brlEmSol(precoBRL, cot);
  return { reais: reaisTexto(precoBRL), sol: sol === null ? null : solTexto(sol), gratis: false };
}
