/**
 * lib/rag/cacheRespostas.ts — o CACHE DE RESPOSTAS da Aura (out/2026, o dono: "perguntas simples poderiam ser
 * respondidas com mais simplicidade ou até consultadas no nosso dataset"). Uma pergunta de conceito que a Aura já
 * respondeu volta em milissegundos, sem modelo nenhum (antes: ~14–33 s). Tabela `aura_cache_respostas` no MESMO
 * Postgres+pgvector do RAG (infra/zaeon-models/rag-schema.sql), com o MESMO embedding da pergunta que o RAG do turno já
 * calcula (lib/rag/embed embedPerguntaCompartilhado: uma chamada só pros dois).
 *
 * Servir resposta errada é o risco — por isso DUAS travas: o vetor da pergunta muito parecido (≥ CACHE_LIMIAR, padrão
 * 0.9) E as mesmas PALAVRAS DE CONTEÚDO ("o que é mitose?" = "explique a mitose"; "mitose" ≠ "meiose", que no vetor
 * ficam perto). E só entra pergunta AUTOCONTIDA e IMPESSOAL: sem "isso/esse/ele…" (depende da conversa), sem
 * "meu/minha…" (é da pessoa), curta; e só resposta de explicação/dúvida rápida, sem trabalho, sem erro, sem citar a
 * conversa. 👎 bloqueia a entrada; 👍 aprova (com CACHE_SO_APROVADAS=1, só as aprovadas são servidas).
 * Liga com CACHE_RESPOSTAS=1. Escopo = sala|mentor (a voz e o rigor mudam). CACHE_VERSAO sobe → tudo invalida.
 * Nunca derruba o turno: qualquer falha = "não achei" (com disjuntor de 60 s pro banco fora, como o RAG).
 */
import { ehMensagemDeErro } from "@/lib/agent/errors";
import type { RagDb } from "./pg";
import { ehBancoIndisponivel } from "./pg";

/** Subir quando o harness mudar o jeito de responder (prompts, campos): as entradas antigas deixam de valer. */
export const CACHE_VERSAO = 1;
export const LIMIAR_PADRAO = 0.9;
const PRAZO_CONSULTA_MS = 1500;
const DISJUNTOR_MS = 60_000;
const MAX_CARACTERES = 200;
const MAX_CHAVES = 6;

export type EntradaCache = { id: string; answer: Record<string, unknown>; intent: string; kind?: string; similaridade: number };

// ───────────────────────────── a pergunta (PURO) ─────────────────────────────
export const normalizarPergunta = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

/** palavras que não carregam o ASSUNTO (o que sobra é a chave) */
const VAZIAS = new Set(("a o as os um uma uns umas de da do das dos e em no na nos nas num numa por pelo pela pelos pelas para pra pro " +
  "com sem que qual quais quem como onde quando se ou ao aos sobre entre ate mais muito muita bem " +
  "e eh sao ser foi era sera seria tem ter faz fazer significa significado definicao conceito " +
  "explique explica explicar explicacao defina definir me fale fala falar diga dizer conte contar ensine ensina " +
  "oque oq quer dizer existe existem algum alguma voce aura poderia pode " +
  "oi ola opa eai bom boa dia tarde noite tudo obrigado obrigada valeu vlw tchau ate logo ok blz beleza sim nao").split(" "));
// (ficam como CONTEÚDO de propósito: "funciona", "serve", "acontece", "porque", "diferenca" — "como funciona a vacina?"
//  não pode receber a resposta de "o que é vacina?", nem "por que o céu é azul?" a de "o céu é azul?")
/** depende da CONVERSA (não é autocontida): "e o núcleo?", "explica isso", "dele"… */
const ANAFORA = /(^| )(isso|isto|esse|essa|esses|essas|este|esta|estes|estas|aquilo|aquele|aquela|ele|ela|eles|elas|dele|dela|deles|delas|disso|desse|dessa|nisso|anterior|acima|de novo|outra vez|continue|continua|mais exemplos?)( |$)/;
/** é da PESSOA (não serve pra outro aluno) */
const PESSOAL = /(^| )(meu|minha|meus|minhas|mim|comigo|eu|nosso|nossa|nossos|nossas|minha turma|meu trabalho|minha prova)( |$)/;

