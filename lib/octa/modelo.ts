/**
 * lib/octa/modelo.ts — QUEM responde o Octa Code: o modelo de código da Contabo (qwen3-coder, grátis, CPU) com o
 * Google como reserva automática. Tudo por env de RUNTIME (sem rebuild): desligar = tirar OCTA_MODELO_LOCAL e recriar o web.
 *
 *   OCTA_MODELO_LOCAL=1          liga o local (sem ele: o Octa segue 100% no Google, exatamente como antes)
 *   OCTA_MODELO_LOCAL_NOME       grupo do gateway (default zaeon-local-coder → litellm.config.yaml)
 *   OCTA_MODELO_RESERVA          reserva Google (default vertex_ai/<GEMINI_MODEL> = 3.5-flash no global em prod)
 *   OCTA_LOCAL_TIMEOUT_MS        teto por passo no local (default 120 s)
 *   OCTA_LOCAL_ORCAMENTO_MS      teto de tempo no local por turno inteiro (default 240 s); estourou = resto no Google
 *   OCTA_LOCAL_MAX_PROMPT_TOK    prompt estimado acima disso vai direto pro Google (default 3000: o Ollama roda com 4096 de contexto)
 *   OCTA_LOCAL_PAUSA_MS          depois de uma falha do local, quanto tempo pular ele (default 120 s)
 *
 * Medido em 2026-10-21 (VPS → gateway → tailnet → Contabo, turno típico de revisão, ~550–700 tokens de prompt):
 * quente 19–61 s por passo (3–4 tok/s ponta a ponta); frio (carregar o coder) ~177 s no 1º passo.
 * Por isso: o 1º passo frio estoura os 120 s e cai no Google, e o Ollama termina de carregar sozinho (o próximo pega quente).
 * Reserva = falha, timeout, resposta vazia ou prompt grande demais. Caiu uma vez → o resto do turno fica no Google.
 */
import type { ChamarModelo, MsgModelo, RespostaModelo } from "@/lib/octa/agente";
import { modeloReal } from "@/lib/octa/litellm";

type Env = Record<string, string | undefined>;
const num = (v: string | undefined, d: number) => (Number(v) > 0 ? Number(v) : d);

export type EscolhaOcta = {
  local: string | null;
  reserva: string;
  timeoutMs: number;
  orcamentoMs: number;
  maxPromptTok: number;
  pausaMs: number;
};

export function escolhaModeloOcta(env: Env = process.env): EscolhaOcta {
  const ligado = env.OCTA_MODELO_LOCAL === "1";
  return {
    local: ligado ? env.OCTA_MODELO_LOCAL_NOME || "zaeon-local-coder" : null,
    // flag desligada = o modelo de sempre do Octa (o "forte"); ligada = o Google rápido de reserva
    reserva: ligado ? env.OCTA_MODELO_RESERVA || modeloReal("padrao", env as NodeJS.ProcessEnv) : modeloReal("forte", env as NodeJS.ProcessEnv),
    timeoutMs: num(env.OCTA_LOCAL_TIMEOUT_MS, 120_000),
    orcamentoMs: num(env.OCTA_LOCAL_ORCAMENTO_MS, 240_000),
    maxPromptTok: num(env.OCTA_LOCAL_MAX_PROMPT_TOK, 3000),
    pausaMs: num(env.OCTA_LOCAL_PAUSA_MS, 120_000),
  };
}

/** Estimativa barata de tokens do prompt (≈3,5 caracteres/token em pt/código). */
export const tokensDe = (msgs: MsgModelo[]) =>
  Math.ceil(msgs.reduce((n, m) => n + (m.content?.length ?? 0) + ("tool_calls" in m ? JSON.stringify(m.tool_calls ?? []).length : 0), 0) / 3.5);

/** Uma chamada ao gateway. `modeloId` = header x-litellm-model-id (ex.: "contabo-coder", "vertex-real"). */
export type ChamarGateway = (modelo: string, msgs: MsgModelo[], signal?: AbortSignal) => Promise<RespostaModelo & { modeloId?: string | null }>;

export type Servido = { modelo: string; modeloId?: string | null; ms: number; motivo?: string };

// Falha do local vale pro processo inteiro por `pausaMs`: Contabo fora não pode custar 120 s em todo turno.
let pausadoAte = 0;
export const _resetPausaOcta = () => { pausadoAte = 0; };

const vazia = (r: RespostaModelo) => !r.tool_calls?.length && !(r.content ?? "").trim();

/**
 * Monta o ChamarModelo de UM turno. `servidos` registra quem respondeu cada passo (vai pro log e pra resposta da rota).
 * Erro de orçamento (virtual key estourada) não cai pra reserva: é recusa, não falha do modelo.
 */
export function criarChamadorOcta(
  chamar: ChamarGateway,
  escolha: EscolhaOcta = escolhaModeloOcta(),
  agora: () => number = Date.now,
): ChamarModelo & { servidos: Servido[] } {
  const servidos: Servido[] = [];
  let caiu = false;
  let gastoLocal = 0;

  const f = (async (msgs: MsgModelo[]) => {
    let motivo: string | undefined;
    const t0 = agora();
    if (escolha.local && !caiu) {
      const resta = escolha.orcamentoMs - gastoLocal;
      if (t0 < pausadoAte) motivo = "local_em_pausa";
      else if (resta <= 0) motivo = "orcamento_local";
      else if (tokensDe(msgs) > escolha.maxPromptTok) motivo = "prompt_grande";
      else {
        try {
          const r = await chamar(escolha.local, msgs, AbortSignal.timeout(Math.min(escolha.timeoutMs, resta)));
          gastoLocal += agora() - t0;
          if (!vazia(r)) { servidos.push({ modelo: escolha.local, modeloId: r.modeloId, ms: agora() - t0 }); return r; }
          motivo = "resposta_vazia";
        } catch (e: any) {
          gastoLocal += agora() - t0;
          if (/orçamento/.test(String(e?.message))) throw e;
          motivo = e?.name === "TimeoutError" || e?.name === "AbortError" ? "timeout" : `erro: ${String(e?.message ?? e).slice(0, 120)}`;
        }
        if (motivo !== "resposta_vazia") pausadoAte = agora() + escolha.pausaMs;
      }
      caiu = true;
    }
    const t1 = agora();
    const r = await chamar(escolha.reserva, msgs);
    servidos.push({ modelo: escolha.reserva, modeloId: r.modeloId, ms: agora() - t1, motivo });
    return r;
  }) as ChamarModelo & { servidos: Servido[] };
  f.servidos = servidos;
  return f;
}

/** Nome pra tela: "vertex_ai/gemini-3.5-flash" → "gemini-3.5-flash", "zaeon-local-coder" → "qwen3-coder". */
export const nomeDoModelo = (m: string) => (m === "zaeon-local-coder" ? "qwen3-coder" : m.replace(/^vertex_ai\//, ""));
