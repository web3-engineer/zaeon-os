/**
 * lib/anatomia/busca.ts — a BUSCA e a INSPEÇÃO do Atlas. PURA: sem rede, sem DOM, sem three.
 *
 * É o miolo das duas ferramentas de agente do human-atlas (`find_anatomy` e
 * `inspect_anatomical_structure`, originalmente em `app/agent-tools.ts`, MIT — ver
 * lib/anatomia/atlas.ts para a procedência completa e as DUAS licenças em jogo).
 *
 * ────────────── DUAS DIFERENÇAS DELIBERADAS em relação ao original ──────────────
 *
 * 1 · ORDENAÇÃO. O original devolve os 30 primeiros na ordem do arquivo: buscar "heart" podia
 *     entregar compostos obscuros ANTES do próprio coração. Para um olho humano varrendo uma lista
 *     isso é tolerável; para um MODELO que vai citar o primeiro resultado, é erro servido pronto.
 *     Aqui o casamento EXATO vem primeiro, depois o que começa com o termo, depois o resto —
 *     desempatando por nome mais curto, que na prática é o conceito mais genérico ("heart" antes de
 *     "heart of embryo"). O conjunto de resultados é o mesmo; só a ordem muda.
 *
 * 2 · SINÔNIMOS PT-BR. Os 3.432 nomes do dado estão em INGLÊS (nomes FMA). Um aluno brasileiro que
 *     digita "fígado" não acha nada — e "não achou" é indistinguível de "não existe", que é o pior
 *     tipo de resposta. Então existe um mapa PT→EN, PEQUENO e declaradamente PARCIAL, e ele não
 *     inventa dado nenhum: cada entrada é um termo que eu já traduzi em atlas.ts (os 15 sistemas e
 *     os 9 órgãos com explicação própria) e que o teste CONFERE existir no atlas. Fora dessas
 *     entradas, a busca é em inglês e isso é dito, não escondido.
 */
import type { Atlas, Conceito } from "@/lib/anatomia/atlas";
import { SISTEMAS } from "@/lib/anatomia/atlas";

/** O teto do original: 30. Mantido — é o que cabe num turno sem afogar o modelo. */
export const MAX_RESULTADOS = 30;

const semAcento = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * PT → EN, construído a partir do que já foi traduzido em atlas.ts. Nada aqui é terminologia nova:
 * são os nomes dos 15 sistemas e os 9 órgãos que têm explicação própria. `lib/anatomia/busca.test.ts`
 * afirma que TODO alvo casa com pelo menos um conceito do atlas — um sinônimo que não acha nada é
 * pior que sinônimo nenhum, porque promete e falha.
 */
export const SINONIMOS_PT: Readonly<Record<string, string>> = {
  // os nove órgãos com explicação própria
  "coracao": "heart", "figado": "liver", "cerebro": "brain", "encefalo": "brain",
  "estomago": "stomach", "baco": "spleen", "pancreas": "pancreas",
  "bexiga": "urinary bladder", "traqueia": "trachea", "diafragma": "diaphragm",
  // os quinze sistemas, pelo nome que o aluno usa
  "esqueleto": "skeleton", "osso": "bone", "ossos": "bone",
  "musculo": "muscle", "musculos": "muscle",
  "arteria": "artery", "arterias": "artery",
  "veia": "vein", "veias": "vein",
  "nervo": "nerve", "nervos": "nerve",
  "pulmao": "lung", "pulmoes": "lung",
  "rim": "kidney", "rins": "kidney",
  "intestino": "intestine", "cartilagem": "cartilage",
  "ligamento": "ligament", "timo": "thymus",
  // conferidos no atlas real em 2026-11-09: "respiratory system" tem 3 conceitos e "bronchus" tem 5.
  // "alveolo" e "bronquiolo" NÃO entram: o atlas tem ZERO de cada um, e sinônimo que não acha nada
  // promete e falha — a recusa honesta ("referência parcial") serve melhor ao aluno.
  "sistema respiratorio": "respiratory system", "respiratorio": "respiratory system",
  "bronquio": "bronchus", "bronquios": "bronchus",
  // "linfonodo" NÃO está aqui: o portão de busca.test.ts provou que o atlas não tem NENHUM
  // conceito de linfonodo — o sistema linfático desta referência é só baço e timo. Prometer o
  // termo faria a busca responder "não achei", que o aluno leria como "não existe no corpo".
};

/** As palavras da consulta, sem acento e sem pontuação. */
const palavras = (s: string) => semAcento(s).split(/[^a-z0-9]+/).filter(Boolean);

/** A maior chave de `SINONIMOS_PT`, em palavras — o teto da varredura de n-gramas. */
const MAIOR_SINONIMO = Math.max(...Object.keys(SINONIMOS_PT).map((k) => k.split(" ").length));

