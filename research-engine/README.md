# research-engine — host de motores Python da Zaeon

Serviço FastAPI (porta **8002**) que hospeda **motores** (agentes) escritos em Python e os expõe
pelo contrato HTTP `/motor/v1`, consumido pelo adaptador TS `motorHttp` da camada de orquestração
(`lib/orquestra/`). A Zaeon roteia tarefas para motores plugáveis — os próprios e os open-source
(DeepSeek, Kimi, Tongyi…); os que são **Python** moram aqui.

Primeiro motor: **`zaeon-sugestao`** — sugestão de pesquisa por análise de lacunas, citando só as
evidências recebidas.

Também mantém o `/suggest` e `/refresh` antigos (sugestão de pesquisa), agora sem referência
inventada. Hoje nenhum código TS chama esses dois (o Next usa o port em `lib/scholar/suggest.ts`).

```
main.py            app FastAPI: /health, /suggest, /refresh + router /motor/v1
config.py          leitura de env (a cada chamada)
llm.py             google-genai: saída estruturada, timeout, retentativa, erros tipados
engine.py          lógica de sugestão (referências SÓ do chamador)
models.py          Pydantic do /suggest + schema da saída do modelo (enums lenientes)
prompts.py         prompt do Arquiteto de Pesquisa
auth.py, erros.py  Bearer opcional (MOTOR_TOKEN) e erros no formato {"erro": …}
motores/
  contrato.py      Pydantic do contrato /motor/v1 (espelho do TS)
  base.py          classe Motor (o que um motor implementa)
  registro.py      lista de motores hospedados  ← motor novo entra aqui
  api.py           rotas /motor/v1 + guarda do contrato (prazo, citações, evidências)
  citacoes.py      saneamento de [E#]
  zaeon_sugestao.py
tests/             pytest, sem rede (cliente genai falso + SDK real com transporte httpx falso)
```

## Contrato `/motor/v1`

```
GET  /motor/v1/motores
  200 [{"id": str, "nome": str, "origem": "zaeon"|"alibaba"|"deepseek"|"moonshot"|"outro",
        "formato": "unico"|"profundo"|"enxame", "disponivel": bool}]

POST /motor/v1/tarefas
  corpo: {"id": str, "motor": str, "objetivo": str, "intent": str, "contexto": str|null,
          "prazo_ms": int, "evidencias": [{"chave": "E1", "claim": str,
          "source": {"title": str, "url": str|null, "authors": str|null, "year": int|null}}]}
  200 {"motor": str, "texto": str, "evidencias": [...],
       "uso": {"prompt_tokens": int, "completion_tokens": int, "chamadas": int},
       "modelos": [str], "passos": int, "degradado": bool}
  401 {"erro": "nao_autorizado"}       só com MOTOR_TOKEN definido
  404 {"erro": "motor_desconhecido"}
  422 {"erro": "corpo_invalido", "detalhe": [...]}
  502 {"erro": "saida_invalida"}       o modelo respondeu, mas fora do schema, mesmo após as retentativas
  503 {"erro": "motor_indisponivel"}   sem credencial/dependência, ou provedor com 429/5xx persistente
  504 {"erro": "prazo"}
  500 {"erro": "erro_interno"}
```

Regras que `motores/api.py` garante para **qualquer** motor:

- **Prazo**: o motor roda dentro de `asyncio.timeout_at(início + prazo_ms − folga)`; a folga
  (10% do prazo, no máximo 100 ms) é o tempo de serializar a resposta. Passou do prazo → 504, sem
  exceção. A camada de LLM recebe o mesmo deadline e não começa chamada nem backoff que não caibam
  nele.
- **Citações**: `texto` é markdown pt-BR e só pode citar `[E#]` que existam em `evidencias`.
  **Decisão:** citação a chave inexistente é **removida** do texto (o texto nunca sai com
  evidência fantasma), e quando algo é removido o resultado sai com `degradado: true`. Grupos
  `[E1, E3]` / `[E1; E3]` viram `[E1][E3]`.
- **Evidências**: as de entrada sempre voltam, sem alteração. O motor pode acrescentar novas, mas
  só com chave inédita no padrão `E\d+`. Se colidir com uma de entrada, vale a de entrada; se a
  chave for inválida, a evidência é descartada e o resultado sai `degradado`.
- `motor` da resposta = id pedido.
- **Auth**: com `MOTOR_TOKEN` definido, toda rota exceto `/health` exige
  `Authorization: Bearer <token>`. Isso inclui `/suggest` e `/refresh`.

`degradado: true` quer dizer que o resultado é utilizável, mas de qualidade reduzida: houve
citação removida, ou evidência descartada, ou (no `zaeon-sugestao`) a sugestão saiu sem nenhuma
evidência citada.

