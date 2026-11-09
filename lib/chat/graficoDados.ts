/**
 * lib/chat/graficoDados.ts — #749: o bloco ```grafico de DADOS (barras), que o modelo escreve quando a pessoa PEDE um
 * gráfico ("faça um gráfico da população do Brasil por região"). PURO.
 *
 *   {"barras": [{"rotulo": "Sudeste", "valor": 84.8}, …], "titulo": "População por região (milhões)",
 *    "unidade": " mi", "fonte": "Censo 2022 (IBGE)"}
 *
 * Antes, esse pedido ia para o gerador de IMAGEM (um mapa com bonequinhos, sem número nenhum) ou virava diagrama.
 * O desenho é o mesmo SVG do G3 (lib/agent/grafico.ts). A diferença é de onde vem o número: no G3, do próprio turno
 * (recibo); aqui, da Aura — por isso a `fonte` é OBRIGATÓRIA (sem ela não desenha) e a legenda diz que os números
 * são citados por ela.
 */
import { pontosValidos, type Grafico } from "@/lib/agent/grafico";

/** o JSON do ```grafico é de dados (barras)? — o resto (funções, geometria) continua no GraficoFuncao */
export function ehGraficoDeDados(json: string): boolean {
  try { const o = JSON.parse(json); return !!o && typeof o === "object" && Array.isArray(o.barras); } catch { return false; }
}

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

export function parseGraficoDados(json: string): { ok: true; grafico: Grafico } | { ok: false; erro: string } {
  let o: any;
  try { o = JSON.parse(json); } catch { return { ok: false, erro: "JSON do gráfico inválido" }; }
  if (!o || typeof o !== "object" || !Array.isArray(o.barras)) return { ok: false, erro: "gráfico sem barras" };
  const pontos = pontosValidos(
    o.barras.map((b: any) => ({ label: texto(b?.rotulo ?? b?.label, 60), valor: typeof b?.valor === "number" ? b.valor : Number(b?.valor) })),
  );
  if (pontos.length < 2) return { ok: false, erro: "poucos dados para um gráfico" };
  const fonte = texto(o.fonte, 120);
  if (!fonte) return { ok: false, erro: "gráfico sem fonte dos números" };
  const titulo = texto(o.titulo, 80) || "Gráfico";
  // rótulo curto (ano, sigla) cabe embaixo da barra em pé; rótulo longo ("Centro-Oeste") vai deitado, à esquerda
  const forma: Grafico["forma"] = pontos.every((p) => p.label.length <= 9) && pontos.length <= 8 ? "barras" : "faixas";
  const unidade = texto(o.unidade, 16);
  return { ok: true, grafico: { forma, titulo, fonte, pontos, ...(unidade ? { unidade: ` ${unidade}` } : {}) } };
}
