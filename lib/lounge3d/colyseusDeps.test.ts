/**
 * O teste de integração do Colyseus (salaColyseus.int.test.ts) importa OS DOIS lados: o servidor
 * real (`server/colyseus/src/app`) e o cliente que o site usa (`components/lounge/salaColyseus`).
 * Por isso ele mora na raiz — e por isso as dependências do servidor precisam estar declaradas AQUI
 * também, não só em `server/colyseus/package.json`.
 *
 * O ACOPLAMENTO QUE ISTO FECHOU: antes, o `tsc --noEmit` e o `vitest` da raiz só passavam porque um
 * passo ANTERIOR do CI rodava `npm ci --prefix server/colyseus`. Nada declarava essa ordem. Quem
 * clonasse o repositório e rodasse `npm test` pegava o teste vermelho, e o `tsc` acusava 24 erros
 * em `server/colyseus/*` que não eram erro de tipo nenhum — era dependência ausente. O `exclude` do
 * tsconfig não protege: ele não vale pra arquivo puxado por `import`, e o teste importa direto.
 *
 * ────────────── POR QUE A LISTA É DERIVADA, e não escrita à mão ──────────────
 * A primeira versão deste guarda tinha a lista digitada — e eu digitei DOIS dos QUATRO pacotes.
 * Faltou o `@colyseus/schema`, que `LoungeRoom.ts` importa direto e que só resolvia por vir
 * TRANSITIVO do `@colyseus/sdk`. Ou seja: o mesmo defeito que este arquivo existe pra impedir,
 * um nível mais fundo, e invisível enquanto a cadeia transitiva segurasse. (Achado do Sourcery
 * na #675.)
 *
 * Então a lista sai do CÓDIGO: lê os imports de `server/colyseus/src`. Pacote novo lá dentro passa
 * a cobrar declaração aqui automaticamente, sem depender de alguém lembrar.
 *
 * E a versão tem de BATER nos dois lados: duas cópias do `@colyseus/core` em memória fazem
 * `instanceof` falhar, e o teste quebraria de um jeito que não parece versão.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import raiz from "../../package.json";
import servidor from "../../server/colyseus/package.json";

const SRC = path.join(process.cwd(), "server", "colyseus", "src");

const deps = (p: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }) => ({
  ...(p.dependencies ?? {}),
  ...(p.devDependencies ?? {}),
});

/** `@escopo/pacote/sub` → `@escopo/pacote`; `pacote/sub` → `pacote`. */
const pacoteDe = (spec: string): string => {
  const p = spec.split("/");
  return spec.startsWith("@") ? p.slice(0, 2).join("/") : p[0]!;
};

/**
 * Os pacotes npm que o SERVIDOR importa. Só os arquivos que o programa da raiz realmente puxa:
 * `*.test.ts` de lá roda no vitest DELE, com as deps dele (e o vitest da raiz está noutra major —
 * exigir a mesma versão disso seria inventar um conflito que não existe).
 */
function pacotesImportados(): string[] {
  const achados = new Set<string>();
  for (const nome of fs.readdirSync(SRC)) {
    if (!nome.endsWith(".ts") || nome.endsWith(".test.ts")) continue;
    const src = fs.readFileSync(path.join(SRC, nome), "utf8");
    for (const m of src.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
      const spec = m[1]!;
      if (spec.startsWith(".") || spec.startsWith("node:")) continue;
      achados.add(pacoteDe(spec));
    }
  }
  return [...achados].sort();
}

describe("dependências do Colyseus · a raiz não pode depender do install da subpasta", () => {
  const importados = pacotesImportados();

  it("a varredura acha os imports de verdade (se isto zerar, o guarda virou decoração)", () => {
    expect(importados.length).toBeGreaterThan(0);
    // o que o `app.ts` puxa na primeira linha — se um dia sumir, é mudança real, não ruído
    expect(importados).toContain("@colyseus/core");
  });

  it("TODO pacote que o servidor importa está declarado NA RAIZ", () => {
    const r = deps(raiz);
    for (const nome of importados) {
      expect(
        r[nome],
        `${nome} está importado em server/colyseus/src mas não é dependência da raiz. O teste de integração do Colyseus roda no vitest da RAIZ: sem a declaração ele só passa se alguém tiver rodado \`npm ci --prefix server/colyseus\` antes, ou se o pacote vier transitivo por acidente — que foi exatamente como o @colyseus/schema escapou.`,
      ).toBeTruthy();
    }
  });

  it("a versão é a MESMA nos dois package.json (duas cópias quebram o instanceof)", () => {
    const r = deps(raiz), s = deps(servidor);
    for (const nome of importados) {
      if (!s[nome]) continue;          // o servidor também pode usar transitivo; aqui só comparo o que ele declara
      expect(r[nome], nome).toBe(s[nome]);
    }
  });
});
