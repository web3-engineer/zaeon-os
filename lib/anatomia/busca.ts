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
  "esqueleto": "skeletal system", "osso": "bone", "ossos": "bone",
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
  // Conferidos no atlas real em 2026-11-10, e entram porque SEM eles caíam na classe crua `nerve`:
  // o atlas tem `nervous system` (60 peças), `optic nerve` (4) e `cranial nerve` (2). Chave de DUAS
  // palavras de propósito — "nervo" sozinho continua sendo a categoria, e categoria não é resposta.
  "sistema nervoso": "nervous system", "nervo optico": "optic nerve",
  "nervo craniano": "cranial nerve", "nervos cranianos": "cranial nerve",
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
  /**
   * OS PARES QUE COLAPSAVAM (testes diferenciais de 2026-11-12, lib/anatomia/diferencial.test.ts).
   * Cada um destes pedidos devolvia a peça ERRADA com cara de acerto, porque só a palavra-raiz
   * estava no mapa e o desempate é pelo nome mais curto:
   *   "intestino delgado"  → large intestine   (via "intestino" → intestine)
   *   "veia cava superior" → inferior vena cava (via "veia" → vein, refinado para o mais curto)
   *   "membro inferior"    → inferior rectus    (um músculo do OLHO)
   * A chave de várias palavras ganha da de uma (a varredura vai do n-grama mais longo ao mais curto).
   */
  "intestino delgado": "small intestine", "intestino grosso": "large intestine",
  "veia cava superior": "superior vena cava", "veia cava inferior": "inferior vena cava",
  "membro inferior": "lower limb", "membro superior": "upper limb",
  "membros inferiores": "lower limb", "membros superiores": "upper limb",
  // câmaras do coração: só existem com lado no atlas (left/right ventricle, left/right atrium) —
  // o lado da frase escolhe (ver `ladoDaFrase`); sem lado, a busca oferece o outro como alternativa
  "ventriculo": "ventricle", "atrio": "atrium",
  "pele": "skin", "gluteo maximo": "gluteus maximus", "gluteo medio": "gluteus medius",
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

/**
 * As CLASSES DE TECIDO — os conceitos-raiz que NUNCA são a resposta a um pedido de peça.
 *
 * Medido no atlas real em 2026-11-10, e é por isso que esta lista existe:
 *
 *     artery ... 562 peças   (um QUARTO do atlas inteiro)
 *     vein ..... 342 peças
 *     nerve ..... 26 peças   (e todas CRANIANAS — não há ciático, tibial nem femoral)
 *     tendon ..... 6 peças
 *
 * O dono descreveu o sintoma exatamente: "se eu peço uma parte abre o atlas completo". Pedir
 * "artéria femoral" caía em `artery` pelo mapa PT→EN e devolvia a árvore arterial do corpo todo.
 * Pior no caso do nervo: "nervo ciático" devolvia os 26 nervos da ÓRBITA, com cara de resposta.
 *
 * SISTEMAS não entram aqui (`respiratory system`, `nervous system`): "me mostra o sistema
 * respiratório" é um pedido legítimo e a resposta certa é o sistema. Classe de tecido é outra
 * coisa — ninguém pede "me mostra uma artéria" querendo todas elas.
 */
/** O teto de palavras da varredura de n-gramas — ver `termoEspecificoNaFrase`. */
export const MAX_PALAVRAS_NA_VARREDURA = 12;

export const CLASSES_GENERICAS: readonly string[] = [
  "nerve", "artery", "vein", "bone", "muscle", "cartilage", "ligament", "tendon",
  "intestine", "skeleton", "bone organ", "muscle organ",
];

/** O nome do conceito é uma classe de tecido crua? Comparação EXATA: "optic nerve" não é. */
export function ehClasseGenerica(nome: string): boolean {
  return CLASSES_GENERICAS.includes(semAcento(nome));
}

/**
 * O termo ESPECÍFICO da frase, ignorando as palavras que são chave do mapa PT→EN.
 *
 * É a diferença entre "artéria femoral" virar `artery` (562 peças) e virar `femoral artery` (2).
 * As chaves do mapa são justamente o que produz o genérico, então elas saem da disputa e sobra o
 * qualificador — que é o que o aluno quis dizer.
 *
 * `raiz` desempata: entre "femoral vein" e "femoral artery", quem pediu ARTÉRIA recebe a artéria.
 * Sem isso o desempate seria alfabético, que não tem nada a ver com o pedido.
 */
