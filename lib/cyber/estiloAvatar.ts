/**
 * Cyberespaço — o ESTILO do corpo do jogador (EXPERIMENTO). "luz" = o ser de luz de sempre (armadura metálica
 * emissiva + aura); "anime" = a MESMA armadura, mas DESENHADA como os nossos avatares (public/avatars): sombra em
 * faixas chapadas (cel shading), contorno de tinta e um brilho de borda — components/cyber/AvatarAnime.
 * Liga com NEXT_PUBLIC_CYBER_AVATAR_ESTILO=anime (todo mundo) ou ?anime=1 / ?anime=0 na URL (só pra quem testa).
 */
export type EstiloAvatar = "luz" | "anime";

export function estiloDe(env: string | undefined, busca: string): EstiloAvatar {
  const q = new URLSearchParams(busca).get("anime");
  if (q === "1") return "anime";
  if (q === "0") return "luz";
  return env === "anime" ? "anime" : "luz";
}

/** as FAIXAS do cel shading (0..255): sombra, meio-tom, luz — 3 degraus chapados, como no desenho */
export const FAIXAS_TOON = [96, 178, 255] as const;
/** o contorno de tinta: espessura como FRAÇÃO da altura do modelo (o GLB pode vir em cm ou em m — o Soldier é em cm)
 *  e cor (azul-noite, não preto puro — igual aos avatares) */
export const TINTA = { fracao: 0.0085, cor: 0x0b1226 } as const;
/** a espessura do traço no espaço da geometria (altura = a maior dimensão da malha, nas unidades dela) */
export const espessuraTinta = (altura: number) => Math.max(0, altura) * TINTA.fracao;
/** a aura do ser de luz no desenho: mais discreta (fica atrás do traço, não lava o contorno) */
export const AURA_NO_DESENHO = 0.3;

/** o corpo PRÓPRIO do founder: um VRM feito no VRoid Studio (projeto em ~/Documents/fundador.vroid), anime, com as
 *  roupas tingidas aqui (o moletom é branco no VRoid → qualquer cor). `?founder=0` mostra o padrão (pra comparar) */
export const CORPO_DO_FUNDADOR = { url: "/avatars/fundador/fundador.vrm", tintas: { Tops: "#1a1b20" } } as const;
export const usaCorpoDoFundador = (fundador: boolean | undefined, busca: string) => !!fundador && new URLSearchParams(busca).get("founder") !== "0";

/** os ACESSÓRIOS feitos em código (presos aos ossos do VRM — components/cyber/AcessoriosVrm): o VRoid não tem esses */
export type AcessorioVrm = "foneNoPescoco" | "presilhaLapis" | "oculosRedondos" | "presilhaEstrela" | "oculosRetangulares" | "golaCircuito"
  | "gravataCarmesim" | "distintivoPrata" | "mechaCarmesim"
  | "presilhaRelogio" | "golaAlta"
  | "monoculo" | "pingenteTriangulo" | "linhasCiano" | "gravataAzul" | "canetaPrata" | "cruzEnfermagem" | "estetoscopio"
  | "oculosRetPrata" | "oculosProtecao" | "frascoVerde" | "capacete" | "coleteRefletivo"
  | "golaFrenteUnica" | "cintoCorda" | "pulseiraContas" | "brincos";
export type CorpoVrm = {
  url: string; tintas: Readonly<Record<string, string>>; acessorios?: readonly AcessorioVrm[];
  /** a pose parada (lib/cyber/posesVrm) */ pose?: "feminina" | "masculina";
  /** gravidade na física do cabelo (o VRoid exporta sem — mecha longa fica espetada) */ gravidadeCabelo?: number;
  /** peças sem os triângulos de certos ossos (ex.: o body do VRoid que cobre as mãos como luva) */ recortes?: readonly { peca: string; maos?: boolean; pescoco?: boolean; pernas?: boolean }[];
  /** troca a cor só das partes coloridas da textura de uma peça (o branco fica) */ recolorir?: readonly { peca: string; cor: string }[];
  /** nasce com as ASAS negras no lugar da mochila (como o founder) */ asas?: boolean;
};
/** os corpos VRM dos PERSONAGENS (os agentes que vivem na cidadela Zaeon), feitos no VRoid Studio (~/Documents/<id>.vroid)
 *  a partir do card (public/avatars/<id>): a roupa branca do VRoid é tingida aqui */
