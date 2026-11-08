import { describe, it, expect } from "vitest";
import { AREAS, SLUGS_AREA, areasDoTurno, classificarArea, idArea, tituloEResumo } from "./areas";
import { MENTOR_SEED } from "@/lib/agent/mentors";

describe("bases por área", () => {
  // Esta é a invariante mais barata e a mais caprichosa do RAG: área sem mentor faz o documento
  // entrar na base e ninguém alcançá-lo, E rouba a classificação de uma área que tem dono — foi
  // assim que "como funciona uma rede neural" deixou de ser encaminhada pela Zenita.
  it("uma área por mentor (os 17 slugs batem com lib/agent/mentors)", () => {
    expect([...SLUGS_AREA].sort()).toEqual(MENTOR_SEED.map((m) => m.slug).sort());
    for (const a of AREAS) { expect(a.termos.length).toBeGreaterThan(5); expect(a.wikipedia.length).toBeGreaterThan(5); }
  });
  it("areasDoTurno: mentor ativo + geral; sem mentor (ou slug estranho) só a geral", () => {
    expect(areasDoTurno("medicina")).toEqual(["area:medicina", "area:geral"]);
    expect(areasDoTurno(null)).toEqual(["area:geral"]);
    expect(areasDoTurno("hacker")).toEqual(["area:geral"]);
    expect(idArea("fisica")).toBe("area:fisica");
  });
  it("classifica artigos pelo título (3×) e resumo; ambíguo ou fraco fica de fora", () => {
    expect(classificarArea("Efeito da adubação nitrogenada na produtividade do milho", "O experimento avaliou cultivares de milho em solo argiloso sob irrigação, medindo a produtividade da safra.")?.slug).toBe("agronomia");
    expect(classificarArea("Qualidade de vida de pacientes em hemodiálise", "Estudo clínico com pacientes em tratamento dialítico no hospital universitário; diagnóstico e mortalidade.")?.slug).toBe("medicina");
    expect(classificarArea("Reflexões sobre a cidade", "Ensaio sobre urbanismo e cultura.")).toBeNull();
  });
  it("termo com $ é palavra inteira; termos genéricos não puxam artigo de outra área", () => {
    expect(classificarArea("O pós-estruturalismo e os estudos de gestão", "Estruturalismo, sujeito e emancipação na gestão.")).toBeNull();
    expect(classificarArea("Aptidão física de escolares", "Educação física e atividade física em escolares; condicionamento físico.")).toBeNull();
    expect(classificarArea("Análise estrutural de vigas de concreto armado", "Ensaio estrutural de vigas de concreto em edificações.")?.slug).toBe("eng-civil");
  });
  it("tituloEResumo: 1ª linha é o título; o resumo começa no 'Resumo' quando ele vem cedo", () => {
    const r = tituloEResumo("Título do artigo\nAutores X e Y, Universidade Z\nRESUMO Objetivo: avaliar algo. Métodos: tal.\n\nIntrodução longa...", 60);
    expect(r.titulo).toBe("Título do artigo");
    expect(r.resumo.startsWith("RESUMO Objetivo")).toBe(true);
    expect(r.resumo.length).toBeLessThanOrEqual(60);
  });
});
