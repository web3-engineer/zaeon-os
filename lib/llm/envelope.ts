/**
 * lib/llm/envelope.ts — contrato C5: a ÚNICA saída de LLM da camada autônoma (PR-G1/A1).
 *
 *   gerar(req)      → { texto, usage, modelo, provedor, finishReason, ms }
 *   gerarJson<T>()  → gerar({json:true}) + parse com os MESMOS erros diagnósticos do geminiJson legado
 *
 * Rotas: "vertex" (default; exatamente o que geminiJson/geminiText fazem hoje) e "gateway"
 * (LiteLLM OpenAI-compatible, só com GATEWAY_URL + key). Gateway caído/sem URL/sem key → cai para
 * o Vertex NA MESMA CHAMADA e grava provedor:"vertex" (é o que o health chama de degraded).
 * Erro de budget ("teto") NÃO cai para o Vertex: é indisponibilidade declarada (lei 5), relançada.
 * O ledger é fire-and-forget (void registrarTokens) ANTES do return — o turno nunca espera o banco.
 * Normalização de usage e classificação de erro vêm de lib/llm/usage.ts (puro, testado).
 */
import { usageDoVertex, usageDoOpenAI, classificarErroLlm, chaveDoAgente, gatewayLigado, type Usage, type ClasseErroLlm, USAGE_VAZIO } from "@/lib/llm/usage";
import { registrarTokens, type LedgerCtx } from "@/lib/llm/ledger";
import { parseJsonComLatex } from "@/lib/llm/latexJson";
import { GEMINI_MODEL_FLASH } from "@/lib/ai/model";
import { alvoDe, ehModeloLocal, ehModeloPool, poolConfigurado, type Alvo } from "@/lib/llm/pool";
import { HF_ROUTER_URL, erroPedeReserva, modeloSemProvedor, modelosReservaHf, reservaHfLigada, timeoutReservaHf } from "@/lib/llm/reservaHf";

export type Rota = "vertex" | "gateway";
export type { LedgerCtx, Alvo };
export type Mensagem = { role: "user" | "model"; text: string };
export type GerarReq = {
  system?: string;
  user?: string;                       // ou `messages` — um dos dois
  messages?: Mensagem[];
  json?: boolean;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
  maxOutputTokens?: number;
  rota?: Rota;
  /** Quantas vezes a fila já tentou este job (0 = primeira). Só entra no backoff do PoolEsgotadoError. */
  tentativa?: number;
  /** Só no stream do Vertex: sem o 1º pedaço de texto nesse prazo, desiste (e a reserva assume) — o prazo TOTAL
   *  (timeoutMs) continua valendo depois. Medido em prod: falha de rascunho custava o prazo inteiro (30 s). */
  prazoPrimeiroMs?: number;
  /** O "pensar" do modelo nesta chamada (lib/llm/pensar). Ausente = o padrão do modelo. Só no Vertex direto. */
  pensar?: import("@/lib/llm/pensar").NivelPensar;
  /** Só na rota gateway: campos a mais no corpo OpenAI (ex.: reasoning_effort dos modelos da Contabo). */
  extra?: Record<string, unknown>;
  /** Só na rota gateway: key explícita (vence a do agente). Os papéis da Contabo usam a key que enxerga zaeon-local-*. */
  chaveGateway?: string | null;
  ctx: LedgerCtx;
};
export type GerarRes = {
  texto: string;
  usage: Usage;
  modelo: string;
  provedor: "vertex" | "litellm" | "huggingface";
  rota: Rota;
  finishReason?: string;
  ms: number;
  /** Provedor UPSTREAM que serviu (Fatia 7): "vertex" na rota vertex; no gateway, pelo header x-litellm-model-id / model do corpo. */
  alvo?: Alvo;
  /** Só em json:true — o texto parseia como JSON (métrica §9.1). */
  jsonValido?: boolean;
};

