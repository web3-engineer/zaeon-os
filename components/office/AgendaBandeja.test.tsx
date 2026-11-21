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
// #861: POST lento / com erro, pra ver a barra "salvando" e o "Tentar de novo"
let atrasoPost = 0;
let falharPost = false;

const resp = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });

beforeEach(() => {
  blocos = []; chamadas = []; falharGet = false; atrasoPost = 0; falharPost = false;
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
      if (atrasoPost) await new Promise((r) => setTimeout(r, atrasoPost));
      if (falharPost) return resp(500, { error: "Falhou no servidor" });
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
    // o rascunho já diz o que vai ser marcado (cada quadrado é a hora inteira)
    expect(screen.getByText(/Marcando Ter 9h–10h\. Toque na ÚLTIMA hora/)).toBeTruthy();
    expect(document.querySelector("[data-rascunho]")?.textContent).toBe("9h–10h");
    // o mouse passa pelo quadrado das 15h: o rascunho cresce até 16h, antes de confirmar
    fireEvent.pointerEnter(celula("Ter 15h: livre"), { pointerType: "mouse" });
    expect(document.querySelector("[data-rascunho]")?.textContent).toBe("9h–16h");
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
    expect(screen.getByText(/Marcando Qui/)).toBeTruthy();
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

  it("tocar no horário de OUTRA pessoa não apaga: #861 abre a lista de quem está, e 'Marcar também' marca a mesma hora", async () => {
    blocos = [{ id: "f".repeat(24), userId: OUTRA, dia: 1, inicio: 8, fim: 10 }];
    abrir();
    await pronta("Seg 8h: Martinez");
    fireEvent.click(celula("Seg 8h: Martinez"));
    expect(chamadas.some((c) => c.metodo === "DELETE")).toBe(false);
    const lista = screen.getByRole("dialog", { name: /segunda, 8h/i });
    expect(within(lista).getByText("Martinez")).toBeTruthy();
    expect(within(lista).getByText("8h–11h")).toBeTruthy();
    fireEvent.click(within(lista).getByRole("button", { name: /Marcar também/ }));
    await waitFor(() => expect(chamadas.find((c) => c.metodo === "POST")?.body).toEqual({ dia: 1, inicio: 8, fim: 8 }));
  });

  it("legenda mostra quem tem horário, com '(você)'", async () => {
    blocos = [{ id: "c".repeat(24), userId: EU, dia: 1, inicio: 8, fim: 8 }, { id: "f".repeat(24), userId: OUTRA, dia: 2, inicio: 9, fim: 9 }];
    abrir();
    await waitFor(() => expect(screen.getByText("Giulia (você)")).toBeTruthy());
    // #861: o nome também aparece dentro da barra (cartão) — aqui é a legenda
    const legenda = document.querySelector("[data-legenda]") as HTMLElement;
    expect(within(legenda).getByText("Martinez")).toBeTruthy();
  });

  it("erro ao carregar aparece como alerta", async () => {
    falharGet = true;
    abrir();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Forbidden"));
  });
  it("#861: um horário de 8h às 11h é UMA barra (cartão com o nome e o horário)", async () => {
    blocos = [{ id: "c".repeat(24), userId: OUTRA, dia: 2, inicio: 8, fim: 10 }];
    abrir();
    await pronta("Ter 9h: Martinez");
    const barras = document.querySelectorAll('[data-coluna-dia="2"] [data-barra]');
    expect(barras).toHaveLength(1);
    expect(barras[0]!.getAttribute("data-barra")).toBe("cartao");
    expect(barras[0]!.textContent).toContain("8h–11h");
  });

  it("#861: ao salvar, a barra aparece na hora (salvando) e a agenda não trava", async () => {
    atrasoPost = 600;
    abrir();
    await pronta("Ter 9h: livre");
    fireEvent.click(celula("Ter 9h: livre"));
    fireEvent.click(celula("Ter 10h: livre"));
    await waitFor(() => expect(document.querySelector("[data-pendente]")).toBeTruthy());
    expect((celula("Qua 9h: livre") as HTMLButtonElement).disabled).toBe(false);   // nada desligado, sem ampulheta
    await waitFor(() => expect(document.querySelector("[data-pendente]")).toBeNull(), { timeout: 3000 });
    expect(celula("Ter 9h: Giulia")).toBeTruthy();
  });

  it("#861: erro ao salvar — a barra volta a sumir e o aviso oferece Tentar de novo", async () => {
    falharPost = true;
    abrir();
    await pronta("Ter 9h: livre");
    fireEvent.click(celula("Ter 9h: livre"));
    fireEvent.click(celula("Ter 10h: livre"));
    const tentar = await screen.findByRole("button", { name: "Tentar de novo" });
    expect(document.querySelector("[data-pendente]")).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("Falhou no servidor");
    falharPost = false;
    fireEvent.click(tentar);
    await waitFor(() => expect(celula("Ter 9h: Giulia")).toBeTruthy(), { timeout: 3000 });
    expect(chamadas.filter((c) => c.metodo === "POST")).toHaveLength(2);
  });
  it("#861 PR 2: 4 pessoas no mesmo horário viram um bloco só, com '+1' e '4 pessoas'", async () => {
    const P = ["c", "d", "e", "f"].map((x) => x.repeat(24));
    blocos = P.map((u, i) => ({ id: String(i + 1).repeat(24), userId: u, dia: 3, inicio: 10, fim: 11 }));
    abrir();
    await pronta("Qua 9h: livre");
    const m = document.querySelector('[data-coluna-dia="3"] [data-barra="multidao"]') as HTMLElement;
    expect(m).toBeTruthy();
    expect(m.textContent).toContain("+1");
    expect(m.textContent).toContain("4 pessoas");
  });

  it("#861 PR 2: filtro 'Só eu' esconde o horário dos outros (e o quadrado fica livre)", async () => {
    blocos = [{ id: "c".repeat(24), userId: EU, dia: 1, inicio: 8, fim: 8 }, { id: "f".repeat(24), userId: OUTRA, dia: 2, inicio: 9, fim: 9 }];
    abrir();
    await pronta("Ter 9h: Martinez");
    fireEvent.click(screen.getByRole("button", { name: "Só eu" }));
    expect(celula("Ter 9h: livre")).toBeTruthy();
    expect(celula("Seg 8h: Giulia")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Todos" }));
    expect(celula("Ter 9h: Martinez")).toBeTruthy();
  });
});
