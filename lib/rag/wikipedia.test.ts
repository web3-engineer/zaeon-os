import { describe, it, expect } from "vitest";
import {
  CHARS_PARA_CLASSIFICAR, MAX_CHARS, MIN_CHARS, WIKI_CONFIG, WIKI_SHARDS, WIKI_SNAPSHOT,
  documentoDaWikipedia, ehDescarte, urlDoShard,
} from "./wikipedia";
import { SLUGS_AREA } from "./areas";

/** Um verbete de verdade precisa de corpo: o filtro é por tamanho, então os testes respeitam-no. */
const corpo = (semente: string, chars = MIN_CHARS + 500) => {
  let t = "";
  while (t.length < chars) t += `${semente} `;
  return t.slice(0, chars);
};

describe("Wikipédia pt como base por área", () => {
  it("o verbete classificável vira documento no contrato da ingestão, com a área do classificador", () => {
    const r = documentoDaWikipedia({
      title: "Concreto armado",
      url: "https://pt.wikipedia.org/wiki/Concreto_armado",
      text: corpo("O concreto armado é usado em viga, pilar e laje; a armadura resiste à flexão e ao cisalhamento na construção."),
    });
    expect(ehDescarte(r)).toBe(false);
    if (ehDescarte(r)) return;
    expect(r.area).toBe("eng-civil");
    expect(SLUGS_AREA, "área que não existe = documento invisível pro aluno").toContain(r.area);
    expect(r.titulo).toBe("Concreto armado (Wikipédia)");
    expect(r.pontos).toBeGreaterThan(0);
  });

  it("a atribuição CC BY-SA fica DENTRO do texto — é o único lugar que sobrevive à busca", () => {
    const r = documentoDaWikipedia({
      title: "Rede neural artificial",
      url: "https://pt.wikipedia.org/wiki/Rede_neural_artificial",
      text: corpo("Uma rede neural artificial faz aprendizado de maquina com treinamento e validacao cruzada."),
    });
    if (ehDescarte(r)) throw new Error(`devia classificar, descartou: ${r.descarte}`);
    expect(r.area).toBe("dados-ia");
    expect(r.texto).toContain("CC BY-SA 3.0");
    expect(r.texto).toContain("Wikipédia em português");
    expect(r.texto).toContain('verbete "Rede neural artificial"');
    expect(r.texto).toContain("https://pt.wikipedia.org/wiki/Rede_neural_artificial");
    // A data do instantâneo é parte do crédito: o aluno tem de saber de QUANDO é o verbete.
    expect(r.texto).toContain("instantâneo de 2023-11-01");
    // 4.0 seria ERRADO aqui: o instantâneo de 2023 é do regime 3.0. A fonte `wiki` (API ao vivo) é
    // que cita 4.0, e essa diferença é o ponto.
    expect(r.texto).not.toContain("CC BY-SA 4.0");
  });

  it("a chave leva o instantâneo, pra não colidir com a fonte `wiki` nem sobrescrever no futuro", () => {
    const r = documentoDaWikipedia({ title: "Kubernetes", text: corpo("Kubernetes faz orquestrac de container em computacao em nuvem com alta disponibilidade.") });
    if (ehDescarte(r)) throw new Error(`descartou: ${r.descarte}`);
    expect(r.chave).toBe("wiki-pt-20231101-Kubernetes");
    expect(r.chave, "a fonte `wiki` usa wiki-pt-<título>; sem a data as duas colidem").not.toBe("wiki-pt-Kubernetes");
    expect(r.area).toBe("infra");
  });

  it("descarta o esboço, o sem-título, a desambiguação e o que não tem área — cada um com seu motivo", () => {
    const esboco = documentoDaWikipedia({ title: "Viga", text: "Uma viga é um elemento estrutural." });
    expect(esboco).toEqual({ descarte: "curto" });

    expect(documentoDaWikipedia({ title: "   ", text: corpo("qualquer coisa") })).toEqual({ descarte: "sem_titulo" });

    // A desambiguação passa do tamanho mínimo quando lista muita coisa, e entraria como verbete.
    expect(documentoDaWikipedia({
      title: "Ponte (desambiguação)",
      text: corpo("Ponte pode se referir a ponte estrutural de concreto, viga e pilar na construção civil."),
    })).toEqual({ descarte: "desambiguacao" });

    const semArea = documentoDaWikipedia({ title: "Bolo de cenoura", text: corpo("Receita tradicional brasileira servida com cobertura.") });
    expect(semArea).toEqual({ descarte: "sem_area" });
  });

  it("corta o texto no teto e classifica só pela abertura — o corte não pode mudar a área", () => {
    const cauda = corpo("texto sem termo de area nenhum ", MAX_CHARS * 2);
    // A abertura precisa pontuar de verdade (limiar 5: título 3×, corpo 1×) — senão o teste mediria
    // o meu texto inventado, não o corte.
    const abertura = "A fotossintese e um processo do metabolismo da celula vegetal. Envolve o cloroplasto, "
      + "a enzima rubisco e a especie de planta; o gene e o DNA regulam a proteina do processo.";
    const r = documentoDaWikipedia({ title: "Fotossíntese na célula", text: `${abertura} ${cauda}` });
    if (ehDescarte(r)) throw new Error(`descartou: ${r.descarte}`);
    expect(r.area).toBe("biologia");
    // teto + o rodapé de crédito, que entra DEPOIS do corte
    expect(r.texto.length).toBeGreaterThan(MAX_CHARS);
    expect(r.texto.length).toBeLessThan(MAX_CHARS + 600);
    expect(CHARS_PARA_CLASSIFICAR).toBeLessThan(MAX_CHARS);
  });

  it("nunca lança: a varredura é de um milhão de linhas e uma linha torta não pode derrubar a carga", () => {
    for (const lixo of [{}, { title: null, text: null }, { title: 123, text: {} }, { title: "x" }, { text: corpo("viga pilar laje") }] as never[]) {
      expect(() => documentoDaWikipedia(lixo)).not.toThrow();
      expect(ehDescarte(documentoDaWikipedia(lixo))).toBe(true);
    }
  });

  it("as URLs dos shards são as reais do dataset no Hugging Face", () => {
    expect(WIKI_CONFIG).toBe("20231101.pt");
    expect(WIKI_SNAPSHOT).toBe("20231101");
    expect(urlDoShard(0)).toBe(
      "https://huggingface.co/datasets/wikimedia/wikipedia/resolve/main/20231101.pt/train-00000-of-00006.parquet",
    );
    expect(urlDoShard(WIKI_SHARDS - 1)).toContain("train-00005-of-00006.parquet");
  });
});
