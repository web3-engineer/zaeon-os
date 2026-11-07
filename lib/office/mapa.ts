/**
 * lib/office/mapa.ts — o escritório como DADO, antes de virar pixel.
 *
 * O escritório não inventa agentes: ele desenha os que já existem em `MENTOR_SEED`.
 * Cada mentor vira um pod, cada `MentorSkill` vira um departamento, e a posição sai de
 * uma grade isométrica calculada aqui — aritmética pura, testável sem navegador.
 *
 * Esta camada NÃO sabe o que é Three.js. Ela devolve coordenadas e rótulos; a cena
 * (components/office/OfficeScene.tsx) desenha. Mesma divisão do Modo Revista: quem
 * decide não desenha, quem desenha não decide.
 */
import { MENTOR_SEED, type MentorSeed, type MentorSkill } from "@/lib/agent/mentors";

/** Departamentos do escritório — um por skill que o mentor exerce. */
export type Departamento = {
  id: MentorSkill;
  nome: string;
  /** Cor do pod, em hex. Combina com o ciano da marca sem virar arco-íris. */
  cor: string;
  descricao: string;
};

export const DEPARTAMENTOS: Record<MentorSkill, Departamento> = {
  literature: { id: "literature", nome: "Biblioteca", cor: "#7C9CFF", descricao: "Busca e leitura crítica de literatura científica." },
  memory:     { id: "memory",     nome: "Arquivo",    cor: "#3FD3E6", descricao: "Guarda e recupera o que você já estudou." },
  studio:     { id: "studio",     nome: "Estúdio",    cor: "#F2D23C", descricao: "Transforma estudo em guia, mapa, podcast, imagem." },
  code:       { id: "code",       nome: "Oficina",    cor: "#8FA1AD", descricao: "Código e execução — a sala Projetos." },
  molecule:   { id: "molecule",   nome: "Laboratório", cor: "#E5484D", descricao: "Estrutura molecular 3D vinda do PubChem." },
  // A cor não é gosto: #B8916B é a MESMA do sistema digestório no atlas (lib/anatomia/atlas
  // SISTEMAS), então o pod fica preso à paleta do dado em vez de entrar na roleta de cores.
  anatomia:   { id: "anatomia",   nome: "Anatomia",    cor: "#B8916B", descricao: "Atlas 3D do corpo — 2.234 malhas e 3.432 conceitos do BodyParts3D." },
};

/** Em que estado um pod está. Só isto — o resto é animação. */
export type EstadoPod = "ocioso" | "trabalhando" | "falando";

export type Pod = {
  slug: string;
  nome: string;
  curso: string;
  emoji: string;
  /** Departamento que dá a cor: o primeiro skill que não seja `memory`, que todos têm. */
  departamento: Departamento;
  skills: readonly MentorSkill[];
  artefatos: readonly string[];
  /** Posição na grade isométrica, em "células". A cena multiplica pelo tamanho real. */
  x: number;
  z: number;
};

/**
 * O departamento que define o pod visualmente. `memory` e `studio` todo mentor tem —
 * colorir por elas deixaria o escritório inteiro da mesma cor e não diria nada.
 */
export function departamentoDe(m: Pick<MentorSeed, "enabledSkills">): Departamento {
  const distintivo = m.enabledSkills.find((s) => s !== "memory" && s !== "studio");
  return DEPARTAMENTOS[distintivo ?? "studio"];
}

/**
 * Coloca os pods numa grade em U em volta do centro (onde fica o ⟁). Linhas de largura
 * `colunas`, alternando o lado, para o centro ficar livre e a câmera isométrica pegar
 * todo mundo sem empilhar.
 */
export function montarEscritorio(mentores: readonly MentorSeed[] = MENTOR_SEED, colunas = 4): Pod[] {
  const ordenados = [...mentores].sort((a, b) => a.order - b.order);
  return ordenados.map((m, i) => {
    const linha = Math.floor(i / colunas);
    const col = i % colunas;
    // Centro vazio: a coluna pula o meio deslocando meia célula pra fora.
    const meio = (colunas - 1) / 2;
    const x = col - meio;
    return {
      slug: m.slug,
      nome: m.name,
      curso: m.course,
      emoji: m.emoji,
      departamento: departamentoDe(m),
      skills: m.enabledSkills,
      artefatos: m.signatureArtifacts,
      x: x * 2 + (x < 0 ? -1 : x > 0 ? 1 : 0),
      z: linha * 2.2 - 1.5,
    };
  });
}

/** Agrupa por departamento — a legenda do escritório sai daqui. */
export function porDepartamento(pods: readonly Pod[]): { dep: Departamento; pods: Pod[] }[] {
  const mapa = new Map<MentorSkill, Pod[]>();
  for (const p of pods) {
    const lista = mapa.get(p.departamento.id) ?? [];
    lista.push(p);
    mapa.set(p.departamento.id, lista);
  }
  return [...mapa.entries()]
    .map(([id, lista]) => ({ dep: DEPARTAMENTOS[id], pods: lista }))
    .sort((a, b) => b.pods.length - a.pods.length);
}
