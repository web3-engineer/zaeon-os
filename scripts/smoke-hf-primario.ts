/**
 * scripts/smoke-hf-primario.ts — smoke do envelope REAL com LLM_PRIMARIO=hf contra o router do Hugging Face.
 * Vertex = stub (só conta se foi chamado); ledger = no-op (não toca Mongo). Custa centavos (~6k tokens no gpt-oss).
 *
 *   HF_TOKEN=… npx tsx --tsconfig tsconfig.json scripts/smoke-hf-primario.ts
 *
 * Mede: latência de texto (3×), JSON mode, tier pro, saída longa (32k de teto, como o PaperOrchestra) e a queda pro
 * Google quando o provedor do HF está desligado (baseten). Nunca imprime o token.
 */
import { gerar, gerarJson } from "@/lib/llm/envelope";
const ctx = { agentKey: "smoke", surface: "outro" as const };
let vertexChamado = 0;
const base = { registrar: async () => true, vertex: async (_r: any, modelo: string) => { vertexChamado++; return { texto: '{"via":"google-stub"}', usage: { promptTokens: 0, completionTokens: 0, cachedTokens: 0, totalTokens: 0, reportado: false }, modelo }; } };
const env = { ...process.env, LLM_PRIMARIO: "hf" };
(async () => {
  for (let i = 1; i <= 3; i++) {
    const r = await gerar({ system: "Você é a Aura, tutora.", user: "Explique em 2 frases o que é fotossíntese.", ctx }, { ...base, env } as any);
    console.log(`texto #${i}: ${r.ms} ms provedor=${r.provedor} modelo=${r.modelo} out=${r.usage.completionTokens} "${r.texto.slice(0, 70).replace(/\n/g, " ")}…"`);
  }
  const t0 = Date.now();
  const j = await gerarJson<{ conceito: string; passos: string[] }>({ system: "Responda só JSON.", user: 'Devolva {"conceito": string, "passos": string[3]} sobre mitose.', ctx }, { ...base, env } as any);
  console.log(`json: ${Date.now() - t0} ms chaves=${Object.keys(j).join(",")} passos=${j.passos?.length}`);
  const tp = Date.now();
  const p = await gerar({ user: "Compare em 3 frases mitose e meiose.", model: "gemini-2.5-pro", ctx }, { ...base, env } as any);
  console.log(`pro: ${Date.now() - tp} ms provedor=${p.provedor} out=${p.usage.completionTokens}`);
  const tl = Date.now();
  const l = await gerar({ user: "Escreva a seção 'Revisão de literatura' de um TCC sobre IA na educação básica no Brasil, com no mínimo 3000 palavras, 6 subseções numeradas e citações no formato (AUTOR, ano).", maxOutputTokens: 32_768, timeoutMs: 120_000, ctx }, { ...base, env } as any);
  console.log(`longo: ${Date.now() - tl} ms finish=${l.finishReason} out=${l.usage.completionTokens} palavras=${l.texto.split(/\s+/).length}`);
  const tf = Date.now();
  const f = await gerar({ user: "oi", json: true, ctx }, { ...base, env: { ...env, HF_PRIMARIO_MODELOS: "openai/gpt-oss-120b:baseten" } } as any);
  console.log(`queda: HF com provedor desligado → ${f.provedor} (${f.texto}) em ${Date.now() - tf} ms`);
  console.log(`vertex (stub) chamado ${vertexChamado}× — esperado 1 (só na queda)`);
})().catch((e) => { console.error("FALHOU", String(e?.message ?? e).slice(0, 200)); process.exit(1); });
