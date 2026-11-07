import { describe, expect, it } from "vitest";
import { agenteDoChat } from "@/lib/agents/agenteEscolhido";

describe("o agente que fala no chat", () => {
  it("devolve quem foi escolhido", () => {
    expect(agenteDoChat("zenita")).toBe("zenita");
    expect(agenteDoChat("nina")).toBe("nina");
    expect(agenteDoChat("aura")).toBe("aura");
  });

  it("nada salvo, ou id que não existe mais, cai na Aura (nunca erro)", () => {
    expect(agenteDoChat(null)).toBe("aura");
    expect(agenteDoChat(undefined)).toBe("aura");
    expect(agenteDoChat("")).toBe("aura");
    expect(agenteDoChat("mentor-que-saiu")).toBe("aura");
  });

  it("o Octa abre a IDE: no chat quem fala é a Aura", () => {
    expect(agenteDoChat("octa")).toBe("aura");
  });
});
