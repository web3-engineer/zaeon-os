---
name: freecad-cad
description: Entrega o FreeCAD, o modelador CAD 3D paramétrico open-source, com a instalação e o roteiro da primeira peça — esboço restrito, extrusão, furo e desenho técnico — pronta para impressão 3D ou usinagem. Use quando o aluno quiser projetar uma peça mecânica, aprender CAD paramétrico, gerar um desenho técnico cotado, exportar STEP ou STL, ou perguntar por uma alternativa livre ao SolidWorks ou ao Fusion. É um app de DISPOSITIVO — o aluno baixa e roda no computador dele; a Zaeon entrega o espelho e as instruções, não executa o FreeCAD. FreeCAD (FreeCAD project, LGPL-2.1-or-later).
license: LGPL-2.1-or-later
runtime: ts
risk: read
minPlan: free
courseTags:
  - engenharia-mecanica
  - cad
  - desenho-tecnico
  - impressao-3d
metadata:
  zaeon-familia: device
  zaeon-titulo: FreeCAD — sua primeira peça paramétrica
  zaeon-subtitulo: CAD 3D livre no seu computador — do esboço cotado à peça pronta para imprimir ou usinar
  zaeon-modelo: engrenagem
  zaeon-tags: FreeCAD, CAD, engenharia mecânica, impressão 3D, open source
  zaeon-entrega: o espelho de download do FreeCAD (LGPL-2.1-or-later); a instalação; o fluxo esboço, restrição e extrusão no Part Design; como gerar o desenho técnico cotado no TechDraw; exportação em STEP e STL
  zaeon-device-plataforma: windows
  zaeon-device-mirror: https://github.com/FreeCAD/FreeCAD/releases/latest
  zaeon-app-licenca: LGPL-2.1-or-later (FreeCAD, Juergen Riegel, Werner Mayer, Yorik van Havre e contribuidores)
---

# FreeCAD — sua primeira peça paramétrica

Procedimento para instalar e começar no **FreeCAD**, modelador CAD 3D **paramétrico** e
open-source. Código-fonte em https://github.com/FreeCAD/FreeCAD, licença **GNU LGPL 2.1 ou
posterior**.

Este é um card de **dispositivo**: o FreeCAD roda **no computador do aluno**, não no servidor da
Zaeon. A casa entrega o espelho de download e estas instruções.

## Instalação

1. **Baixe** pelo espelho do card — a página de releases do repositório oficial, com instaladores
   para **Windows**, **macOS** e **Linux** (AppImage). O card marca Windows por ser o caso mais
   comum.
2. Instale e, na primeira abertura, escolha unidades (**mm**, padrão de mecânica) e o estilo de
   navegação do mouse que você já conhece (há o estilo "Blender" e o estilo "CAD").

## O que "paramétrico" quer dizer — ensine isto primeiro

Em CAD paramétrico você não desenha a forma: você descreve **as regras** dela. Um furo fica "a
10 mm da borda", não "naquele lugar". Mudou a largura da peça, o furo acompanha. A árvore de
operações à esquerda é a receita da peça, e pode ser editada em qualquer ponto.

## A primeira peça (bancada *Part Design*)

1. **Novo documento** → bancada **Part Design** → **Criar corpo** → **Criar esboço** no plano XY.
2. Desenhe um retângulo. Ele aparece **branco**: está solto, com graus de liberdade sobrando.
3. **Restrinja**: cotas de largura e altura, e prenda um canto ou o centro à origem. Quando o
   esboço fica **verde**, está totalmente restrito. **Só saia de um esboço verde** — esboço
   branco é a origem de quase todo modelo que "explode" depois.
4. **Pad** (extrusão) para dar espessura.
5. Novo esboço sobre a face de cima, um círculo cotado, e **Pocket** para abrir o furo.
6. **Fillet** ou **Chamfer** nas arestas — por último, sempre.

## Desenho técnico e exportação

- Bancada **TechDraw**: insira uma página, as vistas (frontal, superior, lateral) e as cotas.
  Use a folha no padrão **ABNT/ISO** (primeiro diedro).
- **STEP** (`.step`) para mandar a outro CAD ou para usinagem — preserva a geometria exata.
- **STL** ou **3MF** para o fatiador da impressora 3D — é malha, não geometria; exporte por último.

## O que esta skill NÃO faz

- **Não executa o FreeCAD no servidor da Zaeon.** É dispositivo: roda na máquina do aluno.
- **Não substitui o responsável técnico.** Peça com função estrutural ou de segurança exige
  cálculo e assinatura de engenheiro habilitado.
- **Não projeta arma nem peça de arma.** Pedido nessa direção não é atendido.
