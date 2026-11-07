/**
 * O teste que importa aqui não é o do replace — é o do ACOPLAMENTO. `vozDoTurno` depende de os
 * prompts do harness conterem "Você é a Aura" literalmente. Se alguém reescrever aquela frase, o
 * replace para de casar EM SILÊNCIO e a Zenita volta a responder com a voz da Aura. Então o teste
 * lê o harness de verdade e exige que a marca ainda esteja lá.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MARCA_DE_IDENTIDADE, vozDoTurno } from "@/lib/agents/voz";

const harness = readFileSync(path.resolve(__dirname, "../agent/aura-harness.ts"), "utf8");

describe("a voz do turno", () => {
  it("a marca ainda existe nos prompts do harness (se este teste cair, o replace virou enfeite)", () => {
    const achados = harness.match(MARCA_DE_IDENTIDADE) ?? [];
    // hoje são duas: a fase de raciocínio e a de rascunho. Menos que isso = prompt reescrito.
    expect(achados.length).toBeGreaterThanOrEqual(2);
  });

  it("a Aura não transforma nada (caminho dela intacto)", () => {
    expect(vozDoTurno("Aura")).toBeUndefined();
    expect(vozDoTurno("aura")).toBeUndefined();
    expect(vozDoTurno("")).toBeUndefined();
    expect(vozDoTurno("   ")).toBeUndefined();
  });

  it("troca o nome em TODAS as ocorrências e assina", () => {
    const t = vozDoTurno("Zenita")!;
    const fora = t("Você é a Aura, parceira de estudo. ... Você é a Aura raciocinando.");
    expect(fora).not.toMatch(/Você é a Aura/);
    expect((fora.match(/Você é Zenita/g) ?? []).length).toBe(2);
    expect(fora).toContain("IDENTIDADE DESTE TURNO: você é Zenita (não a Aura)");
  });

  it("aplicada aos prompts REAIS do harness, não sobra nenhuma Aura", () => {
    // os dois prompts, extraídos do arquivo em vez de copiados (copiar deixaria o teste mentir
    // quando o arquivo mudasse)
    const reais = harness.match(/Você é a Aura[^"]*/g) ?? [];
    expect(reais.length).toBeGreaterThanOrEqual(2);
    const t = vozDoTurno("Zenita")!;
    for (const p of reais) expect(t(p)).not.toMatch(/Você é a Aura/);
  });
});
