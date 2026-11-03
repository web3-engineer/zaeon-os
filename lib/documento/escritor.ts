/**
 * lib/documento/escritor.ts — a ESCRITA SEÇÃO POR SEÇÃO (F2 de docs/PLANO_DOCUMENTO_COMPLETO.md).
 * PURO no julgamento; o IO entra por injeção (`DepsEscritor`).
 *
 * O QUE ESTA FASE CONSERTA. Hoje `corposDoEsboco` (lib/tcc/gerar.ts) pede ao modelo UM JSON de 8
 * campos e preenche 3 das 6 seções do TCC — REFERENCIAL TEÓRICO, RESULTADOS E DISCUSSÃO e CONCLUSÃO
 * não têm nenhum caminho de código que as escreva, porque o contrato pedido ao modelo nem tem chave
 * pra elas. Aqui o pedido passa a ser UM POR SEÇÃO, com o esqueleto mandando.
 *
 * E isso não é só qualidade: é o que faz caber no VPS com o pool grátis. Oito campos de texto
 * acadêmico numa resposta só é exatamente o formato que estoura limite de saída e volta truncado
 * (o Groq roda com 8K TPM). Uma chamada pequena por seção cabe, e uma que falhe não leva o
 * documento junto — a seção vizinha já está salva.
 *
 * A RECONCILIAÇÃO QUE A F1 DEIXOU PENDENTE (e que mudou o desenho). O repo tem duas fontes de
 * esqueleto, e a `divergencia()` da F1 mostrou que nem o TCC batia: as subseções só existem em
 * `WORK_SECTIONS`. Lendo o código: `secoesDeMarkdown` separa o documento SÓ em `# ` (h1), e
 * `lib/tcc/turno.ts` cria as linhas a partir de `esqueletoDe(tipo)`. Então as duas fontes não
 * brigam por conteúdo — estão em granularidades diferentes:
 *   • `ESQUELETO_*` (lib/tcc/secoes) = a linha GRAVADA. É a unidade de escrita e a autoridade.
 *   • `WORK_SECTIONS[].subs`        = SUBTÍTULOS `##` que moram DENTRO do corpo de uma linha.
 * Por isso a unidade aqui é a seção, e os slots de nível 2 da F1 são verificados DEPOIS, partindo
 * o corpo gerado nos `##` (`preenchimentosDaUnidade`). A invariante `nenhumVazio()` continua valendo
 * de verdade — inclusive pras subseções que hoje saem vazias em 100% dos documentos.
 *
 * O RASCUNHO-ATÉ-AGORA vai no pedido de cada seção (padrão do `long_writer` do DeepCritical): sem
 * ele a CONCLUSÃO contradiz a INTRODUÇÃO e o texto lê como 6 respostas soltas em vez de um
 * documento. Vai COMPRIMIDO, porque o orçamento de contexto do pool é apertado.
 */
import { MARCA_SEM_FONTE, palavras, semAcento, type Preenchimento, type SecaoDoEsqueleto, type Slot } from "@/lib/documento/plano";
import { WORK_SECTIONS } from "@/lib/abntTemplate";
import { blocoDeFontes, type FonteDoc } from "@/lib/documento/fontes";

type Env = Record<string, string | undefined>;
const DESLIGADO = /^(0|off|false|nao|não|no)$/i;

/**
 * A escrita por seção está ligada? LIGADA POR PADRÃO (decisão do dono, 2026-11-03: "queremos tudo
 * ON"); `DOC_POR_SECAO=0` é o kill-switch e devolve o `corposDoEsboco` byte a byte. É runtime: não
 * precisa rebuild, só recriar o web.
 */
export function escritaPorSecaoLigada(env: Env = process.env): boolean {
  return !DESLIGADO.test(env.DOC_POR_SECAO?.trim() ?? "");
}

/**
 * Títulos GRAVADOS no documento + os subtítulos que o template declara pra eles.
 *
 * Esta função É a reconciliação das duas fontes de esqueleto. A ordem e o conjunto vêm das linhas
 * gravadas (`t.secoes`), que são a autoridade — gerar por uma lista que o documento não tem
 * escreveria no vazio. Os `subs` vêm de `WORK_SECTIONS`, procurados por TÍTULO em todos os tipos
 * de trabalho: só o TCC declara subseções hoje, e casar por título em vez de por `workType` faz
 * isto funcionar mesmo num documento cujo tipo o aluno trocou no meio do caminho.
 */
