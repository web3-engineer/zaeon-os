/**
 * O portão de conhecimento específico erra de DOIS jeitos opostos, e os dois são ruins:
 *   · recusar o próprio campo  → a agente nega o trabalho pelo qual existe (a falha GRAVE);
 *   · passar qualquer coisa    → a agente de medicina comenta GTA VI, que é o defeito a consertar.
 * Então o corpus tem as duas metades, e a metade do próprio campo é a maior de propósito.
 */
import { describe, expect, it } from "vitest";
import {
  DIRETRIZ_ESCOPO_NEUTRO,
  DIRETRIZ_FORA_DO_ESCOPO,
  areaDaPergunta,
  diretrizDeEscopo,
  escopoDoTurno,
  responsavelDaArea,
} from "@/lib/agents/escopo";
import { CAPACIDADES } from "@/lib/agents/capacidades";

const zenita = (pergunta: string, reconheceDoProprio?: (p: string) => boolean) =>
  escopoDoTurno({
    pergunta,
    areaDaAgente: CAPACIDADES.zenita.area,
    termosProprios: CAPACIDADES.zenita.termosProprios,
    reconheceDoProprio,
  });

// ── o campo DELA: tudo isto tem que passar ──
const DO_CAMPO = [
  "me explica o ciclo de Krebs",
  "como funciona a fisiologia renal?",
  "o que causa anemia ferropriva?",
  "qual a farmacocinética da amoxicilina?",
  "diferença entre artéria e veia",
  "como o sistema imune reconhece um vírus?",
  "o que é anamnese e exame físico?",
  "quais hormônios a tireoide produz",
  "como age um antibiótico betalactâmico?",
  "o que acontece numa inflamação aguda",
  "me explica a histologia do tecido epitelial",
  "qual a posologia usual desse medicamento em pediatria?",
  "o que é metástase",
  "fisiopatologia da insuficiência cardíaca",
  "como funciona a sinapse e os neurotransmissores",
  "o paciente com hipertensão: o que a pressão arterial indica?",
  "estrutura do osso e da cartilagem articular",
  "o que o fígado faz no metabolismo",
];

// ── fora, SEM dono: neutro (é o caso do GTA VI que o dono deu) ──
const SEM_DONO = [
  "o que você acha do GTA VI?",
  "quem vai ganhar a Champions esse ano?",
  "me ensina a fazer um bolo de cenoura",
  "qual a melhor série da Netflix agora?",
  "como investir em bitcoin?",
  "me conta uma piada",
];

// ── fora, COM dono: nega e aponta ──
// A rede neural era do Turing (eng-computacao) e passou a ser do Zaeon (dados-ia) no dia em que o
// esquadrão das exatas entrou: quando chega um especialista, o termo muda de dono. O que este teste
// protege não é QUEM atende, é que exista alguém — foi a ausência de dono que, com a área órfã,
// derrubou o veredicto de `nega` pra `neutro` e fez a Zenita torcer a pergunta pro lado dela.
const COM_DONO: [string, string][] = [
  ["como funciona uma rede neural artificial?", "dados-ia"],
  ["o que é SQL injection e como me protejo?", "seguranca"],
  ["como subo um pod no kubernetes?", "infra"],
  ["qual a resistência do concreto armado na construção civil?", "eng-civil"],
  ["como funciona um painel fotovoltaico de energia solar?", "eng-energias"],
];

