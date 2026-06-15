import { vertexCredentials } from "@/lib/ai/vertex-credentials";
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { VertexAI } from '@google-cloud/vertexai';

export const dynamic    = 'force-dynamic';
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a quantum physics visualization AI for the Zaeon OS Quantum Lab.

Given a user's description of a quantum experiment, particle, or state, return a JSON QuantumScene object.

## SUPPORTED vizMode VALUES
- "waveFunction"    → wave function on a canvas (requires waveFnMode)
- "blochSphere"     → Bloch sphere showing a qubit state (requires theta, phi)
- "energyLevels"    → quantised energy level diagram (requires energySystem, nActive)
- "doubleSlit"      → double-slit interference pattern

## waveFnMode values (for vizMode="waveFunction")
"squareWell"   → particle in infinite square well
"harmonic"     → quantum harmonic oscillator
"gaussian"     → free Gaussian wave packet
"hydrogen"     → hydrogen radial probability P(r)
"superposition"→ superposition of two square-well states

## energySystem values (for vizMode="energyLevels")
"hydrogen"   → E_n = -13.6/n² eV (Bohr model)
"box"        → E_n = n²π²ℏ²/(2mL²)
"harmonic"   → E_n = ℏω(n + ½)

## OUTPUT (strict JSON, no markdown)
{
  "vizMode": "waveFunction",
  "waveFnMode": "squareWell",
  "n": 2,
  "m": 3,
  "k0": 6,
  "sigma0": 0.12,
  "theta": 1.5708,
  "phi": 0,
  "blochLabel": "|+⟩",
  "energySystem": "hydrogen",
  "nActive": 3,
  "nLevels": 6,
  "title": "Short title",
  "description": "2-3 sentence scientific explanation",
  "hint": "1 sentence insight for students",
  "formula": "E_n = −13.6/n² eV"
}

## RULES
- Return ONLY valid JSON. No text outside the object.
- If the user mentions qubits, superposition without a potential → blochSphere.
- If the user mentions energy levels, emission, absorption, Bohr model → energyLevels.
- If the user mentions double slit, interference → doubleSlit.
- Default waveFnMode to "squareWell" unless a different system is clearer.
- n, m must be positive integers (1-6).
- theta ∈ [0, π], phi ∈ [0, 2π] for blochSphere.
- Choose formula in LaTeX-like text notation (not actual LaTeX).`;

function getModel() {
  const credentials = (() => { const __v = vertexCredentials(); return { project_id: __v.project, client_email: __v.client_email, private_key: __v.private_key }; })(); // robust parse
  const v = new VertexAI({
    project: credentials.project_id || process.env.GOOGLE_PROJECT_ID,
    location: process.env.GOOGLE_LOCATION || 'us-central1',
    googleAuthOptions: {
      credentials: {
        client_email: credentials.client_email,
        private_key:  credentials.private_key,
      },
    },
  });
  return v.getGenerativeModel({
    model: (process.env.GEMINI_MODEL || 'gemini-2.5-flash'),
    generationConfig: { temperature: 0.3, maxOutputTokens: 512, responseMimeType: 'application/json' },
  });
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { prompt } = await req.json();
    if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

    const model = getModel();
    const result = await model.generateContent({
      systemInstruction: { role: 'system', parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: `User: "${prompt.trim()}"` }] }],
    });
    const raw = result.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    let scene: any;
    try {
      scene = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON', raw }, { status: 500 });
    }

    if (!scene.vizMode || !scene.title) {
      return NextResponse.json({ error: 'Incomplete scene', raw }, { status: 500 });
    }

    return NextResponse.json({ scene });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 });
  }
}
