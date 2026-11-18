---
name: invesalius-imagem-medica
description: Entrega o InVesalius, software brasileiro e open-source do CTI Renato Archer que reconstrói em 3D imagens de tomografia e ressonância (DICOM) — segmentar osso e tecido, gerar a malha 3D e exportar para impressão 3D. Use quando o aluno de medicina, odontologia, radiologia ou engenharia biomédica quiser abrir um exame DICOM, estudar anatomia em imagem real, entender segmentação por limiar, ou preparar um modelo anatômico para impressão 3D de estudo. É um app de DISPOSITIVO — o aluno baixa e roda no computador dele; a Zaeon entrega o espelho e as instruções, não executa o app. InVesalius (CTI Renato Archer, GPL-2.0).
license: GPL-2.0-only
runtime: ts
risk: read
minPlan: free
courseTags:
  - medicina
  - radiologia
  - engenharia-biomedica
  - odontologia
metadata:
  zaeon-familia: device
  zaeon-titulo: InVesalius — do exame ao modelo 3D
  zaeon-subtitulo: Software brasileiro e livre que transforma tomografia e ressonância em reconstrução tridimensional
  zaeon-modelo: robo
  zaeon-tags: InVesalius, DICOM, tomografia, reconstrução 3D, medicina, open source
  zaeon-entrega: o espelho oficial do InVesalius (GPL-2.0); como importar uma série DICOM; segmentação por limiar na escala Hounsfield; a superfície 3D e a exportação em STL; onde achar exames públicos anonimizados para estudo
  zaeon-device-plataforma: windows
  zaeon-device-mirror: https://invesalius.github.io/
  zaeon-app-licenca: GPL-2.0 (InVesalius, Centro de Tecnologia da Informação Renato Archer — CTI)
---

# InVesalius — do exame ao modelo 3D

Procedimento para instalar e usar o **InVesalius 3**, software de reconstrução 3D de imagens
médicas desenvolvido no Brasil pelo **CTI Renato Archer**. Código-fonte em
https://github.com/invesalius/invesalius3, licença **GNU GPL versão 2**.

Este é um card de **dispositivo**: o app roda **no computador do aluno**, não no servidor da
Zaeon. A casa entrega o espelho oficial de download e estas instruções. Isso importa em dobro aqui: exame médico é dado sensível,
e ele **não sai do computador do aluno**.

## Instalação

**Baixe** pelo espelho do card (o site oficial do projeto). O card marca Windows por ser o caso mais comum; os instaladores de **macOS** e **Linux** estão na mesma página.

## O fluxo

1. **Importar**: *Arquivo → Importar DICOM* e aponte a PASTA do exame. O InVesalius agrupa as
   fatias em séries; escolha a de cortes mais finos.
2. **Navegar**: três vistas (axial, coronal, sagital) mais o volume. Aprenda a achar a mesma
   estrutura nas três — é a habilidade central da anatomia por imagem.
3. **Segmentar por limiar**: crie uma máscara e escolha a faixa de densidade. Em tomografia a
   escala é **Hounsfield**: ar ≈ −1000, água = 0, tecido mole ≈ 20 a 80, osso acima de ~300. Os
   presets ("Osso", "Tecido mole") são um bom começo.
4. **Limpar a máscara** fatia a fatia onde o limiar pegou o que não devia (a mesa do tomógrafo,
   artefato de metal).
5. **Criar superfície 3D** a partir da máscara e **exportar em STL** para impressão de estudo.

## Dados para praticar

Use **exames públicos e anonimizados** — o próprio projeto e repositórios acadêmicos (como o
The Cancer Imaging Archive) oferecem séries de exemplo. Não use exame de paciente real.

## O que esta skill NÃO faz

- **Não executa o app no servidor da Zaeon.** É dispositivo: roda na máquina do aluno.
- **Não redistribui o instalador.** O espelho aponta para a página oficial do projeto.
- **Não faz diagnóstico.** É ferramenta de estudo e pesquisa; laudo é de médico radiologista.
- **Não é para planejamento cirúrgico real** sem validação clínica e responsável técnico.
- **Não recebe exame de paciente.** Nada de DICOM identificável enviado ao chat — dado de saúde
  é sensível pela LGPD.
