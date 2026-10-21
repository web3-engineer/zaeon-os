import { describe, it, expect, vi } from "vitest";
import {
  buildHarnessDeps,
  pickStudioKind,
  normalizeAnswer,
  renderStructuredAnswer,
  resolveHarnessOutput,
  pareceRecusa,
  isRetryableCode,
  ofertaDePlataforma,
  historicoNoOrcamento,
} from "./aura-harness";
import { INTENTS, type StructuredAnswer } from "./contracts";
import type { ToolContext } from "./runtime";
import { runTrajectoryTraced, type TrajectoryState } from "./trajectory";

const ctx: ToolContext = { activeTab: "estudos", plan: "free", execMode: "auto" };

// genJson "esperto" — devolve a forma certa por fase (subquestions/reasoning/draft), sem rede.
// Assinatura completa (3 params, Promise<any>) p/ ser atribuível a GenJson.
const smartGen = () =>
  vi.fn(async (system: string, _user?: string, _opts?: any): Promise<any> => {
    if (/subquestions/i.test(system)) return { subquestions: ["q1", "q2"] };
    if (/reasoning/i.test(system)) return { reasoning: "R" };
    return { nucleo: "N", conceitos: ["c"], proximos_passos: ["p"] };
  });

const stFor = (over: Partial<TrajectoryState> = {}): TrajectoryState =>
  ({
    objective: "explique entropia",
    intent: "explicar_conceito",
    mode: "elaborated",
    academicMode: "flexible",
    spec: INTENTS.explicar_conceito,
    iter: 1,
    evidence: [],
    artifacts: [],
    reasoning: "",
    ...over,
  }) as TrajectoryState;

describe("aura-harness · A2 retry (só nesta camada)", () => {
  it("retenta 1x em tool_timeout e sucede", async () => {
    const runToolImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, code: "tool_timeout", provenance: {} })
      .mockResolvedValueOnce({ ok: true, findings: [], provenance: {} });
    const deps = buildHarnessDeps(ctx, { genJson: smartGen(), runToolImpl, retryDelayMs: 0 });
    const res = await deps.runTool("literature_search", { query: "x" }, ctx);
    expect(res.ok).toBe(true);
    expect(runToolImpl).toHaveBeenCalledTimes(2);
  });

  it("NÃO retenta tool_denied (nem validação)", async () => {
    const runToolImpl = vi.fn().mockResolvedValue({ ok: false, code: "tool_denied", provenance: {} });
    const deps = buildHarnessDeps(ctx, { genJson: smartGen(), runToolImpl, retryDelayMs: 0 });
    const res = await deps.runTool("studio_generate", {}, ctx);
    expect(res.ok).toBe(false);
    expect(runToolImpl).toHaveBeenCalledTimes(1);
  });

  it("isRetryableCode: só timeout/network/rate", () => {
    expect(isRetryableCode("tool_timeout")).toBe(true);
    expect(isRetryableCode("network")).toBe(true);
    expect(isRetryableCode("rate_limited")).toBe(true);
    expect(isRetryableCode("tool_denied")).toBe(false);
    expect(isRetryableCode(undefined)).toBe(false);
  });
});

describe("aura-harness · A1 erro-como-observação", () => {
  it("falha de tool entra no prompt do draft seguinte", async () => {
    const genJson = smartGen();
    const runToolImpl = vi.fn().mockResolvedValue({ ok: false, code: "skill_offline", provenance: {} });
    const deps = buildHarnessDeps(ctx, { genJson, runToolImpl, retryDelayMs: 0 });
    await deps.runTool("literature_search", { query: "x" }, ctx); // registra observação
    await deps.draft(stFor());
    // o user-prompt do draft menciona a ferramenta que falhou ("Campos obrigatórios" é único do draft)
    const draftCall = genJson.mock.calls.find((c) => /Campos obrigat/i.test(String(c[0])));
    expect(draftCall).toBeTruthy();
    expect(String(draftCall![1])).toMatch(/literature_search/);
    expect(String(draftCall![1])).toMatch(/FALHARAM/);
  });

  it("draft resiliente: genJson estoura → nucleo amigável via messageForError (não erro cru)", async () => {
    const genJson = vi.fn(async () => { throw new Error("fetch failed ECONNREFUSED"); });
    const deps = buildHarnessDeps(ctx, { genJson, runToolImpl: vi.fn(), retryDelayMs: 0 });
    const answer = await deps.draft(stFor());
    expect(answer.nucleo).toMatch(/conex[ãa]o/i);
    expect(answer.nucleo).not.toMatch(/ECONNREFUSED/);
  });
});

