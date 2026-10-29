import { describe, it, expect } from "vitest";
import {
  FATOR_SUBSECAO, MARCA_SEM_FONTE, PISO_PALAVRAS, divergencia, nenhumVazio, palavras,
  papelDoTitulo, planoDoDocumento, resumoDaCompletude, slugSlot, type Preenchimento, type Slot,
} from "./plano";
import { ESQUELETO_ARTIGO, ESQUELETO_RELATORIO, ESQUELETO_TCC } from "@/lib/tcc/secoes";
import { WORK_SECTIONS } from "@/lib/abntTemplate";

const corpo = (n: number) => "palavra ".repeat(n).trim();
const cheio = (plano: Slot[]): Preenchimento[] =>
  plano.filter((s) => s.geradaPeloModelo).map((s) => ({ slotId: s.id, corpo: corpo(s.pisoPalavras) }));

describe("plano · papel do título", () => {
  it("reconhece os títulos reais dos esqueletos da casa", () => {
    expect(papelDoTitulo("INTRODUÇÃO")).toBe("introducao");
    expect(papelDoTitulo("REFERENCIAL TEÓRICO")).toBe("referencial");
    expect(papelDoTitulo("Estado da Arte")).toBe("referencial");
    expect(papelDoTitulo("Conceitos Fundamentais")).toBe("referencial");
    expect(papelDoTitulo("METODOLOGIA")).toBe("metodologia");
    expect(papelDoTitulo("RESULTADOS E DISCUSSÃO")).toBe("resultados");
    expect(papelDoTitulo("CONCLUSÃO")).toBe("conclusao");
    expect(papelDoTitulo("CONSIDERAÇÕES FINAIS")).toBe("conclusao");
    expect(papelDoTitulo("DESENVOLVIMENTO")).toBe("desenvolvimento");
    expect(papelDoTitulo("REFERÊNCIAS")).toBe("referencias");
    expect(papelDoTitulo("RESUMO")).toBe("resumo");
    expect(papelDoTitulo("OBJETIVOS")).toBe("objetivos");
  });

  it("título desconhecido não quebra: cai em 'outro' com piso próprio", () => {
    expect(papelDoTitulo("ANEXO C")).toBe("outro");
    expect(PISO_PALAVRAS.outro).toBeGreaterThan(0);
  });

  it("acento e caixa não contam", () => {
    expect(papelDoTitulo("introducao")).toBe("introducao");
    expect(papelDoTitulo("  Conclusão  ")).toBe("conclusao");
  });
});

describe("plano · o plano cobre o documento inteiro", () => {
  it("TCC: um slot por seção E por subseção — as subseções que hoje saem SEMPRE vazias", () => {
    const plano = planoDoDocumento(WORK_SECTIONS.TCC);
    const ids = plano.map((s) => s.id);
    expect(ids).toContain("referencial-teorico");
    expect(ids).toContain("referencial-teorico/conceitos-fundamentais");
    expect(ids).toContain("referencial-teorico/estado-da-arte");
    expect(plano.filter((s) => s.nivel === 2)).toHaveLength(2);
  });

  it("aceita o formato PLANO de lib/tcc/secoes sem conversão", () => {
    const plano = planoDoDocumento(ESQUELETO_TCC);
    expect(plano).toHaveLength(ESQUELETO_TCC.length);
    expect(plano.map((s) => s.titulo)).toEqual([...ESQUELETO_TCC]);
  });

  it("REFERÊNCIAS não é escrita pelo modelo — é montada das fontes citadas", () => {
    const plano = planoDoDocumento(ESQUELETO_TCC);
    const refs = plano.find((s) => s.papel === "referencias")!;
    expect(refs.geradaPeloModelo).toBe(false);
    expect(plano.filter((s) => s.geradaPeloModelo)).toHaveLength(ESQUELETO_TCC.length - 1);
  });

  it("seção COM subseções pede menos corpo próprio (ela é a abertura do capítulo)", () => {
    const comSubs = planoDoDocumento(WORK_SECTIONS.TCC).find((s) => s.id === "referencial-teorico")!;
    const semSubs = planoDoDocumento(ESQUELETO_TCC).find((s) => s.id === "referencial-teorico")!;
    expect(comSubs.pisoPalavras).toBe(Math.round(PISO_PALAVRAS.referencial * FATOR_SUBSECAO));
    expect(semSubs.pisoPalavras).toBe(PISO_PALAVRAS.referencial);
    expect(comSubs.pisoPalavras).toBeLessThan(semSubs.pisoPalavras);
  });

  it("subseção herda o papel da seção quando o título dela não diz nada", () => {
    const plano = planoDoDocumento([{ title: "METODOLOGIA", subs: ["Etapa 1"] }]);
    expect(plano.find((s) => s.titulo === "Etapa 1")!.papel).toBe("metodologia");
  });

  it("ids são estáveis e sem acento (chave de preenchimento)", () => {
    expect(slugSlot(["RESULTADOS E DISCUSSÃO"])).toBe("resultados-e-discussao");
    expect(slugSlot(["REFERENCIAL TEÓRICO", "Estado da Arte"])).toBe("referencial-teorico/estado-da-arte");
  });

  it("título vazio no esqueleto é ignorado, não gera slot fantasma", () => {
    expect(planoDoDocumento(["INTRODUÇÃO", "", "   "])).toHaveLength(1);
  });
});

