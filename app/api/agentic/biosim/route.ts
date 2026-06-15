import { vertexCredentials } from "@/lib/ai/vertex-credentials";
/**
 * POST /api/agentic/biosim
 *
 * Smart generative router with room-based access control.
 *
 * Priority chain:
 * 1. Validate courseRoom policy exists
 * 2. Gemini classifies the prompt → intent (molecule | protein | descriptor)
 * with room policy injected into the system prompt. If an image is provided, 
 * it also generates a custom 'voxels' array mimicking the image subject.
 * 3. Enforce intent allowlist
 * 4a. MOLECULE  → PubChem real 3D coordinates
 * 4b. PROTEIN   → RCSB PDB (only if room allows)
 * 4c. DESCRIPTOR → validate renderMode + params against policy → local generators or custom AI voxels
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { VertexAI } from '@google-cloud/vertexai';
import fs from 'fs';
import path from 'path';
import {
  ROOM_POLICY,
  buildPolicyContext,
  isIntentAllowed,
  validateDescriptor,
} from '@/app/agentic-modules/biosim3d/accessPolicy';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ─── Base classifier prompt (room policy appended at runtime) ─────────────────
const CLASSIFIER_BASE = `You are a scientific visualization intent classifier for BioSim3D.

Given a user prompt and/or an image, return ONLY a JSON object with these fields:
- "intent": one of "molecule" | "protein" | "descriptor"
- "query": the extracted name/formula to look up (for molecule or protein intents)
- "pdbId": a 4-character PDB ID if the user explicitly mentioned one (optional)
- "descriptor": a BioSim3D SceneDescriptor JSON (only when intent is "descriptor")
- "voxels": (OPTIONAL) An array of { x, y, z, color, type } objects (LIMIT 400 items). ONLY include this if an IMAGE is provided, and you need to generate a custom 3D point-cloud approximation of the image's biological subject (e.g., fungi, plant, specific cell). Scale coordinates roughly between -10 and 10.

INTENT RULES:
- "molecule" → user asks about or uploads an image of a specific chemical compound (aspirin, ATP, caffeine, glucose, etc.)
- "protein"  → user asks about or uploads an image of a protein, enzyme, antibody, virus, or macromolecular structure (haemoglobin, etc.)
- "descriptor" → everything else: cells, anatomy, physics, math, quantum orbitals, animals, plants, fractals, wave functions, etc.

IF AN IMAGE IS PROVIDED:
1. Identify the primary subject of the image (e.g., "a red blood cell", "a mushroom", "the caffeine molecule").
2. Choose the intent based on the rules above.
3. If intent is molecule/protein, set "query" to the exact name determined from the image.
4. If intent is descriptor, build the best matching SceneDescriptor AND populate the "voxels" array to visually represent the image structure in 3D.

For "descriptor" intent, return a SceneDescriptor in the "descriptor" field using EXACTLY these renderModes:
"dna", "rna", "molecule", "crystal", "cell", "plant", "fungus", "animal", "quantum", "atom", "math", "protein", "anatomy", "particle"

For anatomy renderMode, set parameters.bodyPart: "skeleton" | "heart" | "neuron" | "skin" | "lung" | "bloodCells" | "eye" | "skull" | "muscle"
For particle renderMode, set parameters.physicsType: "bubbleChamber" | "proton" | "wavePacket" | "photon" | "particleDecay" | "uncertainty"
For math renderMode, set parameters.mathFunction: "ripple" | "saddle" | "paraboloid" | "torus" | "lorenz" | "mobius" | "fourier" | "network"
For animal renderMode, set parameters.animalType: "horse" | "dog" | "human" | "fish" | "bird"
For plant renderMode, set parameters.plantType: "tree" | "flower" | "fern" | "seed" | "mycelium" | "mushroom"
For quantum renderMode, set parameters.orbital: "s" | "p" | "d"

Return ONLY valid JSON. No markdown, no backticks, no explanation.`;

// ─── Vertex AI client factory ─────────────────────────────────────────────────
function getModel() {
  const credentials = (() => { const __v = vertexCredentials(); return { project_id: __v.project, client_email: __v.client_email, private_key: __v.private_key }; })(); // robust parse
  const vertexAI = new VertexAI({
    project:  credentials.project_id || process.env.GOOGLE_PROJECT_ID,
    location: process.env.GOOGLE_LOCATION || 'us-central1',
    googleAuthOptions: {
      credentials: {
        client_email: credentials.client_email,
        private_key:  credentials.private_key,
      },
    },
  });
  return vertexAI.getGenerativeModel({
    model: (process.env.GEMINI_MODEL || 'gemini-2.5-flash'),
    generationConfig: {
      temperature:      0.2,
      maxOutputTokens:  8192, // Increased for voxel payload
      responseMimeType: 'application/json',
    },
  });
}

// ─── Call Gemini ──────────────────────────────────────────────────────────────
async function callGemini(systemPrompt: string, userMessage: string, imagePart?: { inlineData: { data: string; mimeType: string } }): Promise<string> {
  const model = getModel();
  const parts: any[] = [{ text: userMessage }];
  if (imagePart) parts.push(imagePart);

  const result = await model.generateContent({
    systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts }],
  });
  return result.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ─── Internal sub-route fetchers ──────────────────────────────────────────────
async function fetchPubChem(name: string, baseUrl: string) {
  const res = await fetch(`${baseUrl}/api/agentic/biosim/pubchem`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name }),
  });
  return res.ok ? res.json() : null;
}

async function fetchPDB(searchOrId: string, baseUrl: string) {
  const is4Char = /^[A-Z0-9]{4}$/i.test(searchOrId.trim());
  const body = is4Char ? { pdbId: searchOrId.trim() } : { search: searchOrId };
  const res = await fetch(`${baseUrl}/api/agentic/biosim/pdb`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  return res.ok ? res.json() : null;
}

// ─── Local JSON Anatomy RAG ───────────────────────────────────────────────────
function findAnatomy(query: string) {
  try {
    const indexPath = path.join(process.cwd(), 'public/assets/anatomy/anatomy-index.json');
    const groupsPath = path.join(process.cwd(), 'public/assets/anatomy/groups.json');
    if (!fs.existsSync(indexPath) || !fs.existsSync(groupsPath)) return null;

    const indexStr = fs.readFileSync(indexPath, 'utf8');
    const groupsStr = fs.readFileSync(groupsPath, 'utf8');
    const index = JSON.parse(indexStr);
    const groups = JSON.parse(groupsStr);

    const q = query.toLowerCase().trim();
    
    // Check groups first
    for (const [groupId, group] of Object.entries<any>(groups)) {
      const syns = [...(group.synonyms_pt || []), ...(group.synonyms_en || []), group.canonical_name];
      if (syns.some(s => q.includes(s.toLowerCase()))) {
        const assets = index.filter((a: any) => group.assets.includes(a.id));
        return { type: 'anatomy_glb', source: 'anatomy_glb', assets, title: group.canonical_name };
      }
    }
    
    // Check individuals
    for (const item of index) {
      const syns = [...(item.synonyms_pt || []), ...(item.synonyms_en || []), item.canonical_name];
      if (syns.some(s => q.includes(s.toLowerCase()))) {
        return { type: 'anatomy_glb', source: 'anatomy_glb', assets: [item], title: item.canonical_name };
      }
    }
  } catch (e) {
    console.error('[biosim] Anatomy index read error', e);
  }
  return null;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Step 0: Parse Request ────────────────────────────────────────────────
    let prompt = '';
    let courseRoom = 'bio';
    let imageFile: File | null = null;

    try {
      const reqFormData = await req.formData();
      prompt = (reqFormData.get('prompt') as string) || '';
      courseRoom = (reqFormData.get('courseRoom') as string) || 'bio';
      imageFile = (reqFormData.get('image') as File) || null;
    } catch {
      try {
        const reqJson = await req.clone().json();
        prompt = reqJson.prompt || '';
        courseRoom = reqJson.courseRoom || 'bio';
      } catch {
        // Handled below
      }
    }

    if (!prompt?.trim() && !imageFile) {
      return NextResponse.json({ error: 'Prompt or image is required' }, { status: 400 });
    }

    // ── Prepare Image Part ───────────────────────────────────────────────────
    let imagePart: { inlineData: { data: string; mimeType: string } } | undefined;
    if (imageFile) {
      const buffer = await imageFile.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      imagePart = {
        inlineData: { data: base64, mimeType: imageFile.type },
      };
    }

    // ── Pre-flight: Anatomy Database (Med Room) ─────────────────────────────
    // Intercept standard NLP calls for physical GLB loaded assets
    if (courseRoom === 'med' && prompt) {
      const anatomyMatch = findAnatomy(prompt);
      if (anatomyMatch) {
         return NextResponse.json({
           ...anatomyMatch,
           descriptor: {
             renderMode: 'anatomy',
             title: anatomyMatch.title,
             description: `Modelo anatômico preciso 3D de alta fidelidade (${anatomyMatch.assets.length} malha(s) nativa(s)).`,
             hint: 'Carregamento estrutural nativo via Open Anatomy GLB. Controle a câmera para visualizar.',
             parameters: {},
             accentColor: '#fb7185',
           }
         });
      }
    }

    // ── Step 1: Validate room ────────────────────────────────────────────────
    const policy = ROOM_POLICY[courseRoom];
    if (!policy) {
      return NextResponse.json(
        { error: `Unknown course room: "${courseRoom}"` },
        { status: 400 }
      );
    }

    // ── Step 2: Classify with room-scoped system prompt ───────────────────────
    const systemPrompt = CLASSIFIER_BASE + '\n' + buildPolicyContext(courseRoom);
    let userMessage = `Room: ${courseRoom} (${policy.label})\nUser prompt: "${prompt.trim()}"`;
    if (imageFile) {
      userMessage += `\n[Context: An image was provided. Translate the visual into a point cloud structure if applicable.]`;
    }

    const raw = await callGemini(systemPrompt, userMessage, imagePart);

    let classified: any;
    try {
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      classified = JSON.parse(cleaned);
    } catch {
      console.error('[biosim] Classifier parse error:', raw);
      return NextResponse.json({ error: 'AI classification failed', raw }, { status: 500 });
    }

    const intent: 'molecule' | 'protein' | 'descriptor' = classified.intent ?? 'descriptor';
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

    // ── Step 3: Enforce intent policy ────────────────────────────────────────
    if (!isIntentAllowed(courseRoom, intent)) {
      return NextResponse.json(
        {
          error:     'out_of_scope',
          message:   policy.outOfScopeMessage,
          room:      courseRoom,
          roomLabel: policy.label,
          intent,
        },
        { status: 403 }
      );
    }

    // ── Step 4a: MOLECULE → PubChem ──────────────────────────────────────────
    if (intent === 'molecule' && classified.query) {
      const result = await fetchPubChem(classified.query, baseUrl);
      if (result?.voxels?.length > 0) {
        return NextResponse.json({
          source:   'pubchem',
          intent:   'molecule',
          voxels:   result.voxels,
          metadata: {
            name:       result.name,
            formula:    result.formula,
            weight:     result.weight,
            atomCount:  result.atomCount,
            cid:        result.cid,
            pubchemUrl: result.pubchemUrl,
          },
          descriptor: {
            renderMode: 'molecule',
            title: `${result.name ?? classified.query} (${result.formula ?? ''})`,
            description: `Real 3D structure from PubChem (CID ${result.cid}). ${result.atomCount} atoms, MW ${result.weight ?? '?'} g/mol.`,
            hint: 'Atom colours follow CPK convention: C=dark grey, N=blue, O=red, H=white, S=yellow.',
            parameters: { formula: classified.query },
            accentColor: '#22d3ee',
          },
        });
      }
    }

    // ── Step 4b: PROTEIN → RCSB PDB ─────────────────────────────────────────
    if (intent === 'protein') {
      if (!policy.pdbAllowed) {
        return NextResponse.json(
          {
            error:     'out_of_scope',
            message:   policy.outOfScopeMessage,
            room:      courseRoom,
            roomLabel: policy.label,
          },
          { status: 403 }
        );
      }
      const queryStr = classified.pdbId ?? classified.query;
      if (queryStr) {
        const result = await fetchPDB(queryStr, baseUrl);
        if (result?.voxels?.length > 0) {
          return NextResponse.json({
            source:   'rcsb_pdb',
            intent:   'protein',
            voxels:   result.voxels,
            metadata: {
              pdbId:         result.pdbId,
              title:         result.title,
              resolution:    result.resolution,
              method:        result.method,
              originalAtoms: result.originalAtoms,
              sampledAtoms:  result.sampledAtoms,
              chains:        result.chains,
              pdbUrl:        result.pdbUrl,
            },
            descriptor: {
              renderMode: 'protein',
              title: result.title ?? result.pdbId,
              description: `Real crystallographic structure from RCSB PDB (${result.pdbId}). ${result.originalAtoms?.toLocaleString()} atoms across ${result.chains} chain(s).${result.resolution ? ` Resolution: ${result.resolution} Å.` : ''}`,
              hint: 'Colours by element (CPK) and chain. Backbone atoms form the overall shape.',
              parameters: { pdbId: result.pdbId },
              accentColor: '#a78bfa',
            },
          });
        }
      }
    }

    // ── Step 4c: DESCRIPTOR → validate + local generators or custom voxels ────
    const desc = classified.descriptor;
    if (!desc?.renderMode) {
      return NextResponse.json({ error: 'Could not generate a scene descriptor', raw }, { status: 500 });
    }

    const violation = validateDescriptor(courseRoom, desc);
    if (violation) {
      return NextResponse.json(
        {
          error:     'out_of_scope',
          message:   violation,
          room:      courseRoom,
          roomLabel: policy.label,
          blockedMode: desc.renderMode,
        },
        { status: 403 }
      );
    }

    // Pass back custom generated voxels from the AI if an image was analyzed
    return NextResponse.json({
      source:     classified.voxels ? 'generator-ai' : 'generator',
      intent,
      descriptor: desc,
      voxels:     classified.voxels || undefined 
    });

  } catch (error: any) {
    console.error('[biosim] Error:', error);
    return NextResponse.json({ error: error.message ?? 'Internal Server Error' }, { status: 500 });
  }
}