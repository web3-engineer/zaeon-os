/**
 * POST /api/admin/canais/publicar — roda o executor da fila AGORA (F2). Founder-only.
 *
 * Na F2 o registro de adapters é o `log`: nada sai pra internet. O que esta rota prova é o resto do
 * caminho — claim anti-duplo-envio, teto diário, trava de PII, assinatura obrigatória, contagem do
 * dia e trilha gravada no post. Quando o LinkedIn entrar (F3), a única troca é o registro.
 *
 * É DISPARO MANUAL de propósito: nenhum cron nesta fase. A primeira coisa que publica sozinho só
 * faz sentido depois de o dono ver o laço rodando com o próprio dedo no botão.
 *
 * `?seco=1` avalia e relata SEM claimar nem gravar nada — é o "o que aconteceria se eu clicasse".
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { ESTADOS_PUBLICAVEIS, type LinhaPost } from "@/lib/canais/fila";
import { TETO_DIA_PADRAO, canaisExternosLigados, diaBrt } from "@/lib/canais/politica";
import { ctxDeEnsaio, registroLog } from "@/lib/canais/adapters/log";
import { LIMITE_POR_CICLO, publicarAprovados, type DepsPublicar } from "@/lib/canais/publicar";
import { vozDoRoster, vozes } from "@/lib/canais/vozes";
import type { EstadoEnvio } from "@/lib/canais/politica";
import type { Rede } from "@/lib/canais/tipos";
import { gate } from "../posts/route";

export async function POST(req: Request) {
  const g = await gate(); if (g) return g;
  if (!canaisExternosLigados()) {
    return NextResponse.json({ error: "CANAIS_EXTERNOS=0 — camada de canais desligada" }, { status: 503 });
  }

  const q = new URL(req.url).searchParams;
  const seco = q.get("seco") === "1";
  const limite = Math.min(100, Math.max(1, Number(q.get("limite")) || LIMITE_POR_CICLO));
  const agora = new Date();
  const db = prisma as any;
  const elenco = await vozes(prisma);
  const registro = registroLog();

  const deps: DepsPublicar = {
    pegarAprovados: async (n) =>
      (await db.agentPost
        ?.findMany({ where: { estado: { in: [...ESTADOS_PUBLICAVEIS] } }, orderBy: { createdAt: "asc" }, take: n })
        .catch(() => [])) ?? ([] as LinhaPost[]),

    // O claim: `aprovado` → `publicando` numa única escrita condicional. Dois ciclos simultâneos —
    // você clicando e um futuro cron — não publicam o mesmo post duas vezes.
    claimar: async (id) => {
      const r = await db.agentPost.updateMany({ where: { id, estado: "aprovado" }, data: { estado: "publicando" } });
      return r.count === 1;
    },

    canalDe: async (rede) => {
      const c = await db.canalSocial?.findUnique({ where: { rede } }).catch(() => null);
      if (!c) return null;
      return {
        rede,
        estado: c.estado,
        limiteDia: c.limiteDia ?? TETO_DIA_PADRAO[rede],
        enviadosHoje: c.enviadosHoje ?? 0,
        diaContagem: c.diaContagem ?? null,
        pausadoAte: c.pausadoAte ?? null,
      } as EstadoEnvio;
    },

    vozDe: async (agentKey) => vozDoRoster(elenco, agentKey),
    adapterDe: (rede) => registro[rede] ?? null,
    ctxDe: (rede) => ctxDeEnsaio(rede),

    publicado: async (id, d) => {
      await db.agentPost.update({
        where: { id },
        data: {
          estado: "publicado", textoFinal: d.textoFinal, idExterno: d.idExterno,
          urlExterna: d.urlExterna ?? null, adapterUsado: d.adapter, publicadoEm: d.agora,
          ultimoErro: null, classeErro: null,
        },
      });
    },

    falhou: async (id, d) => {
      await db.agentPost.update({
        where: { id },
        data: { estado: "falhou", ultimoErro: d.detalhe, classeErro: d.classe, tentativas: { increment: 1 } },
      });
    },

    // Erro transitório: volta pra fila com a tentativa registrada. Ninguém reaprova por um timeout.
    devolveu: async (id, d) => {
      await db.agentPost.update({
        where: { id },
        data: { estado: "aprovado", ultimoErro: d.detalhe, classeErro: d.classe, tentativas: { increment: 1 } },
      });
    },

    // Contagem do dia: zera sozinha quando `diaContagem` não é hoje (mesma convenção do AgentChannel).
    contabilizar: async (rede: Rede, quando: Date) => {
      const dia = diaBrt(quando);
      const c = await db.canalSocial?.findUnique({ where: { rede } }).catch(() => null);
      const mesmoDia = c?.diaContagem === dia;
      await db.canalSocial?.update({
        where: { rede },
        data: { enviadosHoje: mesmoDia ? (c?.enviadosHoje ?? 0) + 1 : 1, diaContagem: dia, ultimoEnvioEm: quando, ultimoErro: null },
      }).catch(() => null);
    },

    pausarCanal: async (rede, d) => {
      await db.canalSocial?.update({ where: { rede }, data: { pausadoAte: d.ate, ultimoErro: d.erro } }).catch(() => null);
    },
  };

  // Modo seco pela INJEÇÃO, não por um `if` dentro do executor: as escritas viram no-op e o claim
  // mente que deu certo, então a mesma lógica roda inteira e o relatório diz exatamente o que
  // ACONTECERIA — sem um ramo de código que só existe no ensaio e por isso nunca é o testado.
  const usadas: DepsPublicar = seco
    ? {
        ...deps,
        claimar: async () => true,
        publicado: async () => {},
        falhou: async () => {},
        devolveu: async () => {},
        contabilizar: async () => {},
        pausarCanal: async () => {},
      }
    : deps;

  try {
    const r = await publicarAprovados(usadas, agora, limite);
    return NextResponse.json({ ok: true, seco, ensaio: true, at: agora.toISOString(), ...r });
  } catch (e: any) {
    console.error("CANAIS PUBLICAR:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "falhou" }, { status: 500 });
  }
}
