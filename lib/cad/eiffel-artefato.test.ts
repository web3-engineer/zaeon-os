/**
 * O EIFFEL NÃO ENTREGA PEÇA — a cadeia inteira, da frase do aluno ao artefato, afirmada por teste.
 *
 * Escrito depois da queixa do dono (2026-11-10): "não tá gerando artefato nem abrindo modo editor".
 * O objetivo não é cobrir código: é LOCALIZAR CADA DEGRAU QUEBRADO e deixá-lo registrado, para o
 * conserto ter onde cair e para ninguém reabrir a investigação do zero.
 *
 * ────────────────────────── por que `it.fails` e não asserção invertida ──────────────────────────
 * Um teste que afirmasse o defeito ("cad devolve erro") passaria hoje e QUEBRARIA no dia do
 * conserto — castigando quem consertar. `it.fails` afirma o comportamento DESEJADO e espera que ele
 * ainda não aconteça: quando o conserto chegar, o `.fails` é que falha, pedindo para ser removido.
 * O teste se desmonta sozinho e vira regressão de verdade, sem ninguém lembrar de voltar aqui.
 *
 * ────────────────────────── MEDIDO EM PRODUÇÃO (2026-11-10) ──────────────────────────
 * POST com corpo JSON em https://75-119-140-97.sslip.io:
 *
 *   guide 401 · molecule 401 · anatomia 401 · diagram 401 · image 401 · aula 401
 *   faq 401 · flashcards 401 · timeline 401 · podcast 401 · video 401 · mindmap 401
 *   cad ......................................................... 405, CORPO VAZIO
 *
 * 401 = a rota existe e pede login. 405 = não existe `app/api/studio/cad/route.ts`, então o caminho
 * casa com a rota DINÂMICA `app/api/studio/[id]`, que só exporta GET e DELETE. E o 405 do Next vem
 * SEM CORPO, então `data?.error` é `undefined` — é por isso que a bolha fica MUDA em vez de explicar.
 *
 * E o recibo de produção diz `mcp: "on (9 tools)"`. As 9 são do `scholar` (lib/agent/mcp-real.test
 * afirma exatamente esse número). O SolidCraft expõe 21 e a habilidade `cad` seleciona 18 — nenhuma
 * delas está no ar. O deploy usa `MCP_CONECTORES: ${{ vars.MCP_CONECTORES || 'scholar' }}`.
 */
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { normalizeStudioKind, STUDIO_KINDS } from "@/lib/agent/tools";
import { gerarArtefato } from "@/lib/studio/studioClient";
import { CAMINHO_WASM_CAD } from "@/lib/cad/mcp";
import { TOOLS_POR_HABILIDADE } from "@/lib/agents/capacidades";

/** Os status que produção devolveu, medidos um por um. Tudo 401, menos o cad. */
const PROD: Record<string, number> = Object.fromEntries([
  ["guide", 401], ["molecule", 401], ["anatomia", 401], ["diagram", 401], ["image", 401],
  ["aula", 401], ["faq", 401], ["flashcards", 401], ["timeline", 401], ["podcast", 401],
  ["video", 401], ["mindmap", 401], ["cad", 405],
].map(([k, v]) => [`/api/studio/${k}`, v as number]));

/**
 * Um `fetch` que responde como produção respondeu, mas AUTENTICADO: onde produção disse 401 (rota
 * existe, falta login) este devolve o caminho feliz. Assim o único degrau que sobra é o do SERVIDOR.
 * O 405 vem com corpo vazio, como o de verdade — é o detalhe que explica o silêncio da bolha.
 */
function fetchComoProd(): typeof fetch {
  return (async (url: any) => {
    const caminho = String(url).split("?")[0]!;
    const status = PROD[caminho];
    if (status === 401) {
      return new Response(JSON.stringify({ id: "art_1", status: "done", title: "ok", meta: { x: 1 } }), { status: 200 });
    }
    return new Response("", { status: status ?? 404 });   // 405 do Next: SEM CORPO
  }) as unknown as typeof fetch;
}

