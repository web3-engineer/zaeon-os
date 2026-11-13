/**
 * infra/forja-engine/vetting.mjs — a LÓGICA PURA de segurança da ponte da Forja. Sem IO (o IO fica no bridge).
 *
 * A Forja consome a SAÍDA dos engines (o grafo/árvore), nunca o código-fonte deles. Dois engines, e só dois,
 * são permitidos — uma ALLOWLIST fechada é mais segura que a deny-list por prefixo do REA, porque aqui o
 * universo de comandos é conhecido e minúsculo:
 *   - graphify  → `graphify extract <repo> --no-viz`  (Graphify-Labs/graphify, `graphifyy` no PyPI, Apache-2.0/MIT)
 *                  escreve `graphify-out/graph.json` no diretório de trabalho.
 *   - understand → envolve o Claude Code headless com o plugin understand-anything apontado no repo-alvo
 *                  (Egonex-AI/Understand-Anything, MIT) → escreve `.ua/knowledge-graph.json` DENTRO do repo.
 *
 * O alvo SEMPRE vem de fora (URL git de um host permitido, clonado raso e só-leitura, ou um tarball no corpo);
 * NUNCA um caminho do host. Os argumentos extras passam por um filtro que recusa metacaractere de shell,
 * caminho absoluto, `..` e flags perigosas. Tudo aqui é PURO e testável sem os binários (como o audit do REA).
 */

/** Os hosts de onde a ponte aceita clonar um repo-alvo (https, sem credencial embutida). */
export const ALLOW_HOSTS = ["github.com", "gitlab.com", "codeberg.org", "bitbucket.org"];

/**
 * O catálogo FECHADO de engines. `saidaRelativaA`: "cwd" = o arquivo nasce no diretório de trabalho do job;
 * "repo" = nasce dentro do próprio repo analisado. `precisaBackend` = exige o gateway de LLM (provisionamento
 * na Contabo — relatar como bloqueio, não girar à toa). `baseArgs` é FIXO; nada que o chamador mande o altera.
 */
export const ENGINES = {
  graphify: {
    bin: "graphify",
    baseArgs: ["extract", "--no-viz"],
    alvoPosicional: true,            // o repo entra como argumento posicional de `extract`
    saida: "graphify-out/graph.json",
    saidaRelativaA: "cwd",
    precisaBackend: true,           // `graphify extract --backend ...` usa um backend; o tree-sitter é estático mas o extract documentado chama o backend
    licenca: "Apache-2.0 OR MIT",
    repo: "Graphify-Labs/graphify",
  },
  understand: {
    // NÃO há CLI próprio: a análise é um slash command do Claude Code. Na Contabo, FORJA_UNDERSTAND_CMD aponta
    // pro wrapper que roda o Claude Code headless com o plugin no repo-alvo. Aqui só validamos e mapeamos a saída.
    bin: "__wrapper__",
    envCmd: "FORJA_UNDERSTAND_CMD",
    baseArgs: [],
    alvoPosicional: true,
    saida: ".ua/knowledge-graph.json",
    saidaRelativaA: "repo",
    precisaBackend: true,
    licenca: "MIT",
    repo: "Egonex-AI/Understand-Anything",
  },
};

/** Resolve o engine pelo nome, ou lança. PURA. */
export function resolverEngine(nome) {
  const e = ENGINES[String(nome)];
  if (!e) throw new Error(`engine desconhecido: ${nome} (use: ${Object.keys(ENGINES).join(", ")})`);
  return e;
}

/**
 * O host da URL é permitido pra clonar? https, sem userinfo (nada de user:senha@), e host na allowlist. PURA.
 * Devolve { ok, host?, erro? } em vez de lançar, pra ponte responder 400 limpo.
 */
export function hostPermitido(url, allow = ALLOW_HOSTS) {
  let u;
  try { u = new URL(String(url)); } catch { return { ok: false, erro: "url inválida" }; }
  if (u.protocol !== "https:") return { ok: false, erro: "só https" };
  if (u.username || u.password) return { ok: false, erro: "url não pode trazer credencial" };
  const host = u.hostname.toLowerCase();
  if (!allow.includes(host)) return { ok: false, erro: `host não permitido: ${host}` };
  return { ok: true, host };
}

/** Prefixos de flag perigosos: executar, avaliar, abrir shell, trocar config por caminho arbitrário. */
export const FLAGS_PERIGOSAS = ["--exec", "--eval", "--shell", "--script", "--command", "--cmd", "-e", "--config", "--backend-path", "--plugin"];

/**
 * Um argumento extra é seguro? Recusa metacaractere de shell, caminho absoluto, travessia `..`, flag perigosa
 * e tamanho absurdo. O alvo (repo) NÃO passa por aqui — ele vem clonado/extraído pela ponte, não como arg. PURA.
 */
export function argSeguro(arg) {
  const a = String(arg);
  if (a.length === 0 || a.length > 256) return false;
  if (/[;&|`$(){}<>\\\n\r"'*?~]/.test(a)) return false;   // metacaractere de shell / glob
  if (a.startsWith("/")) return false;                      // caminho absoluto
  if (a.split("/").includes("..")) return false;            // travessia
  const base = a.split("=")[0].toLowerCase();
  if (FLAGS_PERIGOSAS.includes(base)) return false;
  return true;
}

/** Filtra os args extras, mantendo só os seguros. PURA. */
export function argsSeguros(args) {
  return (Array.isArray(args) ? args : []).map(String).filter(argSeguro);
}

/**
 * Monta o argv final do engine (sem rodar nada). O repo-alvo (já no disco) entra como posicional quando o
 * engine pede. PURA — a ponte só passa isto pro spawn. Devolve { bin, argv }.
 */
export function montarComando(engine, repoDir, extras = []) {
  const e = typeof engine === "string" ? resolverEngine(engine) : engine;
  const argv = [...e.baseArgs];
  if (e.alvoPosicional) argv.push(repoDir);
  for (const x of argsSeguros(extras)) argv.push(x);
  return { bin: e.bin, argv };
}

/** O caminho da saída do engine, resolvido contra o diretório certo. PURA (quem junta é a ponte). */
export function caminhoSaida(engine, { cwd, repoDir }) {
  const e = typeof engine === "string" ? resolverEngine(engine) : engine;
  const base = e.saidaRelativaA === "repo" ? repoDir : cwd;
  return { base, rel: e.saida };
}
