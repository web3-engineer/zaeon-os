"use client";

/**
 * ProjetoVencedor — o card do PRODUTO VENCEDOR na categoria blockchain (Programa Centelha, 2ª edição) com o apoio
 * oficial do MCTI. Era o penúltimo bloco da landing (o "ProcessFlowchart" de components/main/encryption); agora mora
 * dentro de "ou traga as chaves de API dos seus", no lugar dos cards de passo a passo (o dono, out/2026: "sem cards
 * menores explicando, remova eles e no lugar ponha o card que indica o projeto vencedor da categoria blockchain").
 */
import { Trans, useTranslation } from "react-i18next";
import NextImage from "next/image";
import { motion } from "framer-motion";
import TextoRevelado from "@/components/ui/TextoRevelado";

export default function ProjetoVencedor({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={`flex w-full flex-col items-center ${className}`}>
      <h4 className="mb-6 text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-700 dark:text-cyan-300 transition-colors duration-300">
        <TextoRevelado texto={t("landing.premiacao.vencedor", { defaultValue: "" })} />
      </h4>

      {/* o card é AZUL nos dois temas → o conteúdo usa o estilo escuro (texto claro, logo do MCTI escuro) */}
      <div className="w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="group relative flex w-full flex-col items-center justify-center gap-8 overflow-hidden rounded-[2rem] border border-cyan-700/20 bg-sky-50/75 dark:border-cyan-300/20 dark:bg-[#0b1733]/80 p-8 text-center shadow-[0_12px_40px_rgba(30,79,112,0.12)] backdrop-blur-md transition-all duration-500 hover:border-cyan-500/50 md:p-12"
        >
          <div className="z-10 flex max-w-2xl flex-col items-center gap-4 text-center">
            <h3 className="text-2xl font-light leading-tight text-slate-900 dark:text-white md:text-3xl">
              <Trans i18nKey="landing.premiacao.projeto" components={{ hl: <span className="font-bold text-cyan-700 dark:text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]" /> }} />
            </h3>
            <p className="mx-auto max-w-lg text-sm font-medium leading-relaxed text-slate-800 dark:text-white/90">
              <a
                href="https://programacentelha.com.br/wp-content/uploads/2025/01/CE-Lista-Final-Empresas-Contratadas.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="relative z-50 cursor-pointer font-bold text-cyan-700 dark:text-cyan-300 underline decoration-cyan-500/50 underline-offset-4 transition-all hover:text-cyan-300 hover:decoration-cyan-300"
              >
                {t("landing.premiacao.programa", { defaultValue: "" })}
              </a>
            </p>
          </div>

          {/* o apoio oficial: o logo do MCTI (as versões _alpha são as oficiais com o fundo virado transparência; PNG ~4:1) */}
          <div className="z-10 flex w-full flex-col items-center justify-center border-t border-slate-300/50 dark:border-white/10 pt-8">
            <span className="mb-6 text-[10px] font-semibold uppercase tracking-widest text-slate-800 dark:text-white/90">{t("landing.premiacao.oficial", { defaultValue: "" })}</span>
            <div className="relative h-16 w-64 rounded-lg bg-[#0b1733] p-2 opacity-95 transition-all duration-300 group-hover:scale-105 group-hover:opacity-100">
              <NextImage src="/sponsors/MCTI_dark_alpha.png" alt={t("landing.premiacao.ministerio", { defaultValue: "" })} fill sizes="256px" className="h-full w-full object-contain" unoptimized />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
