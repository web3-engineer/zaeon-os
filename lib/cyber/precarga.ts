/**
 * Pré-carga do cyberespaço — começa na PÁGINA INICIAL, pra entrada ser imediata.
 *
 * O que baixa (e fica no cache HTTP do navegador, de onde o engine lê depois sem baixar de novo):
 *   - o CÓDIGO do cyberespaço (chunk do CosmicLounge: three + engine), via import dinâmico;
 *   - os SONS com arquivo (lib/cyber/audio.SONS, sem os sintetizados) e as TEXTURAS (Terra, logos);
 *   - os CORPOS VRM dos personagens (lib/cyber/estiloAvatar) — PESADOS (~166 MB no total): só em tela grande,
 *     sem `saveData` e fora de 2g/3g. No celular/economia de dados a barra cobre só o essencial.
 *
 * #819 · os CORPOS só entram quando a pessoa MOSTRA que vai jogar (`precarregarCorposCyber`: passar o mouse, focar ou
 * tocar no "Play game"). Antes eles baixavam em toda primeira visita da página inicial (~60 dos ~68 MB) e seguiam
 * baixando na Sala de Estudos (a pré-carga é uma por aba) — a avatar da Sala ficava minutos "chegando" no Wi-Fi lento.
 * A barra do botão cobre o código, os sons e as texturas; os corpos baixam por fora dela, sem travar a entrada (o engine
 * baixa o que faltar na hora de entrar).
 *
 * Singleton por aba: começa uma vez, quem chamar depois recebe o mesmo estado (a seção do cyberespaço, o CTA do
 * hero e a navbar podem perguntar "quanto falta?" sem reiniciar nada). Nunca lança: falha de um arquivo conta
 * como concluído (o engine tenta de novo na hora de entrar) — a barra sempre chega ao fim.
 *
 * Progresso ponderado por BYTES: cada arquivo pesa o `content-length` (ou uma estimativa pelo tipo até a resposta
 * chegar), então a barra anda no ritmo da rede, não "um arquivo = um passo".
 *
 * A TRAVA (`segurarPrecarga`, out/2026): a banda do servidor é curta (~250 KB/s por arquivo) e os corpos daqui (61 MB)
 * roubavam a de quem está NA TELA — a Zaeon do hero e a avatar do chat ficavam minutos "chegando" (a pré-carga é uma
 * por aba e segue quando a pessoa vai pro chat). Enquanto uma cena 3D da página carrega, nenhum arquivo novo começa e
 * os CORPOS em andamento são cancelados e voltam pro começo da fila; quando ela fica pronta (ou no tempo máximo), a
 * fila segue de onde parou.
 */
import { PASTA_SONS, SONS } from "./audio";
import { CORPOS_FORA_DO_MAPA, CORPOS_VRM, CORPO_DO_FUNDADOR } from "./estiloAvatar";

export type TipoItem = "codigo" | "som" | "textura" | "corpo";
export type ItemPrecarga = { url: string; tipo: TipoItem };

/** estimativa de bytes por tipo, usada só até o `content-length` chegar */
export const ESTIMATIVA: Record<TipoItem, number> = { codigo: 2_500_000, som: 250_000, textura: 900_000, corpo: 11_000_000 };

// (os logos da UNILAB/UECE saíram com as universidades do mapa — lib/cyber/plataformas `UNIVERSIDADES_NO_MAPA`; se voltarem, o
// próprio campus baixa o logo dele)
export const TEXTURAS = ["/assets/cyber/terra-blue-marble.jpg", "/assets/cyber/logo-superteam-br.png"] as const;

/** os sons com ARQUIVO (os sintetizados nascem no navegador, não baixam nada) */
export function urlsDosSons(): string[] {
  return (Object.keys(SONS) as (keyof typeof SONS)[])
    .filter((n) => !SONS[n].sintetico)
    .map((n) => `${PASTA_SONS}${n}.${SONS[n].ext ?? "ogg"}`);
}

/** os corpos VRM (personagens + o do founder), sem repetir */
export function urlsDosCorpos(): string[] {
  return [...new Set([...Object.entries(CORPOS_VRM).filter(([id]) => !CORPOS_FORA_DO_MAPA.has(id)).map(([, c]) => c.url), CORPO_DO_FUNDADOR.url])];
}

/** o manifesto desta máquina: `pesados` liga os VRMs */
export function manifesto(pesados: boolean): ItemPrecarga[] {
  const itens: ItemPrecarga[] = [
    ...urlsDosSons().map((url) => ({ url, tipo: "som" as const })),
    ...TEXTURAS.map((url) => ({ url, tipo: "textura" as const })),
  ];
  if (pesados) itens.push(...urlsDosCorpos().map((url) => ({ url, tipo: "corpo" as const })));
  return itens;
}

/** esta máquina aguenta os corpos agora? (tela grande, sem economia de dados, rede boa) — PURO, testável */
export function aguentaPesados(a: { largura: number; saveData?: boolean; effectiveType?: string }): boolean {
  if (a.largura < 1024) return false;
  if (a.saveData) return false;
  if (a.effectiveType && /(^|-)2g$|3g/.test(a.effectiveType)) return false;
  return true;
}

