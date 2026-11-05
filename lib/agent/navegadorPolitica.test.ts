import { describe, it, expect } from "vitest";
import {
  AGENTE_MAX_MS,
  AGENTE_MAX_PASSOS,
  agenteFaltando,
  allowDoAgente,
  decidirPedidoDoAgente,
  ipsAceitos,
  regrasDeResolucao,
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
