/**
 * lib/pagamentos/provedor.ts — a camada de PROVEDOR de pagamento da vitrine (apoio/compra). PURO + injeção.
 *
 * A ideia: o resto do app NÃO fala com a Cloak direto; fala com um `ProvedorPagto`. Hoje o provedor é um STUB de devnet
 * (não move dinheiro). Quando a gente for pra mainnet com a Cloak (a camada de privacidade), entra o provedor Cloak
 * atrás da flag — sem mexer na UI nem no resto. Assim dá pra construir e testar o fluxo inteiro sem risco, e trocar o
 * motor de pagamento numa linha.
 *
 * Estado: `pagamentosLive()` é false por padrão (igual a MOEDA.ativa=false). Enquanto false, só o stub roda.
 */
import type { Cobranca, Finalidade, MoedaPagto } from "./cobranca";

export type StatusPagto = "aguardando" | "confirmado" | "falhou" | "expirado";

/** o que a pessoa quer pagar — ligado ao card/pesquisa e a quem recebe */
export type Intencao = {
  id: string;
  finalidade: Finalidade;
  moeda: MoedaPagto;
  /** o que o beneficiário recebe (cheio) e o total que o apoiador paga (taxa embutida) */
  recebe: number;
  total: number;
  /** o item apoiado/comprado (slug da pesquisa ou id do card) */
  referencia: string;
  /** quem recebe — para apoio/compra ligados a conta (nunca uma carteira externa “solta” no exemplo) */
  beneficiario?: string;
  status: StatusPagto;
  criadoEm: string;
};

/** o que o provedor devolve pra UI conduzir o pagamento (sem expor segredo) */
export type AberturaPagto = {
  intencaoId: string;
  /** instrução curta pra tela (ex.: "abra a Cloak e confirme", ou "em breve" no stub) */
  instrucao: string;
  /** url opcional (link de pagamento da Cloak, quando for o caso) */
  url?: string;
};

export interface ProvedorPagto {
  readonly nome: string;
  /** cria a intenção e devolve como a UI conduz o pagamento */
  criar(input: { cobranca: Cobranca; referencia: string; beneficiario?: string }): Promise<{ intencao: Intencao; abertura: AberturaPagto }>;
  /** o estado atual de uma intenção */
  status(intencaoId: string): Promise<StatusPagto>;
}

/** a flag mestra: o trilho de pagamento está LIGADO? (default não — mesmo regime do resto da vitrine) */
export function pagamentosLive(env: Record<string, string | undefined> = process.env): boolean {
  return env.PAGAMENTOS_LIVE === "1" || env.PAGAMENTOS_LIVE === "true";
}

/** qual provedor usar: "stub" (devnet, sem dinheiro) por padrão; "cloak" só quando ligado e configurado */
export function nomeProvedor(env: Record<string, string | undefined> = process.env): "stub" | "cloak" {
  return pagamentosLive(env) && (env.PAGAMENTOS_PROVIDER ?? "").toLowerCase() === "cloak" ? "cloak" : "stub";
}

let seq = 0;
const novoId = () => `int_${Date.now().toString(36)}${(seq++).toString(36)}`;

/**
 * STUB de devnet: monta a intenção e a "confirma" sem tocar em rede nem dinheiro. Serve pra desenvolver e testar o
 * fluxo ponta a ponta. Deixa EXPLÍCITO na instrução que é simulação.
 */
export class ProvedorStub implements ProvedorPagto {
  readonly nome = "stub";
  private readonly loja = new Map<string, Intencao>();

  async criar(input: { cobranca: Cobranca; referencia: string; beneficiario?: string }): Promise<{ intencao: Intencao; abertura: AberturaPagto }> {
    const { cobranca: c, referencia, beneficiario } = input;
    const intencao: Intencao = {
      id: novoId(), finalidade: c.finalidade, moeda: c.moeda, recebe: c.recebe, total: c.total,
      referencia, beneficiario, status: "aguardando", criadoEm: new Date().toISOString(),
    };
    this.loja.set(intencao.id, intencao);
    return { intencao, abertura: { intencaoId: intencao.id, instrucao: "Simulação (devnet): nada é cobrado. Confirmar registra o apoio só nesta sessão." } };
  }

  async status(intencaoId: string): Promise<StatusPagto> {
    return this.loja.get(intencaoId)?.status ?? "falhou";
  }

  /** só no stub: marca como confirmado (a UI de teste chama isto no "confirmar") */
  confirmar(intencaoId: string): StatusPagto {
    const i = this.loja.get(intencaoId);
    if (!i) return "falhou";
    i.status = "confirmado";
    return "confirmado";
  }
}

/**
 * O provedor da CLOAK fica como um marcador até a integração real (mainnet, com o SDK @cloak.dev/sdk adicionado de
 * propósito e a auditoria em mãos). Enquanto não existe, pedir o provedor cloak lança — nunca cai no stub sem avisar.
 */
export class ProvedorCloakPendente implements ProvedorPagto {
  readonly nome = "cloak";
  private erro(): never { throw new Error("Provedor Cloak ainda não integrado (mainnet). Rode com o stub (devnet)."); }
  async criar(): Promise<never> { this.erro(); }
  async status(): Promise<never> { this.erro(); }
}

/** o provedor efetivo conforme a flag/env */
export function provedor(env: Record<string, string | undefined> = process.env): ProvedorPagto {
  return nomeProvedor(env) === "cloak" ? new ProvedorCloakPendente() : new ProvedorStub();
}
