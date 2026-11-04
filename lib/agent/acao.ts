/**
 * lib/agent/acao.ts — a FRONTEIRA render ↔ parse de tool-call (F2 de docs/PLANO_HARNESS_AGENTICO.md).
 * PURA: nenhuma rede, nenhum registry, nenhum modelo. Testável sozinha nas duas direções.
 *
 * POR QUE JSON E NÃO FUNCTION-CALLING NATIVO: o envelope (lib/llm/envelope) é o que nos dá
 * portabilidade entre Vertex, o pool do gateway e a reserva do Hugging Face — e ele NÃO tem canal de
 * tool-call: tem `json:true` (que no gateway sai como `response_format: json_object`). Pedir
 * `functionDeclarations` amarraria o laço agêntico ao Vertex e derrubaria justamente o caminho de
 * reserva, que é o que mantém o chat de pé quando o Google falha. Então a chamada de ferramenta
 * viaja como JSON, que todo backend sabe produzir.
 *
 * É o desenho que o `deepseek-recipe` da DeepSeek separa em duas metades — renderizar as tools no
 * prompt e parsear a chamada de volta — cada uma uma função própria. Aqui elas são `menuDeTools()` e
 * `lerAcao()`, e a segunda NUNCA confia na primeira: tudo que volta do modelo é validado contra as
 * tools que existem de verdade.
 */

// ───────────────────────────── render: o menu que o modelo vê ─────────────────────────────

export type ParamVisivel = { nome: string; tipo: string; descricao?: string; obrigatorio: boolean };
export type ToolVisivel = { name: string; description: string; params: ParamVisivel[] };

/**
 * Tools que NÃO entram no menu de ação, e por quê:
 *  - `studio_generate`/`research_generate` não reúnem evidência: elas PEDEM um artefato ao cliente, e
 *    quem decide se um artefato nasce é o código com o dado na mão (`resolveHarnessOutput`). Deixá-las
 *    no menu devolveria ao modelo a decisão de produto que a gente tirou dele de propósito.
 *  - `examiner` é stub (`not_implemented`): oferecer é prometer.
 */
export const FORA_DO_MENU: readonly string[] = ["studio_generate", "research_generate", "examiner"];

/** ToolDef (schema do Gemini) → a forma enxuta que vai pro prompt. */
export function toolVisivel(def: { name: string; schema?: { description?: string; parameters?: any } }): ToolVisivel {
  const p = def.schema?.parameters ?? {};
  const obrig: string[] = Array.isArray(p.required) ? p.required.map(String) : [];
  const params: ParamVisivel[] = Object.entries<any>(p.properties ?? {}).map(([nome, v]) => ({
    nome,
    tipo: String(v?.type ?? "STRING").toLowerCase(),
    descricao: typeof v?.description === "string" ? v.description : undefined,
    obrigatorio: obrig.includes(nome),
  }));
  return { name: def.name, description: String(def.schema?.description ?? "").trim(), params };
}

/** As tools que podem entrar no menu (tira as de artefato e os stubs). */
export function toolsDoMenu<T extends { name: string }>(defs: readonly T[]): T[] {
  return defs.filter((d) => !FORA_DO_MENU.includes(d.name));
}

/** O menu em texto. Formato estável e curto: o prompt desta fase é chamado até 2x por turno. */
export function menuDeTools(tools: readonly ToolVisivel[]): string {
  if (!tools.length) return "(nenhuma ferramenta disponível)";
  return tools
    .map((t) => {
      const args = t.params
        .map((p) => `${p.nome}${p.obrigatorio ? "" : "?"}: ${p.tipo}${p.descricao ? ` — ${p.descricao}` : ""}`)
        .join("; ");
      return `- ${t.name}(${args || "sem argumentos"})${t.description ? `\n    ${t.description}` : ""}`;
    })
    .join("\n");
}

// ───────────────────────────── parse: a chamada que volta ─────────────────────────────

export type Chamada = { tool: string; args: Record<string, unknown> };

export type PedidoDeAcao = {
  chamadas: Chamada[];
  /** o modelo declarou que já tem o que precisa (ou não sobrou chamada válida) */
  pronto: boolean;
  /** o que foi recusado e por quê — vira log/teste, nunca prompt */
  descartadas: string[];
};

/** Teto de chamadas por volta. 3 é o mesmo fan-out que o plano determinístico já fazia (e `MAX_URLS`). */
export const MAX_CHAMADAS = 3;

