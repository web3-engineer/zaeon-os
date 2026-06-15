/**
 * Credenciais Vertex resilientes (ponto único). GOOGLE_CREDENTIALS pode vir como:
 *   - JSON de uma linha (private_key com \n escapado) → parseia normal;
 *   - JSON com QUEBRAS DE LINHA REAIS dentro da private_key (comum em .env) →
 *     o JSON.parse cru falha; aqui escapamos os \n e tentamos de novo;
 *   - ausente → cai nas vars discretas GOOGLE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY.
 *
 * Antes, /api/ai/chat e helpers usavam JSON.parse cru e QUEBRAVAM quando a chave
 * tinha newlines reais — o que derrubava a conexão com o Gemini.
 */
const stripQuotes = (s?: string) => (s || "").replace(/^["']|["']$/g, "");

export function vertexCredentials(): {
  project: string;
  client_email: string;
  private_key: string;
  location: string;
} {
  const raw = process.env.GOOGLE_CREDENTIALS || "";
  let creds: any = {};
  if (raw) {
    try {
      creds = JSON.parse(raw);
    } catch {
      // private_key com newlines reais é a única fonte de \n cru num JSON compacto.
      try { creds = JSON.parse(raw.replace(/\n/g, "\\n")); } catch { creds = {}; }
    }
  }
  const project = creds.project_id || stripQuotes(process.env.GOOGLE_PROJECT_ID);
  const client_email = creds.client_email || stripQuotes(process.env.GOOGLE_CLIENT_EMAIL);
  let private_key = creds.private_key || stripQuotes(process.env.GOOGLE_PRIVATE_KEY) || "";
  if (private_key.includes("\\n")) private_key = private_key.replace(/\\n/g, "\n");
  const location = stripQuotes(process.env.GOOGLE_LOCATION) || "us-central1";
  return { project, client_email, private_key, location };
}