export function esqueletoEnriquecido(titulos: readonly string[], workType?: string | null): SecaoDoEsqueleto[] {
  const tabela = (WORK_SECTIONS as Record<string, { title: string; subs?: string[] }[]>)[String(workType ?? "")];
  // Com o tipo conhecido, SÓ os `subs` dele: o Artigo tem REFERENCIAL TEÓRICO no esqueleto gravado
  // mas NÃO declara subseções, e herdar as do TCC faria o Artigo exigir uma estrutura que o
  // template dele não pede. Sem tipo (ou tipo que a tabela não conhece), cai no casamento por
  // título entre todos os tipos — melhor um palpite do template que nenhum subtítulo.
  const fontes = tabela ? [tabela] : Object.values(WORK_SECTIONS);
  const subsPorTitulo = new Map<string, string[]>();
  for (const secoes of fontes) {
    for (const s of secoes) {
      if (s.subs?.length) subsPorTitulo.set(semAcento(s.title), [...s.subs]);
    }
  }
  return titulos.map((t) => {
    const subs = subsPorTitulo.get(semAcento(t));
    return subs ? { title: t, subs } : { title: t };
  });
}

/** Quanto de cada seção já escrita entra no pedido da próxima. O pool não aceita o documento todo. */
export const RESUMO_POR_SECAO = 400;

/** Tentativas por seção. Duas: a primeira falha é comum (truncou, veio curta), a terceira é teimosia. */
export const TENTATIVAS_POR_SECAO = 2;

/**
 * Marca da seção que o modelo não conseguiu escrever. NÃO é a mesma coisa que `MARCA_SEM_FONTE`
 * (essa é conteúdo escrito sem fundamentação). Aqui é "o modelo falhou aqui, isto precisa ser
 * refeito" — e existe porque branco silencioso é o pior desfecho: o aluno descobre na entrega.
 * Nunca se inventa conteúdo acadêmico pra tapar o buraco.
 */
export const MARCA_A_FAZER = "⟨a escrever⟩";

// ───────────────────────────── unidade de escrita ─────────────────────────────

export type Unidade = {
  /** O slot de nível 1 — a seção gravada. */
  slot: Slot;
  /** Os slots de nível 2 que viram `##` dentro do corpo desta seção. */
  subtitulos: Slot[];
  /** Piso somado: o corpo precisa cobrir a abertura E cada subseção. */
  pisoTotal: number;
};

/**
 * Plano da F1 → unidades de ESCRITA. Agrupa cada slot de nível 2 sob o de nível 1 que o contém,
 * e descarta o que o modelo não escreve (REFERÊNCIAS é montada das fontes citadas, não redigida).
 */
export function unidadesDeEscrita(plano: readonly Slot[]): Unidade[] {
  const out: Unidade[] = [];
  for (const s of plano) {
    if (s.nivel === 1) {
      if (!s.geradaPeloModelo) continue;
      out.push({ slot: s, subtitulos: [], pisoTotal: s.pisoPalavras });
      continue;
    }
    // Nível 2: entra na última unidade aberta, se ela for o pai dele.
    const pai = out[out.length - 1];
    if (pai && s.caminho[0] === pai.slot.caminho[0]) {
      pai.subtitulos.push(s);
      pai.pisoTotal += s.pisoPalavras;
    }
  }
  return out;
}

// ───────────────────────────── o pedido ─────────────────────────────

/** O que cada seção já escrita contribui pro contexto da próxima. */
export type TrechoRascunho = { titulo: string; corpo: string };

export type PedidoSecao = {
  tema: string;
  tipo: string;
  unidade: Unidade;
  /** As seções JÁ escritas, em ordem. Comprimidas em `promptDaSecao`. */
  rascunho: readonly TrechoRascunho[];
  /** O esboço (uma chamada no começo) serve de norte: título, objetivos, metodologia. */
  norte?: Record<string, string | undefined> | null;
  /**
   * D1 · as FONTES que esta seção pode citar (lib/documento/fontes). Sem elas o escritor era cego:
   * o `sys` proíbe inventar referência e manda marcar ⟨sem fonte⟩, então, sem nada na mão, a saída
   * honesta era marcar quase tudo. Vazio continua valendo — e aí o ⟨sem fonte⟩ é a resposta certa.
   */
  fontes?: readonly FonteDoc[];
  /**
   * D5 · um QUADRO pronto (números reais + linha de fonte) oferecido a ESTA seção. O escritor
   * decide se cabe — é o "apenas onde couber" do dono. Some das seções seguintes assim que entra
   * numa, porque cada chamada é independente e não saberia que a outra já o usou.
   */
  quadro?: string;
};

