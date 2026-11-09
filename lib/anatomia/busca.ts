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

  // ───────────────────── o esqueleto, as regiões e as vísceras ─────────────────────
  // Cada entrada abaixo foi VETADA contra o atlas real em 2026-11-09, pelo resultado ORDENADO da
  // própria `buscarConceitos` — não pelo `includes` cru, que engana: `ear` devolve "heart" como
  // PRIMEIRO achado, porque está dentro de "h-ear-t". Pedir orelha e receber coração é pior que não
  // achar, então "orelha" aponta para "external ear", que é exato e único.
  // Onde o atlas só tem a estrutura LATERALIZADA (não há "knee", há "left knee" e "right knee"), a
  // entrada fica: o aluno que pede o joelho recebe um joelho, e isso é o dado, não um defeito.
  "umero": "humerus", "cranio": "skull", "costela": "rib", "costelas": "rib",
  "escapula": "scapula", "omoplata": "scapula", "patela": "patella", "rotula": "patella",
  "esterno": "sternum", "maxila": "maxilla", "radio": "radius", "perone": "fibula",
  "coluna": "vertebral column", "coluna vertebral": "vertebral column",
  "pelve": "pelvis", "bacia": "pelvis", "quadril": "hip bone",
  "joelho": "knee", "ombro": "shoulder", "punho": "wrist",
  "mao": "hand", "maos": "hand", "pe": "foot", "pes": "foot",
  "braco": "arm", "bracos": "arm", "perna": "leg", "pernas": "leg", "coxa": "thigh",
  "cabeca": "head", "torax": "thorax", "pescoco": "neck",
  "olho": "eyeball", "olhos": "eyeball", "orelha": "external ear",
  "nariz": "nose", "dente": "tooth", "dentes": "tooth",
  "esofago": "esophagus", "faringe": "pharynx", "laringe": "larynx",
  "duodeno": "duodenum", "apendice": "appendix",
  "vesicula": "gallbladder", "vesicula biliar": "gallbladder",
  "uretra": "urethra", "testiculo": "testis", "prostata": "prostate",
  "suprarrenal": "adrenal gland", "cerebelo": "cerebellum",
  "peritonio": "peritoneum", "tendao": "tendon", "tendoes": "tendon",
  // "medula espinhal" sim; "medula" sozinha NÃO: em português ela é também a medula óssea, e o
  // atlas tem as duas coisas. Traduzir o termo ambíguo escolheria pelo aluno.
  "medula espinhal": "spinal cord",
  // Estas três CASAVAM sozinhas e casavam ERRADO — medido, não suposto. Sem o mapa, "clavícula"
  // caía em "clavicular part of deltoid" (um músculo), "mandíbula" em "submandibular gland" e
  // "língua" em "sublingual gland", uma glândula salivar. O acerto por subcadeia é pior que o erro
  // franco: a resposta parecia certa. O alvo exato conserta as três.
  "clavicula": "clavicle", "mandibula": "mandible", "lingua": "tongue",
  // "reto" NÃO entra, apesar de "rectum" existir e ser exato: num produto de escola "reto" é na
  // maioria das vezes ângulo reto, e a ferramenta de anatomia é alcançável do chat geral. Quem
  // quer o órgão tem "intestino". O erro que isso evita é ridículo o bastante para custar caro.
  //
  // FORA porque o atlas NÃO TEM — conferido, não suposto: útero, ovário, tireoide, hipófise,
  // cotovelo (elbow), tornozelo (ankle). É uma referência PARCIAL de adulto masculino, e sinônimo
  // que não acha nada promete e falha.
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

/**
 * O piso de letras para uma palavra da frase poder ser candidata. Três, porque a anatomia inglesa
 * TEM termos de três letras ("rib", "arm", "eye", "jaw", "hip", "leg", "ear") e cortá-los perderia
 * estrutura de verdade; abaixo disso só há palavra de função ("o", "me", "um", "da").
 */
const MIN_LETRAS_NA_FRASE = 3;

/**
 * O n-grama aparece como PALAVRA INTEIRA no nome de algum conceito?
 *
 * Casamento mais ESTRITO que o da busca principal, e de propósito. Lá o `includes` é uma vantagem
 * ("lung" acha "left lung"); aqui ele seria um desastre, porque "o" é subcadeia de quase todo nome
 * e "me" está dentro de "omentum". A fronteira de palavra é o que separa "achei o fêmur" de
 * "achei a letra o".
 */
