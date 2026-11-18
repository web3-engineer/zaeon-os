/**
 * infra/rea-engine/sessoes.mjs — SESSÕES do REA: um `rea mcp` vivo por sessão, como o REA local (rea.tools).
 *
 * Por que: o REA rende quando o agente faz PERGUNTAS PEQUENAS numa sessão que lembra o alvo (open_binary →
 * search_strings, inspect_analysis_view por página, recover_javascript_sources → analyze_javascript_application de UM
 * módulo…). Uma chamada de CLI "analise tudo" num bundle de 6 MB estoura memória/prazo em qualquer máquina (provado:
 * Contabo e um M1, 29 min, provider_timeout). A sessão é o modo de uso que funciona.
 *
 * Cada sessão tem: pasta própria (os caminhos ficam presos nela — politica.mjs), proxy de saída próprio (TODO fetch do
 * REA sai por ele: só IP público, 80/443), e — se a pessoa declarou domínios sob o Termo — um Chromium próprio, criado
 * na 1ª ferramenta web, atrás do mesmo proxy. Dono = hash que o app manda; outra pessoa não usa a sessão.
 */
import { spawn } from "node:child_process";
import { mkdtemp, open as abrirArquivo, readdir, rm, stat, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { abrirProxySaida, argsChromium, CHROMIUM, esperarPagina, portaCdp } from "./web-bundle.mjs";
import { classificar, dentroDosDominios, normalizarDominio, prenderCaminhos, reescreverWeb } from "./politica.mjs";

const num = (v, p) => (Number(v) > 0 ? Number(v) : p);
export const LIMITES = {
  max: num(process.env.REA_MAX_SESSOES, 2),                       // núcleos 0–3 divididos com a ChipFlow
  ociosoMs: num(process.env.REA_SESSAO_OCIOSA_MS, 20 * 60_000),
  vidaMs: num(process.env.REA_SESSAO_VIDA_MS, 2 * 3600_000),
  ferramentaMs: num(process.env.REA_SESSAO_FERRAMENTA_MS, 20 * 60_000),
  saidaBytes: 4 * 1024 * 1024,
};

/** as pseudo-ferramentas da ponte (não são do REA): abrir página no navegador da sessão e ver os arquivos da sessão */
export const PSEUDO = {
  zaeon_abrir_pagina: "Abre uma URL de um domínio DECLARADO no navegador da sessão e devolve { target_id, cdp_endpoint, url } para as ferramentas web (inspect_web_page, observe_web_session, capture_browser_scenario…).",
  zaeon_arquivos: "Lista os arquivos da pasta da sessão (saídas de export_web_scripts, recover_javascript_sources, evidências salvas). Caminhos relativos a ela valem nos argumentos.",
  zaeon_buscar: "Busca uma regex (JavaScript, flag i opcional) num arquivo da sessão ou num artefato (handle://…) e devolve até `max` ocorrências com o offset em bytes e `contexto` caracteres em volta. É o grep do agente: use no código recuperado (recuperado/modules/…) pra achar rotas, chamadas de API, tabelas, nomes.",
  zaeon_ajuda: "Devolve a descrição completa e o schema de entrada de UMA ferramenta da sessão: { nome }.",
  zaeon_ler: "Lê um trecho de um arquivo da sessão ou de um artefato: { caminho, inicio (offset em bytes), tamanho (máx. 65536) }. Use depois do zaeon_buscar pra ler a região inteira.",
};
const MAX_LER = 65_536, MAX_BUSCA_BYTES = 64 * 1024 * 1024;

/** cliente MCP mínimo sobre stdio (JSON por linha) */
function clienteMcp(proc) {
  let buf = "", seq = 0;
  const pend = new Map();
  proc.stdout.on("data", (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const l = buf.slice(0, i); buf = buf.slice(i + 1);
      if (!l.trim()) continue;
      let m; try { m = JSON.parse(l); } catch { continue; }
      if (m.id != null && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); clearTimeout(p.to); p.ok(m); }
    }
  });
  const falharTudo = (e) => { for (const [, p] of pend) { clearTimeout(p.to); p.ok({ error: { message: e } }); } pend.clear(); };
  proc.on("exit", () => falharTudo("o rea mcp saiu"));
  return {
    pedir: (method, params, prazoMs = 60_000) => new Promise((ok) => {
      const id = ++seq;
      const to = setTimeout(() => { pend.delete(id); ok({ error: { message: `prazo de ${Math.round(prazoMs / 1000)} s` } }); }, prazoMs);
      pend.set(id, { ok, to });
      proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    }),
    avisar: (method, params) => proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n"),
  };
}

