/**
 * lib/octa/modelosLocais.ts — os MODELOS LOCAIS escolhíveis do Octa Code: rodam na Contabo (CPU, grátis,
 * self-hosted; o dado não sai da nossa máquina), no MESMO laço do agente (lib/octa/modelo), só trocando a
 * STRING de modelo. Hoje: o qwen3-coder.
 *
 * ─────────────────────── por que um trilho SEPARADO do premium ───────────────────────
 * O premium (Claude/Codex, lib/octa/modelosPremium) é conta de API da ORG, PAGO por token, gateado em plano
 * `max`, com budget próprio. O local é o oposto: grátis, nossa máquina, sem budget — só a RESERVA Google
 * (quando o CPU falha/enche) custa, e pouco. Por isso ele não herda o gate de `max` nem o budget premium.
 *
 * Gate de plano: `plus` (decisão do dono, 2026-11). O Ollama roda NUM_PARALLEL=1 (uma fila só na CPU): abrir
 * pra todo mundo viraria gargalo — a reserva Google cobre, mas "escolher o coder" sob pico cairia no Gemini.
 * Limitar a quem paga segura a fila. A proteção de CPU fina (orçamento/turno, teto de prompt, pausa por falha)
 * mora em lib/octa/modelo (escolhaModeloOcta com tipo "local").
 *
 * Diferente do "Octa (padrão)" (que pode virar o coder GLOBALMENTE via OCTA_MODELO_LOCAL, decisão do dono por
 * ambiente): aqui o coder é ESCOLHA DO ALUNO por turno, independente daquele flag.
 *
 * Módulo PURO (sem IO): só o registro e os gates. A chamada mora no gateway.
 */
import { planAtLeast, type Plan } from "@/lib/plans";

type Env = Record<string, string | undefined>;

/** Um modelo local escolhível: o id curto que a UI/rota trocam → o grupo do gateway (litellm.config.yaml). */
export type ModeloLocal = {
  /** id curto, estável, que a interface e a rota usam (ex.: "coder"). */
  id: string;
  /** o grupo no infra/litellm.config.yaml que roteia pro modelo da Contabo (ex.: "zaeon-local-coder"). */
  grupo: string;
  /** nome pra tela. */
  nome: string;
  /** o modelo lê imagem? qwen3-coder NÃO → a captura da IDE vira texto antes de ir (localSemImagem). */
  multimodal: boolean;
};

/** O catálogo. Cada grupo TEM de existir no infra/litellm.config.yaml, roteando pra Contabo pela tailnet. */
export const MODELOS_LOCAIS: readonly ModeloLocal[] = [
  { id: "coder", grupo: "zaeon-local-coder", nome: "Qwen3-Coder", multimodal: false },
] as const;

/** Plano mínimo pra escolher um modelo local: `plus` (segura a fila do CPU — ver topo). */
export const PLANO_LOCAL: Plan = "plus";

/** Acha um modelo local pelo id curto (case/espaço-insensível). */
export const modeloLocalPorId = (id: string): ModeloLocal | undefined =>
  MODELOS_LOCAIS.find((m) => m.id === String(id ?? "").trim().toLowerCase());

/**
 * Quais ids locais o dono LIGOU: OCTA_MODELOS_LOCAIS = lista de ids por vírgula (ex.: "coder"). Vazia/ausente =
 * nenhum (default DESLIGADO — o dono acende quando a Contabo está de pé). Id desconhecido é ignorado.
 */
export function locaisHabilitados(env: Env = process.env): ModeloLocal[] {
  const ligados = new Set(
    String(env.OCTA_MODELOS_LOCAIS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
  );
  return MODELOS_LOCAIS.filter((m) => ligados.has(m.id));
}

/** Algum modelo local ligado? (chave-mestra do recurso.) */
export const localLigadoOcta = (env: Env = process.env): boolean => locaisHabilitados(env).length > 0;

/** O modelo local pedido está LIGADO neste ambiente? Devolve ele, ou undefined. */
export function localDisponivelOcta(id: string, env: Env = process.env): ModeloLocal | undefined {
  const m = modeloLocalPorId(id);
  return m && locaisHabilitados(env).some((x) => x.id === m.id) ? m : undefined;
}

/** O usuário pode escolher um modelo local? Plano `plus` OU super-admin (override do dono). */
export function podeUsarLocal(plan: string | null | undefined, superAdmin = false): boolean {
  return superAdmin || planAtLeast(plan, PLANO_LOCAL);
}
