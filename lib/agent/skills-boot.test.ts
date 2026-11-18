/**
 * lib/agent/skills-boot.test.ts — a LIGAÇÃO, não só o módulo.
 *
 * O portão (`skills-dir.test.ts`) prova que a skill é válida. Este arquivo prova que ela CHEGA AO
 * TURNO — e é esta parte que pode sumir numa refatoração sem nenhum outro teste reclamar, porque
 * o pilar de skills já viveu assim: completo, testado, e consumido por ninguém.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetSkillsParaTeste, activateSkillDaCasa, cardapioDeSkills, catalogoDaCasa } from "@/lib/agent/skills-boot";
import type { CatalogoDaCasa } from "@/lib/agent/skills-dir";
import { buildHarnessDeps } from "@/lib/agent/aura-harness";
import { toolsDoTurno } from "@/lib/agent/runtime";
import type { ToolContext } from "@/lib/agent/runtime";
import type { TrajectoryState } from "@/lib/agent/trajectory";
import { INTENTS } from "@/lib/agent/contracts";

const VAZIO: CatalogoDaCasa = { skills: [], recusadas: [] };

const catalogoFake = (nome: string, descricao: string, corpo: string): CatalogoDaCasa => ({
  skills: [{ pasta: nome, corpo, manifest: { name: nome, description: descricao } }],
  recusadas: [],
});

const ctx: ToolContext = { activeTab: "estudos", plan: "free", execMode: "auto" };

/** Mesmo molde do `stFor` de `aura-harness.test.ts` — `spec` é obrigatório no `draft`. */
const stFor = (over: Partial<TrajectoryState> = {}): TrajectoryState =>
  ({
    objective: "me mostra o fêmur",
    intent: "explicar_conceito",
    mode: "elaborated",
    academicMode: "flexible",
    spec: INTENTS.explicar_conceito,
    iter: 1,
    evidence: [],
    artifacts: [],
    reasoning: "",
    ...over,
  }) as TrajectoryState;

/** Captura o `user` de cada chamada de geração: é onde o cardápio de skills vive. */
const capturar = () => {
  const vistos: string[] = [];
  const gen = vi.fn(async (system: string, user?: string): Promise<any> => {
    vistos.push(`${system}\n${user ?? ""}`);
    if (/subquestions/i.test(system)) return { subquestions: [] };
    if (/reasoning/i.test(system)) return { reasoning: "R" };
    return { nucleo: "N" };
  });
  return { gen, vistos };
};

describe("cardápio de skills — DIVULGAÇÃO PROGRESSIVA", () => {
  it("leva nome e descrição, e NUNCA o corpo", () => {
    const c = catalogoFake("anatomia-3d", "Mostra estrutura no atlas. Use quando o pedido nomear parte do corpo.", "CORPO SECRETO DA SKILL");
    const menu = cardapioDeSkills(c);
    expect(menu).toContain("anatomia-3d");
    expect(menu).toContain("Use quando o pedido nomear parte do corpo");
    expect(menu, "o corpo não pode estar no cardápio").not.toContain("CORPO SECRETO DA SKILL");
  });

  it("catálogo vazio ⇒ string vazia (o harness a descarta com `.filter(Boolean)`)", () => {
    expect(cardapioDeSkills(VAZIO)).toBe("");
  });

  it("o cardápio cresce LINEARMENTE e o corpo nunca entra, com 1 ou com 30 skills", () => {
    const muitas: CatalogoDaCasa = {
      skills: Array.from({ length: 30 }, (_, i) => ({
        pasta: `s${i}`, corpo: `CORPO ${i}`.repeat(200),
        manifest: { name: `s${i}`, description: `Use quando ${i}.` },
      })),
      recusadas: [],
    };
    const menu = cardapioDeSkills(muitas);
    expect(menu.split("\n").length).toBeGreaterThan(30);
    for (let i = 0; i < 30; i++) expect(menu).not.toContain(`CORPO ${i}`.repeat(200));
  });
});

describe("activate_skill — o corpo sob demanda", () => {
  const c = catalogoFake("minha-skill", "Use quando o teste pedir.", "O PROCEDIMENTO INTEIRO");

  it("devolve o corpo da skill pedida", async () => {
    const r = await activateSkillDaCasa(c).run!({ name: "minha-skill" } as any, ctx);
    expect(r.ok).toBe(true);
    expect(JSON.stringify(r)).toContain("O PROCEDIMENTO INTEIRO");
  });

  it("skill desconhecida é recusada, não inventada", async () => {
    const r = await activateSkillDaCasa(c).run!({ name: "nao-existe" } as any, ctx);
    expect(r.ok).toBe(false);
  });

  it("sem skill no catálogo a tool se declara INDISPONÍVEL no turno", () => {
    expect(activateSkillDaCasa(VAZIO).disponivelNoTurno!(ctx)).toBe(false);
    expect(activateSkillDaCasa(c).disponivelNoTurno!(ctx)).toBe(true);
  });
});

describe("a LIGAÇÃO com o chat — o que o turno de verdade recebe", () => {
  beforeEach(() => { __resetSkillsParaTeste(); });

  it("`activate_skill` está no cardápio de tools do turno", () => {
    const nomes = toolsDoTurno(ctx).map((t) => t.name);
    expect(nomes, "sem isto o modelo não tem como pedir o corpo de skill nenhuma")
      .toContain("activate_skill");
  });

  it("a skill REAL do repositório chega ao prompt do turno — só nome e descrição", async () => {
    const real = catalogoDaCasa();
    expect(real.skills.length, "o repositório tem de ter pelo menos uma skill da casa")
      .toBeGreaterThan(0);

    const { gen, vistos } = capturar();
    const deps = buildHarnessDeps(ctx, { genJson: gen as any, retryDelayMs: 0 });
    await deps.draft(stFor());
    const prompt = vistos.join("\n");

    for (const s of real.skills) {
      expect(prompt, `a skill ${s.manifest.name} não chegou ao prompt`).toContain(s.manifest.name);
      // e o corpo NÃO: a primeira linha dele serve de sonda
      const primeiraLinhaDoCorpo = s.corpo.split("\n").find((l) => l.trim().length > 20);
      if (primeiraLinhaDoCorpo) {
        expect(prompt, `o CORPO de ${s.manifest.name} vazou para o prompt de todo turno`)
          .not.toContain(primeiraLinhaDoCorpo.trim());
      }
    }
  });
});
