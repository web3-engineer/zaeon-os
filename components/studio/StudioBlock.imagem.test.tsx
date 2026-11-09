// @vitest-environment jsdom
/** #749 · a imagem volta ao reabrir a conversa: sem o dataUrl (que não fica guardado), ela vem pelo número. */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import StudioBlock from "./StudioBlock";

afterEach(cleanup);

describe("#749 · StudioBlock de imagem", () => {
  it("com dataUrl (acabou de gerar): mostra ele", () => {
    const r = render(<StudioBlock block={{ studioKind: "image", title: "Imagem — x", data: null, dataUrl: "data:image/png;base64,AA", artifactId: "i1" } as any} collapsed={false} />);
    expect(r.container.querySelector("img")!.getAttribute("src")).toBe("data:image/png;base64,AA");
  });
  it("reaberta do servidor (só o número): busca o arquivo", () => {
    const r = render(<StudioBlock block={{ studioKind: "image", title: "Imagem — x", data: null, artifactId: "i1" } as any} collapsed={false} />);
    expect(r.container.querySelector("img")!.getAttribute("src")).toBe("/api/studio/i1/file");
  });
});
