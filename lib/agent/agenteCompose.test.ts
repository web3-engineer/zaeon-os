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
    expect(ativo).not.toMatch(/KEY|SECRET|TOKEN|CREDENTIALS|MONGODB|DATABASE|REDIS|PUSHER|GOOGLE|NEXTAUTH/i);
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

  it("a allowlist é a MESMA env do Leitor (cai em LEITOR_ALLOW)", () => {
    expect(ativo).toMatch(/AGENTE_ALLOW:\s*"\$\{LEITOR_ALLOW:-[^"]*edu\.br/);
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
