#!/usr/bin/env node
/**
 * Gera os CLIPES DE CURINGA da voz (frases-isca que tocam na hora enquanto a fala real
 * sintetiza). Roda UMA vez, com as credenciais Vertex no ambiente. Salva os .wav em
 * public/agents/voice-fillers/ e escreve o manifest.json que o app lê em runtime.
 *
 * Uso (na máquina/VPS com as GOOGLE_* setadas):
 *   node --env-file=.env scripts/generate-voice-fillers.mjs        (Node 20+)
 *   # ou exporte GOOGLE_CREDENTIALS / GOOGLE_PROJECT_ID / GOOGLE_CLIENT_EMAIL /
 *   #   GOOGLE_PRIVATE_KEY / GOOGLE_LOCATION e rode: node scripts/generate-voice-fillers.mjs
 *
 * Modelo via GEMINI_TTS_MODEL (default gemini-2.5-flash-tts). Se der timeout/erro aqui,
 * é o mesmo problema do cold-start em produção — mas offline dá pra esperar.
 */
import { writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { GoogleAuth } from "google-auth-library";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Frases criativas/engraçadas — a Aura "ganhando tempo" com humor e calor (pt-BR).
const PHRASES = [
  "Peraí, peraí… deixa eu ler isso com o carinho que merece, já tô voltando.",
  "Calma que coisa boa não se faz na correria — tô quase, juro.",
  "Hmm, deixa eu juntar as peças aqui na minha cabeça, segura essa.",
  "Tô mergulhando de cabeça nesse texto, me dá só um segundinho.",
  "Opa, deixa eu organizar a bagunça das ideias aqui rapidinho.",
  "Já tô vendo umas coisas interessantes — peraí que eu te conto direito.",
  "Respira comigo… tô formatando uma resposta caprichada pra você.",
  "Tô garimpando o ouro que tem nesse documento, segura aí.",
  "Quase lá! Só não quero falar bobagem, então deixa eu conferir.",
  "Deixa eu dar aquela espiada final antes de te entregar isso, tá?",
  "Tô processando tudo aqui nos bastidores — já já a mágica acontece.",
  "Pera que eu tô caprichando — você merece uma resposta certinha.",
  "Segura a emoção que a melhor parte tá vindo, tô finalizando.",
  "Deixa eu pensar nisso com a atenção que o assunto pede, volto já.",
];

// Vozes variadas (catálogo de lib/voice/gemini-tts.ts) — alternadas pra dar variedade.
const VOICES = ["Kore", "Aoede", "Leda", "Callirrhoe", "Charon"];

const stripQuotes = (s) => (s || "").replace(/^["']|["']$/g, "");
function vertexCredentials() {
  const raw = process.env.GOOGLE_CREDENTIALS || "";
  let creds = {};
  if (raw) {
    try { creds = JSON.parse(raw); }
    catch { try { creds = JSON.parse(raw.replace(/\n/g, "\\n")); } catch { creds = {}; } }
  }
  const project = creds.project_id || stripQuotes(process.env.GOOGLE_PROJECT_ID);
  const client_email = creds.client_email || stripQuotes(process.env.GOOGLE_CLIENT_EMAIL);
  let private_key = creds.private_key || stripQuotes(process.env.GOOGLE_PRIVATE_KEY) || "";
  if (private_key.includes("\\n")) private_key = private_key.replace(/\\n/g, "\n");
  const location = stripQuotes(process.env.GOOGLE_LOCATION) || "us-central1";
  return { project, client_email, private_key, location };
}

function parsePcmRate(mime) {
  const m = /rate=(\d+)/i.exec(mime || "");
  return m ? parseInt(m[1], 10) : 24000;
}
function pcmToWav(pcmBase64, sampleRate) {
  const pcm = Buffer.from(pcmBase64, "base64");
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * 1 * 16) / 8;
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function main() {
  const { project, client_email, private_key, location } = vertexCredentials();
  if (!project || !client_email || !private_key) {
    console.error("Faltam credenciais Vertex (GOOGLE_CREDENTIALS ou GOOGLE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY).");
    process.exit(1);
  }
  const model = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-tts";
  const auth = new GoogleAuth({
    credentials: { client_email, private_key },
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const token = await auth.getAccessToken();
  const url =
    `https://${location}-aiplatform.googleapis.com/v1/projects/${project}` +
    `/locations/${location}/publishers/google/models/${model}:generateContent`;

  const outDir = path.resolve("public/agents/voice-fillers");
  await mkdir(outDir, { recursive: true });

  // 1 chamada com retry no 429 (quota por minuto). Espera e tenta de novo até 3x.
  async function callTTS(text, voiceName) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
          },
        }),
        signal: AbortSignal.timeout(90_000),
      });
      if (res.status === 429) {
        process.stdout.write("(429, esperando 35s) ");
        await sleep(35_000);
        continue;
      }
      return res;
    }
    return null;
  }

  for (let i = 0; i < PHRASES.length; i++) {
    const voiceName = VOICES[i % VOICES.length];
    const n = String(i + 1).padStart(2, "0");
    const outPath = path.join(outDir, `filler-${n}.wav`);
    // IDEMPOTENTE: já existe e tem tamanho → pula (não re-bilha o que já saiu).
    if (existsSync(outPath) && statSync(outPath).size > 2000) {
      console.log(`[${n}/${PHRASES.length}] já existe — pulando`);
      continue;
    }
    process.stdout.write(`[${n}/${PHRASES.length}] ${voiceName} — "${PHRASES[i].slice(0, 40)}…" `);
    try {
      const res = await callTTS(PHRASES[i], voiceName);
      if (!res) { console.log("desistiu (429 repetido)"); continue; }
      if (!res.ok) { console.log("FALHOU", res.status, (await res.text()).slice(0, 160)); continue; }
      const data = await res.json();
      const inline = data?.candidates?.[0]?.content?.parts?.find((p) => p?.inlineData?.data)?.inlineData;
      if (!inline?.data) { console.log("sem áudio"); continue; }
      const mime = inline.mimeType || "audio/L16;rate=24000";
      const wav = /wav|mpeg|mp3|ogg/i.test(mime) ? Buffer.from(inline.data, "base64") : pcmToWav(inline.data, parsePcmRate(mime));
      await writeFile(outPath, wav);
      console.log("ok", `(${(wav.length / 1024).toFixed(0)}kb)`);
    } catch (e) {
      console.log("ERRO", e?.message || e);
    }
    await sleep(6_000); // throttle: respeita a quota por minuto
  }

  // manifest a partir do que EXISTE no disco (acumula entre rodadas).
  const files = (await readdir(outDir)).filter((f) => /^filler-\d+\.wav$/.test(f)).sort();
  const manifest = files.map((f) => `/agents/voice-fillers/${f}`);
  await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`\n✓ ${manifest.length}/${PHRASES.length} curingas no disco. manifest.json atualizado.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
