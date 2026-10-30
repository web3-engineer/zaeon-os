"use client";
import { useEffect, useRef, useState } from "react";
import { Microscope, Loader2 } from "lucide-react";
import type { PublicProof } from "@/lib/octa/android/http";
const errors: Record<string, string> = {
  verified_identity_required:
    "Entre novamente pelo Google para habilitar provas de APK.",
  queue_unavailable: "O worker de análise ainda não está disponível.",
  proof_not_configured: "A análise verificável ainda não foi configurada.",
  proof_disabled: "A análise verificável está desligada.",
  body_too_large: "O APK deve ter até 64 MiB.",
  invalid_apk: "Envie um arquivo APK válido.",
  proof_already_running: "Já existe uma análise em andamento.",
};
export default function ReaProofPanel({
  projectId,
}: {
  projectId: string | null;
}) {
  const [proofs, setProofs] = useState<PublicProof[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null),
    currentProject = useRef(projectId);
  currentProject.current = projectId;
  const load = async (id: string) => {
    const r = await fetch(
      `/api/octa/rea/proofs?projectId=${encodeURIComponent(id)}`,
    );
    const data = await r.json();
    if (currentProject.current !== id) return;
    if (r.ok) {
      setProofs(data.proofs ?? []);
      setError("");
    } else
      setError(
        errors[data.error] ?? "Não foi possível abrir as provas deste projeto.",
      );
  };
  useEffect(() => {
    setProofs([]);
    setError("");
    if (!projectId) return;
    let live = true;
    const tick = () => {
      if (live)
        void load(projectId).catch(() => {
          if (live) setError("Sem conexão para atualizar as provas.");
        });
    };
    tick();
    const timer = setInterval(tick, 4000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [projectId]); // project changes fence late responses and polling
  const submit = async (apk: File) => {
    if (!projectId || busy) return;
    const id = projectId;
    setBusy(true);
    setError("");
    try {
      if (apk.size > 64 * 1024 * 1024) throw Error("body_too_large");
      const upload = await fetch(
        `/api/octa/rea/proofs/artifacts?projectId=${encodeURIComponent(id)}`,
        {
          method: "POST",
          headers: { "content-type": "application/octet-stream" },
          body: apk,
        },
      );
      const artifact = await upload.json();
      if (!upload.ok) throw Error(artifact.error);
      const response = await fetch("/api/octa/rea/proofs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: id,
          artifactId: artifact.artifactId,
          objective: "android-marker-v1",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      await load(id);
    } catch (e) {
      if (currentProject.current === id)
        setError(
          errors[(e as Error).message] ?? "Não foi possível iniciar a análise.",
        );
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  };
  const promote = async () => {
    if (!projectId) return;
    const id = projectId;
    const verified = proofs.filter((p) => p.verified);
    const hash = verified[0]?.artifactSha256;
    const ids = verified
      .filter((p) => p.artifactSha256 === hash)
      .map((p) => p.id);
    setBusy(true);
    try {
      const r = await fetch("/api/octa/rea/proofs/memory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: id, proofRunIds: ids }),
      });
      const result = await r.json();
      if (!r.ok) throw Error();
      await load(id);
    } catch {
      setError(
        "A memória exige duas provas íntegras e compatíveis do mesmo APK.",
      );
    } finally {
      setBusy(false);
    }
  };
  const canPromote = proofs.some(
    (p) =>
      p.verified &&
      !p.memory &&
      proofs.filter((q) => q.verified && q.artifactSha256 === p.artifactSha256)
        .length >= 2,
  );
  return (
    <details className="rounded-lg border border-[#363c46] bg-[#2f343e] text-[11.5px] text-[#a9afbc]">
      <summary className="cursor-pointer px-3 py-2 text-[#dce0e5]">
        Provas de APK · REA
      </summary>
      <div className="max-h-80 overflow-y-auto space-y-2 px-3 pb-3">
        <p>
          Objetivo piloto: manifesto, método marker e permissão INTERNET.
          Análise estática com evidências; o APK não é executado.
        </p>
        <input
          ref={file}
          type="file"
          accept=".apk"
          className="hidden"
          aria-label="APK para análise verificável"
          onChange={(e) => {
            if (e.target.files?.[0]) void submit(e.target.files[0]);
          }}
        />
        <button
          type="button"
          disabled={!projectId || busy}
          onClick={() => file.current?.click()}
          className="inline-flex items-center gap-2 rounded-md border border-[#363c46] px-2 py-1.5 text-[#74ade8] hover:bg-white/5 disabled:opacity-40"
        >
          {busy ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Microscope size={13} />
          )}
          Analisar APK piloto
        </button>
        {!projectId && (
          <p>Abra um projeto para vincular o APK às suas provas.</p>
        )}
        {error && (
          <p role="status" className="text-[#dec184]">
            {error}
          </p>
        )}
        {proofs.map((p) => (
          <details
            key={p.id}
            className="rounded-md border border-[#363c46] px-2 py-1.5"
          >
            <summary className="cursor-pointer break-words">
              <span
                className={p.verified ? "text-[#a1c181]" : "text-[#dce0e5]"}
              >
                {p.verified
                  ? "Verificado"
                  : p.state === "observed"
                    ? "Analisado · sem gabarito"
                    : p.state === "queued"
                      ? "Na fila"
                      : p.state === "running"
                        ? "Analisando"
                        : p.state === "failed"
                          ? "Falhou"
                          : p.state === "cancelled"
                            ? "Cancelado"
                            : "Evidência indisponível"}
              </span>
              {p.memory && " · Memória registrada"} · Overmind:{" "}
              {p.overmind === "completed"
                ? "avaliação concluída"
                : p.overmind === "pending"
                  ? "pendente"
                  : "não avaliado"}
            </summary>
            <p className="mt-2 break-all font-mono text-[10px]">
              SHA-256: {p.artifactSha256}
            </p>
            <dl className="my-2 space-y-1">
              {Object.entries(p.facts).map(([k, v]) => (
                <div key={k} className="break-words">
                  <dt className="inline text-[#878a98]">{k}: </dt>
                  <dd className="inline">{String(v)}</dd>
                </div>
              ))}
            </dl>
            <ul className="space-y-1">
              {p.checks.map((c) => (
                <li key={c.id}>
                  {c.pass ? "✓" : "×"} {c.id}
                </li>
              ))}
            </ul>
            {p.evidence.map((e) => (
              <p key={e.id} className="mt-1 break-all font-mono text-[10px]">
                Evidência {e.id} · {e.coverage} · {e.sha256}
              </p>
            ))}
            {p.limitations.map((t) => (
              <p key={t} className="mt-1">
                {t}
              </p>
            ))}
            {["queued", "running"].includes(p.state) && (
              <button
                type="button"
                className="mt-2 text-[#dec184]"
                onClick={() => {
                  void fetch(
                    `/api/octa/rea/proofs/${p.id}?projectId=${encodeURIComponent(projectId ?? "")}`,
                    { method: "DELETE" },
                  ).then(() => {
                    if (projectId) return load(projectId);
                  });
                }}
              >
                Cancelar análise
              </button>
            )}
          </details>
        ))}
        {canPromote && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void promote()}
            className="rounded-md border border-[#363c46] px-2 py-1.5 text-[#a1c181] disabled:opacity-40"
          >
            Registrar procedimento verificado
          </button>
        )}
      </div>
    </details>
  );
}