### Motor `zaeon-sugestao`

- `formato: "unico"`, `origem: "zaeon"`. `disponivel` = há credencial do Gemini configurada.
- Cada evidência vira uma referência numerada para o modelo (índice i ↔ `E#`, até 30), e o `claim`
  entra como snippet. O modelo devolve índices em `citadas`; índice fora da faixa é descartado e
  o motor escreve `[E#]` no texto. Por construção, ele não consegue citar chave inexistente.
- O contrato não tem campo de nível acadêmico. O motor procura o nível em `intent`/`contexto`
  (graduação/TCC, mestrado, doutorado/phd, pós-doc) e usa mestrado como padrão.
- `passos: 1`; `uso.chamadas` conta as retentativas.

## `/suggest` e `/refresh`

```json
{"topic": "orquídeas rosas", "level": "grad|msc|phd|postdoc", "exclude_titles": [],
 "references": [{"source": "PubMed", "title": "...", "authors": "...", "year": "2021",
                 "venue": "...", "doi": "10....", "url": null, "snippet": "abstract real"}]}
```

- `references` é **opcional** e deve vir de busca real (OpenAlex, PubMed, arXiv…). O modelo só
  cita pelo índice. As `references` da resposta são um subconjunto das enviadas, copiadas do
  pedido, e nunca saem da memória do modelo.
- Sem `references`, a resposta vem com `references: []` e `references_status: "ausentes"`; com
  elas, `"fornecidas"`.
- `inline_citation` só aparece se o trecho for **literal** no `snippet` da referência citada.
- Enums lenientes: `source` desconhecido vira `"outro"`. Um `type` desconhecido vira o padrão do
  nível (grad→Exploratória, msc→Experimental, phd/postdoc→Pioneira). `gap_score` fora de [0,1] é
  grampeado.
- Erros: 504 `prazo` · 503 `provedor_indisponivel` · 502 `saida_invalida` · 422 `corpo_invalido`.

## LLM (google-genai)

- SDK `google-genai` 2.34.0. O `google-generativeai` foi descontinuado. A linha 3.x existe, mas
  troca o transporte para `httpx2`; atualize de propósito, rodando `tests/test_sdk_real.py`.
- Saída estruturada nativa: `response_mime_type="application/json"` + `response_schema` gerado do
  Pydantic (`models.SaidaModelo`). A validação é feita por nós, com os validadores lenientes.
- Timeout por chamada (`RESEARCH_ENGINE_TIMEOUT_MS`, limitado pelo que resta do prazo).
- Retentativa em 429, 5xx, timeout, JSON inválido e truncamento por MAX_TOKENS: no máximo 2, com
  backoff `base·2^n + jitter[0, base]`, e nunca além do deadline. Outros 4xx (ex.: 404 de modelo
  aposentado) não são retentados e viram 503.

## Variáveis de ambiente

| Variável | Padrão | Para quê |
|---|---|---|
| `GOOGLE_GENAI_USE_VERTEXAI` | `false` | `true` usa o Vertex; senão, a API key |
| `GOOGLE_CLOUD_PROJECT` | — | projeto Vertex (fallback: `GOOGLE_PROJECT_ID`, depois o `project_id` do `GOOGLE_CREDENTIALS`) |
| `GOOGLE_CLOUD_LOCATION` | `global` | location Vertex (fallback: `GEMINI_TEXT_LOCATION`, `GOOGLE_LOCATION`) |
| `GOOGLE_CREDENTIALS` | — | JSON da service account (aceita `\n` real na private_key); sem ele, usa ADC (`GOOGLE_APPLICATION_CREDENTIALS`) |
| `GEMINI_API_KEY` | — | API key, usada quando o Vertex está desligado (fallback: `GOOGLE_API_KEY`) |
| `RESEARCH_ENGINE_MODEL` | `gemini-3.5-flash` | modelo (os 2.x estão aposentados) |
| `RESEARCH_ENGINE_TIMEOUT_MS` | `25000` | teto de uma chamada ao Gemini |
| `RESEARCH_ENGINE_PRAZO_MS` | `30000` | prazo total do `/suggest`/`/refresh` (o `/motor/v1` usa o `prazo_ms` da tarefa) |
| `RESEARCH_ENGINE_MAX_RETRIES` | `2` | retentativas além da 1ª (teto duro: 2) |
| `RESEARCH_ENGINE_BACKOFF_BASE_MS` | `500` | base do backoff |
| `RESEARCH_ENGINE_MAX_OUTPUT_TOKENS` | `8192` | teto de saída (o "pensamento" do 3.x conta aqui) |
| `RESEARCH_ENGINE_THINKING_LEVEL` | vazio | vazio usa o padrão do modelo (aceita `low`, `medium`, `high`) |
| `MOTOR_TOKEN` | vazio | com valor, exige `Authorization: Bearer` |
| `LOG_LEVEL` | `INFO` | |

