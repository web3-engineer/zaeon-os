// @vitest-environment jsdom
/**
 * AgendaBandeja (#396) na tela: abre e carrega, dois cliques na mesma coluna salvam o intervalo,
 * clique em outra coluna recomeça, Esc cancela, tocar no PRÓPRIO horário abre a janelinha (#850: mudar ou apagar,
 * com "Desfazer" — sem a janelinha do navegador) e o horário de outra pessoa não apaga nada. fetch mockado; regras
 * puras já testadas em lib/canal/agenda.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import AgendaBandeja from "./AgendaBandeja";

vi.mock("next/dynamic", () => ({ default: () => () => null }));

const CANAL = "d".repeat(24), EU = "a".repeat(24), OUTRA = "b".repeat(24);
let blocos: any[] = [];
let chamadas: { url: string; metodo: string; body?: any }[] = [];
let falharGet = false;

const resp = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });

beforeEach(() => {
  blocos = []; chamadas = []; falharGet = false;
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const metodo = init?.method ?? "GET";
    chamadas.push({ url: String(url), metodo, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (metodo === "GET") {
      // rede "lenta" de propósito: enquanto carrega, os quadrados ficam desligados (foi o que quebrou no CI)
      await new Promise((r) => setTimeout(r, 400));
      if (falharGet) return resp(403, { error: "Forbidden" });
      return resp(200, { eu: EU, blocos, pessoas: [{ id: EU, nome: "Giulia", avatar: null }, { id: OUTRA, nome: "Martinez", avatar: null }] });
    }
    if (metodo === "POST") {
      const b = JSON.parse(String(init!.body));
      const novo = { id: "c".repeat(24), userId: EU, ...b };
      blocos = [...blocos, novo];
      return resp(201, { bloco: novo, removidos: [] });
    }
    if (metodo === "DELETE") { blocos = blocos.filter((b) => !String(url).includes(b.id)); return resp(200, { ok: true }); }
    return resp(404, {});
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const abrir = () => render(<AgendaBandeja canalId={CANAL} aberta onFechar={() => {}} versao={0} />);
const celula = (rotulo: string) => screen.getByRole("button", { name: rotulo });
/**
 * Espera o quadrado ficar CLICÁVEL: enquanto a agenda carrega, os quadrados aparecem mas ficam desligados
 * e o clique é ignorado. Esperar só "aparecer" passava aqui e quebrava no CI (máquina mais lenta).
 */
const pronta = (rotulo: string) => waitFor(() => expect((celula(rotulo) as HTMLButtonElement).disabled).toBe(false), { timeout: 3000 });

