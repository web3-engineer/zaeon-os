/**
 * A FIAÇÃO do portão de conhecimento específico.
 *
 * Este teste existe porque `escopo.ts` podia ficar perfeito e MORTO no repositório — que é
 * exatamente o estado em que `pedeGraficoMatematico` está até hoje: função testada, correta, e que
 * ninguém chama. Aqui se prova que a diretiva chega ao `system` do rascunho E que o `plan` para de
 * coletar quando o assunto não é dela.
 */
import { describe, it, expect, vi } from "vitest";
import { buildHarnessDeps } from "./aura-harness";
import { DIRETRIZ_ESCOPO_NEUTRO } from "@/lib/agents/escopo";

const ctx: any = { userId: "0123456789abcdef01234567", activeTab: "estudos", plan: "free", execMode: "auto" };
const estado = (over: any = {}): any => ({
  objective: "o que você acha do GTA VI?",
  mode: "elaborated", academicMode: "off", intent: "explicar_conceito",
  spec: { tools: ["memory_search", "web_search"], required: ["nucleo"] },
  evidence: [], reasoning: "", steps: [], ...over,
});

/** genJson espião: guarda o `system` de cada fase e devolve um rascunho mínimo. */
function espiao() {
  const systems: Record<string, string> = {};
  const genJson = vi.fn(async (system: string, _user: string, o: any) => {
    systems[o?.phase ?? "?"] = system;
    return o?.phase === "reason" ? { reasoning: "ok" } : { nucleo: "n" };
  });
  return { systems, genJson: genJson as any };
}

const NEGA = { escopo: "nega" as const, area: "eng-computacao", responsavel: { nome: "Turing", onde: "escritorio" as const } };
const NEUTRO = { escopo: "neutro" as const, area: null, responsavel: null };
const PASSA = { escopo: "passa" as const, area: "medicina", responsavel: null };

describe("specific_knowledge · fiação no harness", () => {
  it("NEGA: a diretiva chega ao system do rascunho, com o nome de quem ajuda e sem placeholder", async () => {
    const e = espiao();
    const deps = buildHarnessDeps(ctx, { genJson: e.genJson, escopo: NEGA });
    await deps.draft(estado());
    const sys = e.systems.draft;
    expect(sys).toContain("FORA DO SEU ASSUNTO, E COM DONO");
    expect(sys).toContain("Turing");
    expect(sys).toContain("no Escritório");
    expect(sys).not.toContain("{QUEM}");
    expect(sys).not.toContain("{ONDE}");
  });

  it("NEUTRO: chega a diretiva do contorno de contexto, não a da recusa", async () => {
    const e = espiao();
    const deps = buildHarnessDeps(ctx, { genJson: e.genJson, escopo: NEUTRO });
    await deps.draft(estado());
    expect(e.systems.draft).toContain(DIRETRIZ_ESCOPO_NEUTRO);
    expect(e.systems.draft).not.toContain("FORA DO SEU ASSUNTO, E COM DONO");
  });

  it("PASSA: nenhuma das duas entra — o caminho de quem está no seu campo fica intacto", async () => {
    const e = espiao();
    const deps = buildHarnessDeps(ctx, { genJson: e.genJson, escopo: PASSA });
    await deps.draft(estado());
    expect(e.systems.draft).not.toContain("ESCOPO DESTE TURNO");
  });

  it("SEM escopo (chamador antigo: canal, worker) = igual a PASSA, byte a byte", async () => {
    const a = espiao(), b = espiao();
    await buildHarnessDeps(ctx, { genJson: a.genJson }).draft(estado());
    await buildHarnessDeps(ctx, { genJson: b.genJson, escopo: PASSA }).draft(estado());
    expect(a.systems.draft).toBe(b.systems.draft);
  });

  it("FORA DO ESCOPO NÃO COLETA: o plan devolve zero passos (nega e neutro)", async () => {
    const e = espiao();
    for (const escopo of [NEGA, NEUTRO]) {
      const deps = buildHarnessDeps(ctx, { genJson: e.genJson, escopo });
      expect(await deps.plan(estado()), escopo.escopo).toEqual([]);
    }
  });

  it("…e DENTRO do escopo coleta como sempre (senão o portão teria quebrado o turno normal)", async () => {
    const e = espiao();
    const deps = buildHarnessDeps(ctx, { genJson: e.genJson, escopo: PASSA });
    const passos = await deps.plan(estado({ objective: "o que causa anemia?" }));
    expect(passos.length).toBeGreaterThan(0);
    expect(passos.map((p: any) => p.tool)).toContain("memory_search");
  });

  it("a diretiva não deixa linha vazia no system quando é \"\" (o filter(Boolean) do sys)", async () => {
    const e = espiao();
    await buildHarnessDeps(ctx, { genJson: e.genJson, escopo: PASSA }).draft(estado());
    expect(e.systems.draft).not.toMatch(/\n\n\n/);
  });
});
