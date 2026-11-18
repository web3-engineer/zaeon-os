---
name: tracker-video-fisica
description: Entrega o Tracker, a ferramenta open-source de videoanálise para ensino de física — marcar um objeto quadro a quadro num vídeo e obter posição, velocidade e aceleração em gráficos e tabelas. Use quando o aluno for fazer um experimento de cinemática ou dinâmica com o celular (queda livre, lançamento oblíquo, pêndulo, colisão), precisar medir g, ou quiser um laboratório de física sem equipamento caro. É um app de DISPOSITIVO — o aluno baixa e roda no computador dele; a Zaeon entrega o espelho e as instruções, não executa o app. Tracker (Douglas Brown, Open Source Physics, GPL-3.0-or-later).
license: GPL-3.0-or-later
runtime: ts
risk: read
minPlan: free
courseTags:
  - fisica
  - mecanica
  - laboratorio
  - ensino-de-ciencias
metadata:
  zaeon-familia: device
  zaeon-titulo: Tracker — o laboratório de física no seu vídeo
  zaeon-subtitulo: Filme com o celular, marque quadro a quadro e tire posição, velocidade e aceleração de um movimento real
  zaeon-modelo: ondas
  zaeon-tags: Tracker, física, videoanálise, cinemática, laboratório, open source
  zaeon-entrega: o espelho oficial do Tracker (GPL-3.0-or-later); como filmar para o vídeo servir de medida; calibração de escala e de eixos; a marcação quadro a quadro; o ajuste de curva para achar g; as fontes de erro que vão no relatório
  zaeon-device-plataforma: windows
  zaeon-device-mirror: https://opensourcephysics.github.io/tracker-website/
  zaeon-app-licenca: GPL-3.0-or-later (Tracker, Douglas Brown, Wolfgang Christian e Robert M. Hanson — Open Source Physics)
---

# Tracker — o laboratório de física no seu vídeo

Procedimento para instalar e usar o **Tracker**, ferramenta de **videoanálise** do projeto Open
Source Physics. Código-fonte em https://github.com/OpenSourcePhysics/tracker, licença
**GNU GPL versão 3 ou posterior**.

Este é um card de **dispositivo**: o app roda **no computador do aluno**, não no servidor da
Zaeon. A casa entrega o espelho oficial de download e estas instruções.

## Instalação

**Baixe** pelo espelho do card (o site oficial do Tracker). O card marca Windows por ser o caso mais comum; os instaladores de **macOS** e **Linux** estão na mesma página. Há também uma
versão que roda no navegador, linkada no mesmo site.

## Filmar para medir (o vídeo é o instrumento)

1. **Câmera parada**, em tripé ou apoiada, perpendicular ao plano do movimento.
2. **Objeto de escala no plano do movimento**: uma régua ou trena visível, na mesma distância
   da câmera que o objeto. Escala fora do plano é erro sistemático garantido.
3. Boa luz e, se o celular permitir, **câmera lenta** (120 ou 240 qps) para movimento rápido.

## A análise

1. Importe o vídeo e marque o trecho útil (quadro inicial e final).
2. **Bastão de calibração**: clique nas duas pontas da régua e digite o comprimento real.
3. **Eixos**: posicione a origem e alinhe o eixo com a vertical (use um fio de prumo no vídeo).
4. **Ponto de massa**: Shift+clique no objeto a cada quadro (ou use o *Autotracker*).
5. No gráfico `y × t`, abra a ferramenta de dados e ajuste uma **parábola**: o coeficiente de
   `t²` é `g/2`. Compare com 9,8 m/s² e **discuta a diferença**.

## O que vai no relatório

Incerteza da escala, do clique (±1 pixel vira quantos milímetros?), a taxa de quadros real e a
resistência do ar. Experimento sem discussão de erro é só um vídeo.

## O que esta skill NÃO faz

- **Não executa o app no servidor da Zaeon.** É dispositivo: roda na máquina do aluno.
- **Não redistribui o instalador.** O espelho aponta para a página oficial do projeto.
- **Não faz o relatório pelo aluno.** Orienta a medida; a análise e a conclusão são dele.
- **Não é para filmar pessoas sem autorização.** Se alguém aparece no vídeo, peça consentimento.
