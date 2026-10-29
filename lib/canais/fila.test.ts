import { describe, it, expect } from "vitest";
import {
  ESTADOS_POST, avaliarPublicacao, cabeNaRede, chaveDedupe, ehEstadoPost, estadoTerminal,
  motivoPiiNaAprovacao, podeTransicionar, textoFinalDe, type LinhaPost, type Voz,
} from "./fila";
import { diaBrt, type EstadoEnvio } from "./politica";
import { LIMITE_TEXTO } from "./tipos";

const AGORA = new Date("2026-10-29T17:00:00Z"); // 14h BRT — fora do quiet hours
const HOJE = diaBrt(AGORA);

const voz: Voz = { agentKey: "farmacia", nome: "Kekulé", area: "Farmácia" };

const post = (over: Partial<LinhaPost> = {}): LinhaPost => ({
  id: "p1", agentKey: "farmacia", rede: "linkedin", estado: "aprovado",
  texto: "Três erros comuns na diluição de medicamentos — e como o cálculo correto evita cada um.",
  ...over,
});

const canal = (over: Partial<EstadoEnvio> = {}): EstadoEnvio => ({
  rede: "linkedin", estado: "conectado", limiteDia: 2, enviadosHoje: 0, diaContagem: HOJE, ...over,
});

describe("fila · máquina de estados", () => {
  it("o caminho feliz é legal do começo ao fim", () => {
    expect(podeTransicionar("rascunho", "aprovado")).toBe(true);
    expect(podeTransicionar("aprovado", "publicando")).toBe(true);
    expect(podeTransicionar("publicando", "publicado")).toBe(true);
  });

  it("publicado e recusado são TERMINAIS — conteúdo público não se desaprova", () => {
    for (const e of ["publicado", "recusado"] as const) {
      expect(estadoTerminal(e), e).toBe(true);
      for (const destino of ESTADOS_POST) expect(podeTransicionar(e, destino), `${e}→${destino}`).toBe(false);
    }
  });

  it("não dá pra pular a aprovação", () => {
    expect(podeTransicionar("rascunho", "publicando")).toBe(false);
    expect(podeTransicionar("rascunho", "publicado")).toBe(false);
  });

  it("erro transitório devolve pra fila; erro permanente exige gente", () => {
    expect(podeTransicionar("publicando", "aprovado")).toBe(true);  // timeout: volta sozinho
    expect(podeTransicionar("falhou", "aprovado")).toBe(true);      // mas passando por humano
    expect(podeTransicionar("falhou", "publicando")).toBe(false);   // nunca direto
  });

  it("dá pra puxar de volta um aprovado que ainda não saiu", () => {
    expect(podeTransicionar("aprovado", "rascunho")).toBe(true);
    expect(podeTransicionar("aprovado", "recusado")).toBe(true);
  });

  it("post preso no claim (`publicando`) tem saída — nenhum estado é irrecuperável", () => {
    // Processo morto entre o claim e a gravação do desfecho. Sem isto, o post ficaria travado
    // pra sempre: o executor não pega (só pega `aprovado`) e a tela não teria o que oferecer.
    const saidas = ESTADOS_POST.filter((e) => podeTransicionar("publicando", e));
    expect(saidas).toContain("aprovado");
    for (const e of ESTADOS_POST.filter((x) => !estadoTerminal(x))) {
      expect(ESTADOS_POST.some((d) => podeTransicionar(e, d)), `${e} sem saída`).toBe(true);
    }
  });

  it("ehEstadoPost recusa o que não é estado", () => {
    expect(ehEstadoPost("aprovado")).toBe(true);
    expect(ehEstadoPost("publicada")).toBe(false);
    expect(ehEstadoPost(null)).toBe(false);
  });
});

describe("fila · dedupe", () => {
  it("mesmo conteúdo no mesmo dia dá a mesma chave (espaço e caixa não contam)", () => {
    const a = chaveDedupe({ agentKey: "farmacia", rede: "x", texto: "Olá   Mundo", dia: "2026-10-29" });
    const b = chaveDedupe({ agentKey: "farmacia", rede: "x", texto: "olá mundo", dia: "2026-10-29" });
    expect(a).toBe(b);
  });

  it("dia, rede e agente separam a chave", () => {
    const base = { agentKey: "farmacia", rede: "x", texto: "igual", dia: "2026-10-29" };
    expect(chaveDedupe(base)).not.toBe(chaveDedupe({ ...base, dia: "2026-10-30" }));
    expect(chaveDedupe(base)).not.toBe(chaveDedupe({ ...base, rede: "linkedin" }));
    expect(chaveDedupe(base)).not.toBe(chaveDedupe({ ...base, agentKey: "medicina" }));
  });

  it("sufixo permite dois rascunhos deliberados do mesmo texto", () => {
    const base = { agentKey: "farmacia", rede: "x", texto: "igual", dia: "2026-10-29" };
    expect(chaveDedupe({ ...base, sufixo: "manual-1" })).not.toBe(chaveDedupe({ ...base, sufixo: "manual-2" }));
  });
});

