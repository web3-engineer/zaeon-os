/**
 * lib/documento/fontes.ts — AS FONTES QUE O DOCUMENTO PODE CITAR (D1 de docs/PLANO_DOCUMENTO_1A1.md).
 * PURO: nada de rede, de Prisma nem de modelo.
 *
 * O DEFEITO QUE ISTO CONSERTA. O escritor de seção recebia só `{tema, tipo, unidade, rascunho,
 * norte}` — nenhuma fonte. E o `sys` dele manda, com razão, "não invente dado, número, autor nem
 * referência; se faltar fundamentação, marque com ⟨sem fonte⟩". Sem nada na mão, a única saída
 * honesta do modelo é marcar quase tudo: o documento tendia ESTRUTURALMENTE ao ⟨sem fonte⟩, porque
 * cobrávamos um rigor que o nosso próprio desenho tornava impossível.
 *
 * ─────────────────────────── A regra que não se negocia ───────────────────────────
 * NÃO INVENTAMOS REFERÊNCIA. Paper tem autor e ano, então vira ABNT de verdade. Documento da base
 * e anexo do aluno NÃO têm: entram marcados como incompletos, pra ELE completar. As três saídas
 * possíveis eram omitir (a afirmação fica sem fonte, e perdemos o que o aluno trouxe), inventar
 * (inaceitável) ou declarar o que falta — é a terceira.
 *
 * ─────────────────────────── Como a citação é rastreada ───────────────────────────
 * Cada fonte chega ao prompt com a `citacao` PRONTA, e o modelo é instruído a copiar exatamente
 * aquela string. Depois, `fontesCitadas` acha no texto quais apareceram. Isso evita parsing frágil
 * de "(Autor, ano)" escrito à mão pelo modelo — e é o que liga a D1 na D2: o que foi citado vira
 * `fontes` da revisão, e `referenciasNovas` monta a seção REFERÊNCIAS sozinha.
 */
import type { FonteVerificada } from "@/lib/tcc/store";

/** Marca de referência que o ALUNO precisa completar (nunca inventamos autor/ano). */
export const FALTA_COMPLETAR = "[referência incompleta: complete autor e ano]";

/** Teto de fontes no prompt de uma seção. Acima disso o bloco come o lugar do texto. */
export const MAX_FONTES = 12;

/** Quanto de cada fonte entra como extrato (o que ela DIZ, pro modelo ter em que se apoiar). */
export const MAX_EXTRATO = 320;

export type OrigemFonte = "literatura" | "base" | "anexo" | "web" | "pedido";

export type FonteDoc = FonteVerificada & {
  /** como citar no corpo, EXATAMENTE — é por esta string que a citação é rastreada */
  citacao: string;
  origem: OrigemFonte;
  /** o que a fonte diz, resumido: sem isto o modelo cita sem saber o conteúdo */
  extrato?: string;
};

const limpo = (s: unknown, max = 300): string =>
  String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * SOBRENOME do primeiro autor, em caixa alta — a forma da citação autor-data.
 *
 * O "et al." sai ANTES de pegar a última palavra, e isto é conserto de um defeito real: com
 * "Wang et al." a última palavra é "al.", então a citação saía `(AL., 2024)`. Pior que feio —
 * `juntarFontes` deduplica por CITAÇÃO, então "Wang et al. (2024)" e "Sun et al. (2024)" viravam
 * a mesma `(AL., 2024)` e a segunda referência era DESCARTADA em silêncio. Num pedido com
 * "limite-se estritamente a estas", perder duas das cinco é exatamente o contrário do pedido.
 */
function sobrenome(autores?: string): string {
  const primeiro = limpo(autores, 120)
    .replace(/\s*\bet\s+al\.?/gi, "")   // "Wang et al." → "Wang"
    .split(/[;,]/)[0]?.trim() ?? "";
  if (!primeiro) return "";
  const partes = primeiro.split(/\s+/).filter(Boolean);
  return (partes.length > 1 ? partes[partes.length - 1]! : partes[0]!).toUpperCase();
}

/** Título curto pra citação de material sem autoria conhecida. */
const curto = (t: string, max = 28): string => {
  const s = limpo(t, 200);
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
};

/**
 * PAPER → fonte citável de verdade. É a única origem em que temos autor e ano, então é a única que
 * produz ABNT completa. A formatação fina fica com `lib/scholar/abnt`; aqui só o que o documento
 * precisa, sem arrastar o pipeline do scholar pra dentro de um módulo puro.
 */
