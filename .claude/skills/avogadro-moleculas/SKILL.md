---
name: avogadro-moleculas
description: Entrega o Avogadro 2, editor e visualizador molecular 3D open-source — montar uma molécula átomo a átomo, otimizar a geometria, medir ligações e ângulos e ver a forma prevista pela teoria. Use quando o aluno de química quiser visualizar uma molécula em 3D, entender geometria molecular e VSEPR, medir comprimento e ângulo de ligação, ou preparar a entrada de um cálculo de química quântica. É um app de DISPOSITIVO — o aluno baixa e roda no computador dele; a Zaeon entrega o espelho e as instruções, não executa o app. Avogadro (Kitware e contribuidores, BSD-3-Clause).
license: BSD-3-Clause
runtime: ts
risk: read
minPlan: free
courseTags:
  - quimica
  - quimica-organica
  - geometria-molecular
  - bioquimica
metadata:
  zaeon-familia: device
  zaeon-titulo: Avogadro — monte a molécula em 3D
  zaeon-subtitulo: Desenhe, otimize e meça moléculas em três dimensões no seu computador
  zaeon-modelo: molecula
  zaeon-tags: Avogadro, química, moléculas 3D, VSEPR, open source
  zaeon-entrega: o espelho oficial do Avogadro 2 (BSD-3-Clause); como montar e otimizar uma molécula; medir ligação, ângulo e diedro; o roteiro VSEPR com cinco moléculas clássicas; exportar imagem e arquivo para outros programas
  zaeon-device-plataforma: windows
  zaeon-device-mirror: https://two.avogadro.cc/install/index.html
  zaeon-app-licenca: BSD-3-Clause (Avogadro, Kitware Inc. e contribuidores — projeto Open Chemistry)
---

# Avogadro — monte a molécula em 3D

Procedimento para instalar e usar o **Avogadro 2**, editor e visualizador molecular do projeto
Open Chemistry. Código-fonte em https://github.com/OpenChemistry/avogadroapp e
https://github.com/OpenChemistry/avogadrolibs, licença **BSD-3-Clause**.

Este é um card de **dispositivo**: o app roda **no computador do aluno**, não no servidor da
Zaeon. A casa entrega o espelho oficial de download e estas instruções.

## Instalação

**Baixe** pelo espelho do card (a página oficial de instalação). O card marca Windows por ser o caso mais comum; os instaladores de **macOS** e **Linux** estão na mesma página.

## A primeira molécula

1. Ferramenta **Desenhar** (lápis): clique para pôr um carbono; arraste de um átomo para criar
   ligação. Os hidrogênios entram sozinhos (*Ajustar hidrogênios* ligado).
2. Troque o elemento na barra da ferramenta para pôr O, N, Cl.
3. **Extensões → Otimizar geometria** (Ctrl+Alt+O): o programa relaxa a estrutura com um campo
   de força. O desenho torto vira a forma 3D plausível.
4. Ferramenta **Medir**: clique em 2 átomos para distância, 3 para ângulo, 4 para diedro.

## Roteiro VSEPR (faça o aluno PREVER antes de medir)

| Molécula | Previsão | Ângulo a conferir |
|---|---|---|
| CO₂ | linear | 180° |
| BF₃ | trigonal plana | 120° |
| CH₄ | tetraédrica | 109,5° |
| NH₃ | piramidal | ~107° |
| H₂O | angular | ~104,5° |

A pergunta que ensina: por que NH₃ e H₂O fecham o ângulo em relação ao CH₄? (Par isolado
repele mais que par ligante.)

## O que esta skill NÃO faz

- **Não executa o app no servidor da Zaeon.** É dispositivo: roda na máquina do aluno.
- **Não redistribui o instalador.** O espelho aponta para a página oficial do projeto.
- **Não substitui cálculo quântico.** A otimização por campo de força é uma estimativa clássica;
  energia e reatividade pedem método quântico e outro programa.
- **Não dá rota de síntese** nem ajuda a produzir substância controlada ou perigosa.
