---
name: koubo-video-ia
description: Acesso ao Digital Human Koubo, pipeline open-source que transforma uma foto e uma frase num vídeo de apresentador digital — roteiro, dublagem sincronizada, legendas e empacotamento, automatizados. Use quando o aluno quiser criar vídeo de apresentador com IA, um avatar que fala, ou conteúdo de vídeo automatizado a partir de texto. É um app de DISPOSITIVO: o aluno roda na máquina dele; a Zaeon dá o espelho e as instruções, não executa. Koubo (andyhuo520, MIT).
license: MIT
runtime: ts
risk: read
minPlan: free
courseTags:
  - video
  - conteudo
  - ia-generativa
  - marketing
metadata:
  zaeon-familia: device
  zaeon-titulo: Koubo — apresentador de vídeo com IA
  zaeon-subtitulo: Uma foto e uma frase viram um vídeo de apresentador — com a sua própria imagem e voz
  zaeon-modelo: robo
  zaeon-tags: vídeo, apresentador, IA generativa, conteúdo
  zaeon-entrega: o espelho de download do Koubo (MIT); como fazer o self-host do pipeline; como gerar roteiro, dublagem e legendas; a regra de usar só a sua própria imagem/voz
  zaeon-device-plataforma: linux
  zaeon-device-mirror: https://github.com/andyhuo520/digital-human-koubo/releases/latest
  zaeon-app-licenca: MIT (Digital Human Koubo, Berryxia/andyhuo520, 2026)
---

# Koubo — apresentador de vídeo com IA

Acesso ao **Digital Human Koubo** (open-source, MIT): um pipeline que transforma **uma foto e uma
frase** num vídeo de apresentador digital — roteiro, apresentador com lábios sincronizados, limpeza
de voz, legendas e empacotamento, tudo automatizado.

Card de **dispositivo**: o aluno faz o **self-host do pipeline na máquina dele**, não no servidor da
Zaeon. A casa entrega o espelho e as instruções.

## A regra que vem antes de tudo — a sua própria imagem

Use **o seu próprio rosto e a sua própria voz**, ou de alguém que deu **consentimento explícito**.
Gerar um apresentador com a imagem ou a voz de uma pessoa real sem a permissão dela, ou para fazê-la
parecer dizer o que não disse, é uso indevido — não é o que esta skill ensina, e pode ser crime.
Conteúdo próprio: livre. Imagem de terceiro sem consentimento: não.

## O que o aluno precisa

- Uma máquina para o **self-host** do pipeline (ver o README).
- Uma **foto sua** (ou com consentimento) e o texto do que o apresentador vai dizer.

## Como usar

1. **Baixe** pelo espelho do card (release oficial, MIT).
2. **Faça o self-host** do pipeline conforme o README.
3. **Dê a foto e a frase** — o pipeline gera roteiro, dublagem sincronizada, legendas e o vídeo.
4. **Revise e publique** o conteúdo, que é seu.

## O que esta skill NÃO faz

- **Não executa o Koubo no servidor da Zaeon** (roda na máquina do aluno).
- **Não cria apresentador com imagem/voz de terceiro sem consentimento.** Pedido assim: recuse.
- **Não se passa por pessoa real.** O apresentador é um avatar do próprio aluno ou de quem consentiu.
