/**
 * GET /api/health — liveness simples para o healthcheck do container/compose e
 * para checagens externas (uptime). Não toca no banco de propósito: responde 200
 * sempre que o processo Node está de pé. (Readiness de DB pode virar /api/ready.)
 *
 * `commit` = SHA do build (env GIT_SHA, injetado no deploy). Mata a dessincronia
 * "o que está em prod?": `curl .../api/health` → qual commit está rodando.
 * `gateway`/`provedor` (PR-G1): off (sem GATEWAY_URL) · on · degraded (configurado e caído →
 * a camada autônoma responde pelo Vertex direto). Cache de 60s; nunca derruba o health.
 * `leitor` (Fatia 7, G6): off · on · degraded do container leitor-proxy. `pool`: alvos grátis com key.
 * `mcp` (F5): off · sem_sdk · on (N tools) · degraded — é por aqui que o dono faz o smoke-test dos conectores.
 * `capacidades` (docs/PLANO_HARNESS_AGENTICO.md §8): o estado EFETIVO das flags do harness, lido das
 * próprias funções que o turno consulta — não do env cru. É o RECIBO de "tudo ON": o deploy imprime
 * isto no log depois do health-gate, e `curl .../api/health` responde "o que está ligado em prod?"
 * sem adivinhação. Só booleanos e nomes de tool; nenhum segredo, nenhuma URL, nenhum domínio.
 * `escritorio` (#645): "fila" (os turnos dos agentes rodam no worker — que o deploy também precisa atualizar) ou
 * "inline" (rodam aqui no web). Só o modo, nenhum segredo.
 */
