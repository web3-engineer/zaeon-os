"use client";

/**
 * CanaisModule — aba CANAIS do admin (F1). SÓ LEITURA: mostra o terreno antes de qualquer
 * coisa sair pro mundo. Não tem botão de conectar, pausar nem publicar — isso é F2+.
 *
 * A tela é dividida porque a VERDADE é dividida (docs/PLANO_AGENTES_MUNDO_REAL.md §2, Opção A):
 *   • CONTAS — Instagram/X/LinkedIn são UMA conta institucional cada, um estado cada.
 *     Uma "matriz agentes × redes" seria mentira: daria a entender que cada agente tem conexão
 *     própria nessas três, quando o que existe é uma conta que vários agentes assinam.
 *   • WHATSAPP — o único canal realmente POR AGENTE (chip ChipFlow), e esse já funciona hoje.
 *   • VOZES — quem pode assinar um post. Lista de assinatura, não de conexão.
 *
 * Toda a derivação mora em lib/canais/painel.ts (puro, testado). Aqui é casca: fetch + pintura.
 */
import { useCallback, useEffect, useState } from "react";
import { VIDRO_BOLHA, VIDRO_CHIP, TXT, TXT_2, TXT_MUDO } from "@/lib/canal/vidro";
import type { ContaView, PainelCanais, Severidade, WhatsAppView } from "@/lib/canais/painel";
import CanaisFila from "./CanaisFila";

const NOME_REDE: Record<string, string> = { instagram: "Instagram", x: "X", linkedin: "LinkedIn", whatsapp: "WhatsApp" };
const NOME_CAP: Record<string, string> = { publicar: "publicar", responder: "responder", dm: "mensagem direta" };

/** PURO: cor da bolinha/badge por severidade. Vermelho = precisa de gente. */
export function corDaSeveridade(s: Severidade): string {
  return s === "ok" ? "bg-emerald-500" : s === "atencao" ? "bg-amber-500" : "bg-rose-500";
}
/** PURO: badge do estado, com a mesma gramática de cor do resto do admin. */
export function badgeDaSeveridade(s: Severidade): string {
  return s === "ok"
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
    : s === "atencao"
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
      : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
}
const quando = (iso: string | null): string => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "nunca");
const rotuloEstado = (e: string): string => e.replace(/_/g, " ");

function Cota({ usado, limite, severidade }: { usado: number; limite: number; severidade: Severidade }) {
  const pct = limite > 0 ? Math.min(100, (usado / limite) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full bg-slate-200 dark:bg-white/10" role="presentation">
        <div className={`h-full rounded-full ${corDaSeveridade(severidade)}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[11px] ${TXT_MUDO}`}>{usado}/{limite} hoje</span>
    </div>
  );
}

function CartaoConta({ c }: { c: ContaView }) {
  return (
    <div className={`p-3 rounded-2xl ${VIDRO_BOLHA}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`inline-block w-2 h-2 rounded-full ${corDaSeveridade(c.severidade)}`} />
        <h4 className={`text-[13px] font-black ${TXT}`}>{NOME_REDE[c.rede] ?? c.rede}</h4>
        <span className={`ml-auto px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${badgeDaSeveridade(c.severidade)}`}>
          {rotuloEstado(c.estado)}
        </span>
      </div>
      <p className={`text-[12px] ${TXT_2}`}>{c.resumo}</p>
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        {c.capacidadesDaRede.map((cap) => {
          const ativa = c.capacidadesAtivas.includes(cap);
          return (
            <span
              key={cap}
              title={ativa ? "ativa neste canal" : "a rede faz, este canal ainda não"}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${VIDRO_CHIP} ${ativa ? TXT : TXT_MUDO} ${ativa ? "ring-1 ring-emerald-400/60" : ""}`}
            >
              {NOME_CAP[cap] ?? cap}
            </span>
          );
        })}
        {c.capacidadesInvalidas.map((cap) => (
          <span key={cap} title="configurada no banco, mas a API da rede não faz isso" className="px-2 py-0.5 rounded-full border text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30">
            {cap} ✕
          </span>
        ))}
      </div>
      <div className="mt-2">
        <Cota usado={c.usadoHoje} limite={c.limiteDia} severidade={c.severidade} />
      </div>
      <dl className={`mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] ${TXT_MUDO}`}>
        <div><dt className="inline">conta: </dt><dd className={`inline ${TXT_2}`}>{c.contaExterna ?? "—"}</dd></div>
        {/* só o NOME da env — o valor do token nunca chega no navegador */}
        <div><dt className="inline">credencial: </dt><dd className={`inline ${TXT_2}`}>{c.tokenRef ?? "—"}</dd></div>
        <div><dt className="inline">último envio: </dt><dd className={`inline ${TXT_2}`}>{quando(c.ultimoEnvioEm)}</dd></div>
        <div><dt className="inline">limite de texto: </dt><dd className={`inline ${TXT_2}`}>{c.limiteTexto} car.</dd></div>
      </dl>
      {c.ultimoErro && <p className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-300 break-words">{c.ultimoErro}</p>}
    </div>
  );
}

