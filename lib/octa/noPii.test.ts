import { describe, it, expect } from "vitest";
import {
  ehCaminhoSensivel,
  partirWorkspace,
  redigirSegredos,
  temSegredo,
  semSegredos,
  ehProvedorTerceiro,
  noPiiLigado,
  SEGREDO_OMITIDO,
} from "./noPii";
import type { MsgModelo } from "@/lib/octa/agente";

describe("noPii · camada 1 (por caminho)", () => {
  it("bloqueia .env e variantes com valor real", () => {
    for (const p of [".env", ".env.local", ".env.production", ".env.secrets", "app/.env", "pacote/.env.test"]) {
      expect(ehCaminhoSensivel(p), p).toBe(true);
    }
  });

  it("LIBERA templates de env — o agente precisa dos NOMES das variáveis", () => {
    for (const p of [".env.example", ".env.sample", ".env.template", ".env.dist", "infra/.env.example", "x.tfvars.example"]) {
      expect(ehCaminhoSensivel(p), p).toBe(false);
    }
  });

  it("bloqueia chaves, certificados e credenciais em repouso", () => {
    for (const p of [
      "chave.pem", "server.key", "cert.p12", "store.jks", "a.keystore", "deploy.ppk", "x.asc",
      ".ssh/id_rsa", "home/.ssh/config", "id_ed25519", ".netrc", ".npmrc", ".pgpass", ".git-credentials",
      ".aws/credentials", ".docker/config.json", "credentials.json", "kubeconfig",
      "secrets/banco.yaml", ".secrets/token.txt", "gcp-service-account.json", "service_account.json",
      "client_secret_123.json", "gha-creds-abc.json", "prod.tfvars", "terraform.tfstate",
    ]) {
      expect(ehCaminhoSensivel(p), p).toBe(true);
    }
  });

  it("LIBERA o código normal do projeto", () => {
    for (const p of [
      "index.html", "app/page.tsx", "lib/octa/noPii.ts", "package.json", "README.md",
      "src/config.ts", "estilos/main.css", "arte/peca.svg", "docker-compose.yml", "keyboard.ts", "monkey.js",
    ]) {
      expect(ehCaminhoSensivel(p), p).toBe(false);
    }
  });

  it("não se perde com barra invertida, caixa alta ou espaço", () => {
    expect(ehCaminhoSensivel("App\\.ENV")).toBe(true);
    expect(ehCaminhoSensivel("  .ssh/ID_RSA  ")).toBe(true);
    expect(ehCaminhoSensivel("")).toBe(false);
  });

  it("partirWorkspace separa liberado de protegido", () => {
    const { liberado, protegido } = partirWorkspace({
      "index.html": "<h1>oi</h1>", ".env": "API_KEY=abc", "app.ts": "export const x = 1", "chave.pem": "-----BEGIN",
    });
    expect(Object.keys(liberado).sort()).toEqual(["app.ts", "index.html"]);
    expect(protegido.sort()).toEqual([".env", "chave.pem"]);
  });
});

describe("noPii · camada 2 (por conteúdo)", () => {
  it("redige bloco PEM inteiro", () => {
    const s = redigirSegredos("antes\n-----BEGIN RSA PRIVATE KEY-----\nMIIEv…linha2\n-----END RSA PRIVATE KEY-----\ndepois");
    expect(s).toContain("antes");
    expect(s).toContain("depois");
    expect(s).not.toContain("MIIEv");
    expect(s).toContain(SEGREDO_OMITIDO);
  });

  it("redige tokens de formato conhecido", () => {
    const casos = [
      "sk-abcdefghijklmnopqrstuvwx", "ghp_abcdefghijklmnopqrstuvwxyz12", "github_pat_abcdefghijklmnopqrstu",
      "hf_abcdefghijklmnopqrstuvwxyz", "AKIAIOSFODNN7EXAMPLE", "AIzaSyA1234567890abcdefghijklmnopqrstu",
      "xoxb-1234567890-abcdefghij", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abcdefghijk",
    ];
    for (const t of casos) {
      const s = redigirSegredos(`valor = ${t}`);
      expect(s, t).not.toContain(t);
      expect(s, t).toContain(SEGREDO_OMITIDO);
    }
  });

  it("redige credencial embutida em URL (mantendo o host legível)", () => {
    const s = redigirSegredos('DATABASE_URL="mongodb+srv://zaeon:senha123@cluster.mongodb.net/zaeon"');
    expect(s).not.toContain("senha123");
    expect(s).toContain(SEGREDO_OMITIDO);
  });

  it("redige atribuição cujo nome denuncia segredo", () => {
    for (const l of ['API_KEY="abcd1234efgh"', "token: 'abcd1234efgh'", "password = supersecreta1", '"client_secret": "abcd1234efgh"']) {
      expect(redigirSegredos(l), l).toContain(SEGREDO_OMITIDO);
    }
  });

  it("NÃO redige placeholder de template (o .env.example continua útil)", () => {
    for (const l of [
      'NEXTAUTH_SECRET="gerar-com: openssl rand -base64 32"', 'GOOGLE_CLIENT_ID=""',
      "API_KEY=<sua-chave-aqui>", "TOKEN={{secret:hf}}", "SENHA=troque-esta-senha", "KEY=your_key_here",
    ]) {
      expect(redigirSegredos(l), l).toBe(l);
    }
  });

  it("não toca em código inocente", () => {
    const codigo = "export function keyOf(o: object) { return Object.keys(o)[0]; }\nconst tokens = texto.split(' ');";
    expect(redigirSegredos(codigo)).toBe(codigo);
  });

  it("é idempotente (redigir duas vezes dá o mesmo)", () => {
    const uma = redigirSegredos('API_KEY="abcd1234efgh"');
    expect(redigirSegredos(uma)).toBe(uma);
  });

  it("temSegredo sinaliza sem expor valor", () => {
    expect(temSegredo("API_KEY=abcd1234efgh")).toBe(true);
    expect(temSegredo("const a = 1")).toBe(false);
  });
});

