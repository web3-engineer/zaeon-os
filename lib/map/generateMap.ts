/**
 * lib/map/generateMap.ts — o CHAIN WORKER materializa o cérebro (HANDOFF_CEREBRO_AURA §2, §4, §5).
 *
 *   Passo 0: classificar o tópico (arquétipo + objetivo delimitado + modo/critério de conclusão).
 *   Passo 1: traçar o backbone (passos ordenados até o nó de conclusão do arquétipo).
 *   Gravar: cria o mapa (ou funde o backbone no mapa que os turnos já começaram) — idempotente por
 *   scopeId: mapa que já tem backbone não é regerado (salvo `force`).
 *
 * O modelo é injetável (`genJson`); sem ele, ou se falhar, cai na heurística + backbone genérico
 * (degraded=true) — o cérebro NUNCA fica sem percurso.
 */
import { GEMINI_MODEL_FLASH } from "@/lib/ai/model";
import { ARQUETIPOS, CLASSIFICAR_SYSTEM, classificarHeuristica, sanitizeClassificacao, type Classificacao } from "@/lib/map/arquetipo";
import { backboneValido, completudes, normalizarBackbone } from "@/lib/map/backbone";
import { fundirNoGrafo } from "@/lib/map/grafo";
import { createMapa, findOwnMapa, patchMapa, type MapSurface } from "@/lib/map/store";
import type { MapaView, TipoTopico } from "@/lib/map/tipos";

export type GenJson = <T>(system: string, user: string, opts?: { temperature?: number; model?: string; timeoutMs?: number }) => Promise<T>;

const defaultGenJson: GenJson = async (system, user, opts) => {
  const { geminiJson } = await import("@/lib/scholar/gemini");
  return geminiJson(system, user, opts);
};

export const BACKBONE_SYSTEM =
  "Você é a Aura traçando o PERCURSO de um estudo (PT-BR): a lista ORDENADA de passos que leva do começo até a conclusão. " +
  "De 5 a 10 passos, cada um um nó curto (label de 2–8 palavras) com \"tipo\" em {conceito, passo, experimento, entrega, conclusao}, \"corpo\" (1 frase do que fazer), \"resumo\" (o que é este tópico, 1–2 frases) e \"req\" (o que precisa ser atendido pra concluí-lo, 1 frase objetiva). " +
  "Cada passo pressupõe o anterior (cadeia linear, sem ramos). O ÚLTIMO passo é o que fecha o objetivo. " +
  "Responda SOMENTE JSON: {\"passos\":[{\"label\":\"…\",\"tipo\":\"…\",\"corpo\":\"…\",\"resumo\":\"…\",\"req\":\"…\"}]}";

export function promptClassificar(topico: string, contexto?: string): string {
  return `Tópico: ${topico.trim().slice(0, 300)}` + (contexto ? `\nContexto da conversa (resumo): ${contexto.slice(0, 1200)}` : "");
}
export function promptBackbone(c: Classificacao, topico: string, jaEstudado: string[]): string {
  const a = ARQUETIPOS[c.tipoTopico];
  return `Tópico: ${topico.trim().slice(0, 300)}\nArquétipo: ${a.rotulo} (conclui com: ${a.criterioCompletude})\nObjetivo: ${c.objetivo}` +
    (jaEstudado.length ? `\nJá estudado nesta conversa (reaproveite os nomes quando couber): ${jaEstudado.slice(0, 20).join("; ")}` : "");
}

/** Backbone genérico quando o modelo falha — ainda é um percurso válido pro arquétipo. */
export function backboneFallback(tipo: TipoTopico, topico: string): { label: string; tipo: string; corpo?: string }[] {
  const t = topico.trim().slice(0, 60) || "o tema";
  const fim = ARQUETIPOS[tipo].noConclusao;
  const base: Record<TipoTopico, string[]> = {
    aplicavel: [`Fundamentos de ${t}`, `Variáveis e medições`, `Planejar a aplicação`, `Executar e registrar dados`, `Comprovar o resultado`],
    habilidade: [`Fundamentos de ${t}`, `Praticar o básico`, `Resolver um problema real`, `Revisar com a rubrica`, `Entregar a demonstração`],
    conceitual: [`Conceitos centrais de ${t}`, `Relações entre os conceitos`, `Explicar com as próprias palavras`, `Auto-avaliação`],
    exploratorio: [`O que é ${t}`, `Principais ramos`, `Aprofundar um ramo`, `Mapa dos sub-tópicos`],
    criativo: [`Referências de ${t}`, `Esboço`, `Primeira versão`, `Feedback por critério`, `Versão final`],
  };
  const passos = base[tipo].map((label) => ({ label, tipo: "passo" }));
  passos[passos.length - 1]!.tipo = fim;
  return passos;
}

