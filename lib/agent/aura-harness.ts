/**
 * lib/agent/aura-harness.ts — o ADAPTADOR `HarnessDeps` (executor PASSO 1).
 *
 * Liga o motor puro (`runTrajectory`) ao mundo real: router (classify), runtime (runTool),
 * examiner (critique) e Gemini (plan/reason/draft). `plan`/`reason`/`draft` são as ÚNICAS
 * chamadas de geração. Aditivos de pesquisa embutidos:
 *   A1 · erro-como-observação: falha de tool volta ao contexto do próximo reason/draft.
 *   A2 · retry numa camada só: 1 retry (backoff) para tool_timeout/network/rate_limited — NUNCA
 *        para tool_denied/needs_approval/validação. Vive SÓ aqui (adaptador).
 *   A5 · evidence-gate no draft de criar_trabalho (baseia-se na evidência; sinaliza se falta).
 *   A6 · perspectivas/sub-perguntas no plan de criar_trabalho (mode research).
 * As chamadas de modelo são INJETÁVEIS (`opts.genJson`) → o adaptador é testável SEM rede.
 * Gemini é a IA única (§ guardrail). Flash por padrão; Pro só quando `deepThink` e fase pesada.
 */
import { diretrizDaSala, salaDoModo } from "@/lib/ai/salaPersona";
import { GEMINI_MODEL_FLASH, GEMINI_MODEL_PRO } from "@/lib/ai/model";
import { classify } from "@/lib/agent/router";
import { previaDoRascunho } from "@/lib/agent/previa";
import { pensarDa, type NivelPensar } from "@/lib/llm/pensar";
import { STUDIO_KINDS } from "@/lib/agent/tools";
import { getTool, runToolByName, toolsDoTurno, type ToolContext, type ApproveFn } from "@/lib/agent/runtime";
import { cardapioDeCapacidades, respostaHonesta } from "@/lib/agent/capacidades";
import { temUrl, urlsDoTexto } from "@/lib/agent/urls";
import { ehUrlDeArquivo } from "@/lib/agent/toolsWeb";
import { MAX_ANEXOS_NO_PLANO } from "@/lib/agent/anexos";
import { anexosDoCtx } from "@/lib/agent/toolsAnexo";
import { anexosEmJogo, blocoDaSintese, docsDaBaseEmJogo, lerSintese, promptDaSintese, sinteseUtil, type DocEmJogo } from "@/lib/agent/sintese";
import { sinteseLigada } from "@/lib/agent/sintese-flag";
import { valeSintetizar } from "@/lib/rag/porDocumento";
import { critiqueForState } from "@/lib/agent/examiner";
import { nullMemory } from "@/lib/agent/memory";
import { messageForError, classifyError } from "@/lib/agent/errors";
import type { AgentStep } from "@/lib/agent/actions";
import type { HarnessDeps, TrajectoryState, Step } from "@/lib/agent/trajectory";
import { MAX_VOLTAS_GATHER } from "@/lib/agent/trajectory";
import { lerAcao, promptDeAcao, resumoDaColeta, resumoDasFalhas, toolVisivel, toolsDoMenu } from "@/lib/agent/acao";
import { normalizeStudioKind } from "@/lib/agent/tools";
import type { StructuredAnswer, Source } from "@/lib/agent/contracts";
import { artefatoDeAprender, pedeAula, pedeEngenhariaReversa, DIRETRIZ_ENGENHARIA_REVERSA } from "@/lib/agent/aprender";
import { DIRETRIZ_MATEMATICA } from "@/lib/agent/matematica";
import { diretrizLivros, markdownDosLivros, type LivroAchado } from "@/lib/livros/busca";
import { anexarFontesBase, blocoDaBase } from "@/lib/rag/citar";

type GenJson = <T>(system: string, user: string, opts?: { temperature?: number; model?: string; timeoutMs?: number; phase?: string; /** em stream: o JSON acumulado a cada pedaço */ onTexto?: (acumulado: string) => void; /** o pensar desta fase (lib/llm/pensar) */ pensar?: NivelPensar; /** stream: sem o 1º pedaço nesse prazo → reserva */ prazoPrimeiroMs?: number }) => Promise<T>;

export type HarnessOpts = {
  deepThink?: boolean;
  approve?: ApproveFn;
  onStep?: (step: AgentStep) => void;
  retryDelayMs?: number;
  history?: { role: string; text: string }[]; // continuidade entre turnos (paridade com o legado)
  systemContext?: string;                      // contexto injetado (PDF/estudo em foco, admin…)
  genJson?: GenJson;            // injeção p/ teste (default = envelope real, import tardio)
  runToolImpl?: typeof runToolByName; // injeção p/ teste
  /** C5: contexto do TokenLedger de cada chamada deste turno (phase entra por call site). */
  ledger?: import("@/lib/llm/ledger").LedgerCtx;
  /** Rota do envelope: "gateway" só para a camada autônoma (turno do canal); default vertex. */
  rota?: import("@/lib/llm/envelope").Rota;
  /** Troca de identidade no system (ex.: canal fala com a voz do agente convocado) sem tocar no harness. */
  transformarSystem?: (system: string) => string;
  /** RAG: a base (turma/pessoal) deste turno. Viaja à parte — o systemContext é cortado em 4000 caracteres. */
  baseConhecimento?: import("@/lib/rag/turno").BaseDoTurno | null;
  /** Modelo Google escolhido pelo aluno (id do Vertex, já validado em lib/chat/modelos): vale pra TODAS as fases. */
  modelo?: string;
  /** Quem serviu cada chamada (o envelope pode cair na reserva): o turno mostra o da resposta no selo. */
  onModelo?: (m: { modelo: string; alvo?: string; phase?: string }) => void;
  /** a PRÉVIA da resposta (out/2026): o texto do rascunho JÁ escrito, enquanto o modelo ainda gera (lib/agent/previa)
   *  — com ele, o rascunho vai em stream. Acumulado, não pedaço. */
  onPrevia?: (texto: string) => void;
};

type Observation = { tool: string; code?: string; error?: string };

