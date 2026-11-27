// DEV ONLY: prévia da Árvore Neuronal com cursos REAIS, sem login (o progresso cai na reserva do
// localStorage, porque a rota de progresso exige sessão). Fora do ar em produção, salvo ARVORE_NEURONAL_DEMO=1.
//   ?curso=pomodoro | ?curso=pandas-analise-de-dados   (catálogo curado ou skill-curso)
//   ?ua=1                                              (árvore REAL do understand-anything, micrograd)
//   ?n=80                                              (árvore sintética com n lições — teste de desempenho)
import { notFound } from "next/navigation";
import { resolverEsqueleto } from "@/lib/forja/esqueletoResolver";
import { montarCursoEsqueleto } from "@/lib/forja/cursoRepo";
import { conteudoCuradoDoCurso } from "@/lib/forja/conteudoCurado";
import { arvoreDoUA, type UAGrafo } from "@/lib/forja/understand";
import sample from "@/lib/forja/understand.sample.json";
import type { CursoRepo, NoEntendimento } from "@/lib/forja/tipos";
import type { LicaoCurada } from "@/lib/forja/licaoCurada";
import Previa from "./Previa";

export const dynamic = "force-dynamic";

function sintetico(n: number): CursoRepo {
  const no = (id: string, titulo: string, filhos: NoEntendimento[] = []): NoEntendimento => ({ id, titulo, resumo: "Lição sintética " + titulo + ".", desde: "basico", refs: [], filhos });
  const mods: NoEntendimento[] = [];
  let k = 1;
  for (let m = 0; k < n; m++) {
    const filhos: NoEntendimento[] = [];
    k++;
    for (let s = 0; s < 6 && k < n; s++, k++) filhos.push(no(`m${m}s${s}`, `Conceito ${m + 1}.${s + 1}`));
    mods.push(no(`m${m}`, `Módulo ${m + 1}`, filhos));
  }
  return { cursoId: "sintetico", repo: "zaeon/sintetico", modo: "curso", grafo: { nos: [], arestas: [] }, arvore: { raiz: no("raiz", `Árvore sintética (${n})`, mods) }, modulos: [], licoes: [], licencas: [] };
}

export default function Page({ searchParams }: { searchParams: { curso?: string; ua?: string; n?: string } }) {
  if (process.env.NODE_ENV === "production" && process.env.ARVORE_NEURONAL_DEMO !== "1") notFound();
  const n = Number(searchParams?.n);
  if (Number.isFinite(n) && n > 1) return <Previa curso={sintetico(Math.min(400, Math.floor(n)))} cursoId="sintetico" licoes={{}} titulo={`Árvore sintética (${Math.floor(n)})`} />;
  if (searchParams?.ua) {
    const arvore = arvoreDoUA(sample as unknown as UAGrafo);
    return <Previa curso={{ cursoId: "micrograd", repo: "karpathy/micrograd", modo: "curso", grafo: { nos: [], arestas: [] }, arvore, modulos: [], licoes: [], licencas: [] }} cursoId="micrograd" licoes={{}} titulo={arvore.raiz.titulo} />;
  }
  const esq = resolverEsqueleto((searchParams?.curso || "pomodoro").trim());
  if (!esq) return <div className="p-6 text-white">curso não encontrado</div>;
  const curso = montarCursoEsqueleto(esq);
  const curado = conteudoCuradoDoCurso(esq);
  if (curado) curso.arvore = curado.arvore;
  const licoes: Record<string, LicaoCurada> = curado?.licoesPorNo ?? {};
  return <Previa curso={curso} cursoId={esq.id} licoes={licoes} titulo={esq.titulo} />;
}
