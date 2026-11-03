/**
 * lib/agent/capacidades.ts — o CONTRATO DE CAPACIDADE do harness (F0 de docs/PLANO_HARNESS_AGENTICO.md). PURO.
 *
 * O PROBLEMA: «o modelo diz que vai baixar uma CSV, diz que vai baixar um livro, diz que vai clonar
 * um repo — e não faz». Não é alucinação de fato. O prompt do `draft` PROÍBE o modelo de falar de
 * ferramentas (aura-harness.ts), e nenhum prompt do harness lista a superfície real: o modelo é cego
 * sobre si mesmo. Pedida uma ação que não existe, a continuação mais fluente de "baixa essa CSV" é
 * "vou baixar" — é a única forma que ele tem de dizer "uma ação deveria acontecer aqui", porque o
 * laço não tem canal de ação (o plano é fixo; o modelo nunca escolhe tool).
 *
 * Este módulo é a correção em DUAS CAMADAS, que é o padrão que já funcionou neste arquivo
 * (`ofertaDePlataforma` = rede; a regra fica no prompt):
 *
 *   1. A REGRA, no prompt: `cardapioDeCapacidades()` — o que a casa faz e o que NÃO faz, DERIVADO
 *      do registry de tools. Derivado, não escrito à mão, de propósito: cardápio manual divergiria
 *      do enforcement na primeira tool nova (é a regra "tool descriptions stay in code" do
 *      dsh-superagent). Quando a F1 registrar `abrir_url`, a linha "não abre páginas" desaparece
 *      sozinha e a capacidade entra no "faz" — sem ninguém editar prompt.
 *
 *   2. A REDE, determinística: `semPromessaVazia()` — promessa de ação cujo recibo não existe no
 *      turno não passa. "Nenhuma afirmação de ação sai sem recibo da ação" é o portão do dono, a
 *      mesma forma do "escreve e MARCA" do plano do documento: há sempre um desfecho honesto.
 *
 * O CRITÉRIO É QUEM FAZ E SE FEZ, nunca o substantivo. "Você pode baixar o PDF no site oficial" é
 * instrução ao aluno e é ótimo conteúdo; "vou baixar o PDF" põe a PLATAFORMA como sujeito de uma
 * ação que ninguém executou. Só essa cai — e só quando a tool correspondente não rodou.
 */

/** minúsculas sem acento — mesma convenção de lib/agent/router.ts (casa "página"/"pagina"). */
const norm = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ───────────────────────────── o que a casa FAZ ─────────────────────────────

/** Uma tool do registry → a frase que a descreve no cardápio. */
export type Capacidade = { tool: string; faz: string };

/**
 * As tools do registry em linguagem de gente. Tool registrada que não esteja aqui entra no cardápio
 * pelo próprio nome (nunca fica invisível) — a tabela é para a frase ficar boa, não para filtrar.
 */
export const CAPACIDADES: readonly Capacidade[] = [
  { tool: "literature_search", faz: "buscar literatura acadêmica real (OpenAlex, Crossref, arXiv, PubMed) e citar os papers" },
  { tool: "web_search", faz: "buscar na internet e trazer título, trecho e link dos resultados" },
  { tool: "book_search", faz: "procurar um livro em acervos abertos e dar o caminho legal até ele (PDF livre, leitura online, empréstimo ou prévia)" },
  { tool: "memory_search", faz: "reler a memória desta conversa e o que já foi estudado" },
  { tool: "studio_generate", faz: "montar artefato de estudo (mapa mental, diagrama, aula, flashcards, linha do tempo)" },
  { tool: "research_generate", faz: "escrever o trabalho acadêmico no documento da conversa" },
  { tool: "abrir_url", faz: "abrir um endereço da web e ler o conteúdo da página" },
  { tool: "baixar_para_base", faz: "baixar um arquivo e guardar na base de conhecimento da pessoa" },
  { tool: "ler_anexo", faz: "ler um arquivo que a pessoa anexou à conversa" },
  { tool: "listar_anexos", faz: "ver quais arquivos a pessoa anexou a esta conversa" },
  { tool: "clonar_repo", faz: "ler os arquivos de um repositório de código" },
  { tool: "executar_codigo", faz: "rodar um script e devolver a saída" },
  // não existe (e não está planejada): está aqui porque o portão de drift exige frase pronta pra
  // TODA classe de ação — se um dia existir canal de saída, a frase do cardápio já está certa.
  { tool: "enviar_mensagem", faz: "enviar e-mail ou mensagem para fora desta conversa" },
];

// ───────────────────────────── o que a casa pode NÃO fazer ─────────────────────────────

