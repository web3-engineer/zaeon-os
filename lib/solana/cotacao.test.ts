/**
 * lib/solana/cotacao.test.ts — a cotação SOL→BRL ao vivo.
 *
 * O teste `[rede real]` no fim bate no CoinGecko DE VERDADE. É opt-in (COTACAO_E2E=1) pelo mesmo
 * motivo que o `adapter sandbox e2e` do whatsapp-adapter roda separado: rede externa não pode
 * deixar o CI vermelho por estar fora do ar. O resto exercita tudo com fetch injetado.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COINGECKO_URL, TTL_MS, __resetCotacaoParaTeste, brlEmSol, cotacaoEmCache, cotarSol,
  lerCotacao, precoDoCard, reaisTexto, solTexto,
} from "@/lib/solana/cotacao";

const resposta = (body: unknown, ok = true, status = 200) =>
  vi.fn(async () => ({ ok, status, json: async () => body }));

const BOM = { solana: { brl: 462.03, usd: 82.74 } };

afterEach(() => __resetCotacaoParaTeste());

describe("lerCotacao — valida CADA número", () => {
  it("lê os dois valores do corpo do CoinGecko", () => {
    expect(lerCotacao(BOM)).toEqual({ solBrl: 462.03, solUsd: 82.74 });
  });

  it("recusa corpo torto, zero, negativo e não-numérico — dado corrompido não é preço", () => {
    for (const b of [
      null, {}, { solana: {} }, { solana: { brl: 0, usd: 82 } },
      { solana: { brl: -1, usd: 82 } }, { solana: { brl: "abc", usd: 82 } },
      { solana: { brl: 462 } }, { bitcoin: { brl: 1 } },
    ]) {
      expect(lerCotacao(b), JSON.stringify(b)).toBeNull();
    }
  });
});

describe("cotarSol — cache, degradação e honestidade da fonte", () => {
  it("busca, grava no cache e marca a fonte real", async () => {
    const fetchImpl = resposta(BOM);
    const c = await cotarSol({ fetchImpl, agora: 1000 });
    expect(c).toMatchObject({ solBrl: 462.03, solUsd: 82.74, em: 1000, fonte: "coingecko" });
    expect(fetchImpl).toHaveBeenCalledWith(COINGECKO_URL, expect.anything());
  });

  it("cache fresco NÃO toca a rede — a vitrine abre com uma cotação, não com N", async () => {
    const fetchImpl = resposta(BOM);
    await cotarSol({ fetchImpl, agora: 1000 });
    const c2 = await cotarSol({ fetchImpl, agora: 1000 + TTL_MS - 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(c2!.fonte).toBe("coingecko"); // veio do cache, mas o valor é o real
  });

  it("passado o TTL, refaz a busca", async () => {
    const fetchImpl = resposta(BOM);
    await cotarSol({ fetchImpl, agora: 1000 });
    await cotarSol({ fetchImpl, agora: 1000 + TTL_MS + 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("falha de rede COM cache velho devolve o velho, marcado como cache — não mente que é fresco", async () => {
    await cotarSol({ fetchImpl: resposta(BOM), agora: 1000 });
    const quebrado = vi.fn(async () => { throw new Error("rede fora"); });
    const c = await cotarSol({ fetchImpl: quebrado, agora: 1000 + TTL_MS + 1 });
    expect(c).toMatchObject({ solBrl: 462.03, fonte: "cache" });
  });

  it("falha de rede SEM cache nenhum ⇒ null — e o preço vai aparecer só em reais", async () => {
    const quebrado = vi.fn(async () => { throw new Error("rede fora"); });
    expect(await cotarSol({ fetchImpl: quebrado, agora: 1000 })).toBeNull();
  });

  it("status != 200 e corpo inválido caem no mesmo degrade, sem lançar", async () => {
    expect(await cotarSol({ fetchImpl: resposta(BOM, false, 429), agora: 1 })).toBeNull();
    __resetCotacaoParaTeste();
    expect(await cotarSol({ fetchImpl: resposta({ lixo: 1 }), agora: 1 })).toBeNull();
  });

  it("cotacaoEmCache respeita o TTL", async () => {
    await cotarSol({ fetchImpl: resposta(BOM), agora: 1000 });
    expect(cotacaoEmCache(1000 + TTL_MS - 1)).not.toBeNull();
    expect(cotacaoEmCache(1000 + TTL_MS + 1)).toBeNull();
  });
});

describe("conversão e formatação — o preço FIXO em reais, SOL ao vivo", () => {
  const cot = { solBrl: 462.03, solUsd: 82.74, em: 0, fonte: "coingecko" as const };

  it("brlEmSol divide pelo valor do SOL; sem cotação ⇒ null", () => {
    expect(brlEmSol(462.03, cot)).toBeCloseTo(1, 6);
    expect(brlEmSol(545, cot)).toBeCloseTo(545 / 462.03, 6);
    expect(brlEmSol(545, null)).toBeNull();
    expect(brlEmSol(-1, cot)).toBeNull();
  });

  it("formata reais com centavos e SOL sem zero à toa", () => {
    expect(reaisTexto(545)).toBe("R$ 545,00");
    expect(solTexto(1.17949)).toBe("1,1795 SOL"); // 4 casas, arredondado
    expect(solTexto(2)).toBe("2 SOL");
  });

  it("precoDoCard: COM cotação mostra reais e a conversão", () => {
    const p = precoDoCard(545, cot);
    expect(p.reais).toBe("R$ 545,00");
    expect(p.sol).toBe("1,1796 SOL"); // 545 / 462,03
    expect(p.gratis).toBe(false);
  });

  it("precoDoCard: SEM cotação mostra SÓ os reais — nunca um SOL inventado", () => {
    const p = precoDoCard(545, null);
    expect(p.reais).toBe("R$ 545,00");
    expect(p.sol).toBeNull();
  });

  it("precoDoCard: preço 0 é Grátis, sem SOL", () => {
    expect(precoDoCard(0, cot)).toEqual({ reais: "Grátis", sol: null, gratis: true });
    expect(precoDoCard(33, cot).reais).toBe("R$ 33,00"); // o card de 33 BRL da lista
  });
});

// ─────────────────────── rede real (opt-in) ───────────────────────
describe.runIf(process.env.COTACAO_E2E === "1")("[rede real] CoinGecko responde", () => {
  it("devolve uma cotação SOL→BRL plausível", async () => {
    __resetCotacaoParaTeste();
    const c = await cotarSol();
    expect(c, "CoinGecko não respondeu — veja o proxy/allowlist").not.toBeNull();
    expect(c!.solBrl).toBeGreaterThan(1);    // um SOL não vale centavos
    expect(c!.solBrl).toBeLessThan(100_000); // nem uma fortuna absurda
    expect(c!.fonte).toBe("coingecko");
  });
});
