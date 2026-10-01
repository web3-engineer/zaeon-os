"use client";
/**
 * O app mobile: chat de COLUNA ÚNICA, no estilo dos apps do Claude/ChatGPT. Estudos ⇄ Pesquisa
 * no topo, histórico em drawer, composer fixo embaixo, ações do Studio num sheet.
 *
 * Rede = os MESMOS núcleos do desktop (useAuraChat/pedirAura, useScholar/scholarClient,
 * studioClient) — nada de lógica de rede própria aqui. Fora de propósito (ver docs/MOBILE.md):
 * sidebar de salas, biblioteca, árvore, cover-flow, mural, modo foco, revista, exportar ABNT.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useAuraChat } from "@/lib/chat/useAuraChat";
import { useScholar } from "@/lib/chat/useScholar";
import { criarEstudo, gerarArtefato, type BlocoStudio } from "@/lib/studio/studioClient";
import { cookiePref } from "@/lib/ui/mobilePref";
import ChatMarkdown from "@/components/study/ChatMarkdown";
import StructuredAnswerView from "@/components/study/StructuredAnswerView";
import { MobileComposer } from "@/components/mobile/MobileComposer";
import { MobileActionsSheet, ACOES_MOBILE } from "@/components/mobile/MobileActionsSheet";
import { MobileHistory, type ConversaLocal } from "@/components/mobile/MobileHistory";
import { ALVO, FOCO, VIDRO } from "@/components/mobile/estilo";

// O viewer do Studio (3Dmol, áudio, TTS) só baixa quando há artefato pronto pra mostrar.
const StudioBlock = dynamic(() => import("@/components/studio/StudioBlock"), { ssr: false, loading: () => <div className="h-24 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-white/5" /> });

export type Surface = "estudos" | "pesquisa";
const K_ABA = "zaeon.m.aba";
const K_CONVERSAS = "zaeon.m.conversas";
const K_CONVERSA = "zaeon.m.conversa";
const novaId = () => "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function ler<T>(k: string, padrao: T): T { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : padrao; } catch { return padrao; } }
function gravar(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem L0 */ } }

type Geracao = { id: string; kind: string; rotulo: string; status: "gerando" | "pronto" | "erro"; bloco?: BlocoStudio; aberto?: boolean };

