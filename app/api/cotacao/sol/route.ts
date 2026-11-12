/**
 * /api/cotacao/sol (público) — a cotação SOL→BRL ao vivo, para o card converter o preço FIXO em
 * reais na hora de exibir. Servida pelo cache de processo (lib/solana/cotacao): a vitrine inteira
 * abre com uma chamada ao CoinGecko, não com uma por card.
 *
 * Nunca 500: cotação fora do ar devolve `{ cotacao: null }`, e o card mostra só os reais. O preço
 * real nunca depende desta rota — ela só acrescenta a conversão quando ela existe.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cotarSol } from "@/lib/solana/cotacao";

export async function GET() {
  const cotacao = await cotarSol();
  // `s-maxage` curto: a conversão pode envelhecer alguns segundos sem ninguém notar, e isso tira
  // carga do CoinGecko quando muita gente abre a vitrine ao mesmo tempo.
  return NextResponse.json(
    { cotacao },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
  );
}