// ─────────────────── CONTRATO DE CAPACIDADE (F0 de docs/PLANO_HARNESS_AGENTICO.md) ───────────────────
const DESLIGADO = /^(0|off|false|nao|não|no)$/i;
/**
 * O cardápio de capacidades entra no prompt do rascunho E a rede contra promessa sem lastro passa
 * na resposta. O que isso conserta: «o modelo diz que vai baixar uma CSV e não baixa».
 * Ver lib/agent/capacidades.ts.
 *
 * LIGADO POR PADRÃO (decisão do dono, 2026-11-03: "queremos tudo ON"); `HARNESS_CAPACIDADE=0` é o
 * kill-switch e devolve o caminho antigo byte a byte. É runtime: basta recriar o web, sem rebuild.
 */
export function capacidadeHonestaLigada(env: Record<string, string | undefined> = process.env): boolean {
  return !DESLIGADO.test(env.HARNESS_CAPACIDADE?.trim() ?? "");
}

// ─────────────────── F2 · O MODELO ESCOLHE A FERRAMENTA (docs/PLANO_HARNESS_AGENTICO.md) ───────────────────
/**
 * Depois da coleta determinística, o modelo pode pedir MAIS ferramentas — o laço vira reentrante
 * (observar → agir → observar), que é o que o harness não tinha.
 *
 * LIGADO POR PADRÃO (decisão do dono, 2026-11-03: "queremos tudo ON"); `HARNESS_ACAO=0` é o
 * kill-switch: `proximosPassos` nem é oferecida ao motor e o turno volta a ser o de antes.
 */
export function acaoDoModeloLigada(env: Record<string, string | undefined> = process.env): boolean {
  return !DESLIGADO.test(env.HARNESS_ACAO?.trim() ?? "");
}

/**
 * Teto de POLÍTICA de voltas extras — o que responde o portão do dono sobre custo. Antes da F2 o
 * número de chamadas por turno era previsível; com o modelo escolhendo, passa a variar. O teto
 * limita a variação a **+2 chamadas de modelo no pior caso** (as tools em si não custam modelo).
 *
 * 2 é o número da casa pra "tentar de novo com limite": `maxRevisions`, `reflections`, `ensemble`
 * (lib/agent/contracts) e `TENTATIVAS_POR_SECAO` (lib/documento/escritor) são todos 2. Ajustável por
 * `HARNESS_VOLTAS_ACAO` sem deploy; 0 desliga as voltas mantendo o resto da F2.
 */
export const VOLTAS_ACAO_PADRAO = 2;
export function voltasDeAcao(env: Record<string, string | undefined> = process.env): number {
  const bruto = env.HARNESS_VOLTAS_ACAO?.trim();
  // vazio é AUSENTE, não zero. `Number("")` é 0, e com isso uma Variable em branco — que é o que
  // `${{ vars.X || '' }}` produz — desligaria as voltas em silêncio em vez de cair no padrão.
  if (!bruto) return VOLTAS_ACAO_PADRAO;
  const n = Number(bruto);
  if (!Number.isFinite(n) || n < 0) return VOLTAS_ACAO_PADRAO;
  // nunca acima do teto DURO do motor (que conta a volta inicial), por mais que o env peça
  return Math.min(Math.floor(n), MAX_VOLTAS_GATHER - 1);
}

// ───────────────────────────── A2 · retry só nesta camada ─────────────────────────────
const RETRYABLE = new Set(["tool_timeout", "network", "rate_limited"]);
export const isRetryableCode = (code?: string): boolean => !!code && RETRYABLE.has(code);

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ───────────────────────────── envelope (import tardio) ─────────────────────────────
/** genJson default = envelope C5 com ledger + phase; acumula usage.total em `medido` (reconciliação do orçamento). */
function envelopeGenJson(opts: HarnessOpts, medido: { total: number }): GenJson {
  return async (system, user, o) => {
    const envelope = await import("@/lib/llm/envelope");
    const ledger = opts.ledger ?? { agentKey: "aura", surface: "estudos" as const };
    const req = {
      system: opts.transformarSystem ? opts.transformarSystem(system) : system, user, json: true,
      model: o?.model, temperature: o?.temperature, timeoutMs: o?.timeoutMs, rota: opts.rota ?? "vertex" as const, pensar: o?.pensar, prazoPrimeiroMs: o?.prazoPrimeiroMs,
      ctx: { ...ledger, phase: o?.phase ?? ledger.phase ?? null },
    };
    const { valor, res } = o?.onTexto ? await envelope.gerarJsonStreamRes<any>(req, o.onTexto) : await envelope.gerarJsonRes<any>(req);
    medido.total += res.usage.totalTokens;
    try { opts.onModelo?.({ modelo: res.modelo, alvo: res.alvo, phase: o?.phase }); } catch { /* selo é enfeite */ }
    return valor;
  };
}

// ───────────────────────────── helpers de prompt ─────────────────────────────
/** infere o kind do Studio a partir do pedido (gerar_artefato). */
export function pickStudioKind(objective: string): string {
  const t = (objective || "").toLowerCase();
  // Mapa mental/de estudo/conceitual → `mindmap` (o cliente desenha com o archify, interativo).
  if (/mapa mental|mindmap|mapa (de estudos?|conceitual)/.test(t)) return "mindmap";
  if (/flashcard|cart[õo]es/.test(t)) return "flashcards";
  if (/linha do tempo|timeline|cronologia/.test(t)) return "timeline";
  if (/podcast|áudio|audio/.test(t)) return "podcast";
  // AULA interativa (Papermorph): pedido de aula — e também o de VÍDEO explicativo, que ela
  // substitui (o slideshow do video-pipeline depende do Imagen e nunca saiu pelo chat).
  if (pedeAula(t) || /v[íi]deo/.test(t)) return "aula";
  if (/\bfaq\b|perguntas e respostas/.test(t)) return "faq";
  // Molécula ANTES de imagem: esta linha já capturava "molécula" e devolvia "image",
  // de quando o viewer 3D não existia. Agora existe (PubChem + 3Dmol), e uma estrutura
  // química desenhada por modelo de imagem é bonita e errada.
  if (/mol[eé]cula|estrutura (molecular|qu[ií]mica)|f[oó]rmula estrutural/.test(t)) return "molecule";
  // Diagrama/esquema/fluxograma ANTES de imagem: "como funciona" é estrutura (archify, interativo
  // e fiel), não ilustração de modelo de imagem. Gráfico numérico não é diagrama — fica em imagem.
  if (/diagrama|esquema|fluxograma|como funciona/.test(t)) return "diagram";
  // "fórmula" NUNCA vira imagem (o chat renderiza LaTeX); gráfico de FUNÇÃO e figura de geometria saem
  // no texto como bloco ```grafico (lib/agent/matematica) — o roteador nem manda esses pra cá.
  if (/imagem|figura|ilustra|desenh|gr[aá]fico/.test(t)) return "image";
  return normalizeStudioKind(t); // default "guide"
}

