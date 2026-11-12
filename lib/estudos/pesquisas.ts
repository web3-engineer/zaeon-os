/**
 * lib/estudos/pesquisas.ts — as PESQUISAS da vitrine (PURO). Pedido do dono (nov/2026): uma seção da API que recebe só
 * pesquisas; na vitrine elas não são cartas comuns — cada pesquisa é uma PASTA, e os PAPÉIS dentro dela são as partes
 * da pesquisa (o artigo, os dados brutos, o protocolo, a revisão…). No hover os papéis espiam pra fora da pasta; no
 * clique a pasta abre e os papéis saem em leque, pra ler ou baixar (components/estudos/PastaPesquisa).
 *
 * Duas portas de entrada, a mesma forma:
 *  - ADMIN / CONSOLE (app/api/admin/vitrine/pesquisas): o painel do admin ou o console da orquestra (Bearer do
 *    console) publicam direto — já entra "publicada".
 *  - USUÁRIO (app/api/estudos/vitrine/pesquisas): quem escreveu um trabalho na Sala de Pesquisa publica uma CÓPIA dele
 *    — entra "pendente" e só aparece na vitrine depois que o admin aprova.
 *
 * Aqui mora o que as rotas dividem: validar o corpo, montar a pesquisa a partir de um trabalho e virar o ItemVitrine
 * que a vitrine renderiza (sem o conteúdo das partes, que vem sob demanda quando a pasta abre).
 */
import type { ItemVitrine } from "./vitrine";
import type { Raridade } from "./blueprint";

// ───────────────────────────── as partes (os papéis da pasta) ─────────────────────────────
export const TIPOS_PARTE = ["artigo", "dados", "protocolo", "revisao", "codigo", "anexo"] as const;
export type TipoParte = (typeof TIPOS_PARTE)[number];
export const NOME_PARTE: Record<TipoParte, string> = {
  artigo: "Artigo", dados: "Dados", protocolo: "Protocolo", revisao: "Revisão", codigo: "Código", anexo: "Anexo",
};
/** a cor da etiqueta de cada papel (combina com a paleta da vitrine) */
export const COR_PARTE: Record<TipoParte, string> = {
  artigo: "#f5c542", dados: "#2bd47a", protocolo: "#38bdf8", revisao: "#a78bfa", codigo: "#22d3ee", anexo: "#cbd5e1",
};

/** uma parte como fica no banco: o texto (lido na própria Zaeon) OU um link https (aberto fora) */
export type Parte = { tipo: TipoParte; titulo: string; conteudo?: string; url?: string };
/** uma parte como vai pra vitrine: sem o conteúdo (só o tamanho), pra lista não carregar a pesquisa inteira */
export type ParteResumo = { tipo: TipoParte; titulo: string; caracteres: number; link: boolean };

export const STATUS = ["pendente", "publicada", "recusada"] as const;
export type StatusPesquisa = (typeof STATUS)[number];
export const ORIGENS = ["admin", "console", "usuario"] as const;
export type OrigemPesquisa = (typeof ORIGENS)[number];

export const LIMITES = {
  titulo: 120, resumo: 4000, nicho: 60, tituloParte: 80, conteudo: 200_000, partes: 12, tags: 12, tag: 32,
  /** quantas pesquisas PENDENTES uma pessoa pode ter na fila ao mesmo tempo */
  pendentesPorConta: 10,
  /** teto da meta de apoio em SOL (um número grande, só pra barrar valor absurdo) */
  metaSol: 1_000_000,
} as const;

// ───────────────────────────── apoio (financiamento em SOL) ─────────────────────────────
// Uma pesquisa pode ficar ABERTA A APOIO: a comunidade apoia a continuidade dela em SOL (Solana). Igual ao resto da
// vitrine, a liquidação on-chain ainda é "em breve" (MOEDA.ativa=false): o botão roda o fluxo, mas nada cobra ninguém
// nem envia pra carteira externa. Os números de arrecadação de um exemplo são dado SEMENTE, pra demonstrar a tela.
export type Apoio = {
  /** a pesquisa está aberta a apoio */
  ativo: boolean;
  /** a meta de apoio, em SOL */
  metaSol: number;
  /** quanto já foi apoiado, em SOL */
  arrecadadoSol: number;
  /** quantas pessoas apoiaram */
  apoiadores: number;
};

