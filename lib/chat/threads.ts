/**
 * lib/chat/threads.ts — conversas da Aura como coisas separadas.
 *
 * Até aqui a Sala de Estudos tinha UMA thread: a chave `zaeon.cowork.thread.v1` guardava
 * um único histórico, e falar de cafeína e de Kant era a mesma conversa infinita. Isto
 * quebra em threads: cada aba é uma conversa com histórico próprio.
 *
 * Aritmética e armazenamento, sem React: dá pra testar num terminal. Todo acesso ao
 * localStorage é embrulhado — em aba anônima ele lança, e perder a aba é ruim, mas
 * derrubar a sala inteira é pior.
 *
 * A thread velha não é jogada fora: na primeira abertura ela vira a primeira aba, com o
 * histórico intacto. Ninguém perde conversa por causa de refactor.
 */

export type Thread = {
  id: string;
  titulo: string;
  criadaEm: number;
  /** Última vez que a pessoa mexeu nela — ordena as abas. */
  tocadaEm: number;
  /**
   * Sub-conversa (sub-tema do mesmo nicho): id da conversa-mãe. UM nível só — mãe → filhas,
   * nunca neta (criarSubThread sobe pra mãe se pedirem filha de uma filha).
   */
  parentId?: string;
  /** Contexto herdado da mãe (título + o fim da última resposta) — vai junto no 1º envio da filha. */
  contexto?: string;
};

export const CHAVE_INDICE = "zaeon.cowork.threads.v1";
export const CHAVE_ATIVA = "zaeon.cowork.threadAtiva.v1";
/** A thread única de antes do refactor. Vira a aba #1 na migração. */
export const CHAVE_LEGADA = "zaeon.cowork.thread.v1";

export const TITULO_PADRAO = "Nova conversa";
/**
 * Teto de conversas guardadas. Era 12 quando eram abas horizontais (acima disso a barra virava
 * acordeão); na barra lateral vertical, com busca, cabem bem mais — as mais antigas saem do fim.
 */
export const MAX_ABAS = 40;

/**
 * Escopo = o conjunto de chaves de UMA sala. Estudos usa o COWORK (padrão, inalterado);
 * a Sala de Pesquisa tem o seu, pra as conversas dela não se misturarem com as da Aura.
 */
export type Escopo = { indice: string; ativa: string; legada: string; prefixo: string };
export const ESCOPO_COWORK: Escopo = {
  indice: CHAVE_INDICE, ativa: CHAVE_ATIVA, legada: CHAVE_LEGADA, prefixo: "zaeon.cowork.thread.",
};
/** Sala de Pesquisa: a conversa única de antes (`zaeon.research.thread.v1`) vira a aba #1. */
export const ESCOPO_PESQUISA: Escopo = {
  indice: "zaeon.research.threads.v1", ativa: "zaeon.research.threadAtiva.v1",
  legada: "zaeon.research.thread.v1", prefixo: "zaeon.research.thread.",
};

export const chaveDaThread = (id: string, e: Escopo = ESCOPO_COWORK) => `${e.prefixo}${id}`;

/** Armazenamento injetável — o teste passa um mapa, o navegador passa o localStorage. */
export type Armazem = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function ler<T>(a: Armazem, chave: string, padrao: T): T {
  try {
    const bruto = a.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : padrao;
  } catch {
    return padrao;
  }
}

function gravar(a: Armazem, chave: string, valor: unknown): void {
  try {
    a.setItem(chave, JSON.stringify(valor));
  } catch {
    /* aba anônima / cota estourada: a sessão segue em memória */
  }
}

