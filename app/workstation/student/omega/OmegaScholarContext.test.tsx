// @vitest-environment jsdom
/**
 * REGRESSÃO do desktop após mover a rede pra lib/scholar/scholarClient: o provider continua
 * fazendo o mesmo — pesquisa em BG (polla até done → carrega a sessão), inline NDJSON e 401.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor, cleanup } from "@testing-library/react";
import { respostaStream } from "@/lib/chat/test-utils";

vi.mock("@/lib/agents/handoff", () => ({ takeHandoff: () => null }));
vi.mock("@/lib/agents/mission", () => ({ missionDone: () => {} }));
import { OmegaScholarProvider, useOmegaScholar } from "@/app/workstation/student/omega/OmegaScholarContext";

const j = (b: any, status = 200) => new Response(JSON.stringify(b), { status, headers: { "content-type": "application/json" } });
let api: ReturnType<typeof useOmegaScholar>;
function Sonda() { api = useOmegaScholar(); return <div data-testid="s">{api.status}|{api.answer}|{api.phases.map((p) => p.message).join(",")}</div>; }
const montar = () => render(<OmegaScholarProvider><Sonda /></OmegaScholarProvider>);

beforeEach(() => { localStorage.clear(); vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 50 }); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("OmegaScholarProvider (regressão)", () => {
  it("BG: 202 → fases da sessão → done carrega a sessão", async () => {
    let polls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (u: any) => {
      const url = String(u);
      if (url === "/api/ai/scholar") return j({ sessionId: "S1" }, 202);
      if (url === "/api/ai/scholar/sessions") return j({ sessions: [] });
      polls++;
      return polls < 2
        ? j({ session: { status: "running", thread: { events: [{ type: "phase", phase: "planning", message: "Planejando" }] } } })
        : j({ session: { id: "S1", status: "done", query: "luz", thread: { answer: "Resposta final" } } });
    });
    montar();
    await act(async () => { void api.runQuery("luz"); });
    await waitFor(() => expect(screen.getByTestId("s").textContent).toContain("Planejando"), { timeout: 5000 });
    await waitFor(() => expect(screen.getByTestId("s").textContent).toMatch(/^done\|Resposta final/), { timeout: 5000 });
    expect(localStorage.getItem("zaeon.omega.run")).toBeNull();
  });
  it("inline NDJSON continua funcionando", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (u: any) =>
      String(u) === "/api/ai/scholar/sessions" ? j({ sessions: [] }) :
      respostaStream(['{"type":"phase","phase":"a","message":"A"}\n{"type":"answer","text":"R"}\n{"type":"done","session":{"id":"x"}}'], { headers: { "content-type": "application/x-ndjson" } }) as any);
    montar();
    await act(async () => { await api.runQuery("q"); });
    expect(screen.getByTestId("s").textContent).toBe("done|R|A");
  });
  it("401 mostra o gate de login", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (u: any) => (String(u) === "/api/ai/scholar/sessions" ? j({ sessions: [] }) : new Response("no", { status: 401 })));
    montar();
    await act(async () => { await api.runQuery("q"); });
    expect(api.status).toBe("unauthorized");
  });
  it("erro da sessão em BG vira status error com a mensagem do servidor", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (u: any) => {
      const url = String(u);
      if (url === "/api/ai/scholar") return j({ sessionId: "S1" }, 202);
      if (url === "/api/ai/scholar/sessions") return j({ sessions: [] });
      return j({ session: { status: "error", thread: { error: "fontes fora do ar" } } });
    });
    montar();
    await act(async () => { void api.runQuery("q"); });
    await waitFor(() => expect(api.status).toBe("error"), { timeout: 5000 });
    expect(api.error).toBe("fontes fora do ar");
  });
});
