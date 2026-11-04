/**
 * Geração do TCC a partir de um TÓPICO ("gerar pesquisa" / POST /api/tcc) — roda SOLTA, no padrão
 * do Studio (lib/studio/text-pipeline.ts): a rota cria o work como "gerando", dispara isto com
 * `void` e responde na hora; o cliente faz poll em GET /api/tcc/:id. No VPS (Node de processo
 * longo) a promise continua mesmo que o aluno troque de aba.
 *
 * Escreve SEÇÃO POR SEÇÃO (uma operação de cada vez, origem "estudos"): o poll vê o documento
 * crescer, e cada pedaço entra no histórico com a sua própria linha.
 */
import { geminiJson } from "@/lib/scholar/gemini";
import { ESBOCO_SYS, esbocoUser, type DraftJson } from "@/lib/research/esboco";
import type { Briefing } from "@/lib/tcc/briefing";
import { aplicarNoTcc, marcarStatus, referenciasNovas, type FonteVerificada } from "@/lib/tcc/store";
import { fontesCitadas, type FonteDoc } from "@/lib/documento/fontes";
import { chaveTitulo, type OpSecao, type Secao } from "@/lib/tcc/secoes";
import { escritaPorSecaoLigada } from "@/lib/documento/escritor";
import type { ResultadoSalvar } from "@/lib/documento/escritor";

type Gen = (sys: string, user: string) => Promise<DraftJson>;
const genPadrao: Gen = (sys, user) =>
  geminiJson<DraftJson>(sys, user, { temperature: 0.4, timeoutMs: Number(process.env.SCHOLAR_GEMINI_TIMEOUT_MS || 30000) });

/** Esboço → corpo por título de seção do esqueleto (sem inventar seções que o esqueleto não tem). */
export function corposDoEsboco(d: DraftJson): Record<string, string> {
  const intro = [
    d.introducao?.trim(),
    d.objetivos?.trim() ? `Objetivos\n\n${d.objetivos.trim()}` : "",
    d.justificativa?.trim() ? `Justificativa\n\n${d.justificativa.trim()}` : "",
    d.palavrasChave?.trim() ? `Palavras-chave: ${d.palavrasChave.trim()}` : "",
  ].filter(Boolean).join("\n\n");
  return {
    [chaveTitulo("INTRODUÇÃO")]: intro,
    [chaveTitulo("METODOLOGIA")]: d.metodologia?.trim() ?? "",
    [chaveTitulo("REFERÊNCIAS")]: d.referencias?.trim() ?? "",
  };
}

/** As operações que preenchem só seções VAZIAS (o aluno pode ter escrito algo no meio do caminho). */
export function opsDoEsboco(secoes: Secao[], d: DraftJson): OpSecao[] {
  const corpos = corposDoEsboco(d);
  return secoes
    .filter((s) => !s.corpo.trim() && corpos[chaveTitulo(s.titulo)]?.trim())
    .map((s) => ({ op: "substituir" as const, secaoId: s.id, corpo: corpos[chaveTitulo(s.titulo)] }));
}

/**
 * F2 (docs/PLANO_DOCUMENTO_COMPLETO.md): UMA CHAMADA POR SEÇÃO, com o esqueleto mandando.
 *
 * O esboço continua, mas vira só o NORTE (título, objetivos, metodologia) — não é mais ele que
 * preenche o documento. Quem escreve é `escreverDocumento`, seção por seção, com o rascunho-até-
 * agora no pedido. As seções vêm dos TÍTULOS GRAVADOS (a autoridade), enriquecidos com os
 * subtítulos do template: é por isso que REFERENCIAL TEÓRICO passa a sair com "Conceitos
 * Fundamentais" e "Estado da Arte" dentro, em vez de vazio como hoje.
 *
 * Vai pelo ENVELOPE (lib/llm/envelope), não pelo Vertex direto: são ~5 chamadas por documento, e
 * no envelope elas pegam o pool grátis, a reserva do HF e o ledger.
 */
/**
 * D1/D2 · AS FONTES DO TRABALHO, reunidas UMA vez pro documento inteiro.
 *
 * Nenhuma chamada de MODELO aqui: `retrievePapers` fala com OpenAlex/Crossref/arXiv/PubMed, e a
 * base é uma consulta SQL. É o que faltava pro escritor — sem fonte na mão, o `sys` dele só podia
 * marcar ⟨sem fonte⟩, e o documento nascia inteiro marcado.
 *
 * Nunca lança: documento sem fonte continua sendo gerado (marcado), que é melhor que não gerar.
 */
