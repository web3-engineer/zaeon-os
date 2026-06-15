// constants/universities.ts
//
// Instituições públicas de ensino superior do Brasil — universidades FEDERAIS,
// universidades ESTADUAIS e INSTITUTOS FEDERAIS (IFs/CEFET). Usado pelo seletor
// de universidade do onboarding/convite e para casar o e-mail acadêmico (.edu.br)
// que libera o mês grátis (ver lib/eduEligibility.ts).
//
// Campos:
//  - kind:   "federal" | "estadual" | "instituto_federal"
//  - domain: domínio institucional principal (para detectar o e-mail acadêmico)
//  - logoPath: opcional; quando ausente, a UI usa fallback (ui-avatars).
//  - color:  opcional; quando ausente, deriva da cor padrão do tipo.

export type UniversityKind = "federal" | "estadual" | "instituto_federal";

export interface BrazilianUniversity {
  id: string;
  name: string;
  acronym: string;
  state: string;
  city: string;
  kind: UniversityKind;
  domain: string;
  website?: string;
  logoPath: string;
  color: string;
  isPartner: boolean;
}

// Entrada "crua" (color/logoPath/website/isPartner opcionais — preenchidos no build).
type RawUniversity = Omit<BrazilianUniversity, "logoPath" | "color" | "isPartner"> & {
  logoPath?: string;
  color?: string;
  website?: string;
  isPartner?: boolean;
};

const KIND_COLOR: Record<UniversityKind, string> = {
  federal: "#1A237E",            // azul institucional
  estadual: "#4A148C",           // roxo
  instituto_federal: "#1B5E20",  // verde
};

