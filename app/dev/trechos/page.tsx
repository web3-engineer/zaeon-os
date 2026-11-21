/**
 * /dev/trechos — vitrine das FOLHAS DE PAPEL (lib/trechos + components/trechos): uma resposta da Aura com trechos do
 * material ancorados no texto e um solto no fim, com a animação de escrita. Só fora de produção: em produção, 404.
 */
import { notFound } from "next/navigation";
import VitrineTrechos from "./VitrineTrechos";

export const dynamic = "force-dynamic";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="min-h-screen bg-white px-4 py-10 dark:bg-[#0b1020]">
      <VitrineTrechos />
    </main>
  );
}
