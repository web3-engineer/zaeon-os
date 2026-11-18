/**
 * lib/agent/pedeImagem.ts — #756 · "faça uma imagem da mitocôndria" / "crie uma ilustração de X" / "desenhe uma figura
 * de Y" → ARTEFATO (imagem). PURO.
 *
 * O modelo do roteador lia esses pedidos como explicação (a lista de artefatos dele não falava de imagem), e explicação
 * ganha diagrama: no ar, os dois pedidos viraram diagrama interativo. Precisa do VERBO de pedir — "o que é figura de
 * linguagem" continua explicação. Gráfico de função/dados e aula são decididos antes (pedeGraficoNoTexto, pedeAula).
 *
 * #764: saiu do router.ts para um módulo próprio — o harness e o turno também perguntam (prompt, cache), e os testes
 * deles trocam o roteador por um falso; aqui ela não some junto. O router reexporta.
 */
import { pedeAula } from "@/lib/agent/aprender";
import { pedeGraficoMatematico, pedeGraficoDeDados } from "@/lib/agent/matematica";

const norm = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** os verbos de geração do roteador (GEN_VERB_RE), mesma lista */
const GEN_VERB_RE =
  /(^|\s)(gere|gerar|gera|crie|criar|cria|faca|fazer|faz|monte|montar|produza|produzir|escreva|escrever|redija|redigir|elabore|elaborar|desenvolva|desenvolver|quero (?:um|uma)|preciso de (?:um|uma)|write|draft)(\s|$)/;
const IMAGEM_RE = /(^|[^a-z])(imagem|imagens|ilustracao|ilustracoes|figura|foto|desenho)(?![a-z])/;
const VERBO_IMAGEM_RE = /(^|[^a-z])(desenhe|desenha|ilustre|ilustra|mostre|mostra|me (?:da|de|manda|mande))(?![a-z])/;

export function pedeImagem(objetivo: string): boolean {
  const t = norm(objetivo);
  if (!IMAGEM_RE.test(t)) return false;
  if (pedeGraficoMatematico(objetivo) || pedeGraficoDeDados(objetivo) || pedeAula(t)) return false;
  return GEN_VERB_RE.test(t) || VERBO_IMAGEM_RE.test(t);
}