const RAW: RawUniversity[] = [
  // ─────────────────── UNIVERSIDADES FEDERAIS ───────────────────
  // Norte
  { id: "ufac", name: "Universidade Federal do Acre", acronym: "UFAC", state: "AC", city: "Rio Branco", kind: "federal", domain: "ufac.br", website: "https://www.ufac.br" },
  { id: "ufam", name: "Universidade Federal do Amazonas", acronym: "UFAM", state: "AM", city: "Manaus", kind: "federal", domain: "ufam.edu.br", website: "https://www.ufam.edu.br" },
  { id: "unifap", name: "Universidade Federal do Amapá", acronym: "UNIFAP", state: "AP", city: "Macapá", kind: "federal", domain: "unifap.br", website: "https://www2.unifap.br" },
  { id: "ufpa", name: "Universidade Federal do Pará", acronym: "UFPA", state: "PA", city: "Belém", kind: "federal", domain: "ufpa.br", website: "https://www.ufpa.br" },
  { id: "ufra", name: "Universidade Federal Rural da Amazônia", acronym: "UFRA", state: "PA", city: "Belém", kind: "federal", domain: "ufra.edu.br", website: "https://www.ufra.edu.br" },
  { id: "ufopa", name: "Universidade Federal do Oeste do Pará", acronym: "UFOPA", state: "PA", city: "Santarém", kind: "federal", domain: "ufopa.edu.br", website: "https://www.ufopa.edu.br" },
  { id: "unifesspa", name: "Universidade Federal do Sul e Sudeste do Pará", acronym: "UNIFESSPA", state: "PA", city: "Marabá", kind: "federal", domain: "unifesspa.edu.br", website: "https://www.unifesspa.edu.br" },
  { id: "ufrr", name: "Universidade Federal de Roraima", acronym: "UFRR", state: "RR", city: "Boa Vista", kind: "federal", domain: "ufrr.br", website: "https://ufrr.br" },
  { id: "unir", name: "Fundação Universidade Federal de Rondônia", acronym: "UNIR", state: "RO", city: "Porto Velho", kind: "federal", domain: "unir.br", website: "https://www.unir.br" },
  { id: "uft", name: "Universidade Federal do Tocantins", acronym: "UFT", state: "TO", city: "Palmas", kind: "federal", domain: "uft.edu.br", website: "https://www.uft.edu.br" },
  { id: "ufnt", name: "Universidade Federal do Norte do Tocantins", acronym: "UFNT", state: "TO", city: "Araguaína", kind: "federal", domain: "ufnt.edu.br", website: "https://ufnt.edu.br" },
  // Nordeste
  { id: "ufal", name: "Universidade Federal de Alagoas", acronym: "UFAL", state: "AL", city: "Maceió", kind: "federal", domain: "ufal.edu.br", website: "https://ufal.br" },
  { id: "ufba", name: "Universidade Federal da Bahia", acronym: "UFBA", state: "BA", city: "Salvador", kind: "federal", domain: "ufba.br", website: "https://www.ufba.br" },
  { id: "ufrb", name: "Universidade Federal do Recôncavo da Bahia", acronym: "UFRB", state: "BA", city: "Cruz das Almas", kind: "federal", domain: "ufrb.edu.br", website: "https://www.ufrb.edu.br" },
  { id: "ufsb", name: "Universidade Federal do Sul da Bahia", acronym: "UFSB", state: "BA", city: "Itabuna", kind: "federal", domain: "ufsb.edu.br", website: "https://ufsb.edu.br" },
  { id: "ufob", name: "Universidade Federal do Oeste da Bahia", acronym: "UFOB", state: "BA", city: "Barreiras", kind: "federal", domain: "ufob.edu.br", website: "https://www.ufob.edu.br" },
  { id: "ufc", name: "Universidade Federal do Ceará", acronym: "UFC", state: "CE", city: "Fortaleza", kind: "federal", domain: "ufc.br", website: "https://www.ufc.br", color: "#003DA5", isPartner: true },
  { id: "ufca", name: "Universidade Federal do Cariri", acronym: "UFCA", state: "CE", city: "Juazeiro do Norte", kind: "federal", domain: "ufca.edu.br", website: "https://www.ufca.edu.br" },
  { id: "unilab", name: "Universidade da Integração Internacional da Lusofonia Afro-Brasileira", acronym: "UNILAB", state: "CE", city: "Redenção", kind: "federal", domain: "unilab.edu.br", website: "https://www.unilab.edu.br", color: "#006633", isPartner: true },
  { id: "ufma", name: "Universidade Federal do Maranhão", acronym: "UFMA", state: "MA", city: "São Luís", kind: "federal", domain: "ufma.br", website: "https://portais.ufma.br" },
  { id: "ufpb", name: "Universidade Federal da Paraíba", acronym: "UFPB", state: "PB", city: "João Pessoa", kind: "federal", domain: "ufpb.br", website: "https://www.ufpb.br" },
  { id: "ufcg", name: "Universidade Federal de Campina Grande", acronym: "UFCG", state: "PB", city: "Campina Grande", kind: "federal", domain: "ufcg.edu.br", website: "https://www.ufcg.edu.br" },
  { id: "ufpe", name: "Universidade Federal de Pernambuco", acronym: "UFPE", state: "PE", city: "Recife", kind: "federal", domain: "ufpe.br", website: "https://www.ufpe.br" },
  { id: "ufrpe", name: "Universidade Federal Rural de Pernambuco", acronym: "UFRPE", state: "PE", city: "Recife", kind: "federal", domain: "ufrpe.br", website: "https://www.ufrpe.br" },
  { id: "univasf", name: "Universidade Federal do Vale do São Francisco", acronym: "UNIVASF", state: "PE", city: "Petrolina", kind: "federal", domain: "univasf.edu.br", website: "https://www.univasf.edu.br" },
  { id: "ufape", name: "Universidade Federal do Agreste de Pernambuco", acronym: "UFAPE", state: "PE", city: "Garanhuns", kind: "federal", domain: "ufape.edu.br", website: "https://ufape.edu.br" },
  { id: "ufpi", name: "Universidade Federal do Piauí", acronym: "UFPI", state: "PI", city: "Teresina", kind: "federal", domain: "ufpi.edu.br", website: "https://www.ufpi.br" },
  { id: "ufdpar", name: "Universidade Federal do Delta do Parnaíba", acronym: "UFDPar", state: "PI", city: "Parnaíba", kind: "federal", domain: "ufdpar.edu.br", website: "https://ufdpar.edu.br" },
  { id: "ufrn", name: "Universidade Federal do Rio Grande do Norte", acronym: "UFRN", state: "RN", city: "Natal", kind: "federal", domain: "ufrn.br", website: "https://www.ufrn.br" },
  { id: "ufersa", name: "Universidade Federal Rural do Semi-Árido", acronym: "UFERSA", state: "RN", city: "Mossoró", kind: "federal", domain: "ufersa.edu.br", website: "https://ufersa.edu.br" },
  { id: "ufs", name: "Universidade Federal de Sergipe", acronym: "UFS", state: "SE", city: "São Cristóvão", kind: "federal", domain: "ufs.br", website: "https://www.ufs.br" },
  // Centro-Oeste
  { id: "unb", name: "Universidade de Brasília", acronym: "UnB", state: "DF", city: "Brasília", kind: "federal", domain: "unb.br", website: "https://www.unb.br" },
  { id: "ufg", name: "Universidade Federal de Goiás", acronym: "UFG", state: "GO", city: "Goiânia", kind: "federal", domain: "ufg.br", website: "https://www.ufg.br" },
  { id: "ufcat", name: "Universidade Federal de Catalão", acronym: "UFCAT", state: "GO", city: "Catalão", kind: "federal", domain: "ufcat.edu.br", website: "https://ufcat.edu.br" },
  { id: "ufj", name: "Universidade Federal de Jataí", acronym: "UFJ", state: "GO", city: "Jataí", kind: "federal", domain: "ufj.edu.br", website: "https://ufj.edu.br" },
  { id: "ufmt", name: "Universidade Federal de Mato Grosso", acronym: "UFMT", state: "MT", city: "Cuiabá", kind: "federal", domain: "ufmt.br", website: "https://www.ufmt.br" },
  { id: "ufr", name: "Universidade Federal de Rondonópolis", acronym: "UFR", state: "MT", city: "Rondonópolis", kind: "federal", domain: "ufr.edu.br", website: "https://www.ufr.edu.br" },
  { id: "ufms", name: "Universidade Federal de Mato Grosso do Sul", acronym: "UFMS", state: "MS", city: "Campo Grande", kind: "federal", domain: "ufms.br", website: "https://www.ufms.br" },
  { id: "ufgd", name: "Universidade Federal da Grande Dourados", acronym: "UFGD", state: "MS", city: "Dourados", kind: "federal", domain: "ufgd.edu.br", website: "https://www.ufgd.edu.br" },
  // Sudeste
  { id: "ufes", name: "Universidade Federal do Espírito Santo", acronym: "UFES", state: "ES", city: "Vitória", kind: "federal", domain: "ufes.br", website: "https://www.ufes.br" },
  { id: "ufmg", name: "Universidade Federal de Minas Gerais", acronym: "UFMG", state: "MG", city: "Belo Horizonte", kind: "federal", domain: "ufmg.br", website: "https://www.ufmg.br" },
  { id: "ufop", name: "Universidade Federal de Ouro Preto", acronym: "UFOP", state: "MG", city: "Ouro Preto", kind: "federal", domain: "ufop.br", website: "https://www.ufop.br" },
  { id: "ufjf", name: "Universidade Federal de Juiz de Fora", acronym: "UFJF", state: "MG", city: "Juiz de Fora", kind: "federal", domain: "ufjf.br", website: "https://www.ufjf.br" },
  { id: "ufla", name: "Universidade Federal de Lavras", acronym: "UFLA", state: "MG", city: "Lavras", kind: "federal", domain: "ufla.br", website: "https://www.ufla.br" },
  { id: "ufv", name: "Universidade Federal de Viçosa", acronym: "UFV", state: "MG", city: "Viçosa", kind: "federal", domain: "ufv.br", website: "https://www.ufv.br" },
  { id: "ufu", name: "Universidade Federal de Uberlândia", acronym: "UFU", state: "MG", city: "Uberlândia", kind: "federal", domain: "ufu.br", website: "https://ufu.br" },
  { id: "uftm", name: "Universidade Federal do Triângulo Mineiro", acronym: "UFTM", state: "MG", city: "Uberaba", kind: "federal", domain: "uftm.edu.br", website: "https://www.uftm.edu.br" },
  { id: "ufsj", name: "Universidade Federal de São João del-Rei", acronym: "UFSJ", state: "MG", city: "São João del-Rei", kind: "federal", domain: "ufsj.edu.br", website: "https://ufsj.edu.br" },
  { id: "ufvjm", name: "Universidade Federal dos Vales do Jequitinhonha e Mucuri", acronym: "UFVJM", state: "MG", city: "Diamantina", kind: "federal", domain: "ufvjm.edu.br", website: "https://www.ufvjm.edu.br" },
  { id: "unifal", name: "Universidade Federal de Alfenas", acronym: "UNIFAL", state: "MG", city: "Alfenas", kind: "federal", domain: "unifal-mg.edu.br", website: "https://www.unifal-mg.edu.br" },
  { id: "unifei", name: "Universidade Federal de Itajubá", acronym: "UNIFEI", state: "MG", city: "Itajubá", kind: "federal", domain: "unifei.edu.br", website: "https://unifei.edu.br" },
  { id: "ufrj", name: "Universidade Federal do Rio de Janeiro", acronym: "UFRJ", state: "RJ", city: "Rio de Janeiro", kind: "federal", domain: "ufrj.br", website: "https://ufrj.br" },
  { id: "uff", name: "Universidade Federal Fluminense", acronym: "UFF", state: "RJ", city: "Niterói", kind: "federal", domain: "uff.br", website: "https://www.uff.br" },
  { id: "ufrrj", name: "Universidade Federal Rural do Rio de Janeiro", acronym: "UFRRJ", state: "RJ", city: "Seropédica", kind: "federal", domain: "ufrrj.br", website: "https://portal.ufrrj.br" },
  { id: "unirio", name: "Universidade Federal do Estado do Rio de Janeiro", acronym: "UNIRIO", state: "RJ", city: "Rio de Janeiro", kind: "federal", domain: "unirio.br", website: "https://www.unirio.br" },
  { id: "ufscar", name: "Universidade Federal de São Carlos", acronym: "UFSCar", state: "SP", city: "São Carlos", kind: "federal", domain: "ufscar.br", website: "https://www.ufscar.br" },
  { id: "unifesp", name: "Universidade Federal de São Paulo", acronym: "UNIFESP", state: "SP", city: "São Paulo", kind: "federal", domain: "unifesp.br", website: "https://www.unifesp.br" },
  { id: "ufabc", name: "Universidade Federal do ABC", acronym: "UFABC", state: "SP", city: "Santo André", kind: "federal", domain: "ufabc.edu.br", website: "https://www.ufabc.edu.br" },
  { id: "unila", name: "Universidade Federal da Integração Latino-Americana", acronym: "UNILA", state: "PR", city: "Foz do Iguaçu", kind: "federal", domain: "unila.edu.br", website: "https://unila.edu.br" },
  // Sul
  { id: "ufpr", name: "Universidade Federal do Paraná", acronym: "UFPR", state: "PR", city: "Curitiba", kind: "federal", domain: "ufpr.br", website: "https://www.ufpr.br" },
  { id: "utfpr", name: "Universidade Tecnológica Federal do Paraná", acronym: "UTFPR", state: "PR", city: "Curitiba", kind: "federal", domain: "utfpr.edu.br", website: "https://www.utfpr.edu.br" },
  { id: "ufsc", name: "Universidade Federal de Santa Catarina", acronym: "UFSC", state: "SC", city: "Florianópolis", kind: "federal", domain: "ufsc.br", website: "https://ufsc.br" },
  { id: "uffs", name: "Universidade Federal da Fronteira Sul", acronym: "UFFS", state: "SC", city: "Chapecó", kind: "federal", domain: "uffs.edu.br", website: "https://www.uffs.edu.br" },
  { id: "ufrgs", name: "Universidade Federal do Rio Grande do Sul", acronym: "UFRGS", state: "RS", city: "Porto Alegre", kind: "federal", domain: "ufrgs.br", website: "https://www.ufrgs.br" },
  { id: "ufsm", name: "Universidade Federal de Santa Maria", acronym: "UFSM", state: "RS", city: "Santa Maria", kind: "federal", domain: "ufsm.br", website: "https://www.ufsm.br" },
  { id: "ufpel", name: "Universidade Federal de Pelotas", acronym: "UFPel", state: "RS", city: "Pelotas", kind: "federal", domain: "ufpel.edu.br", website: "https://portal.ufpel.edu.br" },
  { id: "furg", name: "Universidade Federal do Rio Grande", acronym: "FURG", state: "RS", city: "Rio Grande", kind: "federal", domain: "furg.br", website: "https://www.furg.br" },
  { id: "ufcspa", name: "Universidade Federal de Ciências da Saúde de Porto Alegre", acronym: "UFCSPA", state: "RS", city: "Porto Alegre", kind: "federal", domain: "ufcspa.edu.br", website: "https://www.ufcspa.edu.br" },
  { id: "unipampa", name: "Universidade Federal do Pampa", acronym: "UNIPAMPA", state: "RS", city: "Bagé", kind: "federal", domain: "unipampa.edu.br", website: "https://www.unipampa.edu.br" },

  // ─────────────────── UNIVERSIDADES ESTADUAIS ───────────────────
  // Norte
  { id: "uea", name: "Universidade do Estado do Amazonas", acronym: "UEA", state: "AM", city: "Manaus", kind: "estadual", domain: "uea.edu.br", website: "https://www.uea.edu.br" },
  { id: "uerr", name: "Universidade Estadual de Roraima", acronym: "UERR", state: "RR", city: "Boa Vista", kind: "estadual", domain: "uerr.edu.br", website: "https://uerr.edu.br" },
  { id: "ueap", name: "Universidade do Estado do Amapá", acronym: "UEAP", state: "AP", city: "Macapá", kind: "estadual", domain: "ueap.edu.br", website: "https://www.ueap.edu.br" },
  { id: "unitins", name: "Universidade Estadual do Tocantins", acronym: "UNITINS", state: "TO", city: "Palmas", kind: "estadual", domain: "unitins.br", website: "https://www.unitins.br" },
  // Nordeste
  { id: "uema", name: "Universidade Estadual do Maranhão", acronym: "UEMA", state: "MA", city: "São Luís", kind: "estadual", domain: "uema.br", website: "https://www.uema.br" },
  { id: "uemasul", name: "Universidade Estadual da Região Tocantina do Maranhão", acronym: "UEMASUL", state: "MA", city: "Imperatriz", kind: "estadual", domain: "uemasul.edu.br", website: "https://www.uemasul.edu.br" },
  { id: "uespi", name: "Universidade Estadual do Piauí", acronym: "UESPI", state: "PI", city: "Teresina", kind: "estadual", domain: "uespi.br", website: "https://www.uespi.br" },
  { id: "uece", name: "Universidade Estadual do Ceará", acronym: "UECE", state: "CE", city: "Fortaleza", kind: "estadual", domain: "uece.br", website: "https://www.uece.br" },
  { id: "urca", name: "Universidade Regional do Cariri", acronym: "URCA", state: "CE", city: "Crato", kind: "estadual", domain: "urca.br", website: "https://www.urca.br" },
  { id: "uva", name: "Universidade Estadual Vale do Acaraú", acronym: "UVA", state: "CE", city: "Sobral", kind: "estadual", domain: "uvanet.br", website: "https://www.uvanet.br" },
  { id: "uern", name: "Universidade do Estado do Rio Grande do Norte", acronym: "UERN", state: "RN", city: "Mossoró", kind: "estadual", domain: "uern.br", website: "https://www.uern.br" },
  { id: "uepb", name: "Universidade Estadual da Paraíba", acronym: "UEPB", state: "PB", city: "Campina Grande", kind: "estadual", domain: "uepb.edu.br", website: "https://www.uepb.edu.br" },
  { id: "upe", name: "Universidade de Pernambuco", acronym: "UPE", state: "PE", city: "Recife", kind: "estadual", domain: "upe.br", website: "https://www.upe.br" },
  { id: "uneal", name: "Universidade Estadual de Alagoas", acronym: "UNEAL", state: "AL", city: "Arapiraca", kind: "estadual", domain: "uneal.edu.br", website: "https://www.uneal.edu.br" },
  { id: "uncisal", name: "Universidade Estadual de Ciências da Saúde de Alagoas", acronym: "UNCISAL", state: "AL", city: "Maceió", kind: "estadual", domain: "uncisal.edu.br", website: "https://www.uncisal.edu.br" },
  { id: "uneb", name: "Universidade do Estado da Bahia", acronym: "UNEB", state: "BA", city: "Salvador", kind: "estadual", domain: "uneb.br", website: "https://www.uneb.br" },
  { id: "uefs", name: "Universidade Estadual de Feira de Santana", acronym: "UEFS", state: "BA", city: "Feira de Santana", kind: "estadual", domain: "uefs.br", website: "https://www.uefs.br" },
  { id: "uesc", name: "Universidade Estadual de Santa Cruz", acronym: "UESC", state: "BA", city: "Ilhéus", kind: "estadual", domain: "uesc.br", website: "https://www.uesc.br" },
  { id: "uesb", name: "Universidade Estadual do Sudoeste da Bahia", acronym: "UESB", state: "BA", city: "Vitória da Conquista", kind: "estadual", domain: "uesb.edu.br", website: "https://www.uesb.edu.br" },
  // Sudeste
  { id: "uemg", name: "Universidade do Estado de Minas Gerais", acronym: "UEMG", state: "MG", city: "Belo Horizonte", kind: "estadual", domain: "uemg.br", website: "https://www.uemg.br" },
  { id: "unimontes", name: "Universidade Estadual de Montes Claros", acronym: "UNIMONTES", state: "MG", city: "Montes Claros", kind: "estadual", domain: "unimontes.br", website: "https://www.unimontes.br" },
  { id: "usp", name: "Universidade de São Paulo", acronym: "USP", state: "SP", city: "São Paulo", kind: "estadual", domain: "usp.br", website: "https://www5.usp.br" },
  { id: "unicamp", name: "Universidade Estadual de Campinas", acronym: "UNICAMP", state: "SP", city: "Campinas", kind: "estadual", domain: "unicamp.br", website: "https://www.unicamp.br" },
  { id: "unesp", name: "Universidade Estadual Paulista Júlio de Mesquita Filho", acronym: "UNESP", state: "SP", city: "São Paulo", kind: "estadual", domain: "unesp.br", website: "https://www2.unesp.br" },
  { id: "univesp", name: "Universidade Virtual do Estado de São Paulo", acronym: "UNIVESP", state: "SP", city: "São Paulo", kind: "estadual", domain: "univesp.br", website: "https://univesp.br" },
  { id: "uerj", name: "Universidade do Estado do Rio de Janeiro", acronym: "UERJ", state: "RJ", city: "Rio de Janeiro", kind: "estadual", domain: "uerj.br", website: "https://www.uerj.br" },
  { id: "uenf", name: "Universidade Estadual do Norte Fluminense Darcy Ribeiro", acronym: "UENF", state: "RJ", city: "Campos dos Goytacazes", kind: "estadual", domain: "uenf.br", website: "https://uenf.br" },
  // Sul
  { id: "uel", name: "Universidade Estadual de Londrina", acronym: "UEL", state: "PR", city: "Londrina", kind: "estadual", domain: "uel.br", website: "https://www.uel.br" },
  { id: "uem", name: "Universidade Estadual de Maringá", acronym: "UEM", state: "PR", city: "Maringá", kind: "estadual", domain: "uem.br", website: "https://www.uem.br" },
  { id: "uepg", name: "Universidade Estadual de Ponta Grossa", acronym: "UEPG", state: "PR", city: "Ponta Grossa", kind: "estadual", domain: "uepg.br", website: "https://www.uepg.br" },
  { id: "unioeste", name: "Universidade Estadual do Oeste do Paraná", acronym: "UNIOESTE", state: "PR", city: "Cascavel", kind: "estadual", domain: "unioeste.br", website: "https://www.unioeste.br" },
  { id: "unicentro", name: "Universidade Estadual do Centro-Oeste", acronym: "UNICENTRO", state: "PR", city: "Guarapuava", kind: "estadual", domain: "unicentro.br", website: "https://www.unicentro.br" },
  { id: "unespar", name: "Universidade Estadual do Paraná", acronym: "UNESPAR", state: "PR", city: "Paranavaí", kind: "estadual", domain: "unespar.edu.br", website: "https://www.unespar.edu.br" },
  { id: "uenp", name: "Universidade Estadual do Norte do Paraná", acronym: "UENP", state: "PR", city: "Jacarezinho", kind: "estadual", domain: "uenp.edu.br", website: "https://uenp.edu.br" },
  { id: "udesc", name: "Universidade do Estado de Santa Catarina", acronym: "UDESC", state: "SC", city: "Florianópolis", kind: "estadual", domain: "udesc.br", website: "https://www.udesc.br" },
  { id: "uergs", name: "Universidade Estadual do Rio Grande do Sul", acronym: "UERGS", state: "RS", city: "Porto Alegre", kind: "estadual", domain: "uergs.edu.br", website: "https://www.uergs.edu.br" },
  // Centro-Oeste
  { id: "ueg", name: "Universidade Estadual de Goiás", acronym: "UEG", state: "GO", city: "Anápolis", kind: "estadual", domain: "ueg.br", website: "https://www.ueg.br" },
  { id: "uems", name: "Universidade Estadual de Mato Grosso do Sul", acronym: "UEMS", state: "MS", city: "Dourados", kind: "estadual", domain: "uems.br", website: "https://www.uems.br" },
  { id: "unemat", name: "Universidade do Estado de Mato Grosso", acronym: "UNEMAT", state: "MT", city: "Cáceres", kind: "estadual", domain: "unemat.br", website: "https://www.unemat.br" },

  // ─────────────────── INSTITUTOS FEDERAIS (IFs / CEFET) ───────────────────
  // Norte
  { id: "ifac", name: "Instituto Federal do Acre", acronym: "IFAC", state: "AC", city: "Rio Branco", kind: "instituto_federal", domain: "ifac.edu.br", website: "https://www.ifac.edu.br" },
  { id: "ifam", name: "Instituto Federal do Amazonas", acronym: "IFAM", state: "AM", city: "Manaus", kind: "instituto_federal", domain: "ifam.edu.br", website: "https://www2.ifam.edu.br" },
  { id: "ifap", name: "Instituto Federal do Amapá", acronym: "IFAP", state: "AP", city: "Macapá", kind: "instituto_federal", domain: "ifap.edu.br", website: "https://www.ifap.edu.br" },
  { id: "ifpa", name: "Instituto Federal do Pará", acronym: "IFPA", state: "PA", city: "Belém", kind: "instituto_federal", domain: "ifpa.edu.br", website: "https://www.ifpa.edu.br" },
  { id: "ifrr", name: "Instituto Federal de Roraima", acronym: "IFRR", state: "RR", city: "Boa Vista", kind: "instituto_federal", domain: "ifrr.edu.br", website: "https://www.ifrr.edu.br" },
  { id: "ifro", name: "Instituto Federal de Rondônia", acronym: "IFRO", state: "RO", city: "Porto Velho", kind: "instituto_federal", domain: "ifro.edu.br", website: "https://www.ifro.edu.br" },
  { id: "ifto", name: "Instituto Federal do Tocantins", acronym: "IFTO", state: "TO", city: "Palmas", kind: "instituto_federal", domain: "ifto.edu.br", website: "https://www.ifto.edu.br" },
  // Nordeste
  { id: "ifal", name: "Instituto Federal de Alagoas", acronym: "IFAL", state: "AL", city: "Maceió", kind: "instituto_federal", domain: "ifal.edu.br", website: "https://www2.ifal.edu.br" },
  { id: "ifba", name: "Instituto Federal da Bahia", acronym: "IFBA", state: "BA", city: "Salvador", kind: "instituto_federal", domain: "ifba.edu.br", website: "https://portal.ifba.edu.br" },
  { id: "ifbaiano", name: "Instituto Federal Baiano", acronym: "IF Baiano", state: "BA", city: "Salvador", kind: "instituto_federal", domain: "ifbaiano.edu.br", website: "https://www.ifbaiano.edu.br" },
  { id: "ifce", name: "Instituto Federal do Ceará", acronym: "IFCE", state: "CE", city: "Fortaleza", kind: "instituto_federal", domain: "ifce.edu.br", website: "https://ifce.edu.br", color: "#1B5E20", isPartner: true },
  { id: "ifma", name: "Instituto Federal do Maranhão", acronym: "IFMA", state: "MA", city: "São Luís", kind: "instituto_federal", domain: "ifma.edu.br", website: "https://www.ifma.edu.br" },
  { id: "ifpb", name: "Instituto Federal da Paraíba", acronym: "IFPB", state: "PB", city: "João Pessoa", kind: "instituto_federal", domain: "ifpb.edu.br", website: "https://www.ifpb.edu.br" },
  { id: "ifpe", name: "Instituto Federal de Pernambuco", acronym: "IFPE", state: "PE", city: "Recife", kind: "instituto_federal", domain: "ifpe.edu.br", website: "https://www.ifpe.edu.br" },
  { id: "ifsertaope", name: "Instituto Federal do Sertão Pernambucano", acronym: "IF Sertão-PE", state: "PE", city: "Petrolina", kind: "instituto_federal", domain: "ifsertao-pe.edu.br", website: "https://www.ifsertao-pe.edu.br" },
  { id: "ifpi", name: "Instituto Federal do Piauí", acronym: "IFPI", state: "PI", city: "Teresina", kind: "instituto_federal", domain: "ifpi.edu.br", website: "https://www.ifpi.edu.br" },
  { id: "ifrn", name: "Instituto Federal do Rio Grande do Norte", acronym: "IFRN", state: "RN", city: "Natal", kind: "instituto_federal", domain: "ifrn.edu.br", website: "https://portal.ifrn.edu.br" },
  { id: "ifs", name: "Instituto Federal de Sergipe", acronym: "IFS", state: "SE", city: "Aracaju", kind: "instituto_federal", domain: "ifs.edu.br", website: "https://www.ifs.edu.br" },
  // Centro-Oeste
  { id: "ifb", name: "Instituto Federal de Brasília", acronym: "IFB", state: "DF", city: "Brasília", kind: "instituto_federal", domain: "ifb.edu.br", website: "https://www.ifb.edu.br" },
  { id: "ifg", name: "Instituto Federal de Goiás", acronym: "IFG", state: "GO", city: "Goiânia", kind: "instituto_federal", domain: "ifg.edu.br", website: "https://www.ifg.edu.br" },
  { id: "ifgoiano", name: "Instituto Federal Goiano", acronym: "IF Goiano", state: "GO", city: "Goiânia", kind: "instituto_federal", domain: "ifgoiano.edu.br", website: "https://www.ifgoiano.edu.br" },
  { id: "ifmt", name: "Instituto Federal de Mato Grosso", acronym: "IFMT", state: "MT", city: "Cuiabá", kind: "instituto_federal", domain: "ifmt.edu.br", website: "https://ifmt.edu.br" },
  { id: "ifms", name: "Instituto Federal de Mato Grosso do Sul", acronym: "IFMS", state: "MS", city: "Campo Grande", kind: "instituto_federal", domain: "ifms.edu.br", website: "https://www.ifms.edu.br" },
  // Sudeste
  { id: "ifes", name: "Instituto Federal do Espírito Santo", acronym: "IFES", state: "ES", city: "Vitória", kind: "instituto_federal", domain: "ifes.edu.br", website: "https://www.ifes.edu.br" },
  { id: "ifmg", name: "Instituto Federal de Minas Gerais", acronym: "IFMG", state: "MG", city: "Belo Horizonte", kind: "instituto_federal", domain: "ifmg.edu.br", website: "https://www.ifmg.edu.br" },
  { id: "ifsudestemg", name: "Instituto Federal do Sudeste de Minas Gerais", acronym: "IF Sudeste MG", state: "MG", city: "Juiz de Fora", kind: "instituto_federal", domain: "ifsudestemg.edu.br", website: "https://www.ifsudestemg.edu.br" },
  { id: "ifsuldeminas", name: "Instituto Federal do Sul de Minas Gerais", acronym: "IFSULDEMINAS", state: "MG", city: "Pouso Alegre", kind: "instituto_federal", domain: "ifsuldeminas.edu.br", website: "https://portal.ifsuldeminas.edu.br" },
  { id: "ifnmg", name: "Instituto Federal do Norte de Minas Gerais", acronym: "IFNMG", state: "MG", city: "Montes Claros", kind: "instituto_federal", domain: "ifnmg.edu.br", website: "https://www.ifnmg.edu.br" },
  { id: "iftm", name: "Instituto Federal do Triângulo Mineiro", acronym: "IFTM", state: "MG", city: "Uberaba", kind: "instituto_federal", domain: "iftm.edu.br", website: "https://www.iftm.edu.br" },
  { id: "cefetmg", name: "Centro Federal de Educação Tecnológica de Minas Gerais", acronym: "CEFET-MG", state: "MG", city: "Belo Horizonte", kind: "instituto_federal", domain: "cefetmg.br", website: "https://www.cefetmg.br" },
  { id: "ifrj", name: "Instituto Federal do Rio de Janeiro", acronym: "IFRJ", state: "RJ", city: "Rio de Janeiro", kind: "instituto_federal", domain: "ifrj.edu.br", website: "https://www.ifrj.edu.br" },
  { id: "iff", name: "Instituto Federal Fluminense", acronym: "IFF", state: "RJ", city: "Campos dos Goytacazes", kind: "instituto_federal", domain: "iff.edu.br", website: "https://www.iff.edu.br" },
  { id: "cefetrj", name: "Centro Federal de Educação Tecnológica Celso Suckow da Fonseca", acronym: "CEFET-RJ", state: "RJ", city: "Rio de Janeiro", kind: "instituto_federal", domain: "cefet-rj.br", website: "https://www.cefet-rj.br" },
  { id: "ifsp", name: "Instituto Federal de São Paulo", acronym: "IFSP", state: "SP", city: "São Paulo", kind: "instituto_federal", domain: "ifsp.edu.br", website: "https://www.ifsp.edu.br" },
  // Sul
  { id: "ifpr", name: "Instituto Federal do Paraná", acronym: "IFPR", state: "PR", city: "Curitiba", kind: "instituto_federal", domain: "ifpr.edu.br", website: "https://www.ifpr.edu.br" },
  { id: "ifsc", name: "Instituto Federal de Santa Catarina", acronym: "IFSC", state: "SC", city: "Florianópolis", kind: "instituto_federal", domain: "ifsc.edu.br", website: "https://www.ifsc.edu.br" },
  { id: "ifc", name: "Instituto Federal Catarinense", acronym: "IFC", state: "SC", city: "Blumenau", kind: "instituto_federal", domain: "ifc.edu.br", website: "https://www.ifc.edu.br" },
  { id: "ifrs", name: "Instituto Federal do Rio Grande do Sul", acronym: "IFRS", state: "RS", city: "Bento Gonçalves", kind: "instituto_federal", domain: "ifrs.edu.br", website: "https://www.ifrs.edu.br" },
  { id: "ifsul", name: "Instituto Federal Sul-rio-grandense", acronym: "IFSul", state: "RS", city: "Pelotas", kind: "instituto_federal", domain: "ifsul.edu.br", website: "https://www.ifsul.edu.br" },
  { id: "iffar", name: "Instituto Federal Farroupilha", acronym: "IFFar", state: "RS", city: "Santa Maria", kind: "instituto_federal", domain: "iffarroupilha.edu.br", website: "https://www.iffarroupilha.edu.br" },
];

