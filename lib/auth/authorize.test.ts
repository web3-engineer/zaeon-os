/** #686: o login por e-mail só entra — e só cria conta — com o código certo. */
import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  conferir: vi.fn(),
  users: { findOne: vi.fn(), insertOne: vi.fn(), updateOne: vi.fn() },
}));
vi.mock("@/src/lib/db", () => ({ clientPromise: Promise.resolve({ db: () => ({ collection: () => m.users }) }) }));
vi.mock("@auth/mongodb-adapter", () => ({ MongoDBAdapter: () => ({}) }));
vi.mock("@/lib/auth/codigoLogin", () => ({ colecaoCodigos: async () => ({}), conferirCodigo: m.conferir }));
vi.mock("@/lib/solana/wallet", () => ({ ensureCustodialWallet: async () => ({ address: null, reason: "teste" }) }));
import { authOptions } from "@/src/lib/auth";

type Authorize = (c: Record<string, string> | undefined) => Promise<unknown>;
const authorize = () => {
  const p = authOptions.providers.find((x) => x.id === "credentials") as unknown as { options: { authorize: Authorize } };
  return p.options.authorize;
};

beforeEach(() => {
  m.conferir.mockReset();
  for (const f of Object.values(m.users)) f.mockReset();
  m.users.insertOne.mockResolvedValue({ insertedId: { toString: () => "u-nova" } });
});

describe("authorize do login por e-mail", () => {
  it("sem o código certo, não entra numa conta que existe", async () => {
    m.conferir.mockResolvedValue(false);
    m.users.findOne.mockResolvedValue({ _id: { toString: () => "u1" }, email: "ana@zaeon.com", role: "student" });
    expect(await authorize()({ email: "ana@zaeon.com", codigo: "000000" })).toBeNull();
    expect(await authorize()({ email: "ana@zaeon.com" })).toBeNull();
  });
  it("sem o código certo, não cria conta", async () => {
    m.conferir.mockResolvedValue(false);
    m.users.findOne.mockResolvedValue(null);
    expect(await authorize()({ email: "nova@zaeon.com", codigo: "123456" })).toBeNull();
    expect(m.users.insertOne).not.toHaveBeenCalled();
  });
  it("com o código certo, entra", async () => {
    m.conferir.mockResolvedValue(true);
    m.users.findOne.mockResolvedValue({ _id: { toString: () => "u1" }, email: "ana@zaeon.com", name: "Ana", role: "student" });
    expect(await authorize()({ email: "Ana@Zaeon.com", codigo: "123456" })).toMatchObject({ id: "u1", email: "ana@zaeon.com" });
    expect(m.conferir).toHaveBeenCalledWith({}, "ana@zaeon.com", "123456");
  });
});
