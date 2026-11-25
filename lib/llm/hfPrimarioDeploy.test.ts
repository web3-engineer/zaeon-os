/**
 * HF na frente do Google: o deploy leva LLM_PRIMARIO e os modelos do HF (Variables do GitHub) pro servidor, e o
 * /api/health diz quem responde primeiro.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { llmNaFrente } from "@/lib/llm/reservaHf";

const deploy = readFileSync(".github/workflows/deploy.yml", "utf8");
const CHAVES = ["LLM_PRIMARIO", "HF_RESERVA_MODELOS", "HF_PRIMARIO_MODELOS", "HF_PRIMARIO_MODELOS_PRO"];

describe("deploy leva as chaves do HF", () => {
  it.each(CHAVES)("%s: vem da Variable, entra no envs do ssh e é gravada no .env.secrets só se preenchida", (k) => {
    expect(deploy).toContain(`${k}: \${{ vars.${k} || '' }}`);
    expect(deploy).toMatch(new RegExp(`envs: [^\\n]*\\b${k}\\b`));
    expect(deploy).toMatch(new RegExp(`HFV="[^"]*\\b${k}\\b`));
  });

  it("o laço só grava a preenchida e troca a linha antiga (não duplica)", () => {
    expect(deploy).toContain(`for k in $HFV; do [ -n "\${!k:-}" ] && hfn="$hfn|$k"; done`);
    expect(deploy).toContain(`grep -vE "^(\${hfn#|})=" .env.secrets > .env.secrets.tmp || true`);
    expect(deploy).toContain(`for k in \${hfn//|/ }; do echo "$k=\${!k}"; done; } > .env.secrets`);
  });

  it("não vira Secret nem imprime o token", () => {
    for (const k of CHAVES) expect(deploy).not.toContain(`secrets.${k}`);
    expect(deploy).not.toMatch(/echo[^\n]*\$\{HF_TOKEN\}/);
    expect(deploy).toMatch(/echo "→ HF: gravadas \$\{hfn#\|\}/);
  });
});

describe("/api/health · quem vai na frente", () => {
  it("LLM_PRIMARIO=hf com token → huggingface", () => {
    expect(llmNaFrente({ LLM_PRIMARIO: "hf", HF_TOKEN: "x" })).toEqual({ primario: "huggingface", reservaHf: false });
  });
  it("sem a chave → google, com o HF de reserva", () => {
    expect(llmNaFrente({ HF_TOKEN: "x" })).toEqual({ primario: "google", reservaHf: true });
  });
  it("chave sem token, ou HF_RESERVA=0 → google sem reserva", () => {
    expect(llmNaFrente({ LLM_PRIMARIO: "hf" })).toEqual({ primario: "google", reservaHf: false });
    expect(llmNaFrente({ LLM_PRIMARIO: "hf", HF_TOKEN: "x", HF_RESERVA: "0" })).toEqual({ primario: "google", reservaHf: false });
  });
});
