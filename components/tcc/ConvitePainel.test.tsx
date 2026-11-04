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

  it("o link vai INTEIRO na mensagem — o servidor devolve caminho relativo, e relativo não abre em lugar nenhum", () => {
    // o invariante é o mesmo de antes da mensagem colável; o que mudou é ONDE ele aparece (o campo
    // deixou de ser o endereço cru e passou a ser a frase com o endereço dentro).
    render(<ConvitePainel convite={base} ocupado={false} onPapel={nada} onRevogar={nada} onFechar={nada} />);
    const v = (screen.getByLabelText("Mensagem do convite") as HTMLTextAreaElement).value;
    expect(v).toContain(`${window.location.origin}/estudo/abc?convite=tok`);
    expect(v).not.toMatch(/\s\/estudo\//);   // nunca o caminho solto, sem origem
  });

  it("revogar diz, no título, que quem já entrou CONTINUA — são ações diferentes", () => {
    render(<ConvitePainel convite={base} ocupado={false} onPapel={nada} onRevogar={nada} onFechar={nada} />);
    expect(screen.getByTitle(/Quem já entrou continua na conversa/i)).toBeDefined();
  });
});

describe("ConvitePainel · a MENSAGEM colável (pedido do dono: link com frase, não endereço cru)", () => {
  const pintar = (p: Partial<Parameters<typeof ConvitePainel>[0]> = {}) =>
    render(<ConvitePainel convite={base} ocupado={false} onPapel={nada} onRevogar={nada} onFechar={nada} {...p} />);

  it("mostra a frase COM o link dentro, e não só o endereço", () => {
    pintar({ tema: "A fotossíntese" });
    const campo = screen.getByLabelText("Mensagem do convite") as HTMLTextAreaElement;
    expect(campo.value).toContain("Vem estudar comigo sobre A fotossíntese aqui na Zaeon!");
    expect(campo.value).toContain(base.url);
  });

  it("sem tema a frase fecha sozinha — nada de 'sobre' solto nem buraco", () => {
    pintar();
    const v = (screen.getByLabelText("Mensagem do convite") as HTMLTextAreaElement).value;
    expect(v).toContain("Vem estudar comigo aqui na Zaeon!");
    expect(v).not.toContain("sobre ");
  });

  it("LEITOR: o convite não convida pra escrever junto", () => {
    pintar({ convite: { ...base, papel: "leitor" }, tema: "A fotossíntese" });
    const v = (screen.getByLabelText("Mensagem do convite") as HTMLTextAreaElement).value;
    expect(v).toContain("Vem acompanhar meus estudos sobre A fotossíntese");
    expect(v).not.toContain("estudar comigo");
  });

  it("as duas saídas existem: copiar o convite inteiro e copiar só o link", () => {
    pintar({ tema: "A fotossíntese" });
    expect(screen.getByRole("button", { name: /Copiar convite/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Copiar só o link/i })).toBeTruthy();
  });

  it("a frase do ESCOPO continua lá — a mensagem amigável não substitui o aviso do que o link concede", () => {
    pintar({ tema: "A fotossíntese" });
    expect(screen.getByText(/TODOS os trabalhos dela/i)).toBeTruthy();
  });
});