describe("aura-harness · plan", () => {
  it("gerar_artefato → 1 step studio_generate com kind inferido", async () => {
    const deps = buildHarnessDeps(ctx, { genJson: smartGen() });
    const steps = await deps.plan(stFor({ intent: "gerar_artefato", mode: "elaborated", objective: "cria um mapa mental de fotossíntese" }));
    expect(steps).toHaveLength(1);
    expect(steps[0].tool).toBe("studio_generate");
    expect(steps[0].args.kind).toBe("mindmap");
  });

  // "molécula de serotonina" pedia kind=image de quando o viewer 3D não existia. Agora
  // existe (PubChem + 3Dmol), e uma estrutura química desenhada por modelo de imagem é
  // bonita e errada. O gate G1 continua valendo — mudou o kind certo, não a regra.
  it("gerar_artefato de molécula → studio_generate kind=molecule (gate G1 ponta-a-ponta)", async () => {
    const deps = buildHarnessDeps(ctx, { genJson: smartGen() });
    const steps = await deps.plan(stFor({ intent: "gerar_artefato", mode: "elaborated", objective: "gera a molécula de serotonina" }));
    expect(steps).toHaveLength(1);
    expect(steps[0].tool).toBe("studio_generate");
    expect(steps[0].args.kind).toBe("molecule");
  });

  it("gerar_artefato visual que NÃO é molécula → kind=image", async () => {
    const deps = buildHarnessDeps(ctx, { genJson: smartGen() });
    const steps = await deps.plan(stFor({ intent: "gerar_artefato", mode: "elaborated", objective: "faz uma ilustração da célula animal" }));
    expect(steps[0].args.kind).toBe("image");
  });

  it("criar_trabalho research → A6 sub-perguntas × tools de coleta", async () => {
    const genJson = smartGen();
    const deps = buildHarnessDeps(ctx, { genJson });
    const steps = await deps.plan(stFor({ intent: "criar_trabalho", mode: "research", academicMode: "enforced", spec: INTENTS.criar_trabalho, objective: "artigo sobre X" }));
    // gather tools de criar_trabalho = literature_search + web_search + memory_search; 2 sub-perguntas → 6 steps
    expect(steps.length).toBe(6);
    expect(steps.every((s) => s.tool === "literature_search" || s.tool === "memory_search" || s.tool === "web_search")).toBe(true);
  });
});

describe("aura-harness · helpers puros", () => {
  it("pickStudioKind reconhece os kinds", () => {
    expect(pickStudioKind("faz um mapa mental disso")).toBe("mindmap");
    expect(pickStudioKind("gera flashcards")).toBe("flashcards");
    expect(pickStudioKind("cria um podcast")).toBe("podcast");
    expect(pickStudioKind("me explica isso")).toBe("guide"); // default
    // Gate G1 (patch visual): pedidos visuais mapeiam pro kind `image` do Studio.
    expect(pickStudioKind("faz uma imagem da mitocôndria")).toBe("image");
    // MUDOU: molécula não é mais "image". Quando o G1 foi escrito, o viewer 3D não
    // existia e desenhar era o melhor que dava. Agora existe (PubChem + 3Dmol), e
    // estrutura química feita por gerador de imagem é bonita e errada.
    expect(pickStudioKind("gera a molécula de serotonina")).toBe("molecule");
    expect(pickStudioKind("desenha a estrutura química da cafeína")).toBe("molecule");
  });

  it("normalizeAnswer garante nucleo e coage arrays", () => {
    const a = normalizeAnswer({ conceitos: "x" as any }, stFor());
    expect(typeof a.nucleo).toBe("string");
    expect(a.nucleo.length).toBeGreaterThan(0);
    expect(Array.isArray(a.conceitos)).toBe(true);
  });

  it("renderStructuredAnswer inclui as seções preenchidas", () => {
    const a: StructuredAnswer = {
      nucleo: "núcleo",
      conceitos: ["A", "B"],
      proximos_passos: ["passo"],
      sources: [{ title: "Fonte", url: "http://x" }],
    };
    const txt = renderStructuredAnswer(a);
    expect(txt).toMatch(/núcleo/);
    expect(txt).toMatch(/Conceitos-chave/);
    expect(txt).toMatch(/Fontes/);
    expect(txt).toMatch(/Próximos passos/);
  });
});

