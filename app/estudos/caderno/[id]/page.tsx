import { notFound } from "next/navigation";
import CadernoEstudoView from "@/components/estudos/CadernoEstudoView";
import { cadernoEstudo } from "@/lib/estudos/cadernosEstudo";

export default function CadernoPage({ params }: { params: { id: string } }) {
  const caderno = cadernoEstudo(params.id);
  if (!caderno) notFound();
  return <CadernoEstudoView caderno={caderno} />;
}
