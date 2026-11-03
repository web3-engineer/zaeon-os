/**
 * lib/agent/falhas.ts — a FALHA DE AÇÃO vira objeto da resposta (G2 de docs/PLANO_RESPOSTA_GRAFICA.md).
 * PURO: nada de rede, nada de React.
 *
 * O PROBLEMA (§A3): quando uma tool falha, o harness já guarda a observação (`{tool, code, error}`)
 * e já a mostra AO MODELO (`resumoDasFalhas` entra no prompt da ação, pro laço tentar outro
 * caminho). Mas nada disso chega ao aluno. Na conversa dos benchmarks o download era impossível —
 * `github.com` estava fora da allowlist — e o que ele viu foi um plano de cinco passos, não um "não
 * consegui, e aqui está o que dá pra fazer".
 *
 * Pedido do dono, literal: *"o arquivo deveria aparecer ai — ou quando falhou, deveria aparecer a
 * opção de corrigir"*.
 *
 * O QUE ISTO NÃO É: não é mensagem de erro técnica na tela. O aluno não tem o que fazer com
 * `leitor_dominio_fora_da_lista`. Cada falha vira UMA frase do porquê + UM caminho que existe.
 *
 * SÓ TOOL QUE O ALUNO PEDIU. `memory_search` falhar é ruído interno: ele não tem como corrigir, e
 * encher a resposta de falha que não é dele é outro jeito de mentir sobre o que importa.
 */

/** O que o aluno pode fazer. O cliente decide o botão; aqui só o tipo e o texto. */
export type TipoCorrecao =
  /** anexar o arquivo na conversa (📎) — é o caminho que SEMPRE funciona */
  | "anexar"
  /** repetir a mesma ação (falha transitória: rede, timeout, proxy fora do ar) */
  | "tentar_de_novo"
  /** outro endereço (domínio fora da lista, link morto, http) */
  | "outro_link"
  /** colar o trecho na conversa (a página respondeu, mas sem texto legível) */
  | "colar_trecho";

export type FalhaVisivel = {
  /** a tool que falhou (`abrir_url`, `baixar_para_base`, `ler_anexo`) */
  tool: string;
  /** o código técnico — fica pra telemetria e pro suporte, não pra leitura do aluno */
  codigo: string;
  /** UMA frase, em PT, do que aconteceu */
  porque: string;
  corrigir: {
    tipo: TipoCorrecao;
    /** o que fazer, em PT */
    texto: string;
    /**
     * Quando dá pra reenviar como pedido, o texto do pedido — o cliente manda igual a um
     * "próximo passo" clicado. `undefined` = não há o que reenviar, só instrução.
     */
    prompt?: string;
  };
};

/** As tools cuja falha o aluno PODE corrigir. O resto é ruído interno. */
export const TOOLS_COM_CORRECAO = ["abrir_url", "baixar_para_base", "ler_anexo"] as const;

/** Teto: três falhas já dizem o que houve; mais que isso vira parede. */
export const MAX_FALHAS = 3;

type Receita = { porque: string; tipo: TipoCorrecao; texto: string; reenviar?: boolean };

/**
 * Código → frase + caminho. Os códigos vêm de `lib/agent/toolsWeb.ts` (o mapa `CODIGO`, exaustivo
 * sobre `ErroLeitor["code"]`) e de `lib/agent/runtime` (`tool_timeout`, `network`, `rate_limited`).
 */
