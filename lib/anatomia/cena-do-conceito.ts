/**
 * lib/anatomia/cena-do-conceito.ts — o que o ARTEFATO de anatomia carrega. PURO: sem rede, sem DOM,
 * sem three, sem prisma.
 *
 * ────────────────────────── por que o artefato é um ESTADO, e não uma imagem ──────────────────────────
 * O repo de origem (ashemag/human-atlas, MIT) não tem screenshot, export, nem estado na URL — medido
 * em 2026-11-09. O `WebGLRenderer` dele nasce sem `preserveDrawingBuffer`, então nem capturar o canvas
 * depois do quadro é possível. Montar um pipeline de imagem (headless, offscreen, 90 MB de geometria
 * no servidor) para devolver um PNG seria caro e frágil.
 *
 * E é desnecessário: o `EstadoCena` — quais peças estão selecionadas, quais sistemas ligados, a vista,
 * a explosão — determina INTEIRAMENTE o que o aluno vê, e cabe em meia dúzia de campos. O 3D quem
 * desenha é o visualizador que já existe (`components/anatomia/CenaDoCorpo`, 54 linhas, que recebe
 * `EstadoCena` como prop). Então o artefato é a descrição da cena, e a renderização é do cliente.
 *
 * ────────────────────────── por que o artefato nasce ISOLADO ──────────────────────────
 * Esta decisão eu primeiro tomei errada, e a corrigi DEPOIS DE RENDERIZAR, não antes.
 *
 * A versão anterior era `escolherConceito(ESTADO_INICIAL, conceito)` e nada além, com o argumento de
 * que `pecaVisivel` já resolvia: `isolate ? selecionada : visible.includes(...) || selecionada` — a
 * seleção vence sistema desligado. Isso é verdade e continua verdade, mas responde a outra pergunta.
 * `pecaVisivel` garante que a malha NÃO É DESCARTADA. Não garante que um humano a enxergue.
 *
 * Medido em produção em 2026-11-09, com o navegador, na página /anatomia: selecionar "left lung"
 * com `isolate: false` deixa 2.229 peças desenhadas e as 124 do pulmão ficam ATRÁS de 402 músculos.
 * A tela não muda. Em nada. A página se salva porque tem um botão "Isolar estrutura" ao lado; um
 * cartão de chat de 300 px não tem, e o aluno receberia um corpo genérico como resposta a "me mostra
 * o pulmão" — exatamente a queixa que originou este trabalho.
 *
 * Com `isolate: true` a mesma cena mostra as 124 peças sozinhas e legíveis. Então o artefato isola,
 * e o contexto do corpo inteiro continua a um clique em "Abrir o atlas", onde existe o caminho de
 * volta ("Mostrar a anatomia ao redor"). O payload segue publicando `sistemasIds` para quem quiser
 * montar outra coisa em cima.
 */
import { SISTEMAS, explicacao, type Atlas, type EstadoCena, type SistemaId } from "@/lib/anatomia/atlas";
import { ESTADO_INICIAL, escolherConceito } from "@/lib/anatomia/estado";
import {
  acharConceito, alternativasDaClasse, buscarConceitos, ehClasseGenerica, pecasDoConceito,
  termoEspecificoNaFrase,
} from "@/lib/anatomia/busca";

/**
 * A fonte que acompanha TODO uso do dado. Mora aqui, no módulo puro, e não ao lado das ferramentas de
 * agente: a CC BY 4.0 exige preservar a atribuição ao redistribuir, e atribuição com duas cópias é
 * atribuição que uma hora divergem. `lib/anatomia/tools.ts` importa desta.
 */
export const FONTE_ATLAS = {
  title: "BodyParts3D 4.0 — The Database Center for Life Science (CC BY 4.0)",
  url: "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html",
} as const;

/** O aviso que viaja com o artefato. O atlas é educacional e de adulto masculino — isto não é rodapé. */
export const AVISO_EDUCACIONAL =
  "Atlas educacional, referência de adulto masculino. Não é ferramenta clínica nem cirúrgica e não "
  + "representa toda variação humana.";

export type AlternativaAnatomia = { id: string; nome: string; pecas: number };

export type DadosAnatomia = {
  conceito: { id: string; nome: string };
  /** o que o visualizador precisa, e só isso */
  estado: EstadoCena;
  /** nomes PT-BR dos sistemas que a estrutura atravessa (para o texto do card) */
  sistemas: string[];
  /** os ids dos mesmos sistemas (para o card oferecer "só este sistema") */
  sistemasIds: SistemaId[];
  /** quantas MALHAS o conceito agrupa — 1 é uma peça só, mais de 1 é agrupamento */
  pecas: number;
  explicacao: string;
  /** o termo que foi de fato procurado: pode ter vindo do mapa PT→EN */
  termoBuscado: string;
  viaSinonimo: boolean;
  /** os outros achados, para o card deixar trocar sem nova pergunta */
  alternativas: AlternativaAnatomia[];
  fonte: { title: string; url: string };
  aviso: string;
};

export type ResultadoCena =
  | { ok: true; dados: DadosAnatomia }
  | {
      ok: false;
      motivo: string;
      code: "sem_resultado" | "consulta_vazia" | "classe_generica";
      termoBuscado: string;
      /** o que o atlas TEM no lugar — nomes reais, para o aluno pedir certo na próxima */
      alternativas?: AlternativaAnatomia[];
    };

const MAX_ALTERNATIVAS = 6;

