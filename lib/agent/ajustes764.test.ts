/**
 * #764 · as amarrações que só se veem no código-fonte (o turno, a cena e o chat têm dependências pesadas demais para
 * montar aqui): o cache não serve pedido de imagem, a anatomia fica guardada na conversa, a cena do cartão enquadra
 * no cartão e sem o realce verde, e os pedidos de gráfico/imagem ganham a linha deles no prompt.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { CACHE_VERSAO } from "@/lib/rag/cacheRespostas";

const ler = (p: string) => readFileSync(path.resolve(__dirname, "../..", p), "utf8");

describe("#764 · amarrações", () => {
  it("pedido de imagem não consulta o cache, e as respostas antigas deixam de valer", () => {
    expect(ler("lib/agent/runChatTurn.ts")).toMatch(/perguntaCacheavel\(prompt\) && !pedeImagem\(prompt\)/);
    expect(CACHE_VERSAO).toBeGreaterThanOrEqual(2);
  });
  it("o cartão de anatomia fica guardado na conversa (pelo número)", () => {
    expect(ler("components/study/StudyCoworkChat.tsx")).toMatch(/GUARDA_NO_SERVIDOR = new Set\(\["image", "anatomia"\]\)/);
  });
  it("a cena do cartão: margem do cartão e sem o realce verde", () => {
    const cena = ler("lib/anatomia/cena.ts");
    expect(cena).toMatch(/if \(o\.cartao\) \{ esq = 12; dir = w - 12; topo = 12; base = h - 12; \}/);
    expect(cena).toMatch(/partSelected \* \$\{o\.cartao \? "0\.0" : "0\.75"\}/);
    expect(ler("components/studio/AnatomiaView.tsx")).toMatch(/aoErrar=\{\(m\) => setErro\(m\)\}\s*cartao/);
  });
  it("as linhas do prompt: gráfico obrigatório e partes da imagem no texto", () => {
    const h = ler("lib/agent/aura-harness.ts");
    expect(h).toMatch(/pedeGraficoDeDados\(st\.objective\)\s*\?\s*\['O usuário PEDIU UM GRÁFICO/);
    expect(h).toMatch(/pedeImagem\(st\.objective\)\s*\?\s*\["O usuário PEDIU UMA IMAGEM/);
  });
});
