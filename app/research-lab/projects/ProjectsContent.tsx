"use client";
/**
 * ProjectsContent — the "Projetos" room: an in-browser agentic IDE.
 *
 * Visual language: Apple "Liquid Glass" (see docs/superpowers/specs/
 * 2026-06-07-liquid-glass-style-reference.md). Dark navy frost, blur(40px),
 * violet #8b5cf6 + cyan #22d3ee accents, pill tabs with inner highlight + glow.
 *
 * Top frame mirrors the Sala de Estudos search bar (OmegaScholarBar): a rotating
 * ⟁ triangle that, when clicked, morphs the frame into a search bar. Anything
 * typed there = "I want to develop this project" → runs the agent in PROTOTYPE
 * mode (diagrams + scope), shown via the GlitchTerm effect while it thinks.
 * In its resting state the bar shows the project name and, below it, the GitHub
 * connect / install pill (deep-links to install the "Zaeon Code" App).
 *
 * Workspace = REAL cloned repository via /api/projects/github (GitHub App
 * installation token). No mock files. Agent (/api/projects/agent → Gemini via
 * Vertex) and in-browser execution (Pyodide via useCodeRunner) are real.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import {
  Play, Loader2, Bot, Send, GitBranch, GitPullRequest, Github,
  FileText, FolderTree, Workflow, Boxes, Sparkles, ShieldCheck,
  ChevronRight, ChevronDown, Cpu, Lock, CheckCircle2, AlertTriangle, Terminal,
  RefreshCw, Save, Plus, FolderGit2, ArrowUp, ExternalLink, Pencil, Trash2, LogOut, Folder, FolderOpen,
  Brain, Eraser, ListChecks, Circle,
} from "lucide-react";
import { useCodeRunner, type Language } from "@/app/agentic-modules/codelab/useCodeRunner";
import {
  GITHUB_ACTIONS, type GitHubAction, type RiskTier,
} from "@/lib/projects/github-actions";
import { NOT_ELIGIBLE_COPY } from "@/lib/projects/access";
import GlitchTerm from "@/components/research/GlitchTerm";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-[#0d0d16] text-slate-500 text-xs gap-2">
        <Loader2 size={14} className="animate-spin" /> Carregando editor…
      </div>
    ),
  },
);

// ─── Liquid-glass tokens ───────────────────────────────────────────────────────
const GLASS_SHELL = {
  background: "rgba(22,22,34,0.55)",
  border: "1px solid rgba(255,255,255,0.12)",
  backdropFilter: "blur(40px) saturate(180%)",
  WebkitBackdropFilter: "blur(40px) saturate(180%)",
  boxShadow: "0 40px 100px -30px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.10)",
};
const GLASS_PANEL = {
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
};
// Variantes para o tema CLARO (vidro branco com texto escuro legível).
const GLASS_SHELL_LIGHT = {
  background: "rgba(255,255,255,0.78)",
  border: "1px solid rgba(0,0,0,0.08)",
  backdropFilter: "blur(40px) saturate(160%)",
  WebkitBackdropFilter: "blur(40px) saturate(160%)",
  boxShadow: "0 24px 64px -32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.7)",
};
const GLASS_PANEL_LIGHT = {
  background: "rgba(255,255,255,0.62)",
  border: "1px solid rgba(0,0,0,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
};
const PILL_ACTIVE = {
  color: "#fff",
  background: "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))",
  border: "1px solid rgba(255,255,255,0.28)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45), 0 8px 20px -8px rgba(139,92,246,0.85)",
};
const PILL_IDLE = {
  color: "#b8b8d0",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
};

// ─── Levels ──────────────────────────────────────────────────────────────────
type Level = "prototype" | "implementation" | "autonomy";
const LEVELS: { id: Level; label: string; icon: any; hint: string }[] = [
  { id: "prototype", label: "Prototipação", icon: Workflow, hint: "Diagramas + documento de escopo" },
  { id: "implementation", label: "Implementação", icon: FileText, hint: "Edição cirúrgica + execução" },
  { id: "autonomy", label: "Autonomia", icon: Cpu, hint: "Loop agêntico com checkpoints" },
];

type ModelChoice = "auto" | "sonnet" | "opus" | "gemini";
// Ordem: Gemini primeiro (único ativo). Sonnet/Opus travados até ligarmos o tier Anthropic.
const MODELS: { id: ModelChoice; label: string; locked?: boolean }[] = [
  { id: "auto", label: "Auto" },
  { id: "gemini", label: "Gemini" },
  { id: "sonnet", label: "Sonnet", locked: true },
  { id: "opus", label: "Opus", locked: true },
];

// ─── GitHub-backed workspace types (match lib/projects/github-service.ts) ───────
interface RepoInfo { fullName: string; defaultBranch: string; private: boolean }
interface TreeItem { path: string; lang: Language; monaco: string; size?: number }
interface OpenFile { path: string; lang: Language; monaco: string; body: string; sha?: string; dirty: boolean }

const riskStyle: Record<RiskTier, string> = {
  safe: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
  review: "text-amber-300 bg-amber-500/10 border-amber-500/25",
  irreversible: "text-rose-300 bg-rose-500/10 border-rose-500/25",
};

interface ScaffoldFile { path: string; content: string }
interface ChatMsg { role: "user" | "agent"; text: string; routing?: string; kind?: string; files?: ScaffoldFile[] }
interface PlanStep { title: string; action: string; githubAction: string | null; needsApproval: boolean }
type StepState = "idle" | "running" | "done" | "failed";

/** Client-side extension → runner Language + Monaco id (mirror of github-service.mapPathToLang). */
function mapPath(path: string): { lang: Language; monaco: string } {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "py": return { lang: "python", monaco: "python" };
    case "js": case "jsx": case "mjs": case "cjs": return { lang: "javascript", monaco: "javascript" };
    case "ts": case "tsx": return { lang: "typescript", monaco: "typescript" };
    case "html": case "htm": return { lang: "html", monaco: "html" };
    case "css": return { lang: "other", monaco: "css" };
    case "json": return { lang: "other", monaco: "json" };
    case "md": case "markdown": return { lang: "other", monaco: "markdown" };
    case "yml": case "yaml": return { lang: "other", monaco: "yaml" };
    case "sh": case "bash": return { lang: "other", monaco: "shell" };
    case "sql": return { lang: "other", monaco: "sql" };
    default: return { lang: "other", monaco: "plaintext" };
  }
}

