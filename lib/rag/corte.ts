import type { Block } from "@/lib/scholar/types";

/** Tamanho-alvo de um trecho (em caracteres de conteúdo). */
export const ALVO_CHARS = 3000;

export type TrechoCortado = {
  ordem: number;
  texto: string; // caminho + "\n\n" + conteúdo
  caminho: string; // "titulo › Cap 1 › 1.1 › 1.1.1"
  paginaIni: number;
  paginaFim: number;
};

/** Parte um texto longo em pedaços de até `max` chars, cortando na última fronteira de frase/linha da janela. */
function partirTexto(texto: string, max: number): string[] {
  const out: string[] = [];
  let resto = texto;
  while (resto.length > max) {
    const janela = resto.slice(0, max + 1); // +1: enxerga o espaço logo após o limite
    const fim = Math.max(
      janela.lastIndexOf(". ") + 1,
      janela.lastIndexOf("! ") + 1,
      janela.lastIndexOf("? ") + 1,
      janela.lastIndexOf("\n"),
    );
    const corte = fim > 0 && fim <= max ? fim : max; // sem fronteira na janela: corte seco
    out.push(resto.slice(0, corte).trim());
    resto = resto.slice(corte).trimStart();
  }
  if (resto) out.push(resto);
  return out.filter(Boolean);
}

/** `usado`: já saiu no caminho de algum trecho (o texto do título está na base). */
type Titulo = { level?: number; texto: string; pagina: number; usado: boolean };

const SEP = " › ";
const MAX_SEM_NIVEL = 3;
/** Título maior que isso não é título: o pdf-loader tipa corpo como `heading` quando a fonte é a mesma. */
export const MAX_TITULO = 150;

/**
 * "Título" que é corpo de texto: longo demais, ou frases (palavra + pontuação + mais texto, terminando em pontuação).
 * "1. Introdução" / "Cap. 2 Membrana" continuam títulos (o ponto vem de número/abreviação e não termina em pontuação).
 */
export function pareceCorpo(texto: string): boolean {
  if (texto.length > MAX_TITULO) return true;
  return /\p{L}{2,}[.!?]\s+\S/u.test(texto) && /[.!?]$/.test(texto);
}

/**
 * Corta os blocos do pdf-loader em trechos pela estrutura do documento:
 * fecha ao encontrar um título ou ao passar de ALVO_CHARS num limite de bloco;
 * tabela entra inteira (se não couber, fecha o trecho atual e ela vira trecho próprio);
 * figura é ignorada. O caminho é a árvore completa de títulos (pilha por nível).
 * Nenhum texto some: `heading` que parece corpo vira conteúdo, e título que sai da pilha sem nunca ter
 * aparecido num caminho (dois títulos seguidos, título no fim) vira um trecho só dele.
 */
export function cortarEmTrechos(blocks: Block[], titulo: string): TrechoCortado[] {
  const trechos: TrechoCortado[] = [];
  let pilha: Titulo[] = [];
  let partes: string[] = [];
  let chars = 0;
  let paginaIni = 1;
  let paginaFim = 1;
  let ultimaPagina = 1;

  const caminho = () => [titulo, ...pilha.map((t) => t.texto)].join(SEP);

  const fechar = () => {
    if (!partes.length) return;
    const c = caminho();
    trechos.push({
      ordem: trechos.length,
      texto: `${c}\n\n${partes.join("\n\n")}`,
      caminho: c,
      paginaIni,
      paginaFim,
    });
    for (const t of pilha) t.usado = true;
    partes = [];
    chars = 0;
  };

  // tira o topo da pilha; se o título nunca entrou num caminho, vira trecho próprio (o caminho já inclui os pais)
  const desempilhar = () => {
    const topo = pilha[pilha.length - 1];
    if (!topo.usado) {
      adicionar(topo.texto, topo.pagina);
      fechar();
    }
    pilha.pop();
  };

  const adicionar = (texto: string, pagina: number) => {
    if (!partes.length) paginaIni = pagina;
    paginaFim = pagina;
    partes.push(texto);
    chars += texto.length;
  };

  for (const b of blocks) {
    if (typeof b.page === "number" && b.page >= 1) ultimaPagina = b.page;
    if (b.type === "figure") continue;
    const texto = (b.text ?? "").trim();
    if (!texto) continue;

    if (b.type === "heading" && !pareceCorpo(texto)) {
      fechar();
      const level = typeof b.level === "number" && Number.isFinite(b.level) && b.level >= 1 ? b.level : undefined;
      const novo: Titulo = { level, texto, pagina: ultimaPagina, usado: false };
      if (level !== undefined) {
        while (pilha.length && (pilha[pilha.length - 1].level === undefined || pilha[pilha.length - 1].level! >= level)) {
          desempilhar();
        }
        pilha.push(novo);
      } else {
        // título sem nível (PDF mal marcado): filho do anterior, só os 3 mais recentes
        if (pilha.length >= MAX_SEM_NIVEL && !pilha[0].usado) {
          // o mais antigo vai cair da pilha sem ter entrado em caminho nenhum: um trecho com o caminho inteiro o guarda
          const topo = pilha[pilha.length - 1];
          adicionar(topo.texto, topo.pagina);
          fechar();
        }
        pilha.push(novo);
        if (pilha.length > MAX_SEM_NIVEL) pilha = pilha.slice(-MAX_SEM_NIVEL);
      }
      continue;
    }

    if (b.type === "table") {
      if (chars + texto.length > ALVO_CHARS) fechar();
      adicionar(texto, ultimaPagina);
      if (chars > ALVO_CHARS) fechar(); // tabela maior que o alvo: trecho só dela
      continue;
    }

    // parágrafo maior que o alvo: vira vários trechos (o embedder tem limite de entrada)
    if (texto.length > ALVO_CHARS) {
      fechar();
      for (const pedaco of partirTexto(texto, ALVO_CHARS)) {
        adicionar(pedaco, ultimaPagina);
        fechar();
      }
      continue;
    }

    // parágrafo
    if (partes.length && chars + texto.length > ALVO_CHARS) fechar();
    adicionar(texto, ultimaPagina);
  }
  fechar();
  while (pilha.length) desempilhar(); // títulos no fim, sem conteúdo embaixo
  return trechos;
}
