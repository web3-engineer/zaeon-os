import { describe, it, expect } from "vitest";
import {
  MAX_CHARS_ANEXO,
  MAX_CHARS_TRECHO,
  MIN_CHARS_UTIL,
  acharAnexo,
  anexoDe,
  anexoNoHarnessLigado,
  anexoUtil,
  blocoDosAnexos,
  claimDoTrecho,
  cortarTexto,
  inventarioDosAnexos,
  trechoDoAnexo,
  type AnexoDoTurno,
} from "@/lib/agent/anexos";

const texto = (n: number, c = "a") => c.repeat(n);
const anexo = (over: Partial<AnexoDoTurno> = {}): AnexoDoTurno =>
  anexoDe({ id: "a1", nome: "artigo.pdf", tipo: "application/pdf", texto: texto(1000), paginas: 4, ...over });

describe("anexoUtil · é o que decide harness × caminho legado", () => {
  it("texto de verdade é útil", () => {
    expect(anexoUtil({ texto: texto(MIN_CHARS_UTIL) })).toBe(true);
  });
  it("PDF escaneado (nada ou quase nada extraído) NÃO é útil — só o multimodal o lê", () => {
    expect(anexoUtil({ texto: "" })).toBe(false);
    expect(anexoUtil({ texto: "   \n  " })).toBe(false);
    expect(anexoUtil({ texto: texto(MIN_CHARS_UTIL - 1) })).toBe(false);
  });
});

describe("anexoDe / cortarTexto", () => {
  it("corta no teto, de preferência num espaço (não parte palavra)", () => {
    const comEspacos = `${texto(MAX_CHARS_ANEXO - 5)} final`;
    const c = cortarTexto(comEspacos);
    expect(c.length).toBeLessThanOrEqual(MAX_CHARS_ANEXO);
    expect(c.endsWith(" ")).toBe(false);
  });
  it("texto dentro do teto sai intacto", () => {
    expect(cortarTexto("curto")).toBe("curto");
  });
  it("sem espaço perto do corte, corta seco (não devolve texto gigante)", () => {
    expect(cortarTexto(texto(MAX_CHARS_ANEXO + 500)).length).toBe(MAX_CHARS_ANEXO);
  });
  it("normaliza nome, tipo e páginas", () => {
    const a = anexoDe({ id: "a1", nome: "x".repeat(300), tipo: "application/pdf", texto: " oi " });
    expect(a.nome).toHaveLength(160);
    expect(a.texto).toBe("oi");
    expect("paginas" in a).toBe(false);   // 0 página não vira campo
  });
});

describe("o inventário · nomes, nunca conteúdo", () => {
  it("uma linha por anexo, com id, nome, páginas e tamanho", () => {
    const inv = inventarioDosAnexos([anexo(), anexo({ id: "a2", nome: "notas.md", texto: texto(3200), paginas: 0 })]);
    expect(inv).toContain('- a1: "artigo.pdf", 4 páginas (1 mil caracteres)');
    expect(inv).toContain('- a2: "notas.md" (3 mil caracteres)');
  });

  it("o BLOCO do systemContext não leva o texto do documento", () => {
    const corpo = "SEGREDO DO DOCUMENTO";
    const b = blocoDosAnexos([anexo({ texto: `${corpo} ${texto(1000)}` })]);
    expect(b).toContain("artigo.pdf");
    expect(b).not.toContain(corpo);   // o conteúdo vem pela TOOL, uma vez só
    expect(b).toMatch(/não invente o que ele diz/);
  });

  it("sem anexo, nada é dito", () => {
    expect(blocoDosAnexos([])).toBe("");
    expect(inventarioDosAnexos([])).toBe("");
  });
});

