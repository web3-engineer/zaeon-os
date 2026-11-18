/**
 * lib/chat/matematica.ts — onde está a matemática num texto de resposta. PURO, seguro em streaming.
 *
 * Blocos (podem ocupar várias linhas):  $$ … $$ · \[ … \] · ```grafico {json} ``` · ```lang código ```
 * Inline (dentro de uma linha):          $ … $ · \( … \)
 *
 * Regras do `$` inline (as do remark-math/pandoc, pra não confundir com dinheiro):
 * o `$` de abertura não pode ser seguido de espaço, o de fechamento não pode ser precedido de
 * espaço nem seguido de dígito, e `R$`/`US$` nunca abrem. Delimitador sem par = texto (enquanto
 * o streaming não fecha, nada "pisca").
 */
export type Bloco =
  | { tipo: "texto"; conteudo: string }
  | { tipo: "formula"; conteudo: string }          // display ($$ / \[)
  | { tipo: "grafico"; conteudo: string }          // JSON cru do ```grafico (validado no componente)
  | { tipo: "codigo"; conteudo: string; lang: string };  // ```lang … ``` (#634) — o de dentro fica CRU: nem $ nem * viram nada

export type PedacoInline = { tipo: "texto"; conteudo: string } | { tipo: "formula"; conteudo: string };

/** Separa o texto em blocos de display/gráfico/código e texto comum. */
export function segmentarBlocos(texto: string): Bloco[] {
  const s = String(texto ?? "");
  const out: Bloco[] = [];
  // o ```grafico vem antes do código comum; o código sem fecho (streaming) vai até o fim — sem `# comentário` virar título
  const re = /```(?:grafico|gráfico|plot)[ \t]*\n([\s\S]*?)```|```[ \t]*(?!grafico|gráfico|plot)([\w#+.-]*)[^\n]*\n([\s\S]*?)(?:\n?```|$)|(\$\$)([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > ultimo) out.push({ tipo: "texto", conteudo: s.slice(ultimo, m.index) });
    if (m[1] !== undefined) out.push({ tipo: "grafico", conteudo: m[1].trim() });
    else if (m[3] !== undefined) out.push({ tipo: "codigo", conteudo: m[3].replace(/\n+$/, ""), lang: m[2].toLowerCase() });
    else out.push({ tipo: "formula", conteudo: String(m[5] ?? m[6]).trim() });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < s.length) out.push({ tipo: "texto", conteudo: s.slice(ultimo) });
  return out.filter((b) => b.tipo !== "texto" || b.conteudo.length > 0);
}

/** Separa uma LINHA em texto e fórmulas inline. */
export function segmentarInline(linha: string): PedacoInline[] {
  const s = String(linha ?? "");
  const out: PedacoInline[] = [];
  let buf = "";
  let i = 0;
  const empurraTexto = () => { if (buf) { out.push({ tipo: "texto", conteudo: buf }); buf = ""; } };
  while (i < s.length) {
    // \( … \)
    if (s.startsWith("\\(", i)) {
      const fim = s.indexOf("\\)", i + 2);
      if (fim > i + 2) { empurraTexto(); out.push({ tipo: "formula", conteudo: s.slice(i + 2, fim).trim() }); i = fim + 2; continue; }
    }
    if (s[i] === "\\" && s[i + 1] === "$") {
      // #635: \$60\text{ s}\$ — o modelo "escapou" os cifrões de uma fórmula. Com um COMANDO LaTeX dentro (\text,
      // \frac…) é fórmula; sem (\$5 e \$10) segue cifrão de dinheiro.
      const fim = s.indexOf("\\$", i + 2);
      const dentro = fim > i + 2 ? s.slice(i + 2, fim) : "";
      if (dentro.trim() && /\\[A-Za-z]+/.test(dentro)) { empurraTexto(); out.push({ tipo: "formula", conteudo: dentro.trim() }); i = fim + 2; continue; }
      buf += "$"; i += 2; continue;   // \$ = cifrão literal
    }
    if (s[i] === "$" && s[i + 1] !== "$") {
      const antes = s.slice(Math.max(0, i - 2), i);
      // #645: "R $" (R solto, a palavra é só o R/US) é dinheiro; o "r" do fim de "por $3,6$" NÃO — antes, o trim() fazia
      // qualquer palavra terminada em r ("por", "multiplicar") virar "R$" e a fórmula saía crua
      const moeda = /(?:^|[^A-Za-z])(?:R|US)\s?$/i.test(s.slice(Math.max(0, i - 4), i));
      const abre = !/\s/.test(s[i + 1] ?? " ") && !moeda && !/[A-Za-z]$/.test(antes);
      if (abre) {
        let j = i + 1;
        let fim = -1;
        while (j < s.length) {
          if (s[j] === "\\") { j += 2; continue; }
          if (s[j] === "$") {
            if (!/\s/.test(s[j - 1]) && !/\d/.test(s[j + 1] ?? "")) { fim = j; }
            break;
          }
          j++;
        }
        // "$5 e $10" já não fecha (o 2º $ vem depois de espaço); "$3$" é fórmula de verdade (catetos $3$ e $4$)
        const conteudo = fim > 0 ? s.slice(i + 1, fim) : "";
        if (fim > 0 && conteudo.trim()) {
          empurraTexto(); out.push({ tipo: "formula", conteudo }); i = fim + 1; continue;
        }
      }
    }
    buf += s[i]; i++;
  }
  empurraTexto();
  return out;
}

/** O texto tem fórmula ou gráfico? (o modo revista desenha em canvas e não comporta). */
export function temMatematica(texto: string): boolean {
  const s = String(texto ?? "");
  const blocos = segmentarBlocos(s);
  if (blocos.some((b) => b.tipo === "formula" || b.tipo === "grafico")) return true;
  // o $ de dentro de um bloco de código é código, não fórmula
  return blocos.some((b) => b.tipo === "texto" && b.conteudo.split("\n").some((l) => segmentarInline(l).some((p) => p.tipo === "formula")));
}

/** O texto tem bloco de código (```)? Como a matemática, só o ChatMarkdown desenha (o canvas da revista não). */
export function temBlocoDeCodigo(texto: string): boolean {
  return segmentarBlocos(String(texto ?? "")).some((b) => b.tipo === "codigo");
}

/**
 * #756 · vírgula DECIMAL dentro da fórmula. No LaTeX a vírgula é pontuação e ganha um espaço depois: "$41,8\%$" saía
 * "41, 8%" na tela. Entre dois dígitos ela vira `{,}` (vírgula sem espaço, o jeito padrão do LaTeX em português).
 * Só dígito-vírgula-dígito: "(1, 2)" com espaço continua par ordenado.
 */
export function virgulaDecimal(latex: string): string {
  return String(latex ?? "").replace(/(\d),(?=\d)/g, "$1{,}");
}
