/**
 * lib/whatsapp/zaeon/semNome.ts — o nome do aluno NÃO sai pro provedor de terceiro. PURO.
 *
 * Contexto: com `DISPAROS_HF=1` o disparo da Zaeon passa a ir PRIMEIRO pro Hugging Face
 * (Cerebras/Groq), e não só quando o Vertex falha. O prompt do disparo carrega o retrato da pessoa
 * — e `contextoEmTexto` começa com `Nome: <nome do aluno>`.
 *
 * Redigir o nome resolveria a privacidade e QUEBRARIA o produto: as instruções da Zaeon mandam
 * "trate pelo primeiro nome se souber", e uma mensagem que diz "Oi!" em vez de "Oi, Marina!" é pior.
 *
 * Então aqui não se redige: se PSEUDONIMIZA. O nome vira `{{NOME}}` na ida, o modelo escreve
 * "Bom dia, {{NOME}}!", e a volta recebe o nome de novo antes de ir pro WhatsApp. O provedor nunca
 * vê o nome; o aluno recebe a mensagem com o nome dele. Nenhum dos dois lados perde.
 *
 * O nome é trocado em TODO o prompt, não só na linha `Nome:` — ele reaparece no histórico de
 * conversa (`Últimas mensagens no WhatsApp`), que é justamente a parte mais sensível.
 */

/** A marca que vai no lugar do nome. Chaves duplas: improvável de o modelo produzir por acidente. */
export const MARCA_NOME = "{{NOME}}";

/** Escapa o nome pra entrar numa regex (nome com "." ou "(" existe e não pode virar metacaractere). */
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * As formas do nome que valem trocar: o nome inteiro primeiro (senão "Ana Paula" viraria
 * "{{NOME}} Paula"), depois o primeiro nome sozinho — que é como a Zaeon de fato chama a pessoa.
 */
export function formasDoNome(nome: string | null | undefined): string[] {
  const n = String(nome ?? "").trim().replace(/\s+/g, " ");
  if (!n) return [];
  const partes = n.split(" ").filter(Boolean);
  const formas = [n];
  if (partes.length > 1 && partes[0].length >= 2) formas.push(partes[0]);
  // Mais longo primeiro: trocar "Ana" antes de "Ana Paula" deixaria " Paula" órfão no texto.
  return [...new Set(formas)].sort((a, b) => b.length - a.length);
}

/**
 * Fronteira de LETRA, não `\b`: `\b` é ASCII, e com nome acentuado ("José") a borda cai no lugar
 * errado. `\p{L}` com flag `u` entende acento — e evita trocar "Ana" dentro de "Banana".
 */
const regexDoNome = (forma: string) => new RegExp(`(?<!\\p{L})${escapar(forma)}(?!\\p{L})`, "giu");

/** Nome → `{{NOME}}` em todo o texto. Sem nome, devolve o texto intacto. */
export function ocultarNome(texto: string, nome: string | null | undefined): string {
  let out = String(texto ?? "");
  for (const forma of formasDoNome(nome)) out = out.replace(regexDoNome(forma), MARCA_NOME);
  return out;
}

/**
 * `{{NOME}}` → o nome de verdade, no texto que vai pro aluno. Usa o PRIMEIRO nome: é assim que a
 * Zaeon fala com a pessoa, e é o que o modelo pediria se tivesse visto o nome.
 *
 * Sem nome no cadastro, a marca não pode ficar na mensagem — o aluno receberia "Oi, {{NOME}}!".
 * Nesse caso ela é apagada junto com a vírgula e o espaço que a antecedem, pro texto seguir legível.
 */
export function reporNome(texto: string, nome: string | null | undefined): string {
  const t = String(texto ?? "");
  const primeiro = formasDoNome(nome).slice(-1)[0];
  if (primeiro) return t.split(MARCA_NOME).join(primeiro);
  return t
    .replace(new RegExp(`[,;]?\\s*${escapar(MARCA_NOME)}`, "g"), "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([!?.,])/g, "$1");
}

/** O nome vazou? Checagem de teste e de guarda — o que vai pro provedor não pode conter o nome. */
export const vazouNome = (texto: string, nome: string | null | undefined): boolean =>
  formasDoNome(nome).some((f) => regexDoNome(f).test(String(texto ?? "")));
