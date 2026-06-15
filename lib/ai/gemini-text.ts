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
}): Promise<string> {
  const { project, client_email, private_key, location } = vertexCredentials();
  const vertexAI = new VertexAI({
    project,
    location,
    googleAuthOptions: { credentials: { client_email, private_key } },
  });
  const model = vertexAI.getGenerativeModel({
    model: opts.model || GEMINI_MODEL_FLASH,
    generationConfig: { temperature: opts.temperature ?? 0.5 },
  });
  const chat = model.startChat(
    opts.system ? { systemInstruction: { role: "system", parts: [{ text: opts.system }] } } : {},
  );
  const result = await chat.sendMessage([{ text: opts.prompt }]);
  return (
    result.response.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("") ?? ""
  );
}
