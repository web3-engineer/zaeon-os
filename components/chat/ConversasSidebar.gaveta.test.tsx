// @vitest-environment jsdom
/**
 * #816 · no celular, tocar em "Últimos 7 dias" fechava a GAVETA inteira. A regra da gaveta (app/research-lab/page.tsx)
 * fecha em todo botão/link de dentro dela, menos os marcados (`[aria-haspopup], [role=menu], [data-gaveta-fica]`).
 * Aqui o título do grupo é tocado de verdade, dentro de uma gaveta com essa mesma regra.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import ConversasSidebar from "@/components/chat/ConversasSidebar";

// a MESMA regra do page.tsx (conferida no último teste, para não divergir)
const REGRA_DA_GAVETA = "[aria-haspopup], [role=menu], [data-gaveta-fica]";
const fechaAGaveta = (tocado: HTMLElement) => !!tocado.closest("button, a") && !tocado.closest(REGRA_DA_GAVETA);

beforeEach(() => {
  localStorage.clear();
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as any;
});
afterEach(() => { cleanup(); });

const h = () => ({ aoTrocar: vi.fn(), aoCriar: vi.fn(), aoFechar: vi.fn(), aoRenomear: vi.fn(), aoCriarSub: vi.fn() });
const agora = Date.now();
const t = (id: string, titulo: string, diasAtras: number) => ({ id, titulo, criadaEm: agora - diasAtras * 86_400_000, tocadaEm: agora });

describe("#816 · a gaveta do celular", () => {
  it("tocar no título do grupo abre o grupo e NÃO fecha a gaveta", () => {
    const fechar = vi.fn();
    render(
      <div onClickCapture={(e) => { if (fechaAGaveta(e.target as HTMLElement)) fechar(); }}>
        <ConversasSidebar sala="t" threads={[t("hoje", "Hoje mesmo", 0), t("velha", "Conversa antiga", 60)]} ativa="hoje" {...h()} />
      </div>,
    );
    const grupo = screen.getByRole("button", { name: /Mais antigas/i });
    expect(grupo.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: "Conversa antiga" })).toBeNull();

    fireEvent.click(grupo);
    expect(fechar).not.toHaveBeenCalled();
    expect(grupo.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "Conversa antiga" })).toBeTruthy();

    // escolher uma conversa continua fechando a gaveta (o comportamento de sempre)
    fireEvent.click(screen.getByRole("button", { name: "Conversa antiga" }));
    expect(fechar).toHaveBeenCalledTimes(1);
  });

  it("a regra do teste é a mesma do page.tsx", () => {
    const page = readFileSync(path.resolve(__dirname, "../../app/research-lab/page.tsx"), "utf8");
    expect(page).toContain(`tocado.closest("${REGRA_DA_GAVETA}")`);
  });
});
