import { describe, expect, it } from "vitest";
import { LAB_ENTRADA, copyEntrada, ehMsgEntrarEstudo, ehRotaImersiva, pedeFoco } from "./loungeHub";

describe("loungeHub", () => {
  it("rota imersiva só no cyberespaço", () => {
    expect(ehRotaImersiva("/lounge-cosmico")).toBe(true);
    expect(ehRotaImersiva("/lounge-cosmico/x")).toBe(true);
    expect(ehRotaImersiva("/lounge-cosmicos")).toBe(false);
    // o Atlas do Corpo também é imersivo — e "/anatomias" NÃO é ele
    expect(ehRotaImersiva("/anatomia")).toBe(true);
    expect(ehRotaImersiva("/anatomia/osso")).toBe(true);
    expect(ehRotaImersiva("/anatomias")).toBe(false);
    expect(ehRotaImersiva("/anatomia-3d")).toBe(false);
    expect(ehRotaImersiva("/")).toBe(false);
    expect(ehRotaImersiva(null)).toBe(false);
  });
  it("contrato zaeon:enter-study: tipo certo e mesma origem", () => {
    expect(ehMsgEntrarEstudo({ type: "zaeon:enter-study" }, "https://a.com", "https://a.com")).toBe(true);
    expect(ehMsgEntrarEstudo({ type: "zaeon:enter-study" }, "https://evil.com", "https://a.com")).toBe(false);
    expect(ehMsgEntrarEstudo({ type: "x" }, "https://a.com", "https://a.com")).toBe(false);
    expect(ehMsgEntrarEstudo("zaeon:enter-study", "https://a.com", "https://a.com")).toBe(false);
  });
  it("entrar no laboratório pelo cyberespaço cai direto na aba de pesquisa, já em modo foco", () => {
    expect(LAB_ENTRADA).toBe("/research-lab?tab=pesquisa&foco=1");
    expect(pedeFoco(LAB_ENTRADA.split("?")[1])).toBe(true);
    expect(pedeFoco("?tab=pesquisa")).toBe(false);
    expect(pedeFoco("foco=0")).toBe(false);
    expect(pedeFoco(null)).toBe(false);
  });
  it("copy por estado de login", () => {
    expect(copyEntrada(true).cta).toMatch(/Iniciar chat/); expect(copyEntrada(false).cta).toMatch(/Criar minha conta/);   // (o cyberespaço agora é o JOGO)
    expect(copyEntrada(true).cta).toMatch(/iniciar jogo/); expect(copyEntrada(false).cta).toMatch(/iniciar jogo/);
    expect(copyEntrada(false).badges.length).toBeGreaterThan(0);
  });
});
