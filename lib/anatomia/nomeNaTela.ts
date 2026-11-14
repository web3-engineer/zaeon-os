/**
 * lib/anatomia/nomeNaTela.ts — #764 · o NOME da estrutura no cartão do chat. PURO.
 *
 * O atlas (BodyParts3D) nomeia em inglês: o cartão saía "Anatomia — heart".
 *
 * Desde o #777 o título do artefato viaja com o NOME CANÔNICO do atlas ("heart") — é o que a rota resolve de volta
 * para a mesma peça, e isso fica. Então o português entra só na TELA:
 *   · o termo que chegou é um nome curto em português (não o próprio nome do atlas) → ele ("coração");
 *   · o nome do atlas tem tradução em `NOMES_PT` (os alvos de `SINONIMOS_PT`, com acento) → ela;
 *     com lado ("left lung") → "pulmão (lado esquerdo)";
 *   · senão, o nome do atlas — nome em inglês é melhor que nome inventado.
 */
const semAcento = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Os alvos de SINONIMOS_PT (lib/anatomia/busca), no português de tela. O teste confere que nenhum falta. */
export const NOMES_PT: Readonly<Record<string, string>> = {
  heart: "coração", liver: "fígado", brain: "encéfalo", stomach: "estômago", spleen: "baço",
  pancreas: "pâncreas", "urinary bladder": "bexiga", trachea: "traqueia", diaphragm: "diafragma",
  "skeletal system": "esqueleto", bone: "osso", muscle: "músculo", artery: "artéria", vein: "veia",
  nerve: "nervo", lung: "pulmão", kidney: "rim", intestine: "intestino", cartilage: "cartilagem",
  ligament: "ligamento", thymus: "timo", "respiratory system": "sistema respiratório",
  "nervous system": "sistema nervoso", "optic nerve": "nervo óptico", "cranial nerve": "nervo craniano",
  bronchus: "brônquio", humerus: "úmero", skull: "crânio", rib: "costela", scapula: "escápula",
  patella: "patela", sternum: "esterno", maxilla: "maxila", radius: "rádio", fibula: "fíbula",
  "vertebral column": "coluna vertebral", pelvis: "pelve", "hip bone": "osso do quadril", knee: "joelho",
  shoulder: "ombro", wrist: "punho", hand: "mão", foot: "pé", arm: "braço", leg: "perna", thigh: "coxa",
  head: "cabeça", thorax: "tórax", neck: "pescoço", eyeball: "olho", "external ear": "orelha", nose: "nariz",
  tooth: "dente", esophagus: "esôfago", pharynx: "faringe", larynx: "laringe", duodenum: "duodeno",
  appendix: "apêndice", "small intestine": "intestino delgado", "large intestine": "intestino grosso",
  "superior vena cava": "veia cava superior", "inferior vena cava": "veia cava inferior",
  "lower limb": "membro inferior", "upper limb": "membro superior", ventricle: "ventrículo", atrium: "átrio",
  skin: "pele", "gluteus maximus": "glúteo máximo", "gluteus medius": "glúteo médio", gallbladder: "vesícula biliar",
  urethra: "uretra", testis: "testículo", prostate: "próstata", "adrenal gland": "glândula suprarrenal",
  cerebellum: "cerebelo", peritoneum: "peritônio", tendon: "tendão", "spinal cord": "medula espinhal",
  clavicle: "clavícula", mandible: "mandíbula", tongue: "língua",
};

/** "heart" → "coração"; "left lung" → "pulmão (lado esquerdo)"; sem tradução → null */
export function nomeDoAtlasEmPortugues(nomeDoAtlas: string): string | null {
  const n = semAcento(nomeDoAtlas).replace(/\s+/g, " ");
  if (NOMES_PT[n]) return NOMES_PT[n];
  const lado = /^(left|right) (.+)$/.exec(n);
  if (lado && NOMES_PT[lado[2]]) return `${NOMES_PT[lado[2]]} (lado ${lado[1] === "left" ? "esquerdo" : "direito"})`;
  return null;
}

export function nomeDaEstruturaNaTela(termo: string, nomeDoAtlas: string): string {
  const t = String(termo || "").replace(/\s+/g, " ").trim();
  const curto = t.length >= 2 && t.length <= 40 && t.split(" ").length <= 4 && /^[\p{L}\s'-]+$/u.test(t);
  // o termo É o nome do atlas (o título canônico do #777): não é português, então traduz
  const ehONomeDoAtlas = !!nomeDoAtlas && semAcento(t) === semAcento(nomeDoAtlas);
  // termo em inglês que não é o nome exato do atlas ("lung" para "left lung"): também não é português
  const ehIngles = !!nomeDoAtlasEmPortugues(t);
  if (curto && !ehONomeDoAtlas && !ehIngles) return t;
  if (ehIngles && !nomeDoAtlasEmPortugues(nomeDoAtlas)) return nomeDoAtlasEmPortugues(t)!;
  return nomeDoAtlasEmPortugues(nomeDoAtlas) || nomeDoAtlas || t || "estrutura";
}
