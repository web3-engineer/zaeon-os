/**
 * Pina o infra/litellm.config.yaml lendo como TEXTO (sem lib de yaml): as regras do pool grátis
 * que, violadas, custam dinheiro (§5.10) ou a conta do provedor (§8.11).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const yaml = readFileSync(path.resolve(__dirname, "../../infra/litellm.config.yaml"), "utf8");
/** Só as linhas ativas (comentário fora — o GLM comentado não conta). */
const ativas = yaml.split("\n").filter((l) => !/^\s*#/.test(l)).map((l) => l.replace(/\s+#.*$/, ""));

/** Blocos de deployment: model_name → linhas até o próximo "- model_name" ou seção de topo. */
function deployments(): { nome: string; linhas: string[] }[] {
  const out: { nome: string; linhas: string[] }[] = [];
  let atual: { nome: string; linhas: string[] } | null = null;
  for (const l of ativas) {
    const m = /^\s*-\s*model_name:\s*(\S+)/.exec(l);
    if (m) { atual = { nome: m[1], linhas: [] }; out.push(atual); continue; }
    if (/^\S/.test(l)) atual = null;            // general_settings:, litellm_settings:…
    else if (atual) atual.linhas.push(l);
  }
  return out;
}

const ENV_KEY_DO_PROVEDOR: Record<string, string> = {
  "gemini/": "GEMINI_FREE_API_KEY",
  "cloudflare/": "CLOUDFLARE_API_KEY",
  "groq/": "GROQ_API_KEY",
  "cerebras/": "CEREBRAS_API_KEY",
  "openai/glm": "ZHIPU_API_KEY",
};

describe("infra/litellm.config.yaml — pool grátis", () => {
  const deps = deployments();
  const pool = deps.filter((d) => d.nome.startsWith("zaeon-pool-"));

  it("Vertex intacto: zaeon-flash e zaeon-pro continuam vertex_ai/", () => {
    for (const n of ["zaeon-flash", "zaeon-pro"]) {
      const d = deps.find((x) => x.nome === n);
      expect(d, n).toBeTruthy();
      expect(d!.linhas.join("\n")).toMatch(/model:\s*vertex_ai\//);
    }
  });

  it("os 4 grupos do pool existem (GLM comentado = fora)", () => {
    expect(pool.map((d) => d.nome).sort()).toEqual(["zaeon-pool-cerebras", "zaeon-pool-cf", "zaeon-pool-groq", "zaeon-pool-lite"]);
  });

  it("nenhum vertex_ai/ dentro de grupo zaeon-pool-* (pool nunca é crédito do negócio)", () => {
    for (const d of pool) expect(d.linhas.join("\n"), d.nome).not.toMatch(/vertex_ai\/|vertex_credentials|vertex_project/);
  });

  it("UM deployment por grupo e UMA api_key por provedor (§8.11)", () => {
    const nomes = pool.map((d) => d.nome);
    expect(new Set(nomes).size).toBe(nomes.length);
    // §8.11 é regra dos provedores GRÁTIS de terceiros (uma conta cada). Os zaeon-local-* (Contabo, nossa)
    // dividem a mesma key de propósito — o teste deles está abaixo.
    const porEnv = new Map<string, number>();
    for (const l of pool.flatMap((d) => d.linhas)) {
      const m = /api_key:\s*os\.environ\/(\S+)/.exec(l);
      if (m) porEnv.set(m[1], (porEnv.get(m[1]) ?? 0) + 1);
    }
    for (const [env, n] of porEnv) expect(n, env).toBe(1);
    // e cada deployment do pool usa a env do SEU provedor
    for (const d of pool) {
      const corpo = d.linhas.join("\n");
      const modelo = /model:\s*(\S+)/.exec(corpo)?.[1] ?? "";
      const prefixo = Object.keys(ENV_KEY_DO_PROVEDOR).find((p) => modelo.startsWith(p));
      expect(prefixo, `${d.nome}: provedor de ${modelo}`).toBeTruthy();
      expect(corpo, d.nome).toContain(`api_key: os.environ/${ENV_KEY_DO_PROVEDOR[prefixo!]}`);
    }
  });

  it("nenhuma key literal no arquivo (só os.environ/)", () => {
    for (const l of ativas) {
      const m = /(?:api_key|master_key):\s*(\S+)/.exec(l);
      if (m) expect(m[1], l).toMatch(/^os\.environ\//);
    }
  });

  it("cada deployment do pool tem model_info.id = alvo (header x-litellm-model-id)", () => {
    const esperado: Record<string, string> = { "zaeon-pool-lite": "gemini-free", "zaeon-pool-cerebras": "cerebras", "zaeon-pool-cf": "cloudflare", "zaeon-pool-groq": "groq" };
    for (const d of pool) expect(d.linhas.join("\n"), d.nome).toMatch(new RegExp(`model_info:\\s*\\{\\s*id:\\s*${esperado[d.nome]}\\s*\\}`));
  });

  // as cadeias de fallback: { origem: [destinos] }
  const cadeias = (): Record<string, string[]> => {
    const linha = ativas.find((l) => /^\s*fallbacks:/.test(l))!;
    return Object.assign({}, ...JSON.parse(linha.replace(/^\s*fallbacks:\s*/, "")));
  };

  it("fallback do pool = Cerebras grátis e depois a reserva Google (Groq fora, decisão do dono); o pool NUNCA cai em zaeon-flash/zaeon-pro", () => {
    const c = cadeias();
    expect(c["zaeon-pool-lite"]).toEqual(["zaeon-pool-cerebras", "zaeon-reserva-google"]);
    for (const [origem, destinos] of Object.entries(c)) if (origem.startsWith("zaeon-pool-")) {
      expect(destinos.join(" "), origem).not.toMatch(/zaeon-flash|zaeon-pro/);
      expect(destinos.join(" "), origem).not.toMatch(/zaeon-pool-groq|zaeon-pool-cf/);
    }
  });

  it("o CHAT tem reserva (429 do 3.5-flash): zaeon-flash → reserva Google; zaeon-pro → flash; nunca o pool grátis nem a Contabo", () => {
    const c = cadeias();
    expect(c["zaeon-flash"]).toEqual(["zaeon-reserva-google"]);
    expect(c["zaeon-pro"]?.[0]).toBe("zaeon-flash");
    for (const o of ["zaeon-flash", "zaeon-pro"]) expect((c[o] ?? []).join(" "), o).not.toMatch(/zaeon-pool-|zaeon-local-/);
  });

  it("reserva Google = Vertex flash-lite (o mais barato), com alvo vertex pro ledger contar o custo", () => {
    const d = deps.find((x) => x.nome === "zaeon-reserva-google");
    expect(d).toBeTruthy();
    const corpo = d!.linhas.join("\n");
    expect(corpo).toMatch(/model:\s*vertex_ai\/gemini-[\d.]+-flash-lite\s/);
    expect(corpo).toMatch(/id:\s*vertex\b/);
  });

  it("modelos próprios (Contabo): 4 zaeon-local-*, todos litellm_proxy/ com URL e key só por env, nunca Vertex", () => {
    const locais = deps.filter((d) => d.nome.startsWith("zaeon-local-"));
    expect(locais.map((d) => d.nome).sort()).toEqual(["zaeon-local-coder", "zaeon-local-embed", "zaeon-local-lfm2", "zaeon-local-rerank"]);
    for (const d of locais) {
      const corpo = d.linhas.join("\n");
      expect(corpo, d.nome).toMatch(/model:\s*litellm_proxy\//);
      expect(corpo, d.nome).toContain("api_base: os.environ/CONTABO_LLM_URL");
      expect(corpo, d.nome).toContain("api_key: os.environ/CONTABO_LLM_KEY");
      expect(corpo, d.nome).toMatch(/id:\s*contabo-/);
      expect(corpo, d.nome).not.toMatch(/vertex_ai\/|vertex_credentials/);
    }
  });

  it("modelos próprios fora de qualquer fallback (CPU lento: quem chama escolhe pelo nome)", () => {
    const linha = ativas.find((l) => /^\s*fallbacks:/.test(l));
    expect(linha).not.toMatch(/zaeon-local-/);
  });
  it("HF primário: zaeon-hf-* pelo router do HF, key só por env (HF_TOKEN), id hf-* (alvo huggingface no ledger), nunca Vertex", () => {
    const hf = deps.filter((d) => d.nome.startsWith("zaeon-hf-"));
    expect(hf.map((d) => d.nome).sort()).toEqual(["zaeon-hf-flash", "zaeon-hf-flash-groq", "zaeon-hf-pro"]);
    const ids = new Set<string>();
    for (const d of hf) {
      const corpo = d.linhas.join("\n");
      expect(corpo, d.nome).toMatch(/model:\s*openai\/[^\s:]+\/[^\s:]+:(cerebras|groq|nebius|sambanova|google-vertex)\s/);
      expect(corpo, d.nome).toContain("api_base: https://router.huggingface.co/v1");
      expect(corpo, d.nome).toContain("api_key: os.environ/HF_TOKEN");
      expect(corpo, d.nome).not.toMatch(/vertex_ai\/|vertex_credentials/);
      const id = /id:\s*(hf-[\w-]+)/.exec(corpo)?.[1];
      expect(id, d.nome).toBeTruthy(); ids.add(id!);
    }
    expect(ids.size).toBe(hf.length);   // model_info.id único por deployment
  });

  it("HF primário cai no GOOGLE (zaeon-flash/zaeon-pro + reserva), nunca no pool grátis nem na Contabo; e ninguém cai no HF", () => {
    const c = cadeias();
    expect(c["zaeon-hf-flash"]).toEqual(["zaeon-hf-flash-groq", "zaeon-flash", "zaeon-reserva-google"]);
    expect(c["zaeon-hf-pro"]?.slice(-3)).toEqual(["zaeon-pro", "zaeon-flash", "zaeon-reserva-google"]);
    for (const o of ["zaeon-hf-flash", "zaeon-hf-pro"]) expect(c[o].join(" "), o).not.toMatch(/zaeon-pool-|zaeon-local-/);
    // o HF só entra quando a flag pede o grupo dele: as cadeias do Google/pool não escorregam pro HF
    for (const [origem, destinos] of Object.entries(c)) if (!origem.startsWith("zaeon-hf-")) expect(destinos.join(" "), origem).not.toMatch(/zaeon-hf-/);
  });
});

