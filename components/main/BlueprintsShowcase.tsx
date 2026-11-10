"use client";

/**
 * BlueprintsShowcase — a seção "Aqui você vale o que você constrói." da landing.
 *
 * Mostra os CARDS REAIS da vitrine (os mesmos de "Estudos → Marketplace"): o catálogo embutido
 * (lib/estudos/vitrine) + o que o dono cadastrou no admin (GET /api/estudos/vitrine). São as cartas
 * cyberdeck de verdade (CartaVitrine), em carrossel; clicar leva pra Sala de Estudos, onde dá pra
 * conectar. Antes isto mostrava blueprints de exemplo — agora é a vitrine de verdade, pra bater com
 * o que a pessoa encontra dentro do app.
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { TituloSecao } from "@/components/layout/secao";
import { CATALOGO, type ItemVitrine } from "@/lib/estudos/vitrine";
import { ehAgenteOrquestra } from "@/lib/orquestra/catalogo";
import SolanaMark from "@/components/solana/SolanaMark";
import CartaVitrine from "@/components/estudos/CartaVitrine";
import TrilhoCarrossel from "@/components/ui/TrilhoCarrossel";

/** onde a carta leva: a Sala de Estudos, que tem o Marketplace com o ritual de conexão */
const VITRINE_ROTA = "/workstation/student";

/** o preço da carta (SOL + número, "Grátis" ou "no plano Pro") — igual à vitrine de dentro */
function precoDaCarta(it: ItemVitrine) {
  const orq = it.plugavel ? ehAgenteOrquestra(it.plugavel) : false;
  const planoPro = !!it.plugavel && orq;
  const graa = !planoPro && it.preco <= 0;
  const node = planoPro ? "no plano Pro" : graa ? "Grátis" : <><SolanaMark size={13} title="SOL" />{it.preco.toLocaleString("pt-BR")}</>;
  return { node, graa, badgeGratis: it.preco === 0 && !orq };
}

export default function BlueprintsShowcase() {
  const { t } = useTranslation();
  const [itensDb, setItensDb] = useState<ItemVitrine[]>([]);

  useEffect(() => {
    let vivo = true;
    fetch("/api/estudos/vitrine", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && Array.isArray(d?.itens)) setItensDb(d.itens as ItemVitrine[]); })
      .catch(() => { /* offline: fica só o catálogo embutido */ });
    return () => { vivo = false; };
  }, []);

  // os cards do admin primeiro, depois o catálogo embutido — exatamente como a vitrine de dentro monta
  const cartas = useMemo(() => [...itensDb, ...CATALOGO], [itensDb]);

  return (
    <section id="blueprints" aria-labelledby="blueprints-titulo" className="relative z-40 w-full zaeon-borda pt-16 md:pt-24 pb-6 scroll-mt-28">
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
        <TituloSecao className="font-display" forte={<span id="blueprints-titulo">{t("landing.blueprints.title", "Aqui você vale o que você constrói.")}</span>} />

        {/* o CARROSSEL — o mesmo trilho dos agentes (glide contínuo, o do meio em destaque) */}
        <TrilhoCarrossel
          className="mt-10"
          n={cartas.length}
          chave={cartas.length}
          rotuloSetas={{ anterior: "Blueprints anteriores", proximo: "Próximos blueprints" }}
          render={(i, { noCentro }) => {
            const it = cartas[i]!;
            const { node, graa, badgeGratis } = precoDaCarta(it);
            return (
              <div className={`w-[220px] shrink-0 md:w-[244px] transition-transform duration-500 ${noCentro ? "scale-[1.05]" : "scale-100"}`}>
                <CartaVitrine
                  it={it}
                  badgeGratis={badgeGratis}
                  precoFree={graa}
                  precoNode={node}
                  onClick={() => { window.location.href = VITRINE_ROTA; }}
                />
              </div>
            );
          }}
        />
      </motion.div>
    </section>
  );
}
