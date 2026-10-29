/**
 * lib/rag/textoArquivo.ts — arquivo de TEXTO (.txt/.md) → `Block[]`, pro mesmo caminho dos PDFs. PURO.
 *
 * Até agora a porta da base pessoal só aceitava PDF (`nao_pdf`), e o aluno que tinha as anotações
 * em .txt ou .md não conseguia subir nada. A ingestão em si já sabia lidar com texto
 * (`ingerirTexto`, lib/rag/ingerir.ts): dedupe por hash, corte em trechos, fila de vetores. O que
 * faltava era só a porta — e preservar a ESTRUTURA.
 *
 * Por que a estrutura importa: `cortarEmTrechos` monta o caminho do trecho
 * ("título › Capítulo 1 › 1.1") a partir dos blocos `heading`, e é esse caminho que faz a citação
 * ser rastreável. Jogar o Markdown inteiro como parágrafos — o que o `ingerirTexto` faz hoje —
 * transforma `## Estado da Arte` em corpo de texto e perde a hierarquia que o próprio arquivo já
 * tinha escrita. Então aqui a gente lê os `#` como títulos, com nível.
 *
 * `.docx` ficou de fora DE PROPÓSITO: precisa de uma dependência nova (mammoth/jszip) e isso é
 * decisão de quem mantém o deploy, não efeito colateral de uma correção de porta.
 */
import type { Block } from "@/lib/scholar/types";

/** Extensões aceitas como texto. `.markdown` e `.text` entram porque editor nenhum concorda. */
export const EXTENSOES_TEXTO = [".txt", ".md", ".markdown", ".text", ".mdown"] as const;

/** MIMEs que os navegadores mandam pra esses arquivos (vários mandam vazio — daí a extensão valer). */
export const MIMES_TEXTO = ["text/plain", "text/markdown", "text/x-markdown", "text/x-web-markdown"] as const;

/** O arquivo é texto que a gente aceita? Olha o MIME E a extensão: nenhum dos dois é confiável só. */
export function ehArquivoTexto(f: { name?: string; type?: string }): boolean {
  const tipo = String(f.type ?? "").toLowerCase().split(";")[0].trim();
  if ((MIMES_TEXTO as readonly string[]).includes(tipo)) return true;
  const nome = String(f.name ?? "").toLowerCase();
  return EXTENSOES_TEXTO.some((e) => nome.endsWith(e));
}

/** Tira a extensão conhecida do nome — vira o título quando o arquivo não tem um `# título`. */
export function semExtensao(nome: string): string {
  const n = String(nome ?? "").trim();
  for (const e of EXTENSOES_TEXTO) if (n.toLowerCase().endsWith(e)) return n.slice(0, -e.length);
  return n;
}

const CERCA = /^\s*(```|~~~)/;
const ATX = /^(#{1,6})\s+(.*\S)\s*#*\s*$/;

/**
 * Título do documento: o primeiro `# h1` do arquivo, senão o nome do arquivo. O `#` dentro de bloco
 * de código não conta (um `# comentário` em shell não é título de capítulo).
 */
export function tituloDeTexto(nome: string, texto: string): string {
  let dentroDeCerca = false;
  for (const linha of String(texto ?? "").split(/\r?\n/)) {
    if (CERCA.test(linha)) { dentroDeCerca = !dentroDeCerca; continue; }
    if (dentroDeCerca) continue;
    const m = ATX.exec(linha);
    if (m && m[1].length === 1) return m[2].trim();
  }
  return semExtensao(nome);
}

/**
 * Texto → blocos. Markdown ganha `heading` com nível; texto puro vira parágrafos sob um título só.
 * Tudo em `page: 1`: arquivo de texto não tem página, e inventar número quebraria a citação.
 *
 * Linha de cerca (``` / ~~~) suspende a leitura de títulos, e o conteúdo do bloco de código vai
 * junto como parágrafo — é conteúdo, e descartar texto do aluno não é papel desta função.
 */
export function blocosDeTexto(texto: string, titulo: string): Block[] {
  const linhas = String(texto ?? "").split(/\r?\n/);
  const blocks: Block[] = [];
  const t = String(titulo ?? "").trim();
  if (t) blocks.push({ type: "heading", level: 1, page: 1, text: t });

  let buffer: string[] = [];
  let dentroDeCerca = false;
  // O `# título` que deu nome ao documento não entra de novo como seção. Só o PRIMEIRO: um arquivo
  // com dois `# Introdução` tem duas seções, e silenciar a segunda apagaria conteúdo.
  let tituloJaConsumido = !t;
  const despejar = () => {
    const p = buffer.join("\n").trim();
    if (p) blocks.push({ type: "paragraph", page: 1, text: p });
    buffer = [];
  };

  for (const linha of linhas) {
    if (CERCA.test(linha)) { dentroDeCerca = !dentroDeCerca; buffer.push(linha); continue; }
    if (!dentroDeCerca) {
      const m = ATX.exec(linha);
      if (m) {
        despejar();
        const nivel = m[1].length;
        const cabecalho = m[2].trim();
        if (!tituloJaConsumido && nivel === 1 && cabecalho === t) tituloJaConsumido = true;
        else blocks.push({ type: "heading", level: nivel, page: 1, text: cabecalho });
        continue;
      }
      if (!linha.trim()) { despejar(); continue; }
    }
    buffer.push(linha);
  }
  despejar();
  return blocks;
}

/** Decodifica os bytes como UTF-8, tirando o BOM (Notepad do Windows põe um). */
export function textoDeBytes(bytes: Uint8Array): string {
  const s = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}
