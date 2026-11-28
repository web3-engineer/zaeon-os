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

/**
 * O tempo de cada laboratório (#883, revisão): `tentativaMs` é o prazo de CADA tentativa (HF, depois o Google); `totalMs`
 * é o prazo do pedido INTEIRO, abaixo do `maxDuration` da rota, para a resposta (ou o erro) sair antes de a rota ser cortada.
 */
export const PRAZOS_LAB: Readonly<Record<Laboratorio, { tentativaMs: number; totalMs: number }>> = {
  codelab: { tentativaMs: 10_000, totalMs: 25_000 },   // rota com maxDuration 30
  quantum: { tentativaMs: 10_000, totalMs: 25_000 },   // rota com maxDuration 30
  biosim: { tentativaMs: 20_000, totalMs: 50_000 },    // rota com maxDuration 60 (o voxel é longo)
};

/** o id do aluno na sessão (o ledger soma o uso por aluno; sem id, o uso some do relatório dele) */
export function idDoAluno(session: { user?: unknown } | null | undefined): string | null {
  const id = (session?.user as { id?: unknown } | undefined)?.id;
  return typeof id === "string" && id ? id : null;
}

/** a IA do laboratório: devolve o TEXTO (JSON) da resposta; quem chama faz o parse, como antes */
export async function iaDoLaboratorio(
  lab: Laboratorio,
  system: string,
  user: string,
  o: { temperature: number; maxOutputTokens: number; userId: string | null },
  deps?: Deps,
): Promise<string> {
  const { gerar } = await import("@/lib/llm/envelope");
  const prazo = PRAZOS_LAB[lab];
  let relogio: ReturnType<typeof setTimeout> | undefined;
  const estouro = new Promise<never>((_, falhar) => {
    relogio = setTimeout(() => falhar(new Error(`a IA do laboratório passou de ${prazo.totalMs / 1000} s`)), prazo.totalMs);
  });
  try {
    const r = await Promise.race([
      gerar(
        {
          system, user, json: true, rota: "vertex", model: GEMINI_MODEL_FLASH,
          temperature: o.temperature, maxOutputTokens: o.maxOutputTokens, timeoutMs: prazo.tentativaMs,
          ctx: { agentKey: `lab:${lab}`, surface: "estudos", userId: o.userId },
        },
        deps,
      ),
      estouro,
    ]);
    return r.texto;
  } finally {
    clearTimeout(relogio);
  }
}
