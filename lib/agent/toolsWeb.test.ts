import { describe, it, expect, vi, beforeEach } from "vitest";

// o Leitor é mockado: esta suíte nunca sai pra rede (e não precisa do container)
vi.mock("@/lib/leitor/cliente", () => ({ lerUrl: vi.fn() }));

import { lerUrl } from "@/lib/leitor/cliente";
import { MAX_TEXTO_PAGINA, abrirUrlDef, leituraParaResultado, tituloDaPagina } from "@/lib/agent/toolsWeb";
import { getTool, registrarAbrirUrl } from "@/lib/agent/runtime";
import { rotuloDasFontes } from "@/lib/agent/trajectory";

const leitura = (over: Record<string, unknown> = {}) => ({
  ok: true, status: 200, finalUrl: "https://exemplo.com/a", contentType: "text/html",
  texto: "Título da matéria\nCorpo da página com o conteúdo.", truncado: false, bytes: 100,
  lidoEm: "2026-11-03T00:00:00.000Z", ...over,
}) as any;

describe("tituloDaPagina", () => {
  it("é a primeira linha com substância", () => {
    expect(tituloDaPagina("\n \nIPCA sobe 0,4% em outubro\nresto", "https://x.com")).toBe("IPCA sobe 0,4% em outubro");
  });
  it("linha de 1–2 caracteres não é título", () => {
    expect(tituloDaPagina("x\nO título de verdade", "https://x.com")).toBe("O título de verdade");
  });
  it("sem texto, cai no host (nunca fica vazio)", () => {
    expect(tituloDaPagina("", "https://sidra.ibge.gov.br/tabela/1")).toBe("sidra.ibge.gov.br");
    expect(tituloDaPagina("", "nao-e-url")).toBe("nao-e-url");
  });
  it("título longo é cortado", () => {
    expect(tituloDaPagina("T".repeat(500), "https://x.com")).toHaveLength(160);
  });
});

describe("leituraParaResultado · página lida", () => {
  it("vira UM finding com título, endereço final e texto", () => {
    const r = leituraParaResultado(leitura(), "https://exemplo.com/pedido");
    expect(r.ok).toBe(true);
    expect(r.findings).toHaveLength(1);
    const f = r.findings![0];
    expect(f.claim).toContain("Título da matéria");
    expect(f.claim).toContain("<https://exemplo.com/a>");   // o endereço FINAL, não o pedido
    expect(f.claim).toContain("Corpo da página");
    expect(f.source).toEqual({ title: "Título da matéria", url: "https://exemplo.com/a" });
    expect(r.provenance.toolsUsed).toEqual(["abrir_url"]);
    expect(r.provenance.sources).toEqual([f.source]);
  });

  it("a confiança é 'baixa' — e isso NÃO é detalhe: é o que faz o aluno ler 'da web'", () => {
    const r = leituraParaResultado(leitura(), "https://exemplo.com/a");
    expect(r.findings![0].confidence).toBe("baixa");
    // o rótulo do progresso conta fonte web por `confidence === "baixa"` (lib/agent/trajectory):
    // com "média" a página apareceria como "artigo acadêmico", o que seria falso.
    expect(rotuloDasFontes(r.findings!)).toContain("1 da web");
    expect(rotuloDasFontes(r.findings!)).not.toContain("acadêmic");
  });

  it("página maior que o teto é cortada E avisa que foi cortada", () => {
    const r = leituraParaResultado(leitura({ texto: `Cabeça\n${"a".repeat(MAX_TEXTO_PAGINA + 500)}` }), "https://x.com");
    const claim = r.findings![0].claim;
    expect(claim).toContain("o resto não foi lido");
    // o claim entra INTEIRO no prompt do rascunho: o teto é o que impede uma página de comer a janela
    expect(claim.length).toBeLessThan(MAX_TEXTO_PAGINA + 400);
  });

  it("o Leitor avisando truncado também marca, mesmo caindo dentro do teto", () => {
    const r = leituraParaResultado(leitura({ truncado: true }), "https://x.com");
    expect(r.findings![0].claim).toContain("o resto não foi lido");
  });
});

