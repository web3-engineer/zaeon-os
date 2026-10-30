import { describe, it, expect, vi, afterEach } from "vitest";
import { comporMensagem, INSTRUCOES_ZAEON, mensagemPadrao, objetivoDa, retratoParaModelo } from "./template";
import { MARCA_NOME, vazouNome } from "./semNome";
import { disparosHfPrimario, historicoParaTerceiro } from "@/lib/llm/reservaHf";
import type { Contexto } from "./contexto";

const ctx: Contexto = {
  nome: "Ana", estudosRecentes: ["Mitose e meiose"], perguntasRecentes: ["o que é crossing-over?"], aulasConcluidas: [], aulasEmAndamento: [],
  trabalhos: [], agendaHoje: "", lembretesHoje: ["19:00 — estudar biologia"], prazos: [], revisoes: "", conversaWhatsApp: [], respondeuDesdeUltimaProativa: false,
};

describe("template da Zaeon", () => {
  it("as instruções do harness carregam a proatividade e a regra da rotina", () => {
    expect(INSTRUCOES_ZAEON).toMatch(/PROATIVIDADE/);
    expect(INSTRUCOES_ZAEON).toMatch(/não tem lembretes nem agenda, você NÃO sabe quando ela estuda/);
    expect(INSTRUCOES_ZAEON).toMatch(/Nunca invente/);
  });
  it("cada momento tem seu objetivo (aula do dia, check-in, resumo + condensado, descoberta)", () => {
    expect(objetivoDa({ tipo: "momento", momento: "manha", chave: "k" })).toMatch(/aula do dia/);
    expect(objetivoDa({ tipo: "momento", momento: "tarde", chave: "k" })).toMatch(/CHECK-IN/);
    expect(objetivoDa({ tipo: "momento", momento: "noite", chave: "k" })).toMatch(/CONDENSADO/);
    expect(objetivoDa({ tipo: "descoberta", chave: "k", tentativa: 3 })).toMatch(/tentativa 3/);
  });
  it("usa o modelo com o retrato real da pessoa no prompt", async () => {
    const gerar = vi.fn(async () => ({ mensagem: "Bom dia, Ana! Hoje a aula do dia é crossing-over..." }));
    const r = await comporMensagem({ tipo: "momento", momento: "manha", chave: "k" }, ctx, gerar);
    expect(r).toEqual({ texto: "Bom dia, Ana! Hoje a aula do dia é crossing-over...", doModelo: true });
    const { user, system } = (gerar.mock.calls[0] as any)[0];
    expect(system).toContain("JSON");
    expect(user).toContain("Mitose e meiose");
    expect(user).toContain("19:00 — estudar biologia");
  });
  it("modelo falhou ou veio vazio → mensagem padrão útil (nunca fica muda)", async () => {
    const r1 = await comporMensagem({ tipo: "descoberta", chave: "k", tentativa: 1 }, ctx, async () => { throw new Error("429"); });
    expect(r1.doModelo).toBe(false);
    expect(r1.texto).toMatch(/seg a sex 19h/);
    const r2 = await comporMensagem({ tipo: "lembrete", lembrete: { id: "l", texto: "revisar", minutos: 600, dias: [], ativo: true }, chave: "k" }, ctx, async () => ({ mensagem: "ok" }));
    expect(r2.texto).toMatch(/revisar/);
    expect(mensagemPadrao({ tipo: "momento", momento: "noite", chave: "k" }, ctx)).toMatch(/Mitose e meiose/);
  });
});

