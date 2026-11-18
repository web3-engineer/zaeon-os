---
name: llm-local-apple
description: Roda um modelo de linguagem grande (Gemma) localmente num Mac com Apple Silicon, até nos de 8 GB, por um runtime Swift+Metal enxuto. Use quando o aluno quiser rodar IA local no Mac sem nuvem, usar um LLM offline, ou aproveitar a GPU do Apple Silicon para inferência. É um app de DISPOSITIVO: o aluno baixa e roda no Mac dele; a Zaeon entrega o espelho e as instruções. TurboFieldfare (drumih, Apache-2.0).
license: Apache-2.0
runtime: ts
risk: read
minPlan: free
courseTags:
  - ia-local
  - apple-silicon
  - llm
  - privacidade
metadata:
  zaeon-familia: device
  zaeon-titulo: LLM local no seu Mac
  zaeon-subtitulo: Gemma rodando em ~2 GB de RAM, Swift+Metal — IA offline até no Mac de 8 GB
  zaeon-modelo: chip
  zaeon-tags: IA local, Apple Silicon, LLM, offline, privacidade
  zaeon-entrega: o espelho de download do TurboFieldfare (Apache-2.0); como instalar no Mac Apple Silicon; como subir o servidor local; como conversar com o modelo offline
  zaeon-device-plataforma: macos
  zaeon-device-mirror: https://github.com/drumih/turbo-fieldfare/releases/latest
  zaeon-app-licenca: Apache-2.0 (TurboFieldfare, drumih, 2026)
---

# LLM local no seu Mac

Procedimento para instalar e usar o **TurboFieldfare** (open-source, Apache-2.0): um runtime
Swift+Metal enxuto que roda o modelo **Gemma** localmente em qualquer Mac com Apple Silicon — até
nos de 8 GB, em cerca de 2 GB de RAM.

Card de **dispositivo**: o modelo roda no Mac do aluno, offline, não no servidor da Zaeon. É IA sem
nuvem — o prompt não sai da máquina dele. A casa entrega o espelho e as instruções.

## O que o aluno precisa

- Um **Mac com Apple Silicon** (M1 ou mais novo), 8 GB de RAM já bastam.
- Espaço em disco para o modelo.

## Passo a passo

1. **Baixe** pelo espelho do card (release oficial, Apache-2.0).
2. **Instale no Mac** seguindo o README do pacote.
3. **Suba o servidor local** (o TurboFieldfare expõe um servidor OpenAI-compatível local).
4. **Converse com o modelo** pela interface ou apontando um cliente para o servidor local.

## O que esta skill NÃO faz

- **Não roda no servidor da Zaeon.** É dispositivo: a inferência acontece no Mac do aluno.
- **Não precisa de internet para responder.** O modelo é local; a privacidade é o ponto.
- **Não é Apple-genérico.** Exige Apple Silicon (Metal); não roda em Mac Intel.
