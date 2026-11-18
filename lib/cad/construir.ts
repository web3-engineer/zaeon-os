/**
 * lib/cad/construir.ts — o TEMA vira PEÇA: roteiro de comandos → STEP, glTF e miniatura.
 *
 * ────────────────────────── a fronteira que define o produto ──────────────────────────
 * Como o `/api/studio/molecule` (PubChem) e o `/api/studio/anatomia` (BodyParts3D), este artefato
 * tem um VERIFICADOR que não é o modelo. Aqui ele é o próprio `solidcraft-cli`: o roteiro só vira
 * peça se o kernel CAD conseguir construir o sólido. Roteiro inválido não vira artefato bonito com
 * geometria errada — não vira artefato nenhum. Num produto de educação essa fronteira é o produto.
 *
 * O que o modelo faz aqui é ESCREVER O ROTEIRO (uma lista de comandos declarativos). O que ele não
 * faz é afirmar que a peça existe: isso quem diz é o binário.
 *
 * ────────────────────────── por que tudo é injetado ──────────────────────────
 * `solidcraft-cli` é compilado no estágio Rust do Dockerfile e só existe DENTRO da imagem — não no
 * ambiente de desenvolvimento nem no CI. Então `correr` e o acesso a disco entram por parâmetro, e
 * o teste exercita a orquestração inteira com um executor de mentira. O que ESTE arquivo garante é
 * a lógica; o que só a imagem garante é o binário responder — e isso está dito, não escondido.
 *
 * ────────────────────────── o que é obrigatório e o que é bônus ──────────────────────────
 * A MINIATURA (PNG) é o caminho padrão do `CadView` — é ela que aparece na bolha, num `<img>`, sem
 * WebGL. Então ela é OBRIGATÓRIA: sem miniatura não há artefato. O STEP (baixar) e o glTF (girar em
 * 3D) são MELHOR-ESFORÇO: se o CLI falhar neles, a peça ainda serve e o aluno ainda vê. Falhar o
 * artefato inteiro porque o glTF não saiu seria trocar uma entrega boa por nenhuma.
 */

/** Um comando do SolidCraft. `params` é livre de propósito: o registro de comandos é dele, não nosso. */
export type ComandoCad = { command: string; params?: Record<string, unknown> };

/** O ARTEFATO canônico: a lista de comandos reconstrói a peça inteira. Pequeno, versionável, diffável. */
export type ScriptCad = { commands: ComandoCad[] };

export type PecaConstruida = {
  /** data URL de PNG — o caminho padrão da bolha */
  png: string;
  /** texto ISO-10303-21, quando o CLI entregou */
  step?: string;
  /** base64 de um .glb, quando o CLI entregou */
  gltf?: string;
  /** o número do `eval`, quando deu pra medir */
  volumeMm3?: number;
};

export type ResultadoPeca =
  | { ok: true; peca: PecaConstruida }
  | { ok: false; motivo: string; code: "roteiro_invalido" | "cli_falhou" | "sem_miniatura" };

/** Teto de comandos num roteiro. Alto o bastante pra uma peça de aula, baixo pra não virar programa. */
export const MAX_COMANDOS = 60;

/** Teto de bytes por anexo guardado no artefato (o payload vai pro banco e volta na conversa). */
export const MAX_BYTES_ANEXO = 4 * 1024 * 1024;

/**
 * PURA: o que o modelo devolveu é um roteiro utilizável?
 *
 * Recusa cedo e com motivo. Note o que NÃO é validado: os NOMES dos comandos e a forma dos
 * `params`. O registro de comandos é do SolidCraft (`list_commands`), muda com a versão dele, e
 * duplicá-lo aqui criaria uma segunda fonte da verdade que envelhece calada. Quem valida isso é o
 * binário, que é a autoridade — e a falha dele vira `cli_falhou` com a mensagem dele junto.
 */
export function lerScript(bruto: unknown): { ok: true; script: ScriptCad } | { ok: false; motivo: string } {
  const raiz = bruto as { commands?: unknown } | null;
  const lista = Array.isArray(raiz?.commands) ? raiz!.commands : null;
  if (!lista) return { ok: false, motivo: "o roteiro não tem a lista `commands`" };
  if (!lista.length) return { ok: false, motivo: "o roteiro veio sem nenhum comando" };
  if (lista.length > MAX_COMANDOS) {
    return { ok: false, motivo: `o roteiro tem ${lista.length} comandos (o teto é ${MAX_COMANDOS})` };
  }
  const commands: ComandoCad[] = [];
  for (const [i, c] of lista.entries()) {
    const cmd = (c as ComandoCad | null)?.command;
    if (typeof cmd !== "string" || !cmd.trim()) {
      return { ok: false, motivo: `o comando ${i + 1} não tem nome` };
    }
    const params = (c as ComandoCad).params;
    commands.push({
      command: cmd.trim(),
      ...(params && typeof params === "object" && !Array.isArray(params) ? { params } : {}),
    });
  }
  return { ok: true, script: { commands } };
}

