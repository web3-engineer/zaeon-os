// Tipos de guarda.mjs (o proxy é JS puro, zero dependência; isto é só para o tsc dos testes).
export function parseAllow(s: string | null | undefined): string[];
export function hostNaLista(host: string, allow: string[]): boolean;
export function urlPermitida(entrada: string, allow: string[]): { ok: true; url: URL } | { ok: false; erro: string; status: number };
export function ipBloqueado(ip: string): boolean;
export function mesmoHost(a: string, b: string): boolean;
export function extrairTexto(html: string): string;
export const TIPOS_ACEITOS: string[];
export function tipoAceito(contentType: string | null | undefined): string | null;
