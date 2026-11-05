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

/**
 * A allowlist do agente: `AGENTE_ALLOW` manda, e sem ela vale a do Leitor (`LEITOR_ALLOW`).
 *
 * F10 · a PRECEDÊNCIA tem de ser a MESMA das duas pontas. O servidor do container já lia
 * `AGENTE_ALLOW ?? LEITOR_ALLOW`; se aqui ficasse só `LEITOR_ALLOW`, o container ficaria ABERTO e o
 * web recusaria na conferência local — e o sintoma seria "fora da lista" em domínio que o container
 * aceitaria, ou seja, duas políticas discordando em silêncio. É exatamente o que o comentário do
 * `navegadorRemoto` chama de defeito, então não pode nascer aqui.
 *
 * Vazia = nega tudo (regra do `urlPermitida`). `*` = qualquer domínio (ver `urlDoAgente`).
 */
export function allowDoAgente(env: Record<string, string | undefined> = process.env): string[] {
  const propria = parseAllow(env.AGENTE_ALLOW);
  return propria.length ? propria : parseAllow(env.LEITOR_ALLOW);
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
  // MODO ABERTO: não há como listar "tudo" num EXCLUDE, então esta camada SAI — e dizer isso em voz
  // alta importa, porque é a camada que, no modo fechado, mata o `<img src=169.254.169.254>` antes
  // de qualquer socket. Em modo aberto quem segura isso é a interceptação (todo pedido passa por
  // `decidirPedidoDoAgente`) e o `ipsAceitos` do `ir`. Uma camada menos, as outras intactas.
  if (allowEhAberta(allow)) return "";
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
 * F10 · MODO ABERTO — `AGENTE_ALLOW=*`: qualquer DOMÍNIO, pedido do dono ("navegue na internet e
 * faça pesquisas"). O que NÃO abre, e nunca vai abrir por esta porta:
 *
 *   - IP privado / loopback / link-local (169.254 = METADADOS da nuvem), CGNAT, ULA — `ipsAceitos`
 *     continua valendo IGUAL, em modo aberto ou fechado. É a única camada que impede o agente de
 *     virar um leitor da rede interna, e abrir domínio não é motivo pra abrir rede;
 *   - esquema fora de http/https, porta fora de 80/443, credencial embutida na URL, host que é IP
 *     literal — todas continuam, porque continuam vindo de `urlPermitida`;
 *   - escrever: `click`/`type` não existem no servidor. Internet aberta não é permissão pra agir.
 *
 * O TRUQUE DE IMPLEMENTAÇÃO, e ele é de propósito: em modo aberto NÃO reescrevo as regras — chamo
 * `urlPermitida` com a allowlist `[host da própria URL]`. Assim TODAS as checagens do leitor-proxy
 * continuam rodando, byte a byte, e a única coisa que o modo aberto muda é o predicado de domínio.
 * Reimplementar `urlPermitida` "sem a parte do host" criaria a quarta versão da política, e a que
 * ficasse velha seria a que concede — o erro que a F8 e a F9 passaram inteiras evitando.
 */
export const ABERTO = "*";

export function allowEhAberta(allow: readonly string[]): boolean {
  return allow.includes(ABERTO);
}

/** → { ok, url } | { ok: false, erro, status }. Em modo aberto, só o predicado de domínio cede. */
export function urlDoAgente(
  entrada: string,
  allow: readonly string[],
): { ok: true; url: URL } | { ok: false; erro: string; status: number } {
  if (!allowEhAberta(allow)) return urlPermitida(entrada, allow as string[]);
  // Precisa do host pra montar a lista de um item — e um endereço que nem parseia é recusado pelo
  // próprio `urlPermitida` abaixo, com o mesmo código de erro de sempre.
  let host = "";
  try { host = new URL(String(entrada ?? "").trim()).hostname.replace(/^\[|\]$/g, ""); } catch { host = ""; }
  return urlPermitida(entrada, host ? [host.toLowerCase()] : []);
}

/**
 * Cada pedido que o Chromium faz — navegação, redirect, subrecurso — passa por aqui. A navegação
 * inicial não é privilegiada: um redirect pra fora da lista é tão barrado quanto um `<script src>`.
 *
 * Só GET. Um agente SOMENTE LEITURA não tem por que emitir POST/PUT/DELETE, e um formulário que a
 * página dispare sozinha seria escrita num site de terceiro sem aprovação de ninguém.
 */
export function decidirPedidoDoAgente(p: PedidoDoAgente, allow: readonly string[]): VereditoPedido {
  if (String(p.metodo ?? "").toUpperCase() !== "GET") return { ok: false, erro: "metodo_proibido" };
  const v = urlDoAgente(p.url, allow);
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
  // F10 · serviço em OUTRO servidor sem token é falta, não detalhe: sem ele qualquer um que alcance
  // a porta dirige o navegador. Na rede interna do compose o token é opcional (a fronteira do
  // compose é o controle); atravessando internet, é requisito.
  if (agenteEhExterno(env) && !tokenDoAgente(env)) falta.push("AGENTE_TOKEN");
  return falta;
}

/** Onde o navegador roda, pro recibo: o container dedicado (F9) ou dentro do web (F8). */
export function ondeOAgenteRoda(env: Record<string, string | undefined> = process.env): "container" | "web" {
  return agenteUrl(env) ? "container" : "web";
}

/**
 * F10 · O serviço do agente está FORA da rede interna do compose?
 *
 * Isto existe porque a F9 decidiu NÃO ter autenticação, e a justificativa escrita era "é `expose`,
 * rede interna do compose, não guarda credencial". A primeira metade dessa frase deixa de ser
 * verdade no instante em que o container vai pra outro servidor — que é justamente o que o dono
 * autorizou ("pode ficar em outro servidor que não seja da contabo"). Então a pergunta "é externo?"
 * passa a ter consequência: externo SEM token é recusado, não aceito com aviso.
 *
 * Loopback é INTERNO apesar de ter pontos: `http://127.0.0.1:8799` é o smoke-test, não travessia de
 * internet. Errar isso exigiria token no teste e ensinaria a desligar a trava pra testar.
 * Em dúvida (URL que não parseia), EXTERNO — falha fechado.
 */
export function agenteEhExterno(env: Record<string, string | undefined> = process.env): boolean {
  const u = agenteUrl(env);
  if (!u) return false; // Chromium no próprio processo: não há rede entre o web e o navegador
  let h: URL;
  try { h = new URL(u); } catch { return true; }
  const host = h.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host === "::1" || /^127\./.test(host)) return false;
  if (h.protocol === "https:") return true;
  // nome de serviço do compose ("agente-navegador") não tem ponto; qualquer FQDN ou IP público tem
  return host.includes(".") || host.includes(":");
}

export function tokenDoAgente(env: Record<string, string | undefined> = process.env): string | null {
  const t = env.AGENTE_TOKEN?.trim();
  return t ? t : null;
}
