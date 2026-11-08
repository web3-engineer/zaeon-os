import { describe, it, expect, beforeEach } from "vitest";
import {
  carregarThreads, salvarThreads, criarThread, fecharThread, renomearThread,
  tituloAPartirDe, chaveDaThread, carregarMensagens, salvarMensagens,
  threadAtiva, marcarAtiva, CHAVE_INDICE, CHAVE_LEGADA, MAX_ABAS, TITULO_PADRAO,
  ESCOPO_PESQUISA, ESCOPO_COWORK, criarSubThread, arvoreDeThreads,
  type Armazem,
} from "./threads";

function armazemFalso(inicial: Record<string, string> = {}): Armazem & { dados: Record<string, string> } {
  const dados = { ...inicial };
  return {
    dados,
    getItem: (k: string) => (k in dados ? dados[k] : null),
    setItem: (k: string, v: string) => { dados[k] = v; },
    removeItem: (k: string) => { delete dados[k]; },
  };
}

/** Armazém que recusa tudo — aba anônima, cota estourada. */
const armazemQuebrado: Armazem = {
  getItem: () => { throw new Error("nope"); },
  setItem: () => { throw new Error("nope"); },
  removeItem: () => { throw new Error("nope"); },
};

describe("título da conversa", () => {
  it("sai da primeira frase, como toda IA faz", () => {
    expect(tituloAPartirDe("Me explica a cafeína. E depois a adenosina.")).toBe("Me explica a cafeína");
  });
  it("não corta no meio da palavra", () => {
    const original = "quero entender profundamente a estrutura molecular da cafeína hoje";
    const t = tituloAPartirDe(original);
    expect(t.endsWith("…")).toBe(true);
    // a propriedade real: o que sobrou é prefixo do original e termina onde havia espaço
    const base = t.slice(0, -1);
    expect(original.startsWith(base)).toBe(true);
    expect(original[base.length]).toBe(" ");
  });

  it("não deixa artigo pendurado no fim", () => {
    expect(tituloAPartirDe("quero entender profundamente a estrutura molecular")).not.toMatch(/\s(a|o|de|da)…$/);
  });
  it("texto vazio vira o padrão", () => {
    expect(tituloAPartirDe("   ")).toBe(TITULO_PADRAO);
  });
});

describe("migração da conversa antiga", () => {
  it("adota a thread legada como aba #1, com histórico e título", () => {
    const legado = [{ role: "user", text: "Me explica a cafeína" }, { role: "assistant", text: "..." }];
    const a = armazemFalso({ [CHAVE_LEGADA]: JSON.stringify(legado) });
    const threads = carregarThreads(a);
    expect(threads.length).toBe(1);
    expect(threads[0].titulo).toBe("Me explica a cafeína");
    // o histórico foi PRA aba — ninguém perde conversa por causa de refactor
    expect(carregarMensagens(a, threads[0].id)).toEqual(legado);
  });

  it("sem nada salvo, começa com uma aba vazia", () => {
    const a = armazemFalso();
    const threads = carregarThreads(a);
    expect(threads.length).toBe(1);
    expect(threads[0].titulo).toBe(TITULO_PADRAO);
  });

  it("não migra duas vezes", () => {
    const a = armazemFalso({ [CHAVE_LEGADA]: JSON.stringify([{ role: "user", text: "oi" }]) });
    const primeira = carregarThreads(a);
    const segunda = carregarThreads(a);
    expect(segunda.map((t) => t.id)).toEqual(primeira.map((t) => t.id));
  });
});

