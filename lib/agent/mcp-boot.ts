/**
 * lib/agent/mcp-boot.ts — liga os CONECTORES MCP no boot do servidor (F5 de
 * docs/PLANO_HARNESS_AGENTICO.md). Mesmo padrão de `lib/agent/memory-boot.ts`: flag, nunca derruba
 * o boot, e sem a flag nada acontece.
 *
 * O QUE ESTAVA FALTANDO: `lib/agent/mcp.ts` está escrito desde o PASSO 7 — cliente, handshake,
 * mapeamento pra `ToolDef`, dois canais de erro, catálogo — e **nunca é chamado por ninguém**. O
 * modelo `Connector` existe no Prisma e também nunca é lido. Esta fase é a ligação, não o cliente.
 *
 * ESCOLHA SÓ PELO CATÁLOGO, nunca por endpoint solto no env: `MCP_CONECTORES="fetch,git"` escolhe
 * entradas de `MCP_CATALOG`. Endpoint arbitrário vindo de env daria ao modelo uma superfície que
 * ninguém revisou; acrescentar um servidor é uma linha no catálogo, num PR que alguém lê.
 *
 * CONECTA UMA VEZ, NO BOOT, e não por turno: o handshake de um servidor stdio custa segundos
 * (`npx` pode até baixar o pacote na primeira vez) — pagar isso em cada turno do chat seria
 * inaceitável, e o `registerMcpConnector` já abre o cliente por-chamada na execução.
 *
 * TUDO QUE ENTRA É SÓ LEITURA (`RISCO_MAXIMO_CHAT` em lib/agent/mcp.ts) — ver lá o motivo, que é de
 * segurança e não de zelo.
 */
import { MCP_CATALOG, registerMcpConnector, reclassificadorDeMapa, type CatalogEntry, type ConnectFn, type ConnectorStatus } from "@/lib/agent/mcp";

type Env = Record<string, string | undefined>;

export const ENV_CONECTORES = "MCP_CONECTORES";

export type EstadoConector = {
  name: string;
  status: ConnectorStatus;
  /** quantas tools ENTRARAM no registry (já filtradas pela política de risco) */
  tools: number;
  /** quantas foram recusadas por risco — o dono precisa VER isto, não adivinhar */
  recusadas: number;
  /** o motivo CRU (ECONNREFUSED…), não a frase amigável do chat: este log é de ops */
  erro?: string;
};

export type EstadoMcp = {
  ligado: boolean;
  /** o SDK está instalado? (`npm i @modelcontextprotocol/sdk`) */
  sdk: boolean;
  conectores: EstadoConector[];
};

/**
 * O KILL-SWITCH. A flag é a própria lista, então "vazio" sempre foi o desligado natural — só que
 * desde que o `scholar` passou a vir LIGADO POR PADRÃO (deploy.yml e compose), vazio deixou de ser
 * alcançável: `${{ vars.MCP_CONECTORES || 'scholar' }}` cai no padrão justamente quando a Variable
 * está vazia. Sem um valor que diga "nenhum", ligar por padrão seria ligar sem rollback — e flag sem
 * rollback é o que esta série se recusou a fazer em toda fase.
 *
 * Mesmo vocabulário do `graficoLigado` (lib/agent/graficosDoTurno), pra não inventar um segundo
 * dialeto de "off" no mesmo harness.
 */
const DESLIGADO = /^(0|off|false|nao|não|no|nenhum|none)$/i;

/** A flag é a própria lista: sem conector pedido — ou com o kill-switch — não há MCP. */
export function mcpLigado(env: Env = process.env): boolean {
  const v = env[ENV_CONECTORES]?.trim();
  return !!v && !DESLIGADO.test(v);
}

/** "fetch, git, inventado" → as entradas do catálogo + o que não existe nele (pra logar). */
export function conectoresPedidos(env: Env = process.env): { escolhidos: CatalogEntry[]; desconhecidos: string[] } {
  const bruto = String(env[ENV_CONECTORES] ?? "").trim();
  // o kill-switch não é "nome desconhecido": sem isto, `MCP_CONECTORES=0` logaria «"0" não está em
  // MCP_CATALOG» em todo boot — um aviso que parece erro de digitação e não é.
  if (!bruto || DESLIGADO.test(bruto)) return { escolhidos: [], desconhecidos: [] };
  const nomes = bruto
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  const escolhidos: CatalogEntry[] = [];
  const desconhecidos: string[] = [];
  const vistos = new Set<string>();
  for (const n of nomes) {
    if (vistos.has(n)) continue;
    vistos.add(n);
    const e = MCP_CATALOG.find((c) => c.name.toLowerCase() === n);
    // `indisponivel` cai junto com o nome inventado, de propósito: endpoint que não existe daria 10 s
    // de handshake condenado por boot. O aviso diz o motivo (está na `note` do catálogo).
    if (e && !e.indisponivel) escolhidos.push(e);
    else desconhecidos.push(e?.indisponivel ? `${n} (${e.note ?? "indisponível"})` : n);
  }
  return { escolhidos, desconhecidos };
}

