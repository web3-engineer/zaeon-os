/**
 * lib/orquestra/provedores.ts — os MODELOS ABERTOS que a orquestra usa, por API compatível com OpenAI.
 *
 * Por que não o envelope (lib/llm/envelope): o envelope fala JSON-no-prompt de propósito, pra caber
 * na reserva do Hugging Face (ver o cabeçalho de lib/agent/acao.ts). Os motores daqui precisam do
 * contrário: FUNCTION-CALLING NATIVO com raciocínio entre as chamadas, que é exatamente o que o
 * DeepSeek V4, o Kimi K2.6 e o Tongyi DeepResearch foram treinados pra fazer.
 *
 * As três regras que o envelope não tinha e este cliente tem (docs/ORQUESTRA.md §diagnóstico):
 *  1. CANCELAMENTO REAL — o fetch recebe o AbortSignal do prazo da tarefa;
 *  2. 429/5xx tentam DE NOVO no mesmo modelo (Retry-After ou backoff exponencial com jitter), e
 *     nunca dormem além do prazo. Trocar de FAMÍLIA de modelo é decisão do roteador, não do cliente:
 *     a "rota" seguinte é o MESMO modelo por outro provedor (DeepSeek direto → OpenRouter);
 *  3. cada chamada vai pro TokenLedger com o id da tarefa.
 *
 * Os ids de modelo mudam rápido; todos são sobrescrevíveis por env (ORQ_MODELO_*). Valores padrão
 * conferidos em nov/2026: DeepSeek `deepseek-v4-pro`/`deepseek-v4-flash` (api.deepseek.com), Moonshot
 * `kimi-k2.6` (api.moonshot.ai/v1), Tongyi `alibaba/tongyi-deepresearch-30b-a3b` (OpenRouter).
 */
import type { Usage } from "@/lib/llm/usage";
import type { Origem, LedgerBase } from "@/lib/orquestra/contrato";
import { esperar, ehPrazo, PrazoEsgotado, type Prazo } from "@/lib/orquestra/prazo";

type Env = Record<string, string | undefined>;

// ───────────────────────────── provedores ─────────────────────────────
export type ProvedorId = "deepseek" | "moonshot" | "openrouter" | "dashscope";

type Provedor = {
  base(env: Env): string;
  chave(env: Env): string | undefined;
  cabecalhos?(env: Env): Record<string, string>;
  /**
   * Devolve o `reasoning_content` nas mensagens do assistente dentro da MESMA tarefa. O DeepSeek
   * (modo pensar + tools) e o Kimi pedem isso pra continuar o raciocínio entre as chamadas; o
   * OpenRouter normaliza por conta própria, e mandar o campo pra quem não conhece é arriscar 400.
   */
  raciocinioDeVolta: boolean;
};

export const PROVEDORES: Record<ProvedorId, Provedor> = {
  deepseek: {
    base: (env) => env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com",
    chave: (env) => env.DEEPSEEK_API_KEY?.trim() || undefined,
    raciocinioDeVolta: true,
  },
  moonshot: {
    base: (env) => env.MOONSHOT_BASE_URL?.trim() || "https://api.moonshot.ai/v1",
    chave: (env) => env.MOONSHOT_API_KEY?.trim() || undefined,
    raciocinioDeVolta: true,
  },
  openrouter: {
    base: (env) => env.OPENROUTER_BASE_URL?.trim() || "https://openrouter.ai/api/v1",
    chave: (env) => env.OPENROUTER_API_KEY?.trim() || undefined,
    cabecalhos: (env) => ({
      "HTTP-Referer": env.OPENROUTER_SITE_URL || "https://zaeon.com.br",
      "X-Title": env.OPENROUTER_SITE_NAME || "Zaeon",
    }),
    raciocinioDeVolta: false,
  },
  dashscope: {
    base: (env) => env.DASHSCOPE_BASE_URL?.trim() || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    chave: (env) => env.DASHSCOPE_API_KEY?.trim() || undefined,
    raciocinioDeVolta: false,
  },
};

