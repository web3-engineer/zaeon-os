"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import NomeUsuarioForm from "@/components/lounge/NomeUsuarioForm";

const CosmicLounge = dynamic(() => import("@/components/cyber/CosmicLounge"), { ssr: false, loading: () => <div className="h-full w-full bg-[#03030a]" /> });

/**
 * Cyberespaço (Lounge Cósmico) — a "Zaeon" como espaço RPG (componente three.js `CosmicLounge`; protótipo em docs/prototypes).
 * Hub central: estar aqui é o caminho para o laboratório (Sala de Estudos / research-lab).
 * Rota imersiva: o Navbar global some aqui (lib/ui/loungeHub.ehRotaImersiva).
 * Só é revelado a quem está logado e já escolheu o nome de usuário (passo único); deslogado volta pra landing.
 */
type Fase = "checando" | "nome" | "pronto";

export default function LoungeCosmicoPage() {
  const router = useRouter();
  const { status } = useSession();
  const [fase, setFase] = useState<Fase>("checando");
  const [nomeAtual, setNomeAtual] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/"); return; }
    if (status !== "authenticated") return;
    let vivo = true;
    fetch("/api/user/nome")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vivo) return;
        // Falha de rede/API não prende a pessoa fora: só pede o nome se o servidor disser que falta.
        if (d && d.done === false) { setNomeAtual(d.name || ""); setFase("nome"); }
        else setFase("pronto");
      })
      .catch(() => { if (vivo) setFase("pronto"); });
    return () => { vivo = false; };
  }, [status, router]);

  if (fase === "nome") return <NomeUsuarioForm inicial={nomeAtual} aoConcluir={() => setFase("pronto")} />;
  if (fase !== "pronto") return <div className="fixed inset-0 z-[200] bg-[#03030a]" />;
  return (
    <div className="fixed inset-0 z-[200] bg-[#03030a]">
      <CosmicLounge modo="tela" />
    </div>
  );
}
