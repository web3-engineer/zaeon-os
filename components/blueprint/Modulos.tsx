"use client";
/**
 * Os MÓDULOS da prancha do blueprint (lib/blueprint/layout): cada um é um card no estilo do BoardEstudos — cantos de
 * registro, o carimbo "TIPO · X-NN" com a régua (arrasta por ali), título mono. O conhecimento (passos) à esquerda, o
 * estudo/figura/críticos no centro, a prática à direita.
 */
import { useEffect, useState, type ReactNode } from "react";
import { NOME_FASE, type Critico, type DocBlueprint, type Fase } from "@/lib/blueprint/tipos";
import FiguraIso from "./FiguraIso";
import { MAO, PAPEL, REDONDA, ROSA, corNaSkin, inclinacao, useCor, useSkin } from "./skin";

/** #870: enquanto a Zaeon monta, o título ainda é o PEDIDO da pessoa ("FAZ UM BLUEPRINT DE…") — mostra este no lugar */
export const TITULO_PROVISORIO = "Montando o seu blueprint…";
/** #870: o blueprint ainda está sendo montado — a Zaeon nunca compôs (compostoEm = 0) e não há resumo.
 *  Depois de composto, um resumo vazio não deixa o carregamento preso (revisão do #871). */
export const estaMontando = (doc: Pick<DocBlueprint, "resumo" | "compostoEm">) => !doc.compostoEm && !doc.resumo;
/** #870: o que a Zaeon faz enquanto monta — a lista do carregamento */
export const ETAPAS_MONTAGEM = ["lendo a conversa", "escolhendo o título", "desenhando o percurso", "prática e produto", "fontes do YouTube"] as const;
const PASSO_ETAPA_MS = 2200;

export const COR = {
  estudo: "#7fe0ff", passo: "#ffd36b", critico: "#ff4d5e", provado: "#7dffb0", figura: "#7fe0ff", repos: "#7fe0ff",
  conversas: "#ff9ec7", demo: "#ffd36b", produto: "#c9b6ff", proximos: "#e8f6ff", nota: "#e8f6ff", avaliacao: "#ffd36b", video: "#8cf4ff",
} as const;
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const dois = (n: number) => String(n).padStart(2, "0");

