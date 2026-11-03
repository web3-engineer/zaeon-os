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
import { aplicarNoTcc, marcarStatus } from "@/lib/tcc/store";
import { chaveTitulo, type OpSecao, type Secao } from "@/lib/tcc/secoes";
import { escritaPorSecaoLigada } from "@/lib/documento/escritor";

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
async function gerarPorSecao(workId: string, userId: string, topic: string, gen: Gen): Promise<void> {
  const { getTccForUser } = await import("@/lib/tcc/store");
  const { planoDoDocumento } = await import("@/lib/documento/plano");
  const { escreverDocumento, esqueletoEnriquecido, promptDaSecao } = await import("@/lib/documento/escritor");
  const { gerar } = await import("@/lib/llm/envelope");

  // O norte: uma chamada, e se ela falhar a escrita segue sem ela (o tema já basta pra começar).
  const d = await gen(ESBOCO_SYS, esbocoUser(topic)).catch(() => null);
  const titulo = d?.titulo?.trim() ? d.titulo.trim().slice(0, 200) : undefined;
  if (titulo) await aplicarNoTcc(workId, userId, [], "estudos", { titulo }).catch(() => undefined);

  const atual = await getTccForUser(workId, userId);
  if (!atual) throw new Error("documento não encontrado");

  const plano = planoDoDocumento(esqueletoEnriquecido(atual.secoes.map((s) => s.titulo)));
  // Lido UMA vez, antes de escrever: o que o aluno já tinha escrito não se sobrescreve.
  const jaCheias = new Set(atual.secoes.filter((s) => s.corpo.trim()).map((s) => s.titulo));

  const r = await escreverDocumento(
    {
      escrever: async (p) => {
        const { sys, user } = promptDaSecao(p);
        const res = await gerar({
          system: sys, user, temperature: 0.5, pensar: "low", timeoutMs: 60_000,
          ctx: { agentKey: "zaeon", surface: "estudos" as const, phase: "tcc-secao" },
        });
        return res.texto;
      },
      // Uma operação por seção: o poll do cliente vê o documento crescer, e cada pedaço entra no
      // histórico com a sua própria linha (igual ao caminho antigo).
      salvar: async (u, corpo) => {
        const res = await aplicarNoTcc(workId, userId, (t) => {
          const s = t.secoes.find((x) => x.titulo === u.slot.titulo);
          return s ? [{ op: "substituir" as const, secaoId: s.id, corpo }] : [];
        }, "estudos");
        return res.ok;
      },
      jaEscrita: (u) => jaCheias.has(u.slot.titulo),
    },
    { tema: topic, tipo: String(atual.workType ?? "TCC"), plano, norte: d as Record<string, string | undefined> | null },
  );

  console.info(`[tcc] F2 ${workId}: ${r.escritas} escritas, ${r.aFazer} a fazer, ${r.puladas} puladas`);
  await marcarStatus(workId, userId, "pronto");
}

export async function gerarTccEmBackground(workId: string, userId: string, topic: string, gen: Gen = genPadrao): Promise<void> {
  try {
    if (escritaPorSecaoLigada()) return await gerarPorSecao(workId, userId, topic, gen);
    const d = await gen(ESBOCO_SYS, esbocoUser(topic));
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
