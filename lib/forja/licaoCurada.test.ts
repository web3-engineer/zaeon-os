import { describe, it, expect } from "vitest";
import { arvoreELicoesDeCurso, arvoreDoCorpoSkill, questaoDoCru, type CursoJsonCru } from "./licaoCurada";

const cru: CursoJsonCru = {
  modulos: [
    {
      titulo: "Busca binária",
      estudo: "Primeiro parágrafo.\n\nSegundo parágrafo com `codigo`.",
      prova: [
        { kind: "q-choice", block: { text: "Qual a condição?", options: [{ text: "ordenada", isCorrect: true, explanation: "é a ordem" }, { text: "par", isCorrect: false }], marks: 2 } },
        { kind: "q-written", block: { text: "Escreva a linha", accepted: ["inicio = meio + 1", "lo = mid + 1"], marks: 3 } },
      ],
      desafio: { kind: "q-written", block: { text: "Por quê?", accepted: ["laço infinito"] } },
      sandbox: { tipo: "python", inicial: "def busca(lista, alvo):\n    pass", teste: "assert busca([1,2],2)==1" },
    },
    { titulo: "Euclides", estudo: "só o estudo" },
  ],
};

describe("arvoreELicoesDeCurso — base curada do curso.json", () => {
  const r = arvoreELicoesDeCurso(cru, "Algoritmos", "sub")!;

  it("monta a árvore real: raiz com um ramo por módulo (nunca vazia)", () => {
    expect(r).not.toBeNull();
    expect(r.arvore.raiz.titulo).toBe("Algoritmos");
    expect(r.arvore.raiz.filhos).toHaveLength(2);
    expect(r.arvore.raiz.filhos[0].id).toBe("mod:0");
    expect(r.arvore.raiz.filhos[0].titulo).toBe("Busca binária");
    expect(r.arvore.raiz.filhos[0].resumo).toContain("Primeiro parágrafo");
    expect(r.arvore.raiz.filhos[0].desde).toBe("basico");
  });

  it("extrai as provas reais por nó (escolha com gabarito+explicação; escrita com aceitas)", () => {
    const lic = r.licoesPorNo["mod:0"];
    expect(lic.estudo).toContain("Segundo parágrafo");
    expect(lic.prova).toHaveLength(2);
    expect(lic.prova[0]).toMatchObject({ tipo: "escolha", pontos: 2 });
    if (lic.prova[0].tipo === "escolha") {
      expect(lic.prova[0].opcoes[0]).toEqual({ texto: "ordenada", correta: true, explicacao: "é a ordem" });
      expect(lic.prova[0].opcoes[1].correta).toBe(false);
    }
    expect(lic.prova[1]).toMatchObject({ tipo: "escrita" });
    if (lic.prova[1].tipo === "escrita") expect(lic.prova[1].aceitas).toContain("inicio = meio + 1");
  });

  it("traz desafio e sandbox reais", () => {
    const lic = r.licoesPorNo["mod:0"];
    expect(lic.desafio?.tipo).toBe("escrita");
    expect(lic.sandbox).toMatchObject({ linguagem: "python" });
    expect(lic.sandbox?.inicial).toContain("def busca");
  });

  it("módulo sem prova/sandbox ainda vira ramo com o estudo", () => {
    expect(r.arvore.raiz.filhos[1].resumo).toBe("só o estudo");
    expect(r.licoesPorNo["mod:1"].prova).toEqual([]);
    expect(r.licoesPorNo["mod:1"].sandbox).toBeUndefined();
  });

  it("sem módulos → null (o chamador cai no fallback do corpo)", () => {
    expect(arvoreELicoesDeCurso({ modulos: [] }, "x")).toBeNull();
    expect(arvoreELicoesDeCurso({}, "x")).toBeNull();
  });
});

describe("questaoDoCru — normalização tolerante", () => {
  it("recusa questão malformada", () => {
    expect(questaoDoCru(undefined)).toBeNull();
    expect(questaoDoCru({ kind: "q-choice", block: { text: "x" } })).toBeNull(); // sem options
    expect(questaoDoCru({ kind: "q-written", block: { accepted: ["a"] } })).toBeNull(); // sem text
  });
});

describe("arvoreDoCorpoSkill — fallback do SKILL.md em seções", () => {
  const corpo = "# Título\n\nintro fora de seção\n\n## Seção A\ntexto a aqui\n\n## O que esta skill não faz\nnada";
  const arv = arvoreDoCorpoSkill(corpo, "T", "r")!;

  it("cada ## vira um ramo; ignora 'o que a skill não faz'", () => {
    expect(arv).not.toBeNull();
    expect(arv.raiz.filhos).toHaveLength(1);
    expect(arv.raiz.filhos[0].titulo).toBe("Seção A");
    expect(arv.raiz.filhos[0].resumo).toContain("texto a aqui");
  });

  it("corpo sem seções → null", () => {
    expect(arvoreDoCorpoSkill("# só título\n\ntexto solto", "T")).toBeNull();
  });
});