// ───────────────────────────── modelos (família → rotas) ─────────────────────────────
export type ModeloId = "deepseek-v4-pro" | "deepseek-v4-flash" | "kimi-k2.6" | "tongyi-deepresearch" | "qwen";

type Rota = { provedor: ProvedorId; modelo: (env: Env) => string };
type ModeloSpec = { nome: string; familia: Origem; rotas: Rota[] };

/** A ORDEM das rotas é a ordem de tentativa: direto do laboratório primeiro, OpenRouter como reserva do MESMO modelo. */
export const MODELOS: Record<ModeloId, ModeloSpec> = {
  "deepseek-v4-pro": {
    nome: "DeepSeek V4 Pro", familia: "deepseek",
    rotas: [
      { provedor: "deepseek", modelo: (e) => e.ORQ_MODELO_DEEPSEEK_PRO || "deepseek-v4-pro" },
      { provedor: "openrouter", modelo: (e) => e.ORQ_OR_DEEPSEEK_PRO || "deepseek/deepseek-v4-pro" },
    ],
  },
  "deepseek-v4-flash": {
    nome: "DeepSeek V4 Flash", familia: "deepseek",
    rotas: [
      { provedor: "deepseek", modelo: (e) => e.ORQ_MODELO_DEEPSEEK_FLASH || "deepseek-v4-flash" },
      { provedor: "openrouter", modelo: (e) => e.ORQ_OR_DEEPSEEK_FLASH || "deepseek/deepseek-v4-flash" },
    ],
  },
  "kimi-k2.6": {
    nome: "Kimi K2.6", familia: "moonshot",
    rotas: [
      { provedor: "moonshot", modelo: (e) => e.ORQ_MODELO_KIMI || "kimi-k2.6" },
      { provedor: "openrouter", modelo: (e) => e.ORQ_OR_KIMI || "moonshotai/kimi-k2.6" },
    ],
  },
  "tongyi-deepresearch": {
    nome: "Tongyi DeepResearch", familia: "alibaba",
    rotas: [{ provedor: "openrouter", modelo: (e) => e.ORQ_OR_TONGYI || "alibaba/tongyi-deepresearch-30b-a3b" }],
  },
  qwen: {
    nome: "Qwen", familia: "alibaba",
    rotas: [
      { provedor: "dashscope", modelo: (e) => e.ORQ_MODELO_QWEN || "qwen-plus" },
      { provedor: "openrouter", modelo: (e) => e.ORQ_OR_QWEN || "qwen/qwen3-max" },
    ],
  },
};

export function rotasDisponiveis(modelo: ModeloId, env: Env): Rota[] {
  return MODELOS[modelo].rotas.filter((r) => !!PROVEDORES[r.provedor].chave(env));
}
export const modeloDisponivel = (modelo: ModeloId, env: Env): boolean => rotasDisponiveis(modelo, env).length > 0;

// ───────────────────────────── mensagens (formato OpenAI) ─────────────────────────────
export type ChamadaFerramenta = { id: string; nome: string; args: unknown; bruto: string };

export type Mensagem =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>; reasoning_content?: string }
  | { role: "tool"; tool_call_id: string; content: string };

export type PedidoModelo = {
  modelo: ModeloId;
  mensagens: Mensagem[];
  ferramentas?: Array<{ name: string; description: string; parameters: Record<string, unknown> }>;
  temperatura?: number;
  maxTokens?: number;
  json?: boolean;
  prazo: Prazo;
  ledger: LedgerBase & { taskId: string; phase: string };
};

export type RespostaModelo = {
  conteudo: string;
  raciocinio?: string;
  chamadas: ChamadaFerramenta[];
  uso: Usage;
  modelo: string;
  provedor: ProvedorId;
  ms: number;
  /** o provedor cortou por tamanho (finish_reason=length) */
  cortada: boolean;
};

export type ChamarModelo = (p: PedidoModelo) => Promise<RespostaModelo>;

export class ErroProvedor extends Error {
  constructor(readonly classe: "sem_rota" | "requisicao" | "provedor" | "auth" | "rate_limit", detalhe: string, readonly status?: number) {
    super(`[orquestra] ${classe}: ${detalhe}`);
    this.name = "ErroProvedor";
  }
}

