// @vitest-environment jsdom
/** #733 · a lista de conversas separada por dia, com o nome inteiro e as ações escondidas sem ocupar espaço. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import ConversasSidebar from "@/components/chat/ConversasSidebar";

beforeEach(() => {
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
    render(<ConversasSidebar sala="t" threads={threads} ativa={null} {...h()} />);
    const grupos = screen.getAllByRole("heading").map((x) => x.textContent);
    expect(grupos).toEqual(["Hoje", "Ontem", "Mais antigas"]);
    const hoje = screen.getByRole("region", { name: "Hoje" });
    const nomes = within(hoje).getAllByRole("button", { name: "o que é fotossíntese" });
    expect(nomes).toHaveLength(2);
    // a hora exata fica no passar do mouse
    expect(nomes[0]!.getAttribute("title")).toMatch(/criada hoje às \d\d:\d\d/);
    // o nome é o único texto da linha (nada de "07/11 21:31" do lado)
    expect(nomes[0]!.textContent).toBe("o que é fotossíntese");
  });

  it("as ações das conversas fechadas ficam escondidas (sem ocupar espaço); na aberta, à mão", () => {
    const threads = [t("a", "A", 0), t("b", "B", 0)];
    render(<ConversasSidebar sala="t" threads={threads} ativa="a" {...h()} />);
    const acoes = (nome: string) => screen.getByRole("button", { name: `Excluir ${nome}` }).parentElement!;
    expect(acoes("A").className).toMatch(/(^|\s)flex(\s|$)/);
    expect(acoes("B").className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(acoes("B").className).toContain("group-hover/conv:flex");
  });
});