describe("aura-harness · resolveHarnessOutput (protocolo do cliente)", () => {
  const base = { intent: "explicar_conceito", kind: undefined, artifacts: [] } as any;

  it("sem artefato → structured carregando o answer inteiro (render rico no cliente)", () => {
    const out = resolveHarnessOutput(base, { nucleo: "oi", conceitos: ["a"] }, "estudos", "obj");
    expect(out.mode).toBe("structured");
    if (out.mode === "structured") { expect(out.answer.nucleo).toBe("oi"); expect(out.answer.conceitos).toEqual(["a"]); }
  });

  it("explicar_conceito COM artefato → structured preservando artifacts[] (texto + artefato inline)", () => {
    const answer: StructuredAnswer = { nucleo: "N", artifacts: [{ studioKind: "image", title: "img" }] };
    const out = resolveHarnessOutput({ intent: "explicar_conceito", artifacts: answer.artifacts } as any, answer, "estudos", "obj");
    expect(out.mode).toBe("structured");
    if (out.mode === "structured") expect(out.answer.artifacts?.[0]?.studioKind).toBe("image");
  });

  it("artifacts só no state (answer sem o campo) → structured os herda", () => {
    const out = resolveHarnessOutput({ intent: "explicar_conceito", artifacts: [{ studioKind: "mindmap" }] } as any, { nucleo: "N" }, "estudos", "obj");
    expect(out.mode).toBe("structured");
    if (out.mode === "structured") expect(out.answer.artifacts?.[0]?.studioKind).toBe("mindmap");
  });

  // MUDOU DE PROPÓSITO: este teste congelava o comportamento antigo, em que pedir um
  // artefato TROCAVA a resposta por um toco ("Já te mostro aqui.") + cartão. O artefato
  // não é mais a resposta: o turno continua sendo texto e o artefato viaja junto.
  it("gerar_artefato → structured com o texto E o artefato, marcado como explícito", () => {
    const answer: StructuredAnswer = { nucleo: "Mapa mental é...", artifacts: [{ studioKind: "mindmap", title: "mapa" }] };
    const out = resolveHarnessOutput({ intent: "gerar_artefato", artifacts: answer.artifacts } as any, answer, "estudos", "mapa de X");
    expect(out.mode).toBe("structured");
    if (out.mode === "structured") {
      expect(out.answer.nucleo).toBe("Mapa mental é...");        // o texto sobrevive
      expect(out.answer.artifacts?.[0]?.studioKind).toBe("mindmap");
      expect(out.answer.artifacts?.[0]?.explicito).toBe(true);   // pedido → falha em voz alta
    }
  });

  it("artefato que nasceu do assunto NÃO é explícito", () => {
    const answer: StructuredAnswer = { nucleo: "N", artifacts: [{ studioKind: "molecule", title: "cafeína" }] };
    const out = resolveHarnessOutput({ intent: "explicar_conceito", artifacts: answer.artifacts } as any, answer, "estudos", "por que o café desperta");
    expect(out.mode).toBe("structured");
    if (out.mode === "structured") expect(out.answer.artifacts?.[0]?.explicito).toBeUndefined();
  });

  it("criar_trabalho na pesquisa → sentinela research", () => {
    const out = resolveHarnessOutput({ intent: "criar_trabalho", kind: "tcc", artifacts: [] } as any, { nucleo: "gerando" }, "pesquisa", "faz um tcc sobre X");
    expect(out.mode).toBe("research");
    if (out.mode === "research") expect(out.kind).toBe("tcc");
  });
});

