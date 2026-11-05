"use client";

/**
 * components/agente/CockpitAgente.tsx — o cockpit do agente de navegador (F8).
 *
 * Mostra o que o run FEZ e, principalmente, o que ele NÃO fez: `recusadas` traz os passos que o
 * modelo pediu e esta porta não executa (clicar, digitar, pedir humano). Sem essa lista, um plano
 * que pedia login terminaria com "pronto" e o dono não saberia que metade não aconteceu.
 */
import { useState } from "react";

type Evento = { kind: string; label: string; status?: string; detail?: string; action?: { kind?: string; url?: string } };
type Resposta = {
  ok?: boolean;
  stop?: string;
  error?: string;
  erro?: string;
  detalhe?: string;
  motivo?: string;
  faltando?: string[];
  passos?: Evento[];
  leituras?: string[];
  recusadas?: string[];
  allow?: string[];
};

const COR: Record<string, string> = {
  done: "text-emerald-400",
  error: "text-red-400",
  blocked: "text-amber-400",
  waiting: "text-sky-400",
  running: "text-zinc-400",
};

export default function CockpitAgente() {
  const [instrucao, setInstrucao] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [r, setR] = useState<Resposta | null>(null);

  async function rodar() {
    if (!instrucao.trim() || carregando) return;
    setCarregando(true);
    setR(null);
    try {
      const res = await fetch("/api/agentic/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instrucao }),
      });
      setR((await res.json()) as Resposta);
    } catch (e) {
      setR({ erro: "falha_de_rede", detalhe: String((e as Error)?.message ?? e) });
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 text-zinc-200">
      <h1 className="text-xl font-semibold text-zinc-100">Agente de navegador</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Navegador headless no servidor, <strong className="text-zinc-300">somente leitura</strong>: abre e lê páginas
        dos domínios liberados no Leitor. Não clica, não digita, não faz login — e não há como aprovar
        isso daqui, é desenho e não configuração.
      </p>

      <label htmlFor="instrucao" className="mt-6 block text-sm font-medium text-zinc-300">
        O que você quer que ele leia?
      </label>
      <textarea
        id="instrucao"
        value={instrucao}
        onChange={(e) => setInstrucao(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Ex.: abra a página do programa de pós-graduação em X no site da universidade e me diga os prazos de inscrição"
        className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-100 placeholder:text-zinc-500"
      />

      <button
        type="button"
        onClick={rodar}
        disabled={carregando || !instrucao.trim()}
        className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        {carregando ? "Navegando…" : "Rodar"}
      </button>

      {r && (
        <div className="mt-8 space-y-6">
          {(r.erro || r.error) && (
            <section className="rounded-lg border border-red-900/60 bg-red-950/30 p-4">
              <h2 className="text-sm font-semibold text-red-300">Não rodou</h2>
              <p className="mt-1 text-sm text-red-200/80">{r.erro ?? r.error}{r.detalhe ? ` — ${r.detalhe}` : ""}</p>
              {!!r.faltando?.length && (
                <p className="mt-2 text-xs text-red-200/70">
                  Falta configurar: <code>{r.faltando.join(", ")}</code>
                </p>
              )}
            </section>
          )}

          {!!r.recusadas?.length && (
            <section className="rounded-lg border border-amber-900/60 bg-amber-950/20 p-4">
              <h2 className="text-sm font-semibold text-amber-300">O plano pediu o que esta porta não faz</h2>
              <p className="mt-1 text-xs text-amber-200/70">
                Recusado por desenho (somente leitura, sem humano na página):
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {r.recusadas.map((x, i) => (
                  <li key={`${x}-${i}`} className="rounded bg-amber-900/40 px-2 py-0.5 text-xs text-amber-100">{x}</li>
                ))}
              </ul>
            </section>
          )}

          {r.motivo && <p className="text-sm text-zinc-400">{r.motivo}</p>}

          {!!r.passos?.length && (
            <section>
              <h2 className="text-sm font-semibold text-zinc-100">
                Passos <span className="text-zinc-500">({r.stop})</span>
              </h2>
              <ol className="mt-2 space-y-1">
                {r.passos.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className={COR[p.status ?? ""] ?? "text-zinc-400"}>•</span>
                    <span className="text-zinc-300">{p.label}</span>
                    {p.action?.url && <span className="truncate text-xs text-zinc-500">{p.action.url}</span>}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {!!r.leituras?.length && (
            <section>
              <h2 className="text-sm font-semibold text-zinc-100">Leituras</h2>
              {r.leituras.map((t, i) => (
                <pre key={i} className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-300">
                  {t}
                </pre>
              ))}
            </section>
          )}

          {!!r.allow?.length && (
            <p className="text-xs text-zinc-500">
              Domínios liberados: <code>{r.allow.join(", ")}</code>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
