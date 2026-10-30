// @vitest-environment jsdom
import { it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import ReaProofPanel from "./ReaProofPanel";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("keeps the pilot controls disabled without a project", () => {
  render(<ReaProofPanel projectId={null} />);
  expect(
    (
      screen.getByRole("button", {
        name: "Analisar APK piloto",
        hidden: true,
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(screen.getByText(/Abra um projeto/)).toBeTruthy();
});
it("shows separate analysis, success memory and remote states from the server", async () => {
  const proof = {
    id: "run",
    state: "verified",
    artifactSha256: "a".repeat(64),
    verified: true,
    memory: { id: "lesson", revision: 1 },
    overmind: "pending",
    facts: { internetDeclared: false },
    checks: [{ id: "artifact", pass: true, detail: "matched" }],
    evidence: [
      { id: "e", sha256: "b".repeat(64), coverage: "complete", bytes: 10 },
    ],
    limitations: ["APK não executado."],
  };
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ proofs: [proof] }) }),
  );
  render(<ReaProofPanel projectId={"a".repeat(24)} />);
  fireEvent.click(screen.getByText("Provas de APK · REA"));
  await waitFor(() => expect(screen.getByText("Verificado")).toBeTruthy());
  expect(screen.getByText(/Memória registrada/)).toBeTruthy();
  expect(screen.getByText(/Overmind: pendente/)).toBeTruthy();
  expect(screen.queryByText(/avaliação concluída/)).toBeNull();
});
