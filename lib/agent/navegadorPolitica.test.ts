import { describe, it, expect } from "vitest";
import {
  AGENTE_MAX_MS,
  AGENTE_MAX_PASSOS,
  agenteEhExterno,
  agenteFaltando,
  allowDoAgente,
  allowEhAberta,
  decidirPedidoDoAgente,
  ipsAceitos,
  parseAllow,
  regrasDeResolucao,
  tokenDoAgente,
  urlDoAgente,
} from "@/lib/agent/navegadorPolitica";

const allow = ["*.gov.br", "*.edu.br", "arxiv.org"];

describe("allowDoAgente — a lista é a do Leitor, não uma nova", () => {
  it("lê LEITOR_ALLOW e nada mais", () => {
    expect(allowDoAgente({ LEITOR_ALLOW: "*.edu.br, arxiv.org" } as Record<string, string | undefined>)).toEqual(["*.edu.br", "arxiv.org"]);
  });
  it("vazia/ausente = lista vazia (que o urlPermitida trata como NEGA TUDO)", () => {
    expect(allowDoAgente({} as Record<string, string | undefined>)).toEqual([]);
    expect(allowDoAgente({ LEITOR_ALLOW: "   " } as Record<string, string | undefined>)).toEqual([]);
  });
});

describe("regrasDeResolucao — a 2ª camada (fora da lista, nada resolve)", () => {
  it("começa pelo MAP que derruba tudo", () => {
    expect(regrasDeResolucao(allow).startsWith("MAP * ~NOTFOUND")).toBe(true);
  });

  it("`*.x` vira DOIS EXCLUDE: o domínio pelado e os subdomínios", () => {
    // O padrão do Chromium `*.gov.br` não casa `gov.br` (falta o ponto), mas a NOSSA allowlist diz
    // que casa — `hostNaLista("gov.br", ["*.gov.br"])` é true. Sem os dois, o domínio raiz de uma
    // lista que o libera não resolveria: divergência silenciosa entre as duas camadas.
    const r = regrasDeResolucao(["*.gov.br"]);
    expect(r).toContain("EXCLUDE gov.br");
    expect(r).toContain("EXCLUDE *.gov.br");
  });

  it("domínio exato vira UM EXCLUDE", () => {
    const r = regrasDeResolucao(["arxiv.org"]);
    expect(r).toBe("MAP * ~NOTFOUND, EXCLUDE arxiv.org");
  });

  it("lista vazia = só o MAP: falha FECHADO, não libera tudo", () => {
    expect(regrasDeResolucao([])).toBe("MAP * ~NOTFOUND");
  });

  it("entrada suja não produz EXCLUDE torto", () => {
    expect(regrasDeResolucao(["", "*."])).toBe("MAP * ~NOTFOUND");
  });
});

describe("decidirPedidoDoAgente — cada pedido do Chromium, não só a navegação", () => {
  const ped = (url: string, metodo = "GET", tipo = "document") => ({ url, metodo, tipo });

  it("deixa passar o que está na lista", () => {
    expect(decidirPedidoDoAgente(ped("https://www.capes.gov.br/a"), allow)).toEqual({ ok: true });
    expect(decidirPedidoDoAgente(ped("https://arxiv.org/abs/1", "GET", "script"), allow)).toEqual({ ok: true });
  });

  it("subrecurso fora da lista é barrado — é o vetor do `<img src=metadata>`", () => {
    expect(decidirPedidoDoAgente(ped("https://evil.example/x.js", "GET", "script"), allow))
      .toMatchObject({ ok: false, erro: "dominio_fora_da_lista" });
  });

  it("IP literal (endpoint de metadados da nuvem) é barrado mesmo que a lista fosse ampla", () => {
    expect(decidirPedidoDoAgente(ped("http://169.254.169.254/latest/meta-data/"), allow))
      .toMatchObject({ ok: false, erro: "ip_literal" });
  });

  it("só GET: um POST que a página dispare sozinha seria escrita em site de terceiro", () => {
    for (const m of ["POST", "PUT", "DELETE", "PATCH"]) {
      expect(decidirPedidoDoAgente(ped("https://arxiv.org/a", m), allow))
        .toMatchObject({ ok: false, erro: "metodo_proibido" });
    }
    // minúsculo também (o Chromium devolve maiúsculo, mas quem chama pode não)
    expect(decidirPedidoDoAgente(ped("https://arxiv.org/a", "post"), allow))
      .toMatchObject({ ok: false, erro: "metodo_proibido" });
  });

  it("esquema, porta e credencial na URL seguem as regras do leitor-proxy", () => {
    expect(decidirPedidoDoAgente(ped("file:///etc/passwd"), allow).ok).toBe(false);
    expect(decidirPedidoDoAgente(ped("https://arxiv.org:8080/a"), allow)).toMatchObject({ erro: "porta_proibida" });
    expect(decidirPedidoDoAgente(ped("https://u:p@arxiv.org/a"), allow)).toMatchObject({ erro: "credencial_na_url" });
  });

  it("lista vazia nega até o que pareceria óbvio", () => {
    expect(decidirPedidoDoAgente(ped("https://arxiv.org/a"), []).ok).toBe(false);
  });
});

