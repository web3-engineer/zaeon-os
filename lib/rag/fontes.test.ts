import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AREAS_DO_DATASET, FONTES_DE_BASE, areasDaFonte, fonteDeBase, fontesDaArea } from "./fontes";
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

  it("as fontes bloqueadas são as que perderam arquivo no /tmp, e dizem isso", () => {
    const bloqueadas = FONTES_DE_BASE.filter((f) => f.estado === "bloqueada").map((f) => f.id).sort();
    expect(bloqueadas).toEqual(["medicina", "scielo"]);
    for (const id of bloqueadas) expect(fonteDeBase(id)!.nota).toMatch(/tmp|apagad/i);
  });
});
