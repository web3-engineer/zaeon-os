import { describe, it, expect } from "vitest";
import { pedidoDeChore } from "./triagem";
import { validarAlvo } from "./criar";

describe("pedidoDeChore (ramo chore da triagem — em dúvida, turno)", () => {
  it("@aura resume <url> → chore resumir_link", () => {
    expect(pedidoDeChore("@aura resume https://x.gov.br/a")).toEqual({ tipo: "resumir_link", url: "https://x.gov.br/a" });
    expect(pedidoDeChore("@aura o que diz https://scielo.br/art?id=1.")).toEqual({ tipo: "resumir_link", url: "https://scielo.br/art?id=1" });
    expect(pedidoDeChore("@osler confere esse link https://who.int/news")?.tipo).toBe("resumir_link");
  });
  it("pedido de ENTREGÁVEL → null (vira tarefa/turno)", () => {
    expect(pedidoDeChore("@aura faz um relatório sobre https://x.gov.br/a")).toBeNull();
    expect(pedidoDeChore("@aura resume https://x.gov.br/a num artigo")).toBeNull();
  });
  it("URL sozinha ou sem verbo curto → null (turno)", () => {
    expect(pedidoDeChore("https://x")).toBeNull();
    expect(pedidoDeChore("@aura https://x.gov.br/a")).toBeNull();
    expect(pedidoDeChore("@aura me explica fotossíntese")).toBeNull();
  });
});

describe("validarAlvo", () => {
  it("saneia e limita por tipo", () => {
    expect(validarAlvo("resumir_link", { url: "javascript:alert(1)" })).toEqual({ erro: "url http(s) obrigatória" });
    expect(validarAlvo("resumir_link", { url: " https://a.gov.br/x ", extra: "lixo" })).toEqual({ alvo: { url: "https://a.gov.br/x" } });
    expect(validarAlvo("link_rot", { urls: ["https://a.br", "file:///etc", ...Array(30).fill("https://b.br")] })).toMatchObject({ alvo: { urls: expect.any(Array) } });
    expect((validarAlvo("link_rot", { urls: Array(30).fill("https://b.br") }) as any).alvo.urls).toHaveLength(20);
    expect(validarAlvo("extrair_campos", { url: "https://a.br", campos: [] })).toEqual({ erro: "campos obrigatórios" });
    expect(validarAlvo("classificar_anexo", { texto: "t", classes: ["a"] })).toHaveProperty("erro");
    expect(validarAlvo("formatar_abnt", { referencia: {} })).toHaveProperty("erro");
    expect(validarAlvo("traduzir_trecho", { texto: "hi" })).toEqual({ alvo: { texto: "hi", de: undefined, para: "pt-BR" } });
  });
});