/**
 * As ações que as pessoas pedem e que a plataforma pode não ter. `tool` é quem a realizaria: ausente
 * do registry ⇒ a classe entra no "NÃO FAZ" do cardápio E a promessa dela cai na rede.
 *
 * `objeto` existe porque verbo sozinho dá falso positivo: "vou consultar a literatura" é verdade
 * (o `literature_search` roda), "vou consultar o site" não. É a dupla verbo+objeto que acusa.
 */
export type ClasseDeAcao = {
  id: string;
  /** a tool que realizaria a ação */
  tool: string;
  /** o pedido em PT, pro cardápio */
  pedido: string;
  /** infinitivo/gerúndio (sem acento) */
  inf: string;
  /** pretérito em 1ª pessoa (sem acento) — "baixei" já diz quem é o sujeito, dispensa marcador */
  pret: string;
  /**
   * presente em 1ª pessoa, para "deixa que eu pego" / "eu baixo pra você" — construção comum em PT.
   * SÓ vale precedido de "eu", e o motivo é concreto: `baixo` é também adjetivo ("índice baixo") e
   * `acesso`/`processo` são substantivos. Exigir o pronome na frente desfaz as três ambiguidades.
   */
  pres: string;
  /** o objeto que torna a frase uma afirmação de ação (sem acento) */
  objeto: string;
  /**
   * Objeto que só conta na PROMESSA (futuro ou "eu" + presente), nunca no pretérito. Existe por um
   * caso concreto, achado testando o estado de produção: "Vou abrir a página da Wikipédia e te
   * trazer o conteúdo" PASSAVA pela rede, porque `pagina` tinha sido tirada do objeto de
   * `abrir_pagina` pra não acusar "Li a página 4 do documento que você anexou" — que é VERDADE no
   * caminho dos vários anexos.
   *
   * Os dois casos se separam pelo TEMPO, não pela palavra: no pretérito, "página" costuma ser
   * página de documento anexado (e a leitura aconteceu); no futuro, "vou abrir a página" é promessa
   * de ação, e promessa sem recibo é o defeito que esta rede existe pra pegar.
   */
  objetoPromessa?: string;
  /** o caminho que EXISTE hoje, pra resposta não virar um "não" seco */
  alternativa: string;
  /**
   * F5 · a classe também é satisfeita por qualquer tool REGISTRADA cujo nome case com isto. Existe
   * porque um conector MCP entrega a capacidade com OUTRO nome (`mcp:git:git_log`, não `clonar_repo`):
   * sem isso o cardápio diria "não leio repositório" com um servidor de git ligado — a F0 mentindo
   * pelo avesso.
   */
  tambemPor?: RegExp;
};

