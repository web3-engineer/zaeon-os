/**
 * A ENTREGA da geometria: manifesto de integridade, volume, imagem e deploy.
 *
 * Nada aqui testa lógica — testa se as CINCO pontas continuam apontando para o mesmo lugar:
 *
 *   atlas.json diz  /models/body/body-N.bin.gz
 *   geometria.sha256.json lista body-N.bin.gz com bytes e sha256
 *   o Dockerfile cria /app/public/models/body e dá pro usuário `zaeon`
 *   o compose monta o volume EXATAMENTE em /app/public/models/body
 *   o deploy roda infra/anatomia-geometria.mjs
 *
 * Se qualquer uma sair de linha o defeito é MUDO: o volume fica num caminho que ninguém serve, o
 * navegador toma 404 em 15 arquivos e a tela só não desenha. Nenhum log, nenhuma exceção. Por isso
 * a verificação é do TEXTO dos arquivos de infraestrutura, e não de comportamento — comportamento
 * não percebe um volume montado uma pasta acima.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Atlas } from "@/lib/anatomia/atlas";

const ler = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const atlas: Atlas = JSON.parse(ler("public/models/atlas.json"));
const integridade: {
  origem: string; commit: string; totalBytes: number;
  arquivos: Record<string, { bytes: number; sha256: string }>;
} = JSON.parse(ler("public/models/geometria.sha256.json"));

/** O caminho DENTRO do container onde `public/` é servido. Muda isto e nada mais funciona. */
const MONTAGEM = "/app/public/models/body";

describe("o manifesto de integridade cobre exatamente os pedaços do atlas", () => {
  it("um registro por pedaço, com o MESMO nome que o atlas pede", () => {
    const doAtlas = atlas.chunks.map((c) => c.gzip!.split("/").pop()!);
    expect(doAtlas.length).toBe(15);
    expect(Object.keys(integridade.arquivos).sort()).toEqual([...doAtlas].sort());
  });

  it("os bytes batem com o `gzipBytes` que o PRÓPRIO atlas declara — duas fontes, uma verdade", () => {
    const divergentes: string[] = [];
    for (const c of atlas.chunks) {
      const nome = c.gzip!.split("/").pop()!;
      const r = integridade.arquivos[nome];
      if (r.bytes !== c.gzipBytes) divergentes.push(`${nome}: ${r.bytes} × ${c.gzipBytes}`);
    }
    expect(divergentes, "tamanho no manifesto de integridade ≠ do atlas.json").toEqual([]);
    expect(integridade.totalBytes).toBe(Object.values(integridade.arquivos).reduce((n, a) => n + a.bytes, 0));
  });

  it("todo sha256 é um hash de verdade, e não um lugar reservado", () => {
    for (const [nome, r] of Object.entries(integridade.arquivos)) {
      expect(r.sha256, nome).toMatch(/^[0-9a-f]{64}$/);
      expect(r.bytes, nome).toBeGreaterThan(1_000_000);
    }
    expect(new Set(Object.values(integridade.arquivos).map((a) => a.sha256)).size, "hashes repetidos").toBe(15);
  });

  it("a origem é um COMMIT preso, nunca um ramo — senão o dado muda debaixo de nós", () => {
    expect(integridade.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(integridade.origem).toContain(integridade.commit);
    expect(integridade.origem, "ramo em vez de commit").not.toMatch(/\/(main|master|HEAD)\//);
    expect(integridade.origem.endsWith("/"), "a base é concatenada com o nome do arquivo").toBe(true);
  });
});

describe("as cinco pontas apontam para o mesmo caminho", () => {
  it("o atlas pede /models/body/ — que é o que o volume serve", () => {
    for (const c of atlas.chunks) {
      expect(c.url).toMatch(/^\/models\/body\//);
      expect(c.gzip).toMatch(/^\/models\/body\//);
    }
    expect(MONTAGEM).toBe("/app/public" + "/models/body");
  });

  it("o compose de PRODUÇÃO monta o volume nomeado exatamente ali, no serviço web", () => {
    const compose = ler("docker-compose.beta.yml");
    expect(compose).toContain(`anatomia_geometria:${MONTAGEM}`);
    expect(compose, "volume não declarado = compose não sobe").toMatch(/^ {2}anatomia_geometria:/m);
    // e NÃO em /app/public/models, que sombrearia o atlas.json que vem na imagem
    expect(compose).not.toContain("anatomia_geometria:/app/public/models\"");
  });

  it("a imagem cria o ponto de montagem e o dá ao usuário que roda o processo", () => {
    const dockerfile = ler("Dockerfile");
    expect(dockerfile).toContain(`mkdir -p ${MONTAGEM}`);
    expect(dockerfile, "sem dono zaeon o buscador toma EACCES").toMatch(/chown -R zaeon:zaeon \/app\/public\/models/);
    // o chown tem de vir ANTES do `USER zaeon`, senão não há permissão pra fazê-lo
    expect(dockerfile.indexOf("chown -R zaeon:zaeon /app/public/models")).toBeLessThan(dockerfile.indexOf("\nUSER zaeon"));
  });

  it("o deploy chama o buscador, e ANTES do recibo que publica geometria=on/off", () => {
    const deploy = ler(".github/workflows/deploy.yml");
    // ancorado na INVOCAÇÃO (`node < …`) e não no nome do arquivo: o nome também aparece nos
    // comentários em nível de YAML, e casar com eles tornaria o teste verde sem chamada nenhuma.
    const busca = deploy.indexOf("node < infra/anatomia-geometria.mjs");
    const recibo = deploy.indexOf("node < infra/recibo-deploy.mjs");
    expect(busca, "o deploy não chama o buscador").toBeGreaterThan(0);
    expect(recibo).toBeGreaterThan(0);
    expect(busca, "buscar DEPOIS do recibo faria o recibo mentir por um deploy inteiro").toBeLessThan(recibo);
    // e ele não pode derrubar o deploy: sem geometria o resto do site funciona
    expect(deploy).toMatch(/anatomia-geometria\.mjs \|\| echo/);
  });

  it("a geometria NÃO é versionada — e o .gitignore é quem garante isso", () => {
    expect(ler(".gitignore")).toMatch(/^public\/models\/body\/$/m);
    // o manifesto, esse SIM é versionado: é dele que a busca do mentor vive
    expect(() => ler("public/models/atlas.json")).not.toThrow();
    expect(() => ler("public/models/geometria.sha256.json")).not.toThrow();
  });
});
