/**
 * TESTES DIFERENCIAIS DO ATLAS, com pedidos NATURAIS (dono, 2026-11-12).
 *
 * "Diferencial" em dois sentidos, e os dois acharam defeito de verdade antes de este arquivo existir:
 *
 *  1. PARES MÍNIMOS — dois pedidos que diferem em UMA palavra têm de abrir peças DIFERENTES, cada um
 *     a sua. Medido antes do conserto:  "pulmão direito" → left lung · "intestino delgado" → large
 *     intestine · "veia cava superior" → inferior vena cava · "membro inferior" → inferior rectus (um
 *     músculo do olho). Peça errada, isolada e bonita, com cara de resposta.
 *  2. PARÁFRASES — o mesmo pedido escrito de jeitos diferentes tem de abrir a MESMA peça. É o que
 *     separa "o atlas entende o aluno" de "o atlas entende a palavra-chave".
 *
 * E a REGRA que vale para toda cena que sai daqui (lib/anatomia/isolamento): isolada, só com as
 * peças da estrutura pedida, e nunca o corpo inteiro. Não isolado é ERRO.
 *
 * Os pedidos passam pelos mesmos três degraus do chat: o que o harness reconhece no pedido
 * (`estruturaNomeada`), o artefato que ele emite (`artefatosComAnatomia` + o portão
 * `validarArtefatosDeAnatomia`) e a cena que a rota do cartão monta com o título dele
 * (`cenaDoConceito`). O teste de ida e volta afirma que os três falam da mesma peça.
 */
import { describe, expect, it } from "vitest";
import { carregarAtlas } from "@/lib/anatomia/carregar";
import { cenaDoConceito, type ResultadoCena } from "@/lib/anatomia/cena-do-conceito";
import { ladoDaFrase, buscarConceitos } from "@/lib/anatomia/busca";
import { contarVisiveis, escolherConceito, ESTADO_INICIAL } from "@/lib/anatomia/estado";
import {
  FRACAO_DE_CORPO_INTEIRO, LINK_DO_CORPO_INTEIRO, aberturaDoAtlas, ehCorpoInteiro, estadoEstaIsolado, linkDoAtlas,
  verificarIsolamento,
} from "@/lib/anatomia/isolamento";
import { esconderTodos } from "@/lib/anatomia/estado";
import { estruturaNomeada } from "@/lib/anatomia/pedido";
import { artefatosComAnatomia, validarArtefatosDeAnatomia } from "@/lib/agent/anatomiaDoTurno";
import { estadoDaEstruturaPedida } from "@/components/anatomia/AtlasDoCorpo";
import type { StudioRef } from "@/lib/agent/contracts";

const atlas = carregarAtlas();
const cena = (pedido: string): ResultadoCena => cenaDoConceito(atlas!, pedido);
const nomeDe = (pedido: string): string | null => { const r = cena(pedido); return r.ok ? r.dados.conceito.nome : null; };
const codigoDe = (pedido: string): string | null => { const r = cena(pedido); return r.ok ? null : r.code; };

/** A regra do dono, afirmada sobre uma cena: isolada, só a estrutura, nunca o corpo. */
function exigirIsolada(pedido: string): void {
  const r = cena(pedido);
  if (!r.ok) throw new Error(`"${pedido}" não abriu cena (${r.code})`);
  const { estado, conceito, pecas } = r.dados;
  const c = atlas!.concepts.find((x) => x.id === conceito.id)!;
  expect(estado.isolate, `"${pedido}": cena não isolada`).toBe(true);
  expect([...estado.selected].sort(), `"${pedido}": seleção diferente da estrutura`).toEqual([...c.elements].sort());
  const visiveis = contarVisiveis(atlas!.parts, estado);
  expect(visiveis, `"${pedido}": mostra peça que não é da estrutura`).toBe(pecas);
  expect(visiveis, `"${pedido}": mostra o corpo inteiro`).toBeLessThan(atlas!.parts.length * FRACAO_DE_CORPO_INTEIRO);
  expect(verificarIsolamento(atlas!, estado, c.elements).ok).toBe(true);
}