/** personagens que SAÍRAM do mapa do cyberespaço (pedido do dono, out/2026): o corpo continua aqui (pros crachás/
 *  escritório), mas a pré-carga do cyberespaço não baixa e o engine não põe no mundo */
export const CORPOS_FORA_DO_MAPA: ReadonlySet<string> = new Set(["core_active", "caio", "farmacia", "quimica", "eng-civil",
  // reforma da capela (out/2026): no mapa só a Examiner (e o Scholar, DJ); a Zaeon é o holograma (retrato 2D)
  // (a NINA e o TÉO voltaram: trabalham no mirante da torre de TI do Templo Cósmico)
  "aura", "zenita", "zaeon", "enfermagem", "medicina"]);
export const CORPOS_VRM: Readonly<Record<string, CorpoVrm>> = {
  nina: { url: "/avatars/nina/nina.vrm", tintas: { Tops: "#f6b9d1" }, acessorios: ["foneNoPescoco", "presilhaLapis"], pose: "feminina" },
  teo: { url: "/avatars/teo/teo.vrm", tintas: { Tops: "#3b3f46", Bottoms: "#4d72b8" }, acessorios: ["oculosRetangulares", "golaCircuito"], pose: "masculina" },
  aura: { url: "/avatars/aura/aura.vrm", tintas: { Tops: "#b9a0f2", Bottoms: "#38407a" }, acessorios: ["oculosRedondos", "presilhaEstrela"], pose: "feminina" },
  // o blazer do VRoid é azul-marinho (textura) e a camisa é outra peça de "Tops" (a 007_02, fica branca): só o blazer
  // (007_01) escurece até o preto
  // o terninho é o molde "Suit" (branco) e o body de gola alta é a peça "Onepiece" — tudo tingido aqui
  zenita: { url: "/avatars/zenita/zenita.vrm", tintas: { Tops: "#bba386", Bottoms: "#b59e82", Onepiece: "#ece2cc", Shoes: "#6b4529" }, acessorios: ["presilhaRelogio", "golaAlta"], pose: "feminina",
    gravidadeCabelo: 0.5, recortes: [{ peca: "Onepiece", maos: true, pernas: true }] },
  // ── os assistentes e mentores da leva de 8/out (VRoid: moldes brancos, tingidos aqui; "Onepiece" = o body por baixo) ──
  core_active: { url: "/avatars/core_active/core_active.vrm", tintas: { Tops: "#6f7d4c", Onepiece: "#f4f4f2", Bottoms: "#41608f", Shoes: "#f2f2f2" },
    acessorios: ["distintivoPrata"], pose: "masculina", recortes: [{ peca: "Onepiece", maos: true, pescoco: true, pernas: true }] },
  scholar: { url: "/avatars/scholar/scholar.vrm", tintas: { Tops: "#4b5361", Onepiece: "#a3a9b2", Bottoms: "#4b5361", Shoes: "#1d1e22" },
    acessorios: ["monoculo"], pose: "masculina", recortes: [{ peca: "Onepiece", maos: true, pernas: true }] },
  zaeon: { url: "/avatars/zaeon/zaeon.vrm", tintas: { Tops: "#b9c6d3", Bottoms: "#b3c0cd", Shoes: "#c3ced9" }, acessorios: ["pingenteTriangulo", "linhasCiano"], pose: "feminina", gravidadeCabelo: 0.4 },
  caio: { url: "/avatars/caio/caio.vrm", tintas: { Bottoms: "#4a4e57", Shoes: "#5b3a24" }, recolorir: [{ peca: "Tops", cor: "#25335e" }],
    acessorios: ["gravataAzul", "canetaPrata"], pose: "masculina" },
  enfermagem: { url: "/avatars/enfermagem/enfermagem.vrm", tintas: { Tops: "#26386a", Bottoms: "#26386a", Shoes: "#f2f2f2" }, acessorios: ["cruzEnfermagem"], pose: "feminina" },
  medicina: { url: "/avatars/medicina/medicina.vrm", tintas: { Tops: "#e9edf1", Onepiece: "#a8c6ea", Bottoms: "#27324d", Shoes: "#1d1e22" },
    acessorios: ["estetoscopio"], pose: "masculina", recortes: [{ peca: "Onepiece", maos: true, pernas: true }] },
  farmacia: { url: "/avatars/farmacia/farmacia.vrm", tintas: { Tops: "#e9edf1", Onepiece: "#d8c9ab", Bottoms: "#b49c74", Shoes: "#f2f2f2" },
    acessorios: ["oculosRetPrata", "distintivoPrata"], pose: "masculina", recortes: [{ peca: "Onepiece", maos: true, pescoco: true, pernas: true }] },
  quimica: { url: "/avatars/quimica/quimica.vrm", tintas: { Tops: "#e9edf1", Onepiece: "#1e1f24", Bottoms: "#23242a", Shoes: "#1d1e22" },
    acessorios: ["oculosProtecao", "frascoVerde"], pose: "masculina", recortes: [{ peca: "Onepiece", maos: true, pescoco: true, pernas: true }] },
  "eng-civil": { url: "/avatars/eng-civil/eng-civil.vrm", tintas: { Tops: "#8e9198", Bottoms: "#3f5f93", Shoes: "#b58a52" }, acessorios: ["capacete", "coleteRefletivo"], pose: "masculina" },
  examiner: { url: "/avatars/examiner/examiner.vrm", tintas: { "007_01_Tops": "#3a3836", Bottoms: "#26262c", Shoes: "#1b1b22" }, acessorios: ["gravataCarmesim", "distintivoPrata", "mechaCarmesim"], pose: "feminina" },
};

