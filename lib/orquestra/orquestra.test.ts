import { describe, it, expect, vi, beforeEach } from "vitest";

const runTrajectoryTraced = vi.fn();
vi.mock("@/lib/agent/trajectory", () => ({ runTrajectoryTraced: (...a: unknown[]) => runTrajectoryTraced(...a) }));

import { criarPrazo } from "@/lib/orquestra/prazo";
import { criarCaixa } from "@/lib/orquestra/ferramentas";
import { compactar, rodarAgente } from "@/lib/orquestra/react";
import { rodarEnxame, emParalelo, lerPartes } from "@/lib/orquestra/enxame";
import { normalizarCitacoes, revisarGlobal, verificarCitacoes } from "@/lib/orquestra/verificador";
import { paraStructuredAnswer, renumerar, separarSecoes } from "@/lib/orquestra/formatar";
import { decidir, escolherMotor, modoOrquestra } from "@/lib/orquestra/roteador";
import { MOTORES_NATIVOS, enxameMisto, kimiEnxame, motoresHttpDoEnv, motorHttp, trabalhadoresMistos } from "@/lib/orquestra/motores";
import { orquestrarTurno } from "@/lib/orquestra/orquestrador";
import { planoDe } from "@/lib/orquestra/plano";
import type { ChamarModelo, PedidoModelo, RespostaModelo } from "@/lib/orquestra/provedores";
import type { Evidencia, Execucao, Tarefa } from "@/lib/orquestra/contrato";
import type { ToolDef } from "@/lib/agent/runtime";

const USO = { promptTokens: 100, completionTokens: 50, cachedTokens: 0, totalTokens: 150, reportado: true };
const resp = (conteudo: string, chamadas: RespostaModelo["chamadas"] = [], modelo = "kimi-k2.6"): RespostaModelo =>
  ({ conteudo, chamadas, uso: USO, modelo, provedor: "moonshot", ms: 5, cortada: false });
const chamada = (nome: string, args: unknown, id = `c-${Math.random()}`) => ({ id, nome, args, bruto: JSON.stringify(args) });

const toolBusca: ToolDef = {
  name: "literature_search", risk: "read", runtime: "ts", minPlan: "free",
  schema: { name: "literature_search", description: "busca papers", parameters: { type: "OBJECT" as any, properties: { query: { type: "STRING" as any } } } },
  run: async () => ({ ok: true, provenance: {} }),
};
function caixaFalsa() {
  return criarCaixa({ plan: "free", execMode: "auto" } as any, {
    ferramentasDoTurno: () => [toolBusca],
    executarTool: async (_n, a: any) => ({
      ok: true, provenance: {},
      findings: [{ claim: `achado sobre ${a.query}`, source: { title: `Paper ${a.query}`, url: `https://doi.org/${encodeURIComponent(a.query)}`, year: 2025, authors: "Silva, Ana" }, confidence: "alta" as const }],
    }),
  });
}
const tarefa = (extra: Partial<Tarefa> = {}): Tarefa => ({
  id: "b".repeat(24), objetivo: "Escreva um artigo sobre edição genética em plantas", intent: "criar_trabalho", kind: "artigo",
  historico: [], plano: "max", ...extra,
});
function execucao(chamar: ChamarModelo, extra: Partial<Execucao> = {}): Execucao & { eventos: string[] } {
  const eventos: string[] = [];
  return {
    prazo: criarPrazo(120_000), caixa: caixaFalsa(), chamar, env: {}, maxSubagentes: 6,
    ledger: { agentKey: "aura", surface: "estudos" }, emitir: (e) => eventos.push(`${e.fase}|${e.rotulo}`), eventos, ...extra,
  };
}

