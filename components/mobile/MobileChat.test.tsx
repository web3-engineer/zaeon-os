// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, act } from "@testing-library/react";
import axe from "axe-core";
import { respostaStream } from "@/lib/chat/test-utils";

vi.mock("next/link", () => ({ default: ({ href, children, ...p }: any) => <a href={href} {...p}>{children}</a> }));
vi.mock("@/components/studio/StudioBlock", () => ({ default: ({ block, collapsed, onToggle }: any) => <div data-testid="studio" data-collapsed={String(collapsed)} onClick={onToggle}>{block.studioKind}:{block.title}</div> }));
import MobileChat from "@/components/mobile/MobileChat";

const S = '@@STRUCTURED@@{"nucleo":"A luz é uma onda eletromagnética.","conceitos":["fóton"]}';
const j = (b: any, status = 200) => new Response(JSON.stringify(b), { status, headers: { "content-type": "application/json" } });
type Rota = (url: string, init?: any) => Response | Promise<Response>;
const rotear = (r: Rota) => vi.spyOn(globalThis, "fetch").mockImplementation(async (u: any, i: any) => r(String(u), i) as any);

beforeEach(() => { localStorage.clear(); document.cookie = "zaeon%3Aui=; max-age=0; path=/"; (Element.prototype as any).scrollIntoView = () => {}; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const digitarEEnviar = (t: string) => {
  fireEvent.change(screen.getByLabelText("Mensagem"), { target: { value: t } });
  fireEvent.click(screen.getByRole("button", { name: /Enviar pergunta|Pesquisar/ }));
};

describe("MobileChat · Estudos", () => {
  it("renderiza vazio, envia, mostra a bolha do usuário e a resposta estruturada", async () => {
    rotear((u) => (u === "/api/ai/chat" ? respostaStream(['@@PROGRESS@@{"fase":"plan","rotulo":"Planejando"}\n', S]) : j({})));
    render(<MobileChat surface="estudos" />);
    expect(screen.getByText("Pergunte qualquer coisa pra Aura.")).toBeTruthy();
    digitarEEnviar("o que é luz?");
    expect(await screen.findByText("o que é luz?")).toBeTruthy();
    expect(await screen.findByText(/onda eletromagnética/)).toBeTruthy();
    expect((screen.getByLabelText("Mensagem") as HTMLTextAreaElement).value).toBe("");
  });
  it("batiza a conversa com a 1ª pergunta (histórico local)", async () => {
    rotear(() => respostaStream(["ok"]));
    render(<MobileChat surface="estudos" />);
    digitarEEnviar("fotossíntese");
    await screen.findByText("ok");
    expect(JSON.parse(localStorage.getItem("zaeon.m.conversas")!)[0].titulo).toBe("fotossíntese");
    expect(JSON.parse(localStorage.getItem("zaeon.m.aba")!)).toBe("estudos");
  });
  it("ações: gera um artefato com cartão de progresso e depois o viewer", async () => {
    let polls = 0;
    rotear((u) => {
      if (u === "/api/ai/chat") return respostaStream(["resposta"]);
      if (u === "/api/study/spaces") return j({ id: "e1" });
      if (u === "/api/studio/flashcards") return j({ id: "a1", status: "queued" });
      polls++;
      return j(polls < 2 ? { status: "running" } : { status: "done", meta: {}, title: "Cartões" });
    });
    vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 50 });
    try {
      render(<MobileChat surface="estudos" />);
      digitarEEnviar("mitose");
      await screen.findByText("resposta");
      fireEvent.click(screen.getByRole("button", { name: "Mais ações" }));
      fireEvent.click(screen.getByRole("button", { name: /Flashcards/ }));
      expect(await screen.findByText(/você pode sair, ele continua/)).toBeTruthy();
      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
      const viewer = await screen.findByTestId("studio");
      expect(viewer.textContent).toBe("flashcards:Cartões");
      expect(viewer.getAttribute("data-collapsed")).toBe("false"); // nasce aberto
      fireEvent.click(viewer);
      expect(screen.getByTestId("studio").getAttribute("data-collapsed")).toBe("true");
    } finally { vi.useRealTimers(); }
  });
  it("erro de rede vira bolha de aviso", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    render(<MobileChat surface="estudos" />);
    digitarEEnviar("x");
    expect(await screen.findByText("Sem conexão com a Aura agora.")).toBeTruthy();
  });
  it("'versão completa' grava a preferência full (nunca prende a pessoa no mobile)", () => {
    rotear(() => j({}));
    render(<MobileChat surface="estudos" />);
    fireEvent.click(screen.getByText("versão completa"));
    expect(document.cookie).toContain("zaeon%3Aui=full");
  });
  it("sem violações de acessibilidade (axe) com conversa na tela", async () => {
    rotear(() => respostaStream([S]));
    const { container } = render(<MobileChat surface="estudos" />);
    digitarEEnviar("luz");
    await screen.findByText(/onda eletromagnética/);
    const r = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });
});

