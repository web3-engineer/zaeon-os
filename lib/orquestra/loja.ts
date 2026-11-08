/**
 * lib/orquestra/loja.ts — o ESTADO de cada agente da orquestra pra um aluno (o que a Loja mostra no cartão).
 * PURO: recebe o plano da conta, o modo da orquestra e o env; o servidor (app/api/orquestra/agentes) só monta.
 */
import { planAtLeast, type Plan } from "@/lib/plans";
import { AGENTES_ORQUESTRA, type AgenteLoja } from "@/lib/orquestra/catalogo";
import type { Motor } from "@/lib/orquestra/contrato";
import type { ModoOrquestra } from "@/lib/orquestra/roteador";

export type EstadoAgente = "liberado" | "exige_plano" | "aguardando_chave" | "pausado";
export type AgenteNaLoja = AgenteLoja & { estado: EstadoAgente; aviso: string | null };

export function estadoNaLoja(plano: Plan, modo: ModoOrquestra, motores: Motor[], env: Record<string, string | undefined>): AgenteNaLoja[] {
  return AGENTES_ORQUESTRA.map((a) => {
    const m = motores.find((x) => x.id === a.motor);
    if (modo !== "on") return { ...a, estado: "pausado", aviso: "A orquestra está pausada no servidor — por enquanto a Aura responde." };
    if (!m || !m.disponivel(env)) return { ...a, estado: "aguardando_chave", aviso: `Em breve: falta ligar a conta da ${a.laboratorio} no servidor.` };
    if (!planAtLeast(plano, a.minPlan)) return { ...a, estado: "exige_plano", aviso: `Disponível no plano ${a.minPlan === "max" ? "Max" : "Pro"}.` };
    return { ...a, estado: "liberado", aviso: null };
  });
}
