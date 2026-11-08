/**
 * lib/orquestra/enxame.ts — o RUNTIME DE ENXAME da Zaeon.
 *
 * Por que é nosso e não "o enxame do Kimi": o Agent Swarm do Kimi é um orquestrador TREINADO (PARL)
 * a decompor tarefas e criar subagentes — mas quem executa os subagentes é o runtime do app deles.
 * Pela API não há enxame confirmado, e os pesos (~594 GB) não cabem na nossa infra. Então a Zaeon
 * fornece o runtime: dá ao orquestrador a ferramenta `delegar`, roda os subagentes em PARALELO com
 * CONTEXTO ISOLADO (cada um vê só a sua parte — a lição do open_deep_research e do PARL), e devolve
 * ao orquestrador só os RELATÓRIOS COMPACTOS. Um Kimi K2.6 como orquestrador usa isso como foi
 * treinado; qualquer outro modelo usa porque o prompt manda (e a arena diz quem faz melhor).
 *
 * O enxame pode ser MISTO: cada subagente pode ser de um laboratório diferente (trabalhadores em
 * rodízio) — é a forma mais barata de pôr arquiteturas diferentes trabalhando juntas na mesma tarefa.
 *
 * Todos compartilham a MESMA caixa: o registro de evidência é um só, as chaves [E#] são globais e
 * a fonte achada por dois subagentes vira uma referência só.
 */
import { somarUso, type Execucao, type ResultadoMotor, type Tarefa } from "@/lib/orquestra/contrato";
import { rodarAgente, type FerramentaExtra } from "@/lib/orquestra/react";
import { MODELOS, type ModeloId } from "@/lib/orquestra/provedores";
import { pedidoDaTarefa, sistemaDoOrquestrador, sistemaDoSubagente } from "@/lib/orquestra/prompts";
import { ehPrazo } from "@/lib/orquestra/prazo";

export type OpcoesEnxame = {
  nome: string;
  orquestrador: ModeloId;
  /** em rodízio: subagente i usa trabalhadores[i % n] */
  trabalhadores: ModeloId[];
  passosOrquestrador?: number;
  passosSubagente?: number;
  concorrencia?: number;
};

const MAX_RELATORIO = 2_800;

/** roda `fns` com no máximo `n` ao mesmo tempo, preservando a ordem dos resultados */
export async function emParalelo<T>(fns: Array<() => Promise<T>>, n: number): Promise<T[]> {
  const out: T[] = new Array(fns.length);
  let proximo = 0;
  const trabalhador = async () => {
    while (proximo < fns.length) {
      const i = proximo++;
      out[i] = await fns[i]();
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, fns.length)) }, trabalhador));
  return out;
}

type ParteDelegada = { titulo: string; instrucao: string };

export function lerPartes(args: unknown, restantes: number): ParteDelegada[] {
  const a = (args && typeof args === "object" ? args : {}) as { tarefas?: unknown };
  const lista = Array.isArray(a.tarefas) ? a.tarefas : [];
  return lista
    .map((t: any) => ({ titulo: String(t?.titulo ?? t?.title ?? "").trim().slice(0, 120), instrucao: String(t?.instrucao ?? t?.instruction ?? t?.descricao ?? "").trim().slice(0, 1500) }))
    .filter((t) => t.titulo || t.instrucao)
    .map((t) => ({ titulo: t.titulo || t.instrucao.slice(0, 60), instrucao: t.instrucao || t.titulo }))
    .slice(0, Math.max(0, restantes));
}

