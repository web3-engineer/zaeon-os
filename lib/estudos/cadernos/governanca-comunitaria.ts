import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: Como uma comunidade descentralizada toma decisoes (ciencias sociais e governanca).
 * Conteudo com lastro real: os 8 principios de desenho de Elinor Ostrom (Governing the Commons, 1990;
 * Nobel de Economia 2009), consenso formal (Seeds for Change; metodo quacre 'unity, not unanimity'),
 * consentimento e circulos da sociocracia (Gerard Endenburg; Sociocracy 3.0, sete principios),
 * papeis/dominios/accountabilities da Holacracy (Constitution v5), metodos de votacao (maioria,
 * supermaioria, Condorcet, aprovacao, voto quadratico da RadicalxChange), orcamento participativo
 * (Porto Alegre, 1989), governanca de DAOs (ethereum.org) e os 7 principios cooperativistas da ICA.
 * As etapas que exigem profissional (advogado/contador para estatuto, facilitador-mediador, auditoria
 * de contrato inteligente) viram blocos de mobilizacao. Video real verificado. Cada afirmacao, numero
 * e norma tem fonte citada na propria pagina. Texto sem acento, por consistencia com os demais cadernos.
 */
export const caderno: CadernoEstudo = {
  id: "governanca-comunitaria",
  titulo: "Como uma comunidade descentralizada toma decisoes: ler, medir e decidir junto",
  resumo:
    "Da assembleia ao software de voto: como um grupo sem chefe unico transforma vontade coletiva em decisao legitima. O caderno ensina a mapear quem decide o que, escolher o metodo certo (votacao, consenso ou consentimento), medir quorum e limiar com numero, desenhar papeis e regras, facilitar a reuniao que decide, resolver conflito e federar grupos. Cada metodo tem autor, cada regra tem norma ou caso real, e cada etapa que pede um profissional mostra quem chamar e o que ele entrega.",
  paginas: [
    // ===================== CAPITULO 1 — CONTEXTO =====================
    {
      id: "abertura",
      titulo: "Como usar este caderno de campo",
      blocos: [
        { tipo: "texto", texto: "Este caderno acompanha quem precisa fazer um grupo decidir junto sem depender de um chefe que manda em tudo: um coletivo, uma cooperativa, um condominio, uma associacao de bairro, uma rede de ativismo, um time que se auto-organiza ou uma comunidade online. O produto final e um desenho de governanca: quem decide o que, por qual metodo, com qual quorum, e o que acontece quando as pessoas discordam." },
        { tipo: "texto", texto: "Regra do caderno: antes de votar qualquer coisa, defina a fronteira (quem e membro e decide); antes de escolher o metodo, separe o tipo de decisao (operacional ou politica); e antes de chamar de 'democratico', meca a participacao com numero. Voce observa, mapeia e decide. Quando a etapa exige estatuto juridico, mediacao de conflito grave ou auditoria tecnica, a pagina abre um campo de mobilizacao que chama o profissional e acompanha ate ficar pronto." },
        { tipo: "diagrama", titulo: "O percurso do caderno", codigo: `flowchart TD
  A["Contexto: por que decidir sem chefe unico"] --> B["Ler a comunidade: fronteiras e poder"]
  B --> C["Metodo: votacao, consenso, consentimento"]
  C --> D["Calculo: quorum, limiar, contagem"]
  D --> E["Projeto: papeis, regras, acordo"]
  E --> F["Execucao: facilitar e decidir"]
  F --> G["Manutencao: conflito, revisao, federacao"]
  G --> H["Casos reais e recursos"]
  H --> I["Prancha de sintese"]` },
      ],
    },
    {
      id: "por-que-descentralizar",
      titulo: "Por que uma comunidade decide de forma descentralizada",
      blocos: [
        { tipo: "texto", texto: "Quando um recurso ou um projeto e de todos, mandar de cima costuma falhar: quem esta longe nao enxerga o detalhe local, a regra imposta nao e obedecida e a decisao perde legitimidade. Garrett Hardin, em 1968, descreveu a 'tragedia dos comuns': cada um usa o recurso comum ao maximo e o conjunto se esgota. A saida classica seria privatizar ou estatizar. Elinor Ostrom mostrou uma terceira via, premiada com o Nobel de Economia em 2009: comunidades reais governam o comum com regras proprias, feitas e fiscalizadas por quem usa." },
        { tipo: "texto", texto: "Decidir de forma descentralizada nao e romantismo: e eficiencia informacional. Quem vive o problema tem o dado que o centro nao tem. O custo e o esforco de coordenar: reuniao, metodo, paciencia. Este caderno existe para baixar esse custo e fazer o grupo decidir rapido, junto e com legitimidade." },
        { tipo: "video", titulo: "What is the tragedy of the commons? (TED-Ed, Nicholas Amendolare)", youtube: "CxC161GvMPc" },
        {
          tipo: "licao",
          pergunta: "Qual foi a contribuicao central de Elinor Ostrom ao debate da tragedia dos comuns?",
          alternativas: [
            "Provou que so o Estado consegue administrar um recurso comum",
            "Mostrou que comunidades governam o comum com regras proprias, feitas e fiscalizadas por quem usa",
            "Defendeu que privatizar tudo e a unica solucao possivel",
          ],
          correta: 1,
          explicacao: "Ostrom documentou pescarias, sistemas de irrigacao e florestas geridos por autogovernanca local duradoura, e extraiu dai 8 principios de desenho. Rendeu-lhe o Nobel de Economia de 2009.",
        },
      ],
    },
    {
      id: "o-que-e-descentralizado",
      titulo: "O que e, de fato, uma decisao descentralizada",
      blocos: [
        { tipo: "texto", texto: "Guarde tres topologias. Centralizado: um no decide por todos (um chefe, uma diretoria). Descentralizado: varios nos decidem, cada um com autonomia sobre seu dominio, ligados por acordos. Distribuido: todos os nos tem o mesmo peso e qualquer um fala com qualquer um. A maioria das comunidades saudaveis e descentralizada, nao distribuida: ha papeis e circulos, mas nenhum ponto unico que mande em tudo." },
        {
          tipo: "prancha",
          titulo: "Centralizado x descentralizado x distribuido",
          desenho: {
            legenda: "Esquerda: um centro manda em todos. Meio: circulos autonomos ligados por pontes (descentralizado). Direita: todos os nos conectados entre si (distribuido).",
            primitivas: [
              { t: "circulo", c: [45, 50], r: 9, cor: "destaque", hachura: true },
              { t: "linha", de: [45, 50], ate: [20, 90], cor: "suave" },
              { t: "linha", de: [45, 50], ate: [45, 95], cor: "suave" },
              { t: "linha", de: [45, 50], ate: [72, 90], cor: "suave" },
              { t: "circulo", c: [20, 95], r: 5, cor: "tinta" },
              { t: "circulo", c: [45, 100], r: 5, cor: "tinta" },
              { t: "circulo", c: [72, 95], r: 5, cor: "tinta" },
              { t: "rotulo", p: [18, 120], texto: "Centralizado" },
              { t: "circulo", c: [150, 55], r: 7, cor: "destaque" },
              { t: "circulo", c: [130, 100], r: 7, cor: "destaque" },
              { t: "circulo", c: [172, 100], r: 7, cor: "destaque" },
              { t: "linha", de: [150, 62], ate: [130, 93], cor: "tinta" },
              { t: "linha", de: [150, 62], ate: [172, 93], cor: "tinta" },
              { t: "linha", de: [137, 100], ate: [165, 100], cor: "tinta" },
              { t: "rotulo", p: [122, 122], texto: "Descentralizado" },
              { t: "circulo", c: [245, 55], r: 5, cor: "suave" },
              { t: "circulo", c: [225, 95], r: 5, cor: "suave" },
              { t: "circulo", c: [265, 95], r: 5, cor: "suave" },
              { t: "circulo", c: [245, 110], r: 5, cor: "suave" },
              { t: "linha", de: [245, 55], ate: [225, 95], cor: "suave" },
              { t: "linha", de: [245, 55], ate: [265, 95], cor: "suave" },
              { t: "linha", de: [225, 95], ate: [265, 95], cor: "suave" },
              { t: "linha", de: [225, 95], ate: [245, 110], cor: "suave" },
              { t: "linha", de: [265, 95], ate: [245, 110], cor: "suave" },
              { t: "linha", de: [245, 55], ate: [245, 110], cor: "suave" },
              { t: "rotulo", p: [226, 130], texto: "Distribuido" },
            ],
          },
        },
        { tipo: "texto", texto: "Descentralizar nao e abolir estrutura: e distribuir autoridade por dominio. Cada circulo decide o que e dele; o que afeta todos sobe para uma instancia comum. A pergunta pratica nao e 'quem manda', e sim 'quem tem autoridade sobre isto, e ate onde'." },
        {
          tipo: "licao",
          pergunta: "Qual a diferenca entre governanca descentralizada e distribuida?",
          alternativas: [
            "Nao ha diferenca, sao sinonimos",
            "Na descentralizada ha papeis e circulos com autonomia por dominio; na distribuida todos os nos tem peso igual e se ligam a todos",
            "A distribuida sempre tem um chefe oculto",
          ],
          correta: 1,
          explicacao: "Descentralizada reparte autoridade entre circulos autonomos ligados por acordos. Distribuida nivela todos os nos. Comunidades duraveis costumam ser descentralizadas, com papeis claros.",
        },
      ],
    },
    {
      id: "mitos-sem-chefe",
      titulo: "O mito de que 'sem chefe' significa 'sem regras'",
      blocos: [
        { tipo: "texto", texto: "O erro mais comum de grupo novo e achar que horizontalidade dispensa estrutura. Jo Freeman, em 'A tirania da falta de estrutura' (1972), mostrou o contrario: quando o grupo nega ter estrutura, ela nao some, so fica invisivel. Quem tem tempo, voz e rede de amizade passa a mandar de fato, sem ninguem ter escolhido. A informalidade vira privilegio de uns poucos." },
        { tipo: "texto", texto: "A licao e dura: igualdade de poder nao nasce da ausencia de regra, nasce de regra explicita e combinada. Quem decide o que, como se entra na conversa, quanto tempo cada um fala, como se registra a decisao. Estrutura clara e o que protege o grupo da dominacao silenciosa. Este caderno escreve essa estrutura em voz alta." },
        {
          tipo: "diagrama", titulo: "Por que a falta de estrutura falha", codigo: `flowchart TD
  A["'Nao temos regras nem papeis'"] --> B["Estrutura informal continua existindo"]
  B --> C["Quem tem tempo e rede domina"]
  C --> D["Decisao sem registro e sem prestacao de contas"]
  D --> E["Frustracao e saida dos que nao tem voz"]
  A2["Regra explicita e combinada"] --> F["Papel, metodo e registro claros"]
  F --> G["Poder distribuido e prestacao de contas"]` },
        {
          tipo: "licao",
          pergunta: "Segundo Jo Freeman, o que acontece quando um grupo diz nao ter estrutura?",
          alternativas: [
            "O poder se distribui igualmente de forma automatica",
            "A estrutura fica invisivel e quem tem tempo e rede passa a dominar sem ser escolhido",
            "O grupo decide mais rapido por nao ter regras",
          ],
          correta: 1,
          explicacao: "A 'tirania da falta de estrutura' ensina que estrutura informal nao desaparece: ela escapa do controle coletivo. Regra explicita e o que protege a igualdade de poder.",
        },
      ],
    },

    // ===================== CAPITULO 2 — LER A COMUNIDADE =====================
    {
      id: "mapear-fronteira",
      titulo: "Ler a comunidade: quem e membro e pode decidir",
      blocos: [
        { tipo: "texto", texto: "O primeiro principio de desenho de Ostrom e tambem o primeiro passo deste caderno: fronteiras claras. E preciso saber quem pertence a comunidade e tem direito de usar o recurso e de decidir, e qual e o limite do recurso ou do escopo. Sem fronteira, qualquer um reivindica, ninguem se responsabiliza e a decisao nao tem dono. Antes de qualquer voto, responda: quem e membro, como se entra, como se sai." },
        {
          tipo: "prancha",
          titulo: "A fronteira define quem decide",
          desenho: {
            legenda: "O circulo grande e a comunidade (membros que decidem). Fora dele, apoiadores e afetados que opinam mas nao votam. A linha pontilhada e a porta de entrada combinada.",
            primitivas: [
              { t: "circulo", c: [120, 100], r: 70, cor: "tinta" },
              { t: "rotulo", p: [78, 55], texto: "Membros (decidem)" },
              { t: "circulo", c: [110, 95], r: 8, cor: "destaque", hachura: true },
              { t: "circulo", c: [140, 110], r: 8, cor: "destaque", hachura: true },
              { t: "circulo", c: [100, 125], r: 8, cor: "destaque", hachura: true },
              { t: "circulo", c: [150, 80], r: 8, cor: "destaque", hachura: true },
              { t: "linha", de: [120, 30], ate: [120, 55], cor: "suave" },
              { t: "rotulo", p: [128, 28], texto: "Porta de entrada" },
              { t: "circulo", c: [240, 70], r: 6, cor: "suave" },
              { t: "circulo", c: [255, 120], r: 6, cor: "suave" },
              { t: "rotulo", p: [210, 150], texto: "Afetados (opinam)" },
            ],
          },
        },
        { tipo: "texto", texto: "Fronteira nao e muro para excluir: e clareza para responsabilizar. Um grupo pode ter varios circulos concentricos: nucleo que decide, colaboradores que executam, afetados que sao consultados. O que nao pode e a confusao de 'todo mundo decide tudo', que na pratica vira 'ninguem decide nada' ou 'os de sempre decidem'." },
        {
          tipo: "licao",
          pergunta: "Por que fronteiras claras sao o primeiro principio de Ostrom para governar o comum?",
          alternativas: [
            "Para impedir que novas pessoas entrem no grupo",
            "Para definir quem usa, quem decide e quem se responsabiliza, dando dono a decisao",
            "Porque a lei obriga toda comunidade a ter um cadastro",
          ],
          correta: 1,
          explicacao: "Sem saber quem e membro e qual o limite do recurso, nao ha como atribuir direitos nem responsabilidades. A fronteira da legitimidade e autoria a decisao coletiva.",
        },
      ],
    },
    {
      id: "mapa-poder",
      titulo: "Mapa de poder e interesse",
      blocos: [
        { tipo: "texto", texto: "Antes de decidir, mapeie quem tem poder e quem tem interesse na questao. Uma matriz simples de poder (alto/baixo) por interesse (alto/baixo) mostra quem precisa decidir, quem precisa ser consultado, quem precisa ser informado e quem so precisa ser monitorado. Ignorar um ator de alto poder vira bloqueio depois; ignorar um de alto interesse e baixo poder vira injustica e revolta." },
        {
          tipo: "prancha",
          titulo: "Matriz poder x interesse",
          desenho: {
            legenda: "Quatro quadrantes. Eixo horizontal: interesse (baixo a esquerda, alto a direita). Eixo vertical: poder (baixo embaixo, alto em cima).",
            primitivas: [
              { t: "linha", de: [40, 20], ate: [40, 170], cor: "tinta" },
              { t: "linha", de: [40, 170], ate: [280, 170], cor: "tinta" },
              { t: "linha", de: [160, 20], ate: [160, 170], cor: "suave" },
              { t: "linha", de: [40, 95], ate: [280, 95], cor: "suave" },
              { t: "rotulo", p: [48, 60], texto: "Satisfazer" },
              { t: "rotulo", p: [170, 55], texto: "Decidir junto" },
              { t: "rotulo", p: [48, 135], texto: "Monitorar" },
              { t: "rotulo", p: [170, 135], texto: "Informar/consultar" },
              { t: "rotulo", p: [8, 90], texto: "Poder" },
              { t: "rotulo", p: [200, 180], texto: "Interesse" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "mp1", titulo: "Listar os atores", entrega: "Lista de pessoas, grupos e instituicoes que afetam ou sao afetados pela decisao em estudo." },
          { id: "mp2", titulo: "Posicionar na matriz", entrega: "Cada ator colocado num quadrante poder x interesse, com a estrategia (decidir junto, consultar, informar, monitorar)." },
          { id: "mp3", titulo: "Definir o circulo que decide", entrega: "Quem efetivamente vota esta decisao e quem apenas opina, registrado por escrito antes da reuniao." },
        ] },
      ],
    },
    {
      id: "tipos-de-decisao",
      titulo: "Nem tudo se decide junto: tipos de decisao",
      blocos: [
        { tipo: "texto", texto: "Decidir tudo em assembleia esgota o grupo e trava a acao. A chave e separar decisao operacional de decisao politica. Operacional: do dia a dia, reversivel, dentro de um papel ja combinado (que horas abrir, qual fornecedor). Politica: muda as regras, gasta muito, afeta todos, e dificil de desfazer (mudar o estatuto, admitir socio, vender um bem). A operacional delega-se a um papel; a politica leva-se ao coletivo." },
        {
          tipo: "diagrama", titulo: "Triagem: quem decide isto?", codigo: `flowchart TD
  A["Chegou uma decisao"] --> B{"Muda as regras ou afeta todos?"}
  B -->|Sim| C{"E facil de desfazer?"}
  B -->|Nao, e do dia a dia| D["Papel responsavel decide e registra"]
  C -->|Sim, reversivel| E["Decide-se rapido, por consentimento"]
  C -->|Nao, custosa/irreversivel| F["Vai ao coletivo: consenso ou votacao qualificada"]` },
        {
          tipo: "licao",
          pergunta: "Por que separar decisao operacional de decisao politica?",
          alternativas: [
            "Para que o grupo vote em absolutamente tudo e ninguem se sinta excluido",
            "Para delegar o reversivel e do dia a dia a papeis, e reservar o coletivo para o que muda regras e afeta todos",
            "Porque decisao operacional nao precisa de registro",
          ],
          correta: 1,
          explicacao: "Levar tudo a assembleia causa fadiga e paralisia. Delegar o operacional a papeis libera o coletivo para o que e politico, custoso ou irreversivel. Delegar nao e abdicar: o papel presta contas.",
        },
      ],
    },
    {
      id: "escada-participacao",
      titulo: "A escada da participacao: consultar nao e decidir",
      blocos: [
        { tipo: "texto", texto: "Participacao tem graus, e confundi-los gera frustracao. Sherry Arnstein (1969) desenhou a 'escada da participacao cidada', dos degraus de nao-participacao ate o controle cidadao. Versao moderna e util: informar, consultar, envolver, colaborar, delegar poder. Chamar de 'decisao coletiva' o que foi so uma consulta e a receita da desconfianca: as pessoas opinam, a decisao sai pronta de outro lugar, e ninguem mais aparece na proxima." },
        {
          tipo: "prancha",
          titulo: "Cinco degraus de participacao",
          desenho: {
            legenda: "Do mais raso (informar) ao mais profundo (delegar poder). Quanto mais alto o degrau, mais poder real a comunidade tem sobre o resultado.",
            primitivas: [
              { t: "retangulo", p: [30, 150], w: 90, h: 20, cor: "suave" },
              { t: "rotulo", p: [40, 164], texto: "1 Informar" },
              { t: "retangulo", p: [60, 125], w: 90, h: 20, cor: "suave" },
              { t: "rotulo", p: [70, 139], texto: "2 Consultar" },
              { t: "retangulo", p: [90, 100], w: 90, h: 20, cor: "suave", hachura: true },
              { t: "rotulo", p: [100, 114], texto: "3 Envolver" },
              { t: "retangulo", p: [120, 75], w: 90, h: 20, cor: "destaque" },
              { t: "rotulo", p: [128, 89], texto: "4 Colaborar" },
              { t: "retangulo", p: [150, 50], w: 100, h: 20, cor: "destaque", hachura: true },
              { t: "rotulo", p: [156, 64], texto: "5 Delegar poder" },
              { t: "seta", de: [20, 165], ate: [20, 55], cor: "tinta" },
              { t: "rotulo", p: [6, 40], texto: "+ poder" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual o risco de chamar de 'decisao coletiva' o que foi apenas uma consulta?",
          alternativas: [
            "Nenhum, consulta e decisao sao a mesma coisa",
            "Gera desconfianca: as pessoas opinam, a decisao vem pronta de outro lugar e param de participar",
            "O grupo passa a decidir rapido demais",
          ],
          correta: 1,
          explicacao: "Cada degrau da escada promete um nivel de poder. Prometer decisao e entregar so consulta quebra a confianca e esvazia a participacao futura. Seja honesto sobre o degrau.",
        },
      ],
    },

    // ===================== CAPITULO 3 — METODO =====================
    {
      id: "familias-de-metodo",
      titulo: "As tres familias de metodo de decisao",
      blocos: [
        { tipo: "texto", texto: "Quase todo metodo cabe em tres familias. Votacao: conta-se a preferencia e vence um limiar (maioria, dois tercos). Consenso: constroi-se uma proposta que todos possam aceitar; decide quando nao ha mais objecao de fundo. Consentimento (sociocracia): decide quando ninguem tem objecao razoavel e segura, mesmo que nao seja a preferida de todos. A diferenca pratica e a pergunta: votacao pergunta 'voce prefere?'; consenso pergunta 'voce apoia?'; consentimento pergunta 'voce ve um risco real em tentar?'." },
        {
          tipo: "diagrama", titulo: "Votacao x consenso x consentimento", codigo: `flowchart LR
  P["Proposta"] --> V["Votacao: conta preferencias; vence o limiar"]
  P --> C["Consenso: ajusta ate todos poderem apoiar"]
  P --> S["Consentimento: segue se nao ha objecao razoavel"]
  V --> R1["Rapido, mas cria maioria e minoria"]
  C --> R2["Une o grupo, mas pode ser lento"]
  S --> R3["Rapido e inclusivo: 'bom o suficiente por agora'"]` },
        { tipo: "texto", texto: "Nenhuma familia e melhor sempre. Votacao brilha quando ha muita gente e tempo curto. Consenso brilha quando a coesao importa mais que a velocidade. Consentimento brilha no dia a dia de times, porque troca a busca do ideal pela pergunta 'e seguro o suficiente para tentar e revisar depois?'. Comunidades maduras usam as tres, conforme o tipo de decisao." },
      ],
    },
    {
      id: "consenso-processo",
      titulo: "Consenso: o processo em sete passos",
      blocos: [
        { tipo: "texto", texto: "Consenso formal nao e 'conversar ate cansar'. O guia da Seeds for Change (coletivo britanico de facilitacao) descreve sete passos: 1) introduzir e esclarecer a questao; 2) abrir a discussao para sentimentos e necessidades antes de solucoes; 3) explorar ideias amplamente; 4) formar uma proposta por sintese; 5) emendar a proposta para atender preocupacoes; 6) testar o acordo; 7) combinar como implementar. A regra de ouro: solucao so depois de entender o problema de todo mundo." },
        {
          tipo: "prancha",
          titulo: "O funil do consenso",
          desenho: {
            legenda: "A discussao abre (muitas vozes e ideias), explora as diferencas, e depois converge numa proposta que todos possam apoiar. Abre, explora, converge.",
            primitivas: [
              { t: "linha", de: [40, 30], ate: [150, 100], cor: "tinta" },
              { t: "linha", de: [260, 30], ate: [150, 100], cor: "tinta" },
              { t: "linha", de: [150, 100], ate: [150, 160], cor: "tinta" },
              { t: "rotulo", p: [60, 25], texto: "1-3 Abrir e explorar" },
              { t: "circulo", c: [80, 55], r: 4, cor: "suave" },
              { t: "circulo", c: [150, 45], r: 4, cor: "suave" },
              { t: "circulo", c: [215, 55], r: 4, cor: "suave" },
              { t: "rotulo", p: [95, 95], texto: "4-5 Sintese e emenda" },
              { t: "circulo", c: [150, 120], r: 6, cor: "destaque", hachura: true },
              { t: "rotulo", p: [100, 170], texto: "6-7 Testar e implementar" },
            ],
          },
        },
        { tipo: "fontes", titulo: "O metodo do consenso", itens: [
          { titulo: "Seeds for Change — Consensus Decision Making", url: "https://www.seedsforchange.org.uk/consensus", tipo: "site", nota: "Guia pratico com os 7 passos, facilitacao e fluxograma do consenso." },
          { titulo: "Wikipedia — Consensus decision-making", url: "https://en.wikipedia.org/wiki/Consensus_decision-making", tipo: "artigo", nota: "Historia (movimentos nao-violentos dos anos 1960-70), bloqueio e stand-aside." },
        ] },
      ],
    },
    {
      id: "bloqueio-standaside",
      titulo: "Bloqueio, stand-aside e o metodo quacre",
      blocos: [
        { tipo: "texto", texto: "No consenso, as respostas a uma proposta formam uma escala. Concordar: apoio. Reserva: apoio com ressalva registrada. Stand-aside (ficar de lado): nao apoio e nao vou ajudar, mas nao impeco o grupo; costuma contar como um 'nao' forte, e o grupo em geral ajusta a proposta. Bloqueio: paro a proposta inteira. O bloqueio e poderoso e, por isso, tem regra de uso responsavel: so em questao fundamental ou de missao, e idealmente com alternativa junto. Vetar por capricho e uso irresponsavel." },
        {
          tipo: "prancha",
          titulo: "A escala de respostas no consenso",
          desenho: {
            legenda: "Da esquerda (apoio total) a direita (bloqueio). Stand-aside e reserva ficam no meio: nao impedem, mas pedem ajuste.",
            primitivas: [
              { t: "linha", de: [20, 100], ate: [285, 100], cor: "tinta" },
              { t: "circulo", c: [35, 100], r: 6, cor: "destaque", hachura: true },
              { t: "rotulo", p: [18, 120], texto: "Concordo" },
              { t: "circulo", c: [110, 100], r: 6, cor: "suave" },
              { t: "rotulo", p: [92, 120], texto: "Reserva" },
              { t: "circulo", c: [185, 100], r: 6, cor: "suave" },
              { t: "rotulo", p: [160, 78], texto: "Stand-aside" },
              { t: "circulo", c: [270, 100], r: 7, cor: "tinta", hachura: true },
              { t: "rotulo", p: [250, 120], texto: "Bloqueio" },
            ],
          },
        },
        { tipo: "texto", texto: "Os quacres praticam ha seculos uma forma de consenso com um lema preciso: 'unidade, nao unanimidade'. Um facilitador chamado clerk escuta, nomeia os pontos de acordo e de desacordo, e propoe uma 'minuta' que registra o sentido do grupo. Nao se busca que todos amem a decisao; busca-se que o grupo, como um todo, possa segui-la. Dissidentes podem ficar de lado ou, em ultimo caso, bloquear." },
        {
          tipo: "licao",
          pergunta: "O que significa o lema quacre 'unidade, nao unanimidade'?",
          alternativas: [
            "Todos precisam concordar plenamente com cada detalhe",
            "Busca-se um sentido comum que o grupo possa seguir, mesmo sem todos amarem a decisao",
            "A maioria simples sempre vence e a minoria se cala",
          ],
          correta: 1,
          explicacao: "Unidade e o grupo poder caminhar junto; unanimidade seria amor de todos a cada virgula. O clerk nomeia acordos e desacordos e registra uma minuta que expressa o sentido coletivo.",
        },
      ],
    },
    {
      id: "consentimento-objecao",
      titulo: "Consentimento e objecao: o motor da sociocracia",
      blocos: [
        { tipo: "texto", texto: "A sociocracia troca 'voce concorda?' por 'voce tem objecao?'. Uma decisao passa quando nao resta nenhuma objecao razoavel e fundamentada. Objecao nao e preferencia pessoal nem 'eu gostaria diferente': e um argumento de que a proposta, como esta, atrapalha o grupo de cumprir seu objetivo, ou traz um risco real. O criterio pratico e lindo: a proposta nao precisa ser a melhor possivel, precisa ser 'boa o suficiente por agora e segura o suficiente para tentar', porque sempre da para revisar." },
        {
          tipo: "diagrama", titulo: "Rodada de consentimento", codigo: `flowchart TD
  A["Apresentar a proposta"] --> B["Rodada de esclarecimento: perguntas"]
  B --> C["Rodada de reacoes rapidas"]
  C --> D["Rodada de objecoes"]
  D --> E{"Ha objecao razoavel?"}
  E -->|Nao| F["Decidido: boa o suficiente por agora"]
  E -->|Sim| G["Integrar a objecao: ajustar a proposta"]
  G --> D` },
        {
          tipo: "licao",
          pergunta: "Na sociocracia, o que conta como uma objecao valida?",
          alternativas: [
            "Qualquer preferencia pessoal de quem fala",
            "Um argumento de que a proposta atrapalha o grupo de cumprir o objetivo ou traz risco real",
            "O voto contrario da maioria dos presentes",
          ],
          correta: 1,
          explicacao: "Objecao e fundamentada no objetivo comum, nao no gosto individual. Por isso o consentimento decide rapido: filtra ruido e integra so o que e risco real, revisando depois.",
        },
        { tipo: "fontes", titulo: "Consentimento e sociocracia", itens: [
          { titulo: "Sociocracy 3.0 — The Seven Principles", url: "https://sociocracy30.org/the-details/principles/", tipo: "site", nota: "Consentimento, empirismo, melhoria continua, eficacia, equivalencia, transparencia, responsabilidade." },
          { titulo: "Wikipedia — Sociocracy", url: "https://en.wikipedia.org/wiki/Sociocracy", tipo: "artigo", nota: "Consentimento, circulos, duplo-elo e eleicoes por consentimento; Gerard Endenburg e Kees Boeke." },
        ] },
      ],
    },
    {
      id: "circulos-duplo-elo",
      titulo: "Circulos e duplo-elo: como ligar os grupos",
      blocos: [
        { tipo: "texto", texto: "A sociocracia organiza a comunidade em circulos semi-autonomos, cada um dono de um dominio (comunicacao, financas, obras). Dentro do circulo, decide-se por consentimento. Para ligar um circulo ao de cima sem criar chefia, usa-se o duplo-elo: dois elos sentam nos dois circulos. O lider operacional desce do circulo superior; o representante sobe do circulo inferior, eleito por consentimento. Assim a informacao e o poder fluem nos dois sentidos, formando um laco de feedback, nao uma piramide." },
        {
          tipo: "prancha",
          titulo: "Duplo-elo entre circulos",
          desenho: {
            legenda: "O circulo geral no topo e dois circulos de trabalho embaixo. Cada ligacao tem duas pessoas: lider que desce e representante que sobe (as duas setas).",
            primitivas: [
              { t: "circulo", c: [150, 50], r: 28, cor: "tinta" },
              { t: "rotulo", p: [120, 50], texto: "Circulo geral" },
              { t: "circulo", c: [75, 140], r: 26, cor: "destaque" },
              { t: "rotulo", p: [52, 140], texto: "Financas" },
              { t: "circulo", c: [225, 140], r: 26, cor: "destaque" },
              { t: "rotulo", p: [208, 140], texto: "Obras" },
              { t: "seta", de: [135, 72], ate: [90, 118], cor: "tinta" },
              { t: "seta", de: [85, 118], ate: [130, 72], cor: "suave" },
              { t: "seta", de: [165, 72], ate: [210, 118], cor: "tinta" },
              { t: "seta", de: [215, 118], ate: [170, 72], cor: "suave" },
              { t: "rotulo", p: [95, 95], texto: "desce/sobe" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Para que serve o duplo-elo entre circulos na sociocracia?",
          alternativas: [
            "Para criar uma chefia unica no topo",
            "Para ligar os circulos com fluxo de poder e informacao nos dois sentidos, sem piramide de mando",
            "Para que o circulo de baixo nunca influencie o de cima",
          ],
          correta: 1,
          explicacao: "O lider desce e o representante sobe, ambos participando dos dois circulos. Isso forma um laco de feedback: o circulo de baixo tem voz no de cima, e vice-versa.",
        },
      ],
    },
    {
      id: "votacao-metodos",
      titulo: "Votacao: maioria nao e o unico jeito de contar",
      blocos: [
        { tipo: "texto", texto: "Quando se vota, o metodo de contagem muda o vencedor. Maioria simples: vence quem tem mais votos (pode vencer com 30% se houver muitos candidatos). Maioria absoluta: mais da metade. Supermaioria: dois tercos ou tres quartos, para decisoes graves. Votacao por aprovacao: cada um marca todos os que aprova, vence o mais aprovado. Metodo de Condorcet: compara os candidatos dois a dois e vence quem ganha de todos os outros. Cada regra premia um tipo de consenso diferente; escolha-a antes, nunca depois de ver o resultado." },
        {
          tipo: "prancha",
          titulo: "O mesmo grupo, metodos diferentes",
          desenho: {
            legenda: "Tres urnas para a mesma eleicao. Maioria simples pode eleger um candidato rejeitado por 60%; aprovacao e Condorcet tendem a eleger o mais aceito por todos.",
            primitivas: [
              { t: "retangulo", p: [25, 70], w: 60, h: 70, cor: "tinta" },
              { t: "rotulo", p: [20, 155], texto: "Maioria simples" },
              { t: "rotulo", p: [40, 100], texto: "+votos" },
              { t: "retangulo", p: [120, 70], w: 60, h: 70, cor: "destaque", hachura: true },
              { t: "rotulo", p: [122, 155], texto: "Aprovacao" },
              { t: "rotulo", p: [128, 100], texto: "+aceito" },
              { t: "retangulo", p: [215, 70], w: 60, h: 70, cor: "destaque" },
              { t: "rotulo", p: [218, 155], texto: "Condorcet" },
              { t: "rotulo", p: [220, 100], texto: "1x1" },
              { t: "rotulo", p: [60, 45], texto: "Mesma vontade, urnas diferentes" },
            ],
          },
        },
        { tipo: "fontes", titulo: "Procedimento e metodos de voto", itens: [
          { titulo: "Robert's Rules of Order (site oficial)", url: "https://robertsrules.com/", tipo: "livro", nota: "Referencia classica de procedimento parlamentar: mocoes, quorum, maioria, desde 1876." },
          { titulo: "RadicalxChange — Quadratic Voting", url: "https://www.radicalxchange.org/concepts/plural-voting/", tipo: "artigo", nota: "Voto quadratico: creditos de voz convertidos pela raiz quadrada, para expressar intensidade." },
        ] },
      ],
    },

    // ===================== CAPITULO 4 — CALCULO / MEDICAO =====================
    {
      id: "quorum-limiar",
      titulo: "Quorum e limiar: a matematica do 'passou'",
      blocos: [
        { tipo: "texto", texto: "Duas contas decidem se uma decisao vale. Quorum: o minimo de membros presentes para que a reuniao possa decidir (ex.: metade mais um dos membros, ou um numero fixo). Sem quorum, nao se decide, so se conversa. Limiar (ou maioria exigida): a fracao de votos a favor necessaria para aprovar (metade mais um, dois tercos, consenso). Quorum protege contra decisao de um punhado se passando pelo grupo; limiar calibra o quanto de acordo cada tipo de decisao exige." },
        {
          tipo: "prancha",
          titulo: "Quorum x limiar, passo a passo",
          desenho: {
            legenda: "Primeiro conta-se presenca (quorum atingido?). So entao conta-se o voto a favor contra o limiar exigido para aquele tipo de decisao.",
            primitivas: [
              { t: "retangulo", p: [20, 40], w: 110, h: 50, cor: "suave" },
              { t: "rotulo", p: [28, 30], texto: "1. Quorum" },
              { t: "rotulo", p: [26, 68], texto: "Presentes >= minimo?" },
              { t: "seta", de: [130, 65], ate: [175, 65], cor: "tinta" },
              { t: "retangulo", p: [175, 40], w: 110, h: 50, cor: "destaque", hachura: true },
              { t: "rotulo", p: [183, 30], texto: "2. Limiar" },
              { t: "rotulo", p: [181, 68], texto: "A favor >= fracao?" },
              { t: "rotulo", p: [40, 120], texto: "Quorum baixo = poucos decidem por todos" },
              { t: "rotulo", p: [40, 140], texto: "Limiar alto = exige mais acordo" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual a diferenca entre quorum e limiar?",
          alternativas: [
            "Sao a mesma coisa com nomes diferentes",
            "Quorum e o minimo de presentes para poder decidir; limiar e a fracao de votos a favor para aprovar",
            "Quorum vale so para eleicoes e limiar so para orcamento",
          ],
          correta: 1,
          explicacao: "Quorum valida a reuniao (gente suficiente na sala); limiar valida a decisao (acordo suficiente na votacao). Decisao grave costuma pedir quorum maior e limiar mais alto.",
        },
      ],
    },
    {
      id: "contagem-exemplo",
      titulo: "Contagem na pratica: um exemplo numerico",
      blocos: [
        { tipo: "texto", texto: "Imagine 30 membros, quorum de 16 e tres propostas para um fundo: A (horta), B (biblioteca), C (praca). Na maioria simples por voto unico: A 12, B 10, C 8; vence A, mesmo com 18 (60%) preferindo outra coisa. Na votacao por aprovacao, cada um marca todas que aceita: A 19, B 22, C 14; vence B, a mais aceita pelo conjunto. Em Condorcet, B ganha de A e de C nos confrontos diretos. Mesma gente, resultados diferentes: por isso a regra de contagem e uma escolha politica, definida antes." },
        {
          tipo: "diagrama", titulo: "Tres contagens, tres vencedores", codigo: `flowchart TD
  U["30 membros, 3 propostas"] --> M["Maioria simples (voto unico)"]
  U --> A["Aprovacao (marca todas que aceita)"]
  U --> C["Condorcet (confronto 1 a 1)"]
  M --> M2["Vence A com 12, mesmo com 60% preferindo outra"]
  A --> A2["Vence B, a mais aceita por todos"]
  C --> C2["Vence B, que ganha de A e de C"]` },
        { tipo: "tarefas", itens: [
          { id: "ct1", titulo: "Escolher a regra antes", entrega: "Metodo de contagem (maioria, 2/3, aprovacao, Condorcet) definido e registrado na pauta, antes de qualquer voto." },
          { id: "ct2", titulo: "Simular com dados reais", entrega: "Planilha com os votos de uma decisao passada recontados por dois metodos, mostrando se o vencedor mudaria." },
          { id: "ct3", titulo: "Publicar o apuramento", entrega: "Resultado com numero de presentes, quorum, votos por opcao e metodo usado, visivel a todos os membros." },
        ] },
      ],
    },
    {
      id: "voto-quadratico",
      titulo: "Voto quadratico: medir intensidade, nao so contar cabecas",
      blocos: [
        { tipo: "texto", texto: "Um voto por pessoa trata todas as questoes como igualmente importantes para cada um, o que raramente e verdade. O voto quadratico, formalizado por Glen Weyl e divulgado pela RadicalxChange, da a cada pessoa um orcamento de creditos de voz para gastar entre varias questoes. O numero de votos em uma questao e a raiz quadrada dos creditos gastos: 1 credito = 1 voto, 4 creditos = 2 votos, 9 creditos = 3 votos. Concentrar poder numa so pauta fica caro, o que obriga a revelar a intensidade real da preferencia e protege a minoria que se importa muito com um tema especifico." },
        {
          tipo: "prancha",
          titulo: "O custo cresce com o quadrado",
          desenho: {
            legenda: "Para dar 1, 2, 3, 4 votos numa mesma questao gasta-se 1, 4, 9, 16 creditos. As barras mostram o custo subindo depressa: cada voto extra custa mais que o anterior.",
            primitivas: [
              { t: "linha", de: [30, 165], ate: [285, 165], cor: "tinta" },
              { t: "linha", de: [30, 20], ate: [30, 165], cor: "tinta" },
              { t: "retangulo", p: [50, 157], w: 26, h: 8, cor: "destaque", hachura: true },
              { t: "rotulo", p: [52, 178], texto: "1v=1" },
              { t: "retangulo", p: [110, 133], w: 26, h: 32, cor: "destaque", hachura: true },
              { t: "rotulo", p: [112, 178], texto: "2v=4" },
              { t: "retangulo", p: [170, 93], w: 26, h: 72, cor: "destaque", hachura: true },
              { t: "rotulo", p: [172, 178], texto: "3v=9" },
              { t: "retangulo", p: [230, 37], w: 26, h: 128, cor: "destaque", hachura: true },
              { t: "rotulo", p: [228, 178], texto: "4v=16" },
              { t: "rotulo", p: [8, 90], texto: "creditos" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "O que o voto quadratico tenta capturar que o voto simples ignora?",
          alternativas: [
            "A idade dos votantes",
            "A intensidade da preferencia: quanto cada pessoa realmente se importa com cada questao",
            "A ordem alfabetica das propostas",
          ],
          correta: 1,
          explicacao: "Como cada voto extra custa o quadrado, concentrar forca num tema e caro. Isso revela quem se importa de verdade e evita que a maioria morna atropele a minoria intensa.",
        },
        { tipo: "fontes", titulo: "Intensidade e novos metodos", itens: [
          { titulo: "RadicalxChange — Quadratic Voting", url: "https://www.radicalxchange.org/concepts/plural-voting/", tipo: "artigo", nota: "Creditos de voz, regra da raiz quadrada e expressao de intensidade." },
          { titulo: "ethereum.org — What is a DAO?", url: "https://ethereum.org/en/dao/", tipo: "site", nota: "Governanca por propostas e voto; financiamento quadratico aparece em comunidades cripto." },
        ] },
      ],
    },
    {
      id: "medir-participacao",
      titulo: "Medir a participacao: a legitimidade tem numero",
      blocos: [
        { tipo: "texto", texto: "Legitimidade nao se declara, se mede. Indicadores simples dizem se a decisao foi de fato coletiva: taxa de presenca (presentes sobre membros), diversidade de quem fala (quantas pessoas diferentes se manifestaram, nao so as de sempre), tempo medio de fala por pessoa, proporcao de decisoes delegadas contra levadas ao coletivo, e intervalo entre quem propoe e quem executa. Um grupo onde 3 pessoas falam 80% do tempo e horizontal so no nome." },
        {
          tipo: "prancha",
          titulo: "Quem fala quanto: o grafico que o grupo evita olhar",
          desenho: {
            legenda: "Barras do tempo de fala por pessoa numa reuniao. Tres barras enormes e muitas minusculas e sinal de captura da conversa por poucos.",
            primitivas: [
              { t: "linha", de: [30, 160], ate: [285, 160], cor: "tinta" },
              { t: "retangulo", p: [40, 60], w: 20, h: 100, cor: "tinta", hachura: true },
              { t: "retangulo", p: [70, 75], w: 20, h: 85, cor: "tinta", hachura: true },
              { t: "retangulo", p: [100, 95], w: 20, h: 65, cor: "tinta", hachura: true },
              { t: "retangulo", p: [130, 140], w: 20, h: 20, cor: "suave" },
              { t: "retangulo", p: [160, 145], w: 20, h: 15, cor: "suave" },
              { t: "retangulo", p: [190, 148], w: 20, h: 12, cor: "suave" },
              { t: "retangulo", p: [220, 150], w: 20, h: 10, cor: "suave" },
              { t: "rotulo", p: [38, 45], texto: "Poucos dominam" },
              { t: "rotulo", p: [150, 120], texto: "Maioria quase muda" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "pt1", titulo: "Cronometrar uma reuniao", entrega: "Registro de quantas pessoas falaram e quanto tempo cada uma, numa reuniao real, para ver a distribuicao da voz." },
          { id: "pt2", titulo: "Painel de participacao", entrega: "Quadro com presenca por reuniao, numero de pessoas que propuseram e taxa de decisoes delegadas, atualizado a cada encontro." },
          { id: "pt3", titulo: "Meta de inclusao", entrega: "Uma meta mensuravel (ex.: nenhuma pessoa fala mais de 20% do tempo; toda reuniao tem rodada em que todos falam) acordada pelo grupo." },
        ] },
      ],
    },

    // ===================== CAPITULO 5 — PROJETO =====================
    {
      id: "desenhar-governanca",
      titulo: "Desenhar a governanca: dos principios as regras",
      blocos: [
        { tipo: "texto", texto: "Projetar governanca e descer do principio a regra concreta. Principio: 'quem e afetado participa das regras' (equivalencia, na sociocracia; terceiro principio de Ostrom: escolha coletiva). Regra: 'mudancas no estatuto exigem assembleia com quorum de 2/3 e aprovacao por consentimento'. O erro e ficar so no principio bonito; o oposto e encher de regra sem principio. Comece pelos poucos principios que o grupo abraca e derive deles cada regra, para que a regra seja explicavel." },
        {
          tipo: "diagrama", titulo: "Do principio a regra operavel", codigo: `flowchart TD
  P["Principio: afetados participam das regras"] --> R1["Regra: assembleia decide mudanca de estatuto"]
  P --> R2["Regra: quorum de 2/3 para mudar regra basica"]
  P2["Principio: decisao reversivel e rapida"] --> R3["Regra: operacional por consentimento no circulo"]
  P3["Principio: prestacao de contas"] --> R4["Regra: toda decisao registrada em ata publica"]` },
        { tipo: "texto", texto: "Tres camadas ajudam: valores (o que importa), regras (o que vale) e acordos operacionais (como fazemos). Valores quase nao mudam; regras mudam com quorum alto; acordos operacionais mudam facil, por consentimento no circulo. Separar as camadas evita que o grupo precise de assembleia para trocar a marca do cafe e, ao mesmo tempo, protege o essencial de mudancas no calor do momento." },
      ],
    },
    {
      id: "papeis-dominios",
      titulo: "Papeis, dominios e prestacao de contas",
      blocos: [
        { tipo: "texto", texto: "Descentralizar e distribuir papeis com autoridade clara. A Holacracy (Constitution v5) define papel por tres coisas: proposito (para que existe), dominios (o que ele controla sozinho) e accountabilities (atividades continuas pelas quais responde). Quem ocupa o papel e o lead daquele papel e age em nome da organizacao, nao em nome proprio. Papel nao e pessoa: a mesma pessoa pode ter varios papeis, e um papel pode trocar de ocupante sem trauma, porque o que ele faz esta escrito." },
        {
          tipo: "prancha",
          titulo: "Anatomia de um papel",
          desenho: {
            legenda: "Um papel tem proposito (para que), dominio (o que controla) e accountabilities (o que entrega sempre). A pessoa preenche o papel; se sair, o papel permanece.",
            primitivas: [
              { t: "retangulo", p: [90, 20], w: 120, h: 30, cor: "tinta" },
              { t: "rotulo", p: [100, 38], texto: "Proposito: para que" },
              { t: "retangulo", p: [40, 70], w: 100, h: 30, cor: "destaque", hachura: true },
              { t: "rotulo", p: [48, 88], texto: "Dominio: controla" },
              { t: "retangulo", p: [165, 70], w: 110, h: 30, cor: "destaque", hachura: true },
              { t: "rotulo", p: [170, 88], texto: "Accountabilities" },
              { t: "linha", de: [150, 50], ate: [90, 70], cor: "suave" },
              { t: "linha", de: [150, 50], ate: [215, 70], cor: "suave" },
              { t: "circulo", c: [150, 135], r: 16, cor: "tinta" },
              { t: "rotulo", p: [133, 160], texto: "Pessoa (lead)" },
              { t: "linha", de: [150, 119], ate: [150, 100], cor: "suave" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Por que separar o papel da pessoa que o ocupa?",
          alternativas: [
            "Para que ninguem precise se responsabilizar por nada",
            "Porque o papel (proposito, dominio, accountabilities) fica escrito e continua existindo mesmo quando troca de ocupante",
            "Para concentrar todos os papeis numa unica pessoa",
          ],
          correta: 1,
          explicacao: "Com o papel definido, a autoridade e clara, a transicao de pessoas e suave e a prestacao de contas e objetiva: cobra-se o papel, nao o humor de quem o ocupa.",
        },
        { tipo: "fontes", titulo: "Papeis e estrutura", itens: [
          { titulo: "Holacracy Constitution v5.0", url: "https://www.holacracy.org/constitution/", tipo: "norma", nota: "Define papel (proposito, dominios, accountabilities), circulos e reunioes de governanca." },
          { titulo: "Sociocracy 3.0 — The Seven Principles", url: "https://sociocracy30.org/the-details/principles/", tipo: "site", nota: "Equivalencia e responsabilidade como base para distribuir papeis." },
        ] },
      ],
    },
    {
      id: "matriz-autoridade",
      titulo: "Quem decide o que: a matriz de autoridade",
      blocos: [
        { tipo: "texto", texto: "A ferramenta que acaba com 'achei que era voce quem decidia' e a matriz de autoridade. Para cada tipo de decisao, defina o nivel: decide sozinho, decide apos consultar, decide por consentimento do circulo, decide por votacao da assembleia. Escreva numa tabela: linha = tipo de decisao; coluna = quem decide e como. Uma variacao conhecida e o modelo consultivo: qualquer um pode decidir desde que consulte os afetados e quem tem expertise, assumindo a responsabilidade pelo resultado." },
        {
          tipo: "prancha",
          titulo: "Tabela: decisao x quem decide",
          desenho: {
            legenda: "Cada linha e uma decisao; a marca indica o nivel de autoridade. Compra pequena: papel decide so. Mudar estatuto: assembleia. Admitir membro: circulo por consentimento.",
            primitivas: [
              { t: "linha", de: [20, 40], ate: [285, 40], cor: "tinta" },
              { t: "linha", de: [20, 75], ate: [285, 75], cor: "suave" },
              { t: "linha", de: [20, 110], ate: [285, 110], cor: "suave" },
              { t: "linha", de: [160, 25], ate: [160, 145], cor: "suave" },
              { t: "rotulo", p: [24, 20], texto: "Decisao" },
              { t: "rotulo", p: [168, 20], texto: "Quem decide" },
              { t: "rotulo", p: [24, 60], texto: "Compra pequena" },
              { t: "rotulo", p: [168, 60], texto: "Papel, sozinho" },
              { t: "rotulo", p: [24, 95], texto: "Admitir membro" },
              { t: "rotulo", p: [168, 95], texto: "Circulo (consent.)" },
              { t: "rotulo", p: [24, 130], texto: "Mudar estatuto" },
              { t: "rotulo", p: [168, 130], texto: "Assembleia 2/3" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "ma1", titulo: "Listar as decisoes tipicas", entrega: "Lista das 10 a 20 decisoes que o grupo mais enfrenta, da compra de material a mudanca de regra." },
          { id: "ma2", titulo: "Atribuir nivel a cada uma", entrega: "Para cada decisao, o nivel de autoridade (sozinho, consulta, consentimento, votacao) acordado e registrado." },
          { id: "ma3", titulo: "Publicar e testar por 1 mes", entrega: "Matriz afixada e usada por um mes, com anotacao dos casos em que gerou duvida, para ajuste." },
        ] },
      ],
    },
    {
      id: "acordo-estatuto",
      titulo: "Escrever o acordo do grupo (e quando vira estatuto)",
      blocos: [
        { tipo: "texto", texto: "Toda comunidade deveria ter um acordo escrito: proposito, quem e membro, como se entra e sai, quais os circulos e papeis, como se decide cada tipo de questao, como se muda o proprio acordo e como se resolve conflito. Para um coletivo informal, isso pode ser um documento de uma pagina, revisavel. Mas, quando o grupo movimenta dinheiro, contrata, aluga ou emite recibo, ele precisa de personalidade juridica: associacao ou cooperativa, com estatuto registrado, CNPJ e regras fiscais. Ai o acordo informal nao basta." },
        { tipo: "tarefas", itens: [
          { id: "ae1", titulo: "Rascunhar o acordo de uma pagina", entrega: "Documento curto com proposito, membros, circulos, como se decide e como se muda o acordo, aprovado pelo grupo." },
          { id: "ae2", titulo: "Definir a clausula de mudanca", entrega: "Regra explicita de como alterar o proprio acordo (quorum e limiar), para o documento nao virar letra morta nem refem de poucos." },
          { id: "ae3", titulo: "Decidir se precisa de CNPJ", entrega: "Avaliacao registrada: o grupo vai movimentar dinheiro, contratar ou emitir documento fiscal? Se sim, abrir trilha juridica." },
        ] },
        { tipo: "mobilizacao", papel: "Advogado(a) e contador(a) para constituicao de associacao ou cooperativa", porque: "Registrar estatuto, obter CNPJ, cumprir obrigacoes fiscais e trabalhistas e enquadrar a cooperativa (Lei 5.764/1971, no Brasil) exige profissional habilitado. Estatuto mal feito trava a comunidade em cartorio e no banco, e pode gerar passivo.", entregaEsperada: "Estatuto registrado em cartorio, CNPJ ativo, enquadramento fiscal adequado e um guia simples de obrigacoes periodicas para o grupo cumprir sem depender sempre do escritorio.", gerenciadoPor: "zaeon" },
      ],
    },
    {
      id: "ferramentas-digitais",
      titulo: "Ferramentas: decidir junto tambem a distancia",
      blocos: [
        { tipo: "texto", texto: "Reuniao presencial nao escala para todo mundo nem para toda hora. Ferramentas digitais de decisao dao a cada questao um espaco proprio para contexto, discussao e voto com justificativa registrada, e deixam a decisao rastreavel depois. O Loomio, criado por uma cooperativa de trabalhadores na Nova Zelandia e usado por sindicatos, conselhos, cohousing e movimentos, foi desenhado justamente para isso: separar a decisao importante do caos do chat e do e-mail. O valor nao e o app, e o habito de registrar proposta, prazo, resultado e proximo passo." },
        {
          tipo: "diagrama", titulo: "Ciclo de uma decisao online", codigo: `flowchart LR
  A["Pergunta com contexto"] --> B["Discussao com todos"]
  B --> C["Proposta com prazo"]
  C --> D["Voto com justificativa"]
  D --> E["Resultado registrado e proximo passo"]
  E --> F["Fica buscavel: por que decidimos assim"]` },
        { tipo: "fontes", titulo: "Decisao assincrona", itens: [
          { titulo: "Loomio — software de decisao em grupo", url: "https://www.loomio.com/", tipo: "site", nota: "Codigo aberto, feito por cooperativa; discussao, proposta, voto com razao e registro do resultado." },
        ] },
      ],
    },

    // ===================== CAPITULO 6 — EXECUCAO =====================
    {
      id: "facilitar-reuniao",
      titulo: "Facilitar a reuniao que decide",
      blocos: [
        { tipo: "texto", texto: "A reuniao e onde a governanca vira ou nao vira decisao. O papel do facilitador nao e opinar, e cuidar do processo: abrir com o objetivo claro, conduzir por rodadas em que cada um fala uma vez antes de qualquer um falar duas, segurar quem domina e trazer quem se cala, testar o acordo e fechar com quem faz o que ate quando. Facilitar e um papel rotativo e aprendivel, nao um dom. Separar facilitacao de conteudo e o que impede a reuniao de virar palco de uma pessoa so." },
        {
          tipo: "diagrama", titulo: "Anatomia de uma reuniao de decisao", codigo: `flowchart TD
  A["Abertura: objetivo e pauta"] --> B["Check-in rapido: todos dizem uma palavra"]
  B --> C["Apresentacao do tema"]
  C --> D["Rodada: cada um fala uma vez"]
  D --> E["Proposta e teste de acordo"]
  E --> F["Decisao e quem faz o que ate quando"]
  F --> G["Check-out e ata publicada"]` },
        {
          tipo: "licao",
          pergunta: "Qual e a funcao central do facilitador numa reuniao de decisao?",
          alternativas: [
            "Defender a melhor proposta com todos os argumentos",
            "Cuidar do processo: rodadas, equilibrio de voz, teste de acordo e fechamento, sem puxar o conteudo",
            "Decidir sozinho quando o grupo demora",
          ],
          correta: 1,
          explicacao: "Facilitador neutro no conteudo garante que o metodo seja seguido e que todos tenham voz. Misturar facilitar e defender tese transforma a reuniao em palanque.",
        },
      ],
    },
    {
      id: "pauta-rodadas",
      titulo: "Pauta, rodadas e sinais de mao",
      blocos: [
        { tipo: "texto", texto: "Tres tecnicas simples elevam muito a qualidade. Pauta com tempo: cada item tem objetivo (informar, discutir ou decidir) e minutos, enviada antes. Rodadas: fala-se em volta, um de cada vez, o que iguala o espaco e tira o peso de interromper. Sinais de mao: gestos combinados para agilizar sem cortar ninguem (maos levantadas tremulando para concordar, um dedo para entrar na fila, gesto de 'direto ao ponto'). Grandes assembleias usam cartoes coloridos para mostrar a opcao escolhida de longe." },
        {
          tipo: "prancha",
          titulo: "Sinais de mao combinados",
          desenho: {
            legenda: "Exemplos de sinais: maos tremulando para cima (concordo), um dedo (quero falar), dois dedos (resposta direta), mao em T (ponto de processo).",
            primitivas: [
              { t: "circulo", c: [50, 60], r: 18, cor: "destaque", hachura: true },
              { t: "rotulo", p: [26, 95], texto: "Concordo" },
              { t: "circulo", c: [120, 60], r: 18, cor: "suave" },
              { t: "rotulo", p: [98, 95], texto: "Quero falar" },
              { t: "circulo", c: [190, 60], r: 18, cor: "suave" },
              { t: "rotulo", p: [160, 95], texto: "Resposta direta" },
              { t: "circulo", c: [258, 60], r: 18, cor: "tinta" },
              { t: "rotulo", p: [232, 95], texto: "Ponto de processo" },
              { t: "rotulo", p: [40, 130], texto: "Sinais agilizam sem calar ninguem" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "pr1", titulo: "Montar a pauta com tempo", entrega: "Pauta enviada antes, com objetivo (informar/discutir/decidir) e minutos por item." },
          { id: "pr2", titulo: "Combinar os sinais", entrega: "Cartaz com 4 a 6 sinais de mao acordados pelo grupo, visivel na sala ou no video." },
          { id: "pr3", titulo: "Rodar uma reuniao por rodadas", entrega: "Uma reuniao conduzida inteiramente por rodadas e sinais, com avaliacao curta do grupo ao final." },
        ] },
      ],
    },
    {
      id: "assembleia-grande",
      titulo: "Conduzir uma assembleia grande: o spokescouncil",
      blocos: [
        { tipo: "texto", texto: "Consenso com 200 pessoas numa sala e inviavel por conversa aberta. A solucao dos grandes movimentos e o spokescouncil (conselho de porta-vozes): o grande grupo se divide em grupos de afinidade de 5 a 15 pessoas; cada grupo discute e manda um porta-voz (spoke) ao circulo central; os porta-vozes negociam, voltam ao seu grupo para consultar e retornam. O porta-voz nao decide sozinho: ele carrega a voz do grupo. Assim, milhares decidem sem perder a deliberacao de perto." },
        {
          tipo: "prancha",
          titulo: "Spokescouncil: grupos e porta-vozes",
          desenho: {
            legenda: "No centro, o circulo de porta-vozes. Ao redor, os grupos de afinidade. Cada grupo manda um spoke ao centro e o traz de volta para consultar.",
            primitivas: [
              { t: "circulo", c: [150, 100], r: 30, cor: "tinta" },
              { t: "rotulo", p: [118, 100], texto: "Porta-vozes" },
              { t: "circulo", c: [150, 30], r: 16, cor: "destaque" },
              { t: "circulo", c: [230, 70], r: 16, cor: "destaque" },
              { t: "circulo", c: [235, 150], r: 16, cor: "destaque" },
              { t: "circulo", c: [150, 175], r: 16, cor: "destaque" },
              { t: "circulo", c: [65, 150], r: 16, cor: "destaque" },
              { t: "circulo", c: [60, 70], r: 16, cor: "destaque" },
              { t: "seta", de: [150, 46], ate: [150, 70], cor: "suave" },
              { t: "seta", de: [216, 80], ate: [178, 95], cor: "suave" },
              { t: "seta", de: [150, 159], ate: [150, 130], cor: "suave" },
              { t: "seta", de: [79, 140], ate: [122, 110], cor: "suave" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "No spokescouncil, qual o papel do porta-voz (spoke)?",
          alternativas: [
            "Decidir sozinho em nome do grupo, sem consultar",
            "Carregar a voz do grupo de afinidade ao circulo central e voltar para consultar antes de fechar",
            "Apenas anotar a ata da reuniao central",
          ],
          correta: 1,
          explicacao: "O spoke e porta-voz, nao representante com poder proprio: negocia no centro, mas volta ao grupo para consultar. Isso mantem a deliberacao de perto mesmo com milhares de pessoas.",
        },
      ],
    },
    {
      id: "orcamento-participativo",
      titulo: "Orcamento participativo: o povo decide onde vai o dinheiro",
      blocos: [
        { tipo: "texto", texto: "O caso mais estudado de decisao coletiva sobre recurso publico nasceu em Porto Alegre, em 1989: o orcamento participativo (OP). A comunidade decide, em assembleias, parte do orcamento da cidade. O ciclo tem plenarias regionais onde moradores priorizam necessidades, voto ponderado que da mais peso as regioes com maior carencia, e delegados eleitos para um Conselho do Orcamento Participativo (COP) que detalha as obras. O modelo foi reconhecido pela ONU-Habitat em 1996 e se espalhou por milhares de cidades, de Paris a mais de 100 municipios em Portugal." },
        {
          tipo: "diagrama", titulo: "O ciclo anual do orcamento participativo", codigo: `flowchart TD
  A["Plenarias regionais: moradores priorizam"] --> B["Voto ponderado por carencia da regiao"]
  B --> C["Eleicao de delegados ao Conselho (COP)"]
  C --> D["Conselho detalha obras e distribui recursos"]
  D --> E["Execucao e prestacao de contas"]
  E --> F["Nova rodada no ano seguinte"]
  F --> A` },
        { tipo: "fontes", titulo: "Orcamento participativo", itens: [
          { titulo: "Participatory Budgeting Project — Learn About PB", url: "https://www.participatorybudgeting.org/about-pb/", tipo: "site", nota: "Definicao, origem em Porto Alegre (1989) e difusao para mais de 7.000 cidades." },
          { titulo: "Wikipedia (pt) — Orcamento participativo", url: "https://pt.wikipedia.org/wiki/Or%C3%A7amento_participativo", tipo: "artigo", nota: "Plenarias regionais, voto ponderado, Conselho do OP e reconhecimento da ONU-Habitat em 1996." },
        ] },
      ],
    },

    // ===================== CAPITULO 7 — MANUTENCAO =====================
    {
      id: "conflito-poder",
      titulo: "Lidar com conflito e poder informal",
      blocos: [
        { tipo: "texto", texto: "Conflito nao e falha da governanca, e materia-prima dela. O perigo nao e discordar, e o conflito nao ter para onde ir: vira fofoca, panelinha e saida silenciosa. Toda comunidade precisa de um caminho combinado para desacordo: primeiro a conversa direta entre os envolvidos; se nao resolve, um terceiro de confianca media; se persiste, vai a um circulo ou instancia com regra clara. Separe o problema da pessoa, foque no comportamento e no acordo, e registre o que foi combinado." },
        {
          tipo: "prancha",
          titulo: "Escada do conflito: por onde ele sobe",
          desenho: {
            legenda: "Degraus do mais leve ao mais pesado: conversa direta, mediacao por um terceiro, circulo com regra, e por fim instancia formal. Resolver cedo e mais barato.",
            primitivas: [
              { t: "retangulo", p: [30, 140], w: 95, h: 22, cor: "suave" },
              { t: "rotulo", p: [36, 155], texto: "1 Conversa direta" },
              { t: "retangulo", p: [70, 108], w: 95, h: 22, cor: "suave", hachura: true },
              { t: "rotulo", p: [76, 123], texto: "2 Mediacao" },
              { t: "retangulo", p: [110, 76], w: 95, h: 22, cor: "destaque" },
              { t: "rotulo", p: [116, 91], texto: "3 Circulo com regra" },
              { t: "retangulo", p: [150, 44], w: 110, h: 22, cor: "tinta", hachura: true },
              { t: "rotulo", p: [156, 59], texto: "4 Instancia formal" },
              { t: "seta", de: [20, 158], ate: [20, 48], cor: "tinta" },
              { t: "rotulo", p: [6, 36], texto: "+custo" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual o maior risco do conflito numa comunidade que decide junto?",
          alternativas: [
            "As pessoas discordarem abertamente numa reuniao",
            "O conflito nao ter caminho combinado e virar fofoca, panelinha e saida silenciosa",
            "Existir um facilitador conduzindo a conversa",
          ],
          correta: 1,
          explicacao: "Desacordo e normal e util. O que adoece o grupo e o conflito sem rota: sem conversa direta, mediacao e instancia, ele vaza para os bastidores e corroi a confianca.",
        },
      ],
    },
    {
      id: "revisar-regras",
      titulo: "Revisar as regras: sancoes graduadas e resolucao barata",
      blocos: [
        { tipo: "texto", texto: "Ostrom observou que comunidades duraveis nao punem com mao pesada na primeira falta: usam sancoes graduadas (principio 5). A primeira infracao e uma conversa; a reincidencia, uma sancao leve; so a teimosia repetida pesa. E ela mostrou (principio 6) que essas comunidades tem meios rapidos e baratos de resolver conflito, perto das pessoas, sem depender de um tribunal distante. Regra que so existe no papel nao governa: o que governa e o monitoramento (principio 4) feito por quem usa o recurso, prestando contas ao grupo." },
        {
          tipo: "prancha",
          titulo: "Sancao graduada: a punicao cresce com a reincidencia",
          desenho: {
            legenda: "Primeira falta: conversa. Segunda: advertencia. Terceira: sancao leve. Reincidencia teimosa: sancao pesada. A escada evita expulsar quem erra uma vez.",
            primitivas: [
              { t: "linha", de: [25, 165], ate: [285, 165], cor: "tinta" },
              { t: "retangulo", p: [40, 140], w: 30, h: 25, cor: "suave" },
              { t: "rotulo", p: [36, 182], texto: "Conversa" },
              { t: "retangulo", p: [100, 110], w: 30, h: 55, cor: "suave", hachura: true },
              { t: "rotulo", p: [96, 182], texto: "Advert." },
              { t: "retangulo", p: [160, 75], w: 30, h: 90, cor: "destaque" },
              { t: "rotulo", p: [160, 182], texto: "Leve" },
              { t: "retangulo", p: [220, 40], w: 30, h: 125, cor: "tinta", hachura: true },
              { t: "rotulo", p: [218, 182], texto: "Pesada" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "O que sao as sancoes graduadas de Ostrom?",
          alternativas: [
            "Expulsar da comunidade qualquer um que infrinja uma regra pela primeira vez",
            "Punicoes que crescem com a reincidencia: conversa primeiro, sancao pesada so para a teimosia repetida",
            "Multas fixas iguais para toda e qualquer falta",
          ],
          correta: 1,
          explicacao: "A gradacao preserva a confianca: quem erra uma vez e orientado, nao banido. So a infracao repetida e deliberada escala a sancao. Isso sustenta a cooperacao no longo prazo.",
        },
        { tipo: "fontes", titulo: "Principios de desenho de Ostrom", itens: [
          { titulo: "Wikipedia — Elinor Ostrom", url: "https://en.wikipedia.org/wiki/Elinor_Ostrom", tipo: "artigo", nota: "Os 8 principios de desenho (fronteiras, escolha coletiva, monitoramento, sancao graduada, resolucao de conflito, direito de organizar, estruturas aninhadas) e o Nobel de 2009." },
        ] },
      ],
    },
    {
      id: "evitar-captura",
      titulo: "Evitar captura, plutocracia e fadiga",
      blocos: [
        { tipo: "texto", texto: "Governanca descentralizada tem tres doencas tipicas. Captura: um grupinho domina os cargos e as pautas, muitas vezes por estar sempre presente. Plutocracia: quando o poder segue o dinheiro ou os tokens, quem tem mais manda mais (risco classico de DAOs com voto por token). Fadiga: reuniao demais, decisao de menos, e as pessoas somem. Os antidotos sao concretos: rotatividade de papeis e facilitacao, mandatos com prazo, limite de concentracao de voto, delegar o operacional, e cortar impiedosamente reuniao que nao decide." },
        { tipo: "tarefas", itens: [
          { id: "ec1", titulo: "Instituir rotatividade", entrega: "Regra de mandato com prazo e rodizio para papeis-chave (facilitacao, secretaria, porta-voz), registrada no acordo." },
          { id: "ec2", titulo: "Limitar concentracao", entrega: "Mecanismo contra captura/plutocracia (teto de votos por pessoa, voto quadratico, ou cota de cargos), discutido e decidido pelo grupo." },
          { id: "ec3", titulo: "Auditar a fadiga", entrega: "Revisao trimestral que corta reunioes sem objetivo de decisao e move o operacional para papeis, com meta de menos tempo em reuniao." },
        ] },
      ],
    },
    {
      id: "federar-aninhado",
      titulo: "Governanca aninhada: federar grupos sem recriar um chefe",
      blocos: [
        { tipo: "texto", texto: "O oitavo principio de Ostrom trata do que acontece quando a comunidade cresce ou se liga a outras: a governanca se organiza em camadas aninhadas, cada uma cuidando do que e seu e federando-se para o que e comum. Um circulo de bairro decide o do bairro; uma federacao de bairros decide o que atravessa fronteiras (a bacia do rio, a feira regional). A chave e a subsidiariedade: a decisao fica no nivel mais baixo capaz de resolve-la, e so sobe o que aquele nivel nao consegue. Federar nao e recriar um comando central: e ligar autonomias." },
        {
          tipo: "prancha",
          titulo: "Camadas aninhadas e subsidiariedade",
          desenho: {
            legenda: "Circulos pequenos (grupos locais) dentro de um medio (federacao) dentro de um grande (rede). A decisao fica no menor circulo capaz de resolve-la.",
            primitivas: [
              { t: "circulo", c: [150, 100], r: 85, cor: "tinta" },
              { t: "rotulo", p: [120, 30], texto: "Rede" },
              { t: "circulo", c: [150, 110], r: 52, cor: "suave" },
              { t: "rotulo", p: [122, 70], texto: "Federacao" },
              { t: "circulo", c: [130, 120], r: 16, cor: "destaque", hachura: true },
              { t: "circulo", c: [172, 118], r: 16, cor: "destaque", hachura: true },
              { t: "circulo", c: [150, 148], r: 16, cor: "destaque", hachura: true },
              { t: "rotulo", p: [112, 118], texto: "local" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "O que diz o principio da subsidiariedade na governanca aninhada?",
          alternativas: [
            "Toda decisao deve subir ao nivel mais alto da federacao",
            "A decisao fica no nivel mais baixo capaz de resolve-la; so sobe o que esse nivel nao consegue",
            "Cada grupo local perde autonomia ao se federar",
          ],
          correta: 1,
          explicacao: "Subsidiariedade mantem a decisao perto de quem vive o problema e reserva as instancias superiores para o que de fato atravessa fronteiras. Assim se federa sem recriar um comando central.",
        },
      ],
    },

    // ===================== CAPITULO 8 — CASOS REAIS =====================
    {
      id: "casos-comuns",
      titulo: "Casos reais: pescarias, aguas e florestas",
      blocos: [
        { tipo: "texto", texto: "Ostrom nao teorizou no vacuo: estudou casos que funcionam ha seculos. Os campos comunais e pastagens dos Alpes suicos (Toerbel) e as hortas e irrigacoes compartilhadas definem quem usa, quanto e quando, com monitoramento mutuo. As huertas e os tribunais das aguas de Valencia, na Espanha, resolvem conflito de irrigacao em dias, perto das pessoas, ha mais de 500 anos. Pescarias costeiras geridas pelos proprios pescadores regulam temporada e area para nao esgotar o cardume. Em todas, os usuarios fazem e fiscalizam as proprias regras." },
        { tipo: "texto", texto: "A licao transversal e que o comum nao precisa virar tragedia nem exige dono unico. Onde ha fronteira clara, regra feita por quem usa, monitoramento de perto, sancao graduada e um jeito barato de resolver briga, a cooperacao se sustenta por geracoes. O que destroi nao e a ausencia de Estado nem de mercado: e a ausencia de regra legitima e fiscalizada pela propria comunidade." },
        { tipo: "fontes", titulo: "O comum que da certo", itens: [
          { titulo: "Wikipedia — Elinor Ostrom (Governing the Commons, 1990)", url: "https://en.wikipedia.org/wiki/Elinor_Ostrom", tipo: "artigo", nota: "Casos de Toerbel, Valencia e pescarias; os 8 principios extraidos de comunidades reais." },
          { titulo: "What is the tragedy of the commons? (TED-Ed)", url: "https://www.youtube.com/watch?v=CxC161GvMPc", tipo: "video", nota: "Introducao ao problema do comum que a autogovernanca de Ostrom resolve." },
        ] },
      ],
    },
    {
      id: "casos-organizacoes",
      titulo: "Casos reais: Zapatistas, cooperativas, Buurtzorg e quacres",
      blocos: [
        { tipo: "texto", texto: "A decisao descentralizada aparece em formas bem diferentes. Os Zapatistas, em Chiapas, no Mexico, governam por 'mandar obedecendo': quem assume cargo executa o que a assembleia decidiu, e pode ser revogado. As cooperativas seguem os 7 principios da Alianca Cooperativa Internacional, com 'um membro, um voto', independente do capital de cada um. A Buurtzorg, rede holandesa de enfermagem domiciliar, opera com milhares de profissionais em equipes auto-organizadas e estrutura minima de chefia, inspirada em ideias proximas da sociocracia. Os quacres decidem ha seculos por consenso, buscando 'unidade, nao unanimidade'." },
        {
          tipo: "licao",
          pergunta: "O que o principio cooperativista 'um membro, um voto' garante?",
          alternativas: [
            "Que quem investiu mais dinheiro tenha mais votos",
            "Que o poder de decisao seja igual entre os membros, independente do capital de cada um",
            "Que so o conselho diretor possa votar",
          ],
          correta: 1,
          explicacao: "No controle democratico dos membros (2o principio da ICA), a cooperativa primaria da a cada membro um voto igual, desligando o poder de decisao do tamanho do aporte financeiro.",
        },
        { tipo: "fontes", titulo: "Formas de decidir junto", itens: [
          { titulo: "ICA — Cooperative identity, values and principles", url: "https://ica.coop/en/cooperatives/cooperative-identity", tipo: "norma", nota: "Os 7 principios cooperativistas, incluindo 'um membro, um voto' no controle democratico." },
          { titulo: "Wikipedia — Sociocracy (Buurtzorg, Endenburg)", url: "https://en.wikipedia.org/wiki/Sociocracy", tipo: "artigo", nota: "Equipes auto-organizadas e influencia da sociocracia; historia do metodo." },
        ] },
      ],
    },
    {
      id: "casos-dao",
      titulo: "Casos reais: DAOs e a governanca que vira codigo",
      blocos: [
        { tipo: "texto", texto: "As DAOs (organizacoes autonomas descentralizadas) tentam escrever a governanca em contratos inteligentes: regras executadas por codigo, tesouro que so se move com aprovacao do grupo, decisoes por proposta e voto. Ha modelos distintos: por token (poder segue quem tem o token, como na MakerDAO), por reputacao (poder vem da participacao comprovada, nao comprada, como na DXdao), por cotas (entra quem contribui e pode sair com sua parte) e por delegacao (o token-holder passa o voto a um representante, como nos delegados da ENS). A execucao pode ser automatica ao atingir quorum e maioria, ou via carteira multisig de membros publicos de confianca." },
        {
          tipo: "diagrama", titulo: "Como uma DAO decide", codigo: `flowchart TD
  A["Membro cria proposta"] --> B["Periodo de discussao"]
  B --> C["Votacao on-chain (token, reputacao ou cota)"]
  C --> D{"Atingiu quorum e maioria?"}
  D -->|Sim| E["Execucao automatica ou por multisig"]
  D -->|Nao| F["Proposta rejeitada ou revista"]` },
        { tipo: "texto", texto: "O risco gritante do voto por token e a plutocracia: quem acumula tokens acumula poder, e baleias decidem por todos. Por isso comunidades cripto experimentam reputacao nao-transferivel, delegacao e financiamento quadratico, que encarece a concentracao. A licao para qualquer comunidade, com ou sem blockchain, e a mesma do caderno inteiro: o metodo de contar define quem manda, e escrever a regra no codigo nao dispensa pensar na justica da regra." },
        { tipo: "fontes", titulo: "Governanca em DAOs", itens: [
          { titulo: "ethereum.org — What is a DAO?", url: "https://ethereum.org/en/dao/", tipo: "site", nota: "Modelos de membresia e voto: token, reputacao, cota, delegacao; execucao automatica ou multisig." },
          { titulo: "RadicalxChange — Quadratic Voting", url: "https://www.radicalxchange.org/concepts/plural-voting/", tipo: "artigo", nota: "Antidoto a plutocracia: encarecer a concentracao de voto para revelar intensidade." },
        ] },
      ],
    },
    {
      id: "mobilizar-dao",
      titulo: "Quando a governanca vira sistema: mobilizar o tecnico",
      blocos: [
        { tipo: "texto", texto: "Levar a governanca para um sistema digital com dinheiro envolvido (um contrato inteligente, uma tesouraria multisig, um app de voto que move fundos) deixa de ser so desenho social e vira engenharia de risco. Erro de codigo em contrato que guarda dinheiro nao se desfaz: ja houve DAO que perdeu dezenas de milhoes por uma falha. Antes de confiar decisao e recurso a codigo, o grupo precisa de revisao e auditoria por quem entende seguranca, alem de clareza juridica sobre o que esse arranjo significa no pais do grupo." },
        { tipo: "mobilizacao", papel: "Desenvolvedor(a) de contrato inteligente e auditoria de seguranca", porque: "Codigo que custodia fundos e executa decisoes precisa de revisao independente: falhas sao irreversiveis e exploraveis. A comunidade decide o 'o que'; o 'como seguro' exige especialista que audite o contrato e a carteira multisig.", entregaEsperada: "Contrato e fluxo de voto auditados, relatorio de vulnerabilidades com correcoes aplicadas, carteira multisig configurada com signatarios e limites claros, e documentacao que o grupo entenda.", gerenciadoPor: "zaeon" },
        {
          tipo: "licao",
          pergunta: "Por que 'escrever a regra no codigo' nao dispensa cuidado?",
          alternativas: [
            "Porque codigo sempre e justo e neutro",
            "Porque erro em contrato que guarda dinheiro e irreversivel e exploravel, e a regra ainda pode ser injusta",
            "Porque o codigo substitui a necessidade de qualquer decisao humana",
          ],
          correta: 1,
          explicacao: "Automatizar a execucao nao torna a regra justa nem o codigo seguro. Por isso a decisao social (qual regra) e separada da engenharia (codigo auditado), e esta exige profissional.",
        },
      ],
    },

    // ===================== CAPITULO 9 — RECURSOS E SINTESE =====================
    {
      id: "recursos",
      titulo: "Recursos, trilha de estudo e proximos passos",
      blocos: [
        { tipo: "texto", texto: "Para continuar: comece pequeno. Escolha uma unica decisao real do seu grupo e rode-a uma vez por consentimento, com pauta, rodadas e ata publicada. Depois escreva o acordo de uma pagina. So entao pense em ferramenta digital ou personalidade juridica. Leitura de base: Ostrom para o comum, Seeds for Change para o consenso, a sociocracia para o consentimento e os circulos, e os casos de orcamento participativo para a escala da cidade. A regra do caderno vale ate o fim: todo metodo tem autor, toda regra tem norma ou caso, e toda etapa que pede profissional mostra quem chamar." },
        { tipo: "fontes", titulo: "Caixa de ferramentas de quem decide junto", itens: [
          { titulo: "Wikipedia — Elinor Ostrom", url: "https://en.wikipedia.org/wiki/Elinor_Ostrom", tipo: "artigo", nota: "Os 8 principios de desenho do comum e o Nobel de Economia de 2009." },
          { titulo: "Seeds for Change — Consensus Decision Making", url: "https://www.seedsforchange.org.uk/consensus", tipo: "site", nota: "Guia pratico de consenso: 7 passos, facilitacao, fluxograma, grandes grupos." },
          { titulo: "Wikipedia — Consensus decision-making", url: "https://en.wikipedia.org/wiki/Consensus_decision-making", tipo: "artigo", nota: "Bloqueio, stand-aside, metodo quacre e historia do consenso." },
          { titulo: "Sociocracy 3.0 — The Seven Principles", url: "https://sociocracy30.org/the-details/principles/", tipo: "site", nota: "Padroes abertos (CC) de consentimento, circulos e melhoria continua." },
          { titulo: "Wikipedia — Sociocracy", url: "https://en.wikipedia.org/wiki/Sociocracy", tipo: "artigo", nota: "Consentimento, circulos, duplo-elo e eleicoes por consentimento." },
          { titulo: "Holacracy Constitution v5.0", url: "https://www.holacracy.org/constitution/", tipo: "norma", nota: "Papeis, dominios, accountabilities e reunioes de governanca." },
          { titulo: "ICA — Cooperative identity, values and principles", url: "https://ica.coop/en/cooperatives/cooperative-identity", tipo: "norma", nota: "Os 7 principios cooperativistas e o 'um membro, um voto'." },
          { titulo: "Robert's Rules of Order (oficial)", url: "https://robertsrules.com/", tipo: "livro", nota: "Procedimento parlamentar: mocoes, quorum e maioria desde 1876." },
          { titulo: "RadicalxChange — Quadratic Voting", url: "https://www.radicalxchange.org/concepts/plural-voting/", tipo: "artigo", nota: "Voto quadratico e expressao de intensidade de preferencia." },
          { titulo: "Participatory Budgeting Project", url: "https://www.participatorybudgeting.org/about-pb/", tipo: "site", nota: "Orcamento participativo: origem, metodo e difusao mundial." },
          { titulo: "Loomio — software de decisao em grupo", url: "https://www.loomio.com/", tipo: "site", nota: "Decisao assincrona com proposta, voto justificado e registro." },
          { titulo: "ethereum.org — What is a DAO?", url: "https://ethereum.org/en/dao/", tipo: "site", nota: "Governanca por proposta e voto; modelos de membresia e execucao." },
        ] },
      ],
    },

    // ===================== SINTESE =====================
    {
      id: "compilado",
      titulo: "Prancha de sintese",
      blocos: [
        { tipo: "texto", texto: "O caminho inteiro em uma respiracao: entender por que decidir sem chefe unico (Ostrom contra a tragedia dos comuns) e que horizontalidade exige estrutura explicita (Jo Freeman); ler a comunidade definindo fronteira, mapa de poder, tipo de decisao e degrau de participacao; escolher o metodo entre as tres familias (votacao, consenso, consentimento), com bloqueio e stand-aside, objecao razoavel e circulos com duplo-elo; medir com numero (quorum, limiar, contagem, voto quadratico, participacao); projetar dos principios as regras, com papeis, matriz de autoridade e acordo escrito; executar com facilitacao, rodadas, sinais, spokescouncil e orcamento participativo; manter com rota de conflito, sancoes graduadas, antidotos a captura e governanca aninhada; e aprender com os casos reais, das huertas de Valencia as DAOs. Cada metodo tem autor, cada regra tem norma ou caso citado na propria pagina, e cada etapa que exige um profissional (estatuto juridico, auditoria de contrato) mostra quem chamar e o que ele entrega. Decidir junto nao e sorte nem caos: e metodo, medida e acordo." },
        { tipo: "compilado" },
      ],
    },
  ],
};
