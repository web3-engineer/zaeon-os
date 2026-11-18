/**
 * lib/agentic-skill/contrato.test.ts — o motor de "funciona nos três modelos", com modelos
 * INJETADOS. É o que se pode provar sem chave (nesta sessão não há): a lógica de contrato e de
 * comparação. A chamada real dos três fica no e2e opt-in (runner.test / AGENTIC_E2E).
 */
import { describe, expect, it } from "vitest";
import {
  MODELOS_AGENTIC, compararSaidas, satisfazContrato, validarSpec, type AgenticSpec,
} from "@/lib/agentic-skill/contrato";

describe("satisfazContrato — a mesma barra para saídas que não são idênticas", () => {
  it("json: parseia e tem as chaves, inclusive embrulhado em cercas markdown", () => {
    const c = { tipo: "json" as const, chaves: ["trecho", "severidade"] };
    expect(satisfazContrato('[{"trecho":"x","severidade":"alta"}]', c)).toBe(true);
    expect(satisfazContrato('```json\n[{"trecho":"x","severidade":"baixa"}]\n```', c)).toBe(true);
    // objeto único também vale
    expect(satisfazContrato('{"trecho":"x","severidade":"media"}', c)).toBe(true);
  });

  it("json: array vazio ou item sem chave NÃO satisfaz", () => {
    const c = { tipo: "json" as const, chaves: ["trecho"] };
    expect(satisfazContrato("[]", c)).toBe(false);
    expect(satisfazContrato('[{"outra":1}]', c)).toBe(false);
    expect(satisfazContrato("não é json", c)).toBe(false);
  });

  it("contains: todos os termos presentes, ignorando caixa", () => {
    const c = { tipo: "contains" as const, termos: ["CPF", "log"] };
    expect(satisfazContrato("achei um cpf num LOG", c)).toBe(true);
    expect(satisfazContrato("só o cpf", c)).toBe(false);
  });

  it("regex: casa o padrão, e padrão inválido nunca passa", () => {
    expect(satisfazContrato("severidade: alta", { tipo: "regex", padrao: "severidade:\\s*(alta|media|baixa)" })).toBe(true);
    expect(satisfazContrato("x", { tipo: "regex", padrao: "(" })).toBe(false);
  });
});

describe("validarSpec — o agentic.json tem de prometer os três e ter contrato", () => {
  const bom = {
    tarefa: "faça a varredura deste trecho e responda em JSON",
    contrato: { tipo: "json", chaves: ["trecho"] },
    modelos: ["claude", "codex", "octa"],
  };

  it("aceita um spec completo", () => {
    expect("spec" in validarSpec(bom)).toBe(true);
  });

  it("exige os TRÊS modelos — faltar um reprova", () => {
    const r = validarSpec({ ...bom, modelos: ["claude", "codex"] });
    expect("problemas" in r && r.problemas.some((p) => p.includes("octa"))).toBe(true);
  });

  it("exige tarefa de verdade e contrato válido", () => {
    expect("problemas" in validarSpec({ ...bom, tarefa: "oi" })).toBe(true);
    expect("problemas" in validarSpec({ ...bom, contrato: { tipo: "json", chaves: [] } })).toBe(true);
    expect("problemas" in validarSpec({ ...bom, contrato: { tipo: "inventado" } })).toBe(true);
  });
});

describe("compararSaidas — o VEREDITO: os três cumprem o mesmo contrato?", () => {
  const spec: AgenticSpec = {
    tarefa: "varra e responda JSON",
    contrato: { tipo: "json", chaves: ["trecho", "severidade"] },
    modelos: [...MODELOS_AGENTIC],
  };
  const bom = '[{"trecho":"logger.info(cpf)","severidade":"alta"}]';
  // outro texto, mas o MESMO contrato — é isso que "funciona nos três" significa
  const bomDiferente = '```json\n[{"trecho":"log do email","severidade":"media","problema":"email em log"}]\n```';

  it("os três cumprem o contrato (saídas diferentes) ⇒ ok", () => {
    const v = compararSaidas(spec, { claude: bom, codex: bomDiferente, octa: bom });
    expect(v.ok).toBe(true);
    expect(v.porModelo.every((r) => r.satisfaz)).toBe(true);
  });

  it("UM modelo quebra o contrato ⇒ reprova a skill inteira, e nomeia o culpado", () => {
    const v = compararSaidas(spec, { claude: bom, codex: "desculpe, não sei fazer isso", octa: bom });
    expect(v.ok).toBe(false);
    expect(v.motivo).toContain("codex");
  });

  it("um modelo que estourou (saída vazia) conta como falha — quebrar não é 'funcionar'", () => {
    const v = compararSaidas(spec, { claude: bom, codex: bom, octa: "" });
    expect(v.ok).toBe(false);
    expect(v.motivo).toContain("octa");
  });
});
