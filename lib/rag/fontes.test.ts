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

  it("a régua: enciclopédia NUNCA conta como especialidade", () => {
    // Wikipédia alcança as 17 áreas. Se ela contasse, todo agente estaria "coberto" e a palavra não
    // significaria nada. A régua é a natureza da fonte, e `enciclopedico` é piso, não cobertura.
    for (const c of COBERTURA) {
      if (c.nivel === "enciclopedico") {
        expect(c.comDeploy.proprio, `${c.area} em enciclopédico mas com corpus próprio`).toBe(0);
        expect(c.comDeploy.prova, `${c.area} em enciclopédico mas com prova`).toBe(0);
      }
      if (c.nivel === "prova") expect(c.comDeploy.proprio, `${c.area} em prova mas com corpus próprio`).toBe(0);
      if (c.nivel === "proprio") expect(c.comDeploy.proprio, c.area).toBeGreaterThan(0);
    }
  });

  it("as 17 áreas têm corpus do ofício; só `geral` é de prova — NENHUM agente descoberto", () => {
    // Era o buraco: agronomia, engenharia civil, veterinária e farmácia tinham só enciclopédia,
    // porque a SciELO (que alcança as quatro pelo classificador) havia perdido o JSONL no /tmp.
    // Refazendo o corpus — 154.040 artigos — as quatro passaram a ter artigo acadêmico da área.
    const por = (n: string) => COBERTURA.filter((c) => c.nivel === n).map((c) => c.area).sort();
    expect(por("proprio")).toEqual([...SLUGS_AREA].sort());
    expect(por("prova")).toEqual([AREA_GERAL]);
    expect(por("enciclopedico"), "agente descoberto é agente sem especialidade").toEqual([]);
    expect(COBERTURA).toHaveLength(18); // as 17 áreas + geral
    // as quatro que eram o buraco, nomeadas, com o número que as cobriu
    for (const [area, n] of [["agronomia", 1500], ["veterinaria", 1500], ["eng-civil", 1169], ["farmacia", 1277]] as const) {
      expect(coberturaDaArea(area).comDeploy.proprio, area).toBe(n);
    }
  });

  it("nenhuma fonte fica bloqueada: as duas que perderam arquivo no /tmp foram refeitas", () => {
    expect(FONTES_DE_BASE.filter((f) => f.estado === "bloqueada")).toEqual([]);
    // a SciELO é REFEITA por script (sem Python), e a nota avisa do pico de memória
    expect(fonteDeBase("scielo")!.estado).toBe("pronta");
    expect(fonteDeBase("scielo")!.nota).toMatch(/scielo-para-jsonl|11 GB/);
    // a `medicina` deixou de depender de arquivo: lê o parquet direto
    expect(fonteDeBase("medicina")!.estado).toBe("pronta");
    expect(fonteDeBase("medicina")!.nota).toMatch(/PARQUET direto/);
  });

  it("duas medições da MESMA fonte são um teto, não duas remessas", () => {
    // A SciELO tem 1.497 de `medicina` já na VPS e 1.500 que entrariam ao refazer. Somar daria
    // 2.997, e é falso: a ingestão dedupe pelo hash do texto e devolve "reaproveitado". Então vale
    // o MÁXIMO por fonte+área. Entre fontes diferentes soma, porque aí são documentos diferentes.
    const scielo = fonteDeBase("scielo")!;
    expect(scielo.medicoes, "o teste precisa das duas medições pra valer algo").toHaveLength(2);
    expect(scielo.medicoes!.map((m) => m.porArea.medicina)).toEqual([1497, 1500]);
    const med = coberturaDaArea("medicina");
    expect(med.naVps.proprio, "só a medição da VPS, e sem somar com a de ensaio").toBe(1497);
    // próprio = max(scielo) 1500 + max(medicina-pt) 753 = 2253, não 1497+1500+753
    expect(med.comDeploy.proprio).toBe(2253);
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
});
