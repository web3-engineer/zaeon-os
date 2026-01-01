"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
    en: {
        translation: {
            menu: { new: "New Account", load: "Load Account", options: "Options", manual: "Manual", back: "Back to Menu" },
            roles: { student: "Student", researcher: "Researcher", professional: "Professional", entrepreneur: "Entrepreneur" },
            options: { language: "Language", node: "Blockchain Node", tutorials: "Tutorials", on: "ON", off: "OFF" },
            modal: {
                title: "New Account",
                name: "Full Name",
                email: "Email",
                phone: "Phone",
                continue: "Continue",
                cancel: "Cancel",
                use_wallet: "Use Wallet Address",
                use_id: "Use Role ID",
                wallet_label: "VERY Wallet Address",
                wallet_placeholder: "0x...",
                ph_student: "000.000.000-00 (ID)",
                ph_researcher: "ORCID or Lattes ID",
                ph_professional: "Tax ID / SSN",
                ph_entrepreneur: "Company Tax ID",
                lbl_student: "Enter your ID",
                lbl_researcher: "Enter ORCID/ID",
                lbl_professional: "Enter Tax ID",
                lbl_entrepreneur: "Enter Company ID"
            },
            footer: { powered: "Powered by Movement", version: "Zaeon OS - v0.1 / Testnet" },
            navbar: {
                about: "About Us",
                roadmap: "Roadmap",
                study_rooms: "Study Rooms"
            },
            encryption: {
                title: "AI Agents from Another Dimension.",
                button: "Learn more"
            }
        }
    },
    // Substituído Coreano (ko) por Mandarim (zh)
    zh: {
        translation: {
            menu: { new: "新账户", load: "加载账户", options: "选项", manual: "手册", back: "返回菜单" },
            roles: { student: "学生", researcher: "研究员", professional: "专业人士", entrepreneur: "企业家" },
            options: { language: "语言", node: "区块链节点", tutorials: "教程", on: "开启", off: "关闭" },
            modal: {
                title: "新账户",
                name: "姓名",
                email: "电子邮件",
                phone: "电话号码",
                continue: "继续",
                cancel: "取消",
                use_wallet: "使用钱包地址",
                use_id: "使用身份证",
                wallet_label: "VERY 钱包地址",
                wallet_placeholder: "0x...",
                ph_student: "身份证号码",
                ph_researcher: "ORCID 或 Lattes ID",
                ph_professional: "纳税人识别号",
                ph_entrepreneur: "公司注册号",
                lbl_student: "输入身份证号",
                lbl_researcher: "输入 ORCID",
                lbl_professional: "输入税号",
                lbl_entrepreneur: "输入公司 ID"
            },
            footer: { powered: "Powered by Movement", version: "Zaeon OS - v0.1 / 测试网" },
            navbar: {
                about: "关于我们",
                roadmap: "路线图",
                study_rooms: "自习室"
            },
            encryption: {
                title: "来自另一个维度的 AI 代理。",
                button: "了解更多"
            }
        }
    },
    pt: {
        translation: {
            menu: { new: "Nova Conta", load: "Carregar Conta", options: "Opções", manual: "Manual", back: "Voltar ao Menu" },
            roles: { student: "Estudante", researcher: "Pesquisador", professional: "Profissional", entrepreneur: "Empresário" },
            options: { language: "Idioma", node: "Nó Blockchain", tutorials: "Tutoriais", on: "LIGADO", off: "DESLIGADO" },
            modal: {
                title: "Nova Conta",
                name: "Nome Completo",
                email: "E-mail",
                phone: "Celular",
                continue: "Continuar",
                cancel: "Cancelar",
                use_wallet: "Usar Carteira",
                use_id: "Usar ID",
                wallet_label: "Endereço da Carteira",
                wallet_placeholder: "0x...",
                ph_student: "000.000.000-00 (CPF)",
                ph_researcher: "ORCID ou Lattes",
                ph_professional: "CPF ou CNPJ",
                ph_entrepreneur: "CNPJ da Empresa",
                lbl_student: "Digite seu CPF",
                lbl_researcher: "Informe ORCID/Lattes",
                lbl_professional: "Informe CPF/CNPJ",
                lbl_entrepreneur: "Informe o CNPJ"
            },
            footer: { powered: "Powered by Movement", version: "Zaeon OS - v0.1 / Testnet" },
            navbar: {
                about: "Sobre Nós",
                roadmap: "Roadmap",
                study_rooms: "Salas de Estudo"
            },
            encryption: {
                title: "Agentes de IA vindos de Outra Dimensão.",
                button: "Saiba mais"
            }
        }
    },
    es: {
        translation: {
            menu: { new: "Nueva Cuenta", load: "Cargar Cuenta", options: "Opciones", manual: "Manual", back: "Volver al Menú" },
            roles: { student: "Estudiante", researcher: "Investigador", professional: "Profesional", entrepreneur: "Empresario" },
            options: { language: "Idioma", node: "Nodo Blockchain", tutorials: "Tutoriales", on: "ENCENDIDO", off: "APAGADO" },
            modal: {
                title: "Nueva Cuenta",
                name: "Nombre Completo",
                email: "Correo",
                phone: "Teléfono",
                continue: "Continuar",
                cancel: "Cancelar",
                use_wallet: "Usar Billetera",
                use_id: "Usar ID",
                wallet_label: "Dirección de Billetera VERY",
                wallet_placeholder: "0x...",
                ph_student: "Documento de Identidad",
                ph_researcher: "ORCID o ID",
                ph_professional: "ID Fiscal",
                ph_entrepreneur: "ID de la Empresa",
                lbl_student: "Ingrese su ID",
                lbl_researcher: "Ingrese ORCID",
                lbl_professional: "Ingrese ID Fiscal",
                lbl_entrepreneur: "Ingrese ID Empresa"
            },
            footer: { powered: "Powered by Movement", version: "Zaeon OS - v0.1 / Testnet" },
            navbar: {
                about: "Sobre Nosotros",
                roadmap: "Roadmap",
                study_rooms: "Salas de Estudio"
            },
            encryption: {
                title: "Agentes de IA de Otra Dimensión.",
                button: "Saber más"
            }
        }
    },
    fr: {
        translation: {
            menu: { new: "Nouveau Compte", load: "Charger Compte", options: "Options", manual: "Manuel", back: "Retour au Menu" },
            roles: { student: "Étudiant", researcher: "Chercheur", professional: "Professionnel", entrepreneur: "Entrepreneur" },
            options: { language: "Langue", node: "Nœud Blockchain", tutorials: "Tutoriels", on: "MARCHE", off: "ARRÊT" },
            modal: {
                title: "Nouveau Compte",
                name: "Nom Complet",
                email: "E-mail",
                phone: "Téléphone",
                continue: "Continuer",
                cancel: "Annuler",
                use_wallet: "Utiliser Portefeuille",
                use_id: "Utiliser ID",
                wallet_label: "Adresse Portefeuille VERY",
                wallet_placeholder: "0x...",
                ph_student: "ID Étudiant",
                ph_researcher: "ORCID ou ID",
                ph_professional: "ID Fiscal",
                ph_entrepreneur: "ID Entreprise",
                lbl_student: "Entrez votre ID",
                lbl_researcher: "Entrez ORCID",
                lbl_professional: "Entrez ID Fiscal",
                lbl_entrepreneur: "Entrez ID Entreprise"
            },
            footer: { powered: "Propulsé par VERY", version: "Zaeon OS - v0.1 / Testnet" },
            navbar: {
                about: "À Propos",
                roadmap: "Roadmap",
                study_rooms: "Salles d'Étude"
            },
            encryption: {
                title: "Agents IA d'une Autre Dimension.",
                button: "En savoir plus"
            }
        }
    }
};

// Evita reinicializar se já existir (problema comum em Hot Reload do Next.js)
if (!i18n.isInitialized) {
    i18n
        .use(LanguageDetector)
        .use(initReactI18next)
        .init({
            resources,
            fallbackLng: "en",
            // Atualizado 'ko' para 'zh'
            supportedLngs: ["en", "pt", "zh", "es", "fr"],
            nonExplicitSupportedLngs: true, // IMPORTANTE: Corrige o pt-BR
            load: 'languageOnly', // IMPORTANTE: Ignora o código regional

            interpolation: {
                escapeValue: false
            },
            react: {
                useSuspense: false
            }
        });
}

export default i18n;