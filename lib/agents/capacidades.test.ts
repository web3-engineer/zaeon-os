/**
 * O mapa de capacidades só vale se cada nome nele for uma tool QUE EXISTE. Este teste nasceu de um
 * defeito meu: escrevi `code: ["octa_patch", "octa_run"]` sem olhar o registro — nenhuma das duas
 * existe (as do Octa são `octa_ler`, `octa_escrever`, …). Um mapa com nome inventado é pior que
 * nenhum mapa: o portão nega a tool certa e libera uma que não existe, e o cardápio da F0 volta a
 * prometer o que a casa não faz.
 */
import { describe, expect, it } from "vitest";
import { ehAgenteOrquestra } from "@/lib/orquestra/catalogo";
import {
  CAPACIDADES,
  HABILIDADES_DISTINTIVAS,
  TOOLS_BASE,
  TOOLS_POR_HABILIDADE,
  CONECTOR_CAD,
  TOOLS_DO_SOLIDCRAFT,
  capacidadeDe,
  habilidadesDoTurno,
  toolsPermitidas,
} from "@/lib/agents/capacidades";
import { AGENTES_CHAT } from "@/lib/agents/chatAgentes";
import { ALL_MENTOR_SKILLS } from "@/lib/agent/mentors";
import { listTools, registrarAbrirUrl, registrarBaixarParaBase, registrarDescreverImagem } from "@/lib/agent/runtime";
import { buscarAnatomiaDef, inspecionarAnatomiaDef } from "@/lib/anatomia/tools";

/** Todo nome de tool que o código define, independente de o ambiente do teste registrar ou não. */
function nomesQueExistem(): Set<string> {
  // as condicionais: forçadas com env de teste (as duas funções aceitam env injetada)
  const env = { LEITOR_PROXY_URL: "http://leitor", LEITOR_ALLOW: "exemplo.com", RAG_PG_URL: "postgres://x" };
  registrarAbrirUrl(env);
  registrarBaixarParaBase(env);
  // `descrever_imagem` é condicional a credencial Vertex + flag VISAO_HARNESS; forçadas aqui.
  registrarDescreverImagem({ GOOGLE_PROJECT_ID: "p", GOOGLE_CLIENT_EMAIL: "e", GOOGLE_PRIVATE_KEY: "k", VISAO_HARNESS: "1" });
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

  it("toda tool de habilidade existe no registro (as nossas)", () => {
    const existem = nomesQueExistem();
    const fantasmas = Object.entries(TOOLS_POR_HABILIDADE)
      .flatMap(([h, tools]) => tools
        // as de conector MCP têm verificação PRÓPRIA no caso abaixo: elas só entram no registry
        // quando o servidor sobe, então o registry não é a autoridade sobre elas.
        .filter((n) => !n.startsWith("mcp:"))
        .filter((n) => !existem.has(n))
        .map((n) => `${h}:${n}`));
    expect(fantasmas).toEqual([]);
  });

  /**
   * As tools de CONECTOR não estão no registry em teste: `registerMcpConnector` só as registra
   * quando o servidor responde, e aqui não há servidor. Então a autoridade sobre elas é a
   * SUPERFÍCIE DECLARADA do conector — a lista que eu MEDI subindo o `solidcraft-cli mcp` e lendo o
   * `tools/list` (21 tools, todas anotadas).
   *
   * Isto continua pegando nome inventado, que é o defeito que este arquivo existe pra impedir:
   * `mcp:solidcraft:fly` não está na superfície e cai aqui.
   */
  it("toda tool de CAD existe na superfície declarada do SolidCraft", () => {
    const declaradas = new Set(TOOLS_DO_SOLIDCRAFT.map((t) => `mcp:${CONECTOR_CAD}:${t}`));
    const fantasmas = (TOOLS_POR_HABILIDADE.cad ?? []).filter((n) => !declaradas.has(n));
    expect(fantasmas).toEqual([]);
  });

  it("…e o inverso: um nome fora da superfície do conector é acusado", () => {
    const declaradas = new Set(TOOLS_DO_SOLIDCRAFT.map((t) => `mcp:${CONECTOR_CAD}:${t}`));
    expect(declaradas.has("mcp:solidcraft:fly")).toBe(false);
  });

  it("`crash_reports` fica FORA do CAD de propósito: lê a máquina, não a peça", () => {
    expect(TOOLS_DO_SOLIDCRAFT).toContain("crash_reports");          // existe no servidor
    expect(TOOLS_POR_HABILIDADE.cad).not.toContain("mcp:solidcraft:crash_reports");
  });

  it("o Eiffel começa pela skill: `skill_reference` está na lista dele", () => {
    expect(TOOLS_POR_HABILIDADE.cad).toContain("mcp:solidcraft:skill_reference");
    expect(CAPACIDADES.eiffel.habilidades).toContain("cad");
    expect(CAPACIDADES.eiffel.area).toBe("eng-civil");
  });

  it("quem não é o Eiffel NÃO tem CAD", () => {
    for (const id of ["aura", "zenita", "nina"] as const) {
      expect(CAPACIDADES[id].habilidades, id).not.toContain("cad");
      expect([...toolsPermitidas(CAPACIDADES[id].habilidades)].some((t) => t.startsWith("mcp:solidcraft:")), id).toBe(false);
    }
  });

  it("o mapa cobre MentorSkill inteiro — skill nova sem decisão aqui é skill sem portão", () => {
    expect(Object.keys(TOOLS_POR_HABILIDADE).sort()).toEqual([...ALL_MENTOR_SKILLS].sort());
  });

  it("toda agente do seletor está no mapa (seletor e capacidade não podem divergir)", () => {
    // os agentes da ORQUESTRA (orq-*) são a Aura pedindo outro motor: a capacidade deles É a da Aura, por desenho
    for (const a of AGENTES_CHAT) {
      if (ehAgenteOrquestra(a.id)) expect(capacidadeDe(a.id), a.id).toBe(CAPACIDADES.aura);
      else expect(CAPACIDADES[a.id as keyof typeof CAPACIDADES], a.id).toBeTruthy();
    }
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