/** Erro de LLM já classificado (relançado pelo envelope). `classe` decide quem trata (fila × agente × admin). */
export class ErroLlm extends Error {
  readonly classe: ClasseErroLlm;
  readonly provedor: "vertex" | "litellm" | "huggingface";
  readonly causa: unknown;
  constructor(classe: ClasseErroLlm, provedor: "vertex" | "litellm" | "huggingface", causa: unknown) {
    super(`llm:${classe}: ${String((causa as any)?.message ?? causa).slice(0, 300)}`);
    this.name = "ErroLlm"; this.classe = classe; this.provedor = provedor; this.causa = causa;
  }
}

/** Teto do backoff do pool (G4). */
export const POOL_BACKOFF_MAX_MS = 30 * 60_000;

/**
 * G4 — todos os alvos do pool estouraram (LiteLLM "No deployments available"). NÃO é erro de app:
 * a fila adia o job (lib/queue/reenfileirar.ts) e ele expira em 24h. O LiteLLM NÃO manda
 * Retry-After nesse 429 (issue #27823): sem header, o backoff é NOSSO — 60s × 2^tentativa, teto 30min.
 */
export class PoolEsgotadoError extends ErroLlm {
  readonly retryAfterMs: number;
  readonly alvosTentados: Alvo[];
  constructor(retryAfterMs: number, alvosTentados: Alvo[], causa: unknown) {
    super("pool_esgotado", "litellm", causa);
    this.name = "PoolEsgotadoError"; this.retryAfterMs = retryAfterMs; this.alvosTentados = alvosTentados;
  }
}

/** PURO. Header retry-after (s) → ms; senão "try again in N seconds" do corpo; senão 60s × 2^tentativa. Teto 30min. */
export function retryAfterDoPool(e: unknown, tentativa = 0): number {
  const hdr = Number((e as any)?.retryAfter);
  if (Number.isFinite(hdr) && hdr > 0) return Math.min(hdr * 1000, POOL_BACKOFF_MAX_MS);
  const m = /try again in (\d+(?:\.\d+)?)\s*s/i.exec(String((e as any)?.body ?? (e as any)?.message ?? ""));
  if (m) return Math.min(Math.ceil(Number(m[1]) * 1000), POOL_BACKOFF_MAX_MS);
  return Math.min(60_000 * 2 ** Math.max(0, Math.floor(tentativa)), POOL_BACKOFF_MAX_MS);
}

// ───────────────────────────── transportes (injetáveis p/ teste) ─────────────────────────────
export type RespostaBruta = { texto: string; usage: Usage; finishReason?: string; modelo: string; modelId?: string | null };
export type TransporteVertex = (req: GerarReq, modelo: string) => Promise<RespostaBruta>;
/** Transporte de STREAM do Vertex: chama `onTexto(acumulado)` a cada pedaço e devolve a resposta bruta final. */
export type TransporteVertexStream = (req: GerarReq, modelo: string, onTexto: (acumulado: string) => void) => Promise<RespostaBruta>;
export type Deps = { vertex?: TransporteVertex; vertexStream?: TransporteVertexStream; fetchImpl?: typeof fetch; env?: Record<string, string | undefined>; registrar?: typeof registrarTokens; agora?: () => number;
  /** o Vertex ACABOU de falhar neste mesmo pedido (o stream): tenta a reserva antes de chamá-lo de novo */
  pularVertex?: boolean;
  /**
   * O HF é o caminho ESCOLHIDO deste pedido, não um resgate — o Vertex não foi tentado e não falhou
   * (disparos com `DISPAROS_HF=1`, lib/llm/reservaHf). Só muda o LOG: sem isto, um disparo que o HF
   * serviu com sucesso imprimia "Vertex falhou", e quem fosse depurar iria caçar uma falha do Vertex
   * que nunca houve. `pularVertex` sozinho não distingue os dois casos: o stream também o liga, e lá
   * o Vertex realmente falhou.
   */
  hfPrimario?: boolean };