describe.runIf(!!atlas)("DIFERENCIAL · pares mínimos — uma palavra muda, a peça muda", () => {
  // [pedido A, peça A, pedido B, peça B]
  const PARES: [string, string, string, string][] = [
    ["me mostra o pulmão direito", "right lung", "me mostra o pulmão esquerdo", "left lung"],
    ["quero ver a mão direita", "right hand", "quero ver a mão esquerda", "left hand"],
    ["abre o rim direito", "right kidney", "abre o rim esquerdo", "left kidney"],
    ["o fêmur direito", "right femur", "o fêmur esquerdo", "left femur"],
    ["olho direito", "right eyeball", "olho esquerdo", "left eyeball"],
    ["braço direito", "right arm", "braço esquerdo", "left arm"],
    ["joelho direito", "right knee", "joelho esquerdo", "left knee"],
    ["clavícula direita", "right clavicle", "clavícula esquerda", "left clavicle"],
    ["ventrículo direito", "right ventricle", "ventrículo esquerdo", "left ventricle"],
    ["átrio direito", "right atrium", "átrio esquerdo", "left atrium"],
    ["membro inferior direito", "right lower limb", "membro inferior esquerdo", "left lower limb"],
    ["intestino delgado", "small intestine", "intestino grosso", "large intestine"],
    ["veia cava superior", "superior vena cava", "veia cava inferior", "inferior vena cava"],
    ["artéria femoral", "femoral artery", "veia femoral", "femoral vein"],
    ["fêmur", "femur", "tíbia", "tibia"],
    ["tíbia", "tibia", "fíbula", "fibula"],
    ["úmero", "humerus", "rádio do braço", "radius"],
    ["coração", "heart", "fígado", "liver"],
    ["estômago", "stomach", "baço", "spleen"],
    ["cérebro", "brain", "cerebelo", "cerebellum"],
    ["traqueia", "trachea", "esôfago", "esophagus"],
    ["crânio", "skull", "mandíbula", "mandible"],
    ["escápula", "scapula", "clavícula", "clavicle"],
  ];

  it.each(PARES)("%s → %s  ·  %s → %s", (pedidoA, pecaA, pedidoB, pecaB) => {
    expect(nomeDe(pedidoA)).toBe(pecaA);
    expect(nomeDe(pedidoB)).toBe(pecaB);
    expect(pecaA).not.toBe(pecaB);
    exigirIsolada(pedidoA);
    exigirIsolada(pedidoB);
  });

  it("os dois lados de um par NÃO compartilham peça nenhuma", () => {
    for (const base of ["pulmão", "mão", "rim", "fêmur", "olho"]) {
      const d = cena(`${base} direito`), e = cena(`${base} esquerdo`);
      if (!d.ok || !e.ok) throw new Error(base);
      const doDireito = new Set(d.dados.estado.selected);
      expect(e.dados.estado.selected.filter((id) => doDireito.has(id)), base).toEqual([]);
    }
  });

  it("o lado pedido é do lado pedido — conferido no NOME de cada peça, não só no do conceito", () => {
    const porId = new Map(atlas!.parts.map((p) => [p.id, p.name.toLowerCase()]));
    for (const [pedido, certo, errado] of [["pulmão direito", "right", "left"], ["mão esquerda", "left", "right"], ["rim direito", "right", "left"]] as const) {
      const r = cena(pedido);
      if (!r.ok) throw new Error(pedido);
      const nomes = r.dados.estado.selected.map((id) => porId.get(id) ?? "");
      expect(nomes.filter((n) => new RegExp(`\\b${errado}\\b`).test(n) && !new RegExp(`\\b${certo}\\b`).test(n)), pedido).toEqual([]);
    }
  });
});

