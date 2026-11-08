/**
 * lib/orquestra/react.ts — UM agente: laço ReAct com FUNCTION-CALLING NATIVO.
 *
 * Pensar → chamar ferramentas (em paralelo, quantas o modelo pedir) → observar → … → responder.
 * É o laço com que DeepSeek V4, Kimi K2.6 e Tongyi DeepResearch foram treinados; o harness da Aura
 * faz o mesmo com JSON no prompt e no máximo 6 voltas × 3 chamadas. Aqui o teto é o do MOTOR
 * (dezenas de passos), e o freio de verdade é o PRAZO de relógio e o teto de chamadas da caixa.
 *
 * CONTEXTO COMPACTADO (a ideia do Tongyi DeepResearch — "reconstrução markoviana do estado"): em
 * vez de cortar o prompt numa posição fixa (o `slice(0, 4000)` do harness, que jogava fora
 * justamente o texto colado pelo aluno), quando a conversa interna passa do limite as observações
 * ANTIGAS viram só as linhas de evidência ([E#] + título). Nada que possa ser citado se perde — a
 * evidência inteira continua no registro da caixa —, e o modelo segue com o estado, não com o lixo.
 */
import { custoEstimadoUsd } from "@/lib/ai/preco";
import { somarUso, usoZero, type Execucao, type FerramentaVisivel, type UsoMotor } from "@/lib/orquestra/contrato";
import type { Mensagem, ModeloId } from "@/lib/orquestra/provedores";
import type { Prazo } from "@/lib/orquestra/prazo";

export type FerramentaExtra = {
  def: FerramentaVisivel;
  executar(args: unknown, prazo: Prazo): Promise<string>;
};

export type OpcoesAgente = {
  /** quem é, no progresso e no ledger ("DeepSeek V4", "subagente 3 · Kimi") */
  nome: string;
  modelo: ModeloId;
  sistema: string;
  pedido: string;
  maxPassos: number;
  /** fase do TokenLedger ("orquestra", "subagente", "verificador") */
  fase: string;
  taskId: string;
  temperatura?: number;
  maxTokensResposta?: number;
  /** ferramentas só deste agente (o `delegar` do orquestrador do enxame) */
  extras?: FerramentaExtra[];
  /** sem as ferramentas de pesquisa da caixa (o orquestrador que só delega) */
  semCaixa?: boolean;
  /** prazo deste agente (default: o da tarefa) */
  prazo?: Prazo;
  /** tamanho (caracteres) a partir do qual a conversa interna é compactada */
  limiteContexto?: number;
};

export type ResultadoAgente = {
  texto: string;
  passos: number;
  chamadasDeFerramenta: number;
  uso: UsoMotor;
  modelos: string[];
  /** terminou por prazo/teto em vez de concluir sozinho */
  forcado: boolean;
};

/** reserva de tempo pro último passo (a resposta final sem ferramentas) */
const RESERVA_FINAL_MS = 25_000;

export function tamanhoDaConversa(msgs: Mensagem[]): number {
  let n = 0;
  for (const m of msgs) {
    n += typeof m.content === "string" ? m.content.length : 0;
    if (m.role === "assistant") n += (m.reasoning_content?.length ?? 0) + JSON.stringify(m.tool_calls ?? []).length;
  }
  return n;
}

/**
 * PURA. Compacta as observações antigas (todas menos as `manter` últimas mensagens de ferramenta)
 * em linhas de evidência, e encurta o raciocínio antigo. A estrutura (assistant → tool) não muda —
 * a API recusa tool_call sem resposta —, só o conteúdo.
 */
export function compactar(msgs: Mensagem[], manter = 4): Mensagem[] {
  const idxTools = msgs.map((m, i) => (m.role === "tool" ? i : -1)).filter((i) => i >= 0);
  const antigas = new Set(idxTools.slice(0, Math.max(0, idxTools.length - manter)));
  const ultimoAssistente = msgs.map((m) => m.role).lastIndexOf("assistant");
  return msgs.map((m, i) => {
    if (m.role === "tool" && antigas.has(i)) {
      if (m.content.startsWith("[compactado]")) return m;
      const linhas = m.content.split("\n").filter((l) => /^\[E\d+\]/.test(l)).slice(0, 10).map((l) => l.slice(0, 160));
      return { ...m, content: `[compactado] ${linhas.length ? "evidências desta consulta:\n" + linhas.join("\n") : "sem evidência nova"}` };
    }
    if (m.role === "assistant" && i < ultimoAssistente && m.reasoning_content && m.reasoning_content.length > 1500) {
      return { ...m, reasoning_content: m.reasoning_content.slice(0, 1500) + "…" };
    }
    return m;
  });
}

