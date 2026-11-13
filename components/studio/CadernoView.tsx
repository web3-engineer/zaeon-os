"use client";

/**
 * CadernoView — a página de lição das Jornadas desenhada como um CADERNO DE PARTITURA na Sala de
 * Estudos: papel pautado, fontes artesanais, cartões de vidro líquido. Junta os dois pilares —
 * Plano de Estudos (módulos, a trilha das 27 canções, o ritmo da semana) e Plano de Trabalho (a
 * partitura tocável do P0 + o teclado num modal) — e monta o Guia da Zaeon, que conduz no balão.
 *
 * Recebe o Caderno curado (lib/jornadas/cadernoRitmo) via `data`; se vier só o `artifactId` (reaberta
 * do servidor), busca em /api/studio/[id], como a AulaView.
 */
import { useEffect, useRef, useState } from "react";
import Partitura from "@/components/chat/Partitura";
import TecladoModal from "@/components/jornadas/TecladoModal";
import ZaeonGuia from "@/components/guia/ZaeonGuia";
import type { Caderno, Cancao } from "@/lib/jornadas/cadernoRitmo";
import type { Sinal } from "@/lib/guia/tipos";

const FONTE_MANUS = "Caveat, 'Segoe Script', cursive";
const FONTE_TITULO = "Fraunces, Georgia, 'Times New Roman', serif";

function Dot({ c }: { c: Cancao }) {
  const base = "grid h-[22px] w-[22px] place-items-center rounded-full text-[12px] flex-none border";
  if (c.estado === "feita") return <div className={`${base} border-[#4aa6bd] bg-[#4aa6bd] text-white`}>✓</div>;
  if (c.estado === "atual") return <div className={`${base} border-[#9a6a3a] text-[#9a6a3a]`} style={{ boxShadow: "0 0 0 4px rgba(154,106,58,.14)" }}>●</div>;
  if (c.estado === "mais") return <div className={`${base} border-[rgba(120,110,90,.4)] text-[#6b6558] opacity-60`}>⋯</div>;
  return <div className={`${base} border-[rgba(120,110,90,.4)] text-[#6b6558]`}>○</div>;
}

