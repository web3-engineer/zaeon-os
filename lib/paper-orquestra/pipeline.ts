/**
 * lib/paper-orquestra/pipeline.ts — o PaperOrchestra (google-research/paper-orchestra, Apache-2.0) como MOTOR DE
 * EXECUÇÃO do documento editável da Zaeon. É o `write_single_paper` de methods/paper_writer.py, passo por passo:
 *
 *   0. Materiais   pedido do aluno → ideia + dados           (no PO são arquivos prontos: idea.md, experimental_log.md)
 *   1. Esboço      OutlineAgent → plano de figuras, estratégia de busca, plano de seções
 *   2. Literatura  HybridLiteratureAgent → buscas DIRIGIDAS nas bases da Zaeon → registro [E#] → Introdução + Revisão
 *   3. Seções      SectionWritingAgent → o resto do esqueleto
 *   4. Refinamento AgentReview + ContentRefinementAgent → só fica a versão que o parecerista nota melhor
 *
 * O que é da ZAEON e entra por injeção (`Deps`): o modelo (envelope → Vertex/gateway + ledger), a busca acadêmica
 * (`retrievePapers`, 5 bases), a base do aluno (RAG) e o `salvarSecao` que escreve no documento editável — cada
 * seção aparece na aba do aluno assim que fica pronta. O texto interno usa as chaves [E#]; o que vai pro documento
 * já sai com a citação ABNT dele, e a bibliografia sai das chaves citadas (lib/paper-orquestra/texto).
 *
 * Nunca escreve por cima do aluno: seção que ele já escreveu (`jaEscritas`) não é tocada em nenhuma etapa.
 */
import type { FonteVerificada } from "@/lib/tcc/store";
import { fonteDeDocumento, fonteDoPedido } from "@/lib/documento/fontes";
import { parseJsonComLatex } from "@/lib/llm/latexJson";
import {
  PROMPT_MATERIAIS, PROMPT_REFINAMENTO, PROMPT_REVISOR, PROMPT_SECOES, promptEsboco, promptLiteratura,
} from "@/lib/paper-orquestra/prompts";
import {
  bibliotecaParaPrompt, converterCitacoes, criarRegistro, injetarCandidatas, lerRefinamento, markdownDasSecoes,
  notasDoParecer, papeisDoEsqueleto, referenciasDasChaves, secaoEscrita, secoesDoMarkdown, tarefasDoEsboco,
  vereditoDaRevisao, type Esboco, type Notas, type PaperBusca,
} from "@/lib/paper-orquestra/texto";

/** A flag. Desligada = `gerarTccEmBackground` byte a byte como antes. */
export { paperOrquestraLigada } from "@/lib/paper-orquestra/flag";

export type Fase = "materiais" | "esboco" | "literatura" | "secoes" | "revisor" | "refinamento";
export type PedidoLlm = { fase: Fase; system: string; user: string; json?: boolean; temperatura?: number; longo?: boolean };
export type Llm = (p: PedidoLlm) => Promise<string>;

export type Deps = {
  llm: Llm;
  /** busca acadêmica (padrão: lib/scholar/retrieve) — nunca deve lançar; vazio é resposta válida */
  buscar: (consulta: string, area?: string) => Promise<PaperBusca[]>;
  /** a base do PRÓPRIO aluno (RAG); ausente = sem base */
  baseDoAluno?: (tema: string) => Promise<Array<{ titulo?: string; paginas?: string; extrato?: string }>>;
  /** escreve UMA seção no documento (corpo já com citação ABNT); `false` = não gravou (aluno editou, conflito) */
  salvarSecao: (titulo: string, corpo: string) => Promise<boolean>;
  definirTitulo?: (titulo: string) => Promise<void>;
  progresso?: (rotulo: string) => void;
  agora?: () => number;
};

export type Entrada = {
  tema: string;
  /** o pedido inteiro do aluno (com texto colado, dados, instruções) */
  pedido: string;
  tipo: string;
  /** os títulos das seções do documento, na ordem (a autoridade — o modelo não cria seção) */
  esqueleto: string[];
  /** seções que o aluno já escreveu: ninguém toca */
  jaEscritas?: ReadonlySet<string>;
  /** "limite-se a estas referências": substitui a busca (decisão do dono, igual ao gerador por seção) */
  referenciasDoPedido?: string[];
  hoje?: Date;
  prazoMs?: number;
  reflexoes?: number;
  maxBuscas?: number;
};

