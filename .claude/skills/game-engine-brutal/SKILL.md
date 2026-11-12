---
name: game-engine-brutal
description: Curso completo sobre os fundamentos de uma engine de jogo de baixo nível — interop, matemática, e memória sem coletor de lixo — pela filosofia do framework BRUTAL (C#, MIT). Use quando o aluno quiser entender como uma game engine funciona por dentro, por que jogos evitam alocação de memória, ou aprender os alicerces antes de escolher Unity/Unreal/Godot. Curso pago. Baseado no framework BRUTAL (ahwootech, licença MIT), creditado e linkado.
license: MIT
runtime: ts
risk: read
minPlan: free
courseTags:
  - programacao
  - game-dev
  - csharp
  - sistemas
  - computacao
metadata:
  zaeon-familia: course
  zaeon-preco-brl: 545
  zaeon-titulo: Fundamentos de game engine, com BRUTAL
  zaeon-subtitulo: Como uma engine funciona por dentro — interop, matemática e memória sem coletor — pela filosofia do framework BRUTAL
  zaeon-modelo: engrenagem
  zaeon-tags: game engine, C#, baixo nível, memória, Vulkan
  zaeon-entrega: dois módulos com conteúdo de estudo; prova e desafio por módulo; sandbox Python com teste que ensina o conceito que o BRUTAL implementa em C#; crédito e link para o framework BRUTAL
  zaeon-curso-fonte: https://github.com/ahwootech/BRUTAL
  zaeon-app-licenca: MIT
---

# Fundamentos de game engine, com BRUTAL

Curso autorado (conteúdo completo em `curso.json`). Ensina os alicerces de uma engine de jogo de
baixo nível pela filosofia do **BRUTAL** (framework C# open-source, MIT, de ahwootech), creditado e
linkado. BRUTAL é usado de verdade: a Kitten Space Agency foi feita direto nele, e a Ludeon moveu o
RimWorld para fora da Unity sobre uma engine construída em cima dele.

Este é um card de **course pago** (R$ 545). O conteúdo é estático e viaja com a skill; o portão
valida que o curso está completo antes de ir para a vitrine. O curso pertence ao fundador (regra do
dono para pago e course).

## Por que BRUTAL, e por que ensinar por ele

BRUTAL faz **pouco** de propósito: interop (C# falando direto com APIs nativas), gerência de
memória, matemática, concorrência e bindings para Vulkan/GLFW/ImGui/FMOD. Não tem editor, nem scene
graph, nem renderer — "você escreve a sua própria pilha". É o oposto da Unity: mais difícil, e por
isso melhor para **entender** o que uma engine faz, em vez de só usar uma caixa-preta.

## O que o aluno sai sabendo

- **O que um framework de engine te dá, e o que ele deixa para você.** Interop, matemática,
  memória, concorrência — e por que BRUTAL para aí.
- **Matemática de jogo na prática:** vetores, produto escalar, comprimento — a base de movimento,
  colisão e câmera.
- **Memória sem coletor de lixo:** por que jogos fogem de alocação em tempo de execução, e como um
  *pool* de memória resolve isso.

## Como está organizado

- **Módulo 1 — O que a engine faz por você:** a filosofia do framework mínimo + a matemática de vetor.
- **Módulo 2 — Memória sem coletor:** por que alocar no loop do jogo trava, e como um pool resolve.

Cada módulo: conteúdo de estudo, prova corrigida, desafio e um sandbox **Python** com teste — o
Python roda no navegador e ensina o MESMO conceito que o BRUTAL implementa em C#, com o link para o
código real.
