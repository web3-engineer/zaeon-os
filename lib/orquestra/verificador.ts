/**
 * lib/orquestra/verificador.ts — o PORTÃO DE QUALIDADE único, aplicado à saída de QUALQUER motor.
 *
 * É o que garante que o aluno PRO/MAX recebe o padrão Zaeon venha a resposta do Kimi, do DeepSeek
 * ou do Tongyi. Duas camadas:
 *
 *  1. DETERMINÍSTICA (sempre, custo zero): citação só por chave que existe no registro. Chave
 *     inventada ([E99] que nenhuma ferramenta devolveu) é CORTADA do texto e contada. Mede a
 *     cobertura: quantos parágrafos substantivos têm pelo menos uma fonte.
 *  2. GLOBAL POR MODELO (MiroThinker-H1 "global verifier"; opcional, MAX): um modelo lê o texto
 *     contra a lista de evidências e aponta afirmação sem lastro, citação que não sustenta o que
 *     diz e contradição. Se reprovar e houver tempo, UMA revisão, e a camada 1 roda de novo.
 */
import { custoEstimadoUsd } from "@/lib/ai/preco";
import { somarUso, usoZero, type Evidencia, type Execucao, type UsoMotor } from "@/lib/orquestra/contrato";
import type { ModeloId } from "@/lib/orquestra/provedores";
import { REGRAS_DE_CITACAO } from "@/lib/orquestra/prompts";

export type Veredito = {
  texto: string;
  citadas: string[];
  invalidas: string[];
  /** parágrafos substantivos com ≥ 1 citação válida / parágrafos substantivos (1 quando não há parágrafo) */
  cobertura: number;
};

const CHAVE = /\[(E\d+(?:\s*[,;]\s*E\d+)*)\]/g;

/** "[E3, E5]" → "[E3][E5]" — os modelos variam o formato; o resto do código só lê a forma canônica */
export function normalizarCitacoes(texto: string): string {
  return texto.replace(CHAVE, (_m, grupo: string) => grupo.split(/\s*[,;]\s*/).map((k) => `[${k.trim()}]`).join(""));
}

export function verificarCitacoes(texto: string, evidencias: readonly Evidencia[]): Veredito {
  const validas = new Set(evidencias.map((e) => e.chave));
  const invalidas = new Set<string>();
  const citadas: string[] = [];
  const limpo = normalizarCitacoes(texto)
    .replace(/\[(E\d+)\]/g, (m, k: string) => {
      if (validas.has(k)) {
        if (!citadas.includes(k)) citadas.push(k);
        return m;
      }
      invalidas.add(k);
      return "";
    })
    .replace(/[ \t]+([.,;:])/g, "$1");

  const paragrafos = limpo.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length >= 120 && !p.startsWith("#"));
  const comFonte = paragrafos.filter((p) => /\[E\d+\]/.test(p)).length;
  return { texto: limpo.trim(), citadas, invalidas: [...invalidas], cobertura: paragrafos.length ? comFonte / paragrafos.length : 1 };
}

export type RevisaoGlobal = { veredito: Veredito; aprovado: boolean; problemas: string[]; revisou: boolean; uso: UsoMotor };

function listaDeEvidencias(evidencias: readonly Evidencia[], max = 60): string {
  return evidencias.slice(0, max).map((e) => `[${e.chave}] ${e.claim.replace(/\s+/g, " ").slice(0, 300)}${e.source?.title ? ` — ${e.source.title}` : ""}`).join("\n");
}

function lerJson(s: string): any {
  try { return JSON.parse(s); } catch { /* segue */ }
  const m = s.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* segue */ } }
  return null;
}

/**
 * Camada 2. Nunca lança: verificador fora do ar = aprovado pela camada 1 (o texto já passou pelo
 * portão de citação), com o problema registrado. Não deixa o verificador derrubar uma entrega boa.
 */
