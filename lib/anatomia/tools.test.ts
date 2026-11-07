/**
 * As duas ferramentas de anatomia do agente, e a habilidade no mentor.
 *
 * O que estes testes protegem, em ordem de gravidade:
 *
 *  1. TODO achado carrega FONTE. `ToolResult.findings[].source` é o que o examiner cruza na checagem
 *     `sem_fonte`; um achado sem fonte faria afirmação anatômica entrar no turno SEM LASTRO, com
 *     aparência de evidência. Num mentor de medicina isso é o pior defeito possível.
 *  2. SEM MANIFESTO, as tools NÃO SE REGISTRAM. A regra da F0: o cardápio é derivado do registry, e
 *     tool registrada que falha sempre faria o mentor anunciar "exploro anatomia 3D" e não explorar.
 *  3. "Não achei" é DISTINGUÍVEL de "não existe no corpo". O atlas é referência parcial de adulto
 *     masculino (não tem linfonodo, por exemplo) e o erro tem de dizer isso.
 *  4. Id é EXATO. Devolver "o mais parecido" faria o mentor descrever estrutura que ninguém pediu.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ALL_MENTOR_SKILLS, MENTOR_SEED, RUNTIME_SKILLS } from "@/lib/agent/mentors";
import { DEPARTAMENTOS } from "@/lib/office/mapa";
import { FONTE_ATLAS, buscarAnatomiaDef, inspecionarAnatomiaDef, registrarAnatomia } from "@/lib/anatomia/tools";
import { CAMINHO_ATLAS, __resetAtlasParaTeste, atlasDisponivel, resumoDoAtlas } from "@/lib/anatomia/carregar";
import { getTool } from "@/lib/agent/runtime";

const ctx = {} as never;
afterEach(() => { vi.restoreAllMocks(); __resetAtlasParaTeste(); });

describe("o manifesto chega ao servidor", () => {
  it("carrega do disco e resume em contagens — e o caminho é o que a imagem entrega", () => {
    expect(CAMINHO_ATLAS).toBe("public/models/atlas.json");
    expect(readFileSync(join(process.cwd(), CAMINHO_ATLAS), "utf8").length).toBeGreaterThan(1_000_000);
    expect(atlasDisponivel()).toBe(true);
    expect(resumoDoAtlas()).toEqual({ pecas: 2234, conceitos: 3432, sistemas: 15, triangulos: 2288268 });
  });
});

describe("buscar_anatomia", () => {
  it("acha, e TODO achado carrega a fonte CC BY — é isso que o examiner cruza", async () => {
    const r = await buscarAnatomiaDef.run({ consulta: "heart" }, ctx);
    expect(r.ok).toBe(true);
    expect(r.findings!.length).toBeGreaterThan(0);
    for (const f of r.findings!) {
      expect(f.source, "achado sem fonte entraria no turno como evidência sem lastro").toBeTruthy();
      expect(f.source!.title).toContain("BodyParts3D");
      expect(f.source!.title).toContain("CC BY 4.0");
      expect(f.source!.url).toBe(FONTE_ATLAS.url);
      expect(f.claim).toMatch(/\(FMA\d+\)/);          // o id vai no claim: a afirmação é rastreável
    }
    expect(r.provenance.toolsUsed).toContain("buscar_anatomia");
  });

  it("aceita PORTUGUÊS nos termos comuns — sem isso a busca é inútil pro aluno brasileiro", async () => {
    for (const q of ["coração", "fígado", "estômago"]) {
      const r = await buscarAnatomiaDef.run({ consulta: q }, ctx);
      expect(r.ok, `"${q}" devia achar`).toBe(true);
      expect(r.findings!.length).toBeGreaterThan(0);
    }
  });

  it("consulta vazia e sem resultado têm códigos DIFERENTES, e o 'sem resultado' diz que o atlas é parcial", async () => {
    const vazia = await buscarAnatomiaDef.run({ consulta: "   " }, ctx);
    expect(vazia.ok).toBe(false);
    expect(vazia.code).toBe("consulta_vazia");

    const nada = await buscarAnatomiaDef.run({ consulta: "zzzznaoexiste" }, ctx);
    expect(nada.ok).toBe(false);
    expect(nada.code).toBe("sem_resultado");
    // "não achei" NÃO pode ser lido como "não existe no corpo humano"
    expect(nada.error).toMatch(/refer[êe]ncia parcial/i);
  });
});

describe("inspecionar_anatomia", () => {
  it("id exato traz sistema, contagem de malhas e explicação quando houver", async () => {
    const r = await inspecionarAnatomiaDef.run({ id: "FMA3710" }, ctx);
    expect(r.ok).toBe(true);
    const c = r.findings![0].claim;
    expect(c).toContain("vascular tree");
    expect(c).toContain("FMA3710");
    expect(c).toMatch(/malhas?/);
    expect(r.findings![0].source!.title).toContain("CC BY 4.0");
  });

  it("id parecido, caixa errada, vazio ou ausente = id_desconhecido, nunca 'o mais próximo'", async () => {
    for (const id of ["FMA37", "fma3710", "", undefined, 3710]) {
      const r = await inspecionarAnatomiaDef.run({ id }, ctx);
      expect(r.ok, `id ${JSON.stringify(id)}`).toBe(false);
      expect(r.code).toBe("id_desconhecido");
    }
  });
});

describe("F0 · sem manifesto, as tools NÃO EXISTEM (em vez de existir e falhar)", () => {
  it("registrarAnatomia recusa, e nenhuma das duas entra no registry", async () => {
    vi.doMock("@/lib/anatomia/carregar", () => ({
      carregarAtlas: () => null, atlasDisponivel: () => false, resumoDoAtlas: () => null,
      CAMINHO_ATLAS: "public/models/atlas.json", __resetAtlasParaTeste: () => {},
    }));
    vi.resetModules();
    const mod = await import("@/lib/anatomia/tools");
    expect(mod.registrarAnatomia()).toBe(false);
    // e a tool, se chamada à força, devolve erro NOMEADO em vez de estourar
    const r = await mod.buscarAnatomiaDef.run({ consulta: "heart" }, ctx);
    expect(r.ok).toBe(false);
    expect(r.code).toBe("atlas_indisponivel");
    vi.doUnmock("@/lib/anatomia/carregar");
    vi.resetModules();
  });

  it("COM manifesto, registra as duas e elas ficam disponíveis no turno", () => {
    expect(registrarAnatomia()).toBe(true);
    expect(getTool("buscar_anatomia")?.name).toBe("buscar_anatomia");
    expect(getTool("inspecionar_anatomia")?.name).toBe("inspecionar_anatomia");
    expect(buscarAnatomiaDef.disponivelNoTurno?.(ctx)).toBe(true);
    expect(buscarAnatomiaDef.risk).toBe("read");          // ler anatomia não escreve nada
    expect(inspecionarAnatomiaDef.risk).toBe("read");
  });
});

describe("a habilidade no mentor de medicina", () => {
  it("o Osler tem `anatomia`, e ela é resolvida pelo runtime (não é promessa vazia)", () => {
    const osler = MENTOR_SEED.find((m) => m.slug === "medicina")!;
    expect(osler.name).toBe("Osler");
    expect(osler.enabledSkills).toContain("anatomia");
    expect(RUNTIME_SKILLS.has("anatomia"), "skill declarada que o runtime não resolve é mentira").toBe(true);
    expect(ALL_MENTOR_SKILLS).toContain("anatomia");
  });

  it("toda skill do vocabulário tem um pod no mapa do escritório — nenhuma órfã", () => {
    for (const s of ALL_MENTOR_SKILLS) expect(DEPARTAMENTOS[s], `skill ${s} sem departamento`).toBeTruthy();
    expect(DEPARTAMENTOS.anatomia.nome).toBe("Anatomia");
    expect(DEPARTAMENTOS.anatomia.cor).toBe("#B8916B");   // = a cor do digestório no atlas, não gosto
  });

  it("o guardrail de saúde continua no Osler — anatomia 3D não afrouxa o 'educacional, nunca diagnóstico'", () => {
    const osler = MENTOR_SEED.find((m) => m.slug === "medicina")!;
    expect(osler.guardrail, "mentor de saúde sem guardrail").toBeTruthy();
    expect(osler.personaText).toMatch(/EDUCACIONAL/);
    expect(osler.personaText).toMatch(/nunca diagnostica nem prescreve/i);
  });
});
