/**
 * lib/agent/toolsWeb.ts — `abrir_url`: a tool que ABRE um endereço e lê a página (F1 de
 * docs/PLANO_HARNESS_AGENTICO.md).
 *
 * Até aqui o harness tinha `web_search`, que devolve título + trecho de 300 caracteres, e NADA que
 * lesse a página. Era um dos buracos que produziam "vou abrir o link que você mandou".
 *
 * VAI PELO LEITOR (`lib/leitor/cliente`), não por fetch próprio, e isso não é preferência: é a lei
 * da Fatia 7 (G5/G6) que já está escrita naquele arquivo — «NUNCA faz `fetch(url)` direto no
 * processo web». O leitor-proxy é um container sem credencial, sem volume do app, read-only,
 * `cap_drop: ALL`, com allowlist default-deny e o IP conferido do lado dele. Uma tool cujo endereço
 * vem de uma CONVERSA é exatamente o caso que essa lei existe pra cobrir.
 *
 * E por isso a tool só é REGISTRADA quando o Leitor está configurado (lib/agent/runtime): tool
 * registrada que devolve "offline" sempre seria a mentira da F0 em nova forma — o cardápio de
 * capacidades, que é derivado do registry, anunciaria uma capacidade que não existe.
 */
import { lerUrl, type ErroLeitor, type Leitura } from "@/lib/leitor/cliente";
import { isSafePublicHttpUrl } from "@/lib/scholar/ssrf";
// SÓ TIPOS do runtime: é o `runtime` que importa esta tool pra registrar, e um import de VALOR aqui
// fecharia o ciclo. Por isso o helper de erro é local em vez de reusar o `err` de lá.
import type { Finding, ToolDef, ToolResult } from "@/lib/agent/runtime";

const falha = (error: string, code: string): ToolResult => ({ ok: false, error, code, provenance: {} });

/**
 * Quanto da página entra na evidência. O `evidenceBlock` do adaptador imprime o `claim` INTEIRO no
 * prompt do rascunho, e o Leitor devolve até 1 MB — sem teto aqui, uma página só comeria a janela.
 */
export const MAX_TEXTO_PAGINA = 4_000;

/** O título da página: a 1ª linha com substância do texto extraído; sem ela, o host. */
export function tituloDaPagina(texto: string, url: string): string {
  const linha = String(texto ?? "")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length >= 3);
  if (linha) return linha.slice(0, 160);
  try { return new URL(url).hostname; } catch { return url.slice(0, 160); }
}

/** Códigos do Leitor → código de tool. Nenhum é retentável: `leitor_offline` é configuração, não
 *  soluço de rede, e insistir num domínio fora da allowlist dá a mesma resposta (ver A2). */
const CODIGO: Record<ErroLeitor["code"], string> = {
  leitor_offline: "web_unavailable",
  leitor_dominio_fora_da_lista: "url_nao_permitida",
  leitor_recusou: "url_recusada",
  leitor_falhou: "skill_error",
};

const ehErro = (r: Leitura | ErroLeitor): r is ErroLeitor => "code" in r;

/** A leitura do Leitor → ToolResult. Pura (o teste não precisa de proxy). */
export function leituraParaResultado(r: Leitura | ErroLeitor, url: string): ToolResult {
  const at = new Date().toISOString();
  if (ehErro(r)) return { ok: false, error: r.erro, code: CODIGO[r.code] ?? "skill_error", provenance: { toolsUsed: ["abrir_url"], at } };
  // A PÁGINA respondeu, mas não com 2xx: é fato sobre o link (morto, pago, bloqueado), não falha nossa.
  if (!r.ok) return { ok: false, error: `a página respondeu ${r.status}`, code: "url_sem_conteudo", provenance: { toolsUsed: ["abrir_url"], at } };
  const texto = String(r.texto ?? "").trim();
  if (!texto) return { ok: false, error: "a página não trouxe texto legível", code: "url_sem_conteudo", provenance: { toolsUsed: ["abrir_url"], at } };
  const corte = texto.slice(0, MAX_TEXTO_PAGINA);
  const cortado = corte.length < texto.length || r.truncado;
  const titulo = tituloDaPagina(texto, r.finalUrl || url);
  const finding: Finding = {
    claim: `${titulo} <${r.finalUrl || url}>\n${corte}${cortado ? "\n[…página maior que isto; o resto não foi lido]" : ""}`,
    source: { title: titulo, url: r.finalUrl || url },
    // "baixa" é o rótulo de fonte WEB (lib/agent/runtime), e `rotuloDasFontes` conta por ele:
    // com "média" a página apareceria pro aluno como "artigo acadêmico", o que seria falso.
    confidence: "baixa",
  };
  return { ok: true, findings: [finding], provenance: { toolsUsed: ["abrir_url"], at, sources: [finding.source!] } };
}

export const abrirUrlDef: ToolDef = {
  name: "abrir_url",
  runtime: "ts",
  risk: "read",
  minPlan: "free",
  // o cliente do Leitor já tem prazo próprio (15 s + 2 s de folga); aqui fica a borda de fora
  timeoutMs: 25_000,
  schema: {
    name: "abrir_url",
    description: "Abre um endereço da web (http/https) e devolve o TEXTO da página, para responder sobre um link que a pessoa mandou.",
    parameters: {
      type: "OBJECT" as any,
      properties: { url: { type: "STRING" as any, description: "o endereço completo, com http:// ou https://" } },
      required: ["url"],
    },
  },
  async run(args) {
    const url = String(args?.url ?? "").trim();
    if (!url) return falha("endereço vazio", "bad_args");
    // 1ª barreira (a string) aqui; o Leitor confere a allowlist e o IP de verdade do lado dele
    if (!isSafePublicHttpUrl(url)) return falha("endereço não é público (http/https)", "bad_args");
    return leituraParaResultado(await lerUrl(url), url);
  },
};
