/**
 * lib/ai/proNasPesadas.test.ts — F7 · quem leva o Pro, e as duas armadilhas que faziam a ligação
 * anterior ser um NO-OP silencioso.
 *
 * A primeira é a flag vazia: `${{ vars.X || '' }}` entrega string vazia, e tratá-la como "off"
 * desligaria o recurso em produção sem ninguém notar (§8.1). A segunda é o `opts.modelo` do
 * adaptador, que vem SEMPRE preenchido e curto-circuitava a escolha do modelo — está medida em
 * lib/agent/aura-harness.pro.test.ts, que é onde o `modelFor` mora.
 */
import { describe, it, expect } from "vitest";
import { proNasPesadasLigado, planoDaDireitoAoPro, contaDaDireitoAoPro, podeProNasPesadas, limparMemoPro } from "@/lib/ai/proNasPesadas";
import { planCapabilities, type Plan } from "@/lib/plans";

const conta = (plan: string, extra: Record<string, unknown> = {}) => ({ plan, plusUntil: null, trialGranted: false, ...extra });

describe("F7 · a flag", () => {
  it("AUSENTE e VAZIA = LIGADA (o portão do dono foi aberto; vazio não é zero)", () => {
    expect(proNasPesadasLigado({})).toBe(true);
    for (const v of ["", "   "]) expect(proNasPesadasLigado({ PRO_PESADAS: v }), JSON.stringify(v)).toBe(true);
  });

  it("só 0/off/false/nao desligam — e é esse o rollback", () => {
    for (const v of ["0", "off", "false", "nao", "não", "NO"]) expect(proNasPesadasLigado({ PRO_PESADAS: v }), v).toBe(false);
    for (const v of ["1", "on", "sim", "qualquer"]) expect(proNasPesadasLigado({ PRO_PESADAS: v }), v).toBe(true);
  });
});

describe("F7 · quem tem direito: só plus e pro", () => {
  it("free não; plus, pro e max sim", () => {
    expect(planoDaDireitoAoPro({ plan: "free", plusUntil: null, trialGranted: false })).toBe(false);
    for (const p of ["plus", "pro", "max"] as Plan[]) {
      expect(planoDaDireitoAoPro({ plan: p, plusUntil: null, trialGranted: false }), p).toBe(true);
    }
  });

  it("deriva de `planCapabilities().deep`, não de uma lista à mão — uma definição só de 'quem paga'", () => {
    for (const p of ["free", "plus", "pro", "max"] as Plan[]) {
      expect(planoDaDireitoAoPro({ plan: p, plusUntil: null, trialGranted: false }), p)
        .toBe(planCapabilities(p).deep !== "none");
    }
  });

  it("plano PAGO EXPIRADO cai para free: `plusUntil` no passado não leva Pro", () => {
    const ontem = new Date(Date.now() - 24 * 3600_000);
    expect(planoDaDireitoAoPro({ plan: "plus", plusUntil: ontem, trialGranted: false })).toBe(false);
    const amanha = new Date(Date.now() + 24 * 3600_000);
    expect(planoDaDireitoAoPro({ plan: "plus", plusUntil: amanha, trialGranted: false })).toBe(true);
  });

  it("a conta como o banco devolve: override manual vale, conta ausente NÃO vale", () => {
    expect(contaDaDireitoAoPro(conta("plus"))).toBe(true);
    expect(contaDaDireitoAoPro(conta("free"))).toBe(false);
    expect(contaDaDireitoAoPro(conta("free", { deepThinkEnabled: true }))).toBe(true);   // override do admin
    expect(contaDaDireitoAoPro(null)).toBe(false);
    expect(contaDaDireitoAoPro(undefined)).toBe(false);
    expect(contaDaDireitoAoPro({})).toBe(false);          // documento sem `plan` = free, não = pago
  });

  it("valor de plano desconhecido/antigo não abre a porta por acidente (só 'pulse' é plus)", () => {
    expect(contaDaDireitoAoPro(conta("lixo"))).toBe(false);
    expect(contaDaDireitoAoPro(conta("PLUS"))).toBe(false);   // normalizePlan é sensível a caixa
    expect(contaDaDireitoAoPro(conta("pulse"))).toBe(true);   // nome antigo do plus
  });
});

describe("F7 · a consulta NUNCA segura o turno (o defeito que o CI pegou)", () => {
  // Eu pus uma leitura de banco bloqueante no caminho do turno. Com o Mongo inalcançável — que é o
  // caso do CI (`MONGODB_URI` placeholder) — cada turno parava 5 s no DNS antes de falhar fechado:
  // 12 testes de `runChatTurn` vermelhos, e em produção seria atraso antes da 1ª palavra. Escolher
  // modelo é decisão ACESSÓRIA, então o prazo é curto e a resposta de quem não respondeu é "Flash".
  it("sem userId ou com a flag desligada: `false` na hora, sem tocar o banco", async () => {
    limparMemoPro();
    expect(await podeProNasPesadas(null)).toBe(false);
    expect(await podeProNasPesadas("")).toBe(false);
    expect(await podeProNasPesadas("algum-id", { PRO_PESADAS: "0" })).toBe(false);
  });

  it("banco indisponível ou lento: resolve FALSE e em muito menos que o timeout do driver", async () => {
    limparMemoPro();
    const t0 = Date.now();
    const vale = await podeProNasPesadas("000000000000000000000000");
    const gasto = Date.now() - t0;
    expect(vale).toBe(false);               // falha FECHADO: o caro nunca é o padrão de um acidente
    expect(gasto).toBeLessThan(2_000);      // o DNS do driver leva ~5 s; o prazo é 250 ms
  });
});
