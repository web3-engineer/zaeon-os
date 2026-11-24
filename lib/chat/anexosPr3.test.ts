/**
 * #873 PR 3 · o chat com documentos: arquivo grande avisa, não mistura documentos, e a falha não contamina.
 * (O anexo por conversa está em components/chat/useAnexoChat.test.tsx.)
 */
import { describe, it, expect } from "vitest";
import { anexoDe, avisoDeCorte, blocoDosAnexos, inventarioDosAnexos, MAX_CHARS_ANEXO, regraDeNaoMisturar, ultimaPaginaLida } from "@/lib/agent/anexos";
import { ehAvisoDeFalha, semFalhasNoHistorico } from "@/lib/chat/semFalhas";

const grande = () => anexoDe({ id: "a1", nome: "manual-gigante-300p", tipo: "application/pdf", texto: "palavra ".repeat(40_000), paginas: 300 });
const pequeno = () => anexoDe({ id: "a1", nome: "mandacaru-7", tipo: "application/pdf", texto: "texto ".repeat(500), paginas: 3 });

describe("#873 PR 3 · arquivo maior que o limite", () => {
  it("o anexo cortado sabe que foi cortado (e o pequeno, não)", () => {
    const g = grande();
    expect(g.texto.length).toBeLessThanOrEqual(MAX_CHARS_ANEXO);
    expect(g.cortado).toEqual({ total: "palavra ".repeat(40_000).trim().length });
    expect(pequeno().cortado).toBeUndefined();
  });

  it("a última página que coube sai das marcas de página", () => {
    expect(ultimaPaginaLida([[0, 1], [3000, 2], [90_000, 41]])).toBe(41);
    expect(ultimaPaginaLida([])).toBeUndefined();
    expect(ultimaPaginaLida(undefined)).toBeUndefined();
  });

  it("o aviso diz até onde leu e manda NÃO responder como se tivesse lido tudo", () => {
    const g = { ...grande(), cortado: { total: 900_000, ateAPagina: 41 } };
    const aviso = avisoDeCorte([g]);
    expect(aviso).toMatch(/manual-gigante-300p/);
    expect(aviso).toMatch(/até a página 41/);
    expect(aviso).toMatch(/de 300 páginas/);
    expect(aviso).toMatch(/NÃO responda como se tivesse lido o arquivo inteiro/);
    expect(inventarioDosAnexos([g])).toMatch(/só até a página 41/);
  });

  it("sem a página conhecida, diz 'o começo'", () => {
    expect(avisoDeCorte([grande()])).toMatch(/você só tem o começo/);
  });

  it("arquivo que coube inteiro: nenhum aviso", () => {
    expect(avisoDeCorte([pequeno()])).toBe("");
    expect(blocoDosAnexos([pequeno()])).not.toMatch(/ATENÇÃO/);
  });
});

describe("#873 PR 3 · não misturar documentos", () => {
  it("o bloco do anexo diz que trecho de OUTRO título é de OUTRO documento", () => {
    const b = blocoDosAnexos([pequeno()]);
    expect(b).toMatch(/"mandacaru-7"/);
    expect(b).toMatch(/OUTRO título é de OUTRO documento/);
    expect(b).toMatch(/diga de qual documento ele veio/);
  });

  it("vários anexos: todos os nomes; sem anexo: nada", () => {
    expect(regraDeNaoMisturar([pequeno(), { ...grande(), id: "a2" }])).toMatch(/os arquivos "mandacaru-7", "manual-gigante-300p"/);
    expect(regraDeNaoMisturar([])).toBe("");
    expect(blocoDosAnexos([])).toBe("");
  });

  it("o arquivo grande leva os DOIS avisos (era o caso do teste: manual cortado + Mandacaru na base)", () => {
    const b = blocoDosAnexos([grande()]);
    expect(b).toMatch(/ATENÇÃO/);
    expect(b).toMatch(/OUTRO documento/);
  });
});

describe("#873 PR 3 · a falha não contamina as próximas respostas", () => {
  it("reconhece os avisos de falha (do site e da própria IA)", () => {
    for (const t of [
      "Não consegui responder agora. Tente de novo.",
      "Não consegui ler o arquivo que você mandou.",
      "**Não consegui abrir** esse PDF.",
      "Sem conexão com a Aura agora.",
      "nao consegui processar o documento",
    ]) expect(ehAvisoDeFalha(t), t).toBe(true);
  });

  it("não confunde com conteúdo", () => {
    expect(ehAvisoDeFalha("A fotossíntese acontece no cloroplasto…")).toBe(false);
    // resposta longa que começa assim e segue explicando é conteúdo
    expect(ehAvisoDeFalha("Não consegui achar a data exata, mas " + "o contexto é este. ".repeat(40))).toBe(false);
    expect(ehAvisoDeFalha("")).toBe(false);
  });

  it("tira do histórico só a resposta de falha da IA; a pergunta do aluno fica", () => {
    const h = [
      { role: "user", parts: [{ text: "qual a palavra-código?" }] },
      { role: "model", parts: [{ text: "Não consegui ler o arquivo." }] },
      { role: "user", parts: [{ text: "e agora?" }] },
      { role: "model", parts: [{ text: "A palavra-código é ARARA-93." }] },
      { role: "user", parts: [{ text: "Não consegui ler o arquivo." }] }, // o ALUNO escreveu isso: fica
    ];
    expect(semFalhasNoHistorico(h).map((x) => x.parts[0].text)).toEqual([
      "qual a palavra-código?", "e agora?", "A palavra-código é ARARA-93.", "Não consegui ler o arquivo.",
    ]);
  });
});