// ───────────────────────────── disjuntor do Vertex ─────────────────────────────
// Medido em prod (out/2026, 7 dias): 9% dos rascunhos falharam, cada falha custando o prazo inteiro (30 s) ANTES de a
// reserva começar. Várias falhas seguidas = o Vertex está engasgado: os próximos pedidos vão direto pra reserva por um
// tempo, sem pagar o prazo de novo. Só pula o Vertex se a reserva estiver ligada e responder.
const FALHAS_QUE_CONTAM = new Set<ClasseErroLlm>(["timeout", "rate_limit", "cota_esgotada", "provedor_fora"]);
const numEnv = (v: string | undefined, padrao: number) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : padrao; };
const disjuntorVertex = { falhas: [] as number[], abertoAte: 0 };
function falhaNoVertex(classe: ClasseErroLlm, agora: number, env: Record<string, string | undefined>): void {
  if (!FALHAS_QUE_CONTAM.has(classe)) return;
  const janela = numEnv(env.VERTEX_DISJUNTOR_JANELA_MS, 60_000);
  disjuntorVertex.falhas = [...disjuntorVertex.falhas.filter((t) => agora - t < janela), agora];
  if (disjuntorVertex.falhas.length >= numEnv(env.VERTEX_DISJUNTOR_FALHAS, 3)) {
    disjuntorVertex.abertoAte = agora + numEnv(env.VERTEX_DISJUNTOR_PAUSA_MS, 30_000);
    disjuntorVertex.falhas = [];
    console.warn("[llm] disjuntor do Vertex ABERTO — reserva direto por um tempo");
  }
}
export const vertexEngasgado = (agora: number = Date.now()) => agora < disjuntorVertex.abertoAte;
/** (testes) fecha o disjuntor */
export const _zerarDisjuntorVertex = () => { disjuntorVertex.falhas = []; disjuntorVertex.abertoAte = 0; };

const DEFAULT_TIMEOUT_MS = Number(process.env.SCHOLAR_GEMINI_TIMEOUT_MS || 30_000);

/** Vertex direto: reusa makeVertex/extractText/withTimeout de lib/scholar/gemini.ts (import tardio: o SDK é pesado). */
const vertexReal: TransporteVertex = async (req, modelo) => {
  const { makeVertex, extractText, withTimeout } = await import("@/lib/scholar/gemini");
  const { thinkingConfigDo } = await import("@/lib/llm/pensar");
  const model = makeVertex().getGenerativeModel({
    model: modelo,
    generationConfig: {
      temperature: req.temperature ?? (req.json ? 0.2 : 0.5),
      ...(req.json ? { responseMimeType: "application/json" } : {}),
      ...(req.maxOutputTokens ? { maxOutputTokens: req.maxOutputTokens } : {}),
      ...thinkingConfigDo(modelo, req.pensar),
    } as any,
    ...(req.system ? { systemInstruction: { role: "system", parts: [{ text: req.system }] } } : {}),
  });
  const contents = contentsDe(req).map((m) => ({ role: m.role, parts: [{ text: m.text }] }));
  const result: any = await withTimeout(model.generateContent({ contents }), req.timeoutMs ?? DEFAULT_TIMEOUT_MS, "Gemini");
  return {
    texto: extractText(result),
    usage: usageDoVertex(result?.response?.usageMetadata),
    finishReason: result?.response?.candidates?.[0]?.finishReason,
    modelo,
  };
};

/**
 * Lê o stream do Gemini com DOIS prazos: até o 1º pedaço de texto (`prazoPrimeiroMs`, opcional) e o total. As partes
 * de "pensamento" ficam de fora. Estourou: lança "timeout" (e o stream abandonado não vira unhandled rejection).
 */
