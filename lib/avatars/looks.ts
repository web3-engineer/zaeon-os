/**
 * lib/avatars/looks.ts — o VISUAL de cada persona do roster (lib/ai/personas.ts), em texto pro
 * gerador de imagem. Módulo PURO.
 *
 * Coerência: as cores são as mesmas dos placeholders antigos (public/agents/*.png — Aura roxo,
 * Nina rosa, Caio azul, Téo verde, Zaeon ciano), a roupa/acessório conta o papel do agente.
 * Todos adultos, roupa discreta. Mudar o texto aqui = gerar de novo (scripts/avatars/gerar.ts).
 */

export type AvatarLook = {
  agentId: string;
  nome: string;
  /** Degradê do fundo [topo, base] — também vira a cor do anel/placeholder do card. */
  cor: readonly [string, string];
  /** Quem é o personagem (aparência + roupa + expressão neutra), em inglês pro modelo. */
  personagem: string;
};

const PERSONA_LOOKS: Record<string, AvatarLook> = {
  zaeon: {
    agentId: "zaeon",
    nome: "Zaeon",
    cor: ["#38bdf8", "#2563eb"],
    personagem:
      "Zaeon, the warm hostess of the platform: a young woman with long flowing hair that fades from bright cyan at the roots to white at the tips, styled half-up, luminous cyan eyes, a small glowing cyan triangle pendant on a thin necklace, wearing a sleek white high-collar jacket with thin cyan light lines; kind welcoming expression.",
  },
  aura: {
    agentId: "aura",
    nome: "Aura",
    cor: ["#a78bfa", "#6d28d9"],
    personagem:
      "Aura, a warm and confident young academic researcher: a young woman with long straight lavender-violet hair with soft bangs and a small silver star hairpin on the left side, violet eyes, thin round gold-rimmed glasses, wearing a cream white collared blouse under a soft violet cardigan; gentle closed-mouth smile.",
  },
  nina: {
    agentId: "nina",
    nome: "Nina",
    cor: ["#f472b6", "#db2777"],
    personagem:
      "Nina, a cheerful and energetic study buddy: a young woman with a shoulder-length pink bob haircut with blunt bangs and a small yellow pencil-shaped hair clip, bright rose-pink eyes, wearing an oversized pastel pink hoodie with white drawstrings and white over-ear headphones resting around her neck; bright friendly closed-mouth smile.",
  },
  caio: {
    agentId: "caio",
    nome: "Caio",
    cor: ["#60a5fa", "#1d4ed8"],
    personagem:
      "Caio, a calm and thoughtful academic writer: a young man with neat dark navy-blue hair, slightly tousled with a side part, deep blue eyes, wearing a crisp white shirt with a navy knit vest and a loosened thin blue tie, a silver fountain pen clipped to the vest; composed gentle closed-mouth smile.",
  },
  teo: {
    agentId: "teo",
    nome: "Téo",
    cor: ["#34d399", "#047857"],
    personagem:
      "Téo, a playful and clever programmer: a young man with messy black hair with dark green highlights and a few spiky strands, emerald green eyes, black rectangular glasses, wearing a dark charcoal hoodie with thin emerald green circuit lines along the hood edge; confident lopsided closed-mouth grin.",
  },
  zenita: {
    agentId: "zenita",
    nome: "Zenita",
    cor: ["#fcd34d", "#d97706"],
    personagem:
      "Zenita, an organized and cheerful schedule assistant: a young woman with warm golden-blonde hair in a neat high ponytail with a small round clock-shaped hair ornament, golden amber eyes, wearing a cream turtleneck under a tan blazer; friendly composed closed-mouth smile.",
  },
  core_active: {
    agentId: "core_active",
    nome: "Davi",
    cor: ["#fb923c", "#c2410c"],
    personagem:
      "Davi, the reliable guardian of the class schedule: a young man with short wavy dark brown hair, warm brown eyes, wearing an olive green bomber jacket over a white t-shirt with a small silver shield pin on the collar; calm reassuring closed-mouth smile.",
  },
  scholar: {
    agentId: "scholar",
    nome: "Scholar",
    cor: ["#94a3b8", "#334155"],
    personagem:
      "Scholar, a meticulous citation expert: a young man with neat silver-gray hair combed back, sharp gray eyes, a thin gold monocle chain, wearing a dark slate-gray academic blazer over a light gray waistcoat and a white shirt; serious but polite closed-mouth expression.",
  },
  examiner: {
    agentId: "examiner",
    nome: "Examiner",
    cor: ["#f87171", "#b91c1c"],
    personagem:
      "Examiner, a rigorous but fair quiz master: a young woman with a sharp black bob haircut with a single crimson streak, crimson red eyes, wearing a black blazer with a crimson red tie and a small silver badge; confident slightly challenging closed-mouth smile.",
  },
};