const RECEITA: Record<string, Receita> = {
  // o domínio não está na allowlist do Leitor — e isto NÃO é falha, é política
  url_nao_permitida: {
    porque: "esse endereço está fora da lista de domínios que eu posso ler",
    tipo: "anexar",
    texto: "baixe o arquivo e anexe aqui na conversa (📎) — aí eu leio de verdade",
  },
  precisa_https: {
    porque: "esse endereço é http, e eu só busco arquivo por https",
    tipo: "outro_link",
    texto: "me manda o mesmo endereço em https, se existir",
  },
  url_recusada: {
    porque: "o site recusou a leitura",
    tipo: "anexar",
    texto: "salve a página ou o arquivo e anexe aqui (📎)",
  },
  url_sem_conteudo: {
    porque: "o endereço respondeu, mas não veio texto legível",
    tipo: "colar_trecho",
    texto: "cole aqui o trecho que te interessa e eu trabalho com ele",
  },
  arquivo_grande_demais: {
    porque: "o arquivo passa do tamanho que eu aceito",
    tipo: "anexar",
    texto: "anexe só a parte que importa (📎), ou me diga o que procurar nele",
  },
  tipo_nao_suportado: {
    porque: "esse tipo de arquivo eu não sei abrir",
    tipo: "anexar",
    texto: "converta pra PDF, CSV ou texto e anexe aqui (📎)",
  },
  web_unavailable: {
    porque: "o leitor de páginas está fora do ar agora",
    tipo: "tentar_de_novo",
    texto: "dá pra tentar de novo",
    reenviar: true,
  },
  tool_timeout: {
    porque: "a busca demorou mais do que o limite e eu cortei",
    tipo: "tentar_de_novo",
    texto: "dá pra tentar de novo",
    reenviar: true,
  },
  network: {
    porque: "a rede falhou no meio",
    tipo: "tentar_de_novo",
    texto: "dá pra tentar de novo",
    reenviar: true,
  },
  rate_limited: {
    porque: "bati no limite de pedidos do serviço",
    tipo: "tentar_de_novo",
    texto: "espere um instante e peça de novo",
    reenviar: true,
  },
  limite_pessoal: {
    porque: "sua base pessoal está no limite de arquivos",
    tipo: "anexar",
    texto: "apague um arquivo da base e peça de novo",
  },
  anexo_desconhecido: {
    porque: "não achei esse arquivo entre os anexos desta conversa",
    tipo: "anexar",
    texto: "anexe o arquivo aqui (📎) e eu leio",
  },
};

/** O fallback: falha que eu não tenho receita pra explicar ainda assim não pode sumir. */
const GENERICA: Receita = {
  porque: "essa ação não deu certo",
  tipo: "tentar_de_novo",
  texto: "dá pra tentar de novo",
  reenviar: true,
};

/** O que o cliente reenvia quando o botão é de "tentar de novo". */
function pedidoDeRetentativa(tool: string): string {
  if (tool === "abrir_url") return "tente abrir o endereço de novo";
  if (tool === "baixar_para_base") return "tente baixar o arquivo de novo";
  return "tente de novo";
}

export type Observacao = { tool: string; code?: string; error?: string };

/**
 * As observações do turno → as falhas que o aluno vê. Deduplicada por tool+código (o laço pode
 * tentar o mesmo domínio duas vezes e isso é uma falha, não duas) e com teto.
 *
 * `ok` são as tools que DERAM CERTO no turno: se a mesma tool falhou numa URL e funcionou em outra,
 * a resposta já tem o conteúdo e a falha deixa de ser o assunto — some. Sem isso, pedir três links
 * e acertar dois produziria um card de erro no meio de uma resposta boa.
 */
export function falhasVisiveis(
  observacoes: readonly Observacao[],
  ok: Iterable<string> = [],
): FalhaVisivel[] {
  const funcionou = new Set(ok);
  const vistas = new Set<string>();
  const out: FalhaVisivel[] = [];
  for (const o of observacoes) {
    const tool = String(o?.tool ?? "");
    if (!(TOOLS_COM_CORRECAO as readonly string[]).includes(tool)) continue;
    if (funcionou.has(tool)) continue;
    const codigo = String(o?.code ?? "").trim() || "erro";
    const chave = `${tool}:${codigo}`;
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    const r = RECEITA[codigo] ?? GENERICA;
    out.push({
      tool,
      codigo,
      porque: r.porque,
      corrigir: { tipo: r.tipo, texto: r.texto, ...(r.reenviar ? { prompt: pedidoDeRetentativa(tool) } : {}) },
    });
    if (out.length >= MAX_FALHAS) break;
  }
  return out;
}
