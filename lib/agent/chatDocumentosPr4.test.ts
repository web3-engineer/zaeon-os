// @vitest-environment jsdom
/**
 * #873 PR 4: Exportar da peça e o que os testes de 24 e 25/11 acharam.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { estruturaDaPeca } from "@/lib/export/peca";
import { faltandoPara, type OpcoesExport } from "@/components/tcc/ExportarTrabalho";
import { blocoOutrosArquivos, MAX_OUTROS_ARQUIVOS } from "@/lib/agent/anexos";
import { gravarAnexoGuardado, lerAnexoGuardado, MAX_CONVERSAS_GUARDADAS } from "@/lib/chat/anexoGuardado";
import { CAMPO_JULGADO, CAMPO_PROCESSO, respostaDaPecaCriada, semNumeroInventado } from "@/lib/documento/pecaJuridica";
import { tituloDoTema } from "@/lib/tcc/titulo";
import { ehEnvioRepetido, JANELA_REPETIDO_MS } from "@/lib/chat/envioRepetido";

const opcoes: OpcoesExport = { estilo: "abnt", formato: "docx", author: "", institution: "", course: "", advisor: "", city: "", year: "2026" };

describe("Exportar da peça", () => {
  it("a peça não pede capa (instituição/cidade); o trabalho ABNT continua pedindo", () => {
    expect(faltandoPara(opcoes, true)).toEqual([]);
    expect(faltandoPara(opcoes)).toEqual(["instituição", "cidade"]);
  });

  it("a peça vai como está: as partes dela, sem resumo e sem chamar a IA", () => {
    const partes = [{ type: "desenvolvimento", title: "DOS FATOS", content: "x", subsections: [] }];
    const e = estruturaDaPeca("texto", partes);
    expect(e.sections).toBe(partes);
    expect(e.resumo).toBe("");
    expect(estruturaDaPeca("só texto").sections).toEqual([{ type: "desenvolvimento", title: "", content: "só texto", subsections: [] }]);
  });

  it("a rota manda a peça no estilo 'peca' e sem a checagem da capa (ligado de verdade)", () => {
    const rota = readFileSync("app/api/documents/abnt-export/route.ts", "utf8");
    expect(rota).toMatch(/const peca = body\.workType === TIPO_TRABALHO_PECA/);
    expect(rota).toMatch(/if \(!peca && estilo === 'abnt'/);
    expect(rota).toMatch(/style: peca \? 'peca' : estilo/);
    const servico = readFileSync("abnt-service/main.py", "utf8");
    expect(servico).toMatch(/filename_safe = nome_do_arquivo\(payload\.title\)/);
  });
});

describe("a Aura aponta o outro arquivo", () => {
  const manual = [{ id: "m", nome: "manual-gigante-300p", conteudo: "" }] as any;

  it("com anexo, lista os OUTROS arquivos guardados (sem o anexado) e manda apontar sem inventar o conteúdo", () => {
    const b = blocoOutrosArquivos(["manual-gigante-300p.pdf", "mandacaru-7-teste", "caatinga-3-escaneado"], manual);
    expect(b).toContain('"mandacaru-7-teste"');
    expect(b).not.toContain('"manual-gigante-300p');
    expect(b).toMatch(/parece estar no seu outro arquivo/);
    expect(b).toMatch(/Nunca diga o que está dentro/);
  });

  it("sem anexo, ou sem outros arquivos: nada", () => {
    expect(blocoOutrosArquivos(["mandacaru-7-teste"], [])).toBe("");
    expect(blocoOutrosArquivos(["manual-gigante-300p"], manual)).toBe("");
  });

  it("sem repetir e com teto", () => {
    const muitos = Array.from({ length: 80 }, (_, i) => `doc-${i}`);
    expect((blocoOutrosArquivos([...muitos, "doc-1"], manual).match(/"doc-/g) ?? []).length).toBe(MAX_OUTROS_ARQUIVOS);
  });
});

describe("o anexo sobrevive ao recarregar (ponteiro por conversa)", () => {
  beforeEach(() => localStorage.clear());

  it("grava, lê, e o × apaga", () => {
    gravarAnexoGuardado("estudos", "c1", { id: "pdf-1", nome: "mandacaru" });
    expect(lerAnexoGuardado("estudos", "c1")).toEqual({ id: "pdf-1", nome: "mandacaru" });
    expect(lerAnexoGuardado("estudos", "c2")).toBeNull();
    expect(lerAnexoGuardado("pesquisa", "c1")).toBeNull();   // cada sala com o seu
    gravarAnexoGuardado("estudos", "c1", null);
    expect(lerAnexoGuardado("estudos", "c1")).toBeNull();
  });

  it("imagem não é guardada; o mapa não cresce sem fim", () => {
    gravarAnexoGuardado("estudos", "c1", { id: "img-1", nome: "foto" });
    expect(lerAnexoGuardado("estudos", "c1")).toBeNull();
    for (let i = 0; i < MAX_CONVERSAS_GUARDADAS + 10; i++) gravarAnexoGuardado("estudos", `c${i}`, { id: `pdf-${i}`, nome: "x" }, i);
    expect(lerAnexoGuardado("estudos", "c0")).toBeNull();   // o mais antigo saiu
    expect(lerAnexoGuardado("estudos", `c${MAX_CONVERSAS_GUARDADAS + 9}`)).not.toBeNull();
  });
});

describe("a peça não inventa número de julgado/processo", () => {
  it("o caso do teste: 'REsp 1.234.567/SP' vira campo; a citação da LEI fica", () => {
    const t = semNumeroInventado("Conforme o STJ (REsp 1.234.567/SP) e o art. 62 da Lei 8.245/91.");
    expect(t).toBe(`Conforme o STJ (${CAMPO_JULGADO}) e o art. 62 da Lei 8.245/91.`);
  });

  it("outros julgados e o número de processo do CNJ", () => {
    expect(semNumeroInventado("AgRg no AREsp 123.456")).toBe(CAMPO_JULGADO);
    expect(semNumeroInventado("RE nº 654.321")).toBe(CAMPO_JULGADO);
    expect(semNumeroInventado("Processo 0001234-56.2024.8.06.0001")).toBe(`Processo ${CAMPO_PROCESSO}`);
    expect(semNumeroInventado("Lei nº 8.245, de 1991")).toBe("Lei nº 8.245, de 1991");
  });
});

describe("a bolha da procuração não diz 'a base não contém informações'", () => {
  it("recusa por falta de base vira a confirmação; resposta boa fica", () => {
    const r = respostaDaPecaCriada("A base de conhecimento fornecida não contém informações sobre como elaborar uma procuração.", "Procuração — INSS");
    expect(r).toMatch(/Comecei a escrever \*\*Procuração — INSS\*\*/);
    expect(r).toMatch(/entre colchetes/);
    expect(respostaDaPecaCriada("Preparei a procuração com os poderes para o INSS.", "x")).toBe("Preparei a procuração com os poderes para o INSS.");
    expect(respostaDaPecaCriada("", "Contrato")).toMatch(/Comecei a escrever/);
  });
});