export async function rodarEnxame(t: Tarefa, x: Execucao, o: OpcoesEnxame): Promise<ResultadoMotor> {
  const concorrencia = o.concorrencia ?? (Number(x.env.ORQ_ENXAME_CONCORRENCIA) > 0 ? Number(x.env.ORQ_ENXAME_CONCORRENCIA) : 6);
  let criados = 0;
  let usoSub = { promptTokens: 0, completionTokens: 0, chamadas: 0, custoUsd: 0 };
  const modelosSub = new Set<string>();
  let falhas = 0;

  const delegar: FerramentaExtra = {
    def: {
      name: "delegar",
      description: "Cria subagentes de pesquisa que trabalham EM PARALELO, cada um com contexto isolado, e devolve o relatório de cada um. " +
        `No máximo ${x.maxSubagentes} subagentes no total nesta tarefa (somando todas as chamadas).`,
      parameters: {
        type: "object",
        properties: {
          tarefas: {
            type: "array",
            description: "As partes independentes. Cada instrução deve ser autossuficiente.",
            items: {
              type: "object",
              properties: {
                titulo: { type: "string", description: "nome curto da parte" },
                instrucao: { type: "string", description: "o que pesquisar, em que recorte, que pergunta responder" },
              },
              required: ["titulo", "instrucao"],
            },
          },
        },
        required: ["tarefas"],
      },
    },
    async executar(args, prazo) {
      const partes = lerPartes(args, x.maxSubagentes - criados);
      if (!partes.length) {
        return criados >= x.maxSubagentes
          ? `O limite de ${x.maxSubagentes} subagentes desta tarefa já foi usado. Escreva a entrega final com os relatórios que tem.`
          : "Nenhuma parte válida. Mande `tarefas` como lista de {titulo, instrucao}.";
      }
      const base = criados;
      criados += partes.length;
      x.emitir({ fase: "enxame", rotulo: `${o.nome} criou ${partes.length} subagente${partes.length > 1 ? "s" : ""} (total ${criados})`, agente: o.nome });
      // cada subagente ganha uma FATIA do tempo que resta — nunca o prazo inteiro, senão o
      // orquestrador fica sem tempo de escrever a síntese
      const fatia = Math.max(30_000, Math.floor(prazo.restante() * 0.55));
      const relatorios = await emParalelo(partes.map((parte, i) => async () => {
        const numero = base + i + 1;
        const modelo = o.trabalhadores[(numero - 1) % o.trabalhadores.length];
        const nome = `subagente ${numero} · ${MODELOS[modelo].nome}`;
        const prazoSub = prazo.filho(fatia, nome);
        try {
          x.emitir({ fase: "subagente", rotulo: `${nome}: ${parte.titulo}`, agente: nome });
          const r = await rodarAgente({
            nome, modelo, fase: "subagente", taskId: t.id,
            sistema: sistemaDoSubagente(t, numero, parte.titulo),
            pedido: parte.instrucao,
            maxPassos: o.passosSubagente ?? 10,
            maxTokensResposta: 1_500,
            temperatura: 0.3,
            prazo: prazoSub,
          }, x);
          usoSub = somarUso(usoSub, r.uso);
          r.modelos.forEach((m) => modelosSub.add(m));
          return `### Subagente ${numero} — ${parte.titulo} (${MODELOS[modelo].nome})\n${r.texto.slice(0, MAX_RELATORIO) || "(relatório vazio)"}`;
        } catch (e) {
          if (prazo.expirou()) throw e;
          falhas++;
          const motivo = ehPrazo(e) ? "o tempo dele acabou" : String((e as Error)?.message ?? e).slice(0, 160);
          return `### Subagente ${numero} — ${parte.titulo}\n(falhou: ${motivo}. Considere pesquisar esta parte você mesmo ou delegar de novo.)`;
        } finally {
          prazoSub.liberar();
        }
      }), concorrencia);
      return `Relatórios dos subagentes:\n\n${relatorios.join("\n\n")}`;
    },
  };

  const r = await rodarAgente({
    nome: o.nome, modelo: o.orquestrador, fase: "orquestra", taskId: t.id,
    sistema: sistemaDoOrquestrador(t, o.nome, x.maxSubagentes),
    pedido: pedidoDaTarefa(t),
    maxPassos: o.passosOrquestrador ?? 8,
    maxTokensResposta: 8_000,
    temperatura: 0.4,
    extras: [delegar],
  }, x);

  return {
    texto: r.texto,
    evidencias: x.caixa.evidencias(),
    uso: somarUso(r.uso, usoSub),
    modelos: [...new Set([...r.modelos, ...modelosSub])],
    passos: r.passos,
    subagentes: criados,
    degradado: r.forcado || (criados > 0 && falhas === criados),
    motivo: r.forcado ? "o orquestrador foi forçado a concluir (prazo ou teto de passos)" : falhas ? `${falhas} subagente(s) falharam` : undefined,
  };
}
