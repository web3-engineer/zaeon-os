"use client";

/**
 * ChavesApi — a seção das casas de modelos (#modelos) + o card do projeto vencedor da categoria blockchain.
 * A menção às "chaves de API dos seus" (o briefing "ou traga as chaves…") saiu a pedido do dono; o nome do componente
 * fica por compatibilidade. A âncora #modelos é a de "Ver os modelos" (linkada no rodapé), por isso continua aqui.
 */
import EquipadosCom from "./EquipadosCom";
import ProjetoVencedor from "./ProjetoVencedor";

export default function ChavesApi({ className = "" }: { className?: string }) {
  return (
    <section id="chaves" aria-label="Modelos de IA e projeto em destaque" className={`zaeon-borda relative z-40 w-full scroll-mt-28 ${className}`}>
      {/* o card do PRODUTO VENCEDOR na categoria blockchain (o dono, out/2026) */}
      <ProjetoVencedor />

      {/* as casas de modelos (âncora #modelos do "Ver os modelos") */}
      <div id="modelos" className="scroll-mt-24">
        <EquipadosCom className="mt-12" />
      </div>
    </section>
  );
}
