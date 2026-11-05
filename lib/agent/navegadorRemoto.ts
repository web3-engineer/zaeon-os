/**
 * lib/agent/navegadorRemoto.ts — o `BrowserDriver` que fala com o CONTAINER do agente (F9).
 *
 * Na F8 o Chromium subia dentro do `zaeon_web`: memória disputada com quem serve o site (daí os
 * tetos de 12 passos / 3 min / um run por vez) e navegador de páginas de terceiro no container que
 * tem as credenciais. Agora o navegador vive em `services/agente-navegador` — memória própria e
 * ZERO credencial — e o web só conversa por HTTP na rede interna.
 *
 * AS TRAVAS NÃO MUDARAM DE NATUREZA, mudaram de lugar e ficaram MAIS fortes: `click`/`type`/
 * `waitForHuman` não são "recusados" aqui, eles NÃO EXISTEM no servidor do container — não há rota
 * de clicar. O método deste driver lança, igual ao local, pra que a falha seja a mesma dos dois
 * lados e o teste do laço continue valendo.
 *
 * A POLÍTICA É CONFERIDA NAS DUAS PONTAS, de propósito. O container é a autoridade (é ele que abre
 * o socket), mas o web também chama `urlPermitida` antes de pedir: erra rápido, com o motivo exato,
 * sem gastar ida e volta — e se as duas pontas discordarem, o erro aparece como discordância em vez
 * de "403 sem explicação". As duas leem a MESMA env (`LEITOR_ALLOW`), então discordar é defeito.
 */
import type { BrowserDriver } from "@/lib/agent/agentic";
import {
  AGENTE_MAX_TEXTO,
  agenteEhExterno,
  agenteUrl,
  allowDoAgente,
  tokenDoAgente,
  urlDoAgente,
} from "@/lib/agent/navegadorPolitica";

export { agenteUrl };
import { RecusaDeRede, abrirNavegadorDoAgente } from "@/lib/agent/navegadorServidor";

const TIMEOUT_PADRAO_MS = 30_000;

/**
 * O container está DE PÉ? Pergunta em vez de supor.
 *
 * Isto existe porque `AGENTE_URL` tem default no compose (molde do `LEITOR_PROXY_URL`): a env
 * estar preenchida prova que o endereço foi configurado, NÃO que o serviço subiu — e o perfil
 * "agente" só sobe quando o deploy o nomeia. Sem a sonda, o recibo diria "on (container)" com o
 * container parado, que é a forma exata de recibo que mente contra a qual esta série toda briga.
 *
 * Prazo CURTO e falha FECHADO: o /api/health também é o health-gate do deploy, então ele não pode
 * ficar pendurado esperando um serviço morto.
 */
export async function agenteVivo(
  env: Record<string, string | undefined> = process.env,
  buscar: typeof fetch = fetch,
  prazoMs = 600,
): Promise<boolean> {
  const base = agenteUrl(env);
  if (!base) return false;
  try {
    const r = await buscar(`${base}/health`, { signal: AbortSignal.timeout(prazoMs) });
    return r.ok;
  } catch {
    return false;
  }
}

type Resposta = { erro?: string; texto?: string; base64?: string; id?: string; url?: string; ok?: boolean };

export type OpcoesNavegadorRemoto = {
  base?: string;
  allow?: readonly string[];
  timeoutMs?: number;
  env?: Record<string, string | undefined>;
  token?: string | null;
  /** injetável só pra teste. */
  buscar?: typeof fetch;
};

