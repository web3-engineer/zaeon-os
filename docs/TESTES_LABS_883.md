# Testes do #883 (parte 3a): os laboratórios agênticos sem o Google

Os 3 laboratórios agênticos da Zaeon (**BioSim 3D**, **CodeLab** e **QuantumLab**) chamavam o Google (Gemini, pelo SDK do Vertex) direto. Com o Google respondendo **403 "requires billing"**, eles podiam ficar sem resposta. O Martinez pediu para tirar o Google da equação. Este PR faz a parte 3a do card: os laboratórios.

## O que muda

- **Um ponto só para a IA dos laboratórios** (`lib/agentic/labIa.ts`, novo): o texto passa pelo **envelope** (`lib/llm/envelope.ts`), o mesmo do chat da Aura.
  - Com `LLM_PRIMARIO=hf`: **Hugging Face primeiro**, Google só de queda.
  - Sem a flag: o Google tenta primeiro, e se ele falhar (o 403 de hoje) o **HF de reserva** responde.
  - Cada chamada vai ao ledger como `lab:biosim`, `lab:codelab` ou `lab:quantum`.
- **CodeLab** (`app/api/agentic/codelab/route.ts`): ajuda com código pela IA nova. O SDK do Vertex saiu da rota.
- **QuantumLab** (`app/api/agentic/quantum/route.ts`): monta a cena quântica pela IA nova. O SDK do Vertex saiu da rota.
- **BioSim 3D** (`app/api/agentic/biosim/route.ts`): o pedido **por texto** vai pela IA nova.
- **O que não muda:** as telas, os prompts e o formato da resposta. O PubChem e o PDB continuam iguais.

### O que fica para depois
- **Foto no BioSim:** quando o aluno manda uma foto, ela continua indo ao Gemini, porque é ele que lê imagem. Isso é da **parte 4 do #883 (visão)**.

## Para o Martinez

- **Provedor e custo são área dele.** Os laboratórios passam a gastar créditos do HF pelo mesmo caminho do chat (`HF_TOKEN`, modelos de `HF_PRIMARIO_MODELOS`).
- Não tem variável nova. Usa as que já estão no deploy (`LLM_PRIMARIO`, `HF_TOKEN`, `HF_RESERVA`).
- Não precisa de `prisma db push`.

## Testes automáticos

- `lib/agentic/labIa.test.ts` (novo, 4 testes):
  - com o HF na frente, a resposta vem do Hugging Face, o Google nem é chamado e o ledger leva `lab:codelab`;
  - com o Google dando 403, o HF de reserva responde e o laboratório funciona;
  - CodeLab e QuantumLab não usam mais o SDK do Vertex;
  - o BioSim sem foto vai pela IA nova.
- `tsc` e lint sem erros nos arquivos deste PR (os 7 erros de `convites` são do cliente do Prisma local, iguais aos da `main`).

## Verificado na prévia

- A prévia local não tem o token do HF, então não dá para gerar resposta aqui.
- Fica coberto pelos testes e pelo teste em produção abaixo.

## Como testar em produção (depois do deploy, F5 antes)

1. **CodeLab:** abra o laboratório de código, escreva um código simples e peça "explique esse código". Vem uma explicação em poucas frases.
2. **CodeLab, mudar código:** peça "adicione um comentário em cada linha". O código no editor é atualizado.
3. **QuantumLab:** peça "mostre um qubit em superposição". Aparece a esfera de Bloch.
4. **QuantumLab:** peça "níveis de energia do hidrogênio". Aparece o diagrama de níveis.
5. **BioSim 3D, por texto:** peça "uma célula animal" ou "cafeína". Aparece a cena 3D ou a molécula.
6. **BioSim 3D, com foto** (fica para a parte 4): ainda depende do Google, então pode falhar enquanto o Google estiver fora.

## Revisão (Sourcery, 28/11)

- **Tempo da reserva:** cada tentativa (HF, depois o Google) tem o seu prazo, e o pedido inteiro tem um prazo total abaixo do limite da rota (CodeLab e QuantumLab: 10 s por tentativa, 25 s no total; BioSim: 20 s e 50 s). Assim a reserva tem tempo de responder, e se passar do total o erro sai antes de a rota ser cortada.
- **Uso por aluno:** as 3 rotas passam o id do aluno da sessão para o ledger. Antes o uso ia como anônimo.
- **Foto do BioSim no ledger:** a chamada com foto (que ainda vai ao Gemini) também é registrada como `lab:biosim`.
- **Teste da reserva:** confere que o Google foi tentado antes e só então o HF respondeu.
- **Não mudou:** a revisão pediu esperar a gravação do ledger antes de responder. Isso é do envelope, que o app inteiro usa do mesmo jeito, e a Zaeon roda num servidor Node que fica de pé (não é serverless), então a gravação termina depois da resposta. Mexer nisso fica fora deste PR.
- `labIa.test.ts`: 8/8; `tsc` e lint sem erros.

## Resultado dos testes

| Teste | Resultado |
|---|---|
| `labIa.test.ts` | ✅ 28/11: 8/8 (com a revisão) |
| Suíte completa (27/11) | ✅ 823 arquivos passando; as falhas são as do Windows de sempre (compose, links simbólicos, caminhos); o `docx.test.ts` estourou os 5 s só na suíte cheia e passa 13/13 sozinho |
| 1. CodeLab explica | ⏳ falta testar |
| 2. CodeLab muda o código | ⏳ falta testar |
| 3. QuantumLab qubit | ⏳ falta testar |
| 4. QuantumLab níveis | ⏳ falta testar |
| 5. BioSim por texto | ⏳ falta testar |
| 6. BioSim com foto | ⏳ parte 4 |
