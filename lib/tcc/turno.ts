/**
 * Ponte chat da Sala de Estudos ⇄ TCC, para UM turno do harness (mesmo desenho do
 * lib/cartolina/memoria-turno.ts). O route só chama estas funções; a regra mora aqui, atrás de
 * TCC_CROSS. Ambas são BEST-EFFORT: o TCC nunca derruba a resposta da Aura.
 *
 * - `tccContextoParaTurno`: se a conversa já tem TCC, a Aura sabe (bloco no systemContext) e é
 *   instruída a devolver `work.sections` só com o que muda — o MESMO campo que ela já usa.
 * - `tccDoTurno`: "crie um TCC sobre X" CRIA o TCC amarrado à conversa (scopeId); nos turnos
 *   seguintes, `work.sections` vira operação por seção (origem "estudos", aplicada direto).
 *
 * Não chama modelo: só lê/escreve o que a resposta já trouxe. Com o work sem seções (o modelo não
 * escreveu nada), cai no esqueleto + geração em background (lib/tcc/gerar.ts) e o cliente faz poll.
 */
import type { IntentId, StructuredAnswer, WorkKind } from "@/lib/agent/contracts";
import { sanitizeScopeId } from "@/lib/cartolina/route-auth";
import { lerBriefing, type Briefing } from "@/lib/tcc/briefing";
import { aplicarNoTcc, criarTcc, findTccDoEscopo, listarTrabalhosDoEscopo, tccCrossOn, referenciasNovas, type FonteVerificada, type TccView } from "@/lib/tcc/store";
import { ESQUELETO_TCC, chaveTitulo, esqueletoDe, opsDeWork, palavras } from "@/lib/tcc/secoes";
import { researchWorkType } from "@/lib/agent/tools";
import { cartolinaMemoriaOn, createBoard, findOwnBoard, patchBoard } from "@/lib/cartolina/store";
import { fundirNoBoard } from "@/lib/cartolina/fromStructured";

export type TccTurno = {
  workId: string; titulo: string; criado: boolean; alteradas: number; gerando?: boolean;
  /** chat único: "TCC" | "Artigo" | "Relatório" — o rótulo da pasta do trabalho no topo do chat */
  tipo?: string;
};

const MAX_CONTEXTO = 1200;

/** "crie um TCC sobre a fotossíntese" → "a fotossíntese" (o tema, sem o verbo/pedido). */
export function temaDoPedido(prompt: string): string {
  const t = String(prompt || "").replace(/\s+/g, " ").trim();
  const m = t.match(/\b(?:sobre|acerca de|a respeito de|com o tema|tema:?)\s+(.+)$/i);
  const tema = (m ? m[1] : t).replace(/[.!?]+$/, "").trim();
  return tema.slice(0, 160) || "TCC";
}

/**
 * Título e seções de PARTIDA, a partir do pedido.
 *
 * O defeito que isto conserta: o título vinha de `temaDoPedido`, que num pedido longo devolve
 * `prompt.slice(0,160)` — o preâmbulo da instrução cortado no meio da palavra. Ver o cabeçalho de
 * lib/tcc/briefing.ts; foi medido com o pedido real que quebrou.
 *
 * Num briefing o título nasce PROVISÓRIO e quem o nomeia é o esboço (chamada que já acontece, e
 * que agora recebe o pedido inteiro). E as seções do pedido vencem o template (decisão do dono):
 * sem plano no pedido, o esqueleto de sempre.
 */
export function partidaDoPedido(prompt: string, esqueleto: string[]): {
  brief: Briefing; titulo: string; secoes: { titulo: string }[];
} {
  const brief = lerBriefing(prompt);
  const titulo = brief.ehBriefing ? TITULO_PROVISORIO : temaDoPedido(prompt);
  const secoes = brief.secoes.length
    ? comReferencias(brief.secoes.map((s) => ({ titulo: s.titulo.toUpperCase().slice(0, 120) })))
    : esqueleto.map((titulo) => ({ titulo }));
  return { brief, titulo, secoes };
}

