/**
 * lib/rag/areas.ts — as BASES POR ÁREA dos mentores (conhecimento público especializado no RAG). PURO.
 *
 * Cada área é uma "turma" pública da base: os trechos têm `turma_ids = ['area:<slug>']` e a busca do turno inclui
 * `area:<slug>` quando o mentor dessa área está ativo (lib/rag/turno), e `area:geral` sempre — sem mexer no esquema
 * do Postgres nem na regra de permissão. Os slugs são os dos 13 mentores (lib/agent/mentors.ts).
 *
 * Fontes (scripts/ingerir-bases-area.ts, licenças que permitem uso comercial — decisão do dono, 2026-10-22):
 *   - SciELO em português (dataseek/ptbr-scielo, CC-BY-4.0): título + resumo, classificado por área pelos `termos`.
 *   - Wikipédia em português (CC-BY-SA): os `wikipedia` de cada área (conceitos centrais).
 *   - Medicina/enfermagem/farmácia: rhaymison/medicine-* (Apache-2.0). Geral: maritaca-ai/enem (Apache-2.0).
 */
export const PREFIXO_AREA = "area:";
export const AREA_GERAL = "geral";
export const idArea = (slug: string) => `${PREFIXO_AREA}${slug}`;

export type Area = {
  slug: string;
  /** Palavras (sem acento, minúsculas) que puxam um artigo pra área — prefixo de palavra, ou palavra inteira com `$` no fim
   *  ("estrutural$" não pega "estruturalismo"). Título vale 3×. */
  termos: string[];
  /** Verbetes da Wikipédia pt com os conceitos centrais. */
  wikipedia: string[];
};