describe("ipsAceitos — TODOS têm de passar, não basta um", () => {
  it("aceita quando todos são públicos", () => {
    expect(ipsAceitos(["93.184.216.34", "2606:2800:220:1::1"])).toEqual({ ok: true });
  });

  it("UM interno na lista já recusa — o proxy ESCOLHE o IP, o Chromium não", () => {
    // Com "basta um bom", um nome que resolve pra [público, loopback] passaria e o Chromium poderia
    // escolher o loopback. A regra do proxy (basta um) só vale porque ele conecta no que escolheu.
    expect(ipsAceitos(["93.184.216.34", "127.0.0.1"])).toMatchObject({ ok: false, erro: "ip_bloqueado" });
    expect(ipsAceitos(["10.0.0.5"])).toMatchObject({ ok: false, erro: "ip_bloqueado" });
    expect(ipsAceitos(["169.254.169.254"])).toMatchObject({ ok: false, erro: "ip_bloqueado" });
  });

  it("DNS sem resposta é recusa, não passe livre", () => {
    expect(ipsAceitos([])).toMatchObject({ ok: false, erro: "dns_vazio" });
  });
});

describe("agenteFaltando — NOMES, nunca valores", () => {
  it("flag off e lista vazia aparecem pelo nome", () => {
    expect(agenteFaltando({} as Record<string, string | undefined>)).toEqual(["AGENTIC_MODE", "LEITOR_ALLOW"]);
  });

  it("tudo no lugar = nada faltando", () => {
    expect(agenteFaltando({ AGENTIC_MODE: "1", LEITOR_ALLOW: "arxiv.org" } as Record<string, string | undefined>)).toEqual([]);
  });

  it("chromium ausente é condição, e também entra por nome", () => {
    expect(agenteFaltando({ AGENTIC_MODE: "1", LEITOR_ALLOW: "arxiv.org" } as Record<string, string | undefined>, false))
      .toEqual(["chromium"]);
  });

  it("NUNCA devolve o valor da env (o recibo é público no log do deploy)", () => {
    const falta = agenteFaltando({ LEITOR_ALLOW: "segredo.interno.br" } as Record<string, string | undefined>);
    expect(falta.join(" ")).not.toContain("segredo.interno.br");
  });

  it("aceita 1/true/on como ligado", () => {
    for (const v of ["1", "true", "on", "ON", "True"]) {
      expect(agenteFaltando({ AGENTIC_MODE: v, LEITOR_ALLOW: "a.org" } as Record<string, string | undefined>)).toEqual([]);
    }
    for (const v of ["0", "", "off", "no"]) {
      expect(agenteFaltando({ AGENTIC_MODE: v, LEITOR_ALLOW: "a.org" } as Record<string, string | undefined>)).toEqual(["AGENTIC_MODE"]);
    }
  });
});

describe("orçamento do run", () => {
  it("é MENOR que o default do agentic.ts (25 passos / 30 min): não há humano acompanhando", () => {
    expect(AGENTE_MAX_PASSOS).toBeLessThan(25);
    expect(AGENTE_MAX_MS).toBeLessThan(30 * 60_000);
  });
});

