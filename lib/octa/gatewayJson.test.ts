import { describe, expect, it, vi } from "vitest";
import { extrairJson, gatewayJson, gatewayJsonConfigurado } from "@/lib/octa/gatewayJson";

const ENV = { GATEWAY_URL: "http://gw:4000", GATEWAY_MASTER_KEY: "sk-master" };
const resp = (status: number, body: unknown) =>
  ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) }) as unknown as Response;
const chat = (content: string) => resp(200, { choices: [{ message: { content } }] });

describe("extrairJson — tolerante a cerca e texto em volta", () => {
  it("JSON puro", () => expect(extrairJson('{"a":1}')).toEqual({ a: 1 }));
  it("com cerca ```json", () => expect(extrairJson('```json\n{"a":1}\n```')).toEqual({ a: 1 }));
  it("objeto no meio de texto", () => expect(extrairJson('aqui está: {"a":[1,2]} pronto')).toEqual({ a: [1, 2] }));
  it("chave com } dentro de string não confunde o balanceamento", () => {
    expect(extrairJson('{"t":"a } b","n":2}')).toEqual({ t: "a } b", n: 2 });
  });
  it("sem JSON → null", () => expect(extrairJson("nada aqui")).toBeNull());
});

describe("gatewayJson", () => {
  it("manda model + Bearer master e devolve o objeto", async () => {
    const f = vi.fn(async () => chat('{"titulo":"ok"}'));
    const r = await gatewayJson<{ titulo: string }>("sys", "usr", { model: "claude-sonnet", env: ENV, fetchImpl: f as any });
    expect(r).toEqual({ titulo: "ok" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://gw:4000/v1/chat/completions");
    expect((init.headers as any).Authorization).toBe("Bearer sk-master");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("claude-sonnet");
    expect(body.stream).toBe(false);
  });

  it("sem gateway configurado → lança (o chamador cai no Gemini)", async () => {
    await expect(gatewayJson("s", "u", { model: "claude-sonnet", env: {} })).rejects.toThrow(/gateway não configurado/);
  });

  it("HTTP de erro → lança", async () => {
    const f = vi.fn(async () => resp(500, { error: "boom" }));
    await expect(gatewayJson("s", "u", { model: "x", env: ENV, fetchImpl: f as any })).rejects.toThrow(/gateway HTTP 500/);
  });

  it("conteúdo sem JSON → lança", async () => {
    const f = vi.fn(async () => chat("desculpe, não consigo"));
    await expect(gatewayJson("s", "u", { model: "x", env: ENV, fetchImpl: f as any })).rejects.toThrow(/não devolveu JSON/);
  });

  it("gatewayJsonConfigurado reflete GATEWAY_URL + master", () => {
    expect(gatewayJsonConfigurado(ENV)).toBe(true);
    expect(gatewayJsonConfigurado({ GATEWAY_URL: "http://gw:4000" })).toBe(false);
  });
});