export function criarGerente({ cacheDir, matarJob, envBase = {}, limites = LIMITES, spawnar = spawn }) {
  const sessoes = new Map();

  const resolverHandle = (h, nome) => {
    // síncrono: a política só precisa do caminho; quem não existir falha no REA com erro claro
    if (!/^[0-9a-f]{32}$/.test(h)) return null;
    const base = join(cacheDir, h);
    if (nome) return /^[A-Za-z0-9._-]+$/.test(nome) && nome !== ".scope.json" ? join(base, nome) : null;
    return { base };   // marcador: o 1º arquivo é resolvido antes da chamada (resolverHandles)
  };
  /** troca `{ base }` (handle sem nome) pelo 1º arquivo da pasta do handle */
  async function resolverHandles(x) {
    if (Array.isArray(x)) return Promise.all(x.map(resolverHandles));
    if (x && typeof x === "object" && typeof x.base === "string" && Object.keys(x).length === 1) {
      const arqs = (await readdir(x.base).catch(() => [])).filter((n) => n !== ".scope.json");
      if (!arqs.length) throw new Error("handle_inexistente (expirou?)");
      return join(x.base, arqs[0]);
    }
    if (x && typeof x === "object") return Object.fromEntries(await Promise.all(Object.entries(x).map(async ([k, v]) => [k, await resolverHandles(v)])));
    return x;
  }

  async function fechar(id) {
    const s = sessoes.get(id); if (!s) return false;
    sessoes.delete(id);
    try { await matarJob(s.jobId, s.proc?.pid); } catch { /* já saiu */ }
    if (s.navegador?.proc?.pid) { try { process.kill(-s.navegador.proc.pid, "SIGKILL"); } catch { /* já saiu */ } }
    await s.proxy?.fechar().catch(() => {});
    await rm(s.dir, { recursive: true, force: true }).catch(() => {});
    return true;
  }

  async function criar({ dono, dominios = [] }) {
    if (!/^[0-9a-f]{64}$/.test(String(dono || ""))) throw new Error("dono_invalido");
    const doms = [...new Set(dominios.map(normalizarDominio))].slice(0, 20);
    // cheio: fecha a mais ociosa da MESMA pessoa; se não houver, recusa
    if (sessoes.size >= limites.max) {
      const minha = [...sessoes.values()].filter((s) => s.dono === dono && !s.ocupada).sort((a, b) => a.uso - b.uso)[0];
      if (minha) await fechar(minha.id); else throw new Error("sessoes_cheias");
    }
    const id = randomBytes(16).toString("hex");
    const dir = await mkdtemp(join(tmpdir(), "rea-sessao-"));
    const proxy = await abrirProxySaida();
    const jobId = randomBytes(8).toString("hex");
    const env = {
      ...envBase, REA_JOB: jobId,
      NODE_USE_ENV_PROXY: "1", HTTP_PROXY: `http://127.0.0.1:${proxy.porta}`, HTTPS_PROXY: `http://127.0.0.1:${proxy.porta}`, NO_PROXY: "127.0.0.1",
      // a captura de uma página com bundle de vários MB passa dos 10 MiB padrão do canal stdio do MCP
      REA_MCP_MAX_RESPONSE_BYTES: String(64 * 1024 * 1024),
    };
    const proc = spawnar("rea", ["mcp"], { cwd: dir, env, stdio: ["pipe", "pipe", "ignore"], detached: true });
    const s = { id, dono, dominios: doms, dir, proc, jobId, proxy, navegador: null, origensAbertas: new Set(), ferramentas: new Map(), criada: Date.now(), uso: Date.now(), ocupada: false, mcp: clienteMcp(proc) };
    sessoes.set(id, s);
    proc.on("exit", () => { if (sessoes.get(id) === s) void fechar(id); });
    const ini = await s.mcp.pedir("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "zaeon-ponte", version: "1" } }, 60_000);
    if (ini.error) { await fechar(id); throw new Error(`rea mcp não iniciou: ${ini.error.message}`); }
    s.mcp.avisar("notifications/initialized", {});
    const tl = await s.mcp.pedir("tools/list", {}, 60_000);
    for (const t of tl.result?.tools ?? []) {
      const nivel = classificar(t.name);
      if (nivel === "negada" || (nivel === "web" && !doms.length)) continue;
      s.ferramentas.set(t.name, { nivel, props: new Set(Object.keys(t.inputSchema?.properties ?? {})), descricao: String(t.description || ""), schema: t.inputSchema ?? null });
    }
    return { sessao: id, dominios: doms, ferramentas: listar(s) };
  }

  const listar = (s) => [
    ...Object.entries(PSEUDO).filter(([n]) => n !== "zaeon_abrir_pagina" || s.dominios.length).map(([nome, descricao]) => ({ nome, nivel: "ponte", descricao })),
    // curta: nome + 1ª frase (a lista inteira cabe no contexto de um modelo); o resto vem do zaeon_ajuda
    ...[...s.ferramentas].map(([nome, f]) => ({ nome, nivel: f.nivel, descricao: (f.descricao.split(/(?<=\.)\s/)[0] || "").slice(0, 140) })),
  ];

  async function garantirNavegador(s) {
    if (s.navegador) return s.navegador;
    const perfil = join(s.dir, ".navegador");
    const proc = spawnar(CHROMIUM, argsChromium({ perfil, portaProxy: s.proxy.porta }), { stdio: "ignore", detached: true, env: { ...envBase, REA_JOB: s.jobId } });
    const cdp = await portaCdp(perfil, 20_000);
    s.navegador = { proc, cdp: `http://127.0.0.1:${cdp}` };
    return s.navegador;
  }

  async function pseudo(s, nome, args) {
    if (nome === "zaeon_arquivos") {
      const out = [];
      const andar = async (d, rel) => { for (const n of await readdir(d).catch(() => [])) { if (n === ".navegador") continue; const p = join(d, n), st = await stat(p).catch(() => null); if (!st) continue; if (st.isDirectory()) { if (out.length < 400) await andar(p, `${rel}${n}/`); } else if (out.length < 400) out.push({ caminho: `${rel}${n}`, bytes: st.size }); } };
      await andar(s.dir, "");
      return { raiz: s.dir, arquivos: out };
    }
    if (nome === "zaeon_ajuda") {
      const f = s.ferramentas.get(String(args?.nome || ""));
      if (!f) throw new Error(`ferramenta_desconhecida: ${String(args?.nome || "").slice(0, 60)}`);
      return { nome: args.nome, nivel: f.nivel, descricao: f.descricao, schema: f.schema };
    }
    if (nome === "zaeon_buscar" || nome === "zaeon_ler") {
      // "path" é chave de caminho pra política: relativo vira <sessão>/…, absoluto fora dela é recusado
      const caminho = (await resolverHandles(prenderCaminhos({ path: String(args?.caminho || "") }, { raiz: s.dir, resolverHandle }))).path;
      const st = await stat(caminho).catch(() => null);
      if (!st?.isFile()) throw new Error("caminho_inexistente");
      if (nome === "zaeon_ler") {
        const inicio = Math.max(0, Math.floor(Number(args?.inicio) || 0)), tam = Math.min(MAX_LER, Math.max(1, Math.floor(Number(args?.tamanho) || 16_384)));
        const fh = await abrirArquivo(caminho, "r");
        try { const b = Buffer.alloc(tam); const { bytesRead } = await fh.read(b, 0, tam, inicio); return { caminho: String(args.caminho), inicio, bytes: bytesRead, total: st.size, texto: b.subarray(0, bytesRead).toString("utf8") }; }
        finally { await fh.close(); }
      }
      if (st.size > MAX_BUSCA_BYTES) throw new Error("arquivo grande demais pra busca (64 MB)");
      const fonte = String(args?.padrao || "");
      if (!fonte || fonte.length > 400) throw new Error("padrao: regex de 1 a 400 caracteres");
      let re; try { re = new RegExp(fonte, String(args?.flags || "").includes("i") ? "gi" : "g"); } catch (e) { throw new Error(`padrao_invalido: ${e.message}`); }
      const n = (v, p) => (v === undefined || v === null || v === "" || !Number.isFinite(Number(v)) ? p : Math.floor(Number(v)));   // 0 é valor, não "padrão"
      const max = Math.min(500, Math.max(1, n(args?.max, 40))), ctx = Math.min(600, Math.max(0, n(args?.contexto, 160)));
      const { readFile } = await import("node:fs/promises");
      const texto = await readFile(caminho, "utf8");
      const achados = []; let total = 0; const t0 = Date.now();
      for (const m of texto.matchAll(re)) {
        total++;
        if (achados.length < max) achados.push({ offset: Buffer.byteLength(texto.slice(0, m.index)), trecho: texto.slice(Math.max(0, m.index - ctx), m.index + m[0].length + ctx) });
        if (Date.now() - t0 > 20_000) { achados.push({ aviso: "busca cortada em 20 s" }); break; }
      }
      return { caminho: String(args.caminho), total, achados };
    }
    // zaeon_abrir_pagina
    const url = String(args?.url || "");
    if (!s.dominios.length) throw new Error("dominio_nao_declarado: declare o domínio no Termo de Uso para usar as ferramentas web");
    if (!dentroDosDominios(url, s.dominios)) throw new Error(`url fora dos domínios declarados (${s.dominios.join(", ")})`);
    const nav = await garantirNavegador(s);
    const aba = await fetch(`${nav.cdp}/json/new?${encodeURIComponent(url)}`, { method: "PUT" }).then((r) => r.json());
    const final = await esperarPagina(nav.cdp, aba.id);
    try { const o = new URL(final).origin; if (dentroDosDominios(o, s.dominios)) s.origensAbertas.add(o); } catch { /* about:blank */ }
    return { target_id: aba.id, cdp_endpoint: nav.cdp, url: final, bloqueados_pelo_proxy: s.proxy.bloqueados.slice(-10) };
  }

  /** chama uma ferramenta na sessão (a política decide); devolve { ok, resultado } com a Evidence/JSON do REA */
  async function chamar({ sessao, dono, nome, argumentos, salvar, signal }) {
    const s = sessoes.get(String(sessao || ""));
    if (!s) throw new Error("sessao_inexistente (expirou? abra outra)");
    if (s.dono !== dono) throw new Error("sessao_de_outra_pessoa");
    if (s.ocupada) throw new Error("sessao_ocupada: espere a ferramenta anterior terminar");
    s.ocupada = true; s.uso = Date.now();
    try {
      if (nome in PSEUDO) {
        if (nome === "zaeon_abrir_pagina" && !s.dominios.length) throw new Error("dominio_nao_declarado");
        return { ok: true, resultado: await pseudo(s, nome, argumentos) };
      }
      const nivel = classificar(nome);
      if (nivel === "negada") throw new Error(`ferramenta_negada: ${nome} mexe no host/device do motor`);
      const f = s.ferramentas.get(nome);
      if (!f) throw new Error(nivel === "web" ? "dominio_nao_declarado: as ferramentas web pedem um domínio declarado no Termo de Uso" : `ferramenta_desconhecida: ${nome}`);
      let args = argumentos && typeof argumentos === "object" ? argumentos : {};
      if (nivel === "web") {
        const nav = await garantirNavegador(s);
        args = reescreverWeb(nome, args, { cdp: nav.cdp, dominios: s.dominios, props: f.props, origensAbertas: [...s.origensAbertas] });
      }
      args = await resolverHandles(prenderCaminhos(args, { raiz: s.dir, resolverHandle }));
      const abortar = () => { void matarJob(s.jobId, s.proc?.pid).finally(() => fechar(s.id)); };
      signal?.addEventListener("abort", abortar, { once: true });
      const r = await s.mcp.pedir("tools/call", { name: nome, arguments: args }, limites.ferramentaMs);
      signal?.removeEventListener("abort", abortar);
      if (r.error) {
        // prazo estourado: o REA pode estar preso num worker — a sessão não serve mais
        if (/prazo de/.test(r.error.message || "")) await fechar(s.id);
        return { ok: false, erro: String(r.error.message || "erro do rea mcp").slice(0, 600) };
      }
      const texto = (r.result?.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
      // `salvar`: grava o resultado BRUTO na pasta da sessão (ex.: a captura do inspect_web_page, que o export_web_scripts
      // lê por caminho) e devolve só um resumo — sem trafegar MB pela tailnet
      if (salvar) {
        if (!/^[A-Za-z0-9._-]{1,80}\.json$/.test(String(salvar))) throw new Error("salvar: nome de arquivo .json simples");
        await writeFile(join(s.dir, String(salvar)), texto, { mode: 0o600 });
        return { ok: !r.result?.isError, resultado: { salvo: String(salvar), bytes: Buffer.byteLength(texto), inicio: texto.slice(0, 2000) }, bloqueados_pelo_proxy: s.proxy.bloqueados.slice(-10) };
      }
      let resultado; try { resultado = JSON.parse(texto); } catch { resultado = texto.slice(0, limites.saidaBytes); }
      if (typeof resultado !== "string" && JSON.stringify(resultado).length > limites.saidaBytes) resultado = { truncado: true, inicio: JSON.stringify(resultado).slice(0, limites.saidaBytes) };
      return { ok: !r.result?.isError, resultado, bloqueados_pelo_proxy: s.proxy.bloqueados.slice(-10) };
    } finally { s.ocupada = false; s.uso = Date.now(); }
  }

  // limpeza: ociosa demais ou velha demais
  const zelador = setInterval(() => {
    const agora = Date.now();
    for (const s of sessoes.values()) if (!s.ocupada && (agora - s.uso > limites.ociosoMs || agora - s.criada > limites.vidaMs)) void fechar(s.id);
  }, 60_000);
  zelador.unref?.();

  return { criar, chamar, fechar: async (id, dono) => { const s = sessoes.get(id); if (!s || s.dono !== dono) return false; return fechar(id); }, ativas: () => sessoes.size, _sessoes: sessoes };
}