describe("aura-harness · integração motor+adaptador (ponta-a-ponta, sem rede)", () => {
  // classify é sobrescrito p/ não bater na rede (o router real cairia no fallback, mas com latência).
  it("explicar_conceito → runTrajectory → saída estruturada", async () => {
    const runToolImpl = vi.fn(async () => ({ ok: true, findings: [{ claim: "f", source: { title: "S" }, confidence: "alta" as const }], provenance: {} }));
    const deps = buildHarnessDeps(ctx, { genJson: smartGen(), runToolImpl, retryDelayMs: 0 });
    deps.classify = async () => ({ intent: "explicar_conceito", mode: "elaborated", academicMode: "flexible" });
    const { answer, state } = await runTrajectoryTraced("explique entropia", ctx, deps);
    expect(answer.nucleo).toBeTruthy();
    expect(answer.provenance?.intent).toBe("explicar_conceito");
    // sem artefato, o harness entrega o StructuredAnswer inteiro (render rico no cliente)
    expect(resolveHarnessOutput(state, answer, "estudos", "explique entropia").mode).toBe("structured");
  });

  it("gerar_artefato → runTrajectory (studio_generate real) → structured com artefato junto", async () => {
    const deps = buildHarnessDeps(ctx, { genJson: smartGen(), retryDelayMs: 0 });
    deps.classify = async () => ({ intent: "gerar_artefato", mode: "elaborated", academicMode: "flexible" });
    const { answer, state } = await runTrajectoryTraced("cria um mapa mental de fotossíntese", ctx, deps);
    const out = resolveHarnessOutput(state, answer, "estudos", "cria um mapa mental de fotossíntese");
    expect(out.mode).toBe("structured");
    if (out.mode === "structured") {
      expect(out.answer.nucleo).toBeTruthy();
      expect(out.answer.artifacts?.[0]?.studioKind).toBe("mindmap");
    }
  });
});

describe("pickStudioKind · molécula não é imagem", () => {
  it("pedido de molécula vai pro viewer 3D, não pro gerador de imagem", () => {
    for (const t of [
      "mostra a molécula da cafeína",
      "qual a estrutura molecular da glicose",
      "me mostra a estrutura química do etanol",
      "quero ver a fórmula estrutural do benzeno",
    ]) {
      expect(pickStudioKind(t)).toBe("molecule");
    }
  });

  it("imagem continua sendo imagem", () => {
    expect(pickStudioKind("faz uma ilustração da fotossíntese")).toBe("image");
    expect(pickStudioKind("desenha uma figura de uma célula")).toBe("image");
  });

  it("diagrama/esquema/fluxograma agora é o diagrama INTERATIVO (archify), não imagem", () => {
    expect(pickStudioKind("gera um diagrama do ciclo de Krebs")).toBe("diagram");
    expect(pickStudioKind("faz um esquema de como funciona o DNS")).toBe("diagram");
    expect(pickStudioKind("monta um fluxograma da mitose")).toBe("diagram");
    expect(pickStudioKind("faz um mapa de estudo de genética")).toBe("mindmap"); // o cliente desenha com o archify
  });

  it("os outros artefatos não mudaram", () => {
    expect(pickStudioKind("faz um mapa mental disso")).toBe("mindmap");
    expect(pickStudioKind("cria flashcards")).toBe("flashcards");
    expect(pickStudioKind("me explica isso")).toBe("guide");
  });
});

