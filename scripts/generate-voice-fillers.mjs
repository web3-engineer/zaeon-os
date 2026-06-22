#!/usr/bin/env node
/**
 * Gera os CLIPES DE CURINGA da voz, UM CONJUNTO POR VOZ do catálogo. As curingas são
 * frases-isca que tocam na hora enquanto a fala real sintetiza (cold-start ~3-5s). Como
 * cada voz tem o seu conjunto, a curinga sai SEMPRE na mesma voz que o usuário escolheu —
 * sem trocar de voz no meio (mantém a personalidade do agente).
 *
 * Saída: public/agents/voice-fillers/<id-da-voz>/filler-NN.wav  + manifest.json indexado:
 *   { "kore": ["/agents/voice-fillers/kore/filler-01.wav", ...], "aoede": [...], ... }
 *
 * Uso (na máquina/VPS com as GOOGLE_* setadas):
 *   node --env-file=.env scripts/generate-voice-fillers.mjs
 *
 * Idempotente (pula o que já existe), com throttle e retry no 429 (quota por minuto).
 * Modelo via GEMINI_TTS_MODEL (default gemini-2.5-flash-tts).
 */
import { writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { GoogleAuth } from "google-auth-library";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Frases criativas/engraçadas — a Aura "ganhando tempo" com humor e calor (pt-BR).
// MESMO conjunto p/ toda voz, pra cada voz ter a mesma variedade de curingas.
const PHRASES = [
  "Peraí, peraí… deixa eu ler isso com o carinho que merece, já tô voltando.",
  "Calma que coisa boa não se faz na correria — tô quase, juro.",
  "Hmm, deixa eu juntar as peças aqui na minha cabeça, segura essa.",
  "Tô mergulhando de cabeça nesse texto, me dá só um segundinho.",
  "Respira comigo… tô formatando uma resposta caprichada pra você.",
  "Quase lá! Só não quero falar bobagem, então deixa eu conferir.",
  "Tô processando tudo aqui nos bastidores — já já a mágica acontece.",
  "Segura a emoção que a melhor parte tá vindo, tô finalizando.",
];

// Catálogo de vozes (espelha lib/voice/gemini-tts.ts → GEMINI_VOICES). id = chave usada
// pelo app (zaeon.voice.id); gemini = nome prebuilt da voz no Vertex.
const VOICES = [
  { id: "kore", gemini: "Kore" },
  { id: "aoede", gemini: "Aoede" },
  { id: "leda", gemini: "Leda" },
  { id: "callirrhoe", gemini: "Callirrhoe" },
  { id: "charon", gemini: "Charon" },
];

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

  const baseDir = path.resolve("public/agents/voice-fillers");

  // 1 chamada com retry no 429 (quota por minuto). Espera e tenta até 3x.
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
      if (res.status === 429) { process.stdout.write("(429, +35s) "); await sleep(35_000); continue; }
      return res;
    }
    return null;
  }

  for (const voice of VOICES) {
    const dir = path.join(baseDir, voice.id);
    await mkdir(dir, { recursive: true });
    for (let i = 0; i < PHRASES.length; i++) {
      const n = String(i + 1).padStart(2, "0");
      const outPath = path.join(dir, `filler-${n}.wav`);
      if (existsSync(outPath) && statSync(outPath).size > 2000) {
        console.log(`[${voice.id} ${n}/${PHRASES.length}] já existe — pulando`);
        continue;
      }
      process.stdout.write(`[${voice.id} ${n}/${PHRASES.length}] ${voice.gemini} `);
      try {
        const res = await callTTS(PHRASES[i], voice.gemini);
        if (!res) { console.log("desistiu (429 repetido)"); continue; }
        if (!res.ok) { console.log("FALHOU", res.status, (await res.text()).slice(0, 140)); continue; }
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
      await sleep(7_000); // throttle: respeita a quota por minuto
    }
  }

  // Manifest INDEXADO POR VOZ, a partir do que existe no disco.
  const manifest = {};
  for (const voice of VOICES) {
    const dir = path.join(baseDir, voice.id);
    if (!existsSync(dir)) continue;
    const files = (await readdir(dir)).filter((f) => /^filler-\d+\.wav$/.test(f)).sort();
    if (files.length) manifest[voice.id] = files.map((f) => `/agents/voice-fillers/${voice.id}/${f}`);
  }
  await writeFile(path.join(baseDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  const total = Object.values(manifest).reduce((a, l) => a + l.length, 0);
  console.log(`\n✓ ${total} curingas em ${Object.keys(manifest).length} vozes. manifest.json atualizado.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
