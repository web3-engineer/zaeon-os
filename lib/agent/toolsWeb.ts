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
import { baixarUrl, lerUrl, type ErroLeitor, type Leitura } from "@/lib/leitor/cliente";
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
  leitor_grande_demais: "arquivo_grande_demais",
  leitor_tipo_nao_baixavel: "tipo_nao_suportado",
  leitor_https_obrigatorio: "precisa_https",
  leitor_ocupado: "leitor_ocupado",
  leitor_loop_redirect: "loop_redirect",
  leitor_endereco_interno: "endereco_interno",
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

// ─────────────────────────── F1b · baixar_para_base ───────────────────────────
/**
 * `baixar_para_base`: baixa um arquivo (PDF/.txt/.md/.csv) e o GUARDA na base de conhecimento da
 * pessoa — o segundo buraco que produzia "vou baixar a CSV pra você".
 *
 * Os bytes vêm do Leitor (`POST /bytes`), pela mesma allowlist: a opção (a) do portão do dono. A
 * alternativa era buscar no processo web com `buscarSeguro`, o que violaria a lei da Fatia 7 — e é
 * justamente o padrão que o advisory do DeepSeek Harness (discussions/3051) mostra sendo explorado
 * por injeção indireta, quando quem busca é o processo que tem contexto e credencial.
 *
 * O DESTINO é a ingestão de sempre (`lib/rag/ingerir`), com `permissao: { donoId }` — o arquivo é da
 * pessoa, nunca da turma — e respeitando `LIMITE_PESSOAL`, que a rota já checa e que uma tool
 * passando por fora precisa checar também.
 */
const EXT_POR_TIPO: Record<string, string> = {
  "application/pdf": ".pdf", "text/plain": ".txt", "text/csv": ".csv",
  "text/markdown": ".md", "text/x-markdown": ".md",
};

/** O nome do arquivo a partir da URL (com extensão coerente com o tipo que voltou). */
export function nomeDoArquivo(finalUrl: string, contentType: string): string {
  let bruto = "";
  try { bruto = decodeURIComponent(new URL(finalUrl).pathname.split("/").filter(Boolean).pop() ?? ""); } catch { bruto = ""; }
  // nada de caminho nem caractere de controle vindo da URL
  const limpo = bruto.replace(/[/\\]/g, "_").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 120);
  const ext = EXT_POR_TIPO[contentType] ?? "";
  if (!limpo) return `arquivo${ext || ".txt"}`;
  return ext && !limpo.toLowerCase().endsWith(ext) ? `${limpo}${ext}` : limpo;
}

