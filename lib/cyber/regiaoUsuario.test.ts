import { describe, expect, it } from "vitest";
import { REGIAO_PADRAO, regiaoDoFuso, regiaoDoUsuario, ufDaCidade, ufDaInstituicao } from "./regiaoUsuario";
import { BRAZILIAN_FEDERAL_UNIVERSITIES } from "@/constants/universities";

describe("a região real de cada pessoa", () => {
  it("quem é de fora do país vai pro exterior, mesmo com cidade brasileira", () => {
    expect(regiaoDoUsuario({ countryCode: "us", city: "Fortaleza" }).regiao).toBe("exterior");
  });
  it("o estado da instituição vale antes da cidade", () => {
    const ufc = BRAZILIAN_FEDERAL_UNIVERSITIES.find((u) => u.state === "CE")!;
    expect(ufDaInstituicao(ufc.id)).toBe("CE");
    expect(ufDaInstituicao(ufc.acronym.toLowerCase())).toBe("CE");
    expect(regiaoDoUsuario({ countryCode: "br", institution: ufc.id, city: "Porto Alegre" })).toEqual({ regiao: "nordeste", fonte: "instituicao" });
  });
  it("a cidade: capitais sem acento/caixa e a UF escrita no fim", () => {
    expect(ufDaCidade("São Paulo")).toBe("SP");
    expect(ufDaCidade("  belém ")).toBe("PA");
    expect(ufDaCidade("Quixadá - CE")).toBe("CE");
    expect(ufDaCidade("Lajeado/RS")).toBe("RS");
    expect(ufDaCidade("Cidadezinha")).toBeNull();
    expect(regiaoDoUsuario({ city: "Curitiba" })).toEqual({ regiao: "sul", fonte: "cidade" });
    expect(regiaoDoUsuario({ city: "Goiânia" }).regiao).toBe("centro-oeste");
  });
  it("o fuso do navegador como reserva", () => {
    expect(regiaoDoFuso("America/Fortaleza")).toBe("nordeste");
    expect(regiaoDoFuso("America/Manaus")).toBe("norte");
    expect(regiaoDoFuso("Europe/Lisbon")).toBe("exterior");
    expect(regiaoDoUsuario({ fuso: "America/Cuiaba" })).toEqual({ regiao: "centro-oeste", fonte: "fuso" });
    // brasileiro de perfil com o navegador num fuso de fora: não vira exterior por causa do fuso
    expect(regiaoDoUsuario({ countryCode: "br", fuso: "Europe/Lisbon" }).fonte).toBe("padrao");
  });
  it("sem pista nenhuma, a região padrão", () => {
    expect(regiaoDoUsuario({})).toEqual({ regiao: REGIAO_PADRAO, fonte: "padrao" });
  });
});