/**
 * O SDK está instalado?
 *
 * 🔴 ESPECIFICADOR LITERAL, e a versão anterior disto era o defeito que derrubou o deploy #546.
 * O código dizia: "specifier em variável (não-literal) de propósito: sem isso o tsc tentaria
 * resolver um pacote que pode não existir, e o bundler tentaria empacotá-lo". A intenção estava
 * certa **enquanto o SDK estava ausente**. Com ele presente, o truque virou o bug: o webpack não
 * consegue analisar `import(variavel)`, então resolve contra o próprio mapa de módulos — onde o SDK
 * nunca entrou, justamente porque a variável o escondeu do bundler. Resultado medido rodando o
 * build de verdade: `sdkPresente()` devolvendo FALSE com o pacote instalado, e o boot logando
 * "o SDK não está instalado — rode `npm i`" tendo-o em `node_modules`.
 *
 * Agora o especificador é literal (o `tsc` resolve: o pacote é dependência pinada) e o pacote está
 * em `serverComponentsExternalPackages` (next.config.mjs), que é o mesmo tratamento do Prisma: o
 * Next não empacota e usa o require de runtime.
 *
 * `importar` continua injetável porque os testes precisam simular a AUSÊNCIA do SDK — que é um
 * estado real (quem rodar sem `npm i` cai nele).
 */
export async function sdkPresente(importar?: (m: string) => Promise<unknown>): Promise<boolean> {
  const mod = "@modelcontextprotocol/sdk/client/index.js";
  try {
    await (importar ? importar(mod) : import("@modelcontextprotocol/sdk/client/index.js"));
    return true;
  } catch {
    return false;
  }
}

/**
 * O último estado conhecido — é o que o `/api/health` mostra pro smoke-test do dono.
 *
 * NO globalThis, não em variável do módulo, pelo mesmo motivo que `lib/agent/memory-provider.ts` já
 * documenta: o boot (`instrumentation.ts`) e as rotas do Next podem carregar **cópias diferentes
 * deste módulo no mesmo processo**, e aí o que o boot grava não vale na rota.
 *
 * Isto não é precaução: foi o que aconteceu no deploy #546. `MCP_CONECTORES=scholar` ligado e o
 * `/api/health` respondendo `mcp=off` — não porque o conector caiu, mas porque a rota lia uma cópia
 * onde `estado` nunca deixava de ser nulo. Recibo mentindo por bundling, que é pior que recibo
 * nenhum: ele me fez procurar o defeito na env plumbing por um deploy inteiro.
 */
const g = globalThis as unknown as { __zaeonMcpEstado?: EstadoMcp | null; __zaeonMcpLigando?: boolean };

/**
 * Boot EM CURSO. O `instrumentation` chama `ligarMcp()` sem `await` de propósito (um stdio fora do
 * ar custa até 10 s de handshake POR conector, e isso atrasaria o readiness do container) — então
 * existe uma janela de alguns segundos em que os conectores estão subindo e `estado` ainda é nulo.
 *
 * Sem esta marca o `/api/health` responderia "off" nessa janela, que é indistinguível de "ninguém
 * pediu conector" — e o recibo do deploy (§8.5) imprimiria um `mcp=off` FALSO justamente no momento
 * em que ele é lido. Achado do Sourcery na #672, e vale o cinto: um recibo que mente é pior que
 * nenhum recibo.
 *
 * Também no globalThis, e pela mesma razão do `estado`: a marca só serve se a rota que responde o
 * health for a mesma que a vê.
 */

/** SÓ PARA TESTES. */
export function _zerarEstadoMcp(): void {
  g.__zaeonMcpEstado = null;
  g.__zaeonMcpLigando = false;
}

export function estadoMcp(): EstadoMcp | null {
  return g.__zaeonMcpEstado ?? null;
}

/**
 * Liga os conectores pedidos. NUNCA lança: conector fora do ar vira `status: "erro"` e o chat segue
 * sem as tools dele — exatamente como o resto do harness trata dependência externa.
 */
export async function ligarMcp(
  env: Env = process.env,
  opts: { connect?: ConnectFn; importar?: (m: string) => Promise<unknown> } = {},
): Promise<EstadoMcp> {
  if (!mcpLigado(env)) {
    g.__zaeonMcpEstado = { ligado: false, sdk: false, conectores: [] };
    return g.__zaeonMcpEstado;
  }
  g.__zaeonMcpLigando = true;
  try {
    g.__zaeonMcpEstado = await conectarTodos(env, opts);
  } finally {
    g.__zaeonMcpLigando = false;
  }
  return g.__zaeonMcpEstado;
}

