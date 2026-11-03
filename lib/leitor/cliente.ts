/**
 * lib/leitor/cliente.ts — o ÚNICO caminho de chore para a internet (Fatia 7, G5/G6).
 *
 * Fala SÓ com `LEITOR_PROXY_URL` (o container leitor-proxy: sem credencial, allowlist, sem JS,
 * DNS resolvido lá, IP privado/metadata bloqueado). NUNCA faz `fetch(url)` direto no processo web.
 * Sem LEITOR_PROXY_URL → "leitor_offline" (lei 5: fora do ar se declara, não improvisa).
 */
/** ok = a PÁGINA respondeu 2xx (o proxy respondeu de qualquer forma). */
export type Leitura = {
  ok: boolean; status: number; finalUrl: string; contentType: string; texto: string;
  truncado: boolean; bytes: number; lidoEm: string;
  /** quantos elementos com texto OCULTO o proxy descartou (vetor de injeção indireta). Só contagem. */
  ocultosRemovidos?: number;
  /** o proxy marca tudo que vem da web: conteúdo é DADO, nunca instrução. */
  untrusted?: boolean;
};
/** F1b: os BYTES de um arquivo, pelo mesmo proxy e pela mesma allowlist. */
export type Baixado = {
  ok: boolean; status: number; finalUrl: string; contentType: string;
  bytes: Uint8Array; untrusted?: boolean; lidoEm: string;
};
export type ErroLeitor = {
  ok: false;
  code: "leitor_offline" | "leitor_dominio_fora_da_lista" | "leitor_recusou" | "leitor_falhou"
    | "leitor_grande_demais" | "leitor_tipo_nao_baixavel" | "leitor_https_obrigatorio";
  erro: string; status?: number;
};

/** Teto do TEXTO. 2 MiB é o `response cap` do `web.fetch` da Rovinos (issue #98) — ver server.mjs. */
export const LEITOR_MAX_BYTES = 2 * 1024 * 1024;
/** Teto dos BYTES = `lib/rag/ingerir.MAX_BYTES`: é o teto do único destino possível deles. */
export const LEITOR_MAX_BYTES_BIN = 25 * 1024 * 1024;
export const LEITOR_TIMEOUT_MS = 15_000;

export function leitorUrl(env: Record<string, string | undefined> = process.env): string | null {
  const u = env.LEITOR_PROXY_URL?.trim();
  return u ? u.replace(/\/+$/, "") : null;
}

/** O `erro` que o proxy devolve → o código do cliente. Cada motivo tem o seu: "grande demais" e
 *  "tipo que eu não leio" precisam virar mensagem diferente pro aluno, não um "recusou" genérico. */
const POR_MOTIVO: Record<string, ErroLeitor["code"]> = {
  dominio_fora_da_lista: "leitor_dominio_fora_da_lista",
  grande_demais: "leitor_grande_demais",
  tipo_nao_baixavel: "leitor_tipo_nao_baixavel",
  tipo_nao_suportado: "leitor_tipo_nao_baixavel",
  https_obrigatorio: "leitor_https_obrigatorio",
};

function erroDoProxy(status: number, j: any, url: string): ErroLeitor {
  const motivo = typeof j?.erro === "string" ? j.erro : "";
  const code = POR_MOTIVO[motivo] ?? (status >= 400 && status < 500 ? "leitor_recusou" : "leitor_falhou");
  // a URL não entra na mensagem: o Leitor não loga endereço, e nós não o devolvemos em texto de erro
  void url;
  return { ok: false, code, erro: String(motivo || `leitor HTTP ${status}`).slice(0, 120), status };
}

