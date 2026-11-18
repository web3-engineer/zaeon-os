/**
 * lib/llm/local.ts — a PORTA DA FRENTE dos modelos locais da Contabo (CPU, sem GPU; o dado não sai da máquina).
 *
 * `papeis.ts` usa os locais em 2 papéis engessados (curto/artefato) e SÓ fire-and-forget. Aqui qualquer fluxo
 * pede o local DE PROPÓSITO — "texto" (LFM2-8B-A1B) ou "codigo" (qwen3-coder 30B, que o app ainda não usava) —
 * local-first com Google atrás, e SEM a trava de fire-and-forget: pode entrar no caminho ao vivo.
 *
 *   gerarLocal({ modelo: "codigo", google: [GEMINI_MODEL_PRO] }, req)
 *     → tenta `zaeon-local-coder` no gateway (por nome, key que enxerga zaeon-local-*); falhou/timeout/vazio/
 *       ocupado → o MESMO pedido nos modelos `google`, em ordem. `res.local` diz quem serviu (true = Contabo).
 *     → `google: []` desliga a rede: o motivo do fallback sobe como erro pra quem chamou (gate local PURO).
 *
 * Teto de em-voo por GRUPO REAL (o Ollama roda NUM_PARALLEL=1): estourou → direto pro Google, em vez de
 * enfileirar na CPU. Dívida conhecida: este contador e o de `papeis.ts` (por papel) não se enxergam — os dois
 * batem no mesmo LFM2; unificar num gate de concorrência por backend numa fatia futura.
 *
 * Desligar sem deploy: LOCAL_DIRETO="0"/"off" (flag-mestre do gate) → tudo vai direto pro Google.
 * Trocar o grupo real sem deploy: LOCAL_TEXTO_MODELO / LOCAL_CODIGO_MODELO.
 */
import { gerar, type Deps, type GerarReq, type GerarRes } from "@/lib/llm/envelope";
import { chaveLocal, limparPensamento } from "@/lib/llm/papeis";
import { gatewayLigado } from "@/lib/llm/usage";

type Env = Record<string, string | undefined>;

export type LocalModelo = "texto" | "codigo";

/** Grupo do LiteLLM da VPS (infra/litellm.config.yaml) + env que troca o grupo sem deploy. */
export const GRUPOS: Record<LocalModelo, { grupo: string; envModelo: string }> = {
  texto: { grupo: "zaeon-local-lfm2", envModelo: "LOCAL_TEXTO_MODELO" },
  codigo: { grupo: "zaeon-local-coder", envModelo: "LOCAL_CODIGO_MODELO" },
};

/** Teto PADRÃO da tentativa local (quem chama pode sobrepor). Folgado: ninguém espera o local. */
const TIMEOUT_PADRAO: Record<LocalModelo, number> = { texto: 120_000, codigo: 300_000 };

const DESLIGADO = /^(0|off|false|nao|não|no)$/i;

/** O gate direto está ligado? (flag-mestre não desligada + gateway + key que enxerga zaeon-local-*). */
export function localLigado(env: Env = process.env): boolean {
  const f = env.LOCAL_DIRETO?.trim();
  if (f && DESLIGADO.test(f)) return false;
  return gatewayLigado(env) && Boolean(chaveLocal(env));
}

/** Nome do grupo real de um modelo local, com o override de env aplicado. */
export function grupoDe(modelo: LocalModelo, env: Env = process.env): string {
  const g = GRUPOS[modelo];
  return (g.envModelo && env[g.envModelo]?.trim()) || g.grupo;
}

/** Em voo por GRUPO real (o Ollama é NUM_PARALLEL=1). */
const emVoo: Record<string, number> = {};
/** Só pra teste. */
export const _emVoo = emVoo;

export type OpcoesLocal = {
  /** Qual modelo local: "texto" (LFM2) ou "codigo" (qwen3-coder). */
  modelo: LocalModelo;
  /** Fallback Google, em ordem: o 1º que responder. `[]` = gate PURO (erro sobe em vez de cair no Google). */
  google: string[];
  /** Teto da tentativa local. Default por modelo (TIMEOUT_PADRAO). O Google usa o `timeoutMs` do req. */
  timeoutMs?: number;
  /** Chamadas locais simultâneas no MESMO grupo antes de mandar direto pro Google. Default 1. */
  maxEmVoo?: number;
  /** Valida a resposta local além de "não vazia" (ex.: JSON parseável). false = cai pro Google. */
  aceita?: (texto: string) => boolean;
  /** System SÓ do fallback Google (quando o modelo local já sabe a tarefa sem ele). Vence `system`. */
  systemGoogle?: string;
  /** Campos extras do corpo OpenAI pro modelo local (ex.: desligar o "pensar" que a CPU não paga). */
  extra?: Record<string, unknown>;
};

