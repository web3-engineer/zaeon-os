/**
 * lib/agent/skills-dir.test.ts — o loader, o card, e O PORTÃO.
 *
 * O dono definiu a regra: "a validação deve vir na suíte de teste e isso deve ser suficiente para
 * a skill passar para a produção". O `describe` do portão, no fim deste arquivo, caminha o
 * diretório REAL e cobra de cada skill tudo que precisa ser verdade para ela não quebrar nada.
 * Skill nova que não passar aqui não entra — e não existe segunda porta, porque não existe lista
 * de skills escrita à mão em lugar nenhum: o catálogo é o diretório.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  DIR_SKILLS_CASA, appsDoCatalogo, cardDaSkill, cardsDasSkills, carregarSkillsDaCasa, fsDeDisco,
  type FsDeSkills, type SkillDaCasa,
} from "@/lib/agent/skills-dir";
import { MAX_DESC, MAX_NAME, NAME_RE } from "@/lib/agent/skills";
import { getTool } from "@/lib/agent/runtime";
import { registrarAnatomia } from "@/lib/anatomia/tools";
import { itemDaSkill } from "@/lib/estudos/vitrineSkills";
import { DONO_VITRINE } from "@/lib/auth/roles";

/** Um SKILL.md mínimo e válido, para cada teste mexer num campo só. */
const md = (over: Partial<Record<string, string>> = {}, corpo = "linha a\nlinha b\nlinha c") => {
  const campos: Record<string, string> = {
    name: "exemplo",
    description: "Uma skill de exemplo. Use quando o teste pedir.",
    ...over,
  };
  const cab = Object.entries(campos).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");
  return `---\n${cab}\n---\n\n${corpo}\n`;
};

const fsFake = (arquivos: Record<string, string | null>): FsDeSkills => ({
  listar: () => Object.keys(arquivos),
  ler: (_dir, pasta) => arquivos[pasta] ?? null,
});

describe("carregarSkillsDaCasa — nunca lança, sempre explica", () => {
  it("carrega a skill válida com manifesto, corpo e pasta", () => {
    const c = carregarSkillsDaCasa(fsFake({ exemplo: md() }));
    expect(c.recusadas).toEqual([]);
    expect(c.skills).toHaveLength(1);
    expect(c.skills[0].manifest.name).toBe("exemplo");
    expect(c.skills[0].corpo).toBe("linha a\nlinha b\nlinha c");
    expect(c.skills[0].pasta).toBe("exemplo");
  });

  it("o corpo NÃO carrega o frontmatter de volta", () => {
    const c = carregarSkillsDaCasa(fsFake({ exemplo: md() }));
    expect(c.skills[0].corpo).not.toContain("description:");
    expect(c.skills[0].corpo).not.toContain("---");
  });

  it("pasta sem SKILL.md é recusa com motivo, não exceção", () => {
    const c = carregarSkillsDaCasa(fsFake({ vazia: null }));
    expect(c.skills).toEqual([]);
    expect(c.recusadas[0]).toEqual({ nome: "vazia", motivo: "pasta sem SKILL.md" });
  });

  it("STRICT: `name` ≠ pasta é RECUSA aqui, enquanto no Octa seria só aviso", () => {
    const c = carregarSkillsDaCasa(fsFake({ "outra-pasta": md() }));
    expect(c.skills).toEqual([]);
    expect(c.recusadas[0].motivo).toContain("diretório");
  });

  it("frontmatter quebrado e corpo vazio são recusados, cada um com seu motivo", () => {
    const c = carregarSkillsDaCasa(fsFake({
      quebrada: "sem frontmatter nenhum",
      "sem-corpo": md({ name: "sem-corpo" }, "   "),
    }));
    expect(c.skills).toEqual([]);
    expect(c.recusadas.map((r) => r.nome).sort()).toEqual(["quebrada", "sem-corpo"]);
    expect(c.recusadas.find((r) => r.nome === "sem-corpo")!.motivo).toContain("corpo vazio");
  });

  it("uma skill quebrada NÃO derruba as boas — é o que impede uma skill nova de parar o chat", () => {
    const c = carregarSkillsDaCasa(fsFake({ boa: md({ name: "boa" }), ruim: "lixo" }));
    expect(c.skills.map((s) => s.manifest.name)).toEqual(["boa"]);
    expect(c.recusadas).toHaveLength(1);
  });

  it("erro de leitura vira recusa, não exceção", () => {
    const c = carregarSkillsDaCasa({
      listar: () => ["x"],
      ler: () => { throw new Error("EACCES"); },
    });
    expect(c.recusadas[0].motivo).toContain("EACCES");
  });

  it("diretório ausente ⇒ catálogo vazio, sem erro", () => {
    const c = carregarSkillsDaCasa({ listar: () => { throw new Error("ENOENT"); }, ler: () => null });
    expect(c).toEqual({ skills: [], recusadas: [] });
  });

  it("ordem alfabética — o cardápio do prompt tem de ser estável entre deploys", () => {
    const c = carregarSkillsDaCasa(fsFake({
      zebra: md({ name: "zebra" }), alfa: md({ name: "alfa" }), meio: md({ name: "meio" }),
    }));
    expect(c.skills.map((s) => s.manifest.name)).toEqual(["alfa", "meio", "zebra"]);
  });
});