async function fontesDoTrabalho(userId: string, topic: string, brief?: Briefing): Promise<{ fontes: FonteDoc[]; quadro?: string }> {
  /**
   * REFERÊNCIAS DO PEDIDO SUBSTITUEM A BUSCA (decisão do dono, 2026-11-04). Quando o pedido diz
   * "limite-se estritamente a estas", buscar mais literatura não é zelo — é desobedecer, e foi uma
   * das causas do documento que saiu errado em produção: o `retrievePapers` recebia a instrução
   * truncada como consulta e devolvia fontes sem relação, que o `sys` do escritor então mandava
   * citar. Aqui não há chamada de rede nenhuma: as fontes são o que a pessoa escreveu.
   *
   * Sem quadro, e de propósito: o quadro é "papers por ano" contado da BUSCA. Sem busca não há
   * contagem, e inventar uma a partir dos anos de 5 referências seria número sem lastro.
   */
  if (brief?.referencias.length) {
    const { fonteDoPedido, juntarFontes } = await import("@/lib/documento/fontes");
    const fontes = juntarFontes(brief.referencias.map((r) => fonteDoPedido(r)));
    console.info(`[tcc] fontes do PEDIDO: ${fontes.length} (busca de literatura NÃO rodou — o pedido limitou)`);
    return { fontes };
  }
  const [papers, base] = await Promise.all([
    import("@/lib/scholar/retrieve")
      .then((m) => m.retrievePapers(topic, { minResults: 6 }))
      .then((r) => r.papers ?? [])
      .catch((e) => { console.warn("[tcc] literatura falhou:", (e as Error)?.message); return []; }),
    import("@/lib/rag/turno")
      .then((m) => m.baseParaTurno({ userId, pergunta: topic }))
      .then((b) => (b.status === "ok" ? b.trechos : []))
      .catch((e) => { console.warn("[tcc] base falhou:", (e as Error)?.message); return []; }),
  ]);
  const { fonteDePaper, fonteDeDocumento, juntarFontes } = await import("@/lib/documento/fontes");
  // a base do ALUNO vem primeiro: é a bibliografia que ele escolheu, e o teto é curto
  const fontes = juntarFontes(
    base.map((t) => fonteDeDocumento({
      titulo: t.titulo,
      paginas: t.paginaIni === t.paginaFim ? String(t.paginaIni ?? "") : `${t.paginaIni}–${t.paginaFim}`,
      extrato: t.texto,
    })),
    papers.map((p) => fonteDePaper({
      title: p.title,
      authors: p.authors?.join(", "),
      year: p.year,
      ...(p.url ? { url: p.url } : {}),
      ...(p.doi ? { doi: p.doi } : {}),
    })),
  );
  // D5 · o MESMO número que vira gráfico no chat vira QUADRO no documento (lib/agent/grafico):
  // papers por ano, com a linha de fonte. Zero chamada de modelo — é contagem do que já veio.
  const { graficoPapersPorAno } = await import("@/lib/agent/graficosDoTurno");
  const { tabelaDoGrafico } = await import("@/lib/agent/grafico");
  const g = graficoPapersPorAno(papers.map((p) => ({ year: p.year })));
  const quadro = g
    ? tabelaDoGrafico({ forma: "barras", titulo: g.titulo, fonte: g.fonte, pontos: [...g.pontos] }) ?? undefined
    : undefined;
  console.info(`[tcc] fontes do trabalho: ${fontes.length} (${base.length} da base, ${papers.length} papers)${quadro ? " + quadro" : ""}`);
  return { fontes, ...(quadro ? { quadro } : {}) };
}

