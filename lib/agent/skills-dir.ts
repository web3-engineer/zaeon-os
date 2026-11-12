/**
 * lib/agent/skills-dir.ts — as skills DA CASA, lidas de um diretório.
 *
 * ────────────────────────── o que já existia, e o que faltava ──────────────────────────
 * O pilar (`lib/agent/skills.ts`) já faz o trabalho duro: parse do SKILL.md fiel ao spec
 * agentskills.io, validação lenient/strict, recusa de path traversal, divulgação progressiva por
 * `activate_skill`, envelope Zaeon em `metadata.zaeon-*`. NADA disso é reimplementado aqui.
 *
 * O que faltava era mais prosaico: alguém que LEIA UM DIRETÓRIO. O único consumidor do pilar era
 * `lib/octa/skills.ts`, com uma lista fixa de três skills vendorizadas em `vendor/skills/`. Para a
 * Zaeon ser a "fábrica de coisas open-source" que o dono descreve — uma skill por app secundário,
 * dezenas delas, cada uma virando card na vitrine — a lista não pode morar no código: o catálogo
 * tem de ser o diretório.
 *
 * ────────────────────────── por que `.claude/skills` ──────────────────────────
 * É onde o Claude Code procura. A mesma skill serve ao Claude (quem abrir este repo nele) e à
 * Zaeon em produção, sem conversão e sem cópia — era o pedido do dono: auto-suficiente E
 * compatível. O preço é aceitar o formato dele, e o formato dele é o do spec que o pilar já segue.
 *
 * ATENÇÃO DE EMPACOTAMENTO: `.dockerignore` tem `*.md`. A linha `!.claude/skills/**` existe lá por
 * causa deste módulo, e `skills-dir.test.ts` a fixa — sem ela, isto funcionaria em dev e em CI e
 * estaria MORTO na imagem, que é a pior forma de quebrar.
 *
 * ────────────────────────── strict, e não lenient ──────────────────────────
 * O Octa usa `lenient` porque as skills dele são de terceiros: vêm como vierem, pinadas por SHA.
 * As da casa passam em `strict`, que promove aviso a erro — então `name` ≠ pasta rejeita aqui,
 * enquanto no Octa só avisa. Skill nossa com nome divergente teria dois nomes para a mesma coisa:
 * um na URL do card, outro no prompt.
 */
import { validateSkill, type SkillManifest } from "@/lib/agent/skills";

export const DIR_SKILLS_CASA = ".claude/skills";
export const ARQUIVO_SKILL = "SKILL.md";

export type SkillDaCasa = { manifest: SkillManifest; corpo: string; pasta: string };
export type SkillRecusada = { nome: string; motivo: string };
export type CatalogoDaCasa = { skills: SkillDaCasa[]; recusadas: SkillRecusada[] };

export type FsDeSkills = {
  /** nomes das subpastas de `dir` */
  listar: (dir: string) => string[];
  /** conteúdo de `<dir>/<pasta>/SKILL.md`, ou `null` se não existir */
  ler: (dir: string, pasta: string) => string | null;
};

/** O corpo é o markdown abaixo do frontmatter — o mesmo recorte que o Octa faz. */
const corpoDe = (md: string): string => md.replace(/^---[\s\S]*?\n---\s*\n?/, "").trim();

/**
 * Carrega o catálogo da casa. NUNCA LANÇA: uma skill quebrada não derruba o turno de quem não
 * pediu nada dela — ela cai em `recusadas` com o motivo, e quem transforma isso em falha é o
 * portão de teste, que é o lugar certo para esse barulho.
 *
 * Ordem alfabética, para o cardápio do prompt ser estável entre deploys.
 */
export function carregarSkillsDaCasa(fs: FsDeSkills, dir = DIR_SKILLS_CASA): CatalogoDaCasa {
  const skills: SkillDaCasa[] = [];
  const recusadas: SkillRecusada[] = [];

  let pastas: string[];
  try {
    pastas = fs.listar(dir);
  } catch {
    return { skills, recusadas }; // diretório ausente = nenhuma skill, não um erro
  }

  for (const pasta of [...pastas].sort()) {
    let md: string | null;
    try {
      md = fs.ler(dir, pasta);
    } catch (e: unknown) {
      recusadas.push({ nome: pasta, motivo: `falha ao ler: ${(e as Error)?.message ?? e}` });
      continue;
    }
    if (md === null) {
      recusadas.push({ nome: pasta, motivo: `pasta sem ${ARQUIVO_SKILL}` });
      continue;
    }
    const v = validateSkill(md, { mode: "strict", dir: pasta });
    if (!v.ok || !v.skill) {
      recusadas.push({ nome: pasta, motivo: [...v.errors, ...v.warnings].join("; ") || "inválida" });
      continue;
    }
    const corpo = corpoDe(md);
    if (!corpo) {
      recusadas.push({ nome: pasta, motivo: "corpo vazio: sem instruções, a skill não muda nada no turno" });
      continue;
    }
    skills.push({ manifest: v.skill, corpo, pasta });
  }

  return { skills, recusadas };
}

