/**
 * services/agente-navegador/sessoes.mjs — a contabilidade PURA de sessões do agente (F9).
 * Zero dependência, importável pelo vitest. O servidor (server.mjs) só orquestra.
 *
 * Por que isto é um módulo à parte, e não três linhas dentro do servidor: as decisões aqui erram
 * CARO e em silêncio. Sessão que não expira vira Chromium vazando memória até o container morrer;
 * teto que conta errado deixa dois navegadores abrirem onde cabia um; `id` previsível deixa um
 * container vizinho dirigir a sessão de outro. Nada disso aparece em teste de rota feliz.
 */
import { randomBytes } from "node:crypto";

/** Quantas sessões simultâneas. Cada uma é um contexto do Chromium (≈80–150 MB sob carga). */
export const MAX_SESSOES = 2;
/** Ociosidade que mata a sessão. O laço do agente faz passo atrás de passo; 2 min é folga larga. */
export const TTL_MS = 120_000;
/** Teto de vida, mesmo com uso: um plano em laço não segura o container pra sempre. */
export const VIDA_MAX_MS = 10 * 60_000;

/** id imprevisível: 16 bytes. `id` sequencial deixaria um vizinho adivinhar a sessão de outro. */
export function novoId() {
  return randomBytes(16).toString("hex");
}

/**
 * O registro de sessões. `agora` e `criarRecurso`/`fecharRecurso` são INJETADOS — é o que torna o
 * TTL testável sem esperar 2 minutos e sem navegador.
 */
export function criarRegistro(opts = {}) {
  const agora = opts.agora ?? (() => Date.now());
  const max = opts.max ?? MAX_SESSOES;
  const ttl = opts.ttl ?? TTL_MS;
  const vidaMax = opts.vidaMax ?? VIDA_MAX_MS;
  const sessoes = new Map();

  /** → { ok: true, id, sessao } | { ok: false, erro: "lotado" } */
  function abrir(recurso) {
    expirar();
    if (sessoes.size >= max) return { ok: false, erro: "lotado" };
    const t = agora();
    const id = novoId();
    const sessao = { id, recurso, criadaEm: t, tocadaEm: t };
    sessoes.set(id, sessao);
    return { ok: true, id, sessao };
  }

  /**
   * Busca E TOCA. Separar "buscar" de "tocar" seria um convite a esquecer o toque num caminho só —
   * e a sessão morreria no meio de um plano que estava sendo usado.
   */
  function usar(id) {
    expirar();
    const s = sessoes.get(String(id ?? ""));
    if (!s) return null;
    s.tocadaEm = agora();
    return s;
  }

  function fechar(id) {
    const s = sessoes.get(String(id ?? ""));
    if (!s) return null;
    sessoes.delete(s.id);
    return s;
  }

  /** → as sessões removidas, pra quem chama fechar os recursos delas. */
  function expirar() {
    const t = agora();
    const mortas = [];
    for (const s of sessoes.values()) {
      if (t - s.tocadaEm >= ttl || t - s.criadaEm >= vidaMax) mortas.push(s);
    }
    for (const s of mortas) sessoes.delete(s.id);
    return mortas;
  }

  return {
    abrir, usar, fechar, expirar,
    get tamanho() { return sessoes.size; },
    todas: () => [...sessoes.values()],
  };
}
