/**
 * lib/chat/conviteTexto.test.ts — o texto do convite, nas três coisas que erram caro.
 */
import { describe, it, expect } from "vitest";
import { temaDoConvite, mensagemDeConvite, MAX_TEMA } from "@/lib/chat/conviteTexto";

describe("temaDoConvite", () => {
  it("pega o primeiro candidato que serve (o aberto vem antes)", () => {
    expect(temaDoConvite(["A fotossíntese", "Outro"])).toBe("A fotossíntese");
    expect(temaDoConvite([null, undefined, "", "Andragogia"])).toBe("Andragogia");
  });

  it("RECUSA o título PROVISÓRIO — convite 'sobre Documento em preparação' é pior que sem tema", () => {
    // `TITULO_PROVISORIO` de lib/tcc/turno é o que o gerador põe antes de o briefing virar título
    expect(temaDoConvite(["Documento em preparação"])).toBeUndefined();
    expect(temaDoConvite(["documento em preparacao"])).toBeUndefined();   // sem acento, outra caixa
  });

  it("recusa rótulo genérico de aba e cai no próximo candidato", () => {
    for (const g of ["Documento", "TCC", "Conversa", "A conversa", "Sem título", "Untitled", "artigo"]) {
      expect(temaDoConvite([g]), g).toBeUndefined();
    }
    expect(temaDoConvite(["TCC", "Letramento digital"])).toBe("Letramento digital");
  });

  it("tira o rótulo do tipo que a aba prefixa (`artigo: X` → `X`)", () => {
    expect(temaDoConvite(["artigo: A fotossíntese"])).toBe("A fotossíntese");
    expect(temaDoConvite(["TCC: Andragogia na EJA"])).toBe("Andragogia na EJA");
  });

  it("uma linha só, sem espaço duplo e sem pontuação pendurada (a mensagem é colada no WhatsApp)", () => {
    expect(temaDoConvite(["  A\n\tfotossíntese  "])).toBe("A fotossíntese");
    expect(temaDoConvite(["A fotossíntese..."])).toBe("A fotossíntese");
    expect(temaDoConvite(["A   fotossíntese -"])).toBe("A fotossíntese");
  });

  it("corta o tema longo, senão o link se perde no meio do parágrafo", () => {
    const longo = "a influência da andragogia na educação de jovens e adultos em contextos periféricos brasileiros do século XXI";
    const t = temaDoConvite([longo])!;
    expect(t.length).toBeLessThanOrEqual(MAX_TEMA);
    expect(t.endsWith("…")).toBe(true);
  });

  it("nada que sirva → undefined, e a frase sai sem 'sobre'", () => {
    expect(temaDoConvite([])).toBeUndefined();
    expect(temaDoConvite(["", "  ", null, "X"])).toBeUndefined();
  });
});

describe("mensagemDeConvite", () => {
  const url = "https://zaeon.com.br/convite/abc123";

  it("editor: chama pra estudar JUNTO, com o tema e o link", () => {
    expect(mensagemDeConvite({ url, tema: "A fotossíntese", papel: "editor" }))
      .toBe(`Vem estudar comigo sobre A fotossíntese aqui na Zaeon! ${url}`);
  });

  it("LEITOR não recebe 'estudar comigo': o link só deixa acompanhar, e o convite não promete mais", () => {
    const m = mensagemDeConvite({ url, tema: "A fotossíntese", papel: "leitor" });
    expect(m).toBe(`Vem acompanhar meus estudos sobre A fotossíntese aqui na Zaeon! ${url}`);
    expect(m).not.toContain("comigo sobre");
  });

  it("sem tema: a frase fecha sozinha, sem buraco nem 'sobre' solto", () => {
    expect(mensagemDeConvite({ url, papel: "editor" })).toBe(`Vem estudar comigo aqui na Zaeon! ${url}`);
    expect(mensagemDeConvite({ url, papel: "leitor" })).toBe(`Vem acompanhar meus estudos aqui na Zaeon! ${url}`);
  });

  it("o link está sempre lá, inteiro e no fim — é o que faz a mensagem ser clicável", () => {
    for (const papel of ["editor", "leitor"] as const) {
      for (const tema of [undefined, "Andragogia"]) {
        expect(mensagemDeConvite({ url, tema, papel }).endsWith(url), `${papel}/${tema}`).toBe(true);
      }
    }
  });
});
