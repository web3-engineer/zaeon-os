"use client";
/**
 * DominiosRea — os domínios que a pessoa declarou pro REA, e o fluxo de DECLARAR: ler o Termo de Uso (lib/rea/termo.ts),
 * escolher a finalidade, marcar as duas declarações e aceitar. O aceite (versão + hash do texto exibido) vai pro
 * servidor, que grava a prova com data, IP e navegador (lib/rea/dominios.ts). Com o domínio declarado, as sessões do
 * REA no Octa liberam as ferramentas web naquele domínio e nos subdomínios.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Globe, Loader2, ShieldCheck, Trash2, X } from "lucide-react";

type Termo = { titulo: string; versao: string; hash: string; texto: string };
type Dominio = { id: string; dominio: string; finalidade: string; termoVersao: string; aceitoEm: string; vigente: boolean };

export default function DominiosRea() {
  const [termo, setTermo] = useState<Termo | null>(null);
  const [finalidades, setFinalidades] = useState<Record<string, string>>({});
  const [dominios, setDominios] = useState<Dominio[] | null>(null);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const r = await fetch("/api/rea/dominios", { cache: "no-store" }).catch(() => null);
    if (!r?.ok) { setDominios([]); return; }
    const j = await r.json();
    setTermo(j.termo); setFinalidades(j.finalidades ?? {}); setDominios(j.dominios ?? []);
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  const revogar = async (d: string) => {
    if (!window.confirm(`Revogar a declaração de ${d}? As próximas sessões do REA deixam de liberar esse domínio.`)) return;
    setErro(null);
    const r = await fetch(`/api/rea/dominios?dominio=${encodeURIComponent(d)}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) setErro("Não deu para revogar agora. Tente de novo.");
    void carregar();
  };

  return (
    <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4" aria-labelledby="rea-dominios-titulo">
      <div className="mb-2 flex items-center gap-2">
        <Globe size={16} className="text-emerald-300" />
        <h3 id="rea-dominios-titulo" className="flex-1 text-[13.5px] font-bold text-slate-100">Domínios</h3>
        <button type="button" onClick={() => setAberto(true)} disabled={!termo}
          className="rounded-lg border border-emerald-400/40 px-3 py-1.5 text-[12px] font-semibold text-emerald-200 transition hover:bg-emerald-400/10 disabled:opacity-40">
          + Declarar domínio
        </button>
      </div>
      <p className="mb-3 text-[12px] leading-relaxed text-slate-400">
        Para o REA abrir, observar e capturar as páginas de um site, declare que o domínio é seu (ou que você tem autorização do titular) e aceite o Termo de Uso. Depois disso, o domínio e os subdomínios ficam liberados nas sessões do REA.
      </p>
      {erro && <p role="alert" className="mb-2 text-[12px] text-rose-300">{erro}</p>}
      {dominios === null ? (
        <div className="flex items-center gap-2 text-[12px] text-slate-400"><Loader2 className="animate-spin" size={14} /> carregando…</div>
      ) : dominios.length === 0 ? (
        <p className="text-[12px] text-slate-500">Nenhum domínio declarado.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {dominios.map((d) => (
            <li key={d.id} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
              <ShieldCheck size={14} className={d.vigente ? "text-emerald-300" : "text-amber-300"} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-[12.5px] text-slate-100">{d.dominio}</span>
                <span className="block text-[11px] text-slate-500">
                  {finalidades[d.finalidade] ?? d.finalidade} · aceito em {new Date(d.aceitoEm).toLocaleDateString("pt-BR")}
                  {!d.vigente && <span className="text-amber-300"> · o termo mudou — declare de novo para liberar</span>}
                </span>
              </span>
              <button type="button" onClick={() => void revogar(d.dominio)} aria-label={`Revogar ${d.dominio}`} title="Revogar"
                className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {aberto && termo && <ModalTermo termo={termo} finalidades={finalidades} aoFechar={() => setAberto(false)} aoDeclarar={() => { setAberto(false); void carregar(); }} />}
    </section>
  );
}

function ModalTermo({ termo, finalidades, aoFechar, aoDeclarar }: { termo: Termo; finalidades: Record<string, string>; aoFechar: () => void; aoDeclarar: () => void }) {
  const [dominio, setDominio] = useState("");
  const [finalidade, setFinalidade] = useState("");
  const [titular, setTitular] = useState(false);
  const [aceito, setAceito] = useState(false);
  const [leuTudo, setLeuTudo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && !enviando) aoFechar(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aoFechar, enviando]);
  // texto curto (cabe sem rolar) conta como lido
  useEffect(() => { const el = caixa.current; if (el && el.scrollHeight <= el.clientHeight + 8) setLeuTudo(true); }, []);

  const pode = !!dominio.trim() && !!finalidade && titular && aceito && leuTudo && !enviando;
  const enviar = async () => {
    if (!pode) return;
    setEnviando(true); setErro(null);
    const r = await fetch("/api/rea/dominios", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ dominio, finalidade, titular, aceite: { versao: termo.versao, hash: termo.hash } }),
    }).catch(() => null);
    setEnviando(false);
    if (r?.ok) return aoDeclarar();
    const j = r ? await r.json().catch(() => ({})) : {};
    setErro(j?.error ?? "Não deu para registrar agora. Tente de novo.");
  };

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="rea-termo-titulo">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-[#0b1020] text-slate-200 shadow-2xl">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
          <ShieldCheck size={16} className="text-emerald-300" />
          <h2 id="rea-termo-titulo" className="flex-1 text-[14px] font-bold">Declarar domínio para o REA</h2>
          <button type="button" onClick={aoFechar} disabled={enviando} aria-label="Fechar" className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"><X size={16} /></button>
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto px-5 py-4">
          <label className="flex flex-col gap-1 text-[12px]">
            <span className="font-semibold text-slate-300">Domínio</span>
            <input value={dominio} onChange={(e) => setDominio(e.target.value)} placeholder="meusite.com.br" maxLength={253} autoFocus
              className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono text-[13px] outline-none focus:border-emerald-400/60" />
            <span className="text-[11px] text-slate-500">Vale também para os subdomínios (ex.: app.meusite.com.br).</span>
          </label>
          <label className="flex flex-col gap-1 text-[12px]">
            <span className="font-semibold text-slate-300">Finalidade</span>
            <select value={finalidade} onChange={(e) => setFinalidade(e.target.value)} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-[13px] outline-none focus:border-emerald-400/60">
              <option value="">Escolha…</option>
              {Object.entries(finalidades).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <div>
            <div className="mb-1 flex items-baseline justify-between text-[12px]">
              <span className="font-semibold text-slate-300">{termo.titulo}</span>
              <span className="font-mono text-[10.5px] text-slate-500">v{termo.versao}</span>
            </div>
            <div ref={caixa} tabIndex={0} onScroll={(e) => { const el = e.currentTarget; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 16) setLeuTudo(true); }}
              className="h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/30 p-3 text-[12px] leading-relaxed text-slate-300 outline-none focus:border-emerald-400/50">
              {termo.texto}
            </div>
            {!leuTudo && <p className="mt-1 text-[11px] text-amber-300">Role o termo até o fim para poder aceitar.</p>}
          </div>
          <label className="flex items-start gap-2 text-[12.5px]">
            <input type="checkbox" checked={titular} onChange={(e) => setTitular(e.target.checked)} className="mt-0.5" />
            <span>Declaro, sob as penas da lei, que sou o titular do domínio informado e do software que ele serve, ou que tenho autorização expressa, prévia e por escrito do titular.</span>
          </label>
          <label className="flex items-start gap-2 text-[12.5px]">
            <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} disabled={!leuTudo} className="mt-0.5" />
            <span>Li e aceito o {termo.titulo} (versão {termo.versao}). Entendo que o aceite fica registrado com data, hora, IP e navegador, como prova.</span>
          </label>
          {erro && <p role="alert" className="text-[12px] text-rose-300">{erro}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-3">
          <button type="button" onClick={aoFechar} disabled={enviando} className="rounded-lg px-3 py-1.5 text-[12.5px] text-slate-300 hover:bg-white/10">Cancelar</button>
          <button type="button" onClick={() => void enviar()} disabled={!pode}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-[12.5px] font-bold text-black transition hover:bg-emerald-400 disabled:opacity-40">
            {enviando && <Loader2 size={13} className="animate-spin" />} Aceitar e declarar
          </button>
        </div>
      </div>
    </div>
  );
}
