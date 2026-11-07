/**
 * Cyberespaço (o Lounge Cósmico) como entrada da Zaeon — regras PURAS, testáveis.
 * Sem flag: vai direto pra produção. O nome visível é "cyberespaço"; a rota segue /lounge-cosmico.
 */
export const LOUNGE_ROTA = "/lounge-cosmico";
export const LAB_ROTA = "/research-lab";
/**
 * Ao entrar no laboratório pelo cyberespaço ("Estudar"), a primeira tela é a aba de Pesquisa (o ?tab= explícito vence a
 * última aba salva) e JÁ em MODO FOCO (`?foco=1`: sem navbar, sidebar cheia). Pela aba "Laboratório" da navbar entra normal.
 */
export const LAB_ENTRADA = "/research-lab?tab=pesquisa&foco=1";
/** o laboratório DENTRO do TABLET (modo estudo por cima do cyberespaço — components/cyber/TabletLab), com `?tablet=1` — o
 *  "Voltar" dele guarda o tablet (avisa a janela de cima) em vez de abrir outro cyberespaço. A 1ª VEZ de todas abre na
 *  Sala de Estudos, no CHAT (`estudo=chat`); depois, o laboratório volta pra onde a pessoa estava (a última aba salva) */
export const LAB_TABLET_PRIMEIRA = `${LAB_ROTA}?tab=sala-de-estudos&estudo=chat&foco=1&tablet=1`;
export const LAB_TABLET = `${LAB_ROTA}?foco=1&tablet=1`;
/** já abriu o tablet alguma vez? (localStorage) */
export const CHAVE_TABLET_JA_ABRIU = "zaeon.tablet.jaAbriu";
/** a URL do laboratório no tablet: a da 1ª vez ou a de sempre */
export const urlDoLabNoTablet = (jaAbriu: boolean) => (jaAbriu ? LAB_TABLET : LAB_TABLET_PRIMEIRA);
/** o laboratório no tablet avisa a janela de cima do trabalho de IA em andamento (lib/ui/monitorIA) */
export const MSG_IA = "zaeon:ia";
export type EstadoIALab = {
  /** quantas chamadas de IA estão rodando agora */
  ativos: number;
  /** desde quando (ms, relógio da página) a mais antiga das que estão rodando começou; null = nenhuma */
  desde: number | null;
  /** a última leva que terminou: quando acabou e quanto durou (ms) */
  terminou: { em: number; durMs: number } | null;
};
export const ehMsgIA = (data: unknown, origin: string, esperada: string): data is { type: string; estado: EstadoIALab } =>
  origin === esperada && !!data && typeof data === "object" && (data as { type?: unknown }).type === MSG_IA && typeof (data as { estado?: { ativos?: unknown } }).estado?.ativos === "number";
export const pedeTablet = (search: string | URLSearchParams | null | undefined): boolean => new URLSearchParams(search ?? "").get("tablet") === "1";
/** o laboratório no tablet pede pra guardar o tablet (postMessage pra janela de cima, mesma origem) */
export const MSG_FECHAR_TABLET = "zaeon:close-tablet";
export const ehMsgFecharTablet = (data: unknown, origin: string, esperada: string): boolean =>
  origin === esperada && !!data && typeof data === "object" && (data as { type?: unknown }).type === MSG_FECHAR_TABLET;
/** o laboratório deve abrir em modo foco? (`?foco=1` na URL) */
export const pedeFoco = (search: string | URLSearchParams | null | undefined): boolean => new URLSearchParams(search ?? "").get("foco") === "1";
/** Contrato de navegação cyberespaço → laboratório (botão Estudar / clique no monitor). */
export const MSG_ENTRAR_ESTUDO = "zaeon:enter-study";
export const ehMsgEntrarEstudo = (data: unknown, origin: string, esperada: string): boolean =>
  origin === esperada && !!data && typeof data === "object" && (data as { type?: unknown }).type === MSG_ENTRAR_ESTUDO;

/** A rota do Atlas do Corpo (anatomia 3D) — também imersiva: a cena ocupa a tela inteira. */
export const ATLAS_ROTA = "/anatomia";

/**
 * Rotas imersivas: sem navbar/rodapé globais (a cena ocupa a tela toda).
 *
 * Era uma comparação com UMA rota; virou lista quando o Atlas do Corpo chegou. O casamento é por
 * rota EXATA ou por prefixo seguido de "/" — nunca por `startsWith` solto, senão "/anatomias" e
 * "/lounge-cosmicos" entrariam na lista sem ser. O teste guarda exatamente esse caso.
 */
export const ROTAS_IMERSIVAS: readonly string[] = [LOUNGE_ROTA, ATLAS_ROTA];

export const ehRotaImersiva = (path: string | null | undefined) =>
  !!path && ROTAS_IMERSIVAS.some((r) => path === r || path.startsWith(r + "/"));

export type CopyEntrada = { cta: string; badges: string[] };
/** Copy do CTA primário e dos badges, por estado de login. */
export function copyEntrada(logado: boolean): CopyEntrada {
  if (logado) return { cta: "Iniciar chat · iniciar jogo", badges: [] };
  return { cta: "Criar minha conta · iniciar jogo", badges: ["1 mês grátis", "Sem cartão", "Sem limites", "Tecnologia de ponta"] };
}

/** o TUTORIAL no tablet (lib/onboarding/tutorialLab): a 1ª abertura do novato leva `tutorial=1` — o laboratório roda o
 *  tour da 1ª missão. Quando a pesquisa fica SALVA de verdade, o lab avisa a janela de cima (o Droid interrompe) */
export const urlDoLabNoTutorial = () => `${LAB_TABLET_PRIMEIRA}&tutorial=1`;
export const pedeTutorial = (search: string | URLSearchParams | null | undefined): boolean => new URLSearchParams(search ?? "").get("tutorial") === "1";
export const MSG_PESQUISA_SALVA = "zaeon:tutorial:pesquisa-salva";
/** a pesquisa que a pessoa criou no tutorial (vira o livro do inventário) */
export type PesquisaSalva = { titulo: string; palavras: number; workId: string | null };
export const ehMsgPesquisaSalva = (data: unknown, origin: string, esperada: string): data is { type: string; pesquisa: PesquisaSalva } =>
  origin === esperada && !!data && typeof data === "object" && (data as { type?: unknown }).type === MSG_PESQUISA_SALVA && typeof (data as { pesquisa?: { titulo?: unknown } }).pesquisa?.titulo === "string";

/** a ETAPA do tour do tablet (lib/onboarding/tutorialLab) → a janela de cima: na espera da pesquisa o tablet destaca o
 *  "Guardar tablet" e o Droid do cyberespaço ensina a CONCORRÊNCIA (a pesquisa segue rodando com o tablet guardado) */
export const MSG_TUTORIAL_ETAPA = "zaeon:tutorial:etapa";
export const ehMsgTutorialEtapa = (data: unknown, origin: string, esperada: string): data is { type: string; etapa: string } =>
  origin === esperada && !!data && typeof data === "object" && (data as { type?: unknown }).type === MSG_TUTORIAL_ETAPA && typeof (data as { etapa?: unknown }).etapa === "string";
