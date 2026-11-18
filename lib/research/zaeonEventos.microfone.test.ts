// @vitest-environment jsdom
/** #756 · o microfone espera a avatar congelar na pose de pensativa — mas nunca para sempre. */
import { describe, it, expect, vi, afterEach } from "vitest";
import { avisarMicrofone, EVT_ZAEON_MICROFONE, type DetalheMicrofone } from "./zaeonEventos";

const ouvintes: ((e: Event) => void)[] = [];
const ouvir = (f: (d: DetalheMicrofone) => void) => { const h = (e: Event) => f((e as CustomEvent<DetalheMicrofone>).detail); ouvintes.push(h); window.addEventListener(EVT_ZAEON_MICROFONE, h); };
afterEach(() => { ouvintes.splice(0).forEach((h) => window.removeEventListener(EVT_ZAEON_MICROFONE, h)); vi.useRealTimers(); });

describe("#756 · avisarMicrofone", () => {
  it("sem avatar na tela (ninguém escuta): liga na hora", async () => {
    const t0 = Date.now();
    await avisarMicrofone(true);
    expect(Date.now() - t0).toBeLessThan(50);
  });
  it("com a avatar: espera ela dizer que congelou", async () => {
    let congelou!: () => void, ligado: boolean | null = null;
    ouvir((d) => { ligado = d.ligado; d.esperar.push(new Promise<void>((r) => { congelou = r; })); });
    let pronto = false;
    const p = avisarMicrofone(true).then(() => { pronto = true; });
    await Promise.resolve();
    expect(ligado).toBe(true);
    expect(pronto).toBe(false);
    congelou(); await p;
    expect(pronto).toBe(true);
  });
  it("a avatar travou: o microfone liga mesmo assim no teto", async () => {
    vi.useFakeTimers();
    ouvir((d) => { d.esperar.push(new Promise<void>(() => {})); });
    let pronto = false;
    const p = avisarMicrofone(true, 1800).then(() => { pronto = true; });
    await vi.advanceTimersByTimeAsync(1700);
    expect(pronto).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    await p;
    expect(pronto).toBe(true);
  });
  it("desligar avisa e não espera nada", async () => {
    const vistos: boolean[] = [];
    ouvir((d) => { vistos.push(d.ligado); d.esperar.push(new Promise<void>(() => {})); });
    await avisarMicrofone(false);
    expect(vistos).toEqual([false]);
  });
});

describe("#756 · a avatar congela pensativa (ZaeonDocumentos)", () => {
  it("no painel: pose de pensar, espera, congela; ao desligar volta a desenhar e aos sinais de verdade", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const fonte = readFileSync(path.resolve(__dirname, "../../components/research/ZaeonDocumentos.tsx"), "utf8");
    expect(fonte).toContain("window.addEventListener(EVT_ZAEON_MICROFONE, aoMicrofone)");
    expect(fonte).toContain("window.removeEventListener(EVT_ZAEON_MICROFONE, aoMicrofone)");
    expect(fonte).toMatch(/tipo: "gesto", nome: GESTO_DO_MICROFONE/);                       // #764: a mão na cabeça
    expect(fonte).toMatch(/visivel: naTela && !document\.hidden && !microfone/);             // congelada enquanto o microfone ouve
    expect(fonte).toMatch(/tipo: "sinais", lendo: lendoRef\.current, escrevendo: gerandoRef\.current/);  // volta ao que era
  });

  it("#764 · congela com a mão NA cabeça: no meio do trecho em que o cotovelo do fidget_hair está todo dobrado", async () => {
    const { POSE_PENSATIVA_MS, GESTO_DO_MICROFONE } = await import("@/components/research/ZaeonDocumentos");
    const { TETO_ESPERA_AVATAR_MS } = await import("./zaeonEventos");
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const clipe = JSON.parse(readFileSync(path.resolve(__dirname, `../../public/zaeon/movimento/annie-blender/${GESTO_DO_MICROFONE}.json`), "utf8"));
    const q = clipe.bones.rightLowerArm as number[];
    const dobra = (f: number) => (2 * Math.acos(Math.min(1, Math.abs(q[f * 4 + 3]))) * 180) / Math.PI;
    const quadro = Math.round((POSE_PENSATIVA_MS / 1000) * clipe.fps);
    expect(dobra(quadro)).toBeGreaterThan(135);                    // a mão está lá em cima (o cotovelo em repouso: ~60°)
    expect(POSE_PENSATIVA_MS).toBeLessThan(TETO_ESPERA_AVATAR_MS); // o microfone não espera o teto à toa
  });
});
