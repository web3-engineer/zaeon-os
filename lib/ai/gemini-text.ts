/**
 * geminiText — geração de texto simples via Gemini (Vertex AI), tier FLASH.
 *
 * Ponto único para chamadas de texto "leves" do app. Padroniza o Gemini Flash
 * como a ÚNICA IA (substitui usos diretos de Groq/OpenAI). Troca de modelo = env
 * GEMINI_MODEL/GEMINI_MODEL_FLASH (ver lib/ai/model.ts).
 */
import { VertexAI } from "@google-cloud/vertexai";
import { GEMINI_MODEL_FLASH } from "./model";
import { vertexCredentials } from "./vertex-credentials";

export async function geminiText(opts: {
  prompt: string;
  system?: string;
  temperature?: number;
  model?: string;
  /** Histórico da conversa (memória entre turnos). Itens {role:'user'|'model', parts:[{text}]}. */
  history?: { role: string; parts: { text: string }[] }[];
  /** Tempo máximo (ms) antes de desistir — evita pendurar a função até o 504 do Vercel. */
  timeoutMs?: number;
  /** Força saída em JSON puro (responseMimeType). Use em rotas que parseiam JSON. */
  json?: boolean;
}): Promise<string> {
  const { project, client_email, private_key, location } = vertexCredentials();
  const vertexAI = new VertexAI({
    project,
    location,
    googleAuthOptions: { credentials: { client_email, private_key } },
  });
  const model = vertexAI.getGenerativeModel({
    model: opts.model || GEMINI_MODEL_FLASH,
    generationConfig: {
      temperature: opts.temperature ?? 0.5,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  });
  const chat = model.startChat({
    ...(opts.system ? { systemInstruction: { role: "system", parts: [{ text: opts.system }] } } : {}),
    ...(opts.history && opts.history.length ? { history: opts.history } : {}),
  });
  // Corre contra um timeout: se o Vertex travar (modelo/credencial/região), falha rápido
  // com erro claro em vez de pendurar até o gateway cortar (504).
  const timeoutMs = opts.timeoutMs ?? 45_000;
  const call = chat.sendMessage([{ text: opts.prompt }]);
  const result: any = await Promise.race([
    call,
    new Promise((_, reject) => setTimeout(() => reject(new Error("gemini_timeout")), timeoutMs)),
  ]);
  return (
    result.response.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("") ?? ""
  );
}
