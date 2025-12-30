"use client";
import { motion } from "framer-motion";

type TeamAttr = { label: string; value: string };
type Member = {
  role: string;
  name: string;
  img: string;
  attributes: TeamAttr[];
};

export type TeamSectionProps = {
  initialRole?: string;
};

const TEAM_MEMBERS: Member[] = [
  // FUNDADORES (2)
  {
    role: "Fundador",
    name: "John Smith",
    img: "/components/sub/team/fundador.png",
    attributes: [
      { label: "Stack", value: "Next.js, TypeScript, Web3" },
      { label: "Foco", value: "IA + VR + Blockchain" },
      { label: "Qualidade", value: "Visão estratégica e inovação" },
    ],
  },
  {
    role: "CO-Fundador",
    name: "Richard",
    img: "/components/sub/team/fundador2.png",
    attributes: [
      { label: "Stack", value: "React, Three.js, WebXR" },
      { label: "Foco", value: "Experiências imersivas" },
      { label: "Qualidade", value: "Execução e liderança" },
    ],
  },

  // CO-FUNDADORES (2)
  {
    role: "Co-Fundador",
    name: "Cris Querubim",
    img: "/components/sub/team/cofundador.png",
    attributes: [
      { label: "Especialidade", value: "Cabala, Psicologia e Educação" },
      { label: "Foco", value: "Autoconhecimento e impacto social" },
      { label: "Qualidade", value: "Comunicação e liderança criativa" },
    ],
  },
  {
    role: "Co-Fundador",
    name: "Rafael Costa",
    img: "/components/sub/team/cofundador2.png",
    attributes: [
      { label: "Especialidade", value: "Parcerias e growth" },
      { label: "Foco", value: "Alianças estratégicas" },
      { label: "Qualidade", value: "Negociação e visão de produto" },
    ],
  },

  // DESENVOLVEDORES (2)
  {
    role: "Desenvolvedor",
    name: "João Silva",
    img: "/components/sub/team/dev.png",
    attributes: [
      { label: "Stack", value: "React, Tailwind, Solidity" },
      { label: "Foco", value: "Performance e integração Web3" },
      { label: "Qualidade", value: "Precisão técnica e foco" },
    ],
  },
  {
    role: "Desenvolvedor",
    name: "Beatriz Lima",
    img: "/components/sub/team/dev2.png",
    attributes: [
      { label: "Stack", value: "Next.js, Node, GraphQL" },
      { label: "Foco", value: "APIs e DX" },
      { label: "Qualidade", value: "Organização e qualidade de código" },
    ],
  },

  // COMERCIAL (2)
  {
    role: "Comercial",
    name: "Maria Santos",
    img: "/components/sub/team/comercial.png",
    attributes: [
      { label: "Foco", value: "Parcerias e vendas B2B" },
      { label: "Qualidade", value: "Carisma e empatia com o cliente" },
    ],
  },
  {
    role: "Comercial",
    name: "Pedro Almeida",
    img: "/components/sub/team/comercial2.png",
    attributes: [
      { label: "Foco", value: "Prospecção e canais" },
      { label: "Qualidade", value: "Persistência e relacionamento" },
    ],
  },

  // MARKETING (2)
  {
    role: "Marketing",
    name: "Lucas Almeida",
    img: "/components/sub/team/marketing.png",
    attributes: [
      { label: "Foco", value: "Branding e redes sociais" },
      { label: "Qualidade", value: "Criatividade e estética" },
    ],
  },
  {
    role: "Marketing",
    name: "Camila Rocha",
    img: "/components/sub/team/marketing2.png",
    attributes: [
      { label: "Foco", value: "Conteúdo e campanhas" },
      { label: "Qualidade", value: "Curadoria e storytelling" },
    ],
  },

  // RH (2)
  {
    role: "RH",
    name: "Carla Ribeiro",
    img: "/components/sub/team/rh.png",
    attributes: [
      { label: "Foco", value: "Gestão humana e cultura organizacional" },
      { label: "Qualidade", value: "Empatia e diplomacia" },
    ],
  },
  {
    role: "RH",
    name: "Bruno Mendes",
    img: "/components/sub/team/rh2.png",
    attributes: [
      { label: "Foco", value: "Treinamento e desenvolvimento" },
      { label: "Qualidade", value: "Atenção e processos" },
    ],
  },
];

export default function TeamSection({ initialRole }: TeamSectionProps) {
  const title = "Nossa equipe";

  return (
      <section id="team" className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-24">
        <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-[36px] sm:text-[44px] font-light tracking-tight leading-tight text-center mb-16"
        >
          <motion.span
            className="bg-clip-text text-transparent select-none"
            style={{ backgroundImage: "linear-gradient(90deg, #3b82f6, #9333ea, #ec4899, #3b82f6)", backgroundSize: "300% 100%" }}
            animate={{ backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"] }}
            transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
          >
            {title}
          </motion.span>
        </motion.h2>

        <div className="flex flex-col gap-12">
          {TEAM_MEMBERS.map((member) => (
              <div
                  key={member.role}
                  className="flex flex-col md:flex-row items-center justify-between gap-10 bg-[#0B011C]/60 p-10 rounded-2xl border border-purple-700/20 shadow-[0_0_30px_rgba(112,66,248,0.25)] hover:shadow-[0_0_40px_rgba(147,51,234,0.4)] transition duration-300"
              >
                <div className="flex-shrink-0">
                  <img
                      src={member.img}
                      alt={member.role}
                      className="w-56 h-56 object-cover rounded-xl border border-white/10"
                  />
                </div>

                <div className="flex-1 text-left">
                  <h3 className="text-3xl font-light bg-gradient-to-r from-blue-400 via-sky-500 to-purple-500 bg-clip-text text-transparent">
                    {member.role}
                  </h3>
                  <motion.span
                    className="text-lg mt-2 mb-6 bg-clip-text text-transparent block"
                    style={{ backgroundImage: "linear-gradient(90deg, #3b82f6, #9333ea, #ec4899, #3b82f6)", backgroundSize: "300% 100%" }}
                    animate={{ backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"] }}
                    transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
                  >
                    {member.name}
                  </motion.span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {member.attributes.map((attr) => (
                        <div
                            key={attr.label}
                            className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                        >
                          <div className="text-xs uppercase tracking-wider text-white/60">
                            {attr.label}
                          </div>
                          <div className="text-base text-white/90 mt-1">
                            {attr.value}
                          </div>
                        </div>
                    ))}
                  </div>
                </div>
              </div>
          ))}
        </div>
      </section>
  );
}