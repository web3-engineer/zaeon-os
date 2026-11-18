// @vitest-environment jsdom
/** #733 · a lista de conversas separada por dia, com o nome inteiro e as ações escondidas sem ocupar espaço. */
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { act } from "@testing-library/react";
import pt from "../../public/locales/pt/common.json";
import en from "../../public/locales/en/common.json";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import ConversasSidebar from "@/components/chat/ConversasSidebar";

const i18n = createInstance();
const renderPt = (ui: React.ReactNode) => render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
beforeEach(async () => {
  await i18n.init({ lng: "pt", resources: { pt: { translation: pt }, en: { translation: en } } });
  localStorage.clear();
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as any;
});
afterEach(() => { cleanup(); });

const h = () => ({ aoTrocar: vi.fn(), aoCriar: vi.fn(), aoFechar: vi.fn(), aoRenomear: vi.fn(), aoCriarSub: vi.fn() });
const agora = Date.now();
const t = (id: string, titulo: string, diasAtras: number) => ({ id, titulo, criadaEm: agora - diasAtras * 86_400_000, tocadaEm: agora });

describe("#733 · ConversasSidebar por dia", () => {
  it("grupos Hoje / Ontem / Mais antigas, a mais nova em cima, sem data do lado do nome", () => {
    const threads = [t("v", "Python", 60), t("a", "o que é fotossíntese", 0), t("o", "Sobre: java", 1), t("b", "o que é fotossíntese", 0.001)];
    renderPt(<ConversasSidebar sala="t" threads={threads} ativa={null} {...h()} />);
    const grupos = screen.getAllByRole("region").map((x) => x.getAttribute("aria-label"));
    expect(grupos).toEqual(["Hoje", "Ontem", "Mais antigas"]);
    const hoje = screen.getByRole("region", { name: "Hoje" });
    const nomes = within(hoje).getAllByRole("button", { name: "o que é fotossíntese" });
    expect(nomes).toHaveLength(2);
    // a hora exata fica no passar do mouse
    expect(nomes[0]!.getAttribute("title")).toMatch(/\d{2}:\d{2}/);
    // o nome é o único texto da linha (nada de "07/11 21:31" do lado)
    expect(nomes[0]!.textContent).toBe("o que é fotossíntese");
  });

  it("as ações das conversas fechadas ficam escondidas (sem ocupar espaço); na aberta, à mão", () => {
    const threads = [t("a", "A", 0), t("b", "B", 0)];
    renderPt(<ConversasSidebar sala="t" threads={threads} ativa="a" {...h()} />);
    const acoes = (nome: string) => screen.getByRole("button", { name: `Excluir · ${nome}` }).parentElement!;
    // #845: a aberta mostra as ações com mouse; no toque, só o ⋯ abre (o foco não as mostra mais)
    expect(acoes("A").className).toMatch(/\[@media\(hover:hover\)\]:flex(\s|$)/);
    expect(acoes("B").className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(acoes("B").className).not.toMatch(/(^|\s)group-focus-within\/conv:flex/);
    expect(acoes("B").className).toContain("group-hover/conv:flex");
  });
});

it("atualiza grupos e ações quando o idioma muda sem remontar a barra", async () => {
  renderPt(<ConversasSidebar sala="t" threads={[t("a", "Projeto", 0)]} ativa="a" {...h()} />);
  expect(screen.getByRole("region", { name: "Hoje" })).toBeTruthy();
  await act(async () => { await i18n.changeLanguage("en"); });
  expect(screen.getByRole("region", { name: "Today" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Delete · Projeto" })).toBeTruthy();
});