/** o enxame inteiro roteirizado: orquestrador delega 3 partes; cada subagente busca e reporta; o orquestrador sintetiza */
function roteiroDoEnxame(): ChamarModelo & { pedidos: PedidoModelo[] } {
  const pedidos: PedidoModelo[] = [];
  const f = (async (p: PedidoModelo) => {
    pedidos.push(p);
    const ultima = p.mensagens[p.mensagens.length - 1];
    if (p.ledger.phase === "subagente") {
      if (ultima.role === "user" && !p.mensagens.some((m) => m.role === "tool")) {
        return resp("", [chamada("literature_search", { query: String((ultima as any).content).slice(0, 20) })], p.modelo);
      }
      const chave = String((ultima as any).content).match(/\[E\d+\]/)?.[0] ?? "";
      return resp(`Relatório: achei algo ${chave}.`, [], p.modelo);
    }
    // orquestrador
    if (!p.mensagens.some((m) => m.role === "tool")) {
      return resp("", [chamada("delegar", { tarefas: [
        { titulo: "Histórico", instrucao: "historico CRISPR" },
        { titulo: "Métodos", instrucao: "metodos CRISPR" },
        { titulo: "Ética", instrucao: "etica CRISPR" },
      ] })]);
    }
    return resp("Resumo do artigo com base em [E1] e [E2, E3].\n\n## Introdução\nTexto da introdução bem fundamentado [E1] e uma chave inventada [E99].\n\n## Conclusão\nFecho [E3].");
  }) as ChamarModelo & { pedidos: PedidoModelo[] };
  f.pedidos = pedidos;
  return f;
}

describe("react · um agente com function-calling nativo", () => {
  it("chama ferramenta, observa e conclui", async () => {
    let n = 0;
    const chamar: ChamarModelo = async () => (++n === 1 ? resp("", [chamada("literature_search", { query: "fotossintese" })]) : resp("Resposta final [E1]."));
    const x = execucao(chamar);
    const r = await rodarAgente({ nome: "DeepSeek", modelo: "deepseek-v4-pro", sistema: "s", pedido: "p", maxPassos: 5, fase: "orquestra", taskId: "t" }, x);
    expect(r.texto).toBe("Resposta final [E1].");
    expect(r.forcado).toBe(false);
    expect(r.chamadasDeFerramenta).toBe(1);
    expect(r.uso.chamadas).toBe(2);
    expect(x.eventos).toContain("ferramenta|literature_search: fotossintese");
  });

  it("no teto de passos, conclui à força SEM ferramentas", async () => {
    const pedidos: PedidoModelo[] = [];
    const chamar: ChamarModelo = async (p) => { pedidos.push(p); return p.ferramentas ? resp("", [chamada("literature_search", { query: `q${pedidos.length}` })]) : resp("fechei"); };
    const r = await rodarAgente({ nome: "a", modelo: "kimi-k2.6", sistema: "s", pedido: "p", maxPassos: 2, fase: "f", taskId: "t" }, execucao(chamar));
    expect(r.forcado).toBe(true);
    expect(r.texto).toBe("fechei");
    expect(pedidos.at(-1)!.ferramentas).toBeUndefined();
  });

  it("compactar mantém a estrutura e as linhas de evidência das observações antigas", () => {
    const msgs: any[] = [{ role: "system", content: "s" }, { role: "user", content: "u" }];
    for (let i = 1; i <= 6; i++) {
      msgs.push({ role: "assistant", content: null, tool_calls: [{ id: `c${i}`, type: "function", function: { name: "x", arguments: "{}" } }] });
      msgs.push({ role: "tool", tool_call_id: `c${i}`, content: `Resultados:\n[E${i}] claim ${"x".repeat(500)}\nlixo` });
    }
    const c = compactar(msgs, 2);
    expect(c).toHaveLength(msgs.length);
    expect(c[3].content).toMatch(/^\[compactado\] evidências desta consulta:\n\[E1\]/);
    expect(c[3].content).not.toContain("lixo");
    expect(c.at(-1)!.content).toContain("lixo"); // as recentes ficam inteiras
  });
});

