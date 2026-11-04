/**
 * SMOKE do caminho REAL do MCP — o que `lib/agent/mcp.ts` dizia no cabeçalho que nunca tinha sido
 * feito: "o SDK não está instalado neste ambiente e não há servidor MCP p/ smoke-test aqui".
 *
 * Aqui NÃO há `connect` injetado: roda `connectMcp` de verdade, com o SDK de verdade, contra o
 * `scholar-mcp` instalado no `node_modules`. Prova o handshake, o `tools/list`, a política de risco e
 * o registro no runtime — ou seja, tudo menos a chamada que depende de rede externa.
 *
 * ⚠️ O LIMITE DESTE TESTE, aprendido do jeito caro (§8.3d do plano): ele roda sob o **vitest**, onde
 * `import(variavel)` funciona porque não há webpack. O MCP em produção estava quebrado exatamente
 * por um `import(variavel)` que o webpack não resolve — e este teste passava verde o tempo todo.
 * Ele prova o caminho real do NODE, não o do ARTEFATO BUILDADO. O que cobre aquele é o recibo do
 * deploy, que agora imprime as linhas `[mcp]` do boot.
 *
 * RODA NO CI de propósito, e por dois motivos. É o único teste que exercita o `connectMcp` (todos os
 * outros injetam `connect`), então é ele que avisa se o SDK sair da imagem. E, como a versão do
 * `scholar-mcp` está pinada exata no `package.json`, as contas abaixo são um GUARDA: se um bump
 * mudar o conjunto de tools ou as annotations, o CI fala antes da produção. Custa ~2 s e um
 * subprocesso local — não toca rede.
 */
import { describe, it, expect } from "vitest";
import { ligarMcp, resumoMcp, ENV_CONECTORES } from "@/lib/agent/mcp-boot";
import { getTool } from "@/lib/agent/runtime";

describe("MCP real · scholar pelo node_modules, sem connect injetado", () => {
  it("sobe, lista, filtra por risco e registra no runtime", async () => {
    const e = await ligarMcp({ [ENV_CONECTORES]: "scholar" });

    expect(e.ligado).toBe(true);
    expect(e.sdk).toBe(true);                       // o SDK está na imagem
    expect(e.conectores[0]?.status).toBe("conectado");
    expect(e.conectores[0]?.tools).toBe(9);         // 9 de 10 — medido
    expect(e.conectores[0]?.recusadas).toBe(1);     // ingest_paper_fulltext é write
    expect(resumoMcp(e)).toBe("on (9 tools)");

    // as tools do trilho de fontes/ABNT existem pro modelo, com o nome namespaceado
    expect(getTool("mcp:scholar:build_reference_list")?.risk).toBe("read");
    expect(getTool("mcp:scholar:validate_manuscript_citations")?.risk).toBe("read");
    expect(getTool("mcp:scholar:search_google_scholar_key_words")?.runtime).toBe("mcp");

    // e a de escrita NÃO existe — não é "negada depois", é ausente
    expect(getTool("mcp:scholar:ingest_paper_fulltext")).toBeUndefined();
  }, 120_000);
});
