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
import { anexoNoHarnessLigado } from "@/lib/agent/anexos";
import { sinteseLigada } from "@/lib/agent/sintese-flag";
import { escritaPorSecaoLigada } from "@/lib/documento/escritor";
import { graficoLigado } from "@/lib/agent/graficosDoTurno";
import { getTool } from "@/lib/agent/runtime";

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
    leitor,
    // F5: o estado dos conectores MCP (memoizado do boot; nunca conecta aqui)
    mcp: resumoMcp(),
    capacidades: {
      cardapio: capacidadeHonestaLigada(),
      acao: acaoDoModeloLigada(),
      voltas: voltasDeAcao(),
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
