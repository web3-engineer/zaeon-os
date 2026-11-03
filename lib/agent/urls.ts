/**
 * lib/agent/urls.ts — as URLs que a pessoa COLOU na mensagem. PURO.
 *
 * POR QUE ISSO EXISTE: o `plan()` do harness chama toda tool com `args: { query: objetivo }` — o
 * plano é fixo e o modelo não escolhe nem argumento nem tool (docs/PLANO_HARNESS_AGENTICO.md §1).
 * Uma tool de URL precisa da URL, não de uma consulta. Até a F2 (o modelo escolhendo tool), quem
 * extrai o endereço é o CÓDIGO — determinístico, testável, sem gastar chamada de modelo. É o mesmo
 * padrão que `pedeLivro`/`pedeAula` já usam pra mandar mais que o palpite do roteador.
 */
import { isSafePublicHttpUrl } from "@/lib/scholar/ssrf";

/**
 * Teto de páginas por turno. Baixo de propósito: cada página lida entra inteira na evidência do
 * rascunho, e o pool grátis tem teto apertado (o Groq roda com 8K TPM). Três links colados é o caso
 * real; uma lista de vinte é outro produto.
 */
export const MAX_URLS = 3;

/** `www.` sem esquema é endereço na prática — vira https:// (nunca http://). */
const SEM_ESQUEMA = /^www\./i;

// Para a URL no primeiro espaço ou em caracteres que não existem em endereço colado em prosa.
const BRUTA = /(?:https?:\/\/|www\.)[^\s<>"'`«»]+/gi;

/** Pontuação de FRASE no fim do endereço ("veja em exemplo.com/a.") — o ponto é da frase, não da URL. */
const FIM_DE_FRASE = /[.,;:!?…"'»\]]+$/;

/**
 * Tira o que a prosa colou no fim do endereço. Parêntese fecha-sem-abrir sai (é do markdown
 * `[texto](url)` ou de um aparte); parêntese BALANCEADO fica, porque existe de verdade em URL —
 * o caso clássico é a Wikipédia: /wiki/Python_(linguagem).
 */
export function limparFim(bruta: string): string {
  let u = bruta;
  for (;;) {
    const antes = u;
    u = u.replace(FIM_DE_FRASE, "");
    while (u.endsWith(")") && (u.match(/\(/g)?.length ?? 0) < (u.match(/\)/g)?.length ?? 0)) u = u.slice(0, -1);
    if (u === antes) return u;
  }
}

/**
 * As URLs públicas da mensagem, na ordem, sem repetir, no teto. Endereço interno/privado nem
 * aparece (o mesmo guard do proxy de PDF) — e o Leitor confere de novo, no IP, do lado dele.
 */
export function urlsDoTexto(texto: string, max = MAX_URLS): string[] {
  const achadas = String(texto ?? "").match(BRUTA) ?? [];
  const out: string[] = [];
  const vistas = new Set<string>();
  for (const bruta of achadas) {
    const limpa = limparFim(bruta);
    if (!limpa) continue;
    const url = SEM_ESQUEMA.test(limpa) ? `https://${limpa}` : limpa;
    if (!isSafePublicHttpUrl(url)) continue;
    // mesma página escrita de dois jeitos não é duas leituras
    const chave = url.replace(/\/+$/, "").toLowerCase();
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    out.push(url);
    if (out.length >= max) break;
  }
  return out;
}

/** A mensagem tem endereço pra ler? (atalho, sem alocar a lista toda quando só o sim/não importa) */
export const temUrl = (texto: string): boolean => urlsDoTexto(texto, 1).length > 0;
