/**
 * O teste de integração do Colyseus (salaColyseus.int.test.ts) importa OS DOIS lados: o servidor
 * real (`server/colyseus/src/app`) e o cliente que o site usa (`components/lounge/salaColyseus`).
 * Por isso ele mora na raiz — e por isso as dependências do servidor precisam estar declaradas AQUI
 * também, não só em `server/colyseus/package.json`.
 *
 * O ACOPLAMENTO QUE ISTO FECHOU: antes, o `tsc --noEmit` e o `vitest` da raiz só passavam porque um
 * passo ANTERIOR do CI rodava `npm ci --prefix server/colyseus`. Nada declarava essa ordem. Quem
 * clonasse o repositório e rodasse `npm test` pegava este arquivo vermelho, e o `tsc` acusava 24
 * erros em `server/colyseus/*` que não eram erro de tipo nenhum — era dependência ausente.
 *
 * O PREÇO de declarar nos dois lugares é a divergência de versão: duas cópias do `@colyseus/core` em
 * memória fazem `instanceof` falhar e o teste quebra de um jeito que não parece versão. Este teste é
 * o guarda — é barato, e é a mesma disciplina do guarda de allowlist em lib/leitor/compose.test.ts.
 */
import { describe, it, expect } from "vitest";
import raiz from "../../package.json";
import servidor from "../../server/colyseus/package.json";

/** As deps do servidor Colyseus que o teste de integração da RAIZ também precisa resolver. */
const COMPARTILHADAS = ["@colyseus/core", "@colyseus/ws-transport"] as const;

const deps = (p: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }) => ({
  ...(p.dependencies ?? {}),
  ...(p.devDependencies ?? {}),
});

describe("dependências do Colyseus · a raiz não pode depender do install da subpasta", () => {
  it("toda dep compartilhada está declarada NA RAIZ", () => {
    const r = deps(raiz);
    for (const nome of COMPARTILHADAS) {
      expect(r[nome], `${nome} precisa estar no package.json da raiz: o teste de integração do Colyseus roda no vitest da raiz, e sem isto ele só passa se o CI tiver rodado \`npm ci --prefix server/colyseus\` antes — ordem que nada declara`).toBeTruthy();
    }
  });

  it("a versão é a MESMA nos dois package.json (duas cópias quebram o instanceof)", () => {
    const r = deps(raiz), s = deps(servidor);
    for (const nome of COMPARTILHADAS) {
      expect(r[nome], nome).toBe(s[nome]);
    }
  });
});
