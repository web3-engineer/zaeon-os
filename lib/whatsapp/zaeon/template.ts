/**
 * lib/whatsapp/zaeon/template.ts — o TEMPLATE da Zaeon no WhatsApp: as instruções do harness deste agente + o
 * objetivo de cada momento. Uma chamada curta ao modelo (JSON {mensagem}) com o retrato da pessoa
 * (contexto.ts); falhou → mensagem determinística (a Zaeon nunca fica muda por erro de modelo).
 */
import type { Acao } from "./rotina";
import { contextoEmTexto, type Contexto } from "./contexto";
import { toWhatsAppText } from "../format";
import { disparosHfPrimario, historicoParaTerceiro } from "@/lib/llm/reservaHf";
import { MARCA_NOME, ocultarNome, reporNome } from "./semNome";

/** As instruções do harness da Zaeon no WhatsApp (o "jeito" dela). */
export const INSTRUCOES_ZAEON = [
  "Você é a Zaeon, a mentora de estudos da plataforma Zaeon, falando com a pessoa pelo WhatsApp dela.",
  "PROATIVIDADE é a sua natureza: ociosidade não é bem vista. Você puxa conversa, acompanha, cobra com carinho e celebra — para garantir que a pessoa tenha uma ROTINA de estudos de verdade.",
  "REGRA DA ROTINA: se a pessoa não tem lembretes nem agenda, você NÃO sabe quando ela estuda. Então descubra: pergunte que horas ela estuda, proponha horários concretos e peça pra responder no formato \"seg a sex 19h\" ou \"amanhã 8h revisar cálculo\" — a Zaeon anota como lembrete.",
  "Só o que é IMPORTANTE: aula do dia, lembretes, coisas pra fazer, prazos, um resumo do que estudou. Nada de propaganda, nada de falar da plataforma ou de recursos.",
  "Use SOMENTE os fatos do retrato da pessoa. Nunca invente aula, prazo, nota ou conteúdo que ela não estudou. Se não houver estudo registrado, seja sincera e convide a começar.",
  "Formato WhatsApp: curto (até ~600 caracteres), parágrafos de 1–2 linhas, *negrito* com asteriscos só no essencial, no máximo 2 emojis, termine com UMA pergunta ou um próximo passo claro. Português do Brasil, tom humano e caloroso, trate pelo primeiro nome se souber.",
  "Não repita literalmente o que você já mandou nas últimas mensagens; varie a abordagem.",
].join("\n");

/** o objetivo de cada momento (o template do dia) */
export function objetivoDa(acao: Acao): string {
  switch (acao.tipo) {
    case "lembrete":
      return `LEMBRETE agora: "${acao.lembrete.texto}". Lembre a pessoa disso de forma motivadora, ligue ao que ela estudou se fizer sentido e peça pra responder quando começar ou terminar.`;
    case "momento":
      if (acao.momento === "manha")
        return "BOM DIA + PLANO DO DIA: em poucas linhas, o que tem hoje (agenda, lembretes, prazos) e a *aula do dia*: UM conceito curto e útil tirado do que a pessoa vem estudando (2–3 frases didáticas). Feche perguntando a que horas ela vai estudar hoje.";
      if (acao.momento === "tarde")
        return "CHECK-IN DA TARDE: pergunte como está indo e proponha UMA coisa pra fazer agora (revisão rápida, exercício ou um mini-desafio de 1 pergunta sobre o que estudou). Se houver prazo próximo, priorize ele.";
      return "RESUMO DO DIA + CONDENSADO DOS ESTUDOS: resuma de forma simples o que a pessoa estudou (hoje e nos últimos dias), destaque 1–2 ideias-chave, e combine o plano de amanhã. Se ela não estudou hoje, sem bronca: proponha um passo pequeno pra amanhã e pergunte o horário.";
    case "descoberta":
      return `DESCOBRIR A ROTINA (tentativa ${acao.tentativa} de hoje): a pessoa ainda não tem lembretes nem agenda. Puxe conversa de um jeito diferente das vezes anteriores (pergunte o melhor horário, ofereça montar uma rotina, sugira começar com 25 min, traga algo do que ela estudou). Peça explicitamente horários pra anotar como lembrete.`;
  }
}

