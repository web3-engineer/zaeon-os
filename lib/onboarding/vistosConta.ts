/**
 * #629 · o "JÁ VI" dos tutoriais do laboratório salvo NA CONTA (User.toursVistos), não só no navegador. Antes, no
 * computador da empresa, noutro navegador, na aba anônima ou depois de limpar os dados, o tour da Sala, o do
 * Escritório e as dicas apareciam de novo pra quem já tinha visto.
 *
 * O navegador continua sendo o lugar onde os tours olham (rápido, funciona sem rede e sem login); a conta é a fonte
 * que sobrevive: ao abrir o laboratório, o que a CONTA diz que já viu vira "visto" aqui, e o que só ESTE navegador
 * sabia sobe pra conta (quem já tinha visto antes desta mudança não vê de novo noutro computador). Ao terminar/pular,
 * salva nos dois; o "Rever tutorial" limpa os dois. Não usa o `tourDone`: ele é da missão do tablet e das boas-vindas.
 */

/** o que pode ser marcado como visto (a rota recusa qualquer outra coisa) */
export const ITENS_VISTOS = ["sala", "escritorio", "dica:perfil", "dica:sala-estudos", "onboarding-tema"] as const;
export type ItemVisto = (typeof ITENS_VISTOS)[number];

/** a chave de cada item no navegador (a mesma que os tours já usavam) */
export const CHAVE_LOCAL: Record<ItemVisto, string> = {
  sala: "zaeon.tour.sala.v2",
  escritorio: "zaeon.tour.escritorio.v1",
  "dica:perfil": "zaeon.dica.perfil.v1",
  "dica:sala-estudos": "zaeon.dica.sala-estudos.v1",
  "onboarding-tema": "zaeon.onboarding.tema.v1",
};

/** só itens conhecidos, sem repetir (o que vem do banco ou do corpo da requisição pode ser qualquer coisa) */
export function limparItens(v: unknown): ItemVisto[] {
  if (!Array.isArray(v)) return [];
  return Array.from(new Set(v.filter((x): x is ItemVisto => typeof x === "string" && (ITENS_VISTOS as readonly string[]).includes(x))));
}

const ROTA = "/api/onboard/vistos";
const vistoLocal = (it: ItemVisto) => { try { return localStorage.getItem(CHAVE_LOCAL[it]) === "1"; } catch { return false; } };

let carga: Promise<void> | null = null;
let lidos = false;
/** a conta já respondeu nesta página? (aí os tours decidem na hora, sem esperar de novo) */
export const vistosJaLidos = () => lidos;

/** lê a conta UMA vez por página: o que ela já viu vira visto aqui; o que só este navegador sabia sobe pra ela */
export function carregarVistosDaConta(): Promise<void> {
  if (carga) return carga;
  carga = (async () => {
    try {
      const r = await fetch(ROTA, { cache: "no-store" });
      if (!r.ok) return;   // sem login (401) ou fora do ar: segue só com o navegador
      const conta = limparItens(((await r.json()) as { vistos?: unknown } | null)?.vistos);
      for (const it of conta) { try { localStorage.setItem(CHAVE_LOCAL[it], "1"); } catch { /* sem storage */ } }
      const soAqui = ITENS_VISTOS.filter((it) => vistoLocal(it) && !conta.includes(it));
      if (soAqui.length) void enviar("POST", soAqui);
    } catch { /* sem rede */ } finally { lidos = true; }
  })();
  return carga;
}

/** espera a conta responder, mas não segura o tour pra sempre (rede lenta → decide pelo navegador) */
export const esperarVistos = (ms = 2000): Promise<void> =>
  Promise.race([carregarVistosDaConta(), new Promise<void>((r) => setTimeout(r, ms))]);

async function enviar(metodo: "POST" | "DELETE", itens?: ItemVisto[]): Promise<void> {
  try {
    await fetch(ROTA, { method: metodo, headers: { "Content-Type": "application/json" }, ...(itens ? { body: JSON.stringify({ itens }) } : {}) });
  } catch { /* sem rede: fica só no navegador */ }
}

export const salvarVistoNaConta = (item: ItemVisto) => { void enviar("POST", [item]); };

/** "Rever tutorial": a conta esquece também (senão, no próximo carregamento, ela marcava tudo como visto de novo) */
export function limparVistosDaConta(): void {
  carga = Promise.resolve(); lidos = true;
  void enviar("DELETE");
}

/** só p/ testes */
export const __reiniciarVistos = () => { carga = null; lidos = false; };
