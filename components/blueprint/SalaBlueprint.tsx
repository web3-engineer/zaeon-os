"use client";
/**
 * SalaBlueprint — a Sala de Estudos como BLUEPRINT PRÁTICO (spec docs/superpowers/specs/2026-10-22-blueprint-pratico-
 * design.md). No TOPO, o seletor: um item por conversa do chat que virou estudo (fase, críticos abertos, a barrinha das
 * 4 fases). Embaixo, a prancha do estudo aberto, com todo o espaço da tela. Flag NEXT_PUBLIC_BLUEPRINT_PRATICO.
 */
import type { ResumoBlueprint } from "@/lib/blueprint/server";
import { podeEscrever } from "@/lib/cartolina/access";
import { COR } from "./Modulos";
import PranchaBlueprint from "./PranchaBlueprint";
import { useEffect, useMemo, useState } from "react";
import { pedirConversa } from "@/lib/chat/conversasNav";
import { filtrarBlueprints } from "@/lib/blueprint/busca";
import { NOME_FASE } from "@/lib/blueprint/tipos";
import { precisaAvaliar } from "@/lib/blueprint/fases";
import { useBlueprint } from "./useBlueprint";
import { telaDesenhou } from "./cronometro";
import DicasRapidas from "@/components/onboard/DicasRapidas";
import { DICAS_SALA } from "@/lib/onboarding/dicas";
import { CSS_BARBIE, LETRAS, MAO, PAPEL, REDONDA, ROSA, SKINS, corNaSkin, useLetraEscolhida, useSkinEscolhida, type Skin } from "./skin";
import dynamic from "next/dynamic";

const PlayerVideoDoc = dynamic(() => import("@/components/videodoc/PlayerVideoDoc"), { ssr: false });

const AZUL = "#0b2c4d";

function BarrinhaFases({ b, skin, tour }: { b: Pick<ResumoBlueprint, "fase" | "aguardandoMentor">; skin: Skin; tour?: string }) {
  return (
    <div data-tour={tour} className="mt-1.5 flex gap-[3px]">
      {[1, 2, 3, 4].map((f) => {
        const ok = f < b.fase || (f === 4 && b.aguardandoMentor), at = f === b.fase && !b.aguardandoMentor;
        return <i key={f} className="h-[3px] flex-1 rounded-sm" style={{ background: corNaSkin(skin, ok ? (f === 4 ? "#ffd36b" : COR.provado) : at ? COR.critico : "rgba(150,205,255,.14)") }} />;
      })}
    </div>
  );
}

/** o campo da PROVA dentro do crítico vermelho: cola o link do artefato; o servidor confere */
function ProvaForm({ criticoId, tipo, enviar }: { criticoId: string; tipo: string; enviar: (criticoId: string, url: string) => Promise<{ ok: boolean; motivo?: string }> }) {
  const [url, setUrl] = useState(""), [estado, setEstado] = useState<{ enviando?: boolean; erro?: string }>({});
  const mandar = async () => {
    if (!url.trim() || estado.enviando) return;
    setEstado({ enviando: true });
    const r = await enviar(criticoId, url.trim());
    setEstado(r.ok ? {} : { erro: r.motivo ?? "a prova não passou" });
    if (r.ok) setUrl("");
  };
  return (
    <div className="mt-2" onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex gap-1.5">
        <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void mandar(); }} maxLength={500}
          placeholder={tipo === "repo" ? "https://github.com/você/repo" : "https://… (o link do artefato)"}
          className="min-w-0 flex-1 rounded-sm border bg-black/20 px-2 py-1 font-mono text-[11px] text-sky-50 outline-none placeholder:text-rose-100/35" style={{ borderColor: "rgba(255,77,94,.5)" }} />
        <button type="button" onClick={() => void mandar()} disabled={estado.enviando || !url.trim()} className="rounded-sm border px-2 py-1 font-mono text-[10.5px] text-white transition hover:bg-white/10 disabled:opacity-40" style={{ borderColor: COR.critico, background: "rgba(255,77,94,.25)" }}>
          {estado.enviando ? "conferindo…" : "enviar prova →"}
        </button>
      </div>
      {estado.erro && <div className="mt-1 font-mono text-[10.5px] text-rose-200">{estado.erro}</div>}
    </div>
  );
}

