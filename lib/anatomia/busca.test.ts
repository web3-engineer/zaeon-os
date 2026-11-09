/**
 * Busca e inspeção do Atlas, afirmadas contra o ARQUIVO DE DADOS REAL (public/models/atlas.json),
 * não contra um atlas de mentira.
 *
 * Por quê: o risco aqui não é a função errar lógica — é a função estar certa sobre um dado que não
 * existe. Um sinônimo PT→EN que não casa com conceito nenhum, um id de exemplo que mudou de nome,
 * um sistema que saiu do manifesto: nada disso aparece num teste com dado inventado, e tudo isso
 * quebra em produção. Então o dado é o de verdade, e o primeiro teste confere que ele é ele mesmo.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SISTEMAS, SISTEMAS_POR_ID, VISIVEIS_PADRAO, ehSistema, explicacao, type Atlas } from "@/lib/anatomia/atlas";
import {
  MAX_RESULTADOS, SINONIMOS_PT, acharConceito, buscarConceitos, pecasDoConceito, termoNaFrase,
  sistemasDoConceito, termoDeBusca,
} from "@/lib/anatomia/busca";

const atlas: Atlas = JSON.parse(readFileSync(join(process.cwd(), "public/models/atlas.json"), "utf8"));

describe("o dado é o dado (guarda contra afirmação vazia)", () => {
  it("o manifesto real tem as contagens que o README do human-atlas declara", () => {
    expect(atlas.parts.length, "peças").toBe(2234);
    expect(atlas.concepts.length, "conceitos nomeados").toBe(3432);
    expect(atlas.chunks.length, "pedaços binários").toBe(15);
    expect(atlas.triangles).toBe(2288268);
    expect(atlas.sex).toBe("male");           // é referência de adulto MASCULINO, e isso importa dizer
    expect(atlas.source).toBe("BodyParts3D");
  });

  it("os 15 sistemas do código batem com os sistemas presentes no dado — nenhum órfão dos dois lados", () => {
    const noDado = new Set(atlas.parts.map((p) => p.system));
    const noCodigo = new Set(SISTEMAS.map((s) => s.id));
    expect([...noDado].filter((s) => !noCodigo.has(s)), "sistema no dado sem entrada no código").toEqual([]);
    expect([...noCodigo].filter((s) => !noDado.has(s)), "sistema no código que o dado não usa").toEqual([]);
    expect(SISTEMAS.length).toBe(15);
  });

  it("a geometria é apontada por URL relativa a /models/body (nossa adaptação, registrada na atribuição)", () => {
    for (const c of atlas.chunks) {
      expect(c.url, "url do pedaço").toMatch(/^\/models\/body\/body-\d+\.bin$/);
      expect(c.gzip, "versão comprimida").toMatch(/^\/models\/body\/body-\d+\.bin\.gz$/);
      expect(c.bytes).toBeGreaterThan(0);
    }
  });
});

describe("buscarConceitos — o find_anatomy", () => {
  it("acha por nome e devolve id, nome e quantas PEÇAS o conceito agrupa", () => {
    const r = buscarConceitos(atlas, "heart");
    expect(r.achados.length).toBeGreaterThan(0);
    expect(r.total).toBeGreaterThanOrEqual(r.achados.length);
    for (const a of r.achados) {
      expect(a.id).toMatch(/^FMA/);
      expect(a.pecas).toBeGreaterThanOrEqual(1);
    }
  });

  it("ORDENA: o casamento exato vem primeiro — a diferença deliberada em relação ao original", () => {
    // O original devolvia os 30 primeiros na ordem do arquivo, e um modelo cita o primeiro.
    const r = buscarConceitos(atlas, "heart");
    expect(r.achados[0].nome.toLowerCase()).toBe("heart");
    const l = buscarConceitos(atlas, "liver");
    expect(l.achados[0].nome.toLowerCase()).toBe("liver");
  });

  it("acha por IDENTIFICADOR de origem, não só por nome", () => {
    const r = buscarConceitos(atlas, "FMA3710");
    expect(r.achados.some((a) => a.id === "FMA3710")).toBe(true);
  });

  it("consulta vazia ou só espaço devolve VAZIO, nunca os primeiros do arquivo", () => {
    for (const q of ["", "   ", "\n"]) {
      const r = buscarConceitos(atlas, q);
      expect(r.achados, `consulta ${JSON.stringify(q)}`).toEqual([]);
      expect(r.total).toBe(0);
    }
  });

  it("respeita o teto de 30 e diz o total verdadeiro, para 'há mais' não ser mentira", () => {
    const r = buscarConceitos(atlas, "a");                 // casa com muita coisa
    expect(r.achados.length).toBeLessThanOrEqual(MAX_RESULTADOS);
    expect(MAX_RESULTADOS).toBe(30);
    expect(r.total).toBeGreaterThan(r.achados.length);
    expect(buscarConceitos(atlas, "heart", 3).achados.length).toBeLessThanOrEqual(3);
    expect(buscarConceitos(atlas, "heart", 0).achados).toEqual([]);
  });
});

describe("SINÔNIMOS PT→EN — o portão que impede sinônimo que não acha nada", () => {
  it("TODO sinônimo em português casa com pelo menos um conceito do atlas real", () => {
    const vazios: string[] = [];
    for (const [pt, en] of Object.entries(SINONIMOS_PT)) {
      const r = buscarConceitos(atlas, pt);
      if (!r.achados.length) vazios.push(`${pt} → ${en}`);
      expect(r.termo, `${pt} devia buscar por ${en}`).toBe(en);
      expect(r.viaSinonimo).toBe(true);
    }
    expect(vazios, "sinônimos que prometem e não acham nada").toEqual([]);
  });

  it("o acento não importa, e o que não é sinônimo busca o próprio termo", () => {
    expect(termoDeBusca("coração")).toEqual({ termo: "heart", viaSinonimo: true });
    expect(termoDeBusca("CORAÇÃO")).toEqual({ termo: "heart", viaSinonimo: true });
    expect(termoDeBusca("figado")).toEqual({ termo: "liver", viaSinonimo: true });
    expect(termoDeBusca("thalamus")).toEqual({ termo: "thalamus", viaSinonimo: false });
  });
});

describe("COGNATAS em frase — o furo que o mapa não alcança", () => {
  /**
   * O #743 varre os n-gramas contra o MAPA. Boa parte da anatomia, porém, é cognata — fêmur/femur,
   * tíbia/tibia — e esses termos nunca entraram no mapa justamente porque sozinhos já funcionam.
   * Medido antes do conserto: "fêmur" achava os 3 conceitos, "me mostra o fêmur" achava ZERO.
   */
  it("a frase chega ao MESMO resultado que o termo nu — não parecido: igual", () => {
    for (const [frase, nu] of [
      ["me mostra o fêmur", "fêmur"],
      ["quero ver a tíbia", "tíbia"],
      ["o que faz o pâncreas", "pâncreas"],
      ["explica a aorta pra mim", "aorta"],
    ] as const) {
      const a = buscarConceitos(atlas, frase);
      const b = buscarConceitos(atlas, nu);
      expect(a.achados, `"${frase}" ≠ "${nu}"`).toEqual(b.achados);
      expect(a.achados.length, `"${frase}" não achou nada`).toBeGreaterThan(0);
      expect(a.termo).toBe(b.termo);
    }
  });

  it("não inventa estrutura em pergunta que não é de anatomia", () => {
    const achou: string[] = [];
    for (const q of [
      "como faço um bolo de cenoura", "o que é a fotossíntese", "quanto é dois mais dois",
      "me explica a revolução francesa", "qual a capital da frança", "o que é um polinômio",
      "como funciona o blockchain", "quero estudar para o enem", "me da um resumo disso",
      "o que você sabe fazer", "me ajuda com a prova de direito", "me fala sobre o Brasil",
    ]) {
      if (buscarConceitos(atlas, q).achados.length) achou.push(q);
    }
    expect(achou, "frase sem anatomia virou estrutura").toEqual([]);
  });

  it("termoNaFrase exige PALAVRA INTEIRA — 'o' não casa com 'colon', 'me' não casa com 'omentum'", () => {
    // o perigo concreto: a busca principal usa `includes`, e aplicá-lo ao fallback faria a palavra
    // de função mais curta da frase casar com quase todo nome do atlas.
    expect(termoNaFrase(atlas, "o me um da no")).toBeNull();
    expect(termoNaFrase(atlas, "me mostra o femur")).toBe("femur");
  });

  it("uma palavra só não entra no fallback: a busca já tentou e não achou", () => {
    expect(termoNaFrase(atlas, "femur")).toBeNull();
    expect(termoNaFrase(atlas, "")).toBeNull();
  });

  it("não atropela o MAPA: termo vetado continua ganhando da varredura da frase", () => {
    // "osso do fêmur" tem DUAS candidatas; "osso" está no mapa, e tradução vetada vence o palpite.
    const r = buscarConceitos(atlas, "osso do fêmur");
    expect(r.viaSinonimo).toBe(true);
    expect(r.termo).toBe("bone");
  });

  it("os três acertos por acidente que eram ERRADOS: clavícula, mandíbula e língua", () => {
    // sem o mapa, a subcadeia casava e casava errado — e parecia certo, que é o pior caso.
    // "clavicula" caía em "clavicular part of deltoid" (músculo), "lingua" em "sublingual gland".
    for (const [pt, esperado] of [
      ["clavícula", "clavicle"], ["mandíbula", "mandible"], ["língua", "tongue"],
    ] as const) {
      const r = buscarConceitos(atlas, pt, 1);
      expect(r.termo).toBe(esperado);
      expect(r.achados[0]?.nome.toLowerCase(), `${pt} devia cair em ${esperado}`).toBe(esperado);
    }
  });

  it("'alvéolo' em frase continua recusando — o fallback não inventa o que o atlas não tem", () => {
    for (const q of ["alvéolo", "como funciona o alvéolo", "me mostra um alvéolo pulmonar"]) {
      expect(buscarConceitos(atlas, q).achados, q).toEqual([]);
    }
  });
});

