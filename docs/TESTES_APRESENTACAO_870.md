# Testes do #870 (PR 2): apresentação, cyberespaço, Sobre nós e barra de cima

Achados nos testes de 17 a 20/11 e nas auditorias de tela no celular (375 px). O PR 1 (Sala de Estudos e Notícias) já entrou no #871 (`docs/TESTES_SALA_NOTICIAS_870.md`).

## O que muda

### Barra de cima (todas as páginas)
- A classe `bg-background/80` não era gerada, porque a cor do tema estava em hex (`var(--background)`). A barra ficava só com o desfoque, e tudo que passava atrás virava borrão.
- Agora as cores do tema também existem em canais RGB (`--background-rgb` e `--foreground-rgb`, em `app/globals.css`), com os mesmos tons do claro e do escuro.
- O Tailwind passou a usar essas cores em canais (`tailwind.config.ts`), então a barra fica com fundo meio transparente: escuro no tema escuro e claro no tema claro.
- `bg-background` sem "/N" continua com a cor cheia, igual a antes.

### Apresentação (página inicial)
- O carrossel de cards ganhou **setas ‹ › de 44 px**, uma de cada lado (`ConhecimentoShowcase.tsx` e `timeline-ideia.css`).
- As setas funcionam também com "menos animação" (nesse modo o carrossel não anda sozinho, e a rolagem é sem animação) e no computador, onde antes não dava para ver os outros cards.
- Depois de usar uma seta, o passeio automático espera 6 s para não levar os cards embora.
- O nome das setas para leitor de tela foi traduzido nos 7 idiomas.

### Cyberespaço
- **Texto de carregamento:** em cima da barra aparece a etapa e a porcentagem ("Construindo a cidade Zaeon · 42%"). Antes era só a barra, e no celular parecia travado.
- Enquanto o código ainda baixa, a tela preta mostra "Abrindo o cyberespaço…".
- **.vrm:** a pré-carga de fundo lia o arquivo inteiro só para contar o tamanho e jogava fora, e depois o `precarregarVrm` lia o mesmo arquivo de novo (o do fundador tem 16 MB).
  - Agora a pré-carga guarda os bytes e entrega para quem monta o boneco (`tomarCorpoBaixado`, em `lib/cyber/precarga.ts`).
  - Os bytes são tirados da pré-carga ao serem entregues, então os 16 MB não ficam guardados em dobro.

### Sobre nós
- Nada abaixo de 11 px: "LVL" (7 px), "Mais popular" (9 px), os rótulos da equipe (8 a 10 px) e as tags (10 px).
- No "LVL", o espaço entre as letras diminuiu para caber no círculo.

## Para o Martinez

- Apresentação, cyberespaço (avatar/.vrm e a pré-carga do #819), Sobre nós e a barra de cima são área dele.
- A troca da cor do tema para canais RGB muda o CSS gerado de todo `bg-background`, `text-foreground` etc. O tom é o mesmo, mas vale conferir.
- A página antiga `/about/about-us` não foi mexida (ainda tem letras de 7 a 10 px). Ela não está no menu.
- Não precisa de `prisma db push`.

## Testes automáticos

- `components/main/acabamento870pr2.test.tsx` (novo, 8 testes):
  - a barra de cima: cores em canais, os mesmos tons, `bg-background/80`;
  - as setas rolam a faixa nos dois sentidos com "menos animação" e têm 44 px;
  - os 7 idiomas têm o nome das setas;
  - a tela do cyberespaço mostra a etapa e a %;
  - "Abrindo o cyberespaço…";
  - o corpo lido pela pré-carga é entregue uma vez e sai da pré-carga;
  - o Sobre nós sem nada abaixo de 11 px.
- `lib/cyber` e `components/cyber` continuam passando (98 arquivos, 819 testes, junto com o novo).
- Suíte completa (23/11): 837 arquivos, 8055 testes passando. As falhas são as mesmas da main, mais o `lib/rag/docx.test.ts` (instável) e o `lib/orquestra/conversa.test.ts`, que falhou na suíte cheia e passou sozinho (8/8). É instável por tempo, e este PR não mexe nele.

## Verificado na prévia local (prints enviados à Giulia, `prints-870-pr2/`)

- **Barra de cima no celular** (Sobre nós rolado): fundo escuro meio transparente. A cor medida na tela é `rgba(3, 0, 20, 0.8)`.
- **Carrossel no computador**, com "menos animação": as setas aparecem nos dois lados, e um clique em › andou a faixa (de 0 para 956 px).
- **Carrossel no celular**: as setas aparecem por cima dos cards.
- **Sobre nós no celular**: "LVL" e "Mais popular" legíveis.
- A tela de carregamento do cyberespaço não foi vista na prévia, porque a prévia local não tem banco de dados. Ela está coberta pelo teste.

## Como testar em produção (depois do deploy)

1. **Barra de cima:** no celular, abra Notícias e Sobre nós e role a página. O que passa atrás da barra fica escurecido, sem borrão branco. Troque para o tema claro: a barra fica clara.
2. **Carrossel da página inicial:** as setas ‹ › aparecem dos dois lados dos cards e andam o carrossel. No computador, dá pra ver os outros cards.
3. Ligue "reduzir movimento" no celular (Acessibilidade): as setas continuam funcionando.
4. **Cyberespaço:** ao entrar, a tela mostra o que está carregando e a porcentagem em cima da barra.
5. **Sobre nós no celular:** "LVL 01" e "Mais popular" legíveis.

## Resultado dos testes

| Teste | Resultado |
|---|---|
| 1. Barra de cima com fundo (escuro e claro) | ⏳ falta testar |
| 2. Setas do carrossel | ⏳ falta testar |
| 3. Setas com "reduzir movimento" | ⏳ falta testar |
| 4. Texto do carregamento do cyberespaço | ⏳ falta testar |
| 5. Letras do Sobre nós | ⏳ falta testar |
