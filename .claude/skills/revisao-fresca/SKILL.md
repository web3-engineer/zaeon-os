---
name: revisao-fresca
description: Revisa um documento ou especificação com "olhos de peixinho" — sem o contexto da conversa que o gerou — para expor suposições não ditas e pontos cegos. Use quando o aluno pedir revisão de um texto, de uma especificação, de um plano ou de um projeto, e quiser uma leitura que não foi contaminada pela discussão anterior. Responde em JSON. Roda em Claude, Codex e Octa. Inspirada no Elephant Goldfish Model (google, Apache-2.0).
license: Apache-2.0
runtime: ts
risk: read
minPlan: free
courseTags:
  - escrita
  - revisao
  - engenharia-de-software
  - produto
metadata:
  zaeon-familia: agentic
  zaeon-titulo: Revisão com olhos frescos
  zaeon-subtitulo: Um revisor sem o contexto da conversa — expõe a suposição que você nem viu que fez
  zaeon-modelo: livro
  zaeon-tags: revisão, especificação, pontos cegos, agente
  zaeon-entrega: os achados em JSON (suposicao, risco, pergunta); uma leitura sem o viés da conversa anterior; roda em Claude, Codex e Octa; inspirada no Elephant Goldfish Model (Apache-2.0)
  zaeon-app-licenca: Apache-2.0 (Elephant Goldfish Model, Google, 2026)
---

# Revisão com olhos frescos

Procedimento de revisão "peixinho" (do Elephant Goldfish Model, Apache-2.0): ler um documento SEM o
contexto da conversa que o criou, justamente para enxergar o que quem escreveu já não enxerga — a
suposição que virou óbvia, o detalhe que "todo mundo sabe", o caso que ninguém levantou.

## O que fazer

Leia o documento que o aluno enviar como se fosse a PRIMEIRA vez. Não assuma nada que não esteja
escrito. Procure:

- **Suposições não ditas** — coisas que o texto trata como dadas mas não justifica;
- **Pontos cegos** — o caso, o usuário ou o cenário que o texto esqueceu;
- **Ambiguidades** — frases que duas pessoas leriam de dois jeitos.

Não reescreva o documento. Aponte, para quem escreveu decidir.

## O formato da resposta — OBRIGATÓRIO

Responda **APENAS um array JSON**, sem texto em volta. Cada achado é um objeto com estas chaves:

- `suposicao` — a coisa que o texto assume sem dizer;
- `risco` — o que dá errado se a suposição for falsa, em uma frase;
- `pergunta` — a pergunta que quem escreveu deveria responder.

Se o documento não tiver pontos cegos relevantes, responda `[]` — nunca invente um achado.

## Limites

- **Aponta, não reescreve.** A decisão é de quem escreveu.
- **Olhos frescos de propósito.** Se o aluno colar o contexto da conversa, ignore-o: o valor é
  justamente ler sem ele.
