/**
 * lib/agent/turnoLocal.ts — o turno do chat num modelo LOCAL (Contabo, CPU), pelo caminho ENXUTO.
 *
 * O harness do Google faz 3 chamadas com milhares de tokens e JSON no fim; na CPU (lê ~20–26 tok/s,
 * gera ~7–8 tok/s) isso viraria minutos. Aqui é UMA chamada, em streaming (o aluno vê a resposta nascer),
 * com contexto curto. A ORDEM das mensagens é pensada pro cache de prefixo do Ollama: o que não muda na
 * conversa (persona + mentor + histórico) vem primeiro; o que muda a cada turno (trechos da base) vai
 * junto da pergunta, no fim. Na mensagem seguinte o Ollama só lê o que é novo (medido: 700–950 tok/s
 * com o prefixo em cache, contra 20–26 frio).
 *
 * Falhou ANTES do primeiro pedaço (gateway fora, modelo não subiu a tempo, fila cheia) → lança, e o
 * runChatTurn responde pelo Google. Caiu NO MEIO → devolve o que veio com um aviso.
 */
import { registrarTokens, type LedgerCtx } from "@/lib/llm/ledger";
import { usageDoOpenAI, classificarErroLlm, gatewayLigado, USAGE_VAZIO, type Usage } from "@/lib/llm/usage";
import { chaveLocal } from "@/lib/llm/papeis";

type Env = Record<string, string | undefined>;

export const PERSONA_LOCAL = [
  "Você é a Aura, a parceira de estudos e pesquisa da Zaeon. Fale em português do Brasil, como uma colega esperta e acolhedora.",
  "Responda com clareza e precisão; use Markdown leve (negrito, listas curtas, títulos só quando ajudar). Fórmulas em LaTeX ($…$ ou $$…$$).",
  "NUNCA invente fontes, páginas ou citações: só cite o que vier escrito na própria mensagem do aluno.",
  "Seja direta: no máximo ~200 palavras (a menos que o aluno peça mais) e termine com UMA sugestão prática de próximo passo.",
  // ↑ medido 2026-10-22: a CPU gera ~5 tok/s com contexto 16k — 640 tokens viraram 2 min; 200 palavras ≈ 40 s.
].join("\n");

/** Tetos: o 1º pedaço pode demorar (modelo frio + leitura do prompt); depois disso, o total. */
export const PRIMEIRO_PEDACO_MS = 240_000;
export const TOTAL_MS = 420_000;
/** Turnos locais simultâneos por processo (o Ollama roda 1 por vez; o resto esperaria na fila da CPU). */
export const MAX_LOCAIS_EM_VOO = 2;
let emVoo = 0;
/** Só pra teste. */
export const _turnosLocais = { get emVoo() { return emVoo; }, zerar() { emVoo = 0; } };

export type EntradaLocal = {
  prompt: string;
  history: Array<{ role: string; text: string }>;
  /** mentor / contexto ESTÁVEL da conversa (vai no system, que entra no cache) */
  systemContext?: string;
  /** bloco da base (RAG) deste turno — muda a cada pergunta, então vai no fim */
  base?: string;
  grupo: string;
  /** key do gateway pra ESTE turno: virtual key com budget (ex.: Claude premium no chat). Ausente = a master local. */
  key?: string;
  ctx: LedgerCtx;
};

export type SaidaLocal = { texto: string; usage: Usage; ms: number; interrompido: boolean };

export function mensagensLocais(e: EntradaLocal): { role: string; content: string }[] {
  const sys = [PERSONA_LOCAL, (e.systemContext ?? "").trim().slice(0, 1500)].filter(Boolean).join("\n\n");
  const hist = e.history.slice(-8).map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: String(m.text ?? "").slice(0, 1200),
  })).filter((m) => m.content.trim());
  // A instrução de citar só vem JUNTO dos trechos (medido 22/10: com ela fixa no system, o modelo inventou
  // "[Base da Turma, p. 124]" sem base nenhuma). E fica fora do system pra não quebrar o cache de prefixo.
  const pergunta = e.base?.trim()
    ? `Trechos da base da turma (use-os e cite o documento e a página entre colchetes):\n${e.base.trim().slice(0, 4000)}\n\nPergunta: ${e.prompt}`
    : e.prompt;
  return [{ role: "system", content: sys }, ...hist, { role: "user", content: pergunta }];
}