describe("trechoDoAnexo · o recorte", () => {
  it("documento pequeno vem inteiro e marcado como fim", () => {
    const t = trechoDoAnexo(anexo({ texto: "curto" }));
    expect(t).toEqual({ texto: "curto", de: 0, ate: 5, total: 5, fim: true });
  });

  it("documento grande vem no teto e NÃO marcado como fim", () => {
    const t = trechoDoAnexo(anexo({ texto: texto(MAX_CHARS_TRECHO + 5000) }));
    expect(t.texto).toHaveLength(MAX_CHARS_TRECHO);
    expect(t.fim).toBe(false);
    expect(t.ate).toBe(MAX_CHARS_TRECHO);
  });

  it("`de` continua de onde parou e fecha o documento", () => {
    const a = anexo({ texto: texto(MAX_CHARS_TRECHO + 100) });
    const t = trechoDoAnexo(a, { de: MAX_CHARS_TRECHO });
    expect(t.texto).toHaveLength(100);
    expect(t.fim).toBe(true);
  });

  it("`de` fora da faixa é PRESO na faixa — trecho vazio seria lido como 'o documento acabou'", () => {
    const a = anexo({ texto: texto(500) });
    expect(trechoDoAnexo(a, { de: 99999 }).texto.length).toBeGreaterThan(0);
    expect(trechoDoAnexo(a, { de: -50 }).de).toBe(0);
    expect(trechoDoAnexo(a, { de: NaN as any }).de).toBe(0);
  });

  it("`chars` não passa do teto por mais que peçam", () => {
    const a = anexo({ texto: texto(MAX_CHARS_TRECHO * 3) });
    expect(trechoDoAnexo(a, { chars: 999_999 }).texto).toHaveLength(MAX_CHARS_TRECHO);
  });
});

describe("claimDoTrecho · o aviso que impede a conclusão errada", () => {
  it("documento inteiro é dito como inteiro", () => {
    const a = anexo({ texto: "curto" });
    expect(claimDoTrecho(a, trechoDoAnexo(a))).toContain("documento completo");
  });

  it("SOBROU documento ⇒ o claim grita isso", () => {
    const a = anexo({ texto: texto(MAX_CHARS_TRECHO + 5000) });
    const c = claimDoTrecho(a, trechoDoAnexo(a));
    // sem este aviso o modelo trata um terço do artigo como o artigo e afirma
    // que "o texto não menciona X"
    expect(c).toContain("HÁ MAIS DEPOIS DISTO");
    expect(c).toContain("a1");
    expect(c).toContain("artigo.pdf");
  });

  it("o último pedaço é dito como até o fim", () => {
    const a = anexo({ texto: texto(MAX_CHARS_TRECHO + 10) });
    expect(claimDoTrecho(a, trechoDoAnexo(a, { de: MAX_CHARS_TRECHO }))).toContain("até o fim");
  });
});

describe("acharAnexo", () => {
  const lista = [anexo(), anexo({ id: "a2", nome: "Notas da Aula.md" })];
  it("por id, por nome exato e por pedaço do nome", () => {
    expect(acharAnexo(lista, "a2")?.id).toBe("a2");
    expect(acharAnexo(lista, "A2")?.id).toBe("a2");
    expect(acharAnexo(lista, "Notas da Aula.md")?.id).toBe("a2");
    expect(acharAnexo(lista, "notas")?.id).toBe("a2");
  });
  it("sem referência, o primeiro", () => {
    expect(acharAnexo(lista, "")?.id).toBe("a1");
  });
  it("referência que não existe NÃO cai no primeiro", () => {
    // responder sobre o documento errado é pior que dizer que não achou
    expect(acharAnexo(lista, "tese-do-vizinho")).toBeUndefined();
  });
});

describe("a flag", () => {
  it("AUSENTE = LIGADA (dono: tudo ON); só 0/off/false/não desligam", () => {
    expect(anexoNoHarnessLigado({})).toBe(true);
    for (const v of ["0", "off", "false", "nao"]) expect(anexoNoHarnessLigado({ HARNESS_ANEXO: v }), v).toBe(false);
  });
  it("qualquer outro valor liga", () => {
    expect(anexoNoHarnessLigado({ HARNESS_ANEXO: "1" })).toBe(true);
  });
});
