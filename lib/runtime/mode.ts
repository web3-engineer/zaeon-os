// Modo de runtime — a chave da arquitetura dual (Vercel limitado ↔ Container potente).
// Tudo que tem "versão leve" (voz, RAG, WhatsApp) lê as capabilities daqui.
// Trocar de modo = uma env (NEXT_PUBLIC_RUNTIME_MODE), sem mexer na UI.

export type RuntimeMode = "vercel" | "container";

export function runtimeMode(): RuntimeMode {
    const m = (process.env.NEXT_PUBLIC_RUNTIME_MODE || "vercel").toLowerCase();
    return m === "container" ? "container" : "vercel";
}

export interface Capabilities {
    /** "browser" = TTS grátis no navegador (Vercel); "server" = TTS HQ via API (container). */
    voiceTts: "browser" | "server";
    /** assistente no WhatsApp — só no modo container. */
    whatsapp: boolean;
    /** RAG pesado (pgvector/embeddings) — só no modo container; no Vercel, RAG leve. */
    heavyRag: boolean;
}

export function capabilities(mode: RuntimeMode = runtimeMode()): Capabilities {
    if (mode === "container") {
        return { voiceTts: "server", whatsapp: true, heavyRag: true };
    }
    // Vercel — limitado, mas 100% funcional e grátis
    return { voiceTts: "browser", whatsapp: false, heavyRag: false };
}
