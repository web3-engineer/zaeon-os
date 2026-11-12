/**
 * lib/agent/aprender.ts — a regra de disparo do "aprender interativo" (handoff archify/Papermorph/REA).
 *
 * O harness DECIDE, a camada de artefatos RENDERIZA (docs/HARNESS_x_ARTIFACTS_ARCHITECTURE.md).
 * Esta é a decisão, em código puro e testável — a tabela do dono:
 *
 *   | o aluno pede…                                   | motor                         | kind      |
 *   |-------------------------------------------------|-------------------------------|-----------|
 *   | "me explica / como funciona / quero aprender X" | archify                       | diagram   |
 *   | "mapa mental / mapa de estudo de X"             | archify (formato mapa)        | mindmap*  |
 *   | "diagrama / esquema / fluxograma de X"          | archify                       | diagram   |
 *   | "faz engenharia reversa de X"                   | modo leve (explica + recria)  | diagram   |
 *   | "me dá uma aula sobre X"                        | Papermorph → PR própria       | (aula)    |
 *   | "podcast / quiz / molécula"                     | os que já existem             | —         |
 *
 *   * `mindmap` continua sendo o NOME do pedido; o cliente (lib/studio/studioClient) o materializa
 *     com o archify e só cai no mapa estático antigo se o diagrama falhar.
 *
 * Sala: os MESMOS motores nas duas; o rigor muda no prompt (Pesquisa com fonte, Estudos objetivo).
 */
import type { IntentId, StructuredAnswer, StudioRef } from "@/lib/agent/contracts";
import { pedeGraficoMatematico, pedeGraficoDeDados } from "@/lib/agent/matematica";

const norm = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Vontade de APRENDER/ENTENDER algo (não só uma resposta pontual). */
export const APRENDER_RE =
  /\b(como funciona[m]?|como (?:e que|acontece|ocorre|se forma|se faz)|quero (?:aprender|entender|conhecer|saber como)|me (?:explica|explique|ensina|ensine)|explica(?:r)? (?:como|o que|por que)|o que (?:e|sao)|entender melhor|aprender sobre|qual (?:o|e o) (?:mecanismo|processo)|passo a passo)\b/;

/**
 * Pedido de AULA (o Papermorph): "me dá uma aula sobre X", "quero uma aula", "explica a fundo",
 * "aula completa". Só com a palavra/intenção explícita — explicação comum ganha o diagrama.
 */
export const AULA_RE =
  /\b(?:me (?:da|de|faz|faca|prepara|monta) uma aula|(?:quero|preciso de|gera|gere|cria|crie|faz|faca|monta|monte|prepara) (?:uma )?aula|uma aula (?:sobre|de|do|da)|aula (?:completa|interativa|sobre)|explica(?:r|e)? (?:isso |isto |tudo )?a fundo|aprofunda(?:r)? (?:bem )?(?:esse|este|o) (?:tema|assunto))\b/;

/** Engenharia reversa (o REA). Aqui só o modo LEVE — sem análise de binário. */
export const ENGENHARIA_REVERSA_RE =
  /\b(engenharia reversa|reverse[- ]engineer\w*|desmonta(?:r)? (?:como|esse|essa|isso)|como (?:isso|esse|essa) (?:\w+ )?funciona por dentro|recriar (?:isso|esse|essa)|como (?:eu )?(?:faco|faria|fazer) (?:igual|um igual|algo igual))\b/;

export const pedeAprender = (objetivo: string) => APRENDER_RE.test(norm(objetivo));
export const pedeEngenhariaReversa = (objetivo: string) => ENGENHARIA_REVERSA_RE.test(norm(objetivo));
export const pedeAula = (objetivo: string) => AULA_RE.test(norm(objetivo));

/**
 * Diretriz do modo leve de engenharia reversa (captura a intenção do REA — "entenda e reproduza" —
 * sem Ghidra/Hopper/binário). Entra no prompt do draft quando o pedido é de engenharia reversa.
 */
