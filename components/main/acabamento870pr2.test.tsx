// @vitest-environment jsdom
/** #870 (PR 2): barra de cima com fundo, setas do carrossel, cyberespaço (texto do carregamento e .vrm lido uma vez) e Sobre nós ≥ 11 px. */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock("@/components/estudos/CartaVitrine", () => ({ default: () => <div /> }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const ler = (p: string) => readFileSync(p, "utf8");

describe("#870 · barra de cima com fundo", () => {
  it("as cores do tema viram canais RGB, então bg-background/80 é gerado (com hex o Tailwind não gerava)", () => {
    const tw = ler("tailwind.config.ts");
    expect(tw).toMatch(/background: "rgb\(var\(--background-rgb\) \/ <alpha-value>\)"/);
    expect(tw).toMatch(/foreground: "rgb\(var\(--foreground-rgb\) \/ <alpha-value>\)"/);
    const css = ler("app/globals.css");
    // claro e escuro com os MESMOS tons do hex (#f8fafc / #030014)
    expect(css).toMatch(/--background: #f8fafc;[\s\S]{0,300}--background-rgb: 248 250 252;/);
    expect(css).toMatch(/--background: #030014;[\s\S]{0,120}--background-rgb: 3 0 20;/);
    expect(ler("components/main/navbar.tsx")).toMatch(/bg-background\/80/);
  });
});

describe("#870 · setas do carrossel da apresentação", () => {
  let menosAnimacao = true;
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") ? menosAnimacao : false, addEventListener() {}, removeEventListener() {} }));
  });

  it("‹ e › rolam a faixa — também com 'menos animação' (aí sem animação de rolagem)", async () => {
    menosAnimacao = true;
    const { default: ConhecimentoShowcase } = await import("./ConhecimentoShowcase");
    const { container } = render(<ConhecimentoShowcase />);
    const faixa = container.querySelector("ul")!;
    const rolou: ScrollToOptions[] = [];
    faixa.scrollBy = ((o: ScrollToOptions) => { rolou.push(o); }) as typeof faixa.scrollBy;
    fireEvent.click(screen.getByRole("button", { name: "landing.knowledge_cards.next" }));
    fireEvent.click(screen.getByRole("button", { name: "landing.knowledge_cards.prev" }));
    expect(rolou).toHaveLength(2);
    expect(rolou[0]!.left).toBeGreaterThan(0);
    expect(rolou[1]!.left).toBeLessThan(0);
    expect(rolou.every((o) => o.behavior === "auto")).toBe(true);
  });

  it("as setas têm 44 px (alvo de toque)", () => {
    const css = ler("components/main/timeline-ideia.css");
    expect(css).toMatch(/\.ci-carrossel-seta \{[\s\S]{0,200}width: 44px;\s*height: 44px;/);
  });

  it("os 7 idiomas têm o nome das setas", () => {
    for (const l of ["pt", "en", "es", "fr", "de", "ko", "zh"]) {
      const kc = JSON.parse(ler(`public/locales/${l}/common.json`)).landing.knowledge_cards;
      expect(kc.prev, l).toBeTruthy();
      expect(kc.next, l).toBeTruthy();
    }
  });
});

describe("#870 · cyberespaço", () => {
  it("a tela de carregamento diz a etapa e a porcentagem (antes era só a barra)", async () => {
    const { default: TelaCarregando } = await import("@/components/cyber/TelaCarregando");
    const { container } = render(<TelaCarregando carga={{ etapa: "zaeon", rotulo: "Construindo a cidade Zaeon", progresso: 0.42 }} />);
    expect(container.querySelector("[data-carregando-texto]")!.textContent).toBe("Construindo a cidade Zaeon · 42%");
  });

  it("antes do código chegar, a tela preta diz 'Abrindo o cyberespaço…'", () => {
    expect(ler("app/lounge-cosmico/page.tsx")).toMatch(/Abrindo o cyberespaço…/);
  });

  it("o corpo que a pré-carga já leu inteiro é entregue ao VRM (não é lido de novo)", async () => {
    const pc = await import("@/lib/cyber/precarga");
    pc._reiniciarPrecarga();
    const url = pc.urlsDosCorpos()[0]!;
    const lidos: string[] = [];
    pc.precarregarCorposCyber({
      ambiente: { largura: 1440 },
      importarCodigo: async () => ({}),
      baixarImpl: async (u, avancar, _t, _s, guardar) => { lidos.push(u); avancar(4); guardar?.(new Uint8Array([1, 2, 3, 4]).buffer); return 4; },
    });
    await vi.waitFor(() => expect(pc.corpoBaixando(url)).toBeUndefined());
    await vi.waitFor(() => expect(lidos).toContain(url));
    const b = pc.tomarCorpoBaixado(url);
    expect(b && new Uint8Array(b)).toEqual(new Uint8Array([1, 2, 3, 4]));
    // tirado da pré-carga: não guarda 16 MB em dobro
    expect(pc.tomarCorpoBaixado(url)).toBeUndefined();
    expect(ler("components/cyber/AvatarVrm.ts")).toMatch(/tomarCorpoBaixado\(url\) \?\? comTentativas\(\(\) => baixarBytes\(url\)\)/);
  });
});

describe("#870 · Sobre nós", () => {
  it("nenhuma letra abaixo de 11 px (LVL tinha 7 px; 'Mais popular', 9 px)", () => {
    for (const p of ["app/about/AboutContent.tsx", "components/about/PdaEquipe.tsx", "components/about/PilaresAbout.tsx"]) {
      const tamanhos = [...ler(p).matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)].map((m) => Number(m[1]));
      expect(tamanhos.filter((t) => t < 11), p).toEqual([]);
    }
  });
});
