import { describe, it, expect, vi, beforeEach } from "vitest";

// o Leitor é mockado: esta suíte nunca sai pra rede (e não precisa do container)
vi.mock("@/lib/leitor/cliente", () => ({ lerUrl: vi.fn(), baixarUrl: vi.fn() }));

// a ingestão do RAG: esta suíte não toca Postgres nem pdf-loader
const ingerirPdf = vi.fn();
const ingerirTexto = vi.fn();
const contarEnviadosPessoais = vi.fn(async () => 0);
vi.mock("@/lib/rag/pg", () => ({ ragPg: () => ({ query: vi.fn() }), ehBancoIndisponivel: () => false }));
vi.mock("@/lib/rag/store", () => ({ contarEnviadosPessoais: (...a: any[]) => contarEnviadosPessoais(...(a as [])) }));
vi.mock("@/lib/rag/ingerir", () => ({ ingerirPdf: (...a: any[]) => ingerirPdf(...(a as [])), ingerirTexto: (...a: any[]) => ingerirTexto(...(a as [])) }));
vi.mock("@/lib/queue/rag", () => ({ enfileirarIndexacao: vi.fn() }));
vi.mock("@/lib/scholar/pdf", () => ({ extractPdfStructured: vi.fn() }));

import { baixarUrl, lerUrl } from "@/lib/leitor/cliente";
import { MAX_TEXTO_PAGINA, abrirUrlDef, baixarParaBaseDef, ehUrlDeArquivo, leituraParaResultado, nomeDoArquivo, tituloDaPagina } from "@/lib/agent/toolsWeb";
import { getTool, registrarAbrirUrl, registrarBaixarParaBase } from "@/lib/agent/runtime";
import { LIMITE_PESSOAL } from "@/lib/rag/minhaBase";
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
    // URL SEM allowlist também não registra: o Leitor negaria todo domínio e a tool falharia em
    // 100% das chamadas — com o cardápio da F0 anunciando "abro endereços". É a mentira por outra porta.
    expect(registrarAbrirUrl({ LEITOR_PROXY_URL: "http://leitor:8787" })).toBe(false);
    expect(registrarAbrirUrl({ LEITOR_PROXY_URL: "http://leitor:8787", LEITOR_ALLOW: "  " })).toBe(false);
    // é o que impede a mentira da F0 em nova forma: cardápio derivado do registry não pode
    // anunciar "abro endereços da web" quando toda chamada devolveria "offline".
    expect(getTool("abrir_url")).toBeUndefined();
  });

  it("com LEITOR_PROXY_URL ela entra", () => {
    expect(registrarAbrirUrl({ LEITOR_PROXY_URL: "http://leitor:8787", LEITOR_ALLOW: "*.gov.br" })).toBe(true);
    expect(getTool("abrir_url")?.name).toBe("abrir_url");
  });
});

// ───────────────────────── F1b · baixar_para_base ─────────────────────────
describe("nomeDoArquivo", () => {
  it("vem do caminho da URL", () => {
    expect(nomeDoArquivo("https://x.gov.br/docs/boletim-2024.pdf", "application/pdf")).toBe("boletim-2024.pdf");
  });
  it("sem extensão no caminho, ganha a do tipo que voltou", () => {
    expect(nomeDoArquivo("https://x.gov.br/download/1737", "application/pdf")).toBe("1737.pdf");
    expect(nomeDoArquivo("https://x.gov.br/serie", "text/csv")).toBe("serie.csv");
  });
  it("caminho vazio não gera nome vazio", () => {
    expect(nomeDoArquivo("https://x.gov.br/", "application/pdf")).toBe("arquivo.pdf");
    expect(nomeDoArquivo("nao-e-url", "")).toBe("arquivo.txt");
  });
  it("nada de caminho nem controle vindo da URL (o nome vira chave no banco)", () => {
    expect(nomeDoArquivo("https://x.gov.br/a/%2E%2E%2Fetc%2Fpasswd", "text/plain")).not.toMatch(/[/\\]/);
    expect(nomeDoArquivo("https://x.gov.br/a/%00evil.pdf", "application/pdf")).not.toMatch(/\u0000/);
  });
});

