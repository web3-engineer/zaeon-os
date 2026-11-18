/**
 * lib/octa/noPii.ts — a TRAVA DE SEGREDO do Octa: o CÓDIGO pode sair, a CREDENCIAL não.
 *
 * Decisão do dono (portão 4 do handoff HF-GPU): o Octa é uso interno, então mandar código do
 * projeto pra um provedor externo (Hugging Face Inference Providers) é permitido — MENOS `.env`,
 * chaves, tokens, credenciais e arquivos de segredo. Esta trava existe ANTES de o primeiro byte
 * sair: é pré-requisito do PR que liga o HF, não um ajuste posterior.
 *
 * Duas camadas, de propósito:
 *   1. POR CAMINHO (`ehCaminhoSensivel`) — nas tools que expõem arquivo (`octa_ler`/`octa_buscar`/
 *      `octa_listar`). Precisa porque ali o path é conhecido. Vale pra TODO provedor (inclusive
 *      Google e Contabo): `.env` no prompt de um LLM é ruim em qualquer destino. Kill-switch:
 *      OCTA_NO_PII=0.
 *   2. POR CONTEÚDO (`redigirSegredos`/`semSegredos`) — rede de segurança pra segredo CHUMBADO
 *      num arquivo legítimo (`const KEY = "sk-..."` dentro de `config.ts`, que a camada 1 libera).
 *      Aplicada só quando o destino é provedor TERCEIRO (`ehProvedorTerceiro`) — o Google já é o
 *      provedor estabelecido do app e recebe o código hoje; quem muda o risco é o HF.
 *
 * Nada aqui é heurística "esperta": é lista explícita e revisável. Falso positivo custa um
 * arquivo omitido (o agente vê o motivo e segue); falso negativo custa um segredo vazado.
 * Por isso a lista erra pro lado de bloquear.
 *
 * Módulo PURO (sem env no corpo das funções, sem rede) → testável em noPii.test.ts.
 */
import type { MsgModelo } from "@/lib/octa/agente";

type Env = Record<string, string | undefined>;
const DESLIGADO = /^(0|off|false|nao|não|no)$/i;

/** A camada 1 está ligada? (default sim; OCTA_NO_PII=0 desliga sem deploy — recriar o web.) */
export function noPiiLigado(env: Env = process.env): boolean {
  const f = env.OCTA_NO_PII?.trim();
  return !(f && DESLIGADO.test(f));
}

/** O que o agente vê no lugar do arquivo protegido. */
export const CONTEUDO_PROTEGIDO =
  "«arquivo protegido: credenciais não saem do servidor. Trabalhe pelo .env.example/nomes das variáveis.»";
/** O que entra no lugar de um segredo encontrado DENTRO de um arquivo liberado. */
export const SEGREDO_OMITIDO = "«segredo omitido»";

// ───────────────────────────── camada 1 · por caminho ─────────────────────────────

/** Templates de env: são DOCUMENTAÇÃO (nomes das variáveis, sem valor) → podem sair. */
const ENV_TEMPLATE = /\.env\.(example|sample|template|dist|defaults?)$/i;

/** Nomes de arquivo inteiros que são credencial por definição. */
const ARQUIVOS_SENSIVEIS = new Set([
  ".netrc", "_netrc", ".npmrc", ".pypirc", ".pgpass", ".htpasswd", ".git-credentials",
  "credentials", "credentials.json", "kubeconfig", ".dockercfg",
  "id_rsa", "id_dsa", "id_ecdsa", "id_ed25519", "id_ed25519_sk", "id_ecdsa_sk",
]);

/** Extensões de chave/segredo em repouso. */
const EXT_SENSIVEIS = /\.(pem|key|p8|p12|pfx|jks|keystore|truststore|asc|gpg|pgp|ppk|kubeconfig|tfstate|tfstate\.backup)$/i;

/** Padrões por caminho/nome (testados contra o path inteiro, em minúsculas e com "/"). */
const PADROES_SENSIVEIS: RegExp[] = [
  /(^|\/)\.env$/,                       // .env
  /(^|\/)\.env\.[^/]+$/,                // .env.local, .env.production, .env.secrets…
  /(^|\/)\.ssh\//,                      // qualquer coisa dentro de .ssh/
  /(^|\/)\.aws\/(credentials|config)$/,
  /(^|\/)\.docker\/config\.json$/,
  /(^|\/)\.gem\/credentials$/,
  /(^|\/)\.?secrets?\//,                // secrets/ e .secrets/
  /(^|\/)service[-_]?account[^/]*\.json$/,
  /(^|\/)[^/]*service[-_]?account[^/]*\.json$/,
  /(^|\/)client[-_]?secret[^/]*\.json$/,
  /(^|\/)gha-creds-[^/]*\.json$/,
  /(^|\/)[^/]*\.tfvars$/,               // variáveis do terraform (valores reais)
];

/**
 * Este caminho carrega credencial? Deny-by-default para o conjunto acima; `.env.example` e
 * amigos ficam LIBERADOS de propósito (o agente precisa dos NOMES das variáveis pra escrever
 * código que as usa — é o caminho certo pra ele trabalhar sem ver valor nenhum).
 */