describe("artifacts na resposta · o artefato nasce da explicação", () => {
  const st = { intent: "explicar_conceito", objective: "cafeína" } as any;

  it("preserva um ref de molécula (antes era descartado calado)", () => {
    const a = normalizeAnswer({ nucleo: "x", artifacts: [{ studioKind: "molecule", title: "cafeína" }] } as any, st);
    expect(a.artifacts?.[0]).toEqual({ studioKind: "molecule", title: "cafeína" });
  });

  it("descarta kind que o Studio não sabe montar", () => {
    const a = normalizeAnswer({ nucleo: "x", artifacts: [{ studioKind: "holograma", title: "x" }] } as any, st);
    expect(a.artifacts).toBeUndefined();
  });

  it("no máximo 2 — resposta não é galeria", () => {
    const muitos = Array.from({ length: 5 }, (_, i) => ({ studioKind: "image", title: `a${i}` }));
    const a = normalizeAnswer({ nucleo: "x", artifacts: muitos } as any, st);
    expect(a.artifacts?.length).toBe(2);
  });

  it("sem artifacts, o campo nem aparece", () => {
    expect(normalizeAnswer({ nucleo: "x" } as any, st).artifacts).toBeUndefined();
  });
});

describe("recusa não passa na frente do artefato", () => {
  it("reconhece o pedido de desculpas que o modelo às vezes redige", () => {
    expect(pareceRecusa("Infelizmente o Studio está com um contratempo técnico")).toBe(true);
    expect(pareceRecusa("Não consigo gerar a imagem da molécula agora")).toBe(true);
    expect(pareceRecusa("Desculpe, não posso fazer isso")).toBe(true);
  });
  it("não confunde texto normal com recusa", () => {
    expect(pareceRecusa("A cafeína bloqueia os receptores de adenosina")).toBe(false);
    expect(pareceRecusa("Olha só a estrutura dela")).toBe(false);
  });
});

describe("molécula que nasce do contexto", () => {
  const st = { intent: "explicar_conceito", objective: "café" } as any;

  it("substância citada NO TEXTO vira molécula sem ninguém pedir", () => {
    const a = normalizeAnswer(
      { nucleo: "O café te acorda por causa da cafeína.", substancias: ["cafeína"] } as any, st,
    );
    expect(a.artifacts?.[0]).toEqual({ studioKind: "molecule", title: "cafeína" });
  });

  it("substância que o modelo listou mas não falou NÃO vira artefato", () => {
    const a = normalizeAnswer({ nucleo: "Uma conversa sobre hábitos.", substancias: ["teobromina"] } as any, st);
    expect(a.artifacts).toBeUndefined();
  });

  it("só uma — resposta não é galeria", () => {
    const a = normalizeAnswer(
      { nucleo: "cafeína e teobromina", desenvolvimento: "as duas", substancias: ["cafeína", "teobromina"] } as any, st,
    );
    expect(a.artifacts?.length).toBe(1);
  });

  it("pedido explícito manda mais que a extração", () => {
    const a = normalizeAnswer(
      { nucleo: "glicose e cafeína", substancias: ["cafeína"], artifacts: [{ studioKind: "molecule", title: "glicose" }] } as any, st,
    );
    expect(a.artifacts?.[0].title).toBe("glicose");
  });
});


