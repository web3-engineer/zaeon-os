"use client";

/**
 * AgentsModule — gateway de agentes (founder). Lista o roster (personas + mentores) com o
 * AgentProfile sobreposto: avatar (upload → data URL → PATCH), nome, bio, ativo, ordem, e o
 * USO (AgentUsage: total, nº de usuários, top usuários). Criar agente novo (persona ou mentor).
 * Vidro claro === escuro. Rotas: GET/POST /api/admin/agents · PATCH/DELETE /api/admin/agents/:key.
 * "✨ avatar vivo" abre o ESTÚDIO (Etapa B): o founder descreve a persona, vê cada estado sendo
 * gerado ao lado com o avatar já animando, aprova/rerola um a um e salva (banco). Rota:
 * POST/DELETE /api/admin/agents/:key/avatar.
 * "🪪 crachá" edita o que aparece no CRACHÁ da landing e da sala de Assistentes (área, linha, o que
 * entrega, emoji, WhatsApp, Instagram, Facebook) com a prévia do crachá ao vivo. Desativar o agente
 * tira ele da vitrine. "+ agente" (mentor) entra sozinho na landing e nos Assistentes.
 * Acima da lista, o bloco POOL (PoolPainel, Fatia 7): custo R$ 0 comprovado do pool grátis.
 */
import { useCallback, useEffect, useState } from "react";
import AgentAvatar from "@/components/agents/AgentAvatar";
import EstudioAvatar from "@/components/agents/avatar/EstudioAvatar";
import { invalidarManifestos, useManifesto } from "@/components/agents/avatar/hooks";
import { AVATAR_LOOKS } from "@/lib/avatars/looks";
import Cracha from "@/components/agents/Cracha";
import { nativosVitrine } from "@/lib/agents/nativos";
import { VIDRO_BOLHA, VIDRO_CHIP, VIDRO_POPOVER, TXT, TXT_2, TXT_MUDO } from "@/lib/canal/vidro";
import PoolPainel from "./PoolPainel";

type Top = { userId: string; contagem: number; ultimoUso: string; nome: string | null; email: string | null };
type Agente = {
  agentKey: string; tipo: "persona" | "mentor"; nome: string; emoji: string; bio: string; curso?: string;
  avatarUrl: string | null; ativo: boolean; ordem: number; custom: boolean;
  area: string | null; entrega: string[]; redes: { whatsapp: string | null; instagram: string | null; facebook: string | null };
  uso: { total: number; usuarios: number; ultimoUso: string | null; top: Top[] };
};
/** PR-A3 (C5): consumo medido do TokenLedger — por agente no range; agente SEM linha não vem (UI mostra "—"). */
type Consumo = { chave: string; chamadas: number; ok: number; promptTokens: number; completionTokens: number; cachedTokens: number; totalTokens: number; custoEstimadoUsd: number; tokensPorChamada: number };
type Tokens = { range: Range; grupos: Consumo[]; serie14d: { dia: string; totalTokens: number }[]; medindoDesde: string | null; hoje: Record<string, number>; tetos: Record<string, { fora: boolean; usado: number; teto: number | null }> };
type Range = "7d" | "30d" | "all";
type Ordem = "uso" | "in" | "out" | "cached" | "total" | "custo" | "porTurno";
export const ORDENS: { k: Ordem; rotulo: string }[] = [
  { k: "uso", rotulo: "uso" }, { k: "in", rotulo: "tokens in" }, { k: "out", rotulo: "tokens out" }, { k: "cached", rotulo: "cached" },
  { k: "total", rotulo: "total" }, { k: "custo", rotulo: "custo est." }, { k: "porTurno", rotulo: "tokens/turno" },
];
/** PURO: valor da coluna pra ordenar; sem linha no ledger = -1 (vai pro fim, e a UI mostra "—"). */
export function valorOrdem(a: { uso: { total: number } }, c: Consumo | undefined, k: Ordem): number {
  if (k === "uso") return a.uso.total;
  if (!c) return -1;
  return k === "in" ? c.promptTokens : k === "out" ? c.completionTokens : k === "cached" ? c.cachedTokens : k === "total" ? c.totalTokens : k === "custo" ? c.custoEstimadoUsd : c.tokensPorChamada;
}
/** PURO: formata número ou "—" quando não há linha (0 fica reservado a linha existente com zero). */
export const fmtTok = (c: Consumo | undefined, v: number | undefined): string => (c ? new Intl.NumberFormat("pt-BR").format(v ?? 0) : "—");
export const fmtUsd = (c: Consumo | undefined): string => (c ? `US$ ${c.custoEstimadoUsd.toFixed(4)}` : "—");
export const fmtDesde = (iso: string | null): string => (iso ? `medindo desde ${new Date(iso).toLocaleDateString("pt-BR")}` : "sem dados de consumo ainda — a medição começa no próximo turno");
const H = { "Content-Type": "application/json" };
const inputCls = `min-h-[40px] px-3 rounded-xl text-[13px] bg-white/70 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 ${TXT} placeholder:text-slate-400 dark:placeholder:text-white/35 outline-none focus:border-cyan-400/70`;