async function gerarPorSecao(workId: string, userId: string, topic: string, gen: Gen, brief?: Briefing): Promise<void> {
  const { getTccForUser } = await import("@/lib/tcc/store");
  const { planoDoDocumento } = await import("@/lib/documento/plano");
  const { ehCorpoAFazer, escreverDocumento, esqueletoEnriquecido, promptDaSecao } =
    await import("@/lib/documento/escritor");
  const { gerar } = await import("@/lib/llm/envelope");
  const { gatewayLigado } = await import("@/lib/llm/usage");
  const { MODELO_POOL } = await import("@/lib/llm/pool");
  const { GEMINI_MODEL_FLASH } = await import("@/lib/ai/model");

  // O norte: uma chamada, e se ela falhar a escrita segue sem ela (o tema já basta pra começar).
  // O esboço deixa de receber 160 caracteres truncados: num briefing ele vê o PEDIDO INTEIRO e as
  // referências exigidas (o `esbocoUser` sempre teve o parâmetro `refs` — nunca recebia nada).
  const d = await gen(ESBOCO_SYS, esbocoUser(brief?.instrucoes || topic, brief?.referencias ?? [])).catch(() => null);
  const titulo = d?.titulo?.trim() ? d.titulo.trim().slice(0, 200) : undefined;
  if (titulo) await aplicarNoTcc(workId, userId, [], "estudos", { titulo }).catch(() => undefined);

  const atual = await getTccForUser(workId, userId);
  if (!atual) throw new Error("documento não encontrado");

  const { fontes, quadro } = await fontesDoTrabalho(userId, topic, brief);
  // o que cada seção CITOU de verdade — vira a seção REFERÊNCIAS no fim (D2)
  const citadas: FonteVerificada[] = [];

  const plano = planoDoDocumento(esqueletoEnriquecido(atual.secoes.map((s) => s.titulo), atual.workType));
  // Pré-checagem barata, só pra não gastar uma chamada numa seção que já tem texto. A TRAVA de
  // verdade é no `salvar`, contra o estado fresco — este retrato envelhece durante a geração.
  const jaCheias = new Set(atual.secoes.filter((s) => s.corpo.trim() && !ehCorpoAFazer(s.corpo)).map((s) => s.titulo));

  // Pool grátis quando o gateway está de pé (padrão de lib/chore/tools.ts): são ~5 chamadas por
  // documento, e sem `rota` o envelope vai pro Vertex PAGO por default.
  const rota = gatewayLigado() ? ("gateway" as const) : ("vertex" as const);

  const r = await escreverDocumento(
    {
      escrever: async (p) => {
        const { sys, user } = promptDaSecao(p);
        const res = await gerar({
          system: sys, user, rota, model: rota === "gateway" ? MODELO_POOL : GEMINI_MODEL_FLASH,
          temperature: 0.5, pensar: "low", timeoutMs: 60_000,
          ctx: { agentKey: "zaeon", surface: "estudos" as const, phase: "tcc-secao" },
        });
        return res.texto;
      },
      // Uma operação por seção: o poll do cliente vê o documento crescer, e cada pedaço entra no
      // histórico com a sua própria linha (igual ao caminho antigo).
      salvar: async (u, corpo) => {
        // A decisão de sobrescrever é tomada DENTRO do callback, sobre o `t` que o `aplicarNoTcc`
        // acabou de reler — é a mesma garantia que o caminho antigo tinha (ele avaliava
        // `opsDoEsboco(t.secoes, …)` aqui dentro) e que um retrato de antes do laço perderia.
        let motivo: ResultadoSalvar = "falhou";
        const res = await aplicarNoTcc(workId, userId, (t) => {
          const s = t.secoes.find((x) => x.titulo === u.slot.titulo);
          if (!s) return [];
          // Corpo do aluno vence. Nosso próprio stub ⟨a escrever⟩ não: sobrescrevê-lo é justamente
          // como uma nova rodada completa um documento que saiu marcado.
          if (s.corpo.trim() && !ehCorpoAFazer(s.corpo)) { motivo = "ja_escrita"; return []; }
          motivo = "gravou";
          // D2 · o elo: o que esta seção citou entra na bibliografia. Casamento pela string EXATA
          // que o prompt mandou usar, então nada entra em REFERÊNCIAS sem ter sido citado.
          for (const f of fontesCitadas(corpo, fontes)) {
            if (!citadas.some((c) => c.abnt === f.abnt)) citadas.push(f);
          }
          return [{ op: "substituir" as const, secaoId: s.id, corpo }];
        }, "estudos");
        return res.ok ? motivo : "falhou";
      },
      jaEscrita: (u) => jaCheias.has(u.slot.titulo),
    },
    {
      tema: brief?.ehBriefing ? (d?.titulo?.trim() || topic) : topic,
      tipo: String(atual.workType ?? "TCC"), plano,
      norte: d as Record<string, string | undefined> | null, fontes,
      ...(quadro ? { quadro } : {}),
      ...(brief?.ehBriefing ? { briefing: brief } : {}),
    },
  );

  // D2 · REFERÊNCIAS: o trilho já existia (`referenciasNovas` + a seção ABNT do template) e só não
  // era chamado por aqui. Dedupe é dele; a gente só não escreve quando não há o que escrever.
  if (citadas.length) {
    await aplicarNoTcc(workId, userId, (t) => {
      const { secao, novas } = referenciasNovas(t.secoes, citadas);
      if (!secao || !novas.length) return [];
      const corpo = [secao.corpo.trim(), ...novas].filter(Boolean).join("\n");
      return [{ op: "substituir" as const, secaoId: secao.id, corpo }];
    }, "estudos").catch((e) => console.warn("[tcc] referências falharam:", (e as Error)?.message));
  }

  console.info(`[tcc] F2 ${workId}: ${r.escritas} escritas, ${r.aFazer} a fazer, ${r.puladas} puladas, ${citadas.length} referências`);
  await marcarStatus(workId, userId, "pronto");
}

export async function gerarTccEmBackground(workId: string, userId: string, topic: string, gen: Gen = genPadrao, brief?: Briefing): Promise<void> {
  try {
    if (escritaPorSecaoLigada()) return await gerarPorSecao(workId, userId, topic, gen, brief);
    const d = await gen(ESBOCO_SYS, esbocoUser(brief?.instrucoes || topic, brief?.referencias ?? []));
    const titulo = d?.titulo?.trim() ? d.titulo.trim().slice(0, 200) : undefined;
    // Uma seção por vez: o poll do cliente vê o documento crescendo.
    let primeira = true;
    for (;;) {
      let feita = false;
      const r = await aplicarNoTcc(workId, userId, (t) => {
        const prox = opsDoEsboco(t.secoes, d)[0];
        feita = !!prox;
        return prox ? [prox] : [];
      }, "estudos", primeira && titulo ? { titulo } : undefined);
      primeira = false;
      if (!r.ok || !feita) break;
    }
    await marcarStatus(workId, userId, "pronto");
  } catch (e: any) {
    console.warn("[tcc] geração falhou:", e?.message ?? e);
    await marcarStatus(workId, userId, "erro").catch(() => {});
  }
}
