/**
 * lib/octa/rea.ts — a ponte do Octa pro MOTOR do REA (engenharia reversa) na Contabo (infra/rea-engine).
 * Fatia 2: dá ao agente do Octa as ferramentas REAIS do REA, 1:1, atrás de DOIS portões: OCTA_REA=1 (a skill) e
 * REA_BRIDGE_URL + REA_BRIDGE_TOKEN (o motor ligado). Sem os dois, a tool nem aparece.
 * O REA já recusa DRM/anti-cheat/auth/pirataria (DISCLAIMER do REA); o guard do Octa fica por cima.
 */
import { reaLigado } from "@/lib/octa/skills";

export type ReaEnv = Record<string, string | undefined>;
export const reaBridgeConfigurado = (env: ReaEnv = process.env) =>
  reaLigado(env) && !!env.REA_BRIDGE_URL?.trim() && !!env.REA_BRIDGE_TOKEN?.trim();

/** as FAMÍLIAS com efeito colateral — rodar/observar/tracejar, device (adb), debug, mudar o host. O motor (a ponte
 *  em infra/rea-engine) é a autoridade; aqui é só um filtro local pra o agente ganhar um erro claro sem ir à rede.
 *  O resto da superfície do REA (análise estática/leitura) passa 1:1. */
export const DENY_REA_PREFIXOS = ["capture-", "observe-", "trace", "debug-", "start-adb", "stop-adb", "push-", "pull-", "read-adb", "resolve-adb", "inspect-adb", "uninstall", "collect-adb", "import-", "open-jeb", "execute-", "cutter-", "annotate-", "decompile-jeb", "inspect-jeb", "discover-webmcp", "reconcile-javascript-runtime"];
export const DENY_REA_EXATOS = new Set(["setup", "update", "completions", "evidence-import"]);
/** exemplos pro prompt (não é a lista toda — a superfície estática do REA inteira está liberada) */
export const REA_EXEMPLOS = ["analyze", "analyze-javascript-application", "analyze-web-bundle", "inspect", "decompile", "function", "search", "xrefs", "read-bytes", "inspect-macho", "inspect-go-binary", "inspect-managed-members", "inspect-sqlite" as string, "inspect-android-package", "inspect-firmware-regions", "inspect-evm-interface", "inspect-packet-capture", "compare", "capabilities", "providers"];
const ehNomeRea = (c: string) => /^[a-z][a-z0-9-]{1,50}$/.test(c);
export const comandoRea = (c: string): boolean => ehNomeRea(c) && !DENY_REA_EXATOS.has(c) && !DENY_REA_PREFIXOS.some((p) => c.startsWith(p));

export type RespostaRea = { ok: boolean; code?: number; evidence?: unknown; stdout?: string; stderr?: string; erro?: string };

const PRAZO_MS = 12 * 60_000;   // análise nativa (Ghidra) pode demorar

/** chama o motor do REA com um artefato opcional (texto do workspace) + args. IO. */
export async function chamarRea(
  o: { command: string; args?: string[]; artifact?: { nome: string; conteudo: string | Buffer } },
  env: ReaEnv = process.env,
  f: typeof fetch = fetch,
): Promise<RespostaRea> {
  if (!reaBridgeConfigurado(env)) return { ok: false, erro: "motor do REA não configurado (OCTA_REA + REA_BRIDGE_URL/TOKEN)" };
  if (!comandoRea(o.command)) return { ok: false, erro: `comando com efeito colateral ou inválido (desligado nesta fatia): ${o.command}` };
  const base = env.REA_BRIDGE_URL!.trim().replace(/\/+$/, "");
  const corpo: Record<string, unknown> = { token: env.REA_BRIDGE_TOKEN!.trim(), command: o.command, args: o.args ?? [], json: true };
  if (o.artifact) {
    const buf = Buffer.isBuffer(o.artifact.conteudo) ? o.artifact.conteudo : Buffer.from(o.artifact.conteudo, "utf8");
    corpo.artifactBase64 = buf.toString("base64");
    corpo.artifactName = o.artifact.nome;
  }
  try {
    const r = await f(`${base}/rea`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo), signal: AbortSignal.timeout(PRAZO_MS) });
    const j = (await r.json().catch(() => ({}))) as RespostaRea;
    if (!r.ok) return { ok: false, code: r.status, erro: (j as any)?.erro ?? `bridge HTTP ${r.status}` };
    return j;
  } catch (e) {
    return { ok: false, erro: `motor do REA fora do ar: ${String((e as Error)?.message ?? e).slice(0, 140)}` };
  }
}

/** um resumo curto da Evidence pro laço do agente (o JSON inteiro vai grande; o modelo pede detalhe se precisar) */
export function resumirRea(r: RespostaRea): string {
  if (!r.ok) return `REA falhou: ${r.erro ?? r.stderr ?? `código ${r.code}`}`;
  if (r.evidence !== undefined) {
    const txt = JSON.stringify(r.evidence);
    return txt.length > 8000 ? txt.slice(0, 8000) + `\n… (Evidence de ${txt.length} chars; refine o comando/args pra focar)` : txt;
  }
  return (r.stdout ?? "").slice(0, 8000) || "(sem saída)";
}
