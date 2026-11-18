// @vitest-environment jsdom
/**
 * Os estudos da Sala de Estudos moram na SIDEBAR (gavetas por dia, como as conversas) — o board fica limpo.
 * Sem a sidebar (workstation embutida) o seletor continua no topo do board.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";

vi.mock("./PranchaBlueprint", () => ({ default: () => <div data-testid="prancha" /> }));
vi.mock("@/components/onboard/DicasRapidas", () => ({ default: () => null }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));

import SalaBlueprint from "./SalaBlueprint";
import BlueprintsSidebar from "./BlueprintsSidebar";
import { BlueprintsSlotContext } from "./BlueprintsSlot";
import type { ResumoBlueprint } from "@/lib/blueprint/server";

const DIA = 86_400_000;
const resumo = (id: string, diasAtras = 0, extra: Partial<ResumoBlueprint> = {}): ResumoBlueprint => ({
  id, titulo: `tema ${id}`, area: "ciencia" as ResumoBlueprint["area"], fase: 1 as ResumoBlueprint["fase"], aguardandoMentor: false,
  criticosAbertos: 0, fasesAprovadas: 0, updatedAt: new Date(Date.now() - diasAtras * DIA).toISOString(), ...extra,
});
const json = (b: unknown) => Promise.resolve(new Response(JSON.stringify(b), { status: 200 }));

beforeEach(async () => {
  const { default: i18n } = await import("i18next");
  const { default: pt } = await import("@/public/locales/pt/common.json");
  const { initReactI18next } = await import("react-i18next");
  await i18n.use(initReactI18next).init({ lng: "pt", resources: { pt: { translation: pt } } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });

const props = (over: Partial<Parameters<typeof BlueprintsSidebar>[0]> = {}) => ({
  lista: [resumo("a"), resumo("b", 1), resumo("c", 3), resumo("d", 12), resumo("e", 90)],
  erro: false, marcado: "a", temMais: false, podeMexer: true,
  aoAbrir: vi.fn(), aoRecarregar: vi.fn(), aoVerMais: vi.fn(async () => true), aoRenomear: vi.fn(async () => true), aoExcluir: vi.fn(),
  ...over,
});

describe("BlueprintsSidebar — gavetas como as conversas", () => {
  it("separa por dia; os de mais de 7 dias nascem recolhidos e abrem no clique", () => {
    render(<BlueprintsSidebar {...props()} />);
    for (const g of ["Hoje", "Ontem", "Últimos 7 dias", "Últimos 30 dias", "Mais antigas"]) expect(screen.getByRole("button", { name: g })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^tema a/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^tema c/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^tema d/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^tema e/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Últimos 30 dias" }));
    expect(screen.getByRole("button", { name: /^tema d/ })).toBeTruthy();
  });

  it("a gaveta do estudo aberto abre sozinha, mesmo sendo antiga", () => {
    render(<BlueprintsSidebar {...props({ marcado: "e" })} />);
    expect(screen.getByRole("button", { name: /^tema e/ })).toBeTruthy();
  });

  it("buscar abre todas as gavetas e filtra pelo nome", () => {
    const lista = [resumo("a"), resumo("b", 1), resumo("c", 3), resumo("d", 12), resumo("e", 90, { titulo: "Fotossíntese" })];
    render(<BlueprintsSidebar {...props({ lista })} />);
    fireEvent.change(screen.getByLabelText("Buscar estudos"), { target: { value: "fotossintese" } });
    expect(screen.getByRole("button", { name: /^Fotossíntese/ })).toBeTruthy();   // estava numa gaveta recolhida
    expect(screen.queryByRole("button", { name: /^tema a/ })).toBeNull();
  });

  it("clicar abre o estudo; renomear e excluir só no aberto, com confirmação", () => {
    const p = props();
    render(<BlueprintsSidebar {...p} />);
    fireEvent.click(screen.getByRole("button", { name: /^tema b/ }));
    expect(p.aoAbrir).toHaveBeenCalledWith("b");
    expect(screen.queryByRole("button", { name: "Renomear · tema b" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Renomear · tema a" }));
    const campo = screen.getByLabelText("Novo nome do estudo");
    fireEvent.change(campo, { target: { value: "tema novo" } });
    fireEvent.keyDown(campo, { key: "Enter" });
    expect(p.aoRenomear).toHaveBeenCalledWith("tema novo");
    fireEvent.click(screen.getByRole("button", { name: "Excluir · tema a" }));
    expect(screen.getByText("Excluir estudo?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(p.aoExcluir).toHaveBeenCalledWith("a");
  });

  it("estudo compartilhado de outra pessoa: sem renomear/excluir", () => {
    render(<BlueprintsSidebar {...props({ podeMexer: false })} />);
    expect(screen.queryByRole("button", { name: /Renomear/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Excluir/ })).toBeNull();
  });
});

describe("SalaBlueprint × sidebar", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      if (url.startsWith("/api/blueprint?")) return json({ blueprints: [resumo("a"), resumo("b", 2)] });
      const id = url.split("/").pop()!;
      return json({ blueprint: { id, scopeId: null, rev: 1, papel: "dono", updatedAt: "y", compartilhado: 0, doc: { titulo: `tema ${id}`, fixos: {}, criticos: [], passos: [], avaliacoes: [] } } });
    }));
  });

  it("com a sidebar: a lista vai para ela e o board fica sem os seletores", async () => {
    const slot = document.createElement("div");
    document.body.appendChild(slot);
    const { container } = render(<BlueprintsSlotContext.Provider value={{ el: slot }}><SalaBlueprint /></BlueprintsSlotContext.Provider>);
    await waitFor(() => expect(within(slot).getByRole("button", { name: /^tema b/ })).toBeTruthy());
    expect(within(container).queryByRole("button", { name: /^tema b/ })).toBeNull();
    expect(within(container).queryByText("BLUEPRINTS")).toBeNull();
    expect(within(container).queryByRole("searchbox")).toBeNull();
    slot.remove();
  });

  it("sem a sidebar (workstation): o seletor continua no topo do board", async () => {
    render(<SalaBlueprint />);
    expect(await screen.findByRole("button", { name: /^tema b/ })).toBeTruthy();
    expect(screen.getByText("BLUEPRINTS")).toBeTruthy();
  });
});
