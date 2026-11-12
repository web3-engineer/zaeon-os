/**
 * lib/flags/recibo.ts — o que está LIGADO e o que está DESLIGADO neste servidor, por nome. PURO.
 *
 * O dono perguntou "tem update subindo com flag off?" e a resposta exigiu ler o deploy.yml, o
 * compose e o Dockerfile — e mesmo assim sobrou um "não sei" para tudo que só existe no `.env` do
 * VPS. Recurso que nasce atrás de flag desligada e não aparece em recibo nenhum é recurso que
 * ninguém testa em produção.
 *
 * Aqui ficam as chaves de RECURSO de ligar (as que nascem desligadas). As de desligar (kill-switch,
 * que nascem ligadas) já saem em `capacidades` no /api/health. Só nomes e estado: nenhum valor de
 * configuração, nenhum segredo.
 *
 * Entrou flag nova no código? Entra aqui. O teste confere que as do harness estão na lista.
 */
type Env = Record<string, string | undefined>;

const LIGA = new Set(["1", "true", "on"]);
const ligada = (v: string | undefined): boolean => LIGA.has(String(v ?? "").trim().toLowerCase());

/** Recursos que nascem desligados e ligam com 1/true/on. */
export const FLAGS_DE_RECURSO: readonly string[] = [
  // harness e agentes
  "VISAO_HARNESS", "MEMORY_L3", "CACHE_RESPOSTAS", "ORQ_AUTOMATICO", "RACIOCINIO_ELABORADO", "AGENTIC_MODE",
  // chat e documento
  "CHAT_BG", "CHAT_UNICO", "TCC_CROSS", "CARTOLINA_MEMORIA", "CARTOLINA_COWORK", "CADERNO_ENABLED",
  // superfícies de produto
  "MAP_HARNESS", "BLUEPRINT_PRATICO", "REA_BLUEPRINT", "VIDEO_DOC", "ESTUDO_GATEKEEPER", "AURA_ECONOMY",
  "ZAEON_PROATIVA", "TRON_SKIN",
  // Octa
  "OCTA_REA", "OCTA_PENTEST", "REA_SUCCESS_MEMORY",
  // filas (topologia: só fazem sentido com o worker de pé)
  "SCHOLAR_BG", "CEREBRO_BG",
  // interface (o valor que o SERVIDOR enxerga; o do navegador é fixado no build)
  "NEXT_PUBLIC_MOBILE_UI", "NEXT_PUBLIC_PROJETOS", "NEXT_PUBLIC_MENTORES_TAB", "NEXT_PUBLIC_OCTA_CODE",
  "NEXT_PUBLIC_LOUNGE_3D", "NEXT_PUBLIC_VOZ", "NEXT_PUBLIC_ESCRITORIO_COWORK", "NEXT_PUBLIC_AGENTS_ADMIN",
  "NEXT_PUBLIC_AGENT_AVATARS", "NEXT_PUBLIC_UNIFIED_RESEARCH_ROOM", "NEXT_PUBLIC_MAP_HARNESS",
];

export type ReciboDeFlags = {
  ligadas: string[];
  desligadas: string[];
  /** o roteador por embedding tem três estados, não dois */
  roteadorKnn: "off" | "sombra" | "on";
};

export function reciboDeFlags(env: Env = process.env): ReciboDeFlags {
  const ligadas: string[] = [], desligadas: string[] = [];
  for (const f of FLAGS_DE_RECURSO) (ligada(env[f]) ? ligadas : desligadas).push(f);
  const knn = String(env.ROTEADOR_KNN ?? "").trim().toLowerCase();
  return { ligadas, desligadas, roteadorKnn: knn === "on" || knn === "1" ? "on" : knn === "sombra" ? "sombra" : "off" };
}