export const baixarParaBaseDef: ToolDef = {
  name: "baixar_para_base",
  runtime: "ts",
  // ESCREVE (na base da pessoa): em `execMode: "guiado"` o permit manda pra aprovação, como deve.
  risk: "write",
  minPlan: "free",
  // 25 MB pelo proxy + extração do PDF: o teto de 20 s do runtime `ts` não cabe
  timeoutMs: 90_000,
  schema: {
    name: "baixar_para_base",
    description: "Baixa um arquivo (PDF, .txt, .md, .csv) de um endereço https e guarda na base de conhecimento da pessoa, para poder ser consultado e citado depois.",
    parameters: {
      type: "OBJECT" as any,
      properties: { url: { type: "STRING" as any, description: "o endereço https completo do arquivo" } },
      required: ["url"],
    },
  },
  async run(args, ctx) {
    const url = String(args?.url ?? "").trim();
    if (!url) return falha("endereço vazio", "bad_args");
    if (!isSafePublicHttpUrl(url)) return falha("endereço não é público (http/https)", "bad_args");
    const userId = (ctx as { userId?: string })?.userId;
    // sem dono não há base: guardar na de outra pessoa seria pior que não guardar
    if (!userId) return falha("é preciso estar logado para guardar na base", "nao_logado");

    const at = () => new Date().toISOString();
    const r = await baixarUrl(url);
    if ("code" in r) return { ok: false, error: r.erro, code: CODIGO[r.code] ?? "skill_error", provenance: { toolsUsed: ["baixar_para_base"], at: at() } };
    if (!r.ok) return { ok: false, error: `a origem respondeu ${r.status}`, code: "url_sem_conteudo", provenance: { toolsUsed: ["baixar_para_base"], at: at() } };
    if (!r.bytes.byteLength) return { ok: false, error: "o arquivo veio vazio", code: "url_sem_conteudo", provenance: { toolsUsed: ["baixar_para_base"], at: at() } };

    const [{ ragPg, ehBancoIndisponivel }, { contarEnviadosPessoais }, { LIMITE_PESSOAL }, ingerir, { enfileirarIndexacao }] = await Promise.all([
      import("@/lib/rag/pg"), import("@/lib/rag/store"), import("@/lib/rag/minhaBase"),
      import("@/lib/rag/ingerir"), import("@/lib/queue/rag"),
    ]);
    const nomeArquivo = nomeDoArquivo(r.finalUrl || url, r.contentType);
    try {
      const db = ragPg();
      // o mesmo teto que a rota aplica: uma tool por fora não pode furar o limite da base
      if ((await contarEnviadosPessoais(db, userId)) >= LIMITE_PESSOAL) {
        return { ok: false, error: `a base chegou a ${LIMITE_PESSOAL} documentos`, code: "limite_base", provenance: { toolsUsed: ["baixar_para_base"], at: at() } };
      }
      const comum = { origem: "chat" as const, criadoPor: userId, permissao: { donoId: userId } };
      let res;
      if (r.contentType === "application/pdf") {
        const { extractPdfStructured } = await import("@/lib/scholar/pdf");
        res = await ingerir.ingerirPdf({ db, extrair: extractPdfStructured, enfileirar: enfileirarIndexacao }, { bytes: r.bytes, nomeArquivo, ...comum });
      } else {
        const { blocosDeTexto, textoDeBytes, tituloDeTexto } = await import("@/lib/rag/textoArquivo");
        const conteudo = textoDeBytes(r.bytes);
        const titulo = tituloDeTexto(nomeArquivo, conteudo);
        res = await ingerir.ingerirTexto({ db, enfileirar: enfileirarIndexacao }, { titulo, texto: conteudo, chave: nomeArquivo, blocos: blocosDeTexto(conteudo, titulo), ...comum });
      }
      if (res.status === "erro") return { ok: false, error: `não consegui ler o arquivo (${res.erro ?? "falha"})`, code: res.erro ?? "leitura_falhou", provenance: { toolsUsed: ["baixar_para_base"], at: at() } };

      // O RECIBO — e ele diz o que NÃO aconteceu também. A ingestão guarda e extrai, mas os vetores
      // vão pra fila: neste turno o conteúdo ainda não é buscável. Sem esta frase o modelo diria o
      // que o arquivo "diz", que é a mentira da F0 um passo adiante.
      const jaTinha = res.status === "reaproveitado";
      const claim =
        `${jaTinha ? "Já estava" : "Guardei"} na base de conhecimento desta pessoa: "${nomeArquivo}"` +
        `${res.paginas ? ` (${res.paginas} ${res.paginas === 1 ? "página" : "páginas"})` : ""}` +
        `${res.trechos ? `, ${res.trechos} trechos` : ""}. ` +
        "O conteúdo AINDA NÃO está indexado neste turno — diga que o arquivo foi guardado e que já dá " +
        "pra perguntar sobre ele, mas NÃO afirme o que ele diz.";
      return {
        ok: true,
        findings: [{ claim, source: { title: nomeArquivo, url: r.finalUrl || url }, confidence: "alta" }],
        provenance: { toolsUsed: ["baixar_para_base"], at: at(), sources: [{ title: nomeArquivo, url: r.finalUrl || url }] },
      };
    } catch (e) {
      if (ehBancoIndisponivel(e)) return { ok: false, error: "a base está fora do ar agora", code: "banco_indisponivel", provenance: { toolsUsed: ["baixar_para_base"], at: at() } };
      // o nome do arquivo é da pessoa: não vai pro log
      console.error("[baixar_para_base] falhou:", String((e as Error)?.message ?? e).slice(0, 160));
      return { ok: false, error: "não consegui guardar o arquivo", code: "skill_error", provenance: { toolsUsed: ["baixar_para_base"], at: at() } };
    }
  },
};

/** Extensões que a ingestão sabe ler — é o que decide `baixar_para_base` em vez de `abrir_url`. */
const EXT_BAIXAVEL = /\.(pdf|txt|md|markdown|csv)$/i;

/** A URL aponta pra um ARQUIVO que vale baixar (em vez de uma página pra ler)? */
export function ehUrlDeArquivo(url: string): boolean {
  try { return EXT_BAIXAVEL.test(new URL(url).pathname); } catch { return false; }
}
