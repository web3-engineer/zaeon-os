/**
 * lib/llm/papeis.ts — os modelos da Contabo, cada um no papel que a CPU aguenta, com o Google cobrindo o resto.
 *
 *   gerarPapel("curto", req)  → tenta `zaeon-local-geral` (gpt-oss-20b) no gateway; falhou/timeout/vazio/ocupado →
 *                               o MESMO pedido no Vertex (os modelos de `google`, em ordem). Quem chama não vê a troca.
 *
 * Papéis (números medidos no PR — docs/MODELOS_LOCAIS_PAPEIS.md):
 *   guarda → llama-guard3 8B : moderação da mensagem do aluno, DEPOIS do turno (auditoria, nunca bloqueia).
 *   curto  → gpt-oss-20b     : classificar/titular curto em segundo plano (gatekeeper do cérebro, juiz da árvore),
 *                              reasoning_effort "low" (~50–140 tokens pensando + o JSON: 17–23 s quente).
 *
 * Por que não o qwen3 4B (zaeon-local-mini): o `qwen3:4b` do Ollama é o build THINKING-2507 — pensa sempre,
 * ignora /no_think, think:false e reasoning_effort, e gastou 700 tokens (133–175 s) sem chegar ao JSON.
 * Se o dono puxar o `qwen3:4b-instruct-2507` na Contabo, LOCAL_CURTO_MODELO=zaeon-local-mini troca sem deploy.
 *
 * Regras:
 *   - Só fire-and-forget. A CPU dá 6–9 tok/s e carregar modelo frio leva até ~100 s: nada aqui entra no
 *     caminho de uma resposta em streaming.
 *   - Flag por papel, LIGADA por default quando há gateway: LOCAL_GUARDA / LOCAL_CURTO = "0" desliga
 *     (vai direto no Google) — basta mudar o .env e recriar o web, sem build.
 *   - Teto de chamadas em voo POR PROCESSO (o Ollama da Contabo roda NUM_PARALLEL=1 e um request abortado
 *     continua lá dentro): passou do teto, o pedido vai direto pro Google em vez de enfileirar na CPU.
 *   - O ledger grava as duas tentativas (alvo "contabo" na que foi pra lá, "vertex" no fallback).
 */
import { gerar, type Deps, type GerarReq, type GerarRes } from "@/lib/llm/envelope";
import { GEMINI_MODEL_FLASH } from "@/lib/ai/model";
import { gatewayLigado } from "@/lib/llm/usage";

export type Papel = "guarda" | "curto";

type Env = Record<string, string | undefined>;

export type DefPapel = {
  /** Grupo do LiteLLM da VPS (infra/litellm.config.yaml). */
  modeloLocal: string;
  /** Env que troca o grupo local sem deploy. */
  envModelo?: string;
  /** Env que desliga o papel ("0"/"off"/"false"). */
  flag: string;
  /** Teto da tentativa local. Folgado: ninguém espera nenhum deles (frio medido: guard 52 s, gpt-oss 112–120 s). */
  timeoutMs: number;
  /** Fallback Google, em ordem: o 1º que responder. */
  google: () => string[];
  /** Chamadas locais simultâneas por processo antes de mandar direto pro Google. */
  maxEmVoo: number;
  /** Campos extras do corpo OpenAI pro modelo local (desligar o "pensar" que a CPU não paga). */
  extra?: Record<string, unknown>;
};

/** flash-lite do Vertex (global) — o mesmo da reserva do pool. Override: GEMINI_MODEL_LITE. */
const LITE = () => process.env.GEMINI_MODEL_LITE || "gemini-3.5-flash-lite";

export const PAPEIS: Record<Papel, DefPapel> = {
  guarda: { modeloLocal: "zaeon-local-guard", flag: "LOCAL_GUARDA", timeoutMs: 90_000, maxEmVoo: 2, google: () => [LITE(), GEMINI_MODEL_FLASH] },
  curto: {
    modeloLocal: "zaeon-local-geral", envModelo: "LOCAL_CURTO_MODELO", flag: "LOCAL_CURTO", timeoutMs: 150_000, maxEmVoo: 1,
    google: () => [GEMINI_MODEL_FLASH], extra: { reasoning_effort: "low" },
  },
};

const DESLIGADO = /^(0|off|false|nao|não|no)$/i;

/** Key que enxerga os grupos zaeon-local-* no gateway: GATEWAY_KEY_LOCAL > GATEWAY_MASTER_KEY. */
export function chaveLocal(env: Env = process.env): string | null {
  return env.GATEWAY_KEY_LOCAL?.trim() || env.GATEWAY_MASTER_KEY?.trim() || null;
}