import { NextResponse } from "next/server";
import { estadoGateway, provedorAtual } from "@/lib/llm/saude";
import { estadoLeitor } from "@/lib/leitor/saude";
import { poolConfigurado } from "@/lib/llm/pool";
import { resumoMcp } from "@/lib/agent/mcp-boot";
import { acaoDoModeloLigada, capacidadeHonestaLigada, voltasDeAcao } from "@/lib/agent/aura-harness";
import { INTENT_IDS } from "@/lib/agent/contracts";
import { anexoNoHarnessLigado } from "@/lib/agent/anexos";
import { sinteseLigada } from "@/lib/agent/sintese-flag";
import { escritaPorSecaoLigada } from "@/lib/documento/escritor";
import { graficoLigado } from "@/lib/agent/graficosDoTurno";
import { getTool } from "@/lib/agent/runtime";
import { GEMINI_MODEL_FLASH, GEMINI_MODEL_PRO } from "@/lib/ai/model";
import { proNasPesadasLigado } from "@/lib/ai/proNasPesadas";
import { pusherFaltando } from "@/lib/collab/realtime";
import { agenteFaltando } from "@/lib/agent/navegadorPolitica";
import { caminhoDoChromium } from "@/lib/agent/navegadorServidor";
import { tccCrossOn } from "@/lib/tcc/store";
import { TCC_CROSS_ON } from "@/lib/tcc/client";
import { chatUnicoOn } from "@/lib/chat/chatUnico";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [gateway, leitor] = await Promise.all([
    estadoGateway().catch(() => "degraded" as const),
    estadoLeitor().catch(() => "degraded" as const),
  ]);
  return NextResponse.json({
    status: "ok",
    service: "zaeon-web",
    commit: process.env.GIT_SHA ?? "unknown",
    harness: process.env.AURA_HARNESS === "0" ? "off" : "on",
    gateway,
    provedor: provedorAtual(gateway),
    // QUAL MODELO está no ar. Vinha de fora do repositório (`.env` do VPS), então "que modelo a
    // Aura usa em prod?" não tinha resposta sem SSH — e `pro` só entra em turno de quem tem
    // Pensamento Profundo (lib/plans: free `none`, plus 1×/dia, pro ilimitado). Sem essa ressalva o
    // número engana: pra maioria dos turnos TODAS as fases são o `flash`.
    // F7 · `proPesadas` é a FLAG, não "todo turno usa Pro": quem leva o Pro nas fases pesadas é
    // conta plus/pro (lib/ai/proNasPesadas), e isso depende de usuário — o health não tem usuário.
    // Dizer só "ON" aqui seria recibo exagerado; o nome do campo e esta nota é que o mantêm honesto.
    modelo: { flash: GEMINI_MODEL_FLASH, pro: GEMINI_MODEL_PRO, proPesadas: proNasPesadasLigado(), proSoPlusEPro: true },
    // O TEMPO REAL do documento colaborativo. "on" = as quatro envs do Pusher chegaram; senão, os
    // NOMES que faltam (nunca os valores). Sem elas a colaboração funciona no poll de 6 s — a
    // diferença é invisível de fora, e era por isso que eu não conseguia confirmá-la pro dono.
    tempoReal: pusherFaltando().length === 0 ? "on" : { faltando: pusherFaltando() },
    /**
     * O TRILHO DO DOCUMENTO, em DUAS METADES que podem divergir — e é por isso que o recibo diz as
     * duas em vez de um "on".
     *
     *   `servidor` = `tccCrossOn()` (runtime): um documento PODE nascer.
     *   `cliente`  = `NEXT_PUBLIC_*` (embutido no BUILD): as abas dos trabalhos APARECEM.
     *
     * Servidor ON com cliente OFF é o caso cruel: o documento nasce e ninguém o vê, e nada no log
     * acusa. A F6, a F7 e a D9 foram construídas sobre este trilho enquanto o interruptor dele não
     * aparecia em lugar nenhum — vivia só no `.env` do VPS. Fechar isso foi ordem do dono.
     */
    documento: { servidor: tccCrossOn(), cliente: TCC_CROSS_ON, chatUnico: chatUnicoOn() },
    /**
     * F8 · O AGENTE DE NAVEGADOR. "on" só quando as TRÊS condições estão de pé; senão, os NOMES do
     * que falta (nunca valores). As três são de naturezas diferentes e por isso erram diferente:
     *
     *   AGENTIC_MODE  — a flag (Variable; default 0: esta é a única que NÃO liguei por padrão);
     *   LEITOR_ALLOW  — a allowlist; vazia, `urlPermitida` nega TODO domínio e o agente não vai a
     *                   lugar nenhum. Flag ON com lista vazia é um agente que só sabe recusar;
     *   chromium      — o binário na imagem. Sem ele a rota devolve 503 em vez de estourar.
     *
     * Sem esta linha, "o agente está no ar?" não teria resposta sem SSH — exatamente o ponto cego
     * que o trilho do documento tinha até a #702.
     */
    agente: agenteFaltando(process.env, !!caminhoDoChromium()).length === 0
      ? "on"
      : { faltando: agenteFaltando(process.env, !!caminhoDoChromium()) },
    leitor,
    // F5: o estado dos conectores MCP (memoizado do boot; nunca conecta aqui)
    mcp: resumoMcp(),
    capacidades: {
      cardapio: capacidadeHonestaLigada(),
      acao: acaoDoModeloLigada(),
      // o padrão de quem NÃO passa tarefa (era o único número aqui, e por isso o recibo do deploy
      // dizia "2 voltas" pra tudo)
      voltas: voltasDeAcao(),
      // F6 · o teto é POR TAREFA: sem esta linha o recibo mentiria — diria 2 enquanto um pedido de
      // trabalho roda 5. Vale também pra mostrar o efeito de `HARNESS_VOLTAS_ACAO`, que achata
      // todas as tarefas no mesmo número quando setada.
      voltasPorTarefa: Object.fromEntries(INTENT_IDS.map((i) => [i, voltasDeAcao(process.env, { intent: i })])),
      anexo: anexoNoHarnessLigado(),
      sintese: sinteseLigada(),
      docPorSecao: escritaPorSecaoLigada(),
      grafico: graficoLigado(),
      // as duas tools do Leitor: registradas = o cardápio PODE prometer "abro páginas"/"baixo
      // arquivo". É aqui que se vê a diferença entre a flag ligada e a capacidade existindo.
      abrirUrl: !!getTool("abrir_url"),
      baixarParaBase: !!getTool("baixar_para_base"),
    },
    pool: poolConfigurado(),
    // a mesma regra de lib/canal/queue `filaLigada` (sem importar a fila: o health fica leve)
    escritorio: process.env.CANAL_QUEUE === "1" && process.env.REDIS_URL ? "fila" : "inline",
    time: new Date().toISOString(),
  });
}
