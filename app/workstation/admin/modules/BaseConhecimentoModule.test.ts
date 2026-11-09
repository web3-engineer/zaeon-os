import { describe, expect, it } from "vitest";
import { AREAS, AREA_GERAL, idArea } from "@/lib/rag/areas";
import { MENTOR_SEED } from "@/lib/agent/mentors";
import { BASES_POR_AREA, erroDeResposta, erroLegivel, statusLegivel } from "./BaseConhecimentoModule";

describe("BaseConhecimentoModule — erros legíveis", () => {
  it("banco_indisponivel => texto de banco fora do ar", () => {
    expect(erroLegivel("banco_indisponivel")).toBe("banco da base fora do ar — tente de novo");
  });
  it("documento em erro por banco_indisponivel aparece com o texto legível", () => {
    expect(statusLegivel({ status: "erro", erro: "banco_indisponivel", comVetor: 0, totalTrechos: 0 })).toBe("erro: banco da base fora do ar — tente de novo");
  });
  it("resposta 503 => banco fora do ar; outros status => a mensagem padrão", () => {
    expect(erroDeResposta(503, "Não consegui carregar a base.")).toBe("banco da base fora do ar — tente de novo");
    expect(erroDeResposta(500, "Não consegui carregar a base.")).toBe("Não consegui carregar a base.");
  });
});

describe("BaseConhecimentoModule — bases por área no seletor", () => {
  it("tem a `geral` primeiro e uma entrada por área", () => {
    expect(BASES_POR_AREA[0].id).toBe(idArea(AREA_GERAL));
    expect(BASES_POR_AREA).toHaveLength(AREAS.length + 1);
  });

  it("todo id é `area:<slug>` — nunca um id de turma do banco", () => {
    for (const b of BASES_POR_AREA) expect(b.id).toMatch(/^area:[a-z-]+$/);
  });

  it("cobre exatamente as áreas de lib/rag/areas, sem sobra nem falta", () => {
    const esperados = new Set([idArea(AREA_GERAL), ...AREAS.map((a) => idArea(a.slug))]);
    expect(new Set(BASES_POR_AREA.map((b) => b.id))).toEqual(esperados);
  });

  it("cada área rotula com o curso e o mentor dono (nenhuma cai no slug cru)", () => {
    const comMentor = BASES_POR_AREA.filter((b) => b.id !== idArea(AREA_GERAL));
    for (const b of comMentor) {
      const slug = b.id.replace(/^area:/, "");
      const m = MENTOR_SEED.find((x) => x.slug === slug);
      expect(m, `área ${slug} sem mentor — órfã rouba classificação de quem tem dono`).toBeDefined();
      expect(b.label).toBe(`${m!.course} — ${m!.name}`);
    }
  });

  it("não repete id (um id duplicado viraria duas <option> com a mesma key)", () => {
    expect(new Set(BASES_POR_AREA.map((b) => b.id)).size).toBe(BASES_POR_AREA.length);
  });
});
