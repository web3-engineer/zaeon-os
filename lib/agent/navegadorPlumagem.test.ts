/**
 * Os CINCO ELOS do `AGENTIC_MODE`, provados lendo o workflow e o compose (F8).
 *
 * Por que isto existe: o modo de falhar mais repetido desta série é a flag que NÃO CHEGA no
 * container. Uma Variable preenchida no GitHub não vale nada se faltar o `env:` do job, a lista do
 * `envs:` do ssh-action, o laço `for k in` que exporta, ou a linha do serviço no compose — e a falha
 * é SILENCIOSA: o recibo diz "ligado" e o processo nunca vê a env. Já aconteceu com o trilho do
 * documento (vivia só no .env do VPS) e com as públicas do Pusher (sem build-arg, não chegavam ao
 * navegador). Teste de arquivo é feio, e é o único que pega isso.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const raiz = path.resolve(__dirname, "../..");
const wf = readFileSync(path.join(raiz, ".github/workflows/deploy.yml"), "utf8");
const compose = readFileSync(path.join(raiz, "docker-compose.beta.yml"), "utf8");

/** O corpo de um serviço do compose (até a próxima chave de 2 espaços ou de coluna 0). */
function servico(nome: string): string {
  const linhas = compose.split("\n");
  const i = linhas.findIndex((l) => l === `  ${nome}:`);
  if (i < 0) return "";
  const out: string[] = [];
  for (const l of linhas.slice(i + 1)) { if (/^ {2}\S/.test(l) || /^\S/.test(l)) break; out.push(l); }
  return out.join("\n");
}

const semComentario = (s: string) => s.split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");

describe("AGENTIC_MODE — os cinco elos", () => {
  it("elo 1 · `env:` do job, com default '1' (decisão do dono) e Variable que desliga", () => {
    expect(wf).toMatch(/AGENTIC_MODE:\s*\$\{\{\s*vars\.AGENTIC_MODE\s*\|\|\s*'1'\s*\}\}/);
  });

  it("elo 2 · na lista `envs:` do ssh-action (sem isto a env não cruza o SSH)", () => {
    const lista = /envs:\s*([^\n]+)/.exec(wf)?.[1] ?? "";
    expect(lista.split(",").map((s) => s.trim())).toContain("AGENTIC_MODE");
  });

  it("elo 3 · no laço `for k in` (é ele que exporta pro compose interpolar)", () => {
    const laco = /for k in ([^;]+); do/.exec(wf)?.[1] ?? "";
    expect(laco.split(/\s+/)).toContain("AGENTIC_MODE");
  });

  it("elo 4 · no serviço `web` do compose, com default 0 (falha FECHADO)", () => {
    // Default 0 e não vazio: se a cadeia do workflow quebrar, o agente fica OFF em vez de ligado
    // por acidente. Quem decide ligar é o workflow, que manda "1".
    expect(semComentario(servico("web"))).toMatch(/AGENTIC_MODE:\s*\$\{AGENTIC_MODE:-0\}/);
  });

  it("elo 5 · NÃO está no `worker` — e isso é topologia, não esquecimento", () => {
    // O agente roda onde a ROTA existe (/api/agentic/run). O `worker` não serve rota nenhuma, então
    // a env ali não ligaria nada e só sugeriria que ligaria. Mesma razão pela qual CANAL_WORKER mora
    // só no worker e CANAL_QUEUE só no web.
    expect(semComentario(servico("worker"))).not.toMatch(/AGENTIC_MODE/);
    // e a razão está escrita no compose, pra ninguém "consertar" a assimetria depois
    expect(servico("web")).toMatch(/SÓ NO WEB/);
  });

  it("o recibo do deploy imprime a linha (senão 'está no ar?' não tem resposta sem SSH)", () => {
    expect(wf).toMatch(/agente_navegador/);
  });
});

describe("a allowlist do agente já chega no container", () => {
  it("LEITOR_ALLOW percorre os mesmos elos — flag ON com lista vazia é agente que só recusa", () => {
    // `allowDoAgente` lê LEITOR_ALLOW. Se ela não chegasse, `urlPermitida` negaria TODO domínio e o
    // agente ligado não abriria nada — o pior estado: ligado e inútil, sem erro no log.
    const lista = /envs:\s*([^\n]+)/.exec(wf)?.[1] ?? "";
    expect(lista.split(",").map((s) => s.trim())).toContain("LEITOR_ALLOW");
    expect(semComentario(servico("web"))).toMatch(/LEITOR_ALLOW:/);
  });

  it("o compose traz default acadêmico (o agente não nasce sem lista)", () => {
    expect(semComentario(servico("web"))).toMatch(/LEITOR_ALLOW:\s*"\$\{LEITOR_ALLOW:-[^"]*edu\.br/);
  });
});
