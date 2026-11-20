"use client";

/**
 * EstudioAvatar — criar avatar vivo NA TELA AO LADO, com o dono vendo TUDO ao vivo.
 *
 * Tela dividida (o mesmo componente nas duas etapas do handoff):
 *   ESQUERDA — persona (descrição + cores + prompt-base visível) e a lista de estados, cada um
 *              com aprovar / regerar (reroll só daquele estado) / ajustar prompt.
 *   DIREITA  — o AgentAvatar montado com os quadros recém-gerados, JÁ animando (pisca, sorri no
 *              hover, simula pensando→falando→sorriso), as prévias em tamanho de card, e a grade
 *              de quadros aparecendo um a um conforme o modelo devolve.
 * Nada é salvo sem aprovação: "salvar" só leva os estados aprovados (idle + blink obrigatórios).
 *   Etapa A (Claude Code, dev): endpoint /api/dev/avatares → public/avatars/<id>/
 *   Etapa B (admin):            endpoint /api/admin/agents/<id>/avatar → banco
 */
import { confirmar, tr } from "@/lib/ui/avisos";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AgentAvatar from "@/components/agents/AgentAvatar";
import { ESTADOS_SPRITE, type AvatarManifest, type EstadoSprite, type SinalAvatar } from "@/lib/avatars/estados";
import { ORDEM_GERACAO, promptBase } from "@/lib/avatars/prompts";
import { VIDRO_BOLHA, VIDRO_CHIP, TXT, TXT_2, TXT_MUDO } from "@/lib/canal/vidro";
import { falarClipe, type Fala } from "./falar";

type Status = "vazio" | "gerando" | "pronto" | "aprovado" | "falhou";
type Peca = { status: Status; grande?: string; pequeno?: string; erro?: string; ajuste: string; ajustando: boolean };
type Pecas = Record<EstadoSprite, Peca>;

const ROTULO: Record<EstadoSprite, string> = {
  idle: "idle · base", blink: "blink · piscar", talk: "talk · falando", talk_half: "talk ½ · sílaba",
  smile: "smile · hover", happy: "happy · concluiu", think: "think · pensando", confused: "confused · erro", angry: "angry · brava",
};
const OBRIGATORIO = new Set<EstadoSprite>(["idle", "blink"]);
const vazio = (): Peca => ({ status: "vazio", ajuste: "", ajustando: false });
const pecasVazias = (): Pecas => Object.fromEntries(ESTADOS_SPRITE.map((e) => [e, vazio()])) as Pecas;

/** URL (estático/API) → data URL — pra rerolar sobre a base salva e re-salvar quadros mantidos. */
async function paraDataUrl(u: string): Promise<string> {
  if (u.startsWith("data:")) return u;
  const blob = await (await fetch(u)).blob();
  return new Promise((ok, falha) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result)); fr.onerror = falha; fr.readAsDataURL(blob); });
}

const inputCls = `w-full px-3 py-2 rounded-xl text-[13px] bg-white/70 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 ${TXT} placeholder:text-slate-400 dark:placeholder:text-white/35 outline-none focus:border-cyan-400/70`;
const btn = `min-h-[36px] px-3 rounded-xl text-[11px] font-black uppercase tracking-widest ${VIDRO_CHIP} ${TXT} disabled:opacity-40`;
const btnPrim = "min-h-[40px] px-4 rounded-xl text-[12px] font-black uppercase tracking-widest bg-cyan-500 text-slate-950 hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100";