describe("acharConceito / pecasDoConceito — o inspect_anatomical_structure", () => {
  it("id exato acha; qualquer coisa fora disso é null, nunca 'o mais parecido'", () => {
    const c = acharConceito(atlas, "FMA3710");
    expect(c?.name).toBe("vascular tree");
    expect(c?.elements.length).toBe(7);
    expect(acharConceito(atlas, "FMA37")).toBeNull();        // prefixo não vale
    expect(acharConceito(atlas, "fma3710")).toBeNull();      // caixa não vale
    expect(acharConceito(atlas, "")).toBeNull();
    expect(acharConceito(atlas, null)).toBeNull();
    expect(acharConceito(atlas, 3710)).toBeNull();
  });

  it("as peças de um conceito existem no manifesto, e trazem o sistema de cada uma", () => {
    const c = acharConceito(atlas, "FMA3710")!;
    const pecas = pecasDoConceito(atlas, c);
    expect(pecas.length).toBe(c.elements.length);            // nenhuma peça órfã
    for (const p of pecas) expect(ehSistema(p.system)).toBe(true);
    expect(sistemasDoConceito(atlas, c).length).toBeGreaterThan(0);
  });

  it("todo conceito do atlas aponta só para peças que existem (varredura do dado inteiro)", () => {
    const ids = new Set(atlas.parts.map((p) => p.id));
    const orfaos: string[] = [];
    for (const c of atlas.concepts) for (const e of c.elements) if (!ids.has(e)) orfaos.push(`${c.id}→${e}`);
    expect(orfaos.slice(0, 5), `${orfaos.length} referências órfãs`).toEqual([]);
  });
});

