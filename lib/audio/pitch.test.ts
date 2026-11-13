import { describe, it, expect } from "vitest";
import { detectarPitch, notaDeFreq, notaDoBuffer, freqParaMidi } from "./pitch";

const SR = 44100;
/** uma senoide pura de `freq` Hz, `n` amostras, amplitude 0.5. */
function senoide(freq: number, n = 2048, amp = 0.5): Float32Array {
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) b[i] = amp * Math.sin((2 * Math.PI * freq * i) / SR);
  return b;
}

describe("detectarPitch — autocorrelação", () => {
  it("acha a frequência de uma senoide pura (poucos Hz de erro)", () => {
    for (const f of [261.63, 329.63, 440, 523.25]) {
      const d = detectarPitch(senoide(f), SR)!;
      expect(d, `${f}Hz`).not.toBeNull();
      expect(Math.abs(d - f), `${f}Hz → ${d}`).toBeLessThan(3);
    }
  });

  it("silêncio e ruído fraco → null", () => {
    expect(detectarPitch(new Float32Array(2048), SR)).toBeNull();
    const fraco = senoide(440, 2048, 0.002); // abaixo do RMS mínimo
    expect(detectarPitch(fraco, SR)).toBeNull();
  });
});

describe("notaDeFreq — frequência → nota do teclado", () => {
  it("mapeia as frequências de referência pras notas certas, afinadas", () => {
    expect(notaDeFreq(440)).toMatchObject({ id: "A4" });
    expect(Math.abs(notaDeFreq(440)!.cents)).toBeLessThan(2);
    expect(notaDeFreq(261.63)).toMatchObject({ id: "C4" });
    expect(notaDeFreq(329.63)).toMatchObject({ id: "E4" });
    expect(notaDeFreq(277.18)).toMatchObject({ id: "C#4" });
    expect(notaDeFreq(523.25)).toMatchObject({ id: "C5" });
  });

  it("nota desafinada: mesma nota, cents com sinal", () => {
    const acima = notaDeFreq(452)!; // um pouco acima do Lá
    expect(acima.id).toBe("A4");
    expect(acima.cents).toBeGreaterThan(20);
    const abaixo = notaDeFreq(430)!;
    expect(abaixo.id).toBe("A4");
    expect(abaixo.cents).toBeLessThan(-20);
  });

  it("entrada inválida → null", () => {
    expect(notaDeFreq(0)).toBeNull();
    expect(notaDeFreq(Number.NaN)).toBeNull();
  });

  it("freqParaMidi: A4 = 69, A5 = 81", () => {
    expect(Math.round(freqParaMidi(440))).toBe(69);
    expect(Math.round(freqParaMidi(880))).toBe(81);
  });
});

describe("notaDoBuffer — ponta a ponta", () => {
  it("senoide de 440 → A4", () => {
    expect(notaDoBuffer(senoide(440), SR)).toMatchObject({ id: "A4" });
  });
  it("silêncio → null", () => {
    expect(notaDoBuffer(new Float32Array(2048), SR)).toBeNull();
  });
});