describe("enxame · o runtime da Zaeon", () => {
  it("orquestrador delega, subagentes rodam em paralelo com rodízio de laboratórios, evidência é compartilhada", async () => {
    const chamar = roteiroDoEnxame();
    const x = execucao(chamar);
    const r = await rodarEnxame(tarefa(), x, { nome: "Misto", orquestrador: "kimi-k2.6", trabalhadores: ["deepseek-v4-flash", "tongyi-deepresearch"] });
    expect(r.subagentes).toBe(3);
    expect(r.evidencias.map((e) => e.chave)).toEqual(["E1", "E2", "E3"]);
    const modelosSub = chamar.pedidos.filter((p) => p.ledger.phase === "subagente").map((p) => p.modelo);
    expect(new Set(modelosSub)).toEqual(new Set(["deepseek-v4-flash", "tongyi-deepresearch"]));
    // contexto ISOLADO: o subagente não recebe o pedido do aluno como mensagem, só a parte dele
    const sub = chamar.pedidos.find((p) => p.ledger.phase === "subagente")!;
    expect((sub.mensagens[1] as any).content).toMatch(/CRISPR/);
    expect(x.eventos.some((e) => e.startsWith("enxame|Misto criou 3 subagentes"))).toBe(true);
    expect(r.texto).toContain("## Introdução");
  });

  it("respeita o teto de subagentes do plano", () => {
    expect(lerPartes({ tarefas: [{ titulo: "a" }, { titulo: "b" }, { titulo: "c" }] }, 2)).toHaveLength(2);
    expect(lerPartes({ tarefas: "nada" }, 5)).toEqual([]);
  });

  it("emParalelo limita a concorrência e preserva a ordem", async () => {
    let ativos = 0, pico = 0;
    const fns = [30, 10, 20, 5].map((ms, i) => async () => { ativos++; pico = Math.max(pico, ativos); await new Promise((r) => setTimeout(r, ms)); ativos--; return i; });
    expect(await emParalelo(fns, 2)).toEqual([0, 1, 2, 3]);
    expect(pico).toBe(2);
  });
});

describe("verificador · portão de citação", () => {
  const ev: Evidencia[] = [1, 2, 3].map((i) => ({ chave: `E${i}`, claim: `c${i}`, ferramenta: "t", agente: "a", source: { title: `T${i}` } }));

  it("normaliza [E1, E2] e CORTA chave que não existe", () => {
    expect(normalizarCitacoes("x [E1, E2; E3]")).toBe("x [E1][E2][E3]");
    const v = verificarCitacoes("Afirmação [E1] e outra [E99].", ev);
    expect(v.texto).toBe("Afirmação [E1] e outra.");
    expect(v.invalidas).toEqual(["E99"]);
    expect(v.citadas).toEqual(["E1"]);
  });

  it("cobertura conta parágrafos substantivos com fonte", () => {
    const longo = "x".repeat(130);
    expect(verificarCitacoes(`${longo} [E1]\n\n${longo}`, ev).cobertura).toBe(0.5);
  });

  it("verificador global: aprovado não revisa; reprovado revisa uma vez; fora do ar não derruba", async () => {
    const x = execucao(async () => resp('{"aprovado": true, "problemas": []}'));
    expect((await revisarGlobal("t [E1]", ev, x, { modelo: "deepseek-v4-flash", taskId: "t", objetivo: "o" })).revisou).toBe(false);

    let n = 0;
    const x2 = execucao(async () => (++n === 1 ? resp('{"aprovado": false, "problemas": ["sem fonte no 2º parágrafo"]}') : resp("texto revisado e completo [E2] [E50]")));
    const g = await revisarGlobal("texto original curto [E1]", ev, x2, { modelo: "deepseek-v4-flash", taskId: "t", objetivo: "o" });
    expect(g.revisou).toBe(true);
    expect(g.veredito.invalidas).toEqual(["E50"]);

    const x3 = execucao(async () => { throw new Error("503"); });
    const g3 = await revisarGlobal("t [E1]", ev, x3, { modelo: "deepseek-v4-flash", taskId: "t", objetivo: "o" });
    expect(g3.aprovado).toBe(true);
    expect(g3.problemas[0]).toMatch(/indisponível/);
  });
});

