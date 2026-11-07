import { describe, expect, it } from "vitest";
import { CORPO_POR_USUARIO, corpoDoUsuario, ehTripulacaoDaNave, pilotaANave } from "./corposDeUsuario";
import { CORPOS_DE_JOGADOR, corpoProprio } from "@/lib/cyber/estiloAvatar";

describe("corpo próprio de jogador", () => {
  it("todo corpo mapeado no servidor existe no cliente (sem id órfão)", () => {
    for (const id of Object.values(CORPO_POR_USUARIO)) expect(CORPOS_DE_JOGADOR[id], id).toBeDefined();
  });
  it("conta sem corpo → nada; com corpo → o dela (SEM asas: as asas são só do founder)", () => {
    expect(corpoDoUsuario("000000000000000000000000")).toBeUndefined();
    const giulia = Object.entries(CORPO_POR_USUARIO).find(([, c]) => c === "giulia")![0];
    const p = corpoProprio({ corpo: corpoDoUsuario(giulia) }, "");
    expect(p?.asas).toBe(false); expect(p?.corpo.url).toMatch(/giulia\.vrm$/);   // (out/2026: as asas são só do founder)
  });
  it("o founder continua com o corpo dele, agora de MOCHILA (as asas saíram — out/2026) (e ?founder=0 desliga)", () => {
    expect(corpoProprio({ fundador: true }, "")?.asas).toBe(false);
    expect(corpoProprio({ fundador: true }, "?founder=0")).toBeNull();
    expect(corpoProprio({}, "")).toBeNull();
  });
  /**
   * A TRIPULAÇÃO VOLTOU (nov/2026), e este teste existia afirmando o contrário — com razão, porque
   * em out/2026 o dono havia pedido "só eu". O que ele afirma agora é o PADRÃO: sem a ENV, nada
   * mudou, e é por isso que ele continua passando com a tripulação de volta no código. Trocar a
   * asserção e não o comportamento era o caminho errado; o comportamento default é mesmo este.
   */
  it("sem NAVE_TRIPULACAO: só o dono pilota — nem os outros super admins", () => {
    expect(pilotaANave("donmartinezcaiudoceu@gmail.com", {})).toBe(true);
    expect(pilotaANave("zaeondao@gmail.com", {})).toBe(false);
    expect(pilotaANave("martinez@zaeon.space", {})).toBe(false);
    expect(pilotaANave(null, {})).toBe(false);
  });

  it("com NAVE_TRIPULACAO: o tripulante pilota, e o dono continua pilotando", () => {
    const env = { NAVE_TRIPULACAO: "zaeondao@gmail.com" };
    expect(ehTripulacaoDaNave("zaeondao@gmail.com", env)).toBe(true);
    expect(pilotaANave("zaeondao@gmail.com", env)).toBe(true);
    expect(pilotaANave("donmartinezcaiudoceu@gmail.com", env)).toBe(true);
    expect(pilotaANave("qualquer@outro.com", env)).toBe(false);
  });

  it("a lista perdoa maiúscula, espaço e vírgula sobrando — e nunca deixa vazio virar passe livre", () => {
    const env = { NAVE_TRIPULACAO: " , ZaeonDao@Gmail.Com ,, outro@x.com , " };
    expect(pilotaANave("zaeondao@gmail.com", env)).toBe(true);
    expect(pilotaANave("outro@x.com", env)).toBe(true);
    // o perigo real de uma lista por string: entrada vazia casando com e-mail vazio
    expect(pilotaANave("", env)).toBe(false);
    expect(pilotaANave(null, env)).toBe(false);
    expect(pilotaANave("  ", env)).toBe(false);
    expect(pilotaANave("qualquer@outro.com", { NAVE_TRIPULACAO: "" })).toBe(false);
    expect(pilotaANave("qualquer@outro.com", { NAVE_TRIPULACAO: " , , " })).toBe(false);
  });

  /**
   * TRIPULAÇÃO NÃO É FUNDAÇÃO, e esta é a separação que o pedido do dono exige: ele quer percorrer o
   * produto como ALUNO e ainda embarcar. Se embarcar devolvesse privilégio de fundador, a conta de
   * teste voltaria a não testar nada — que é o defeito que esta mudança está consertando.
   */
  it("embarcar na nave NÃO torna ninguém fundador", async () => {
    const { isSuperAdminEmail } = await import("@/lib/auth/roles");
    expect(pilotaANave("zaeondao@gmail.com", { NAVE_TRIPULACAO: "zaeondao@gmail.com" })).toBe(true);
    expect(isSuperAdminEmail("zaeondao@gmail.com")).toBe(false);
  });
});
