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

  describe("a conversa real de 2026-11-10 — 'quantos nervos tem uma perna humana?'", () => {
    /**
     * REPRODUÇÃO DE UM CASO DE PRODUÇÃO, colado pelo dono. O artefato que saiu foi
     * "Anatomia — nerve": 26 peças do conceito `nerve`, que no BodyParts3D são TODAS cranianas e
     * orbitais (lacrimal, frontal, supraorbital, nasociliar, etmoidal). Medido: o atlas não tem
     * ciático, tibial, femoral nem safeno — zero. O aluno perguntou da PERNA e recebeu uma cena da
     * ÓRBITA, com cara de resposta. Isso é pior que não achar.
     */
    it("'nervo ciático' NÃO vira cena — o atlas não o tem, e a categoria não é resposta", () => {
      const r = cenaDoConceito(atlas, "nervo ciático");
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.code).toBe("classe_generica");
      // e a recusa ENSINA a pedir: nomes reais do atlas, nunca inventados
      expect(r.alternativas?.length).toBeGreaterThan(0);
      const nomes = r.alternativas!.map((a) => a.nome);
      expect(nomes).toContain("optic nerve");
      for (const a of r.alternativas!) expect(a.pecas).toBeGreaterThan(0);
    });

    it("pedir a CATEGORIA crua também não vira cena", () => {
      for (const q of ["nerve", "me mostra um nervo", "artéria", "veia"]) {
        const r = cenaDoConceito(atlas, q);
        expect(r.ok, q).toBe(false);
        if (!r.ok) expect(r.code, q).toBe("classe_generica");
      }
    });

    it("o QUALIFICADOR é respeitado: pede artéria femoral, recebe a artéria — não a árvore arterial", () => {
      const r = cenaDoConceito(atlas, "artéria femoral");
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.dados.conceito.nome).toBe("femoral artery");
      // `artery` cru são 562 peças — um quarto do atlas. É o "abre o atlas completo" do relato.
      expect(r.dados.estado.selected.length).toBeLessThan(20);
    });

    it("e quem pede ARTÉRIA femoral não recebe a VEIA femoral", () => {
      const r = cenaDoConceito(atlas, "artéria femoral");
      if (!r.ok) throw new Error("devia achar");
      expect(r.dados.conceito.nome).toContain("artery");
    });

    it("os nomes que o atlas TEM continuam virando cena, agora pelo nome certo", () => {
      for (const [q, esperado, teto] of [
        ["osso do fêmur", "femur", 10],
        ["veia cava", "inferior vena cava", 10],
        ["músculo tibial", "tibialis anterior", 10],
        ["nervo óptico", "optic nerve", 10],
        ["sistema nervoso", "nervous system", 80],
      ] as const) {
        const r = cenaDoConceito(atlas, q);
        expect(r.ok, q).toBe(true);
        if (!r.ok) continue;
        expect(r.dados.conceito.nome, q).toBe(esperado);
        expect(r.dados.estado.selected.length, q).toBeLessThanOrEqual(teto);
      }
    });
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
