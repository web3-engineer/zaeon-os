import { describe, it, expect } from "vitest";
import {
  buildVideoScriptPrompt,
  normalizeVideoScript,
  sectionClipArgs,
  concatListContent,
  concatArgs,
} from "@/lib/studio/video";

describe("buildVideoScriptPrompt", () => {
  it("pede JSON com sections e respeita o nº de cenas (3–6)", () => {
    const p = buildVideoScriptPrompt("conteúdo", { sections: 9 });
    expect(p.system).toMatch(/sections/);
    expect(p.system).toMatch(/6 cenas/); // 9 → clamp 6
    expect(p.user).toContain("conteúdo");
  });
});

describe("normalizeVideoScript", () => {
  it("aceita variantes e filtra cenas sem narração", () => {
    const out = normalizeVideoScript({
      cenas: [
        { narracao: "n1", topicos: ["a", "b"], imagem: "img1" },
        { narration: "n2", bullets: ["c"], imagePrompt: "img2" },
        { bullets: ["x"] }, // sem narração → descartada
      ],
    });
    expect(out).toEqual([
      { narration: "n1", bullets: ["a", "b"], imagePrompt: "img1" },
      { narration: "n2", bullets: ["c"], imagePrompt: "img2" },
    ]);
  });
  it("lança vazio", () => {
    expect(() => normalizeVideoScript({ sections: [] })).toThrow();
  });
});

describe("sectionClipArgs", () => {
  it("inclui imagem, áudio, saída e escala com w/h", () => {
    const args = sectionClipArgs({ image: "a.png", audio: "a.wav", out: "o.mp4", width: 640, height: 360 });
    expect(args).toContain("a.png");
    expect(args).toContain("a.wav");
    expect(args[args.length - 1]).toBe("o.mp4");
    expect(args.join(" ")).toMatch(/scale=640:360/);
    expect(args.join(" ")).toMatch(/-loop 1/);
    expect(args.join(" ")).toMatch(/-shortest/);
  });
  it("usa 1280x720 por padrão", () => {
    expect(sectionClipArgs({ image: "i", audio: "a", out: "o" }).join(" ")).toMatch(/scale=1280:720/);
  });
});

describe("concatListContent / concatArgs", () => {
  it("formata a lista do concat demuxer e escapa aspas", () => {
    expect(concatListContent(["/a/1.mp4", "/b/2.mp4"])).toBe("file '/a/1.mp4'\nfile '/b/2.mp4'\n");
    expect(concatListContent(["/x/o'clock.mp4"])).toContain("o'\\''clock");
  });
  it("monta os args do concat com copy", () => {
    const args = concatArgs("/tmp/list.txt", "/out/final.mp4");
    expect(args.join(" ")).toBe("-y -f concat -safe 0 -i /tmp/list.txt -c copy /out/final.mp4");
  });
});
