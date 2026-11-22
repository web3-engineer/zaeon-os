/**
 * lib/canal/agenda.ts — a AGENDA do escritório (PURO e isomórfico; servidor e tela usam o mesmo).
 *
 * Grade semanal: colunas = dias da semana, linhas = horas (1 quadrado = 1h). Cada pessoa com acesso ao
 * canal marca o seu horário de trabalho; todo mundo do canal vê (decisão do #396). Repete TODA semana:
 * um bloco é (dia da semana, hora inicial, hora final) — não tem data.
 *
 * Marcar: 1º clique escolhe o quadrado inicial; 2º clique NA MESMA COLUNA fecha o intervalo
 * (terça 9 + terça 15 = terça das 9h às 16h: o quadrado das 15h está incluído). A foto da pessoa fica só
 * no quadrado inicial; a cor dela pinta todos até o final. Clique em outra coluna recomeça a seleção.
 *
 * #850: MINUTOS opcionais (`de`/`ate`, minutos desde a meia-noite, de 15 em 15): sem eles vale a hora cheia do
 * quadrado. Horários da mesma pessoa que se ENCOSTAM ou se sobrepõem no mesmo dia viram UM só (juntar). A grade
 * desenha FAIXAS (os pedaços da pessoa juntos), com a foto só no começo. E como a agenda se repete, nada é
 * bloqueado: o que já passou NESTA semana só fica apagado e "vale a partir da próxima".
 */

/** 0 = domingo … 6 = sábado (o mesmo de Date.getDay()). */
export type Dia = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Primeira e última hora da grade (quadrados 7h … 22h; o último vai até 23h). */
export const HORA_INICIO = 7;
export const HORA_FIM = 22;
export const HORAS: readonly number[] = Array.from({ length: HORA_FIM - HORA_INICIO + 1 }, (_, i) => HORA_INICIO + i);

