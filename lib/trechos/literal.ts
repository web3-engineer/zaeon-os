/**
 * lib/trechos/literal.ts — as peças PURAS da skill de trechos (sem rede, banco nem modelo). Cliente e servidor.
 *
 * A regra que não se negocia: TRECHO É TEXTO DO DOCUMENTO. O modelo aponta a passagem; o código a localiza no
 * texto do trecho e devolve a substring ORIGINAL (com a pontuação, o acento e a caixa do documento). Citação que não
 * é achada no documento não vira folha de papel — paráfrase do modelo nunca passa por citação.
 *
 * A localização é tolerante só ao que não muda o que está escrito: espaço/quebra de linha, aspas e travessões
 * tipográficos, caixa e acento (o PDF às vezes perde o acento; o modelo às vezes o "corrige").
 */

// ───────────────────────────── normalização com mapa de índices ─────────────────────────────
const TROCAS: Record<string, string> = {
  "\u201c": '"', "\u201d": '"', "\u201e": '"', "\u00ab": '"', "\u00bb": '"', "\u2018": "'", "\u2019": "'",
  "\u2013": "-", "\u2014": "-", "\u2212": "-", "\u00a0": " ", "\u00ad": "",
};

/** Texto normalizado + o índice ORIGINAL de cada caractere dele (pra devolver a substring do documento). */
export function normalizarComMapa(s: string): { n: string; mapa: number[] } {
  let n = "";
  const mapa: number[] = [];
  let espaco = false;
  for (let i = 0; i < s.length; i++) {
    let c = TROCAS[s[i]!] ?? s[i]!;
    if (!c) continue;
    if (/\s/.test(c)) {
      if (espaco || !n.length) continue;
      espaco = true;
      n += " ";
      mapa.push(i);
      continue;
    }
    espaco = false;
    c = c.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    for (const ch of c) { n += ch; mapa.push(i); }
  }
  if (n.endsWith(" ")) { n = n.slice(0, -1); mapa.pop(); }
  return { n, mapa };
}

export const normalizar = (s: string) => normalizarComMapa(String(s ?? "")).n;