export const CLASSES_DE_ACAO: readonly ClasseDeAcao[] = [
  {
    id: "abrir_pagina",
    tool: "abrir_url",
    pedido: "abrir um endereço da web e ler o conteúdo de uma página",
    // `ler`/`consultar` e `li`/`consultei` FICARAM FORA, e `pagina` não é objeto desta classe: com eles,
    // "Li a página 4 do documento que você anexou" — resposta VERDADEIRA no caminho dos vários anexos,
    // onde o conteúdo vem dos trechos da base — era acusada de promessa. A classe é abrir um ENDEREÇO.
    inf: "abrir|abrindo|acessar|acessando|visitar|visitando|navegar|navegando|entrar|entrando",
    pret: "abri|abrimos|acessei|acessamos|visitei|visitamos|naveguei|navegamos|entrei|entramos",
    pres: "abro|acesso|visito|navego|entro",
    objeto: "site|link|url|endereco|portal",
    // só na promessa — ver `objetoPromessa` no tipo: no pretérito "página" é página de anexo
    objetoPromessa: "pagina|paginas|web|internet",
    alternativa: "descrever o que procurar e pedir que a pessoa cole o trecho, ou buscar o assunto e citar as fontes que a busca devolver",
    tambemPor: /^mcp:fetch:/,
  },
  {
    id: "baixar_arquivo",
    tool: "baixar_para_base",
    pedido: "baixar arquivo (CSV, planilha, PDF, livro) por conta própria",
    // `salvar`/`guardar` FICARAM FORA: no caminho dos vários anexos o arquivo É guardado na base da
    // pessoa (pelo cliente), então "guardei o documento na sua base" é verdade. Esta classe é só
    // BUSCAR BYTES NA INTERNET. Por isso `documento`/`anexo` também não são objeto dela.
    inf: "baixar|baixando|descarregar|descarregando|pegar|pegando|fazer o download|fazendo o download",
    pret: "baixei|baixamos|descarreguei|descarregamos|peguei|pegamos",
    pres: "baixo|descarrego|pego|faco o download",
    objeto: "arquivo|csv|xls|xlsx|planilha|pdf|zip|dataset|base de dados|livro|ebook|e-book",
    alternativa: "dar o link para a pessoa baixar, e ela anexa o arquivo aqui na conversa (📎) — aí a leitura acontece de verdade",
  },
  {
    id: "clonar_repo",
    tool: "clonar_repo",
    pedido: "clonar ou ler um repositório de código",
    inf: "clonar|clonando|baixar|baixando|puxar|puxando|abrir|abrindo",
    pret: "clonei|clonamos|puxei|puxamos|baixei|baixamos",
    pres: "clono|puxo|baixo",
    objeto: "repo|repositorio|github|gitlab|git",
    alternativa: "pedir os arquivos que importam colados na conversa, ou explicar o que o código provavelmente faz deixando claro que não foi lido",
    tambemPor: /^mcp:(git|filesystem):/,
  },
  {
    /**
     * NÃO EXISTE tool pra isto, e é de propósito que a classe exista: o furo foi achado testando o
     * estado de produção — "Vou te mandar um e-mail com o resumo" passava inteira pela rede, porque
     * nenhuma classe cobria sair da conversa. É o mesmo defeito do "vou baixar a CSV", só com outro
     * verbo, e é pedido comum ("me manda isso por e-mail", "manda no zap").
     *
     * O `tool` aqui é um nome que o registry nunca terá: assim a classe cai sozinha no lado
     * "A plataforma NÃO executa" do cardápio, e passa a ensinar o modelo no prompt também.
     */
    id: "enviar_mensagem",
    tool: "enviar_mensagem",
    pedido: "enviar e-mail, mensagem ou arquivo para fora desta conversa",
    inf: "mandar|mandando|enviar|enviando|encaminhar|encaminhando|disparar|disparando",
    pret: "mandei|mandamos|enviei|enviamos|encaminhei|encaminhamos|disparei|disparamos",
    pres: "mando|envio|encaminho|disparo",
    // `resumo`/`texto`/`arquivo` FICAM FORA: "te mando o resumo aqui" é verdade — o texto sai nesta
    // resposta. O que não existe é o CANAL. Por isso o objeto é o canal, nunca o conteúdo.
    objeto: "email|e-mail|mensagem|whatsapp|zap|sms|telegram|dm|direct|caixa de entrada|inbox",
    alternativa: "deixar o texto pronto aqui na conversa, formatado pra pessoa copiar e enviar",
  },
  {
    id: "rodar_codigo",
    tool: "executar_codigo",
    pedido: "rodar código, script ou comando",
    inf: "rodar|rodando|executar|executando|compilar|compilando|instalar|instalando|processar|processando|calcular no|calculando no",
    pret: "rodei|rodamos|executei|executamos|compilei|compilamos|instalei|instalamos|processei|processamos",
    pres: "rodo|executo|compilo|instalo|processo",
    objeto: "codigo|script|comando|terminal|notebook|celula|programa|analise no python|python|sql",
    alternativa: "escrever o código pronto para a pessoa rodar, dizendo o que esperar de saída",
  },
];

// ───────────────────────────── camada 1 · o cardápio no prompt ─────────────────────────────

/**
 * O bloco de capacidade pro system do `draft`. `registradas` são os nomes das tools que o runtime
 * conhece (`listTools().map(t => t.name)`): é o registry que manda, não esta tabela.
 *
 * Fica fora do bloco "nunca fale da plataforma" de propósito: aquela regra existe pra resposta não
 * virar cardápio de features, e continua valendo pro Studio. A capacidade de AÇÃO é outra coisa —
 * calar sobre ela é o que produz a promessa.
 */
/**
 * Descrição que vem de FORA (um servidor MCP escreve a sua) entrando no NOSSO system prompt é vetor
 * de injeção: uma linha só, sem quebra e com teto. Mesma disciplina do texto oculto no Leitor.
 */
export const MAX_DESCRICAO_EXTERNA = 180;
export function descricaoSegura(d: unknown): string {
  return String(d ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_DESCRICAO_EXTERNA);
}

/** A classe está coberta? Pela tool dela, ou por uma tool de conector que faz o mesmo (F5). */
export function classeCoberta(c: ClasseDeAcao, registradas: ReadonlySet<string>): boolean {
  if (registradas.has(c.tool)) return true;
  return !!c.tambemPor && [...registradas].some((n) => c.tambemPor!.test(n));
}

