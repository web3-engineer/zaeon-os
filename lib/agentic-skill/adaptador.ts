/**
 * lib/agentic-skill/adaptador.ts — o `ChamarModelo` REAL: "claude", "codex", "octa" → três chamadas.
 *
 * SÓ o e2e opt-in (AGENTIC_E2E=1) usa isto, e só onde há chave. Nesta sessão não há nenhuma (só
 * ANTHROPIC_BASE_URL), então este caminho não roda aqui — é o mesmo motivo do [rede real] da
 * cotação e do DEVICE_E2E. Cada modelo sem a sua chave LANÇA uma mensagem clara; o runner transforma
 * isso em saída vazia, que falha o contrato, e o veredito nomeia o modelo que faltou — honesto.
 *
 *   claude → API da Anthropic (/v1/messages), chave ANTHROPIC_API_KEY, modelo ANTHROPIC_OPUS_MODEL.
 *   codex  → API OpenAI-compatível (/v1/chat/completions), OPENAI_API_KEY, modelo OPENAI_CODEX_MODEL.
 *   octa   → o caminho da CASA (lib/ai/router → Vertex/Gemini), que é o modelo em que o Octa roda.
 *
 * Sem SDK novo — fetch puro, como o `callOpenRouter`/`callLocal` do router já fazem. O vetting do CI
 * (scripts/vet-deps) barra pacote com script de instalação, então a casa evita SDK onde dá.
 */
import type { ChamarModelo } from "@/lib/agentic-skill/runner";

const PRAZO_MS = 60_000;

async function chamarClaude(system: string, user: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY ausente — não dá para chamar o Claude");
  const base = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
  const model = process.env.ANTHROPIC_OPUS_MODEL || "claude-opus-4-8";
  const r = await fetch(`${base.replace(/\/$/, "")}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: 2048, system, messages: [{ role: "user", content: user }] }),
    signal: AbortSignal.timeout(PRAZO_MS),
  });
  if (!r.ok) throw new Error(`Claude status ${r.status}`);
  const j = (await r.json()) as { content?: { text?: string }[] };
  return (j.content ?? []).map((p) => p.text ?? "").join("");
}

async function chamarCodex(system: string, user: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY ausente — não dá para chamar o Codex");
  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com";
  const model = process.env.OPENAI_CODEX_MODEL || "gpt-5-codex";
  const r = await fetch(`${base.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(PRAZO_MS),
  });
  if (!r.ok) throw new Error(`Codex status ${r.status}`);
  const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content ?? "";
}

async function chamarOcta(system: string, user: string): Promise<string> {
  // O Octa roda no modelo da casa. Reusa o router (Vertex/Gemini ou local), que tem credencial.
  const { generate } = await import("@/lib/ai/router");
  const r = await generate(
    { level: "implementation", task: "chat" },
    { system, prompt: user, temperature: 0.3 },
  );
  return r.text ?? "";
}

/** O `ChamarModelo` real para o e2e. */
export const chamarModeloReal: ChamarModelo = (modelo, system, user) => {
  if (modelo === "claude") return chamarClaude(system, user);
  if (modelo === "codex") return chamarCodex(system, user);
  return chamarOcta(system, user);
};
