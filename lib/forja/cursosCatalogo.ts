/**
 * lib/forja/cursosCatalogo.ts — o conteúdo AUTORAL dos cursos do CATÁLOGO (lib/forja/catalogoIniciantes
 * e catalogoAvancado). Esses cursos não são skills (não têm `.claude/skills/<id>/SKILL.md`), então o
 * conteúdo vive aqui, importado como MÓDULO (bundlado no build do Next) — NÃO lido do disco em runtime.
 *
 * Por que módulo e não fs: o `.dockerignore` preserva `.claude/skills/**` de propósito; um JSON solto em
 * lib/ não tem essa garantia no runtime do Next standalone. Importado, o bundler o inclui — sempre existe.
 *
 * Chave = o `id` do esqueleto (catalogoIniciantes/Avancado). Sem entrada aqui, o curso depende do motor.
 */
import type { CursoJsonCru } from "./licaoCurada";
import listaDeTarefas from "./cursos/lista-de-tarefas.json";
import appDeClima from "./cursos/app-de-clima.json";
import calculadora from "./cursos/calculadora.json";
import quiz from "./cursos/quiz.json";
import pomodoro from "./cursos/pomodoro.json";
import jogoDaVelha from "./cursos/jogo-da-velha.json";
import markdownParaHtml from "./cursos/markdown-para-html.json";
import encurtadorDeUrl from "./cursos/encurtador-de-url.json";
import apiRestCrud from "./cursos/api-rest-crud.json";
import portfolio from "./cursos/portfolio.json";

/** Os 10 cursos INICIANTES do catálogo (lib/forja/catalogoIniciantes), com conteúdo autoral real. */
export const CATALOGO_CURSOS: Record<string, CursoJsonCru> = {
  "lista-de-tarefas": listaDeTarefas as CursoJsonCru,
  "app-de-clima": appDeClima as CursoJsonCru,
  "calculadora": calculadora as CursoJsonCru,
  "quiz": quiz as CursoJsonCru,
  "pomodoro": pomodoro as CursoJsonCru,
  "jogo-da-velha": jogoDaVelha as CursoJsonCru,
  "markdown-para-html": markdownParaHtml as CursoJsonCru,
  "encurtador-de-url": encurtadorDeUrl as CursoJsonCru,
  "api-rest-crud": apiRestCrud as CursoJsonCru,
  "portfolio": portfolio as CursoJsonCru,
};
