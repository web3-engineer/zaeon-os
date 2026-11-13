// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen, renderHook, act, waitFor } from "@testing-library/react";
import { SeletorModeloOcta, useModeloOcta } from "./SeletorModeloOcta";

const PREMIUM = { modelos: [{ id: "octa", nome: "Octa (padrão)" }, { id: "claude", nome: "Claude (Sonnet)" }, { id: "codex", nome: "Codex (GPT)" }], premium: true };
const SO_OCTA = { modelos: [{ id: "octa", nome: "Octa (padrão)" }], premium: false };

const mockFetch = (payload: unknown) => vi.fn().mockResolvedValue({ json: async () => payload } as Response);

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe("useModeloOcta", () => {
  it("sem premium → só octa, temPremium false", async () => {
    vi.stubGlobal("fetch", mockFetch(SO_OCTA));
    const { result } = renderHook(() => useModeloOcta());
    await waitFor(() => expect(result.current.opcoes).toHaveLength(1));
    expect(result.current.modelo).toBe("octa");
    expect(result.current.temPremium).toBe(false);
  });

  it("com premium → lista; escolher persiste; id fora da lista é ignorado", async () => {
    vi.stubGlobal("fetch", mockFetch(PREMIUM));
    const { result } = renderHook(() => useModeloOcta());
    await waitFor(() => expect(result.current.temPremium).toBe(true));
    expect(result.current.opcoes.map((m) => m.id)).toEqual(["octa", "claude", "codex"]);
    act(() => result.current.escolher("claude"));
    expect(result.current.modelo).toBe("claude");
    expect(localStorage.getItem("octa.modelo")).toBe("claude");
    act(() => result.current.escolher("gemini"));   // não liberado → ignora
    expect(result.current.modelo).toBe("claude");
  });

  it("restaura a escolha salva só se ainda liberada; senão cai no octa", async () => {
    localStorage.setItem("octa.modelo", "claude");
    vi.stubGlobal("fetch", mockFetch(PREMIUM));
    const liberado = renderHook(() => useModeloOcta());
    await waitFor(() => expect(liberado.result.current.modelo).toBe("claude"));
    liberado.unmount();

    vi.stubGlobal("fetch", mockFetch(SO_OCTA));   // claude saiu da lista (ex.: plano caiu)
    const semMais = renderHook(() => useModeloOcta());
    await waitFor(() => expect(semMais.result.current.opcoes).toHaveLength(1));
    expect(semMais.result.current.modelo).toBe("octa");
  });

  it("fetch falha → fica no octa, sem quebrar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { result } = renderHook(() => useModeloOcta());
    await waitFor(() => expect(result.current.modelo).toBe("octa"));
    expect(result.current.temPremium).toBe(false);
  });
});

describe("SeletorModeloOcta", () => {
  const opcoes = PREMIUM.modelos;
  it("pílula mostra o atual, abre a lista e troca chama onChange", () => {
    const onChange = vi.fn();
    render(<SeletorModeloOcta modelo="octa" opcoes={opcoes} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Octa/ }));
    expect(screen.getAllByRole("option")).toHaveLength(3);
    fireEvent.click(screen.getByText("Claude (Sonnet)"));
    expect(onChange).toHaveBeenCalledWith("claude");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("premium selecionado ganha ✦ e o selo Max aparece na lista", () => {
    render(<SeletorModeloOcta modelo="claude" opcoes={opcoes} onChange={() => {}} />);
    const pilula = screen.getByRole("button", { name: /Claude/ });
    expect(pilula.textContent).toContain("✦");
    fireEvent.click(pilula);
    expect(screen.getAllByText("Max").length).toBeGreaterThan(0);  // claude e codex marcados
  });
});
