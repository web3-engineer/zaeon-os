# Testes do #867 — acabamento do Escritório no celular (agenda, janelinhas e cabeçalho)

Achados nos testes da Giulia no celular em 21/11, depois do #861 (PR 1 #863 e PR 2 #865) no ar.
O registro desses testes está em `docs/TESTES_ESCRITORIO_861.md`.

## O que muda

- **1. "todo sábado / todo domingo":** o aviso ao marcar, voltar ou esticar dizia "toda sábado". Sábado e domingo agora usam "todo"; os outros dias seguem "toda" (`AgendaBandeja.tsx`).
- **2. Duas pessoas dividindo o horário, no celular:** cada bloco mostrava só a foto pequena e "7h", mesmo com espaço sobrando. `modoDoBloco` (`lib/canal/agenda.ts`) passa a olhar a largura da coluna. A partir de 110 px (`LARGURA_COLUNA_FOLGADA`), o bloco dividido mostra foto, nome e horário inteiro, como um bloco de largura inteira. Bloco baixo vira "mini", nunca "curto", porque o "curto" põe a foto pra fora e invadiria o vizinho. Na semana do computador (~90 px por coluna) nada muda.
- **3. "Marcar também" com o horário inteiro:** antes marcava só a hora tocada.
  - Com **uma** pessoa no horário: "Marcar também (9h–11h)" copia o horário inteiro dela.
  - Com **várias**: cada uma ganha o seu botão **"Entrar"**, com o horário dela.
- **4. Ver o horário antes de confirmar** (commit da sessão da Giulia, 21/11): depois do 1º toque aparece um rascunho tracejado com o horário escrito ("14h–15h"). No computador ele cresce conforme o mouse passa ("14h–17h"), e arrastando também. Antes, arrastar 14h→16h marcava 14h–17h sem avisar (cada quadrado é a hora inteira).
- **5. Cabeçalho dos dias grudado no topo:** o `sticky` contava a partir do padding (`py-3`) da área que rola. Sobrava uma faixa de 12 px acima de Seg/Ter… onde as barras apareciam cortadas. Agora é `-top-3`.
- **6. Janelinhas com fundo sólido:** no Chrome do Android o texto do chat aparecia por trás da agenda, do sino e da lista de escritórios, mesmo com 98% de opacidade. `VIDRO_POPOVER_SOLIDO` (`lib/canal/vidro.ts`) agora é 100% sólido, sem `backdrop-filter` (num fundo opaco ele não serve pra nada), e com `isolate`.
- **7. Sino e lista de escritórios dentro da tela:** no celular abriam a partir do botão com 340 px e encostavam/cortavam na borda direita. Agora se ancoram na barra do Escritório (`inset-x-3`): largura do Escritório com folga dos dois lados. No computador, continuam no botão com 340 px.
- **8. "1 on" numa linha só:** com nome de escritório comprido ("GIULIA e Don Mart…") virava "1" / "on". Agora `whitespace-nowrap shrink-0`.
- i18n: chave nova `agenda.entrar` nos 7 idiomas (847 chaves).

## Para o Martinez

- **Eiffel e Noether continuam sem foto** na fileira de agentes (só a letra). A foto vem do manifesto do estúdio de avatares (`useManifesto`), e esses dois ainda não têm imagem. Área dele (avatar): precisa gerar as imagens no estúdio.
- `lib/canal/vidro.ts`: `VIDRO_POPOVER_SOLIDO` mudou para fundo sólido, sem blur. Vale para tudo que usa a constante (agenda, sino, lista de escritórios, menu da pessoa, escolher agente).
- **Não precisa de `prisma db push`.**

## Testes automáticos

- `lib/canal/agenda861.test.ts`: `modoDoBloco` com largura (dividindo com espaço vira cartão/linha; baixo vira mini; ~90 px continua estreito).
- `components/office/AgendaBandeja.test.tsx`:
  - "Marcar também" manda o horário inteiro (`{ dia: 1, de: 480, ate: 660 }`);
  - com duas pessoas, um "Entrar" para cada, e cada um manda o horário da pessoa;
  - o rascunho tracejado (commit de 21/11).
- Escritório, agenda e rotas do canal: 49 arquivos, 776 testes. `tsc` sem erros; `i18n-check` OK.

## Verificado na prévia local (prints enviados à Giulia)

- Celular, sábado 17h–19h: Giulia e Don lado a lado, cada um com foto, nome e "17h–19h".
- Marcar 20h no sábado: "Marcado: todo sábado, 20h–21h · a próxima é sáb, 28/11".
- Quarta 10h (só a andressa): "Marcar também (10h–12h)".
- Quinta 15h (Bia 15h–17h e Caio 15h–16h): um "Entrar" para cada.
- O sino e a lista de escritórios **não** dão pra ver na prévia (ela só monta a agenda): conferir no celular depois do deploy.

## Como testar em produção (celular, depois do deploy, recarregar antes)

1. **Fundo sólido:** abra a agenda, o sino 🔔 e a lista de escritórios ("nome ▾"). Nada do chat aparece por trás, nem no cabeçalho nem dentro dos blocos.
2. **Dentro da tela:** o sino e a lista de escritórios têm folga dos dois lados e o canto direito não fica cortado.
3. **"1 on":** no escritório de nome comprido ("GIULIA e Don Martinez"), o "1 on" fica numa linha.
4. **Dois dividindo:** num horário em que você e outra pessoa estão juntos, cada bloco mostra foto, nome e horário.
5. **Marcar também:** toque no horário de uma pessoa sozinha. O botão mostra o horário inteiro dela e marca esse horário.
6. **Várias pessoas:** num horário com 2 ou mais (sem você), cada uma tem o seu "Entrar".
7. **Ver antes de confirmar:** toque num horário vazio. Aparece o rascunho tracejado com o horário; arrastando, ele cresce.
8. **Aviso:** marque algo no sábado ou domingo. O aviso diz "todo sábado" / "todo domingo".
9. **Computador:** a semana continua igual (blocos divididos estreitos), e o sino/lista abrem a partir do botão.