describe("formatar · a resposta no formato da casa", () => {
  const ev: Evidencia[] = [
    { chave: "E1", claim: "c1", ferramenta: "literature_search", agente: "a", source: { title: "Paper Um", url: "https://doi.org/1", year: 2024, authors: "Silva, Ana" } },
    { chave: "E2", claim: "c2", ferramenta: "web_search", agente: "b", source: { title: "Site Dois", url: "https://x.org" } },
  ];
  it("renumera pela ordem de aparição", () => {
    expect(renumerar("b [E2] a [E1] b de novo [E2]", ev)).toMatchObject({ texto: "b [1] a [2] b de novo [1]" });
  });
  it("separa resumo e seções", () => {
    expect(separarSecoes("resumo\n\n## A\ncorpo a\n## B\ncorpo b")).toEqual({ resumo: "resumo", secoes: [{ title: "A", body: "corpo a" }, { title: "B", body: "corpo b" }] });
  });
  it("criar_trabalho vira work com seções + Referências ABNT, e provenance aponta o motor", () => {
    const a = paraStructuredAnswer("Resumo [E1].\n\n## Introdução\nTexto [E2].", ev, tarefa(), { motor: "kimi-enxame", modelos: ["kimi-k2.6"] });
    expect(a.nucleo).toBe("Resumo [1].");
    expect(a.work?.sections.map((s) => s.title)).toEqual(["Introdução", "Referências"]);
    expect(a.work?.sections[1].body).toContain("Paper Um");
    expect(a.referencias).toHaveLength(2);
    expect(a.provenance).toMatchObject({ by: "kimi-enxame", traceId: "b".repeat(24), model: "kimi-k2.6" });
  });
  it("explicação vira nucleo + desenvolvimento", () => {
    const a = paraStructuredAnswer("Direto [E1].\n\n## Mais\nDetalhe.", ev, tarefa({ intent: "explicar_conceito" }), { motor: "m", modelos: [] });
    expect(a.nucleo).toBe("Direto [1].");
    expect(a.desenvolvimento).toContain("## Mais");
    expect(a.work).toBeUndefined();
  });
});

describe("roteador · plano × formato da tarefa", () => {
  const envTodos = { DEEPSEEK_API_KEY: "a", MOONSHOT_API_KEY: "b", OPENROUTER_API_KEY: "c" };
  const base = { plano: "max" as const, intent: "criar_trabalho" as const, mode: "research" as const, emSegundoPlano: true, trabalhoGeradoNoCliente: false };

  it("flag", () => {
    expect(modoOrquestra({})).toBe("off");
    expect(modoOrquestra({ ORQUESTRA: "sombra" })).toBe("sombra");
    expect(modoOrquestra({ ORQUESTRA: "on" })).toBe("on");
  });
  it("MAX + trabalho → enxame (Kimi primeiro), 12 subagentes, verificador global", () => {
    expect(decidir(base, envTodos, [...MOTORES_NATIVOS])).toMatchObject({ motor: "kimi-enxame", formato: "enxame", maxSubagentes: 12, verificadorGlobal: true });
  });
  it("PRO + trabalho → equipe pequena; PRO + revisar → profundo", () => {
    expect(decidir({ ...base, plano: "pro" }, envTodos, [...MOTORES_NATIVOS])).toMatchObject({ formato: "enxame", maxSubagentes: 4, verificadorGlobal: false });
    expect(decidir({ ...base, plano: "pro", intent: "revisar" }, envTodos, [...MOTORES_NATIVOS])).toMatchObject({ motor: "deepseek-v4-profundo" });
  });
  it("free/plus, conversa, inline e trabalho gerado no cliente ficam com a Aura", () => {
    expect(decidir({ ...base, plano: "plus" }, envTodos, [...MOTORES_NATIVOS]).motor).toBe("aura");
    expect(decidir({ ...base, intent: "duvida_rapida" }, envTodos, [...MOTORES_NATIVOS]).motor).toBe("aura");
    expect(decidir({ ...base, emSegundoPlano: false }, envTodos, [...MOTORES_NATIVOS]).motor).toBe("aura");
    expect(decidir({ ...base, trabalhoGeradoNoCliente: true }, envTodos, [...MOTORES_NATIVOS]).motor).toBe("aura");
    expect(decidir({ ...base, intent: "explicar_conceito", plano: "pro" }, envTodos, [...MOTORES_NATIVOS]).motor).toBe("aura");
  });
  it("sem chave de enxame, tarefa ampla ganha um agente profundo; sem chave nenhuma, Aura", () => {
    expect(decidir(base, { DEEPSEEK_API_KEY: "a" }, [...MOTORES_NATIVOS])).toMatchObject({ motor: "deepseek-v4-profundo", formato: "profundo" });
    expect(decidir(base, {}, [...MOTORES_NATIVOS]).motor).toBe("aura");
  });
  it("ORQ_SORTEIO testa o mercado: sorteia entre os disponíveis do formato", () => {
    const env = { ...envTodos, ORQ_SORTEIO: "1" };
    expect(escolherMotor("enxame", env, [...MOTORES_NATIVOS], () => 0.99)?.id).toBe("enxame-misto");
    expect(escolherMotor("enxame", env, [...MOTORES_NATIVOS], () => 0)?.id).toBe("kimi-enxame");
  });
  it("enxame misto precisa de ≥ 2 laboratórios", () => {
    expect(enxameMisto.disponivel({ MOONSHOT_API_KEY: "b" })).toBe(false);
    expect(trabalhadoresMistos(envTodos)).toEqual(["deepseek-v4-flash", "kimi-k2.6", "tongyi-deepresearch", "qwen"]);
    expect(kimiEnxame.disponivel({ OPENROUTER_API_KEY: "c" })).toBe(true); // Kimi também sai pelo OpenRouter
  });
  it("plano real da conta: pago vencido cai pra free", () => {
    expect(planoDe({ plan: "max", plusUntil: new Date(Date.now() + 864e5) })).toBe("max");
    expect(planoDe({ plan: "max", plusUntil: new Date(Date.now() - 864e5) })).toBe("free");
    expect(planoDe(null)).toBe("free");
  });
});