export function ehCaminhoSensivel(path: string): boolean {
  const p = String(path ?? "").trim().replace(/\\/g, "/").toLowerCase();
  if (!p) return false;
  const base = p.split("/").pop() ?? "";
  if (ENV_TEMPLATE.test(base)) return false;          // template é doc, não segredo
  if (base.endsWith(".tfvars.example")) return false;
  if (ARQUIVOS_SENSIVEIS.has(base)) return true;
  if (EXT_SENSIVEIS.test(base)) return true;
  return PADROES_SENSIVEIS.some((re) => re.test(p));
}

/** Separa o workspace em "pode sair" e "protegido" (o chamador decide o que fazer com cada um). */
export function partirWorkspace<T>(ws: Record<string, T>): { liberado: Record<string, T>; protegido: string[] } {
  const liberado: Record<string, T> = {};
  const protegido: string[] = [];
  for (const [p, c] of Object.entries(ws)) {
    if (ehCaminhoSensivel(p)) protegido.push(p);
    else liberado[p] = c;
  }
  return { liberado, protegido };
}

// ───────────────────────────── camada 2 · por conteúdo ─────────────────────────────

/**
 * Formatos de segredo que a gente reconhece de cara. Ordem importa: o bloco PEM primeiro
 * (engole várias linhas), depois as formas conhecidas, e por último a atribuição genérica.
 * O marcador não tem `"` nem `\` → trocar dentro de um JSON (tool_calls.arguments) não quebra o JSON.
 */
const SEGREDOS: RegExp[] = [
  // chave privada / certificado em PEM (o miolo inteiro)
  /-----BEGIN[A-Z ]*PRIVATE KEY-----[\s\S]*?-----END[A-Z ]*PRIVATE KEY-----/g,
  /-----BEGIN OPENSSH PRIVATE KEY-----[\s\S]*?-----END OPENSSH PRIVATE KEY-----/g,
  // tokens de formato conhecido
  /\bsk-[A-Za-z0-9_-]{16,}/g,                       // OpenAI-like
  /\bsk_(?:live|test)_[A-Za-z0-9]{16,}/g,           // Stripe
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,                  // GitHub classic
  /\bgithub_pat_[A-Za-z0-9_]{20,}/g,                // GitHub fine-grained
  /\bhf_[A-Za-z0-9]{20,}/g,                         // Hugging Face
  /\bAKIA[0-9A-Z]{12,}/g,                           // AWS access key id
  /\bAIza[0-9A-Za-z_-]{30,}/g,                      // Google API key
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/g,                // Slack
  /\bey[JI][A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, // JWT
  /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@]+:[^\s:/@]+@/gi, // credencial embutida em URL (mongodb+srv://u:p@…)
];

/** Nome que denuncia segredo (usado nas duas regras de atribuição abaixo). */
const NOME_DENUNCIANTE = String.raw`[A-Za-z0-9_.-]*(?:secret|token|password|passwd|senha|api[_-]?key|access[_-]?key|private[_-]?key|credential|client[_-]?secret)[A-Za-z0-9_.-]*`;

/**
 * Atribuição com valor ENTRE ASPAS: `API_KEY="…"`, `"token": '…'`. As aspas são o sinal de que
 * é um literal, não uma expressão — por isso aqui o valor pode ser qualquer coisa.
 */
// O `["']?` depois do nome cobre a chave JSON/YAML citada: `"client_secret": "…"`.
const ATRIB_COM_ASPAS = new RegExp(String.raw`\b(${NOME_DENUNCIANTE})\b(["']?[ \t]*[:=][ \t]*)(["'])([^"'\n]{8,})\3`, "gi");

/**
 * Atribuição com valor SEM aspas (`API_KEY=abc123…`, estilo .env). Aqui o risco de estragar CÓDIGO
 * é real — `const tokens = texto.split(' ')` casaria numa regra frouxa e viraria lixo. Então o valor
 * é restrito a cara-de-segredo: charset sem ponto/parêntese/aspas, ≥10 chars e com ao menos um
 * DÍGITO. Isso deixa passar `let apiKeyName = computeName()` (sem dígito, tem parêntese) e pega
 * `password = supersecreta1`. Trade-off consciente: segredo curto sem aspas escapa da camada 2 —
 * quem protege esse caso é a camada 1 (o arquivo `.env` nunca é lido).
 */
const ATRIB_SEM_ASPAS = new RegExp(String.raw`\b(${NOME_DENUNCIANTE})\b(["']?[ \t]*[:=][ \t]*)([A-Za-z0-9_\-+/=]{10,})(?![\w.-])`, "gi");
const TEM_DIGITO = /\d/;

/** Valores que NÃO são segredo mesmo casando o padrão (placeholder de template/doc). */
const PLACEHOLDER = /^(?:""|''|<[^>]*>|\{\{.*\}\}|\$\{.*\}|x{3,}|\*{3,}|\.{3,}|troque-\S*|your[_-]?\S*|change[_-]?me\S*|placeholder\S*|example\S*|sua?[_-]\S*|cole[_-]?\S*|gerar-com:.*)$/i;