export type Relatorio = {
  ms: number; chamadas: number; buscas: number; evidencias: number; citadas: number; invalidas: number;
  secoesEscritas: number; notaInicial: number | null; notaFinal: number | null; voltasAceitas: number; motivoFim: string;
};
export type Resultado = { titulo: string | null; referencias: FonteVerificada[]; relatorio: Relatorio };

const s = (v: unknown, max = 20_000) => String(v ?? "").trim().slice(0, max);

async function emLotes<T, R>(itens: readonly T[], n: number, f: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(itens.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, itens.length) }, async () => {
    while (i < itens.length) { const k = i++; out[k] = await f(itens[k]); }
  }));
  return out;
}

export async function rodarPaperOrquestra(e: Entrada, d: Deps): Promise<Resultado> {
  const agora = d.agora ?? Date.now;
  const t0 = agora();
  const prazo = t0 + (e.prazoMs ?? 15 * 60_000);
  const resta = () => prazo - agora();
  const hoje = e.hoje ?? new Date();
  const dataCorte = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const jaEscritas = e.jaEscritas ?? new Set<string>();
  const papeis = papeisDoEsqueleto(e.esqueleto);
  const rotulos = { intro: papeis.intro, revisao: papeis.revisao };
  const nossas = e.esqueleto.filter((t) => t !== papeis.referencias && !jaEscritas.has(t));
  const prog = (r: string) => { try { d.progresso?.(r); } catch { /* enfeite */ } };

  let chamadas = 0;
  const llm: Llm = async (p) => { chamadas++; return d.llm(p); };
  const json = async <T>(p: PedidoLlm): Promise<T | null> => {
    try { return parseJsonComLatex<T>(await llm({ ...p, json: true })); } catch (err) {
      console.warn(`[paper-orquestra] ${p.fase}: JSON inválido —`, String((err as Error)?.message ?? err).slice(0, 160));
      return null;
    }
  };

  // ─── 0 · materiais ───
  prog("Organizando o pedido em ideia e dados");
  const mat = await json<{ titulo?: string; area?: string; ideia?: string; dados?: string }>({
    fase: "materiais", system: PROMPT_MATERIAIS, user: `TIPO: ${e.tipo}\nTEMA: ${e.tema}\n\nPEDIDO:\n${s(e.pedido, 30_000)}`, temperatura: 0.2,
  });
  const ideia = s(mat?.ideia) || `${e.tema}\n\n${s(e.pedido, 4_000)}`;
  const dados = s(mat?.dados, 30_000);
  const titulo = s(mat?.titulo, 200) || null;
  if (titulo) await d.definirTitulo?.(titulo).catch(() => undefined);

  // ─── 1 · esboço ───
  prog("Planejando o trabalho (esboço, buscas e seções)");
  const esqueletoSemRefs = e.esqueleto.filter((t) => t !== papeis.referencias);
  const esboco: Esboco = (await json<Esboco>({
    fase: "esboco",
    system: promptEsboco({ dataCorte, esqueleto: esqueletoSemRefs, temDados: !!dados, intro: papeis.intro, revisao: papeis.revisao }),
    user: JSON.stringify({ ideia, dados: dados || "(vazio)", esqueleto: esqueletoSemRefs }),
    temperatura: 0.3, longo: true,
  })) ?? { intro_related_work_plan: { introduction_strategy: { search_directions: [e.tema] } } };

  // ─── 2 · literatura: buscas dirigidas nas bases da Zaeon → registro [E#] ───
  const reg = criarRegistro(Number(e.maxBuscas) > 0 ? Math.max(20, e.maxBuscas! * 3) : 40);
  let buscas = 0;
  if (e.referenciasDoPedido?.length) {
    prog(`Usando as ${e.referenciasDoPedido.length} referências que você indicou (sem busca)`);
    for (const r of e.referenciasDoPedido) reg.registrar({ title: r }, papeis.intro, fonteDoPedido(r));
  } else {
    if (d.baseDoAluno) {
      const base = await d.baseDoAluno(`${e.tema}\n${ideia.slice(0, 600)}`.trim()).catch(() => []);
      for (const b of base) reg.registrar({ title: b.titulo, abstract: b.extrato }, papeis.intro, fonteDeDocumento(b));
    }
    const tarefas = tarefasDoEsboco(esboco, rotulos, e.maxBuscas ?? 16);
    prog(`Buscando literatura: ${tarefas.length} consultas nas bases acadêmicas`);
    const area = s(mat?.area, 10) || undefined;
    const achados = await emLotes(tarefas, 4, async (t) => {
      if (resta() < 4 * 60_000) return [];
      buscas++;
      return (await d.buscar(t.consulta, area).catch(() => [])).slice(0, t.tipo === "alvo" ? 1 : 6);
    });
    tarefas.forEach((t, i) => { for (const p of achados[i] ?? []) reg.registrar(p, t.secao); });
  }
  const evs = reg.itens();
  prog(`${evs.length} fontes reunidas`);
  const esbocoComCitas = injetarCandidatas(esboco, evs, rotulos);
  const biblioteca = bibliotecaParaPrompt(evs);

  /** o estado interno: corpo com chaves [E#], por título de seção */
  const corpos = new Map<string, string>();
  const gravadas = new Set<string>();
  const salvar = async (titulo: string, corpo: string) => {
    corpos.set(titulo, corpo);
    const { texto } = converterCitacoes(corpo, reg.porChave);
    if (await d.salvarSecao(titulo, texto).catch(() => false)) gravadas.add(titulo);
  };

  // Introdução + Revisão (o "Phase 3: WRITING" do HybridLiteratureAgent)
  const daLiteratura = [papeis.intro, papeis.revisao].filter((t): t is string => !!t && nossas.includes(t));
  if (daLiteratura.length) {
    prog(`Escrevendo ${daLiteratura.join(" e ")}`);
    const r = await llm({
      fase: "literatura",
      system: promptLiteratura({ nEvidencias: evs.length, minCitar: Math.floor(evs.length * 0.6), dataCorte, intro: papeis.intro, revisao: daLiteratura.includes(papeis.revisao ?? "") ? papeis.revisao : null }),
      user: JSON.stringify({ plano_intro_revisao: esbocoComCitas.intro_related_work_plan ?? {}, ideia, dados: dados || "(vazio)" }) + `\n\nevidencias:\n${biblioteca}`,
      temperatura: 0.5, longo: true,
    }).catch((err) => { console.warn("[paper-orquestra] literatura falhou:", (err as Error)?.message); return ""; });
    for (const [t, c] of secoesDoMarkdown(r, daLiteratura)) await salvar(t, c);
  }

  // ─── 3 · seções (SectionWritingAgent) ───
  const faltam = () => nossas.filter((t) => !secaoEscrita(corpos.get(t), /^resumo|abstract/i.test(t) ? 60 : 80));
  const escreverSecoes = async (alvo: string[]) => {
    const r = await llm({
      fase: "secoes", system: PROMPT_SECOES,
      user: [
        `escreva_estas: ${JSON.stringify(alvo)}`,
        `esboco:\n${JSON.stringify({ plotting_plan: esbocoComCitas.plotting_plan ?? [], section_plan: esbocoComCitas.section_plan ?? [] })}`,
        `ideia:\n${ideia}`, `dados:\n${dados || "(vazio)"}`, `evidencias:\n${biblioteca}`,
        `esqueleto:\n${markdownDasSecoes(esqueletoSemRefs, corpos)}`,
      ].join("\n\n"),
      temperatura: 0.5, longo: true,
    }).catch((err) => { console.warn("[paper-orquestra] seções falharam:", (err as Error)?.message); return ""; });
    for (const [t, c] of secoesDoMarkdown(r, alvo)) await salvar(t, c);
  };
  if (faltam().length && resta() > 2 * 60_000) {
    prog(`Escrevendo ${faltam().length} seções`);
    await escreverSecoes(faltam());
  }
  // o que a chamada única não trouxe (truncou, pulou): UMA seção por chamada — o conserto da F2, aqui como rede
  if (faltam().length && resta() > 2 * 60_000) {
    prog(`Completando ${faltam().length} seções que ficaram curtas`);
    await emLotes(faltam(), 2, (t) => escreverSecoes([t]));
  }

  // ─── 4 · refinamento (ContentRefinementAgent + AgentReview) ───
  let notaInicial: number | null = null, notaFinal: number | null = null, voltasAceitas = 0;
  let motivoFim = "sem refinamento";
  const maxVoltas = Math.max(0, e.reflexoes ?? 2);
  const trabalhoMd = () => markdownDasSecoes(esqueletoSemRefs.filter((t) => corpos.has(t)), corpos);
  const parecer = async () => {
    const p = await json<Record<string, unknown>>({ fase: "revisor", system: PROMPT_REVISOR, user: `Trabalho a avaliar:\n\n${trabalhoMd()}`, temperatura: 0.75 });
    return p ? { p, notas: notasDoParecer(p) } : null;
  };
  if (maxVoltas > 0 && corpos.size && resta() > 3 * 60_000) {
    prog("Parecerista lendo o trabalho");
    let atual = await parecer();
    notaInicial = atual?.notas.Overall ?? null;
    notaFinal = notaInicial;
    const historico: unknown[] = [];
    motivoFim = atual ? `${maxVoltas} voltas` : "parecer indisponível";
    for (let i = 0; atual && i < maxVoltas; i++) {
      if (resta() < 3 * 60_000) { motivoFim = "prazo"; break; }
      prog(`Revisando pelo parecer (volta ${i + 1}, nota ${atual.notas.Overall}/10)`);
      const resp = await llm({
        fase: "refinamento", system: PROMPT_REFINAMENTO,
        user: [
          `VOLTA ${i + 1}. Objetivo: SUBIR a nota (atual: ${atual.notas.Overall}).`,
          `historico:\n${JSON.stringify(historico)}`,
          `parecer:\n${JSON.stringify(atual.p)}`,
          `dados:\n${dados || "(vazio)"}`, `evidencias:\n${biblioteca}`,
          `trabalho:\n${trabalhoMd()}`,
        ].join("\n\n"),
        temperatura: 0.4, longo: true,
      }).catch(() => "");
      const lido = lerRefinamento(resp);
      if (!lido) { motivoFim = "revisão ilegível"; break; }
      const novas = secoesDoMarkdown(lido.trabalho, nossas);
      // um refinamento que perde seção não é revisão, é truncamento
      if ([...corpos.keys()].some((t) => nossas.includes(t) && !novas.has(t))) { motivoFim = "revisão truncada"; break; }
      const anteriores = new Map(corpos);
      for (const [t, c] of novas) corpos.set(t, c);
      const novo = await parecer();
      if (!novo) { for (const [t, c] of anteriores) corpos.set(t, c); motivoFim = "parecer indisponível"; break; }
      const v = vereditoDaRevisao(atual.notas, novo.notas);
      historico.push({ volta: i + 1, worklog: lido.worklog, antes: atual.notas, depois: novo.notas, veredito: v.veredito });
      if (v.veredito === "rejeita") {
        for (const [t, c] of anteriores) corpos.set(t, c);
        motivoFim = `volta ${i + 1} rejeitada (${atual.notas.Overall}→${novo.notas.Overall})`;
        break;
      }
      voltasAceitas++;
      atual = novo;
      notaFinal = novo.notas.Overall;
      for (const [t, c] of novas) if (c !== anteriores.get(t)) await salvar(t, c);
    }
  }

  // ─── bibliografia: das chaves citadas no texto final ───
  const citadas: string[] = [];
  let invalidas = 0;
  for (const c of corpos.values()) {
    const r = converterCitacoes(c, reg.porChave);
    for (const k of r.citadas) if (!citadas.includes(k)) citadas.push(k);
    invalidas += r.invalidas.length;
  }
  const relatorio: Relatorio = {
    ms: agora() - t0, chamadas, buscas, evidencias: evs.length, citadas: citadas.length, invalidas,
    secoesEscritas: gravadas.size, notaInicial, notaFinal, voltasAceitas, motivoFim,
  };
  return { titulo, referencias: referenciasDasChaves(citadas, reg.porChave), relatorio };
}

export type { Notas };
