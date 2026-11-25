# Testes: Hugging Face na frente do Google, ligado pelas Variables do GitHub

## O que muda

- **Pedido do Martinez:** tirar o Google e pôr o Hugging Face na frente.
- **O que já existia:** o código já sabe fazer isso desde o #864, com a chave `LLM_PRIMARIO=hf` (`docs/HF_PRIMARIO.md`).
  - O problema é que a chave só existia no `.env` do servidor, e o deploy não levava.
  - Pelo código não dava pra saber se ela estava ligada, porque o `/api/health` não mostrava.
- **Agora, no deploy** (`.github/workflows/deploy.yml`):
  - Ele leva quatro Variables do GitHub pro `.env.secrets` do servidor:
    - `LLM_PRIMARIO`
    - `HF_RESERVA_MODELOS`
    - `HF_PRIMARIO_MODELOS`
    - `HF_PRIMARIO_MODELOS_PRO`
  - É o mesmo caminho que o `HF_RESERVA` e o `DISPAROS_HF` já usavam.
  - O trecho do HF no script virou um laço só, e o script **ficou menor**.
    - Ele estava em 19.723 bytes, acima da margem de 19.500 (o teto do GitHub é 21.000). Por isso o `agenteCompose.test.ts` estava vermelho na main.
    - Com isso, o teste volta a passar.
  - Cada uma só é gravada se estiver preenchida. Vazia, vale o que está no `.env` do servidor, e nada é desligado sem querer.
- **Agora, no `/api/health`:** aparece o campo `llm`, por exemplo `{ "primario": "huggingface", "reservaHf": false }` ou `{ "primario": "google", "reservaHf": true }`.
  - Mostra só o estado. Nunca mostra o token nem o nome dos modelos.

## Para o Martinez

- Deploy e LLM são área dele.
- **Pra ligar, depois do merge:**
  1. No GitHub, vá em Settings → Secrets and variables → Actions → Variables.
  2. Crie `LLM_PRIMARIO` = `hf`.
  3. Recomendado pelo próprio doc dele: crie `HF_RESERVA_MODELOS` = `openai/gpt-oss-120b:cerebras,openai/gpt-oss-120b:groq`. Isso tira o baseten, que dá 400.
  4. Rode o deploy de novo, ou espere o próximo merge.
- **Pra voltar:** pôr `LLM_PRIMARIO` = `vertex` e fazer o deploy. Apagar a Variable não basta, porque a linha já gravada no `.env.secrets` continua lá.
  - `HF_RESERVA=0` desliga o HF inteiro.
- **Continua no Google** (`docs/HF_PRIMARIO.md`, seção 1):
  - embeddings da busca dos PDFs;
  - PDF escaneado e imagem;
  - voz;
  - algumas rotas antigas que chamam o Google direto.
- Não muda banco nem código de LLM. Não precisa de `prisma db push`.

## Testes automáticos

- `lib/llm/hfPrimarioDeploy.test.ts` (novo, 9 testes):
  - **Deploy:** cada uma das quatro chaves vem da Variable, entra no `envs` do ssh e na lista do laço. O laço só grava a chave preenchida e troca a linha antiga, sem duplicar. Nenhuma vira Secret, e o token nunca é impresso.
  - O laço foi rodado de verdade no bash com `set -e`: grava só as preenchidas, troca a linha antiga e, com tudo vazio, não derruba o script.
  - **Health:**
    - `LLM_PRIMARIO=hf` com token dá `huggingface`.
    - Sem a chave, dá `google` com o HF de reserva.
    - Com a chave e sem token, ou com `HF_RESERVA=0`, dá `google` sem reserva.
- `lib/llm` (envelope, reserva) e o teste do `/api/health` continuam passando.

## Verificado na prévia

- A prévia local não tem os provedores, e o deploy só roda no GitHub.
- Isso fica coberto pelos testes e pela conferência em produção abaixo.

## Como testar em produção

1. Depois do merge e do deploy, sem mexer em nada, abra https://zaeon.com.br/api/health.
   - Tem que aparecer `"llm": { "primario": "google", "reservaHf": true }`, a não ser que o Martinez já tenha ligado no `.env`.
2. O Martinez cria a Variable `LLM_PRIMARIO` = `hf` e roda o deploy de novo.
   - No log do deploy aparece `→ HF: … primario=hf`.
3. Abra o `/api/health` de novo. Tem que aparecer `"primario": "huggingface"`.
4. No chat da Aura, mande "explica o ciclo de Krebs". A resposta vem normal, só que inteira de uma vez, sem a prévia em pedaços. Com o HF, isso é esperado.
5. Gere uma petição pelo chat. A peça sai normal.

## Resultado dos testes

| Teste | Resultado |
|---|---|
| Testes novos + `lib/llm` + health (25/11) | ✅ passando |
| Tamanho do script do deploy (`agenteCompose`, "cabe no teto de 21.000 bytes") | ✅ volta a passar (estava vermelho na main) |
| Suíte completa (25/11) | ✅ 8115 testes passando e `tsc` limpo. As falhas são do ambiente do Windows (compose, skills, symlink, docx) e as instáveis de sempre (`mcp-real`, que passa sozinho na CI). Nenhuma toca este código. |
| 1. Health antes de ligar | ✅ 25/11, commit 3c31032e: `"llm":{"primario":"huggingface","reservaHf":false}` — o Martinez já tinha ligado `LLM_PRIMARIO=hf` no `.env` do servidor |
| 2–3. Ligar e conferir no health | ✅ já estava ligado (item 1); a Variable não foi precisa |
| 4. Pergunta normal | ✅ 25/11 (o chat respondeu; logo depois do deploy ficou lento até o reinício terminar) |
| 5. Petição | ⏳ fica pro teste do PR 4 |
