/**
 * lib/ui/avisos.ts — #850 (PR 2) · a peça única de avisos do app, no lugar das janelinhas antigas do navegador
 * (`alert` / `confirm` / `prompt`), que no celular têm cara de "coisa antiga" e travam a tela.
 *
 *   avisar("Copiado!")                                → aviso pequeno embaixo (some sozinho)
 *   avisar("Não deu pra salvar.", { tipo: "erro" })   → o mesmo, vermelho e um pouco mais demorado
 *   avisar("Apagado", { acao: { rotulo: "Desfazer", fazer } })
 *   if (!(await confirmar({ titulo, texto, botao: "Apagar", perigo: true }))) return;
 *   const nome = await pedirTexto({ titulo: "Nome do arquivo", valor: "src/app.ts" });   // null = cancelou
 *
 * Funciona de qualquer lugar (sem Provider, sem props): é um "quadro" com assinantes. Quem desenha é o
 * <Avisos /> do layout (components/sistema/Avisos.tsx). Sem ninguém desenhando (teste, página sem o layout),
 * cai na janelinha do navegador — nunca deixa uma pergunta sem resposta.
 */

import i18n from "i18next";

/**
 * Tradução fora de componente (os avisos são chamados de handlers, sem `useTranslation`). Sem o i18n pronto
 * (testes, primeiro instante), usa o texto em português que veio junto, já com as variáveis {{x}} trocadas.
 */
export function tr(chave: string, padrao: string, vars: Record<string, string | number> = {}): string {
  if (i18n.isInitialized && i18n.exists(chave)) return String(i18n.t(chave, vars));
  return padrao.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => (k in vars ? String(vars[k]) : ""));
}

export type TipoAviso = "ok" | "erro" | "info";
export type Aviso = {
  id: number;
  texto: string;
  tipo: TipoAviso;
  acao?: { rotulo: string; fazer: () => void };
};
export type Pergunta = {
  id: number;
  modo: "confirmar" | "texto";
  titulo: string;
  texto?: string;
  /** rótulo do botão de seguir (o padrão vem do i18n: "Confirmar"/"OK"). */
  botao?: string;
  /** coisa séria (apagar): botão vermelho e o foco começa no Cancelar. */
  perigo?: boolean;
  /** modo texto: valor inicial e dica do campo. */
  valor?: string;
  dica?: string;
  /** modo texto: aceita seguir com o campo vazio (ex.: "motivo (opcional)"). */
  opcional?: boolean;
  responder:(r: boolean | string | null) => void;
};
export type Quadro = { avisos: Aviso[]; pergunta: Pergunta | null };

/** quanto tempo cada aviso fica (ms): erro e "Desfazer" ficam mais. */
export const DURACAO = { normal: 3500, longo: 6000 } as const;
/** no máximo quantos avisos empilhados (o mais velho sai). */
export const MAX_AVISOS = 3;

let seq = 0;
let quadro: Quadro = { avisos: [], pergunta: null };
const fila: Pergunta[] = [];
const ouvintes = new Set<(q: Quadro) => void>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();
let desenhando = 0;

function publicar(q: Quadro) { quadro = q; ouvintes.forEach((f) => f(q)); }

export function quadroAtual(): Quadro { return quadro; }
export function assinar(f: (q: Quadro) => void): () => void { ouvintes.add(f); return () => { ouvintes.delete(f); }; }
/** o <Avisos /> avisa que está na tela (e quando sai). */
export function registrarDesenho(): () => void { desenhando++; return () => { desenhando = Math.max(0, desenhando - 1); }; }

export function fecharAviso(id: number) {
  const t = timers.get(id); if (t) clearTimeout(t); timers.delete(id);
  if (quadro.avisos.some((a) => a.id === id)) publicar({ ...quadro, avisos: quadro.avisos.filter((a) => a.id !== id) });
}

export function avisar(texto: string, opts: { tipo?: TipoAviso; acao?: Aviso["acao"]; ms?: number } = {}): number {
  const tipo = opts.tipo ?? "ok";
  if (!desenhando) {
    // sem a peça na tela: só erro vira janelinha (um "Copiado!" não merece travar a tela)
    if (tipo === "erro" && typeof window !== "undefined" && typeof window.alert === "function") window.alert(texto);
    return 0;
  }
  const id = ++seq;
  const avisos = [...quadro.avisos, { id, texto, tipo, ...(opts.acao ? { acao: opts.acao } : {}) }].slice(-MAX_AVISOS);
  publicar({ ...quadro, avisos });
  const ms = opts.ms ?? (tipo === "erro" || opts.acao ? DURACAO.longo : DURACAO.normal);
  timers.set(id, setTimeout(() => fecharAviso(id), ms));
  return id;
}

function perguntar(p: Omit<Pergunta, "id" | "responder">): Promise<boolean | string | null> {
  return new Promise((resolve) => {
    const id = ++seq;
    const item: Pergunta = {
      ...p, id,
      responder: (r) => {
        resolve(r);
        const prox = fila.shift() ?? null;
        publicar({ ...quadro, pergunta: prox });
      },
    };
    if (quadro.pergunta) fila.push(item);
    else publicar({ ...quadro, pergunta: item });
  });
}

/** Pergunta "tem certeza?" com o visual do app. true = seguir. */
export async function confirmar(p: { titulo: string; texto?: string; botao?: string; perigo?: boolean }): Promise<boolean> {
  if (!desenhando) {
    if (typeof window === "undefined" || typeof window.confirm !== "function") return false;
    return window.confirm(p.texto ? `${p.titulo}\n\n${p.texto}` : p.titulo);
  }
  return (await perguntar({ modo: "confirmar", ...p })) === true;
}

/** Pede um texto com o visual do app. null = cancelou; o texto vem sem espaços nas pontas. */
export async function pedirTexto(p: { titulo: string; texto?: string; valor?: string; dica?: string; botao?: string; opcional?: boolean }): Promise<string | null> {
  if (!desenhando) {
    if (typeof window === "undefined" || typeof window.prompt !== "function") return null;
    const r = window.prompt(p.titulo, p.valor ?? "");
    return r === null ? null : r.trim();
  }
  const r = await perguntar({ modo: "texto", ...p });
  return typeof r === "string" ? r.trim() : null;
}

/** Copia e avisa (o "Copiado!" que antes era alert). */
export async function copiarComAviso(texto: string, rotulo = "Copiado!", falhou = "Não deu pra copiar."): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    avisar(rotulo);
    return true;
  } catch {
    avisar(falhou, { tipo: "erro" });
    return false;
  }
}

/** só pros testes: volta tudo ao zero. */
export function _zerarAvisos() {
  timers.forEach((t) => clearTimeout(t)); timers.clear();
  fila.length = 0; desenhando = 0; seq = 0;
  publicar({ avisos: [], pergunta: null });
}