describe("fila · texto final", () => {
  it("assina sempre, com área quando há", () => {
    expect(textoFinalDe(post(), voz)).toContain("— Kekulé, Farmácia · Zaeon");
    expect(textoFinalDe(post(), { agentKey: "aura", nome: "Aura" })).toContain("— Aura · Zaeon");
  });

  it("no X a assinatura sobrevive e o CORPO é que cede", () => {
    const longo = post({ rede: "x", texto: "a".repeat(400) });
    const final = textoFinalDe(longo, voz);
    expect(final.length).toBeLessThanOrEqual(LIMITE_TEXTO.x);
    expect(final).toContain("— Kekulé, Farmácia · Zaeon");
    expect(final).toContain("…");
  });

  it("cabeNaRede avisa antes de aprovar, sem barrar", () => {
    expect(cabeNaRede(post(), voz)).toBe(true);                        // 85 chars no LinkedIn (3.000)
    expect(cabeNaRede(post({ rede: "x" }), voz)).toBe(true);           // 85 + assinatura ainda cabe em 280
    expect(cabeNaRede(post({ rede: "x", texto: "a".repeat(260) }), voz)).toBe(false); // aí a assinatura empurra
  });

  it("cabeNaRede é exato no limite: a assinatura inteira + o corpo = o teto da rede", () => {
    const sufixo = "\n\n— Kekulé, Farmácia · Zaeon";
    const exato = "a".repeat(LIMITE_TEXTO.x - sufixo.length);
    expect(cabeNaRede({ rede: "x", texto: exato }, voz)).toBe(true);
    expect(textoFinalDe({ rede: "x", texto: exato }, voz)).toHaveLength(LIMITE_TEXTO.x);
    expect(cabeNaRede({ rede: "x", texto: `${exato}a` }, voz)).toBe(false);
  });
});

describe("fila · avaliarPublicacao", () => {
  it("caminho feliz devolve o texto que vai sair", () => {
    const v = avaliarPublicacao({ post: post(), voz, canal: canal(), agora: AGORA });
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.textoFinal).toContain("— Kekulé, Farmácia · Zaeon");
  });

  it("só `aprovado` sai — nem rascunho, nem publicado de novo", () => {
    for (const estado of ["rascunho", "recusado", "publicado", "publicando", "falhou"]) {
      const v = avaliarPublicacao({ post: post({ estado }), voz, canal: canal(), agora: AGORA });
      expect(v.ok, estado).toBe(false);
    }
  });

  it("post de uma rede não sai por outra", () => {
    const v = avaliarPublicacao({ post: post({ rede: "x" }), voz, canal: canal(), agora: AGORA });
    expect(v).toMatchObject({ ok: false, classe: "capacidade" });
  });

  it("o canal é julgado ANTES do conteúdo (motivo mais acionável primeiro)", () => {
    // post com PII E canal pausado → devolve "pausado", não "pii_bloqueada":
    // arrumar o conteúdo não faria o post sair enquanto o kill-switch estiver puxado.
    const v = avaliarPublicacao({
      post: post({ texto: "fala com a aluna no 11 98765-4321" }),
      voz, canal: canal({ estado: "pausado" }), agora: AGORA,
    });
    expect(v).toMatchObject({ ok: false, classe: "pausado" });
  });

  it("teto do dia batido não deixa sair", () => {
    const v = avaliarPublicacao({ post: post(), voz, canal: canal({ enviadosHoje: 2 }), agora: AGORA });
    expect(v).toMatchObject({ ok: false, classe: "teto_dia" });
  });

  it("PII é HARD-BLOCK no texto final", () => {
    const v = avaliarPublicacao({ post: post({ texto: "dúvidas: joao.aluno@escola.com" }), voz, canal: canal(), agora: AGORA });
    expect(v).toMatchObject({ ok: false, classe: "pii_bloqueada" });
    if (!v.ok) expect(v.detalhe).toMatch(/e-?mail/i);
  });

  it("PII que entra pela ASSINATURA também é pega (o julgamento é do texto final)", () => {
    const v = avaliarPublicacao({
      post: post(), voz: { agentKey: "x", nome: "Fulano", area: "fulano@zaeon.com.br" },
      canal: canal(), agora: AGORA,
    });
    expect(v).toMatchObject({ ok: false, classe: "pii_bloqueada" });
  });

  it("a trava da aprovação vê o mesmo que a do envio", () => {
    const comPii = post({ texto: "CPF 529.982.247-25 pra conferir" });
    expect(motivoPiiNaAprovacao(comPii, voz)).toBeTruthy();
    expect(motivoPiiNaAprovacao(post(), voz)).toBeNull();
    const noEnvio = avaliarPublicacao({ post: comPii, voz, canal: canal(), agora: AGORA });
    expect(noEnvio).toMatchObject({ ok: false, classe: "pii_bloqueada" });
  });

  it("`proibidos` (nome de aluno) barra mesmo sem formato de PII", () => {
    const v = avaliarPublicacao({
      post: post({ texto: "o caso da Mariana Silva foi exemplar" }),
      voz, canal: canal(), agora: AGORA, pii: { proibidos: ["Mariana Silva"] },
    });
    expect(v).toMatchObject({ ok: false, classe: "pii_bloqueada" });
  });
});
