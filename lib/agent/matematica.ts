/**
 * lib/agent/matematica.ts — a regra de NOTAÇÃO MATEMÁTICA do harness. PURO.
 *
 * O chat renderiza LaTeX (KaTeX) e o bloco ```grafico (lib/chat/matematica, components/chat).
 * Esta diretriz entra no prompt do draft para o modelo escrever no formato que a tela entende —
 * em vez de "x^2", "sqrt(x)" e "a/b" soltos no texto. E `pedeGraficoMatematico` impede que
 * "faz o gráfico de f(x)" vá para o gerador de IMAGEM (que desenha uma parábola bonita e errada).
 */
const norm = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const DIRETRIZ_MATEMATICA = [
  "NOTAÇÃO MATEMÁTICA (a tela renderiza LaTeX): escreva TODA expressão matemática em LaTeX —",
  "inline entre $...$ (ex.: $f(x) = x^2 - 4$, $\\sqrt{2}$, $\\frac{a}{b}$) e fórmula em destaque numa linha própria entre $$...$$.",
  "Nunca escreva x^2, sqrt(x), a/b, * ou >= soltos no texto. Em contas passo a passo, uma igualdade por linha em $$...$$.",
  "Dinheiro em reais fica R$ 10 (sem LaTeX).",
  "DESENHO: quando um gráfico ou figura ajudar (o usuário pediu gráfico/esboço/desenho, estudo de função, raízes, comparar curvas,",
  "geometria, vetores), coloque no texto um bloco exatamente assim (JSON válido, numa linha só depois de ```grafico):",
  '```grafico\n{"funcoes":["x^2-4"],"x":[-5,5],"pontos":[{"x":2,"y":0,"rotulo":"raiz"}]}\n```',
  'Funções em sintaxe de calculadora (x^2, 2*x, sqrt(x), sin(x), ln(x), abs(x), pi, e), no máximo 4. Geometria: "formas":',
  '[{"tipo":"poligono","pontos":[[0,0],[4,0],[0,3]],"rotulo":"triângulo"},{"tipo":"circulo","centro":[0,0],"raio":2},',
  '{"tipo":"segmento","de":[0,0],"ate":[4,3]},{"tipo":"vetor","de":[0,0],"ate":[2,1],"rotulo":"v"}]. O desenho aparece no lugar do bloco:',
  "não descreva com palavras o que ele já mostra e nunca diga que não consegue desenhar.",
  // #749: gráfico de DADOS (população por região, notas por ano…) — antes ia para o gerador de imagem
  'GRÁFICO DE DADOS: quando o usuário pedir gráfico de números (comparar quantidades, regiões, anos, categorias), use o mesmo bloco com "barras":',
  '```grafico\n{"titulo":"População por região (milhões)","barras":[{"rotulo":"Sudeste","valor":84.8},{"rotulo":"Nordeste","valor":54.6}],"unidade":"mi","fonte":"Censo 2022 (IBGE)"}\n```',
  'Até 12 barras, valores numéricos (sem texto), e "fonte" SEMPRE (de onde vêm os números). Escreva os mesmos números no texto.',
  "Se a base da pessoa não tiver esses números, use o que você sabe de fonte confiável e diga a fonte — nunca deixe de fazer o gráfico por isso.",
].join(" ");

/**
 * #749 · "faça um gráfico da população do Brasil por região" → true. Gráfico de NÚMEROS (que não é de função nem de
 * geometria): sai no texto como ```grafico com "barras", não como imagem gerada nem diagrama.
 */
export function pedeGraficoDeDados(objetivo: string): boolean {
  const t = norm(objetivo);
  if (!/\bgraficos?\b/.test(t)) return false;
  if (pedeGraficoMatematico(objetivo)) return false;
  // pediu IMAGEM/ilustração de verdade ("uma imagem com um gráfico") → continua imagem
  return !/\b(imagem|ilustra\w*|foto\w*|desenho)\b/.test(t);
}

const ALVO_GRAFICO = String.raw`(?:fun[cç][aã]o|f\s*\(\s*x\s*\)|y\s*=|par[aá]bola|reta|hip[eé]rbole|sen[oó]ide|seno|cosseno|tangente|exponencial|logar[ií]tm\w*|polin[oô]mio|equa[cç][aã]o|inequa[cç][aã]o|derivada|integral|tri[aâ]ngulo|c[ií]rculo|circunfer[eê]ncia|pol[ií]gono|quadrado|ret[aâ]ngulo|vetor(?:es)?|plano cartesiano)`;
const GRAFICO_RE = new RegExp(String.raw`\b(?:gr[aá]fico|plot\w*|esbo[cç]\w*|desenh\w*|trac\w*|representa\w* graficamente)\b[^.?!]{0,40}?\b${ALVO_GRAFICO}`, "i");

/** "faz o gráfico de f(x)=x²", "esboça a parábola", "desenha o triângulo 3-4-5" → true. */
export function pedeGraficoMatematico(objetivo: string): boolean {
  const t = norm(objetivo);
  if (GRAFICO_RE.test(t)) return true;
  // "gráfico de x^2 - 4" (expressão direto, sem a palavra "função")
  return /\bgr[aá]fico (?:d[aeo] |para )?[-+(]?\s*[a-z]?\s*(?:\^|\d|x)[^a-z]{0,3}[x\d^]/.test(t) && /x/.test(t);
}
