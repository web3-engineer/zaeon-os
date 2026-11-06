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
/**
 * O RECIBO mora num arquivo desde que o escalar `script:` bateu no teto de 21.000 bytes do GitHub
 * (ver o teste do teto, abaixo): o blob de JS custava 3.573 bytes de um orçamento que já estava em
 * 19.881. As asserções sobre o que o recibo IMPRIME seguiram o conteúdo pra cá — afirmar contra o
 * `deploy.yml` passaria a medir a ausência.
 */
const recibo = readFileSync(path.join(raiz, "infra/recibo-deploy.mjs"), "utf8");

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
    // `AGENTE_SEM_TOKEN` é a SEGUNDA exceção nomeada (#716): não é credencial, é um MODO — o
    // opt-in explícito ao "sem autenticação" que fez o servidor passar a falhar FECHADO. Entra
    // nesta lista pelo NOME, como o token, e a asserção abaixo prova que o valor dela é literal.
    const semExcecao = ativo.replace(/^\s*AGENTE_(SEM_)?TOKEN:.*$/gm, "");
    expect(semExcecao).not.toMatch(/KEY|SECRET|TOKEN|CREDENTIALS|MONGODB|DATABASE|REDIS|PUSHER|GOOGLE|NEXTAUTH/i);
  });

  it("`AGENTE_SEM_TOKEN` é literal \"1\" — um modo, nunca uma interpolação que traga outra coisa", () => {
    const linha = /^\s*AGENTE_SEM_TOKEN:\s*(.+)$/m.exec(ativo)?.[1] ?? "";
    expect(linha.trim()).toBe('"1"');
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

describe("AGENTE_ALLOW — a plumagem voltou, sem literal na expressão (F10c)", () => {
  /**
   * O tripwire da F10b funcionou: ele afirmava a AUSÊNCIA desta plumagem e falhou quando ela voltou,
   * forçando atualizar o registro. É isto aqui.
   *
   * A F10 pôs `${{ vars.AGENTE_ALLOW || '*' }}` e o GitHub recusou o ARQUIVO (startup failure, zero
   * jobs, deploy 567) — main ficou sem implantar. A F10c reintroduz a env com a forma `|| ''`, a
   * MESMA do AGENTE_URL, e põe o default `*` no SHELL, onde é texto e não token de expressão.
   *
   * Evidência que sustenta a hipótese (e que não a prova — o parser deles não tem substituto local):
   * o arquivo que implanta JÁ tem `*` em comentário, em valor YAML entre aspas (`"**.md"`) e dentro
   * do `script: |`. Então `*` no arquivo não é o problema; `*` DENTRO de `${{ }}` é a única coisa
   * nova que a F10 fez em posição parseada.
   */
  it("a env existe com a forma de `|| ''` — e NENHUM literal com asterisco na expressão", () => {
    expect(wf).toMatch(/AGENTE_ALLOW:\s*\$\{\{\s*vars\.AGENTE_ALLOW\s*\|\|\s*''\s*\}\}/);
    // a asserção que importa: nenhuma EXPRESSÃO com asterisco. Comentário pode (o arquivo que
    // implanta já tem), então a busca é dentro de `${{ ... }}` só.
    const expressoes = wf.match(/\$\{\{[^}]*\}\}/g) ?? [];
    expect(expressoes.filter((e) => e.includes("*"))).toEqual([]);
  });

  /**
   * O TETO DE 21.000 BYTES DO ESCALAR `script:` — o portão que faltava, e que teria pegado os
   * startup failures 572–578 antes do push.
   *
   * MEDIDO, não suposto, com o único juiz que existe (o push: o parser do GitHub não tem
   * substituto local). Variantes de tamanho crescente foram empurradas em branches próprias e o
   * veredito lido pela existência, ou não, de um run que falha na partida:
   *
   *     19.881 bytes → válido      (o main que implanta)
   *     20.181 → válido · 20.331 → válido · 20.581 → VÁLIDO
   *     21.010 → FALHA · 21.011 → FALHA · 21.035 → FALHA · 23.294 → FALHA
   *
   * Ultrapassar não é erro de passo: é o ARQUIVO INTEIRO recusado — zero jobs, e o `name` do run
   * degradando pro caminho do arquivo, que é a assinatura pela qual se reconhece isso de fora.
   *
   * CONTA BYTES, NÃO CARACTERES, e esta distinção é a razão de eu ter demorado a achar: um
   * enchimento ASCII de 20.217 CARACTERES passou, enquanto 20.621 caracteres COM ACENTO falharam.
   * Em UTF-8 cada acento e cada travessão do português custam 2 bytes — e o estilo da casa, de
   * comentar densamente o porquê, é justamente o que consome este orçamento quando mora DENTRO do
   * script. Comentário no nível do YAML (fora do bloco) é de graça: é pra lá que a explicação vai.
   */
  it("o escalar `script:` cabe no teto de 21.000 bytes do GitHub, com margem", () => {
    const linhas = wf.split("\n");
    const i = linhas.findIndex((l) => /^\s*script: \|\s*$/.test(l));
    expect(i, "não achei o `script: |` — a asserção seria vazia").toBeGreaterThan(-1);
    const corpo: string[] = [];
    for (const l of linhas.slice(i + 1)) {
      if (l.trim() === "") { corpo.push(""); continue; }
      if (!l.startsWith("            ")) break;        // 12 espaços = o recuo do bloco
      corpo.push(l.slice(12));
    }
    // GUARDA CONTRA EXTRAÇÃO VAZIA OU TRUNCADA: sem isto, um bug no laço acima faria o teste passar
    // medindo quase nada — portão verde e deploy quebrado, o pior resultado possível.
    const texto = corpo.join("\n");
    expect(texto, "extração falhou no começo do script").toContain("set -euo pipefail");
    expect(texto, "extração truncou antes do fim do script").toContain("Deploy concluído");
    expect(corpo.length, "o script tem centenas de linhas; isto pegou poucas").toBeGreaterThan(200);

    const bytes = Buffer.byteLength(texto, "utf8");
    const TETO = 21_000;      // 20.581 passa, 21.010 falha — medido por push
    const MARGEM = 1_500;     // pra uma linha nova não descobrir o teto em produção
    expect(bytes, `script com ${bytes} bytes; teto ${TETO}`).toBeLessThan(TETO - MARGEM);
  });

  it("nenhuma FORMA de expressão nova em relação ao arquivo que implanta", () => {
    // O que tornou a F10c segura não foi cuidado, foi não inventar forma: toda `${{ }}` daqui já
    // existia no deploy.yml que implantou nos deploys 561/562/565/568.
    const formas = new Set(
      (wf.match(/\$\{\{[^}]*\}\}/g) ?? []).map((e) => e.replace(/[A-Za-z_][A-Za-z0-9_]*/g, "N")),
    );
    expect([...formas].filter((f) => f.includes("*"))).toEqual([]);
  });

  it("cruza o SSH (lista `envs:`) e o default `*` é decidido no SHELL, não na expressão", () => {
    const lista = /envs:\s*([^\n]+)/.exec(wf)?.[1] ?? "";
    expect(lista.split(",").map((x) => x.trim())).toContain("AGENTE_ALLOW");
    expect(wf).toMatch(/if \[ -z "\$\{AGENTE_ALLOW:-\}" \]; then AGENTE_ALLOW='\*'; fi/);
    expect(wf).toMatch(/export AGENTE_ALLOW/);
  });

  it("o bloco de modo usa `set -f`: sem noglob um `*` sozinho vira lista de arquivos", () => {
    expect(wf).toMatch(/set -f/);
    expect(wf).toMatch(/INTERNET ABERTA/);
  });

  it("AGENTE_TOKEN vem de SECRET, não de Variable — é credencial, não configuração", () => {
    // Variable aparece no log do Actions; Secret é mascarado. Trocar um pelo outro aqui seria
    // publicar o token do navegador em todo deploy.
    expect(wf).toMatch(/AGENTE_TOKEN:\s*\$\{\{\s*secrets\.AGENTE_TOKEN\s*\}\}/);
    expect(wf).not.toMatch(/AGENTE_TOKEN:\s*\$\{\{\s*vars\./);
  });

  it("AGENTE_TOKEN cruza o SSH (lista `envs:`)", () => {
    const lista = /envs:\s*([^\n]+)/.exec(wf)?.[1] ?? "";
    expect(lista.split(",").map((x) => x.trim())).toContain("AGENTE_TOKEN");
  });

  it("A TRAVA: AGENTE_TOKEN NUNCA entra no laço `for k in` — aquele laço IMPRIME o que exporta", () => {
    // Esta é a asserção de segurança da plumbagem. O laço `for k in … printenv` ecoa VALOR no log
    // do deploy (é o recibo das flags públicas), então um segredo ali vira segredo publicado. A
    // regra da casa é "nome de env pode sair, valor não", e é aqui que ela deixa de ser intenção.
    const laco = /for k in ([^;]+);/.exec(wf)?.[1] ?? "";
    expect(laco, "o laço `for k in` não foi encontrado — a asserção seria vazia").not.toBe("");
    expect(laco.split(/\s+/)).not.toContain("AGENTE_TOKEN");
  });

  it("o token só é GRAVADO com valor: linha vazia apagaria a autenticação em vez de pô-la", () => {
    // Mesmo defeito que o molde do Resend evita: `echo AGENTE_TOKEN=` num .env.secrets existente
    // apagaria o token que já estava lá — e o container subiria sem autenticação, em silêncio.
    expect(wf).toMatch(/if \[ -n "\$\{AGENTE_TOKEN:-\}" \]; then/);
    expect(wf).toMatch(/grep -vE '\^AGENTE_TOKEN=' \.env\.secrets/);
  });

  it("o CÓDIGO de modo aberto continua inteiro — a capacidade nunca saiu", async () => {
    const { allowEhAberta, urlDoAgente } = await import("@/lib/agent/navegadorPolitica");
    expect(allowEhAberta(["*"])).toBe(true);
    expect(allowEhAberta(["*.edu.br"])).toBe(false);
    expect(urlDoAgente("https://qualquer-site-do-mundo.com/x", ["*"]).ok).toBe(true);
    expect(urlDoAgente("http://169.254.169.254/latest/meta-data/", ["*"]).ok).toBe(false);
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
    expect(recibo).toMatch(/onde=/);
    expect(recibo).toMatch(/CONTAINER INALCANÇÁVEL/);
  });

  it("o deploy INVOCA o recibo — mover o arquivo não pode órfã-lo em silêncio", () => {
    // Sem esta asserção, apagar a linha de invocação faria o recibo parar de sair e NENHUM teste
    // notaria: o arquivo continuaria existindo, bonito e nunca executado. Por STDIN de propósito
    // (`node < arquivo`): não existe questão de aspas nem de expansão do shell.
    expect(wf).toMatch(/exec -T web node < infra\/recibo-deploy\.mjs/);
  });

  it("o recibo não imprime VALOR de segredo — só nomes, booleanos e domínios", () => {
    // domínio de allowlist é público por definição (é o que a casa declara que lê); credencial não.
    expect(recibo).not.toMatch(/process\.env/);
    expect(recibo).not.toMatch(/SECRET|_KEY|TOKEN|CREDENTIALS/i);
  });
});