describe("cardDaSkill — tudo-ou-nada", () => {
  const comMeta = (meta: string, nome = "exemplo"): SkillDaCasa =>
    carregarSkillsDaCasa(fsFake({ [nome]: md({ name: nome }) + "" })).skills[0] &&
    carregarSkillsDaCasa(fsFake({
      [nome]: `---\nname: ${nome}\ndescription: Use quando o teste pedir.\nmetadata:\n${meta}\n---\n\na\nb\nc\n`,
    })).skills[0];

  it("sem título não há card — e isso é válido: nem todo procedimento vira produto na loja", () => {
    expect(cardDaSkill(comMeta("  zaeon-app: x"))).toBeNull();
  });

  it("título sem subtítulo ou sem entrega não vira card pela metade", () => {
    expect(cardDaSkill(comMeta("  zaeon-titulo: T"))).toBeNull();
    expect(cardDaSkill(comMeta("  zaeon-titulo: T\n  zaeon-subtitulo: S"))).toBeNull();
  });

  it("card completo, com `livro` como modelo padrão", () => {
    const card = cardDaSkill(comMeta(
      "  zaeon-titulo: T\n  zaeon-subtitulo: S\n  zaeon-entrega: a; b\n  zaeon-tags: t1, t2",
    ))!;
    expect(card).toEqual({
      slug: "exemplo", titulo: "T", subtitulo: "S", modelo: "livro",
      tags: ["t1", "t2"], entrega: ["a", "b"], app: null,
      precoBRL: 0, familia: "procedimento", // sem envelope de preço → grátis, procedimento
    });
  });

  it("lê preço e família do envelope; preço negativo vira 0 (grátis), não crédito", () => {
    const pago = cardDaSkill(comMeta(
      "  zaeon-titulo: T\n  zaeon-subtitulo: S\n  zaeon-entrega: a\n  zaeon-preco-brl: 545\n  zaeon-familia: course",
    ))!;
    expect(pago.precoBRL).toBe(545);
    expect(pago.familia).toBe("course");

    const neg = cardDaSkill(comMeta(
      "  zaeon-titulo: T\n  zaeon-subtitulo: S\n  zaeon-entrega: a\n  zaeon-preco-brl: -10",
    ))!;
    expect(neg.precoBRL).toBe(0);

    const familiaTorta = cardDaSkill(comMeta(
      "  zaeon-titulo: T\n  zaeon-subtitulo: S\n  zaeon-entrega: a\n  zaeon-familia: inventada",
    ))!;
    expect(familiaTorta.familia, "família desconhecida cai em procedimento").toBe("procedimento");
  });

  it("app e modelo vêm do envelope quando declarados", () => {
    const card = cardDaSkill(comMeta(
      "  zaeon-titulo: T\n  zaeon-subtitulo: S\n  zaeon-entrega: a\n  zaeon-modelo: molecula\n  zaeon-app: atlas",
    ))!;
    expect(card.modelo).toBe("molecula");
    expect(card.app).toBe("atlas");
  });

  it("cardsDasSkills e appsDoCatalogo juntam só o que existe, sem repetir", () => {
    const c = carregarSkillsDaCasa(fsFake({
      a: `---\nname: a\ndescription: Use quando.\nmetadata:\n  zaeon-titulo: A\n  zaeon-subtitulo: S\n  zaeon-entrega: e\n  zaeon-app: app1\n---\n\nx\ny\nz\n`,
      b: `---\nname: b\ndescription: Use quando.\nmetadata:\n  zaeon-app: app1\n---\n\nx\ny\nz\n`,
      c: md({ name: "c" }),
    }));
    expect(c.skills).toHaveLength(3);
    expect(cardsDasSkills(c).map((x) => x.slug)).toEqual(["a"]); // só `a` tem card completo
    expect(appsDoCatalogo(c)).toEqual(["app1"]);                 // `a` e `b` apontam o mesmo app
  });
});