describe("MobileChat · Pesquisa", () => {
  it("pesquisa em BG: progresso → resposta + referências; toggle marca a aba atual", async () => {
    let polls = 0;
    rotear((u) => {
      if (u === "/api/ai/scholar") return j({ sessionId: "S1" }, 202);
      if (u === "/api/ai/scholar/sessions") return j({ sessions: [] });
      polls++;
      return polls < 2
        ? j({ session: { status: "running", thread: { events: [{ type: "phase", phase: "searching", message: "Buscando no PubMed" }] } } })
        : j({ session: { status: "done", query: "CRISPR", thread: { answer: "CRISPR edita genes." }, references: [{ title: "Doudna 2012", url: "https://doi.org/x", year: 2012 }] } });
    });
    vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 50 });
    try {
      render(<MobileChat surface="pesquisa" />);
      expect(screen.getByRole("link", { name: "Pesquisa" }).getAttribute("aria-current")).toBe("page");
      expect(screen.queryByRole("button", { name: "Mais ações" })).toBeNull(); // ações do Studio são da Sala de Estudos
      digitarEEnviar("CRISPR");
      await act(async () => { await vi.advanceTimersByTimeAsync(1600); });
      expect(await screen.findByText("Buscando no PubMed")).toBeTruthy();
      await act(async () => { await vi.advanceTimersByTimeAsync(1600); });
      expect(await screen.findByText("CRISPR edita genes.")).toBeTruthy();
      expect(screen.getByRole("link", { name: "Doudna 2012" }).getAttribute("rel")).toBe("noreferrer");
    } finally { vi.useRealTimers(); }
  });
  it("401 mostra o caminho de login de volta pra /m/pesquisa", async () => {
    rotear((u) => (u === "/api/ai/scholar/sessions" ? j({ sessions: [] }) : new Response("no", { status: 401 })));
    render(<MobileChat surface="pesquisa" />);
    digitarEEnviar("x");
    const link = await screen.findByRole("link", { name: "Entrar" });
    expect(link.getAttribute("href")).toBe("/login?callbackUrl=/m/pesquisa");
  });
});

describe("MobileChat · interações", () => {
  it("tocar num conceito da resposta envia 'Me explica <conceito>'", async () => {
    const f = rotear(() => respostaStream([S]));
    render(<MobileChat surface="estudos" />);
    digitarEEnviar("luz");
    await screen.findByText(/onda eletromagnética/);
    fireEvent.click(screen.getByRole("button", { name: /fóton/ }));
    await waitFor(() => expect(f.mock.calls.filter(([u]) => String(u) === "/api/ai/chat")).toHaveLength(2));
    expect(JSON.parse((f.mock.calls.at(-1)![1] as any).body).prompt).toBe("Me explica fóton");
  });
  it("histórico: nova conversa zera a tela; abrir uma conversa antiga traz as mensagens dela", async () => {
    rotear(() => respostaStream(["resposta A"]));
    render(<MobileChat surface="estudos" />);
    digitarEEnviar("conversa A");
    await screen.findByText("resposta A");
    fireEvent.click(screen.getByRole("button", { name: "Abrir histórico" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Nova conversa" }));
    await waitFor(() => expect(screen.queryByText("resposta A")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Abrir histórico" }));
    fireEvent.click(screen.getByRole("button", { name: "conversa A" }));
    expect(await screen.findByText("resposta A")).toBeTruthy();
  });
  it("artefato: falha ao criar o estudo vira aviso; pronto pode recolher/abrir", async () => {
    rotear((u) => (u === "/api/ai/chat" ? respostaStream(["r"]) : u === "/api/study/spaces" ? j({}, 401) : j({})));
    render(<MobileChat surface="estudos" />);
    digitarEEnviar("x");
    await screen.findByText("r");
    fireEvent.click(screen.getByRole("button", { name: "Mais ações" }));
    fireEvent.click(screen.getByRole("button", { name: /Mapa mental/ }));
    expect(await screen.findByText(/Não consegui gerar mapa mental agora/)).toBeTruthy();
  });
});