const manter = (valor: string) => valor === SEGREDO_OMITIDO || PLACEHOLDER.test(valor);

/**
 * Troca segredos de um texto pelo marcador. NÃO tenta adivinhar entropia: só formatos conhecidos
 * e atribuições com nome denunciante, pulando placeholders de template. Idempotente.
 */
export function redigirSegredos(texto: string): string {
  let s = String(texto ?? "");
  if (!s) return s;
  for (const re of SEGREDOS) s = s.replace(re, SEGREDO_OMITIDO);
  s = s.replace(ATRIB_COM_ASPAS, (todo, nome, sep, q, valor) =>
    manter(valor) ? todo : `${nome}${sep}${q}${SEGREDO_OMITIDO}${q}`);
  s = s.replace(ATRIB_SEM_ASPAS, (todo, nome, sep, valor) =>
    manter(valor) || !TEM_DIGITO.test(valor) ? todo : `${nome}${sep}${SEGREDO_OMITIDO}`);
  return s;
}

/**
 * Redige dentro de uma estrutura JSON já parseada (chaves preservadas, só os valores-texto mudam).
 * Existe porque regex em JSON ESCAPADO não funciona: num `arguments` serializado o valor aparece
 * como `API_KEY=\"abc\"`, e a aspas escapada quebra o casamento. Parsear → redigir → serializar
 * é robusto e devolve JSON válido por construção.
 */
export function redigirJson(valor: unknown): unknown {
  if (typeof valor === "string") return redigirSegredos(valor);
  if (Array.isArray(valor)) return valor.map(redigirJson);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(Object.entries(valor as Record<string, unknown>).map(([k, v]) => [k, redigirJson(v)]));
  }
  return valor;
}

/** Redige um texto que DEVERIA ser JSON; se não parsear, cai na redação de texto puro. */
export function redigirTextoJson(bruto: string): string {
  try {
    return JSON.stringify(redigirJson(JSON.parse(String(bruto ?? ""))));
  } catch {
    return redigirSegredos(bruto);
  }
}

/** Achou algum segredo reconhecível? (pro log/telemetria, sem gravar o valor.) */
export const temSegredo = (texto: string): boolean => redigirSegredos(texto) !== String(texto ?? "");

// ───────────────────────────── destino ─────────────────────────────

/**
 * O modelo pedido é de PROVEDOR TERCEIRO (Hugging Face Inference Providers)? Nomes do gateway
 * (`hf-heavy`/`hf-fast`, grupos do litellm.config) e o formato direto do router (`modelo:provedor`,
 * ex.: `openai/gpt-oss-120b:cerebras`). Lista extra via OCTA_MODELOS_TERCEIROS (vírgula).
 * Vertex/Contabo NÃO entram: o Google é o provedor estabelecido do app e a Contabo é nossa.
 */
const PROVEDORES_HF = /:(cerebras|groq|together|fireworks|deepinfra|novita|nebius|sambanova|hyperbolic|replicate|cohere|featherless|nscale)$/i;
/** Grupos premium (lib/octa/modelosPremium): Anthropic/OpenAI são provedores externos — código do
 *  aluno sai redigido pra eles, igual ao HF. Nomes espelham MODELOS_PREMIUM[].grupo. */
const GRUPOS_PREMIUM = /^zaeon-(claude|codex)$/;
export function ehProvedorTerceiro(modelo: string, env: Env = process.env): boolean {
  const m = String(modelo ?? "").trim().toLowerCase();
  if (!m) return false;
  if (/^hf[-_]/.test(m)) return true;
  if (GRUPOS_PREMIUM.test(m)) return true;
  if (PROVEDORES_HF.test(m)) return true;
  const extra = (env.OCTA_MODELOS_TERCEIROS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return extra.includes(m);
}

/**
 * Camada 2 aplicada às mensagens de UM passo, no mesmo formato de `semImagens`: devolve uma cópia
 * com os segredos redigidos. Chamada só quando o destino é provedor terceiro. Preserva a forma das
 * mensagens (inclusive `tool_calls`, cujo `arguments` continua JSON válido — o marcador não tem `"`).
 */
export function semSegredos(msgs: readonly MsgModelo[]): MsgModelo[] {
  return msgs.map((m): MsgModelo => {
    if (m.role === "system") return { role: "system", content: redigirSegredos(m.content) };
    if (m.role === "tool") return { ...m, content: redigirSegredos(m.content) };
    if (m.role === "user") {
      return Array.isArray(m.content)
        ? { role: "user", content: m.content.map((p) => (p.type === "text" ? { ...p, text: redigirSegredos(p.text) } : p)) }
        : { role: "user", content: redigirSegredos(m.content) };
    }
    // assistant: content + os argumentos das tool_calls que ele já fez
    return {
      ...m,
      content: m.content === null ? null : redigirSegredos(m.content),
      ...(m.tool_calls
        ? { tool_calls: m.tool_calls.map((t) => ({ ...t, function: { ...t.function, arguments: redigirTextoJson(t.function.arguments) } })) }
        : {}),
    };
  });
}
