// @vitest-environment jsdom
/** #824 · o Marketplace no lugar de "Assistentes" no menu principal */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ler = (p: string) => readFileSync(path.resolve(__dirname, "../..", p), "utf8");

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

describe("#824 · o caminho do Marketplace", () => {
  beforeEach(() => { vi.resetModules(); });

  it("/marketplace leva ao laboratório já na vitrine", async () => {
    const { redirect } = await import("next/navigation");
    const { default: Marketplace } = await import("@/app/marketplace/page");
    const { DESTINO_MARKETPLACE } = await import("./marketplaceRota");
    Marketplace();
    expect(redirect).toHaveBeenCalledWith(DESTINO_MARKETPLACE);
    expect(DESTINO_MARKETPLACE).toBe("/research-lab?tab=sala-de-estudos&aba=marketplace");
  });

  it("o endereço pede o Marketplace só com ?aba=marketplace", async () => {
    const { pedeMarketplace } = await import("./marketplaceRota");
    expect(pedeMarketplace("?tab=sala-de-estudos&aba=marketplace")).toBe(true);
    expect(pedeMarketplace("?tab=sala-de-estudos")).toBe(false);
    expect(pedeMarketplace("")).toBe(false);
  });

  it("o endereço acompanha a aba (recarregar e voltar caem no mesmo lugar), sem perder o resto", async () => {
    const { comMarketplace } = await import("./marketplaceRota");
    expect(comMarketplace("", true)).toBe("?tab=sala-de-estudos&aba=marketplace");
    // ao sair, o tab=sala-de-estudos que a entrada pôs sai junto (recarregar volta pra última sala visitada)
    expect(comMarketplace("?tab=sala-de-estudos&aba=marketplace&x=1", false)).toBe("?x=1");
    expect(comMarketplace("?tab=sala-de-estudos", false)).toBe("?tab=sala-de-estudos");   // (sem a vitrine, não mexe)
    expect(comMarketplace("?tab=profile", false)).toBe("?tab=profile");   // (não mexe no que não é dele)
  });
});

describe("#824 · qual item do menu acende", () => {
  it("no laboratório: Marketplace quando a vitrine está aberta, Laboratório no resto", async () => {
    const { itemAtivo } = await import("./marketplaceRota");
    expect(itemAtivo("/research-lab", true)).toBe("marketplace");
    expect(itemAtivo("/research-lab", false)).toBe("laboratorio");
    expect(itemAtivo("/marketplace", false)).toBe("marketplace");
    expect(itemAtivo("/docs/primeiros-passos", false)).toBe("docs");
    expect(itemAtivo("/about", false)).toBe("about");
    expect(itemAtivo("/news/x", false)).toBe("news");
    expect(itemAtivo("/", false)).toBeNull();
  });

  it("o menu do celular marca o mesmo item (pelo endereço do item, não pela página)", async () => {
    const { itemAtivo, HREF_DO_ITEM } = await import("./marketplaceRota");
    expect(HREF_DO_ITEM[itemAtivo("/research-lab", true)!]).toBe("/marketplace");
    expect(HREF_DO_ITEM[itemAtivo("/research-lab", false)!]).toBe("/research-lab");
  });

  it("o aviso do laboratório chega ao menu (e não se repete à toa)", async () => {
    const { avisarMarketplace, estaNoMarketplace, EVT_MARKETPLACE } = await import("./marketplaceRota");
    const recebidos: boolean[] = [];
    const f = (e: Event) => recebidos.push((e as CustomEvent<boolean>).detail);
    window.addEventListener(EVT_MARKETPLACE, f);
    avisarMarketplace(true); avisarMarketplace(true); avisarMarketplace(false);
    window.removeEventListener(EVT_MARKETPLACE, f);
    expect(recebidos).toEqual([true, false]);
    expect(estaNoMarketplace()).toBe(false);
  });
});

describe("#824 · as amarrações", () => {
  const navbar = ler("components/main/navbar.tsx");
  it("o menu do computador e o do celular apontam para /marketplace, sem 'Assistentes'", () => {
    expect(navbar).toMatch(/<Link href=\{ROTA_MARKETPLACE\} className=\{getLinkClassName\("marketplace"\)\}>Marketplace<\/Link>/);
    expect(navbar).toMatch(/\{ href: ROTA_MARKETPLACE, rotulo: "Marketplace" \}/);
    expect(navbar).not.toMatch(/lojaLabel|"\/assistentes"/);
  });
  it("o rodapé também", () => {
    const footer = ler("components/main/footer.tsx");
    expect(footer).toMatch(/\{ label: "marketplace", href: "\/marketplace" \}/);
    expect(footer).not.toMatch(/"\/assistentes"/);
  });
  it("o laboratório usa o hook com a vitrine aberta = Sala de Estudos na aba community", () => {
    const lab = ler("app/research-lab/page.tsx");
    expect(lab).toMatch(/useMarketplaceNoLab\(activeTab === "sala-de-estudos" && abaEstudos === "community", irEstudos\)/);
  });
  it("o menu (computador e celular) pede pro laboratório sair da vitrine ao clicar em Laboratório; o celular marca pelo item", () => {
    expect(navbar).toMatch(/<Link href="\/research-lab" onClick=\{irAoLaboratorio\}/);
    expect(navbar).toMatch(/\{ href: "\/research-lab", rotulo: "Laboratório", aoClicar: irAoLaboratorio \}/);
    expect(navbar).toMatch(/aria-current=\{atual === i\.href \? "page" : undefined\}/);
  });
  it("a Sala avisa também quando vai pra Literatura ou um curso (a vitrine fechou)", () => {
    const sala = ler("app/workstation/student/StudyRoomContent.tsx");
    expect(sala).toMatch(/anunciarAbaEstudos\(activeTab === "meus-estudos" \|\| activeTab === "feed" \|\| activeTab === "community" \? activeTab : "outra"\)/);
  });
  it("a tradução do rodapé existe nos 7 idiomas", () => {
    for (const l of ["pt", "en", "es", "fr", "de", "ko", "zh"]) {
      const j = JSON.parse(ler(`public/locales/${l}/common.json`));
      expect(j.landing.interface.marketplace, l).toBeTruthy();
    }
  });
});
