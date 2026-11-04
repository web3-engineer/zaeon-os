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
/**
 * PRAZO DA CONSULTA. Escolher modelo é decisão ACESSÓRIA: se o banco não responde rápido, a resposta
 * certa é "Flash" e seguir, não esperar. Sem este prazo o turno TRAVAVA — medido: com o Mongo
 * inalcançável, cada turno de chat parava 5 s no DNS antes de falhar fechado, e foi assim que o CI
 * pegou o defeito (12 testes de `runChatTurn`, `getaddrinfo ENOTFOUND placeholder`). Em produção
 * seria pior que teste vermelho: Mongo lento atrasaria TODA resposta antes da 1ª palavra.
 */
const PRAZO_MS = 250;
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

  // O `.catch` aqui é OBRIGATÓRIO e não é zelo: a promessa perdedora da corrida continua viva, e sem
  // tratamento a rejeição dela vira unhandledRejection — foi o que apareceu no CI junto das falhas
  // ("11 unhandledRejection listeners added to [process]").
  const consulta = lerConta(userId)
    .then((u) => contaDaDireitoAoPro(u))
    .catch(() => false)
    // GUARDA A RESPOSTA ATRASADA: se a consulta perdeu a corrida mas respondeu depois, o próximo
    // turno já encontra o memo pronto, em vez de pagar o prazo outra vez.
    .then((v) => { guardar(userId, v); return v; });

  // o resultado do TIMEOUT não vai pro memo: um soluço de 250 ms não deve colar Flash por 60 s
  return Promise.race([consulta, atraso(PRAZO_MS).then(() => false)]);
}

/** a leitura em si, isolada pra a corrida acima ficar legível */
async function lerConta(userId: string): Promise<ContaParaPro | null> {
  const [{ default: connectToDatabase }, { default: User }] = await Promise.all([
    import("@/src/lib/db"),
    import("@/src/models/User"),
  ]);
  await connectToDatabase();
  return (await User.findById(userId).select("plan plusUntil trialGranted deepThinkEnabled").lean()) as ContaParaPro | null;
}

function guardar(userId: string, vale: boolean): void {
  if (memo.size >= TETO_MEMO) memo.clear();   // mapa sem teto é vazamento
  memo.set(userId, { vale, em: Date.now() });
}

/** espera que NÃO segura o processo: sem o `unref`, o timer atrasaria a saída do vitest e do worker */
function atraso(ms: number): Promise<void> {
  return new Promise((r) => { const t = setTimeout(r, ms); (t as unknown as { unref?: () => void }).unref?.(); });
}
