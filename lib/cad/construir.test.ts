/**
 * A construção da peça, com o kernel de MENTIRA.
 *
 * O `solidcraft-cli` é compilado no estágio Rust do Dockerfile e NÃO existe em desenvolvimento nem
 * no CI. Então o que estes testes garantem é a ORQUESTRAÇÃO — ordem das chamadas, o que é
 * obrigatório, o que é melhor-esforço, e o que acontece quando cada degrau falha. O que eles NÃO
 * garantem é o binário responder: isso só a imagem prova, e está dito no cabeçalho de construir.ts.
 */
import { describe, expect, it } from "vitest";
import {
  MAX_BYTES_ANEXO, MAX_COMANDOS, construirPeca, lerScript, volumeDaSaida,
  type Correr, type Disco,
} from "@/lib/cad/construir";

const SCRIPT = { commands: [{ command: "sketch.create", params: { plane: "XY" } }, { command: "solid.extrude", params: { distance: 20 } }] };

/** Um kernel de mentira que registra o que foi chamado e entrega o que mandarem. */
function kernel(opts: { falhar?: string[]; arquivos?: Record<string, string>; saidaEval?: string } = {}) {
  const chamadas: string[][] = [];
  const escritos: Record<string, string> = {};
  const correr: Correr = async (args) => {
    chamadas.push([...args]);
    const sub = args[0]!;
    if (opts.falhar?.includes(sub)) return { ok: false, saida: `erro: o kernel recusou ${sub}\nlinha 2` };
    if (sub === "eval") return { ok: true, saida: opts.saidaEval ?? '{"volume": 24000.5}' };
    return { ok: true, saida: "" };
  };
  const arquivos = opts.arquivos ?? { ".png": "UE5H", ".step": "ISO-10303-21;", ".glb": "Z2xURg" };
  const pega = (c: string) => {
    const ext = c.slice(c.lastIndexOf("."));
    const v = arquivos[ext];
    if (v === undefined) throw new Error(`sem arquivo ${c}`);
    return v;
  };
  const disco: Disco = {
    escrever: async (c, t) => { escritos[c] = t; },
    lerTexto: async (c) => pega(c),
    lerBase64: async (c) => pega(c),
  };
  return { correr, disco, pasta: "/app/cad/t", chamadas, escritos };
}

describe("lerScript — o roteiro do modelo é utilizável? (PURA)", () => {
  it("aceita um roteiro bom e normaliza", () => {
    const r = lerScript({ commands: [{ command: "  solid.extrude  ", params: { distance: 20 } }] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.script.commands[0]).toEqual({ command: "solid.extrude", params: { distance: 20 } });
  });

  it("recusa o que não é roteiro, com motivo", () => {
    for (const [bruto, pedaco] of [
      [null, "commands"], [{}, "commands"], [{ commands: "x" }, "commands"],
      [{ commands: [] }, "nenhum comando"],
      [{ commands: [{ params: {} }] }, "não tem nome"],
      [{ commands: [{ command: "   " }] }, "não tem nome"],
    ] as const) {
      const r = lerScript(bruto);
      expect(r.ok, JSON.stringify(bruto)).toBe(false);
      if (!r.ok) expect(r.motivo).toContain(pedaco);
    }
  });

  it("tem teto de comandos — roteiro não é programa", () => {
    const grande = { commands: Array.from({ length: MAX_COMANDOS + 1 }, () => ({ command: "solid.extrude" })) };
    const r = lerScript(grande);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toContain(String(MAX_COMANDOS));
  });

  it("NÃO valida o nome do comando — essa autoridade é do binário, não nossa", () => {
    // Duplicar o registro de comandos do SolidCraft aqui criaria uma 2ª fonte da verdade que
    // envelhece calada. Comando inexistente passa por aqui e morre no kernel, com a mensagem dele.
    expect(lerScript({ commands: [{ command: "comando.que.nao.existe" }] }).ok).toBe(true);
  });
});

describe("volumeDaSaida (PURA)", () => {
  it("acha o número em JSON e em texto solto", () => {
    expect(volumeDaSaida('{"volume": 24000.5}')).toBe(24000.5);
    expect(volumeDaSaida("volume = 120")).toBe(120);
  });
  it("sem número, sem medida — nunca NaN nem zero", () => {
    for (const s of ["", "nada aqui", '{"volume": 0}', '{"volume": -3}', "volume: abc"]) {
      expect(volumeDaSaida(s), s).toBeUndefined();
    }
  });
});

describe("construirPeca — a orquestração", () => {
  it("o caminho feliz: miniatura, STEP, glTF e medida", async () => {
    const k = kernel();
    const r = await construirPeca(SCRIPT, k);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.peca.png.startsWith("data:image/png;base64,")).toBe(true);
    expect(r.peca.step).toContain("ISO-10303-21");
    expect(r.peca.gltf).toBe("Z2xURg");
    expect(r.peca.volumeMm3).toBe(24000.5);
  });

  it("grava o roteiro em disco ANTES de chamar o kernel", async () => {
    const k = kernel();
    await construirPeca(SCRIPT, k);
    expect(JSON.parse(k.escritos["/app/cad/t/roteiro.json"]!)).toEqual(SCRIPT);
  });

  it("A MINIATURA É OBRIGATÓRIA: kernel que não constrói não vira artefato", async () => {
    const r = await construirPeca(SCRIPT, kernel({ falhar: ["snapshot"] }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("cli_falhou");
    // a mensagem do KERNEL chega ao aluno — é a 1ª linha, não um "algo deu errado"
    expect(r.motivo).toContain("o kernel recusou snapshot");
    expect(r.motivo).not.toContain("linha 2");
  });

  it("e se o kernel disser que gerou mas o arquivo não estiver lá, isso tem código próprio", async () => {
    const r = await construirPeca(SCRIPT, kernel({ arquivos: {} }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("sem_miniatura");
  });

  it("STEP e glTF são MELHOR-ESFORÇO: falham sozinhos sem derrubar a peça", async () => {
    const r = await construirPeca(SCRIPT, kernel({ falhar: ["run"] }));
    expect(r.ok, "sem STEP e sem glTF a peça ainda serve — o PNG é o que a bolha mostra").toBe(true);
    if (!r.ok) return;
    expect(r.peca.png).toBeTruthy();
    expect(r.peca.step).toBeUndefined();
    expect(r.peca.gltf).toBeUndefined();
    expect(r.peca.volumeMm3, "sem STEP não há o que medir").toBeUndefined();
  });

  it("anexo acima do teto é DESCARTADO, e a peça continua de pé", async () => {
    const gigante = "x".repeat(MAX_BYTES_ANEXO + 1);
    const r = await construirPeca(SCRIPT, kernel({ arquivos: { ".png": "UE5H", ".step": gigante, ".glb": gigante } }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.peca.step, "o payload vai pro banco e volta na conversa").toBeUndefined();
    expect(r.peca.gltf).toBeUndefined();
  });

  it("a medida só é tentada quando há STEP — o `eval` lê um STEP", async () => {
    const k = kernel({ falhar: ["run"] });
    await construirPeca(SCRIPT, k);
    expect(k.chamadas.some((c) => c[0] === "eval")).toBe(false);
  });

  it("tudo acontece DENTRO da pasta confinada — nada escrito fora", async () => {
    const k = kernel();
    await construirPeca(SCRIPT, k);
    const caminhos = [...Object.keys(k.escritos), ...k.chamadas.flat().filter((a) => a.includes("/"))];
    expect(caminhos.length).toBeGreaterThan(0);
    for (const c of caminhos) expect(c.startsWith("/app/cad/t/"), c).toBe(true);
  });
});
