/**
 * lib/rea-blueprint/executor.ts — a CAMADA EXECUTORA REAL do REA no chat de Estudos.
 *
 * Quando o pedido tem um alvo real (alvoReal.ts) e o motor está ligado (REA_BRIDGE_URL/TOKEN), isto roda a
 * engenharia reversa DE VERDADE em paralelo — enquanto a pessoa lê a explicação e conversa com o modelo — e
 * devolve a EVIDÊNCIA real. Essa evidência entra no blueprint como OBSERVAÇÃO (fato observado), não inferência.
 *
 * Fonte dos bytes:
 *   - artefato (APK/binário/bundle anexado): upload → handle → comando com handle;
 *   - url (site): o comando roda no MOTOR (Contabo), que busca o alvo — nunca buscamos a URL do nosso servidor
 *     (evita SSRF aqui; o guard de urlPublicaSegura já barrou alvo privado antes de pedir).
 *
 * Deps injetadas (chamarRea/uploadRea) → testável sem o motor. O motor é a autoridade e já recusa
 * DRM/anti-cheat/auth/pirataria; aqui só orquestramos e resumimos.
 */
import type { AlvoReal } from "./alvoReal";
import { comandoRea, reaBridgeConfigurado, resumirRea, type ReaEnv, type RespostaRea, type UploadRea } from "@/lib/octa/rea";

export type FonteArtefato = { nome: string; conteudo: Buffer };

export type DepsExecutor = {
  chamarRea: (o: { command: string; args?: string[]; artifact?: { nome: string; conteudo: string | Buffer }; handle?: string }, env?: ReaEnv) => Promise<RespostaRea>;
  uploadRea: (o: { nome: string; conteudo: Buffer }, env?: ReaEnv) => Promise<UploadRea>;
  /** só pro alvo "artefato": entrega os bytes do anexo (o chat resolve o anexo em bytes) */
  lerArtefato?: (nome: string) => Promise<FonteArtefato | null>;
};

export type ResultadoExecutor =
  | { ok: true; evidencia: string; ferramentas: string[]; comando: string }
  | { ok: false; motivo: "motor-off" | "comando-barrado" | "sem-bytes" | "falhou"; erro: string };

const LIMITE_UPLOAD = 60 * 1024 * 1024; // 60 MB: APK grande ainda cabe; acima disso, recusa limpa

/** roda a engenharia reversa real do alvo e devolve a evidência (resumo) + a ferramenta usada. */
export async function executarReaReal(alvo: AlvoReal, deps: DepsExecutor, env: ReaEnv = process.env): Promise<ResultadoExecutor> {
  if (!reaBridgeConfigurado(env)) return { ok: false, motivo: "motor-off", erro: "motor do REA não configurado (OCTA_REA + REA_BRIDGE_URL/TOKEN)" };
  if (!comandoRea(alvo.comando)) return { ok: false, motivo: "comando-barrado", erro: `comando não liberado nesta fatia: ${alvo.comando}` };

  if (alvo.tipo === "url") {
    const resp = await deps.chamarRea({ command: alvo.comando, args: [alvo.url] }, env);
    if (!resp.ok) return { ok: false, motivo: "falhou", erro: resp.erro ?? resp.stderr ?? "o motor não retornou evidência" };
    return { ok: true, evidencia: resumirRea(resp), ferramentas: [alvo.comando], comando: alvo.comando };
  }

  // artefato: precisa dos bytes
  if (!deps.lerArtefato) return { ok: false, motivo: "sem-bytes", erro: "sem leitor de anexo pra este alvo" };
  const bytes = await deps.lerArtefato(alvo.nome).catch(() => null);
  if (!bytes || !bytes.conteudo?.length) return { ok: false, motivo: "sem-bytes", erro: `não consegui ler o anexo ${alvo.nome}` };
  if (bytes.conteudo.length > LIMITE_UPLOAD) return { ok: false, motivo: "sem-bytes", erro: `anexo grande demais (${(bytes.conteudo.length / 1048576).toFixed(0)} MB; máx 60 MB)` };

  const up = await deps.uploadRea({ nome: bytes.nome, conteudo: bytes.conteudo }, env);
  if (!up.ok || !up.handle) return { ok: false, motivo: "falhou", erro: up.erro ?? "upload do artefato falhou" };
  const resp = await deps.chamarRea({ command: alvo.comando, handle: up.handle }, env);
  if (!resp.ok) return { ok: false, motivo: "falhou", erro: resp.erro ?? resp.stderr ?? "o motor não retornou evidência" };
  return { ok: true, evidencia: resumirRea(resp), ferramentas: [alvo.comando], comando: alvo.comando };
}
