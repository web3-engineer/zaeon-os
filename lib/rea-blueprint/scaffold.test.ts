import { describe, expect, it } from "vitest";
import { blocos, esc, indexHtml, inline, nomeDoProjeto, reconstrucaoMd, scaffoldDoBlueprint } from "@/lib/rea-blueprint/scaffold";
import { docVazio, sanitizarDoc, type DocReaBlueprint } from "@/lib/rea-blueprint/tipos";
import { caminhoPublicavel } from "@/lib/octa/publicar";
import { tipoProjeto } from "@/lib/octa/tipoProjeto";
import { estiloDoProjeto } from "@/lib/octa/design/indice";
import { lerArquivos } from "@/lib/octa/projetos";

const doc: DocReaBlueprint = sanitizarDoc({
  v: 1,
  titulo: "Como o Shazam reconhece música",
  alvo: "Audio fingerprinting",
  resumo: "Transforma áudio numa impressão digital robusta a ruído.",
  comoFunciona: "Passos:\n- espectrograma\n- picos\n\nDepois **hashes de pares** casam contra o índice.",
  achados: [
    { afirmacao: "Usa **pares** de picos", prov: "derivacao", detalhe: "mais distintivo", fonte: "Wang 2003" },
    { afirmacao: "Alinhamento temporal consistente", prov: "observacao" },
    { afirmacao: "Índice invertido", prov: "inferencia" },
  ],
  reconstrucao: [
    { titulo: "Espectrograma", corpo: "STFT ~100ms", verifica: "um assovio vira linha horizontal" },
    { titulo: "Picos", verifica: "densidade estável sob ruído" },
  ],
  incertezas: ["parâmetros exatos de produção"],
  ferramentas: ["numpy", "scipy"],
  compostoEm: 1, turnos: 1,
})!;

describe("esc / inline / blocos — nada de HTML cru do modelo", () => {
  it("escapa os caracteres perigosos", () => {
    expect(esc(`<script>alert("x")&'</script>`)).toBe("&lt;script&gt;alert(&quot;x&quot;)&amp;&#39;&lt;/script&gt;");
  });
  it("inline só deixa passar negrito e quebra, depois de escapar", () => {
    expect(inline("a **b** <i>c</i>\nd")).toBe("a <strong>b</strong> &lt;i&gt;c&lt;/i&gt;<br>d");
  });
  it("um `<script>` do modelo vira texto, nunca tag — em inline e em blocos", () => {
    const veneno = `<img src=x onerror=alert(1)>`;
    expect(inline(veneno)).not.toContain("<img");
    expect(blocos(`- ${veneno}`)).not.toContain("<img");
    expect(blocos(veneno)).toContain("&lt;img");
  });
  it("blocos faz parágrafo e lista", () => {
    const h = blocos("linha um\n\n- a\n- b");
    expect(h).toContain("<p>linha um</p>");
    expect(h).toContain("<ul><li>a</li><li>b</li></ul>");
  });
});

describe("scaffold — um site estático publicável", () => {
  const arquivos = scaffoldDoBlueprint(doc);

  it("tem index.html e style.css; reconstrucao.md quando há passos", () => {
    expect(Object.keys(arquivos).sort()).toEqual(["index.html", "reconstrucao.md", "style.css"]);
  });

  it("TODO caminho do scaffold é publicável pela Octa (a função REAL de publicar.ts)", () => {
    for (const caminho of Object.keys(arquivos)) expect(caminhoPublicavel(caminho), caminho).toBe(true);
  });

  it("o conjunto é `estatico` — o tipo que o botão Publicar aceita", () => {
    expect(tipoProjeto(arquivos)).toBe("estatico");
  });

  it("não declara estilo de marca (o portão anti-marca da publicação não dispara)", () => {
    // sem DESIGN.md, estiloDoProjeto devolve null (nenhuma marca) → o portão anti-marca não tem o que casar
    expect(estiloDoProjeto(arquivos)?.estilo ?? undefined).toBeUndefined();
  });

  it("passa no validador de tamanho/formato de arquivos da Octa", () => {
    expect(lerArquivos(arquivos)).not.toBe(null);
    expect(lerArquivos(arquivos)).not.toBe("grande");
  });

  it("o índice mostra título, alvo, mecanismo, achados com proveniência e reconstrução", () => {
    const html = arquivos["index.html"];
    expect(html).toContain("<title>Como o Shazam reconhece música</title>");
    expect(html).toContain("Audio fingerprinting");
    expect(html).toContain("Derivação");
    expect(html).toContain("Observação");
    expect(html).toContain("Inferência");
    expect(html).toContain("Como verificar:");
    expect(html).toContain("<strong>pares</strong>"); // negrito do achado, escapado antes
  });

  it("conteúdo malicioso do modelo não vira tag no index", () => {
    const mau = scaffoldDoBlueprint(sanitizarDoc({ ...doc, titulo: `<script>alert(1)</script>`, resumo: `<img src=x onerror=alert(1)>` })!);
    // o perigoso vira TEXTO escapado (&lt;img…&gt;), nunca tag viva: sem "<img" e sem "<script>" reais
    expect(mau["index.html"]).not.toContain("<img");
    expect(mau["index.html"]).not.toContain("<script>alert(1)</script>");
    expect(mau["index.html"]).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(mau["index.html"]).toContain("&lt;script&gt;");
  });

  it("blueprint vazio ainda gera um site válido (index + css, sem reconstrucao.md)", () => {
    const vazio = scaffoldDoBlueprint(docVazio("Nada ainda"));
    expect(Object.keys(vazio).sort()).toEqual(["index.html", "style.css"]);
    expect(tipoProjeto(vazio)).toBe("estatico");
    expect(vazio["index.html"]).toContain("Nada ainda");
  });

  it("reconstrucao.md lista os passos numerados e o verifica", () => {
    const md = reconstrucaoMd(doc);
    expect(md).toContain("## 1. Espectrograma");
    expect(md).toContain("## 2. Picos");
    expect(md).toContain("> **Como verificar:** um assovio vira linha horizontal");
  });

  it("o nome do projeto vem do título, cortado em 80", () => {
    expect(nomeDoProjeto(doc)).toBe("Como o Shazam reconhece música");
    expect(nomeDoProjeto(sanitizarDoc({ ...doc, titulo: "x".repeat(200) })!).length).toBe(80);
  });
});
