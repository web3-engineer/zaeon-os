import { describe, it, expect } from "vitest";
import { urlPermitida, ipBloqueado, extrairTexto, mesmoHost, parseAllow, tipoAceito } from "../../services/leitor-proxy/guarda.mjs";

const allow = parseAllow("*.gov.br, *.edu.br, arxiv.org");

describe("urlPermitida", () => {
  it("esquemas proibidos", () => {
    for (const u of ["file:///etc/passwd", "gopher://x.gov.br", "dict://x.gov.br", "data:text/html,oi", "ftp://x.gov.br/a", "javascript:alert(1)"]) {
      expect(urlPermitida(u, allow).ok, u).toBe(false);
    }
  });
  it("IP literal, porta fora de 80/443, credencial na URL", () => {
    expect(urlPermitida("http://169.254.169.254/latest/meta-data/", allow)).toMatchObject({ ok: false, erro: "ip_literal" });
    expect(urlPermitida("http://[::1]/", allow)).toMatchObject({ ok: false, erro: "ip_literal" });
    expect(urlPermitida("https://www.saude.gov.br:8080/", allow)).toMatchObject({ ok: false, erro: "porta_proibida" });
    expect(urlPermitida("https://u:p@www.saude.gov.br/", allow)).toMatchObject({ ok: false, erro: "credencial_na_url" });
  });
  it("allowlist: *.gov.br casa www.saude.gov.br e gov.br; fora da lista = 403; lista vazia nega tudo", () => {
    expect(urlPermitida("https://www.saude.gov.br/a", allow).ok).toBe(true);
    expect(urlPermitida("https://gov.br/", allow).ok).toBe(true);
    expect(urlPermitida("https://arxiv.org/abs/1", allow).ok).toBe(true);
    expect(urlPermitida("https://evilgov.br/", allow)).toMatchObject({ ok: false, erro: "dominio_fora_da_lista", status: 403 });
    expect(urlPermitida("https://gov.br.evil.com/", allow).ok).toBe(false);
    expect(urlPermitida("https://www.saude.gov.br/", []).ok).toBe(false);
  });
});

describe("ipBloqueado", () => {
  it("bloqueia metadata, privados, loopback, CGNAT, ULA, link-local e mapeados", () => {
    for (const ip of ["169.254.169.254", "10.0.0.1", "172.31.255.255", "172.16.0.1", "192.168.0.1", "127.0.0.1", "0.0.0.0", "100.64.0.1", "::1", "::", "fd00::1", "fe80::1", "::ffff:10.0.0.1", "::ffff:169.254.169.254", "64:ff9b::a00:1", "lixo"]) {
      expect(ipBloqueado(ip), ip).toBe(true);
    }
  });
  it("libera IP público", () => {
    for (const ip of ["8.8.8.8", "200.152.32.1", "2600::1", "2804:14c::1", "::ffff:8.8.8.8", "172.32.0.1"]) expect(ipBloqueado(ip), ip).toBe(false);
  });
});

describe("extrairTexto / mesmoHost / tipoAceito", () => {
  it("tira script/style/comentários e decodifica entidades", () => {
    const t = extrairTexto("<html><head><style>p{}</style><script>alert('x')</script></head><body><!-- c --><h1>Edital&nbsp;2026</h1><p>Inscri&ccedil;&otilde;es &amp; prazos &#8212; ok</p></body></html>");
    expect(t).toBe("Edital 2026\nInscrições & prazos — ok");
    expect(t).not.toMatch(/alert|p\{\}/);
  });
  it("mesmoHost", () => {
    expect(mesmoHost("https://A.gov.br/x", "http://a.gov.br/y")).toBe(true);
    expect(mesmoHost("https://a.gov.br", "https://b.gov.br")).toBe(false);
  });
  it("tipos aceitos", () => {
    expect(tipoAceito("text/html; charset=utf-8")).toBe("text/html");
    expect(tipoAceito("application/rss+xml")).toBe("application/rss+xml");
    expect(tipoAceito("application/pdf")).toBeNull();
    expect(tipoAceito("image/png")).toBeNull();
  });
});
