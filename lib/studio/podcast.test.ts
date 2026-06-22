import { describe, it, expect } from "vitest";
import {
  defaultHosts,
  buildOutlinePrompt,
  buildTranscriptPrompt,
  normalizeOutline,
  normalizeTranscript,
  assembleSpeakerText,
  chunkTurnsForTTS,
} from "@/lib/studio/podcast";

describe("defaultHosts", () => {
  it("retorna 2 hosts (A feminina, B masculino) com nomes configuráveis", () => {
    const [a, b] = defaultHosts({ hostA: "Ana", hostB: "Léo" });
    expect(a).toMatchObject({ id: "A", name: "Ana", gender: "f" });
    expect(b).toMatchObject({ id: "B", name: "Léo", gender: "m" });
  });
  it("usa nomes padrão quando vazios", () => {
    const [a, b] = defaultHosts({ hostA: "  " });
    expect(a.name).toBe("Marina");
    expect(b.name).toBe("Téo");
  });
});

describe("prompts", () => {
  const hosts = defaultHosts();
  it("outline pede JSON e respeita nº de segmentos pela duração", () => {
    const p = buildOutlinePrompt("conteúdo", hosts, { durationMin: 5 });
    expect(p.system).toMatch(/5 segmentos/);
    expect(p.system).toMatch(/segments/);
    expect(p.user).toContain("conteúdo");
  });
  it("transcript injeta os nomes dos hosts e o esboço", () => {
    const p = buildTranscriptPrompt("conteúdo", [{ name: "Intro", description: "abertura", size: "short" }], hosts);
    expect(p.system).toContain(hosts[0].name);
    expect(p.system).toContain(hosts[1].name);
    expect(p.user).toContain("Intro");
  });
});

describe("normalizeOutline", () => {
  it("aceita variantes e default de size", () => {
    const segs = normalizeOutline({ segmentos: [{ nome: "A", descricao: "d" }, { name: "B", size: "long", description: "d2" }] });
    expect(segs).toEqual([
      { name: "A", description: "d", size: "medium" },
      { name: "B", description: "d2", size: "long" },
    ]);
  });
  it("lança vazio", () => {
    expect(() => normalizeOutline({ segments: [] })).toThrow();
  });
});

describe("normalizeTranscript", () => {
  const hosts = defaultHosts({ hostA: "Ana", hostB: "Léo" });
  it("mapeia speaker pro host por nome e alterna sem match", () => {
    const turns = normalizeTranscript(
      {
        transcript: [
          { speaker: "Ana", dialogue: "oi" },
          { speaker: "Apresentador desconhecido", dialogue: "tudo bem?" }, // sem match → alterna (índice 1 → Léo)
          { name: "Léo", text: "vamos lá" },
        ],
      },
      hosts,
    );
    expect(turns).toEqual([
      { speaker: "Ana", text: "oi" },
      { speaker: "Léo", text: "tudo bem?" },
      { speaker: "Léo", text: "vamos lá" },
    ]);
  });
  it("lança vazio", () => {
    expect(() => normalizeTranscript({ transcript: [{ speaker: "Ana", dialogue: "" }] }, hosts)).toThrow();
  });
});

describe("assembleSpeakerText / chunkTurnsForTTS", () => {
  const turns = [
    { speaker: "Ana", text: "um" },
    { speaker: "Léo", text: "dois" },
    { speaker: "Ana", text: "três" },
  ];
  it("monta texto rotulado", () => {
    expect(assembleSpeakerText(turns)).toBe("Ana: um\nLéo: dois\nAna: três");
  });
  it("quebra em blocos sem cortar turno", () => {
    const chunks = chunkTurnsForTTS(turns, 12); // "Ana: um"=7, "Léo: dois"=9...
    expect(chunks.length).toBeGreaterThan(1);
    // cada bloco preserva turnos inteiros
    for (const c of chunks) expect(c).toMatch(/^(Ana|Léo): /);
    expect(chunks.join("\n")).toBe(assembleSpeakerText(turns));
  });
  it("um único bloco quando cabe", () => {
    expect(chunkTurnsForTTS(turns, 9999)).toEqual([assembleSpeakerText(turns)]);
  });
});
