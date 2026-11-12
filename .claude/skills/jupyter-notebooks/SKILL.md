---
name: jupyter-notebooks
description: Ensina a trabalhar com notebooks Jupyter — células de código e de texto, a ordem de execução, o kernel, e como entregar um notebook que outra pessoa consegue reexecutar — incluindo o JupyterLite, que roda Python inteiro no navegador, sem instalar nada. Use quando o aluno perguntar o que é um notebook, como usar Jupyter ou JupyterLab, por que o notebook dele "funciona só na minha máquina", ou quiser começar a programar em Python sem instalar nada. Jupyter e JupyterLite (Project Jupyter, BSD-3-Clause).
license: BSD-3-Clause
runtime: ts
risk: read
minPlan: free
courseTags:
  - python
  - ciencia-de-dados
  - computacao
  - metodo-cientifico
metadata:
  zaeon-familia: procedimento
  zaeon-titulo: Notebooks Jupyter, do zero ao reprodutível
  zaeon-subtitulo: Código, texto e gráfico no mesmo documento — e o JupyterLite para rodar no navegador sem instalar nada
  zaeon-modelo: livro
  zaeon-tags: Jupyter, JupyterLite, Python, notebook, open source
  zaeon-entrega: o modelo mental de célula, kernel e ordem de execução; como abrir um notebook no navegador com JupyterLite; o roteiro de um notebook reprodutível; os erros clássicos de estado escondido e como evitá-los
  zaeon-app-licenca: BSD-3-Clause (Project Jupyter Contributors; JupyterLite Contributors)
---

# Notebooks Jupyter, do zero ao reprodutível

Procedimento para ensinar e orientar o uso de **notebooks Jupyter** — o formato em que código,
texto explicativo e resultado (tabela, gráfico) vivem no mesmo documento. As fontes são o
**JupyterLab** (https://github.com/jupyterlab/jupyterlab) e o **JupyterLite**
(https://github.com/jupyterlite/jupyterlite), ambos do Project Jupyter, licença **BSD-3-Clause**.

Não é um app que a Zaeon executa para o aluno: é conhecimento. Onde o aluno quiser praticar sem
instalar nada, aponte o JupyterLite (roda no navegador dele, via Pyodide/WebAssembly) ou o sandbox
Python dos cursos da casa, que usa a mesma tecnologia.

## O modelo mental — explique ANTES de qualquer atalho

1. **Célula.** Um notebook é uma lista de células. Célula de **código** executa; célula de
   **Markdown** explica. Um bom notebook alterna as duas: a pergunta, o código, a leitura do
   resultado.
2. **Kernel.** É o processo que executa o código e guarda as variáveis na memória. O notebook é o
   papel; o kernel é a cabeça. Fechar o arquivo não apaga a cabeça; reiniciar o kernel apaga.
3. **Ordem de execução ≠ ordem na página.** O número entre colchetes (`[7]`) diz a ordem em que as
   células RODARAM. Rodar fora de ordem cria **estado escondido**: o notebook mostra um resultado
   que o código visível não reproduz mais.

## O que fazer, por pedido

- **"Quero começar sem instalar nada"** → JupyterLite: abre no navegador, o Python roda na própria
  aba. Avise os limites: os arquivos ficam no armazenamento do navegador (baixe o `.ipynb` para
  guardar) e nem toda biblioteca com código nativo existe ali.
- **"Quero instalar no meu computador"** → `pip install jupyterlab` e depois `jupyter lab`. Para
  cada projeto, um ambiente virtual próprio (`python -m venv .venv`), senão as versões das
  bibliotecas de um projeto quebram o outro.
- **"Meu notebook dá erro no computador do professor"** → é quase sempre estado escondido ou
  dependência não declarada. Aplique o roteiro abaixo.

## Roteiro do notebook reprodutível

1. A **primeira célula** importa tudo e fixa as sementes aleatórias.
2. Caminhos de arquivo **relativos** ao notebook, nunca `C:\Users\fulano\...`.
3. Antes de entregar: **Kernel → Restart & Run All**. Se não roda de cima a baixo num kernel
   limpo, não está pronto — por mais bonito que o resultado na tela pareça.
4. Liste as dependências com versão (`requirements.txt`) ao lado do `.ipynb`.
5. Cada gráfico tem título, eixos com unidade, e uma célula de texto dizendo o que ele mostra.

## O que esta skill NÃO faz

- **Não executa o notebook do aluno no servidor da Zaeon.** O JupyterLite roda no navegador dele;
  o JupyterLab, na máquina dele.
- **Não substitui um ambiente de produção.** Notebook é para explorar e explicar; código que vai
  rodar todo dia vira módulo e teste.
- **Não promete que toda biblioteca roda no navegador.** No JupyterLite só há o que foi compilado
  para WebAssembly; para o resto, a instalação local é o caminho.
