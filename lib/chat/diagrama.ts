/**
 * lib/chat/diagrama.ts — o diagrama que o MODELO escreve em sintaxe Mermaid. PURO.
 *
 * A skill `diagrama-mermaid` responde um objeto JSON (`{titulo, tipo, mermaid, leitura}`), e a
 * página o desenha com o Mermaid (components/chat/DiagramaMermaid). Este módulo é o portão:
 *
 *   · só os cinco tipos que a skill oferece — o código tem de COMEÇAR pela palavra-chave de um
 *     deles (o Mermaid tem muitos outros diagramas; o que a skill não ensinou não entra);
 *   · diretiva `%%{…}%%` é recusada: ela reconfigura o Mermaid de dentro do próprio diagrama
 *     (tema, nível de segurança), e quem configura o Mermaid é a página, não o modelo;
 *   · tamanho limitado.
 *
 * O que o código DESENHA continua sendo problema do Mermaid, que roda com `securityLevel: "strict"`
 * (rótulo é texto, clique é desligado). Nunca lança.
 */
export const TIPOS_DIAGRAMA = ["flowchart", "sequence", "class", "state", "er"] as const;
export type TipoDiagrama = (typeof TIPOS_DIAGRAMA)[number];

/** A palavra-chave com que o código Mermaid de cada tipo começa. */
const ABERTURA: readonly [RegExp, TipoDiagrama][] = [
  [/^(?:flowchart|graph)\s+(?:TD|TB|BT|LR|RL)\b/, "flowchart"],
  [/^sequenceDiagram\b/, "sequence"],
  [/^classDiagram\b/, "class"],
  [/^stateDiagram(?:-v2)?\b/, "state"],
  [/^erDiagram\b/, "er"],
];

export type Diagrama = { titulo: string; tipo: TipoDiagrama; mermaid: string; leitura: string };
export type ResultadoDiagrama = { ok: true; diagrama: Diagrama } | { ok: false; erro: string };

export const MAX_MERMAID = 4000;

const semCerca = (s: string): string =>
  s.trim().replace(/^```[\w-]*[ \t]*\n?/, "").replace(/\n?```\s*$/, "").trim();

/** Valida o CÓDIGO Mermaid e diz de que tipo ele é. */
export function validarMermaid(codigo: string): { ok: true; tipo: TipoDiagrama; mermaid: string } | { ok: false; erro: string } {
  const mermaid = semCerca(String(codigo ?? "")).replace(/\r\n?/g, "\n");
  if (!mermaid) return { ok: false, erro: "diagrama vazio" };
  if (mermaid.length > MAX_MERMAID) return { ok: false, erro: "diagrama longo demais" };
  if (/%%\s*\{/.test(mermaid)) return { ok: false, erro: "diretiva de configuração não é aceita" };
  const tipo = ABERTURA.find(([re]) => re.test(mermaid))?.[1];
  if (!tipo) return { ok: false, erro: "tipo de diagrama não reconhecido" };
  return { ok: true, tipo, mermaid };
}

export function parseDiagrama(texto: string): ResultadoDiagrama {
  let cru: unknown;
  try { cru = JSON.parse(semCerca(String(texto ?? ""))); } catch { return { ok: false, erro: "JSON inválido" }; }
  const o = cru as Record<string, unknown> | null;
  if (!o || typeof o !== "object" || Array.isArray(o)) return { ok: false, erro: "o diagrama tem de ser um objeto" };
  if (typeof o.mermaid !== "string" || !("titulo" in o) || !("tipo" in o)) return { ok: false, erro: "faltam chaves" };
  const v = validarMermaid(o.mermaid);
  if (!v.ok) return v;
  return {
    ok: true,
    diagrama: {
      titulo: typeof o.titulo === "string" ? o.titulo.trim().slice(0, 120) : "",
      tipo: v.tipo,                      // o tipo é o do CÓDIGO; o campo `tipo` do modelo é só declaração
      mermaid: v.mermaid,
      leitura: typeof o.leitura === "string" ? o.leitura.trim().slice(0, 400) : "",
    },
  };
}

export const ehDiagrama = (texto: string): boolean => parseDiagrama(texto).ok;