export function termoEspecificoNaFrase(atlas: Atlas, frase: string, generico?: string): string | null {
  /**
   * Tira da disputa SÓ as palavras que produziram o genérico — não toda chave do mapa.
   * Medido: filtrar todas quebrava "osso do rádio", porque `radio` também é chave (→ radius) e saía
   * junto com `osso`, deixando a frase sem qualificador nenhum. Com o alvo em mãos, `osso` sai (→
   * bone) e `radio` fica (→ radius ≠ bone).
   */
  const ws = palavras(frase)
    // Fora da disputa: as palavras que PRODUZIRAM o genérico (a chave do mapa que levou até ele) e
    // o próprio termo genérico. Sem a segunda guarda, "nerve" voltava como se fosse qualificador e
    // "nervo ciático" era "refinado" para `nerve trunk` — um nervo qualquer, com cara de acerto.
    .filter((w) => w !== generico && (generico ? SINONIMOS_PT[w] !== generico : !(w in SINONIMOS_PT)))
    // Teto de palavras: a varredura é O(n²) em n-gramas vezes 3.432 nomes. Tema de aluno tem meia
    // dúzia de palavras; um tópico gigante só gastaria CPU do servidor sem achar mais nada.
    .slice(0, MAX_PALAVRAS_NA_VARREDURA);
  if (!ws.length) return null;
  const nomes = atlas.concepts.map((c) => semAcento(c.name));
  const maiorNome = nomes.reduce((m, n) => Math.max(m, n.split(" ").length), 1);
  for (let tam = Math.min(ws.length, maiorNome); tam >= 1; tam--) {
    for (let i = 0; i + tam <= ws.length; i++) {
      const alvo = ws.slice(i, i + tam).join(" ");
      if (ehPalavraDeEstrutura(nomes, alvo)) return alvo;
      /**
       * O qualificador também pode ser CHAVE DO MAPA, e então o atlas só o conhece traduzido:
       * "osso do rádio" tem `radio` → `radius`, que é o nome real. Sem este degrau o rádio era
       * descartado junto com o `osso` e a frase ficava sem qualificador nenhum.
       */
      const traduzido = SINONIMOS_PT[alvo];
      if (traduzido && traduzido !== generico && ehPalavraDeEstrutura(nomes, semAcento(traduzido))) {
        return semAcento(traduzido);
      }
    }
  }
  return null;
}

/**
 * Os conceitos REAIS sob uma classe, do nome mais curto ao mais longo — o mais genérico primeiro.
 * É o que a recusa oferece no lugar: "o atlas não tem o que você pediu, mas tem ESTES". Nomes
 * tirados do dado, nunca inventados.
 */
export function alternativasDaClasse(atlas: Atlas, raiz: string, limite = 8): AchadoAnatomia[] {
  const r = semAcento(raiz);
  const re = new RegExp(`(^|[^a-z0-9])${r}($|[^a-z0-9])`);
  return atlas.concepts
    .filter((c) => { const n = semAcento(c.name); return n !== r && re.test(n); })
    .sort((a, b) => a.name.length - b.name.length || a.name.localeCompare(b.name))
    .slice(0, Math.max(0, limite))
    .map((c) => ({ id: c.id, nome: c.name, pecas: c.elements.length }));
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
  /**
   * A CLASSE que foi recusada, quando a busca caiu numa categoria de tecido e não houve como
   * refiná-la. Vem junto do resultado VAZIO de propósito: quem chamou precisa distinguir "o atlas
   * não tem isso" de "você pediu a categoria inteira", porque a segunda tem conserto (pedir pelo
   * nome) e a primeira não.
   */
  classeRecusada?: string;
};

/**
 * Os dois conceitos compartilham ALGUM sistema anatômico?
 *
 * É o que separa um refinamento bom de um absurdo, e sai do DADO, não de uma lista escrita à mão:
 * `femur` é `skeletal` e a classe `bone organ` também, então o fêmur serve de osso. Já `face` é
 * skeletal+sensory+muscular+respiratory+digestive e NUNCA `nervous`, então ela não serve de nervo —
 * e sem esta checagem "nervo da face" devolvia a face inteira, 80 peças.
 */
function mesmoSistema(atlas: Atlas, idA: string, idB: string): boolean {
  const sis = (id: string) => {
    const c = atlas.concepts.find((x) => x.id === id);
    if (!c) return new Set<string>();
    const porId = new Map(atlas.parts.map((p) => [p.id, p]));
    return new Set(c.elements.map((e) => porId.get(e)?.system).filter(Boolean) as string[]);
  };
  const a = sis(idA);
  if (!a.size) return false;
  for (const s of sis(idB)) if (a.has(s)) return true;
  return false;
}

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

/**
 * O LADO que a frase pede: "pulmão direito", "o rim do lado esquerdo", "right lung".
 *
 * ────────────── o defeito que isto fecha ──────────────
 * Medido em 2026-11-12 com pedidos naturais: "pulmão direito" abria o pulmão ESQUERDO. E "mão
 * direita", "olho direito", "braço direito", "joelho direito" — todos abriam o esquerdo. O mapa
 * PT→EN leva "pulmão" a `lung`, o atlas não tem `lung` sozinho (tem `left lung` e `right lung`), e o
 * desempate pelo nome mais curto dá sempre `left`, que tem uma letra a menos. A palavra "direito"
 * era simplesmente ignorada: a peça errada, isolada e bonita, com cara de resposta.
 *
 * Os dois lados na mesma frase ("pulmão direito e esquerdo") não escolhem nenhum.
 */
