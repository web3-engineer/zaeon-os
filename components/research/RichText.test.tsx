// @vitest-environment jsdom
/** G6 (Fatia 7): texto de agente NUNCA vira <img> no render — imagem remota é canal de exfiltração. */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import RichText from "./RichText";

afterEach(() => cleanup());

describe("RichText — sem imagem remota", () => {
  it("![x](url) e <img src> renderizam como TEXTO, nunca <img>", () => {
    const { container } = render(<RichText text={'veja ![x](https://evil/p.png?d=1) e <img src="https://evil/q.png"> **forte**'} />);
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(container.textContent).toContain("![x](https://evil/p.png?d=1)");
    expect(container.textContent).toContain('<img src="https://evil/q.png">');
    expect(container.querySelector("strong, b")?.textContent).toBe("forte");
  });
  it("HTML não é interpretado (sem script/iframe no DOM)", () => {
    const { container } = render(<RichText text={"<script>alert(1)</script><iframe src='x'></iframe>"} />);
    expect(container.querySelectorAll("script, iframe")).toHaveLength(0);
  });
});
