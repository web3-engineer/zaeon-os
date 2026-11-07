/**
 * TODO chamador do `pedirAura` manda o agente escolhido?
 *
 * Isto não é zelo: o chat tem DUAS telas (desktop em components/study/StudyCoworkChat, celular em
 * lib/chat/useAuraChat) e as duas chamam a MESMA função. Eu consertei o desktop primeiro e o
 * celular ficou de fora — e nenhum teste de unidade acusaria, porque a função chamada é a mesma e
 * ela tem default ("aura"). O defeito seria "o seletor funciona no computador e não no celular",
 * descoberto por quem usa.
 *
 * Então o teste olha a FONTE: quem chama `pedirAura` tem que falar de `agenteDoChatSalvo`. Um
 * chamador novo que esquecer cai aqui, não no celular de alguém.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = path.resolve(__dirname, "../..");
const PASTAS = ["app", "components", "lib"];
const IGNORAR = /node_modules|\.next|auraClient\.ts$|\.test\.(ts|tsx)$/;

function arquivos(dir: string, fora: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const p = path.join(dir, nome);
    if (IGNORAR.test(p)) continue;
    if (statSync(p).isDirectory()) arquivos(p, fora);
    else if (/\.(ts|tsx)$/.test(p)) fora.push(p);
  }
  return fora;
}

describe("quem chama pedirAura manda o agente", () => {
  const chamadores = PASTAS
    .flatMap((d) => arquivos(path.join(RAIZ, d)))
    .filter((f) => /\bpedirAura\s*\(/.test(readFileSync(f, "utf8")));

  it("há chamadores pra olhar (se isto cair, o filtro quebrou e o teste virou enfeite)", () => {
    expect(chamadores.length).toBeGreaterThanOrEqual(2); // desktop e celular
  });

  it("todos falam de agenteDoChatSalvo", () => {
    const esquecidos = chamadores.filter((f) => !readFileSync(f, "utf8").includes("agenteDoChatSalvo"));
    expect(esquecidos.map((f) => path.relative(RAIZ, f))).toEqual([]);
  });
});
