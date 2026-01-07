"use client";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpApi from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
    .use(HttpApi) // Habilita o carregamento dos arquivos JSON
    .use(LanguageDetector) // Detecta o idioma do navegador do usuário
    .use(initReactI18next) // Conecta com o React
    .init({
        fallbackLng: "en",
        debug: false,

        // Namespaces: 'common' é o nome do arquivo common.json que criamos
        ns: ["common"],
        defaultNS: "common",

        interpolation: {
            escapeValue: false, // React já protege contra XSS
        },
        backend: {
            // Onde os arquivos estão fisicamente (na pasta public)
            loadPath: "/locales/{{lng}}/common.json",
        },
        react: {
            // Isso evita que o app quebre enquanto o JSON é baixado
            useSuspense: false,
        },
    });

export default i18n;