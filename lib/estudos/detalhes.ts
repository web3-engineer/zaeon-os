/**
 * lib/estudos/detalhes.ts — o PAINEL DE DETALHES de um card da vitrine (components/estudos/DetalhesBuild). PURO.
 *
 * "Detalhes" não é compra: é ver QUEM publicou (a conta, com perfil e mensagem privada), o NICHO, quantos VALIDADORES
 * a build tem e a descrição completa. Tudo sai do próprio item — que vem da API, ligado a uma conta. Campo que o item
 * ainda não tem não é inventado: o painel cai no que existe (o tipo no lugar do nicho, a descrição montada das
 * entregas, "—" nos validadores).
 */
import { NOME_TIPO, type ItemVitrine } from "@/lib/estudos/vitrine";

export type Publicador = { nome: string; handle: string; inicial: string; verificada: boolean; avatarUrl: string | null; contaId: string | null };

/** "@coletivoraiz" a partir de um nome ("Coletivo Raiz", "Dra. Iracema Lopes", "Agente Deploy (Zaeon)") */
export function handleDe(nome: string): string {
  const base = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\(.*?\)/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `@${base || "conta"}`;
}

/** quem publicou: a CONTA ligada ao card quando existe; senão, o autor declarado (sem perfil pra abrir ainda) */
export function publicadorDe(it: ItemVitrine): Publicador {
  const nome = it.conta?.nome?.trim() || it.autor;
  const semTitulo = nome.replace(/^(dra?|prof|profa)\.\s*/i, "");
  return {
    nome,
    handle: it.conta?.handle ? (it.conta.handle.startsWith("@") ? it.conta.handle : `@${it.conta.handle}`) : handleDe(nome),
    inicial: (semTitulo[0] ?? "◆").toUpperCase(),
    verificada: it.conta ? !!it.conta.verificada : /^zaeon$/i.test(nome.trim()),
    avatarUrl: it.conta?.avatarUrl ?? null,
    contaId: it.conta?.id ?? null,
  };
}

export const nichoDe = (it: ItemVitrine): string => it.nicho?.trim() || NOME_TIPO[it.tipo];

/** os validadores: o número quando a API manda; null = ainda não há dado (o painel mostra "—") */
export const validadoresDe = (it: ItemVitrine): number | null =>
  typeof it.validadores === "number" && it.validadores >= 0 ? Math.floor(it.validadores) : null;

export type SecaoDescricao =
  | { tipo: "paragrafos"; titulo?: string; itens: string[] }
  | { tipo: "lista"; titulo: string; itens: string[] }
  | { tipo: "tags"; titulo: string; itens: string[] };

/**
 * A descrição em seções. Com `descricao` (escrita por quem publicou) ela vem primeiro, inteira, em parágrafos; as
 * seções que saem dos campos do card (o que vem, como funciona, validação, frações, tags) completam.
 */
export function descricaoDe(it: ItemVitrine): SecaoDescricao[] {
  const out: SecaoDescricao[] = [];
  const paragrafos = (it.descricao ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  out.push({ tipo: "paragrafos", itens: paragrafos.length ? paragrafos : [it.subtitulo] });
  if (it.entrega.length) out.push({ tipo: "lista", titulo: "O QUE VEM", itens: [...it.entrega] });
  out.push({
    tipo: "paragrafos", titulo: "COMO FUNCIONA",
    itens: [it.execucao === "agente"
      ? "Um agente de IA faz o trabalho por você, dentro da Zaeon, e mostra cada passo."
      : "Do it yourself: o material leva você de ponta a ponta, com o que comprar, montar e conferir."],
  });
  const selos = [
    it.selos.supervisionado && "conteúdo supervisionado por especialista",
    it.selos.linksOk && "fontes e links conferidos",
    it.selos.codigoPrivado && "parte do código fica privada para quem conecta",
  ].filter(Boolean) as string[];
  if (selos.length) out.push({ tipo: "paragrafos", titulo: "VALIDAÇÃO", itens: [`${selos.join(" · ")}.`] });
  if (it.fracoes.total > 1) {
    out.push({ tipo: "paragrafos", titulo: "FRAÇÕES", itens: [`${it.fracoes.vendidas.toLocaleString("pt-BR")} de ${it.fracoes.total.toLocaleString("pt-BR")} frações já conectadas.`] });
  }
  if (it.tags.length) out.push({ tipo: "tags", titulo: "TAGS", itens: [...it.tags] });
  return out;
}

/** onde a build fica depois de conectar — o texto e a aba que o "abrir" leva */
export type Destino = { texto: string; aba: "chat" | "escritorio" | "estudos" };
export const destinoDe = (it: ItemVitrine): Destino =>
  // skill da casa E curso da Forja: o módulo (board/device) abre como DOCUMENTO na aba do chat
  // (meus-estudos). Tem de levar pra lá — não pro "feed", que é a vitrine de blueprints (a aba "estudos"
  // é remapeada pro feed no StudyRoomContent, e o board ficaria escondido atrás da estética blueprint).
  it.id?.startsWith("skill:") || it.id?.startsWith("forja:") ? { texto: "na Sala de Estudos", aba: "chat" }
    : it.tipo === "agente" ? { texto: "no chat", aba: "chat" }
    : it.tipo === "negocio" || it.tipo === "rwa" ? { texto: "no Escritório", aba: "escritorio" }
    : { texto: "na Sala de Estudos", aba: "estudos" };