const comprimir = (t: string, max = RESUMO_POR_SECAO): string => {
  const s = String(t ?? "").replace(/\s+/g, " ").trim();
  return s.length <= max ? s : `${s.slice(0, max).trimEnd()}…`;
};

/** O que o modelo deve ENTREGAR nesta seção, em palavras de instrução. */
export function instrucaoDoPapel(papel: Slot["papel"]): string {
  switch (papel) {
    case "resumo": return "Resuma o trabalho inteiro: objetivo, método, principais achados e conclusão. Sem citações.";
    case "introducao": return "Contextualize o tema, apresente o problema e a pergunta de pesquisa, e anuncie o que o trabalho faz.";
    case "objetivos": return "Um objetivo geral e 2–3 específicos, cada um começando por verbo no infinitivo.";
    case "justificativa": return "Aponte a lacuna que o trabalho preenche e por que ela importa.";
    case "referencial": return "Apresente os conceitos que o trabalho usa e o estado da arte, encadeando autores e ideias — não uma lista de resumos soltos.";
    case "metodologia": return "Descreva tipo de pesquisa, fontes, instrumentos e os passos, em ordem, com detalhe suficiente pra alguém repetir.";
    case "desenvolvimento": return "Desenvolva o argumento central em seções encadeadas, sustentando cada afirmação.";
    case "resultados": return "Apresente o que foi encontrado e DISCUTA: relacione com o referencial, aponte convergências e divergências.";
    case "conclusao": return "Retome a pergunta de pesquisa e responda-a com base no que foi apresentado; aponte limites e próximos passos. NÃO introduza ideia nova.";
    case "referencias": return "Liste as referências citadas.";
    default: return "Escreva esta seção de forma coerente com o restante do documento.";
  }
}

/**
 * O prompt de UMA seção. Três regras que vêm de dor medida:
 *   • NÃO escreva o título da seção (o esqueleto já tem o `# TÍTULO`, e `secoesDeMarkdown` separa
 *     por ele — um título repetido no corpo criaria uma seção fantasma);
 *   • escreva os `##` EXATAMENTE como dados, porque é por eles que a verificação por subseção parte
 *     o corpo depois;
 *   • não invente dado, fonte nem número. Sem fundamentação, escreva e MARQUE (decisão do dono).
 */