/** O corpo do boot. Separado só pra que o `finally` do `ligando` envolva TUDO (inclusive o SDK). */
async function conectarTodos(env: Env, opts: { connect?: ConnectFn; importar?: (m: string) => Promise<unknown> }): Promise<EstadoMcp> {
  const { escolhidos, desconhecidos } = conectoresPedidos(env);
  for (const n of desconhecidos) {
    console.warn(`[mcp] "${n}" não está em MCP_CATALOG — ignorado (acrescentar um servidor é uma linha no catálogo).`);
  }
  // sem SDK, nem tenta: o handshake falharia em cada conector e o log viraria ruído
  const sdk = opts.connect ? true : await sdkPresente(opts.importar);
  if (!sdk) {
    console.warn(`[mcp] ${escolhidos.length} conector(es) pedido(s), mas o SDK não está instalado — rode \`npm i @modelcontextprotocol/sdk\`. Nenhuma tool MCP foi registrada.`);
    return { ligado: true, sdk: false, conectores: [] };
  }

  const conectores: EstadoConector[] = [];
  for (const cfg of escolhidos) {
    try {
      // A política POR CONECTOR vem da entrada do catálogo, não de um caso-especial aqui: o boot
      // continua genérico. Um conector sem `riscoMaximo`/`reclassificar` passa `{}` e nada muda —
      // é o SolidCraft (lib/cad/mcp) que carrega o teto `write` e a reclassificação de execute/batch.
      const h = await registerMcpConnector(cfg, {
        ...(opts.connect ? { connect: opts.connect } : {}),
        ...(cfg.riscoMaximo ? { riscoMaximo: cfg.riscoMaximo } : {}),
        ...(cfg.reclassificar ? { reclassificar: reclassificadorDeMapa(cfg.reclassificar) } : {}),
      });
      conectores.push({
        name: cfg.name, status: h.status, tools: h.admitidas ?? 0, recusadas: h.recusadas?.length ?? 0,
        ...(h.motivo || h.error ? { erro: h.motivo ?? h.error } : {}),
      });
      if (h.status === "conectado") {
        console.log(`[mcp] ${cfg.name}: ${h.admitidas ?? 0} tool(s) de leitura registrada(s)${h.recusadas?.length ? `, ${h.recusadas.length} recusada(s) por risco: ${h.recusadas.join(", ")}` : ""}`);
      } else {
        console.warn(`[mcp] ${cfg.name}: ${h.status}${h.motivo ?? h.error ? ` — ${h.motivo ?? h.error}` : ""}`);
      }
    } catch (e) {
      // o `registerMcpConnector` não deveria lançar; cinto, porque isto roda no boot
      const erro = (e as Error)?.message ?? String(e);
      conectores.push({ name: cfg.name, status: "erro", tools: 0, recusadas: 0, erro });
      console.warn(`[mcp] ${cfg.name} falhou no boot:`, erro);
    }
  }
  return { ligado: true, sdk: true, conectores };
}

/** O resumo pro `/api/health`: "off" · "ligando" · "sem_sdk" · "on (N tools)" · "degraded". */
export function resumoMcp(e: EstadoMcp | null = g.__zaeonMcpEstado ?? null): string {
  // "ligando" ≠ "off": sem estado ainda E com boot em curso, dizer "off" seria mentir (ver a marca
  // `ligando`). `ligado: false` é outra coisa — é ninguém ter pedido conector, e esse "off" é fiel.
  if (!e) return g.__zaeonMcpLigando ? "ligando" : "off";
  if (!e.ligado) return "off";
  if (!e.sdk) return "sem_sdk";
  const tools = e.conectores.reduce((n, c) => n + c.tools, 0);
  const conectados = e.conectores.filter((c) => c.status === "conectado").length;
  if (!conectados) return "degraded";
  // CONECTADO COM ZERO TOOL NÃO É "on". O handshake deu certo e o chat ganhou nada — acontece
  // quando a política de risco recusa tudo (`riskFromAnnotations` devolve `write` sem hint, então um
  // servidor sem annotations contribui zero). Dizer "on" aqui faria o recibo do deploy afirmar uma
  // capacidade que não existe, que é o defeito que esta série inteira persegue.
  if (!tools) return `degraded (${conectados}/${e.conectores.length}, 0 tools)`;
  return conectados === e.conectores.length ? `on (${tools} tools)` : `degraded (${conectados}/${e.conectores.length}, ${tools} tools)`;
}