/** o apoio de uma linha do banco, ou undefined quando a pesquisa não está aberta a apoio */
export function apoioDe(r: { apoioAtivo?: boolean | null; metaSol?: number | null; arrecadadoSol?: number | null; apoiadores?: number | null }): Apoio | undefined {
  if (!r.apoioAtivo) return undefined;
  const meta = Number(r.metaSol) || 0;
  if (meta <= 0) return undefined;
  return {
    ativo: true,
    metaSol: meta,
    arrecadadoSol: Math.max(0, Math.min(meta, Number(r.arrecadadoSol) || 0)),
    apoiadores: Math.max(0, Math.floor(Number(r.apoiadores) || 0)),
  };
}

/** o progresso do apoio, 0..1 */
export const pctApoio = (a: Apoio): number => (a.metaSol > 0 ? Math.max(0, Math.min(1, a.arrecadadoSol / a.metaSol)) : 0);

/** "12,5 SOL" — valor em SOL com no máximo 3 casas, sem zeros à toa */
export const solFmt = (n: number): string => `${(Math.round(n * 1000) / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} SOL`;

/** os valores de apoio sugeridos no botão (SOL) */
export const VALORES_APOIO = [0.5, 1, 5, 10, 25] as const;

const RARIDADES: Raridade[] = ["comum", "rara", "epica", "lendaria"];

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
/** só https (nada de javascript:, data:, http) — a parte abre fora da Zaeon */
export function urlSegura(v: unknown): string | null {
  try {
    const u = new URL(String(v ?? "").trim());
    return u.protocol === "https:" && u.hostname ? u.toString() : null;
  } catch {
    return null;
  }
}

/** valida as partes: 1 a 12, cada uma com tipo conhecido e texto OU link https */
export function normalizarPartes(v: unknown): { partes?: Parte[]; erro?: string } {
  if (!Array.isArray(v) || !v.length) return { erro: "A pesquisa precisa de pelo menos uma parte (o artigo, os dados…)." };
  if (v.length > LIMITES.partes) return { erro: `No máximo ${LIMITES.partes} partes por pesquisa.` };
  const partes: Parte[] = [];
  for (const [i, p] of v.entries()) {
    const tipo = (p as { tipo?: unknown })?.tipo;
    if (!TIPOS_PARTE.includes(tipo as TipoParte)) return { erro: `parte ${i + 1}: tipo inválido (use ${TIPOS_PARTE.join(", ")}).` };
    const t = tipo as TipoParte;
    const titulo = str((p as { titulo?: unknown }).titulo, LIMITES.tituloParte) || NOME_PARTE[t];
    const bruto = (p as { conteudo?: unknown }).conteudo;
    const conteudo = typeof bruto === "string" ? bruto.trim() : "";
    if (conteudo.length > LIMITES.conteudo) return { erro: `parte ${i + 1}: texto grande demais (máx. ${LIMITES.conteudo.toLocaleString("pt-BR")} caracteres).` };
    const temUrl = (p as { url?: unknown }).url != null && String((p as { url?: unknown }).url).trim() !== "";
    const url = temUrl ? urlSegura((p as { url?: unknown }).url) : null;
    if (temUrl && !url) return { erro: `parte ${i + 1}: o link precisa ser https.` };
    if (!conteudo && !url) return { erro: `parte ${i + 1}: mande o texto (conteudo) ou um link https (url).` };
    partes.push({ tipo: t, titulo, ...(conteudo ? { conteudo } : {}), ...(url ? { url } : {}) });
  }
  return { partes };
}

