// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import ConvitesBoard from "./ConvitesBoard";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("convites do board", () => {
  it("opens an accepted board for the invited person", async () => {
    const abrir = vi.fn();
    const fetcher = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/api/estudos/convites") return { ok: true, json: async () => ({ convites: [{ id: "i", boardId: "b", titulo: "Biologia", de: "Ana", papel: "editor" }] }) };
      if (url === "/api/estudos/convites/i" && options?.method === "POST") return { ok: true };
      throw new Error(`Unexpected request ${url}`);
    });
    vi.stubGlobal("fetch", fetcher);
    render(<ConvitesBoard boardId="meu" dono={false} abrir={abrir} />);
    fireEvent.click(await screen.findByRole("button", { name: /pessoas/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Aceitar" }));
    await waitFor(() => expect(abrir).toHaveBeenCalledWith("b"));
    expect(JSON.parse(fetcher.mock.calls[1]![1]!.body as string)).toEqual({ aceitar: true });
  });
});
