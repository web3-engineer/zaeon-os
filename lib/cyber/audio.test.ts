import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { CRISTAIS_PERTO, DISTANCIA, GATILHO_VOO, gatilhoVooInicial, gatilhosVoo, emendarLoop, recortarCanal, recortePasso, fasesDeContato, pisadasEntre, SINTESE, SONS_ARQUIVO, sintetizarBaque, sintetizarJetpack, FADE_ENTRADA, NAVE_DESCIDA, PASSOS, TAXA_432, fatorCristais, eventosNave, somNaveInicial, SONS, cadenciaPasso, criarLimiteVozes, fatorLeito, lerPrefs, urlDoSom, type NomeSom } from "./audio";

describe("áudio do cyberespaço", () => {
  it("os 29 sons de arquivo existem (22 .ogg + o jato, a batida de asa, a água do Droid e os 4 da moto — motor, carburador e boost — em .wav) e os sintetizados têm gerador em public/assets/sounds/cyber e cada um tem modo (posicional × 2D)", () => {
    const arquivos = readdirSync(join(process.cwd(), "public/assets/sounds/cyber")).filter((f) => /\.(ogg|wav)$/.test(f)).sort();
    expect(SONS_ARQUIVO.map((n) => urlDoSom(n).split("/").pop()!).sort()).toEqual(arquivos);
    expect(arquivos).toHaveLength(29);
    for (const n of Object.keys(SONS) as NomeSom[]) if (SONS[n].sintetico) expect(SINTESE[n]).toBeTypeOf("function");
    expect(Object.keys(SONS)).not.toContain("whoosh-hyperspace");   // trocado pelo cyber-enter
    expect(urlDoSom("ship-flight")).toBe("/assets/sounds/cyber/ship-flight.ogg");
  });
  it("sem fogo nem sentar: a base fica só com os cristais; entrar no cyberespaço não dispara 'sentar'", () => {
    expect(Object.keys(SONS)).not.toContain("fire");
    expect(Object.keys(SONS)).not.toContain("sit");
    expect(FADE_ENTRADA).toBeGreaterThan(0.5);
  });
  it("leito e UI são 2D; fontes do mundo e a nave são posicionais", () => {
    const d2: NomeSom[] = ["space-bed", "cyber-enter", "study-confirm", "chat-pop", "corrida-bip", "corrida-largada", "corrida-portao", "corrida-boost", "corrida-volta", "corrida-fim"];   // (os da corrida são do HUD)
    for (const [n, s] of Object.entries(SONS)) expect(s.modo).toBe(d2.includes(n as NomeSom) ? "2d" : "pos");
    for (const n of ["ship-flight", "ship-idle", "space-bed", "blackhole-hum", "crystals"] as NomeSom[]) expect(SONS[n].loop).toBe(true);
  });
  it("preferências: ligado por padrão, '0' desliga; volume mestre 0..1 (padrão 0,8)", () => {
    expect(lerPrefs(() => null)).toEqual({ ligado: true, volume: 0.8 });
    const m = new Map([["zaeon_sfx", "0"], ["zaeon_volume", "1.7"]]);
    expect(lerPrefs((k) => m.get(k) ?? null)).toEqual({ ligado: false, volume: 1 });
    expect(lerPrefs(() => { throw new Error("bloqueado"); })).toEqual({ ligado: true, volume: 0.8 });
  });
  it("teto de vozes: não passa de 12 one-shots simultâneos", () => {
    const v = criarLimiteVozes(12);
    for (let i = 0; i < 12; i++) expect(v.pegar()).toBe(true);
    expect(v.pegar()).toBe(false); v.soltar(); expect(v.pegar()).toBe(true);
  });
  it("distância: some longe; a nave de quem pilota quase não paneia", () => {
    expect(DISTANCIA.padrao.max).toBeGreaterThan(DISTANCIA.padrao.ref);
    expect(DISTANCIA.naveLocal.rolloff).toBeLessThan(DISTANCIA.grande.rolloff);
  });
  it("passos alternam 3 arquivos; correndo, mais rápido", () => {
    expect(PASSOS).toEqual(["step-1", "step-2", "step-3"]);
    expect(cadenciaPasso(true)).toBeLessThan(cadenciaPasso(false));
  });
  it("leito ambiente: abaixa com a música da intro tocando, sobe no fade (cross-fade)", () => {
    expect(fatorLeito("tocando")).toBeLessThan(fatorLeito("fade"));
    expect(fatorLeito("fade")).toBeLessThan(fatorLeito("parado"));
  });
  it("nave: SUBIR = decolagem; começar a DESCER = motor baixando (1×); tocar o chão = touchdown (1×)", () => {
    const dt = 1 / 60; let e = somNaveInicial(true);
    const passo = (pousado: boolean, vy: number, altura: number) => { const r = eventosNave(e, { pousado, vy, altura }, dt); e = r.e; return r; };
    expect(passo(false, 10, 1).decolou).toBe(true);
    for (let i = 0; i < 120; i++) expect(passo(false, 20, 10 + i).desceu).toBe(false);   // subindo: nada
    const des = [] as boolean[]; for (let i = 0; i < 90; i++) des.push(passo(false, -30, 60 - i * 0.5).desceu);
    expect(des.filter(Boolean)).toHaveLength(1);                                        // começou a descer: uma vez só
    expect(passo(false, -6, 10).desceu).toBe(false);                                    // histerese: ainda descendo, sem repetir
    expect(passo(true, 0, 0).pousou).toBe(true);
    expect(passo(true, 0, 0).pousou).toBe(false);                                       // o impacto é 1× só
    // pertinho do chão não dispara a "descida" (só o touchdown)
    e = somNaveInicial(false); expect(passo(false, -20, NAVE_DESCIDA.alturaMin - 1).desceu).toBe(false);
  });
  it("nave: ajustar a altura sobe/desce/sobe não repete a descida antes do intervalo", () => {
    const dt = 0.1; let e = somNaveInicial(false), n = 0;
    for (let i = 0; i < 20; i++) { const vy = i % 4 < 2 ? -20 : 15; const r = eventosNave(e, { pousado: false, vy, altura: 50 }, dt); e = r.e; if (r.desceu) n++; }
    expect(n).toBeLessThanOrEqual(Math.ceil((20 * dt) / NAVE_DESCIDA.intervalo) + 1);
  });
  it("leito em 432 Hz: a faixa (A=440) toca a 432/440 → −31,8 cents", () => {
    expect(SONS["space-bed"].taxa).toBe(TAXA_432);
    expect(SONS["space-bed"].volume).toBeLessThanOrEqual(0.1);   // som de fundo = ambiente (baixo)
    expect(1200 * Math.log2(TAXA_432)).toBeCloseTo(-31.8, 1);
  });
  it("cristais: só perto da base (somem de verdade longe); passos mais altos", () => {
    expect(fatorCristais(0)).toBe(1); expect(fatorCristais(CRISTAIS_PERTO.cheio)).toBe(1);
    expect(fatorCristais(CRISTAIS_PERTO.some)).toBe(0); expect(fatorCristais(40)).toBe(0);
    expect(fatorCristais(8)).toBeGreaterThan(0); expect(fatorCristais(8)).toBeLessThan(1);
    expect(DISTANCIA.cristais.modelo).toBe("linear");   // no "inverse" o max não corta
    expect(SONS["step-1"].volume).toBeGreaterThan(0.2);
    expect(DISTANCIA.eu.ref).toBeGreaterThan(DISTANCIA.perto.ref);   // meus passos não somem com a câmera atrás
  });
  it("jato sintetizado: loop sem clique (a ponta casa com o começo), sem estourar", () => {
    const sr = 22050, x = sintetizarJetpack(sr, 2);
    expect(x.length).toBe(sr * 2);
    let pico = 0, soma = 0; for (const v of x) { pico = Math.max(pico, Math.abs(v)); soma += v * v; }
    expect(pico).toBeLessThanOrEqual(0.81); expect(Math.sqrt(soma / x.length)).toBeGreaterThan(0.05);
    expect(Math.abs(x[x.length - 1]! - x[0]!)).toBeLessThan(0.15);   // emenda: o último encosta no primeiro
  });
  it("baque: curto, grave, começa e termina sem clique", () => {
    const sr = 22050, x = sintetizarBaque(sr);
    expect(x.length).toBe(Math.round(sr * 0.5)); expect(Math.abs(x[0]!)).toBeLessThan(0.1); expect(Math.abs(x[x.length - 1]!)).toBeLessThan(0.01);
    let cruz = 0; for (let i = 1; i < x.length; i++) if ((x[i - 1]! < 0) !== (x[i]! < 0)) cruz++;
    expect(cruz / 0.5).toBeLessThan(400);   // grave (poucos cruzamentos por segundo)
  });
  it("loop sem emenda: a ponta entra no começo e o fim casa com o início", () => {
    const n = 4000, d = new Float32Array(n); for (let i = 0; i < n; i++) d[i] = Math.sin(i * 0.37) * (0.3 + 0.7 * i / n);   // não-periódico, sobe de nível
    const x = 400, o = emendarLoop(d, x);
    expect(o.length).toBe(n - x);
    expect(Math.abs(o[o.length - 1]! - d[n - x - 1]!)).toBeLessThan(1e-6);   // o fim é o original…
    expect(Math.abs(o[0]! - d[n - x]!)).toBeLessThan(1e-6);                 // …e o começo continua dele (sem salto)
  });
  it("passo no compasso do pé: as fases de contato saem da animação; o relógio cruzando a fase = 1 pisada (qualquer fps)", () => {
    const N = 64, pe = (desl: number) => Array.from({ length: N }, (_, i) => 0.13 + 0.2 * Math.max(0, Math.sin(((i / N + desl) % 1) * Math.PI * 2)));
    const fases = fasesDeContato([pe(0), pe(0.5)]);
    expect(fases).toHaveLength(2);   // UMA pisada por pé por ciclo (o começo do apoio)
    expect(fasesDeContato([pe(0).map((v, i) => v + (i % 2) * 0.004)])).toHaveLength(1);   // tremidinha no apoio não vira passo extra
    const contar = (fps: number, seg: number, ciclo: number) => { let u = 0, n = 0; const dt = 1 / fps; for (let t = 0; t < seg; t += dt) { const nu = (u + dt / ciclo) % 1; n += pisadasEntre(u, nu, fases); u = nu; } return n; };
    const a60 = contar(60, 10, 1.1), a12 = contar(12, 10, 1.1);
    expect(a60).toBe(a12);                       // 60 fps e 12 fps: o MESMO número de passos
    expect(Math.abs(a60 - (10 / 1.1) * 2)).toBeLessThanOrEqual(1);   // 2 passos por ciclo
    expect(pisadasEntre(0.9, 0.1, [0.05, 0.95])).toBe(2);   // a volta do ciclo conta
    expect(SONS["step-1"].volume).toBeLessThanOrEqual(0.35); expect(SONS["step-1"].filtro).toBeGreaterThan(0);
  });
});


