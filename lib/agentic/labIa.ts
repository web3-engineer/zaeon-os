/**
 * lib/agentic/labIa.ts — #883 (parte 3a): a IA dos LABORATÓRIOS AGÊNTICOS (BioSim 3D, CodeLab, QuantumLab), sem depender
 * do Google.
 *
 * Antes cada rota (`app/api/agentic/{biosim,codelab,quantum}`) chamava o SDK do Vertex direto: com o Google fora do ar
 * (403 "requires billing"), o laboratório não respondia. Agora o texto passa pelo ENVELOPE (lib/llm/envelope), o mesmo
 * do chat da Aura: Hugging Face primeiro (com `LLM_PRIMARIO=hf`), o Vertex só de queda, e o HF de reserva quando o
 * Vertex falha. Cada chamada vai pro TokenLedger como `lab:<laboratório>`.
 *
 * Fica de fora (parte 4 do #883, visão): a FOTO enviada no BioSim continua indo ao Gemini, que lê imagem.
 */
import { GEMINI_MODEL_FLASH } from "@/lib/ai/model";
import type { Deps } from "@/lib/llm/envelope";

export type Laboratorio = "biosim" | "codelab" | "quantum";

/** a IA do laboratório: devolve o TEXTO (JSON) da resposta; quem chama faz o parse, como antes */
export async function iaDoLaboratorio(
  lab: Laboratorio,
  system: string,
  user: string,
  o: { temperature: number; maxOutputTokens: number; timeoutMs?: number; userId?: string | null } ,
  deps?: Deps,
): Promise<string> {
  const { gerar } = await import("@/lib/llm/envelope");
  const r = await gerar(
    {
      system, user, json: true, rota: "vertex", model: GEMINI_MODEL_FLASH,
      temperature: o.temperature, maxOutputTokens: o.maxOutputTokens, timeoutMs: o.timeoutMs ?? 25_000,
      ctx: { agentKey: `lab:${lab}`, surface: "estudos", userId: o.userId ?? null },
    },
    deps,
  );
  return r.texto;
}
