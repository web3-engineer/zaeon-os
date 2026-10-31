/**
 * lib/canais/publicar.ts — o EXECUTOR da fila (F2). O "post_external" do plano.
 *
 * Pega o que um humano aprovou, julga de novo (porque entre aprovar e sair o mundo muda), claima o
 * post pra ninguém publicar duas vezes, chama o adapter e grava o resultado. Na F2 o adapter é o
 * `log` — nada sai pra internet, mas TODO o resto do caminho é o caminho definitivo.
 *
 * IO por INJEÇÃO: nenhuma linha de Prisma aqui. A rota monta as `DepsPublicar`; o teste monta fakes.
 * É o mesmo arranjo de `lib/octa/modelo.ts` — a decisão fica testável sem banco e sem rede.
 *
 * As duas decisões que valem ler antes de mexer:
 *
 *  • DE QUEM É A CULPA decide o destino do post. Recusa por conteúdo (`pii_bloqueada`) é do POST:
 *    tentar de novo com o mesmo texto dá o mesmo bloqueio, então vai pra `falhou` e espera reescrita
 *    humana. Recusa por canal (teto, pausa, auth, canal nem configurado) NÃO é do post: ele fica
 *    `aprovado` e sai no próximo ciclo, quando o canal estiver de pé. Culpar o post por um token
 *    expirado faria o dono reaprovar 20 rascunhos à mão depois de arrumar o token.
 *
 *  • ERRO DO ADAPTER usa `erroTransitorio()` da F0: transitório devolve pro `aprovado` (com a pausa
 *    do canal evitando o laço apertado); permanente vai pra `falhou`, que exige gente.
 */
import {
  erroTransitorio,
  type ChannelAdapter, type ClasseErroCanal, type CtxCanal, type Rede,
} from "@/lib/canais/tipos";
import { TETO_DIA_PADRAO, pausaAposErro, type EstadoEnvio } from "@/lib/canais/politica";
import { avaliarPublicacao, type LinhaPost, type Voz } from "@/lib/canais/fila";
import type { OpcoesPublicas } from "@/lib/canais/noPiiExterno";

export type DesfechoItem = "publicado" | "falhou" | "devolvido" | "pulado";

export type ItemRelatorio = {
  id: string;
  rede: string;
  agentKey: string;
  desfecho: DesfechoItem;
  classe?: ClasseErroCanal;
  detalhe?: string;
  idExterno?: string;
};

export type Relatorio = {
  publicados: number;
  falhados: number;
  devolvidos: number;
  pulados: number;
  itens: ItemRelatorio[];
};

export type DepsPublicar = {
  /** Posts `aprovado`, mais antigos primeiro. */
  pegarAprovados(limite: number): Promise<LinhaPost[]>;
  /** `aprovado` → `publicando`, condicional. `false` = outro executor levou (ou alguém recusou). */
  claimar(id: string): Promise<boolean>;
  /** Estado do canal da rede. `null` = rede nunca configurada. */
  canalDe(rede: Rede): Promise<EstadoEnvio | null>;
  /** Quem assina. `null` = agente não existe mais no roster. */
  vozDe(agentKey: string): Promise<Voz | null>;
  adapterDe(rede: Rede): ChannelAdapter | null;
  ctxDe(rede: Rede): CtxCanal;
  publicado(id: string, d: { textoFinal: string; idExterno: string; urlExterna?: string; adapter: string; agora: Date }): Promise<void>;
  falhou(id: string, d: { classe: ClasseErroCanal; detalhe: string }): Promise<void>;
  /** Volta pra `aprovado` registrando a tentativa — pra erro transitório, não pra recusa de conteúdo. */
  devolveu(id: string, d: { classe: ClasseErroCanal; detalhe: string }): Promise<void>;
  /** Incrementa o contador do dia do canal (teto diário). Só depois de sair de verdade. */
  contabilizar(rede: Rede, agora: Date): Promise<void>;
  pausarCanal(rede: Rede, d: { ate: Date; erro: string }): Promise<void>;
  pii?: OpcoesPublicas;
  tz?: string;
};

/** Canal ausente vira um estado explícito, pra o motivo da recusa ser o mesmo de sempre. */
const canalAusente = (rede: Rede): EstadoEnvio => ({
  rede,
  estado: "nao_conectado",
  limiteDia: TETO_DIA_PADRAO[rede],
  enviadosHoje: 0,
  diaContagem: null,
});

