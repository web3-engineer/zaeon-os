/**
 * Projects — Access Gate (course/area eligibility)
 *
 * Hard rule: the agentic IDE in the "Projetos" room is enabled ONLY for users
 * enrolled in Computing and adjacent areas. Eligibility is keyed off the
 * `User.course` field (Prisma), which is the same canonical list used by the
 * "cyber" study-room track in app/workstation/*.
 *
 * Two enforcement layers (mirrors agentic-modules/biosim3d/accessPolicy.ts):
 *   1. API  → routes call assertEligibleOrThrow() before doing any agent work.
 *   2. UI   → ProjectsContent renders a fallback panel when isEligible is false.
 *
 * Design notes / assumptions:
 *   - `User.course` is a free-text string set during onboarding from a fixed
 *     dropdown, so we normalize (lowercase, strip accents) and match against
 *     both an exact canonical set and a keyword set, to tolerate label drift
 *     ("ADS", "Computer Science", "Eng. de Software", etc.).
 *   - Unknown/empty course → NOT eligible (fail closed). This is a deliberate
 *     least-privilege choice for a feature that writes to GitHub.
 */

import { isSuperAdmin } from "@/lib/auth/roles";

/** Contexto do usuário para o gate (super admin sempre passa). */
export interface AccessContext { email?: string | null; role?: string | null }

// ─── Canonical eligible courses (mirrors the "cyber" track) ────────────────────
export const ELIGIBLE_COURSES: string[] = [
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
  "Jogos Digitais",
  "Computer Science",
  "Software Engineering",
];

// Keyword fallbacks — catch abbreviations and label drift.
const ELIGIBLE_KEYWORDS: string[] = [
  "computacao",          // computação / ciência da computação / eng. da computação
  "computer science",
  "software",            // engenharia de software / software engineering
  "sistemas de informacao",
  "analise e desenvolvimento", // ADS
  "ads",
  "redes de computadores",
  "ciberseguranca",
  "seguranca da informacao",
  "banco de dados",
  "inteligencia artificial",
  "ciencia de dados",
  "data science",
  "computacao em nuvem",
  "internet das coisas",
  "jogos digitais",
];

/** Strip accents + lowercase + collapse whitespace for robust matching. */
export function normalizeCourse(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export interface EligibilityResult {
  eligible: boolean;
  /** Matched canonical course label, when an exact match was found. */
  matched?: string;
  /** Machine reason, useful for telemetry and the UI fallback copy. */
  reason: "exact" | "keyword" | "no-course" | "out-of-scope" | "gate-disabled" | "super-admin";
}

/**
 * Master switch for the course gate.
 *
 * LIGADO por padrão (decisão do Martinez, 2026-06-14): a sala Projetos / Zaeon
 * Code é só para Computação e áreas correlatas — exceto super admins, que sempre
 * passam. Para desligar o gate (liberar todos), set env `PROJECTS_COURSE_GATE=off`.
 */
export const PROJECTS_GATE_ENABLED = process.env.PROJECTS_COURSE_GATE !== "off";

/**
 * Decide whether a user can access the Projetos IDE.
 * Ordem: super admin → gate off → curso (exato/keyword). Fail-closed quando o
 * gate está ligado e o curso é vazio/fora de escopo.
 */
export function checkEligibility(course: string | null | undefined, ctx?: AccessContext): EligibilityResult {
  // Super admin (allowlist ou role) → passa sempre, independente de curso/gate.
  if (ctx && isSuperAdmin(ctx)) return { eligible: true, reason: "super-admin" };

  // Gate desligado → todos entram. (Religar removendo PROJECTS_COURSE_GATE=off.)
  if (!PROJECTS_GATE_ENABLED) return { eligible: true, reason: "gate-disabled" };

  const norm = normalizeCourse(course);
  if (!norm) return { eligible: false, reason: "no-course" };

  const exact = ELIGIBLE_COURSES.find((c) => normalizeCourse(c) === norm);
  if (exact) return { eligible: true, matched: exact, reason: "exact" };

  const hit = ELIGIBLE_KEYWORDS.some((k) => norm.includes(k));
  if (hit) return { eligible: true, reason: "keyword" };

  return { eligible: false, reason: "out-of-scope" };
}

/** Convenience boolean for UI guards. */
export function isEligibleForProjects(course: string | null | undefined, ctx?: AccessContext): boolean {
  return checkEligibility(course, ctx).eligible;
}

/** Helper de alto nível: pode usar o Zaeon Code? (curso elegível OU super admin). */
export function canUseProjects(p: { course?: string | null; email?: string | null; role?: string | null }): boolean {
  return checkEligibility(p.course, { email: p.email, role: p.role }).eligible;
}

/**
 * Server-side guard. Throws a typed error if the user is not eligible, so API
 * routes can `catch` and return 403 with a stable shape.
 */
export class ProjectsAccessError extends Error {
  status = 403 as const;
  reason: EligibilityResult["reason"];
  constructor(reason: EligibilityResult["reason"]) {
    super("Projetos IDE: usuário não elegível (curso fora do escopo de Computação).");
    this.name = "ProjectsAccessError";
    this.reason = reason;
  }
}

export function assertEligibleOrThrow(course: string | null | undefined, ctx?: AccessContext): void {
  const res = checkEligibility(course, ctx);
  if (!res.eligible) throw new ProjectsAccessError(res.reason);
}

/** UI copy for the non-eligible fallback state. */
export const NOT_ELIGIBLE_COPY = {
  title: "Sala de Projetos — acesso restrito",
  body:
    "A IDE agêntica de Projetos é liberada para estudantes de Computação e áreas correlatas " +
    "(Ciência da Computação, Engenharia de Software, Sistemas de Informação, Engenharia da " +
    "Computação, Análise e Desenvolvimento de Sistemas, entre outras). " +
    "Atualize o seu curso no Perfil se você se enquadra e o acesso não foi liberado.",
  cta: "Ir para o Perfil",
};
