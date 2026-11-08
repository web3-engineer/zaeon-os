// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import AgentesDaOrquestra from "@/components/orquestra/AgentesDaOrquestra";
import { estadoNaLoja } from "@/lib/orquestra/loja";
import { MOTORES_NATIVOS } from "@/lib/orquestra/motores";
import { pluginsPlugados } from "@/lib/plugins/chatPlugins";

const responder = (agentes: unknown) => vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ plano: "pro", agentes }), { status: 200 })));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });

describe("Loja · agentes da orquestra", () => {
  it("liberado: adicionar pluga no seletor; remover despluga", async () => {
    responder(estadoNaLoja("pro", "on", [...MOTORES_NATIVOS], { DEEPSEEK_API_KEY: "a", MOONSHOT_API_KEY: "b", OPENROUTER_API_KEY: "c" }));
    render(<AgentesDaOrquestra />);
    await screen.findByText("DeepSeek V4");
    fireEvent.click(screen.getAllByRole("button", { name: /adicionar aos meus agentes/ })[0]);
    expect(pluginsPlugados()).toEqual(["orq-deepseek"]);
    await screen.findByRole("button", { name: /nos seus agentes/ });
    fireEvent.click(screen.getByRole("button", { name: /nos seus agentes/ }));
    expect(pluginsPlugados()).toEqual([]);
  });
  it("sem chave: 'em breve', sem botão de adicionar; plano baixo: cadeado com o plano", async () => {
    responder([
      estadoNaLoja("pro", "on", [...MOTORES_NATIVOS], {}).find((a) => a.id === "orq-deepseek"),
      estadoNaLoja("free", "on", [...MOTORES_NATIVOS], { MOONSHOT_API_KEY: "b" }).find((a) => a.id === "orq-kimi"),
    ]);
    render(<AgentesDaOrquestra />);
    await screen.findByText(/falta ligar a conta da DeepSeek/);
    expect(screen.getByText(/Disponível no plano Pro/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /adicionar aos meus agentes/ })).toBeNull();
  });
  it("busca filtra; nada achado = seção some", async () => {
    responder(estadoNaLoja("pro", "on", [...MOTORES_NATIVOS], {}));
    const { container } = render(<AgentesDaOrquestra busca="zzz-nada" />);
    await waitFor(() => expect(container.querySelector("section")).toBeNull());
  });
});