/**
 * O termo que vai de fato para a busca: o sinônimo quando houver, senão o que foi digitado.
 *
 * O MAPA É DE CHAVE EXATA, e isso quebrava na prática: medido em produção em 2026-11-09, "pulmão"
 * achava os 7 conceitos de `lung`, mas "o pulmão" achava ZERO — e "como funciona um pulmão", que é
 * como o aluno escreve, também. A ferramenta devolvia `sem_resultado`, a mentora caía em prosa
 * genérica, e o atlas (124 malhas no pulmão esquerdo, 156 no direito) ficava intocado.
 *
 * Então, antes de desistir, varremos os N-GRAMAS da consulta — do mais longo para o mais curto, e
 * da esquerda para a direita — e o primeiro que for sinônimo ganha. Sem lista de palavras de parada:
 * o que não é sinônimo simplesmente não casa, e isso é mais robusto que adivinhar quais palavras
 * são "vazias" em português. Em consulta com dois órgãos, o mais à esquerda ganha.
 *
 * Deliberado: consertar AQUI e não na persona. Instruir o modelo a "passar só o termo" acerta na
 * maioria das vezes e falha quando o aluno escreve de um jeito novo; normalizar é determinístico.
 */
export function termoDeBusca(consulta: string): { termo: string; viaSinonimo: boolean } {
  const q = semAcento(consulta);
  const direto = SINONIMOS_PT[q];
  if (direto) return { termo: direto, viaSinonimo: true };

  const ws = palavras(q);
  for (let tam = Math.min(ws.length, MAIOR_SINONIMO); tam >= 1; tam--) {
    for (let i = 0; i + tam <= ws.length; i++) {
      const alvo = SINONIMOS_PT[ws.slice(i, i + tam).join(" ")];
      if (alvo) return { termo: alvo, viaSinonimo: true };
    }
  }
  return { termo: q, viaSinonimo: false };
}

export type AchadoAnatomia = {
  id: string;
  nome: string;
  /** quantas PEÇAS (malhas) o conceito agrupa — 1 é uma malha só; mais de 1 é um agrupamento */
  pecas: number;
};

export type ResultadoBusca = {
  achados: AchadoAnatomia[];
  /** o termo efetivamente procurado (pode ter vindo do mapa PT→EN) */
  termo: string;
  viaSinonimo: boolean;
  /** quantos conceitos casaram ANTES do corte em MAX_RESULTADOS — para dizer "há mais" sem mentir */
  total: number;
};

function posto(nome: string, termo: string): number {
  const n = semAcento(nome);
  if (n === termo) return 0;              // exato
  if (n.startsWith(termo)) return 1;      // começa com
  return 2;                               // contém em algum lugar
}

/**
 * `find_anatomy`: conceitos cujo NOME ou ID casa com a consulta. Consulta vazia devolve vazio — e
 * devolver vazio é melhor que devolver os 30 primeiros do arquivo, que é o que uma busca sem
 * filtro faria parecer resultado.
 */
export function buscarConceitos(atlas: Atlas, consulta: string, limite = MAX_RESULTADOS): ResultadoBusca {
  const { termo, viaSinonimo } = termoDeBusca(consulta);
  if (!termo) return { achados: [], termo, viaSinonimo, total: 0 };

  const casaram = atlas.concepts.filter(
    (c) => semAcento(c.name).includes(termo) || c.id.toLowerCase().includes(termo),
  );
  const ordenados = [...casaram].sort((a, b) => {
    const pa = posto(a.name, termo), pb = posto(b.name, termo);
    if (pa !== pb) return pa - pb;
    if (a.name.length !== b.name.length) return a.name.length - b.name.length;
    return a.name.localeCompare(b.name);
  });
  return {
    achados: ordenados.slice(0, Math.max(0, limite)).map((c) => ({ id: c.id, nome: c.name, pecas: c.elements.length })),
    termo,
    viaSinonimo,
    total: casaram.length,
  };
}

/** `inspect_anatomical_structure`: o conceito por id exato, ou `null`. Nunca o "mais parecido". */
export function acharConceito(atlas: Atlas, id: unknown): Conceito | null {
  if (typeof id !== "string" || !id.trim()) return null;
  const alvo = id.trim();
  return atlas.concepts.find((c) => c.id === alvo) ?? null;
}

/** As PEÇAS de um conceito, com o sistema de cada uma — o que o visualizador precisa pra pintar. */
export function pecasDoConceito(atlas: Atlas, conceito: Conceito) {
  const porId = new Map(atlas.parts.map((p) => [p.id, p]));
  return conceito.elements.map((e) => porId.get(e)).filter((p): p is NonNullable<typeof p> => !!p);
}

/** Os sistemas que um conceito atravessa (um conceito pode cruzar mais de um). */
export function sistemasDoConceito(atlas: Atlas, conceito: Conceito): string[] {
  const ids = new Set(pecasDoConceito(atlas, conceito).map((p) => p.system));
  return SISTEMAS.filter((s) => ids.has(s.id)).map((s) => s.nome);
}
