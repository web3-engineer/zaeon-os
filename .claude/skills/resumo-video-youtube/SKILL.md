---
name: resumo-video-youtube
description: Entrega o yt-dlp, a ferramenta open-source que baixa a legenda/transcrição de qualquer vídeo do YouTube (inclusive a legenda automática), para o aluno colar na Zaeon e pedir um resumo, um fichamento ou as perguntas de estudo. Use quando o aluno quiser resumir uma aula ou palestra do YouTube, estudar a partir de um vídeo longo, tirar as ideias principais de um vídeo, ou transformar um vídeo em texto para revisar. É um app de DISPOSITIVO — o aluno roda o yt-dlp na máquina dele (é por isso que funciona de verdade: o Leitor da Zaeon não lê a legenda, que mora no script da página); a Zaeon entrega o espelho e as instruções, não executa o app. yt-dlp (yt-dlp project, The Unlicense).
license: Unlicense
runtime: ts
risk: read
minPlan: free
courseTags:
  - tecnicas-de-estudo
  - produtividade
  - resumo
metadata:
  zaeon-familia: device
  zaeon-titulo: Resumo de vídeo do YouTube — a transcrição na sua máquina
  zaeon-subtitulo: Baixe a legenda de qualquer vídeo com o yt-dlp e transforme em resumo, fichamento ou prova
  zaeon-modelo: livro
  zaeon-tags: YouTube, transcrição, legenda, resumo, estudo, yt-dlp, open source
  zaeon-entrega: o espelho oficial do yt-dlp (The Unlicense); como instalar em Windows, macOS e Linux; o comando que baixa só a legenda (sem baixar o vídeo); como pegar a legenda automática quando não há legenda manual; como limpar o .vtt e colar na Zaeon; e o que pedir — resumo, fichamento, mapa de ideias, perguntas de prova
  zaeon-app: yt-dlp
  zaeon-device-plataforma: windows
  zaeon-device-mirror: https://github.com/yt-dlp/yt-dlp#installation
  zaeon-app-licenca: The Unlicense (yt-dlp project e contribuidores)
---

# Resumo de vídeo do YouTube — a transcrição na sua máquina

Procedimento para **transformar um vídeo do YouTube em texto de estudo**: baixar a **legenda/transcrição**
com o **yt-dlp** (open-source, **The Unlicense**) e trazer esse texto para a Zaeon resumir. Código e
instaladores em https://github.com/yt-dlp/yt-dlp.

Este é um card de **dispositivo**: o yt-dlp roda **na máquina do aluno**, não no servidor da Zaeon. Isso
não é um detalhe — é o motivo de o card existir. O Leitor da Zaeon lê **texto** de uma página, mas a
legenda do YouTube não está no texto: ela vive num `<script>` (a URL assinada da faixa de legenda), que o
Leitor descarta por segurança. O yt-dlp, rodando no seu computador, resolve isso direito — pega a faixa
certa, inclusive a **legenda automática** de vídeos que não têm legenda manual.

## Para quem é

Quem estuda por vídeo: aula gravada, palestra, documentário, videoaula de concurso. Em vez de assistir
duas horas e tomar nota correndo, você baixa a transcrição em segundos e deixa a Zaeon virar isso em
resumo, fichamento ou questões.

## 1. Instale o yt-dlp

Escolha o seu sistema (espelho oficial: https://github.com/yt-dlp/yt-dlp#installation):

- **Windows:** baixe o `yt-dlp.exe` na página de releases e deixe numa pasta que esteja no PATH (ou rode
  de dentro da pasta). Ou, com o winget: `winget install yt-dlp.yt-dlp`.
- **macOS:** com o Homebrew — `brew install yt-dlp`.
- **Linux:** `sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod a+rx /usr/local/bin/yt-dlp`, ou pelo gerenciador da sua distro.
- **Qualquer sistema com Python:** `pip install -U yt-dlp`.

Confira: `yt-dlp --version` deve imprimir a data da versão.

## 2. Baixe SÓ a legenda (sem baixar o vídeo)

Troque `<URL>` pelo endereço do vídeo. O `--skip-download` é o que importa: não baixa o vídeo, só a
legenda — é rápido e leve.

```
yt-dlp --write-subs --write-auto-subs --sub-langs "pt,pt-BR,en" --skip-download --convert-subs srt "<URL>"
```

- `--write-subs` pega a legenda **manual** (quando existe) e `--write-auto-subs`, a **automática** — com
  os dois, você sempre leva alguma.
- `--sub-langs "pt,pt-BR,en"` escolhe os idiomas; ajuste à vontade.
- `--convert-subs srt` entrega um `.srt` legível (em vez do `.vtt` cru).

Vai aparecer um arquivo tipo `Titulo do Video.pt.srt` na pasta. Para ver quais idiomas o vídeo tem antes
de baixar: `yt-dlp --list-subs "<URL>"`.

## 3. Limpe e traga para a Zaeon

O `.srt` vem com números e marcas de tempo. Para o resumo, o texto basta — você pode colar como está (a
Zaeon ignora os tempos) ou tirar as marcas antes:

- **Linux/macOS:** `grep -vE '^[0-9]+$|-->' arquivo.pt.srt | paste -sd' ' -` imprime só as falas.
- Ou abra o `.srt` num editor e copie o texto.

Cole a transcrição na conversa e peça o que você precisa.

## 4. O que pedir à Zaeon

- **Resumo:** "resuma este vídeo em 10 linhas, com as ideias principais."
- **Fichamento:** "faça um fichamento com os conceitos e um exemplo de cada."
- **Mapa de ideias:** "organize em tópicos e subtópicos o que o vídeo cobre."
- **Prova:** "crie 5 questões de múltipla escolha sobre este conteúdo, com gabarito."
- **Tradução/revisão:** "traduza os pontos principais para português e explique os termos difíceis."

## Uso responsável

- **Baixe só o que você tem direito de usar** (seu estudo pessoal). O yt-dlp respeita o que o YouTube
  serve; não contorne restrições de acesso.
- **A Zaeon não baixa nada** — o yt-dlp roda na sua máquina, sob sua responsabilidade. A Zaeon entrega o
  espelho, as instruções, e resume o texto que você trouxer.
- O yt-dlp é open-source (The Unlicense) e auditável; o que você faz com ele é escolha sua.