/** O papel vai tentar a Contabo? (flag não desligada + gateway + key). */
export function papelLocalLigado(papel: Papel, env: Env = process.env): boolean {
  const f = env[PAPEIS[papel].flag]?.trim();
  if (f && DESLIGADO.test(f)) return false;
  return gatewayLigado(env) && Boolean(chaveLocal(env));
}

/** Qwen3/gpt-oss podem devolver o raciocínio no conteúdo — fica só a resposta. O Qwen3 thinking abre o
 *  <think> no template, então às vezes só o </think> aparece: tudo antes do último fechamento sai. */
export function limparPensamento(texto: string): string {
  let t = String(texto ?? "");
  const fim = t.toLowerCase().lastIndexOf("</think>");
  if (fim >= 0) t = t.slice(fim + "</think>".length);
  return t.replace(/<think>[\s\S]*$/i, "").trim();
}

const emVoo: Record<Papel, number> = { guarda: 0, curto: 0 };
/** Só pra teste. */
export const _emVoo = emVoo;

export type PapelRes = GerarRes & {
  papel: Papel;
  /** Por que o local não serviu (undefined = serviu). */
  fallback?: "desligado" | "ocupado" | "erro" | "vazio";
};

export type ReqPapel = Omit<GerarReq, "model" | "rota" | "extra" | "chaveGateway" | "timeoutMs"> & {
  /** Teto da chamada Google do fallback (a local usa o do papel). */
  timeoutMs?: number;
  /** Valida a resposta local além de "não vazia" (ex.: JSON parseável). false = cai pro Google. */
  aceita?: (texto: string) => boolean;
  /** System SÓ do fallback Google (modelo local que já sabe a tarefa, como o llama-guard). Vence `system`. */
  systemGoogle?: string;
};

export async function gerarPapel(papel: Papel, req: ReqPapel, deps: Deps = {}): Promise<PapelRes> {
  const env = deps.env ?? process.env;
  const def = PAPEIS[papel];
  const { aceita, timeoutMs, systemGoogle, ...base } = req;
  const ctx = { ...base.ctx, phase: base.ctx.phase ?? papel };

  let fallback: PapelRes["fallback"];
  if (!papelLocalLigado(papel, env)) fallback = "desligado";
  else if (emVoo[papel] >= def.maxEmVoo) fallback = "ocupado";
  else {
    emVoo[papel]++;
    try {
      const r = await gerar({
        ...base, ctx, model: (def.envModelo && env[def.envModelo]?.trim()) || def.modeloLocal, rota: "gateway", timeoutMs: def.timeoutMs,
        chaveGateway: chaveLocal(env), ...(def.extra ? { extra: def.extra } : {}),
      }, deps);
      const texto = limparPensamento(r.texto);
      if (texto && (!aceita || aceita(texto))) return { ...r, texto, papel };
      fallback = "vazio";
    } catch (e) {
      fallback = "erro";
      console.warn(`[papeis] ${papel} local falhou — Google: ${String((e as any)?.message ?? e).slice(0, 160)}`);
    } finally {
      emVoo[papel]--;
    }
  }

  // Google: o mesmo pedido, rota vertex, modelo de verdade. Erro no último modelo sobe pra quem chamou.
  const modelos = def.google();
  let ultimoErro: unknown = null;
  for (const m of modelos) {
    try {
      const r = await gerar({
        ...base, ctx, model: m, rota: "vertex", ...(timeoutMs ? { timeoutMs } : {}), ...(systemGoogle ? { system: systemGoogle } : {}),
      }, deps);
      return { ...r, papel, fallback };
    } catch (e) {
      ultimoErro = e;
    }
  }
  throw ultimoErro;
}

/** = gerarPapel com json:true + parse (cercas ```json toleradas). Resposta local que não parseia cai pro Google. */
export async function gerarPapelJson<T>(papel: Papel, req: Omit<ReqPapel, "json" | "aceita">, deps: Deps = {}): Promise<{ valor: T; res: PapelRes }> {
  const res = await gerarPapel(papel, { ...req, json: true, aceita: (t) => parseJson(t) !== undefined }, deps);
  const valor = parseJson(res.texto);
  if (valor === undefined) throw new Error(`papel ${papel}: resposta sem JSON (${res.alvo ?? res.provedor})`);
  return { valor: valor as T, res };
}

function parseJson(texto: string): unknown {
  const t = String(texto ?? "").replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  if (!t) return undefined;
  try { return JSON.parse(t); } catch { /* o 4B às vezes fala antes do objeto */ }
  const m = /\{[\s\S]*\}/.exec(t);
  if (!m) return undefined;
  try { return JSON.parse(m[0]); } catch { return undefined; }
}
