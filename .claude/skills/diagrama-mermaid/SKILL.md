---
name: diagrama-mermaid
description: Transforma uma descrição em texto num diagrama — fluxograma, diagrama de sequência, de classes, de estados ou entidade-relacionamento — escrito em sintaxe Mermaid, que a página renderiza como figura. Use quando o aluno pedir para desenhar um fluxograma, diagramar um algoritmo, um processo, a arquitetura de um sistema, um banco de dados ou a troca de mensagens entre partes. Responde em JSON. Roda em Claude, Codex e Octa. A renderização é do Mermaid (Knut Sveidqvist e contribuidores, MIT).
license: MIT
runtime: ts
risk: read
minPlan: free
courseTags:
  - computacao
  - engenharia-de-software
  - algoritmos
  - modelagem
metadata:
  zaeon-familia: agentic
  zaeon-titulo: Do texto ao diagrama
  zaeon-subtitulo: Descreva o processo ou o sistema e receba o diagrama em Mermaid, pronto para renderizar — em qualquer modelo
  zaeon-modelo: engrenagem
  zaeon-tags: Mermaid, diagrama, fluxograma, UML, agente
  zaeon-entrega: o diagrama em sintaxe Mermaid válida; a escolha do tipo certo de diagrama para o pedido; o título e a leitura do diagrama em uma frase; roda em Claude, Codex e Octa; renderização pelo Mermaid (MIT)
  zaeon-app-licenca: MIT (Mermaid, Knut Sveidqvist e contribuidores)
---

# Do texto ao diagrama

Procedimento para transformar uma descrição em um **diagrama em sintaxe Mermaid**, que a página
renderiza no navegador do aluno. O **Mermaid** (https://github.com/mermaid-js/mermaid) é a
biblioteca open-source de diagramas a partir de texto, licença **MIT**; esta skill produz a
entrada dele, não o redistribui.

## O que fazer

1. **Escolha o tipo pelo que o pedido descreve**:
   - passos e decisões de um processo ou algoritmo → `flowchart TD`;
   - mensagens trocadas entre partes ao longo do tempo → `sequenceDiagram`;
   - classes, atributos e heranças → `classDiagram`;
   - estados e transições → `stateDiagram-v2`;
   - tabelas e relacionamentos de um banco → `erDiagram`.
2. **Desenhe só o que foi dito.** Não invente etapa, classe ou tabela para o diagrama "ficar
   completo"; o que faltar vai em `leitura` como pergunta ao aluno.
3. **Mantenha legível**: até ~15 nós. Processo maior vira dois diagramas — avise em `leitura`.
4. **Sintaxe segura**: identificadores sem espaço nem acento (`A`, `validar_pedido`); o texto
   visível vai entre colchetes e aspas (`A["Validar pedido"]`); decisão em losango
   (`B{"Estoque disponível?"}`) com as saídas rotuladas (`B -->|sim| C`).

## O formato da resposta — OBRIGATÓRIO

Responda **APENAS um objeto JSON**, sem texto em volta, sem cercas de markdown, com EXATAMENTE
estas chaves:

- `titulo` — o nome do diagrama, curto;
- `tipo` — `flowchart`, `sequence`, `class`, `state` ou `er`;
- `mermaid` — o código Mermaid completo, com as quebras de linha como `\n`;
- `leitura` — uma frase dizendo como ler o diagrama, ou a dúvida que ficou em aberto.

Exemplo:

```
{"titulo":"Login","tipo":"flowchart","mermaid":"flowchart TD\n  A[\"Informar e-mail e senha\"] --> B{\"Credenciais corretas?\"}\n  B -->|sim| C[\"Entrar\"]\n  B -->|não| D[\"Mostrar erro\"]","leitura":"De cima para baixo; o losango é a decisão."}
```

## O que esta skill NÃO faz

- **Não renderiza a imagem.** Entrega o código; quem desenha é o Mermaid, na página.
- **Não decide a arquitetura pelo aluno.** Diagrama o que ele descreveu e aponta o que falta.
- **Não substitui a especificação.** Diagrama resume; regra de negócio continua no texto.
