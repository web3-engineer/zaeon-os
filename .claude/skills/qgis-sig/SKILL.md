---
name: qgis-sig
description: Entrega o QGIS, o sistema de informação geográfica (SIG) open-source de referência, com o passo a passo de instalação e o primeiro mapa — camadas vetoriais e raster, sistema de coordenadas, simbologia e exportação. Use quando o aluno quiser fazer um mapa, abrir um shapefile ou GeoPackage, trabalhar com geoprocessamento, cartografia ou dados do IBGE, ou perguntar por uma alternativa livre ao ArcGIS. É um app de DISPOSITIVO — o aluno baixa e roda no computador dele; a Zaeon entrega o espelho oficial e as instruções, não executa o QGIS. QGIS (QGIS.org, GPL-2.0-or-later).
license: GPL-2.0-or-later
runtime: ts
risk: read
minPlan: free
courseTags:
  - geografia
  - geoprocessamento
  - cartografia
  - engenharia-ambiental
metadata:
  zaeon-familia: device
  zaeon-titulo: QGIS — o seu laboratório de mapas
  zaeon-subtitulo: SIG profissional e livre no seu computador, do primeiro shapefile ao mapa pronto para o relatório
  zaeon-modelo: planta
  zaeon-tags: QGIS, SIG, mapas, geoprocessamento, open source
  zaeon-entrega: o espelho oficial de download do QGIS (GPL-2.0-or-later); o passo a passo de instalação; o roteiro do primeiro mapa com camadas e simbologia; os cuidados com sistema de coordenadas (SIRGAS 2000); onde achar dados públicos do Brasil
  zaeon-device-plataforma: windows
  zaeon-device-mirror: https://qgis.org/download/
  zaeon-app-licenca: GPL-2.0-or-later (QGIS, QGIS.org e contribuidores)
---

# QGIS — o seu laboratório de mapas

Procedimento para instalar e dar os primeiros passos no **QGIS**, o SIG (Sistema de Informação
Geográfica) open-source de referência. Código-fonte em https://github.com/qgis/QGIS, licença
**GNU GPL versão 2 ou posterior**, mantido pela associação QGIS.org.

Este é um card de **dispositivo**: o QGIS roda **no computador do aluno**, não no servidor da
Zaeon. A casa entrega o espelho oficial de download e estas instruções.

## Instalação

1. **Baixe** pelo espelho do card — a página oficial de download. Ela oferece instaladores para
   **Windows**, **macOS** e **Linux** (o card marca Windows por ser o caso mais comum; os outros
   estão na mesma página).
2. Prefira a versão **LTR** (Long Term Release): é a estável, a que os tutoriais e os plugins
   acompanham. A versão "Latest" tem novidades e mais arestas.
3. Instale com as opções padrão e abra o **QGIS Desktop**.

## O primeiro mapa

1. **Projeto novo → defina o SRC** (sistema de referência de coordenadas) no canto inferior
   direito. Para o Brasil, o oficial é **SIRGAS 2000** (EPSG:4674 geográfico; as zonas UTM
   SIRGAS 2000 para medir área e distância em metros).
2. **Adicione uma camada vetorial**: arraste um `.gpkg` ou `.shp` para o mapa. Dados públicos bons
   para começar: malhas municipais do **IBGE**, e os dados do **Natural Earth**.
3. **Abra a tabela de atributos** (botão direito na camada). Mapa é geometria MAIS tabela; quase
   toda análise começa na tabela.
4. **Simbologia**: propriedades da camada → Simbologia → *Graduado* para pintar por um número
   (população, renda) ou *Categorizado* para pintar por classe.
5. **Exporte**: Projeto → Novo layout de impressão. Todo mapa entregue tem **título, legenda,
   escala, norte e fonte dos dados** — sem isso é um desenho, não um mapa.

## O erro que mais derruba iniciante

Camadas em **SRC diferentes** medindo área em **graus**. Se a área saiu um número minúsculo e
sem sentido, a camada está em coordenadas geográficas: reprojete para um SRC métrico (UTM) antes
de calcular área, distância ou buffer.

## O que esta skill NÃO faz

- **Não executa o QGIS no servidor da Zaeon.** É dispositivo: roda na máquina do aluno.
- **Não redistribui o instalador.** O espelho aponta para a página oficial do projeto.
- **Não substitui levantamento oficial.** Mapa feito em aula não vale como documento cartográfico
  ou de georreferenciamento de imóvel; isso exige profissional habilitado.
