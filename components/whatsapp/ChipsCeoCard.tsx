"use client";

/**
 * Card "Chips de WhatsApp (CEO)" no Meu perfil (out/2026). Só aparece pra quem a API responde 200 (admin).
 * Conectar = criar o chip → QR do whatsapp-adapter (whatsmeow da ChipFlow), atualizado a cada 3 s até
 * "conectado" (o ConnectStep da ChipFlow). Cada chip: papel (Zaeon · agente · pessoal), nome/recado/foto do
 * perfil no WhatsApp, ativo no rodízio, teste de envio, desconectar e apagar. Ver docs/WHATSAPP_CHIPS.md.
 */
import { confirmar, tr } from "@/lib/ui/avisos";
import { useCallback, useEffect, useRef, useState } from "react";
import { Smartphone, Plus, QrCode, Loader2, Trash2, PowerOff, Send, Image as ImageIcon, X, CheckCircle2 } from "lucide-react";

type Chip = {
  id: string; instanceId: number; nome: string; papel: "zaeon" | "agente" | "pessoal"; agentKey: string | null; ativo: boolean;
  estado: "novo" | "qr" | "conectado" | "desconectado" | "erro"; numero: string | null; perfilNome: string | null; perfilRecado: string | null;
  fotoUrl: string | null; limiteDia: number; enviadosHoje: number; totalEnviados: number; ultimoErro: string | null;
};
const PAPEL: Record<Chip["papel"], string> = { zaeon: "Zaeon", agente: "Agente", pessoal: "Pessoal" };
const COR: Record<Chip["estado"], string> = { conectado: "bg-emerald-500", qr: "bg-amber-400", novo: "bg-amber-400", desconectado: "bg-slate-400", erro: "bg-rose-500" };
const ROTULO: Record<Chip["estado"], string> = { conectado: "conectado", qr: "esperando QR", novo: "novo", desconectado: "desconectado", erro: "erro" };
const fmtNumero = (n: string | null) => (n ? `+${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4, -4)}-${n.slice(-4)}` : "sem número");

/** imagem escolhida → JPEG quadrado 640×640 (o tamanho que o WhatsApp usa), como data-URI */
async function paraJpegQuadrado(arquivo: File): Promise<string> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = url; });
    const lado = Math.min(img.width, img.height);
    const c = document.createElement("canvas"); c.width = 640; c.height = 640;
    c.getContext("2d")!.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 640, 640);
    return c.toDataURL("image/jpeg", 0.88);
  } finally { URL.revokeObjectURL(url); }
}

