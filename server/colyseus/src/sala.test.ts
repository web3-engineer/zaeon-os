import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, type Room } from "@colyseus/sdk";
import { assinarToken, verificarToken, VALIDADE_TOKEN_MS } from "./token";
import { sanitizarPose, sanitizarRtc } from "./regras";

const SEGREDO = "segredo-de-teste-123";
process.env.REALTIME_SECRET = SEGREDO;
const SALA = "0123456789abcdef01234567", OUTRA = "fedcba9876543210fedcba98";
const id = (n: number) => n.toString(16).padStart(24, "a");
const token = (u: string, o: { f?: boolean; s?: string; exp?: number } = {}) => assinarToken({ u, n: `P${u.slice(-2)}`, c: "#123456", f: !!o.f, q: false, s: o.s ?? SALA, exp: o.exp ?? Date.now() + VALIDADE_TOKEN_MS }, SEGREDO);
const espera = async (cond: () => boolean, ms = 3000) => { const t0 = Date.now(); while (!cond()) { if (Date.now() - t0 > ms) throw new Error("timeout esperando condição"); await new Promise((r) => setTimeout(r, 20)); } };

describe("token de entrada (HMAC)", () => {
  it("assina e confere; adulterado, expirado ou segredo errado → null", () => {
    const t = token(id(1));
    expect(verificarToken(t, SEGREDO)?.u).toBe(id(1));
    const [corpo, sig] = t.split(".");
    const outro = Buffer.from(JSON.stringify({ u: id(2), n: "x", c: "#000000", f: true, q: false, s: SALA, exp: Date.now() + 9e5 })).toString("base64url");
    expect(verificarToken(`${outro}.${sig}`, SEGREDO)).toBeNull();          // trocou o payload (virar fundador)
    expect(verificarToken(t, "outro-segredo")).toBeNull();
    expect(verificarToken(token(id(1), { exp: Date.now() - 1 }), SEGREDO)).toBeNull();
    expect(verificarToken(`${corpo}`, SEGREDO)).toBeNull();
  });
});

describe("regras da pose", () => {
  it("saneia números; regalias (topo/nave) só pra fundador; a Zaeon (céu) e as motos pra todos", () => {
    expect(sanitizarPose({ x: "1", z: 0, facing: 0 }, false)).toBeNull();
    const p = sanitizarPose({ x: 1e9, z: -3, facing: 0.5, topo: true, ceu: true, voo: { y: 50, yaw: 1 }, jet: 7 }, false)!;
    expect(p.x).toBe(1540); expect(p.topo).toBe(false); expect(p.ceu).toBe(true); expect(p.voo).toBeNull(); expect(p.jet).toBe(7);
    expect(sanitizarPose({ x: 0, z: 0, facing: 0, topo: true, voo: { y: 50, yaw: 1 } }, true)!.voo).toEqual({ y: 50, yaw: 1 });
    // moto: qualquer um; vaga inteira 0..7 (chão + Zaeon), altura com teto; lixo → nada
    expect(sanitizarPose({ x: 0, z: 0, facing: 0, moto: { s: 6, y: 231, yaw: 1 } }, false)!.moto).toEqual({ s: 6, y: 231, yaw: 1 });
    expect(sanitizarPose({ x: 0, z: 0, facing: 0, moto: { s: 32, y: 1, yaw: 0 } }, false)!.moto).toBeNull();   // 32 vagas (4 no chão + 12 na Zaeon + 16 nos autódromos)
    expect(sanitizarPose({ x: 0, z: 0, facing: 0, moto: { s: 31, y: 1, yaw: 0, de: "c".repeat(24) } }, false)!.moto).toEqual({ s: 31, y: 1, yaw: 0, de: "c".repeat(24) });
    expect(sanitizarPose({ x: 0, z: 0, facing: 0, moto: { s: 15, y: 1, yaw: 0, de: "x" } }, false)!.moto).toEqual({ s: 15, y: 1, yaw: 0 });
    expect(sanitizarPose({ x: 0, z: 0, facing: 0, moto: { s: 1.5, y: 1, yaw: 0 } }, false)!.moto).toBeNull();
    expect(sanitizarPose({ x: 0, z: 0, facing: 0, moto: { s: 0, y: 9999, yaw: 0 } }, false)!.moto!.y).toBe(800);
    // a Zaeon mega (z −560…−812, piso 450, lounge 538): quem está lá chega INTEIRO pros outros
    const z = sanitizarPose({ x: -394, z: -790, facing: 0, ceu: true, alt: 550, jet: 560, moto: { s: 4, y: 452, yaw: 0 } }, false)!;
    expect([z.x, z.z, z.alt, z.jet, z.moto!.y]).toEqual([-394, -790, 550, 560, 452]);
    expect(sanitizarRtc({ to: "fora", data: {} }, new Set(["a"]))).toBeNull();
    expect(sanitizarRtc({ to: "a", data: "x".repeat(20000) }, new Set(["a"]))).toBeNull();
  });
});

