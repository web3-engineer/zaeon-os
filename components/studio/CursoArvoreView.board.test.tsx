import { describe, it, expect } from "vitest";
import { montarBoardHtml } from "./CursoArvoreView";
import { conteudoCuradoDoCurso } from "@/lib/forja/conteudoCurado";
import type { EsqueletoRepo } from "@/lib/forja/tipos";

const esq = (id: string): EsqueletoRepo => ({ id, repo: "TheAlgorithms/Python", titulo: `Curso ${id}`, resumo: "resumo", modo: "curso" });

describe("montarBoardHtml — o board renderiza o conteúdo REAL (fim do teatro)", () => {
  const c = conteudoCuradoDoCurso(esq("algoritmos-classicos"))!;
  const ramo = c.arvore.raiz.filhos[0];
  const lic = c.licoesPorNo[ramo.id];
  const html = montarBoardHtml({ titulo: ramo.titulo, tipo: "mod", mod: ramo.titulo, repo: "TheAlgorithms/Python", resumo: ramo.resumo, lic });

  it("mostra o Aprendizado real (o `estudo` do curso.json)", () => {
    const prefixo = lic.estudo.split("`")[0].slice(0, 24).trim(); // trecho sem caractere especial/escape
    expect(prefixo.length).toBeGreaterThan(8);
    expect(html).toContain(prefixo);
  });

  it("mostra a prova real (uma opção verdadeira da questão de escolha)", () => {
    const escolha = lic.prova.find((q) => q.tipo === "escolha");
    expect(escolha, "o módulo deveria ter uma questão de escolha").toBeTruthy();
    if (escolha && escolha.tipo === "escolha") {
      const correta = escolha.opcoes.find((o) => o.correta)!;
      expect(html).toContain(correta.texto);
      expect(html).toContain('data-ok="1"'); // marca a resposta certa (interação real)
    }
  });

  it("mostra o sandbox real (bloco de código do exercício)", () => {
    expect(html).toContain("av-code");
    expect(html).toContain("exercício");
  });

  it("NÃO fabrica mais conteúdo (sem o quiz genérico nem o 'from X import' falso)", () => {
    expect(html).not.toContain("Uma peça central de");
    expect(html).not.toContain("símbolo mapeado pelo graphify");
    expect(html).not.toContain("trecho real do repositório");
  });

  it("nó sem lição curada (nó do grafo): espelho honesto do graphify, sem inventar prova", () => {
    const h = montarBoardHtml({ titulo: "Value", tipo: "sim", mod: "engine.py", repo: "karpathy/micrograd" });
    expect(h).toContain("símbolo mapeado pelo graphify");
    expect(h).not.toContain("exercício");       // sem sandbox inventado
    expect(h).not.toContain("av-qbloco");        // sem prova inventada
  });
});
