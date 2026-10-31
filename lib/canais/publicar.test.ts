import { describe, it, expect, vi } from "vitest";
import { adapterLog, ctxDeEnsaio, idDeEnsaio, registroLog } from "./adapters/log";
import { CAPACIDADES_DA_REDE, REDES, adapterCoerente, type Rede } from "./tipos";
import { LIMITE_POR_CICLO, publicarAprovados, type DepsPublicar } from "./publicar";
import type { LinhaPost, Voz } from "./fila";
import { TETO_DIA_PADRAO, type EstadoEnvio } from "./politica";

const AGORA = new Date("2026-10-29T17:00:00Z");
const HOJE = "2026-10-29";
const voz: Voz = { agentKey: "farmacia", nome: "Kekulé", area: "Farmácia" };

const post = (over: Partial<LinhaPost> = {}): LinhaPost => ({
  id: "p1", agentKey: "farmacia", rede: "linkedin", estado: "aprovado",
  texto: "Três erros comuns na diluição de medicamentos.", ...over,
});
const canal = (over: Partial<EstadoEnvio> = {}): EstadoEnvio => ({
  rede: "linkedin", estado: "conectado", limiteDia: 2, enviadosHoje: 0, diaContagem: HOJE, ...over,
});

// ───────────────────────────── adapter de ensaio ─────────────────────────────

describe("adapter log", () => {
  it("faz jus ao contrato em TODAS as redes (adapterCoerente)", () => {
    for (const rede of REDES) expect(adapterCoerente(adapterLog(rede)), rede).toBe(true);
  });

  it("só expõe o que a rede declara — LinkedIn não ganha dm de brinde", () => {
    const li = adapterLog("linkedin");
    expect(li.publicar).toBeTypeOf("function");
    expect(li.responder).toBeTypeOf("function");
    expect(li.dm).toBeUndefined();
    expect(adapterLog("whatsapp").publicar).toBeUndefined(); // WhatsApp não é feed
  });

  it("publica no diário e devolve id de ensaio reconhecível", async () => {
    const linhas: string[] = [];
    const a = adapterLog("linkedin", { diario: (l) => linhas.push(l), agora: () => AGORA });
    const r = await a.publicar!({ agentKey: "farmacia", rede: "linkedin", texto: "oi" }, ctxDeEnsaio("linkedin"));
    expect(r).toMatchObject({ ok: true });
    if (r.ok) expect(r.idExterno).toBe(idDeEnsaio("linkedin", AGORA, 1));
    expect(linhas[0]).toContain("[canais:log] publicar rede=linkedin agente=farmacia");
  });

  it("NUNCA imprime o conteúdo no log — só o tamanho", async () => {
    const linhas: string[] = [];
    const a = adapterLog("x", { diario: (l) => linhas.push(l) });
    await a.publicar!({ agentKey: "aura", rede: "x", texto: "segredo do aluno João" }, ctxDeEnsaio("x"));
    expect(linhas[0]).not.toContain("segredo");
    expect(linhas[0]).not.toContain("João");
    expect(linhas[0]).toContain("chars=21");
  });

  it("testar() não contata rede e diz isso", async () => {
    const t = await adapterLog("x").testar(ctxDeEnsaio("x"));
    expect(t.ok).toBe(true);
    expect(t.detalhe).toMatch(/nenhuma rede/i);
  });

  it("registroLog cobre as 4 redes com as capacidades certas", () => {
    const reg = registroLog();
    for (const rede of REDES) expect(reg[rede].capacidades).toEqual(CAPACIDADES_DA_REDE[rede]);
  });
});

// ───────────────────────────── executor ─────────────────────────────

type Gravacoes = {
  publicado: Array<{ id: string; textoFinal: string; idExterno: string; adapter: string }>;
  falhou: Array<{ id: string; classe: string; detalhe: string }>;
  devolveu: Array<{ id: string; classe: string }>;
  contabilizou: Rede[];
  pausou: Array<{ rede: Rede; ate: Date }>;
  claims: string[];
};