export const AREAS: readonly Area[] = [
  { slug: "medicina", termos: ["paciente", "pacientes", "clinic", "cirurg", "diagnost", "tratamento", "hospital", "doenca", "sindrome", "terapia", "mortalidade", "neoplasia", "cancer", "cardio", "pediatr"],
    wikipedia: ["Medicina", "Anatomia humana", "Fisiologia humana", "Farmacologia", "Semiologia médica", "Sistema cardiovascular", "Sistema imunitário", "Diabetes mellitus", "Hipertensão arterial", "Epidemiologia", "Medicina baseada em evidências", "Exame físico"] },
  { slug: "enfermagem", termos: ["enfermagem", "enfermeir", "cuidado", "cuidador", "assistencia", "atencao primaria", "humanizacao", "auxiliar de enfermagem", "sistematizacao"],
    wikipedia: ["Enfermagem", "Sinais vitais", "Biossegurança", "Atenção primária à saúde", "Sistema Único de Saúde", "Cuidados paliativos", "Infecção hospitalar"] },
  { slug: "biologia", termos: ["especie", "especies", "ecolog", "genetic", "evolu", "biodiversidade", "celula", "celular", "fauna", "flora", "molecular", "taxonom"],
    wikipedia: ["Biologia", "Célula", "Genética", "Evolução", "Ecologia", "DNA", "Fotossíntese", "Respiração celular", "Mitose", "Meiose", "Biodiversidade", "Seleção natural"] },
  // O Turing cedeu os termos de IA/dados ao `dados-ia` (Zaeon) e `software` ao `software` (Téo)
  // quando esses mentores passaram a existir. Não é poda cosmética: termo em DUAS áreas é empate, e
  // `areaDaPergunta` devolve null no empate — o portão de escopo desliga e a agente para de
  // encaminhar. O Turing fica com o que é dele: algoritmo, computabilidade, linguagem, estrutura.
  { slug: "eng-computacao", termos: ["algoritm", "computacao$", "computacional", "banco de dados", "sistema de informacao", "programacao", "linguagem de programacao", "estrutura de dados", "sistema operacional", "compilac", "complexidade computacional"],
    wikipedia: ["Ciência da computação", "Algoritmo", "Estrutura de dados", "Engenharia de software", "Aprendizado de máquina", "Rede neural artificial", "Banco de dados", "Sistema operativo", "Rede de computadores", "Criptografia", "Blockchain"] },
  { slug: "eng-energias", termos: ["energia", "solar", "eolic", "fotovolta", "eletric", "biocombust", "biomassa", "hidreletric", "renovave", "biogas"],
    wikipedia: ["Energia renovável", "Energia solar", "Energia eólica", "Célula fotovoltaica", "Energia hidrelétrica", "Biocombustível", "Sistemas elétricos de potência", "Eficiência energética", "Termodinâmica"] },
  { slug: "matematica", termos: ["matematic", "teorema", "equac", "algebra", "geometri", "probabilidade", "calculo diferencial", "modelagem matematica"],
    wikipedia: ["Matemática", "Cálculo", "Álgebra linear", "Geometria", "Estatística", "Probabilidade", "Equação diferencial", "Teoria dos números", "Função (matemática)", "Trigonometria"] },
  { slug: "fisica", termos: ["fisica quantica", "quantic", "particulas$", "eletromagnet", "optica$", "termodinam", "mecanica classica", "mecanica quantica", "relatividade", "semicondutor", "ensino de fisica", "astrofisica"],
    wikipedia: ["Física", "Mecânica clássica", "Eletromagnetismo", "Termodinâmica", "Mecânica quântica", "Relatividade geral", "Óptica", "Leis de Newton", "Energia cinética", "Física de partículas"] },
  { slug: "agronomia", termos: ["cultivar", "cultivo", "solo", "safra", "irrigac", "adubac", "produtividade", "lavoura", "milho", "soja", "agricol", "agronom", "plantio", "sementes"],
    wikipedia: ["Agronomia", "Agricultura", "Ciência do solo", "Irrigação", "Adubação", "Rotação de culturas", "Agricultura de precisão", "Controle biológico", "Agroecologia"] },
  { slug: "quimica", termos: ["quimic", "sintese quimica", "reacao quimica", "catalis", "polimer", "compostos organicos", "molecula", "espectroscop", "cromatograf", "oxidacao"],
    wikipedia: ["Química", "Tabela periódica", "Ligação química", "Reação química", "Química orgânica", "Estequiometria", "Equilíbrio químico", "Ácido", "Catálise", "Polímero"] },
  { slug: "eng-civil", termos: ["concreto", "estrutural$", "estruturas de concreto", "construcao civil", "edificac", "edificio", "fundacoes$", "pavimento", "saneamento", "geotecn", "argamassa", "alvenaria"],
    wikipedia: ["Engenharia civil", "Concreto armado", "Resistência dos materiais", "Mecânica dos solos", "Fundação (construção)", "Saneamento básico", "Pavimento", "Hidráulica"] },
  { slug: "veterinaria", termos: ["bovin", "suin", "equin", "canin", "felin", "caes", "gatos", "veterinari", "rebanho", "aves", "ovinos", "caprinos", "zoonose"],
    wikipedia: ["Medicina veterinária", "Zoonose", "Bovinocultura", "Saúde animal", "Vacinação", "Bem-estar animal", "Parasitologia"] },
  { slug: "psicologia", termos: ["psicolog", "comportament", "ansiedade", "depressao", "saude mental", "cognitiv", "emocional", "psiquiatr", "subjetividade"],
    wikipedia: ["Psicologia", "Psicologia cognitiva", "Behaviorismo", "Psicanálise", "Transtorno de ansiedade", "Transtorno depressivo maior", "Desenvolvimento humano", "Neuropsicologia", "Psicologia social"] },
  /**
   * AS QUATRO ÁREAS DO ESQUADRÃO DAS EXATAS (2026-11-08). Elas não existiam, e isso era o bloqueio
   * real do DATASET: sem a área, `idArea("seguranca")` produz um `turmaId` que `areasDoTurno` nunca
   * pede — o documento entra na base e fica invisível. Área é o ENDEREÇO do agente, não enfeite.
   *
   * Cada uma entra COM o mentor dela no mesmo commit (lib/agent/mentors), porque uma área órfã faz
   * pior que nada: ela rouba a classificação de uma área que tem dono e derruba o portão de escopo
   * de `nega` pra `neutro` — a Zenita para de encaminhar e passa a torcer a pergunta pro lado dela.
   *
   * Corpus já baixado, licença conferida na fonte (scripts/dataset-montar.mjs):
   *   software   → Téo      → MDN Web Docs, 10.654 páginas, CC BY-SA 2.5
   *   infra      → Janaina  → documentação do Kubernetes, 1.113 páginas, CC BY 4.0
   *   seguranca  → Octa     → CWE (956) + MITRE ATT&CK (706), uso comercial liberado pelo MITRE
   *   dados-ia   → Zaeon    → arXiv cs.LG aberto + estatística do REA-MECC, em português
   *
   * `direito` fica FORA de propósito: a Constituição está baixada (412 artigos em vigor, CC0 e art.
   * 8º IV da Lei 9.610/98), mas o agente de leis é decisão adiada do dono. A área espera o mentor.
   *
   * Os TERMOS aqui são para classificar ARTIGO (título 3×, resumo 1×, mínimo 5 pontos) — vocabulário
   * acadêmico, não de pergunta. Quem fecha o escopo do agente na conversa é o `termosProprios` de
   * lib/agents/capacidades, que é outra lista, com outro limiar e outro propósito.
   */
  { slug: "software", termos: ["software", "engenharia de software", "codigo-fonte", "refatorac", "teste de software", "integracao continua", "controle de versao", "api rest", "framework", "orientacao a objetos", "depurac", "tipagem estatica", "revisao de codigo"],
    wikipedia: ["Engenharia de software", "Programação orientada a objetos", "Teste de software", "Integração contínua", "Git", "API", "Padrão de projeto de software", "Refatoração", "Controle de versão", "JavaScript", "TypeScript", "Compilador"] },
  { slug: "infra", termos: ["infraestrutura", "servidor", "container", "kubernetes", "docker", "orquestrac", "devops", "implantac", "balanceador", "escalabilidade", "monitorament", "alta disponibilidade", "sistema distribuido", "em nuvem", "virtualizac"],
    wikipedia: ["Computação em nuvem", "Kubernetes", "Docker (software)", "DevOps", "Virtualização", "Sistema distribuído", "Balanceamento de carga", "Linux", "Protocolo de rede", "Infraestrutura como código", "Observabilidade"] },
  { slug: "seguranca", termos: ["seguranca da informacao", "vulnerabilidad", "criptografi", "autenticac", "ameaca", "malware", "ataque", "exploracao de falha", "controle de acesso", "firewall", "pentest", "forense digital", "resposta a incidente", "hardening", "sql injection", "injecao de sql", "xss", "cross-site", "estouro de buffer", "buffer overflow", "escalada de privilegio", "cwe", "ransomware", "phishing"],
    wikipedia: ["Segurança da informação", "Criptografia", "Vulnerabilidade (computação)", "Autenticação", "Malware", "Firewall", "Ataque de negação de serviço", "Engenharia social (segurança)", "Teste de penetração", "Perícia forense computacional", "Assinatura digital"] },
  { slug: "dados-ia", termos: ["aprendizado de maquina", "aprendizado profundo", "rede neural", "inferencia estatistica", "regressao", "classificac", "conjunto de dados", "treinament", "modelo preditivo", "validacao cruzada", "inferencia bayesiana", "ciencia de dados", "estatistic", "sobreajuste", "vazamento de dado"],
    wikipedia: ["Ciência de dados", "Aprendizado de máquina", "Aprendizado profundo", "Rede neural artificial", "Estatística", "Inferência estatística", "Inferência bayesiana", "Regressão linear", "Teorema de Bayes", "Probabilidade", "Validação cruzada", "Processamento de linguagem natural"] },
  { slug: "farmacia", termos: ["farmac", "medicamento", "farmaco", "fitoterap", "dosagem", "posologia", "excipiente", "biodisponibilidade", "toxicolog"],
    wikipedia: ["Farmácia", "Farmacologia", "Farmacocinética", "Farmacodinâmica", "Medicamento genérico", "Fitoterapia", "Toxicologia", "Antibiótico"] },
];