/**
 * MENTORES (os 13 especialistas dos cards da landing / Assistentes — lib/agent/mentors.ts, chave =
 * slug). Personagens ORIGINAIS com o tema do curso — o nome homenageia o cientista, mas o visual
 * NÃO imita a pessoa real (nada de retrato/semelhança).
 */
const MENTOR_LOOKS: Record<string, AvatarLook> = {
  medicina: { agentId: "medicina", nome: "Osler", cor: ["#5eead4", "#0f766e"], personagem: "Osler, a calm medicine mentor: a young adult man with light brown skin and neat short dark hair with soft bangs, warm hazel eyes, wearing a white doctor's coat over a light blue shirt with a stethoscope around his neck; reassuring closed-mouth smile." },
  enfermagem: { agentId: "enfermagem", nome: "Nightingale", cor: ["#fda4af", "#be123c"], personagem: "Nightingale, a caring nursing mentor: a young woman with soft auburn hair in a neat low bun with a few loose strands, gentle green eyes, wearing navy blue nurse scrubs with a small golden lamp-shaped pin; kind closed-mouth smile." },
  biologia: { agentId: "biologia", nome: "Darwin", cor: ["#86efac", "#15803d"], personagem: "Darwin, a curious biology mentor: a young man with light freckles and fluffy curly brown hair, bright green eyes, wearing a khaki field explorer vest over a white shirt with a small leaf pin; curious closed-mouth smile." },
  "eng-computacao": { agentId: "eng-computacao", nome: "Turing", cor: ["#a5b4fc", "#3730a3"], personagem: "Turing, a thoughtful computer engineering mentor: a young man with pale skin and short dark wavy hair, calm grey eyes, wearing a dark navy sweater with a thin glowing circuit-line pattern on the collar; quiet closed-mouth smile." },
  "eng-energias": { agentId: "eng-energias", nome: "Tesla", cor: ["#fde047", "#a16207"], personagem: "Tesla, an energetic energy engineering mentor: a young man with olive skin and spiky swept-back black hair, electric blue eyes, wearing a charcoal vest over a white shirt with a small copper coil pin; confident closed-mouth smile." },
  matematica: { agentId: "matematica", nome: "Noether", cor: ["#d8b4fe", "#7e22ce"], personagem: "Noether, a brilliant mathematics mentor: a young woman with a short dark bob haircut and round glasses, warm brown eyes, wearing a burgundy cardigan with a tiny silver infinity pin; thoughtful closed-mouth smile." },
  fisica: { agentId: "fisica", nome: "Feynman", cor: ["#7dd3fc", "#0369a1"], personagem: "Feynman, a playful physics mentor: a young man with messy curly dark hair, lively brown eyes, wearing an open-collar light blue shirt with a small atom-shaped pin; playful closed-mouth grin." },
  agronomia: { agentId: "agronomia", nome: "Borlaug", cor: ["#bef264", "#4d7c0f"], personagem: "Borlaug, a friendly agronomy mentor: a young man with sun-kissed tan skin and short light-brown hair, a straw hat hanging on his back, wearing a green work shirt with a small wheat-ear pin; warm closed-mouth smile." },
  quimica: { agentId: "quimica", nome: "Mendeleev", cor: ["#67e8f9", "#0e7490"], personagem: "Mendeleev, a focused chemistry mentor: a young man with dark hair tied in a small low ponytail, safety goggles pushed up on his forehead, wearing a white lab coat with a tiny flask-shaped pin; focused closed-mouth smile." },
  "eng-civil": { agentId: "eng-civil", nome: "Eiffel", cor: ["#fcd34d", "#92400e"], personagem: "Eiffel, a confident civil engineering mentor: a young man with light brown skin and short copper-brown hair, wearing a white hard hat and an orange high-visibility vest over a grey shirt; confident closed-mouth smile." },
  veterinaria: { agentId: "veterinaria", nome: "Pasteur", cor: ["#a7f3d0", "#047857"], personagem: "Pasteur, a gentle veterinary medicine mentor: a young man with dark brown skin and short curly black hair, warm dark eyes, wearing light green veterinary scrubs with a small paw-print badge; gentle closed-mouth smile." },
  psicologia: { agentId: "psicologia", nome: "James", cor: ["#e9d5ff", "#6b21a8"], personagem: "James, an empathetic psychology mentor: a young man with tousled light brown hair, soft grey eyes, wearing a beige turtleneck under a tweed blazer with a small brain-shaped pin; empathetic closed-mouth smile." },
  farmacia: { agentId: "farmacia", nome: "Kekulé", cor: ["#99f6e4", "#115e59"], personagem: "Kekulé, a precise pharmacy mentor: a young man with warm brown skin and neat dark hair, thin rectangular glasses, wearing a white pharmacist coat with a small hexagon-shaped pin; friendly closed-mouth smile." },

  // O esquadrão das exatas. Tons ainda não usados pelos treze, pra legenda do escritório e os
  // cards não terem dois mentores da mesma cor.
  software: { agentId: "software", nome: "Téo", cor: ["#fdba74", "#9a3412"], personagem: "Téo, a pragmatic software engineering mentor: a young man with warm olive skin, short dark curly hair and a trimmed beard, wearing a plain charcoal t-shirt under an unzipped grey hoodie; calm, attentive closed-mouth smile." },
  infra: { agentId: "infra", nome: "Janaina", cor: ["#94a3b8", "#334155"], personagem: "Janaina, a steady infrastructure and platform mentor: a Black woman with warm dark skin and short coiled natural hair, small gold hoop earrings, wearing a slate-blue technical shirt with rolled sleeves; composed, confident closed-mouth smile." },
  seguranca: { agentId: "seguranca", nome: "Octa", cor: ["#cbd5e1", "#0f172a"], personagem: "Octa, a vigilant defensive-security mentor: a person with pale skin, cropped ash-grey hair and sharp dark eyes, wearing a high-collared matte black jacket with a small octagon-shaped pin; even, unhurried closed-mouth expression." },
  "dados-ia": { agentId: "dados-ia", nome: "Zaeon", cor: ["#818cf8", "#312e81"], personagem: "Zaeon, an analytical data science and AI mentor: a person with light brown skin and straight black shoulder-length hair tucked behind one ear, thin wire-frame glasses, wearing a deep indigo button-down shirt; thoughtful, measured closed-mouth smile." },
};

/** Todos os agentes com visual definido: personas da casa + mentores. */
export const AVATAR_LOOKS: Record<string, AvatarLook> = { ...PERSONA_LOOKS, ...MENTOR_LOOKS };
export const MENTOR_LOOK_IDS = Object.keys(MENTOR_LOOKS);

export const lookDe = (agentId: string): AvatarLook | null => AVATAR_LOOKS[agentId] ?? null;
