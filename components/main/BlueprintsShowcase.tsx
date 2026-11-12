"use client";

/**
 * BlueprintsShowcase — a seção "Aqui você vale o que você constrói." da landing.
 *
 * Mostra PROJETOS REAIS de usuários (lib/landing/projetos): engenharia, eletrônica, elétrica, programação, mecatrônica —
 * sempre com um pé na realidade. Usa a MESMA estética das cartas da vitrine (a carta cyberdeck: chanfro, moldura de neon
 * que corre, lombada, colchetes de HUD, o emoji do tema) — só que com os campos do projeto (a área na lombada, "PROJETO"
 * no tipo, o entregável na descrição que sobe no hover). Em carrossel, o do meio em destaque.
 */
import { type CSSProperties } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { TituloSecao } from "@/components/layout/secao";
import { PROJETOS, type AreaProjeto, type Projeto } from "@/lib/landing/projetos";
import TrilhoCarrossel from "@/components/ui/TrilhoCarrossel";
import "@/components/estudos/vitrine-card.css";

/** a cor de neon por área (faz o papel da raridade na vitrine: acende a lombada e a moldura) */
const AREA_COR: Record<AreaProjeto, string> = {
  "Eletrônica": "#38f0ff",
  "Elétrica": "#f5c542",
  "Programação": "#8b5cf6",
  "Mecatrônica": "#49f2a0",
  "Embarcados": "#ff7ac6",
  "Mecânica": "#ff9f45",
};

/** a carta cyberdeck do projeto — mesma moldura/lombada/colchetes/HUD da vitrine, com os campos do projeto */
function CartaProjeto({ p }: { p: Projeto }) {
  const cor = AREA_COR[p.area];
  return (
    <article className="vt-card" style={{ "--cor": cor, "--glow": "20px", "--cy": "#38f0ff" } as CSSProperties}>
      <div className="vt-frame">
        <div className="vt-panel">
          {/* a lombada fica só com a cor (o nicho da ideia não se repete mais em texto) */}
          <div className="vt-spine" />
          <div className="vt-art">
            <span className="vt-br tl" /><span className="vt-br tr" /><span className="vt-br bl" /><span className="vt-br brr" />
            <div className="vt-glyph"><b>{p.icone}</b></div>
            <div className="vt-desc">{p.resumo}</div>
          </div>
          <div className="vt-plate">
            <div className="vt-type">PROJETO</div>
            <h3 className="vt-title">{p.titulo}</h3>
          </div>
          <div className="vt-crt" />
        </div>
      </div>
    </article>
  );
}

export default function BlueprintsShowcase() {
  const { t } = useTranslation();
  return (
    <section id="blueprints" aria-labelledby="blueprints-titulo" className="relative z-40 w-full zaeon-borda pt-16 md:pt-24 pb-6 scroll-mt-28">
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
        <TituloSecao className="font-display" forte={<span id="blueprints-titulo">{t("landing.blueprints.title", "Aqui você vale o que você constrói.")}</span>} />

        {/* o CARROSSEL — o mesmo trilho dos agentes (glide contínuo, o do meio em destaque) */}
        <TrilhoCarrossel
          className="mt-10"
          n={PROJETOS.length}
          rotuloSetas={{ anterior: "Projetos anteriores", proximo: "Próximos projetos" }}
          render={(i, { noCentro }) => (
            <div className={`w-[208px] shrink-0 md:w-[228px] transition-transform duration-500 ${noCentro ? "scale-[1.04]" : "scale-100"}`}>
              <CartaProjeto p={PROJETOS[i]!} />
            </div>
          )}
        />
      </motion.div>
    </section>
  );
}
