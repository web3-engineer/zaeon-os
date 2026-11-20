"use client";

/**
 * AuraCard — o cartão AURA do perfil: número grande + anel de nível, contadores (nós validados,
 * cérebros completos), parede de atestados (Credential cunhadas, link on-chain), credenciais
 * acadêmicas (badge por método) + envio de título com documento. Professores/instituições veem a
 * fila de verificação. Vidro claro === escuro. Flag NEXT_PUBLIC_AURA_ECONOMY (o pai decide render).
 * #427: `visitante` = o perfil de OUTRA pessoa (dados de /api/perfil/[id]): só leitura, sem o envio de título,
 * sem as filas, e SEM os cérebros (nem a seção, nem o contador); validações de estudo só com o número.
 */
import { pedirTexto, tr } from "@/lib/ui/avisos";
import { useCallback, useEffect, useState } from "react";
import { levelFromAura, NIVEIS_ACADEMICOS, ROTULO_NIVEL, seloDoMetodo, type NivelAcademico } from "@/lib/aura/rules";
import CredencialCard from "@/components/solana/CredencialCard";
import SolanaMark from "@/components/solana/SolanaMark";

type Aura = {
  aura: number; level: number; titulo: string; prox: number | null; min: number; proxMin: number | null;
  validatedSkills: number; completedBrains: number; learnedNodes: number; academicLevel: string | null;
  academicas: { id: string; nivel: string; area: string | null; instituicao: string | null; metodo: string; status: string; verifiedAt: string | null }[];
  parede: { id: string; type: string; title: string; assetId: string | null; network: string; issuedAt: string | null; explorerUrl?: string | null; validadoPor?: string | null }[];
  recent: { id: string; source: string; amount: number; reason: string | null; at: string }[];
  /** Cérebros do aluno (PR-D): título, arquétipo, completudes. */
  cerebros?: { id: string; titulo: string; tipoTopico: string; modoValidacao: string; aprendizado: number; conclusao: number; passos: number; completo: boolean }[];
  habilidadesValidadas?: { id: string; titulo: string; at: string }[];
};
type FilaCerebro = { id: string; noId: string; evidencia: string | null; createdAt: string; estudo: { titulo: string; tipoTopico: string; objetivo: string } | null; no: { label: string; estado: string } | null; aluno: { id: string; nome: string | null; email: string | null } | null }[];
type Fila = { id: string; nivel: string; area: string | null; instituicao: string | null; temDoc: boolean; docDuplicado: boolean; aluno: { id: string; nome: string | null; email: string | null } }[];

const H = { "Content-Type": "application/json" };
const card = "rounded-3xl border border-white/60 dark:border-white/[0.12] backdrop-blur-2xl backdrop-saturate-[1.6] bg-white/60 dark:bg-white/[0.05] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)]";
const label = "text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-white/45";
const txt = "text-slate-900 dark:text-white", txt2 = "text-slate-600 dark:text-white/70", mudo = "text-slate-500 dark:text-white/45";
const inputCls = `min-h-[40px] px-3 rounded-xl text-[13px] bg-white/70 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 ${txt} placeholder:text-slate-400 dark:placeholder:text-white/35 outline-none focus:border-cyan-400/70`;

const SELO: Record<ReturnType<typeof seloDoMetodo>, { t: string; c: string }> = {
  nenhum: { t: "declarado — não verificado", c: "text-slate-500 dark:text-white/45 border-slate-300 dark:border-white/15" },
  vinculo: { t: "vínculo verificado", c: "text-sky-700 dark:text-sky-200 border-sky-400/50" },
  verificado: { t: "✓ verificado", c: "text-emerald-700 dark:text-emerald-200 border-emerald-400/60" },
  ouro: { t: "✓ verificado · selo ouro", c: "text-amber-700 dark:text-amber-200 border-amber-400/70" },
};
const TIPO_ATESTADO: Record<string, string> = {
  skill: "Habilidade dominada", work: "Trabalho concluído", course: "Aula concluída", "mentor-cert": "Certificação de mentor", academic: "Título acadêmico verificado",
};
const explorer = (assetId: string, network: string) => `https://explorer.solana.com/address/${assetId}${network === "mainnet" || network === "mainnet-beta" ? "" : `?cluster=${network}`}`;