describe("o título do documento", () => {
  it("'sobre a Lei do Inquilinato' vira 'Lei do Inquilinato' (o tema da geração não muda)", () => {
    expect(tituloDoTema("a Lei do Inquilinato")).toBe("Lei do Inquilinato");
    expect(tituloDoTema("fotossíntese em plantas C4")).toBe("Fotossíntese em plantas C4");
    expect(tituloDoTema("o")).toBe("O");
  });
});

describe("mensagem enviada duas vezes", () => {
  it("a mesma frase em menos de 3 s não sai de novo; depois sai; outra frase sai", () => {
    const u = { texto: "explica o ciclo de Krebs", em: 1000 };
    expect(ehEnvioRepetido(u, "explica o  ciclo de krebs ", 1000 + 500)).toBe(true);
    expect(ehEnvioRepetido(u, "explica o ciclo de Krebs", 1000 + JANELA_REPETIDO_MS)).toBe(false);
    expect(ehEnvioRepetido(u, "e a glicólise?", 1200)).toBe(false);
    expect(ehEnvioRepetido(null, "x")).toBe(false);
  });

  it("a trava é síncrona e ligada no envio do chat", () => {
    const src = readFileSync("components/study/StudyCoworkChat.tsx", "utf8");
    expect(src).toMatch(/if \(envioEmCurso\.current \|\| \(typeof override !== "string" && ehEnvioRepetido\(ultimoEnvio\.current, prompt\)\)\) return;/);
    expect(src).toMatch(/envioEmCurso\.current = false;/);
  });
});
