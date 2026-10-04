import { describe, it, expect } from "vitest";
import { sanitizarTexto, sanitizarNota, sanitizarArtefato, lerConteudo, aplicarOps, admitir, moverRelativoCamera, interpolar, sanitizarPresenca, notaDoPonto } from "@/lib/lounge3d/sala";
import { lerPontos, empurrarPontos, removerPonto, pontosDaResposta, MAX_PONTOS } from "@/lib/lounge3d/pontos";
import { LIMITE_SALA, MAX_NOTAS, MAX_TEXTO_CHAT, corDoUsuario, salaIdDeCanal, canalSala } from "@/lib/lounge3d/tipos";

const OID = "0123456789abcdef01234567";

describe("sanitização (XSS/lixo nunca chega ao DOM)", () => {
  it("texto: tira controle e zero-width, apara, teto", () => {
    expect(sanitizarTexto("  olá\u0000​ mundo    ", 50)).toBe("olá mundo");
    expect(sanitizarTexto("x".repeat(600), MAX_TEXTO_CHAT).length).toBe(MAX_TEXTO_CHAT);
    expect(sanitizarTexto(42, 10)).toBe("");
  });
  it("nota: id/coords válidos obrigatórios; kind default; autorId só ObjectId; texto cortado", () => {
    expect(sanitizarNota({ id: "n1", x: 1, z: 2, text: "<img onerror=alert(1)>" })).toMatchObject({ kind: "nota", src: "Você", text: "<img onerror=alert(1)>" }); // guardado como TEXTO; a UI usa textContent
    expect(sanitizarNota({ id: "bad id", x: 1, z: 2 })).toBeNull();
    expect(sanitizarNota({ id: "n1", x: "1", z: 2 })).toBeNull();
    expect(sanitizarNota({ id: "n1", x: 9999, z: 0, autorId: "zz", kind: "do chat" })!).toMatchObject({ x: 400, kind: "do chat" });
    expect(sanitizarNota({ id: "n1", x: 0, z: 0, autorId: OID })!.autorId).toBe(OID);
  });
  it("artefato: só tipos conhecidos; url só http(s)", () => {
    expect(sanitizarArtefato({ id: "a", type: "bomba", x: 0, z: 0 })).toBeNull();
    expect(sanitizarArtefato({ id: "a", type: "imagem", x: 0, z: 0, data: { url: "javascript:alert(1)", titulo: "t" } })!.data).toEqual({ titulo: "t" });
    expect(sanitizarArtefato({ id: "a", type: "imagem", x: 0, z: 0, data: { url: "https://x.y/z.png" } })!.data!.url).toBe("https://x.y/z.png");
  });
  it("lerConteudo: string JSON, objeto ou lixo → sala válida", () => {
    expect(lerConteudo("{nope")).toEqual({ notes: [], artifacts: [] });
    expect(lerConteudo(JSON.stringify({ notes: [{ id: "n", x: 0, z: 0, text: "a" }, null], artifacts: [{ id: "m", type: "molecula", x: 1, z: 1 }] })).notes).toHaveLength(1);
  });
});

describe("aplicarOps (por item, tetos)", () => {
  const base = lerConteudo({ notes: [{ id: "a", x: 0, z: 0, text: "A" }, { id: "b", x: 0, z: 0, text: "B" }], artifacts: [] });
  it("upsert do mesmo id substitui; novo entra no fim; remove sai; ids de outros não são tocados", () => {
    const r = aplicarOps(base, { upsertNotes: [{ id: "b", x: 1, z: 1, text: "B2" }, { id: "c", x: 2, z: 2, text: "C" }], removeNotes: ["a"] });
    expect(r.notes.map((n) => [n.id, n.text])).toEqual([["b", "B2"], ["c", "C"]]);
  });
  it("remover e inserir o mesmo id na mesma op → removido vence; teto de notas", () => {
    expect(aplicarOps(base, { upsertNotes: [{ id: "z", x: 0, z: 0, text: "z" }], removeNotes: ["z"] }).notes.some((n) => n.id === "z")).toBe(false);
    const muitas = [...Array(MAX_NOTAS + 20)].map((_, i) => ({ id: `n${i}`, x: 0, z: 0, text: "x" }));
    expect(aplicarOps({ notes: [], artifacts: [] }, { upsertNotes: muitas }).notes).toHaveLength(MAX_NOTAS);
  });
});

describe("admissão ≤5", () => {
  it("5 dentro → 6º recusado; quem já está dentro reconecta", () => {
    const cinco = ["1", "2", "3", "4", "5"];
    expect(admitir(cinco, "6")).toEqual({ ok: false, motivo: "cheia" });
    expect(admitir(cinco, "3")).toEqual({ ok: true });
    expect(admitir(cinco.slice(0, 4), "6")).toEqual({ ok: true });
    expect(LIMITE_SALA).toBe(5);
  });
});