// ─── Multi-project persistence (browser localStorage; account sync = futuro) ────
interface ProjectMeta { id: string; name: string; updatedAt: number }
// Project lifecycle — also a meter the agent reads to decide the next move.
type ProjectStatus = "inicial" | "construindo" | "dev" | "prod";
// Checklist viva (estilo Golem task-tracking): um item por arquivo planejado.
type TaskState = "pending" | "doing" | "done" | "failed";
interface AgentTask { path: string; purpose?: string; state: TaskState }
interface ProjectSnapshot {
  open: Record<string, OpenFile>;
  tree: TreeItem[];
  activePath: string;
  chat: ChatMsg[];
  repo: string;
  defaultBranch: string;
  workingBranch: string | null;
  protoQuery: string;
  status?: ProjectStatus;
  progress?: number;   // 0..100 — quanto do projeto está pronto
  devUrl?: string | null;   // dev server (localhost) — preenchido pelo executor remoto
  prodUrl?: string | null;  // produção (Vercel)
  committed?: boolean; // já houve ao menos 1 commit/push → libera a publicação na Vercel
  // Memória de projeto (Golem working memory + Bitloops repo memory): stack,
  // decisões e resumo. Injetada no contexto do agente; pode ser apagada.
  memory?: string;
  tasks?: AgentTask[]; // checklist viva do último build
}
// Teto de memória persistida (evita estourar a quota do localStorage).
const MEMORY_MAX = 2000;
const STATUS_LABEL: Record<ProjectStatus, string> = {
  inicial: "inicial", construindo: "construindo", dev: "em desenvolvimento", prod: "em produção",
};
const PROJ_INDEX_KEY = "zaeon.proj.index.v1";
const projKey = (id: string) => "zaeon.proj.v1." + id;
function loadProjIndex(): ProjectMeta[] { try { return JSON.parse(localStorage.getItem(PROJ_INDEX_KEY) || "[]"); } catch { return []; } }
function saveProjIndex(list: ProjectMeta[]) { try { localStorage.setItem(PROJ_INDEX_KEY, JSON.stringify(list)); } catch { /* quota */ } }
function loadSnap(id: string): ProjectSnapshot | null { try { const s = localStorage.getItem(projKey(id)); return s ? JSON.parse(s) : null; } catch { return null; } }
function saveSnap(id: string, snap: ProjectSnapshot) { try { localStorage.setItem(projKey(id), JSON.stringify(snap)); } catch { /* quota */ } }
function newProjectId() { return "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ─── Árvore de pastas (a partir dos caminhos planos) ────────────────────────────
type TreeRow =
  | { type: "dir"; path: string; name: string; depth: number }
  | { type: "file"; path: string; name: string; depth: number; lang: Language; monaco: string };

/** Monta linhas visíveis (pastas primeiro, recursivo), respeitando pastas colapsadas. */
function buildVisibleRows(items: TreeItem[], collapsed: Set<string>): TreeRow[] {
  interface Node { path: string; dirs: Map<string, Node>; files: { name: string; path: string; lang: Language; monaco: string }[] }
  const root: Node = { path: "", dirs: new Map(), files: [] };
  for (const it of items) {
    const parts = it.path.split("/");
    let node = root; let prefix = "";
    for (let i = 0; i < parts.length - 1; i++) {
      const name = parts[i]; prefix = prefix ? `${prefix}/${name}` : name;
      if (!node.dirs.has(name)) node.dirs.set(name, { path: prefix, dirs: new Map(), files: [] });
      node = node.dirs.get(name)!;
    }
    node.files.push({ name: parts[parts.length - 1], path: it.path, lang: it.lang, monaco: it.monaco });
  }
  const out: TreeRow[] = [];
  const walk = (node: Node, depth: number) => {
    for (const dn of [...node.dirs.keys()].sort((a, b) => a.localeCompare(b))) {
      const d = node.dirs.get(dn)!;
      out.push({ type: "dir", path: d.path, name: dn, depth });
      if (!collapsed.has(d.path)) walk(d, depth + 1);
    }
    for (const f of node.files.sort((a, b) => a.name.localeCompare(b.name))) {
      out.push({ type: "file", path: f.path, name: f.name, depth, lang: f.lang, monaco: f.monaco });
    }
  };
  walk(root, 0);
  return out;
}

// ─── GitHub API helper ─────────────────────────────────────────────────────────
async function ghAction(
  actionId: string,
  params: Record<string, any> = {},
  opts: { approved?: boolean; autonomous?: boolean } = {},
): Promise<{ status: number; ok: boolean; data: any }> {
  const res = await fetch("/api/projects/github", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actionId, params, approved: !!opts.approved, autonomous: !!opts.autonomous }),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

/** Pull the file body out of a markdown ```fenced``` block when the agent wraps it. */
function stripFences(t: string): string {
  const m = t.match(/```[\w.-]*\n([\s\S]*?)```/);
  return (m ? m[1] : t).replace(/\s+$/, "") + "\n";
}

// Error/console hook injected into the HTML preview so runtime errors bubble up
// to the agent's self-correction loop (parent window via postMessage).
const PREVIEW_ERR_HOOK =
  "<script>(function(){function s(t){try{parent.postMessage({__zaeon:1,type:'stderr',text:String(t)},'*')}catch(e){}}" +
  "window.addEventListener('error',function(e){s((e.message||'erro')+' @'+(e.filename||'')+':'+(e.lineno||''))});" +
  "window.addEventListener('unhandledrejection',function(e){s('Promise: '+((e.reason&&e.reason.message)||e.reason))});" +
  "var oe=console.error;console.error=function(){s(Array.prototype.join.call(arguments,' '));try{oe&&oe.apply(console,arguments)}catch(e){}};})();<\/script>";

/** Assemble a single runnable HTML doc, inlining workspace CSS/JS by filename. */
function assembleHtml(entryHtml: string, filesArr: { path: string; content: string }[]): string {
  const find = (ref: string) => {
    const clean = ref.replace(/^\.?\//, "").replace(/^\//, "");
    return filesArr.find((f) => f.path === clean || f.path.endsWith("/" + clean) || f.path.split("/").pop() === clean.split("/").pop());
  };
  let html = entryHtml;
  html = html.replace(/<link[^>]*href=["']([^"']+\.css)["'][^>]*>/gi, (m, href) => {
    const f = find(href); return f ? `<style>\n${f.content}\n</style>` : m;
  });
  html = html.replace(/<script[^>]*src=["']([^"']+\.js)["'][^>]*>\s*<\/script>/gi, (m, src) => {
    const f = find(src); return f ? `<script>\n${f.content}\n<\/script>` : m;
  });
  // Inject the error hook as early as possible.
  if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, (m) => m + PREVIEW_ERR_HOOK);
  else if (/<html[^>]*>/i.test(html)) html = html.replace(/<html[^>]*>/i, (m) => m + PREVIEW_ERR_HOOK);
  else html = PREVIEW_ERR_HOOK + html;
  return html;
}

export default function ProjectsContent() {
  const searchParams = useSearchParams();
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [level, setLevel] = useState<Level>("prototype");
  const [model, setModel] = useState<ModelChoice>("auto");

  // ── GitHub workspace state ──────────────────────────────────────────────────
  const [ghConnected, setGhConnected] = useState<boolean | null>(null);
  const [installUrl, setInstallUrl] = useState<string | null>(null);
  const [waitingForInstall, setWaitingForInstall] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const [userConnected, setUserConnected] = useState(false);
  const [userLogin, setUserLogin] = useState<string | null>(null);
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [repo, setRepo] = useState<string>("");
  const [defaultBranch, setDefaultBranch] = useState<string>("");
  const [workingBranch, setWorkingBranch] = useState<string | null>(null);
  const [tree, setTree] = useState<TreeItem[]>([]);
  const [open, setOpen] = useState<Record<string, OpenFile>>({});
  const [activePath, setActivePath] = useState<string>("");
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loadingTree, setLoadingTree] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const [commitMsg, setCommitMsg] = useState("");
  const [committing, setCommitting] = useState(false);
  const [branching, setBranching] = useState(false);
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");
  const [collapsedDirs, setCollapsedDirs] = useState<Set<string>>(new Set());
  const [openingPr, setOpeningPr] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [creatingRepo, setCreatingRepo] = useState(false);
  const [ghMenuOpen, setGhMenuOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);
  useEffect(() => setThemeMounted(true), []);
  const dark = !themeMounted || resolvedTheme !== "light";
  const glassShell = dark ? GLASS_SHELL : GLASS_SHELL_LIGHT;
  const glassPanel = dark ? GLASS_PANEL : GLASS_PANEL_LIGHT;
  const [stepState, setStepState] = useState<Record<number, StepState>>({});
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  // Multi-project + painel direito alternável
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [rightTab, setRightTab] = useState<"agente" | "arquivos">("agente");
  const hydratedRef = useRef(false);
  // Ciclo de vida do projeto (também é o medidor que o agente lê)
  const [projStatus, setProjStatus] = useState<ProjectStatus>("inicial");
  const [projProgress, setProjProgress] = useState(0);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [prodUrl, setProdUrl] = useState<string | null>(null);
  const [committed, setCommitted] = useState(false);
  // Memória de projeto + checklist viva (extraídos de Golem/Bitloops).
  const [memory, setMemory] = useState<string>("");
  const [tasks, setTasks] = useState<AgentTask[]>([]);

  const readRef = workingBranch || defaultBranch || undefined;
  const active: OpenFile | null = activePath ? open[activePath] ?? null : null;
  const dirtyFiles = useMemo(() => Object.values(open).filter((f) => f.dirty), [open]);
  const visibleRows = useMemo(() => buildVisibleRows(tree, collapsedDirs), [tree, collapsedDirs]);
  const toggleDir = useCallback((p: string) => {
    setCollapsedDirs((prev) => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });
  }, []);

  // ── Top-bar project prototyper (⟁ search) ───────────────────────────────────
  const [searchMode, setSearchMode] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");
  const [protoQuery, setProtoQuery] = useState("");
  const [protoBusy, setProtoBusy] = useState(false);
  const [protoTokens, setProtoTokens] = useState(0);
  const [protoElapsed, setProtoElapsed] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const displayName = protoQuery || repo || "Novo projeto";

  // ── Agent panel state ───────────────────────────────────────────────────────
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<PlanStep[]>([]);
  const [diagram, setDiagram] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { run, output, isRunning, isPyodideReady, clearOutput } = useCodeRunner();

  // ── Detect GitHub post-install redirect (?github_installed=true) ───────────
  useEffect(() => {
    const gh = searchParams.get("gh");
    if (searchParams.get("github_installed") === "true" || gh) {
      if (searchParams.get("github_installed") === "true" || gh === "connected") setJustInstalled(true);
      if (gh && gh !== "connected") setWsError(gh === "state" ? "Falha de segurança no OAuth (state). Tente conectar de novo." : gh === "unconfigured" ? "OAuth do GitHub não configurado (CLIENT_ID/SECRET)." : "Falha ao conectar o GitHub.");
      const url = new URL(window.location.href);
      ["github_installed", "action", "gh"].forEach((k) => url.searchParams.delete(k));
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  // ── Probe helper — reutilizado no polling ────────────────────────────────────
  const probeGitHub = useCallback(async (): Promise<boolean> => {
    try {
      const r = await fetch("/api/projects/github");
      setEligible(r.status !== 403);
      if (r.ok) {
        const d = await r.json().catch(() => ({}));
        const connected = !!d.connected;
        setGhConnected(connected);
        setInstallUrl(d.installUrl ?? null);
        setUserConnected(!!d.userConnected);
        setUserLogin(d.userLogin ?? null);
        setConnectUrl(d.connectUrl ?? null);
        return connected;
      }
      setGhConnected(false);
      return false;
    } catch {
      setEligible(true);
      setGhConnected(false);
      return false;
    }
  }, []);

  // Logout do GitHub (apaga o token do usuário) e re-sonda.
  const disconnectGitHub = useCallback(async () => {
    try { await fetch("/api/projects/github/disconnect", { method: "POST" }); } catch { /* ignore */ }
    setUserConnected(false); setUserLogin(null); setRepos([]); setRepo("");
    probeGitHub();
  }, [probeGitHub]);

  // ── Eligibility + connection probe ──────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    probeGitHub().then(() => { if (!alive) return; });
    return () => { alive = false; };
  }, [probeGitHub]);

  // ── Polling enquanto aguardando instalação ────────────────────────────────────
  useEffect(() => {
    if (!waitingForInstall) return;
    const MAX_POLLS = 40; // ~2 min (3s cada)
    let count = 0;
    const interval = setInterval(async () => {
      count++;
      const connected = await probeGitHub();
      if (connected || count >= MAX_POLLS) {
        clearInterval(interval);
        setWaitingForInstall(false);
        if (connected) setJustInstalled(true);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [waitingForInstall, probeGitHub]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat, plan]);
  useEffect(() => { if (searchMode) searchInputRef.current?.focus(); }, [searchMode]);

  // ── Token / elapsed tickers while the prototyper runs (Omega style) ─────────
  useEffect(() => {
    if (!protoBusy) return;
    setProtoTokens(0); setProtoElapsed(0);
    const t0 = Date.now();
    const a = setInterval(() => setProtoTokens((t) => t + 28 + Math.floor(Math.random() * 34)), 90);
    const b = setInterval(() => setProtoElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [protoBusy]);

  // ── Repos / tree / files ────────────────────────────────────────────────────
  const loadRepos = useCallback(async () => {
    setLoadingRepos(true); setWsError(null);
    const { ok, data } = await ghAction("list_repos");
    setLoadingRepos(false);
    if (!ok) { setWsError(data?.error || "Falha ao listar repositórios."); return; }
    const list: RepoInfo[] = data.result ?? [];
    setRepos(list);
    if (list.length && !repo) { setRepo(list[0].fullName); setDefaultBranch(list[0].defaultBranch); }
  }, [repo]);

  useEffect(() => { if (ghConnected) loadRepos(); }, [ghConnected, loadRepos]);

  const loadTree = useCallback(async (repoFull: string, ref?: string) => {
    if (!repoFull) return;
    setLoadingTree(true); setWsError(null);
    const { ok, data } = await ghAction("read_tree", { repo: repoFull, ref });
    setLoadingTree(false);
    if (!ok) { setWsError(data?.error || "Falha ao ler a árvore do repositório."); setTree([]); return; }
    const items: TreeItem[] = data.result ?? [];
    items.sort((a, b) => a.path.localeCompare(b.path));
    setTree(items);
  }, []);

  useEffect(() => {
    if (ghConnected && repo) { setOpen({}); setActivePath(""); loadTree(repo, readRef); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghConnected, repo, workingBranch, defaultBranch]);

  const onSelectRepo = useCallback((full: string) => {
    const info = repos.find((r) => r.fullName === full);
    setRepo(full); setWorkingBranch(null); setDefaultBranch(info?.defaultBranch || "");
  }, [repos]);

  // Cria um novo repositório no GitHub (quando o App tiver permissão) e o seleciona.
  const createRepository = useCallback(async () => {
    const name = (typeof window !== "undefined" ? window.prompt("Nome do novo repositório:") : "")?.trim();
    if (!name) return;
    setCreatingRepo(true); setWsError(null);
    const { ok, data } = await ghAction("create_repo", { name, isPrivate: true });
    setCreatingRepo(false);
    if (!ok) { setWsError(data?.error || "Falha ao criar repositório."); setChat((c) => [...c, { role: "agent", text: `⚠️ ${data?.error || "Falha ao criar repositório."}` }]); return; }
    const full = data?.result?.fullName;
    if (full) { await loadRepos(); setRepo(full); setWorkingBranch(null); setDefaultBranch(data.result.defaultBranch || ""); setChat((c) => [...c, { role: "agent", text: `📦 Repositório criado: ${full}` }]); }
  }, [loadRepos]);

  const openFile = useCallback(async (path: string) => {
    setActivePath(path);
    if (open[path]) return;
    setLoadingFile(true); setWsError(null);
    const { ok, data } = await ghAction("read_file", { repo, ref: readRef, path });
    setLoadingFile(false);
    if (!ok) { setWsError(data?.error || `Falha ao ler ${path}.`); return; }
    const f = data.result;
    setOpen((prev) => ({ ...prev, [path]: { path, lang: f.lang, monaco: f.monaco, body: f.body ?? "", sha: f.sha, dirty: false } }));
  }, [open, repo, readRef]);

  const updateActive = useCallback((body: string) => {
    if (!activePath) return;
    setOpen((prev) => {
      const cur = prev[activePath];
      if (!cur) return prev;
      return { ...prev, [activePath]: { ...cur, body, dirty: body !== cur.body ? true : cur.dirty } };
    });
  }, [activePath]);

  const handleRun = useCallback(() => {
    if (!active || active.lang === "other") return;
    run(active.body, active.lang, Object.values(open).map((f) => ({ path: f.path, content: f.body })));
  }, [active, run, open]);

  // External preview window (a real separate tab) that mirrors the inline preview
  // and LIVE-UPDATES as the agent rebuilds — so you can watch the project grow.
  const previewWindowRef = useRef<Window | null>(null);
  const updatePreview = useCallback((html: string) => {
    setPreviewHtml(html);
    const w = previewWindowRef.current;
    if (w && !w.closed) { try { w.document.open(); w.document.write(html); w.document.close(); } catch { /* cross-origin/closed */ } }
  }, []);
  const openPreviewInNewTab = useCallback(() => {
    const html = previewHtml || (active?.monaco === "html"
      ? assembleHtml(active.body, Object.values(open).map((f) => ({ path: f.path, content: f.body })))
      : null);
    if (!html) return;
    let w = previewWindowRef.current;
    if (!w || w.closed) w = window.open("", "zaeon_preview");
    previewWindowRef.current = w;
    if (w) { try { w.document.open(); w.document.write(html); w.document.close(); w.focus(); } catch { /* popup blocked */ } }
  }, [previewHtml, active, open]);

  // Manually (re)build the HTML preview from the active file + workspace assets.
  const previewActiveHtml = useCallback(() => {
    if (!active || active.monaco !== "html") return;
    const filesArr = Object.values(open).map((f) => ({ path: f.path, content: f.body }));
    updatePreview(assembleHtml(active.body, filesArr));
    setShowPreview(true);
  }, [active, open, updatePreview]);

  // Apply an agent "edit" response into the active file → becomes dirty → Commit.
  // This is the path for the first commit AUTHORED by our agentic AI.
  const applyEditToActive = useCallback((text: string) => {
    if (!activePath) { setWsError("Abra um arquivo da árvore para aplicar a edição da IA."); return; }
    if (!workingBranch) { setWsError("Crie um branch de trabalho antes de aplicar/commitar a edição da IA."); return; }
    updateActive(stripFences(text));
    setWsError(null);
    setChat((c) => [...c, { role: "agent", text: `✍️ Edição da IA aplicada em ${activePath}. Revise no editor e clique em Commit para enviar ao GitHub.` }]);
  }, [activePath, workingBranch, updateActive]);

  // Apply a multi-file AI scaffold into the workspace (new files become tabs).
  const applyEdits = useCallback((files: ScaffoldFile[]) => {
    if (!files?.length) return;
    if (!workingBranch) { setWsError("Crie um branch de trabalho antes de aplicar os arquivos da IA."); return; }
    setOpen((prev) => {
      const next = { ...prev };
      for (const f of files) { const { lang, monaco } = mapPath(f.path); next[f.path] = { path: f.path, lang, monaco, body: f.content, sha: prev[f.path]?.sha, dirty: true }; }
      return next;
    });
    setTree((prev) => {
      const have = new Set(prev.map((t) => t.path));
      const add = files.filter((f) => !have.has(f.path)).map((f) => ({ path: f.path, ...mapPath(f.path) }));
      return add.length ? [...prev, ...add].sort((a, b) => a.path.localeCompare(b.path)) : prev;
    });
    setActivePath(files[0].path);
    setWsError(null);
    setChat((c) => [...c, { role: "agent", text: `✍️ ${files.length} arquivo(s) aplicados em ${workingBranch}. Revise e clique em Commit.` }]);
  }, [workingBranch]);

  // Create a brand-new empty file in the workspace.
  const createNewFile = useCallback(() => {
    const path = newFilePath.trim().replace(/^\/+/, "");
    setShowNewFile(false); setNewFilePath("");
    if (!path) return;
    if (open[path] || tree.some((t) => t.path === path)) { setActivePath(path); return; }
    const { lang, monaco } = mapPath(path);
    setOpen((prev) => ({ ...prev, [path]: { path, lang, monaco, body: "", dirty: true } }));
    setTree((prev) => [...prev, { path, lang, monaco }].sort((a, b) => a.path.localeCompare(b.path)));
    setActivePath(path);
  }, [newFilePath, open, tree]);

  // Raciocínio ligado ao commit (Bitloops): anexa objetivo + memória do agente ao
  // corpo do commit/PR, para o "porquê" ficar rastreável no histórico do Git.
  const buildReasoning = useCallback((): string => {
    const lines: string[] = [];
    if (protoQuery) lines.push(`Objetivo: ${protoQuery}`);
    if (memory) lines.push("", "Contexto/decisões do agente:", memory.slice(0, 1200));
    lines.push("", "🤖 Gerado pela IA agêntica da Zaeon (sala Projetos).");
    return lines.join("\n");
  }, [protoQuery, memory]);

  // Publish the whole generated workspace to GitHub in one go: ensure a working
  // branch exists, then commit every pending file. This is the "subir para o
  // GitHub" step after the autonomous agent builds the structure locally.
  const publishWorkspace = useCallback(async () => {
    if (!repo) { setWsError("Selecione um repositório para subir."); return; }
    const filesToPush = Object.values(open).filter((f) => f.dirty);
    if (!filesToPush.length) { setWsError("Nada novo para subir (nenhum arquivo pendente)."); return; }
    setPublishing(true); setWsError(null);
    let branch = workingBranch;
    if (!branch) {
      const name = `zaeon/${Date.now().toString(36)}`;
      const cb = await ghAction("create_branch", { repo, name, from: defaultBranch || undefined });
      if (!cb.ok) { setPublishing(false); setWsError(cb.data?.error || "Falha ao criar branch."); return; }
      branch = name; setWorkingBranch(name);
      setChat((c) => [...c, { role: "agent", text: `🌿 Branch de trabalho criado: ${name}` }]);
    }
    const subject = commitMsg.trim() || "feat: estrutura inicial gerada pela IA Zaeon";
    const message = `${subject}\n\n${buildReasoning()}`;
    const { ok, data } = await ghAction("commit", { repo, branch, message, files: filesToPush.map((f) => ({ path: f.path, content: f.body })) });
    setPublishing(false);
    if (!ok) { setWsError(data?.error || "Falha ao subir."); return; }
    setOpen((prev) => { const n = { ...prev }; for (const f of filesToPush) if (n[f.path]) n[f.path] = { ...n[f.path], dirty: false }; return n; });
    setCommitMsg("");
    setCommitted(true);
    setChat((c) => [...c, { role: "agent", text: `⬆️ Subido para ${repo} @ ${branch}: ${filesToPush.length} arquivo(s). sha ${String(data?.result?.commitSha || "").slice(0, 7)}. Agora dá pra publicar na Vercel.` }]);
  }, [repo, open, workingBranch, defaultBranch, commitMsg, buildReasoning]);

  // Publica o projeto direto na Vercel (sem VPS) → URL pública = prodUrl.
  const deployToVercel = useCallback(async () => {
    const files = Object.values(open).map((f) => ({ path: f.path, content: f.body }));
    if (!files.length) { setWsError("Nada para publicar."); return; }
    setDeploying(true); setWsError(null);
    setChat((c) => [...c, { role: "agent", text: "⏺ Publicando na Vercel…" }]);
    try {
      const res = await fetch("/api/projects/deploy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: protoQuery || repo || "zaeon-projeto", files }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setWsError(data?.error || "Falha no deploy."); setChat((c) => [...c, { role: "agent", text: `⚠️ ${data?.error || "Falha no deploy."}` }]); return; }
      if (data.url) {
        setProdUrl(data.url); setProjStatus("prod"); setProjProgress(100);
        setChat((c) => [...c, { role: "agent", text: `🚀 No ar na Vercel: ${data.url}\n(o build leva alguns segundos — use “Abrir app”).` }]);
      }
    } catch (e: any) { setWsError(e.message); }
    finally { setDeploying(false); }
  }, [open, protoQuery, repo]);

  // Publica na conta do PRÓPRIO usuário: garante o push no GitHub dele e abre o
  // fluxo de importação da Vercel (vercel.com/new/clone) apontando pro repo dele.
  // Depois desse 1º import, cada push da Zaeon atualiza o deploy na conta dele.
  const openVercelImport = useCallback(async () => {
    if (!repo) {
      setWsError("Conecte o GitHub e selecione o repositório do projeto (aba Arquivos) antes de publicar na Vercel.");
      setRightTab("arquivos");
      return;
    }
    if (dirtyFiles.length) await publishWorkspace(); // versiona o que o agente gerou
    const url = `https://vercel.com/new/clone?repository-url=${encodeURIComponent("https://github.com/" + repo)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setChat((c) => [...c, { role: "agent", text: `▲ Abri a importação na SUA Vercel para ${repo}. Conclua o deploy lá (na sua conta) — a partir daí, cada push da Zaeon atualiza sozinho.` }]);
  }, [repo, dirtyFiles, publishWorkspace]);

  // Open a PR from the working branch (irreversible-ish → approval = the click).
  const openPullRequest = useCallback(async () => {
    if (!repo || !workingBranch) return;
    setOpeningPr(true); setWsError(null);
    const title = commitMsg.trim() || `Zaeon: ${workingBranch}`;
    const { ok, status, data } = await ghAction("open_pr", { repo, head: workingBranch, base: defaultBranch || undefined, title, body: buildReasoning() }, { approved: true });
    setOpeningPr(false);
    if (!ok) { setWsError(data?.error || `Falha ao abrir PR (${status}).`); return; }
    setChat((c) => [...c, { role: "agent", text: `🔀 PR aberto: ${data?.result?.url || "(sem url)"} (#${data?.result?.number ?? "?"})` }]);
  }, [repo, workingBranch, defaultBranch, commitMsg, buildReasoning]);

  // Delete a file from the repo (working branch only) → updates tree/open.
  const deleteRepoFile = useCallback(async (path: string) => {
    if (!repo || !workingBranch) { setWsError("Crie um branch de trabalho para excluir arquivos."); return; }
    if (typeof window !== "undefined" && !window.confirm(`Excluir "${path}" do branch ${workingBranch}?`)) return;
    setWsError(null);
    const { ok, data } = await ghAction("delete_file", { repo, branch: workingBranch, path, message: `chore: remove ${path}` });
    if (!ok) { setWsError(data?.error || "Falha ao excluir."); return; }
    setTree((prev) => prev.filter((t) => t.path !== path));
    setOpen((prev) => { const n = { ...prev }; delete n[path]; return n; });
    if (activePath === path) setActivePath("");
    setChat((c) => [...c, { role: "agent", text: `🗑️ Removido ${path} em ${workingBranch}.` }]);
  }, [repo, workingBranch, activePath]);

  // Rename/move a file (working branch only) → atomic delete+add commit.
  const renameRepoFile = useCallback(async (path: string) => {
    if (!repo || !workingBranch) { setWsError("Crie um branch de trabalho para renomear."); return; }
    const to = (typeof window !== "undefined" ? window.prompt(`Renomear/mover "${path}" para:`, path) : "")?.trim();
    if (!to || to === path) return;
    setWsError(null);
    const { ok, data } = await ghAction("rename_file", { repo, branch: workingBranch, path, to, message: `chore: rename ${path} → ${to}` });
    if (!ok) { setWsError(data?.error || "Falha ao renomear."); return; }
    setTree((prev) => { const others = prev.filter((t) => t.path !== path); return [...others, { path: to, ...mapPath(to) }].sort((a, b) => a.path.localeCompare(b.path)); });
    setOpen((prev) => { const n = { ...prev }; if (n[path]) { n[to] = { ...n[path], path: to, ...mapPath(to) }; delete n[path]; } return n; });
    if (activePath === path) setActivePath(to);
    setChat((c) => [...c, { role: "agent", text: `✏️ ${path} → ${to} em ${workingBranch}.` }]);
  }, [repo, workingBranch, activePath]);

  // Autonomy loop — execute a single plan step against GitHub (human-in-the-loop).
  const executeStep = useCallback(async (step: PlanStep, idx: number) => {
    const a = step.githubAction;
    if (!a) return;
    if (!repo) { setWsError("Selecione um repositório."); return; }
    setStepState((p) => ({ ...p, [idx]: "running" }));
    let params: Record<string, any> = { repo };
    if (a === "create_branch") params = { repo, name: `zaeon/${Date.now().toString(36)}`, from: defaultBranch || undefined };
    else if (a === "commit") {
      if (!workingBranch) { setWsError("Crie um branch de trabalho para commitar."); setStepState((p) => ({ ...p, [idx]: "failed" })); return; }
      if (!dirtyFiles.length) { setWsError("Sem alterações para commitar neste passo."); setStepState((p) => ({ ...p, [idx]: "failed" })); return; }
      params = { repo, branch: workingBranch, message: step.title || "Zaeon commit", files: dirtyFiles.map((f) => ({ path: f.path, content: f.body })) };
    } else if (a === "open_pr") params = { repo, head: workingBranch, base: defaultBranch || undefined, title: step.title || `Zaeon: ${workingBranch}` };
    else if (a === "create_issue") params = { repo, title: step.title || "Zaeon issue", body: step.action || "" };
    else if (a === "comment_pr") { setWsError("comment_pr precisa do número do PR — execute manualmente."); setStepState((p) => ({ ...p, [idx]: "failed" })); return; }

    const { ok, status, data } = await ghAction(a, params, { approved: step.needsApproval, autonomous: !step.needsApproval });
    if (!ok) {
      setStepState((p) => ({ ...p, [idx]: "failed" }));
      setChat((c) => [...c, { role: "agent", text: `⚠️ Passo ${idx + 1} (${a}) falhou: ${data?.error || status}` }]);
      return;
    }
    if (a === "create_branch") setWorkingBranch(params.name);
    if (a === "commit") setOpen((prev) => { const n = { ...prev }; for (const f of dirtyFiles) if (n[f.path]) n[f.path] = { ...n[f.path], dirty: false }; return n; });
    setStepState((p) => ({ ...p, [idx]: "done" }));
    const extra = data?.result?.url ? `: ${data.result.url}` : data?.result?.commitSha ? `: ${String(data.result.commitSha).slice(0, 7)}` : "";
    setChat((c) => [...c, { role: "agent", text: `✅ Passo ${idx + 1} (${a}) ok${extra}` }]);
  }, [repo, defaultBranch, workingBranch, dirtyFiles]);

  const createWorkingBranch = useCallback(async () => {
    if (!repo || !defaultBranch) return;
    setBranching(true); setWsError(null);
    const name = `zaeon/${Date.now().toString(36)}`;
    const { ok, data } = await ghAction("create_branch", { repo, name, from: defaultBranch });
    setBranching(false);
    if (!ok) { setWsError(data?.error || "Falha ao criar branch."); return; }
    setWorkingBranch(name);
  }, [repo, defaultBranch]);

  const commitDirty = useCallback(async () => {
    if (!repo || !workingBranch || !dirtyFiles.length || !commitMsg.trim()) return;
    setCommitting(true); setWsError(null);
    const files = dirtyFiles.map((f) => ({ path: f.path, content: f.body }));
    const message = `${commitMsg.trim()}\n\n${buildReasoning()}`;
    const { ok, data } = await ghAction("commit", { repo, branch: workingBranch, message, files });
    setCommitting(false);
    if (!ok) { setWsError(data?.error || "Falha ao commitar."); return; }
    setOpen((prev) => {
      const next = { ...prev };
      for (const f of dirtyFiles) if (next[f.path]) next[f.path] = { ...next[f.path], dirty: false };
      return next;
    });
    setCommitMsg("");
    setCommitted(true);
    setChat((c) => [...c, { role: "agent", text: `✅ Commit em ${workingBranch}: ${files.length} arquivo(s). sha ${String(data?.result?.commitSha || "").slice(0, 7)}` }]);
  }, [repo, workingBranch, dirtyFiles, commitMsg, buildReasoning]);

  // ── Projetos: persistência (localStorage) + troca/novo/excluir ──────────────
  const hydrateFromSnap = useCallback((s: ProjectSnapshot) => {
    setOpen(s.open || {}); setTree(s.tree || []); setActivePath(s.activePath || "");
    setChat(s.chat || []); setRepo(s.repo || ""); setDefaultBranch(s.defaultBranch || "");
    setWorkingBranch(s.workingBranch || null); setProtoQuery(s.protoQuery || "");
    setProjStatus(s.status || "inicial"); setProjProgress(s.progress || 0);
    setDevUrl(s.devUrl ?? null); setProdUrl(s.prodUrl ?? null); setCommitted(!!s.committed);
    setMemory(s.memory || ""); setTasks(s.tasks || []);
    setPlan([]); setDiagram(null);
  }, []);

  // Hidratação inicial: carrega o projeto mais recente ou cria um vazio.
  useEffect(() => {
    if (hydratedRef.current) return;
    const idx = loadProjIndex();
    if (idx.length) {
      const sorted = [...idx].sort((a, b) => b.updatedAt - a.updatedAt);
      setProjects(idx); setProjectId(sorted[0].id);
      const snap = loadSnap(sorted[0].id); if (snap) hydrateFromSnap(snap);
    } else {
      const id = newProjectId(); const meta = { id, name: "Novo projeto", updatedAt: Date.now() };
      setProjects([meta]); setProjectId(id); saveProjIndex([meta]);
    }
    hydratedRef.current = true;
  }, [hydrateFromSnap]);

  // Autosave (debounced) do projeto atual sempre que o working set muda.
  useEffect(() => {
    if (!hydratedRef.current || !projectId) return;
    const t = setTimeout(() => {
      saveSnap(projectId, { open, tree, activePath, chat, repo, defaultBranch, workingBranch, protoQuery, status: projStatus, progress: projProgress, devUrl, prodUrl, committed, memory, tasks });
      const name = protoQuery || repo || "Novo projeto";
      setProjects((prev) => { const next = prev.map((p) => (p.id === projectId ? { ...p, name, updatedAt: Date.now() } : p)); saveProjIndex(next); return next; });
    }, 600);
    return () => clearTimeout(t);
  }, [open, tree, activePath, chat, repo, defaultBranch, workingBranch, protoQuery, projStatus, projProgress, devUrl, prodUrl, committed, memory, tasks, projectId]);

  const flushCurrent = useCallback(() => {
    if (projectId) saveSnap(projectId, { open, tree, activePath, chat, repo, defaultBranch, workingBranch, protoQuery, status: projStatus, progress: projProgress, devUrl, prodUrl, committed, memory, tasks });
  }, [projectId, open, tree, activePath, chat, repo, defaultBranch, workingBranch, protoQuery, projStatus, projProgress, devUrl, prodUrl, committed, memory, tasks]);

  const newProject = useCallback(() => {
    flushCurrent();
    const id = newProjectId(); const meta = { id, name: "Novo projeto", updatedAt: Date.now() };
    setProjects((prev) => { const next = [meta, ...prev]; saveProjIndex(next); return next; });
    setProjectId(id);
    setOpen({}); setTree([]); setActivePath(""); setChat([]); setProtoQuery("");
    setWorkingBranch(null); setPlan([]); setDiagram(null); setShowPreview(false); setPreviewHtml(null);
    setProjStatus("inicial"); setProjProgress(0); setDevUrl(null); setProdUrl(null); setCommitted(false);
    setMemory(""); setTasks([]);
    setSearchMode(true);
  }, [flushCurrent]);

  const switchProject = useCallback((id: string) => {
    if (id === projectId) return;
    flushCurrent();
    setProjectId(id);
    const snap = loadSnap(id);
    if (snap) hydrateFromSnap(snap);
    else { setOpen({}); setTree([]); setActivePath(""); setChat([]); setProtoQuery(""); setWorkingBranch(null); setPlan([]); setDiagram(null); setShowPreview(false); setPreviewHtml(null); setMemory(""); setTasks([]); }
  }, [projectId, flushCurrent, hydrateFromSnap]);

  const deleteProject = useCallback((id: string) => {
    if (typeof window !== "undefined" && !window.confirm("Excluir este projeto do navegador? (não afeta o GitHub)")) return;
    try { localStorage.removeItem(projKey(id)); } catch { /* ignore */ }
    const remaining = projects.filter((p) => p.id !== id);
    saveProjIndex(remaining); setProjects(remaining);
    if (id === projectId) {
      if (remaining.length) { const t = [...remaining].sort((a, b) => b.updatedAt - a.updatedAt)[0]; setProjectId(t.id); const s = loadSnap(t.id); if (s) hydrateFromSnap(s); }
      else { const nid = newProjectId(); const meta = { id: nid, name: "Novo projeto", updatedAt: Date.now() }; setProjects([meta]); saveProjIndex([meta]); setProjectId(nid); setOpen({}); setTree([]); setActivePath(""); setChat([]); setProtoQuery(""); setWorkingBranch(null); setMemory(""); setTasks([]); }
    }
  }, [projects, projectId, hydrateFromSnap]);

  // ── Memória de projeto (Golem working memory + Bitloops repo memory) ─────────
  // Apaga a memória e o checklist do projeto atual (a "lógica de apagar de memória").
  const clearMemory = useCallback(() => {
    if (typeof window !== "undefined" && !window.confirm("Limpar a memória do agente neste projeto? (decisões/stack que ele lembra; não apaga os arquivos)")) return;
    setMemory(""); setTasks([]);
    setChat((c) => [...c, { role: "agent", text: "🧹 Memória do projeto apagada. Vou recomeçar o contexto do zero no próximo pedido." }]);
  }, []);

  // Anima o código surgindo no editor (efeito "sendo escrito em tempo real").
  const typeFileIn = useCallback(async (path: string, content: string) => {
    const { lang, monaco } = mapPath(path);
    setTree((prev) => (prev.some((t) => t.path === path) ? prev : [...prev, { path, lang, monaco }].sort((a, b) => a.path.localeCompare(b.path))));
    setActivePath(path);
    setOpen((prev) => ({ ...prev, [path]: { path, lang, monaco, body: "", sha: prev[path]?.sha, dirty: true } }));
    const steps = 14;
    for (let i = 1; i <= steps; i++) {
      const slice = content.slice(0, Math.ceil((content.length * i) / steps));
      setOpen((prev) => (prev[path] ? { ...prev, [path]: { ...prev[path], body: slice } } : prev));
      await new Promise((r) => setTimeout(r, 40));
    }
    setOpen((prev) => (prev[path] ? { ...prev, [path]: { ...prev[path], body: content } } : prev));
  }, []);

  // Populate the in-browser workspace from AI files WITHOUT a GitHub branch
  // (autonomous build is local; committing to GitHub stays a separate step).
  const applyEditsLocal = useCallback((files: ScaffoldFile[]) => {
    if (!files?.length) return;
    setOpen((prev) => {
      const next = { ...prev };
      for (const f of files) { const { lang, monaco } = mapPath(f.path); next[f.path] = { path: f.path, lang, monaco, body: f.content, sha: prev[f.path]?.sha, dirty: true }; }
      return next;
    });
    setTree((prev) => {
      const have = new Set(prev.map((t) => t.path));
      const add = files.filter((f) => !have.has(f.path)).map((f) => ({ path: f.path, ...mapPath(f.path) }));
      return add.length ? [...prev, ...add].sort((a, b) => a.path.localeCompare(b.path)) : prev;
    });
  }, []);

  // ── Autonomous coding agent (Claude Code / Antigravity / Codex style) ────────
  // Triggered from the ⟁ bar. Acts with full authority: analyze → build files →
  // run in-browser → self-correct on errors, narrating each step to the user.
  const runProject = useCallback(async (q: string) => {
    const goal = q.trim();
    if (!goal || protoBusy) return;
    // Cada pesquisa = um NOVO projeto (novo workspace), se o atual já tem conteúdo.
    if (Object.keys(open).length > 0 || protoQuery.trim()) {
      flushCurrent();
      const id = newProjectId(); const meta = { id, name: goal, updatedAt: Date.now() };
      setProjects((prev) => { const next = [meta, ...prev]; saveProjIndex(next); return next; });
      setProjectId(id);
      setOpen({}); setTree([]); setActivePath(""); setChat([]); setWorkingBranch(null); setDevUrl(null); setProdUrl(null);
      setMemory(""); setTasks([]);
    }
    setProtoQuery(goal); setSearchMode(false); setSearchDraft("");
    setProtoBusy(true); setPlan([]); setDiagram(null); setTasks([]); setRightTab("agente");
    setProjStatus("construindo"); setProjProgress(6);
    // ── Memória local do run (Bitloops/Golem): acumula decisões e é injetada nos
    // prompts pra reduzir retrabalho; persiste ao final via setMemory. ──────────
    let memBuf = memory || "";
    const remember = (line: string) => { memBuf = (memBuf ? memBuf + "\n" : "") + line; if (memBuf.length > MEMORY_MAX) memBuf = memBuf.slice(memBuf.length - MEMORY_MAX); };
    // ── Guardrails (Golem): teto de chamadas + gate de falhas consecutivas. ─────
    const MAX_CALLS = 26;
    let calls = 0;
    let aborted = false;

    const say = (text: string, extra: Partial<ChatMsg> = {}) =>
      setChat((c) => [...c, { role: "agent", text, ...extra }]);
    const agentCall = async (payload: Record<string, any>): Promise<any> => {
      // Guardrail: nunca passa do teto de chamadas por run (evita loop infinito).
      if (calls >= MAX_CALLS) { aborted = true; return { ok: false, error: "limite de chamadas do agente atingido (guardrail)" }; }
      calls++;
      // Force the fast Gemini (flash) tier so every call fits the 10s Vercel cap
      // (avoids routing the analysis step to the slower pro/opus tier).
      // Injeta a memória do projeto como contexto (quando o passo não traz um próprio).
      const withCtx = memBuf && !payload.context ? { context: `MEMÓRIA DO PROJETO:\n${memBuf}`, ...payload } : payload;
      const res = await fetch("/api/projects/agent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceModel: model === "auto" ? "gemini" : model, ...withCtx }),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, ...data };
    };
    const isRunnable = (p: string) => { const { lang } = mapPath(p); return lang === "python" || lang === "javascript" || lang === "typescript" || lang === "html"; };
    const pickRunnable = (files: ScaffoldFile[], hint?: string) => {
      const order = [hint, "main.py", "app.py", "index.js", "main.js", "index.html"].filter(Boolean) as string[];
      for (const cand of order) { const f = files.find((x) => x.path === cand); if (f && isRunnable(f.path)) return { ...mapPath(f.path), path: f.path, body: f.content }; }
      const f = files.find((x) => isRunnable(x.path));
      return f ? { ...mapPath(f.path), path: f.path, body: f.content } : null;
    };
    // Render an HTML app in the live preview iframe and collect console/runtime
    // errors (via PREVIEW_ERR_HOOK) so the agent can self-correct what it sees.
    const runHtmlPreview = (assembled: string): Promise<string[]> => new Promise((resolve) => {
      const errors: string[] = [];
      const handler = (ev: MessageEvent) => { const d: any = ev.data; if (d && d.__zaeon && d.type === "stderr") errors.push(String(d.text)); };
      window.addEventListener("message", handler);
      updatePreview(assembled); setShowPreview(true);
      setTimeout(() => { window.removeEventListener("message", handler); resolve(errors); }, 2200);
    });

    setChat((c) => [...c, { role: "user", text: `🚀 ${goal}` }]);
    const files: ScaffoldFile[] = [];
    let entry: string | undefined;
    try {
      // ── Phase 1 — PLAN the file list only (1 small, fast call) ──────────────
      say("⏺ Planejando os arquivos do projeto…");
      const plan = await agentCall({ task: "filelist", prompt: goal });
      if (!plan.ok || !Array.isArray(plan.files) || !plan.files.length) {
        say(`⚠️ Não consegui planejar o projeto: ${plan.error || "resposta vazia"}`); return;
      }
      const planned: { path: string; purpose?: string }[] = plan.files.slice(0, 6);
      // Models sometimes return entry as a run command ("python main.py") — keep just the path.
      entry = (plan.entry || "").replace(/^\s*(python3?|node|deno|bun|sh|bash)\s+/i, "").trim() || undefined;
      if (plan.content) say(plan.content, { routing: plan.routing ? `${plan.routing.model} · ${plan.routing.provider}` : undefined });
      say("Vou criar:\n" + planned.map((f) => `• ${f.path}${f.purpose ? ` — ${f.purpose}` : ""}`).join("\n"));
      // Memória: registra objetivo + stack escolhida (entra no contexto dos próximos passos).
      remember(`Objetivo: ${goal}`);
      if (entry) remember(`Arquivo de entrada: ${entry}`);
      if (plan.content) remember(`Plano: ${String(plan.content).slice(0, 240)}`);
      // Checklist viva: um item por arquivo planejado (pending → doing → done/failed).
      setTasks(planned.map((f) => ({ path: f.path, purpose: f.purpose, state: "pending" as TaskState })));
      const markTask = (path: string, state: TaskState) => setTasks((prev) => prev.map((t) => (t.path === path ? { ...t, state } : t)));
      setProjProgress(12);

      // ── Phase 2 — build FILE BY FILE (one small call each, com retry) ───────
      const planCtx = planned.map((f) => `- ${f.path}: ${f.purpose || ""}`).join("\n");
      const failed: string[] = [];
      const genOne = async (path: string): Promise<string | undefined> => {
        let prev = "";
        for (let t = 1; t <= 2; t++) {
          if (aborted) return undefined;
          const builtCtx = files.map((f) => `### ${f.path}\n${f.content}`).join("\n\n").slice(0, 5000);
          const remaining = planned.filter((p) => p.path !== path && !files.some((f) => f.path === p.path)).map((p) => p.path);
          const nudge = t > 1 ? "\n\nATENÇÃO: a tentativa anterior veio vazia ou repetida — gere conteúdo NOVO, específico e completo para ESTE arquivo." : "";
          const gf = await agentCall({
            task: "genfile", level: "implementation", targetPath: path,
            prompt: `Objetivo do projeto: ${goal}\n\nArquivos planejados:\n${planCtx}\n\nFalta criar: ${remaining.join(", ") || "(só este)"}\n\nJá criados:\n${builtCtx || "(nenhum ainda)"}\n\nGere o conteúdo COMPLETO de "${path}".${nudge}`,
          });
          const c: string | undefined = gf?.file?.content;
          if (gf.ok && typeof c === "string" && c.trim()) {
            // Stale/duplicate guard (Golem): rejeita conteúdo idêntico a outro arquivo
            // ou à tentativa anterior — sintoma de modelo "travado".
            const dup = (prev && c.trim() === prev.trim()) || files.some((f) => f.content.trim() === c.trim());
            if (dup && t < 2) { prev = c; say(`… ${path} veio repetido, tentando variar…`); continue; }
            return c;
          }
          prev = c || prev;
          if (t < 2) say(`… ${path} veio vazio, tentando de novo…`);
        }
        return undefined;
      };
      let doneCount = 0;
      let consecFails = 0; // gate de falhas consecutivas (Golem tool-error gate)
      for (const pf of planned) {
        if (aborted) { say("⛔ Parei: atingi o teto de chamadas do agente neste run (guardrail anti-loop)."); break; }
        markTask(pf.path, "doing");
        say(`⏺ Criando ${pf.path}…`);
        const content = await genOne(pf.path);
        if (!content) {
          failed.push(pf.path); markTask(pf.path, "failed"); consecFails++;
          say(`⚠️ Não consegui criar ${pf.path} após 2 tentativas — vou tentar recuperar antes de testar.`);
          if (consecFails >= 3) { aborted = true; say("⛔ Três arquivos seguidos falharam — pausando o build pra não rodar à toa. Me diga como prefere seguir."); break; }
          continue;
        }
        consecFails = 0;
        files.push({ path: pf.path, content });
        await typeFileIn(pf.path, content); // código surgindo em tempo real no editor
        markTask(pf.path, "done");
        doneCount++;
        setProjProgress(12 + Math.round((doneCount / planned.length) * 68)); // 12 → 80
        say(`✓ ${pf.path} — ${content.split("\n").length} linhas`);
      }
      // Segunda passada nos que faltaram — não declaramos sucesso com arquivos faltando.
      for (const path of [...failed]) {
        if (aborted) break;
        say(`⏺ Recriando ${path}…`);
        const content = await genOne(path);
        if (content) { files.push({ path, content }); await typeFileIn(path, content); markTask(path, "done"); failed.splice(failed.indexOf(path), 1); say(`✓ ${path} recriado`); }
      }
      // Memória: registra o resultado do build (entra no contexto de pedidos futuros).
      remember(`Arquivos criados (${files.length}): ${files.map((f) => f.path).join(", ")}`);
      if (failed.length) remember(`Faltaram: ${failed.join(", ")}`);
      setProjProgress((p) => Math.max(p, 82));
      if (!files.length) { say("⚠️ Nenhum arquivo foi criado."); return; }
      if (failed.length) say(`⚠️ Faltaram: ${failed.join(", ")} — o app pode não funcionar 100%. Posso tentar recriá-los de novo se você pedir.`);

      // ── Phase 3 — testar de verdade: HTML abre PREVIEW visual; Python/JS no terminal — e corrigir o arquivo que falha ─
      for (let attempt = 1; attempt <= 2; attempt++) {
        const r = pickRunnable(files, entry);
        if (!r) {
          const exts = Array.from(new Set(files.map((f) => f.path.split(".").pop()).filter(Boolean)));
          say(`ℹ️ Projeto criado (${files.length} arquivos: ${exts.join(", ")}). Essa stack roda no executor remoto (em breve) — no navegador rodam HTML/CSS/JS e Python. Por ora você revisa o código e usa “Subir para o GitHub”.`);
          break;
        }
        setActivePath(r.path);
        let errs = "";
        if (r.lang === "html") {
          // Sem preview: apps web rodam de verdade no dev server (executor remoto).
          setProjProgress((p) => Math.max(p, 85));
          say(`✅ App web montado (${r.path}).${failed.length ? ` (faltaram: ${failed.join(", ")})` : ""} Suba o dev server e use “Abrir app”, ou “Subir para o GitHub”.`);
          break;
        } else {
          say(`⏺ Rodando ${r.path}…${attempt > 1 ? ` (retry ${attempt})` : ""}`);
          const outputs = await run(r.body, r.lang, files);
          errs = outputs.filter((o) => o.type === "stderr").map((o) => o.text).join("\n").trim();
          if (!errs) { setProjProgress((p) => Math.max(p, 92)); say(`✅ ${r.path} rodou sem erros.${failed.length ? ` (faltaram: ${failed.join(", ")})` : " Projeto pronto — use “Subir para o GitHub”."}`); break; }
        }
        if (attempt === 2) { say(`⚠️ Ainda há erro:\n${errs.slice(0, 400)}\nMe diga como prefere seguir.`); break; }
        say(`⏺ Corrigindo ${r.path}:\n${errs.slice(0, 250)}`);
        const otherCtx = files.filter((f) => f.path !== r.path).map((f) => `### ${f.path}\n${f.content}`).join("\n\n").slice(0, 4000);
        const fix = await agentCall({
          task: "genfile", level: "implementation", targetPath: r.path,
          prompt: `Objetivo: ${goal}\n\nERRO em ${r.path}:\n${errs}\n\nConteúdo atual de ${r.path}:\n${r.body}\n\nOutros arquivos:\n${otherCtx}\n\nCorrija "${r.path}" para o app rodar sem erros.`,
        });
        const fixed: string | undefined = fix?.file?.content;
        if (!fix.ok || typeof fixed !== "string" || !fixed.trim()) { say(`⚠️ Não consegui corrigir ${r.path}: ${fix.error || "vazio"}`); break; }
        const idx = files.findIndex((f) => f.path === r.path);
        if (idx >= 0) files[idx] = { path: r.path, content: fixed };
        applyEditsLocal([{ path: r.path, content: fixed }]);
        say(`✓ ${r.path} corrigido`);
      }
    } catch (e: any) {
      say(`Erro: ${e.message}`);
    } finally {
      setMemory(memBuf);   // persiste a memória acumulada deste run
      setProtoBusy(false);
    }
  }, [protoBusy, model, run, open, protoQuery, memory, flushCurrent, typeFileIn]);

  // ── Agent panel (per-file chat) ─────────────────────────────────────────────
  const taskFor = useCallback((text: string): string => {
    const t = text.toLowerCase();
    if (level === "prototype") return /diagrama|arquitetura|fluxo|er |sequ[êe]ncia|c4/.test(t) ? "diagram" : "doc";
    if (level === "autonomy") return "plan";
    if (/scaffold|estrutur|boilerplate|esqueleto|gere os arquivos|crie .*(projeto|app|estrutura|arquivos)/.test(t)) return "scaffold";
    if (/refator/.test(t)) return "refactor";
    if (/arquitet|decis[ãa]o|trade-?off/.test(t)) return "architecture";
    if (/bug|erro|debug|falha/.test(t)) return "debug";
    return "edit";
  }, [level]);

  const send = useCallback(async () => {
    const q = prompt.trim();
    if (!q || busy) return;
    setBusy(true); setPrompt("");
    setChat((c) => [...c, { role: "user", text: q }]);
    setPlan([]); setDiagram(null);
    try {
      const mem = memory ? `MEMÓRIA DO PROJETO:\n${memory}\n\n` : "";
      const ctx = active
        ? `${mem}Repo: ${repo || "—"} @ ${readRef || "—"}\nArquivo ativo: ${active.path}\n\`\`\`\n${active.body.slice(0, 4000)}\n\`\`\``
        : `${mem}Repo: ${repo || "—"} @ ${readRef || "—"}\n(nenhum arquivo aberto)`;
      const res = await fetch("/api/projects/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, task: taskFor(q), prompt: q, context: ctx, forceModel: model === "auto" ? undefined : model }),
      });
      const data = await res.json();
      if (!res.ok) { setChat((c) => [...c, { role: "agent", text: `⚠️ ${data.error ?? "Falha."}` }]); return; }
      const routing = data.routing
        ? `${data.routing.model}${data.routing.fallbackFrom ? ` (fallback de ${data.routing.fallbackFrom})` : ""} · ${data.routing.provider}`
        : undefined;
      if (data.kind === "plan" && Array.isArray(data.plan)) {
        setStepState({});
        setPlan(data.plan);
        setChat((c) => [...c, { role: "agent", text: data.content || "Plano proposto:", routing, kind: "plan" }]);
      } else if (data.kind === "edits" && Array.isArray(data.files)) {
        setChat((c) => [...c, { role: "agent", text: data.content || `Estrutura proposta: ${data.files.length} arquivo(s).`, routing, kind: "edits", files: data.files }]);
      } else if (data.kind === "diagram") {
        setDiagram(data.content);
        setChat((c) => [...c, { role: "agent", text: "Diagrama gerado (Mermaid) ↓", routing, kind: "diagram" }]);
      } else {
        setChat((c) => [...c, { role: "agent", text: data.content, routing, kind: data.kind }]);
      }
    } catch (e: any) {
      setChat((c) => [...c, { role: "agent", text: `Erro: ${e.message}` }]);
    } finally { setBusy(false); }
  }, [prompt, busy, level, model, active, repo, readRef, memory, taskFor]);

  // ─── Gate fallback ───────────────────────────────────────────────────────────
  if (eligible === false) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="max-w-md text-center rounded-[22px] p-8" style={glassShell}>
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-violet-900/40 border border-violet-500/30 mb-4">
            <Lock size={22} className="text-violet-300" />
          </div>
          <h3 className="text-base font-black text-white mb-2">{NOT_ELIGIBLE_COPY.title}</h3>
          <p className="text-xs leading-relaxed text-slate-400 mb-5">{NOT_ELIGIBLE_COPY.body}</p>
          <a href="/research-lab?tab=profile"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all"
            style={{ background: "linear-gradient(180deg,#8b5cf6,#6d28d9)" }}>
            {NOT_ELIGIBLE_COPY.cta} <ChevronRight size={14} />
          </a>
        </div>
      </div>
    );
  }

  if (eligible === null) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs gap-2">
        <Loader2 size={14} className="animate-spin" /> Verificando acesso…
      </div>
    );
  }

  // GitHub pill rendering helper
  const ghReady = repos.length > 0;
  const ghBusy = committing || publishing; // commit/push em processamento → ícone pisca roxo
  const agentThinking = busy || protoBusy;  // agente pensando → luz roxa; senão ciano (pronto)

  // ─── IDE ───────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full flex flex-col gap-3 rounded-[22px] overflow-hidden p-3" style={glassShell}>

      {/* ── Top frame (compacto): seletor de projeto + barra ⟁ + GitHub pill ── */}
      <div
        className="shrink-0 px-3 py-2 rounded-[1.4rem] relative overflow-hidden"
        style={{ background: "linear-gradient(90deg, rgba(139,92,246,0.16), rgba(34,211,238,0.05))", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)" }}
      >
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-violet-400/10 rounded-full blur-[55px] pointer-events-none" />

        {/* Row 1 — ORDEM: barra de pesquisa/progresso (⟁) → projeto → repositório → (modelo + GitHub à direita) */}
        <div className="relative z-10 flex items-center gap-2.5 flex-wrap">
          {/* ⟁ trigger (hidden while the prototyper renders — GlitchTerm carries its own mark) */}
          {!protoBusy && (
            <button
              onClick={() => setSearchMode((s) => !s)}
              aria-label="Abrir barra de prototipação"
              className="relative inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-full hover:bg-white/5 transition-colors"
              title="Clique para descrever e desenvolver um projeto"
            >
              <span
                className="text-cyan-300 text-base leading-none animate-[spin_14s_linear_infinite] motion-reduce:animate-none"
                style={{ filter: "drop-shadow(0 0 4px rgba(34,211,238,0.55))" }}
              >⟁</span>
            </button>
          )}

          {/* Center — barra de pesquisa / progresso (ocupa o espaço; resto vai pro lado) */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {protoBusy ? (
                <motion.div key="glitch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3 min-w-0 h-7 overflow-hidden">
                  <div className="min-w-0 flex-1"><GlitchTerm term={protoQuery.length > 42 ? protoQuery.slice(0, 42) + "…" : protoQuery} compact /></div>
                  <span className="text-[10px] font-mono text-cyan-300/90 tabular-nums shrink-0">
                    {protoTokens.toLocaleString("pt-BR")} <span className="text-white/30">tok · {protoElapsed}s</span>
                  </span>
                </motion.div>
              ) : searchMode ? (
                <motion.div key="input" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                  <input
                    ref={searchInputRef}
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") runProject(searchDraft); if (e.key === "Escape") setSearchMode(false); }}
                    placeholder="Descreva um novo projeto…"
                    className="flex-1 min-w-0 bg-transparent border-none text-sm text-slate-100 placeholder:text-white/35 outline-none"
                  />
                  <button
                    onClick={() => runProject(searchDraft)}
                    disabled={!searchDraft.trim()}
                    aria-label="Desenvolver"
                    className="w-8 h-8 shrink-0 rounded-full text-white flex items-center justify-center disabled:opacity-50 transition-transform hover:scale-105"
                    style={{ background: "linear-gradient(135deg,#8b5cf6,#6d28d9)", boxShadow: "0 6px 16px -6px rgba(139,92,246,0.8)" }}
                  ><ArrowUp size={15} /></button>
                </motion.div>
              ) : (
                <motion.button
                  key="bar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setSearchMode(true)}
                  className="group w-full flex items-center gap-2.5 min-w-0 text-left"
                  title="Clique para descrever um novo projeto"
                >
                  {/* Barra de progresso do projeto — destacada (só %) */}
                  <div className="flex-1 min-w-0 h-2 rounded-full overflow-hidden bg-black/10 dark:bg-white/10" style={{ boxShadow: "inset 0 1px 1px rgba(0,0,0,0.15)" }}>
                    <div className="h-full rounded-full transition-[width] duration-700"
                      style={{ width: `${Math.max(2, Math.min(100, projProgress))}%`, background: "linear-gradient(90deg,#8b5cf6,#22d3ee)", boxShadow: "0 0 10px rgba(34,211,238,.75), inset 0 1px 0 rgba(255,255,255,0.4)" }} />
                  </div>
                  <span className="shrink-0 text-[11px] font-black tabular-nums text-slate-700 dark:text-white/70 group-hover:text-slate-900 dark:group-hover:text-white">
                    {Math.round(projProgress)}%
                  </span>
                  {(devUrl || prodUrl) && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400" title={prodUrl ? "em produção" : "dev no ar"} />}
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Seletor de PROJETO (o projeto criado) */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="relative">
              <select value={projectId} onChange={(e) => switchProject(e.target.value)}
                title="Seus projetos (salvos no navegador)"
                className="appearance-none max-w-[140px] bg-black/5 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-lg pl-2 pr-5 py-1 text-[10px] font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-violet-500/50 truncate">
                {projects.length === 0 && <option value="">Projeto</option>}
                {[...projects].sort((a, b) => b.updatedAt - a.updatedAt).map((p) => (
                  <option key={p.id} value={p.id}>{p.name || "Projeto"}</option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
            <button onClick={newProject} title="Novo projeto"
              className="p-1 rounded-lg border border-black/10 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all"><Plus size={12} /></button>
            {projects.length > 1 && (
              <button onClick={() => deleteProject(projectId)} title="Excluir projeto atual"
                className="p-1 rounded-lg border border-black/10 dark:border-white/10 text-slate-500 hover:text-rose-400 transition-all"><Trash2 size={11} /></button>
            )}
            <div className="w-px h-5 bg-black/10 dark:bg-white/10 mx-0.5" />
          </div>

          {/* Seletor de REPOSITÓRIO atual (+ novo repo) */}
          <div className="flex items-center gap-1 shrink-0">
            <FolderGit2 size={12} className="text-violet-500 dark:text-violet-300" />
            <div className="relative">
              <select value={repo} onChange={(e) => onSelectRepo(e.target.value)} disabled={!ghConnected || loadingRepos}
                title="Repositório (GitHub) deste projeto"
                className="appearance-none max-w-[160px] bg-black/5 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-lg pl-2 pr-5 py-1 text-[10px] font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-violet-500/50 disabled:opacity-50 truncate">
                {!repo && <option value="">{loadingRepos ? "carregando…" : ghConnected ? "selecione o repo" : "GitHub off"}</option>}
                {repos.map((r) => <option key={r.fullName} value={r.fullName}>{r.fullName}</option>)}
              </select>
              <ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
            <button onClick={createRepository} disabled={!ghConnected || creatingRepo} title="Criar novo repositório"
              className="p-1 rounded-lg border border-black/10 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 transition-all">
              {creatingRepo ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
            </button>
          </div>

          {/* Right — model selector (agente autônomo: sem abas de nível) */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 p-1 rounded-[13px]" style={{ background: "rgba(0,0,0,0.28)", border: "1px solid rgba(255,255,255,0.10)" }}>
              <Sparkles size={11} className="text-violet-300 ml-1" />
              {MODELS.map((m) => (
                <button key={m.id} onClick={() => !m.locked && setModel(m.id)} disabled={m.locked}
                  title={m.locked ? "Travado — tier Anthropic desligado neste ambiente (só Gemini ativo)" : undefined}
                  className="inline-flex items-center gap-1 px-2 h-7 rounded-[10px] text-[9px] font-bold transition-all disabled:cursor-not-allowed"
                  style={model === m.id ? PILL_ACTIVE : { color: m.locked ? "#5b5b72" : "#9595b4", background: "transparent", border: "1px solid transparent" }}>
                  {m.locked && <Lock size={8} />}{m.label}
                </button>
              ))}
            </div>

            {/* Botão GitHub — círculo escuro estilo GitHub (nítido em claro e escuro).
                Anel VERDE = logado/ativo · anel VERMELHO pulsando = deslogado. Hover (logado) = logout. */}
            <div className="relative group/gh shrink-0">
              {ghConnected === null ? (
                <span className="w-9 h-9 rounded-full flex items-center justify-center bg-[#0d1117] text-white/60 border border-white/15">
                  <Loader2 size={16} className="animate-spin" />
                </span>
              ) : userConnected ? (
                <>
                  <button onClick={() => setGhMenuOpen((v) => !v)}
                    title={ghBusy ? "Processando no GitHub…" : userLogin ? `GitHub: @${userLogin} — clique para opções` : "GitHub conectado"}
                    className={`w-9 h-9 rounded-full flex items-center justify-center bg-[#0d1117] text-white transition-transform hover:scale-105 ${ghBusy ? "animate-pulse" : ""}`}
                    style={ghBusy
                      ? { border: "2px solid #8b5cf6", boxShadow: "0 0 0 2px rgba(139,92,246,0.35), 0 0 16px rgba(139,92,246,0.8)" }   // roxo = processando
                      : { border: "2px solid #22d3ee", boxShadow: "0 0 0 2px rgba(34,211,238,0.28), 0 0 14px rgba(34,211,238,0.6)" }}>  {/* ciano = conectado/estável */}
                    <Github size={18} />
                  </button>
                  {ghMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setGhMenuOpen(false)} />
                      {/* abre na HORIZONTAL, à esquerda do ícone (na mesma linha) — não é cortado pelo overflow do frame */}
                      <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 z-50 flex items-center gap-1 h-9 px-1.5 rounded-full whitespace-nowrap"
                        style={{ background: "rgba(15,15,28,0.97)", border: "1px solid rgba(255,255,255,0.16)", boxShadow: "0 8px 28px -10px rgba(0,0,0,0.85)" }}>
                        <span className="text-[10px] font-bold text-slate-200 px-1.5">{userLogin ? `@${userLogin}` : "conectado"}</span>
                        <button onClick={() => { setGhMenuOpen(false); disconnectGitHub(); }}
                          className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[10px] font-black text-white transition-transform hover:scale-105"
                          style={{ background: "linear-gradient(135deg,#f43f5e,#9f1239)", boxShadow: "0 0 10px rgba(244,63,94,0.5)" }}>
                          <LogOut size={11} /> Sair
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : connectUrl ? (
                <a href={connectUrl} title="Conectar GitHub (login na sua conta)"
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-[#0d1117] text-white transition-transform animate-pulse hover:animate-none hover:scale-105"
                  style={{ border: "2px solid #f43f5e", boxShadow: "0 0 0 2px rgba(244,63,94,0.25), 0 0 14px rgba(244,63,94,0.65)" }}>
                  <Github size={18} />
                </a>
              ) : installUrl ? (
                <button onClick={() => { window.open(installUrl, "_blank", "noopener,noreferrer"); setWaitingForInstall(true); }}
                  title="Instalar o app no seu GitHub"
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-[#0d1117] text-white transition-transform animate-pulse hover:animate-none hover:scale-105"
                  style={{ border: "2px solid #f43f5e", boxShadow: "0 0 0 2px rgba(244,63,94,0.25), 0 0 14px rgba(244,63,94,0.65)" }}>
                  <Github size={18} />
                </button>
              ) : (
                <span title="GitHub indisponível" className="w-9 h-9 rounded-full flex items-center justify-center bg-[#0d1117] text-white/40 border border-white/15">
                  <Github size={18} />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Row 2 — status / publicar */}
        <div className="relative z-10 mt-2 flex items-center gap-2 pl-11 flex-wrap">
          {/* Banner de sucesso pós-instalação */}
          {justInstalled && (
            <motion.span
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-cyan-300"
              style={{ background: "rgba(34,211,238,0.10)", border: "1px solid rgba(34,211,238,0.28)" }}>
              <CheckCircle2 size={11} /> App instalado com sucesso!
              <button onClick={() => setJustInstalled(false)} className="ml-1 text-white/30 hover:text-white/60 transition-colors">✕</button>
            </motion.span>
          )}

          {/* Ações de publicação — guiam o fluxo: COMMIT no GitHub primeiro, Vercel depois */}
          <div className="ml-auto flex items-center gap-2">
            {/* 1) Commit no GitHub — some enquanto processa (o ícone GitHub pisca roxo) */}
            {ghReady && dirtyFiles.length > 0 && !publishing && (
              <button onClick={publishWorkspace}
                className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-black text-white transition-transform hover:scale-[1.04]"
                style={{ background: "linear-gradient(135deg,#8b5cf6,#6d28d9)", boxShadow: "0 6px 18px -8px rgba(139,92,246,0.85), inset 0 1px 0 rgba(255,255,255,0.35)" }}
                title="Commita os arquivos do projeto no seu GitHub">
                <Github size={12} /> Commit <span className="text-white/65 font-mono">· {dirtyFiles.length}</span>
              </button>
            )}

            {/* 2) Publicar na Vercel — só DEPOIS de já ter commitado no GitHub */}
            {committed && Object.keys(open).length > 0 && (
              <button onClick={openVercelImport} disabled={publishing}
                className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-black text-white transition-transform hover:scale-[1.04] disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#06b6d4,#0369a1)", boxShadow: "0 6px 18px -8px rgba(34,211,238,0.85), inset 0 1px 0 rgba(255,255,255,0.35)" }}
                title="Publica na SUA Vercel (disponível após o commit no GitHub)">
                <ExternalLink size={11} /> Publicar na Vercel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Body: editor grande + painel direito (Agente | Arquivos) ── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3">

        {/* Editor + Terminal */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col rounded-[18px] overflow-hidden" style={glassPanel}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 gap-2" style={{ background: "rgba(0,0,0,0.25)" }}>
            <span className="text-[9px] font-mono text-slate-500 truncate">{active?.path || "nenhum arquivo aberto"}</span>
            <div className="flex items-center gap-2 shrink-0">
              {(devUrl || prodUrl) && (
                <a href={(prodUrl || devUrl) as string} target="_blank" rel="noreferrer"
                  title={prodUrl ? "Abrir em produção" : "Abrir o dev server em outra aba"}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-bold border border-white/10 text-cyan-200 hover:text-white transition-all">
                  <ExternalLink size={11} /> Abrir app
                </a>
              )}
              <button onClick={clearOutput} className="px-2 py-1 rounded-lg text-[9px] border border-white/10 text-slate-500 hover:text-white transition-all">Limpar</button>
              <button onClick={handleRun} disabled={!active || isRunning || active.lang === "other"}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold text-white transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>
                {isRunning ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />} Rodar
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-[220px] relative">
            {loadingFile && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0d0d16]/70 text-slate-400 text-xs gap-2"><Loader2 size={14} className="animate-spin" /> lendo arquivo…</div>
            )}
            {active ? (
              <MonacoEditor
                height="100%" language={active.monaco} path={active.path} value={active.body}
                onChange={(v) => updateActive(v ?? "")} theme="vs-dark"
                options={{
                  fontSize: 13, fontFamily: '"Fira Code","JetBrains Mono",monospace', fontLigatures: true,
                  minimap: { enabled: false }, scrollBeyondLastLine: false, wordWrap: "on",
                  lineNumbers: "on", tabSize: 2, automaticLayout: true, padding: { top: 12 },
                  readOnly: !workingBranch,
                }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 bg-[#0d0d16] text-slate-600 text-xs">
                <FolderTree size={20} /><span>Abra um arquivo da árvore para editar</span>
              </div>
            )}
          </div>

          {active && (
            <div className="flex items-center gap-2 px-3 py-1.5 border-t border-white/10" style={{ background: "rgba(0,0,0,0.25)" }}>
              {!workingBranch ? (
                <span className="text-[9px] text-amber-300/80 flex items-center gap-1.5"><AlertTriangle size={10} /> crie um branch de trabalho para editar e commitar (nunca em {defaultBranch || "main"})</span>
              ) : (
                <>
                  <input value={commitMsg} onChange={(e) => setCommitMsg(e.target.value)} placeholder={`mensagem do commit (${dirtyFiles.length} arquivo(s))`}
                    className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40" />
                  <button onClick={commitDirty} disabled={committing || !dirtyFiles.length || !commitMsg.trim()}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold text-white transition-all disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg,#8b5cf6,#6d28d9)" }}>
                    {committing ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Commit
                  </button>
                  <button onClick={openPullRequest} disabled={openingPr} title="Abrir Pull Request do branch de trabalho (exige aprovação — o clique é a aprovação)"
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold text-white transition-all disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg,#0ea5e9,#0369a1)" }}>
                    {openingPr ? <Loader2 size={11} className="animate-spin" /> : <GitPullRequest size={11} />} PR
                  </button>
                </>
              )}
            </div>
          )}

          <div className="h-32 border-t border-white/10 flex flex-col" style={{ background: "rgba(0,0,0,0.4)" }}>
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5">
              <Terminal size={11} className="text-emerald-400" />
              <span className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">Terminal</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 font-mono text-[10px] leading-relaxed">
              {output.length === 0 ? <span className="text-slate-600">Saída do código aparece aqui…</span>
                : output.map((o, i) => <div key={i} className={o.type === "stderr" ? "text-rose-400" : o.type === "info" ? "text-cyan-400" : "text-slate-300"}>{o.text}</div>)}
            </div>
          </div>
        </div>

        {/* Painel direito — alterna Agente / Arquivos (mais área útil) */}
        <div className="lg:w-80 shrink-0 flex flex-col rounded-[18px] overflow-hidden min-h-[320px]" style={glassPanel}>
          <div className="flex items-center gap-1 p-1 border-b border-black/10 dark:border-white/10">
            {([["agente", "Agente"], ["arquivos", "Arquivos"]] as const).map(([id, label]) => (
              <button key={id} onClick={() => setRightTab(id)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-7 rounded-[10px] text-[9px] font-black uppercase tracking-[0.14em] transition-all"
                style={rightTab === id ? PILL_ACTIVE : PILL_IDLE}>
                {id === "agente" ? (
                  /* luz de status à esquerda: ROXO pensando · CIANO pronto p/ insight */
                  <span className={`w-2 h-2 rounded-full ${agentThinking ? "animate-pulse" : ""}`}
                    title={agentThinking ? "pensando…" : "pronto"}
                    style={{ background: agentThinking ? "#8b5cf6" : "#22d3ee", boxShadow: agentThinking ? "0 0 8px rgba(139,92,246,0.85)" : "0 0 8px rgba(34,211,238,0.7)" }} />
                ) : <FolderTree size={11} />}
                {label}
                {id === "arquivos" && tree.length > 0 && <span className="text-[8px] font-mono opacity-60">{tree.length}</span>}
              </button>
            ))}
          </div>

          {rightTab === "arquivos" ? (
            <div className="flex-1 min-h-0 flex flex-col">
              {/* Branch + repo atual (a SELEÇÃO do repositório vive no topo esquerdo) */}
              <div className="px-3 py-2.5 border-b border-white/5 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[9px]">
                  <FolderGit2 size={11} className="text-violet-300 shrink-0" />
                  <span className="font-mono text-slate-700 dark:text-slate-300 truncate flex-1" title={repo}>{repo || "selecione o repo no topo ↑"}</span>
                  <button onClick={() => loadTree(repo, readRef)} disabled={!repo || loadingTree} title="Recarregar árvore"
                    className="shrink-0 p-1 rounded-lg border border-white/10 text-slate-400 hover:text-white disabled:opacity-40">
                    <RefreshCw size={11} className={loadingTree ? "animate-spin" : ""} />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[9px]">
                  <GitBranch size={10} className="text-slate-500 dark:text-slate-500" />
                  <span className="font-mono text-slate-600 dark:text-slate-400 truncate">{readRef || "—"}</span>
                  {workingBranch
                    ? <span className="ml-auto px-1.5 py-0.5 rounded text-[8px] font-bold text-violet-200" style={{ background: "rgba(139,92,246,0.18)" }}>trabalho</span>
                    : (
                      <button onClick={createWorkingBranch} disabled={!repo || !defaultBranch || branching}
                        className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold border border-white/10 text-slate-300 hover:bg-white/5 disabled:opacity-40">
                        {branching ? <Loader2 size={9} className="animate-spin" /> : <Plus size={9} />} branch
                      </button>
                    )}
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 border-b border-black/5 dark:border-white/5">
                <FileText size={11} className="text-slate-500 dark:text-slate-400" />
                <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">{tree.length}</span>
                <button onClick={() => setShowNewFile((v) => !v)} title="Novo arquivo"
                  className="ml-auto p-0.5 rounded border border-black/10 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><Plus size={11} /></button>
              </div>
              {showNewFile && (
                <div className="flex items-center gap-1 px-2 py-1.5 border-b border-white/5">
                  <input autoFocus value={newFilePath} onChange={(e) => setNewFilePath(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") createNewFile(); if (e.key === "Escape") { setShowNewFile(false); setNewFilePath(""); } }}
                    placeholder="src/novo.py" className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40" />
                  <button onClick={createNewFile} className="px-1.5 py-1 rounded text-[8px] font-bold text-white" style={{ background: "linear-gradient(135deg,#8b5cf6,#6d28d9)" }}>criar</button>
                </div>
              )}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 min-h-[80px]">
                {tree.length === 0 && !wsError && <div className="text-[9px] text-slate-500 p-2 leading-relaxed">{ghConnected ? (repo ? "repositório vazio" : "selecione um repo ou peça um projeto na barra ⟁") : "Os arquivos do projeto aparecem aqui. Peça um projeto na barra ⟁ acima."}</div>}
                {ghConnected && loadingTree && <div className="flex items-center gap-2 text-[9px] text-slate-500 p-2"><Loader2 size={11} className="animate-spin" /> lendo árvore…</div>}
                {visibleRows.map((row) => {
                  const pad = { paddingLeft: 6 + row.depth * 12 };
                  if (row.type === "dir") {
                    const openDir = !collapsedDirs.has(row.path);
                    return (
                      <button key={`d:${row.path}`} onClick={() => toggleDir(row.path)} style={pad}
                        className="w-full flex items-center gap-1.5 pr-2 py-1.5 rounded-lg text-[10px] font-mono font-bold text-slate-800 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                        <ChevronRight size={11} className={`shrink-0 text-slate-500 transition-transform ${openDir ? "rotate-90" : ""}`} />
                        {openDir ? <FolderOpen size={13} className="shrink-0 text-amber-400" /> : <Folder size={13} className="shrink-0 text-amber-400" />}
                        <span className="truncate">{row.name}</span>
                      </button>
                    );
                  }
                  return (
                    <div key={`f:${row.path}`} style={{ ...pad, ...(row.path === activePath ? { background: dark ? "rgba(139,92,246,0.16)" : "rgba(139,92,246,0.14)" } : {}) }}
                      className={`group w-full flex items-center gap-1.5 pr-2 py-1.5 rounded-lg text-[10px] font-mono transition-all ${row.path === activePath ? "text-violet-900 dark:text-violet-100" : "text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5"}`}>
                      <button onClick={() => openFile(row.path)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                        <FileText size={11} className="shrink-0 text-slate-400 dark:text-slate-500" />
                        <span className="truncate">{row.name}</span>
                      </button>
                      {open[row.path]?.dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="não salvo" />}
                      <button onClick={() => renameRepoFile(row.path)} title="Renomear/mover"
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-cyan-300 shrink-0"><Pencil size={10} /></button>
                      <button onClick={() => deleteRepoFile(row.path)} title="Excluir"
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 shrink-0"><Trash2 size={10} /></button>
                    </div>
                  );
                })}
              </div>

              {wsError && <div className="mx-2 mb-2 px-2 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[8.5px] text-rose-300 leading-snug">{wsError}</div>}

              <div className="border-t border-black/5 dark:border-white/5 p-2">
                <div className="flex items-center gap-1.5 mb-1.5 px-1">
                  <ShieldCheck size={11} className="text-slate-500 dark:text-slate-400" />
                  <span className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-600 dark:text-slate-400">Ações GitHub</span>
                </div>
                <div className="flex flex-col gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                  {GITHUB_ACTIONS.slice(0, 8).map((a: GitHubAction) => (
                    <div key={a.id} className="flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[8.5px]">
                      <span className={`px-1 py-0.5 rounded border text-[7px] font-bold ${riskStyle[a.risk]}`}>
                        {a.risk === "irreversible" ? "🔒" : a.risk === "review" ? "✋" : "✓"}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300 truncate flex-1">{a.label}</span>
                      {a.requiresApproval && <Lock size={8} className="text-rose-400 shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
          <>
          {/* Strip fixo: memória do projeto (com Limpar) + checklist viva do build */}
          {(tasks.length > 0 || memory) && (
            <div className="px-3 pt-2.5 pb-2 flex flex-col gap-2 border-b border-black/5 dark:border-white/5">
              {memory && (
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold text-cyan-700 dark:text-cyan-200 shrink-0"
                    style={{ background: "rgba(34,211,238,0.14)", border: "1px solid rgba(34,211,238,0.3)" }}>
                    <Brain size={9} /> memória
                  </span>
                  <span className="text-[8px] text-slate-500 font-mono truncate flex-1" title={memory}>{memory.split("\n")[0]}</span>
                  <button onClick={clearMemory} title="Limpar memória do agente (não apaga arquivos)"
                    className="shrink-0 p-1 rounded-md text-slate-500 hover:text-rose-400 transition-colors"><Eraser size={11} /></button>
                </div>
              )}
              {tasks.length > 0 && (
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                    <ListChecks size={10} /> Checklist — {tasks.filter((t) => t.state === "done").length}/{tasks.length}
                  </div>
                  {tasks.map((t) => (
                    <div key={t.path} className="flex items-center gap-1.5 text-[9px] font-mono pl-1" title={t.purpose || t.path}>
                      {t.state === "done" ? <CheckCircle2 size={10} className="text-cyan-400 shrink-0" />
                        : t.state === "doing" ? <Loader2 size={10} className="text-violet-400 animate-spin shrink-0" />
                        : t.state === "failed" ? <AlertTriangle size={10} className="text-rose-400 shrink-0" />
                        : <Circle size={10} className="text-slate-400 dark:text-slate-600 shrink-0" />}
                      <span className={`truncate ${t.state === "done" ? "text-slate-400 dark:text-slate-500 line-through" : "text-slate-700 dark:text-slate-300"}`}>{t.path}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="relative flex-1 min-h-0">
          <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-3">
            {chat.length === 0 && (
              <div className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Clique no ⟁ e descreva um projeto — o agente planeja, cria os arquivos um a um e testa. Aqui ele conversa e mostra o que está fazendo.
              </div>
            )}
            {chat.map((m, i) => (
              <div key={i} className={`text-[10px] leading-relaxed rounded-xl p-2.5 ${m.role === "user" ? "text-violet-900 dark:text-violet-100 ml-6" : "text-slate-800 dark:text-slate-200 mr-2"}`}
                style={m.role === "user"
                  ? { background: dark ? "rgba(139,92,246,0.14)" : "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.28)" }
                  : { background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.045)", border: dark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.08)" }}>
                <div className="whitespace-pre-wrap font-mono">{m.text}</div>
                {m.routing && <div className="mt-1.5 flex items-center gap-1 text-[8px] text-violet-300/80"><Cpu size={8} /> {m.routing}</div>}
                {m.role === "agent" && m.kind === "edit" && (
                  <button onClick={() => applyEditToActive(m.text)}
                    className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-bold text-white transition-transform hover:scale-[1.03]"
                    style={{ background: "linear-gradient(135deg,#8b5cf6,#6d28d9)", boxShadow: "0 6px 16px -8px rgba(139,92,246,0.8)" }}>
                    <Save size={10} /> Aplicar ao arquivo ativo
                  </button>
                )}
                {m.role === "agent" && m.kind === "edits" && m.files && (
                  <div className="mt-2 flex flex-col gap-1">
                    {m.files.map((f, j) => (
                      <div key={j} className="flex items-center gap-1.5 text-[9px] font-mono text-slate-300"><FileText size={9} className="text-violet-300" /> {f.path}</div>
                    ))}
                    <button onClick={() => applyEdits(m.files!)}
                      className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-bold text-white transition-transform hover:scale-[1.03]"
                      style={{ background: "linear-gradient(135deg,#8b5cf6,#6d28d9)", boxShadow: "0 6px 16px -8px rgba(139,92,246,0.8)" }}>
                      <Plus size={10} /> Aplicar tudo no workspace
                    </button>
                  </div>
                )}
              </div>
            ))}

            {diagram && (
              <div className="rounded-xl border border-white/10 p-2.5" style={{ background: "rgba(0,0,0,0.4)" }}>
                <div className="flex items-center gap-1.5 mb-1 text-[8px] font-black uppercase tracking-[0.16em] text-slate-500"><Workflow size={10} /> Mermaid</div>
                <pre className="text-[9px] font-mono text-cyan-200 whitespace-pre-wrap overflow-x-auto">{diagram}</pre>
              </div>
            )}

            {plan.length > 0 && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-amber-300"><Boxes size={10} /> Plano agêntico — {plan.length} passos</div>
                {plan.map((s, i) => {
                  const st = stepState[i] || "idle";
                  return (
                    <div key={i} className="flex items-start gap-2 text-[9.5px]">
                      <span className="font-mono text-slate-500">{i + 1}.</span>
                      <div className="flex-1">
                        <div className="text-slate-200 font-semibold">{s.title}</div>
                        <div className="text-slate-400">{s.action}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                          {s.githubAction && <span className="text-[8px] font-mono text-violet-300">{s.githubAction}</span>}
                          {s.needsApproval
                            ? <span className="inline-flex items-center gap-0.5 text-[8px] text-rose-300"><AlertTriangle size={8} /> aprovação humana</span>
                            : <span className="inline-flex items-center gap-0.5 text-[8px] text-emerald-300"><CheckCircle2 size={8} /> auto-executável</span>}
                          {s.githubAction && (
                            <button onClick={() => executeStep(s, i)} disabled={st === "running" || st === "done"}
                              className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-bold text-white disabled:opacity-50"
                              style={{ background: s.needsApproval ? "linear-gradient(135deg,#f59e0b,#b45309)" : "linear-gradient(135deg,#10b981,#059669)" }}>
                              {st === "running" ? <Loader2 size={8} className="animate-spin" /> : st === "done" ? <CheckCircle2 size={8} /> : st === "failed" ? <AlertTriangle size={8} /> : null}
                              {st === "done" ? "feito" : st === "failed" ? "repetir" : s.needsApproval ? "Aprovar & executar" : "Executar"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="pt-1 text-[8px] text-slate-500 leading-snug">
                  Loop com checkpoints: passos seguros rodam ao clicar; ações irreversíveis (PR, merge, push em main, delete) exigem aprovação humana. Commit usa os arquivos editados no workspace.
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
            {/* setinha → ir ao fim da conversa (estilo chats recentes) */}
            {chat.length > 2 && (
              <button onClick={() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" })}
                title="Ir para o fim da conversa"
                className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110"
                style={{ background: "linear-gradient(135deg,#8b5cf6,#06b6d4)", boxShadow: "0 4px 12px -3px rgba(34,211,238,0.6)" }}>
                <ChevronDown size={15} />
              </button>
            )}
          </div>

          <div className="border-t border-black/10 dark:border-white/10 p-2.5">
            <div className="flex items-end gap-2">
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} rows={2}
                placeholder="Peça ao agente…"
                className="flex-1 resize-none bg-black/5 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-[11px] text-slate-800 dark:text-slate-200 placeholder:text-slate-500 dark:placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50" />
              <button onClick={send} disabled={busy || !prompt.trim()}
                className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#8b5cf6,#6d28d9)" }}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-[8px] text-slate-600">
              <GitBranch size={9} /> branch de trabalho <GitPullRequest size={9} className="ml-1" /> PR exige aprovação
            </div>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
