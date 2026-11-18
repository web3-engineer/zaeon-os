---
name: kicad-eletronica
description: Entrega o KiCad, a suíte open-source de projeto eletrônico (EDA) — captura de esquemático, layout de placa de circuito impresso, visualização 3D e geração de Gerbers — com a instalação e o roteiro da primeira placa. Use quando o aluno quiser desenhar um esquemático, projetar uma PCB, mandar fabricar uma placa, entender ERC e DRC, ou perguntar por uma alternativa livre ao Altium ou ao Eagle. É um app de DISPOSITIVO — o aluno baixa e roda no computador dele; a Zaeon entrega o espelho oficial e as instruções, não executa o KiCad. KiCad (KiCad Developers, GPL-3.0-or-later).
license: GPL-3.0-or-later
runtime: ts
risk: read
minPlan: free
courseTags:
  - eletronica
  - engenharia-eletrica
  - sistemas-embarcados
  - hardware
metadata:
  zaeon-familia: device
  zaeon-titulo: KiCad — do esquemático à placa fabricada
  zaeon-subtitulo: Projeto eletrônico profissional e livre no seu computador — esquemático, PCB, 3D e Gerbers
  zaeon-modelo: chip
  zaeon-tags: KiCad, eletrônica, PCB, esquemático, hardware, open source
  zaeon-entrega: o espelho oficial de download do KiCad (GPL-3.0-or-later); a instalação; o fluxo esquemático, footprints e layout; como ler e zerar ERC e DRC; a exportação de Gerbers e furação para a fábrica
  zaeon-device-plataforma: windows
  zaeon-device-mirror: https://www.kicad.org/download/
  zaeon-app-licenca: GPL-3.0-or-later (KiCad, KiCad Developers)
---

# KiCad — do esquemático à placa fabricada

Procedimento para instalar e começar no **KiCad**, a suíte open-source de automação de projeto
eletrônico (EDA). Código-fonte em https://gitlab.com/kicad/code/kicad (espelho em
https://github.com/KiCad/kicad-source-mirror), licença **GNU GPL versão 3 ou posterior**.

Este é um card de **dispositivo**: o KiCad roda **no computador do aluno**, não no servidor da
Zaeon. A casa entrega o espelho oficial de download e estas instruções.

## Instalação

1. **Baixe** pelo espelho do card — a página oficial, com instaladores para **Windows**, **macOS**
   e **Linux** (o card marca Windows por ser o caso mais comum).
2. Instale **com as bibliotecas** de símbolos, footprints e modelos 3D — é o download grande, e é
   o que evita desenhar cada componente à mão.

## O fluxo de uma placa

1. **Projeto novo.** O KiCad cria o esquemático (`.kicad_sch`) e a placa (`.kicad_pcb`) juntos.
2. **Esquemático**: tecla **A** adiciona símbolo, **W** puxa fio, **L** põe rótulo de rede. Todo
   CI tem alimentação e **capacitor de desacoplamento** — desenhe os dois.
3. **ERC** (Electrical Rules Check): rode e zere. Pino de alimentação sem fonte e pino solto são
   os avisos clássicos; pino deixado sem ligar de propósito leva a marca de "não conectado".
4. **Atribua footprints**: cada símbolo ganha o encapsulamento físico. Confira no datasheet —
   o mesmo componente existe em vários tamanhos, e este é o erro que só aparece com a placa na mão.
5. **Placa**: *Update PCB from Schematic*. Desenhe a borda na camada `Edge.Cuts`, posicione os
   componentes (conectores na borda, desacoplamento colado no CI) e só então roteie as trilhas.
6. **Largura de trilha** segue a corrente. Preencha um **plano de terra** numa face.
7. **DRC** (Design Rules Check) com as regras da fábrica escolhida: zere antes de exportar.
8. **Fabricação**: *Plot* gera os **Gerbers**, e *Generate Drill Files* gera a furação. Abra tudo
   no visualizador de Gerber do próprio KiCad antes de enviar.

## O que esta skill NÃO faz

- **Não executa o KiCad no servidor da Zaeon.** É dispositivo: roda na máquina do aluno.
- **Não redistribui o instalador.** O espelho aponta para a página oficial do projeto.
- **Não valida segurança elétrica.** Projeto ligado à rede (127/220 V), de alta corrente ou
  bateria de lítio exige revisão de profissional habilitado e as normas aplicáveis — placa de
  estudo fica em baixa tensão.
