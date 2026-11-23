import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { lerPedido, INSTRUCAO_PEDIDO_VAGO } from "./pedidoVago";

describe("#868 — pedido sem assunto", () => {
  it("o caso do card: 'me ajude com resumi' é vago e sem assunto", () => {
    expect(lerPedido("me ajude com resumi")).toEqual({ semAssunto: true, vago: true });
  });

  it.each([
    "resume",
    "Resume isso pra mim, por favor",
    "me ajuda",
    "explica",
    "pode fazer um resumo?",
    "@zaeon me ajude com resumi",
    "Faz aí rapidinho",
  ])("vago: %s", (t) => {
    expect(lerPedido(t).vago).toBe(true);
  });

  it.each([
    "resume o capítulo 3 de fotossíntese",
    "me ajuda com a prova de cálculo",
    "explica o ciclo de Krebs",
    "faz um resumo do texto sobre a Revolução Francesa",
    "o que é DNA?",
    "qual a capital da Austrália",
  ])("tem assunto: %s", (t) => {
    expect(lerPedido(t)).toEqual({ semAssunto: false, vago: false });
  });

  it("cumprimento não é pedido vago (não manda perguntar), mas também não busca na base", () => {
    expect(lerPedido("oi, tudo bem?")).toEqual({ semAssunto: false, vago: false });
    expect(lerPedido("oi")).toEqual({ semAssunto: true, vago: false });
    expect(lerPedido("")).toEqual({ semAssunto: true, vago: false });
  });

  it("a instrução manda usar a conversa e, sem ela, perguntar em vez de escolher um tema", () => {
    expect(INSTRUCAO_PEDIDO_VAGO).toMatch(/conversa do canal/);
    expect(INSTRUCAO_PEDIDO_VAGO).toMatch(/pergunte/);
    expect(INSTRUCAO_PEDIDO_VAGO).toMatch(/Resumo de quê\?/);
  });

  it("o turno do canal não busca na base com pedido sem assunto e passa a instrução quando é vago", () => {
    const src = readFileSync("lib/canal/agent-turn.ts", "utf8");
    expect(src).toMatch(/const pedido = lerPedido\(objective\)/);
    expect(src).toMatch(/pedido\.semAssunto \? null : await import\("@\/lib\/rag\/turno"\)/);
    expect(src).toMatch(/pedido\.vago \? INSTRUCAO_PEDIDO_VAGO : ""/);
  });
});