export type EstadoPrecarga = {
  /** 0..1 */
  progresso: number;
  pronto: boolean;
  /** o que está baixando agora (rótulo curto) */
  etapa: string;
  /** os corpos entraram nesta pré-carga? */
  comCorpos: boolean;
  bytes: number;
  total: number;
};

type Ouvinte = (e: EstadoPrecarga) => void;

let estado: EstadoPrecarga = { progresso: 0, pronto: false, etapa: "", comCorpos: false, bytes: 0, total: 0 };
const ouvintes = new Set<Ouvinte>();
let iniciada = false;

export const estadoPrecarga = (): EstadoPrecarga => estado;
export function ouvirPrecarga(f: Ouvinte): () => void {
  ouvintes.add(f);
  f(estado);
  return () => { ouvintes.delete(f); };
}
function emitir(parcial: Partial<EstadoPrecarga>) {
  estado = { ...estado, ...parcial };
  // espelho pra inspeção no console (`window.__precarga`) — só leitura, sem efeito no app
  if (typeof window !== "undefined") (window as unknown as { __precarga?: EstadoPrecarga }).__precarga = estado;
  ouvintes.forEach((f) => f(estado));
}

const ROTULO: Record<TipoItem, string> = { codigo: "carregando o motor do cyberespaço", som: "afinando os sons", textura: "baixando a Terra", corpo: "despertando os avatares" };

// ── a TRAVA: quem está carregando uma cena 3D na página agora (a vitrine do hero, a avatar do chat) ──
const travas = new Set<symbol>();
let soltarFila: (() => void) | null = null, filaPresa: Promise<void> | null = null;
/** os downloads em andamento (pra cancelar os corpos quando alguém trava) */
const emCurso = new Map<string, { tipo: TipoItem; abortar: () => void }>();
/** resolve quando não houver trava */
function liberada(): Promise<void> {
  if (!travas.size) return Promise.resolve();
  if (!filaPresa) filaPresa = new Promise<void>((ok) => { soltarFila = ok; });
  return filaPresa;
}
/**
 * Segura a pré-carga enquanto uma cena 3D da PÁGINA carrega (ela tem prioridade na banda): nada novo começa e os
 * corpos em andamento voltam pra fila. Devolve o `soltar` (idempotente); `maxMs` = solta sozinha depois disso (uma
 * cena que nunca fica pronta não prende a pré-carga pra sempre).
 */
export function segurarPrecarga(o: { maxMs?: number } = {}): () => void {
  const id = Symbol("trava");
  travas.add(id);
  for (const c of emCurso.values()) if (c.tipo === "corpo") c.abortar();
  const soltar = () => {
    if (!travas.delete(id)) return;
    clearTimeout(tempo);
    if (!travas.size && soltarFila) { const s = soltarFila; soltarFila = null; filaPresa = null; s(); }
  };
  const tempo = setTimeout(soltar, o.maxMs ?? 120_000);
  return soltar;
}

/** lê o corpo inteiro contando bytes (pra barra); devolve os bytes lidos, ou −1 se foi CANCELADO (a trava). Nunca lança. */
async function baixar(url: string, aoAvancar: (delta: number) => void, aoSaberTamanho: (n: number) => void, sinal?: AbortSignal): Promise<number> {
  try {
    const res = await fetch(url, { cache: "force-cache", signal: sinal, ...( { priority: "low" } as RequestInit) });
    const len = Number(res.headers.get("content-length") || 0);
    if (len > 0) aoSaberTamanho(len);
    if (!res.ok) return 0;
    if (!res.body) { const b = await res.arrayBuffer(); aoAvancar(b.byteLength); return b.byteLength; }
    const reader = res.body.getReader();
    let lidos = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      lidos += value.byteLength; aoAvancar(value.byteLength);
    }
    return lidos;
  } catch { return sinal?.aborted ? -1 : 0; }
}

/**
 * Começa (uma vez) a pré-carga. `importarCodigo` é o import dinâmico do chunk (injetável nos testes).
 * `ambiente` decide se os corpos entram; por padrão lê a janela.
 */