export default function AgentsModule({ glassPanel }: { glassPanel: string }) {
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [estado, setEstado] = useState<"carregando" | "ok" | "off" | "403" | "erro">("carregando");
  const [filtro, setFiltro] = useState("");
  const [criando, setCriando] = useState(false);
  const [novo, setNovo] = useState({ agentKey: "", tipo: "mentor", nome: "", bio: "", curso: "", personaText: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [estudio, setEstudio] = useState<Agente | null>(null);
  const [rev, setRev] = useState(0);
  const [range, setRange] = useState<Range>("7d");
  const [ordem, setOrdem] = useState<Ordem>("uso");
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const carregarTokens = useCallback(async (r: Range) => {
    try {
      const res = await fetch(`/api/admin/agents/tokens?range=${r}&groupBy=agente`, { cache: "no-store" });
      if (res.ok) setTokens(await res.json());
    } catch { /* o painel de consumo é leitura: falhar aqui não derruba o módulo */ }
  }, []);
  useEffect(() => { void carregarTokens(range); }, [carregarTokens, range]);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/agents", { cache: "no-store" });
      if (r.status === 404) { setEstado("off"); return; }
      if (r.status === 403 || r.status === 401) { setEstado("403"); return; }
      if (!r.ok) throw new Error(String(r.status));
      setAgentes((await r.json()).agentes ?? []);
      setEstado("ok");
    } catch { setEstado("erro"); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  const patch = useCallback(async (key: string, body: Record<string, unknown>) => {
    const r = await fetch(`/api/admin/agents/${key}`, { method: "PATCH", headers: H, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg(j?.error || `Falhou (${r.status})`); return false; }
    setMsg(null);
    await carregar();
    return true;
  }, [carregar]);

  const trocarAvatar = useCallback((key: string, file: File | null) => {
    if (!file) return;
    if (file.size > 1_200_000) { setMsg("Foto até 1.2MB."); return; }
    const fr = new FileReader();
    fr.onload = () => { void patch(key, { avatarUrl: String(fr.result) }); };
    fr.readAsDataURL(file);
  }, [patch]);

  const criar = async () => {
    const r = await fetch("/api/admin/agents", { method: "POST", headers: H, body: JSON.stringify({ ...novo, agentKey: novo.agentKey.trim().toLowerCase() }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg(j?.error || `Falhou (${r.status})`); return; }
    setMsg(null); setCriando(false);
    setNovo({ agentKey: "", tipo: "mentor", nome: "", bio: "", curso: "", personaText: "" });
    await carregar();
  };

  if (estado === "off") return <Aviso glassPanel={glassPanel} texto="Gateway de agentes desligado (NEXT_PUBLIC_AGENTS_ADMIN=1 liga)." />;
  if (estado === "403") return <Aviso glassPanel={glassPanel} texto="Só o founder entra aqui." />;
  if (estado === "erro") return <Aviso glassPanel={glassPanel} texto="Não consegui carregar os agentes." />;
  if (estado === "carregando") return <Aviso glassPanel={glassPanel} texto="Carregando agentes…" />;

  const q = filtro.trim().toLowerCase();
  const consumoDe = (k: string) => tokens?.grupos.find((g) => g.chave === k);
  const filtrados = q ? agentes.filter((a) => `${a.agentKey} ${a.nome} ${a.curso ?? ""} ${a.tipo}`.toLowerCase().includes(q)) : agentes;
  const lista = [...filtrados].sort((x, y) => valorOrdem(y, consumoDe(y.agentKey), ordem) - valorOrdem(x, consumoDe(x.agentKey), ordem) || x.ordem - y.ordem);
  const totalUso = agentes.reduce((s, a) => s + a.uso.total, 0);
  const totalTokens = tokens?.grupos.reduce((s, g) => s + g.totalTokens, 0) ?? 0;

  return (
    <div className={`flex-1 min-h-0 flex flex-col rounded-[32px] p-5 sm:p-7 ${glassPanel}`}>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h2 className={`text-xl font-black tracking-tight ${TXT}`}>Agents</h2>
        <span className={`text-[11px] font-bold uppercase tracking-widest ${TXT_MUDO}`}>{agentes.length} agentes · {totalUso} usos{tokens?.grupos.length ? ` · ${new Intl.NumberFormat("pt-BR").format(totalTokens)} tokens (${range})` : ""}</span>
        <span className={`text-[11px] ${TXT_MUDO}`} title="primeira linha do TokenLedger">{fmtDesde(tokens?.medindoDesde ?? null)}</span>
        <div role="radiogroup" aria-label="Período do consumo" className="flex gap-1">
          {(["7d", "30d", "all"] as Range[]).map((r) => (
            <button key={r} type="button" role="radio" aria-checked={range === r} onClick={() => setRange(r)} className={`min-h-[32px] px-2.5 rounded-lg text-[11px] font-bold ${VIDRO_CHIP} ${range === r ? "ring-1 ring-cyan-400/70 " + TXT : TXT_MUDO}`}>{r === "all" ? "tudo" : r}</button>
          ))}
        </div>
        <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} aria-label="Ordenar por" className={`${inputCls} w-[150px]`}>
          {ORDENS.map((o) => <option key={o.k} value={o.k}>↓ {o.rotulo}</option>)}
        </select>
        <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="filtrar" aria-label="Filtrar agentes" className={`${inputCls} ml-auto w-[180px]`} />
        <button type="button" onClick={() => setCriando((v) => !v)} className={`min-h-[40px] px-4 rounded-xl text-[12px] font-black uppercase tracking-widest ${VIDRO_CHIP} ${TXT}`}>{criando ? "fechar" : "+ agente"}</button>
      </div>
      {msg && <p role="alert" className="mb-3 text-[12px] text-rose-600 dark:text-rose-300">{msg}</p>}

      {criando && (
        <div className={`mb-5 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-2 ${VIDRO_POPOVER}`}>
          <input value={novo.agentKey} onChange={(e) => setNovo({ ...novo, agentKey: e.target.value })} placeholder="chave (slug: odontologia)" className={inputCls} />
          <select value={novo.tipo} onChange={(e) => setNovo({ ...novo, tipo: e.target.value })} className={inputCls} aria-label="Tipo">
            <option value="mentor">mentor</option><option value="persona">persona</option>
          </select>
          <input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} placeholder="nome de exibição" className={inputCls} />
          <input value={novo.bio} onChange={(e) => setNovo({ ...novo, bio: e.target.value })} placeholder="bio / tagline" className={inputCls} />
          {novo.tipo === "mentor" && (
            <>
              <input value={novo.curso} onChange={(e) => setNovo({ ...novo, curso: e.target.value })} placeholder="curso (Odontologia)" className={inputCls} />
              <textarea value={novo.personaText} onChange={(e) => setNovo({ ...novo, personaText: e.target.value })} placeholder="personaText (≥ 40 caracteres) — como esse mentor pensa e ensina" rows={3} className={`${inputCls} md:col-span-2 py-2`} />
            </>
          )}
          <div className="md:col-span-2 flex justify-end">
            <button type="button" onClick={() => void criar()} className="min-h-[40px] px-5 rounded-xl text-[12px] font-black uppercase tracking-widest bg-cyan-500 text-slate-950 hover:scale-[1.02] active:scale-95 transition-transform">criar</button>
          </div>
        </div>
      )}

      {/* Fatia 7 (G8): o pool grátis — leitura, entra visível */}
      <PoolPainel />

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pr-1">
        {lista.map((a) => <Card key={`${a.agentKey}-${rev}`} a={a} consumo={consumoDe(a.agentKey)} teto={tokens?.tetos[a.agentKey]} serie={tokens?.serie14d} onPatch={patch} onAvatar={trocarAvatar} onEstudio={() => setEstudio(a)} />)}
      </div>
      {estudio && <EstudioModal a={estudio} onFechar={() => setEstudio(null)} onMudou={() => { invalidarManifestos(); setRev((r) => r + 1); }} />}
    </div>
  );
}

/** O estúdio em tela cheia por cima do admin (tela dividida: formulário | prévia ao vivo). */
function EstudioModal({ a, onFechar, onMudou }: { a: Agente; onFechar: () => void; onMudou: () => void }) {
  const manifest = useManifesto(a.agentKey);
  const look = AVATAR_LOOKS[a.agentKey];
  const doBanco = !!manifest?.estados.idle?.startsWith("/api/");
  const baseUrl = manifest ? (doBanco ? `/api/agents/avatars/${a.agentKey}/base.webp` : `/avatars/${a.agentKey}/base.webp`) : null;
  const [apagando, setApagando] = useState(false);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);
  const apagar = async () => {
    if (!window.confirm(`Apagar o avatar vivo de ${a.nome}? (volta pra foto${look ? " / avatar da casa" : ""})`)) return;
    setApagando(true);
    await fetch(`/api/admin/agents/${a.agentKey}/avatar`, { method: "DELETE" }).catch(() => null);
    setApagando(false);
    onMudou();
    onFechar();
  };
  return (
    <div role="dialog" aria-modal="true" aria-label={`Avatar vivo de ${a.nome}`} className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 backdrop-blur-sm p-3 sm:p-6">
      <div className={`mx-auto max-w-[1280px] rounded-[28px] p-4 sm:p-6 ${VIDRO_POPOVER}`}>
        <EstudioAvatar
          key={manifest?.versao ?? "novo"}
          endpoint={`/api/admin/agents/${a.agentKey}/avatar`}
          agentId={a.agentKey}
          nome={a.nome}
          personagemInicial={look?.personagem ?? `${a.nome}${a.curso ? `, mentor(a) de ${a.curso}` : ""}: ${a.bio}`}
          corInicial={look?.cor}
          existente={manifest}
          baseUrlExistente={baseUrl}
          fotoAtual={a.avatarUrl}
          onSalvo={onMudou}
          onFechar={onFechar}
        />
        {doBanco && (
          <div className="mt-4 flex justify-end">
            <button type="button" disabled={apagando} onClick={() => void apagar()} className={`min-h-[40px] px-3 rounded-xl text-[11px] ${TXT_MUDO} hover:text-rose-500 dark:hover:text-rose-300`}>apagar avatar vivo</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ a, consumo, teto, serie, onPatch, onAvatar, onEstudio }: { a: Agente; consumo?: Consumo; teto?: { fora: boolean; usado: number; teto: number | null }; serie?: { dia: string; totalTokens: number }[]; onPatch: (k: string, b: Record<string, unknown>) => Promise<boolean>; onAvatar: (k: string, f: File | null) => void; onEstudio: () => void }) {
  const [hover, setHover] = useState(false);
  const [tetoTxt, setTetoTxt] = useState(teto?.teto != null ? String(teto.teto) : "");
  useEffect(() => { setTetoTxt(teto?.teto != null ? String(teto.teto) : ""); }, [teto?.teto]);
  const [editandoCracha, setEditandoCracha] = useState(false);
  const [nome, setNome] = useState(a.nome);
  const [bio, setBio] = useState(a.bio);
  const [ordem, setOrdem] = useState(String(a.ordem));
  useEffect(() => { setNome(a.nome); setBio(a.bio); setOrdem(String(a.ordem)); }, [a.nome, a.bio, a.ordem]);
  const sujo = nome !== a.nome || bio !== a.bio || Number(ordem) !== a.ordem;
  return (
    <div className={`p-4 rounded-[22px] flex flex-col gap-3 ${VIDRO_BOLHA} ${a.ativo ? "" : "opacity-60"}`} onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}>
      <div className="flex items-start gap-3">
        <label className="relative cursor-pointer shrink-0" title="Trocar foto">
          <AgentAvatar src={a.avatarUrl} nome={a.nome} size={56} emoji={a.emoji} agentId={a.agentKey} hover={hover} />
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => onAvatar(a.agentKey, e.target.files?.[0] ?? null)} aria-label={`Trocar foto de ${a.nome}`} />
          <span className="absolute -bottom-1 -right-1 grid place-items-center w-6 h-6 rounded-full text-[11px] bg-cyan-500 text-slate-950 shadow">✎</span>
        </label>
        <div className="min-w-0 flex-1">
          <input value={nome} onChange={(e) => setNome(e.target.value)} aria-label="Nome" className={`w-full ${inputCls} font-bold`} />
          <p className={`mt-1 text-[10.5px] font-mono uppercase tracking-widest ${TXT_MUDO}`}>@{a.agentKey} · {a.tipo}{a.curso ? ` · ${a.curso}` : ""}{a.custom ? " · custom" : ""}</p>
        </div>
        <div className="shrink-0 flex flex-col gap-1.5">
          <button type="button" onClick={onEstudio} title="Criar / revisar o avatar vivo (estúdio)" className={`min-h-[36px] px-3 rounded-xl text-[11px] font-black uppercase tracking-widest ${VIDRO_CHIP} ${TXT}`}>✨ avatar vivo</button>
          <button type="button" onClick={() => setEditandoCracha((v) => !v)} aria-expanded={editandoCracha} title="O que aparece no crachá da landing e dos Assistentes" className={`min-h-[36px] px-3 rounded-xl text-[11px] font-black uppercase tracking-widest ${VIDRO_CHIP} ${TXT}`}>🪪 crachá</button>
        </div>
      </div>
      <input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="bio" aria-label="Bio" className={`${inputCls} text-[12px]`} />
      <div className="flex items-center gap-2">
        <label className={`flex items-center gap-2 text-[12px] font-bold ${TXT_2} min-h-[40px] cursor-pointer`}>
          <input type="checkbox" checked={a.ativo} onChange={(e) => void onPatch(a.agentKey, { ativo: e.target.checked })} className="w-4 h-4 accent-cyan-500" /> ativo
        </label>
        <label className={`flex items-center gap-1.5 text-[12px] ${TXT_MUDO} ml-auto`}>ordem
          <input value={ordem} onChange={(e) => setOrdem(e.target.value)} inputMode="numeric" aria-label="Ordem" className={`${inputCls} w-[64px] text-center`} />
        </label>
        {sujo && (
          <button type="button" onClick={() => void onPatch(a.agentKey, { nome, bio, ordem: Number(ordem) || 0 })} className="min-h-[40px] px-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-cyan-500 text-slate-950">salvar</button>
        )}
        {a.avatarUrl && (
          <button type="button" onClick={() => void onPatch(a.agentKey, { avatarUrl: null })} className={`min-h-[40px] px-2 rounded-xl text-[11px] ${TXT_MUDO} hover:text-rose-500 dark:hover:text-rose-300`} title="Remover foto">sem foto</button>
        )}
      </div>
      {editandoCracha && <EditorCracha a={a} onPatch={onPatch} />}
      {/* USO — o card founder, FUNDIDO com o consumo medido (C5). Um painel só; "—" = sem linha no período. */}
      <div className="pt-3 border-t border-slate-200/70 dark:border-white/10">
        <div className="flex items-baseline gap-3">
          <span className={`text-2xl font-black tabular-nums ${TXT}`}>{a.uso.total}</span>
          <span className={`text-[11px] font-bold uppercase tracking-widest ${TXT_MUDO}`}>usos · {a.uso.usuarios} {a.uso.usuarios === 1 ? "usuário" : "usuários"}</span>
          {a.uso.ultimoUso && <span className={`ml-auto text-[10.5px] ${TXT_MUDO}`}>{new Date(a.uso.ultimoUso).toLocaleDateString("pt-BR")}</span>}
        </div>
        <div className={`mt-2 grid grid-cols-3 gap-x-3 gap-y-1 text-[11px] tabular-nums ${TXT_2}`} title={serie?.length ? `14 dias (todos os agentes): ${serie.map((d) => `${d.dia.slice(5)} ${d.totalTokens}`).join(" · ")}` : undefined}>
          <span><b className={TXT_MUDO}>in</b> {fmtTok(consumo, consumo?.promptTokens)}</span>
          <span><b className={TXT_MUDO}>out</b> {fmtTok(consumo, consumo?.completionTokens)}</span>
          <span title="tokens servidos pelo contextCache — cobrados pelo preço de cache (~10%), exibidos à parte"><b className={TXT_MUDO}>cached</b> {fmtTok(consumo, consumo?.cachedTokens)}</span>
          <span><b className={TXT_MUDO}>total</b> {fmtTok(consumo, consumo?.totalTokens)}</span>
          <span title="estimativa pela tabela em lib/ai/preco.ts; não é fatura"><b className={TXT_MUDO}>custo est.</b> {fmtUsd(consumo)}</span>
          <span><b className={TXT_MUDO}>tokens/turno</b> {fmtTok(consumo, consumo?.tokensPorChamada)}</span>
        </div>
        {serie?.length ? (
          <div className="mt-1.5 flex items-end gap-px h-5" aria-hidden title="14 dias (todos os agentes)">
            {serie.map((d) => { const max = Math.max(1, ...serie.map((x) => x.totalTokens)); return <span key={d.dia} className="flex-1 rounded-sm bg-cyan-500/50" style={{ height: `${Math.max(2, Math.round((d.totalTokens / max) * 100))}%` }} />; })}
          </div>
        ) : null}
        {/* TETO — ler ≠ agir: aqui só avisa; AGENT_TETO_ENFORCE=1 no servidor é o que barra (e só o autônomo) */}
        <div className="mt-2 flex items-center gap-2">
          <label className={`flex items-center gap-1.5 text-[11px] ${TXT_MUDO}`}>teto/dia
            <input value={tetoTxt} onChange={(e) => setTetoTxt(e.target.value)} onBlur={() => { const n = tetoTxt.trim() === "" ? null : Number(tetoTxt); if (n === null || (Number.isInteger(n) && n >= 0)) void onPatch(a.agentKey, { tetoTokensDia: n }); }} inputMode="numeric" placeholder="sem teto" aria-label={`Teto diário de tokens de ${a.nome}`} className={`${inputCls} w-[96px] text-center`} />
          </label>
          {teto?.fora && <span className="text-[11px] font-bold text-amber-600 dark:text-amber-300" title="só avisa; AGENT_TETO_ENFORCE=1 faz o freio agir (e só no trabalho autônomo)">estouraria o teto hoje ({new Intl.NumberFormat("pt-BR").format(teto.usado)}/{new Intl.NumberFormat("pt-BR").format(teto.teto ?? 0)})</span>}
        </div>
        {a.uso.top.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
            {a.uso.top.map((t) => (
              <li key={t.userId} className={`flex items-center justify-between gap-2 text-[12px] ${TXT_2}`}>
                <span className="truncate">{t.nome || t.email || t.userId}</span>
                <span className={`tabular-nums font-bold ${TXT}`}>{t.contagem}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Aviso({ glassPanel, texto }: { glassPanel: string; texto: string }) {
  return <div className={`flex-1 grid place-items-center rounded-[32px] ${glassPanel}`}><p className={`text-[13px] ${TXT_MUDO}`}>{texto}</p></div>;
}

/** Padrão de vitrine do agente (o que o crachá mostra quando o campo do Modo CEO está vazio). */
function padraoVitrine(a: Agente): { area: string; entrega: string[] } {
  const n = nativosVitrine().find((x) => x.slug === a.agentKey);
  return { area: n?.course ?? a.curso ?? "", entrega: n?.signatureArtifacts ?? [] };
}

/**
 * Editor do CRACHÁ (Modo CEO): campos à esquerda, o crachá de verdade à direita mudando enquanto
 * digita. Vazio = usa o padrão do agente. Salva em PATCH /api/admin/agents/:key.
 */
function EditorCracha({ a, onPatch }: { a: Agente; onPatch: (k: string, b: Record<string, unknown>) => Promise<boolean> }) {
  const padrao = padraoVitrine(a);
  const [f, setF] = useState({
    area: a.area ?? "", bio: a.bio ?? "", entrega: a.entrega.join(", "), emoji: a.emoji && a.emoji !== "⟁" ? a.emoji : "",
    whatsapp: a.redes.whatsapp ?? "", instagram: a.redes.instagram ? `@${a.redes.instagram}` : "", facebook: a.redes.facebook ?? "",
  });
  const [salvando, setSalvando] = useState(false);
  const [ok, setOk] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setOk(false); setF({ ...f, [k]: e.target.value }); };
  const entregaPrevia = f.entrega.split(",").map((x) => x.trim()).filter(Boolean);
  const salvar = async () => {
    setSalvando(true);
    const deu = await onPatch(a.agentKey, { area: f.area, bio: f.bio, entrega: f.entrega, emoji: f.emoji, whatsapp: f.whatsapp, instagram: f.instagram, facebook: f.facebook });
    setSalvando(false);
    setOk(deu);
  };
  const campo = (rotulo: string, k: keyof typeof f, ph: string) => (
    <label className="flex flex-col gap-1">
      <span className={`text-[10px] font-bold uppercase tracking-widest ${TXT_MUDO}`}>{rotulo}</span>
      <input value={f[k]} onChange={set(k)} placeholder={ph} className={inputCls} />
    </label>
  );
  return (
    <div className={`p-3 rounded-2xl flex flex-col gap-3 ${VIDRO_POPOVER}`}>
      <p className={`text-[11px] ${TXT_MUDO}`}>O que aparece no <b>crachá</b> da landing e dos Assistentes. Vazio = o padrão do agente.</p>
      <div className="grid grid-cols-1 gap-2">
        {campo("Área", "area", padrao.area || "ex.: Pesquisa, Medicina")}
        {campo("Linha (frase curta)", "bio", "o que ele faz, em uma frase")}
        {campo("Entrega (até 4, por vírgula)", "entrega", padrao.entrega.join(", ") || "resumos, quiz, ABNT")}
        {campo("Emoji (sem foto)", "emoji", "🧬")}
        {campo("WhatsApp", "whatsapp", "11 99999-8888")}
        {campo("Instagram", "instagram", "@perfil")}
        {campo("Facebook", "facebook", "pagina")}
      </div>
      <div className="dark flex justify-center rounded-2xl bg-slate-950/90 py-2">
        <Cracha
          d={{
            agentId: a.agentKey, nome: a.nome, curso: f.area || padrao.area, tagline: f.bio, emoji: f.emoji || a.emoji,
            artefatos: entregaPrevia.length ? entregaPrevia : padrao.entrega, foto: a.avatarUrl, id: a.tipo === "mentor" ? "ZA-000" : "ZA-N00",
            rotulo: a.tipo === "mentor" ? "mentor" : "nativo",
            redes: { whatsapp: f.whatsapp || null, instagram: f.instagram.replace(/^@/, "") || null, facebook: f.facebook || null },
          }}
        />
      </div>
      <div className="flex items-center gap-2">
        {ok && <span className="text-[12px] text-emerald-600 dark:text-emerald-300">salvo ✓</span>}
        <button type="button" disabled={salvando} onClick={() => void salvar()} className="ml-auto min-h-[40px] px-4 rounded-xl text-[11px] font-black uppercase tracking-widest bg-cyan-500 text-slate-950 disabled:opacity-50">
          {salvando ? "salvando…" : "salvar crachá"}
        </button>
      </div>
    </div>
  );
}