describe("explicacao — específica quando existe, do sistema quando não, e nunca inventada", () => {
  it("órgão conhecido traz o texto próprio; desconhecido cai no sistema", () => {
    expect(explicacao("heart", "cardiac")).toContain("Bomba muscular");
    expect(explicacao("Heart", "cardiac")).toContain("Bomba muscular");       // a chave é minúscula
    expect(explicacao("some obscure ligament", "connective")).toBe(SISTEMAS_POR_ID.get("connective")!.descricao);
  });

  it("sem órgão e sem sistema válido devolve string vazia — não um texto plausível", () => {
    expect(explicacao("nada", "inexistente" as never)).toBe("");
  });

  /**
   * ACHADO DO DADO, registrado para ninguém prometer o que ele não tem: o sistema LINFÁTICO desta
   * referência é só BAÇO e TIMO. Não há um único conceito de linfonodo nem de vaso linfático nos
   * 3.432 — foi o portão dos sinônimos que descobriu, ao recusar "linfonodo → lymph node".
   * Um mentor de medicina que prometa linfonodo aqui vai entregar "não achei".
   */
  it("o sistema linfático deste atlas é baço e timo — e NADA de linfonodo", () => {
    expect(buscarConceitos(atlas, "lymph").achados, "linfonodo/vaso linfático").toEqual([]);
    const doLinfatico = new Set(
      atlas.parts.filter((p) => p.system === "lymphatic")
        .map((p) => atlas.concepts.find((c) => c.id === p.conceptId)?.name ?? ""),
    );
    expect([...doLinfatico].sort()).toEqual(["left lobe of thymus", "right lobe of thymus", "spleen"]);
    expect(buscarConceitos(atlas, "baco").achados.length, "baço acha").toBeGreaterThan(0);
    expect(buscarConceitos(atlas, "timo").achados.length, "timo acha").toBeGreaterThan(0);
  });

  it("a pele fica FORA do padrão visível (senão ela esconde o corpo todo)", () => {
    expect(VISIVEIS_PADRAO).not.toContain("integumentary");
    expect(VISIVEIS_PADRAO.length).toBe(14);
  });
});

