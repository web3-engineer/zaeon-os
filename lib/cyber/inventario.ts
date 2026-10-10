/**
 * Cyberespaço — o INVENTÁRIO (PURO). Um sisteminha pra começar: 12 espaços, um item EQUIPADO (a arma na mão) e o
 * catálogo de itens. O 1º item é a ESPADA ESPIRITUAL (nível 7) — todo mundo começa com ela no 1º espaço, equipada.
 * Salvo no navegador por pessoa (`chaveInventario`); tudo que vem de fora passa por `sanitizarInventario`.
 */

export type IdItem = "espada-espiritual";
export type Raridade = "comum" | "rara" | "epica" | "lendaria";
export type Item = {
  id: IdItem; nome: string; tipo: "arma"; nivel: number; raridade: Raridade; descricao: string;
  /** a arma: dano base de um golpe (o combo multiplica), alcance (m) e o arco do golpe (rad, meia-abertura) */
  arma: { dano: number; alcance: number; arco: number };
};

export const ITENS: Record<IdItem, Item> = {
  "espada-espiritual": {
    id: "espada-espiritual", nome: "Espada Espiritual", tipo: "arma", nivel: 7, raridade: "epica",
    descricao: "Montante enorme de metal escuro com o núcleo de energia verde-água — pesa como uma porta. Se materializa na mão de quem a chama e se desfaz em luz.",
    arma: { dano: 12, alcance: 4.1, arco: 1.0 },   // (uma montante ENORME, ~3 m: alcance longo)
  },
};
/** o dano cresce com o nível do item (+6% por nível acima do 1º) */
export const multiplicadorDoNivel = (nivel: number) => 1 + 0.06 * (Math.max(1, nivel) - 1);

export const ESPACOS = 12;
export type Inventario = { espacos: (IdItem | null)[]; equipado: IdItem | null };
export const ehItem = (v: unknown): v is IdItem => typeof v === "string" && v in ITENS;

/** os itens que só o FUNDADOR tem (a espada e os golpes são do personagem do dono, out/2026) */
export const ITENS_DO_FUNDADOR: readonly IdItem[] = ["espada-espiritual"];
/** quem nunca abriu o inventário: o fundador com a espada no 1º espaço, já equipada; todo o resto, vazio */
export function inventarioInicial(fundador = true): Inventario {
  const espacos: (IdItem | null)[] = Array.from({ length: ESPACOS }, () => null);
  if (!fundador) return { espacos, equipado: null };
  espacos[0] = "espada-espiritual";
  return { espacos, equipado: "espada-espiritual" };
}
/** tira o que a pessoa não pode ter (os itens do fundador, de quem não é) */
export function itensPermitidos(inv: Inventario, fundador: boolean): Inventario {
  if (fundador) return inv;
  const espacos = inv.espacos.map((x) => (x && ITENS_DO_FUNDADOR.includes(x) ? null : x));
  return { espacos, equipado: inv.equipado && espacos.includes(inv.equipado) ? inv.equipado : null };
}
/** limpa o que veio do navegador (item desconhecido some; o equipado precisa estar nos espaços) */
export function sanitizarInventario(v: unknown): Inventario {
  const o = (v ?? {}) as Record<string, unknown>;
  if (!Array.isArray(o.espacos)) return inventarioInicial();
  const espacos = Array.from({ length: ESPACOS }, (_, i) => { const x = (o.espacos as unknown[])[i]; return ehItem(x) ? x : null; });
  const equipado = ehItem(o.equipado) && espacos.includes(o.equipado) ? o.equipado : null;
  return { espacos, equipado };
}
export const equipar = (inv: Inventario, id: IdItem | null): Inventario => (id === null || inv.espacos.includes(id) ? { ...inv, equipado: id } : inv);
export const chaveInventario = (usuario: string) => `zaeon_inventario_${usuario}`;
