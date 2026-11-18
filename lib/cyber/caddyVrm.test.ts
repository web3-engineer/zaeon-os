/**
 * #819 · o Caddyfile comprime os corpos das avatares (.vrm). Não dá pra subir o Caddy aqui: o deploy roda o
 * `caddy validate` antes de trocar a config (um Caddyfile inválido não derruba o site). Aqui fica a amarração.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const caddy = readFileSync(path.resolve(__dirname, "../..", "Caddyfile"), "utf8");
const site = caddy.slice(caddy.indexOf("{$BETA_DOMAIN} {"), caddy.indexOf("www.zaeon.com.br {"));

describe("#819 · Caddyfile", () => {
  it("o .vrm (application/octet-stream) é comprimido", () => {
    expect(site).toMatch(/@vrm path \*\.vrm/);
    expect(site).toMatch(/encode @vrm zstd gzip \{\s*match \{\s*header Content-Type application\/octet-stream\s*\}\s*\}/);
  });
  it("o resto continua com o encode padrão", () => {
    expect(site).toMatch(/^\tencode zstd gzip\r?$/m);
  });
});