export type ReqLocal = Omit<GerarReq, "model" | "rota" | "chaveGateway" | "extra">;

export type LocalRes = GerarRes & {
  /** true = serviu o modelo da Contabo; false = serviu o Google. */
  local: boolean;
  /** Por que o local não serviu (undefined = serviu). */
  fallback?: "desligado" | "ocupado" | "erro" | "vazio";
};

/**
 * Pede o modelo local DE PROPÓSITO, com Google atrás. Espelha o gerarPapel, mas é genérico (qualquer
 * modelo/fluxo) e sem a trava de fire-and-forget.
 */
export async function gerarLocal(opts: OpcoesLocal, req: ReqLocal, deps: Deps = {}): Promise<LocalRes> {
  const env = deps.env ?? process.env;
  const { modelo, google, timeoutMs, maxEmVoo = 1, aceita, systemGoogle, extra } = opts;
  const grupo = grupoDe(modelo, env);
  const tetoLocal = timeoutMs ?? TIMEOUT_PADRAO[modelo];

  let fallback: LocalRes["fallback"];
  if (!localLigado(env)) fallback = "desligado";
  else if ((emVoo[grupo] ?? 0) >= maxEmVoo) fallback = "ocupado";
  else {
    emVoo[grupo] = (emVoo[grupo] ?? 0) + 1;
    try {
      const r = await gerar(
        { ...req, model: grupo, rota: "gateway", timeoutMs: tetoLocal, chaveGateway: chaveLocal(env), ...(extra ? { extra } : {}) },
        deps,
      );
      const texto = limparPensamento(r.texto);
      if (texto && (!aceita || aceita(texto))) return { ...r, texto, local: true };
      fallback = "vazio";
    } catch (e) {
      fallback = "erro";
      console.warn(`[local] ${modelo} (${grupo}) falhou — Google: ${String((e as any)?.message ?? e).slice(0, 160)}`);
    } finally {
      emVoo[grupo]--;
    }
  }

  // Gate PURO: sem modelos Google, o motivo do fallback sobe como erro (quem chamou decide o que fazer).
  if (google.length === 0) throw new Error(`modelo local "${modelo}" indisponível (${fallback}) e sem fallback Google`);

  // Google: o mesmo pedido, rota vertex, modelo de verdade. Erro no último modelo sobe pra quem chamou.
  let ultimoErro: unknown = null;
  for (const m of google) {
    try {
      const r = await gerar({ ...req, model: m, rota: "vertex", ...(systemGoogle ? { system: systemGoogle } : {}) }, deps);
      return { ...r, local: false, fallback };
    } catch (e) {
      ultimoErro = e;
    }
  }
  throw ultimoErro;
}

/** = gerarLocal com json:true + parse (cercas ```json toleradas). Resposta local que não parseia cai pro Google. */
export async function gerarLocalJson<T>(
  opts: Omit<OpcoesLocal, "aceita">,
  req: Omit<ReqLocal, "json">,
  deps: Deps = {},
): Promise<{ valor: T; res: LocalRes }> {
  const res = await gerarLocal({ ...opts, aceita: (t) => parseJson(t) !== undefined }, { ...req, json: true }, deps);
  const valor = parseJson(res.texto);
  if (valor === undefined) throw new Error(`local "${opts.modelo}": resposta sem JSON (${res.alvo ?? res.provedor})`);
  return { valor: valor as T, res };
}

function parseJson(texto: string): unknown {
  const t = String(texto ?? "").replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  if (!t) return undefined;
  try { return JSON.parse(t); } catch { /* às vezes o modelo fala antes do objeto */ }
  const m = /\{[\s\S]*\}/.exec(t);
  if (!m) return undefined;
  try { return JSON.parse(m[0]); } catch { return undefined; }
}