export default function ChipsCeoCard() {
  const [chips, setChips] = useState<Chip[] | null>(null);
  const [visivel, setVisivel] = useState(false);
  const [adapter, setAdapter] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [novo, setNovo] = useState<{ nome: string; papel: Chip["papel"]; agentKey: string } | null>(null);
  const [qrDe, setQrDe] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const r = await fetch("/api/whatsapp/chips", { cache: "no-store" }).catch(() => null);
    if (!r || !r.ok) { setVisivel(false); return; }   // não-admin: o card nem aparece
    const j = await r.json();
    setVisivel(true); setChips(j.chips); setAdapter(!!j.adapter);
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  if (!visivel) return null;

  const criar = async () => {
    if (!novo) return;
    setErro(null);
    const r = await fetch("/api/whatsapp/chips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(novo) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErro(j?.error ?? "não deu pra criar o chip"); return; }
    setNovo(null); await carregar(); setQrDe(j.chip.id);
  };
  const acao = async (url: string, metodo: string, corpo?: unknown) => {
    setErro(null);
    const r = await fetch(url, { method: metodo, ...(corpo ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) } : {}) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setErro(j?.error ?? "falhou");
    await carregar();
    return { ok: r.ok, j };
  };

  return (
    <div className="w-full rounded-[2rem] bg-white/80 dark:bg-white/[0.02] border border-slate-300 dark:border-white/10 shadow-xl backdrop-blur-3xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Smartphone size={16} className="text-emerald-500" />
          <span className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200">Chips de WhatsApp · CEO</span>
        </div>
        <button onClick={() => setNovo({ nome: "", papel: "zaeon", agentKey: "" })} disabled={!adapter}
          className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 disabled:opacity-40">
          <Plus size={14} /> Conectar chip
        </button>
      </div>
      <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
        Números que falam pela Zaeon e pelos agentes. Conecte pelo QR (WhatsApp → Aparelhos conectados → Conectar um aparelho).
        Os chips da <b>Zaeon</b> entram no rodízio das mensagens do dia; um chip de <b>agente</b> fala só por aquele agente.
      </p>
      {!adapter && <div className="text-[11px] text-amber-600 dark:text-amber-400 mb-3">O adapter de WhatsApp ainda não está ligado na VPS (WA_OPERATOR_URL).</div>}
      {erro && <div className="text-[11px] text-rose-500 mb-3">{erro}</div>}

      {novo && (
        <div className="mb-4 rounded-2xl border border-slate-200 dark:border-white/10 p-4 flex flex-col gap-3">
          <input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} placeholder="Nome interno (ex.: Zaeon 1, Meu número)"
            className="rounded-xl bg-transparent border border-slate-300 dark:border-white/15 px-3 py-2 text-[13px]" />
          <div className="flex gap-2 flex-wrap">
            {(["zaeon", "agente", "pessoal"] as const).map((p) => (
              <button key={p} onClick={() => setNovo({ ...novo, papel: p })}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold border ${novo.papel === p ? "bg-emerald-500 text-white border-emerald-500" : "border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-300"}`}>
                {PAPEL[p]}
              </button>
            ))}
          </div>
          {novo.papel === "agente" && (
            <input value={novo.agentKey} onChange={(e) => setNovo({ ...novo, agentKey: e.target.value })} placeholder="agentKey do agente (ex.: nina)"
              className="rounded-xl bg-transparent border border-slate-300 dark:border-white/15 px-3 py-2 text-[13px]" />
          )}
          <div className="flex gap-2">
            <button onClick={criar} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-500 text-white text-[12px] font-bold"><QrCode size={14} /> Gerar QR</button>
            <button onClick={() => setNovo(null)} className="px-4 py-2 rounded-xl text-[12px] text-slate-500">Cancelar</button>
          </div>
        </div>
      )}

      {chips === null ? <Loader2 className="animate-spin text-slate-400" size={18} /> : chips.length === 0 ? (
        <div className="text-[12px] text-slate-500">Nenhum chip ainda. Conecte o primeiro — pode ser o seu número.</div>
      ) : (
        <ul className="flex flex-col gap-3">
          {chips.map((c) => (
            <li key={c.id} className="rounded-2xl border border-slate-200 dark:border-white/10 p-4">
              <div className="flex items-center gap-3">
                {c.fotoUrl ? <img src={c.fotoUrl} alt="" className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center"><Smartphone size={16} className="text-slate-400" /></div>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${COR[c.estado]}`} />
                    <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate">{c.nome}</span>
                    <span className="text-[10px] uppercase tracking-widest text-slate-400">{PAPEL[c.papel]}{c.agentKey ? ` · ${c.agentKey}` : ""}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">{fmtNumero(c.numero)} · {ROTULO[c.estado]} · hoje {c.enviadosHoje}/{c.limiteDia}{c.ativo ? "" : " · fora do rodízio"}</div>
                  {c.ultimoErro && <div className="text-[10px] text-rose-500 truncate">{c.ultimoErro}</div>}
                </div>
              </div>
              <div className="flex gap-3 flex-wrap mt-3 text-[11px] font-bold">
                {c.estado !== "conectado" && <button onClick={() => setQrDe(c.id)} className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><QrCode size={13} /> QR</button>}
                <button onClick={() => setEditando(editando === c.id ? null : c.id)} className="flex items-center gap-1 text-slate-600 dark:text-slate-300"><ImageIcon size={13} /> Perfil</button>
                <button onClick={() => acao(`/api/whatsapp/chips/${c.id}`, "PATCH", { ativo: !c.ativo })} className="text-slate-600 dark:text-slate-300">{c.ativo ? "Tirar do rodízio" : "Pôr no rodízio"}</button>
                {c.estado === "conectado" && <Testar chipId={c.id} onErro={setErro} />}
                {c.estado === "conectado" && <button onClick={() => acao(`/api/whatsapp/chips/${c.id}/sair`, "POST")} className="flex items-center gap-1 text-amber-600"><PowerOff size={13} /> Desconectar</button>}
                <button onClick={async () => { if (await confirmar({ titulo: tr("avisos.apagarChip", "Apagar o chip?"), texto: `Apagar o chip "${c.nome}"? A sessão do WhatsApp é encerrada.`, botao: tr("avisos.apagar", "Apagar"), perigo: true })) void acao(`/api/whatsapp/chips/${c.id}`, "DELETE"); }} className="flex items-center gap-1 text-rose-500"><Trash2 size={13} /> Apagar</button>
              </div>
              {editando === c.id && <EditorPerfil chip={c} salvar={(p) => acao(`/api/whatsapp/chips/${c.id}`, "PATCH", p)} />}
            </li>
          ))}
        </ul>
      )}
      {qrDe && <ModalQr chipId={qrDe} fechar={() => { setQrDe(null); void carregar(); }} />}
    </div>
  );
}

