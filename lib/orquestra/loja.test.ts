import { describe, it, expect } from "vitest";
import { AGENTES_ORQUESTRA, motorDoAgenteChat, planoMinimoDoMotor, ehAgenteOrquestra } from "@/lib/orquestra/catalogo";
import { estadoNaLoja } from "@/lib/orquestra/loja";
import { decidir } from "@/lib/orquestra/roteador";
import { MOTORES_NATIVOS } from "@/lib/orquestra/motores";
import { agentesDisponiveis, agenteValido, AGENTES_CHAT } from "@/lib/agents/chatAgentes";
import { agenteDoChat } from "@/lib/agents/agenteEscolhido";
import { personaDoAgente } from "@/lib/research/zaeonEventos";

const CHAVES = { DEEPSEEK_API_KEY: "a", MOONSHOT_API_KEY: "b", OPENROUTER_API_KEY: "c" };
const motores = [...MOTORES_NATIVOS];

describe("catálogo · todo agente da Loja é um motor que existe", () => {
  it("cada id aponta pra um motor nativo e tem plano mínimo", () => {
    for (const a of AGENTES_ORQUESTRA) {
      expect(motores.some((m) => m.id === a.motor), a.id).toBe(true);
      expect(planoMinimoDoMotor(a.motor)).toBe(a.minPlan);
    }
  });
  it("id do seletor → motor (tolera caixa/espaço); agente comum → null", () => {
    expect(motorDoAgenteChat(" ORQ-KIMI ")).toBe("kimi-enxame");
    expect(motorDoAgenteChat("aura")).toBeNull();
    expect(motorDoAgenteChat(undefined)).toBeNull();
  });
});

describe("loja · o estado do cartão pra este aluno", () => {
  it("pausado > aguardando chave > exige plano > liberado", () => {
    const pausado = estadoNaLoja("max", "off", motores, CHAVES);
    expect(new Set(pausado.map((a) => a.estado))).toEqual(new Set(["pausado"]));
    const semChave = estadoNaLoja("max", "on", motores, {});
    expect(semChave.find((a) => a.id === "orq-deepseek")).toMatchObject({ estado: "aguardando_chave" });
    expect(semChave.find((a) => a.id === "orq-deepseek")!.aviso).not.toMatch(/API_KEY/); // nunca expõe nome de env
    const free = estadoNaLoja("free", "on", motores, CHAVES);
    expect(free.find((a) => a.id === "orq-kimi")).toMatchObject({ estado: "exige_plano" });
    const pro = estadoNaLoja("pro", "on", motores, CHAVES);
    expect(pro.every((a) => a.estado === "liberado")).toBe(true);
  });
});

describe("roteador · o agente que o aluno plugou", () => {
  const base = { plano: "pro" as const, intent: "pesquisar_fontes" as const, mode: "research" as const, emSegundoPlano: true, trabalhoGeradoNoCliente: false };
  it("PRO pedindo o DeepSeek pra uma revisão (que sem pedido também seria profundo, mas aqui é ESTE motor)", () => {
    expect(decidir({ ...base, intent: "revisar", pedido: "tongyi-deepresearch" }, CHAVES, motores)).toMatchObject({ motor: "tongyi-deepresearch", formato: "profundo" });
  });
  it("pedido vale também pra explicar conceito (que sem pedido ficaria com a Aura no PRO)", () => {
    expect(decidir({ ...base, intent: "explicar_conceito", pedido: "deepseek-v4-profundo" }, CHAVES, motores).motor).toBe("deepseek-v4-profundo");
  });
  it("enxame pedido por PRO: até 4 subagentes; por MAX: até 12", () => {
    expect(decidir({ ...base, pedido: "kimi-enxame" }, CHAVES, motores)).toMatchObject({ motor: "kimi-enxame", maxSubagentes: 4 });
    expect(decidir({ ...base, plano: "max", pedido: "kimi-enxame" }, CHAVES, motores)).toMatchObject({ maxSubagentes: 12, verificadorGlobal: true });
  });
  it("conversa rápida, turno inline, plano baixo, sem chave e motor fora do catálogo → Aura", () => {
    expect(decidir({ ...base, intent: "duvida_rapida", pedido: "kimi-enxame" }, CHAVES, motores).motor).toBe("aura");
    expect(decidir({ ...base, emSegundoPlano: false, pedido: "kimi-enxame" }, CHAVES, motores).motor).toBe("aura");
    expect(decidir({ ...base, plano: "plus", pedido: "kimi-enxame" }, CHAVES, motores).motivo).toMatch(/exige o plano pro/);
    expect(decidir({ ...base, pedido: "kimi-enxame" }, {}, motores).motivo).toMatch(/sem chave/);
    expect(decidir({ ...base, pedido: "http:qualquer" }, CHAVES, motores).motivo).toMatch(/desconhecido/);
  });
});

describe("chat · o agente plugado aparece no seletor e fala como a Aura", () => {
  it("só depois de plugado; desplugado volta pra Aura", () => {
    expect(agentesDisponiveis([]).some((a) => ehAgenteOrquestra(a.id))).toBe(false);
    expect(agentesDisponiveis(["orq-kimi"]).map((a) => a.id)).toContain("orq-kimi");
    expect(agenteValido("orq-kimi", [])).toBe("aura");
    expect(agenteValido("orq-kimi", ["orq-kimi"])).toBe("orq-kimi");
  });
  it("é agente de CONVERSA (entra pelo harness), e o painel mostra o avatar da Aura", () => {
    expect(AGENTES_CHAT.find((a) => a.id === "orq-deepseek")?.tela).toBe("chat");
    expect(agenteDoChat("orq-deepseek")).toBe("orq-deepseek");
    expect(personaDoAgente("orq-deepseek")).toBe(personaDoAgente("aura"));
    expect(personaDoAgente("ninguem")).toBeNull();
  });
});