describe("EMPACOTAMENTO · a skill tem de chegar na imagem", () => {
  /**
   * `.dockerignore` tem `*.md`. Este teste fixa a exceção que salva as skills. Sem ela, todo o
   * resto deste arquivo passaria verde e o recurso estaria morto em produção — a pior forma de
   * quebrar, porque o CI jura que está tudo bem.
   */
  it("`.dockerignore` reinclui `.claude/skills`", () => {
    const di = readFileSync(".dockerignore", "utf8");
    expect(di).toContain("!.claude/skills/**");
    // e a exceção vem DEPOIS do padrão que ela nega: no Docker a ordem decide
    expect(di.indexOf("!.claude/skills/**")).toBeGreaterThan(di.indexOf("*.md"));
  });

  /**
   * A armadilha pior: `.gitignore` ignorava `.claude/` inteiro, então a skill nem ENTRAVA no
   * repositório — e aí o `.dockerignore` não importaria. Duas coisas a fixar:
   *   · a exceção existe;
   *   · o padrão é `.claude/*` e não `.claude/`. Com a barra o git não desce no diretório e
   *     nenhuma linha `!` resgata o que está dentro. Foi exatamente o erro que eu cometi antes
   *     de medir, e o teste existe para ninguém o repetir.
   */
  it("`.gitignore` deixa `.claude/skills` entrar no repositório", () => {
    const gi = readFileSync(".gitignore", "utf8");
    expect(gi).toContain("!.claude/skills/");
    expect(gi, "com `.claude/` (com barra) o git nem desce, e a exceção não funciona")
      .not.toMatch(/^\.claude\/$/m);
    expect(gi).toMatch(/^\.claude\/\*$/m);
  });

  it("a skill de verdade está VISÍVEL para o git (não é só teoria do padrão)", () => {
    // `git check-ignore` sai 1 quando o caminho NÃO é ignorado — é o que queremos.
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { spawnSync } = require("node:child_process") as typeof import("node:child_process");
    /* eslint-enable @typescript-eslint/no-require-imports */
    const alvo = `${DIR_SKILLS_CASA}/${catalogo.skills[0]?.pasta ?? "anatomia-3d"}/SKILL.md`;
    const r = spawnSync("git", ["check-ignore", "-q", alvo], { encoding: "utf8" });
    expect(r.status, `${alvo} está ignorado pelo git — a skill não chegaria ao repositório`).toBe(1);
  });
});

// ─────────────────────────────── O PORTÃO ───────────────────────────────

const catalogo = carregarSkillsDaCasa(fsDeDisco(), DIR_SKILLS_CASA);

