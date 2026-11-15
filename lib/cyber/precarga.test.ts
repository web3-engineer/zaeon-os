import { describe, expect, it, beforeEach } from "vitest";
import { existsSync } from "fs";
import { join } from "path";
import { _reiniciarPrecarga, aguentaPesados, corpoBaixando, estadoPrecarga, manifesto, ouvirPrecarga, precarregarCorposCyber, precarregarCyber, segurarPrecarga, urlsDosCorpos, urlsDosSons } from "./precarga";

describe("precarga do cyberespaço", () => {
  beforeEach(() => _reiniciarPrecarga());

  it("todo arquivo do manifesto existe em public/ (sons, texturas, corpos)", () => {
    const faltando = manifesto(true).filter((i) => !existsSync(join(process.cwd(), "public", i.url)));
    expect(faltando).toEqual([]);
    expect(urlsDosSons().length).toBeGreaterThan(15);
    expect(urlsDosCorpos().length).toBeGreaterThanOrEqual(3);   // a Examiner, o Scholar (DJ) e o founder (os que saíram do mapa não baixam)
    for (const id of ["nina", "teo"]) expect(urlsDosCorpos().some((u) => u.includes(`/avatars/${id}/`))).toBe(true);   // (a Nina e o Téo voltaram: o mirante da torre de TI)
    for (const id of ["core_active", "caio", "farmacia", "quimica", "eng-civil"]) expect(urlsDosCorpos().some((u) => u.includes(`/avatars/${id}/`))).toBe(false);
  });

  it("sintetizados não entram; o fundador entra uma vez só", () => {
    expect(urlsDosSons().some((u) => /jato-sopro|baque/.test(u))).toBe(false);   // (os da moto viraram .wav de verdade: entram)
    expect(urlsDosSons().some((u) => /moto-motor/.test(u))).toBe(true);
    const corpos = urlsDosCorpos();
    expect(corpos.filter((u) => u.includes("fundador")).length).toBe(1);
    expect(manifesto(false).some((i) => i.tipo === "corpo")).toBe(false);
  });

  it("corpos só em tela grande, sem economia de dados e fora de 2g/3g", () => {
    expect(aguentaPesados({ largura: 1440 })).toBe(true);
    expect(aguentaPesados({ largura: 390 })).toBe(false);
    expect(aguentaPesados({ largura: 1440, saveData: true })).toBe(false);
    expect(aguentaPesados({ largura: 1440, effectiveType: "3g" })).toBe(false);
    expect(aguentaPesados({ largura: 1440, effectiveType: "slow-2g" })).toBe(false);
    expect(aguentaPesados({ largura: 1440, effectiveType: "4g" })).toBe(true);
  });

  it("a barra anda por bytes, chega a 1 e fica pronta; falha de arquivo não trava", async () => {
    const vistos: number[] = [];
    const baixarImpl = async (url: string, avancar: (d: number) => void, tamanho: (n: number) => void) => {
      if (url.endsWith("terra-blue-marble.jpg")) return 0;   // "falhou"
      tamanho(100); avancar(50); avancar(50); return 100;
    };
    const inicio = precarregarCyber({ importarCodigo: async () => ({}), ambiente: { largura: 390 }, baixarImpl, concorrencia: 2 });
    expect(inicio.pronto).toBe(false);
    await new Promise<void>((ok) => {
      ouvirPrecarga((e) => { vistos.push(e.progresso); if (e.pronto) ok(); });
    });
    expect(vistos[vistos.length - 1]).toBe(1);
    for (let i = 1; i < vistos.length; i++) expect(vistos[i]).toBeGreaterThanOrEqual(vistos[i - 1] - 1e-9);
    // começar de novo não reinicia (singleton)
    expect(precarregarCyber().pronto).toBe(true);
  });

  it("a TRAVA: com uma cena 3D da página carregando, nada novo começa e os corpos em andamento voltam pra fila", async () => {
    const comecou: string[] = [], abortados: string[] = [];
    // um download que só termina quando a gente manda (ou quando é cancelado)
    const pendentes = new Map<string, () => void>();
    const baixarImpl = (url: string, avancar: (d: number) => void, tamanho: (n: number) => void, sinal?: AbortSignal) =>
      new Promise<number>((ok) => {
        comecou.push(url); tamanho(100);
        pendentes.set(url, () => { avancar(100); ok(100); });
        sinal?.addEventListener("abort", () => { abortados.push(url); pendentes.delete(url); ok(-1); });
      });
    const espera = (ms = 5) => new Promise((r) => setTimeout(r, ms));
    precarregarCyber({ importarCodigo: async () => ({}), ambiente: { largura: 1440 }, baixarImpl, concorrencia: 1, comCorpos: true });
    await espera();
    // os sons vão primeiro; termina eles até o primeiro corpo começar
    while (!comecou.some((u) => u.endsWith(".vrm"))) { const [u, fim] = [...pendentes.entries()][0]!; pendentes.delete(u); fim(); await espera(); }
    const corpo = comecou.find((u) => u.endsWith(".vrm"))!;
    // a vitrine começou a carregar: o corpo em andamento é cancelado e nada novo começa
    const soltar = segurarPrecarga();
    await espera();
    expect(abortados).toEqual([corpo]);
    const antes = comecou.length;
    await espera(20);
    expect(comecou.length).toBe(antes);
    // a vitrine ficou pronta: a fila volta, começando pelo corpo cancelado
    soltar();
    await espera();
    expect(comecou[antes]).toBe(corpo);
    // soltar de novo não faz nada (e uma trava com tempo máximo solta sozinha)
    soltar();
    const soltarSozinha = segurarPrecarga({ maxMs: 10 });
    await espera(30);
    expect(comecou.length).toBeGreaterThan(antes);
    soltarSozinha();
  });

  describe("#819 · os corpos só quando a pessoa vai jogar", () => {
    const espera = (ms = 5) => new Promise((r) => setTimeout(r, ms));
    const registrar = (baixados: string[]) => async (url: string, avancar: (d: number) => void, tamanho: (n: number) => void) => {
      baixados.push(url); tamanho(10); avancar(10); return 10;
    };

    it("a página inicial (tela grande) NÃO baixa nenhum corpo", async () => {
      const baixados: string[] = [];
      precarregarCyber({ importarCodigo: async () => ({}), ambiente: { largura: 1440 }, baixarImpl: registrar(baixados) });
      await new Promise<void>((ok) => ouvirPrecarga((e) => { if (e.pronto) ok(); }));
      expect(baixados.length).toBeGreaterThan(0);
      expect(baixados.some((u) => u.endsWith(".vrm"))).toBe(false);
      expect(baixados.some((u) => u.includes("fundador") || u.includes("examiner"))).toBe(false);
    });

    it("passou o mouse no Play game: os corpos baixam (uma vez só), por fora da barra", async () => {
      const baixados: string[] = [];
      const baixarImpl = registrar(baixados);
      precarregarCyber({ importarCodigo: async () => ({}), ambiente: { largura: 1440 }, baixarImpl });
      await new Promise<void>((ok) => ouvirPrecarga((e) => { if (e.pronto) ok(); }));
      precarregarCorposCyber({ ambiente: { largura: 1440 }, baixarImpl });
      precarregarCorposCyber({ ambiente: { largura: 1440 }, baixarImpl });   // (de novo: não repete)
      await espera(20);
      const corpos = baixados.filter((u) => u.endsWith(".vrm"));
      expect(corpos.sort()).toEqual([...urlsDosCorpos()].sort());
    });

    it("pedido de jogar antes da pré-carga começar: a barra NÃO espera os corpos, e eles vêm depois dela", async () => {
      const ordem: string[] = [];
      const corposPresos: (() => void)[] = [];
      const baixarImpl = async (url: string, avancar: (d: number) => void, tamanho: (n: number) => void) => {
        ordem.push(url); tamanho(10);
        if (url.endsWith(".vrm")) await new Promise<void>((ok) => corposPresos.push(ok));   // (os corpos nunca terminam aqui)
        avancar(10); return 10;
      };
      precarregarCorposCyber({ ambiente: { largura: 1440 }, baixarImpl, importarCodigo: async () => ({}) });
      await new Promise<void>((ok) => ouvirPrecarga((e) => { if (e.pronto) ok(); }));
      expect(estadoPrecarga().comCorpos).toBe(false);
      const leves = ordem.filter((u) => !u.endsWith(".vrm")).length;
      expect(ordem.slice(0, leves).some((u) => u.endsWith(".vrm"))).toBe(false);   // nenhum corpo no meio da barra
      await espera(10);
      expect(ordem.filter((u) => u.endsWith(".vrm")).length).toBe(2);   // depois dela, 2 por vez (sem somar com a fila leve)
      corposPresos.forEach((ok) => ok());
    });

    it("trava que chega quando a fila acabou de ser solta: o corpo não começa por fora dela", async () => {
      const baixados: string[] = [];
      const baixarImpl = registrar(baixados);
      precarregarCyber({ importarCodigo: async () => ({}), ambiente: { largura: 1440 }, baixarImpl });
      await new Promise<void>((ok) => ouvirPrecarga((e) => { if (e.pronto) ok(); }));
      const soltar1 = segurarPrecarga();
      precarregarCorposCyber({ ambiente: { largura: 1440 }, baixarImpl });
      await espera(10);
      soltar1();
      const soltar2 = segurarPrecarga();   // (no mesmo instante: os trabalhadores ainda não acordaram)
      await espera(10);
      expect(baixados.some((u) => u.endsWith(".vrm"))).toBe(false);
      soltar2();
      await espera(20);
      expect(baixados.filter((u) => u.endsWith(".vrm")).length).toBe(urlsDosCorpos().length);
    });

    it("o corpo baixando ao fundo fica visível pro precarregarVrm esperar (sem baixar duas vezes)", async () => {
      const terminar = new Map<string, () => void>();
      const baixarImpl = async (url: string, avancar: (d: number) => void) => {
        if (url.endsWith(".vrm")) await new Promise<void>((ok) => { terminar.set(url, ok); });
        avancar(10); return 10;
      };
      precarregarCyber({ importarCodigo: async () => ({}), ambiente: { largura: 1440 }, baixarImpl, concorrencia: 1 });
      await new Promise<void>((ok) => ouvirPrecarga((e) => { if (e.pronto) ok(); }));
      precarregarCorposCyber({ ambiente: { largura: 1440 }, baixarImpl });
      await espera(10);
      const url = urlsDosCorpos().find((u) => corpoBaixando(u))!;
      expect(url).toBeTruthy();
      const p = corpoBaixando(url)!;
      let acabou = false; void p.then(() => { acabou = true; });
      await espera(5);
      expect(acabou).toBe(false);
      terminar.get(url)!();
      await espera(5);
      expect(acabou).toBe(true);
      terminar.forEach((ok) => ok());
    });

    it("no celular, nem pedindo: os corpos não baixam", async () => {
      const baixados: string[] = [];
      precarregarCorposCyber({ ambiente: { largura: 390 }, baixarImpl: registrar(baixados), importarCodigo: async () => ({}) });
      await espera(20);
      expect(baixados.some((u) => u.endsWith(".vrm"))).toBe(false);
    });
  });
});