export function novoId(): string {
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Título a partir da primeira mensagem — igual ao que toda IA faz, e melhor do que
 * "Nova conversa (3)". Corta na primeira quebra de sentido, não no meio da palavra.
 */
export function tituloAPartirDe(texto: string, limite = 34): string {
  const limpo = (texto || "").replace(/\s+/g, " ").trim();
  if (!limpo) return TITULO_PADRAO;
  const frase = limpo.split(/[.!?\n]/)[0].trim() || limpo;
  if (frase.length <= limite) return frase;
  const corte = frase.slice(0, limite);
  const espaco = corte.lastIndexOf(" ");
  let base = (espaco > limite * 0.6 ? corte.slice(0, espaco) : corte).trim();
  // Tira artigo/preposição pendurada no fim: "profundamente a…" fica feio e não informa.
  base = base.replace(/\s+(a|o|as|os|de|da|do|das|dos|em|no|na|um|uma|e|ou|que|com|por)$/i, "");
  return base + "…";
}

/**
 * Lê o índice de threads. Na primeira vez, adota a conversa legada como aba #1 —
 * migração silenciosa: o aluno abre e a conversa dele está lá, agora numa aba.
 */
export function carregarThreads(a: Armazem, e: Escopo = ESCOPO_COWORK): Thread[] {
  const salvas = ler<Thread[]>(a, e.indice, []);
  if (Array.isArray(salvas) && salvas.length) return salvas.filter((t) => t && t.id);

  const legado = ler<any[]>(a, e.legada, []);
  const agora = Date.now();
  const primeira: Thread = {
    id: novoId(),
    titulo: TITULO_PADRAO,
    criadaEm: agora,
    tocadaEm: agora,
  };
  if (Array.isArray(legado) && legado.length) {
    // Move o histórico pra chave da thread nova e batiza pela 1ª fala do aluno.
    gravar(a, chaveDaThread(primeira.id, e), legado);
    const primeiraDoAluno = legado.find((m) => m?.role === "user" && typeof m?.text === "string");
    if (primeiraDoAluno) primeira.titulo = tituloAPartirDe(primeiraDoAluno.text);
  }
  gravar(a, e.indice, [primeira]);
  return [primeira];
}

/** #663: só lê a lista. Quem não é o chat não pode criá-la: o chat usa a falta dela para buscar o histórico no servidor. */
export function listarThreads(a: Armazem, e: Escopo = ESCOPO_COWORK): Thread[] {
  const salvas = ler<Thread[]>(a, e.indice, []);
  return Array.isArray(salvas) ? salvas.filter((t) => t && t.id) : [];
}

export function salvarThreads(a: Armazem, threads: readonly Thread[], e: Escopo = ESCOPO_COWORK): void {
  gravar(a, e.indice, threads.slice(0, MAX_ABAS));
}

export function threadAtiva(a: Armazem, threads: readonly Thread[], e: Escopo = ESCOPO_COWORK): string | null {
  const salva = (() => { try { return a.getItem(e.ativa); } catch { return null; } })();
  if (salva && threads.some((t) => t.id === salva)) return salva;
  return threads[0]?.id ?? null;
}

export function marcarAtiva(a: Armazem, id: string, e: Escopo = ESCOPO_COWORK): void {
  try { a.setItem(e.ativa, id); } catch { /* ignore */ }
}

export function criarThread(threads: readonly Thread[], titulo = TITULO_PADRAO): { threads: Thread[]; nova: Thread } {
  const agora = Date.now();
  const nova: Thread = { id: novoId(), titulo, criadaEm: agora, tocadaEm: agora };
  // Entra no começo: a conversa nova é a que interessa agora.
  return { threads: [nova, ...threads].slice(0, MAX_ABAS), nova };
}

/**
 * Sub-conversa: nasce LOGO ABAIXO da mãe (na lista e no acordeão), herdando o contexto do nicho.
 * Pedir filha de uma filha vira irmã (mesma mãe) — a árvore tem um nível só.
 */
export function criarSubThread(
  threads: readonly Thread[], paiId: string, titulo = TITULO_PADRAO, contexto?: string,
): { threads: Thread[]; nova: Thread } {
  const pai = threads.find((t) => t.id === paiId);
  if (!pai) return criarThread(threads, titulo);
  const maeId = pai.parentId && threads.some((t) => t.id === pai.parentId) ? pai.parentId : pai.id;
  const agora = Date.now();
  const nova: Thread = { id: novoId(), titulo, criadaEm: agora, tocadaEm: agora, parentId: maeId };
  if (contexto) nova.contexto = contexto.slice(0, 2000);
  const lista = [...threads];
  const idx = lista.findIndex((t) => t.id === maeId);
  lista.splice(idx + 1, 0, nova);
  return { threads: lista.slice(0, MAX_ABAS), nova };
}

export type NoConversa = { thread: Thread; filhas: Thread[] };

/**
 * A lista plana vira a árvore da barra lateral: mães na ordem em que estão, cada uma com as
 * filhas embaixo. Filha cuja mãe sumiu (teto, migração) não some — vira mãe.
 */
export function arvoreDeThreads(threads: readonly Thread[]): NoConversa[] {
  const ids = new Set(threads.map((t) => t.id));
  const raiz = (t: Thread) => !t.parentId || !ids.has(t.parentId) || t.parentId === t.id;
  const nos: NoConversa[] = threads.filter(raiz).map((thread) => ({ thread, filhas: [] }));
  const porId = new Map(nos.map((n) => [n.thread.id, n]));
  for (const t of threads) if (!raiz(t)) porId.get(t.parentId!)?.filhas.push(t);
  return nos;
}

export function renomearThread(threads: readonly Thread[], id: string, titulo: string): Thread[] {
  const limpo = (titulo || "").trim();
  if (!limpo) return [...threads];
  return threads.map((t) => (t.id === id ? { ...t, titulo: limpo, tocadaEm: Date.now() } : t));
}

/**
 * Fecha uma aba e apaga o histórico dela — e o das sub-conversas dela (sub-tema sem a mãe
 * não faz sentido). Nunca deixa zero abas: fechar a última cria uma vazia no lugar — uma
 * sala de conversa sem conversa nenhuma é um beco sem saída.
 */
export function fecharThread(a: Armazem, threads: readonly Thread[], id: string, e: Escopo = ESCOPO_COWORK): { threads: Thread[]; proxima: string } {
  const sai = new Set([id, ...threads.filter((t) => t.parentId === id).map((t) => t.id)]);
  for (const s of sai) try { a.removeItem(chaveDaThread(s, e)); } catch { /* ignore */ }
  const restantes = threads.filter((t) => !sai.has(t.id));
  if (!restantes.length) {
    const { threads: nova, nova: n } = criarThread([]);
    return { threads: nova, proxima: n.id };
  }
  // A vizinha de quem saiu: a próxima que sobrou depois dela (ou a última, se ela era o fim).
  const idx = threads.findIndex((t) => t.id === id);
  const depois = threads.slice(idx + 1).find((t) => !sai.has(t.id));
  const proxima = (depois ?? restantes[restantes.length - 1]).id;
  return { threads: restantes, proxima };
}

/** Marca uso — mantém a ordem estável, só atualiza o carimbo. */
export function tocarThread(threads: readonly Thread[], id: string): Thread[] {
  return threads.map((t) => (t.id === id ? { ...t, tocadaEm: Date.now() } : t));
}

export function carregarMensagens<T = any>(a: Armazem, id: string, e: Escopo = ESCOPO_COWORK): T[] {
  return ler<T[]>(a, chaveDaThread(id, e), []);
}

export function salvarMensagens(a: Armazem, id: string, mensagens: readonly unknown[], e: Escopo = ESCOPO_COWORK): void {
  gravar(a, chaveDaThread(id, e), mensagens.slice(-60));
}

/**
 * #705: o nome que a lista mostra. Duas conversas com o mesmo título ganham a data (e a hora, se forem do mesmo dia),
 * para dar para saber qual é qual. O título guardado não muda.
 */
export function rotulosDasThreads(threads: readonly Thread[]): Map<string, string> {
  const marcas = marcasDasThreads(threads);
  return new Map(threads.map((t) => [t.id, marcas.has(t.id) ? `${t.titulo} · ${marcas.get(t.id)}` : t.titulo]));
}

/**
 * #728: só a data (e a hora) que separa conversas de mesmo título. A lista mostra essa marca FORA do corte do nome —
 * com o nome longo, o "…" comia a data e as duas pareciam iguais.
 */
export function marcasDasThreads(threads: readonly Thread[]): Map<string, string> {
  const chave = (t: Thread) => t.titulo.trim().toLowerCase();
  const grupos = new Map<string, Thread[]>();
  for (const t of threads) grupos.set(chave(t), [...(grupos.get(chave(t)) ?? []), t]);
  const out = new Map<string, string>();
  const dia = (n: number) => new Date(n).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const hora = (n: number) => new Date(n).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  for (const g of grupos.values()) {
    const mesmoDia = new Set(g.map((t) => dia(t.criadaEm))).size < g.length;
    if (g.length < 2) continue;
    // (no mesmo minuto, os segundos — senão as duas ficavam com a mesma marca)
    const mesmoMinuto = mesmoDia && new Set(g.map((t) => `${dia(t.criadaEm)} ${hora(t.criadaEm)}`)).size < g.length;
    const seg = (n: number) => `:${String(new Date(n).getSeconds()).padStart(2, "0")}`;
    for (const t of g) out.set(t.id, `${dia(t.criadaEm)}${mesmoDia ? ` ${hora(t.criadaEm)}${mesmoMinuto ? seg(t.criadaEm) : ""}` : ""}`);
  }
  return out;
}

/**
 * #733: a lista de conversas separada por DIA — "Hoje", "Ontem", "Últimos 7 dias", "Últimos 30 dias", "Mais antigas".
 * A data sai do lado do nome (ela roubava o espaço e o nome virava "o que é fotossí…"); o dia vira o título do grupo.
 */
export type GrupoDoDia = "Hoje" | "Ontem" | "Últimos 7 dias" | "Últimos 30 dias" | "Mais antigas";
const inicioDoDia = (n: number) => { const d = new Date(n); d.setHours(0, 0, 0, 0); return d.getTime(); };
export function grupoDoDia(criadaEm: number, agora: number = Date.now()): GrupoDoDia {
  const dias = Math.round((inicioDoDia(agora) - inicioDoDia(criadaEm)) / 86_400_000);
  if (dias <= 0) return "Hoje";
  if (dias === 1) return "Ontem";
  if (dias < 7) return "Últimos 7 dias";
  if (dias < 30) return "Últimos 30 dias";
  return "Mais antigas";
}

/** "criada hoje às 21:28", "criada ontem às 09:05", "criada em 05/11 às 14:00" — o que aparece ao passar o mouse */
export function quandoCriada(criadaEm: number, agora: number = Date.now()): string {
  const hora = new Date(criadaEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const g = grupoDoDia(criadaEm, agora);
  if (g === "Hoje") return `criada hoje às ${hora}`;
  if (g === "Ontem") return `criada ontem às ${hora}`;
  return `criada em ${new Date(criadaEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} às ${hora}`;
}

/** os nós da lista em grupos de dia, a mais nova primeiro (a ordem de dentro de cada dia não muda) */
export function gruposDoDia<N extends { thread: Thread }>(nos: readonly N[], agora: number = Date.now()): { grupo: GrupoDoDia; nos: N[] }[] {
  const ordem: GrupoDoDia[] = ["Hoje", "Ontem", "Últimos 7 dias", "Últimos 30 dias", "Mais antigas"];
  const ordenados = nos.map((n, i) => ({ n, i })).sort((a, b) => (b.n.thread.criadaEm || 0) - (a.n.thread.criadaEm || 0) || a.i - b.i).map((x) => x.n);
  const porGrupo = new Map<GrupoDoDia, N[]>();
  for (const n of ordenados) { const g = grupoDoDia(n.thread.criadaEm || 0, agora); porGrupo.set(g, [...(porGrupo.get(g) ?? []), n]); }
  return ordem.filter((g) => porGrupo.has(g)).map((g) => ({ grupo: g, nos: porGrupo.get(g)! }));
}

/**
 * #733: a 1ª pergunta de uma conversa nova daria o MESMO nome de uma conversa que já existe? Devolve essa conversa
 * (a mais nova, se houver mais de uma), para o chat perguntar "quer continuar nela?" antes de criar a repetida.
 * Compara sem acento, sem caixa e sem pontuação. Conversa sem nome ("Nova conversa") não conta.
 */
export function conversaRepetida(threads: readonly Thread[], ativa: string | null, primeiraPergunta: string): Thread | null {
  const limpar = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[…?!.,;:"'“”]+/g, "").replace(/\s+/g, " ").trim();
  const alvo = limpar(tituloAPartirDe(primeiraPergunta));
  if (!alvo || alvo === limpar(TITULO_PADRAO)) return null;
  const iguais = threads.filter((t) => t.id !== ativa && t.titulo !== TITULO_PADRAO && limpar(t.titulo) === alvo);
  return iguais.sort((a, b) => (b.tocadaEm || 0) - (a.tocadaEm || 0))[0] ?? null;
}
