/**
 * lib/octa/reaModelo.ts — qual modelo o REA usa, por ponto. PURO.
 *
 * O dono quis qualidade máxima no REA pagando com os créditos da Anthropic: Opus no AGENTE (o
 * raciocínio sobre binário/decompilação no Octa) e Sonnet na REDAÇÃO (o compositor do blueprint no
 * chat). Ambos pelo MESMO gateway LiteLLM da casa (GATEWAY_URL), que roteia o nome do modelo para a
 * Anthropic com a `ANTHROPIC_API_KEY` que mora na Contabo — nada de SDK nem chave no app.
 *
 * DESLIGADO por padrão: sem `REA_MODELO_AGENTE`/`REA_MODELO_REDACAO`, cada ponto segue no modelo de
 * antes (Gemini). Isso é de propósito — crédito pago não liga sozinho.
 */
type Env = Record<string, string | undefined>;

const lido = (v: string | undefined): string | null => {
  const s = (v ?? "").trim();
  return s || null;
};

/**
 * O modelo do AGENTE octa_rea (Opus, quando configurado). É o nome que o gateway roteia (ex.:
 * "claude-opus"). Null = sem override → o chamador usa o modelo de sempre do Octa.
 *
 * ⚠️ BLAST RADIUS: o agente do Octa é UM só, com um modelo por turno. Ligar isto faz o Octa usar
 * este modelo em TODO turno enquanto `OCTA_REA=1` — não só quando uma tool do REA é chamada. Em uma
 * sessão de engenharia reversa isso é o desejado; se o Octa também é muito usado pra código geral,
 * pese o custo. Por isso é env própria e opt-in.
 */
export const modeloReaAgente = (env: Env = process.env): string | null => lido(env.REA_MODELO_AGENTE);

/**
 * O modelo da REDAÇÃO do blueprint (Sonnet, quando configurado). Null = sem override → o compositor
 * segue no Gemini Flash direto (geminiJson).
 */
export const modeloReaRedacao = (env: Env = process.env): string | null => lido(env.REA_MODELO_REDACAO);

/** Algum ponto do REA usa a Anthropic? (pro /api/health dizer sem expor valor) */
export function reaClaude(env: Env = process.env): { agente: string | null; redacao: string | null; ligado: boolean } {
  const agente = modeloReaAgente(env), redacao = modeloReaRedacao(env);
  return { agente, redacao, ligado: !!(agente || redacao) };
}