describe("recorte do passo (sincronia correndo)", () => {
  const sr = 44100, ms = (x: number) => Math.round((x / 1000) * sr);
  // respiro fraco até 60 ms, BATIDA principal aos 70 ms, e uma 2ª batida aos 260 ms (como o step-1)
  const sinal = () => {
    const d = new Float32Array(ms(347));
    for (let i = 0; i < ms(60); i++) d[i] = 0.03 * Math.sin(i * 0.3);
    for (let i = ms(66); i < ms(110); i++) d[i] = Math.sin(i * 0.5) * Math.exp(-(i - ms(70)) / ms(15));
    for (let i = ms(258); i < ms(290); i++) d[i] = 0.7 * Math.sin(i * 0.5) * Math.exp(-(i - ms(260)) / ms(10));
    return d;
  };
  it("começa logo antes do ataque da batida principal (sem o respiro) e acaba antes da 2ª batida", () => {
    const r = recortePasso(sinal(), sr);
    expect(r.ini).toBeGreaterThan(ms(58)); expect(r.ini).toBeLessThan(ms(70));
    expect(r.ini + r.n).toBeLessThan(ms(258));
  });
  it("aplica sem estalo: entra e sai do zero", () => {
    const d = sinal(), r = recortePasso(d, sr), o = recortarCanal(d, r, sr);
    expect(o.length).toBe(r.n);
    expect(Math.abs(o[0]!)).toBeLessThan(1e-6); expect(Math.abs(o[o.length - 1]!)).toBeLessThan(1e-3);
  });
  it("passo curtinho (menor que a janela) não estoura o buffer", () => {
    const d = new Float32Array(ms(80)); d[ms(10)] = 1;
    const r = recortePasso(d, sr); expect(r.ini + r.n).toBeLessThanOrEqual(d.length);
  });
  it("os 3 passos são recortados", () => {
    for (const n of PASSOS) expect(SONS[n].recortar).toBe(true);
  });
});