/** A identidade de uma chamada: tool + argumentos. É por ela que o laço não repete trabalho. */
export function chaveDaChamada(c: Chamada): string {
  const args = Object.keys(c.args ?? {}).sort().map((k) => `${k}=${String((c.args as any)[k])}`).join("&");
  return `${c.tool}(${args})`;
}

const ehObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * Lê o que o modelo devolveu. NADA passa sem validação:
 *   • tool tem de existir no menu desta volta (nome inventado cai);
 *   • argumento fora do schema é DESCARTADO (não repassamos chave desconhecida pra tool);
 *   • obrigatório ausente derruba a chamada (melhor não chamar que chamar com `undefined`);
 *   • chamada já feita neste turno cai — é o que impede o laço de pedir a mesma coisa pra sempre;
 *   • repetida dentro da mesma volta cai;
 *   • acima do teto, corta.
 *
 * `pronto` sai true também quando não sobrou chamada nenhuma: sem isso, um modelo teimoso pediria
 * sempre a mesma coisa e o laço giraria até o orçamento.
 */
export function lerAcao(
  bruto: unknown,
  opts: { disponiveis: readonly ToolVisivel[]; jaFeitas?: Iterable<string>; max?: number },
): PedidoDeAcao {
  const max = opts.max ?? MAX_CHAMADAS;
  const porNome = new Map(opts.disponiveis.map((t) => [t.name, t]));
  const feitas = new Set(opts.jaFeitas ?? []);
  const descartadas: string[] = [];
  const chamadas: Chamada[] = [];
  const nestaVolta = new Set<string>();

  const o = ehObjeto(bruto) ? bruto : {};
  // o modelo às vezes devolve a lista crua; aceitamos as duas formas e nada mais
  const lista = Array.isArray(bruto) ? bruto : Array.isArray(o.chamadas) ? o.chamadas : [];
  const prontoDito = o.pronto === true;

  for (const item of lista) {
    if (chamadas.length >= max) { descartadas.push(`acima do teto de ${max}`); break; }
    if (!ehObjeto(item)) { descartadas.push("item não é objeto"); continue; }
    const nome = typeof item.tool === "string" ? item.tool.trim() : "";
    const def = porNome.get(nome);
    if (!def) { descartadas.push(`tool desconhecida: ${nome || "(vazio)"}`); continue; }

    const entrada = ehObjeto(item.args) ? item.args : {};
    const args: Record<string, unknown> = {};
    for (const p of def.params) if (entrada[p.nome] !== undefined && entrada[p.nome] !== null) args[p.nome] = entrada[p.nome];
    const extras = Object.keys(entrada).filter((k) => !def.params.some((p) => p.nome === k));
    if (extras.length) descartadas.push(`${nome}: argumento fora do schema (${extras.join(", ")})`);
    const faltando = def.params.filter((p) => p.obrigatorio && args[p.nome] === undefined).map((p) => p.nome);
    if (faltando.length) { descartadas.push(`${nome}: falta ${faltando.join(", ")}`); continue; }

    const c: Chamada = { tool: nome, args };
    const chave = chaveDaChamada(c);
    if (feitas.has(chave)) { descartadas.push(`${nome}: já foi feita neste turno`); continue; }
    if (nestaVolta.has(chave)) { descartadas.push(`${nome}: repetida na mesma volta`); continue; }
    nestaVolta.add(chave);
    chamadas.push(c);
  }

  return { chamadas, pronto: prontoDito || chamadas.length === 0, descartadas };
}

// ───────────────────────────── o estado que o modelo precisa ver ─────────────────────────────

/** Teto do bloco de coleta no prompt desta fase. Uma página lida tem 4.000 chars: não cabe inteira. */
export const MAX_RESUMO = 1_500;

/**
 * O que já foi reunido, em resumo. O `claim` de uma página inteira não entra aqui — o que o modelo
 * precisa pra decidir "já basta?" é SE achou e DE QUE, não o conteúdo (que ele vai ver no rascunho).
 */
export function resumoDaColeta(
  achados: readonly { claim: string; source?: { title?: string } }[],
  max = MAX_RESUMO,
): string {
  if (!achados.length) return "(nada reunido ainda)";
  const linhas: string[] = [];
  let gasto = 0;
  for (const f of achados) {
    const titulo = f.source?.title?.trim() || String(f.claim ?? "").split("\n")[0];
    const linha = `- ${titulo.replace(/\s+/g, " ").slice(0, 120)}`;
    if (gasto + linha.length > max) { linhas.push(`- (+${achados.length - linhas.length} outros)`); break; }
    linhas.push(linha);
    gasto += linha.length;
  }
  return linhas.join("\n");
}

