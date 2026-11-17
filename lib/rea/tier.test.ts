import { describe, it, expect } from "vitest";
import { tierDaConta } from "./tier";
import { reaBridgeBase } from "@/lib/octa/rea";

describe("tierDaConta — quem é 'max'", () => {
  it("dono (super admin) e plano Max → max; o resto → users; conta ausente → users", () => {
    expect(tierDaConta({ plan: "max" })).toBe("max");
    expect(tierDaConta({ plan: "free", role: "super_admin" })).toBe("max");
    expect(tierDaConta({ plan: "pro" })).toBe("users");
    expect(tierDaConta({ plan: "plus" })).toBe("users");
    expect(tierDaConta({ plan: "free" })).toBe("users");
    expect(tierDaConta(null)).toBe("users");
  });
  it("plano Max VENCIDO (plus temporário) não é max", () => {
    const ontem = new Date(Date.now() - 86_400_000);
    expect(tierDaConta({ plan: "plus", plusUntil: ontem })).toBe("users");
  });
});

describe("reaBridgeBase — dois motores, um por tier", () => {
  const env = { REA_BRIDGE_URL: "http://primario:8799/", REA_BRIDGE_URL_USERS: "http://usuarios:8798" };
  it("max → primário; users → secundário (sem barra no fim)", () => {
    expect(reaBridgeBase(env, "max")).toBe("http://primario:8799");
    expect(reaBridgeBase(env, "users")).toBe("http://usuarios:8798");
  });
  it("sem a URL dos usuários, todos caem no primário (compat)", () => {
    expect(reaBridgeBase({ REA_BRIDGE_URL: "http://primario:8799" }, "users")).toBe("http://primario:8799");
  });
});