describe("LoungeRoom (servidor de verdade + clientes do SDK)", () => {
  let porta = 0, fechar: () => Promise<void> = async () => {};
  const salas: Room[] = [];
  const entrar = async (u: string, o: { f?: boolean; s?: string; tokenS?: string } = {}) => {
    const c = new Client(`ws://127.0.0.1:${porta}`);
    const r = await c.joinOrCreate("lounge", { salaId: o.s ?? SALA, token: token(u, { f: o.f, s: o.tokenS ?? o.s ?? SALA }) });
    salas.push(r); return r;
  };
  const jogadores = (r: Room) => (r.state as { players?: Map<string, Record<string, unknown>> }).players;

  beforeAll(async () => {
    const { criarServidor } = await import("./app");
    const { servidor, httpServer } = criarServidor(SEGREDO);
    await servidor.listen(0, "127.0.0.1");
    porta = (httpServer.address() as { port: number }).port;
    const ate = (p: Promise<unknown>, ms: number) => Promise.race([p.catch(() => {}), new Promise((r) => setTimeout(r, ms))]);
    fechar = async () => { await ate(Promise.all(salas.map((r) => r.leave().catch(() => {}))), 1500); await ate(servidor.gracefullyShutdown(false), 3000); httpServer.closeAllConnections?.(); };
  });
  afterAll(async () => { await fechar(); });

  it("health responde", async () => { expect(await (await fetch(`http://127.0.0.1:${porta}/health`)).text()).toBe("ok"); });

  it("sem token válido, ou com token de OUTRA sala, a entrada é recusada", async () => {
    const c = new Client(`ws://127.0.0.1:${porta}`);
    await expect(c.joinOrCreate("lounge", { salaId: SALA, token: "lixo" })).rejects.toBeTruthy();
    await expect(entrar(id(9), { s: SALA, tokenS: OUTRA })).rejects.toBeTruthy();
  });

  it("dois na mesma sala se veem NA HORA (sem assimetria) e a pose chega no outro; regalia de não-fundador é ignorada", async () => {
    const a = await entrar(id(1), { f: true }), b = await entrar(id(2));
    await espera(() => jogadores(a)?.size === 2 && jogadores(b)?.size === 2);
    b.send("pose", { x: 5, z: 6, facing: 1, moving: true, sit: false, topo: true, voo: { y: 80, yaw: 0 } });
    a.send("pose", { x: -2, z: 3, facing: 0, moving: false, sit: false, voo: { y: 80, yaw: 0.5 } });
    await espera(() => jogadores(a)?.get(id(2))?.x === 5 && jogadores(b)?.get(id(1))?.voando === true);
    expect(jogadores(a)!.get(id(2))!.topo).toBe(false);      // b não é fundador
    expect(jogadores(a)!.get(id(2))!.voando).toBe(false);
    expect(jogadores(b)!.get(id(1))!.vooY).toBe(80);         // a é fundador (pelo token)
  });

  it("voz: o signaling vai só pro destinatário, com o remetente da SESSÃO; falando aparece pros outros", async () => {
    const [a, b] = salas;
    const recebidos: unknown[] = [];
    b!.onMessage("rtc", (m) => recebidos.push(m));
    a!.send("rtc", { to: id(2), data: { tipo: "offer", sdp: "v=0" }, from: "forjado" });
    await espera(() => recebidos.length === 1);
    expect(recebidos[0]).toEqual({ from: id(1), data: { tipo: "offer", sdp: "v=0" } });
    a!.send("fala", { on: true });
    await espera(() => jogadores(b!)?.get(id(1))?.falando === true);
  });

  it("voz: quem ainda não mandou pose (o novato no tutorial) não fala nem ouve ninguém", async () => {
    const [a] = salas, n = await entrar(id(9));
    await espera(() => jogadores(a!)?.has(id(9)) === true);
    const praN: unknown[] = [], praA: unknown[] = [];
    n.onMessage("rtc", (m) => praN.push(m)); a!.onMessage("rtc", (m) => praA.push(m));
    a!.send("rtc", { to: id(9), data: { tipo: "offer", sdp: "v=0" } });
    n.send("rtc", { to: id(1), data: { tipo: "offer", sdp: "v=0" } });
    n.send("fala", { on: true });
    await new Promise((r) => setTimeout(r, 300));
    expect(praN).toHaveLength(0); expect(praA).toHaveLength(0); expect(jogadores(a!)!.get(id(9))!.falando).toBe(false);
    n.send("pose", { x: 0, z: 0, facing: 0, moving: false, sit: false });   // cruzou o portal: entra no mundo (e na voz)
    await espera(() => jogadores(a!)?.get(id(9))?.pronto === true);
    a!.send("rtc", { to: id(9), data: { tipo: "offer", sdp: "v=0" } });
    await espera(() => praN.length === 1);
    await n.leave(); await espera(() => jogadores(a!)?.has(id(9)) === false);
  });

  it("a mesma pessoa em outra aba: continua UM avatar", async () => {
    const b2 = await entrar(id(2));
    await espera(() => jogadores(b2)?.size === 2);
    await new Promise((r) => setTimeout(r, 300));
    expect(jogadores(salas[0]!)!.size).toBe(2);
  });

  it("teto de 5 por sala; outra sala (outro convite) é outra room", async () => {
    await entrar(id(3)); await entrar(id(4)); await entrar(id(5));
    await espera(() => jogadores(salas[0]!)?.size === 5);
    await expect(entrar(id(6))).rejects.toBeTruthy();   // o 6º não entra
    const fora = await entrar(id(7), { s: OUTRA });
    await espera(() => jogadores(fora)?.size === 1);
    expect(jogadores(salas[0]!)!.has(id(7))).toBe(false);
  });

  it("sair remove o avatar pros outros", async () => {
    const a = salas[0]!, ultimo = salas.find((r) => (jogadores(r)?.size ?? 0) === 5 && r !== a)!;
    await a.leave();
    await espera(() => !jogadores(ultimo)?.has(id(1)));
  });
});

describe("arena PvP na pose (servidor)", () => {
  it("o golpe, a vida e a espada passam limpos", () => {
    const p = sanitizarPose({ x: 0, z: 0, facing: 0, atk: 22, hp: 64, arma: 1 }, false)!;
    expect(p.atk).toBe(22); expect(p.hp).toBe(64); expect(p.arma).toBe(true); expect(sanitizarPose({ x: 0, z: 0, facing: 0, mov: 2 }, false)!.mov).toBe(2); expect(sanitizarPose({ x: 0, z: 0, facing: 0, mov: 7 }, false)!.mov).toBe(0);
    const q = sanitizarPose({ x: 0, z: 0, facing: 0, atk: -1, hp: 900, arma: true }, false)!;
    expect(q.atk).toBe(0); expect(q.hp).toBe(100); expect(q.arma).toBe(false);
  });
});
