/**
 * lib/agentic-skill/runner.ts — roda a tarefa canônica nos TRÊS modelos e colhe o veredito.
 *
 * O `chamarModelo` é INJETÁVEL: o teste passa modelos de mentira (prova o motor sem rede e sem
 * chave), e o e2e opt-in passa o adaptador real (Claude/Codex/Octa), que só existe onde há chave —
 * nesta sessão não há, então o e2e não roda aqui. É o mesmo padrão do [rede real] da cotação e do
 * DEVICE_E2E: a lógica é testada sempre, a rede só sob demanda.
 *
 * Cada modelo recebe o MESMO prompt: o corpo da skill (o procedimento) + a tarefa canônica. É isso
 * que torna a comparação justa — um só pedido, três caminhos, e o contrato decide.
 */
import { carregarSkillsDaCasa, fsDeDisco, type SkillDaCasa } from "@/lib/agent/skills-dir";
import {
  compararSaidas, validarSpec, type AgenticSpec, type ModeloAgentic, type VereditoAgentic,
} from "@/lib/agentic-skill/contrato";

/** Chama UM modelo com um prompt. Devolve o texto cru da resposta. */
export type ChamarModelo = (modelo: ModeloAgentic, system: string, user: string) => Promise<string>;

/** O prompt de cada modelo: o procedimento da skill + a tarefa. Mesmo texto para os três. */
export function promptDaTarefa(corpoDaSkill: string, tarefa: string): { system: string; user: string } {
  return {
    system:
      "Você segue o PROCEDIMENTO abaixo à risca e responde EXATAMENTE no formato que ele pede. " +
      "Não explique o procedimento; execute-o.\n\n" + corpoDaSkill,
    user: tarefa,
  };
}

/** Lê o `agentic.json` de uma skill. */
export type LeitorAgentic = { ler: (pasta: string) => string | null };

export function leitorAgenticDeDisco(dir = ".claude/skills"): LeitorAgentic {
  const nodeFs = require("node:fs") as typeof import("node:fs");
  const path = require("node:path") as typeof import("node:path");
  return {
    ler: (pasta) => {
      const p = path.join(dir, pasta, "agentic.json");
      return nodeFs.existsSync(p) ? nodeFs.readFileSync(p, "utf8") : null;
    },
  };
}

export type SpecCarregado = { ok: true; spec: AgenticSpec } | { ok: false; problemas: string[] };

export function carregarSpec(leitor: LeitorAgentic, pasta: string): SpecCarregado {
  let cru: string | null;
  try { cru = leitor.ler(pasta); } catch (e: unknown) {
    return { ok: false, problemas: [`falha ao ler agentic.json: ${(e as Error)?.message ?? e}`] };
  }
  if (cru === null) return { ok: false, problemas: ['família "agentic" sem agentic.json'] };
  let parsed: unknown;
  try { parsed = JSON.parse(cru); } catch (e: unknown) {
    return { ok: false, problemas: [`agentic.json não é JSON válido: ${(e as Error)?.message ?? e}`] };
  }
  const v = validarSpec(parsed);
  return "spec" in v ? { ok: true, spec: v.spec } : { ok: false, problemas: v.problemas };
}

/**
 * Roda a skill nos modelos prometidos e devolve o veredito. NUNCA lança: um modelo que estoura vira
 * saída vazia, que falha o contrato — e é assim que tem de ser, porque um modelo que quebra não
 * "funciona", e a skill não é portável enquanto quebrar.
 */
export async function rodarNosModelos(
  skill: SkillDaCasa,
  spec: AgenticSpec,
  chamarModelo: ChamarModelo,
): Promise<VereditoAgentic> {
  const { system, user } = promptDaTarefa(skill.corpo, spec.tarefa);
  const saidas: Record<string, string> = {};
  await Promise.all(spec.modelos.map(async (m) => {
    try { saidas[m] = String(await chamarModelo(m, system, user) ?? ""); }
    catch { saidas[m] = ""; }
  }));
  return compararSaidas(spec, saidas);
}

/** Só as skills de família agentic do catálogo (conveniência para o portão e o e2e). */
export function skillsAgentic(dir?: string): SkillDaCasa[] {
  const { skills } = carregarSkillsDaCasa(fsDeDisco(), dir);
  return skills.filter((s) => {
    const m = (s.manifest.metadata ?? {}) as Record<string, unknown>;
    return String(m["zaeon-familia"] ?? "").trim() === "agentic";
  });
}
