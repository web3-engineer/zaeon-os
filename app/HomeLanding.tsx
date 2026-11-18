"use client";

import { useEffect, useState } from "react";
import HeroPage from "@/components/sub/hero-content";
import Encryption, { TituloConhecimento } from "@/components/main/encryption";
import Faq from "@/components/main/Faq";
import CyberespacoExplica from "@/components/main/CyberespacoExplica";
import { Footer } from "@/components/main/footer";
import styles from "./entrada.module.css";

export default function HomeLanding() {
    // A landing usa idioma, sessão e preferências que são resolvidos no navegador.
    const [montado, setMontado] = useState(false);
    useEffect(() => { setMontado(true); }, []);
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const irPraAncora = () => {
            clearTimeout(timer);
            const hash = window.location.hash.slice(1);
            if (!hash) return;
            let id = hash;
            try { id = decodeURIComponent(hash); } catch { /* usa o hash literal */ }
            const limite = Date.now() + 4000;
            const tentar = () => {
                const secao = document.getElementById(id);
                if (secao) secao.scrollIntoView({ block: "start" });
                else if (Date.now() < limite) timer = setTimeout(tentar, 120);
            };
            tentar();
        };
        irPraAncora();
        window.addEventListener("hashchange", irPraAncora);
        return () => {
            clearTimeout(timer);
            window.removeEventListener("hashchange", irPraAncora);
        };
    }, []);

    if (!montado) return null;

    return (
        <div className="relative h-full w-full">
            <div className={`relative flex h-full flex-col ${styles.conteudo}`}>
                <div className="flex w-full flex-col">
                    <div className={styles.primeiraDobra}>
                        <HeroPage />
                        <TituloConhecimento />
                    </div>
                    <Encryption />
                    <div id="study-rooms" className="w-full">
                        <CyberespacoExplica />
                    </div>
                    <Faq />
                </div>
                <Footer />
            </div>
        </div>
    );
}
