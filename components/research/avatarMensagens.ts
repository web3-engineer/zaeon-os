/** o protocolo entre o painel (thread principal) e a cena da avatar (Web Worker — components/research/avatar.worker) */
import type { IdCorpoAvatar } from "./avatarCena";

export type ParaCena =
  | { tipo: "iniciar"; canvas: OffscreenCanvas; largura: number; altura: number; dpr: number; persona: IdCorpoAvatar; vitrine?: boolean; quadro?: number }
  | { tipo: "tamanho"; largura: number; altura: number }
  | { tipo: "visivel"; visivel: boolean }
  | { tipo: "persona"; persona: IdCorpoAvatar }
  /** a FALA (a voz toca na página): o volume agora (0..1) pra boca, e se ainda está falando */
  | { tipo: "fala"; v: number; falando: boolean }
  /** o cursor no canvas (−1..1; null = saiu) — a vitrine do hero olha pra ele */
  | { tipo: "olhar"; x: number | null; y: number | null }
  | { tipo: "sinais"; lendo: boolean; escrevendo: boolean }
  | { tipo: "reagir" }
  // #764: `nome` escolhe o gesto (um clipe do pacote, ex. "fidget_hair" — a mão na cabeça); sem nome, um ao acaso
  | { tipo: "gesto"; nome?: string }
  /** (dev) quanto a cena gasta por quadro */
  | { tipo: "diag" }
  /** (dev) pula o roteiro da geração pra `t` s */
  | { tipo: "saltar"; t: number }
  | { tipo: "fim" };

export type DaCena =
  | { tipo: "estado"; estado: "carregando" | "pronto" | "erro" }
  | { tipo: "diag"; quadros: number; msPorQuadro: number; fps: number; sequencias?: Record<string, unknown> };
