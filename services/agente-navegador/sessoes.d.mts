// Tipos de sessoes.mjs (o serviço é JS puro; isto é só para o tsc dos testes).
export const MAX_SESSOES: number;
export const TTL_MS: number;
export const VIDA_MAX_MS: number;
export function novoId(): string;

export type Sessao<R = unknown> = { id: string; recurso: R; criadaEm: number; tocadaEm: number };

export type Registro<R = unknown> = {
  abrir(recurso: R): { ok: true; id: string; sessao: Sessao<R> } | { ok: false; erro: string };
  usar(id: unknown): Sessao<R> | null;
  fechar(id: unknown): Sessao<R> | null;
  expirar(): Sessao<R>[];
  readonly tamanho: number;
  todas(): Sessao<R>[];
};

export function criarRegistro<R = unknown>(opts?: {
  agora?: () => number;
  max?: number;
  ttl?: number;
  vidaMax?: number;
}): Registro<R>;
