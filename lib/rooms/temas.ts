/**
 * lib/rooms/temas.ts — FONTE ÚNICA dos TEMAS (salas de estudo por área).
 *
 * Antes isto estava copiado em 4 arquivos (StudyRoomContent, workstation/page, workstation/[id]/page e
 * a comunidade do lounge), cada um casando o curso de um jeito (exato, sem acento de caixa, com trim) e com
 * um fallback diferente (null × "lounge"). Aqui há UM jeito: sem diferença de maiúscula/espaço, e quem
 * chama decide o fallback.
 *
 * É também o ponto de encaixe do onboarding por tema: tudo que for específico de um tema (nome, cor, trilha
 * de cursos, passos de boas-vindas) se pendura em `TemaId` — ver lib/onboarding/porTema.ts.
 */

export const TEMAS_ID = ["cyber", "med", "bio", "quantic", "humanities", "lounge"] as const;
export type TemaId = (typeof TEMAS_ID)[number];

/** Temas que têm curso mapeado (o "lounge" é o que sobra: quem não cai em nenhuma área). */
export type TemaDeArea = Exclude<TemaId, "lounge">;

export const CURSOS_POR_TEMA: Record<TemaDeArea, readonly string[]> = {
  cyber: [
    "Ciência da Computação",
    "Engenharia de Software",
    "Sistemas de Informação",
    "Análise e Desenvolvimento de Sistemas",
    "Engenharia da Computação",
    "Redes de Computadores",
    "Segurança da Informação / Cibersegurança",
    "Banco de Dados",
    "Inteligência Artificial",
    "Ciência de Dados",
    "Computação em Nuvem",
    "Internet das Coisas",
    "Robótica",
    "Jogos Digitais",
    "Design Digital / UX / UI",
    "Computer Science",
    "Software Engineering",
  ],
  med: [
    "Medicina",
    "Enfermagem",
    "Odontologia",
    "Farmácia",
    "Fisioterapia",
    "Nutrição",
    "Psicologia",
    "Fonoaudiologia",
    "Terapia Ocupacional",
    "Biomedicina",
    "Educação Física",
  ],
  bio: [
    "Ciências Biológicas",
    "Biologia",
    "Biotecnologia",
    "Bioquímica",
    "Bioinformática",
    "Ecologia",
  ],
  quantic: [
    "Matemática",
    "Matemática Aplicada",
    "Estatística",
    "Física",
    "Astronomia",
    "Astrofísica",
    "Geofísica",
    "Meteorologia",
  ],
  humanities: [
    "História",
    "Geografia",
    "Filosofia",
    "Sociologia",
    "Antropologia",
    "Ciência Política",
    "Relações Internacionais",
    "Letras",
    "Linguística",
    "Pedagogia",
    "Artes",
    "Música",
    "Teatro",
    "Dança",
    "Cinema e Audiovisual",
    "Arquivologia",
    "Biblioteconomia",
    "Museologia",
    "Serviço Social",
    "Comunicação Social",
    "Jornalismo",
    "Publicidade e Propaganda",
    "Editoração",
    "Produção Cultural",
    "Direito",
    "Teologia",
  ],
};

export type VisualTema = {
  nome: string;
  /** texto */
  cor: string;
  /** fundo suave do card */
  bg: string;
  borda: string;
  /** barra indicadora */
  acento: string;
  gradiente: string;
  brilho: string;
  rota: string;
};

export const VISUAL_TEMA: Record<TemaId, VisualTema> = {
  cyber:      { nome: "Cyber Room",    cor: "text-cyan-600 dark:text-cyan-400",       bg: "bg-cyan-50 dark:bg-cyan-500/10",       borda: "border-cyan-300 dark:border-cyan-500/30",       acento: "bg-cyan-400/40 dark:bg-cyan-400/30",       gradiente: "from-cyan-500/15 to-blue-500/5",     brilho: "bg-cyan-400/10",    rota: "/study-rooms/cyber" },
  med:        { nome: "MedLab",        cor: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-50 dark:bg-rose-500/10",       borda: "border-rose-300 dark:border-rose-500/30",       acento: "bg-rose-400/40 dark:bg-rose-400/30",       gradiente: "from-rose-500/15 to-pink-500/5",     brilho: "bg-rose-400/10",    rota: "/study-rooms/med" },
  bio:        { nome: "Bio Room",      cor: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", borda: "border-emerald-300 dark:border-emerald-500/30", acento: "bg-emerald-400/40 dark:bg-emerald-400/30", gradiente: "from-emerald-500/15 to-green-500/5", brilho: "bg-emerald-400/10", rota: "/study-rooms/bio" },
  quantic:    { nome: "Quantic Room",  cor: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-50 dark:bg-blue-500/10",       borda: "border-blue-300 dark:border-blue-500/30",       acento: "bg-blue-400/40 dark:bg-blue-400/30",       gradiente: "from-blue-500/15 to-indigo-500/5",   brilho: "bg-blue-400/10",    rota: "/study-rooms/quantic" },
  humanities: { nome: "Grand Archive", cor: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-500/10",     borda: "border-amber-300 dark:border-amber-500/30",     acento: "bg-amber-400/40 dark:bg-amber-400/30",     gradiente: "from-amber-500/15 to-orange-500/5",  brilho: "bg-amber-400/10",   rota: "/study-rooms/humanities" },
  lounge:     { nome: "Lounge",        cor: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-50 dark:bg-violet-500/10",   borda: "border-violet-300 dark:border-violet-500/30",   acento: "bg-violet-400/40 dark:bg-violet-400/30",   gradiente: "from-violet-500/15 to-purple-500/5", brilho: "bg-violet-400/10",  rota: "/study-rooms/lounge" },
};

const norm = (s: string) => s.trim().toLowerCase();

const INDICE: ReadonlyMap<string, TemaDeArea> = new Map(
  (Object.entries(CURSOS_POR_TEMA) as [TemaDeArea, readonly string[]][]).flatMap(([tema, cursos]) =>
    cursos.map((c) => [norm(c), tema] as const),
  ),
);

/** O tema de um curso; `null` se o curso não está em nenhuma área (quem chama decide: lounge, ou nada). */
export function temaDoCurso(curso?: string | null): TemaDeArea | null {
  if (!curso) return null;
  return INDICE.get(norm(curso)) ?? null;
}

/** Igual a `temaDoCurso`, mas quem sobra cai no lounge — o comportamento do StudyRoomContent e da comunidade. */
export function temaOuLounge(curso?: string | null): TemaId {
  return temaDoCurso(curso) ?? "lounge";
}

export function ehTema(id: string): id is TemaId {
  return (TEMAS_ID as readonly string[]).includes(id);
}
