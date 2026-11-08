import { describe, it, expect, vi } from "vitest";

// índice de avatares vivos fixo no teste (o real cresce conforme o estúdio salva agentes)
vi.mock("@/public/avatars/index.json", () => ({ default: { agentes: { aura: { estados: { idle: "/avatars/aura/idle.webp?v=t" } } } } }));
import { rosterBase, rosterComMentores, mergeProfiles, inicial, isAgentKey, publicView } from "./roster";
import { PERSONAS } from "@/lib/ai/personas";
import { MENTOR_SEED } from "@/lib/agent/mentors";

describe("roster · base", () => {
  it("junta personas + os mentores do seed, chaves únicas", () => {
    const r = rosterBase();
    expect(r.length).toBe(Object.keys(PERSONAS).length + MENTOR_SEED.length);
    expect(new Set(r.map((a) => a.agentKey)).size).toBe(r.length);
    expect(r.find((a) => a.agentKey === "aura")?.tipo).toBe("persona");
    expect(r.find((a) => a.agentKey === "medicina")?.tipo).toBe("mentor");
  });
  it("personas da casa têm foto padrão (idle do avatar vivo quando existe); silenciosos não conversam", () => {
    const r = rosterBase();
    expect(r.find((a) => a.agentKey === "aura")?.avatarPadrao).toBe("/avatars/aura/idle.webp?v=t");
    expect(r.find((a) => a.agentKey === "zaeon")?.avatarPadrao).toBe("/agents/bento.png");
    expect(r.find((a) => a.agentKey === "abnt_structurer")?.conversacional).toBe(false);
    expect(r.find((a) => a.agentKey === "medicina")?.avatarPadrao).toBeNull();
    expect(r.find((a) => a.agentKey === "medicina")?.curso).toBe("Medicina");
  });
  it("mentores do banco sobrepõem o seed e novos slugs entram", () => {
    const r = rosterComMentores([
      { slug: "medicina", name: "Osler II", course: "Medicina", personaText: "Pensa como clínico. Resto." , order: 1 },
      { slug: "direito", name: "Rui", course: "Direito", personaText: "Jurista.", order: 14 },
    ]);
    expect(r.find((a) => a.agentKey === "medicina")?.nome).toBe("Osler II");
    expect(r.find((a) => a.agentKey === "medicina")?.bio).toBe("Pensa como clínico.");
    expect(r.find((a) => a.agentKey === "direito")?.tipo).toBe("mentor");
  });
});

describe("roster · mergeProfiles", () => {
  it("profile sobrepõe nome/avatar/bio/ativo/ordem; sem profile mantém o roster", () => {
    const v = mergeProfiles(rosterBase(), [
      { agentKey: "aura", nome: "Aura ✨", avatarUrl: "https://x/a.png", bio: "nova bio", ativo: false, ordem: -5 },
      { agentKey: "medicina", avatarUrl: "  " },
    ]);
    const aura = v.find((a) => a.agentKey === "aura")!;
    expect(aura.nome).toBe("Aura ✨");
    expect(aura.avatarUrl).toBe("https://x/a.png");
    expect(aura.bio).toBe("nova bio");
    expect(aura.ativo).toBe(false);
    expect(v[0]!.agentKey).toBe("aura"); // ordem -5 vem primeiro
    const med = v.find((a) => a.agentKey === "medicina")!;
    expect(med.avatarUrl).toBeNull(); // avatar vazio → fallback (sem foto)
    expect(med.nome).toBe("Osler");
    expect(med.ativo).toBe(true);
    const nina = v.find((a) => a.agentKey === "nina")!;
    expect(nina.avatarUrl).toBe("/agents/nina.png"); // sem profile → foto padrão
  });
  it("profile sem roster vira agente custom", () => {
    const v = mergeProfiles(rosterBase(), [{ agentKey: "odonto", tipo: "mentor", nome: "Dentista", bio: "" }]);
    const c = v.find((a) => a.agentKey === "odonto")!;
    expect(c.custom).toBe(true);
    expect(c.tipo).toBe("mentor");
    expect(c.avatarUrl).toBeNull();
    expect(v.filter((a) => a.custom)).toHaveLength(1);
  });
  it("publicView nunca expõe prompt", () => {
    const v = mergeProfiles(rosterBase(), [])[0]!;
    // campos do crachá (Modo CEO) entram; prompt/persona nunca
    expect(Object.keys(publicView(v)).sort()).toEqual(["agentKey", "area", "ativo", "avatarUrl", "bio", "curso", "emoji", "entrega", "nome", "ordem", "redes", "tipo"]);
    expect(JSON.stringify(publicView(v))).not.toMatch(/systemPrompt|personaText/);
  });
  it("crachá editado no Modo CEO sobrepõe o roster (área, entrega, emoji, redes)", () => {
    const v = mergeProfiles(rosterBase(), [{ agentKey: "aura", area: "Pesquisa+", entrega: ["a", "b"], emoji: "🔬", whatsapp: "+5511999998888", instagram: "aura", facebook: null }]).find((a) => a.agentKey === "aura")!;
    expect(v.area).toBe("Pesquisa+");
    expect(v.entrega).toEqual(["a", "b"]);
    expect(v.emoji).toBe("🔬");
    expect(v.redes).toEqual({ whatsapp: "+5511999998888", instagram: "aura", facebook: null });
    const sem = mergeProfiles(rosterBase(), []).find((a) => a.agentKey === "nina")!;
    expect(sem.area).toBeNull();
    expect(sem.entrega).toEqual([]);
  });
});

describe("roster · helpers", () => {
  it("inicial", () => {
    expect(inicial("aura")).toBe("A");
    expect(inicial("")).toBe("⟁");
    expect(inicial(null)).toBe("⟁");
  });
  it("isAgentKey", () => {
    expect(isAgentKey("aura")).toBe(true);
    expect(isAgentKey("eng-computacao")).toBe(true);
    expect(isAgentKey("core_active")).toBe(true);
    expect(isAgentKey("Aura")).toBe(false);
    expect(isAgentKey("a b")).toBe(false);
    expect(isAgentKey("")).toBe(false);
    expect(isAgentKey(12)).toBe(false);
  });
});
