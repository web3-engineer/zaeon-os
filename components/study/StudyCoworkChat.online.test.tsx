/**
 * #756 · aberta sem internet, a lista de conversas só voltava com F5. Renderizar o chat inteiro num teste é pesado (ver
 * StudyCoworkChat.ordem.test): aqui confere no código que, quando a internet volta, a lista do servidor é juntada de novo.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const fonte = readFileSync(path.resolve(__dirname, "StudyCoworkChat.tsx"), "utf8");
const corpo = fonte.slice(fonte.indexOf("function ChatDaConta(")).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("#756 · a lista de conversas volta com a internet", () => {
  const trecho = /addEventListener\("online",\s*(aoVoltarInternet)\)/.exec(corpo);
  it("escuta a volta da internet e solta ao desmontar", () => {
    expect(trecho).not.toBeNull();
    expect(corpo).toContain(`removeEventListener("online", ${trecho![1]})`);
  });
  it("ao voltar, junta a lista do servidor e atualiza a tela", () => {
    const def = corpo.indexOf(`const ${trecho![1]} = async`);
    expect(def).toBeGreaterThan(-1);
    const fn = corpo.slice(def, corpo.indexOf(`addEventListener("online", ${trecho![1]})`));
    expect(fn).toContain('sincronizarConversas("estudos"');
    expect(fn).toContain("setThreads(juntas)");
    expect(fn).not.toMatch(/setAbaAtiva|trocarRef/);   // não troca a conversa aberta
  });
});
