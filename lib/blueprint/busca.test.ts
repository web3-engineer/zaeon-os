/** #683: buscar blueprint pelo nome e a lista de 40 em 40. */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { filtrarBlueprints } from "./busca";
import { POR_PAGINA, listarPagina } from "./server";
import { docVazio } from "./tipos";
import { bancoFalso } from "./__teste__/banco";

const b = (titulo: string) => ({ titulo });

describe("filtrarBlueprints", () => {
  const lista = [b("Fundamentos de Python para Data Science"), b("Fotossíntese"), b("Privacidade na Solana")];
  it("acha por parte do nome, sem acento nem maiúscula", () => {
    expect(filtrarBlueprints(lista, "python").map((x) => x.titulo)).toEqual(["Fundamentos de Python para Data Science"]);
    expect(filtrarBlueprints(lista, "FOTOSSINTESE")).toHaveLength(1);
  });
  it("várias palavras, em qualquer ordem", () => {
    expect(filtrarBlueprints(lista, "data python")).toHaveLength(1);
    expect(filtrarBlueprints(lista, "data solana")).toHaveLength(0);
  });
  it("busca vazia mostra todos; sem resultado, nenhum", () => {
    expect(filtrarBlueprints(lista, "   ")).toHaveLength(3);
    expect(filtrarBlueprints(lista, "kant")).toEqual([]);
  });
});

describe("listarPagina", () => {
  beforeEach(() => { process.env.BLUEPRINT_PRATICO = "1"; });
  afterEach(() => { delete process.env.BLUEPRINT_PRATICO; });
  const U = "u".repeat(24);
  const encher = async (n: number) => {
    const { db } = bancoFalso();
    for (let i = 0; i < n; i++) await db.cartolina.create({ data: { ownerId: U, surface: "blueprint", scopeId: `t${i}`, titulo: `B${i}`, cards: docVazio(`B${i}`, i) as never } });
    return db;
  };
  it("até 40 cabem numa página, sem 'ver mais'", async () => {
    const r = await listarPagina(U, POR_PAGINA, await encher(40));
    expect(r.blueprints).toHaveLength(40);
    expect(r.temMais).toBe(false);
  });
  it("com 41, a primeira página avisa que tem mais, e a próxima traz todos", async () => {
    const db = await encher(41);
    expect(await listarPagina(U, 40, db)).toMatchObject({ temMais: true });
    const r = await listarPagina(U, 80, db);
    expect(r.blueprints).toHaveLength(41);
    expect(r.temMais).toBe(false);
  });
  it("limite inválido vira o padrão; nunca passa do teto", async () => {
    const db = await encher(3);
    expect((await listarPagina(U, NaN, db)).blueprints).toHaveLength(3);
    expect((await listarPagina(U, -5, db)).blueprints).toHaveLength(1);
  });
});
