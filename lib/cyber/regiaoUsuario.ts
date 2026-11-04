/**
 * Cyberespaço — a REGIÃO REAL de cada pessoa (PURO): decide em qual NAVE COWORKING ela começa (nov/2026, o dono: "uma
 * nave por região"). As regiões são as cinco do Brasil + o "exterior" (quem é de fora do país).
 *
 * A ordem das pistas (a primeira que responder vale):
 *  1. o PAÍS do perfil (`countryCode` ≠ "br" → exterior);
 *  2. o ESTADO da instituição (o id/sigla/nome em constants/universities → a UF);
 *  3. a CIDADE do perfil (as capitais e as cidades grandes; "Cidade - UF" / "Cidade/UF" também);
 *  4. o FUSO do navegador (America/Fortaleza → Nordeste…; um fuso de fora do Brasil → exterior);
 *  5. senão, a região padrão.
 */
import { BRAZILIAN_FEDERAL_UNIVERSITIES } from "@/constants/universities";

export type Regiao = "norte" | "nordeste" | "centro-oeste" | "sudeste" | "sul" | "exterior";
export const REGIOES: readonly Regiao[] = ["norte", "nordeste", "centro-oeste", "sudeste", "sul", "exterior"];
export const NOME_REGIAO: Record<Regiao, string> = { norte: "Norte", nordeste: "Nordeste", "centro-oeste": "Centro-Oeste", sudeste: "Sudeste", sul: "Sul", exterior: "Exterior" };
/** quando nenhuma pista responde */
export const REGIAO_PADRAO: Regiao = "nordeste";

const UF_REGIAO: Record<string, Regiao> = {
  AC: "norte", AP: "norte", AM: "norte", PA: "norte", RO: "norte", RR: "norte", TO: "norte",
  AL: "nordeste", BA: "nordeste", CE: "nordeste", MA: "nordeste", PB: "nordeste", PE: "nordeste", PI: "nordeste", RN: "nordeste", SE: "nordeste",
  DF: "centro-oeste", GO: "centro-oeste", MT: "centro-oeste", MS: "centro-oeste",
  ES: "sudeste", MG: "sudeste", RJ: "sudeste", SP: "sudeste",
  PR: "sul", RS: "sul", SC: "sul",
};
export const regiaoDaUF = (uf: string | null | undefined): Regiao | null => (uf ? UF_REGIAO[uf.trim().toUpperCase()] ?? null : null);

/** sem acento, minúsculo, espaços simples */
const normal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** as capitais e as cidades grandes (as que mais aparecem) → a UF */
const CIDADE_UF: Record<string, string> = Object.fromEntries(([
  ["rio branco", "AC"], ["macapa", "AP"], ["manaus", "AM"], ["belem", "PA"], ["santarem", "PA"], ["porto velho", "RO"], ["boa vista", "RR"], ["palmas", "TO"],
  ["maceio", "AL"], ["salvador", "BA"], ["feira de santana", "BA"], ["vitoria da conquista", "BA"], ["fortaleza", "CE"], ["caucaia", "CE"], ["juazeiro do norte", "CE"], ["sobral", "CE"], ["maracanau", "CE"],
  ["sao luis", "MA"], ["imperatriz", "MA"], ["joao pessoa", "PB"], ["campina grande", "PB"], ["recife", "PE"], ["olinda", "PE"], ["caruaru", "PE"], ["petrolina", "PE"], ["jaboatao dos guararapes", "PE"],
  ["teresina", "PI"], ["natal", "RN"], ["mossoro", "RN"], ["aracaju", "SE"],
  ["brasilia", "DF"], ["goiania", "GO"], ["anapolis", "GO"], ["aparecida de goiania", "GO"], ["cuiaba", "MT"], ["campo grande", "MS"], ["dourados", "MS"],
  ["vitoria", "ES"], ["vila velha", "ES"], ["serra", "ES"], ["belo horizonte", "MG"], ["uberlandia", "MG"], ["contagem", "MG"], ["juiz de fora", "MG"], ["montes claros", "MG"],
  ["rio de janeiro", "RJ"], ["niteroi", "RJ"], ["sao goncalo", "RJ"], ["duque de caxias", "RJ"], ["nova iguacu", "RJ"],
  ["sao paulo", "SP"], ["campinas", "SP"], ["guarulhos", "SP"], ["santos", "SP"], ["sao bernardo do campo", "SP"], ["santo andre", "SP"], ["osasco", "SP"], ["ribeirao preto", "SP"], ["sorocaba", "SP"], ["sao jose dos campos", "SP"], ["sao carlos", "SP"],
  ["curitiba", "PR"], ["londrina", "PR"], ["maringa", "PR"], ["ponta grossa", "PR"], ["cascavel", "PR"], ["porto alegre", "RS"], ["caxias do sul", "RS"], ["pelotas", "RS"], ["santa maria", "RS"],
  ["florianopolis", "SC"], ["joinville", "SC"], ["blumenau", "SC"],
] as const).map(([c, uf]) => [c, uf]));