function montar(over: Partial<DepsPublicar> & { posts?: LinhaPost[]; canal?: EstadoEnvio | null } = {}) {
  const g: Gravacoes = { publicado: [], falhou: [], devolveu: [], contabilizou: [], pausou: [], claims: [] };
  const linhas: string[] = [];
  const reg = registroLog({ diario: (l) => linhas.push(l), agora: () => AGORA });
  const deps: DepsPublicar = {
    pegarAprovados: async () => over.posts ?? [post()],
    claimar: async (id) => { g.claims.push(id); return true; },
    canalDe: async () => (over.canal === undefined ? canal() : over.canal),
    vozDe: async (k) => (k === "farmacia" ? voz : null),
    adapterDe: (rede) => reg[rede] ?? null,
    ctxDe: (rede) => ctxDeEnsaio(rede),
    publicado: async (id, d) => { g.publicado.push({ id, textoFinal: d.textoFinal, idExterno: d.idExterno, adapter: d.adapter }); },
    falhou: async (id, d) => { g.falhou.push({ id, ...d }); },
    devolveu: async (id, d) => { g.devolveu.push({ id, classe: d.classe }); },
    contabilizar: async (rede) => { g.contabilizou.push(rede); },
    pausarCanal: async (rede, d) => { g.pausou.push({ rede, ate: d.ate }); },
    ...over,
  };
  return { deps, g, linhas };
}

describe("publicar · caminho feliz", () => {
  it("publica, assina, contabiliza e marca o adapter como ensaio", async () => {
    const { deps, g } = montar();
    const r = await publicarAprovados(deps, AGORA);
    expect(r.publicados).toBe(1);
    expect(g.publicado[0].textoFinal).toContain("— Kekulé, Farmácia · Zaeon");
    expect(g.publicado[0].idExterno).toMatch(/^log:linkedin:/);
    expect(g.publicado[0].adapter).toBe("log"); // F2 inteira é ensaio — e fica gravado
    expect(g.contabilizou).toEqual(["linkedin"]);
  });

  it("o claim vem DEPOIS do julgamento — post recusado não é travado à toa", async () => {
    const { deps, g } = montar({ canal: canal({ estado: "pausado" }) });
    await publicarAprovados(deps, AGORA);
    expect(g.claims).toEqual([]);
  });

  it("claim perdido = outro ciclo levou; não publica nem falha", async () => {
    const { deps, g } = montar({ claimar: async () => false });
    const r = await publicarAprovados(deps, AGORA);
    expect(r.pulados).toBe(1);
    expect(g.publicado).toEqual([]);
    expect(g.falhou).toEqual([]);
  });
});

describe("publicar · de quem é a culpa", () => {
  it("canal fora NÃO culpa o post: fica aprovado pra sair depois", async () => {
    for (const estado of ["pausado", "precisa_autorizar", "nao_conectado"] as const) {
      const { deps, g } = montar({ canal: canal({ estado }) });
      const r = await publicarAprovados(deps, AGORA);
      expect(r.pulados, estado).toBe(1);
      expect(g.falhou, estado).toEqual([]);   // ninguém vai reaprovar 20 rascunhos por causa de um token
    }
  });

  it("teto do dia também é do canal, não do post", async () => {
    const { deps, g } = montar({ canal: canal({ enviadosHoje: 2 }) });
    const r = await publicarAprovados(deps, AGORA);
    expect(r.pulados).toBe(1);
    expect(g.falhou).toEqual([]);
  });

  it("rede nunca configurada vira motivo claro, não exceção", async () => {
    const { deps } = montar({ canal: null });
    const r = await publicarAprovados(deps, AGORA);
    expect(r.pulados).toBe(1);
    expect(r.itens[0].classe).toBe("auth");
  });

  it("PII É do post: falhou, esperando reescrita humana", async () => {
    const { deps, g } = montar({ posts: [post({ texto: "chama no 11 98765-4321" })] });
    const r = await publicarAprovados(deps, AGORA);
    expect(r.falhados).toBe(1);
    expect(g.falhou[0].classe).toBe("pii_bloqueada");
    expect(g.publicado).toEqual([]);
  });

  it("agente fora do roster falha o post (sem voz não há assinatura)", async () => {
    const { deps, g } = montar({ posts: [post({ agentKey: "fantasma" })] });
    const r = await publicarAprovados(deps, AGORA);
    expect(r.falhados).toBe(1);
    expect(g.falhou[0].detalhe).toMatch(/roster/);
  });
});