export async function lerStreamComPrazos(
  abrir: () => Promise<{ stream: AsyncIterable<any>; response?: Promise<any> }>,
  onTexto: (acumulado: string) => void, prazoPrimeiroMs: number | undefined, prazoMs: number,
): Promise<{ r: any; acc: string }> {
  const withTimeout = <T,>(p: Promise<T>, ms: number, label: string) => new Promise<T>((ok, erro) => {
    const t = setTimeout(() => erro(new Error(`${label} timeout (${ms}ms)`)), ms);
    p.then((v) => { clearTimeout(t); ok(v); }, (e) => { clearTimeout(t); erro(e); });
  });
  let acc = "";
  let tPrimeiro: ReturnType<typeof setTimeout> | undefined;
  const semPrimeiro = prazoPrimeiroMs
    ? new Promise<never>((_, rej) => { tPrimeiro = setTimeout(() => rej(new Error(`Gemini timeout: sem o 1º pedaço em ${prazoPrimeiroMs}ms`)), prazoPrimeiroMs); })
    : null;
  semPrimeiro?.catch(() => undefined);
  const consumir = (async () => {
    const r = await abrir();
    for await (const ch of r.stream) {
      const t = (ch?.candidates?.[0]?.content?.parts ?? []).filter((p: any) => p && !p.thought).map((p: any) => (typeof p.text === "string" ? p.text : "")).join("");
      if (t) { if (tPrimeiro) { clearTimeout(tPrimeiro); tPrimeiro = undefined; } acc += t; onTexto(acc); }
    }
    return r;
  })();
  consumir.catch(() => undefined);   // abandonado no prazo: o erro tardio não vira unhandled rejection
  try { return { r: await withTimeout(semPrimeiro ? Promise.race([consumir, semPrimeiro]) : consumir, prazoMs, "Gemini (stream)"), acc }; }
  finally { if (tPrimeiro) clearTimeout(tPrimeiro); }
}

/** Vertex direto EM STREAM (o rascunho do chat — a prévia da resposta): mesmas opções do vertexReal; as partes de
 *  "pensamento" do modelo ficam de fora (como no extractText). */
const vertexStreamReal: TransporteVertexStream = async (req, modelo, onTexto) => {
  const { makeVertex, withTimeout } = await import("@/lib/scholar/gemini");
  const { thinkingConfigDo } = await import("@/lib/llm/pensar");
  const model = makeVertex().getGenerativeModel({
    model: modelo,
    generationConfig: {
      temperature: req.temperature ?? (req.json ? 0.2 : 0.5),
      ...(req.json ? { responseMimeType: "application/json" } : {}),
      ...(req.maxOutputTokens ? { maxOutputTokens: req.maxOutputTokens } : {}),
      ...thinkingConfigDo(modelo, req.pensar),
    } as any,
    ...(req.system ? { systemInstruction: { role: "system", parts: [{ text: req.system }] } } : {}),
  });
  const contents = contentsDe(req).map((m) => ({ role: m.role, parts: [{ text: m.text }] }));
  const prazo = req.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const { r, acc } = await lerStreamComPrazos(() => model.generateContentStream({ contents }), onTexto, req.prazoPrimeiroMs, prazo);
  const final: any = await r.response;
  return { texto: acc.trim(), usage: usageDoVertex(final?.usageMetadata), finishReason: final?.candidates?.[0]?.finishReason, modelo };
};

