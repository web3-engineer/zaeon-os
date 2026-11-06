/**
 * lib/rag/saude.ts — estado do SEGUNDO SERVIDOR (a Contabo) para /api/health. Molde de
 * lib/llm/saude.ts e lib/leitor/saude.ts.
 *
 * POR QUE EXISTE: a Zaeon roda em duas máquinas, e até agora o recibo só falava de UMA. O
 * `/api/health` publicava web, gateway, Leitor, agente, MCP — tudo na VPS da aplicação — e NADA
 * sobre a Contabo, que hospeda o pgvector do RAG, o Ollama e os TEI, alcançáveis só pela tailnet.
 * Consequência, dita pelo dono: se a Contabo cai, isso se descobre pelo RAG "parando de achar
 * coisa", não por recibo. Um servidor inteiro invisível de fora é o mesmo ponto cego que o trilho
 * do documento tinha até a #702.
 *
 *   "off"      → a env que aponta pra lá está vazia (desligado por configuração; lei 5)
 *   "on"       → respondeu
 *   "degraded" → configurado e não respondeu (tailnet caída, Postgres reiniciando, Ollama fora)
 *
 * NENHUM VALOR SAI DAQUI. Nem a URL, nem o host da tailnet, nem a senha do `RAG_PG_URL` — só as
 * três palavras acima. O IP `100.x` não é segredo, mas também não é informação que o health deva
 * publicar pra quem não precisa dela.
 */
import type { RagDb } from "./pg";

export type EstadoContabo = "off" | "on" | "degraded";

type Deps = {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  agora?: () => number;
  timeoutMs?: number;
  /** o banco (injetado nos testes; por padrão o pool preguiçoso de ./pg) */
  db?: RagDb;
};

const CACHE_MS = 60_000;
/**
 * PRAZO CURTO, e por um motivo medido: o `ragPg()` nasce com `connectionTimeoutMillis: 5000`, que é
 * o prazo certo pra uma INGESTÃO e errado pra um health — este endpoint é o health-gate do deploy e
 * o healthcheck do container, e 5 s de tailnet caída em cada chamada atrasaria os dois. O mesmo
 * raciocínio do `PRAZO_MS` de lib/ai/proNasPesadas: sonda é decisão acessória, e a resposta certa
 * quando ela não volta é "degraded" e seguir.
 */
const PRAZO_MS = 2000;

let cacheRag: { estado: EstadoContabo; chave: string; at: number } | null = null;
let cacheModelos: { estado: EstadoContabo; chave: string; at: number } | null = null;

/** só para teste: esvazia os dois caches (sem isto um teste contamina o outro) */
export function __resetContaboParaTeste(): void { cacheRag = null; cacheModelos = null; }

/** espera que NÃO segura o processo: sem o `unref` o timer atrasaria a saída do vitest e do worker */
function atraso(ms: number): Promise<"prazo"> {
  return new Promise((r) => { const t = setTimeout(() => r("prazo"), ms); (t as unknown as { unref?: () => void }).unref?.(); });
}

/** O pgvector do RAG (na Contabo, só na tailnet). `SELECT 1`: não lê tabela nenhuma. */
export async function estadoRag(d: Deps = {}): Promise<EstadoContabo> {
  const env = d.env ?? process.env;
  const url = env.RAG_PG_URL?.trim();
  if (!url) return "off";
  const agora = d.agora ?? Date.now;
  if (cacheRag && cacheRag.chave === url && agora() - cacheRag.at < CACHE_MS) return cacheRag.estado;

  let estado: EstadoContabo = "degraded";
  try {
    // o import é TARDIO de propósito: sem ele, importar este módulo abriria o caminho do `pg` no
    // `next build` (o pool é preguiçoso, mas o módulo não precisa nem ser carregado sem RAG_PG_URL).
    const db = d.db ?? (await import("./pg")).ragPg();
    // O `.catch` aqui NÃO é contra unhandledRejection: `Promise.race` anexa handler a TODOS os seus
    // argumentos, então a promessa perdedora já tem dono e uma rejeição tardia é ignorada em
    // silêncio. (O caso de lib/ai/proNasPesadas era outro: lá havia um `.then` DEPOIS do argumento
    // da corrida, e era esse derivado que ficava órfão.) O `.catch` está aqui só para a corrida
    // devolver uma PALAVRA em vez de estourar: com `SELECT 1` qualquer erro é indisponibilidade.
    const consulta = db.query("SELECT 1").then(() => "ok" as const).catch(() => "falhou" as const);
    estado = (await Promise.race([consulta, atraso(d.timeoutMs ?? PRAZO_MS)])) === "ok" ? "on" : "degraded";
  } catch {
    estado = "degraded";   // o próprio `ragPg()` lançou (env ausente numa corrida)
  }
  cacheRag = { estado, chave: url, at: agora() };
  return estado;
}

/** O gateway LiteLLM da Contabo (Ollama + TEI por trás dele): os grupos `zaeon-local-*`. */
export async function estadoModelosLocais(d: Deps = {}): Promise<EstadoContabo> {
  const env = d.env ?? process.env;
  const url = (env.CONTABO_LLM_URL || env.LOCAL_LLM_URL)?.trim();
  if (!url) return "off";
  const agora = d.agora ?? Date.now;
  if (cacheModelos && cacheModelos.chave === url && agora() - cacheModelos.at < CACHE_MS) return cacheModelos.estado;

  // o LOCAL_LLM_URL aponta pro endpoint de chat (`/v1/chat/completions`); a sonda é na RAIZ do
  // LiteLLM, então o caminho é aparado até a base — senão a sonda bateria em 404 e diria
  // "degraded" num gateway de pé, que é recibo mentindo na direção pessimista.
  const base = url.replace(/\/+$/, "").replace(/\/v1(\/.*)?$/, "");
  let estado: EstadoContabo = "degraded";
  try {
    // cache:"no-store": o data cache do Next congelaria o 1º resultado (mesmo defeito que o PR-G1 pegou)
    const r = await (d.fetchImpl ?? fetch)(`${base}/health/liveliness`, { cache: "no-store", signal: AbortSignal.timeout(d.timeoutMs ?? PRAZO_MS) });
    estado = r.ok ? "on" : "degraded";
  } catch { estado = "degraded"; }
  cacheModelos = { estado, chave: url, at: agora() };
  return estado;
}

/** As duas pontas da Contabo numa chamada, em PARALELO (o health não paga as duas em série). */
export async function estadoContabo(d: Deps = {}): Promise<{ rag: EstadoContabo; modelos: EstadoContabo }> {
  const [rag, modelos] = await Promise.all([
    estadoRag(d).catch(() => "degraded" as const),
    estadoModelosLocais(d).catch(() => "degraded" as const),
  ]);
  return { rag, modelos };
}