export const SLUGS_AREA: readonly string[] = AREAS.map((a) => a.slug);

const norm = (s: string) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Conta as ocorrências de cada termo (prefixo de palavra; palavra inteira quando termina em `$`). */
function pontuar(texto: string, termos: string[]): number {
  let n = 0;
  for (const t of termos) {
    const inteira = t.endsWith("$");
    const re = new RegExp(`\\b${t.replace(/\$$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${inteira ? "\\b" : ""}`, "g");
    n += (texto.match(re) ?? []).length;
  }
  return n;
}

/**
 * A área de um artigo pelo título + resumo. null quando nenhuma área se destaca: pontuação mínima 5 e pelo menos
 * 1,5× a segunda — artigo interdisciplinar ambíguo fica fora (melhor sem fonte que com fonte da área errada).
 */
export function classificarArea(titulo: string, resumo: string): { slug: string; pontos: number } | null {
  const t = norm(titulo), r = norm(resumo);
  const placar = AREAS.map((a) => ({ slug: a.slug, pontos: pontuar(t, a.termos) * 3 + pontuar(r, a.termos) })).sort((x, y) => y.pontos - x.pontos);
  const [primeira, segunda] = placar;
  if (!primeira || primeira.pontos < 5) return null;
  if (segunda && segunda.pontos > 0 && primeira.pontos < segunda.pontos * 1.5) return null;
  return primeira;
}

/** As bases que entram na busca do turno: a área do mentor ativo (se for uma das 13) + a geral. */
export function areasDoTurno(mentorSlug: string | null | undefined): string[] {
  const out = [idArea(AREA_GERAL)];
  if (mentorSlug && SLUGS_AREA.includes(mentorSlug)) out.unshift(idArea(mentorSlug));
  return out;
}

/** Artigo da SciELO (texto completo do dataset) → título + resumo, sem o corpo inteiro. */
export function tituloEResumo(texto: string, maxResumo = 2400): { titulo: string; resumo: string } {
  const t = String(texto ?? "").replace(/\r/g, "");
  const quebra = t.indexOf("\n");
  const titulo = (quebra > 0 ? t.slice(0, quebra) : t.slice(0, 200)).trim().slice(0, 300);
  let corpo = (quebra > 0 ? t.slice(quebra + 1) : "").trim();
  const ini = norm(corpo).search(/\b(resumo|abstract)\b/);
  if (ini >= 0 && ini < 1500) corpo = corpo.slice(ini);
  return { titulo, resumo: corpo.slice(0, maxResumo).trim() };
}