/**
 * O plano do pedido quase nunca lista REFERÊNCIAS — quem escreve "Seção 1: Introdução… Seção 6:
 * Limitações" está enumerando o que quer REDIGIDO, não a bibliografia. Só que o trilho D2
 * (`referenciasNovas`) procura exatamente uma seção com esse nome pra depositar o que foi citado;
 * sem ela, a bibliografia some em silêncio e o documento fica com citações no corpo e nenhuma
 * lista no fim.
 *
 * Então ela é ACRESCENTADA no fim quando o pedido não a trouxe. É o único acréscimo que fazemos
 * ao plano de alguém, e tem motivo mecânico, não de gosto: sem ela uma peça do motor deixa de
 * funcionar. Se o pedido já tiver a sua (com qualquer grafia que o `referenciasNovas` reconheça),
 * nada é acrescentado.
 */
function comReferencias(secoes: { titulo: string }[]): { titulo: string }[] {
  const temRefs = secoes.some((s) =>
    /^referencias?$|^referencias bibliograficas$/.test(chaveTitulo(s.titulo).replace(/-/g, " ").trim()),
  );
  return temRefs ? secoes : [...secoes, { titulo: "REFERÊNCIAS" }];
}

/** Enquanto o esboço não nomeia. Nunca aparece pronto: a 1ª coisa que a geração faz é renomear. */
export const TITULO_PROVISORIO = "Documento em preparação";