/** Modelos 3D que a vitrine sabe desenhar (lib/estudos/vitrine · Modelo3D). */
const MODELOS_3D = [
  "console", "chip", "planta", "predio", "drone", "foguete",
  "molecula", "engrenagem", "livro", "graos", "ondas", "robo",
] as const;

describe(`PORTÃO das skills da casa · ${DIR_SKILLS_CASA}`, () => {
  beforeAll(() => {
    // O registry é estado de processo: as tools de anatomia só existem depois disto.
    registrarAnatomia();
  });

  it("nenhuma skill recusada", () => {
    const erros = catalogo.recusadas.map((r) => `  · ${r.nome}: ${r.motivo}`).join("\n");
    expect(catalogo.recusadas, `skill(s) recusada(s):\n${erros}`).toEqual([]);
  });

  it("há pelo menos uma skill — diretório vazio não passa calado", () => {
    expect(catalogo.skills.length).toBeGreaterThan(0);
  });

  describe.each(catalogo.skills.map((s): [string, SkillDaCasa] => [s.manifest.name, s]))(
    "skill %s",
    (_nome, s) => {
      it("dentro dos limites do spec (que são os do Claude Code)", () => {
        expect(s.manifest.name.length).toBeLessThanOrEqual(MAX_NAME);
        expect(NAME_RE.test(s.manifest.name)).toBe(true);
        expect(s.manifest.description.length).toBeLessThanOrEqual(MAX_DESC);
      });

      it("a descrição diz QUANDO usar — é por ela que o modelo decide ativar", () => {
        expect(s.manifest.description.toLowerCase()).toMatch(/\buse\b|\bquando\b/);
      });

      it("tem instrução de verdade, não um parágrafo de enfeite", () => {
        expect(s.corpo.split("\n").filter((l) => l.trim()).length).toBeGreaterThanOrEqual(3);
      });

      it("toda tool declarada em allowedTools EXISTE no registry", () => {
        for (const t of s.manifest.allowedTools ?? []) {
          expect(
            getTool(t),
            `a skill "${s.manifest.name}" declara a tool "${t}", que o registry não tem. ` +
            "Ou o nome está errado, ou o módulo que a registra não foi importado, " +
            "ou o dado de que ela depende não está nesta build.",
          ).toBeTruthy();
        }
      });

      it("declara courseTags — é por elas que a skill chega ao curso certo", () => {
        expect(s.manifest.courseTags ?? [], "skill sem courseTags não aparece em curso nenhum")
          .not.toHaveLength(0);
      });

      it("o card, se houver, usa um modelo 3D que a vitrine desenha", () => {
        const card = cardDaSkill(s);
        if (!card) return;
        expect(MODELOS_3D as readonly string[]).toContain(card.modelo);
        expect(card.entrega.length, "card sem entrega não diz ao aluno o que ele ganha")
          .toBeGreaterThan(0);
      });

      it("REGRA DO DONO: card pago ou de curso pertence ao fundador, e com preço coerente", () => {
        const card = cardDaSkill(s);
        if (!card) return;
        const item = itemDaSkill(card);
        const pago = card.precoBRL > 0;
        const curso = card.familia === "course";

        if (pago) {
          expect(Number.isFinite(card.precoBRL) && card.precoBRL > 0,
            `"${s.manifest.name}" é paga mas o preço não é um número positivo`).toBe(true);
        }
        if (pago || curso) {
          expect(item.dono,
            `"${s.manifest.name}" é ${curso ? "curso" : "paga"} e tem de pertencer ao fundador`)
            .toBe(DONO_VITRINE);
        } else {
          expect(item.dono, `"${s.manifest.name}" é grátis de procedimento e não deve ter dono`)
            .toBeUndefined();
        }

        // Uma família "pago" sem preço, ou um preço numa família que não cobra, é contradição.
        if (card.familia === "pago") {
          expect(card.precoBRL, `"${s.manifest.name}" é família "pago" mas custa 0`).toBeGreaterThan(0);
        }
      });
    },
  );
});