describe("ofertaDePlataforma · o cardápio de features não passa", () => {
  // O critério é QUEM FAZ. Plataforma como sujeito = oferta; aluno como sujeito = estudo.
  it("derruba a oferta em que a plataforma é o sujeito", () => {
    for (const p of [
      "Posso gerar um mapa mental disso pra você",
      "Quer que eu monte flashcards desse conteúdo?",
      "Vamos montar uma linha do tempo no Studio",
      "Que tal eu criar um podcast sobre o tema?",
      "Vou preparar um guia de estudos completo",
    ]) expect(ofertaDePlataforma(p)).toBe(true);
  });

  it("deixa passar o passo de estudo, mesmo citando o mesmo substantivo", () => {
    for (const p of [
      "Monte a linha do tempo da Revolução Francesa de cabeça e compare com o livro",
      "Desenhe o mapa mental no papel, sem consultar",
      "Faça flashcards à mão: escrever fixa mais que ler",
      "Reveja os conceitos de entropia antes de seguir",
      "Leia o capítulo 4 e volte com dúvidas",
    ]) expect(ofertaDePlataforma(p)).toBe(false);
  });

  it("o nome da sala nunca é conteúdo", () => {
    expect(ofertaDePlataforma("Abra o Studio")).toBe(true);
  });

  it("normalizeAnswer descarta os passos-propaganda e mantém os de estudo", () => {
    const a = normalizeAnswer(
      { nucleo: "N", proximos_passos: ["Posso gerar um mapa mental", "Refaça os exercícios 3 a 7"] } as any,
      { objective: "x" } as any,
    );
    expect(a.proximos_passos).toEqual(["Refaça os exercícios 3 a 7"]);
  });

  it("se TODOS os passos eram propaganda, o campo some (melhor vazio que vendedor)", () => {
    const a = normalizeAnswer(
      { nucleo: "N", proximos_passos: ["Quer que eu monte um podcast disso?", "Posso criar flashcards"] } as any,
      { objective: "x" } as any,
    );
    expect(a.proximos_passos).toBeUndefined();
  });
});

describe("historicoNoOrcamento · a conversa cabe inteira", () => {
  const turnos = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ role: i % 2 ? "model" : "user", text: `turno ${i}` }));

  it("com folga, leva TUDO (a janela velha cortava em 6)", () => {
    const linhas = historicoNoOrcamento(turnos(40));
    expect(linhas).toHaveLength(40);
    expect(linhas[0]).toContain("turno 0");
  });

  it("estourando o orçamento, quem sobrevive é o FIM da conversa", () => {
    const linhas = historicoNoOrcamento(turnos(40), 60);
    expect(linhas.length).toBeGreaterThan(0);
    expect(linhas[linhas.length - 1]).toContain("turno 39");
    expect(linhas.join("\n")).not.toContain("turno 0");
  });

  it("mantém a ordem cronológica mesmo montando de trás pra frente", () => {
    const linhas = historicoNoOrcamento(turnos(6));
    expect(linhas.map((l) => l.split(" ").pop())).toEqual(["0", "1", "2", "3", "4", "5"]);
  });

  it("ignora turno vazio e rotula os papéis", () => {
    const linhas = historicoNoOrcamento([
      { role: "user", text: "oi" },
      { role: "model", text: "   " },
      { role: "model", text: "olá" },
    ]);
    expect(linhas).toEqual(["Usuário: oi", "Aura: olá"]);
  });
});


describe("destaques · expressões viram objeto da página", () => {
  const st = { objective: "x" } as any;

  it("extrai LaTeX e o rótulo", () => {
    const a = normalizeAnswer(
      { nucleo: "N", expressoes: [{ latex: "E = mc^2", rotulo: "energia de repouso" }] } as any, st);
    expect(a.destaques).toEqual([{ latex: "E = mc^2", rotulo: "energia de repouso" }]);
  });

  it("tira os cifrões que o modelo insiste em mandar", () => {
    const a = normalizeAnswer({ nucleo: "N", expressoes: [{ latex: "$$C_8H_{10}N_4O_2$$" }] } as any, st);
    expect(a.destaques?.[0]?.latex).toBe("C_8H_{10}N_4O_2");
  });

  it("descarta entrada sem latex e corta em 3", () => {
    const a = normalizeAnswer({ nucleo: "N", expressoes: [
      { latex: "a" }, { rotulo: "sem latex" }, { latex: "  " }, { latex: "b" }, { latex: "c" }, { latex: "d" },
    ] } as any, st);
    expect(a.destaques?.map((d) => d.latex)).toEqual(["a", "b", "c"]);
  });

  it("sem expressões, o campo não existe (melhor ausente que vazio)", () => {
    expect(normalizeAnswer({ nucleo: "N" } as any, st).destaques).toBeUndefined();
  });

  it("rótulo longo é cortado — legenda é legenda, não parágrafo", () => {
    const a = normalizeAnswer({ nucleo: "N", expressoes: [{ latex: "x", rotulo: "l".repeat(80) }] } as any, st);
    expect(a.destaques?.[0]?.rotulo?.length).toBe(40);
  });
});