export function cardapioDeCapacidades(
  registradas: Iterable<string>,
  /** F5 · descrição por tool, pra uma tool de conector não aparecer como nome de função. */
  descricoes?: ReadonlyMap<string, string | undefined>,
): string {
  const tem = new Set(registradas);
  const faz: string[] = [];
  for (const c of CAPACIDADES) if (tem.has(c.tool)) faz.push(c.faz);
  // tool registrada que a tabela não descreve (todo conector MCP): entra com a descrição do servidor
  // — saneada — e, sem descrição, pelo nome. Nunca fica invisível.
  const descritas = new Set(CAPACIDADES.map((c) => c.tool));
  for (const n of tem) {
    if (descritas.has(n)) continue;
    const d = descricaoSegura(descricoes?.get(n));
    faz.push(d ? `${d} (${n})` : n);
  }
  const naoFaz = CLASSES_DE_ACAO.filter((c) => !classeCoberta(c, tem));

  const linhas = [
    "=== O QUE VOCÊ EXECUTA (e o que NÃO executa) ===",
    faz.length ? `A plataforma executa, quando o pedido chama por isso: ${faz.join("; ")}.` : "A plataforma não executa nenhuma ação externa neste turno.",
  ];
  if (naoFaz.length) {
    linhas.push(
      `A plataforma NÃO executa: ${naoFaz.map((c) => c.pedido).join("; ")}.`,
      "REGRA DURA: nunca diga que vai executar, que está executando ou que já executou uma dessas ações. " +
      "Nada de \"vou baixar\", \"já baixei\", \"estou processando\", \"vou abrir o link\", \"clonei o repositório\". " +
      "Pedida uma delas, diga em UMA linha que você não faz isso e ofereça o caminho que existe:",
      ...naoFaz.map((c) => `- ${c.pedido} → ${c.alternativa}.`),
      "Instruir a PESSOA continua liberado e é bom conteúdo (\"baixe o arquivo em X e anexe aqui\"). " +
      "O que não pode é a plataforma aparecer como sujeito de uma ação que ninguém executou.",
    );
  }
  return linhas.join("\n");
}

// ───────────────────────────── camada 2 · a rede determinística ─────────────────────────────

/**
 * Marcadores de COMPROMISSO em 1ª pessoa (futuro ou em curso). O pretérito não precisa de marcador:
 * "baixei" já carrega o sujeito. "Você pode baixar" não tem marcador nenhum — e é justamente o que
 * deve passar.
 */
const MARCA_FUTURO = /\b(vou|irei|vamos|iremos|estou|estamos|deixa que eu|pode deixar que eu)\b/;

/**
 * LIMITE CONHECIDO, registrado de propósito: "estou processando o arquivo" NÃO cai na rede.
 * `processar` + `arquivo` é ambíguo de verdade — no caminho dos vários anexos o arquivo realmente é
 * processado (ingestão + vetores) e a frase é verdadeira. Flagrar aqui trocaria uma mentira
 * ocasional por falso positivo em resposta correta, que é pior. A regra do prompt cobre o caso.
 */

/** janela entre verbo e objeto na mesma frase ("vou baixar agora pra você o arquivo"). */
const JANELA = 40;

const regexDe = (c: ClasseDeAcao, verbos: string, comPromessa = false) => {
  const obj = comPromessa && c.objetoPromessa ? `${c.objeto}|${c.objetoPromessa}` : c.objeto;
  return new RegExp(`\\b(?:${verbos})\\b.{0,${JANELA}}?\\b(?:${obj})\\b`);
};

/**
 * A frase afirma uma ação desta classe? (a frase já vem normalizada)
 * Duas formas: futuro/em curso COM marcador de 1ª pessoa, ou pretérito de 1ª pessoa.
 */
export function afirmaAcao(fraseNorm: string, c: ClasseDeAcao): boolean {
  // PRETÉRITO: só o objeto estrito. O `objetoPromessa` fica fora daqui de propósito — é o que
  // mantém "Li a página 4 do documento que você anexou" fora da rede (resposta verdadeira).
  if (regexDe(c, c.pret).test(fraseNorm)) return true;
  const obj = c.objetoPromessa ? `${c.objeto}|${c.objetoPromessa}` : c.objeto;
  // "deixa que eu pego a planilha" — o pronome colado no verbo é o que desfaz "índice baixo"
  if (new RegExp(`\\beu\\s+(?:${c.pres})\\b.{0,${JANELA}}?\\b(?:${obj})\\b`).test(fraseNorm)) return true;
  return MARCA_FUTURO.test(fraseNorm) && regexDe(c, c.inf, true).test(fraseNorm);
}

