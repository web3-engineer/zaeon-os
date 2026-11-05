/**
 * app/api/agentic/run/route.ts — A PORTA do agente de navegador (F8).
 *
 * O módulo `lib/agent/agentic.ts` (#698) subiu sem caller: `AGENTIC_MODE=1` não fazia nada, porque
 * ninguém chamava `runAgentic`. Esta é a entrada, e ela é a mais estreita que ainda serve pra algo:
 *
 *   admin (fundador/super_admin) · flag ON · allowlist do Leitor · Chromium headless · SOMENTE LEITURA
 *
 * ⟦AS TRAVAS, E POR QUE SÃO DUAS PARA A MESMA COISA⟧
 *
 * 1. NÃO passamos `approve`. No laço, `needsApproval` é true pra click/type em modo guiado, e sem
 *    `approve` o run morre em `stop: "denied"`. É a trava do CALLER.
 * 2. O driver servidor RECUSA click/type por conta própria. É a trava do DRIVER.
 *
 * Duas porque elas protegem contra coisas diferentes: a primeira contra um plano que pede escrita,
 * a segunda contra um futuro caller que resolva passar um `approve` permissivo. Nenhuma delas
 * depende de o modelo "se comportar".
 *
 * `execMode` fica em "guiado" SEMPRE — não há parâmetro de requisição que o mude pra "auto". Um
 * campo no corpo que afrouxasse a aprovação seria a trava virando sugestão.
 */
import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin/assertAdmin";
import { agenticEnabled, runAgentic, type AgenticEvent } from "@/lib/agent/agentic";
import {
  agenteFaltando,
  agenteUrl,
  allowDoAgente,
  orcamentoDoAgente,
} from "@/lib/agent/navegadorPolitica";
import { lerPlanoDoAgente, sistemaDoPlano } from "@/lib/agent/navegadorPlano";
import {
  MAX_RESULTADOS,
  SISTEMA_DA_SINTESE,
  type Leitura as LeituraDaSintese,
  type Sintese,
  lerSintese,
  promptDaSintese,
  promptDoPlanoComBusca,
  termoDeBusca,
  urlNaInstrucao,
} from "@/lib/agent/navegadorPesquisa";
import { type WebResult, webSearch } from "@/lib/search/web";
import { caminhoDoChromium } from "@/lib/agent/navegadorServidor";
import { abrirDriverDoAgente } from "@/lib/agent/navegadorRemoto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * UM run por processo QUANDO O CHROMIUM É LOCAL (F8): lançar navegador dentro do `web` custa a
 * memória de quem serve o site, e dois duplo-cliques abririam dois.
 *
 * F9 · com o container dedicado (`AGENTE_URL`) a trava NÃO se aplica: lá o teto é do próprio
 * serviço (`MAX_SESSOES = 2` em services/agente-navegador/sessoes.mjs), que é quem conhece a
 * memória dele. Manter a trava do web aqui seria o web limitando um recurso que não é dele — e o
 * dono ficaria com "ocupado" em um container com sessão livre.
 */
let rodandoLocal = false;

const MAX_INSTRUCAO = 2_000;

