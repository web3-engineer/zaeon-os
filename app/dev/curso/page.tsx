// DEV ONLY: cena do curso de código com ANÁLISE REAL do repo (graphify local). ?slug=pomodoro (curso da
// Forja) ou ?slug=astropy-astronomia (skill-curso). Resolve o esqueleto (repo+título), e o grafo real
// vem do /api/dev/grafo. Sem auth; gated pela flag FORJA_LOCAL_ENGINE=1 na rota do grafo.
import { esqueletoPorId, montarCursoEsqueleto } from "@/lib/forja/cursoRepo";
import { esqueletoDaSkill } from "@/lib/forja/esqueletoResolver";
import CursoRealPreview from "./CursoRealPreview";

export const dynamic = "force-dynamic";

export default function Page({ searchParams }: { searchParams: { slug?: string } }) {
  const slug = (searchParams?.slug || "pomodoro").trim();
  const esq = (esqueletoPorId(slug) && esqueletoPorId(slug)!.id === slug ? esqueletoPorId(slug) : undefined) ?? esqueletoDaSkill(slug);
  if (!esq) return <div className="p-6 text-white">curso não encontrado: {slug}</div>;
  const curso = montarCursoEsqueleto(esq);
  return <CursoRealPreview curso={curso} repo={esq.repo} titulo={esq.titulo} />;
}