describe("HF primário nos disparos (DISPAROS_HF, decisão do dono 2026-10-30)", () => {
  const comHistorico: Contexto = {
    ...ctx,
    conversaWhatsApp: [{ de: "aluno", texto: "oi Ana aqui, travei na meiose" }, { de: "zaeon", texto: "Bom dia, Ana!" }],
  };
  const original = { ...process.env };
  const comEnv = async (env: Record<string, string | undefined>, c: Contexto = comHistorico) => {
    Object.assign(process.env, env);
    const gerar = vi.fn(async (_req: { system: string; user: string }) => ({ mensagem: `Bom dia, ${MARCA_NOME}! Topa revisar meiose?` }));
    const r = await comporMensagem({ tipo: "momento", momento: "manha", chave: "k" }, c, gerar);
    return { r, req: gerar.mock.calls[0][0] };
  };
  afterEach(() => { process.env = { ...original }; });

  it("LIGADO: o nome do aluno NÃO sai no prompt — nem na linha Nome:, nem no histórico", async () => {
    const { req } = await comEnv({ HF_TOKEN: "hf_x", DISPAROS_HF: "1" });
    expect(req.user).not.toMatch(/\bAna\b/);
    expect(req.user).toContain(MARCA_NOME);
    expect(req.system).toContain(MARCA_NOME);          // o modelo é instruído a usar a marca
    expect(vazouNome(req.user, "Ana")).toBe(false);
    expect(vazouNome(req.system, "Ana")).toBe(false);
  });

  it("LIGADO: o aluno recebe a mensagem COM o nome dele (a marca é reposta na volta)", async () => {
    const { r } = await comEnv({ HF_TOKEN: "hf_x", DISPAROS_HF: "1" });
    expect(r).toEqual({ texto: "Bom dia, Ana! Topa revisar meiose?", doModelo: true });
    expect(r.texto).not.toContain(MARCA_NOME);
  });

  it("LIGADO: o conteúdo útil continua indo (não é redação cega)", async () => {
    const { req } = await comEnv({ HF_TOKEN: "hf_x", DISPAROS_HF: "1" });
    expect(req.user).toContain("Mitose e meiose");
    expect(req.user).toContain("19:00 — estudar biologia");
    expect(req.user).toContain("travei na meiose");    // o histórico vai, por default
  });

  it("DESLIGADO (default): nada muda — o retrato vai inteiro, com nome, como sempre foi", async () => {
    const { req, r } = await comEnv({ HF_TOKEN: "hf_x", DISPAROS_HF: undefined });
    expect(req.user).toContain("Nome: Ana");
    expect(req.user).not.toContain(MARCA_NOME);
    expect(req.system).not.toContain(MARCA_NOME);
    // a marca que o modelo inventou sem a gente pedir ainda assim não chega no aluno
    expect(r.texto).toBe("Bom dia, Ana! Topa revisar meiose?");
  });

  it("sem HF_TOKEN a flag não faz nada — não existe HF pra ser primário", async () => {
    const { req } = await comEnv({ HF_TOKEN: undefined, DISPAROS_HF: "1" });
    expect(req.user).toContain("Nome: Ana");
    expect(disparosHfPrimario({ DISPAROS_HF: "1" })).toBe(false);
    expect(disparosHfPrimario({ DISPAROS_HF: "1", HF_TOKEN: "hf_x" })).toBe(true);
  });

  it("DISPAROS_HF_SEM_HISTORICO=1 corta a conversa do aluno (e só ela)", async () => {
    const { req } = await comEnv({ HF_TOKEN: "hf_x", DISPAROS_HF: "1", DISPAROS_HF_SEM_HISTORICO: "1" });
    expect(req.user).not.toContain("travei na meiose");
    expect(req.user).not.toContain("Últimas mensagens no WhatsApp");
    expect(req.user).toContain("Mitose e meiose");     // o resto do retrato fica
    expect(historicoParaTerceiro({ DISPAROS_HF_SEM_HISTORICO: "1" })).toBe(false);
    expect(historicoParaTerceiro({})).toBe(true);      // default: mantém
  });

  it("sem nome no cadastro, nenhuma marca chega no aluno", async () => {
    const { r, req } = await comEnv({ HF_TOKEN: "hf_x", DISPAROS_HF: "1" }, { ...comHistorico, nome: null });
    expect(req.system).not.toContain(MARCA_NOME);      // nada a esconder → nada a explicar
    expect(r.texto).not.toContain(MARCA_NOME);
    expect(r.texto).toBe("Bom dia! Topa revisar meiose?");
  });

  it("retratoParaModelo é puro e explícito nas duas dimensões", () => {
    const comNome = retratoParaModelo(comHistorico, { terceiro: false, historico: true });
    expect(comNome).toContain("Nome: Ana");
    const semNomeComHist = retratoParaModelo(comHistorico, { terceiro: true, historico: true });
    expect(semNomeComHist).not.toMatch(/\bAna\b/);
    expect(semNomeComHist).toContain("travei na meiose");
    const semTudo = retratoParaModelo(comHistorico, { terceiro: true, historico: false });
    expect(semTudo).not.toContain("travei na meiose");
  });
});

describe("formato WhatsApp (visto no dry-run em prod)", () => {
  it("o **negrito** do markdown vira *negrito* do WhatsApp", async () => {
    const r = await comporMensagem({ tipo: "momento", momento: "manha", chave: "k" }, ctx, async () => ({ mensagem: "A função **Sigmoid** espreme números.\n### Hoje\n- revisar" }));
    expect(r.texto).toBe("A função *Sigmoid* espreme números.\n*Hoje*\n• revisar");
  });
});