export function promptDaSecao(p: PedidoSecao): { sys: string; user: string } {
  const { unidade: u } = p;
  const subs = u.subtitulos.map((s) => s.titulo);
  const sys = [
    "Você é um orientador acadêmico escrevendo UMA seção de um trabalho em PT-BR.",
    "Escreva em registro acadêmico, impessoal, em parágrafos corridos — sem bullets, sem listas numeradas.",
    `NÃO escreva o título da seção. NÃO use "#" no começo de linha.`,
    subs.length
      ? `Escreva estes subtítulos EXATAMENTE assim, cada um em sua própria linha, com texto embaixo de cada um:\n${subs.map((s) => `## ${s}`).join("\n")}`
      : "Esta seção não tem subtítulos.",
    `Extensão mínima: ${u.pisoTotal} palavras no total desta seção.`,
    "NÃO invente dado, número, autor nem referência. Se faltar fundamentação para uma afirmação,",
    `escreva a afirmação e marque com ${MARCA_SEM_FONTE} no fim da frase — nunca invente a fonte.`,
    // a instrução só aparece quando HÁ fonte: prometer citação sem ter o que citar é o mesmo
    // defeito que a rede de honestidade persegue no chat, do lado do documento
    ...(p.fontes?.length
      ? [
          "Você RECEBEU fontes (lista abaixo). Para toda afirmação que uma delas sustente, cite-a",
          "copiando EXATAMENTE a string indicada em \"CITE ASSIM\" — sem reescrever, sem abreviar.",
          `${MARCA_SEM_FONTE} fica reservado ao que NENHUMA das fontes sustenta: é o que mostra ao aluno o que ainda falta.`,
        ]
      : []),
    "Responda APENAS o texto da seção, sem comentar o que você fez.",
  ].join("\n");

  const norte = p.norte
    ? Object.entries(p.norte).filter(([, v]) => v?.trim()).map(([k, v]) => `${k}: ${comprimir(v!, 300)}`).join("\n")
    : "";
  const jaEscrito = p.rascunho.length
    ? p.rascunho.map((s) => `## ${s.titulo}\n${comprimir(s.corpo)}`).join("\n\n")
    : "(esta é a primeira seção)";

  const user = [
    `TEMA: ${p.tema}`,
    `TIPO DE TRABALHO: ${p.tipo}`,
    norte ? `\nNORTE DO TRABALHO:\n${norte}` : "",
    `\nSEÇÃO A ESCREVER: ${u.slot.titulo}`,
    instrucaoDoPapel(u.slot.papel),
    `\nO QUE JÁ FOI ESCRITO (resumido, para você dar continuidade e NÃO se repetir nem se contradizer):\n${jaEscrito}`,
    p.fontes?.length ? `\n${blocoDeFontes(p.fontes)}` : "",
    p.quadro
      ? `\nQUADRO DISPONÍVEL (números já apurados; NÃO altere nenhum valor). Se — e só se — ele couber\nnesta seção, copie-o inteiro, tal como está, no ponto adequado do texto. Se não couber aqui, ignore.\n\n${p.quadro}`
      : "",
  ].filter(Boolean).join("\n");

  return { sys, user };
}

// ───────────────────────────── do corpo gerado aos slots ─────────────────────────────

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Parte o corpo nos `##` e devolve, por slot, o texto que ficou debaixo dele. A abertura (o texto
 * antes do primeiro `##`) é do slot de nível 1.
 *
 * Casa o subtítulo por texto normalizado, não por posição: o modelo troca acento e caixa, e amarrar
 * na ordem faria uma seção inteira ser contada como vazia por causa de um "a" maiúsculo.
 */