/**
 * A classe que esta frase promete SEM lastro, ou null. `executadas` são as tools que de fato rodaram
 * (e deram ok) neste turno — com o recibo na mão, a frase é verdade e passa.
 */
export function promessaSemLastro(frase: string, executadas: Iterable<string> = []): ClasseDeAcao | null {
  const t = norm(frase);
  if (!t.trim()) return null;
  const feitas = new Set(executadas);
  for (const c of CLASSES_DE_ACAO) {
    if (feitas.has(c.tool)) continue;       // rodou: a frase descreve o que aconteceu
    if (afirmaAcao(t, c)) return c;
  }
  return null;
}

/**
 * Parte o texto em FRASES, preservando o que separou (pontuação e quebra de linha), pra remontar sem
 * estragar lista com marcador nem parágrafo.
 */
export function frasesDe(texto: string): string[] {
  return String(texto ?? "")
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((f) => f.trim())
    .filter(Boolean);
}

/** Acima disto, remover frase por frase deixaria o texto em tiras — melhor trocar o texto inteiro. */
export const FATIA_MAXIMA_REMOVIVEL = 0.5;

export type TextoLimpo = { texto: string; removidas: ClasseDeAcao[] };

/**
 * Tira do texto as frases que prometem ação sem lastro.
 *
 * Se a remoção comer mais da metade das frases, o texto sai inteiro no lugar: um parágrafo picado
 * ao meio é pior de ler que uma resposta curta e honesta, e um texto cuja maioria é promessa não
 * tem conteúdo a preservar. `texto: ""` quando não sobrou nada — quem chama decide o que põe.
 */
export function semPromessa(texto: string, executadas: Iterable<string> = []): TextoLimpo {
  const frases = frasesDe(texto);
  if (!frases.length) return { texto: String(texto ?? "").trim(), removidas: [] };
  const removidas: ClasseDeAcao[] = [];
  const ficam: string[] = [];
  for (const f of frases) {
    const c = promessaSemLastro(f, executadas);
    if (c) removidas.push(c);
    else ficam.push(f);
  }
  if (!removidas.length) return { texto: String(texto ?? "").trim(), removidas };
  if (removidas.length > frases.length * FATIA_MAXIMA_REMOVIVEL) return { texto: "", removidas };
  return { texto: ficam.join(" ").trim(), removidas };
}

/** A resposta honesta quando a promessa era tudo o que havia. */
export function textoDaAlternativa(c: ClasseDeAcao): string {
  return `Isso eu não faço: ${c.pedido}. O que dá pra fazer: ${c.alternativa}.`;
}

// ───────────────────────────── a rede aplicada na resposta ─────────────────────────────

/** o mínimo do StructuredAnswer que esta rede toca (tipo estrutural: mantém o módulo puro) */
type RespostaComTexto = { nucleo: string; desenvolvimento?: string; proximos_passos?: string[] };

/**
 * Passa a rede nos três campos de TEXTO da resposta. Só devolve objeto novo se algo caiu — resposta
 * honesta (a esmagadora maioria) atravessa por referência, sem custo.
 *
 * `nucleo` esvaziado pela remoção recebe a alternativa: a resposta nunca fica vazia nem fica só com
 * um "não". `desenvolvimento` esvaziado simplesmente sai (é opcional). `proximos_passos` perde o
 * passo prometido, igual ao que `ofertaDePlataforma` já faz com oferta de feature.
 */
export function respostaHonesta<T extends RespostaComTexto>(
  a: T,
  executadas: Iterable<string> = [],
): { answer: T; removidas: ClasseDeAcao[] } {
  const feitas = [...executadas];
  const removidas: ClasseDeAcao[] = [];

  const nuc = semPromessa(a.nucleo ?? "", feitas);
  removidas.push(...nuc.removidas);
  const dev = a.desenvolvimento ? semPromessa(a.desenvolvimento, feitas) : null;
  if (dev) removidas.push(...dev.removidas);
  const passos = a.proximos_passos?.filter((p) => {
    const c = promessaSemLastro(p, feitas);
    if (c) removidas.push(c);
    return !c;
  });

  if (!removidas.length) return { answer: a, removidas };

  const out: T = { ...a };
  // o núcleo nunca fica vazio: sem texto sobrando, entra o caminho que existe de verdade
  out.nucleo = nuc.texto || textoDaAlternativa(removidas[0]);
  if (dev) { if (dev.texto) out.desenvolvimento = dev.texto; else delete out.desenvolvimento; }
  if (passos) { if (passos.length) out.proximos_passos = passos; else delete out.proximos_passos; }
  return { answer: out, removidas };
}
