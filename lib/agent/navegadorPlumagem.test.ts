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

/**
 * O SERVIDOR DO NAVEGADOR FALHA FECHADO (achado 🟠 do Sourcery na #716, e correto).
 *
 * `autorizado()` devolvia `true` quando não havia token, com o argumento de que a fronteira do
 * compose era o controle. O argumento vale pra rede interna; o furo é que NADA verificava que
 * estávamos nela — publicada a porta, ou movido o serviço pra outro servidor sem token, o servidor
 * aceitava QUALQUER chamador: criar sessão, navegar, ler página. A única defesa era no CLIENTE
 * (`navegadorRemoto` recusa externo sem token), e o cliente não é quem está exposto.
 */
describe("o modo sem token é OPT-IN, não default", () => {
  const servidor = readFileSync(path.join(raiz, "services/agente-navegador/server.mjs"), "utf8");

  it("sem token, `autorizado` devolve o OPT-IN — nunca `true` direto", () => {
    // a lápide do furo: a linha antiga era `if (!TOKEN) return true;`
    expect(servidor).toMatch(/if \(!TOKEN\) return SEM_TOKEN_OK;/);
    expect(servidor).not.toMatch(/if \(!TOKEN\) return true;/);
  });

  it("o opt-in vem de uma env PRÓPRIA, e só ela o liga", () => {
    expect(servidor).toMatch(/const SEM_TOKEN_OK = [^\n]*AGENTE_SEM_TOKEN/);
  });

  it("quem DECLARA o opt-in é o compose, onde 'estou na rede interna' é verdade por construção", () => {
    const ag = semComentario(servico("agente-navegador"));
    expect(ag).toMatch(/AGENTE_SEM_TOKEN:\s*"1"/);
    // e o serviço só EXPÕE a porta na rede do compose; um `ports:` aqui invalidaria a premissa
    expect(ag).toMatch(/expose:/);
    expect(ag).not.toMatch(/^\s*ports:/m);
  });

  it("o `web` NÃO declara o opt-in — ele é cliente, não o serviço exposto", () => {
    expect(semComentario(servico("web"))).not.toMatch(/AGENTE_SEM_TOKEN/);
  });

  it("a queda pro LEITOR_ALLOW é pela LISTA VAZIA, não pela env ausente", () => {
    // Com `??`, um AGENTE_ALLOW só de espaços (que o compose não substitui, porque `:-` só troca
    // vazio/ausente) deixava o container negando tudo enquanto o recibo do web listava os domínios
    // do Leitor. Recibo e realidade discordando em silêncio.
    expect(servidor).toMatch(/ALLOW_PROPRIA\.length \? ALLOW_PROPRIA : parseAllow\(process\.env\.LEITOR_ALLOW\)/);
    expect(servidor).not.toMatch(/parseAllow\(process\.env\.AGENTE_ALLOW \?\? process\.env\.LEITOR_ALLOW\)/);
  });

  it("o /health publica o modo, pra 'sem autenticação' não ser invisível de fora", () => {
    expect(servidor).toMatch(/semTokenPermitido: SEM_TOKEN_OK/);
  });
});
