// @vitest-environment jsdom
/** #731 · a Sala de Estudos: cartolina legível na sala vazia, o caminho para o chat, a falha ao abrir e o desfazer. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

vi.mock("./PranchaBlueprint", () => ({ default: ({ sobre }: { sobre?: React.ReactNode }) => <div data-testid="prancha">{sobre}</div> }));
vi.mock("@/components/onboard/DicasRapidas", () => ({ default: () => null }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));

import SalaBlueprint from "./SalaBlueprint";
import { EVT_ESTUDOS_IR, EVT_PEDIDO_CONVERSA } from "@/lib/chat/conversasNav";

const resumo = (id: string) => ({ id, titulo: `tema ${id}`, area: "ciencia", fase: 1, aguardandoMentor: false, criticosAbertos: 0, fasesAprovadas: 0, updatedAt: "x" });
const bp = (id: string) => ({ id, scopeId: `conv-${id}`, rev: 1, papel: "dono", updatedAt: "y", compartilhado: 0,
  doc: { titulo: `tema ${id}`, fixos: {}, criticos: [], passos: [], avaliacoes: [] } });
const json = (b: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(b), { status }));

let lista: string[] = [];
let abreFalha = false;
let conversas: string[] = [];
beforeEach(() => {
  lista = []; abreFalha = false; conversas = [];
  vi.stubGlobal("fetch", vi.fn((url: string, o?: RequestInit) => {
    if (url.startsWith("/api/blueprint?")) return json({ blueprints: lista.map(resumo) });
    if (url.startsWith("/api/ai/conversas")) return json({ conversas: conversas.map((id) => ({ id })) });
    if (o?.method === "DELETE") return json({ ok: true });
    const id = url.split("/").pop()!;
    return abreFalha ? json({}, 500) : json({ blueprint: bp(id) });
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });

describe("#731 · SalaBlueprint", () => {
  it("cartolina com a sala vazia: o estilo da cartolina entra na sala (antes, só com uma prancha aberta)", async () => {
    localStorage.setItem("zaeon:sala-estudos:skin", "cartolina");
    const { container } = render(<SalaBlueprint />);
    await screen.findByText(/NENHUM BLUEPRINT AINDA/);
    const estilos = [...container.querySelectorAll("style")].map((s) => s.textContent ?? "").join("\n");
    expect(estilos).toContain(".skin-cartolina [class*=\"text-sky-\"]");
  });

  it("a sala vazia leva para o chat", async () => {
    const ir = vi.fn();
    window.addEventListener(EVT_ESTUDOS_IR, ir);
    render(<SalaBlueprint />);
    fireEvent.click(await screen.findByRole("button", { name: /conversar com a Aura/ }));
    expect((ir.mock.calls[0]![0] as CustomEvent).detail).toBe("meus-estudos");
    window.removeEventListener(EVT_ESTUDOS_IR, ir);
  });

  it("o blueprint que não abre mostra o aviso e o 'tentar de novo'", async () => {
    lista = ["a"]; abreFalha = true;
    render(<SalaBlueprint />);
    expect(await screen.findByText(/Não deu para abrir este blueprint/)).toBeTruthy();
    abreFalha = false;
    fireEvent.click(screen.getByRole("button", { name: "tentar de novo" }));
    await screen.findByTestId("prancha");
  });

  it("conversa de origem apagada: o aviso fica na Sala e não vai para o chat", async () => {
    lista = ["a"]; conversas = ["outra"];
    const pedido = vi.fn();
    window.addEventListener(EVT_PEDIDO_CONVERSA, pedido);
    render(<SalaBlueprint />);
    fireEvent.click(await screen.findByRole("button", { name: /abrir a conversa/ }));
    expect(await screen.findByText(/A conversa deste blueprint foi apagada/)).toBeTruthy();
    expect(pedido).not.toHaveBeenCalled();
    window.removeEventListener(EVT_PEDIDO_CONVERSA, pedido);
  });

  it("conversa de origem existe: vai para o chat", async () => {
    lista = ["a"]; conversas = ["conv-a"];
    const pedido = vi.fn();
    window.addEventListener(EVT_PEDIDO_CONVERSA, pedido);
    render(<SalaBlueprint />);
    fireEvent.click(await screen.findByRole("button", { name: /abrir a conversa/ }));
    await waitFor(() => expect(pedido).toHaveBeenCalled());
    window.removeEventListener(EVT_PEDIDO_CONVERSA, pedido);
  });

  it("excluir mostra o 'desfazer', e desfazer traz de volta sem DELETE", async () => {
    lista = ["a", "b"];
    render(<SalaBlueprint />);
    fireEvent.click(await screen.findByRole("button", { name: "excluir" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "excluir" }));
    fireEvent.click(await screen.findByRole("button", { name: "desfazer" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "desfazer" })).toBeNull());
    await waitFor(() => expect(screen.getAllByRole("button", { name: /tema a/ }).length).toBeGreaterThan(0));
    const f = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(f.mock.calls.some((c) => c[1]?.method === "DELETE")).toBe(false);
  });
});

import { within } from "@testing-library/react";
