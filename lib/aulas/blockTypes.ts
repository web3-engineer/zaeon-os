/**
 * Registro ÚNICO dos tipos de bloco interativo da aula (Lote 9 — Studio de Aulas).
 *
 * O dock do Studio e o menu "/" listam os blocos a partir DESTE registro (nada hardcoded),
 * e a IA usa `genHint` pra gerar cada um. `ready` = implementado ponta-a-ponta nesta versão
 * (os 4 tipos de PERGUNTA); os 5 jogos entram como scaffold (ready:false) — somáveis sem
 * refatorar. `baseType` mapeia pro `type` do AulaQuestion subjacente (correção em lib/aulas/grade).
 */
export type AulaBlockKind =
  | "q-voice" | "q-choice" | "q-written" | "q-roulette"        // PERGUNTAS (foco do Lote 9)
  | "q-cloze" | "flashcards" | "q-dragwords" | "game-memory" | "branching"; // jogos (scaffold)

export type AulaBlockDef = {
  kind: AulaBlockKind;
  label: string;
  emoji: string;
  evaluable: boolean; // entra na pontuação da aula
  ready: boolean;     // implementado ponta-a-ponta nesta versão
  baseType: string;   // type do AulaQuestion subjacente (choice|input|open|voice|roulette|cloze|…)
  genHint: string;    // instrução pra IA gerar 1 bloco deste tipo
};

export const AULA_BLOCKS: AulaBlockDef[] = [
  { kind: "q-voice", label: "Pergunta por voz", emoji: "🎤", evaluable: true, ready: true, baseType: "voice",
    genHint: 'Gere 1 pergunta para o aluno responder FALANDO. Enunciado claro. Se houver resposta objetiva, liste em "accepted"; senão deixe vazio (correção manual).' },
  { kind: "q-choice", label: "Múltipla escolha", emoji: "🔘", evaluable: true, ready: true, baseType: "choice",
    genHint: 'Gere 1 pergunta de múltipla escolha estilo ENEM: 4 a 5 alternativas em "options" [{text,isCorrect,explanation}], EXATAMENTE 1 com isCorrect=true, cada uma com uma explicação curta.' },
  { kind: "q-written", label: "Resposta escrita", emoji: "✍️", evaluable: true, ready: true, baseType: "input",
    genHint: 'Gere 1 pergunta de resposta ESCRITA curta. Liste respostas aceitas em "accepted" (variações). Se for dissertativa/aberta, use type "open" (correção manual).' },
  { kind: "q-roulette", label: "Roleta de perguntas", emoji: "🎯", evaluable: true, ready: true, baseType: "roulette",
    genHint: 'Gere um POOL de 4 a 6 perguntas variadas (choice e input) em config.pool [{text,type,options?,accepted?}], e config.rounds = quantas a roleta sorteia.' },

  // ── jogos interativos (scaffold — registrados, render/edição completos entram depois) ──
  { kind: "q-cloze", label: "Completar lacunas", emoji: "🧩", evaluable: true, ready: false, baseType: "cloze",
    genHint: 'Gere um texto com lacunas marcadas como *palavra* (a palavra entre asteriscos é a resposta). Tema dado pelo professor.' },
  { kind: "flashcards", label: "Cards de revisão", emoji: "🃏", evaluable: false, ready: false, baseType: "flashcards",
    genHint: 'Gere config.cards = [{front,back}] (pergunta↔resposta) de revisão sobre o tema.' },
  { kind: "q-dragwords", label: "Arrastar palavras", emoji: "✋", evaluable: true, ready: false, baseType: "dragwords",
    genHint: 'Gere config.sentence com vãos e config.words (banco de palavras) para arrastar ao lugar certo.' },
  { kind: "game-memory", label: "Jogo da memória", emoji: "🧠", evaluable: false, ready: false, baseType: "memory",
    genHint: 'Gere config.pairs = [{a,b}] (termo↔definição) para o jogo da memória.' },
  { kind: "branching", label: "Cenário ramificado", emoji: "🌿", evaluable: false, ready: false, baseType: "branching",
    genHint: 'Gere config.nodes = [{id,content,choices:[{label,nextId}]}] — um grafo de decisões simples sobre o tema.' },
];

const BY_KIND = new Map(AULA_BLOCKS.map((b) => [b.kind, b]));
export function aulaBlock(kind: string): AulaBlockDef | undefined { return BY_KIND.get(kind as AulaBlockKind); }

/** Tipos prontos ponta-a-ponta nesta versão (os 4 de pergunta). */
export const READY_BLOCKS = AULA_BLOCKS.filter((b) => b.ready);
/** Tipos avaliáveis (entram na pontuação). */
export const EVALUABLE_KINDS = new Set(AULA_BLOCKS.filter((b) => b.evaluable).map((b) => b.kind));