const limparPontas = (s: string) => s.replace(/^[\s"'«»“”‘’…\-.]+|[\s"'«»“”‘’…\-]+$/g, "");

/**
 * Onde a citação está no texto do trecho. Exata (após normalizar) primeiro; senão, ancorada pelo começo e pelo fim
 * (o modelo encurtou o meio com "…" ou trocou uma palavra): só vale se o pedaço achado tiver tamanho parecido com o
 * pedido — nunca "do começo de um parágrafo ao fim do documento". Devolve os índices no texto ORIGINAL.
 */
export function localizarLiteral(texto: string, citacao: string): { ini: number; fim: number } | null {
  const alvo = normalizar(limparPontas(String(citacao ?? "")));
  if (alvo.length < 12) return null;
  const orig = String(texto ?? "");
  const { n, mapa } = normalizarComMapa(orig);
  const daqui = (a: number, b: number) => {
    let fim = (mapa[b - 1] ?? mapa[a]!) + 1;
    // a aspa que abriu dentro do recorte fecha dentro dele: devolve a de fechamento junto
    const recorte = orig.slice(mapa[a]!, fim);
    const abertas = (recorte.match(/["“«]/g)?.length ?? 0) - (recorte.match(/[”»]/g)?.length ?? 0);
    if (abertas % 2 === 1 && /["”»]/.test(orig[fim] ?? "")) fim++;
    return { ini: mapa[a]!, fim };
  };

  const exato = n.indexOf(alvo);
  if (exato >= 0) return daqui(exato, exato + alvo.length);

  // "começo … fim": o modelo elidiu o meio (com reticências) ou trocou uma palavra (sem elas)
  const partes = alvo.split(/\s*(?:\.{3}|…)\s*/).map((p) => p.trim()).filter(Boolean);
  const elidiu = partes.length > 1;
  const cabeca = partes[0]!.slice(0, 48);
  const cauda = partes[partes.length - 1]!.slice(-40);
  if (cabeca.length < 10 || cauda.length < 6) return null;
  const ini = n.indexOf(cabeca);
  if (ini < 0) return null;
  const desde = elidiu ? ini + partes[0]!.length : ini + Math.max(cabeca.length, alvo.length - cauda.length - 8);
  const fimCauda = n.indexOf(cauda, desde);
  if (fimCauda < 0) return null;
  const fim = fimCauda + cauda.length;
  const tam = fim - ini;
  const soma = partes.reduce((x, p) => x + p.length, 0);
  // sem reticências: tamanho parecido com o pedido. Com reticências: o meio pode ter sido longo, mas não um capítulo.
  if (elidiu ? tam > soma * 3 + 240 : tam < alvo.length * 0.6 || tam > alvo.length * 1.6 + 40) return null;
  return daqui(ini, fim);
}

/** Até `max` caracteres antes/depois do recorte, cortados em palavra, com "…" quando cortou. */
export function contexto(texto: string, ini: number, fim: number, max = 180): { antes: string; depois: string } {
  let a = Math.max(0, ini - max);
  if (a > 0) { const esp = texto.indexOf(" ", a); a = esp >= 0 && esp < ini ? esp + 1 : a; }
  let b = Math.min(texto.length, fim + max);
  if (b < texto.length) { const esp = texto.lastIndexOf(" ", b); b = esp > fim ? esp : b; }
  const antes = texto.slice(a, ini).replace(/\s+/g, " ").trimStart();
  const depois = texto.slice(fim, b).replace(/\s+/g, " ").trimEnd();
  return { antes: antes ? `${a > 0 ? "…" : ""}${antes}` : "", depois: depois ? `${depois}${b < texto.length ? "…" : ""}` : "" };
}

export const faixaDePaginas = (ini: number, fim: number) => (fim > ini ? `${ini}–${fim}` : String(ini));

// ───────────────────────────── termos: a varredura exaustiva ─────────────────────────────
const VAZIAS = new Set(("a o os as um uma uns umas de do da dos das no na nos nas em por para com sem que se e ou mas como " +
  "mais menos muito pouco sobre entre ate quando onde qual quais quem cujo esse essa este esta isso isto aquilo ao aos " +
  "trecho trechos material documento texto pdf apostila livro arquivo base pagina paginas fala diz mostre mostra ache " +
  "encontre localize cite todos todas cada vez vezes parte partes meu minha meus minhas seu sua").split(" "));

/** Termos de conteúdo da pergunta (fallback do plano, quando o modelo não respondeu). */
export function termosDaPergunta(pergunta: string, max = 6): string[] {
  const vistos = new Set<string>();
  const out: string[] = [];
  for (const w of normalizar(pergunta).split(/[^a-z0-9]+/)) {
    if (w.length < 4 || VAZIAS.has(w) || vistos.has(w)) continue;
    vistos.add(w);
    out.push(w);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * O termo aparece no texto? Acento/caixa não contam, e o termo casa no COMEÇO de palavra ("fotossint" acha
 * "fotossíntese"; "ato" não acha "contato"). Termo de várias palavras = a sequência inteira.
 */
export function contemTermo(texto: string, termo: string): boolean {
  const t = normalizar(termo).trim();
  if (t.length < 3) return false;
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
  return new RegExp(`(^|[^a-z0-9])${esc}`).test(normalizar(texto));
}

/** A frase do trecho com mais termos — a citação de reserva quando o juiz (modelo) não respondeu. */
/** Cada frase do texto com a sua pontuação (quantos termos contém). Base das duas reservas abaixo. */
export function frasesPontuadas(texto: string, termos: readonly string[]): Array<{ frase: string; pontos: number }> {
  return String(texto ?? "").split(/(?<=[.!?;:])\s+|\n{2,}/).map((f) => f.trim()).filter((f) => f.length >= 30)
    .map((frase) => ({ frase: frase.slice(0, 600), pontos: termos.filter((t) => contemTermo(frase, t)).length }));
}

export function fraseComMaisTermos(texto: string, termos: readonly string[]): string | null {
  const frases = String(texto ?? "").split(/(?<=[.!?;:])\s+|\n{2,}/).map((f) => f.trim()).filter((f) => f.length >= 30);
  let melhor: string | null = null, pontos = 0;
  for (const f of frases) {
    const p = termos.filter((t) => contemTermo(f, t)).length;
    if (p > pontos) { pontos = p; melhor = f; }
  }
  return melhor ? melhor.slice(0, 600) : null;
}

// ───────────────────────────── parágrafos (âncoras das folhas) ─────────────────────────────
/**
 * Parte o markdown em PARÁGRAFOS (blocos separados por linha em branco) sem quebrar cerca de código (```) nem bloco
 * de fórmula ($$). Servidor e cliente usam a MESMA função: é o índice daqui que a âncora da folha guarda.
 */
export function paragrafos(md: string): string[] {
  const linhas = String(md ?? "").split("\n");
  const out: string[] = [];
  let atual: string[] = [];
  let cerca = false, formula = false;
  const fechar = () => { const b = atual.join("\n").trim(); if (b) out.push(b); atual = []; };
  for (const l of linhas) {
    const t = l.trim();
    if (t.startsWith("```")) cerca = !cerca;
    // "$$" em número ímpar na linha abre/fecha um bloco de fórmula ($$…$$ numa linha só não muda nada)
    else if (!cerca && (t.match(/\$\$/g)?.length ?? 0) % 2 === 1) formula = !formula;
    if (!t && !cerca && !formula) { fechar(); continue; }
    atual.push(l);
  }
  fechar();
  return out;
}

const MARCADOR = /\[\[\s*(T\d+)\s*\]\]/gi;

/**
 * Tira os marcadores [[T3]] do texto e devolve, por id, o parágrafo (0-based, já no texto LIMPO) depois do qual a folha
 * entra. Marcador sozinho na linha ancora no parágrafo anterior; marcador no meio de um parágrafo ancora nele. Id fora
 * da lista é só apagado. Cada id vale uma vez (a primeira).
 */
export function extrairAncoras(texto: string, validos: ReadonlySet<string>): { texto: string; ancoras: Map<string, number> } {
  const ancoras = new Map<string, number>();
  const limpos: string[] = [];
  for (const p of paragrafos(texto)) {
    const ids = [...p.matchAll(MARCADOR)].map((m) => m[1]!.toUpperCase());
    // linha que era SÓ marcador some inteira (senão viraria linha em branco e partiria o parágrafo em dois)
    const semMarca = p.split("\n")
      .filter((l) => !(l.replace(MARCADOR, "").trim() === "" && l.trim() !== ""))
      .map((l) => l.replace(MARCADOR, "").replace(/[ \t]{2,}/g, " ").replace(/[ \t]+$/, ""))
      .join("\n").trim();
    if (semMarca) limpos.push(semMarca);
    const alvo = limpos.length - 1;
    for (const id of ids) {
      if (!validos.has(id) || ancoras.has(id)) continue;
      ancoras.set(id, Math.max(0, alvo));
    }
  }
  return { texto: limpos.join("\n\n"), ancoras };
}