// ───────────────────────────── F10: modo aberto, token, precedência ─────────────────────────────

describe("allowDoAgente — precedência AGENTE_ALLOW → LEITOR_ALLOW", () => {
  it("AGENTE_ALLOW manda quando preenchida", () => {
    expect(allowDoAgente({ AGENTE_ALLOW: "*", LEITOR_ALLOW: "*.edu.br" })).toEqual(["*"]);
  });
  it("vazia/ausente cai na do Leitor — senão as duas pontas discordariam em silêncio", () => {
    expect(allowDoAgente({ AGENTE_ALLOW: "  ", LEITOR_ALLOW: "arxiv.org" })).toEqual(["arxiv.org"]);
    expect(allowDoAgente({ LEITOR_ALLOW: "arxiv.org" })).toEqual(["arxiv.org"]);
  });
});

describe("allowEhAberta — `*` é ENTRADA, não substring", () => {
  it("só o item exato `*` abre", () => {
    expect(allowEhAberta(["*"])).toBe(true);
    expect(allowEhAberta(["*.edu.br", "*"])).toBe(true);
    // `*.edu.br` CONTÉM asterisco e é lista RESTRITA. Confundir os dois foi um defeito real deste
    // trabalho, no bloco de shell do deploy: o recibo dizia "INTERNET ABERTA" pra lista acadêmica.
    expect(allowEhAberta(["*.edu.br"])).toBe(false);
    expect(allowEhAberta(["**"])).toBe(false);
    expect(allowEhAberta([])).toBe(false);
  });
  it("o parser corta espaço antes, então ` * ` abre", () => {
    expect(allowEhAberta(parseAllow(" * "))).toBe(true);
  });
});

describe("urlDoAgente — em modo ABERTO só o predicado de DOMÍNIO cede", () => {
  const aberta = ["*"];

  it("qualquer domínio passa", () => {
    for (const u of ["https://exemplo.com/x", "https://noticia.qualquer.io/a?b=1", "http://blog.pessoal.net/"]) {
      expect(urlDoAgente(u, aberta).ok, u).toBe(true);
    }
  });

  it("IP literal e endpoint de metadados da nuvem CONTINUAM barrados", () => {
    // Abrir domínio não é abrir rede. Esta é a linha que separa "pesquisa na internet" de
    // "leitor da rede interna", e ela não se move com o modo.
    expect(urlDoAgente("http://169.254.169.254/latest/meta-data/", aberta))
      .toMatchObject({ ok: false, erro: "ip_literal" });
    expect(urlDoAgente("http://[::1]/", aberta)).toMatchObject({ ok: false, erro: "ip_literal" });
    expect(urlDoAgente("http://10.0.0.5/", aberta)).toMatchObject({ ok: false, erro: "ip_literal" });
  });

  it("esquema, porta e credencial na URL CONTINUAM barrados", () => {
    expect(urlDoAgente("file:///etc/passwd", aberta)).toMatchObject({ erro: "esquema_proibido" });
    expect(urlDoAgente("javascript:alert(1)", aberta)).toMatchObject({ erro: "esquema_proibido" });
    expect(urlDoAgente("https://exemplo.com:8080/", aberta)).toMatchObject({ erro: "porta_proibida" });
    expect(urlDoAgente("https://u:p@exemplo.com/", aberta)).toMatchObject({ erro: "credencial_na_url" });
  });

  it("URL que não parseia é recusada com o MESMO código de sempre", () => {
    expect(urlDoAgente("não é url", aberta)).toMatchObject({ ok: false, erro: "url_invalida" });
  });

  it("modo FECHADO segue exatamente como antes", () => {
    expect(urlDoAgente("https://arxiv.org/a", ["arxiv.org"]).ok).toBe(true);
    expect(urlDoAgente("https://exemplo.com/a", ["arxiv.org"])).toMatchObject({ erro: "dominio_fora_da_lista" });
  });

  it("o IP resolvido é conferido do mesmo jeito nos dois modos", () => {
    // `urlDoAgente` cuida da URL; `ipsAceitos` cuida do IP — e ele não sabe nem se importa com modo.
    expect(ipsAceitos(["127.0.0.1"])).toMatchObject({ ok: false, erro: "ip_bloqueado" });
    expect(ipsAceitos(["169.254.169.254"])).toMatchObject({ ok: false, erro: "ip_bloqueado" });
  });
});

