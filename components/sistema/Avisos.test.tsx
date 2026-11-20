// @vitest-environment jsdom
/**
 * #850 (PR 2) · a peça de avisos: aviso pequeno que some sozinho, "Desfazer", erro mais demorado, a janelinha de
 * "tem certeza?" (Esc/Enter/foco no Cancelar quando é coisa séria), o pedido de texto e a fila de perguntas.
 * Sem a peça na tela, cai na janelinha do navegador (nunca deixa uma pergunta sem resposta).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { Avisos } from "./Avisos";
import { avisar, confirmar, pedirTexto, tr, copiarComAviso, _zerarAvisos, DURACAO, MAX_AVISOS } from "@/lib/ui/avisos";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string) => ({ "avisos.cancelar": "Cancelar", "avisos.confirmar": "Confirmar", "avisos.ok": "OK", "avisos.fechar": "Fechar" } as Record<string, string>)[k] ?? k }) }));

beforeEach(() => { _zerarAvisos(); });
afterEach(() => { cleanup(); _zerarAvisos(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("avisos · aviso pequeno", () => {
  it("aparece e some sozinho", () => {
    vi.useFakeTimers();
    render(<Avisos />);
    act(() => { avisar("Copiado!"); });
    expect(screen.getByText("Copiado!")).toBeTruthy();
    act(() => { vi.advanceTimersByTime(DURACAO.normal + 10); });
    expect(screen.queryByText("Copiado!")).toBeNull();
  });

  it("erro fica mais tempo e o Desfazer chama a ação e fecha", () => {
    vi.useFakeTimers();
    render(<Avisos />);
    const fazer = vi.fn();
    act(() => { avisar("Apagado", { acao: { rotulo: "Desfazer", fazer } }); });
    act(() => { vi.advanceTimersByTime(DURACAO.normal + 10); });
    expect(screen.getByText("Apagado")).toBeTruthy();   // com ação, fica o tempo longo
    fireEvent.click(screen.getByRole("button", { name: "Desfazer" }));
    expect(fazer).toHaveBeenCalledOnce();
    expect(screen.queryByText("Apagado")).toBeNull();
  });

  it(`no máximo ${MAX_AVISOS} empilhados (o mais velho sai)`, () => {
    render(<Avisos />);
    act(() => { for (let i = 1; i <= MAX_AVISOS + 1; i++) avisar(`aviso ${i}`); });
    expect(screen.queryByText("aviso 1")).toBeNull();
    expect(screen.getByText(`aviso ${MAX_AVISOS + 1}`)).toBeTruthy();
  });

  it("copiarComAviso: copia e avisa; se falhar, avisa o erro", async () => {
    render(<Avisos />);
    const escrever = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("negado"));
    Object.defineProperty(navigator, "clipboard", { value: { writeText: escrever }, configurable: true });
    await act(async () => { await copiarComAviso("x", "Link copiado!", "Não deu pra copiar."); });
    expect(screen.getByText("Link copiado!")).toBeTruthy();
    await act(async () => { await copiarComAviso("x", "Link copiado!", "Não deu pra copiar."); });
    expect(screen.getByText("Não deu pra copiar.")).toBeTruthy();
  });
});

describe("avisos · janelinha de confirmar", () => {
  it("Confirmar → true; Cancelar → false", async () => {
    render(<Avisos />);
    let r: Promise<boolean>;
    act(() => { r = confirmar({ titulo: "Apagar o estudo?", texto: "Não dá pra desfazer." }); });
    expect(screen.getByRole("dialog", { name: "Apagar o estudo?" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await expect(r!).resolves.toBe(true);
    act(() => { r = confirmar({ titulo: "De novo?" }); });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await expect(r!).resolves.toBe(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("coisa séria: alertdialog, botão com o rótulo pedido e o foco começa no Cancelar; Esc cancela", async () => {
    render(<Avisos />);
    let r: Promise<boolean>;
    act(() => { r = confirmar({ titulo: "Apagar sua conta?", botao: "Apagar", perigo: true }); });
    const caixa = screen.getByRole("alertdialog");
    expect(screen.getByRole("button", { name: "Apagar" })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancelar" }));
    fireEvent.keyDown(caixa, { key: "Escape" });
    await expect(r!).resolves.toBe(false);
  });

  it("duas perguntas seguidas: a segunda espera a primeira", async () => {
    render(<Avisos />);
    let a: Promise<boolean>, b: Promise<boolean>;
    act(() => { a = confirmar({ titulo: "Primeira?" }); b = confirmar({ titulo: "Segunda?" }); });
    expect(screen.getByRole("dialog", { name: "Primeira?" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await expect(a!).resolves.toBe(true);
    expect(screen.getByRole("dialog", { name: "Segunda?" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await expect(b!).resolves.toBe(false);
  });
});

describe("avisos · pedir texto", () => {
  it("vem preenchido, Enter devolve sem espaços nas pontas; vazio não segue", async () => {
    render(<Avisos />);
    let r: Promise<string | null>;
    act(() => { r = pedirTexto({ titulo: "Nome do arquivo", valor: "src/a.ts" }); });
    const campo = screen.getByRole("textbox", { name: "Nome do arquivo" }) as HTMLInputElement;
    expect(campo.value).toBe("src/a.ts");
    fireEvent.change(campo, { target: { value: "   " } });
    expect((screen.getByRole("button", { name: "OK" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(campo, { target: { value: "  src/b.ts " } });
    fireEvent.keyDown(campo, { key: "Enter" });
    await expect(r!).resolves.toBe("src/b.ts");
  });

  it("opcional aceita vazio; cancelar devolve null", async () => {
    render(<Avisos />);
    let r: Promise<string | null>;
    act(() => { r = pedirTexto({ titulo: "Motivo (opcional)", opcional: true }); });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    await expect(r!).resolves.toBe("");
    act(() => { r = pedirTexto({ titulo: "Nome" }); });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await expect(r!).resolves.toBeNull();
  });
});

describe("avisos · sem a peça na tela (cai no navegador)", () => {
  it("confirmar e pedirTexto usam a janelinha do navegador; aviso de erro vira alert, aviso comum não", async () => {
    const c = vi.spyOn(window, "confirm").mockReturnValue(true);
    const p = vi.spyOn(window, "prompt").mockReturnValue("  oi ");
    const a = vi.spyOn(window, "alert").mockImplementation(() => {});
    await expect(confirmar({ titulo: "Apagar?", texto: "Sério." })).resolves.toBe(true);
    expect(c).toHaveBeenCalledWith("Apagar?\n\nSério.");
    await expect(pedirTexto({ titulo: "Nome" })).resolves.toBe("oi");
    avisar("Copiado!");
    expect(a).not.toHaveBeenCalled();
    avisar("Falhou", { tipo: "erro" });
    expect(a).toHaveBeenCalledWith("Falhou");
    expect(p).toHaveBeenCalled();
  });
});

describe("avisos · tr", () => {
  it("sem o i18n pronto usa o português e troca as variáveis", () => {
    expect(tr("avisos.inexistente", "Projeto “{{titulo}}” iniciado!", { titulo: "Água" })).toBe("Projeto “Água” iniciado!");
  });
});
