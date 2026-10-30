"use client";
/**
 * OctaIDE — a IDE PRÓPRIA do Octa Code (não é a sala Projetos). Layout no estilo do Zed:
 *   explorador de arquivos · abas + editor (Monaco, tema escuro tipo Zed One) / prévia da página / galeria de estilos ·
 *   saída · JANELA DO AGENTE ao lado.
 *
 * Dois modos:
 *   - PROJETO (o padrão): o projeto mora no servidor (/api/octa/projetos; o localStorage é só cache). Cada pedido vira
 *     um TURNO (/api/octa/turnos) e a janela do agente mostra cada passo ao vivo (polling de 1 s nos eventos), o
 *     cartão de aprovação quando o nível de permissão pede, e o resultado. Galeria de estilos (DESIGN.md), Conectar
 *     GitHub e Publicar (repositório público na conta do aluno + GitHub Pages).
 *   - RASCUNHO no navegador: o modo antigo (localStorage + /api/octa/agente síncrono, Revisar/Alterar).
 * Tokens/segredos nunca passam por aqui: o GitHub é conectado por OAuth no servidor e as rotas nunca devolvem token.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Play, Plus, X, FileText, Folder, FolderOpen, Trash2, Undo2, Send, Loader2, ShieldCheck, Pencil, ChevronRight, ChevronDown, Square,
  Github, Rocket, Globe, ExternalLink, Code, Eye, Palette, ChevronsUpDown, Check, LogOut, FolderPlus, HardDrive, Microscope,
} from "lucide-react";
import OctaIcon from "./OctaIcon";
import { useCodeRunner, type RunOutput } from "@/app/agentic-modules/codelab/useCodeRunner";
import {
  arvore, aplicarEdicoes, fecharAba, abrir, caminhoValido, linguagem, carregar, salvar, ehSvg, esquecerVerCodigo,
  estadoDoProjeto, montarPrevia, carregarCacheProjeto, salvarCacheProjeto, estiloDoDesignMd,
  type EstadoIDE, type NoArvore,
} from "@/lib/octa/ideWorkspace";
import { textoErroPublicar, type EventoTurno } from "@/lib/octa/passos";
import type { PermissaoOcta } from "@/lib/octa/projetos";
import PreviaSvg from "./PreviaSvg";
import CorrigirComOcta from "./CorrigirComOcta";
import GaleriaDesign from "./GaleriaDesign";
import { PassosTurno, CartaoAprovacao } from "./PassosTurno";
import { useTurnoOcta, type EstadoTurno, type StatusTurno } from "./useTurnoOcta";
import { tipoProjeto } from "@/lib/octa/tipoProjeto";
import ReaProofPanel from "./ReaProofPanel";

const Monaco = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => <div className="grid place-items-center h-full text-[12px] text-[#7f848e]"><Loader2 className="w-4 h-4 animate-spin" /></div>,
});

// app React: o Sandpack só existe no navegador (iframe do bundler hospedado), nunca no servidor
const PreviaReact = dynamic(() => import("./PreviaReact"), {
  ssr: false,
  loading: () => <div className="grid place-items-center h-full text-[12px] text-[#7f848e]"><Loader2 className="w-4 h-4 animate-spin" /></div>,
});

// paleta "One Dark" do Zed (só cores — nenhum código do Zed)
const Z = { bg: "#282c33", painel: "#2f343e", borda: "#363c46", texto: "#dce0e5", fraco: "#a9afbc", apagado: "#878a98", acento: "#74ade8", ok: "#a1c181", erro: "#d07277", aviso: "#dec184", sel: "#3b414d" };

/** Texto EXATO do aviso antes da 1ª publicação (regra da spec). */
export const AVISO_PUBLICO = "seu código e sua página ficarão públicos no seu GitHub";

type Msg = {
  id: string; role: "user" | "assistant"; content: string;
  edicoes?: string[]; apagados?: string[]; negados?: { tool: string; motivo: string }[];
  pedeApagar?: boolean; sinais?: { kind: string; detail: string }[]; modelo?: string; erro?: boolean; desfazer?: EstadoIDE;
  /** Modo projeto: os eventos do turno (os passos ao vivo, congelados quando o turno acaba). */
  turno?: { eventos: EventoTurno[]; status: StatusTurno };
};
type ProjetoMeta = {
  id: string; nome: string; designId: string | null; permissao: PermissaoOcta; avisoPublicoAceito: boolean;
  repoFullName: string | null; pagesUrl: string | null;
};
type Vista = "codigo" | "previa" | "estilos";
type Github = { conectado: boolean; login: string | null; configurado: boolean };
type Publicacao =
  | { fase: "ocioso" } | { fase: "aviso" } | { fase: "publicando" }
  | { fase: "ok"; repoUrl: string; pagesUrl: string; status: "publicando" | "no_ar"; ignorados: string[] }
  | { fase: "erro"; erro: string; palavra?: string };

