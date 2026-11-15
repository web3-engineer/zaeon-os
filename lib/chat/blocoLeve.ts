/**
 * lib/chat/blocoLeve.ts — o que de um artefato da conversa vai para a CÓPIA DO NAVEGADOR (localStorage). PURO.
 *
 * Os kinds daqui moram no servidor: a cópia guarda só o número (`artifactId`), sem o `data`/`dataUrl` pesados, e o
 * cartão busca o resto por /api/studio/<id>. Os outros (mapa, podcast, molécula com SDF…) ficam só na sessão.
 *   - diagrama, aula, cad: o conteúdo mora no servidor
 *   - imagem (#749): o arquivo mora no servidor; volta por /api/studio/<id>/file
 *   - anatomia (#816): o estado da cena mora no artefato. Sem ela aqui, o cartão sumia ao recarregar — a tela usa esta
 *     cópia primeiro e só pede ao servidor quando ela está vazia
 */
export const KINDS_LEVES: ReadonlySet<string> = new Set(["diagram", "aula", "cad", "image", "anatomia"]);

type BlocoComNumero = { studioKind: string; artifactId?: string; data?: unknown; dataUrl?: string };

/** o bloco só com o número (fica na cópia do navegador), ou undefined (fica só na sessão) */
export function blocoLeve<T extends BlocoComNumero>(b: T | undefined): T | undefined {
  return b && KINDS_LEVES.has(b.studioKind) && b.artifactId ? { ...b, data: null, dataUrl: undefined } : undefined;
}
