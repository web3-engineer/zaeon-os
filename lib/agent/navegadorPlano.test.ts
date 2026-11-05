import { describe, it, expect } from "vitest";
import { AGENTE_MAX_PASSOS, AGENTE_MAX_PASSOS_REMOTO } from "@/lib/agent/navegadorPolitica";
import { lerPlanoDoAgente, promptDoPlano, sistemaDoPlano } from "@/lib/agent/navegadorPlano";

describe("lerPlanoDoAgente — recusa com NOME, em vez de deixar o laço dizer 'denied'", () => {
  it("escrita sai do plano e é devolvida em `recusadas`", () => {
    const p = lerPlanoDoAgente({
      acoes: [
        { kind: "navigate", url: "https://arxiv.org/a" },
        { kind: "click", selector: "#b" },
        { kind: "type", selector: "#i", text: "x" },
        { kind: "read" },
      ],
    });
    expect(p.acoes.map((a) => a.kind)).toEqual(["navigate", "read"]);
    expect(p.recusadas).toEqual(["click", "type"]);
  });

  it("handoff também é recusado: não há humano na página", () => {
    const p = lerPlanoDoAgente({ acoes: [{ kind: "handoff", reason: "login" }, { kind: "done" }] });
    expect(p.acoes.map((a) => a.kind)).toEqual(["done"]);
    expect(p.recusadas).toEqual(["handoff"]);
  });

  it("`navigate` sem url não entra — executá-lo chamaria goto('') e erraria o run", () => {
    const p = lerPlanoDoAgente({ acoes: [{ kind: "navigate" }, { kind: "navigate", url: "  " }] });
    expect(p.acoes).toEqual([]);
    expect(p.recusadas).toEqual(["navigate_sem_url", "navigate_sem_url"]);
  });

  it("tipo desconhecido é recusado pelo nome (o cockpit mostra o que o modelo inventou)", () => {
    expect(lerPlanoDoAgente({ acoes: [{ kind: "comprar" }] }).recusadas).toEqual(["comprar"]);
  });
});

describe("lerPlanoDoAgente — tolerante na forma, estrita no conteúdo", () => {
  it("aceita {acoes}, {actions} e array cru", () => {
    const esperado = ["navigate"];
    const a = { kind: "navigate", url: "https://arxiv.org/x" };
    expect(lerPlanoDoAgente({ acoes: [a] }).acoes.map((x) => x.kind)).toEqual(esperado);
    expect(lerPlanoDoAgente({ actions: [a] }).acoes.map((x) => x.kind)).toEqual(esperado);
    expect(lerPlanoDoAgente([a]).acoes.map((x) => x.kind)).toEqual(esperado);
  });

  it("lixo não derruba: devolve plano vazio", () => {
    for (const x of [null, undefined, 0, "", "oi", {}, { acoes: "não é lista" }]) {
      expect(lerPlanoDoAgente(x)).toEqual({ acoes: [], recusadas: [] });
    }
  });

  it("item não-objeto é ignorado sem virar recusa falsa", () => {
    expect(lerPlanoDoAgente({ acoes: [null, 1, "x", { kind: "done" }] }).acoes.map((a) => a.kind)).toEqual(["done"]);
  });

  it("aceita os campos em português (kind/tipo, selector/seletor, label/rotulo)", () => {
    const p = lerPlanoDoAgente({ acoes: [{ tipo: "read", seletor: "#main", rotulo: "ler o resumo" }] });
    expect(p.acoes[0]).toEqual({ kind: "read", selector: "#main", label: "ler o resumo" });
  });

  it("corta no teto de passos — e no teto PASSADO, quando há container", () => {
    const muitas = Array.from({ length: 40 }, () => ({ kind: "read" }));
    expect(lerPlanoDoAgente({ acoes: muitas }).acoes.length).toBe(AGENTE_MAX_PASSOS);
    expect(lerPlanoDoAgente({ acoes: muitas }, AGENTE_MAX_PASSOS_REMOTO).acoes.length).toBe(AGENTE_MAX_PASSOS_REMOTO);
  });

  it("campo vazio não vira string vazia na ação", () => {
    const p = lerPlanoDoAgente({ acoes: [{ kind: "read", selector: "   ", label: "" }] });
    expect(p.acoes[0]).toEqual({ kind: "read" });
  });
});

describe("prompt", () => {
  it("o sistema diz as regras duras, inclusive que não há humano", () => {
    const sis = sistemaDoPlano();
    expect(sis).toMatch(/SOMENTE LEITURA/);
    expect(sis).toMatch(/Não há\s*\n?\s*humano|NÃO pode clicar/);
    expect(sis).toContain(String(AGENTE_MAX_PASSOS));
  });

  it("F9 · o teto do prompt é o teto REAL do laço, não um número congelado", () => {
    // Congelado, o prompt prometeria 25 passos onde o laço concede 12 (ou o contrário): o modelo
    // planejaria o que vai ser cortado, e ninguém diria por quê.
    expect(sistemaDoPlano(AGENTE_MAX_PASSOS_REMOTO)).toContain(String(AGENTE_MAX_PASSOS_REMOTO));
    expect(sistemaDoPlano(AGENTE_MAX_PASSOS_REMOTO)).not.toContain(`máximo ${AGENTE_MAX_PASSOS} ações`);
  });

  it("a tarefa é truncada (instrução gigante não estoura o prompt)", () => {
    expect(promptDoPlano("x".repeat(9_000)).length).toBeLessThan(2_100);
  });
});
