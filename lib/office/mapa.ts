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
  /**
   * A TELA do departamento, quando ele tem uma. Opcional porque a maioria não tem: Biblioteca e
   * Arquivo são o que o agente faz DENTRO do chat, não um lugar onde se entra. Só preenche isto
   * um departamento com página própria — e `lib/office/mapa.test.ts` confere que o arquivo da
   * rota existe de verdade, para o escritório nunca oferecer uma porta que dá no 404.
   */
  rota?: string;
};

export const DEPARTAMENTOS: Record<MentorSkill, Departamento> = {
  literature: { id: "literature", nome: "Biblioteca", cor: "#7C9CFF", descricao: "Busca e leitura crítica de literatura científica." },
  memory:     { id: "memory",     nome: "Arquivo",    cor: "#3FD3E6", descricao: "Guarda e recupera o que você já estudou." },
  studio:     { id: "studio",     nome: "Estúdio",    cor: "#F2D23C", descricao: "Transforma estudo em guia, mapa, podcast, imagem." },
  code:       { id: "code",       nome: "Oficina",    cor: "#8FA1AD", descricao: "Código e execução — a sala Projetos." },
  molecule:   { id: "molecule",   nome: "Laboratório", cor: "#E5484D", descricao: "Estrutura molecular 3D vinda do PubChem." },
  // A cor não é gosto: #B8916B é a MESMA do sistema digestório no atlas (lib/anatomia/atlas
  // SISTEMAS), então o pod fica preso à paleta do dado em vez de entrar na roleta de cores.
  anatomia:   { id: "anatomia",   nome: "Anatomia",    cor: "#B8916B", descricao: "Atlas 3D do corpo — 2.234 malhas e 3.432 conceitos do BodyParts3D.", rota: "/anatomia" },
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
 * Quantos mentores exercem cada skill. Contado do próprio MENTOR_SEED, nunca escrito à mão: uma
 * lista fixa envelheceria calada no dia em que um mentor ganhasse ou perdesse uma habilidade.
 */
export const MENTORES_POR_SKILL: ReadonlyMap<MentorSkill, number> = (() => {
  const m = new Map<MentorSkill, number>();
  for (const mentor of MENTOR_SEED) for (const s of mentor.enabledSkills) m.set(s, (m.get(s) ?? 0) + 1);
  return m;
})();

/**
 * O departamento que define o pod visualmente: o skill MAIS RARO entre os que o mentor exerce.
 *
 * Era "o primeiro que não for `memory` nem `studio`", com a justificativa certa — colorir por algo
 * que todos têm não diz nada — mas com uma lista fixa de exceções que envelheceu: hoje `literature`
 * está em 12 dos 13 mentores, tão pouco distintiva quanto as duas que estavam na lista. O efeito
 * era que o pod do Osler dizia "Biblioteca" (12 em 13) em vez de "Anatomia" (1 em 13), e o da
 * bióloga dizia "Biblioteca" em vez de "Laboratório". Contar em vez de listar resolve os dois e
 * continua valendo para o próximo skill raro que aparecer, sem ninguém se lembrar de atualizar nada.
 *
 * Empate de raridade: vence a ordem em que o mentor declara — determinístico, e é a opinião dele.
 *
 * `memory` fica FORA da disputa, e isso não é o mesmo que ser comum: é encanamento que todo agente
 * tem por construção, e um pod rotulado "Arquivo" não diria nada sobre quem trabalha nele. Quem só
 * tem as universais cai no Estúdio — o que ele ENTREGA. Essa escolha é anterior a mim e o teste
 * dela continua valendo palavra por palavra.
 */
export function departamentoDe(m: Pick<MentorSeed, "enabledSkills">): Departamento {
  let escolhido: MentorSkill | undefined;
  let menor = Infinity;
  for (const s of m.enabledSkills) {
    if (s === "memory") continue;
    const n = MENTORES_POR_SKILL.get(s) ?? 0;
    if (n < menor) { menor = n; escolhido = s; }
  }
  return DEPARTAMENTOS[escolhido ?? "studio"];
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
