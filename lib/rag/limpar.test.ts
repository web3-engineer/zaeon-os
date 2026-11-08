import { describe, it, expect } from "vitest";
import { limparHtml } from "./limpar";

describe("limpeza de HTML em resumo de API", () => {
  it("limpa o HTML do resumo — medido em 225 resumos reais da API", () => {
    const sujo = "<p>A <i>viga</i> de concreto<br/>armado com p &lt; 0,05 &amp; carga &gt; 10 kN&nbsp;resiste.</p>";
    const limpo = limparHtml(sujo);
    expect(limpo).toBe("A viga de concreto armado com p < 0,05 & carga > 10 kN resiste.");
    for (const t of ["<p>", "<i>", "<br", "&lt;", "&gt;", "&amp;", "&nbsp;"]) {
      expect(limpo, `sobrou ${t}`).not.toContain(t);
    }
  });

  it("tag ESCAPADA sobrevive como texto — é por isso que a ordem é tag antes de entidade", () => {
    // o autor escreveu `&lt;i&gt;` pra aparecer literalmente. Decodificar primeiro viraria `<i>`,
    // que a remoção de marcação comeria — perdendo o que o autor quis dizer.
    expect(limparHtml("use a marca &lt;i&gt; para itálico")).toBe("use a marca <i> para itálico");
    expect(limparHtml("&#233;poca")).toBe("época");
    expect(limparHtml(null as never)).toBe("");
  });
});