const isGatherTool = (t: string) => t === "memory_search" || t === "literature_search" || t === "web_search" || t === "book_search";

/**
 * F1 · OS PASSOS DE URL. Vêm dos endereços que a pessoa COLOU, não da intenção: um link numa
 * saudação é um link, e `pedeAula`/`pedeLivro` já estabeleceram o padrão de regra determinística
 * mandando mais que a tabela do roteador.
 *
 * F1b · A ESCOLHA ENTRE LER E BAIXAR É PELA EXTENSÃO, não por adivinhar o pedido. Um `.pdf` não
 * pode ser "lido" pelo caminho de texto do Leitor de jeito nenhum (volta 415), e um arquivo que a
 * ingestão sabe ler é mais útil guardado — citável depois — que resumido uma vez e esquecido.
 * Deixar a decisão para o modelo é a F2; aqui ela é determinística e testável.
 *
 * Tool ausente do registry = passo não planejado. Sem Leitor, nada; com Leitor mas sem base, um
 * `.pdf` cai em `abrir_url` e falha com `tipo_nao_suportado` — que é uma observação honesta, e o
 * cardápio da F0 já disse que a casa não baixa arquivo.
 */
/**
 * F3 · OS PASSOS DE ANEXO. O arquivo da pessoa é lido no plano determinístico — assim a F3 funciona
 * com a F2 DESLIGADA (sem ela ninguém mais pediria `ler_anexo`). Com a F2 ligada, o modelo pode
 * pedir a continuação (`de`) ou um segundo arquivo.
 */
export function passosDeAnexo(ctx: unknown): Step[] {
  return anexosDoCtx(ctx)
    .slice(0, MAX_ANEXOS_NO_PLANO)
    .map((a) => ({ tool: "ler_anexo", args: { anexo: a.id } }));
}

export function passosDeUrl(objetivo: string): Step[] {
  const podeAbrir = !!getTool("abrir_url");
  const podeBaixar = !!getTool("baixar_para_base");
  if (!podeAbrir && !podeBaixar) return [];
  const passos: Step[] = [];
  for (const url of urlsDoTexto(objetivo)) {
    const arquivo = ehUrlDeArquivo(url);
    if (arquivo && podeBaixar) passos.push({ tool: "baixar_para_base", args: { url } });
    else if (podeAbrir) passos.push({ tool: "abrir_url", args: { url } });
  }
  return passos;
}

function evidenceBlock(st: TrajectoryState): string {
  if (!st.evidence.length) return "(nenhuma evidência reunida)";
  return st.evidence
    .slice(0, 12)
    .map((f, i) => `(${i + 1}) ${f.claim}${f.source ? ` — ${f.source.title}${f.source.url ? ` <${f.source.url}>` : ""}` : ""}`)
    .join("\n");
}

function obsBlock(obs: Observation[]): string {
  if (!obs.length) return "";
  return `\n\nFerramentas que FALHARAM (contorne — NÃO invente o que elas dariam):\n${obs
    .map((o) => `- ${o.tool}: ${o.code ?? o.error ?? "erro"}`)
    .join("\n")}`;
}

/**
 * Orçamento de caracteres do histórico no preâmbulo. A janela antiga eram 6 turnos
 * cortados em 500 caracteres cada — ~3 mil caracteres de memória, o que fazia a Aura
 * ser uma LLM excelente com amnésia de dez minutos. O Flash tem contexto de sobra;
 * o gargalo era esta função, não o modelo.
 */
export const ORCAMENTO_HISTORICO = 24_000;
/** Teto por turno: impede que um despejo de texto gigante coma a conversa inteira. */
export const TETO_POR_TURNO = 4_000;

/**
 * Monta o histórico de trás pra frente até estourar o orçamento, e devolve na ordem
 * cronológica. De trás pra frente porque, quando falta espaço, quem tem que sobreviver
 * é o assunto de agora — não o "oi" do começo da tarde.
 */
export function historicoNoOrcamento(
  history: { role: string; text: string }[],
  orcamento = ORCAMENTO_HISTORICO,
  bloco = 4,
): string[] {
  const linhas = history
    .map((h) => ({ h, texto: String(h?.text ?? "").trim() }))
    .filter((x) => x.texto)
    .map(({ h, texto }) => `${h.role === "user" ? "Usuário" : "Aura"}: ${texto.slice(0, TETO_POR_TURNO)}`);
  // o menor início que cabe no orçamento (as mais recentes ficam)…
  let inicio = linhas.length, gasto = 0;
  while (inicio > 0 && gasto + linhas[inicio - 1]!.length <= orcamento) { inicio--; gasto += linhas[inicio]!.length; }
  // …arredondado pra cima em BLOCOS: o começo do prompt fica parado por alguns turnos (cache implícito do Gemini)
  // (só se ainda sobrar pelo menos metade do que cabia — orçamento apertado nunca fica sem a conversa recente)
  if (inicio > 0) {
    const alinhado = Math.ceil(inicio / bloco) * bloco;
    if (linhas.length - alinhado >= Math.max(1, Math.ceil((linhas.length - inicio) / 2))) inicio = alinhado;
  }
  return linhas.slice(inicio);
}

/** Bloco de contexto (systemContext + histórico) — dá paridade com o caminho legado. */
function preambleBlock(opts: HarnessOpts): string {
  // ORDEM pro cache implícito do Gemini: o histórico (só cresce) ANTES do contexto do sistema (muda a cada turno:
  // memória, bússola, foco) — assim o começo do prompt se repete entre turnos e o cache acerta nas conversas longas.
  const bits: string[] = [];
  if (opts.history?.length) {
    const linhas = historicoNoOrcamento(opts.history);
    if (linhas.length) {
      bits.push(
        "Conversa até aqui (é a MESMA conversa — mantenha o assunto, os termos e o que já foi combinado; " +
        "não se reapresente nem recomece do zero):\n" + linhas.join("\n"),
      );
    }
  }
  if (opts.systemContext) bits.push(`Contexto do sistema:\n${String(opts.systemContext).slice(0, 4000)}`);
  return bits.length ? bits.join("\n\n") + "\n\n" : "";
}