describe("plano · a invariante nenhumVazio", () => {
  it("documento cheio passa", () => {
    const plano = planoDoDocumento(WORK_SECTIONS.TCC);
    const c = nenhumVazio(plano, cheio(plano));
    expect(c.ok).toBe(true);
    expect(c.prontos).toBe(c.exigidos);
    expect(resumoDaCompletude(c)).toMatch(/completo/);
  });

  it("ESTE É O BUG DE HOJE: o esboço preenche 3 de 6 e o resto fica em branco", () => {
    // Reproduz exatamente `corposDoEsboco` (lib/tcc/gerar.ts): INTRODUÇÃO, METODOLOGIA, REFERÊNCIAS.
    const plano = planoDoDocumento(ESQUELETO_TCC);
    const comoHoje: Preenchimento[] = [
      { slotId: "introducao", corpo: corpo(200) },
      { slotId: "metodologia", corpo: corpo(200) },
    ];
    const c = nenhumVazio(plano, comoHoje);
    expect(c.ok).toBe(false);
    expect(c.pendencias.map((p) => p.slotId).sort()).toEqual([
      "conclusao", "referencial-teorico", "resultados-e-discussao",
    ]);
    expect(c.pendencias.every((p) => p.falta === "ausente")).toBe(true);
    expect(resumoDaCompletude(c)).toBe("2/5 prontas — 3 não escrita(s)");
  });

  it("distingue ausente, vazio e CURTO — 'preenchido' não é 'pronto'", () => {
    const plano = planoDoDocumento(["INTRODUÇÃO", "CONCLUSÃO", "METODOLOGIA"]);
    const c = nenhumVazio(plano, [
      { slotId: "introducao", corpo: corpo(PISO_PALAVRAS.introducao) },
      { slotId: "conclusao", corpo: "   " },
      { slotId: "metodologia", corpo: corpo(12) },
    ]);
    expect(c.ok).toBe(false);
    expect(c.pendencias.find((p) => p.slotId === "conclusao")!.falta).toBe("vazio");
    const curta = c.pendencias.find((p) => p.slotId === "metodologia")!;
    expect(curta.falta).toBe("curto");
    expect(curta.palavras).toBe(12);
    expect(curta.piso).toBe(PISO_PALAVRAS.metodologia);
  });

  it("a pendência diz ONDE (caminho), não só que falta", () => {
    const plano = planoDoDocumento(WORK_SECTIONS.TCC);
    const c = nenhumVazio(plano, []);
    const sub = c.pendencias.find((p) => p.slotId === "referencial-teorico/estado-da-arte")!;
    expect(sub.caminho).toEqual(["REFERENCIAL TEÓRICO", "Estado da Arte"]);
  });

  it("REFERÊNCIAS vazia NÃO reprova o documento (ela é montada, não escrita)", () => {
    const plano = planoDoDocumento(ESQUELETO_TCC);
    const c = nenhumVazio(plano, cheio(plano)); // `cheio` já exclui a de referências
    expect(c.ok).toBe(true);
    expect(c.pendencias).toEqual([]);
  });

  it("seção sem fundamentação PASSA e é marcada — a decisão do dono", () => {
    const plano = planoDoDocumento(["INTRODUÇÃO"]);
    const c = nenhumVazio(plano, [{ slotId: "introducao", corpo: corpo(PISO_PALAVRAS.introducao), semFonte: true }]);
    expect(c.ok).toBe(true);                       // nunca em branco
    expect(c.semFonte).toEqual(["introducao"]);    // nunca fingindo fonte
    expect(resumoDaCompletude(c)).toMatch(/precisam de fonte/);
    expect(MARCA_SEM_FONTE).toBeTruthy();
  });

  it("preenchimento de um slot que não existe é ignorado (não vira aprovação)", () => {
    const plano = planoDoDocumento(["INTRODUÇÃO"]);
    const c = nenhumVazio(plano, [{ slotId: "secao-inventada", corpo: corpo(500) }]);
    expect(c.ok).toBe(false);
    expect(c.pendencias[0].slotId).toBe("introducao");
  });

  it("palavras() conta palavras, não caracteres", () => {
    expect(palavras("  dois   termos  ")).toBe(2);
    expect(palavras("")).toBe(0);
  });
});

describe("plano · divergência das duas fontes de esqueleto (medida, não corrigida)", () => {
  it("Artigo: REFERENCIAL TEÓRICO só existe em lib/tcc/secoes", () => {
    const d = divergencia(ESQUELETO_ARTIGO, WORK_SECTIONS.Artigo);
    expect(d.soEmA).toContain("REFERENCIAL TEÓRICO");
  });

  it("Relatório: OBJETIVOS só existe em WORK_SECTIONS — e é a ÚNICA divergência", () => {
    const d = divergencia(ESQUELETO_RELATORIO, WORK_SECTIONS["Relatório"]);
    expect(d.soEmB).toEqual(["OBJETIVOS"]);
    expect(d.soEmA).toEqual([]); // o resto bate: DESENVOLVIMENTO está nas duas
  });

  it("TCC é a única que bate — por isso a F2 pode começar por ela com segurança", () => {
    expect(divergencia(ESQUELETO_TCC, WORK_SECTIONS.TCC)).toEqual({ soEmA: [], soEmB: [] });
  });
});
