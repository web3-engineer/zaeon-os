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
 * ────────────────────────── a decisão de visibilidade, e o que eu NÃO inventei ──────────────────────────
 * O estado é `escolherConceito(ESTADO_INICIAL, conceito)` e nada além disso. Não mexo em `visible`
 * porque `pecaVisivel` (lib/anatomia/estado) já resolve: `isolate ? selecionada : visible.includes(...)
 * || selecionada` — a SELEÇÃO VENCE sistema desligado, "de propósito", diz o comentário de lá, "é o
 * que permite buscar uma estrutura e vê-la sem ligar o sistema dela à mão".
 *
 * Eu fui tentado a apagar os outros sistemas para a estrutura "aparecer melhor". Não fiz: é julgamento
 * visual que eu não consigo conferir sem renderizar, e inventá-lo aqui o congelaria para todo aluno.
 * Em vez disso o payload publica `sistemasIds`, e o card oferece "isolar" e "só este sistema" como
 * botões. Quem decide o que quer ver é quem está olhando.
 */
import { SISTEMAS, explicacao, type Atlas, type EstadoCena, type SistemaId } from "@/lib/anatomia/atlas";
import { ESTADO_INICIAL, escolherConceito } from "@/lib/anatomia/estado";
import { acharConceito, buscarConceitos, pecasDoConceito } from "@/lib/anatomia/busca";

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
  | { ok: false; motivo: string; code: "sem_resultado" | "consulta_vazia"; termoBuscado: string };

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
    estado: escolherConceito(ESTADO_INICIAL, conceito),
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

  const conceito = acharConceito(atlas, primeiro.id);
  if (!conceito) {
    // Não deve acontecer: o achado vem do próprio atlas. Se acontecer, é dado inconsistente e dizer
    // isso é melhor que montar uma cena com seleção vazia, que o aluno leria como "está tudo normal".
    return {
      ok: false,
      motivo: `o atlas listou "${primeiro.nome}" (${primeiro.id}) na busca mas não tem o conceito`,
      code: "sem_resultado",
      termoBuscado: r.termo,
    };
  }

  return {
    ok: true,
    dados: dadosDoConceito(atlas, conceito, {
      termoBuscado: r.termo,
      viaSinonimo: r.viaSinonimo,
      alternativas: r.achados.slice(1).map((a) => ({ id: a.id, nome: a.nome, pecas: a.pecas })),
    }),
  };
}
