/** #824 · /marketplace — a entrada do menu principal: o laboratório já na vitrine (lib/ui/marketplaceRota). */
import { redirect } from "next/navigation";
import { DESTINO_MARKETPLACE } from "@/lib/ui/marketplaceRota";

export default function Marketplace() {
  redirect(DESTINO_MARKETPLACE);
}
