"use client";
// PRÉVIA LOCAL (sem login): a tela de ESCOLHER PERSONAGEM (components/lounge/EscolherPersonagem) — o "Entrar no jogo"
// aqui não salva (sem sessão, a API responde 401 e a tela mostra o erro).
import { avisar } from "@/lib/ui/avisos";
import EscolherPersonagem from "@/components/lounge/EscolherPersonagem";

export default function Page() {
  return <EscolherPersonagem inicial={null} aoConcluir={() => avisar("ok")} />;
}
