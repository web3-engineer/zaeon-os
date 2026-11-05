/**
 * A contabilidade de sessões do container do agente (F9). Relógio INJETADO — é o que torna o TTL
 * testável sem esperar dois minutos e sem navegador.
 */
import { describe, it, expect } from "vitest";
import {
  MAX_SESSOES,
  TTL_MS,
  VIDA_MAX_MS,
  criarRegistro,
  novoId,
} from "../../services/agente-navegador/sessoes.mjs";

function relogio(t = 0) {
  const r = { t, agora: () => r.t, avancar: (ms: number) => { r.t += ms; } };
  return r;
}

describe("novoId", () => {
  it("32 hex, imprevisível — id sequencial deixaria um vizinho adivinhar a sessão de outro", () => {
    const a = novoId();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    const muitos = new Set(Array.from({ length: 200 }, () => novoId()));
    expect(muitos.size).toBe(200);
  });
});

describe("teto de sessões", () => {
  it("abre até o máximo e depois recusa com `lotado`", () => {
    const reg = criarRegistro<string>({ max: 2 });
    expect(reg.abrir("a").ok).toBe(true);
    expect(reg.abrir("b").ok).toBe(true);
    expect(reg.abrir("c")).toEqual({ ok: false, erro: "lotado" });
    expect(reg.tamanho).toBe(2);
  });

  it("fechar libera vaga", () => {
    const reg = criarRegistro<string>({ max: 1 });
    const r = reg.abrir("a");
    expect(r.ok && reg.abrir("b").ok).toBe(false);
    if (r.ok) reg.fechar(r.id);
    expect(reg.abrir("b").ok).toBe(true);
  });

  it("o default é 2 — e é MENOR que o teto do web, porque cada sessão é um contexto do Chromium", () => {
    expect(MAX_SESSOES).toBe(2);
  });
});

describe("TTL por ociosidade", () => {
  it("expira depois do TTL e devolve a sessão morta pra quem fecha o recurso", () => {
    const c = relogio();
    const reg = criarRegistro<string>({ agora: c.agora, ttl: 1_000 });
    const r = reg.abrir("a");
    c.avancar(1_000);
    const mortas = reg.expirar();
    expect(mortas.map((m) => m.recurso)).toEqual(["a"]);
    expect(reg.tamanho).toBe(0);
    expect(r.ok && reg.usar(r.id)).toBe(null);
  });

  it("`usar` TOCA a sessão: um plano em andamento não morre no meio", () => {
    // Separar "buscar" de "tocar" seria um convite a esquecer o toque num caminho só — e a sessão
    // morreria justamente durante o uso. É por isso que `usar` faz as duas coisas.
    const c = relogio();
    const reg = criarRegistro<string>({ agora: c.agora, ttl: 1_000 });
    const r = reg.abrir("a");
    for (let i = 0; i < 10; i++) {
      c.avancar(900);
      expect(r.ok && reg.usar(r.id)?.recurso, `volta ${i}`).toBe("a");
    }
    expect(reg.tamanho).toBe(1);
  });

  it("sessão ociosa não ocupa vaga do teto", () => {
    const c = relogio();
    const reg = criarRegistro<string>({ agora: c.agora, max: 1, ttl: 1_000 });
    reg.abrir("a");
    c.avancar(1_000);
    expect(reg.abrir("b").ok).toBe(true); // `abrir` expira antes de contar
  });
});

describe("teto de VIDA (mesmo em uso)", () => {
  it("um plano em laço não segura o container pra sempre", () => {
    const c = relogio();
    const reg = criarRegistro<string>({ agora: c.agora, ttl: 10_000, vidaMax: 5_000 });
    const r = reg.abrir("a");
    c.avancar(4_000);
    expect(r.ok && reg.usar(r.id)?.recurso).toBe("a"); // tocada, segue viva
    c.avancar(1_000);
    expect(r.ok && reg.usar(r.id)).toBe(null);          // vida máxima vence o toque
  });

  it("os defaults são os documentados", () => {
    expect(TTL_MS).toBe(120_000);
    expect(VIDA_MAX_MS).toBe(600_000);
  });
});

describe("robustez do id", () => {
  it("id ausente/estranho não derruba nem acha sessão alheia", () => {
    const reg = criarRegistro<string>();
    reg.abrir("a");
    for (const x of [undefined, null, "", 0, "nao-existe", "../../etc", {}]) {
      expect(reg.usar(x as unknown), String(x)).toBe(null);
      expect(reg.fechar(x as unknown), String(x)).toBe(null);
    }
    expect(reg.tamanho).toBe(1);
  });
});