function LinhaWhatsApp({ w }: { w: WhatsAppView }) {
  return (
    <tr className="border-t border-slate-200/60 dark:border-white/10">
      <td className={`py-1.5 pr-3 font-semibold ${TXT}`}>
        <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${corDaSeveridade(w.severidade)}`} />{w.nome}
      </td>
      <td className="pr-3">{w.numero ?? "—"}</td>
      <td className="pr-3">{rotuloEstado(w.estado)}</td>
      <td className="pr-3"><Cota usado={w.usadoHoje} limite={w.limiteDia} severidade={w.severidade} /></td>
      <td className="pr-3">{quando(w.ultimoEnvioEm)}</td>
      <td className="text-rose-600 dark:text-rose-300">{w.ultimoErro ?? ""}</td>
    </tr>
  );
}

export default function CanaisModule({ glassPanel }: { glassPanel: string }) {
  const [d, setD] = useState<PainelCanais | null>(null);
  const [estado, setEstado] = useState<"carregando" | "ok" | "erro">("carregando");

  const carregar = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/canais", { cache: "no-store" });
      if (!res.ok) { setEstado("erro"); return; }
      setD(await res.json());
      setEstado("ok");
    } catch { setEstado("erro"); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  return (
    <section aria-label="Canais do mundo real" className={`p-5 rounded-[28px] ${glassPanel}`}>
      <header className="flex flex-wrap items-center gap-2 mb-1">
        <h2 className={`text-[15px] font-black uppercase tracking-widest ${TXT}`}>Canais</h2>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${VIDRO_CHIP} ${TXT_MUDO}`}>somente leitura</span>
        {d && (
          <>
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${d.externosLigados ? badgeDaSeveridade("ok") : badgeDaSeveridade("atencao")}`}>
              {d.externosLigados ? "canais externos ligados" : "canais externos desligados"}
            </span>
            {d.aprovacaoForcada && (
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${badgeDaSeveridade("atencao")}`}>aprovação humana travada</span>
            )}
            <span className={`ml-auto text-[11px] ${TXT_MUDO}`}>
              publicando agora: <b className={TXT_2}>{d.prontas} de {d.contas.length}</b>
            </span>
          </>
        )}
      </header>
      <p className={`text-[12px] ${TXT_2} mb-4`}>
        Instagram, X e LinkedIn são <b>uma conta da Zaeon cada</b> — os agentes assinam os posts, não têm conta própria.
        O WhatsApp é o único canal por agente. Nada publica sozinho: F1 só mostra o estado.
      </p>

      {estado === "carregando" && <p className={`text-[12px] ${TXT_MUDO}`}>carregando…</p>}
      {estado === "erro" && <p role="status" className="text-[12px] text-amber-700 dark:text-amber-300">⚠ não foi possível ler o estado dos canais.</p>}

      {d && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {d.contas.map((c) => <CartaoConta key={c.rede} c={c} />)}
          </div>

          <h3 className={`mt-5 mb-2 text-[13px] font-black uppercase tracking-widest ${TXT}`}>WhatsApp por agente</h3>
          {d.whatsapp.length === 0 ? (
            <p className={`text-[12px] ${TXT_MUDO}`}>nenhum agente com chip vinculado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full text-[12px] ${TXT_2}`}>
                <thead><tr className={`text-left text-[10px] uppercase tracking-wider ${TXT_MUDO}`}>
                  <th className="py-1 pr-3">agente</th><th className="pr-3">número</th><th className="pr-3">estado</th><th className="pr-3">cota</th><th className="pr-3">último envio</th><th>último erro</th>
                </tr></thead>
                <tbody>{d.whatsapp.map((w) => <LinhaWhatsApp key={w.agentKey} w={w} />)}</tbody>
              </table>
            </div>
          )}

          <h3 className={`mt-5 mb-2 text-[13px] font-black uppercase tracking-widest ${TXT}`}>Vozes que podem assinar</h3>
          <div className="flex flex-wrap gap-1.5">
            {d.vozes.map((v) => (
              <span key={v.agentKey} title={v.area ?? v.tipo} className={`px-2 py-1 rounded-full text-[11px] font-bold ${VIDRO_CHIP} ${TXT_2}`}>
                {v.nome}{v.area ? <span className={TXT_MUDO}> · {v.area}</span> : null}
              </span>
            ))}
          </div>

          {/* F2: a fila de aprovação. Recebe as vozes já resolvidas — uma fonte, um nome que assina. */}
          <CanaisFila vozes={d.vozes.map((v) => ({ agentKey: v.agentKey, nome: v.nome }))} />
        </>
      )}
    </section>
  );
}
