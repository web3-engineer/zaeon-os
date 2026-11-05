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
  AGENTE_MAX_MS,
  AGENTE_MAX_PASSOS,
  agenteFaltando,
  allowDoAgente,
} from "@/lib/agent/navegadorPolitica";
import { SISTEMA_DO_PLANO, lerPlanoDoAgente, promptDoPlano } from "@/lib/agent/navegadorPlano";
import { abrirNavegadorDoAgente, caminhoDoChromium } from "@/lib/agent/navegadorServidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * UM run por processo. Lançar Chromium custa memória e o limite do `web` é apertado (é por isso que
 * o Octa usa `--renderer-process-limit=1`); dois duplo-cliques do dono abririam dois navegadores.
 * Trava de processo, não de usuário — é o recurso do container que está sendo protegido.
 */
let rodando = false;

const MAX_INSTRUCAO = 2_000;

export async function POST(req: Request) {
  const adm = await assertAdmin();
  if (!adm.ok) return NextResponse.json({ erro: "nao_autorizado" }, { status: adm.status });

  const temChromium = !!caminhoDoChromium();
  if (!agenticEnabled() || !temChromium) {
    // Diz o que falta pelo NOME (nunca o valor) — mesma regra do recibo do deploy.
    return NextResponse.json(
      { erro: "agente_indisponivel", faltando: agenteFaltando(process.env, temChromium) },
      { status: 503 },
    );
  }

  const allow = allowDoAgente();
  if (!allow.length) {
    return NextResponse.json({ erro: "agente_indisponivel", faltando: ["LEITOR_ALLOW"] }, { status: 503 });
  }

  let corpo: { instrucao?: unknown };
  try { corpo = (await req.json()) as { instrucao?: unknown }; } catch { corpo = {}; }
  const instrucao = String(corpo.instrucao ?? "").trim().slice(0, MAX_INSTRUCAO);
  if (!instrucao) return NextResponse.json({ erro: "instrucao_vazia" }, { status: 400 });

  if (rodando) return NextResponse.json({ erro: "ocupado" }, { status: 429 });
  rodando = true;

  const eventos: AgenticEvent[] = [];
  let driver: Awaited<ReturnType<typeof abrirNavegadorDoAgente>> | null = null;

  try {
    // ── planejar (modelo) ──────────────────────────────────────────────────────────
    const { geminiJson } = await import("@/lib/scholar/gemini");
    let bruto: unknown;
    try {
      bruto = await geminiJson<unknown>(SISTEMA_DO_PLANO, promptDoPlano(instrucao), {
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

    const plano = lerPlanoDoAgente(bruto);
    if (!plano.acoes.length) {
      // Não é erro: é o caso em que a tarefa exige o que esta porta não faz. Dizer isso é melhor
      // que abrir um navegador pra nada e devolver "pronto".
      return NextResponse.json({
        ok: false, stop: "blocked", passos: [], leituras: [],
        recusadas: plano.recusadas, allow,
        motivo: "o plano não tinha nenhum passo de leitura executável nesta porta",
      });
    }

    // ── navegar (somente leitura) ──────────────────────────────────────────────────
    driver = await abrirNavegadorDoAgente({ allow });

    const r = await runAgentic(
      instrucao,
      {
        driver,
        plan: async () => plano.acoes,
        // approve AUSENTE de propósito: ver o cabeçalho. Escrita morre em "denied".
        emit: (ev) => { if (eventos.length < 200) eventos.push(ev); },
      },
      { execMode: "guiado", maxSteps: AGENTE_MAX_PASSOS, maxDurationMs: AGENTE_MAX_MS },
    );

    return NextResponse.json({
      ok: r.ok, stop: r.stop, error: r.error,
      passos: eventos, leituras: r.readings,
      recusadas: plano.recusadas, allow,
    });
  } catch (e) {
    return NextResponse.json(
      { erro: "falha", detalhe: String((e as Error)?.message ?? e).slice(0, 300) },
      { status: 500 },
    );
  } finally {
    await driver?.close().catch(() => {});
    rodando = false;
  }
}
