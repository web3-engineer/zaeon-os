/**
 * lib/agent/errors.ts — a taxonomia de erro + `messageForError` (guardrail: NUNCA escreva
 * string de erro à mão; toda mensagem ao usuário passa por aqui). Casa com os `code` dos
 * ToolResult (runtime) e com a classificação de erros crus de rede/modelo (A1/A2).
 * Puro/testável, sem IO. Português do Brasil, tom da Aura (caloroso, direto, sem jargão).
 */

export type ErrorCode =
  | "tool_denied"
  | "needs_approval"
  | "tool_timeout"
  | "tool_error"
  | "bad_tool_result"
  | "unknown_tool"
  | "memory_unavailable"
  | "skill_offline"
  | "not_implemented"
  | "missing_topic"
  | "network"
  | "rate_limited"
  | "agent_budget_exhausted"
  | "pool_esgotado"
  | "empty"
  | "invalid_output"
  | "unknown";

const MESSAGES: Record<ErrorCode, string> = {
  tool_denied: "Isso não está liberado no seu plano agora.",
  needs_approval: "Essa ação precisa da sua aprovação antes de rodar.",
  tool_timeout: "Demorou demais pra responder — tenta de novo em instantes.",
  tool_error: "Algo falhou ao executar essa etapa. Tenta de novo.",
  bad_tool_result: "Recebi uma resposta inesperada de uma ferramenta. Tenta de novo.",
  unknown_tool: "Essa ferramenta não existe por aqui.",
  memory_unavailable: "Minha memória de longo prazo está indisponível agora — sigo sem ela.",
  skill_offline: "Essa habilidade está fora do ar no momento.",
  not_implemented: "Isso ainda não está pronto por aqui.",
  missing_topic: "Me diz o tema pra eu conseguir gerar isso.",
  network: "Tô sem conexão com o núcleo agora — tenta de novo em instantes.",
  rate_limited: "Muita coisa ao mesmo tempo — espera um segundinho e tenta de novo.",
  agent_budget_exhausted: "Meu limite diário de uso acabou. Volto amanhã — ou peça pra outro mentor.",
  // G4 (Fatia 7): só para a chore pedida por humano que EXPIROU (nunca ao adiar).
  pool_esgotado: "Os modelos gratuitos que eu uso pra isso ficaram sem cota por hoje — tento de novo amanhã ou peça pra um mentor.",
  empty: "Não consegui responder agora. Tenta de novo.",
  invalid_output: "Minha resposta saiu embaralhada — tenta de novo.",
  unknown: "Deu um problema aqui. Tenta de novo em instantes.",
};

const isErrorCode = (v: unknown): v is ErrorCode => typeof v === "string" && v in MESSAGES;

/** Classifica uma string de erro CRUA (rede/modelo) → code da taxonomia (base do A2/A1). */
export function classifyError(msg?: string | null): ErrorCode {
  const s = (msg || "").toLowerCase();
  if (!s) return "unknown";
  // teto da virtual key (C6, lei 5): o humano vê que é limite, não ignorância — antes de rate/quota.
  if (/llm:teto|budget (has been |)exceeded|exceededbudget|max_budget|budget_exceeded/.test(s)) return "agent_budget_exhausted";
  if (/llm:pool_esgotado|no deployments available/.test(s)) return "pool_esgotado";
  if (/timeout|timed out|deadline|etimedout/.test(s)) return "tool_timeout";
  if (/rate.?limit|\b429\b|quota|resource.?exhausted|exhausted/.test(s)) return "rate_limited";
  if (/network|fetch failed|econnrefused|econnreset|enotfound|socket|dns|getaddrinfo/.test(s)) return "network";
  if (/vazi|empty|no response/.test(s)) return "empty";
  if (/json|parse|invalid|inválid/.test(s)) return "invalid_output";
  return "unknown";
}

/**
 * A ÚNICA fonte de mensagens de erro ao usuário. Aceita um `{code, error}` (ToolResult), um
 * `code` cru, ou uma string de erro (que é classificada). Sempre devolve algo amigável.
 */
export function messageForError(input?: { code?: string | null; error?: string | null } | string | null): string {
  if (input == null) return MESSAGES.unknown;
  if (typeof input === "string") {
    return MESSAGES[isErrorCode(input) ? input : classifyError(input)];
  }
  const code = input.code;
  if (isErrorCode(code)) return MESSAGES[code];
  return MESSAGES[classifyError(input.error)];
}