/** PURO: monta os dados do artefato a partir de um CONCEITO já resolvido. */
export function dadosDoConceito(
  atlas: Atlas,
  conceito: { id: string; name: string; elements: string[] },
  extra: { termoBuscado: string; viaSinonimo: boolean; alternativas?: AlternativaAnatomia[] },
): DadosAnatomia {
  const pecas = pecasDoConceito(atlas, conceito);
  const idsDeSistema = [...new Set(pecas.map((p) => p.system))] as SistemaId[];
  return {
    conceito: { id: conceito.id, nome: conceito.name },
    estado: { ...escolherConceito(ESTADO_INICIAL, conceito), isolate: true },
    sistemas: SISTEMAS.filter((s) => idsDeSistema.includes(s.id)).map((s) => s.nome),
    sistemasIds: SISTEMAS.filter((s) => idsDeSistema.includes(s.id)).map((s) => s.id),
    pecas: pecas.length,
    // A explicação vem do sistema da PRIMEIRA peça quando o conceito não tem texto próprio. Sem peça
    // nenhuma não há de onde tirar, e texto vazio é melhor que texto de outra estrutura.
    explicacao: pecas[0] ? explicacao(conceito.name, pecas[0].system) : "",
    termoBuscado: extra.termoBuscado,
    viaSinonimo: extra.viaSinonimo,
    alternativas: (extra.alternativas ?? []).slice(0, MAX_ALTERNATIVAS),
    fonte: { ...FONTE_ATLAS },
    aviso: AVISO_EDUCACIONAL,
  };
}

/**
 * PURO: a consulta do aluno (termo OU pergunta inteira — `termoDeBusca` extrai) vira a cena.
 *
 * O primeiro achado ganha, porque `buscarConceitos` já ordena com o casamento exato na frente e
 * desempata pelo nome mais curto, que na prática é o conceito mais genérico ("heart" antes de "heart
 * of embryo"). Os demais viajam em `alternativas` para o card deixar trocar sem nova pergunta.
 */
export function cenaDoConceito(atlas: Atlas, consulta: string): ResultadoCena {
  const texto = String(consulta ?? "").trim();
  if (!texto) {
    return { ok: false, motivo: "diga qual estrutura você quer ver", code: "consulta_vazia", termoBuscado: "" };
  }

  const r = buscarConceitos(atlas, texto);

  /**
   * A busca recusou a CATEGORIA. Ela devolve vazio com a classe anotada em vez da categoria inteira
   * (ver `buscarConceitos`), e aqui isso vira uma recusa que ENSINA: os nomes reais que existem sob
   * aquela classe, tirados do atlas. É a diferença entre "não achei" e "você pediu a categoria".
   */
  if (r.classeRecusada) {
    return {
      ok: false,
      motivo: `"${r.classeRecusada}" é a categoria inteira neste atlas, não uma peça — e o que você `
        + "pediu não está nele. Peça uma estrutura pelo nome",
      code: "classe_generica",
      termoBuscado: r.classeRecusada,
      alternativas: alternativasDaClasse(atlas, r.classeRecusada),
    };
  }

  const primeiro = r.achados[0];
  if (!primeiro) {
    // "não achei" tem de ser distinguível de "não existe no corpo humano": o atlas é uma referência
    // PARCIAL (não tem alvéolo nem bronquíolo, por exemplo) e o aluno merece saber qual dos dois é.
    return {
      ok: false,
      motivo: `nenhuma estrutura chamada "${r.termo}" neste atlas — ele é uma referência parcial de `
        + "adulto masculino, não o corpo inteiro",
      code: "sem_resultado",
      termoBuscado: r.termo,
    };
  }

  /**
   * ────────────── o pedido específico não pode virar a classe inteira ──────────────
   * Se o mapa PT→EN levou a uma CLASSE DE TECIDO crua (`artery`, `nerve`, `vein`…), o aluno quase
   * nunca queria isso: "artéria femoral" caía em `artery`, que são 562 peças — a árvore arterial do
   * corpo todo. Antes de desistir, perguntamos ao atlas qual é o termo ESPECÍFICO da frase,
   * ignorando as palavras que são chave do mapa (são elas que produziram o genérico).
   *
   * E entre os achados preferimos o que contém a classe pedida: quem pede ARTÉRIA femoral recebe
   * `femoral artery`, não `femoral vein`. Sem isso o desempate seria alfabético.
   */
  /**
   * O refinamento (categoria → estrutura específica) mora em `buscarConceitos`, não aqui: a
   * ferramenta do agente passa pelo mesmo caminho, e era ela que entregava `nerve` (26 peças, todas
   * da órbita) a quem perguntou do nervo ciático. Consertar só o artefato teria deixado a resposta
   * em TEXTO errada do mesmo jeito.
   */
  const escolhido = primeiro;
  const conceito = acharConceito(atlas, escolhido.id);
  if (!conceito) {
    // Não deve acontecer: o achado vem do próprio atlas. Se acontecer, é dado inconsistente e dizer
    // isso é melhor que montar uma cena com seleção vazia, que o aluno leria como "está tudo normal".
    return {
      ok: false,
      motivo: `o atlas listou "${escolhido.nome}" (${escolhido.id}) na busca mas não tem o conceito`,
      code: "sem_resultado",
      termoBuscado: r.termo,
    };
  }

  return {
    ok: true,
    dados: dadosDoConceito(atlas, conceito, {
      termoBuscado: r.termo,
      viaSinonimo: r.viaSinonimo,
      alternativas: r.achados.filter((a) => a.id !== escolhido.id)
        .map((a) => ({ id: a.id, nome: a.nome, pecas: a.pecas })),
    }),
  };
}