export function CardPrancha({ cor: cor0, carimbo, direita, children, fundo, brilho, onArrastar, apagado }: {
  cor: string; carimbo: string; direita?: ReactNode; children: ReactNode; fundo?: string; brilho?: boolean; apagado?: boolean;
  onArrastar?: (e: React.PointerEvent) => void;
}) {
  const skin = useSkin(), cor = corNaSkin(skin, cor0);
  if (skin === "cartolina") {
    // papel colado com fita, levemente torto; a borda é um traço de caneta rabiscado (filtro), o texto fica nítido
    return (
      <div className="relative rounded-[6px] text-[15px] leading-snug" style={{ background: PAPEL.card, color: PAPEL.tinta, padding: "14px 16px 12px", opacity: apagado ? 0.6 : 1, transform: `rotate(${inclinacao(carimbo)}deg)`, boxShadow: "0 18px 30px -18px rgba(58,47,30,.55), 0 2px 0 rgba(58,47,30,.08)" }}>
        <span aria-hidden className="pointer-events-none absolute inset-[3px] rounded-[8px]" style={{ border: `${brilho ? 2.6 : 1.8}px solid ${cor}`, filter: "url(#rabisco)", opacity: 0.9 }} />
        <span aria-hidden className="pointer-events-none absolute -top-2 left-1/2 h-4 w-16 -translate-x-1/2 rotate-[-3deg]" style={{ background: PAPEL.fita, boxShadow: "0 1px 2px rgba(0,0,0,.08)" }} />
        <div className={`relative mb-2 flex items-center gap-2 text-[15px] ${onArrastar ? "cursor-grab active:cursor-grabbing" : ""}`} style={{ color: cor, fontFamily: MAO }} onPointerDown={onArrastar}>
          <span className="whitespace-nowrap font-bold">{carimbo.toLowerCase()}</span>
          <svg className="h-2 flex-1" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden><path d="M0 5 Q 12 1, 25 4 T 50 4 T 75 5 T 100 3" fill="none" stroke={cor} strokeWidth="1.4" opacity="0.6" /></svg>
          {direita}
        </div>
        <div className="relative">{children}</div>
      </div>
    );
  }
  if (skin === "barbie") {
    // VIDRO: translúcido, desfoca o rosa atrás, borda branca e brilho na quina de cima; o carimbo vira uma pílula
    return (
      <div className="relative rounded-[22px] text-[15px] leading-snug" style={{
        background: ROSA.vidro, color: ROSA.tinta, padding: "14px 18px 14px", opacity: apagado ? 0.66 : 1, fontFamily: REDONDA,
        backdropFilter: "blur(18px) saturate(160%)", WebkitBackdropFilter: "blur(18px) saturate(160%)", border: `1px solid ${ROSA.borda}`,
        boxShadow: `0 22px 44px -22px ${ROSA.sombra}, inset 0 1px 0 rgba(255,255,255,.85), inset 0 -1px 0 rgba(255,255,255,.25)${brilho ? `, 0 0 0 3px ${cor}33, 0 0 34px ${cor}55` : ""}`,
      }}>
        <span aria-hidden className="pointer-events-none absolute inset-x-6 top-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.95),transparent)" }} />
        <div className={`relative mb-2.5 flex items-center gap-2 ${onArrastar ? "cursor-grab active:cursor-grabbing" : ""}`} onPointerDown={onArrastar}>
          <span className="whitespace-nowrap rounded-full px-3 py-0.5 text-[12.5px] font-bold tracking-wide text-white" style={{ background: `linear-gradient(135deg, ${cor}, ${cor}cc)`, boxShadow: `0 4px 12px -4px ${cor}` }}>{carimbo.toLowerCase()}</span>
          <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${cor}66, transparent)` }} />
          {direita}
        </div>
        <div className="relative">{children}</div>
      </div>
    );
  }
  return (
    <div className="relative rounded-[3px] text-[15px] leading-snug text-sky-50" style={{
      background: fundo ?? "rgba(12,45,82,.92)", border: `1.6px solid ${cor}`, padding: "14px 16px", opacity: apagado ? 0.62 : 1,
      boxShadow: `8px 10px 0 rgba(0,10,25,.35), inset 0 0 0 1px rgba(255,255,255,.04)${brilho ? `, 0 0 0 3px ${cor}22, 0 0 26px ${cor}40` : ""}`,
    }}>
      {["left-1 top-1 border-l border-t", "right-1 top-1 border-r border-t", "left-1 bottom-1 border-l border-b", "right-1 bottom-1 border-r border-b"].map((c) => <span key={c} className={`pointer-events-none absolute h-2 w-2 ${c}`} style={{ borderColor: cor }} />)}
      <div className={`mb-2 flex items-center gap-2 font-mono text-[13px] tracking-[0.16em] ${onArrastar ? "cursor-grab active:cursor-grabbing" : ""}`} style={{ color: cor }} onPointerDown={onArrastar}>
        <span className="whitespace-nowrap">{carimbo}</span>
        <span className="h-px flex-1" style={{ background: `${cor}55` }} />
        {direita}
      </div>
      {children}
    </div>
  );
}

/** a FIGURA do tema — a protagonista: grande, fora de card, no topo do eixo (padrão do anatomy: o objeto é a explicação) */
function FiguraHeroi({ doc, onArrastar }: { doc: DocBlueprint; onArrastar?: (e: React.PointerEvent) => void }) {
  // o cartão do anatomy (Fig 1 / título, dica / leitura) já vem da FiguraIso; o topo dele é a alça de arrastar
  return <div className="relative px-2 pb-2"><FiguraIso doc={doc} alca={onArrastar} /></div>;
}

/** ESTUDE NO YOUTUBE: as buscas que a Zaeon sugeriu (tema + fase atual) abrem o YouTube numa aba nova */
function CardYoutube({ doc, onArrastar }: { doc: DocBlueprint; onArrastar?: (e: React.PointerEvent) => void }) {
  const k = useCor();
  const passoAtual = doc.passos.find((p) => p.fase === doc.fase && !doc.criticos.some((c) => c.passoId === p.id && c.status === "provado"));
  // #870: enquanto monta, o título ainda é o pedido ("Faz um blueprin…") — sem buscas até chegar o título de verdade
  const buscas = (doc.buscasYoutube.length ? doc.buscasYoutube : estaMontando(doc) ? [] : [doc.titulo, ...(passoAtual ? [`${doc.titulo} ${passoAtual.titulo}`] : [])]).slice(0, 4);
  const url = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
  return (
    <CardPrancha cor="#ff4d5e" carimbo="ESTUDE NO YOUTUBE · Y-01" direita={<span className="font-mono text-[12.5px] text-sky-200/60">aulas e tutoriais</span>} onArrastar={onArrastar}>
      {!buscas.length && <Texto><Falta>as buscas aparecem quando o título chegar…</Falta></Texto>}
      <ul className="space-y-1.5">
        {buscas.map((q) => (
          <li key={q}>
            <a href={url(q)} target="_blank" rel="noopener noreferrer" onPointerDown={(e) => e.stopPropagation()} className="group flex items-center gap-2.5 rounded-[3px] px-1 py-1 hover:bg-white/5">
              <span className="grid h-7 w-9 flex-none place-items-center rounded-[6px] text-[13.5px] text-white" style={{ background: k("#ff4d5e") === "#ff4d5e" ? "#e62117" : "#c0392b" }}>▶</span>
              <span className="text-[14px] group-hover:underline">{q}</span>
            </a>
          </li>
        ))}
      </ul>
    </CardPrancha>
  );
}

const Titulo = ({ children, grande }: { children: ReactNode; grande?: boolean }) => <div className={`font-semibold ${grande ? "text-[22px]" : ""}`} style={{ fontFamily: MONO, letterSpacing: "0.01em" }}>{children}</div>;
const Texto = ({ children }: { children: ReactNode }) => <p className="mt-1 whitespace-pre-wrap text-[14px] text-sky-50/85">{children}</p>;
const Falta = ({ children }: { children: ReactNode }) => <span className="italic text-sky-200/45">{children}</span>;

/**
 * #870: o carregamento do blueprint — antes, só "a Zaeon está montando o blueprint desta conversa…" parado.
 * Um traço sendo desenhado (lápis na cartolina, régua no blueprint, pincel na barbie) e as etapas acendendo uma a uma.
 * Não é o progresso real (o servidor não conta em que etapa está): a última etapa fica acesa até o blueprint chegar.
 * Com "menos animação", o traço fica parado e inteiro (as etapas só trocam de cor).
 */
export function Montando() {
  const skin = useSkin(), k = useCor();
  const [etapa, setEtapa] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setEtapa((e) => Math.min(e + 1, ETAPAS_MONTAGEM.length - 1)), PASSO_ETAPA_MS);
    return () => clearInterval(t);
  }, []);
  const ferramenta = skin === "cartolina" ? "✏️" : skin === "barbie" ? "🖌️" : "📐";
  return (
    <div data-montando className="mt-1" role="status" aria-label="A Zaeon está montando o blueprint">
      <style>{`@keyframes bp-traco{from{stroke-dashoffset:220}to{stroke-dashoffset:0}}@keyframes bp-pisca{0%,100%{opacity:.35}50%{opacity:.9}}
        @media (prefers-reduced-motion: no-preference){[data-montando] .bp-traco{animation:bp-traco 2.2s ease-in-out infinite alternate}[data-montando] .bp-pisca{animation:bp-pisca 1.4s ease-in-out infinite}}`}</style>
      <div className="flex items-center gap-2">
        <svg width="150" height="22" viewBox="0 0 150 22" aria-hidden>
          <path className="bp-traco" d="M4 15 C 30 3, 52 21, 78 11 S 128 5, 146 13" fill="none" stroke={k(COR.estudo)} strokeWidth="2" strokeDasharray="220" strokeLinecap="round" />
        </svg>
        <span aria-hidden className="text-[16px]">{ferramenta}</span>
      </div>
      <ol className="mt-1.5 space-y-0.5 font-mono text-[12.5px]">
        {ETAPAS_MONTAGEM.map((e, i) => (
          <li key={e} data-etapa={i <= etapa ? "acesa" : undefined} className={i === etapa ? "bp-pisca" : ""} style={{ color: i <= etapa ? k(COR.estudo) : undefined, opacity: i <= etapa ? 1 : 0.4 }}>
            {i < etapa ? "✓" : i === etapa ? "●" : "○"} {e}
          </li>
        ))}
      </ol>
    </div>
  );
}
export function TagFase({ fase, doc }: { fase: Fase; doc: DocBlueprint }) {
  const k = useCor();
  const cor = fase < doc.fase ? k(COR.provado) : fase === doc.fase ? k(COR.critico) : k("rgba(186,230,253,.55)");
  return <span className="rounded-sm border px-1.5 font-mono text-[11px] tracking-[0.12em]" style={{ borderColor: cor, color: cor }}>FASE {fase}{fase < doc.fase ? " ✓" : fase > doc.fase ? " 🔒" : ""}</span>;
}
const codigoCritico = (doc: DocBlueprint, c: Critico) => `R-${dois(doc.criticos.indexOf(c) + 1)}`;

export function TrilhoFases({ doc }: { doc: DocBlueprint }) {
  const k = useCor();
  return (
    <div className="mt-2.5 flex">
      {([1, 2, 3, 4] as Fase[]).map((f, i) => {
        const ok = f < doc.fase || (f === 4 && doc.aguardandoMentor), at = f === doc.fase && !doc.aguardandoMentor;
        const cor = ok ? k(COR.provado) : at ? k("#fff") : k("rgba(186,230,253,.55)");
        return (
          <div key={f} className="flex-1 border px-1 py-1 text-center font-mono text-[11px] tracking-wide" style={{ borderColor: ok ? k("rgba(125,255,176,.45)") : at ? k(COR.critico) : k("rgba(150,205,255,.2)"), borderLeftWidth: i ? 0 : 1, color: cor, background: at ? "rgba(255,77,94,.18)" : undefined }}>
            {ok ? "✓" : at ? "●" : "🔒"} {f} {NOME_FASE[f].toUpperCase()}
            {f === 4 && <span style={{ color: k("#ffd36b") }}>{doc.aguardandoMentor ? " · aguardando mentor" : " · mentor"}</span>}
          </div>
        );
      })}
    </div>
  );
}

function Botao({ children, cor, onClick, titulo, desabilitado }: { children: ReactNode; cor: string; onClick?: () => void; titulo?: string; desabilitado?: boolean }) {
  return <button type="button" title={titulo} disabled={desabilitado} onPointerDown={(e) => e.stopPropagation()} onClick={onClick} className="rounded-sm border px-2 py-1 font-mono text-[12px] tracking-wide transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40" style={{ borderColor: `${cor}88`, color: cor }}>{children}</button>;
}

export type AcoesModulo = { abrirVideo?: (videoId: string) => void; avaliar?: () => void; avaliando?: boolean; recompor?: () => void; recompondo?: boolean; reorganizar?: () => void; temFixos?: boolean; podeEditar: boolean; extra?: (id: string) => ReactNode };

/** o card de um módulo pelo id do layout */
export function Modulo({ id, doc, acoes, onArrastar }: { id: string; doc: DocBlueprint; acoes: AcoesModulo; onArrastar?: (e: React.PointerEvent) => void }) {
  const k = useCor();
  const abertosDaFase = doc.criticos.filter((c) => c.status === "aberto" && c.fase === doc.fase);
  if (id === "estudo") {
    return (
      <CardPrancha cor={k(COR.estudo)} carimbo="ESTUDO · E-01" direita={<span className="font-mono text-[11px] text-sky-200/60">{doc.area}</span>} onArrastar={onArrastar}>
        <Titulo grande>{estaMontando(doc) ? TITULO_PROVISORIO : doc.titulo.toUpperCase()}</Titulo>
        {estaMontando(doc) ? <Montando /> : doc.resumo ? <Texto>{doc.resumo}</Texto> : null}
        <TrilhoFases doc={doc} />
        {abertosDaFase.length > 0 && <div className="mt-2 font-mono text-[12px]" style={{ color: k(COR.critico) }}>● {abertosDaFase.length} crítico{abertosDaFase.length > 1 ? "s" : ""} travando a fase {doc.fase}</div>}
        {acoes.podeEditar && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {acoes.avaliar && <Botao cor={k(COR.avaliacao)} titulo="A fase está toda provada: a Zaeon avalia pela rubrica" onClick={acoes.avaliar} desabilitado={acoes.avaliando}>{acoes.avaliando ? "▮ a Zaeon está avaliando…" : "✦ pedir avaliação da Zaeon"}</Botao>}
            {acoes.recompor && <Botao cor={k(COR.estudo)} titulo="A Zaeon recompõe o blueprint agora (ela já faz isso sozinha a cada conversa)" onClick={acoes.recompor} desabilitado={acoes.recompondo}>{acoes.recompondo ? "▮ a Zaeon está recompondo…" : "⟳ Zaeon atualiza"}</Botao>}
            {acoes.reorganizar && acoes.temFixos && <Botao cor={k("#e8f6ff")} titulo="Solta o que você arrastou e volta ao alinhamento simétrico" onClick={acoes.reorganizar}>⊞ reorganizar</Botao>}
          </div>
        )}
      </CardPrancha>
    );
  }
  if (id === "figura") return <FiguraHeroi doc={doc} onArrastar={onArrastar} />;
  if (id === "youtube") return <CardYoutube doc={doc} onArrastar={onArrastar} />;
  if (id === "futuro") {
    const depois = doc.passos.filter((p) => p.fase > doc.fase);
    return (
      <CardPrancha cor={k(COR.passo)} carimbo={`PRÓXIMAS FASES · ${depois.length} passo${depois.length > 1 ? "s" : ""}`} direita={<span className="font-mono text-[11px] text-sky-200/60">🔒</span>} apagado onArrastar={onArrastar}>
        <ul className="space-y-1 text-[14px] text-sky-50/80">{depois.map((p) => <li key={p.id}>· <span className="font-mono text-sky-200/60">fase {p.fase}</span> — {p.titulo}</li>)}</ul>
        <Texto><Falta>aparecem aqui quando a fase {doc.fase} fechar</Falta></Texto>
      </CardPrancha>
    );
  }
  if (id === "avaliacao") {
    const a = doc.avaliacoes[doc.avaliacoes.length - 1]!;
    return (
      <CardPrancha cor={k(COR.avaliacao)} carimbo="AVALIAÇÃO · ZAEON" fundo="rgba(48,38,8,.85)" direita={<span className="font-mono text-[11px]" style={{ color: a.aprovada ? k(COR.provado) : k(COR.critico) }}>fase {a.fase} {a.aprovada ? "aprovada" : "ainda não"}</span>} onArrastar={onArrastar}>
        {(["rigor", "originalidade", "usabilidade", "viabilidade", "impacto"] as const).map((dim) => (
          <div key={dim} className="my-1 flex items-center gap-2 font-mono text-[12px]">
            <span className="w-28 text-sky-200/70">{dim === "usabilidade" ? "usabilidade real" : dim}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded bg-sky-950/60"><span className="block h-full" style={{ width: `${a.nota[dim]}%`, background: k(COR.avaliacao) }} /></span>
            <span className="w-7 text-right">{a.nota[dim]}</span>
          </div>
        ))}
        <Texto>{a.parecer}</Texto>
      </CardPrancha>
    );
  }
  if (id.startsWith("critico:")) {
    const c = doc.criticos.find((k) => `critico:${k.id}` === id)!;
    const peca = c.pecaId ? doc.pecas.find((p) => p.id === c.pecaId) : undefined;
    return (
      <CardPrancha cor={k(COR.critico)} carimbo={`CRÍTICO · ${codigoCritico(doc, c)}`} fundo="rgba(52,14,26,.85)" brilho direita={<span className="font-mono text-[11px]" style={{ color: k(COR.critico) }}>trava fase {c.fase}</span>} onArrastar={onArrastar}>
        <Titulo>{c.titulo}</Titulo>
        <div className="mt-2 border border-dashed px-2 py-1.5 font-mono text-[12px]" style={{ borderColor: k("rgba(255,77,94,.6)"), color: k("#ffc2c8") }}>PROVA: {c.prova}{peca ? ` · peça ${peca.nome}` : ""}</div>
        {acoes.extra?.(id)}
      </CardPrancha>
    );
  }
  if (id.startsWith("passo:")) {
    const i = doc.passos.findIndex((p) => `passo:${p.id}` === id), p = doc.passos[i]!;
    const trava = doc.criticos.filter((c) => c.passoId === p.id);
    return (
      <CardPrancha cor={k(COR.passo)} carimbo={`PERCURSO · P-${dois(i + 1)}`} direita={<TagFase fase={p.fase} doc={doc} />} apagado={p.fase > doc.fase} onArrastar={onArrastar}>
        <Titulo>{i + 1}. {p.titulo}</Titulo>
        {p.corpo && <Texto>{p.corpo}</Texto>}
        {p.fontes.length > 0 && (
          <ul className="mt-2 space-y-0.5 border-t pt-2 text-[12.5px] text-emerald-100/85" style={{ borderColor: "rgba(125,255,176,.25)" }}>
            {p.fontes.map((f, k) => <li key={k}>✓ {f.url ? <a href={f.url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted" onPointerDown={(e) => e.stopPropagation()}>{f.titulo}</a> : f.titulo}{f.ano ? ` (${f.ano})` : ""}</li>)}
          </ul>
        )}
        {trava.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{trava.map((c) => <span key={c.id} className="rounded-sm border px-1.5 py-0.5 font-mono text-[11.5px]" style={{ borderColor: c.status === "provado" ? k(COR.provado) : k(COR.critico), color: c.status === "provado" ? k(COR.provado) : k(COR.critico) }}>{c.status === "provado" ? "✓" : "●"} {codigoCritico(doc, c)} {c.status === "provado" ? "provado" : "trava"}</span>)}</div>}
      </CardPrancha>
    );
  }
  if (id === "repos") {
    return (
      <CardPrancha cor={k(COR.repos)} carimbo="REPOSITÓRIOS · G-01" direita={<span className="font-mono text-[11px] text-sky-200/60">GitHub</span>} onArrastar={onArrastar}>
        <ul className="font-mono text-[13px]">
          {doc.repos.map((r) => (
            <li key={r.nome} className="flex items-center gap-2 border-t py-1 first:border-t-0" style={{ borderColor: "rgba(150,205,255,.1)" }}>
              <span style={{ color: r.meu ? k(COR.provado) : k(COR.repos) }}>⌥</span>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline" title={r.descricao} onPointerDown={(e) => e.stopPropagation()}>{r.nome}</a>
              {r.meu ? <span className="ml-auto text-[11.5px]" style={{ color: k(COR.provado) }}>seu ✓</span> : r.estrelas ? <span className="ml-auto text-[11.5px] text-sky-200/50">★ {r.estrelas >= 1000 ? `${(r.estrelas / 1000).toFixed(1)}k` : r.estrelas}</span> : null}
            </li>
          ))}
        </ul>
      </CardPrancha>
    );
  }
  if (id === "conversas") {
    const ROSTO: Record<string, string> = { mentor: "#2a4f7a", agente: "#3b2a5c", dev: "#4a3a1a", voce: "#1f4d3a" };
    return (
      <CardPrancha cor={k(COR.conversas)} carimbo="CONVERSAS · D-01" direita={<span className="font-mono text-[11px] text-sky-200/60">{doc.participantes.length}</span>} onArrastar={onArrastar}>
        <ul className="text-[13.5px]">
          {doc.participantes.map((p) => (
            <li key={p.id} className="flex items-center gap-2 border-t py-1 first:border-t-0" style={{ borderColor: "rgba(150,205,255,.1)" }}>
              <span className="grid h-5 w-5 place-items-center rounded-full text-[12.5px]" style={{ background: ROSTO[p.papel] }}>{p.emoji ?? p.nome.slice(0, 1)}</span>
              <span>{p.nome}</span><span className="ml-auto font-mono text-[11px]" style={{ color: k(COR.conversas) }}>{p.papel === "voce" ? "você" : p.papel}</span>
            </li>
          ))}
        </ul>
      </CardPrancha>
    );
  }
  if (id === "demo") {
    const d = doc.demo, aberta = doc.fase >= 3;
    return (
      <CardPrancha cor={k(COR.demo)} carimbo="DEMO · X-01" direita={<TagFase fase={3} doc={doc} />} apagado={!aberta} onArrastar={onArrastar}>
        <Titulo>{d?.titulo ?? "Demo / protótipo"}</Titulo>
        <Texto>{d?.corpo ?? (aberta ? "Coloque a demo no ar e prove no crítico da fase." : "Abre na fase 3 — a prova de conceito vem antes.")}</Texto>
        {d?.url && <a href={d.url} target="_blank" rel="noopener noreferrer" className="mt-1 block font-mono text-[12.5px] underline" style={{ color: k(COR.provado) }} onPointerDown={(e) => e.stopPropagation()}>● demo no ar</a>}
      </CardPrancha>
    );
  }
  if (id === "produto") {
    return (
      <CardPrancha cor={k(COR.produto)} carimbo="PRODUTO · M-01" direita={<span className="font-mono text-[11px] text-sky-200/60">o que vira</span>} onArrastar={onArrastar}>
        <Titulo>{doc.produto?.titulo}</Titulo>{doc.produto?.corpo && <Texto>{doc.produto.corpo}</Texto>}
      </CardPrancha>
    );
  }
  if (id === "proximos") {
    return (
      <CardPrancha cor={k(COR.proximos)} carimbo="PRÓXIMOS · N-01" direita={<span className="font-mono text-[11px] text-sky-200/60">Zaeon</span>} onArrastar={onArrastar}>
        <ol className="space-y-1 text-[13.5px]">{doc.proximos.map((p, i) => <li key={i}><span className="font-mono text-sky-200/60">{i + 1}.</span> {p}</li>)}</ol>
      </CardPrancha>
    );
  }
  if (id.startsWith("nota:")) {
    const n = doc.notas.find((k) => `nota:${k.id}` === id)!;
    return (
      <CardPrancha cor={k(COR.nota)} carimbo="NOTA" onArrastar={onArrastar}>
        {n.titulo && <Titulo>{n.titulo}</Titulo>}{n.corpo && <Texto>{n.corpo}</Texto>}
      </CardPrancha>
    );
  }
  return null;
}