export const LIMITE_POR_CICLO = 20;

export async function publicarAprovados(
  deps: DepsPublicar,
  agora: Date = new Date(),
  limite: number = LIMITE_POR_CICLO,
): Promise<Relatorio> {
  const r: Relatorio = { publicados: 0, falhados: 0, devolvidos: 0, pulados: 0, itens: [] };
  const posts = await deps.pegarAprovados(limite);

  for (const post of posts) {
    const rede = post.rede as Rede;
    const anota = (desfecho: DesfechoItem, extra: Omit<ItemRelatorio, "id" | "rede" | "agentKey" | "desfecho"> = {}) => {
      r.itens.push({ id: post.id, rede: post.rede, agentKey: post.agentKey, desfecho, ...extra });
      if (desfecho === "publicado") r.publicados++;
      else if (desfecho === "falhou") r.falhados++;
      else if (desfecho === "devolvido") r.devolvidos++;
      else r.pulados++;
    };

    const voz = await deps.vozDe(post.agentKey);
    if (!voz) {
      // Sem voz não há assinatura, e assinatura é obrigatória (Opção A). É do post: precisa de gente.
      await deps.falhou(post.id, { classe: "desconhecido", detalhe: `agente "${post.agentKey}" não está no roster` });
      anota("falhou", { classe: "desconhecido", detalhe: `agente "${post.agentKey}" não está no roster` });
      continue;
    }

    const canal = (await deps.canalDe(rede)) ?? canalAusente(rede);
    const v = avaliarPublicacao({ post, voz, canal, agora, pii: deps.pii, tz: deps.tz });
    if (!v.ok) {
      if (v.classe === "pii_bloqueada") {
        await deps.falhou(post.id, { classe: v.classe, detalhe: v.detalhe });
        anota("falhou", { classe: v.classe, detalhe: v.detalhe });
      } else {
        // Culpa do canal, não do post: fica `aprovado` e sai quando o canal voltar.
        anota("pulado", { classe: v.classe, detalhe: v.detalhe });
      }
      continue;
    }

    const adapter = deps.adapterDe(rede);
    if (!adapter?.publicar) {
      anota("pulado", { classe: "capacidade", detalhe: `sem adapter de "publicar" para ${rede}` });
      continue;
    }

    // Claim por último: só trava o post quando tudo o mais já disse sim.
    if (!(await deps.claimar(post.id))) {
      anota("pulado", { detalhe: "outro ciclo já pegou este post" });
      continue;
    }

    let res;
    try {
      res = await adapter.publicar(
        { agentKey: post.agentKey, rede, texto: v.textoFinal, midia: post.midia ?? undefined, fonteUrl: post.fonteUrl ?? undefined },
        deps.ctxDe(rede),
      );
    } catch (e: any) {
      res = { ok: false as const, classe: "rede" as ClasseErroCanal, detalhe: e?.message ?? "adapter lançou" };
    }

    if (res.ok) {
      await deps.publicado(post.id, {
        textoFinal: v.textoFinal,
        idExterno: res.idExterno,
        ...(res.urlExterna ? { urlExterna: res.urlExterna } : {}),
        // Quem publicou fica gravado no post. O adapter de ensaio marca os ids dele com "log:" —
        // esse prefixo É o registro, e é o que distingue um post de ensaio de um post real na F3.
        adapter: res.idExterno.startsWith("log:") ? "log" : rede,
        agora,
      });
      await deps.contabilizar(rede, agora);
      anota("publicado", { idExterno: res.idExterno });
      continue;
    }

    // Erro do adapter. A classe decide se vale tentar de novo.
    if (erroTransitorio(res.classe)) {
      await deps.devolveu(post.id, { classe: res.classe, detalhe: res.detalhe });
      await deps.pausarCanal(rede, { ate: new Date(agora.getTime() + pausaAposErro(res.classe)), erro: res.detalhe });
      anota("devolvido", { classe: res.classe, detalhe: res.detalhe });
    } else {
      await deps.falhou(post.id, { classe: res.classe, detalhe: res.detalhe });
      anota("falhou", { classe: res.classe, detalhe: res.detalhe });
    }
  }

  return r;
}