function ehPalavraDeEstrutura(nomes: readonly string[], alvo: string): boolean {
  if (alvo.replace(/ /g, "").length < MIN_LETRAS_NA_FRASE) return false;
  const re = new RegExp(`(^|[^a-z0-9])${alvo}($|[^a-z0-9])`);
  return nomes.some((n) => re.test(n));
}

/**
 * Qual pedaço da FRASE é o nome de uma estrutura, segundo o próprio atlas.
 *
 * ────────────── o furo que isto fecha ──────────────
 * O mapa PT→EN cobre o que foi traduzido à mão, e `termoDeBusca` varre os n-gramas contra ELE. Mas
 * boa parte da anatomia é COGNATA — fêmur/femur, tíbia/tibia, úmero/humerus, tórax/thorax — e esses
 * termos nunca entraram no mapa justamente porque, sozinhos, já funcionam sem tradução: tirado o
 * acento, "fêmur" casa com `femur` no atlas.
 *
 * Medido hoje: "fêmur" acha os 3 conceitos de femur, e "me mostra o fêmur" acha ZERO — porque
 * nenhum n-grama da frase está no mapa, o termo vira a frase inteira, e nome de conceito nenhum
 * contém "me mostra o femur". O conserto do #743 só alcançava quem estava no mapa.
 *
 * Então, quando a busca não acha NADA e o termo não veio do mapa, perguntamos ao atlas qual pedaço
 * da frase ele reconhece — do mais longo para o mais curto, da esquerda para a direita, a mesma
 * ordem da varredura de sinônimos, para as duas se comportarem igual. A autoridade sobre quais
 * nomes existem é o dado, não uma lista de palavras de parada que eu teria de adivinhar e manter.
 */
export function termoNaFrase(atlas: Atlas, frase: string): string | null {
  const ws = palavras(frase);
  // Uma palavra só já foi tentada pela busca e não achou nada. Varrer de novo daria o mesmo.
  if (ws.length < 2) return null;

  const nomes = atlas.concepts.map((c) => semAcento(c.name));
  const maiorNome = nomes.reduce((m, n) => Math.max(m, n.split(" ").length), 1);
  for (let tam = Math.min(ws.length, maiorNome); tam >= 1; tam--) {
    for (let i = 0; i + tam <= ws.length; i++) {
      const alvo = ws.slice(i, i + tam).join(" ");
      if (ehPalavraDeEstrutura(nomes, alvo)) return alvo;
    }
  }
  return null;
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
/** O miolo: casar o termo contra nome e id, ordenar e cortar. Sem saber de onde o termo veio. */
function buscaCrua(atlas: Atlas, termo: string, limite: number): Pick<ResultadoBusca, "achados" | "total"> {
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
    total: casaram.length,
  };
}

export function buscarConceitos(atlas: Atlas, consulta: string, limite = MAX_RESULTADOS): ResultadoBusca {
  const { termo, viaSinonimo } = termoDeBusca(consulta);
  if (!termo) return { achados: [], termo, viaSinonimo, total: 0 };

  const r = buscaCrua(atlas, termo, limite);
  if (r.total > 0) return { ...r, termo, viaSinonimo };

  // Nada. Se o termo veio do MAPA, para aqui: a tradução é conferida por teste (todo alvo casa com
  // algum conceito), então não achar é dado inconsistente, e varrer a frase seria desconfiar de uma
  // tradução vetada. Só quando o termo é o que o aluno digitou perguntamos ao atlas o que ele vê.
  if (viaSinonimo) return { ...r, termo, viaSinonimo };

  const naFrase = termoNaFrase(atlas, termo);
  if (!naFrase || naFrase === termo) return { ...r, termo, viaSinonimo };

  // Repetimos a busca NORMAL com o pedaço achado — não a estrita. O que o aluno recebe por
  // "me mostra o fêmur" passa a ser exatamente o que ele receberia digitando "fêmur", e isso é uma
  // igualdade que o teste afirma, não uma coincidência.
  return { ...buscaCrua(atlas, naFrase, limite), termo: naFrase, viaSinonimo };
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