/** #427: o perfil de outra pessoa — a AURA já vem pronta (sem cérebros) e o número de validações pendentes. */
export type AuraVisitante = { aura: Omit<Aura, "completedBrains" | "learnedNodes" | "cerebros" | "habilidadesValidadas"> | null; validacoesPendentes: number | null };

export default function AuraCard({ visitante }: { visitante?: AuraVisitante } = {}) {
  const [d, setD] = useState<Aura | null>(null);
  const [estado, setEstado] = useState<"carregando" | "ok" | "off" | "erro">("carregando");
  const [fila, setFila] = useState<Fila | null>(null);
  const [filaCerebro, setFilaCerebro] = useState<FilaCerebro | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [envio, setEnvio] = useState({ nivel: "graduacao" as NivelAcademico, area: "", instituicao: "", doc: "", docNome: "" });
  const [enviando, setEnviando] = useState(false);
  const [abrindo, setAbrindo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (visitante) return; // perfil de outra pessoa: os dados já vieram prontos (e sem cérebros)
    try {
      const r = await fetch("/api/profile/aura", { cache: "no-store" });
      if (r.status === 404) { setEstado("off"); return; }
      if (!r.ok) throw new Error(String(r.status));
      setD(await r.json()); setEstado("ok");
      const f = await fetch("/api/academic/fila?status=pendente", { cache: "no-store" });
      setFila(f.ok ? (await f.json()).fila : null);
      // Fila de validação dos cérebros (MAP_HARNESS): 404 com a flag off → some.
      const fc = await fetch("/api/map/validacoes?status=pendente", { cache: "no-store" }).catch(() => null);
      setFilaCerebro(fc?.ok ? (await fc.json()).validacoes : null);
    } catch { setEstado("erro"); }
  }, [visitante]);
  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => {
    if (!visitante) return;
    if (!visitante.aura) { setEstado("off"); return; }
    setD({ ...visitante.aura, completedBrains: 0, learnedNodes: 0 }); setEstado("ok");
  }, [visitante]);
  const somenteLeitura = !!visitante;

  const decidirCerebro = async (vId: string, status: "aprovada" | "rejeitada") => {
    let comentario = "";
    if (status === "rejeitada") {
      const m = await pedirTexto({ titulo: tr("avisos.motivoRejeicao", "Motivo da rejeição (opcional)"), botao: tr("avisos.rejeitar", "Rejeitar"), opcional: true });
      if (m === null) return;   // cancelou: não rejeita
      comentario = m;
    }
    const r = await fetch(`/api/map/validacao/${vId}`, { method: "POST", headers: H, body: JSON.stringify({ status, comentario }) });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? (status === "aprovada" ? `Validado${d.credentialId ? " · atestado a caminho" : ""}.` : "Rejeitado — o aluno volta a estudar o nó.") : d?.error || "Não deu.");
    void carregar();
  };

  const onDoc = (f?: File) => {
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) { setMsg("Documento até 4MB."); return; }
    const r = new FileReader(); r.onload = () => setEnvio((e) => ({ ...e, doc: String(r.result), docNome: f.name })); r.readAsDataURL(f);
  };
  const enviar = async () => {
    setEnviando(true); setMsg(null);
    try {
      const r = await fetch("/api/credentials/academic", { method: "POST", headers: H, body: JSON.stringify({ nivel: envio.nivel, area: envio.area, instituicao: envio.instituicao, doc: envio.doc || undefined }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(j?.error || `Falhou (${r.status})`); return; }
      setMsg(j?.aviso || (envio.doc ? "Enviado — aguardando um professor/instituição verificar." : "Registrado como declarado (sem AURA até comprovar)."));
      setEnvio({ nivel: "graduacao", area: "", instituicao: "", doc: "", docNome: "" });
      await carregar();
    } finally { setEnviando(false); }
  };
  const verificar = async (id: string, status: "verificado" | "rejeitado") => {
    const r = await fetch(`/api/academic/${id}/verificar`, { method: "POST", headers: H, body: JSON.stringify({ status }) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? (status === "verificado" ? `Verificado — +${j?.aura?.concedida ?? 0} AURA pro aluno.` : "Rejeitado.") : (j?.error || `Falhou (${r.status})`));
    await carregar();
  };
  const verDoc = async (id: string) => {
    setAbrindo(id);
    try {
      const r = await fetch(`/api/academic/${id}/doc`);
      if (!r.ok) { setMsg("Sem acesso ao documento."); return; }
      const { doc } = await r.json();
      const w = window.open(); if (w) { w.document.write(`<iframe src="${doc}" style="width:100vw;height:100vh;border:0"></iframe>`); }
    } finally { setAbrindo(null); }
  };

  if (estado === "off") return null;
  if (estado === "carregando") return <div className={`${card} p-5 mt-6 text-[12px] ${mudo}`}>Carregando AURA…</div>;
  if (estado === "erro" || !d) return <div className={`${card} p-5 mt-6 text-[12px] ${mudo}`}>Não consegui carregar a AURA.</div>;

  const nivel = levelFromAura(d.aura);
  const span = nivel.proxMin !== null ? nivel.proxMin - nivel.min : 1;
  const pct = nivel.proxMin !== null ? Math.min(100, Math.round(((d.aura - nivel.min) / span) * 100)) : 100;
  const R = 44, circ = 2 * Math.PI * R;

  return (
    <div className="mt-6 flex flex-col gap-4">
      {/* saldo + nível + contadores */}
      <div className={`${card} p-5 flex flex-wrap items-center gap-6`}>
        <div className="relative w-[110px] h-[110px] shrink-0" aria-label={`Nível ${nivel.level} — ${nivel.titulo}`}>
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r={R} fill="none" strokeWidth="7" className="stroke-slate-200 dark:stroke-white/10" />
            <circle cx="50" cy="50" r={R} fill="none" strokeWidth="7" strokeLinecap="round" className="stroke-cyan-500 dark:stroke-cyan-300" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div><div className={`text-[11px] font-black uppercase tracking-widest ${mudo}`}>nível</div><div className={`text-2xl font-black leading-none ${txt}`}>{nivel.level}</div></div>
          </div>
        </div>
        <div className="min-w-0">
          <div className={label}>AURA</div>
          <div className={`text-5xl font-black tabular-nums leading-none ${txt}`}>{d.aura}</div>
          <div className={`mt-1 text-[12px] ${txt2}`}>{nivel.titulo}{nivel.prox !== null ? ` · faltam ${nivel.prox} pro próximo nível` : " · nível máximo"}</div>
        </div>
        <div className={`ml-auto grid ${somenteLeitura ? "grid-cols-2" : "grid-cols-3"} gap-4 text-center`}>
          <Contador n={d.validatedSkills} t="habilidades validadas" />
          {!somenteLeitura && <Contador n={d.completedBrains} t="cérebros completos" />}
          <Contador n={d.parede.length} t="atestados on-chain" />
        </div>
      </div>

      {msg && <p role="status" className="text-[12px] px-1 text-cyan-700 dark:text-cyan-300">{msg}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* credenciais acadêmicas */}
        <div className={`${card} p-5`}>
          <div className={`${label} mb-3`}>Títulos acadêmicos</div>
          {d.academicas.length === 0 && <p className={`text-[12px] ${mudo}`}>{somenteLeitura ? "Nenhum título ainda." : "Nenhum título ainda. Um diploma comprovado vale AURA proporcional ao nível."}</p>}
          <ul className="flex flex-col gap-2">
            {d.academicas.map((c) => {
              const selo = c.status === "verificado" ? SELO[seloDoMetodo(c.metodo as any)] : c.status === "rejeitado" ? { t: "rejeitado", c: "text-rose-700 dark:text-rose-200 border-rose-400/60" } : c.metodo === "declarado" ? SELO.nenhum : { t: "aguardando verificação", c: "text-amber-700 dark:text-amber-200 border-amber-400/60" };
              return (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span className={`text-[13px] font-semibold truncate ${txt}`}>{ROTULO_NIVEL[c.nivel as NivelAcademico] ?? c.nivel}{c.area ? ` em ${c.area}` : ""}{c.instituicao ? ` — ${c.instituicao}` : ""}</span>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[11px] font-bold ${selo.c}`}>{selo.t}</span>
                </li>
              );
            })}
          </ul>
          {!somenteLeitura && (<>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select value={envio.nivel} onChange={(e) => setEnvio({ ...envio, nivel: e.target.value as NivelAcademico })} className={inputCls} aria-label="Nível do título">
              {NIVEIS_ACADEMICOS.map((n) => <option key={n} value={n}>{ROTULO_NIVEL[n]}</option>)}
            </select>
            <input value={envio.area} onChange={(e) => setEnvio({ ...envio, area: e.target.value })} placeholder="área (ex.: Agronomia)" className={inputCls} />
            <input value={envio.instituicao} onChange={(e) => setEnvio({ ...envio, instituicao: e.target.value })} placeholder="instituição" className={inputCls} />
            <label className={`${inputCls} flex items-center justify-center gap-2 cursor-pointer border-dashed text-[12px]`}>
              {envio.docNome ? `📎 ${envio.docNome}` : "anexar diploma (PDF/imagem)"}
              <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => onDoc(e.target.files?.[0])} />
            </label>
            <button type="button" onClick={() => void enviar()} disabled={enviando} className="sm:col-span-2 min-h-[44px] rounded-xl text-[11px] font-black uppercase tracking-widest bg-cyan-500 text-slate-950 disabled:opacity-50 hover:scale-[1.01] active:scale-95 transition-transform">
              {enviando ? "enviando…" : envio.doc ? "enviar pra verificação" : "registrar (declarado)"}
            </button>
          </div>
          <p className={`mt-2 text-[10.5px] ${mudo}`}>O documento fica privado: só você e quem verifica veem. No perfil aparece só o título e o selo.</p>
          </>)}
        </div>

        {/* parede de atestados + recentes */}
        <div className={`${card} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <div className={label}>Parede de atestados</div>
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest ${mudo}`}><SolanaMark size={9} title="" /> verificável na Solana</span>
          </div>
          {d.parede.length === 0 && <p className={`text-[12px] ${mudo}`}>{somenteLeitura ? "Nenhuma credencial verificada ainda." : "Nenhuma credencial verificada ainda. Seus atestados on-chain aparecem aqui conforme você valida habilidades e títulos."}</p>}
          {d.parede.length > 0 && (
            <CredencialCard
              titulo={d.parede[0].title}
              tipo={TIPO_ATESTADO[d.parede[0].type] ?? "Credencial verificável"}
              validadoPor={d.parede[0].validadoPor ?? null}
              emitidaEm={d.parede[0].issuedAt}
              assetId={d.parede[0].assetId}
              explorerUrl={d.parede[0].explorerUrl ?? (d.parede[0].assetId ? explorer(d.parede[0].assetId, d.parede[0].network) : null)}
              rede={d.parede[0].network}
              status="issued"
              className="mb-3"
            />
          )}
          <ul className="flex flex-col gap-2">
            {d.parede.slice(1).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span className={`text-[13px] font-semibold truncate ${txt}`}>{p.title}</span>
                {p.assetId ? <a href={p.explorerUrl ?? explorer(p.assetId, p.network)} target="_blank" rel="noreferrer" className="shrink-0 text-[11px] font-bold text-cyan-700 dark:text-cyan-300 hover:underline">ver on-chain ↗</a> : <span className={`text-[11px] ${mudo}`}>{p.type}</span>}
              </li>
            ))}
          </ul>
          {d.recent.length > 0 && (
            <>
              <div className={`${label} mt-5 mb-2`}>Recentes</div>
              <ul className="flex flex-col gap-1">
                {d.recent.map((e) => (
                  <li key={e.id} className={`flex items-center justify-between gap-2 text-[12px] ${txt2}`}>
                    <span className="truncate">{e.reason || e.source}</span>
                    <span className={`tabular-nums font-bold ${e.amount < 0 ? "text-rose-600 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}>{e.amount > 0 ? "+" : ""}{e.amount}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* cérebros do aluno (percurso + duas barras) — PRIVADO: nunca no perfil de outra pessoa (#427) */}
      {!somenteLeitura && d.cerebros && d.cerebros.length > 0 && (
        <div className={`${card} p-5`}>
          <div className={`${label} mb-3`}>Cérebros · {d.cerebros.length}</div>
          <ul className="flex flex-col gap-2.5">
            {d.cerebros.map((c) => (
              <li key={c.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[13px] font-semibold truncate ${txt}`}>🧠 {c.titulo}</span>
                  <span className={`text-[11px] ${mudo}`}>· {c.tipoTopico} · {c.passos} passos</span>
                  {c.completo && <span className="ml-auto px-2 py-0.5 rounded-full border border-emerald-400/60 text-[11px] font-bold text-emerald-700 dark:text-emerald-200">completo</span>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden" title={`aprendizado ${Math.round(c.aprendizado * 100)}%`}><div className="h-full bg-cyan-500 dark:bg-cyan-300" style={{ width: `${Math.round(c.aprendizado * 100)}%` }} /></div>
                  <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden" title={`conclusão ${Math.round(c.conclusao * 100)}%`}><div className="h-full bg-amber-500 dark:bg-amber-300" style={{ width: `${Math.round(c.conclusao * 100)}%` }} /></div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* #427: no perfil de outra pessoa, as validações aparecem só com o NÚMERO (a lista são passos dos cérebros de outros alunos) */}
      {somenteLeitura && visitante?.validacoesPendentes != null && (
        <div className={`${card} p-5`} data-testid="validacoes-visitante">
          <div className={label}>Validações de estudo · {visitante.validacoesPendentes}</div>
        </div>
      )}

      {/* fila de validação dos cérebros (professor vinculado) */}
      {!somenteLeitura && filaCerebro && (
        <div className={`${card} p-5`}>
          <div className={`${label} mb-3`}>Validações de estudo · {filaCerebro.length}</div>
          {filaCerebro.length === 0 && <p className={`text-[12px] ${mudo}`}>Nenhum nó aguardando sua chancela.</p>}
          <ul className="flex flex-col gap-2">
            {filaCerebro.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-2">
                <span className={`text-[13px] font-semibold ${txt}`}>{v.aluno?.nome || v.aluno?.email || v.aluno?.id}</span>
                <span className={`text-[12px] ${txt2}`}>· {v.estudo?.titulo ?? "estudo"} → <b>{v.no?.label ?? v.noId}</b></span>
                {v.evidencia && <span className={`basis-full text-[12px] ${txt2} whitespace-pre-wrap`}>Evidência: {v.evidencia.slice(0, 600)}</span>}
                <span className="ml-auto flex gap-1.5">
                  <button type="button" onClick={() => void decidirCerebro(v.id, "aprovada")} className="min-h-[36px] px-3 rounded-xl text-[11px] font-black bg-emerald-500 text-slate-950">aprovar</button>
                  <button type="button" onClick={() => void decidirCerebro(v.id, "rejeitada")} className="min-h-[36px] px-3 rounded-xl text-[11px] font-black border border-rose-400/60 text-rose-700 dark:text-rose-200">rejeitar</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* fila do verificador (professor/instituição) */}
      {!somenteLeitura && fila && (
        <div className={`${card} p-5`}>
          <div className={`${label} mb-3`}>Fila de verificação · {fila.length}</div>
          {fila.length === 0 && <p className={`text-[12px] ${mudo}`}>Nenhum título aguardando.</p>}
          <ul className="flex flex-col gap-2">
            {fila.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-2">
                <span className={`text-[13px] font-semibold ${txt}`}>{f.aluno.nome || f.aluno.email || f.aluno.id}</span>
                <span className={`text-[12px] ${txt2}`}>· {ROTULO_NIVEL[f.nivel as NivelAcademico] ?? f.nivel}{f.area ? ` em ${f.area}` : ""}{f.instituicao ? ` — ${f.instituicao}` : ""}</span>
                {f.docDuplicado && <span className="px-2 py-0.5 rounded-full border border-rose-400/60 text-[11px] font-bold text-rose-700 dark:text-rose-200">⚠ documento repetido em outra conta</span>}
                {!f.temDoc && <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${SELO.nenhum.c}`}>sem documento</span>}
                <span className="ml-auto flex gap-1.5">
                  {f.temDoc && <button type="button" onClick={() => void verDoc(f.id)} disabled={abrindo === f.id} className={`min-h-[36px] px-3 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-white/15 ${txt2}`}>ver documento</button>}
                  <button type="button" onClick={() => void verificar(f.id, "verificado")} disabled={!f.temDoc} className="min-h-[36px] px-3 rounded-xl text-[11px] font-black bg-emerald-500 text-slate-950 disabled:opacity-40">verificar</button>
                  <button type="button" onClick={() => void verificar(f.id, "rejeitado")} className="min-h-[36px] px-3 rounded-xl text-[11px] font-black border border-rose-400/60 text-rose-700 dark:text-rose-200">rejeitar</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Contador({ n, t }: { n: number; t: string }) {
  return <div><div className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">{n}</div><div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/45 max-w-[90px] leading-tight mx-auto">{t}</div></div>;
}
