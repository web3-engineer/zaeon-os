/**
 * lib/rag/docx.ts — arquivo do Word (.docx) → Markdown, pro MESMO caminho do .txt/.md.
 *
 * POR QUE EXISTE: o chat nunca leu Word. `lib/agent/anexos-server.ts` só deixava PDF entrar no
 * harness (`if (!peca || !ehPdf(peca.mime)) return []`) e `lib/rag/textoArquivo.ts` só aceitava
 * .txt/.md — com um comentário meu dizendo que o .docx ficou de fora "DE PROPÓSITO: precisa de uma
 * dependência nova (mammoth/jszip) e isso é decisão de quem mantém o deploy". O dono decidiu
 * ("chat nao ta lendo documentos .word", crítico), então a dependência entra.
 *
 * O DESENHO, em uma linha: .docx → HTML (mammoth) → **Markdown** (nosso, puro) → o parser de
 * blocos que já existe. Não é atalho —
 * é o que preserva a ESTRUTURA. `cortarEmTrechos` monta o caminho do trecho ("título › Capítulo 1 ›
 * 1.1") a partir dos blocos `heading`, e é esse caminho que faz a citação ser rastreável. Extrair
 * texto cru (`extractRawText`) jogaria todo "## Estado da Arte" no corpo e perderia a hierarquia
 * que o Word já tinha escrita.
 *
 * TRÊS COISAS QUE SÓ APARECERAM EXECUTANDO o mammoth contra um .docx de verdade:
 *
 *  1. o estilo **Title** do Word NÃO é reconhecido pelo mapa default ("Unrecognised paragraph
 *     style: 'Title'") e saía como parágrafo comum — o título da monografia virava corpo de texto.
 *     Daí o `MAPA_DE_ESTILO`. Com Title → h1, o primeiro `#` vira o título do documento e os
 *     `Heading 1` seguintes viram seções, que é exatamente o que o parser de blocos espera.
 *  2. o `convertToMarkdown` do mammoth **ESCAPA pontuação** ("1\.1\.") e não está nos tipos do
 *     pacote. Por isso a fonte aqui é o **HTML** (`convertToHtml`, tipado e suportado) e a
 *     conversão pra Markdown é nossa, PURA e testada contra a saída real.
 *  3. `.doc` (o binário antigo do Word) **não** é .docx e o mammoth não lê. Detectar e DIZER isso é
 *     melhor que devolver vazio: `ehDocAntigo` existe pra a mensagem ser honesta.
 */

/** Extensões aceitas. `.docm` entra: é .docx com macro, e o texto sai igual (a macro é ignorada). */
export const EXTENSOES_DOCX = [".docx", ".docm"] as const;

/** MIMEs que os navegadores mandam. Vários mandam `application/octet-stream` — daí a extensão valer. */
export const MIMES_DOCX = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-word.document.macroenabled.12",
] as const;

/** O `.doc` ANTIGO (binário, pré-2007). Não é .docx e o mammoth não abre — ver a nota 3 acima. */
export const EXTENSOES_DOC_ANTIGO = [".doc", ".dot"] as const;
export const MIMES_DOC_ANTIGO = ["application/msword"] as const;

type Arquivo = { name?: string; type?: string };
const mimeDe = (f: Arquivo) => String(f.type ?? "").toLowerCase().split(";")[0]!.trim();
const nomeDe = (f: Arquivo) => String(f.name ?? "").toLowerCase();

/** É Word moderno (.docx/.docm)? Olha o MIME E a extensão: nenhum dos dois é confiável só. */
export function ehArquivoDocx(f: Arquivo): boolean {
  if ((MIMES_DOCX as readonly string[]).includes(mimeDe(f))) return true;
  const n = nomeDe(f);
  return EXTENSOES_DOCX.some((e) => n.endsWith(e));
}

/** É o .doc BINÁRIO antigo? Separado de propósito: a recusa dele tem conserto (salvar como .docx). */
export function ehDocAntigo(f: Arquivo): boolean {
  if ((MIMES_DOC_ANTIGO as readonly string[]).includes(mimeDe(f))) return true;
  const n = nomeDe(f);
  return EXTENSOES_DOC_ANTIGO.some((e) => n.endsWith(e));
}

/**
 * O mapa de estilo. Só acrescenta o que o default do mammoth NÃO cobre e que importa pra estrutura
 * acadêmica; o resto do mapa default continua valendo (`:fresh` evita juntar parágrafos seguidos).
 */
export const MAPA_DE_ESTILO: readonly string[] = [
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Título'] => h1:fresh",          // Word em pt-BR
  "p[style-name='Subtitle'] => h2:fresh",
  "p[style-name='Subtítulo'] => h2:fresh",
];

