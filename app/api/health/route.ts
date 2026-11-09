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
import { estadoContabo } from "@/lib/rag/saude";
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
import { reciboConsole } from "@/lib/orquestra/console";
import {
  agenteEhExterno,
  agenteFaltando,
  allowDoAgente,
  allowEhAberta,
  ondeOAgenteRoda,
  parseAllow,
  tokenDoAgente,
} from "@/lib/agent/navegadorPolitica";
import { caminhoDoChromium } from "@/lib/agent/navegadorServidor";
import { agenteVivo } from "@/lib/agent/navegadorRemoto";
import { tccCrossOn } from "@/lib/tcc/store";
import { TCC_CROSS_ON } from "@/lib/tcc/client";
import { chatUnicoOn } from "@/lib/chat/chatUnico";
import { resumoDoAtlas } from "@/lib/anatomia/carregar";
import { reciboCad } from "@/lib/cad/mcp";
import { existsSync } from "node:fs";
import { join } from "node:path";

/** Manifesto e geometria do atlas de anatomia — contagens, nunca o dado. */
function atlasDeAnatomia() {
  const r = resumoDoAtlas();
  if (!r) return { manifesto: "off" as const };
  // a geometria é servida como estático: basta o primeiro pedaço existir pra ela estar no lugar
  const base = join(process.cwd(), "public/models/body");
  const geometria = existsSync(join(base, "body-0.bin.gz")) || existsSync(join(base, "body-0.bin"));
  return { manifesto: "on" as const, geometria: geometria ? ("on" as const) : ("off" as const), pecas: r.pecas, conceitos: r.conceitos };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // F8/F9 · o que falta pro agente (nomes, nunca valores). Calculado ANTES da sonda porque com
  // `AGENTIC_MODE` off não há por que bater num container — e o health também é o health-gate do
  // deploy, que não pode pagar ida e volta por um recurso desligado.
  const faltaAgente = agenteFaltando(process.env, !!caminhoDoChromium());
  const [gateway, leitor, contabo, agenteOk] = await Promise.all([
    estadoGateway().catch(() => "degraded" as const),
    estadoLeitor().catch(() => "degraded" as const),
    // O SEGUNDO SERVIDOR (lib/rag/saude): as duas pontas dele em paralelo, com prazo de 2 s cada.
    estadoContabo().catch(() => ({ rag: "degraded" as const, modelos: "degraded" as const })),
    // No caminho LOCAL (sem AGENTE_URL) não há o que sondar: o navegador sobe no próprio processo,
    // e "tem chromium" já foi respondido por `faltaAgente`. Sondar ali daria `alcancavel: false`
    // num ar funcionando — recibo que mente na direção pessimista ainda mente.
    faltaAgente.length || ondeOAgenteRoda() === "web" ? Promise.resolve(true) : agenteVivo(),
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
    // O CONSOLE DA ORQUESTRA. `autorizar` aceita Bearer OU sessão de super-admin, então token
    // ausente degrada em silêncio: o console segue abrindo logado e o caminho de automação morre.
    // "fraco" é o pior dos três — parece configurado e `tokenValido` recusa sempre. Só o estado.
    orquestra: { console: reciboConsole() },
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
     * A TRIPULAÇÃO DA NAVE: quantas contas, NUNCA quais. O endereço é dado pessoal e este endpoint
     * é lido pelo recibo do deploy, que vai pro log do Actions — por isso só o número sai daqui.
     *
     * Existe por um motivo prático: `NAVE_TRIPULACAO` chega ao container pelo `env_file`, e sem
     * esta linha a pergunta "a Variable chegou?" só teria resposta entrando na nave e vendo se dá
     * 403. Zero = ninguém além do dono do mapa pilota, que é o default do código.
     */
    nave: { tripulacao: (process.env.NAVE_TRIPULACAO || "").split(",").filter((e) => e.trim()).length },
    /**
     * O ATLAS DE ANATOMIA, em DUAS metades que falham separado — e por isso saem separadas:
     *   `manifesto` = o atlas.json (1,3 MB) está na imagem → BUSCA e INSPEÇÃO funcionam;
     *   `geometria` = os ~90 MB de malha estão no volume → o VISUALIZADOR 3D desenha.
     * Manifesto ON com geometria OFF é um estado REAL e útil (o mentor responde sobre anatomia, mas
     * não há corpo pra girar), e sem esta linha a única forma de descobrir seria abrir a tela e ver
     * nada carregar. É o mesmo trilho de duas metades que o `documento` já usa.
     */
    atlas: atlasDeAnatomia(),
    /**
     * O CAD do Eiffel (lib/cad/mcp), em DUAS metades que chegam em deploys diferentes:
     *   `cli`  = o binário solidcraft-cli está na imagem (estágio Rust do Dockerfile) → o conector
     *            MCP pode subir e o Eiffel modela;
     *   `wasm` = o bundle do modo edição está servido em public/cad → o workspace editável aparece.
     * `cli` ON com `wasm` OFF é um estado REAL (o agente modela headless, mas não há editor no
     * navegador) — é o estado de hoje, até o step 5. Lido do disco com existsSync, nunca constante.
     */
    cad: reciboCad(existsSync),
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
    /**
     * F10 · o agente agora tem MODO, e o recibo diz qual. `aberto` é a diferença entre "ele lê
     * fontes acadêmicas" e "ele lê a internet" — dois produtos diferentes com a mesma linha de log
     * se ninguém publicar o modo. `externo`/`autenticado` existem juntos de propósito: externo SEM
     * token é o estado que não pode passar em silêncio, e o recibo é onde isso aparece.
     * Nenhum VALOR de segredo sai aqui — só se existe.
     */
    agente: faltaAgente.length
      ? { faltando: faltaAgente }
      : {
          onde: ondeOAgenteRoda(),
          alcancavel: agenteOk,
          aberto: allowEhAberta(allowDoAgente()),
          externo: agenteEhExterno(),
          autenticado: !!tokenDoAgente(),
        },
    leitor,
    /**
     * O SEGUNDO SERVIDOR. A Zaeon roda em DUAS máquinas e até agora o recibo só falava de uma: tudo
     * acima (web, gateway, Leitor, agente, MCP) vive na VPS da aplicação. A Contabo hospeda o
     * pgvector do RAG, o Ollama e os TEI, alcançáveis só pela tailnet — e sem esta linha "a Contabo
     * caiu" se descobria pelo RAG parando de achar coisa, não por recibo (palavras do dono).
     * Só as três palavras off/on/degraded: nenhuma URL, nenhum host da tailnet, nenhuma senha.
     */
    contabo,
    /**
     * OS DOMÍNIOS QUE A AURA PODE LER. Era o ponto cego que levou a pergunta "por que esse endereço
     * está fora da lista?" a não ter resposta sem ler o código: o recibo dizia `leitor: "on"` e
     * `agente.aberto`, mas nunca QUAIS domínios — e o default vive no compose, não no workflow, de
     * modo que nem o log do deploy respondia.
     *
     * Domínio público numa allowlist NÃO é segredo (é o oposto: é o que a casa declara que lê), e
     * por isso esta linha pode existir onde `capacidades` promete "nenhum domínio". A regra que
     * continua valendo é a de VALORES de credencial, e nenhum sai aqui.
     *
     * `agente` vira a palavra "aberto" em vez da lista quando a allowlist é `*`: imprimir `["*"]`
     * convidaria a ler como "um domínio chamado asterisco".
     */
    dominios: {
      leitor: parseAllow(process.env.LEITOR_ALLOW),
      agente: allowEhAberta(allowDoAgente()) ? "aberto" : allowDoAgente(),
    },
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