export async function POST(req: Request) {
  const adm = await assertAdmin();
  if (!adm.ok) return NextResponse.json({ erro: "nao_autorizado" }, { status: adm.status });

  // F10 · UMA só definição de "o que falta": `agenteFaltando` já sabe que, com o container, o
  // Chromium do web é irrelevante, e que serviço externo sem token é falta. A versão anterior
  // barrava em `!temChromium` mesmo usando o container — defeito meu da F9, que eu havia corrigido
  // no `agenteFaltando` e esquecido AQUI. Duas definições, e a que ficou velha era a que negava.
  const faltando = agenteFaltando(process.env, !!caminhoDoChromium());
  if (!agenticEnabled() || faltando.length) {
    // Diz o que falta pelo NOME (nunca o valor) — mesma regra do recibo do deploy.
    return NextResponse.json({ erro: "agente_indisponivel", faltando }, { status: 503 });
  }

  const allow = allowDoAgente();

  let corpo: { instrucao?: unknown };
  try { corpo = (await req.json()) as { instrucao?: unknown }; } catch { corpo = {}; }
  const instrucao = String(corpo.instrucao ?? "").trim().slice(0, MAX_INSTRUCAO);
  if (!instrucao) return NextResponse.json({ erro: "instrucao_vazia" }, { status: 400 });

  const remoto = !!agenteUrl();
  if (!remoto) {
    if (rodandoLocal) return NextResponse.json({ erro: "ocupado" }, { status: 429 });
    rodandoLocal = true;
  }
  const { maxPassos, maxMs } = orcamentoDoAgente(remoto);

  const eventos: AgenticEvent[] = [];
  let driver: Awaited<ReturnType<typeof abrirDriverDoAgente>>["driver"] | null = null;

  try {
    // ── BUSCAR (F10) ───────────────────────────────────────────────────────────────
    // Só busca quando a instrução NÃO traz endereço: "abra tal página" é pedido de abrir, e gastar
    // uma busca ali seria latência sem ganho. Busca que falha NÃO derruba o turno — o plano segue
    // sem resultados e o prompt diz que não houve, em vez de o modelo inventar endereço.
    const alvoDireto = urlNaInstrucao(instrucao);
    let resultados: WebResult[] = [];
    if (!alvoDireto) {
      const b = await webSearch(termoDeBusca(instrucao), { max: MAX_RESULTADOS }).catch(
        () => ({ ok: false }) as const,
      );
      if (b.ok) resultados = b.results;
    }

    // ── planejar (modelo) ──────────────────────────────────────────────────────────
    const { geminiJson } = await import("@/lib/scholar/gemini");
    let bruto: unknown;
    try {
      bruto = await geminiJson<unknown>(sistemaDoPlano(maxPassos), promptDoPlanoComBusca(instrucao, resultados), {
        temperature: 0,
        timeoutMs: 30_000,
        ctx: { agentKey: "aura", surface: "admin" },
      });
    } catch (e) {
      return NextResponse.json(
        { erro: "falha_ao_planejar", detalhe: String((e as Error)?.message ?? e).slice(0, 300) },
        { status: 502 },
      );
    }

    const plano = lerPlanoDoAgente(bruto, maxPassos);
    if (!plano.acoes.length) {
      // Não é erro: é o caso em que a tarefa exige o que esta porta não faz. Dizer isso é melhor
      // que abrir um navegador pra nada e devolver "pronto".
      return NextResponse.json({
        ok: false, stop: "blocked", passos: [], leituras: [],
        recusadas: plano.recusadas, allow, onde: remoto ? "container" : "web", resultados,
        motivo: "o plano não tinha nenhum passo de leitura executável nesta porta",
      });
    }

    // ── navegar (somente leitura) ──────────────────────────────────────────────────
    driver = (await abrirDriverDoAgente({ allow })).driver;

    const r = await runAgentic(
      instrucao,
      {
        driver,
        plan: async () => plano.acoes,
        // approve AUSENTE de propósito: ver o cabeçalho. Escrita morre em "denied".
        emit: (ev) => { if (eventos.length < 200) eventos.push(ev); },
      },
      { execMode: "guiado", maxSteps: maxPassos, maxDurationMs: maxMs },
    );

    // ── SINTETIZAR (F10) ───────────────────────────────────────────────────────────
    // Sem isto a página devolve texto cru de páginas e chama isso de pesquisa. A síntese é o que
    // transforma leitura em resposta — e `lerSintese` PODA fontes inventadas contra o que foi
    // realmente lido, porque aparência de lastro sem lastro é o defeito caro deste caminho.
    const urlsLidas = eventos
      .filter((e) => e.action?.kind === "navigate" && e.action.url)
      .map((e) => String(e.action!.url));
    let sintese: Sintese | null = null;
    if (r.readings.length) {
      const leituras: LeituraDaSintese[] = r.readings.map((texto, i) => ({
        url: urlsLidas[i] ?? urlsLidas[urlsLidas.length - 1] ?? "",
        texto,
      }));
      try {
        const cru = await geminiJson<unknown>(SISTEMA_DA_SINTESE, promptDaSintese(instrucao, leituras), {
          temperature: 0.2, timeoutMs: 45_000, ctx: { agentKey: "aura", surface: "admin" },
        });
        sintese = lerSintese(cru, urlsLidas);
      } catch {
        // Síntese é ACESSÓRIA: sem ela o dono ainda recebe os passos e as leituras. Derrubar o
        // turno porque o resumo falhou seria jogar fora o trabalho que já deu certo.
        sintese = null;
      }
    }

    return NextResponse.json({
      ok: r.ok, stop: r.stop, error: r.error,
      passos: eventos, leituras: r.readings, sintese, resultados,
      recusadas: plano.recusadas, allow,
      onde: remoto ? "container" : "web", orcamento: { maxPassos, maxMs },
    });
  } catch (e) {
    return NextResponse.json(
      { erro: "falha", detalhe: String((e as Error)?.message ?? e).slice(0, 300) },
      { status: 500 },
    );
  } finally {
    await driver?.close().catch(() => {});
    if (!remoto) rodandoLocal = false;
  }
}