const pedir = (kind: string) =>
  gerarArtefato(kind, { topic: "viga de concreto armado biapoiada", fetch: fetchComoProd(), sleep: async () => {} });

describe("1 · o vocabulário — a frase do aluno chega no kind certo?", () => {
  it("as palavras do ofício chegam em 'cad' (este degrau está BOM)", () => {
    for (const t of ["cad", "peça", "peca", "peça cad", "peca cad", "modelo cad"]) {
      expect(normalizeStudioKind(t), `"${t}"`).toBe("cad");
    }
  });

  it("'cad' é um kind declarado — o registro não é o problema", () => {
    expect(STUDIO_KINDS).toContain("cad");
  });

  it("RISCO: 'modelo 3d' e 'estrutura 3d' vão para MOLÉCULA, não para o Eiffel", () => {
    // Não é acidente — está escrito em tools.ts que `cad` não reusa "modelo 3d". Mas é a palavra que
    // um aluno de engenharia usa para pedir uma peça, e o resultado é um artefato de química.
    // Afirmado para a escolha continuar consciente, não virar herança esquecida.
    expect(normalizeStudioKind("modelo 3d")).toBe("molecule");
    expect(normalizeStudioKind("estrutura 3d")).toBe("molecule");
  });

  it("e as palavras cruas da engenharia caem em 'guide' — viram texto, não peça", () => {
    for (const t of ["viga", "pilar", "laje", "suporte", "flange", "memorial de calculo"]) {
      expect(normalizeStudioKind(t), `"${t}"`).toBe("guide");
    }
  });
});

describe("2 · CAUSA A · o servidor não tem onde gerar a peça", () => {
  it("os kinds COM rota entregam pelo caminho genérico — o cliente está certo", async () => {
    for (const k of ["guide", "faq", "flashcards", "timeline"]) {
      const r = await pedir(k);
      expect(r.tipo, `${k}`).toBe("pronto");
    }
  });

  it.fails("DEFEITO: pedir 'cad' devia entregar uma peça (hoje: 405 da rota [id])", async () => {
    const r = await pedir("cad");
    expect(r.tipo).toBe("pronto");
  });

  it.fails("DEFEITO: e quando falha, devia DIZER o porquê (hoje o 405 vem sem corpo → bolha muda)", async () => {
    const r = await pedir("cad");
    expect(r.tipo === "erro" && typeof r.mensagem === "string" && r.mensagem.length > 0).toBe(true);
  });
});

describe("3 · CAUSA B · o Eiffel não tem as ferramentas no ar", () => {
  it("a habilidade 'cad' declara 18 tools do SolidCraft — isso está certo no código", () => {
    const tools = TOOLS_POR_HABILIDADE.cad;
    expect(tools.length).toBe(18);
    expect(tools.every((t) => t.startsWith("mcp:solidcraft:"))).toBe(true);
  });

  /**
   * Produção reporta `mcp: "on (9 tools)"`, e lib/agent/mcp-real.test afirma que 9 é exatamente o
   * `scholar`. Nenhuma tool do SolidCraft está registrada, então o Eiffel não modela — não é que ele
   * modele e o artefato se perca: ele não tem com o quê. Conserto: a Variable MCP_CONECTORES.
   */
  it("o deploy cai no conector PADRÃO quando a Variable não está definida", async () => {
    const { ENV_CONECTORES } = await import("@/lib/agent/mcp-boot");
    expect(ENV_CONECTORES).toBe("MCP_CONECTORES");
  });
});

describe("4 · CAUSA C · o modo edição nunca foi construído", () => {
  /**
   * Não é regressão: é o passo 5 da ordem de execução do handoff, que nunca rodou. O recibo de
   * produção já diz a verdade há tempos — `cad: { cli: "on", wasm: "off" }`.
   */
  it.fails("DEFEITO: o bundle WASM do editor devia estar servido", () => {
    expect(existsSync(CAMINHO_WASM_CAD)).toBe(true);
  });

  it.fails("DEFEITO: a host page do editor devia existir", () => {
    expect(existsSync("app/cad/editor/page.tsx")).toBe(true);
  });
});