export default function SalaBlueprint({ inicialId }: { inicialId?: string | null }) {
  const B = useBlueprint(inicialId);
  const [skin, setSkin] = useSkinEscolhida(), papel = skin === "cartolina", rosa = skin === "barbie";
  const [letra, setLetra] = useLetraEscolhida(), iLetra = LETRAS.indexOf(letra as (typeof LETRAS)[number]);
  // as cores da barra de cima por skin
  const barra = papel ? { background: "#e6dcc2", borderColor: "rgba(107,90,62,.35)", color: PAPEL.tinta, fontFamily: MAO }
    : rosa ? { background: ROSA.barra, borderColor: ROSA.borda, color: ROSA.tinta, fontFamily: REDONDA, backdropFilter: "blur(16px) saturate(150%)", WebkitBackdropFilter: "blur(16px) saturate(150%)" }
    : { background: "rgba(5,22,42,.9)", borderColor: "rgba(127,224,255,.3)" };
  const contorno = papel ? "rgba(107,90,62,.45)" : rosa ? "rgba(219,39,119,.4)" : "rgba(127,224,255,.35)";
  const ligado = papel ? { background: PAPEL.tinta, color: "#efe7d3" } : rosa ? { background: "linear-gradient(135deg,#ff4fa3,#e6007e)", color: "#fff" } : { background: "rgba(127,224,255,.2)", color: "#fff" };
  const desligado = { color: papel ? PAPEL.tintaSuave : rosa ? ROSA.tintaSuave : "rgba(186,230,253,.75)" };
  const { lista, atual } = B;
  // #683: a busca pelo nome (nos que a lista já trouxe; "ver mais" traz os antigos)
  const [busca, setBusca] = useState(""), [vendoMais, setVendoMais] = useState(false);
  const visiveis = useMemo(() => (lista ? filtrarBlueprints(lista, busca) : null), [lista, busca]);
  const verMais = async () => { setVendoMais(true); await B.verMais(); setVendoMais(false); };
  // #631: a marcação segue o CLIQUE (não espera o servidor) — antes parecia que o clique não tinha pegado
  const marcado = B.selecionado ?? atual?.id;
  // #631: o cronômetro fecha no quadro seguinte ao desenho da prancha nova
  const idDesenhado = atual?.id;
  useEffect(() => { if (!idDesenhado) return; const q = requestAnimationFrame(() => { telaDesenhou(idDesenhado); }); return () => cancelAnimationFrame(q); }, [idDesenhado]);
  const [aviso, setAviso] = useState<string | null>(null), [avaliando, setAvaliando] = useState(false), [videoAberto, setVideoAberto] = useState<string | null>(null);
  // #681: excluir e renomear o blueprint aberto (só o dono)
  const [acao, setAcao] = useState<null | "excluir" | "renomear">(null), [nome, setNome] = useState(""), [falhaAcao, setFalhaAcao] = useState<string | null>(null), [excluindo, setExcluindo] = useState(false);
  const doDono = !!atual && atual.papel === "dono" && atual.id === marcado && !B.carregando;
  useEffect(() => { setAcao(null); setFalhaAcao(null); }, [marcado]);
  const confirmarExclusao = async () => {
    if (!atual || excluindo) return;
    setExcluindo(true); setFalhaAcao(null);
    const ok = await B.excluir(atual.id);
    setExcluindo(false);
    if (ok) setAcao(null); else setFalhaAcao("Não deu para excluir agora. Tente de novo.");
  };
  // um renomear por vez: a faixa fica aberta até gravar, e volta o nome de antes se falhar
  const [salvando, setSalvando] = useState(false);
  const salvarNome = async () => {
    if (!nome.trim() || salvando) return;
    setSalvando(true); setFalhaAcao(null);
    const ok = await B.renomear(nome);
    setSalvando(false);
    if (ok) setAcao(null); else setFalhaAcao("Não deu para renomear agora. Tente de novo.");
  };
  const enviar = async (criticoId: string | null, url: string) => {
    const r = await B.enviarProva(criticoId, url);
    if (r.avaliacao) {
      setAviso(r.avaliacao.aprovada ? `✓ A Zaeon aprovou a fase ${r.avaliacao.fase} (${NOME_FASE[r.avaliacao.fase]}). ${r.avaliacao.fase < 4 ? "A próxima fase abriu." : "Agora é com o mentor."}` : `A Zaeon ainda não aprovou a fase ${r.avaliacao.fase} — veja o parecer na prancha.`);
      setTimeout(() => setAviso(null), 7000);
    } else if (r.ok && r.motivo) { setAviso(r.motivo); setTimeout(() => setAviso(null), 7000); }
    return r;
  };
  return (
    <div className={`flex h-full w-full flex-col ${papel ? "skin-cartolina" : rosa ? "skin-barbie" : ""}`} style={{ background: papel ? PAPEL.fundo : rosa ? ROSA.fundo : AZUL }}>
      {rosa && <style>{CSS_BARBIE}</style>}
      <div className="relative z-[96] flex flex-none items-stretch gap-2 overflow-x-auto border-b px-3 py-2" style={barra}>
        {/* a SKIN da sala: o papel azul técnico, a cartolina rabiscada ou a barbie de vidro (fica lembrada neste navegador) */}
        <div className="flex flex-none self-center overflow-hidden rounded-full border font-mono text-[11px]" style={{ borderColor: contorno }} role="group" aria-label="Skin da sala">
          {SKINS.map((k) => (
            <button key={k.id} type="button" onClick={() => setSkin(k.id)} aria-pressed={skin === k.id} className="px-3 py-1 transition" style={skin === k.id ? ligado : desligado}>{k.nome}</button>
          ))}
        </div>
        {/* o TAMANHO DA LETRA dos cards (lembrado neste navegador) */}
        <div className="flex flex-none items-center self-center overflow-hidden rounded-full border font-mono text-[11px]" style={{ borderColor: contorno }} role="group" aria-label="Tamanho da letra">
          <button type="button" onClick={() => setLetra(LETRAS[Math.max(0, iLetra - 1)]!)} disabled={iLetra <= 0} aria-label="Diminuir a letra" className="px-2.5 py-1 disabled:opacity-35" style={desligado}>A−</button>
          <span className="px-1 tabular-nums" style={desligado}>{Math.round(letra * 100)}%</span>
          <button type="button" onClick={() => setLetra(LETRAS[Math.min(LETRAS.length - 1, iLetra + 1)]!)} disabled={iLetra >= LETRAS.length - 1} aria-label="Aumentar a letra" className="px-2.5 py-1 text-[13px] font-bold disabled:opacity-35" style={desligado}>A+</button>
        </div>
        <span className="self-center whitespace-nowrap pr-1 font-mono text-[11px] tracking-[0.2em] text-sky-300">BLUEPRINTS</span>
        {lista === null && !B.erro && <span className="self-center font-mono text-[11px] text-sky-200/50">carregando…</span>}
        {/* #683: a busca e as ações do aberto ficam presas à esquerda: rolar a barra não as esconde */}
        <div className="sticky left-0 z-[1] -ml-3 flex flex-none items-stretch gap-2 pl-3 pr-2" style={{ background: barra.background }}>
          {/* #683: buscar pelo nome */}
          {lista && (lista.length > 1 || busca) && (
            <div className="flex flex-none items-center self-center">
              <label htmlFor="bp-busca" className="sr-only">Buscar blueprint pelo nome</label>
              <input id="bp-busca" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setBusca(""); }}
                placeholder="buscar…" maxLength={80} className="w-[130px] rounded-sm border bg-black/20 px-2 py-1 font-mono text-[11px] outline-none placeholder:opacity-60"
                style={{ borderColor: contorno, color: papel ? PAPEL.tinta : rosa ? ROSA.tinta : "#e0f2fe" }} />
            </div>
          )}
          {/* #683: as ações do aberto ficam no COMEÇO da barra (antes ficavam depois do último blueprint, longe) */}
          {/* voltar à conversa de onde o blueprint nasceu */}
          {atual?.scopeId && atual.id === marcado && !B.carregando && (
            <button type="button" onClick={() => pedirConversa({ sala: "estudos", id: atual.scopeId! })} className="flex-none self-center whitespace-nowrap rounded-sm border px-2.5 py-1 font-mono text-[11px] transition hover:bg-white/10" style={{ borderColor: contorno, ...desligado }}>
              ← abrir a conversa
            </button>
          )}
          {/* #681: renomear e excluir o blueprint aberto (só o dono) */}
          {doDono && (
            <div className="flex flex-none flex-col justify-center gap-1 font-mono text-[10.5px]" role="group" aria-label="Ações do blueprint">
              <button type="button" onClick={() => { setNome(atual!.doc.titulo); setAcao("renomear"); }} aria-pressed={acao === "renomear"} className="rounded-sm border px-2 py-0.5 transition hover:bg-white/10" style={{ borderColor: contorno, ...desligado }}>renomear</button>
              <button type="button" onClick={() => setAcao("excluir")} aria-pressed={acao === "excluir"} className="rounded-sm border px-2 py-0.5 transition hover:bg-white/10" style={{ borderColor: "rgba(255,77,94,.5)", color: corNaSkin(skin, COR.critico) }}>excluir</button>
            </div>
          )}
        </div>
        {visiveis && busca.trim() && !visiveis.length && (
          <span role="status" className="self-center whitespace-nowrap font-mono text-[11px]" style={desligado}>
            nenhum blueprint com “{busca.trim()}”{B.temMais ? " nos que já carregaram" : ""}
          </span>
        )}
        {visiveis?.map((b, k) => (
          <button key={b.id} type="button" title={b.titulo} data-tour={k === 0 ? "blueprint-lista" : undefined} onClick={() => void B.abrir(b.id)} className="min-w-[190px] flex-none rounded-[3px] border px-2.5 py-1.5 text-left font-mono transition hover:bg-white/5"
            aria-pressed={marcado === b.id}
            style={{ borderColor: corNaSkin(skin, marcado === b.id ? COR.estudo : "rgba(127,224,255,.25)"), background: marcado === b.id ? (papel || rosa ? "rgba(255,255,255,.5)" : "rgba(127,224,255,.08)") : undefined }}>
            <b className="block max-w-[240px] truncate text-[12px] text-sky-50">{b.titulo}</b>
            <small className="text-[10px] text-sky-200/70">
              {b.area} · {b.aguardandoMentor ? <span style={{ color: corNaSkin(skin, "#ffd36b") }}>aguardando mentor</span> : <>fase {b.fase}{b.criticosAbertos ? <> · <span style={{ color: corNaSkin(skin, COR.critico) }}>{b.criticosAbertos} crítico{b.criticosAbertos > 1 ? "s" : ""}</span></> : null}</>}
            </small>
            <BarrinhaFases b={b} skin={skin} tour={k === 0 ? "blueprint-fases" : undefined} />
          </button>
        ))}
        {/* #683: os mais antigos que os 40 primeiros */}
        {B.temMais && (
          <button type="button" onClick={() => void verMais()} disabled={vendoMais} className="flex-none self-center whitespace-nowrap rounded-sm border px-2.5 py-1 font-mono text-[11px] transition hover:bg-white/10 disabled:opacity-50" style={{ borderColor: contorno, ...desligado }}>
            {vendoMais ? "carregando…" : "ver mais →"}
          </button>
        )}
      </div>
      {doDono && acao && (
        <div className="relative z-[96] flex flex-none flex-wrap items-center gap-2 border-b px-3 py-2 font-mono text-[11.5px]" style={barra} role={acao === "excluir" ? "alertdialog" : "group"} aria-label={acao === "excluir" ? "Confirmar exclusão" : "Renomear blueprint"}>
          {acao === "excluir" ? (<>
            <span className="min-w-0 flex-1">
              Excluir <b>“{atual!.doc.titulo}”</b>? O blueprint some de vez. A conversa de onde ele nasceu continua, e não cria outro.
              {atual!.compartilhado > 0 && <> {atual!.compartilhado === 1 ? "1 pessoa com acesso também deixa de ver." : `${atual!.compartilhado} pessoas com acesso também deixam de ver.`}</>}
            </span>
            <button type="button" onClick={() => void confirmarExclusao()} disabled={excluindo} className="rounded-sm border px-2.5 py-1 text-white disabled:opacity-50" style={{ borderColor: COR.critico, background: "rgba(255,77,94,.35)" }}>{excluindo ? "excluindo…" : "excluir"}</button>
            <button type="button" onClick={() => setAcao(null)} disabled={excluindo} className="rounded-sm border px-2.5 py-1" style={{ borderColor: contorno, ...desligado }}>cancelar</button>
          </>) : (<>
            <label className="sr-only" htmlFor="bp-nome">Novo nome do blueprint</label>
            <input id="bp-nome" autoFocus value={nome} maxLength={200} onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void salvarNome(); if (e.key === "Escape" && !salvando) setAcao(null); }}
              className="min-w-0 flex-1 rounded-sm border bg-black/20 px-2 py-1 outline-none" style={{ borderColor: contorno }} />
            <button type="button" onClick={() => void salvarNome()} disabled={!nome.trim() || salvando} className="rounded-sm border px-2.5 py-1 disabled:opacity-40" style={{ borderColor: contorno, ...ligado }}>{salvando ? "salvando…" : "salvar"}</button>
            <button type="button" onClick={() => setAcao(null)} disabled={salvando} className="rounded-sm border px-2.5 py-1" style={{ borderColor: contorno, ...desligado }}>cancelar</button>
          </>)}
          {falhaAcao && <span role="alert" className="w-full text-rose-300">{falhaAcao}</span>}
        </div>
      )}
      <div className="relative min-h-0 flex-1" data-tour="blueprint-prancha" aria-busy={B.carregando}>
        {/* #631: clicou noutro blueprint e ele ainda não chegou: avisa (a prancha de antes fica até a nova chegar) */}
        {B.carregando && (
          // #645: no MEIO da prancha (antes, colado no topo — centralizado só na largura)
          <div role="status" className="pointer-events-none absolute left-1/2 top-1/2 z-[97] -translate-x-1/2 -translate-y-1/2 rounded border px-3 py-1 font-mono text-[11.5px] text-sky-50"
            style={{ background: "rgba(5,22,42,.92)", borderColor: "rgba(127,224,255,.4)" }}>
            carregando o blueprint…
          </div>
        )}
        {/* #618: dicas rápidas na 1ª vez (só com um blueprint aberto — sem nenhum, o aviso da tela já explica) */}
        {atual && <DicasRapidas lugar="sala-estudos" dicas={DICAS_SALA} />}
        {atual ? (
          <PranchaBlueprint id={atual.id} doc={atual.doc} onFixar={B.fixar} skin={skin} letra={letra}
            // #631 (revisão): enquanto o blueprint clicado carrega, a prancha de antes fica só pra ver (não edita)
            acoes={{ podeEditar: podeEscrever(atual.papel) && !B.carregando, avaliando, abrirVideo: setVideoAberto,
              avaliar: podeEscrever(atual.papel) && precisaAvaliar(atual.doc) ? () => { setAvaliando(true); void enviar(null, "").finally(() => setAvaliando(false)); } : undefined, recompor: atual.papel === "dono" ? B.recompor : undefined, recompondo: B.recompondo, reorganizar: B.reorganizar, temFixos: Object.keys(atual.doc.fixos).length > 0,
              extra: podeEscrever(atual.papel) ? (id) => { const c = id.startsWith("critico:") ? atual.doc.criticos.find((k) => `critico:${k.id}` === id) : undefined; return c ? <ProvaForm criticoId={c.id} tipo={c.tipoProva} enviar={enviar} /> : undefined; } : undefined }}
            sobre={<>
              {aviso && <div className="absolute left-1/2 top-3 z-[95] -translate-x-1/2 rounded border px-3 py-1.5 font-mono text-[11.5px] text-sky-50" style={{ background: "rgba(5,22,42,.92)", borderColor: COR.avaliacao }}>{aviso}</div>}
              {videoAberto && <PlayerVideoDoc videoId={videoAberto} onFechar={() => setVideoAberto(null)} />}
            </>} />
        ) : B.erro && lista === null ? (
          <div className="flex h-full items-center justify-center p-8" role="alert">
            <div className="max-w-md text-center font-mono text-[12.5px] leading-relaxed text-sky-100/75">
              <div className="mb-2 text-[11px] tracking-[0.2em] text-rose-300">NÃO DEU PARA CARREGAR OS BLUEPRINTS</div>
              Pode ser a conexão ou o servidor. Seus blueprints continuam guardados.
              <div className="mt-3"><button type="button" onClick={() => void B.recarregar()} className="rounded-sm border px-3 py-1 text-sky-50 transition hover:bg-white/10" style={{ borderColor: "rgba(127,224,255,.45)" }}>tentar de novo</button></div>
            </div>
          </div>
        ) : lista && !lista.length ? (
          <div className="flex h-full items-center justify-center p-8">
            <div className="max-w-md text-center font-mono text-[12.5px] leading-relaxed text-sky-100/75">
              <div className="mb-2 text-[11px] tracking-[0.2em] text-sky-300">NENHUM BLUEPRINT AINDA</div>
              Converse com a Aura sobre um tema que você quer dominar. Quando a conversa virar um estudo, o blueprint dele
              nasce aqui — com o percurso, os repositórios do tema, o que construir e os críticos que destravam cada fase.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
