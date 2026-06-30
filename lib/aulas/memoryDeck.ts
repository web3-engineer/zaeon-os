/** Deck do jogo da memória (puro/testável). Cada par vira 2 cartas (mesmo pairId). */
import { shuffleSeeded } from "@/lib/aulas/fillBlanks";

export type MemoryCard = { id: string; pairId: number; text: string };

export function buildMemoryDeck(pairs: { a: string; b: string }[], seed: string): MemoryCard[] {
  const cards: MemoryCard[] = [];
  pairs.forEach((p, i) => {
    cards.push({ id: `${i}-a`, pairId: i, text: String(p?.a ?? "") });
    cards.push({ id: `${i}-b`, pairId: i, text: String(p?.b ?? "") });
  });
  return shuffleSeeded(cards, seed);
}

export function isMatch(a: MemoryCard, b: MemoryCard): boolean {
  return a.pairId === b.pairId && a.id !== b.id;
}
