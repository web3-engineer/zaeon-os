/**
 * lib/rag/minhaBase.ts — "Minha base" (RAG F3): o que o servidor e o chat combinam sobre a base pessoal. PURO (sem I/O),
 * importável no cliente. A rota é `app/api/rag/minha-base`; o envio em lote mora em `components/chat/useAnexoChat`.
 */

/** Teto de documentos ENVIADOS na base pessoal (os gerados pelo chat têm teto próprio). */
export const LIMITE_PESSOAL = 50;
/** Teto do leitor de PDF (o mesmo de `lib/rag/ingerir` MAX_BYTES): acima disso nem sobe. */
export const MAX_BYTES_PDF = 25 * 1024 * 1024;
/** Quantos PDFs sobem ao mesmo tempo (cada um ocupa o pdf-loader por alguns segundos). */
export const ENVIOS_EM_PARALELO = 2;

export type ErroEnvio =
  | "grande_demais" | "sem_texto" | "leitura_falhou" | "indexacao_falhou" | "banco_indisponivel"
  // `nao_pdf`: a base da TURMA (admin) ainda aceita só PDF. `nao_suportado`: a base PESSOAL aceita
  // PDF e texto (.txt/.md), então "não é PDF" deixou de ser o motivo certo lá.
  | "nao_pdf" | "nao_suportado" | "limite_base" | "nao_logado" | "rede";

/** Resultado por arquivo que a rota devolve (o de `ingerirPdf` + o nome). */
export type ResultadoEnvio = {
  nomeArquivo: string;
  documentoId: string;
  status: "novo" | "reaproveitado" | "erro";
  erro?: ErroEnvio;
  trechos: number;
  paginas: number;
};

/** O motivo, em palavras de aluno. */
export function motivoDoErro(erro: ErroEnvio | undefined): string {
  switch (erro) {
    case "grande_demais": return "passa de 25 MB";
    case "sem_texto": return "não tem texto que dê pra ler (PDF escaneado?)";
    case "nao_pdf": return "não é PDF";
    case "nao_suportado": return "formato que eu não leio — manda PDF, .txt ou .md";
    case "limite_base": return `sua base chegou a ${LIMITE_PESSOAL} documentos — remova algum em Minha base`;
    case "banco_indisponivel": return "a base está fora do ar agora — tente de novo em instantes";
    case "nao_logado": return "entre na sua conta pra guardar na base";
    case "rede": return "a conexão caiu no envio — tente de novo";
    default: return "não consegui ler — tente de novo";
  }
}

const nomeSemPdf = (n: string) => n.replace(/\.pdf$/i, "");
const pags = (n: number) => (n > 0 ? ` — ${n} ${n === 1 ? "página" : "páginas"}` : "");

/**
 * A confirmação da Aura depois de um lote (Markdown). Guardados primeiro, depois o que falhou e por quê.
 * "" sem resultado nenhum.
 */
export function resumoDoEnvio(rs: ResultadoEnvio[]): string {
  const ok = rs.filter((r) => r.status !== "erro");
  const ruins = rs.filter((r) => r.status === "erro");
  const linhas: string[] = [];
  if (ok.length === 1) linhas.push(`Guardei **${nomeSemPdf(ok[0].nomeArquivo)}** na sua base${pags(ok[0].paginas)}. Já dá pra perguntar.`);
  else if (ok.length > 1) {
    linhas.push(`Guardei ${ok.length} documentos na sua base. Já dá pra perguntar sobre eles:`);
    for (const r of ok) linhas.push(`- **${nomeSemPdf(r.nomeArquivo)}**${pags(r.paginas)}`);
  }
  if (ruins.length) {
    if (linhas.length) linhas.push("");
    linhas.push(ruins.length === 1 ? "Um arquivo ficou de fora:" : `${ruins.length} arquivos ficaram de fora:`);
    for (const r of ruins) linhas.push(`- **${nomeSemPdf(r.nomeArquivo)}**: ${motivoDoErro(r.erro)}`);
  }
  return linhas.join("\n");
}
