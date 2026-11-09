/**
 * A cena do artefato de anatomia, afirmada contra o ARQUIVO DE DADOS REAL (public/models/atlas.json).
 *
 * Mesma doutrina de busca.test.ts e pelo mesmo motivo: o risco aqui não é a função errar lógica — é
 * ela estar certa sobre um dado que não existe. Um estado com `selected` apontando para peça que o
 * atlas não tem desenha uma cena VAZIA, e cena vazia é indistinguível de "o aluno não pediu nada".
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ehSistema, type Atlas } from "@/lib/anatomia/atlas";
import { ESTADO_INICIAL, pecaVisivel } from "@/lib/anatomia/estado";
import { AVISO_EDUCACIONAL, FONTE_ATLAS, cenaDoConceito } from "@/lib/anatomia/cena-do-conceito";

const atlas: Atlas = JSON.parse(readFileSync(join(process.cwd(), "public/models/atlas.json"), "utf8"));
const ok = (consulta: string) => {
  const r = cenaDoConceito(atlas, consulta);
  if (!r.ok) throw new Error(`esperava ok para "${consulta}", veio: ${r.motivo}`);
  return r.dados;
};

describe("cenaDoConceito — o termo do aluno vira cena", () => {
  it("'pulmão' resolve para um pulmão de verdade, com malhas", () => {
    const d = ok("pulmão");
    expect(d.termoBuscado).toBe("lung");
    expect(d.viaSinonimo).toBe(true);
    expect(d.conceito.nome).toContain("lung");
    expect(d.pecas).toBeGreaterThan(0);
  });

  it("a pergunta inteira chega ao mesmo conceito que o termo nu", () => {
    const frase = ok("como funciona um pulmão");
    const termo = ok("pulmão");
    expect(frase.conceito.id).toBe(termo.conceito.id);
    expect(frase.estado.selected).toEqual(termo.estado.selected);
  });

  it("TODA peça selecionada existe no atlas e É VISÍVEL no estado montado", () => {
    const d = ok("pulmão");
    const porId = new Map(atlas.parts.map((p) => [p.id, p]));
    expect(d.estado.selected.length).toBeGreaterThan(0);
    for (const id of d.estado.selected) {
      const parte = porId.get(id);
      expect(parte, `peça ${id} não existe no atlas`).toBeDefined();
      // o invariante que faz o artefato valer: a estrutura pedida aparece na tela
      expect(pecaVisivel(d.estado, parte!), `peça ${id} selecionada mas invisível`).toBe(true);
    }
  });

  it("o artefato nasce ISOLADO, e SÓ a estrutura pedida fica visível", () => {
    /**
     * A forma forte do invariante, e a que importa num cartão de 300 px: não basta a peça pedida
     * estar visível, é preciso que o RESTO não esteja. Medido em produção com o navegador: sem
     * isolar, selecionar o pulmão deixa 2.229 peças desenhadas e as 124 do pulmão somem atrás de
     * 402 músculos — a tela não muda em nada. `pecaVisivel` garante que a malha não é descartada;
     * não garante que alguém a enxergue.
     */
    const d = ok("pulmão");
    expect(d.estado.isolate, "sem isolar o aluno recebe um corpo genérico").toBe(true);

    const selecionadas = new Set(d.estado.selected);
    const visiveis = atlas.parts.filter((parte) => pecaVisivel(d.estado, parte));
    expect(visiveis.length).toBe(d.estado.selected.length);
    for (const parte of visiveis) {
      expect(selecionadas.has(parte.id), `peça ${parte.id} visível mas não é da estrutura`).toBe(true);
    }
  });

  it("os sistemas vêm nomeados e com id válido, e casam em quantidade", () => {
    const d = ok("pulmão");
    expect(d.sistemas.length).toBeGreaterThan(0);
    expect(d.sistemasIds.length).toBe(d.sistemas.length);
    for (const id of d.sistemasIds) expect(ehSistema(id), id).toBe(true);
  });

  it("as alternativas são os OUTROS achados — nunca o escolhido", () => {
    const d = ok("pulmão");
    expect(d.alternativas.length).toBeGreaterThan(0);
    expect(d.alternativas.map((a) => a.id)).not.toContain(d.conceito.id);
    for (const a of d.alternativas) expect(a.pecas).toBeGreaterThan(0);
  });

  it("não muta o ESTADO_INICIAL (o próximo artefato não herda a seleção do anterior)", () => {
    const antes = JSON.stringify(ESTADO_INICIAL);
    ok("pulmão");
    ok("coração");
    expect(JSON.stringify(ESTADO_INICIAL)).toBe(antes);
    expect(ESTADO_INICIAL.selected).toHaveLength(0);
  });

  it("a atribuição e o aviso viajam com o dado (exigência da CC BY 4.0)", () => {
    const d = ok("coração");
    expect(d.fonte).toEqual({ ...FONTE_ATLAS });
    expect(d.fonte.title).toContain("CC BY 4.0");
    expect(d.aviso).toBe(AVISO_EDUCACIONAL);
    expect(d.aviso).toContain("Não é ferramenta clínica");
  });

  it("'alvéolo' recusa dizendo que o atlas é PARCIAL — não que a estrutura não existe", () => {
    const r = cenaDoConceito(atlas, "alvéolo");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("sem_resultado");
    expect(r.motivo).toContain("referência parcial");
    expect(r.termoBuscado).toBe("alveolo");
  });

  it("consulta vazia é um caso próprio, não 'não achei'", () => {
    for (const vazia of ["", "   "]) {
      const r = cenaDoConceito(atlas, vazia);
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.code).toBe("consulta_vazia");
    }
  });

  it("órgãos diferentes dão cenas diferentes (o estado não é constante)", () => {
    const pulmao = ok("pulmão");
    const coracao = ok("coração");
    expect(pulmao.conceito.id).not.toBe(coracao.conceito.id);
    expect(pulmao.estado.selected).not.toEqual(coracao.estado.selected);
  });
});