/** Lê UMA URL pelo proxy. Nunca lança. `fetchImpl`/`env` injetáveis (teste). */
export async function lerUrl(
  url: string,
  opts: { maxBytes?: number; timeoutMs?: number; fetchImpl?: typeof fetch; env?: Record<string, string | undefined>; signal?: AbortSignal } = {},
): Promise<Leitura | ErroLeitor> {
  const base = leitorUrl(opts.env);
  if (!base) return { ok: false, code: "leitor_offline", erro: "Leitor fora do ar (LEITOR_PROXY_URL vazio)" };
  const maxBytes = Math.min(Math.max(1, opts.maxBytes ?? LEITOR_MAX_BYTES), LEITOR_MAX_BYTES);
  const timeoutMs = Math.min(Math.max(1_000, opts.timeoutMs ?? LEITOR_TIMEOUT_MS), LEITOR_TIMEOUT_MS);
  const f = opts.fetchImpl ?? fetch;
  try {
    const sinais = [AbortSignal.timeout(timeoutMs + 2_000), ...(opts.signal ? [opts.signal] : [])];
    const r = await f(`${base}/fetch`, {
      method: "POST", cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, maxBytes, timeoutMs }),
      signal: sinais.length > 1 ? AbortSignal.any(sinais) : sinais[0],
    });
    let j: any = null;
    try { j = await r.json(); } catch { /* corpo não-JSON */ }
    // Recusa DO PROXY = HTTP 4xx/5xx dele. Página de destino 404/500 = HTTP 200 do proxy com {ok:false, status} (link_rot precisa).
    if (!r.ok || !j) return erroDoProxy(r.status, j, url);
    return {
      ok: j.ok !== false, status: Number(j.status) || 200, finalUrl: String(j.finalUrl ?? url), contentType: String(j.contentType ?? ""),
      texto: String(j.texto ?? ""), truncado: Boolean(j.truncado), bytes: Number(j.bytes) || 0, lidoEm: String(j.lidoEm ?? new Date().toISOString()),
      ocultosRemovidos: Number(j.ocultosRemovidos) || 0, untrusted: j.untrusted !== false,
    };
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    return { ok: false, code: /fetch failed|econnrefused|enotfound/i.test(msg) ? "leitor_offline" : "leitor_falhou", erro: msg.slice(0, 120) };
  }
}

/**
 * F1b · BAIXA os BYTES de um arquivo pelo MESMO proxy e pela MESMA allowlist (`POST /bytes`).
 *
 * Existe porque a opção honesta era essa: o Leitor serve texto, e buscar bytes no processo web
 * violaria a lei do topo deste arquivo. Estender o Leitor mantém a propriedade que importa — quem
 * sai pra internet é o container sem credencial, e quem confere IP e allowlist é ele.
 *
 * O proxy é mais DURO aqui que no /fetch: HTTPS obrigatório, estourar o teto é erro (413) em vez de
 * truncar, e a lista de tipos é curta. Ver o cabeçalho de services/leitor-proxy/server.mjs.
 */
export async function baixarUrl(
  url: string,
  opts: { maxBytes?: number; timeoutMs?: number; fetchImpl?: typeof fetch; env?: Record<string, string | undefined>; signal?: AbortSignal } = {},
): Promise<Baixado | ErroLeitor> {
  const base = leitorUrl(opts.env);
  if (!base) return { ok: false, code: "leitor_offline", erro: "Leitor fora do ar (LEITOR_PROXY_URL vazio)" };
  const maxBytes = Math.min(Math.max(1, opts.maxBytes ?? LEITOR_MAX_BYTES_BIN), LEITOR_MAX_BYTES_BIN);
  const timeoutMs = Math.min(Math.max(1_000, opts.timeoutMs ?? LEITOR_TIMEOUT_MS), LEITOR_TIMEOUT_MS);
  const f = opts.fetchImpl ?? fetch;
  try {
    const sinais = [AbortSignal.timeout(timeoutMs + 2_000), ...(opts.signal ? [opts.signal] : [])];
    const r = await f(`${base}/bytes`, {
      method: "POST", cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, maxBytes, timeoutMs }),
      signal: sinais.length > 1 ? AbortSignal.any(sinais) : sinais[0],
    });
    let j: any = null;
    try { j = await r.json(); } catch { /* corpo não-JSON */ }
    if (!r.ok || !j) return erroDoProxy(r.status, j, url);
    let bytes: Uint8Array;
    try { bytes = Uint8Array.from(Buffer.from(String(j.bytesB64 ?? ""), "base64")); }
    catch { return { ok: false, code: "leitor_falhou", erro: "resposta do Leitor ilegível" }; }
    return {
      ok: j.ok !== false, status: Number(j.status) || 200, finalUrl: String(j.finalUrl ?? url),
      contentType: String(j.contentType ?? ""), bytes, untrusted: j.untrusted !== false,
      lidoEm: String(j.lidoEm ?? new Date().toISOString()),
    };
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    return { ok: false, code: /fetch failed|econnrefused|enotfound/i.test(msg) ? "leitor_offline" : "leitor_falhou", erro: msg.slice(0, 120) };
  }
}
