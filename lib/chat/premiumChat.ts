/**
 * lib/chat/premiumChat.ts — o GATE do Claude (Anthropic) no chat da Aura, o MESMO da #786 no Octa:
 * o Claude só responde pra quem tem plano `max` (ou super-admin do dono) E só se o dono LIGOU premium
 * (OCTA_MODELOS_PREMIUM, a chave-mestra que diz que a chave da org está no gateway). Falha FECHADO:
 * sem direito, sem flag, ou banco fora → o chat cai no Google, nunca gasta crédito da org sem querer.
 *
 * Por que a conta de API da org e não assinatura, e por que `max` + budget: ver lib/octa/modelosPremium.
 * Aqui mora só a DECISÃO (lê a conta por userId, como o resto do chat — Mongoose, sem e-mail na mão);
 * o budget por pessoa (virtual key) é emitido em runChatTurn, como o Octa faz na sua rota.
 */
import { effectivePlan, normalizePlan, type PlanState } from "@/lib/plans";
import { isSuperAdmin } from "@/lib/auth/roles";
import { podeUsarPremium, premiumLigado } from "@/lib/octa/modelosPremium";

type Env = Record<string, string | undefined>;

/** A conta, como o banco a devolve — só o que o gate precisa. */
export type ContaPremium = { plan?: string | null; plusUntil?: Date | null; trialGranted?: boolean | null; role?: string | null; email?: string | null };

/** PURA: esta conta pode usar Claude premium? Plano `max` (ou trial/plus-until válido) OU super-admin. */
export function contaPodeClaude(u: ContaPremium | null | undefined): boolean {
  if (!u) return false;
  const state: PlanState = { plan: normalizePlan(u.plan), plusUntil: u.plusUntil ?? null, trialGranted: !!u.trialGranted };
  return podeUsarPremium(effectivePlan(state), isSuperAdmin({ email: u.email ?? "", role: u.role ?? null }));
}

/** só pra teste: lê a conta por userId (Mongoose, como lib/ai/proNasPesadas). Isolada pra poder ser trocada. */
export async function lerContaPremium(userId: string): Promise<ContaPremium | null> {
  const [{ default: connectToDatabase }, { default: User }] = await Promise.all([
    import("@/src/lib/db"),
    import("@/src/models/User"),
  ]);
  await connectToDatabase();
  return (await User.findById(userId).select("plan plusUntil trialGranted role email").lean()) as ContaPremium | null;
}

/**
 * COM BANCO: este usuário pode falar com o Claude no chat AGORA? Exige a flag premium ligada (dono
 * pôs a chave no gateway) E a conta com direito. Qualquer falha de banco = false (fecha fechado).
 * `ler` é injetável pra teste.
 */
export async function podeClaudeNoChat(
  userId?: string | null,
  env: Env = process.env,
  ler: (id: string) => Promise<ContaPremium | null> = lerContaPremium,
): Promise<boolean> {
  if (!userId || !premiumLigado(env)) return false;
  try {
    return contaPodeClaude(await ler(userId));
  } catch {
    return false;
  }
}
