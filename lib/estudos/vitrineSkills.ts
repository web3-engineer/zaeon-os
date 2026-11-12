/**
 * lib/estudos/vitrineSkills.ts — as skills da casa viram CARD na vitrine (seção "Skills").
 *
 * SERVIDOR SÓ: lê o diretório `.claude/skills` por `lib/agent/skills-dir`. Fica fora de
 * `lib/estudos/vitrine.ts` de propósito — aquele módulo é importado pela UI, e `node:fs` não
 * existe no navegador. Quem junta os dois é a rota `/api/estudos/vitrine`, como já faz com os
 * itens cadastrados no admin.
 *
 * Por que a skill entra como card, e não só como tool: é o pedido do dono — a Zaeon como "fábrica
 * de coisas open-source", com o aluno escolhendo na loja o que plugar no chat. O card é a porta;
 * o `activate_skill` é o que acontece depois.
 *
 * Preço zero e uma fração só: skill da casa é parte do produto, não item fracionado. A moeda nem
 * está no ar (`MOEDA.ativa === false`), e um card de skill com preço sugeriria cobrança que não
 * existe.
 */
import type { ItemVitrine, Modelo3D, TipoProduto } from "@/lib/estudos/vitrine";
import { DONO_VITRINE } from "@/lib/auth/roles";
import {
  cardsDasSkills, carregarSkillsDaCasa, fsDeDisco, type CardDaSkill, type CatalogoDaCasa,
} from "@/lib/agent/skills-dir";

/** `livro` é o fallback: modelo desconhecido não pode quebrar o render da vitrine. */
const MODELOS: readonly string[] = [
  "console", "chip", "planta", "predio", "drone", "foguete",
  "molecula", "engrenagem", "livro", "graos", "ondas", "robo",
];

/**
 * Card da skill → item da vitrine. A `entrega` do card é a entrega do item: é o que diz ao aluno
 * o que ele ganha ao plugar, e o portão (`skills-dir.test.ts`) exige que ela exista.
 *
 * REGRA DO DONO, aplicada AQUI e não lida da skill: todo item PAGO e todo CURSO pertencem ao
 * fundador (`DONO_VITRINE`). Atribuir em vez de ler é de propósito — uma skill não pode se declarar
 * dona de um produto pago; o dono é da conta, não do arquivo. O portão confere que foi isso que
 * aconteceu, então um refactor que passe a ler o dono da skill cai no CI.
 */
export function itemDaSkill(card: CardDaSkill): ItemVitrine {
  const modelo = (MODELOS.includes(card.modelo) ? card.modelo : "livro") as Modelo3D;
  const pago = card.precoBRL > 0;
  const curso = card.familia === "course";
  // Pago OU curso → do fundador. Grátis de procedimento → sem dono (é parte da plataforma).
  const dono = pago || curso ? DONO_VITRINE : undefined;
  return {
    id: `skill:${card.slug}`,
    titulo: card.titulo,
    subtitulo: card.subtitulo,
    tipo: curso ? ("curso" as TipoProduto) : ("skill" as TipoProduto),
    execucao: "agente",
    modelo,
    autor: "Zaeon",
    raridade: "comum",
    profundidade: 0,
    preco: 0,                               // o preço em SOL do catálogo simulado não se aplica
    ...(pago ? { precoBRL: card.precoBRL } : {}),
    ...(dono ? { dono } : {}),
    ...(card.device ? { device: card.device } : {}),
    fracoes: { total: 1, vendidas: 0 },
    selos: { supervisionado: false, linksOk: true, codigoPrivado: false },
    entrega: card.entrega,
    // O app secundário que a skill comanda entra como tag: é por ele que o aluno acha
    // "o que mexe no atlas" sem saber o nome da skill.
    tags: [...card.tags, ...(card.app ? [card.app] : [])],
  };
}

/** Os itens de vitrine de um catálogo já carregado (puro — é o que o teste exercita). */
export const itensDasSkills = (c: CatalogoDaCasa): ItemVitrine[] => cardsDasSkills(c).map(itemDaSkill);

/** Lê o disco e devolve os itens. Nunca lança: vitrine sem skill é vitrine, não erro. */
export function itensDasSkillsDoDisco(): ItemVitrine[] {
  try {
    return itensDasSkills(carregarSkillsDaCasa(fsDeDisco()));
  } catch {
    return [];
  }
}