/** O executor do binário. Devolve o código de saída e o que ele falou — nunca lança. */
export type Correr = (args: readonly string[]) => Promise<{ ok: boolean; saida: string }>;

/** O acesso a disco de que a construção precisa, para o teste não tocar em disco nenhum. */
export type Disco = {
  escrever: (caminho: string, conteudo: string) => Promise<void>;
  lerTexto: (caminho: string) => Promise<string>;
  lerBase64: (caminho: string) => Promise<string>;
};

export type DepsConstrucao = {
  correr: Correr;
  disco: Disco;
  /** pasta de trabalho JÁ criada, dentro do sandbox (`RAIZ_CAD/<escopo>`) */
  pasta: string;
};

/** Extrai o primeiro número de `volume` da saída do `eval`. Sem número, simplesmente não há medida. */
export function volumeDaSaida(saida: string): number | undefined {
  const m = /"?volume"?\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/i.exec(saida || "");
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

const cabe = (s: string | undefined) => !!s && s.length <= MAX_BYTES_ANEXO;

/**
 * Roteiro → peça. Chama o CLI uma vez por formato, porque é assim que a CLI dele é:
 *   solidcraft-cli snapshot script.json --out prev.png   (miniatura, OBRIGATÓRIA)
 *   solidcraft-cli run      script.json --out part.step  (baixar, melhor-esforço)
 *   solidcraft-cli run      script.json --out part.glb   (girar, melhor-esforço)
 *   solidcraft-cli eval     part.step                    (medir, melhor-esforço)
 */
export async function construirPeca(script: ScriptCad, d: DepsConstrucao): Promise<ResultadoPeca> {
  const roteiro = `${d.pasta}/roteiro.json`;
  const png = `${d.pasta}/peca.png`;
  const step = `${d.pasta}/peca.step`;
  const glb = `${d.pasta}/peca.glb`;

  await d.disco.escrever(roteiro, JSON.stringify(script));

  // 1 · a miniatura. Se esta falhar, não há peça: é ela que a bolha mostra.
  const snap = await d.correr(["snapshot", roteiro, "--out", png]);
  if (!snap.ok) {
    return { ok: false, motivo: primeiraLinha(snap.saida) || "o kernel CAD não construiu a peça", code: "cli_falhou" };
  }
  let pngB64: string;
  try {
    pngB64 = await d.disco.lerBase64(png);
  } catch {
    return { ok: false, motivo: "o CLI disse que gerou a miniatura, mas ela não está no disco", code: "sem_miniatura" };
  }
  if (!pngB64) return { ok: false, motivo: "a miniatura saiu vazia", code: "sem_miniatura" };
  /**
   * A MINIATURA TAMBÉM TEM TETO, e é a que mais importa: o artefato inteiro vira UM documento no
   * banco, e o Mongo recusa documento grande demais. STEP e glTF eu já descartava quando passavam
   * do teto; a miniatura não, e sendo ela obrigatória, uma só grande o bastante derrubaria a peça
   * inteira no `create` — depois de todo o trabalho já feito.
   */
  if (pngB64.length > MAX_BYTES_ANEXO) {
    return { ok: false, motivo: "a miniatura ficou grande demais para guardar", code: "sem_miniatura" };
  }

  const peca: PecaConstruida = { png: `data:image/png;base64,${pngB64}` };

  // 2 · STEP e glTF — melhor-esforço, cada um por sua conta. Um não derruba o outro nem a peça.
  const comStep = await d.correr(["run", roteiro, "--out", step]);
  if (comStep.ok) {
    const txt = await d.disco.lerTexto(step).catch(() => "");
    if (cabe(txt)) peca.step = txt;
  }
  const comGlb = await d.correr(["run", roteiro, "--out", glb]);
  if (comGlb.ok) {
    const b64 = await d.disco.lerBase64(glb).catch(() => "");
    if (cabe(b64)) peca.gltf = b64;
  }

  // 3 · a medida. Só faz sentido se o STEP existe — o `eval` lê um STEP.
  if (peca.step) {
    const medida = await d.correr(["eval", step]);
    if (medida.ok) {
      const v = volumeDaSaida(medida.saida);
      if (v !== undefined) peca.volumeMm3 = v;
    }
  }

  return { ok: true, peca };
}

function primeiraLinha(s: string): string {
  return (s || "").split("\n").map((l) => l.trim()).filter(Boolean)[0]?.slice(0, 300) || "";
}