export default function CadernoView({ data, artifactId }: { data?: Caderno | null; artifactId?: string }) {
  const [caderno, setCaderno] = useState<Caderno | null>(data ?? null);
  const [tecladoAberto, setTecladoAberto] = useState(false);
  const enviarRef = useRef<((s: Sinal) => void) | null>(null);

  useEffect(() => {
    if (caderno || !artifactId) return;
    let vivo = true;
    fetch(`/api/studio/${artifactId}`).then((r) => r.json()).then((j) => { if (vivo && j?.meta) setCaderno(j.meta as Caderno); }).catch(() => {});
    return () => { vivo = false; };
  }, [artifactId, caderno]);

  if (!caderno) return <div className="grid h-full place-items-center text-[13px] text-slate-400">Carregando o caderno…</div>;
  const c = caderno;
  const glass: React.CSSProperties = {
    background: "rgba(255,255,255,.55)", border: "1px solid rgba(255,255,255,.7)",
    backdropFilter: "blur(22px) saturate(1.4)", WebkitBackdropFilter: "blur(22px) saturate(1.4)",
    boxShadow: "0 10px 34px rgba(40,34,20,.12), inset 0 1px 0 rgba(255,255,255,.75)",
  };

  return (
    <div className="relative h-full overflow-y-auto" style={{ background: "radial-gradient(1200px 500px at 80% -10%, rgba(214,188,140,.28), transparent 60%), #f4efe3" }}>
      {/* papel pautado + margem */}
      <div className="min-h-full" style={{ backgroundImage: "linear-gradient(90deg, rgba(190,120,110,0) 56px, rgba(190,120,110,.35) 57px, rgba(190,120,110,0) 58px), repeating-linear-gradient(transparent 0 37px, rgba(120,110,90,.10) 37px 38px)" }}>
        <div className="mx-auto max-w-[720px] px-6 pb-28 pt-7" style={{ color: "#2b2a26", fontFamily: "Inter, system-ui, sans-serif" }}>
          <div style={{ fontFamily: FONTE_MANUS, fontSize: 21, color: "#9a6a3a", transform: "rotate(-1.2deg)" }}>{c.kicker}</div>
          <h1 className="my-1 text-[34px] font-semibold tracking-tight" style={{ fontFamily: FONTE_TITULO }}>{c.titulo}</h1>
          <p className="max-w-[46ch] text-[14px] text-[#6b6558]">{c.resumo}</p>
          <div className="my-6 flex flex-wrap gap-2 text-[12px]">
            {[`🎼 Módulo ${c.moduloAtual} de ${c.totalModulos}`, `🗓️ ${c.semana.minutosDia} min/dia`, `✦ ${c.trilha.filter((x) => x.estado === "feita").length} de ${c.totalCancoes} canções`, `⟐ ${c.app}`].map((t) => (
              <span key={t} className="rounded-full px-3 py-[5px]" style={glass}>{t}</span>
            ))}
          </div>

          {/* fala da Zaeon */}
          <div className="my-4 rounded-[22px] p-5" style={glass}>
            <div className="flex items-start gap-3">
              <div className="h-[34px] w-[34px] flex-none rounded-full" style={{ background: "radial-gradient(circle at 32% 30%, #bfe9f2, #4aa6bd 60%, #2b6d7e)", boxShadow: "0 4px 12px rgba(43,109,126,.4), inset 0 1px 2px rgba(255,255,255,.6)" }} />
              <div style={{ fontFamily: FONTE_MANUS, fontSize: 19, lineHeight: 1.3, color: "#3a4e54" }}>&ldquo;{c.intro}&rdquo;</div>
            </div>
          </div>

          {/* módulos */}
          {c.modulos.map((m) => (
            <div key={m.id} className="my-[18px] rounded-[22px] p-5" style={glass}>
              <div style={{ fontFamily: FONTE_MANUS, fontSize: 20, color: "#9a6a3a" }}>{m.numero}</div>
              <h2 className="mb-2 mt-[2px] text-[21px] font-semibold" style={{ fontFamily: FONTE_TITULO }}>{m.titulo}</h2>
              <p className="text-[13.5px] leading-relaxed text-[#6b6558]">{m.texto}</p>
              {m.partitura && (
                <div className="mt-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[15px] font-medium" style={{ fontFamily: FONTE_TITULO }}>{m.partitura.titulo}</span>
                    <button type="button" onClick={() => setTecladoAberto(true)}
                      className="ml-auto rounded-full px-3 py-[6px] text-[12.5px] font-semibold text-white"
                      style={{ background: "linear-gradient(180deg,rgba(74,166,189,.95),rgba(43,109,126,.95))", border: "1px solid rgba(255,255,255,.5)" }}>
                      🎯 tocar junto
                    </button>
                  </div>
                  <Partitura json={JSON.stringify(m.partitura)} />
                </div>
              )}
            </div>
          ))}

          {/* a trilha das canções */}
          <div className="my-[18px] rounded-[22px] p-5" style={glass}>
            <div style={{ fontFamily: FONTE_MANUS, fontSize: 20, color: "#9a6a3a" }}>a trilha</div>
            <h2 className="mb-1 mt-[2px] text-[21px] font-semibold" style={{ fontFamily: FONTE_TITULO }}>Suas {c.totalCancoes} canções</h2>
            <p className="text-[13.5px] leading-relaxed text-[#6b6558]">Das clássicas às novas, uma puxando a próxima. Você destrava tocando.</p>
            <div className="mt-2">
              {c.trilha.map((s, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-dashed border-[rgba(120,110,90,.22)] py-[10px] last:border-0">
                  <Dot c={s} />
                  <div>
                    <div className="text-[14px] font-medium" style={s.estado === "atual" ? { color: "#9a6a3a" } : s.estado === "mais" ? { color: "#6b6558" } : undefined}>
                      {s.estado === "mais" ? `+ ${s.resto} canções` : s.titulo}
                    </div>
                    <div className="text-[12px] text-[#6b6558]">{s.estado === "mais" ? "liberadas conforme você avança" : s.autor}{s.estado === "atual" ? " · você está aqui" : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ritmo da semana */}
          <div className="my-[18px] rounded-[22px] p-5" style={glass}>
            <div style={{ fontFamily: FONTE_MANUS, fontSize: 20, color: "#9a6a3a" }}>ritmo da semana</div>
            <h2 className="mb-1 mt-[2px] text-[21px] font-semibold" style={{ fontFamily: FONTE_TITULO }}>Seu plano, {c.semana.minutosDia} min/dia</h2>
            <p className="text-[13.5px] leading-relaxed text-[#6b6558]">Pouco e todo dia vence muito de vez em quando. A Zaeon ajusta se você faltar.</p>
            <div className="mt-2 flex gap-[7px]">
              {c.semana.dias.map((d, i) => (
                <span key={i} className="grid h-[26px] w-[26px] place-items-center rounded-lg text-[11px]"
                  style={i < c.semana.feitos ? { background: "#4aa6bd", color: "#fff", border: "1px solid #4aa6bd" } : { background: "rgba(255,255,255,.5)", color: "#6b6558", border: "1px solid rgba(255,255,255,.7)" }}>{d}</span>
              ))}
            </div>
            <div className="mt-[10px]" style={{ fontFamily: FONTE_MANUS, fontSize: 17, color: "#6b6558" }}>{c.semana.feitos} dias seguidos — mantém a chama ✦</div>
          </div>

          <div className="mt-10 text-center" style={{ fontFamily: FONTE_MANUS, fontSize: 16, color: "#6b6558" }}>— vire a página quando a escala fluir —</div>
        </div>
      </div>

      {/* botão flutuante do teclado */}
      <button type="button" onClick={() => setTecladoAberto(true)}
        className="absolute bottom-4 left-4 z-[40] flex items-center gap-2 rounded-full px-4 py-3 text-[13.5px] font-semibold text-[#243b42]"
        style={{ background: "rgba(255,255,255,.55)", border: "1px solid rgba(255,255,255,.7)", backdropFilter: "blur(18px) saturate(1.5)", boxShadow: "0 12px 30px rgba(40,34,20,.22), inset 0 1px 0 rgba(255,255,255,.8)" }}>
        <span className="text-[18px]">🎹</span> teclado
      </button>

      <TecladoModal
        aberto={tecladoAberto}
        onFechar={() => setTecladoAberto(false)}
        aoTocar={() => enviarRef.current?.({ tipo: "atividade", fonte: "tocou", em: Date.now() })}
        aoConcluir={() => enviarRef.current?.({ tipo: "objetivo", estado: "alcancou", id: c.modulos[0]?.objetivo ?? "objetivo", em: Date.now() })}
      />

      {/* o Guia da Zaeon: orbe + balão (ociosidade por enquanto); recebe sinais ricos pelo enviarRef */}
      <ZaeonGuia faseInicial={c.modulos[0]?.titulo ?? null} aoMontar={(enviar) => { enviarRef.current = enviar; }} />
    </div>
  );
}