export async function rodarAgente(o: OpcoesAgente, x: Execucao): Promise<ResultadoAgente> {
  const prazo = o.prazo ?? x.prazo;
  const limite = o.limiteContexto ?? 120_000;
  const extras = new Map((o.extras ?? []).map((e) => [e.def.name, e]));
  const ferramentas = [...(o.semCaixa ? [] : x.caixa.visiveis()), ...(o.extras ?? []).map((e) => e.def)];
  let msgs: Mensagem[] = [{ role: "system", content: o.sistema }, { role: "user", content: o.pedido }];
  let uso = usoZero();
  const modelos = new Set<string>();
  let chamadasDeFerramenta = 0;
  let cutucou = false;

  const chamar = async (comFerramentas: boolean) => {
    const r = await x.chamar({
      modelo: o.modelo,
      mensagens: msgs,
      ferramentas: comFerramentas && ferramentas.length ? ferramentas : undefined,
      temperatura: o.temperatura,
      maxTokens: o.maxTokensResposta,
      prazo,
      ledger: { ...x.ledger, taskId: o.taskId, phase: o.fase },
    });
    modelos.add(r.modelo);
    uso = somarUso(uso, {
      promptTokens: r.uso.promptTokens + r.uso.cachedTokens,
      completionTokens: r.uso.completionTokens,
      chamadas: 1,
      custoUsd: custoEstimadoUsd(r.modelo, r.uso),
    });
    return r;
  };

  for (let passo = 1; passo <= o.maxPassos; passo++) {
    if (prazo.restante() < RESERVA_FINAL_MS) break;
    if (tamanhoDaConversa(msgs) > limite) msgs = compactar(msgs);

    const r = await chamar(true);
    if (!r.chamadas.length) {
      const texto = r.conteudo.trim();
      if (texto) return { texto, passos: passo, chamadasDeFerramenta, uso, modelos: [...modelos], forcado: false };
      if (cutucou) break;
      // resposta vazia sem ferramenta: uma cutucada, depois força a conclusão
      cutucou = true;
      msgs.push({ role: "user", content: "Sua última resposta veio vazia. Continue: chame uma ferramenta ou escreva a resposta final." });
      continue;
    }

    msgs.push({
      role: "assistant",
      content: r.conteudo || null,
      tool_calls: r.chamadas.map((c) => ({ id: c.id, type: "function" as const, function: { name: c.nome, arguments: c.bruto || JSON.stringify(c.args ?? {}) } })),
      ...(r.raciocinio ? { reasoning_content: r.raciocinio } : {}),
    });
    const respostas = await Promise.all(r.chamadas.map(async (c) => {
      chamadasDeFerramenta++;
      x.emitir({ fase: "ferramenta", rotulo: rotuloDaChamada(c.nome, c.args), agente: o.nome });
      const extra = extras.get(c.nome);
      const conteudo = extra ? await extra.executar(c.args, prazo) : await x.caixa.executar(c.nome, c.args, o.nome, prazo);
      return { role: "tool" as const, tool_call_id: c.id, content: conteudo };
    }));
    msgs.push(...respostas);
  }

  // CONCLUSÃO FORÇADA (teto de passos, prazo apertando ou resposta vazia): sem ferramentas, com o que tem.
  if (tamanhoDaConversa(msgs) > limite) msgs = compactar(msgs, 2);
  msgs.push({ role: "user", content: "Hora de concluir. Sem chamar ferramentas, escreva AGORA a resposta final completa com a evidência que já reuniu, citando só as chaves [E#] que apareceram." });
  const final = await chamar(false);
  return { texto: final.conteudo.trim(), passos: o.maxPassos, chamadasDeFerramenta, uso, modelos: [...modelos], forcado: true };
}

/** "literature_search: CRISPR em plantas" — o rótulo que o aluno vê no progresso */
export function rotuloDaChamada(nome: string, args: unknown): string {
  const a = (args && typeof args === "object" ? args : {}) as Record<string, unknown>;
  const alvo = a.query ?? a.url ?? a.titulo ?? a.instrucao ?? (Array.isArray(a.tarefas) ? `${a.tarefas.length} tarefas` : "");
  const sufixo = typeof alvo === "string" && alvo.trim() ? `: ${alvo.trim().slice(0, 80)}` : "";
  return `${nome}${sufixo}`;
}
