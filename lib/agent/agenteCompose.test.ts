/**
 * "O container do agente não tem credencial" provado lendo o compose (F9) — e os elos provados
 * lendo o workflow. Mesmo molde de `lib/leitor/compose.test.ts`, pelo mesmo motivo: a afirmação
 * central deste desenho não é uma frase do doc, é a AUSÊNCIA de `env_file` e de segredo no bloco.
 * Se alguém acrescentar um `env_file` ali um dia pra "facilitar", o argumento inteiro cai — e cai
 * em silêncio, porque nada no comportamento muda até o dia em que vazar.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const raiz = path.resolve(__dirname, "../..");
const compose = readFileSync(path.join(raiz, "docker-compose.beta.yml"), "utf8");
const wf = readFileSync(path.join(raiz, ".github/workflows/deploy.yml"), "utf8");
const dockerfile = readFileSync(path.join(raiz, "services/agente-navegador/Dockerfile"), "utf8");

function servico(nome: string): string {
  const linhas = compose.split("\n");
  const i = linhas.findIndex((l) => l === `  ${nome}:`);
  if (i < 0) return "";
  const out: string[] = [];
  for (const l of linhas.slice(i + 1)) { if (/^ {2}\S/.test(l) || /^\S/.test(l)) break; out.push(l); }
  return out.join("\n");
}
const semComentario = (s: string) => s.split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");

const bloco = servico("agente-navegador");
const ativo = semComentario(bloco);

describe("docker-compose — agente-navegador", () => {
  it("existe, no perfil `agente`, SEM porta pública", () => {
    expect(bloco).not.toBe("");
    expect(ativo).toMatch(/profiles:\s*\["agente"\]/);
    expect(ativo).not.toMatch(/^\s*ports:/m);
    expect(ativo).toMatch(/expose:\s*\["8788"\]/);
  });

  it("ZERO CREDENCIAL: sem env_file e sem env com cara de segredo", () => {
    expect(ativo).not.toMatch(/env_file/);
    // F10 · `AGENTE_TOKEN` é EXCEÇÃO NOMEADA, não afrouxamento. A regra que esta asserção protege é
    // "nada aqui dá acesso a OUTRA coisa": o token dá acesso AO PRÓPRIO NAVEGADOR, então quem já
    // comprometeu este container não ganha nada novo com ele. Vertex, Mongo, Pusher, NextAuth e
    // companhia seguem proibidos — e é por isso que a exceção é por NOME e não por relaxar a regex.
    const semExcecao = ativo.replace(/^\s*AGENTE_TOKEN:.*$/gm, "");
    expect(semExcecao).not.toMatch(/KEY|SECRET|TOKEN|CREDENTIALS|MONGODB|DATABASE|REDIS|PUSHER|GOOGLE|NEXTAUTH/i);
  });

  it("o token, quando existe, vem de interpolação — nunca literal no arquivo", () => {
    // Segredo escrito no compose iria pro git. Só a referência pode aparecer.
    const linha = /^\s*AGENTE_TOKEN:\s*(.+)$/m.exec(ativo)?.[1] ?? "";
    expect(linha.trim()).toBe("${AGENTE_TOKEN:-}");
  });

  it("sem volume do app; read_only, cap_drop ALL, no-new-privileges", () => {
    expect(ativo).not.toMatch(/volumes:/);
    expect(ativo).toMatch(/read_only:\s*true/);
    expect(ativo).toMatch(/cap_drop:\s*\[ALL\]/);
    expect(ativo).toMatch(/no-new-privileges:true/);
  });

  it("/tmp é tmpfs — o container é read_only e o Chromium precisa escrever o perfil", () => {
    // Sem isto o Chromium morre no boot, e morre com uma mensagem que não diz "faltou tmpfs".
    expect(ativo).toMatch(/tmpfs:\s*\["\/tmp:/);
  });

  it("tem MEMÓRIA PRÓPRIA — era o pedido do dono: sair do limite disputado com o web", () => {
    const m = /mem_limit:\s*(\d+)m/.exec(ativo);
    expect(m, "mem_limit ausente").toBeTruthy();
    expect(Number(m![1])).toBeGreaterThanOrEqual(1024);
    expect(ativo).toMatch(/shm_size:\s*\d+m/);
  });

  it("o contexto de build é ./services — é o que permite importar a guarda do Leitor", () => {
    // Uma definição de política, não duas: o container usa a MESMA guarda.mjs que o proxy roda.
    expect(ativo).toMatch(/context:\s*\.\/services/);
    expect(ativo).toMatch(/dockerfile:\s*agente-navegador\/Dockerfile/);
    expect(dockerfile).toMatch(/COPY leitor-proxy\/guarda\.mjs/);
  });

  it("roda NÃO-ROOT, como o leitor-proxy", () => {
    expect(dockerfile).toMatch(/^USER node$/m);
  });

  it("a allowlist lê AGENTE_ALLOW — a MESMA env que o web lê", () => {
    // Esta linha dizia `AGENTE_ALLOW:` e LIA `${LEITOR_ALLOW}` (defeito meu na F9): o workflow
    // mandando `*` nunca chegaria no container, e as duas pontas discordariam em silêncio.
    expect(ativo).toMatch(/AGENTE_ALLOW:\s*"\$\{AGENTE_ALLOW:-/);
  });

  it("o DEFAULT embutido é acadêmico — fail-closed: cadeia quebrada ESTREITA, não abre", () => {
    const m = /AGENTE_ALLOW:\s*"\$\{AGENTE_ALLOW:-([^"]*)\}"/.exec(ativo);
    expect(m, "default do AGENTE_ALLOW ausente").toBeTruthy();
    expect(m![1]).toContain("edu.br");
    expect(m![1].split(",").map((x) => x.trim())).not.toContain("*");
  });
});

describe("web ↔ container", () => {
  it("o web aponta pro serviço por default (molde do LEITOR_PROXY_URL)", () => {
    expect(semComentario(servico("web"))).toMatch(
      /AGENTE_URL:\s*\$\{AGENTE_URL:-http:\/\/agente-navegador:8788\}/,
    );
  });

  it("o `worker` NÃO leva AGENTE_URL nem o perfil: ele não serve rota nenhuma", () => {
    expect(semComentario(servico("worker"))).not.toMatch(/AGENTE_URL/);
  });

  it("as DUAS pontas leem a MESMA allowlist (AGENTE_ALLOW), senão discordam em silêncio", () => {
    const web = semComentario(servico("web"));
    expect(web).toMatch(/AGENTE_ALLOW:\s*"\$\{AGENTE_ALLOW:-/);
    const doWeb = /AGENTE_ALLOW:\s*"\$\{AGENTE_ALLOW:-([^"]*)\}"/.exec(web)?.[1];
    const doContainer = /AGENTE_ALLOW:\s*"\$\{AGENTE_ALLOW:-([^"]*)\}"/.exec(ativo)?.[1];
    expect(doWeb).toBe(doContainer);
  });

  it("o web também recebe o token (ele é o cliente que precisa mandá-lo)", () => {
    expect(semComentario(servico("web"))).toMatch(/AGENTE_TOKEN:\s*\$\{AGENTE_TOKEN:-\}/);
  });
});

describe("AGENTE_ALLOW e AGENTE_TOKEN — os elos (F10)", () => {
  it("AGENTE_ALLOW: env do step com default `*` (internet aberta, pedido do dono), envs: e laço", () => {
    expect(wf).toMatch(/AGENTE_ALLOW:\s*\$\{\{\s*vars\.AGENTE_ALLOW\s*\|\|\s*'\*'\s*\}\}/);
    const lista = /envs:\s*([^\n]+)/.exec(wf)?.[1] ?? "";
    expect(lista.split(",").map((x) => x.trim())).toContain("AGENTE_ALLOW");
    const laco = /for k in ([^;]+); do/.exec(wf)?.[1] ?? "";
    expect(laco.split(/\s+/)).toContain("AGENTE_ALLOW");
  });

  it("AGENTE_TOKEN vem de SECRETS e NÃO entra no laço `for k in`", () => {
    // O laço imprime `→ flag de build $k=<valor>` de cada nome que recebe. Segredo não se ecoa.
    expect(wf).toMatch(/AGENTE_TOKEN:\s*\$\{\{\s*secrets\.AGENTE_TOKEN\s*\}\}/);
    const laco = /for k in ([^;]+); do/.exec(wf)?.[1] ?? "";
    expect(laco.split(/\s+/)).not.toContain("AGENTE_TOKEN");
    const lista = /envs:\s*([^\n]+)/.exec(wf)?.[1] ?? "";
    expect(lista.split(",").map((x) => x.trim())).toContain("AGENTE_TOKEN");
  });

  it("o recibo diz o MODO (aberta/restrita) e, se externo, se há token", () => {
    expect(wf).toMatch(/INTERNET ABERTA/);
    expect(wf).toMatch(/dominios=/);
    expect(wf).toMatch(/token=/);
  });

  it("o bloco de shell usa `set -f`: sem noglob, um `*` sozinho vira lista de arquivos", () => {
    // Defeito real deste trabalho, pego executando o bloco: `AGENTE_ALLOW='*'` era lido como
    // RESTRITO porque o glob comia o asterisco. O `*.edu.br` passava por acidente.
    expect(wf).toMatch(/set -f/);
  });
});

describe("AGENTE_URL — os elos do workflow", () => {
  it("está no `env:` do step, na lista `envs:` e no laço `for k in`", () => {
    expect(wf).toMatch(/AGENTE_URL:\s*\$\{\{\s*vars\.AGENTE_URL\s*\|\|\s*''\s*\}\}/);
    const lista = /envs:\s*([^\n]+)/.exec(wf)?.[1] ?? "";
    expect(lista.split(",").map((s) => s.trim())).toContain("AGENTE_URL");
    const laco = /for k in ([^;]+); do/.exec(wf)?.[1] ?? "";
    expect(laco.split(/\s+/)).toContain("AGENTE_URL");
  });
});

describe("o serviço é LIGADO pelo deploy — não só declarado", () => {
  it("o deploy nomeia o serviço quando AGENTIC_MODE está on", () => {
    // Esta é a armadilha do "worker não está rodando": um serviço no compose que ninguém sobe. E
    // aqui seria PIOR que o worker, porque o web aponta pro container por DEFAULT — declarado e
    // parado viraria 503 em vez de capacidade.
    expect(wf).toMatch(/SERVICES="\$SERVICES agente-navegador"/);
  });

  it("cobre a ramificação de lista VAZIA (WITH_VOICE=true), onde perfil não entra por nome", () => {
    expect(wf).toMatch(/COMPOSE_PROFILES[^\n]*agente"/);
  });

  it("o recibo diz ONDE o navegador roda e acusa container inalcançável", () => {
    expect(wf).toMatch(/onde=/);
    expect(wf).toMatch(/CONTAINER INALCANÇÁVEL/);
  });
});