const uid = () => Math.random().toString(36).slice(2, 10);
const CHAVE_CHAT = "zaeon.octa.chat.v1";
const CHAVE_ULTIMO = "zaeon.octa.projeto.ultimo";
const chaveChatProjeto = (id: string) => `zaeon.octa.chat.${id}`;
const chaveTurno = (id: string) => `zaeon.octa.turno.${id}`;
const lerLS = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const gravarLS = (k: string, v: string | null) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* */ } };
const linkSeguro = (u: unknown): string | null => (typeof u === "string" && /^https:\/\//i.test(u) ? u : null);

const meta = (p: any): ProjetoMeta => ({
  id: String(p.id), nome: String(p.nome ?? "Meu site"), designId: p.designId ?? null, permissao: p.permissao ?? "auto",
  avisoPublicoAceito: !!p.avisoPublicoAceito, repoFullName: p.repoFullName ?? null, pagesUrl: p.pagesUrl ?? null,
});

const MOTIVO: Record<string, string> = {
  MODE_FORBIDS_MUTATION: "modo Revisar não edita",
  OUTSIDE_FILE_LOCK: "fora dos arquivos liberados",
  needs_approval: "precisa da sua aprovação",
  PATH_NOT_ALLOWED: "caminho inválido",
  MUTATION_WITHOUT_PATH: "escrita sem arquivo",
};
const ATALHOS: { rotulo: string; texto: string; modo: "review" | "change" }[] = [
  { rotulo: "Revisar arquivo", texto: "Revise o arquivo aberto e aponte os problemas com linha e trecho.", modo: "review" },
  { rotulo: "Explicar", texto: "Explique o que o arquivo aberto faz, passo a passo.", modo: "review" },
  { rotulo: "Corrigir bugs", texto: "Encontre e corrija os bugs do arquivo aberto.", modo: "change" },
  { rotulo: "Gerar testes", texto: "Crie testes para o arquivo aberto num arquivo novo.", modo: "change" },
  { rotulo: "Arte generativa", texto: "Gere uma arte generativa com o tema do projeto.", modo: "change" },
];
/** Modo projeto: `enviar:false` só preenche a caixa pro aluno completar. */
const ATALHOS_LANDING: { rotulo: string; texto: string; enviar: boolean }[] = [
  { rotulo: "Montar a landing", texto: "Uma landing page para ", enviar: false },
  { rotulo: "Trocar o estilo", texto: "Troque o estilo da página por um mais ", enviar: false },
  { rotulo: "Melhorar os textos", texto: "Melhore os textos da página: mais claros, curtos e convidativos.", enviar: true },
  { rotulo: "Deixar responsiva", texto: "Revise a página no celular e ajuste o que ficar ruim em telas pequenas.", enviar: true },
];
const PERMISSOES: { v: PermissaoOcta; rotulo: string; dica: string }[] = [
  { v: "auto", rotulo: "Automático", dica: "O Octa escreve e publica sem perguntar (apagar sempre pergunta)." },
  { v: "antes_de_publicar", rotulo: "Perguntar antes de publicar", dica: "Escreve sozinho; para e pergunta antes de publicar no GitHub." },
  { v: "antes_de_escrever", rotulo: "Perguntar antes de escrever", dica: "Para e pergunta antes de gravar qualquer arquivo." },
];
function erroAoIniciar(status: number, erro?: string): string {
  if (status === 503 || erro === "gateway_off") return "O gateway de modelo não está ligado neste servidor.";
  if (status === 401) return "Entre na sua conta pra usar o Octa.";
  if (status === 429) return "Muitos pedidos seguidos. Espera um instante.";
  if (status === 404) return "Este projeto não existe mais no servidor.";
  if (status === 0) return "Falha de rede ao falar com o Octa.";
  return `O Octa não conseguiu começar agora (erro ${status}).`;
}

function Arvore({ nos, ativo, abertasPastas, alternar, onAbrir, onApagar, travado }: {
  nos: NoArvore[]; ativo: string | null; abertasPastas: Set<string>; alternar: (p: string) => void;
  onAbrir: (p: string) => void; onApagar: (p: string) => void; travado?: boolean;
}) {
  return (
    <ul>
      {nos.map((n) => (
        <li key={n.caminho}>
          {n.pasta ? (
            <>
              <button type="button" onClick={() => alternar(n.caminho)} className="w-full flex items-center gap-1 px-2 py-[3px] text-left hover:bg-white/5" style={{ color: Z.fraco }}>
                {abertasPastas.has(n.caminho) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {abertasPastas.has(n.caminho) ? <FolderOpen className="w-3.5 h-3.5" /> : <Folder className="w-3.5 h-3.5" />}
                <span className="truncate">{n.nome}</span>
              </button>
              {abertasPastas.has(n.caminho) && <div className="pl-3"><Arvore nos={n.filhos} ativo={ativo} abertasPastas={abertasPastas} alternar={alternar} onAbrir={onAbrir} onApagar={onApagar} travado={travado} /></div>}
            </>
          ) : (
            <div className="group flex items-center" style={{ background: ativo === n.caminho ? Z.sel : undefined }}>
              <button type="button" onClick={() => onAbrir(n.caminho)} className="flex-1 min-w-0 flex items-center gap-1.5 pl-6 pr-1 py-[3px] text-left hover:bg-white/5" style={{ color: ativo === n.caminho ? Z.texto : Z.fraco }}>
                <FileText className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{n.nome}</span>
              </button>
              {!travado && <button type="button" title={`Apagar ${n.caminho}`} onClick={() => onApagar(n.caminho)} className="opacity-0 group-hover:opacity-100 px-1.5" style={{ color: Z.apagado }}><Trash2 className="w-3 h-3" /></button>}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function OctaIDE() {
  // ── projeto aberto ──
  const [projetos, setProjetos] = useState<ProjetoMeta[] | null>(null);
  const [servidorOk, setServidorOk] = useState(true);
  const [projeto, setProjetoRaw] = useState<ProjetoMeta | null>(null);
  const [rascunho, setRascunho] = useState(false);
  const [ide, setIde] = useState<EstadoIDE | null>(null);
  const [vista, setVista] = useState<Vista>("codigo");
  const [seletor, setSeletor] = useState(false);
  const [nomeNovo, setNomeNovo] = useState("");
  const [criando, setCriando] = useState(false);
  const [salvamento, setSalvamento] = useState<"salvo" | "pendente" | "salvando" | "erro" | "grande">("salvo");
  // ── agente ──
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [chaveChat, setChaveChat] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [reaBusy, setReaBusy] = useState(false);
  const reaFileRef = useRef<HTMLInputElement>(null);
  const REA_ON = process.env.NEXT_PUBLIC_OCTA_REA === "1";
  const [modo, setModo] = useState<"review" | "change">("review");
  const [escopo, setEscopo] = useState<"ativo" | "projeto">("ativo");
  const [enviando, setEnviando] = useState(false);
  const [decidindo, setDecidindo] = useState(false);
  const [avisoAgente, setAvisoAgente] = useState<string | null>(null);
  // ── GitHub / publicar ──
  const [gh, setGh] = useState<Github | null>(null);
  const [ghMenu, setGhMenu] = useState(false);
  const [pub, setPub] = useState<Publicacao>({ fase: "ocioso" });
  // ── editor ──
  const [pastas, setPastas] = useState<Set<string>>(new Set(["arte", "src", "tests"]));
  const [saidaAberta, setSaidaAberta] = useState(false);
  // #421: por arquivo .svg, mostrar o código em vez da imagem? (padrão: imagem)
  const [verCodigo, setVerCodigo] = useState<Record<string, boolean>>({});
  const [errosReact, setErrosReact] = useState<string[]>([]); // compilação + console.error do app React (Sandpack)
  const { run, output, isRunning, isPyodideReady, clearOutput, iframeRef } = useCodeRunner();
  const fimChat = useRef<HTMLDivElement>(null);
  const abortar = useRef<AbortController | null>(null);

  // refs pro que roda fora do render (salvar com atraso, fim do turno)
  const projetoRef = useRef<ProjetoMeta | null>(null);
  const ideRef = useRef<EstadoIDE | null>(null);
  const sujo = useRef(false);
  const timerSalvar = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emVoo = useRef<Promise<void>>(Promise.resolve());
  /** Os arquivos de antes do turno (pro "desfazer"): só valem pro MESMO projeto e o MESMO turno que os tirou. */
  const antesDoTurno = useRef<{ projetoId: string; turnoId: string | null; estado: EstadoIDE } | null>(null);
  const setProjeto = (p: ProjetoMeta | null) => { projetoRef.current = p; setProjetoRaw(p); };
  /** Mudança de CONTEÚDO feita pelo aluno: marca pra salvar no servidor. */
  const editar = (fn: (e: EstadoIDE) => EstadoIDE) => { sujo.current = true; setIde((e) => (e ? fn(e) : e)); };

  const { turno, iniciar, acompanhar, aprovar, retomarPolling, limpar } = useTurnoOcta({ onParou: (t) => aoPararTurno(t) });
  const turnoVivo = !!turno && turno.status !== "pronto" && turno.status !== "erro";

  // ───────────── salvar no servidor (com atraso) ─────────────
  const salvarAgora = useCallback(async () => {
    if (timerSalvar.current) { clearTimeout(timerSalvar.current); timerSalvar.current = null; }
    await emVoo.current;
    const p = projetoRef.current;
    const e = ideRef.current;
    if (!p || !e || !sujo.current) return;
    sujo.current = false;
    setSalvamento("salvando");
    const voo = fetch(`/api/octa/projetos/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ arquivos: e.arquivos }) })
      .then((r) => {
        if (!r.ok) throw r.status;
        setSalvamento(sujo.current ? "pendente" : "salvo");
      })
      .catch((s) => { sujo.current = true; setSalvamento(s === 413 ? "grande" : "erro"); });
    emVoo.current = voo;
    await voo;
  }, []);

  useEffect(() => {
    ideRef.current = ide;
    if (!ide) return;
    const p = projetoRef.current;
    if (p) salvarCacheProjeto(p.id, ide);
    else if (rascunho) salvar(ide);
    if (!p || !sujo.current) return;
    setSalvamento("pendente");
    if (timerSalvar.current) clearTimeout(timerSalvar.current);
    timerSalvar.current = setTimeout(() => void salvarAgora(), 800);
  }, [ide, rascunho, salvarAgora]);

  // conversa: cada projeto tem a sua (e o rascunho a antiga)
  useEffect(() => {
    if (!chaveChat) return;
    gravarLS(chaveChat, JSON.stringify(msgs.slice(-60).map(({ desfazer: _d, ...m }) => m)));
  }, [msgs, chaveChat]);
  useEffect(() => { fimChat.current?.scrollIntoView({ block: "end" }); }, [msgs, enviando, turno?.eventos.length, turno?.pendente]);

  const carregarChat = (chave: string) => {
    let lidas: Msg[] = [];
    try { const c = JSON.parse(lerLS(chave) || "[]"); if (Array.isArray(c)) lidas = c.map((m: Msg) => ({ ...m, desfazer: undefined })); } catch { /* */ }
    setMsgs(lidas);
    setChaveChat(chave);
  };

  // ───────────── abrir / criar / trocar projeto ─────────────
  const recarregarProjeto = useCallback(async (id: string, opts: { abrirPrevia?: boolean } = {}) => {
    const r = await fetch(`/api/octa/projetos/${id}`).catch(() => null);
    if (!r?.ok || projetoRef.current?.id !== id) return;
    const j = await r.json().catch(() => null);
    if (!j?.projeto || projetoRef.current?.id !== id) return;
    setProjeto(meta(j.projeto));
    sujo.current = false;
    setSalvamento("salvo");
    setIde((prev) => estadoDoProjeto(j.projeto.arquivos ?? {}, prev ?? undefined));
    if (opts.abrirPrevia) setVista((v) => (v === "estilos" ? v : "previa"));
  }, []);

  // ───────────── arquivos ao vivo: cada arquivo que o servidor grava no turno redesenha a prévia ─────────────
  const timerAoVivo = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimoArquivoVisto = useRef(0);
  const trocouPraPrevia = useRef<string | null>(null);
  const geracaoAoVivo = useRef(0); // sobe quando o turno acaba ou o projeto sai: leitura em voo vira lixo
  const relerAoVivo = useCallback(async (id: string) => {
    const g = geracaoAoVivo.current;
    const vale = () => g === geracaoAoVivo.current && projetoRef.current?.id === id && !sujo.current; // edição do aluno em andamento não é atropelada
    const r = await fetch(`/api/octa/projetos/${id}`).catch(() => null);
    if (!r?.ok || !vale()) return;
    const j = await r.json().catch(() => null);
    if (!j?.projeto || !vale()) return;
    // só os arquivos: a foto do "desfazer" (antesDoTurno) fica intacta e nada vai de volta pro servidor
    setIde((prev) => estadoDoProjeto(j.projeto.arquivos ?? {}, prev ?? undefined));
  }, []);
  useEffect(() => {
    const p = projetoRef.current;
    if (!turno || !p) { ultimoArquivoVisto.current = 0; return; }
    const novos = turno.eventos.filter((e) => e.tipo === "arquivo" && e.seq > ultimoArquivoVisto.current);
    if (!novos.length) return;
    ultimoArquivoVisto.current = novos[novos.length - 1].seq;
    if (trocouPraPrevia.current !== turno.turnoId && novos.some((e) => /\.(html|css)$/i.test(String(e.dados.path)))) {
      trocouPraPrevia.current = turno.turnoId; // uma vez por turno: depois disso o aluno manda
      setVista((v) => (v === "codigo" ? "previa" : v));
    }
    if (timerAoVivo.current) clearTimeout(timerAoVivo.current);
    timerAoVivo.current = setTimeout(() => { timerAoVivo.current = null; void relerAoVivo(p.id); }, 400);
  }, [turno, relerAoVivo]);
  useEffect(() => () => { if (timerAoVivo.current) clearTimeout(timerAoVivo.current); }, []);

  const sairDoAtual = async () => {
    limpar();
    geracaoAoVivo.current++;
    if (timerAoVivo.current) { clearTimeout(timerAoVivo.current); timerAoVivo.current = null; }
    antesDoTurno.current = null; // a foto é deste projeto: não pode virar o "desfazer" de outro
    await salvarAgora();
    setPub({ fase: "ocioso" });
    setAvisoAgente(null);
    setSeletor(false);
  };

  const abrirProjeto = async (p: ProjetoMeta) => {
    await sairDoAtual();
    setRascunho(false);
    setProjeto(p);
    setVista("codigo");
    sujo.current = false;
    setSalvamento("salvo");
    setIde(carregarCacheProjeto(p.id));
    carregarChat(chaveChatProjeto(p.id));
    gravarLS(CHAVE_ULTIMO, p.id);
    const r = await fetch(`/api/octa/projetos/${p.id}`).catch(() => null);
    if (projetoRef.current?.id !== p.id) return;
    if (r?.status === 404) {
      setProjetos((l) => (l ?? []).filter((x) => x.id !== p.id));
      setProjeto(null); setIde(null);
      return;
    }
    const j = r?.ok ? await r.json().catch(() => null) : null;
    if (j?.projeto && projetoRef.current?.id === p.id) {
      setProjeto(meta(j.projeto));
      setIde((cache) => estadoDoProjeto(j.projeto.arquivos ?? {}, cache ?? undefined));
    } else if (!ideRef.current) setIde(estadoDoProjeto({}));
    // um pedido que estava rodando quando a página fechou: volta a acompanhar
    const t = lerLS(chaveTurno(p.id));
    if (t) acompanhar(t);
  };

  const abrirRascunho = async () => {
    await sairDoAtual();
    setProjeto(null);
    setRascunho(true);
    setVista("codigo");
    setIde(carregar());
    carregarChat(CHAVE_CHAT);
    gravarLS(CHAVE_ULTIMO, "rascunho");
  };

  const criarProjeto = async (nome: string) => {
    if (criando) return;
    setCriando(true);
    try {
      const r = await fetch("/api/octa/projetos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: nome.trim() || "Meu site" }) });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.projeto) { setAvisoAgente("Não deu pra criar o projeto agora."); return; }
      const p = meta(j.projeto);
      setProjetos((l) => [p, ...(l ?? [])]);
      setNomeNovo("");
      await abrirProjeto(p);
    } finally { setCriando(false); }
  };

  const apagarProjeto = async (p: ProjetoMeta) => {
    if (!window.confirm(`Apagar o projeto "${p.nome}"? Os arquivos dele somem daqui (o repositório no GitHub, se houver, fica).`)) return;
    const r = await fetch(`/api/octa/projetos/${p.id}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) return;
    gravarLS(chaveChatProjeto(p.id), null); gravarLS(chaveTurno(p.id), null);
    const resto = (projetos ?? []).filter((x) => x.id !== p.id);
    setProjetos(resto);
    if (projetoRef.current?.id === p.id) {
      if (resto[0]) await abrirProjeto(resto[0]);
      else { limpar(); setProjeto(null); setIde(null); setSeletor(false); }
    }
  };

  // boot: lista do servidor → último aberto (ou o rascunho). Sem servidor (deslogado) → só o rascunho.
  useEffect(() => {
    let vivo = true;
    (async () => {
      const r = await fetch("/api/octa/projetos").catch(() => null);
      const j = r?.ok ? await r.json().catch(() => null) : null;
      if (!vivo) return;
      if (!Array.isArray(j?.projetos)) { setServidorOk(false); setProjetos([]); await abrirRascunho(); return; }
      const lista: ProjetoMeta[] = j.projetos.map(meta);
      setProjetos(lista);
      const ultimo = lerLS(CHAVE_ULTIMO);
      if (ultimo === "rascunho") { await abrirRascunho(); return; }
      const alvo = lista.find((p) => p.id === ultimo) ?? lista[0];
      if (alvo) await abrirProjeto(alvo);
    })();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ───────────── GitHub ─────────────
  const carregarGithub = useCallback(async () => {
    const r = await fetch("/api/octa/github").catch(() => null);
    const j = r?.ok ? await r.json().catch(() => null) : null;
    if (j) setGh({ conectado: !!j.conectado, login: j.login ?? null, configurado: !!j.configurado });
  }, []);
  useEffect(() => {
    void carregarGithub();
    const aoVoltar = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin || ev.data?.tipo !== "octa-github") return;
      void carregarGithub();
      if (ev.data.gh === "connected") setPub((p) => (p.fase === "erro" && p.erro === "github_reconectar" ? { fase: "ocioso" } : p));
    };
    const aoFocar = () => void carregarGithub();
    window.addEventListener("message", aoVoltar);
    window.addEventListener("focus", aoFocar);
    return () => { window.removeEventListener("message", aoVoltar); window.removeEventListener("focus", aoFocar); };
  }, [carregarGithub]);

  const conectarGithub = () => {
    const url = "/api/projects/github/connect?voltar=/octa/github";
    const w = window.open(url, "octa-github", "popup,width=640,height=760");
    if (!w) window.location.href = url; // pop-up bloqueado: vai na mesma aba (e volta pela janelinha /octa/github)
  };
  const desconectarGithub = async () => {
    setGhMenu(false);
    await fetch("/api/projects/github/disconnect", { method: "POST" }).catch(() => null);
    await carregarGithub();
  };

  // ───────────── publicar ─────────────
  const executarPublicacao = async (p: ProjetoMeta) => {
    setPub({ fase: "publicando" });
    const r = await fetch(`/api/octa/projetos/${p.id}/publicar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    if (r?.ok && j?.ok) {
      const repoUrl = linkSeguro(j.repoUrl) ?? "";
      const pagesUrl = linkSeguro(j.pagesUrl) ?? "";
      setPub({ fase: "ok", repoUrl, pagesUrl, status: j.status === "no_ar" ? "no_ar" : "publicando", ignorados: Array.isArray(j.ignorados) ? j.ignorados : [] });
      if (projetoRef.current?.id === p.id) setProjeto({ ...projetoRef.current, pagesUrl: pagesUrl || projetoRef.current.pagesUrl, repoFullName: repoUrl.replace(/^https:\/\/github\.com\//, "") || projetoRef.current.repoFullName });
      return;
    }
    const erro = typeof j?.erro === "string" ? j.erro : r?.status === 404 ? "projeto_inexistente" : r?.status === 429 ? "limite_publicacoes_rate" : "falha_github";
    setPub({ fase: "erro", erro, ...(erro === "marca_no_conteudo" && typeof j?.palavra === "string" ? { palavra: j.palavra } : {}) });
    if (erro === "github_reconectar") void carregarGithub();
  };
  const publicar = async () => {
    const p = projetoRef.current;
    if (!p || turnoVivo || pub.fase === "publicando") return;
    // app React não publica nesta fase: avisa sem pedir GitHub nem o aviso público (o servidor barra de novo)
    if (ideRef.current && tipoProjeto(ideRef.current.arquivos) === "react") { setPub({ fase: "erro", erro: "tipo_nao_publicavel" }); return; }
    if (gh && !gh.conectado) { setPub({ fase: "erro", erro: "github_reconectar" }); return; }
    await salvarAgora();
    if (!p.avisoPublicoAceito) { setPub({ fase: "aviso" }); return; }
    await executarPublicacao(p);
  };
  const aceitarAviso = async () => {
    const p = projetoRef.current;
    if (!p) return;
    setPub({ fase: "publicando" });
    const r = await fetch(`/api/octa/projetos/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avisoPublicoAceito: true }) }).catch(() => null);
    if (!r?.ok) { setPub({ fase: "erro", erro: "falha_aviso" }); return; }
    const novo = { ...p, avisoPublicoAceito: true };
    setProjeto(novo);
    await executarPublicacao(novo);
  };

  const mudarPermissao = async (permissao: PermissaoOcta) => {
    const p = projetoRef.current;
    if (!p || p.permissao === permissao) return;
    setProjeto({ ...p, permissao });
    const r = await fetch(`/api/octa/projetos/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ permissao }) }).catch(() => null);
    if (!r?.ok && projetoRef.current?.id === p.id) { setProjeto({ ...projetoRef.current, permissao: p.permissao }); setAvisoAgente("Não deu pra trocar a permissão agora."); }
  };

  // ───────────── turnos (modo projeto) ─────────────
  function aoPararTurno(t: EstadoTurno) {
    const p = projetoRef.current;
    geracaoAoVivo.current++;
    if (timerAoVivo.current) { clearTimeout(timerAoVivo.current); timerAoVivo.current = null; } // o recarregamento final cobre
    if (!p) return;
    if (t.status === "aguardando_aprovacao") { void recarregarProjeto(p.id); return; } // o que já gravou fica salvo
    const gravados = [...new Set(t.eventos.filter((e) => e.tipo === "arquivo" && e.dados.acao !== "apagado").map((e) => String(e.dados.path)))];
    const apagados = [...new Set(t.eventos.filter((e) => e.tipo === "arquivo" && e.dados.acao === "apagado").map((e) => String(e.dados.path)))];
    const foto = antesDoTurno.current;
    antesDoTurno.current = null;
    // turno retomado (reabriu o projeto) ou foto de outro projeto/turno: sem desfazer
    const antes = foto && foto.projetoId === p.id && foto.turnoId === t.turnoId ? foto.estado : null;
    const perdeu = t.status === "erro" && t.falhaRede && !t.eventos.some((e) => e.tipo === "erro");
    setMsgs((v) => [...v, {
      id: uid(), role: "assistant",
      content: perdeu ? "Perdi o contato com este pedido. Reabra o projeto pra ver o que ficou salvo." : t.resposta ?? "",
      erro: perdeu || undefined,
      turno: { eventos: t.eventos, status: t.status },
      edicoes: gravados, apagados,
      desfazer: antes && (gravados.length || apagados.length) ? antes : undefined,
    }]);
    limpar();
    gravarLS(chaveTurno(p.id), null);
    setVerCodigo((v) => esquecerVerCodigo(v, [...gravados, ...apagados]));
    void recarregarProjeto(p.id, { abrirPrevia: gravados.includes("index.html") && !antes?.arquivos["index.html"] });
  }

  const enviarTurno = async (texto = input) => {
    const pedido = texto.trim();
    const p = projetoRef.current;
    if (!pedido || !p || turno || enviando) return;
    if (pedido === input.trim()) setInput(""); // texto de fora (Corrigir com o Octa) não apaga o rascunho do aluno
    setAvisoAgente(null); setEnviando(true);
    try {
      await salvarAgora();
      const foto = ideRef.current;
      antesDoTurno.current = null;
      setMsgs((v) => [...v, { id: uid(), role: "user", content: pedido }]);
      const r = await iniciar(p.id, pedido);
      if (!r.ok) { setMsgs((v) => [...v, { id: uid(), role: "assistant", content: erroAoIniciar(r.status, r.erro), erro: true }]); return; }
      gravarLS(chaveTurno(p.id), r.turnoId);
      // um turno que já estava rodando não começou destes arquivos: sem foto, sem desfazer
      if (!r.jaAtivo && foto && projetoRef.current?.id === p.id) antesDoTurno.current = { projetoId: p.id, turnoId: r.turnoId, estado: foto };
      if (r.jaAtivo) setAvisoAgente("Já havia um pedido rodando neste projeto: acompanhando ele.");
    } finally { setEnviando(false); }
  };

  const decidir = async (aprovado: boolean) => {
    setDecidindo(true);
    try { await aprovar(aprovado); } finally { setDecidindo(false); }
  };

  // ───────────── rascunho (modo antigo, /api/octa/agente) ─────────────
  const nos = useMemo(() => (ide ? arvore(ide.arquivos) : []), [ide]);
  const ativo = ide?.ativo ?? null;
  const lang = ativo ? linguagem(ativo) : null;
  const estiloAtual = ide ? estiloDoDesignMd(ide.arquivos) ?? projeto?.designId ?? null : null;
  const tipo = useMemo(() => tipoProjeto(ide?.arquivos), [ide?.arquivos]);
  const previaHtml = useMemo(() => (vista === "previa" && ide && tipo !== "react" ? montarPrevia(ide.arquivos) : null), [vista, ide, tipo]);
  // fora da prévia React os erros dela não valem mais (voltam quando o Sandpack monta de novo)
  useEffect(() => { if (vista !== "previa" || tipo !== "react") setErrosReact([]); }, [vista, tipo]);

  const novoArquivo = () => {
    const p = caminhoValido(window.prompt("Nome do arquivo (ex.: src/app.ts)") ?? "");
    if (!p || !ide) return;
    editar((e) => abrir({ ...e, arquivos: { ...e.arquivos, [p]: e.arquivos[p] ?? "" } }, p));
  };
  const apagarArquivo = (p: string) => {
    if (!ide || !window.confirm(`Apagar ${p}?`)) return;
    editar((e) => { const arquivos = { ...e.arquivos }; delete arquivos[p]; return fecharAba({ ...e, arquivos }, p); });
    setVerCodigo((v) => esquecerVerCodigo(v, [p])); // recriado com o mesmo nome, volta a abrir como imagem
  };
  const rodar = useCallback(async () => {
    if (!ide || !ativo || !lang?.runner) return;
    if (lang.runner === "html") { setVista("previa"); return; }
    setSaidaAberta(true); clearOutput();
    await run(ide.arquivos[ativo], lang.runner, Object.entries(ide.arquivos).map(([path, content]) => ({ path, content })));
  }, [ide, ativo, lang, run, clearOutput]);

  const enviarRascunho = async (texto = input, modoPedido = modo) => {
    const pedido = texto.trim();
    if (!pedido || enviando || !ide) return;
    setInput(""); setModo(modoPedido);
    const historico = msgs.filter((m) => !m.erro).map((m) => ({ role: m.role, content: m.content })).slice(-12);
    setMsgs((v) => [...v, { id: uid(), role: "user", content: pedido }]);
    setEnviando(true);
    const ac = new AbortController(); abortar.current = ac;
    const liberados = modoPedido === "change" ? (escopo === "projeto" ? ["**"] : ativo ? [ativo, ...testesDe(ativo)] : []) : [];
    try {
      const r = await fetch("/api/octa/agente", {
        method: "POST", signal: ac.signal, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedido, historico, workspace: ide.arquivos, modo: modoPedido, liberados, arquivoAtivo: ativo }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const erro = r.status === 503 ? "O gateway de modelo não está ligado neste servidor." : r.status === 402 ? "O orçamento desta sessão acabou. Tenta de novo daqui a pouco." : r.status === 401 ? "Entre na sua conta pra usar o Octa." : r.status === 429 ? "Muitos pedidos seguidos. Espera um instante." : `O Octa não conseguiu responder agora (erro ${r.status}${j.error ? `: ${j.error}` : ""}).`;
        setMsgs((v) => [...v, { id: uid(), role: "assistant", content: erro, erro: true }]);
        return;
      }
      const edicoes: Record<string, string> = j.edicoes ?? {};
      const apagados: string[] = j.apagados ?? [];
      const antes = ide;
      if (Object.keys(edicoes).length || apagados.length) setIde((e) => (e ? aplicarEdicoes(e, edicoes, apagados) : e));
      // arte (re)gravada ou apagada pelo agente: abre como IMAGEM, não herda um "Código" antigo do mesmo caminho
      setVerCodigo((v) => esquecerVerCodigo(v, [...Object.keys(edicoes), ...apagados]));
      const pedeApagar = (j.negados ?? []).some((n: any) => n.tool === "octa_apagar" && n.motivo === "needs_approval");
      setMsgs((v) => [...v, {
        id: uid(), role: "assistant", content: j.resposta ?? "", edicoes: Object.keys(edicoes), apagados, modelo: j.modelo,
        negados: (j.negados ?? []).filter((n: any) => n.tool !== "octa_apagar"), sinais: j.sinais, pedeApagar: pedeApagar || undefined,
        desfazer: Object.keys(edicoes).length || apagados.length ? antes : undefined,
      }]);
    } catch (e: any) {
      if (e?.name !== "AbortError") setMsgs((v) => [...v, { id: uid(), role: "assistant", content: "Falha de rede ao falar com o Octa.", erro: true }]);
    } finally { setEnviando(false); abortar.current = null; }
  };

  const enviar = (texto = input) => (projeto ? enviarTurno(texto) : enviarRascunho(texto));

  // REA: envia um binário pro motor (Contabo) e deixa o pedido pronto com o handle
  const enviarBinarioRea = async (file: File) => {
    if (!file || reaBusy) return;
    setReaBusy(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await fetch("/api/octa/rea/upload", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setAvisoAgente(j?.error ?? "Não deu pra enviar o binário pro REA."); return; }
      setMsgs((v) => [...v, { id: uid(), role: "user", content: `🔬 Binário enviado pro REA: ${j.name} (${(j.bytes / 1024).toFixed(0)} KB).` }]);
      setInput(`Faça engenharia reversa do binário "${j.name}" com o REA (handle: ${j.handle}). Comece com analyze --provider ghidra e me explique, com evidência, o que ele faz.`);
    } catch { setAvisoAgente("Sem conexão pro upload do REA."); }
    finally { setReaBusy(false); if (reaFileRef.current) reaFileRef.current.value = ""; }
  };
  const abrirArquivo = (p: string) => { setVista("codigo"); setIde((e) => (e && p in e.arquivos ? abrir(e, p) : e)); };
  const desfazer = (m: Msg) => {
    const d = m.desfazer!;
    if (projeto) editar((e) => estadoDoProjeto(d.arquivos, e)); else setIde(d);
    setMsgs((v) => v.map((x) => (x.id === m.id ? { ...x, desfazer: undefined, content: x.content + "\n\n(desfeito)" } : x)));
  };

  // ───────────── render ─────────────
  const carregandoTudo = projetos === null && !rascunho;
  const semProjeto = !rascunho && !projeto && projetos !== null;
  const travado = turnoVivo; // o servidor está escrevendo: o aluno espera o turno acabar

  return (
    <div className="h-full w-full flex flex-col overflow-hidden rounded-2xl text-[13px]" style={{ background: Z.bg, color: Z.texto, border: `1px solid ${Z.borda}`, fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui' }}>
      {/* barra de título */}
      <div className="h-10 shrink-0 flex items-center gap-2 px-3 relative z-20" style={{ background: Z.painel, borderBottom: `1px solid ${Z.borda}` }}>
        <OctaIcon size={20} className="text-[#dce0e5]" />
        <span className="font-semibold">Octa Code</span>
        <span style={{ color: Z.apagado }}>·</span>
        {/* seletor de projeto */}
        <div className="relative">
          <button type="button" onClick={() => setSeletor((v) => !v)} aria-haspopup="menu" aria-expanded={seletor}
            className="flex items-center gap-1.5 h-7 px-2 rounded-md hover:bg-white/5 max-w-[240px]" style={{ color: Z.texto }}>
            {rascunho ? <HardDrive className="w-3.5 h-3.5 shrink-0" style={{ color: Z.fraco }} /> : <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: Z.fraco }} />}
            <span className="truncate">{rascunho ? "Rascunho no navegador" : projeto?.nome ?? "Projetos"}</span>
            <ChevronsUpDown className="w-3 h-3 shrink-0" style={{ color: Z.apagado }} />
          </button>
          {seletor && (
            <div role="menu" className="absolute left-0 top-8 w-72 rounded-lg shadow-2xl py-1 text-[12.5px]" style={{ background: Z.painel, border: `1px solid ${Z.borda}` }}>
              {servidorOk && (
                <>
                  <div className="px-3 pt-1.5 pb-1 text-[10.5px] uppercase tracking-wider" style={{ color: Z.apagado }}>Seus projetos</div>
                  {(projetos ?? []).map((p) => (
                    <div key={p.id} className="group flex items-center hover:bg-white/5">
                      <button type="button" role="menuitem" onClick={() => void abrirProjeto(p)} className="flex-1 min-w-0 flex items-center gap-2 px-3 py-1.5 text-left">
                        <span className="w-3.5">{projeto?.id === p.id && <Check className="w-3.5 h-3.5" style={{ color: Z.acento }} />}</span>
                        <span className="truncate">{p.nome}</span>
                        {p.pagesUrl && <Globe className="w-3 h-3 shrink-0" style={{ color: Z.ok }} aria-label="publicado" />}
                      </button>
                      <button type="button" title={`Apagar ${p.nome}`} onClick={() => void apagarProjeto(p)} className="px-2 opacity-0 group-hover:opacity-100" style={{ color: Z.apagado }}><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <form onSubmit={(e) => { e.preventDefault(); void criarProjeto(nomeNovo); }} className="flex items-center gap-1.5 px-3 py-1.5" style={{ borderTop: (projetos ?? []).length ? `1px solid ${Z.borda}` : undefined }}>
                    <FolderPlus className="w-3.5 h-3.5 shrink-0" style={{ color: Z.fraco }} />
                    <input value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)} placeholder="Novo projeto (ex.: Confeitaria da Ana)" aria-label="Nome do novo projeto"
                      className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-[#5d636f]" />
                    <button type="submit" disabled={criando} className="px-2 py-0.5 rounded text-[11.5px] disabled:opacity-50" style={{ background: Z.acento, color: "#1b1e24" }}>{criando ? "…" : "Criar"}</button>
                  </form>
                </>
              )}
              <button type="button" role="menuitem" onClick={() => void abrirRascunho()} className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-white/5" style={{ borderTop: servidorOk ? `1px solid ${Z.borda}` : undefined, color: Z.fraco }}>
                <span className="w-3.5">{rascunho && <Check className="w-3.5 h-3.5" style={{ color: Z.acento }} />}</span>
                <HardDrive className="w-3.5 h-3.5" /> Rascunho no navegador <span className="ml-auto text-[10.5px]" style={{ color: Z.apagado }}>modo antigo</span>
              </button>
            </div>
          )}
        </div>
        {projeto && (
          <span className="text-[11px]" style={{ color: salvamento === "erro" || salvamento === "grande" ? Z.erro : Z.apagado }}>
            {salvamento === "salvando" ? "salvando…" : salvamento === "pendente" ? "editado" : salvamento === "erro" ? "não salvou — tentando de novo ao editar" : salvamento === "grande" ? "grande demais pra salvar (máx. 1,5 MB)" : "salvo"}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {ide && !semProjeto && (
            <div className="flex rounded-md overflow-hidden" role="tablist" aria-label="O que mostrar" style={{ border: `1px solid ${Z.borda}` }}>
              {([["codigo", "Código", Code], ["previa", "Prévia", Eye], ["estilos", "Estilos", Palette]] as const).filter(([v]) => projeto || v !== "estilos").map(([v, rotulo, Icone]) => (
                <button key={v} type="button" role="tab" aria-selected={vista === v} onClick={() => setVista(v)}
                  className="flex items-center gap-1 h-7 px-2.5 text-[12px]" style={{ background: vista === v ? Z.sel : "transparent", color: vista === v ? Z.texto : Z.apagado }}>
                  <Icone className="w-3.5 h-3.5" /> {rotulo}
                </button>
              ))}
            </div>
          )}
          {vista === "codigo" && (
            <button type="button" onClick={rodar} disabled={!lang?.runner || isRunning || (lang?.runner === "python" && !isPyodideReady)}
              title={lang?.runner ? (lang.runner === "python" && !isPyodideReady ? "Carregando o Python…" : lang.runner === "html" ? "Ver a página" : "Rodar o arquivo aberto") : "Esse tipo de arquivo não roda aqui"}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-md disabled:opacity-40 hover:bg-white/5" style={{ border: `1px solid ${Z.borda}` }}>
              {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" style={{ color: Z.ok }} />} Rodar
            </button>
          )}
          {projeto && (
            <>
              {/* GitHub */}
              <div className="relative">
                {gh?.conectado ? (
                  <button type="button" onClick={() => setGhMenu((v) => !v)} title="Sua conta GitHub conectada"
                    className="flex items-center gap-1.5 h-7 px-2.5 rounded-md hover:bg-white/5" style={{ border: `1px solid ${Z.borda}`, color: Z.fraco }}>
                    <Github className="w-3.5 h-3.5" /> <span className="max-w-[120px] truncate">{gh.login ?? "conectado"}</span>
                  </button>
                ) : (
                  <button type="button" onClick={conectarGithub} disabled={gh ? !gh.configurado : false}
                    title={gh && !gh.configurado ? "O login com GitHub não está configurado neste servidor." : "Conectar sua conta GitHub (o site vai pra sua conta)"}
                    className="flex items-center gap-1.5 h-7 px-2.5 rounded-md hover:bg-white/5 disabled:opacity-40" style={{ border: `1px solid ${Z.borda}` }}>
                    <Github className="w-3.5 h-3.5" /> Conectar GitHub
                  </button>
                )}
                {ghMenu && gh?.conectado && (
                  <div className="absolute right-0 top-8 w-56 rounded-lg shadow-2xl py-1 text-[12.5px]" style={{ background: Z.painel, border: `1px solid ${Z.borda}` }}>
                    <div className="px-3 py-1.5 text-[11.5px]" style={{ color: Z.apagado }}>Conectado como <b style={{ color: Z.texto }}>{gh.login}</b></div>
                    <button type="button" onClick={() => void desconectarGithub()} className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-white/5" style={{ color: Z.fraco }}>
                      <LogOut className="w-3.5 h-3.5" /> Desconectar
                    </button>
                  </div>
                )}
              </div>
              {/* Publicar */}
              <div className="relative">
                <button type="button" onClick={() => void publicar()} disabled={turnoVivo || pub.fase === "publicando"}
                  title={turnoVivo ? "Espere o Octa terminar o pedido" : "Publicar no seu GitHub Pages"}
                  className="flex items-center gap-1.5 h-7 px-3 rounded-md font-medium disabled:opacity-50" style={{ background: Z.ok, color: "#1b1e24" }}>
                  {pub.fase === "publicando" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />} Publicar
                </button>
                {pub.fase !== "ocioso" && (
                  <PainelPublicacao pub={pub} onFechar={() => setPub({ fase: "ocioso" })} onAceitar={() => void aceitarAviso()} onConectar={conectarGithub} />
                )}
              </div>
              {projeto.pagesUrl && linkSeguro(projeto.pagesUrl) && pub.fase === "ocioso" && (
                <a href={projeto.pagesUrl} target="_blank" rel="noopener noreferrer" title={projeto.pagesUrl} className="flex items-center gap-1 h-7 px-2 rounded-md hover:bg-white/5 text-[12px]" style={{ color: Z.ok }}>
                  <Globe className="w-3.5 h-3.5" /> no ar
                </a>
              )}
            </>
          )}
        </div>
      </div>

      {carregandoTudo || (projeto && !ide) ? (
        <div className="flex-1 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: Z.acento }} /></div>
      ) : semProjeto ? (
        <BoasVindas nome={nomeNovo} setNome={setNomeNovo} criando={criando} onCriar={(n) => void criarProjeto(n)} onRascunho={() => void abrirRascunho()} erro={avisoAgente} />
      ) : ide && (
        <div className="flex-1 min-h-0 flex">
          {/* explorador */}
          <aside className="w-52 shrink-0 flex flex-col min-h-0" style={{ background: Z.painel, borderRight: `1px solid ${Z.borda}` }}>
            <div className="h-8 flex items-center px-3 text-[11px] uppercase tracking-wider" style={{ color: Z.apagado }}>
              Arquivos
              <button type="button" onClick={novoArquivo} disabled={travado} title="Novo arquivo" className="ml-auto p-1 rounded hover:bg-white/10 disabled:opacity-30"><Plus className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto pb-2 text-[12.5px]">
              <Arvore nos={nos} ativo={ativo} abertasPastas={pastas} travado={travado} alternar={(p) => setPastas((s) => { const n = new Set(s); n.has(p) ? n.delete(p) : n.add(p); return n; })}
                onAbrir={abrirArquivo} onApagar={apagarArquivo} />
              {!nos.length && <div className="px-3 py-2 text-[12px] leading-relaxed" style={{ color: Z.apagado }}>Projeto vazio. Peça ao Octa, na janela ao lado, a sua landing page.</div>}
            </div>
          </aside>

          {/* centro: código · prévia · estilos */}
          <section className="flex-1 min-w-0 flex flex-col">
            {projeto && vista === "estilos" ? (
              <div className="flex-1 min-h-0">
                <GaleriaDesign projetoId={projeto.id} designId={estiloAtual} antesDeEscolher={salvarAgora} bloqueado={travado}
                  onEscolhido={(p) => {
                    if (projetoRef.current?.id !== p.id) return;
                    setProjeto(meta({ ...projetoRef.current, ...p }));
                    const md = p.arquivos?.["DESIGN.md"];
                    if (typeof md === "string") setIde((e) => (e ? { ...e, arquivos: { ...e.arquivos, "DESIGN.md": md } } : e)); // o servidor já gravou
                  }} />
              </div>
            ) : vista === "previa" && tipo === "react" ? (
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="h-8 shrink-0 flex items-center gap-2 px-3 text-[11.5px]" style={{ background: Z.painel, borderBottom: `1px solid ${Z.borda}`, color: Z.apagado }}>
                  <Eye className="w-3.5 h-3.5" /> Prévia do app <span style={{ color: Z.fraco }}>React</span>
                  <span className="ml-auto">a prévia React roda no seu navegador</span>
                </div>
                <div className="flex-1 min-h-0">
                  <PreviaReact key={projeto?.id ?? "rascunho"} arquivos={ide.arquivos} onErros={setErrosReact} />
                </div>
                {errosReact.length > 0 && (
                  <div role="status" aria-label="Erros do app" className="shrink-0 max-h-28 overflow-y-auto px-3 py-1.5 font-mono text-[11.5px] leading-relaxed"
                    style={{ background: Z.painel, borderTop: `1px solid ${Z.borda}`, color: Z.erro }}>
                    {errosReact.map((e, i) => <div key={i} className="truncate" title={e}>{e}</div>)}
                    {projeto && <div className="mt-1"><CorrigirComOcta origem="react" saida={errosReact.join("\n")} desabilitado={travado || enviando} onCorrigir={(p) => void enviarTurno(p)} /></div>}
                  </div>
                )}
              </div>
            ) : vista === "previa" ? (
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="h-8 shrink-0 flex items-center gap-2 px-3 text-[11.5px]" style={{ background: Z.painel, borderBottom: `1px solid ${Z.borda}`, color: Z.apagado }}>
                  <Eye className="w-3.5 h-3.5" /> Prévia de <span style={{ color: Z.fraco }}>index.html</span>
                  <span className="ml-auto">scripts não rodam na prévia</span>
                </div>
                {previaHtml !== null ? (
                  <iframe title="Prévia da página" sandbox="" srcDoc={previaHtml} className="flex-1 w-full border-0 bg-white" />
                ) : (
                  <div className="flex-1 grid place-items-center px-6 text-center text-[12.5px] leading-relaxed" style={{ color: Z.apagado }}>
                    <div>Ainda não há <b style={{ color: Z.fraco }}>index.html</b>.<br />Peça ao Octa, por exemplo: “uma landing pra minha confeitaria, escura e minimalista”.</div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="h-8 shrink-0 flex items-end overflow-x-auto no-scrollbar" style={{ background: Z.painel, borderBottom: `1px solid ${Z.borda}` }}>
                  {ide.abertos.map((p) => (
                    <div key={p} className="group h-full flex items-center gap-1.5 pl-3 pr-1.5 shrink-0 cursor-pointer"
                      style={{ background: p === ativo ? Z.bg : "transparent", color: p === ativo ? Z.texto : Z.fraco, borderRight: `1px solid ${Z.borda}` }}
                      onClick={() => setIde((e) => (e ? { ...e, ativo: p } : e))}>
                      <span className="text-[12.5px]">{p.split("/").pop()}</span>
                      <button type="button" aria-label={`Fechar ${p}`} onClick={(ev) => { ev.stopPropagation(); setIde((e) => (e ? fecharAba(e, p) : e)); }}
                        className="p-0.5 rounded opacity-50 group-hover:opacity-100 hover:bg-white/10"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  {travado && <span className="ml-auto self-center pr-3 text-[11px] flex items-center gap-1.5" style={{ color: Z.aviso }}><Loader2 className="w-3 h-3 animate-spin" /> o Octa está editando — só leitura</span>}
                </div>
                {/* #421: .svg (a arte do Octa) abre como IMAGEM; "Código" volta pro editor */}
                {ativo && ehSvg(ativo) && (
                  <div className="h-8 shrink-0 flex items-center gap-1 px-2" role="tablist" aria-label="Como mostrar o SVG" style={{ background: Z.bg, borderBottom: `1px solid ${Z.borda}` }}>
                    {([["visualizar", "Visualizar"], ["codigo", "Código"]] as const).map(([k, rotulo]) => {
                      const sel = (k === "codigo") === !!verCodigo[ativo];
                      return (
                        <button key={k} type="button" role="tab" aria-selected={sel} onClick={() => setVerCodigo((v) => ({ ...v, [ativo]: k === "codigo" }))}
                          className="px-2.5 py-0.5 rounded text-[11.5px]" style={{ background: sel ? Z.sel : "transparent", color: sel ? Z.texto : Z.fraco }}>{rotulo}</button>
                      );
                    })}
                  </div>
                )}
                <div className="flex-1 min-h-0">
                  {ativo && ehSvg(ativo) && !verCodigo[ativo] ? (
                    <PreviaSvg conteudo={ide.arquivos[ativo] ?? ""} titulo={ativo} />
                  ) : ativo ? (
                    <Monaco
                      path={ativo}
                      language={lang?.monaco}
                      value={ide.arquivos[ativo] ?? ""}
                      theme="octa-zed"
                      beforeMount={(m) => m.editor.defineTheme("octa-zed", {
                        base: "vs-dark", inherit: true,
                        rules: [
                          { token: "comment", foreground: "5d636f", fontStyle: "italic" }, { token: "keyword", foreground: "b477cf" },
                          { token: "string", foreground: "a1c181" }, { token: "number", foreground: "bf956a" }, { token: "type", foreground: "6eb4bf" },
                        ],
                        colors: { "editor.background": Z.bg, "editor.lineHighlightBackground": "#2f343e", "editorLineNumber.foreground": "#4e5a5f", "editorLineNumber.activeForeground": Z.fraco, "editor.selectionBackground": "#74ade840" },
                      })}
                      onChange={(v) => { if (!travado) editar((e) => (e.ativo ? { ...e, arquivos: { ...e.arquivos, [e.ativo]: v ?? "" } } : e)); }}
                      options={{ readOnly: travado, fontSize: 13.5, fontFamily: '"IBM Plex Mono", ui-monospace, Menlo, monospace', minimap: { enabled: false }, scrollBeyondLastLine: false, renderLineHighlight: "line", padding: { top: 10 }, automaticLayout: true, tabSize: 2 }}
                    />
                  ) : (
                    <div className="grid place-items-center h-full" style={{ color: Z.apagado }}>Abra um arquivo no explorador ou peça ao Octa pra criar um.</div>
                  )}
                </div>
                {/* saída */}
                <div className="shrink-0" style={{ borderTop: `1px solid ${Z.borda}`, background: Z.painel }}>
                  <button type="button" onClick={() => setSaidaAberta((v) => !v)} className="w-full h-7 flex items-center gap-2 px-3 text-[11px] uppercase tracking-wider" style={{ color: Z.apagado }}>
                    {saidaAberta ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />} Saída {output.length ? `(${output.length})` : ""}
                  </button>
                  <div className={saidaAberta ? "h-40 overflow-y-auto px-3 pb-2 font-mono text-[12px]" : "hidden"}>
                    <iframe ref={iframeRef} title="Saída" className="hidden" sandbox="allow-scripts" />
                    {output.map((o: RunOutput, i: number) => (
                      <div key={i} style={{ color: o.type === "stderr" ? Z.erro : o.type === "info" ? Z.apagado : Z.texto }} className="whitespace-pre-wrap">{o.text}</div>
                    ))}
                    {!output.length && <div style={{ color: Z.apagado }}>Clique em Rodar pra executar o arquivo aberto.</div>}
                    {projeto && <div className="mt-1"><CorrigirComOcta origem={ativo?.endsWith(".py") ? "python" : "pagina"} arquivo={ativo ?? undefined} saida={output.filter((o: RunOutput) => o.type === "stderr").map((o: RunOutput) => o.text).join("\n")} desabilitado={travado || enviando} onCorrigir={(p) => void enviarTurno(p)} /></div>}
                  </div>
                </div>
              </>
            )}
          </section>

          {/* JANELA DO AGENTE — tudo que é agêntico passa por aqui */}
          <aside className="w-[360px] shrink-0 flex flex-col min-h-0" style={{ background: Z.painel, borderLeft: `1px solid ${Z.borda}` }}>
            <div className="h-8 shrink-0 flex items-center gap-2 px-3 text-[11px] uppercase tracking-wider" style={{ color: Z.apagado, borderBottom: `1px solid ${Z.borda}` }}>
              <OctaIcon size={14} /> Agente
              {turnoVivo && <span className="normal-case tracking-normal flex items-center gap-1" style={{ color: Z.acento }}><span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: Z.acento }} /> trabalhando</span>}
              {msgs.length > 0 && !turno && <button type="button" onClick={() => setMsgs([])} className="ml-auto normal-case tracking-normal hover:underline">limpar</button>}
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {!msgs.length && !turno && (
                <div className="text-[12.5px] leading-relaxed" style={{ color: Z.fraco }}>
                  {projeto ? (
                    <>Diga o que você quer, do seu jeito — por exemplo, <i style={{ color: Z.texto }}>“uma landing pra minha confeitaria, escura e minimalista”</i>. Eu escolho um estilo, monto a página e você acompanha cada passo aqui. Quando gostar, é só <b style={{ color: Z.texto }}>Publicar</b>.</>
                  ) : (
                    <>Peça qualquer coisa sobre o projeto. Em <b style={{ color: Z.texto }}>Revisar</b> eu só leio e aponto; em <b style={{ color: Z.texto }}>Alterar</b> eu edito, mas só os arquivos que você liberar.</>
                  )}
                </div>
              )}
              {msgs.map((m) => (
                <div key={m.id} className={m.role === "user" ? "ml-6" : ""}>
                  {m.turno && <div className="mb-2"><PassosTurno eventos={m.turno.eventos} vivo={false} onAbrirArquivo={abrirArquivo} /></div>}
                  {(m.content || !m.turno) && (
                    <div className="rounded-lg px-3 py-2 whitespace-pre-wrap leading-relaxed" style={{ background: m.role === "user" ? Z.sel : "transparent", color: m.erro ? Z.erro : Z.texto, border: m.role === "assistant" ? `1px solid ${Z.borda}` : undefined }}>
                      {m.content}
                    </div>
                  )}
                  {!!m.edicoes?.length && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11.5px]">
                      <Pencil className="w-3 h-3" style={{ color: Z.ok }} />
                      {m.edicoes.map((p) => (
                        <button key={p} type="button" onClick={() => abrirArquivo(p)} className="px-1.5 py-0.5 rounded hover:underline" style={{ background: "#a1c18122", color: Z.ok }}>{p}</button>
                      ))}
                      {projeto && m.edicoes.includes("index.html") && (
                        <button type="button" onClick={() => setVista("previa")} className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:underline" style={{ color: Z.acento }}><Eye className="w-3 h-3" /> ver a página</button>
                      )}
                      {m.desfazer && !turno && (
                        <button type="button" onClick={() => desfazer(m)} className="ml-auto flex items-center gap-1 hover:underline" style={{ color: Z.fraco }}><Undo2 className="w-3 h-3" /> desfazer</button>
                      )}
                    </div>
                  )}
                  {/* #421: a arte que o agente gravou aparece aqui mesmo, em miniatura (clique abre em Visualizar) */}
                  {!!m.edicoes?.some((p) => ehSvg(p) && p in ide.arquivos) && (
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {m.edicoes!.filter((p) => ehSvg(p) && p in ide.arquivos).map((p) => (
                        <PreviaSvg key={`mini-${p}`} conteudo={ide.arquivos[p] ?? ""} titulo={p} tamanho="mini"
                          onClick={() => { setVerCodigo((v) => ({ ...v, [p]: false })); abrirArquivo(p); }} />
                      ))}
                    </div>
                  )}
                  {!!m.negados?.length && (
                    <div className="mt-1 text-[11.5px] flex items-center gap-1" style={{ color: Z.aviso }}>
                      <ShieldCheck className="w-3 h-3" /> bloqueado: {m.negados.map((n) => MOTIVO[n.motivo] ?? n.motivo).join(", ")}
                    </div>
                  )}
                  {m.pedeApagar && <div className="mt-1 text-[11.5px]" style={{ color: Z.aviso }}>O Octa quis apagar um arquivo: apagar só com você, pelo explorador.</div>}
                  {m.modelo && <div className="mt-1 text-[10.5px]" style={{ color: Z.apagado }}>{m.modelo}</div>}
                </div>
              ))}
              {/* o turno AO VIVO */}
              {turno && (
                <div className="space-y-2">
                  <PassosTurno eventos={turno.eventos} vivo={turnoVivo && !turno.pendente} />
                  {turno.pendente && (
                    <CartaoAprovacao tool={turno.pendente.tool} path={turno.pendente.path} ocupado={decidindo || turno.status !== "aguardando_aprovacao"} onDecidir={(a) => void decidir(a)} />
                  )}
                  {turno.falhaRede && turnoVivo && <div className="text-[11.5px]" style={{ color: Z.aviso }}>Sem resposta do servidor… tentando de novo.</div>}
                  {turno.semNoticia && turnoVivo && (
                    <div className="text-[11.5px] flex items-center gap-2" role="status" style={{ color: Z.aviso }}>
                      O Octa está há muito tempo sem dar notícia deste pedido.
                      <button type="button" onClick={retomarPolling} className="h-6 px-2 rounded-md" style={{ border: `1px solid ${Z.borda}`, color: Z.texto }}>Verificar de novo</button>
                    </div>
                  )}
                </div>
              )}
              {enviando && !projeto && <div className="flex items-center gap-2 text-[12px]" style={{ color: Z.fraco }}><Loader2 className="w-3.5 h-3.5 animate-spin" /> o Octa está trabalhando…</div>}
              {avisoAgente && <div className="text-[11.5px]" style={{ color: Z.aviso }}>{avisoAgente}</div>}
              <div ref={fimChat} />
            </div>
            <div className="shrink-0 p-3 space-y-2" style={{ borderTop: `1px solid ${Z.borda}` }}>
              <div className="flex flex-wrap gap-1.5">
                {projeto
                  ? ATALHOS_LANDING.map((a) => (
                    <button key={a.rotulo} type="button" disabled={!!turno || enviando} onClick={() => (a.enviar ? void enviar(a.texto) : setInput(a.texto))}
                      className="px-2 py-1 rounded-md text-[11.5px] hover:bg-white/5 disabled:opacity-40" style={{ border: `1px solid ${Z.borda}`, color: Z.fraco }}>{a.rotulo}</button>
                  ))
                  : ATALHOS.map((a) => (
                    <button key={a.rotulo} type="button" disabled={enviando} onClick={() => void enviarRascunho(a.texto, a.modo)}
                      className="px-2 py-1 rounded-md text-[11.5px] hover:bg-white/5 disabled:opacity-40" style={{ border: `1px solid ${Z.borda}`, color: Z.fraco }}>{a.rotulo}</button>
                  ))}
              </div>
              <div className="flex items-center gap-2 text-[11.5px]">
                {projeto ? (
                  <label className="flex items-center gap-1.5 min-w-0" title={PERMISSOES.find((x) => x.v === projeto.permissao)?.dica}>
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" style={{ color: Z.apagado }} />
                    <select value={projeto.permissao} onChange={(e) => void mudarPermissao(e.target.value as PermissaoOcta)} aria-label="Permissão do Octa neste projeto"
                      className="min-w-0 rounded-md px-1.5 py-1 bg-transparent" style={{ border: `1px solid ${Z.borda}`, color: Z.fraco }}>
                      {PERMISSOES.map((x) => <option key={x.v} value={x.v}>{x.rotulo}</option>)}
                    </select>
                  </label>
                ) : (
                  <>
                    <div className="flex rounded-md overflow-hidden" style={{ border: `1px solid ${Z.borda}` }}>
                      {(["review", "change"] as const).map((v) => (
                        <button key={v} type="button" onClick={() => setModo(v)} aria-pressed={modo === v} className="px-2.5 py-1" style={{ background: modo === v ? Z.sel : "transparent", color: modo === v ? Z.texto : Z.apagado }}>
                          {v === "review" ? "Revisar" : "Alterar"}
                        </button>
                      ))}
                    </div>
                    {modo === "change" && (
                      <select value={escopo} onChange={(e) => setEscopo(e.target.value as "ativo" | "projeto")} className="rounded-md px-1.5 py-1 bg-transparent" style={{ border: `1px solid ${Z.borda}`, color: Z.fraco }}
                        title="O que o Octa pode editar neste pedido">
                        <option value="ativo">pode editar: {ativo ?? "nenhum"} (+ testes)</option>
                        <option value="projeto">pode editar: o projeto inteiro</option>
                      </select>
                    )}
                  </>
                )}
              </div>
              {REA_ON && process.env.NEXT_PUBLIC_REA_SUCCESS_MEMORY === "1" && <ReaProofPanel projectId={projeto?.id ?? null} />}
              <div className="flex items-end gap-2 rounded-lg px-2 py-1.5" style={{ background: Z.bg, border: `1px solid ${Z.borda}` }}>
                <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={2} placeholder={projeto ? (turno ? "Espere o Octa terminar…" : "Peça ao Octa… (ex.: uma landing pra minha confeitaria)") : "Peça ao Octa…"}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void enviar(); } }}
                  className="flex-1 resize-none bg-transparent outline-none text-[13px] placeholder:text-[#5d636f]" style={{ color: Z.texto }} />
                {REA_ON && (
                  <>
                    <input ref={reaFileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void enviarBinarioRea(f); }} />
                    <button type="button" onClick={() => reaFileRef.current?.click()} disabled={reaBusy || !!turno || enviando} title="Enviar um binário/APK/firmware pro REA analisar" className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30">
                      {reaBusy ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: Z.acento }} /> : <Microscope className="w-4 h-4" style={{ color: Z.acento }} />}
                    </button>
                  </>
                )}
                {!projeto && enviando ? (
                  <button type="button" onClick={() => abortar.current?.abort()} title="Parar" className="p-1.5 rounded hover:bg-white/10"><Square className="w-4 h-4" /></button>
                ) : (
                  <button type="button" onClick={() => void enviar()} disabled={!input.trim() || !!turno || enviando} title="Enviar" className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30">
                    {enviando || turnoVivo ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: Z.acento }} /> : <Send className="w-4 h-4" style={{ color: Z.acento }} />}
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

/** O cartão sob o botão Publicar: aviso da 1ª vez, publicando, os dois links no fim, ou o erro em português. */
function PainelPublicacao({ pub, onFechar, onAceitar, onConectar }: {
  pub: Exclude<Publicacao, { fase: "ocioso" }>; onFechar: () => void; onAceitar: () => void; onConectar: () => void;
}) {
  return (
    <div role="dialog" aria-label="Publicação" className="absolute right-0 top-9 w-80 rounded-xl shadow-2xl p-3.5 text-[12.5px] space-y-2.5" style={{ background: Z.painel, border: `1px solid ${Z.borda}` }}>
      {pub.fase !== "publicando" && <button type="button" aria-label="Fechar" onClick={onFechar} className="absolute right-2 top-2 p-1 rounded hover:bg-white/10" style={{ color: Z.apagado }}><X className="w-3.5 h-3.5" /></button>}
      {pub.fase === "aviso" && (
        <>
          <div className="font-semibold">Antes da primeira publicação</div>
          <p className="leading-relaxed first-letter:uppercase" style={{ color: Z.fraco }}>{AVISO_PUBLICO}</p>
          <div className="text-[11.5px] leading-relaxed" style={{ color: Z.apagado }}>O Octa cria um repositório público na sua conta e liga o GitHub Pages. Não coloque senha nem dado pessoal na página.</div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onAceitar} className="h-7 px-3 rounded-md font-medium" style={{ background: Z.ok, color: "#1b1e24" }}>Entendi, publicar</button>
            <button type="button" onClick={onFechar} className="h-7 px-3 rounded-md" style={{ border: `1px solid ${Z.borda}`, color: Z.fraco }}>Cancelar</button>
          </div>
        </>
      )}
      {pub.fase === "publicando" && (
        <div className="flex items-center gap-2" style={{ color: Z.fraco }}><Loader2 className="w-4 h-4 animate-spin" style={{ color: Z.acento }} /> Publicando no seu GitHub…</div>
      )}
      {pub.fase === "ok" && (
        <>
          <div className="flex items-center gap-2 font-semibold" style={{ color: Z.ok }}>
            <Globe className="w-4 h-4" /> {pub.status === "publicando" ? "no ar em ~1 min" : "no ar"}
          </div>
          <div className="space-y-1.5">
            {pub.pagesUrl && (
              <a href={pub.pagesUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-white/5" style={{ border: `1px solid ${Z.borda}` }}>
                <Globe className="w-3.5 h-3.5 shrink-0" style={{ color: Z.acento }} /><span className="truncate" style={{ color: Z.texto }}>{pub.pagesUrl.replace(/^https:\/\//, "")}</span><ExternalLink className="w-3 h-3 ml-auto shrink-0" style={{ color: Z.apagado }} />
              </a>
            )}
            {pub.repoUrl && (
              <a href={pub.repoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-white/5" style={{ border: `1px solid ${Z.borda}` }}>
                <Github className="w-3.5 h-3.5 shrink-0" style={{ color: Z.fraco }} /><span className="truncate" style={{ color: Z.texto }}>{pub.repoUrl.replace(/^https:\/\//, "")}</span><ExternalLink className="w-3 h-3 ml-auto shrink-0" style={{ color: Z.apagado }} />
              </a>
            )}
          </div>
          {pub.status === "publicando" && <div className="text-[11.5px]" style={{ color: Z.apagado }}>O GitHub Pages leva um minutinho pra ligar na primeira vez; se o link der 404, espere e recarregue.</div>}
          {!!pub.ignorados.length && <div className="text-[11.5px]" style={{ color: Z.apagado }}>Ficaram de fora (não são arquivos de site): {pub.ignorados.join(", ")}</div>}
        </>
      )}
      {pub.fase === "erro" && (
        <>
          <div className="pr-5 leading-relaxed" role="alert" style={{ color: Z.erro }}>
            {pub.erro === "limite_publicacoes_rate" ? "Muitos pedidos seguidos. Espera um instante." : pub.erro === "falha_aviso" ? "Não deu pra registrar o aviso agora. Tente de novo." : textoErroPublicar(pub.erro, pub.palavra)}
          </div>
          {pub.erro === "github_reconectar" && (
            <button type="button" onClick={onConectar} className="flex items-center gap-1.5 h-7 px-3 rounded-md" style={{ border: `1px solid ${Z.borda}` }}><Github className="w-3.5 h-3.5" /> Conectar GitHub</button>
          )}
          {pub.erro === "github_sem_permissao" && (
            <a href="https://github.com/settings/installations" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 h-7 px-3 rounded-md w-fit" style={{ border: `1px solid ${Z.borda}` }}><Github className="w-3.5 h-3.5" /> Abrir permissões no GitHub</a>
          )}
        </>
      )}
    </div>
  );
}

function BoasVindas({ nome, setNome, criando, onCriar, onRascunho, erro }: {
  nome: string; setNome: (v: string) => void; criando: boolean; onCriar: (nome: string) => void; onRascunho: () => void; erro: string | null;
}) {
  return (
    <div className="flex-1 grid place-items-center p-6">
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: Z.painel, border: `1px solid ${Z.borda}` }}>
        <OctaIcon size={36} className="text-[#dce0e5]" />
        <div>
          <div className="text-[17px] font-semibold">Seu site, do pedido ao ar</div>
          <div className="mt-1 text-[12.5px] leading-relaxed" style={{ color: Z.fraco }}>
            Diga ao Octa o que você quer. Ele escolhe um estilo, monta a página e você vê cada passo. Depois é um clique pra publicar no seu GitHub.
          </div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onCriar(nome); }} className="flex gap-2">
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do projeto (ex.: Confeitaria da Ana)" aria-label="Nome do projeto" autoFocus
            className="flex-1 min-w-0 h-9 rounded-lg px-3 bg-transparent outline-none placeholder:text-[#5d636f]" style={{ border: `1px solid ${Z.borda}`, color: Z.texto }} />
          <button type="submit" disabled={criando} className="h-9 px-4 rounded-lg font-medium disabled:opacity-50 flex items-center gap-1.5" style={{ background: Z.acento, color: "#1b1e24" }}>
            {criando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />} Criar projeto
          </button>
        </form>
        {erro && <div className="text-[12px]" style={{ color: Z.erro }}>{erro}</div>}
        <button type="button" onClick={onRascunho} className="text-[12px] hover:underline" style={{ color: Z.apagado }}>ou continuar no rascunho do navegador (modo antigo)</button>
      </div>
    </div>
  );
}

/** "Gerar testes" escreve num arquivo novo: libera os caminhos de teste do arquivo ativo junto. */
function testesDe(p: string): string[] {
  const base = p.replace(/\.[^.]+$/, "");
  const nome = base.split("/").pop() ?? base;
  return [`tests/**`, `${base}.test.*`, `${base}.spec.*`, `test_${nome}.*`, `**/test_${nome}.*`];
}