/** Ordem das colunas: semana de trabalho primeiro (segunda → domingo). */
export const DIAS_ORDEM: readonly Dia[] = [1, 2, 3, 4, 5, 6, 0];
export const DIA_CURTO: Record<Dia, string> = { 0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb" };
export const DIA_LONGO: Record<Dia, string> = { 0: "domingo", 1: "segunda", 2: "terça", 3: "quarta", 4: "quinta", 5: "sexta", 6: "sábado" };

/** Um horário marcado. `inicio` e `fim` são QUADRADOS (inclusivos): 9..15 = das 9h às 16h. `de`/`ate` (#850,
 *  opcionais): os minutos exatos — 450..600 = das 7h30 às 10h (`ate` não incluso). */
export type Bloco = { id?: string; userId: string; dia: Dia; inicio: number; fim: number; de?: number; ate?: number };

/** #850: minutos de 15 em 15, dentro da grade (7h00 … 23h00). */
export const PASSO_MIN = 15;
export const MIN_INICIO = HORA_INICIO * 60;
export const MIN_FIM = (HORA_FIM + 1) * 60;

/** Os minutos de um bloco (os antigos, sem `de`/`ate`, valem a hora cheia dos quadrados). */
export function minutosDo(b: Pick<Bloco, "inicio" | "fim" | "de" | "ate">): { de: number; ate: number } {
  return { de: b.de ?? b.inicio * 60, ate: b.ate ?? (b.fim + 1) * 60 };
}

const ehDia = (v: unknown): v is Dia => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 6;
const ehHora = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= HORA_INICIO && (v as number) <= HORA_FIM;

/** Valida e ordena (aceita os dois cliques em qualquer ordem). null = inválido. */
export function normalizarBloco(dia: unknown, a: unknown, b: unknown): Omit<Bloco, "userId" | "id"> | null {
  const d = typeof dia === "string" ? Number(dia) : dia;
  const x = typeof a === "string" ? Number(a) : a;
  const y = typeof b === "string" ? Number(b) : b;
  if (!ehDia(d) || !ehHora(x) || !ehHora(y)) return null;
  return { dia: d, inicio: Math.min(x, y), fim: Math.max(x, y) };
}

/** Um bloco a partir de minutos (valida passo e limites). null = inválido. */
export function blocoDeMinutos(dia: unknown, de: unknown, ate: unknown): Omit<Bloco, "userId" | "id"> | null {
  const d = typeof dia === "string" ? Number(dia) : dia;
  const x = typeof de === "string" ? Number(de) : de;
  const y = typeof ate === "string" ? Number(ate) : ate;
  if (!ehDia(d) || !Number.isInteger(x) || !Number.isInteger(y)) return null;
  const a = x as number, z = y as number;
  if (a % PASSO_MIN || z % PASSO_MIN || a < MIN_INICIO || z > MIN_FIM || a >= z) return null;
  return { dia: d, inicio: Math.floor(a / 60), fim: Math.ceil(z / 60) - 1, de: a, ate: z };
}

/** Se sobrepõem OU se encostam (9h–12h e 12h–14h) no mesmo dia. */
const encosta = (p: Bloco, q: Bloco) => {
  if (p.dia !== q.dia) return false;
  const a = minutosDo(p), b = minutosDo(q);
  return a.de <= b.ate && b.de <= a.ate;
};

/**
 * Aplica o bloco novo de UMA pessoa: os blocos dela que se sobrepõem ou ENCOSTAM nele no mesmo dia saem, e o novo
 * vira a UNIÃO de todos (#850: marcar 9h, depois 10h, depois 11h dá um bloco só, 9h–12h — uma foto, um apagar).
 * Os de outras pessoas ficam — várias pessoas podem dividir o mesmo horário. Diminuir um horário é pela janelinha
 * do bloco (que manda `substitui`). Devolve também quais saíram (o servidor apaga esses).
 */
export function aplicarBloco<T extends Bloco>(blocos: T[], novo: T): { blocos: T[]; removidos: T[] } {
  const removidos: T[] = [];
  let atual: T = { ...novo };
  // repete até parar de crescer: juntar dois pode passar a encostar num terceiro
  for (let mudou = true; mudou;) {
    mudou = false;
    for (const b of blocos) {
      if (b.userId !== novo.userId || removidos.includes(b) || !encosta(b, atual)) continue;
      removidos.push(b);
      const m = minutosDo(b), n = minutosDo(atual);
      const de = Math.min(m.de, n.de), ate = Math.max(m.ate, n.ate);
      atual = { ...atual, de, ate, inicio: Math.floor(de / 60), fim: Math.ceil(ate / 60) - 1 };
      mudou = true;
    }
  }
  // sem minutos quebrados, guarda como antes (só a hora cheia)
  const m = minutosDo(atual);
  if (m.de % 60 === 0 && m.ate % 60 === 0) { delete atual.de; delete atual.ate; }
  const ficam = blocos.filter((b) => !removidos.includes(b));
  return { blocos: [...ficam, atual], removidos };
}

// ───────────────────────────── faixas (o que a grade desenha) ─────────────────────────────

/** Os pedaços de uma pessoa num dia, juntos (inclusive os antigos, marcados hora por hora). */
export type Faixa = { userId: string; dia: Dia; de: number; ate: number; ids: string[] };

export function faixas(blocos: Bloco[]): Faixa[] {
  const ord = [...blocos].sort((a, b) => a.userId.localeCompare(b.userId) || a.dia - b.dia || minutosDo(a).de - minutosDo(b).de);
  const out: Faixa[] = [];
  for (const b of ord) {
    const m = minutosDo(b);
    const ult = out[out.length - 1];
    if (ult && ult.userId === b.userId && ult.dia === b.dia && m.de <= ult.ate) {
      ult.ate = Math.max(ult.ate, m.ate);
      if (b.id) ult.ids.push(b.id);
    } else out.push({ userId: b.userId, dia: b.dia, de: m.de, ate: m.ate, ids: b.id ? [b.id] : [] });
  }
  return out;
}

/** O pedaço de cada faixa dentro do quadrado (dia, hora): `topo`/`altura` em % do quadrado; `inicial` = onde vai a foto. */
export function naCelula(fs: Faixa[], dia: Dia, hora: number): { faixa: Faixa; topo: number; altura: number; inicial: boolean }[] {
  const a = hora * 60, z = a + 60;
  return fs
    .filter((f) => f.dia === dia && f.de < z && f.ate > a)
    .map((f) => ({
      faixa: f,
      topo: ((Math.max(f.de, a) - a) / 60) * 100,
      altura: ((Math.min(f.ate, z) - Math.max(f.de, a)) / 60) * 100,
      inicial: Math.floor(f.de / 60) === hora,
    }));
}

// ───────────────────────────── #861: o bloco desenhado de uma vez ─────────────────────────────

/** Altura de UMA hora na grade (px): alta o bastante pra foto, nome e horário caberem dentro do bloco. */
export const ALTURA_HORA = { computador: 56, celular: 64 } as const;

/**
 * Um bloco já posicionado no dia: onde começa/termina (px), em que coluna está e quantas colunas o grupo tem.
 * #861 PR 2: `multidao` = o grupo tinha gente demais pra colunas (4 ou mais ao mesmo tempo) e virou UM bloco
 * com todas as faixas dele (a `faixa` é a união: do primeiro começo ao último fim).
 */
export type BlocoNoDia = { faixa: Faixa; topo: number; altura: number; coluna: number; colunas: number; multidao?: Faixa[] };

/** #861 PR 2: a partir de quantas pessoas ao mesmo tempo o grupo vira "N pessoas" (até 3, uma coluna pra cada). */
export const LIMITE_COLUNAS = 3;

/**
 * #861: os blocos de UM dia, cada um como uma barra só (do começo ao fim), e lado a lado quando se sobrepõem
 * (como o Google Agenda): um grupo de horários que se cruzam divide a largura em colunas iguais; quem encosta
 * (um termina quando o outro começa) não se cruza. A coluna fica a mesma o bloco inteiro — ninguém troca de lugar.
 */
export function blocosDoDia(fs: Faixa[], dia: Dia, alturaHora: number): BlocoNoDia[] {
  const doDia = fs.filter((f) => f.dia === dia).sort((a, b) => a.de - b.de || b.ate - a.ate || a.userId.localeCompare(b.userId));
  const out: BlocoNoDia[] = [];
  let grupo: { faixa: Faixa; coluna: number }[] = [];
  let fimDoGrupo = -1;
  const fechar = () => {
    const n = grupo.reduce((m, g) => Math.max(m, g.coluna + 1), 0);
    if (n > LIMITE_COLUNAS) {
      // gente demais pra colunas: o grupo inteiro vira um bloco "N pessoas" (como o When2meet / Morgen)
      const de = Math.min(...grupo.map((g) => g.faixa.de)), ate = Math.max(...grupo.map((g) => g.faixa.ate));
      const primeira = grupo[0]!.faixa;
      out.push({
        faixa: { userId: primeira.userId, dia: primeira.dia, de, ate, ids: grupo.flatMap((g) => g.faixa.ids) },
        coluna: 0, colunas: 1, multidao: grupo.map((g) => g.faixa),
        topo: ((de - MIN_INICIO) / 60) * alturaHora, altura: ((ate - de) / 60) * alturaHora,
      });
      grupo = [];
      return;
    }
    for (const g of grupo) {
      out.push({
        faixa: g.faixa, coluna: g.coluna, colunas: n,
        topo: ((g.faixa.de - MIN_INICIO) / 60) * alturaHora,
        altura: ((g.faixa.ate - g.faixa.de) / 60) * alturaHora,
      });
    }
    grupo = [];
  };
  for (const f of doDia) {
    if (grupo.length && f.de >= fimDoGrupo) fechar();
    // a primeira coluna livre (cujo último bloco já terminou)
    const fimDaColuna = new Map<number, number>();
    for (const g of grupo) fimDaColuna.set(g.coluna, Math.max(fimDaColuna.get(g.coluna) ?? 0, g.faixa.ate));
    let c = 0;
    while ((fimDaColuna.get(c) ?? -1) > f.de) c++;
    grupo.push({ faixa: f, coluna: c });
    fimDoGrupo = Math.max(fimDoGrupo, f.ate);
  }
  if (grupo.length) fechar();
  return out;
}

/**
 * #861: como a foto entra no bloco, conforme o tamanho dele:
 *  - "curto"   (bloco baixo, ~15 min): só a foto, presa na borda esquerda e um pouco pra fora;
 *  - "linha"   (30 min a ~1h20): foto pequena do lado e o horário (com o nome, se couber a altura);
 *  - "estreito" (dividindo o horário com outra pessoa): foto no meio e só a hora embaixo;
 *  - "mini"    (estreito E baixo): só a foto, no meio — pra fora invadiria a coluna do vizinho;
 *  - "cartao"  (~1h30 ou mais, largura inteira): foto em cima, nome e horário embaixo.
 */
export type ModoDoBloco = "curto" | "linha" | "estreito" | "mini" | "cartao";
/** #867: a partir desta largura (px) uma coluna dividida já cabe foto + nome + horário (o celular, com um dia só). */
export const LARGURA_COLUNA_FOLGADA = 110;
export function modoDoBloco(alturaPx: number, colunas: number, larguraPx?: number): ModoDoBloco {
  if (colunas > 1 && (larguraPx ?? 0) >= LARGURA_COLUNA_FOLGADA) {
    // dividindo, mas com espaço (celular): como um bloco de largura inteira — só não usa o "curto",
    // que põe a foto pra fora da borda e invadiria a coluna do vizinho
    if (alturaPx < 24) return "mini";
    return alturaPx < 80 ? "linha" : "cartao";
  }
  if (colunas > 1) return alturaPx < 44 ? "mini" : "estreito";
  if (alturaPx < 24) return "curto";
  // o cartão (foto em cima, nome e horário embaixo) precisa de ~80 px: abaixo disso, foto do lado
  if (alturaPx < 80) return "linha";
  return "cartao";
}

/** #861 PR 2: quantas PESSOAS diferentes há num bloco de multidão (a mesma pessoa pode ter dois pedaços). */
export const pessoasNoBloco = (b: Pick<BlocoNoDia, "faixa" | "multidao">): string[] =>
  [...new Set((b.multidao ?? [b.faixa]).map((f) => f.userId))];

/** #861 PR 2: o bloco está acontecendo AGORA (hoje, e a hora atual cai dentro dele)? */
export const acontecendoAgora = (f: Pick<Faixa, "dia" | "de" | "ate">, agora: Date): boolean => {
  const m = agora.getHours() * 60 + agora.getMinutes();
  return f.dia === agora.getDay() && f.de <= m && m < f.ate;
};

/** #861 PR 2: o filtro de cima da agenda. "contatos" = eu + quem aceitou (ou teve aceito) um convite de contato. */
export type FiltroAgenda = "todos" | "eu" | "contatos";
export function filtrarFaixas(fs: Faixa[], filtro: FiltroAgenda, eu: string | null, contatos: ReadonlySet<string>): Faixa[] {
  if (filtro === "todos") return fs;
  if (filtro === "eu") return fs.filter((f) => f.userId === eu);
  return fs.filter((f) => f.userId === eu || contatos.has(f.userId));
}

// ───────────────────────────── hoje, agora e o que já passou ─────────────────────────────

/** Posição do dia na semana da grade (segunda = 0 … domingo = 6). */
export const posNaSemana = (d: Dia): number => (d + 6) % 7;

/** O quadrado (dia, hora) já passou NESTA semana? (A agenda se repete: passou = vale a partir da próxima.) */
export function jaPassou(dia: Dia, hora: number, agora: Date): boolean {
  const hoje = agora.getDay() as Dia;
  if (posNaSemana(dia) !== posNaSemana(hoje)) return posNaSemana(dia) < posNaSemana(hoje);
  return (hora + 1) * 60 <= agora.getHours() * 60 + agora.getMinutes();
}

/** A próxima vez que o horário acontece (hoje ainda vale se não começou). */
export function proximaVez(dia: Dia, de: number, agora: Date): Date {
  const d = new Date(agora);
  d.setHours(0, 0, 0, 0);
  let dias = (dia - agora.getDay() + 7) % 7;
  if (dias === 0 && agora.getHours() * 60 + agora.getMinutes() >= de) dias = 7;
  d.setDate(d.getDate() + dias);
  return d;
}

/** "seg, 24/11" */
export function textoData(d: Date): string {
  return `${DIA_CURTO[d.getDay() as Dia].toLowerCase()}, ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** 450 → "7h30"; 600 → "10h" */
export function textoHora(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** Os horários do seletor da janelinha (7h00 … 23h00, de 15 em 15). */
export const OPCOES_MIN: readonly number[] = Array.from({ length: (MIN_FIM - MIN_INICIO) / PASSO_MIN + 1 }, (_, i) => MIN_INICIO + i * PASSO_MIN);

/** Quem ocupa um quadrado (dia, hora), e se ali é o quadrado INICIAL do bloco (onde vai a foto). */
export function ocupantes<T extends Bloco>(blocos: T[], dia: Dia, hora: number): { bloco: T; inicial: boolean }[] {
  return blocos
    .filter((b) => b.dia === dia && b.inicio <= hora && hora <= b.fim)
    .map((b) => ({ bloco: b, inicial: b.inicio === hora }));
}

// ───────────────────────────── seleção por dois cliques ─────────────────────────────

export type Ancora = { dia: Dia; hora: number } | null;
export type Clique = { dia: Dia; hora: number };
export type ResultadoClique = { ancora: Ancora; bloco: Omit<Bloco, "userId" | "id"> | null };

/** 1º clique marca a âncora; 2º na mesma coluna fecha o bloco; em outra coluna vira a nova âncora. */
export function proximoClique(ancora: Ancora, clique: Clique): ResultadoClique {
  if (!ancora || ancora.dia !== clique.dia) return { ancora: { dia: clique.dia, hora: clique.hora }, bloco: null };
  return { ancora: null, bloco: normalizarBloco(clique.dia, ancora.hora, clique.hora) };
}

// ───────────────────────────── cor e texto ─────────────────────────────

/** Paleta das pessoas (legível no claro e no escuro). #850: cores BEM diferentes entre si — o laranja e o vermelho
 *  ficavam iguais (marrom) no escuro; agora ficam longe na ordem e o vermelho é rosado. */
export const PALETA = ["#3b82f6", "#f97316", "#22c55e", "#a855f7", "#ec4899", "#14b8a6", "#eab308", "#6366f1", "#84cc16", "#f43f5e"] as const;

export function corDaPessoa(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return PALETA[h % PALETA.length]!;
}

/** #858: acabou a paleta → uma cor nova pelo ângulo de ouro (cada uma bem longe da anterior no círculo).
 *  Sai em hex (#rrggbb) porque a agenda soma a transparência no fim ("…7a"). */
export function corExtra(n: number): string {
  const h = (n * 137.508 + 20) % 360, s = 0.7, l = 0.48;
  const k = (x: number) => (x + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (x: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(x) - 3, 9 - k(x), 1))));
  return "#" + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** #850: as cores de um canal SEM repetir — na ordem de quem aparece (depois da paleta, cores extras). */
export function coresDoCanal(ids: string[]): Map<string, string> {
  const m = new Map<string, string>();
  const usadas = new Set<string>();
  let extra = 0;
  for (const id of ids) {
    if (m.has(id)) continue;
    const pref = corDaPessoa(id);
    let cor = !usadas.has(pref) ? pref : PALETA.find((c) => !usadas.has(c));
    while (!cor || usadas.has(cor)) cor = corExtra(extra++);
    m.set(id, cor);
    usadas.add(cor);
  }
  return m;
}

/** "terça, das 9h às 16h" (o quadrado final conta inteiro; com minutos, "das 7h30 às 10h"). */
export function textoBloco(b: Pick<Bloco, "dia" | "inicio" | "fim" | "de" | "ate">): string {
  const m = minutosDo(b);
  return `${DIA_LONGO[b.dia]}, das ${textoHora(m.de)} às ${textoHora(m.ate)}`;
}