describe("leituraParaResultado · o que deu errado", () => {
  it("a PÁGINA respondeu fora de 2xx: é fato sobre o link, não falha nossa", () => {
    const r = leituraParaResultado(leitura({ ok: false, status: 404 }), "https://x.com/morto");
    expect(r.ok).toBe(false);
    expect(r.code).toBe("url_sem_conteudo");
    expect(r.error).toContain("404");
  });

  it("página sem texto legível (só menu/script) não vira evidência vazia", () => {
    const r = leituraParaResultado(leitura({ texto: "   \n  " }), "https://x.com");
    expect(r.ok).toBe(false);
    expect(r.code).toBe("url_sem_conteudo");
  });

  it("cada erro do Leitor tem código próprio — e NENHUM é retentável", async () => {
    const { isRetryableCode } = await import("@/lib/agent/aura-harness");
    const casos: [string, string][] = [
      ["leitor_offline", "web_unavailable"],
      ["leitor_dominio_fora_da_lista", "url_nao_permitida"],
      ["leitor_recusou", "url_recusada"],
      ["leitor_falhou", "skill_error"],
    ];
    for (const [code, esperado] of casos) {
      const r = leituraParaResultado({ ok: false, code, erro: "x" } as any, "https://x.com");
      expect(r.ok, code).toBe(false);
      expect(r.code, code).toBe(esperado);
      // insistir num domínio fora da allowlist dá a mesma resposta; "offline" é configuração
      expect(isRetryableCode(r.code), code).toBe(false);
    }
  });
});

describe("abrirUrlDef.run · as barreiras antes do Leitor", () => {
  beforeEach(() => vi.mocked(lerUrl).mockReset());

  it("endereço vazio nem chega no Leitor", async () => {
    const r = await abrirUrlDef.run({}, {} as any);
    expect(r.code).toBe("bad_args");
    expect(lerUrl).not.toHaveBeenCalled();
  });

  it("endereço interno nem chega no Leitor (1ª barreira aqui; o IP ele confere do lado dele)", async () => {
    for (const url of ["http://localhost/x", "http://169.254.169.254/latest/meta-data/", "ftp://x.com/a"]) {
      const r = await abrirUrlDef.run({ url }, {} as any);
      expect(r.code, url).toBe("bad_args");
    }
    expect(lerUrl).not.toHaveBeenCalled();
  });

  it("endereço público vai pro Leitor e a leitura volta mapeada", async () => {
    vi.mocked(lerUrl).mockResolvedValue(leitura());
    const r = await abrirUrlDef.run({ url: "https://exemplo.com/a" }, {} as any);
    expect(lerUrl).toHaveBeenCalledWith("https://exemplo.com/a");
    expect(r.ok).toBe(true);
    expect(r.findings![0].source!.url).toBe("https://exemplo.com/a");
  });

  it("é tool de LEITURA (risco read): nunca cai em aprovação no modo guiado", () => {
    expect(abrirUrlDef.risk).toBe("read");
    expect(abrirUrlDef.minPlan).toBe("free");
  });
});

// ⚠️ ORDEM IMPORTA: o registry é global do módulo e não há como desregistrar.
describe("registro condicional · a tool só existe se o Leitor existe", () => {
  it("sem LEITOR_PROXY_URL a tool NÃO entra no registry", () => {
    expect(process.env.LEITOR_PROXY_URL ?? "", "esta suíte pressupõe o Leitor desligado no ambiente de teste").toBe("");
    expect(registrarAbrirUrl({})).toBe(false);
    expect(registrarAbrirUrl({ LEITOR_PROXY_URL: "   " })).toBe(false);
    // é o que impede a mentira da F0 em nova forma: cardápio derivado do registry não pode
    // anunciar "abro endereços da web" quando toda chamada devolveria "offline".
    expect(getTool("abrir_url")).toBeUndefined();
  });

  it("com LEITOR_PROXY_URL ela entra", () => {
    expect(registrarAbrirUrl({ LEITOR_PROXY_URL: "http://leitor:8787" })).toBe(true);
    expect(getTool("abrir_url")?.name).toBe("abrir_url");
  });
});
