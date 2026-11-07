/**
 * lib/anatomia/vista.ts — ONDE a câmera fica. PURA: números entram, números saem.
 *
 * Extraído do `fit()` de `app/scene.tsx` do human-atlas (MIT — procedência em
 * lib/anatomia/atlas.ts). No original a função mistura leitura do DOM (`el.clientWidth`) com a
 * aritmética; aqui a aritmética sai inteira e a cena só lhe passa as medidas.
 *
 * POR QUE EU SEPAREI, e isto não é arrumação: esta é a conta mais escorregadia do visualizador.
 * Um sinal trocado ou um divisor zerado não quebra nada — põe a câmera DENTRO do corpo, ou a
 * 400 unidades de distância, e a tela fica cinza. Não há exceção, não há log: só uma tela cinza
 * que ninguém sabe explicar. Separada, ela é afirmável: distância sempre positiva, sempre
 * crescente com o inventário, alvo sempre na altura do tronco.
 *
 * As três alturas reservadas (350 no celular, 270 no desktop, 40/340 de largura) são as do
 * original e correspondem ao espaço que os painéis ocupam por cima da cena. Mantidas como estão:
 * mexer nelas é mexer no enquadramento, e o nosso CSS repete o mesmo layout.
 */
import type { Vista } from "@/lib/anatomia/atlas";

/** Abaixo disto a tela é "celular": muda distância, alvo e o espaço reservado aos painéis. */
export const LARGURA_CELULAR = 768;

export type Medidas = {
  larguraTela: number;
  alturaTela: number;
  /** campo de visão vertical da câmera, em graus */
  fov: number;
  /** 0 = corpo montado, 1 = inventário inteiro espalhado */
  extensao: number;
  /** extensão do empacotamento (de criarLayoutDeExplosao) — 0 quando nada foi empacotado ainda */
  packLargura: number;
  packAltura: number;
  vista: Vista;
};

export type Enquadramento = {
  /** distância do alvo à câmera, em unidades de mundo. SEMPRE > 0. */
  distancia: number;
  alvo: [number, number, number];
  /** direção unitária-ish do alvo para a câmera (a do original, com o leve pitch de 0,02) */
  direcao: [number, number, number];
  /** a vista efetivamente usada: acima de 0,8 de explosão o original força "front" */
  vista: Vista;
};

const grausParaRad = (g: number) => (g * Math.PI) / 180;

/** `2·tan(fov/2)` — o fator que converte altura de mundo em distância. Nunca zero. */
const fatorDeAltura = (fov: number) => 2 * Math.tan(grausParaRad(Math.max(1, Math.min(179, fov)) / 2));

const direcaoDa = (vista: Vista): [number, number, number] => {
  if (vista === "front") return [0, 0.02, 1];
  if (vista === "back") return [0, 0.02, -1];
  if (vista === "side") return [1, 0.02, 0];
  // three-quarter: normalizada, como no original
  const v: [number, number, number] = [0.35, 0.06, 1];
  const n = Math.hypot(...v);
  return [v[0] / n, v[1] / n, v[2] / n];
};

export function enquadrar(m: Medidas): Enquadramento {
  const celular = m.larguraTela < LARGURA_CELULAR;
  const fator = fatorDeAltura(m.fov);

  // altura útil: o que sobra da tela depois dos painéis. O piso de 160 px do original existe para
  // esta divisão não explodir numa janela achatada — e é por isso que ele fica.
  const reservado = celular ? 350 : 270;
  const alturaUtil = Math.max(160, m.alturaTela - reservado);

  const distanciaNormal = celular ? Math.max(4.5, (1.8 * m.alturaTela) / alturaUtil / fator) : 4;

  const aspectoUtil = Math.max(0.35, (m.larguraTela - (celular ? 40 : 340)) / alturaUtil);
  const distanciaDoInventario =
    (Math.max(m.packAltura, m.packLargura / aspectoUtil) / fator) * (m.alturaTela / alturaUtil) * 1.08;

  const t = Math.max(0, Math.min(1, m.extensao));
  const distancia = distanciaNormal + (Math.max(0.2, distanciaDoInventario) - distanciaNormal) * t;

  const vista: Vista = t > 0.8 ? "front" : m.vista;
  const alvoX = t > 0.1 && m.larguraTela > LARGURA_CELULAR - 1 ? -m.packLargura * 0.12 : 0;
  const alvoY = t > 0.1 || celular ? 0.85 : 0.68;

  return { distancia, alvo: [alvoX, alvoY, 0], direcao: direcaoDa(vista), vista };
}
