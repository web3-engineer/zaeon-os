import { describe, it, expect } from "vitest";
import { MAX_FALHAS, TOOLS_COM_CORRECAO, falhasVisiveis } from "@/lib/agent/falhas";

describe("falhasVisiveis · a falha vira objeto da resposta (G2)", () => {
  it("O CASO DO DONO: download negado pela allowlist → porquê + anexar", () => {
    // é exatamente o que acontecia na conversa dos benchmarks: github fora da lista
    const [f] = falhasVisiveis([{ tool: "baixar_para_base", code: "url_nao_permitida", error: "dominio_fora_da_lista" }]);
    expect(f.tool).toBe("baixar_para_base");
    expect(f.porque).toMatch(/fora da lista/);
    expect(f.corrigir.tipo).toBe("anexar");
    expect(f.corrigir.texto).toMatch(/anexe/i);
    // não oferece "tentar de novo": tentar de novo no mesmo domínio falharia igual
    expect(f.corrigir.prompt).toBeUndefined();
  });

  it("falha transitória oferece REENVIO; falha de política não", () => {
    const tran = falhasVisiveis([{ tool: "abrir_url", code: "web_unavailable" }]);
    expect(tran[0].corrigir.tipo).toBe("tentar_de_novo");
    expect(tran[0].corrigir.prompt).toBe("tente abrir o endereço de novo");
    expect(falhasVisiveis([{ tool: "abrir_url", code: "precisa_https" }])[0].corrigir.prompt).toBeUndefined();
  });

  it("tool que o aluno NÃO pede não vira card (ruído interno)", () => {
    expect(falhasVisiveis([
      { tool: "memory_search", code: "network" },
      { tool: "literature_search", code: "tool_timeout" },
      { tool: "examiner", code: "skill_error" },
    ])).toEqual([]);
    expect(TOOLS_COM_CORRECAO).toEqual(["abrir_url", "baixar_para_base", "ler_anexo"]);
  });

  it("a MESMA tool que funcionou depois não aparece como falha", () => {
    // três links pedidos, dois abriram: a resposta tem conteúdo, e o erro deixa de ser o assunto
    const obs = [{ tool: "abrir_url", code: "url_sem_conteudo" }];
    expect(falhasVisiveis(obs)).toHaveLength(1);
    expect(falhasVisiveis(obs, ["abrir_url"])).toEqual([]);
  });

  it("dedupe por tool+código, e teto de três", () => {
    const obs = [
      { tool: "abrir_url", code: "url_nao_permitida" },
      { tool: "abrir_url", code: "url_nao_permitida" },   // o laço tentou de novo: é UMA falha
      { tool: "abrir_url", code: "precisa_https" },
      { tool: "baixar_para_base", code: "arquivo_grande_demais" },
      { tool: "ler_anexo", code: "anexo_desconhecido" },
    ];
    const fs = falhasVisiveis(obs);
    expect(fs).toHaveLength(MAX_FALHAS);
    expect(new Set(fs.map((f) => `${f.tool}:${f.codigo}`)).size).toBe(MAX_FALHAS);
  });

  it("código que eu não previ ainda assim vira card (nunca desaparece em silêncio)", () => {
    const [f] = falhasVisiveis([{ tool: "abrir_url", code: "codigo_do_futuro" }]);
    expect(f.codigo).toBe("codigo_do_futuro");
    expect(f.porque).toBeTruthy();
    expect(f.corrigir.texto).toBeTruthy();
  });

  it("sem código nenhum não quebra, e nunca expõe texto técnico como explicação", () => {
    const [f] = falhasVisiveis([{ tool: "abrir_url", error: "ECONNRESET at tls.js:123" }]);
    expect(f.codigo).toBe("erro");
    expect(f.porque).not.toMatch(/ECONNRESET|tls\.js/);
  });

  it("entrada vazia e lixo não produzem card", () => {
    expect(falhasVisiveis([])).toEqual([]);
    expect(falhasVisiveis([{ tool: "" }, { tool: "   " }])).toEqual([]);
  });
});
