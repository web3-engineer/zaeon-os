"use client";

/**
 * DevicePanelView — a Sala de Estudos de uma skill família "device": o app open-source que o aluno
 * baixa e roda na MÁQUINA DELE. Não é chat nem board de código — é o espelho de download + a
 * integridade (sha256) + as instruções (o corpo do SKILL.md) como passos. Molde de aba (DocumentoArtefato),
 * como o ForjaView: recebe o painel via `data`, ou (reaberto do servidor) busca por `artifactId`.
 */
import { useEffect, useMemo, useState } from "react";
import MiniMarkdown from "@/components/aulas/MiniMarkdown";
import { passosDoCorpo, type PainelDevice } from "@/lib/estudos/painelDevice";

const ROTULO_PLATAFORMA: Record<string, string> = {
  ios: "iPhone / iPad", macos: "macOS", android: "Android", windows: "Windows", linux: "Linux",
};

export default function DevicePanelView({ data, artifactId }: { data?: PainelDevice | null; artifactId?: string }) {
  const [painel, setPainel] = useState<PainelDevice | null>(data ?? null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (painel || !artifactId) return;
    let vivo = true;
    fetch(`/api/studio/${artifactId}`).then((r) => r.json()).then((j) => { if (vivo && j?.meta) setPainel(j.meta as PainelDevice); }).catch(() => {});
    return () => { vivo = false; };
  }, [artifactId, painel]);

  const passos = useMemo(() => passosDoCorpo(painel?.corpo ?? ""), [painel?.corpo]);

  if (!painel) {
    return <div className="h-full animate-pulse bg-slate-100 dark:bg-white/[0.03]" />;
  }

  const { titulo, subtitulo, device } = painel;
  const plataforma = ROTULO_PLATAFORMA[device.plataforma] || device.plataforma || "seu computador";
  const copiarSha = async () => {
    if (!device.sha256) return;
    try { await navigator.clipboard.writeText(device.sha256); setCopiado(true); setTimeout(() => setCopiado(false), 1500); } catch { /* sem clipboard: o sha fica visível pra copiar à mão */ }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-[#070d1a] p-4 sm:p-6">
      <div className="mx-auto w-full max-w-[760px]">
        {/* cabeçalho */}
        <div className="flex items-start gap-3">
          <div className="text-[26px]">📥</div>
          <div className="min-w-0">
            <h1 className="text-[18px] font-black tracking-tight text-white">{titulo}</h1>
            {subtitulo && <p className="mt-0.5 text-[13px] text-slate-300/80">{subtitulo}</p>}
          </div>
        </div>

        {/* o espelho de download + integridade */}
        <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-[#0b1324]/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400">Baixe e rode no seu aparelho</div>
              <div className="text-[13px] font-bold text-cyan-200">{plataforma}</div>
            </div>
            {device.mirror ? (
              <a href={device.mirror} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400/90 px-4 py-2 text-[13px] font-black text-[#042033] hover:bg-cyan-300">
                ⬇ Baixar
              </a>
            ) : (
              <span className="text-[12px] text-amber-300/80">espelho de download indisponível</span>
            )}
          </div>
          {device.sha256 && (
            <button type="button" onClick={copiarSha} title="copiar o sha256 para conferir a integridade do arquivo"
              className="mt-3 block w-full truncate rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-left font-mono text-[11px] text-slate-400 hover:text-slate-200">
              sha256 {copiado ? "✓ copiado" : `· ${device.sha256}`}
            </button>
          )}
          <p className="mt-2 text-[11px] text-slate-500">
            O app roda na sua máquina, não nos nossos servidores — por isso é seguro e funciona de verdade. Confira o sha256 depois de baixar.
          </p>
        </div>

        {/* as instruções (corpo do SKILL.md) como passos */}
        {passos.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Passo a passo</div>
            {passos.map((p, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                {p.titulo && (
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400/20 text-[11px] font-black text-cyan-200">{i + 1}</span>
                    <h2 className="text-[14px] font-black tracking-tight text-white">{p.titulo}</h2>
                  </div>
                )}
                <div className="prose-sm text-[13px] leading-relaxed text-slate-300">
                  <MiniMarkdown source={p.markdown} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
