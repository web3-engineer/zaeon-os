/** #681: excluir não volta pela conversa, só o dono exclui, e o nome dado pela pessoa fica quando a Zaeon refaz. */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SURFACE_EXCLUIDO, blueprintDoTurno, blueprintDoUsuario, excluirBlueprint, gravarDoc, listarBlueprints, type GenJson } from "./server";
import { aplicarPatchCliente } from "./patch";
import { sanitizarDoc, type DocBlueprint } from "./tipos";
import { bancoFalso } from "./__teste__/banco";

const plano = { titulo: "Privacy on Solana", resumo: "r", area: "tecnologia", passos: [{ id: "p1", titulo: "Fundamentos", fase: 1 }], pecas: [{ id: "zk", nome: "prova ZK", fase: 2 }], criticos: [], termosRepo: [] };
const gen: GenJson = async <T,>() => plano as T;
const DONO = "u".repeat(24), OUTRO = "v".repeat(24);
const base = { userId: DONO, scopeId: "thread-1", prompt: "quero estudar", answerTexto: "…", history: [], repos: async () => [], passosBase: async () => [] };
const turno = (db: ReturnType<typeof bancoFalso>["db"], extra = {}) => blueprintDoTurno({ ...base, sinal: { estudavel: true, tituloSugerido: "X" }, db, gen, forcar: true, ...extra });

beforeEach(() => { process.env.BLUEPRINT_PRATICO = "1"; });
afterEach(() => { delete process.env.BLUEPRINT_PRATICO; });

describe("excluir", () => {
  it("some da lista e a conversa não cria outro", async () => {
    const { db, linhas } = bancoFalso();
    await turno(db);
    const id = linhas[0]!.id;
    expect(await excluirBlueprint(id, DONO, db)).toEqual({ ok: true });
    expect(await listarBlueprints(DONO, db)).toEqual([]);
    expect(await blueprintDoUsuario(id, DONO, db)).toBeNull();
    expect(await turno(db)).toBe("nao-estudo");
    expect(linhas.filter((l) => l.surface === "blueprint")).toHaveLength(0);
  });
  it("o conteúdo sai de verdade: fica só a marca, sem título nem documento", async () => {
    const { db, linhas } = bancoFalso();
    await turno(db);
    await excluirBlueprint(linhas[0]!.id, DONO, db);
    expect(linhas[0]).toMatchObject({ surface: SURFACE_EXCLUIDO, titulo: "", cards: {} });
  });
  it("quem foi convidado perde o acesso, e os comentários saem", async () => {
    const { db, linhas, membros, comentarios } = bancoFalso();
    await turno(db);
    const id = linhas[0]!.id;
    membros.push({ cartolinaId: id, userId: OUTRO, papel: "editor" });
    comentarios.push(id);
    expect((await blueprintDoUsuario(id, DONO, db))!.compartilhado).toBe(1);
    await excluirBlueprint(id, DONO, db);
    expect(membros).toEqual([]);
    expect(comentarios).toEqual([]);
    expect(await blueprintDoUsuario(id, OUTRO, db)).toBeNull();
  });
  it("só o dono exclui: o convidado não, e outra conta nem acha", async () => {
    const { db, linhas, membros } = bancoFalso();
    await turno(db);
    const id = linhas[0]!.id;
    membros.push({ cartolinaId: id, userId: OUTRO, papel: "editor" });
    expect(await excluirBlueprint(id, OUTRO, db)).toEqual({ ok: false, motivo: "forbidden" });
    expect(await excluirBlueprint(id, "w".repeat(24), db)).toEqual({ ok: false, motivo: "not_found" });
    expect(await listarBlueprints(DONO, db)).toHaveLength(1);
  });
  it("outra conversa continua criando o seu blueprint", async () => {
    const { db, linhas } = bancoFalso();
    await turno(db);
    await excluirBlueprint(linhas[0]!.id, DONO, db);
    expect(await turno(db, { scopeId: "thread-2" })).toBe("composto");
    expect(await listarBlueprints(DONO, db)).toHaveLength(1);
  });
  it("o convidado não vê quantos têm acesso", async () => {
    const { db, linhas, membros } = bancoFalso();
    await turno(db);
    membros.push({ cartolinaId: linhas[0]!.id, userId: OUTRO, papel: "leitor" });
    expect((await blueprintDoUsuario(linhas[0]!.id, OUTRO, db))!.compartilhado).toBe(0);
  });
});

describe("renomear", () => {
  it("o nome dado pela pessoa fica quando a Zaeon refaz o blueprint", async () => {
    const { db, linhas } = bancoFalso();
    await turno(db);
    const id = linhas[0]!.id;
    await gravarDoc(id, DONO, (d) => aplicarPatchCliente(d, { titulo: "Meu estudo de ZK" }, DONO), db);
    await turno(db);
    const d = linhas[0]!.cards as DocBlueprint;
    expect(d.titulo).toBe("Meu estudo de ZK");
    expect(linhas[0]!.titulo).toBe("Meu estudo de ZK");
    expect(d.passos[0]!.titulo).toBe("Fundamentos");
  });
  it("sem nome dado, a Zaeon continua nomeando", async () => {
    const { db, linhas } = bancoFalso();
    await turno(db);
    expect((linhas[0]!.cards as DocBlueprint).titulo).toBe("Privacy on Solana");
  });
  it("a marca do nome sobrevive ao saneamento, e nome vazio não muda nada", () => {
    const doc = sanitizarDoc({ v: 1, titulo: "A", tituloFixo: true })!;
    expect(doc.tituloFixo).toBe(true);
    expect(sanitizarDoc({ v: 1, titulo: "A", tituloFixo: "sim" })!.tituloFixo).toBeUndefined();
    expect(aplicarPatchCliente(sanitizarDoc({ v: 1, titulo: "A" })!, { titulo: "   " }, DONO).tituloFixo).toBeUndefined();
  });
});
