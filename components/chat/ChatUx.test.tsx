// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import axe from "axe-core";
import ConversasSidebar from "@/components/chat/ConversasSidebar";
import ChatZoom, { useChatFontScale } from "@/components/chat/ChatZoom";
import { AcoesResposta, AcoesPergunta, EdicaoPergunta } from "@/components/chat/MensagemAcoes";
import { criarThread, criarSubThread, type Thread } from "@/lib/chat/threads";
import { CHAVE_ESCALA } from "@/lib/ui/chatFontScale";
import { CHAVE_FEEDBACK } from "@/lib/chat/feedback";

beforeEach(() => {
  localStorage.clear();
  // jsdom não tem matchMedia: tela larga → barra aberta.
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as any;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const semViolacoes = async (el: Element) => {
  const r = await axe.run(el, { rules: { "color-contrast": { enabled: false } } });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(",")}`)).toEqual([]);
};

function arvore(): { threads: Thread[]; mae: Thread; filha: Thread } {
  const { threads, nova: mae } = criarThread(criarThread([], "Outra").threads, "Cafeína");
  const { threads: t2, nova: filha } = criarSubThread(threads, mae.id, "Adenosina");
  return { threads: t2, mae, filha };
}

describe("ConversasSidebar", () => {
  const handlers = () => ({ aoTrocar: vi.fn(), aoCriar: vi.fn(), aoFechar: vi.fn(), aoRenomear: vi.fn(), aoCriarSub: vi.fn() });

  it("lista vertical rotulada, ativa marcada, sub-tema aparece sob a mãe ativa", async () => {
    const { threads, filha } = arvore();
    const h = handlers();
    const { container } = render(<ConversasSidebar sala="t" threads={threads} ativa={filha.id} {...h} />);
    expect(screen.getByRole("navigation", { name: "Conversas" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Adenosina" }).getAttribute("aria-current")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Outra" }));
    expect(h.aoTrocar).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Nova conversa/ }));
    expect(h.aoCriar).toHaveBeenCalled();
    await semViolacoes(container);
  });

  it("acordeão: mãe recolhida esconde as filhas", () => {
    const { threads } = arvore();
    render(<ConversasSidebar sala="t" threads={threads} ativa={null} {...handlers()} />);
    expect(screen.queryByRole("button", { name: "Adenosina" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar sub-temas" }));
    expect(screen.getByRole("button", { name: "Adenosina" })).toBeTruthy();
  });

  it("renomear no lugar (Enter salva) e excluir pede confirmação", () => {
    const { threads, mae } = arvore();
    const h = handlers();
    render(<ConversasSidebar sala="t" threads={threads} ativa={mae.id} {...h} />);
    fireEvent.click(screen.getByRole("button", { name: "Renomear Cafeína" }));
    const campo = screen.getByLabelText("Novo nome da conversa");
    fireEvent.change(campo, { target: { value: "Cafeína e sono" } });
    fireEvent.keyDown(campo, { key: "Enter" });
    expect(h.aoRenomear).toHaveBeenCalledWith(mae.id, "Cafeína e sono");
    fireEvent.click(screen.getByRole("button", { name: "Excluir Cafeína" }));
    expect(h.aoFechar).not.toHaveBeenCalled();
    expect(screen.getByText(/\+1 sub-tema/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(h.aoFechar).toHaveBeenCalledWith(mae.id);
  });

  it("＋ sub-tema chama com a mãe; recolher vira trilho e é lembrado", () => {
    const { threads, mae } = arvore();
    const h = handlers();
    const { unmount } = render(<ConversasSidebar sala="t" threads={threads} ativa={mae.id} {...h} />);
    fireEvent.click(screen.getByRole("button", { name: "Novo sub-tema em Cafeína" }));
    expect(h.aoCriarSub).toHaveBeenCalledWith(mae.id);
    fireEvent.click(screen.getByRole("button", { name: "Recolher conversas" }));
    expect(screen.getByRole("button", { name: "Mostrar conversas" })).toBeTruthy();
    unmount();
    render(<ConversasSidebar sala="t" threads={threads} ativa={mae.id} {...h} />);
    expect(screen.getByRole("button", { name: "Mostrar conversas" })).toBeTruthy();
  });

  it("busca filtra pelo título (inclusive sub-temas)", () => {
    let threads = arvore().threads;
    for (const t of ["Kant", "Hegel", "Marx"]) threads = criarThread(threads, t).threads;
    render(<ConversasSidebar sala="t" threads={threads} ativa={null} {...handlers()} />);
    fireEvent.change(screen.getByLabelText("Buscar conversas"), { target: { value: "adeno" } });
    expect(screen.getByRole("button", { name: "Adenosina" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Kant" })).toBeNull();
  });
});

describe("A−/A+", () => {
  function Sala() {
    const z = useChatFontScale();
    return <div data-testid="raiz" style={z.style}><ChatZoom escala={z.escala} menor={z.menor} maior={z.maior} /></div>;
  }
  it("muda a var, persiste e para nas pontas", async () => {
    const { container } = render(<Sala />);
    const raiz = screen.getByTestId("raiz");
    expect(raiz.style.getPropertyValue("--chat-font-scale")).toBe("1");
    fireEvent.click(screen.getByRole("button", { name: "Aumentar o texto" }));
    expect(raiz.style.getPropertyValue("--chat-font-scale")).toBe("1.15");
    expect(localStorage.getItem(CHAVE_ESCALA)).toBe("1.15");
    fireEvent.click(screen.getByRole("button", { name: "Diminuir o texto" }));
    fireEvent.click(screen.getByRole("button", { name: "Diminuir o texto" }));
    expect((screen.getByRole("button", { name: "Diminuir o texto" }) as HTMLButtonElement).disabled).toBe(true);
    await semViolacoes(container);
  });

  it("#749 · com o diagrama aberto, os mesmos botões dão zoom nele (nunca travados nas pontas do texto)", () => {
    const menor = vi.fn(), maior = vi.fn();
    render(<ChatZoom escala={0.85} alvo="diagrama" menor={menor} maior={maior} />);
    const afastar = screen.getByRole("button", { name: "Afastar o diagrama" }) as HTMLButtonElement;
    expect(afastar.disabled).toBe(false);
    fireEvent.click(afastar);
    fireEvent.click(screen.getByRole("button", { name: "Aproximar o diagrama" }));
    expect(menor).toHaveBeenCalledTimes(1);
    expect(maior).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("group", { name: "Zoom do diagrama" })).toBeTruthy();
  });
});

describe("mini-ações da mensagem", () => {
  it("copiar → clipboard + 'copiado'; 👍 registra e desfaz", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const onRegenerar = vi.fn();
    const { container } = render(<AcoesResposta msgId="m1" texto="resposta" onRegenerar={onRegenerar} onAprofundar={() => {}} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Copiar" })); });
    expect(writeText).toHaveBeenCalledWith("resposta");
    expect(screen.getByRole("button", { name: "Copiado" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Boa resposta" }));
    expect(JSON.parse(localStorage.getItem(CHAVE_FEEDBACK)!)).toEqual({ m1: "up" });
    fireEvent.click(screen.getByRole("button", { name: "Boa resposta" }));
    expect(JSON.parse(localStorage.getItem(CHAVE_FEEDBACK)!)).toEqual({});
    fireEvent.click(screen.getByRole("button", { name: "Regenerar resposta" }));
    expect(onRegenerar).toHaveBeenCalled();
    await semViolacoes(container);
  });

  it("ocupado desliga regenerar; resposta vazia não mostra nada", () => {
    const { container, rerender } = render(<AcoesResposta msgId="m" texto="x" onRegenerar={() => {}} ocupado />);
    expect((screen.getByRole("button", { name: "Regenerar resposta" }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<AcoesResposta msgId="m" texto="  " />);
    expect(container.innerHTML).toBe("");
  });

  it("editar a pergunta: Enter reenvia, Esc cancela", () => {
    const onEditar = vi.fn();
    render(<AcoesPergunta texto="oi" onEditar={onEditar} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar a pergunta" }));
    expect(onEditar).toHaveBeenCalled();
    cleanup();
    const onEnviar = vi.fn(); const onCancelar = vi.fn();
    render(<EdicaoPergunta inicial="oi" onEnviar={onEnviar} onCancelar={onCancelar} />);
    const campo = screen.getByLabelText("Editar a pergunta");
    fireEvent.change(campo, { target: { value: "oi de novo" } });
    fireEvent.keyDown(campo, { key: "Enter" });
    expect(onEnviar).toHaveBeenCalledWith("oi de novo");
    fireEvent.keyDown(campo, { key: "Escape" });
    expect(onCancelar).toHaveBeenCalled();
  });
});
