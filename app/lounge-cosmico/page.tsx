"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import NomeUsuarioForm from "@/components/lounge/NomeUsuarioForm";
import EscolherPersonagem from "@/components/lounge/EscolherPersonagem";
import type { Personagem } from "@/lib/cyber/personagem";

const CosmicLounge = dynamic(() => import("@/components/cyber/CosmicLounge"), { ssr: false, loading: () => <div className="h-full w-full bg-[#03030a]" /> });

/**
 * Cyberespaço (Lounge Cósmico) — a "Zaeon" como espaço RPG (componente three.js `CosmicLounge`; protótipo em docs/prototypes).
 * Hub central: estar aqui é o caminho para o laboratório (Sala de Estudos / research-lab).
 * Rota imersiva: o Navbar global some aqui (lib/ui/loungeHub.ehRotaImersiva).
 * Só é revelado a quem está logado e já escolheu o nome de usuário e o PERSONAGEM (gênero + cor — lib/cyber/personagem);
 * deslogado volta pra landing.
 */
type Fase = "checando" | "nome" | "personagem" | "pronto";

export default function LoungeCosmicoPage() {
  const router = useRouter();
  const { status } = useSession();
  const [fase, setFase] = useState<Fase>("checando");
  const [nomeAtual, setNomeAtual] = useState("");
  const [personagem, setPersonagem] = useState<Personagem | null>(null);
  /** depois do nome: já escolheu o personagem? (falha de rede não prende a pessoa fora) */
  const aposNome = () => {
    fetch("/api/user/personagem")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && !d.personagem) setFase("personagem"); else { setPersonagem(d?.personagem ?? null); setFase("pronto"); } })
      .catch(() => setFase("pronto"));
  };

  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/"); return; }
    if (status !== "authenticated") return;
    // A nave particular usa o perfil atual ou o avatar padrão. A configuração
    // de personagem fica na entrada do mundo compartilhado.
    if (new URLSearchParams(window.location.search).get("mundo") !== "1") {
      setFase("pronto");
      return;
    }
    let vivo = true;
    fetch("/api/user/nome")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vivo) return;
        // Falha de rede/API não prende a pessoa fora: só pede o nome se o servidor disser que falta.
        if (d && d.done === false) { setNomeAtual(d.name || ""); setFase("nome"); }
        else aposNome();
      })
      .catch(() => { if (vivo) setFase("pronto"); });
    return () => { vivo = false; };
  }, [status, router]);

  if (fase === "nome") return <NomeUsuarioForm inicial={nomeAtual} aoConcluir={aposNome} />;
  if (fase === "personagem") return <EscolherPersonagem inicial={personagem} aoConcluir={() => setFase("pronto")} />;
  if (fase !== "pronto") return <div className="fixed inset-0 z-[200] bg-[#03030a]" />;
  return (
    <div className="fixed inset-0 z-[200] bg-[#03030a]">
      <CosmicLounge modo="tela" />
    </div>
  );
}