/** a mensagem quando o modelo falha (determinística, curta, útil) */
export function mensagemPadrao(acao: Acao, c: Pick<Contexto, "nome" | "estudosRecentes" | "lembretesHoje" | "agendaHoje">): string {
  const oi = c.nome ? `${c.nome}, ` : "";
  const assunto = c.estudosRecentes[0];
  switch (acao.tipo) {
    case "lembrete": return `⏰ ${oi}lembrete: *${acao.lembrete.texto}*. Me avisa quando começar?`;
    case "momento":
      if (acao.momento === "manha") return `Bom dia${c.nome ? `, ${c.nome}` : ""}! ☀️ ${c.agendaHoje || (c.lembretesHoje.length ? `Hoje: ${c.lembretesHoje.join("; ")}.` : "Bora fazer o dia render nos estudos.")}${assunto ? ` Que tal retomar *${assunto}*?` : ""} A que horas você estuda hoje?`;
      if (acao.momento === "tarde") return `${oi}como está indo a tarde? ${assunto ? `Topa 15 min revisando *${assunto}* agora?` : "Topa 15 min de estudo agora?"} 📚`;
      return `${oi}fechando o dia: ${assunto ? `você andou estudando *${assunto}*. ` : ""}Qual é o plano de amanhã? Me diz o horário que eu te lembro. 🌙`;
    case "descoberta": return `${oi}ainda não sei quando você costuma estudar 🙂 Me conta seus horários (ex.: *seg a sex 19h*) que eu te lembro e monto a rotina com você.`;
  }
}

type Gerar = (req: { system: string; user: string }) => Promise<{ mensagem?: string }>;

/**
 * O retrato que VAI PRO MODELO. Quando o disparo sai por provedor de terceiro (HF primário), duas
 * coisas mudam, e nenhuma delas é o conteúdo útil:
 *   • o nome do aluno vira `{{NOME}}` (reposto na volta) — privacidade de graça, zero perda;
 *   • o histórico de conversa pode ser cortado por `DISPAROS_HF_SEM_HISTORICO` (default: mantém).
 * No Vertex (o caminho de sempre) nada disso acontece: o retrato vai inteiro, como sempre foi.
 */
export function retratoParaModelo(c: Contexto, opts: { terceiro: boolean; historico: boolean }): string {
  const base = opts.terceiro && !opts.historico ? { ...c, conversaWhatsApp: [] } : c;
  const texto = contextoEmTexto(base);
  return opts.terceiro ? ocultarNome(texto, c.nome) : texto;
}

/** compõe a mensagem da Zaeon pra esta ação. `gerar` injetável (teste); o padrão é o envelope. */
export async function comporMensagem(acao: Acao, c: Contexto, gerar?: Gerar): Promise<{ texto: string; doModelo: boolean }> {
  // `pularVertex` inverte a ordem do envelope: HF primeiro, Vertex como queda. Com DISPAROS_HF off,
  // tudo segue idêntico ao de antes — inclusive a reserva HF quando o Vertex falha.
  const terceiro = disparosHfPrimario();
  const g = gerar ?? (async (req) => {
    const { gerarJsonRes } = await import("@/lib/llm/envelope");
    const { valor } = await gerarJsonRes<{ mensagem?: string }>({
      system: req.system, user: req.user, json: true, temperature: 0.7, pensar: "low", timeoutMs: 25_000,
      ctx: { agentKey: "zaeon", surface: "estudos" as const, phase: "whatsapp" },
    }, terceiro ? { pularVertex: true } : {});
    return valor;
  });
  try {
    const out = await g({
      system: `${INSTRUCOES_ZAEON}\nResponda SOMENTE JSON {"mensagem":"..."}.`
        // A marca só é explicada ao modelo quando ela existe no prompt — senão é instrução morta
        // convidando o modelo a escrever "{{NOME}}" num texto que nunca teve nome pra esconder.
        + (terceiro && c.nome ? `\nTrate a pessoa por ${MARCA_NOME} — escreva ${MARCA_NOME} exatamente assim onde o nome dela entraria.` : ""),
      user: `OBJETIVO DESTA MENSAGEM:\n${objetivoDa(acao)}\n\nRETRATO DA PESSOA:\n${retratoParaModelo(c, { terceiro, historico: historicoParaTerceiro() })}`,
    });
    const t = String(out?.mensagem ?? "").trim();
    // o modelo escreve markdown (**negrito**, ###): o WhatsApp só entende *negrito* — visto no dry-run em prod (24/10)
    // `reporNome` SEMPRE roda: se o modelo inventar a marca sem a gente ter pedido, ela não vai pro aluno.
    if (t.length >= 20) return { texto: toWhatsAppText(reporNome(t, c.nome), 1200), doModelo: true };
  } catch { /* cai no padrão */ }
  return { texto: mensagemPadrao(acao, c), doModelo: false };
}