// ───────────────────────────── o card da vitrine ─────────────────────────────

/** O card da skill na vitrine (seção de skills). `null` = skill que não vai pra loja. */
export type CardDaSkill = {
  slug: string;
  titulo: string;
  subtitulo: string;
  /** um dos Modelo3D de `lib/estudos/vitrine` */
  modelo: string;
  tags: string[];
  entrega: string[];
  /** o app open-source secundário que a skill comanda (`null` = skill só de procedimento) */
  app: string | null;
  /**
   * preço FIXO em reais. 0 ou ausente = grátis. A conversão para SOL é ao vivo, na exibição
   * (lib/solana/cotacao) — guardar reais é decisão do dono: o preço não derrete com o mercado.
   */
  precoBRL: number;
  /**
   * a família do card: "procedimento" (a skill da casa comum), "pago" (tem preço), "device"
   * (espelho de download + instruções), "course" (curso completo). Decide o que o PORTÃO cobra.
   */
  familia: "procedimento" | "pago" | "device" | "course";
};

const lista = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean)
    : typeof v === "string" ? v.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
      : [];

const texto = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * Monta o card a partir do envelope `metadata.zaeon-*`. É tudo-ou-nada pelo título: card pela
 * metade na vitrine é pior do que skill sem card, e skill sem card é um caso legítimo — não todo
 * procedimento da casa precisa virar produto na loja.
 *
 * `entrega` é exigida junto com o título porque é o que diz ao aluno o que ele ganha ao plugar.
 * Sem ela o card seria um nome bonito e nada mais.
 */
export function cardDaSkill(s: SkillDaCasa): CardDaSkill | null {
  const m = (s.manifest.metadata ?? {}) as Record<string, unknown>;
  const titulo = texto(m["zaeon-titulo"]);
  if (!titulo) return null;
  const subtitulo = texto(m["zaeon-subtitulo"]);
  const entrega = lista(m["zaeon-entrega"]);
  if (!subtitulo || !entrega.length) return null;

  // preço: número >= 0, ou 0 quando ausente/torto. Preço negativo vira 0 (grátis) em vez de
  // virar um crédito ao aluno; quem valida que um `pago` tem preço > 0 é o portão.
  const precoBRL = Math.max(0, Number(texto(m["zaeon-preco-brl"])) || 0);
  const fam = texto(m["zaeon-familia"]) as CardDaSkill["familia"];
  const familia: CardDaSkill["familia"] =
    (["procedimento", "pago", "device", "course"] as const).includes(fam) ? fam : "procedimento";

  return {
    slug: s.manifest.name,
    titulo,
    subtitulo,
    modelo: texto(m["zaeon-modelo"]) || "livro",
    tags: lista(m["zaeon-tags"]),
    entrega,
    app: texto(m["zaeon-app"]) || null,
    precoBRL,
    familia,
  };
}

/** Os cards de todas as skills que têm card, na ordem do catálogo. */
export const cardsDasSkills = (c: CatalogoDaCasa): CardDaSkill[] =>
  c.skills.map(cardDaSkill).filter((x): x is CardDaSkill => !!x);

/** Os apps secundários que o catálogo comanda, sem repetição. */
export const appsDoCatalogo = (c: CatalogoDaCasa): string[] =>
  [...new Set(c.skills
    .map((s) => texto(((s.manifest.metadata ?? {}) as Record<string, unknown>)["zaeon-app"]))
    .filter(Boolean))];

// ───────────────────────────── o fs de verdade ─────────────────────────────

/** Isolado aqui para o resto do módulo seguir testável sem disco. Só servidor e teste chamam. */
export function fsDeDisco(): FsDeSkills {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const nodeFs = require("node:fs") as typeof import("node:fs");
  const path = require("node:path") as typeof import("node:path");
  /* eslint-enable @typescript-eslint/no-require-imports */
  return {
    listar: (dir) =>
      nodeFs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name),
    ler: (dir, pasta) => {
      const p = path.join(dir, pasta, ARQUIVO_SKILL);
      return nodeFs.existsSync(p) ? nodeFs.readFileSync(p, "utf8") : null;
    },
  };
}
