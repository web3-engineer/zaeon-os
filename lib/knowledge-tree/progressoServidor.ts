/**
 * lib/knowledge-tree/progressoServidor.ts — o progresso da Árvore Neuronal NO BANCO, por usuário + curso.
 *
 * Reaproveita a coleção que já existe para progresso por usuário e nó (`skill_progress`, model
 * SkillProgress — @@unique(userId, topicSlug, nodeId)): o curso entra com topicSlug `curso:<cursoId>`
 * e a lição concluída com status "concluida" (mastery 1). Nada de coleção nova nem migração:
 *   - `topicSlug()` da skill-tree generativa nunca produz ":" → os namespaces não colidem;
 *   - o espelho RPG da skill-tree conta só status "mastered" → lição de curso não infla rank/AURA
 *     nem dispara credencial (concluir aqui é marcação de leitura, não maestria validada).
 *
 * O userId vem SEMPRE da sessão (a rota resolve); estas funções nunca recebem id de outro usuário do cliente.
 */
export const STATUS_CONCLUIDA = "concluida";
export const MAX_NOS_POR_OP = 500;
/** teto de lições guardadas por usuário e curso (uma árvore real tem dezenas; isto só barra abuso). */
export const MAX_POR_CURSO = 2000;
const ID_OK = /^[\w:./#@+\-]{1,200}$/;

export const topicoDoCurso = (cursoId: string): string => `curso:${cursoId}`;

/** Ids de lição válidos (strings curtas, sem lixo), sem repetição, no máximo MAX_NOS_POR_OP. */
export function sanearIds(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out = new Set<string>();
  for (const x of v) {
    if (typeof x !== "string") continue;
    const s = x.trim();
    if (ID_OK.test(s)) out.add(s);
    if (out.size >= MAX_NOS_POR_OP) break;
  }
  return [...out];
}

type Db = {
  skillProgress: {
    findMany(a: unknown): Promise<{ nodeId: string }[]>;
    upsert(a: unknown): Promise<unknown>;
    deleteMany(a: unknown): Promise<unknown>;
  };
};

export async function lerConcluidas(db: Db, userId: string, cursoId: string): Promise<string[]> {
  const rows = await db.skillProgress.findMany({
    where: { userId, topicSlug: topicoDoCurso(cursoId), status: STATUS_CONCLUIDA },
    select: { nodeId: true },
  });
  return rows.map((r) => r.nodeId);
}

export async function concluir(db: Db, userId: string, cursoId: string, ids: string[]): Promise<void> {
  const topicSlug = topicoDoCurso(cursoId);
  await Promise.all(ids.map((nodeId) => db.skillProgress.upsert({
    where: { userId_topicSlug_nodeId: { userId, topicSlug, nodeId } },
    create: { userId, topicSlug, nodeId, mastery: 1, status: STATUS_CONCLUIDA },
    update: { mastery: 1, status: STATUS_CONCLUIDA },
  })));
}

export async function reiniciar(db: Db, userId: string, cursoId: string): Promise<void> {
  await db.skillProgress.deleteMany({ where: { userId, topicSlug: topicoDoCurso(cursoId) } });
}

/** Troca o conjunto inteiro (sincronização do que ficou guardado offline). */
export async function definir(db: Db, userId: string, cursoId: string, ids: string[]): Promise<void> {
  const topicSlug = topicoDoCurso(cursoId);
  await db.skillProgress.deleteMany({ where: { userId, topicSlug, nodeId: { notIn: ids } } });
  await concluir(db, userId, cursoId, ids);
}
