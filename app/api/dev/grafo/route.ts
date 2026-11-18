/**
 * /api/dev/grafo — DEV ONLY (flag FORJA_LOCAL_ENGINE=1). Roda o graphify LOCAL sobre um repo e devolve o
 * grafo REAL. Sem auth de propósito: é a superfície de teste em dev desta sessão (sem DB/login). Em prod,
 * sem a flag, responde 404. Não é a rota do fluxo real (essa é /api/studio/forja/mapa, com auth).
 */
import { NextResponse } from "next/server";
import { engineLocalLigado, grafoLocalDoRepo } from "@/lib/forja/graphifyLocal";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!engineLocalLigado()) return NextResponse.json({ error: "motor local desligado (defina FORJA_LOCAL_ENGINE=1)" }, { status: 404 });
  const repo = new URL(req.url).searchParams.get("repo") || "";
  const grafo = await grafoLocalDoRepo(repo);
  return NextResponse.json({ repo, grafo, nos: grafo?.nos.length ?? 0, arestas: grafo?.arestas.length ?? 0 });
}
