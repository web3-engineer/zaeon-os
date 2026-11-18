/**
 * lib/agent/skills-boot.ts — LIGA as skills da casa no chat. Era a peça que faltava.
 *
 * ────────────────────────── o achado que motivou este módulo ──────────────────────────
 * O pilar de skills existe e é bom (`lib/agent/skills.ts`), e o Octa tem o carregador dele
 * (`lib/octa/skills.ts`). Mas em 2026-11-12, procurando quem consome `skillsSystemPrompt`,
 * `makeActivateSkillTool` e `skillsDoOcta`, a resposta foi: NINGUÉM, fora os próprios testes.
 *
 *   $ grep -rn 'skillsDoOcta|skillsSystemPrompt|makeActivateSkillTool' lib/ app/
 *     5 lib/agent/skills.test.ts · 2 lib/agent/skills.ts · 4 lib/octa/genart.test.ts · 4 lib/octa/skills.ts
 *
 * Nenhuma rota, nenhum harness. O sistema estava construído, testado e plugado em nada — então o
 * chat tinha ZERO skills, não "uma ou duas". Este módulo é a tomada.
 *
 * ────────────────────────── o desenho ──────────────────────────
 * Uma leitura só, no carregamento do módulo, em cache no `globalThis` — mesmo motivo documentado
 * em `lib/anatomia/carregar.ts`: estado de processo, e o disco não deve ser lido a cada turno.
 *
 * FALHA SEM DRAMA: diretório ausente, skill quebrada, disco indisponível ⇒ catálogo vazio, o
 * `cardapioDeSkills` devolve "" e o `.filter(Boolean)` do harness o descarta. O chat responde
 * exatamente como antes. Uma skill nova com defeito não pode derrubar o turno de quem não pediu
 * nada dela — quem grita é o portão em `skills-dir.test.ts`, no CI, que é o lugar certo.
 *
 * DIVULGAÇÃO PROGRESSIVA, que é a razão de ser do formato: só `name` + `description` entram no
 * prompt de todo turno (uma linha por skill). O CORPO só chega quando o modelo chama
 * `activate_skill`. É o que permite dezenas de skills sem o prompt virar o despejo que
 * `aura-harness.ts` já é — 1.109 linhas, com diretriz incondicional em cada turno.
 */
import { makeActivateSkillTool, skillsSystemPrompt } from "@/lib/agent/skills";
import {
  DIR_SKILLS_CASA, carregarSkillsDaCasa, fsDeDisco, type CatalogoDaCasa,
} from "@/lib/agent/skills-dir";
import { registerTool, type ToolDef } from "@/lib/agent/runtime";

type Cache = { __zaeonSkillsCasa?: CatalogoDaCasa };

/** O catálogo da casa, lido uma vez. Nunca lança. */
export function catalogoDaCasa(): CatalogoDaCasa {
  const g = globalThis as unknown as Cache;
  if (!g.__zaeonSkillsCasa) {
    try {
      g.__zaeonSkillsCasa = carregarSkillsDaCasa(fsDeDisco(), DIR_SKILLS_CASA);
    } catch {
      g.__zaeonSkillsCasa = { skills: [], recusadas: [] };
    }
    const c = g.__zaeonSkillsCasa;
    if (c.recusadas.length) {
      // Visível no log do servidor, e NUNCA no turno do aluno.
      console.warn("[skills] recusadas no boot:", c.recusadas.map((r) => `${r.nome}=${r.motivo}`).join(", "));
    }
  }
  return g.__zaeonSkillsCasa;
}

/** Só para teste: esquece o cache. */
export function __resetSkillsParaTeste(): void {
  delete (globalThis as unknown as Cache).__zaeonSkillsCasa;
}

/**
 * O bloco do system prompt: uma linha por skill, nome e descrição. Vazio quando não há skill —
 * e aí o harness não ganha nem uma linha.
 */
export function cardapioDeSkills(c: CatalogoDaCasa = catalogoDaCasa()): string {
  return skillsSystemPrompt(c.skills.map((s) => ({
    name: s.manifest.name,
    description: s.manifest.description,
  })));
}

/**
 * A tool `activate_skill`, construída sobre o catálogo da casa.
 *
 * `disponivelNoTurno` desliga a tool quando não há skill, em vez de o boot não a registrar: é a
 * regra do comentário do Anexo (F3) em `lib/agent/runtime.ts` — quem decide é a disponibilidade
 * no turno, não o boot, senão uma tool registrada só no boot fica invisível pra rota do chat.
 *
 * O Octa monta a dele própria em `skillsDoOcta` e a DEVOLVE em vez de registrar, então não há
 * colisão de nome no registry: ele passa a sua por turno, com as skills vendorizadas dele.
 */
export function activateSkillDaCasa(c: CatalogoDaCasa = catalogoDaCasa()): ToolDef {
  const corpos = new Map(c.skills.map((s) => [s.manifest.name, s.corpo]));
  const base = makeActivateSkillTool([...corpos.keys()], (n) => corpos.get(n) ?? null);
  return { ...base, disponivelNoTurno: () => corpos.size > 0 };
}

/**
 * Registra `activate_skill` no registry. Idempotente na prática (o registry é um Map por nome).
 * Devolve quantas skills da casa entraram — 0 significa "o chat segue como antes".
 */
export function registrarSkillsDaCasa(c: CatalogoDaCasa = catalogoDaCasa()): number {
  registerTool(activateSkillDaCasa(c));
  return c.skills.length;
}
