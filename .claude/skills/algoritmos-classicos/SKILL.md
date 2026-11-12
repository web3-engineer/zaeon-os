---
name: algoritmos-classicos
description: Curso completo e gratuito de três algoritmos que todo programador precisa saber de cor — busca binária, ordenação por inserção e o algoritmo de Euclides — com o porquê de cada um funcionar, o custo (notação O) e prática em Python com teste automático. Use quando o aluno quiser aprender algoritmos e estruturas de dados, se preparar para prova ou entrevista técnica, entender complexidade e notação O na prática, ou pedir um curso de lógica de programação com exercícios. Baseado nas implementações de referência do repositório TheAlgorithms/Python (MIT), creditado e linkado.
license: MIT
runtime: ts
risk: read
minPlan: free
courseTags:
  - programacao
  - algoritmos
  - python
  - ciencia-da-computacao
metadata:
  zaeon-familia: course
  zaeon-titulo: Algoritmos clássicos — buscar, ordenar, dividir
  zaeon-subtitulo: Busca binária, ordenação por inserção e Euclides, com o porquê, o custo e a prática em Python
  zaeon-modelo: engrenagem
  zaeon-tags: algoritmos, Python, complexidade, busca binária, ordenação, open source
  zaeon-entrega: três módulos com conteúdo de estudo; prova e desafio por módulo; sandbox Python com teste automático que distingue a solução certa do atalho; crédito e link para o TheAlgorithms/Python (MIT)
  zaeon-curso-fonte: https://github.com/TheAlgorithms/Python
  zaeon-app-licenca: MIT (TheAlgorithms/Python, TheAlgorithms e contribuidores)
---

# Algoritmos clássicos — buscar, ordenar, dividir

Curso autorado (conteúdo completo em `curso.json`, ao lado deste arquivo). Três algoritmos
fundamentais, cada um com o **porquê** de funcionar, o **custo** e a **prática em Python** com
teste automático.

As implementações de referência são as do repositório **TheAlgorithms/Python**
(https://github.com/TheAlgorithms/Python), licença **MIT** — a maior coleção aberta de
algoritmos implementados para estudo. O texto, as provas e os testes deste curso são autoria da
casa; o repositório é a referência creditada para o aluno ir além.

## Os módulos

1. **Busca binária** — achar em O(log n); o invariante que evita o laço infinito.
2. **Ordenação por inserção** — o baralho na mão; melhor e pior caso; estável e in-place.
3. **Algoritmo de Euclides** — o MDC sem fatorar; por que o resto preserva os divisores.

## Como conduzir o aluno

- A ordem importa: o módulo 1 apresenta o **invariante de laço**, que os outros dois reusam.
- No sandbox, o teste **não aceita atalho**: a busca tem de ser logarítmica (o teste conta as
  leituras), a ordenação não pode chamar `.sort()` e tem de ser in-place, e o MDC tem de ser
  rápido (o teste cronometra: laço de divisores não passa).
- Quando o aluno travar, peça que ele **simule à mão** com uma lista de 5 itens e diga o valor
  de cada variável a cada passo — é assim que o erro de índice aparece.
- Não entregue a solução do sandbox. Dê a próxima pergunta, não a próxima linha.

## O que esta skill NÃO faz

- **Não cobre a disciplina inteira de estruturas de dados.** São três algoritmos-base; grafos,
  árvores e programação dinâmica ficam para os próximos cursos.
- **Não resolve o exercício pelo aluno.** O sandbox existe para ele escrever o código.
- **Não redistribui o código do TheAlgorithms/Python.** Aponta e credita; o aluno lê na fonte.