export type Lado = "left" | "right";
export function ladoDaFrase(frase: string): Lado | null {
  const ws = palavras(frase);
  const direito = ws.some((w) => w === "direito" || w === "direita" || w === "right");
  const esquerdo = ws.some((w) => w === "esquerdo" || w === "esquerda" || w === "left");
  return direito === esquerdo ? null : direito ? "right" : "left";
}

const SEM_LADO = /^(left|right) /;

/**
 * Põe na frente o conceito DO LADO PEDIDO. A base é o nome do primeiro achado sem o lado: se o
 * atlas tem exatamente `<lado> <base>`, é ele (vale também quando o primeiro achado é o par —
 * `kidney` tem 2 peças, e quem pediu o rim direito quer `right kidney`, 1 peça). Sem conceito do
 * lado pedido a ordem fica como estava: devolver o lado errado seria pior que devolver o par.
 */
function comLado(atlas: Atlas, r: ResultadoBusca, lado: Lado | null, limite: number): ResultadoBusca {
  const primeiro = r.achados[0];
  if (!lado || !primeiro) return r;
  const alvo = `${lado} ${semAcento(primeiro.nome).replace(SEM_LADO, "")}`;
  if (semAcento(primeiro.nome) === alvo) return r;
  const c = atlas.concepts.find((x) => semAcento(x.name) === alvo);
  if (!c) return r;
  const doLado: AchadoAnatomia = { id: c.id, nome: c.name, pecas: c.elements.length };
  return { ...r, achados: [doLado, ...r.achados.filter((a) => a.id !== c.id)].slice(0, Math.max(1, limite)) };
}

export function buscarConceitos(atlas: Atlas, consulta: string, limite = MAX_RESULTADOS): ResultadoBusca {
  return comLado(atlas, buscarSemLado(atlas, consulta, limite), ladoDaFrase(consulta), limite);
}

function buscarSemLado(atlas: Atlas, consulta: string, limite: number): ResultadoBusca {
  const { termo, viaSinonimo } = termoDeBusca(consulta);
  if (!termo) return { achados: [], termo, viaSinonimo, total: 0 };

  const r = buscaCrua(atlas, termo, limite);

  /**
   * ACHOU, MAS ACHOU A CATEGORIA INTEIRA. O mapa PT→EN leva "artéria femoral" a `artery`, que são
   * 562 peças — a árvore arterial do corpo todo. Antes de entregar isso, perguntamos ao atlas qual
   * é o termo ESPECÍFICO da frase, ignorando as palavras que são chave do mapa (são elas que
   * produziram o genérico). Entre os achados, prefere-se o que contém a classe pedida: quem pede
   * ARTÉRIA femoral recebe `femoral artery`, não `femoral vein`.
   *
   * Vale para a BUSCA e não só para o artefato porque a ferramenta do agente também passa por aqui
   * — era ela que respondia "bone organ (203 peças)" a quem perguntou do fêmur.
   */
  if (r.total > 0 && r.achados[0] && ehClasseGenerica(r.achados[0].nome)) {
    const classe = r.achados[0];
    const especifico = termoEspecificoNaFrase(atlas, semAcento(consulta), termo);
    if (especifico) {
      // Limite PRÓPRIO e generoso: escolher o melhor DEPOIS de cortar pelo limite do chamador faria
      // uma busca com `limite: 1` devolver a veia femoral a quem pediu a artéria.
      const refinado = buscaCrua(atlas, especifico, MAX_RESULTADOS);
      const melhor = refinado.achados.find((a) => !ehClasseGenerica(a.nome) && mesmoSistema(atlas, a.id, classe.id));
      if (melhor) {
        const resto = refinado.achados.filter((a) => a.id !== melhor.id);
        return { achados: [melhor, ...resto].slice(0, Math.max(0, limite)), termo: especifico, viaSinonimo, total: refinado.total };
      }
    }
    /**
     * Não houve como acertar. Devolver a CATEGORIA seria o defeito que esta mudança persegue: a
     * ferramenta do agente entregaria `nerve` (26 peças, todas da órbita) a quem perguntou do nervo
     * ciático, e o agente descreveria aquilo como se fosse a resposta — foi exatamente assim que a
     * resposta errada de 2026-11-10 nasceu. Vazio com a classe anotada é honesto e tem conserto.
     */
    return { achados: [], termo, viaSinonimo, total: 0, classeRecusada: termo };
  }

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