describe("abas", () => {
  let a: ReturnType<typeof armazemFalso>;
  beforeEach(() => { a = armazemFalso(); });

  it("a conversa nova entra na frente", () => {
    const base = carregarThreads(a);
    const { threads, nova } = criarThread(base);
    expect(threads[0].id).toBe(nova.id);
    expect(threads.length).toBe(2);
  });

  it("respeita o teto de abas", () => {
    let threads = carregarThreads(a);
    for (let i = 0; i < MAX_ABAS + 5; i++) threads = criarThread(threads).threads;
    expect(threads.length).toBe(MAX_ABAS);
  });

  it("fechar apaga o histórico daquela aba e só dela", () => {
    let threads = carregarThreads(a);
    const { threads: t2, nova } = criarThread(threads);
    salvarMensagens(a, nova.id, [{ role: "user", text: "some" }]);
    salvarMensagens(a, t2[1].id, [{ role: "user", text: "fica" }]);
    const { threads: t3 } = fecharThread(a, t2, nova.id);
    expect(a.dados[chaveDaThread(nova.id)]).toBeUndefined();
    expect(carregarMensagens(a, t3[0].id)).toEqual([{ role: "user", text: "fica" }]);
  });

  it("fechar a última cria outra — sala de conversa sem conversa é beco sem saída", () => {
    const threads = carregarThreads(a);
    const { threads: depois, proxima } = fecharThread(a, threads, threads[0].id);
    expect(depois.length).toBe(1);
    expect(proxima).toBe(depois[0].id);
    expect(depois[0].id).not.toBe(threads[0].id);
  });

  it("fechar a do meio foca a vizinha, não volta pro começo", () => {
    let threads = carregarThreads(a);
    threads = criarThread(threads, "A").threads;
    threads = criarThread(threads, "B").threads;
    const doMeio = threads[1].id;
    const { proxima } = fecharThread(a, threads, doMeio);
    expect(proxima).toBe(threads[2].id);
  });

  it("renomear ignora título vazio", () => {
    const threads = carregarThreads(a);
    expect(renomearThread(threads, threads[0].id, "   ")[0].titulo).toBe(TITULO_PADRAO);
    expect(renomearThread(threads, threads[0].id, " Cafeína ")[0].titulo).toBe("Cafeína");
  });

  it("a aba ativa sobrevive ao reload; aba morta cai na primeira", () => {
    const threads = carregarThreads(a);
    const { threads: t2, nova } = criarThread(threads);
    salvarThreads(a, t2);
    marcarAtiva(a, nova.id);
    expect(threadAtiva(a, t2)).toBe(nova.id);
    const { threads: t3 } = fecharThread(a, t2, nova.id);
    expect(threadAtiva(a, t3)).toBe(t3[0].id);
  });
});

describe("armazenamento indisponível (aba anônima)", () => {
  it("não derruba a sala: devolve uma aba em memória", () => {
    expect(() => carregarThreads(armazemQuebrado)).not.toThrow();
    expect(carregarThreads(armazemQuebrado).length).toBe(1);
  });
  it("salvar não lança", () => {
    expect(() => salvarMensagens(armazemQuebrado, "x", [1, 2])).not.toThrow();
  });
});

describe("escopo da Sala de Pesquisa", () => {
  it("adota a conversa antiga da Pesquisa como aba #1, sem tocar nas chaves da Aura", () => {
    const a = armazemFalso({
      [ESCOPO_PESQUISA.legada]: JSON.stringify([{ id: "1", role: "user", text: "Fale de energia solar. Obrigado" }]),
    });
    const lista = carregarThreads(a, ESCOPO_PESQUISA);
    expect(lista).toHaveLength(1);
    expect(lista[0].titulo).toBe("Fale de energia solar");
    expect(carregarMensagens(a, lista[0].id, ESCOPO_PESQUISA)).toHaveLength(1);
    expect(a.dados[CHAVE_INDICE]).toBeUndefined();   // índice da Aura intacto
  });

  it("conversas da Pesquisa e da Aura não se misturam", () => {
    const a = armazemFalso();
    const pesq = carregarThreads(a, ESCOPO_PESQUISA);
    const aura = carregarThreads(a, ESCOPO_COWORK);
    salvarMensagens(a, pesq[0].id, [{ id: "p" }], ESCOPO_PESQUISA);
    expect(carregarMensagens(a, aura[0].id)).toEqual([]);
    marcarAtiva(a, pesq[0].id, ESCOPO_PESQUISA);
    expect(threadAtiva(a, pesq, ESCOPO_PESQUISA)).toBe(pesq[0].id);
  });

  it("fechar apaga só o histórico do escopo certo", () => {
    const a = armazemFalso();
    const { threads, nova } = criarThread(carregarThreads(a, ESCOPO_PESQUISA));
    salvarMensagens(a, nova.id, [{ id: "x" }], ESCOPO_PESQUISA);
    fecharThread(a, threads, nova.id, ESCOPO_PESQUISA);
    expect(a.dados[chaveDaThread(nova.id, ESCOPO_PESQUISA)]).toBeUndefined();
  });
});

