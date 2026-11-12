"use client";
/**
 * AtlasDoCorpo — a tela do atlas de anatomia. Porte de `app/page.tsx` do human-atlas
 * (MIT — procedência completa em lib/anatomia/atlas.ts).
 *
 * As FEATURES são 1:1 com as deles: painel de sistemas com liga/desliga, solo e três presets;
 * busca com atalho "/"; quatro vistas; rotação automática; cursor de explosão 0–100; legenda da
 * cena; painel de detalhe com isolar e lista de peças; painel de fonte e licença; progresso de
 * carregamento; estado de erro.
 *
 * ──────────── TRÊS DIFERENÇAS DELIBERADAS, todas declaradas ────────────
 *
 * 1 · O VOCABULÁRIO DE ESTILO É O NOSSO. Eles trazem 26 KB de CSS próprio (`.glass`, `.layers-panel`,
 *     `.bottom-dock`…); esta casa usa Tailwind. Portar o CSS deles criaria um segundo sistema de
 *     estilo dentro do projeto para manter em paralelo para sempre. As duas exceções são as classes
 *     que a CENA cria ou procura no DOM — `anatomia-dica`, `anatomia-folha`, `anatomia-identidade` —
 *     e essas existem porque `cena.ts` depende delas, não por estética.
 *
 * 2 · A BUSCA É A NOSSA. `buscarConceitos` aceita português ("coração", "fígado") e põe o casamento
 *     exato primeiro; o original faz `includes` cru na ordem do arquivo. Mesma razão da etapa 1:
 *     um aluno brasileiro que digita "fígado" não pode receber "não achei".
 *
 * 3 · ABRE COM AVISO, NÃO COM O CORPO. A primeira coisa na tela diz que isto é material educacional
 *     e não ferramenta clínica, com a fonte. O original põe isso atrás de um botão "Source &
 *     credits". Num produto que também dá mentor de medicina, o aviso vem antes do uso.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Activity, ArrowUpRight, ChevronRight, Crosshair, Info, Layers, Pause,
  RotateCcw, RotateCw, Search, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { temWebGL } from "@/lib/ui/globo";
import {
  EXPLICACOES, SISTEMAS, explicacao,
  type Atlas, type Conceito, type Parte, type SistemaId, type Vista,
} from "@/lib/anatomia/atlas";
import { buscarConceitos } from "@/lib/anatomia/busca";
import {
  ESTADO_INICIAL, PRESET_ESQUELETO, PRESET_ORGAOS, alternarIsolar, alternarRotacao, alternarSistema,
  contarVisiveis, definirExplosao, definirSistemas, definirVista, dicaDeArraste, escolherConceito,
  escolherPeca, esconderTodos, legenda, limparSelecao, presetAtivo, reiniciar, soSistema,
} from "@/lib/anatomia/estado";
import { aberturaDoAtlas, verificarIsolamento } from "@/lib/anatomia/isolamento";

const CenaDoCorpo = dynamic(() => import("./CenaDoCorpo"), { ssr: false });

/** O que a busca sugere com o campo vazio. Os oito do original — todos existem no dado. */
const SUGESTOES = ["heart", "brain", "liver", "stomach", "spleen", "pancreas", "urinary bladder", "trachea"];

const VISTAS: { id: Vista; rotulo: string; titulo: string }[] = [
  { id: "three-quarter", rotulo: "¾", titulo: "Vista de três quartos" },
  { id: "front", rotulo: "F", titulo: "Vista de frente" },
  { id: "side", rotulo: "L", titulo: "Vista de lado" },
  { id: "back", rotulo: "C", titulo: "Vista de costas" },
];

const LIMITE_DA_BUSCA = 80;
/** Quantas peças o painel de detalhe lista antes de resumir. Valor do original. */
const LIMITE_DA_LISTA = 50;

/**
 * PURA: o estado com que a página abre quando chega com uma estrutura pedida. Isolada, ou erro.
 * Exportada para o teste: é a regra, e a regra não deve depender de WebGL para ser conferida.
 */