/** as palavras de conteúdo, sem plural simples, ordenadas e sem repetição — a 2ª trava do cache */
export function chavesDaPergunta(s: string): string[] {
  const set = new Set(normalizarPergunta(s).replace(/\bpor que\b|\bpq\b/g, "porque").replace(/\b(funcionam)\b/g, "funciona").replace(/\b(servem)\b/g, "serve").replace(/\b(acontecem)\b/g, "acontece").split(" ").filter((w) => w.length > 1 && !VAZIAS.has(w)).map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w)));
  return [...set].sort();
}

/** a pergunta pode ir pro cache (consultar e guardar)? */
export function perguntaCacheavel(pergunta: string): boolean {
  const n = normalizarPergunta(pergunta);
  if (!n || pergunta.length > MAX_CARACTERES || n.startsWith("e ") || n.startsWith("mas ")) return false;
  if (ANAFORA.test(n) || PESSOAL.test(n)) return false;
  const k = chavesDaPergunta(pergunta);
  return k.length >= 1 && k.length <= MAX_CHAVES;
}

/** a resposta pode ser guardada? (explicação/dúvida rápida, com corpo, sem trabalho/TCC/vídeo, sem citar a conversa) */
const CITA_CONVERSA = /(como (j[aá] )?(conversamos|falamos|vimos|combinamos)|voc[eê] (me )?(disse|contou|mencionou|perguntou)|seu trabalho|sua prova|sua turma|na nossa conversa)/i;
export function respostaGuardavel(answer: Record<string, any>, intent: string, degradada = false): boolean {
  if (degradada || !["explicar_conceito", "duvida_rapida"].includes(intent)) return false;
  // CINTO: mesmo que alguém esqueça o `degraded`, mensagem de erro nunca vira resposta guardada pra outros alunos
  if (answer?.rascunhoFalhou || ehMensagemDeErro(answer?.nucleo)) return false;
  const nucleo = String(answer?.nucleo ?? "");
  if (nucleo.length < 40 || answer?.work || answer?.tcc || answer?.videoDoc) return false;
  const texto = `${nucleo} ${String(answer?.desenvolvimento ?? "")}`;
  return !CITA_CONVERSA.test(texto);
}

export const escopoDoCache = (sala: string, mentor: string | null | undefined) => `${sala}|${mentor ?? "aura"}`;
export const cacheLigado = (env: Record<string, string | undefined> = process.env) => env.CACHE_RESPOSTAS === "1";
const limiar = (env: Record<string, string | undefined> = process.env) => { const v = Number(env.CACHE_LIMIAR); return Number.isFinite(v) && v > 0.5 && v <= 1 ? v : LIMIAR_PADRAO; };
const vetorSql = (v: number[]) => `[${v.join(",")}]`;

// ───────────────────────────── o banco ─────────────────────────────
let disjuntorAte = 0;
const comPrazo = <T,>(p: Promise<T>, ms: number) => new Promise<T>((ok, erro) => { const t = setTimeout(() => erro(new Error("cache_prazo")), ms); p.then((v) => { clearTimeout(t); ok(v); }, (e) => { clearTimeout(t); erro(e); }); });