/** o QR do chip, perguntando a cada 3 s até conectar (ConnectStep da ChipFlow) */
function ModalQr({ chipId, fechar }: { chipId: string; fechar: () => void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [estado, setEstado] = useState<string>("qr");
  const [numero, setNumero] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const vivo = useRef(true);
  useEffect(() => {
    vivo.current = true;
    const passo = async () => {
      const r = await fetch(`/api/whatsapp/chips/${chipId}/conectar`, { cache: "no-store" }).catch(() => null);
      if (!vivo.current) return;
      const j = r ? await r.json().catch(() => ({})) : {};
      setEstado(j?.estado ?? "erro"); setErro(j?.erro ?? null);
      if (j?.qr) setQr(j.qr);
      if (j?.estado === "conectado") setNumero(j.numero ?? null);
    };
    void passo();
    const t = setInterval(() => { if (estado !== "conectado") void passo(); }, 3000);
    return () => { vivo.current = false; clearInterval(t); };
  }, [chipId, estado]);
  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={fechar}>
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="w-full flex justify-between items-center">
          <span className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200">Conectar chip</span>
          <button onClick={fechar}><X size={16} className="text-slate-400" /></button>
        </div>
        {estado === "conectado" ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <CheckCircle2 size={48} className="text-emerald-500" />
            <div className="text-[14px] font-bold text-slate-800 dark:text-slate-100">Conectado!</div>
            <div className="text-[12px] text-slate-500">{fmtNumero(numero)}</div>
          </div>
        ) : (
          <>
            {qr ? <img src={qr} alt="QR do WhatsApp" className="w-64 h-64 rounded-xl bg-white p-2" /> : <div className="w-64 h-64 flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>}
            <ol className="text-[12px] text-slate-600 dark:text-slate-400 list-decimal pl-5 self-stretch">
              <li>No celular do chip, abra o WhatsApp.</li>
              <li>Toque em <b>Aparelhos conectados</b> → <b>Conectar um aparelho</b>.</li>
              <li>Aponte para este QR (ele se renova sozinho).</li>
            </ol>
            {erro && <div className="text-[11px] text-rose-500">{erro}</div>}
          </>
        )}
      </div>
    </div>
  );
}

