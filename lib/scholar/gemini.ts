import { vertexCredentials, vertexTextClientOpts } from "@/lib/ai/vertex-credentials";
import { VertexAI } from "@google-cloud/vertexai";
import { GEMINI_MODEL_FLASH } from "@/lib/ai/model";

// Modelos por env (ajustáveis sem redeploy). O gemini-2.0-flash-001 foi descontinuado (404 no Vertex).
// REGRA DO PROJETO: Flash é o padrão de TODOS os agentes (rápido + econômico). O Pro fica reservado
// só pro "pensamento profundo" (/api/ai/deepthink). Por isso o "heavy" também é Flash por padrão;
// quem quiser Pro na síntese seta SCHOLAR_GEMINI_MODEL=gemini-2.5-pro no env.
const HEAVY_MODEL = process.env.SCHOLAR_GEMINI_MODEL || GEMINI_MODEL_FLASH;
const CHAT_MODEL = process.env.SCHOLAR_GEMINI_CHAT_MODEL || GEMINI_MODEL_FLASH;

export function makeVertex() {
  const credentials = (() => { const __v = vertexCredentials(); return { project_id: __v.project, client_email: __v.client_email, private_key: __v.private_key }; })(); // robust parse
  return new VertexAI({
    project: credentials.project_id || process.env.GOOGLE_PROJECT_ID,
    ...vertexTextClientOpts(),
    googleAuthOptions: { credentials: { client_email: credentials.client_email, private_key: credentials.private_key } },
  });
}

export function getGeminiModel(systemInstruction?: string, opts?: { temperature?: number; model?: string }) {
  return makeVertex().getGenerativeModel({
    model: opts?.model || HEAVY_MODEL,
    generationConfig: { temperature: opts?.temperature ?? 0.2, responseMimeType: "application/json" },
    ...(systemInstruction ? { systemInstruction: { role: "system", parts: [{ text: systemInstruction }] } } : {}),
  });
}

// Free-text model for streaming chat (no JSON mime — emits prose tokens).
export function getGeminiChatModel(systemInstruction?: string, opts?: { temperature?: number; model?: string }) {
  return makeVertex().getGenerativeModel({
    model: opts?.model || CHAT_MODEL,
    generationConfig: { temperature: opts?.temperature ?? 0.4 },
    ...(systemInstruction ? { systemInstruction: { role: "system", parts: [{ text: systemInstruction }] } } : {}),
  });
}

/** Junta o texto das partes reais da resposta (ignora partes "thought", se houver).
 *  Mais robusto que pegar só parts[0]. */
export function extractText(result: any): string {
  const parts = result?.response?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((p: any) => p && !p.thought)
    .map((p: any) => (typeof p.text === "string" ? p.text : ""))
    .join("")
    .trim();
}

// Timeout p/ as chamadas ao Vertex: sem isso, uma chamada que pendura (rede/credencial/
// modelo lento) trava a pesquisa inteira (ex.: planning preso em ~13%). Com timeout, quem
// chama (planQuery) cai no fallback e a pesquisa SEGUE.
const GEMINI_TIMEOUT_MS = Number(process.env.SCHOLAR_GEMINI_TIMEOUT_MS || 30000);
export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms)),
  ]);
}

/**
 * Wrapper FINO do envelope (lib/llm/envelope.ts, contrato C5) — assinatura intacta para os ~30 call sites.
 * Mesmo modelo (HEAVY_MODEL), mesma temperatura (0.2), mesmo timeout e os mesmos erros diagnósticos;
 * a diferença é que agora cada chamada grava usage no TokenLedger (best-effort). `ctx` é opcional.
 */
export async function geminiJson<T>(systemInstruction: string, userPrompt: string, opts?: { temperature?: number; model?: string; timeoutMs?: number; ctx?: import("@/lib/llm/ledger").LedgerCtx; pensar?: import("@/lib/llm/pensar").NivelPensar }): Promise<T> {
  const { gerarJson } = await import("@/lib/llm/envelope");
  return gerarJson<T>({
    system: systemInstruction, user: userPrompt, json: true, rota: "vertex", pensar: opts?.pensar,
    model: opts?.model || HEAVY_MODEL, temperature: opts?.temperature ?? 0.2, timeoutMs: opts?.timeoutMs ?? GEMINI_TIMEOUT_MS,
    ctx: opts?.ctx ?? { agentKey: "aura", surface: "pesquisa" },
  });
}