async function viaGateway(req: GerarReq, modelo: string, url: string, key: string, f: typeof fetch): Promise<RespostaBruta> {
  const messages: { role: string; content: string }[] = [];
  if (req.system) messages.push({ role: "system", content: req.system });
  for (const m of contentsDe(req)) messages.push({ role: m.role === "model" ? "assistant" : "user", content: m.text });
  const r = await f(`${url.replace(/\/+$/, "")}/v1/chat/completions`, {
    method: "POST", cache: "no-store", // o fetch do Next tem data cache; LLM nunca é cacheável
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: modelo, messages, temperature: req.temperature ?? (req.json ? 0.2 : 0.5),
      ...(req.maxOutputTokens ? { max_tokens: req.maxOutputTokens } : {}),
      ...(req.json ? { response_format: { type: "json_object" } } : {}),
      ...(req.extra ?? {}),
    }),
    signal: AbortSignal.timeout(req.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });
  const bruto = await r.text();
  let body: any = null;
  try { body = JSON.parse(bruto); } catch { throw Object.assign(new Error(`gateway: resposta não-JSON (HTTP ${r.status}): ${bruto.slice(0, 80)}`), { status: r.status, naoJson: true }); }
  if (!r.ok) throw Object.assign(new Error(body?.error?.message ?? body?.message ?? `gateway HTTP ${r.status}`), { status: r.status, body: bruto, retryAfter: r.headers.get("retry-after") });
  return {
    texto: String(body?.choices?.[0]?.message?.content ?? "").trim(),
    usage: usageDoOpenAI(body?.usage),
    finishReason: body?.choices?.[0]?.finish_reason,
    modelo: typeof body?.model === "string" && body.model ? body.model : modelo,
    modelId: r.headers.get("x-litellm-model-id"),
  };
}

/** Tira SÓ a cerca ```json em VOLTA do JSON. Antes apagava todo ``` do texto — inclusive o ```python de DENTRO da
 *  resposta da Aura, e o código saía como parágrafo, com o `# comentário` virando título (#634). */
export function semCercaJson(texto: string): string {
  return String(texto ?? "").trim().replace(/^```(?:json)?[ \t]*\n?/i, "").replace(/\n?```$/, "").trim();
}

/** O texto de uma resposta json:true parseia? (cercas ```json toleradas, como no gerarJson). */
export function textoJsonValido(texto: string): boolean {
  const t = semCercaJson(texto);
  if (!t) return false;
  try { JSON.parse(t); return true; } catch { return false; }
}

/** histórico (messages) + pergunta (user) — os dois podem vir juntos (geminiText com history). */
function contentsDe(req: GerarReq): Mensagem[] {
  const out: Mensagem[] = [...(req.messages ?? [])];
  if (req.user != null && req.user !== "") out.push({ role: "user", text: req.user });
  if (!out.length) out.push({ role: "user", text: "" });
  return out;
}

/**
 * Id do Gemini que o app usa → apelido do gateway que as virtual keys dos agentes liberam. ESPELHA o model_list de
 * infra/litellm.config.yaml (zaeon-flash/zaeon-pro): mandar o id cru dava 403 key_model_access_denied e o turno do
 * canal (Escritório) quebrava. Id fora da tabela segue cru.
 */
export const APELIDO_GATEWAY: Readonly<Record<string, string>> = { "gemini-3.5-flash": "zaeon-flash", "gemini-2.5-pro": "zaeon-pro" };
export const apelidoNoGateway = (modelo: string): string => APELIDO_GATEWAY[modelo] ?? modelo;

/** 403 do LiteLLM "modelo não liberado pra esta key" — o Vertex direto atende (não é auth quebrada). */
const keySemModelo = (e: unknown): boolean => /key_model_access_denied|not available for this api key/i.test(`${(e as any)?.message ?? ""} ${(e as any)?.body ?? ""}`);

/** Gateway caiu de um jeito que o Vertex direto resolve? (teto/cota/auth-de-agente NÃO: são declaráveis/nossos.) */
const caiParaVertex = (classe: ClasseErroLlm): boolean => classe === "provedor_fora" || classe === "timeout" || classe === "resposta_nao_json" || classe === "modelo_inexistente";

const avisouSemKey = new Set<string>();

