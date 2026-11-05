/**
 * #711: o chat quebrava com "Cannot access before initialization" quando a conversa tinha um documento: o tema do
 * convite usava `docAtivo` antes da linha que o define. Renderizar o chat inteiro num teste é pesado; aqui confere que,
 * no corpo do componente, cada um destes valores é definido antes do primeiro uso.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const fonte = readFileSync(path.resolve(__dirname, "StudyCoworkChat.tsx"), "utf8");
// o corpo do componente, sem comentários (eles citam os nomes antes da definição, e não contam)
const corpo = fonte.slice(fonte.indexOf("function ChatDaConta(")).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("#711 · StudyCoworkChat define antes de usar", () => {
  for (const nome of ["docAtivo", "docs", "trabalhosDaAba", "trabalhoAberto"]) {
    it(`${nome} é definido antes de ser usado`, () => {
      const def = corpo.search(new RegExp(`const (\\[)?${nome}\\b`));
      expect(def).toBeGreaterThan(-1);
      const uso = corpo.search(new RegExp(`(?<![\\w.])${nome}(?![\\w])(?!\\s*[,\\]]\\s*=)`));
      expect(uso).toBeGreaterThanOrEqual(def);
    });
  }
});
