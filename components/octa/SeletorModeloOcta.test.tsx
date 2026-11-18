// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen, renderHook, act, waitFor } from "@testing-library/react";
import { SeletorModeloOcta, useModeloOcta, type OpcaoModelo } from "./SeletorModeloOcta";

const TODOS = {
  modelos: [
    { id: "octa", nome: "Gemini", tipo: "padrao" },
    { id: "coder", nome: "Qwen3-Coder", tipo: "local" },
    { id: "claude", nome: "Claude (Sonnet)", tipo: "premium" },
    { id: "codex", nome: "Codex (GPT)", tipo: "premium" },
  ] as OpcaoModelo[],
  premium: true,
};
const SO_OCTA = { modelos: [{ id: "octa", nome: "Gemini", tipo: "padrao" }] as OpcaoModelo[], premium: false };

const mockFetch = (payload: unknown) => vi.fn().mockResolvedValue({ json: async () => payload } as Response);

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe("useModeloOcta", () => {
  it("só octa → temEscolha false", async () => {
    vi.stubGlobal("fetch", mockFetch(SO_OCTA));
    const { result } = renderHook(() => useModeloOcta());
    await waitFor(() => expect(result.current.opcoes).toHaveLength(1));
    expect(result.current.modelo).toBe("octa");
    expect(result.current.temEscolha).toBe(false);
  });

  it("com opções → lista; escolher persiste; id fora da lista é ignorado", async () => {
    vi.stubGlobal("fetch", mockFetch(TODOS));
    const { result } = renderHook(() => useModeloOcta());
    await waitFor(() => expect(result.current.temEscolha).toBe(true));
    expect(result.current.opcoes.map((m) => m.id)).toEqual(["octa", "coder", "claude", "codex"]);
    act(() => result.current.escolher("coder"));
    expect(result.current.modelo).toBe("coder");
    expect(localStorage.getItem("octa.modelo")).toBe("coder");
    act(() => result.current.escolher("gemini"));   // não liberado → ignora
    expect(result.current.modelo).toBe("coder");
  });

  it("restaura a escolha salva só se ainda liberada; senão cai no octa", async () => {
    localStorage.setItem("octa.modelo", "coder");
    vi.stubGlobal("fetch", mockFetch(TODOS));
    const liberado = renderHook(() => useModeloOcta());
    await waitFor(() => expect(liberado.result.current.modelo).toBe("coder"));
    liberado.unmount();

    vi.stubGlobal("fetch", mockFetch(SO_OCTA));   // coder saiu da lista (ex.: plano caiu)
    const semMais = renderHook(() => useModeloOcta());
    await waitFor(() => expect(semMais.result.current.opcoes).toHaveLength(1));
    expect(semMais.result.current.modelo).toBe("octa");
  });

  it("fetch falha → fica no octa, sem quebrar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { result } = renderHook(() => useModeloOcta());
    await waitFor(() => expect(result.current.modelo).toBe("octa"));
    expect(result.current.temEscolha).toBe(false);
  });
});

describe("SeletorModeloOcta", () => {
  const opcoes = TODOS.modelos;
  it("pílula mostra o atual, abre a lista e troca chama onChange", () => {
    const onChange = vi.fn();
    render(<SeletorModeloOcta modelo="octa" opcoes={opcoes} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Gemini/ }));
    expect(screen.getAllByRole("option")).toHaveLength(4);
    fireEvent.click(screen.getByText("Claude (Sonnet)"));
    expect(onChange).toHaveBeenCalledWith("claude");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("premium (Claude) ganha ✦ e o selo Max aparece na lista", () => {
    render(<SeletorModeloOcta modelo="claude" opcoes={opcoes} onChange={() => {}} />);
    const pilula = screen.getByRole("button", { name: /Claude/ });
    expect(pilula.textContent).toContain("✦");
    fireEvent.click(pilula);
    expect(screen.getAllByText("Max").length).toBeGreaterThan(0);  // claude e codex marcados
  });

  it("local (Qwen3-Coder) ganha ⬡ e o selo Plus — não Max", () => {
    render(<SeletorModeloOcta modelo="coder" opcoes={opcoes} onChange={() => {}} />);
    const pilula = screen.getByRole("button", { name: /Qwen3-Coder/ });
    expect(pilula.textContent).toContain("⬡");
    expect(pilula.textContent).not.toContain("Plus");   // selo só na lista, não na pílula
    fireEvent.click(pilula);
    expect(screen.getAllByText("Plus").length).toBe(1);  // só o coder
  });

  it("padrão (Gemini) ganha ⬢ e nenhum selo na pílula", () => {
    render(<SeletorModeloOcta modelo="octa" opcoes={opcoes} onChange={() => {}} />);
    const pilula = screen.getByRole("button", { name: /Gemini/ });
    expect(pilula.textContent).toContain("⬢");
    expect(pilula.textContent).not.toMatch(/Plus|Max/);
  });
});
