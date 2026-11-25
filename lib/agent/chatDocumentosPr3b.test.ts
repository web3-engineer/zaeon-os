/**
 * #873 PR 3 (parte 2): trechos aleatórios da base no chat da Aura (#868), Guia de estudo que contradiz a resposta e
 * fonte inventada.
 */
import { describe, it, expect } from "vitest";
import { buscaDoTurno } from "@/lib/rag/buscaDoTurno";
import { materialDoPedido, MAX_CONTEXTO_MATERIAL } from "@/lib/studio/materialDoPedido";
import { chaveDoLink, fontesConferidas, MARCA_PROVAVEL } from "@/lib/agent/fontesConferidas";
import { normalizeAnswer } from "@/lib/agent/aura-harness";

describe("#868 no chat da Aura · quando NÃO buscar na base", () => {
  it("pedido sem assunto não busca (era o 'Direito profissional — MMLU', 'Dengue' no resumo)", () => {
    expect(buscaDoTurno({ pergunta: "resume", temAnexo: false })).toEqual({ buscar: false, areasPublicas: false, vago: true });
    expect(buscaDoTurno({ pergunta: "me ajuda com isso por favor", temAnexo: false }).buscar).toBe(false);
  });

  it("com anexo, 'resuma o documento' aponta pro anexo: não busca, e não é vago (o anexo É o assunto)", () => {
    expect(buscaDoTurno({ pergunta: "resuma o documento", temAnexo: true })).toEqual({ buscar: false, areasPublicas: false, vago: false });
    expect(buscaDoTurno({ pergunta: "o que diz esse PDF?", temAnexo: true }).buscar).toBe(false);
    expect(buscaDoTurno({ pergunta: "explica a página 3 do arquivo", temAnexo: true }).buscar).toBe(false);
  });

  it("com anexo e assunto: busca só na base PESSOAL (sem MMLU/ENEM/Wikipédia)", () => {
    expect(buscaDoTurno({ pergunta: "qual a palavra-código secreta do manual?", temAnexo: true })).toEqual({ buscar: true, areasPublicas: false, vago: false });
  });

  it("sem anexo e com assunto: tudo como antes (base pessoal + áreas)", () => {
    expect(buscaDoTurno({ pergunta: "explica o ciclo de Krebs", temAnexo: false })).toEqual({ buscar: true, areasPublicas: true, vago: false });
    // "documento" sem anexo é assunto normal ("documento de identidade")
    expect(buscaDoTurno({ pergunta: "o que é um documento público?", temAnexo: false }).buscar).toBe(true);
  });
});

describe("o Guia de estudo não contradiz a resposta", () => {
  it("sem estudo com conteúdo, parte da explicação que o aluno leu", () => {
    const r = materialDoPedido({ topic: "Mandacaru-7", contexto: "O projeto custou R$ 2.317,00 e cobriu 34 de 37 casas." });
    expect(r.doTopico).toBe(true);
    expect(r.material).toMatch(/R\$ 2\.317,00/);
    expect(r.material).toMatch(/não diga que falta conteúdo/);
  });

  it("estudo com conteúdo continua vencendo (o de sempre)", () => {
    expect(materialDoPedido({ textoDoEstudo: "fonte do estudo", topic: "x", contexto: "y" })).toEqual({ material: "fonte do estudo", doTopico: false });
  });

  it("sem explicação: só o tópico, como antes; sem nada: vazio", () => {
    expect(materialDoPedido({ topic: "fotossíntese" })).toEqual({ material: "Tópico pedido na conversa: fotossíntese", doTopico: true });
    expect(materialDoPedido({})).toEqual({ material: "", doTopico: false });
  });

  it("explicação gigante é cortada", () => {
    expect(materialDoPedido({ contexto: "a".repeat(50_000) }).material.length).toBeLessThan(MAX_CONTEXTO_MATERIAL + 300);
  });
});

describe("fonte inventada vira palpite marcado, sem link", () => {
  const web = { title: "Independência do Brasil — Brasil Escola", url: "https://brasilescola.uol.com.br/historiab/independencia.htm" };

  it("o caso do teste: UFMG com link cortado e Brasil Escola sem ter sido buscado", () => {
    const r = fontesConferidas(
      [{ title: "Faculdade de Direito da UFMG", url: "https://www.ufmg.br/…" }, { title: "Brasil Escola", url: "https://www.brasilescola.uol.com.br/historia/x" }],
      { evidencia: [], textos: ["resume isso por favor"] },
    );
    expect(r).toEqual([
      { title: `Faculdade de Direito da UFMG ${MARCA_PROVAVEL}` },
      { title: `Brasil Escola ${MARCA_PROVAVEL}` },
    ]);
  });

  it("fonte que a busca do turno trouxe fica como está (com o link)", () => {
    const r = fontesConferidas([{ title: "Brasil Escola", url: "http://www.brasilescola.uol.com.br/historiab/independencia.htm?x=1" }], { evidencia: [web], textos: [] });
    expect(r[0].url).toBeDefined();
    expect(r[0].title).toBe("Brasil Escola");
  });

  it("link que a pessoa colou no pedido também confere", () => {
    const r = fontesConferidas([{ title: "Artigo", url: "https://exemplo.org/a" }], { evidencia: [], textos: ["resume https://exemplo.org/a pra mim"] });
    expect(r[0]).toEqual({ title: "Artigo", url: "https://exemplo.org/a" });
  });

  it("sem link: confere pelo título (na evidência ou no texto)", () => {
    expect(fontesConferidas([{ title: "Brasil Escola" }], { evidencia: [web], textos: [] })[0].title).toBe("Brasil Escola");
    expect(fontesConferidas([{ title: "Censo 2022, IBGE" }], { evidencia: [], textos: [] })[0].title).toMatch(/provável/);
  });

  it("não marca duas vezes", () => {
    expect(fontesConferidas([{ title: `X ${MARCA_PROVAVEL}`, url: "https://x.com/…" }], { evidencia: [], textos: [] })).toEqual([{ title: `X ${MARCA_PROVAVEL}`, url: undefined }]);
  });

  it("a chave do link ignora protocolo, www, query e barra final", () => {
    expect(chaveDoLink("https://www.Site.com/a/?q=1#b")).toBe("site.com/a");
  });

  it("ligado na resposta da Aura (normalizeAnswer)", () => {
    const st: any = { objective: "resume isso", evidence: [{ claim: "c", source: web, confidence: "alta" }] };
    const a = normalizeAnswer({ nucleo: "ok", sources: [{ title: "Brasil Escola", url: web.url }, { title: "UFMG", url: "https://ufmg.br/…" }] } as any, st);
    expect(a.sources).toEqual([{ title: "Brasil Escola", url: web.url }, { title: `UFMG ${MARCA_PROVAVEL}` }]);
  });
});