describe.runIf(!!atlas)("DIFERENCIAL · paráfrases — jeitos diferentes de pedir, a mesma peça", () => {
  const GRUPOS: [string, string[]][] = [
    ["right lung", ["pulmão direito", "me mostra o pulmão direito", "quero ver o pulmão do lado direito", "abre o pulmão direito pra mim, por favor", "como é o pulmão direito?", "Pulmão Direito", "PULMAO DIREITO", "right lung"]],
    ["femur", ["fêmur", "femur", "me mostra o fêmur", "onde fica o fêmur?", "quero ver o osso do fêmur", "como é o fêmur por dentro"]],
    ["heart", ["coração", "me mostra o coração", "como funciona o coração?", "quero ver o coração isolado", "abre o coração no atlas", "heart"]],
    ["small intestine", ["intestino delgado", "me mostra o intestino delgado", "como é o intestino delgado?", "small intestine"]],
    ["left kidney", ["rim esquerdo", "o rim do lado esquerdo", "me mostra o rim esquerdo", "left kidney"]],
    ["femoral artery", ["artéria femoral", "mostra a artéria femoral", "onde passa a artéria femoral?"]],
    ["diaphragm", ["diafragma", "qual a função do diafragma na respiração", "me mostra o diafragma"]],
    ["skull", ["crânio", "me mostra o crânio", "como é o crânio?"]],
  ];

  it.each(GRUPOS)("%s", (peca, pedidos) => {
    for (const p of pedidos) {
      expect(nomeDe(p), p).toBe(peca);
      exigirIsolada(p);
    }
  });
});

describe.runIf(!!atlas)("DIFERENCIAL · o que NÃO é uma parte não abre cena", () => {
  it.each([
    ["quero ver um osso", "classe_generica"],
    ["me mostra os músculos", "classe_generica"],
    ["uma artéria", "classe_generica"],
    ["todos os ossos", "classe_generica"],
    ["human body", "corpo_inteiro"],
    ["me mostra o corpo humano", "sem_resultado"],
    ["o corpo inteiro", "sem_resultado"],
    ["anatomia", "sem_resultado"],
    ["", "consulta_vazia"],
  ])("%s → recusa (%s)", (pedido, codigo) => {
    expect(nomeDe(pedido)).toBeNull();
    expect(codigoDe(pedido)).toBe(codigo);
  });

  it("ambiguidade conhecida: 'atlas' é também a 1ª vértebra cervical — abre ELA, uma peça, nunca o corpo", () => {
    // "abre o atlas" casa com a vértebra C1, que se chama atlas. É uma peça de verdade, isolada;
    // o que este teste garante é que o pedido ambíguo não vira o corpo inteiro.
    const r = cena("abre o atlas");
    if (!r.ok) throw new Error("atlas");
    expect(r.dados.conceito.nome).toBe("atlas");
    expect(r.dados.pecas).toBeLessThan(5);
    exigirIsolada("abre o atlas");
  });

  it("nenhum pedido de parte abre mais da metade do atlas", () => {
    const pedidos = ["coração", "pulmão direito", "cérebro", "fígado", "crânio", "coluna vertebral", "sistema respiratório", "sistema nervoso", "esqueleto", "cabeça", "intestino delgado"];
    for (const p of pedidos) {
      const r = cena(p);
      if (!r.ok) throw new Error(`${p}: ${r.code}`);
      expect(ehCorpoInteiro(atlas!, r.dados.pecas), p).toBe(false);
    }
  });

  it("um SISTEMA é pedido legítimo: abre o sistema, isolado — não o corpo", () => {
    expect(nomeDe("me mostra o sistema respiratório")).toBe("respiratory system");
    exigirIsolada("me mostra o sistema respiratório");
    expect(nomeDe("esqueleto")).toBe("skeletal system");   // antes: `skeleton of mouth`, UMA peça da boca
    exigirIsolada("esqueleto");
  });
});

