/**
 * lib/anatomia/toque.ts — distingue um TOQUE de uma órbita, pinça, arrasto ou gesto cancelado.
 *
 * Porte de `app/pointer-tap.ts` do human-atlas (MIT — procedência em lib/anatomia/atlas.ts).
 * Mesma máquina, mesmos limiares de quem chama (5 px para mouse, 12 px para dedo).
 *
 * Por que isto existe, e por que é PURO: num visualizador que orbita com o mesmo botão com que
 * se seleciona, "clique" e "girar" chegam pelos MESMOS eventos. Sem esta máquina, cada arrasto
 * para girar o corpo terminaria abrindo o painel de uma estrutura ao acaso — e o aluno não
 * conseguiria mais girar nada. Sendo pura, dá para provar sem navegador: é o que o teste faz.
 *
 * As três regras, todas do original:
 *   1. mais de um dedo em cena = pinça ou pan, nunca toque;
 *   2. passar do limiar de deslocamento cancela o toque (virou arrasto), e não volta;
 *   3. `cancel` (o navegador tomou o gesto) bloqueia a sequência inteira.
 */
export class DiscriminadorDeToque {
  private ativos = new Map<number, { x: number; y: number; limiar: number }>();
  private bloqueado = false;

  down(id: number, x: number, y: number, limiar: number): void {
    if (this.ativos.size === 0) this.bloqueado = false;
    this.ativos.set(id, { x, y, limiar });
    if (this.ativos.size > 1) this.bloqueado = true;   // dois dedos: pinça/pan
  }

  move(id: number, x: number, y: number): void {
    const inicio = this.ativos.get(id);
    if (inicio && Math.hypot(x - inicio.x, y - inicio.y) > inicio.limiar) this.bloqueado = true;
  }

  /** `true` só se foi um toque de verdade: um ponteiro, sem arrasto, sem cancelamento. */
  up(id: number, x: number, y: number): boolean {
    this.move(id, x, y);
    const toque = this.ativos.has(id) && this.ativos.size === 1 && !this.bloqueado;
    this.ativos.delete(id);
    return toque;
  }

  cancel(id: number): void {
    this.ativos.delete(id);
    this.bloqueado = true;
  }
}
