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
  PROMPT_AJUSTAR, PROMPT_MATERIAIS, PROMPT_REFINAMENTO, PROMPT_REVISOR, PROMPT_SECOES, promptEsboco, promptLiteratura,
} from "@/lib/paper-orquestra/prompts";
import {
  bibliotecaParaPrompt, converterCitacoes, criarRegistro, injetarCandidatas, lerRefinamento, markdownDasSecoes,
  notasDoParecer, papeisDoEsqueleto, referenciasDasChaves, secaoEscrita, secoesDoMarkdown, tarefasDoEsboco,
  vereditoDaRevisao, BASES_ACADEMICAS, textoDoRegistro, textoDoOrcamento, orcamentoDaSecao, numerosSemLatex,
  contarPalavras, distanciaDaSecao, pendenciasDaSecao, semTabelaForaDosResultados, semCitacaoRepetida, dividirParagrafosLongos, type Esboco, type Notas, type PaperBusca, type RegistroDeBusca,
} from "@/lib/paper-orquestra/texto";

/** A flag. Desligada = `gerarTccEmBackground` byte a byte como antes. */
export { paperOrquestraLigada } from "@/lib/paper-orquestra/flag";

export type Fase = "materiais" | "esboco" | "triagem" | "literatura" | "secoes" | "ajuste" | "revisor" | "refinamento";
export type PedidoLlm = { fase: Fase; system: string; user: string; json?: boolean; temperatura?: number; longo?: boolean };
export type Llm = (p: PedidoLlm) => Promise<string>;

export type Deps = {
  llm: Llm;
  /** busca acadêmica (padrão: lib/scholar/retrieve) — nunca deve lançar; vazio é resposta válida */
  buscar: (consulta: string, area?: string) => Promise<PaperBusca[]>;
  /** resumos por DOI (o enrichment do PO, via OpenAlex) pros candidatos que vieram sem resumo; ausente = sem enrichment */
  completarResumos?: (dois: string[]) => Promise<Map<string, string>>;
  /** a base do PRÓPRIO aluno (RAG); ausente = sem base */
  baseDoAluno?: (tema: string) => Promise<Array<{ titulo?: string; paginas?: string; extrato?: string }>>;
  /** escreve UMA seção no documento (corpo já com citação ABNT); `false` = não gravou (aluno editou, conflito) */
  salvarSecao: (titulo: string, corpo: string) => Promise<boolean>;
  definirTitulo?: (titulo: string) => Promise<void>;
  progresso?: (rotulo: string) => void;
  agora?: () => number;
  /** injetável (teste): a espera entre tentativas depois de um 429 */
  esperar?: (ms: number) => Promise<void>;
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
  /**
   * AVALIAÇÃO: em vez de buscar, usa esta biblioteca (as consultas e os papers de uma rodada anterior). A triagem, a
   * escrita e o refinamento rodam iguais — é o que deixa comparar a ESCRITA de duas versões com o mesmo material.
   */
  bibliotecaFixa?: { consultas: string[]; papers: Array<PaperBusca & { secao: string }> };
};

export type Relatorio = {
  ms: number; chamadas: number; buscas: number; evidencias: number; citadas: number; invalidas: number;
  secoesEscritas: number; notaInicial: number | null; notaFinal: number | null; voltasAceitas: number; motivoFim: string;
  /** seções corrigidas pela auditoria de entrega */
  ajustes: number;
  /** por seção: o que a auditoria achou e o que aconteceu com o ajuste */
  auditoria: Record<string, { pendencias: string[]; resultado: string }>;
};
export type Resultado = {
  titulo: string | null; referencias: FonteVerificada[]; relatorio: Relatorio;
  /** o registro da busca e da triagem (o que a metodologia de uma revisão descreve) */
  registroDeBusca: RegistroDeBusca;
  /** consultas + candidatos ANTES da triagem — o formato de `bibliotecaFixa` (avaliação reprodutível) */
  biblioteca: { consultas: string[]; papers: Array<PaperBusca & { secao: string }> };
  /** a biblioteca que o pipeline reuniu (chave, citação ABNT, título, autores, ano, resumo) — pra auditoria e avaliação */
  evidencias: Array<{ chave: string; citacao: string; abnt: string; titulo: string; autores: string; ano?: number; resumo: string; secao: string }>;
  /** o texto final de cada seção, já com a citação ABNT (o mesmo que foi gravado no documento) */
  secoes: Record<string, string>;
};

