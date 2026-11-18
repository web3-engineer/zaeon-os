// @vitest-environment jsdom
/** #661: o mapa — evidência obrigatória na caixinha (sem a janelinha do navegador), voltar à conversa, andamento. */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/lib/ui/useIsMobile", () => ({ useIsMobile: () => false }));
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, initial: _i, animate: _a, exit: _e, transition: _t, ...p }: any) => <div {...p}>{children}</div>,
    aside: ({ children, initial: _i, animate: _a, ...p }: any) => <aside {...p}>{children}</aside>,
  },
}));
import CerebroPanel from "./CerebroPanel";
import { dicaDaEtiqueta, LEGENDA } from "./CerebroCanvas";

const no = (id: string, label: string, estado = "a_conquistar") => ({ id, label, estado, tipo: "conceito", planejado: true, drawers: [] });
const mapa: any = { id: "m1", nos: [no("a", "Etapa A", "validado"), no("b", "Etapa B"), no("c", "Etapa C")], arestas: [], backbone: ["a", "b", "c"], modoValidacao: "humana", tipoTopico: "aplicavel", criterioCompletude: "", objetivo: "" };
const st: any = { mapa, estado: "ativa", tituloSugerido: null, gerando: false, erro: null, recentes: [], gerar: vi.fn(), refazer: vi.fn(async () => {}), refetch: vi.fn(async () => {}) };

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn(async () => new Response(JSON.stringify({ validacao: null }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const abrirCaixa = () => fireEvent.click(screen.getByRole("button", { name: /Apliquei: Etapa/ }));
const campo = () => screen.getByLabelText("Como você aplicou esta etapa?") as HTMLTextAreaElement;

describe("CerebroPanel (#661)", () => {
  it("o Apliquei abre a caixinha (não a janelinha do navegador); enviar só com evidência escrita", async () => {
    const prompt = vi.fn();
    vi.stubGlobal("prompt", prompt);
    render(<CerebroPanel st={st} onFechar={() => {}} />);
    abrirCaixa();
    expect(prompt).not.toHaveBeenCalled();
    const enviar = screen.getByRole("button", { name: /Enviar/ }) as HTMLButtonElement;
    expect(enviar.disabled).toBe(true);
    fireEvent.change(campo(), { target: { value: "   " } });
    expect(enviar.disabled).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.change(campo(), { target: { value: "  rodei o script  " } });
    expect(enviar.disabled).toBe(false);
    fireEvent.click(enviar);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ evidencia: "rodei o script" });
    await waitFor(() => expect(screen.queryByLabelText("Como você aplicou esta etapa?")).toBeNull());
  });
  it("Cancelar e Esc fecham só a caixinha, sem enviar nem sair do mapa", () => {
    const onFechar = vi.fn();
    render(<CerebroPanel st={st} onFechar={onFechar} />);
    abrirCaixa();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByLabelText("Como você aplicou esta etapa?")).toBeNull();
    abrirCaixa();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByLabelText("Como você aplicou esta etapa?")).toBeNull();
    expect(onFechar).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("falha de rede: mostra a frase em português e a caixinha continua aberta com o texto", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("NetworkError when attempting to fetch resource."));
    render(<CerebroPanel st={st} onFechar={() => {}} />);
    abrirCaixa();
    fireEvent.change(campo(), { target: { value: "fiz" } });
    fireEvent.click(screen.getByRole("button", { name: /Enviar/ }));
    const erro = await screen.findByText(/Sem conexão — sua aplicação não foi enviada/);
    expect(campo().value).toBe("fiz");
    // #705: o aviso fica dentro da caixinha, perto do Enviar
    expect(erro.closest("[data-caixa-apliquei]")).toBeTruthy();
  });
  it("Voltar à conversa fecha o mapa; o andamento mostra a etapa atual", () => {
    const onFechar = vi.fn();
    render(<CerebroPanel st={st} onFechar={onFechar} />);
    expect(screen.getByText("Etapa 2 de 3")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Voltar à conversa/ }));
    expect(onFechar).toHaveBeenCalledTimes(1);
  });
});

describe("botão ↻ (#661)", () => {
  const abrir = () => fireEvent.click(screen.getByRole("button", { name: "Refazer o percurso" }));
  it("pede confirmação antes; Cancelar e Esc não refazem nem saem do mapa", () => {
    st.refazer.mockClear();
    const onFechar = vi.fn();
    render(<CerebroPanel st={st} onFechar={onFechar} />);
    abrir();
    expect(st.refazer).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    abrir();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("Refazer o percurso?")).toBeNull();
    expect(st.refazer).not.toHaveBeenCalled();
    expect(onFechar).not.toHaveBeenCalled();
  });
  it("confirmado: refaz", () => {
    st.refazer.mockClear();
    render(<CerebroPanel st={st} onFechar={() => {}} />);
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Refazer" }));
    expect(st.refazer).toHaveBeenCalledTimes(1);
  });
  it("falhou: o mapa continua e o aviso aparece", () => {
    render(<CerebroPanel st={{ ...st, erro: "Não deu para refazer o mapa agora — o seu continua aqui." }} onFechar={() => {}} />);
    expect(screen.getByRole("alert").textContent).toMatch(/o seu continua aqui/);
    expect(screen.getByText("Etapa 2 de 3")).toBeTruthy();
  });
});

describe("explicações do mapa (#661)", () => {
  it("a dica da etiqueta explica a ficha, a gaveta e a chancela", () => {
    expect(dicaDaEtiqueta({})).toMatch(/Clique para ver/);
    expect(dicaDaEtiqueta({ gavetas: 1 })).toMatch(/1 gaveta: uma lembrança/);
    expect(dicaDaEtiqueta({ gavetas: 3 })).toMatch(/3 gavetas: lembranças/);
    expect(dicaDaEtiqueta({ gate: true })).toMatch(/Chancela: .*professor/);
  });
  it("a legenda cobre os 5 estados de cor", () => {
    expect(LEGENDA.map((l) => l.rotulo)).toEqual(["A conquistar", "Etapa atual", "Aprendida", "Aplicada", "Validada"]);
  });
});

describe("#756 · o aviso de cima do mapa some sozinho", () => {
  it("'Aplicado! O percurso avançou.' some em 6 s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ validacao: null }), { status: 200 }));
      render(<CerebroPanel st={st} onFechar={() => {}} />);
      abrirCaixa();
      fireEvent.change(campo(), { target: { value: "fiz" } });
      fireEvent.click(screen.getByRole("button", { name: /Enviar/ }));
      await screen.findByText("Aplicado! O percurso avançou.");
      await vi.advanceTimersByTimeAsync(5_000);
      expect(screen.queryByText("Aplicado! O percurso avançou.")).not.toBeNull();
      await vi.advanceTimersByTimeAsync(1_500);
      expect(screen.queryByText("Aplicado! O percurso avançou.")).toBeNull();
    } finally { vi.useRealTimers(); }
  });
  it("o que pede ação fica mais tempo", async () => {
    const { tempoDoAviso } = await import("./CerebroPanel");
    expect(tempoDoAviso("Aplicado! O percurso avançou.")).toBe(6_000);
    expect(tempoDoAviso("Enviado pra validação do seu professor.")).toBe(6_000);
    expect(tempoDoAviso("Aplicado! O mapa não atualizou: feche e abra de novo para ver.")).toBe(12_000);
  });
});
