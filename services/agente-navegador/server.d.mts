// Tipos de server.mjs (o serviço é JS puro; isto é só para o tsc dos testes).
import type { Server } from "node:http";
export const servidor: Server;
export function regrasDeResolucao(allow: readonly string[]): string;
export function decidirPedido(p: { url: string; metodo: string; tipo: string }, allow: readonly string[]):
  { ok: true } | { ok: false; erro: string };
export function ipsAceitos(ips: readonly string[]): { ok: true } | { ok: false; erro: string };
export function argsChromium(allow: readonly string[], extras?: readonly string[]): string[];
export function extrairTexto(html: string): string;