describe("portão de conhecimento específico", () => {
  it("o campo DELA passa inteiro — a falha grave é recusar o próprio trabalho", () => {
    const recusadas = DO_CAMPO.filter((p) => zenita(p).escopo !== "passa")
      .map((p) => `${p} → ${zenita(p).escopo}`);
    expect(recusadas).toEqual([]);
  });

  it("fora do campo e sem dono = neutro (o caso GTA VI)", () => {
    const erradas = SEM_DONO.filter((p) => zenita(p).escopo !== "neutro")
      .map((p) => `${p} → ${zenita(p).escopo}`);
    expect(erradas).toEqual([]);
  });

  it("fora do campo e com dono = nega, e aponta quem existe DE VERDADE", () => {
    for (const [p, area] of COM_DONO) {
      const v = zenita(p);
      expect(v.escopo, p).toBe("nega");
      expect(v.area, p).toBe(area);
      expect(v.responsavel, p).not.toBeNull();
      expect(v.responsavel!.nome.length, p).toBeGreaterThan(1);
    }
  });

  it("o atlas faz passar o que a lista de termos não pega (é pra isso que ele é injetado)", () => {
    const soAtlas = "onde fica o vago e o que ele inerva";
    // sem o atlas, nenhum termo bate → cai em neutro
    expect(zenita(soAtlas).escopo).toBe("neutro");
    // com o atlas reconhecendo, passa
    expect(zenita(soAtlas, () => true).escopo).toBe("passa");
  });

  it("GENERALISTA NUNCA é gateada — fechar o escopo de quem não tem área é agente inútil", () => {
    for (const id of ["aura", "nina"] as const) {
      const v = escopoDoTurno({
        pergunta: "o que você acha do GTA VI?",
        areaDaAgente: CAPACIDADES[id].area,
        termosProprios: CAPACIDADES[id].termosProprios,
      });
      expect(v.escopo, id).toBe("passa");
    }
  });

  it("pergunta vazia passa (não se recusa o que não foi perguntado)", () => {
    expect(zenita("").escopo).toBe("passa");
    expect(zenita("   ").escopo).toBe("passa");
  });

  it("área ambígua não manda ninguém embora (empate = neutro, não nega)", () => {
    // 'célula' é termo de biologia E está no vocabulário próprio dela: o próprio vence
    expect(zenita("o que é uma célula?").escopo).toBe("passa");
    // sem destaque de 2× entre as duas primeiras, areaDaPergunta devolve null
    expect(areaDaPergunta("asdlkfj qwerty zxcvb")).toBeNull();
  });

  it("`passa` NÃO injeta diretiva — o caminho de quem está no seu campo fica intacto", () => {
    expect(diretrizDeEscopo({ escopo: "passa", area: "medicina", responsavel: null })).toBe("");
  });

  it("a diretiva de NEGA nomeia quem ajuda e proíbe responder depois do aviso", () => {
    const v = zenita("como funciona uma rede neural artificial?");
    const d = diretrizDeEscopo(v);
    expect(d).toContain(v.responsavel!.nome);
    expect(d).not.toContain("{QUEM}");
    expect(d).not.toContain("{ONDE}");
    expect(d).toMatch(/NÃO responda a pergunta/);
  });

  it("a diretiva NEUTRA pede o fio no contexto e proíbe desenvolvê-lo", () => {
    const d = diretrizDeEscopo(zenita("o que você acha do GTA VI?"));
    expect(d).toBe(DIRETRIZ_ESCOPO_NEUTRO);
    expect(d).toMatch(/NÃO desenvolva o fio/);
    expect(d).toMatch(/NÃO responda a pergunta original/);
    // e não pode virar piada nem desvio: isso está dito na diretiva
    expect(d).toMatch(/Não é desvio nem/);
  });

  it("as duas diretivas são DIFERENTES e nenhuma vaza placeholder", () => {
    expect(DIRETRIZ_FORA_DO_ESCOPO).not.toBe(DIRETRIZ_ESCOPO_NEUTRO);
    expect(DIRETRIZ_ESCOPO_NEUTRO).not.toContain("{");
  });

  it("responsavelDaArea nunca inventa nome: medicina é a Zenita, no chat", () => {
    const r = responsavelDaArea("medicina");
    expect(r).toEqual({ nome: "Zenita", onde: "chat" });
    // área com mentor e sem agente de chat → o nome do mentor, no Escritório
    const med = responsavelDaArea("eng-computacao");
    expect(med?.onde).toBe("escritorio");
    expect(med?.nome).toBeTruthy();
    // área inexistente → cai na generalista do chat, nunca em null-com-nome-inventado
    expect(responsavelDaArea("area-que-nao-existe")).toEqual({ nome: "Aura", onde: "chat" });
  });
});