const s = (v: unknown, max = 20_000) => String(v ?? "").trim().slice(0, max);

async function emLotes<T, R>(itens: readonly T[], n: number, f: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(itens.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, itens.length) }, async () => {
    while (i < itens.length) { const k = i++; out[k] = await f(itens[k]); }
  }));
  return out;
}

export const PROMPT_TRIAGEM = `Você faz a TRIAGEM de uma revisão de literatura: decide, por título e resumo, quais trabalhos SERVEM ao
trabalho. Inclua o que trata do tema, do problema, do público, do método ou dos conceitos do trabalho — e também o que serve de
CONTEXTO ou CONTRASTE (outro nível de ensino, o período anterior, outro país): a revisão precisa disso pra comparar.
Exclua SÓ o que claramente não serve: outra área sem relação (ex.: distração ao dirigir num tema de estudo), outro problema
que só compartilha uma palavra, ou o que não é trabalho acadêmico. NA DÚVIDA, INCLUA.
Responda JSON: {"incluir": ["P1", "P4"], "excluir": [{"p": "P2", "motivo": "frase curta em pt-BR"}]}.`;

/** Triagem em lotes de 30. Modelo fora do ar = inclui tudo (a escrita ainda tem a regra de lastro). */
async function triar(papers: readonly PaperBusca[], tema: string, llm: Llm): Promise<{ incluir: Set<number>; motivos: string[] }> {
  const incluir = new Set<number>();
  const motivos: string[] = [];
  const lotes: number[][] = [];
  for (let i = 0; i < papers.length; i += 30) lotes.push(papers.slice(i, i + 30).map((_, j) => i + j));
  await emLotes(lotes, 3, async (lote) => {
    const lista = lote.map((i) => `[P${i + 1}] ${s(papers[i]!.title, 240)} (${papers[i]!.year ?? "s.d."})\n${s(papers[i]!.abstract, 420)}`).join("\n\n");
    const raw = await llm({ fase: "triagem", system: PROMPT_TRIAGEM, user: `TEMA DO TRABALHO:\n${tema}\n\nCANDIDATOS:\n${lista}`, json: true, temperatura: 0.1 }).catch(() => "");
    let r: { incluir?: unknown; excluir?: unknown } | null = null;
    try { r = parseJsonComLatex(raw); } catch { r = null; }
    if (!r || !Array.isArray(r.incluir)) { for (const i of lote) incluir.add(i); return; }
    for (const v of r.incluir) { const n = Number(String(v).replace(/\D/g, "")) - 1; if (lote.includes(n)) incluir.add(n); }
    for (const x of Array.isArray(r.excluir) ? r.excluir : []) if ((x as any)?.motivo) motivos.push(s((x as any).motivo, 120));
  });
  return { incluir, motivos };
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
  /**
   * LIMITE DE TAXA (429 / "resource exhausted") tenta de novo, com espera crescente, enquanto o prazo deixar. Medido na
   * avaliação: com três documentos em paralelo o Vertex devolveu 429 e seções inteiras ficaram pra reserva.
   */
  const esperar = d.esperar ?? ((ms: number) => new Promise<void>((ok) => setTimeout(ok, ms)));
  const llm: Llm = async (p) => {
    for (let tentativa = 0; ; tentativa++) {
      chamadas++;
      try {
        return await d.llm(p);
      } catch (err) {
        const msg = String((err as Error)?.message ?? err);
        const limite = /429|rate.?limit|resource exhausted|too many requests/i.test(msg);
        const espera = [8_000, 20_000, 45_000][tentativa];
        if (!limite || espera === undefined || resta() < espera + 60_000) throw err;
        prog(`Limite de uso do modelo — tentando de novo em ${Math.round(espera / 1000)} s`);
        await esperar(espera);
      }
    }
  };
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

  // ─── 2 · literatura: buscas dirigidas nas bases da Zaeon → TRIAGEM → registro [E#] ───
  const reg = criarRegistro(Number(e.maxBuscas) > 0 ? Math.max(20, e.maxBuscas! * 3) : 40);
  let buscas = 0;
  let bibliotecaBruta: Resultado["biblioteca"] = { consultas: [], papers: [] };
  const log: RegistroDeBusca = { origem: "busca", bases: BASES_ACADEMICAS, consultas: [], data: hoje.toISOString().slice(0, 10), encontrados: 0, semResumo: 0, excluidosTriagem: 0, incluidos: 0, motivosExclusao: [] };
  if (e.referenciasDoPedido?.length) {
    prog(`Usando as ${e.referenciasDoPedido.length} referências que você indicou (sem busca)`);
    log.origem = "pedido";
    for (const r of e.referenciasDoPedido) reg.registrar({ title: r }, papeis.intro, fonteDoPedido(r));
  } else {
    if (d.baseDoAluno) {
      const base = await d.baseDoAluno(`${e.tema}\n${ideia.slice(0, 600)}`.trim()).catch(() => []);
      for (const b of base) reg.registrar({ title: b.titulo, abstract: b.extrato }, papeis.intro, fonteDeDocumento(b));
      log.daBaseDoAluno = base.length;
    }
    // os CANDIDATOS: da busca (ou da biblioteca fixa da avaliação), deduplicados por título
    let candidatos: Array<PaperBusca & { secao: string }> = [];
    if (e.bibliotecaFixa) {
      log.consultas = [...e.bibliotecaFixa.consultas];
      candidatos = [...e.bibliotecaFixa.papers];
    } else {
      const tarefas = tarefasDoEsboco(esboco, rotulos, e.maxBuscas ?? 16);
      prog(`Buscando literatura: ${tarefas.length} consultas nas bases acadêmicas`);
      const area = s(mat?.area, 10) || undefined;
      const achados = await emLotes(tarefas, 4, async (t) => {
        if (resta() < 4 * 60_000) return [];
        buscas++;
        return (await d.buscar(t.consulta, area).catch(() => [])).slice(0, t.tipo === "alvo" ? 1 : 6);
      });
      log.consultas = tarefas.map((t) => t.consulta);
      tarefas.forEach((t, i) => { for (const p of achados[i] ?? []) candidatos.push({ ...p, secao: t.secao }); });
    }
    const vistos = new Set<string>();
    candidatos = candidatos.filter((p) => { const k = s(p.title, 300).toLowerCase().replace(/[^a-z0-9]/g, ""); if (!k || vistos.has(k)) return false; vistos.add(k); return true; });
    log.encontrados = candidatos.length;
    bibliotecaBruta = { consultas: [...log.consultas], papers: candidatos };
    // ENRICHMENT: quem veio sem resumo e tem DOI busca o resumo (Crossref/PubMed costumam vir sem)
    const semResumo = candidatos.filter((p) => s(p.abstract, 60).length < 40 && p.doi);
    if (d.completarResumos && semResumo.length) {
      prog(`Buscando o resumo de ${semResumo.length} fontes`);
      const achados = await d.completarResumos(semResumo.map((p) => p.doi!)).catch(() => new Map<string, string>());
      for (const p of semResumo) {
        const r = achados.get(String(p.doi).toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, ""));
        if (r) { p.abstract = r; log.resumosCompletados = (log.resumosCompletados ?? 0) + 1; }
      }
    }
    const comResumo = candidatos.filter((p) => s(p.abstract, 60).length >= 40);
    log.semResumo = candidatos.length - comResumo.length;
    // TRIAGEM por título e resumo (o que uma revisão de verdade faz antes de ler): fora do tema não entra no texto
    prog(`Triagem de ${comResumo.length} fontes por título e resumo`);
    const decisao = await triar(comResumo, `${e.tema}\n${ideia.slice(0, 1200)}`, llm);
    // PISO: triagem que deixa menos de 12 fontes (havendo mais) está estrita demais — volta quem a busca pôs mais alto
    const PISO = comResumo.length > 12 ? 12 : 0;
    for (let i = 0; i < comResumo.length && decisao.incluir.size < PISO; i++) decisao.incluir.add(i);
    const incluidos = comResumo.filter((_, i) => decisao.incluir.has(i));
    log.excluidosTriagem = comResumo.length - incluidos.length;
    log.motivosExclusao = decisao.motivos.slice(0, 8);
    for (const p of incluidos) reg.registrar(p, p.secao);
  }
  log.incluidos = reg.itens().length;
  // o registro vai pra METODOLOGIA só em trabalho de REVISÃO; com dados do aluno, o método é a coleta e a análise dele
  const registroDeBusca = dados
    ? "(trabalho com dados próprios: a busca de literatura NÃO é método deste trabalho — não a descreva na metodologia)"
    : textoDoRegistro(log);
  const orcamento = textoDoOrcamento(esqueletoSemRefs, e.tipo, !!dados);
  const evs = reg.itens();
  prog(`${evs.length} fontes reunidas`);
  const esbocoComCitas = injetarCandidatas(esboco, evs, rotulos);
  const biblioteca = bibliotecaParaPrompt(evs);

  /** o estado interno: corpo com chaves [E#], por título de seção */
  const corpos = new Map<string, string>();
  const gravadas = new Set<string>();
  const salvar = async (titulo: string, bruto: string) => {
    // as correções DETERMINÍSTICAS, em toda gravação (o que instrução ao modelo não segurou)
    const corpo = dividirParagrafosLongos(semCitacaoRepetida(semTabelaForaDosResultados(titulo, numerosSemLatex(bruto))));
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
      user: JSON.stringify({ plano_intro_revisao: esbocoComCitas.intro_related_work_plan ?? {}, ideia, dados: dados || "(vazio)" }) + `\n\norcamento_de_palavras:\n${orcamento}\n\nregistro_de_busca:\n${registroDeBusca}\n\nevidencias:\n${biblioteca}`,
      temperatura: 0.5, longo: true,
    }).catch((err) => { console.warn("[paper-orquestra] literatura falhou:", (err as Error)?.message); return ""; });
    for (const [t, c] of secoesDoMarkdown(r, daLiteratura)) await salvar(t, c);
  }

  // ─── 3 · seções (SectionWritingAgent) ───
  // "falta" = vazia OU bem abaixo da faixa (< 75% do piso): o agente de literatura escreve introdução e revisão numa
  // chamada só e às vezes economiza numa delas — essa vai pro escritor de seções, que recebe o orçamento
  const faltam = () => nossas.filter((t) => {
    const c = corpos.get(t);
    if (!secaoEscrita(c, /^resumo|abstract/i.test(t) ? 60 : 80)) return true;
    return contarPalavras(c ?? "") < orcamentoDaSecao(t, e.tipo, !!dados)[0] * 0.75;
  });
  const escreverSecoes = async (alvo: string[]) => {
    const r = await llm({
      fase: "secoes", system: PROMPT_SECOES,
      user: [
        `escreva_estas: ${JSON.stringify(alvo)}`,
        `esboco:\n${JSON.stringify({ plotting_plan: esbocoComCitas.plotting_plan ?? [], section_plan: esbocoComCitas.section_plan ?? [] })}`,
        `orcamento_de_palavras:\n${orcamento}`,
        `ideia:\n${ideia}`, `dados:\n${dados || "(vazio)"}`, `registro_de_busca:\n${registroDeBusca}`, `evidencias:\n${biblioteca}`,
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
          `orcamento_de_palavras (teto que a revisão NÃO pode ultrapassar):\n${orcamento}`,
          `dados:\n${dados || "(vazio)"}`, `registro_de_busca:\n${registroDeBusca}`, `evidencias:\n${biblioteca}`,
          `trabalho:\n${trabalhoMd()}`,
        ].join("\n\n"),
        temperatura: 0.4, longo: true,
      }).catch(() => "");
      const lido = lerRefinamento(resp);
      if (!lido) { motivoFim = "revisão ilegível"; break; }
      // o refinamento devolve SÓ as seções que mudou (inteiras): a que não veio fica como estava. Seção que volta
      // com menos de 60% do tamanho é truncamento, não revisão — essa é descartada.
      // e a que passa de 15% acima do teto do orçamento é descartada: responder ao parecer não é motivo pra encher a seção
      const novas = new Map([...secoesDoMarkdown(lido.trabalho, nossas)].filter(([t, c]) =>
        c.length >= (corpos.get(t)?.length ?? 0) * 0.6 && contarPalavras(c) <= orcamentoDaSecao(t, e.tipo, !!dados)[1] * 1.15));
      if (!novas.size) { motivoFim = "revisão sem seção aproveitável"; break; }
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

  // ─── 5 · AUDITORIA DE ENTREGA (o format_agent do PO, com as regras ABNT): checagem de código, um ajuste por seção ───
  let ajustes = 0;
  const auditoria: Record<string, { pendencias: string[]; resultado: string }> = {};
  const visivel = (c: string) => converterCitacoes(c, reg.porChave).texto;
  const auditar = (t: string) => pendenciasDaSecao(t, corpos.get(t) ?? "", { tipo: e.tipo, dados, visivel });
  const ctxAud = { tipo: e.tipo, dados, visivel };
  for (let passada = 1; passada <= 3; passada++) {
    const pendentes = nossas.filter((t) => corpos.has(t) && auditar(t).length);
    if (!pendentes.length || resta() < 90_000) break;
    prog(`Conferindo a entrega (passada ${passada}): ${pendentes.length} ${pendentes.length === 1 ? "seção precisa" : "seções precisam"} de ajuste`);
    await emLotes(pendentes, 2, async (t) => {
      const motivo = (m: string) => { auditoria[t] = { ...auditoria[t]!, resultado: m }; };
      const antes = auditar(t);
      auditoria[t] = { pendencias: antes, resultado: "sem tempo" };
      if (resta() < 60_000) return;
      const atual = corpos.get(t)!;
      // as fontes citadas SÓ nesta seção: se sumirem daqui, somem da bibliografia — o ajuste tem de mantê-las
      const outras = new Set([...corpos].filter(([x]) => x !== t).flatMap(([, c]) => c.match(/E\d+/g) ?? []));
      const soAqui = [...new Set(atual.match(/E\d+/g) ?? [])].filter((k) => !outras.has(k));
      const r = await llm({
        fase: "ajuste", system: PROMPT_AJUSTAR, temperatura: 0.3, longo: true,
        user: [
          `pendencias:\n${antes.map((x) => `- ${x}`).join("\n")}`,
          soAqui.length ? `chaves_que_nao_podem_sumir (citadas só aqui — mantenha cada uma ao menos uma vez): ${soAqui.join(", ")}` : "",
          `dados:\n${dados || "(vazio)"}`, `evidencias:\n${biblioteca}`, `# ${t}\n${atual}`,
        ].filter(Boolean).join("\n\n"),
      }).catch(() => "");
      const nova = secoesDoMarkdown(r, [t]).get(t);
      if (!nova) return motivo("ajuste ilegível");
      const chaves = (x: string) => new Set(x.match(/E\d+/g) ?? []);
      const kAntes = chaves(atual), kDepois = chaves(nova);
      if ([...kDepois].some((k) => !reg.porChave(k))) return motivo("chave inventada"); // descarta
      // fonte "perdida" é só a que some do DOCUMENTO inteiro (citada em outra seção continua na bibliografia)
      const noResto = new Set([...corpos].filter(([x]) => x !== t).flatMap(([, c]) => c.match(/E\d+/g) ?? []));
      const somem = [...kAntes].filter((k) => !kDepois.has(k) && !noResto.has(k)).length;
      if (somem > Math.max(1, kAntes.size * 0.1)) return motivo(`tiraria ${somem} fontes do documento`);
      // fica se APROXIMOU a seção do entregável (não precisa zerar a pendência)
      const dAntes = distanciaDaSecao(t, atual, ctxAud), dDepois = distanciaDaSecao(t, nova, ctxAud);
      if (dDepois >= dAntes) return motivo(`não melhorou (${dAntes} → ${dDepois}): ${pendenciasDaSecao(t, nova, ctxAud).join(" | ").slice(0, 240)}`);
      const depois = pendenciasDaSecao(t, nova, ctxAud);
      auditoria[t] = { pendencias: antes, resultado: depois.length ? `melhorou (${dAntes} → ${dDepois}): ${depois.join(" | ").slice(0, 160)}` : "resolvido" };
      ajustes++;
      await salvar(t, nova);
    });
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
    secoesEscritas: gravadas.size, notaInicial, notaFinal, voltasAceitas, motivoFim, ajustes, auditoria,
  };
  const secoes: Record<string, string> = {};
  for (const [t, c] of corpos) secoes[t] = converterCitacoes(c, reg.porChave).texto;
  return {
    titulo, referencias: referenciasDasChaves(citadas, reg.porChave), relatorio, secoes, registroDeBusca: log, biblioteca: bibliotecaBruta,
    evidencias: evs.map((e) => ({ chave: e.chave, citacao: e.fonte.citacao, abnt: e.fonte.abnt, titulo: e.fonte.titulo ?? "", autores: e.autores, ...(e.ano ? { ano: e.ano } : {}), resumo: e.resumo, secao: e.secao })),
  };
}

export type { Notas };