const lista = (v: unknown) =>
  (Array.isArray(v) ? v : String(v ?? "").split(/[\n,;]+/))
    .map((s) => String(s).trim().slice(0, LIMITES.tag)).filter(Boolean).slice(0, LIMITES.tags);

/**
 * valida o corpo de uma pesquisa (admin/console). parcial=true (PATCH): só o que veio; parcial=false (POST): exige
 * título e partes. Devolve os campos prontos pro Prisma — `partes` já validadas.
 */
export function normalizarPesquisa(b: any, { parcial = false }: { parcial?: boolean } = {}): { data?: Record<string, unknown>; erro?: string } {
  const data: Record<string, unknown> = {};
  if (!parcial || b?.titulo !== undefined) { const t = str(b?.titulo, LIMITES.titulo); if (!t) return { erro: "Título obrigatório." }; data.titulo = t; }
  if (b?.resumo !== undefined) data.resumo = str(b.resumo, LIMITES.resumo);
  if (b?.nicho !== undefined) data.nicho = str(b.nicho, LIMITES.nicho);
  if (b?.autor !== undefined) data.autor = str(b.autor, 60);
  if (b?.tags !== undefined) data.tags = lista(b.tags);
  if (b?.raridade !== undefined) { if (!RARIDADES.includes(b.raridade)) return { erro: "raridade inválida." }; data.raridade = b.raridade; }
  if (b?.validadores !== undefined) { const n = Number(b.validadores); if (!Number.isInteger(n) || n < 0) return { erro: "validadores: inteiro ≥ 0." }; data.validadores = n; }
  if (b?.ordem !== undefined) { const n = Number(b.ordem); if (Number.isFinite(n)) data.ordem = Math.trunc(n); }
  if (b?.status !== undefined) { if (!STATUS.includes(b.status)) return { erro: "status inválido." }; data.status = b.status; }
  if (b?.motivo !== undefined) data.motivo = str(b.motivo, 400) || null;
  // apoio (financiamento em SOL)
  if (b?.apoioAtivo !== undefined) data.apoioAtivo = !!b.apoioAtivo;
  if (b?.metaSol !== undefined) { const n = Number(b.metaSol); if (!Number.isFinite(n) || n < 0 || n > LIMITES.metaSol) return { erro: `meta de apoio: entre 0 e ${LIMITES.metaSol} SOL.` }; data.metaSol = n; }
  if (b?.arrecadadoSol !== undefined) { const n = Number(b.arrecadadoSol); if (!Number.isFinite(n) || n < 0) return { erro: "apoiado (SOL): número ≥ 0." }; data.arrecadadoSol = n; }
  if (b?.apoiadores !== undefined) { const n = Number(b.apoiadores); if (!Number.isInteger(n) || n < 0) return { erro: "apoiadores: inteiro ≥ 0." }; data.apoiadores = n; }
  if (!parcial || b?.partes !== undefined) {
    const { partes, erro } = normalizarPartes(b?.partes);
    if (erro) return { erro };
    data.partes = partes;
  }
  return { data };
}

/** o que o USUÁRIO manda ao publicar um trabalho seu: só o id do trabalho e o que ele quer dizer sobre ele */
export function normalizarEnvio(b: any): { workId?: string; resumo: string; nicho: string; tags: string[]; erro?: string } {
  const workId = str(b?.workId, 40);
  const out = { resumo: str(b?.resumo, LIMITES.resumo), nicho: str(b?.nicho, LIMITES.nicho), tags: lista(b?.tags ?? []) };
  if (!/^[a-f0-9]{24}$/i.test(workId)) return { ...out, erro: "Escolha um trabalho seu pra publicar." };
  return { ...out, workId };
}

/**
 * um TRABALHO da Sala de Pesquisa → as partes da pesquisa. O texto do trabalho vira o ARTIGO (o `content` já é o
 * espelho em markdown das seções). Trabalho vazio não vira pesquisa.
 */