export function fonteDePaper(p: { title?: string; authors?: string; year?: number; url?: string; doi?: string }): FonteDoc | null {
  const titulo = limpo(p?.title, 240);
  if (!titulo) return null;
  const sob = sobrenome(p.authors);
  const ano = Number.isInteger(p.year) ? String(p.year) : "";
  const citacao = sob && ano ? `(${sob}, ${ano})` : sob ? `(${sob}, [s.d.])` : `(${curto(titulo)})`;
  const autoria = limpo(p.authors, 200);
  const abnt = [
    autoria ? `${autoria.toUpperCase()}.` : "",
    `${titulo}.`,
    ano ? `${ano}.` : "[s.d.].",
    p.doi ? `DOI: ${limpo(p.doi, 120)}.` : "",
    !p.doi && p.url ? `Disponível em: ${limpo(p.url, 300)}.` : "",
    !autoria || !ano ? FALTA_COMPLETAR : "",
  ].filter(Boolean).join(" ");
  return {
    abnt, titulo, citacao, origem: "literatura",
    ...(p.url ? { url: limpo(p.url, 300) } : {}),
    ...(p.doi ? { doi: limpo(p.doi, 120) } : {}),
  };
}

/**
 * DOCUMENTO DA BASE (a bibliografia que o próprio aluno subiu) → fonte citável, marcada como
 * incompleta. É a fonte mais confiável que existe pro trabalho dele, e era a que mais se perdia.
 */
/**
 * Uma referência que o PRÓPRIO PEDIDO impôs ("REFERÊNCIAS OBRIGATÓRIAS: limite-se estritamente a
 * estas"). Chega como texto livre, do jeito que a pessoa escreveu.
 *
 * O `abnt` sai VERBATIM, e isso é escolha: reformatar a referência de alguém é a maneira mais fácil
 * de corrompê-la (trocar o ano, perder o veículo, inverter autoria). Quem pediu já sabe o que
 * escreveu. O que o código faz é só DERIVAR a citação autor-data, e derivando do próprio texto —
 * sobrenome antes do primeiro parêntese, ano do primeiro número de quatro dígitos. Nada é
 * inventado: se não der pra extrair, a citação é o texto curto, e o escritor cita assim.
 *
 * Não leva `FALTA_COMPLETAR`: a referência não está incompleta, ela é a que foi exigida.
 */
export function fonteDoPedido(texto: string): FonteDoc | null {
  const bruto = limpo(texto, 400);
  if (bruto.length < 8) return null;
  const sob = sobrenome(bruto.split("(")[0] ?? "");
  const ano = bruto.match(/\b(1[5-9]\d{2}|20\d{2})\b/)?.[1] ?? "";
  const citacao = sob && ano ? `(${sob}, ${ano})` : sob ? `(${sob}, [s.d.])` : `(${curto(bruto)})`;
  return { abnt: bruto, titulo: bruto.slice(0, 240), citacao, origem: "pedido" };
}

export function fonteDeDocumento(d: { titulo?: string; paginas?: string; extrato?: string }, origem: OrigemFonte = "base"): FonteDoc | null {
  const titulo = limpo(d?.titulo, 240);
  if (!titulo) return null;
  const pag = limpo(d.paginas, 20);
  return {
    abnt: `${titulo.toUpperCase()}. ${FALTA_COMPLETAR}`,
    titulo,
    citacao: pag ? `(${curto(titulo)}, p. ${pag})` : `(${curto(titulo)})`,
    origem,
    ...(d.extrato ? { extrato: limpo(d.extrato, MAX_EXTRATO) } : {}),
  };
}

