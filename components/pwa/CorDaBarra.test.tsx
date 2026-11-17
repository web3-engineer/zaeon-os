// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

const tema = { resolvedTheme: "dark" as string | undefined };
vi.mock("next-themes", () => ({ useTheme: () => tema }));

describe("CorDaBarra (#841)", () => {
  afterEach(() => { cleanup(); document.head.innerHTML = ""; });

  it("a barra de status acompanha o tema da Zaeon", async () => {
    const { CorDaBarra, COR_CLARA, COR_ESCURA } = await import("./CorDaBarra");
    const meta = document.createElement("meta"); meta.name = "theme-color"; meta.content = COR_ESCURA;
    document.head.appendChild(meta);
    tema.resolvedTheme = "light";
    const { rerender } = render(<CorDaBarra />);
    expect(meta.content).toBe(COR_CLARA);
    tema.resolvedTheme = "dark";
    rerender(<CorDaBarra />);
    expect(meta.content).toBe(COR_ESCURA);
  });
});
