import { describe, it, expect } from "vitest";
import { MAX_URLS, limparFim, temUrl, urlsDoTexto } from "@/lib/agent/urls";

describe("urlsDoTexto · o que é endereço", () => {
  it("pega o endereço solto na frase", () => {
    expect(urlsDoTexto("olha isso https://sidra.ibge.gov.br/tabela/1737 e me diz")).toEqual([
      "https://sidra.ibge.gov.br/tabela/1737",
    ]);
  });

  it("www. sem esquema vira https (nunca http)", () => {
    expect(urlsDoTexto("entra em www.ibge.gov.br")).toEqual(["https://www.ibge.gov.br"]);
  });

  it("link de markdown não leva o parêntese de fechamento", () => {
    expect(urlsDoTexto("fonte: [IBGE](https://sidra.ibge.gov.br/tabela/1737)")).toEqual([
      "https://sidra.ibge.gov.br/tabela/1737",
    ]);
  });

  it("ponto final da FRASE não é parte do endereço", () => {
    expect(urlsDoTexto("veja em https://exemplo.com/serie.")).toEqual(["https://exemplo.com/serie"]);
    expect(urlsDoTexto("compara https://exemplo.com/a, https://exemplo.com/b!")).toEqual([
      "https://exemplo.com/a", "https://exemplo.com/b",
    ]);
  });

  it("parêntese BALANCEADO fica — existe de verdade em URL (Wikipédia)", () => {
    const u = "https://pt.wikipedia.org/wiki/Python_(linguagem)";
    expect(urlsDoTexto(`explica ${u} pra mim`)).toEqual([u]);
  });

  it("extensão no fim sobrevive (não é pontuação de frase)", () => {
    expect(urlsDoTexto("abre https://exemplo.com/dados.html")).toEqual(["https://exemplo.com/dados.html"]);
  });

  it("query e fragmento sobrevivem", () => {
    const u = "https://exemplo.com/busca?q=ipca&ano=2024#tabela";
    expect(urlsDoTexto(u)).toEqual([u]);
  });

  it("sem endereço, lista vazia", () => {
    expect(urlsDoTexto("me explica o IPCA")).toEqual([]);
    expect(urlsDoTexto("")).toEqual([]);
    expect(urlsDoTexto(null as any)).toEqual([]);
  });
});

describe("urlsDoTexto · o que NÃO passa", () => {
  it("endereço interno/privado nem aparece (mesmo guard do proxy de PDF)", () => {
    const ruins = [
      "http://localhost:3000/admin",
      "http://127.0.0.1/segredo",
      "http://192.168.0.10/",
      "http://10.1.2.3/",
      "http://172.16.0.1/",
      "http://169.254.169.254/latest/meta-data/",   // metadata da nuvem
    ];
    for (const u of ruins) expect(urlsDoTexto(`abre ${u}`), u).toEqual([]);
  });

  it("esquema que não é http/https não é endereço", () => {
    expect(urlsDoTexto("roda javascript:alert(1)")).toEqual([]);
    expect(urlsDoTexto("baixa ftp://exemplo.com/a.zip")).toEqual([]);
    expect(urlsDoTexto("manda email pra joao@exemplo.com")).toEqual([]);
  });

  it("a MESMA página escrita de dois jeitos é uma leitura só", () => {
    expect(urlsDoTexto("https://exemplo.com/a e https://exemplo.com/a/ e HTTPS://EXEMPLO.COM/a")).toEqual([
      "https://exemplo.com/a",
    ]);
  });

  it("respeita o teto — uma lista de vinte links não vira vinte leituras", () => {
    const muitos = Array.from({ length: 20 }, (_, i) => `https://exemplo.com/p${i}`).join(" ");
    expect(urlsDoTexto(muitos)).toHaveLength(MAX_URLS);
    expect(urlsDoTexto(muitos, 1)).toEqual(["https://exemplo.com/p0"]);
  });

  it("mantém a ordem em que a pessoa escreveu", () => {
    expect(urlsDoTexto("primeiro https://b.com/2 depois https://a.com/1")).toEqual([
      "https://b.com/2", "https://a.com/1",
    ]);
  });
});

describe("limparFim", () => {
  it("tira pontuação acumulada e parêntese sem par, em qualquer ordem", () => {
    expect(limparFim("https://x.com/a).")).toBe("https://x.com/a");
    expect(limparFim("https://x.com/a.)")).toBe("https://x.com/a");
    expect(limparFim('https://x.com/a",')).toBe("https://x.com/a");
    expect(limparFim("https://x.com/a")).toBe("https://x.com/a");
  });
});

describe("temUrl", () => {
  it("é o mesmo critério da extração, só sim/não", () => {
    expect(temUrl("resume isso: https://exemplo.com/artigo")).toBe(true);
    expect(temUrl("resume isso pra mim")).toBe(false);
    expect(temUrl("abre http://localhost/x")).toBe(false);   // interno não conta
  });
});
