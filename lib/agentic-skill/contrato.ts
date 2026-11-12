/**
 * lib/agentic-skill/contrato.ts — "a skill agentic funciona em TODOS os modelos". Puro.
 *
 * ────────────────────────── o que "funciona nos três" quer dizer, de forma testável ──────────────────────────
 * Claude, Codex e Octa NÃO produzem o mesmo texto. Então "comparar a saída" não pode ser igualdade
 * de string — seria impossível de passar. O que se compara é se CADA saída satisfaz o MESMO
 * CONTRATO: a forma que o pedido exige (um JSON com certas chaves, a presença de certos fatos, um
 * padrão). Uma skill agentic é portável quando os três modelos, cada um pelo seu caminho, entregam
 * uma saída que cumpre esse contrato. É a mesma lógica do padrão agentskills.io, que a lgpd-skills
 * segue para rodar em cinco agentes: o formato é um só, a saída obedece a um contrato, e por isso
 * a skill não precisa de uma variante por modelo.
 *
 * O contrato vive num `agentic.json` ao lado da SKILL.md, e esta validação é 100% pura — o motor é
 * testável com modelos INJETADOS, e a chamada real dos três fica no e2e opt-in (há chave em prod,
 * não nesta sessão).
 */

/** Os modelos que uma skill agentic promete suportar. "octa" é o agente da casa. */
export const MODELOS_AGENTIC = ["claude", "codex", "octa"] as const;
export type ModeloAgentic = (typeof MODELOS_AGENTIC)[number];

/**
 * O contrato de saída. Três formas, da mais estrita à mais frouxa:
 *   · json     — a saída parseia como JSON e tem todas as `chaves` no topo (array: cada item tem).
 *   · contains — a saída contém todos os `termos` (fatos que a resposta certa não pode omitir).
 *   · regex    — a saída casa com `padrao`.
 */
export type Contrato =
  | { tipo: "json"; chaves: string[] }
  | { tipo: "contains"; termos: string[] }
  | { tipo: "regex"; padrao: string };

export type AgenticSpec = {
  /** a tarefa canônica: o pedido que vai aos três modelos, igual para todos */
  tarefa: string;
  /** o contrato que a saída de cada modelo tem de cumprir */
  contrato: Contrato;
  /** os modelos que a skill promete — tem de incluir os três */
  modelos: ModeloAgentic[];
};

const temChaves = (obj: unknown, chaves: string[]): boolean =>
  !!obj && typeof obj === "object" && chaves.every((k) => k in (obj as Record<string, unknown>));

/** Uma saída (texto do modelo) satisfaz o contrato? Puro, nunca lança. */
export function satisfazContrato(saida: string, c: Contrato): boolean {
  const t = String(saida ?? "");
  if (c.tipo === "contains") {
    const alvo = t.toLowerCase();
    return c.termos.every((x) => alvo.includes(String(x).toLowerCase()));
  }
  if (c.tipo === "regex") {
    try { return new RegExp(c.padrao, "i").test(t); } catch { return false; }
  }
  // json: tolera o JSON embrulhado em cercas markdown, como os modelos costumam devolver.
  const limpo = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  let v: unknown;
  try { v = JSON.parse(limpo); } catch { return false; }
  if (Array.isArray(v)) return v.length > 0 && v.every((item) => temChaves(item, c.chaves));
  return temChaves(v, c.chaves);
}

/** Valida o `agentic.json` já parseado. Devolve o spec tipado OU os problemas. */
export function validarSpec(cru: unknown): { spec: AgenticSpec } | { problemas: string[] } {
  const p: string[] = [];
  const o = (cru ?? {}) as Record<string, unknown>;

  const tarefa = typeof o.tarefa === "string" ? o.tarefa.trim() : "";
  if (tarefa.length < 12) p.push("`tarefa` ausente ou curta demais (a tarefa canônica vai aos três modelos)");

  const c = o.contrato as Contrato | undefined;
  if (!c || typeof c !== "object") p.push("falta `contrato`");
  else if (c.tipo === "json") { if (!Array.isArray(c.chaves) || !c.chaves.length) p.push("contrato json sem `chaves`"); }
  else if (c.tipo === "contains") { if (!Array.isArray(c.termos) || !c.termos.length) p.push("contrato contains sem `termos`"); }
  else if (c.tipo === "regex") { try { new RegExp(c.padrao); } catch { p.push("contrato regex com `padrao` inválido"); } }
  else p.push(`contrato de tipo desconhecido: ${(c as { tipo?: string }).tipo}`);

  const modelos = Array.isArray(o.modelos) ? o.modelos.filter((x): x is ModeloAgentic => (MODELOS_AGENTIC as readonly string[]).includes(x as string)) : [];
  for (const m of MODELOS_AGENTIC) {
    if (!modelos.includes(m)) p.push(`a skill tem de prometer o modelo "${m}" — agentic vale para os três`);
  }

  if (p.length) return { problemas: p };
  return { spec: { tarefa, contrato: c as Contrato, modelos } };
}

export type ResultadoModelo = { modelo: ModeloAgentic; saida: string; satisfaz: boolean };
export type VereditoAgentic = { ok: boolean; porModelo: ResultadoModelo[]; motivo?: string };

/**
 * O VEREDITO: os três modelos cumprem o mesmo contrato? É o que o e2e chama com as saídas REAIS, e
 * o que o teste do motor chama com saídas INJETADAS. `ok` só quando TODO modelo prometido satisfaz
 * — um que falha o contrato reprova a skill inteira, porque "funciona nos três" é a promessa.
 */
export function compararSaidas(spec: AgenticSpec, saidas: Record<string, string>): VereditoAgentic {
  const porModelo: ResultadoModelo[] = spec.modelos.map((modelo) => {
    const saida = saidas[modelo] ?? "";
    return { modelo, saida, satisfaz: saida.length > 0 && satisfazContrato(saida, spec.contrato) };
  });
  const falhos = porModelo.filter((r) => !r.satisfaz).map((r) => r.modelo);
  return falhos.length
    ? { ok: false, porModelo, motivo: `não cumpriram o contrato: ${falhos.join(", ")}` }
    : { ok: true, porModelo };
}
