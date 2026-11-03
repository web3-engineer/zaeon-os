// Só pros testes de lib/blueprint: um banco em memória com o pedaço do Prisma que a loja usa.
import type { BlueprintDb } from "../server";

/** um banco em memória com o pedaço do Prisma que a loja usa (com um "tique" assíncrono pra simular corrida) */
export function bancoFalso(convEstudavel = false) {
  type Linha = { id: string; ownerId: string; surface: string; scopeId: string | null; titulo: string; cards: unknown; rev: number; createdAt: Date; updatedAt: Date };
  const linhas: Linha[] = []; let seq = 0;
  // quem foi convidado (papel) e os comentários (só o id do blueprint basta aqui)
  const membros: { cartolinaId: string; userId: string; papel: string }[] = [], comentarios: string[] = [];
  const tique = () => new Promise((r) => setTimeout(r, 0));
  const casa = (l: Linha, w: Record<string, unknown>) => Object.entries(w).every(([k, v]) => (l as Record<string, unknown>)[k] === v);
  const ordem = (a: Linha, b: Linha) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id);
  const db: BlueprintDb = {
    cartolina: {
      async findFirst({ where }) { await tique(); return linhas.filter((l) => casa(l, where)).sort(ordem)[0] ?? null; },
      async findUnique({ where }) { await tique(); return linhas.find((l) => l.id === where.id) ?? null; },
      async findMany({ where, take }) { await tique(); const r = linhas.filter((l) => casa(l, where)).sort(ordem); return take ? r.slice(0, take) : r; },
      async create({ data }) { await tique(); const n = ++seq; const l = { ...data, id: n.toString(16).padStart(24, "0"), rev: 0, createdAt: new Date(1000 + n), updatedAt: new Date(1000 + n) }; linhas.push(l); return l; },
      async updateMany({ where, data }) { await tique(); const l = linhas.find((x) => x.id === where.id && x.rev === where.rev); if (!l) return { count: 0 }; Object.assign(l, data, { updatedAt: new Date() }); return { count: 1 }; },
      async deleteMany({ where }) { const i = linhas.findIndex((l) => l.id === where.id); if (i >= 0) linhas.splice(i, 1); return { count: i >= 0 ? 1 : 0 }; },
    },
    cartolinaMembro: {
      async findUnique({ where }) { return membros.find((m) => m.cartolinaId === where.cartolinaId_userId.cartolinaId && m.userId === where.cartolinaId_userId.userId) ?? null; },
      async count({ where }) { return membros.filter((m) => m.cartolinaId === where.cartolinaId).length; },
      async deleteMany({ where }) { const antes = membros.length; for (let i = membros.length - 1; i >= 0; i--) if (membros[i]!.cartolinaId === where.cartolinaId) membros.splice(i, 1); return { count: antes - membros.length }; },
    },
    cartolinaComentario: { async deleteMany({ where }) { const antes = comentarios.length; for (let i = comentarios.length - 1; i >= 0; i--) if (comentarios[i] === where.cartolinaId) comentarios.splice(i, 1); return { count: antes - comentarios.length }; } },
    conversation: { async findFirst() { return { estudavel: convEstudavel }; } },
  };
  return { db, linhas, membros, comentarios };
}