describe("ehUrlDeArquivo · é o que decide baixar em vez de abrir", () => {
  it("extensão que a ingestão lê → arquivo", () => {
    for (const u of ["https://x.gov.br/a.pdf", "https://x.gov.br/b.CSV", "https://x.gov.br/c.md", "https://x.gov.br/d.txt"]) {
      expect(ehUrlDeArquivo(u), u).toBe(true);
    }
  });
  it("página é página", () => {
    for (const u of ["https://x.gov.br/noticia", "https://x.gov.br/a.html", "https://x.gov.br/", "https://x.gov.br/busca?f=a.pdf"]) {
      expect(ehUrlDeArquivo(u), u).toBe(false);
    }
  });
});

describe("baixarParaBaseDef.run", () => {
  const ctx = { userId: "u1" } as any;
  const baixado = (over: Record<string, unknown> = {}) => ({
    ok: true, status: 200, finalUrl: "https://x.gov.br/boletim.pdf", contentType: "application/pdf",
    bytes: new Uint8Array([37, 80, 68, 70]), untrusted: true, lidoEm: "2026-11-03T00:00:00.000Z", ...over,
  }) as any;

  beforeEach(() => {
    vi.mocked(baixarUrl).mockReset();
    ingerirPdf.mockReset().mockResolvedValue({ documentoId: "d1", status: "novo", trechos: 12, paginas: 4 });
    ingerirTexto.mockReset().mockResolvedValue({ documentoId: "d2", status: "novo", trechos: 3, paginas: 1 });
    contarEnviadosPessoais.mockReset().mockResolvedValue(0);
  });

  it("é tool de ESCRITA: no modo guiado o permit manda pra aprovação", () => {
    expect(baixarParaBaseDef.risk).toBe("write");
  });

  it("sem dono do turno não guarda — jamais na base de outra pessoa", async () => {
    const r = await baixarParaBaseDef.run({ url: "https://x.gov.br/a.pdf" }, {} as any);
    expect(r.code).toBe("nao_logado");
    expect(baixarUrl).not.toHaveBeenCalled();
  });

  it("endereço vazio ou interno nem chega no Leitor", async () => {
    expect((await baixarParaBaseDef.run({}, ctx)).code).toBe("bad_args");
    expect((await baixarParaBaseDef.run({ url: "http://169.254.169.254/a.pdf" }, ctx)).code).toBe("bad_args");
    expect(baixarUrl).not.toHaveBeenCalled();
  });

  it("PDF: guarda na base DA PESSOA (donoId), com os bytes que voltaram", async () => {
    vi.mocked(baixarUrl).mockResolvedValue(baixado());
    const r = await baixarParaBaseDef.run({ url: "https://x.gov.br/boletim.pdf" }, ctx);
    expect(r.ok).toBe(true);
    const entrada = ingerirPdf.mock.calls[0][1];
    expect(entrada).toMatchObject({ nomeArquivo: "boletim.pdf", origem: "chat", criadoPor: "u1", permissao: { donoId: "u1" } });
    expect(entrada.bytes).toEqual(new Uint8Array([37, 80, 68, 70]));
    expect(ingerirTexto).not.toHaveBeenCalled();
  });

  it("O RECIBO diz o que aconteceu E o que NÃO aconteceu (o conteúdo não é buscável neste turno)", async () => {
    vi.mocked(baixarUrl).mockResolvedValue(baixado());
    const r = await baixarParaBaseDef.run({ url: "https://x.gov.br/boletim.pdf" }, ctx);
    const claim = r.findings![0].claim;
    expect(claim).toContain("Guardei");
    expect(claim).toContain("boletim.pdf");
    expect(claim).toContain("4 páginas");
    // sem esta frase o modelo afirmaria o que o arquivo diz — a mentira da F0 um passo adiante
    expect(claim).toMatch(/AINDA NÃO está indexado/);
    expect(claim).toMatch(/NÃO afirme o que ele diz/);
    expect(r.findings![0].source).toEqual({ title: "boletim.pdf", url: "https://x.gov.br/boletim.pdf" });
  });

  it("arquivo que já estava na base não vira 'guardei' (dedupe por hash da ingestão)", async () => {
    vi.mocked(baixarUrl).mockResolvedValue(baixado());
    ingerirPdf.mockResolvedValue({ documentoId: "d1", status: "reaproveitado", trechos: 12, paginas: 4 });
    const r = await baixarParaBaseDef.run({ url: "https://x.gov.br/boletim.pdf" }, ctx);
    expect(r.findings![0].claim).toContain("Já estava");
  });

  it("texto vai pelo ingerirTexto, COM os blocos (é o que faz a citação ser rastreável)", async () => {
    vi.mocked(baixarUrl).mockResolvedValue(baixado({ contentType: "text/csv", finalUrl: "https://x.gov.br/serie.csv", bytes: new TextEncoder().encode("a,b\n1,2\n") }));
    const r = await baixarParaBaseDef.run({ url: "https://x.gov.br/serie.csv" }, ctx);
    expect(r.ok).toBe(true);
    expect(ingerirPdf).not.toHaveBeenCalled();
    const e = ingerirTexto.mock.calls[0][1];
    expect(e).toMatchObject({ chave: "serie.csv", permissao: { donoId: "u1" } });
    expect(Array.isArray(e.blocos)).toBe(true);
  });

  it("respeita o LIMITE_PESSOAL — uma tool por fora da rota não pode furar o teto da base", async () => {
    vi.mocked(baixarUrl).mockResolvedValue(baixado());
    contarEnviadosPessoais.mockResolvedValue(LIMITE_PESSOAL);
    const r = await baixarParaBaseDef.run({ url: "https://x.gov.br/a.pdf" }, ctx);
    expect(r.code).toBe("limite_base");
    expect(ingerirPdf).not.toHaveBeenCalled();
  });

  it("cada recusa do Leitor tem código próprio — o aluno merece saber o motivo", async () => {
    const casos: [string, string][] = [
      ["leitor_grande_demais", "arquivo_grande_demais"],
      ["leitor_tipo_nao_baixavel", "tipo_nao_suportado"],
      ["leitor_https_obrigatorio", "precisa_https"],
      ["leitor_dominio_fora_da_lista", "url_nao_permitida"],
      ["leitor_offline", "web_unavailable"],
    ];
    for (const [code, esperado] of casos) {
      vi.mocked(baixarUrl).mockResolvedValue({ ok: false, code, erro: "x" } as any);
      const r = await baixarParaBaseDef.run({ url: "https://x.gov.br/a.pdf" }, ctx);
      expect(r.code, code).toBe(esperado);
      expect(ingerirPdf, code).not.toHaveBeenCalled();
    }
  });

  it("arquivo vazio ou origem fora de 2xx não vira documento", async () => {
    vi.mocked(baixarUrl).mockResolvedValue(baixado({ bytes: new Uint8Array() }));
    expect((await baixarParaBaseDef.run({ url: "https://x.gov.br/a.pdf" }, ctx)).code).toBe("url_sem_conteudo");
    vi.mocked(baixarUrl).mockResolvedValue(baixado({ ok: false, status: 404 }));
    expect((await baixarParaBaseDef.run({ url: "https://x.gov.br/a.pdf" }, ctx)).code).toBe("url_sem_conteudo");
    expect(ingerirPdf).not.toHaveBeenCalled();
  });

  it("falha da ingestão devolve o motivo dela, não um erro genérico", async () => {
    vi.mocked(baixarUrl).mockResolvedValue(baixado());
    ingerirPdf.mockResolvedValue({ documentoId: "", status: "erro", erro: "sem_texto", trechos: 0, paginas: 0 });
    const r = await baixarParaBaseDef.run({ url: "https://x.gov.br/a.pdf" }, ctx);
    expect(r.ok).toBe(false);
    expect(r.code).toBe("sem_texto");
  });
});

describe("registro condicional de baixar_para_base · precisa das DUAS pontas", () => {
  it("falta o Leitor OU falta a base ⇒ a tool não entra", () => {
    expect(registrarBaixarParaBase({})).toBe(false);
    expect(registrarBaixarParaBase({ LEITOR_PROXY_URL: "http://l:8787" })).toBe(false);   // sem base
    expect(registrarBaixarParaBase({ RAG_PG_URL: "postgres://x" })).toBe(false);          // sem Leitor
    expect(registrarBaixarParaBase({ LEITOR_PROXY_URL: "http://l:8787", RAG_PG_URL: "postgres://x" })).toBe(false); // sem allowlist
    expect(getTool("baixar_para_base")).toBeUndefined();
  });
  it("com as duas, entra", () => {
    expect(registrarBaixarParaBase({ LEITOR_PROXY_URL: "http://l:8787", LEITOR_ALLOW: "*.gov.br", RAG_PG_URL: "postgres://x" })).toBe(true);
    expect(getTool("baixar_para_base")?.name).toBe("baixar_para_base");
  });
});