describe("som de subir/descer da nave: 1× no começo da ação", () => {
  const dt = 1 / 60;
  it("segurar o botão toca UMA vez (não repete enquanto segura)", () => {
    let e = gatilhoVooInicial(), n = 0;
    for (let i = 0; i < 300; i++) { const r = gatilhosVoo(e, { subindo: true, descendo: false }, dt); e = r.e; if (r.sobe) n++; }
    expect(n).toBe(1);
  });
  it("apertar/soltar rápido (ajuste de altura) não reinicia o som antes do intervalo; depois dele, toca de novo", () => {
    let e = gatilhoVooInicial(), n = 0, t = 0;
    const passo = (on: boolean) => { const r = gatilhosVoo(e, { subindo: false, descendo: on }, dt); e = r.e; t += dt; if (r.desce) n++; };
    for (let k = 0; k < 4; k++) { for (let i = 0; i < 6; i++) passo(true); for (let i = 0; i < 6; i++) passo(false); }   // 4 toques em 0,8 s
    expect(n).toBe(1);
    while (t < GATILHO_VOO.esfria + 0.1) passo(false);
    passo(true); expect(n).toBe(2);
  });
  it("subir e descer são independentes", () => {
    let e = gatilhoVooInicial();
    let r = gatilhosVoo(e, { subindo: true, descendo: false }, dt); e = r.e; expect(r.sobe).toBe(true);
    r = gatilhosVoo(e, { subindo: false, descendo: true }, dt); expect(r.desce).toBe(true);
  });
  it("os arquivos de subir/descer são one-shot (nada de loop)", () => {
    expect(SONS["ship-takeoff"].loop).toBe(false); expect(SONS["ship-landing"].loop).toBe(false);
    expect(SONS["ship-takeoff"].emendar).toBeUndefined(); expect(SONS["ship-landing"].emendar).toBeUndefined();
  });
});