// ───────────────────────────── retry ─────────────────────────────
const RETENTAVEL = new Set([408, 409, 425, 429, 500, 502, 503, 504, 529]);
const TROCA_ROTA = new Set([401, 402, 403, 404]);

/** Retry-After em segundos OU data HTTP → ms. Ausente/ilegível = null. */
export function lerRetryAfter(v: string | null | undefined, agora = Date.now()): number | null {
  if (!v) return null;
  const s = Number(v);
  if (Number.isFinite(s) && s >= 0) return s * 1000;
  const d = Date.parse(v);
  return Number.isFinite(d) ? Math.max(0, d - agora) : null;
}

/** backoff exponencial com jitter "cheio" (AWS): uniforme em [0, base·2^n], com teto */
export function atrasoDeRetry(tentativa: number, retryAfterMs: number | null, aleatorio: () => number = Math.random): number {
  const teto = 20_000;
  if (retryAfterMs != null) return Math.min(teto, retryAfterMs + Math.floor(aleatorio() * 250));
  return Math.min(teto, Math.floor(aleatorio() * 1000 * 2 ** tentativa) + 250);
}

// ───────────────────────────── a chamada ─────────────────────────────
export type DepsChamada = {
  env?: Env;
  fetchImpl?: typeof fetch;
  registrar?: (linha: import("@/lib/llm/ledger").LinhaLedger) => Promise<unknown> | void;
  aleatorio?: () => number;
};

const MAX_RETRIES = 2;
const TIMEOUT_CHAMADA_PADRAO = 120_000;

function lerUso(u: any): Usage {
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  if (!u || typeof u !== "object") return { promptTokens: 0, completionTokens: 0, cachedTokens: 0, totalTokens: 0, reportado: false };
  const cached = num(u.prompt_cache_hit_tokens) || num(u.prompt_tokens_details?.cached_tokens);
  const prompt = num(u.prompt_tokens);
  const completion = num(u.completion_tokens);
  return { promptTokens: Math.max(0, prompt - cached), completionTokens: completion, cachedTokens: cached, totalTokens: num(u.total_tokens) || prompt + completion, reportado: true };
}

function lerArgs(bruto: string): unknown {
  if (!bruto?.trim()) return {};
  try { return JSON.parse(bruto); } catch { /* segue */ }
  const m = bruto.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* segue */ } }
  return { _bruto: bruto };
}

function mensagensPara(provedor: ProvedorId, msgs: Mensagem[]): unknown[] {
  if (PROVEDORES[provedor].raciocinioDeVolta) return msgs;
  return msgs.map((m) => (m.role === "assistant" && "reasoning_content" in m ? (({ reasoning_content: _r, ...resto }) => resto)(m) : m));
}

