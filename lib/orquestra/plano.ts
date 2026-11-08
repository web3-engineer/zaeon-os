/**
 * lib/orquestra/plano.ts — o PLANO DE VERDADE da conta, pra o roteador decidir quem trabalha.
 *
 * O turno do chat passa `plan: "free"` no ToolContext de propósito (o portão de TOOL é por compute
 * pesado, PR03) — então o plano pra ORQUESTRAR tem de vir da conta. Mesmo molde do
 * lib/ai/proNasPesadas: prazo de 250 ms (banco lento → "free" e segue, nunca segura o turno),
 * memo de 60 s, e o resultado atrasado entra no memo pro próximo turno.
 */
import { effectivePlan, normalizePlan, type Plan } from "@/lib/plans";

const TTL_MS = 60_000;
const PRAZO_MS = 250;
const memo = new Map<string, { plano: Plan; em: number }>();

export type ContaPlano = { plan?: string | null; plusUntil?: Date | null; trialGranted?: boolean | null } | null;

export function limparMemoPlano(): void { memo.clear(); }

/** PURA */
export function planoDe(u: ContaPlano, now = new Date()): Plan {
  if (!u) return "free";
  return effectivePlan({ plan: normalizePlan(u.plan), plusUntil: u.plusUntil ?? null, trialGranted: !!u.trialGranted }, now);
}

async function lerConta(userId: string): Promise<ContaPlano> {
  const [{ default: connectToDatabase }, { default: User }] = await Promise.all([import("@/src/lib/db"), import("@/src/models/User")]);
  await connectToDatabase();
  return (await User.findById(userId).select("plan plusUntil trialGranted").lean()) as ContaPlano;
}

export async function planoDaConta(userId: string | null | undefined, ler: (id: string) => Promise<ContaPlano> = lerConta): Promise<Plan> {
  if (!userId) return "free";
  const g = memo.get(userId);
  if (g && Date.now() - g.em < TTL_MS) return g.plano;
  const consulta = ler(userId)
    .then((u) => planoDe(u))
    .catch(() => "free" as Plan)
    .then((p) => { if (memo.size > 500) memo.clear(); memo.set(userId, { plano: p, em: Date.now() }); return p; });
  return Promise.race([consulta, new Promise<Plan>((r) => { const t = setTimeout(() => r("free"), PRAZO_MS); (t as any).unref?.(); })]);
}