describe("a consulta vem como PERGUNTA, não como termo (medido em produção, 2026-11-09)", () => {
  const nomes = atlas.concepts.map((c) => (c.name || "").toLowerCase());

  it("o artigo sozinho zerava a busca — 'o pulmão' tem de achar o mesmo que 'pulmão'", () => {
    expect(termoDeBusca("pulmão")).toEqual({ termo: "lung", viaSinonimo: true });
    expect(termoDeBusca("o pulmão")).toEqual({ termo: "lung", viaSinonimo: true });
    expect(buscarConceitos(atlas, "o pulmão").achados.length)
      .toBe(buscarConceitos(atlas, "pulmão").achados.length);
  });

  it("a pergunta inteira do aluno chega ao atlas", () => {
    for (const p of ["como funciona um pulmão", "funcionamento do pulmão", "me explica o pulmão", "quero ver os pulmões"]) {
      expect(termoDeBusca(p), p).toEqual({ termo: "lung", viaSinonimo: true });
      const r = buscarConceitos(atlas, p);
      expect(r.achados.length, p).toBeGreaterThan(0);
      expect(r.achados.some((a) => a.nome.includes("lung")), p).toBe(true);
    }
  });

  it("com dois órgãos na frase, o mais à esquerda ganha (regra declarada, não acidente)", () => {
    expect(termoDeBusca("o coração e o pulmão").termo).toBe("heart");
    expect(termoDeBusca("o pulmão e o coração").termo).toBe("lung");
  });

  it("n-grama de duas palavras resolve antes das palavras soltas", () => {
    expect(termoDeBusca("sistema respiratório")).toEqual({ termo: "respiratory system", viaSinonimo: true });
    expect(buscarConceitos(atlas, "como funciona o sistema respiratório").achados.length).toBeGreaterThan(0);
  });

  it("os dois sinônimos novos existem no atlas REAL (senão prometem e falham)", () => {
    expect(nomes.filter((n) => n.includes("respiratory system")).length).toBeGreaterThan(0);
    expect(nomes.filter((n) => n.includes("bronchus")).length).toBeGreaterThan(0);
    expect(buscarConceitos(atlas, "brônquio").achados.length).toBeGreaterThan(0);
  });

  it("termo em inglês NÃO é marcado como traduzido (a mentora não pode afirmar que traduziu)", () => {
    expect(termoDeBusca("lung")).toEqual({ termo: "lung", viaSinonimo: false });
    expect(termoDeBusca("left lung").viaSinonimo).toBe(false);
  });

  it("frase sem termo anatômico NÃO inventa alvo — segue como frase e a busca recusa", () => {
    const r = termoDeBusca("qual a melhor faculdade de medicina");
    expect(r.viaSinonimo).toBe(false);
    expect(r.termo).toBe("qual a melhor faculdade de medicina");
    expect(buscarConceitos(atlas, "qual a melhor faculdade de medicina").achados).toHaveLength(0);
  });

  it("'alvéolo' continua VAZIO de propósito: o atlas tem zero, e recusar é melhor que mentir", () => {
    expect(nomes.filter((n) => n.includes("alveol"))).toHaveLength(0);
    expect(nomes.filter((n) => n.includes("bronchiole"))).toHaveLength(0);
    expect(buscarConceitos(atlas, "alvéolo").achados).toHaveLength(0);
  });
});
