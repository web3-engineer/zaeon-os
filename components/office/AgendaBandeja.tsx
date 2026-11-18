"use client";

/**
 * AgendaBandeja — a agenda semanal do escritório (#396), numa bandeja retrátil por cima do canal.
 *
 * Colunas = dias (segunda → domingo), linhas = horas (1 quadrado = 1h). Toque no quadrado inicial e depois
 * no final, na MESMA coluna: a sua cor pinta o intervalo e a sua foto fica só no primeiro quadrado. Todo
 * mundo do canal vê. Repete toda semana. Toque na sua foto pra apagar o seu horário.
 * Regras (puras, testadas) em lib/canal/agenda.ts; dados em /api/canal/[id]/agenda.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AgentAvatar from "@/components/agents/AgentAvatar";
import {
  DIAS_ORDEM, DIA_CURTO, HORAS, corDaPessoa, ocupantes, proximoClique, textoBloco,
  type Ancora, type Bloco, type Dia,
} from "@/lib/canal/agenda";
import { VIDRO_POPOVER_SOLIDO, VIDRO_CHIP, TXT, TXT_2, TXT_MUDO, TOQUE } from "@/lib/canal/vidro";

type Pessoa = { id: string; nome: string; avatar: string | null };
type BlocoComId = Bloco & { id: string };

export default function AgendaBandeja({ canalId, aberta, onFechar, versao }: {
  canalId: string;
  aberta: boolean;
  onFechar: () => void;
  /** muda quando chega o evento "agenda" do canal (alguém marcou ou apagou) → recarrega. */
  versao: number;
}) {
  const [blocos, setBlocos] = useState<BlocoComId[]>([]);
  const [gente, setGente] = useState<Map<string, Pessoa>>(new Map());
  const [eu, setEu] = useState<string | null>(null);
  const [ancora, setAncora] = useState<Ancora>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const dialogoRef = useRef<HTMLDivElement>(null);
  // Só a ÚLTIMA carga vale: o evento "agenda" do Pusher, o salvar e o trocar de canal disparam cargas em
  // sequência, e uma resposta velha chegando depois da nova sobrescrevia a agenda com dado antigo (ou de
  // outro canal). Cada carga aborta a anterior e confere o número antes de gravar.
  const cargaAtual = useRef(0);
  const abortar = useRef<AbortController | null>(null);
  // O canal que está NA TELA agora. Um salvar/apagar do canal A que termina depois de o usuário ir pro B
  // não pode recarregar (nem mostrar erro de) A por cima de B.
  const canalNaTela = useRef(canalId);
  canalNaTela.current = canalId;

  const carregar = useCallback(async () => {
    if (canalId !== canalNaTela.current) return;
    const minha = ++cargaAtual.current;
    abortar.current?.abort();
    const ctl = new AbortController();
    abortar.current = ctl;
    setCarregando(true);
    try {
      const r = await fetch(`/api/canal/${canalId}/agenda`, { cache: "no-store", signal: ctl.signal });
      const j = await r.json().catch(() => ({}));
      if (minha !== cargaAtual.current) return;
      if (!r.ok) { setErro(j?.error || `Não deu pra abrir a agenda (${r.status})`); return; }
      setBlocos(j.blocos ?? []);
      setGente(new Map((j.pessoas ?? []).map((p: Pessoa) => [p.id, p])));
      setEu(j.eu ?? null);
      setErro(null);
    } catch (e) {
      if ((e as Error)?.name === "AbortError" || minha !== cargaAtual.current) return;
      setErro(String((e as Error)?.message ?? e));
    } finally {
      if (minha === cargaAtual.current) setCarregando(false);
    }
  }, [canalId]);

  // trocou de canal: some o dado do canal anterior (declarado ANTES da carga, pra limpar e só então carregar)
  useEffect(() => {
    setAncora(null);
    setBlocos([]);
    setGente(new Map());
    setErro(null);
  }, [canalId]);
  // A carga e o cancelamento dela moram no MESMO efeito: ao trocar de canal, fechar ou chegar versão nova,
  // o cleanup invalida a carga anterior (e solta o "carregando" dela) e só então a nova começa.
  useEffect(() => {
    if (!aberta) return;
    void carregar();
    return () => { cargaAtual.current++; abortar.current?.abort(); setCarregando(false); };
  }, [aberta, carregar, versao]);
  useEffect(() => { setAncora(null); }, [aberta]);

  // foco: ao abrir vai pra bandeja (o fundo fica inerte); ao fechar volta pra quem abriu (o 🗓).
  // A volta espera um tique: nesse instante o fundo ainda está inerte e recusaria o foco.
  useEffect(() => {
    if (!aberta) return;
    const anterior = document.activeElement as HTMLElement | null;
    dialogoRef.current?.focus();
    return () => { setTimeout(() => { if (anterior && anterior.isConnected) anterior.focus(); }, 0); };
  }, [aberta]);

  // Esc: um nível por vez (1º cancela a seleção em andamento, 2º fecha) e não vaza pra outros ouvintes.
  // Tecla SEGURADA (repeat) não conta: senão um Esc longo cancelava a seleção e já fechava a agenda.
  useEffect(() => {
    if (!aberta) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      if (e.repeat) return;
      if (ancora) setAncora(null); else onFechar();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberta, ancora, onFechar]);

  // Tab preso na bandeja: o resto do painel está inerte, mas a página em volta (sidebar do lab) não.
  const prenderTab = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const raiz = dialogoRef.current;
    if (!raiz) return;
    const focaveis = [...raiz.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex='-1'])")];
    if (focaveis.length === 0) { e.preventDefault(); raiz.focus(); return; }
    const primeiro = focaveis[0]!, ultimo = focaveis[focaveis.length - 1]!;
    const ativo = document.activeElement;
    if (e.shiftKey && (ativo === primeiro || ativo === raiz)) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && (ativo === ultimo || !raiz.contains(ativo))) { e.preventDefault(); primeiro.focus(); }
  };

  const salvar = useCallback(async (b: { dia: Dia; inicio: number; fim: number }) => {
    setSalvando(true);
    try {
      const r = await fetch(`/api/canal/${canalId}/agenda`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
      const j = await r.json().catch(() => ({}));
      if (canalId !== canalNaTela.current) return;   // já estou em outro canal: nada daqui vale pra ele
      if (!r.ok) { setErro(j?.error || `Não deu pra salvar (${r.status})`); return; }
      await carregar();
    } finally {
      setSalvando(false);
    }
  }, [canalId, carregar]);

  const apagar = useCallback(async (b: BlocoComId) => {
    if (!window.confirm(`Apagar o seu horário de ${textoBloco(b)}?`)) return;
    setSalvando(true);
    try {
      const r = await fetch(`/api/canal/${canalId}/agenda?bloco=${encodeURIComponent(b.id)}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (canalId !== canalNaTela.current) return;
      if (!r.ok) { setErro(j?.error || `Não deu pra apagar (${r.status})`); return; }
      await carregar();
    } finally {
      setSalvando(false);
    }
  }, [canalId, carregar]);

  const clicar = (dia: Dia, hora: number) => {
    if (salvando) return;
    // tocar na PRÓPRIA foto (quadrado inicial do meu bloco), sem seleção em andamento = apagar
    if (!ancora && eu) {
      const meuInicial = ocupantes(blocos, dia, hora).find((o) => o.inicial && o.bloco.userId === eu);
      if (meuInicial) { void apagar(meuInicial.bloco); return; }
    }
    const r = proximoClique(ancora, { dia, hora });
    setAncora(r.ancora);
    if (r.bloco) void salvar(r.bloco);
  };

  const pessoasNaAgenda = useMemo(() => [...new Set(blocos.map((b) => b.userId))].map((id) => gente.get(id) ?? { id, nome: "Alguém", avatar: null }), [blocos, gente]);

  if (!aberta) return null;

  return (
    <div ref={dialogoRef} tabIndex={-1} role="dialog" aria-modal="true" onKeyDown={prenderTab} aria-label="Agenda do escritório" className={`absolute inset-y-0 left-0 z-40 outline-none w-full sm:w-[min(720px,94%)] flex flex-col rounded-[28px] overflow-hidden ${VIDRO_POPOVER_SOLIDO}`}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/50 dark:border-white/[0.08]">
        <span className={`text-[13px] font-bold ${TXT}`}>Agenda da semana</span>
        <span className={`text-[11px] ${TXT_MUDO} hidden sm:inline`}>repete toda semana · todos do canal veem</span>
        <button type="button" onClick={onFechar} aria-label="Fechar a agenda" className={`ml-auto ${TOQUE} rounded-2xl text-[14px] ${VIDRO_CHIP} ${TXT}`}>×</button>
      </div>

      <p className={`px-4 pt-2 text-[11.5px] ${TXT_2}`}>
        {ancora
          ? `Agora toque no horário FINAL na coluna de ${DIA_CURTO[ancora.dia]} (ou Esc pra cancelar).`
          : "Toque no horário inicial e depois no final, no mesmo dia. Toque na sua foto pra apagar."}
      </p>
      {erro && <p role="alert" className="px-4 pt-1 text-[11.5px] text-rose-600 dark:text-rose-300">{erro}</p>}

      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar px-2 sm:px-4 py-3">
        <div className="grid min-w-[560px]" style={{ gridTemplateColumns: `44px repeat(${DIAS_ORDEM.length}, minmax(0,1fr))` }}>
          <div />
          {DIAS_ORDEM.map((d) => (
            <div key={`h-${d}`} className={`pb-1 text-center text-[11px] font-bold ${ancora?.dia === d ? "text-blue-600 dark:text-cyan-300" : TXT_2}`}>{DIA_CURTO[d]}</div>
          ))}
          {HORAS.map((h) => (
            <Linha key={h} hora={h}>
              {DIAS_ORDEM.map((d) => {
                const occ = ocupantes(blocos, d, h);
                const ehAncora = ancora?.dia === d && ancora.hora === h;
                const rotulo = occ.length
                  ? `${DIA_CURTO[d]} ${h}h: ${occ.map((o) => gente.get(o.bloco.userId)?.nome ?? "Alguém").join(", ")}`
                  : `${DIA_CURTO[d]} ${h}h: livre`;
                return (
                  <button key={`${d}-${h}`} type="button" onClick={() => clicar(d, h)} disabled={salvando || carregando}
                    title={rotulo} aria-label={rotulo}
                    className={`relative h-8 m-[1px] rounded-md overflow-hidden flex border transition-colors disabled:cursor-wait
                      ${ehAncora ? "border-blue-500 ring-2 ring-blue-400/70 dark:border-cyan-300 dark:ring-cyan-300/60" : "border-slate-300/40 dark:border-white/[0.08] hover:border-blue-400/60"}
                      bg-white/40 dark:bg-white/[0.02]`}>
                    {occ.map((o) => (
                      <span key={o.bloco.id} className="flex-1 h-full flex items-center justify-center" style={{ background: `${corDaPessoa(o.bloco.userId)}55` }}>
                        {o.inicial && (
                          <AgentAvatar src={gente.get(o.bloco.userId)?.avatar ?? null} nome={gente.get(o.bloco.userId)?.nome ?? "Alguém"} size={20}
                            className="ring-2" />
                        )}
                      </span>
                    ))}
                  </button>
                );
              })}
            </Linha>
          ))}
        </div>
      </div>

      {pessoasNaAgenda.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 py-2.5 border-t border-white/50 dark:border-white/[0.08]">
          {pessoasNaAgenda.map((p) => (
            <span key={p.id} className={`inline-flex items-center gap-1.5 text-[11.5px] ${TXT_2}`}>
              <span className="w-3 h-3 rounded-full" style={{ background: corDaPessoa(p.id) }} aria-hidden />
              {p.id === eu ? `${p.nome} (você)` : p.nome}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Uma linha da grade: a hora à esquerda e os quadrados dos dias. */
function Linha({ hora, children }: { hora: number; children: React.ReactNode }) {
  return (
    <>
      <div className={`h-8 m-[1px] pr-1.5 flex items-center justify-end text-[10.5px] tabular-nums ${TXT_MUDO}`}>{hora}h</div>
      {children}
    </>
  );
}