/** Pedido de TCC (não de qualquer trabalho): o roteador diz `tcc`, ou o texto diz. */
export function ehPedidoDeTcc(intent: IntentId | undefined, kind: WorkKind | undefined, prompt: string): boolean {
  if (intent !== "criar_trabalho") return false;
  if (kind === "tcc") return true;
  const t = String(prompt || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return /\btcc\b|monografia|trabalho de conclusao/.test(t);
}

const semAcento = (s: string) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** CHAT ÚNICO: qualquer trabalho escrito (artigo, TCC, relatório, pesquisa) — aula é artefato, não trabalho. */
export function ehPedidoDeTrabalho(intent: IntentId | undefined, kind: WorkKind | undefined): boolean {
  return intent === "criar_trabalho" && kind !== "aula";
}

/** "outro / mais um / um novo … sobre Y" — pede um trabalho a MAIS, não mexer no que está aberto. */
const OUTRO_RE = /(^|\s)(outr[oa]|mais uma?|uma? nov[oa]|segund[oa]|another|new)(\s|$)/;
/** fala de uma parte do trabalho aberto (ou de mexer nele) — é edição, não trabalho novo. */
const PARTE_RE = /(introducao|metodologia|conclus|consideracoes finais|resumo|abstract|referencia|referencial|resultado|discussao|justificativa|objetivo|secao|capitulo|paragrafo|continu|termin|complet|revis|reescrev|melhor|ajust|expand|aument|encurt|corrij)/;
const TEMA_RE = /\b(sobre|acerca de|a respeito de|com o tema|tema:?|about|on)\s+\S/;
/**
 * "mexa no que já existe", dito com todas as letras e logo no começo do pedido. Só isto faz um
 * briefing com plano de seções virar edição — o resto do texto não conta, porque num briefing as
 * palavras de seção aparecem como TÍTULOS, não como alvo.
 */
const EDICAO_EXPLICITA = /^.{0,80}?\b(atualiz|edit|reescrev|revis|corrij|ajust|melhor|complet|continu|expand|encurt|refa[çc]|troqu|substitu)\w*\b.{0,40}?\b(trabalho|documento|artigo|tcc|texto|relatorio|monografia|secao|capitulo)\b/s;

/**
 * Num pedido de trabalho com um trabalho já aberto na conversa: é um trabalho NOVO ou é pra mexer no
 * aberto? Sem trabalho → novo. "outro/mais um sobre Y" → novo. Fala de seção/revisão → edição.
 * Senão, tema diferente do aberto → novo; mesmo tema → edição (o "escreva o artigo" de novo).
 */
export function pedeNovoTrabalho(prompt: string, aberto: Pick<TccView, "titulo"> | null): boolean {
  if (!aberto) return true;
  const t = semAcento(prompt);
  if (OUTRO_RE.test(t) && (TEMA_RE.test(t) || /(artigo|paper|tcc|relatorio|trabalho|pesquisa|monografia|ensaio)/.test(t))) return true;
  /**
   * 🔴 BRIEFING COM PLANO PRÓPRIO É TRABALHO NOVO — e isto é o conserto de um defeito que chegou
   * por relato de usuária, DEPOIS de a D7 já estar no ar.
   *
   * O `PARTE_RE` abaixo procura "introducao", "metodologia", "referencia", "secao"… porque foi
   * escrito para "melhore a introdução", onde o substantivo É o alvo da edição. Num briefing essas
   * mesmas palavras são os NOMES DAS SEÇÕES PEDIDAS — então todo pedido elaborado casava com
   * `PARTE_RE` e era roteado como edição do documento aberto. E no caminho de edição o briefing
   * nunca chega ao gerador: nem as seções do pedido, nem as referências obrigatórias, nem os
   * marcadores. A D7 consertou a criação, e a pessoa que já tinha um documento na conversa nunca
   * passava por ela.
   *
   * Quem traz plano de seções está pedindo um DOCUMENTO, não um ajuste — a não ser que diga, com
   * todas as letras, que é pra mexer no que já existe (`EDICAO_EXPLICITA`).
   */
  if (!EDICAO_EXPLICITA.test(t) && lerBriefing(prompt).secoes.length >= 2) return true;
  if (PARTE_RE.test(t)) return false;
  if (!TEMA_RE.test(t)) return false;
  return chaveTitulo(temaDoPedido(prompt)) !== chaveTitulo(aberto.titulo);
}

/** O bloco do CHAT ÚNICO: todos os trabalhos da conversa, com o que está aberto no editor marcado. */
export function contextoDosTrabalhos(lista: TccView[], abertoId?: string | null): string {
  if (!lista.length) return "";
  const aberto = lista.find((w) => w.id === abertoId) ?? lista[0];
  const linhas = lista.map((w, i) =>
    `${i + 1}) "${w.titulo}" (${w.workType || "Trabalho"}, ${w.secoes.length} seções, ${w.secoes.reduce((n, s) => n + palavras(s.corpo), 0)} palavras)${w.id === aberto.id ? " ← ABERTO NO EDITOR" : ""}`);
  return montarBloco({
    cabecalho: [`TRABALHOS ESCRITOS NESTA CONVERSA (o aluno os vê no editor, cada um numa pasta no topo do chat):`],
    dados: linhas,
    // O ABERTO é o que vai ser ESCRITO, então vai com o começo do corpo de cada seção e não só com
    // o título. Até aqui ia só o título: a D3 já tinha achado e consertado exatamente isto no
    // `contextoDoTcc` ("o chat sabia que a seção existia e não fazia ideia do que ela dizia"), e o
    // chat único, que nasceu depois, voltou ao estado anterior à D3. Com `opsDeWork` trocando o
    // corpo inteiro no título igual, escrever às cegas não dessincroniza: APAGA.
    cabecalhoSecoes: `Seções do aberto ("${aberto.titulo}"), com o começo do que já está escrito em cada uma:`,
    secoes: aberto.secoes.length ? aberto.secoes : [{ titulo: "(nenhuma seção ainda)", corpo: "" }],
    regras: [
      "NÃO contradiga o que já está escrito acima. Se o que você vai dizer diverge, diga que está CORRIGINDO",
      "e devolva a seção corrigida — não deixe as duas versões de pé.",
      "Pedido para escrever/continuar/mudar o trabalho ABERTO: devolva `work.sections` só com as seções que mudam",
      "(MESMO título SUBSTITUI a seção inteira; título novo vira seção nova), corpo completo, rigor acadêmico.",
      "Como substituir apaga o que estava lá, só mande uma seção que você acabou de ver acima — e mande-a INTEIRA,",
      "preservando o que já valia. Para só acrescentar, use um título novo.",
      "Pedido de um trabalho NOVO ('agora outro sobre Y', 'um artigo sobre Z'): escreva-o INTEIRO em `work.sections`",
      "— ele vira um documento NOVO (os anteriores ficam como estão). Conversa que não é sobre trabalho: sem `work`.",
    ],
    teto: MAX_CONTEXTO * 2,
  });
}

/**
 * D3 · quanto de CADA seção o chat enxerga. 180 caracteres não é resumo: é o suficiente pro modelo
 * saber do que a seção trata e não dizer o contrário dela. O teto total (`MAX_CONTEXTO`) continua
 * valendo por cima, então documento grande não estoura o prompt.
 */
export const EXTRATO_SECAO = 180;

/**
 * Abaixo disto o extrato não informa nada — 20 caracteres de uma seção não dizem do que ela trata,
 * só ocupam prompt. Então ele sai de cena e sobra o título com a contagem, que ao menos diz que a
 * seção EXISTE e tem texto dentro.
 */
export const MIN_EXTRATO = 40;

const extrato = (corpo: string, limite: number = EXTRATO_SECAO): string => {
  const t = String(corpo ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > limite ? `${t.slice(0, limite).trimEnd()}…` : t;
};

type SecaoVista = { titulo: string; corpo: string };
const vazia = (s: SecaoVista) => !String(s.corpo ?? "").trim();
const custo = (ls: readonly string[]) => ls.reduce((n, l) => n + l.length + 1, 0);
const marcaCorte = (n: number) => `(… +${n} trabalho${n > 1 ? "s" : ""} não listado${n > 1 ? "s" : ""} por tamanho)`;
const marcaSecoes = (n: number) => `(… +${n} seç${n > 1 ? "ões" : "ão"} não listada${n > 1 ? "s" : ""} por tamanho — NÃO substitua seção que não está nesta lista)`;
/**
 * Documento com seções demais para caber o texto de cada uma. O modelo tem de saber que existe
 * texto invisível ANTES de mandar uma substituição, porque substituir apaga justamente o que ele
 * não viu. Começa com "…" de propósito: é o sinal de corte do bloco.
 */
const MARCA_SEM_EXTRATO = "(… seções demais para mostrar o texto de cada uma: peça o trecho antes de SUBSTITUIR qualquer seção)";

/**
 * O TETO do bloco, com duas leis — e as duas nasceram de defeito MEDIDO, não de preferência.
 *
 * 1 · REGRA NUNCA É CORTADA. Antes o corte era `bloco.slice(0, teto)` sobre o bloco já montado, e
 *     as regras moram no FIM: documento grande levava embora justamente a instrução de como
 *     escrever nele. Medido com as 6 seções do esqueleto ABNT preenchidas — o `contextoDoTcc`
 *     perdia o "NÃO contradiga", que é a trava contra o chat afirmar o oposto do documento. O
 *     conserto da D3 (dar visão ao modelo) estava comendo a própria regra da D3.
 *
 * 2 · NENHUMA SEÇÃO DESAPARECE. Seção invisível é seção que o modelo sobrescreve às cegas, porque
 *     `opsDeWork` transforma título igual em `substituir` com o corpo INTEIRO. Então o que encurta
 *     é o EXTRATO de cada seção, reparando o orçamento entre elas — nunca a lista. É a diferença
 *     entre o modelo ver pouco de tudo e não ver nada de metade.
 *
 * Só os OUTROS trabalhos (não o aberto) podem sair por tamanho, e quando saem isso é DITO, não
 * escondido: o modelo precisa saber que a lista está incompleta antes de dizer "você não tem".
 */
function montarBloco(o: {
  cabecalho: readonly string[];
  /** linhas cortáveis por inteiro (os trabalhos da conversa) */
  dados?: readonly string[];
  cabecalhoSecoes?: string;
  secoes?: readonly SecaoVista[];
  regras: readonly string[];
  teto: number;
}): string {
  const dados = o.dados ?? [], secoes = o.secoes ?? [];
  const fixo = custo(o.cabecalho) + custo(o.regras) + (o.cabecalhoSecoes ? o.cabecalhoSecoes.length + 1 : 0);
  const curtas = secoes.map((s) => (vazia(s) ? `- ${s.titulo}: (vazia)` : `- ${s.titulo} (${palavras(s.corpo)} palavras)`));
  const reservaSec = secoes.length ? marcaSecoes(secoes.length).length + 1 : 0;

  /**
   * A LISTA das seções com um espaço EXTRA reservado. Roda duas vezes: a primeira sem reserva (o
   * caso comum, em que o extrato cabe e nenhum aviso é preciso) e, se o extrato não couber, a
   * segunda reservando o aviso — porque um aviso acrescentado fora do orçamento é exatamente o
   * defeito que este módulo existe pra consertar, e eu o cometi na primeira versão deste código.
   */
  const ajustar = (extra: number) => {
    const mantidas: string[] = [];
    let uso = 0;
    for (const l of curtas) {
      const reserva = curtas.length - mantidas.length - 1 > 0 ? reservaSec : 0;
      if (fixo + extra + uso + l.length + 1 + reserva > o.teto) break;
      mantidas.push(l);
      uso += l.length + 1;
    }
    const cortadas = curtas.length - mantidas.length;
    const pos = cortadas ? [marcaSecoes(cortadas)] : [];
    const livre = Math.max(0, o.teto - fixo - extra - uso - custo(pos));
    // o extrato fica com o que sobra depois de a lista dos trabalhos levar no máximo METADE: a
    // lista é inventário e o extrato é a defesa contra sobrescrever às cegas — inventário não
    // ganha da defesa. (−5 por seção: os `: ""` e o `…` do corte.)
    const comCorpo = secoes.slice(0, mantidas.length).filter((s) => !vazia(s)).length;
    const paraExtrato = livre - Math.min(custo(dados), Math.floor(livre / 2));
    const limite = comCorpo ? Math.max(0, Math.min(EXTRATO_SECAO, Math.floor(paraExtrato / comCorpo) - 5)) : 0;
    return { mantidas, pos, comCorpo, limite, mostra: limite >= MIN_EXTRATO };
  };

  let a = ajustar(0);
  const avisa = !a.mostra && a.comCorpo > 0;
  if (avisa) a = ajustar(MARCA_SEM_EXTRATO.length + 1);

  const linhasSecoes = a.mantidas.map((curta, i) => {
    const s = secoes[i];
    if (vazia(s) || !a.mostra) return curta;
    return `- ${s.titulo} (${palavras(s.corpo)} palavras): "${extrato(s.corpo, a.limite)}"`;
  });
  // Nenhum extrato caber é informação, não detalhe: o modelo precisa saber que existe texto que ele
  // NÃO está vendo antes de mandar uma substituição que apaga justamente esse texto.
  if (avisa && !a.mostra) linhasSecoes.push(MARCA_SEM_EXTRATO);

  // Os trabalhos: cabem os que couberem. O que não couber é DITO — o modelo não pode concluir "você
  // não tem outro documento" de uma lista cortada. E o aviso também passa pelo orçamento.
  const espaco = o.teto - fixo - custo(linhasSecoes) - custo(a.pos);
  const reservaMarca = dados.length ? marcaCorte(dados.length).length + 1 : 0;
  const dentro: string[] = [];
  let usado = 0;
  for (const l of dados) {
    const reserva = dados.length - dentro.length - 1 > 0 ? reservaMarca : 0;
    if (usado + l.length + 1 + reserva > espaco) break;
    dentro.push(l);
    usado += l.length + 1;
  }
  const faltam = dados.length - dentro.length;
  const marca = faltam ? marcaCorte(faltam) : "";
  const linhasDados = marca && usado + marca.length + 1 <= espaco ? [...dentro, marca] : dentro;

  return [
    ...o.cabecalho, ...linhasDados,
    ...(o.cabecalhoSecoes ? [o.cabecalhoSecoes] : []), ...linhasSecoes, ...a.pos,
    ...o.regras,
  ].join("\n");
}

/**
 * O bloco que a Aura lê quando a conversa já tem TCC ("" se desligado / sem TCC).
 *
 * D3 · ATÉ AQUI eram só título e contagem de palavras — ou seja, o chat sabia que a seção existia e
 * não fazia ideia do que ela dizia. Resultado: podia afirmar na conversa o contrário do que está
 * escrito na aba ao lado, sem nenhuma trava, e o aluno ficava com duas versões da mesma coisa.
 * Agora vai um extrato de cada seção. Custa prompt em todo turno com documento aberto, e é o preço
 * de o chat e o documento serem a mesma cabeça.
 */
export function contextoDoTcc(t: TccView): string {
  return montarBloco({
    cabecalho: [`TCC EM CONSTRUÇÃO NESTA CONVERSA: "${t.titulo}" (o aluno vê numa aba ao lado).`],
    cabecalhoSecoes: "Seções, com o começo do que já está escrito em cada uma:",
    secoes: t.secoes,
    regras: [
      "NÃO contradiga o que já está no documento. Se o que você vai dizer diverge do que está escrito,",
      "diga que está CORRIGINDO e devolva a seção corrigida em `work` — não deixe as duas versões de pé.",
      "Se o aluno pedir para escrever, continuar ou mudar o TCC, devolva `work` com `sections` contendo",
      "SÓ as seções que mudam, cada uma com o MESMO título (SUBSTITUI aquela seção inteira) ou um título novo",
      "(vira seção nova). Como substituir apaga o que estava lá, mande a seção INTEIRA, preservando o que já",
      "valia. Corpo completo da seção, tom didático. Se a conversa não for sobre o TCC, não mande `work`.",
    ],
    teto: MAX_CONTEXTO,
  });
}

export async function tccContextoParaTurno(userId: string | null, scopeId: unknown): Promise<string> {
  const scope = sanitizeScopeId(scopeId);
  if (!tccCrossOn() || !userId || !scope) return "";
  try {
    const t = await findTccDoEscopo(userId, scope);
    return t ? contextoDoTcc(t) : "";
  } catch { return ""; }
}

/**
 * CHAT ÚNICO: o bloco de TODOS os trabalhos da conversa + o resumo que o roteador usa ("agora outro
 * sobre Y" só é pedido de trabalho se já existe um). Best-effort: vazio em qualquer falha.
 */
export async function trabalhosParaTurno(userId: string | null, scopeId: unknown, abertoId?: unknown): Promise<{ bloco: string; total: number; kind?: WorkKind }> {
  const scope = sanitizeScopeId(scopeId);
  if (!tccCrossOn() || !userId || !scope) return { bloco: "", total: 0 };
  try {
    const lista = await listarTrabalhosDoEscopo(userId, scope);
    if (!lista.length) return { bloco: "", total: 0 };
    const aberto = lista.find((w) => w.id === abertoId) ?? lista[0];
    return { bloco: contextoDosTrabalhos(lista, aberto.id), total: lista.length, kind: kindDoTipo(aberto.workType) };
  } catch { return { bloco: "", total: 0 }; }
}

const kindDoTipo = (t: string | null): WorkKind => (t === "TCC" ? "tcc" : t === "Relatório" ? "relatorio" : "artigo");

export async function tccDoTurno(input: {
  userId: string | null; scopeId: unknown; surface?: string | null; intent?: IntentId; kind?: WorkKind;
  prompt: string; answer: StructuredAnswer;
  /** dispara a geração do esqueleto (injetável pra teste; padrão = lib/tcc/gerar em background) */
  gerar?: (workId: string, userId: string, topic: string, brief?: Briefing) => void;
  /** CHAT ÚNICO: vários trabalhos por conversa (de qualquer tipo), inclusive no modo pesquisa */
  multi?: boolean;
  /** o trabalho aberto no editor (é nele que "continue a metodologia" mexe); ausente = o mais recente */
  abertoId?: unknown;
}): Promise<TccTurno | null> {
  if (input.multi) return trabalhoDoTurno(input);
  const scope = sanitizeScopeId(input.scopeId);
  // A Sala de Pesquisa não escreve por aqui: lá tudo nasce como sugestão (POST /api/tcc/:id/revisar).
  if (!tccCrossOn() || !input.userId || !scope || input.surface === "pesquisa") return null;
  try {
    const sections = input.answer.work?.sections;
    const existente = await findTccDoEscopo(input.userId, scope);

    if (existente) {
      if (!Array.isArray(sections) || !sections.length) return null;
      const r = await aplicarNoTcc(existente.id, input.userId, (t) => opsDeWork(t.secoes, sections), "estudos");
      if (!r.ok || !r.efeitos.length) return null;
      void fixarCardTcc(input.userId, scope, resumoDoCard(r.tcc));
      return { workId: existente.id, titulo: r.tcc.titulo, criado: false, alteradas: r.efeitos.length };
    }

    if (!ehPedidoDeTcc(input.intent, input.kind, input.prompt)) return null;
    const { brief, titulo, secoes: deAbertura } = partidaDoPedido(input.prompt, ESQUELETO_TCC);
    const doModelo = (Array.isArray(sections) ? sections : [])
      .map((s: any) => ({ titulo: String(s?.title ?? s?.titulo ?? ""), corpo: String(s?.body ?? s?.corpo ?? "") }))
      .filter((s) => s.titulo.trim() && s.corpo.trim());
    // O modelo já escreveu → o TCC nasce com essas seções. Não escreveu → esqueleto ABNT vazio e a
    // geração roda solta (o aluno vê a aba crescer pelo poll).
    const gerando = doModelo.length === 0;
    const t = await criarTcc({
      userId: input.userId, scopeId: scope, titulo, origem: "estudos",
      secoes: gerando ? deAbertura : doModelo,
      status: gerando ? "gerando" : "pronto",
    });
    void fixarCardTcc(input.userId, scope, resumoDoCard(t));
    if (gerando) {
      const disparar = input.gerar ?? ((id, uid, topic, b) => {
        void import("@/lib/tcc/gerar").then((m) => m.gerarTccEmBackground(id, uid, topic, undefined, b)).catch(() => {});
      });
      disparar(t.id, input.userId, titulo, brief);
    }
    return { workId: t.id, titulo: t.titulo, criado: true, alteradas: t.secoes.filter((s) => s.corpo.trim()).length, gerando };
  } catch (e: any) {
    console.warn("[tcc] tccDoTurno falhou:", e?.message ?? e); // o TCC é opcional; a resposta segue
    return null;
  }
}

const disparoPadrao = (id: string, uid: string, topic: string, brief?: Briefing) => {
  void import("@/lib/tcc/gerar").then((m) => m.gerarTccEmBackground(id, uid, topic, undefined, brief)).catch(() => {});
};

/** As seções que o modelo escreveu (title/body), sem as vazias. */
const secoesDoModelo = (sections: unknown) => (Array.isArray(sections) ? sections : [])
  .map((s: any) => ({ titulo: String(s?.title ?? s?.titulo ?? ""), corpo: String(s?.body ?? s?.corpo ?? "") }))
  .filter((s) => s.titulo.trim() && s.corpo.trim());

/**
 * CHAT ÚNICO — VÁRIOS trabalhos por conversa. Um pedido de trabalho NOVO ("escreva um artigo sobre X",
 * "agora outro sobre Y") cria mais um documento; o resto (`work.sections` sem pedido novo) edita o
 * ABERTO no editor (ou o mais recente). Vale nos dois modos do chat (o modo pesquisa só põe rigor).
 */
async function trabalhoDoTurno(input: Parameters<typeof tccDoTurno>[0]): Promise<TccTurno | null> {
  const scope = sanitizeScopeId(input.scopeId);
  if (!tccCrossOn() || !input.userId || !scope) return null;
  try {
    const sections = input.answer.work?.sections;
    const lista = await listarTrabalhosDoEscopo(input.userId, scope);
    const aberto = lista.find((w) => w.id === input.abertoId) ?? lista[0] ?? null;

    if (ehPedidoDeTrabalho(input.intent, input.kind) && pedeNovoTrabalho(input.prompt, aberto)) {
      const tipo = researchWorkType(input.kind ?? input.answer.work?.kind ?? "artigo");
      const { brief, titulo, secoes: deAbertura } = partidaDoPedido(input.prompt, esqueletoDe(tipo));
      const doModelo = secoesDoModelo(sections);
      const gerando = doModelo.length === 0;
      const t = await criarTcc({
        userId: input.userId, scopeId: scope, titulo, origem: "estudos", workType: tipo,
        secoes: gerando ? deAbertura : doModelo,
        status: gerando ? "gerando" : "pronto",
      });
      void fixarCardTcc(input.userId, scope, resumoDoCard(t), tipo);
      if (gerando) (input.gerar ?? disparoPadrao)(t.id, input.userId, titulo, brief);
      return { workId: t.id, titulo: t.titulo, criado: true, alteradas: t.secoes.filter((s) => s.corpo.trim()).length, gerando, tipo };
    }

    if (!aberto || !Array.isArray(sections) || !sections.length) return null;
    const r = await aplicarNoTcc(aberto.id, input.userId, (t) => opsDeWork(t.secoes, sections), "estudos");
    if (!r.ok || !r.efeitos.length) return null;
    // D3 · o que o chat CITOU ao escrever no documento vira bibliografia, pelo mesmo caminho do
    // gerador. A lista é remontada com a MESMA função pura que o harness usou pra pedir a citação,
    // então as strings batem. Se não baterem, nada entra — falha pro lado de não inventar.
    void referenciasDoChat(aberto.id, input.userId, input.answer, sections);
    const tipo = aberto.workType || "TCC";
    void fixarCardTcc(input.userId, scope, resumoDoCard(r.tcc), tipo);
    return { workId: aberto.id, titulo: r.tcc.titulo, criado: false, alteradas: r.efeitos.length, tipo };
  } catch (e: any) {
    console.warn("[tcc] trabalhoDoTurno falhou:", e?.message ?? e); // o trabalho é opcional; a resposta segue
    return null;
  }
}

/**
 * D3 · leva pra seção REFERÊNCIAS as fontes que o texto escrito pelo chat realmente citou.
 * Nunca lança e nunca bloqueia a resposta: bibliografia é consequência, não requisito do turno.
 */
async function referenciasDoChat(
  workId: string,
  userId: string,
  answer: Parameters<typeof tccDoTurno>[0]["answer"],
  sections: readonly { title: string; body: string }[],
): Promise<void> {
  try {
    // D4 · o harness já mediu, onde a lista original (com os ANEXOS) existe. O caminho de baixo
    // continua como rede pra quem chega sem o campo — e nunca inventa: se nada casar, nada entra.
    if (answer.referencias?.length) return gravarReferencias(workId, userId, answer.referencias);
    const { fontesDoTurno, fontesCitadas } = await import("@/lib/documento/fontes");
    const fontes = fontesDoTurno(
      (answer.evidencia ?? []).map((e) => e.source).filter(Boolean) as { title?: string; year?: number }[],
      (answer.fontesBase ?? []).map((f) => ({ titulo: f.titulo, paginas: f.paginas })),
    );
    if (!fontes.length) return;
    const citadas = fontesCitadas(sections.map((s) => s.body).join("\n"), fontes);
    if (!citadas.length) return;
    await gravarReferencias(workId, userId, citadas);
  } catch (e: any) {
    console.warn("[tcc] referências do chat falharam:", e?.message ?? e);
  }
}

/** Leva as referências pra seção REFERÊNCIAS (ABNT). O dedupe é do `referenciasNovas`. */
async function gravarReferencias(workId: string, userId: string, citadas: readonly FonteVerificada[]): Promise<void> {
  await aplicarNoTcc(workId, userId, (t) => {
    const { secao, novas } = referenciasNovas(t.secoes, [...citadas]);
    if (!secao || !novas.length) return [];
    return [{ op: "substituir" as const, secaoId: secao.id, corpo: [secao.corpo.trim(), ...novas].filter(Boolean).join("\n") }];
  }, "estudos");
}

const resumoDoCard = (t: TccView) => ({
  workId: t.id, titulo: t.titulo, secoes: t.secoes.length,
  palavras: t.secoes.reduce((n, s) => n + palavras(s.corpo), 0),
});

/** id do card do TCC na cartolina — o prefixo `tcc:` é o que faz o card abrir a aba do TCC. */
export const cardIdDoTcc = (workId: string) => `tcc:${workId}`;

/**
 * O card "TCC — em construção" na cartolina da conversa (abre a aba do TCC). Best-effort e só com
 * a cartolina ligada (CARTOLINA_MEMORIA): sem cartolina, o TCC vive só na aba.
 */
export async function fixarCardTcc(userId: string, scopeId: string, t: { workId: string; titulo: string; secoes?: number; palavras?: number }, tipo = "TCC"): Promise<void> {
  if (!cartolinaMemoriaOn()) return;
  try {
    const card = {
      id: cardIdDoTcc(t.workId), tipo: "nota" as const, titulo: `${tipo} — em construção`,
      corpo: `${t.titulo}${t.secoes ? ` · ${t.secoes} seções` : ""}${t.palavras ? ` · ${t.palavras} palavras` : ""}`,
    };
    const board = await findOwnBoard(userId, "estudos", scopeId);
    if (!board) {
      await createBoard({ ownerId: userId, surface: "estudos", scopeId, titulo: t.titulo.slice(0, 80) || "Estudo", cards: fundirNoBoard([], [card]) });
      return;
    }
    const ja = board.cards.find((c) => c.id === card.id);
    const novo = ja ? { ...ja, titulo: card.titulo, corpo: card.corpo } : fundirNoBoard(board.cards, [card]).find((c) => c.id === card.id)!;
    if (ja && ja.corpo === novo.corpo) return;
    await patchBoard(board.id, userId, { upsert: [novo] });
  } catch (e: any) {
    console.warn("[tcc] card da cartolina falhou:", e?.message ?? e);
  }
}
