import { cadernoEstudo } from "@/lib/estudos/cadernosEstudo";

export function GET(_request: Request, { params }: { params: { id: string } }) {
  const caderno = cadernoEstudo(params.id);
  return caderno ? Response.json(caderno) : Response.json({ erro: "Caderno não encontrado" }, { status: 404 });
}
