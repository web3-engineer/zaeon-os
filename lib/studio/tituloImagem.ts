/**
 * lib/studio/tituloImagem.ts — #764 · o ASSUNTO do pedido de imagem, para o título. PURO.
 *
 * O título repetia o pedido inteiro: "Imagem — faça uma imagem de um vulcão em erupção". Agora sai
 * "Imagem — vulcão em erupção": tira o "faça uma imagem de", o "por favor" e o que vem depois da primeira vírgula
 * (o resto do pedido é instrução — "…, com as partes nas cores dos livros"), sem nunca ficar vazio.
 */
const PEDIDO = new RegExp(
  String.raw`^(?:(?:por favor|pfv|pf)[,\s]+)?` +
  String.raw`(?:(?:me\s+)?(?:fa[cç]a|faz|fazer|crie|cria|criar|gere|gera|gerar|desenhe|desenha|ilustre|ilustra|mostre|mostra|quero|queria|preciso(?:\s+de)?|me\s+(?:d[aáê]|de|manda|mande))\s+)?` +
  String.raw`(?:(?:uma?|a|o)\s+)?` +
  String.raw`(?:image[mn]s?|ilustra[cç](?:[aã]o|[oõ]es)|figuras?|fotos?|desenhos?)` +
  String.raw`(?:\s+(?:colorid[ao]s?|bonit[ao]s?|realistas?|detalhad[ao]s?|did[aá]tic[ao]s?|cient[ií]fic[ao]s?))*` +
  String.raw`\s+(?:(?:de|do|da|dos|das|sobre|mostrando|com)\s+)?(?:(?:uma?|o|a|os|as)\s+)?`,
  "i",
);
/**
 * #816 · o verbo de DESENHAR já diz que é imagem, sem o "imagem de": "desenhe a anatomia do coração humano" saía
 * "Imagem — desenhe a anatomia do coração humano". Só os verbos de desenho — "faça a lista…" não é pedido de imagem.
 */
const DESENHE = new RegExp(
  String.raw`^(?:(?:por favor|pfv|pf)[,\s]+)?(?:me\s+)?(?:desenhe|desenha|desenhar|ilustre|ilustra|ilustrar|pinte|pinta|pintar)\s+` +
  String.raw`(?:(?:pra|para)\s+mim\s+)?(?:(?:uma?|o|a|os|as)\s+)?`,
  "i",
);

export function assuntoDaImagem(pedido: string): string {
  const base = String(pedido || "").replace(/^imagem\s*[:—–-]\s*/i, "").replace(/\s+/g, " ").trim();
  let t = base.replace(PEDIDO, "");
  if (t === base) t = base.replace(DESENHE, "");
  t = t.split(/[,;]/)[0]!.replace(/\b(?:por favor|pfv)\b/gi, "").replace(/[.!?\s]+$/, "").trim();
  if (t.length < 3) t = base;
  return t.length > 60 ? `${t.slice(0, 59).trimEnd()}…` : t;
}
