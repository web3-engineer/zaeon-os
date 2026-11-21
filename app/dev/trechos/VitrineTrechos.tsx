"use client";

import { useState } from "react";
import StructuredAnswerView from "@/components/study/StructuredAnswerView";
import { comTrechos } from "@/lib/trechos/bloco";
import type { StructuredAnswer, TrechoEmPapel } from "@/lib/agent/contracts";

/** O que a skill devolve (lib/trechos/achar) — passagens literais, já conferidas no documento. */
const TRECHOS: TrechoEmPapel[] = [
  {
    id: "T1", documentoId: "d1", titulo: "Apostila de Biologia — Unidade 3", paginas: "12", relevancia: 3,
    antes: "…as plantas são autótrofas.", citacao: "A fotossíntese ocorre nos cloroplastos, onde a clorofila absorve principalmente a luz azul e a vermelha.",
    depois: "Essa energia é usada em duas etapas…", motivo: "diz onde a fotossíntese acontece e o papel da clorofila",
  },
  {
    id: "T2", documentoId: "d1", titulo: "Apostila de Biologia — Unidade 3", paginas: "13–14", relevancia: 2,
    antes: "Na etapa fotoquímica,", citacao: "a água é quebrada pela luz (fotólise) e o oxigênio liberado vem dessa quebra, não do CO2.",
    depois: "O ATP e o NADPH seguem para o estroma.", motivo: "explica de onde vem o oxigênio — a pegadinha da prova",
  },
  {
    id: "T3", documentoId: "d2", titulo: "Livro — Fundamentos de Ecologia", paginas: "88", relevancia: 1,
    citacao: "Sem luz suficiente, a planta passa a consumir as reservas de amido acumuladas durante o dia.",
    depois: "Esse é o ponto de compensação luminosa.", motivo: "relaciona fotossíntese e respiração à noite",
  },
];

/** O que o rascunho da Aura escreve, com os marcadores — o servidor tira os marcadores e ancora as folhas. */
const BRUTA: StructuredAnswer = {
  nucleo: "Achei **3 trechos** no seu material sobre fotossíntese. O ponto central está na apostila, na p. 12:\n\n[[T1]]\n\nOu seja: o cloroplasto é a \"fábrica\" e a clorofila é a antena que capta a luz.",
  desenvolvimento: "Um detalhe que costuma cair em prova: **o oxigênio não vem do CO2**. A apostila deixa isso claro na etapa fotoquímica:\n\n[[T2]]\n\nE o livro de Ecologia completa a história do lado da respiração — o que acontece quando a luz falta.",
};

export default function VitrineTrechos() {
  const [vez, setVez] = useState(0);
  const resposta = comTrechos(BRUTA, TRECHOS);
  return (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-white">Trechos em papel — vitrine</h1>
        <button type="button" onClick={() => setVez((v) => v + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:border-white/20 dark:text-white/80 dark:hover:bg-white/10">
          ▶ Repetir animação
        </button>
      </div>
      <p className="mb-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-white/10 dark:text-white/80">
        <b>Pergunta:</b> ache na minha apostila os trechos sobre fotossíntese
      </p>
      <StructuredAnswerView key={vez} answer={resposta} typing />
    </div>
  );
}
