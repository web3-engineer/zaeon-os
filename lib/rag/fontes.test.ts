import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AREAS_DO_DATASET, COBERTURA, FONTES_DE_BASE, areasDaFonte, coberturaDaArea, fonteDeBase, fontesDaArea, totalMedido } from "./fontes";
import { AREA_GERAL, SLUGS_AREA } from "./areas";
import { MENTOR_SEED } from "@/lib/agent/mentors";

const SCRIPT = join(process.cwd(), "scripts/ingerir-bases-area.ts");
const fontesNoScript = () => {
  const src = readFileSync(SCRIPT, "utf8");
  return [...src.matchAll(/FONTES\.includes\("([a-z-]+)"\)/g)].map((m) => m[1]!).sort();
};

describe("catálogo das fontes de base", () => {
  // Esta é a razão do arquivo existir: catálogo que ninguém confere vira ficção.
  it("casa com o script de ingestão nos DOIS sentidos", () => {
    const noScript = [...new Set(fontesNoScript())];
    const noCatalogo = FONTES_DE_BASE.map((f) => f.id).sort();
    expect(noScript.length, "o script de ingestão tem de ter fontes").toBeGreaterThan(0);
    // fonte catalogada que o script não executa = promessa vazia
    expect(noCatalogo.filter((id) => !noScript.includes(id)), "catalogada mas o script não roda").toEqual([]);
    // fonte que o script executa sem estar no catálogo = dado entrando sem dono declarado
    expect(noScript.filter((id) => !noCatalogo.includes(id)), "o script roda mas não está catalogada").toEqual([]);
  });

  it("toda fonte tem origem, licença e uso comercial decidido — base sem licença não entra", () => {
    for (const f of FONTES_DE_BASE) {
      expect(f.origem.length, f.id).toBeGreaterThan(10);
      expect(f.licenca.length, f.id).toBeGreaterThan(2);
      expect(typeof f.comercial, f.id).toBe("boolean");
      expect(f.comercial, `${f.id}: fonte sem uso comercial não pode estar no catálogo`).toBe(true);
      expect(["producao", "pronta", "bloqueada"], f.id).toContain(f.estado);
      // bloqueada sem dizer o que falta é um beco sem saída pra quem for rodar
      if (f.estado === "bloqueada") expect(f.nota, `${f.id} bloqueada sem nota`).toBeTruthy();
    }
    expect(new Set(FONTES_DE_BASE.map((f) => f.id)).size).toBe(FONTES_DE_BASE.length);
  });

  it("toda área que uma fonte declara EXISTE — área inventada é documento invisível", () => {
    const validas = new Set([...SLUGS_AREA, AREA_GERAL]);
    for (const f of FONTES_DE_BASE) {
      for (const a of areasDaFonte(f)) expect(validas, `${f.id} → ${a}`).toContain(a);
    }
    for (const a of AREAS_DO_DATASET) expect(SLUGS_AREA).toContain(a);
  });

  it("o classificador NUNCA manda pra `geral` — e é por isso que `geral` depende de enem e mmlu", () => {
    for (const id of ["scielo", "wikipt"]) {
      const f = fonteDeBase(id)!;
      expect(f.area.tipo, id).toBe("classificador");
      expect(areasDaFonte(f), `${id} não pode alimentar a base geral`).not.toContain(AREA_GERAL);
    }
    // quem enche `geral`, a base que TODOS os agentes consultam
    const geral = fontesDaArea(AREA_GERAL).map((f) => f.id).sort();
    expect(geral).toEqual(["enem", "mmlu"]);
  });

  it("toda área tem pelo menos uma fonte, e todo mentor tem base pra ler", () => {
    for (const slug of SLUGS_AREA) {
      const fs = fontesDaArea(slug);
      expect(fs.length, `${slug} não tem NENHUMA fonte`).toBeGreaterThan(0);
      expect(fs.some((f) => f.estado !== "bloqueada"), `${slug} só tem fonte bloqueada`).toBe(true);
    }
    // a área é o endereço do mentor: um mentor sem fonte é agente sem base
    for (const m of MENTOR_SEED) {
      expect(fontesDaArea(m.slug).length, `mentor ${m.slug} (${m.name}) sem fonte nenhuma`).toBeGreaterThan(0);
    }
  });

  it("as medições somam EXATAMENTE o que o placar da VPS reporta — 7.832", () => {
    // Esta é a melhor conferência que existe aqui: o catálogo é escrito à mão, o placar lê o banco
    // de produção. Se os dois batem, as medições não são chute. Se divergirem, alguém mexeu num
    // número sem rodar o placar, e é isso que este teste pega.
    expect(totalMedido("vps")).toBe(7832);
    // e a quebra por área bate com o placar linha por linha
    const naVps = (a: string) => { const c = coberturaDaArea(a); return c.naVps.proprio + c.naVps.prova + c.naVps.enciclopedico; };
    expect(naVps("medicina")).toBe(1497);
    expect(naVps("enfermagem")).toBe(1500);
    expect(naVps("biologia")).toBe(1500);
    expect(naVps("eng-computacao")).toBe(626);
    expect(naVps("eng-energias")).toBe(984);
    expect(naVps("matematica")).toBe(1185);
    expect(naVps("geral")).toBe(540);
    // as sete que o placar mostra em zero continuam em zero
    for (const a of ["fisica", "agronomia", "quimica", "eng-civil", "veterinaria", "psicologia", "farmacia"]) {
      expect(naVps(a), `${a} devia estar em zero na VPS`).toBe(0);
    }
  });

  it("a cobertura NÃO conta enciclopédia como especialidade", () => {
    // Wikipédia alcança as 17 áreas. Se ela contasse, todo agente estaria "coberto" e a palavra
    // não significaria nada. Então área que só tem wiki/wikipt fica em `enciclopedico`.
    const soEnciclopedico = COBERTURA.filter((c) => c.nivel === "enciclopedico").map((c) => c.area).sort();
    expect(soEnciclopedico).toEqual(["agronomia", "eng-civil", "farmacia", "veterinaria"]);
    for (const c of COBERTURA.filter((x) => x.nivel === "enciclopedico")) {
      expect(c.comDeploy.proprio, `${c.area} não deveria ter corpus próprio`).toBe(0);
      expect(c.comDeploy.prova, `${c.area} não deveria ter prova`).toBe(0);
      expect(c.comDeploy.enciclopedico, `${c.area} tem de ter pelo menos o piso`).toBeGreaterThan(0);
    }
  });

  it("os três níveis, nomeados — mudança de cobertura passa por aqui", () => {
    const por = (n: string) => COBERTURA.filter((c) => c.nivel === n).map((c) => c.area).sort();
    expect(por("proprio")).toEqual([
      "biologia", "enfermagem", "eng-computacao", "eng-energias", "infra",
      "matematica", "medicina", "seguranca", "software",
    ]);
    expect(por("prova")).toEqual(["dados-ia", "fisica", "geral", "psicologia", "quimica"]);
    expect(COBERTURA).toHaveLength(18); // as 17 áreas + geral
  });

  it("a SciELO conta mesmo BLOQUEADA: estado da fonte e presença do dado são coisas diferentes", () => {
    const f = fonteDeBase("scielo")!;
    expect(f.estado).toBe("bloqueada");           // não dá pra rodar de novo: perdeu o JSONL
    expect(coberturaDaArea("enfermagem").naVps.proprio).toBe(1500);  // mas os documentos estão lá
    expect(coberturaDaArea("enfermagem").nivel).toBe("proprio");
    // e, por isso, ela NÃO aparece na lista de fontes vivas da área
    expect(coberturaDaArea("enfermagem").fontes).not.toContain("scielo");
  });

  it("toda área medida existe, e nenhuma medição inventa área", () => {
    const validas = new Set([...SLUGS_AREA, AREA_GERAL]);
    for (const f of FONTES_DE_BASE) {
      for (const m of f.medicoes ?? []) {
        expect(m.data, f.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(["vps", "ensaio"], f.id).toContain(m.onde);
        for (const a of Object.keys(m.porArea)) expect(validas, `${f.id} mediu área inexistente: ${a}`).toContain(a);
        for (const [a, n] of Object.entries(m.porArea)) expect(n, `${f.id}/${a}`).toBeGreaterThan(0);
      }
    }
  });

  it("as fontes bloqueadas são as que perderam arquivo no /tmp, e dizem isso", () => {
    const bloqueadas = FONTES_DE_BASE.filter((f) => f.estado === "bloqueada").map((f) => f.id).sort();
    expect(bloqueadas).toEqual(["medicina", "scielo"]);
    for (const id of bloqueadas) expect(fonteDeBase(id)!.nota).toMatch(/tmp|apagad/i);
  });
});
