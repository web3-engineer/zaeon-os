/**
 * lib/llm/guarda.ts — moderação da mensagem do aluno com o llama-guard3 da Contabo (papel "guarda").
 *
 * AUDITORIA, não porteiro: roda DEPOIS do turno (fire-and-forget no runChatTurn) e só registra. Bloquear
 * antes da resposta exigiria o guard no caminho crítico — e na CPU ele leva segundos quente e ~1 min frio.
 * Mensagem insegura vira uma linha `[guarda]` no log com userId/sala/categorias (nunca o texto do aluno).
 *
 * Contabo fora/lenta/desligada (LOCAL_GUARDA=0) → o Google (flash-lite → flash) classifica com a MESMA
 * taxonomia e o MESMO formato de saída do llama-guard ("safe" | "unsafe\nS1,S10").
 */
import { gerarPapel, type PapelRes } from "@/lib/llm/papeis";
import type { Deps } from "@/lib/llm/envelope";
import type { Surface } from "@/lib/llm/ledger";

/** Taxonomia MLCommons (a do llama-guard3). */
export const CATEGORIAS: Record<string, string> = {
  S1: "crimes violentos", S2: "crimes não violentos", S3: "crimes sexuais", S4: "exploração sexual infantil",
  S5: "difamação", S6: "aconselhamento especializado perigoso", S7: "privacidade", S8: "propriedade intelectual",
  S9: "armas indiscriminadas", S10: "ódio", S11: "suicídio e automutilação", S12: "conteúdo sexual",
  S13: "eleições", S14: "abuso de interpretador de código",
};

/** Só pro fallback Google: o llama-guard já sabe a tarefa pelo próprio template. */
export const GUARDA_SYSTEM = [
  "Você é um classificador de segurança de conteúdo (taxonomia MLCommons, igual ao Llama Guard 3).",
  "Avalie SOMENTE a mensagem do usuário. Categorias: " + Object.entries(CATEGORIAS).map(([k, v]) => `${k} ${v}`).join("; ") + ".",
  "Pergunta de estudo sobre tema sensível (história de guerras, biologia, saúde) é segura. Só marque insegura quando o pedido busca causar dano.",
  "Responda EXATAMENTE 'safe', ou 'unsafe' e na linha de baixo as categorias separadas por vírgula (ex.: 'unsafe\\nS1,S10'). Nada mais.",
].join("\n");

export type Veredito = { seguro: boolean; categorias: string[] };

/** PURO. Saída do llama-guard (ou do Google imitando) → veredito. Ilegível = null (não inventa "seguro"). */
export function lerVeredito(texto: string): Veredito | null {
  const t = String(texto ?? "").trim().toLowerCase();
  if (/^safe\b/.test(t)) return { seguro: true, categorias: [] };
  if (/^unsafe\b/.test(t)) return { seguro: false, categorias: [...new Set((texto.toUpperCase().match(/\bS(?:1[0-4]|[1-9])\b/g) ?? []))] };
  return null;
}

export type Moderacao = Veredito & { alvo: PapelRes["alvo"]; fallback?: PapelRes["fallback"]; ms: number };

/** Classifica UMA mensagem. Lança se nem a Contabo nem o Google responderem algo legível. */
export async function moderar(texto: string, ctx: { userId?: string | null; surface: Surface }, deps: Deps = {}): Promise<Moderacao> {
  const res = await gerarPapel("guarda", {
    // llama-guard: o template do Ollama monta o prompt a partir das mensagens — system atrapalharia;
    // o Google precisa dele pra saber a tarefa (systemGoogle só entra no fallback).
    user: String(texto ?? "").slice(0, 4000),
    temperature: 0,
    maxOutputTokens: 20,
    timeoutMs: 15_000,
    aceita: (t) => lerVeredito(t) !== null,
    systemGoogle: GUARDA_SYSTEM,
    ctx: { agentKey: "sistema", surface: ctx.surface, userId: ctx.userId ?? null, phase: "guarda" },
  }, deps);
  const v = lerVeredito(res.texto);
  if (!v) throw new Error(`guarda: veredito ilegível (${res.alvo}): ${res.texto.slice(0, 40)}`);
  return { ...v, alvo: res.alvo, fallback: res.fallback, ms: res.ms };
}

/** Ponto de entrada do runChatTurn (fire-and-forget). Nunca lança. */
export async function auditarEntrada(input: { userId: string | null; surface: Surface; prompt: string }, deps: Deps = {}): Promise<Moderacao | null> {
  if (!String(input.prompt ?? "").trim()) return null;
  try {
    const m = await moderar(input.prompt, { userId: input.userId, surface: input.surface }, deps);
    if (!m.seguro) {
      console.warn(`[guarda] mensagem insegura user=${input.userId ?? "anon"} sala=${input.surface} cat=${m.categorias.join(",") || "?"} alvo=${m.alvo}`);
    }
    return m;
  } catch (e: any) {
    console.warn("[guarda] moderação falhou:", String(e?.message ?? e).slice(0, 160));
    return null;
  }
}
