/** "Leitor sem credencial" provado lendo o compose: o bloco leitor-proxy não pode ver segredo nenhum. */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const yml = readFileSync(path.resolve(__dirname, "../../docker-compose.beta.yml"), "utf8");
function bloco(nome: string): string {
  const linhas = yml.split("\n");
  const i = linhas.findIndex((l) => l === `  ${nome}:`);
  if (i < 0) return "";
  const out: string[] = [];
  for (const l of linhas.slice(i + 1)) { if (/^ {2}\S/.test(l) || /^\S/.test(l)) break; out.push(l); }
  return out.join("\n");
}

describe("docker-compose.beta.yml — leitor-proxy", () => {
  const b = bloco("leitor-proxy");
  const ativo = b.split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");
  it("existe, no perfil chores, sem portas públicas", () => {
    expect(b).not.toBe("");
    expect(ativo).toMatch(/profiles:\s*\["chores"\]/);
    expect(ativo).not.toMatch(/^\s*ports:/m);
    expect(ativo).toMatch(/expose:\s*\["8787"\]/);
  });
  it("SEM env_file e SEM env com cara de segredo", () => {
    expect(ativo).not.toMatch(/env_file/);
    expect(ativo).not.toMatch(/KEY|SECRET|TOKEN|CREDENTIALS|MONGODB|DATABASE|REDIS|PUSHER|GOOGLE/i);
  });
  it("sem volume do app; read_only, cap_drop ALL, no-new-privileges", () => {
    expect(ativo).not.toMatch(/volumes:/);
    expect(ativo).toMatch(/read_only:\s*true/);
    expect(ativo).toMatch(/cap_drop:\s*\[ALL\]/);
    expect(ativo).toMatch(/no-new-privileges:true/);
  });
  it("só web e worker conhecem LEITOR_PROXY_URL (e vazio por default)", () => {
    expect(bloco("web")).toMatch(/LEITOR_PROXY_URL:\s*\$\{LEITOR_PROXY_URL:-\}/);
    expect(bloco("worker")).toMatch(/LEITOR_PROXY_URL:\s*\$\{LEITOR_PROXY_URL:-\}/);
  });
});
