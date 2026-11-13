// @vitest-environment jsdom
/** Tarefa 7 · a IDE do Octa ligada no servidor: projetos, passos ao vivo, aprovação, GitHub e Publicar (com o aviso da 1ª vez). */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";

// saída do runner e erros do app React que cada teste injeta
const sessao = vi.hoisted(() => ({ atual: { data: { user: { email: "ana@zaeon.com" } }, status: "authenticated" } as any }));
const sim = vi.hoisted(() => ({ output: [] as { type: string; text: string; ts: number }[], errosReact: [] as string[] }));
vi.mock("next/dynamic", async () => {
  const React = await import("react");
  return { default: () => (p: { value?: string; onErros?: (e: string[]) => void }) => {
    React.useEffect(() => { p.onErros?.(sim.errosReact); }, [p.onErros]);
    return <textarea aria-label="editor" readOnly value={p.value ?? ""} />;
  } };
});
vi.mock("@/app/agentic-modules/codelab/useCodeRunner", () => ({
  useCodeRunner: () => ({ run: vi.fn(), output: sim.output, isRunning: false, isPyodideReady: true, clearOutput: vi.fn(), iframeRef: { current: null } }),
}));

vi.mock("next-auth/react", () => ({ useSession: () => sessao.atual }));

import OctaIDE, { AVISO_PUBLICO } from "./OctaIDE";
import { armazemDaConta, contaDaSessao, migrarConversasAntigas } from "@/lib/chat/contaNoNavegador";

const ID = "0123456789abcdef01234567";
type Rota = (url: string, init?: RequestInit) => Response | undefined;
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });
let projeto: any;
let eventos: any[];
let extra: Rota | null;
let fetchMock: ReturnType<typeof vi.fn>;
const chamadas = (filtro: (u: string, i?: RequestInit) => boolean) => fetchMock.mock.calls.filter(([u, i]) => filtro(String(u), i));

beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn(); // jsdom não tem
  projeto = { id: ID, nome: "Confeitaria da Ana", slug: "confeitaria-da-ana", arquivos: { "index.html": "<h1>oi</h1>" }, designId: null, permissao: "auto", avisoPublicoAceito: false, repoFullName: null, pagesUrl: null };
  eventos = [];
  extra = null;
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const r = extra?.(url, init);
    if (r) return r;
    const metodo = init?.method ?? "GET";
    if (url === "/api/octa/projetos" && metodo === "GET") return json({ projetos: [projeto] });
    if (url === `/api/octa/projetos/${ID}` && metodo === "GET") return json({ projeto });
    if (url === `/api/octa/projetos/${ID}` && metodo === "PATCH") { projeto = { ...projeto, ...JSON.parse(String(init!.body)) }; return json({ projeto }); }
    if (url === "/api/octa/github") return json({ conectado: true, login: "ana-dev", configurado: true });
    if (url === "/api/octa/turnos" && metodo === "POST") return json({ turnoId: "t1" }, 202);
    if (url.startsWith("/api/octa/turnos/t1/eventos")) return json({ status: "pronto", eventos, pendente: null, resposta: "Pronto!" });
    return json({}, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { sim.output = []; sim.errosReact = []; cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("OctaIDE · modo projeto", () => {
  it("abre o projeto do servidor e mostra a conta GitHub conectada", async () => {
    render(<OctaIDE />);
    expect(await screen.findByText("Confeitaria da Ana")).toBeTruthy();
    expect(await screen.findByText("ana-dev")).toBeTruthy();
    expect(screen.queryByText("Conectar GitHub")).toBeNull();
  });

  it("sem GitHub conectado: botão Conectar GitHub abre o OAuth com volta pro Octa", async () => {
    extra = (u) => (u === "/api/octa/github" ? json({ conectado: false, login: null, configurado: true }) : undefined);
    const abrir = vi.spyOn(window, "open").mockReturnValue({} as Window);
    render(<OctaIDE />);
    fireEvent.click(await screen.findByRole("button", { name: /Conectar GitHub/ }));
    expect(abrir.mock.calls[0][0]).toBe("/api/projects/github/connect?voltar=/octa/github");
  });

  it("pedido → turno: os passos aparecem e a resposta final entra na conversa", async () => {
    eventos = [
      { seq: 1, tipo: "tool", dados: { tool: "octa_design_escolher", path: "DESIGN.md" } },
      { seq: 2, tipo: "resultado", dados: { tool: "octa_design_escolher", ok: true, resumo: "Estilo escolhido: Notion" } },
      { seq: 3, tipo: "arquivo", dados: { path: "DESIGN.md", acao: "gravado" } },
      { seq: 4, tipo: "fim", dados: { resposta: "Pronto!" } },
    ];
    render(<OctaIDE />);
    await screen.findByText("Confeitaria da Ana");
    const caixa = screen.getByPlaceholderText(/Peça ao Octa/);
    fireEvent.change(caixa, { target: { value: "uma landing pra minha confeitaria, escura e minimalista" } });
    fireEvent.keyDown(caixa, { key: "Enter" });
    expect(await screen.findByText("Escolhendo o estilo")).toBeTruthy();
    expect(screen.getByText("Estilo escolhido: Notion")).toBeTruthy();
    expect(await screen.findByText("Pronto!")).toBeTruthy();
    const post = chamadas((u, i) => u === "/api/octa/turnos" && i?.method === "POST")[0];
    expect(JSON.parse(String(post[1]!.body))).toEqual({ projetoId: ID, pedido: "uma landing pra minha confeitaria, escura e minimalista" });
  });

  it("aprovação: o cartão aparece e Aprovar manda { aprovado: true }", async () => {
    let aprovado = false;
    extra = (u, i) => {
      if (u.startsWith("/api/octa/turnos/t1/eventos")) {
        return aprovado
          ? json({ status: "pronto", eventos: [{ seq: 2, tipo: "fim", dados: {} }], pendente: null, resposta: "Publicado." })
          : json({ status: "aguardando_aprovacao", eventos: [{ seq: 1, tipo: "aprovacao", dados: { tool: "octa_publicar" } }], pendente: { tool: "octa_publicar" }, resposta: null });
      }
      if (u === "/api/octa/turnos/t1/aprovar") { aprovado = true; expect(JSON.parse(String(i!.body))).toEqual({ aprovado: true }); return json({ ok: true }, 202); }
      return undefined;
    };
    render(<OctaIDE />);
    await screen.findByText("Confeitaria da Ana");
    const caixa = screen.getByPlaceholderText(/Peça ao Octa/);
    fireEvent.change(caixa, { target: { value: "publica" } });
    fireEvent.keyDown(caixa, { key: "Enter" });
    const cartao = await screen.findByRole("group", { name: "Aprovação" });
    expect(within(cartao).getByText("publicar o site no seu GitHub")).toBeTruthy();
    fireEvent.click(within(cartao).getByRole("button", { name: "Aprovar" }));
    expect(await screen.findByText("Publicado.")).toBeTruthy();
  });

  it("Publicar na 1ª vez: mostra o aviso EXATO, grava avisoPublicoAceito e mostra os dois links com 'no ar em ~1 min'", async () => {
    extra = (u, i) => (u === `/api/octa/projetos/${ID}/publicar` && i?.method === "POST"
      ? json({ ok: true, repoUrl: "https://github.com/ana-dev/confeitaria-da-ana", pagesUrl: "https://ana-dev.github.io/confeitaria-da-ana/", status: "publicando", ignorados: [] })
      : undefined);
    render(<OctaIDE />);
    await screen.findByText("ana-dev");
    fireEvent.click(screen.getByRole("button", { name: /Publicar/ }));
    expect(await screen.findByText(AVISO_PUBLICO)).toBeTruthy();
    expect(AVISO_PUBLICO).toBe("seu código e sua página ficarão públicos no seu GitHub");
    expect(chamadas((u) => u.endsWith("/publicar"))).toHaveLength(0); // nada sai antes de aceitar
    fireEvent.click(screen.getByRole("button", { name: "Entendi, publicar" }));
    expect(await screen.findByText("no ar em ~1 min")).toBeTruthy();
    const aceite = chamadas((u, i) => u === `/api/octa/projetos/${ID}` && i?.method === "PATCH" && String(i.body).includes("avisoPublicoAceito"));
    expect(JSON.parse(String(aceite[0][1]!.body))).toEqual({ avisoPublicoAceito: true });
    const links = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(links).toEqual(expect.arrayContaining(["https://github.com/ana-dev/confeitaria-da-ana", "https://ana-dev.github.io/confeitaria-da-ana/"]));
  });

  it("Publicar com aviso já aceito vai direto; erro do servidor aparece em português", async () => {
    projeto.avisoPublicoAceito = true;
    extra = (u) => (u === `/api/octa/projetos/${ID}/publicar` ? json({ ok: false, erro: "limite_publicacoes" }, 429) : undefined);
    render(<OctaIDE />);
    await screen.findByText("ana-dev");
    fireEvent.click(screen.getByRole("button", { name: /Publicar/ }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toMatch(/limite de 10 publicações/);
    expect(screen.queryByText(AVISO_PUBLICO)).toBeNull();
  });

  it("Publicar barrado pela regra anti-marca: diz em português qual palavra editar", async () => {
    projeto.avisoPublicoAceito = true;
    extra = (u) => (u === `/api/octa/projetos/${ID}/publicar` ? json({ ok: false, erro: "marca_no_conteudo", palavra: "Nintendo" }, 409) : undefined);
    render(<OctaIDE />);
    await screen.findByText("ana-dev");
    fireEvent.click(screen.getByRole("button", { name: /Publicar/ }));
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toMatch(/“Nintendo”/);
    expect(alerta.textContent).toMatch(/troque|edite/i);
  });

  it("projeto React: a Prévia usa o Sandpack (sem srcdoc) e diz que roda no navegador; o estático segue igual", async () => {
    projeto.arquivos = { "index.html": '<div id="root"></div>', "src/App.jsx": "export default () => <h1>oi</h1>" };
    render(<OctaIDE />);
    await screen.findByText("Confeitaria da Ana");
    fireEvent.click(screen.getByRole("tab", { name: /Prévia/ }));
    expect(await screen.findByText("a prévia React roda no seu navegador")).toBeTruthy();
    expect(document.querySelector("iframe[srcdoc]")).toBeNull();
    cleanup();

    projeto.arquivos = { "index.html": "<h1>oi</h1>" };
    render(<OctaIDE />);
    await screen.findByText("Confeitaria da Ana");
    fireEvent.click(screen.getByRole("tab", { name: /Prévia/ }));
    await waitFor(() => expect(document.querySelector("iframe[srcdoc]")).toBeTruthy());
    expect(screen.queryByText("a prévia React roda no seu navegador")).toBeNull();
  });

  it("Publicar projeto React: avisa que chega na próxima fase e não chama o servidor", async () => {
    projeto.avisoPublicoAceito = true;
    projeto.arquivos = { "index.html": "", "package.json": JSON.stringify({ dependencies: { react: "^18.3.1" } }), "src/main.jsx": "" };
    render(<OctaIDE />);
    await screen.findByText("ana-dev");
    fireEvent.click(screen.getByRole("button", { name: /Publicar/ }));
    expect((await screen.findByRole("alert")).textContent).toContain("Publicação de apps React chega na próxima fase");
    expect(chamadas((u) => u.endsWith("/publicar"))).toHaveLength(0);
  });

  it("trocar a permissão grava no projeto (PATCH permissao)", async () => {
    render(<OctaIDE />);
    await screen.findByText("Confeitaria da Ana");
    fireEvent.change(screen.getByLabelText("Permissão do Octa neste projeto"), { target: { value: "antes_de_publicar" } });
    await waitFor(() => expect(chamadas((u, i) => i?.method === "PATCH" && String(i.body).includes("antes_de_publicar"))).toHaveLength(1));
  });

  it("sem projetos: tela de boas-vindas cria um projeto (POST /api/octa/projetos)", async () => {
    extra = (u, i) => {
      if (u === "/api/octa/projetos" && (i?.method ?? "GET") === "GET") return json({ projetos: [] });
      if (u === "/api/octa/projetos" && i?.method === "POST") return json({ projeto }, 201);
      return undefined;
    };
    render(<OctaIDE />);
    fireEvent.change(await screen.findByLabelText("Nome do projeto"), { target: { value: "Confeitaria da Ana" } });
    fireEvent.click(screen.getByRole("button", { name: /Criar projeto/ }));
    expect(await screen.findByText("Confeitaria da Ana")).toBeTruthy();
    const post = chamadas((u, i) => u === "/api/octa/projetos" && i?.method === "POST")[0];
    expect(JSON.parse(String(post[1]!.body))).toEqual({ nome: "Confeitaria da Ana" });
  });

  it("desfazer nunca leva a foto de um projeto pra outro (A roda → B roda → volta pra A e A termina)", async () => {
    const IB = "0123456789abcdef01234568";
    const A = { ...projeto, nome: "Projeto A", arquivos: { "index.html": "<h1>A</h1>" } };
    const B = { ...projeto, id: IB, nome: "Projeto B", arquivos: { "index.html": "<h1>B</h1>" } };
    let turnos = 0;
    const pronto = { A: false, B: false };
    const fimDe = (k: "A" | "B") => json(pronto[k]
      ? { status: "pronto", eventos: [{ seq: 1, tipo: "tool", dados: { tool: "octa_escrever", path: "index.html" } }, { seq: 2, tipo: "arquivo", dados: { path: "index.html", acao: "gravado" } }, { seq: 3, tipo: "fim", dados: {} }], pendente: null, resposta: `fim ${k}` }
      : { status: "rodando", eventos: [], pendente: null, resposta: null });
    extra = (u, i) => {
      const metodo = i?.method ?? "GET";
      if (u === "/api/octa/projetos" && metodo === "GET") return json({ projetos: [A, B] });
      if (u === `/api/octa/projetos/${ID}` && metodo === "GET") return json({ projeto: A });
      if (u === `/api/octa/projetos/${IB}` && metodo === "GET") return json({ projeto: B });
      if (metodo === "PATCH") return json({ projeto: A });
      if (u === "/api/octa/turnos" && metodo === "POST") return json({ turnoId: ++turnos === 1 ? "tA" : "tB" }, 202);
      if (u.startsWith("/api/octa/turnos/tA/eventos")) return fimDe("A");
      if (u.startsWith("/api/octa/turnos/tB/eventos")) return fimDe("B");
      return undefined;
    };
    const pedir = async (texto: string) => {
      const caixa = await screen.findByPlaceholderText(/Peça ao Octa/);
      fireEvent.change(caixa, { target: { value: texto } });
      fireEvent.keyDown(caixa, { key: "Enter" });
      await waitFor(() => expect(screen.getByText(texto)).toBeTruthy());
    };
    const trocarPara = async (nome: string) => {
      fireEvent.click(screen.getByRole("button", { expanded: false, name: /Projeto [AB]/ }));
      fireEvent.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: new RegExp(nome) }));
      await waitFor(() => expect(screen.getByRole("button", { name: new RegExp(nome), expanded: false })).toBeTruthy());
    };

    render(<OctaIDE />);
    await screen.findByText("Projeto A");
    await pedir("mexe no A");                // foto = arquivos de A, turno tA rodando
    await trocarPara("Projeto B");
    await pedir("mexe no B");                // foto = arquivos de B, turno tB rodando
    await trocarPara("Projeto A");           // A retoma tA (guardado) …
    pronto.A = true;                         // … e tA termina
    expect(await screen.findByText("fim A", {}, { timeout: 3000 })).toBeTruthy();
    // turno retomado: nenhuma foto de A sobrou, e a de B não pode virar o desfazer de A
    expect(screen.queryByRole("button", { name: /desfazer/ })).toBeNull();
    const patchesComB = chamadas((u, i) => i?.method === "PATCH" && String(i.body).includes("<h1>B</h1>") && u.endsWith(ID));
    expect(patchesComB).toHaveLength(0);
  });

  it("evento arquivo: relê o projeto (debounce) e a prévia mostra o HTML novo, sem esperar o fim do turno", async () => {
    let lido = 0;
    let status = "rodando";
    extra = (u, i) => {
      if (u === `/api/octa/projetos/${ID}` && (i?.method ?? "GET") === "GET") {
        lido++;
        return json({ projeto: { ...projeto, arquivos: { "index.html": lido > 1 ? "<h1>ao vivo</h1>" : "<h1>oi</h1>" } } });
      }
      if (u.startsWith("/api/octa/turnos/t1/eventos")) {
        return json({ status, eventos: [{ seq: 1, tipo: "arquivo", dados: { path: "index.html", acao: "gravado" } }], pendente: null, resposta: null });
      }
      return undefined;
    };
    render(<OctaIDE />);
    await screen.findByText("Confeitaria da Ana");
    const caixa = screen.getByPlaceholderText(/Peça ao Octa/);
    fireEvent.change(caixa, { target: { value: "muda" } });
    fireEvent.keyDown(caixa, { key: "Enter" });
    // o turno segue "rodando": a prévia já tem o HTML novo
    await waitFor(() => {
      const iframe = document.querySelector("iframe");
      expect(iframe?.getAttribute("srcdoc") ?? "").toContain("ao vivo");
    }, { timeout: 4000 });
    expect(chamadas((u, i) => u === `/api/octa/projetos/${ID}` && (i?.method ?? "GET") === "GET").length).toBeGreaterThanOrEqual(2);
    status = "pronto";
  });

  it("desfazer depois de uma releitura ao vivo aplicada volta pro estado de ANTES do turno (não o intermediário)", async () => {
    let poll = 0;
    let projetoNoServidor: Record<string, string> = { "index.html": "<h1>oi</h1>" };
    extra = (u, i) => {
      if (u === `/api/octa/projetos/${ID}` && (i?.method ?? "GET") === "GET") return json({ projeto: { ...projeto, arquivos: projetoNoServidor } });
      if (u.startsWith("/api/octa/turnos/t1/eventos")) {
        poll++;
        const arq = { seq: 1, tipo: "arquivo", dados: { path: "index.html", acao: "gravado" } };
        if (poll === 1) { projetoNoServidor = { "index.html": "<h1>intermediario</h1>" }; return json({ status: "rodando", eventos: [arq], pendente: null, resposta: null }); }
        if (poll < 4) return json({ status: "rodando", eventos: [], pendente: null, resposta: null });
        projetoNoServidor = { "index.html": "<h1>final</h1>" };
        return json({ status: "pronto", eventos: [{ seq: 2, tipo: "fim", dados: {} }], pendente: null, resposta: "ok" });
      }
      return undefined;
    };
    render(<OctaIDE />);
    await screen.findByText("Confeitaria da Ana");
    const caixa = screen.getByPlaceholderText(/Peça ao Octa/);
    fireEvent.change(caixa, { target: { value: "muda" } });
    fireEvent.keyDown(caixa, { key: "Enter" });
    await waitFor(() => expect(document.querySelector("iframe")?.getAttribute("srcdoc") ?? "").toContain("intermediario"), { timeout: 4000 });
    fireEvent.click(await screen.findByRole("button", { name: /desfazer/ }, { timeout: 6000 }));
    await waitFor(() => expect(chamadas((u, i) => i?.method === "PATCH" && String(i.body).includes("arquivos"))).toHaveLength(1), { timeout: 3000 });
    const [, init] = chamadas((u, i) => i?.method === "PATCH" && String(i.body).includes("arquivos"))[0];
    expect(JSON.parse(String(init!.body))).toEqual({ arquivos: { "index.html": "<h1>oi</h1>" } });
  }, 15000);

  it("releitura ao vivo que só resolve depois do fim do turno não sobrescreve o estado final", async () => {
    let soltar: ((r: Response) => void) | null = null;
    let lidos = 0;
    let poll = 0;
    extra = (u, i) => {
      if (u === `/api/octa/projetos/${ID}` && (i?.method ?? "GET") === "GET") {
        lidos++;
        if (lidos === 2) return new Promise<Response>((res) => { soltar = res; }) as any; // a releitura ao vivo fica em voo
        return json({ projeto: { ...projeto, arquivos: { "index.html": lidos > 2 ? "<h1>final</h1>" : "<h1>oi</h1>" } } });
      }
      if (u.startsWith("/api/octa/turnos/t1/eventos")) {
        poll++;
        if (poll === 1) return json({ status: "rodando", eventos: [{ seq: 1, tipo: "arquivo", dados: { path: "index.html", acao: "gravado" } }], pendente: null, resposta: null });
        if (poll < 3) return json({ status: "rodando", eventos: [], pendente: null, resposta: null });
        return json({ status: "pronto", eventos: [{ seq: 2, tipo: "fim", dados: {} }], pendente: null, resposta: "ok" });
      }
      return undefined;
    };
    render(<OctaIDE />);
    await screen.findByText("Confeitaria da Ana");
    const caixa = screen.getByPlaceholderText(/Peça ao Octa/);
    fireEvent.change(caixa, { target: { value: "muda" } });
    fireEvent.keyDown(caixa, { key: "Enter" });
    await waitFor(() => expect(soltar).not.toBeNull(), { timeout: 4000 });
    await waitFor(() => expect(document.querySelector("iframe")?.getAttribute("srcdoc") ?? "").toContain("final"), { timeout: 6000 });
    soltar!(json({ projeto: { ...projeto, arquivos: { "index.html": "<h1>velho-em-voo</h1>" } } }));
    await new Promise((r) => setTimeout(r, 50));
    expect(document.querySelector("iframe")?.getAttribute("srcdoc") ?? "").toContain("final");
    expect(document.querySelector("iframe")?.getAttribute("srcdoc") ?? "").not.toContain("velho-em-voo");
  }, 15000);

  it("no MESMO projeto, desfazer volta os arquivos de antes do turno (PATCH no próprio projeto)", async () => {
    eventos = [
      { seq: 1, tipo: "tool", dados: { tool: "octa_escrever", path: "index.html" } },
      { seq: 2, tipo: "arquivo", dados: { path: "index.html", acao: "gravado" } },
      { seq: 3, tipo: "fim", dados: {} },
    ];
    let lido = 0;
    extra = (u, i) => {
      if (u === `/api/octa/projetos/${ID}` && (i?.method ?? "GET") === "GET") {
        lido++;
        return json({ projeto: { ...projeto, arquivos: { "index.html": lido > 1 ? "<h1>novo</h1>" : "<h1>oi</h1>" } } });
      }
      return undefined;
    };
    render(<OctaIDE />);
    await screen.findByText("Confeitaria da Ana");
    const caixa = screen.getByPlaceholderText(/Peça ao Octa/);
    fireEvent.change(caixa, { target: { value: "muda" } });
    fireEvent.keyDown(caixa, { key: "Enter" });
    fireEvent.click(await screen.findByRole("button", { name: /desfazer/ }));
    await waitFor(() => expect(chamadas((u, i) => u === `/api/octa/projetos/${ID}` && i?.method === "PATCH" && String(i.body).includes("arquivos"))).toHaveLength(1), { timeout: 3000 });
    const [, init] = chamadas((u, i) => i?.method === "PATCH" && String(i.body).includes("arquivos"))[0];
    expect(JSON.parse(String(init!.body))).toEqual({ arquivos: { "index.html": "<h1>oi</h1>" } });
  });
});

describe("OctaIDE · Corrigir com o Octa", () => {
  const abrirComPy = async () => {
    projeto.arquivos = { "main.py": "print(x)" };
    render(<OctaIDE />);
    await screen.findByText("Confeitaria da Ana");
    await screen.findAllByText("main.py"); // já aberto como ativo
  };

  it("sem erro o botão não aparece", async () => {
    sim.output = [{ type: "stdout", text: "ola", ts: 1 }];
    await abrirComPy();
    expect(screen.queryByRole("button", { name: /Corrigir com o Octa/ })).toBeNull();
  });

  it("erro do Python: o clique manda o pedido montado em POST /api/octa/turnos", async () => {
    sim.output = [{ type: "stderr", text: "NameError: name 'x' is not defined", ts: 1 }];
    await abrirComPy();
    fireEvent.click(await screen.findByRole("button", { name: /Corrigir com o Octa/ }));
    await waitFor(() => expect(chamadas((u, i) => u === "/api/octa/turnos" && i?.method === "POST")).toHaveLength(1));
    const corpo = JSON.parse(String(chamadas((u, i) => u === "/api/octa/turnos" && i?.method === "POST")[0][1]!.body));
    expect(corpo.projetoId).toBe(ID);
    expect(corpo.pedido).toContain("Rodei o código Python (main.py) e deu este erro");
    expect(corpo.pedido).toContain("NameError: name 'x' is not defined");
  });

  it("erros do app React: botão na barra de erros, e o clique manda o pedido", async () => {
    sim.errosReact = ["Erro de compilação: Unexpected token (src/App.jsx:3)"];
    projeto.arquivos = { "index.html": '<div id="root"></div>', "src/App.jsx": "export default () => <h1>oi</h1>" };
    render(<OctaIDE />);
    await screen.findByText("Confeitaria da Ana");
    fireEvent.click(screen.getByRole("tab", { name: /Prévia/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Corrigir com o Octa/ }));
    await waitFor(() => expect(chamadas((u, i) => u === "/api/octa/turnos" && i?.method === "POST")).toHaveLength(1));
    const corpo = JSON.parse(String(chamadas((u, i) => u === "/api/octa/turnos" && i?.method === "POST")[0][1]!.body));
    expect(corpo.pedido).toContain("o app React");
    expect(corpo.pedido).toContain("Unexpected token (src/App.jsx:3)");
  });

  it("clicar em Corrigir não apaga o rascunho digitado na caixa", async () => {
    sim.output = [{ type: "stderr", text: "NameError: x", ts: 1 }];
    await abrirComPy();
    const caixa = screen.getByPlaceholderText(/Peça ao Octa/) as HTMLTextAreaElement;
    fireEvent.change(caixa, { target: { value: "depois quero um botão azul" } });
    fireEvent.click(await screen.findByRole("button", { name: /Corrigir com o Octa/ }));
    await waitFor(() => expect(chamadas((u, i) => u === "/api/octa/turnos" && i?.method === "POST")).toHaveLength(1));
    const corpo = JSON.parse(String(chamadas((u, i) => u === "/api/octa/turnos" && i?.method === "POST")[0][1]!.body));
    expect(corpo.pedido).toContain("NameError: x");
    expect(caixa.value).toBe("depois quero um botão azul");
  });
});

describe("OctaIDE · por conta (#663)", () => {
  const CHAT = "zaeon.octa.chat.v1", ANA = contaDaSessao("ana@zaeon.com");
  const entrar = (email: string | null) => { sessao.atual = email ? { data: { user: { email } }, status: "authenticated" } : { data: null, status: "unauthenticated" }; };
  const conversa = JSON.stringify([{ id: "m1", role: "user", texto: "segredo do rascunho", text: "segredo do rascunho" }]);
  afterEach(() => entrar("ana@zaeon.com"));

  it("enquanto a sessão carrega, a IDE não abre", () => {
    sessao.atual = { data: null, status: "loading" };
    const { container } = render(<OctaIDE />);
    expect(container.firstChild).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("o chat, o projeto e o turno antigos do Octa vão para a conta; outra conta não os recebe", () => {
    for (const k of [CHAT, "zaeon.octa.projeto.ultimo", `zaeon.octa.chat.${ID}`, `zaeon.octa.turno.${ID}`, "zaeon.octa.ide.v1", `zaeon.octa.proj.${ID}`]) localStorage.setItem(k, conversa);
    migrarConversasAntigas(localStorage, ANA);
    const ana = armazemDaConta(localStorage, ANA), bia = armazemDaConta(localStorage, contaDaSessao("bia@zaeon.com"));
    for (const k of [CHAT, "zaeon.octa.projeto.ultimo", `zaeon.octa.chat.${ID}`, `zaeon.octa.turno.${ID}`, "zaeon.octa.ide.v1", `zaeon.octa.proj.${ID}`]) {
      expect(ana.getItem(k)).toBe(conversa);
      expect(bia.getItem(k)).toBeNull();
      expect(localStorage.getItem(k)).toBeNull();
    }
  });
  it("a IDE lê só a área de quem está logado", async () => {
    armazemDaConta(localStorage, ANA).setItem("zaeon.octa.projeto.ultimo", ID);
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    entrar("bia@zaeon.com");
    render(<OctaIDE />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const lidas = getItem.mock.calls.map(([k]) => k);
    expect(lidas).toContain(`zaeon.conta.${contaDaSessao("bia@zaeon.com")}.zaeon.octa.projeto.ultimo`);
    expect(lidas).not.toContain(`zaeon.conta.${ANA}.zaeon.octa.projeto.ultimo`);
    getItem.mockRestore();
  });
});