export type GenerateMapInput = {
  ownerId: string; surface: MapSurface; scopeId: string; topico: string;
  /** Resumo da conversa (o gatekeeper manda) — melhora a classificação. */
  contexto?: string;
  force?: boolean;
  genJson?: GenJson | null;
};
export type GenerateMapResult = { mapa: MapaView; criado: boolean; regerado: boolean; degraded: boolean; classificacao: Classificacao };

/** Passo 0 isolado (testável): modelo → sanitize → heurística. */
export async function classificarTopico(topico: string, contexto?: string, genJson: GenJson | null = defaultGenJson): Promise<Classificacao> {
  if (genJson) {
    try {
      const raw = await genJson<unknown>(CLASSIFICAR_SYSTEM, promptClassificar(topico, contexto), { temperature: 0.1, model: GEMINI_MODEL_FLASH, timeoutMs: 20_000 });
      const c = sanitizeClassificacao(raw, topico);
      if (c) return c;
    } catch { /* cai na heurística */ }
  }
  return classificarHeuristica(topico);
}

export async function generateMap(input: GenerateMapInput): Promise<GenerateMapResult> {
  const genJson = input.genJson === undefined ? defaultGenJson : input.genJson;
  const existente = await findOwnMapa(input.ownerId, input.surface, input.scopeId);
  if (existente && existente.backbone.length && !input.force) {
    const c: Classificacao = { tipoTopico: existente.tipoTopico, objetivo: existente.objetivo, modoValidacao: existente.modoValidacao, criterioCompletude: existente.criterioCompletude, fonte: "modelo" };
    return { mapa: existente, criado: false, regerado: false, degraded: false, classificacao: c };
  }
  // Passo 0
  const classificacao = await classificarTopico(input.topico, input.contexto, genJson);
  // Passo 1
  const jaEstudado = (existente?.nos ?? []).filter((n) => n.tipo === "conceito").map((n) => n.label);
  let degraded = classificacao.fonte === "heuristica";
  let bb = null as ReturnType<typeof normalizarBackbone>;
  if (genJson) {
    try {
      const raw = await genJson<unknown>(BACKBONE_SYSTEM, promptBackbone(classificacao, input.topico, jaEstudado), { temperature: 0.3, model: GEMINI_MODEL_FLASH, timeoutMs: 30_000 });
      bb = normalizarBackbone(raw, classificacao.tipoTopico, existente?.nos ?? []);
    } catch { /* fallback abaixo */ }
  }
  if (!bb) { degraded = true; bb = normalizarBackbone({ passos: backboneFallback(classificacao.tipoTopico, input.topico) }, classificacao.tipoTopico, existente?.nos ?? [])!; }

  const campos = { tipoTopico: classificacao.tipoTopico, objetivo: classificacao.objetivo, modoValidacao: classificacao.modoValidacao, criterioCompletude: classificacao.criterioCompletude };
  if (!existente) {
    const f = fundirNoGrafo({ nos: [], arestas: [] }, { nos: bb.nos, arestas: bb.arestas });
    const c = completudes({ nos: f.nos, backbone: bb.backbone, modoValidacao: campos.modoValidacao });
    const mapa = await createMapa({ ownerId: input.ownerId, surface: input.surface, scopeId: input.scopeId, titulo: input.topico.slice(0, 80) || "Estudo", nos: f.nos, arestas: f.arestas, backbone: bb.backbone, ...campos });
    const mapaC = { ...mapa, completudeAprendizado: c.aprendizado, completudeConclusao: c.conclusao };
    return { mapa: mapaC, criado: true, regerado: false, degraded, classificacao };
  }
  const plano = bb;
  const r = await patchMapa(existente.id, (atual) => {
    // Funde o PLANO no estado relido: nós já estudados que coincidem viram parte do percurso.
    const f = fundirNoGrafo(atual, { nos: plano.nos.filter((n) => n.planejado), arestas: [] });
    const nos = f.nos;
    const arestas = [...f.arestas];
    const chave = new Set(arestas.map((a) => `${a.de}>${a.para}:${a.relacao}`));
    for (const a of plano.arestas) if (!chave.has(`${a.de}>${a.para}:${a.relacao}`)) { arestas.push(a); chave.add(`${a.de}>${a.para}:${a.relacao}`); }
    const backbone = backboneValido(plano.backbone, nos, arestas) ? plano.backbone : atual.backbone;
    const c = completudes({ nos, backbone, modoValidacao: campos.modoValidacao });
    return { nos, arestas, backbone, ...campos, completudeAprendizado: c.aprendizado, completudeConclusao: c.conclusao };
  });
  if (!r.ok) throw new Error(`generateMap: patch falhou (${r.reason})`);
  return { mapa: r.mapa, criado: false, regerado: existente.backbone.length > 0, degraded, classificacao };
}