export function criarChamarModelo(deps: DepsChamada = {}): ChamarModelo {
  return async (p) => {
    const env = deps.env ?? process.env;
    const fetchImpl = deps.fetchImpl ?? fetch;
    const rotas = rotasDisponiveis(p.modelo, env);
    if (!rotas.length) throw new ErroProvedor("sem_rota", `nenhuma chave configurada para ${p.modelo}`);
    const timeoutChamada = Number(env.ORQ_TIMEOUT_CHAMADA_MS) > 0 ? Number(env.ORQ_TIMEOUT_CHAMADA_MS) : TIMEOUT_CHAMADA_PADRAO;
    let ultimo: unknown = null;

    for (const rota of rotas) {
      const prov = PROVEDORES[rota.provedor];
      const nomeModelo = rota.modelo(env);
      for (let tentativa = 0; tentativa <= MAX_RETRIES; tentativa++) {
        if (p.prazo.expirou()) throw p.prazo.signal.reason ?? new PrazoEsgotado();
        const prazoChamada = p.prazo.filho(timeoutChamada, `chamada ${nomeModelo}`);
        const t0 = Date.now();
        const registrar = (ok: boolean, uso: Usage, erro: string | null) => {
          try {
            void deps.registrar?.({
              ...p.ledger, model: nomeModelo, provedor: rota.provedor, rota: "direta", usage: uso,
              ms: Date.now() - t0, ok, erro: (erro as any) ?? null, alvo: rota.provedor,
            });
          } catch { /* ledger nunca derruba a tarefa */ }
        };
        try {
          const corpo: Record<string, unknown> = {
            model: nomeModelo,
            messages: mensagensPara(rota.provedor, p.mensagens),
            ...(p.temperatura != null ? { temperature: p.temperatura } : {}),
            ...(p.maxTokens ? { max_tokens: p.maxTokens } : {}),
            ...(p.ferramentas?.length ? { tools: p.ferramentas.map((f) => ({ type: "function", function: f })), tool_choice: "auto" } : {}),
            ...(p.json ? { response_format: { type: "json_object" } } : {}),
          };
          const res = await fetchImpl(`${prov.base(env).replace(/\/+$/, "")}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${prov.chave(env)}`, ...(prov.cabecalhos?.(env) ?? {}) },
            body: JSON.stringify(corpo),
            signal: prazoChamada.signal,
          });
          if (!res.ok) {
            const texto = (await res.text().catch(() => "")).slice(0, 300);
            registrar(false, lerUso(null), res.status === 429 ? "rate_limit" : "provedor_fora");
            if (TROCA_ROTA.has(res.status)) { ultimo = new ErroProvedor("auth", `${rota.provedor} ${res.status} ${texto}`, res.status); break; }
            if (RETENTAVEL.has(res.status)) {
              ultimo = new ErroProvedor(res.status === 429 ? "rate_limit" : "provedor", `${rota.provedor} ${res.status} ${texto}`, res.status);
              if (tentativa === MAX_RETRIES) break;
              const espera = atrasoDeRetry(tentativa, lerRetryAfter(res.headers.get("retry-after")), deps.aleatorio);
              if (espera > p.prazo.restante() - 2_000) break; // não dorme além do prazo: tenta a próxima rota
              await esperar(espera, p.prazo);
              continue;
            }
            throw new ErroProvedor("requisicao", `${rota.provedor} ${res.status} ${texto}`, res.status);
          }
          const dados: any = await res.json();
          const escolha = dados?.choices?.[0];
          const msg = escolha?.message ?? {};
          const uso = lerUso(dados?.usage);
          registrar(true, uso, null);
          const chamadas: ChamadaFerramenta[] = Array.isArray(msg.tool_calls)
            ? msg.tool_calls
              .filter((c: any) => c?.function?.name)
              .map((c: any, i: number) => ({ id: String(c.id || `chamada_${i}`), nome: String(c.function.name), bruto: String(c.function.arguments ?? ""), args: lerArgs(String(c.function.arguments ?? "")) }))
            : [];
          return {
            conteudo: typeof msg.content === "string" ? msg.content : "",
            raciocinio: typeof msg.reasoning_content === "string" ? msg.reasoning_content : undefined,
            chamadas,
            uso,
            modelo: String(dados?.model || nomeModelo),
            provedor: rota.provedor,
            ms: Date.now() - t0,
            cortada: escolha?.finish_reason === "length",
          };
        } catch (e) {
          if (e instanceof ErroProvedor && e.classe === "requisicao") throw e;
          // o prazo da TAREFA caiu: não há rota que salve
          if (p.prazo.expirou()) throw p.prazo.signal.reason ?? new PrazoEsgotado();
          // caiu só o prazo DESTA chamada, ou a rede: conta como transitório
          if (ehPrazo(e) || e instanceof TypeError) {
            registrar(false, lerUso(null), "timeout");
            ultimo = e;
            if (tentativa === MAX_RETRIES) break;
            continue;
          }
          throw e;
        } finally {
          prazoChamada.liberar();
        }
      }
    }
    throw ultimo instanceof Error ? ultimo : new ErroProvedor("provedor", `todas as rotas de ${p.modelo} falharam`);
  };
}

/** o padrão de produção: ledger ligado no Prisma (import tardio, como o resto da casa) */
export const chamarModeloPadrao: ChamarModelo = criarChamarModelo({
  registrar: (linha) => import("@/lib/llm/ledger").then((m) => m.registrarTokens(linha)).catch(() => false),
});