describe("publicar · erro do adapter", () => {
  const comAdapter = (res: any) => montar({
    adapterDe: () => ({
      rede: "linkedin", capacidades: CAPACIDADES_DA_REDE.linkedin,
      publicar: async () => res, responder: async () => res,
      testar: async () => ({ ok: true }),
    }),
  });

  it("transitório devolve pra fila E pausa o canal (sem laço apertado)", async () => {
    const { deps, g } = comAdapter({ ok: false, classe: "rate_limit", detalhe: "429" });
    const r = await publicarAprovados(deps, AGORA);
    expect(r.devolvidos).toBe(1);
    expect(g.devolveu[0].classe).toBe("rate_limit");
    expect(g.pausou[0].rede).toBe("linkedin");
    expect(g.pausou[0].ate.getTime()).toBeGreaterThan(AGORA.getTime());
    expect(g.falhou).toEqual([]);
  });

  it("permanente vai pra falhou e espera gente", async () => {
    const { deps, g } = comAdapter({ ok: false, classe: "conteudo_recusado", detalhe: "a plataforma recusou" });
    const r = await publicarAprovados(deps, AGORA);
    expect(r.falhados).toBe(1);
    expect(g.devolveu).toEqual([]);
    expect(g.pausou).toEqual([]);
  });

  it("adapter que LANÇA não derruba o ciclo — vira erro de rede", async () => {
    const { deps, g } = montar({
      adapterDe: () => ({
        rede: "linkedin", capacidades: CAPACIDADES_DA_REDE.linkedin,
        publicar: async () => { throw new Error("socket morreu"); },
        responder: async () => ({ ok: true, idExterno: "x" }),
        testar: async () => ({ ok: true }),
      }),
    });
    const r = await publicarAprovados(deps, AGORA);
    expect(r.devolvidos).toBe(1);
    expect(g.devolveu[0].classe).toBe("rede");
  });

  it("nunca contabiliza envio que não saiu", async () => {
    const { deps, g } = comAdapter({ ok: false, classe: "conteudo_recusado", detalhe: "não" });
    await publicarAprovados(deps, AGORA);
    expect(g.contabilizou).toEqual([]);
  });

  it("rede sem adapter é pulada, não quebrada", async () => {
    const { deps } = montar({ adapterDe: () => null });
    const r = await publicarAprovados(deps, AGORA);
    expect(r.pulados).toBe(1);
    expect(r.itens[0].classe).toBe("capacidade");
  });
});

describe("publicar · lote", () => {
  it("um post ruim não impede os outros de sair", async () => {
    const { deps, g } = montar({
      posts: [post({ id: "ruim", texto: "zap 11 98765-4321" }), post({ id: "bom" }), post({ id: "sem-voz", agentKey: "fantasma" })],
    });
    const r = await publicarAprovados(deps, AGORA);
    expect(r.publicados).toBe(1);
    expect(r.falhados).toBe(2);
    expect(g.publicado.map((p) => p.id)).toEqual(["bom"]);
  });

  it("o limite por ciclo chega na query (não é filtrado depois)", async () => {
    const pegar = vi.fn(async () => []);
    const { deps } = montar({ pegarAprovados: pegar });
    await publicarAprovados(deps, AGORA);
    expect(pegar).toHaveBeenCalledWith(LIMITE_POR_CICLO);
    await publicarAprovados(deps, AGORA, 3);
    expect(pegar).toHaveBeenLastCalledWith(3);
  });

  it("relatório vazio quando não há nada aprovado", async () => {
    const { deps } = montar({ posts: [] });
    expect(await publicarAprovados(deps, AGORA)).toEqual({ publicados: 0, falhados: 0, devolvidos: 0, pulados: 0, itens: [] });
  });

  it("o teto padrão da rede vale quando o canal não existe", async () => {
    const { deps } = montar({ canal: null, posts: [post({ rede: "x" })] });
    const r = await publicarAprovados(deps, AGORA);
    expect(TETO_DIA_PADRAO.x).toBe(5); // trava o default: mudá-lo é decisão, não acidente
    expect(r.pulados).toBe(1);
  });
});
