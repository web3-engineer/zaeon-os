# Testes do #686 — código no e-mail para entrar

## O que muda

- **Entrar por e-mail pede um código:** a pessoa digita o e-mail, recebe um código de 6 números e entra com ele. Antes bastava o e-mail, e quem sabia o e-mail de alguém entrava na conta dela.
- **Conta nova também:** sem o código, a conta não nasce.
- **O código:** vale por 10 minutos, uma vez só, e cai depois de 5 tentativas erradas. O banco guarda só um resumo dele, nunca o número.
- **Pedir outro:** "Reenviar código" libera depois de 60 s. No máximo 5 códigos por hora para o mesmo e-mail.
- **Fundador/admin:** continuam só pelo Google. A rota responde igual, mas não manda código.
- **O e-mail:** sai pelo Resend, de `login@zaeon.com.br` (ou do `EMAIL_FROM`).
- **Telas:** a `/login` e o painel de entrar do menu ganham a etapa do código, com "Trocar e-mail" e "Reenviar código".
- **Cadastro do modal antigo:** `/api/auth/guest-register` só cria conta para quem já entrou com esse e-mail. O modal (`OnboardModal`) manda para a `/login` com o e-mail preenchido.
- **Deploy:** leva o `RESEND_API_KEY` do GitHub Secrets para o `.env.secrets` do servidor, e a Variable `EMAIL_FROM`, se existir.
- Nova rota `POST /api/auth/codigo`.

## Para Martinez

- **Área dele (login e deploy):** muda `src/lib/auth.ts` (o `authorize` do e-mail pede o código) e `.github/workflows/deploy.yml` (leva o `RESEND_API_KEY`).
- **Antes do merge:** o domínio `zaeon.com.br` precisa estar **Verified** no Resend. Com ele em Pending, o código não sai, e ninguém entra por e-mail. O Google continua funcionando.
- **Não precisa de `prisma db push`:** os códigos ficam na coleção `login_codes` do Mongo, usada direto, como os `users` do login.
- **Quem está logado continua logado.** Só a próxima entrada por e-mail pede o código.
- O código .edu (`sendEduCode`) continua só no log do servidor. Não mudei.

## Limitações conhecidas

- Sem índice na coleção `login_codes`: com dois pedidos do mesmo e-mail ao mesmo tempo, pode nascer um documento a mais. Vale o primeiro que o banco devolver.
- Os documentos de `login_codes` não somem sozinhos (um por e-mail, pequenos). Um índice com prazo resolveria; precisa do Martinez.
- Os dados que a pessoa preenche no modal antigo não são guardados ao ir para a `/login`. Já era assim no caminho do Google.
- Fora de produção, sem a chave, o código aparece no log do servidor.

## Testes automáticos

- `lib/auth/codigoLogin.test.ts`: uma vez só, vence em 10 min, 5 tentativas, espera entre envios, 5 por hora, só o resumo guardado, envio pelo Resend.
- `lib/auth/authorize.test.ts`: sem o código certo, não entra nem cria conta; com ele, entra.
- `app/api/auth/codigo/route.test.ts`: e-mail limpo, inválido, admin, espera e falha de envio.
- **Não testado:** o e-mail chegando de verdade, as telas no navegador e a coleção num MongoDB de verdade. A lista abaixo confere isso.

## Como testar em produção (com o domínio Verified no Resend)

1. Saia da conta. Na `/login`, digite o seu e-mail e clique em "Receber código no e-mail": chega um e-mail de `login@zaeon.com.br` com 6 números.
2. Digite o código: entra na conta.
3. Saia e peça de novo. Digite um código errado: aparece "Esse código não vale" e não entra.
4. Clique em "Reenviar código" logo depois: o botão mostra a espera em segundos.
5. Use o código do e-mail anterior, depois de pedir um novo: não entra.
6. Espere 10 minutos e use o código: não entra.
7. Pelo menu (o painel de entrar da home), repita os passos 1 e 2.
8. Entre pelo Google: funciona igual a antes.
9. Digite um e-mail que não tem conta: chega o código, e a conta nasce só depois de digitar.