export function partesDoCorpo(corpo: string, subtitulos: readonly Slot[]): { abertura: string; porSlot: Map<string, string> } {
  const linhas = String(corpo ?? "").split(/\r?\n/);
  const porTitulo = new Map(subtitulos.map((s) => [normalizar(s.titulo), s.id]));
  const porSlot = new Map<string, string>();
  const abertura: string[] = [];
  let atual: string | null = null;
  let buffer: string[] = [];
  const despejar = () => {
    const t = buffer.join("\n").trim();
    if (atual) { if (t) porSlot.set(atual, [porSlot.get(atual), t].filter(Boolean).join("\n\n")); }
    else if (t) abertura.push(t);
    buffer = [];
  };
  for (const linha of linhas) {
    const m = /^\s*#{2,6}\s+(.*\S)\s*$/.exec(linha);
    if (m) {
      despejar();
      atual = porTitulo.get(normalizar(m[1])) ?? null;
      // Subtítulo que o modelo inventou: o texto dele volta pra abertura, em vez de desaparecer.
      if (!atual) buffer.push(linha.replace(/^\s*#{2,6}\s+/, ""));
      continue;
    }
    buffer.push(linha);
  }
  despejar();
  return { abertura: abertura.join("\n\n").trim(), porSlot };
}

/** Corpo gerado → um `Preenchimento` por slot desta unidade, pra `nenhumVazio()` poder julgar. */
export function preenchimentosDaUnidade(u: Unidade, corpo: string): Preenchimento[] {
  const { abertura, porSlot } = partesDoCorpo(corpo, u.subtitulos);
  const semFonte = (t: string) => t.includes(MARCA_SEM_FONTE);
  // Sem subtítulos, o corpo inteiro é da seção. Com subtítulos, a seção fica com a abertura.
  const corpoDoPai = u.subtitulos.length ? abertura : String(corpo ?? "").trim();
  const out: Preenchimento[] = [{ slotId: u.slot.id, corpo: corpoDoPai, ...(semFonte(corpoDoPai) ? { semFonte: true } : {}) }];
  for (const s of u.subtitulos) {
    const t = porSlot.get(s.id) ?? "";
    out.push({ slotId: s.id, corpo: t, ...(semFonte(t) ? { semFonte: true } : {}) });
  }
  return out;
}

/** O corpo cumpre o que esta unidade pedia? Usado pra decidir a nova tentativa. */
export function corpoAceitavel(u: Unidade, corpo: string): boolean {
  const t = String(corpo ?? "").trim();
  if (palavras(t) < u.pisoTotal) return false;
  if (!u.subtitulos.length) return true;
  const { porSlot } = partesDoCorpo(t, u.subtitulos);
  return u.subtitulos.every((s) => palavras(porSlot.get(s.id) ?? "") >= s.pisoPalavras);
}

/**
 * O texto que entra quando o modelo não conseguiu, depois das tentativas. Marcado e específico:
 * diz o que a seção deveria conter, pra o aluno saber o que refazer. Não finge ser o trabalho.
 */
export function corpoAFazer(u: Unidade): string {
  const subs = u.subtitulos.map((s) => `## ${s.titulo}\n${MARCA_A_FAZER}`).join("\n\n");
  const cabeca = `${MARCA_A_FAZER} — ${instrucaoDoPapel(u.slot.papel)} (mínimo ${u.pisoTotal} palavras)`;
  return subs ? `${cabeca}\n\n${subs}` : cabeca;
}

/**
 * Este corpo é um stub NOSSO (de `corpoAFazer`), e não texto do aluno?
 *
 * Importa porque a trava que protege o que o aluno escreveu olha "tem corpo?" — e um stub marcado
 * TEM corpo. Sem distinguir, um documento que saiu marcado (pool esgotado, por exemplo) nunca mais
 * poderia ser completado por uma nova rodada: ela pularia justamente as seções que faltam.
 * Sobrescrever o nosso próprio marcador não destrói trabalho de ninguém.
 */
export function ehCorpoAFazer(corpo: string): boolean {
  const t = String(corpo ?? "").trim();
  if (!t.startsWith(MARCA_A_FAZER)) return false;
  // `corpoAFazer` é feito só de linhas-marcador e de `##`. Sobrou QUALQUER linha fora dessa forma?
  // Então tem prosa de alguém ali — respeita. (Regra exata, não calibrada por contagem de palavras.)
  const resto = t.split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith(MARCA_A_FAZER) && !/^\s*#{2,6}\s/.test(l))
    .join(" ");
  return palavras(resto) === 0;
}

// ───────────────────────────── a orquestração ─────────────────────────────

export type DesfechoSecao = "escrita" | "curta" | "a_fazer" | "pulada";

export type ItemEscrita = {
  slotId: string;
  titulo: string;
  desfecho: DesfechoSecao;
  palavras: number;
  tentativas: number;
  detalhe?: string;
};

export type RelatorioEscrita = {
  escritas: number;
  aFazer: number;
  puladas: number;
  itens: ItemEscrita[];
  preenchimentos: Preenchimento[];
};

/**
 * `ja_escrita` existe porque a checagem que importa é no estado FRESCO, na hora de gravar — não
 * num retrato tirado antes do laço. A geração leva minutos e o aluno está olhando o documento
 * crescer: ele pode escrever na METODOLOGIA enquanto a INTRODUÇÃO é gerada, e um retrato velho
 * diria "vazia" e passaria por cima do texto dele.
 */
export type ResultadoSalvar = "gravou" | "ja_escrita" | "falhou";

export type DepsEscritor = {
  /** Uma chamada por seção. Devolve o corpo (string vazia = falhou). */
  escrever(p: PedidoSecao): Promise<string>;
  /** Grava a seção, recusando se o aluno escreveu nesse meio-tempo. */
  salvar(u: Unidade, corpo: string): Promise<ResultadoSalvar>;
  /** Pré-checagem barata: já tem corpo? Economiza a chamada ao modelo. NÃO é a trava — ela é no salvar. */
  jaEscrita?(u: Unidade): boolean;
};

/**
 * Escreve o documento, UMA SEÇÃO DE CADA VEZ e EM ORDEM — a ordem importa duas vezes: o rascunho
 * que a próxima seção recebe só existe porque a anterior já foi escrita, e o aluno vê o documento
 * crescer no poll em vez de esperar tudo.
 *
 * Uma seção que falha não derruba as outras: ela vira `a_fazer` marcada e o laço continua.
 */
export async function escreverDocumento(
  deps: DepsEscritor,
  input: {
    tema: string; tipo: string; plano: readonly Slot[];
    norte?: Record<string, string | undefined> | null;
    /** D1 · as fontes do trabalho, as MESMAS pra todas as seções (ver lib/documento/fontes). */
    fontes?: readonly FonteDoc[];
    /** D5 · o quadro a oferecer. Entra em UMA seção só — ver `quadroPendente` no laço. */
    quadro?: string;
  },
): Promise<RelatorioEscrita> {
  const unidades = unidadesDeEscrita(input.plano);
  const r: RelatorioEscrita = { escritas: 0, aFazer: 0, puladas: 0, itens: [], preenchimentos: [] };
  const rascunho: TrechoRascunho[] = [];
  // D5 · a primeira linha do quadro é a marca pra saber se ele já entrou em alguma seção
  const marcaDoQuadro = input.quadro?.split("\n")[0]?.trim() ?? "";
  let quadroPendente = input.quadro;

  for (const u of unidades) {
    if (deps.jaEscrita?.(u)) {
      r.puladas++;
      r.itens.push({ slotId: u.slot.id, titulo: u.slot.titulo, desfecho: "pulada", palavras: 0, tentativas: 0, detalhe: "o aluno já escreveu aqui" });
      continue;
    }

    let corpo = "";
    let tentativas = 0;
    let ultimoErro: string | undefined;
    for (; tentativas < TENTATIVAS_POR_SECAO; tentativas++) {
      try {
        const t = String(await deps.escrever({
          tema: input.tema, tipo: input.tipo, unidade: u, rascunho, norte: input.norte ?? null,
          ...(input.fontes?.length ? { fontes: input.fontes } : {}),
          ...(quadroPendente ? { quadro: quadroPendente } : {}),
        })).trim();
        if (t) corpo = t;
        if (corpoAceitavel(u, corpo)) break;
        ultimoErro = t ? `abaixo do pedido (${palavras(t)} de ${u.pisoTotal} palavras)` : "o modelo não devolveu texto";
      } catch (e: any) {
        ultimoErro = e?.message ?? "a chamada falhou";
      }
    }

    // entrou? então não é mais oferecido — quadro repetido em três seções é pior que nenhum
    if (quadroPendente && marcaDoQuadro && corpo.includes(marcaDoQuadro)) quadroPendente = undefined;

    const aceita = corpoAceitavel(u, corpo);
    // Vazio de verdade → stub MARCADO. Curta mas com conteúdo → fica o que veio: texto do modelo
    // vale mais que um marcador, e a pendência aparece no relatório e na checagem de completude.
    const paraSalvar = corpo.trim() ? corpo : corpoAFazer(u);
    const desfecho: DesfechoSecao = aceita ? "escrita" : corpo.trim() ? "curta" : "a_fazer";

    const salvou = await deps.salvar(u, paraSalvar);

    // O aluno escreveu nesse meio-tempo: o texto dele vence, e isto NÃO é falha nem pendência.
    if (salvou === "ja_escrita") {
      r.puladas++;
      r.itens.push({ slotId: u.slot.id, titulo: u.slot.titulo, desfecho: "pulada", palavras: 0, tentativas, detalhe: "o aluno escreveu aqui enquanto a geração corria" });
      continue;
    }

    // Só o que REALMENTE entrou no documento alimenta o rascunho da próxima seção: senão ela daria
    // continuidade a um texto que não existe.
    if (salvou === "gravou") rascunho.push({ titulo: u.slot.titulo, corpo: paraSalvar });
    r.preenchimentos.push(...preenchimentosDaUnidade(u, paraSalvar));
    if (desfecho === "escrita") r.escritas++; else if (desfecho === "a_fazer") r.aFazer++;
    r.itens.push({
      slotId: u.slot.id, titulo: u.slot.titulo, desfecho, palavras: palavras(paraSalvar), tentativas,
      ...(salvou === "falhou" ? { detalhe: "não deu pra gravar" } : {}),
      ...(ultimoErro && desfecho !== "escrita" ? { detalhe: ultimoErro } : {}),
    });
  }

  return r;
}
