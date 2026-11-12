/**
 * lib/agentic-skill/runner.test.ts — a LIGAÇÃO (skill → prompt dos três → veredito) com modelos
 * injetados, e o e2e opt-in que chama os modelos de verdade.
 */
import { describe, expect, it, vi } from "vitest";
import {
  carregarSpec, leitorAgenticDeDisco, promptDaTarefa, rodarNosModelos, skillsAgentic,
  type ChamarModelo,
} from "@/lib/agentic-skill/runner";
import type { SkillDaCasa } from "@/lib/agent/skills-dir";

const skillFake = (corpo: string): SkillDaCasa => ({
  pasta: "x", corpo, manifest: { name: "x", description: "Use quando testar." },
});
const spec = { tarefa: "varra e responda JSON", contrato: { tipo: "json" as const, chaves: ["trecho"] }, modelos: ["claude", "codex", "octa"] as const };

describe("promptDaTarefa — mesmo prompt para os três, com o procedimento no system", () => {
  it("o corpo da skill vai no system; a tarefa, no user", () => {
    const { system, user } = promptDaTarefa("PROCEDIMENTO AQUI", "faça X");
    expect(system).toContain("PROCEDIMENTO AQUI");
    expect(user).toBe("faça X");
  });
});

describe("rodarNosModelos — a ligação, com modelos injetados", () => {
  it("manda o MESMO prompt para cada modelo e aprova quando os três cumprem", async () => {
    const vistos: string[] = [];
    const chamar: ChamarModelo = async (m, system, user) => {
      vistos.push(m);
      expect(system).toContain("meu procedimento");
      expect(user).toBe(spec.tarefa);
      return '[{"trecho":"x"}]';
    };
    const v = await rodarNosModelos(skillFake("meu procedimento"), spec as any, chamar);
    expect(v.ok).toBe(true);
    expect(vistos.sort()).toEqual(["claude", "codex", "octa"]);
  });

  it("um modelo que LANÇA vira falha, não exceção — quebrar não é funcionar", async () => {
    const chamar: ChamarModelo = async (m) => {
      if (m === "codex") throw new Error("rate limit");
      return '[{"trecho":"x"}]';
    };
    const v = await rodarNosModelos(skillFake("p"), spec as any, chamar);
    expect(v.ok).toBe(false);
    expect(v.motivo).toContain("codex");
  });

  it("um modelo que responde fora do contrato reprova", async () => {
    const chamar: ChamarModelo = async (m) => (m === "octa" ? "não consegui" : '[{"trecho":"x"}]');
    const v = await rodarNosModelos(skillFake("p"), spec as any, chamar);
    expect(v.ok).toBe(false);
    expect(v.motivo).toContain("octa");
  });
});

describe("carregarSpec / skillsAgentic — leem o disco de verdade", () => {
  it("a skill agentic REAL do repositório tem um agentic.json válido", () => {
    const agentic = skillsAgentic();
    expect(agentic.length, "nenhuma skill agentic no repositório").toBeGreaterThan(0);
    for (const s of agentic) {
      const r = carregarSpec(leitorAgenticDeDisco(), s.pasta);
      expect(r.ok, `spec de "${s.manifest.name}" inválido: ${r.ok ? "" : r.problemas.join("; ")}`).toBe(true);
    }
  });
});

/**
 * AGENTIC_E2E — a prova REAL: a tarefa canônica roda em Claude, Codex e Octa, e as três saídas
 * cumprem o contrato. Opt-in porque precisa das chaves dos três (nesta sessão não há nenhuma —
 * só ANTHROPIC_BASE_URL). É o que o dono/CI roda com as chaves para promover a skill agentic.
 *
 * O adaptador real mapeia "claude"→Anthropic, "codex"→OpenAI/OpenRouter, "octa"→o caminho da casa
 * (Vertex/local), pelo router de lib/ai. Fica atrás da flag justamente porque não é executável
 * sem credencial, e um teste que não pode rodar não pode ser obrigatório.
 */
describe.runIf(process.env.AGENTIC_E2E === "1")("[modelos reais] a skill agentic funciona nos três", async () => {
  const { chamarModeloReal } = await import("@/lib/agentic-skill/adaptador");
  const agentic = skillsAgentic();

  it.each(agentic.map((s) => [s.manifest.name, s] as const))(
    "%s cumpre o contrato em Claude, Codex e Octa",
    async (_nome, s) => {
      const r = carregarSpec(leitorAgenticDeDisco(), s.pasta);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const v = await rodarNosModelos(s, r.spec, chamarModeloReal);
      const falhas = v.porModelo.filter((x) => !x.satisfaz)
        .map((x) => `${x.modelo}: ${x.saida.slice(0, 120)}`).join("\n");
      expect(v.ok, `algum modelo não cumpriu o contrato:\n${falhas}`).toBe(true);
    },
  );
});