export default function EstudioAvatar({
  endpoint, agentId, nome, personagemInicial = "", corInicial = ["#67e8f9", "#2563eb"],
  existente = null, baseUrlExistente = null, fotoAtual = null, extraSalvar = {}, onSalvo, onFechar, gatilho = 0, onStatus,
}: {
  endpoint: string;
  agentId: string;
  nome: string;
  personagemInicial?: string;
  corInicial?: readonly [string, string];
  /** Set já salvo → entra como aprovado (revisar/rerolar estado a estado). */
  existente?: AvatarManifest | null;
  baseUrlExistente?: string | null;
  /** Admin: começar da foto atual do agente em vez de gerar o personagem do zero. */
  fotoAtual?: string | null;
  extraSalvar?: Record<string, unknown>;
  onSalvo?: () => void;
  onFechar?: () => void;
  /** Fila externa (gerar vários agentes): cada incremento gera o que falta, sem clicar. */
  gatilho?: number;
  /** Progresso pra quem coordena a fila / mostra nas abas. */
  onStatus?: (s: { rodando: boolean; prontos: number; aprovados: number; falhas: number }) => void;
}) {
  const [personagem, setPersonagem] = useState(personagemInicial);
  const [cor, setCor] = useState<[string, string]>([corInicial[0], corInicial[1]]);
  const [base, setBase] = useState<string | null>(null);
  const [pecas, setPecas] = useState<Pecas>(pecasVazias);
  const [log, setLog] = useState<string[]>([]);
  const [rodando, setRodando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [sinal, setSinal] = useState<SinalAvatar>("idle");
  const simRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // voz própria do agente (saudações já geradas): ouvir com a boca sincronizada na prévia
  const saudacoes = existente?.voz?.saudacoes ?? [];
  const [ouvindoSaudacao, setOuvindoSaudacao] = useState(false);
  const [boca, setBoca] = useState<number | null>(null);
  const falaRef = useRef<Fala | null>(null);
  const idxSaudacao = useRef(0);
  const ouvirSaudacao = () => {
    if (ouvindoSaudacao) { falaRef.current?.parar(); return; }
    const url = saudacoes[idxSaudacao.current++ % saudacoes.length];
    falaRef.current = falarClipe(url, (falando, n) => { setOuvindoSaudacao(falando); setBoca(n); });
    falaRef.current.fim.catch(() => { setOuvindoSaudacao(false); setBoca(null); });
  };
  useEffect(() => () => falaRef.current?.parar(), []);

  const anotar = useCallback((t: string) => setLog((l) => [`${new Date().toLocaleTimeString("pt-BR")} · ${t}`, ...l].slice(0, 40)), []);
  const setPeca = useCallback((e: EstadoSprite, p: Partial<Peca>) => setPecas((ps) => ({ ...ps, [e]: { ...ps[e], ...p } })), []);

  // set existente entra como aprovado (o dono revisa; rerolar = gerar sobre a base salva)
  useEffect(() => {
    if (!existente) return;
    const ps = pecasVazias();
    for (const e of ESTADOS_SPRITE) {
      const g = existente.estados[e];
      if (g) ps[e] = { ...ps[e], status: "aprovado", grande: g, pequeno: existente.pequeno[e] ?? g };
    }
    setPecas(ps);
    if (existente.cor) setCor((c) => [c[0], existente.cor!]);
  }, [existente]);

  const post = useCallback(async (body: Record<string, unknown>) => {
    const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
    return j;
  }, [endpoint]);

  /** Base disponível como data URL (gerada agora, ou a salva/a foto, buscada sob demanda). */
  const garantirBase = useCallback(async (): Promise<string | null> => {
    if (base) return base;
    if (baseUrlExistente && pecas.idle.status === "aprovado") {
      const d = await paraDataUrl(baseUrlExistente).catch(() => null);
      if (d) { setBase(d); return d; }
    }
    return null;
  }, [base, baseUrlExistente, pecas.idle.status]);

  const gerarEstado = useCallback(async (e: Exclude<EstadoSprite, "idle">, b: string, ajuste?: string) => {
    setPeca(e, { status: "gerando", erro: undefined, ajustando: false });
    anotar(`${e}: gerando${ajuste ? ` (ajuste: "${ajuste}")` : ""}…`);
    try {
      const j = await post({ acao: "estado", base: b, estado: e, ajuste });
      setPeca(e, { status: "pronto", grande: j.grande, pequeno: j.pequeno });
      anotar(`${e}: pronto ✓ (${((j.fracao ?? 0) * 100).toFixed(1)}% do quadro mudou)`);
    } catch (err) {
      setPeca(e, { status: "falhou", erro: (err as Error).message });
      anotar(`${e}: falhou — ${(err as Error).message}`);
    }
  }, [anotar, post, setPeca]);

  /** Nova base (texto ou foto) → zera as expressões (elas só casam com a base delas). */
  const gerarBase = useCallback(async (deFoto: boolean): Promise<string | null> => {
    setPecas(pecasVazias());
    setPeca("idle", { status: "gerando" });
    anotar(deFoto ? "base: usando a foto atual…" : "base: gerando o personagem…");
    try {
      const j = deFoto
        ? await post({ acao: "base-de-imagem", imagem: await paraDataUrl(fotoAtual!) })
        : await post({ acao: "base", personagem, cor, agentId });
      setBase(j.base);
      setPeca("idle", { status: "pronto", grande: j.grande, pequeno: j.pequeno });
      anotar("base: pronta ✓ — aprove o idle e siga");
      return j.base as string;
    } catch (err) {
      setPeca("idle", { status: "falhou", erro: (err as Error).message });
      anotar(`base: falhou — ${(err as Error).message}`);
      return null;
    }
  }, [agentId, anotar, cor, fotoAtual, personagem, post, setPeca]);

  /** Gerar tudo: base (se não houver) e cada estado ainda não aprovado, 2 por vez, aparecendo um a um. */
  const gerarTudo = useCallback(async (novaBase: boolean, deFoto = false) => {
    setRodando(true); setMsg(null);
    try {
      const b = novaBase ? await gerarBase(deFoto) : (await garantirBase()) ?? (await gerarBase(deFoto));
      if (!b) return;
      const fila = ORDEM_GERACAO.filter((e) => novaBase || pecas[e].status !== "aprovado");
      await Promise.all([0, 1].map(async () => { for (let e = fila.shift(); e; e = fila.shift()) await gerarEstado(e, b); }));
      anotar("rodada terminada — revise, aprove ou regere cada estado");
    } finally { setRodando(false); }
  }, [anotar, garantirBase, gerarBase, gerarEstado, pecas]);

  const regerar = useCallback(async (e: EstadoSprite) => {
    if (e === "idle") {
      if (Object.values(pecas).some((p) => p.status === "aprovado" || p.status === "pronto") && !(await confirmar({ titulo: tr("avisos.novaBase", "Criar uma nova base?"), texto: "Nova base = novo personagem: as outras expressões serão descartadas.", botao: tr("avisos.continuar", "Continuar"), perigo: true }))) return;
      return gerarTudo(true);
    }
    const b = await garantirBase();
    if (!b) { setMsg({ tipo: "erro", texto: "Gere a base primeiro." }); return; }
    await gerarEstado(e, b, pecas[e].ajuste || undefined);
  }, [garantirBase, gerarEstado, gerarTudo, pecas]);

  const aprovados = useMemo(() => ESTADOS_SPRITE.filter((e) => pecas[e].status === "aprovado"), [pecas]);

  // fila externa: gatilho novo → gera o que falta (base nova se ainda não há)
  const ultimoGatilho = useRef(gatilho);
  useEffect(() => {
    if (gatilho === ultimoGatilho.current) return;
    ultimoGatilho.current = gatilho;
    if (!rodando && personagem.trim().length >= 20) void gerarTudo(!pecas.idle.grande);
  }, [gatilho, rodando, personagem, gerarTudo, pecas.idle.grande]);
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;
  useEffect(() => {
    const v = Object.values(pecas);
    statusRef.current?.({ rodando, prontos: v.filter((p) => p.status === "pronto").length, aprovados: v.filter((p) => p.status === "aprovado").length, falhas: v.filter((p) => p.status === "falhou").length });
  }, [pecas, rodando]);
  const podeSalvar = !!pecas.idle.grande && pecas.idle.status === "aprovado" && pecas.blink.status === "aprovado" && !rodando;

  const salvar = useCallback(async () => {
    setSalvando(true); setMsg(null);
    try {
      const b = await garantirBase();
      if (!b) throw new Error("sem base");
      const quadros: Record<string, { grande: string; pequeno: string }> = {};
      for (const e of aprovados) quadros[e] = { grande: await paraDataUrl(pecas[e].grande!), pequeno: await paraDataUrl(pecas[e].pequeno!) };
      await post({ acao: "salvar", base: b, quadros, cor: cor[1], ...extraSalvar });
      setMsg({ tipo: "ok", texto: `Salvo: ${aprovados.join(", ")}.` });
      anotar(`salvo ✓ (${aprovados.length} estados)`);
      onSalvo?.();
    } catch (err) {
      setMsg({ tipo: "erro", texto: (err as Error).message });
    } finally { setSalvando(false); }
  }, [anotar, aprovados, cor, extraSalvar, garantirBase, onSalvo, pecas, post]);

  // manifesto de PRÉVIA: tudo que já tem imagem (pronto ou aprovado) — o avatar anima com isso
  const previa = useMemo<AvatarManifest | null>(() => {
    if (!pecas.idle.grande) return null;
    const estados: AvatarManifest["estados"] = {};
    const pequeno: AvatarManifest["pequeno"] = {};
    for (const e of ESTADOS_SPRITE) {
      const p = pecas[e];
      if (p.grande && (p.status === "pronto" || p.status === "aprovado")) { estados[e] = p.grande; pequeno[e] = p.pequeno ?? p.grande; }
    }
    if (!estados.blink) estados.blink = estados.idle; // ainda sem piscada: o motor roda mesmo assim
    if (!pequeno.blink) pequeno.blink = pequeno.idle;
    return { agentId, versao: "previa", motor: "sprite", estados, pequeno, cor: cor[1] };
  }, [agentId, cor, pecas]);

  const simular = () => {
    simRef.current.forEach(clearTimeout);
    setSinal("pensando");
    simRef.current = [setTimeout(() => setSinal("falando"), 1800), setTimeout(() => setSinal("idle"), 5200)];
  };
  useEffect(() => () => simRef.current.forEach(clearTimeout), []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-5 min-h-0">
      {/* ───────── ESQUERDA: persona + estados ───────── */}
      <section className="flex flex-col gap-4 min-h-0">
        <div className={`p-4 rounded-[22px] flex flex-col gap-3 ${VIDRO_BOLHA}`}>
          <div className="flex items-center gap-2">
            <h3 className={`text-[15px] font-black ${TXT}`}>{nome}</h3>
            <span className={`text-[10.5px] font-mono uppercase tracking-widest ${TXT_MUDO}`}>@{agentId}</span>
            {onFechar && <button type="button" onClick={onFechar} className={`ml-auto ${btn}`}>fechar</button>}
          </div>
          <label className={`text-[11px] font-bold uppercase tracking-widest ${TXT_MUDO}`}>Persona (aparência, roupa, expressão neutra)</label>
          <textarea value={personagem} onChange={(e) => setPersonagem(e.target.value)} rows={4} className={inputCls} placeholder="Ex.: Lia, mentora de Odontologia: jovem de cabelo castanho preso, jaleco branco com detalhes turquesa, sorriso calmo…" />
          <div className="flex flex-wrap items-center gap-3">
            <label className={`flex items-center gap-2 text-[12px] ${TXT_2}`}>fundo
              <input type="color" value={cor[0]} onChange={(e) => setCor([e.target.value, cor[1]])} aria-label="Cor do topo" className="h-8 w-10 rounded-lg border-0 bg-transparent" />
              <input type="color" value={cor[1]} onChange={(e) => setCor([cor[0], e.target.value])} aria-label="Cor da base" className="h-8 w-10 rounded-lg border-0 bg-transparent" />
            </label>
            <details className={`text-[11.5px] ${TXT_MUDO} basis-full`}>
              <summary className="cursor-pointer select-none font-bold uppercase tracking-widest">prompt-base de consistência</summary>
              <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-snug">{promptBase(personagem || "…", cor)}</pre>
            </details>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={rodando || personagem.trim().length < 20} onClick={() => void gerarTudo(!pecas.idle.grande)} className={btnPrim}>
              {rodando ? "gerando…" : pecas.idle.grande ? "gerar o que falta" : "gerar avatar"}
            </button>
            {fotoAtual && <button type="button" disabled={rodando} onClick={() => void gerarTudo(true, true)} className={btn} title="Usa a foto atual do agente como base">partir da foto atual</button>}
            <button type="button" disabled={!podeSalvar || salvando} onClick={() => void salvar()} className={`${btnPrim} ml-auto bg-emerald-400`}>
              {salvando ? "salvando…" : `salvar (${aprovados.length})`}
            </button>
          </div>
          {msg && <p role={msg.tipo === "erro" ? "alert" : "status"} className={`text-[12px] ${msg.tipo === "erro" ? "text-rose-600 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}>{msg.texto}</p>}
          {!podeSalvar && !rodando && pecas.idle.grande && <p className={`text-[11.5px] ${TXT_MUDO}`}>Aprove pelo menos <b>idle</b> e <b>blink</b> pra salvar — só os aprovados vão.</p>}
        </div>

        <ul className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1">
          {ESTADOS_SPRITE.map((e) => {
            const p = pecas[e];
            return (
              <li key={e} className={`p-2.5 rounded-2xl flex flex-col gap-2 ${VIDRO_BOLHA} ${p.status === "aprovado" ? "ring-2 ring-emerald-400/70" : ""}`}>
                <div className="flex items-center gap-3">
                  <Miniatura p={p} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-[13px] font-bold ${TXT}`}>{ROTULO[e]}{OBRIGATORIO.has(e) && <span className="ml-1 text-cyan-600 dark:text-cyan-300">*</span>}</p>
                    <p className={`text-[11px] truncate ${p.status === "falhou" ? "text-rose-600 dark:text-rose-300" : TXT_MUDO}`}>{p.status === "falhou" ? p.erro : STATUS_TXT[p.status]}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(p.status === "pronto" || p.status === "aprovado") && (
                      <button type="button" onClick={() => setPeca(e, { status: p.status === "aprovado" ? "pronto" : "aprovado" })} className={`${btn} ${p.status === "aprovado" ? "!bg-emerald-400 !text-slate-950" : ""}`} aria-pressed={p.status === "aprovado"}>
                        {p.status === "aprovado" ? "aprovado ✓" : "aprovar"}
                      </button>
                    )}
                    <button type="button" disabled={rodando || p.status === "gerando" || (e === "idle" ? personagem.trim().length < 20 : !pecas.idle.grande)} onClick={() => void regerar(e)} className={btn} title={e === "idle" ? "Novo personagem (descarta as expressões)" : "Reroll só deste estado"}>↻</button>
                    {e !== "idle" && <button type="button" onClick={() => setPeca(e, { ajustando: !p.ajustando })} className={btn} title="Ajustar o prompt deste estado">✎</button>}
                  </div>
                </div>
                {p.ajustando && (
                  <div className="flex gap-2">
                    <input value={p.ajuste} onChange={(ev) => setPeca(e, { ajuste: ev.target.value })} placeholder="ajuste pra este estado (ex.: sorriso mais discreto, olhar pra esquerda)" className={inputCls} onKeyDown={(ev) => { if (ev.key === "Enter") void regerar(e); }} />
                    <button type="button" disabled={!pecas.idle.grande || p.status === "gerando"} onClick={() => void regerar(e)} className={btn}>regerar</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ───────── DIREITA: prévia ao vivo ───────── */}
      <section className="flex flex-col gap-4 min-h-0">
        <div className={`p-5 rounded-[22px] flex flex-col items-center gap-4 ${VIDRO_BOLHA}`}>
          <p className={`self-start text-[11px] font-bold uppercase tracking-widest ${TXT_MUDO}`}>Ao vivo — passe o mouse, simule uma conversa</p>
          {previa ? (
            <AgentAvatar manifest={previa} nome={nome} size={220} estado={ouvindoSaudacao ? "falando" : sinal} boca={boca} destaque className="shadow-xl" />
          ) : (
            <div className={`w-[220px] h-[220px] rounded-full grid place-items-center text-center text-[12px] px-6 border-2 border-dashed border-slate-300 dark:border-white/15 ${TXT_MUDO}`}>
              {pecas.idle.status === "gerando" ? "desenhando o personagem…" : "o avatar aparece aqui assim que a base ficar pronta"}
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-1.5">
            {(["idle", "pensando", "falando", "feliz", "erro"] as SinalAvatar[]).map((s) => (
              <button key={s} type="button" onClick={() => { simRef.current.forEach(clearTimeout); setSinal(s); }} aria-pressed={sinal === s} className={`${btn} ${sinal === s ? "!bg-cyan-500 !text-slate-950" : ""}`}>{s}</button>
            ))}
            <button type="button" onClick={simular} className={btn} title="pensando → falando → sorri ao concluir">▶ simular resposta</button>
            {saudacoes.length > 0 && previa && (
              <button type="button" onClick={ouvirSaudacao} aria-pressed={ouvindoSaudacao} className={`${btn} ${ouvindoSaudacao ? "!bg-violet-500 !text-white" : ""}`} title={`${saudacoes.length} saudações na voz dele(a) — cada clique toca a próxima`}>
                {ouvindoSaudacao ? "■ parar" : "🔊 ouvir saudação"}
              </button>
            )}
          </div>
          {previa && (
            <div className="flex items-end gap-4 pt-2 border-t border-slate-200/70 dark:border-white/10 w-full justify-center">
              {[64, 44, 28].map((s) => (
                <div key={s} className="flex flex-col items-center gap-1">
                  <AgentAvatar manifest={previa} nome={nome} size={s} estado={sinal} />
                  <span className={`text-[10px] ${TXT_MUDO}`}>{s}px</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {ESTADOS_SPRITE.map((e) => (
            <figure key={e} className={`relative aspect-square rounded-2xl overflow-hidden ${VIDRO_BOLHA} ${pecas[e].status === "aprovado" ? "ring-2 ring-emerald-400/70" : ""}`}>
              {pecas[e].grande ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pecas[e].grande} alt={ROTULO[e]} className="absolute inset-0 h-full w-full object-cover animate-[zavEntra_.35s_ease-out]" />
              ) : (
                <div className={`absolute inset-0 grid place-items-center text-[10px] ${TXT_MUDO} ${pecas[e].status === "gerando" ? "animate-pulse bg-cyan-400/10" : ""}`}>{pecas[e].status === "gerando" ? "gerando…" : pecas[e].status === "falhou" ? "falhou" : "—"}</div>
              )}
              <figcaption className="absolute bottom-0 inset-x-0 px-1.5 py-0.5 text-[9.5px] font-bold text-white bg-black/45 truncate">{e}</figcaption>
            </figure>
          ))}
        </div>

        {log.length > 0 && (
          <ol className={`max-h-[140px] overflow-y-auto custom-scrollbar text-[11px] font-mono leading-relaxed ${TXT_MUDO}`} aria-live="polite">
            {log.map((l, i) => <li key={i}>{l}</li>)}
          </ol>
        )}
        <style>{`@keyframes zavEntra { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: none; } } @media (prefers-reduced-motion: reduce) { [class*="zavEntra"] { animation: none !important; } }`}</style>
      </section>
    </div>
  );
}

const STATUS_TXT: Record<Status, string> = { vazio: "ainda não gerado", gerando: "gerando…", pronto: "pronto — aprove ou regere", aprovado: "aprovado", falhou: "" };

function Miniatura({ p }: { p: Peca }) {
  return (
    <span className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-slate-200/60 dark:bg-white/[0.06]">
      {p.pequeno
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={p.pequeno} alt="" className="absolute inset-0 h-full w-full object-cover" />
        : p.status === "gerando" && <span className="absolute inset-0 animate-pulse bg-cyan-400/20" />}
    </span>
  );
}