function EditorPerfil({ chip, salvar }: { chip: Chip; salvar: (p: Record<string, unknown>) => Promise<{ ok: boolean; j: any }> }) {
  const [nome, setNome] = useState(chip.perfilNome ?? "");
  const [recado, setRecado] = useState(chip.perfilRecado ?? "");
  const [foto, setFoto] = useState<string | null>(null);
  const [papel, setPapel] = useState(chip.papel);
  const [agentKey, setAgentKey] = useState(chip.agentKey ?? "");
  const [limite, setLimite] = useState(chip.limiteDia);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  return (
    <div className="mt-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <label className="cursor-pointer">
          {(foto ?? chip.fotoUrl) ? <img src={(foto ?? chip.fotoUrl)!} alt="" className="w-14 h-14 rounded-full object-cover" /> : <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center"><ImageIcon size={18} className="text-slate-400" /></div>}
          <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setFoto(await paraJpegQuadrado(f)); }} />
        </label>
        <div className="text-[11px] text-slate-500">Toque na foto pra trocar. Vai como foto de perfil do número no WhatsApp.</div>
      </div>
      <input value={nome} maxLength={25} onChange={(e) => setNome(e.target.value)} placeholder="Nome no WhatsApp (até 25)" className="rounded-xl bg-transparent border border-slate-300 dark:border-white/15 px-3 py-2 text-[13px]" />
      <input value={recado} maxLength={139} onChange={(e) => setRecado(e.target.value)} placeholder="Recado / Sobre (até 139)" className="rounded-xl bg-transparent border border-slate-300 dark:border-white/15 px-3 py-2 text-[13px]" />
      <div className="flex gap-2 flex-wrap items-center">
        {(["zaeon", "agente", "pessoal"] as const).map((p) => (
          <button key={p} onClick={() => setPapel(p)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold border ${papel === p ? "bg-emerald-500 text-white border-emerald-500" : "border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-300"}`}>{PAPEL[p]}</button>
        ))}
        {papel === "agente" && <input value={agentKey} onChange={(e) => setAgentKey(e.target.value)} placeholder="agentKey" className="rounded-xl bg-transparent border border-slate-300 dark:border-white/15 px-3 py-1.5 text-[12px] w-28" />}
        <label className="text-[11px] text-slate-500 flex items-center gap-1">teto/dia <input type="number" min={1} value={limite} onChange={(e) => setLimite(Number(e.target.value))} className="w-20 rounded-lg bg-transparent border border-slate-300 dark:border-white/15 px-2 py-1 text-[12px]" /></label>
      </div>
      <button disabled={salvando} onClick={async () => {
        setSalvando(true); setAviso(null);
        const r = await salvar({ perfilNome: nome, perfilRecado: recado, papel, agentKey: papel === "agente" ? agentKey : null, limiteDia: limite, ...(foto ? { foto } : {}) });
        setSalvando(false); setAviso(r.ok ? (r.j?.perfil ? `Salvo — ${r.j.perfil}.` : "Salvo.") : (r.j?.error ?? "falhou"));
      }} className="self-start px-4 py-2 rounded-xl bg-emerald-500 text-white text-[12px] font-bold disabled:opacity-50">{salvando ? "Salvando…" : "Salvar perfil"}</button>
      {aviso && <div className="text-[11px] text-slate-600 dark:text-slate-300">{aviso}</div>}
    </div>
  );
}

function Testar({ chipId, onErro }: { chipId: string; onErro: (e: string | null) => void }) {
  const [aberto, setAberto] = useState(false);
  const [numero, setNumero] = useState("");
  const [ok, setOk] = useState(false);
  if (!aberto) return <button onClick={() => setAberto(true)} className="flex items-center gap-1 text-sky-600 dark:text-sky-400"><Send size={13} /> Testar</button>;
  return (
    <span className="flex items-center gap-1">
      <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="DDD + número" className="w-32 rounded-lg bg-transparent border border-slate-300 dark:border-white/15 px-2 py-1 text-[11px] font-normal" />
      <button onClick={async () => {
        onErro(null); setOk(false);
        const r = await fetch(`/api/whatsapp/chips/${chipId}/teste`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ numero }) });
        const j = await r.json().catch(() => ({}));
        if (r.ok) setOk(true); else onErro(j?.error ?? "não saiu");
      }} className="text-sky-600 dark:text-sky-400">{ok ? "✓ enviado" : "Enviar"}</button>
    </span>
  );
}