/** Lista final, com color/logoPath/isPartner garantidos. */
export const BRAZILIAN_UNIVERSITIES: BrazilianUniversity[] = RAW.map((u) => ({
  ...u,
  color: u.color ?? KIND_COLOR[u.kind],
  logoPath: u.logoPath ?? `/assets/universities/${u.id}.png`,
  isPartner: !!u.isPartner,
}));

/** Alias de compatibilidade (componentes antigos importam este nome). */
export const BRAZILIAN_FEDERAL_UNIVERSITIES = BRAZILIAN_UNIVERSITIES;

/** Mapa domínio → instituição, para casar o e-mail acadêmico rapidamente. */
export const UNIVERSITY_BY_DOMAIN: Record<string, BrazilianUniversity> = BRAZILIAN_UNIVERSITIES.reduce(
  (acc, u) => { acc[u.domain] = u; return acc; },
  {} as Record<string, BrazilianUniversity>,
);

/** Acha a instituição pelo domínio de um e-mail (ex.: "fulano@aluno.ufc.br" → UFC). */
export function findUniversityByEmail(email: string): BrazilianUniversity | null {
  const at = (email || "").toLowerCase().split("@")[1];
  if (!at) return null;
  if (UNIVERSITY_BY_DOMAIN[at]) return UNIVERSITY_BY_DOMAIN[at];
  // tenta casar sufixo de domínio (ex.: aluno.ufc.br → ufc.br)
  return BRAZILIAN_UNIVERSITIES.find((u) => at === u.domain || at.endsWith("." + u.domain)) ?? null;
}

export const UNIVERSITY_KIND_LABEL: Record<UniversityKind, string> = {
  federal: "Federal",
  estadual: "Estadual",
  instituto_federal: "Instituto Federal",
};
