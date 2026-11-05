/**
 * app/agente/page.tsx — a tela do agente de navegador (F8). Fechada duas vezes:
 *
 *  - `agenticEnabled()`: com a flag OFF a página NÃO EXISTE (404);
 *  - `assertAdmin()`: quem não é fundador/super_admin também recebe 404, não 403.
 *
 * 404 em vez de 403 de propósito: um 403 confirmaria que a rota existe pra quem não deveria saber.
 * A rota de API (`/api/agentic/run`) repete os dois portões — a tela não é a tranca, só a porta.
 */
import { notFound } from "next/navigation";
import { assertAdmin } from "@/lib/admin/assertAdmin";
import { agenticEnabled } from "@/lib/agent/agentic";
import CockpitAgente from "@/components/agente/CockpitAgente";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!agenticEnabled()) notFound();
  const adm = await assertAdmin();
  if (!adm.ok) notFound();
  return (
    <main className="min-h-screen bg-zinc-950">
      <CockpitAgente />
    </main>
  );
}