export async function turnoLocal(
  e: EntradaLocal,
  emitir: (pedaco: string) => void,
  deps: { fetchImpl?: typeof fetch; env?: Env; agora?: () => number; registrar?: typeof registrarTokens } = {},
): Promise<SaidaLocal> {
  const env = deps.env ?? process.env;
  const agora = deps.agora ?? Date.now;
  const registrar = deps.registrar ?? registrarTokens;
  const ini = agora();
  const gravar = (usage: Usage, ok: boolean, erro: ReturnType<typeof classificarErroLlm> | null) =>
    void registrar({ ...e.ctx, phase: "chat-local", model: e.grupo, provedor: "litellm", rota: "gateway", usage, ms: agora() - ini, ok, erro, alvo: "contabo", jsonValido: null }).catch(() => undefined);

  const key = e.key?.trim() || chaveLocal(env);
  if (!gatewayLigado(env) || !key) throw new Error("turno local: sem gateway/key");
  if (emVoo >= MAX_LOCAIS_EM_VOO) throw new Error("turno local: servidor local ocupado");
  emVoo++;

  const ctrl = new AbortController();
  let primeiro = setTimeout(() => ctrl.abort(new Error("timeout: modelo local não começou a responder")), PRIMEIRO_PEDACO_MS);
  const total = setTimeout(() => ctrl.abort(new Error("timeout: resposta local passou do teto")), TOTAL_MS);
  let texto = "";
  let caiu = false;
  let usage: Usage = USAGE_VAZIO;
  try {
    const r = await (deps.fetchImpl ?? fetch)(`${env.GATEWAY_URL!.trim().replace(/\/+$/, "")}/v1/chat/completions`, {
      method: "POST", cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: e.grupo, messages: mensagensLocais(e), temperature: 0.4, stream: true, stream_options: { include_usage: true } }),
      signal: ctrl.signal,
    });
    if (!r.ok || !r.body) throw Object.assign(new Error(`gateway HTTP ${r.status}: ${(await r.text().catch(() => "")).slice(0, 160)}`), { status: r.status });
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      let lido: ReadableStreamReadResult<Uint8Array>;
      try { lido = await reader.read(); }
      catch (err) { if (texto) { caiu = true; break; } throw err; } // caiu no meio: fica o que veio
      if (lido.done) break;
      buf += dec.decode(lido.value, { stream: true });
      let i: number;
      while ((i = buf.indexOf("\n")) >= 0) {
        const linha = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!linha.startsWith("data:")) continue;
        const dado = linha.slice(5).trim();
        if (dado === "[DONE]") continue;
        let j: any;
        try { j = JSON.parse(dado); } catch { continue; }
        if (j?.usage) usage = usageDoOpenAI(j.usage);
        const pedaco = String(j?.choices?.[0]?.delta?.content ?? "");
        if (!pedaco) continue;
        if (!texto) { clearTimeout(primeiro); primeiro = undefined as any; }
        texto += pedaco;
        emitir(pedaco);
      }
    }
    if (!texto.trim()) throw new Error("turno local: resposta vazia");
    const interrompido = caiu || ctrl.signal.aborted;
    gravar(usage, true, null);
    return { texto, usage, ms: agora() - ini, interrompido };
  } catch (err) {
    if (texto.trim()) { gravar(usage, true, null); return { texto, usage, ms: agora() - ini, interrompido: true }; }
    gravar(USAGE_VAZIO, false, classificarErroLlm(ctrl.signal.aborted ? ctrl.signal.reason ?? err : err));
    throw err;
  } finally {
    if (primeiro) clearTimeout(primeiro);
    clearTimeout(total);
    emVoo--;
  }
}