export function precarregarCyber(opts: {
  importarCodigo?: () => Promise<unknown>;
  ambiente?: { largura: number; saveData?: boolean; effectiveType?: string };
  concorrencia?: number;
  baixarImpl?: typeof baixar;
  /** #819: os corpos entram nesta pré-carga (só quem pediu pra jogar — `precarregarCorposCyber`) */
  comCorpos?: boolean;
} = {}): EstadoPrecarga {
  if (iniciada) return estado;
  iniciada = true;
  const amb = opts.ambiente ?? lerAmbiente();
  const pesados = opts.comCorpos === true && aguentaPesados(amb);
  if (pesados) corposIniciados = true;
  ultimoBaixar = opts.baixarImpl ?? baixar;
  const itens = manifesto(pesados);
  const baixarFn = opts.baixarImpl ?? baixar;
  const importar = opts.importarCodigo ?? (() => import("@/components/cyber/CosmicLounge"));

  // pesos: começa com a estimativa; vira o tamanho real quando o cabeçalho chega
  const peso = new Map<string, number>();
  itens.forEach((i) => peso.set(i.url, ESTIMATIVA[i.tipo]));
  peso.set("__codigo", ESTIMATIVA.codigo);
  const feito = new Map<string, number>();
  const total = () => [...peso.values()].reduce((s, n) => s + n, 0);
  const bytes = () => [...feito.values()].reduce((s, n) => s + n, 0);
  // a barra NUNCA volta: se um arquivo vem maior que a estimativa, o total cresce e ela só espera
  const atualizar = (etapa?: string) => {
    const t = total(), b = Math.min(bytes(), t);
    emitir({ progresso: Math.max(estado.progresso, t > 0 ? b / t : 1), bytes: b, total: t, etapa: etapa ?? estado.etapa, comCorpos: pesados });
  };
  atualizar(ROTULO.codigo);

  void (async () => {
    // 1) o código primeiro (é o que mais demora a "aparecer" na entrada)
    try { await importar(); } catch { /* o engine importa de novo ao entrar */ }
    feito.set("__codigo", peso.get("__codigo")!);
    atualizar();

    // 2) sons + texturas + (corpos), em fila com concorrência limitada — não disputa a página inteira
    const fila = [...itens];
    const n = Math.max(1, Math.min(opts.concorrencia ?? 3, fila.length));
    const trabalhador = async () => {
      for (;;) {
        await liberada();   // (uma cena 3D da página carregando: espera ela)
        const item = fila.shift();
        if (!item) return;
        atualizar(ROTULO[item.tipo]);
        const ctl = new AbortController();
        emCurso.set(item.url, { tipo: item.tipo, abortar: () => ctl.abort() });
        const lidos = await baixarFn(
          item.url,
          (delta) => { if (!ctl.signal.aborted) { feito.set(item.url, (feito.get(item.url) ?? 0) + delta); atualizar(); } },
          (len) => { peso.set(item.url, len); atualizar(); },
          ctl.signal,
        );
        emCurso.delete(item.url);
        // CANCELADO pela trava: volta pro começo da fila (e a barra devolve o que tinha contado dele)
        if (lidos < 0 || ctl.signal.aborted) { feito.delete(item.url); fila.unshift(item); continue; }
        // falhou ou veio sem corpo: conta como concluído (o engine tenta de novo ao entrar)
        feito.set(item.url, Math.max(feito.get(item.url) ?? 0, peso.get(item.url) ?? 0));
        atualizar();
      }
    };
    await Promise.all(Array.from({ length: n }, trabalhador));
    emitir({ progresso: 1, pronto: true, etapa: "pronto", bytes: total(), total: total() });
  })();

  return estado;
}

let corposIniciados = false;
let ultimoBaixar: typeof baixar = baixar;

/**
 * #819 · a pessoa mostrou que vai JOGAR (passou o mouse, focou ou tocou no "Play game"): os corpos começam a baixar.
 * Uma vez por aba; só em máquina que aguenta (`aguentaPesados`). Se a pré-carga leve ainda não começou, começa já com
 * os corpos; se já começou (ou acabou), os corpos vão numa fila própria, por fora da barra, respeitando a TRAVA.
 */
export function precarregarCorposCyber(opts: {
  ambiente?: { largura: number; saveData?: boolean; effectiveType?: string };
  baixarImpl?: typeof baixar;
  importarCodigo?: () => Promise<unknown>;
} = {}): void {
  if (corposIniciados) return;
  const amb = opts.ambiente ?? lerAmbiente();
  if (!aguentaPesados(amb)) return;
  corposIniciados = true;
  if (!iniciada) { precarregarCyber({ ...opts, ambiente: amb, comCorpos: true }); return; }
  const baixarFn = opts.baixarImpl ?? ultimoBaixar;
  const fila = urlsDosCorpos().map((url) => ({ url, tipo: "corpo" as const }));
  const trabalhador = async () => {
    for (;;) {
      await liberada();
      const item = fila.shift();
      if (!item) return;
      const ctl = new AbortController();
      emCurso.set(item.url, { tipo: "corpo", abortar: () => ctl.abort() });
      const lidos = await baixarFn(item.url, () => {}, () => {}, ctl.signal);
      emCurso.delete(item.url);
      if (lidos < 0 || ctl.signal.aborted) fila.unshift(item);   // (cancelado pela trava: volta pro começo)
    }
  };
  void Promise.all([trabalhador(), trabalhador()]);
}

function lerAmbiente(): { largura: number; saveData?: boolean; effectiveType?: string } {
  if (typeof window === "undefined") return { largura: 0 };
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return { largura: window.innerWidth, saveData: c?.saveData, effectiveType: c?.effectiveType };
}

/** só pra testes */
export function _reiniciarPrecarga() {
  iniciada = false; corposIniciados = false; ultimoBaixar = baixar;
  travas.clear(); emCurso.clear(); soltarFila = null; filaPresa = null;
  estado = { progresso: 0, pronto: false, etapa: "", comCorpos: false, bytes: 0, total: 0 };
  ouvintes.clear();
}