// ───────────────────────────── gerar ─────────────────────────────
export async function gerar(req: GerarReq, deps: Deps = {}): Promise<GerarRes> {
  const env = deps.env ?? process.env;
  const agora = deps.agora ?? Date.now;
  const registrar = deps.registrar ?? registrarTokens;
  const modelo = req.model || GEMINI_MODEL_FLASH;
  const ini = agora();

  let rota: Rota = req.rota === "gateway" && gatewayLigado(env) ? "gateway" : "vertex";
  let key: string | null = null;
  if (rota === "gateway") {
    key = req.chaveGateway?.trim() || chaveDoAgente(req.ctx.agentKey, env) || env.GATEWAY_MASTER_KEY?.trim() || null;
    if (!key) {
      if (!avisouSemKey.has(req.ctx.agentKey)) { avisouSemKey.add(req.ctx.agentKey); console.warn(`[llm] agente ${req.ctx.agentKey} sem GATEWAY_KEY_* nem GATEWAY_KEY_DEFAULT — Vertex direto`); }
      rota = "vertex";
    }
  }

  const jsonValido = (texto: string) => (req.json ? textoJsonValido(texto) : undefined);
  const gravar = (provedor: "vertex" | "litellm" | "huggingface", r: Rota, usage: Usage, ok: boolean, erro: ClasseErroLlm | null, m: string, alvo: Alvo, jv?: boolean) =>
    void registrar({ ...req.ctx, model: m, provedor, rota: r, usage, ms: agora() - ini, ok, erro, alvo, jsonValido: jv ?? null }).catch(() => undefined);

  // Pool grátis (Fatia 7) NUNCA cai no Vertex (§5.10): sem gateway/key, ou gateway com erro, relança.
  // Se caísse, "grátis" viraria crédito do negócio sem ninguém ver.
  const pool = ehModeloPool(modelo);
  if (pool && rota !== "gateway") {
    const e = new Error("pool grátis exige o gateway (GATEWAY_URL + key) — nunca cai no Vertex");
    gravar("litellm", "gateway", USAGE_VAZIO, false, "provedor_fora", modelo, alvoDe(modelo));
    throw new ErroLlm("provedor_fora", "litellm", e);
  }
  // Modelo da Contabo (zaeon-local-*) também não cai no Vertex AQUI: o Vertex não conhece esse nome.
  // Quem chama (lib/llm/papeis) decide o fallback Google com um modelo de verdade.
  const local = ehModeloLocal(modelo);
  if (local && rota !== "gateway") {
    gravar("litellm", "gateway", USAGE_VAZIO, false, "provedor_fora", modelo, "contabo");
    throw new ErroLlm("provedor_fora", "litellm", new Error("modelo da Contabo exige o gateway (GATEWAY_URL + key)"));
  }

  if (rota === "gateway") {
    try {
      const r = await viaGateway(req, apelidoNoGateway(modelo), env.GATEWAY_URL!.trim(), key!, deps.fetchImpl ?? fetch);
      const alvo = alvoDe(r.modelo, r.modelId), jv = jsonValido(r.texto);
      gravar("litellm", "gateway", r.usage, true, null, r.modelo, alvo, jv);
      const { modelId: _id, ...resto } = r;
      return { ...resto, provedor: "litellm", rota: "gateway", ms: agora() - ini, alvo, ...(jv === undefined ? {} : { jsonValido: jv }) };
    } catch (e) {
      let classe: ClasseErroLlm = (e as any)?.naoJson ? "resposta_nao_json" : classificarErroLlm(e);
      // 429 com retry-after num grupo do pool = o router esgotou os alvos (G4).
      if (pool && (classe === "rate_limit" || classe === "cota_esgotada") && (e as any)?.retryAfter) classe = "pool_esgotado";
      gravar("litellm", "gateway", USAGE_VAZIO, false, classe, modelo, alvoDe(modelo));
      if (classe === "pool_esgotado") throw new PoolEsgotadoError(retryAfterDoPool(e, req.tentativa), poolConfigurado(env), e);
      if (pool || local || !(caiParaVertex(classe) || keySemModelo(e))) throw new ErroLlm(classe, "litellm", e);
      console.warn(`[llm] gateway ${classe} — caindo para o Vertex direto (${req.ctx.agentKey})`);
    }
  }

  // Reserva do chat pelo Hugging Face (lib/llm/reservaHf): o MESMO pedido no gpt-oss-120b (Cerebras → Groq)
  // quando o Vertex falha ou volta vazio. Pool e modelos da Contabo nunca chegam aqui (relançaram acima).
  const reservaHf = async (): Promise<GerarRes | null> => {
    if (!reservaHfLigada(env)) return null;
    for (const m of modelosReservaHf(env)) {
      try {
        const r = await viaGateway({ ...req, timeoutMs: timeoutReservaHf(env), extra: { ...(req.extra ?? {}), reasoning_effort: "low" } },
          m, HF_ROUTER_URL, env.HF_TOKEN!.trim(), deps.fetchImpl ?? fetch);
        const nome = modeloSemProvedor(r.modelo || m), jv = jsonValido(r.texto);
        if (!r.texto.trim()) { gravar("huggingface", rota, r.usage, false, "outro", nome, "huggingface"); continue; }
        gravar("huggingface", rota, r.usage, true, null, nome, "huggingface", jv);
        console.warn(deps.hfPrimario
          ? `[llm] Hugging Face primário serviu (${m}, ${req.ctx.agentKey})`
          : `[llm] Vertex falhou — reserva Hugging Face serviu (${m}, ${req.ctx.agentKey})`);
        const { modelId: _id, ...resto } = r;
        return { ...resto, modelo: nome, provedor: "huggingface", rota, ms: agora() - ini, alvo: "huggingface", ...(jv === undefined ? {} : { jsonValido: jv }) };
      } catch (e2) {
        gravar("huggingface", rota, USAGE_VAZIO, false, (e2 as any)?.naoJson ? "resposta_nao_json" : classificarErroLlm(e2), modeloSemProvedor(m), "huggingface");
      }
    }
    return null;
  };

  // o Vertex acabou de falhar neste pedido (stream) ou está engasgado: a reserva vai primeiro (se responder, pronto)
  if (deps.pularVertex || vertexEngasgado(agora())) { const hf = await reservaHf(); if (hf) return hf; }

  try {
    const r = await (deps.vertex ?? vertexReal)(req, modelo);
    const jv = jsonValido(r.texto);
    gravar("vertex", rota, r.usage, true, null, r.modelo, "vertex", jv);
    // Vertex respondeu VAZIO (safety/MAX_TOKENS sem texto): a reserva tenta antes de devolver o nada.
    if (!r.texto.trim()) { const hf = await reservaHf(); if (hf) return hf; }
    const { modelId: _id, ...resto } = r;
    return { ...resto, provedor: "vertex", rota, ms: agora() - ini, alvo: "vertex", ...(jv === undefined ? {} : { jsonValido: jv }) };
  } catch (e) {
    const classe = classificarErroLlm(e);
    gravar("vertex", rota, USAGE_VAZIO, false, classe, modelo, "vertex");
    falhaNoVertex(classe, agora(), env);
    if (erroPedeReserva(classe)) { const hf = await reservaHf(); if (hf) return hf; }
    throw new ErroLlm(classe, "vertex", e);
  }
}