export async function revisarGlobal(
  texto: string,
  evidencias: readonly Evidencia[],
  x: Execucao,
  o: { modelo: ModeloId; taskId: string; objetivo: string; revisor?: ModeloId },
): Promise<RevisaoGlobal> {
  let uso = usoZero();
  const somar = (r: { modelo: string; uso: import("@/lib/llm/usage").Usage }) => {
    uso = somarUso(uso, { promptTokens: r.uso.promptTokens + r.uso.cachedTokens, completionTokens: r.uso.completionTokens, chamadas: 1, custoUsd: custoEstimadoUsd(r.modelo, r.uso) });
  };
  const v1 = verificarCitacoes(texto, evidencias);
  if (x.prazo.restante() < 45_000) return { veredito: v1, aprovado: true, problemas: ["sem tempo para a verificação global"], revisou: false, uso };

  let problemas: string[] = [];
  try {
    const r = await x.chamar({
      modelo: o.modelo, json: true, temperatura: 0, maxTokens: 1_500, prazo: x.prazo,
      ledger: { ...x.ledger, taskId: o.taskId, phase: "verificador" },
      mensagens: [
        { role: "system", content: "Você é o verificador de qualidade da Zaeon. Leia o TEXTO contra as EVIDÊNCIAS e responda SÓ um JSON: " +
          '{"aprovado": boolean, "problemas": [string]}. Problema = afirmação factual importante sem chave, chave que não sustenta o que a frase diz, ' +
          "contradição interna, ou pedido do aluno não atendido. Seja estrito mas não pedante: estilo não é problema. Máximo 8 problemas." },
        { role: "user", content: `PEDIDO:\n${o.objetivo.slice(0, 1500)}\n\nEVIDÊNCIAS:\n${listaDeEvidencias(evidencias)}\n\nTEXTO:\n${v1.texto.slice(0, 24_000)}` },
      ],
    });
    somar(r);
    const j = lerJson(r.conteudo);
    problemas = Array.isArray(j?.problemas) ? j.problemas.map((p: unknown) => String(p).slice(0, 300)).slice(0, 8) : [];
    if (j?.aprovado === true || !problemas.length) return { veredito: v1, aprovado: true, problemas, revisou: false, uso };
  } catch (e) {
    return { veredito: v1, aprovado: true, problemas: [`verificador indisponível: ${String((e as Error)?.message ?? e).slice(0, 120)}`], revisou: false, uso };
  }

  if (x.prazo.restante() < 60_000) return { veredito: v1, aprovado: false, problemas, revisou: false, uso };
  try {
    x.emitir({ fase: "verificador", rotulo: `Revisando ${problemas.length} ponto(s) apontado(s) pelo verificador` });
    const r = await x.chamar({
      modelo: o.revisor ?? o.modelo, temperatura: 0.3, maxTokens: 8_000, prazo: x.prazo,
      ledger: { ...x.ledger, taskId: o.taskId, phase: "revisao" },
      mensagens: [
        { role: "system", content: `Você revisa um texto acadêmico da Zaeon. Corrija SÓ os problemas apontados, mantendo estrutura, tom e as citações corretas. Devolva o texto inteiro revisado.\n\n${REGRAS_DE_CITACAO}` },
        { role: "user", content: `PROBLEMAS:\n- ${problemas.join("\n- ")}\n\nEVIDÊNCIAS:\n${listaDeEvidencias(evidencias)}\n\nTEXTO:\n${v1.texto}` },
      ],
    });
    somar(r);
    const revisado = r.conteudo.trim();
    // revisão que encolheu demais é revisão que quebrou: fica a original
    if (!revisado || revisado.length < v1.texto.length * 0.5) return { veredito: v1, aprovado: false, problemas, revisou: false, uso };
    return { veredito: verificarCitacoes(revisado, evidencias), aprovado: false, problemas, revisou: true, uso };
  } catch {
    return { veredito: v1, aprovado: false, problemas, revisou: false, uso };
  }
}
