/**
 * lib/rea/tier.ts — qual MOTOR do REA atende esta conta: "max" (o dono e o plano Max → motor primário, capacidade
 * reservada) ou "users" (todo o resto → motor secundário, pool menor). Os dois motores rodam na mesma máquina grande,
 * presos nos mesmos núcleos; o de usuários tem peso de CPU baixo, então cede ao primário e ao adaptador da ChipFlow.
 *
 * FALHA FECHADO para "users": um soluço do banco manda a conta para o pool dos usuários, nunca para o motor reservado.
 * Assim um erro nunca joga carga grátis no motor Max. Mesmo padrão (memo + prazo curto) do lib/ai/proNasPesadas.
 */
import { effectivePlan, type Plan } from "@/lib/plans";
import { isSuperAdmin } from "@/lib/auth/roles";

export type ReaTier = "max" | "users";

type Conta = { plan?: string | null; plusUntil?: Date | null; trialGranted?: boolean | null; role?: string | null; email?: string | null };

/** PURA: a conta (como o banco a devolve) é do tier "max"? Dono (super admin) ou plano Max efetivo. */
export function tierDaConta(u: Conta | null | undefined, now: Date = new Date()): ReaTier {
  if (!u) return "users";
  if (isSuperAdmin({ email: u.email, role: u.role })) return "max";
  const plano: Plan = effectivePlan({ plan: (u.plan as Plan) || "free", plusUntil: u.plusUntil ?? null, trialGranted: !!u.trialGranted }, now);
  return plano === "max" ? "max" : "users";
}

// memo curto por conta — o plano não muda de minuto em minuto, e a escolha do motor é acessória
const TTL_MS = 60_000, TETO = 500, PRAZO_MS = 250;
const memo = new Map<string, { tier: ReaTier; em: number }>();
export function limparMemoTier(): void { memo.clear(); }

/**
 * COM BANCO: o tier desta conta, pelo userId (o que as duas trilhas — Octa e chat de Estudos — têm na mão).
 * Prazo de 250 ms: se o banco demora, a escolha certa é "users" e seguir, nunca travar o turno.
 */
export async function reaTierDoUsuario(userId?: string | null): Promise<ReaTier> {
  if (!userId) return "users";
  const agora = Date.now();
  const g = memo.get(userId);
  if (g && agora - g.em < TTL_MS) return g.tier;
  const consulta = lerConta(userId)
    .then((u) => tierDaConta(u))
    .catch((): ReaTier => "users")
    .then((t) => { if (memo.size >= TETO) memo.clear(); memo.set(userId, { tier: t, em: Date.now() }); return t; });
  return Promise.race([consulta, atraso(PRAZO_MS).then((): ReaTier => "users")]);
}

async function lerConta(userId: string): Promise<Conta | null> {
  const [{ default: connectToDatabase }, { default: User }] = await Promise.all([import("@/src/lib/db"), import("@/src/models/User")]);
  await connectToDatabase();
  return (await User.findById(userId).select("plan plusUntil trialGranted role email").lean()) as Conta | null;
}
function atraso(ms: number): Promise<void> { return new Promise((r) => { const t = setTimeout(r, ms); (t as unknown as { unref?: () => void }).unref?.(); }); }