/** As ferramentas que falharam, pro modelo não insistir no que não funciona. */
export function resumoDasFalhas(falhas: readonly { tool: string; code?: string }[]): string {
  if (!falhas.length) return "";
  const vistas = new Map<string, string>();
  for (const f of falhas) if (!vistas.has(f.tool)) vistas.set(f.tool, f.code ?? "erro");
  return [...vistas].map(([t, c]) => `- ${t}: ${c}`).join("\n");
}

// ───────────────────────────── o prompt da decisão ─────────────────────────────

/**
 * O prompt do passo de AÇÃO. Puro, pra ser testável sem rede — e porque é ele que decide o custo do
 * turno: roda até 2x, então cabe nele ser curto e tendencioso A FAVOR de parar.
 *
 * O VIÉS É DELIBERADO. "Pronto" é a resposta certa na esmagadora maioria dos turnos: o plano
 * determinístico já reuniu o que a intenção pedia, e uma volta a mais só se justifica quando falta
 * algo CONCRETO. Um prompt neutro aqui faria o modelo chamar ferramenta por educação, e cada volta
 * custa uma chamada de modelo mais o tempo das tools — latência que o aluno sente antes da 1ª palavra.
 */
export function promptDeAcao(p: {
  objetivo: string;
  modo: string;
  academico: string;
  menu: readonly ToolVisivel[];
  coleta: string;
  falhas: string;
  voltasRestantes: number;
  /**
   * F6 · As lacunas que a CRÍTICA apontou (`sem_fonte`). Presentes, invertem a regra principal: a
   * volta normal existe pra ser dispensada ("na dúvida, pronto"), esta existe porque o veredito já
   * disse que falta lastro — responder `pronto` aqui é devolver o mesmo texto sem fonte.
   */
  lacunas?: readonly string[];
}): { sys: string; user: string } {
  const dirigida = !!p.lacunas?.length;
  const sys = [
    "Você decide se FALTA alguma ferramenta a ser chamada antes de responder. Não escreve a resposta.",
    "Responda SOMENTE JSON: {\"pronto\": true} OU {\"chamadas\":[{\"tool\":\"<nome>\",\"args\":{...}}]}.",
    "",
    ...(dirigida
      ? [
        "REGRA PRINCIPAL: a revisão JÁ APONTOU que a resposta não tem lastro em fonte. Então o",
        "padrão aqui é BUSCAR, não dispensar: só responda `pronto` se nenhuma ferramenta da lista",
        "puder cobrir a lacuna. Mire nela — mude os termos da busca, não repita a consulta que já",
        "falhou.",
      ]
      : [
        "REGRA PRINCIPAL: na dúvida, `pronto: true`. O que já foi reunido quase sempre basta — pedir",
        "ferramenta à toa custa tempo de quem está esperando a resposta. Só peça quando faltar algo",
        "CONCRETO e NOMEÁVEL (um dado, uma fonte, o conteúdo de um endereço que a pessoa mandou).",
      ]),
    "",
    "- Use SÓ os nomes da lista abaixo, com os argumentos exatos dela. Nome inventado é descartado.",
    "- NUNCA repita uma chamada que já foi feita (a lista está no pedido).",
    "- Ferramenta que já FALHOU não melhora na segunda vez: contorne ou dê `pronto`.",
    `- No máximo ${MAX_CHAMADAS} chamadas nesta volta.`,
    "- Nada de pedir ferramenta pra 'confirmar' o que a evidência já diz.",
  ].join("\n");

  const user = [
    `Objetivo: ${p.objetivo}`,
    `Modo: ${p.modo} · Acadêmico: ${p.academico}`,
    "",
    "FERRAMENTAS:",
    menuDeTools(p.menu),
    "",
    "JÁ REUNIDO:",
    p.coleta,
    ...(p.falhas ? ["", "JÁ FALHARAM (não insista):", p.falhas] : []),
    ...(dirigida ? ["", "O QUE A REVISÃO APONTOU:", ...p.lacunas!.map((l) => `- ${l}`)] : []),
    "",
    dirigida
      ? "Esta é a ÚNICA volta pra cobrir essa lacuna: se houver ferramenta que a cubra, chame agora."
      : p.voltasRestantes <= 1
        ? "Esta é a ÚLTIMA volta possível: se não for essencial, responda pronto."
        : `Ainda cabem ${p.voltasRestantes} voltas, mas usar todas não é meta.`,
  ].join("\n");

  return { sys, user };
}
