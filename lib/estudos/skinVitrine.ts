export const SKINS_VITRINE = ["tecnologia", "dossie", "caderno", "portfolio", "dados", "historia", "geografia", "agronomia"] as const;
export type SkinVitrine = (typeof SKINS_VITRINE)[number];

export const NOME_SKIN: Record<SkinVitrine, string> = {
  tecnologia: "Tecnologia", dossie: "Dossiê", caderno: "Caderno", portfolio: "Portfólio",
  dados: "Dados", historia: "História", geografia: "Geografia", agronomia: "Agronomia",
};

export const skinValida = (valor: unknown): valor is SkinVitrine =>
  typeof valor === "string" && (SKINS_VITRINE as readonly string[]).includes(valor);

type DadosSkin = {
  skin?: unknown; tipo?: string; modelo?: string; kind?: string; titulo?: string | null; nicho?: string; tags?: readonly string[];
};

export function skinDaVitrine(item: DadosSkin): SkinVitrine {
  if (skinValida(item.skin)) return item.skin;
  const tipo = item.tipo ?? item.kind;
  const tema = [item.titulo, item.nicho, ...(item.tags ?? [])].join(" ").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  if (tipo && ["codigo", "agente", "forja", "cad", "device"].includes(tipo)) return "tecnologia";
  if (item.modelo && ["chip", "console", "drone", "engrenagem", "robo", "ondas"].includes(item.modelo)) return "tecnologia";
  if (/\b(agronomia|agricultura|agro|horta|horticultura|safra|cafe|hidroponia|agroecologia)\b/.test(tema)) return "agronomia";
  if (/\b(historia|historico|historica|patrimonio|arqueologia)\b/.test(tema)) return "historia";
  if (/\b(geografia|cartografia|bacias|relevo|hidrografia|geologia)\b/.test(tema)) return "geografia";
  if (tipo && ["pesquisa", "artigo", "anatomia", "molecule", "prancha"].includes(tipo)) return "dossie";
  if ((tipo && ["dados", "diagram", "mindmap", "timeline"].includes(tipo)) || /\b(dataset|dados|observacoes climaticas)\b/.test(tema)) return "dados";
  if (tipo && ["curso", "skill", "aula", "caderno", "guide", "faq", "flashcards"].includes(tipo)) return "caderno";
  return "portfolio";
}