describe("motor HTTP · serviço Python que fala o contrato", () => {
  it("lê os motores do env", () => {
    expect(motoresHttpDoEnv({ RESEARCH_ENGINE_URL: "http://re:8002", ORQ_MOTORES_HTTP: "zaeon-sugestao:unico:zaeon,storm:profundo" }))
      .toMatchObject([{ id: "http:zaeon-sugestao", formato: "unico", origem: "zaeon" }, { id: "http:storm", formato: "profundo", origem: "outro" }]);
    expect(motoresHttpDoEnv({ ORQ_MOTORES_HTTP: "x" })).toEqual([]);
  });
  it("junta evidência antes, manda no contrato e remapeia chave nova", async () => {
    const fetchImpl = vi.fn(async (_u: string, init: any) => {
      const corpo = JSON.parse(init.body);
      expect(corpo.evidencias[0].chave).toBe("E1");
      return new Response(JSON.stringify({
        motor: "zaeon-sugestao", texto: "Sugestão [E1] e [E7].", modelos: ["gemini-3.5-flash"], passos: 1, degradado: false,
        uso: { prompt_tokens: 10, completion_tokens: 5, chamadas: 1 },
        evidencias: [...corpo.evidencias, { chave: "E7", claim: "novo", source: { title: "Novo", url: "https://n" } }],
      }), { status: 200 });
    });
    const m = motorHttp({ id: "http:zaeon-sugestao", nome: "zaeon-sugestao", origem: "zaeon", formato: "unico", url: "http://re:8002" }, fetchImpl as any);
    const r = await m.rodar(tarefa(), execucao(async () => resp("")));
    expect(r.texto).toBe("Sugestão [E1] e [E2].");
    expect(r.evidencias.map((e) => e.chave)).toEqual(["E1", "E2"]);
  });
});

