/**
 * #883 (parte 1) · o que o teste de 27/11 achou no pedido de imagem, fora o provedor (lib/ai/hf-image.test.ts):
 *  - "faça uma imagem do coração humano" com o Osler virava o cartão 3D;
 *  - a falha do gerador dizia "Pode tentar de novo", e o próximo clique falhava igual;
 *  - com a base ligada, a bolha dizia "Nenhum dos documentos disponíveis contém instruções para criar uma imagem…".
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { artefatosComAnatomia, pediuOutroArtefato } from "@/lib/agent/anatomiaDoTurno";
import { mensagemDeFalha } from "@/lib/studio/falhaArtefato";
import { pickStudioKind } from "@/lib/agent/aura-harness";

const ler = (p: string) => readFileSync(path.resolve(__dirname, "../..", p), "utf8");
const coracao = { nome: "heart" };

describe("#883 · pedir IMAGEM pelo nome não vira o 3D", () => {
  it("imagem, ilustração, figura e foto são pedidos pelo nome", () => {
    for (const p of ["faça uma imagem do coração humano", "crie uma ilustração do pulmão", "quero uma figura do fêmur", "me manda uma foto do rim"]) {
      expect(pediuOutroArtefato(p), p).toBe(true);
    }
  });

  it("a imagem pedida fica; o 3D não entra no lugar", () => {
    const r = artefatosComAnatomia({ artefatos: [{ studioKind: "image", title: "coração" } as never], objetivo: "faça uma imagem do coração humano", estrutura: coracao });
    expect(r).toEqual([{ studioKind: "image", title: "coração" }]);
  });

  it("sem pedir imagem, a peça do atlas continua: 'desenhe o pulmão', 'como funciona o coração?', 'fotossíntese' não é foto", () => {
    expect(pediuOutroArtefato("desenhe o pulmão")).toBe(false);
    expect(pediuOutroArtefato("desenhe a anatomia do coração humano")).toBe(false);
    expect(pediuOutroArtefato("me explica a fotossíntese")).toBe(false);
    const r = artefatosComAnatomia({ artefatos: [{ studioKind: "image", title: "x" } as never], objetivo: "como funciona o coração?", estrutura: coracao });
    expect(r).toEqual([{ studioKind: "anatomia", title: "heart" }]);
  });
});

describe("#883 · gerador fora do ar: o aluno sabe, e não é mandado tentar de novo", () => {
  it("cobrança do Google (403) e HF recusando viram 'fora do ar', com uma alternativa", () => {
    for (const motivo of [
      "Não consegui gerar a imagem: Vertex 403: This API method requires billing to be enabled.",
      "Não consegui gerar a imagem: Hugging Face não gerou a imagem (together 402 | nebius: demorou demais)",
      "Geração de imagem indisponível agora.",
    ]) {
      const r = mensagemDeFalha("image", motivo);
      expect(r.texto, motivo).toBe("A geração de imagem está fora do ar agora. Se quiser, peça um diagrama ou um mapa mental do mesmo assunto.");
      expect(r.texto).not.toMatch(/tentar de novo|Vertex|Hugging|403/);
      expect(r.tecnico).toBeTruthy();
    }
  });

  it("podcast e vídeo também; um erro passageiro continua com 'tentar de novo'", () => {
    expect(mensagemDeFalha("podcast", "Vertex 403 billing").texto).toBe("A geração de podcast está fora do ar agora.");
    expect(mensagemDeFalha("image", "fetch failed").texto).toBe("Não consegui desenhar essa imagem agora. Pode tentar de novo.");
    expect(mensagemDeFalha("diagram", "Vertex 403 billing").texto).toBe("Não consegui desenhar esse diagrama agora. Pode tentar de novo.");
  });
});

describe("#883 · o texto do pedido de imagem não fala de 'instruções nos documentos'", () => {
  it("o prompt do turno explica que a imagem é feita por outra ferramenta", () => {
    const h = ler("lib/agent/aura-harness.ts");
    expect(h).toMatch(/A imagem é desenhada por outra ferramenta, depois deste texto/);
    expect(h).toMatch(/Nunca diga que os documentos não têm instruções para criar a imagem/);
  });

  it("a rota de imagem tenta o Hugging Face antes do Google, e a mensagem de indisponível não fala de Google", () => {
    const im = ler("lib/studio/imagen.ts");
    expect(im.indexOf("gerarImagemHf(")).toBeGreaterThan(0);
    expect(im.indexOf("gerarImagemHf(")).toBeLessThan(im.indexOf("gerarImagemGemini(clean"));
    expect(ler("app/api/studio/image/route.ts")).not.toMatch(/credencial Google ausente/);
  });
});

describe("#883 · revisão do PR #884", () => {
  it("plurais (figuras, fotos, fotografias) também são pedido de imagem e não viram o 3D", () => {
    for (const p of ["quero figuras do coração", "me manda fotos do rim", "fotografias do pulmão"]) {
      expect(pediuOutroArtefato(p), p).toBe(true);
      expect(artefatosComAnatomia({ artefatos: [{ studioKind: "image", title: "x" } as never], objetivo: p, estrutura: coracao }).map((a) => a.studioKind), p).toEqual(["image"]);
    }
  });

  it("'foto' escolhe o artefato de imagem; 'fotossíntese' não", () => {
    expect(pickStudioKind("me manda uma foto do rim")).toBe("image");
    expect(pickStudioKind("fotos de vulcões")).toBe("image");
    expect(pickStudioKind("resuma a fotossíntese")).not.toBe("image");
  });

  it("vídeo sem nenhuma cena por causa da imagem mostra 'fora do ar', não 'tente de novo'", () => {
    const m = mensagemDeFalha("video", "Nenhuma cena pôde ser gerada: Hugging Face não gerou a imagem (together 402: x)");
    expect(m.texto).toMatch(/A geração de vídeo está fora do ar agora/);
    expect(ler("lib/studio/video-pipeline.ts")).toContain("Nenhuma cena pôde ser gerada: ${motivo}");
  });

  it("um prazo só para HF + Google (a rota tem folga para gravar e responder)", () => {
    const im = ler("lib/studio/imagen.ts");
    expect(im).toContain("const fim = Date.now() + timeoutMs");
    expect(im).toContain("Promise.race");
  });

  it("o diagnóstico testa o HF primeiro e o deploy passa as variáveis da imagem", () => {
    const diag = ler("app/api/studio/diag/route.ts");
    expect(diag).toContain("imagem: imagemHf");
    expect(diag).toContain("imagem_reserva_google");
    const deploy = ler(".github/workflows/deploy.yml");
    for (const v of ["HF_IMAGEM", "HF_IMAGEM_MODELOS", "HF_IMAGEM_TIMEOUT_MS"]) {
      expect(deploy).toContain(`${v}: \${{ vars.${v} || '' }}`);
      expect(deploy).toMatch(new RegExp(`envs:.*[,:\\s]${v},`));
      expect(deploy).toMatch(new RegExp(`HFV=".*\\s${v}[\\s"]`));
    }
  });
});
