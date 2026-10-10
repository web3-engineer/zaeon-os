"use client";
// PRÉVIA LOCAL SEM LOGIN (não commitar). Mostra a estrutura do cyberespaço com dados simulados.
import Link from "next/link";
export default function Indice() {
  const item = "block rounded-xl border border-cyan-400/30 bg-white/5 px-4 py-3 hover:bg-white/10";
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "#03030a", color: "#e7ecff", padding: 32, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Cyberespaço — prévia local (sem login)</h1>
      <p style={{ opacity: 0.7, marginBottom: 20, fontSize: 14 }}>Dados simulados. Nada aqui fala com o servidor.</p>
      <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
        <Link className={item} href="/zz-cyber/janela"><b>1. Janela da landing</b><br /><span style={{ opacity: 0.7, fontSize: 13 }}>Só a vista + botão Conectar (como o logado vê na página inicial)</span></Link>
        <Link className={item} href="/zz-cyber/tela"><b>2. Cyberespaço em tela cheia, com 2 colegas simulados</b><br /><span style={{ opacity: 0.7, fontSize: 13 }}>Bases privadas, armaduras, chat, monitor, sentar, Estudar</span></Link>
      </div>
    </div>
  );
}
