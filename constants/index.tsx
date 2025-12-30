// constants/index.ts
import { Github, Instagram, Facebook, Twitter } from "lucide-react";

export const NAV_LINKS = [
    { title: "Sobre nós", link: "#about-us" },
    { title: "Skills", link: "#skills" },
    { title: "Projects", link: "#projects" },
] as const;

export const SOCIALS = [
    { name: "Instagram", link: "https://instagram.com/visio_vr", icon: Instagram },
    { name: "Facebook",  link: "https://facebook.com/visiovr",   icon: Facebook  },
    { name: "Twitter",   link: "https://twitter.com/visiovr",    icon: Twitter   },
    { name: "GitHub",    link: "https://github.com/visio-vr",    icon: Github    },
] as const;

export const LINKS = {
    sourceCode: "https://github.com/visio-vr/site",
} as const;

export const ABOUT_US = [
    {
        title: "Nossa equipe",
        description:
            "Pessoas curiosas, técnicas e apaixonadas por VR. Devs, designers e pesquisadores trabalhando em sintonia para entregar experiências imersivas e acessíveis.",
        image: "/projects/project-1.png",
        link: "#team",
    },
    {
        title: "Projetos e Parcerias",
        description:
            "Construímos junto com universidades, startups e marcas. Prototipagem rápida, POCs e pilotos em VR/WebXR que viram produtos reais.",
        image: "/projects/project-2.png",
        link: "#parcerias",
    },
    {
        title: "Progresso e Conquistas",
        description:
            "Roadmap transparente, marcos mensais e resultados medidos. Do primeiro MVP às integrações avançadas — sempre iterando com feedback de usuários.",
        image: "/projects/project-3.png",
        link: "#progresso",
    },
] as const;

export const FOOTER_DATA = [
    {
        title: "Institucional",
        data: [
            { name: "Sobre", link: "#about-us" },
            { name: "Projetos", link: "#projects" },
        ],
    },
    {
        title: "Social",
        data: SOCIALS.map(s => ({ name: s.name, link: s.link, icon: s.icon })),
    },
    {
        title: "Código",
        data: [{ name: "Repositório", link: LINKS.sourceCode, icon: Github }],
    },
] as const;

// Export default para compatibilidade com imports existentes
const CONSTS = { NAV_LINKS, SOCIALS, LINKS, ABOUT_US, FOOTER_DATA };
export default CONSTS;