/**
 * buscar_livro: a LISTA com os links vai no fim do `nucleo` (todo cliente renderiza o nucleo com o
 * ChatMarkdown, que torna os links clicáveis) e inteira em `livros` (pra um cartão no futuro).
 */
export function anexarLivros(a: StructuredAnswer, livros: LivroAchado[]): StructuredAnswer {
  if (!livros.length) return a;
  const lista = markdownDosLivros(livros);
  return {
    ...a,
    nucleo: [a.nucleo?.trim(), lista].filter(Boolean).join("\n\n"),
    livros: livros.map(({ titulo, autores, ano, acesso, pdfUrl, lerUrl, paginaUrl, fonte, licenca }) => ({ titulo, autores, ano, acesso, pdfUrl, lerUrl, paginaUrl, fonte, licenca })),
  };
}

function asArray(v: unknown): any[] { return Array.isArray(v) ? v : v == null ? [] : [v]; }

/**
 * Rede determinística contra o cardápio de features. A instrução no prompt resolve a
 * maioria dos casos, mas modelo é modelo: de vez em quando ele oferece "quer um mapa
 * mental disso?" mesmo mandado não oferecer. Aqui o passo simplesmente não passa.
 *
 * O CRITÉRIO É QUEM FAZ, não qual substantivo aparece. Um passo de estudo manda o ALUNO
 * fazer ("monte a linha do tempo de cabeça e compare com o livro") e é ótimo conteúdo.
 * Uma oferta põe a PLATAFORMA como sujeito ("posso gerar", "quer que eu monte", "que
 * tal eu criar") — ou cita o Studio pelo nome. Só essa cai.
 *
 * Preferimos deixar passar uma oferta a comer um passo de estudo legítimo: o filtro é
 * a rede de segurança, não a regra. A regra está no prompt.
 */
const SUJEITO_PLATAFORMA = /\b(posso|poderia|vou|eu (?:gero|crio|monto|fa[çc]o|preparo)|quer(?:es)? que eu|se (?:quiser|preferir), (?:eu|te)|que tal (?:eu|gerarmos|criarmos)|deseja que eu|gostaria que eu|te (?:gero|crio|monto|preparo))\b/i;
const RECURSO_DA_CASA = /\b(mapa mental|mindmap|flashcards?|linha do tempo|timeline|podcast|v[íi]deo|faq|infogr[áa]fico|guia de estudos?|quiz|apresenta[çc][ãa]o|slides|imagem|ilustra[çc][ãa]o)\b/i;

export function ofertaDePlataforma(passo: string): boolean {
  const t = String(passo || "");
  if (/\bstudio\b/i.test(t)) return true; // o nome da sala nunca é conteúdo
  return SUJEITO_PLATAFORMA.test(t) && RECURSO_DA_CASA.test(t);
}

/** garante o contrato mínimo do StructuredAnswer (nunca deixa o cliente sem `nucleo`). */
export function normalizeAnswer(out: Partial<StructuredAnswer> | null | undefined, st: TrajectoryState): StructuredAnswer {
  const o = out ?? {};
  const answer: StructuredAnswer = {
    nucleo: typeof o.nucleo === "string" && o.nucleo.trim() ? o.nucleo.trim() : (st.objective ? "" : ""),
  };
  if (typeof o.desenvolvimento === "string") answer.desenvolvimento = o.desenvolvimento;
  if (o.conceitos) answer.conceitos = asArray(o.conceitos).map(String).filter(Boolean);
  if (o.proximos_passos) {
    const passos = asArray(o.proximos_passos).map(String).filter(Boolean).filter((p) => !ofertaDePlataforma(p));
    if (passos.length) answer.proximos_passos = passos;
  }
  if (o.evidencia) answer.evidencia = asArray(o.evidencia).filter((e) => e && e.claim && e.source);
  if (o.sources) answer.sources = asArray(o.sources).filter((s: Source) => s && s.title);
  if (o.work && typeof o.work === "object") answer.work = o.work;
  // A substância extraída vira molécula SE ela for mesmo assunto: precisa aparecer no
  // texto da resposta. É a diferença entre "uma resposta sobre cafeína" e "uma resposta
  // que citou cafeína de passagem". Uma só — resposta não é galeria. E o PubChem ainda
  // pode negar depois; aí não nasce nada e ninguém é avisado, porque ninguém pediu.
  // Destaques: no máximo 3, cada um com LaTeX não-vazio. Teto baixo de propósito —
  // uma página com cinco fórmulas destacadas não destaca nada.
  const expressoes = asArray((o as any).expressoes)
    .filter((e: any) => e && typeof e.latex === "string" && e.latex.trim())
    .slice(0, 3)
    .map((e: any) => ({
      latex: String(e.latex).trim().replace(/^\$+|\$+$/g, ""), // modelo às vezes manda com cifrão
      rotulo: e.rotulo ? String(e.rotulo).trim().slice(0, 40) : undefined,
    }));
  if (expressoes.length) answer.destaques = expressoes;

  const substancias = asArray((o as any).substancias).map(String).map((x) => x.trim()).filter(Boolean);
  if (substancias.length && !o.artifacts) {
    const corpo = `${answer.nucleo} ${answer.desenvolvimento ?? ""}`.toLowerCase();
    const central = substancias.find((n) => n.length > 2 && corpo.includes(n.toLowerCase()));
    if (central) answer.artifacts = [{ studioKind: "molecule", title: central }] as StructuredAnswer["artifacts"];
  }
  // `artifacts` explícito (pedido direto) continua mandando — e vinha sendo DESCARTADO
  // aqui, que era por que artefato citado numa explicação nunca nascia.
  // Teto de 2 pra resposta não virar galeria, e só kinds que o Studio sabe montar.
  if (o.artifacts) {
    const refs = asArray(o.artifacts)
      .filter((a: any) => a && typeof a.studioKind === "string" && STUDIO_KINDS.includes(a.studioKind))
      .slice(0, 2)
      .map((a: any) => ({ studioKind: String(a.studioKind), title: a.title ? String(a.title) : undefined }));
    if (refs.length) answer.artifacts = refs as StructuredAnswer["artifacts"];
  }
  if (!answer.nucleo) answer.nucleo = "Não consegui elaborar uma resposta completa agora.";
  return answer;
}