export const DIRETRIZ_ENGENHARIA_REVERSA = [
  "MODO ENGENHARIA REVERSA (leve): o aluno quer entender COMO algo funciona por dentro e conseguir recriar.",
  "Estruture: (1) o comportamento observável; (2) o MECANISMO provável, separando o que é fato conhecido do que é hipótese;",
  "(3) uma RECRIAÇÃO mínima no stack do aluno (código curto e comentado, ou passo a passo se não for software);",
  "(4) como verificar se a recriação se comporta igual.",
  "Não analise binários, não contorne proteção/licença/DRM e não ajude a copiar código proprietário — explique o princípio e reconstrua do zero.",
].join(" ");

/** O assunto do diagrama: a pergunta sem o "me explica"/"como funciona" da frente (o modelo recebe a explicação junto). */
export function assuntoDe(objetivo: string): string {
  const t = (objetivo || "").replace(/\s+/g, " ").trim();
  const limpo = t
    .replace(/^(?:oi|ol[áa]|e a[ií])[,!.\s]+/i, "")
    .replace(/^(?:por favor[,\s]+)?(?:voc[êe] )?(?:pode(?:ria)? )?(?:me )?(?:explica(?:r)?|explique|ensina(?:r)?|ensine|mostra(?:r)?|conta(?:r)?)\s+(?:pra mim\s+)?/i, "")
    .replace(/^(?:eu )?quero (?:aprender|entender|conhecer|saber)\s+(?:melhor\s+)?(?:sobre\s+)?/i, "")
    .replace(/^faz(?:er)? (?:uma )?engenharia reversa (?:de|do|da)\s+/i, "")
    .replace(/^(?:me )?(?:d[áa]|de|faz|fa[çc]a|prepara|monta|gera|cria|quero|preciso de)?\s*(?:uma )?aula(?: interativa| completa)?\s+(?:sobre|de|do|da)\s+/i, "")
    .replace(/[?!.]+$/, "")
    .trim();
  return (limpo || t).slice(0, 200);
}

// `anatomia` entra aqui: quando a peça do atlas já viaja com a resposta, ela É a figura do turno. Antes, toda pergunta
// de "como funciona o coração" ganhava um diagrama automático AO LADO da peça (ou no lugar dela) — o dono viu a agente
// de medicina "devolvendo diagramas" para quem pediu uma parte do corpo.
const JA_TEM_DIAGRAMA = (arts: StudioRef[]) => arts.some((a) => a.studioKind === "diagram" || a.studioKind === "mindmap" || a.studioKind === "anatomia");

/**
 * O artefato que a intenção pede (ou null). Chamado no fim do turno, com a resposta pronta:
 *  - explicar_conceito → SEMPRE um diagrama interativo (regra do dono: "aprender/entender/conhecer");
 *  - duvida_rapida → diagrama só se a frase for de aprender ("como funciona X"), não pra "que horas são";
 *  - engenharia reversa → diagrama do mecanismo entendido (casa com o modo leve);
 *  - conversa, trabalho, fontes, revisão → nada (o artefato não é a resposta).
 * Um só por resposta — e nunca um segundo se o modelo/pedido já trouxe diagrama ou mapa.
 */
export function artefatoDeAprender(
  intent: IntentId,
  objetivo: string,
  answer: Pick<StructuredAnswer, "artifacts">,
): StudioRef | null {
  if (JA_TEM_DIAGRAMA(answer.artifacts ?? [])) return null;
  // gráfico de função / figura de geometria: o desenho é o ```grafico no próprio texto, não um diagrama archify
  // #749: gráfico de DADOS também — "gráfico da população por região" virava um diagrama archify em vez das barras
  if (pedeGraficoMatematico(objetivo) || pedeGraficoDeDados(objetivo)) return null;
  const quer =
    intent === "explicar_conceito" ||
    (intent === "duvida_rapida" && pedeAprender(objetivo)) ||
    ((intent === "duvida_rapida" || intent === "conversa") && pedeEngenhariaReversa(objetivo));
  if (!quer) return null;
  return { studioKind: "diagram", title: assuntoDe(objetivo) };
}
