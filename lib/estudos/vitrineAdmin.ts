/**
 * lib/estudos/vitrineAdmin.ts — o elo entre o CRUD admin da vitrine (modelo Prisma ItemVitrine) e o tipo ItemVitrine
 * que a UI consome (lib/estudos/vitrine). `paraUI` achata frações/selos; `normalizar` valida/normaliza o body do admin.
 */
import type { ItemVitrine, TipoProduto, Execucao, Modelo3D } from "./vitrine";
import type { Raridade } from "./blueprint";

export const TIPOS: TipoProduto[] = ["curso", "codigo", "artigo", "negocio", "rwa", "agente", "skill"];
export const EXECUCOES: Execucao[] = ["dyom", "agente"];
export const MODELOS: Modelo3D[] = ["console", "chip", "planta", "predio", "drone", "foguete", "molecula", "engrenagem", "livro", "graos", "ondas", "robo"];
export const RARIDADES: Raridade[] = ["comum", "rara", "epica", "lendaria"];

/** o formato da linha no banco (os campos que a UI precisa) — o row do Prisma tem estes + id/datas */
export type VitrineRow = {
    slug: string; titulo: string; subtitulo: string; tipo: string; execucao: string; modelo: string; autor: string;
    raridade: string; profundidade: number; preco: number; fracoesTotal: number; fracoesVendidas: number;
    supervisionado: boolean; linksOk: boolean; codigoPrivado: boolean; entrega: string[]; tags: string[]; ironia: boolean;
};

/** linha do banco → o ItemVitrine que a vitrine renderiza */
export function paraUI(r: VitrineRow): ItemVitrine {
    return {
        id: r.slug, titulo: r.titulo, subtitulo: r.subtitulo,
        tipo: r.tipo as TipoProduto, execucao: r.execucao as Execucao, modelo: r.modelo as Modelo3D,
        autor: r.autor, raridade: r.raridade as Raridade, profundidade: r.profundidade, preco: r.preco,
        fracoes: { total: r.fracoesTotal, vendidas: r.fracoesVendidas },
        selos: { supervisionado: r.supervisionado, linksOk: r.linksOk, codigoPrivado: r.codigoPrivado },
        entrega: r.entrega, tags: r.tags, ironia: r.ironia || undefined,
    };
}

/** slug a partir do título (minúsculo, sem acento, com hífens) */
export function slugify(s: string): string {
    return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || `item-${Date.now().toString(36)}`;
}

/** valida/normaliza o body do admin → { data } pronto pro Prisma, ou { erro } com o motivo (400).
 *  parcial=true (PATCH): só os campos que vieram; parcial=false (POST): exige título. */
export function normalizar(b: any, { parcial = false }: { parcial?: boolean } = {}): { data?: Record<string, unknown>; erro?: string } {
    const data: Record<string, unknown> = {};
    const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
    const lista = (v: unknown) => (Array.isArray(v) ? v.map((s) => String(s).trim()).filter(Boolean).slice(0, 12)
        : String(v ?? "").split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean).slice(0, 12));

    if (!parcial || b?.titulo !== undefined) { const t = str(b?.titulo, 80); if (!t) return { erro: "Título obrigatório." }; data.titulo = t; }
    if (b?.subtitulo !== undefined) data.subtitulo = str(b.subtitulo, 220);
    if (b?.autor !== undefined) data.autor = str(b.autor, 60);
    if (b?.tipo !== undefined) { if (!TIPOS.includes(b.tipo)) return { erro: "tipo inválido." }; data.tipo = b.tipo; }
    if (b?.execucao !== undefined) { if (!EXECUCOES.includes(b.execucao)) return { erro: "execução inválida." }; data.execucao = b.execucao; }
    if (b?.modelo !== undefined) { if (!MODELOS.includes(b.modelo)) return { erro: "ícone (modelo) inválido." }; data.modelo = b.modelo; }
    if (b?.raridade !== undefined) { if (!RARIDADES.includes(b.raridade)) return { erro: "raridade inválida." }; data.raridade = b.raridade; }
    if (b?.profundidade !== undefined) { const n = Number(b.profundidade); if (!Number.isFinite(n) || n < 0 || n > 100) return { erro: "profundidade: 0 a 100." }; data.profundidade = Math.round(n); }
    if (b?.preco !== undefined) { const n = Number(b.preco); if (!Number.isFinite(n) || n < 0) return { erro: "preço: número ≥ 0." }; data.preco = n; }
    if (b?.fracoesTotal !== undefined) { const n = Number(b.fracoesTotal); if (!Number.isInteger(n) || n < 1) return { erro: "frações (total): inteiro ≥ 1." }; data.fracoesTotal = n; }
    if (b?.fracoesVendidas !== undefined) { const n = Number(b.fracoesVendidas); if (!Number.isInteger(n) || n < 0) return { erro: "frações vendidas: inteiro ≥ 0." }; data.fracoesVendidas = n; }
    for (const k of ["supervisionado", "linksOk", "codigoPrivado", "ironia", "ativo"]) if (typeof b?.[k] === "boolean") data[k] = b[k];
    if (b?.entrega !== undefined) data.entrega = lista(b.entrega);
    if (b?.tags !== undefined) data.tags = lista(b.tags);
    if (b?.ordem !== undefined) { const n = Number(b.ordem); if (Number.isFinite(n)) data.ordem = Math.trunc(n); }
    return { data };
}