/** procura a resposta guardada: o vizinho mais perto no escopo/versão, válido, com similaridade ≥ limiar E as mesmas chaves */
export async function consultarCache(db: RagDb, o: { pergunta: string; vetor: number[]; escopo: string; env?: Record<string, string | undefined>; agora?: () => number }): Promise<EntradaCache | null> {
  const agora = o.agora ?? Date.now, env = o.env ?? process.env;
  if (agora() < disjuntorAte) return null;
  const soAprovadas = env.CACHE_SO_APROVADAS === "1";
  try {
    const { rows } = await comPrazo(db.query<{ id: string; resposta: any; chaves: string[]; similaridade: number }>(
      `SELECT id, resposta, chaves, 1 - (embedding <=> $1::vector) AS similaridade
         FROM aura_cache_respostas
        WHERE escopo = $2 AND versao = $3 AND expira_em > now()
          AND ${soAprovadas ? "aprovada" : "(votos_neg = 0 OR (aprovada AND votos_pos > votos_neg))"}
        ORDER BY embedding <=> $1::vector
        LIMIT 3`,
      [vetorSql(o.vetor), o.escopo, CACHE_VERSAO]), PRAZO_CONSULTA_MS);
    const chaves = chavesDaPergunta(o.pergunta).join(" "), lim = limiar(env);
    const r = rows.find((x) => Number(x.similaridade) >= lim && (x.chaves ?? []).join(" ") === chaves);
    if (!r?.resposta?.answer) return null;
    void db.query(`UPDATE aura_cache_respostas SET usos = usos + 1, ultimo_uso = now() WHERE id = $1`, [r.id]).catch(() => undefined);
    return { id: r.id, answer: r.resposta.answer, intent: r.resposta.intent ?? "explicar_conceito", kind: r.resposta.kind, similaridade: Number(r.similaridade) };
  } catch (e) {
    if (ehBancoIndisponivel(e) || String((e as Error)?.message).includes("cache_prazo")) disjuntorAte = agora() + DISJUNTOR_MS;
    else if (!/aura_cache_respostas/.test(String((e as Error)?.message))) console.error("[cache] consulta falhou:", (e as Error)?.message);
    return null;   // (tabela ainda não criada → só não acha)
  }
}

/** guarda a resposta (a mesma pergunta normalizada no escopo/versão é substituída: a mais nova vale) */
export async function guardarNoCache(db: RagDb, o: { pergunta: string; vetor: number[]; escopo: string; answer: Record<string, unknown>; intent: string; kind?: string; modelo?: string | null }): Promise<void> {
  if (Date.now() < disjuntorAte) return;
  await db.query(
    `INSERT INTO aura_cache_respostas (escopo, versao, pergunta, pergunta_norm, chaves, embedding, resposta, modelo)
     VALUES ($1, $2, $3, $4, $5, $6::vector, $7::jsonb, $8)
     ON CONFLICT (escopo, versao, pergunta_norm) DO UPDATE
       SET resposta = EXCLUDED.resposta, embedding = EXCLUDED.embedding, chaves = EXCLUDED.chaves, modelo = EXCLUDED.modelo,
           expira_em = now() + interval '30 days'
       WHERE aura_cache_respostas.votos_neg = 0`,
    [o.escopo, CACHE_VERSAO, o.pergunta.slice(0, MAX_CARACTERES), normalizarPergunta(o.pergunta), chavesDaPergunta(o.pergunta), vetorSql(o.vetor),
      JSON.stringify({ answer: o.answer, intent: o.intent, kind: o.kind }), o.modelo ?? null]);
}

/** o 👍/👎 do aluno numa resposta: 👎 bloqueia a entrada daquela pergunta (em todo escopo); 👍 aprova */
export async function votarNoCache(db: RagDb, pergunta: string, voto: "up" | "down"): Promise<void> {
  const n = normalizarPergunta(pergunta);
  if (!n) return;
  await db.query(voto === "down"
    ? `UPDATE aura_cache_respostas SET votos_neg = votos_neg + 1 WHERE pergunta_norm = $1`
    : `UPDATE aura_cache_respostas SET votos_pos = votos_pos + 1, aprovada = true WHERE pergunta_norm = $1`, [n]);
}

/** (testes) zera o disjuntor */
export const _zerarDisjuntor = () => { disjuntorAte = 0; };
