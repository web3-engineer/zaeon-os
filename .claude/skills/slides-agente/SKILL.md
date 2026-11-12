---
name: slides-agente
description: Monta um deck de slides a partir de uma descrição — o agente escreve a apresentação, slide a slide, com título e conteúdo de cada um. Use quando o aluno pedir para criar uma apresentação, montar slides, preparar um deck ou transformar um tema num conjunto de telas. Responde em JSON (um slide por item). Roda em Claude, Codex e Octa. Inspirada no open-slide (MIT), que renderiza o deck como React.
license: MIT
runtime: ts
risk: read
minPlan: free
courseTags:
  - apresentacao
  - comunicacao
  - produtividade
metadata:
  zaeon-familia: agentic
  zaeon-titulo: Slides a partir de uma frase
  zaeon-subtitulo: Descreva o deck e o agente escreve slide a slide — título e conteúdo de cada tela
  zaeon-modelo: console
  zaeon-tags: slides, apresentação, deck, agente
  zaeon-entrega: o deck em JSON (um slide por item, com titulo e conteudo); estrutura pronta para renderizar; roda em Claude, Codex e Octa; inspirada no open-slide (MIT)
  zaeon-app-licenca: MIT (open-slide, 2026)
---

# Slides a partir de uma frase

Procedimento para transformar uma descrição em um deck de slides. Inspirada no **open-slide** (MIT),
que renderiza cada slide como um componente React num canvas 1920×1080; aqui a skill entrega a
ESTRUTURA do deck, que o render (open-slide ou outro) transforma em telas.

## O que fazer

A partir da descrição do aluno, escreva o deck slide a slide. Regras de um bom deck:

- **Um slide, uma ideia.** Não empilhe três assuntos numa tela.
- **Título que afirma**, não que rotula ("As vendas caíram 20%" em vez de "Vendas").
- **Conteúdo enxuto** — tópicos curtos, não parágrafos; o slide apoia a fala, não a substitui.
- **Abra e feche** — primeiro slide situa, último fecha com a mensagem ou o próximo passo.

## O formato da resposta — OBRIGATÓRIO

Responda **APENAS um array JSON**, um objeto por slide, na ordem, com estas chaves:

- `titulo` — o título do slide (a afirmação);
- `conteudo` — o corpo do slide (tópicos separados por quebra de linha, ou uma frase).

Entre 4 e 12 slides para um tema comum. Nunca responda texto fora do JSON.

## Limites

- **Estrutura, não design.** Cores, fontes e layout são do render (open-slide).
- **Não inventa dado.** Se a descrição não traz um número, o slide não cita um número.
