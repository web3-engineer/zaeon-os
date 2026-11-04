/**
 * lib/ai/proNasPesadas.ts — F7 · O PRO NAS FASES PESADAS: quem tem direito, e o interruptor.
 *
 * Decisão do dono (04/nov/2026): ligar o Gemini Pro nas fases pesadas, **só para plus e pro**. O que
 * esta fase conserta é descrito em docs/PLANO_HARNESS_AGENTICO.md §F7; o resumo é que o "reasoning
 * sandwich" do desenho nunca existiu em produção, por DOIS motivos independentes:
 *
 *   1. `opts.deepThink` do adaptador era declarado, lido num único lugar e **nunca setado**;
 *   2. `opts.modelo` curto-circuitava a escolha, e ele vem SEMPRE preenchido — o composer manda o id
 *      da pílula e o padrão dela (`MODELO_PADRAO`) é um id concreto, não ausência.
 *
 * Por isso aqui não existe `deepThink`: a pergunta que este módulo responde é **só** "esta conta
 * paga?". O `deepThinkAccess` continua sendo o dono da OUTRA pergunta — a cota 1×/dia do botão
 * Pensamento Profundo — e não é usada neste caminho, porque uma cota diária não divide por seção:
 * um documento tem ~8 seções, e não há resposta sensata pra "qual delas ganha o Pro hoje".
 * Consequência registrada: no plus, este caminho é contínuo e não consome a cota do botão.
 *
 * FALHA FECHADO. Qualquer erro (banco fora, id inválido) devolve `false` — Flash. O caminho caro
 * nunca é o padrão de um acidente.
 */
import { effectivePlan, planCapabilities, type Plan, type PlanState } from "@/lib/plans";

const DESLIGADO = /^(0|off|false|nao|não|no)$/i;

/**
 * O interruptor. LIGADO por padrão (convenção da casa: o portão do dono é "tudo ON", e este foi
 * aberto explicitamente); `PRO_PESADAS=0|off|false|nao` desliga sem deploy de código.
 *
 * Vazio é AUSENTE, não desligado — `${{ vars.X || '' }}` produz string vazia, e tratá-la como "off"
 * é exatamente o defeito que já nos custou um deploy (§8.1). `DESLIGADO.test("")` é false, então
 * vazio cai no ligado, que é o que queremos aqui.
 */
export function proNasPesadasLigado(env: Record<string, string | undefined> = process.env): boolean {
  return !DESLIGADO.test(env.PRO_PESADAS?.trim() ?? "");
}

/**
 * PURA: este plano dá direito ao Pro? Deriva de `planCapabilities().deep !== "none"` em vez de
 * listar planos à mão, pra não existirem duas definições de "quem paga pelo caminho profundo"
 * envelhecendo em separado (lib/plans: free `none`, plus `daily`, pro/max `unlimited`).
 */
export function planoDaDireitoAoPro(s: PlanState, now: Date = new Date()): boolean {
  return planCapabilities(effectivePlan(s, now)).deep !== "none";
}

/** o que o banco precisa devolver pra decidir — nada além disso */
export type ContaParaPro = { plan?: string | null; plusUntil?: Date | null; trialGranted?: boolean | null; deepThinkEnabled?: boolean | null };

/** PURA: a conta (como o banco a devolve) dá direito? `deepThinkEnabled` é o override manual. */
export function contaDaDireitoAoPro(u: ContaParaPro | null | undefined): boolean {
  if (!u) return false;
  if (u.deepThinkEnabled) return true;
  return planoDaDireitoAoPro({ plan: (u.plan as Plan) || "free", plusUntil: u.plusUntil ?? null, trialGranted: !!u.trialGranted });
}

// ───────── memo curto: a pergunta é por TURNO, e o plano não muda de minuto em minuto ─────────
const TTL_MS = 60_000;
const TETO_MEMO = 500;                      // mapa sem teto é vazamento; 500 contas ativas por processo basta
const memo = new Map<string, { vale: boolean; em: number }>();

/** só para teste: esvazia o memo (sem isto, um teste contamina o outro) */
export function limparMemoPro(): void { memo.clear(); }

/**
 * COM BANCO: esta conta usa o Pro nas fases pesadas? Pelo `userId`, que é o que as duas trilhas
 * têm na mão (o chat e a geração em segundo plano) — nenhuma delas tem o e-mail.
 *
 * A flag entra aqui: desligada, nem consulta o banco.
 */
export async function podeProNasPesadas(
  userId?: string | null,
  env: Record<string, string | undefined> = process.env,
): Promise<boolean> {
  if (!userId || !proNasPesadasLigado(env)) return false;
  const agora = Date.now();
  const guardado = memo.get(userId);
  if (guardado && agora - guardado.em < TTL_MS) return guardado.vale;
  let vale = false;
  try {
    const [{ default: connectToDatabase }, { default: User }] = await Promise.all([
      import("@/src/lib/db"),
      import("@/src/models/User"),
    ]);
    await connectToDatabase();
    const u = await User.findById(userId).select("plan plusUntil trialGranted deepThinkEnabled").lean();
    vale = contaDaDireitoAoPro(u as ContaParaPro | null);
  } catch {
    vale = false;   // falha FECHADO: sem resposta do banco, o caminho é o barato
  }
  if (memo.size >= TETO_MEMO) memo.clear();
  memo.set(userId, { vale, em: agora });
  return vale;
}
