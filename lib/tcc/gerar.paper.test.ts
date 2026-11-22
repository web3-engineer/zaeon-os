/**
 * lib/tcc/gerar.paper.test.ts — o PaperOrchestra plugado no documento editável (gerarComPaperOrquestra).
 * O pipeline é falso aqui (ele tem testes próprios): o que se prova é a COLA com o documento.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  getTcc: vi.fn(), aplicar: vi.fn(), marcar: vi.fn(), rodar: vi.fn(),
}));
vi.mock("@/lib/tcc/store", async (orig) => ({ ...(await orig<any>()), getTccForUser: m.getTcc, aplicarNoTcc: m.aplicar, marcarStatus: m.marcar }));
vi.mock("@/lib/paper-orquestra/pipeline", async (orig) => ({ ...(await orig<any>()), rodarPaperOrquestra: m.rodar }));
vi.mock("@/lib/ai/proNasPesadas", () => ({ podeProNasPesadas: async () => false }));
vi.mock("@/lib/scholar/gemini", () => ({ geminiJson: vi.fn() }));

import { gerarComPaperOrquestra } from "@/lib/tcc/gerar";
import { aplicarOps } from "@/lib/tcc/secoes";

type Sec = { id: string; titulo: string; corpo: string };
let secoes: Sec[];
const doc = () => ({ id: "w1", titulo: "t", workType: "Artigo", scopeId: "s", rev: 0, status: "gerando", papel: "dono", updatedAt: new Date(), content: "", secoes });

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset());
  secoes = [
    { id: "i", titulo: "INTRODUÇÃO", corpo: "" },
    { id: "m", titulo: "METODOLOGIA", corpo: "texto que o aluno escreveu antes" },
    { id: "c", titulo: "CONCLUSÃO", corpo: "" },
    { id: "r", titulo: "REFERÊNCIAS", corpo: "" },
  ];
  m.getTcc.mockImplementation(async () => doc());
  m.aplicar.mockImplementation(async (_id: string, _u: string, ops: any) => {
    const lista = typeof ops === "function" ? ops(doc()) : ops;
    const r = aplicarOps(secoes, lista);
    if (r.ok) secoes = r.secoes as Sec[];
    return { ok: true, tcc: doc(), efeitos: r.ok ? r.efeitos : [] };
  });
});

describe("PaperOrchestra → documento editável", () => {
  it("passa o esqueleto do documento e as seções do aluno; grava as seções e a bibliografia", async () => {
    m.rodar.mockImplementation(async (e: any, d: any) => {
      expect(e.esqueleto).toEqual(["INTRODUÇÃO", "METODOLOGIA", "CONCLUSÃO", "REFERÊNCIAS"]);
      expect([...e.jaEscritas]).toEqual(["METODOLOGIA"]);
      expect(await d.salvarSecao("INTRODUÇÃO", "intro (SILVA, 2020).")).toBe(true);
      expect(await d.salvarSecao("CONCLUSÃO", "fim.")).toBe(true);
      return { titulo: "T", referencias: [{ abnt: "SILVA, A. Paper. 2020." }], relatorio: {} };
    });
    const r = await gerarComPaperOrquestra("w1", "u1", "tema");
    expect(r.completo).toBe(true);
    expect(secoes.find((s) => s.titulo === "INTRODUÇÃO")!.corpo).toBe("intro (SILVA, 2020).");
    expect(secoes.find((s) => s.titulo === "METODOLOGIA")!.corpo).toBe("texto que o aluno escreveu antes");
    expect(secoes.find((s) => s.titulo === "REFERÊNCIAS")!.corpo).toContain("SILVA, A. Paper. 2020.");
  });

  it("o refinamento só substitui o que ainda é NOSSO: se o aluno editou a seção no meio, a dele vence", async () => {
    m.rodar.mockImplementation(async (_e: any, d: any) => {
      await d.salvarSecao("INTRODUÇÃO", "versão 1");
      expect(await d.salvarSecao("INTRODUÇÃO", "versão 2 refinada")).toBe(true); // ainda é nossa
      secoes = secoes.map((s) => (s.titulo === "INTRODUÇÃO" ? { ...s, corpo: "o aluno mexeu aqui" } : s));
      expect(await d.salvarSecao("INTRODUÇÃO", "versão 3")).toBe(false);
      return { titulo: null, referencias: [], relatorio: {} };
    });
    const r = await gerarComPaperOrquestra("w1", "u1", "tema");
    expect(secoes.find((s) => s.titulo === "INTRODUÇÃO")!.corpo).toBe("o aluno mexeu aqui");
    expect(r.completo).toBe(false); // CONCLUSÃO ficou vazia → o gerador por seção completa
  });
});