describe("regrasDeResolucao em modo aberto", () => {
  it("devolve VAZIO — a camada de DNS sai, e dizer isso importa", () => {
    // No modo fechado é `MAP * ~NOTFOUND` que mata o subrecurso antes do socket. Em modo aberto não
    // existe EXCLUDE que signifique "tudo", então essa camada some e quem segura é a interceptação.
    expect(regrasDeResolucao(["*"])).toBe("");
    expect(regrasDeResolucao(["arxiv.org"])).toContain("MAP * ~NOTFOUND");
  });
});

describe("agenteEhExterno — a justificativa 'é rede interna' tem validade", () => {
  it("nome de serviço do compose é INTERNO", () => {
    expect(agenteEhExterno({ AGENTE_URL: "http://agente-navegador:8788" })).toBe(false);
  });
  it("loopback é INTERNO apesar dos pontos (é o smoke-test, não travessia de internet)", () => {
    expect(agenteEhExterno({ AGENTE_URL: "http://127.0.0.1:8799" })).toBe(false);
    expect(agenteEhExterno({ AGENTE_URL: "http://localhost:8799" })).toBe(false);
  });
  it("FQDN ou https é EXTERNO", () => {
    expect(agenteEhExterno({ AGENTE_URL: "https://agente.zaeon.space" })).toBe(true);
    expect(agenteEhExterno({ AGENTE_URL: "http://203.0.113.7:8788" })).toBe(true);
  });
  it("sem AGENTE_URL não há rede atravessada", () => {
    expect(agenteEhExterno({})).toBe(false);
  });
  it("URL que não parseia é EXTERNO — falha fechado (exige token)", () => {
    expect(agenteEhExterno({ AGENTE_URL: "http://[inválido" })).toBe(true);
  });
});

describe("agenteFaltando — token é FALTA quando o serviço é externo", () => {
  const base = { AGENTIC_MODE: "1", AGENTE_ALLOW: "*" };
  it("externo sem token: falta pelo nome", () => {
    expect(agenteFaltando({ ...base, AGENTE_URL: "https://agente.exemplo.com" }))
      .toEqual(["AGENTE_TOKEN"]);
  });
  it("externo com token: nada falta", () => {
    expect(agenteFaltando({ ...base, AGENTE_URL: "https://agente.exemplo.com", AGENTE_TOKEN: "s3gr3d0" }))
      .toEqual([]);
  });
  it("interno sem token: correto, não falta", () => {
    expect(agenteFaltando({ ...base, AGENTE_URL: "http://agente-navegador:8788" })).toEqual([]);
  });
  it("token EM BRANCO conta como ausente, e nenhum valor sai no relatório", () => {
    // Em branco é ausente: `AGENTE_TOKEN="   "` num serviço externo é porta aberta, não configurada.
    const emBranco = agenteFaltando({ AGENTE_URL: "https://x.exemplo.com", AGENTE_TOKEN: "   " });
    expect(emBranco).toContain("AGENTE_TOKEN");
    // E o relatório leva NOMES, nunca valores — o recibo do deploy é público no log.
    const SEGREDO = "tok3n-nao-pode-vazar";
    const comSegredo = agenteFaltando({ AGENTE_URL: "https://x.exemplo.com", AGENTE_ALLOW: "" , AGENTE_TOKEN: SEGREDO });
    expect(comSegredo.join(" ")).not.toContain(SEGREDO);
  });
});

describe("ondeOAgenteRoda / tokenDoAgente", () => {
  it("token em branco é AUSENTE, não string vazia", () => {
    expect(tokenDoAgente({ AGENTE_TOKEN: "  " })).toBe(null);
    expect(tokenDoAgente({ AGENTE_TOKEN: " s3g " })).toBe("s3g");
  });
});