describe("sub-conversas (sub-temas do mesmo nicho)", () => {
  it("nasce logo abaixo da mãe, ligada a ela, com o contexto herdado", () => {
    let threads = criarThread(criarThread([], "Mãe").threads, "Outra").threads; // [Outra, Mãe]
    const mae = threads[1];
    const { threads: t2, nova } = criarSubThread(threads, mae.id, TITULO_PADRAO, "contexto do nicho");
    expect(nova.parentId).toBe(mae.id);
    expect(nova.contexto).toBe("contexto do nicho");
    expect(t2.map((t) => t.id)).toEqual([threads[0].id, mae.id, nova.id]);
  });

  it("um nível só: filha de filha vira irmã (mesma mãe)", () => {
    const { threads, nova: mae } = criarThread([], "Mãe");
    const { threads: t2, nova: filha } = criarSubThread(threads, mae.id);
    const { nova: neta } = criarSubThread(t2, filha.id);
    expect(neta.parentId).toBe(mae.id);
  });

  it("árvore: mães em ordem, filhas embaixo; órfã vira mãe", () => {
    const { threads, nova: mae } = criarThread([], "Mãe");
    const { threads: t2, nova: filha } = criarSubThread(threads, mae.id);
    const orfa = { ...filha, id: "orfa", parentId: "sumiu" };
    const arv = arvoreDeThreads([...t2, orfa]);
    expect(arv.map((n) => n.thread.id)).toEqual([mae.id, "orfa"]);
    expect(arv[0].filhas.map((f) => f.id)).toEqual([filha.id]);
  });

  it("fechar a mãe leva as filhas (e o histórico delas)", () => {
    const a = armazemFalso();
    const { threads, nova: mae } = criarThread(criarThread([], "Fica").threads, "Mãe");
    const { threads: t2, nova: filha } = criarSubThread(threads, mae.id);
    salvarMensagens(a, filha.id, [{ id: "x" }]);
    const { threads: t3, proxima } = fecharThread(a, t2, mae.id);
    expect(t3.map((t) => t.titulo)).toEqual(["Fica"]);
    expect(proxima).toBe(t3[0].id);
    expect(a.dados[chaveDaThread(filha.id)]).toBeUndefined();
  });

  it("fechar só a filha mantém a mãe", () => {
    const a = armazemFalso();
    const { threads, nova: mae } = criarThread([], "Mãe");
    const { threads: t2, nova: filha } = criarSubThread(threads, mae.id);
    expect(fecharThread(a, t2, filha.id).threads.map((t) => t.id)).toEqual([mae.id]);
  });
});

describe("#705 · rotulosDasThreads", () => {
  const t = (id: string, titulo: string, criadaEm: number) => ({ id, titulo, criadaEm, tocadaEm: criadaEm });
  it("nome único fica igual; repetido ganha a data", async () => {
    const { rotulosDasThreads } = await import("./threads");
    const r = rotulosDasThreads([t("a", "quero estudar…", Date.UTC(2026, 10, 1, 15)), t("b", "Quero estudar…", Date.UTC(2026, 10, 3, 15)), t("c", "java", 1)]);
    expect(r.get("c")).toBe("java");
    expect(r.get("a")).not.toBe(r.get("b"));
    expect(r.get("a")).toMatch(/^quero estudar… · \d\d\/\d\d$/);
    expect(r.get("b")).toMatch(/^Quero estudar… · \d\d\/\d\d$/);
  });
  it("repetidos do mesmo dia ganham também a hora", async () => {
    const { rotulosDasThreads } = await import("./threads");
    const r = rotulosDasThreads([t("a", "teste", Date.UTC(2026, 10, 1, 12, 0)), t("b", "teste", Date.UTC(2026, 10, 1, 13, 30))]);
    expect(r.get("a")).toMatch(/^teste · \d\d\/\d\d \d\d:\d\d$/);
    expect(r.get("b")).toMatch(/^teste · \d\d\/\d\d \d\d:\d\d$/);
    expect(r.get("a")).not.toBe(r.get("b"));
  });
});

describe("#728 · marcasDasThreads (a data fica fora do corte do nome)", () => {
  const t = (id: string, titulo: string, criadaEm: number) => ({ id, titulo, criadaEm, tocadaEm: criadaEm });
  it("só as repetidas ganham marca, e a marca é só a data", async () => {
    const { marcasDasThreads } = await import("./threads");
    const m = marcasDasThreads([t("a", "o que é fotossíntese", Date.UTC(2026, 10, 3, 15)), t("b", "O que é fotossíntese", Date.UTC(2026, 10, 5, 15)), t("c", "java", 1)]);
    expect(m.has("c")).toBe(false);
    expect(m.get("a")).toMatch(/^\d\d\/\d\d$/);
    expect(m.get("a")).not.toBe(m.get("b"));
  });
});