describe.runIf(!!atlas)("LATERALIDADE · a palavra do lado", () => {
  it("lê o lado em português e em inglês; os dois lados juntos não escolhem nenhum", () => {
    expect(ladoDaFrase("pulmão direito")).toBe("right");
    expect(ladoDaFrase("a mão ESQUERDA")).toBe("left");
    expect(ladoDaFrase("o rim do lado direito")).toBe("right");
    expect(ladoDaFrase("right lung")).toBe("right");
    expect(ladoDaFrase("pulmão")).toBeNull();
    expect(ladoDaFrase("pulmão direito e esquerdo")).toBeNull();
    expect(ladoDaFrase("direitos humanos")).toBeNull();      // "direitos" não é "direito"
  });

  it("sem lado na frase, o outro lado vai como alternativa — o aluno troca sem perguntar de novo", () => {
    const r = cena("me mostra o pulmão");
    if (!r.ok) throw new Error("pulmão");
    expect(["left lung", "right lung"]).toContain(r.dados.conceito.nome);
    const outro = r.dados.conceito.nome === "left lung" ? "right lung" : "left lung";
    expect(r.dados.alternativas.map((a) => a.nome)).toContain(outro);
  });

  it("estrutura que só existe em par: com lado, vem UMA peça; sem lado, o par", () => {
    const par = cena("rim"), direito = cena("rim direito");
    if (!par.ok || !direito.ok) throw new Error("rim");
    expect(par.dados.pecas).toBe(2);
    expect(direito.dados.pecas).toBe(1);
    expect(par.dados.estado.selected).toContain(direito.dados.estado.selected[0]);
  });

  it("a ferramenta do agente recebe o mesmo conserto (ela passa por buscarConceitos)", () => {
    expect(buscarConceitos(atlas!, "pulmão direito").achados[0].nome).toBe("right lung");
    expect(buscarConceitos(atlas!, "pulmão direito", 1).achados).toHaveLength(1);
    expect(buscarConceitos(atlas!, "pulmão direito", 1).achados[0].nome).toBe("right lung");
  });

  it("lado pedido que o atlas não tem não vira o lado errado", () => {
    // `shoulder`: o atlas tem `right shoulder` e não `left shoulder` (medido). Pedir o esquerdo não
    // pode devolver uma peça com nome de esquerdo que não existe — fica o que a busca achou.
    const r = buscarConceitos(atlas!, "ombro esquerdo");
    for (const a of r.achados.slice(0, 1)) expect(a.nome).not.toMatch(/^left /);
  });
});

describe.runIf(!!atlas)("IDA E VOLTA · o que o harness emite é o que o cartão abre", () => {
  const PEDIDOS = [
    "me mostra o pulmão direito", "como funciona o coração?", "onde fica o fígado", "quero ver a mão esquerda",
    "me mostra o fêmur", "mostra a artéria femoral", "intestino delgado", "veia cava superior",
    "abre o rim direito", "me explica o nervo óptico", "ventrículo esquerdo", "esqueleto",
  ];

  it.each(PEDIDOS)("%s", (pedido) => {
    const estrutura = estruturaNomeada(atlas!, pedido);
    expect(estrutura, "o harness não reconheceu a estrutura no pedido").not.toBeNull();
    // o harness põe a peça no lugar do palpite (um diagrama)…
    const emitidos = artefatosComAnatomia({ artefatos: [{ studioKind: "diagram", title: "x" } as StudioRef], objetivo: pedido, estrutura });
    expect(emitidos.map((a) => a.studioKind)).toEqual(["anatomia"]);
    // …o portão do isolamento a deixa passar…
    const validos = validarArtefatosDeAnatomia(emitidos, (t) => { const r = cena(t); return r.ok ? { ok: true, nome: r.dados.conceito.nome } : { ok: false }; });
    expect(validos).toHaveLength(1);
    // …e a rota do cartão, com o TÍTULO que viajou, monta a MESMA peça que o pedido pedia
    const doCartao = cena(String(validos[0].title));
    const doPedido = cena(pedido);
    if (!doCartao.ok || !doPedido.ok) throw new Error(pedido);
    expect(doCartao.dados.conceito.id).toBe(doPedido.dados.conceito.id);
    expect(doCartao.dados.conceito.id).toBe(estrutura!.id);
    exigirIsolada(String(validos[0].title));
  });
});