/**
 * PURA · o HTML do mammoth → Markdown. Escrita contra a SAÍDA REAL, não contra imaginação: o
 * mammoth emite um conjunto FECHADO de tags, sem atributos de estilo, e foi isso que tornou um
 * conversor focado defensável em vez de temerário. A saída medida do .docx de prova:
 *
 *   <h1>Monografia de Teste</h1><h1>Introdução</h1><p>Este é o primeiro…</p>
 *   <p><strong>negrito importante.</strong></p><h2>Estado da Arte</h2><p>…subseção 1.1.</p>
 *
 * POR QUE NÃO `convertToMarkdown`: ele existe em runtime, mas (a) NÃO está nos tipos do pacote
 * (`tsc` reprovou) e a documentação o trata como depreciado, e (b) ESCAPA pontuação — escrevia
 * `importante\.` e, pior, `1\.1\.`, numeração de seção com barra invertida no meio, que iria pro
 * prompt do modelo e pros trechos do RAG. O HTML não tem nenhum dos dois problemas.
 *
 * POR QUE NÃO jsdom: já está no projeto, mas só como devDependency (ambiente do vitest). Promovê-la
 * a dependência de produção por causa disto custaria ~40 MB na imagem para parsear um HTML gerado.
 *
 * A IMAGEM É DESCARTADA, e isto não é perda de zelo — é a trava que impede um defeito grave: o
 * mammoth embute imagem como `<img src="data:image/png;base64,…">` por PADRÃO, e um .docx com duas
 * figuras injetaria megabytes de base64 no prompt do modelo e nos trechos do RAG. O que fica é um
 * marcador, pra a leitura não mentir dizendo que ali não havia nada.
 */
export function htmlDoWordParaMarkdown(html: string): string {
  let t = String(html ?? "");
  // 1 · a imagem sai ANTES de tudo (o src base64 pode ter megabytes)
  t = t.replace(/<img\b[^>]*>/gi, "\n[imagem]\n");
  // 2 · ênfase, antes de as tags de bloco virarem quebra de linha
  t = t.replace(/<\/?(strong|b)\b[^>]*>/gi, "**").replace(/<\/?(em|i)\b[^>]*>/gi, "*");
  // 3 · títulos: o nível vem da própria tag, e é ele que faz `cortarEmTrechos` montar
  //     "título › Capítulo 1 › 1.1" — a razão de todo este módulo existir
  t = t.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi, (_m, n: string, dentro: string) =>
    `\n\n${"#".repeat(Number(n))} ${dentro.replace(/<[^>]+>/g, " ").trim()}\n\n`);
  // 4 · TABELA: a tabela INTEIRA de uma vez, e a ordem importa. A primeira tentativa trocou
  //     `</td><td>` por " | " e deixou as regras genéricas cuidarem do resto — e saiu lixo, porque
  //     o mammoth embrulha cada célula num parágrafo (`<td><p>Ano</p></td>`) e a regra de parágrafo
  //     partia a linha antes de ela existir. Só apareceu EXECUTANDO contra um .docx com tabela.
  //     Perde o alinhamento e preserva o DADO, que é o que se cita.
  t = t.replace(/<table\b[^>]*>([\s\S]*?)<\/table\s*>/gi, (_m, dentro: string) => {
    const linhas = [...dentro.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)].map((lin) =>
      [...String(lin[1] ?? "").matchAll(/<(t[dh])\b[^>]*>([\s\S]*?)<\/\1\s*>/gi)]
        .map((cel) => String(cel[2] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
        .join(" | "),
    ).filter(Boolean);
    return linhas.length ? `\n\n${linhas.join("\n")}\n\n` : "\n\n";
  });
  // 5 · lista
  t = t.replace(/<li\b[^>]*>/gi, "\n- ").replace(/<\/li\s*>/gi, "");
  t = t.replace(/<blockquote\b[^>]*>/gi, "\n\n> ");
  // 6 · os blocos restantes viram quebra de parágrafo; o resto das tags, nada
  t = t.replace(/<\/?(p|div|ul|ol|table|tbody|thead|tr|td|th|section|article)\b[^>]*>/gi, "\n\n");   // tabela já consumida; estas sobram de HTML malformado
  t = t.replace(/<br\s*\/?>/gi, "\n");
  t = t.replace(/<[^>]+>/g, "");
  // 7 · entidades (o mammoth escapa & < > e aspas)
  t = t.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<")
       .replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#0?39;|&apos;/gi, "'");
  // 8 · arruma espaço em branco SEM colar parágrafos: 3+ quebras viram 2
  return t.split("\n").map((l) => l.replace(/[ \t\f\v\r]+/g, " ").trimEnd())
          .join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** O que a conversão devolve. `avisos` são as mensagens do mammoth (estilo não reconhecido etc.). */
export type ConversaoDocx = { markdown: string; avisos: string[] };

/**
 * .docx → Markdown. Server-only (o mammoth é dependência de Node), e por isso o import é TARDIO:
 * sem ele, qualquer módulo que só queira `ehArquivoDocx` arrastaria o mammoth pro bundle.
 */
export async function docxParaMarkdown(bytes: Uint8Array): Promise<ConversaoDocx> {
  const mammoth = await import("mammoth");
  const r = await mammoth.convertToHtml(
    { buffer: Buffer.from(bytes) },
    { styleMap: [...MAPA_DE_ESTILO] },
  );
  return {
    markdown: htmlDoWordParaMarkdown(String(r?.value ?? "")),
    avisos: (r?.messages ?? []).map((m) => String(m?.message ?? "")).filter(Boolean),
  };
}