/** PÁGINA LIDA pelo Leitor → referência de web (tem URL, não tem autoria). */
export function fonteDePagina(p: { titulo?: string; url?: string; extrato?: string }, hoje = new Date()): FonteDoc | null {
  const url = limpo(p?.url, 300);
  if (!url) return null;
  const titulo = limpo(p.titulo, 240) || url;
  const mes = ["jan.", "fev.", "mar.", "abr.", "maio", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."][hoje.getMonth()]!;
  return {
    abnt: `${titulo.toUpperCase()}. Disponível em: ${url}. Acesso em: ${hoje.getDate()} ${mes} ${hoje.getFullYear()}. ${FALTA_COMPLETAR}`,
    titulo, url, citacao: `(${curto(titulo)})`, origem: "web",
    ...(p.extrato ? { extrato: limpo(p.extrato, MAX_EXTRATO) } : {}),
  };
}

/** Tira repetida (mesma citação) e aplica o teto, preservando a ordem de chegada. */
export function juntarFontes(...listas: readonly (readonly (FonteDoc | null)[])[]): FonteDoc[] {
  const vistas = new Set<string>();
  const out: FonteDoc[] = [];
  for (const lista of listas) {
    for (const f of lista) {
      if (!f?.citacao || vistas.has(f.citacao)) continue;
      vistas.add(f.citacao);
      out.push(f);
      if (out.length >= MAX_FONTES) return out;
    }
  }
  return out;
}

/**
 * D3 · AS FONTES DO TURNO DE CHAT, a partir do que o turno já apurou. É o elo "1:1": o chat escreve
 * no documento (`work.sections`) com as MESMAS fontes que o gerador usaria, e com a citação pronta.
 *
 * Os dois lados chamam esta função — o harness antes de redigir, e `trabalhoDoTurno` depois, pra
 * descobrir o que foi citado. Como ela é PURA e determinística, a mesma entrada dá a mesma string
 * de citação nos dois momentos, e o casamento fecha. Se divergirem, nada entra em REFERÊNCIAS:
 * falha pro lado de não inventar bibliografia, que é o lado certo.
 */
export function fontesDoTurno(
  fontes: readonly { title?: string; authors?: string; year?: number; url?: string; doi?: string }[] = [],
  docsDaBase: readonly { titulo?: string; paginas?: string }[] = [],
  /**
   * D4 · os arquivos que a pessoa ANEXOU neste turno. Vêm na frente de tudo: é o material que ela
   * escolheu trazer, e era o que mais se perdia — o documento nunca soube que o anexo existiu.
   * Sem página na citação de propósito: sabemos quantas páginas o arquivo TEM, não de qual delas
   * saiu a afirmação, e citar página errada é pior que não citar página.
   */
  anexos: readonly { nome?: string; texto?: string }[] = [],
): FonteDoc[] {
  return juntarFontes(
    anexos.map((a) => fonteDeDocumento({ titulo: a.nome, extrato: a.texto }, "anexo")),
    docsDaBase.map((d) => fonteDeDocumento(d)),
    fontes.map((f) => fonteDePaper(f)),
  );
}

/**
 * O bloco que entra no prompt da seção. Diz o que cada fonte é, o que ela diz, e COMO citá-la —
 * literalmente, porque é essa string que `fontesCitadas` procura depois.
 */
export function blocoDeFontes(fontes: readonly FonteDoc[]): string {
  if (!fontes.length) return "";
  const ROTULO: Record<OrigemFonte, string> = {
    literatura: "artigo",
    pedido: "referência que VOCÊ exigiu no pedido",
    base: "documento da base do aluno",
    anexo: "arquivo anexado pelo aluno",
    web: "página da web",
  };
  const linhas = fontes.map((f, i) =>
    [
      `${i + 1}. ${f.titulo ?? f.citacao} — ${ROTULO[f.origem]}`,
      `   CITE ASSIM: ${f.citacao}`,
      f.extrato ? `   DIZ: ${f.extrato}` : "",
    ].filter(Boolean).join("\n"),
  );
  return ["FONTES DISPONÍVEIS (use só estas; não invente outra):", ...linhas].join("\n");
}

/**
 * Quais fontes o texto REALMENTE citou. Casa pela string exata de `citacao` — é por isso que ela
 * vai pronta no prompt. Devolve no formato que `sugerirNoTcc`/`referenciasNovas` já consomem.
 */
export function fontesCitadas(texto: string, fontes: readonly FonteDoc[]): FonteVerificada[] {
  const t = String(texto ?? "");
  if (!t.trim()) return [];
  const out: FonteVerificada[] = [];
  for (const f of fontes) {
    if (!f.citacao || !t.includes(f.citacao)) continue;
    out.push({ abnt: f.abnt, ...(f.titulo ? { titulo: f.titulo } : {}), ...(f.url ? { url: f.url } : {}), ...(f.doi ? { doi: f.doi } : {}) });
  }
  return out;
}
