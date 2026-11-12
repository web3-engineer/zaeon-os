import { describe, expect, it } from "vitest";
import { ProvedorStub, nomeProvedor, pagamentosLive, provedor } from "./provedor";
import { montarCobranca } from "./cobranca";

describe("flag e escolha de provedor", () => {
  it("pagamentos desligados por padrão → stub", () => {
    expect(pagamentosLive({})).toBe(false);
    expect(nomeProvedor({})).toBe("stub");
    expect(provedor({}).nome).toBe("stub");
  });

  it("cloak só quando ligado E escolhido; senão stub", () => {
    expect(nomeProvedor({ PAGAMENTOS_LIVE: "1", PAGAMENTOS_PROVIDER: "cloak" })).toBe("cloak");
    expect(nomeProvedor({ PAGAMENTOS_PROVIDER: "cloak" })).toBe("stub"); // sem LIVE, fica no stub
    expect(nomeProvedor({ PAGAMENTOS_LIVE: "1" })).toBe("stub"); // sem escolher cloak
  });

  it("o provedor cloak ainda não integrado LANÇA (nunca cai no stub escondido)", async () => {
    const p = provedor({ PAGAMENTOS_LIVE: "1", PAGAMENTOS_PROVIDER: "cloak" });
    expect(p.nome).toBe("cloak");
    await expect(p.criar({ cobranca: montarCobranca("apoio", 10).cobranca!, referencia: "x" })).rejects.toThrow(/não integrado/);
  });
});

describe("stub de devnet", () => {
  it("cria a intenção com os valores da cobrança e deixa claro que é simulação", async () => {
    const stub = new ProvedorStub();
    const c = montarCobranca("apoio", 10).cobranca!;
    const { intencao, abertura } = await stub.criar({ cobranca: c, referencia: "pesquisa-x", beneficiario: "u1" });
    expect(intencao).toMatchObject({ finalidade: "apoio", moeda: "USDC", recebe: 10, total: 10.48, referencia: "pesquisa-x", beneficiario: "u1", status: "aguardando" });
    expect(abertura.instrucao).toMatch(/[Ss]imula/);
    expect(abertura.intencaoId).toBe(intencao.id);
  });

  it("confirmar muda o status; status de id inexistente é falhou", async () => {
    const stub = new ProvedorStub();
    const { intencao } = await stub.criar({ cobranca: montarCobranca("compra", 1).cobranca!, referencia: "card-1" });
    expect(await stub.status(intencao.id)).toBe("aguardando");
    expect(stub.confirmar(intencao.id)).toBe("confirmado");
    expect(await stub.status(intencao.id)).toBe("confirmado");
    expect(await stub.status("nao-existe")).toBe("falhou");
  });
});