describe("movimento e interpolação", () => {
  it("WASD relativo à câmera: com az=0, W (iz=-1) anda em -z; az=π/2 gira", () => {
    expect(moverRelativoCamera(0, 0, 0)).toBeNull();
    const w = moverRelativoCamera(0, -1, 0)!; expect(w.wx).toBeCloseTo(0); expect(w.wz).toBeCloseTo(-1);
    const w2 = moverRelativoCamera(0, -1, Math.PI / 2)!; expect(w2.wx).toBeCloseTo(-1); expect(Math.abs(w2.wz)).toBeLessThan(1e-9);
    const d = moverRelativoCamera(1, -1, 0)!; expect(Math.hypot(d.wx, d.wz)).toBeCloseTo(1);
  });
  it("interpolar aproxima sem passar do alvo e gira pelo menor arco", () => {
    const r = interpolar({ x: 0, z: 0, facing: 3 }, { x: 1, z: 0, facing: -3 }, 0.05);
    expect(r.x).toBeGreaterThan(0); expect(r.x).toBeLessThan(1); expect(r.moving).toBe(true);
    expect(r.facing).toBeGreaterThan(3); // vai por 3 → π → -3 (menor arco), não por zero
    const parado = interpolar({ x: 1, z: 1, facing: 0 }, { x: 1, z: 1, facing: 0 }, 0.05);
    expect(parado.moving).toBe(false);
  });
  it("presença da rede: só userId ObjectId + números; cor validada", () => {
    expect(sanitizarPresenca({ userId: "x", x: 0, z: 0, facing: 0 })).toBeNull();
    expect(sanitizarPresenca({ userId: OID, x: 1, z: 2, facing: 0.5, color: "red", name: "<b>" })).toMatchObject({ color: "#4aa3ff", name: "<b>" });
  });
});

describe("ponte chat → nota", () => {
  const mem = () => { const d: Record<string, string> = {}; return { getItem: (k: string) => d[k] ?? null, setItem: (k: string, v: string) => { d[k] = v; } }; };
  it("pontosDaResposta: até 4 (2 conceitos + 2 passos), com scopeId e ids estáveis", () => {
    const ps = pontosDaResposta("t1", "m1", { nucleo: "n", conceitos: ["A", "B", "C"], proximos_passos: ["p1", "p2", "p3"] });
    expect(ps).toHaveLength(4); expect(ps[0]).toMatchObject({ id: "m1:k:0", scopeId: "t1", titulo: "A", texto: "n" }); expect(ps[2]!.titulo).toBe("Próximo passo");
    expect(pontosDaResposta("t1", "m2", { nucleo: "" })).toEqual([]);
  });
  it("fila local: empurra sem duplicar, remove, teto", () => {
    const a = mem();
    empurrarPontos([{ id: "1", scopeId: "t", texto: "x", ts: 1 }], a);
    empurrarPontos([{ id: "1", scopeId: "t", texto: "x", ts: 1 }, { id: "2", scopeId: "t", texto: "y", ts: 2 }], a);
    expect(lerPontos(a).map((p) => p.id)).toEqual(["1", "2"]);
    expect(removerPonto("1", a).map((p) => p.id)).toEqual(["2"]);
    empurrarPontos([...Array(MAX_PONTOS + 5)].map((_, i) => ({ id: `z${i}`, scopeId: "t", texto: "x", ts: i })), a);
    expect(lerPontos(a)).toHaveLength(MAX_PONTOS);
    expect(lerPontos({ getItem: () => "{broken" })).toEqual([]);
  });
  it("notaDoPonto nasce perto do avatar como 'do chat' com scopeId", () => {
    const n = notaDoPonto({ id: "m1:k:0", scopeId: "t1", titulo: "pH", texto: "medir em CaCl2", ts: 1 }, { x: 2, z: 3 }, OID);
    expect(n).toMatchObject({ id: "c_m1:k:0", kind: "do chat", src: "Aura", scopeId: "t1", autorId: OID, x: 2.7, z: 2.5 });
    expect(n.text).toBe("pH\nmedir em CaCl2");
  });
});

describe("canal e cor", () => {
  it("nome do canal e parse; cor determinística", () => {
    expect(salaIdDeCanal(canalSala(OID))).toBe(OID);
    expect(salaIdDeCanal("presence-lounge3d-zzz")).toBeNull();
    expect(corDoUsuario(OID)).toBe(corDoUsuario(OID)); expect(corDoUsuario(OID)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("presença: `sit` só é true quando é exatamente true (cyberespaço)", () => {
    const base = { userId: "a".repeat(24), name: "Ana", color: "#4aa3ff", x: 1, z: 2, facing: 0 };
    expect(sanitizarPresenca({ ...base, sit: true })?.sit).toBe(true);
    expect(sanitizarPresenca({ ...base, sit: "true" })?.sit).toBe(false);
    expect(sanitizarPresenca(base)?.sit).toBe(false);
  });
});