export default function MobileChat({ surface }: { surface: Surface }) {
  const [conversaId, setConversaId] = useState<string>("");
  const [conversas, setConversas] = useState<ConversaLocal[]>([]);
  const [texto, setTexto] = useState("");
  const [historico, setHistorico] = useState(false);
  const [acoes, setAcoes] = useState(false);
  const [geracoes, setGeracoes] = useState<Geracao[]>([]);
  const fimRef = useRef<HTMLDivElement>(null);

  // última aba + conversa corrente (L0, por aparelho)
  useEffect(() => {
    gravar(K_ABA, surface);
    const lista = ler<ConversaLocal[]>(K_CONVERSAS, []);
    setConversas(lista);
    setConversaId(ler<string>(K_CONVERSA, "") || lista[0]?.id || novaId());
  }, [surface]);
  useEffect(() => { if (conversaId) gravar(K_CONVERSA, conversaId); }, [conversaId]);

  const gerar = useCallback(async (kind: string, topico: string) => {
    const id = novaId();
    const rotulo = ACOES_MOBILE.find((a) => a.kind === kind)?.rotulo ?? kind;
    setGeracoes((g) => [...g, { id, kind, rotulo, status: "gerando" }]);
    const fim = (p: Partial<Geracao>) => setGeracoes((g) => g.map((x) => (x.id === id ? { ...x, ...p } : x)));
    const estudo = await criarEstudo(topico);
    if (!estudo) return fim({ status: "erro" });
    const r = await gerarArtefato(kind, { spaceId: estudo.id, topic: topico });
    if (r.tipo === "pronto") fim({ status: "pronto", bloco: r.bloco, aberto: true });
    else if (r.tipo === "erro") fim({ status: "erro" });
  }, []);

  const aura = useAuraChat({
    scopeId: conversaId || "pendente",
    onAcao: ({ kind, topic }) => void gerar(kind, topic), // a própria Aura pediu um artefato
  });
  const scholar = useScholar({ retomar: surface === "pesquisa" });

  // o tópico das ações = a última pergunta da conversa
  const topico = useMemo(() => [...aura.mensagens].reverse().find((m) => m.role === "user")?.text ?? "", [aura.mensagens]);

  const enviar = useCallback(() => {
    const t = texto.trim();
    if (!t) return;
    setTexto("");
    if (surface === "pesquisa") { void scholar.pesquisar(t); return; }
    // batiza a conversa com a 1ª pergunta
    if (!conversas.some((c) => c.id === conversaId)) {
      const nova = [{ id: conversaId, titulo: t.slice(0, 60), at: Date.now() }, ...conversas].slice(0, 50);
      setConversas(nova); gravar(K_CONVERSAS, nova);
    }
    void aura.enviar(t);
  }, [texto, surface, scholar, aura, conversas, conversaId]);

  // rola pro fim quando chega mensagem nova (chat de coluna única)
  const n = aura.mensagens.length + geracoes.length + scholar.phases.length + (scholar.answer ? 1 : 0);
  useEffect(() => { fimRef.current?.scrollIntoView?.({ block: "end" }); }, [n]);

  const versaoCompleta = () => { document.cookie = cookiePref("full"); };
  const ocupado = surface === "pesquisa" ? scholar.status === "running" : aura.enviando;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-50 text-slate-900 dark:bg-[#030014] dark:text-white">
      <header className={`sticky top-0 z-20 border-b ${VIDRO} px-2`} style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex h-14 items-center gap-1">
          <button type="button" onClick={() => setHistorico(true)} aria-label="Abrir histórico" className={`${ALVO} ${FOCO} rounded-full text-xl`}>☰</button>
          <nav aria-label="Sala" className="mx-auto flex rounded-full border border-slate-300/60 dark:border-white/15 p-0.5">
            {(["estudos", "pesquisa"] as const).map((s) => (
              <Link key={s} href={`/m/${s}`} aria-current={surface === s ? "page" : undefined}
                className={`${ALVO} ${FOCO} flex items-center rounded-full px-4 text-sm font-medium ${surface === s ? "bg-cyan-700 text-white dark:bg-cyan-500 dark:text-slate-950" : "text-slate-700 dark:text-white/70"}`}>
                {s === "estudos" ? "Estudos" : "Pesquisa"}
              </Link>
            ))}
          </nav>
          <Link href={surface === "pesquisa" ? "/research-lab?tab=pesquisa" : "/research-lab"} onClick={versaoCompleta}
            className={`${ALVO} ${FOCO} flex items-center rounded-full px-2 text-xs text-slate-600 dark:text-white/60`}>
            versão completa
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-4" aria-live="polite" aria-busy={ocupado}>
        {/* h1 só pra leitor de tela: o título visual é o toggle Estudos/Pesquisa do cabeçalho */}
        <h1 className="sr-only">{surface === "estudos" ? "Estudos com a Aura" : "Pesquisa científica"}</h1>
        {surface === "estudos" ? (
          <ol className="flex flex-col gap-4">
            {aura.mensagens.length === 0 && (
              <li className="mt-16 text-center text-slate-500 dark:text-white/50">Pergunte qualquer coisa pra Aura.</li>
            )}
            {aura.mensagens.map((m) => (
              <li key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                {m.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl bg-cyan-700 px-4 py-2.5 text-[15px] text-white">{m.text}</div>
                ) : (
                  <div className={`w-full rounded-2xl border px-4 py-3 text-[15px] leading-relaxed ${m.erro ? "border-amber-400/60 bg-amber-50 dark:bg-amber-500/10" : "border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04]"}`}>
                    {m.fase && m.chegando && <p className="mb-1 text-xs text-slate-500 dark:text-white/50">{m.fase}…</p>}
                    {m.answer
                      ? <StructuredAnswerView answer={m.answer} onConcept={(c) => void aura.enviar(`Me explica ${c}`)} onNext={(s) => void aura.enviar(s)} />
                      : m.text ? <ChatMarkdown text={m.text} /> : <p className="text-slate-500">…</p>}
                  </div>
                )}
              </li>
            ))}
            {geracoes.map((g) => (
              <li key={g.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                {g.status === "gerando" && <p className="text-sm">Gerando {g.rotulo.toLowerCase()}… <span className="text-slate-500">você pode sair, ele continua.</span></p>}
                {g.status === "erro" && <p className="text-sm text-amber-700 dark:text-amber-300">Não consegui gerar {g.rotulo.toLowerCase()} agora.</p>}
                {g.status === "pronto" && g.bloco && (
                  <StudioBlock block={{ studioKind: g.bloco.studioKind, title: g.bloco.title ?? g.rotulo, data: g.bloco.data, artifactId: g.bloco.artifactId, dataUrl: g.bloco.dataUrl }}
                    collapsed={!g.aberto} onToggle={() => setGeracoes((x) => x.map((y) => (y.id === g.id ? { ...y, aberto: !y.aberto } : y)))} />
                )}
              </li>
            ))}
          </ol>
        ) : (
          <section aria-label="Pesquisa" className="flex flex-col gap-4">
            {scholar.status === "idle" && !scholar.query && (
              <p className="mt-16 text-center text-slate-500 dark:text-white/50">Pesquise em artigos científicos.</p>
            )}
            {scholar.query && <div className="self-end max-w-[85%] rounded-2xl bg-cyan-700 px-4 py-2.5 text-[15px] text-white">{scholar.query}</div>}
            {scholar.status === "running" && (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
                <p className="font-medium">{scholar.phases.at(-1)?.message ?? "Começando a pesquisa…"}</p>
                <p className="mt-1 text-slate-500 dark:text-white/50">Pode sair: a pesquisa continua e fica no histórico.</p>
              </div>
            )}
            {scholar.status === "unauthorized" && <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm dark:bg-amber-500/10">Entre na sua conta pra pesquisar. <Link className="underline" href="/login?callbackUrl=/m/pesquisa">Entrar</Link></p>}
            {scholar.status === "error" && <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm dark:bg-amber-500/10">{scholar.error}</p>}
            {scholar.answer && (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] leading-relaxed dark:border-white/10 dark:bg-white/[0.04]">
                <ChatMarkdown text={scholar.answer} />
              </div>
            )}
            {scholar.status === "done" && Array.isArray(scholar.session?.references) && scholar.session.references.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                <h2 className="text-sm font-semibold">Referências</h2>
                <ol className="mt-2 flex flex-col gap-2 text-sm">
                  {scholar.session.references.slice(0, 10).map((r: any, i: number) => (
                    <li key={r.id ?? i}>
                      {r.url ? <a className={`${FOCO} underline`} href={r.url} target="_blank" rel="noreferrer">{r.title}</a> : r.title}
                      {r.year ? <span className="text-slate-500"> ({r.year})</span> : null}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        )}
        <div ref={fimRef} />
      </main>

      <MobileComposer
        valor={texto} onMudar={setTexto} onEnviar={enviar} desabilitado={ocupado}
        onMais={surface === "estudos" ? () => setAcoes(true) : undefined}
        placeholder={surface === "estudos" ? "Pergunte pra Aura…" : "O que você quer pesquisar?"}
        rotuloEnviar={surface === "estudos" ? "Enviar pergunta" : "Pesquisar"}
      />
      <MobileActionsSheet aberto={acoes} onFechar={() => setAcoes(false)} topico={topico} onEscolher={(k) => void gerar(k, topico)} />
      <MobileHistory
        aberto={historico} onFechar={() => setHistorico(false)} surface={surface} conversas={conversas}
        onAbrirConversa={(id) => { setConversaId(id); setGeracoes([]); }}
        onNovaConversa={() => { setConversaId(novaId()); setGeracoes([]); }}
        onAbrirPesquisa={(id) => void scholar.abrir(id)}
      />
    </div>
  );
}
