/**
 * lib/whatsapp/papelDoProcesso.test.ts — SÓ O WEB AGENDA.
 *
 * Nasceu de uma duplicação real, vista no log do deploy de 06/nov/2026. Ao subir o `worker`
 * dedicado, o log dele mostrava as MESMAS linhas do web:
 *
 *     > WhatsApp scheduler ligado (a cada 5 min)
 *     > Chips de WhatsApp ouvindo (a cada 3 s)
 *
 * Não era surpresa depois de olhar: o worker roda a MESMA imagem, o MESMO `server.js` e o MESMO
 * `env_file` do web (`['.env', '.env.secrets']` nos dois serviços do compose). Tudo que o
 * `server.js` liga por env, ele liga duas vezes.
 *
 * POR QUE ISSO É GRAVE, e não cosmético: o dedupe do disparo é LER-DEPOIS-ESCREVER sem atomicidade
 * — `lib/whatsapp/service.ts` faz `findFirst` pelo dedupeKey, DEPOIS envia, e só então grava o log —
 * e o schema declara `@@index([userId, dedupeKey])`, um ÍNDICE e não uma restrição única. Dois
 * processos passam os dois pela checagem antes de qualquer um gravar, e a janela é a duração
 * inteira do POST ao provedor. A defesa que resta é o `idempotencyKey` no envelope da ponte, e quem
 * o IMPÕE é o ChipFlow: outro sistema, que este repositório não verifica.
 *
 * A trava é por PAPEL e não por `SCHOLAR_WORKER`: a topologia pretendida tem o web com
 * SCHOLAR_WORKER=0, mas hoje o web está com 1 — usar essa flag desligaria o agendador em quem deve
 * agendar. E `ZAEON_ROLE` ausente significa "web", então nenhum deploy existente muda.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const raiz = path.resolve(__dirname, "../..");
const server = readFileSync(path.join(raiz, "server.js"), "utf8");
const compose = readFileSync(path.join(raiz, "docker-compose.beta.yml"), "utf8");

/** O corpo de um serviço do compose (até a próxima chave de 2 espaços ou de coluna 0). */
function servico(nome: string): string {
  const linhas = compose.split("\n");
  const i = linhas.findIndex((l) => l === `  ${nome}:`);
  if (i < 0) return "";
  const out: string[] = [];
  for (const l of linhas.slice(i + 1)) { if (/^ {2}\S/.test(l) || /^\S/.test(l)) break; out.push(l); }
  return out.join("\n");
}
const semComentario = (s: string) => s.split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");

describe("só o web agenda WhatsApp", () => {
  it("GUARDA: as duas funções que duplicavam existem no server.js", () => {
    // sem isto, renomear as funções faria as asserções abaixo medirem a ausência e passarem
    expect(server).toContain("function startWhatsAppScheduler");
    expect(server).toContain("function startChipsListener");
  });

  it("o papel vem de ZAEON_ROLE e o DEFAULT é web (deploy existente não muda)", () => {
    expect(server).toMatch(/process\.env\.ZAEON_ROLE \|\| "web"/);
    expect(server).toMatch(/EH_WORKER_DEDICADO = PAPEL === "worker"/);
  });

  it("o agendador de disparos DESISTE quando o papel é worker", () => {
    const corpo = /function startWhatsAppScheduler[\s\S]*?\n}/.exec(server)?.[0] ?? "";
    expect(corpo, "não consegui isolar a função — asserção seria vazia").toContain("setInterval");
    expect(corpo).toMatch(/if \(EH_WORKER_DEDICADO\)[\s\S]*?return;/);
    // e a desistência é ANTES de agendar o tick
    expect(corpo.indexOf("EH_WORKER_DEDICADO")).toBeLessThan(corpo.indexOf("setInterval"));
  });

  it("o ouvinte dos chips DESISTE quando o papel é worker", () => {
    const corpo = /function startChipsListener[\s\S]*?\n}/.exec(server)?.[0] ?? "";
    expect(corpo, "não consegui isolar a função — asserção seria vazia").toContain("setInterval");
    expect(corpo).toMatch(/if \(EH_WORKER_DEDICADO\)[\s\S]*?return;/);
    expect(corpo.indexOf("EH_WORKER_DEDICADO")).toBeLessThan(corpo.indexOf("setInterval"));
  });

  it("quem DECLARA o papel é o worker no compose — e o web não declara nada", () => {
    expect(semComentario(servico("worker"))).toMatch(/ZAEON_ROLE:\s*"worker"/);
    // o web depende do DEFAULT de propósito: declarar ali seria uma segunda fonte de verdade
    expect(semComentario(servico("web"))).not.toMatch(/ZAEON_ROLE/);
  });

  it("o motivo da trava: os dois serviços carregam o MESMO env_file", () => {
    // é isto que torna "ligar por env" insuficiente pra separar os papéis, e por isso a asserção
    // existe: se um dia os env_file divergirem, esta premissa precisa ser relida.
    for (const svc of ["web", "worker"]) {
      expect(semComentario(servico(svc)), svc).toMatch(/env_file:\s*\[['"]?\.env['"]?,\s*['"]?\.env\.secrets['"]?\]/);
    }
  });
});

describe("o reaper NÃO precisa de trava (e isto está medido, não suposto)", () => {
  it("roda uma vez no boot e é idempotente: filtra por updatedAt antigo e só vira queued/running", () => {
    const reaper = readFileSync(path.join(raiz, "lib/queue/reaper.ts"), "utf8");
    // one-shot: nenhum timer no módulo
    expect(reaper).not.toMatch(/setInterval|setTimeout/);
    // idempotente: o filtro exige status em queued/running, e o update tira deles
    expect(reaper).toMatch(/status:\s*\{\s*in:\s*\["queued",\s*"running"\]\s*\}/);
    expect(reaper).toMatch(/status:\s*"error"/);
    // e só alcança o que PAROU: updatedAt (não createdAt) com folga de STUCK_MS
    expect(reaper).toMatch(/updatedAt:\s*\{\s*lt:\s*cutoff\s*\}/);
    expect(reaper).toMatch(/STUCK_MS = 15 \* 60 \* 1000/);
  });
});