describe.runIf(!!atlas)("O PORTÃO DO HARNESS · só viaja o que o atlas mostra isolado", () => {
  const resolver = (t: string) => { const r = cena(t); return r.ok ? { ok: true as const, nome: r.dados.conceito.nome } : { ok: false as const }; };
  const peca = (title: string) => ({ studioKind: "anatomia", title } as StudioRef);

  it("título que o modelo inventou, classe genérica e corpo inteiro NÃO viram cartão", () => {
    for (const ruim of ["osso", "músculo", "human body", "corpo humano", "glândula de Zaeon", ""]) {
      expect(validarArtefatosDeAnatomia([peca(ruim)], resolver), ruim).toEqual([]);
    }
  });

  it("a peça válida viaja com o nome canônico do atlas", () => {
    expect(validarArtefatosDeAnatomia([peca("pulmão direito")], resolver)).toEqual([{ studioKind: "anatomia", title: "right lung" }]);
  });

  it("uma peça só por resposta; o que não é anatomia passa intacto", () => {
    const r = validarArtefatosDeAnatomia([peca("coração"), { studioKind: "molecule", title: "oxigênio" } as StudioRef, peca("fígado")], resolver);
    expect(r.map((a) => `${a.studioKind}:${a.title}`)).toEqual(["anatomia:heart", "molecule:oxigênio"]);
  });

  it("a peça inválida some, e a válida seguinte assume o lugar", () => {
    const r = validarArtefatosDeAnatomia([peca("um osso"), peca("fêmur")], resolver);
    expect(r).toEqual([{ studioKind: "anatomia", title: "femur" }]);
  });
});

describe.runIf(!!atlas)("A REGRA · não isolado é erro", () => {
  const coracao = atlas!.concepts.find((c) => c.name === "heart")!;
  const isolado = { ...escolherConceito(ESTADO_INICIAL, coracao), isolate: true };

  it("a cena certa passa, e diz quantas peças mostra", () => {
    expect(verificarIsolamento(atlas!, isolado, coracao.elements)).toEqual({ ok: true, visiveis: coracao.elements.length });
  });

  it("sem isolamento: erro — a peça ficaria no meio do corpo inteiro", () => {
    const v = verificarIsolamento(atlas!, { ...isolado, isolate: false }, coracao.elements);
    expect(v).toMatchObject({ ok: false, code: "nao_isolada" });
    // e é isso mesmo que aconteceria: com o estado não isolado, a tela teria milhares de peças
    expect(contarVisiveis(atlas!.parts, { ...isolado, isolate: false })).toBeGreaterThan(atlas!.parts.length * 0.5);
  });

  it("sem seleção: erro — é o corpo inteiro sem destaque (o estado em que a página abria)", () => {
    expect(verificarIsolamento(atlas!, ESTADO_INICIAL)).toMatchObject({ ok: false, code: "sem_selecao" });
    expect(verificarIsolamento(atlas!, { ...ESTADO_INICIAL, isolate: true })).toMatchObject({ ok: false, code: "sem_selecao" });
    expect(verificarIsolamento(atlas!, null)).toMatchObject({ ok: false, code: "sem_selecao" });
  });

  it("peça a mais ou a menos na seleção: erro", () => {
    const umaAMais = atlas!.parts.find((p) => !coracao.elements.includes(p.id))!.id;
    expect(verificarIsolamento(atlas!, { ...isolado, selected: [...isolado.selected, umaAMais] }, coracao.elements)).toMatchObject({ ok: false, code: "selecao_alheia" });
    expect(verificarIsolamento(atlas!, { ...isolado, selected: isolado.selected.slice(1) }, coracao.elements)).toMatchObject({ ok: false, code: "selecao_alheia" });
  });

  it("o corpo inteiro 'isolado' continua sendo o corpo: erro", () => {
    const tudo = { ...ESTADO_INICIAL, isolate: true, selected: atlas!.parts.map((p) => p.id) };
    expect(verificarIsolamento(atlas!, tudo)).toMatchObject({ ok: false, code: "corpo_inteiro" });
    const corpo = atlas!.concepts.find((c) => c.name === "human body")!;
    expect(ehCorpoInteiro(atlas!, corpo.elements.length)).toBe(true);
  });

  it("TODO conceito do atlas ou abre isolado, ou é recusado — nenhum abre o corpo calado", () => {
    let abertos = 0, recusados = 0;
    for (const c of atlas!.concepts) {
      const r = estadoDaEstruturaPedida(atlas!, c.id);
      if (r.ok) {
        abertos++;
        expect(estadoEstaIsolado(r.estado), c.name).toBe(true);
        expect(contarVisiveis(atlas!.parts, r.estado), c.name).toBeLessThan(atlas!.parts.length * FRACAO_DE_CORPO_INTEIRO);
      } else recusados++;
    }
    expect(abertos).toBeGreaterThan(3000);
    expect(abertos + recusados).toBe(atlas!.concepts.length);
  });
});

