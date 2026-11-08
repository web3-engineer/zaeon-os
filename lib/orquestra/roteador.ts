/**
 * lib/orquestra/roteador.ts — QUEM trabalha em cada pedido: plano × formato da tarefa.
 *
 * A regra de produto (docs/ORQUESTRA.md):
 *  - free/plus: um agente responde (a Aura, como hoje).
 *  - pro: tarefa AMPLA (trabalho, levantamento de fontes) → uma EQUIPE pequena (enxame com poucos
 *    subagentes); revisão → um agente PROFUNDO.
 *  - max: tarefa ampla → ENXAME grande; revisão e explicação elaborada → agente profundo, com o
 *    verificador global ligado.
 *
 * Enxame ganha em tarefa ampla (o PARL do Kimi: −4,5× de latência e +F1 em busca larga), não em
 * pergunta curta. Por isso conversa, dúvida rápida, livro e artefato ficam SEMPRE na Aura — 300
 * agentes pra "o que é mitose?" é dinheiro queimado e aluno esperando.
 *
 * E um limite físico: motor longo só roda em SEGUNDO PLANO (o worker do CHAT_BG). O caminho inline
 * vive sob o `maxDuration = 60` da rota; lá, sempre Aura.
 */
import type { IntentId, Mode } from "@/lib/agent/contracts";
import { planAtLeast, type Plan } from "@/lib/plans";
import type { Formato, Motor } from "@/lib/orquestra/contrato";
import { todosOsMotores } from "@/lib/orquestra/motores";
import { planoMinimoDoMotor } from "@/lib/orquestra/catalogo";

type Env = Record<string, string | undefined>;

export type ModoOrquestra = "off" | "sombra" | "on";
export function modoOrquestra(env: Env = process.env): ModoOrquestra {
  const v = env.ORQUESTRA?.trim().toLowerCase();
  return v === "on" || v === "1" ? "on" : v === "sombra" ? "sombra" : "off";
}

export type EntradaRoteador = {
  plano: Plan;
  intent: IntentId;
  mode: Mode;
  /** o turno roda no worker (CHAT_BG) — sem isso, nada de motor longo */
  emSegundoPlano: boolean;
  /** criar_trabalho na Sala de Pesquisa SEM chat único: quem gera é o cliente (sentinela research) */
  trabalhoGeradoNoCliente: boolean;
  /** motor pedido explicitamente (arena / admin / ORQ_MOTOR) — sem portão de plano */
  forcado?: string | null;
  /**
   * motor que o ALUNO escolheu ao plugar um agente da orquestra na Loja (lib/orquestra/catalogo). Diferente do
   * `forcado`: passa pelo portão de plano do catálogo e pelas regras de conversa rápida/inline.
   */
  pedido?: string | null;
};

export type Decisao = {
  motor: "aura" | string;
  formato: Formato;
  motivo: string;
  maxSubagentes: number;
  prazoMs: number;
  verificadorGlobal: boolean;
};

const AURA = (motivo: string): Decisao => ({ motor: "aura", formato: "unico", motivo, maxSubagentes: 0, prazoMs: 0, verificadorGlobal: false });
const num = (v: string | undefined, padrao: number) => (Number(v) > 0 ? Number(v) : padrao);
/** abaixo do STUCK_MS (15 min) do reaper, com folga pro fallback e pra gravar o turno */
const TETO_PRAZO_MS = 12 * 60_000;

const AMPLAS: ReadonlySet<IntentId> = new Set(["criar_trabalho", "pesquisar_fontes"]);
const SEMPRE_AURA: ReadonlySet<IntentId> = new Set(["conversa", "duvida_rapida", "buscar_livro", "gerar_artefato"]);