describe("AgendaBandeja", () => {
  it("fechada não desenha nada nem busca", () => {
    const { container } = render(<AgendaBandeja canalId={CANAL} aberta={false} onFechar={() => {}} versao={0} />);
    expect(container.innerHTML).toBe("");
    expect(chamadas).toHaveLength(0);
  });

  it("aberta carrega a agenda do canal e mostra a grade (segunda a domingo)", async () => {
    abrir();
    await pronta("Ter 9h: livre");
    expect(chamadas[0]).toMatchObject({ url: `/api/canal/${CANAL}/agenda`, metodo: "GET" });
    expect(screen.getByText("Seg")).toBeTruthy();
    expect(screen.getByText("Dom")).toBeTruthy();
  });

  it("o exemplo do card: terça 9 + terça 15 salva das 9 às 15 e pinta o intervalo", async () => {
    abrir();
    await pronta("Ter 9h: livre");
    fireEvent.click(celula("Ter 9h: livre"));
    expect(screen.getByText(/toque no horário FINAL/i)).toBeTruthy();
    fireEvent.click(celula("Ter 15h: livre"));
    await waitFor(() => expect(chamadas.some((c) => c.metodo === "POST")).toBe(true));
    expect(chamadas.find((c) => c.metodo === "POST")!.body).toEqual({ dia: 2, inicio: 9, fim: 15 });
    // recarregou: os quadrados das 9h às 15h agora são da Giulia; 16h continua livre
    await pronta("Ter 12h: Giulia");
    expect(celula("Ter 9h: Giulia")).toBeTruthy();
    expect(celula("Ter 15h: Giulia")).toBeTruthy();
    expect(celula("Ter 16h: livre")).toBeTruthy();
  });

  it("2º clique em outro dia recomeça a seleção (não salva)", async () => {
    abrir();
    await pronta("Ter 9h: livre");
    fireEvent.click(celula("Ter 9h: livre"));
    fireEvent.click(celula("Qui 10h: livre"));
    expect(chamadas.some((c) => c.metodo === "POST")).toBe(false);
    expect(screen.getByText(/coluna de Qui/)).toBeTruthy();
  });

  it("Esc cancela a seleção em andamento", async () => {
    abrir();
    await pronta("Ter 9h: livre");
    fireEvent.click(celula("Ter 9h: livre"));
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.getByText(/Toque no horário inicial/)).toBeTruthy());
  });

  it("#850: tocar no PRÓPRIO horário abre a janelinha; Apagar apaga sem a janelinha do navegador e oferece Desfazer", async () => {
    blocos = [{ id: "c".repeat(24), userId: EU, dia: 1, inicio: 8, fim: 10 }];
    const confirmar = vi.spyOn(window, "confirm");
    abrir();
    await pronta("Seg 9h: Giulia");
    fireEvent.click(celula("Seg 9h: Giulia"));   // qualquer quadrado do horário, não só o da foto
    const janela = screen.getByRole("dialog", { name: /Seu horário de segunda/ });
    fireEvent.click(within(janela).getByRole("button", { name: "Apagar" }));
    await waitFor(() => expect(chamadas.some((c) => c.metodo === "DELETE" && c.url.includes("c".repeat(24)))).toBe(true));
    expect(confirmar).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Horário apagado"));
    fireEvent.click(screen.getByRole("button", { name: "Desfazer" }));
    await waitFor(() => expect(chamadas.filter((c) => c.metodo === "POST").at(-1)!.body).toEqual({ dia: 1, de: 480, ate: 660 }));
  });

  it("#850: a janelinha muda o começo pra 7h30 (minutos) e substitui o horário antigo", async () => {
    blocos = [{ id: "c".repeat(24), userId: EU, dia: 1, inicio: 8, fim: 10 }];
    abrir();
    await pronta("Seg 8h: Giulia");
    fireEvent.click(celula("Seg 8h: Giulia"));
    const janela = screen.getByRole("dialog", { name: /Seu horário de segunda/ });
    fireEvent.change(within(janela).getByLabelText("Começa"), { target: { value: "450" } });
    fireEvent.click(within(janela).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(chamadas.find((c) => c.metodo === "POST")!.body).toEqual({ dia: 1, de: 450, ate: 660, substitui: ["c".repeat(24)] }));
  });

  it("#850: Cancelar fecha a janelinha sem apagar", async () => {
    blocos = [{ id: "c".repeat(24), userId: EU, dia: 1, inicio: 8, fim: 10 }];
    abrir();
    await pronta("Seg 8h: Giulia");
    fireEvent.click(celula("Seg 8h: Giulia"));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog", { name: /Seu horário/ })).toBeNull();
    expect(chamadas.some((c) => c.metodo === "DELETE")).toBe(false);
  });

  it("#850: tocar logo embaixo do seu horário estica até ali", async () => {
    blocos = [{ id: "c".repeat(24), userId: EU, dia: 3, inicio: 8, fim: 10 }];
    abrir();
    await pronta("Qua 11h: livre");
    fireEvent.click(celula("Qua 11h: livre"));
    await waitFor(() => expect(chamadas.find((c) => c.metodo === "POST")!.body).toEqual({ dia: 3, de: 480, ate: 720 }));
  });

  it("tocar no horário de OUTRA pessoa não apaga: mostra quem está e começa uma seleção (dá pra dividir o horário)", async () => {
    blocos = [{ id: "f".repeat(24), userId: OUTRA, dia: 1, inicio: 8, fim: 10 }];
    abrir();
    await pronta("Seg 8h: Martinez");
    fireEvent.click(celula("Seg 8h: Martinez"));
    expect(chamadas.some((c) => c.metodo === "DELETE")).toBe(false);
    expect(screen.getByText(/toque no horário FINAL/i)).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Martinez (8h–11h)");
  });

  it("legenda mostra quem tem horário, com '(você)'", async () => {
    blocos = [{ id: "c".repeat(24), userId: EU, dia: 1, inicio: 8, fim: 8 }, { id: "f".repeat(24), userId: OUTRA, dia: 2, inicio: 9, fim: 9 }];
    abrir();
    await waitFor(() => expect(screen.getByText("Giulia (você)")).toBeTruthy());
    expect(screen.getByText("Martinez")).toBeTruthy();
  });

  it("erro ao carregar aparece como alerta", async () => {
    falharGet = true;
    abrir();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Forbidden"));
  });
});
