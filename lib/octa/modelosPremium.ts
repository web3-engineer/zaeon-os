/**
 * lib/octa/modelosPremium.ts — os MODELOS PREMIUM do harness do Octa: Claude e Codex rodando no
 * MESMO laço (lib/octa/agente), pelo MESMO gateway LiteLLM, só trocando a STRING de modelo.
 *
 * ──────────────────────── por que a conta de API da ORG, e não assinatura ────────────────────────
 * Anthropic e OpenAI BLOQUEIAM no servidor usar uma assinatura (Claude Max / ChatGPT) pra alimentar
 * um app de terceiros que serve vários usuários — e banem a conta. O caminho sancionado é a conta de
 * API da ORG da Zaeon: a chave (ANTHROPIC_API_KEY / OPENAI_API_KEY) vive SÓ no gateway
 * (infra/litellm.config.yaml), o modelo nunca a vê, e o gasto é MEDIDO por token. Por isso premium é
 * só plano `max` (perk "Agentes com skills avançadas + ferramentas personalizadas") + budget separado.
 * O REA pode usar "nossa conta" porque é motor NOSSO, self-hosted; Claude/Codex são modelo de outra
 * empresa — a analogia não carrega, e a assinatura está fora.
 *
 * Módulo PURO (sem IO): só o registro e os gates. A chamada mora no gateway; as flags dizem quais
 * grupos o dono ligou DE FATO (ligar = ter posto a chave no gateway E listar o id na env).
 */
import { planAtLeast, type Plan } from "@/lib/plans";

type Env = Record<string, string | undefined>;

/** Um modelo premium: o id curto que a UI/rota trocam → o grupo do gateway (litellm.config.yaml). */
export type ModeloPremium = {
  /** id curto, estável, que a interface e a rota usam (ex.: "claude"). */
  id: string;
  /** o grupo no infra/litellm.config.yaml que roteia pro provedor (ex.: "zaeon-claude"). */
  grupo: string;
  /** nome pra tela. */
  nome: string;
  /** o modelo lê imagem? Codex (gpt-5-codex) não → a captura da landing vira texto antes de ir. */
  multimodal: boolean;
};

/** O catálogo. Cada grupo TEM de existir no infra/litellm.config.yaml com a chave da org no gateway. */
export const MODELOS_PREMIUM: readonly ModeloPremium[] = [
  { id: "claude", grupo: "zaeon-claude", nome: "Claude (Sonnet)", multimodal: true },
  { id: "codex", grupo: "zaeon-codex", nome: "Codex (GPT)", multimodal: false },
] as const;

/** Plano mínimo pra usar modelo premium: `max`. */
export const PLANO_PREMIUM: Plan = "max";

/** Acha um modelo premium pelo id curto (case/espaço-insensível). */
export const modeloPremiumPorId = (id: string): ModeloPremium | undefined =>
  MODELOS_PREMIUM.find((m) => m.id === String(id ?? "").trim().toLowerCase());

/**
 * Quais ids premium o dono LIGOU: OCTA_MODELOS_PREMIUM = lista de ids por vírgula (ex.: "claude,codex").
 * Vazia/ausente = nenhum (default DESLIGADO). Id desconhecido é ignorado. A env dobra de chave-mestra e
 * de enable-por-modelo: só liste o que o gateway tem chave pra atender.
 */
export function premiumHabilitados(env: Env = process.env): ModeloPremium[] {
  const ligados = new Set(
    String(env.OCTA_MODELOS_PREMIUM ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
  );
  return MODELOS_PREMIUM.filter((m) => ligados.has(m.id));
}

/** Algum modelo premium ligado? (chave-mestra do recurso.) */
export const premiumLigado = (env: Env = process.env): boolean => premiumHabilitados(env).length > 0;

/** O modelo premium pedido está LIGADO neste ambiente? Devolve ele, ou undefined. */
export function premiumDisponivel(id: string, env: Env = process.env): ModeloPremium | undefined {
  const m = modeloPremiumPorId(id);
  return m && premiumHabilitados(env).some((x) => x.id === m.id) ? m : undefined;
}

/** O usuário pode usar premium? Plano `max` OU super-admin (override do dono). */
export function podeUsarPremium(plan: string | null | undefined, superAdmin = false): boolean {
  return superAdmin || planAtLeast(plan, PLANO_PREMIUM);
}

/** Budget (USD) por pessoa/janela pros turnos premium — separado do grátis. OCTA_PREMIUM_BUDGET_USD. */
export function premiumBudgetUsd(env: Env = process.env): number {
  const v = Number(env.OCTA_PREMIUM_BUDGET_USD);
  return v > 0 ? v : 2;
}
