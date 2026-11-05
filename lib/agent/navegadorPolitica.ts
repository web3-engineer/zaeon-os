/**
 * lib/agent/navegadorPolitica.ts — a POLÍTICA DE REDE do agente de navegador (F8). Pura e testável.
 *
 * O módulo `agentic.ts` (#698) chegou sem caller: ligar `AGENTIC_MODE` não fazia nada, porque
 * `connectBrowser` pede Playwright (ausente do package.json) e abre o navegador HEADED — e num
 * container sem display não há janela, nem humano do outro lado. Esta é a porta do lado servidor:
 * Chromium HEADLESS, SOMENTE LEITURA, sem co-browsing.
 *
 * ⟦DE ONDE VEM A ALLOWLIST⟧ Daqui não sai lista nova: a allowlist do agente é a MESMA do Leitor
 * (`LEITOR_ALLOW`), e as regras são as MESMAS funções que o `leitor-proxy` usa em produção
 * (`urlPermitida`/`ipBloqueado` de services/leitor-proxy/guarda.mjs, importadas — não copiadas).
 * Duas definições de "que domínio pode" envelheceriam em separado, e a que ficasse velha seria a
 * que concede. Mesmo motivo pelo qual a elegibilidade do Pro (F7) deriva de `planCapabilities`.
 *
 * ⟦POR QUE UM NAVEGADOR DENTRO DO `zaeon_web`, SE A DOUTRINA É "só o leitor-proxy sai pra internet"⟧
 * Porque o precedente da casa já é este, e com as mesmas camadas: `lib/octa/captura.ts` lança
 * Chromium headless no mesmo container, intercepta CADA pedido contra uma allowlist
 * (`decidirPedido`) e entrega ao processo do navegador um ambiente MÍNIMO (`envChromium`:
 * PATH/HOME/LANG/TZ) — então `DATABASE_URL`, `NEXTAUTH_SECRET`, Vertex, Mongo e Pusher NÃO entram
 * no processo que fala com a internet. O que a doutrina protege (credencial perto de conteúdo
 * hostil) continua protegido pelo ambiente mínimo, não pela fronteira do container.
 *
 * ⟦O QUE ESTA PORTA NÃO FECHA, E O PROXY FECHA⟧ DNS-rebinding. O `leitor-proxy` resolve, confere o
 * IP e CONECTA PELO IP com SNI/Host do nome — não há segunda resolução pra trocar a resposta. O
 * Chromium resolve por conta dele, então entre a nossa checagem e a conexão dele existe uma janela.
 * Mitigações aplicadas, e elas são o que torna a janela estreita: (1) `MAP * ~NOTFOUND` faz TODO
 * host fora da allowlist não resolver, então o atacante precisa CONTROLAR O DNS DE UM DOMÍNIO JÁ
 * LIBERADO (hoje, domínios acadêmicos curados); (2) todo IP resolvido é conferido, e basta UM
 * interno pra recusar. Registrado como dívida em docs/PLANO_HARNESS_AGENTICO.md (F8), com o caminho
 * de quitação: servir o HTML pelo proxy e usar o Chromium só pra renderizar JS.
 */
import { parseAllow, urlPermitida, ipBloqueado } from "../../services/leitor-proxy/guarda.mjs";

export { parseAllow, urlPermitida, ipBloqueado };

/**
 * Orçamento do run. MENOR que o default do `agentic.ts` (25 passos / 30 min), de propósito: aqueles
 * números foram pensados pro driver HEADED, onde um humano acompanha e o handoff de login come
 * minutos. Aqui não há humano — 30 min de Chromium headless no `web` é consumo de memória do
 * container sem ninguém olhando, e o `--renderer-process-limit=1` do Octa existe justamente porque
 * esse limite é apertado.
 */
export const AGENTE_MAX_PASSOS = 12;
export const AGENTE_MAX_MS = 3 * 60_000;

/**
 * F9 · COM O CONTAINER DEDICADO os tetos sobem, e o que os autoriza é a mudança física: o Chromium
 * deixou de disputar memória com o processo que serve o site (`services/agente-navegador`, limite
 * próprio no compose). Seguem MENORES que os 25 passos / 30 min do `agentic.ts`, porque aqueles
 * foram pensados pro driver HEADED, onde o handoff de login come minutos com um humano esperando —
 * aqui não há humano, e 30 min de navegação sem ninguém olhando é consumo, não paciência.
 */
export const AGENTE_MAX_PASSOS_REMOTO = 25;
export const AGENTE_MAX_MS_REMOTO = 10 * 60_000;

export function orcamentoDoAgente(remoto: boolean): { maxPassos: number; maxMs: number } {
  return remoto
    ? { maxPassos: AGENTE_MAX_PASSOS_REMOTO, maxMs: AGENTE_MAX_MS_REMOTO }
    : { maxPassos: AGENTE_MAX_PASSOS, maxMs: AGENTE_MAX_MS };
}