/**
 * Prazo até a 1ª palavra do rascunho (só no stream): passou disso sem texto, a reserva assume — antes a falha custava o
 * prazo inteiro (30 s; 9% dos rascunhos em 7 dias). Medido em prod: 1ª palavra 0,86–1,2 s (minimal) e ~4,1 s (low).
 * Env: PRAZO_1A_PALAVRA_RAPIDO_MS · PRAZO_1A_PALAVRA_MS · PRAZO_1A_PALAVRA_TRABALHO_MS.
 */
export function prazoPrimeiraPalavra(st: { mode: string; intent: string }, env: Record<string, string | undefined> = process.env): number {
  const n = (v: string | undefined, p: number) => { const x = Number(v); return Number.isFinite(x) && x > 0 ? x : p; };
  if (st.mode === "quick") return n(env.PRAZO_1A_PALAVRA_RAPIDO_MS, 5_000);
  if (st.intent === "criar_trabalho") return n(env.PRAZO_1A_PALAVRA_TRABALHO_MS, 20_000);
  return n(env.PRAZO_1A_PALAVRA_MS, 12_000);
}

// ───────────────────────────── o adaptador ─────────────────────────────
export function buildHarnessDeps(ctx: ToolContext, opts: HarnessOpts = {}): HarnessDeps {
  const medido = { total: 0 }; // C5: tokens REAIS somados neste turno (HarnessDeps.usoMedido)
  const genJson = opts.genJson ?? envelopeGenJson(opts, medido);
  const runTool = opts.runToolImpl ?? runToolByName;
  const retryDelay = opts.retryDelayMs ?? 400;
  const modelFor = (heavy: boolean) => opts.modelo || (opts.deepThink && heavy ? GEMINI_MODEL_PRO : GEMINI_MODEL_FLASH);
  const observations: Observation[] = []; // A1 · buffer de erros-como-observação
  /** O RECIBO: as tools que de fato rodaram e deram ok neste turno. É contra isto que a rede de
   *  promessa mede — "vou baixar o PDF" é verdade se `baixar_para_base` rodou, e mentira se não. */
  const executadas = new Set<string>();
  let livrosAchados: LivroAchado[] = [];  // book_search (buscar_livro): vai inteiro pro fim do nucleo
  const preamble = preambleBlock(opts); // systemContext + histórico (paridade com o legado)
  const bloco = blocoDaBase(opts.baseConhecimento);
  const base = bloco ? `${bloco}\n\n` : ""; // depois do preâmbulo, antes do "Objetivo:" (reason e draft)
  const citaBase = opts.baseConhecimento?.status === "ok";

  /**
   * F4 · OS DOCUMENTOS EM JOGO NESTE TURNO: os anexos (que a pessoa acabou de dar — vêm primeiro) e
   * os da base, agrupados por documento pelo turno (`ctx.docsDaBase`). É a lista que decide se a
   * fase `reason` vira síntese cruzada.
   */
  const docsEmJogo = (): DocEmJogo[] => [
    ...anexosEmJogo(anexosDoCtx(ctx)),
    ...docsDaBaseEmJogo(((ctx as { docsDaBase?: { titulo: string; trechos: { texto: string }[] }[] }).docsDaBase) ?? []),
  ];
  /** Sintetizar só com a flag E com 2+ documentos: com um documento, a `reason` não ajudava (eval de out/2026). */
  const vaiSintetizar = (): boolean => sinteseLigada() && valeSintetizar(docsEmJogo());

  return {
    async classify(objective, c) {
      const r = await classify(objective, c);
      // `quick` PULA o plan() inteiro (trajectory.ts:244: draft direto). Com um link colado, o
      // caminho rápido jamais leria a página — "resume isso: <url>" tem 3 palavras e cairia em
      // `duvida_rapida`. Sobe um degrau SÓ quando a tool existe e há endereço público de verdade.
      if (r.mode === "quick" && (getTool("abrir_url") || getTool("baixar_para_base")) && temUrl(objective)) return { ...r, mode: "elaborated" };
      return r;
    },

    async plan(st) {
      const gather = st.spec.tools.filter(isGatherTool);
      // a página vem ANTES de tudo: o resto do turno (raciocínio, rascunho) deve ver o que ela diz
      const daWeb = passosDeUrl(st.objective);
      // O ARQUIVO DA PESSOA VEM PRIMEIRO, antes de página e de busca: quando há anexo, o turno é
      // quase sempre SOBRE ele. (A busca da intenção continua — "compara esse PDF com o estado da
      // arte" precisa das duas coisas, e cortar a busca aqui seria um palpite de qualidade.)
      const dosAnexos = passosDeAnexo(ctx);
      if (st.intent === "gerar_artefato") {
        return [...dosAnexos, ...daWeb, { tool: "studio_generate", args: { kind: pickStudioKind(st.objective), topic: st.objective } }];
      }
      if (st.intent === "criar_trabalho" && st.mode === "research") {
        // A6 · 2–3 perspectivas/sub-perguntas antes de fechar os steps.
        let subs: string[] = [st.objective];
        try {
          const r = await genJson<{ subquestions?: string[] }>(
            "Você planeja a pesquisa. Gere 2 a 3 SUB-PERGUNTAS/perspectivas distintas que cubram o tema com abrangência. Responda JSON {\"subquestions\":[\"...\"]}.",
            `Tema: ${st.objective}`,
            { temperature: 0.3, model: modelFor(true), timeoutMs: 15_000, phase: "plan", pensar: pensarDa("plan") },
          );
          if (Array.isArray(r?.subquestions) && r.subquestions.length) subs = r.subquestions.slice(0, 3);
        } catch { /* fallback: só o objetivo */ }
        const steps: Step[] = [...dosAnexos, ...daWeb];
        for (const t of gather) for (const q of subs) steps.push({ tool: t, args: { query: q } });
        return steps.length ? steps : [{ tool: gather[0] ?? "memory_search", args: { query: st.objective } }];
      }
      return [...dosAnexos, ...daWeb, ...gather.map((t) => ({ tool: t, args: { query: st.objective } }))];
    },

    // F2 · a volta extra. Só existe com a flag: sem ela o motor não recebe a função e o `gather`
    // roda uma vez, como antes.
    ...(acaoDoModeloLigada()
      ? {
        async proximosPassos(st: TrajectoryState): Promise<Step[]> {
          if (st.voltas >= voltasDeAcao()) return [];     // teto de POLÍTICA (o do motor é outro)
          // F3: as tools DESTE turno, não as registradas — `ler_anexo` não existe sem anexo
          const menu = toolsDoMenu(toolsDoTurno(ctx)).map(toolVisivel);
          if (!menu.length) return [];
          const { sys, user } = promptDeAcao({
            objetivo: st.objective, modo: st.mode, academico: st.academicMode, menu,
            coleta: resumoDaColeta(st.evidence), falhas: resumoDasFalhas(observations),
            voltasRestantes: voltasDeAcao() - st.voltas,
          });
          try {
            const bruto = await genJson<unknown>(sys, user, {
              temperature: 0, model: modelFor(false), timeoutMs: 12_000, phase: "acao", pensar: pensarDa("acao"),
            });
            const r = lerAcao(bruto, { disponiveis: menu, jaFeitas: st.feitas });
            // o que foi recusado vira LOG (nunca prompt): é como se mede modelo pedindo coisa que não existe
            if (r.descartadas.length) console.info(`[harness] ação descartou: ${r.descartadas.slice(0, 3).join(" · ")}`);
            if (r.chamadas.length) console.info(`[harness] ação volta ${st.voltas + 1}: ${r.chamadas.map((c) => c.tool).join(", ")}`);
            return r.chamadas.map((c) => ({ tool: c.tool, args: c.args }));
          } catch {
            return [];   // decidir é AUXILIAR, igual ao `reason`: falhar não derruba o turno, só encerra a coleta
          }
        },
      }
      : {}),

    async runTool(name, args, c) {
      // A2 · 1 retry (backoff) SÓ para timeout/network/rate — nunca p/ deny/approval/validação.
      let res = await runTool(name, args, c as ToolContext, { approve: opts.approve });
      if (!res.ok && isRetryableCode(res.code)) {
        await sleep(retryDelay);
        res = await runTool(name, args, c as ToolContext, { approve: opts.approve });
      }
      if (!res.ok) observations.push({ tool: name, code: res.code, error: res.error }); // A1
      if (res.ok) executadas.add(name);                                                // o recibo da ação
      if (res.ok && res.livros?.length) livrosAchados = res.livros;                   // a lista é do código, não do modelo
      return res;
    },

    async reason(st) {
      // F4 · SÍNTESE CRUZADA. Com 2+ documentos em jogo, esta fase deixa de ser "raciocínio genérico"
      // e passa a comparar os documentos: o que convergem, onde divergem, o que NENHUM cobre. O
      // achado da fase é que a `reason` não melhorava a resposta de UM documento (eval de out/2026,
      // por isso ela está desligada abaixo) — com vários, é exatamente o que faltava.
      if (vaiSintetizar()) {
        const docs = docsEmJogo();
        const { sys, user } = promptDaSintese({ objetivo: st.objective, docs });
        try {
          const bruto = await genJson<unknown>(sys, user, {
            temperature: 0.2, model: modelFor(true), timeoutMs: 20_000, phase: "sintese", pensar: pensarDa("sintese"),
          });
          const s = lerSintese(bruto);
          if (!sinteseUtil(s)) return "";
          console.info(`[harness] síntese de ${docs.length} documentos (${s.comum.length} convergem, ${s.divergem.length} divergem, ${s.lacunas.length} lacunas)`);
          return blocoDaSintese(s);
        } catch {
          return "";   // a síntese é auxiliar, como o resto desta fase: falhar não derruba o turno
        }
      }
      // caminho ELABORADO: sem raciocínio separado — o rascunho já recebe a evidência inteira; a chamada a mais custava
      // ~1,7 s antes da 1ª palavra e não melhorava a resposta (eval em prod, 24/out). Modo Pesquisa (trabalho, revisão)
      // mantém. Volta com RACIOCINIO_ELABORADO=1.
      if (st.mode === "elaborated" && process.env.RACIOCINIO_ELABORADO !== "1") return "";
      const sys = "Você é a Aura raciocinando ANTES de redigir. Conecte a evidência ao objetivo em 2–4 frases. Se faltou evidência, seja honesto — NUNCA invente fontes. Responda JSON {\"reasoning\":\"...\"}.";
      const user = `${preamble}${base}Objetivo: ${st.objective}\nModo: ${st.mode} · Acadêmico: ${st.academicMode}\nEvidência:\n${evidenceBlock(st)}${obsBlock(observations)}`;
      try {
        const r = await genJson<{ reasoning?: string }>(sys, user, { temperature: 0.3, model: modelFor(false), timeoutMs: 15_000, phase: "reason", pensar: pensarDa("reason") });
        return String(r?.reasoning ?? "").trim();
      } catch {
        return ""; // reasoning é auxiliar — nunca derruba o laço
      }
    },

    async draft(st) {
      const req = st.spec.required.join(", ");
      // Persona POR SALA (lib/ai/salaPersona): Pesquisa = sempre fundamentada; Estudos = objetiva, sem fonte
      // forçada. As duas: nunca beco "não encontrei" (fonte → web → conhecimento do modelo, 1 linha avisando).
      const academic = diretrizDaSala(salaDoModo(st.academicMode)) +
        (st.academicMode === "enforced"
          ? " Preencha `evidencia` com as fontes reunidas (acadêmicas ou, na falta, da web) e NUNCA fabrique fonte que não está na evidência."
          : "");
      const a5 = (st.intent === "criar_trabalho"
        ? "\nBaseie CADA afirmação de `work`/`evidencia` na evidência reunida; se a evidência for insuficiente, produza um rascunho enxuto e sinalize a limitação em `nucleo`."
        : "") + (pedeEngenhariaReversa(st.objective) ? `\n${DIRETRIZ_ENGENHARIA_REVERSA}` : "");
      const sys = [
        "Você é a Aura, parceira de estudo/pesquisa — calorosa, direta, PT-BR. Redija a resposta final.",
        // O Studio é MOBÍLIA, não assunto. Esta linha antes dizia ao modelo "você TEM o
        // Studio… sugira em proximos_passos" — e ele obedecia: toda resposta terminava
        // num cardápio de features, o que deixa qualquer resposta genérica e quebra o fio
        // da conversa. Quem decide se um artefato nasce é o código, com o dado real na mão.
        "NUNCA fale sobre você mesma, sobre a plataforma, sobre o Studio, sobre ferramentas, " +
        "recursos, botões ou o que você 'pode gerar'. Nada de cardápio de funcionalidades. " +
        "Nunca se declare incapaz de mostrar algo visual — apenas não comente o assunto: " +
        "responda o TEMA, que a parte visual é resolvida fora do texto.",
        // O CARDÁPIO DE AÇÃO entra AQUI, logo depois da regra acima, porque as duas são sobre o
        // mesmo assunto e tiram em direções opostas: aquela cala sobre FEATURES (pra resposta não
        // virar cardápio do Studio), esta OBRIGA a honestidade sobre AÇÃO. Sem ela, o silêncio da
        // regra de cima é o que produz "vou baixar a CSV" — o modelo não tem outro jeito de dizer
        // que uma ação deveria acontecer. Derivado do registry, nunca escrito à mão.
        ...(capacidadeHonestaLigada()
          ? [(() => {
            const defs = toolsDoTurno(ctx);
            // F5: a descrição vai junto, senão uma tool de conector MCP apareceria pro aluno como
            // `mcp:git:git_log` — nome de função, não capacidade.
            return cardapioDeCapacidades(defs.map((t) => t.name), new Map(defs.map((t) => [t.name, t.schema?.description])));
          })()]
          : []),
        DIRETRIZ_MATEMATICA,
        "proximos_passos, quando fizer sentido, são passos de ESTUDO (o que entender, ler, " +
        "praticar ou checar a seguir) — jamais ofertas de recurso da plataforma.",
        "Responda SOMENTE JSON válido.",
        `Campos obrigatórios: ${req}. Preencha TODOS. Schema: {nucleo, desenvolvimento?, conceitos?[], evidencia?[{claim,source:{title,url?}}], proximos_passos?[], sources?[{title,url?}], work?{kind,sections:[{title,body}]}, artifacts?[{studioKind,title}]${citaBase ? ", citacoes_base?[n]" : ""}}.`,
        // Ao modelo pedimos EXTRAÇÃO, não decisão de produto: "que substâncias esta
        // resposta menciona?" é pergunta factual, que modelo responde bem. Se a molécula
        // aparece na tela, quem decide é o código (normalizeAnswer) — e o PubChem confirma.
        // Mesmo contrato do `substancias`: EXTRAÇÃO, não decisão de estilo. O modelo diz
        // que expressões a resposta usa; o código decide se viram destaque na página.
        'Inclua também expressoes: [{"latex":"...","rotulo":"..."}] com fórmulas, equações ou ' +
        'expressões concretas que a resposta menciona — em LaTeX, sem cifrões (ex.: ' +
        '"C_8H_{10}N_4O_2", "E = mc^2", "\\\\frac{dv}{dt} = a"). Só as que a resposta realmente ' +
        'usa, no máximo 3, e nunca invente uma para enfeitar. `rotulo` é uma legenda de ' +
        'duas ou três palavras, opcional.',
        'Inclua também substancias: ["<nome>"] com as substâncias químicas concretas de que a resposta FALA ' +
        '(ex.: cafeína, glicose, etanol, ácido acético). Só o nome, sem "molécula de". ' +
        'Não liste se a resposta não falar de nenhuma, e nunca invente uma que você não tenha certeza que existe.',
        academic + a5,
        ...(st.intent === "buscar_livro" ? [diretrizLivros(livrosAchados)] : []),
      ].join("\n");
      const user = `${preamble}${base}Objetivo: ${st.objective}\n${st.reasoning ? `Raciocínio: ${st.reasoning}\n` : ""}Evidência:\n${evidenceBlock(st)}${obsBlock(observations)}`;
      try {
        // trabalho completo (artigo/TCC inteiro em `work.sections`, às vezes a partir de um texto colado) não sai em 30 s:
        // o rascunho estourava o prazo e a Aura respondia "não consegui" — 90 s só pra criar_trabalho
        const prazo = st.intent === "criar_trabalho" ? 90_000 : 30_000;
        // a PRÉVIA: com quem a escute (o chat), o rascunho vai em stream e o texto do `nucleo` sai enquanto nasce
        const onTexto = opts.onPrevia ? (acc: string) => { const t = previaDoRascunho(acc); if (t) opts.onPrevia!(t); } : undefined;
        const out = await genJson<Partial<StructuredAnswer>>(sys, user, { temperature: 0.4, model: modelFor(true), timeoutMs: prazo, phase: "draft", onTexto, pensar: pensarDa(st.mode === "quick" ? "draft_rapido" : st.mode === "elaborated" ? "draft_elaborado" : "draft"), prazoPrimeiroMs: prazoPrimeiraPalavra(st) });
        // A REDE antes dos blocos do CÓDIGO (fontes da base, lista de livros): ela julga o texto do
        // MODELO. Depois seria pior — a lista de livros traz "baixar PDF" em cada linha, e ainda que
        // hoje ela não dispare (falta o marcador de 1ª pessoa), julgar texto determinístico da casa
        // é uma classe de falso positivo que não precisa existir.
        let bruta = normalizeAnswer(out, st);
        if (capacidadeHonestaLigada()) {
          const h = respostaHonesta(bruta, executadas);
          // medir em prod: quantas respostas prometiam, e de que classe (sem o texto da conversa)
          if (h.removidas.length) console.warn(`[harness] promessa sem lastro: ${h.removidas.map((c) => c.id).join(", ")} (intent=${st.intent})`);
          bruta = h.answer;
        }
        // fontes da base: o rodapé sai do código, só com trechos que a busca devolveu (o modelo só aponta os números)
        const comBase = anexarFontesBase(bruta, opts.baseConhecimento, (out as any)?.citacoes_base);
        return anexarLivros(comBase, livrosAchados);
      } catch (e: any) {
        // degradado: núcleo honesto via messageForError (nunca string à mão), laço segue.
        // …mas a lista de livros (se a busca achou) sai mesmo assim: é dado, não depende do modelo
        return anexarLivros({ nucleo: messageForError(classifyError(String(e?.message ?? e))) }, livrosAchados);
      }
    },

    // a fase volta a existir quando há síntese a fazer (senão segue desligada no elaborado)
    pulaRaciocinio: (st) => !vaiSintetizar() && st.mode === "elaborated" && process.env.RACIOCINIO_ELABORADO !== "1",

    critique: (st) => Promise.resolve(critiqueForState(st)),

    emit(step) { opts.onStep?.(step); },

    // C5: o motor frea com o MAIOR entre estimado (COST) e medido (ledger). Só existe com o genJson default.
    ...(opts.genJson ? {} : { usoMedido: () => medido.total }),

    async persistMemory(drawers) {
      try { await nullMemory.write(drawers); } catch { /* memória nunca derruba a resposta */ }
    },
  };
}