/** os corpos PRÓPRIOS de JOGADORES (feitos sob medida no VRoid a partir de fotos, com a pessoa de acordo): o servidor
 *  diz qual é o de cada conta (lib/lounge3d/corposDeUsuario) e o cliente só pinta */
export const CORPOS_DE_JOGADOR: Readonly<Record<string, CorpoVrm>> = {
  // Giulia: regata preta (vira frente única com a gola em código), pantalona branca de cintura alta com cinto de corda,
  // sapato nude, pulseira de contas e brincos; cabelo castanho-escuro repartido de lado, batom vermelho e sardas (VRoid)
  giulia: { url: "/avatars/jogadores/giulia.vrm", tintas: { Bottoms: "#f4f2ec", Shoes: "#d8b28c" },
    acessorios: ["golaFrenteUnica", "cintoCorda", "pulseiraContas", "brincos"], gravidadeCabelo: 0.35, pose: "feminina" },   // (sem asas: as asas são só do fundador)
};
/** o corpo próprio de quem está no cyberespaço: o do FOUNDER (com as asas) ou o de jogador que o servidor mandou (com
 *  asas se o corpo tiver `asas`) */
/** Que traje a pessoa veste. Três casos, e nenhum deles é "nada". */
export type DecisaoDeTraje =
  /** a armadura PRETA — só o fundador (pedido do dono, out/2026) */
  | "preta"
  /** traje nenhum: ela tem corpo próprio (VRM), e a skin manda (pedido do dono, nov/2026) */
  | "nenhum"
  /** o traje de astronauta na cor dela — o PERSONAGEM STOCK de quem não tem corpo próprio */
  | "padrao";

/**
 * A regra do traje, em um lugar só.
 *
 * O terceiro caso é uma correção de nov/2026, achada medindo no navegador: o pedido "tirar o traje, fica só a skin"
 * supunha que toda pessoa TEM uma skin. Quem nunca escolheu corpo próprio não tem nenhuma — e sem traje ficava à
 * mostra o GLB de REFERÊNCIA do AvatarLuz, que é o `Soldier.glb` de EXEMPLO do three.js, baixado ao vivo do site
 * deles. Era a primeira coisa que um usuário novo via de si mesmo, enquanto a tela de escolher personagem
 * (components/lounge/PreviaPersonagem) já o mostrava DE TRAJE: a prévia prometia uma coisa e o mundo entregava outra.
 *
 * O pedido continua valendo ao pé da letra, porque "nenhum" é exatamente quem TEM corpo: o traje nunca vai por cima
 * do corpo de ninguém.
 */
export function decidirTraje(o: { fundador: boolean; temCorpoProprio: boolean }): DecisaoDeTraje {
  if (o.fundador) return "preta";
  if (o.temCorpoProprio) return "nenhum";
  return "padrao";
}

export function corpoProprio(p: { fundador?: boolean; corpo?: string } | undefined, busca: string): { corpo: CorpoVrm; asas: boolean } | null {
  if (!p) return null;
  if (usaCorpoDoFundador(p.fundador, busca)) return { corpo: CORPO_DO_FUNDADOR, asas: false };   // (out/2026, o dono: as asas saíram — bugadas; ele voa de MOCHILA como todo mundo)
  const c = p.corpo ? CORPOS_DE_JOGADOR[p.corpo] : undefined;
  return c ? { corpo: c, asas: !!c.asas } : null;
}