/** a UF escrita na cidade ("Fortaleza - CE", "Fortaleza/CE", "Fortaleza, CE") ou a da cidade conhecida */
export function ufDaCidade(cidade: string | null | undefined): string | null {
  if (!cidade) return null;
  const sufixo = cidade.match(/[\s,/–-]\s*([A-Za-z]{2})\s*$/);
  if (sufixo && UF_REGIAO[sufixo[1]!.toUpperCase()]) return sufixo[1]!.toUpperCase();
  const c = normal(cidade.replace(/[,/–-].*$/, ""));
  return CIDADE_UF[c] ?? null;
}

/** a UF da instituição do perfil (o id, a sigla ou o nome da lista de universidades) */
export function ufDaInstituicao(inst: string | null | undefined): string | null {
  if (!inst) return null;
  const n = normal(inst);
  const u = BRAZILIAN_FEDERAL_UNIVERSITIES.find((x) => x.id === inst || normal(x.acronym) === n || normal(x.name) === n);
  return u?.state ?? null;
}

/** os fusos do Brasil → a região (os de mais de uma região ficam com a mais populosa delas) */
const FUSO_REGIAO: Record<string, Regiao> = {
  "America/Fortaleza": "nordeste", "America/Recife": "nordeste", "America/Bahia": "nordeste", "America/Maceio": "nordeste", "America/Noronha": "nordeste",
  "America/Belem": "norte", "America/Manaus": "norte", "America/Santarem": "norte", "America/Porto_Velho": "norte", "America/Boa_Vista": "norte", "America/Rio_Branco": "norte", "America/Eirunepe": "norte", "America/Araguaina": "norte",
  "America/Cuiaba": "centro-oeste", "America/Campo_Grande": "centro-oeste",
  "America/Sao_Paulo": "sudeste",
};
export function regiaoDoFuso(fuso: string | null | undefined): Regiao | null {
  if (!fuso) return null;
  if (FUSO_REGIAO[fuso]) return FUSO_REGIAO[fuso]!;
  return fuso.startsWith("America/") || fuso.startsWith("Europe/") || fuso.startsWith("Asia/") || fuso.startsWith("Africa/") || fuso.startsWith("Australia/") || fuso.startsWith("Pacific/") ? "exterior" : null;
}

export type PistasRegiao = { countryCode?: string | null; institution?: string | null; city?: string | null; fuso?: string | null };
/** a região da pessoa e de onde ela saiu (pra depurar) */
export function regiaoDoUsuario(p: PistasRegiao): { regiao: Regiao; fonte: "pais" | "instituicao" | "cidade" | "fuso" | "padrao" } {
  const pais = p.countryCode?.trim().toLowerCase();
  if (pais && pais !== "br") return { regiao: "exterior", fonte: "pais" };
  const porInst = regiaoDaUF(ufDaInstituicao(p.institution)); if (porInst) return { regiao: porInst, fonte: "instituicao" };
  const porCidade = regiaoDaUF(ufDaCidade(p.city)); if (porCidade) return { regiao: porCidade, fonte: "cidade" };
  const porFuso = regiaoDoFuso(p.fuso); if (porFuso && !(pais === "br" && porFuso === "exterior")) return { regiao: porFuso, fonte: "fuso" };
  return { regiao: REGIAO_PADRAO, fonte: "padrao" };
}
