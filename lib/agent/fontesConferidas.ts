/**
 * #873 PR 3 (parte 2) · FONTE INVENTADA. No Escritório, resumindo um texto colado (sem fonte nenhuma), o agente listou
 * "Faculdade de Direito da UFMG — https://www.ufmg.br/…" (link cortado, genérico — inventado) e "Brasil Escola — …"
 * (acertou, mas por palpite). Numa plataforma de estudo, fonte errada vai parar no TCC.
 *
 * A lista "Fontes" é escrita pelo modelo. Aqui o CÓDIGO confere cada uma com o que o turno realmente teve em mãos
 * (a evidência das ferramentas — busca web, livros, base — e o texto do pedido):
 * - achou → fica como está;
 * - não achou → fica como PALPITE: sem o link (um link inventado é o pior caso: parece conferível) e com
 *   "(provável — confira)" no título.
 * Link cortado com "…" nunca é link de verdade. PURO.
 */
import type { Source } from "@/lib/agent/contracts";

export const MARCA_PROVAVEL = "(provável — confira)";

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** "https://www.Brasil Escola.uol.com.br/x/?a=1#b" → "brasilescola.uol.com.br/x" (pra comparar link com link) */
export function chaveDoLink(url: string): string {
  return semAcento(String(url ?? ""))
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
    .replace(/\s+/g, "");
}

const linkCortado = (url: string) => /…|\.\.\.$/.test(url);

export function fontesConferidas(
  sources: readonly Source[],
  doTurno: { evidencia: readonly (Source | undefined)[]; textos: readonly string[] },
): Source[] {
  const links = new Set(doTurno.evidencia.filter((s): s is Source => !!s?.url).map((s) => chaveDoLink(s.url!)));
  const titulos = doTurno.evidencia.filter((s): s is Source => !!s?.title).map((s) => semAcento(s.title));
  const texto = semAcento(doTurno.textos.join("\n"));
  const textoSemEspaco = texto.replace(/\s+/g, "");

  const linkConfere = (url: string) => {
    const k = chaveDoLink(url);
    if (!k || linkCortado(url)) return false;
    for (const l of links) if (l === k || l.startsWith(k + "/") || k.startsWith(l + "/")) return true;
    return textoSemEspaco.includes(k);
  };
  const tituloConfere = (title: string) => {
    const t = semAcento(title).trim();
    if (t.length < 4) return false;
    return titulos.some((x) => x.includes(t) || t.includes(x)) || texto.includes(t);
  };

  return sources.map((s) => {
    const confere = s.url ? linkConfere(s.url) : tituloConfere(s.title);
    if (confere) return s;
    if (s.title.includes(MARCA_PROVAVEL)) return { ...s, url: undefined };
    const { url: _sem, ...resto } = s;
    return { ...resto, title: `${s.title.trim()} ${MARCA_PROVAVEL}` };
  });
}