describe("noPii · semSegredos (mensagens do passo)", () => {
  it("redige em todos os papéis e preserva a forma", () => {
    const msgs: MsgModelo[] = [
      { role: "system", content: "contexto hf_abcdefghijklmnopqrstuvwxyz" },
      { role: "user", content: "olha: sk-abcdefghijklmnopqrstuvwx" },
      { role: "user", content: [{ type: "text", text: "AKIAIOSFODNN7EXAMPLE" } as any] },
      { role: "assistant", content: "achei ghp_abcdefghijklmnopqrstuvwxyz12", tool_calls: [{ id: "1", type: "function", function: { name: "octa_escrever", arguments: JSON.stringify({ path: ".env", conteudo: 'API_KEY="abcd1234efgh"' }) } }] },
      { role: "tool", tool_call_id: "1", content: "gravado: password = supersecreta1" },
    ];
    const out = semSegredos(msgs);
    const txt = JSON.stringify(out);
    for (const v of ["hf_abcdefghijklmnopqrstuvwxyz", "sk-abcdefghijklmnopqrstuvwx", "AKIAIOSFODNN7EXAMPLE", "ghp_abcdefghijklmnopqrstuvwxyz12", "supersecreta1", "abcd1234efgh"]) {
      expect(txt, v).not.toContain(v);
    }
    expect(out).toHaveLength(5);
    expect(out[0].role).toBe("system");
    expect(Array.isArray((out[2] as any).content)).toBe(true);
    expect((out[4] as any).tool_call_id).toBe("1");
  });

  it("arguments das tool_calls continua JSON VÁLIDO depois de redigir", () => {
    const msgs: MsgModelo[] = [{
      role: "assistant", content: null,
      tool_calls: [{ id: "a", type: "function", function: { name: "octa_escrever", arguments: JSON.stringify({ path: "cfg.ts", conteudo: 'const K = "sk-abcdefghijklmnopqrstuvwx";' }) } }],
    }];
    const arg = (semSegredos(msgs)[0] as any).tool_calls[0].function.arguments;
    expect(() => JSON.parse(arg)).not.toThrow();
    expect(JSON.parse(arg).path).toBe("cfg.ts");
    expect(arg).not.toContain("sk-abcdefghijklmnopqrstuvwx");
  });

  it("assistant com content null segue null", () => {
    const out = semSegredos([{ role: "assistant", content: null }]);
    expect((out[0] as any).content).toBeNull();
  });
});

describe("noPii · destino e kill-switch", () => {
  it("reconhece provedor terceiro (HF) e NÃO marca Google/Contabo", () => {
    for (const m of ["hf-heavy", "hf-fast", "HF_Heavy", "openai/gpt-oss-120b:cerebras", "deepseek-ai/DeepSeek-V4-Pro:deepinfra", "moonshot/kimi:groq"]) {
      expect(ehProvedorTerceiro(m, {}), m).toBe(true);
    }
    for (const m of ["vertex_ai/gemini-3.5-flash", "zaeon-local-coder", "zaeon-flash", "zaeon-pool-lite", ""]) {
      expect(ehProvedorTerceiro(m, {}), m).toBe(false);
    }
  });

  it("grupos premium (Claude/Codex) são terceiro → código do aluno sai redigido pra Anthropic/OpenAI", () => {
    for (const m of ["zaeon-claude", "zaeon-codex", "ZAEON-CLAUDE"]) expect(ehProvedorTerceiro(m, {}), m).toBe(true);
    expect(ehProvedorTerceiro("zaeon-flash", {})).toBe(false);  // Google segue intacto
  });

  it("OCTA_MODELOS_TERCEIROS acrescenta nomes", () => {
    expect(ehProvedorTerceiro("meu-gpu", { OCTA_MODELOS_TERCEIROS: "meu-gpu, outro" })).toBe(true);
    expect(ehProvedorTerceiro("meu-gpu", {})).toBe(false);
  });

  it("noPiiLigado: ligado por default, OCTA_NO_PII=0 desliga", () => {
    expect(noPiiLigado({})).toBe(true);
    expect(noPiiLigado({ OCTA_NO_PII: "1" })).toBe(true);
    for (const v of ["0", "off", "false", "nao", "não"]) expect(noPiiLigado({ OCTA_NO_PII: v }), v).toBe(false);
  });
});