No compose da beta (`docker-compose.beta.yml`, perfil `motores`), o serviço recebe `.env` +
`.env.secrets` (é onde fica o `GOOGLE_CREDENTIALS`) e liga
`GOOGLE_GENAI_USE_VERTEXAI=${RESEARCH_ENGINE_USE_VERTEXAI:-true}` e
`GOOGLE_CLOUD_LOCATION=${GEMINI_TEXT_LOCATION:-global}`.

## Rodar

```bash
cd research-engine
python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
cp .env.example .env            # preencha GEMINI_API_KEY ou o Vertex
.venv/bin/python -m uvicorn main:app --port 8002 --reload
```

Para subir na beta:
`docker compose -f docker-compose.beta.yml --profile motores up -d --build research-engine`. O
serviço é interno (sem `ports`); o web fala com `http://research-engine:8002`.

## Testes

```bash
cd research-engine && .venv/bin/python -m pytest -q
```

Os testes não usam rede. `tests/fakes.py` traz um cliente genai falso com roteiro de
respostas/erros/demoras, e `tests/test_sdk_real.py` roda o SDK de verdade sobre um
`httpx.MockTransport`, o que pega quebra de API num bump de versão. Cobertura: parse da saída
estruturada, 429 → retentativa → sucesso, backoff, deadline → 504 dentro do prazo, 404 / 401 / 422
/ 502 / 503, forma exata do contrato, remoção de `[E9]` inexistente com `degradado`, enums
lenientes, referências só do chamador.

## Como adicionar um motor

Exemplo: STORM, gpt-researcher ou PaperQA2. São um arquivo e uma linha.

1. **Crie `motores/<nome>.py`** com uma subclasse de `Motor`:

   ```python
   # motores/storm.py
   from __future__ import annotations

   import asyncio
   import importlib.util

   from motores.base import Motor, MotorIndisponivel
   from motores.contrato import Evidencia, Fonte, Resultado, Tarefa, UsoMotor


   class StormMotor(Motor):
       id = "storm"                      # é o "motor" que o orquestrador manda
       nome = "STORM (Stanford) · artigo com perspectivas"
       origem = "outro"                  # zaeon | alibaba | deepseek | moonshot | outro
       formato = "profundo"              # unico | profundo | enxame

       def disponivel(self) -> bool:     # barato, sem rede
           return importlib.util.find_spec("knowledge_storm") is not None

       async def executar(self, tarefa: Tarefa, deadline: float) -> Resultado:
           try:
               import knowledge_storm   # import AQUI, nunca no topo do arquivo
           except ImportError as exc:
               raise MotorIndisponivel("knowledge_storm não instalado") from exc
           restante = deadline - asyncio.get_running_loop().time()
           # SDK síncrono → to_thread (senão o timeout não interrompe e trava o servidor)
           saida = await asyncio.to_thread(rodar_storm, tarefa, restante)
           return Resultado(
               motor=self.id,
               texto=saida.markdown,          # cite só [E#]; pode criar E novas abaixo
               evidencias=[*tarefa.evidencias,
                           Evidencia(chave="E101", claim="…", source=Fonte(title="…", url="…"))],
               uso=UsoMotor(prompt_tokens=…, completion_tokens=…, chamadas=…),
               modelos=["deepseek-chat"],
               passos=saida.passos,
               degradado=False,
           )
   ```

2. **Registre** em `motores/registro.py`:

   ```python
   from motores.storm import StormMotor
   MOTORES: list[Motor] = [ZaeonSugestao(), StormMotor()]
   ```

3. Se precisar de pacote, acrescente o pin em `requirements.txt`. Credenciais (ex.:
   `DEEPSEEK_API_KEY`) chegam pelo `.env`/`.env.secrets` do compose; leia com `config.env(...)`
   dentro do motor.

4. Escreva um teste em `tests/` no molde de `test_motores.py` (registre com
   `monkeypatch.setitem(registro._POR_ID, …)` ou chame o motor direto, com o SDK mockado). Rode
   `pytest -q`.

Você **não** precisa tratar prazo, saneamento de `[E#]`, preservação das evidências de entrada nem
formato de erro: `motores/api.py` faz tudo isso. Basta levantar `MotorIndisponivel` (→ 503),
`llm.PrazoEsgotado`/`TimeoutError` (→ 504) ou `llm.SaidaInvalida` (→ 502). Para o motor aparecer
no orquestrador, o lado TS precisa conhecer o `id`. Isso é registro do `lib/orquestra/`, não daqui.
