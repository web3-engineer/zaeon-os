/**
 * lib/map/tipos.ts — o vocabulário do CÉREBRO (docs/HANDOFF_CEREBRO_AURA.md §1, §4). CLIENT-SAFE
 * (zero import de servidor): o painel do cérebro e o worker falam a mesma língua daqui.
 *
 * Estudo = grafo = cérebro. O grafo é a fonte única de memória do estudo; a cartolina é uma
 * projeção (cada card = um nó, mesmo id). O "validado" muda de sentido com o `modoValidacao`
 * do arquétipo — por isso ele mora no mapa, não no nó.
 */

export type TipoTopico = "aplicavel" | "habilidade" | "conceitual" | "exploratorio" | "criativo";
export const TIPOS_TOPICO: readonly TipoTopico[] = ["aplicavel", "habilidade", "conceitual", "exploratorio", "criativo"];

export type ModoValidacao = "humana" | "rubrica" | "quiz" | "peer" | "cobertura" | "nenhuma";
export const MODOS_VALIDACAO: readonly ModoValidacao[] = ["humana", "rubrica", "quiz", "peer", "cobertura", "nenhuma"];

/** Estados do nó — a trilha é monotônica (a_conquistar → aprendido → aplicado → validado). */
export type EstadoNo = "a_conquistar" | "aprendido" | "aplicado" | "validado";
export const ESTADOS: readonly EstadoNo[] = ["a_conquistar", "aprendido", "aplicado", "validado"];
export const ORDEM_ESTADO: Record<EstadoNo, number> = { a_conquistar: 0, aprendido: 1, aplicado: 2, validado: 3 };

/** De onde o nó veio (espelha os campos do StructuredAnswer + os nós planejados do backbone). */
export type TipoNo = "conceito" | "evidencia" | "passo" | "secao" | "artefato" | "experimento" | "entrega" | "conclusao";

export type MapaNo = {
  id: string;            // determinístico pelo conteúdo (= id do card na cartolina)
  label: string;
  tipo: TipoNo;
  estado: EstadoNo;
  /** Texto curto (claim, corpo da seção, descrição do passo) — o card mostra como corpo. */
  corpo?: string;
  /** Fonte/legenda (evidência: título da fonte; artefato: studioKind). */
  legenda?: string;
  regiao?: string;       // agrupamento visual (o painel colore por região)
  peso: number;          // 0..1 — importância no backbone/bússola
  /** Mensagens do chat que geraram/tocaram o nó (tap → reabre a conversa). */
  msgIds: string[];
  /** Nó planejado pelo backbone (ainda sem turno que o realize). */
  planejado?: boolean;
  /** MEMÓRIA (MemPalace sobre o grafo): gavetas = transcrições VERBATIM dos turnos que tocaram o nó. */
  drawers?: Drawer[];
  /** Closet = resumo curto do que vive no nó (sem LLM: o próprio corpo/label consolidado). */
  closet?: string;
  /** Último toque (ms epoch) — memória temporal (Zep): recência pesa na recuperação. */
  tLast?: number;
  /** RESUMO do tópico (o que é) — gerado pelo modelo no percurso; se faltar, a UI deriva do corpo/closet. */
  resumo?: string;
  /** REQUISITO: o que precisa ser atendido pra concluir o tópico (critério de avanço/validação). */
  req?: string;
};
export const MAX_RESUMO_CHARS = 300;

/** Uma gaveta: o trecho verbatim (pergunta + núcleo da resposta) e as mensagens de origem. */
export type Drawer = { msgIds: string[]; texto: string; ts: number };
export const MAX_DRAWERS_POR_NO = 12;
export const MAX_DRAWER_CHARS = 1200;

export type RelacaoAresta = "pre_requisito" | "sustenta" | "leva_a" | "trata" | "ilustra" | "relacionado";
/** Encode visual (§4.3): "percurso" = AMARELO (pré-requisito, pra onde ir); "memoria" = AZUL pulsante (o que já vive aqui). */
export type TipoVisualAresta = "percurso" | "memoria";
export type MapaAresta = { de: string; para: string; relacao: RelacaoAresta; tipoVisual?: TipoVisualAresta; peso?: number };
export const tipoVisualDe = (relacao: RelacaoAresta): TipoVisualAresta => (relacao === "pre_requisito" ? "percurso" : "memoria");

/** O que sai do banco pronto pro painel/harness (sem Json cru). */
export type MapaView = {
  id: string;
  ownerId: string;
  surface: string;
  scopeId: string;
  titulo: string;
  tipoTopico: TipoTopico;
  objetivo: string;
  modoValidacao: ModoValidacao;
  criterioCompletude: string;
  nos: MapaNo[];
  arestas: MapaAresta[];
  backbone: string[];
  completudeAprendizado: number;
  completudeConclusao: number;
  rev: number;
  updatedAt: Date;
};

/** Flag do cérebro como memória canônica (server). Off = tudo como antes (cartolina direta). */
export const mapHarnessOn = (): boolean => process.env.MAP_HARNESS === "1";

export const isTipoTopico = (v: unknown): v is TipoTopico => typeof v === "string" && (TIPOS_TOPICO as readonly string[]).includes(v);
export const isModoValidacao = (v: unknown): v is ModoValidacao => typeof v === "string" && (MODOS_VALIDACAO as readonly string[]).includes(v);
export const isEstadoNo = (v: unknown): v is EstadoNo => typeof v === "string" && (ESTADOS as readonly string[]).includes(v);