describe.runIf(!!atlas)("ABRIR O ATLAS · a página chega NA estrutura, não no corpo", () => {
  it("o link do cartão leva o id da estrutura", () => {
    expect(linkDoAtlas("FMA7088")).toBe("/anatomia?estrutura=FMA7088");
    expect(linkDoAtlas("")).toBeNull();
    expect(linkDoAtlas(undefined)).toBeNull();
    expect(linkDoAtlas("javascript:alert(1)")).toBeNull();
    expect(linkDoAtlas("FMA7088&x=<script>")).toBeNull();
  });

  it("a página abre com a estrutura escolhida e ISOLADA", () => {
    const r = cena("pulmão direito");
    if (!r.ok) throw new Error("pulmão direito");
    const aberta = estadoDaEstruturaPedida(atlas!, r.dados.conceito.id);
    if (!aberta.ok) throw new Error(aberta.motivo);
    expect(aberta.conceito.name).toBe("right lung");
    expect(aberta.estado.isolate).toBe(true);
    expect(contarVisiveis(atlas!.parts, aberta.estado)).toBe(r.dados.pecas);
    // o que a página mostra é o que o cartão mostrava
    expect([...aberta.estado.selected].sort()).toEqual([...r.dados.estado.selected].sort());
  });

  it("id que o atlas não tem é erro dito — nunca o corpo inteiro no lugar", () => {
    const r = estadoDaEstruturaPedida(atlas!, "FMA0000000");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toMatch(/não tem a estrutura/);
  });

  it("o id do corpo inteiro é recusado também pela página", () => {
    const corpo = atlas!.concepts.find((c) => c.name === "human body")!;
    const r = estadoDaEstruturaPedida(atlas!, corpo.id);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toMatch(/corpo/);
  });
});

describe("ABRIR O ATLAS · o corpo inteiro é uma ESCOLHA, não o padrão", () => {
  it("sem pedido nenhum, a página não abre o corpo: abre a pergunta", () => {
    expect(aberturaDoAtlas("")).toEqual({ modo: "escolha" });
    expect(aberturaDoAtlas(null)).toEqual({ modo: "escolha" });
    expect(aberturaDoAtlas("?utm_source=x")).toEqual({ modo: "escolha" });
    expect(aberturaDoAtlas("?corpo=")).toEqual({ modo: "escolha" });
    expect(aberturaDoAtlas("?corpo=metade")).toEqual({ modo: "escolha" });
  });

  it("o corpo inteiro abre quando é pedido com todas as letras", () => {
    expect(aberturaDoAtlas("?corpo=inteiro")).toEqual({ modo: "corpo" });
    expect(aberturaDoAtlas("?corpo=INTEIRO")).toEqual({ modo: "corpo" });
    expect(aberturaDoAtlas(LINK_DO_CORPO_INTEIRO.split("?")[1])).toEqual({ modo: "corpo" });
  });

  it("a estrutura pedida ganha do corpo inteiro: o pedido mais específico manda", () => {
    expect(aberturaDoAtlas("?estrutura=FMA7088")).toEqual({ modo: "estrutura", id: "FMA7088" });
    expect(aberturaDoAtlas("?corpo=inteiro&estrutura=FMA7088")).toEqual({ modo: "estrutura", id: "FMA7088" });
    expect(aberturaDoAtlas(linkDoAtlas("FMA7309")!.split("?")[1])).toEqual({ modo: "estrutura", id: "FMA7309" });
  });

  it.runIf(!!atlas)("o estado com que a página nasce não desenha peça nenhuma", () => {
    const nascimento = esconderTodos(ESTADO_INICIAL);
    expect(contarVisiveis(atlas!.parts, nascimento)).toBe(0);
    // e o estado antigo, que era o padrão, desenhava quase tudo — é o que deixou de ser automático
    expect(contarVisiveis(atlas!.parts, ESTADO_INICIAL)).toBeGreaterThan(atlas!.parts.length * 0.9);
  });
});