export function partesDoTrabalho(w: { title?: string | null; content?: string | null; workType?: string | null }): { partes?: Parte[]; erro?: string } {
  const texto = String(w.content ?? "").trim();
  if (texto.length < 200) return { erro: "Esse trabalho ainda está curto demais pra publicar (escreva pelo menos alguns parágrafos)." };
  const nome = w.workType === "tcc" ? "TCC" : w.workType === "relatorio" ? "Relatório" : "Artigo";
  return { partes: [{ tipo: "artigo", titulo: nome, conteudo: texto.slice(0, LIMITES.conteudo) }] };
}

/** a linha do banco como as rotas a leem */
export type PesquisaRow = {
  slug: string; titulo: string; resumo: string; nicho: string; tags: string[]; raridade: string; autor: string;
  validadores: number; partes: unknown; status?: string;
  apoioAtivo?: boolean | null; metaSol?: number | null; arrecadadoSol?: number | null; apoiadores?: number | null;
  conta?: { id: string; name?: string | null; image?: string | null } | null;
};

/** as partes do banco (Json) → a lista lida, descartando o que não tem forma de parte */
export function partesDe(v: unknown): Parte[] {
  if (!Array.isArray(v)) return [];
  return v.filter((p): p is Parte => !!p && TIPOS_PARTE.includes((p as Parte).tipo) && typeof (p as Parte).titulo === "string");
}

export const resumirPartes = (partes: Parte[]): ParteResumo[] =>
  partes.map((p) => ({ tipo: p.tipo, titulo: p.titulo, caracteres: p.conteudo?.length ?? 0, link: !!p.url }));

/** linha do banco → o card-PASTA que a vitrine renderiza (as partes vão resumidas; o texto vem quando a pasta abre) */
export function pesquisaParaUI(r: PesquisaRow): ItemVitrine {
  const partes = partesDe(r.partes);
  const nome = r.conta?.name?.trim() || r.autor || "Zaeon";
  const raridade = (RARIDADES as string[]).includes(r.raridade) ? (r.raridade as Raridade) : "comum";
  return {
    id: `pesquisa-${r.slug}`, titulo: r.titulo,
    subtitulo: r.resumo.split(/\n\s*\n/)[0]?.slice(0, 220) || `${partes.length} ${partes.length === 1 ? "parte" : "partes"} nesta pasta`,
    tipo: "pesquisa", execucao: "dyom", modelo: "pasta", autor: nome, raridade,
    // a profundidade da pasta: quanto material ela carrega (cada parte conta, e texto longo conta mais)
    profundidade: Math.min(100, partes.length * 12 + Math.round(partes.reduce((s, p) => s + (p.conteudo?.length ?? 0), 0) / 2500)),
    preco: 0, fracoes: { total: 1, vendidas: 0 },
    selos: { supervisionado: false, linksOk: true, codigoPrivado: false },
    entrega: partes.map((p) => `${NOME_PARTE[p.tipo]}: ${p.titulo}`),
    tags: r.tags,
    ...(r.conta ? { conta: { id: r.conta.id, nome, avatarUrl: r.conta.image ?? null } } : {}),
    ...(r.nicho ? { nicho: r.nicho } : {}),
    ...(r.resumo ? { descricao: r.resumo } : {}),
    validadores: r.validadores,
    pasta: { slug: r.slug, partes: resumirPartes(partes) },
    ...(apoioDe(r) ? { apoio: apoioDe(r) } : {}),
  };
}

/** "1,2 mil caracteres" / "link externo" — a legenda de cada papel */
export function tamanhoParte(p: ParteResumo): string {
  if (p.link && !p.caracteres) return "link externo";
  const c = p.caracteres;
  const txt = c >= 1000 ? `${(c / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil caracteres` : `${c} caracteres`;
  return p.link ? `${txt} · link` : txt;
}

/** o nome do arquivo quando a pessoa baixa um papel ("microbioma-do-sertao-dados.md") */
export function arquivoDaParte(slug: string, p: { tipo: TipoParte }): string {
  return `${slug}-${p.tipo}.md`;
}
