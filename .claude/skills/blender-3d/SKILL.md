---
name: blender-3d
description: Entrega o Blender, a suíte open-source de criação 3D — modelagem, escultura, animação, render e edição de vídeo — com a instalação e o roteiro do primeiro objeto renderizado. Use quando o aluno quiser aprender modelagem 3D, fazer uma animação, renderizar uma cena, preparar um modelo para impressão 3D ou para um jogo, ou perguntar por onde começar no Blender. É um app de DISPOSITIVO — o aluno baixa e roda no computador dele; a Zaeon entrega o espelho oficial e as instruções, não executa o Blender. Blender (Blender Foundation, GNU GPL).
license: GPL-2.0-or-later
runtime: ts
risk: read
minPlan: free
courseTags:
  - design
  - modelagem-3d
  - animacao
  - jogos
metadata:
  zaeon-familia: device
  zaeon-titulo: Blender — do cubo ao render
  zaeon-subtitulo: A suíte 3D livre que estúdios usam, no seu computador — modelar, animar e renderizar
  zaeon-modelo: foguete
  zaeon-tags: Blender, 3D, modelagem, animação, render, open source
  zaeon-entrega: o espelho oficial de download do Blender (GNU GPL); a instalação; o mapa da interface e os atalhos que importam; o roteiro do primeiro objeto modelado e renderizado; como exportar para impressão 3D (STL) e para jogos (glTF)
  zaeon-device-plataforma: windows
  zaeon-device-mirror: https://www.blender.org/download/
  zaeon-app-licenca: GNU GPL (Blender, Blender Foundation; código-fonte GPL-2.0-or-later)
---

# Blender — do cubo ao render

Procedimento para instalar e começar no **Blender**, a suíte open-source de criação 3D.
Código-fonte em https://projects.blender.org/blender/blender (espelho em
https://github.com/blender/blender), licença **GNU GPL**, da Blender Foundation. O que o aluno
CRIA no Blender é dele: a GPL cobre o programa, não as obras feitas com ele.

Este é um card de **dispositivo**: o Blender roda **no computador do aluno**, não no servidor da
Zaeon. A casa entrega o espelho oficial e estas instruções.

## Instalação

1. **Baixe** pelo espelho do card — a página oficial. Há versões para **Windows**, **macOS**
   (Intel e Apple Silicon) e **Linux**; o card marca Windows por ser o caso mais comum.
2. Iniciante fica na versão **LTS** — os tutoriais demoram a acompanhar a versão mais nova.
3. Um mouse de **três botões** muda tudo: o botão do meio orbita a cena. No notebook sem mouse,
   ative *Preferences → Input → Emulate 3 Button Mouse*.

## Os atalhos que fazem o Blender deixar de assustar

- **G / R / S** — mover (grab), rotacionar, escalar. Depois **X, Y ou Z** para travar no eixo.
- **Tab** — alterna entre *Object Mode* (a cena) e *Edit Mode* (os vértices do objeto).
- **Shift+A** — adicionar objeto. **X** — apagar. **Ctrl+Z** — desfazer.
- **Numpad 1 / 3 / 7** — vistas de frente, lado e topo. **Numpad 0** — a visão da câmera.
- **F12** — renderizar.

## O primeiro objeto, em cinco passos

1. No cubo padrão, **Tab** para entrar em Edit Mode.
2. **Ctrl+R** cria um corte em laço; **E** extruda uma face. Só com esses dois dá para fazer uma
   caneca, uma mesa, um prédio.
3. Volte ao Object Mode, botão direito → **Shade Smooth**, e adicione o modificador
   **Subdivision Surface** para arredondar.
4. Na aba **Material**, crie um material e escolha cor, rugosidade e metal.
5. Posicione a câmera (**Numpad 0**, depois *View → Align View → Align Active Camera to View*),
   escolha o motor (**EEVEE** rápido, **Cycles** realista) e **F12**.

## Exportar

- **Impressão 3D** → *File → Export → STL*, com a malha fechada (sem buracos) e escala em mm.
- **Jogo ou web** → *File → Export → glTF 2.0* (`.glb`), o formato que Godot, Unity e Three.js leem.

## O que esta skill NÃO faz

- **Não executa o Blender no servidor da Zaeon.** É dispositivo: roda na máquina do aluno, e usa
  a placa de vídeo dele.
- **Não redistribui o instalador.** O espelho aponta para a página oficial da Blender Foundation.
- **Não gera o modelo pelo aluno.** Ensina o caminho; a modelagem é a prática dele.
- **Não serve para recriar a imagem de uma pessoa real sem consentimento.** Retrato 3D de alguém
  exige a autorização dessa pessoa.