/** = gerar({json:true}) + parse, devolvendo TAMBÉM a resposta bruta (usage) — para quem reconcilia orçamento. */
export async function gerarJsonRes<T>(req: GerarReq, deps: Deps = {}): Promise<{ valor: T; res: GerarRes }> {
  return parsearJsonRes<T>(await gerar({ ...req, json: true }, deps));
}

/**
 * = gerarJsonRes, mas EM STREAM (out/2026, "as respostas estão lentas"): `onTexto(acumulado)` recebe o JSON ainda
 * incompleto a cada pedaço — o rascunho do chat tira dali a PRÉVIA da resposta (lib/agent/previa). Só no Vertex
 * direto (o caminho do chat); gateway/pool/Contabo seguem pela chamada normal. O stream falhou (antes ou no meio) ou
 * voltou vazio → a chamada normal responde, COM a reserva HF de sempre (a prévia já mostrada fica até o final
 * substituí-la). O ledger grava igual ao gerar.
 */
export async function gerarJsonStreamRes<T>(req: GerarReq, onTexto: (acumulado: string) => void, deps: Deps = {}): Promise<{ valor: T; res: GerarRes }> {
  const env = deps.env ?? process.env;
  const modelo = req.model || GEMINI_MODEL_FLASH;
  if ((req.rota === "gateway" && gatewayLigado(env)) || ehModeloPool(modelo) || ehModeloLocal(modelo)) return gerarJsonRes<T>(req, deps);
  const agora = deps.agora ?? Date.now, registrar = deps.registrar ?? registrarTokens, ini = agora();
  let r: RespostaBruta;
  try {
    r = await (deps.vertexStream ?? vertexStreamReal)({ ...req, json: true }, modelo, (acc) => { try { onTexto(acc); } catch { /* a prévia é enfeite */ } });
  } catch (e) {
    const classe = classificarErroLlm(e);
    void registrar({ ...req.ctx, model: modelo, provedor: "vertex", rota: "vertex", usage: USAGE_VAZIO, ms: agora() - ini, ok: false, erro: classe, alvo: "vertex", jsonValido: null }).catch(() => undefined);
    falhaNoVertex(classe, agora(), env);
    // antes: chamava o Vertex DE NOVO (sem stream, mais um prazo inteiro) e só então a reserva — medido: ~31 s
    return gerarJsonRes<T>(req, erroPedeReserva(classe) ? { ...deps, pularVertex: true } : deps);
  }
  if (!r.texto.trim()) return gerarJsonRes<T>(req, deps);   // vazio (safety/MAX_TOKENS): a chamada normal tenta a reserva
  const jv = textoJsonValido(r.texto);
  void registrar({ ...req.ctx, model: r.modelo, provedor: "vertex", rota: "vertex", usage: r.usage, ms: agora() - ini, ok: true, erro: null, alvo: "vertex", jsonValido: jv }).catch(() => undefined);
  return parsearJsonRes<T>({ texto: r.texto, usage: r.usage, modelo: r.modelo, provedor: "vertex", rota: "vertex", finishReason: r.finishReason, ms: agora() - ini, alvo: "vertex", jsonValido: jv });
}

function parsearJsonRes<T>(res: GerarRes): { valor: T; res: GerarRes } {
  const cleaned = semCercaJson(res.texto);
  if (!cleaned) throw new ErroLlm("outro", res.provedor, new Error(`Gemini retornou resposta vazia (finishReason=${res.finishReason ?? "?"})`));
  // LaTeX com UMA barra dentro do JSON ("$\frac{a}{b}$", "$\rightarrow$") viraria form feed/retorno de carro no
  // parse — os "caracteres errados" nas fórmulas e reações dos trabalhos. lib/llm/latexJson repara antes.
  try { return { valor: parseJsonComLatex<T>(cleaned), res }; }
  catch { throw new ErroLlm("resposta_nao_json", res.provedor, new Error(`Gemini retornou JSON inválido (finishReason=${res.finishReason ?? "?"}): ${cleaned.slice(0, 160)}`)); }
}
/** = gerar({json:true}) + parse. Mesmos erros diagnósticos do geminiJson legado (nunca "{}" silencioso). */
export async function gerarJson<T>(req: GerarReq, deps: Deps = {}): Promise<T> {
  return (await gerarJsonRes<T>(req, deps)).valor;
}

export { classificarErroLlm } from "@/lib/llm/usage";
