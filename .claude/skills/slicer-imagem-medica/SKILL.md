---
name: slicer-imagem-medica
description: Entrega o 3D Slicer, a plataforma open-source de visualização e análise de imagens médicas usada em pesquisa no mundo todo — abrir DICOM, navegar nos três planos, segmentar estruturas, reconstruir em 3D e medir. Use quando o aluno de medicina, radiologia, física médica ou engenharia biomédica quiser analisar tomografia ou ressonância, segmentar um órgão ou tumor para pesquisa, registrar duas imagens, ou precisar de uma ferramenta com extensões de pesquisa. É um app de DISPOSITIVO — o aluno baixa e roda no computador dele; a Zaeon entrega o espelho e as instruções, não executa o app. 3D Slicer (Brigham and Women's Hospital e contribuidores, licença Slicer de estilo BSD).
license: LicenseRef-Slicer-1.0
runtime: ts
risk: read
minPlan: free
courseTags:
  - medicina
  - radiologia
  - fisica-medica
  - engenharia-biomedica
metadata:
  zaeon-familia: device
  zaeon-titulo: 3D Slicer — imagem médica para pesquisa
  zaeon-subtitulo: A plataforma livre dos laboratórios de imagem — DICOM, segmentação, reconstrução 3D e medidas
  zaeon-modelo: robo
  zaeon-tags: 3D Slicer, DICOM, segmentação, imagem médica, pesquisa, open source
  zaeon-entrega: o espelho oficial do 3D Slicer (licença Slicer, estilo BSD); como importar DICOM; os três planos e o volume; o Segment Editor passo a passo; medidas e exportação do modelo; onde achar dados públicos anonimizados
  zaeon-device-plataforma: windows
  zaeon-device-mirror: https://download.slicer.org/
  zaeon-app-licenca: 3D Slicer Contribution and Software License Agreement, versão 1.0 — permissiva, de estilo BSD (Brigham and Women's Hospital e contribuidores)
---

# 3D Slicer — imagem médica para pesquisa

Procedimento para instalar e começar no **3D Slicer**, plataforma open-source de visualização e
análise de imagens médicas. Código-fonte em https://github.com/Slicer/Slicer. A licença é a
**3D Slicer Contribution and Software License Agreement** — própria do projeto, permissiva, de
estilo BSD (texto em `License.txt` no repositório); ela não tem identificador SPDX, e entrou no
catálogo por decisão do dono.

Este é um card de **dispositivo**: o app roda **no computador do aluno**, não no servidor da
Zaeon. A casa entrega o espelho oficial de download e estas instruções. Exame médico é dado sensível, e ele **não sai do
computador do aluno**.

## Instalação

**Baixe** pelo espelho do card (a página oficial de download). O card marca Windows por ser o
caso mais comum; os instaladores de **macOS** e **Linux** estão na mesma página. Prefira a
versão **Stable**.

## O fluxo

1. **Carregar dados**: módulo *DICOM* → *Import DICOM files* → selecione a pasta → *Load*. Para
   treinar sem exame nenhum, o módulo *Sample Data* baixa volumes de exemplo.
2. **Navegar**: três fatias (vermelha = axial, amarela = sagital, verde = coronal) e a vista 3D.
   Ajuste janela e nível arrastando o mouse com o botão esquerdo sobre a fatia.
3. **Segmentar** (módulo *Segment Editor*): crie um segmento, use **Threshold** para a faixa de
   intensidade, **Islands** para manter só a região conectada que interessa, **Paint** e
   **Erase** para corrigir, e **Smoothing** no fim.
4. **Show 3D** mostra a superfície. *Segment Statistics* dá volume e área.
5. **Medir**: módulo *Markups* para régua, ângulo e pontos de referência.
6. **Exportar**: o segmento em STL ou OBJ para impressão 3D de estudo.

## Slicer ou InVesalius?

Os dois abrem DICOM e reconstroem em 3D. O **InVesalius** (card `invesalius-imagem-medica`) é
mais direto e tem interface em português — bom para o primeiro contato. O **Slicer** tem mais
ferramentas e extensões — é o caminho para projeto de pesquisa.

## O que esta skill NÃO faz

- **Não executa o app no servidor da Zaeon.** É dispositivo: roda na máquina do aluno.
- **Não redistribui o instalador.** O espelho aponta para a página oficial do projeto.
- **Não faz diagnóstico nem serve para uso clínico.** A própria licença do Slicer avisa que o
  software não é aprovado para uso clínico; é ferramenta de pesquisa e de ensino.
- **Não recebe exame de paciente.** Nada de DICOM identificável enviado ao chat — dado de saúde
  é sensível pela LGPD. Para estudar, use dados públicos anonimizados.