export function estadoDaEstruturaPedida(
  atlas: Atlas, id: string,
): { ok: true; conceito: Conceito; estado: typeof ESTADO_INICIAL } | { ok: false; motivo: string } {
  const conceito = atlas.concepts.find((c) => c.id.toLowerCase() === id.toLowerCase());
  if (!conceito) return { ok: false, motivo: `o atlas não tem a estrutura "${id.slice(0, 40)}" — nada foi aberto no lugar dela` };
  const estado = { ...escolherConceito(ESTADO_INICIAL, conceito), isolate: true };
  const v = verificarIsolamento(atlas, estado, conceito.elements);
  if (!v.ok) return { ok: false, motivo: `não abri "${conceito.name}": ${v.motivo}` };
  return { ok: true, conceito, estado };
}

export default function AtlasDoCorpo() {
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  // NASCE VAZIA: o corpo inteiro só entra quando a pessoa pede (dono, 2026-11-12). Antes o estado
  // inicial eram as 2.229 peças, para qualquer um que abrisse a página.
  const [estado, setEstado] = useState(() => esconderTodos(ESTADO_INICIAL));
  /** `true` enquanto a pessoa ainda não disse o que quer ver — é o que mostra a pergunta. */
  const [escolhendo, setEscolhendo] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [erro, setErro] = useState("");
  const [painel, setPainel] = useState<"sistemas" | "busca" | null>(null);
  const [detalhe, setDetalhe] = useState(false);
  const [sobre, setSobre] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [escolhido, setEscolhido] = useState<Conceito | null>(null);
  const [webgl, setWebgl] = useState(true);
  const campoDeBusca = useRef<HTMLInputElement>(null);

  useEffect(() => { setWebgl(temWebGL()); }, []);

  // o manifesto é estático e cacheável; a geometria vem depois, pedaço por pedaço, dentro da cena
  useEffect(() => {
    const aborto = new AbortController();
    fetch("/models/atlas.json", { signal: aborto.signal })
      .then((r) => { if (!r.ok) throw new Error(`o catálogo da anatomia não pôde ser carregado (HTTP ${r.status})`); return r.json(); })
      .then((d) => setAtlas(d as Atlas))
      .catch((e: Error) => { if (e.name !== "AbortError") setErro(e.message); });
    return () => aborto.abort();
  }, []);

  // "/" abre a busca, como no original
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target;
      if (e.key !== "/" || alvo instanceof HTMLInputElement || alvo instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      setPainel("busca");
      setDetalhe(false);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  useEffect(() => { if (painel === "busca") campoDeBusca.current?.focus(); }, [painel]);

  /**
   * ABRIR NA ESTRUTURA (`/anatomia?estrutura=FMA7088`). É por aqui que o cartão do chat chega, e o
   * que ele pediu é UMA estrutura: então a página nasce com ela escolhida e ISOLADA, não com o corpo
   * inteiro. O caminho de volta existe e é do aluno ("Mostrar a anatomia ao redor").
   * Id que o atlas não tem é ERRO dito na tela — cair calado no corpo inteiro seria justamente o
   * carregamento não isolado que o dono mandou tratar como erro. Roda uma vez, quando o atlas chega.
   */
  const abriuNaEstrutura = useRef(false);
  const [erroDeEstrutura, setErroDeEstrutura] = useState("");
  useEffect(() => {
    if (!atlas || abriuNaEstrutura.current) return;
    abriuNaEstrutura.current = true;
    const abertura = aberturaDoAtlas(window.location.search);
    // pediu o corpo inteiro com todas as letras → é o que abre. Sem pedido nenhum → a pergunta.
    if (abertura.modo === "corpo") { setEstado(ESTADO_INICIAL); return; }
    if (abertura.modo === "escolha") { setEscolhendo(true); return; }
    const r = estadoDaEstruturaPedida(atlas, abertura.id);
    if (!r.ok) {
      // NADA na tela no lugar: `esconderTodos` em vez do estado inicial, que desenharia as 2.229
      // peças — medido no navegador, era o que acontecia com um id inexistente. O aviso é próprio
      // (não o `erro` da cena, que a carga da geometria sobrescreve).
      setEstado(esconderTodos(ESTADO_INICIAL));
      setErroDeEstrutura(r.motivo);
      return;
    }
    setEscolhido(r.conceito);
    setEstado(r.estado);
    setDetalhe(true);
  }, [atlas]);

  const pecasPorId = useMemo(() => new Map((atlas?.parts ?? []).map((p) => [p.id, p])), [atlas]);
  const conceitosPorId = useMemo(() => new Map((atlas?.concepts ?? []).map((c) => [c.id, c])), [atlas]);
  const contagens = useMemo(() => {
    const m = new Map<SistemaId, number>(SISTEMAS.map((s) => [s.id, 0]));
    for (const p of atlas?.parts ?? []) m.set(p.system, (m.get(p.system) ?? 0) + 1);
    return m;
  }, [atlas]);
  const sistemasAtivos = useMemo(() => SISTEMAS.filter((s) => (contagens.get(s.id) ?? 0) > 0), [contagens]);

  const pecasSelecionadas = useMemo(
    () => estado.selected.map((id) => pecasPorId.get(id)).filter((p): p is Parte => !!p),
    [estado.selected, pecasPorId],
  );
  const primeira = pecasSelecionadas[0];
  const sistemaDoDetalhe = SISTEMAS.find((s) => s.id === primeira?.system);
  const visiveis = atlas ? contarVisiveis(atlas.parts, estado) : 0;

  /** A busca é a NOSSA (aceita português, exato primeiro) — ver diferença 2 no cabeçalho. */
  const resultados = useMemo<Conceito[]>(() => {
    if (!atlas) return [];
    const termo = consulta.trim();
    if (!termo) return SUGESTOES.map((n) => atlas.concepts.find((c) => c.name.toLowerCase() === n)).filter((c): c is Conceito => !!c);
    return buscarConceitos(atlas, termo, LIMITE_DA_BUSCA).achados
      .map((a) => conceitosPorId.get(a.id))
      .filter((c): c is Conceito => !!c);
  }, [atlas, consulta, conceitosPorId]);

  const escolher = useCallback((c: Conceito) => {
    setEscolhendo(false);
    setEscolhido(c);
    setEstado((s) => escolherConceito(s, c));
    setDetalhe(true);
    setPainel(null);
  }, []);

  const escolherPecaDaCena = useCallback((id: string) => {
    const p = pecasPorId.get(id);
    if (!p) return;
    setEscolhido({ id: p.conceptId, name: p.name, elements: [id] });
    setEstado((s) => escolherPeca(s, id));
    setDetalhe(true);
    setPainel(null);
  }, [pecasPorId]);

  const reinicio = () => { setEstado(reiniciar); setEscolhido(null); setDetalhe(false); setPainel(null); };
  const abrirPainel = (q: "sistemas" | "busca") => { setDetalhe(false); setPainel((p) => (p === q ? null : q)); };

  if (!webgl) {
    return (
      <Centrado>
        <p className="text-lg font-medium">O atlas 3D precisa de WebGL.</p>
        <p className="mt-2 text-sm text-slate-600">
          Este navegador ou aparelho não o oferece. A <b>busca</b> por estruturas continua funcionando no chat com o
          mentor de medicina, que consulta o mesmo atlas.
        </p>
      </Centrado>
    );
  }

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-[#f2f3f3] text-slate-900">
      {atlas && (
        <CenaDoCorpo
          atlas={atlas}
          estado={{ ...estado, inspectorOpen: detalhe && pecasSelecionadas.length > 0 }}
          aoSelecionar={escolherPecaDaCena}
          aoProgredir={(n) => { setProgresso(n); if (n === 100) setErro(""); }}
          aoErrar={setErro}
        />
      )}

      {/* ── identidade. A classe é procurada por cena.ts no enquadramento do celular ── */}
      <header className="anatomia-identidade pointer-events-none absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Anatomia interativa
        </div>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Atlas do Corpo
          <span className="rounded border border-slate-300 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-slate-500">3D</span>
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          {(atlas?.parts.length ?? 2234).toLocaleString("pt-BR")} peças modeladas <span className="mx-1">·</span> BodyParts3D
        </p>
      </header>

      {/* ── ações de topo ── */}
      <nav aria-label="Painéis do explorador" className="absolute right-4 top-4 z-20 flex items-center gap-2 sm:right-6 sm:top-6">
        <button
          type="button"
          onClick={() => abrirPainel("busca")}
          className={cn(botao, painel === "busca" && ativo, "gap-2")}
        >
          <Search size={16} aria-hidden />
          <span className="hidden sm:inline">Encontrar estrutura</span>
          <kbd className="hidden rounded border border-slate-300 px-1 text-[10px] text-slate-500 sm:inline">/</kbd>
        </button>
        <button type="button" aria-label="Sobre este atlas" title="Sobre este atlas"
          onClick={() => { setDetalhe(false); setPainel(null); setSobre(true); }} className={cn(botao, "px-2")}>
          <Info size={16} aria-hidden />
        </button>
      </nav>

      {/* ── painel de sistemas ── */}
      <section
        aria-label="Camadas anatômicas"
        className={cn(
          vidro,
          "absolute z-30 flex flex-col",
          "inset-x-4 bottom-32 max-h-[52vh] sm:inset-x-auto sm:bottom-auto sm:left-6 sm:top-36 sm:max-h-[min(60vh,560px)] sm:w-64",
          painel === "sistemas" ? "flex" : "hidden sm:flex",
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200/70 px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sistemas</span>
          <button type="button" onClick={() => setPainel(null)} aria-label="Fechar sistemas" className={cn(botao, "px-1.5 py-1 sm:hidden")}>
            <X size={15} aria-hidden />
          </button>
          <span className="hidden rounded bg-slate-200/70 px-1.5 text-[11px] font-semibold text-slate-600 sm:inline">{sistemasAtivos.length}</span>
        </div>

        <div className="flex gap-1 border-b border-slate-200/70 px-2 py-2">
          <Preset ativo={presetAtivo(estado, sistemasAtivos.map((s) => s.id))}
            onClick={() => setEstado((s) => definirSistemas(s, sistemasAtivos.map((x) => x.id)))}>Todos</Preset>
          <Preset ativo={presetAtivo(estado, PRESET_ESQUELETO)}
            onClick={() => setEstado((s) => definirSistemas(s, PRESET_ESQUELETO))}>Esqueleto</Preset>
          <Preset ativo={presetAtivo(estado, PRESET_ORGAOS)}
            onClick={() => setEstado((s) => definirSistemas(s, PRESET_ORGAOS))}>Órgãos</Preset>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
          {sistemasAtivos.map((s) => {
            const ligado = estado.visible.includes(s.id);
            return (
              <div key={s.id} className={cn("flex items-center gap-1 rounded px-2 py-1", ligado ? "text-slate-900" : "text-slate-400")}>
                <button
                  type="button"
                  title={`Mostrar só ${s.nome.toLowerCase()}`}
                  onClick={() => setEstado((v) => soSistema(v, s.id))}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm hover:underline"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.cor }} />
                  <span className="truncate">{s.nome}</span>
                  <span className="ml-auto shrink-0 text-[11px] tabular-nums text-slate-400">{contagens.get(s.id)}</span>
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={ligado}
                  aria-label={`Mostrar ${s.nome.toLowerCase()}`}
                  onClick={() => { setDetalhe(false); setEstado((v) => alternarSistema(v, s.id)); }}
                  className={cn("relative h-4 w-7 shrink-0 rounded-full transition-colors", ligado ? "bg-emerald-500" : "bg-slate-300")}
                >
                  <span className={cn("absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all", ligado ? "left-3.5" : "left-0.5")} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200/70 px-3 py-2 text-[11px] text-slate-500">
          <span className="tabular-nums">{visiveis.toLocaleString("pt-BR")} peças visíveis</span>
          <button type="button" onClick={() => setEstado(esconderTodos)} className="hover:underline">Esconder tudo</button>
        </div>
      </section>

      {/* ── busca ── */}
      {painel === "busca" && (
        <section aria-label="Encontrar anatomia" className={cn(vidro, "absolute inset-x-4 top-20 z-40 flex max-h-[70vh] flex-col sm:inset-x-auto sm:right-6 sm:top-24 sm:w-80")}>
          <div className="flex items-center justify-between border-b border-slate-200/70 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Encontrar estrutura</span>
            <button type="button" onClick={() => setPainel(null)} aria-label="Fechar busca" className={cn(botao, "px-1.5 py-1")}>
              <X size={15} aria-hidden />
            </button>
          </div>
          <input
            ref={campoDeBusca}
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="Coração, fêmur, nervo craniano…"
            aria-label="Buscar estruturas anatômicas nomeadas"
            className="border-b border-slate-200/70 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-slate-400"
          />
          <ul className="min-h-0 flex-1 overflow-y-auto py-1">
            {resultados.length === 0 && <li className="px-3 py-3 text-sm text-slate-500">Nenhuma estrutura corresponde à busca.</li>}
            {resultados.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => escolher(c)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-900/5">
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
                    {c.elements.length} {c.elements.length === 1 ? "peça" : "peças"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="border-t border-slate-200/70 px-3 py-2 text-[11px] leading-snug text-slate-500">
            {consulta
              ? `Até ${LIMITE_DA_BUSCA} resultados. Refine a busca para achar estruturas menores.`
              : "Aceita português nos termos comuns. Comece por um órgão, ou busque qualquer estrutura nomeada."}
          </p>
        </section>
      )}

      {/* ── controles de câmera ── */}
      <nav aria-label="Controles de câmera" className={cn(vidro, "absolute right-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1 p-1 sm:right-6")}>
        {VISTAS.map((v) => (
          <button
            key={v.id}
            type="button"
            title={v.titulo}
            aria-label={v.titulo}
            aria-pressed={estado.view === v.id}
            disabled={estado.explode > 0.8 && v.id !== "front"}
            onClick={() => setEstado((s) => definirVista(s, v.id))}
            className={cn(botao, "h-8 w-8 justify-center p-0 text-xs font-semibold", estado.view === v.id && ativo)}
          >
            {v.rotulo}
          </button>
        ))}
        <i className="my-0.5 h-px bg-slate-300" />
        <button
          type="button"
          disabled={estado.explode >= 0.4}
          aria-label={estado.rotate ? "Pausar rotação" : "Girar o corpo"}
          title="Rotação automática"
          onClick={() => setEstado(alternarRotacao)}
          className={cn(botao, "h-8 w-8 justify-center p-0", estado.rotate && ativo)}
        >
          {estado.rotate ? <Pause size={15} aria-hidden /> : <RotateCw size={15} aria-hidden />}
        </button>
        <button type="button" aria-label="Reiniciar vista e camadas" title="Reiniciar" onClick={reinicio}
          className={cn(botao, "h-8 w-8 justify-center p-0")}>
          <RotateCcw size={15} aria-hidden />
        </button>
      </nav>

      {/* ── legenda ── */}
      <div className="pointer-events-none absolute bottom-28 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        <span className="h-px w-8 bg-slate-300" />
        <span className="whitespace-nowrap">{legenda(estado, escolhido?.name)}</span>
        <span className="h-px w-8 bg-slate-300" />
      </div>

      {/* ── doca inferior: explosão ── */}
      <div className={cn(vidro, "absolute inset-x-4 bottom-4 z-20 flex items-center gap-3 px-3 py-2.5 sm:left-1/2 sm:right-auto sm:w-[min(560px,calc(100vw-3rem))] sm:-translate-x-1/2")}>
        <button type="button" onClick={() => abrirPainel("sistemas")} aria-label="Abrir camadas de sistemas"
          className={cn(botao, "shrink-0 flex-col gap-0 px-2 py-1 sm:hidden")}>
          <Layers size={17} aria-hidden />
          <span className="text-[9px]">Sistemas</span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between">
            <label htmlFor="anatomia-explosao" className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Separar anatomia
            </label>
            <output htmlFor="anatomia-explosao" className="text-xs font-semibold tabular-nums text-slate-600">
              {Math.round(estado.explode * 100)}<span className="text-slate-400">%</span>
            </output>
          </div>
          <input
            id="anatomia-explosao"
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(estado.explode * 100)}
            onChange={(e) => setEstado((s) => definirExplosao(s, Number(e.target.value) / 100))}
            className="mt-1.5 w-full accent-emerald-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Montado</span><span>Peça por peça</span>
          </div>
        </div>
        <button type="button" onClick={reinicio} aria-label="Montar e reiniciar" className={cn(botao, "shrink-0 gap-1.5")}>
          <RotateCcw size={15} aria-hidden /><span className="hidden sm:inline">Reiniciar</span>
        </button>
      </div>

      {/* ── rodapé ── */}
      <footer className="pointer-events-none absolute bottom-1 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-2 text-[10px] text-slate-400 sm:flex">
        <span>{dicaDeArraste(estado)} <b>·</b> Pinça ou roda para aproximar <b>·</b> Toque para inspecionar</span>
      </footer>

      {/* ── progresso e erro ── */}
      {atlas && progresso < 100 && !erro && (
        <div className={cn(vidro, "absolute bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 px-4 py-3 sm:bottom-28")} role="status">
          <Activity size={17} className="shrink-0 text-emerald-600" aria-hidden />
          <div className="min-w-0">
            <strong className="block text-sm">Preparando a anatomia</strong>
            <span className="text-[11px] text-slate-500">
              {progresso}% <span className="mx-0.5">·</span> carregando {(atlas.parts.length).toLocaleString("pt-BR")} peças
            </span>
            <div className="mt-1 h-1 w-44 overflow-hidden rounded bg-slate-200">
              <i className="block h-full bg-emerald-500 transition-[width]" style={{ width: `${progresso}%` }} />
            </div>
          </div>
        </div>
      )}
      {escolhendo && !erroDeEstrutura && (
        <div data-escolha-do-atlas className={cn(vidro, "absolute left-1/2 top-1/2 z-40 flex w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 px-5 py-4")} role="dialog" aria-label="O que você quer ver?">
          <p className="text-base font-semibold text-slate-800">O que você quer ver?</p>
          <p className="text-sm text-slate-600">O atlas abre só o que você pedir. Busque uma estrutura pelo nome (em português mesmo), ou abra o corpo inteiro para explorar.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={cn(botao, "shrink-0")}
              onClick={() => { setEscolhendo(false); setPainel("busca"); setDetalhe(false); }}>
              Buscar uma estrutura
            </button>
            <button type="button" className={cn(botao, "shrink-0")}
              onClick={() => { setEscolhendo(false); setEstado(ESTADO_INICIAL); }}>
              Ver o corpo inteiro
            </button>
          </div>
        </div>
      )}
      {erroDeEstrutura && (
        <div data-erro-de-estrutura className={cn(vidro, "absolute left-1/2 top-24 z-40 flex -translate-x-1/2 items-center gap-3 px-4 py-3")} role="alert">
          <p className="max-w-sm text-sm text-rose-700">{erroDeEstrutura}. Use a busca para escolher uma estrutura.</p>
          <button type="button" onClick={() => { setErroDeEstrutura(""); setPainel("busca"); }} className={cn(botao, "shrink-0")}>Buscar</button>
        </div>
      )}
      {erro && (
        <div className={cn(vidro, "absolute bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 px-4 py-3 sm:bottom-28")} role="alert">
          <p className="max-w-xs text-sm text-rose-700">{erro}</p>
          <button type="button" onClick={() => location.reload()} className={cn(botao, "shrink-0")}>Recarregar</button>
        </div>
      )}

      {/* ── painel de detalhe. A classe é procurada por cena.ts no celular ── */}
      {detalhe && pecasSelecionadas.length > 0 && (
        <aside
          aria-label="Estrutura selecionada"
          className={cn(
            vidro, "anatomia-folha absolute z-40 flex flex-col",
            "inset-x-4 bottom-4 max-h-[58vh] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-24 sm:max-h-none sm:w-80",
          )}
        >
          <div className="relative border-b border-slate-200/70 px-4 py-3">
            <span className="absolute left-0 top-0 h-full w-1" style={{ background: sistemaDoDetalhe?.cor }} />
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {sistemaDoDetalhe?.nome ?? "Anatomia"}
                </div>
                <h2 className="mt-0.5 text-lg font-semibold leading-tight">{escolhido?.name}</h2>
              </div>
              <button type="button" onClick={() => setDetalhe(false)} aria-label="Fechar detalhe" className={cn(botao, "shrink-0 px-1.5 py-1")}>
                <X size={15} aria-hidden />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm">
            <p className="leading-relaxed text-slate-700">
              {escolhido && primeira ? explicacao(escolhido.name, primeira.system) : ""}
            </p>
            {escolhido && !EXPLICACOES[escolhido.name.toLowerCase()] && (
              <p className="mt-2 text-[11px] italic text-slate-500">
                Descrição do SISTEMA — esta estrutura não tem texto próprio revisado. Identificada a partir da anatomia de origem.
              </p>
            )}
            <dl className="mt-3 grid grid-cols-2 gap-2 border-y border-slate-200/70 py-2 text-[11px] text-slate-500">
              <div><dt>Referência no atlas</dt><dd className="font-semibold tabular-nums text-slate-800">{escolhido?.id}</dd></div>
              <div><dt>Peças selecionadas</dt><dd className="font-semibold tabular-nums text-slate-800">{estado.selected.length.toLocaleString("pt-BR")}</dd></div>
            </dl>
            {pecasSelecionadas.length > 1 && (
              <div className="mt-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Estruturas incluídas</h3>
                <ul className="mt-1">
                  {pecasSelecionadas.slice(0, LIMITE_DA_LISTA).map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => escolherPecaDaCena(p.id)}
                        className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-[13px] hover:bg-slate-900/5">
                        <span className="min-w-0 flex-1 truncate">{p.name}</span>
                        <ChevronRight size={13} className="shrink-0 text-slate-400" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
                {pecasSelecionadas.length > LIMITE_DA_LISTA && (
                  <p className="mt-1 text-[11px] text-slate-500">E outras {pecasSelecionadas.length - LIMITE_DA_LISTA} peças modeladas.</p>
                )}
              </div>
            )}
            <a href="https://lifesciencedb.jp/bp3d/" target="_blank" rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-[11px] text-slate-500 underline">
              Ver a fonte anatômica <ArrowUpRight size={12} aria-hidden />
            </a>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-slate-200/70 p-3">
            <button type="button" onClick={() => setEstado(alternarIsolar)}
              className={cn("flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                estado.isolate ? "bg-slate-900 text-white" : "bg-emerald-600 text-white hover:bg-emerald-700")}>
              <Crosshair size={16} aria-hidden />
              {estado.isolate ? "Mostrar a anatomia ao redor" : "Isolar estrutura"}
            </button>
            <button type="button" onClick={() => { setEstado(limparSelecao); setDetalhe(false); }}
              className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-900/5">
              Limpar seleção
            </button>
          </div>
        </aside>
      )}

      {/* ── fonte, escopo e licença. Diferença 3: também aparece de saída, não só atrás deste botão ── */}
      {sobre && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-slate-900/20 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Fonte e escopo">
          <div className={cn(vidro, "max-h-[80vh] w-full max-w-md overflow-y-auto p-5")}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Fonte e escopo</div>
                <h2 className="mt-0.5 text-xl font-semibold">Um corpo, por dentro.</h2>
              </div>
              <button type="button" onClick={() => setSobre(false)} aria-label="Fechar" className={cn(botao, "shrink-0 px-1.5 py-1")}>
                <X size={15} aria-hidden />
              </button>
            </div>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
              <p><strong>Adulto masculino · BodyParts3D.</strong> {(atlas?.parts.length ?? 2234).toLocaleString("pt-BR")} malhas
                individuais e {(atlas?.concepts.length ?? 3432).toLocaleString("pt-BR")} conceitos nomeados de uma referência de adulto masculino.</p>
              <p>Esta referência <strong>não</strong> contém toda estrutura ou variação humana. Um conceito nomeado pode
                agrupar várias peças, e cada malha de origem é desenhada uma vez.</p>
              <p className="rounded-lg bg-amber-50 p-3 text-[13px] text-amber-900">
                As cores e os agrupamentos por sistema servem à exploração. A geometria foi simplificada para a web e as
                explicações dão contexto geral. <strong>É material educacional — não é ferramenta diagnóstica nem cirúrgica.</strong>
              </p>
              <h3 className="pt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Fonte</h3>
              <p>BodyParts3D, © The Database Center for Life Science, sob licença Creative Commons Attribution 4.0 International.</p>
              <div className="flex flex-col gap-1 text-[12px]">
                <Link href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html">Licença do conjunto de dados</Link>
                <Link href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html">Geometria e metadados originais</Link>
                <Link href="https://academic.oup.com/nar/article/37/suppl_1/D782/1000752">Publicação de origem (Mitsuhashi et al., 2009)</Link>
                <Link href="https://github.com/ashemag/human-atlas">Visualizador de origem (MIT)</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ─────────────────────────── peças de UI locais ───────────────────────────

const vidro = "rounded-xl border border-white/60 bg-white/80 shadow-lg shadow-slate-900/5 backdrop-blur-md";
const botao = "inline-flex items-center rounded-lg border border-slate-200/80 bg-white/70 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40";
const ativo = "border-slate-900/20 bg-slate-900 text-white hover:bg-slate-900";

function Preset({ ativo: on, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cn("flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
        on ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-900/5")}>
      {children}
    </button>
  );
}

function Link({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-slate-600 underline hover:text-slate-900">
      {children} <ArrowUpRight size={12} aria-hidden />
    </a>
  );
}

function Centrado({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex h-[100dvh] w-full items-center justify-center bg-[#f2f3f3] p-8 text-center text-slate-900">
      <div className="max-w-sm">{children}</div>
    </main>
  );
}
