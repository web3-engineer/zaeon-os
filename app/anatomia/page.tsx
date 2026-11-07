/**
 * /anatomia — o Atlas do Corpo em 3D.
 *
 * A tela do departamento Anatomia (lib/office/mapa), e a outra metade da habilidade que o mentor
 * de medicina (Osler) já tem no chat: lá ele BUSCA e DESCREVE estruturas pelo manifesto; aqui o
 * aluno VÊ as 2.234 malhas, liga e desliga os 15 sistemas, separa o corpo peça por peça e isola
 * uma estrutura. Mesmo dado, mesmas fontes, duas formas de chegar nele.
 *
 * SEM GUARDA DE PLANO NEM DE CURSO, de propósito e isto é decisão: o dado é CC BY 4.0 e a
 * capacidade é educacional. Pôr o corpo humano atrás de um plano seria cobrar por algo que a
 * licença manda deixar passar adiante — e o mentor que o descreve já está em `minPlan: "free"`.
 *
 * A página é um servidor-componente magro de propósito: a cena é WebGL e tem de ser `ssr: false`,
 * o que `AtlasDoCorpo` resolve com `dynamic`. O que fica aqui é só o título da aba.
 *
 * ⚠️ EDUCACIONAL — referência de adulto masculino, parcial, não é ferramenta clínica. Ver os
 * cabeçalhos de lib/anatomia/atlas.ts e public/models/ATTRIBUTION.md.
 */
import type { Metadata } from "next";
import AtlasDoCorpo from "@/components/anatomia/AtlasDoCorpo";

export const metadata: Metadata = {
  title: "Atlas do Corpo · Zaeon",
  description:
    "Atlas de anatomia 3D com 2.234 malhas e 3.432 estruturas nomeadas do BodyParts3D (CC BY 4.0). " +
    "Material educacional — não é ferramenta diagnóstica nem cirúrgica.",
};

export default function PaginaDaAnatomia() {
  return <AtlasDoCorpo />;
}
