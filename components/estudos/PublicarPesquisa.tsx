"use client";
/**
 * PublicarPesquisa — a janelinha de PUBLICAR um trabalho da Sala de Pesquisa na vitrine, como PASTA de pesquisa
 * (lib/estudos/pesquisas). Vai uma CÓPIA do texto de agora (o trabalho segue editável); a pesquisa entra na FILA e só
 * aparece na vitrine depois que o admin aprovar. Mandar de novo o mesmo trabalho atualiza a cópia e volta pra fila.
 */
import { useEffect, useState } from "react";
import { LIMITES } from "@/lib/estudos/pesquisas";

export default function PublicarPesquisa({ work, jaEnviado, onFechar, onEnviado }: {
    work: { id: string; title: string };
    /** o status atual, se o trabalho já foi mandado antes */
    jaEnviado?: { status: string; motivo?: string | null };
    onFechar: () => void;
    onEnviado: () => void;
}) {
    const [resumo, setResumo] = useState("");
    const [nicho, setNicho] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [pronto, setPronto] = useState(false);

    useEffect(() => {
        const t = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar(); };
        window.addEventListener("keydown", t);
        return () => window.removeEventListener("keydown", t);
    }, [onFechar]);

    const enviar = async () => {
        setEnviando(true); setErro(null);
        try {
            const r = await fetch("/api/estudos/vitrine/pesquisas", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workId: work.id, resumo, nicho }),
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) { setErro(d?.erro ?? "Não deu pra publicar agora."); return; }
            setPronto(true); onEnviado();
        } catch {
            setErro("Sem conexão. Tente de novo.");
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[400] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onFechar} role="dialog" aria-modal="true" aria-label="Publicar na vitrine">
            <div className="w-full max-w-[480px] rounded-2xl border border-cyan-300/25 bg-[#071426] p-5 text-sky-50 shadow-[0_30px_80px_rgba(0,0,0,.6)]" onClick={(e) => e.stopPropagation()}>
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">▤ Publicar na vitrine</p>
                <h3 className="mt-1.5 text-lg font-black leading-tight">{work.title}</h3>
                {pronto ? (
                    <>
                        <p className="mt-3 text-[13px] leading-relaxed text-sky-100/80">Pronto! Sua pesquisa entrou na fila. Quando o admin aprovar, ela aparece na vitrine como uma pasta, com o seu texto dentro.</p>
                        <div className="mt-5 flex justify-end"><button type="button" onClick={onFechar} className="rounded-lg bg-cyan-300 px-4 py-2 text-[12px] font-black text-[#02121f]">fechar</button></div>
                    </>
                ) : (
                    <>
                        <p className="mt-2 text-[12.5px] leading-relaxed text-sky-100/70">
                            Vai uma <b>cópia</b> do texto de agora: seu trabalho continua editável aqui. A pesquisa entra numa fila e só aparece na vitrine depois que o admin aprovar.
                        </p>
                        {jaEnviado && (
                            <p className={`mt-3 rounded-lg px-3 py-2 text-[12px] ${jaEnviado.status === "recusada" ? "bg-rose-400/10 text-rose-200" : "bg-amber-400/10 text-amber-100"}`}>
                                {jaEnviado.status === "publicada" ? "Este trabalho já está na vitrine. Mandar de novo atualiza a cópia e ela volta pra fila." : jaEnviado.status === "recusada" ? `Recusada da última vez${jaEnviado.motivo ? `: ${jaEnviado.motivo.replace(/[.!?]?\s*$/, ".")}` : "."} Mandar de novo coloca na fila outra vez.` : "Este trabalho já está na fila. Mandar de novo atualiza a cópia."}
                            </p>
                        )}
                        <label className="mt-4 block font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200/60">Nicho</label>
                        <input value={nicho} onChange={(e) => setNicho(e.target.value)} maxLength={LIMITES.nicho} placeholder="ex.: Biologia do solo" className="mt-1 w-full rounded-lg border border-sky-300/20 bg-sky-950/40 px-3 py-2 text-[13px] outline-none placeholder:text-sky-200/30 focus:border-cyan-300/60" />
                        <label className="mt-3 block font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200/60">Resumo pra quem abrir a pasta</label>
                        <textarea value={resumo} onChange={(e) => setResumo(e.target.value)} maxLength={LIMITES.resumo} rows={4} placeholder="Do que trata a pesquisa e o que tem dentro." className="mt-1 w-full resize-y rounded-lg border border-sky-300/20 bg-sky-950/40 px-3 py-2 text-[13px] leading-relaxed outline-none placeholder:text-sky-200/30 focus:border-cyan-300/60" />
                        {erro && <p className="mt-3 text-[12px] text-rose-300">{erro}</p>}
                        <div className="mt-5 flex justify-end gap-2">
                            <button type="button" onClick={onFechar} className="rounded-lg border border-sky-300/25 px-4 py-2 text-[12px] font-bold text-sky-100/80">cancelar</button>
                            <button type="button" disabled={enviando} onClick={enviar} className="rounded-lg bg-cyan-300 px-4 py-2 text-[12px] font-black text-[#02121f] disabled:opacity-60">{enviando ? "enviando…" : jaEnviado ? "mandar de novo" : "publicar"}</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
