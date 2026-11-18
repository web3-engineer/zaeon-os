/**
 * lib/estudos/painelDevice.ts — o formato do PAINEL DE DISPOSITIVO (skills família "device").
 *
 * Puro e client-safe (sem node:fs): o compartilham a rota /api/studio/device (que o monta) e o
 * DevicePanelView (que o renderiza). É o download (espelho) + integridade (sha256) + as instruções
 * (o corpo do SKILL.md) da skill que o aluno roda na máquina DELE.
 */
export type PainelDevice = {
  slug: string;
  titulo: string;
  subtitulo: string;
  device: { plataforma: string; mirror: string; sha256: string | null };
  /** o markdown de instruções (corpo do SKILL.md) — a sala mostra como passos. */
  corpo: string;
};

/**
 * Quebra o corpo do SKILL.md em passos pelos títulos `## ` (cada seção vira um card). O `# Título` do
 * topo é removido (o painel já mostra o título da skill); a prosa antes do primeiro `##` vira um card
 * de introdução sem título (costuma trazer o comando de instalação). PURA.
 */
export function passosDoCorpo(corpo: string): { titulo: string; markdown: string }[] {
  const txt = (corpo || "").replace(/\r\n/g, "\n").trim().replace(/^#\s+.+\n+/, "").trim();
  if (!txt) return [];
  const partes = txt.split(/\n(?=##\s+)/g).map((p) => p.trim()).filter(Boolean);
  return partes.map((bloco) => {
    const m = /^##\s+(.+)$/m.exec(bloco);
    const titulo = m ? m[1].trim() : "";
    const markdown = m ? bloco.replace(/^##\s+.+\n?/, "").trim() : bloco;
    return { titulo, markdown };
  });
}