// ───────────────────────────── mapeamento p/ o protocolo do cliente ─────────────────────────────
export type HarnessOutput =
  | { mode: "text"; text: string }
  | { mode: "structured"; answer: StructuredAnswer }   // resposta rica (carrega artifacts[] inline)
  | { mode: "studio"; kind: string; topic: string; text: string }
  | { mode: "research"; kind: string; topic: string; text: string };

/** Serializa o StructuredAnswer em texto markdown (o caminho SEM sentinela). */
export function renderStructuredAnswer(a: StructuredAnswer): string {
  const parts: string[] = [];
  if (a.nucleo) parts.push(a.nucleo.trim());
  if (a.desenvolvimento) parts.push(a.desenvolvimento.trim());
  if (a.conceitos?.length) parts.push("**Conceitos-chave:** " + a.conceitos.join(" · "));
  if (a.evidencia?.length) {
    parts.push(a.evidencia.map((e) => `- ${e.claim}${e.source ? ` (${e.source.title})` : ""}`).join("\n"));
  }
  if (a.sources?.length) {
    parts.push("**Fontes:**\n" + a.sources.map((s) => `- ${s.title}${s.url ? ` — ${s.url}` : ""}`).join("\n"));
  }
  if (a.proximos_passos?.length) {
    parts.push("**Próximos passos:**\n" + a.proximos_passos.map((p) => `- ${p}`).join("\n"));
  }
  return parts.join("\n\n").trim() || "Sem resposta agora.";
}

