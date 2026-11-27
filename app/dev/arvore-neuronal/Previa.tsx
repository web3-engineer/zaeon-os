"use client";
// DEV ONLY: monta a tela do curso (CursoArvoreNeuronal) em tela cheia.
import CursoArvoreNeuronal from "@/components/studio/CursoArvoreNeuronal";
import type { CursoRepo } from "@/lib/forja/tipos";
import type { LicaoCurada } from "@/lib/forja/licaoCurada";

export default function Previa(p: { curso: CursoRepo; cursoId: string; licoes: Record<string, LicaoCurada>; titulo: string }) {
  return (
    <div className="relative h-screen w-screen">
      <CursoArvoreNeuronal curso={p.curso} cursoId={p.cursoId} licoes={p.licoes} titulo={p.titulo} />
    </div>
  );
}
