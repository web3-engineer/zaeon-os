// Tipos de server.mjs (só para o tsc dos testes).
import type { Server } from "node:http";
export function criarServidor(opts?: {
  allow?: string[]; maxBytes?: number; maxInflight?: number;
  lookup?: (host: string) => Promise<{ address: string; family?: number }[] | string[]>;
  bloqueado?: (ip: string) => boolean; portaUpstream?: number;
}): Server;
