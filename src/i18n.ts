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
            footer: { powered: "Powered by VERY", version: "Zaeon OS - v0.1 / Testnet" },
            // --- NOVAS CHAVES (Adicionadas para Navbar e Encryption) ---
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
    ko: {
        translation: {
            menu: { new: "새 계정", load: "계정 불러오기", options: "옵션", manual: "매뉴얼", back: "메뉴로 돌아가기" },
            roles: { student: "학생", researcher: "연구원", professional: "전문가", entrepreneur: "사업가" },
            options: { language: "언어", node: "블록체인 노드", tutorials: "튜토리얼", on: "켜기", off: "끄기" },
            modal: {
                title: "새 계정",
                name: "성명",
                email: "이메일",
                phone: "전화번호",
                continue: "계속",
                cancel: "취소",
                use_wallet: "지갑 주소 사용",
                use_id: "신분증 사용",
                wallet_label: "VERY 지갑 주소",
                wallet_placeholder: "0x...",
                ph_student: "000.000.000-00 (주민등록번호)",
                ph_researcher: "ORCID 또는 Lattes ID",
                ph_professional: "납세자 번호",
                ph_entrepreneur: "사업자 등록번호",
                lbl_student: "신분증 번호 입력",
                lbl_researcher: "ORCID 입력",
                lbl_professional: "세금 ID 입력",
                lbl_entrepreneur: "사업자 번호 입력"
            },
            footer: { powered: "Powered by VERY", version: "Zaeon OS - v0.1 / 테스트넷" },
            // --- NOVAS CHAVES ---
            navbar: {
                about: "회사 소개",
                roadmap: "로드맵",
                study_rooms: "스터디룸"
            },
            encryption: {
                title: "다른 차원에서 온 AI 에이전트.",
                button: "더 알아보기"
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
                phone: "Telefone",
                continue: "Continuar",
                cancel: "Cancelar",
                use_wallet: "Usar Carteira",
                use_id: "Usar ID",
                wallet_label: "Endereço da Carteira VERY",
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
            footer: { powered: "Desenvolvido por VERY", version: "Zaeon OS - v0.1 / Testnet" },
            // --- NOVAS CHAVES ---
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
            footer: { powered: "Desarrollado por VERY", version: "Zaeon OS - v0.1 / Testnet" },
            // --- NOVAS CHAVES ---
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
            // --- NOVAS CHAVES ---
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
            supportedLngs: ["en", "pt", "ko", "es", "fr"],
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