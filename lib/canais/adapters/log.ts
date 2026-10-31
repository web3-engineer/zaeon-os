/**
 * lib/canais/adapters/log.ts — o adapter `log` (F2). NÃO TOCA REDE NENHUMA.
 *
 * É o adapter que prova o laço ponta-a-ponta: rascunho → aprovação humana → executor → "publicado",
 * com tudo gravado (texto final, id externo, timestamp), mas sem um único byte saindo pra internet.
 * `AgentChannel.origem` já previa `"log"` — a F2 só cumpre o que o schema prometia.
 *
 * Por que isso vale uma fase inteira: quando o LinkedIn entrar (F3), a ÚNICA peça nova vai ser o
 * adapter. Fila, aprovação, teto diário, trava de PII, claim anti-duplo-envio e a tela já terão
 * rodado em produção. Erro de integração a gente descobre com um adapter; erro de governança a gente
 * descobre com um post errado no feed institucional.
 *
 * Ele implementa TODAS as capacidades declaradas da rede de propósito, pra passar no
 * `adapterCoerente()` — assim o registro da F3 não precisa de exceção pro modo de ensaio.
 */
import {
  CAPACIDADES_DA_REDE,
  type ChannelAdapter, type CtxCanal, type Publicacao, type Rede, type ResultadoPublicacao,
} from "@/lib/canais/tipos";

/** Onde o adapter escreve. Injetável pra o teste não sujar a saída. */
export type Diario = (linha: string) => void;

const diarioPadrao: Diario = (linha) => console.info(linha);

/** Id externo de ensaio: reconhecível de longe, nunca confundível com id de plataforma. */
export function idDeEnsaio(rede: Rede, agora: Date, n: number): string {
  return `log:${rede}:${agora.toISOString()}:${n}`;
}

/**
 * Uma linha curta e legível no log. NUNCA imprime o texto inteiro: um post pode ter sido barrado
 * depois por PII, e log é lugar onde conteúdo vaza pra quem só queria métrica. Imprime o tamanho.
 */
function linhaDe(acao: string, rede: Rede, p: Publicacao, id: string): string {
  return `[canais:log] ${acao} rede=${rede} agente=${p.agentKey} chars=${p.texto.length} midia=${p.midia?.length ?? 0} id=${id}`;
}

/** Cria o adapter de ensaio de uma rede. Determinístico: o relógio e o contador são injetáveis. */
export function adapterLog(rede: Rede, opts: { diario?: Diario; agora?: () => Date } = {}): ChannelAdapter {
  const diario = opts.diario ?? diarioPadrao;
  const relogio = opts.agora ?? (() => new Date());
  let n = 0;

  const registrar = (acao: string, p: Publicacao): ResultadoPublicacao => {
    const id = idDeEnsaio(rede, relogio(), ++n);
    diario(linhaDe(acao, rede, p, id));
    return { ok: true, idExterno: id };
  };

  const capacidades = CAPACIDADES_DA_REDE[rede];
  const a: ChannelAdapter = {
    rede,
    capacidades,
    testar: async () => ({ ok: true, detalhe: "adapter de ensaio (log) — nenhuma rede foi contatada" }),
  };
  // Só pendura o que a rede declara fazer: assim `adapterCoerente()` vale como teste de verdade,
  // e não como teste de um objeto que implementa tudo por conveniência.
  if (capacidades.includes("publicar")) a.publicar = async (p) => registrar("publicar", p);
  if (capacidades.includes("responder")) a.responder = async (p) => registrar("responder", p);
  if (capacidades.includes("dm")) a.dm = async (p) => registrar("dm", p);
  return a;
}

/** Registro de ensaio pra todas as redes — o que a F2 instala no lugar dos adapters reais. */
export function registroLog(opts: { diario?: Diario; agora?: () => Date } = {}): Record<Rede, ChannelAdapter> {
  const redes = Object.keys(CAPACIDADES_DA_REDE) as Rede[];
  return redes.reduce((acc, r) => {
    acc[r] = adapterLog(r, opts);
    return acc;
  }, {} as Record<Rede, ChannelAdapter>);
}

/** `CtxCanal` de ensaio: sem token, sem conta — o adapter `log` não usa nenhum dos dois. */
export const ctxDeEnsaio = (rede: Rede): CtxCanal => ({ rede, tokenRef: null, contaExterna: null });
