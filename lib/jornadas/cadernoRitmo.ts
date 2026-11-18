/**
 * lib/jornadas/cadernoRitmo.ts — o ESQUELETO CURADO do Caderno de Ritmo (piloto MuseScore). PURO.
 *
 * Decisão do dono (modelo híbrido): nós curamos o esqueleto — módulos, a trilha de canções com ABC
 * CORRETO, os objetivos — e a Zaeon personaliza a ordem/ritmo em cima disso. Este arquivo é a fonte
 * curada; a rota /api/studio/caderno serve um Caderno por id e a CadernoView o desenha como um
 * caderno de partitura na Sala de Estudos.
 *
 * ABC só de melodia ORIGINAL ou de obra em DOMÍNIO PÚBLICO identificada pelo nome (a mesma regra da
 * skill partitura-abc) — nada de transcrever música protegida.
 */

export type EstadoCancao = "feita" | "atual" | "a-seguir" | "mais";

export type Cancao = {
  titulo: string;
  autor?: string;
  estado: EstadoCancao;
  /** rótulo do "mais N canções" quando estado = "mais". */
  resto?: number;
};

export type PartituraCurada = { titulo: string; tom: string; abc: string; conceito: string };

export type ModuloCaderno = {
  id: string;
  numero: string;   // "Módulo 1"
  titulo: string;
  texto: string;
  /** objetivo do módulo (vira sinal pro Guia quando alcançado). */
  objetivo?: string;
  /** partitura tocável embutida (o P0). */
  partitura?: PartituraCurada;
};

export type SemanaPlano = { dias: string[]; feitos: number; minutosDia: number };

export type Caderno = {
  id: string;
  titulo: string;
  kicker: string;
  resumo: string;
  app: string;
  totalCancoes: number;
  moduloAtual: number;
  totalModulos: number;
  /** a primeira fala da Zaeon (manuscrita no topo). */
  intro: string;
  modulos: ModuloCaderno[];
  trilha: Cancao[];
  semana: SemanaPlano;
};

const ESCALA: PartituraCurada = {
  titulo: "Escala de Dó maior",
  tom: "C",
  abc: "X:1\nT:Escala de Dó maior\nM:4/4\nL:1/4\nQ:1/4=84\nK:C\nC D E F | G A B c | c B A G | F E D C |]",
  conceito: "Graus conjuntos subindo e descendo; o semitom se esconde entre mi–fá e si–dó.",
};

export const CADERNO_RITMO: Caderno = {
  id: "ritmo",
  titulo: "Caderno de Ritmo",
  kicker: "Sala de Estudos · sua jornada",
  resumo: "Aprender música tocando: 27 canções das clássicas às novas, no seu ritmo — com a Zaeon do seu lado em cada compasso.",
  app: "MuseScore",
  totalCancoes: 27,
  moduloAtual: 1,
  totalModulos: 6,
  intro: "Oi! Vamos começar sentindo o pulso. Ouça a escala, depois toque junto comigo — sem pressa. Quando ela fluir, a gente destrava a primeira canção.",
  modulos: [
    {
      id: "m1",
      numero: "Módulo 1",
      titulo: "O pulso e a escala",
      texto: "A base de tudo é sentir o tempo. Esta escala sobe e desce em graus conjuntos — o terreno onde quase toda melodia caminha.",
      objetivo: "tocar-a-escala",
      partitura: ESCALA,
    },
    {
      id: "m2",
      numero: "Módulo 2",
      titulo: "Saltos: o arpejo",
      texto: "Agora os três graus do acorde saltando. Ouça o 'tamanho' de cada salto antes de tocar.",
      objetivo: "tocar-o-arpejo",
      partitura: {
        titulo: "Arpejo de Dó",
        tom: "C",
        abc: "X:1\nT:Arpejo de Dó\nM:3/4\nL:1/4\nQ:1/4=90\nK:C\nC E G | c G E | C E G | c2 z |]",
        conceito: "Dó–mi–sol saltando: os intervalos de terça que montam o acorde.",
      },
    },
  ],
  trilha: [
    { titulo: "Ode à Alegria", autor: "Beethoven · domínio público", estado: "feita" },
    { titulo: "Oh! Susana", autor: "Stephen Foster", estado: "feita" },
    { titulo: "Brilha, Brilha, Estrelinha", autor: "tradicional", estado: "atual" },
    { titulo: "Asa Branca", autor: "Luiz Gonzaga", estado: "a-seguir" },
    { titulo: "Jingle Bells", autor: "J. Pierpont", estado: "a-seguir" },
    { titulo: "Parabéns pra Você", autor: "tradicional", estado: "a-seguir" },
    { titulo: "mais canções", estado: "mais", resto: 21 },
  ],
  semana: { dias: ["S", "T", "Q", "Q", "S", "S", "D"], feitos: 3, minutosDia: 15 },
};

const CADERNOS: Record<string, Caderno> = { ritmo: CADERNO_RITMO };

/** o Caderno curado de um id (default: ritmo). null = id desconhecido. */
export function cadernoPorId(id: string | null | undefined): Caderno | null {
  return CADERNOS[String(id ?? "ritmo").trim() || "ritmo"] ?? null;
}

/**
 * Gatilho determinístico: o aluno pediu o Caderno de Ritmo? (regra de palavra, como pedeAula —
 * o caderno abre sem depender do modelo). Ex.: "abrir meu caderno de ritmo", "quero aprender ritmo".
 */
export function pedeCaderno(texto: string): boolean {
  const t = (texto || "").toLowerCase();
  if (/caderno de ritmo/.test(t)) return true;
  if (/\bcaderno\b/.test(t) && /(ritmo|m[úu]sica|partitura|musescore)/.test(t)) return true;
  if (/(aprender|estudar|treinar|praticar)\b/.test(t) && /(ritmo|solfejo)\b/.test(t)) return true;
  return false;
}