describe("orquestrador · a Zaeon decide quem trabalha", () => {
  const aura = { answer: { nucleo: "da Aura" }, state: { intent: "criar_trabalho", kind: "artigo", mode: "research", artifacts: [], degraded: false } };
  const classify = vi.fn(async () => ({ intent: "criar_trabalho" as const, mode: "research" as const, academicMode: "enforced" as any, kind: "artigo" as const }));
  const deps: any = { classify };
  const entrada = (extra: Record<string, unknown> = {}) => ({
    objetivo: "Escreva um artigo sobre CRISPR", hctx: { plan: "free", execMode: "auto" } as any, deps, userId: "u".repeat(24),
    emSegundoPlano: true, trabalhoGeradoNoCliente: false, history: [], ledger: { agentKey: "aura", surface: "estudos" as const },
    narrar: vi.fn(), plano: "max" as const, ...extra,
  });
  beforeEach(() => { runTrajectoryTraced.mockReset().mockResolvedValue(aura); classify.mockClear(); });

  it("ORQUESTRA off: o caminho de antes, byte a byte (nem classifica)", async () => {
    const r = await orquestrarTurno(entrada({ env: {} }));
    expect(r.answer.nucleo).toBe("da Aura");
    expect(runTrajectoryTraced).toHaveBeenCalledTimes(1);
    expect(classify).not.toHaveBeenCalled();
  });

  it("sombra: decide e loga, mas a Aura responde — e o classify é reaproveitado", async () => {
    await orquestrarTurno(entrada({ env: { ORQUESTRA: "sombra", MOONSHOT_API_KEY: "k" } }));
    expect(runTrajectoryTraced).toHaveBeenCalledTimes(1);
    const depsUsadas = runTrajectoryTraced.mock.calls[0][2];
    await depsUsadas.classify("x", {});
    expect(classify).toHaveBeenCalledTimes(1); // memo: a trajetória não paga o classify de novo
  });

  it("on + MAX + trabalho: o enxame entrega no formato da casa, com citação conferida", async () => {
    const narrar = vi.fn();
    const r = await orquestrarTurno(entrada({
      env: { ORQUESTRA: "on", MOONSHOT_API_KEY: "k", ORQ_VERIFICADOR: "0" },
      chamar: roteiroDoEnxame(), caixa: caixaFalsa(), narrar,
    }));
    expect(runTrajectoryTraced).not.toHaveBeenCalled();
    expect(r.relatorio).toMatchObject({ motor: "kimi-enxame", subagentes: 3, evidencias: 3, invalidas: 1 });
    expect(r.answer.work?.sections.map((s) => s.title)).toEqual(["Introdução", "Conclusão", "Referências"]);
    expect(JSON.stringify(r.answer)).not.toContain("E99");
    expect(r.servidoPor).toMatch(/Kimi K2\.6 · enxame \+ 3 subagentes/);
    expect(r.state.degraded).toBe(false);
    const progresso = narrar.mock.calls.map((c) => String(c[0])).join("");
    expect(progresso).toContain("assumiu este pedido");
    expect(progresso).toContain("criou 3 subagentes");
  });

  it("motor que falha: a Aura assume, com aviso no progresso", async () => {
    const narrar = vi.fn();
    const r = await orquestrarTurno(entrada({ env: { ORQUESTRA: "on", DEEPSEEK_API_KEY: "k" }, chamar: async () => { throw new Error("503 geral"); }, caixa: caixaFalsa(), narrar }));
    expect(r.answer.nucleo).toBe("da Aura");
    expect(narrar.mock.calls.map((c) => String(c[0])).join("")).toContain("não concluiu — a Aura assume");
  });

  it("aluno cancelou: não chama a Aura de consolação", async () => {
    const ctrl = new AbortController();
    ctrl.abort(new Error("saiu"));
    await expect(orquestrarTurno(entrada({ env: { ORQUESTRA: "on", DEEPSEEK_API_KEY: "k" }, chamar: async (p: PedidoModelo) => { throw p.prazo.signal.reason; }, caixa: caixaFalsa(), signal: ctrl.signal }))).rejects.toBeTruthy();
    expect(runTrajectoryTraced).not.toHaveBeenCalled();
  });

  it("orquestra lotada (ORQ_MAX_SIMULTANEAS): a Aura responde em vez de parar a fila do chat", async () => {
    let soltar!: () => void;
    const segura = new Promise<void>((r) => { soltar = r; });
    const lento: ChamarModelo = async () => { await segura; return resp("feito [E1]"); };
    const env = { ORQUESTRA: "on", DEEPSEEK_API_KEY: "k", ORQ_MAX_SIMULTANEAS: "1" };
    const primeiro = orquestrarTurno(entrada({ env, chamar: lento, caixa: caixaFalsa() }));
    await new Promise((r) => setTimeout(r, 5));
    const segundo = await orquestrarTurno(entrada({ env, chamar: lento, caixa: caixaFalsa() }));
    expect(segundo.answer.nucleo).toBe("da Aura");
    soltar();
    expect((await primeiro).relatorio?.motor).toBe("deepseek-v4-profundo");
  });

  it("plano free nem classifica: direto pra Aura", async () => {
    await orquestrarTurno(entrada({ env: { ORQUESTRA: "on", DEEPSEEK_API_KEY: "k" }, plano: "free" }));
    expect(classify).not.toHaveBeenCalled();
    expect(runTrajectoryTraced).toHaveBeenCalledTimes(1);
  });
});
