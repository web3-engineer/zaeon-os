/**
 * O mapa de capacidades só vale se cada nome nele for uma tool QUE EXISTE. Este teste nasceu de um
 * defeito meu: escrevi `code: ["octa_patch", "octa_run"]` sem olhar o registro — nenhuma das duas
 * existe (as do Octa são `octa_ler`, `octa_escrever`, …). Um mapa com nome inventado é pior que
 * nenhum mapa: o portão nega a tool certa e libera uma que não existe, e o cardápio da F0 volta a
 * prometer o que a casa não faz.
 */
import { describe, expect, it } from "vitest";
import {
  CAPACIDADES,
  HABILIDADES_DISTINTIVAS,
  TOOLS_BASE,
  TOOLS_POR_HABILIDADE,
  capacidadeDe,
  habilidadesDoTurno,
  toolsPermitidas,
} from "@/lib/agents/capacidades";
import { AGENTES_CHAT } from "@/lib/agents/chatAgentes";
import { ALL_MENTOR_SKILLS } from "@/lib/agent/mentors";
import { listTools, registrarAbrirUrl, registrarBaixarParaBase } from "@/lib/agent/runtime";
import { buscarAnatomiaDef, inspecionarAnatomiaDef } from "@/lib/anatomia/tools";

/** Todo nome de tool que o código define, independente de o ambiente do teste registrar ou não. */
function nomesQueExistem(): Set<string> {
  // as condicionais: forçadas com env de teste (as duas funções aceitam env injetada)
  const env = { LEITOR_PROXY_URL: "http://leitor", LEITOR_ALLOW: "exemplo.com", RAG_PG_URL: "postgres://x" };
  registrarAbrirUrl(env);
  registrarBaixarParaBase(env);
  const nomes = new Set(listTools().map((t) => t.name));
  // o atlas depende do manifesto EM DISCO; os defs são exportados, então o nome é verificável sem ele
  nomes.add(buscarAnatomiaDef.name);
  nomes.add(inspecionarAnatomiaDef.name);
  return nomes;
}

describe("capacidades do chat", () => {
  it("toda tool da BASE existe no registro (foi o defeito: nome inventado)", () => {
    const existem = nomesQueExistem();
    const fantasmas = TOOLS_BASE.filter((n) => !existem.has(n));
    expect(fantasmas).toEqual([]);
  });

  it("toda tool de habilidade existe no registro", () => {
    const existem = nomesQueExistem();
    const fantasmas = Object.entries(TOOLS_POR_HABILIDADE)
      .flatMap(([h, tools]) => tools.filter((n) => !existem.has(n)).map((n) => `${h}:${n}`));
    expect(fantasmas).toEqual([]);
  });

  it("o mapa cobre MentorSkill inteiro — skill nova sem decisão aqui é skill sem portão", () => {
    expect(Object.keys(TOOLS_POR_HABILIDADE).sort()).toEqual([...ALL_MENTOR_SKILLS].sort());
  });

  it("toda agente do seletor está no mapa (seletor e capacidade não podem divergir)", () => {
    for (const a of AGENTES_CHAT) expect(CAPACIDADES[a.id], a.id).toBeTruthy();
  });

  it("TODAS têm a base inteira — é o que 'mesmo nível de harness' quer dizer", () => {
    for (const a of AGENTES_CHAT) {
      const permitidas = toolsPermitidas(capacidadeDe(a.id).habilidades);
      for (const t of TOOLS_BASE) expect(permitidas.has(t), `${a.id} perdeu ${t}`).toBe(true);
    }
  });

  it("as distintivas não incluem memory nem studio: os 13 mentores declaram as duas, então são base", () => {
    expect(HABILIDADES_DISTINTIVAS).not.toContain("memory");
    expect(HABILIDADES_DISTINTIVAS).not.toContain("studio");
  });

  it("a Zenita é a da medicina: atlas + base de área", () => {
    expect(CAPACIDADES.zenita.habilidades).toContain("anatomia");
    expect(CAPACIDADES.zenita.area).toBe("medicina");
    const t = toolsPermitidas(CAPACIDADES.zenita.habilidades);
    expect(t.has("buscar_anatomia")).toBe(true);
    expect(t.has("inspecionar_anatomia")).toBe(true);
  });

  it("quem não tem a habilidade NÃO recebe a tool dela (senão o portão é enfeite)", () => {
    const nina = toolsPermitidas(CAPACIDADES.nina.habilidades);
    expect(nina.has("buscar_anatomia")).toBe(false);
    expect(nina.has("literature_search")).toBe(false);
    expect(nina.has("memory_search")).toBe(true); // mas a base continua inteira
  });

  it("o mentor ACRESCENTA habilidade, nunca tira", () => {
    const so = habilidadesDoTurno({ agente: "nina" });
    expect(so).toEqual([]);
    const com = habilidadesDoTurno({ agente: "nina", habilidadesDoMentor: ["literature", "memory"] });
    expect(com).toEqual(["literature", "memory"]);
    // e as da agente sobrevivem ao mentor
    const z = habilidadesDoTurno({ agente: "zenita", habilidadesDoMentor: ["code"] });
    expect(z).toContain("anatomia");
    expect(z).toContain("code");
  });

  it("habilidadesDoTurno não repete e é estável (o prompt não pode variar por ordem de iteração)", () => {
    const a = habilidadesDoTurno({ agente: "zenita", habilidadesDoMentor: ["anatomia", "literature"] });
    const b = habilidadesDoTurno({ agente: "zenita", habilidadesDoMentor: ["literature", "anatomia"] });
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
  });
});
