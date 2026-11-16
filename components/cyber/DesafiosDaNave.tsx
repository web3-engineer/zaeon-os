"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { EventoTerra } from "@/lib/cyber/terraAoVivo";

type Proposta = { texto: string; passos: string[] };
type Projeto = Proposta & { feito: boolean; revisao: number };
type Turno = { role: "user" | "model"; text: string };

export default function DesafiosDaNave({ userId, fechar }: { userId: string; fechar: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const chave = `zaeon:nave:desafio:${userId}`;
  const [aba, setAba] = useState<"zaeon" | "terra" | "projetos">("zaeon");
  const [historico, setHistorico] = useState<Turno[]>([]);
  const [pedido, setPedido] = useState("");
  const [proposta, setProposta] = useState<Proposta | null>(null);
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [projetoPronto, setProjetoPronto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [eventos, setEventos] = useState<EventoTerra[] | null>(null);
  const [erroTerra, setErroTerra] = useState(false);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const requisicao = useRef<AbortController | null>(null);

  useEffect(() => {
    dialog.current?.showModal();
    return () => requisicao.current?.abort();
  }, []);

  useEffect(() => {
    const ctl = new AbortController();
    async function carregar() {
      setProjetoPronto(false);
      setErro("");
      try {
        const resposta = await fetch("/api/cyber/desafios/projeto", { signal: ctl.signal, cache: "no-store" });
        if (!resposta.ok) throw new Error();
        let { projeto: atual } = await resposta.json();
        let importado = false;
        let legado;
        try { legado = JSON.parse(localStorage.getItem(chave) ?? "null"); } catch { /* armazenamento indisponível */ }
        if (!atual && legado?.texto && Array.isArray(legado.passos)) {
          const migracao = await fetch("/api/cyber/desafios/projeto", {
            method: "PUT", headers: { "Content-Type": "application/json" }, signal: ctl.signal,
            body: JSON.stringify({ ...legado, acao: "importar", revisao: 0 }),
          });
          if (!migracao.ok && migracao.status !== 409) throw new Error();
          atual = (await migracao.json()).projeto;
          importado = migracao.ok;
        }
        if (ctl.signal.aborted) return;
        if (importado) {
          try { localStorage.removeItem(chave); } catch { /* armazenamento indisponível */ }
        }
        setProjeto(atual);
        setProjetoPronto(true);
      } catch {
        if (!ctl.signal.aborted) setErro("Não foi possível carregar o desafio da sua conta.");
      }
    }
    void carregar();
    return () => ctl.abort();
  }, [chave, tentativa]);

  useEffect(() => {
    if (aba !== "terra") return;
    const ctl = new AbortController();
    fetch("/api/cyber/terra", { signal: ctl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const dados = await r.json();
        setEventos(dados.eventos.slice(0, 6));
        setErroTerra(false);
      })
      .catch(() => { if (!ctl.signal.aborted) setErroTerra(true); });
    return () => ctl.abort();
  }, [aba]);

  async function conversar(texto: string) {
    if (requisicao.current || !texto.trim()) return;
    const ctl = new AbortController();
    requisicao.current = ctl;
    setOcupado(true);
    setErro("");
    setProposta(null);
    setAba("zaeon");
    try {
      const resposta = await fetch("/api/cyber/desafios", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedido: texto, historico }), signal: ctl.signal,
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "A Zaeon está indisponível agora.");
      const nova: Proposta = dados.proposta;
      setProposta(nova);
      setHistorico((anterior) => [
        ...anterior.slice(-4),
        { role: "user", text: texto },
        { role: "model", text: [nova.texto, ...nova.passos].join("\n") },
      ]);
      setPedido("");
    } catch (e) {
      if (!ctl.signal.aborted) setErro(e instanceof Error ? e.message : "Tente novamente.");
    } finally {
      requisicao.current = null;
      if (!ctl.signal.aborted) setOcupado(false);
    }
  }

  async function salvar(acao: "aceitar" | "concluir", nova?: Proposta) {
    if (!projetoPronto || salvando) return;
    setSalvando(true);
    setErro("");
    try {
      const resposta = await fetch("/api/cyber/desafios/projeto", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nova, acao, revisao: projeto?.revisao ?? 0 }),
      });
      const dados = await resposta.json();
      if (resposta.ok || resposta.status === 409) setProjeto(dados.projeto);
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível salvar o desafio.");
      if (acao === "aceitar") setProposta(null);
      setAba("projetos");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar o desafio.");
    } finally {
      setSalvando(false);
    }
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    void conversar(pedido);
  }

  const abas = [["zaeon", "Zaeon"], ["terra", "Necessidades da Terra"], ["projetos", "Projetos da Terra"]] as const;

  return (
    <dialog ref={dialog} aria-labelledby="desafios-nave" onClose={fechar}
      onKeyDown={(e) => e.stopPropagation()}
      className="m-auto max-h-[85dvh] w-[min(92vw,38rem)] overflow-y-auto rounded-2xl border border-cyan-300/35 bg-[#080f23] p-5 text-slate-100 backdrop:bg-[#020617]/75 sm:p-7">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 id="desafios-nave" className="text-lg font-semibold">Desafios da sua nave</h2>
        <button type="button" onClick={() => dialog.current?.close()} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm">Fechar</button>
      </div>
      <nav aria-label="Painéis da nave" className="mb-5 flex flex-wrap gap-2">
        {abas.map(([id, nome]) => (
          <button key={id} type="button" aria-pressed={aba === id} onClick={() => setAba(id)}
            className={`rounded-lg border px-3 py-2 text-sm ${aba === id ? "border-cyan-300 bg-cyan-300/15" : "border-white/20"}`}>{nome}</button>
        ))}
      </nav>
      {erro && <p role="alert" className="mb-4 text-sm text-rose-200">{erro}</p>}
      {aba === "zaeon" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-300">Peça um desafio ou converse sobre sua rotina e seus estudos. A Zaeon consulta os registros da sua conta.</p>
          <form onSubmit={enviar} className="space-y-2">
            <textarea value={pedido} onChange={(e) => setPedido(e.target.value)} maxLength={600} rows={3}
              aria-label="Mensagem para a Zaeon" placeholder={historico.length ? "O que você quer ajustar na proposta?" : "O que você quer praticar ou resolver?"}
              className="w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-sm" />
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={ocupado || !pedido.trim()} className="rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">Enviar</button>
              <button type="button" disabled={ocupado} onClick={() => void conversar("Analise meus registros de estudo e rotina e sugira um desafio individual.")}
                className="rounded-lg border border-cyan-300/40 px-3 py-2 text-sm disabled:opacity-50">Sugerir um desafio</button>
            </div>
          </form>
          {ocupado && <p role="status" className="text-sm text-cyan-200">Zaeon está consultando seus registros…</p>}
          {proposta && (
            <article className="space-y-3 rounded-xl border border-cyan-300/25 bg-cyan-300/5 p-4">
              <p className="whitespace-pre-wrap text-sm">{proposta.texto}</p>
              <Passos passos={proposta.passos} />
              <button type="button" disabled={!projetoPronto || salvando || (!!projeto && !projeto.feito)} onClick={() => void salvar("aceitar", proposta)}
                className="rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">Aceitar desafio</button>
              {projeto && !projeto.feito && <p className="text-xs text-slate-300">Conclua o desafio ativo antes de aceitar outro.</p>}
            </article>
          )}
        </div>
      )}
      {aba === "terra" && (
        <div className="space-y-3">
          {erroTerra ? <p>Os dados da Terra estão indisponíveis agora.</p> : !eventos ? <p role="status">Buscando dados da Terra…</p> : eventos.length === 0 ? <p>Nenhum evento disponível agora.</p> :
            eventos.map((evento) => (
              <article key={`${evento.fonte}:${evento.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/15 p-3">
                <div><h3 className="text-sm font-medium">{evento.titulo}</h3><p className="text-xs text-slate-300">{evento.fonte}</p></div>
                <button type="button" disabled={ocupado} className="rounded-lg border border-cyan-300/40 px-3 py-2 text-sm disabled:opacity-50"
                  onClick={() => void conversar(`Proponha um desafio individual de estudo inspirado neste evento público: ${evento.titulo.slice(0, 300)} (${evento.fonte}).`)}>Criar proposta</button>
              </article>
            ))}
        </div>
      )}
      {aba === "projetos" && (
        !projetoPronto ? (erro ? <button type="button" onClick={() => setTentativa((n) => n + 1)}>Tentar novamente</button> : <p role="status">Carregando seu desafio…</p>) : projeto ? <article className="space-y-3 rounded-xl border border-white/15 p-4">
          <p className="text-sm font-semibold text-cyan-200">{projeto.feito ? "Concluído" : "Em andamento"}</p>
          <p className="whitespace-pre-wrap text-sm">{projeto.texto}</p>
          <Passos passos={projeto.passos} />
          {!projeto.feito && <button type="button" disabled={salvando} onClick={() => void salvar("concluir")} className="rounded-lg border border-cyan-300/40 px-3 py-2 text-sm">Marcar como concluído</button>}
        </article> : <p className="text-sm text-slate-300">Aceite uma proposta da Zaeon para começar seu primeiro desafio.</p>
      )}
    </dialog>
  );
}

function Passos({ passos }: { passos: string[] }) {
  if (!passos.length) return null;
  return <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-300">
    {passos.map((passo, i) => <li key={i}>{passo}</li>)}
  </ol>;
}
