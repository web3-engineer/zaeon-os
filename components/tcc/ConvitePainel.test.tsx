// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ConvitePainel from "./ConvitePainel";
import type { Convite } from "@/lib/tcc/client";

const base: Convite = { url: "/estudo/abc?convite=tok", token: "tok", papel: "editor", escopo: "conversa" };
const nada = () => {};

afterEach(cleanup);

describe("ConvitePainel · o texto TEM de dizer o que o link concede", () => {
  it("avisa que o papel vale para a CONVERSA e para os trabalhos futuros", () => {
    // o botão fica DENTRO de um documento, então "convidar para este documento" é a leitura
    // natural — e é falsa. Se esta frase cair, o botão passa a conceder mais do que diz.
    render(<ConvitePainel convite={base} ocupado={false} onPapel={nada} onRevogar={nada} onFechar={nada} />);
    const texto = screen.getByRole("dialog").textContent ?? "";
    expect(texto).toMatch(/desta conversa/i);
    expect(texto).toMatch(/TODOS os trabalhos dela/);
    expect(texto).toMatch(/inclusive os próximos/i);
  });

  it("editor e leitor são descritos pelo que FAZEM, não pelo nome do papel", () => {
    render(<ConvitePainel convite={base} ocupado={false} onPapel={nada} onRevogar={nada} onFechar={nada} />);
    expect(screen.getByRole("dialog").textContent).toMatch(/altera o documento junto com você/i);
    cleanup();
    render(<ConvitePainel convite={{ ...base, papel: "leitor" }} ocupado={false} onPapel={nada} onRevogar={nada} onFechar={nada} />);
    expect(screen.getByRole("dialog").textContent).toMatch(/só acompanha, sem editar/i);
  });

  it("o link mostrado é o endereço INTEIRO — é isso que a pessoa vai enviar", () => {
    render(<ConvitePainel convite={base} ocupado={false} onPapel={nada} onRevogar={nada} onFechar={nada} />);
    expect((screen.getByLabelText("Link do convite") as HTMLInputElement).value)
      .toBe(`${window.location.origin}/estudo/abc?convite=tok`);
  });

  it("revogar diz, no título, que quem já entrou CONTINUA — são ações diferentes", () => {
    render(<ConvitePainel convite={base} ocupado={false} onPapel={nada} onRevogar={nada} onFechar={nada} />);
    expect(screen.getByTitle(/Quem já entrou continua na conversa/i)).toBeDefined();
  });
});