describe("#728 · mesmo minuto ganha os segundos", () => {
  it("duas no mesmo minuto ficam diferentes", async () => {
    const { marcasDasThreads } = await import("./threads");
    const t = (id: string, criadaEm: number) => ({ id, titulo: "teste", criadaEm, tocadaEm: criadaEm });
    const m = marcasDasThreads([t("a", Date.UTC(2026, 10, 1, 12, 0, 5)), t("b", Date.UTC(2026, 10, 1, 12, 0, 40))]);
    expect(m.get("a")).toMatch(/^\d\d\/\d\d \d\d:\d\d:05$/);
    expect(m.get("a")).not.toBe(m.get("b"));
  });
});

describe("#733 · lista por dia e conversa repetida", () => {
  const agora = new Date(2026, 10, 7, 22, 0).getTime();
  const dia = (d: number, h = 10) => new Date(2026, 10, d, h, 0).getTime();
  it("grupoDoDia", async () => {
    const { grupoDoDia } = await import("./threads");
    expect(grupoDoDia(dia(7, 1), agora)).toBe("Hoje");
    expect(grupoDoDia(dia(6, 23), agora)).toBe("Ontem");
    expect(grupoDoDia(dia(2), agora)).toBe("Últimos 7 dias");
    expect(grupoDoDia(dia(1, 10) - 10 * 86_400_000, agora)).toBe("Últimos 30 dias");
    expect(grupoDoDia(new Date(2026, 6, 1).getTime(), agora)).toBe("Mais antigas");
  });
  it("quandoCriada diz o dia e a hora", async () => {
    const { quandoCriada } = await import("./threads");
    expect(quandoCriada(dia(7, 21), agora)).toMatch(/^criada hoje às 21:00$/);
    expect(quandoCriada(dia(6, 9), agora)).toMatch(/^criada ontem às 09:00$/);
    expect(quandoCriada(dia(1, 14), agora)).toMatch(/^criada em 01\/11 às 14:00$/);
  });
  it("gruposDoDia: a mais nova primeiro, só os grupos que têm conversa", async () => {
    const { gruposDoDia } = await import("./threads");
    const t = (id: string, criadaEm: number) => ({ thread: { id, titulo: id, criadaEm, tocadaEm: criadaEm } });
    const g = gruposDoDia([t("velha", dia(1)), t("hoje1", dia(7, 9)), t("ontem", dia(6)), t("hoje2", dia(7, 21))], agora);
    expect(g.map((x) => x.grupo)).toEqual(["Hoje", "Ontem", "Últimos 7 dias"]);
    expect(g[0]!.nos.map((n) => n.thread.id)).toEqual(["hoje2", "hoje1"]);
  });
  it("conversaRepetida: mesma pergunta acha a conversa; outra pergunta, a própria conversa e 'Nova conversa' não", async () => {
    const { conversaRepetida, TITULO_PADRAO } = await import("./threads");
    const ts = [
      { id: "a", titulo: "o que é fotossíntese", criadaEm: 1, tocadaEm: 1 },
      { id: "b", titulo: TITULO_PADRAO, criadaEm: 2, tocadaEm: 2 },
    ];
    expect(conversaRepetida(ts, "b", "O que é Fotossintese?")?.id).toBe("a");
    expect(conversaRepetida(ts, "b", "o que é mitocôndria?")).toBeNull();
    expect(conversaRepetida(ts, "a", "o que é fotossíntese?")).toBeNull();
    expect(conversaRepetida(ts, "x", "Nova conversa")).toBeNull();
  });
});

describe("#733 · revisão: conversa repetida", () => {
  it("toda pontuação e o 'Aprofunde:' do sub-tema não escondem a repetida", async () => {
    const { conversaRepetida } = await import("./threads");
    const ts = [{ id: "a", titulo: "o que é DNA (ácido)", criadaEm: 1, tocadaEm: 1 }];
    expect(conversaRepetida(ts, null, "o que é DNA — ácido?")?.id).toBe("a");
    expect(conversaRepetida(ts, null, "Aprofunde: o que é DNA (ácido)")?.id).toBe("a");
  });
});
