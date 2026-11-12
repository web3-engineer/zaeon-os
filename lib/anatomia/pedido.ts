/**
 * lib/anatomia/pedido.ts — o pedido do aluno NOMEIA uma estrutura do atlas? Puro (o atlas entra por
 * parâmetro).
 *
 * ────────────── o furo que isto fecha ──────────────
 * Até aqui, a peça 3D só nascia se o MODELO listasse a estrutura no campo `estruturas` da resposta
 * — e mesmo assim perdia para qualquer `artifacts` que o modelo também mandasse, e ganhava a
 * companhia de um diagrama automático em toda pergunta de "como funciona". O dono viu o resultado:
 * a agente de medicina devolvendo diagrama para quem pediu uma parte do corpo.
 *
 * "Me mostra o fêmur" não é pergunta que precise de modelo para ser entendida. O atlas sabe quais
 * nomes tem; então quem decide é ele, aqui, sem chamada nenhuma.
 *
 * ────────────── por que um portão de confiança, e não só `cenaDoConceito` ──────────────
 * `cenaDoConceito` resolve bem um TERMO, mas numa frase inteira ela aceita qualquer palavra que
 * apareça dentro de um nome de conceito. Medido: "o que é hipertensão arterial" virava
 * `arterial trunk`. Para uma peça que vai IMPOR-SE à resposta, isso é pouco. Então a frase só conta
 * como "nomeou uma estrutura" quando:
 *   · passou pelo mapa PT→EN, que é curado à mão ("coração", "joelho", "nervo óptico"); ou
 *   · o pedaço reconhecido é o NOME INTEIRO de um conceito ("fêmur" → `femur`), e não um adjetivo
 *     solto dentro do nome de outro ("arterial").
 * Fora disso devolve null, e a estrutura ainda pode nascer pelo caminho antigo, se o modelo a citar.
 */
import type { Atlas } from "@/lib/anatomia/atlas";
import { termoDeBusca, termoNaFrase } from "@/lib/anatomia/busca";
import { cenaDoConceito } from "@/lib/anatomia/cena-do-conceito";

export type EstruturaNomeada = { id: string; nome: string };

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function estruturaNomeada(atlas: Atlas, frase: string): EstruturaNomeada | null {
  const texto = String(frase ?? "").trim();
  if (!texto || texto.length > 400) return null;   // pedido de peça é curto; texto colado não é pedido

  const viaMapa = termoDeBusca(texto).viaSinonimo;
  if (!viaMapa) {
    const pedaco = termoNaFrase(atlas, texto) ?? (texto.split(/\s+/).length === 1 ? semAcento(texto) : null);
    if (!pedaco || !atlas.concepts.some((c) => semAcento(c.name) === pedaco)) return null;
  }

  // Classe genérica ("um osso", "uma artéria") devolve !ok aqui: a skill manda PERGUNTAR qual, e não
  // abrir a categoria inteira — então não há estrutura nomeada.
  const r = cenaDoConceito(atlas, texto);
  return r.ok ? { id: r.dados.conceito.id, nome: r.dados.conceito.nome } : null;
}