export async function abrirNavegadorRemoto(opts: OpcoesNavegadorRemoto = {}): Promise<BrowserDriver> {
  const env = opts.env ?? process.env;
  const base = opts.base ?? agenteUrl(env);
  if (!base) throw new RecusaDeRede("agente_url_ausente");
  const allow = opts.allow ?? allowDoAgente(env);
  if (!allow.length) throw new RecusaDeRede("allowlist_vazia");
  const timeoutMs = opts.timeoutMs ?? TIMEOUT_PADRAO_MS;
  const buscar = opts.buscar ?? fetch;
  const token = opts.token !== undefined ? opts.token : tokenDoAgente(env);
  // F10 · TRAVA, não aviso: serviço em outro servidor SEM token é recusado aqui, antes de qualquer
  // pedido. Aceitar "sem token porque não configuraram" seria deixar a porta de um navegador aberta
  // na internet e chamar isso de configuração pendente.
  if (agenteEhExterno(env) && !token) throw new RecusaDeRede("token_obrigatorio_fora_do_compose");

  async function chamar(caminho: string, metodo: "POST" | "DELETE", corpo?: unknown): Promise<Resposta> {
    let r: Response;
    try {
      r = await buscar(`${base}${caminho}`, {
        method: metodo,
        headers: {
          ...(corpo === undefined ? {} : { "content-type": "application/json" }),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      // Container fora do ar é estado declarado, não exceção crua: a rota devolve 503 com motivo.
      throw new RecusaDeRede(`agente_inalcancavel:${String((e as Error)?.name ?? "erro")}`);
    }
    let corpoResp: Resposta = {};
    try { corpoResp = (await r.json()) as Resposta; } catch { /* corpo vazio/não-JSON */ }
    if (!r.ok) throw new RecusaDeRede(corpoResp.erro || `http_${r.status}`);
    return corpoResp;
  }

  const { id } = await chamar("/sessao", "POST");
  if (!id) throw new RecusaDeRede("sessao_sem_id");

  const recusarEscrita = (o: string): never => {
    throw new RecusaDeRede(`somente_leitura:${o}`);
  };

  return {
    goto: async (url: string) => {
      // conferência local: erra rápido e com o motivo exato (o container confere de novo)
      const v = urlDoAgente(url, allow);
      if (!v.ok) throw new RecusaDeRede(v.erro, url);
      await chamar(`/sessao/${id}/ir`, "POST", { url: v.url.toString() });
    },
    click: async () => recusarEscrita("click"),
    type: async () => recusarEscrita("type"),
    readText: async (sel?: string) => {
      const r = await chamar(`/sessao/${id}/ler`, "POST", sel ? { selector: sel } : {});
      return String(r.texto ?? "").slice(0, AGENTE_MAX_TEXTO);
    },
    screenshot: async () => {
      const r = await chamar(`/sessao/${id}/foto`, "POST");
      return String(r.base64 ?? "");
    },
    waitForHuman: async (reason: string) => {
      // Não há humano na página, e o container não tem rota pra isto. Prosseguir rodaria o passo
      // seguinte desautenticado — o no-op que mente, que a F8 consertou.
      throw new RecusaDeRede(`sem_humano:${reason || "handoff"}`);
    },
    close: async () => {
      // Fechar é best-effort: a sessão expira sozinha no container (TTL), então um erro aqui não
      // deixa Chromium pendurado — e deixar o run estourar no `finally` seria pior.
      await chamar(`/sessao/${id}`, "DELETE").catch(() => {});
    },
  };
}

export type DriverDoAgente = { driver: BrowserDriver; remoto: boolean };

/**
 * Escolhe o driver: com `AGENTE_URL` vai no CONTAINER; sem ela, lança o Chromium local (o caminho
 * da F8, que segue valendo pra dev e pro smoke). Não é fallback silencioso — quem chama recebe
 * `remoto` e o recibo publica qual está em jogo, porque "está no ar" e "está no ar COM container"
 * têm tetos diferentes e confundi-los seria recibo que mente.
 */
export async function abrirDriverDoAgente(
  opts: { env?: Record<string, string | undefined>; allow?: readonly string[] } = {},
): Promise<DriverDoAgente> {
  const env = opts.env ?? process.env;
  if (agenteUrl(env)) {
    return { driver: await abrirNavegadorRemoto({ env, allow: opts.allow }), remoto: true };
  }
  return { driver: await abrirNavegadorDoAgente({ env, allow: opts.allow }), remoto: false };
}