/**
 * Decide a saída no MESMO protocolo do cliente (StudyCoworkChat/ResearchChat):
 *   research → sentinela (trabalho no documento) · studio → sentinela (artefato PURO)
 *   · structured → sentinela com o StructuredAnswer inteiro (texto + artifacts[] na mesma bolha).
 * `topic` cai no `prompt` do cliente se vier vazio (o cliente usa `topic || prompt`).
 * `renderStructuredAnswer` segue exportado: é o fallback texto (cliente antigo / AURA_HARNESS=0).
 */
/** Heurística curta e explícita: só o suficiente pra não deixar recusa na frente do artefato. */
export function pareceRecusa(texto: string): boolean {
  const t = texto.toLowerCase();
  return /n[ãa]o (consigo|posso|sou capaz)|infelizmente|contratempo t[ée]cnico|indispon[íi]vel no momento|desculpe/.test(t);
}

export function resolveHarnessOutput(
  state: Pick<TrajectoryState, "intent" | "kind" | "artifacts">,
  answer: StructuredAnswer,
  surface: string | null | undefined,
  objective: string,
  /** chat único: o trabalho vai pro EDITOR da conversa (lib/tcc/turno), nunca pro sentinela da Sala de Pesquisa */
  opts: { trabalhoNoEditor?: boolean } = {},
): HarnessOutput {
  const arts = answer.artifacts ?? state.artifacts ?? [];
  const studioArt = arts.find((a) => a.studioKind && !a.studioKind.startsWith("research:"));
  // O modelo às vezes redige um pedido de desculpas ("não consigo gerar imagem…") e
  // logo em seguida o artefato nasce — o aluno lê a recusa e o artefato juntos, e não
  // entende nada. Quando o lead soa como recusa, o texto determinístico assume.
  const bruto = (answer.nucleo && answer.nucleo.trim()) || "";
  const lead = !bruto || pareceRecusa(bruto) ? "Já te mostro aqui." : bruto;

  // Sala de Pesquisa: pedido de TRABALHO → sentinela research (o cliente gera no documento).
  if (state.intent === "criar_trabalho" && surface === "pesquisa" && !opts.trabalhoNoEditor) {
    return { mode: "research", kind: state.kind ?? "artigo", topic: objective, text: lead };
  }
  // O ARTEFATO NÃO É MAIS A RESPOSTA.
  //
  // Antes, pedir "gera a molécula de cafeína" caía aqui e virava `mode: "studio"`: a
  // resposta inteira era jogada fora e substituída por um toco ("Já te mostro aqui.")
  // com um cartão embaixo. Isso custava caro de três formas — o aluno perdia a
  // explicação, o turno entrava no histórico como um toco (e o modelo, no turno
  // seguinte, não fazia ideia do que tinha acabado de acontecer), e o assunto morria
  // ali, que é exatamente o "quebra o ritmo".
  //
  // Agora todo turno de conversa é texto. O artefato viaja JUNTO, em `artifacts[]`, e
  // o cliente o materializa no Studio. Marcamos `explicito` quando ele foi pedido com
  // todas as letras: é o que decide se uma falha vira aviso ou silêncio.
  const comExplicito = studioArt && state.intent === "gerar_artefato"
    ? arts.map((a) => (a === studioArt ? { ...a, explicito: true } : a))
    : arts;
  // APRENDER INTERATIVO (lib/agent/aprender): pergunta de quem quer aprender/entender → um diagrama
  // interativo do assunto viaja junto (archify). Não é pedido explícito: se falhar, falha calado.
  const doAprender = artefatoDeAprender(state.intent, objective, { artifacts: comExplicito });
  const todos = doAprender ? [...comExplicito, doAprender] : comExplicito;
  return {
    mode: "structured",
    answer: todos.length ? { ...answer, artifacts: todos } : answer,
  };
}