function preferencia(env: Env, formato: Formato): string[] {
  const padrao = formato === "enxame" ? "kimi-enxame,enxame-misto" : "deepseek-v4-profundo,tongyi-deepresearch";
  const v = formato === "enxame" ? env.ORQ_PREFERENCIA_ENXAME : env.ORQ_PREFERENCIA_PROFUNDO;
  return (v?.trim() || padrao).split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Escolhe o motor do formato. Com ORQ_SORTEIO=1 sorteia entre os disponíveis — é o modo de TESTAR
 * o mercado: alunos reais, motores diferentes, e o ledger/feedback dizem quem foi melhor.
 */
export function escolherMotor(formato: Formato, env: Env, motores: Motor[], aleatorio: () => number = Math.random): Motor | null {
  const disp = motores.filter((m) => m.formato === formato && m.disponivel(env));
  if (!disp.length) return null;
  if (env.ORQ_SORTEIO === "1") return disp[Math.floor(aleatorio() * disp.length)] ?? disp[0];
  for (const id of preferencia(env, formato)) {
    const m = disp.find((d) => d.id === id);
    if (m) return m;
  }
  return disp[0];
}

export function decidir(e: EntradaRoteador, env: Env = process.env, motores: Motor[] = todosOsMotores(env), aleatorio?: () => number): Decisao {
  const prazoProfundo = Math.min(TETO_PRAZO_MS, num(env.ORQ_PRAZO_PROFUNDO_MS, 4 * 60_000));
  const prazoEnxame = Math.min(TETO_PRAZO_MS, num(env.ORQ_PRAZO_ENXAME_MS, 8 * 60_000));

  const forcado = e.forcado?.trim() || env.ORQ_MOTOR?.trim();
  if (forcado && forcado !== "aura") {
    const m = motores.find((x) => x.id === forcado);
    if (m && m.disponivel(env) && e.emSegundoPlano) {
      return {
        motor: m.id, formato: m.formato, motivo: `motor forçado (${forcado})`,
        maxSubagentes: m.formato === "enxame" ? num(env.ORQ_SUBAGENTES_MAX, 12) : 0,
        prazoMs: m.formato === "enxame" ? prazoEnxame : prazoProfundo,
        verificadorGlobal: env.ORQ_VERIFICADOR !== "0",
      };
    }
  }

  if (SEMPRE_AURA.has(e.intent)) return AURA(`intenção ${e.intent} fica com a Aura (rápida)`);
  if (!e.emSegundoPlano) return AURA("turno inline (maxDuration 60 s): motor longo só no worker");
  if (e.intent === "criar_trabalho" && e.trabalhoGeradoNoCliente) return AURA("trabalho da Sala de Pesquisa é gerado no cliente");
  // O AGENTE QUE O ALUNO PLUGOU NA LOJA: vale pra qualquer pedido de trabalho (não só os amplos), com o plano do
  // catálogo. Sem plano ou sem chave → Aura, com o motivo no log (a Loja já mostra o cadeado / "aguardando chave").
  if (e.pedido) {
    const m = motores.find((x) => x.id === e.pedido);
    const min = planoMinimoDoMotor(e.pedido);
    if (!m || !min) return AURA(`motor pedido desconhecido (${e.pedido})`);
    if (!planAtLeast(e.plano, min)) return AURA(`${m.nome} exige o plano ${min} (conta ${e.plano})`);
    if (!m.disponivel(env)) return AURA(`${m.nome} sem chave configurada no servidor`);
    const maxP = planAtLeast(e.plano, "max");
    return {
      motor: m.id, formato: m.formato, motivo: `escolhido pelo aluno na Loja (${e.plano} · ${e.intent})`,
      maxSubagentes: m.formato === "enxame" ? (maxP ? num(env.ORQ_SUBAGENTES_MAX, 12) : num(env.ORQ_SUBAGENTES_PRO, 4)) : 0,
      prazoMs: m.formato === "enxame" ? prazoEnxame : prazoProfundo,
      verificadorGlobal: env.ORQ_VERIFICADOR === "1" || (maxP && env.ORQ_VERIFICADOR !== "0"),
    };
  }

  // ROTEAMENTO AUTOMÁTICO (sem o aluno pedir): só com ORQ_AUTOMATICO=1. Com uma chave de laboratório no servidor
  // (o HF_TOKEN já está em prod), ligar a orquestra mandaria TODO trabalho de Pro/Max pra um enxame que ninguém viu
  // rodar em produção. Primeiro a escolha explícita na Loja e a Arena; o automático vem depois, por decisão.
  if (env.ORQ_AUTOMATICO !== "1") return AURA("roteamento automático desligado (ORQ_AUTOMATICO) — só agentes escolhidos na Loja");

  const minimo = (env.ORQ_PLANO_MINIMO?.trim() || "pro") as Plan;
  if (!planAtLeast(e.plano, minimo)) return AURA(`plano ${e.plano} abaixo de ${minimo}`);

  const max = planAtLeast(e.plano, "max");
  let formato: Formato | null = null;
  if (AMPLAS.has(e.intent)) formato = "enxame";
  else if (e.intent === "revisar") formato = "profundo";
  else if (e.intent === "explicar_conceito" && max && e.mode !== "quick") formato = "profundo";
  if (!formato) return AURA(`intenção ${e.intent} no plano ${e.plano} fica com a Aura`);

  let m = escolherMotor(formato, env, motores, aleatorio);
  // sem enxame configurado, uma tarefa ampla ainda ganha um agente profundo
  if (!m && formato === "enxame") { formato = "profundo"; m = escolherMotor("profundo", env, motores, aleatorio); }
  if (!m) return AURA(`nenhum motor ${formato} configurado (faltam chaves)`);

  return {
    motor: m.id,
    formato: m.formato,
    motivo: `${e.plano} · ${e.intent} → ${m.formato}`,
    maxSubagentes: m.formato === "enxame" ? (max ? num(env.ORQ_SUBAGENTES_MAX, 12) : num(env.ORQ_SUBAGENTES_PRO, 4)) : 0,
    prazoMs: m.formato === "enxame" ? prazoEnxame : prazoProfundo,
    verificadorGlobal: env.ORQ_VERIFICADOR === "1" || (max && env.ORQ_VERIFICADOR !== "0"),
  };
}