describe("base de conhecimento (RAG) · entra no prompt e sai citada", () => {
  const trecho = {
    trechoId: "t1", documentoId: "d1", titulo: "Apostila 3", texto: "Entropia é dispersão de energia.",
    paginaIni: 4, paginaFim: 5, score: 0.03, similaridade: 0.7, porTexto: false,
  };
  const baseOk = { status: "ok" as const, trechos: [trecho] };
  const draftDe = (genJson: ReturnType<typeof smartGen>) =>
    genJson.mock.calls.find((c) => /Campos obrigat/i.test(String(c[0])))!;

  it("ok: o bloco vai no user do draft (depois do preâmbulo, antes do Objetivo) e o schema ganha citacoes_base", async () => {
    const genJson = smartGen();
    const deps = buildHarnessDeps(ctx, { genJson, baseConhecimento: baseOk, systemContext: "CTX" });
    await deps.draft(stFor());
    const [sys, user] = draftDe(genJson);
    expect(String(user)).toContain("[B1] Apostila 3, p. 4–5");
    const u = String(user);
    expect(u.indexOf("CTX")).toBeLessThan(u.indexOf("[B1]"));
    expect(u.indexOf("[B1]")).toBeLessThan(u.indexOf("Objetivo:"));
    expect(String(sys)).toContain("citacoes_base");
  });

  it("ok: o reason também enxerga a base", async () => {
    const genJson = smartGen();
    const deps = buildHarnessDeps(ctx, { genJson, baseConhecimento: baseOk });
    await deps.reason(stFor());
    const reasonCall = genJson.mock.calls.find((c) => /reasoning/i.test(String(c[0])))!;
    expect(String(reasonCall[1])).toContain("[B1]");
  });

  it("modelo cita [1] ⇒ fontesBase + rodapé no nucleo", async () => {
    const genJson = vi.fn(async (system: string): Promise<any> =>
      /Campos obrigat/i.test(system) ? { nucleo: "x", citacoes_base: [1] } : { reasoning: "R" });
    const deps = buildHarnessDeps(ctx, { genJson, baseConhecimento: baseOk });
    const answer = await deps.draft(stFor());
    expect(answer.fontesBase?.[0]?.titulo).toBe("Apostila 3");
    expect(answer.nucleo).toContain("**Da sua base:** Apostila 3 (p. 4–5)");
    expect((answer as any).citacoes_base).toBeUndefined();
  });

  it("draft falhou ⇒ sem rodapé da base", async () => {
    const genJson = vi.fn(async () => { throw new Error("fetch failed ECONNREFUSED"); });
    const deps = buildHarnessDeps(ctx, { genJson, baseConhecimento: baseOk });
    const answer = await deps.draft(stFor());
    expect(answer.fontesBase).toBeUndefined();
    expect(answer.nucleo).not.toContain("Da sua base");
  });

  it("sem_base: avisa no user, mas o schema NÃO ganha citacoes_base", async () => {
    const genJson = smartGen();
    const deps = buildHarnessDeps(ctx, { genJson, baseConhecimento: { status: "sem_base", trechos: [] } });
    await deps.draft(stFor());
    const [sys, user] = draftDe(genJson);
    expect(String(user)).toContain("ainda não tem material");
    expect(String(sys)).not.toContain("citacoes_base");
  });

  it("paridade: sem baseConhecimento o prompt é o de antes", async () => {
    const genJson = smartGen();
    const deps = buildHarnessDeps(ctx, { genJson });
    await deps.draft(stFor());
    const [sys, user] = draftDe(genJson);
    expect(String(user)).not.toContain("BASE DE CONHECIMENTO");
    expect(String(user).startsWith("Objetivo:")).toBe(true);
    expect(String(sys)).not.toContain("citacoes_base");
  });
});
