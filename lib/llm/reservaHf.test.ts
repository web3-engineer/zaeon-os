import { describe, it, expect } from "vitest";
import { reservaHfLigada, modelosReservaHf, timeoutReservaHf, erroPedeReserva, modeloSemProvedor, HF_RESERVA_PADRAO, hfPrimario, tierDoModelo, modelosHfPrimario, esforcoHf, HF_PRIMARIO_PADRAO, HF_PRIMARIO_PRO_PADRAO } from "./reservaHf";
import { custoDoAlvoUsd } from "@/lib/ai/preco";

describe("reservaHf — config", () => {
  it("liga só com HF_TOKEN; HF_RESERVA=0/off desliga", () => {
    expect(reservaHfLigada({})).toBe(false);
    expect(reservaHfLigada({ HF_TOKEN: "hf_x" })).toBe(true);
    expect(reservaHfLigada({ HF_TOKEN: "hf_x", HF_RESERVA: "0" })).toBe(false);
    expect(reservaHfLigada({ HF_TOKEN: "hf_x", HF_RESERVA: "off" })).toBe(false);
  });
  it("modelos: Cerebras → Groq por padrão; HF_RESERVA_MODELOS troca a lista", () => {
    expect(modelosReservaHf({})).toEqual([...HF_RESERVA_PADRAO]);
    expect(modelosReservaHf({ HF_RESERVA_MODELOS: " a:x , b " })).toEqual(["a:x", "b"]);
  });
  it("timeout padrão 45 s, configurável", () => {
    expect(timeoutReservaHf({})).toBe(45_000);
    expect(timeoutReservaHf({ HF_RESERVA_TIMEOUT_MS: "20000" })).toBe(20_000);
  });
  it("só o teto de orçamento e o pool esgotado não pedem reserva", () => {
    for (const c of ["rate_limit", "cota_esgotada", "timeout", "provedor_fora", "auth", "modelo_inexistente", "outro"] as const) expect(erroPedeReserva(c)).toBe(true);
    expect(erroPedeReserva("teto")).toBe(false); expect(erroPedeReserva("pool_esgotado")).toBe(false);
  });
  it("modeloSemProvedor tira o :provedor", () => {
    expect(modeloSemProvedor("openai/gpt-oss-120b:cerebras")).toBe("openai/gpt-oss-120b");
    expect(modeloSemProvedor("openai/gpt-oss-120b")).toBe("openai/gpt-oss-120b");
  });
  it("hfPrimario: só com LLM_PRIMARIO=hf E HF_TOKEN; HF_RESERVA=0 desliga também o primário", () => {
    expect(hfPrimario({})).toBe(false);
    expect(hfPrimario({ LLM_PRIMARIO: "hf" })).toBe(false);
    expect(hfPrimario({ HF_TOKEN: "x" })).toBe(false);
    expect(hfPrimario({ HF_TOKEN: "x", LLM_PRIMARIO: "hf" })).toBe(true);
    expect(hfPrimario({ HF_TOKEN: "x", LLM_PRIMARIO: " HuggingFace " })).toBe(true);
    expect(hfPrimario({ HF_TOKEN: "x", LLM_PRIMARIO: "google" })).toBe(false);
    expect(hfPrimario({ HF_TOKEN: "x", LLM_PRIMARIO: "hf", HF_RESERVA: "0" })).toBe(false);
  });
  it("tier: GEMINI_MODEL_PRO (ou *-pro) = pro; o resto = flash", () => {
    expect(tierDoModelo("gemini-2.5-pro", {})).toBe("pro");
    expect(tierDoModelo("gemini-3.1-pro-preview", {})).toBe("pro");
    expect(tierDoModelo("modelo-forte", { GEMINI_MODEL_PRO: "modelo-forte" })).toBe("pro");
    expect(tierDoModelo("gemini-3.5-flash", {})).toBe("flash");
    expect(tierDoModelo("gemini-3.5-flash-lite", {})).toBe("flash");
  });
  it("modelos do primário por tier: defaults gpt-oss Cerebras → Groq; envs trocam", () => {
    expect(modelosHfPrimario("flash", {})).toEqual([...HF_PRIMARIO_PADRAO]);
    expect(modelosHfPrimario("pro", {})).toEqual([...HF_PRIMARIO_PRO_PADRAO]);
    expect(modelosHfPrimario("flash", { HF_PRIMARIO_MODELOS: "a:x, b:y" })).toEqual(["a:x", "b:y"]);
    expect(modelosHfPrimario("pro", { HF_PRIMARIO_MODELOS_PRO: "z:nebius" })).toEqual(["z:nebius"]);
    // só provedores LIGADOS na conta do dono (testado 2026-11-21): nada de baseten/together/novita/fireworks/deepinfra
    for (const m of [...HF_PRIMARIO_PADRAO, ...HF_PRIMARIO_PRO_PADRAO]) expect(m).toMatch(/:(cerebras|groq|nebius|sambanova|google-vertex)$/);
  });
  it("esforço: minimal/low → low, medium/high mantêm; sem nível = low (flash) / medium (pro)", () => {
    expect(esforcoHf("minimal", "flash")).toBe("low");
    expect(esforcoHf("low", "pro")).toBe("low");
    expect(esforcoHf("high", "flash")).toBe("high");
    expect(esforcoHf(undefined, "flash")).toBe("low");
    expect(esforcoHf(undefined, "pro")).toBe("medium");
  });
  it("a reserva é PAGA no ledger (alvo huggingface ≠ pool grátis); pool e Contabo seguem 0", () => {
    const u = { promptTokens: 1_000_000, completionTokens: 1_000_000, cachedTokens: 0 };
    expect(custoDoAlvoUsd("openai/gpt-oss-120b", u, "huggingface")).toBeCloseTo(1.0, 5);
    expect(custoDoAlvoUsd("openai/gpt-oss-20b", u, "groq")).toBe(0);
    expect(custoDoAlvoUsd("zaeon-local-mini", u, "contabo")).toBe(0);
  });
});
