/**
 * lib/anatomia/estado.ts — o ESTADO do visualizador como função pura. Sem React, sem three.
 *
 * Porte das transições que no human-atlas vivem dentro de `app/page.tsx` (MIT — procedência em
 * lib/anatomia/atlas.ts): os presets, o liga/desliga de sistema, o isolar, a explosão, as vistas.
 * O comportamento é o deles; o que muda é o LUGAR.
 *
 * POR QUE TIRAR DO COMPONENTE. Duas razões concretas, nenhuma estética:
 *
 *  1. `pecaVisivel` é a MESMA pergunta feita em quatro lugares do original — a contagem do painel,
 *     o descarte no shader, a escolha do que pode ser clicado e o empacotamento da explosão. Lá são
 *     quatro expressões escritas à mão com a mesma lógica (`isolate ? selected.has(id) :
 *     visible.has(system) || selected.has(id)`). Quatro cópias de uma regra é quatro chances de ela
 *     divergir, e divergindo o aluno clica numa peça que o shader descartou: o painel abre
 *     descrevendo algo que não está na tela. Aqui a regra existe UMA vez.
 *  2. Estado em função pura é estado AFIRMÁVEL. "Esconder tudo" tem de limpar a seleção, senão a
 *     peça selecionada continua desenhada sozinha no vazio, e "isolar" com seleção vazia tem de
 *     não apagar o corpo inteiro. Isso é teste, não inspeção visual.
 */
import { VISIVEIS_PADRAO, type Conceito, type EstadoCena, type Parte, type SistemaId, type Vista } from "@/lib/anatomia/atlas";

export const ESTADO_INICIAL: EstadoCena = {
  explode: 0,
  visible: [...VISIVEIS_PADRAO],
  selected: [],
  isolate: false,
  view: "three-quarter",
  rotate: false,
  reset: 0,
};

/** Os presets do painel de sistemas. Os três são do original, com os mesmos conjuntos. */
export const PRESET_ESQUELETO: readonly SistemaId[] = ["skeletal"];
export const PRESET_ORGAOS: readonly SistemaId[] = [
  "cardiac", "respiratory", "digestive", "urinary", "endocrine", "reproductive",
];

/**
 * A ÚNICA definição de "esta peça aparece": isolando, só o que está selecionado; fora disso, o que
 * pertence a um sistema ligado OU está selecionado (seleção vence sistema desligado, de propósito —
 * é o que permite buscar uma estrutura e vê-la sem ligar o sistema dela à mão).
 */
export function pecaVisivel(estado: EstadoCena, parte: Parte): boolean {
  const selecionada = estado.selected.includes(parte.id);
  return estado.isolate ? selecionada : estado.visible.includes(parte.system) || selecionada;
}

/** Quantas peças estão na tela agora. O painel publica este número. */
export const contarVisiveis = (partes: readonly Parte[], estado: EstadoCena): number =>
  partes.reduce((n, p) => n + (pecaVisivel(estado, p) ? 1 : 0), 0);

// ─────────────────────────── transições ───────────────────────────

/** Liga/desliga um sistema. Limpa seleção e isolamento: ver razão 2 do cabeçalho. */
export const alternarSistema = (e: EstadoCena, id: SistemaId): EstadoCena => ({
  ...e,
  selected: [],
  isolate: false,
  visible: e.visible.includes(id) ? e.visible.filter((x) => x !== id) : [...e.visible, id],
});

/** Clique no NOME do sistema: só ele. É o atalho que o original chama de "show only". */
export const soSistema = (e: EstadoCena, id: SistemaId): EstadoCena => ({
  ...e, visible: [id], isolate: false, selected: [],
});

export const definirSistemas = (e: EstadoCena, ids: readonly SistemaId[]): EstadoCena => ({
  ...e, visible: [...ids], isolate: false, selected: [],
});

export const esconderTodos = (e: EstadoCena): EstadoCena => ({ ...e, visible: [], selected: [], isolate: false });

/**
 * Reinicia tudo e INCREMENTA `reset`: é esse contador que faz a cena reenquadrar a câmera.
 *
 * TERCEIRA DIFERENÇA DELIBERADA em relação ao original, e ela é correção de defeito: lá o reinício
 * devolve `{...initial, visible: DEFAULT_VISIBLE}`, que compartilha o MESMO array da constante do
 * módulo. Qualquer `push` num estado reiniciado contaminaria `DEFAULT_VISIBLE` para o resto da vida
 * do processo — e no nosso caso o processo é o SERVIDOR, não uma aba de navegador. Foi o teste
 * "reiniciar não compartilha o array" que me mostrou isto no meu próprio porte. Aqui vai cópia.
 */
export const reiniciar = (e: EstadoCena): EstadoCena => ({
  ...ESTADO_INICIAL,
  visible: [...ESTADO_INICIAL.visible],
  selected: [],
  reset: e.reset + 1,
});

/** Escolher um CONCEITO seleciona todas as peças dele (um conceito pode agrupar várias). */
export const escolherConceito = (e: EstadoCena, c: Conceito): EstadoCena => ({
  ...e, selected: [...c.elements], isolate: false, rotate: false,
});

export const escolherPeca = (e: EstadoCena, id: string): EstadoCena => ({
  ...e, selected: [id], isolate: false, rotate: false,
});

/** Isolar sempre volta a explosão a zero: as duas juntas não se leem. */
export const alternarIsolar = (e: EstadoCena): EstadoCena => ({ ...e, isolate: !e.isolate, explode: 0 });

export const limparSelecao = (e: EstadoCena): EstadoCena => ({ ...e, selected: [], isolate: false });

/** Explosão em 0–1. Acima de 0,8 o original vira a vista de frente e para a rotação. */
export const definirExplosao = (e: EstadoCena, v: number): EstadoCena => {
  const explode = Math.max(0, Math.min(1, v));
  return { ...e, explode, view: explode > 0.8 ? "front" : e.view, rotate: false };
};

export const definirVista = (e: EstadoCena, view: Vista): EstadoCena => ({
  ...e, view, reset: e.reset + 1, rotate: false,
});

export const alternarRotacao = (e: EstadoCena): EstadoCena => ({ ...e, rotate: !e.rotate });

// ─────────────────────── o que a UI pergunta ───────────────────────

/** Um preset está "pressionado"? Mesma pergunta que o `aria-pressed` do original faz. */
export const presetAtivo = (e: EstadoCena, preset: readonly SistemaId[]): boolean =>
  e.visible.length === preset.length && preset.every((id) => e.visible.includes(id));

/** A legenda sob a cena. Quatro estados, os do original. */
export function legenda(e: EstadoCena, nomeSelecionado?: string | null): string {
  if (e.isolate) return (nomeSelecionado || "ESTRUTURA SELECIONADA").toUpperCase();
  if (e.explode > 0.95) return "INVENTÁRIO ANATÔMICO";
  if (e.explode > 0.05) return "ESTRUTURAS SEPARADAS";
  return "ADULTO HUMANO · MASCULINO";
}

/** A dica do rodapé muda quando o botão esquerdo deixa de orbitar e passa a arrastar. */
export const dicaDeArraste = (e: EstadoCena): string =>
  e.explode > 0.8 ? "Arraste para deslocar" : "Arraste para girar";