/**
 * O endereço do container do agente. Vazio = AUSENTE → o Chromium local (F8) assume. Vive aqui, e
 * não no cliente remoto, pra `agenteFaltando` poder consultá-lo sem import circular — uma segunda
 * leitura de `AGENTE_URL` em outro arquivo seria duas definições de "onde está o navegador".
 */
export function agenteUrl(env: Record<string, string | undefined> = process.env): string | null {
  const u = env.AGENTE_URL?.trim();
  return u ? u.replace(/\/+$/, "") : null;
}

/** Teto do texto que uma leitura devolve (o cockpit mostra, o plano não precisa de mais). */
export const AGENTE_MAX_TEXTO = 20_000;

/** A allowlist do agente É a do Leitor. Vazia = nega tudo (mesma regra do `urlPermitida`). */
export function allowDoAgente(env: Record<string, string | undefined> = process.env): string[] {
  return parseAllow(env.LEITOR_ALLOW);
}

/**
 * `--host-resolver-rules` do Chromium: 2ª camada, igual à do Octa. Fora da allowlist NADA resolve,
 * então um `<img src="http://169.254.169.254/...">` numa página liberada morre no resolvedor, antes
 * de qualquer socket — e não só na nossa interceptação.
 *
 * `*.x` da nossa allowlist vale pro domínio E pros subdomínios (é o que `hostNaLista` faz), mas o
 * padrão do Chromium `*.x` NÃO casa o `x` pelado (falta o ponto). Então um `*.x` nosso vira DOIS
 * EXCLUDE. Errar isso não quebraria nada de forma visível: daria "host não resolve" no domínio raiz
 * de uma lista que o diz liberado — exatamente o tipo de divergência silenciosa que o teste fixa.
 */
export function regrasDeResolucao(allow: readonly string[]): string {
  const excl: string[] = [];
  for (const p of allow) {
    if (p.startsWith("*.")) {
      const base = p.slice(2);
      if (base) { excl.push(`EXCLUDE ${base}`, `EXCLUDE ${p}`); }
    } else if (p) {
      excl.push(`EXCLUDE ${p}`);
    }
  }
  // Sem allowlist, só o MAP: nada resolve. Falha FECHADO (lista vazia não é "libera tudo").
  return ["MAP * ~NOTFOUND", ...excl].join(", ");
}

export type PedidoDoAgente = { url: string; metodo: string; tipo: string };
export type VereditoPedido = { ok: true } | { ok: false; erro: string };

/**
 * Cada pedido que o Chromium faz — navegação, redirect, subrecurso — passa por aqui. A navegação
 * inicial não é privilegiada: um redirect pra fora da lista é tão barrado quanto um `<script src>`.
 *
 * Só GET. Um agente SOMENTE LEITURA não tem por que emitir POST/PUT/DELETE, e um formulário que a
 * página dispare sozinha seria escrita num site de terceiro sem aprovação de ninguém.
 */
export function decidirPedidoDoAgente(p: PedidoDoAgente, allow: readonly string[]): VereditoPedido {
  if (String(p.metodo ?? "").toUpperCase() !== "GET") return { ok: false, erro: "metodo_proibido" };
  const v = urlPermitida(p.url, allow as string[]);
  return v.ok ? { ok: true } : { ok: false, erro: v.erro };
}

/**
 * TODOS os IPs resolvidos precisam passar — não basta um bom, como no proxy. O proxy ESCOLHE o IP
 * e conecta nele; o Chromium escolhe sozinho e pode pegar qualquer um da lista. Com "basta um bom",
 * um nome que resolve pra `[1.2.3.4, 127.0.0.1]` passaria e o Chromium poderia ir no loopback.
 */
export function ipsAceitos(ips: readonly string[]): VereditoPedido {
  if (!ips.length) return { ok: false, erro: "dns_vazio" };
  const ruim = ips.find((ip) => ipBloqueado(ip));
  return ruim ? { ok: false, erro: "ip_bloqueado" } : { ok: true };
}

/**
 * O que falta pro agente funcionar — NOMES de env e condições, nunca valores (§recibo: nome de env
 * não é segredo, valor é). Alimenta o /api/health e a linha do recibo do deploy.
 */
export function agenteFaltando(
  env: Record<string, string | undefined> = process.env,
  temChromium: boolean = true,
): string[] {
  const falta: string[] = [];
  if (!["1", "true", "on"].includes(String(env.AGENTIC_MODE ?? "").toLowerCase())) falta.push("AGENTIC_MODE");
  if (!allowDoAgente(env).length) falta.push("LEITOR_ALLOW");
  // F9 · com o container dedicado, o Chromium do `web` deixa de ser requisito: quem navega é o
  // outro container. Exigi-lo aqui faria o recibo dizer "falta chromium" num ar perfeitamente
  // funcional — recibo que mente na direção pessimista ainda é recibo que mente.
  if (!agenteUrl(env) && !temChromium) falta.push("chromium");
  return falta;
}

/** Onde o navegador roda, pro recibo: o container dedicado (F9) ou dentro do web (F8). */
export function ondeOAgenteRoda(env: Record<string, string | undefined> = process.env): "container" | "web" {
  return agenteUrl(env) ? "container" : "web";
}
